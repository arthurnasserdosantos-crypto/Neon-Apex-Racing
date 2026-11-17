import { getCarDefinition } from './carCatalog';

export interface CarTuningLevels {
  speedLevel: number;    // 1..7 (Engine)
  accelLevel: number;    // 1..7 (Transmission)
  handlingLevel: number; // 1..7 (Suspension & Tires)
}

export const MAX_UPGRADE_STAGE = 7;
/** 0-60 KPH speed threshold in m/s (60 / 3.6) */
export const TARGET_ZERO_TO_SIXTY_MS = 60 / 3.6;

export interface EngineTier {
  level: number;
  label: string;
  topSpeedKph: number;
  maxForwardMs: number;
}

export interface AccelTier {
  level: number;
  label: string;
  zeroToSixtySec: number;
  powerRampRate: number;
}

export interface HandlingTier {
  level: number;
  label: string;
  maxTurnRate: number;
  maxSteerAngle: number;
  steerSpeed: number;
  steerReturnSpeed: number;
  lateralGrip: number;
  gripScore: number;
}

export const ENGINE_TIERS: EngineTier[] = [
  { level: 1, label: 'Stage 1 Stock', topSpeedKph: 100, maxForwardMs: 27.78 },
  { level: 2, label: 'Stage 2 Cold Air', topSpeedKph: 121, maxForwardMs: 33.61 },
  { level: 3, label: 'Stage 3 Forged Turbo', topSpeedKph: 154, maxForwardMs: 42.78 },
  { level: 4, label: 'Stage 4 Twin-Scroll ECU', topSpeedKph: 190, maxForwardMs: 52.78 },
  { level: 5, label: 'Stage 5 Pro Race', topSpeedKph: 235, maxForwardMs: 65.28 },
  { level: 6, label: 'Stage 6 Billet Twin-Turbo', topSpeedKph: 278, maxForwardMs: 77.22 },
  { level: 7, label: 'Stage 7 Apex Overdrive', topSpeedKph: 322, maxForwardMs: 89.44 },
];

export const ACCEL_TIERS: AccelTier[] = [
  { level: 1, label: 'Stage 1 Stock', zeroToSixtySec: 2.00, powerRampRate: 3.5 },
  { level: 2, label: 'Stage 2 Dual Clutch', zeroToSixtySec: 1.65, powerRampRate: 4.5 },
  { level: 3, label: 'Stage 3 Nitro Launch', zeroToSixtySec: 1.32, powerRampRate: 6.2 },
  { level: 4, label: 'Stage 4 Carbon Flywheel', zeroToSixtySec: 1.08, powerRampRate: 8.5 },
  { level: 5, label: 'Stage 5 Race Spec', zeroToSixtySec: 0.88, powerRampRate: 12.0 },
  { level: 6, label: 'Stage 6 Dog-Box Seq.', zeroToSixtySec: 0.72, powerRampRate: 15.5 },
  { level: 7, label: 'Stage 7 Anti-Lag Launch', zeroToSixtySec: 0.58, powerRampRate: 19.5 },
];

export const HANDLING_TIERS: HandlingTier[] = [
  { level: 1, label: 'Stage 1 Stock', maxTurnRate: 1.50, maxSteerAngle: 0.25, steerSpeed: 4.8, steerReturnSpeed: 7.5, lateralGrip: 9.2, gripScore: 56 },
  { level: 2, label: 'Stage 2 Sport Springs', maxTurnRate: 1.72, maxSteerAngle: 0.29, steerSpeed: 5.8, steerReturnSpeed: 8.8, lateralGrip: 11.4, gripScore: 66 },
  { level: 3, label: 'Stage 3 Track Coilovers', maxTurnRate: 1.98, maxSteerAngle: 0.34, steerSpeed: 7.0, steerReturnSpeed: 10.5, lateralGrip: 14.0, gripScore: 76 },
  { level: 4, label: 'Stage 4 Carbon Aero', maxTurnRate: 2.26, maxSteerAngle: 0.40, steerSpeed: 8.4, steerReturnSpeed: 12.5, lateralGrip: 17.0, gripScore: 85 },
  { level: 5, label: 'Stage 5 Apex Slicks', maxTurnRate: 2.55, maxSteerAngle: 0.46, steerSpeed: 10.0, steerReturnSpeed: 15.0, lateralGrip: 20.5, gripScore: 92 },
  { level: 6, label: 'Stage 6 Active Aero', maxTurnRate: 2.84, maxSteerAngle: 0.50, steerSpeed: 11.6, steerReturnSpeed: 17.0, lateralGrip: 24.0, gripScore: 96 },
  { level: 7, label: 'Stage 7 Magnetic Track', maxTurnRate: 3.12, maxSteerAngle: 0.54, steerSpeed: 13.2, steerReturnSpeed: 19.5, lateralGrip: 28.0, gripScore: 100 },
];

