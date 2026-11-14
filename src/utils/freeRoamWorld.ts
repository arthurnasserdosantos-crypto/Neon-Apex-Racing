export const FREE_ROAM_BOUNDS = {
  minX: -280,
  maxX: 280,
  minZ: -280,
  maxZ: 280,
  width: 560,
  depth: 560,
  centerX: 0,
  centerZ: 0,
} as const;

export interface CityBuilding {
  id: string;
  x: number;
  z: number;
  size: [number, number, number]; // [width, height, depth]
  type: 'skyscraper' | 'warehouse' | 'residential' | 'commercial' | 'garage_hq' | 'dealership';
  color: string;
  accentColor: string;
  windowColor?: string;
  roofDetails?: boolean;
}

export interface WorldBeacon {
  id: string;
  type: 'GARAGE' | 'CAR_LOT' | 'RACE';
  name: string;
  trackId?: string;
  x: number;
  z: number;
  radius: number;
  color: string;
  glowColor: string;
  tag: string;
}

export interface StreetLight {
  x: number;
  z: number;
  rotationY: number;
}

// Landmark Locations: Central Garage at (0, 0), Car Lot at (-76, 0), and 11 Race Events
export const FREE_ROAM_BEACONS: WorldBeacon[] = [
  {
    id: 'beacon-garage',
    type: 'GARAGE',
    name: 'Downtown Central Garage',
    x: 0,
    z: 0,
    radius: 8.5,
    color: '#FF9900',
    glowColor: '#FF9900',
    tag: 'TUNING & VISUALS',
  },
  {
    id: 'beacon-car-lot',
    type: 'CAR_LOT',
    name: 'Apex Dealership & Car Lot',
    x: -76,
    z: 0,
    radius: 9.0,
    color: '#00B0FF',
    glowColor: '#00B0FF',
    tag: 'VEHICLE SHOWROOM',
  },
  // Act 1 Race Events
  {
    id: 'beacon-act1-r1',
    type: 'RACE',
    name: 'Waterfront Dash',
    trackId: 'act1-r1',
    x: 0,
    z: 75,
    radius: 7.5,
    color: '#FF9900',
    glowColor: '#FF9900',
    tag: 'ACT I · RACE 1',
  },
  {
    id: 'beacon-act1-r2',
    type: 'RACE',
    name: 'Industrial Drag',
    trackId: 'act1-r2',
    x: 75,
    z: 120,
    radius: 7.5,
    color: '#FF9900',
    glowColor: '#FF9900',
    tag: 'ACT I · RACE 2',
  },
  {
    id: 'beacon-act1-r3',
    type: 'RACE',
    name: 'Neon Circuit',
    trackId: 'act1-r3',
    x: -120,
    z: -75,
    radius: 7.5,
    color: '#FF9900',
    glowColor: '#FF9900',
    tag: 'ACT I · RACE 3',
  },
  {
    id: 'beacon-act1-r4',
    type: 'RACE',
    name: 'Downtown Sprint',
    trackId: 'act1-r4',
    x: -75,
    z: -120,
    radius: 7.5,
    color: '#FF9900',
    glowColor: '#FF9900',
    tag: 'ACT I · RACE 4',
  },
  {
    id: 'beacon-act1-boss',
    type: 'RACE',
    name: "Razor's Challenge (Boss 1)",
    trackId: 'act1-boss',
    x: 0,
    z: -180,
    radius: 8.5,
    color: '#ef4444',
    glowColor: '#f97316',
    tag: 'BOSS BATTLE 1',
  },
  // Act 2 Race Events
  {
    id: 'beacon-act2-r1',
    type: 'RACE',
    name: 'Expressway GP',
    trackId: 'act2-r1',
    x: 120,
    z: -75,
    radius: 7.5,
    color: '#FF9900',
    glowColor: '#FF9900',
    tag: 'ACT II · RACE 1',
  },
  {
    id: 'beacon-act2-r2',
    type: 'RACE',
    name: 'Portside Drift',
    trackId: 'act2-r2',
    x: 180,
    z: 120,
    radius: 7.5,
    color: '#FF9900',
    glowColor: '#FF9900',
    tag: 'ACT II · RACE 2',
  },
  {
    id: 'beacon-act2-r3',
    type: 'RACE',
    name: 'Midnight Loop',
    trackId: 'act2-r3',
    x: -180,
    z: -120,
    radius: 7.5,
    color: '#FF9900',
    glowColor: '#FF9900',
    tag: 'ACT II · RACE 3',
  },
  {
    id: 'beacon-act2-r4',
    type: 'RACE',
    name: 'Skyline Rush',
    trackId: 'act2-r4',
    x: 120,
    z: 180,
    radius: 7.5,
    color: '#FF9900',
    glowColor: '#FF9900',
    tag: 'ACT II · RACE 4',
  },
  {
    id: 'beacon-act2-r5',
    type: 'RACE',
    name: 'Industrial Apex',
    trackId: 'act2-r5',
    x: -180,
    z: 120,
    radius: 7.5,
    color: '#FF9900',
    glowColor: '#FF9900',
    tag: 'ACT II · RACE 5',
  },
  {
    id: 'beacon-act2-boss',
    type: 'RACE',
    name: 'Apex King (Final Boss)',
    trackId: 'act2-boss',
    x: 0,
    z: 210,
    radius: 9.0,
    color: '#dc2626',
    glowColor: '#f59e0b',
    tag: 'FINAL BOSS SHOWDOWN',
  },
];

