// environment.js - Scenic world generation: terrain, electric poles with bulbs, rocks, trees, cottages & grass
class EnvironmentManager {
  constructor(scene, trackSystem) {
    this.scene = scene;
    this.trackSystem = trackSystem;
    this.envGroup = new THREE.Group();
    this.scene.add(this.envGroup);

    this.electricPoles = [];
    this.poleLights = [];
    this.poleBulbMeshes = [];
    this.windowMeshes = [];

    this.isNight = false;

    this.initTerrain();
    this.initElectricPoles();
    this.initRocks();
    this.initTrees();
    this.initCottagesAndBuildings();
    this.initGrassTufts();
  }

  initTerrain() {
    // Expansive rolling ground plane
    const terrainSize = 450;
    const segments = 120;
    const geom = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
    geom.rotateX(-Math.PI * 0.5);

    // Subtle gentle rolling hills away from the track
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Distance from track center loop
      const distFromCenter = Math.hypot(x, z);
      let y = 0;

      // Keep track corridor relatively flat, roll hills outward
      if (distFromCenter > 110) {
        y = Math.sin(x * 0.03) * Math.cos(z * 0.03) * 4.5 + Math.sin(x * 0.015) * 6.0;
      } else if (distFromCenter < 55) {
        y = Math.cos(x * 0.04) * Math.sin(z * 0.04) * 2.2;
      }
      pos.setY(i, y);
    }
    geom.computeVertexNormals();

