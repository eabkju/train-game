// train.js - Visually Rich, Ultra-Low-Draw-Call T3M2M-005 Diesel Locomotive & 5 Royal Heritage Carriages
// Uses high-detail procedural Canvas textures + emissive maps instead of expensive per-coach PointLights!
class TrainLocomotive {
    constructor(scene, physics) {
        this.scene = scene;
        this.physics = physics;

        this.root = new THREE.Group();
        this.scene.add(this.root);

        this.bodyGroup = new THREE.Group();
        this.root.add(this.bodyGroup);

        this.frontBogie = null;
        this.rearBogie = null;
        this.wheelMeshes = [];
        this.roofFans = [];

        // Master Lighting & Emissive Materials (Zero per-carriage PointLight shader overhead!)
        this.lightsOn = false;
        this.headlight = null;
        this.headlightBeamMesh = null;
        this.emissiveMaterials = [];

        // 5 Attached Passenger Carriages
        this.carriages = [];

        // Lightweight pooled exhaust smoke particles (16 puffs)
        this.smokePool = [];
        this.smokeTimer = 0;

        this._buildSharedTextures();
        this.buildLocomotive();
        this.buildCarriages();
        this._initExhaustSmoke();
        this.setLights(false);
        this.forceUpdate();
    }

    _buildSharedTextures() {
        // 1. Passenger Coach Side Texture + Emissive Window Map (Replaces 40 window meshes & 5 PointLights!)
        const cDiff = document.createElement('canvas');
        cDiff.width = 512; cDiff.height = 128;
        const g = cDiff.getContext('2d');

        // Royal Navy base
        g.fillStyle = '#182b42';
        g.fillRect(0, 0, 512, 128);

        // Roof edge & lower chassis skirt
        g.fillStyle = '#242b35';
        g.fillRect(0, 0, 512, 14);
        g.fillStyle = '#101822';
        g.fillRect(0, 108, 512, 20);

        // Brushed Champagne Gold Waist & Pin Stripes
        g.fillStyle = '#e0b658';
        g.fillRect(0, 72, 512, 7);
        g.fillRect(0, 22, 512, 2.5);
        g.fillStyle = '#c83e37';
        g.fillRect(0, 79, 512, 3);

        // End Entry Doors
        [14, 466].forEach(dx => {
            g.fillStyle = '#122133';
            g.fillRect(dx, 26, 32, 78);
            g.strokeStyle = '#e0b658';
            g.lineWidth = 1.5;
            g.strokeRect(dx, 26, 32, 78);
            g.fillStyle = '#6289a8';
            g.fillRect(dx + 6, 33, 20, 28);
        });

        // Emissive Window Canvas
        const cEmis = document.createElement('canvas');
        cEmis.width = 512; cEmis.height = 128;
        const ge = cEmis.getContext('2d');
        ge.fillStyle = '#000000';
        ge.fillRect(0, 0, 512, 128);

        // 6 Panoramic Bay Windows
        for (let i = 0; i < 6; i++) {
            const wx = 64 + i * 64;
            // Frame
            g.fillStyle = '#0d1622';
            g.fillRect(wx, 29, 48, 36);
            // Glass
            const grad = g.createLinearGradient(wx, 31, wx, 63);
            grad.addColorStop(0, '#5a82a6');
            grad.addColorStop(1, '#9ab8d4');
            g.fillStyle = grad;
            g.fillRect(wx + 2, 31, 44, 32);
            // Mullion bar
            g.fillStyle = '#c8d6e5';
            g.fillRect(wx + 23, 31, 2, 32);
            // Specular diagonal reflection
            g.fillStyle = 'rgba(255,255,255,0.35)';
            g.beginPath();
            g.moveTo(wx + 6, 31); g.lineTo(wx + 18, 31);
            g.lineTo(wx + 10, 63); g.lineTo(wx + 2, 63);
            g.closePath(); g.fill();

            // Warm interior glow in emissive map
            ge.fillStyle = '#ffe299';
            ge.fillRect(wx + 2, 31, 44, 32);
        }

        // Door windows in emissive map
        [14, 466].forEach(dx => {
            ge.fillStyle = '#ffd27d';
            ge.fillRect(dx + 6, 33, 20, 28);
        });

        this.coachSideTex = new THREE.CanvasTexture(cDiff);
        this.coachSideEmis = new THREE.CanvasTexture(cEmis);

        // 2. Locomotive Hood Side Texture (Louvres, Warning Stripes, Number Plate "T3M2M-005")
        const lCanvas = document.createElement('canvas');
        lCanvas.width = 512; lCanvas.height = 128;
        const lg = lCanvas.getContext('2d');
        lg.fillStyle = '#16283d';
        lg.fillRect(0, 0, 512, 128);
        // Louvred vents
        lg.fillStyle = '#0e1b29';
        for (let i = 0; i < 5; i++) {
            const vx = 45 + i * 82;
            lg.fillRect(vx, 22, 58, 44);
            lg.fillStyle = '#243a54';
            for (let k = 0; k < 6; k++) {
                lg.fillRect(vx + 4, 26 + k * 6.5, 50, 3);
            }
            lg.fillStyle = '#0e1b29';
        }
        // Golden caution stripe & crimson trim
        lg.fillStyle = '#facc15';
        lg.fillRect(0, 78, 512, 12);
        lg.fillStyle = '#ef4444';
        lg.fillRect(0, 90, 512, 4);
        // Number badge
        lg.fillStyle = '#0b1420';
        lg.fillRect(200, 72, 112, 24);
        lg.strokeStyle = '#facc15';
        lg.lineWidth = 2;
        lg.strokeRect(200, 72, 112, 24);
        lg.fillStyle = '#ffffff';
        lg.font = 'bold 14px sans-serif';
        lg.textAlign = 'center';
        lg.textBaseline = 'middle';
        lg.fillText('T3M2M-005', 256, 84);
        this.locoHoodTex = new THREE.CanvasTexture(lCanvas);

        // 3. Hazard V-Chevron Buffer Beam Texture
        const bCanvas = document.createElement('canvas');
        bCanvas.width = 256; bCanvas.height = 64;
        const bg = bCanvas.getContext('2d');
        bg.fillStyle = '#b91c1c';
        bg.fillRect(0, 0, 256, 64);
        bg.fillStyle = '#f8fafc';
        for (let x = -64; x < 320; x += 36) {
            bg.beginPath();
            bg.moveTo(x, 0); bg.lineTo(x + 18, 0);
            bg.lineTo(x + 42, 64); bg.lineTo(x + 24, 64);
            bg.closePath(); bg.fill();
        }
        this.hazardTex = new THREE.CanvasTexture(bCanvas);

        // 4. Fake Soft Drop-Shadow Texture (Zero-cost ground shadow under every car)
        const sCanvas = document.createElement('canvas');
        sCanvas.width = 64; sCanvas.height = 64;
        const sg = sCanvas.getContext('2d');
        const sGrad = sg.createRadialGradient(32, 32, 6, 32, 32, 31);
        sGrad.addColorStop(0, 'rgba(0,0,0,0.55)');
        sGrad.addColorStop(1, 'rgba(0,0,0,0.0)');
        sg.fillStyle = sGrad;
        sg.fillRect(0, 0, 64, 64);
        this.shadowTex = new THREE.CanvasTexture(sCanvas);
    }

