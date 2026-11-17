import * as THREE from 'three';

export interface TrackSample {
  index: number;
  s: number;
  pos: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  curvature: number;
}

export interface BossProfile {
  name: string;
  title: string;
  bodyColor: string;
  accentColor: string;
  wheelsColor: string;
  underglowColor: string;
}

export interface RaceTrackDefinition {
  id: string;
  act: 1 | 2 | 3;
  raceNumber: number; // Sequential display number within career
  order: number; // 1..16
  isBoss: boolean;
  isFinalBoss?: boolean;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Pro' | 'Boss';
  laps: number;
  roadWidth: number;
  reward: number;
  aiSpeedsKph: [number, number]; // [Primary/Boss AI, Secondary AI]
  cornerSeverityLabel: string;
  description: string;
  bossProfile?: BossProfile;
  controlPoints: [number, number][];
}

export interface BuiltRaceTrack extends RaceTrackDefinition {
  samples: TrackSample[];
  totalLength: number;
  sampleStep: number;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    width: number;
    depth: number;
    centerX: number;
    centerZ: number;
  };
}

export const ACT1_BOSS_ID = 'act1-boss';
export const ACT2_BOSS_ID = 'act2-boss';
export const FINAL_BOSS_ID = 'act3-final';

export const RACE_TRACK_DEFINITIONS: readonly RaceTrackDefinition[] = [
  // ==================== ACT 1: RACES 1-4 + BOSS 1 ====================
  {
    id: 'act1-r1',
    act: 1,
    raceNumber: 1,
    order: 1,
    isBoss: false,
    title: 'Neon Oval Sprint',
    difficulty: 'Easy',
    laps: 1,
    roadWidth: 18,
    reward: 600,
    aiSpeedsKph: [88, 82],
    cornerSeverityLabel: 'Sweeping Bends',
    description: 'Opening Act 1 qualifier with wide sweeping turns and a flowing backstraight.',
    controlPoints: [
      [0, 22],
      [0, -48],
      [28, -96],
      [82, -96],
      [108, -50],
      [96, 6],
      [108, 56],
      [68, 92],
      [20, 78],
      [0, 50],
    ],
  },
  {
    id: 'act1-r2',
    act: 1,
    raceNumber: 2,
    order: 2,
    isBoss: false,
    title: 'Harbor S-Curves',
    difficulty: 'Easy',
    laps: 1,
    roadWidth: 18,
    reward: 950,
    aiSpeedsKph: [104, 97],
    cornerSeverityLabel: 'Flowing S-Bends',
    description: 'Coastal waterfront circuit featuring rhythmic left-right S-curves.',
    controlPoints: [
      [0, 22],
      [0, -48],
      [-36, -98],
      [-8, -150],
      [58, -158],
      [108, -112],
      [76, -54],
      [118, -2],
      [92, 68],
      [32, 84],
      [0, 54],
    ],
  },
  {
    id: 'act1-r3',
    act: 1,
    raceNumber: 3,
    order: 3,
    isBoss: false,
    title: 'Metro Twin-Apex',
    difficulty: 'Medium',
    laps: 2,
    roadWidth: 17,
    reward: 1400,
    aiSpeedsKph: [122, 114],
    cornerSeverityLabel: 'Double-Apex Corners',
    description: 'Two-lap downtown loop built around a sweeping northern double-apex sector.',
    controlPoints: [
      [0, 22],
      [0, -56],
      [-45, -104],
      [-30, -162],
      [42, -172],
      [104, -135],
      [96, -72],
      [135, -18],
      [100, 56],
      [38, 76],
      [0, 52],
    ],
  },
  {
    id: 'act1-r4',
    act: 1,
    raceNumber: 4,
    order: 4,
    isBoss: false,
    title: 'Canyon Switchbacks',
    difficulty: 'Medium',
    laps: 2,
    roadWidth: 16.5,
    reward: 2000,
    aiSpeedsKph: [142, 132],
    cornerSeverityLabel: 'Sharp Hairpins',
    description: 'Heavy braking into canyon switchbacks before returning down the main straight.',
    controlPoints: [
      [0, 22],
      [0, -52],
      [42, -88],
      [12, -138],
      [76, -172],
      [130, -136],
      [84, -80],
      [140, -42],
      [118, 28],
      [66, 8],
      [58, 78],
      [18, 88],
      [0, 52],
    ],
  },
  {
    id: ACT1_BOSS_ID,
    act: 1,
    raceNumber: 5,
    order: 5,
    isBoss: true,
    title: 'Obsidian Phantom Duel',
    difficulty: 'Boss',
    laps: 2,
    roadWidth: 16,
    reward: 3500,
    aiSpeedsKph: [168, 168],
    cornerSeverityLabel: 'Boss Technical Loop',
    description: '1v1 Act 1 Showdown against The Obsidian Phantom. Victory unlocks Act 2.',
    bossProfile: {
      name: 'Obsidian Phantom',
      title: 'Act 1 Syndicate Boss',
      bodyColor: '#09090b',
      accentColor: '#ef4444',
      wheelsColor: '#dc2626',
      underglowColor: '#ef4444',
    },
    controlPoints: [
      [0, 22],
      [0, -64],
      [-50, -108],
      [-92, -84],
      [-108, -144],
      [-48, -186],
      [36, -168],
      [98, -124],
      [68, -68],
      [114, -12],
      [88, 66],
      [30, 82],
      [0, 52],
    ],
  },

  // ==================== ACT 2: RACES 5-9 + FINAL BOSS ====================
  {
    id: 'act2-r5',
    act: 2,
    raceNumber: 5,
    order: 6,
    isBoss: false,
    title: 'Skyline Expressway',
    difficulty: 'Medium',
    laps: 2,
    roadWidth: 17,
    reward: 4200,
    aiSpeedsKph: [174, 164],
    cornerSeverityLabel: 'High-Speed Esses',
    description: 'Act 2 opener on wide elevated expressways with rapid high-speed directional changes.',
    controlPoints: [
      [0, 22],
      [0, -78],
      [48, -122],
      [120, -110],
      [148, -50],
      [98, 4],
      [144, 58],
      [92, 106],
      [30, 86],
      [0, 54],
    ],
  },
  {
    id: 'act2-r6',
    act: 2,
    raceNumber: 6,
    order: 7,
    isBoss: false,
    title: 'Industrial Hairpins',
    difficulty: 'Hard',
    laps: 2,
    roadWidth: 16,
    reward: 5200,
    aiSpeedsKph: [188, 178],
    cornerSeverityLabel: 'Twin 180° Hairpins',
    description: 'Tight industrial dock circuit punctuated by two heavy-braking 180-degree hairpins.',
    controlPoints: [
      [0, 22],
      [0, -60],
      [-46, -98],
      [-92, -62],
      [-126, -118],
      [-74, -178],
      [16, -162],
      [78, -116],
      [130, -142],
      [152, -76],
      [102, -16],
      [126, 48],
      [62, 88],
      [14, 68],
      [0, 50],
    ],
  },
  {
    id: 'act2-r7',
    act: 2,
    raceNumber: 7,
    order: 8,
    isBoss: false,
    title: 'Coastal Chicane Run',
    difficulty: 'Medium',
    laps: 2,
    roadWidth: 18,
    reward: 6500,
    aiSpeedsKph: [176, 166],
    cornerSeverityLabel: 'Flowing Chicanes',
    description: 'Coastal highway featuring wide, flowing chicanes and generous overtaking lanes.',
    controlPoints: [
      [0, 22],
      [0, -72],
      [-44, -120],
      [8, -168],
      [72, -142],
      [132, -166],
      [162, -104],
      [116, -54],
      [148, 12],
      [100, 68],
      [46, 62],
      [16, 76],
      [0, 52],
    ],
  },
  {
    id: 'act2-r8',
    act: 2,
    raceNumber: 8,
    order: 9,
    isBoss: false,
    title: 'Foundry Technical',
    difficulty: 'Hard',
    laps: 2,
    roadWidth: 18.5,
    reward: 8200,
    aiSpeedsKph: [184, 174],
    cornerSeverityLabel: 'Sweeping Technical',
    description: 'Two-lap technical circuit with widened asphalt and smooth, forgiving corner transitions.',
    controlPoints: [
      [0, 22],
      [0, -64],
      [46, -98],
      [18, -146],
      [-42, -148],
      [-64, -196],
      [14, -212],
      [96, -176],
      [138, -112],
      [96, -54],
      [140, 10],
      [110, 72],
      [58, 66],
      [26, 82],
      [0, 54],
    ],
  },
  {
    id: 'act2-r9',
    act: 2,
    raceNumber: 9,
    order: 10,
    isBoss: false,
    title: 'Apex Grand Prix',
    difficulty: 'Hard',
    laps: 2,
    roadWidth: 18.5,
    reward: 10500,
    aiSpeedsKph: [192, 182],
    cornerSeverityLabel: 'Fast GP Esses',
    description: 'Two-lap Act 2 qualifier before the title bout with wide racing lines and balanced pace.',
    controlPoints: [
      [0, 22],
      [0, -68],
      [-50, -112],
      [-86, -104],
      [-108, -152],
      [-56, -198],
      [34, -192],
      [116, -152],
      [132, -84],
      [84, -48],
      [126, 0],
      [106, 68],
      [56, 64],
      [28, 80],
      [0, 54],
    ],
  },
  {
    id: ACT2_BOSS_ID,
    act: 2,
    raceNumber: 10,
    order: 11,
    isBoss: true,
    title: 'Sovereign Syndicate Showdown',
    difficulty: 'Boss',
    laps: 3,
    roadWidth: 16.5,
    reward: 12000,
    aiSpeedsKph: [232, 232],
    cornerSeverityLabel: 'Act 2 Boss Circuit',
    description: '1v1 Act 2 Finale against the Apex Sovereign to unlock the 5-Boss Blacklist Overlord Gauntlet.',
    bossProfile: {
      name: 'Apex Sovereign',
      title: 'Act 2 Syndicate Boss (#2)',
      bodyColor: '#eab308',
      accentColor: '#ffffff',
      wheelsColor: '#f8fafc',
      underglowColor: '#facc15',
    },
    controlPoints: [
      [0, 22],
      [0, -80],
      [-52, -124],
      [-104, -92],
      [-136, -156],
      [-72, -214],
      [24, -192],
      [96, -216],
      [158, -154],
      [112, -88],
      [156, -22],
      [122, 62],
      [62, 40],
      [34, 96],
      [0, 56],
    ],
  },

  // ==================== ACT 3: BLACKLIST OVERLORD GAUNTLET (BOSSES 3-7) ====================
  {
    id: 'act3-boss1',
    act: 3,
    raceNumber: 11,
    order: 12,
    isBoss: true,
    title: 'Crimson Canyon Duel',
    difficulty: 'Boss',
    laps: 2,
    roadWidth: 18.0,
    reward: 13500,
    aiSpeedsKph: [248, 248],
    cornerSeverityLabel: 'Boss 3 · High-Speed Sweepers',
    description: '1v1 Blacklist Boss Duel vs Valkyrie Cross through sweeping canyon curves.',
    bossProfile: {
      name: 'Valkyrie Cross',
      title: 'Blacklist Overlord · Boss #3',
      bodyColor: '#ec4899',
      accentColor: '#fbcfe8',
      wheelsColor: '#18181b',
      underglowColor: '#f472b6',
    },
    controlPoints: [
      [0, 24],
      [0, -90],
      [48, -148],
      [124, -142],
      [158, -76],
      [118, -16],
      [154, 48],
      [108, 108],
      [24, 98],
      [-64, 104],
      [-118, 42],
      [-86, -34],
      [-34, -22],
      [0, 62],
    ],
  },
  {
    id: 'act3-boss2',
    act: 3,
    raceNumber: 12,
    order: 13,
    isBoss: true,
    title: 'Titanium Ring Circuit',
    difficulty: 'Boss',
    laps: 2,
    roadWidth: 18.0,
    reward: 15500,
    aiSpeedsKph: [265, 265],
    cornerSeverityLabel: 'Boss 4 · Technical Ring',
    description: '1v1 Blacklist Boss Duel vs Dante Solari in his homologated GT3 executioner.',
    bossProfile: {
      name: 'Dante Solari',
      title: 'GT3 Executioner · Boss #4',
      bodyColor: '#10b981',
      accentColor: '#a7f3d0',
      wheelsColor: '#fbbf24',
      underglowColor: '#34d399',
    },
    controlPoints: [
      [0, 24],
      [0, -92],
      [-58, -144],
      [-132, -118],
      [-146, -42],
      [-94, 8],
      [-136, 68],
      [-74, 122],
      [18, 114],
      [104, 118],
      [148, 52],
      [116, -24],
      [142, -98],
      [78, -144],
      [22, -96],
      [0, 64],
    ],
  },
  {
    id: 'act3-boss3',
    act: 3,
    raceNumber: 13,
    order: 14,
    isBoss: true,
    title: 'Obsidian Spiral GP',
    difficulty: 'Boss',
    laps: 2,
    roadWidth: 18.5,
    reward: 18000,
    aiSpeedsKph: [282, 282],
    cornerSeverityLabel: 'Boss 5 · Wangan Velocity',
    description: '1v1 Blacklist Boss Duel vs Kurogane Zero on an ultra-fast midnight expressway.',
    bossProfile: {
      name: 'Kurogane Zero',
      title: 'Wangan Phantom · Boss #5',
      bodyColor: '#0284c7',
      accentColor: '#38bdf8',
      wheelsColor: '#e2e8f0',
      underglowColor: '#0ea5e9',
    },
    controlPoints: [
      [0, 24],
      [0, -104],
      [-42, -172],
      [-126, -182],
      [-172, -114],
      [-138, -32],
      [-168, 46],
      [-112, 118],
      [-28, 126],
      [68, 124],
      [148, 72],
      [172, -18],
      [126, -98],
      [158, -168],
      [82, -198],
      [22, -142],
      [0, 68],
    ],
  },
  {
    id: 'act3-boss4',
    act: 3,
    raceNumber: 14,
    order: 15,
    isBoss: true,
    title: 'Sovereign Ridge Loop',
    difficulty: 'Boss',
    laps: 2,
    roadWidth: 18.5,
    reward: 21000,
    aiSpeedsKph: [298, 298],
    cornerSeverityLabel: 'Boss 6 · Hyper Ridge',
    description: '1v1 Blacklist Boss Duel vs Baron Volkov. Stage 6–7 hardware strongly advised.',
    bossProfile: {
      name: 'Baron Volkov',
      title: 'Syndicate Enforcer · Boss #6',
      bodyColor: '#f59e0b',
      accentColor: '#fef08a',
      wheelsColor: '#18181b',
      underglowColor: '#fbbf24',
    },
    controlPoints: [
      [0, 24],
      [0, -110],
      [62, -168],
      [146, -164],
      [184, -84],
      [134, -12],
      [178, 68],
      [112, 134],
      [24, 128],
      [-58, 138],
      [-144, 96],
      [-174, 12],
      [-126, -56],
      [-162, -138],
      [-92, -192],
      [-24, -144],
      [0, 72],
    ],
  },
  {
    id: FINAL_BOSS_ID,
    act: 3,
    raceNumber: 15,
    order: 16,
    isBoss: true,
    isFinalBoss: true,
    title: 'Apex Zenith Finale',
    difficulty: 'Boss',
    laps: 3,
    roadWidth: 19.0,
    reward: 30000,
    aiSpeedsKph: [315, 315],
    cornerSeverityLabel: 'Boss 7 · Grand Championship',
    description: '1v1 Ultimate Showdown against Omega Prime for total Neon Apex supremacy.',
    bossProfile: {
      name: 'Omega Prime',
      title: 'Undisputed Emperor · Final Boss #7',
      bodyColor: '#dc2626',
      accentColor: '#facc15',
      wheelsColor: '#f8fafc',
      underglowColor: '#ef4444',
    },
    controlPoints: [
      [0, 26],
      [0, -118],
      [-56, -184],
      [-144, -188],
      [-192, -104],
      [-146, -18],
      [-186, 68],
      [-118, 146],
      [-26, 136],
      [64, 148],
      [152, 98],
      [194, 8],
      [144, -68],
      [176, -156],
      [98, -214],
      [26, -166],
      [0, 76],
    ],
  },
] as const;

