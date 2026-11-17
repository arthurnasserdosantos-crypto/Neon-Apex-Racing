export interface EngineAudioUpdate {
  active: boolean;
  carId?: string;
  speedKph: number;
  speedRatio: number; // 0..1 of current tier max forward speed
  rpmRatio: number; // 0.12..1.0
  isAccelerating: boolean;
  isDeceleratingCoasting: boolean;
  isBraking: boolean;
  isHandbrake: boolean;
}

export interface CarSoundTuning {
  // Engine & Acceleration
  f0Base: number;
  f0RpmMultiplier: number;
  f0SpeedMultiplier: number;
  subRatio: number;
  mainRatio: number;
  harmRatio: number;
  subGainVal: number;
  mainGainVal: number;
  harmGainVal: number;
  turboWhistleGain: number;
  turboWhistleFreq: number;
  filterBaseIdle: number;
  filterBaseAccel: number;
  filterRpmSpan: number;
  filterQ: number;
  accelGainBase: number;
  accelGainRpm: number;

  // Losing Speed / Coasting Deceleration
  decelWhineBase: number;
  decelWhineSpan: number;
  decelWhineQ: number;
  decelLfoRate: number;
  decelOverrunFilterCut: number;
  decelOverrunQ: number;
  decelStrengthMultiplier: number;

  // Braking
  brakePadFreqBase: number;
  brakePadFreqSpan: number;
  brakePadQ: number;
  brakeSquealFreqBase: number;
  brakeSquealQ: number;
  brakeGainMultiplier: number;
  brakeSquealGainMultiplier: number;
}

