# Zero-Lag 3D Browser Game Architecture & Performance Guide

## Overview
Running a massive open-world 3D railway route (spanning over $190\text{ km}$ of tracks, thousands of sleepers, colorful buildings, trees, bridges, dynamic lighting, and rain particles) inside a mobile or desktop web browser without frame drops or stuttering requires strict CPU, GPU, and Garbage Collector (GC) discipline.

This guide documents the exact engineering patterns used in **Rail Journey Bangladesh 3D** so you can upload it to **Antigravity** (or apply it to any other Three.js / WebGL game) to guarantee a locked, buttery-smooth **60 FPS** experience.

---

## 1. Zero Garbage Collection (GC) Stutter in the Render Loop
The #1 cause of micro-stutters ("lag spikes") in JavaScript browser games is allocating new objects (`new THREE.Vector3()`, `new THREE.Matrix4()`, or `{ x, y, z }`) inside the `requestAnimationFrame` loop. When thousands of temporary objects are created per second, the browser's Garbage Collector pauses the main thread to clean up memory.

### How We Solved It:
* **Pre-Allocated Scratchpad Objects**: All vectors and coordinate containers (`pHead`, `dHead`, `pF`, `pR`, `tgt`, `v3`, `dummy`) are allocated **once** at startup outside the loop and mutated in-place every frame.
* **TypedArrays (`Float32Array` & `Uint32Array`)**: All spline coordinates (`X`, `Y`, `Z`), tangents (`TX`, `TZ`), speed limits (`lim`), and rain particle coordinates (`rainPos`) are stored in contiguous flat `Float32Array` buffers. Accessing typed arrays is $\sim 10\times$ faster than nested JavaScript objects and produces zero GC pressure.

```javascript
// BAD (Causes GC lag spikes every few seconds):
function update() {
  let pos = getPositionAt(s); // Allocates a new Vector3 60 times/sec!
  car.position.copy(pos);
}

// GOOD (Zero-allocation pattern used in this game):
var pF = { x: 0, y: 0, z: 0 }; // Allocated once globally
function update() {
  posAt(R, s, pF); // Mutates pF in-place; 0 bytes allocated!
  car.position.set(pF.x, pF.y, pF.z);
}
```

---

## 2. $O(1)$ Constant-Time Spline & Physics Lookup
Evaluating a complex `CatmullRomCurve3` mathematically on every frame for 4 train cars, 8 bogies, and 500 track sleepers is computationally expensive and slows down the CPU.

### How We Solved It:
* **Arc-Length Pre-Baking**: At initialization (`buildRoute`), the spline is sampled once at uniform $\Delta s = 6\text{ m}$ intervals into flat `Float32Array` tables (`R.X`, `R.Y`, `R.Z`, `R.TX`, `R.TZ`).
* **$O(1)$ Linear Interpolation (`posAt` & `dirAt`)**: During gameplay, finding any 3D point or tangent along the $195\text{ km}$ track takes only a single division and linear interpolation:
  $$f = \frac{s}{\Delta s}, \quad i = \lfloor f \rfloor, \quad t = f - i$$
  $$\mathbf{P}(s) = \mathbf{P}_i + (\mathbf{P}_{i+1} - \mathbf{P}_i) \cdot t$$
  This reduces thousands of heavy polynomial curve calculations per frame down to basic arithmetic.

---

## 3. GPU Hardware Instancing & Sliding Window Pooling
A $195\text{ km}$ railway track requires over **278,000 wooden sleepers**. Rendering 278,000 individual `THREE.Mesh` objects would crash the browser with 278,000 draw calls.

### How We Solved It:
1. **`THREE.InstancedMesh` Batching**: Bridge piers and track sleepers are rendered using `THREE.InstancedMesh`, collapsing hundreds of identical meshes into a **single WebGL draw call**.
2. **Sliding-Window Object Pool (`SLEEPERS = 500`)**: Instead of placing sleepers across the entire $195\text{ km}$ map, we only allocate **500 sleeper instances** and recycle them in a moving window around the train's current arc-length `run.s`:
   $$n_0 = \left\lfloor \frac{s_{\text{train}} - 180}{0.7} \right\rfloor$$
   As the train moves forward, sleepers behind the camera are seamlessly repositioned ahead of the train inside the single `InstancedMesh` matrix buffer.

---

