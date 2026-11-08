// environment.js - Scenic rural village world: Google Earth aerial SVG terrain, ultra-lightweight instanced trees, poles & cottages
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

    // Ground and terrain meshes
    this.groundMesh = null;
    this.groundMat = null;

    // Instanced trees
    this.trunkMesh = null;
    this.canopyMesh = null;

    this.initGoogleEarthSVGCanvas();
    this.initElectricPoles();
    this.initLightweightInstancedTrees();
    this.initCottagesAndBuildings();
  }

  // Generates an authentic SVG representing a top-down Google Earth satellite view of a rural village railway corridor
  generateGoogleEarthVillageSVG() {
    // 2048x2048 detailed aerial satellite map
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 2048" width="2048" height="2048">
  <defs>
    <!-- Agricultural Soil & Water Gradients -->
    <linearGradient id="paddyGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#245c26"/>
      <stop offset="100%" stop-color="#1b4a1f"/>
    </linearGradient>
    <linearGradient id="paddyGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#32752b"/>
      <stop offset="100%" stop-color="#286323"/>
    </linearGradient>
    <linearGradient id="mustardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#c4af27"/>
      <stop offset="100%" stop-color="#b09b1e"/>
    </linearGradient>
    <linearGradient id="riverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#224850"/>
      <stop offset="100%" stop-color="#1a3b42"/>
    </linearGradient>
  </defs>

  <!-- 1. Verdant Base Rural Land -->
  <rect width="2048" height="2048" fill="#2a5426"/>`;

    // 2. Patchwork of agricultural crop & paddy fields (Google Earth satellite field boundaries)
    const fieldCols = ['#1f4d22', '#286229', '#34782e', '#418231', '#547d28', '#c2ad26', '#b5a121', '#6b5d43', '#594d37', '#255728'];
    const fieldWidths = [140, 180, 220, 160, 260, 190, 210];
    const fieldHeights = [110, 150, 180, 130, 210, 140, 170];

    // Seeded pseudo-random layout for stable, seamless tiling
    let seed = 42;
    function rand() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    // Grid of fields across the 2048x2048 satellite tile
    for (let gy = 0; gy < 2048; gy += 150) {
      for (let gx = 0; gx < 2048; gx += 170) {
        // Skip corridor near central railway
        const distFromCenter = Math.abs(gx + 85 - 1024);
        if (distFromCenter < 90 && (gy > 200 && gy < 1848)) continue;

        const w = 110 + rand() * 120;
        const h = 90 + rand() * 100;
        const col = fieldCols[Math.floor(rand() * fieldCols.length)];
        const rx = gx + (rand() - 0.5) * 30;
        const ry = gy + (rand() - 0.5) * 30;

        svg += `\n  <rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${col}" stroke="#163818" stroke-width="3" rx="4"/>`;
      }
    }

    // 3. Meandering Silt River & Water Canals (Khāl)
    svg += `
  <!-- Silt Canal Waterway with Mud Banks -->
  <path d="M 0,380 C 450,420 780,240 1024,510 S 1600,780 2048,680" fill="none" stroke="#483f33" stroke-width="44" stroke-linecap="round"/>
  <path d="M 0,380 C 450,420 780,240 1024,510 S 1600,780 2048,680" fill="none" stroke="url(#riverGrad)" stroke-width="30" stroke-linecap="round"/>

  <!-- Tributary canal crossing landscape -->
  <path d="M 1024,510 C 1120,860 1280,1280 1380,2048" fill="none" stroke="#483f33" stroke-width="32" stroke-linecap="round"/>
  <path d="M 1024,510 C 1120,860 1280,1280 1380,2048" fill="none" stroke="#224850" stroke-width="20" stroke-linecap="round"/>`;

    // 4. Village Homestead Clusters (Bari), Courtyards & Tin Roofs
    const villageClusters = [
      { x: 380, y: 720 },
      { x: 640, y: 1350 },
      { x: 1480, y: 440 },
      { x: 1620, y: 1220 },
      { x: 1540, y: 1720 },
      { x: 420, y: 1680 }
    ];

    villageClusters.forEach(v => {
      // Earthen courtyard clearing
      svg += `\n  <ellipse cx="${v.x}" cy="${v.y}" rx="110" ry="85" fill="#695b45" opacity="0.9"/>`;

      // Village Pond (Pukur) beside homestead
      svg += `\n  <rect x="${v.x + 70}" y="${v.y - 65}" width="75" height="50" rx="12" fill="#1d3f44" stroke="#483d2f" stroke-width="4"/>`;

      // House roofs (corrugated tin, weathered terracotta)
      const roofCols = ['#919da1', '#8c4f42', '#a2abb0', '#634e3e'];
      for (let r = 0; r < 5; r++) {
        const hx = v.x - 50 + (r % 3) * 36 + (rand() - 0.5) * 10;
        const hy = v.y - 35 + Math.floor(r / 3) * 38 + (rand() - 0.5) * 10;
        const rc = roofCols[r % roofCols.length];
        svg += `\n  <rect x="${hx.toFixed(1)}" y="${hy.toFixed(1)}" width="28" height="20" rx="2" fill="${rc}" stroke="#2d2822" stroke-width="1.5"/>`;
      }

      // Dense orchard tree crowns encircling the homestead (mango, jackfruit, banyan)
      const treeCanopies = [
        [-80, -60, 32], [-40, -75, 36], [10, -70, 30],
        [-90, 0, 35], [-85, 55, 34], [-30, 70, 38],
        [40, 65, 32], [90, 45, 30], [80, -20, 34]
      ];
      treeCanopies.forEach(([ox, oy, rad]) => {
        const tCol = rand() > 0.5 ? '#1a481c' : '#235925';
        svg += `\n  <circle cx="${v.x + ox}" cy="${v.y + oy}" r="${rad}" fill="${tCol}" opacity="0.94"/>`;
      });
    });

    // 5. Winding Earthen Roads & Footpaths (Kacha Rasta)
    svg += `
  <path d="M 0,920 Q 380,880 640,1100 T 1024,1150 T 1620,1220 T 2048,1380" fill="none" stroke="#87775b" stroke-width="8" stroke-linecap="round" stroke-dasharray="1 0"/>
  <path d="M 380,720 Q 520,840 640,1350 T 800,1850 T 1024,2048" fill="none" stroke="#7d6e53" stroke-width="6" stroke-linecap="round"/>
  <path d="M 1480,440 Q 1520,780 1620,1220 T 1540,1720" fill="none" stroke="#827257" stroke-width="7" stroke-linecap="round"/>`;

    // 6. Central Railway Track Corridor (Google Earth view)
    svg += `
  <!-- Railway Corridor Easement & Gravel Embankment -->
  <rect x="996" y="0" width="56" height="2048" fill="#4d4741"/>
  <rect x="1010" y="0" width="28" height="2048" fill="#5c554e"/>
  <line x1="996" y1="0" x2="996" y2="2048" stroke="#3b3631" stroke-width="4"/>
  <line x1="1052" y1="0" x2="1052" y2="2048" stroke="#3b3631" stroke-width="4"/>
</svg>`;

    return svg;
  }

  initGoogleEarthSVGCanvas() {
    // Generate the SVG Google Earth village view and render to an HTML canvas
    const svgStr = this.generateGoogleEarthVillageSVG();
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Quick initial procedural fill while SVG rasterizes
    ctx.fillStyle = '#2a5426';
    ctx.fillRect(0, 0, 1024, 1024);

    const groundTex = new THREE.CanvasTexture(canvas);
    groundTex.wrapS = THREE.RepeatWrapping;
    groundTex.wrapT = THREE.RepeatWrapping;
    // Tile 16x16 across the 4000m world for rich satellite fidelity
    groundTex.repeat.set(16, 16);
    groundTex.anisotropy = 4;

    // Load SVG as image onto canvas
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 1024, 1024);
      URL.revokeObjectURL(url);
      groundTex.needsUpdate = true;
    };
    img.src = url;

    // Ground Plane with fast MeshLambertMaterial (zero lag, no expensive PBR)
    const groundGeom = new THREE.PlaneGeometry(5000, 5000, 1, 1);
    groundGeom.rotateX(-Math.PI * 0.5);

    this.groundMat = new THREE.MeshLambertMaterial({
      map: groundTex,
      depthWrite: true
    });

    this.groundMesh = new THREE.Mesh(groundGeom, this.groundMat);
    this.groundMesh.position.y = -0.04;
    this.groundMesh.receiveShadow = false;
    this.envGroup.add(this.groundMesh);
  }

  // ULTRA-LIGHTWEIGHT INSTANCED TREES
  // Entire forest rendered in only 2 draw calls total!
  initLightweightInstancedTrees() {
    const spline = this.trackSystem.spline;
    const treeCount = 140; // Dense, scenic distribution around entire infinity circuit

    // 1. Instanced Trunks: 5-sided cylinder (super low-poly, silky fast)
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.36, 5.2, 5);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4d3b2c });
    this.trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    this.trunkMesh.castShadow = false;
    this.trunkMesh.receiveShadow = false;

    // 2. Instanced Canopies: 5-sided cone (classic lush green tree crown)
    const canopyGeo = new THREE.ConeGeometry(2.6, 4.4, 5);
    const canopyMat = new THREE.MeshLambertMaterial({ color: 0x2b6b23 });
    this.canopyMesh = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount);
    this.canopyMesh.castShadow = false;
    this.canopyMesh.receiveShadow = false;

    const dummyT = new THREE.Object3D();
    const dummyC = new THREE.Object3D();

    // Pseudo-random distribution along the spline
    for (let i = 0; i < treeCount; i++) {
      const u = i / treeCount;
      const pt = spline.getPointAt(u);
      const tangent = spline.getTangentAt(u);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      // Alternate sides comfortably away from railway tracks
      const side = (i % 2 === 0) ? 1 : -1;
      const dist = 12.0 + ((i * 37) % 55); // 12m to 67m offset
      const treePos = pt.clone().add(normal.clone().multiplyScalar(dist * side));

      const scale = 0.85 + ((i * 19) % 35) * 0.015;

      // Position trunk
      dummyT.position.copy(treePos);
      dummyT.position.y = 2.6 * scale;
      dummyT.scale.set(scale, scale, scale);
      dummyT.updateMatrix();
      this.trunkMesh.setMatrixAt(i, dummyT.matrix);

      // Position canopy atop trunk
      dummyC.position.copy(treePos);
      dummyC.position.y = (5.2 * 0.88 + 2.2) * scale;
      dummyC.scale.set(scale, scale, scale);
      dummyC.rotation.y = (i * 1.3);
      dummyC.updateMatrix();
      this.canopyMesh.setMatrixAt(i, dummyC.matrix);
    }

    this.trunkMesh.instanceMatrix.needsUpdate = true;
    this.canopyMesh.instanceMatrix.needsUpdate = true;

    this.envGroup.add(this.trunkMesh);
    this.envGroup.add(this.canopyMesh);
  }

  initElectricPoles() {
    const spline = this.trackSystem.spline;
    const totalLength = spline.getLength();
    const poleSpacing = 42.0;
    const poleCount = Math.floor(totalLength / poleSpacing);

    const poleWoodMat = new THREE.MeshLambertMaterial({ color: GAME_CONFIG.colors.poleWood });
    const lampMetalMat = new THREE.MeshLambertMaterial({ color: 0x24272c });

    const prevPolePositions = [];
    const wirePoints = [];

    for (let i = 0; i < poleCount; i++) {
      const u = i / poleCount;
      const pt = spline.getPointAt(u);
      const tangent = spline.getTangentAt(u);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const side = (i % 2 === 0) ? 1 : -1;
      const polePos = pt.clone().add(normal.clone().multiplyScalar(5.2 * side));
      polePos.y = Math.max(0, pt.y);

      const poleGroup = new THREE.Group();
      poleGroup.position.copy(polePos);

      // Vertical pole (6-sided cylinder)
      const mainPole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.20, 6.5, 6), poleWoodMat);
      mainPole.position.y = 3.25;
      mainPole.castShadow = false;
      poleGroup.add(mainPole);

      // Cross arm
      const crossArm = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 0.14), poleWoodMat);
      crossArm.position.y = 6.2;
      crossArm.rotation.y = Math.atan2(tangent.x, tangent.z);
      poleGroup.add(crossArm);

      // Warm street lamp bulb
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshLambertMaterial({
          color: 0xffffff,
          emissive: GAME_CONFIG.colors.lampWarm,
          emissiveIntensity: 0.1
        })
      );
      bulb.position.set(-side * 1.2, 5.8, 0);
      poleGroup.add(bulb);
      this.poleBulbMeshes.push(bulb);

      // Lightweight night point light
      const light = new THREE.PointLight(GAME_CONFIG.colors.lampWarm, 0.0, 18, 1.8);
      light.position.set(-side * 1.2, 5.7, 0);
      poleGroup.add(light);
      this.poleLights.push(light);

      this.envGroup.add(poleGroup);
      this.electricPoles.push(poleGroup);

      // Collect wire top coordinates
      const wireTop = polePos.clone().add(new THREE.Vector3(0, 6.2, 0));
      if (prevPolePositions[side]) {
        wirePoints.push(prevPolePositions[side], wireTop);
      }
      prevPolePositions[side] = wireTop;
    }

    // Single unified wire mesh for all poles (1 draw call!)
    if (wirePoints.length > 0) {
      const wireGeom = new THREE.BufferGeometry().setFromPoints(wirePoints);
      const wireMat = new THREE.LineBasicMaterial({ color: 0x1f1f1f });
      const wireLines = new THREE.LineSegments(wireGeom, wireMat);
      this.envGroup.add(wireLines);
    }
  }

  initCottagesAndBuildings() {
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xd4c8b6 });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x823b2c });

    const cottageSites = [
      { u: 0.05, side: -1, dist: 22.0 },
      { u: 0.12, side:  1, dist: 24.0 },
      { u: 0.20, side: -1, dist: 20.0 },
      { u: 0.28, side:  1, dist: 26.0 },
      { u: 0.36, side: -1, dist: 24.0 },
      { u: 0.44, side:  1, dist: 22.0 },
      { u: 0.52, side: -1, dist: 22.0 },
      { u: 0.60, side:  1, dist: 24.0 },
      { u: 0.68, side: -1, dist: 20.0 },
      { u: 0.76, side:  1, dist: 26.0 },
      { u: 0.84, side: -1, dist: 24.0 },
      { u: 0.92, side:  1, dist: 22.0 }
    ];

    const spline = this.trackSystem.spline;

    cottageSites.forEach((site) => {
      const pt = spline.getPointAt(site.u);
      const tangent = spline.getTangentAt(site.u);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const pos = pt.clone().add(normal.clone().multiplyScalar(site.dist * site.side));

      const house = new THREE.Group();
      house.position.copy(pos);
      house.rotation.y = Math.atan2(tangent.x, tangent.z) + (site.side === -1 ? 0.2 : Math.PI - 0.2);

      const bodyW = 6.5, bodyH = 3.8, bodyL = 8.5;
      const body = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyL), wallMat);
      body.position.y = bodyH * 0.5;
      house.add(body);

      // Low-poly 4-sided pitched roof
      const roofGeom = new THREE.ConeGeometry(bodyW * 0.76, 2.8, 4);
      roofGeom.rotateY(Math.PI * 0.25);
      const roof = new THREE.Mesh(roofGeom, roofMat);
      roof.scale.set(1.0, 1.0, bodyL / bodyW);
      roof.position.y = bodyH + 1.4;
      house.add(roof);

      // Glowing night windows
      [-1.6, 1.6].forEach(wx => {
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 1.2, 0.08),
          new THREE.MeshLambertMaterial({
            color: 0xffeeaa,
            emissive: 0xffcc44,
            emissiveIntensity: 0.1
          })
        );
        win.position.set(wx, 2.0, bodyL * 0.5 + 0.04);
        house.add(win);
        this.windowMeshes.push(win);
      });

      this.envGroup.add(house);
    });
  }

  // Dynamic nearby LOD update (Keeps ground centered under train so world never ends)
  update(targetPosition) {
    if (this.groundMesh && targetPosition) {
      this.groundMesh.position.x = targetPosition.x;
      this.groundMesh.position.z = targetPosition.z;
    }
  }

  setNight(isNight) {
    this.isNight = isNight;

    this.poleLights.forEach(light => {
      light.intensity = isNight ? 1.6 : 0.0;
    });

    this.poleBulbMeshes.forEach(bulb => {
      bulb.material.emissiveIntensity = isNight ? 2.4 : 0.05;
    });

    this.windowMeshes.forEach(win => {
      win.material.emissiveIntensity = isNight ? 2.0 : 0.1;
    });
  }
}

window.EnvironmentManager = EnvironmentManager;
