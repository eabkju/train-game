// village.js - Realistic Minecraft-Inspired Farmsteads, Cattle, Farmers & Indian Tea Stalls
// Features: Day/Night herding routines, working farmers & draft cattle, 4 Indian-style Chai Tapris with always-glowing yellow bulbs and tea-sipping customers, faceless blocky figures (no eye, nose, mouth), zero track obstruction.

class VillageManager {
    constructor(scene, trackSystem, envManager) {
        this.scene = scene;
        this.trackSystem = trackSystem;
        this.envManager = envManager;

        this.farmers = [];
        this.cows = [];
        this.farmsteads = [];
        this.teaStalls = [];
        this.chaiCustomers = [];
        this.nightGlowMaterials = [];

        this.currentTimePreset = 'day';
        this.isRaining = false;

        this._createSharedMaterials();
        this._buildFarms();
        this._buildIndianTeaStalls();

        // Connect night glow materials to envManager if available
        if (this.envManager && this.envManager.nightGlowMaterials) {
            for (let i = 0; i < this.nightGlowMaterials.length; i++) {
                this.envManager.nightGlowMaterials.push(this.nightGlowMaterials[i]);
            }
        }
    }

    _createSharedMaterials() {
        // 1. Procedural Off-White Clapboard Siding with glowing night windows
        const wDiff = document.createElement('canvas');
        wDiff.width = 256; wDiff.height = 256;
        const wg = wDiff.getContext('2d');
        wg.fillStyle = '#f3ede2';
        wg.fillRect(0, 0, 256, 256);
        wg.strokeStyle = '#d4c8b4';
        wg.lineWidth = 3;
        for (let y = 16; y < 256; y += 16) {
            wg.beginPath();
            wg.moveTo(0, y); wg.lineTo(256, y);
            wg.stroke();
        }
        wg.fillStyle = '#4a3b32';
        wg.fillRect(0, 240, 256, 16);
        wg.fillRect(110, 140, 36, 100);

        const wEmis = document.createElement('canvas');
        wEmis.width = 256; wEmis.height = 256;
        const we = wEmis.getContext('2d');
        we.fillStyle = '#000000';
        we.fillRect(0, 0, 256, 256);

        [[28, 50], [180, 50], [28, 145], [180, 145]].forEach(([wx, wy]) => {
            wg.fillStyle = '#2a3b4c';
            wg.fillRect(wx, wy, 48, 52);
            wg.strokeStyle = '#f3ede2';
            wg.lineWidth = 4;
            wg.strokeRect(wx, wy, 48, 52);
            wg.beginPath();
            wg.moveTo(wx + 24, wy); wg.lineTo(wx + 24, wy + 52);
            wg.moveTo(wx, wy + 26); wg.lineTo(wx + 48, wy + 26);
            wg.stroke();

            we.fillStyle = '#ffd67a';
            we.fillRect(wx + 3, wy + 3, 42, 46);
        });

        const farmhouseGlowMat = new THREE.MeshLambertMaterial({
            map: new THREE.CanvasTexture(wDiff),
            emissive: 0xffd478,
            emissiveMap: new THREE.CanvasTexture(wEmis),
            emissiveIntensity: 0.08
        });
        this.nightGlowMaterials.push(farmhouseGlowMat);

        // 2. Procedural Red Barn Siding
        const bCanvas = document.createElement('canvas');
        bCanvas.width = 256; bCanvas.height = 256;
        const bg = bCanvas.getContext('2d');
        bg.fillStyle = '#8f2922';
        bg.fillRect(0, 0, 256, 256);
        bg.strokeStyle = '#731e18';
        bg.lineWidth = 2;
        for (let x = 16; x < 256; x += 16) {
            bg.beginPath();
            bg.moveTo(x, 0); bg.lineTo(x, 256);
            bg.stroke();
        }
        bg.fillStyle = '#f8fafc';
        bg.fillRect(68, 130, 120, 110);
        bg.fillStyle = '#7a211b';
        bg.fillRect(74, 136, 52, 98);
        bg.fillRect(130, 136, 52, 98);
        bg.strokeStyle = '#f8fafc';
        bg.lineWidth = 5;
        bg.beginPath();
        bg.moveTo(76, 138); bg.lineTo(124, 232);
        bg.moveTo(124, 138); bg.lineTo(76, 232);
        bg.moveTo(132, 138); bg.lineTo(180, 232);
        bg.moveTo(180, 138); bg.lineTo(132, 232);
        bg.stroke();

        // 3. Procedural Furrowed Tilled Soil
        const sCanvas = document.createElement('canvas');
        sCanvas.width = 128; sCanvas.height = 128;
        const sg = sCanvas.getContext('2d');
        sg.fillStyle = '#3d2b1f';
        sg.fillRect(0, 0, 128, 128);
        sg.fillStyle = '#2e1f16';
        for (let y = 0; y < 128; y += 16) {
            sg.fillRect(0, y, 128, 7);
        }
        const soilTex = new THREE.CanvasTexture(sCanvas);
        soilTex.wrapS = THREE.RepeatWrapping;
        soilTex.wrapT = THREE.RepeatWrapping;
        soilTex.repeat.set(8, 8);

        // 4. Procedural Holstein Cow Pattern (Black & White)
        const cCanvas = document.createElement('canvas');
        cCanvas.width = 256; cCanvas.height = 256;
        const cg = cCanvas.getContext('2d');
        cg.fillStyle = '#f4f5f7';
        cg.fillRect(0, 0, 256, 256);
        cg.fillStyle = '#181a1c';
        const spots = [
            [40, 50, 32, 28], [95, 80, 48, 36], [180, 45, 42, 34],
            [160, 160, 50, 42], [50, 170, 38, 32], [115, 130, 28, 24],
            [210, 110, 30, 36], [20, 110, 26, 22]
        ];
        spots.forEach(([x, y, rx, ry]) => {
            cg.beginPath();
            cg.ellipse(x, y, rx, ry, Math.PI / 6, 0, Math.PI * 2);
            cg.fill();
        });

        // 5. Procedural Jersey Cow Coat (Caramel & Cream)
        const jCanvas = document.createElement('canvas');
        jCanvas.width = 256; jCanvas.height = 256;
        const jg = jCanvas.getContext('2d');
        jg.fillStyle = '#9c6644';
        jg.fillRect(0, 0, 256, 256);
        jg.fillStyle = '#ddb892';
        jg.fillRect(60, 160, 140, 80);

        // Shared material palette
        this.materials = {
            farmhouseWall: farmhouseGlowMat,
            farmhouseRoof: new THREE.MeshLambertMaterial({ color: 0x3d4044 }),
            farmhouseTrim: new THREE.MeshLambertMaterial({ color: 0xffffff }),
            barnWall: new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(bCanvas) }),
            barnRoof: new THREE.MeshLambertMaterial({ color: 0x5a636c }),
            barnTrim: new THREE.MeshLambertMaterial({ color: 0xf4f4f4 }),
            chimneyBrick: new THREE.MeshLambertMaterial({ color: 0x8a3c2c }),
            woodFence: new THREE.MeshLambertMaterial({ color: 0x6e523b }),
            porchDeck: new THREE.MeshLambertMaterial({ color: 0x5e4533 }),
            tilledSoil: new THREE.MeshLambertMaterial({ map: soilTex }),
            wheatStalk: new THREE.MeshLambertMaterial({ color: 0xdfb15b }),
            wheatHead: new THREE.MeshLambertMaterial({ color: 0xf5ce6b }),
            cropGreen: new THREE.MeshLambertMaterial({ color: 0x3b7d34 }),
            cropPumpkin: new THREE.MeshLambertMaterial({ color: 0xde6f1d }),
            hayBale: new THREE.MeshLambertMaterial({ color: 0xd4a74a }),
            skinFaceless: new THREE.MeshLambertMaterial({ color: 0xd9a57e }),
            skinIndian: new THREE.MeshLambertMaterial({ color: 0xb57c50 }), // Natural South Asian skin tone
            strawHat: new THREE.MeshLambertMaterial({ color: 0xe5bf6d }),
            denimOveralls: new THREE.MeshLambertMaterial({ color: 0x2e4a62 }),
            farmerBoot: new THREE.MeshLambertMaterial({ color: 0x2d1f18 }),
            flannelRed: new THREE.MeshLambertMaterial({ color: 0x992424 }),
            flannelBlue: new THREE.MeshLambertMaterial({ color: 0x224870 }),
            flannelGreen: new THREE.MeshLambertMaterial({ color: 0x2d5a36 }),
            flannelAmber: new THREE.MeshLambertMaterial({ color: 0x9e651e }),
            toolWood: new THREE.MeshLambertMaterial({ color: 0x543d2b }),
            toolMetal: new THREE.MeshLambertMaterial({ color: 0x88929c }),
            holsteinCoat: new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(cCanvas) }),
            jerseyCoat: new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(jCanvas) }),
            cowMuzzle: new THREE.MeshLambertMaterial({ color: 0xdfb4a4 }),
            cowHorn: new THREE.MeshLambertMaterial({ color: 0xe0dacb }),
            cowHoof: new THREE.MeshLambertMaterial({ color: 0x1f1f21 }),
            cowUdder: new THREE.MeshLambertMaterial({ color: 0xdfa09b }),
            teaStallWood: new THREE.MeshLambertMaterial({ color: 0x5c4228 }),
            teaStallCounter: new THREE.MeshLambertMaterial({ color: 0x7c5838 }),
            teaTinRoof: new THREE.MeshLambertMaterial({ color: 0x6e7882 }),
            teaTarpaulinBlue: new THREE.MeshLambertMaterial({ color: 0x1d5d85 }),
            brassKettle: new THREE.MeshLambertMaterial({ color: 0xcc9933 }),
            chaiGlass: new THREE.MeshLambertMaterial({ color: 0xc49a45, transparent: true, opacity: 0.85 }),
            kurtaWhite: new THREE.MeshLambertMaterial({ color: 0xefede6 }),
            kurtaSaffron: new THREE.MeshLambertMaterial({ color: 0xd96b27 }),
            kurtaBlue: new THREE.MeshLambertMaterial({ color: 0x2b638f }),
            kurtaGreen: new THREE.MeshLambertMaterial({ color: 0x367345 }),
            turbanRed: new THREE.MeshLambertMaterial({ color: 0xaa2828 }),
            turbanYellow: new THREE.MeshLambertMaterial({ color: 0xcca028 }),
            turbanGreen: new THREE.MeshLambertMaterial({ color: 0x256338 })
        };
    }

    _buildFarms() {
        // -----------------------------------------------------------------
        // FARM 1: Sunny Hollow North Farmstead (In the great northern meadow)
        // -----------------------------------------------------------------
        const f1 = new Farmstead(this.scene, this.materials, {
            name: "Sunny Hollow North Farmstead",
            center: new THREE.Vector3(20, 0, -920),
            housePos: new THREE.Vector3(-15, 0, -905),
            houseRotY: 0.15,
            barnPos: new THREE.Vector3(45, 0, -925),
            barnRotY: -0.1,
            wheatPos: new THREE.Vector3(-45, 0, -955),
            wheatSize: { w: 26, d: 20 },
            vegPos: new THREE.Vector3(-5, 0, -975),
            vegSize: { w: 22, d: 18 },
            pasturePos: new THREE.Vector3(38, 0, -865),
            pastureSize: { w: 32, d: 26 }
        });
        this.farmsteads.push(f1);

        this.farmers.push(
            new FarmerEntity(this.scene, this.materials, {
                id: 'n_farmer_1', name: 'Silas',
                homePos: new THREE.Vector3(-12, 0, -898),
                workPos: new THREE.Vector3(-42, 0, -952),
                shirtMat: this.materials.flannelRed, hatType: 'straw',
                umbrellaColor: 0x1e3a5f, workType: 'wheat'
            }),
            new FarmerEntity(this.scene, this.materials, {
                id: 'n_farmer_2', name: 'Martha',
                homePos: new THREE.Vector3(-16, 0, -899),
                workPos: new THREE.Vector3(-6, 0, -972),
                shirtMat: this.materials.flannelGreen, hatType: 'cap',
                umbrellaColor: 0x8b2500, workType: 'vegetables'
            }),
            new FarmerEntity(this.scene, this.materials, {
                id: 'n_farmer_3', name: 'Caleb',
                homePos: new THREE.Vector3(38, 0, -914),
                workPos: new THREE.Vector3(34, 0, -862),
                shirtMat: this.materials.flannelAmber, hatType: 'straw',
                umbrellaColor: 0x224a2c, workType: 'pasture'
            })
        );

        this.cows.push(
            new CowEntity(this.scene, this.materials, {
                id: 'n_cow_1', name: 'Bessie',
                homePos: new THREE.Vector3(48, 0, -912),
                pasturePos: new THREE.Vector3(32, 0, -860),
                isHolstein: true, isDraftWorker: true
            }),
            new CowEntity(this.scene, this.materials, {
                id: 'n_cow_2', name: 'Buttercup',
                homePos: new THREE.Vector3(44, 0, -914),
                pasturePos: new THREE.Vector3(42, 0, -856),
                isHolstein: false
            }),
            new CowEntity(this.scene, this.materials, {
                id: 'n_cow_3', name: 'Daisy',
                homePos: new THREE.Vector3(52, 0, -915),
                pasturePos: new THREE.Vector3(26, 0, -868),
                isHolstein: true
            })
        );

        // -----------------------------------------------------------------
        // FARM 2: Meadowbrook West Farmstead (Lush meadow beside west track corridor)
        // -----------------------------------------------------------------
        const f2 = new Farmstead(this.scene, this.materials, {
            name: "Meadowbrook West Farmstead",
            center: new THREE.Vector3(-245, 0, 500),
            housePos: new THREE.Vector3(-265, 0, 485),
            houseRotY: 1.35,
            barnPos: new THREE.Vector3(-225, 0, 515),
            barnRotY: 1.15,
            wheatPos: new THREE.Vector3(-280, 0, 535),
            wheatSize: { w: 24, d: 20 },
            vegPos: new THREE.Vector3(-250, 0, 555),
            vegSize: { w: 20, d: 18 },
            pasturePos: new THREE.Vector3(-215, 0, 455),
            pastureSize: { w: 28, d: 24 }
        });
        this.farmsteads.push(f2);

        this.farmers.push(
            new FarmerEntity(this.scene, this.materials, {
                id: 'w_farmer_1', name: 'Ezekiel',
                homePos: new THREE.Vector3(-260, 0, 488),
                workPos: new THREE.Vector3(-278, 0, 532),
                shirtMat: this.materials.flannelBlue, hatType: 'straw',
                umbrellaColor: 0xd4a017, workType: 'wheat'
            }),
            new FarmerEntity(this.scene, this.materials, {
                id: 'w_farmer_2', name: 'Hannah',
                homePos: new THREE.Vector3(-263, 0, 484),
                workPos: new THREE.Vector3(-248, 0, 552),
                shirtMat: this.materials.flannelRed, hatType: 'cap',
                umbrellaColor: 0x222222, workType: 'vegetables'
            }),
            new FarmerEntity(this.scene, this.materials, {
                id: 'w_farmer_3', name: 'Tobias',
                homePos: new THREE.Vector3(-228, 0, 510),
                workPos: new THREE.Vector3(-212, 0, 452),
                shirtMat: this.materials.flannelAmber, hatType: 'straw',
                umbrellaColor: 0x306040, workType: 'pasture'
            })
        );

        this.cows.push(
            new CowEntity(this.scene, this.materials, {
                id: 'w_cow_1', name: 'Bella',
                homePos: new THREE.Vector3(-220, 0, 512),
                pasturePos: new THREE.Vector3(-210, 0, 452),
                isHolstein: true, isDraftWorker: true
            }),
            new CowEntity(this.scene, this.materials, {
                id: 'w_cow_2', name: 'Ginger',
                homePos: new THREE.Vector3(-216, 0, 515),
                pasturePos: new THREE.Vector3(-218, 0, 458),
                isHolstein: false
            }),
            new CowEntity(this.scene, this.materials, {
                id: 'w_cow_3', name: 'Molly',
                homePos: new THREE.Vector3(-223, 0, 518),
                pasturePos: new THREE.Vector3(-206, 0, 448),
                isHolstein: true
            })
        );

        // -----------------------------------------------------------------
        // FARM 3: Greenlands South Valley Dairy Farm (Beside South loop village)
        // -----------------------------------------------------------------
        const f3 = new Farmstead(this.scene, this.materials, {
            name: "Greenlands South Dairy Farm",
            center: new THREE.Vector3(180, 0, 760),
            housePos: new THREE.Vector3(160, 0, 745),
            houseRotY: -0.65,
            barnPos: new THREE.Vector3(205, 0, 770),
            barnRotY: -0.85,
            wheatPos: new THREE.Vector3(145, 0, 790),
            wheatSize: { w: 24, d: 20 },
            vegPos: new THREE.Vector3(175, 0, 810),
            vegSize: { w: 20, d: 18 },
            pasturePos: new THREE.Vector3(210, 0, 720),
            pastureSize: { w: 30, d: 24 }
        });
        this.farmsteads.push(f3);

        this.farmers.push(
            new FarmerEntity(this.scene, this.materials, {
                id: 's_farmer_1', name: 'Arthur',
                homePos: new THREE.Vector3(163, 0, 748),
                workPos: new THREE.Vector3(148, 0, 788),
                shirtMat: this.materials.flannelGreen, hatType: 'straw',
                umbrellaColor: 0x1c3a60, workType: 'wheat'
            }),
            new FarmerEntity(this.scene, this.materials, {
                id: 's_farmer_2', name: 'Grace',
                homePos: new THREE.Vector3(158, 0, 744),
                workPos: new THREE.Vector3(172, 0, 808),
                shirtMat: this.materials.flannelRed, hatType: 'cap',
                umbrellaColor: 0x822015, workType: 'vegetables'
            }),
            new FarmerEntity(this.scene, this.materials, {
                id: 's_farmer_3', name: 'Reuben',
                homePos: new THREE.Vector3(202, 0, 765),
                workPos: new THREE.Vector3(208, 0, 718),
                shirtMat: this.materials.flannelBlue, hatType: 'straw',
                umbrellaColor: 0x224830, workType: 'pasture'
            })
        );

        this.cows.push(
            new CowEntity(this.scene, this.materials, {
                id: 's_cow_1', name: 'Blossom',
                homePos: new THREE.Vector3(212, 0, 768),
                pasturePos: new THREE.Vector3(206, 0, 716),
                isHolstein: true, isDraftWorker: true
            }),
            new CowEntity(this.scene, this.materials, {
                id: 's_cow_2', name: 'Penny',
                homePos: new THREE.Vector3(208, 0, 772),
                pasturePos: new THREE.Vector3(215, 0, 722),
                isHolstein: false
            }),
            new CowEntity(this.scene, this.materials, {
                id: 's_cow_3', name: 'Rosie',
                homePos: new THREE.Vector3(216, 0, 775),
                pasturePos: new THREE.Vector3(202, 0, 724),
                isHolstein: true
            })
        );

        // -----------------------------------------------------------------
        // FARM 4: Highland Grain Farm (Along northeast scenic track loop)
        // -----------------------------------------------------------------
        const f4 = new Farmstead(this.scene, this.materials, {
            name: "Highland Grain Farm",
            center: new THREE.Vector3(200, 0, -720),
            housePos: new THREE.Vector3(180, 0, -705),
            houseRotY: 0.85,
            barnPos: new THREE.Vector3(225, 0, -730),
            barnRotY: 0.65,
            wheatPos: new THREE.Vector3(170, 0, -750),
            wheatSize: { w: 24, d: 20 },
            vegPos: new THREE.Vector3(200, 0, -770),
            vegSize: { w: 20, d: 18 },
            pasturePos: new THREE.Vector3(230, 0, -680),
            pastureSize: { w: 26, d: 22 }
        });
        this.farmsteads.push(f4);

        this.farmers.push(
            new FarmerEntity(this.scene, this.materials, {
                id: 'h_farmer_1', name: 'Devon',
                homePos: new THREE.Vector3(182, 0, -702),
                workPos: new THREE.Vector3(168, 0, -748),
                shirtMat: this.materials.flannelAmber, hatType: 'straw',
                umbrellaColor: 0x902818, workType: 'wheat'
            }),
            new FarmerEntity(this.scene, this.materials, {
                id: 'h_farmer_2', name: 'Eleanor',
                homePos: new THREE.Vector3(222, 0, -725),
                workPos: new THREE.Vector3(228, 0, -678),
                shirtMat: this.materials.flannelBlue, hatType: 'cap',
                umbrellaColor: 0x1f3c60, workType: 'pasture'
            })
        );

        this.cows.push(
            new CowEntity(this.scene, this.materials, {
                id: 'h_cow_1', name: 'Barnaby',
                homePos: new THREE.Vector3(230, 0, -728),
                pasturePos: new THREE.Vector3(226, 0, -676),
                isHolstein: true, isDraftWorker: true
            }),
            new CowEntity(this.scene, this.materials, {
                id: 'h_cow_2', name: 'Nutmeg',
                homePos: new THREE.Vector3(226, 0, -732),
                pasturePos: new THREE.Vector3(234, 0, -682),
                isHolstein: false
            })
        );
    }

    _buildIndianTeaStalls() {
        const stallConfigs = [
            {
                name: "SHARMA CHAI STALL · गरमा गरम चाय",
                subText: "Special Cutting Chai & Hot Samosas",
                pos: new THREE.Vector3(255, 0, 470),
                rotY: -2.3,
                bgColor: '#8f2015',
                borderColor: '#e0b658'
            },
            {
                name: "CROSSING ROAD CHAI TAPRI · स्पेशल कटिंग चाय",
                subText: "Desi Ginger Tea & Butter Toast",
                pos: new THREE.Vector3(234, 0, 1085),
                rotY: -1.5,
                bgColor: '#174828',
                borderColor: '#f5ce6b'
            },
            {
                name: "VILLAGE CORNER CHAI · कड़क मसाला चाय",
                subText: "Pure Cardamom & Cinnamon Tea",
                pos: new THREE.Vector3(300, 0, -790),
                rotY: 1.6,
                bgColor: '#9c4812',
                borderColor: '#fde047'
            },
            {
                name: "MEADOWBROOK CHAI TAPRI · शुद्ध ताजा चाय",
                subText: "Hot Kulhad Chai & Biscuits",
                pos: new THREE.Vector3(-185, 0, 360),
                rotY: -0.6,
                bgColor: '#1c4164',
                borderColor: '#eab308'
            }
        ];

        for (let i = 0; i < stallConfigs.length; i++) {
            const sc = stallConfigs[i];
            const stall = new IndianTeaStall(this.scene, this.materials, sc);
            this.teaStalls.push(stall);

            // Add 3 customers eating/sipping tea at each tea stall
            const c1 = new ChaiCustomer(this.scene, this.materials, {
                stallPos: sc.pos,
                stallRotY: sc.rotY,
                localPos: new THREE.Vector3(-0.9, 0, 0.4), // Sitting on bench
                isSitting: true,
                kurtaMat: this.materials.kurtaSaffron,
                turbanMat: this.materials.turbanRed,
                sipInterval: 3.2 + i * 0.4
            });

            const c2 = new ChaiCustomer(this.scene, this.materials, {
                stallPos: sc.pos,
                stallRotY: sc.rotY,
                localPos: new THREE.Vector3(0.85, 0, 0.8), // Standing at counter
                isSitting: false,
                kurtaMat: this.materials.kurtaWhite,
                turbanMat: this.materials.turbanYellow,
                sipInterval: 4.0 + i * 0.5
            });

            const c3 = new ChaiCustomer(this.scene, this.materials, {
                stallPos: sc.pos,
                stallRotY: sc.rotY,
                localPos: new THREE.Vector3(0.0, 0, -0.65), // Chaiwala behind counter
                isSitting: false,
                isChaiwala: true,
                kurtaMat: this.materials.kurtaBlue,
                turbanMat: this.materials.turbanGreen,
                sipInterval: 6.0
            });

            this.chaiCustomers.push(c1, c2, c3);
        }
    }

    onTimeOfDayChange(presetKey) {
        this.currentTimePreset = presetKey;
        const isNightOrSunset = (presetKey === 'night' || presetKey === 'sunset');

        for (let i = 0; i < this.farmers.length; i++) {
            this.farmers[i].setTargetMode(isNightOrSunset ? 'HEADING_HOME' : 'HEADING_FARM');
        }
        for (let i = 0; i < this.cows.length; i++) {
            this.cows[i].setTargetMode(isNightOrSunset ? 'HEADING_HOME' : 'HEADING_PASTURE');
        }
    }

    onRainChange(isRaining) {
        this.isRaining = isRaining;
        for (let i = 0; i < this.farmers.length; i++) {
            this.farmers[i].setRaining(isRaining);
        }
        for (let i = 0; i < this.cows.length; i++) {
            this.cows[i].setRaining(isRaining);
        }
    }

    isSettled() {
        for (let i = 0; i < this.farmers.length; i++) {
            if (this.farmers[i].isMoving()) return false;
        }
        for (let i = 0; i < this.cows.length; i++) {
            if (this.cows[i].isMoving()) return false;
        }
        return true;
    }

    update(dt) {
        if (!dt || dt <= 0) return;
        for (let i = 0; i < this.farmers.length; i++) {
            this.farmers[i].update(dt);
        }
        for (let i = 0; i < this.cows.length; i++) {
            this.cows[i].update(dt);
        }
        for (let i = 0; i < this.chaiCustomers.length; i++) {
            this.chaiCustomers[i].update(dt);
        }
    }
}

