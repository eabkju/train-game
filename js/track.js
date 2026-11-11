// track.js - Continuous Figure-8 Infinity Railway Circuit with O(1) Pre-Baked Float32Array Lookup
// Features: Single-pass continuous ballast embankment ribbon, dual Vignoles steel rails, instanced sleepers, and Steel Truss Overpass Bridge
class TrackSystem {
    constructor(scene) {
        this.scene = scene;
        this.spline = null;
        this.totalLength = 0;
        this.trackGroup = new THREE.Group();
        this.scene.add(this.trackGroup);

        // Pre-baked O(1) Lookup Buffers (Zero per-frame Catmull-Rom polynomial math!)
        this.N = GAME_CONFIG.track.lookupSamples || 4096;
        this.X = new Float32Array(this.N + 1);
        this.Y = new Float32Array(this.N + 1);
        this.Z = new Float32Array(this.N + 1);
        this.TX = new Float32Array(this.N + 1);
        this.TY = new Float32Array(this.N + 1);
        this.TZ = new Float32Array(this.N + 1);

        this.initSplineAndBakeTable();
        this.buildBallastAndEmbankment();
        this.buildRails();
        this.buildSleepers();
        this.buildBridgeOverpass();
    }

    initSplineAndBakeTable() {
        const L = 950.0;
        const W = 320.0;

        const points = [
            // 1. Lower Track crossing center at Y = 0.0m (Ground level, heading South-East)
            new THREE.Vector3( -120.0, 0.0, -200.0 ),
            new THREE.Vector3(    0.0, 0.0,    0.0 ),
            new THREE.Vector3(  120.0, 0.0,  200.0 ),

            // 2. South Village Loop
            new THREE.Vector3( W * 0.7, 0.0,   500.0 ),
            new THREE.Vector3( W      , 0.0,   800.0 ),
            new THREE.Vector3( W * 0.8, 0.0, L + 120.0 ),
            new THREE.Vector3( W * 0.4, 0.0, L + 280.0 ),
            new THREE.Vector3(     0.0, 0.0, L + 340.0 ),
            new THREE.Vector3(-W * 0.4, 0.0, L + 280.0 ),
            new THREE.Vector3(-W * 0.8, 0.0, L + 120.0 ),
            new THREE.Vector3(-W      , 0.0,   800.0 ),

            // 3. Gentle incline climbing towards central railway bridge overpass
            new THREE.Vector3(-W * 0.65, 1.3, 500.0 ),
            new THREE.Vector3(  -120.0,  3.4, 200.0 ),

            // 4. Upper Bridge Overpass at Y = 5.0m (Crossing directly over lower track at 0.0m)
            new THREE.Vector3(     0.0,  5.0,   0.0 ),

            // 5. Gentle decline into North Village Loop
            new THREE.Vector3(   120.0,  3.4, -200.0 ),
            new THREE.Vector3( W * 0.65, 1.3, -500.0 ),

            // 6. North Village Loop
            new THREE.Vector3( W      , 0.0, -800.0 ),
            new THREE.Vector3( W * 0.8, 0.0, -L - 120.0 ),
            new THREE.Vector3( W * 0.4, 0.0, -L - 280.0 ),
            new THREE.Vector3(     0.0, 0.0, -L - 340.0 ),
            new THREE.Vector3(-W * 0.4, 0.0, -L - 280.0 ),
            new THREE.Vector3(-W * 0.8, 0.0, -L - 120.0 ),
            new THREE.Vector3(-W      , 0.0, -800.0 ),
            new THREE.Vector3(-W * 0.7, 0.0, -500.0 )
        ];

        this.spline = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.15);
        this.spline.arcLengthDivisions = 4000;
        this.totalLength = this.spline.getLength();

