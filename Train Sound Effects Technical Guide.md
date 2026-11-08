# Bangladesh Railway Procedural Sound Effects — Technical Guide & Architecture

## Overview
Instead of relying on external `.mp3` or `.wav` files (which require network loading and can fail offline), this game uses a **100% Procedural Web Audio API Synthesizer**. Every sound—from the deep diesel-electric locomotive chug and turbocharger whine to the rhythmic rail-joint wheel clacks, dual-chime horn, pneumatic air brake hiss, and monsoon rain—is mathematically synthesized in real time in the browser's audio thread.

---

## 1. Signal Chain & Master Bus
All audio nodes route through a master gain stage and a hardware-style `DynamicsCompressorNode` before reaching the speakers (`ctx.destination`). This prevents clipping when multiple effects (e.g., horn + bridge rumble + diesel engine) play simultaneously.

$$\text{Sound Generators} \longrightarrow \text{Individual Filters/Gains} \longrightarrow \text{Master Gain} \longrightarrow \text{Dynamics Compressor} \longrightarrow \text{Output}$$

---

## 2. How Each Sound Effect is Synthesized

### A. Diesel-Electric Locomotive Engine & Chug
* **Oscillators**: Two detuned `sawtooth` oscillators (`osc1` at $32\text{ Hz}$ base, `osc2` at $48\text{ Hz}$ base—a musical fifth interval that creates a rich, heavy mechanical timbre).
* **Engine Low-Pass Filter**: A `lowpass` BiquadFilter with $Q = 2.5$ sweeps from $200\text{ Hz}$ (idle) up to $850\text{ Hz}$ at full throttle.
* **Piston Chug Modulation (LFO)**: A `square` wave Low-Frequency Oscillator (`lfo`) modulates the engine's amplitude gain (`engAmp.gain`). As train speed increases, the LFO frequency ramps from $6\text{ Hz}$ (idle chug) up to $22\text{ Hz}$ (fast piston roar).

### B. Turbocharger Whine
* **Source**: A looping 2-second white noise buffer (`Math.random() * 2 - 1`).
* **Filter**: A narrow `bandpass` filter centered at $1900\text{ Hz}$ with a high resonance ($Q = 8$), producing the signature high-pitchedEMD/alisal locomotive turbo whistle when speed exceeds $4\text{ m/s}$.

### C. Rhythmic Wheel-on-Rail Joint Clack ("Clickety-Clack")
* **Custom Impulse Buffer (`wheelBuf`)**: A 1.2-second looping audio buffer containing 4 bogie wheel-hit impulses at `t = [0.00s, 0.14s, 0.60s, 0.74s]`.
* **Synthesis Formula**: Each impulse combines low-pass filtered noise with an $85\text{ Hz}$ metallic sine thud, shaped by an exponential decay envelope:
  $$E(k) = e^{-\frac{k}{0.018 \cdot f_s}}$$
* **Dynamic Pitch & Tempo**: The `playbackRate` of the buffer scales linearly with velocity ($\text{rate} = \frac{v}{13.5}$), naturally speeding up the rhythm as the train accelerates.

### D. Dual-Chime Bangladesh Locomotive Horn (বাঁশি)
* **Oscillators**: Two `sawtooth` oscillators tuned to **$F_4$ ($349.23\text{ Hz}$)** and **$A_4$ ($440.0\text{ Hz}$)**—creating an authentic major-third railway air-horn chord.
* **Filter & Envelope**: Routed through a $1800\text{ Hz}$ `lowpass` filter to warm the brassy harmonics, with a $50\text{ ms}$ attack ramp and a $120\text{ ms}$ release decay.

### E. Pneumatic Air Brake Hiss
* **One-Shot Generator (`airHiss`)**: Creates a temporary white-noise buffer source routed through a $2800\text{ Hz}$ `highpass` filter.
* **Envelope**: Ramps from $0$ to $0.25$ gain in $40\text{ ms}$, then exponentially decays to $0.001$ over $1.4\text{ seconds}$ to mimic compressed air venting from brake cylinders.

### F. Bridge Steel Rumble, Aerodynamic Wind & Monsoon Rain
* **Track & Bridge Rumble**: White noise filtered through a $110\text{ Hz}$ `lowpass` filter. Gain increases with train speed and receives a $+0.40$ boost when crossing steel bridges.
* **Aerodynamic Wind**: White noise through an $800\text{ Hz}$ `lowpass` filter, scaling with high speed.
* **Monsoon Rain Ambience**: White noise through a $1400\text{ Hz}$ `lowpass` filter, smoothly faded in whenever Rain mode is active.

---

## 3. How to Use in Antigravity or Another Game
Upload the accompanying `train_audio_engine.js` file to your project and call its simple API:

```javascript
// 1. Initialize on first user click/touch/keypress
TrainAudioEngine.init();

// 2. Call inside your game's requestAnimationFrame / update loop
// speedMs: speed in meters/second (e.g. kmh / 3.6)
// isRunning: boolean (true when engine is active)
// onBridge: boolean (true when on a bridge for extra bass rumble)
// isRaining: boolean (true for monsoon rain sound)
TrainAudioEngine.update(speedMs, isRunning, onBridge, isRaining);

// 3. Trigger Horn (true = start blowing, false = release)
TrainAudioEngine.horn(true);
TrainAudioEngine.horn(false);

// 4. Trigger Pneumatic Air Brake Hiss (one-shot sound)
TrainAudioEngine.airHiss();
```