# How the Projection Mapper Works

## 🎯 Simple Explanation

Think of it like **digital masking tape** for projectors:
- You upload an image/video
- You drag 4 corners to match a real surface
- The image warps to fit those corners
- Multiple surfaces = multiple mapped areas

---

## 🔧 Technical Deep Dive

### 1. **WebGL Rendering Pipeline**

```
Image/Video File
    ↓
Loaded into Browser Memory
    ↓
Uploaded to GPU as Texture
    ↓
Drawn as Quadrilateral (4-corner shape)
    ↓
Displayed on Canvas
```

### 2. **Corner Warping Math**

When you drag a corner:

```
Screen Coordinates (pixels)
    Example: {x: 500, y: 300}
    ↓
Normalized Device Coordinates (-1 to 1)
    Formula: x_ndc = (x / screenWidth) * 2 - 1
    Example: {x: -0.2, y: 0.1}
    ↓
WebGL Vertex Position
    Used to draw quad corner
```

**Why?** WebGL uses coordinates from -1 to 1, not pixels.

### 3. **Surface System**

Each surface is an object:

```javascript
{
  id: 0,
  name: "Surface 1",
  corners: [
    {x: 100, y: 100},  // Top-left
    {x: 900, y: 100},  // Top-right
    {x: 900, y: 700},  // Bottom-right
    {x: 100, y: 700}   // Bottom-left
  ],
  texture: WebGLTexture,  // GPU texture
  media: Image/Video,      // Source media
  brightness: 0,
  contrast: 1,
  opacity: 1
}
```

### 4. **Rendering Loop**

Every frame (60 times per second):

```
1. Clear canvas (black)
2. For each surface:
   a. Update video texture (if video)
   b. Convert corners to NDC
   c. Build vertex buffer
   d. Set shader uniforms (brightness, contrast)
   e. Draw quad
3. Draw snow overlay (if enabled)
4. Update handle positions
5. Repeat
```

### 5. **Shader Processing**

The fragment shader (runs per pixel):

```glsl
1. Sample texture at UV coordinate
2. Apply brightness: rgb += brightness
3. Apply contrast: rgb = (rgb - 0.5) * contrast + 0.5
4. Apply opacity: alpha *= opacity
5. Output final color
```

### 6. **State Management**

**Undo/Redo System:**

```
History Array: [State1, State2, State3, ...]
                ↑
            Current Index

Undo: Move index left, restore state
Redo: Move index right, restore state
```

**Auto-Save:**
- Triggers 500ms after corner change
- Prevents saving on every tiny movement
- Limits to 50 states (memory management)

### 7. **Video Export**

```
Canvas.captureStream(30fps)
    ↓
MediaRecorder (WebM encoder)
    ↓
Records frames to chunks
    ↓
On stop: Combine chunks → Blob
    ↓
Download as .webm file
```

---

## 🎨 Visual Flow Diagram

```
┌─────────────────────────────────────────────┐
│           USER INTERFACE                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Upload   │  │ Bright   │  │ Contrast │  │
│  │ Button   │  │ Slider   │  │ Slider   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │             │              │        │
│       └─────────────┼──────────────┘        │
│                    │                       │
│              ┌─────▼─────┐                 │
│              │  app.js   │                 │
│              │  (Logic)   │                 │
│              └─────┬─────┘                 │
└────────────────────┼───────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │             │
   ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
   │ Surface │  │ Surface │  │ Surface │
   │    1    │  │    2    │  │    3    │
   └────┬────┘  └────┬────┘  └────┬────┘
        │            │             │
        └────────────┼─────────────┘
                     │
              ┌──────▼──────┐
              │  WebGL      │
              │  Rendering  │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │   Canvas    │
              │  (Display)   │
              └─────────────┘
```

---

## 🔄 Event Flow Example

**User drags a corner handle:**

```
1. pointerdown event
   → Set dragging = {surfaceId, cornerIndex, offset}
   
2. pointermove event (repeated)
   → Update corner position
   → Update handle visual position
   → Trigger render (automatic via requestAnimationFrame)
   
3. pointerup event
   → Clear dragging
   → Schedule state save (for undo)
```

**Render frame:**

```
1. requestAnimationFrame callback
   → Clear canvas
   → For each surface:
      - Update texture if video
      - Calculate NDC from corners
      - Draw quad
   → Draw snow
   → Update handles
   → requestAnimationFrame again
```

---

## 💾 Data Persistence

**Save Format (JSON):**

```json
{
  "surfaces": [
    {
      "id": 0,
      "name": "Surface 1",
      "corners": [
        {"x": 100, "y": 100},
        {"x": 900, "y": 100},
        {"x": 900, "y": 700},
        {"x": 100, "y": 700}
      ],
      "brightness": 0.2,
      "contrast": 1.1,
      "isVideo": false
    }
  ],
  "activeSurfaceId": 0
}
```

**Note:** Media files are NOT saved (too large). User must re-upload.

---

## 🚀 Performance Optimizations

1. **Video Texture Throttling:**
   - Only update every 33ms (~30fps)
   - Prevents excessive GPU uploads
   - `if(now - lastUpdate > 33) updateTexture()`

2. **Efficient Particle Removal:**
   - Reverse iteration for array splicing
   - O(n) instead of O(n²) with shift()

3. **State History Limit:**
   - Max 50 states
   - Removes oldest when full
   - Prevents memory bloat

4. **Selective Rendering:**
   - Only render surfaces with media
   - Skip empty surfaces
   - Early returns in loops

---

## 🎯 Key Concepts

### **Corner Pinning**
Mapping a rectangular image to any 4-corner shape. Uses perspective transformation math.

### **NDC (Normalized Device Coordinates)**
WebGL's coordinate system: -1 to 1 on both axes, regardless of screen size.

### **Texture Mapping**
Applying an image to a 3D shape. UV coordinates (0,0 to 1,1) map texture pixels to quad corners.

### **Blending**
Combining multiple surfaces with transparency. Uses alpha blending: `result = source * alpha + dest * (1-alpha)`

---

## 🔍 Debugging Tips

**Open Browser Console (F12):**

- Check for WebGL errors
- See texture loading status
- Monitor frame rate
- View state history

**Common Issues:**

1. **Black screen:** No media loaded or WebGL error
2. **Handles not moving:** Check if surface is selected
3. **Video not playing:** Browser autoplay restrictions
4. **Slow performance:** Too many surfaces or large videos

---

## 📚 Further Reading

- **WebGL Fundamentals:** https://webglfundamentals.org
- **Projection Mapping:** Search "video mapping" or "projection mapping"
- **MediaRecorder API:** MDN documentation
- **Canvas API:** MDN documentation

---

Understanding these concepts helps you:
- Debug issues
- Add new features
- Optimize performance
- Customize the code

Happy mapping! 🎄

