// physics.js - Train kinematics, acceleration, deceleration, and spline-following physics
class TrainPhysics {
  constructor(trackSpline) {
    this.trackSpline = trackSpline;
    this.trackLength = trackSpline.getLength();

    // Kinematic states
    this.speed = 0.0;           // Current speed in m/s
    this.targetSpeed = 0.0;     // Target speed in m/s
    this.isRunning = false;      // Engine / throttle state
    this.progress = 0.05;       // Normalized track parameter u in [0, 1)

    // Wheel rotation angle in radians
    this.wheelRotation = 0.0;

    // Smoothed values for rendering
    this.currentPosition = new THREE.Vector3();
    this.currentTangent = new THREE.Vector3();
    this.frontBogiePos = new THREE.Vector3();
    this.rearBogiePos = new THREE.Vector3();

    // Cache config
    this.maxSpeed = GAME_CONFIG.train.maxSpeed;
    this.acceleration = GAME_CONFIG.train.acceleration;
    this.deceleration = GAME_CONFIG.train.deceleration;
    this.friction = GAME_CONFIG.train.friction;
    this.wheelRadius = GAME_CONFIG.train.wheelRadius;
    this.bogieDist = GAME_CONFIG.train.bogieDistance;
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
    // Clamp delta time to avoid large physics steps
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
      // Advance spline progress
      this.progress = (this.progress + ds / this.trackLength) % 1.0;

      // Rotate wheels based on exact distance traveled
      this.wheelRotation += ds / this.wheelRadius;
    }

    // Calculate main locomotive position and orientation on track
    this.trackSpline.getPointAt(this.progress, this.currentPosition);
    this.trackSpline.getTangentAt(this.progress, this.currentTangent);

    // Calculate bogie positions for realistic articulated bogie turning
    const halfBogieDistNorm = (this.bogieDist * 0.5) / this.trackLength;
    const frontU = (this.progress + halfBogieDistNorm + 1.0) % 1.0;
    const rearU = (this.progress - halfBogieDistNorm + 1.0) % 1.0;

    this.trackSpline.getPointAt(frontU, this.frontBogiePos);
    this.trackSpline.getPointAt(rearU, this.rearBogiePos);

    // Notify audio engine
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
