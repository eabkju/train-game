// train.js - T3M2M-005 Diesel Switcher Locomotive 3D Model, Bogies & Lighting
class TrainLocomotive {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;

    this.root = new THREE.Group();
    this.scene.add(this.root);

    // Chassis & Body
    this.bodyGroup = new THREE.Group();
    this.root.add(this.bodyGroup);

    // Articulated Bogies
    this.frontBogie = null;
    this.rearBogie = null;
    this.wheelMeshes = [];

    // Lighting
    this.lightsOn = false;
    this.headlight = null;
    this.headlightTarget = null;
    this.headlightBeam = null;
    this.headlightLens = null;
    this.cabinLight = null;
    this.markerLights = [];

    this.buildLocomotive();
    this.setLights(false);
  }

  buildLocomotive() {
    this.buildChassis();
    this.buildLongHood();
    this.buildCab();
    this.buildRoofFansAndDetails();
    this.buildSafetyRailingsAndPlates();
    this.buildUndercarriageTanks();
    this.buildBogies();
    this.buildLights();
  }

  buildChassis() {
    const L = GAME_CONFIG.train.length;   // 12.0m
    const W = GAME_CONFIG.train.width;    // 3.1m
    const H = 0.45;                       // Frame thickness

    // Heavy main deck / running plate
    const deckGeom = new THREE.BoxGeometry(W, H, L);
    const deckMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.colors.trainFrame,
      roughness: 0.7,
      metalness: 0.5
    });
    const deck = new THREE.Mesh(deckGeom, deckMat);
    deck.position.y = 1.35; // Above rail level
    deck.castShadow = true;
    deck.receiveShadow = true;
    this.bodyGroup.add(deck);

    // Yellow warning side sill strips along deck edge
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

    // Front & rear heavy red pilot buffer beams
    const bufferMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.colors.trainBuffersRed,
      roughness: 0.5,
      metalness: 0.3
    });

    [-1, 1].forEach(dir => {
      const z = (L * 0.5 + 0.12) * dir;
      const pilot = new THREE.Mesh(new THREE.BoxGeometry(W, 0.75, 0.24), bufferMat);
      pilot.position.set(0, 0.95, z);
      pilot.castShadow = true;
      this.bodyGroup.add(pilot);

      // Steel center coupler
      const coupler = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.35, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.8 })
      );
      coupler.position.set(0, 0.85, z + 0.28 * dir);
      this.bodyGroup.add(coupler);

      // Angled track snow plow / deflector plate
      const plowGeom = new THREE.BoxGeometry(W * 0.85, 0.4, 0.1);
      const plow = new THREE.Mesh(plowGeom, bufferMat);
      plow.position.set(0, 0.45, z + 0.15 * dir);
      plow.rotation.x = 0.25 * dir;
      this.bodyGroup.add(plow);
    });
  }

  buildLongHood() {
    const hoodW = 2.4;
    const hoodH = 2.1;
    const hoodL = 7.4;

    // Navy Blue Hood Main Body
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

    // Bold yellow warning stripe along hood sides
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

    // Front Nose V-Chevron Stripe
    const chevronL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.38, 0.02), stripeMat);
    chevronL.position.set(-0.55, 3.15, hoodL * 0.5 + 0.91);
    chevronL.rotation.z = -0.3;
    this.bodyGroup.add(chevronL);

    const chevronR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.38, 0.02), stripeMat);
    chevronR.position.set(0.55, 3.15, hoodL * 0.5 + 0.91);
    chevronR.rotation.z = 0.3;
    this.bodyGroup.add(chevronR);

    // Vertical Engine Cooling Louvers on Hood Sides
    const louverMat = new THREE.MeshStandardMaterial({
      color: 0x122338,
      roughness: 0.6,
      metalness: 0.5
    });

    [-hoodW * 0.5 - 0.018, hoodW * 0.5 + 0.018].forEach(x => {
      for (let zOffset = -2.6; zOffset <= 2.6; zOffset += 0.85) {
        const louver = new THREE.Mesh(new THREE.BoxGeometry(0.015, 1.25, 0.55), louverMat);
        louver.position.set(x, 2.5, 0.9 + zOffset);
        this.bodyGroup.add(louver);
      }
    });

    // Rounded bevel top on hood
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

    // Curved silver/grey steel cab roof plate
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

    // Cab Windows (Forward, Rear and Side windows)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x88b0d0,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.75,
      transmission: 0.6
    });

    // Front Cab Windows (facing forward over hood)
    [-0.7, 0.7].forEach(x => {
      const fWin = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.75, 0.05), glassMat);
      fWin.position.set(x, 3.4, cabZ + cabL * 0.5 + 0.02);
      this.bodyGroup.add(fWin);
    });

    // Side Windows (left and right cab walls)
    [-cabW * 0.5 - 0.02, cabW * 0.5 + 0.02].forEach(x => {
      for (let zOffset = -0.7; zOffset <= 0.7; zOffset += 0.7) {
        const sWin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.5), glassMat);
        sWin.position.set(x, 3.4, cabZ + zOffset);
        this.bodyGroup.add(sWin);
      }
    });

    // Locomotive identification number plates ("15301518" as seen on reference)
    [-cabW * 0.5 - 0.03, cabW * 0.5 + 0.03].forEach(x => {
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.28, 0.95),
        new THREE.MeshStandardMaterial({ color: 0x122338, roughness: 0.5 })
      );
      plate.position.set(x, 2.5, cabZ);
      this.bodyGroup.add(plate);
    });
  }

  buildRoofFansAndDetails() {
    // Matching top-down reference photo 4ljf1p8l.jpg:
    // Prominent round cooling fans with circular mesh grills on the roof!
    const fanMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.colors.trainRoof,
      roughness: 0.5,
      metalness: 0.6
    });

    const grillMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.8,
      wireframe: true
    });

    // Front large fan housing
    const fan1Housing = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.92, 0.45, 24), fanMat);
    fan1Housing.position.set(0, 3.9, 3.6);
    this.bodyGroup.add(fan1Housing);

    const fan1Grill = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.08, 20), grillMat);
    fan1Grill.position.set(0, 4.14, 3.6);
    this.bodyGroup.add(fan1Grill);

    // Mid exhaust stack housing
    const fan2Housing = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.72, 0.5, 24), fanMat);
    fan2Housing.position.set(0, 3.9, 1.2);
    this.bodyGroup.add(fan2Housing);

    const fan2Grill = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 20), grillMat);
    fan2Grill.position.set(0, 4.16, 1.2);
    this.bodyGroup.add(fan2Grill);

    // Authentic dual horns mounted atop the cab roof
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
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x1f2429,
      roughness: 0.4,
      metalness: 0.8
    });

    // Walkway handrails along both sides
    [-W * 0.5 + 0.08, W * 0.5 - 0.08].forEach(x => {
      // Top horizontal rail bar
      const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, L - 0.6), railMat);
      topBar.rotation.x = Math.PI * 0.5;
      topBar.position.set(x, 2.35, 0);
      this.bodyGroup.add(topBar);

      // Mid rail bar
      const midBar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, L - 0.6), railMat);
      midBar.rotation.x = Math.PI * 0.5;
      midBar.position.set(x, 1.85, 0);
      this.bodyGroup.add(midBar);

      // Vertical stanchions
      for (let z = -L * 0.5 + 0.4; z <= L * 0.5 - 0.4; z += 1.4) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.85), railMat);
        post.position.set(x, 1.95, z);
        this.bodyGroup.add(post);
      }
    });

    // Front and Rear end handrails with entry chains
    [-1, 1].forEach(dir => {
      const z = (L * 0.5 - 0.1) * dir;
      [-1, 1].forEach(side => {
        const endBar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.04), railMat);
        endBar.position.set(side * 0.95, 2.35, z);
        this.bodyGroup.add(endBar);
      });
    });

    // Distinctive Red & White Hazard Caution Marker Plates (as on reference photos!)
    const plateGeom = new THREE.BoxGeometry(0.32, 0.65, 0.03);
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.4 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xba181b, roughness: 0.4 });

    [-1, 1].forEach(dir => {
      const z = (L * 0.5 + 0.05) * dir;
      [-0.85, 0.85].forEach(x => {
        // Red base plate
        const plate = new THREE.Mesh(plateGeom, redMat);
        plate.position.set(x, 2.3, z);
        this.bodyGroup.add(plate);

        // White vertical hazard stripe
        const wStripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.035), whiteMat);
        wStripe.position.set(x, 2.3, z);
        this.bodyGroup.add(wStripe);
      });
    });
  }

  buildUndercarriageTanks() {
    // Large heavy central diesel fuel tank mounted under chassis between bogies
    const tankGeom = new THREE.BoxGeometry(2.4, 0.85, 3.4);
    const tankMat = new THREE.MeshStandardMaterial({
      color: 0x181a1d,
      roughness: 0.7,
      metalness: 0.4
    });
    const tank = new THREE.Mesh(tankGeom, tankMat);
    tank.position.set(0, 0.78, 0);
    tank.castShadow = true;
    this.bodyGroup.add(tank);

    // Yellow stripe on fuel tank bottom edge
    const tankStripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.44, 0.18, 3.4),
      new THREE.MeshStandardMaterial({ color: GAME_CONFIG.colors.trainStripe, roughness: 0.5 })
    );
    tankStripe.position.set(0, 0.48, 0);
    this.bodyGroup.add(tankStripe);

    // Compressed air reservoir cylinders alongside fuel tank
    const airResMat = new THREE.MeshStandardMaterial({ color: 0x24282e, roughness: 0.5, metalness: 0.6 });
    [-1.35, 1.35].forEach(x => {
      const res = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 3.2, 16), airResMat);
      res.rotation.x = Math.PI * 0.5;
      res.position.set(x, 0.95, 0);
      this.bodyGroup.add(res);
    });
  }

  buildBogies() {
    const halfDist = GAME_CONFIG.train.bogieDistance * 0.5;

    // Build Front Bogie (at +halfDist) and Rear Bogie (at -halfDist)
    this.frontBogie = this.createBogieTruck();
    this.rearBogie = this.createBogieTruck();

    this.root.add(this.frontBogie);
    this.root.add(this.rearBogie);
  }

  createBogieTruck() {
    const bogieGroup = new THREE.Group();

    // Heavy cast steel 3-axle bogie frame
    const frameMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.colors.trainBogies,
      roughness: 0.65,
      metalness: 0.6
    });

    const sideFrameGeom = new THREE.BoxGeometry(0.18, 0.35, 3.6);
    [-1.15, 1.15].forEach(x => {
      const side = new THREE.Mesh(sideFrameGeom, frameMat);
      side.position.set(x, 0.58, 0);
      side.castShadow = true;
      bogieGroup.add(side);
    });

    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.3, 0.6), frameMat);
    crossBeam.position.set(0, 0.68, 0);
    bogieGroup.add(crossBeam);

    // 3 Wheel Axles per bogie (offsets -1.3m, 0m, +1.3m)
    const axleOffsets = [-1.3, 0, 1.3];
    const wheelR = GAME_CONFIG.train.wheelRadius;
    const wheelThickness = 0.14;
    const trackHalfGauge = GAME_CONFIG.track.gauge * 0.5;

    const wheelGeom = new THREE.CylinderGeometry(wheelR, wheelR, wheelThickness, 24);
    // Orient cylinder along X axis for rolling
    wheelGeom.rotateZ(Math.PI * 0.5);

    const wheelMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.colors.trainWheels,
      roughness: 0.25,
      metalness: 0.85
    });

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xd8dde4,
      roughness: 0.2,
      metalness: 0.9
    });

    const springMat = new THREE.MeshStandardMaterial({
      color: 0x935938, // Coppery rusted spring steel
      roughness: 0.5,
      metalness: 0.7
    });

    axleOffsets.forEach(z => {
      // Solid steel axle rod
      const axleRod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, trackHalfGauge * 2 + 0.1, 16), frameMat);
      axleRod.rotateZ(Math.PI * 0.5);
      axleRod.position.set(0, wheelR, z);
      bogieGroup.add(axleRod);

      // Left and right wheels
      [-trackHalfGauge, trackHalfGauge].forEach(x => {
        const wheelPivot = new THREE.Group();
        wheelPivot.position.set(x, wheelR, z);

        const wheel = new THREE.Mesh(wheelGeom, wheelMat);
        wheel.castShadow = true;
        wheelPivot.add(wheel);

        // Bright steel rim band
        const rim = new THREE.Mesh(new THREE.TorusGeometry(wheelR * 0.95, 0.025, 8, 24), rimMat);
        rim.rotateY(Math.PI * 0.5);
        wheelPivot.add(rim);

        bogieGroup.add(wheelPivot);
        this.wheelMeshes.push(wheelPivot);
      });

      // Dual Coil Suspension Springs on side frames
      [-1.15, 1.15].forEach(x => {
        const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.35, 12), springMat);
        spring.position.set(x, 0.8, z);
        bogieGroup.add(spring);
      });
    });

    return bogieGroup;
  }

  buildLights() {
    // 1. High-beam Forward Headlight on Hood Nose
    const noseZ = GAME_CONFIG.train.length * 0.5 - 0.9;
    const headY = 3.85;

    // Headlight casing
    const casing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.35, 0.45, 20),
      new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.5, metalness: 0.7 })
    );
    casing.rotation.x = Math.PI * 0.5;
    casing.position.set(0, headY, noseZ + 0.22);
    this.bodyGroup.add(casing);

    // Glowing front glass lens
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

    // Real-time SpotLight illuminating track ahead
    this.headlight = new THREE.SpotLight(0xfffae0, 0, 75, Math.PI * 0.18, 0.4, 1.2);
    this.headlight.position.set(0, headY, noseZ + 0.46);
    this.headlight.castShadow = true;
    this.headlight.shadow.mapSize.width = 1024;
    this.headlight.shadow.mapSize.height = 1024;
    this.headlight.shadow.camera.near = 0.5;
    this.headlight.shadow.camera.far = 75;

    this.headlightTarget = new THREE.Object3D();
    this.headlightTarget.position.set(0, 0.5, noseZ + 25);
    this.bodyGroup.add(this.headlightTarget);
    this.headlight.target = this.headlightTarget;
    this.bodyGroup.add(this.headlight);

    // Volumetric Light Beam Cone for Night / Rain beam effect
    const beamGeom = new THREE.ConeGeometry(3.8, 30, 24, 1, true);
    beamGeom.rotateX(-Math.PI * 0.5);
    beamGeom.translate(0, 0, 15);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfffae0,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.headlightBeam = new THREE.Mesh(beamGeom, beamMat);
    this.headlightBeam.position.set(0, headY, noseZ + 0.46);
    this.bodyGroup.add(this.headlightBeam);

    // 2. Warm Interior Cabin Light
    this.cabinLight = new THREE.PointLight(0xffdf88, 0, 8, 1.5);
    this.cabinLight.position.set(0, 3.4, -3.7);
    this.bodyGroup.add(this.cabinLight);
  }

  toggleLights() {
    this.setLights(!this.lightsOn);
    return this.lightsOn;
  }

  setLights(on) {
    this.lightsOn = on;

    if (this.headlight) {
      this.headlight.intensity = on ? 4.2 : 0.0;
    }
    if (this.headlightLens) {
      this.headlightLens.material.emissiveIntensity = on ? 2.8 : 0.0;
    }
    if (this.headlightBeam) {
      this.headlightBeam.material.opacity = on ? 0.12 : 0.0;
    }
    if (this.cabinLight) {
      this.cabinLight.intensity = on ? 1.6 : 0.0;
    }
  }

  update(dt) {
    // 1. Position and orient the main locomotive body along spline
    const pos = this.physics.currentPosition;
    const tangent = this.physics.currentTangent;

    this.bodyGroup.position.copy(pos);

    // Yaw heading aligned with tangent
    const angleY = Math.atan2(tangent.x, tangent.z);
    this.bodyGroup.rotation.y = angleY;

    // Slight dynamic pitch from vertical track grade
    const pitch = -Math.atan2(tangent.y, Math.hypot(tangent.x, tangent.z));
    this.bodyGroup.rotation.x = pitch;

    // 2. Position articulated Front & Rear Bogies independently along track
    const fPos = this.physics.frontBogiePos;
    const rPos = this.physics.rearBogiePos;

    this.frontBogie.position.copy(fPos);
    this.rearBogie.position.copy(rPos);

    // Calculate heading vector for each bogie
    const spline = this.physics.trackSpline;
    const halfBogieDistNorm = (GAME_CONFIG.train.bogieDistance * 0.5) / this.physics.trackLength;
    const frontU = (this.physics.progress + halfBogieDistNorm + 1.0) % 1.0;
    const rearU = (this.physics.progress - halfBogieDistNorm + 1.0) % 1.0;

    const fTan = new THREE.Vector3();
    const rTan = new THREE.Vector3();
    spline.getTangentAt(frontU, fTan);
    spline.getTangentAt(rearU, rTan);

    this.frontBogie.rotation.y = Math.atan2(fTan.x, fTan.z);
    this.rearBogie.rotation.y = Math.atan2(rTan.x, rTan.z);

    // 3. Wheel rotation matching speed and distance traveled
    const rot = this.physics.wheelRotation;
    this.wheelMeshes.forEach(w => {
      w.rotation.x = rot;
    });
  }
}

window.TrainLocomotive = TrainLocomotive;
