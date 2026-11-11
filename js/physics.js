// physics.js - Zero-Allocation Multi-Car Train Kinematics using Pre-Baked O(1) Track Lookup
class TrainPhysics {
    constructor(trackSystem) {
        this.trackSystem = trackSystem;
        this.trackSpline = trackSystem.spline;
        this.trackLength = trackSystem.totalLength;

        // Kinematic states
        this.speed = 0.0;                  // Current speed in m/s
        this.targetSpeed = 0.0;            // Target speed in m/s
        this.throttleFraction = 0.85;      // User throttle setting (0.2 to 1.0)
        this.isRunning = false;            // Throttle active state
        this.progress = 0.02;              // Normalized track parameter u in [0, 1)
        this.wheelRotation = 0.0;          // Wheel rotation in radians

        // Locomotive Kinematics (Car 0)
        this.currentPosition = new THREE.Vector3();
        this.currentTangent = new THREE.Vector3();
        this.frontBogiePos = new THREE.Vector3();
        this.rearBogiePos = new THREE.Vector3();
        this.frontBogieTan = new THREE.Vector3();
        this.rearBogieTan = new THREE.Vector3();

        // 5 Trailing Carriages Kinematics (Cars 1 to 5)
        this.carriageCount = GAME_CONFIG.train.carriageCount || 5;
        this.carriageSpacing = GAME_CONFIG.train.carriageSpacing || 12.3;
        this.carriagesData = [];

        for (let i = 0; i < this.carriageCount; i++) {
            this.carriagesData.push({
                position: new THREE.Vector3(),
                tangent: new THREE.Vector3(),
                frontBogiePos: new THREE.Vector3(),
                rearBogiePos: new THREE.Vector3(),
                frontTangent: new THREE.Vector3(),
                rearTangent: new THREE.Vector3(),
                wheelRotation: 0.0,
                progress: 0.02
            });
        }

        // Compute initial positions once at boot
        this._syncAllCarPositions();
    }

    setRunning(isRunning) {
        this.isRunning = isRunning;
        this.targetSpeed = isRunning ? (GAME_CONFIG.train.maxSpeed * this.throttleFraction) : 0.0;
    }

    setThrottleFraction(fraction) {
        this.throttleFraction = Math.max(0.2, Math.min(1.0, fraction));
        if (this.isRunning) {
            this.targetSpeed = GAME_CONFIG.train.maxSpeed * this.throttleFraction;
        }
    }

    setTargetSpeed(targetSpeed) {
        this.targetSpeed = Math.max(0.0, Math.min(GAME_CONFIG.train.maxSpeed, targetSpeed));
    }

    update(dt) {
        const delta = Math.min(dt, 0.1);

        // Smooth acceleration / braking dynamics
        if (this.speed < this.targetSpeed) {
            this.speed += GAME_CONFIG.train.acceleration * delta;
            if (this.speed > this.targetSpeed) this.speed = this.targetSpeed;
        } else if (this.speed > this.targetSpeed) {
            const decelRate = this.targetSpeed === 0.0
                ? GAME_CONFIG.train.deceleration
                : GAME_CONFIG.train.friction * 2.5;
            this.speed -= decelRate * delta;
            if (this.speed < this.targetSpeed) this.speed = this.targetSpeed;
        }

        // Skip spline updates completely if stationary (saves CPU!)
        if (this.speed <= 0.0001) {
            this.speed = 0.0;
            return false; // Indicates no movement occurred
        }

        const distanceDelta = this.speed * delta;
        this.wheelRotation += distanceDelta / GAME_CONFIG.train.wheelRadius;

        const deltaU = distanceDelta / this.trackLength;
        this.progress = (this.progress + deltaU) % 1.0;

        this._syncAllCarPositions();
        return true;
    }

    _syncAllCarPositions() {
        // 1. Locomotive
        this._updateCarKinematics(
            this.progress,
            GAME_CONFIG.train.bogieDistance,
            this.currentPosition,
            this.currentTangent,
            this.frontBogiePos,
            this.rearBogiePos,
            this.frontBogieTan,
            this.rearBogieTan
        );

        // 2. Trailing Passenger Carriages
        const bogieDist = GAME_CONFIG.train.carriageBogieDist || GAME_CONFIG.train.bogieDistance;
        for (let i = 0; i < this.carriageCount; i++) {
            const carOffsetMeters = (i + 1) * this.carriageSpacing;
            let carProgress = (this.progress - (carOffsetMeters / this.trackLength)) % 1.0;
            if (carProgress < 0) carProgress += 1.0;

            const car = this.carriagesData[i];
            car.progress = carProgress;
            car.wheelRotation = this.wheelRotation;

            this._updateCarKinematics(
                carProgress,
                bogieDist,
                car.position,
                car.tangent,
                car.frontBogiePos,
                car.rearBogiePos,
                car.frontTangent,
                car.rearTangent
            );
        }
    }

    _updateCarKinematics(uCenter, bogieDist, outCenterPos, outTangent, outFrontBogie, outRearBogie, outFrontTan, outRearTan) {
        const halfBogieU = (bogieDist * 0.5) / this.trackLength;

        let uFront = (uCenter + halfBogieU) % 1.0;
        let uRear = (uCenter - halfBogieU) % 1.0;
        if (uFront < 0) uFront += 1.0;
        if (uRear < 0) uRear += 1.0;

        this.trackSystem.samplePoint(uFront, outFrontBogie);
        this.trackSystem.samplePoint(uRear, outRearBogie);
        this.trackSystem.sampleTangent(uFront, outFrontTan);
        this.trackSystem.sampleTangent(uRear, outRearTan);

        outCenterPos.x = (outFrontBogie.x + outRearBogie.x) * 0.5;
        outCenterPos.y = (outFrontBogie.y + outRearBogie.y) * 0.5;
        outCenterPos.z = (outFrontBogie.z + outRearBogie.z) * 0.5;

        const dx = outFrontBogie.x - outRearBogie.x;
        const dy = outFrontBogie.y - outRearBogie.y;
        const dz = outFrontBogie.z - outRearBogie.z;
        const len = Math.hypot(dx, dy, dz) || 1.0;
        outTangent.x = dx / len;
        outTangent.y = dy / len;
        outTangent.z = dz / len;
    }

    getKmh() {
        return Math.round(this.speed * 3.6);
    }

    getSpeedRatio() {
        return Math.min(1.0, this.speed / GAME_CONFIG.train.maxSpeed);
    }
}
