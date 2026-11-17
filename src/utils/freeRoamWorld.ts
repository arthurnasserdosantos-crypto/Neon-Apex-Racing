export const FREE_ROAM_BOUNDS = {
  minX: -560,
  maxX: 560,
  minZ: -560,
  maxZ: 560,
  width: 1120,
  depth: 1120,
  centerX: 0,
  centerZ: 0,
} as const;

export interface RoadSegment {
  axis: 'x' | 'z';
  coord: number; // z for 'x'-running road, x for 'z'-running road
  width: number;
  length: number;
  isHighway?: boolean;
}

// Road centers: -480, -300, -140, 0, +140, +300, +480
export const FREE_ROAM_ROAD_COORDS = [-480, -300, -140, 0, 140, 300, 480] as const;

export const FREE_ROAM_ROADS: RoadSegment[] = [
  // Grand Central Cross Boulevards
  { axis: 'z', coord: 0, width: 18, length: 978, isHighway: true },
  { axis: 'x', coord: 0, width: 18, length: 978, isHighway: true },
  // Inner District Avenues
  { axis: 'z', coord: -140, width: 14, length: 978 },
  { axis: 'z', coord: 140, width: 14, length: 978 },
  { axis: 'x', coord: -140, width: 14, length: 978 },
  { axis: 'x', coord: 140, width: 14, length: 978 },
  // Outer Suburban & Industrial Boulevards
  { axis: 'z', coord: -300, width: 14, length: 978 },
  { axis: 'z', coord: 300, width: 14, length: 978 },
  { axis: 'x', coord: -300, width: 14, length: 978 },
  { axis: 'x', coord: 300, width: 14, length: 978 },
  // Perimeter Expressway Loop
  { axis: 'z', coord: -480, width: 18, length: 978, isHighway: true },
  { axis: 'z', coord: 480, width: 18, length: 978, isHighway: true },
  { axis: 'x', coord: -480, width: 18, length: 978, isHighway: true },
  { axis: 'x', coord: 480, width: 18, length: 978, isHighway: true },
];

export interface CityBlockPad {
  x: number;
  z: number;
  w: number;
  d: number;
  kind: 'concrete' | 'grass' | 'industrial';
}

// 6x6 grid of city blocks neatly framed inside the 7x7 road network
const BLOCK_SPANS: Array<{ min: number; max: number }> = [
  { min: -469, max: -309 }, // Outer West/North
  { min: -291, max: -149 }, // Mid West/North
  { min: -131, max: -11 },  // Inner West/North
  { min: 11, max: 131 },    // Inner East/South
  { min: 149, max: 291 },   // Mid East/South
  { min: 309, max: 469 },   // Outer East/South
];

export const FREE_ROAM_CITY_BLOCKS: CityBlockPad[] = (() => {
  const blocks: CityBlockPad[] = [];
  for (let gx = 0; gx < BLOCK_SPANS.length; gx++) {
    for (let gz = 0; gz < BLOCK_SPANS.length; gz++) {
      const sx = BLOCK_SPANS[gx];
      const sz = BLOCK_SPANS[gz];
      const x = (sx.min + sx.max) / 2;
      const z = (sz.min + sz.max) / 2;
      const w = sx.max - sx.min;
      const d = sz.max - sz.min;

      // Determine district ground style
      let kind: CityBlockPad['kind'] = 'concrete';
      // NW & NE outer/mid blocks + East residential estates = grass suburban lawns
      if (
        (gz <= 1 && (gx <= 1 || gx >= 4)) ||
        (gx === 4 && gz >= 2 && gz <= 3) ||
        (gx === 5 && gz >= 2 && gz <= 3) ||
        (gx === 2 && gz === 1) // Central North Park
      ) {
        kind = 'grass';
      } else if (gz >= 4 || (gx <= 1 && gz >= 3)) {
        kind = 'industrial';
      }

      blocks.push({ x, z, w, d, kind });
    }
  }
  return blocks;
})();

