// audio.js - High-performance procedural train & environmental audio engine
// Based on "Standalone Train Audio Engine.js" & "Train Sound Effects Technical Guide.md"
// 100% offline procedural Web Audio API with zero GC stutter, master dynamics compressor & shared noise buffers
class TrainAudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.comp = null;

    // Continuous synthesis nodes
    this.osc1 = null;
    this.osc2 = null;
    this.engFilter = null;
    this.engAmp = null;
    this.lfo = null;
    this.lfoG = null;
    this.turboG = null;
    this.wheel = null;
    this.wheelG = null;
    this.windG = null;
    this.rumG = null;
    this.rainG = null;

    // On-demand horn nodes
    this.hornG = null;
    this.hornOsc1 = null;
    this.hornOsc2 = null;

    // Shared noise buffer (reused for wind, turbo, rain, rumble, and air brakes to prevent GC lag)
    this.sharedNoiseBuffer = null;

    // State tracking
    this.initialized = false;
    this.isEngineRunning = false;
    this.isHornPlaying = false;
    this.isRaining = false;
  }

  /**
   * Generates a 2-second white noise buffer once at startup
   */
  createNoiseBuffer() {
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Generates a 1.2-second rhythmic 4-axle bogie rail-joint clack buffer
   * Timed for front bogie + rear bogie hits at [0.00s, 0.14s, 0.60s, 0.74s]
   */
  createWheelClackBuffer() {
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * 1.2);
    const buffer = this.ctx.createBuffer(1, len, sr);
    const data = buffer.getChannelData(0);
    const hits = [0.0, 0.14, 0.60, 0.74];

    hits.forEach((hitTime, idx) => {
      const startSample = Math.floor(hitTime * sr);
      const impulseLen = Math.floor(sr * 0.09);
      let lowPassVal = 0;

      for (let k = 0; k < impulseLen && (startSample + k) < len; k++) {
        const env = Math.exp(-k / (sr * 0.018));
        const white = Math.random() * 2 - 1;
        lowPassVal += (white - lowPassVal) * 0.25;
        const metallicThud = Math.sin(2 * Math.PI * 85 * k / sr) * 0.5;
        const accent = (idx % 2 === 1) ? 0.72 : 1.0;
        data[startSample + k] += (lowPassVal * 0.9 + metallicThud) * env * accent;
      }
    });
    return buffer;
  }

  /**
   * Initializes the audio context and signal chains on first user gesture
   */
  init() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('Web Audio API is not supported in this browser.');
        return;
      }
      this.ctx = new AudioCtx();
      const ctx = this.ctx;

      // 1. Master Hardware-Style Dynamics Compressor to eliminate clipping
      this.comp = ctx.createDynamicsCompressor();
      this.comp.threshold.value = -18;
      this.comp.knee.value = 12;
      this.comp.ratio.value = 6;
      this.comp.connect(ctx.destination);

      // Master gain
      this.master = ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.comp);

      // 2. Diesel-Electric Engine (Dual Sawtooth Fifth Interval + LFO Chug)
      this.osc1 = ctx.createOscillator();
      this.osc1.type = 'sawtooth';
      this.osc1.frequency.value = 32;

      this.osc2 = ctx.createOscillator();
      this.osc2.type = 'sawtooth';
      this.osc2.frequency.value = 48; // Musical fifth interval for heavy mechanical roar

      this.engFilter = ctx.createBiquadFilter();
      this.engFilter.type = 'lowpass';
      this.engFilter.frequency.value = 240;
      this.engFilter.Q.value = 2.5;

      this.engAmp = ctx.createGain();
      this.engAmp.gain.value = 0.0001; // Silent until started

      this.lfo = ctx.createOscillator();
      this.lfo.type = 'square';
      this.lfo.frequency.value = 8;

      this.lfoG = ctx.createGain();
      this.lfoG.gain.value = 0.06;
      this.lfo.connect(this.lfoG);
      this.lfoG.connect(this.engAmp.gain);

      const engMix = ctx.createGain();
      engMix.gain.value = 0.5;
      this.osc1.connect(engMix);
      this.osc2.connect(engMix);
      engMix.connect(this.engFilter);
      this.engFilter.connect(this.engAmp);
      this.engAmp.connect(this.master);

      this.osc1.start();
      this.osc2.start();
      this.lfo.start();

      // Shared Noise Buffer (Zero runtime allocations)
      this.sharedNoiseBuffer = this.createNoiseBuffer();

      // 3. Turbocharger Whine (Narrow 1900 Hz Bandpass with Q = 8)
      const turboSrc = ctx.createBufferSource();
      turboSrc.buffer = this.sharedNoiseBuffer;
      turboSrc.loop = true;
      const turboFilter = ctx.createBiquadFilter();
      turboFilter.type = 'bandpass';
      turboFilter.frequency.value = 1900;
      turboFilter.Q.value = 8;
      this.turboG = ctx.createGain();
      this.turboG.gain.value = 0.0001;
      turboSrc.connect(turboFilter);
      turboFilter.connect(this.turboG);
      this.turboG.connect(this.master);
      turboSrc.start();

      // 4. Wheel-on-Rail Clack Loop (Playback rate scales with speed)
      this.wheel = ctx.createBufferSource();
      this.wheel.buffer = this.createWheelClackBuffer();
      this.wheel.loop = true;
      const wheelHP = ctx.createBiquadFilter();
      wheelHP.type = 'highpass';
      wheelHP.frequency.value = 65;
      this.wheelG = ctx.createGain();
      this.wheelG.gain.value = 0;
      this.wheel.connect(wheelHP);
      wheelHP.connect(this.wheelG);
      this.wheelG.connect(this.master);
      this.wheel.start();

      // 5. Monsoon Rain Ambience Loop (1400 Hz Lowpass)
      const rainSrc = ctx.createBufferSource();
      rainSrc.buffer = this.sharedNoiseBuffer;
      rainSrc.loop = true;
      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.value = 1400;
      this.rainG = ctx.createGain();
      this.rainG.gain.value = 0;
      rainSrc.connect(rainFilter);
      rainFilter.connect(this.rainG);
      this.rainG.connect(this.master);
      rainSrc.start();

      // 6. Aerodynamic High-Speed Wind Loop (800 Hz Lowpass)
      const windSrc = ctx.createBufferSource();
      windSrc.buffer = this.sharedNoiseBuffer;
      windSrc.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 800;
      this.windG = ctx.createGain();
      this.windG.gain.value = 0;
      windSrc.connect(windFilter);
      windFilter.connect(this.windG);
      this.windG.connect(this.master);
      windSrc.start();

      // 7. Track Bass Rumble Loop (110 Hz Lowpass)
      const rumSrc = ctx.createBufferSource();
      rumSrc.buffer = this.sharedNoiseBuffer;
      rumSrc.loop = true;
      const rumFilter = ctx.createBiquadFilter();
      rumFilter.type = 'lowpass';
      rumFilter.frequency.value = 110;
      this.rumG = ctx.createGain();
      this.rumG.gain.value = 0;
      rumSrc.connect(rumFilter);
      rumFilter.connect(this.rumG);
      this.rumG.connect(this.master);
      rumSrc.start();

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio initialization error:', e);
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

  /**
   * Per-frame real-time telemetry update (Zero allocation, 60fps locked)
   */
  update(speedMs, isMoving, dt) {
    if (!this.ctx || !this.initialized) return;
    const t = this.ctx.currentTime;
    const sp = Math.min(Math.max(0, speedMs || 0), 35);
    const isRunning = this.isEngineRunning;
    const thr = isRunning ? Math.min(1.0, 0.15 + sp / 28) : 0;

    // 1. Engine RPM & Chug rate
    if (this.osc1 && this.osc2) {
      this.osc1.frequency.setTargetAtTime(32 + thr * 45, t, 0.15);
      this.osc2.frequency.setTargetAtTime(48 + thr * 68, t, 0.15);
    }
    if (this.engFilter) {
      this.engFilter.frequency.setTargetAtTime(200 + thr * 650, t, 0.15);
    }
    if (this.engAmp) {
      const targetEngAmp = isRunning ? (0.10 + 0.18 * thr) : 0.0001;
      this.engAmp.gain.setTargetAtTime(targetEngAmp, t, 0.12);
    }
    if (this.lfo) {
      this.lfo.frequency.setTargetAtTime(6 + thr * 16, t, 0.15);
    }

    // 2. Turbocharger whine (kicks in when accelerating above 4 m/s)
    if (this.turboG) {
      const targetTurbo = isRunning && sp > 4 ? (0.02 + thr * 0.04) : 0.0001;
      this.turboG.gain.setTargetAtTime(targetTurbo, t, 0.1);
    }

    // 3. Wheel-on-rail clack tempo and volume
    if (this.wheel && this.wheelG) {
      this.wheel.playbackRate.setTargetAtTime(Math.max(0.01, sp / 13.5), t, 0.05);
      this.wheelG.gain.setTargetAtTime(Math.min(0.85, sp / 15), t, 0.1);
    }

    // 4. Aerodynamic wind and track rumble
    if (this.windG) {
      this.windG.gain.setTargetAtTime(Math.min(0.2, sp / 140), t, 0.2);
    }
    if (this.rumG) {
      this.rumG.gain.setTargetAtTime(Math.min(0.45, sp / 35), t, 0.2);
    }

    // 5. Weather rain sound
    if (this.rainG) {
      this.rainG.gain.setTargetAtTime(this.isRaining ? 0.24 : 0.0001, t, 0.3);
    }
  }

  setEngineActive(active) {
    this.ensureContext();
    if (!this.ctx) return;
    this.isEngineRunning = active;
    const now = this.ctx.currentTime;

    if (active) {
      // Natural diesel startup: initial starter ramp
      if (this.engAmp) {
        this.engAmp.gain.cancelScheduledValues(now);
        this.engAmp.gain.setValueAtTime(0.0001, now);
        this.engAmp.gain.linearRampToValueAtTime(0.12, now + 0.8);
      }
    } else {
      // Shutdown: trigger pneumatic air brake hiss when stopping
      this.airHiss();
      if (this.engAmp) {
        this.engAmp.gain.cancelScheduledValues(now);
        this.engAmp.gain.setValueAtTime(this.engAmp.gain.value, now);
        this.engAmp.gain.linearRampToValueAtTime(0.0001, now + 1.2);
      }
    }
  }

  setRain(active) {
    this.ensureContext();
    if (!this.ctx) return;
    this.isRaining = active;
    const now = this.ctx.currentTime;

    if (active) {
      this.playRainStartSfx(now);
    } else {
      this.playRainStopSfx(now);
    }

    if (this.rainG) {
      this.rainG.gain.cancelScheduledValues(now);
      this.rainG.gain.setValueAtTime(this.rainG.gain.value, now);
      this.rainG.gain.setTargetAtTime(active ? 0.24 : 0.0001, now, 0.35);
    }
  }

  playRainStartSfx(time) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    // Onset droplet ping cluster
    const dropOffsets = [0.03, 0.09, 0.16, 0.24, 0.33, 0.42];
    dropOffsets.forEach(dt => {
      this.synthesizeDroplet(time + dt, 1400 + Math.random() * 1000, 0.07);
    });
  }

  playRainStopSfx(time) {
    if (!this.ctx) return;
    // Trailing sporadic drips tapering into quiet
    const trailingOffsets = [0.15, 0.40, 0.75, 1.25];
    trailingOffsets.forEach((dt, idx) => {
      this.synthesizeDroplet(time + dt, 1200 + Math.random() * 800, Math.max(0.015, 0.06 - idx * 0.012));
    });
  }

  synthesizeDroplet(dropTime, centerFreq, volume) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const duration = 0.04;
    const len = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < len; i++) {
      const t = i / ctx.sampleRate;
      const ping = Math.sin(2 * Math.PI * centerFreq * t);
      const decay = Math.exp(-t * 90);
      data[i] = ping * decay * 0.8;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, dropTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, dropTime + duration);
    src.connect(gain);
    gain.connect(this.master);
    src.start(dropTime);
  }

  /**
   * Dual-chime locomotive horn (F4 349.23 Hz + A4 440.0 Hz major third)
   * With 1800 Hz lowpass filter to warm brassy harmonics
   */
  startHorn() {
    this.horn(true);
  }

  stopHorn() {
    this.horn(false);
  }

  horn(active) {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    if (active) {
      if (!this.hornG) {
        this.hornG = this.ctx.createGain();
        this.hornG.gain.setValueAtTime(0, t);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1800;

        this.hornOsc1 = this.ctx.createOscillator();
        this.hornOsc1.type = 'sawtooth';
        this.hornOsc1.frequency.value = 349.23; // F4

        this.hornOsc2 = this.ctx.createOscillator();
        this.hornOsc2.type = 'sawtooth';
        this.hornOsc2.frequency.value = 440.0;  // A4

        this.hornOsc1.connect(filter);
        this.hornOsc2.connect(filter);
        filter.connect(this.hornG);
        this.hornG.connect(this.master);

        this.hornOsc1.start();
        this.hornOsc2.start();
      }
      this.hornG.gain.cancelScheduledValues(t);
      this.hornG.gain.linearRampToValueAtTime(0.42, t + 0.05);
      this.isHornPlaying = true;
    } else {
      if (this.hornG) {
        this.hornG.gain.cancelScheduledValues(t);
        this.hornG.gain.linearRampToValueAtTime(0, t + 0.12);
        const o1 = this.hornOsc1;
        const o2 = this.hornOsc2;
        this.hornOsc1 = null;
        this.hornOsc2 = null;
        this.hornG = null;
        this.isHornPlaying = false;
        setTimeout(() => {
          try {
            if (o1) o1.stop();
            if (o2) o2.stop();
          } catch (e) {}
        }, 150);
      }
    }
  }

  /**
   * One-shot pneumatic air brake release hiss (Highpass 2800 Hz)
   */
  airHiss() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.sharedNoiseBuffer || this.createNoiseBuffer();

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2800;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.24, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.35);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    src.start(t);
    src.stop(t + 1.4);
  }

  setVolume(val) {
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime, 0.05);
    }
  }
}

window.TrainAudio = new TrainAudioEngine();
window.TrainAudioEngine = window.TrainAudio;
