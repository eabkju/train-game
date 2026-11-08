// config.js - Global game configuration and physical constants
window.GAME_CONFIG = {
  // Train & Carriages Physics
  train: {
    maxSpeed: 14.0,           // Maximum cruising speed (m/s, ~50 km/h)
    acceleration: 2.2,        // Acceleration rate (m/s^2)
    deceleration: 3.5,        // Braking / deceleration rate (m/s^2)
    friction: 0.35,           // Coasting natural friction (m/s^2)
    wheelRadius: 0.52,        // Wheel radius in meters for realistic rotation
    bogieDistance: 6.8,       // Distance between locomotive front and rear bogies
    length: 12.0,             // Total locomotive length
    width: 3.1,               // Total locomotive width
    height: 4.2,              // Total locomotive height
    
    // 5 Attached Carriages / Boggies
    carriageCount: 5,         // Number of trailing passenger carriages
    carriageLength: 11.2,     // Length of each passenger coach
    carriageWidth: 2.9,       // Coach body width
    carriageHeight: 3.65,     // Coach body height
    carriageSpacing: 12.2,    // Center-to-center distance between adjacent train cars
    carriageBogieDist: 6.8    // Bogie spacing on each coach
  },

  // Track Dimensions
  track: {
    gauge: 1.435,             // Standard track gauge (meters)
    railWidth: 0.12,          // Rail head width
    railHeight: 0.18,         // Rail profile height
    sleeperWidth: 2.7,        // Cross-tie / sleeper length
    sleeperHeight: 0.22,      // Sleeper height
    sleeperDepth: 0.26,       // Sleeper depth (along track)
    sleeperSpacing: 0.65,     // Spacing between consecutive sleepers
    ballastWidth: 4.8,        // Ballast embankment width at top
    ballastHeight: 0.35,      // Ballast height
    straightLength: 2400.0,   // Length of straight track section (~3 min run at cruise speed)
    curveRadius: 420.0        // Radius of mild sweeping curves
  },

  // Camera Settings
  camera: {
    fov: 55,
    near: 0.1,
    far: 2500,
    defaultDistance: 32,
    minDistance: 6,
    maxDistance: 160,
    defaultPitch: 0.38,       // Radians elevation angle
    defaultYaw: -0.65         // Radians azimuth angle
  },

  // Visual Themes / Lighting
  colors: {
    // T3M2M-005 Diesel Locomotive & Carriage Colors
    trainBody: 0x1a334f,      // Deep navy blue
    trainStripe: 0xdeb841,    // Vivid warm golden yellow
    trainRoof: 0x5a636e,      // Weathered steel grey
    trainFrame: 0x22262b,     // Matte dark chassis black
    trainBogies: 0x1c1e22,    // Greased dark iron
    trainWheels: 0x8a929a,    // Steel wheel rims
    trainBuffersRed: 0x9b2226,// Buffer beam deep red
    trainBuffersWhite: 0xf4f3ee, // White hazard stripe

    // Carriage Colors
    coachWindowGlow: 0xffdf88,// Warm interior cabin light
    coachGangway: 0x181a1d,   // Flexible rubber accordion connector

    // Track
    rails: 0x9aa0a6,          // Polished steel rail tops
    railSides: 0x614f44,      // Weathered rust on rail webs
    sleepers: 0x827d76,       // Concrete cross-ties with weathering
    ballast: 0x534d47,        // Crushed stone ballast gravel

    // Poles & Utility
    poleWood: 0x4a3c31,       // Dark treated utility pole wood
    insulators: 0x2e6f40,     // Glass insulator green
    lampWarm: 0xffe28a,       // Warm 2700K incandescent street bulb

    // Sky & Lighting
    daySky: 0x6ba4d9,         // Atmospheric day blue
    daySun: 0xfffaed,         // Warm golden sunlight
    dayAmbient: 0x8ab4f8,     // Sky fill light
    moonlitSky: 0x091426,     // Luminous deep navy moonlit sky
    moonlitMoon: 0xe8efff,    // Glowing full moon
    moonlitAmbient: 0x1f324d, // Ambient silver-blue moonlight (never pitch black!)
    moonlitGround: 0x122033   // Night terrain sheen
  },

  // Audio Frequencies & Tuning
  audio: {
    idleRpmFreq: 28,          // Base diesel engine idle cylinder pulse (Hz)
    maxRpmFreq: 64,           // Full throttle cylinder pulse (Hz)
    hornFrequencies: [311.13, 370.00, 466.16], // Eb4, F#4, Bb4 - Authentic Nathan/Leslie train horn chime
    rainNoiseDensity: 0.25
  }
};
