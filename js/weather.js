// weather.js - Zero-Shadow-Map Weather & Atmospheric Preset Manager (Day, Golden Sunset, Moonlit Starry Night & Rain)
class WeatherManager {
    constructor(scene, renderer, envManager, villageManager) {
        this.scene = scene;
        this.renderer = renderer;
        this.envManager = envManager;
        this.villageManager = villageManager;

        this.presetOrder = ['day', 'sunset', 'night'];
        this.presetIdx = 0;
        this.isRaining = false;

        this.dirLight = null;
        this.hemiLight = null;
        this.ambientLight = null;
        this.moonMesh = null;
        this.starPoints = null;
        this.starMat = null;

        // Lightweight Rain Particle System
        this.rainParticles = null;
        this.rainCount = 1600;
        this.rainGeo = null;

        this._initLightingAndSky();
        this._initRainParticles();
        this.applyPreset('day');
    }

    _initLightingAndSky() {
        const p = GAME_CONFIG.colors.presets.day;

        // Directional Sun / Moon Light (NO shadow map -> massive GPU/CPU thermal savings!)
        this.dirLight = new THREE.DirectionalLight(p.sunColor, p.sunIntensity);
        this.dirLight.castShadow = false;
        this.scene.add(this.dirLight);

        this.hemiLight = new THREE.HemisphereLight(p.hemiSky, p.hemiGround, p.hemiIntensity);
        this.scene.add(this.hemiLight);

        this.ambientLight = new THREE.AmbientLight(p.ambientColor, p.ambientIntensity);
        this.scene.add(this.ambientLight);

        this.scene.background = new THREE.Color(p.skyHorizon);
        this.scene.fog = new THREE.FogExp2(p.fogColor, p.fogDensity);

        // Glowing Full Moon Orb
        const moonGeo = new THREE.SphereGeometry(28, 16, 16);
        const moonMat = new THREE.MeshBasicMaterial({ color: 0xfefcd6, fog: false });
        this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
        this.moonMesh.position.set(-450, 380, -650);
        this.moonMesh.visible = false;
        this.scene.add(this.moonMesh);

        // Starry Night Sky Dome (600 stars in 1 Points call)
        const starCount = 600;
        const starPos = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(0.15 + Math.random() * 0.85);
            const r = 1600;
            starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
            starPos[i * 3 + 1] = r * Math.cos(phi);
            starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        }
        const starGeo = new THREE.BufferGeometry();
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
        this.starMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 3.5,
            transparent: true,
            opacity: 0.0,
            fog: false
        });
        this.starPoints = new THREE.Points(starGeo, this.starMat);
        this.starPoints.visible = false;
        this.scene.add(this.starPoints);
    }

    _initRainParticles() {
        const positions = new Float32Array(this.rainCount * 3);
        const velocities = new Float32Array(this.rainCount);

        for (let i = 0; i < this.rainCount; i++) {
            positions[i * 3]     = (Math.random() - 0.5) * 180;
            positions[i * 3 + 1] = Math.random() * 65;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 180;
            velocities[i] = 42 + Math.random() * 18;
        }

        this.rainGeo = new THREE.BufferGeometry();
        this.rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.rainGeo.userData = { velocities: velocities };

        const rainMat = new THREE.PointsMaterial({
            color: 0xaed4f7,
            size: 0.42,
            transparent: true,
            opacity: 0.62
        });

        this.rainParticles = new THREE.Points(this.rainGeo, rainMat);
        this.rainParticles.visible = false;
        this.scene.add(this.rainParticles);
    }

    cycleTimeOfDay() {
        this.presetIdx = (this.presetIdx + 1) % this.presetOrder.length;
        const key = this.presetOrder[this.presetIdx];
        return this.applyPreset(key);
    }

    applyPreset(key) {
        const p = GAME_CONFIG.colors.presets[key] || GAME_CONFIG.colors.presets.day;
        this.currentPresetKey = key;

        this.scene.background.setHex(p.skyHorizon);
        this.scene.fog.color.setHex(p.fogColor);
        this.scene.fog.density = this.isRaining ? 0.00105 : p.fogDensity;

        this.dirLight.color.setHex(p.sunColor);
        this.dirLight.intensity = this.isRaining ? p.sunIntensity * 0.55 : p.sunIntensity;
        this.dirLight.position.set(p.sunPos[0], p.sunPos[1], p.sunPos[2]);

        this.hemiLight.color.setHex(p.hemiSky);
        this.hemiLight.groundColor.setHex(p.hemiGround);
        this.hemiLight.intensity = p.hemiIntensity;

        this.ambientLight.color.setHex(p.ambientColor);
        this.ambientLight.intensity = p.ambientIntensity;

        this.moonMesh.visible = p.moonVisible && !this.isRaining;
        this.starPoints.visible = p.starOpacity > 0.05 && !this.isRaining;
        this.starMat.opacity = p.starOpacity;

        if (this.envManager) {
            this.envManager.setNightFactor(p.windowGlow, key !== 'day');
        }

        if (this.villageManager) {
            this.villageManager.onTimeOfDayChange(key);
        }

        return p;
    }

    setVillageManager(vm) {
        this.villageManager = vm;
    }

    toggleRain() {
        this.isRaining = !this.isRaining;
        this.rainParticles.visible = this.isRaining;
        this.applyPreset(this.currentPresetKey || 'day');
        if (this.villageManager) {
            this.villageManager.onRainChange(this.isRaining);
        }
        return this.isRaining;
    }

    update(dt, centerPosition) {
        if (centerPosition && this.starPoints.visible) {
            this.starPoints.position.x = centerPosition.x;
            this.starPoints.position.z = centerPosition.z;
            this.moonMesh.position.set(centerPosition.x - 450, 380, centerPosition.z - 650);
        }

        if (this.isRaining && this.rainParticles && centerPosition) {
            this.rainParticles.position.x = centerPosition.x;
            this.rainParticles.position.z = centerPosition.z;

            const posAttr = this.rainGeo.attributes.position;
            const posArray = posAttr.array;
            const vels = this.rainGeo.userData.velocities;

            for (let i = 0; i < this.rainCount; i++) {
                posArray[i * 3 + 1] -= vels[i] * dt;
                if (posArray[i * 3 + 1] < 0) {
                    posArray[i * 3 + 1] = 60 + (i % 12);
                }
            }
            posAttr.needsUpdate = true;
        }
    }
}
