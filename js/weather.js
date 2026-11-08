// weather.js - Day/Night moonlit sky, lighting transitions & slow natural rain particle system
class WeatherManager {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    this.isNight = false;
    this.isRaining = false;

    // Lighting nodes
    this.sunLight = null;
    this.moonLight = null;
    this.hemiLight = null;

    // Sky & Celestials
    this.skyDome = null;
    this.moonMesh = null;
    this.stars = null;

    // Rain system - tightly centered in nearby train vicinity
    this.rainParticles = null;
    this.rainDropCount = 1800;
    this.rainGeom = null;
    this.rainBoxSize = { x: 120, y: 50, z: 120 };

    this.initLighting();
    this.initSky();
    this.initRain();
    this.applyDayMode();
  }

  initLighting() {
    // Hemispherical ambient sky/ground fill (Balanced, natural light)
    this.hemiLight = new THREE.HemisphereLight(GAME_CONFIG.colors.daySun, 0x384532, 0.52);
    this.hemiLight.position.set(0, 120, 0);
    this.scene.add(this.hemiLight);

    // Directional Sunlight (Day)
    this.sunLight = new THREE.DirectionalLight(GAME_CONFIG.colors.daySun, 1.05);
    this.sunLight.position.set(120, 220, 140);
    this.sunLight.castShadow = false; // Disabled shadow mapping for ultra-smooth 60fps
    this.scene.add(this.sunLight);

    // Directional Moonlight (Night - soft silver-blue light, never pitch black!)
    this.moonLight = new THREE.DirectionalLight(0x9cbbe0, 0.0);
    this.moonLight.position.set(-140, 200, -160);
    this.moonLight.castShadow = false;
    this.scene.add(this.moonLight);

    // Distance fog: Smooth atmospheric horizon, crystal clear near train
    this.scene.fog = new THREE.Fog(0x9fbcd6, 300, 1800);
  }

  initSky() {
    // 1. Sky Dome Hemisphere (Expansive 2500m radius dome)
    const skyGeom = new THREE.SphereGeometry(2500, 32, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      color: GAME_CONFIG.colors.daySky,
      side: THREE.BackSide
    });
    this.skyDome = new THREE.Mesh(skyGeom, skyMat);
    this.scene.add(this.skyDome);

    // 2. Starfield (visible at night)
    const starCount = 1800;
    const starGeom = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 2450;
      // Only place stars above horizon
      const y = Math.abs(r * Math.cos(phi)) + 15;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const z = r * Math.sin(phi) * Math.sin(theta);

      starPositions[i * 3] = x;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = z;
    }
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.8,
      transparent: true,
      opacity: 0.0
    });
    this.stars = new THREE.Points(starGeom, starMat);
    this.scene.add(this.stars);

    // 3. Glowing Full Moon Disc
    const moonGeom = new THREE.SphereGeometry(28, 24, 24);
    const moonMat = new THREE.MeshBasicMaterial({
      color: GAME_CONFIG.colors.moonlitMoon,
      transparent: true,
      opacity: 0.0
    });
    this.moonMesh = new THREE.Mesh(moonGeom, moonMat);
    this.moonMesh.position.set(-320, 420, -380);
    this.scene.add(this.moonMesh);
  }

  initRain() {
    // GPU particle system for slow natural rain streaks
    const count = this.rainDropCount;
    this.rainGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 6); // 2 vertices per line streak

    const bs = this.rainBoxSize;
    const streakLength = 0.95; // Vertical drop length

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * bs.x;
      const y = Math.random() * bs.y;
      const z = (Math.random() - 0.5) * bs.z;

      // Top of streak
      positions[i * 6 + 0] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = z;

      // Bottom of streak (slight natural wind slant)
      positions[i * 6 + 3] = x + 0.06;
      positions[i * 6 + 4] = y - streakLength;
      positions[i * 6 + 5] = z + 0.03;
    }

    this.rainGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const rainMat = new THREE.LineBasicMaterial({
      color: 0xbed6f2,
      transparent: true,
      opacity: 0.0,
      linewidth: 1
    });

    this.rainParticles = new THREE.LineSegments(this.rainGeom, rainMat);
    this.scene.add(this.rainParticles);
  }

  toggleDayNight() {
    this.setNight(!this.isNight);
    return this.isNight;
  }

  setNight(night) {
    this.isNight = night;
    if (this.isNight) {
      this.applyNightMode();
    } else {
      this.applyDayMode();
    }
  }

  applyDayMode() {
    // Soft natural daylight (Premium simulator lighting)
    this.skyDome.material.color.setHex(GAME_CONFIG.colors.daySky);
    this.sunLight.intensity = 1.05;
    this.moonLight.intensity = 0.0;
    this.hemiLight.color.setHex(GAME_CONFIG.colors.daySun);
    this.hemiLight.groundColor.setHex(0x384532);
    this.hemiLight.intensity = 0.52;

    this.stars.material.opacity = 0.0;
    this.moonMesh.material.opacity = 0.0;

    const fogColor = this.isRaining ? 0x8296a8 : 0x9fbcd6;
    this.scene.fog.color.setHex(fogColor);
    this.scene.fog.near = this.isRaining ? 150 : 300;
    this.scene.fog.far = this.isRaining ? 900 : 1800;
  }

  applyNightMode() {
    // Beautiful Moonlit Night (soft natural moonlight, never pitch black)
    this.skyDome.material.color.setHex(GAME_CONFIG.colors.moonlitSky);
    this.sunLight.intensity = 0.0;
    this.moonLight.intensity = 0.65;
    this.hemiLight.color.setHex(0x3a506e);
    this.hemiLight.groundColor.setHex(0x131a24);
    this.hemiLight.intensity = 0.45;

    this.stars.material.opacity = 0.85;
    this.moonMesh.material.opacity = 0.95;

    const fogColor = this.isRaining ? 0x080f1a : 0x0c1626;
    this.scene.fog.color.setHex(fogColor);
    this.scene.fog.near = this.isRaining ? 120 : 250;
    this.scene.fog.far = this.isRaining ? 800 : 1600;
  }

  toggleRain() {
    this.setRain(!this.isRaining);
    return this.isRaining;
  }

  setRain(rain) {
    this.isRaining = rain;
    TrainAudio.setRain(this.isRaining);

    if (this.rainParticles) {
      this.rainParticles.material.opacity = this.isRaining ? 0.65 : 0.0;
    }

    // Refresh fog depth for rain haze
    if (this.isNight) {
      this.applyNightMode();
    } else {
      this.applyDayMode();
    }
  }

  update(dt, targetPosition, camera) {
    // Star twinkle effect
    if (this.isNight && this.stars) {
      this.stars.rotation.y += dt * 0.002;
    }

    // Update slow natural falling raindrops (centered around train)
    if (this.isRaining && this.rainParticles && targetPosition) {
      const posAttr = this.rainGeom.attributes.position;
      const array = posAttr.array;
      const count = this.rainDropCount;
      const bs = this.rainBoxSize;
      const fallSpeed = 16.0; // Slow, natural raindrop fall speed in m/s

      // Center the rain volume over the train / camera location
      this.rainParticles.position.x = targetPosition.x;
      this.rainParticles.position.z = targetPosition.z;

      for (let i = 0; i < count; i++) {
        const idx = i * 6;
        // Fall down
        array[idx + 1] -= fallSpeed * dt;
        array[idx + 4] -= fallSpeed * dt;

        // Reset to top if dropped below ground
        if (array[idx + 4] < 0) {
          const resetY = bs.y + Math.random() * 5.0;
          const rx = (Math.random() - 0.5) * bs.x;
          const rz = (Math.random() - 0.5) * bs.z;

          array[idx + 0] = rx;
          array[idx + 1] = resetY;
          array[idx + 2] = rz;

          array[idx + 3] = rx + 0.06;
          array[idx + 4] = resetY - 0.95;
          array[idx + 5] = rz + 0.03;
        }
      }
      posAttr.needsUpdate = true;
    }
  }
}

window.WeatherManager = WeatherManager;
