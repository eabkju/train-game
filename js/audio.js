// audio.js - Realistic procedural Web Audio engine for diesel train, air horn, and rain
class TrainAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isEngineRunning = false;
    this.isHornPlaying = false;
    this.isRaining = false;

    // Master bus
    this.masterGain = null;

    // Diesel Engine Nodes
    this.engineGain = null;
    this.engineFilter = null;
    this.oscLow = null;
    this.oscSub = null;
    this.turboOsc = null;
    this.turboGain = null;
    this.rumbleLfo = null;
    this.rumbleLfoGain = null;
    this.clackGain = null;
    this.nextClackTime = 0;

    // Horn Nodes
    this.hornOscs = [];
    this.hornGain = null;
    this.hornFilter = null;

    // Rain Nodes
    this.rainSource = null;
    this.rainGain = null;
    this.rainFilter = null;

    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;
      this.masterGain.connect(this.ctx.destination);

      this.setupEngineSynth();
      this.setupHornSynth();
      this.setupRainSynth();

      this.initialized = true;
    } catch (e) {
      console.warn("Web Audio initialization error:", e);
    }
  }

  ensureContext() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupEngineSynth() {
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Main Engine Sub-bus
    this.engineGain = ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0001, now);

    // Warm Low-pass filter for heavy diesel throatiness
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(180, now);
    this.engineFilter.Q.setValueAtTime(2.2, now);

    // Sub rumble oscillator (deep 2-stroke diesel bass)
    this.oscSub = ctx.createOscillator();
    this.oscSub.type = 'sawtooth';
    this.oscSub.frequency.setValueAtTime(GAME_CONFIG.audio.idleRpmFreq * 0.5, now);

    // Mid pulse oscillator
    this.oscLow = ctx.createOscillator();
    this.oscLow.type = 'triangle';
    this.oscLow.frequency.setValueAtTime(GAME_CONFIG.audio.idleRpmFreq, now);

    // LFO Amplitude Modulator to create rhythmic cylinder firing pulses
    this.rumbleLfo = ctx.createOscillator();
    this.rumbleLfo.type = 'sine';
    this.rumbleLfo.frequency.setValueAtTime(8, now);

    this.rumbleLfoGain = ctx.createGain();
    this.rumbleLfoGain.gain.setValueAtTime(0.35, now);

    // Turbocharger high harmonic whine
    this.turboOsc = ctx.createOscillator();
    this.turboOsc.type = 'sine';
    this.turboOsc.frequency.setValueAtTime(850, now);

    this.turboGain = ctx.createGain();
    this.turboGain.gain.setValueAtTime(0.001, now);

    const turboFilter = ctx.createBiquadFilter();
    turboFilter.type = 'bandpass';
    turboFilter.frequency.setValueAtTime(850, now);
    turboFilter.Q.setValueAtTime(4.0, now);
    this.turboOsc.connect(turboFilter);
    turboFilter.connect(this.turboGain);
    this.turboGain.connect(this.engineGain);

    // Connect oscillators to engine filter
    const subGain = ctx.createGain();
    subGain.gain.value = 0.65;
    this.oscSub.connect(subGain);
    subGain.connect(this.engineFilter);

    const midGain = ctx.createGain();
    midGain.gain.value = 0.5;
    this.oscLow.connect(midGain);
    midGain.connect(this.engineFilter);

    // LFO AM modulation on main filter output
    const amGain = ctx.createGain();
    amGain.gain.value = 0.7;
    this.rumbleLfo.connect(this.rumbleLfoGain);
    this.rumbleLfoGain.connect(amGain.gain);

    this.engineFilter.connect(amGain);
    amGain.connect(this.engineGain);

    // Click-clack rail noise gain
    this.clackGain = ctx.createGain();
    this.clackGain.gain.value = 0.001;
    this.clackGain.connect(this.engineGain);

    // Route engine to master
    this.engineGain.connect(this.masterGain);

    // Start continuous oscillators
    this.oscSub.start(now);
    this.oscLow.start(now);
    this.rumbleLfo.start(now);
    this.turboOsc.start(now);
  }

  setupHornSynth() {
    const ctx = this.ctx;
    this.hornGain = ctx.createGain();
    this.hornGain.gain.setValueAtTime(0.0001, ctx.currentTime);

    this.hornFilter = ctx.createBiquadFilter();
    this.hornFilter.type = 'bandpass';
    this.hornFilter.frequency.setValueAtTime(420, ctx.currentTime);
    this.hornFilter.Q.setValueAtTime(1.5, ctx.currentTime);

    this.hornGain.connect(this.hornFilter);
    this.hornFilter.connect(this.masterGain);
  }

  setupRainSynth() {
    const ctx = this.ctx;
    // Generate 3 seconds of looping smooth pinkish rain noise
    const bufferSize = ctx.sampleRate * 3;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    this.rainSource = ctx.createBufferSource();
    this.rainSource.buffer = noiseBuffer;
    this.rainSource.loop = true;

    this.rainFilter = ctx.createBiquadFilter();
    this.rainFilter.type = 'lowpass';
    this.rainFilter.frequency.setValueAtTime(1100, ctx.currentTime);

    this.rainGain = ctx.createGain();
    this.rainGain.gain.setValueAtTime(0.0001, ctx.currentTime);

    this.rainSource.connect(this.rainFilter);
    this.rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);

    this.rainSource.start(0);
  }

  // Called when train starts / stops
  setEngineActive(active) {
    this.ensureContext();
    if (!this.ctx) return;
    this.isEngineRunning = active;
    const now = this.ctx.currentTime;

    if (active) {
      // Smooth fade-in & ignition rev
      this.engineGain.gain.cancelScheduledValues(now);
      this.engineGain.gain.setValueAtTime(this.engineGain.gain.value, now);
      this.engineGain.gain.linearRampToValueAtTime(0.42, now + 1.2);
    } else {
      // Smooth fade-out on stop
      this.engineGain.gain.cancelScheduledValues(now);
      this.engineGain.gain.setValueAtTime(this.engineGain.gain.value, now);
      this.engineGain.gain.linearRampToValueAtTime(0.0001, now + 1.8);
    }
  }

  // Update dynamic engine frequencies, filter, and track clatter based on current velocity
  update(speed, isMoving, dt) {
    if (!this.ctx || !this.isEngineRunning) return;
    const now = this.ctx.currentTime;
    const maxSpeed = GAME_CONFIG.train.maxSpeed;
    const speedRatio = Math.min(Math.max(speed / maxSpeed, 0), 1.0);

    // Target engine RPM frequency based on speed
    const baseFreq = GAME_CONFIG.audio.idleRpmFreq;
    const maxFreq = GAME_CONFIG.audio.maxRpmFreq;
    const currentFreq = baseFreq + speedRatio * (maxFreq - baseFreq);

    // Ramp oscillator frequencies smoothly
    this.oscSub.frequency.setTargetAtTime(currentFreq * 0.5, now, 0.15);
    this.oscLow.frequency.setTargetAtTime(currentFreq, now, 0.15);

    // Cylinder firing rhythm LFO rate
    const lfoRate = 7 + speedRatio * 18;
    this.rumbleLfo.frequency.setTargetAtTime(lfoRate, now, 0.15);

    // Filter opens up as engine works harder
    const filterFreq = 180 + speedRatio * 420;
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.2);

    // Turbocharger whistle volume and pitch
    const turboPitch = 800 + speedRatio * 1600;
    const turboVol = speedRatio > 0.08 ? 0.02 + speedRatio * 0.08 : 0.001;
    this.turboOsc.frequency.setTargetAtTime(turboPitch, now, 0.25);
    this.turboGain.gain.setTargetAtTime(turboVol, now, 0.3);

    // Engine load volume swelling
    const targetEngineVol = isMoving ? 0.45 + speedRatio * 0.25 : 0.30;
    this.engineGain.gain.setTargetAtTime(targetEngineVol, now, 0.2);

    // Sleeper track joint "click-clack" rhythm
    if (speed > 0.5 && now > this.nextClackTime) {
      this.playTrackClack(speedRatio);
      // Spacing between sleeper clicks based on train velocity
      const interval = Math.max(0.18, 0.65 / (speed * 0.45));
      this.nextClackTime = now + interval;
    }
  }

  playTrackClack(speedRatio) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const clackBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.035, this.ctx.sampleRate);
    const data = clackBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.25));
    }

    const src = this.ctx.createBufferSource();
    src.buffer = clackBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(350 + Math.random() * 120, now);
    filter.Q.setValueAtTime(3.0, now);

    const gain = this.ctx.createGain();
    const vol = 0.04 + speedRatio * 0.09;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    src.start(now);
  }

  // Trigger diesel multi-tone horn blast
  startHorn() {
    this.ensureContext();
    if (!this.ctx || this.isHornPlaying) return;
    this.isHornPlaying = true;
    const now = this.ctx.currentTime;

    // Clean up any old horn oscillators
    this.stopHornImmediate();

    const freqs = GAME_CONFIG.audio.hornFrequencies;
    this.hornOscs = freqs.map((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i === 1 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      // Slight acoustic detune for realism
      osc.detune.setValueAtTime((i - 1) * 7, now);
      osc.connect(this.hornGain);
      osc.start(now);
      return osc;
    });

    // Rapid horn valve attack envelope
    this.hornGain.gain.cancelScheduledValues(now);
    this.hornGain.gain.setValueAtTime(0.001, now);
    this.hornGain.gain.linearRampToValueAtTime(0.48, now + 0.06);
  }

  stopHorn() {
    if (!this.ctx || !this.isHornPlaying) return;
    const now = this.ctx.currentTime;
    this.isHornPlaying = false;

    // Smooth release with echo-like decay
    this.hornGain.gain.cancelScheduledValues(now);
    this.hornGain.gain.setValueAtTime(this.hornGain.gain.value, now);
    this.hornGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    setTimeout(() => {
      this.stopHornImmediate();
    }, 400);
  }

  stopHornImmediate() {
    if (this.hornOscs && this.hornOscs.length > 0) {
      this.hornOscs.forEach(osc => {
        try { osc.stop(); osc.disconnect(); } catch (e) {}
      });
      this.hornOscs = [];
    }
  }

  // Toggle natural slow rain sound
  setRain(active) {
    this.ensureContext();
    if (!this.ctx) return;
    this.isRaining = active;
    const now = this.ctx.currentTime;

    this.rainGain.gain.cancelScheduledValues(now);
    this.rainGain.gain.setValueAtTime(this.rainGain.gain.value, now);

    if (active) {
      this.rainGain.gain.linearRampToValueAtTime(0.28, now + 2.0);
    } else {
      this.rainGain.gain.linearRampToValueAtTime(0.0001, now + 1.5);
    }
  }
}

window.TrainAudio = new TrainAudioEngine();
