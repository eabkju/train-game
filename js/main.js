// main.js - Application bootstrap, scene lifecycle and 60fps render loop
(function() {
  'use strict';

  let scene, camera, renderer, clock;
  let trackSystem, trainPhysics, locomotive, envManager, weatherManager, gameControls;

  function init() {
    const container = document.getElementById('canvas-container');

    // 1. Three.js Scene & Clock
    scene = new THREE.Scene();
    clock = new THREE.Clock();

    // 2. Camera Setup
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(GAME_CONFIG.camera.fov, aspect, GAME_CONFIG.camera.near, GAME_CONFIG.camera.far);

    // 3. WebGL Renderer with High Performance & Shadows
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch (e) {
      console.error('WebGL Initialization Error:', e);
      const loader = document.getElementById('loading-overlay');
      if (loader) {
        loader.innerHTML = `
          <div style="font-size:42px;margin-bottom:12px;">⚠️</div>
          <div class="loader-title">WebGL Not Supported</div>
          <div class="loader-sub" style="max-width:320px;text-align:center;margin-top:8px;">
            Please enable WebGL or hardware acceleration in your browser to play the 3D train simulation.
          </div>
        `;
      }
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // 4. Initialize Core Game Subsystems
    trackSystem = new TrackSystem(scene);
    trainPhysics = new TrainPhysics(trackSystem.spline);
    locomotive = new TrainLocomotive(scene, trainPhysics);
    envManager = new EnvironmentManager(scene, trackSystem);
    weatherManager = new WeatherManager(scene, renderer);
    gameControls = new GameControls(camera, renderer.domElement, locomotive, trainPhysics, weatherManager, envManager);

    // 5. Initial Positioning
    trainPhysics.update(0.01);
    locomotive.update(0.01);
    gameControls.update(0.01);

    // 6. Window Resize Listener
    window.addEventListener('resize', onWindowResize, false);

    // 7. Start Render Loop
    requestAnimationFrame(animate);

    // Hide loading screen once ready
    const loader = document.getElementById('loading-overlay');
    if (loader) {
      setTimeout(() => {
        loader.classList.add('hidden');
        setTimeout(() => loader.remove(), 600);
      }, 400);
    }
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate() {
    requestAnimationFrame(animate);

    const dt = clock.getDelta();

    // Step physics & train mechanics
    trainPhysics.update(dt);
    locomotive.update(dt);

    // Update weather & rain particle animation
    weatherManager.update(dt, trainPhysics.currentPosition);

    // Update camera orbit & follow target
    gameControls.update(dt);

    // Render frame
    renderer.render(scene, camera);
  }

  // Launch when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