export interface CityBuilding {
  id: string;
  x: number;
  z: number;
  size: [number, number, number]; // [width, height, depth]
  type:
    | 'skyscraper'
    | 'warehouse'
    | 'residential'
    | 'house'
    | 'commercial'
    | 'garage_hq'
    | 'dealership'
    | 'gas_station';
  color: string;
  accentColor: string;
  roofColor?: string;
  windowColor?: string;
  roofDetails?: boolean;
  facing?: 'N' | 'S' | 'E' | 'W';
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

export interface CityTree {
  x: number;
  z: number;
  scale: number;
  tint: number; // 0, 1, 2 foliage variations
}

export interface ShippingContainer {
  x: number;
  z: number;
  y: number;
  rotationY: number;
  color: string;
}

export interface ParkedPropCar {
  x: number;
  z: number;
  rotationY: number;
  color: string;
}

export interface TrafficSignal {
  x: number;
  z: number;
  rotationY: number;
}

export interface OverheadGantry {
  x: number;
  z: number;
  rotationY: number;
  width: number;
  labelColor: string;
}

export interface StuntRamp {
  x: number;
  z: number;
  rotationY: number;
  width: number;
  height: number;
  length: number;
}

// Landmark Locations: Central Garage near (0, 0), Car Lot on West Avenue, and 11 Race Events spread across the 1120x1120 city
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
  // Act 1 Race Events (Inner & Mid Districts)
  {
    id: 'beacon-act1-r1',
    type: 'RACE',
    name: 'Waterfront Dash',
    trackId: 'act1-r1',
    x: 0,
    z: 140,
    radius: 8.0,
    color: '#FF9900',
    glowColor: '#FF9900',
    tag: 'ACT I · RACE 1',
  },
  {
    id: 'beacon-act1-r2',
    type: 'RACE',
    name: 'Industrial Drag',
    trackId: 'act1-r2',
    x: 140,
    z: 300,
    radius: 8.0,
    color: '#FF9900',
    glowColor: '#FF9900',
    tag: 'ACT I · RACE 2',
  },
  {
    id: 'beacon-act1-r3',
    type: 'RACE',
    name: 'Neon Circuit',
    trackId: 'act1-r3',
    x: -140,
    z: -140,
    radius: 8.0,
    color: '#FF9900',
    glowColor: '#FF9900',
    tag: 'ACT I · RACE 3',
  },
  {
    id: 'beacon-act1-r4',
    type: 'RACE',
    name: 'Downtown Sprint',
    trackId: 'act1-r4',
    x: 140,
    z: -140,
    radius: 8.0,
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
    z: -300,
    radius: 9.0,
    color: '#ef4444',
    glowColor: '#f97316',
    tag: 'BOSS BATTLE 1',
  },
  // Act 2 Race Events (Outer Suburban, Industrial & Perimeter Highway)
  {
    id: 'beacon-act2-r1',
    type: 'RACE',
    name: 'Expressway GP',
    trackId: 'act2-r1',
    x: 300,
    z: -140,
    radius: 8.0,
    color: '#FF9900',
    glowColor: '#FF9900',
    tag: 'ACT II · RACE 1',
  },
  {
    id: 'beacon-act2-r2',
    type: 'RACE',
    name: 'Portside Drift',
    trackId: 'act2-r2',
    x: 300,
    z: 300,
    radius: 8.0,
    color: '#FF9900',
    glowColor: '#FF9900',
    tag: 'ACT II · RACE 2',
  },
  {
    id: 'beacon-act2-r3',
    type: 'RACE',
    name: 'Midnight Loop',
    trackId: 'act2-r3',
    x: -300,
    z: -300,
    radius: 8.0,
    color: '#FF9900',
    glowColor: '#FF9900',
    tag: 'ACT II · RACE 3',
  },
  {
    id: 'beacon-act2-r4',
    type: 'RACE',
    name: 'Skyline Rush',
    trackId: 'act2-r4',
    x: 480,
    z: 0,
    radius: 8.5,
    color: '#FF9900',
    glowColor: '#FF9900',
    tag: 'ACT II · RACE 4',
  },
  {
    id: 'beacon-act2-r5',
    type: 'RACE',
    name: 'Industrial Apex',
    trackId: 'act2-r5',
    x: -480,
    z: 140,
    radius: 8.5,
    color: '#FF9900',
    glowColor: '#FF9900',
    tag: 'ACT II · RACE 5',
  },
  {
    id: 'beacon-act2-boss',
    type: 'RACE',
    name: 'Apex Sovereign (Boss 2)',
    trackId: 'act2-boss',
    x: 0,
    z: 480,
    radius: 9.5,
    color: '#eab308',
    glowColor: '#f59e0b',
    tag: 'BOSS BATTLE 2 · ACT II FINALE',
  },
  // Act 3 Blacklist Overlord Gauntlet (Bosses 3-7)
  {
    id: 'beacon-act3-boss1',
    type: 'RACE',
    name: 'Valkyrie Cross (Boss 3)',
    trackId: 'act3-boss1',
    x: -300,
    z: 140,
    radius: 9.0,
    color: '#ec4899',
    glowColor: '#f472b6',
    tag: 'ACT III · BOSS BATTLE 3',
  },
  {
    id: 'beacon-act3-boss2',
    type: 'RACE',
    name: 'Dante Solari (Boss 4)',
    trackId: 'act3-boss2',
    x: 300,
    z: -300,
    radius: 9.0,
    color: '#10b981',
    glowColor: '#34d399',
    tag: 'ACT III · BOSS BATTLE 4',
  },
  {
    id: 'beacon-act3-boss3',
    type: 'RACE',
    name: 'Kurogane Zero (Boss 5)',
    trackId: 'act3-boss3',
    x: -140,
    z: 480,
    radius: 9.0,
    color: '#0284c7',
    glowColor: '#38bdf8',
    tag: 'ACT III · BOSS BATTLE 5',
  },
  {
    id: 'beacon-act3-boss4',
    type: 'RACE',
    name: 'Baron Volkov (Boss 6)',
    trackId: 'act3-boss4',
    x: 480,
    z: -300,
    radius: 9.0,
    color: '#f59e0b',
    glowColor: '#fbbf24',
    tag: 'ACT III · BOSS BATTLE 6',
  },
  {
    id: 'beacon-act3-final',
    type: 'RACE',
    name: 'Omega Prime (Final Boss 7)',
    trackId: 'act3-final',
    x: -480,
    z: -480,
    radius: 10.0,
    color: '#dc2626',
    glowColor: '#facc15',
    tag: 'FINAL BOSS SHOWDOWN #7',
  },
];

