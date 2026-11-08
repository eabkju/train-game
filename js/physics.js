// physics.js - Multi-car train kinematics, acceleration, deceleration & trailing carriage spline tracking
class TrainPhysics {
  constructor(trackSpline) {
    this.trackSpline = trackSpline;
    this.trackLength = trackSpline.getLength();

    // Kinematic states
    this.speed = 0.0;           // Current speed in m/s
    this.targetSpeed = 0.0;     // Target speed in m/s
    this.isRunning = false;      // Throttle state
    this.progress = 0.15;       // Normalized track parameter u in [0, 1)

    // Wheel rotation angle in radians
    this.wheelRotation = 0.0;

    // Locomotive Kinematics (Car 0)
    this.currentPosition = new THREE.Vector3();
    this.currentTangent = new THREE.Vector3();
    this.frontBogiePos = new THREE.Vector3();
    this.rearBogiePos = new THREE.Vector3();

    // 5 Trailing Carriages Kinematics (Cars 1 to 5)
    this.carriageCount = GAME_CONFIG.train.carriageCount || 5;
    this.carriageSpacing = GAME_CONFIG.train.carriageSpacing || 12.2;
    this.carriagesData = [];

    for (let i = 0; i < this.carriageCount; i++) {
      this.carriagesData.push({
        position: new THREE.Vector3(),
        tangent: new THREE.Vector3(),
        frontBogiePos: new THREE.Vector3(),
        rearBogiePos: new THREE.Vector3(),
        frontTangent: new THREE.Vector3(),
        rearTangent: new THREE.Vector3(),
        progress: 0.0
      });
    }

    // Cache physical limits
    this.maxSpeed = GAME_CONFIG.train.maxSpeed;
    this.acceleration = GAME_CONFIG.train.acceleration;
    this.deceleration = GAME_CONFIG.train.deceleration;
    this.friction = GAME_CONFIG.train.friction;
    this.wheelRadius = GAME_CONFIG.train.wheelRadius;
    this.locoBogieDist = GAME_CONFIG.train.bogieDistance;
    this.coachBogieDist = GAME_CONFIG.train.carriageBogieDist || 6.8;
  }

  toggleStartStop() {
    this.isRunning = !this.isRunning;
    this.targetSpeed = this.isRunning ? this.maxSpeed : 0.0;
    TrainAudio.setEngineActive(this.isRunning);
    return this.isRunning;
  }

  setRunning(run) {
    if (this.isRunning === run) return;
    this.isRunning = run;
    this.targetSpeed = this.isRunning ? this.maxSpeed : 0.0;
    TrainAudio.setEngineActive(this.isRunning);
  }

  update(dt) {
    const delta = Math.min(dt, 0.1);

    if (this.isRunning) {
      if (this.speed < this.targetSpeed) {
        this.speed = Math.min(this.speed + this.acceleration * delta, this.targetSpeed);
      }
    } else {
      if (this.speed > 0) {
        this.speed = Math.max(this.speed - (this.deceleration + this.friction) * delta, 0);
      }
    }

    // Distance traveled in meters
    const ds = this.speed * delta;

    if (ds > 0) {
      this.progress = (this.progress + ds / this.trackLength) % 1.0;
      this.wheelRotation += ds / this.wheelRadius;
    }

    // 1. Locomotive (Lead Vehicle) Position & Heading
    this.trackSpline.getPointAt(this.progress, this.currentPosition);
    this.trackSpline.getTangentAt(this.progress, this.currentTangent);

    // Locomotive Bogies
    const locoHalfBogieNorm = (this.locoBogieDist * 0.5) / this.trackLength;
    const fLocoU = (this.progress + locoHalfBogieNorm + 1.0) % 1.0;
    const rLocoU = (this.progress - locoHalfBogieNorm + 1.0) % 1.0;
    this.trackSpline.getPointAt(fLocoU, this.frontBogiePos);
    this.trackSpline.getPointAt(rLocoU, this.rearBogiePos);

    // 2. Trailing 5 Carriages - Exact Spline Tracking with Real Coupling Offsets
    const coachHalfBogieNorm = (this.coachBogieDist * 0.5) / this.trackLength;

    for (let i = 0; i < this.carriageCount; i++) {
      const carIndex = i + 1; // 1 to 5
      const offsetDist = carIndex * this.carriageSpacing;
      const carU = (this.progress - (offsetDist / this.trackLength) + 1.0) % 1.0;

      const data = this.carriagesData[i];
      data.progress = carU;

      // Carriage center
      this.trackSpline.getPointAt(carU, data.position);
      this.trackSpline.getTangentAt(carU, data.tangent);

      // Carriage front and rear bogies
      const fCarU = (carU + coachHalfBogieNorm + 1.0) % 1.0;
      const rCarU = (carU - coachHalfBogieNorm + 1.0) % 1.0;

      this.trackSpline.getPointAt(fCarU, data.frontBogiePos);
      this.trackSpline.getPointAt(rCarU, data.rearBogiePos);
      this.trackSpline.getTangentAt(fCarU, data.frontTangent);
      this.trackSpline.getTangentAt(rCarU, data.rearTangent);
    }

    // Notify Audio Engine
    TrainAudio.update(this.speed, this.speed > 0.05, delta);
  }

  getSpeedKmh() {
    return Math.round(this.speed * 3.6);
  }

  isMoving() {
    return this.speed > 0.05;
  }
}

window.TrainPhysics = TrainPhysics;
