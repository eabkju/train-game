// controls.js - Complete Zero-GC Camera Orbit, Multi-Angle Views, Long-Tap Draggable Dock & UI Controls
class GameControls {
    constructor(camera, domElement, locomotive, trainPhysics, weatherManager, envManager, audioManager, onPerfModeChange) {
        this.camera = camera;
        this.domElement = domElement;
        this.locomotive = locomotive;
        this.trainPhysics = trainPhysics;
        this.weatherManager = weatherManager;
        this.envManager = envManager;
        this.audioManager = audioManager;
        this.onPerfModeChange = onPerfModeChange;

        // Camera Modes: 0 = Orbit Chase, 1 = Cab POV, 2 = Trackside Flyby, 3 = Drone Overview
        this.cameraModes = ['🎥 Chase', '🚂 Deck POV', '🎬 Trackside', '🦅 Drone'];
        this.camModeIdx = 0;
        this._lastFov = 52;
        this.tracksideAnchor = new THREE.Vector3(40, 4.5, 60);
        this.tracksideTimer = 0;

        // Orbit Camera State
        this.distance = GAME_CONFIG.camera.defaultDistance;
        this.targetDistance = GAME_CONFIG.camera.defaultDistance;
        this.pitch = GAME_CONFIG.camera.defaultPitch;
        this.yaw = GAME_CONFIG.camera.defaultYaw;

        // Pre-allocated Scratchpad Vectors (Zero GC allocations per frame!)
        this.targetLookAt = new THREE.Vector3();
        this.currentLookAt = new THREE.Vector3();
        this._tmpVec = new THREE.Vector3();
        this.cameraMovedRecently = true;

        // Pointer & Pinch Zoom State
        this.pointers = {};
        this.lastPinchDist = 0;

        // Speedometer DOM caching (only update DOM when integer km/h changes)
        this.speedValEl = document.getElementById('speed-gauge-val');
        this.lastDisplayedKmh = -1;

        this._initOrbitPointerListeners();
        this._initKeyboardListeners();
        this._initHUDButtons();
        this._initDraggableDock();
    }