export const ACT1_STANDARD_IDS = RACE_TRACK_DEFINITIONS.filter(
  (t) => t.act === 1 && !t.isBoss,
).map((t) => t.id);

export const ACT2_STANDARD_IDS = RACE_TRACK_DEFINITIONS.filter(
  (t) => t.act === 2 && !t.isBoss,
).map((t) => t.id);

export const ACT3_BOSS_IDS = RACE_TRACK_DEFINITIONS.filter(
  (t) => t.act === 3,
).map((t) => t.id);

export interface RaceCompletionRecord {
  bestTimeMs: number;
  bestPosition: number;
}

export interface ProgressionStatus {
  act1Wins: number;
  act1Total: number;
  boss1Unlocked: boolean;
  boss1Defeated: boolean;
  act2Unlocked: boolean;
  act2Wins: number;
  act2Total: number;
  boss2Unlocked: boolean;
  boss2Defeated: boolean;
  act3Unlocked: boolean;
  act3Wins: number;
  act3Total: number;
  finalBossUnlocked: boolean;
  finalBossDefeated: boolean;
}

export function getProgressionStatus(
  completedRaces: Record<string, RaceCompletionRecord>,
): ProgressionStatus {
  const isWon = (id: string) => completedRaces[id]?.bestPosition === 1;

  const act1Wins = ACT1_STANDARD_IDS.filter(isWon).length;
  const boss1Unlocked = act1Wins === ACT1_STANDARD_IDS.length;
  const boss1Defeated = isWon(ACT1_BOSS_ID);

  const act2Unlocked = boss1Defeated;
  const act2Wins = ACT2_STANDARD_IDS.filter(isWon).length;
  const boss2Unlocked = act2Unlocked && act2Wins === ACT2_STANDARD_IDS.length;
  const boss2Defeated = isWon(ACT2_BOSS_ID);

  const act3Unlocked = boss2Defeated;
  const act3Wins = ACT3_BOSS_IDS.filter(isWon).length;
  const prereqFinalId = ACT3_BOSS_IDS.length >= 2 ? ACT3_BOSS_IDS[ACT3_BOSS_IDS.length - 2] : ACT2_BOSS_ID;
  const finalBossUnlocked = act3Unlocked && isWon(prereqFinalId);
  const finalBossDefeated = isWon(FINAL_BOSS_ID);

  return {
    act1Wins,
    act1Total: ACT1_STANDARD_IDS.length,
    boss1Unlocked,
    boss1Defeated,
    act2Unlocked,
    act2Wins,
    act2Total: ACT2_STANDARD_IDS.length,
    boss2Unlocked,
    boss2Defeated,
    act3Unlocked,
    act3Wins,
    act3Total: ACT3_BOSS_IDS.length,
    finalBossUnlocked,
    finalBossDefeated,
  };
}