export interface ResolvedCarPerformance {
  topSpeedKph: number;
  maxForwardMs: number;
  maxForwardSpeedMs: number;
  maxReverseMs: number;
  maxReverseSpeedMs: number;
  terminalSpeedMs: number;
  engineAccelMs2: number;
  throttleDragPerSec: number;
  zeroToSixtySec: number;
  zeroToSixtyTargetMs: number;
  accelForceMs2: number;
  powerRampRate: number;
  brakeRate: number;
  maxTurnRate: number;
  maxSteerAngle: number;
  steerSpeed: number;
  steerReturnSpeed: number;
  lateralGrip: number;
  gripScore: number;
  driftSlipScale: number;
  engineLabel: string;
  accelLabel: string;
  handlingLabel: string;
  engineTier: EngineTier;
  accelTier: AccelTier;
  handlingTier: HandlingTier;
}

export function clampTierIndex(level: number | undefined): number {
  if (typeof level !== 'number' || Number.isNaN(level)) return 0;
  return Math.max(0, Math.min(MAX_UPGRADE_STAGE - 1, Math.round(level) - 1));
}

export function getCarPerformanceSpecs(
  car: Partial<CarTuningLevels>,
  carId = 'apex_gt',
): ResolvedCarPerformance {
  const engineTier = ENGINE_TIERS[clampTierIndex(car.speedLevel)];
  const accelTier = ACCEL_TIERS[clampTierIndex(car.accelLevel)];
  const handlingTier = HANDLING_TIERS[clampTierIndex(car.handlingLevel)];
  const def = getCarDefinition(carId);
  const mod = def.physics;

  const topSpeedKph = Math.round(engineTier.topSpeedKph + mod.topSpeedBonusKph);
  const maxForwardMs = topSpeedKph / 3.6;

  // Target 0-60 KPH acceleration time scaled by car's launch efficiency
  const zeroToSixtySec = Math.max(
    0.42,
    Number((accelTier.zeroToSixtySec / mod.zeroToSixtyDivisor).toFixed(2)),
  );
  // Solve v(T) = terminalSpeed * (1 - e^(-drag * T)) = TARGET_ZERO_TO_SIXTY_MS
  const terminalSpeedMs = maxForwardMs * 1.08;
  const ratio = Math.min(0.95, TARGET_ZERO_TO_SIXTY_MS / terminalSpeedMs);
  const throttleDragPerSec = -Math.log(1 - ratio) / zeroToSixtySec;
  const engineAccelMs2 = terminalSpeedMs * throttleDragPerSec;

  const maxTurnRate = handlingTier.maxTurnRate * mod.turnRateMultiplier;
  const lateralGrip = handlingTier.lateralGrip + mod.lateralGripBonus;
  const gripScore = Math.min(100, Math.round(handlingTier.gripScore + mod.gripBonus));

  return {
    topSpeedKph,
    maxForwardMs,
    maxForwardSpeedMs: maxForwardMs,
    maxReverseMs: 14.0,
    maxReverseSpeedMs: 14.0,
    terminalSpeedMs,
    engineAccelMs2,
    throttleDragPerSec,
    zeroToSixtySec,
    zeroToSixtyTargetMs: TARGET_ZERO_TO_SIXTY_MS,
    accelForceMs2: engineAccelMs2,
    powerRampRate: accelTier.powerRampRate,
    brakeRate: mod.brakeRate,
    maxTurnRate,
    maxSteerAngle: handlingTier.maxSteerAngle,
    steerSpeed: handlingTier.steerSpeed,
    steerReturnSpeed: handlingTier.steerReturnSpeed,
    lateralGrip,
    gripScore,
    driftSlipScale: mod.driftSlipScale,
    engineLabel: engineTier.label,
    accelLabel: accelTier.label,
    handlingLabel: handlingTier.label,
    engineTier,
    accelTier,
    handlingTier,
  };
}
