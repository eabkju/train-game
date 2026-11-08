// train.js - Lightweight, Fluent 3D Diesel Locomotive & 5 Attached Passenger Carriages
// Engineered with low-poly geometries and MeshLambertMaterial for instant loading and zero browser lag
class TrainLocomotive {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;

    this.root = new THREE.Group();
    this.scene.add(this.root);

    // Locomotive Group
    this.bodyGroup = new THREE.Group();
    this.root.add(this.bodyGroup);

    // Locomotive Bogies & Wheels
    this.frontBogie = null;
    this.rearBogie = null;
    this.wheelMeshes = [];

    // Master Lighting
    this.lightsOn = false;
    this.headlight = null;
    this.headlightLens = null;
    this.locoCabinLight = null;

    // 5 Attached Passenger Carriages
    this.carriages = [];
    this.carriageCabinLights = [];
    this.carriageWindowMeshes = [];

    // Pre-allocated scratchpad vectors (Zero-GC optimization)
    this._fTan = new THREE.Vector3();
    this._rTan = new THREE.Vector3();

    this.buildLocomotive();
    this.buildCarriages();
    this.setLights(false);
  }

  buildLocomotive() {
    const L = GAME_CONFIG.train.length; // 12.0m
    const W = GAME_CONFIG.train.width;  // 3.1m

    // Fast, lightweight materials (MeshLambertMaterial: zero PBR fragment overhead)
    const bodyMat = new THREE.MeshLambertMaterial({ color: GAME_CONFIG.colors.trainBody });
    const stripeMat = new THREE.MeshLambertMaterial({ color: GAME_CONFIG.colors.trainStripe });
    const deckMat = new THREE.MeshLambertMaterial({ color: GAME_CONFIG.colors.trainFrame });
    const roofMat = new THREE.MeshLambertMaterial({ color: GAME_CONFIG.colors.trainRoof });
    const bufferMat = new THREE.MeshLambertMaterial({ color: GAME_CONFIG.colors.trainBuffersRed });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

    // 1. Main Chassis Deck
    const deck = new THREE.Mesh(new THREE.BoxGeometry(W, 0.4, L), deckMat);
    deck.position.y = 1.35;
    this.bodyGroup.add(deck);

    // Side Sills (Yellow warning stripes along deck)
    [-W * 0.5 - 0.02, W * 0.5 + 0.02].forEach(x => {
      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, L), stripeMat);
      sill.position.set(x, 1.35, 0);
      this.bodyGroup.add(sill);
    });

    // Front Pilot / Cowcatcher Buffer Beam
    const frontPilot = new THREE.Mesh(new THREE.BoxGeometry(W, 0.7, 0.22), bufferMat);
    frontPilot.position.set(0, 0.95, L * 0.5 + 0.11);
    this.bodyGroup.add(frontPilot);

    // Front Coupler
    const coupler = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.45), darkMat);
    coupler.position.set(0, 0.95, L * 0.5 + 0.4);
    this.bodyGroup.add(coupler);

    // 2. Long Hood (Engine Compartment)
    const hoodL = 7.6, hoodW = 2.65, hoodH = 2.1;
    const hoodZ = 0.9;
    const hood = new THREE.Mesh(new THREE.BoxGeometry(hoodW, hoodH, hoodL), bodyMat);
    hood.position.set(0, 2.6, hoodZ);
    this.bodyGroup.add(hood);

    // Hood side stripes
    [-hoodW * 0.5 - 0.02, hoodW * 0.5 + 0.02].forEach(x => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.32, hoodL), stripeMat);
      s.position.set(x, 2.9, hoodZ);
      this.bodyGroup.add(s);
    });

    // 3. Driver Cab (Sleek, integrated cab structure - no unnatural roof add-ons)
    const cabL = 3.2, cabW = 2.9, cabH = 2.5;
    const cabZ = -3.7;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(cabW, cabH, cabL), bodyMat);
    cab.position.set(0, 2.8, cabZ);
    this.bodyGroup.add(cab);

    // Cab Windows (Front & sides)
    const winMat = new THREE.MeshLambertMaterial({
      color: 0x7a93a8,
      emissive: 0x1b2836,
      emissiveIntensity: 0.2
    });

    [-0.65, 0.65].forEach(x => {
      const fWin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.04), winMat);
      fWin.position.set(x, 3.3, cabZ + cabL * 0.5 + 0.02);
      this.bodyGroup.add(fWin);
    });

    [-cabW * 0.5 - 0.02, cabW * 0.5 + 0.02].forEach(x => {
      const sWin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.65, 1.4), winMat);
      sWin.position.set(x, 3.3, cabZ);
      this.bodyGroup.add(sWin);
    });

    // 4. Locomotive Headlight (Forward SpotLight)
    const hlHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.28, 10), darkMat);
    hlHousing.rotateX(Math.PI * 0.5);
    hlHousing.position.set(0, 3.65, hoodZ + hoodL * 0.5 + 0.14);
    this.bodyGroup.add(hlHousing);

    this.headlightLens = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 8),
      new THREE.MeshLambertMaterial({
        color: 0xffffff,
        emissive: 0xfffae6,
        emissiveIntensity: 0.0
      })
    );
    this.headlightLens.position.set(0, 3.65, hoodZ + hoodL * 0.5 + 0.28);
    this.bodyGroup.add(this.headlightLens);

    this.headlight = new THREE.SpotLight(0xfffae6, 0.0, 90, 0.45, 0.35, 1.2);
    this.headlight.position.set(0, 3.65, hoodZ + hoodL * 0.5 + 0.3);
    const targetObj = new THREE.Object3D();
    targetObj.position.set(0, 1.0, hoodZ + hoodL * 0.5 + 40);
    this.bodyGroup.add(targetObj);
    this.headlight.target = targetObj;
    this.bodyGroup.add(this.headlight);

    // Warm cab interior light
    this.locoCabinLight = new THREE.PointLight(0xffdf88, 0.0, 8, 1.5);
    this.locoCabinLight.position.set(0, 3.4, cabZ);
    this.bodyGroup.add(this.locoCabinLight);

    // 5. Articulated Locomotive Bogies
    this.frontBogie = this.createBogie();
    this.rearBogie = this.createBogie();
    this.root.add(this.frontBogie);
    this.root.add(this.rearBogie);
  }

  buildCarriages() {
    const coachCount = GAME_CONFIG.train.carriageCount || 5;
    const L = GAME_CONFIG.train.carriageLength || 11.2;
    const W = GAME_CONFIG.train.carriageWidth || 2.85;
    const H = 2.6; // Full authentic coach body height with clean, seamless integrated roof

    const coachBodyMat = new THREE.MeshLambertMaterial({ color: GAME_CONFIG.colors.coachBody || 0x1d2c3c });
    const stripeMat = new THREE.MeshLambertMaterial({ color: GAME_CONFIG.colors.trainStripe });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x16181b });

    for (let i = 0; i < coachCount; i++) {
      const carGroup = new THREE.Group();
      this.root.add(carGroup);

      // 1. Carriage Main Body (Smooth, integrated roof - no unnatural tubes or roof add-ons)
      const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, L), coachBodyMat);
      body.position.y = 2.5;
      carGroup.add(body);

      // Understated champagne gold / brass coach waist stripe
      [-W * 0.5 - 0.02, W * 0.5 + 0.02].forEach(x => {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, L), stripeMat);
        stripe.position.set(x, 2.65, 0);
        carGroup.add(stripe);
      });

      // 2. Cabin Windows (Shared material, responsive to Light button)
      const winMat = new THREE.MeshLambertMaterial({
        color: 0xc4cdd6,
        emissive: GAME_CONFIG.colors.coachWindowGlow,
        emissiveIntensity: 0.0
      });

      // Left and right window rows (4 wide bay windows per side - clean, realistic architectural proportions)
      [-W * 0.5 - 0.02, W * 0.5 + 0.02].forEach(x => {
        for (let wz = -3.8; wz <= 3.8; wz += 2.5) {
          const win = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.72, 1.4), winMat);
          win.position.set(x, 2.65, wz);
          carGroup.add(win);
          this.carriageWindowMeshes.push(win);
        }
      });

      // 4. Warm Interior Cabin Light
      const cabinLight = new THREE.PointLight(GAME_CONFIG.colors.coachWindowGlow, 0.0, 10, 1.6);
      cabinLight.position.set(0, 2.65, 0);
      carGroup.add(cabinLight);
      this.carriageCabinLights.push(cabinLight);

      // 5. Gangway flexible bellows between cars
      const bellows = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.1, 0.5), darkMat);
      bellows.position.set(0, 2.35, L * 0.5 + 0.25);
      carGroup.add(bellows);

      // 6. Articulated Carriage Bogies
      const frontBogie = this.createBogie();
      const rearBogie = this.createBogie();
      this.root.add(frontBogie);
      this.root.add(rearBogie);

      this.carriages.push({
        group: carGroup,
        frontBogie: frontBogie,
        rearBogie: rearBogie
      });
    }
  }

  // Creates a fast, low-poly 2-axle bogie with rotating wheels
  createBogie() {
    const bogieGroup = new THREE.Group();
    const frameMat = new THREE.MeshLambertMaterial({ color: GAME_CONFIG.colors.trainBogies });
    const wheelMat = new THREE.MeshLambertMaterial({ color: GAME_CONFIG.colors.trainWheels });

    // Bogie crossbeam chassis
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.24, 2.3), frameMat);
    frame.position.y = 0.65;
    bogieGroup.add(frame);

    // 4 Wheels: 10-sided cylinders (featherweight on mobile & desktop)
    const wheelR = GAME_CONFIG.train.wheelRadius || 0.52;
    const halfGauge = 0.85;
    const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.12, 10);
    wheelGeo.rotateZ(Math.PI * 0.5);

    [-0.8, 0.8].forEach(z => {
      // Axle bar
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, halfGauge * 2, 6), frameMat);
      axle.rotateZ(Math.PI * 0.5);
      axle.position.set(0, 0.55, z);
      bogieGroup.add(axle);

      [-halfGauge, halfGauge].forEach(x => {
        const wheelPivot = new THREE.Group();
        wheelPivot.position.set(x, 0.55, z);
        const wheelMesh = new THREE.Mesh(wheelGeo, wheelMat);
        wheelPivot.add(wheelMesh);
        bogieGroup.add(wheelPivot);
        this.wheelMeshes.push(wheelPivot);
      });
    });

    return bogieGroup;
  }

  toggleLights() {
    this.setLights(!this.lightsOn);
    return this.lightsOn;
  }

  setLights(on) {
    this.lightsOn = on;

    if (this.headlight) {
      this.headlight.intensity = on ? 3.5 : 0.0;
    }
    if (this.headlightLens) {
      this.headlightLens.material.emissiveIntensity = on ? 2.5 : 0.0;
    }
    if (this.locoCabinLight) {
      this.locoCabinLight.intensity = on ? 1.4 : 0.0;
    }

    // Toggle warm cabin lights across all 5 passenger carriages
    this.carriageCabinLights.forEach(light => {
      light.intensity = on ? 1.4 : 0.0;
    });

    this.carriageWindowMeshes.forEach(win => {
      win.material.emissiveIntensity = on ? 1.8 : 0.0;
    });
  }

  update(dt) {
    // 1. Update Lead Locomotive
    const pos = this.physics.currentPosition;
    const tangent = this.physics.currentTangent;

    this.bodyGroup.position.copy(pos);
    this.bodyGroup.rotation.y = Math.atan2(tangent.x, tangent.z);

    const pitch = -Math.atan2(tangent.y, Math.hypot(tangent.x, tangent.z));
    this.bodyGroup.rotation.x = pitch;

    // Locomotive Bogies
    this.frontBogie.position.copy(this.physics.frontBogiePos);
    this.rearBogie.position.copy(this.physics.rearBogiePos);

    const locoHalfBogieNorm = (GAME_CONFIG.train.bogieDistance * 0.5) / this.physics.trackLength;
    const fLocoU = (this.physics.progress + locoHalfBogieNorm + 1.0) % 1.0;
    const rLocoU = (this.physics.progress - locoHalfBogieNorm + 1.0) % 1.0;

    this.physics.trackSpline.getTangentAt(fLocoU, this._fTan);
    this.physics.trackSpline.getTangentAt(rLocoU, this._rTan);

    this.frontBogie.rotation.y = Math.atan2(this._fTan.x, this._fTan.z);
    this.rearBogie.rotation.y = Math.atan2(this._rTan.x, this._rTan.z);

    // 2. Update All 5 Trailing Passenger Carriages along the Spline
    const count = this.carriages.length;
    for (let i = 0; i < count; i++) {
      const car = this.carriages[i];
      const data = this.physics.carriagesData[i];

      // Position carriage body
      car.group.position.copy(data.position);
      car.group.rotation.y = Math.atan2(data.tangent.x, data.tangent.z);

      // Position articulated bogies
      car.frontBogie.position.copy(data.frontBogiePos);
      car.rearBogie.position.copy(data.rearBogiePos);

      car.frontBogie.rotation.y = Math.atan2(data.frontTangent.x, data.frontTangent.z);
      car.rearBogie.rotation.y = Math.atan2(data.rearTangent.x, data.rearTangent.z);
    }

    // 3. Rotate All Wheels (Locomotive + Carriages)
    const rot = this.physics.wheelRotation;
    this.wheelMeshes.forEach(w => {
      w.rotation.x = rot;
    });
  }
}

window.TrainLocomotive = TrainLocomotive;
