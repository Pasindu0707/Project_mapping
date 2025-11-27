# Web Projection Mapper - Complete Implementation

A full-featured web-based projection mapping tool built with WebGL. Map images and videos onto multiple surfaces with corner pinning, adjust brightness/contrast, add effects, and export your work.

## Features Implemented

### ✅ Step 1: Multi-Surface Mapping
- Create and manage multiple surfaces
- Each surface has independent 4-corner warping
- Upload different media to each surface
- Select and edit surfaces individually
- Delete surfaces (minimum 1 required)

### ✅ Step 2: UI/UX Improvements
- **Keyboard Shortcuts:**
  - Arrow keys: Nudge selected handle (Shift = 10px, normal = 1px)
  - 1-4: Select specific corner handle
  - Ctrl+Z: Undo
  - Ctrl+Shift+Z / Ctrl+Y: Redo
  - Delete/Backspace: Remove active surface
  - Escape: Deselect handle
- **Undo/Redo System:** Full history with 50-state limit
- **Handle Visibility Toggle:** Show/hide all handles
- **Fullscreen Mode:** Toggle fullscreen for projector use

### ✅ Step 3: Performance & Polish
- **Video Optimization:** Throttled texture updates (~30fps) for better performance
- **Error Handling:** Comprehensive error messages and loading states
- **Loading Indicators:** Visual feedback during file operations
- **Corner Presets:**
  - Fullscreen
  - Centered Square
  - Top/Bottom/Left/Right Half
  - Trapezoid

### ✅ Step 4: Advanced Features
- **Video Export:** Record canvas output as WebM video (30fps, 5Mbps)
- **Opacity Support:** Per-surface opacity control (via shader)
- **Blending:** Alpha blending for overlapping surfaces

## How to Run

### Option 1: Use the included server (Node.js v8+ compatible)
```bash
node server.js
```
Then open http://localhost:8080

### Option 2: Use live-server (requires Node.js 12+)
```bash
npm install -g live-server
live-server --port=8080
```

### Option 3: VS Code Live Server
Right-click `index.html` → "Open with Live Server"

## Usage

1. **Create Surfaces:** Click "+ Add Surface" to create new mapping surfaces
2. **Upload Media:** Select a surface, then upload an image or video
3. **Warp Corners:** Drag the red handles to align with your projection surface
4. **Adjust Settings:** Use brightness/contrast sliders
5. **Apply Presets:** Click "Presets" for quick corner arrangements
6. **Export:** Click "Export Video" to record your mapped output

## Keyboard Shortcuts

- **Arrow Keys:** Nudge corners (Shift = 10px)
- **1-4:** Select specific corner
- **Ctrl+Z:** Undo
- **Ctrl+Shift+Z:** Redo
- **Delete:** Remove active surface
- **Escape:** Deselect handle

## File Structure

```
projection-mapper/
├── index.html      # Main HTML structure
├── style.css       # Styling
├── app.js          # Main application logic
├── server.js       # Simple HTTP server (Node.js v8+ compatible)
└── assets/         # Optional: place demo media here
```

## Save/Load Projects

- **Save:** Exports JSON with all surface positions, settings, and configurations
- **Load:** Restores saved project (media files need to be re-uploaded)

## Technical Details

- **WebGL:** Hardware-accelerated rendering
- **No Dependencies:** Pure JavaScript, no frameworks
- **Offline Capable:** Works without internet after initial load
- **Performance:** Optimized for large videos and multiple surfaces

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (may need user interaction for video autoplay)

## Next Steps (Optional Enhancements)

- Add opacity slider to UI
- Implement blend modes UI
- Add timeline for animated sequences
- Support for non-rectangular masks
- Multi-projector calibration
- Color correction tools
- Real-time preview on second screen

## Notes

- Video export uses WebM format (VP9 codec)
- Large videos (>1920px) may impact performance
- Project files don't include media - re-upload when loading
- Snow effect is a simple overlay animation

---

Built with ❤️ for projection mapping enthusiasts

