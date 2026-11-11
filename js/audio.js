// audio.js - Zero-Allocation Procedural Web Audio Synthesizer
// Features: Diesel Engine Pulse, Track Click-Clack Rhythm, Air Brake Hiss, Multi-Chime Nathan Horn & Rain Patter
class TrainAudioEngine {
    constructor() {
        this.audioCtx = null;
        this.isInitialized = false;
        this.isMuted = false;

        this.masterGain = null;
        this.engineOsc1 = null;
        this.engineOsc2 = null;
        this.engineFilter = null;
        this.engineGain = null;
        this.lfo = null;
        this.lfoGain = null;

        this.wheelSource = null;
        this.wheelGain = null;
        this.rainGain = null;
        this.noiseBuffer = null;

        this.hornGain = null;
        this.hornOscs = [];

        this.isEngineRunning = false;
        this.isRaining = false;

        // Auto-suspend audio when browser tab is hidden to save CPU
        document.addEventListener('visibilitychange', () => {
            if (!this.audioCtx) return;
            if (document.hidden) {
                this.audioCtx.suspend();
            } else if (!this.isMuted) {
                this.audioCtx.resume();
            }
        });
    }

    init() {
        if (this.isInitialized) {
            if (this.audioCtx && this.audioCtx.state === 'suspended' && !this.isMuted) {
                this.audioCtx.resume();
            }
            return;
        }

        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.audioCtx = new AC();

        const comp = this.audioCtx.createDynamicsCompressor();
        comp.connect(this.audioCtx.destination);

        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(0.8, this.audioCtx.currentTime);
        this.masterGain.connect(comp);

        this._buildSharedBuffers();
        this._setupDieselEngine();
        this._setupTrackRhythm();
        this._setupRainAmbience();

        this.isInitialized = true;
    }

    _buildSharedBuffers() {
        const sr = this.audioCtx.sampleRate;
        this.noiseBuffer = this.audioCtx.createBuffer(1, sr * 2, sr);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
    }

    _setupDieselEngine() {
        const t = this.audioCtx.currentTime;
        this.engineOsc1 = this.audioCtx.createOscillator();
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc1.frequency.setValueAtTime(GAME_CONFIG.audio.idleRpmFreq, t);

        this.engineOsc2 = this.audioCtx.createOscillator();
        this.engineOsc2.type = 'triangle';
        this.engineOsc2.frequency.setValueAtTime(GAME_CONFIG.audio.idleRpmFreq * 1.5, t);

        this.engineFilter = this.audioCtx.createBiquadFilter();
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.setValueAtTime(180, t);
        this.engineFilter.Q.setValueAtTime(2.2, t);

        this.engineGain = this.audioCtx.createGain();
        this.engineGain.gain.setValueAtTime(0.0, t);

        this.lfo = this.audioCtx.createOscillator();
        this.lfo.type = 'sine';
        this.lfo.frequency.setValueAtTime(7, t);
        this.lfoGain = this.audioCtx.createGain();
        this.lfoGain.gain.setValueAtTime(0.04, t);
        this.lfo.connect(this.lfoGain);
        this.lfoGain.connect(this.engineGain.gain);

        this.engineOsc1.connect(this.engineFilter);
        this.engineOsc2.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.masterGain);