// Central Garage Landmark Building (facing South onto Central East-West Avenue, completely off the roadway)
export const GARAGE_BUILDING: CityBuilding = {
  id: 'building-central-garage',
  x: 28,
  z: -26,
  size: [26, 8.5, 20],
  type: 'garage_hq',
  color: '#1a1d24',
  accentColor: '#FF9900',
  windowColor: '#ffb347',
  roofDetails: true,
  facing: 'S',
};

// Car Lot / Dealership Landmark Building (facing South onto Central West Avenue)
export const DEALERSHIP_BUILDING: CityBuilding = {
  id: 'building-car-lot-dealership',
  x: -76,
  z: -28,
  size: [28, 8, 20],
  type: 'dealership',
  color: '#181b22',
  accentColor: '#00B0FF',
  windowColor: '#38bdf8',
  roofDetails: true,
  facing: 'S',
};

// Neon Pit-Stop Gas Station
export const GAS_STATION_BUILDING: CityBuilding = {
  id: 'building-gas-station',
  x: 185,
  z: -168,
  size: [18, 6.2, 12],
  type: 'gas_station',
  color: '#202632',
  accentColor: '#f97316',
  windowColor: '#fde68a',
  facing: 'N',
};

function generateSuburbanHouseCluster(
  prefix: string,
  originX: number,
  originZ: number,
  cols: number,
  rows: number,
  spacingX: number,
  spacingZ: number,
  facing: 'N' | 'S' | 'E' | 'W',
): CityBuilding[] {
  const wallPalette = ['#cbd5e1', '#d6cbbd', '#b8c4d0', '#c7b8a8', '#9aa8b8', '#d1d5db'];
  const roofPalette = ['#3f3f46', '#7c2d12', '#334155', '#475569', '#57534e'];
  const accentPalette = ['#f59e0b', '#38bdf8', '#10b981', '#fb923c'];
  const houses: CityBuilding[] = [];

  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      idx++;
      const w = 11 + ((idx * 3) % 4);
      const h = 4.8 + ((idx * 2) % 3) * 0.9;
      const d = 10 + ((idx * 5) % 4);
      houses.push({
        id: `${prefix}-h-${idx}`,
        x: originX + c * spacingX,
        z: originZ + r * spacingZ,
        size: [w, h, d],
        type: 'house',
        color: wallPalette[idx % wallPalette.length],
        roofColor: roofPalette[idx % roofPalette.length],
        accentColor: accentPalette[idx % accentPalette.length],
        windowColor: '#fef08a',
        facing: r % 2 === 0 ? facing : facing === 'S' ? 'N' : facing === 'N' ? 'S' : facing,
      });
    }
  }
  return houses;
}

