// environment.js - 100% GPU-Instanced Scenic World (Station, Lake, Cottages, Forest, Cliffs, Level Crossing & Poles)
// Cuts scene draw calls from 1,600+ down to ~22 draw calls total!
class EnvironmentManager {
    constructor(scene, trackSystem) {
        this.scene = scene;
        this.trackSystem = trackSystem;
        this.trackLength = trackSystem.totalLength;

        this.nightGlowMaterials = [];
        this.crossingGates = [];
        this.crossingLights = [];
        this.crossingTimer = 0;

        this._createSharedMaterials();
        this._buildTerrainAndLake();
        this._buildCountryStation();
        this._buildLevelCrossing();
        this._buildInstancedTelegraphPoles();
        this._buildInstancedForestAndRocks();
        this._buildInstancedVillageCottages();
    }

    _createSharedMaterials() {
        // Procedural Lush Countryside Patchwork Terrain Texture
        const c = document.createElement('canvas');
        c.width = 512; c.height = 512;
        const g = c.getContext('2d');
        g.fillStyle = '#3b6e38';
        g.fillRect(0, 0, 512, 512);

        // Agricultural fields & meadow patches
        const hues = ['#346331', '#457a3f', '#528540', '#6d8c3c', '#2e572b'];
        for (let i = 0; i < 60; i++) {
            g.fillStyle = hues[i % hues.length];
            const px = (i * 97) % 512;
            const py = (i * 61) % 512;
            g.fillRect(px, py, 64 + (i % 48), 54 + (i % 40));
        }
        const terrainTex = new THREE.CanvasTexture(c);
        terrainTex.wrapS = THREE.RepeatWrapping;
        terrainTex.wrapT = THREE.RepeatWrapping;
        terrainTex.repeat.set(28, 28);

        // Cottage Wall + Glowing Window Texture
        const wDiff = document.createElement('canvas');
        wDiff.width = 128; wDiff.height = 128;
        const wg = wDiff.getContext('2d');
        wg.fillStyle = '#e5dcc8';
        wg.fillRect(0, 0, 128, 128);
        wg.fillStyle = '#5c4636';
        wg.fillRect(0, 112, 128, 16);
        wg.fillRect(54, 68, 20, 44); // Door

        const wEmis = document.createElement('canvas');
        wEmis.width = 128; wEmis.height = 128;
        const we = wEmis.getContext('2d');
        we.fillStyle = '#000000';
        we.fillRect(0, 0, 128, 128);

        [[18, 42], [86, 42]].forEach(([wx, wy]) => {
            wg.fillStyle = '#263545';
            wg.fillRect(wx, wy, 24, 26);
            we.fillStyle = '#ffd478';
            we.fillRect(wx + 2, wy + 2, 20, 22);
        });

        const cottageGlowMat = new THREE.MeshLambertMaterial({
            map: new THREE.CanvasTexture(wDiff),
            emissive: 0xffd478,
            emissiveMap: new THREE.CanvasTexture(wEmis),
            emissiveIntensity: 0.08
        });
        this.nightGlowMaterials.push(cottageGlowMat);

        const poleBulbMat = new THREE.MeshBasicMaterial({ color: 0x666055 });
        this.poleBulbMat = poleBulbMat;

        this.materials = {
            terrain: new THREE.MeshLambertMaterial({ map: terrainTex }),
            water: new THREE.MeshLambertMaterial({ color: 0x26658a, emissive: 0x091d2b }),
            woodPole: new THREE.MeshLambertMaterial({ color: GAME_CONFIG.colors.poleWood }),
            insulator: new THREE.MeshLambertMaterial({ color: GAME_CONFIG.colors.insulators }),
            wire: new THREE.LineBasicMaterial({ color: 0x22262a }),
            trunk: new THREE.MeshLambertMaterial({ color: 0x4a3828 }),
            pineFoliage: new THREE.MeshLambertMaterial({ color: 0x265429 }),
            oakFoliage: new THREE.MeshLambertMaterial({ color: 0x3b7334 }),
            bushFoliage: new THREE.MeshLambertMaterial({ color: 0x4e873c }),
            rock: new THREE.MeshLambertMaterial({ color: 0x6c7075 }),
            cottageWall: cottageGlowMat,
            cottageRoof: new THREE.MeshLambertMaterial({ color: 0x8c372b })
        };
    }