    buildLocomotive() {
        const L = GAME_CONFIG.train.length; // 12.2m
        const W = GAME_CONFIG.train.width;  // 3.1m

        const bodyMat = new THREE.MeshLambertMaterial({ color: GAME_CONFIG.colors.trainBody });
        const hoodSideMat = new THREE.MeshLambertMaterial({ map: this.locoHoodTex });
        const stripeMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
        const deckMat = new THREE.MeshLambertMaterial({ color: GAME_CONFIG.colors.trainFrame });
        const roofMat = new THREE.MeshLambertMaterial({ color: GAME_CONFIG.colors.trainRoof });
        const hazardMat = new THREE.MeshLambertMaterial({ map: this.hazardTex });
        const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a1e24 });
        const handrailMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });

        // Soft Ground Drop Shadow
        const shadowPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(W * 1.35, L * 1.12),
            new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false })
        );
        shadowPlane.rotation.x = -Math.PI * 0.5;
        shadowPlane.position.y = 0.06;
        this.bodyGroup.add(shadowPlane);

        // 1. Main Chassis Deck & Fuel Tank
        const deck = new THREE.Mesh(new THREE.BoxGeometry(W, 0.38, L), deckMat);
        deck.position.y = 1.34;
        this.bodyGroup.add(deck);

        const fuelTank = new THREE.Mesh(new THREE.BoxGeometry(W * 0.72, 0.55, 3.8), darkMat);
        fuelTank.position.set(0, 0.85, 0.2);
        this.bodyGroup.add(fuelTank);

        // Side Sills
        [-W * 0.5 - 0.02, W * 0.5 + 0.02].forEach(x => {
            const sill = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, L), stripeMat);
            sill.position.set(x, 1.34, 0);
            this.bodyGroup.add(sill);
        });

        // Front & Rear Hazard Buffer Beams
        [L * 0.5 + 0.08, -L * 0.5 - 0.08].forEach(z => {
            const beam = new THREE.Mesh(new THREE.BoxGeometry(W, 0.65, 0.18), hazardMat);
            beam.position.set(0, 0.96, z);
            this.bodyGroup.add(beam);
        });

        // 2. Long Engine Hood with Textured Louvres
        const hoodL = 7.7, hoodW = 2.55, hoodH = 2.15, hoodZ = 0.95;
        const hoodMats = [hoodSideMat, hoodSideMat, roofMat, darkMat, bodyMat, bodyMat];
        const hood = new THREE.Mesh(new THREE.BoxGeometry(hoodW, hoodH, hoodL), hoodMats);
        hood.position.set(0, 2.6, hoodZ);
        this.bodyGroup.add(hood);

        // Dual Prominent Circular Cooling Fan Housings on Hood Roof + Rotating Fan Blades
        [-0.6, 2.4].forEach(fz => {
            const fanRing = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.72, 0.18, 12), roofMat);
            fanRing.position.set(0, 3.74, fz);
            this.bodyGroup.add(fanRing);

            const bladeGroup = new THREE.Group();
            bladeGroup.position.set(0, 3.79, fz);
            const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 0.16), stripeMat);
            const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 1.1), stripeMat);
            bladeGroup.add(b1, b2);
            this.bodyGroup.add(bladeGroup);
            this.roofFans.push(bladeGroup);
        });

        // Exhaust Stack
        const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.38, 8), darkMat);
        stack.position.set(0, 3.82, -1.8);
        this.bodyGroup.add(stack);

        // Side Walkway Safety Handrails
        [-W * 0.46, W * 0.46].forEach(x => {
            const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, hoodL + 0.4), handrailMat);
            topRail.position.set(x, 2.35, hoodZ);
            this.bodyGroup.add(topRail);
            for (let sz = -2.6; sz <= 4.6; sz += 1.8) {
                const stanchion = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.85, 0.04), handrailMat);
                stanchion.position.set(x, 1.92, sz);
                this.bodyGroup.add(stanchion);
            }
        });

        // 3. Elevated Driver Cab with Curved Roof
        const cabL = 3.2, cabW = 2.92, cabH = 2.52, cabZ = -3.75;
        const cab = new THREE.Mesh(new THREE.BoxGeometry(cabW, cabH, cabL), bodyMat);
        cab.position.set(0, 2.8, cabZ);
        this.bodyGroup.add(cab);

        const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(cabW + 0.12, 0.18, cabL + 0.2), roofMat);
        cabRoof.position.set(0, 4.12, cabZ);
        this.bodyGroup.add(cabRoof);

        // Cab Windows (Emissive-ready)
        const cabWinMat = new THREE.MeshLambertMaterial({
            color: 0x7fa3c4,
            emissive: 0xffe299,
            emissiveIntensity: 0.15
        });
        this.emissiveMaterials.push(cabWinMat);

        [-0.68, 0.68].forEach(x => {
            const fWin = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.72, 0.06), cabWinMat);
            fWin.position.set(x, 3.32, cabZ + cabL * 0.5 + 0.02);
            this.bodyGroup.add(fWin);

            const rWin = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.72, 0.06), cabWinMat);
            rWin.position.set(x, 3.32, cabZ - cabL * 0.5 - 0.02);
            this.bodyGroup.add(rWin);
        });

        [-cabW * 0.5 - 0.02, cabW * 0.5 + 0.02].forEach(x => {
            const sWin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.72, 1.5), cabWinMat);
            sWin.position.set(x, 3.32, cabZ);
            this.bodyGroup.add(sWin);
        });

        // 4. Locomotive Headlight + Volumetric Light Cone Mesh
        const noseZ = hoodZ + hoodL * 0.5;
        const hlHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.26, 10), darkMat);
        hlHousing.rotateX(Math.PI * 0.5);
        hlHousing.position.set(0, 3.45, noseZ + 0.12);
        this.bodyGroup.add(hlHousing);

        this.headlightLensMat = new THREE.MeshBasicMaterial({ color: 0x555555 });
        const hlLens = new THREE.Mesh(new THREE.CircleGeometry(0.19, 10), this.headlightLensMat);
        hlLens.position.set(0, 3.45, noseZ + 0.26);
        this.bodyGroup.add(hlLens);

        // Volumetric light cone (zero shader cost!)
        const coneGeo = new THREE.ConeGeometry(4.2, 28, 12, 1, true);
        coneGeo.rotateX(-Math.PI * 0.5);
        coneGeo.translate(0, -1.2, 14.2);
        this.headlightBeamMesh = new THREE.Mesh(
            coneGeo,
            new THREE.MeshBasicMaterial({
                color: 0xfff5cc,
                transparent: true,
                opacity: 0.13,
                side: THREE.DoubleSide,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            })
        );
        this.headlightBeamMesh.position.set(0, 3.45, noseZ + 0.26);
        this.bodyGroup.add(this.headlightBeamMesh);

        // Single Forward SpotLight
        this.headlight = new THREE.SpotLight(0xfff4d2, 0.0, 95, 0.48, 0.4, 1.1);
        this.headlight.position.set(0, 3.45, noseZ + 0.3);
        const targetObj = new THREE.Object3D();
        targetObj.position.set(0, 0.5, noseZ + 45);
        this.bodyGroup.add(targetObj);
        this.headlight.target = targetObj;
        this.bodyGroup.add(this.headlight);

        // 5. Articulated Locomotive Bogies
        this.frontBogie = this.createBogie();
        this.rearBogie = this.createBogie();
        this.root.add(this.frontBogie, this.rearBogie);
    }

    buildCarriages() {
        const coachCount = GAME_CONFIG.train.carriageCount || 5;
        const L = GAME_CONFIG.train.carriageLength || 11.4;
        const W = GAME_CONFIG.train.carriageWidth || 2.92;
        const H = 2.65;

        const sideMat = new THREE.MeshLambertMaterial({
            map: this.coachSideTex,
            emissive: 0xffe299,
            emissiveMap: this.coachSideEmis,
            emissiveIntensity: 0.08
        });
        this.emissiveMaterials.push(sideMat);

        const endMat = new THREE.MeshLambertMaterial({ color: GAME_CONFIG.colors.coachBody });
        const roofMat = new THREE.MeshLambertMaterial({ color: GAME_CONFIG.colors.trainRoof });
        const darkMat = new THREE.MeshLambertMaterial({ color: 0x15181c });
        const coachMats = [sideMat, sideMat, roofMat, darkMat, endMat, endMat];

        const bodyGeo = new THREE.BoxGeometry(W, H, L);
        const roofArchGeo = new THREE.BoxGeometry(W * 0.86, 0.18, L - 0.3);
        const bellowsGeo = new THREE.BoxGeometry(1.55, 2.15, 0.65);
        const shadowGeo = new THREE.PlaneGeometry(W * 1.32, L * 1.1);
        const shadowMat = new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false });

        for (let i = 0; i < coachCount; i++) {
            const carGroup = new THREE.Group();
            this.root.add(carGroup);

            // Soft ground shadow
            const sh = new THREE.Mesh(shadowGeo, shadowMat);
            sh.rotation.x = -Math.PI * 0.5;
            sh.position.y = 0.06;
            carGroup.add(sh);

            // 1 single textured mesh for the entire coach body + windows + stripes!
            const body = new THREE.Mesh(bodyGeo, coachMats);
            body.position.y = 2.48;
            carGroup.add(body);

            // Clerestory roof crown
            const roofCrown = new THREE.Mesh(roofArchGeo, roofMat);
            roofCrown.position.y = 3.88;
            carGroup.add(roofCrown);

            // Flexible gangway bellows
            const bellows = new THREE.Mesh(bellowsGeo, darkMat);
            bellows.position.set(0, 2.35, L * 0.5 + 0.32);
            carGroup.add(bellows);

            // Articulated Bogies
            const frontBogie = this.createBogie();
            const rearBogie = this.createBogie();
            this.root.add(frontBogie, rearBogie);

            this.carriages.push({
                group: carGroup,
                frontBogie: frontBogie,
                rearBogie: rearBogie
            });
        }
    }

    createBogie() {
        const bogieGroup = new THREE.Group();
        const frameMat = new THREE.MeshLambertMaterial({ color: GAME_CONFIG.colors.trainBogies });
        const wheelMat = new THREE.MeshLambertMaterial({ color: GAME_CONFIG.colors.trainWheels });

        const frame = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.26, 2.4), frameMat);
        frame.position.y = 0.64;
        bogieGroup.add(frame);

        const wheelR = GAME_CONFIG.train.wheelRadius || 0.52;
        const halfGauge = 0.82;
        const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.12, 10);
        wheelGeo.rotateZ(Math.PI * 0.5);

        [-0.82, 0.82].forEach(z => {
            const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, halfGauge * 2, 6), frameMat);
            axle.rotateZ(Math.PI * 0.5);
            axle.position.set(0, 0.54, z);
            bogieGroup.add(axle);

            [-halfGauge, halfGauge].forEach(x => {
                const wheelPivot = new THREE.Group();
                wheelPivot.position.set(x, 0.54, z);
                wheelPivot.add(new THREE.Mesh(wheelGeo, wheelMat));
                bogieGroup.add(wheelPivot);
                this.wheelMeshes.push(wheelPivot);
            });
        });

        return bogieGroup;
    }

    _initExhaustSmoke() {
        const puffGeo = new THREE.IcosahedronGeometry(0.32, 0);
        for (let i = 0; i < 14; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color: 0xd8dee6,
                transparent: true,
                opacity: 0.0,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(puffGeo, mat);
            mesh.visible = false;
            this.scene.add(mesh);
            this.smokePool.push({
                mesh: mesh,
                mat: mat,
                age: 99,
                maxAge: 1.4,
                vx: 0, vy: 0, vz: 0
            });
        }
    }

    toggleLights() {
        this.setLights(!this.lightsOn);
        return this.lightsOn;
    }

    setLights(on) {
        this.lightsOn = on;
        if (this.headlight) {
            this.headlight.intensity = on ? 3.2 : 0.0;
        }
        if (this.headlightBeamMesh) {
            this.headlightBeamMesh.visible = on;
        }
        if (this.headlightLensMat) {
            this.headlightLensMat.color.setHex(on ? 0xfff8d6 : 0x555555);
        }
        const glow = on ? 1.35 : 0.06;
        for (let i = 0; i < this.emissiveMaterials.length; i++) {
            this.emissiveMaterials[i].emissiveIntensity = glow;
        }
    }

    forceUpdate() {
        this._syncMeshes();
    }

    update(dt, moved) {
        // Rotate cooling fans smoothly even when idling if engine is running
        const fanSpeed = this.physics.isRunning ? (4.0 + this.physics.speed * 0.8) : 0.8;
        for (let i = 0; i < this.roofFans.length; i++) {
            this.roofFans[i].rotation.y += fanSpeed * dt;
        }

        // Update exhaust smoke puffs
        this._updateSmoke(dt);

        if (moved) {
            this._syncMeshes();
        }
    }

    _syncMeshes() {
        // 1. Lead Locomotive
        const pos = this.physics.currentPosition;
        const tangent = this.physics.currentTangent;

        this.bodyGroup.position.copy(pos);
        this.bodyGroup.rotation.y = Math.atan2(tangent.x, tangent.z);
        this.bodyGroup.rotation.x = -Math.atan2(tangent.y, Math.hypot(tangent.x, tangent.z));

        this.frontBogie.position.copy(this.physics.frontBogiePos);
        this.rearBogie.position.copy(this.physics.rearBogiePos);
        this.frontBogie.rotation.y = Math.atan2(this.physics.frontBogieTan.x, this.physics.frontBogieTan.z);
        this.rearBogie.rotation.y = Math.atan2(this.physics.rearBogieTan.x, this.physics.rearBogieTan.z);

        // 2. 5 Passenger Carriages
        const count = this.carriages.length;
        for (let i = 0; i < count; i++) {
            const car = this.carriages[i];
            const data = this.physics.carriagesData[i];

            car.group.position.copy(data.position);
            car.group.rotation.y = Math.atan2(data.tangent.x, data.tangent.z);
            car.group.rotation.x = -Math.atan2(data.tangent.y, Math.hypot(data.tangent.x, data.tangent.z));

            car.frontBogie.position.copy(data.frontBogiePos);
            car.rearBogie.position.copy(data.rearBogiePos);
            car.frontBogie.rotation.y = Math.atan2(data.frontTangent.x, data.frontTangent.z);
            car.rearBogie.rotation.y = Math.atan2(data.rearTangent.x, data.rearTangent.z);
        }

        // 3. Wheels
        const rot = this.physics.wheelRotation;
        for (let i = 0; i < this.wheelMeshes.length; i++) {
            this.wheelMeshes[i].rotation.x = rot;
        }
    }

    _updateSmoke(dt) {
        const isActive = this.physics.isRunning || this.physics.speed > 0.2;
        const interval = isActive ? Math.max(0.06, 0.22 - this.physics.getSpeedRatio() * 0.14) : 0.6;
        this.smokeTimer += dt;

        if (this.smokeTimer >= interval) {
            this.smokeTimer = 0;
            // Find an inactive puff
            for (let i = 0; i < this.smokePool.length; i++) {
                const p = this.smokePool[i];
                if (p.age >= p.maxAge) {
                    const pos = this.physics.currentPosition;
                    const tan = this.physics.currentTangent;
                    p.age = 0;
                    p.maxAge = 1.1 + Math.random() * 0.4;
                    p.mesh.position.set(
                        pos.x - tan.x * 1.8 + (Math.random() - 0.5) * 0.2,
                        pos.y + 4.1,
                        pos.z - tan.z * 1.8 + (Math.random() - 0.5) * 0.2
                    );
                    p.vx = (Math.random() - 0.5) * 0.8 - tan.x * (this.physics.speed * 0.18);
                    p.vy = 2.2 + this.physics.getSpeedRatio() * 2.4;
                    p.vz = (Math.random() - 0.5) * 0.8 - tan.z * (this.physics.speed * 0.18);
                    p.mesh.scale.setScalar(0.55);
                    p.mat.opacity = isActive ? 0.38 : 0.15;
                    p.mesh.visible = true;
                    break;
                }
            }
        }

        for (let i = 0; i < this.smokePool.length; i++) {
            const p = this.smokePool[i];
            if (p.age < p.maxAge) {
                p.age += dt;
                if (p.age >= p.maxAge) {
                    p.mesh.visible = false;
                } else {
                    const t = p.age / p.maxAge;
                    p.mesh.position.x += p.vx * dt;
                    p.mesh.position.y += p.vy * dt;
                    p.mesh.position.z += p.vz * dt;
                    p.mesh.scale.setScalar(0.55 + t * 2.1);
                    p.mat.opacity = (1.0 - t) * 0.34;
                }
            }
        }
    }
}
