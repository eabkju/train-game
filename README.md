# Realistic 3D Web-Based Train Game (Cool CPU & Village Life Edition)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Play%20Now-brightgreen?style=for-the-badge&logo=googlechrome&logoColor=white)](https://eabkju.github.io/train-game/)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Deployed-blue?style=for-the-badge&logo=github)](https://eabkju.github.io/train-game/)

> **Play Live Game:** **[https://eabkju.github.io/train-game/](https://eabkju.github.io/train-game/)**

An ultra-lightweight, visually rich 3D railway simulation game built with **Three.js** and procedural **Web Audio API**, featuring an active rural countryside with working village farms, animated farmers, cattle, Indian roadside tea stalls, and an $O(1)$ pre-baked physics engine.

---

## What's New: Rural Village & Indian Tea Stalls Update

### 1. 4 Scenic Village Farms Beside the Track
- **Sunny Hollow North Farmstead**: Sprawling northern farmstead nestled inside the Figure-8 loop with a two-story farmhouse, red gambrel barn, golden wheat field, vegetable rows, and cattle pasture.
- **Meadowbrook West Farmstead**: Situated along the lush western meadow beside the incline towards the overpass.
- **Greenlands South Valley Dairy Farm**: Located in the southern countryside meadow.
- **Highland Grain Farm**: Positioned along the northeast scenic loop.
- **Strict Track Safety Buffer**: Guaranteed zero obstruction on railway tracks—all trees, cottages, rocks, and farm fences strictly maintain a generous safety clearance from the rail corridor.

### 2. Minecraft-Inspired Working Farmers & Cattle
- **Scale & Minimalist Aesthetic**: Realistic human (~1.78m) and bovine (~1.42m shoulder height) anatomical proportions with Minecraft-inspired faceted geometry. Heads are clean and minimalist (**no eyes, nose, or mouth**).
- **Working Farmers**: 11 farmers dressed in flannel shirts, denim overalls, straw sun hats, and flat caps:
  - **Day Mode**: Actively working in the farm fields, hoeing and tending crops.
  - **Night / Sunset Mode**: Round up the cattle and walk slowly back toward the farmhouses/barns with animated leg swings, settling at the barn under warm window glow.
  - **Rain Mode**: Freeze in place immediately at their exact positions, raising and holding colorful open umbrellas overhead until the rain stops.
  - **Day Transition**: Head smoothly toward their field work spots from wherever they currently are.
- **Working Draft Cattle**: 11 dairy cows (Holstein black-and-white spotted and Jersey caramel coats):
  - Draft cows fitted with agricultural working harnesses and plows working along the soil furrows in daytime.
  - Pasture cows grazing with rhythmic head lowering to chew grass and tail swishing.
  - Follow the farmers home slowly at dusk/night.
  - Stand patiently in place during rain.

### 3. 4 Indian-Style Roadside Chai Tapris (Tea Stalls)
- Authentic village roadside tea stalls placed at scenic trackside vantage points:
  1. **Sharma Chai Stall · गरमा गरम चाय** (Greenlands Junction station approach)
  2. **Crossing Road Chai Tapri · स्पेशल कटिंग चाय** (Beside the road at the animated level crossing)
  3. **Village Corner Chai · कड़क मसाला चाय** (Trackside northern village loop)
  4. **Meadowbrook Chai Tapri · शुद्ध ताजा चाय** (Western meadow bridge approach)
- **Always-Glowing Yellow Incandescent Bulb**: Each stall features a hanging vintage incandescent bulb with a warm amber-yellow point light that **glows continuously day and night**.
- **Authentic Indian Details**: Brass/aluminum tea kettles on gas stoves, wire racks of cutting chai glasses, glass biscuit jars, wooden seating benches, and hand-painted bilingual signboards.
- **Customers Eating/Drinking Tea**: Stylized figures in colorful kurtas, Nehru waistcoats, dhotis, and headwraps sitting on benches or standing at the counter, periodically raising their cutting chai glasses to sip hot tea.

---

## Core Performance & Simulation Highlights

1. **$O(1)$ Pre-Baked `Float32Array` Spline Lookup Table (`js/track.js` & `js/physics.js`)**:
   - Eliminates per-frame Catmull-Rom polynomial calculations across the locomotive, 5 passenger carriages, and 12 bogies with instantaneous $O(1)$ lookup over 4,096 pre-baked samples.
2. **100% GPU Hardware Instancing (`js/environment.js`)**:
   - Renders 450+ trees, 260 bushes, 65 boulders, 140 telegraph poles, and cottages in ~24 draw calls total.
3. **Adaptive Thermal Frame-Rate Limiter (`js/main.js`)**:
   - On-screen thermal modes (`🌿 Cool 45 FPS`, `⚡ Eco 30 FPS`, `🚀 60 FPS`) with automatic low-power idle sleep when the train and villagers are settled.
4. **Zero-Garbage Collection (Zero-GC)**:
   - Zero object allocations inside `requestAnimationFrame`.

---

## Atmospheric Modes & Controls

- **Atmospheres**: Cycle **Day ☀️**, **Golden Sunset 🌅**, and **Moonlit Night 🌙** (with full moon and 600-star dome), plus toggleable **Rain 🌧️**.
- **Camera Views**: Switch between **🎥 Orbit Chase**, **🚂 Driver Deck POV**, **🎬 Trackside Fly-by**, and **🦅 Drone Overview**.
- **Locomotive Dock**:
  - `START / STOP`: Toggle throttle / brakes (Hotkey: `Space`).
  - `HORN`: Sound air horn (Hotkey: `H`).
  - `LIGHT`: Toggle locomotive headlight and carriage lights (Hotkey: `L`).
  - Draggable anywhere on screen (hold 500ms to drag).

---

## How to Run

### Quick Start
Run the local script:
```bash
./start.sh
```
Or start Python HTTP server:
```bash
python3 -m http.server 8080
```
Then open: [http://localhost:8080](http://localhost:8080)

Or open `train-game-standalone.html` directly in any web browser without needing any web server or internet connection!