        this.engineOsc1.start();
        this.engineOsc2.start();
        this.lfo.start();
    }

    _setupTrackRhythm() {
        const sr = this.audioCtx.sampleRate;
        const len = Math.floor(sr * 1.2);
        const buf = this.audioCtx.createBuffer(1, len, sr);
        const d = buf.getChannelData(0);
        const hits = [0.0, 0.14, 0.60, 0.74];

        hits.forEach((hitTime, idx) => {
            const st = Math.floor(hitTime * sr);
            const dur = Math.floor(sr * 0.08);
            let lpv = 0;
            for (let k = 0; k < dur && st + k < len; k++) {
                const env = Math.exp(-k / (sr * 0.016));
                const n = Math.random() * 2 - 1;
                lpv += (n - lpv) * 0.25;
                d[st + k] += (lpv * 0.7 + Math.sin(2 * Math.PI * 90 * k / sr) * 0.4) * env * (idx % 2 ? 0.75 : 1.0);
            }
        });

        this.wheelSource = this.audioCtx.createBufferSource();
        this.wheelSource.buffer = buf;
        this.wheelSource.loop = true;

        const hp = this.audioCtx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(75, this.audioCtx.currentTime);

        this.wheelGain = this.audioCtx.createGain();
        this.wheelGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

        this.wheelSource.connect(hp);
        hp.connect(this.wheelGain);
        this.wheelGain.connect(this.masterGain);
        this.wheelSource.start();
    }

    _setupRainAmbience() {
        const src = this.audioCtx.createBufferSource();
        src.buffer = this.noiseBuffer;
        src.loop = true;

        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1100, this.audioCtx.currentTime);

        this.rainGain = this.audioCtx.createGain();
        this.rainGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

        src.connect(filter);
        filter.connect(this.rainGain);
        this.rainGain.connect(this.masterGain);
        src.start();
    }

    toggleMute() {
        this.init();
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.audioCtx) {
            this.masterGain.gain.setTargetAtTime(this.isMuted ? 0.0 : 0.8, this.audioCtx.currentTime, 0.08);
        }
        return this.isMuted;
    }

    startEngine() {
        this.init();
        if (!this.audioCtx) return;
        this.isEngineRunning = true;
        this.engineGain.gain.setTargetAtTime(0.22, this.audioCtx.currentTime, 0.25);
    }

    stopEngine() {
        if (!this.isInitialized || !this.audioCtx) return;
        this.isEngineRunning = false;
        this.playAirHiss();
        this.engineGain.gain.setTargetAtTime(0.0, this.audioCtx.currentTime, 0.5);
        this.wheelGain.gain.setTargetAtTime(0.0, this.audioCtx.currentTime, 0.3);
    }

    updateRPM(speedRatio, isRunning) {
        if (!this.isInitialized || !this.audioCtx) return;
        const t = this.audioCtx.currentTime;
        const active = isRunning || speedRatio > 0.01;

        const baseFreq = GAME_CONFIG.audio.idleRpmFreq + (GAME_CONFIG.audio.maxRpmFreq - GAME_CONFIG.audio.idleRpmFreq) * speedRatio;
        this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.15);
        this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, t, 0.15);
        this.engineFilter.frequency.setTargetAtTime(170 + speedRatio * 360, t, 0.15);
        this.lfo.frequency.setTargetAtTime(6 + speedRatio * 14, t, 0.15);
        this.engineGain.gain.setTargetAtTime(active ? (0.14 + speedRatio * 0.18) : 0.0, t, 0.2);

        this.wheelSource.playbackRate.setTargetAtTime(Math.max(0.1, 0.45 + speedRatio * 1.15), t, 0.1);
        this.wheelGain.gain.setTargetAtTime(speedRatio > 0.02 ? Math.min(0.55, speedRatio * 0.65) : 0.0, t, 0.12);
    }

    startHorn() {
        this.init();
        if (!this.audioCtx || this.hornGain) return;
        const now = this.audioCtx.currentTime;

        this.hornGain = this.audioCtx.createGain();
        this.hornGain.gain.setValueAtTime(0.0, now);
        this.hornGain.gain.linearRampToValueAtTime(0.26, now + 0.05);

        const lp = this.audioCtx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(1650, now);
        lp.connect(this.hornGain);
        this.hornGain.connect(this.masterGain);

        const freqs = GAME_CONFIG.audio.hornFrequencies || [311.13, 370.00, 466.16];
        this.hornOscs = freqs.map(f => {
            const osc = this.audioCtx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(f, now);
            osc.connect(lp);
            osc.start(now);
            return osc;
        });
    }

    stopHorn() {
        if (!this.audioCtx || !this.hornGain) return;
        const now = this.audioCtx.currentTime;
        const g = this.hornGain;
        const oscs = this.hornOscs;
        this.hornGain = null;
        this.hornOscs = [];

        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        setTimeout(() => {
            oscs.forEach(o => { try { o.stop(); } catch (e) {} });
        }, 250);
    }

    playHorn() {
        this.startHorn();
        setTimeout(() => this.stopHorn(), 850);
    }

    playAirHiss() {
        if (!this.isInitialized || !this.audioCtx) return;
        const t = this.audioCtx.currentTime;
        const s = this.audioCtx.createBufferSource();
        s.buffer = this.noiseBuffer;

        const f = this.audioCtx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.setValueAtTime(2800, t);

        const g = this.audioCtx.createGain();
        g.gain.setValueAtTime(0.0, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);

        s.connect(f);
        f.connect(g);
        g.connect(this.masterGain);
        s.start(t);
        s.stop(t + 1.15);
    }

    setRainSound(enable) {
        this.init();
        if (!this.audioCtx || !this.rainGain) return;
        this.isRaining = enable;
        const target = enable ? (GAME_CONFIG.audio.rainNoiseDensity || 0.22) : 0.0;
        this.rainGain.gain.setTargetAtTime(target, this.audioCtx.currentTime, 0.35);
    }
}
