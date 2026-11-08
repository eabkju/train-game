/**
 * Standalone Procedural Train & Environment Audio Engine
 * 100% Offline Web Audio API Synthesizer (Zero external audio files required)
 * Ready for import into Antigravity or any HTML5 / Three.js / Canvas game.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TrainAudioEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ctx = null;
  var master = null;
  var comp = null;

  // Continuous synthesis nodes
  var osc1 = null, osc2 = null;
  var engFilter = null, engAmp = null;
  var lfo = null, lfoG = null;
  var turboG = null;
  var wheel = null, wheelG = null;
  var windG = null;
  var rumG = null;
  var rainG = null;

  // On-demand horn nodes
  var hornG = null, hornOsc1 = null, hornOsc2 = null;
  var sharedNoiseBuffer = null;

  /**
   * Generates a 2-second white noise buffer for wind, turbo, rain, and air brakes
   */
  function createNoiseBuffer() {
    var buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Generates a 1.2-second rhythmic 4-axle bogie rail-joint clack buffer
   */
  function createWheelClackBuffer() {
    var sr = ctx.sampleRate;
    var len = Math.floor(sr * 1.2);
    var buffer = ctx.createBuffer(1, len, sr);
    var data = buffer.getChannelData(0);
    var hits = [0.0, 0.14, 0.60, 0.74]; // Front bogie + rear bogie timing

    hits.forEach(function (hitTime, idx) {
      var startSample = Math.floor(hitTime * sr);
      var impulseLen = Math.floor(sr * 0.09);
      var lowPassVal = 0;

      for (var k = 0; k < impulseLen && (startSample + k) < len; k++) {
        var env = Math.exp(-k / (sr * 0.018));
        var white = Math.random() * 2 - 1;
        lowPassVal += (white - lowPassVal) * 0.25;
        var metallicThud = Math.sin(2 * Math.PI * 85 * k / sr) * 0.5;
        var accent = (idx % 2 === 1) ? 0.72 : 1.0;
        data[startSample + k] += (lowPassVal * 0.9 + metallicThud) * env * accent;
      }
    });
    return buffer;
  }

  var TrainAudioEngine = {
    /**
     * Initialize the Web Audio context and start background synthesis loops.
     * Must be called inside a user gesture (click, pointerdown, touchstart, keydown).
     */
    init: function () {
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume();
        return this;
      }
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('Web Audio API is not supported in this browser.');
        return this;
      }
      ctx = new AudioCtx();

      // Master compressor & gain
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 12;
      comp.ratio.value = 6;
      comp.connect(ctx.destination);

      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(comp);

      // 1. Diesel-Electric Engine (Dual Sawtooth + LFO Chug)
      osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = 32;

      osc2 = ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.value = 48;

      engFilter = ctx.createBiquadFilter();
      engFilter.type = 'lowpass';
      engFilter.frequency.value = 240;
      engFilter.Q.value = 2.5;

      engAmp = ctx.createGain();
      engAmp.gain.value = 0.14;

      lfo = ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = 8;

      lfoG = ctx.createGain();
      lfoG.gain.value = 0.06;
      lfo.connect(lfoG);
      lfoG.connect(engAmp.gain);

      var engMix = ctx.createGain();
      engMix.gain.value = 0.5;
      osc1.connect(engMix);
      osc2.connect(engMix);
      engMix.connect(engFilter);
      engFilter.connect(engAmp);
      engAmp.connect(master);

      osc1.start();
      osc2.start();
      lfo.start();

      sharedNoiseBuffer = createNoiseBuffer();

      // 2. Turbocharger Whine (1900 Hz Bandpass)
      var turboSrc = ctx.createBufferSource();
      turboSrc.buffer = sharedNoiseBuffer;
      turboSrc.loop = true;
      var turboFilter = ctx.createBiquadFilter();
      turboFilter.type = 'bandpass';
      turboFilter.frequency.value = 1900;
      turboFilter.Q.value = 8;
      turboG = ctx.createGain();
      turboG.gain.value = 0.002;
      turboSrc.connect(turboFilter);
      turboFilter.connect(turboG);
      turboG.connect(master);
      turboSrc.start();

      // 3. Wheel-on-Rail Clack Loop
      wheel = ctx.createBufferSource();
      wheel.buffer = createWheelClackBuffer();
      wheel.loop = true;
      var wheelHP = ctx.createBiquadFilter();
      wheelHP.type = 'highpass';
      wheelHP.frequency.value = 65;
      wheelG = ctx.createGain();
      wheelG.gain.value = 0;
      wheel.connect(wheelHP);
      wheelHP.connect(wheelG);
      wheelG.connect(master);
      wheel.start();

      // 4. Monsoon Rain Loop
      var rainSrc = ctx.createBufferSource();
      rainSrc.buffer = sharedNoiseBuffer;
      rainSrc.loop = true;
      var rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.value = 1400;
      rainG = ctx.createGain();
      rainG.gain.value = 0;
      rainSrc.connect(rainFilter);
      rainFilter.connect(rainG);
      rainG.connect(master);
      rainSrc.start();

      // 5. High-Speed Wind Loop
      var windSrc = ctx.createBufferSource();
      windSrc.buffer = sharedNoiseBuffer;
      windSrc.loop = true;
      var windFilter = ctx.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 800;
      windG = ctx.createGain();
      windG.gain.value = 0;
      windSrc.connect(windFilter);
      windFilter.connect(windG);
      windG.connect(master);
      windSrc.start();

      // 6. Track & Steel Bridge Bass Rumble Loop
      var rumSrc = ctx.createBufferSource();
      rumSrc.buffer = sharedNoiseBuffer;
      rumSrc.loop = true;
      var rumFilter = ctx.createBiquadFilter();
      rumFilter.type = 'lowpass';
      rumFilter.frequency.value = 110;
      rumG = ctx.createGain();
      rumG.gain.value = 0;
      rumSrc.connect(rumFilter);
      rumFilter.connect(rumG);
      rumG.connect(master);
      rumSrc.start();

      return this;
    },

    /**
     * Real-time telemetry update—call every frame in your game loop.
     * @param {number} speedMs - Train speed in meters per second (km/h divided by 3.6)
     * @param {boolean} isRunning - True if locomotive engine is active/accelerating
     * @param {boolean} inBridge - True if crossing a bridge (adds deep steel resonance)
     * @param {boolean} isRain - True if rain weather is active
     */
    update: function (speedMs, isRunning, inBridge, isRain) {
      if (!ctx) return;
      var t = ctx.currentTime;
      var sp = Math.min(Math.max(0, speedMs || 0), 35);
      var thr = isRunning ? Math.min(1.0, 0.15 + sp / 28) : 0;

      // Engine RPM & Chug rate
      osc1.frequency.setTargetAtTime(32 + thr * 45, t, 0.15);
      osc2.frequency.setTargetAtTime(48 + thr * 68, t, 0.15);
      engFilter.frequency.setTargetAtTime(200 + thr * 650, t, 0.15);
      engAmp.gain.setTargetAtTime(isRunning ? 0.10 + 0.18 * thr : 0.05, t, 0.12);
      lfo.frequency.setTargetAtTime(6 + thr * 16, t, 0.15);

      // Turbo whine, wheel clack, wind, and bridge rumble
      turboG.gain.setTargetAtTime(isRunning && sp > 4 ? 0.02 + thr * 0.04 : 0.002, t, 0.1);
      wheel.playbackRate.setTargetAtTime(Math.max(0.01, sp / 13.5), t, 0.05);
      wheelG.gain.setTargetAtTime(Math.min(0.85, sp / 15), t, 0.1);
      windG.gain.setTargetAtTime(Math.min(0.2, sp / 140), t, 0.2);
      rumG.gain.setTargetAtTime(Math.min(0.45, sp / 35) + (inBridge ? 0.4 : 0), t, 0.2);

      // Weather rain sound
      rainG.gain.setTargetAtTime(isRain ? 0.22 : 0, t, 0.3);
    },

    /**
     * Sound or release the dual-chime locomotive horn (F4 + A4 major third).
     * @param {boolean} active - True to start blowing horn, false to stop
     */
    horn: function (active) {
      if (!ctx) this.init();
      if (!ctx) return;
      var t = ctx.currentTime;

      if (active) {
        if (!hornG) {
          hornG = ctx.createGain();
          hornG.gain.setValueAtTime(0, t);

          var filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 1800;

          hornOsc1 = ctx.createOscillator();
          hornOsc1.type = 'sawtooth';
          hornOsc1.frequency.value = 349.23; // F4

          hornOsc2 = ctx.createOscillator();
          hornOsc2.type = 'sawtooth';
          hornOsc2.frequency.value = 440.0;  // A4

          hornOsc1.connect(filter);
          hornOsc2.connect(filter);
          filter.connect(hornG);
          hornG.connect(master);

          hornOsc1.start();
          hornOsc2.start();
        }
        hornG.gain.cancelScheduledValues(t);
        hornG.gain.linearRampToValueAtTime(0.4, t + 0.05);
      } else {
        if (hornG) {
          hornG.gain.cancelScheduledValues(t);
          hornG.gain.linearRampToValueAtTime(0, t + 0.12);
          var o1 = hornOsc1, o2 = hornOsc2;
          hornOsc1 = null;
          hornOsc2 = null;
          hornG = null;
          setTimeout(function () {
            try {
              if (o1) o1.stop();
              if (o2) o2.stop();
            } catch (e) {}
          }, 150);
        }
      }
    },

    /**
     * Trigger a one-shot pneumatic air brake release hiss.
     */
    airHiss: function () {
      if (!ctx) this.init();
      if (!ctx) return;
      var t = ctx.currentTime;

      var src = ctx.createBufferSource();
      src.buffer = sharedNoiseBuffer || createNoiseBuffer();

      var filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2800;

      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.24, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.35);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      src.start(t);
      src.stop(t + 1.4);
    },

    /**
     * Set master volume (0.0 to 1.0)
     */
    setVolume: function (val) {
      if (master && ctx) {
        master.gain.setTargetAtTime(Math.max(0, Math.min(1, val)), ctx.currentTime, 0.05);
      }
    }
  };

  return TrainAudioEngine;
}));