## 4. Single-Pass Continuous Ribbon Geometry for Tracks
Instead of building the railway embankment, gravel ballast, and steel rails out of thousands of separate segment boxes, `ribbonMesh()` constructs a **single continuous indexed triangle strip (`BufferGeometry`)** for the entire route:
* **Embankment**: 1 draw call
* **Gravel Ballast**: 1 draw call
* **Left & Right Steel Rails**: 2 draw calls

This keeps the entire railway infrastructure at just **4 draw calls total**, regardless of route length.

---

## 5. Material & Procedural Texture Sharing (Zero Network Latency)
External high-res image textures (`.png` / `.jpg`) take megabytes of VRAM, cause network loading stalls, and trigger GPU texture uploads mid-game.

### How We Solved It:
* **Procedural HTML5 Canvas Textures**: All textures (rural Bengal paddy/mustard fields, train liveries, illuminated windows, apartment building facades, and bilingual station signboards) are generated in milliseconds in memory using 2D `<canvas>` drawing commands.
* **Pre-Baked State Textures (Instant Light Toggling)**: Instead of re-rendering canvas textures when the user toggles the **Cabin Light**, both the `Lit` and `Off` textures (`sideCabTexLit` / `sideCabTexOff`) are generated once at startup. Toggling the cabin light simply swaps the material pointer (`matSideCab.map = enabled ? sideCabTexLit : sideCabTexOff`), taking $0.01\text{ ms}$.
* **Shared Materials & Geometries**: Trees, houses, apartments, and bogie wheels share pooled `BufferGeometry` and `MeshLambertMaterial` instances so the WebGL shader compiler never stalls during gameplay.

---

## 6. Lighting, Fog Culling & Pixel Ratio Capping
Real-time shadows and excessive `PointLight` sources are the biggest GPU bottlenecks on mobile browsers.

### How We Solved It:
1. **Device Pixel Ratio Cap (`DPR <= 2`)**: Modern smartphones have `devicePixelRatio` values of `3.0` to `4.0` (rendering $9\times$ to $16\times$ more pixels). Capping `Math.min(window.devicePixelRatio || 1, 2)` cuts GPU fragment shader load by over **55%** with zero perceptible loss in sharpness.
2. **Lambertian & Unlit Shading**: Environmental structures use `MeshLambertMaterial` (which computes lighting per-vertex rather than per-pixel) and `MeshBasicMaterial` for self-illuminated windows/lanterns, saving massive GPU fragment shader cycles.
3. **Exponential Distance Fog (`FogExp2`) + Far-Plane Culling**: Atmospheric haze blends distant structures smoothly into the horizon, allowing a tight frustum far plane and avoiding overdraw.
4. **Camera-Relative Particle Recycling**: Instead of spawning millions of rain drops across the world, a single `THREE.Points` buffer of **2,000 vertices** is locked to `camera.position.x / z`. Raindrops falling below $y < 0$ wrap back to $y = 85$, creating infinite monsoon rain in **1 draw call**.

---

## 7. Delta-Time ($\Delta t$) Clamping & Exponential Smoothing
Browser frame rates can fluctuate if a user switches tabs or receives a notification.
* **Delta-Time Clamping**: `var dt = Math.min(0.05, (now - lastTime) / 1000);` caps the physics timestep at $50\text{ ms}$ ($20\text{ FPS}$ minimum equivalent) so the train never teleports or overshoots stations after a tab switch.
* **Frame-Rate Independent Camera Damping**: Camera zoom uses exponential decay:
  $$D \leftarrow D + (D_{\text{target}} - D) \cdot \left(1 - e^{-8 \Delta t}\right)$$
  ensuring identical camera smoothness on $60\text{ Hz}$, $120\text{ Hz}$, and $144\text{ Hz}$ displays.

---

## 8. Checklist for Antigravity / Future Games
When prompting Antigravity to apply these optimizations to another game, include these rules:
1. **Never use `new` inside `requestAnimationFrame`**—pre-allocate all vectors and matrices globally.
2. **Cap `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`** and set `{ powerPreference: 'high-performance' }`.
3. **Share Geometries and Materials** across repeated world props, or batch them with `THREE.InstancedMesh`.
4. **Use a camera-centered sliding window** for repeating details (sleepers, rain, grass) rather than populating the entire map at once.
5. **Pre-bake curves into `Float32Array` lookup tables** for $O(1)$ position and rotation queries.