// Central Garage Landmark Building
export const GARAGE_BUILDING: CityBuilding = {
  id: 'building-central-garage',
  x: 24,
  z: 0,
  size: [24, 8, 20],
  type: 'garage_hq',
  color: '#1a1d24',
  accentColor: '#FF9900',
  windowColor: '#ffb347',
  roofDetails: true,
};

// Car Lot / Dealership Landmark Building & Showroom
export const DEALERSHIP_BUILDING: CityBuilding = {
  id: 'building-car-lot-dealership',
  x: -100,
  z: 0,
  size: [26, 7.5, 22],
  type: 'dealership',
  color: '#181b22',
  accentColor: '#00B0FF',
  windowColor: '#38bdf8',
  roofDetails: true,
};

// Comprehensive Urban City Buildings (Skyscrapers, Warehouses, Residential Condos, Retail)
export const FREE_ROAM_BUILDINGS: CityBuilding[] = [
  GARAGE_BUILDING,
  DEALERSHIP_BUILDING,

  // --- Downtown NW Core (High-Rise Commercial Towers) ---
  { id: 'b-dnw-1', x: -55, z: -55, size: [28, 48, 28], type: 'skyscraper', color: '#1e242f', accentColor: '#38bdf8', windowColor: '#7dd3fc', roofDetails: true },
  { id: 'b-dnw-2', x: -55, z: -88, size: [24, 38, 22], type: 'commercial', color: '#181c24', accentColor: '#f59e0b', windowColor: '#fde047', roofDetails: true },
  { id: 'b-dnw-3', x: -88, z: -55, size: [24, 34, 24], type: 'commercial', color: '#222834', accentColor: '#0ea5e9', windowColor: '#bae6fd' },

  // --- Downtown NE Core (Skyscrapers & Apex Financial) ---
  { id: 'b-dne-1', x: 55, z: -55, size: [30, 56, 30], type: 'skyscraper', color: '#1c212a', accentColor: '#ff9900', windowColor: '#fef08a', roofDetails: true },
  { id: 'b-dne-2', x: 55, z: -88, size: [24, 42, 22], type: 'skyscraper', color: '#252b36', accentColor: '#3b82f6', windowColor: '#93c5fd' },
  { id: 'b-dne-3', x: 88, z: -55, size: [22, 36, 24], type: 'commercial', color: '#1e2430', accentColor: '#10b981', windowColor: '#a7f3d0' },

  // --- Downtown SW (Plaza & Retail Center) ---
  { id: 'b-dsw-1', x: -55, z: 55, size: [26, 26, 26], type: 'commercial', color: '#222631', accentColor: '#f97316', windowColor: '#fed7aa' },
  { id: 'b-dsw-2', x: -55, z: 88, size: [24, 22, 22], type: 'commercial', color: '#1c1f26', accentColor: '#00b0ff', windowColor: '#bae6fd' },
  { id: 'b-dsw-3', x: -88, z: 55, size: [24, 24, 24], type: 'commercial', color: '#262b36', accentColor: '#fbbf24', windowColor: '#fef08a' },

  // --- Downtown SE (Metro Plaza) ---
  { id: 'b-dse-1', x: 55, z: 55, size: [28, 30, 28], type: 'commercial', color: '#20242d', accentColor: '#ef4444', windowColor: '#fca5a5' },
  { id: 'b-dse-2', x: 55, z: 88, size: [24, 24, 22], type: 'commercial', color: '#1a1d24', accentColor: '#ff9900', windowColor: '#fed7aa' },
  { id: 'b-dse-3', x: 88, z: 55, size: [24, 28, 24], type: 'skyscraper', color: '#242a35', accentColor: '#38bdf8', windowColor: '#7dd3fc' },

  // --- North Commercial & Skyline District (z: -140 to -220) ---
  { id: 'b-n-1', x: -60, z: -175, size: [32, 52, 26], type: 'skyscraper', color: '#1b2029', accentColor: '#ff9900', windowColor: '#fef08a', roofDetails: true },
  { id: 'b-n-2', x: 60, z: -175, size: [32, 54, 26], type: 'skyscraper', color: '#1e2531', accentColor: '#00b0ff', windowColor: '#7dd3fc', roofDetails: true },
  { id: 'b-n-3', x: -175, z: -60, size: [26, 32, 30], type: 'commercial', color: '#212630', accentColor: '#10b981', windowColor: '#6ee7b7' },
  { id: 'b-n-4', x: -175, z: -175, size: [34, 46, 34], type: 'skyscraper', color: '#1c222b', accentColor: '#f59e0b', windowColor: '#fef08a', roofDetails: true },
  { id: 'b-n-5', x: 175, z: -60, size: [28, 38, 28], type: 'skyscraper', color: '#202733', accentColor: '#3b82f6', windowColor: '#bfdbfe' },
  { id: 'b-n-6', x: 175, z: -175, size: [34, 58, 34], type: 'skyscraper', color: '#181e26', accentColor: '#ff9900', windowColor: '#fed7aa', roofDetails: true },

  // --- South Industrial & Logistics District (z: 140 to 220) ---
  { id: 'b-s-1', x: -60, z: 175, size: [36, 11, 26], type: 'warehouse', color: '#2c323c', accentColor: '#f97316', roofDetails: true },
  { id: 'b-s-2', x: 60, z: 175, size: [36, 12, 26], type: 'warehouse', color: '#282d37', accentColor: '#eab308', roofDetails: true },
  { id: 'b-s-3', x: -175, z: 175, size: [42, 10, 36], type: 'warehouse', color: '#262a33', accentColor: '#38bdf8' },
  { id: 'b-s-4', x: 175, z: 175, size: [40, 11, 36], type: 'warehouse', color: '#2e333e', accentColor: '#ff9900' },
  { id: 'b-s-5', x: -175, z: 60, size: [32, 12, 28], type: 'warehouse', color: '#272b34', accentColor: '#ef4444' },

  // --- East Residential / Condo District (x: 140 to 220) ---
  { id: 'b-e-1', x: 175, z: 0, size: [24, 18, 32], type: 'residential', color: '#242831', accentColor: '#10b981', windowColor: '#fef3c7' },
  { id: 'b-e-2', x: 175, z: 60, size: [26, 16, 26], type: 'residential', color: '#272c36', accentColor: '#f59e0b', windowColor: '#fef3c7' },
  { id: 'b-e-3', x: 175, z: -115, size: [28, 20, 24], type: 'residential', color: '#222630', accentColor: '#38bdf8', windowColor: '#fef3c7' },

  // --- West Car Row & Marina Commercial (x: -140 to -220) ---
  { id: 'b-w-1', x: -175, z: 0, size: [28, 14, 30], type: 'commercial', color: '#1e222a', accentColor: '#00b0ff', windowColor: '#bae6fd' },
  { id: 'b-w-2', x: -175, z: -115, size: [26, 22, 26], type: 'commercial', color: '#232832', accentColor: '#f97316', windowColor: '#fed7aa' },
];

