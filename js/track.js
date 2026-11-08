// track.js - Continuous Infinity Loop (Figure-8) Railway Circuit
// Features a grade-separated bridge overpass (4.8m clearance), smooth mild curves, continuous ballast & sleepers
class TrackSystem {
  constructor(scene) {
    this.scene = scene;
    this.spline = null;
    this.trackGroup = new THREE.Group();
    this.scene.add(this.trackGroup);

    this.sleeperTransforms = [];

    this.initSpline();
    this.buildRails();
    this.buildSleepers();
    this.buildBridgeOverpass();
  }

  initSpline() {
    // Elegant Figure-8 Infinity Circuit (Lemniscate-grade continuous loop)
    // Train runs endlessly through two scenic village lobes and crosses over itself via a scenic bridge
    const L = 950.0; // Distance of each loop apex
    const W = 320.0; // Width of loop sweep

    const points = [
      // 1. Lower Track crossing center at Y = 0.0m (Ground level, heading South-East)
      new THREE.Vector3( -120.0, 0.0, -200.0 ),
      new THREE.Vector3(    0.0, 0.0,    0.0 ),
      new THREE.Vector3(  120.0, 0.0,  200.0 ),

      // 2. South Village Loop (Sweeping through lush paddy & mustard fields)
      new THREE.Vector3(  W * 0.7, 0.0,  500.0 ),
      new THREE.Vector3(  W,       0.0,  800.0 ),
      new THREE.Vector3(  W * 0.8, 0.0,  L + 120.0 ),
      new THREE.Vector3(  W * 0.4, 0.0,  L + 280.0 ),
      new THREE.Vector3(    0.0,   0.0,  L + 340.0 ),
      new THREE.Vector3( -W * 0.4, 0.0,  L + 280.0 ),
      new THREE.Vector3( -W * 0.8, 0.0,  L + 120.0 ),
      new THREE.Vector3( -W,       0.0,  800.0 ),

      // 3. Gentle incline climbing towards central railway bridge overpass
      new THREE.Vector3( -W * 0.65, 1.2, 500.0 ),
      new THREE.Vector3( -120.0,   3.2, 200.0 ),

      // 4. Upper Bridge Overpass at Y = 4.8m (Crossing directly over lower track at 0.0m)
      new THREE.Vector3(    0.0,   4.8,   0.0 ),

      // 5. Gentle decline into North Village Loop
      new THREE.Vector3(  120.0,   3.2, -200.0 ),
      new THREE.Vector3(  W * 0.65, 1.2, -500.0 ),

      // 6. North Village Loop (Sweeping through lush homesteads & ponds)
      new THREE.Vector3(  W,       0.0, -800.0 ),
      new THREE.Vector3(  W * 0.8, 0.0, -L - 120.0 ),
      new THREE.Vector3(  W * 0.4, 0.0, -L - 280.0 ),
      new THREE.Vector3(    0.0,   0.0, -L - 340.0 ),
      new THREE.Vector3( -W * 0.4, 0.0, -L - 280.0 ),
      new THREE.Vector3( -W * 0.8, 0.0, -L - 120.0 ),
      new THREE.Vector3( -W,       0.0, -800.0 ),
      new THREE.Vector3( -W * 0.7, 0.0, -500.0 )
    ];

    // Smooth closed 3D Catmull-Rom spline
    this.spline = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.15);
  }

  buildRails() {
    const halfGauge = GAME_CONFIG.track.gauge * 0.5;
    const samples = 350; // Optimized sample count for silky smooth curves

    const railMat = new THREE.MeshLambertMaterial({
      color: GAME_CONFIG.colors.rails
    });

    ['left', 'right'].forEach(side => {
      const offsetSign = side === 'left' ? -1 : 1;
      const offsetDist = halfGauge * offsetSign;
      const railCurvePoints = [];

      for (let i = 0; i <= samples; i++) {
        const u = i / samples;
        const pt = this.spline.getPointAt(u);
        const tangent = this.spline.getTangentAt(u);
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
        const railPt = pt.clone().add(normal.clone().multiplyScalar(offsetDist));
        railPt.y += GAME_CONFIG.track.sleeperHeight;
        railCurvePoints.push(railPt);
      }

      // Smooth tube geometry with 5 radial segments (fast & lightweight)
      const railCurve = new THREE.CatmullRomCurve3(railCurvePoints, true);
      const railGeom = new THREE.TubeGeometry(railCurve, samples, 0.045, 5, true);
      const railMesh = new THREE.Mesh(railGeom, railMat);
      railMesh.castShadow = false;
      railMesh.receiveShadow = false;
      this.trackGroup.add(railMesh);
    });
  }

  buildSleepers() {
    const totalLength = this.spline.getLength();
    const sleeperSpacing = 2.4;
    const count = Math.floor(totalLength / sleeperSpacing);

    const sleeperGeom = new THREE.BoxGeometry(
      GAME_CONFIG.track.sleeperWidth,
      GAME_CONFIG.track.sleeperHeight,
      GAME_CONFIG.track.sleeperDepth
    );

    const sleeperMat = new THREE.MeshLambertMaterial({
      color: GAME_CONFIG.colors.sleepers
    });

    const instancedSleepers = new THREE.InstancedMesh(sleeperGeom, sleeperMat, count);
    instancedSleepers.castShadow = false;
    instancedSleepers.receiveShadow = false;

    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const u = i / count;
      const pos = this.spline.getPointAt(u);
      const tangent = this.spline.getTangentAt(u);

      dummy.position.copy(pos);
      dummy.position.y += GAME_CONFIG.track.sleeperHeight * 0.5;

      // Align pitch and yaw with track 3D elevation
      const pitch = -Math.atan2(tangent.y, Math.hypot(tangent.x, tangent.z));
      dummy.rotation.set(pitch, Math.atan2(tangent.x, tangent.z), 0, 'YXZ');
      dummy.updateMatrix();
      instancedSleepers.setMatrixAt(i, dummy.matrix);

      this.sleeperTransforms.push({
        position: pos.clone(),
        tangent: tangent.clone(),
        index: i
      });
    }

    instancedSleepers.instanceMatrix.needsUpdate = true;
    this.trackGroup.add(instancedSleepers);
  }

  // Scenic Steel Girder Bridge at the Center Crossing (where upper track flies over lower track)
  buildBridgeOverpass() {
    const concreteMat = new THREE.MeshLambertMaterial({ color: 0x8a847c });
    const steelMat = new THREE.MeshLambertMaterial({ color: 0x3d4b54 });

    // Concrete bridge pier pillars supporting the upper track
    [-1.8, 1.8].forEach(px => {
      const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 4.6, 8), concreteMat);
      pier.position.set(px, 2.3, 0);
      this.trackGroup.add(pier);
    });

    // Steel Girder Bed under upper track
    const girder = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, 45.0), steelMat);
    girder.position.set(0, 4.45, 0);
    // Align with upper track crossing angle
    girder.rotation.y = -Math.atan2(120, 200);
    this.trackGroup.add(girder);

    // Steel side railings along the bridge
    [-1.9, 1.9].forEach(gx => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 44.0), steelMat);
      rail.position.set(gx, 5.15, 0);
      rail.rotation.y = -Math.atan2(120, 200);
      this.trackGroup.add(rail);
    });
  }
}

window.TrackSystem = TrackSystem;