export function isTrackUnlocked(
  trackId: string,
  completedRaces: Record<string, RaceCompletionRecord>,
): { unlocked: boolean; reason?: string } {
  const def = RACE_TRACK_DEFINITIONS.find((t) => t.id === trackId);
  if (!def) return { unlocked: false, reason: 'Unknown event' };

  const status = getProgressionStatus(completedRaces);

  if (def.act === 1) {
    if (!def.isBoss) return { unlocked: true };
    return status.boss1Unlocked
      ? { unlocked: true }
      : {
          unlocked: false,
          reason: `Win all ${status.act1Total} Act 1 races (${status.act1Wins}/${status.act1Total})`,
        };
  }

  if (def.act === 2) {
    if (!status.act2Unlocked) {
      return { unlocked: false, reason: 'Defeat Boss 1 (Obsidian Phantom) to unlock Act 2' };
    }
    if (!def.isBoss) return { unlocked: true };
    return status.boss2Unlocked
      ? { unlocked: true }
      : {
          unlocked: false,
          reason: `Win all ${status.act2Total} Act 2 races (${status.act2Wins}/${status.act2Total})`,
        };
  }

  // Act 3: 5-Boss Blacklist Overlord Gauntlet (sequential boss ladder)
  if (!status.act3Unlocked) {
    return { unlocked: false, reason: 'Defeat Boss 2 (Apex Sovereign) to unlock Act 3' };
  }
  const bossIdx = ACT3_BOSS_IDS.indexOf(def.id);
  if (bossIdx <= 0) return { unlocked: true };
  const prevBossId = ACT3_BOSS_IDS[bossIdx - 1];
  const prevDef = RACE_TRACK_DEFINITIONS.find((t) => t.id === prevBossId);
  if (completedRaces[prevBossId]?.bestPosition === 1) {
    return { unlocked: true };
  }
  return {
    unlocked: false,
    reason: `Defeat ${prevDef?.bossProfile?.name ?? 'previous Boss'} (Boss #${bossIdx + 2}) first`,
  };
}

