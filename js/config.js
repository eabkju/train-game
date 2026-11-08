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

  // Visual Themes / Lighting (Premium, Natural Simulator Palette)
  colors: {
    // Cohesive Royal Heritage Train & Coach Livery
    trainBody: 0x1d2c3c,      // Refined heritage midnight navy
    coachBody: 0x1d2c3c,      // Matching cohesive royal coach midnight navy
    trainStripe: 0xc4a76c,    // Understated champagne gold / brushed brass accent
    trainRoof: 0x22262c,      // Subtle matte graphite
    trainFrame: 0x181a1d,     // Matte dark chassis black
    trainBogies: 0x16181b,    // Greased dark iron
    trainWheels: 0x6d737a,    // Natural machined steel wheel rims
    trainBuffersRed: 0x6e2828,// Deep muted burgundy buffer beam
    trainBuffersWhite: 0xd6d4cd, // Neutral hazard marking

    // Carriage Colors
    coachWindowGlow: 0xffdf96,// Soft warm 2700K incandescent cabin light
    coachGangway: 0x141619,   // Flexible rubber accordion connector

    // Track
    rails: 0x8b9198,          // Polished steel rail tops
    railSides: 0x4f443c,      // Weathered rust on rail webs
    sleepers: 0x696560,       // Seasoned concrete cross-ties
    ballast: 0x45403b,        // Natural crushed stone ballast gravel

    // Poles & Utility
    poleWood: 0x3b332b,       // Dark treated utility pole wood
    insulators: 0x324738,     // Natural muted ceramic glass insulator
    lampWarm: 0xffd985,       // Warm 2700K incandescent street bulb

    // Sky & Lighting (Natural, balanced exposure - never over-saturated or cheap)
    daySky: 0x7fa4cc,         // Natural atmospheric daylight sky
    daySun: 0xfff6e8,         // Warm natural sunlight
    dayAmbient: 0x93afd0,     // Soft sky fill light
    moonlitSky: 0x0c1626,     // Luminous deep navy moonlit sky
    moonlitMoon: 0xdee5f2,    // Glowing natural moon
    moonlitAmbient: 0x1a2638, // Ambient silver-blue moonlight (clear visibility, never pitch black)
    moonlitGround: 0x131e2c   // Subtle night terrain sheen
  },

  // Audio Frequencies & Tuning
  audio: {
    idleRpmFreq: 28,          // Base diesel engine idle cylinder pulse (Hz)
    maxRpmFreq: 64,           // Full throttle cylinder pulse (Hz)
    hornFrequencies: [311.13, 370.00, 466.16], // Eb4, F#4, Bb4 - Authentic Nathan/Leslie train horn chime
    rainNoiseDensity: 0.25
  }
};