export const CAR_SOUND_TUNINGS: Record<string, CarSoundTuning> = {
  // Apex GT-R: Balanced Street Brawler (Twin-Turbo 3.8L V6)
  // Deep, throaty, muscular rumble with audible twin-turbo spool and rhythmic exhaust overrun burbles
  apex_gt: {
    f0Base: 38,
    f0RpmMultiplier: 135,
    f0SpeedMultiplier: 18,
    subRatio: 0.5,
    mainRatio: 1.0,
    harmRatio: 1.503,
    subGainVal: 0.58,
    mainGainVal: 0.45,
    harmGainVal: 0.28,
    turboWhistleGain: 0.09,
    turboWhistleFreq: 1800,
    filterBaseIdle: 240,
    filterBaseAccel: 380,
    filterRpmSpan: 1750,
    filterQ: 2.2,
    accelGainBase: 0.24,
    accelGainRpm: 0.22,
    decelWhineBase: 210,
    decelWhineSpan: 440,
    decelWhineQ: 2.0,
    decelLfoRate: 13, // Rhythmic V6 overrun burble
    decelOverrunFilterCut: 280,
    decelOverrunQ: 3.2,
    decelStrengthMultiplier: 1.0,
    brakePadFreqBase: 880,
    brakePadFreqSpan: 850,
    brakePadQ: 1.6,
    brakeSquealFreqBase: 1950,
    brakeSquealQ: 9.0,
    brakeGainMultiplier: 1.0,
    brakeSquealGainMultiplier: 0.7,
  },

  // Shinobi Type-R: High-RPM Japanese Import Tuner (9,000 RPM Screamer)
  // High-pitched screaming rasp, loud whistling ball-bearing turbo, straight-cut dog-box gear whine,
  // rapid anti-lag firecracker backfires on overrun, and piercing racing ceramic-metallic brake squeal
  shinobi_rx: {
    f0Base: 56,
    f0RpmMultiplier: 225,
    f0SpeedMultiplier: 26,
    subRatio: 0.5,
    mainRatio: 1.0,
    harmRatio: 2.01, // Sharp 4-cylinder high-harmonic overtone rasp
    subGainVal: 0.35,
    mainGainVal: 0.55,
    harmGainVal: 0.42,
    turboWhistleGain: 0.20, // Piercing high-boost turbo spool whine
    turboWhistleFreq: 3200,
    filterBaseIdle: 320,
    filterBaseAccel: 520,
    filterRpmSpan: 2600,
    filterQ: 3.4, // Sharp, biting acoustic resonance
    accelGainBase: 0.27,
    accelGainRpm: 0.28,
    decelWhineBase: 380, // Loud straight-cut dog-box racing gear whine
    decelWhineSpan: 680,
    decelWhineQ: 3.8,
    decelLfoRate: 26, // Rapid anti-lag crackle bursts
    decelOverrunFilterCut: 480,
    decelOverrunQ: 4.8,
    decelStrengthMultiplier: 1.25,
    brakePadFreqBase: 1350, // Sharp slotted racing track pads
    brakePadFreqSpan: 1100,
    brakePadQ: 2.2,
    brakeSquealFreqBase: 3150, // Piercing high-frequency track brake squeal
    brakeSquealQ: 16.0,
    brakeGainMultiplier: 1.15,
    brakeSquealGainMultiplier: 1.35,
  },

  // Vanguard V12: Naturally Aspirated 6.5L Exotic Hypercar
  // Operatic 12-cylinder tenor howl with soaring titanium harmonics, heavy compression engine braking
  // hollow thunder without cheap pops, and massive 410mm carbon-ceramic heavy air whoosh and low resonant hum
  vanguard_v12: {
    f0Base: 30,
    f0RpmMultiplier: 165,
    f0SpeedMultiplier: 24,
    subRatio: 0.5,
    mainRatio: 1.0,
    harmRatio: 3.0, // Rich, operatic 12-cylinder chordal harmonic spacing
    subGainVal: 0.65,
    mainGainVal: 0.40,
    harmGainVal: 0.46,
    turboWhistleGain: 0.0, // Pure naturally aspirated acoustic induction
    turboWhistleFreq: 2200,
    filterBaseIdle: 200,
    filterBaseAccel: 320,
    filterRpmSpan: 3600, // Opens up into a soaring titanium F1 scream
    filterQ: 1.8,
    accelGainBase: 0.26,
    accelGainRpm: 0.25,
    decelWhineBase: 170, // Deep heavy mechanical compression hum
    decelWhineSpan: 320,
    decelWhineQ: 1.6,
    decelLfoRate: 8.5, // Slow, menacing, thunderous V12 rumble
    decelOverrunFilterCut: 220,
    decelOverrunQ: 2.4,
    decelStrengthMultiplier: 0.9,
    brakePadFreqBase: 580, // Massive carbon-ceramic heavy air rush whoosh
    brakePadFreqSpan: 620,
    brakePadQ: 1.2,
    brakeSquealFreqBase: 1380, // Deep resonant carbon-ceramic friction hum
    brakeSquealQ: 4.5,
    brakeGainMultiplier: 1.35,
    brakeSquealGainMultiplier: 0.4,
  },

  // Tempest GT3-R: 4.0L Flat-Plane Crank V8 Homologation Circuit Racer
  // Metallic mechanical rasp, crisp sequential transaxle coasting whine, rapid firecracker GT3 downshift burbles,
  // and biting carbon-steel endurance brake shimmer
  tempest_gt3: {
    f0Base: 48,
    f0RpmMultiplier: 195,
    f0SpeedMultiplier: 22,
    subRatio: 0.5,
    mainRatio: 1.0,
    harmRatio: 2.5, // Snarling flat-plane octave + fifth racing bark
    subGainVal: 0.48,
    mainGainVal: 0.52,
    harmGainVal: 0.38,
    turboWhistleGain: 0.04, // Subtle dry-sump & intake plenum whistle
    turboWhistleFreq: 2650,
    filterBaseIdle: 280,
    filterBaseAccel: 460,
    filterRpmSpan: 2850,
    filterQ: 2.8,
    accelGainBase: 0.28,
    accelGainRpm: 0.25,
    decelWhineBase: 320, // Crisp straight-cut sequential GT3 transaxle whine
    decelWhineSpan: 560,
    decelWhineQ: 3.1,
    decelLfoRate: 19.5, // Punchy GT3 exhaust overrun pops
    decelOverrunFilterCut: 390,
    decelOverrunQ: 4.0,
    decelStrengthMultiplier: 1.18,
    brakePadFreqBase: 1080, // Slotted endurance rotors air bite
    brakePadFreqSpan: 950,
    brakePadQ: 1.9,
    brakeSquealFreqBase: 2580, // Metallic GT3 endurance caliper shimmer
    brakeSquealQ: 13.0,
    brakeGainMultiplier: 1.22,
    brakeSquealGainMultiplier: 1.05,
  },

  // Hyperion LM-X: Twin-Supercharged Le Mans Carbon Hyper-Prototype
  // Intense centrifugal supercharger + hybrid KERS whine on accel, futuristic electric regen coasting howl,
  // and ultra-high-frequency carbon-carbon prototype brake sing
  hyperion_lm: {
    f0Base: 44,
    f0RpmMultiplier: 215,
    f0SpeedMultiplier: 28,
    subRatio: 0.5,
    mainRatio: 1.0,
    harmRatio: 3.01, // Piercing prototype choir + detuned overtone shimmer
    subGainVal: 0.55,
    mainGainVal: 0.44,
    harmGainVal: 0.48,
    turboWhistleGain: 0.26, // Unmistakable twin-supercharger + KERS scream
    turboWhistleFreq: 3850,
    filterBaseIdle: 260,
    filterBaseAccel: 540,
    filterRpmSpan: 3900,
    filterQ: 3.6,
    accelGainBase: 0.29,
    accelGainRpm: 0.30,
    decelWhineBase: 460, // High-pitched hybrid KERS energy recovery coasting turbine
    decelWhineSpan: 820,
    decelWhineQ: 4.2,
    decelLfoRate: 11.0, // Deep ultrasonic prototype compression pulse
    decelOverrunFilterCut: 520,
    decelOverrunQ: 3.6,
    decelStrengthMultiplier: 1.32,
    brakePadFreqBase: 720, // Ground-effect carbon-carbon rotor air vacuum
    brakePadFreqSpan: 1180,
    brakePadQ: 1.5,
    brakeSquealFreqBase: 3420, // Razor-sharp Le Mans carbon-carbon brake howl
    brakeSquealQ: 18.0,
    brakeGainMultiplier: 1.4,
    brakeSquealGainMultiplier: 1.25,
  },
};