const BUILT_TRACK_CACHE = new Map<string, BuiltRaceTrack>();

export function getBuiltRaceTrack(trackId: string): BuiltRaceTrack {
  const cached = BUILT_TRACK_CACHE.get(trackId);
  if (cached) return cached;

  const def =
    RACE_TRACK_DEFINITIONS.find((t) => t.id === trackId) ?? RACE_TRACK_DEFINITIONS[0];

  const vecPoints = def.controlPoints.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(vecPoints, true, 'centripetal', 0.5);

  const sampleCount = 240;
  const totalLength = curve.getLength();
  const sampleStep = totalLength / sampleCount;

  // Find parameter u closest to origin (0, 0, 0) so sample[0] aligns cleanly with car spawn
  let bestU = 0;
  let bestDistSq = Infinity;
  const probeSteps = 720;
  const tmp = new THREE.Vector3();
  for (let i = 0; i < probeSteps; i++) {
    const u = i / probeSteps;
    curve.getPointAt(u, tmp);
    const dSq = tmp.x * tmp.x + tmp.z * tmp.z;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestU = u;
    }
  }

  const samples: TrackSample[] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < sampleCount; i++) {
    const u = (bestU + i / sampleCount) % 1;
    const pos = curve.getPointAt(u);
    pos.y = 0;
    const tangent = curve.getTangentAt(u);
    tangent.y = 0;
    if (tangent.lengthSq() > 1e-6) tangent.normalize();
    else tangent.set(0, 0, -1);

    const right = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x);
    minZ = Math.min(minZ, pos.z);
    maxZ = Math.max(maxZ, pos.z);

    samples.push({
      index: i,
      s: i * sampleStep,
      pos,
      tangent,
      right,
      curvature: 0,
    });
  }

  // Compute smoothed local curvature (rad/m) across +/- 3 samples for AI braking accuracy
  for (let i = 0; i < sampleCount; i++) {
    const prev = samples[(i - 3 + sampleCount) % sampleCount];
    const next = samples[(i + 3) % sampleCount];
    const dot = THREE.MathUtils.clamp(prev.tangent.dot(next.tangent), -1, 1);
    const angle = Math.acos(dot);
    samples[i].curvature = angle / (6 * sampleStep);
  }

  const pad = def.roadWidth * 0.8;
  minX -= pad;
  maxX += pad;
  minZ -= pad;
  maxZ += pad;

  const built: BuiltRaceTrack = {
    ...def,
    samples,
    totalLength,
    sampleStep,
    bounds: {
      minX,
      maxX,
      minZ,
      maxZ,
      width: maxX - minX,
      depth: maxZ - minZ,
      centerX: (minX + maxX) / 2,
      centerZ: (minZ + maxZ) / 2,
    },
  };

  BUILT_TRACK_CACHE.set(trackId, built);
  return built;
}

