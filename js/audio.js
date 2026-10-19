/**
 * ClawAudio - Web Audio API Procedural Sound Synthesizer
 * Zero external audio files; all sounds are procedurally generated in real time.
 */

class ClawAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isMuted = false;
    this._noiseBuffer = null;
    this.sceneMusic = null;
    this.sceneMusicActive = false;
  }

  /**
   * Initializes the AudioContext on first user interaction.
   * Safe to call multiple times.
   */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('[ClawAudio] Web Audio API is not supported in this browser.');
      return;
    }

    try {
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch (err) {
      console.warn('[ClawAudio] Failed to initialize AudioContext:', err);
    }
  }

  /**
   * Ensures AudioContext is active and ready.
   * @private
   */
  _ensureContext() {
    if (!this.ctx) {
      this.init();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return !!this.ctx && !this.isMuted;
  }

  /**
   * Helper to create a single oscillator tone with an exponential decay envelope.
   * @param {string} type - 'sine' | 'triangle' | 'square' | 'sawtooth'
   * @param {number} frequency - Hz
   * @param {number} duration - seconds
   * @param {number} volume - 0 to 1
   */
  _createTone(type, frequency, duration, volume = 0.3, delay = 0) {
    if (!this._ensureContext()) return null;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, frequency), now);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);

    return { osc, gain };
  }

  // Quiet, rounded notes for the secret-code entrance; scheduled on the audio clock.
  playPasscodeEffect(effect) {
    const notes = { key: [660], erase: [440], wrong: [330, 262], unlock: [523, 659, 784, 1047] }[effect];
    if (!notes || !this._ensureContext()) return;
    notes.forEach((frequency, index) => {
      this._createTone('sine', frequency, effect === 'unlock' ? 0.24 : 0.09, 0.12, index * 0.09);
    });
  }

  /**
   * Lazily generates a reusable white noise buffer (1 second duration).
   * @private
   */
  _getNoiseBuffer() {
    if (this._noiseBuffer) return this._noiseBuffer;
    if (!this.ctx) return null;

    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate; // 1 second
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this._noiseBuffer = buffer;
    return buffer;
  }

  /**
   * Plays filtered noise burst with customizable envelope.
   * @private
   */
  _playNoise({ duration = 0.2, filterType = 'lowpass', filterFreq = 1000, endFilterFreq = null, volume = 0.2, delay = 0 }) {
    if (!this._ensureContext()) return;

    const noiseBuffer = this._getNoiseBuffer();
    if (!noiseBuffer) return;

    const now = this.ctx.currentTime + delay;
    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, now);
    if (endFilterFreq !== null) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(10, endFilterFreq), now + duration);
    }

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
    source.stop(now + duration + 0.05);
  }

  /**
   * Gantry movement sound: Low-frequency filtered triangle wave, short burst
   * ~80Hz, duration 50ms, repeated while moving.
   */
  playGantryMove() {
    if (!this._ensureContext()) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, now);
    // Subtle mechanical detune ramp
    osc.frequency.linearRampToValueAtTime(85, now + 0.05);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.055);
  }

  /**
   * Cable drop sound: Descending frequency sweep from 400Hz to 100Hz over 0.4s
   * Triangle wave, moderate volume.
   */
  playCableDrop() {
    if (!this._ensureContext()) return;

    const now = this.ctx.currentTime;
    const duration = 0.4;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.03);
    gain.gain.linearRampToValueAtTime(0.20, now + duration - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /**
   * Claw clamp sound: Sharp metallic snap
   * High-freq square wave burst at 2000Hz, duration 50ms, with quick decay.
   */
  playClawClamp() {
    if (!this._ensureContext()) return;

    const now = this.ctx.currentTime;
    const duration = 0.05;

    // Metallic ping 1
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(2000, now);
    osc1.frequency.exponentialRampToValueAtTime(1200, now + duration);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + duration);

    // Complementary snap overtone
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(800, now);
    gain2.gain.setValueAtTime(0.25, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now);
    osc2.stop(now + duration);
  }

  /**
   * Chute drop sound: Bouncy thud sequence: 3 quick hits descending pitch
   * 300Hz, 200Hz, 150Hz at 0ms, 100ms, 180ms.
   */
  playChuteDrop() {
    if (!this._ensureContext()) return;

    const hits = [
      { freq: 300, delay: 0.00, dur: 0.09, vol: 0.32 },
      { freq: 200, delay: 0.10, dur: 0.08, vol: 0.28 },
      { freq: 150, delay: 0.18, dur: 0.12, vol: 0.22 }
    ];

    hits.forEach(({ freq, delay, dur, vol }) => {
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + dur);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + dur + 0.01);
    });
  }

  /**
   * Crack sound effects for the capsule cracking stages:
   * - Stage 1: single tick at 1500Hz, 30ms, square wave.
   * - Stage 2: deeper crack at 800Hz, 60ms + shimmer at 3000Hz.
   * - Stage 3: explosive pop: white noise burst 100ms + rising chime chord (C5, E5, G5) with long decay.
   * @param {number} stage - 1, 2, or 3
   */
  playCrack(stage) {
    if (!this._ensureContext()) return;

    const now = this.ctx.currentTime;

    if (stage === 1) {
      // Stage 1: single tick at 1500Hz, 30ms, square wave
      this._createTone('square', 1500, 0.03, 0.3);
    } else if (stage === 2) {
      // Stage 2: deeper crack at 800Hz, 60ms + shimmer at 3000Hz
      this._createTone('square', 800, 0.06, 0.35);
      setTimeout(() => {
        if (!this.ctx || this.isMuted) return;
        this._createTone('sine', 3000, 0.12, 0.2);
      }, 15);
    } else {
      // Stage 3: explosive pop - white noise burst 100ms + rising chime chord (C5, E5, G5)
      this._playNoise({
        duration: 0.1,
        filterType: 'bandpass',
        filterFreq: 1800,
        volume: 0.4
      });

      // Rising chime chord: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), plus high shimmer C6 (1046.50Hz)
      const chord = [
        { freq: 523.25, delay: 0.02, dur: 1.2, vol: 0.28 },
        { freq: 659.25, delay: 0.08, dur: 1.3, vol: 0.28 },
        { freq: 783.99, delay: 0.14, dur: 1.4, vol: 0.26 },
        { freq: 1046.50, delay: 0.20, dur: 1.5, vol: 0.22 }
      ];

      chord.forEach(({ freq, delay, dur, vol }) => {
        setTimeout(() => {
          if (!this.ctx || this.isMuted) return;
          const chimeTime = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, chimeTime);

          gain.gain.setValueAtTime(0.0001, chimeTime);
          gain.gain.linearRampToValueAtTime(vol, chimeTime + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, chimeTime + dur);

          osc.connect(gain);
          gain.connect(this.masterGain);

          osc.start(chimeTime);
          osc.stop(chimeTime + dur + 0.05);
        }, delay * 1000);
      });
    }
  }

  /**
   * Scroll open sound: Gentle paper rustle: filtered white noise, very soft, 200ms.
   */
  playScrollOpen() {
    this._playNoise({
      duration: 0.2,
      filterType: 'bandpass',
      filterFreq: 1400,
      endFilterFreq: 700,
      volume: 0.16
    });
  }

  /**
   * Key snap sound: Magnetic suction whoosh: descending filtered noise from high to low, 150ms.
   */
  playKeySnap() {
    this._playNoise({
      duration: 0.15,
      filterType: 'lowpass',
      filterFreq: 3200,
      endFilterFreq: 180,
      volume: 0.32
    });

    // Subtly blended tactile chime ping
    setTimeout(() => {
      this._createTone('sine', 1200, 0.08, 0.18);
    }, 20);
  }

  /**
   * Lock turn sound: Two sharp clicks 150ms apart: 1800Hz square wave, 20ms each.
   */
  playLockTurn() {
    if (!this._ensureContext()) return;

    this._createTone('square', 1800, 0.02, 0.32);

    setTimeout(() => {
      if (!this.ctx || this.isMuted) return;
      this._createTone('square', 1800, 0.02, 0.32);
    }, 150);
  }

  /**
   * Shutter creak sound: Low frequency sweep 60Hz to 120Hz over 1s with slight wobble
   * Plus gentle wind: filtered white noise fade in/out over 2s.
   */
  playShutterCreak() {
    if (!this._ensureContext()) return;

    const now = this.ctx.currentTime;

    // Creak oscillator
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.linearRampToValueAtTime(120, now + 1.0);

    // LFO wobble ~ 8Hz
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(8, now);
    lfoGain.gain.setValueAtTime(6, now); // ±6Hz modulation
    lfo.connect(osc.frequency);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.1);
    gain.gain.linearRampToValueAtTime(0.10, now + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);

    osc.connect(gain);
    gain.connect(this.masterGain);

    lfo.start(now);
    osc.start(now);
    lfo.stop(now + 1.05);
    osc.stop(now + 1.05);

    // Gentle wind noise over 2s
    this._playNoise({
      duration: 2.0,
      filterType: 'lowpass',
      filterFreq: 450,
      endFilterFreq: 220,
      volume: 0.18
    });
  }

  /**
   * Victory chime sound: Ascending arpeggio: C5, E5, G5, C6 at 0ms, 150ms, 300ms, 450ms
   * Sine waves with gentle decay, reverb-like delay.
   */
  playVictoryChime() {
    if (!this._ensureContext()) return;

    const notes = [
      { freq: 523.25, delay: 0 },    // C5
      { freq: 659.25, delay: 150 },  // E5
      { freq: 783.99, delay: 300 },  // G5
      { freq: 1046.50, delay: 450 }  // C6
    ];

    notes.forEach(({ freq, delay }) => {
      setTimeout(() => {
        if (!this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;
        const duration = 1.0;

        // Primary bell tone
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration + 0.05);

        // Subtle overtone for warm sparkle
        const overtone = this.ctx.createOscillator();
        const overtoneGain = this.ctx.createGain();

        overtone.type = 'sine';
        overtone.frequency.setValueAtTime(freq * 2, now);

        overtoneGain.gain.setValueAtTime(0.0001, now);
        overtoneGain.gain.linearRampToValueAtTime(0.08, now + 0.01);
        overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.6);

        overtone.connect(overtoneGain);
        overtoneGain.connect(this.masterGain);

        overtone.start(now);
        overtone.stop(now + duration * 0.6 + 0.05);
      }, delay);
    });
  }

  /**
   * Coin insert sound: Iconic retro 2-tone arcade coin chime
   * Tone 1: 987.77Hz (B5) 80ms -> Tone 2: 1318.51Hz (E6) 280ms
   */
  playCoinInsert() {
    if (!this._ensureContext()) return;
    const now = this.ctx.currentTime;

    // First ping
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(987.77, now);
    gain1.gain.setValueAtTime(0.22, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 0.085);

    // Second higher chime ping
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(1318.51, now + 0.08);
    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.setValueAtTime(0.28, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.36);
  }

  /**
   * Button press sound: Short pop: sine 600Hz, 30ms with quick decay.
   */
  playButtonPress() {
    if (!this._ensureContext()) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.03);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.035);
  }

  /**
   * Plays the Isabella "Whatcha doin" voice line once.
   */
  playIsabellaVoice() {
    if (this.isMuted) return;
    try {
      if (!this.isabellaAudio) {
        this.isabellaAudio = new Audio('assets/isabella.mp3');
        this.isabellaAudio.loop = false;
      }
      this.isabellaAudio.currentTime = 0;
      this.isabellaAudio.muted = this.isMuted;
      this.isabellaAudio.volume = 0.85;
      const playPromise = this.isabellaAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('[ClawAudio] Isabella voice playback was prevented:', err);
        });
      }
    } catch (e) {
      console.warn('[ClawAudio] Failed to play Isabella voice:', e);
    }
  }

  startSceneMusic() {
    if (!this.sceneMusic) {
      this.sceneMusic = new Audio('assets/scene-music.mp3');
      this.sceneMusic.loop = true;
      this.sceneMusic.volume = 0.25;
      this.sceneMusic.muted = this.isMuted;
    }
    this.sceneMusicActive = true;
    this.resumeSceneMusic();
  }

  resumeSceneMusic() {
    if (this.sceneMusicActive && this.sceneMusic?.paused) {
      // Restored visits may need a user gesture before the browser permits music.
      this.sceneMusic.play().catch(() => {});
    }
  }

  stopSceneMusic() {
    this.sceneMusicActive = false;
    if (this.sceneMusic) {
      this.sceneMusic.pause();
      this.sceneMusic.currentTime = 0;
    }
  }

  /**
   * Toggles sound mute state.
   * @returns {boolean} - true if currently muted, false if unmuted.
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.4, now);
    }
    if (this.isabellaAudio) {
      this.isabellaAudio.muted = this.isMuted;
    }
    if (this.sceneMusic) {
      this.sceneMusic.muted = this.isMuted;
    }
    return this.isMuted;
  }
}

// Export global instance
window.clawAudio = new ClawAudio();