// Streetlights along main avenues and boulevards
export const STREETLIGHT_POLES: StreetLight[] = [
  // Along Grand North-South Boulevard (x = ±10, z from -230 to 230)
  ...Array.from({ length: 16 }).map((_, i) => ({
    x: -9.5,
    z: -225 + i * 30,
    rotationY: Math.PI / 2,
  })),
  ...Array.from({ length: 16 }).map((_, i) => ({
    x: 9.5,
    z: -225 + i * 30,
    rotationY: -Math.PI / 2,
  })),
  // Along Central Cross Avenue (z = ±10, x from -230 to 230)
  ...Array.from({ length: 16 }).map((_, i) => ({
    x: -225 + i * 30,
    z: -9.5,
    rotationY: 0,
  })),
  ...Array.from({ length: 16 }).map((_, i) => ({
    x: -225 + i * 30,
    z: 9.5,
    rotationY: Math.PI,
  })),
];

// Slalom pylons in the central test plaza for drifting practice
export interface SlalomPylon {
  x: number;
  z: number;
}

export const FREE_ROAM_PYLONS: SlalomPylon[] = Array.from({ length: 8 }).map((_, i) => ({
  x: i % 2 === 0 ? -3.5 : 3.5,
  z: -24 - i * 14,
}));

export interface CarTelemetry {
  x: number;
  y: number;
  z: number;
  fx: number;
  fz: number;
  headingRad: number;
  speedKph: number;
  forwardSpeed: number;
  isBraking: boolean;
  isDrifting: boolean;
  gear: string;
  rpmRatio: number;
  zeroToSixtySplitSec: number | null;
}