export function findNearestTrackSample(
  track: BuiltRaceTrack,
  x: number,
  z: number,
  hintIndex?: number,
): number {
  const { samples } = track;
  const n = samples.length;

  if (hintIndex !== undefined && hintIndex >= 0 && hintIndex < n) {
    let bestIdx = hintIndex;
    let bestDistSq = Infinity;
    for (let offset = -18; offset <= 18; offset++) {
      const idx = (hintIndex + offset + n) % n;
      const dx = x - samples[idx].pos.x;
      const dz = z - samples[idx].pos.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestIdx = idx;
      }
    }
    if (bestDistSq < 900) return bestIdx;
  }

  let bestIdx = 0;
  let bestDistSq = Infinity;
  for (let i = 0; i < n; i++) {
    const dx = x - samples[i].pos.x;
    const dz = z - samples[i].pos.z;
    const dSq = dx * dx + dz * dz;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function getScaledPayout(baseReward: number, placement: number): number {
  if (placement <= 1) return baseReward;
  if (placement === 2) return Math.round(baseReward * 0.7);
  return Math.round(baseReward * 0.5);
}

export function getQuickRaceTrackId(
  completedRaces: Record<string, RaceCompletionRecord>,
): string {
  const unlocked = RACE_TRACK_DEFINITIONS.filter(
    (t) => isTrackUnlocked(t.id, completedRaces).unlocked,
  );
  const nextUnwon = unlocked.find((t) => completedRaces[t.id]?.bestPosition !== 1);
  if (nextUnwon) return nextUnwon.id;
  return unlocked.length > 0 ? unlocked[unlocked.length - 1].id : RACE_TRACK_DEFINITIONS[0].id;
}

export function getBlacklistRankSummary(
  completedRaces: Record<string, RaceCompletionRecord>,
): {
  rankNumber: number;
  rankLabel: string;
  actLabel: string;
  totalWins: number;
  totalEvents: number;
} {
  const status = getProgressionStatus(completedRaces);
  const totalEvents = RACE_TRACK_DEFINITIONS.length;
  const totalWins = Object.values(completedRaces).filter((r) => r.bestPosition === 1).length;
  const rankNumber = Math.max(1, totalEvents + 1 - totalWins);

  const actLabel = status.finalBossDefeated
    ? 'CHAMPION'
    : status.act3Unlocked
    ? 'ACT III'
    : status.act2Unlocked
    ? 'ACT II'
    : 'ACT I';

  const rankLabel = `RANK #${String(rankNumber).padStart(2, '0')} — ${actLabel}`;
  return {
    rankNumber,
    rankLabel,
    actLabel,
    totalWins,
    totalEvents,
  };
}