// -------------------------------------------------------------
// IndianTeaStall: Rustic Village Chai Ki Tapri with Always-Glowing Yellow Bulb
// -------------------------------------------------------------
class IndianTeaStall {
    constructor(scene, materials, cfg) {
        this.scene = scene;
        this.materials = materials;
        this.cfg = cfg;

        this.root = new THREE.Group();
        this.root.position.copy(cfg.pos);
        this.root.rotation.y = cfg.rotY;

        this._buildStallStructure();
        this._buildAlwaysGlowingYellowBulb();
        this._buildTeaCounterAndKettle();
        this._buildSignboard();

        this.scene.add(this.root);
    }

    _buildStallStructure() {
        // Timber/Bamboo Pillars (4 corners + 2 center supports)
        const postGeo = new THREE.CylinderGeometry(0.09, 0.11, 2.7, 7);
        [[-1.8, 1.35, -1.3], [1.8, 1.35, -1.3], [-1.8, 1.35, 1.3], [1.8, 1.35, 1.3]].forEach(([px, py, pz]) => {
            const post = new THREE.Mesh(postGeo, this.materials.teaStallWood);
            post.position.set(px, py, pz);
            this.root.add(post);
        });

        // Corrugated tin & blue tarpaulin awning roof
        const roofBase = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 3.2), this.materials.teaTinRoof);
        roofBase.position.set(0, 2.75, 0.1);
        roofBase.rotation.x = 0.08;
        this.root.add(roofBase);

        const awning = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.04, 3.3), this.materials.teaTarpaulinBlue);
        awning.position.set(0, 2.82, 0.1);
        awning.rotation.x = 0.08;
        this.root.add(awning);

        // Front Wooden Chai Counter
        const counterTop = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.10, 0.75), this.materials.teaStallCounter);
        counterTop.position.set(0, 0.95, 0.1);
        this.root.add(counterTop);

        const counterBase = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.90, 0.65), this.materials.teaStallWood);
        counterBase.position.set(0, 0.45, 0.1);
        this.root.add(counterBase);

        // Side Wooden Seating Benches for Customers
        const benchGeo = new THREE.BoxGeometry(0.45, 0.08, 1.9);
        const b1 = new THREE.Mesh(benchGeo, this.materials.teaStallCounter);
        b1.position.set(-1.25, 0.48, 0.4);
        this.root.add(b1);

        [-0.45, 0.45, 1.25].forEach(bz => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.08), this.materials.teaStallWood);
            leg.position.set(-1.25, 0.22, bz);
            this.root.add(leg);
        });
    }

    _buildAlwaysGlowingYellowBulb() {
        // Black hanging power cord from ceiling
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.75, 6), new THREE.MeshBasicMaterial({ color: 0x111111 }));
        cord.position.set(0, 2.38, 0.0);
        this.root.add(cord);

        // Socket fixture
        const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.10, 8), new THREE.MeshLambertMaterial({ color: 0x333333 }));
        socket.position.set(0, 2.02, 0.0);
        this.root.add(socket);

        // Always-glowing yellow incandescent bulb mesh
        const bulbGeo = new THREE.SphereGeometry(0.13, 10, 10);
        const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe680 });
        const bulbMesh = new THREE.Mesh(bulbGeo, bulbMat);
        bulbMesh.position.set(0, 1.90, 0.0);
        this.root.add(bulbMesh);

        // Dedicated warm yellow light that ALWAYS stays on (day and night)
        const yellowLight = new THREE.PointLight(0xffb732, 1.6, 16.0);
        yellowLight.position.set(0, 1.85, 0.0);
        yellowLight.castShadow = false;
        this.root.add(yellowLight);
    }

    _buildTeaCounterAndKettle() {
        // Traditional Indian brass/aluminum tea kettle
        const kettleGroup = new THREE.Group();
        kettleGroup.position.set(0.65, 1.05, 0.1);

        const kBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.32, 10), this.materials.brassKettle);
        kBody.position.y = 0.16;
        kettleGroup.add(kBody);

        const kLid = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.10, 8), this.materials.brassKettle);
        kLid.position.y = 0.36;
        kettleGroup.add(kLid);

        const kSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.22, 6), this.materials.brassKettle);
        kSpout.position.set(0.18, 0.22, 0.0);
        kSpout.rotation.z = -Math.PI * 0.32;
        kettleGroup.add(kSpout);

        const kHandle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 6, 12, Math.PI), this.materials.brassKettle);
        kHandle.position.set(0, 0.36, 0);
        kettleGroup.add(kHandle);

        // Small gas stove under kettle with blue/red burner ring
        const stove = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 10), new THREE.MeshLambertMaterial({ color: 0x222222 }));
        stove.position.y = 0.03;
        kettleGroup.add(stove);
        this.root.add(kettleGroup);

        // Wire rack of Indian cutting chai glasses
        const tray = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.28), new THREE.MeshLambertMaterial({ color: 0x888888 }));
        tray.position.set(-0.55, 1.02, 0.1);
        this.root.add(tray);

        [-0.14, 0, 0.14].forEach(gx => {
            [-0.06, 0.06].forEach(gz => {
                const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.026, 0.08, 6), this.materials.chaiGlass);
                glass.position.set(-0.55 + gx, 1.08, 0.1 + gz);
                this.root.add(glass);
            });
        });

        // Biscuit / Rusk glass jar
        const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.26, 8), new THREE.MeshLambertMaterial({ color: 0xd4c28a, transparent: true, opacity: 0.75 }));
        jar.position.set(-0.15, 1.13, -0.05);
        this.root.add(jar);
    }

    _buildSignboard() {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 110;
        const g = canvas.getContext('2d');
        g.fillStyle = this.cfg.bgColor || '#8f2015';
        g.fillRect(0, 0, 512, 110);
        g.strokeStyle = this.cfg.borderColor || '#e0b658';
        g.lineWidth = 6;
        g.strokeRect(6, 6, 500, 98);

        g.fillStyle = '#ffffff';
        g.font = 'bold 28px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(this.cfg.name, 256, 42);

        g.fillStyle = '#fde047';
        g.font = 'italic 18px sans-serif';
        g.fillText(this.cfg.subText || "Fresh Hot Cutting Chai", 256, 78);

        const signMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) });
        const sign = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.72, 0.12), signMat);
        sign.position.set(0, 2.92, 1.55);
        this.root.add(sign);
    }
}