export const carTelemetry: CarTelemetry = {
  x: 0,
  y: 0,
  z: 0,
  fx: 0,
  fz: -1,
  headingRad: 0,
  speedKph: 0,
  forwardSpeed: 0,
  isBraking: false,
  isDrifting: false,
  gear: 'N',
  rpmRatio: 0.12,
  zeroToSixtySplitSec: null,
};

export function resetCarTelemetry() {
  carTelemetry.x = 0;
  carTelemetry.y = 0;
  carTelemetry.z = 0;
  carTelemetry.fx = 0;
  carTelemetry.fz = -1;
  carTelemetry.headingRad = 0;
  carTelemetry.speedKph = 0;
  carTelemetry.forwardSpeed = 0;
  carTelemetry.isBraking = false;
  carTelemetry.isDrifting = false;
  carTelemetry.gear = 'N';
  carTelemetry.rpmRatio = 0.12;
  carTelemetry.zeroToSixtySplitSec = null;
}

export interface BotLiveTelemetry {
  id: string;
  name: string;
  color: string;
  x: number;
  z: number;
  headingRad: number;
  speedKph: number;
  vx: number;
  vz: number;
  bumpOffset: number;
  bumpVel: number;
  speedRecoil: number;
  lap: number;
  progressMeters: number;
  finished: boolean;
}

export interface RaceLiveTelemetry {
  playerLap: number;
  totalLaps: number;
  playerProgressMeters: number;
  totalRaceMeters: number;
  placement: number;
  activeBotCount: number;
  bots: [BotLiveTelemetry, BotLiveTelemetry];
}

