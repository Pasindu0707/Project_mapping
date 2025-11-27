# 🎥 Projector Setup Guide - HDMI Connection

## How Projection Mapping Works with Your HDMI Projector

This guide explains how to connect and use your HDMI projector with the Web Projection Mapper.

---

## 🔌 Step 1: Physical Connection

### Connect Your Projector

1. **Power off both devices** (computer and projector) before connecting
2. **Connect HDMI cable:**
   - Plug one end into your computer's HDMI port
   - Plug the other end into your projector's HDMI input
3. **Power on the projector first**, then your computer
4. **Select HDMI input** on your projector (use remote or projector buttons)

### Check Connection

- Your computer should detect the projector as a second display
- You may see a duplicate screen or extended desktop

---

## 🖥️ Step 2: Configure Display Settings

### Windows 10/11

1. **Open Display Settings:**
   - Right-click desktop → "Display settings"
   - Or: Press `Windows + P` for quick display options

2. **Choose Display Mode:**
   
   **Option A: Extended Display (RECOMMENDED)**
   - Press `Windows + P` → Select "Extend"
   - This gives you two separate screens:
     - **Screen 1:** Your laptop/computer monitor (for controls)
     - **Screen 2:** Projector (for projection output)
   - **Why this is best:** You can see the UI controls on your laptop while the projector shows only the mapped content

   **Option B: Duplicate Display**
   - Press `Windows + P` → Select "Duplicate"
   - Both screens show the same content
   - **Use this if:** You want to see exactly what's projected

3. **Set Projector as Primary (Optional):**
   - In Display Settings, click on the projector display
   - Check "Make this my main display" if you want the browser to open on the projector

### Mac

1. **Open System Preferences → Displays**
2. **Arrangement tab:**
   - Uncheck "Mirror Displays" for extended mode
   - Or check it for duplicate mode
3. **Position displays** by dragging the display icons to match physical setup

---

## 🎯 Step 3: Using the Application with Projector

### Recommended Setup: Extended Display Mode

```
┌─────────────────┐         ┌─────────────────┐
│   Laptop Screen │         │   Projector     │
│                 │         │   (Wall/Surface) │
│  [UI Controls]  │         │                 │
│  [Surfaces]     │         │  [Canvas Only]  │
│  [Buttons]      │         │  (Black + Image) │
│                 │         │                 │
│  Browser Window │         │  Projected Image │
│  (localhost)    │         │  on Real Surface │
└─────────────────┘         └─────────────────┘
```

### How It Works:

1. **Open the application** in your browser (http://localhost:8080)

2. **Move browser window to projector:**
   - In extended mode, drag the browser window to the projector screen
   - Or press `F11` for fullscreen on the projector

3. **Use your laptop screen for controls:**
   - Keep the browser window on your laptop for the UI
   - Or open a second browser window on your laptop
   - Adjust settings, upload images, drag corners from your laptop

4. **Projector shows the canvas:**
   - The black canvas with your mapped images
   - No UI controls (clean projection)
   - Perfect for the audience to see

---

## 🎨 Step 4: Projection Mapping Workflow

### Setup Process:

1. **Position Your Projector:**
   - Point it at the surface you want to map (wall, building, object)
   - Adjust distance and angle
   - Focus the image

2. **Open the Application:**
   - Run `node server.js`
   - Open browser on the projector display (or extended mode)

3. **Create Surfaces:**
   - Click "+ Add Surface" or use shape presets (Cube, House, etc.)
   - Each surface = one area to map

4. **Upload Images/Videos:**
   - Select a surface
   - Click "Upload Image/Video"
   - Choose your media file

5. **Align Corners:**
   - Drag the 4 green corner handles
   - Match them to the physical corners of your surface
   - Use arrow keys for fine adjustments (1-4 to select handle, then arrows)

6. **Adjust Settings:**
   - Brightness: Increase if projection is dim
   - Contrast: Adjust for better visibility
   - Rotation: Rotate image if needed

7. **Hide UI for Clean Projection:**
   - Click "Hide UI" button (bottom-right)
   - Or press F11 for fullscreen
   - Now only the mapped content is visible

---

## 💡 Pro Tips

### Best Practices:

1. **Use Extended Display:**
   - Keep UI on laptop, projection on projector
   - Easier to make adjustments while projecting

2. **Hide Handles During Projection:**
   - Click "Hide Handles" button
   - Cleaner look for your audience

3. **Fullscreen Mode:**
   - Press F11 or click "Fullscreen" button
   - Removes browser chrome for clean projection

4. **Adjust Brightness:**
   - Projectors often need higher brightness
   - Use the brightness slider (range: -1 to 1)
   - Increase contrast for better visibility

5. **Save Your Project:**
   - Click "Save Project" before disconnecting
   - Reload later with "Load Project"
   - Media files need to be re-uploaded (they're not saved)

### Troubleshooting:

**Projector not detected:**
- Check HDMI cable connection
- Try different HDMI port on projector
- Restart both devices
- Check projector input source (should be HDMI)

**Image is too small/large:**
- Adjust projector zoom/focus
- Use corner handles to resize in the app
- Move projector closer/farther from surface

**Colors look wrong:**
- Adjust brightness/contrast sliders
- Check projector color settings
- Ensure room lighting isn't too bright

**Lag or stuttering:**
- Close other applications
- Use smaller video files
- Reduce number of surfaces
- Check HDMI cable quality (use HDMI 2.0+ for 4K)

---

## 🏗️ Example: Mapping a House

1. **Connect projector** to laptop via HDMI
2. **Position projector** facing the house facade
3. **Set extended display** mode (Windows + P → Extend)
4. **Open application** and move browser to projector screen
5. **Click "🏠 House"** button to create 3 surfaces:
   - House - Front Wall
   - House - Left Wall  
   - House - Right Wall
6. **Upload images** to each surface:
   - Front wall: Main image/video
   - Left wall: Side decoration
   - Right wall: Side decoration
7. **Drag corner handles** to match physical house corners
8. **Adjust brightness/contrast** for visibility
9. **Hide UI** for clean projection
10. **Enjoy your mapped house!** 🎄

---

## 🔧 Technical Details

### How the Application Works with Projectors:

1. **WebGL Rendering:**
   - Application uses WebGL to render images
   - Canvas fills the entire browser window
   - When in fullscreen, fills entire projector output

2. **Coordinate System:**
   - Corner positions are in screen pixels
   - When you drag a corner, it moves in screen space
   - Projector displays exactly what's on the canvas

3. **Multi-Display Support:**
   - Browser window can be on any display
   - Canvas renders at native resolution
   - Projector shows whatever is on that display

4. **Resolution:**
   - Application adapts to projector resolution
   - Higher resolution = sharper projection
   - Supports common projector resolutions (1920x1080, 1280x800, etc.)

---

## 📱 Alternative: Using a Second Computer

If you don't want to use extended display:

1. **Setup:**
   - Computer 1: Run server, control the application
   - Computer 2: Connect to same network, open http://[Computer1-IP]:8080
   - Projector: Connected to Computer 2

2. **Workflow:**
   - Control from Computer 1
   - Project from Computer 2
   - Both see the same content

---

## ✅ Quick Checklist

Before starting your projection mapping session:

- [ ] HDMI cable connected
- [ ] Projector powered on and set to HDMI input
- [ ] Computer detects projector (check Display Settings)
- [ ] Display mode set (Extended recommended)
- [ ] Browser open on projector display
- [ ] Application loaded (http://localhost:8080)
- [ ] Surfaces created and images uploaded
- [ ] Corners aligned to physical surface
- [ ] UI hidden for clean projection
- [ ] Brightness/contrast adjusted

---

**Happy Projection Mapping! 🎄✨**

For more details, see:
- `HOW_IT_WORKS.md` - Technical details
- `TESTING_GUIDE.md` - Step-by-step testing
- `README.md` - General information