export const FREE_ROAM_BUILDINGS: CityBuilding[] = [
  GARAGE_BUILDING,
  DEALERSHIP_BUILDING,
  GAS_STATION_BUILDING,

  // === 1. DOWNTOWN CORE SKYLINE (Inner Blocks: [11..131]) ===
  // NW Inner Block (behind Dealership)
  { id: 'b-dnw-1', x: -34, z: -86, size: [28, 56, 26], type: 'skyscraper', color: '#1b2230', accentColor: '#38bdf8', windowColor: '#7dd3fc', roofDetails: true },
  { id: 'b-dnw-2', x: -86, z: -86, size: [26, 42, 26], type: 'commercial', color: '#1e2430', accentColor: '#f59e0b', windowColor: '#fde047', roofDetails: true },
  { id: 'b-dnw-3', x: -114, z: -38, size: [20, 30, 24], type: 'commercial', color: '#222834', accentColor: '#0ea5e9', windowColor: '#bae6fd' },

  // NE Inner Block (behind Garage)
  { id: 'b-dne-1', x: 78, z: -34, size: [30, 64, 28], type: 'skyscraper', color: '#1a202c', accentColor: '#ff9900', windowColor: '#fef08a', roofDetails: true },
  { id: 'b-dne-2', x: 34, z: -88, size: [26, 48, 24], type: 'skyscraper', color: '#232a36', accentColor: '#3b82f6', windowColor: '#93c5fd', roofDetails: true },
  { id: 'b-dne-3', x: 92, z: -88, size: [26, 38, 26], type: 'commercial', color: '#1d2432', accentColor: '#10b981', windowColor: '#a7f3d0' },

  // SW Inner Block (Metro Plaza & Retail)
  { id: 'b-dsw-1', x: -42, z: 42, size: [28, 32, 26], type: 'commercial', color: '#212632', accentColor: '#f97316', windowColor: '#fed7aa', roofDetails: true },
  { id: 'b-dsw-2', x: -96, z: 42, size: [26, 26, 26], type: 'commercial', color: '#1c212b', accentColor: '#00b0ff', windowColor: '#bae6fd' },
  { id: 'b-dsw-3', x: -42, z: 96, size: [26, 44, 24], type: 'skyscraper', color: '#1e2430', accentColor: '#fbbf24', windowColor: '#fef08a', roofDetails: true },
  { id: 'b-dsw-4', x: -96, z: 96, size: [28, 24, 26], type: 'residential', color: '#272d3a', accentColor: '#38bdf8', windowColor: '#fef3c7' },

  // SE Inner Block (Civic & Financial Center)
  { id: 'b-dse-1', x: 42, z: 42, size: [28, 40, 28], type: 'skyscraper', color: '#1f2531', accentColor: '#ef4444', windowColor: '#fca5a5', roofDetails: true },
  { id: 'b-dse-2', x: 98, z: 42, size: [26, 28, 26], type: 'commercial', color: '#1a1f28', accentColor: '#ff9900', windowColor: '#fed7aa' },
  { id: 'b-dse-3', x: 42, z: 98, size: [26, 34, 24], type: 'commercial', color: '#242a35', accentColor: '#38bdf8', windowColor: '#7dd3fc' },
  { id: 'b-dse-4', x: 98, z: 98, size: [28, 52, 26], type: 'skyscraper', color: '#181e28', accentColor: '#f59e0b', windowColor: '#fde68a', roofDetails: true },

  // === 2. MID-RING DISTRICTS (Spans: [149..291] & [-291..-149]) ===
  // North Midtown Skyline (x: -131..-11 is Central Park; x: 11..131 is Midtown Towers)
  { id: 'b-mn-1', x: 42, z: -185, size: [30, 58, 28], type: 'skyscraper', color: '#1b2029', accentColor: '#ff9900', windowColor: '#fef08a', roofDetails: true },
  { id: 'b-mn-2', x: 98, z: -185, size: [28, 46, 28], type: 'skyscraper', color: '#1f2633', accentColor: '#00b0ff', windowColor: '#7dd3fc', roofDetails: true },
  { id: 'b-mn-3', x: 42, z: -252, size: [28, 36, 26], type: 'commercial', color: '#222834', accentColor: '#10b981', windowColor: '#a7f3d0' },
  { id: 'b-mn-4', x: 98, z: -252, size: [28, 28, 26], type: 'residential', color: '#272c38', accentColor: '#f59e0b', windowColor: '#fef3c7' },

  // NE Mid Block (around Gas Station at 185, -168)
  { id: 'b-mne-1', x: 248, z: -185, size: [28, 38, 26], type: 'commercial', color: '#202633', accentColor: '#38bdf8', windowColor: '#bae6fd', roofDetails: true },
  { id: 'b-mne-2', x: 185, z: -250, size: [30, 26, 26], type: 'commercial', color: '#252b37', accentColor: '#f97316', windowColor: '#fed7aa' },
  { id: 'b-mne-3', x: 250, z: -250, size: [26, 48, 26], type: 'skyscraper', color: '#1c222d', accentColor: '#ff9900', windowColor: '#fef08a', roofDetails: true },

  // East Residential Condos & Apartments (x: 149..291, z: -131..131)
  { id: 'b-er-1', x: 185, z: -92, size: [28, 20, 24], type: 'residential', color: '#282d38', accentColor: '#10b981', windowColor: '#fef3c7' },
  { id: 'b-er-2', x: 252, z: -92, size: [28, 24, 24], type: 'residential', color: '#242934', accentColor: '#38bdf8', windowColor: '#fef3c7' },
  { id: 'b-er-3', x: 185, z: -38, size: [26, 18, 26], type: 'residential', color: '#2b303c', accentColor: '#f59e0b', windowColor: '#fef3c7' },
  { id: 'b-er-4', x: 252, z: -38, size: [26, 22, 26], type: 'residential', color: '#232833', accentColor: '#fb923c', windowColor: '#fef3c7' },
  { id: 'b-er-5', x: 185, z: 42, size: [28, 20, 24], type: 'residential', color: '#282d38', accentColor: '#00b0ff', windowColor: '#fef3c7' },
  { id: 'b-er-6', x: 252, z: 42, size: [28, 18, 24], type: 'residential', color: '#252b36', accentColor: '#10b981', windowColor: '#fef3c7' },
  { id: 'b-er-7', x: 185, z: 98, size: [28, 22, 24], type: 'residential', color: '#2a303c', accentColor: '#f59e0b', windowColor: '#fef3c7' },
  { id: 'b-er-8', x: 252, z: 98, size: [28, 26, 24], type: 'commercial', color: '#212734', accentColor: '#38bdf8', windowColor: '#bae6fd' },

  // West Commercial & Car Row (x: -291..-149, z: -131..131)
  { id: 'b-wc-1', x: -188, z: -88, size: [30, 30, 26], type: 'commercial', color: '#1e2430', accentColor: '#00b0ff', windowColor: '#bae6fd', roofDetails: true },
  { id: 'b-wc-2', x: -252, z: -88, size: [28, 42, 26], type: 'skyscraper', color: '#1a202a', accentColor: '#ff9900', windowColor: '#fef08a', roofDetails: true },
  { id: 'b-wc-3', x: -188, z: -38, size: [28, 18, 24], type: 'commercial', color: '#232936', accentColor: '#f97316', windowColor: '#fed7aa' },
  { id: 'b-wc-4', x: -252, z: -38, size: [28, 22, 24], type: 'commercial', color: '#212732', accentColor: '#38bdf8', windowColor: '#bae6fd' },
  { id: 'b-wc-5', x: -188, z: 42, size: [30, 14, 28], type: 'warehouse', color: '#282e39', accentColor: '#ef4444', roofDetails: true },
  { id: 'b-wc-6', x: -252, z: 42, size: [28, 12, 26], type: 'warehouse', color: '#2b313c', accentColor: '#f59e0b', roofDetails: true },
  { id: 'b-wc-7', x: -188, z: 98, size: [30, 13, 24], type: 'warehouse', color: '#262b35', accentColor: '#38bdf8' },

  // South Industrial & Warehouse Belt (z: 149..291)
  { id: 'b-si-1', x: -92, z: 188, size: [38, 12, 28], type: 'warehouse', color: '#2c323c', accentColor: '#f97316', roofDetails: true },
  { id: 'b-si-2', x: -38, z: 252, size: [36, 13, 28], type: 'warehouse', color: '#272c36', accentColor: '#eab308', roofDetails: true },
  { id: 'b-si-3', x: 42, z: 188, size: [38, 12, 28], type: 'warehouse', color: '#292f39', accentColor: '#38bdf8', roofDetails: true },
  { id: 'b-si-4', x: 98, z: 252, size: [34, 14, 28], type: 'warehouse', color: '#2d333e', accentColor: '#ff9900', roofDetails: true },
  { id: 'b-si-5', x: 188, z: 188, size: [40, 12, 30], type: 'warehouse', color: '#252b34', accentColor: '#ef4444', roofDetails: true },
  { id: 'b-si-6', x: 252, z: 252, size: [36, 11, 28], type: 'warehouse', color: '#2b303b', accentColor: '#10b981' },
  { id: 'b-si-7', x: -188, z: 188, size: [38, 12, 28], type: 'warehouse', color: '#262b35', accentColor: '#f97316' },
  { id: 'b-si-8', x: -252, z: 252, size: [38, 13, 30], type: 'warehouse', color: '#2a2f3a', accentColor: '#38bdf8', roofDetails: true },

  // === 3. OUTER SUBURBAN HOUSES & ESTATES ===
  // NW Suburban Hills (x: -285..-155, z: -285..-155) -> 3x3 = 9 Houses
  ...generateSuburbanHouseCluster('sub-nw1', -266, -266, 3, 3, 46, 46, 'S'),
  // Far NW Estates (x: -460..-320, z: -285..-155) -> 3x3 = 9 Houses
  ...generateSuburbanHouseCluster('sub-nw2', -442, -266, 3, 3, 48, 46, 'S'),
  // Far North Suburbs Left (x: -460..-320, z: -460..-320) -> 3x3 = 9 Houses
  ...generateSuburbanHouseCluster('sub-nw3', -442, -442, 3, 3, 48, 48, 'S'),
  // North Suburban Row (x: -280..-160, z: -460..-320) -> 3x3 = 9 Houses
  ...generateSuburbanHouseCluster('sub-n1', -266, -442, 3, 3, 46, 48, 'S'),
  // North-East Estates (x: 320..460, z: -285..-155) -> 3x3 = 9 Houses
  ...generateSuburbanHouseCluster('sub-ne1', 338, -266, 3, 3, 48, 46, 'S'),
  // East Village Homes (x: 320..460, z: -125..125) -> 3x4 = 12 Houses
  ...generateSuburbanHouseCluster('sub-e1', 338, -104, 3, 4, 48, 66, 'W'),

  // === 4. OUTER NORTH & EAST SKYLINE / COMMERCIAL ===
  { id: 'b-on-1', x: -70, z: -388, size: [34, 62, 30], type: 'skyscraper', color: '#181e28', accentColor: '#ff9900', windowColor: '#fef08a', roofDetails: true },
  { id: 'b-on-2', x: 70, z: -388, size: [34, 58, 30], type: 'skyscraper', color: '#1b2230', accentColor: '#00b0ff', windowColor: '#7dd3fc', roofDetails: true },
  { id: 'b-on-3', x: 220, z: -388, size: [32, 44, 30], type: 'skyscraper', color: '#1e2533', accentColor: '#10b981', windowColor: '#a7f3d0', roofDetails: true },
  { id: 'b-on-4', x: 388, z: -388, size: [36, 50, 32], type: 'commercial', color: '#212734', accentColor: '#f59e0b', windowColor: '#fde68a', roofDetails: true },

  // === 5. OUTER SOUTH PORT & LOGISTICS TERMINAL (z: 309..469) ===
  { id: 'b-os-1', x: -388, z: 388, size: [54, 15, 38], type: 'warehouse', color: '#282d37', accentColor: '#f97316', roofDetails: true },
  { id: 'b-os-2', x: -220, z: 388, size: [52, 14, 38], type: 'warehouse', color: '#262c36', accentColor: '#38bdf8', roofDetails: true },
  { id: 'b-os-3', x: -70, z: 388, size: [48, 16, 36], type: 'warehouse', color: '#2c323d', accentColor: '#eab308', roofDetails: true },
  { id: 'b-os-4', x: 70, z: 388, size: [48, 15, 36], type: 'warehouse', color: '#272d38', accentColor: '#ef4444', roofDetails: true },
  { id: 'b-os-5', x: 220, z: 388, size: [52, 14, 38], type: 'warehouse', color: '#2a303b', accentColor: '#10b981', roofDetails: true },
  { id: 'b-os-6', x: 388, z: 388, size: [54, 16, 38], type: 'warehouse', color: '#242934', accentColor: '#ff9900', roofDetails: true },

  // Far West Docks / Warehouses (x: -469..-309, z: -131..291)
  { id: 'b-ow-1', x: -388, z: -70, size: [42, 14, 42], type: 'warehouse', color: '#272c36', accentColor: '#00b0ff', roofDetails: true },
  { id: 'b-ow-2', x: -388, z: 70, size: [44, 15, 40], type: 'warehouse', color: '#2b303b', accentColor: '#f97316', roofDetails: true },
  { id: 'b-ow-3', x: -388, z: 220, size: [46, 13, 42], type: 'warehouse', color: '#252a34', accentColor: '#eab308', roofDetails: true },
];