function createSoftClipCurve(amount = 1.6): Float32Array<ArrayBuffer> {
  const samples = 1024;
  const buffer = new ArrayBuffer(samples * 4);
  const curve = new Float32Array(buffer);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return curve;
}

function createNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.0526913;
    data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.22;
  }
  return buffer;
}

export type AuditionPhase = 'idle' | 'accel' | 'decel' | 'brake';
export type AuditionCallback = (
  isAuditioning: boolean,
  progress: number,
  phase: AuditionPhase,
  carId: string,
) => void;

class EngineAudioController {
  private ctx: AudioContext | null = null;
  private initialized = false;
  private muted = false;
  private masterVolume = 0.75;
  private currentCarId = 'apex_gt';

  private masterGain: GainNode | null = null;

  // Layer 1: Engine / Acceleration synthesis
  private engineSubOsc: OscillatorNode | null = null;
  private engineMainOsc: OscillatorNode | null = null;
  private engineHarmOsc: OscillatorNode | null = null;
  private subGain: GainNode | null = null;
  private mainGain: GainNode | null = null;
  private harmGain: GainNode | null = null;
  private turboWhistleOsc: OscillatorNode | null = null;
  private turboWhistleFilter: BiquadFilterNode | null = null;
  private turboWhistleGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private shiftCutGain: GainNode | null = null;
  private engineGain: GainNode | null = null;

  // Layer 2: Coasting deceleration (transmission whine + exhaust overrun burble / crackle)
  private decelWhineOsc: OscillatorNode | null = null;
  private decelWhineFilter: BiquadFilterNode | null = null;
  private decelOverrunFilter: BiquadFilterNode | null = null;
  private decelOverrunModGain: GainNode | null = null;
  private decelPulseLfo: OscillatorNode | null = null;
  private decelGain: GainNode | null = null;

  // Layer 3: Dedicated Brake friction & squeal
  private brakePadFilter: BiquadFilterNode | null = null;
  private brakeSquealFilter: BiquadFilterNode | null = null;
  private brakeGain: GainNode | null = null;
  private brakeSquealGain: GainNode | null = null;

