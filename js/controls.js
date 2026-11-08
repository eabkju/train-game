// controls.js - Touch/mouse interactions, draggable 3-button dock, left-side zoom/recenter & camera orbit
class GameControls {
  constructor(camera, domElement, train, physics, weather, env) {
    this.camera = camera;
    this.domElement = domElement;
    this.train = train;
    this.physics = physics;
    this.weather = weather;
    this.env = env;

    // Camera Spherical Orbit Parameters
    this.orbitRadius = GAME_CONFIG.camera.defaultDistance; // ~24m
    this.orbitTheta = GAME_CONFIG.camera.defaultYaw;       // Azimuth
    this.orbitPhi = Math.PI * 0.5 - GAME_CONFIG.camera.defaultPitch; // Polar angle
    this.targetPos = new THREE.Vector3();

    // Interaction states
    this.isPointerDown = false;
    this.previousPointerPos = { x: 0, y: 0 };
    this.pinchStartDistance = 0;
    this.isPinching = false;

    // Draggable Controller Dock State
    this.dockElement = null;
    this.isLongTapping = false;
    this.isDraggingDock = false;
    this.longTapTimer = null;
    this.dragOffset = { x: 0, y: 0 };

    this.initUI();
    this.initCameraControls();
    this.initKeyboardControls();
  }

  initUI() {
    this.dockElement = document.getElementById('train-controls-dock');
    this.btnStartStop = document.getElementById('btn-start-stop');
    this.btnHorn = document.getElementById('btn-horn');
    this.btnLight = document.getElementById('btn-light');

    // Left-side Camera HUD Buttons
    this.btnZoomIn = document.getElementById('btn-zoom-in');
    this.btnZoomOut = document.getElementById('btn-zoom-out');
    this.btnRecenter = document.getElementById('btn-recenter');

    // Top HUD
    this.btnDayNight = document.getElementById('btn-day-night');
    this.btnRain = document.getElementById('btn-rain');
    this.speedDisplay = document.getElementById('speed-gauge-val');

    this.bindActionButtons();
    this.bindDraggableDock();
    this.bindCameraButtons();
    this.bindWeatherButtons();

    // Restore saved dock coordinates if previously positioned
    this.restoreDockPosition();
  }

  bindActionButtons() {
    // 1. START / STOP Button
    const handleStartStop = (e) => {
      if (this.isDraggingDock) return;
      e.preventDefault();
      TrainAudio.ensureContext();
      const isRunning = this.physics.toggleStartStop();
      this.updateStartStopUI(isRunning);
    };
    this.btnStartStop.addEventListener('click', handleStartStop);

    // 2. HORN Button (Hold to sound, release to stop)
    const startHorn = (e) => {
      if (this.isDraggingDock) return;
      e.preventDefault();
      TrainAudio.ensureContext();
      TrainAudio.startHorn();
      this.btnHorn.classList.add('active');
    };
    const stopHorn = (e) => {
      e.preventDefault();
      TrainAudio.stopHorn();
      this.btnHorn.classList.remove('active');
    };

    this.btnHorn.addEventListener('mousedown', startHorn);
    this.btnHorn.addEventListener('mouseup', stopHorn);
    this.btnHorn.addEventListener('mouseleave', stopHorn);
    this.btnHorn.addEventListener('touchstart', startHorn, { passive: false });
    this.btnHorn.addEventListener('touchend', stopHorn, { passive: false });
    this.btnHorn.addEventListener('touchcancel', stopHorn, { passive: false });

    // 3. LIGHT Button
    const handleLight = (e) => {
      if (this.isDraggingDock) return;
      e.preventDefault();
      TrainAudio.ensureContext();
      const on = this.train.toggleLights();
      this.updateLightUI(on);
    };
    this.btnLight.addEventListener('click', handleLight);
  }

  updateStartStopUI(isRunning) {
    if (isRunning) {
      this.btnStartStop.classList.add('running');
      this.btnStartStop.querySelector('.btn-label').textContent = 'STOP';
      this.btnStartStop.querySelector('.btn-sub').textContent = 'Brakes / Coast';
      this.btnStartStop.querySelector('.btn-icon').textContent = '⏹';
    } else {
      this.btnStartStop.classList.remove('running');
      this.btnStartStop.querySelector('.btn-label').textContent = 'START';
      this.btnStartStop.querySelector('.btn-sub').textContent = 'Throttle / Go';
      this.btnStartStop.querySelector('.btn-icon').textContent = '▶';
    }
  }

