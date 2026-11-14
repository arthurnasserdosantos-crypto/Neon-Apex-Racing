export interface CarAcousticProfile {
  engineType: string;
  badge: string;
  acceleration: string;
  braking: string;
  deceleration: string;
}

export interface CarDefinition {
  id: string;
  name: string;
  title: string;
  class: 'SPORTS COUPE' | 'TUNER PRO' | 'EXOTIC V12';
  tagline: string;
  price: number;
  description: string;
  defaultColor: string;
  defaultWheelsColor: string;
  baseSpecs: {
    topSpeedKph: number;
    zeroToSixtySec: number;
    gripScore: number;
    weightKg: number;
  };
  modifiers: {
    speedMult: number;
    accelMult: number;
    turnRateMult: number;
    lateralGripMult: number;
    massKg: number;
  };
  visualBadges: string[];
  acousticProfile: CarAcousticProfile;
}

export const CAR_CATALOG: Record<string, CarDefinition> = {
  apex_gt: {
    id: 'apex_gt',
    name: 'Apex GT-R',
    title: 'APEX GT-R',
    class: 'SPORTS COUPE',
    tagline: 'Balanced street brawler with responsive throttle and predictable rear-wheel balance.',
    price: 0,
    description:
      'The baseline street weapon. Engineered with a balanced 50:50 weight distribution, rock-solid chassis stiffness, and responsive throttle control suitable for high-speed avenues and technical cornering.',
    defaultColor: '#dc2626',
    defaultWheelsColor: '#27272a',
    baseSpecs: {
      topSpeedKph: 100,
      zeroToSixtySec: 2.0,
      gripScore: 60,
      weightKg: 1350,
    },
    modifiers: {
      speedMult: 1.0,
      accelMult: 1.0,
      turnRateMult: 1.0,
      lateralGripMult: 1.0,
      massKg: 1350,
    },
    visualBadges: ['BALANCED CHASSIS', 'AERO DECK', '5-SPOKE RIMS', 'TWIN EXHAUST'],
    acousticProfile: {
      engineType: '3.8L Twin-Turbo V6',
      badge: 'TWIN-TURBO V6',
      acceleration: 'Deep muscular throat with spooling twin turbos and punchy midrange rumble.',
      braking: 'Semi-metallic street compound rotor bite with progressive friction clamp.',
      deceleration: 'Helical transmission whine with rhythmic exhaust overrun burbles and off-throttle pops.',
    },
  },
  shinobi_rx: {
    id: 'shinobi_rx',
    name: 'Shinobi Type-R',
    title: 'SHINOBI TYPE-R',
    class: 'TUNER PRO',
    tagline: 'Lightweight Japanese tuner coupe engineered for razor-sharp apex carving and rapid drift recovery.',
    price: 6500,
    description:
      'Stripped down, stiffened, and precision-tuned. Equipped with dual front bumper canards, aggressive heat-extracting hood louvers, forged magnesium rims, and an elevated GT tuner wing delivering immense downforce and lightning turn-in response.',
    defaultColor: '#059669',
    defaultWheelsColor: '#e4e4e7',
    baseSpecs: {
      topSpeedKph: 98,
      zeroToSixtySec: 1.82,
      gripScore: 76,
      weightKg: 1160,
    },
    modifiers: {
      speedMult: 0.98,
      accelMult: 1.1,
      turnRateMult: 1.18,
      lateralGripMult: 1.2,
      massKg: 1160,
    },
    visualBadges: ['DUAL CANARDS', 'VENTED HOOD', 'HIGH GT WING', 'ULTRA-AGILE'],
    acousticProfile: {
      engineType: '2.0L Turbocharged Screamer (9,000 RPM)',
      badge: '9,000 RPM SCREAMER',
      acceleration: 'High-pitched screaming tuner howl with whistling high-boost turbo rush.',
      braking: 'Slotted carbon-metallic racing pads with piercing track-spec squeal and sharp bite.',
      deceleration: 'Straight-cut dog-box gear whine with rapid firecracker anti-lag backfire crackles.',
    },
  },
  vanguard_v12: {
    id: 'vanguard_v12',
    name: 'Vanguard V12',
    title: 'VANGUARD V12',
    class: 'EXOTIC V12',
    tagline: 'High-displacement exotic hypercar dominating highways and long straights with brutal horsepower.',
    price: 14000,
    description:
      'A menacing carbon-composite exotic packing a naturally aspirated 6.5L V12. Features wide muscular rear haunches, dual engine-deck induction scoops, quad central titanium exhaust pipes, and blistering top-end velocity.',
    defaultColor: '#d97706',
    defaultWheelsColor: '#18181b',
    baseSpecs: {
      topSpeedKph: 120,
      zeroToSixtySec: 1.72,
      gripScore: 56,
      weightKg: 1540,
    },
    modifiers: {
      speedMult: 1.2,
      accelMult: 1.15,
      turnRateMult: 0.92,
      lateralGripMult: 0.94,
      massKg: 1540,
    },
    visualBadges: ['6.5L V12', 'WIDE HAUNCHES', 'QUAD EXHAUST', 'HIGHWAY PREDATOR'],
    acousticProfile: {
      engineType: '6.5L Naturally Aspirated V12',
      badge: 'OPERATIC V12 HYPERCAR',
      acceleration: 'Operatic 12-cylinder tenor scream climbing to an ear-splitting quad-titanium howl.',
      braking: 'Massive 410mm carbon-ceramic heavy air-whoosh with deep caliper compression hum.',
      deceleration: 'Deep atmospheric V12 compression engine-braking roar and menacing hollow thunder.',
    },
  },
};

export const CAR_ORDER: string[] = ['apex_gt', 'shinobi_rx', 'vanguard_v12'];

export function getCarDefinition(carId?: string): CarDefinition {
  if (carId && CAR_CATALOG[carId]) {
    return CAR_CATALOG[carId];
  }
  return CAR_CATALOG.apex_gt;
}