  // Audition state
  private auditionTimer: number | null = null;
  private isAuditioningActive = false;
  private auditionCarId = 'apex_gt';
  private auditionListeners: Set<AuditionCallback> = new Set();

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }

    if (!this.initialized && this.ctx) {
      this.buildGraph(this.ctx);
      this.initialized = true;
    }

    return this.ctx;
  }

  private buildGraph(ctx: AudioContext) {
    const now = ctx.currentTime;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.12;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.muted ? 0 : this.masterVolume, now);
    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);
    this.masterGain = masterGain;

    // --- Layer 1: Continuous Engine / Acceleration Synth ---
    const tuning = this.getTuning(this.currentCarId);

    const engineSubOsc = ctx.createOscillator();
    engineSubOsc.type = 'triangle';
    engineSubOsc.frequency.setValueAtTime(tuning.f0Base * tuning.subRatio, now);

    const engineMainOsc = ctx.createOscillator();
    engineMainOsc.type = 'sawtooth';
    engineMainOsc.frequency.setValueAtTime(tuning.f0Base * tuning.mainRatio, now);

    const engineHarmOsc = ctx.createOscillator();
    engineHarmOsc.type = 'sawtooth';
    engineHarmOsc.frequency.setValueAtTime(tuning.f0Base * tuning.harmRatio, now);

    const subGain = ctx.createGain();
    subGain.gain.value = tuning.subGainVal;
    const mainGain = ctx.createGain();
    mainGain.gain.value = tuning.mainGainVal;
    const harmGain = ctx.createGain();
    harmGain.gain.value = tuning.harmGainVal;

    // Dedicated high-frequency Turbo Spool Whistle layer
    const turboWhistleOsc = ctx.createOscillator();
    turboWhistleOsc.type = 'sine';
    turboWhistleOsc.frequency.setValueAtTime(tuning.turboWhistleFreq, now);

    const turboWhistleFilter = ctx.createBiquadFilter();
    turboWhistleFilter.type = 'bandpass';
    turboWhistleFilter.frequency.setValueAtTime(tuning.turboWhistleFreq, now);
    turboWhistleFilter.Q.setValueAtTime(3.5, now);

    const turboWhistleGain = ctx.createGain();
    turboWhistleGain.gain.setValueAtTime(0, now);

    turboWhistleOsc.connect(turboWhistleFilter);
    turboWhistleFilter.connect(turboWhistleGain);
    turboWhistleGain.connect(compressor);

    const shaper = ctx.createWaveShaper();
    shaper.curve = createSoftClipCurve(1.65);
    shaper.oversample = '2x';

    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.setValueAtTime(tuning.filterBaseIdle, now);
    engineFilter.Q.setValueAtTime(tuning.filterQ, now);

    const shiftCutGain = ctx.createGain();
    shiftCutGain.gain.setValueAtTime(1.0, now);

    const engineGain = ctx.createGain();
    engineGain.gain.setValueAtTime(0, now);

    engineSubOsc.connect(subGain);
    engineMainOsc.connect(mainGain);
    engineHarmOsc.connect(harmGain);

    subGain.connect(shaper);
    mainGain.connect(shaper);
    harmGain.connect(shaper);

    shaper.connect(engineFilter);
    engineFilter.connect(shiftCutGain);
    shiftCutGain.connect(engineGain);
    engineGain.connect(compressor);

    engineSubOsc.start(now);
    engineMainOsc.start(now);
    engineHarmOsc.start(now);
    turboWhistleOsc.start(now);

    this.engineSubOsc = engineSubOsc;
    this.engineMainOsc = engineMainOsc;
    this.engineHarmOsc = engineHarmOsc;
    this.subGain = subGain;
    this.mainGain = mainGain;
    this.harmGain = harmGain;
    this.turboWhistleOsc = turboWhistleOsc;
    this.turboWhistleFilter = turboWhistleFilter;
    this.turboWhistleGain = turboWhistleGain;
    this.engineFilter = engineFilter;
    this.shiftCutGain = shiftCutGain;
    this.engineGain = engineGain;

    // Shared noise buffer for overrun burble & brake friction
    const noiseBuffer = createNoiseBuffer(ctx, 2);

    // --- Layer 2: Distinct Coasting Deceleration Sound ---
    const decelWhineOsc = ctx.createOscillator();
    decelWhineOsc.type = 'triangle';
    decelWhineOsc.frequency.setValueAtTime(tuning.decelWhineBase, now);

    const decelWhineFilter = ctx.createBiquadFilter();
    decelWhineFilter.type = 'bandpass';
    decelWhineFilter.frequency.setValueAtTime(tuning.decelWhineBase * 1.2, now);
    decelWhineFilter.Q.setValueAtTime(tuning.decelWhineQ, now);

    const decelWhineGain = ctx.createGain();
    decelWhineGain.gain.value = 0.45;

    const decelNoise = ctx.createBufferSource();
    decelNoise.buffer = noiseBuffer;
    decelNoise.loop = true;

    const decelOverrunFilter = ctx.createBiquadFilter();
    decelOverrunFilter.type = 'lowpass';
    decelOverrunFilter.frequency.setValueAtTime(tuning.decelOverrunFilterCut, now);
    decelOverrunFilter.Q.setValueAtTime(tuning.decelOverrunQ, now);

    const decelOverrunModGain = ctx.createGain();
    decelOverrunModGain.gain.setValueAtTime(0.65, now);

    const decelPulseLfo = ctx.createOscillator();
    decelPulseLfo.type = 'sine';
    decelPulseLfo.frequency.setValueAtTime(tuning.decelLfoRate, now);
    const decelLfoDepth = ctx.createGain();
    decelLfoDepth.gain.value = 0.35;
    decelPulseLfo.connect(decelLfoDepth);
    decelLfoDepth.connect(decelOverrunModGain.gain);

    const decelGain = ctx.createGain();
    decelGain.gain.setValueAtTime(0, now);

    decelWhineOsc.connect(decelWhineFilter);
    decelWhineFilter.connect(decelWhineGain);
    decelWhineGain.connect(decelGain);

    decelNoise.connect(decelOverrunFilter);
    decelOverrunFilter.connect(decelOverrunModGain);
    decelOverrunModGain.connect(decelGain);

    decelGain.connect(compressor);

    decelWhineOsc.start(now);
    decelNoise.start(now);
    decelPulseLfo.start(now);

    this.decelWhineOsc = decelWhineOsc;
    this.decelWhineFilter = decelWhineFilter;
    this.decelOverrunFilter = decelOverrunFilter;
    this.decelOverrunModGain = decelOverrunModGain;
    this.decelPulseLfo = decelPulseLfo;
    this.decelGain = decelGain;

    // --- Layer 3: Dedicated Brake Friction & Squeal ---
    const brakeNoise = ctx.createBufferSource();
    brakeNoise.buffer = noiseBuffer;
    brakeNoise.loop = true;

    const brakePadFilter = ctx.createBiquadFilter();
    brakePadFilter.type = 'bandpass';
    brakePadFilter.frequency.setValueAtTime(tuning.brakePadFreqBase, now);
    brakePadFilter.Q.setValueAtTime(tuning.brakePadQ, now);

    const brakeGain = ctx.createGain();
    brakeGain.gain.setValueAtTime(0, now);

    const brakeSquealFilter = ctx.createBiquadFilter();
    brakeSquealFilter.type = 'bandpass';
    brakeSquealFilter.frequency.setValueAtTime(tuning.brakeSquealFreqBase, now);
    brakeSquealFilter.Q.setValueAtTime(tuning.brakeSquealQ, now);

    const brakeSquealGain = ctx.createGain();
    brakeSquealGain.gain.setValueAtTime(0, now);

    brakeNoise.connect(brakePadFilter);
    brakePadFilter.connect(brakeGain);
    brakeGain.connect(compressor);

    brakeNoise.connect(brakeSquealFilter);
    brakeSquealFilter.connect(brakeSquealGain);
    brakeSquealGain.connect(compressor);

    brakeNoise.start(now);

    this.brakePadFilter = brakePadFilter;
    this.brakeSquealFilter = brakeSquealFilter;
    this.brakeGain = brakeGain;
    this.brakeSquealGain = brakeSquealGain;
  }

  public getTuning(carId?: string): CarSoundTuning {
    if (carId && CAR_SOUND_TUNINGS[carId]) {
      return CAR_SOUND_TUNINGS[carId];
    }
    return CAR_SOUND_TUNINGS.apex_gt;
  }

  public setCarProfile(carId: string) {
    if (this.currentCarId === carId && this.initialized) return;
    this.currentCarId = carId;
    if (!this.ctx || !this.initialized) return;

    const tuning = this.getTuning(carId);
    const now = this.ctx.currentTime;

    // Apply oscillator harmonic weights
    this.subGain?.gain.setTargetAtTime(tuning.subGainVal, now, 0.04);
    this.mainGain?.gain.setTargetAtTime(tuning.mainGainVal, now, 0.04);
    this.harmGain?.gain.setTargetAtTime(tuning.harmGainVal, now, 0.04);

    // Apply filter resonance
    this.engineFilter?.Q.setTargetAtTime(tuning.filterQ, now, 0.04);

    // Apply decel overrun LFO rate
    this.decelPulseLfo?.frequency.setTargetAtTime(tuning.decelLfoRate, now, 0.04);
    this.decelWhineFilter?.Q.setTargetAtTime(tuning.decelWhineQ, now, 0.04);
    this.decelOverrunFilter?.Q.setTargetAtTime(tuning.decelOverrunQ, now, 0.04);

    // Apply brake filter properties
    this.brakePadFilter?.Q.setTargetAtTime(tuning.brakePadQ, now, 0.04);
    this.brakeSquealFilter?.Q.setTargetAtTime(tuning.brakeSquealQ, now, 0.04);
  }

  public getCarProfile(): string {
    return this.currentCarId;
  }

  public unlock() {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain && !this.muted) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.03);
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        muted ? 0 : this.masterVolume,
        this.ctx.currentTime,
        0.03,
      );
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public playUiHover() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running' || !this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.025);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  public playUiClick() {
    this.unlock();
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    if (ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.042);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.046);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playCountdownTone(step: 3 | 2 | 1 | 0) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    if (ctx.state !== 'running') return;

    const now = ctx.currentTime;
    if (step === 0) {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(880, now);
      osc2.frequency.setValueAtTime(1320, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2800, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.38);
      osc2.stop(now + 0.38);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.18);
    }
  }

  public triggerGearShift(direction: 'up' | 'down') {
    if (!this.ctx || !this.initialized || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    if (direction === 'up') {
      if (this.shiftCutGain) {
        this.shiftCutGain.gain.cancelScheduledValues(now);
        this.shiftCutGain.gain.setValueAtTime(this.shiftCutGain.gain.value, now);
        this.shiftCutGain.gain.linearRampToValueAtTime(0.32, now + 0.022);
        this.shiftCutGain.gain.linearRampToValueAtTime(1.0, now + 0.085);
      }
      if (this.masterGain) {
        const thumpOsc = this.ctx.createOscillator();
        const thumpGain = this.ctx.createGain();
        thumpOsc.type = 'triangle';
        thumpOsc.frequency.setValueAtTime(105, now);
        thumpOsc.frequency.exponentialRampToValueAtTime(42, now + 0.075);
        thumpGain.gain.setValueAtTime(0.14, now);
        thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        thumpOsc.connect(thumpGain);
        thumpGain.connect(this.masterGain);
        thumpOsc.start(now);
        thumpOsc.stop(now + 0.09);
      }
    } else {
      if (this.shiftCutGain) {
        this.shiftCutGain.gain.cancelScheduledValues(now);
        this.shiftCutGain.gain.setValueAtTime(1.0, now);
        this.shiftCutGain.gain.linearRampToValueAtTime(1.32, now + 0.03);
        this.shiftCutGain.gain.linearRampToValueAtTime(1.0, now + 0.11);
      }
      if (this.engineFilter) {
        const cur = this.engineFilter.frequency.value;
        this.engineFilter.frequency.cancelScheduledValues(now);
        this.engineFilter.frequency.setValueAtTime(cur, now);
        this.engineFilter.frequency.linearRampToValueAtTime(Math.min(2800, cur + 520), now + 0.035);
      }
    }
  }

  /**
   * Main per-frame physics audio update loop.
   * Dynamically modulates acceleration roar, coasting decel whine & overrun, and braking pad squeal
   * based on the vehicle's specific acoustic profile.
   */
  public update(state: EngineAudioUpdate) {
    if (!state.active) {
      if (!this.isAuditioningActive) {
        this.stopAll();
      }
      return;
    }

    // Do not override audition sequence if an audition is actively running
    if (this.isAuditioningActive) return;

    if (state.carId && state.carId !== this.currentCarId) {
      this.setCarProfile(state.carId);
    }

    const ctx = this.ctx;
    if (!ctx || !this.initialized) return;

    if (ctx.state === 'suspended' && (state.isAccelerating || state.isBraking)) {
      void ctx.resume();
    }
    if (ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const tuning = this.getTuning(this.currentCarId);
    const rpm = Math.max(0.12, Math.min(1.0, state.rpmRatio));
    const speedRatio = Math.max(0, Math.min(1.0, state.speedRatio));

    // 1. Acceleration / Engine frequencies tuned to specific car profile
    const f0 = tuning.f0Base + Math.pow(rpm, 1.15) * tuning.f0RpmMultiplier + speedRatio * tuning.f0SpeedMultiplier;
    this.engineSubOsc?.frequency.setTargetAtTime(f0 * tuning.subRatio, now, 0.03);
    this.engineMainOsc?.frequency.setTargetAtTime(f0 * tuning.mainRatio, now, 0.03);
    this.engineHarmOsc?.frequency.setTargetAtTime(f0 * tuning.harmRatio, now, 0.03);

    // Filter opens with vehicle throttle and RPM
    const filterCutoff = state.isAccelerating
      ? tuning.filterBaseAccel + rpm * tuning.filterRpmSpan + speedRatio * 320
      : tuning.filterBaseIdle + rpm * (tuning.filterRpmSpan * 0.35);
    this.engineFilter?.frequency.setTargetAtTime(filterCutoff, now, 0.045);

    // Continuous engine loop gain
    let targetEngineGain = 0.045; // idle purr
    if (state.isAccelerating) {
      targetEngineGain = tuning.accelGainBase + rpm * tuning.accelGainRpm;
    } else if (state.isBraking) {
      targetEngineGain = 0.035 + rpm * 0.04;
    } else if (state.isDeceleratingCoasting) {
      targetEngineGain = 0.06 + rpm * 0.06;
    } else if (state.speedKph > 2) {
      targetEngineGain = 0.09 + rpm * 0.08;
    }
    this.engineGain?.gain.setTargetAtTime(targetEngineGain, now, 0.04);

    // Turbo spool whistle layer (Shinobi Type-R & Apex GT-R)
    if (tuning.turboWhistleGain > 0) {
      const targetWhistleGain = state.isAccelerating ? tuning.turboWhistleGain * Math.pow(rpm, 1.2) : 0;
      const whistleFreq = tuning.turboWhistleFreq + rpm * 1200 + speedRatio * 300;
      this.turboWhistleOsc?.frequency.setTargetAtTime(whistleFreq, now, 0.04);
      this.turboWhistleFilter?.frequency.setTargetAtTime(whistleFreq, now, 0.04);
      this.turboWhistleGain?.gain.setTargetAtTime(targetWhistleGain, now, 0.05);
    } else {
      this.turboWhistleGain?.gain.setTargetAtTime(0, now, 0.04);
    }

    // 2. Distinct Coasting Deceleration Layer (when losing speed without braking)
    if (state.isDeceleratingCoasting && state.speedKph > 3) {
      const decelStrength = Math.min(1, 0.25 + speedRatio * 0.85) * tuning.decelStrengthMultiplier;
      const whineFreq = tuning.decelWhineBase + speedRatio * tuning.decelWhineSpan + rpm * 140;
      this.decelWhineOsc?.frequency.setTargetAtTime(whineFreq, now, 0.05);
      this.decelWhineFilter?.frequency.setTargetAtTime(whineFreq * 1.15, now, 0.05);
      this.decelOverrunFilter?.frequency.setTargetAtTime(
        tuning.decelOverrunFilterCut + rpm * 280,
        now,
        0.05,
      );
      this.decelGain?.gain.setTargetAtTime(0.24 * decelStrength, now, 0.06);
    } else {
      this.decelGain?.gain.setTargetAtTime(0, now, 0.06);
    }

    // 3. Dedicated Brake Friction & Squeal Layer (when brakes are actively applied)
    if (state.isBraking && state.speedKph > 2) {
      const brakeIntensity = Math.min(1, 0.2 + speedRatio * 0.9) * tuning.brakeGainMultiplier;
      const padFreq =
        tuning.brakePadFreqBase + speedRatio * tuning.brakePadFreqSpan + (state.isHandbrake ? 350 : 0);
      const squealFreq =
        tuning.brakeSquealFreqBase + speedRatio * 550 + (state.isHandbrake ? 450 : 0);
      this.brakePadFilter?.frequency.setTargetAtTime(padFreq, now, 0.04);
      this.brakeSquealFilter?.frequency.setTargetAtTime(squealFreq, now, 0.04);
      this.brakeGain?.gain.setTargetAtTime(0.28 * brakeIntensity, now, 0.035);
      this.brakeSquealGain?.gain.setTargetAtTime(
        (state.isHandbrake ? 0.16 : 0.1) * brakeIntensity * tuning.brakeSquealGainMultiplier,
        now,
        0.045,
      );
    } else {
      this.brakeGain?.gain.setTargetAtTime(0, now, 0.04);
      this.brakeSquealGain?.gain.setTargetAtTime(0, now, 0.04);
    }
  }

  /**
   * Interactive Sound Audition for Car Lot & Showroom.
   * Plays a 2.6-second realistic audition sequence:
   * 0.0s - 0.3s: Idle engine note
   * 0.3s - 1.3s: Acceleration throttle rev (building RPM, turbo spool, harmonics)
   * 1.3s - 1.9s: Throttle lift & deceleration coasting overrun (transmission whine + burble/crackles)
   * 1.9s - 2.5s: Heavy braking friction clamp & pad squeal/whoosh, coming to a standstill
   * 2.5s - 2.6s: Return to quiet idle
   */
  public auditionCar(carId: string) {
    this.unlock();
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    this.stopAudition();
    this.isAuditioningActive = true;
    this.auditionCarId = carId;
    this.setCarProfile(carId);

    const startTime = performance.now();
    const duration = 2600; // 2.6s

    const notify = (isAuditioning: boolean, progress: number, phase: AuditionPhase) => {
      this.auditionListeners.forEach((fn) => fn(isAuditioning, progress, phase, carId));
    };

    const step = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      let phase: AuditionPhase = 'idle';
      let rpm = 0.18;
      let isAccelerating = false;
      let isDecel = false;
      let isBrake = false;
      let speedKph = 0;
      let speedRatio = 0;

      if (progress < 0.12) {
        // Phase 1: Idle warm-up
        phase = 'idle';
        rpm = 0.18 + Math.sin(progress * 40) * 0.02;
        speedKph = 0;
      } else if (progress < 0.52) {
        // Phase 2: Acceleration Rev-up (0.12 to 0.52)
        phase = 'accel';
        isAccelerating = true;
        const norm = (progress - 0.12) / 0.4;
        rpm = 0.2 + Math.pow(norm, 1.4) * 0.78; // up to 0.98
        speedKph = norm * 95;
        speedRatio = norm * 0.65;
      } else if (progress < 0.75) {
        // Phase 3: Deceleration & Exhaust Overrun (0.52 to 0.75)
        phase = 'decel';
        isDecel = true;
        const norm = (progress - 0.52) / 0.23;
        rpm = Math.max(0.25, 0.92 - norm * 0.62);
        speedKph = Math.max(20, 95 - norm * 35);
        speedRatio = speedKph / 140;
      } else if (progress < 0.96) {
        // Phase 4: Heavy Brake Application & Pad Squeal (0.75 to 0.96)
        phase = 'brake';
        isBrake = true;
        const norm = (progress - 0.75) / 0.21;
        rpm = Math.max(0.14, 0.3 - norm * 0.16);
        speedKph = Math.max(0, 60 * (1 - norm));
        speedRatio = speedKph / 140;
      } else {
        // Phase 5: Fade to idle
        phase = 'idle';
        rpm = 0.14;
        speedKph = 0;
      }

      this.executeAuditionFrame(rpm, speedKph, speedRatio, isAccelerating, isDecel, isBrake);
      notify(true, progress, phase);

      if (progress < 1 && this.isAuditioningActive) {
        this.auditionTimer = window.requestAnimationFrame(step);
      } else {
        this.stopAudition();
      }
    };

    this.auditionTimer = window.requestAnimationFrame(step);
  }

  private executeAuditionFrame(
    rpm: number,
    speedKph: number,
    speedRatio: number,
    isAccelerating: boolean,
    isDecel: boolean,
    isBrake: boolean,
  ) {
    const ctx = this.ctx;
    if (!ctx || !this.initialized || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const tuning = this.getTuning(this.auditionCarId);

    // Engine Oscillators
    const f0 = tuning.f0Base + Math.pow(rpm, 1.15) * tuning.f0RpmMultiplier + speedRatio * tuning.f0SpeedMultiplier;
    this.engineSubOsc?.frequency.setTargetAtTime(f0 * tuning.subRatio, now, 0.03);
    this.engineMainOsc?.frequency.setTargetAtTime(f0 * tuning.mainRatio, now, 0.03);
    this.engineHarmOsc?.frequency.setTargetAtTime(f0 * tuning.harmRatio, now, 0.03);

    const filterCutoff = isAccelerating
      ? tuning.filterBaseAccel + rpm * tuning.filterRpmSpan
      : tuning.filterBaseIdle + rpm * (tuning.filterRpmSpan * 0.35);
    this.engineFilter?.frequency.setTargetAtTime(filterCutoff, now, 0.04);

    const targetGain = isAccelerating
      ? tuning.accelGainBase + rpm * tuning.accelGainRpm
      : isDecel
      ? 0.08 + rpm * 0.08
      : isBrake
      ? 0.04
      : 0.05;
    this.engineGain?.gain.setTargetAtTime(targetGain, now, 0.04);

    // Turbo Spool Whistle
    if (tuning.turboWhistleGain > 0) {
      const targetWhistleGain = isAccelerating ? tuning.turboWhistleGain * Math.pow(rpm, 1.25) : 0;
      const whistleFreq = tuning.turboWhistleFreq + rpm * 1200;
      this.turboWhistleOsc?.frequency.setTargetAtTime(whistleFreq, now, 0.04);
      this.turboWhistleFilter?.frequency.setTargetAtTime(whistleFreq, now, 0.04);
      this.turboWhistleGain?.gain.setTargetAtTime(targetWhistleGain, now, 0.04);
    } else {
      this.turboWhistleGain?.gain.setTargetAtTime(0, now, 0.04);
    }

    // Deceleration Whine & Overrun
    if (isDecel) {
      const whineFreq = tuning.decelWhineBase + speedRatio * tuning.decelWhineSpan + rpm * 140;
      this.decelWhineOsc?.frequency.setTargetAtTime(whineFreq, now, 0.04);
      this.decelWhineFilter?.frequency.setTargetAtTime(whineFreq * 1.15, now, 0.04);
      this.decelOverrunFilter?.frequency.setTargetAtTime(tuning.decelOverrunFilterCut + rpm * 280, now, 0.04);
      this.decelGain?.gain.setTargetAtTime(0.26 * tuning.decelStrengthMultiplier, now, 0.04);
    } else {
      this.decelGain?.gain.setTargetAtTime(0, now, 0.04);
    }

    // Braking Friction & Squeal
    if (isBrake) {
      const padFreq = tuning.brakePadFreqBase + speedRatio * tuning.brakePadFreqSpan;
      const squealFreq = tuning.brakeSquealFreqBase + speedRatio * 550;
      this.brakePadFilter?.frequency.setTargetAtTime(padFreq, now, 0.035);
      this.brakeSquealFilter?.frequency.setTargetAtTime(squealFreq, now, 0.035);
      this.brakeGain?.gain.setTargetAtTime(0.3 * tuning.brakeGainMultiplier, now, 0.03);
      this.brakeSquealGain?.gain.setTargetAtTime(
        0.14 * tuning.brakeSquealGainMultiplier,
        now,
        0.035,
      );
    } else {
      this.brakeGain?.gain.setTargetAtTime(0, now, 0.04);
      this.brakeSquealGain?.gain.setTargetAtTime(0, now, 0.04);
    }
  }

  public stopAudition() {
    if (this.auditionTimer !== null) {
      window.cancelAnimationFrame(this.auditionTimer);
      this.auditionTimer = null;
    }
    this.isAuditioningActive = false;
    this.stopAll();
    this.auditionListeners.forEach((fn) => fn(false, 0, 'idle', this.auditionCarId));
  }

  public isAuditioning(): boolean {
    return this.isAuditioningActive;
  }

  public subscribeAudition(cb: AuditionCallback): () => void {
    this.auditionListeners.add(cb);
    return () => this.auditionListeners.delete(cb);
  }

  public stopAll() {
    if (!this.ctx || !this.initialized) return;
    const now = this.ctx.currentTime;
    this.engineGain?.gain.setTargetAtTime(0, now, 0.05);
    this.decelGain?.gain.setTargetAtTime(0, now, 0.05);
    this.brakeGain?.gain.setTargetAtTime(0, now, 0.05);
    this.brakeSquealGain?.gain.setTargetAtTime(0, now, 0.05);
    this.turboWhistleGain?.gain.setTargetAtTime(0, now, 0.05);
  }
}

export const engineAudio = new EngineAudioController();
