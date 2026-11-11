// main.js - Thermal-Smart Application Bootstrap, Adaptive FPS Limiter & Idle Render Governor
(function() {
    'use strict';

    let scene, camera, renderer;
    let trackSystem, trainPhysics, locomotive, envManager, villageManager, weatherManager, audioManager, gameControls;

    // Performance & Thermal Governor State
    let perfModeIdx = GAME_CONFIG.performance.defaultModeIndex || 0;
    let currentPerfMode = GAME_CONFIG.performance.modes[perfModeIdx];
    let lastFrameTime = 0;
    let lastSimTime = performance.now();
    let fpsFrameCount = 0;
    let fpsAccumTime = 0;
    let perfTextEl = null;

    function applyPerformanceMode(mode) {
        currentPerfMode = mode;
        if (renderer) {
            const dpr = Math.min(window.devicePixelRatio || 1, mode.maxDpr);
            renderer.setPixelRatio(dpr);
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    function cyclePerformanceMode() {
        perfModeIdx = (perfModeIdx + 1) % GAME_CONFIG.performance.modes.length;
        const mode = GAME_CONFIG.performance.modes[perfModeIdx];
        applyPerformanceMode(mode);
        return mode;
    }

    function init() {
        const container = document.getElementById('canvas-container');
        perfTextEl = document.getElementById('perf-text');

        // 1. Scene & Camera
        scene = new THREE.Scene();
        const aspect = window.innerWidth / window.innerHeight;
        camera = new THREE.PerspectiveCamera(
            GAME_CONFIG.camera.fov,
            aspect,
            GAME_CONFIG.camera.near,
            GAME_CONFIG.camera.far
        );

        // 2. Lightweight WebGL Renderer
        try {
            renderer = new THREE.WebGLRenderer({
                antialias: true,
                powerPreference: 'default' // Avoid forcing discrete GPU boost clock unnecessarily
            });
        } catch (e) {
            console.error('WebGL Initialization Error:', e);
            return;
        }

        renderer.shadowMap.enabled = false; // Zero shadow map overhead
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.96;
        applyPerformanceMode(currentPerfMode);
        container.appendChild(renderer.domElement);

        // 3. Initialize Subsystems in Proper Dependency Order
        trackSystem = new TrackSystem(scene);
        trainPhysics = new TrainPhysics(trackSystem);
        locomotive = new TrainLocomotive(scene, trainPhysics);
        envManager = new EnvironmentManager(scene, trackSystem);
        villageManager = new VillageManager(scene, trackSystem, envManager);
        weatherManager = new WeatherManager(scene, renderer, envManager, villageManager);
        audioManager = new TrainAudioEngine();
        gameControls = new GameControls(
            camera,
            renderer.domElement,
            locomotive,
            trainPhysics,
            weatherManager,
            envManager,
            audioManager,
            cyclePerformanceMode
        );

        // Start train gently moving at launch so the scene feels alive right away
        gameControls.toggleStartStop();

        window.addEventListener('resize', onWindowResize, false);

        // Hide loading screen
        const loader = document.getElementById('loading-overlay');
        if (loader) {
            setTimeout(() => {
                loader.classList.add('hidden');
                setTimeout(() => loader.remove(), 450);
            }, 250);
        }

        requestAnimationFrame(animate);
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        if (gameControls) gameControls.cameraMovedRecently = true;
    }

    function animate(now) {
        requestAnimationFrame(animate);

        // 1. Tab Visibility Guard: 0% CPU/GPU usage when tab is hidden
        if (document.hidden) {
            lastSimTime = now;
            return;
        }

        // 2. Adaptive Thermal Frame-Rate Limiter
        // When train is stopped, rain is off, entities settled, and user isn't dragging camera, drop to 12 FPS idle saver!
        const isSettled = villageManager ? villageManager.isSettled() : true;
        const isIdle = (trainPhysics.speed === 0 && !trainPhysics.isRunning && !weatherManager.isRaining && !gameControls.cameraMovedRecently && isSettled);
        const effectiveFpsCap = isIdle ? 12 : currentPerfMode.fpsCap;
        const minFrameInterval = 1000.0 / (effectiveFpsCap + 1.5);

        const elapsedMs = now - lastFrameTime;
        if (elapsedMs < minFrameInterval) {
            return;
        }
        lastFrameTime = now;

        let dt = (now - lastSimTime) / 1000.0;
        lastSimTime = now;
        if (dt > 0.05) dt = 0.05;

        // 3. Step Simulation
        const moved = trainPhysics.update(dt);
        locomotive.update(dt, moved);
        weatherManager.update(dt, trainPhysics.currentPosition);
        envManager.update(trainPhysics.progress, dt);
        if (villageManager) villageManager.update(dt);
        gameControls.update(dt);
        gameControls.cameraMovedRecently = false;

        // 4. Render Scene
        renderer.render(scene, camera);

        // 5. Update Telemetry Pill once per second
        fpsFrameCount++;
        fpsAccumTime += dt;
        if (fpsAccumTime >= 1.0) {
            const fps = Math.round(fpsFrameCount / fpsAccumTime);
            const calls = renderer.info.render.calls;
            if (perfTextEl) {
                perfTextEl.textContent = `${fps} FPS · ${calls} Draw Calls · ${ isIdle ? 'Idle Cool' : 'CPU Cool' }`;
            }
            fpsFrameCount = 0;
            fpsAccumTime = 0;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
