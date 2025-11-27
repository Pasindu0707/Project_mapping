# How to Test & Use the Projection Mapper

## 🚀 Quick Start

### Step 1: Start the Server

Open terminal/PowerShell in the project folder and run:

```bash
node server.js
```

You should see:
```
Server running at http://localhost:8080/
Press Ctrl+C to stop
```

### Step 2: Open in Browser

Open your browser and go to:
```
http://localhost:8080
```

You should see the projection mapper interface with:
- Control panel on the top-left
- Black canvas filling the screen
- One default surface already created

---

## 📋 Step-by-Step Testing Guide

### Test 1: Basic Image Mapping

1. **Upload an Image:**
   - Make sure "Surface 1" is selected (highlighted in green)
   - Click "Upload Image/Video"
   - Choose any image file (JPG, PNG, etc.)
   - Wait for it to load

2. **Warp the Image:**
   - You'll see 4 red circular handles at the corners
   - Click and drag any handle to move that corner
   - The image will warp to match the new corner positions
   - Try dragging all 4 corners to different positions

3. **Adjust Settings:**
   - Move the "Brightness" slider (range: -1 to 1)
   - Move the "Contrast" slider (range: 0 to 2)
   - Watch the image update in real-time

### Test 2: Multi-Surface Mapping

1. **Create a Second Surface:**
   - Click the "+ Add Surface" button
   - You'll see "Surface 2" appear in the list

2. **Upload Different Media:**
   - Click "Surface 2" to select it (it will turn green)
   - Upload a different image or video
   - You'll see 4 new handles appear

3. **Map Both Surfaces:**
   - Click between "Surface 1" and "Surface 2" to switch
   - Each surface has independent corners and media
   - Drag corners of each surface independently

### Test 3: Keyboard Shortcuts

1. **Select a Handle:**
   - Press `1`, `2`, `3`, or `4` to select a corner
   - The selected handle will briefly scale up

2. **Nudge Corners:**
   - Press arrow keys (↑↓←→) to move the selected corner
   - Hold `Shift` + arrow keys for 10px steps
   - Without a selected handle, arrows move all corners

3. **Undo/Redo:**
   - Make some changes
   - Press `Ctrl+Z` (or `Cmd+Z` on Mac) to undo
   - Press `Ctrl+Shift+Z` to redo

4. **Delete Surface:**
   - Select a surface
   - Press `Delete` or `Backspace` to remove it

### Test 4: Presets

1. **Open Presets Menu:**
   - Click the "Presets ▼" button
   - A menu will appear with preset options

2. **Apply a Preset:**
   - Click any preset (e.g., "Centered Square")
   - The corners will instantly rearrange
   - Try different presets to see the patterns

3. **Available Presets:**
   - **Fullscreen:** Fills entire screen
   - **Centered Square:** Square in the middle
   - **Top Half / Bottom Half:** Half-screen layouts
   - **Left Half / Right Half:** Vertical halves
   - **Trapezoid:** Perspective effect

### Test 5: Video Support

1. **Upload a Video:**
   - Select a surface
   - Click "Upload Image/Video"
   - Choose an MP4 or WebM video file
   - Video will start playing automatically (muted, looping)

2. **Map Video:**
   - Drag corners to warp the video
   - Video continues playing while you adjust
   - Works the same as images

### Test 6: Handle Visibility

1. **Hide Handles:**
   - Click "Hide Handles" button
   - All corner handles disappear
   - Useful for clean preview

2. **Show Handles:**
   - Click "Show Handles" button
   - Handles reappear

### Test 7: Fullscreen Mode

1. **Enter Fullscreen:**
   - Click "Fullscreen" button
   - Browser goes fullscreen
   - Perfect for projector use

2. **Exit Fullscreen:**
   - Click "Exit Fullscreen" or press `F11`
   - Returns to windowed mode

### Test 8: Save & Load Projects

1. **Save Project:**
   - Arrange your surfaces
   - Click "Save Project"
   - A JSON file downloads (`projection-project.json`)
   - This saves corner positions and settings (NOT the media files)

2. **Load Project:**
   - Click "Load Project"
   - Select the saved JSON file
   - Surfaces and corners restore
   - You'll need to re-upload media files

### Test 9: Video Export

1. **Start Recording:**
   - Click "Export Video" button
   - Recording starts (button changes to "Stop Export")
   - Canvas output is being captured

2. **Stop Recording:**
   - Click "Stop Export" again
   - Or wait 60 seconds (auto-stop)
   - A WebM file downloads automatically

3. **Play Exported Video:**
   - Open the downloaded `.webm` file
   - Should see your mapped projection

### Test 10: Snow Effect

1. **Toggle Snow:**
   - Click "Toggle Snow ❄️"
   - Snow particles start falling
   - Click again to turn off

---

## 🎯 How It Works (Technical Overview)

### Architecture