    _initOrbitPointerListeners() {
        this.domElement.addEventListener('pointerdown', (e) => {
            this.domElement.setPointerCapture(e.pointerId);
            this.pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
            this.lastPinchDist = 0;
            this.cameraMovedRecently = true;
        });

        this.domElement.addEventListener('pointermove', (e) => {
            const p = this.pointers[e.pointerId];
            if (!p) return;

            const ids = Object.keys(this.pointers);
            if (ids.length === 2) {
                this.pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
                const a = this.pointers[ids[0]];
                const b = this.pointers[ids[1]];
                const dist = Math.hypot(a.x - b.x, a.y - b.y);
                if (this.lastPinchDist > 0 && dist > 0) {
                    this.zoom(this.lastPinchDist / dist);
                }
                this.lastPinchDist = dist;
                this.cameraMovedRecently = true;
                return;
            }

            const dx = e.clientX - p.x;
            const dy = e.clientY - p.y;
            p.x = e.clientX;
            p.y = e.clientY;

            this.yaw -= dx * 0.006;
            this.pitch = Math.max(0.06, Math.min(Math.PI * 0.46, this.pitch + dy * 0.006));
            this.cameraMovedRecently = true;
        });

        const endPtr = (e) => {
            delete this.pointers[e.pointerId];
            this.lastPinchDist = 0;
        };
        this.domElement.addEventListener('pointerup', endPtr);
        this.domElement.addEventListener('pointercancel', endPtr);

        this.domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.zoom(Math.exp(e.deltaY * 0.0012));
        }, { passive: false });
    }

    zoom(factor) {
        this.targetDistance = Math.max(
            GAME_CONFIG.camera.minDistance,
            Math.min(GAME_CONFIG.camera.maxDistance, this.targetDistance * factor)
        );
        this.cameraMovedRecently = true;
    }

    recenter() {
        this.camModeIdx = 0;
        document.body.classList.remove('deck-view');
        this.targetDistance = GAME_CONFIG.camera.defaultDistance;
        this.pitch = GAME_CONFIG.camera.defaultPitch;
        this.yaw = GAME_CONFIG.camera.defaultYaw;
        this.cameraMovedRecently = true;
        const btnCam = document.getElementById('btn-cam-mode');
        if (btnCam) btnCam.querySelector('.hud-val').textContent = this.cameraModes[0];
    }

    cycleCameraMode() {
        this.camModeIdx = (this.camModeIdx + 1) % this.cameraModes.length;
        this.tracksideTimer = 999; // Force fresh trackside placement
        document.body.classList.toggle('deck-view', this.camModeIdx === 1);
        if (this.camModeIdx === 1) { // fresh forward-facing deck look
            this.yaw = GAME_CONFIG.camera.defaultYaw;
            this.pitch = GAME_CONFIG.camera.defaultPitch;
        }
        this.cameraMovedRecently = true;
        const btnCam = document.getElementById('btn-cam-mode');
        if (btnCam) btnCam.querySelector('.hud-val').textContent = this.cameraModes[this.camModeIdx];
    }

    _initHUDButtons() {
        // 1. Start / Stop Controller
        const btnStartStop = document.getElementById('btn-start-stop');
        if (btnStartStop) {
            btnStartStop.addEventListener('click', () => this.toggleStartStop());
        }

        // 2. Horn Controller (Press & Hold)
        const btnHorn = document.getElementById('btn-horn');
        if (btnHorn) {
            const startH = (e) => {
                e.preventDefault();
                btnHorn.classList.add('active');
                if (this.audioManager) this.audioManager.startHorn();
            };
            const stopH = () => {
                btnHorn.classList.remove('active');
                if (this.audioManager) this.audioManager.stopHorn();
            };
            btnHorn.addEventListener('pointerdown', startH);
            btnHorn.addEventListener('pointerup', stopH);
            btnHorn.addEventListener('pointerleave', stopH);
            btnHorn.addEventListener('pointercancel', stopH);
        }

        // 3. Light Controller
        const btnLight = document.getElementById('btn-light');
        if (btnLight) {
            btnLight.addEventListener('click', () => this.toggleLights());
        }

        // 4. Throttle Slider
        const throttleSlider = document.getElementById('throttle-slider');
        if (throttleSlider) {
            throttleSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value) / 100;
                this.trainPhysics.setThrottleFraction(val);
            });
        }

        // 5. Day / Sunset / Night Cycle Button
        const btnDayNight = document.getElementById('btn-day-night');
        if (btnDayNight) {
            btnDayNight.addEventListener('click', () => {
                const preset = this.weatherManager.cycleTimeOfDay();
                btnDayNight.querySelector('.hud-icon').textContent = preset.icon;
                btnDayNight.querySelector('.hud-val').textContent = preset.name;
                btnDayNight.classList.toggle('active', preset.name !== 'Day');
                this.cameraMovedRecently = true;
            });
        }

        // 6. Rain Toggle Button
        const btnRain = document.getElementById('btn-rain');
        if (btnRain) {
            btnRain.addEventListener('click', () => {
                const raining = this.weatherManager.toggleRain();
                btnRain.querySelector('.hud-val').textContent = raining ? 'Rain: ON' : 'Rain: OFF';
                btnRain.classList.toggle('active', raining);
                if (this.audioManager) this.audioManager.setRainSound(raining);
                this.cameraMovedRecently = true;
            });
        }

        // 7. Camera Mode Button
        const btnCamMode = document.getElementById('btn-cam-mode');
        if (btnCamMode) {
            btnCamMode.addEventListener('click', () => this.cycleCameraMode());
        }

        // 8. CPU Eco / FPS Mode Button
        const btnEco = document.getElementById('btn-eco-mode');
        if (btnEco && this.onPerfModeChange) {
            btnEco.addEventListener('click', () => {
                const mode = this.onPerfModeChange();
                btnEco.querySelector('.hud-val').textContent = mode.label;
                btnEco.classList.toggle('eco-active', mode.id !== 'max');
                this.cameraMovedRecently = true;
            });
        }

        // 9. Audio Mute Button
        const btnMute = document.getElementById('btn-mute');
        if (btnMute && this.audioManager) {
            btnMute.addEventListener('click', () => {
                const muted = this.audioManager.toggleMute();
                btnMute.querySelector('.hud-icon').textContent = muted ? '🔇' : '🔊';
                btnMute.classList.toggle('active', muted);
            });
        }

        // 10. Left Camera HUD (+, -, Recenter)
        const btnZoomIn = document.getElementById('btn-zoom-in');
        const btnZoomOut = document.getElementById('btn-zoom-out');
        const btnRecenter = document.getElementById('btn-recenter');
        if (btnZoomIn) btnZoomIn.addEventListener('click', () => this.zoom(0.75));
        if (btnZoomOut) btnZoomOut.addEventListener('click', () => this.zoom(1.33));
        if (btnRecenter) btnRecenter.addEventListener('click', () => this.recenter());
    }

    toggleStartStop() {
        const nextState = !this.trainPhysics.isRunning;
        this.trainPhysics.setRunning(nextState);

        if (this.audioManager) {
            if (nextState) this.audioManager.startEngine();
            else this.audioManager.stopEngine();
        }

        const btn = document.getElementById('btn-start-stop');
        if (btn) {
            btn.classList.toggle('running', nextState);
            btn.querySelector('.btn-icon').textContent = nextState ? '⏹' : '▶';
            btn.querySelector('.btn-label').textContent = nextState ? 'STOP' : 'START';
            btn.querySelector('.btn-sub').textContent = nextState ? 'Apply Brakes' : 'Throttle / Go';
        }
        this.cameraMovedRecently = true;
    }

    toggleLights() {
        const lightsOn = this.locomotive.toggleLights();
        const btn = document.getElementById('btn-light');
        if (btn) {
            btn.classList.toggle('active', lightsOn);
            btn.querySelector('.btn-sub').textContent = lightsOn ? 'Lights ON' : 'Lights OFF';
        }
        this.cameraMovedRecently = true;
    }

    _initKeyboardListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            if (e.code === 'Space') {
                e.preventDefault();
                this.toggleStartStop();
            } else if (e.code === 'KeyH') {
                const btnHorn = document.getElementById('btn-horn');
                if (btnHorn) btnHorn.classList.add('active');
                if (this.audioManager) this.audioManager.startHorn();
            } else if (e.code === 'KeyL') {
                this.toggleLights();
            } else if (e.code === 'KeyC') {
                this.cycleCameraMode();
            } else if (e.code === 'KeyR') {
                const btnRain = document.getElementById('btn-rain');
                if (btnRain) btnRain.click();
            } else if (e.code === 'KeyN') {
                const btnDayNight = document.getElementById('btn-day-night');
                if (btnDayNight) btnDayNight.click();
            } else if (e.key === '+' || e.key === '=') {
                this.zoom(0.8);
            } else if (e.key === '-' || e.key === '_') {
                this.zoom(1.25);
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'KeyH') {
                const btnHorn = document.getElementById('btn-horn');
                if (btnHorn) btnHorn.classList.remove('active');
                if (this.audioManager) this.audioManager.stopHorn();
            }
        });
    }

    // Long-Tap (500ms) Repositionable Controls Dock with localStorage Persistence
    _initDraggableDock() {
        const dock = document.getElementById('train-controls-dock');
        if (!dock) return;

        try {
            const saved = localStorage.getItem('train_dock_pos_v2');
            if (saved) {
                const { left, top } = JSON.parse(saved);
                dock.style.left = left + 'px';
                dock.style.top = top + 'px';
                dock.style.bottom = 'auto';
                dock.style.transform = 'none';
            }
        } catch (err) {}

        let holdTimer = null;
        let isDragging = false;
        let startX = 0, startY = 0, origLeft = 0, origTop = 0;

        dock.addEventListener('pointerdown', (e) => {
            if (e.target.closest('input')) return;
            startX = e.clientX;
            startY = e.clientY;
            const rect = dock.getBoundingClientRect();
            origLeft = rect.left;
            origTop = rect.top;

            holdTimer = setTimeout(() => {
                isDragging = true;
                dock.classList.add('dragging-mode');
                dock.style.left = origLeft + 'px';
                dock.style.top = origTop + 'px';
                dock.style.bottom = 'auto';
                dock.style.transform = 'none';
            }, 500);
        });

        window.addEventListener('pointermove', (e) => {
            if (!isDragging && holdTimer) {
                if (Math.hypot(e.clientX - startX, e.clientY - startY) > 10) {
                    clearTimeout(holdTimer);
                    holdTimer = null;
                }
                return;
            }
            if (!isDragging) return;

            const nx = Math.max(8, Math.min(window.innerWidth - dock.offsetWidth - 8, origLeft + (e.clientX - startX)));
            const ny = Math.max(8, Math.min(window.innerHeight - dock.offsetHeight - 8, origTop + (e.clientY - startY)));
            dock.style.left = nx + 'px';
            dock.style.top = ny + 'px';
        });

        const endDockDrag = () => {
            if (holdTimer) {
                clearTimeout(holdTimer);
                holdTimer = null;
            }
            if (isDragging) {
                isDragging = false;
                dock.classList.remove('dragging-mode');
                try {
                    const rect = dock.getBoundingClientRect();
                    localStorage.setItem('train_dock_pos_v2', JSON.stringify({ left: rect.left, top: rect.top }));
                } catch (err) {}
            }
        };
        window.addEventListener('pointerup', endDockDrag);
        window.addEventListener('pointercancel', endDockDrag);
    }

    _applyFov(target) {
        const cam = this.camera;
        cam.fov += (target - cam.fov) * 0.08;
        if (Math.abs(cam.fov - this._lastFov) > 0.08) {
            this._lastFov = cam.fov;
            cam.updateProjectionMatrix();
        }
    }

    update(dt) {
        // Update Speedometer DOM only when integer value changes
        const kmh = this.trainPhysics.getKmh();
        if (kmh !== this.lastDisplayedKmh && this.speedValEl) {
            this.lastDisplayedKmh = kmh;
            this.speedValEl.textContent = kmh;
        }

        // Update Audio Engine RPM
        if (this.audioManager) {
            this.audioManager.updateRPM(this.trainPhysics.getSpeedRatio(), this.trainPhysics.isRunning);
        }

        const trainPos = this.trainPhysics.currentPosition;
        const trainTan = this.trainPhysics.currentTangent;

        // Mode 1: Front-deck driver POV (eye above the hood nose, sees track ahead)
        if (this.camModeIdx === 1) {
            const tx = trainTan.x, tz = trainTan.z;
            const h = Math.hypot(tx, tz) || 1;
            const fx = tx / h, fz = tz / h;           // horizontal forward
            const slope = trainTan.y / h;              // rise per metre
            const sp = this.trainPhysics.getSpeedRatio();
            const t = performance.now() * 0.001;
            const vib = sp * 0.014;                    // rail vibration, scales with speed
            const sway = Math.sin(t * 7.3) * 0.012 * sp;
            const EYE_Z = 3.2, EYE_Y = 4.0;            // local metres on the locomotive
            this.camera.position.set(
                trainPos.x + fx * EYE_Z + fz * sway,
                trainPos.y + EYE_Y + slope * EYE_Z + (Math.sin(t * 41) + 0.6 * Math.sin(t * 23.7)) * vib,
                trainPos.z + fz * EYE_Z - fx * sway
            );
            // Drag = look around (yaw capped to +/-100 deg, pitch to +/-0.45 rad)
            const a = Math.max(-1.75, Math.min(1.75, this.yaw - GAME_CONFIG.camera.defaultYaw));
            const lp = Math.max(-0.45, Math.min(0.45, (this.pitch - GAME_CONFIG.camera.defaultPitch) * 0.9));
            const ca = Math.cos(a), sa = Math.sin(a);
            this.targetLookAt.set(
                this.camera.position.x + (fx * ca + fz * sa) * 40.0,
                this.camera.position.y + slope * 40.0 + lp * 40.0 - 0.9,
                this.camera.position.z + (-fx * sa + fz * ca) * 40.0
            );
            this.camera.lookAt(this.targetLookAt);
            this._applyFov(52 + sp * 8.0);
            return;
        }
        this._applyFov(52 + this.trainPhysics.getSpeedRatio() * 5.0);

        // Mode 2: Cinematic Trackside Fly-by Camera
        if (this.camModeIdx === 2) {
            this.tracksideTimer += dt;
            const distSq = this.camera.position.distanceToSquared(trainPos);
            if (distSq > 16000 || this.tracksideTimer > 9.0) {
                this.tracksideTimer = 0;
                const aheadU = (this.trainPhysics.progress + 0.025) % 1.0;
                this.trainPhysics.trackSystem.samplePoint(aheadU, this.tracksideAnchor);
                this.trainPhysics.trackSystem.sampleTangent(aheadU, this._tmpVec);
                this.camera.position.set(
                    this.tracksideAnchor.x - this._tmpVec.z * 11.5,
                    this.tracksideAnchor.y + 3.2,
                    this.tracksideAnchor.z + this._tmpVec.x * 11.5
                );
            }
            this.targetLookAt.set(trainPos.x, trainPos.y + 2.2, trainPos.z);
            this.camera.lookAt(this.targetLookAt);
            return;
        }

        // Mode 3: High-Altitude Drone View
        if (this.camModeIdx === 3) {
            this.targetLookAt.set(trainPos.x, trainPos.y + 2.0, trainPos.z);
            this.currentLookAt.lerp(this.targetLookAt, Math.min(1.0, dt * 8.0));
            this.camera.position.set(
                this.currentLookAt.x - trainTan.x * 65,
                this.currentLookAt.y + 95,
                this.currentLookAt.z - trainTan.z * 65
            );
            this.camera.lookAt(this.currentLookAt);
            return;
        }

        // Mode 0: Smooth 360° Orbit Chase Camera (Zero-allocation math)
        const dDiff = this.targetDistance - this.distance;
        if (Math.abs(dDiff) > 0.01) {
            this.distance += dDiff * (1.0 - Math.exp(-dt * 8.0));
            this.cameraMovedRecently = true;
        } else {
            this.distance = this.targetDistance;
        }

        this.targetLookAt.set(trainPos.x, trainPos.y + 2.2, trainPos.z);
        if (this.currentLookAt.lengthSq() === 0) {
            this.currentLookAt.copy(this.targetLookAt);
        } else {
            this.currentLookAt.lerp(this.targetLookAt, Math.min(1.0, dt * 12.0));
        }

        const cosPitch = Math.cos(this.pitch);
        const cx = this.currentLookAt.x + this.distance * Math.sin(this.yaw) * cosPitch;
        const cy = this.currentLookAt.y + this.distance * Math.sin(this.pitch);
        const cz = this.currentLookAt.z + this.distance * Math.cos(this.yaw) * cosPitch;

        this.camera.position.set(cx, cy, cz);
        this.camera.lookAt(this.currentLookAt);
    }
}
