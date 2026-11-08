// track.js - Fixed 3D railway track generator: rails, sleepers, ballast, fasteners & buffer stop
class TrackSystem {
  constructor(scene) {
    this.scene = scene;
    this.spline = null;
    this.trackGroup = new THREE.Group();
    this.scene.add(this.trackGroup);

    this.sleeperTransforms = [];
    this.poleTransforms = [];

    this.initSpline();
    this.buildBallast();
    this.buildRails();
    this.buildSleepers();
    this.buildBufferStop();
  }

  initSpline() {
    // Scenic closed loop with straights, sweeping curves, and gentle landscape elevations
    const R = GAME_CONFIG.track.loopRadius; // ~90 meters
    const points = [
      new THREE.Vector3( -R * 0.9, 0, -R * 0.4 ),
      new THREE.Vector3( -R * 0.7, 0.2, R * 0.1 ),
      new THREE.Vector3( -R * 0.3, 0.4, R * 0.65 ),
      new THREE.Vector3(  R * 0.2, 0.3, R * 0.75 ),
      new THREE.Vector3(  R * 0.7, 0.1, R * 0.5 ),
      new THREE.Vector3(  R * 0.95, 0, R * 0.05 ),
      new THREE.Vector3(  R * 0.85, -0.1, -R * 0.5 ),
      new THREE.Vector3(  R * 0.4, -0.05, -R * 0.85 ),
      new THREE.Vector3( -R * 0.1, 0, -R * 0.8 ),
      new THREE.Vector3( -R * 0.6, 0.1, -R * 0.7 )
    ];

    // Smooth closed 3D Catmull-Rom spline
    this.spline = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.25);
  }

  buildRails() {
    const halfGauge = GAME_CONFIG.track.gauge * 0.5;
    const samples = 480;
    const divisions = samples;

    // Create Rail Profile shape (I-beam / standard Vignoles rail section)
    const railShape = new THREE.Shape();
    const wTop = 0.08, wBase = 0.14, wWeb = 0.03, h = 0.18;
    railShape.moveTo(-wBase * 0.5, 0);
    railShape.lineTo(wBase * 0.5, 0);
    railShape.lineTo(wBase * 0.3, 0.04);
    railShape.lineTo(wWeb * 0.5, 0.06);
    railShape.lineTo(wWeb * 0.5, h - 0.04);
    railShape.lineTo(wTop * 0.5, h - 0.02);
    railShape.lineTo(wTop * 0.5, h);
    railShape.lineTo(-wTop * 0.5, h);
    railShape.lineTo(-wTop * 0.5, h - 0.02);
    railShape.lineTo(-wWeb * 0.5, h - 0.04);
    railShape.lineTo(-wWeb * 0.5, 0.06);
    railShape.lineTo(-wBase * 0.3, 0.04);
    railShape.closePath();

    // Material with metallic sheen for polished steel rail heads
    const railMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.colors.rails,
      roughness: 0.28,
      metalness: 0.88
    });

    // Generate Left and Right Rail Curves offset from center spline
    ['left', 'right'].forEach(side => {
      const offsetSign = side === 'left' ? -1 : 1;
      const offsetDist = halfGauge * offsetSign;
      const railCurvePoints = [];

      for (let i = 0; i <= divisions; i++) {
        const u = i / divisions;
        const pt = this.spline.getPointAt(u);
        const tangent = this.spline.getTangentAt(u);
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
        
        // Elevate rail base to rest on top of sleepers (sleeper height ~0.22m)
        const railPt = pt.clone().add(normal.clone().multiplyScalar(offsetDist));
        railPt.y += GAME_CONFIG.track.sleeperHeight;
        railCurvePoints.push(railPt);
      }

      const railCurve = new THREE.CatmullRomCurve3(railCurvePoints, true);
      const extrudeSettings = {
        steps: samples,
        bevelEnabled: false,
        extrudePath: railCurve
      };

      const railGeom = new THREE.ExtrudeGeometry(railShape, extrudeSettings);
      const railMesh = new THREE.Mesh(railGeom, railMat);
      railMesh.castShadow = true;
      railMesh.receiveShadow = true;
      this.trackGroup.add(railMesh);
    });
  }

  buildSleepers() {
    const totalLength = this.spline.getLength();
    const count = Math.floor(totalLength / GAME_CONFIG.track.sleeperSpacing);
    const halfGauge = GAME_CONFIG.track.gauge * 0.5;

    // Concrete/timber sleeper geometry
    const sleeperGeom = new THREE.BoxGeometry(
      GAME_CONFIG.track.sleeperWidth,
      GAME_CONFIG.track.sleeperHeight,
      GAME_CONFIG.track.sleeperDepth
    );

    const sleeperMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.colors.sleepers,
      roughness: 0.85,
      metalness: 0.05
    });

    const instancedSleepers = new THREE.InstancedMesh(sleeperGeom, sleeperMat, count);
    instancedSleepers.castShadow = true;
    instancedSleepers.receiveShadow = true;

    // Metal fastening tie plates holding rails onto sleepers
    const plateGeom = new THREE.BoxGeometry(0.24, 0.035, 0.20);
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x333538,
      roughness: 0.6,
      metalness: 0.7
    });
    const instancedPlates = new THREE.InstancedMesh(plateGeom, plateMat, count * 2);
    instancedPlates.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const dummyPlate = new THREE.Object3D();
    let plateIndex = 0;

    for (let i = 0; i < count; i++) {
      const u = i / count;
      const pos = this.spline.getPointAt(u);
      const tangent = this.spline.getTangentAt(u);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const up = new THREE.Vector3(0, 1, 0);

      // Sleeper center position (half height above ground)
      dummy.position.copy(pos);
      dummy.position.y += GAME_CONFIG.track.sleeperHeight * 0.5;

      // Orient sleeper across track normal
      dummy.matrix.lookAt(dummy.position, dummy.position.clone().add(normal), up);
      // Box length is along X, rotate so length aligns with normal
      dummy.rotation.y = Math.atan2(tangent.x, tangent.z);
      dummy.updateMatrix();
      instancedSleepers.setMatrixAt(i, dummy.matrix);

      // Store transforms for environment prop placement
      this.sleeperTransforms.push({
        position: pos.clone(),
        tangent: tangent.clone(),
        normal: normal.clone(),
        index: i
      });

      // Left and right rail tie plates
      [-1, 1].forEach(sign => {
        dummyPlate.position.copy(pos).add(normal.clone().multiplyScalar(halfGauge * sign));
        dummyPlate.position.y += GAME_CONFIG.track.sleeperHeight + 0.015;
        dummyPlate.rotation.y = dummy.rotation.y;
        dummyPlate.updateMatrix();
        instancedPlates.setMatrixAt(plateIndex++, dummyPlate.matrix);
      });
    }

    instancedSleepers.instanceMatrix.needsUpdate = true;
    instancedPlates.instanceMatrix.needsUpdate = true;

    this.trackGroup.add(instancedSleepers);
    this.trackGroup.add(instancedPlates);
  }

  buildBallast() {
    // Raised crushed gravel embankment beneath tracks
    const samples = 360;
    const ballastShape = new THREE.Shape();
    const topW = GAME_CONFIG.track.ballastWidth * 0.5;
    const baseW = topW + 1.6;
    const h = GAME_CONFIG.track.ballastHeight;

    ballastShape.moveTo(-baseW, -0.05);
    ballastShape.lineTo(baseW, -0.05);
    ballastShape.lineTo(topW, h);
    ballastShape.lineTo(-topW, h);
    ballastShape.closePath();

    const extrudeSettings = {
      steps: samples,
      bevelEnabled: false,
      extrudePath: this.spline
    };

    const ballastGeom = new THREE.ExtrudeGeometry(ballastShape, extrudeSettings);
    const ballastMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.colors.ballast,
      roughness: 0.95,
      metalness: 0.02
    });

    const ballastMesh = new THREE.Mesh(ballastGeom, ballastMat);
    ballastMesh.receiveShadow = true;
    this.trackGroup.add(ballastMesh);
  }

  buildBufferStop() {
    // Matching reference image 15.webp: Track end buffer with black/white striped crossbeam & circular target
    const bufferGroup = new THREE.Group();

    // Position the buffer stop on a siding track near the rail yard stretch
    const sidingPos = new THREE.Vector3(-65, 0, -42);
    bufferGroup.position.copy(sidingPos);
    bufferGroup.rotation.y = 0.8;

    // Concrete base blocks
    const blockMat = new THREE.MeshStandardMaterial({ color: 0x828282, roughness: 0.8 });
    for (let x = -1.2; x <= 1.2; x += 0.8) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 1.8), blockMat);
      block.position.set(x, 0.22, 0);
      block.receiveShadow = true;
      bufferGroup.add(block);
    }

    // Heavy steel A-frame angled buffer legs
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x3d352e, roughness: 0.6, metalness: 0.6 });
    [-0.7, 0.7].forEach(x => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.6, 0.18), steelMat);
      leg.position.set(x, 0.9, -0.3);
      leg.rotation.x = -0.4;
      leg.castShadow = true;
      bufferGroup.add(leg);

      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.3, 0.18), steelMat);
      brace.position.set(x, 0.8, 0.35);
      brace.rotation.x = 0.45;
      brace.castShadow = true;
      bufferGroup.add(brace);
    });

    // Horizontal bumper crossbar with hazard stripes
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.35, 0.25),
      new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.5 })
    );
    bar.position.set(0, 1.45, -0.65);
    bar.castShadow = true;
    bufferGroup.add(bar);

    // Hazard stripes (black squares on white bar)
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 });
    [-0.9, -0.3, 0.3, 0.9].forEach(x => {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.36, 0.26), stripeMat);
      stripe.position.set(x, 1.45, -0.65);
      bufferGroup.add(stripe);
    });

    // Circular white target indicator on top
    const target = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.05, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
    );
    target.position.set(0.4, 1.82, -0.65);
    target.rotation.x = Math.PI * 0.5;
    bufferGroup.add(target);

    this.trackGroup.add(bufferGroup);
  }
}

window.TrackSystem = TrackSystem;