```
┌─────────────────────────────────────┐
│         Browser (WebGL)             │
├─────────────────────────────────────┤
│  ┌──────────┐    ┌──────────────┐  │
│  │  HTML UI │───▶│  JavaScript  │  │
│  └──────────┘    │   (app.js)    │  │
│                  └───────┬───────┘  │
│                          │          │
│                  ┌───────▼───────┐  │
│                  │  WebGL Canvas │  │
│                  │   (Rendering)  │  │
│                  └───────────────┘  │
└─────────────────────────────────────┘
```

### Core Components

1. **WebGL Rendering:**
   - Uses WebGL to draw textured quads
   - Each surface is a 4-corner quadrilateral
   - Shaders apply brightness/contrast/opacity

2. **Surface System:**
   - Each surface = independent mapping area
   - Has its own texture, corners, and settings
   - Rendered in order (last = on top)

3. **Corner Warping:**
   - Screen pixel coordinates → Normalized Device Coordinates (-1 to 1)
   - WebGL draws quad with warped texture coordinates
   - Real-time updates as you drag handles

4. **State Management:**
   - History array stores previous states
   - Auto-saves on corner changes (500ms delay)
   - Undo/redo navigates history

### Data Flow

```
User Action (Drag Handle)
    ↓
Update Corner Position
    ↓
Convert to NDC Coordinates
    ↓
Update WebGL Vertex Buffer
    ↓
Render Quad with Texture
    ↓
Display on Canvas
```

### File Structure

```
projection-mapper/
├── index.html      # UI structure
├── style.css       # Styling
├── app.js          # Main logic (900+ lines)
├── server.js       # HTTP server
└── assets/         # Optional: demo media
```

---

## 🎬 Real-World Usage Example

### Scenario: Mapping a House Facade

1. **Setup:**
   - Connect laptop to projector
   - Position projector facing house
   - Open projection mapper in browser

2. **Create Surfaces:**
   - Surface 1: Main wall
   - Surface 2: Window
   - Surface 3: Door

3. **Upload Media:**
   - Surface 1: Snow animation video
   - Surface 2: Twinkling lights image
   - Surface 3: Door decoration image

4. **Align Corners:**
   - Drag handles to match physical corners
   - Use arrow keys for fine adjustments
   - Toggle handles off to preview

5. **Adjust Settings:**
   - Increase brightness if projection is dim
   - Adjust contrast for better visibility

6. **Export:**
   - Record final result as video
   - Share or use for documentation

---

## 🐛 Troubleshooting

### Problem: Server won't start
**Solution:** Make sure Node.js is installed. Check with `node --version`

### Problem: WebGL not supported
**Solution:** Update your browser or use Chrome/Firefox/Edge

### Problem: Video won't play
**Solution:** 
- Check video format (MP4/WebM recommended)
- Some browsers require user interaction before autoplay
- Try clicking the canvas first

### Problem: Handles not visible
**Solution:** 
- Check if "Hide Handles" is active
- Make sure a surface is selected
- Refresh the page

### Problem: Export video is blank
**Solution:**
- Make sure surfaces have media loaded
- Wait a few seconds before stopping export
- Check browser console for errors

### Problem: Performance is slow
**Solution:**
- Use smaller video files (<1920px recommended)
- Reduce number of surfaces
- Close other browser tabs

---

## 💡 Tips & Best Practices

1. **For Projectors:**
   - Use fullscreen mode
   - Hide handles during presentation
   - Test brightness/contrast in actual lighting

2. **For Multiple Surfaces:**
   - Name surfaces descriptively (edit in code if needed)
   - Use different colors/brightness to distinguish
   - Save project frequently

3. **For Video:**
   - Use looping videos for continuous effects
   - Keep file sizes reasonable (<50MB)
   - Test playback before mapping

4. **Keyboard Workflow:**
   - Use `1-4` to select corner
   - Use arrows for precise positioning
   - Use `Ctrl+Z` liberally to experiment

5. **Performance:**
   - Limit to 5-10 surfaces for smooth performance
   - Use compressed images/videos
   - Close unnecessary browser tabs

---

## 🎓 Learning Path

**Beginner:**
1. Start with single surface + image
2. Learn to drag corners
3. Try brightness/contrast

**Intermediate:**
4. Add second surface
5. Use keyboard shortcuts
6. Try presets

**Advanced:**
7. Multi-surface complex mapping
8. Video export workflow
9. Save/load projects

---

## 📞 Quick Reference

| Action | Method |
|--------|--------|
| Move corner | Drag handle |
| Fine adjust | Arrow keys |
| Select corner | Press 1-4 |
| Undo | Ctrl+Z |
| Redo | Ctrl+Shift+Z |
| Delete surface | Delete key |
| Hide handles | Toggle button |
| Fullscreen | Fullscreen button |
| Export video | Export button |

---

Ready to map! 🎄✨

