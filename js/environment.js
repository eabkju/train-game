// environment.js - Scenic world generation: terrain, electric utility poles with bulbs, green 3D trees & cottages
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
    this.initGreenTreesOnly();
    this.initCottagesAndBuildings();
    this.initGrassTufts();
  }

  initTerrain() {
    // Expansive terrain sized to cover the extended 2400m straightaways
    const terrainW = 1200;
    const terrainL = 3400;
    const segmentsX = 40;
    const segmentsZ = 120;
    const geom = new THREE.PlaneGeometry(terrainW, terrainL, segmentsX, segmentsZ);
    geom.rotateX(-Math.PI * 0.5);

    // Subtle gentle rolling contours away from the track corridor
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      let y = 0;
      // Flat railway corridor between track lines, gentle rolling hills on outer perimeter
      if (Math.abs(x) > 340) {
        y = Math.sin(x * 0.02) * Math.cos(z * 0.015) * 5.0 + Math.sin(z * 0.008) * 4.0;
      }
      pos.setY(i, y);
    }
    geom.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x47633d,
      roughness: 0.92,
      metalness: 0.05
    });

    const ground = new THREE.Mesh(geom, groundMat);
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.envGroup.add(ground);

    // Mud and dirt path bordering the track
    const mudMat = new THREE.MeshStandardMaterial({
      color: 0x3d3023,
      roughness: 0.95,
      metalness: 0.02
    });

    const mudSpline = this.trackSystem.spline;
    const mudPoints = 350;
    const mudGeom = new THREE.PlaneGeometry(8.5, 6.0, 1, 1);
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
      dummy.updateMatrix();
      instancedMud.setMatrixAt(i, dummy.matrix);
    }
    instancedMud.instanceMatrix.needsUpdate = true;
    this.envGroup.add(instancedMud);
  }

  initElectricPoles() {
    // Utility poles with hanging bulbs placed along both LEFT and RIGHT sides of the whole track
    const spline = this.trackSystem.spline;
    const totalLength = spline.getLength();
    const poleSpacing = 36.0;
    const poleCount = Math.floor(totalLength / poleSpacing);

    const poleWoodMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.colors.poleWood,
      roughness: 0.85,
      metalness: 0.1
    });

    const crossArmMat = new THREE.MeshStandardMaterial({ color: 0x3e3228, roughness: 0.8 });
    const insulatorMat = new THREE.MeshStandardMaterial({ color: GAME_CONFIG.colors.insulators, roughness: 0.2, metalness: 0.6 });
    const lampMetalMat = new THREE.MeshStandardMaterial({ color: 0x24272c, roughness: 0.4, metalness: 0.7 });

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

      // 1. Vertical wooden pole
      const mainPole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 6.8, 10), poleWoodMat);
      mainPole.position.y = 3.4;
      mainPole.castShadow = true;
      poleGroup.add(mainPole);

      // 2. Horizontal cross-arm
      const crossArm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 0.16), crossArmMat);
      crossArm.position.y = 6.4;
      crossArm.rotation.y = Math.atan2(tangent.x, tangent.z);
      poleGroup.add(crossArm);

      // 3. Green ceramic insulators
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

      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.22, 12), lampMetalMat);
      shade.position.set(-side * 1.5, 5.4, 0);
      poleGroup.add(shade);

      // 5. Hanging incandescent bulb
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

      // PointLight for night track illumination
      const light = new THREE.PointLight(GAME_CONFIG.colors.lampWarm, 0.0, 24, 1.6);
      light.position.set(-side * 1.5, 5.15, 0);
      poleGroup.add(light);
      this.poleLights.push(light);

      this.envGroup.add(poleGroup);
      this.electricPoles.push(poleGroup);

      // 6. Connect power lines
      if (prevPolePositions[side]) {
        const wireMat = new THREE.LineBasicMaterial({ color: 0x1a1a1a, linewidth: 1 });
        const p1 = prevPolePositions[side].clone().add(new THREE.Vector3(0, 6.4, 0));
        const p2 = polePos.clone().add(new THREE.Vector3(0, 6.4, 0));
        const midPoint = p1.clone().lerp(p2, 0.5);
        midPoint.y -= 0.6;
        const wireCurve = new THREE.QuadraticBezierCurve3(p1, midPoint, p2);
        const wireGeom = new THREE.BufferGeometry().setFromPoints(wireCurve.getPoints(8));
        const wireLine = new THREE.Line(wireGeom, wireMat);
        this.envGroup.add(wireLine);
      }
      prevPolePositions[side] = polePos;
    }
  }

  initGreenTreesOnly() {
    // User requirement: "only keep the green 3d trees. remove other trees."
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x483222, roughness: 0.9 });
    const leafGreenMat1 = new THREE.MeshStandardMaterial({ color: 0x2e6b20, roughness: 0.85, flatShading: true });
    const leafGreenMat2 = new THREE.MeshStandardMaterial({ color: 0x3d852a, roughness: 0.85, flatShading: true });
    const leafGreenMat3 = new THREE.MeshStandardMaterial({ color: 0x24591a, roughness: 0.85, flatShading: true });

    const spline = this.trackSystem.spline;
    const treeCount = 180; // Abundant lush green trees along the long straight route

    for (let i = 0; i < treeCount; i++) {
      const u = Math.random();
      const pt = spline.getPointAt(u);
      const tangent = spline.getTangentAt(u);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = 8.5 + Math.random() * 65.0; // Comfortably away from track
      const treePos = pt.clone().add(normal.clone().multiplyScalar(dist * side));

      const tree = new THREE.Group();
      tree.position.copy(treePos);

      const treeScale = 0.85 + Math.random() * 0.7;
      tree.scale.set(treeScale, treeScale, treeScale);

      // Wooden trunk
      const trunkH = 3.8 + Math.random() * 1.6;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.44, trunkH, 7), trunkMat);
      trunk.position.y = trunkH * 0.5;
      trunk.castShadow = true;
      tree.add(trunk);

      // Layered vibrant green canopies (clean 3D low-poly crowns)
      const greenMaterials = [leafGreenMat1, leafGreenMat2, leafGreenMat3];
      const mat = greenMaterials[i % greenMaterials.length];
      const layerCount = 3;

      for (let l = 0; l < layerCount; l++) {
        const coneR = 2.5 - l * 0.5;
        const coneH = 2.7 - l * 0.35;
        const canopy = new THREE.Mesh(new THREE.ConeGeometry(coneR, coneH, 7), mat);
        canopy.position.y = trunkH * 0.82 + l * 1.5;
        canopy.castShadow = true;
        canopy.receiveShadow = true;
        tree.add(canopy);
      }

      this.envGroup.add(tree);
    }
  }

  initCottagesAndBuildings() {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xd9cebe, roughness: 0.85 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x823b2c, roughness: 0.7 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.6 });
    const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x5a2d24, roughness: 0.8 });

    // Cottages spaced along the scenic long straightaways
    const cottageSites = [
      { u: 0.05, side: -1, dist: 18.0 },
      { u: 0.18, side: -1, dist: 22.0 },
      { u: 0.35, side:  1, dist: 20.0 },
      { u: 0.55, side: -1, dist: 24.0 },
      { u: 0.72, side:  1, dist: 20.0 },
      { u: 0.88, side: -1, dist: 22.0 }
    ];

    const spline = this.trackSystem.spline;

    cottageSites.forEach((site) => {
      const pt = spline.getPointAt(site.u);
      const tangent = spline.getTangentAt(site.u);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const pos = pt.clone().add(normal.clone().multiplyScalar(site.dist * site.side));

      const house = new THREE.Group();
      house.position.copy(pos);
      house.rotation.y = Math.atan2(tangent.x, tangent.z) + (site.side === -1 ? 0.3 : Math.PI - 0.3);

      const bodyW = 7.0, bodyH = 4.2, bodyL = 9.0;
      const body = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyL), wallMat);
      body.position.y = bodyH * 0.5;
      body.castShadow = true;
      body.receiveShadow = true;
      house.add(body);

      const roofGeom = new THREE.ConeGeometry(bodyW * 0.78, 3.2, 4);
      roofGeom.rotateY(Math.PI * 0.25);
      const roof = new THREE.Mesh(roofGeom, roofMat);
      roof.scale.set(1.0, 1.0, bodyL / bodyW);
      roof.position.y = bodyH + 1.5;
      roof.castShadow = true;
      house.add(roof);

      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.6, 0.8), chimneyMat);
      chimney.position.set(bodyW * 0.3, bodyH + 2.2, bodyL * 0.25);
      chimney.castShadow = true;
      house.add(chimney);

      const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.1), doorMat);
      door.position.set(0, 1.2, bodyL * 0.5 + 0.05);
      house.add(door);

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
    const tuftMat = new THREE.MeshStandardMaterial({
      color: 0x4d8c2e,
      roughness: 0.9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });

    const tuftGeom = new THREE.PlaneGeometry(0.85, 0.65);
    const count = 180;
    const instancedGrass = new THREE.InstancedMesh(tuftGeom, tuftMat, count);
    const dummy = new THREE.Object3D();
    const spline = this.trackSystem.spline;

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const pt = spline.getPointAt(u);
      const tangent = spline.getTangentAt(u);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = 2.4 + Math.random() * 4.2;
      const gPos = pt.clone().add(normal.clone().multiplyScalar(dist * side));

      dummy.position.copy(gPos);
      dummy.position.y = 0.32;
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.scale.setScalar(0.75 + Math.random() * 0.6);
      dummy.updateMatrix();
      instancedGrass.setMatrixAt(i, dummy.matrix);
    }

    instancedGrass.instanceMatrix.needsUpdate = true;
    this.envGroup.add(instancedGrass);
  }

  setNight(isNight) {
    this.isNight = isNight;

    this.poleLights.forEach(light => {
      light.intensity = isNight ? 1.8 : 0.0;
    });

    this.poleBulbMeshes.forEach(bulb => {
      bulb.material.emissiveIntensity = isNight ? 2.5 : 0.05;
    });

    this.windowMeshes.forEach(win => {
      win.material.emissiveIntensity = isNight ? 2.2 : 0.1;
    });
  }
}

window.EnvironmentManager = EnvironmentManager;
