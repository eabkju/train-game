// track.js - Lightweight railway track: TubeGeometry rails, reduced sleepers, NO ballast wall
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
    this.buildBallastStrip();
  }

  initSpline() {
    const L = GAME_CONFIG.track.straightLength * 0.5; // 1200m each side
    const X = 280.0;
    const R = GAME_CONFIG.track.curveRadius; // 420m mild curve radius

    const points = [
      new THREE.Vector3( -X, 0.0, -L ),
      new THREE.Vector3( -X, 0.0, -L * 0.6 ),
      new THREE.Vector3( -X, 0.0, -L * 0.2 ),
      new THREE.Vector3( -X, 0.0,  L * 0.2 ),
      new THREE.Vector3( -X, 0.0,  L * 0.6 ),
      new THREE.Vector3( -X, 0.0,  L ),

      new THREE.Vector3( -X * 0.85, 0.0, L + R * 0.45 ),
      new THREE.Vector3( -X * 0.45, 0.0, L + R * 0.80 ),
      new THREE.Vector3(  0.0,      0.0, L + R * 0.95 ),
      new THREE.Vector3(  X * 0.45, 0.0, L + R * 0.80 ),
      new THREE.Vector3(  X * 0.85, 0.0, L + R * 0.45 ),

      new THREE.Vector3(  X, 0.0,  L ),
      new THREE.Vector3(  X, 0.0,  L * 0.6 ),
      new THREE.Vector3(  X, 0.0,  L * 0.2 ),
      new THREE.Vector3(  X, 0.0, -L * 0.2 ),
      new THREE.Vector3(  X, 0.0, -L * 0.6 ),
      new THREE.Vector3(  X, 0.0, -L ),

      new THREE.Vector3(  X * 0.85, 0.0, -L - R * 0.45 ),
      new THREE.Vector3(  X * 0.45, 0.0, -L - R * 0.80 ),
      new THREE.Vector3(  0.0,      0.0, -L - R * 0.95 ),
      new THREE.Vector3( -X * 0.45, 0.0, -L - R * 0.80 ),
      new THREE.Vector3( -X * 0.85, 0.0, -L - R * 0.45 )
    ];

    this.spline = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.15);
  }

  buildRails() {
    const halfGauge = GAME_CONFIG.track.gauge * 0.5;
    // Drastically reduced samples: 300 instead of 1200
    const samples = 300;

    const railMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.colors.rails,
      roughness: 0.28,
      metalness: 0.88
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

      // Use TubeGeometry with a simple round cross-section — far fewer verts than ExtrudeGeometry
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
    // Increased spacing from 0.85m to 2.4m — reduces instances ~3x
    const sleeperSpacing = 2.4;
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
    instancedSleepers.castShadow = false;
    instancedSleepers.receiveShadow = false;

    const dummy = new THREE.Object3D();

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

      // Store transform for physics/sound use
      this.sleeperTransforms.push({
        position: pos.clone(),
        tangent: tangent.clone(),
        normal: normal.clone(),
        index: i
      });
    }

    instancedSleepers.instanceMatrix.needsUpdate = true;
    this.trackGroup.add(instancedSleepers);
    // Tie plates removed — too many draw calls for minimal visual gain
  }

  buildBallastStrip() {
    // Replace the heavy ExtrudeGeometry ballast wall with a simple flat plane strip
    // This provides the visual of a gravel embankment without any 3D wall geometry
    const totalLength = this.spline.getLength();
    const spacing = 4.0; // One flat patch every 4m
    const count = Math.floor(totalLength / spacing);

    const patchW = GAME_CONFIG.track.ballastWidth + 3.0; // Slightly wider than track gauge
    const patchGeom = new THREE.PlaneGeometry(patchW, spacing * 1.1);
    patchGeom.rotateX(-Math.PI * 0.5);

    const patchMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.colors.ballast,
      roughness: 0.95,
      metalness: 0.02
    });

    const instancedBallast = new THREE.InstancedMesh(patchGeom, patchMat, count);
    instancedBallast.receiveShadow = false;

    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const u = i / count;
      const pos = this.spline.getPointAt(u);
      const tangent = this.spline.getTangentAt(u);

      dummy.position.copy(pos);
      dummy.position.y = 0.02; // Slightly above ground — no raised wall
      dummy.rotation.y = Math.atan2(tangent.x, tangent.z);
      dummy.updateMatrix();
      instancedBallast.setMatrixAt(i, dummy.matrix);
    }

    instancedBallast.instanceMatrix.needsUpdate = true;
    this.trackGroup.add(instancedBallast);
  }
}

window.TrackSystem = TrackSystem;