// -------------------------------------------------------------
// ChaiCustomer: Minecraft-Style Indian Villager Sipping/Eating Tea
// Clean faceless head (NO eye, nose, mouth), colorful kurta, sipping cutting chai
// -------------------------------------------------------------
class ChaiCustomer {
    constructor(scene, materials, opts) {
        this.scene = scene;
        this.materials = materials;
        this.opts = opts;

        this.sipTimer = Math.random() * 5.0;
        this.sipInterval = opts.sipInterval || 3.5;
        this.isSitting = opts.isSitting || false;
        this.isChaiwala = opts.isChaiwala || false;

        this.root = new THREE.Group();
        this.root.position.copy(opts.stallPos);
        this.root.rotation.y = opts.stallRotY;

        this.group = new THREE.Group();
        this.group.position.copy(opts.localPos);
        if (this.isSitting) {
            this.group.rotation.y = Math.PI * 0.5; // Turn to face stall center
        }
        this.root.add(this.group);

        this._buildMesh(opts);
        this.scene.add(this.root);
    }

    _buildMesh(opts) {
        const skinMat = this.materials.skinIndian;
        const kurtaMat = opts.kurtaMat || this.materials.kurtaSaffron;
        const legMat = this.materials.kurtaWhite;

        // 1. Torso
        const torsoGeo = new THREE.BoxGeometry(0.42, 0.56, 0.24);
        this.torsoMesh = new THREE.Mesh(torsoGeo, kurtaMat);
        this.torsoMesh.position.y = this.isSitting ? 0.78 : 1.12;
        this.group.add(this.torsoMesh);

        // 2. Faceless Head (NO eye, nose, mouth)
        const headGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
        this.headMesh = new THREE.Mesh(headGeo, skinMat);
        this.headMesh.position.set(0, this.isSitting ? 1.18 : 1.52, 0);
        this.group.add(this.headMesh);

        // Turban / Pagri / Headwrap
        const turbanGeo = new THREE.BoxGeometry(0.28, 0.12, 0.28);
        const turban = new THREE.Mesh(turbanGeo, opts.turbanMat || this.materials.turbanYellow);
        turban.position.set(0, 0.14, 0);
        this.headMesh.add(turban);

        // 3. Legs (Seated bend or standing)
        const legGeo = new THREE.BoxGeometry(0.15, 0.68, 0.16);

        if (this.isSitting) {
            // Bent sitting legs
            const lLeg = new THREE.Mesh(legGeo, legMat);
            lLeg.position.set(-0.11, 0.44, 0.26);
            lLeg.rotation.x = Math.PI * 0.45;
            this.group.add(lLeg);

            const rLeg = new THREE.Mesh(legGeo, legMat);
            rLeg.position.set(0.11, 0.44, 0.26);
            rLeg.rotation.x = Math.PI * 0.45;
            this.group.add(rLeg);
        } else {
            // Standing legs
            const lLeg = new THREE.Mesh(legGeo, legMat);
            lLeg.position.set(-0.11, 0.38, 0);
            this.group.add(lLeg);

            const rLeg = new THREE.Mesh(legGeo, legMat);
            rLeg.position.set(0.11, 0.38, 0);
            this.group.add(rLeg);
        }

        // 4. Arms & Cutting Chai Glass
        const armGeo = new THREE.BoxGeometry(0.12, 0.54, 0.12);

        this.leftArm = new THREE.Group();
        this.leftArm.position.set(-0.27, this.isSitting ? 1.02 : 1.34, 0);
        const lArmMesh = new THREE.Mesh(armGeo, kurtaMat);
        lArmMesh.position.y = -0.24;
        this.leftArm.add(lArmMesh);
        this.group.add(this.leftArm);

        // Right Arm (Raises to sip cutting chai)
        this.rightArm = new THREE.Group();
        this.rightArm.position.set(0.27, this.isSitting ? 1.02 : 1.34, 0);
        const rArmMesh = new THREE.Mesh(armGeo, kurtaMat);
        rArmMesh.position.y = -0.24;
        this.rightArm.add(rArmMesh);

        // Hand holding small cutting chai glass
        const hand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), skinMat);
        hand.position.set(0, -0.52, 0);
        this.rightArm.add(hand);

        if (!this.isChaiwala) {
            const chai = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.026, 0.08, 6), this.materials.chaiGlass);
            chai.position.set(0, -0.52, 0.08);
            this.rightArm.add(chai);
        }
        this.group.add(this.rightArm);
    }

    update(dt) {
        this.sipTimer += dt;
        const cycle = (this.sipTimer % this.sipInterval) / this.sipInterval;

        if (!this.isChaiwala) {
            // Smooth tea sipping animation
            if (cycle < 0.25) {
                // Raising glass to mouth
                const t = cycle / 0.25;
                const ease = Math.sin(t * Math.PI * 0.5);
                this.rightArm.rotation.x = -0.3 - ease * 1.35;
                this.rightArm.rotation.z = -ease * 0.35;
                this.headMesh.rotation.x = ease * 0.18;
            } else if (cycle < 0.55) {
                // Pausing to sip tea
                this.rightArm.rotation.x = -1.65;
                this.rightArm.rotation.z = -0.35;
                this.headMesh.rotation.x = 0.18 + Math.sin(this.sipTimer * 3.0) * 0.03;
            } else if (cycle < 0.75) {
                // Lowering glass
                const t = (cycle - 0.55) / 0.20;
                const ease = Math.cos(t * Math.PI * 0.5);
                this.rightArm.rotation.x = -0.3 - ease * 1.35;
                this.rightArm.rotation.z = -ease * 0.35;
                this.headMesh.rotation.x = ease * 0.18;
            } else {
                // Resting and chatting
                this.rightArm.rotation.x = -0.3;
                this.rightArm.rotation.z = 0;
                this.headMesh.rotation.x = Math.sin(this.sipTimer * 1.5) * 0.04;
                this.headMesh.rotation.y = Math.sin(this.sipTimer * 0.8) * 0.08;
            }
        } else {
            // Chaiwala tending kettle: stirs, adjusts burner
            this.rightArm.rotation.x = -0.65 + Math.sin(this.sipTimer * 2.0) * 0.25;
            this.leftArm.rotation.x = -0.45 + Math.sin(this.sipTimer * 1.5) * 0.15;
            this.headMesh.rotation.x = 0.15 + Math.sin(this.sipTimer * 1.0) * 0.05;
        }
    }
}