export const raceTelemetry: RaceLiveTelemetry = {
  playerLap: 1,
  totalLaps: 1,
  playerProgressMeters: 0,
  totalRaceMeters: 500,
  placement: 3,
  activeBotCount: 2,
  bots: [
    {
      id: 'ai-1',
      name: 'Cobalt Apex',
      color: '#2563eb',
      x: -2.8,
      z: -6,
      headingRad: 0,
      speedKph: 0,
      vx: 0,
      vz: 0,
      bumpOffset: 0,
      bumpVel: 0,
      speedRecoil: 0,
      lap: 1,
      progressMeters: 6,
      finished: false,
    },
    {
      id: 'ai-2',
      name: 'Emerald GT',
      color: '#059669',
      x: 2.8,
      z: -11,
      headingRad: 0,
      speedKph: 0,
      vx: 0,
      vz: 0,
      bumpOffset: 0,
      bumpVel: 0,
      speedRecoil: 0,
      lap: 1,
      progressMeters: 11,
      finished: false,
    },
  ],
};

export function resetRaceTelemetry(
  totalLaps = 1,
  totalRaceMeters = 500,
  isBoss = false,
  bossName = 'Boss Rival',
  bossColor = '#ef4444',
) {
  raceTelemetry.playerLap = 1;
  raceTelemetry.totalLaps = totalLaps;
  raceTelemetry.playerProgressMeters = 0;
  raceTelemetry.totalRaceMeters = totalRaceMeters;
  raceTelemetry.activeBotCount = isBoss ? 1 : 2;
  raceTelemetry.placement = isBoss ? 2 : 3;

  raceTelemetry.bots[0].name = isBoss ? bossName : 'Cobalt Apex';
  raceTelemetry.bots[0].color = isBoss ? bossColor : '#2563eb';
  raceTelemetry.bots[0].x = -2.8;
  raceTelemetry.bots[0].z = -6;
  raceTelemetry.bots[0].headingRad = 0;
  raceTelemetry.bots[0].speedKph = 0;
  raceTelemetry.bots[0].vx = 0;
  raceTelemetry.bots[0].vz = 0;
  raceTelemetry.bots[0].bumpOffset = 0;
  raceTelemetry.bots[0].bumpVel = 0;
  raceTelemetry.bots[0].speedRecoil = 0;
  raceTelemetry.bots[0].lap = 1;
  raceTelemetry.bots[0].progressMeters = 6.5;
  raceTelemetry.bots[0].finished = false;

  raceTelemetry.bots[1].name = 'Emerald GT';
  raceTelemetry.bots[1].color = '#059669';
  raceTelemetry.bots[1].x = 2.8;
  raceTelemetry.bots[1].z = -11;
  raceTelemetry.bots[1].headingRad = 0;
  raceTelemetry.bots[1].speedKph = 0;
  raceTelemetry.bots[1].vx = 0;
  raceTelemetry.bots[1].vz = 0;
  raceTelemetry.bots[1].bumpOffset = 0;
  raceTelemetry.bots[1].bumpVel = 0;
  raceTelemetry.bots[1].speedRecoil = 0;
  raceTelemetry.bots[1].lap = 1;
  raceTelemetry.bots[1].progressMeters = isBoss ? -9999 : 12;
  raceTelemetry.bots[1].finished = isBoss;
}

/**
 * Checks if the player car at (px, pz) is within any active Free Roam beacon trigger zone
 */
export function getActiveWorldBeacon(px: number, pz: number): WorldBeacon | null {
  for (let i = 0; i < FREE_ROAM_BEACONS.length; i++) {
    const b = FREE_ROAM_BEACONS[i];
    const dx = px - b.x;
    const dz = pz - b.z;
    if (dx * dx + dz * dz <= b.radius * b.radius) {
      return b;
    }
  }
  return null;
}