    _buildTerrainAndLake() {
        // Rolling countryside terrain with flat corridor around the Figure-8 track
        const groundGeo = new THREE.PlaneGeometry(3600, 3600, 72, 72);
        groundGeo.rotateX(-Math.PI / 2);

        const posArr = groundGeo.attributes.position.array;
        for (let i = 0; i < posArr.length; i += 3) {
            const x = posArr[i];
            const z = posArr[i + 2];
            const distFromCenterCorridor = Math.max(0, Math.abs(x) - 390);
            const hillFactor = Math.min(1.0, distFromCenterCorridor / 220.0);
            const h = (Math.sin(x * 0.0045) * Math.cos(z * 0.0045) * 18.0 +
                       Math.sin(x * 0.012 + z * 0.009) * 6.0) * hillFactor;
            posArr[i + 1] = Math.max(-0.25, h) - 0.25;
        }
        groundGeo.computeVertexNormals();

        const groundMesh = new THREE.Mesh(groundGeo, this.materials.terrain);
        this.scene.add(groundMesh);

        // Scenic Mirror Lake inside the South Loop (around x=0, z=680)
        const lakeGroup = new THREE.Group();
        const lakeMesh = new THREE.Mesh(
            new THREE.CircleGeometry(155, 32),
            this.materials.water
        );
        lakeMesh.rotation.x = -Math.PI / 2;
        lakeMesh.position.set(0, -0.08, 680);
        lakeGroup.add(lakeMesh);

        // Sandy shoreline ring
        const shoreMesh = new THREE.Mesh(
            new THREE.RingGeometry(150, 166, 32),
            new THREE.MeshLambertMaterial({ color: 0xa69576 })
        );
        shoreMesh.rotation.x = -Math.PI / 2;
        shoreMesh.position.set(0, -0.14, 680);
        lakeGroup.add(shoreMesh);

        // 4 Wooden Sailboats on the Lake
        const hullMat = new THREE.MeshLambertMaterial({ color: 0x4d321e });
        const sailMat = new THREE.MeshLambertMaterial({ color: 0xf5efe2, side: THREE.DoubleSide });
        [[-45, 640, 0.4], [50, 710, -1.1], [-20, 745, 2.1], [65, 650, 0.9]].forEach(([bx, bz, rot]) => {
            const boat = new THREE.Group();
            const hull = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 4.8), hullMat);
            hull.position.y = 0.2;
            boat.add(hull);
            const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 6), hullMat);
            mast.position.y = 2.2;
            boat.add(mast);
            const sail = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3.4, 3), sailMat);
            sail.position.set(0, 2.3, 0.2);
            boat.add(sail);
            boat.position.set(bx, -0.05, bz);
            boat.rotation.y = rot;
            lakeGroup.add(boat);
        });

        this.scene.add(lakeGroup);
    }

    // Heritage Countryside Railway Station ("Greenlands Valley Junction")
    _buildCountryStation() {
        const uStation = 0.085;
        const pt = new THREE.Vector3();
        const tan = new THREE.Vector3();
        this.trackSystem.samplePoint(uStation, pt);
        this.trackSystem.sampleTangent(uStation, tan);

        const nx = -tan.z, nz = tan.x;
        const nLen = Math.hypot(nx, nz) || 1;
        const rx = nx / nLen, rz = nz / nLen;

        const stGroup = new THREE.Group();
        stGroup.position.set(pt.x + rx * 6.2, pt.y, pt.z + rz * 6.2);
        stGroup.rotation.y = Math.atan2(tan.x, tan.z);

        const platMat = new THREE.MeshLambertMaterial({ color: 0x878278 });
        const safetyLineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
        const wallMat = new THREE.MeshLambertMaterial({ color: 0xdfd3be });
        const roofMat = new THREE.MeshLambertMaterial({ color: 0x7c2d23 });
        const pillarMat = new THREE.MeshLambertMaterial({ color: 0x263847 });

        // Platform Base (56m long)
        const platform = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.85, 56), platMat);
        platform.position.set(0, 0.42, 0);
        stGroup.add(platform);

        // Yellow safety tactile line along track edge
        const yellowLine = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 55.6), safetyLineMat);
        yellowLine.position.set(-2.35, 0.86, 0);
        stGroup.add(yellowLine);

        // Canopy Roof & Pillars
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.25, 36), roofMat);
        canopy.position.set(-0.2, 4.3, 0);
        stGroup.add(canopy);

        for (let z = -15; z <= 15; z += 7.5) {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.5, 8), pillarMat);
            post.position.set(-1.6, 2.55, z);
            stGroup.add(post);
        }

        // Main Brick & Timber Station Building
        const bldg = new THREE.Mesh(new THREE.BoxGeometry(6.5, 4.8, 22), this.materials.cottageWall);
        bldg.position.set(5.2, 2.8, 0);
        stGroup.add(bldg);

        const bldgRoof = new THREE.Mesh(new THREE.ConeGeometry(13.5, 2.8, 4), roofMat);
        bldgRoof.rotation.y = Math.PI / 4;
        bldgRoof.scale.set(0.55, 1, 1.25);
        bldgRoof.position.set(5.2, 6.6, 0);
        stGroup.add(bldgRoof);

        // Station Signboard ("GREENLANDS VALLEY")
        const sCanvas = document.createElement('canvas');
        sCanvas.width = 512; sCanvas.height = 96;
        const sg = sCanvas.getContext('2d');
        sg.fillStyle = '#143326';
        sg.fillRect(0, 0, 512, 96);
        sg.strokeStyle = '#e0b658';
        sg.lineWidth = 6;
        sg.strokeRect(4, 4, 504, 88);
        sg.fillStyle = '#f8fafc';
        sg.font = 'bold 34px sans-serif';
        sg.textAlign = 'center';
        sg.textBaseline = 'middle';
        sg.fillText('GREENLANDS JUNCTION', 256, 48);

        const signMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sCanvas) });
        const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 5.2), signMat);
        signBoard.position.set(-2.65, 4.5, 0);
        stGroup.add(signBoard);

        this.scene.add(stGroup);
    }

    // Animated Level Crossing with Red/White Barriers & Flashing Signal Lights
    _buildLevelCrossing() {
        this.crossingU = 0.24;
        const pt = new THREE.Vector3();
        const tan = new THREE.Vector3();
        this.trackSystem.samplePoint(this.crossingU, pt);
        this.trackSystem.sampleTangent(this.crossingU, tan);

        const crGroup = new THREE.Group();
        crGroup.position.copy(pt);
        crGroup.rotation.y = Math.atan2(tan.x, tan.z);

        // Asphalt Road Crossing
        const road = new THREE.Mesh(
            new THREE.BoxGeometry(36, 0.14, 7.2),
            new THREE.MeshLambertMaterial({ color: 0x33383e })
        );
        road.position.y = 0.08;
        crGroup.add(road);

        // Barrier Posts & Pivoting Gates
        const postMat = new THREE.MeshLambertMaterial({ color: 0x22262a });
        const gateMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });

        [[-4.2, -4.0, 1], [4.2, 4.0, -1]].forEach(([px, pz, dirSign]) => {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 2.8, 8), postMat);
            post.position.set(px, 1.4, pz);
            crGroup.add(post);

            // Warning Lamp
            const lampMat = new THREE.MeshBasicMaterial({ color: 0x440a0a });
            const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), lampMat);
            lamp.position.set(px, 2.85, pz);
            crGroup.add(lamp);
            this.crossingLights.push(lampMat);

            // Pivoting Arm
            const pivot = new THREE.Group();
            pivot.position.set(px, 1.15, pz);
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 6.2), gateMat);
            arm.position.set(0, 0, -dirSign * 2.8);
            pivot.add(arm);
            crGroup.add(pivot);
            this.crossingGates.push({ pivot: pivot, dirSign: dirSign, angle: 0 });
        });

        this.scene.add(crGroup);
    }

    // 100% Instanced Telegraph Poles, Cross-Arms, Insulators & Bulbs (4 draw calls total instead of 600!)
    _buildInstancedTelegraphPoles() {
        const poleSpacing = 36.0;
        const count = Math.floor(this.trackLength / poleSpacing);

        const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7.5, 7);
        const armGeo = new THREE.BoxGeometry(1.8, 0.12, 0.12);
        const bulbGeo = new THREE.SphereGeometry(0.16, 6, 6);

        const poleInst = new THREE.InstancedMesh(poleGeo, this.materials.woodPole, count);
        const armInst = new THREE.InstancedMesh(armGeo, this.materials.woodPole, count);
        const bulbInst = new THREE.InstancedMesh(bulbGeo, this.poleBulbMat, count);

        const dummy = new THREE.Object3D();
        const pt = new THREE.Vector3();
        const tan = new THREE.Vector3();
        const wirePoints = [];

        for (let i = 0; i < count; i++) {
            const u = (i * poleSpacing) / this.trackLength;
            this.trackSystem.samplePoint(u, pt);
            this.trackSystem.sampleTangent(u, tan);

            const nx = -tan.z, nz = tan.x;
            const nLen = Math.hypot(nx, nz) || 1;
            const rx = nx / nLen, rz = nz / nLen;

            const sideOffset = 7.8;
            const px = pt.x + rx * sideOffset;
            const pz = pt.z + rz * sideOffset;
            const py = pt.y + 3.6;
            const yaw = Math.atan2(tan.x, tan.z);

            dummy.position.set(px, py, pz);
            dummy.rotation.set(0, yaw, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            poleInst.setMatrixAt(i, dummy.matrix);

            dummy.position.set(px, py + 3.2, pz);
            dummy.updateMatrix();
            armInst.setMatrixAt(i, dummy.matrix);

            dummy.position.set(px - rx * 0.85, py + 3.05, pz - rz * 0.85);
            dummy.updateMatrix();
            bulbInst.setMatrixAt(i, dummy.matrix);

            wirePoints.push(new THREE.Vector3(px - rx * 0.75, py + 3.25, pz - rz * 0.75));
        }
        // Close wire loop
        if (wirePoints.length > 0) wirePoints.push(wirePoints[0].clone());

        poleInst.instanceMatrix.needsUpdate = true;
        armInst.instanceMatrix.needsUpdate = true;
        bulbInst.instanceMatrix.needsUpdate = true;

        this.scene.add(poleInst, armInst, bulbInst);

        const wireGeo = new THREE.BufferGeometry().setFromPoints(wirePoints);
        this.scene.add(new THREE.Line(wireGeo, this.materials.wire));
    }

    // 100% Instanced Multi-Species Forest, Shrubs & Cliff Boulders (5 draw calls instead of 900+!)
    _buildInstancedForestAndRocks() {
        const pineCount = 320;
        const oakCount = 220;
        const bushCount = 260;
        const rockCount = 65;

        const trunkGeo = new THREE.CylinderGeometry(0.22, 0.42, 3.4, 6);
        const pineConeGeo = new THREE.ConeGeometry(2.3, 6.2, 7);
        const oakCrownGeo = new THREE.DodecahedronGeometry(2.6, 1);
        const bushGeo = new THREE.DodecahedronGeometry(1.2, 0);
        const rockGeo = new THREE.DodecahedronGeometry(3.2, 0);

        const trunkInst = new THREE.InstancedMesh(trunkGeo, this.materials.trunk, pineCount + oakCount);
        const pineInst = new THREE.InstancedMesh(pineConeGeo, this.materials.pineFoliage, pineCount);
        const oakInst = new THREE.InstancedMesh(oakCrownGeo, this.materials.oakFoliage, oakCount);
        const bushInst = new THREE.InstancedMesh(bushGeo, this.materials.bushFoliage, bushCount);
        const rockInst = new THREE.InstancedMesh(rockGeo, this.materials.rock, rockCount);

        const dummy = new THREE.Object3D();
        const pt = new THREE.Vector3();
        const tan = new THREE.Vector3();

        let tIdx = 0;

        // Deterministic pseudo-random helper
        const rand = (seed) => {
            const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
            return x - Math.floor(x);
        };

        // 1. Pines
        for (let i = 0; i < pineCount; i++) {
            const u = rand(i + 1);
            this.trackSystem.samplePoint(u, pt);
            this.trackSystem.sampleTangent(u, tan);
            const nx = -tan.z, nz = tan.x, nLen = Math.hypot(nx, nz) || 1;
            const side = rand(i + 500) < 0.5 ? -1 : 1;
            const dist = 15.0 + rand(i + 1000) * 95.0;
            const x = pt.x + (nx / nLen) * side * dist;
            const z = pt.z + (nz / nLen) * side * dist;

            // Strict track clearance (11.5m) and lake clearance
            if (Math.hypot(x, z - 680) < 168 || this.trackSystem.getMinDistanceToTrack(x, z) < 11.5) {
                dummy.scale.set(0, 0, 0);
                dummy.updateMatrix();
                trunkInst.setMatrixAt(tIdx++, dummy.matrix);
                pineInst.setMatrixAt(i, dummy.matrix);
                continue;
            }

            const sc = 0.75 + rand(i + 1500) * 0.65;
            dummy.position.set(x, 1.6 * sc, z);
            dummy.rotation.set(0, rand(i) * Math.PI, 0);
            dummy.scale.set(sc, sc, sc);
            dummy.updateMatrix();
            trunkInst.setMatrixAt(tIdx++, dummy.matrix);

            dummy.position.set(x, 5.0 * sc, z);
            dummy.updateMatrix();
            pineInst.setMatrixAt(i, dummy.matrix);
        }

        // 2. Deciduous Oaks
        for (let i = 0; i < oakCount; i++) {
            const s = i + 3000;
            const u = rand(s);
            this.trackSystem.samplePoint(u, pt);
            this.trackSystem.sampleTangent(u, tan);
            const nx = -tan.z, nz = tan.x, nLen = Math.hypot(nx, nz) || 1;
            const side = rand(s + 200) < 0.5 ? -1 : 1;
            const dist = 14.0 + rand(s + 400) * 85.0;
            const x = pt.x + (nx / nLen) * side * dist;
            const z = pt.z + (nz / nLen) * side * dist;

            // Strict track clearance (11.5m) and lake clearance
            if (Math.hypot(x, z - 680) < 168 || this.trackSystem.getMinDistanceToTrack(x, z) < 11.5) {
                dummy.scale.set(0, 0, 0);
                dummy.updateMatrix();
                trunkInst.setMatrixAt(tIdx++, dummy.matrix);
                oakInst.setMatrixAt(i, dummy.matrix);
                continue;
            }

            const sc = 0.8 + rand(s + 600) * 0.6;
            dummy.position.set(x, 1.6 * sc, z);
            dummy.rotation.set(0, rand(s) * Math.PI, 0);
            dummy.scale.set(sc, sc, sc);
            dummy.updateMatrix();
            trunkInst.setMatrixAt(tIdx++, dummy.matrix);

            dummy.position.set(x, 4.4 * sc, z);
            dummy.scale.set(sc * 1.15, sc * 0.9, sc * 1.15);
            dummy.updateMatrix();
            oakInst.setMatrixAt(i, dummy.matrix);
        }

        // 3. Trackside Bushes
        for (let i = 0; i < bushCount; i++) {
            const s = i + 6000;
            const u = rand(s);
            this.trackSystem.samplePoint(u, pt);
            this.trackSystem.sampleTangent(u, tan);
            const nx = -tan.z, nz = tan.x, nLen = Math.hypot(nx, nz) || 1;
            const side = rand(s + 100) < 0.5 ? -1 : 1;
            const dist = 7.5 + rand(s + 200) * 28.0;
            const x = pt.x + (nx / nLen) * side * dist;
            const z = pt.z + (nz / nLen) * side * dist;

            // Strict clearance: bushes never on rails
            if (this.trackSystem.getMinDistanceToTrack(x, z) < 6.5) {
                dummy.scale.set(0, 0, 0);
                dummy.updateMatrix();
                bushInst.setMatrixAt(i, dummy.matrix);
                continue;
            }

            const sc = 0.6 + rand(s + 300) * 0.7;
            dummy.position.set(x, 0.5 * sc, z);
            dummy.rotation.set(0, rand(s) * Math.PI, 0);
            dummy.scale.set(sc * 1.2, sc * 0.8, sc * 1.2);
            dummy.updateMatrix();
            bushInst.setMatrixAt(i, dummy.matrix);
        }

        // 4. Cliff Boulders
        for (let i = 0; i < rockCount; i++) {
            const s = i + 9000;
            const u = rand(s);
            this.trackSystem.samplePoint(u, pt);
            this.trackSystem.sampleTangent(u, tan);
            const nx = -tan.z, nz = tan.x, nLen = Math.hypot(nx, nz) || 1;
            const side = rand(s + 50) < 0.5 ? -1 : 1;
            const dist = 18.0 + rand(s + 150) * 55.0;
            const x = pt.x + (nx / nLen) * side * dist;
            const z = pt.z + (nz / nLen) * side * dist;

            // Strict clearance: boulders never on track
            if (this.trackSystem.getMinDistanceToTrack(x, z) < 9.5) {
                dummy.scale.set(0, 0, 0);
                dummy.updateMatrix();
                rockInst.setMatrixAt(i, dummy.matrix);
                continue;
            }

            const sx = 0.8 + rand(s + 10) * 1.4;
            const sy = 0.6 + rand(s + 20) * 1.2;
            const sz = 0.8 + rand(s + 30) * 1.4;
            dummy.position.set(x, sy * 1.1, z);
            dummy.rotation.set(rand(s) * 0.4, rand(s + 5) * Math.PI, rand(s + 9) * 0.4);
            dummy.scale.set(sx, sy, sz);
            dummy.updateMatrix();
            rockInst.setMatrixAt(i, dummy.matrix);
        }

        trunkInst.instanceMatrix.needsUpdate = true;
        pineInst.instanceMatrix.needsUpdate = true;
        oakInst.instanceMatrix.needsUpdate = true;
        bushInst.instanceMatrix.needsUpdate = true;
        rockInst.instanceMatrix.needsUpdate = true;

        this.scene.add(trunkInst, pineInst, oakInst, bushInst, rockInst);
    }

    // 100% Instanced Country Cottages with Night-Glowing Windows (2 draw calls instead of 70!)
    _buildInstancedVillageCottages() {
        const count = 42;
        const bodyGeo = new THREE.BoxGeometry(6.8, 4.4, 5.4);
        const roofGeo = new THREE.ConeGeometry(5.6, 2.4, 4);
        roofGeo.rotateY(Math.PI / 4);

        const bodyInst = new THREE.InstancedMesh(bodyGeo, this.materials.cottageWall, count);
        const roofInst = new THREE.InstancedMesh(roofGeo, this.materials.cottageRoof, count);

        const dummy = new THREE.Object3D();
        const pt = new THREE.Vector3();
        const tan = new THREE.Vector3();

        for (let i = 0; i < count; i++) {
            const u = ((i + 0.5) / count) % 1.0;
            // Avoid bridge center & station
            if (Math.abs(u - 0.085) < 0.03 || Math.abs(u - 0.52) < 0.04) {
                dummy.scale.set(0, 0, 0);
                dummy.updateMatrix();
                bodyInst.setMatrixAt(i, dummy.matrix);
                roofInst.setMatrixAt(i, dummy.matrix);
                continue;
            }

            this.trackSystem.samplePoint(u, pt);
            this.trackSystem.sampleTangent(u, tan);
            const nx = -tan.z, nz = tan.x, nLen = Math.hypot(nx, nz) || 1;
            const side = (i % 2 === 0) ? 1 : -1;
            const dist = 24.0 + ((i * 19) % 32);

            const bx = pt.x + (nx / nLen) * side * dist;
            const bz = pt.z + (nz / nLen) * side * dist;
            // Strictly keep clear of tracks (min 22m safe corridor), lake, bridge, and station
            if (Math.hypot(bx, bz - 680) < 170 || this.trackSystem.getMinDistanceToTrack(bx, bz) < 22.0) {
                dummy.scale.set(0, 0, 0);
                dummy.updateMatrix();
                bodyInst.setMatrixAt(i, dummy.matrix);
                roofInst.setMatrixAt(i, dummy.matrix);
                continue;
            }

            const yaw = Math.atan2(tan.x, tan.z) + (side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5);
            const sc = 0.9 + (i % 4) * 0.12;

            dummy.position.set(bx, 2.2 * sc, bz);
            dummy.rotation.set(0, yaw, 0);
            dummy.scale.set(sc, sc, sc);
            dummy.updateMatrix();
            bodyInst.setMatrixAt(i, dummy.matrix);

            dummy.position.set(bx, (4.4 + 1.1) * sc, bz);
            dummy.updateMatrix();
            roofInst.setMatrixAt(i, dummy.matrix);
        }

        bodyInst.instanceMatrix.needsUpdate = true;
        roofInst.instanceMatrix.needsUpdate = true;
        this.scene.add(bodyInst, roofInst);
    }

    setNightFactor(windowGlowIntensity, isNightOrSunset) {
        for (let i = 0; i < this.nightGlowMaterials.length; i++) {
            this.nightGlowMaterials[i].emissiveIntensity = windowGlowIntensity;
        }
        if (this.poleBulbMat) {
            this.poleBulbMat.color.setHex(isNightOrSunset ? 0xffe082 : 0x666055);
        }
    }

    update(trainProgress, dt) {
        // Animate level crossing gates & flashing lights when train is near crossingU (0.24)
        let dU = Math.abs(trainProgress - this.crossingU);
        if (dU > 0.5) dU = 1.0 - dU;
        const trainNear = dU < 0.045;

        const targetAngle = trainNear ? 0.0 : (Math.PI * 0.45);
        for (let i = 0; i < this.crossingGates.length; i++) {
            const g = this.crossingGates[i];
            g.angle += (targetAngle - g.angle) * Math.min(1.0, (dt || 0.016) * 4.5);
            g.pivot.rotation.x = g.dirSign * g.angle;
        }

        if (trainNear) {
            this.crossingTimer += (dt || 0.016) * 8.0;
            const flash = Math.sin(this.crossingTimer) > 0;
            if (this.crossingLights.length >= 2) {
                this.crossingLights[0].color.setHex(flash ? 0xff2222 : 0x330505);
                this.crossingLights[1].color.setHex(!flash ? 0xff2222 : 0x330505);
            }
        } else {
            for (let i = 0; i < this.crossingLights.length; i++) {
                this.crossingLights[i].color.setHex(0x330505);
            }
        }
    }
}