// Streetlight poles along Grand Boulevards and District Avenues
export const STREETLIGHT_POLES: StreetLight[] = (() => {
  const poles: StreetLight[] = [];
  // Main NS & EW Boulevards (x = ±10.2, z = ±10.2)
  for (let pos = -450; pos <= 450; pos += 36) {
    // Skip road intersections at 0, ±140, ±300
    if (
      Math.abs(pos) < 16 ||
      Math.abs(Math.abs(pos) - 140) < 15 ||
      Math.abs(Math.abs(pos) - 300) < 15
    ) {
      continue;
    }
    poles.push({ x: -10.2, z: pos, rotationY: 0 });
    poles.push({ x: 10.2, z: pos, rotationY: Math.PI });
    poles.push({ x: pos, z: -10.2, rotationY: -Math.PI / 2 });
    poles.push({ x: pos, z: 10.2, rotationY: Math.PI / 2 });
  }
  // District Avenues (±140 and ±300)
  for (const road of [-300, -140, 140, 300]) {
    for (let pos = -440; pos <= 440; pos += 55) {
      if (
        Math.abs(pos) < 16 ||
        Math.abs(Math.abs(pos) - 140) < 15 ||
        Math.abs(Math.abs(pos) - 300) < 15
      ) {
        continue;
      }
      poles.push({ x: road - 8.2, z: pos, rotationY: 0 });
      poles.push({ x: road + 8.2, z: pos, rotationY: Math.PI });
      poles.push({ x: pos, z: road - 8.2, rotationY: -Math.PI / 2 });
      poles.push({ x: pos, z: road + 8.2, rotationY: Math.PI / 2 });
    }
  }
  return poles;
})();