        // Pre-bake N uniform samples once at initialization
        const pt = new THREE.Vector3();
        const tan = new THREE.Vector3();
        for (let i = 0; i <= this.N; i++) {
            const u = i / this.N;
            this.spline.getPointAt(u, pt);
            this.spline.getTangentAt(u, tan);
            this.X[i] = pt.x;
            this.Y[i] = pt.y;
            this.Z[i] = pt.z;
            this.TX[i] = tan.x;
            this.TY[i] = tan.y;
            this.TZ[i] = tan.z;
        }
    }

    // O(1) Zero-Allocation Position Lookup
    samplePoint(u, outVec) {
        let normU = u % 1.0;
        if (normU < 0) normU += 1.0;
        const f = normU * this.N;
        const i = Math.min(this.N - 1, f | 0);
        const t = f - i;
        outVec.x = this.X[i] + (this.X[i + 1] - this.X[i]) * t;
        outVec.y = this.Y[i] + (this.Y[i + 1] - this.Y[i]) * t;
        outVec.z = this.Z[i] + (this.Z[i + 1] - this.Z[i]) * t;
        return outVec;
    }

    // O(1) Zero-Allocation Tangent Lookup
    sampleTangent(u, outVec) {
        let normU = u % 1.0;
        if (normU < 0) normU += 1.0;
        const f = normU * this.N;
        const i = Math.min(this.N - 1, f | 0);
        const t = f - i;
        const tx = this.TX[i] + (this.TX[i + 1] - this.TX[i]) * t;
        const ty = this.TY[i] + (this.TY[i + 1] - this.TY[i]) * t;
        const tz = this.TZ[i] + (this.TZ[i + 1] - this.TZ[i]) * t;
        const len = Math.hypot(tx, ty, tz) || 1.0;
        outVec.x = tx / len;
        outVec.y = ty / len;
        outVec.z = tz / len;
        return outVec;
    }

    // Fast Track Safety Clearance Check (ensures trees, cottages & farms never encroach on tracks)
    getMinDistanceToTrack(x, z, step = 16) {
        let minSq = Infinity;
        for (let i = 0; i <= this.N; i += step) {
            const dx = x - this.X[i];
            const dz = z - this.Z[i];
            const sq = dx * dx + dz * dz;
            if (sq < minSq) minSq = sq;
        }
        return Math.sqrt(minSq);
    }

    // Builds a single-draw-call procedural crushed stone ballast & embankment ribbon
    buildBallastAndEmbankment() {
        const samples = 640;
        const topHalf = (GAME_CONFIG.track.ballastTopWidth || 3.4) * 0.5;
        const baseHalf = (GAME_CONFIG.track.ballastBaseWidth || 5.4) * 0.5;

        // Procedural gravel texture
        const c = document.createElement('canvas');
        c.width = 128; c.height = 128;
        const g = c.getContext('2d');
        g.fillStyle = '#4c4741';
        g.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 650; i++) {
            const shade = 52 + ((i * 37) % 42);
            g.fillStyle = `rgb(${shade},${shade - 3},${shade - 7})`;
            g.fillRect((i * 73) % 126, (i * 41) % 126, 3, 3);
        }
        const gravelTex = new THREE.CanvasTexture(c);
        gravelTex.wrapS = THREE.RepeatWrapping;
        gravelTex.wrapT = THREE.RepeatWrapping;
        gravelTex.repeat.set(1, 220);

        // 4 vertices per cross-section: left-base, left-top, right-top, right-base
        const vCount = (samples + 1) * 4;
        const pos = new Float32Array(vCount * 3);
        const uvs = new Float32Array(vCount * 2);
        const indices = new Uint32Array(samples * 18);

        const pt = new THREE.Vector3();
        const tan = new THREE.Vector3();

        for (let i = 0; i <= samples; i++) {
            const u = i / samples;
            this.samplePoint(u, pt);
            this.sampleTangent(u, tan);

            const nx = -tan.z;
            const nz = tan.x;
            const nLen = Math.hypot(nx, nz) || 1;
            const rx = nx / nLen;
            const rz = nz / nLen;

            // On bridge section (pt.y > 0.6), narrow the embankment to fit inside the steel bridge deck
            const bridgeFactor = Math.min(1.0, Math.max(0.0, (pt.y - 0.5) / 1.5));
            const curBaseHalf = baseHalf * (1.0 - bridgeFactor * 0.42);
            const curBaseY = pt.y > 0.6 ? pt.y - 0.12 : -0.25;
            const curTopY = pt.y + 0.04;

            const baseIdx = i * 12;
            // 0: Left base
            pos[baseIdx]     = pt.x - rx * curBaseHalf;
            pos[baseIdx + 1] = curBaseY;
            pos[baseIdx + 2] = pt.z - rz * curBaseHalf;
            // 1: Left top
            pos[baseIdx + 3] = pt.x - rx * topHalf;
            pos[baseIdx + 4] = curTopY;
            pos[baseIdx + 5] = pt.z - rz * topHalf;
            // 2: Right top
            pos[baseIdx + 6] = pt.x + rx * topHalf;
            pos[baseIdx + 7] = curTopY;
            pos[baseIdx + 8] = pt.z + rz * topHalf;
            // 3: Right base
            pos[baseIdx + 9]  = pt.x + rx * curBaseHalf;
            pos[baseIdx + 10] = curBaseY;
            pos[baseIdx + 11] = pt.z + rz * curBaseHalf;

            const uvIdx = i * 8;
            uvs[uvIdx] = 0.0; uvs[uvIdx + 1] = u;
            uvs[uvIdx + 2] = 0.25; uvs[uvIdx + 3] = u;
            uvs[uvIdx + 4] = 0.75; uvs[uvIdx + 5] = u;
            uvs[uvIdx + 6] = 1.0; uvs[uvIdx + 7] = u;

            if (i < samples) {
                const r0 = i * 4;
                const r1 = (i + 1) * 4;
                const k = i * 18;
                // Left slope
                indices[k]     = r0;     indices[k + 1] = r1;     indices[k + 2] = r0 + 1;
                indices[k + 3] = r0 + 1; indices[k + 4] = r1;     indices[k + 5] = r1 + 1;
                // Top bed
                indices[k + 6] = r0 + 1; indices[k + 7] = r1 + 1; indices[k + 8] = r0 + 2;
                indices[k + 9] = r0 + 2; indices[k + 10] = r1 + 1; indices[k + 11] = r1 + 2;
                // Right slope
                indices[k + 12] = r0 + 2; indices[k + 13] = r1 + 2; indices[k + 14] = r0 + 3;
                indices[k + 15] = r0 + 3; indices[k + 16] = r1 + 2; indices[k + 17] = r1 + 3;
            }
        }

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geom.setIndex(new THREE.BufferAttribute(indices, 1));
        geom.computeVertexNormals();

        const ballastMesh = new THREE.Mesh(
            geom,
            new THREE.MeshLambertMaterial({ map: gravelTex })
        );
        this.trackGroup.add(ballastMesh);
    }

    buildRails() {
        const halfGauge = GAME_CONFIG.track.gauge * 0.5;
        const samples = 480;

        const railMat = new THREE.MeshLambertMaterial({
            color: GAME_CONFIG.colors.rails,
            emissive: 0x1a2026
        });

        const pt = new THREE.Vector3();
        const tan = new THREE.Vector3();

        [-1, 1].forEach(offsetSign => {
            const offsetDist = halfGauge * offsetSign;
            const railCurvePoints = [];

            for (let i = 0; i <= samples; i++) {
                const u = i / samples;
                this.samplePoint(u, pt);
                this.sampleTangent(u, tan);
                const nx = -tan.z;
                const nz = tan.x;
                const nLen = Math.hypot(nx, nz) || 1;
                railCurvePoints.push(new THREE.Vector3(
                    pt.x + (nx / nLen) * offsetDist,
                    pt.y + GAME_CONFIG.track.sleeperHeight + 0.03,
                    pt.z + (nz / nLen) * offsetDist
                ));
            }

            const railCurve = new THREE.CatmullRomCurve3(railCurvePoints, true);
            const railGeom = new THREE.TubeGeometry(railCurve, samples, 0.048, 5, true);
            const railMesh = new THREE.Mesh(railGeom, railMat);
            this.trackGroup.add(railMesh);
        });
    }

    buildSleepers() {
        const sleeperSpacing = GAME_CONFIG.track.sleeperSpacing || 1.4;
        const count = Math.floor(this.totalLength / sleeperSpacing);

        const sleeperGeom = new THREE.BoxGeometry(
            GAME_CONFIG.track.sleeperWidth,
            GAME_CONFIG.track.sleeperHeight,
            GAME_CONFIG.track.sleeperDepth
        );

        const sleeperMat = new THREE.MeshLambertMaterial({
            color: GAME_CONFIG.colors.sleepers
        });

        const instancedSleepers = new THREE.InstancedMesh(sleeperGeom, sleeperMat, count);
        const dummy = new THREE.Object3D();
        const pos = new THREE.Vector3();
        const tangent = new THREE.Vector3();

        for (let i = 0; i < count; i++) {
            const u = i / count;
            this.samplePoint(u, pos);
            this.sampleTangent(u, tangent);

            dummy.position.set(pos.x, pos.y + GAME_CONFIG.track.sleeperHeight * 0.5, pos.z);
            const pitch = -Math.atan2(tangent.y, Math.hypot(tangent.x, tangent.z));
            dummy.rotation.set(pitch, Math.atan2(tangent.x, tangent.z), 0, 'YXZ');
            dummy.updateMatrix();
            instancedSleepers.setMatrixAt(i, dummy.matrix);
        }

        instancedSleepers.instanceMatrix.needsUpdate = true;
        this.trackGroup.add(instancedSleepers);
    }

    // Grand Steel Truss & Concrete Pier Overpass Bridge at the Center Crossing
    buildBridgeOverpass() {
        const bridgeGroup = new THREE.Group();
        const concreteMat = new THREE.MeshLambertMaterial({ color: 0x8e887f });
        const steelMat = new THREE.MeshLambertMaterial({ color: 0x2c4252 });
        const accentMat = new THREE.MeshLambertMaterial({ color: 0xc4a76c });

        const bridgeAngle = -Math.atan2(120, 200);
        bridgeGroup.rotation.y = bridgeAngle;

        // 1. Concrete support piers (placed clear of the lower track)
        [-14, 14, -32, 32].forEach(zOff => {
            [-2.1, 2.1].forEach(xOff => {
                const h = Math.abs(zOff) < 20 ? 4.8 : 4.2;
                const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.72, h, 8), concreteMat);
                pier.position.set(xOff, h * 0.5 - 0.1, zOff);
                bridgeGroup.add(pier);
            });
            const cap = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.45, 1.4), concreteMat);
            cap.position.set(0, Math.abs(zOff) < 20 ? 4.55 : 3.95, zOff);
            bridgeGroup.add(cap);
        });

        // 2. Main bridge deck & side girders
        const deck = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.45, 76.0), steelMat);
        deck.position.set(0, 4.72, 0);
        bridgeGroup.add(deck);

        // 3. Overhead steel truss arches along central span (-22m to +22m)
        [-2.25, 2.25].forEach(xSide => {
            // Bottom & top chords
            const bottomChord = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 76.0), steelMat);
            bottomChord.position.set(xSide, 5.1, 0);
            bridgeGroup.add(bottomChord);

            const topChord = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 44.0), steelMat);
            topChord.position.set(xSide, 8.8, 0);
            bridgeGroup.add(topChord);

            // Vertical & diagonal truss struts
            for (let z = -20; z <= 20; z += 5) {
                const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.8, 0.2), steelMat);
                post.position.set(xSide, 6.95, z);
                bridgeGroup.add(post);

                if (z < 20) {
                    const diag = new THREE.Mesh(new THREE.BoxGeometry(0.14, 6.1, 0.14), accentMat);
                    diag.position.set(xSide, 6.95, z + 2.5);
                    diag.rotation.x = (z % 10 === 0) ? 0.72 : -0.72;
                    bridgeGroup.add(diag);
                }
            }
        });

        // Overhead lateral portal beams
        for (let z = -20; z <= 20; z += 10) {
            const portal = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.24, 0.28), steelMat);
            portal.position.set(0, 8.8, z);
            bridgeGroup.add(portal);
        }

        this.trackGroup.add(bridgeGroup);
    }
}
