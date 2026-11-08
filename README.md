# Realistic 3D Web-Based Train Game

A lightweight, offline-ready, realistic 3D railway simulation game built with **Three.js** and procedural **Web Audio API**.

---

## Features

### 1. Faithful Reference 3D Models
- **T3M2M-005 Diesel Switcher Locomotive**:
  - Deep navy blue body (`#1a334f`) with vivid golden-yellow caution striping and V-chevron nose stripes.
  - Curved steel cab roof with driver windows and interior illumination.
  - Dual prominent circular cooling fan housings with mesh tops.
  - Walkway handrails with entry chains and front/rear red/white hazard striped safety buffer plates.
  - Articulated 3-axle bogies with steel wheels, coil springs, and central fuel/air reservoir tanks.
- **Fixed Railway Track**:
  - Continuous 3D Catmull-Rom spline circuit.
  - Dual extruded steel Vignoles rails with polished running surfaces.
  - Repeated concrete cross-ties (sleepers) with metal fastening plates.
  - Raised crushed-stone ballast embankment and siding with an authentic rail buffer stop.
- **Environment Props**:
  - **Electric Utility Poles with Bulbs**: Weathered utility poles with cross-arms and insulators running along alternating left and right sides of the track. Bulbs cast warm illumination pools on the track at night.
  - **Cliff Rocks**: Low-poly rock formations matching the reference textures.
  - **Trees & Shrubs**: Varied low-poly trees, deciduous canopies, and trackside bushes.
  - **Cottages**: Country settlements with stone walls, gabled roofs, chimneys, and glowing night windows.
  - **Mud & Grass**: Mud fringes along the track bed with natural grass tufts.

### 2. Atmosphere & Weather
- **Day Mode**: Soft blue atmospheric sky, warm directional sunlight, and realistic soft shadows.
- **Moonlit Night Mode**: Luminous deep navy sky, glowing full moon, twinkling stars, and silvery ambient moonlight (**never pitch black!**).
- **Rain Mode**: GPU particle system with 4,500+ natural falling raindrops, moist atmospheric haze, and gentle puddle sheen. Toggleable in both day and night.

### 3. Realistic Offline Sound Engine (Web Audio API)
- **Diesel Engine**: Synthesized low-frequency cylinder firing pulses, harmonic rumble, and turbocharger whine that smoothly revs up on throttle, ramps down on braking, and fades out when stopped.
- **Track Rhythm**: Realistic sleeper "click-clack" rhythm synced to wheel velocity.
- **Air Horn**: Multi-harmonic authentic diesel train chime (Eb4, F#4, Bb4) with natural reverberant release.
- **Rain Audio**: Filtered pink/white noise ambient rain patter.

### 4. Interactive Controls & UI
- **The 3 Controllers**:
  1. `START / STOP`: Toggles train throttle and braking physics (or press `Space`).
  2. `HORN`: Press & hold to blast the air horn (or press `H`).
  3. `LIGHT`: Toggles locomotive headlight spotlight and cabin lights (or press `L`).
- **Long-Tap Repositioning**:
  - Press and hold (500ms) anywhere on the 3-button dock to enter **Drag Mode**.
  - Drag the dock to any preferred location on your screen.
  - The custom position is automatically saved to browser `localStorage`.
- **Camera Navigation**:
  - **360° Orbit**: Mouse drag or single-finger swipe.
  - **Pinch-to-Zoom**: Two-finger pinch on touchscreen or mouse scroll wheel.
  - **Left-Side HUD**: `+` (Zoom in), `−` (Zoom out), `🎯` (Recenter view on train).
- **Top HUD**:
  - Day / Moonlit Night toggle.
  - Rain toggle.
  - Live Speedometer in km/h.

---

## How to Play

### Quick Start (Linux / Mac / Windows)

Run the included start script:
```bash
cd /home/droid/.gemini/antigravity/scratch/train-game
./start.sh
```

Or start a Python HTTP server directly:
```bash
python3 -m http.server 8080
```

Then open your browser to:
[http://localhost:8080](http://localhost:8080)

No internet connection is required—all libraries (`three.min.js`, `OrbitControls.js`, `OBJLoader.js`), models, textures, and sounds are completely bundled offline.