// Trees populating suburban yards, Central Park, East Estates, and Perimeter Greenbelts
export const FREE_ROAM_TREES: CityTree[] = (() => {
  const trees: CityTree[] = [];

  // Central North Park (block x: -131..-11, z: -291..-149)
  const parkCoords = [
    [-115, -275], [-85, -275], [-55, -275], [-28, -275],
    [-115, -242], [-28, -242],
    [-115, -205], [-28, -205],
    [-115, -168], [-85, -168], [-55, -168], [-28, -168],
    [-95, -220], [-48, -220], [-71, -248], [-71, -190],
  ];
  parkCoords.forEach(([x, z], i) => {
    trees.push({ x, z, scale: 1.05 + (i % 3) * 0.22, tint: i % 3 });
  });

  // Suburban yard trees placed neatly beside house clusters (never on roads or inside houses)
  const suburbanTreeAnchors: Array<[number, number]> = [
    // NW & Far NW yards
    [-282, -266], [-244, -244], [-198, -244], [-160, -266], [-282, -196], [-244, -172], [-198, -172],
    [-460, -266], [-418, -244], [-370, -244], [-324, -266], [-460, -196], [-370, -172], [-324, -196],
    [-460, -442], [-418, -418], [-370, -418], [-324, -442], [-418, -368], [-370, -368],
    [-282, -442], [-244, -418], [-198, -418], [-160, -442], [-244, -368], [-198, -368],
    // NE & East residential yards
    [320, -266], [362, -244], [410, -244], [456, -266], [362, -196], [410, -172], [456, -196],
    [320, -104], [362, -74], [410, -74], [456, -104], [362, -6], [410, 62], [456, 94], [320, 94],
    // Boulevard median/side accent trees along Grand North-South (sidewalk edges at x = ±12.5)
    [-12.5, -120], [12.5, -120], [-12.5, -75], [12.5, -75], [-12.5, 55], [12.5, 55], [-12.5, 110], [12.5, 110],
    // Sidewalk trees along East Residential blocks
    [152, -110], [152, -65], [152, 20], [152, 70], [152, 115],
  ];
  suburbanTreeAnchors.forEach(([x, z], i) => {
    trees.push({ x, z, scale: 0.9 + (i % 4) * 0.16, tint: (i + 1) % 3 });
  });

  // Perimeter parkway belt outside highway (502m..540m)
  for (let p = -490; p <= 490; p += 55) {
    trees.push({ x: p, z: -512, scale: 1.35, tint: Math.abs(p) % 3 });
    trees.push({ x: p, z: 512, scale: 1.35, tint: (Math.abs(p) + 1) % 3 });
    trees.push({ x: -512, z: p, scale: 1.35, tint: (Math.abs(p) + 2) % 3 });
    trees.push({ x: 512, z: p, scale: 1.35, tint: Math.abs(p) % 3 });
  }

  return trees;
})();

