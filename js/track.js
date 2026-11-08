// track.js - Extended straight railway track with mild wide-radius curves after ~3 minutes of running
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
    // Wall-like buffer stop removed as requested for an open, natural railway
  }

  initSpline() {
    // Expansive railway circuit featuring long, realistic straightaways (~2400m)
    // At 14 m/s (50 km/h), running each straightaway takes ~3 minutes before entering the mild curve
    const L = GAME_CONFIG.track.straightLength * 0.5; // 1200m each side of origin
    const X = 280.0;                                   // Track separation
    const R = GAME_CONFIG.track.curveRadius;          // 420m mild curve radius

    const points = [
      // 1. Long Straightaway 1 (Running straight South from -L to +L)
      new THREE.Vector3( -X, 0.0, -L ),
      new THREE.Vector3( -X, 0.0, -L * 0.6 ),
      new THREE.Vector3( -X, 0.0, -L * 0.2 ),
      new THREE.Vector3( -X, 0.0,  L * 0.2 ),
      new THREE.Vector3( -X, 0.0,  L * 0.6 ),
      new THREE.Vector3( -X, 0.0,  L ),

      // 2. Mild, sweeping South Curve (Turning from -X to +X)
      new THREE.Vector3( -X * 0.85, 0.0, L + R * 0.45 ),
      new THREE.Vector3( -X * 0.45, 0.0, L + R * 0.80 ),
      new THREE.Vector3(  0.0,      0.0, L + R * 0.95 ),
      new THREE.Vector3(  X * 0.45, 0.0, L + R * 0.80 ),
      new THREE.Vector3(  X * 0.85, 0.0, L + R * 0.45 ),

      // 3. Long Straightaway 2 (Running straight North from +L to -L)
      new THREE.Vector3(  X, 0.0,  L ),
      new THREE.Vector3(  X, 0.0,  L * 0.6 ),
      new THREE.Vector3(  X, 0.0,  L * 0.2 ),
      new THREE.Vector3(  X, 0.0, -L * 0.2 ),
      new THREE.Vector3(  X, 0.0, -L * 0.6 ),
      new THREE.Vector3(  X, 0.0, -L ),

      // 4. Mild, sweeping North Curve (Turning from +X back to -X)
      new THREE.Vector3(  X * 0.85, 0.0, -L - R * 0.45 ),
      new THREE.Vector3(  X * 0.45, 0.0, -L - R * 0.80 ),
      new THREE.Vector3(  0.0,      0.0, -L - R * 0.95 ),
      new THREE.Vector3( -X * 0.45, 0.0, -L - R * 0.80 ),
      new THREE.Vector3( -X * 0.85, 0.0, -L - R * 0.45 )
    ];

    // Smooth closed 3D Catmull-Rom spline
    this.spline = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.15);
  }

  buildRails() {
    const halfGauge = GAME_CONFIG.track.gauge * 0.5;
    const samples = 1200;
    const divisions = samples;

    // Standard Vignoles steel rail profile
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

    const railMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.colors.rails,
      roughness: 0.28,
      metalness: 0.88
    });

    ['left', 'right'].forEach(side => {
      const offsetSign = side === 'left' ? -1 : 1;
      const offsetDist = halfGauge * offsetSign;
      const railCurvePoints = [];

      for (let i = 0; i <= divisions; i++) {
        const u = i / divisions;
        const pt = this.spline.getPointAt(u);
        const tangent = this.spline.getTangentAt(u);
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
        
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
    // High-performance instanced sleepers (spaced every ~0.8m)
    const sleeperSpacing = 0.85;
    const count = Math.floor(totalLength / sleeperSpacing);
    const halfGauge = GAME_CONFIG.track.gauge * 0.5;

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

    // Fastening tie plates holding rails onto sleepers
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

      dummy.position.copy(pos);
      dummy.position.y += GAME_CONFIG.track.sleeperHeight * 0.5;
      dummy.rotation.y = Math.atan2(tangent.x, tangent.z);
      dummy.updateMatrix();
      instancedSleepers.setMatrixAt(i, dummy.matrix);

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
    const samples = 800;
    const ballastShape = new THREE.Shape();
    const topW = GAME_CONFIG.track.ballastWidth * 0.5;
    const baseW = topW + 1.8;
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
}

window.TrackSystem = TrackSystem;
