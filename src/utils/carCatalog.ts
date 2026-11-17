export interface CarPhysicsModifiers {
  /** Additive top speed offset in KPH on top of the Engine Stage tier */
  topSpeedBonusKph: number;
  /** Divisor applied to the Acceleration Stage 0-60 time (> 1 = faster launch) */
  zeroToSixtyDivisor: number;
  /** Additive percentage points to displayed Grip Score (clamped 0..100) */
  gripBonus: number;
  /** Extra lateral grip m/s^2 scaling */
  lateralGripBonus: number;
  /** Steering turn-rate multiplier */
  turnRateMultiplier: number;
  /** Curb weight in kg (affects momentum & feel) */
  weightKg: number;
  /** Braking deceleration m/s^2 */
  brakeRate: number;
  /** Drifting sideways slip dampening factor (higher = wider/looser tail, lower = sharper grip) */
  driftSlipScale: number;
}

export interface CarAcousticProfile {
  badge: string;
  engineType: string;
  acceleration: string;
  deceleration: string;
  braking: string;
}

export interface CarDefinition {
  id: string;
  name: string;
  title: string;
  class: 'SPORTS COUPE' | 'TUNER PRO' | 'EXOTIC V12' | 'TRACK GT3' | 'HYPER PROTOTYPE';
  price: number;
  description: string;
  tagline: string;
  defaultColor: string;
  defaultWheelsColor: string;
  defaultVinyl: 'none' | 'stripes' | 'flames';
  visualBadges: string[];
  acousticProfile: CarAcousticProfile;
  baseSpecs: {
    weightKg: number;
  };
  specsLabel: {
    engine: string;
    drivetrain: string;
    weightKg: number;
  };
  physics: CarPhysicsModifiers;
}