    // Natural landscape grass texture
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x47633d,
      roughness: 0.92,
      metalness: 0.05
    });

    const ground = new THREE.Mesh(geom, groundMat);
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.envGroup.add(ground);

    // Mud and dirt path beneath and bordering the track
    const mudMat = new THREE.MeshStandardMaterial({
      color: 0x3d3023,
      roughness: 0.95,
      metalness: 0.02
    });

    // Create mud fringe ribbon along the spline
    const mudSpline = this.trackSystem.spline;
    const mudPoints = 200;
    const mudGeom = new THREE.PlaneGeometry(8.5, 4.0, 1, 1);
    mudGeom.rotateX(-Math.PI * 0.5);

    const instancedMud = new THREE.InstancedMesh(mudGeom, mudMat, mudPoints);
    instancedMud.receiveShadow = true;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < mudPoints; i++) {
      const u = i / mudPoints;
      const p = mudSpline.getPointAt(u);
      const t = mudSpline.getTangentAt(u);
      dummy.position.copy(p);
      dummy.position.y = 0.01;
      dummy.rotation.y = Math.atan2(t.x, t.z);
      dummy.scale.set(1.0 + Math.sin(i * 3) * 0.2, 1, 1);
      dummy.updateMatrix();
      instancedMud.setMatrixAt(i, dummy.matrix);
    }
    instancedMud.instanceMatrix.needsUpdate = true;
    this.envGroup.add(instancedMud);
  }

  initElectricPoles() {
    // Utility poles with hanging bulbs placed along both LEFT and RIGHT sides of the track
    const spline = this.trackSystem.spline;
    const totalLength = spline.getLength();
    const poleSpacing = 22.0; // Distance between consecutive poles
    const poleCount = Math.floor(totalLength / poleSpacing);

    const poleWoodMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.colors.poleWood,
      roughness: 0.85,
      metalness: 0.1
    });

    const crossArmMat = new THREE.MeshStandardMaterial({
      color: 0x3e3228,
      roughness: 0.8
    });

    const insulatorMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.colors.insulators,
      roughness: 0.2,
      metalness: 0.6
    });

    const lampMetalMat = new THREE.MeshStandardMaterial({
      color: 0x24272c,
      roughness: 0.4,
      metalness: 0.7
    });

    const prevPolePositions = [];

    for (let i = 0; i < poleCount; i++) {
      const u = i / poleCount;
      const pt = spline.getPointAt(u);
      const tangent = spline.getTangentAt(u);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      // Alternate left and right side of track (4.8m offset from track center)
      const side = (i % 2 === 0) ? 1 : -1;
      const polePos = pt.clone().add(normal.clone().multiplyScalar(4.8 * side));
      polePos.y = Math.max(0, pt.y);

      const poleGroup = new THREE.Group();
      poleGroup.position.copy(polePos);

      // 1. Main vertical wooden pole (height 6.8m)
      const mainPole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 6.8, 12), poleWoodMat);
      mainPole.position.y = 3.4;
      mainPole.castShadow = true;
      poleGroup.add(mainPole);

      // 2. Horizontal cross-arm
      const crossArm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 0.16), crossArmMat);
      crossArm.position.y = 6.4;
      crossArm.rotation.y = Math.atan2(tangent.x, tangent.z);
      poleGroup.add(crossArm);

      // 3. Green ceramic insulators on cross-arm
      [-0.85, 0, 0.85].forEach(ox => {
        const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 8), insulatorMat);
        ins.position.set(ox, 6.55, 0);
        crossArm.add(ins);
      });

      // 4. Street lamp arm reaching toward the track
      const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8), lampMetalMat);
      lampArm.position.set(-side * 0.8, 5.8, 0);
      lampArm.rotation.z = side * 0.6;
      poleGroup.add(lampArm);

      // Lamp shade hood
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.22, 12), lampMetalMat);
      shade.position.set(-side * 1.5, 5.4, 0);
      poleGroup.add(shade);

      // 5. Hanging incandescent bulb with emissive glow
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: GAME_CONFIG.colors.lampWarm,
          emissiveIntensity: 0.1,
          roughness: 0.2
        })
      );
      bulb.position.set(-side * 1.5, 5.25, 0);
      poleGroup.add(bulb);
      this.poleBulbMeshes.push(bulb);

      // Warm PointLight for night track illumination
      const light = new THREE.PointLight(GAME_CONFIG.colors.lampWarm, 0.0, 22, 1.6);
      light.position.set(-side * 1.5, 5.15, 0);
      poleGroup.add(light);
      this.poleLights.push(light);

      this.envGroup.add(poleGroup);
      this.electricPoles.push(poleGroup);

      // 6. Connect power lines between consecutive poles on the same side
      if (prevPolePositions[side]) {
        const wireMat = new THREE.LineBasicMaterial({ color: 0x1a1a1a, linewidth: 1 });
        const wirePoints = [
          prevPolePositions[side].clone().add(new THREE.Vector3(0, 6.4, 0)),
          polePos.clone().add(new THREE.Vector3(0, 6.4, 0))
        ];
        // Add realistic catenary sag in mid-span
        const midPoint = wirePoints[0].clone().lerp(wirePoints[1], 0.5);
        midPoint.y -= 0.45;
        const wireCurve = new THREE.QuadraticBezierCurve3(wirePoints[0], midPoint, wirePoints[1]);
        const wireGeom = new THREE.BufferGeometry().setFromPoints(wireCurve.getPoints(12));
        const wireLine = new THREE.Line(wireGeom, wireMat);
        this.envGroup.add(wireLine);
      }
      prevPolePositions[side] = polePos;
    }
  }

  initRocks() {
    // Generate realistic rocky cliff formations matching cliff_3_low reference
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x6e685f,
      roughness: 0.88,
      metalness: 0.08,
      flatShading: true
    });

    // Try loading stone texture if available
    const texLoader = new THREE.TextureLoader();
    texLoader.load(
      'assets/textures/stone_color.png',
      tex => {
        rockMat.map = tex;
        rockMat.needsUpdate = true;
      },
      undefined,
      err => console.log('Using procedural rock material')
    );

    // Procedural low-poly rock geometry with sculpted cliff facets
    const baseRockGeom = new THREE.DodecahedronGeometry(1.0, 1);
    const pos = baseRockGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      v.x += (Math.random() - 0.5) * 0.25;
      v.y += (Math.random() - 0.5) * 0.35;
      v.z += (Math.random() - 0.5) * 0.25;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    baseRockGeom.computeVertexNormals();

    const rockCount = 45;
    const instancedRocks = new THREE.InstancedMesh(baseRockGeom, rockMat, rockCount);
    instancedRocks.castShadow = true;
    instancedRocks.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const spline = this.trackSystem.spline;

    for (let i = 0; i < rockCount; i++) {
      // Cluster rocks in scenic cuttings and natural boulders along track
      const u = (i / rockCount + 0.35) % 1.0;
      const pt = spline.getPointAt(u);
      const tangent = spline.getTangentAt(u);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const side = (i % 2 === 0) ? 1 : -1;
      const dist = 6.5 + Math.random() * 18.0;
      const rockPos = pt.clone().add(normal.clone().multiplyScalar(dist * side));

      const scale = 2.5 + Math.random() * 5.5;
      dummy.position.copy(rockPos);
      dummy.position.y = scale * 0.45;
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dummy.scale.set(scale, scale * (0.8 + Math.random() * 0.6), scale);
      dummy.updateMatrix();
      instancedRocks.setMatrixAt(i, dummy.matrix);
    }

    instancedRocks.instanceMatrix.needsUpdate = true;
    this.envGroup.add(instancedRocks);
  }

  initTrees() {
    // Natural tree groves and roadside vegetation matching reference low-poly tree
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x422d1f, roughness: 0.9 });
    const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x2e5a24, roughness: 0.85, flatShading: true });
    const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x3d702e, roughness: 0.85, flatShading: true });

    const treeCount = 90;
    const spline = this.trackSystem.spline;

    for (let i = 0; i < treeCount; i++) {
      const u = Math.random();
      const pt = spline.getPointAt(u);
      const tangent = spline.getTangentAt(u);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      // Trees situated comfortably back from the railway corridor (8m to 48m away)
      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = 8.5 + Math.random() * 40.0;
      const treePos = pt.clone().add(normal.clone().multiplyScalar(dist * side));

      const tree = new THREE.Group();
      tree.position.copy(treePos);

      const treeScale = 0.8 + Math.random() * 0.6;
      tree.scale.set(treeScale, treeScale, treeScale);

      // Trunk
      const trunkH = 3.5 + Math.random() * 1.5;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, trunkH, 7), trunkMat);
      trunk.position.y = trunkH * 0.5;
      trunk.castShadow = true;
      tree.add(trunk);

      // Foliage Canopies (Low-poly layered crown)
      const mat = (i % 2 === 0) ? leafMat1 : leafMat2;
      const layerCount = 3;
      for (let l = 0; l < layerCount; l++) {
        const coneR = 2.4 - l * 0.5;
        const coneH = 2.6 - l * 0.3;
        const canopy = new THREE.Mesh(new THREE.ConeGeometry(coneR, coneH, 7), mat);
        canopy.position.y = trunkH * 0.85 + l * 1.4;
        canopy.castShadow = true;
        canopy.receiveShadow = true;
        tree.add(canopy);
      }

      this.envGroup.add(tree);
    }
  }

  initCottagesAndBuildings() {
    // Village settlement along the straightaway stretch of the railway track
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xd9cebe, roughness: 0.85 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x823b2c, roughness: 0.7 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.6 });
    const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x5a2d24, roughness: 0.8 });

    // Locations along track for cottages
    const cottageSites = [
      { u: 0.08, side: -1, dist: 16.0 },
      { u: 0.14, side: -1, dist: 22.0 },
      { u: 0.20, side: -1, dist: 17.5 },
      { u: 0.78, side: 1, dist: 20.0 }
    ];

    const spline = this.trackSystem.spline;

    cottageSites.forEach((site, idx) => {
      const pt = spline.getPointAt(site.u);
      const tangent = spline.getTangentAt(site.u);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const pos = pt.clone().add(normal.clone().multiplyScalar(site.dist * site.side));

      const house = new THREE.Group();
      house.position.copy(pos);
      house.rotation.y = Math.atan2(tangent.x, tangent.z) + (site.side === -1 ? 0.3 : Math.PI - 0.3);

      // Main house body
      const bodyW = 7.0, bodyH = 4.2, bodyL = 9.0;
      const body = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyL), wallMat);
      body.position.y = bodyH * 0.5;
      body.castShadow = true;
      body.receiveShadow = true;
      house.add(body);

      // Pitched Gable Roof
      const roofGeom = new THREE.ConeGeometry(bodyW * 0.78, 3.2, 4);
      roofGeom.rotateY(Math.PI * 0.25);
      const roof = new THREE.Mesh(roofGeom, roofMat);
      roof.scale.set(1.0, 1.0, bodyL / bodyW);
      roof.position.y = bodyH + 1.5;
      roof.castShadow = true;
      house.add(roof);

      // Brick Chimney
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.6, 0.8), chimneyMat);
      chimney.position.set(bodyW * 0.3, bodyH + 2.2, bodyL * 0.25);
      chimney.castShadow = true;
      house.add(chimney);

      // Front Door
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.1), doorMat);
      door.position.set(0, 1.2, bodyL * 0.5 + 0.05);
      house.add(door);

      // Cottage Windows with warm night glow
      [-1.8, 1.8].forEach(wx => {
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 1.4, 0.1),
          new THREE.MeshStandardMaterial({
            color: 0xffeeaa,
            emissive: 0xffcc44,
            emissiveIntensity: 0.1,
            roughness: 0.3
          })
        );
        win.position.set(wx, 2.2, bodyL * 0.5 + 0.05);
        house.add(win);
        this.windowMeshes.push(win);
      });

      this.envGroup.add(house);
    });
  }

  initGrassTufts() {
    // Little natural grass tufts scattered along track edge (matching 9139-grass reference)
    const tuftMat = new THREE.MeshStandardMaterial({
      color: 0x5a8c3d,
      roughness: 0.9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });

    const tuftGeom = new THREE.PlaneGeometry(0.8, 0.6);
    const count = 120;
    const instancedGrass = new THREE.InstancedMesh(tuftGeom, tuftMat, count);
    const dummy = new THREE.Object3D();
    const spline = this.trackSystem.spline;

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const pt = spline.getPointAt(u);
      const tangent = spline.getTangentAt(u);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = 2.4 + Math.random() * 4.0; // Right beside ballast
      const gPos = pt.clone().add(normal.clone().multiplyScalar(dist * side));

      dummy.position.copy(gPos);
      dummy.position.y = 0.3;
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.scale.setScalar(0.7 + Math.random() * 0.6);
      dummy.updateMatrix();
      instancedGrass.setMatrixAt(i, dummy.matrix);
    }

    instancedGrass.instanceMatrix.needsUpdate = true;
    this.envGroup.add(instancedGrass);
  }

  setNight(isNight) {
    this.isNight = isNight;

    // Toggle electric utility pole bulbs
    this.poleLights.forEach(light => {
      light.intensity = isNight ? 1.8 : 0.0;
    });

    this.poleBulbMeshes.forEach(bulb => {
      bulb.material.emissiveIntensity = isNight ? 2.5 : 0.05;
    });

    // Toggle cottage window glows
    this.windowMeshes.forEach(win => {
      win.material.emissiveIntensity = isNight ? 2.2 : 0.1;
    });
  }
}

window.EnvironmentManager = EnvironmentManager;