// Stacked Shipping Containers in South Port & West Industrial Yards
export const FREE_ROAM_CONTAINERS: ShippingContainer[] = [
  // SW Yard
  { x: -120, z: 235, y: 1.3, rotationY: 0, color: '#dc2626' },
  { x: -120, z: 235, y: 3.9, rotationY: 0, color: '#0284c7' },
  { x: -112, z: 235, y: 1.3, rotationY: 0, color: '#d97706' },
  // SE Port Yard
  { x: 168, z: 245, y: 1.3, rotationY: Math.PI / 2, color: '#059669' },
  { x: 168, z: 245, y: 3.9, rotationY: Math.PI / 2, color: '#ea580c' },
  { x: 168, z: 253, y: 1.3, rotationY: Math.PI / 2, color: '#2563eb' },
  // Outer South Logistics Terminal
  { x: -340, z: 340, y: 1.3, rotationY: 0, color: '#0284c7' },
  { x: -340, z: 340, y: 3.9, rotationY: 0, color: '#dc2626' },
  { x: -332, z: 340, y: 1.3, rotationY: 0, color: '#ca8a04' },
  { x: -120, z: 340, y: 1.3, rotationY: 0, color: '#059669' },
  { x: -112, z: 340, y: 1.3, rotationY: 0, color: '#f97316' },
  { x: 120, z: 340, y: 1.3, rotationY: Math.PI / 2, color: '#2563eb' },
  { x: 120, z: 340, y: 3.9, rotationY: Math.PI / 2, color: '#0284c7' },
  { x: 340, z: 340, y: 1.3, rotationY: 0, color: '#dc2626' },
  { x: 348, z: 340, y: 1.3, rotationY: 0, color: '#059669' },
];

