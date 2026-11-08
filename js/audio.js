// audio.js - Realistic procedural Web Audio engine: diesel engine, authentic 'taa daak, taa dak' rail sound & rain
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

    // Iconic 'taa daak, taa dak' Rail Sound Timing
    this.nextJointTime = 0;

    // Horn Nodes
    this.hornOscs = [];
    this.hornGain = null;
    this.hornFilter = null;

    // Rain Nodes
    this.rainSource = null;
    this.rainGain = null;
    this.rainFilter = null;
    this.rainMasterGain = null;

    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

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

    this.engineGain = ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0001, now);

    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(180, now);
    this.engineFilter.Q.setValueAtTime(2.2, now);

    this.oscSub = ctx.createOscillator();
    this.oscSub.type = 'sawtooth';
    this.oscSub.frequency.setValueAtTime(GAME_CONFIG.audio.idleRpmFreq * 0.5, now);

    this.oscLow = ctx.createOscillator();
    this.oscLow.type = 'triangle';
    this.oscLow.frequency.setValueAtTime(GAME_CONFIG.audio.idleRpmFreq, now);

    this.rumbleLfo = ctx.createOscillator();
    this.rumbleLfo.type = 'sine';
    this.rumbleLfo.frequency.setValueAtTime(8, now);

    this.rumbleLfoGain = ctx.createGain();
    this.rumbleLfoGain.gain.setValueAtTime(0.35, now);

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

    const subGain = ctx.createGain();
    subGain.gain.value = 0.65;
    this.oscSub.connect(subGain);
    subGain.connect(this.engineFilter);

    const midGain = ctx.createGain();
    midGain.gain.value = 0.5;
    this.oscLow.connect(midGain);
    midGain.connect(this.engineFilter);

    const amGain = ctx.createGain();
    amGain.gain.value = 0.7;
    this.rumbleLfo.connect(this.rumbleLfoGain);
    this.rumbleLfoGain.connect(amGain.gain);

    this.engineFilter.connect(amGain);
    amGain.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

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
    // ============================================================
    // LAYERED REALISTIC RAIN SOUND
    // Layer 1: Rain hiss — bandpass noise 800-3000Hz
    // Layer 2: Drop patter — highpass noise with slow LFO shimmer
    // Layer 3: Low rumble — lowpass noise, rain on ground/roof
    // Layer 4: Delay feedback — natural splattering echo
    // All layers feed into rainMasterGain so setRain() controls all
    // ============================================================
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Helper: create a looping white noise buffer source
    const makeNoise = (durationSecs) => {
      const bufSize = Math.floor(ctx.sampleRate * durationSecs);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      return src;
    };

    // Master rain output gain (controlled by setRain)
    this.rainMasterGain = ctx.createGain();
    this.rainMasterGain.gain.setValueAtTime(0.0001, now);
    this.rainMasterGain.connect(this.masterGain);

    // --- Layer 1: Rain hiss (the shhh of continuous rain) ---
    const hissNoise = makeNoise(2.5);
    const hissBP = ctx.createBiquadFilter();
    hissBP.type = 'bandpass';
    hissBP.frequency.value = 1800;
    hissBP.Q.value = 0.6;
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.55;
    hissNoise.connect(hissBP);
    hissBP.connect(hissGain);
    hissGain.connect(this.rainMasterGain);
    hissNoise.start(0);

    // --- Layer 2: Drop patter (high-freq shimmer, LFO-modulated) ---
    const patterNoise = makeNoise(1.8);
    const patterHP = ctx.createBiquadFilter();
    patterHP.type = 'highpass';
    patterHP.frequency.value = 3200;
    patterHP.Q.value = 0.4;
    const patterGain = ctx.createGain();
    patterGain.gain.value = 0.22;
    // LFO to give varying intensity (rain gusts)
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 1.6;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.12;
    lfo.connect(lfoGain);
    lfoGain.connect(patterGain.gain);
    lfo.start(0);
    patterNoise.connect(patterHP);
    patterHP.connect(patterGain);
    patterGain.connect(this.rainMasterGain);
    patterNoise.start(0);

    // --- Layer 3: Rumble (low-frequency ground/roof impact thud) ---
    const rumbleNoise = makeNoise(3.0);
    const rumbleLP = ctx.createBiquadFilter();
    rumbleLP.type = 'lowpass';
    rumbleLP.frequency.value = 180;
    rumbleLP.Q.value = 1.2;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.30;
    rumbleNoise.connect(rumbleLP);
    rumbleLP.connect(rumbleGain);
    rumbleGain.connect(this.rainMasterGain);
    rumbleNoise.start(0);

    // --- Layer 4: Delay feedback echo (natural spattering reverb) ---
    const echoNoise = makeNoise(2.0);
    const echoHP = ctx.createBiquadFilter();
    echoHP.type = 'bandpass';
    echoHP.frequency.value = 1200;
    echoHP.Q.value = 0.8;
    const delay = ctx.createDelay(0.3);
    delay.delayTime.value = 0.085;
    const feedbackGain = ctx.createGain();
    feedbackGain.gain.value = 0.28;
    const echoOutGain = ctx.createGain();
    echoOutGain.gain.value = 0.18;
    echoNoise.connect(echoHP);
    echoHP.connect(delay);
    delay.connect(feedbackGain);
    feedbackGain.connect(delay); // feedback loop
    delay.connect(echoOutGain);
    echoOutGain.connect(this.rainMasterGain);
    echoNoise.start(0);

    // Keep legacy reference for setRain compat
    this.rainGain = this.rainMasterGain;
  }

  setEngineActive(active) {
    this.ensureContext();
    if (!this.ctx) return;
    this.isEngineRunning = active;
    const now = this.ctx.currentTime;

    if (active) {
      // ================================================================
      // REALISTIC DIESEL ENGINE STARTUP SEQUENCE
      // Phase 1 (0–0.5s):  Starter motor whine — sawtooth osc 220→80Hz
      // Phase 2 (0.3–0.9s): Cylinder fire attempts — 4 short noise bursts
      // Phase 3 (0.7–1.6s): Engine catches — freq drops, volume surges
      // Phase 4 (1.6s+):   Settles into smooth idle rumble
      // ================================================================

      // Cancel any fade-out in progress
      this.engineGain.gain.cancelScheduledValues(now);
      this.engineGain.gain.setValueAtTime(0.0001, now);

      // Phase 1 — Starter motor whine
      const starter = this.ctx.createOscillator();
      starter.type = 'sawtooth';
      starter.frequency.setValueAtTime(220, now);
      starter.frequency.exponentialRampToValueAtTime(78, now + 0.65);
      const starterGain = this.ctx.createGain();
      starterGain.gain.setValueAtTime(0.0001, now);
      starterGain.gain.linearRampToValueAtTime(0.18, now + 0.08);
      starterGain.gain.linearRampToValueAtTime(0.08, now + 0.5);
      starterGain.gain.linearRampToValueAtTime(0.0001, now + 0.75);
      starter.connect(starterGain);
      starterGain.connect(this.masterGain);
      starter.start(now);
      starter.stop(now + 0.8);

      // Phase 2 — Cylinder fire bursts (irregular sputtering pops)
      const fireTimes = [0.30, 0.44, 0.54, 0.62, 0.70];
      fireTimes.forEach((offset, idx) => {
        const fireTime = now + offset;
        const bufLen = Math.floor(this.ctx.sampleRate * 0.09);
        const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.35));
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 90 + idx * 15;
        bp.Q.value = 2.5;
        const fg = this.ctx.createGain();
        fg.gain.value = 0.22 + Math.random() * 0.08;
        src.connect(bp);
        bp.connect(fg);
        fg.connect(this.masterGain);
        src.start(fireTime);
      });

      // Phase 3 — Engine catches: oscillator frequencies drop to idle
      this.oscSub.frequency.cancelScheduledValues(now);
      this.oscLow.frequency.cancelScheduledValues(now);
      this.oscSub.frequency.setValueAtTime(GAME_CONFIG.audio.idleRpmFreq * 1.8, now + 0.65);
      this.oscLow.frequency.setValueAtTime(GAME_CONFIG.audio.idleRpmFreq * 1.8, now + 0.65);
      this.oscSub.frequency.exponentialRampToValueAtTime(GAME_CONFIG.audio.idleRpmFreq * 0.5, now + 1.6);
      this.oscLow.frequency.exponentialRampToValueAtTime(GAME_CONFIG.audio.idleRpmFreq, now + 1.6);

      // Phase 3 gain surge (irregular, not linear) — engine catching feels uneven
      this.engineGain.gain.setValueAtTime(0.0001, now + 0.60);
      this.engineGain.gain.linearRampToValueAtTime(0.28, now + 0.80);
      this.engineGain.gain.linearRampToValueAtTime(0.14, now + 1.05);
      this.engineGain.gain.linearRampToValueAtTime(0.38, now + 1.40);

      // Phase 4 — Smooth idle
      this.engineGain.gain.linearRampToValueAtTime(0.30, now + 1.80);

    } else {
      // Natural shutdown: frequency drops slightly then volume fades
      this.engineGain.gain.cancelScheduledValues(now);
      this.engineGain.gain.setValueAtTime(this.engineGain.gain.value, now);
      this.engineGain.gain.linearRampToValueAtTime(0.18, now + 0.4);
      this.engineGain.gain.linearRampToValueAtTime(0.0001, now + 1.8);
      this.oscSub.frequency.setTargetAtTime(GAME_CONFIG.audio.idleRpmFreq * 0.4, now + 0.3, 0.6);
      this.oscLow.frequency.setTargetAtTime(GAME_CONFIG.audio.idleRpmFreq * 0.4, now + 0.3, 0.6);
    }
  }

  update(speed, isMoving, dt) {
    if (!this.ctx || !this.isEngineRunning) return;
    const now = this.ctx.currentTime;
    const maxSpeed = GAME_CONFIG.train.maxSpeed;
    const speedRatio = Math.min(Math.max(speed / maxSpeed, 0), 1.0);

    const baseFreq = GAME_CONFIG.audio.idleRpmFreq;
    const maxFreq = GAME_CONFIG.audio.maxRpmFreq;
    const currentFreq = baseFreq + speedRatio * (maxFreq - baseFreq);

    this.oscSub.frequency.setTargetAtTime(currentFreq * 0.5, now, 0.15);
    this.oscLow.frequency.setTargetAtTime(currentFreq, now, 0.15);

    const lfoRate = 7 + speedRatio * 18;
    this.rumbleLfo.frequency.setTargetAtTime(lfoRate, now, 0.15);

    const filterFreq = 180 + speedRatio * 420;
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.2);

    const turboPitch = 800 + speedRatio * 1600;
    const turboVol = speedRatio > 0.08 ? 0.02 + speedRatio * 0.08 : 0.001;
    this.turboOsc.frequency.setTargetAtTime(turboPitch, now, 0.25);
    this.turboGain.gain.setTargetAtTime(turboVol, now, 0.3);

    const targetEngineVol = isMoving ? 0.45 + speedRatio * 0.25 : 0.30;
    this.engineGain.gain.setTargetAtTime(targetEngineVol, now, 0.2);

    // ========================================================
    // Authentic 'taa daak, taa dak' Rail Joint Sound
    // ========================================================
    if (speed > 0.8 && now > this.nextJointTime) {
      this.playTaaDaakCadence(speedRatio, speed);
      // Rail joint spacing ~24 meters / train speed
      const jointInterval = Math.max(0.65, 24.0 / Math.max(speed, 1.0));
      this.nextJointTime = now + jointInterval;
    }
  }

  // Synthesizes the authentic double-tap 'taa daak, taa dak' sound of steel wheels crossing rail joints
  playTaaDaakCadence(speedRatio, speed) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Time gap between axles crossing the same joint (axle distance / speed)
    const axleGap = Math.max(0.065, Math.min(0.12, 1.6 / Math.max(speed, 2.0)));
    // Time gap between front bogie and rear bogie crossing the joint
    const bogieGap = Math.max(0.16, Math.min(0.28, 6.8 / Math.max(speed, 2.0)));

    const vol = 0.06 + speedRatio * 0.12;

    // Lead Bogie: "taa" (sharp) -> "daak" (resonant hollow clack)
    this.synthesizeRailClick(now, 460, 0.030, vol);
    this.synthesizeRailClick(now + axleGap, 280, 0.055, vol * 1.15);

    // Trailing Bogie: "taa" -> "dak"
    this.synthesizeRailClick(now + bogieGap, 440, 0.030, vol * 0.9);
    this.synthesizeRailClick(now + bogieGap + axleGap, 290, 0.050, vol * 1.05);

    // Trailing Carriages secondary rhythmic echoes ("taa-daak, taa-dak")
    const carriageSpacingTime = 12.2 / Math.max(speed, 2.0);
    [1, 2].forEach(c => {
      const echoTime = now + c * carriageSpacingTime * 0.5;
      if (echoTime - now < 1.4) {
        const echoVol = vol * (0.55 / (c + 0.5));
        this.synthesizeRailClick(echoTime, 420, 0.028, echoVol);
        this.synthesizeRailClick(echoTime + axleGap, 280, 0.045, echoVol * 1.1);
      }
    });
  }

  synthesizeRailClick(time, centerFreq, duration, volume) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Fast noise transient burst
    const bufLen = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufLen; i++) {
      const decay = Math.exp(-i / (bufLen * 0.28));
      data[i] = (Math.random() * 2 - 1) * decay;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    // Resonant bandpass filter for distinct steel-on-steel rail chime
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(centerFreq, time);
    filter.Q.setValueAtTime(4.5, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    src.start(time);
  }

  startHorn() {
    this.ensureContext();
    if (!this.ctx || this.isHornPlaying) return;
    this.isHornPlaying = true;
    const now = this.ctx.currentTime;

    this.stopHornImmediate();

    const freqs = GAME_CONFIG.audio.hornFrequencies;
    this.hornOscs = freqs.map((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i === 1 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      osc.detune.setValueAtTime((i - 1) * 7, now);
      osc.connect(this.hornGain);
      osc.start(now);
      return osc;
    });

    this.hornGain.gain.cancelScheduledValues(now);
    this.hornGain.gain.setValueAtTime(0.001, now);
    this.hornGain.gain.linearRampToValueAtTime(0.48, now + 0.06);
  }

  stopHorn() {
    if (!this.ctx || !this.isHornPlaying) return;
    const now = this.ctx.currentTime;
    this.isHornPlaying = false;

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

  setRain(active) {
    this.ensureContext();
    if (!this.ctx) return;
    this.isRaining = active;
    const now = this.ctx.currentTime;
    const g = this.rainMasterGain || this.rainGain;
    if (!g) return;

    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);

    if (active) {
      // Natural rain start: Initial onset spray & droplet impacts
      this.playRainStartSfx(now);
      // Smooth fade into continuous rain ambience (using responsive setTargetAtTime from reference)
      g.gain.setTargetAtTime(0.26, now, 0.45);
    } else {
      // Natural rain stop: Smooth fade out followed by trailing droplets
      this.playRainStopSfx(now);
      g.gain.setTargetAtTime(0.0001, now, 0.55);
    }
  }

  // Realistic Rain Start SFX: Onset wind gust & scattered initial droplets on roof/ground
  playRainStartSfx(time) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // 1. Initial wind/rain gust rush
    const gustLen = Math.floor(ctx.sampleRate * 0.7);
    const gustBuf = ctx.createBuffer(1, gustLen, ctx.sampleRate);
    const gData = gustBuf.getChannelData(0);
    for (let i = 0; i < gustLen; i++) {
      const env = Math.sin((i / gustLen) * Math.PI);
      gData[i] = (Math.random() * 2 - 1) * env * 0.35;
    }
    const gustSrc = ctx.createBufferSource();
    gustSrc.buffer = gustBuf;
    const gustFilter = ctx.createBiquadFilter();
    gustFilter.type = 'lowpass';
    gustFilter.frequency.setValueAtTime(950, time);
    const gustGain = ctx.createGain();
    gustGain.gain.setValueAtTime(0.22, time);
    gustSrc.connect(gustFilter);
    gustFilter.connect(gustGain);
    gustGain.connect(this.masterGain);
    gustSrc.start(time);

    // 2. Initial rain drops hitting the carriage roof & windows (scattered onset)
    const dropOffsets = [0.04, 0.11, 0.18, 0.23, 0.29, 0.36, 0.44, 0.51, 0.58];
    dropOffsets.forEach(dt => {
      const dropTime = time + dt + (Math.random() - 0.5) * 0.03;
      const freq = 1400 + Math.random() * 1200;
      const vol = 0.08 + Math.random() * 0.09;
      this.synthesizeDroplet(dropTime, freq, vol);
    });
  }

  // Realistic Rain Stop SFX: Trailing gentle drips subsiding into calm
  playRainStopSfx(time) {
    if (!this.ctx) return;
    // Trailing individual drops at gradually widening intervals as shower passes
    const trailingOffsets = [0.12, 0.32, 0.62, 1.02, 1.55];
    trailingOffsets.forEach((dt, idx) => {
      const dropTime = time + dt + (Math.random() - 0.5) * 0.04;
      const freq = 1200 + Math.random() * 1000;
      const vol = Math.max(0.015, (0.09 - idx * 0.016));
      this.synthesizeDroplet(dropTime, freq, vol);
    });
  }

  // Single raindrop acoustic impact synthesis
  synthesizeDroplet(dropTime, centerFreq, volume) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const duration = 0.045;
    const len = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < len; i++) {
      const t = i / ctx.sampleRate;
      // Damped sine ping blended with tiny noise transient
      const ping = Math.sin(2 * Math.PI * centerFreq * t);
      const decay = Math.exp(-t * 85);
      data[i] = (ping * 0.7 + (Math.random() * 2 - 1) * 0.3) * decay;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, dropTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, dropTime + duration);

    src.connect(gain);
    gain.connect(this.masterGain);
    src.start(dropTime);
  }
}

window.TrainAudio = new TrainAudioEngine();