  updateLightUI(on) {
    if (on) {
      this.btnLight.classList.add('active');
      this.btnLight.querySelector('.btn-sub').textContent = 'Headlight ON';
    } else {
      this.btnLight.classList.remove('active');
      this.btnLight.querySelector('.btn-sub').textContent = 'Headlight OFF';
    }
  }

  bindDraggableDock() {
    // Long-tap / long-press (500ms) to unlock repositioning of the 3-button dock
    const dock = this.dockElement;

    const onPointerDown = (e) => {
      // Ignore right clicks
      if (e.button && e.button !== 0) return;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      this.longTapTimer = setTimeout(() => {
        // Long-tap detected!
        this.isDraggingDock = true;
        dock.classList.add('dragging-mode');

        const rect = dock.getBoundingClientRect();
        this.dragOffset.x = clientX - rect.left;
        this.dragOffset.y = clientY - rect.top;

        // Vibrate slightly if supported on mobile
        if (navigator.vibrate) navigator.vibrate(45);
      }, 480);
    };

    const onPointerMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      if (!this.isDraggingDock) {
        // If moved more than 8px before timer expires, cancel long tap
        if (this.longTapTimer) {
          clearTimeout(this.longTapTimer);
          this.longTapTimer = null;
        }
        return;
      }

      e.preventDefault();

      // Reposition dock within viewport bounds
      const dockW = dock.offsetWidth;
      const dockH = dock.offsetHeight;
      const minX = 10;
      const maxX = window.innerWidth - dockW - 10;
      const minY = 10;
      const maxY = window.innerHeight - dockH - 10;

      const newLeft = Math.max(minX, Math.min(clientX - this.dragOffset.x, maxX));
      const newTop = Math.max(minY, Math.min(clientY - this.dragOffset.y, maxY));

      dock.style.left = `${newLeft}px`;
      dock.style.top = `${newTop}px`;
      dock.style.bottom = 'auto';
      dock.style.transform = 'none';
    };

    const onPointerUp = () => {
      if (this.longTapTimer) {
        clearTimeout(this.longTapTimer);
        this.longTapTimer = null;
      }

      if (this.isDraggingDock) {
        dock.classList.remove('dragging-mode');
        // Save repositioned coordinates in localStorage
        const pos = {
          left: dock.style.left,
          top: dock.style.top
        };
        try {
          localStorage.setItem('train_dock_pos', JSON.stringify(pos));
        } catch (err) {}

        // Reset dragging flag after a short delay so click doesn't trigger immediately
        setTimeout(() => {
          this.isDraggingDock = false;
        }, 100);
      }
    };

