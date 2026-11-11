// config.js - Global game configuration, physical constants, and color palettes
window.GAME_CONFIG = {
    // Train & Carriages Physics
    train: {
        maxSpeed: 16.5,         // Maximum cruising speed (m/s, ~60 km/h)
        acceleration: 2.6,      // Smooth acceleration rate (m/s^2)
        deceleration: 4.0,      // Responsive braking rate (m/s^2)
        friction: 0.35,         // Coasting natural friction (m/s^2)
        wheelRadius: 0.52,      // Wheel radius in meters
        bogieDistance: 6.8,     // Distance between locomotive front and rear bogies
        length: 12.2,           // Total locomotive length
        width: 3.1,             // Total locomotive width
        height: 4.2,            // Total locomotive height

        // 5 Attached Passenger Carriages
        carriageCount: 5,       // Number of trailing passenger carriages
        carriageLength: 11.4,   // Length of each passenger coach
        carriageWidth: 2.92,    // Coach body width
        carriageHeight: 3.65,   // Coach body height
        carriageSpacing: 12.3,  // Center-to-center distance between adjacent train cars
        carriageBogieDist: 6.8  // Bogie spacing on each coach
    },

    // Track Dimensions
    track: {
        gauge: 1.435,           // Standard track gauge (meters)
        railWidth: 0.12,        // Rail head width
        railHeight: 0.16,       // Rail profile height
        sleeperWidth: 2.65,     // Cross-tie / sleeper length
        sleeperHeight: 0.18,    // Sleeper height
        sleeperDepth: 0.26,     // Sleeper depth (along track)
        sleeperSpacing: 1.4,    // Spacing between consecutive instanced sleepers
        ballastTopWidth: 3.4,   // Ballast top width
        ballastBaseWidth: 5.4,  // Ballast bottom width
        ballastHeight: 0.32,    // Ballast embankment height
        lookupSamples: 4096     // Pre-baked O(1) spline lookup samples
    },

    // Camera Settings
    camera: {
        fov: 52,
        near: 0.25,
        far: 2600,
        defaultDistance: 30,
        minDistance: 7,
        maxDistance: 180,
        defaultPitch: 0.34,     // Radians elevation angle
        defaultYaw: -0.68       // Radians azimuth angle
    },

    // Performance & Thermal Settings
    performance: {
        modes: [
            { id: 'balanced', label: '🌿 Cool 45 FPS', fpsCap: 45, maxDpr: 1.25 },
            { id: 'eco',      label: '⚡ Eco 30 FPS',  fpsCap: 30, maxDpr: 1.0  },
            { id: 'max',      label: '🚀 60 FPS',      fpsCap: 60, maxDpr: 1.5  }
        ],
        defaultModeIndex: 0
    },

    // Visual Themes / Lighting (Rich, Natural Simulator Palette)
    colors: {
        // Heritage Royal Navy & Champagne Gold Livery
        trainBody: 0x16283d,
        coachBody: 0x192d44,
        trainStripe: 0xe0b658,
        trainRoof: 0x242a32,
        trainFrame: 0x15181c,
        trainBogies: 0x1c2026,
        trainWheels: 0x707882,
        trainBuffersRed: 0x992b2b,

        // Carriage & Window Glow
        coachWindowGlow: 0xffe299,
        coachGangway: 0x14171a,

        // Track & Infrastructure
        rails: 0x9aa2ab,
        sleepers: 0x6e6a63,
        ballast: 0x4c4741,
        subBallast: 0x3b3731,

        // Utility Poles
        poleWood: 0x42352a,
        insulators: 0x5ca38a,
        lampWarm: 0xffd982,

        // Atmospheric Presets
        presets: {
            day: {
                name: 'Day',
                icon: '☀️',
                skyTop: 0x3d7cb8,
                skyHorizon: 0xa8cbe8,
                fogColor: 0x9ec2e0,
                fogDensity: 0.00042,
                sunColor: 0xfff7e6,
                sunIntensity: 1.25,
                sunPos: [140, 240, 160],
                hemiSky: 0x9ec5eb,
                hemiGround: 0x435e3a,
                hemiIntensity: 0.72,
                ambientColor: 0x8ba7c7,
                ambientIntensity: 0.28,
                starOpacity: 0.0,
                moonVisible: false,
                windowGlow: 0.08
            },
            sunset: {
                name: 'Sunset',
                icon: '🌅',
                skyTop: 0x2c355c,
                skyHorizon: 0xe6844e,
                fogColor: 0xd9875b,
                fogDensity: 0.00052,
                sunColor: 0xff944d,
                sunIntensity: 1.35,
                sunPos: [-220, 95, 180],
                hemiSky: 0xffa066,
                hemiGround: 0x3d2920,
                hemiIntensity: 0.68,
                ambientColor: 0x8f5b4a,
                ambientIntensity: 0.30,
                starOpacity: 0.25,
                moonVisible: false,
                windowGlow: 0.75
            },
            night: {
                name: 'Night',
                icon: '🌙',
                skyTop: 0x060d1a,
                skyHorizon: 0x162a45,
                fogColor: 0x102036,
                fogDensity: 0.00055,
                sunColor: 0xc8daf0,
                sunIntensity: 0.52,
                sunPos: [-120, 200, -140],
                hemiSky: 0x263e63,
                hemiGround: 0x121d2b,
                hemiIntensity: 0.45,
                ambientColor: 0x22344f,
                ambientIntensity: 0.38,
                starOpacity: 0.95,
                moonVisible: true,
                windowGlow: 1.45
            }
        }
    },

    // Audio Frequencies & Tuning
    audio: {
        idleRpmFreq: 26,
        maxRpmFreq: 62,
        hornFrequencies: [311.13, 370.00, 466.16], // Eb4, F#4, Bb4 chord chime
        rainNoiseDensity: 0.22
    }
};