// Parked Static Street Cars tucked in driveways, lots, and curbsides
export const FREE_ROAM_PARKED_CARS: ParkedPropCar[] = [
  // Garage / Dealership parking bays
  { x: 18, z: -13, rotationY: Math.PI / 2, color: '#dc2626' },
  { x: 38, z: -13, rotationY: 0, color: '#f59e0b' },
  { x: -56, z: -14, rotationY: 0.25, color: '#00B0FF' },
  // Gas station pump lane
  { x: 185, z: -156, rotationY: Math.PI / 2, color: '#e2e8f0' },
  // Suburban driveways
  { x: -266, z: -252, rotationY: 0, color: '#3b82f6' },
  { x: -220, z: -252, rotationY: 0, color: '#10b981' },
  { x: -442, z: -252, rotationY: 0, color: '#e11d48' },
  { x: 338, z: -252, rotationY: 0, color: '#f59e0b' },
  { x: 386, z: -252, rotationY: 0, color: '#64748b' },
  { x: 350, z: -104, rotationY: Math.PI / 2, color: '#06b6d4' },
  { x: 350, z: 28, rotationY: Math.PI / 2, color: '#f97316' },
  // Commercial curbsides
  { x: 64, z: 14, rotationY: Math.PI / 2, color: '#475569' },
  { x: -64, z: 14, rotationY: -Math.PI / 2, color: '#94a3b8' },
];

// Traffic light poles at central & district boulevard intersections
export const FREE_ROAM_TRAFFIC_SIGNALS: TrafficSignal[] = (() => {
  const list: TrafficSignal[] = [];
  for (const ix of [-140, 0, 140]) {
    for (const iz of [-140, 0, 140]) {
      const offset = ix === 0 && iz === 0 ? 10.5 : 8.5;
      list.push({ x: ix - offset, z: iz - offset, rotationY: 0 });
      list.push({ x: ix + offset, z: iz + offset, rotationY: Math.PI });
    }
  }
  return list;
})();

// Overhead Highway & Boulevard Sign Gantries
export const FREE_ROAM_GANTRIES: OverheadGantry[] = [
  { x: 0, z: -90, rotationY: 0, width: 20, labelColor: '#FF9900' },
  { x: 0, z: 90, rotationY: 0, width: 20, labelColor: '#00B0FF' },
  { x: -220, z: 0, rotationY: Math.PI / 2, width: 20, labelColor: '#10b981' },
  { x: 220, z: 0, rotationY: Math.PI / 2, width: 20, labelColor: '#FF9900' },
  { x: 0, z: -480, rotationY: 0, width: 20, labelColor: '#ef4444' },
  { x: 0, z: 480, rotationY: 0, width: 20, labelColor: '#f59e0b' },
];

// Urban Stunt Ramps in Plaza & Port Districts
export const FREE_ROAM_RAMPS: StuntRamp[] = [
  { x: -16, z: 220, rotationY: 0, width: 7, height: 2.2, length: 11 },
  { x: 20, z: 220, rotationY: Math.PI, width: 7, height: 2.2, length: 11 },
  { x: -220, z: 340, rotationY: Math.PI / 2, width: 8, height: 2.4, length: 12 },
];

// Slalom pylons on the central test strip for drifting practice
export interface SlalomPylon {
  x: number;
  z: number;
}

export const FREE_ROAM_PYLONS: SlalomPylon[] = Array.from({ length: 8 }).map((_, i) => ({
  x: i % 2 === 0 ? -3.5 : 3.5,
  z: -24 - i * 13,
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

let customCityBeacons: WorldBeacon[] | null = null;

export function setCustomCityBeacons(beacons: WorldBeacon[] | null) {
  customCityBeacons = beacons;
}

export function getActiveFreeRoamBeacons(): WorldBeacon[] {
  return customCityBeacons ?? FREE_ROAM_BEACONS;
}

/**
 * Checks if the player car at (px, pz) is within any active Free Roam beacon trigger zone
 */
export function getActiveWorldBeacon(px: number, pz: number): WorldBeacon | null {
  const beacons = getActiveFreeRoamBeacons();
  for (let i = 0; i < beacons.length; i++) {
    const b = beacons[i];
    const dx = px - b.x;
    const dz = pz - b.z;
    if (dx * dx + dz * dz <= b.radius * b.radius) {
      return b;
    }
  }
  return null;
}
