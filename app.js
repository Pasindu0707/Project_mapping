// Multi-surface WebGL projection mapper: drag quad corners to map texture (image/video) onto quads.
// Features: multiple surfaces, upload image/video per surface, corner pinning, brightness/contrast, snow toggle, save/load project.

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl', {preserveDrawingBuffer:true});
if(!gl) { alert('WebGL not supported'); throw new Error('WebGL not supported'); }

let width=0, height=0;
function resizeCanvasToDisplaySize(){
  const dpr = window.devicePixelRatio || 1;
  const w = Math.floor(window.innerWidth * dpr);
  const h = Math.floor(window.innerHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    gl.viewport(0,0,canvas.width, canvas.height);
  }
}
window.addEventListener('resize', ()=>{ resizeCanvasToDisplaySize(); updateAllHandles(); });

/* ---------- Shaders ---------- */
const vsSource = `
attribute vec2 a_pos;
attribute vec2 a_uv;
varying vec2 v_uv;
void main(){
  // positions already in clip space (-1..1)
  gl_Position = vec4(a_pos, 0.0, 1.0);
  v_uv = a_uv;
}
`;

const fsSource = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_texture;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_opacity;
uniform float u_rotation;
vec2 rotateUV(vec2 uv, float angle){
  float s = sin(angle);
  float c = cos(angle);
  vec2 center = vec2(0.5, 0.5);
  vec2 rotated = uv - center;
  rotated = vec2(
    rotated.x * c - rotated.y * s,
    rotated.x * s + rotated.y * c
  );
  return rotated + center;
}
void main(){
  vec2 uv = v_uv;
  if(u_rotation != 0.0){
    uv = rotateUV(uv, u_rotation);
  }
  vec4 c = texture2D(u_texture, uv);
  // apply brightness
  c.rgb += u_brightness;
  // apply contrast (simple)
  c.rgb = ((c.rgb - 0.5) * u_contrast) + 0.5;
  // apply opacity
  c.a *= u_opacity;
  gl_FragColor = c;
}
`;

function compileShader(src, type){
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
    console.error(gl.getShaderInfoLog(s));
    throw new Error('Shader compile error');
  }
  return s;
}
const vs = compileShader(vsSource, gl.VERTEX_SHADER);
const fs = compileShader(fsSource, gl.FRAGMENT_SHADER);
const program = gl.createProgram();
gl.attachShader(program, vs);
gl.attachShader(program, fs);
gl.linkProgram(program);
if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
  console.error(gl.getProgramInfoLog(program));
  throw new Error('Program link error');
}
gl.useProgram(program);

/* ---------- Quad data ---------- */
const posBuf = gl.createBuffer();
const uvBuf = gl.createBuffer();
const idxBuf = gl.createBuffer();

gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2,  0,2,3]), gl.STATIC_DRAW);

// attributes
const aPosLoc = gl.getAttribLocation(program, 'a_pos');
const aUvLoc = gl.getAttribLocation(program, 'a_uv');
gl.enableVertexAttribArray(aPosLoc);
gl.enableVertexAttribArray(aUvLoc);

// uniform locations
const uTextureLoc = gl.getUniformLocation(program, 'u_texture');
const uBrightnessLoc = gl.getUniformLocation(program, 'u_brightness');
const uContrastLoc = gl.getUniformLocation(program, 'u_contrast');
const uOpacityLoc = gl.getUniformLocation(program, 'u_opacity');
const uRotationLoc = gl.getUniformLocation(program, 'u_rotation');

/* ---------- Surface Management ---------- */
let surfaces = [];
let activeSurfaceId = null;
let nextSurfaceId = 0;

function createSurface(name){
  const id = nextSurfaceId++;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const surface = {
    id,
    name: name || `Surface ${id + 1}`,
    corners: [
      {x: w * 0.1, y: h * 0.1},
      {x: w * 0.9, y: h * 0.1},
      {x: w * 0.9, y: h * 0.9},
      {x: w * 0.1, y: h * 0.9}
    ],
    texture: gl.createTexture(),
    media: null,
    isVideo: false,
    brightness: 0,
    contrast: 1,
    opacity: 1,
    rotation: 0, // rotation in radians
    blendMode: 'normal', // normal, multiply, screen, overlay, etc.
    handles: []
  };
  
  // Setup texture
  gl.bindTexture(gl.TEXTURE_2D, surface.texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  
  surfaces.push(surface);
  if(activeSurfaceId === null) activeSurfaceId = id;
  createHandlesForSurface(surface);
  updateSurfacesList();
  return surface;
}

function deleteSurface(id){
  const idx = surfaces.findIndex(s => s.id === id);
  if(idx === -1) return;
  
  // Clean up texture
  gl.deleteTexture(surfaces[idx].texture);
  
  // Remove handles
  surfaces[idx].handles.forEach(h => h.remove());
  
  surfaces.splice(idx, 1);
  
  // Update active surface
  if(activeSurfaceId === id){
    activeSurfaceId = surfaces.length > 0 ? surfaces[0].id : null;
  }
  
  updateSurfacesList();
  updateAllHandles();
}

function setActiveSurface(id){
  activeSurfaceId = id;
  updateSurfacesList();
  updateAllHandles();
  updateGlobalControls();
}

function getActiveSurface(){
  return surfaces.find(s => s.id === activeSurfaceId);
}

function setImageToTexture(surface, img){
  gl.bindTexture(gl.TEXTURE_2D, surface.texture);
  try {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  } catch(e){}
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
}

/* ---------- Handle Management ---------- */
const handlesContainer = document.getElementById('handles');

function createHandlesForSurface(surface){
  surface.handles = [];
  for(let i = 0; i < 4; i++){
    const handle = document.createElement('div');
    handle.className = 'handle';
    handle.dataset.surfaceId = surface.id;
    handle.dataset.cornerIndex = i;
    if(surface.id === activeSurfaceId){
      handle.style.display = 'block';
    } else {
      handle.style.display = 'none';
    }
    handlesContainer.appendChild(handle);
    surface.handles.push(handle);
  }
  setupHandleDrag(surface);
  updateHandlesForSurface(surface);
}

function updateHandlesForSurface(surface){
  for(let i = 0; i < 4; i++){
    const handle = surface.handles[i];
    handle.style.left = surface.corners[i].x + 'px';
    handle.style.top = surface.corners[i].y + 'px';
    if(surface.id === activeSurfaceId){
      handle.classList.add('selected');
      handle.style.display = 'block';
      if(selectedHandleIndex === i){
        handle.style.boxShadow = '0 0 0 3px rgba(77,255,77,0.8), 0 4px 10px rgba(0,0,0,0.6)';
      } else {
        handle.style.boxShadow = '0 4px 10px rgba(0,0,0,0.6)';
      }
    } else {
      handle.classList.remove('selected');
      handle.style.display = 'none';
    }
  }
}

function updateAllHandles(){
  surfaces.forEach(s => updateHandlesForSurface(s));
}

function setupHandleDrag(surface){
  surface.handles.forEach((handle, i) => {
    handle.addEventListener('pointerdown', (e)=>{
      e.preventDefault();
      const cornerIndex = parseInt(handle.dataset.cornerIndex);
      selectedHandleIndex = cornerIndex;
      dragging = {
        surfaceId: surface.id,
        cornerIndex,
        offsetX: e.clientX - surface.corners[cornerIndex].x,
        offsetY: e.clientY - surface.corners[cornerIndex].y
      };
      handle.setPointerCapture(e.pointerId);
      updateAllHandles();
    });
  });
}

let dragging = null;
document.addEventListener('pointermove', (e)=>{
  if(!dragging) return;
  const surface = surfaces.find(s => s.id === dragging.surfaceId);
  if(!surface) return;
  
  // Allow free movement everywhere - no constraints
  surface.corners[dragging.cornerIndex].x = e.clientX - dragging.offsetX;
  surface.corners[dragging.cornerIndex].y = e.clientY - dragging.offsetY;
  updateHandlesForSurface(surface);
});

document.addEventListener('pointerup', ()=>{
  if(dragging){
    scheduleSave();
  }
  dragging = null;
});

document.addEventListener('pointercancel', ()=>{
  if(dragging){
    scheduleSave();
  }
  dragging = null;
});

/* ---------- UI: Surfaces List ---------- */
const surfacesListEl = document.getElementById('surfacesList');

function updateSurfacesList(){
  surfacesListEl.innerHTML = '';
  surfaces.forEach(surface => {
    const item = document.createElement('div');
    item.className = 'surface-item' + (surface.id === activeSurfaceId ? ' active' : '');
    item.innerHTML = `
      <span class="surface-item-name">${surface.name}</span>
      <div class="surface-item-actions">
        <button class="delete-surface" data-id="${surface.id}">Delete</button>
      </div>
    `;
    item.addEventListener('click', (e)=>{
      if(!e.target.classList.contains('delete-surface')){
        setActiveSurface(surface.id);
      }
    });
    const deleteBtn = item.querySelector('.delete-surface');
    deleteBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      if(surfaces.length > 1){
        deleteSurface(surface.id);
      } else {
        alert('Cannot delete the last surface');
      }
    });
    surfacesListEl.appendChild(item);
  });
}

document.getElementById('addSurfaceBtn').addEventListener('click', ()=>{
  createSurface();
});

/* ---------- Shape Presets ---------- */
function createCube(){
  const w = window.innerWidth;
  const h = window.innerHeight;
  const size = Math.min(w, h) * 0.3;
  const centerX = w * 0.5;
  const centerY = h * 0.5;
  
  // Front face (centered)
  const front = createSurface('Cube - Front');
  front.corners = [
    {x: centerX - size/2, y: centerY - size/2},
    {x: centerX + size/2, y: centerY - size/2},
    {x: centerX + size/2, y: centerY + size/2},
    {x: centerX - size/2, y: centerY + size/2}
  ];
  updateHandlesForSurface(front);
  
  // Top face (perspective)
  const top = createSurface('Cube - Top');
  const offset = size * 0.3;
  top.corners = [
    {x: centerX - size/2, y: centerY - size/2},
    {x: centerX + size/2, y: centerY - size/2},
    {x: centerX + size/2 + offset, y: centerY - size/2 - offset},
    {x: centerX - size/2 + offset, y: centerY - size/2 - offset}
  ];
  updateHandlesForSurface(top);
  
  // Right face (perspective)
  const right = createSurface('Cube - Right');
  right.corners = [
    {x: centerX + size/2, y: centerY - size/2},
    {x: centerX + size/2 + offset, y: centerY - size/2 - offset},
    {x: centerX + size/2 + offset, y: centerY + size/2 - offset},
    {x: centerX + size/2, y: centerY + size/2}
  ];
  updateHandlesForSurface(right);
  
  scheduleSave();
}

function createPrism(){
  const w = window.innerWidth;
  const h = window.innerHeight;
  const size = Math.min(w, h) * 0.3;
  const centerX = w * 0.5;
  const centerY = h * 0.5;
  
  // Front triangle face
  const front = createSurface('Prism - Front');
  front.corners = [
    {x: centerX, y: centerY - size/2}, // Top point
    {x: centerX + size/2, y: centerY + size/2}, // Bottom right
    {x: centerX - size/2, y: centerY + size/2}, // Bottom left
    {x: centerX - size/2, y: centerY + size/2} // Duplicate for quad (will be invisible)
  ];
  updateHandlesForSurface(front);
  
  // Top face (trapezoid)
  const top = createSurface('Prism - Top');
  const offset = size * 0.3;
  top.corners = [
    {x: centerX, y: centerY - size/2},
    {x: centerX + size/2, y: centerY + size/2},
    {x: centerX + size/2 + offset, y: centerY + size/2 - offset},
    {x: centerX + offset, y: centerY - size/2 - offset}
  ];
  updateHandlesForSurface(top);
  
  // Right face (rectangle)
  const right = createSurface('Prism - Right');
  right.corners = [
    {x: centerX + size/2, y: centerY + size/2},
    {x: centerX + size/2 + offset, y: centerY + size/2 - offset},
    {x: centerX + size/2 + offset, y: centerY + size/2 - offset},
    {x: centerX + size/2, y: centerY + size/2}
  ];
  updateHandlesForSurface(right);
  
  scheduleSave();
}

function createPyramid(){
  const w = window.innerWidth;
  const h = window.innerHeight;
  const size = Math.min(w, h) * 0.35;
  const centerX = w * 0.5;
  const centerY = h * 0.5;
  
  // Base (square)
  const base = createSurface('Pyramid - Base');
  base.corners = [
    {x: centerX - size/2, y: centerY + size/2},
    {x: centerX + size/2, y: centerY + size/2},
    {x: centerX + size/2, y: centerY + size/2},
    {x: centerX - size/2, y: centerY + size/2}
  ];
  updateHandlesForSurface(base);
  
  // Front face (triangle)
  const front = createSurface('Pyramid - Front');
  front.corners = [
    {x: centerX, y: centerY - size/2}, // Top point
    {x: centerX + size/2, y: centerY + size/2}, // Bottom right
    {x: centerX - size/2, y: centerY + size/2}, // Bottom left
    {x: centerX - size/2, y: centerY + size/2} // Duplicate
  ];
  updateHandlesForSurface(front);
  
  // Right face (triangle)
  const right = createSurface('Pyramid - Right');
  right.corners = [
    {x: centerX, y: centerY - size/2}, // Top point
    {x: centerX + size/2, y: centerY + size/2}, // Bottom right
    {x: centerX + size/2, y: centerY + size/2}, // Duplicate
    {x: centerX, y: centerY - size/2} // Top point duplicate
  ];
  updateHandlesForSurface(right);
  
  // Left face (triangle)
  const left = createSurface('Pyramid - Left');
  left.corners = [
    {x: centerX, y: centerY - size/2}, // Top point
    {x: centerX - size/2, y: centerY + size/2}, // Bottom left
    {x: centerX - size/2, y: centerY + size/2}, // Duplicate
    {x: centerX, y: centerY - size/2} // Top point duplicate
  ];
  updateHandlesForSurface(left);
  
  scheduleSave();
}

function createCylinder(){
  const w = window.innerWidth;
  const h = window.innerHeight;
  const size = Math.min(w, h) * 0.3;
  const centerX = w * 0.5;
  const centerY = h * 0.5;
  const offset = size * 0.25;
  
  // Front circle (represented as square)
  const front = createSurface('Cylinder - Front');
  front.corners = [
    {x: centerX - size/2, y: centerY - size/2},
    {x: centerX + size/2, y: centerY - size/2},
    {x: centerX + size/2, y: centerY + size/2},
    {x: centerX - size/2, y: centerY + size/2}
  ];
  updateHandlesForSurface(front);
  
  // Top face (ellipse-like)
  const top = createSurface('Cylinder - Top');
  top.corners = [
    {x: centerX - size/2, y: centerY - size/2},
    {x: centerX + size/2, y: centerY - size/2},
    {x: centerX + size/2 + offset, y: centerY - size/2 - offset * 0.5},
    {x: centerX - size/2 + offset, y: centerY - size/2 - offset * 0.5}
  ];
  updateHandlesForSurface(top);
  
  // Side face (curved, represented as rectangle)
  const side = createSurface('Cylinder - Side');
  side.corners = [
    {x: centerX + size/2, y: centerY - size/2},
    {x: centerX + size/2 + offset, y: centerY - size/2 - offset * 0.5},
    {x: centerX + size/2 + offset, y: centerY + size/2 - offset * 0.5},
    {x: centerX + size/2, y: centerY + size/2}
  ];
  updateHandlesForSurface(side);
  
  scheduleSave();
}

function createHouse(){
  const w = window.innerWidth;
  const h = window.innerHeight;
  const wallWidth = Math.min(w, h) * 0.25;
  const wallHeight = Math.min(w, h) * 0.35;
  const centerX = w * 0.5;
  const centerY = h * 0.5;
  const depth = wallWidth * 0.3; // Perspective depth
  
  // Front/Center wall
  const front = createSurface('House - Front Wall');
  front.corners = [
    {x: centerX - wallWidth/2, y: centerY - wallHeight/2},
    {x: centerX + wallWidth/2, y: centerY - wallHeight/2},
    {x: centerX + wallWidth/2, y: centerY + wallHeight/2},
    {x: centerX - wallWidth/2, y: centerY + wallHeight/2}
  ];
  updateHandlesForSurface(front);
  
  // Left wall (with perspective)
  const left = createSurface('House - Left Wall');
  left.corners = [
    {x: centerX - wallWidth/2, y: centerY - wallHeight/2},
    {x: centerX - wallWidth/2 + depth, y: centerY - wallHeight/2 - depth * 0.3},
    {x: centerX - wallWidth/2 + depth, y: centerY + wallHeight/2 - depth * 0.3},
    {x: centerX - wallWidth/2, y: centerY + wallHeight/2}
  ];
  updateHandlesForSurface(left);
  
  // Right wall (with perspective)
  const right = createSurface('House - Right Wall');
  right.corners = [
    {x: centerX + wallWidth/2, y: centerY - wallHeight/2},
    {x: centerX + wallWidth/2 + depth, y: centerY - wallHeight/2 - depth * 0.3},
    {x: centerX + wallWidth/2 + depth, y: centerY + wallHeight/2 - depth * 0.3},
    {x: centerX + wallWidth/2, y: centerY + wallHeight/2}
  ];
  updateHandlesForSurface(right);
  
  scheduleSave();
}

document.getElementById('addCubeBtn').addEventListener('click', ()=>{
  createCube();
});

document.getElementById('addPrismBtn').addEventListener('click', ()=>{
  createPrism();
});

document.getElementById('addPyramidBtn').addEventListener('click', ()=>{
  createPyramid();
});

document.getElementById('addCylinderBtn').addEventListener('click', ()=>{
  createCylinder();
});

document.getElementById('addHouseBtn').addEventListener('click', ()=>{
  createHouse();
});

/* ---------- UI: Loading & Error Handling ---------- */
function showLoading(message = 'Loading...'){
  const indicator = document.getElementById('loadingIndicator');
  indicator.querySelector('span').textContent = message;
  indicator.style.display = 'flex';
}

function hideLoading(){
  document.getElementById('loadingIndicator').style.display = 'none';
}

function showError(message){
  alert('Error: ' + message);
  console.error(message);
}

/* ---------- UI: File Upload with Optimization ---------- */
document.getElementById('fileInput').addEventListener('change', async (ev)=>{
  const f = ev.target.files[0];
  if(!f) return;
  
  const surface = getActiveSurface();
  if(!surface){
    showError('Please create a surface first');
    return;
  }
  
  try {
    showLoading('Loading media...');
    const url = URL.createObjectURL(f);
    
    if(f.type.startsWith('video/')){
      const v = document.createElement('video');
      v.src = url;
      v.loop = true;
      v.muted = true;
      v.playsInline = true;
      
      // Optimize video loading
      v.preload = 'auto';
      
      // Limit video resolution for performance (optional)
      const maxDimension = 1920; // Max width or height
      v.addEventListener('loadedmetadata', ()=>{
        if(v.videoWidth > maxDimension || v.videoHeight > maxDimension){
          const scale = maxDimension / Math.max(v.videoWidth, v.videoHeight);
          // Note: We can't directly resize video, but we can warn or use canvas downscaling
          console.warn('Large video detected. Consider using smaller files for better performance.');
        }
      });
      
      await v.play().catch((err)=>{
        console.warn('Autoplay blocked:', err);
        showError('Video autoplay blocked. Click to play.');
      });
      
      surface.media = v;
      surface.isVideo = true;
      setImageToTexture(surface, surface.media);
      hideLoading();
    } else {
      const img = new Image();
      // Don't set crossOrigin for local files - causes CORS issues
      // img.crossOrigin = 'anonymous';
      
      // Optimize image loading - limit size
      const maxDimension = 4096;
      img.onload = ()=>{
        // Check if image is too large
        if(img.width > maxDimension || img.height > maxDimension){
          console.warn('Large image detected. Consider using smaller images for better performance.');
        }
        
        surface.media = img;
        surface.isVideo = false;
        setImageToTexture(surface, surface.media);
        hideLoading();
        console.log('Image loaded successfully:', img.width, 'x', img.height);
      };
      img.onerror = (err)=>{
        hideLoading();
        console.error('Image load error:', err);
        showError('Failed to load image. Check browser console for details.');
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  } catch(err){
    hideLoading();
    showError('Failed to load file: ' + err.message);
  }
});

/* ---------- UI: Global Controls ---------- */
const brightnessEl = document.getElementById('brightness');
const contrastEl = document.getElementById('contrast');
const rotationEl = document.getElementById('rotation');
const rotationValueEl = document.getElementById('rotationValue');

function updateGlobalControls(){
  const surface = getActiveSurface();
  if(surface){
    brightnessEl.value = surface.brightness;
    contrastEl.value = surface.contrast;
    const rotationDeg = (surface.rotation * 180 / Math.PI) % 360;
    rotationEl.value = rotationDeg < 0 ? rotationDeg + 360 : rotationDeg;
    rotationValueEl.textContent = Math.round(rotationDeg) + '°';
  }
}

brightnessEl.addEventListener('input', ()=>{
  const surface = getActiveSurface();
  if(surface) surface.brightness = parseFloat(brightnessEl.value);
});

contrastEl.addEventListener('input', ()=>{
  const surface = getActiveSurface();
  if(surface) surface.contrast = parseFloat(contrastEl.value);
});

rotationEl.addEventListener('input', ()=>{
  const surface = getActiveSurface();
  if(surface){
    const rotationDeg = parseFloat(rotationEl.value);
    surface.rotation = (rotationDeg * Math.PI / 180);
    rotationValueEl.textContent = Math.round(rotationDeg) + '°';
    scheduleSave();
  }
});

document.getElementById('toggleSnow').addEventListener('click', ()=>{
  toggleSnow();
});

/* ---------- UI: Toggle Entire UI Panel ---------- */
document.getElementById('toggleUIBtn').addEventListener('click', ()=>{
  const ui = document.getElementById('ui');
  const btn = document.getElementById('toggleUIBtn');
  const isHidden = ui.classList.contains('hidden');
  
  if(isHidden){
    ui.classList.remove('hidden');
    btn.textContent = 'Hide UI ▼';
  } else {
    ui.classList.add('hidden');
    btn.textContent = 'Show UI ▶';
  }
});

/* ---------- UI: Toggle Hint/Instructions ---------- */
document.getElementById('toggleHintBtn').addEventListener('click', ()=>{
  const hint = document.getElementById('hint');
  const btn = document.getElementById('toggleHintBtn');
  const isHidden = hint.classList.contains('hidden');
  
  if(isHidden){
    hint.classList.remove('hidden');
    btn.textContent = 'Hide Instructions ▼';
  } else {
    hint.classList.add('hidden');
    btn.textContent = 'Show Instructions ▶';
  }
});

/* ---------- UI: Presets ---------- */
const presetsMenu = document.getElementById('presetsMenu');
document.getElementById('presetsBtn').addEventListener('click', (e)=>{
  e.stopPropagation();
  const isVisible = presetsMenu.style.display !== 'none';
  presetsMenu.style.display = isVisible ? 'none' : 'block';
  document.getElementById('presetsBtn').textContent = isVisible ? 'Presets ▼' : 'Presets ▲';
});

document.addEventListener('click', (e)=>{
  if(!presetsMenu.contains(e.target) && e.target.id !== 'presetsBtn'){
    presetsMenu.style.display = 'none';
    document.getElementById('presetsBtn').textContent = 'Presets ▼';
  }
});

// Helper to get UI panel safe area (avoid overlap)
function getUISafeArea(){
  const ui = document.getElementById('ui');
  if(!ui) return {left: 0, bottom: 0, width: 0, height: 0};
  const rect = ui.getBoundingClientRect();
  // Add some padding to be safe
  return {
    left: 0,
    right: rect.right + 20,
    bottom: rect.top - 20, // Top of UI panel minus padding
    width: rect.width + 40,
    height: window.innerHeight - (rect.top - 20)
  };
}

const presets = {
  fullscreen: (w, h) => {
    const safe = getUISafeArea();
    // Avoid bottom-left corner where UI is
    const minX = safe.right > 0 ? safe.right : 0;
    const minY = safe.bottom > 0 ? 0 : 0; // Top is fine
    const maxY = safe.bottom > 0 ? safe.bottom : h; // Bottom should avoid UI
    return [
      {x: 0, y: 0},
      {x: w, y: 0},
      {x: w, y: maxY},
      {x: minX, y: maxY}
    ];
  },
  center: (w, h) => {
    const size = Math.min(w, h) * 0.6;
    const cx = w / 2;
    const cy = h / 2;
    return [
      {x: cx - size/2, y: cy - size/2},
      {x: cx + size/2, y: cy - size/2},
      {x: cx + size/2, y: cy + size/2},
      {x: cx - size/2, y: cy + size/2}
    ];
  },
  'top-half': (w, h) => [
    {x: 0, y: 0},
    {x: w, y: 0},
    {x: w, y: h/2},
    {x: 0, y: h/2}
  ],
  'bottom-half': (w, h) => {
    const safe = getUISafeArea();
    const maxY = safe.bottom > 0 ? safe.bottom : h;
    const minX = safe.right > 0 ? safe.right : 0;
    return [
      {x: 0, y: h/2},
      {x: w, y: h/2},
      {x: w, y: maxY},
      {x: minX, y: maxY}
    ];
  },
  'left-half': (w, h) => {
    const safe = getUISafeArea();
    const minX = safe.right > 0 ? safe.right : 0;
    const maxY = safe.bottom > 0 ? safe.bottom : h;
    return [
      {x: minX, y: 0},
      {x: w/2, y: 0},
      {x: w/2, y: maxY},
      {x: minX, y: maxY}
    ];
  },
  'right-half': (w, h) => [
    {x: w/2, y: 0},
    {x: w, y: 0},
    {x: w, y: h},
    {x: w/2, y: h}
  ],
  trapezoid: (w, h) => {
    const safe = getUISafeArea();
    const minX = safe.right > 0 ? safe.right : w * 0.1;
    const maxY = safe.bottom > 0 ? safe.bottom : h;
    return [
      {x: w * 0.2, y: 0},
      {x: w * 0.8, y: 0},
      {x: w * 0.9, y: maxY},
      {x: minX, y: maxY}
    ];
  }
};

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', ()=>{
    const preset = btn.dataset.preset;
    const surface = getActiveSurface();
    if(!surface){
      showError('Please select a surface first');
      return;
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    if(presets[preset]){
      surface.corners = presets[preset](w, h);
      updateHandlesForSurface(surface);
      scheduleSave();
      presetsMenu.style.display = 'none';
      document.getElementById('presetsBtn').textContent = 'Presets ▼';
    }
  });
});

/* ---------- UI: Handle Visibility Toggle ---------- */
let handlesVisible = true;
document.getElementById('toggleHandles').addEventListener('click', ()=>{
  handlesVisible = !handlesVisible;
  const handlesContainer = document.getElementById('handles');
  handlesContainer.style.display = handlesVisible ? 'block' : 'none';
  document.getElementById('toggleHandles').textContent = handlesVisible ? 'Hide Handles' : 'Show Handles';
});

/* ---------- UI: Fullscreen ---------- */
document.getElementById('fullscreenBtn').addEventListener('click', ()=>{
  if(!document.fullscreenElement){
    document.documentElement.requestFullscreen().catch(err => {
      console.error('Error attempting to enable fullscreen:', err);
    });
  } else {
    document.exitFullscreen();
  }
});

// Update button text on fullscreen change
document.addEventListener('fullscreenchange', ()=>{
  document.getElementById('fullscreenBtn').textContent = 
    document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen';
});

/* ---------- Undo/Redo System ---------- */
const history = [];
let historyIndex = -1;
const MAX_HISTORY = 50;

function saveState(){
  const state = {
    surfaces: surfaces.map(s => ({
      id: s.id,
      corners: JSON.parse(JSON.stringify(s.corners)),
      brightness: s.brightness,
      contrast: s.contrast,
      rotation: s.rotation !== undefined ? s.rotation : 0
    })),
    activeSurfaceId
  };
  
  // Remove any future states if we're not at the end
  if(historyIndex < history.length - 1){
    history.splice(historyIndex + 1);
  }
  
  history.push(JSON.parse(JSON.stringify(state)));
  if(history.length > MAX_HISTORY){
    history.shift();
  } else {
    historyIndex++;
  }
}

function undo(){
  if(historyIndex > 0){
    historyIndex--;
    restoreState(history[historyIndex]);
  }
}

function redo(){
  if(historyIndex < history.length - 1){
    historyIndex++;
    restoreState(history[historyIndex]);
  }
}

function restoreState(state){
  state.surfaces.forEach(sData => {
    const surface = surfaces.find(s => s.id === sData.id);
    if(surface){
      surface.corners = sData.corners;
      surface.brightness = sData.brightness;
      surface.contrast = sData.contrast;
      surface.rotation = sData.rotation !== undefined ? sData.rotation : 0;
    }
  });
  if(state.activeSurfaceId !== undefined){
    activeSurfaceId = state.activeSurfaceId;
  }
  updateSurfacesList();
  updateAllHandles();
  updateGlobalControls();
}

// Save state when corners change
let lastSaveTime = 0;
const SAVE_DELAY = 500; // ms
function scheduleSave(){
  const now = Date.now();
  if(now - lastSaveTime > SAVE_DELAY){
    saveState();
    lastSaveTime = now;
  } else {
    clearTimeout(saveState.timeout);
    saveState.timeout = setTimeout(() => {
      saveState();
      lastSaveTime = Date.now();
    }, SAVE_DELAY);
  }
}

// Save initial state
setTimeout(() => saveState(), 100);

/* ---------- Keyboard Shortcuts ---------- */
let selectedHandleIndex = null;

document.addEventListener('keydown', (e)=>{
  // Don't trigger shortcuts when typing in inputs
  if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  const surface = getActiveSurface();
  if(!surface) return;
  
  const step = e.shiftKey ? 10 : 1; // Shift = 10px, normal = 1px
  
  // Arrow keys to nudge selected handle or all corners
  if(e.key.startsWith('Arrow')){
    e.preventDefault();
    
    if(selectedHandleIndex !== null && selectedHandleIndex >= 0 && selectedHandleIndex < 4){
      // Nudge specific handle
      const corner = surface.corners[selectedHandleIndex];
      if(e.key === 'ArrowUp') corner.y -= step;
      if(e.key === 'ArrowDown') corner.y += step;
      if(e.key === 'ArrowLeft') corner.x -= step;
      if(e.key === 'ArrowRight') corner.x += step;
      updateHandlesForSurface(surface);
      scheduleSave();
    } else {
      // Nudge all corners
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      surface.corners.forEach(c => {
        c.x += dx;
        c.y += dy;
      });
      updateHandlesForSurface(surface);
      scheduleSave();
    }
  }
  
  // Number keys 1-4 to select handle
  if(e.key >= '1' && e.key <= '4'){
    selectedHandleIndex = parseInt(e.key) - 1;
    updateAllHandles();
    // Visual feedback
    if(surface && surface.handles[selectedHandleIndex]){
      surface.handles[selectedHandleIndex].style.transform = 'translate(-50%,-50%) scale(1.3)';
      setTimeout(() => {
        if(surface && surface.handles[selectedHandleIndex]){
          surface.handles[selectedHandleIndex].style.transform = 'translate(-50%,-50%)';
        }
      }, 200);
    }
  }
  
  // Undo/Redo (Ctrl+Z / Ctrl+Shift+Z or Ctrl+Y)
  if(e.ctrlKey || e.metaKey){
    if(e.key === 'z' && !e.shiftKey){
      e.preventDefault();
      undo();
    } else if((e.key === 'z' && e.shiftKey) || e.key === 'y'){
      e.preventDefault();
      redo();
    }
  }
  
  // Delete key to delete active surface
  if(e.key === 'Delete' || e.key === 'Backspace'){
    if(surfaces.length > 1){
      deleteSurface(activeSurfaceId);
      scheduleSave();
    }
  }
  
  // Escape to deselect handle
  if(e.key === 'Escape'){
    selectedHandleIndex = null;
    updateAllHandles();
  }
});

/* ---------- Save/Load ---------- */
document.getElementById('saveBtn').addEventListener('click', ()=>{
  const project = {
    surfaces: surfaces.map(s => ({
      id: s.id,
      name: s.name,
      corners: s.corners,
      brightness: s.brightness,
      contrast: s.contrast,
      rotation: s.rotation !== undefined ? s.rotation : 0,
      isVideo: s.isVideo
    })),
    activeSurfaceId,
    globalBrightness: parseFloat(brightnessEl.value),
    globalContrast: parseFloat(contrastEl.value)
  };
  const blob = new Blob([JSON.stringify(project, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'projection-project.json';
  a.click();
});

const loadInput = document.getElementById('loadInput');
const loadBtn = document.getElementById('loadBtn');
loadBtn.addEventListener('click', ()=> loadInput.click());
loadInput.addEventListener('change', (e)=>{
  const f = e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = ()=> {
    try{
      const obj = JSON.parse(reader.result);
      
      // Clear existing surfaces
      surfaces.forEach(s => {
        gl.deleteTexture(s.texture);
        s.handles.forEach(h => h.remove());
      });
      surfaces = [];
      activeSurfaceId = null;
      nextSurfaceId = 0;
      
      // Load surfaces
      if(obj.surfaces && Array.isArray(obj.surfaces)){
        obj.surfaces.forEach(sData => {
          const surface = createSurface(sData.name);
          surface.corners = sData.corners || surface.corners;
          surface.brightness = sData.brightness || 0;
          surface.contrast = sData.contrast || 1;
          surface.rotation = sData.rotation !== undefined ? sData.rotation : 0;
          surface.isVideo = sData.isVideo || false;
        });
      }
      
      if(obj.activeSurfaceId !== undefined){
        activeSurfaceId = obj.activeSurfaceId;
      }
      
      if(obj.globalBrightness !== undefined) brightnessEl.value = obj.globalBrightness;
      if(obj.globalContrast !== undefined) contrastEl.value = obj.globalContrast;
      
      updateSurfacesList();
      updateAllHandles();
      updateGlobalControls();
    }catch(err){ 
      console.error(err);
      alert('Invalid project file: ' + err.message);
    }
  };
  reader.readAsText(f);
});

/* ---------- Video Export ---------- */
let isExporting = false;
let mediaRecorder = null;
let recordedChunks = [];

document.getElementById('exportVideoBtn').addEventListener('click', async ()=>{
  if(isExporting){
    // Stop recording
    if(mediaRecorder && mediaRecorder.state !== 'inactive'){
      mediaRecorder.stop();
    }
    return;
  }
  
  try {
    showLoading('Preparing video export...');
    isExporting = true;
    document.getElementById('exportVideoBtn').textContent = 'Stop Export';
    
    // Get canvas stream
    const stream = canvas.captureStream(30); // 30 fps
    
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 5000000 // 5 Mbps
    });
    
    mediaRecorder.ondataavailable = (e) => {
      if(e.data.size > 0){
        recordedChunks.push(e.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'projection-export.webm';
      a.click();
      URL.revokeObjectURL(url);
      
      isExporting = false;
      document.getElementById('exportVideoBtn').textContent = 'Export Video';
      hideLoading();
    };
    
    mediaRecorder.onerror = (e) => {
      console.error('MediaRecorder error:', e);
      showError('Failed to record video');
      isExporting = false;
      document.getElementById('exportVideoBtn').textContent = 'Export Video';
      hideLoading();
    };
    
    // Start recording
    mediaRecorder.start();
    hideLoading();
    
    // Auto-stop after 60 seconds (or let user stop manually)
    setTimeout(() => {
      if(mediaRecorder && mediaRecorder.state !== 'inactive'){
        mediaRecorder.stop();
      }
    }, 60000);
    
  } catch(err){
    console.error('Export error:', err);
    showError('Failed to start video export: ' + err.message);
    isExporting = false;
    document.getElementById('exportVideoBtn').textContent = 'Export Video';
    hideLoading();
  }
});

/* ---------- Snow effect ---------- */
let snowOn = false;
const snowParticles = [];
function toggleSnow(){
  snowOn = !snowOn;
  document.getElementById('toggleSnow').textContent = snowOn ? 'Snow ON ❄️' : 'Toggle Snow ❄️';
}
function updateSnow(dt){
  if(!snowOn) return;
  if(Math.random() < 0.2){
    snowParticles.push({
      x: Math.random() * window.innerWidth,
      y: -10,
      r: 1 + Math.random()*3,
      vy: 30 + Math.random()*80
    });
  }
  for(let p of snowParticles){
    p.y += p.vy * dt;
  }
  const maxY = window.innerHeight + 50;
  for(let i = snowParticles.length - 1; i >= 0; i--){
    if(snowParticles[i].y > maxY){
      snowParticles.splice(i, 1);
    }
  }
}

/* ---------- Main render loop ---------- */
let last = performance.now();
function render(now){
  const dt = (now - last) / 1000;
  last = now;
  resizeCanvasToDisplaySize();

  // Clear
  gl.clearColor(0,0,0,1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Draw all surfaces
  surfaces.forEach(surface => {
    if(!surface.media) return; // Skip surfaces without media
    
    // Update video texture if needed (throttle for performance)
    if(surface.isVideo && surface.media && surface.media.readyState >= 2){
      // Only update texture every few frames for better performance
      if(!surface._lastVideoUpdate || now - surface._lastVideoUpdate > 33){ // ~30fps
        setImageToTexture(surface, surface.media);
        surface._lastVideoUpdate = now;
      }
    }
    
    // Build vertex positions in NDC
    const ndc = surface.corners.map(c => {
      const x = (c.x / window.innerWidth) * 2 - 1;
      const y = -((c.y / window.innerHeight) * 2 - 1);
      return [x, y];
    });
    
    const positions = new Float32Array([
      ndc[0][0], ndc[0][1],
      ndc[1][0], ndc[1][1],
      ndc[2][0], ndc[2][1],
      ndc[3][0], ndc[3][1],
    ]);
    
    const uvs = new Float32Array([0,0, 1,0, 1,1, 0,1]);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
    gl.vertexAttribPointer(aUvLoc, 2, gl.FLOAT, false, 0, 0);
    
    // Set uniforms
    gl.uniform1f(uBrightnessLoc, surface.brightness);
    gl.uniform1f(uContrastLoc, surface.contrast);
    gl.uniform1f(uOpacityLoc, surface.opacity !== undefined ? surface.opacity : 1);
    gl.uniform1f(uRotationLoc, surface.rotation !== undefined ? surface.rotation : 0);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, surface.texture);
    gl.uniform1i(uTextureLoc, 0);
    
    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  });
  
  gl.disable(gl.BLEND);

  // Snow overlay
  updateSnow(dt);
  drawSnowOverlay();
  
  updateAllHandles();
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

/* ---------- 2D overlay for snow ---------- */
let overlay = null, octx = null;
function ensureOverlay(){
  if(overlay) return;
  overlay = document.createElement('canvas');
  overlay.style.position = 'fixed';
  overlay.style.left = '0';
  overlay.style.top = '0';
  overlay.style.zIndex = '10';
  overlay.style.pointerEvents = 'none';
  const dpr = window.devicePixelRatio || 1;
  overlay.width = Math.floor(window.innerWidth * dpr);
  overlay.height = Math.floor(window.innerHeight * dpr);
  overlay.style.width = window.innerWidth + 'px';
  overlay.style.height = window.innerHeight + 'px';
  document.body.appendChild(overlay);
  octx = overlay.getContext('2d');
  window.addEventListener('resize', ()=> {
    const dpr = window.devicePixelRatio || 1;
    overlay.width = Math.floor(window.innerWidth * dpr);
    overlay.height = Math.floor(window.innerHeight * dpr);
    overlay.style.width = window.innerWidth + 'px';
    overlay.style.height = window.innerHeight + 'px';
  });
}
function drawSnowOverlay(){
  ensureOverlay();
  octx.clearRect(0,0,overlay.width, overlay.height);
  if(!snowOn || snowParticles.length === 0) return;
  octx.fillStyle = 'rgba(255,255,255,0.9)';
  const dpr = window.devicePixelRatio || 1;
  for(let p of snowParticles){
    octx.beginPath();
    octx.arc(p.x * dpr, p.y * dpr, p.r * dpr, 0, Math.PI*2);
    octx.fill();
  }
}

/* ---------- Initialize ---------- */
// Create initial surface
createSurface('Surface 1');
resizeCanvasToDisplaySize();