// -------------------------------------------------------------
// FarmerEntity: Minecraft-inspired humanoid (~1.78m realistic scale)
// Clean faceless head (no eye, nose, mouth), articulated limbs, hoe, umbrella
// -------------------------------------------------------------
class FarmerEntity {
    constructor(scene, materials, opts) {
        this.scene = scene;
        this.materials = materials;
        this.id = opts.id;
        this.name = opts.name;
        this.homePos = opts.homePos.clone();
        this.workPos = opts.workPos.clone();
        this.workType = opts.workType || 'wheat';

        this.currentPos = opts.workPos.clone();
        this.targetPos = opts.workPos.clone();
        this.state = 'FARMING';

        this.isRaining = false;
        this.speed = 1.25;
        this.walkPhase = Math.random() * Math.PI * 2;
        this.farmingTimer = Math.random() * 5.0;
        this.idleTimer = Math.random() * 3.0;

        this._dir = new THREE.Vector3();

        this._buildMesh(opts);
        this.scene.add(this.root);
        this.root.position.copy(this.currentPos);
    }

    _buildMesh(opts) {
        this.root = new THREE.Group();

        // 1. Torso
        const torsoGeo = new THREE.BoxGeometry(0.44, 0.58, 0.26);
        this.torsoMesh = new THREE.Mesh(torsoGeo, opts.shirtMat || this.materials.flannelRed);
        this.torsoMesh.position.y = 1.14;
        this.root.add(this.torsoMesh);

        // Suspenders / overalls apron
        const bibGeo = new THREE.BoxGeometry(0.32, 0.36, 0.04);
        const bibMesh = new THREE.Mesh(bibGeo, this.materials.denimOveralls);
        bibMesh.position.set(0, -0.11, 0.135);
        this.torsoMesh.add(bibMesh);

        // 2. Faceless Head (NO eye, nose, mouth)
        const headGeo = new THREE.BoxGeometry(0.26, 0.26, 0.26);
        this.headMesh = new THREE.Mesh(headGeo, this.materials.skinFaceless);
        this.headMesh.position.set(0, 1.56, 0);
        this.root.add(this.headMesh);

        // Hat
        if (opts.hatType === 'straw') {
            const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.04, 12), this.materials.strawHat);
            brim.position.y = 0.14;
            this.headMesh.add(brim);
            const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.19, 0.12, 10), this.materials.strawHat);
            crown.position.y = 0.21;
            this.headMesh.add(crown);
        } else {
            const cap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.32), this.materials.denimOveralls);
            cap.position.set(0, 0.14, 0.02);
            this.headMesh.add(cap);
        }

        // 3. Articulated Legs
        const legGeo = new THREE.BoxGeometry(0.16, 0.72, 0.18);
        const bootGeo = new THREE.BoxGeometry(0.17, 0.14, 0.24);

        this.leftLeg = new THREE.Group();
        this.leftLeg.position.set(-0.13, 0.85, 0);
        const lPants = new THREE.Mesh(legGeo, this.materials.denimOveralls);
        lPants.position.y = -0.36;
        this.leftLeg.add(lPants);
        const lBoot = new THREE.Mesh(bootGeo, this.materials.farmerBoot);
        lBoot.position.set(0, -0.72, 0.03);
        this.leftLeg.add(lBoot);
        this.root.add(this.leftLeg);

        this.rightLeg = new THREE.Group();
        this.rightLeg.position.set(0.13, 0.85, 0);
        const rPants = new THREE.Mesh(legGeo, this.materials.denimOveralls);
        rPants.position.y = -0.36;
        this.rightLeg.add(rPants);
        const rBoot = new THREE.Mesh(bootGeo, this.materials.farmerBoot);
        rBoot.position.set(0, -0.72, 0.03);
        this.rightLeg.add(rBoot);
        this.root.add(this.rightLeg);

        // 4. Articulated Arms
        const armGeo = new THREE.BoxGeometry(0.13, 0.58, 0.14);

        this.leftArm = new THREE.Group();
        this.leftArm.position.set(-0.29, 1.38, 0);
        const lArmMesh = new THREE.Mesh(armGeo, opts.shirtMat || this.materials.flannelRed);
        lArmMesh.position.y = -0.27;
        this.leftArm.add(lArmMesh);
        const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.11), this.materials.skinFaceless);
        lHand.position.y = -0.58;
        this.leftArm.add(lHand);
        this.root.add(this.leftArm);

        this.rightArm = new THREE.Group();
        this.rightArm.position.set(0.29, 1.38, 0);
        const rArmMesh = new THREE.Mesh(armGeo, opts.shirtMat || this.materials.flannelRed);
        rArmMesh.position.y = -0.27;
        this.rightArm.add(rArmMesh);
        const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.11), this.materials.skinFaceless);
        rHand.position.y = -0.58;
        this.rightArm.add(rHand);
        this.root.add(this.rightArm);

        // Farming Tool
        this.toolGroup = new THREE.Group();
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.35, 6), this.materials.toolWood);
        handle.position.set(0, -0.35, 0.28);
        handle.rotation.x = Math.PI * 0.32;
        this.toolGroup.add(handle);
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.03), this.materials.toolMetal);
        blade.position.set(0, -0.85, 0.65);
        blade.rotation.x = -Math.PI * 0.18;
        this.toolGroup.add(blade);
        this.rightArm.add(this.toolGroup);

        // Umbrella Accessory
        this.umbrellaGroup = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.15, 6), this.materials.toolWood);
        pole.position.set(0, 0.45, 0);
        this.umbrellaGroup.add(pole);

        const crook = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 6, 8, Math.PI), this.materials.toolWood);
        crook.position.set(0.04, -0.12, 0);
        crook.rotation.z = Math.PI;
        this.umbrellaGroup.add(crook);

        const uColor = opts.umbrellaColor || 0x1e3a5f;
        const umbrellaMat = new THREE.MeshLambertMaterial({ color: uColor, side: THREE.DoubleSide });
        const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.68, 0.32, 8, 1, true), umbrellaMat);
        canopy.position.set(0, 0.95, 0);
        this.umbrellaGroup.add(canopy);

        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 6), this.materials.toolMetal);
        tip.position.set(0, 1.15, 0);
        this.umbrellaGroup.add(tip);

        this.umbrellaGroup.position.set(0, -0.55, 0.15);
        this.umbrellaGroup.visible = false;
        this.rightArm.add(this.umbrellaGroup);
    }

    setTargetMode(mode) {
        if (mode === 'HEADING_HOME') {
            this.targetPos.copy(this.homePos);
            this.state = 'HEADING_HOME';
            if (this.toolGroup) this.toolGroup.visible = false;
        } else if (mode === 'HEADING_FARM') {
            this.targetPos.copy(this.workPos);
            this.state = 'HEADING_FARM';
            if (this.toolGroup) this.toolGroup.visible = true;
        }
    }

    setRaining(isRaining) {
        this.isRaining = isRaining;
        this.umbrellaGroup.visible = isRaining;
        if (this.toolGroup) this.toolGroup.visible = !isRaining && (this.state === 'FARMING' || this.state === 'HEADING_FARM');
    }

    isMoving() {
        if (this.isRaining) return false;
        return (this.state === 'HEADING_HOME' || this.state === 'HEADING_FARM');
    }

    update(dt) {
        if (this.isRaining) {
            this.rightArm.rotation.x = -Math.PI * 0.72;
            this.rightArm.rotation.z = -0.15;
            this.leftArm.rotation.x = 0;
            this.leftArm.rotation.z = 0;
            this.leftLeg.rotation.x = 0;
            this.rightLeg.rotation.x = 0;
            this.idleTimer += dt;
            this.torsoMesh.position.y = 1.14 + Math.sin(this.idleTimer * 1.6) * 0.01;
            return;
        }

        if (this.state === 'HEADING_HOME' || this.state === 'HEADING_FARM') {
            this._dir.subVectors(this.targetPos, this.currentPos);
            this._dir.y = 0;
            const dist = this._dir.length();

            if (dist > 0.4) {
                this._dir.normalize();
                const step = this.speed * dt;
                this.currentPos.addScaledVector(this._dir, Math.min(dist, step));
                this.root.position.copy(this.currentPos);

                const targetYaw = Math.atan2(this._dir.x, this._dir.z);
                this.root.rotation.y = targetYaw;

                this.walkPhase += dt * 6.5;
                const swing = Math.sin(this.walkPhase) * 0.52;
                this.leftLeg.rotation.x = swing;
                this.rightLeg.rotation.x = -swing;
                this.leftArm.rotation.x = -swing * 0.75;
                this.rightArm.rotation.x = swing * 0.75;
                this.rightArm.rotation.z = 0;
                this.torsoMesh.position.y = 1.14 + Math.abs(Math.sin(this.walkPhase * 2)) * 0.025;
            } else {
                if (this.state === 'HEADING_HOME') {
                    this.state = 'AT_HOME';
                    this.leftLeg.rotation.x = 0;
                    this.rightLeg.rotation.x = 0;
                    this.leftArm.rotation.x = 0;
                    this.rightArm.rotation.x = 0;
                } else {
                    this.state = 'FARMING';
                    if (this.toolGroup) this.toolGroup.visible = true;
                }
            }
            return;
        }

        if (this.state === 'FARMING') {
            this.farmingTimer += dt;
            const workCycle = Math.sin(this.farmingTimer * 2.2);

            this.torsoMesh.rotation.x = 0.14 + Math.max(0, workCycle * 0.18);
            this.headMesh.rotation.x = 0.22 + Math.max(0, workCycle * 0.12);
            this.rightArm.rotation.x = -0.45 - workCycle * 0.42;
            this.leftArm.rotation.x = -0.25 - workCycle * 0.22;
            this.leftLeg.rotation.x = 0.08;
            this.rightLeg.rotation.x = -0.08;
            return;
        }

        if (this.state === 'AT_HOME') {
            this.idleTimer += dt;
            this.torsoMesh.rotation.x = 0;
            this.headMesh.rotation.x = 0;
            this.leftArm.rotation.x = 0;
            this.rightArm.rotation.x = 0;
            this.leftLeg.rotation.x = 0;
            this.rightLeg.rotation.x = 0;
            this.torsoMesh.position.y = 1.14 + Math.sin(this.idleTimer * 1.4) * 0.008;
        }
    }
}