export const CAR_CATALOG: Record<string, CarDefinition> = {
  apex_gt: {
    id: 'apex_gt',
    name: 'Apex GT',
    title: '3.2L Twin-Turbo Coupe',
    class: 'SPORTS COUPE',
    price: 0,
    description:
      'Balanced twin-turbo V6 street coupe. Predictable chassis geometry ideal for technical hairpins and urban sprints.',
    tagline: 'Twin-Turbo V6 · Balanced Chassis',
    defaultColor: '#f97316',
    defaultWheelsColor: '#e4e4e7',
    defaultVinyl: 'stripes',
    visualBadges: ['Twin-Turbo V6', 'Carbon Splitter', 'Quad Chrome Tips'],
    acousticProfile: {
      badge: 'V6 TWIN-TURBO',
      engineType: '3.2L Twin-Turbo V6 Street Brawler',
      acceleration: 'Deep muscular baritone growl with progressive twin-turbo whistle climb.',
      deceleration: 'Warm, rhythmic overrun exhaust burbles on lift-off coasting.',
      braking: 'Street-performance ventilated disc hiss with mild metallic pad bite.',
    },
    baseSpecs: { weightKg: 1340 },
    specsLabel: {
      engine: '3.2L V6 Twin-Turbo',
      drivetrain: 'RWD / 6-Speed',
      weightKg: 1340,
    },
    physics: {
      topSpeedBonusKph: 0,
      zeroToSixtyDivisor: 1.0,
      gripBonus: 0,
      lateralGripBonus: 0,
      turnRateMultiplier: 1.0,
      weightKg: 1340,
      brakeRate: 36,
      driftSlipScale: 1.0,
    },
  },
  shinobi_rx: {
    id: 'shinobi_rx',
    name: 'Shinobi RX',
    title: '9,000 RPM Rotary AWD',
    class: 'TUNER PRO',
    price: 7500,
    description:
      'Featherweight carbon-hooded AWD street weapon. Razor-sharp turn-in, monstrous corner exit, and aggressive high-downforce aero.',
    tagline: 'High-Rev Rotary AWD · Corner Carver',
    defaultColor: '#0ea5e9',
    defaultWheelsColor: '#facc15',
    defaultVinyl: 'flames',
    visualBadges: ['9,000 RPM Rotary', 'Dive Canards', 'Elevated GT Wing', 'Hood Louvers'],
    acousticProfile: {
      badge: 'ROTARY + ANTI-LAG',
      engineType: '2.6L Triple-Rotor + Ball-Bearing Turbo',
      acceleration: 'Piercing high-RPM rotary scream paired with loud whistle boost.',
      deceleration: 'Straight-cut dog-box whine with sharp anti-lag exhaust crackles.',
      braking: 'Aggressive slotted racing pads producing high-frequency track squeal.',
    },
    baseSpecs: { weightKg: 1160 },
    specsLabel: {
      engine: '2.6L Triple-Rotor Turbo',
      drivetrain: 'AWD / 6-Speed Seq.',
      weightKg: 1160,
    },
    physics: {
      topSpeedBonusKph: 4,
      zeroToSixtyDivisor: 1.12,
      gripBonus: 5,
      lateralGripBonus: 2.5,
      turnRateMultiplier: 1.09,
      weightKg: 1160,
      brakeRate: 41,
      driftSlipScale: 0.92,
    },
  },
  vanguard_v12: {
    id: 'vanguard_v12',
    name: 'Vanguard V12',
    title: '6.5L NA Mid-Engine V12',
    class: 'EXOTIC V12',
    price: 15000,
    description:
      'Mid-engine hyper-exotic built for Blacklist domination. Screaming naturally-aspirated V12 power with blistering terminal velocity.',
    tagline: '6.5L Mid-V12 · Blacklist Interceptor',
    defaultColor: '#e4e4e7',
    defaultWheelsColor: '#f97316',
    defaultVinyl: 'stripes',
    visualBadges: ['6.5L NA V12', 'Deck Scoops', 'Central Titanium Quad', 'Wide Haunches'],
    acousticProfile: {
      badge: 'NA 6.5L V12',
      engineType: '6.5L Naturally Aspirated V12 Exotic',
      acceleration: 'Operatic 12-cylinder F1 tenor howl building into titanium harmonics.',
      deceleration: 'Deep heavy compression thunder without cheap pop tune.',
      braking: 'Massive 410mm carbon-ceramic heavy air rush and deep resonant hum.',
    },
    baseSpecs: { weightKg: 1290 },
    specsLabel: {
      engine: '6.5L NA V12 Exotic',
      drivetrain: 'RWD / 7-Speed DCT',
      weightKg: 1290,
    },
    physics: {
      topSpeedBonusKph: 14,
      zeroToSixtyDivisor: 1.18,
      gripBonus: 3,
      lateralGripBonus: 1.5,
      turnRateMultiplier: 1.04,
      weightKg: 1290,
      brakeRate: 42,
      driftSlipScale: 1.05,
    },
  },
  tempest_gt3: {
    id: 'tempest_gt3',
    name: 'Tempest GT3-R',
    title: '4.0L Flat-Plane GT3 V8',
    class: 'TRACK GT3',
    price: 22500,
    description:
      'Homologated flat-plane V8 circuit predator with swan-neck GT3 downforce, titanium exhausts, and ferocious mid-corner bite.',
    tagline: '4.0L Flat-Plane V8 · Swan-Neck GT3',
    defaultColor: '#10b981',
    defaultWheelsColor: '#18181b',
    defaultVinyl: 'stripes',
    visualBadges: ['Flat-Plane V8', 'GT3 Swan Wing', 'Fender Louvers', 'Rocker Blades'],
    acousticProfile: {
      badge: 'GT3 FLAT-PLANE V8',
      engineType: '4.0L Flat-Plane Crank Endurance V8',
      acceleration: 'Snarling metallic race bark with crisp octave & fifth overtones.',
      deceleration: 'Sharp sequential transaxle gear whine and punchy GT3 downshift barks.',
      braking: 'Biting carbon-steel endurance rotors with metallic caliper shimmer.',
    },
    baseSpecs: { weightKg: 1110 },
    specsLabel: {
      engine: '4.0L Flat-Plane V8',
      drivetrain: 'RWD / 6-Speed Paddles',
      weightKg: 1110,
    },
    physics: {
      topSpeedBonusKph: 18,
      zeroToSixtyDivisor: 1.24,
      gripBonus: 7,
      lateralGripBonus: 3.4,
      turnRateMultiplier: 1.13,
      weightKg: 1110,
      brakeRate: 46,
      driftSlipScale: 0.87,
    },
  },
  hyperion_lm: {
    id: 'hyperion_lm',
    name: 'Hyperion LM-X',
    title: 'Twin-Charged Le Mans Prototype',
    class: 'HYPER PROTOTYPE',
    price: 36000,
    description:
      'Twin-supercharged Le Mans carbon prototype with dorsal shark-fin aero, hybrid boost, and unmatched triple-digit top-end dominance.',
    tagline: 'Twin-Charged Prototype · Apex Predator',
    defaultColor: '#a855f7',
    defaultWheelsColor: '#e4e4e7',
    defaultVinyl: 'flames',
    visualBadges: ['Twin-Charged V10', 'Roof Snorkel', 'Dorsal Shark Fin', 'Plasma Exhaust'],
    acousticProfile: {
      badge: 'PROTOTYPE HYBRID',
      engineType: '5.2L Twin-Supercharged V10 + KERS',
      acceleration: 'Soaring prototype howl crowned by intense supercharger & turbine whine.',
      deceleration: 'High-pitched hybrid KERS energy recovery whine and compression pulse.',
      braking: 'Carbon-carbon prototype rotors with razor-sharp Le Mans brake sing.',
    },
    baseSpecs: { weightKg: 1050 },
    specsLabel: {
      engine: '5.2L Twin-Charged V10 Hybrid',
      drivetrain: 'AWD / 7-Speed Titanium',
      weightKg: 1050,
    },
    physics: {
      topSpeedBonusKph: 26,
      zeroToSixtyDivisor: 1.32,
      gripBonus: 8,
      lateralGripBonus: 4.0,
      turnRateMultiplier: 1.11,
      weightKg: 1050,
      brakeRate: 50,
      driftSlipScale: 0.84,
    },
  },
};

export const CAR_ORDER: string[] = [
  'apex_gt',
  'shinobi_rx',
  'vanguard_v12',
  'tempest_gt3',
  'hyperion_lm',
];

export function getCarDefinition(carId: string): CarDefinition {
  if (carId && CAR_CATALOG[carId]) {
    return CAR_CATALOG[carId];
  }
  return CAR_CATALOG.apex_gt;
}