    // Listen on dock for pointer & touch
    dock.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    dock.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
    window.addEventListener('touchcancel', onPointerUp);
  }

  restoreDockPosition() {
    try {
      const saved = localStorage.getItem('train_dock_pos');
      if (saved) {
        const pos = JSON.parse(saved);
        if (pos.left && pos.top) {
          this.dockElement.style.left = pos.left;
          this.dockElement.style.top = pos.top;
          this.dockElement.style.bottom = 'auto';
          this.dockElement.style.transform = 'none';
        }
      }
    } catch (e) {}
  }

  bindCameraButtons() {
    // Zoom In
    this.btnZoomIn.addEventListener('click', () => {
      this.orbitRadius = Math.max(this.orbitRadius - 3.5, GAME_CONFIG.camera.minDistance);
    });

    // Zoom Out
    this.btnZoomOut.addEventListener('click', () => {
      this.orbitRadius = Math.min(this.orbitRadius + 4.5, GAME_CONFIG.camera.maxDistance);
    });

    // Recenter Camera Focus
    this.btnRecenter.addEventListener('click', () => {
      this.orbitRadius = GAME_CONFIG.camera.defaultDistance;
      this.orbitTheta = GAME_CONFIG.camera.defaultYaw;
      this.orbitPhi = Math.PI * 0.5 - GAME_CONFIG.camera.defaultPitch;
    });
  }

  bindWeatherButtons() {
    // Day / Night Toggle
    this.btnDayNight.addEventListener('click', () => {
      const isNight = this.weather.toggleDayNight();
      this.env.setNight(isNight);

      // In night mode, train headlight turns on automatically
      if (isNight) {
        this.train.setLights(true);
        this.updateLightUI(true);
      }

      this.btnDayNight.querySelector('.hud-val').textContent = isNight ? 'Moonlit Night' : 'Day';
      this.btnDayNight.querySelector('.hud-icon').textContent = isNight ? '🌙' : '☀️';
    });

    // Rain Toggle
    this.btnRain.addEventListener('click', () => {
      const isRaining = this.weather.toggleRain();
      this.btnRain.classList.toggle('active', isRaining);
      this.btnRain.querySelector('.hud-val').textContent = isRaining ? 'Rain: ON' : 'Rain: OFF';
      this.btnRain.querySelector('.hud-icon').textContent = isRaining ? '🌧️' : '☁️';
    });
  }

  initCameraControls() {
    const el = this.domElement;

    // Mouse Drag for 360° Orbit Rotation
    el.addEventListener('mousedown', (e) => {
      if (e.target !== el && e.target.tagName !== 'CANVAS') return;
      this.isPointerDown = true;
      this.previousPointerPos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPointerDown) return;
      const dx = e.clientX - this.previousPointerPos.x;
      const dy = e.clientY - this.previousPointerPos.y;

      this.orbitTheta -= dx * 0.007; // 360 degree horizontal orbit
      this.orbitPhi -= dy * 0.005;   // Vertical pitch
      // Clamp pitch to avoid gimbal flip or underground views
      this.orbitPhi = Math.max(0.12, Math.min(Math.PI * 0.48, this.orbitPhi));

      this.previousPointerPos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isPointerDown = false;
    });

    // Mouse Wheel Zoom
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY * 0.04;
      this.orbitRadius = Math.max(
        GAME_CONFIG.camera.minDistance,
        Math.min(GAME_CONFIG.camera.maxDistance, this.orbitRadius + zoomFactor)
      );
    }, { passive: false });

    // Touch Support: Orbit & Two-finger Pinch-to-Zoom
    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isPointerDown = true;
        this.isPinching = false;
        this.previousPointerPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        this.isPointerDown = false;
        this.isPinching = true;
        this.pinchStartDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
      if (this.isPointerDown && e.touches.length === 1) {
        const dx = e.touches[0].clientX - this.previousPointerPos.x;
        const dy = e.touches[0].clientY - this.previousPointerPos.y;

        this.orbitTheta -= dx * 0.007;
        this.orbitPhi -= dy * 0.005;
        this.orbitPhi = Math.max(0.12, Math.min(Math.PI * 0.48, this.orbitPhi));

        this.previousPointerPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (this.isPinching && e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const diff = (this.pinchStartDistance - dist) * 0.08;
        this.orbitRadius = Math.max(
          GAME_CONFIG.camera.minDistance,
          Math.min(GAME_CONFIG.camera.maxDistance, this.orbitRadius + diff)
        );
        this.pinchStartDistance = dist;
      }
    }, { passive: true });

    el.addEventListener('touchend', () => {
      this.isPointerDown = false;
      this.isPinching = false;
    });
  }

  initKeyboardControls() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'Space') {
        e.preventDefault();
        TrainAudio.ensureContext();
        const isRunning = this.physics.toggleStartStop();
        this.updateStartStopUI(isRunning);
      } else if (e.code === 'KeyH') {
        TrainAudio.ensureContext();
        TrainAudio.startHorn();
        this.btnHorn.classList.add('active');
      } else if (e.code === 'KeyL') {
        const on = this.train.toggleLights();
        this.updateLightUI(on);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyH') {
        TrainAudio.stopHorn();
        this.btnHorn.classList.remove('active');
      }
    });
  }

  update(dt) {
    // Camera smoothly follows train locomotive position
    const trainPos = this.physics.currentPosition;
    // Look-at point slightly above track level (locomotive center of mass)
    this.targetPos.lerp(new THREE.Vector3(trainPos.x, trainPos.y + 2.2, trainPos.z), 0.12);

    // Calculate spherical camera position relative to target
    const sinPhi = Math.sin(this.orbitPhi);
    const cosPhi = Math.cos(this.orbitPhi);
    const sinTheta = Math.sin(this.orbitTheta);
    const cosTheta = Math.cos(this.orbitTheta);

    const camX = this.targetPos.x + this.orbitRadius * sinPhi * sinTheta;
    const camY = this.targetPos.y + this.orbitRadius * cosPhi;
    const camZ = this.targetPos.z + this.orbitRadius * sinPhi * cosTheta;

    this.camera.position.set(camX, Math.max(0.6, camY), camZ);
    this.camera.lookAt(this.targetPos);

    // Update speedometer readout
    if (this.speedDisplay) {
      this.speedDisplay.textContent = this.physics.getSpeedKmh();
    }
  }
}

window.GameControls = GameControls;