// -------------------------------------------------------------
// CowEntity: Minecraft-inspired bovine (~1.42m shoulder, 2.1m length)
// Clean faceless head/snout (no eyes, nose, mouth), working draft harness or pasture grazing
// -------------------------------------------------------------
class CowEntity {
    constructor(scene, materials, opts) {
        this.scene = scene;
        this.materials = materials;
        this.id = opts.id;
        this.name = opts.name;
        this.homePos = opts.homePos.clone();
        this.pasturePos = opts.pasturePos.clone();
        this.isDraftWorker = opts.isDraftWorker || false;

        this.currentPos = opts.pasturePos.clone();
        this.targetPos = opts.pasturePos.clone();
        this.state = 'GRAZING';

        this.isRaining = false;
        this.speed = 0.95;
        this.walkPhase = Math.random() * Math.PI * 2;
        this.grazeTimer = Math.random() * 5.0;
        this.tailTimer = Math.random() * 3.0;

        this._dir = new THREE.Vector3();

        this._buildMesh(opts);
        this.scene.add(this.root);
        this.root.position.copy(this.currentPos);
    }

    _buildMesh(opts) {
        this.root = new THREE.Group();
        const coatMat = opts.isHolstein ? this.materials.holsteinCoat : this.materials.jerseyCoat;

        // 1. Torso
        const bodyGeo = new THREE.BoxGeometry(0.88, 0.90, 1.80);
        this.bodyMesh = new THREE.Mesh(bodyGeo, coatMat);
        this.bodyMesh.position.y = 1.15;
        this.root.add(this.bodyMesh);

        // Pink udder
        const udder = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.36), this.materials.cowUdder);
        udder.position.set(0, -0.46, -0.28);
        this.bodyMesh.add(udder);

        // Working Draft Harness / Wooden Farm Yoke
        if (this.isDraftWorker) {
            const harnessMat = new THREE.MeshLambertMaterial({ color: 0x3d2716 });
            const collar = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.96, 0.16), harnessMat);
            collar.position.set(0, 0.12, 0.72);
            this.bodyMesh.add(collar);

            const strap = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.14, 1.45), harnessMat);
            strap.position.set(0, -0.15, -0.12);
            this.bodyMesh.add(strap);
        }

        // 2. Faceless Head & Neck (NO eye, nose, mouth)
        this.headNeck = new THREE.Group();
        this.headNeck.position.set(0, 0.22, 0.88);

        const neck = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.54, 0.58), coatMat);
        neck.position.set(0, 0.12, 0.24);
        neck.rotation.x = -Math.PI * 0.14;
        this.headNeck.add(neck);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.46, 0.54), coatMat);
        head.position.set(0, 0.28, 0.55);
        this.headNeck.add(head);

        const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.28, 0.32), this.materials.cowMuzzle);
        muzzle.position.set(0, 0.18, 0.85);
        this.headNeck.add(muzzle);

        const hornGeo = new THREE.ConeGeometry(0.06, 0.22, 6);
        const lHorn = new THREE.Mesh(hornGeo, this.materials.cowHorn);
        lHorn.position.set(-0.24, 0.56, 0.48);
        lHorn.rotation.set(-0.2, 0, -0.4);
        this.headNeck.add(lHorn);

        const rHorn = new THREE.Mesh(hornGeo, this.materials.cowHorn);
        rHorn.position.set(0.24, 0.56, 0.48);
        rHorn.rotation.set(-0.2, 0, 0.4);
        this.headNeck.add(rHorn);

        const earGeo = new THREE.BoxGeometry(0.22, 0.08, 0.12);
        const lEar = new THREE.Mesh(earGeo, coatMat);
        lEar.position.set(-0.35, 0.42, 0.46);
        lEar.rotation.z = -0.25;
        this.headNeck.add(lEar);

        const rEar = new THREE.Mesh(earGeo, coatMat);
        rEar.position.set(0.35, 0.42, 0.46);
        rEar.rotation.z = 0.25;
        this.headNeck.add(rEar);

        this.bodyMesh.add(this.headNeck);

        // Tail
        this.tail = new THREE.Group();
        this.tail.position.set(0, 0.36, -0.92);
        const tailRod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.62, 6), coatMat);
        tailRod.position.y = -0.31;
        this.tail.add(tailRod);
        const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.08), this.materials.cowHoof);
        tuft.position.y = -0.66;
        this.tail.add(tuft);
        this.bodyMesh.add(this.tail);

        // 3. 4 Articulated Legs
        const legGeo = new THREE.BoxGeometry(0.20, 0.72, 0.20);
        const hoofGeo = new THREE.BoxGeometry(0.21, 0.12, 0.22);

        const makeLeg = (x, z) => {
            const grp = new THREE.Group();
            grp.position.set(x, 0.72, z);
            const legMesh = new THREE.Mesh(legGeo, coatMat);
            legMesh.position.y = -0.36;
            grp.add(legMesh);
            const hoof = new THREE.Mesh(hoofGeo, this.materials.cowHoof);
            hoof.position.set(0, -0.68, 0.01);
            grp.add(hoof);
            this.root.add(grp);
            return grp;
        };

        this.legFL = makeLeg(-0.32, 0.62);
        this.legFR = makeLeg(0.32, 0.62);
        this.legBL = makeLeg(-0.32, -0.62);
        this.legBR = makeLeg(0.32, -0.62);
    }

    setTargetMode(mode) {
        if (mode === 'HEADING_HOME') {
            this.targetPos.copy(this.homePos);
            this.state = 'HEADING_HOME';
        } else if (mode === 'HEADING_PASTURE') {
            this.targetPos.copy(this.pasturePos);
            this.state = 'HEADING_PASTURE';
        }
    }

    setRaining(isRaining) {
        this.isRaining = isRaining;
    }

    isMoving() {
        if (this.isRaining) return false;
        return (this.state === 'HEADING_HOME' || this.state === 'HEADING_PASTURE');
    }

    update(dt) {
        if (this.isRaining) {
            this.legFL.rotation.x = 0;
            this.legFR.rotation.x = 0;
            this.legBL.rotation.x = 0;
            this.legBR.rotation.x = 0;
            this.headNeck.rotation.x = 0.12;
            return;
        }

        if (this.state === 'HEADING_HOME' || this.state === 'HEADING_PASTURE') {
            this._dir.subVectors(this.targetPos, this.currentPos);
            this._dir.y = 0;
            const dist = this._dir.length();

            if (dist > 0.45) {
                this._dir.normalize();
                const step = this.speed * dt;
                this.currentPos.addScaledVector(this._dir, Math.min(dist, step));
                this.root.position.copy(this.currentPos);

                const targetYaw = Math.atan2(this._dir.x, this._dir.z);
                this.root.rotation.y = targetYaw;

                this.walkPhase += dt * 5.2;
                const swing = Math.sin(this.walkPhase) * 0.44;
                this.legFL.rotation.x = swing;
                this.legFR.rotation.x = -swing;
                this.legBL.rotation.x = -swing;
                this.legBR.rotation.x = swing;

                this.tail.rotation.z = Math.sin(this.walkPhase * 1.5) * 0.22;
                this.bodyMesh.position.y = 1.15 + Math.abs(Math.sin(this.walkPhase * 2)) * 0.02;
                this.headNeck.rotation.x = 0.1 + Math.sin(this.walkPhase) * 0.06;
            } else {
                if (this.state === 'HEADING_HOME') {
                    this.state = 'AT_HOME';
                    this.legFL.rotation.x = 0;
                    this.legFR.rotation.x = 0;
                    this.legBL.rotation.x = 0;
                    this.legBR.rotation.x = 0;
                    this.headNeck.rotation.x = 0.1;
                } else {
                    this.state = 'GRAZING';
                }
            }
            return;
        }

        if (this.state === 'GRAZING') {
            this.grazeTimer += dt;
            this.tailTimer += dt;
            this.tail.rotation.z = Math.sin(this.tailTimer * 1.8) * 0.25;

            if (this.isDraftWorker) {
                // Draft worker cow working and plowing the soil furrows
                const workWalk = Math.sin(this.grazeTimer * 0.6);
                const stepSwing = workWalk * 0.28;
                this.legFL.rotation.x = stepSwing;
                this.legFR.rotation.x = -stepSwing;
                this.legBL.rotation.x = -stepSwing;
                this.legBR.rotation.x = stepSwing;
                this.headNeck.rotation.x = 0.28 + Math.abs(workWalk) * 0.12;
                // Work furrow pacing around pasturePos
                this.root.position.x = this.pasturePos.x + workWalk * 2.2;
                this.root.position.z = this.pasturePos.z + Math.cos(this.grazeTimer * 0.3) * 0.8;
                this.root.rotation.y = workWalk >= 0 ? 0 : Math.PI;
            } else {
                // Pasture grazing cow: head lowered chewing grass
                this.headNeck.rotation.x = 0.42 + Math.sin(this.grazeTimer * 0.8) * 0.08;
            }
            return;
        }

        if (this.state === 'AT_HOME') {
            this.headNeck.rotation.x = 0.15;
            this.legFL.rotation.x = 0;
            this.legFR.rotation.x = 0;
            this.legBL.rotation.x = 0;
            this.legBR.rotation.x = 0;
        }
    }
}

