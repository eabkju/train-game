// train.js - T3M2M-005 Diesel Locomotive & 5 Attached Passenger Carriages with Articulated Bogies & Cabin Lights
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
    this.headlightTarget = null;
    this.headlightBeam = null;
    this.headlightLens = null;
    this.locoCabinLight = null;

    // 5 Attached Passenger Carriages
    this.carriages = [];
    this.carriageCabinLights = [];
    this.carriageWindowMeshes = [];

    // Pre-allocated scratchpad vectors (Zero-GC optimization from Performance Guide)
    this._fTan = new THREE.Vector3();
    this._rTan = new THREE.Vector3();

    this.buildLocomotive();
    this.buildCarriages();
    this.setLights(false);
  }

  buildLocomotive() {
    this.buildLocoChassis();
    this.buildLongHood();
    this.buildCab();
    this.buildRoofFansAndDetails();
    this.buildSafetyRailingsAndPlates();
    this.buildUndercarriageTanks();
    this.buildLocoBogies();
    this.buildLocoLights();
  }

  buildLocoChassis() {
    const L = GAME_CONFIG.train.length;   // 12.0m
    const W = GAME_CONFIG.train.width;    // 3.1m
    const H = 0.45;

    // Heavy main deck
    const deckGeom = new THREE.BoxGeometry(W, H, L);
    const deckMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.colors.trainFrame,
      roughness: 0.7,
      metalness: 0.5
    });
    const deck = new THREE.Mesh(deckGeom, deckMat);
    deck.position.y = 1.35;
    deck.castShadow = true;
    deck.receiveShadow = true;
    this.bodyGroup.add(deck);

    // Yellow warning side sills
    const sillMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.colors.trainStripe,
      roughness: 0.4,
      metalness: 0.2
    });

    [-W * 0.5 - 0.02, W * 0.5 + 0.02].forEach(x => {
      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, L), sillMat);
      sill.position.set(x, 1.35, 0);
      this.bodyGroup.add(sill);
    });

    // Front Pilot Buffer Beam & Plow (Front only; rear connects naturally to carriages)
    const bufferMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.colors.trainBuffersRed,
      roughness: 0.5,
      metalness: 0.3
    });

    const frontZ = L * 0.5 + 0.12;
    const frontPilot = new THREE.Mesh(new THREE.BoxGeometry(W, 0.75, 0.24), bufferMat);
    frontPilot.position.set(0, 0.95, frontZ);
    frontPilot.castShadow = true;
    this.bodyGroup.add(frontPilot);

    // Front Coupler & Snow Plow
    const coupler = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.35, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.8 })
    );
    coupler.position.set(0, 0.85, frontZ + 0.28);
    this.bodyGroup.add(coupler);

    const plow = new THREE.Mesh(new THREE.BoxGeometry(W * 0.85, 0.4, 0.1), bufferMat);
    plow.position.set(0, 0.45, frontZ + 0.15);
    plow.rotation.x = 0.25;
    this.bodyGroup.add(plow);

    // Rear Inter-car Connection: Natural Train Coupler & Flexible Rubber Gangway Bellows
    const rearZ = -L * 0.5;
    const rearCoupler = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.25, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.5, metalness: 0.7 })
    );
    rearCoupler.position.set(0, 0.85, rearZ - 0.45);
    this.bodyGroup.add(rearCoupler);

    // Accordion gangway vestibule connector
    const bellows = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 2.4, 0.55),
      new THREE.MeshStandardMaterial({ color: GAME_CONFIG.colors.coachGangway, roughness: 0.9 })
    );
    bellows.position.set(0, 2.5, rearZ - 0.25);
    this.bodyGroup.add(bellows);
  }

  buildLongHood() {
    const hoodW = 2.4;
    const hoodH = 2.1;
    const hoodL = 7.4;

    const hoodGeom = new THREE.BoxGeometry(hoodW, hoodH, hoodL);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.colors.trainBody,
      roughness: 0.45,
      metalness: 0.35
    });
    const hood = new THREE.Mesh(hoodGeom, bodyMat);
    hood.position.set(0, 2.62, 0.9);
    hood.castShadow = true;
    hood.receiveShadow = true;
    this.bodyGroup.add(hood);

    // Yellow warning stripe along hood sides
    const stripeMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.colors.trainStripe,
      roughness: 0.4,
      metalness: 0.2
    });

    [-hoodW * 0.5 - 0.015, hoodW * 0.5 + 0.015].forEach(x => {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.38, hoodL), stripeMat);
      stripe.position.set(x, 3.15, 0.9);
      this.bodyGroup.add(stripe);
    });

    // Front Nose V-Chevron
    const chevronL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.38, 0.02), stripeMat);
    chevronL.position.set(-0.55, 3.15, hoodL * 0.5 + 0.91);
    chevronL.rotation.z = -0.3;
    this.bodyGroup.add(chevronL);

    const chevronR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.38, 0.02), stripeMat);
    chevronR.position.set(0.55, 3.15, hoodL * 0.5 + 0.91);
    chevronR.rotation.z = 0.3;
    this.bodyGroup.add(chevronR);

    // Louvers on hood sides
    const louverMat = new THREE.MeshStandardMaterial({ color: 0x122338, roughness: 0.6, metalness: 0.5 });
    [-hoodW * 0.5 - 0.018, hoodW * 0.5 + 0.018].forEach(x => {
      for (let zOffset = -2.6; zOffset <= 2.6; zOffset += 0.85) {
        const louver = new THREE.Mesh(new THREE.BoxGeometry(0.015, 1.25, 0.55), louverMat);
        louver.position.set(x, 2.5, 0.9 + zOffset);
        this.bodyGroup.add(louver);
      }
    });

    // Curved top bevel
    const topBevel = new THREE.Mesh(
      new THREE.CylinderGeometry(hoodW * 0.5, hoodW * 0.5, hoodL, 16, 1, false, 0, Math.PI),
      bodyMat
    );
    topBevel.rotation.z = Math.PI * 0.5;
    topBevel.rotation.y = Math.PI * 0.5;
    topBevel.position.set(0, 3.67, 0.9);
    topBevel.scale.set(0.2, 1, 1);
    this.bodyGroup.add(topBevel);
  }

  buildCab() {
    const cabW = 2.95;
    const cabH = 2.5;
    const cabL = 3.2;
    const cabZ = -3.7;

    const cabGeom = new THREE.BoxGeometry(cabW, cabH, cabL);
    const cabMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.colors.trainBody,
      roughness: 0.45,
      metalness: 0.35
    });
    const cab = new THREE.Mesh(cabGeom, cabMat);
    cab.position.set(0, 2.82, cabZ);
    cab.castShadow = true;
    cab.receiveShadow = true;
    this.bodyGroup.add(cab);

    // Curved silver steel cab roof
    const roofGeom = new THREE.CylinderGeometry(cabW * 0.55, cabW * 0.55, cabL + 0.3, 24, 1, false, 0, Math.PI);
    const roofMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.colors.trainRoof,
      roughness: 0.55,
      metalness: 0.5
    });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.rotation.z = Math.PI * 0.5;
    roof.rotation.y = Math.PI * 0.5;
    roof.position.set(0, 4.07, cabZ);
    roof.scale.set(0.35, 1, 1);
    roof.castShadow = true;
    this.bodyGroup.add(roof);

    // Cab Windows
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x88b0d0,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.75,
      transmission: 0.6
    });

    [-0.7, 0.7].forEach(x => {
      const fWin = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.75, 0.05), glassMat);
      fWin.position.set(x, 3.4, cabZ + cabL * 0.5 + 0.02);
      this.bodyGroup.add(fWin);
    });

    [-cabW * 0.5 - 0.02, cabW * 0.5 + 0.02].forEach(x => {
      for (let zOffset = -0.7; zOffset <= 0.7; zOffset += 0.7) {
        const sWin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.5), glassMat);
        sWin.position.set(x, 3.4, cabZ + zOffset);
        this.bodyGroup.add(sWin);
      }
    });
  }

  buildRoofFansAndDetails() {
    const fanMat = new THREE.MeshStandardMaterial({ color: GAME_CONFIG.colors.trainRoof, roughness: 0.5, metalness: 0.6 });
    const grillMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8, wireframe: true });

    const fan1Housing = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.92, 0.45, 24), fanMat);
    fan1Housing.position.set(0, 3.9, 3.6);
    this.bodyGroup.add(fan1Housing);

    const fan1Grill = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.08, 20), grillMat);
    fan1Grill.position.set(0, 4.14, 3.6);
    this.bodyGroup.add(fan1Grill);

    const fan2Housing = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.72, 0.5, 24), fanMat);
    fan2Housing.position.set(0, 3.9, 1.2);
    this.bodyGroup.add(fan2Housing);

    const fan2Grill = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 20), grillMat);
    fan2Grill.position.set(0, 4.16, 1.2);
    this.bodyGroup.add(fan2Grill);

    // Horns atop cab roof
    const hornGroup = new THREE.Group();
    hornGroup.position.set(0, 4.35, -2.3);
    const hornBase = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.35), fanMat);
    hornGroup.add(hornBase);
    [-0.15, 0.15].forEach(x => {
      const bell = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 12), fanMat);
      bell.position.set(x, 0.12, 0.2);
      bell.rotation.x = Math.PI * 0.5;
      hornGroup.add(bell);
    });
    this.bodyGroup.add(hornGroup);
  }

  buildSafetyRailingsAndPlates() {
    const L = GAME_CONFIG.train.length;
    const W = GAME_CONFIG.train.width;
    const railMat = new THREE.MeshStandardMaterial({ color: 0x1f2429, roughness: 0.4, metalness: 0.8 });

    // Side handrails
    [-W * 0.5 + 0.08, W * 0.5 - 0.08].forEach(x => {
      const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, L - 0.6), railMat);
      topBar.rotation.x = Math.PI * 0.5;
      topBar.position.set(x, 2.35, 0);
      this.bodyGroup.add(topBar);

      for (let z = -L * 0.5 + 0.4; z <= L * 0.5 - 0.4; z += 1.4) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.85), railMat);
        post.position.set(x, 1.95, z);
        this.bodyGroup.add(post);
      }
    });

    // Front safety buffer plates (Front only!)
    const frontZ = L * 0.5 + 0.05;
    const plateGeom = new THREE.BoxGeometry(0.32, 0.65, 0.03);
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.4 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xba181b, roughness: 0.4 });

    [-0.85, 0.85].forEach(x => {
      const plate = new THREE.Mesh(plateGeom, redMat);
      plate.position.set(x, 2.3, frontZ);
      this.bodyGroup.add(plate);

      const wStripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.035), whiteMat);
      wStripe.position.set(x, 2.3, frontZ);
      this.bodyGroup.add(wStripe);
    });
  }

  buildUndercarriageTanks() {
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.7, metalness: 0.4 });
    const tank = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 3.4), tankMat);
    tank.position.set(0, 0.78, 0);
    tank.castShadow = true;
    this.bodyGroup.add(tank);

    const tankStripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.44, 0.18, 3.4),
      new THREE.MeshStandardMaterial({ color: GAME_CONFIG.colors.trainStripe, roughness: 0.5 })
    );
    tankStripe.position.set(0, 0.48, 0);
    this.bodyGroup.add(tankStripe);
  }

  buildLocoBogies() {
    this.frontBogie = this.createLocoBogie();
    this.rearBogie = this.createLocoBogie();
    this.root.add(this.frontBogie);
    this.root.add(this.rearBogie);
  }

  createLocoBogie() {
    const bogieGroup = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: GAME_CONFIG.colors.trainBogies, roughness: 0.65, metalness: 0.6 });

    [-1.15, 1.15].forEach(x => {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35, 3.6), frameMat);
      side.position.set(x, 0.58, 0);
      side.castShadow = true;
      bogieGroup.add(side);
    });

    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.3, 0.6), frameMat);
    crossBeam.position.set(0, 0.68, 0);
    bogieGroup.add(crossBeam);

    const axleOffsets = [-1.3, 0, 1.3];
    const wheelR = GAME_CONFIG.train.wheelRadius;
    const trackHalfGauge = GAME_CONFIG.track.gauge * 0.5;

    const wheelGeom = new THREE.CylinderGeometry(wheelR, wheelR, 0.14, 24);
    wheelGeom.rotateZ(Math.PI * 0.5);

    const wheelMat = new THREE.MeshStandardMaterial({ color: GAME_CONFIG.colors.trainWheels, roughness: 0.25, metalness: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd8dde4, roughness: 0.2, metalness: 0.9 });
    const springMat = new THREE.MeshStandardMaterial({ color: 0x935938, roughness: 0.5, metalness: 0.7 });

    axleOffsets.forEach(z => {
      const axleRod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, trackHalfGauge * 2 + 0.1, 16), frameMat);
      axleRod.rotateZ(Math.PI * 0.5);
      axleRod.position.set(0, wheelR, z);
      bogieGroup.add(axleRod);

      [-trackHalfGauge, trackHalfGauge].forEach(x => {
        const wheelPivot = new THREE.Group();
        wheelPivot.position.set(x, wheelR, z);

        const wheel = new THREE.Mesh(wheelGeom, wheelMat);
        wheel.castShadow = true;
        wheelPivot.add(wheel);

        const rim = new THREE.Mesh(new THREE.TorusGeometry(wheelR * 0.95, 0.025, 8, 24), rimMat);
        rim.rotateY(Math.PI * 0.5);
        wheelPivot.add(rim);

        bogieGroup.add(wheelPivot);
        this.wheelMeshes.push(wheelPivot);
      });

      [-1.15, 1.15].forEach(x => {
        const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.35, 12), springMat);
        spring.position.set(x, 0.8, z);
        bogieGroup.add(spring);
      });
    });

    return bogieGroup;
  }

  buildLocoLights() {
    const noseZ = GAME_CONFIG.train.length * 0.5 - 0.9;
    const headY = 3.85;

    const casing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.35, 0.45, 20),
      new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.5, metalness: 0.7 })
    );
    casing.rotation.x = Math.PI * 0.5;
    casing.position.set(0, headY, noseZ + 0.22);
    this.bodyGroup.add(casing);

    this.headlightLens = new THREE.Mesh(
      new THREE.CircleGeometry(0.3, 20),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xfffae0,
        emissiveIntensity: 0.0,
        roughness: 0.2
      })
    );
    this.headlightLens.position.set(0, headY, noseZ + 0.45);
    this.bodyGroup.add(this.headlightLens);

    this.headlight = new THREE.SpotLight(0xfffae0, 0, 85, Math.PI * 0.18, 0.4, 1.2);
    this.headlight.position.set(0, headY, noseZ + 0.46);
    this.headlight.castShadow = true;

    this.headlightTarget = new THREE.Object3D();
    this.headlightTarget.position.set(0, 0.5, noseZ + 30);
    this.bodyGroup.add(this.headlightTarget);
    this.headlight.target = this.headlightTarget;
    this.bodyGroup.add(this.headlight);

    const beamGeom = new THREE.ConeGeometry(4.2, 35, 24, 1, true);
    beamGeom.rotateX(-Math.PI * 0.5);
    beamGeom.translate(0, 0, 17.5);
    this.headlightBeam = new THREE.Mesh(
      beamGeom,
      new THREE.MeshBasicMaterial({ color: 0xfffae0, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide })
    );
    this.headlightBeam.position.set(0, headY, noseZ + 0.46);
    this.bodyGroup.add(this.headlightBeam);

    this.locoCabinLight = new THREE.PointLight(0xffdf88, 0, 8, 1.5);
    this.locoCabinLight.position.set(0, 3.4, -3.7);
    this.bodyGroup.add(this.locoCabinLight);
  }

  // ========================================================
  // 5 ATTACHED PASSENGER CARRIAGES / BOGGIES
  // ========================================================
  buildCarriages() {
    const count = GAME_CONFIG.train.carriageCount || 5;
    for (let i = 0; i < count; i++) {
      const carriage = this.createPassengerCarriage(i === count - 1);
      this.carriages.push(carriage);
      this.root.add(carriage.group);
      this.root.add(carriage.frontBogie);
      this.root.add(carriage.rearBogie);
    }
  }

  createPassengerCarriage(isLastCar) {
    const carGroup = new THREE.Group();

    const L = GAME_CONFIG.train.carriageLength; // 11.2m
    const W = GAME_CONFIG.train.carriageWidth;  // 2.9m
    const H = GAME_CONFIG.train.carriageHeight; // 3.65m

    // 1. Carriage Main Chassis Deck
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(W, 0.35, L),
      new THREE.MeshStandardMaterial({ color: GAME_CONFIG.colors.trainFrame, roughness: 0.7, metalness: 0.5 })
    );
    deck.position.y = 1.35;
    deck.castShadow = true;
    deck.receiveShadow = true;
    carGroup.add(deck);

    // Yellow warning side sills
    const sillMat = new THREE.MeshStandardMaterial({ color: GAME_CONFIG.colors.trainStripe, roughness: 0.4 });
    [-W * 0.5 - 0.02, W * 0.5 + 0.02].forEach(x => {
      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, L), sillMat);
      sill.position.set(x, 1.35, 0);
      carGroup.add(sill);
    });

    // 2. Streamlined Passenger Coach Body
    const bodyMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.colors.trainBody,
      roughness: 0.45,
      metalness: 0.35
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, H - 1.2, L), bodyMat);
    body.position.y = 2.45;
    body.castShadow = true;
    body.receiveShadow = true;
    carGroup.add(body);

    // Warm golden-yellow waistline stripe along carriage sides
    [-W * 0.5 - 0.015, W * 0.5 + 0.015].forEach(x => {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.32, L), sillMat);
      stripe.position.set(x, 2.7, 0);
      carGroup.add(stripe);
    });

    // 3. Curved Metallic Coach Roof
    const roofGeom = new THREE.CylinderGeometry(W * 0.52, W * 0.52, L, 24, 1, false, 0, Math.PI);
    const roofMat = new THREE.MeshStandardMaterial({ color: GAME_CONFIG.colors.trainRoof, roughness: 0.55, metalness: 0.5 });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.rotation.z = Math.PI * 0.5;
    roof.rotation.y = Math.PI * 0.5;
    roof.position.set(0, 3.65, 0);
    roof.scale.set(0.32, 1, 1);
    roof.castShadow = true;
    carGroup.add(roof);

    // 4. Passenger Coach Windows along both sides (5 large windows per side)
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xffeeaa,
      emissive: GAME_CONFIG.colors.coachWindowGlow,
      emissiveIntensity: 0.0,
      roughness: 0.2,
      metalness: 0.1
    });

    [-W * 0.5 - 0.02, W * 0.5 + 0.02].forEach(x => {
      for (let z = -3.8; z <= 3.8; z += 1.9) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.85, 1.25), windowMat);
        win.position.set(x, 2.65, z);
        carGroup.add(win);
        this.carriageWindowMeshes.push(win);
      }
    });

    // 5. Warm Interior Cabin Light inside every carriage
    const cabinLight = new THREE.PointLight(GAME_CONFIG.colors.coachWindowGlow, 0.0, 12, 1.5);
    cabinLight.position.set(0, 2.6, 0);
    carGroup.add(cabinLight);
    this.carriageCabinLights.push(cabinLight);

    // 6. Natural Inter-car Gangway Bellows & Couplers (Front and Rear)
    const gangwayMat = new THREE.MeshStandardMaterial({ color: GAME_CONFIG.colors.coachGangway, roughness: 0.9 });
    const couplerMat = new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.5, metalness: 0.7 });

    // Front Bellows
    const fBellows = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.3, 0.45), gangwayMat);
    fBellows.position.set(0, 2.45, L * 0.5 + 0.2);
    carGroup.add(fBellows);

    const fCoupler = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.7), couplerMat);
    fCoupler.position.set(0, 0.85, L * 0.5 + 0.35);
    carGroup.add(fCoupler);

    // Rear Bellows (if not the last car)
    if (!isLastCar) {
      const rBellows = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.3, 0.45), gangwayMat);
      rBellows.position.set(0, 2.45, -L * 0.5 - 0.2);
      carGroup.add(rBellows);

      const rCoupler = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.7), couplerMat);
      rCoupler.position.set(0, 0.85, -L * 0.5 - 0.35);
      carGroup.add(rCoupler);
    } else {
      // Rearmost carriage: closed end vestibule door and red tail marker lamps
      const redTailMat = new THREE.MeshStandardMaterial({
        color: 0xff2222,
        emissive: 0xff0000,
        emissiveIntensity: 0.8
      });
      [-0.8, 0.8].forEach(x => {
        const marker = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), redTailMat);
        marker.position.set(x, 2.2, -L * 0.5 - 0.05);
        carGroup.add(marker);
      });
    }

    // 7. Dual 2-Axle Articulated Bogies for this Carriage
    const frontBogie = this.createCoachBogie();
    const rearBogie = this.createCoachBogie();

    return {
      group: carGroup,
      frontBogie: frontBogie,
      rearBogie: rearBogie
    };
  }

  createCoachBogie() {
    const bogieGroup = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: GAME_CONFIG.colors.trainBogies, roughness: 0.65, metalness: 0.6 });

    [-1.15, 1.15].forEach(x => {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.32, 2.6), frameMat);
      side.position.set(x, 0.58, 0);
      side.castShadow = true;
      bogieGroup.add(side);
    });

    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.26, 0.5), frameMat);
    crossBeam.position.set(0, 0.68, 0);
    bogieGroup.add(crossBeam);

    // 2 Axles per bogie (offsets -0.95m, +0.95m)
    const axleOffsets = [-0.95, 0.95];
    const wheelR = GAME_CONFIG.train.wheelRadius;
    const trackHalfGauge = GAME_CONFIG.track.gauge * 0.5;

    const wheelGeom = new THREE.CylinderGeometry(wheelR, wheelR, 0.13, 20);
    wheelGeom.rotateZ(Math.PI * 0.5);

    const wheelMat = new THREE.MeshStandardMaterial({ color: GAME_CONFIG.colors.trainWheels, roughness: 0.25, metalness: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd8dde4, roughness: 0.2, metalness: 0.9 });
    const springMat = new THREE.MeshStandardMaterial({ color: 0x935938, roughness: 0.5, metalness: 0.7 });

    axleOffsets.forEach(z => {
      const axleRod = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, trackHalfGauge * 2 + 0.1, 14), frameMat);
      axleRod.rotateZ(Math.PI * 0.5);
      axleRod.position.set(0, wheelR, z);
      bogieGroup.add(axleRod);

      [-trackHalfGauge, trackHalfGauge].forEach(x => {
        const wheelPivot = new THREE.Group();
        wheelPivot.position.set(x, wheelR, z);

        const wheel = new THREE.Mesh(wheelGeom, wheelMat);
        wheel.castShadow = true;
        wheelPivot.add(wheel);

        const rim = new THREE.Mesh(new THREE.TorusGeometry(wheelR * 0.95, 0.022, 8, 20), rimMat);
        rim.rotateY(Math.PI * 0.5);
        wheelPivot.add(rim);

        bogieGroup.add(wheelPivot);
        this.wheelMeshes.push(wheelPivot);
      });

      [-1.15, 1.15].forEach(x => {
        const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.32, 10), springMat);
        spring.position.set(x, 0.78, z);
        bogieGroup.add(spring);
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

    // Locomotive Lights
    if (this.headlight) {
      this.headlight.intensity = on ? 4.2 : 0.0;
    }
    if (this.headlightLens) {
      this.headlightLens.material.emissiveIntensity = on ? 2.8 : 0.0;
    }
    if (this.headlightBeam) {
      this.headlightBeam.material.opacity = on ? 0.12 : 0.0;
    }
    if (this.locoCabinLight) {
      this.locoCabinLight.intensity = on ? 1.6 : 0.0;
    }

    // Turn ON / OFF Cabin Lights across ALL 5 Trailing Carriages!
    this.carriageCabinLights.forEach(light => {
      light.intensity = on ? 1.5 : 0.0;
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

    const spline = this.physics.trackSpline;
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
