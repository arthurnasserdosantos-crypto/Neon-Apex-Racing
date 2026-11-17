// Procedural Web Audio Electric Guitar + Backing Drum & Bass Synthesizer

class GuitarHeroAudioEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private waveshaperCurve: Float32Array<ArrayBuffer> | null = null;
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.noiseBuffer) {
      const len = Math.floor(this.ctx.sampleRate * 0.25);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
    }
    if (!this.waveshaperCurve) {
      const samples = 256;
      const buf = new ArrayBuffer(samples * 4);
      const curve = new Float32Array(buf);
      const drive = 18;
      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        curve[i] = ((3 + drive) * x * 20 * (Math.PI / 180)) / (Math.PI + drive * Math.abs(x));
      }
      this.waveshaperCurve = curve;
    }
    return this.ctx;
  }

  public unlock() {
    this.ensureContext();
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  // Trigger electric guitar lead tone with tube overdrive & amp cabinet filter
  public playGuitarNote(freqHz: number, sustainSec = 0.28, starPower = false) {
    const ctx = this.ensureContext();
    if (!ctx || !this.waveshaperCurve) return;
    const now = ctx.currentTime;
    const dur = Math.max(0.22, Math.min(1.4, sustainSec + 0.18));

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(freqHz, now);
    osc2.frequency.setValueAtTime(freqHz * (starPower ? 2 : 1.004), now); // octave harmonic in Star Power

    const shaper = ctx.createWaveShaper();
    shaper.curve = this.waveshaperCurve;
    shaper.oversample = '2x';

    const cab = ctx.createBiquadFilter();
    cab.type = 'bandpass';
    cab.frequency.setValueAtTime(1450, now);
    cab.Q.setValueAtTime(0.9, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.085, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc1.connect(shaper);
    osc2.connect(shaper);
    shaper.connect(cab);
    cab.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + dur + 0.02);
    osc2.stop(now + dur + 0.02);
  }

  // Play backing drum + bass beat tick synchronized with song grid
  public playBackingBeat(beatIndex: number, rootFreqHz: number) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const stepInBar = beatIndex % 4;

    // Kick on beats 0 and 2
    if (stepInBar === 0 || stepInBar === 2) {
      const kick = ctx.createOscillator();
      const kGain = ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(135, now);
      kick.frequency.exponentialRampToValueAtTime(42, now + 0.11);
      kGain.gain.setValueAtTime(0.24, now);
      kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      kick.connect(kGain);
      kGain.connect(ctx.destination);
      kick.start(now);
      kick.stop(now + 0.15);
    }

    // Snare on beats 1 and 3
    if ((stepInBar === 1 || stepInBar === 3) && this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(950, now);
      const sGain = ctx.createGain();
      sGain.gain.setValueAtTime(0.14, now);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      noise.connect(filter);
      filter.connect(sGain);
      sGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.14);
    }

    // Crisp Hi-hat on every beat
    if (this.noiseBuffer) {
      const hat = ctx.createBufferSource();
      hat.buffer = this.noiseBuffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(6200, now);
      const hGain = ctx.createGain();
      hGain.gain.setValueAtTime(0.055, now);
      hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      hat.connect(hp);
      hp.connect(hGain);
      hGain.connect(ctx.destination);
      hat.start(now);
      hat.stop(now + 0.05);
    }

    // Punchy electric bassline root pulse
    const bass = ctx.createOscillator();
    const bFilter = ctx.createBiquadFilter();
    const bGain = ctx.createGain();
    bass.type = 'triangle';
    bass.frequency.setValueAtTime(rootFreqHz * 0.5, now);
    bFilter.type = 'lowpass';
    bFilter.frequency.setValueAtTime(420, now);
    bGain.gain.setValueAtTime(0.14, now);
    bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    bass.connect(bFilter);
    bFilter.connect(bGain);
    bGain.connect(ctx.destination);
    bass.start(now);
    bass.stop(now + 0.25);
  }

  public playMissClack() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(105, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.09);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playStarPowerActivate() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const t = now + idx * 0.045;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }
}

export const guitarHeroAudio = new GuitarHeroAudioEngine();