// -------------------------------------------------------------
// Farmstead: Realistic country farmhouse, red barn, crop fields & fences
// -------------------------------------------------------------
class Farmstead {
    constructor(scene, materials, cfg) {
        this.scene = scene;
        this.materials = materials;
        this.cfg = cfg;

        this.group = new THREE.Group();
        this._buildFarmhouse(cfg.housePos, cfg.houseRotY || 0);
        this._buildRedBarn(cfg.barnPos, cfg.barnRotY || 0);
        this._buildCropFields(cfg.wheatPos, cfg.wheatSize, cfg.vegPos, cfg.vegSize);
        this._buildPasture(cfg.pasturePos, cfg.pastureSize);
        this.scene.add(this.group);
    }

    _buildFarmhouse(pos, rotY) {
        const hGroup = new THREE.Group();
        hGroup.position.copy(pos);
        hGroup.rotation.y = rotY;

        const houseGeo = new THREE.BoxGeometry(11, 5.8, 8.5);
        const house = new THREE.Mesh(houseGeo, this.materials.farmhouseWall);
        house.position.y = 2.9;
        hGroup.add(house);

        const roofGeo = new THREE.ConeGeometry(9.6, 3.2, 4);
        roofGeo.rotateY(Math.PI / 4);
        roofGeo.scale(1.24, 1.0, 0.95);
        const roof = new THREE.Mesh(roofGeo, this.materials.farmhouseRoof);
        roof.position.set(0, 7.2, 0);
        hGroup.add(roof);

        const chim = new THREE.Mesh(new THREE.BoxGeometry(1.1, 4.2, 1.1), this.materials.chimneyBrick);
        chim.position.set(4.2, 7.2, 0);
        hGroup.add(chim);

        const porchFloor = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.35, 2.8), this.materials.porchDeck);
        porchFloor.position.set(0, 0.18, 5.2);
        hGroup.add(porchFloor);

        const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.25, 3.0), this.materials.farmhouseRoof);
        porchRoof.position.set(0, 3.4, 5.2);
        porchRoof.rotation.x = 0.08;
        hGroup.add(porchRoof);

        [-4.2, -1.4, 1.4, 4.2].forEach(px => {
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.2, 0.18), this.materials.farmhouseTrim);
            pillar.position.set(px, 1.7, 6.4);
            hGroup.add(pillar);
        });

        const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffd27d });
        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), lanternMat);
        lantern.position.set(0, 2.9, 4.8);
        hGroup.add(lantern);

        this.group.add(hGroup);
    }

    _buildRedBarn(pos, rotY) {
        const bGroup = new THREE.Group();
        bGroup.position.copy(pos);
        bGroup.rotation.y = rotY;

        const barn = new THREE.Mesh(new THREE.BoxGeometry(16, 7.2, 12), this.materials.barnWall);
        barn.position.y = 3.6;
        bGroup.add(barn);

        const roofGeo = new THREE.ConeGeometry(14.8, 4.8, 4);
        roofGeo.rotateY(Math.PI / 4);
        roofGeo.scale(1.35, 1.0, 1.05);
        const roof = new THREE.Mesh(roofGeo, this.materials.barnRoof);
        roof.position.set(0, 9.4, 0);
        bGroup.add(roof);

        const loftDoor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 0.12), this.materials.barnTrim);
        loftDoor.position.set(0, 6.2, 6.06);
        bGroup.add(loftDoor);

        const winchBeam = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 1.8), this.materials.woodFence);
        winchBeam.position.set(0, 8.2, 6.8);
        bGroup.add(winchBeam);

        const shelterRoof = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.22, 10.5), this.materials.barnRoof);
        shelterRoof.position.set(10.5, 3.6, 0);
        shelterRoof.rotation.z = -0.22;
        bGroup.add(shelterRoof);

        [-4.5, 0, 4.5].forEach(pz => {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.0, 6), this.materials.woodFence);
            post.position.set(12.8, 1.5, pz);
            bGroup.add(post);
        });

        const baleGeo = new THREE.CylinderGeometry(0.85, 0.85, 1.4, 12);
        baleGeo.rotateZ(Math.PI / 2);
        [[8.5, 0.85, 8.5], [10.5, 0.85, 8.2], [9.5, 2.3, 8.3], [11.8, 0.85, 6.2]].forEach(([hx, hy, hz]) => {
            const bale = new THREE.Mesh(baleGeo, this.materials.hayBale);
            bale.position.set(hx, hy, hz);
            bGroup.add(bale);
        });

        this.group.add(bGroup);
    }

    _buildCropFields(wPos, wSize, vPos, vSize) {
        // 1. Golden Wheat Field
        const wheatField = new THREE.Group();
        wheatField.position.copy(wPos);

        const soilW = new THREE.Mesh(new THREE.PlaneGeometry(wSize.w, wSize.d), this.materials.tilledSoil);
        soilW.rotation.x = -Math.PI / 2;
        soilW.position.y = 0.04;
        wheatField.add(soilW);

        const stalkCount = 180;
        const stalkGeo = new THREE.BoxGeometry(0.08, 0.85, 0.08);
        const headGeo = new THREE.BoxGeometry(0.14, 0.32, 0.14);
        const stalkInst = new THREE.InstancedMesh(stalkGeo, this.materials.wheatStalk, stalkCount);
        const headInst = new THREE.InstancedMesh(headGeo, this.materials.wheatHead, stalkCount);

        const dummy = new THREE.Object3D();
        let idx = 0;
        const rows = 12;
        const cols = 15;
        const stepX = (wSize.w - 3) / cols;
        const stepZ = (wSize.d - 3) / rows;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (idx >= stalkCount) break;
                const px = -wSize.w / 2 + 1.5 + c * stepX + (Math.sin(r * 3 + c) * 0.2);
                const pz = -wSize.d / 2 + 1.5 + r * stepZ + (Math.cos(c * 2 + r) * 0.2);
                const sc = 0.85 + ((r + c) % 4) * 0.08;

                dummy.position.set(px, 0.42 * sc, pz);
                dummy.scale.set(sc, sc, sc);
                dummy.rotation.set(0, (r * 0.3 + c * 0.4), 0);
                dummy.updateMatrix();
                stalkInst.setMatrixAt(idx, dummy.matrix);

                dummy.position.set(px, (0.85 + 0.12) * sc, pz);
                dummy.updateMatrix();
                headInst.setMatrixAt(idx, dummy.matrix);
                idx++;
            }
        }
        stalkInst.instanceMatrix.needsUpdate = true;
        headInst.instanceMatrix.needsUpdate = true;
        wheatField.add(stalkInst, headInst);

        this._addSplitRailFence(wheatField, wSize.w, wSize.d);
        this.group.add(wheatField);

        // 2. Vegetable Garden
        const vegField = new THREE.Group();
        vegField.position.copy(vPos);

        const soilV = new THREE.Mesh(new THREE.PlaneGeometry(vSize.w, vSize.d), this.materials.tilledSoil);
        soilV.rotation.x = -Math.PI / 2;
        soilV.position.y = 0.04;
        vegField.add(soilV);

        const cabbageGeo = new THREE.DodecahedronGeometry(0.32, 0);
        const pumpkinGeo = new THREE.SphereGeometry(0.38, 7, 6);
        pumpkinGeo.scale(1.2, 0.85, 1.2);

        for (let r = -vSize.d / 2 + 2.5; r <= vSize.d / 2 - 2.5; r += 2.6) {
            const isPumpkinRow = Math.abs(r) % 5.2 < 2.6;
            for (let c = -vSize.w / 2 + 2.0; c <= vSize.w / 2 - 2.0; c += 2.4) {
                if (isPumpkinRow) {
                    const pump = new THREE.Mesh(pumpkinGeo, this.materials.cropPumpkin);
                    pump.position.set(c + (Math.sin(r) * 0.2), 0.28, r);
                    vegField.add(pump);
                } else {
                    const cab = new THREE.Mesh(cabbageGeo, this.materials.cropGreen);
                    cab.position.set(c + (Math.cos(r) * 0.2), 0.25, r);
                    vegField.add(cab);
                }
            }
        }

        this._addSplitRailFence(vegField, vSize.w, vSize.d);
        this.group.add(vegField);
    }

    _buildPasture(pos, size) {
        const pasture = new THREE.Group();
        pasture.position.copy(pos);

        this._addSplitRailFence(pasture, size.w, size.d);

        const trough = new THREE.Group();
        trough.position.set(size.w / 4, 0, size.d / 4);
        const tBox = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.72, 1.2), this.materials.woodFence);
        tBox.position.y = 0.36;
        trough.add(tBox);
        const tWater = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.88), new THREE.MeshLambertMaterial({ color: 0x3d708f }));
        tWater.rotation.x = -Math.PI / 2;
        tWater.position.y = 0.65;
        trough.add(tWater);
        pasture.add(trough);

        const sqBaleGeo = new THREE.BoxGeometry(1.6, 0.85, 0.95);
        [[-size.w / 3, 0.42, -size.d / 3], [-size.w / 3 + 1.8, 0.42, -size.d / 3 + 0.3], [-size.w / 3 + 0.9, 1.25, -size.d / 3]].forEach(([bx, by, bz]) => {
            const b = new THREE.Mesh(sqBaleGeo, this.materials.hayBale);
            b.position.set(bx, by, bz);
            pasture.add(b);
        });

        this.group.add(pasture);
    }

    _addSplitRailFence(group, width, depth) {
        const postGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.15, 6);
        const railXGeo = new THREE.BoxGeometry(3.2, 0.08, 0.14);
        const railZGeo = new THREE.BoxGeometry(0.14, 0.08, 3.2);

        const hw = width / 2;
        const hd = depth / 2;

        for (let x = -hw; x <= hw; x += 3.0) {
            [-hd, hd].forEach(z => {
                const post = new THREE.Mesh(postGeo, this.materials.woodFence);
                post.position.set(x, 0.58, z);
                group.add(post);

                if (x + 3.0 <= hw) {
                    const r1 = new THREE.Mesh(railXGeo, this.materials.woodFence);
                    r1.position.set(x + 1.5, 0.88, z);
                    group.add(r1);
                    const r2 = new THREE.Mesh(railXGeo, this.materials.woodFence);
                    r2.position.set(x + 1.5, 0.46, z);
                    group.add(r2);
                }
            });
        }

        for (let z = -hd; z <= hd; z += 3.0) {
            [-hw, hw].forEach(x => {
                const post = new THREE.Mesh(postGeo, this.materials.woodFence);
                post.position.set(x, 0.58, z);
                group.add(post);

                if (z + 3.0 <= hd) {
                    const r1 = new THREE.Mesh(railZGeo, this.materials.woodFence);
                    r1.position.set(x, 0.88, z + 1.5);
                    group.add(r1);
                    const r2 = new THREE.Mesh(railZGeo, this.materials.woodFence);
                    r2.position.set(x, 0.46, z + 1.5);
                    group.add(r2);
                }
            });
        }
    }
}
