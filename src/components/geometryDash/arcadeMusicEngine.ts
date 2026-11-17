/**
 * Procedural Banger Arcade Music Engine & Synthesizer for Geometry Dash
 * Features a multi-channel Web Audio sequencer with beat-perfect timing:
 * - Four-on-the-Floor punchy sub-kick
 * - Filtered snappy snare / clap
 * - Syncopated 16th-note rolling hi-hats
 * - Sidechained pumping sawtooth bassline
 * - Arpeggiated chiptune/EDM lead synth melody
 * - Uplifting supersaw chord stabs & drop risers
 */

export interface MusicTrackPreset {
  id: string;
  name: string;
  bpm: number;
  scale: number[]; // MIDI note offsets from root
  rootNote: number; // Base MIDI note (e.g., 57 = A3, 60 = C4)
  bassOctave: number;
  chordProgression: number[][]; // 4-bar chord root offsets
  melodyPattern: number[]; // 16-step melody pattern
  energy: 'high' | 'ultra' | 'frenzy';
}

export const ARCADE_PRESETS: MusicTrackPreset[] = [
  {
    id: 'stereo_blitz',
    name: 'Stereo Blitz (Anthem)',
    bpm: 145,
    rootNote: 57, // A minor
    scale: [0, 2, 3, 5, 7, 8, 10], // Natural minor
    bassOctave: 2,
    chordProgression: [
      [0, 3, 7], // Am
      [-4, 0, 3], // F
      [-2, 2, 5], // G
      [-5, -2, 2], // Em
    ],
    melodyPattern: [0, 7, 3, 7, 10, 7, 8, 7, 5, 7, 3, 7, 2, 3, 5, 7],
    energy: 'high',
  },
  {
    id: 'cyber_rush',
    name: 'Cyber Rush (Electro)',
    bpm: 152,
    rootNote: 60, // C minor
    scale: [0, 3, 5, 6, 7, 10], // Blues / Cyber minor
    bassOctave: 2,
    chordProgression: [
      [0, 3, 7], // Cm
      [8, 11, 15], // Ab
      [3, 6, 10], // Eb
      [5, 8, 12], // Bb
    ],
    melodyPattern: [12, 10, 15, 12, 7, 10, 12, 7, 6, 5, 3, 5, 7, 10, 12, 15],
    energy: 'ultra',
  },
  {
    id: 'neon_demon',
    name: 'Neon Demon (Frenzy)',
    bpm: 160,
    rootNote: 55, // G minor
    scale: [0, 2, 3, 5, 7, 8, 11], // Harmonic minor
    bassOctave: 1,
    chordProgression: [
      [0, 3, 7], // Gm
      [3, 7, 10], // Bb
      [1, 5, 8], // F#dim
      [-2, 2, 5], // F
    ],
    melodyPattern: [0, 12, 7, 12, 3, 12, 7, 12, 11, 8, 7, 5, 3, 2, 0, 7],
    energy: 'frenzy',
  },
  {
    id: 'pixel_arcade',
    name: 'Pixel Arcade (Chiptune 8-Bit)',
    bpm: 140,
    rootNote: 62, // D Dorian
    scale: [0, 2, 3, 5, 7, 9, 10],
    bassOctave: 2,
    chordProgression: [
      [0, 3, 7], // Dm
      [5, 9, 12], // G
      [8, 12, 15], // Bb
      [3, 7, 10], // F
    ],
    melodyPattern: [7, 9, 10, 12, 10, 9, 7, 5, 7, 10, 12, 14, 12, 10, 7, 9],
    energy: 'high',
  },
];

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

class ArcadeMusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private isPlaying = false;
  private isMuted = false;
  private volume = 0.75;

  private currentPreset: MusicTrackPreset = ARCADE_PRESETS[0];
  private timerId: number | null = null;

  // Sequencer timing
  private current16thStep = 0;
  private nextNoteTime = 0;
  private lookaheadMs = 25;
  private scheduleAheadSec = 0.12;

  // Live beat metrics for visual pulsing
  private beatPulseValue = 0; // decays from 1 to 0 on each quarter note
  private listeners = new Set<(beat: number, pulse: number) => void>();

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      // Master Compressor to give that punchy polished arcade master sound
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.knee.value = 14;
      comp.ratio.value = 5;
      comp.attack.value = 0.003;
      comp.release.value = 0.1;

      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      comp.connect(masterGain);
      masterGain.connect(this.ctx.destination);
      this.masterGain = masterGain;

      // Stem Gains
      const musicGain = this.ctx.createGain();
      musicGain.gain.value = 0.85;
      musicGain.connect(comp);
      this.musicGain = musicGain;

      const sfxGain = this.ctx.createGain();
      sfxGain.gain.value = 0.9;
      sfxGain.connect(comp);
      this.sfxGain = sfxGain;
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.03);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.03);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getBeatPulse(): number {
    return this.beatPulseValue;
  }

  public getPreset(): MusicTrackPreset {
    return this.currentPreset;
  }

  public setPreset(preset: MusicTrackPreset) {
    this.currentPreset = preset;
    if (this.isPlaying) {
      this.restart();
    }
  }

  public start() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.current16thStep = 0;
    this.nextNoteTime = ctx.currentTime + 0.05;

    this.scheduler();
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public restart() {
    this.stop();
    this.start();
  }

  private scheduler = () => {
    if (!this.ctx || !this.isPlaying) return;

    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadSec) {
      this.scheduleStep(this.current16thStep, this.nextNoteTime);
      this.advanceStep();
    }

    // Decay beat pulse
    this.beatPulseValue = Math.max(0, this.beatPulseValue - 0.05);

    this.timerId = window.setTimeout(this.scheduler, this.lookaheadMs);
  };

  private advanceStep() {
    const secondsPerBeat = 60.0 / this.currentPreset.bpm;
    const secondsPer16th = secondsPerBeat / 4.0;
    this.nextNoteTime += secondsPer16th;
    this.current16thStep = (this.current16thStep + 1) % 64; // 4-bar loop (64 steps)
  }

  private scheduleStep(step: number, time: number) {
    if (!this.ctx || !this.musicGain) return;

    const isQuarterBeat = step % 4 === 0;
    const isHalfBeat = step % 2 === 0;
    const barIndex = Math.floor(step / 16);
    const stepInBar = step % 16;

    // 1. Four-on-the-Floor Kick Drum
    if (isQuarterBeat) {
      this.playKick(time);
      this.beatPulseValue = 1.0;
      this.listeners.forEach((fn) => fn(step, 1.0));
    }

    // 2. Snare / Clap on Beats 2 and 4 (steps 4 and 12 in each 16-step bar)
    if (stepInBar === 4 || stepInBar === 12) {
      this.playSnare(time);
    }

    // 3. 16th-note Hi-Hats with accent on offbeats
    this.playHiHat(time, isQuarterBeat ? 0.04 : isHalfBeat ? 0.08 : 0.03);

    // 4. Rolling Pumping Bassline (16th-note electro drive)
    const chord = this.currentPreset.chordProgression[barIndex] || [0];
    const chordRoot = chord[0];
    const bassMidi = this.currentPreset.rootNote + chordRoot - 12 * (this.currentPreset.bassOctave || 2);
    // Don't play bass on the exact kick impact to simulate classic sidechain ducking
    const sidechainDuck = isQuarterBeat ? 0.4 : 1.0;
    this.playBassNote(time, bassMidi, sidechainDuck);

    // 5. Arpeggiated Arcade Lead Synth
    const melodyIndex = stepInBar;
    const noteOffset = this.currentPreset.melodyPattern[melodyIndex];
    if (noteOffset !== undefined) {
      const leadMidi = this.currentPreset.rootNote + noteOffset + 12;
      this.playLeadNote(time, leadMidi);
    }

    // 6. Chord Stabs on accents (steps 0, 3, 6, 10)
    if (stepInBar === 0 || stepInBar === 6 || stepInBar === 10) {
      this.playChordStab(time, chord);
    }
  }

  // --- Procedural Synth Instruments ---

  private playKick(time: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, time);
    osc.frequency.exponentialRampToValueAtTime(32, time + 0.12);

    gain.gain.setValueAtTime(0.65, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  private playSnare(time: number) {
    if (!this.ctx || !this.musicGain) return;

    // Snare tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.1);
    oscGain.gain.setValueAtTime(0.28, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    osc.connect(oscGain);
    oscGain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.11);

    // Snare noise snap
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.15);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.035));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.38, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.musicGain);
    noise.start(time);
  }

  private playHiHat(time: number, vol = 0.05) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.setValueAtTime(8500, time);
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  private playBassNote(time: number, midi: number, duckFactor = 1.0) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(midiToFreq(midi), time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800 * duckFactor, time);
    filter.frequency.exponentialRampToValueAtTime(180, time + 0.09);
    filter.Q.value = 4.0;

    gain.gain.setValueAtTime(0.24 * duckFactor, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.11);
  }

  private playLeadNote(time: number, midi: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.setValueAtTime(midiToFreq(midi), time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, time);
    filter.Q.value = 2.5;

    gain.gain.setValueAtTime(0.16, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.12);
  }

  private playChordStab(time: number, chordOffsets: number[]) {
    if (!this.ctx || !this.musicGain) return;
    chordOffsets.forEach((offset) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(midiToFreq(this.currentPreset.rootNote + offset), time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, time);
      filter.frequency.exponentialRampToValueAtTime(600, time + 0.2);

      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain!);

      osc.start(time);
      osc.stop(time + 0.24);
    });
  }

  // --- Procedural Game Sound Effects ---

  public playJump() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.isMuted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.12);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playPadJump() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.isMuted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.22);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playOrbRing() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.isMuted) return;
    const now = ctx.currentTime;
    [1046.5, 1567.98].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.03);
      gain.gain.setValueAtTime(0.18, now + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.03);
      osc.stop(now + idx * 0.03 + 0.2);
    });
  }

  public playGravityFlip() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.isMuted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.16);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playDeath() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.isMuted) return;
    const now = ctx.currentTime;

    // Low crash
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(140, now);
    sub.frequency.exponentialRampToValueAtTime(24, now + 0.35);
    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + 0.36);

    // Shatter noise
    const bufferSize = Math.floor(ctx.sampleRate * 0.25);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.06));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.25);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
  }

  public playCoin() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.isMuted) return;
    const now = ctx.currentTime;
    [1318.51, 1975.53].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0.25, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.25);
    });
  }

  public playVictory() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.isMuted) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      gain.gain.setValueAtTime(0.2, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.38);
    });
  }

  /**
   * Generates a completely new customized procedural track on the fly!
   */
  public generateTrack(name: string, bpm: number, energy: 'high' | 'ultra' | 'frenzy'): MusicTrackPreset {
    const rootOptions = [55, 57, 60, 62]; // G, A, C, D
    const rootNote = rootOptions[Math.floor(Math.random() * rootOptions.length)];
    const scales = [
      [0, 2, 3, 5, 7, 8, 10], // Natural minor
      [0, 2, 3, 5, 7, 8, 11], // Harmonic minor
      [0, 3, 5, 6, 7, 10], // Blues / Cyber
    ];
    const scale = scales[Math.floor(Math.random() * scales.length)];

    // Generate random 16-step melody locked to the scale
    const melodyPattern: number[] = [];
    for (let i = 0; i < 16; i++) {
      const octaveShift = Math.random() > 0.4 ? 12 : 0;
      const note = scale[Math.floor(Math.random() * scale.length)];
      melodyPattern.push(note + octaveShift);
    }

    const newPreset: MusicTrackPreset = {
      id: `gen_${Date.now()}`,
      name,
      bpm,
      rootNote,
      scale,
      bassOctave: energy === 'frenzy' ? 1 : 2,
      chordProgression: [
        [0, 3, 7],
        [-4, 0, 3],
        [-2, 2, 5],
        [3, 7, 10],
      ],
      melodyPattern,
      energy,
    };

    return newPreset;
  }
}

export const arcadeMusic = new ArcadeMusicEngine();
