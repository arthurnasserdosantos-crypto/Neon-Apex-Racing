export const TARGET_ZERO_TO_SIXTY_KPH = 60;
export const TARGET_ZERO_TO_SIXTY_MS = TARGET_ZERO_TO_SIXTY_KPH / 3.6; // ~16.6667 m/s

export interface EngineTierSpec {
  level: number;
  label: string;
  topSpeedKph: number;
}

export interface AccelTierSpec {
  level: number;
  label: string;
  zeroToSixtySec: number;
}

export interface HandlingTierSpec {
  level: number;
  label: string;
  maxTurnRate: number;
  maxSteerAngle: number;
  steerSpeed: number;
  steerReturnSpeed: number;
  lateralGrip: number;
  gripScore: number;
}

export const ENGINE_TIERS: readonly EngineTierSpec[] = [
  { level: 1, label: 'Street Spec', topSpeedKph: 100 },
  { level: 2, label: 'Sport Tune', topSpeedKph: 121 },
  { level: 3, label: 'Track Spec', topSpeedKph: 154 },
  { level: 4, label: 'Supercharged', topSpeedKph: 190 },
  { level: 5, label: 'Apex Hyper', topSpeedKph: 250 },
] as const;

export const ACCEL_TIERS: readonly AccelTierSpec[] = [
  { level: 1, label: '5-Speed Street', zeroToSixtySec: 2.0 },
  { level: 2, label: 'Close-Ratio Sport', zeroToSixtySec: 1.65 },
  { level: 3, label: 'Sequential Track', zeroToSixtySec: 1.3 },
  { level: 4, label: 'Dual-Clutch Pro', zeroToSixtySec: 1.05 },
  { level: 5, label: 'Launch-Control Spec', zeroToSixtySec: 0.8 },
] as const;

export const HANDLING_TIERS: readonly HandlingTierSpec[] = [
  { level: 1, label: 'Street Dampers', maxTurnRate: 1.55, maxSteerAngle: 0.28, steerSpeed: 5.5, steerReturnSpeed: 8.5, lateralGrip: 10.4, gripScore: 60 },
  { level: 2, label: 'Sport Springs', maxTurnRate: 1.75, maxSteerAngle: 0.30, steerSpeed: 6.0, steerReturnSpeed: 9.0, lateralGrip: 11.8, gripScore: 70 },
  { level: 3, label: 'Coilover Track', maxTurnRate: 1.95, maxSteerAngle: 0.32, steerSpeed: 6.5, steerReturnSpeed: 9.5, lateralGrip: 13.2, gripScore: 80 },
  { level: 4, label: 'Aero Downforce', maxTurnRate: 2.15, maxSteerAngle: 0.34, steerSpeed: 7.0, steerReturnSpeed: 10.0, lateralGrip: 14.6, gripScore: 90 },
  { level: 5, label: 'Active GT Chassis', maxTurnRate: 2.35, maxSteerAngle: 0.36, steerSpeed: 7.5, steerReturnSpeed: 10.5, lateralGrip: 16.0, gripScore: 100 },
] as const;

function clampTierIndex(level: number): number {
  return Math.max(0, Math.min(4, Math.round(level) - 1));
}

export interface CarPerformanceSpecs {
  engineTier: EngineTierSpec;
  accelTier: AccelTierSpec;
  handlingTier: HandlingTierSpec;
  topSpeedKph: number;
  maxForwardSpeedMs: number;
  maxReverseSpeedMs: number;
  zeroToSixtySec: number;
  terminalSpeedMs: number;
  engineAccelMs2: number;
  throttleDragPerSec: number;
  maxTurnRate: number;
  maxSteerAngle: number;
  steerSpeed: number;
  steerReturnSpeed: number;
  lateralGrip: number;
  gripScore: number;
}

import { getCarDefinition } from './carCatalog';

/**
 * Computes exact, framerate-independent physics constants from Garage upgrade tiers
 * and vehicle chassis modifiers.
 * Solving dv/dt = engineAccelMs2 - throttleDragPerSec * v from v(0)=0 gives
 * v(t) = terminalSpeedMs * (1 - exp(-throttleDragPerSec * t)), which hits
 * 60 km/h (16.6667 m/s) at precisely zeroToSixtySec and climbs smoothly to maxForwardSpeedMs.
 */
export function getCarPerformanceSpecs(
  car: {
    speedLevel: number;
    accelLevel: number;
    handlingLevel: number;
  },
  carId?: string,
): CarPerformanceSpecs {
  const def = getCarDefinition(carId);
  const engineTier = ENGINE_TIERS[clampTierIndex(car.speedLevel)];
  const accelTier = ACCEL_TIERS[clampTierIndex(car.accelLevel)];
  const handlingTier = HANDLING_TIERS[clampTierIndex(car.handlingLevel)];

  const topSpeedKph = Math.round(engineTier.topSpeedKph * def.modifiers.speedMult);
  const maxForwardSpeedMs = topSpeedKph / 3.6;
  const terminalSpeedMs = maxForwardSpeedMs * 1.15;
  const zeroToSixtySec = Math.max(0.65, accelTier.zeroToSixtySec / def.modifiers.accelMult);

  const engineAccelMs2 =
    -(terminalSpeedMs / zeroToSixtySec) *
    Math.log(1 - TARGET_ZERO_TO_SIXTY_MS / terminalSpeedMs);
  const throttleDragPerSec = engineAccelMs2 / terminalSpeedMs;

  const maxTurnRate = handlingTier.maxTurnRate * def.modifiers.turnRateMult;
  const lateralGrip = handlingTier.lateralGrip * def.modifiers.lateralGripMult;
  const gripScore = Math.min(100, Math.round(handlingTier.gripScore * def.modifiers.lateralGripMult));

  return {
    engineTier,
    accelTier,
    handlingTier,
    topSpeedKph,
    maxForwardSpeedMs,
    maxReverseSpeedMs: 14,
    zeroToSixtySec,
    terminalSpeedMs,
    engineAccelMs2,
    throttleDragPerSec,
    maxTurnRate,
    maxSteerAngle: handlingTier.maxSteerAngle,
    steerSpeed: handlingTier.steerSpeed * (def.modifiers.turnRateMult > 1 ? 1.1 : 0.95),
    steerReturnSpeed: handlingTier.steerReturnSpeed,
    lateralGrip,
    gripScore,
  };
}

