/**
 * Level Definitions & Object Schemas for Geometry Dash
 * Supports object rotation, cube/ship/ball/wave gamemode portals, and custom Studio levels.
 */

export type PlayerGameMode = 'CUBE' | 'SHIP' | 'BALL' | 'WAVE';

export type GeometryObjectType =
  | 'SPIKE'
  | 'HALF_SPIKE'
  | 'BLOCK'
  | 'SLAB'
  | 'JUMP_PAD_YELLOW'
  | 'JUMP_PAD_PINK'
  | 'JUMP_RING_YELLOW'
  | 'JUMP_RING_BLUE'
  | 'GRAVITY_PORTAL_BLUE'
  | 'GRAVITY_PORTAL_YELLOW'
  | 'PORTAL_CUBE'
  | 'PORTAL_SHIP'
  | 'PORTAL_BALL'
  | 'PORTAL_WAVE'
  | 'SECRET_COIN';

export interface LevelObject {
  id: string;
  type: GeometryObjectType;
  x: number; // In grid units (each unit = 34px)
  y: number; // In grid units from floor (0 = ground level)
  width?: number; // In grid units, default 1
  height?: number; // In grid units, default 1
  rotation?: number; // Clockwise rotation in degrees (0, 45, 90, 180, 270, etc.)
  collected?: boolean;
}

export interface GeometryLevelDef {
  id: string;
  name: string;
  difficulty: 'Easy' | 'Normal' | 'Hard' | 'Insane' | 'Demon';
  stars: number;
  trackPresetId: string;
  speedMultiplier: number;
  lengthUnits: number;
  startingMode?: PlayerGameMode;
  bgGradient: [string, string]; // Top color, bottom color
  floorColor: string;
  accentColor: string;
  isCustom?: boolean;
  objects: LevelObject[];
}

export const GEOMETRY_LEVELS: GeometryLevelDef[] = [
  {
    id: 'stereo_blitz',
    name: 'Stereo Blitz',
    difficulty: 'Normal',
    stars: 3,
    trackPresetId: 'stereo_blitz',
    speedMultiplier: 1.0,
    lengthUnits: 176,
    startingMode: 'CUBE',
    bgGradient: ['#0f172a', '#1e1b4b'],
    floorColor: '#312e81',
    accentColor: '#00f0ff',
    objects: [
      // Introduction single & double spikes
      { id: 'sb_1', type: 'SPIKE', x: 12, y: 0 },
      { id: 'sb_2', type: 'SPIKE', x: 18, y: 0 },
      { id: 'sb_3', type: 'SPIKE', x: 23, y: 0 },

      // First block steps with rotated side & underside spikes
      { id: 'sb_4', type: 'BLOCK', x: 28, y: 0 },
      { id: 'sb_5', type: 'BLOCK', x: 29, y: 1 },
      { id: 'sb_6', type: 'BLOCK', x: 30, y: 1 },
      { id: 'sb_6_rot', type: 'SPIKE', x: 31, y: 1, rotation: 90 }, // Side-mounted spike pointing right
      { id: 'sb_7', type: 'SPIKE', x: 31, y: 0 },
      { id: 'sb_8', type: 'SPIKE', x: 32, y: 0 },

      // Jump Pad launch over spike pit + overhead rotated ceiling spike
      { id: 'sb_9', type: 'JUMP_PAD_YELLOW', x: 36, y: 0 },
      { id: 'sb_10', type: 'SPIKE', x: 38, y: 0 },
      { id: 'sb_11', type: 'SPIKE', x: 39, y: 0 },
      { id: 'sb_12', type: 'SPIKE', x: 40, y: 0 },
      { id: 'sb_13', type: 'BLOCK', x: 41, y: 2 },
      { id: 'sb_14', type: 'BLOCK', x: 42, y: 2 },
      { id: 'sb_14_rot', type: 'SPIKE', x: 42, y: 7, rotation: 180 }, // Ceiling spike pointing down
      { id: 'sb_c1', type: 'SECRET_COIN', x: 42, y: 3.5 },

      // Triple spike test on flat ground
      { id: 'sb_15', type: 'SPIKE', x: 48, y: 0 },
      { id: 'sb_16', type: 'SPIKE', x: 49, y: 0 },
      { id: 'sb_16b', type: 'SPIKE', x: 50, y: 0 },

      // Mid-air Jump Ring section
      { id: 'sb_17', type: 'SPIKE', x: 56, y: 0 },
      { id: 'sb_18', type: 'SPIKE', x: 57, y: 0 },
      { id: 'sb_19', type: 'JUMP_RING_YELLOW', x: 56.5, y: 2.3 },
      { id: 'sb_20', type: 'BLOCK', x: 59, y: 1 },
      { id: 'sb_21', type: 'BLOCK', x: 60, y: 1 },

      // SHIP GAMEMODE SECTION
      { id: 'sb_ship_portal', type: 'PORTAL_SHIP', x: 66, y: 0, height: 8 },
      { id: 'sb_sh_1', type: 'BLOCK', x: 72, y: 0 },
      { id: 'sb_sh_2', type: 'BLOCK', x: 72, y: 1 },
      { id: 'sb_sh_3', type: 'SPIKE', x: 72, y: 2 },
      { id: 'sb_sh_4', type: 'BLOCK', x: 72, y: 7 },
      { id: 'sb_sh_5', type: 'SPIKE', x: 72, y: 6, rotation: 180 }, // Inverted ceiling spike

      // Rotated 45-degree floating diamond hazards in Ship flight
      { id: 'sb_sh_6', type: 'BLOCK', x: 80, y: 3.5, rotation: 45 },
      { id: 'sb_sh_7', type: 'BLOCK', x: 87, y: 5.2, rotation: 45 },
      { id: 'sb_sh_8', type: 'SPIKE', x: 87, y: 0 },
      { id: 'sb_sh_9', type: 'SPIKE', x: 88, y: 0 },
      { id: 'sb_c2', type: 'SECRET_COIN', x: 87, y: 2.6, rotation: 45 },

      // Tight Ship Gate with rotated spikes
      { id: 'sb_sh_10', type: 'BLOCK', x: 94, y: 0 },
      { id: 'sb_sh_11', type: 'SPIKE', x: 94, y: 1 },
      { id: 'sb_sh_12', type: 'BLOCK', x: 94, y: 7 },
      { id: 'sb_sh_13', type: 'BLOCK', x: 94, y: 6 },
      { id: 'sb_sh_14', type: 'SPIKE', x: 94, y: 5, rotation: 180 },

      // WAVE GAMEMODE BRIEF SHOWCASE
      { id: 'sb_wave_portal', type: 'PORTAL_WAVE', x: 102, y: 0, height: 8 },
      { id: 'sb_wv_1', type: 'BLOCK', x: 109, y: 0 },
      { id: 'sb_wv_2', type: 'BLOCK', x: 109, y: 1 },
      { id: 'sb_wv_3', type: 'SPIKE', x: 109, y: 2 },
      { id: 'sb_wv_4', type: 'BLOCK', x: 115, y: 7 },
      { id: 'sb_wv_5', type: 'BLOCK', x: 115, y: 6 },
      { id: 'sb_wv_6', type: 'SPIKE', x: 115, y: 5, rotation: 180 },
      { id: 'sb_wv_7', type: 'BLOCK', x: 121, y: 0 },
      { id: 'sb_wv_8', type: 'SPIKE', x: 121, y: 1 },
      { id: 'sb_wv_9', type: 'BLOCK', x: 121, y: 7 },
      { id: 'sb_wv_10', type: 'SPIKE', x: 121, y: 6, rotation: 180 },

      // Back to CUBE for grand finale
      { id: 'sb_cube_portal', type: 'PORTAL_CUBE', x: 128, y: 0, height: 8 },
      { id: 'sb_43', type: 'JUMP_PAD_YELLOW', x: 135, y: 0 },
      { id: 'sb_44', type: 'SPIKE', x: 137, y: 0 },
      { id: 'sb_45', type: 'SPIKE', x: 138, y: 0 },
      { id: 'sb_46', type: 'SPIKE', x: 139, y: 0 },
      { id: 'sb_47', type: 'JUMP_RING_YELLOW', x: 141, y: 3 },
      { id: 'sb_48', type: 'BLOCK', x: 144, y: 1 },
      { id: 'sb_49', type: 'BLOCK', x: 145, y: 1 },
      { id: 'sb_50', type: 'SPIKE', x: 149, y: 0 },
      { id: 'sb_51', type: 'SPIKE', x: 154, y: 0 },
      { id: 'sb_52', type: 'SPIKE', x: 155, y: 0 },
      { id: 'sb_c3', type: 'SECRET_COIN', x: 154.5, y: 2.2 },
    ],
  },
  {
    id: 'back_on_cyber',
    name: 'Back On Cyber',
    difficulty: 'Hard',
    stars: 6,
    trackPresetId: 'cyber_rush',
    speedMultiplier: 1.15,
    lengthUnits: 196,
    startingMode: 'CUBE',
    bgGradient: ['#2e1065', '#4c0519'],
    floorColor: '#831843',
    accentColor: '#ff0055',
    objects: [
      // Fast spikes
      { id: 'boc_1', type: 'SPIKE', x: 10, y: 0 },
      { id: 'boc_2', type: 'SPIKE', x: 15, y: 0 },
      { id: 'boc_3', type: 'SPIKE', x: 16, y: 0 },

      // Pad jump onto floating blocks with rotated side spikes
      { id: 'boc_4', type: 'JUMP_PAD_YELLOW', x: 21, y: 0 },
      { id: 'boc_5', type: 'SPIKE', x: 23, y: 0 },
      { id: 'boc_6', type: 'SPIKE', x: 24, y: 0 },
      { id: 'boc_7', type: 'SPIKE', x: 25, y: 0 },
      { id: 'boc_8', type: 'BLOCK', x: 26, y: 2 },
      { id: 'boc_9', type: 'BLOCK', x: 27, y: 2 },
      { id: 'boc_9_rot', type: 'SPIKE', x: 25, y: 2, rotation: 270 }, // Left-facing spike on left edge

      // Gravity Inversion Section with 180-deg rotated ceiling spikes!
      { id: 'boc_10', type: 'GRAVITY_PORTAL_BLUE', x: 32, y: 0, height: 8 },
      { id: 'boc_13', type: 'SPIKE', x: 40, y: 7, rotation: 180 },
      { id: 'boc_14', type: 'SPIKE', x: 44, y: 7, rotation: 180 },
      { id: 'boc_c1', type: 'SECRET_COIN', x: 44, y: 5.2, rotation: 180 },
      { id: 'boc_15', type: 'GRAVITY_PORTAL_YELLOW', x: 48, y: 0, height: 8 },

      // BALL GAMEMODE SECTION (Gravity switch rolling)
      { id: 'boc_ball_portal', type: 'PORTAL_BALL', x: 55, y: 0, height: 8 },
      { id: 'boc_bl_1', type: 'SPIKE', x: 60, y: 0 },
      { id: 'boc_bl_2', type: 'SPIKE', x: 61, y: 0 },
      { id: 'boc_bl_3', type: 'SPIKE', x: 66, y: 7, rotation: 180 },
      { id: 'boc_bl_4', type: 'SPIKE', x: 67, y: 7, rotation: 180 },
      { id: 'boc_bl_5', type: 'BLOCK', x: 72, y: 3, rotation: 45 }, // Rotated center diamond obstacle
      { id: 'boc_bl_6', type: 'SPIKE', x: 73, y: 0 },
      { id: 'boc_bl_7', type: 'SPIKE', x: 78, y: 7, rotation: 180 },
      { id: 'boc_c2', type: 'SECRET_COIN', x: 78, y: 5.0 },
      { id: 'boc_bl_8', type: 'SPIKE', x: 84, y: 0 },
      { id: 'boc_bl_9', type: 'SPIKE', x: 85, y: 0 },

      // SHIP + WAVE COMBO
      { id: 'boc_ship_portal', type: 'PORTAL_SHIP', x: 92, y: 0, height: 8 },
      { id: 'boc_sh_1', type: 'BLOCK', x: 99, y: 0 },
      { id: 'boc_sh_2', type: 'SPIKE', x: 99, y: 1 },
      { id: 'boc_sh_3', type: 'BLOCK', x: 99, y: 7 },
      { id: 'boc_sh_4', type: 'SPIKE', x: 99, y: 6, rotation: 180 },
      { id: 'boc_sh_5', type: 'BLOCK', x: 106, y: 3, rotation: 45 },
      { id: 'boc_sh_6', type: 'BLOCK', x: 113, y: 4, rotation: 45 },

      { id: 'boc_wave_portal', type: 'PORTAL_WAVE', x: 120, y: 0, height: 8 },
      { id: 'boc_wv_1', type: 'BLOCK', x: 127, y: 0 },
      { id: 'boc_wv_2', type: 'BLOCK', x: 127, y: 1 },
      { id: 'boc_wv_3', type: 'SPIKE', x: 127, y: 2 },
      { id: 'boc_wv_4', type: 'BLOCK', x: 134, y: 7 },
      { id: 'boc_wv_5', type: 'BLOCK', x: 134, y: 6 },
      { id: 'boc_wv_6', type: 'SPIKE', x: 134, y: 5, rotation: 180 },
      { id: 'boc_wv_7', type: 'BLOCK', x: 141, y: 0 },
      { id: 'boc_wv_8', type: 'SPIKE', x: 141, y: 1 },
      { id: 'boc_wv_9', type: 'BLOCK', x: 141, y: 7 },
      { id: 'boc_wv_10', type: 'SPIKE', x: 141, y: 6, rotation: 180 },

      // Back to CUBE for finale
      { id: 'boc_cube_portal', type: 'PORTAL_CUBE', x: 149, y: 0, height: 8 },
      { id: 'boc_35', type: 'JUMP_PAD_YELLOW', x: 156, y: 0 },
      { id: 'boc_36', type: 'BLOCK', x: 159, y: 3 },
      { id: 'boc_37', type: 'BLOCK', x: 160, y: 3 },
      { id: 'boc_38', type: 'SPIKE', x: 164, y: 0 },
      { id: 'boc_39', type: 'SPIKE', x: 165, y: 0 },
      { id: 'boc_40', type: 'SPIKE', x: 170, y: 0 },
      { id: 'boc_41', type: 'SPIKE', x: 171, y: 0 },
      { id: 'boc_42', type: 'SPIKE', x: 172, y: 0 },
      { id: 'boc_c3', type: 'SECRET_COIN', x: 171, y: 1.85 },
    ],
  },
  {
    id: 'neon_demon',
    name: 'Neon Demon',
    difficulty: 'Demon',
    stars: 10,
    trackPresetId: 'neon_demon',
    speedMultiplier: 1.3,
    lengthUnits: 235,
    startingMode: 'CUBE',
    bgGradient: ['#17051e', '#3b0764'],
    floorColor: '#581c87',
    accentColor: '#10b981',
    objects: [
      // Triple Spikes on entry
      { id: 'nd_1', type: 'SPIKE', x: 9, y: 0 },
      { id: 'nd_2', type: 'SPIKE', x: 10, y: 0 },
      { id: 'nd_3', type: 'SPIKE', x: 11, y: 0 },

      // High precision pad jump + rotated spike hazard
      { id: 'nd_4', type: 'JUMP_PAD_PINK', x: 15, y: 0 },
      { id: 'nd_5', type: 'BLOCK', x: 17, y: 1 },
      { id: 'nd_5_rot', type: 'SPIKE', x: 18, y: 1, rotation: 90 },
      { id: 'nd_6', type: 'SPIKE', x: 19, y: 0 },
      { id: 'nd_7', type: 'SPIKE', x: 20, y: 0 },

      // Gravity Portal switches with generous landing runways before spikes
      { id: 'nd_8', type: 'GRAVITY_PORTAL_BLUE', x: 24, y: 0, height: 8 },
      { id: 'nd_9', type: 'SPIKE', x: 33, y: 7, rotation: 180 },
      { id: 'nd_10', type: 'SPIKE', x: 34, y: 7, rotation: 180 },
      { id: 'nd_11', type: 'GRAVITY_PORTAL_YELLOW', x: 39, y: 0, height: 8 },
      { id: 'nd_12', type: 'SPIKE', x: 48, y: 0 },
      { id: 'nd_13', type: 'SPIKE', x: 49, y: 0 },

      // Ring Double-Tap Rush
      { id: 'nd_14', type: 'JUMP_RING_YELLOW', x: 53, y: 2 },
      { id: 'nd_15', type: 'JUMP_RING_YELLOW', x: 56, y: 3 },
      { id: 'nd_c1', type: 'SECRET_COIN', x: 57, y: 4.3 },
      { id: 'nd_16', type: 'BLOCK', x: 59, y: 2 },
      { id: 'nd_17', type: 'BLOCK', x: 60, y: 2 },

      // WAVE DEMON CORRIDOR (45 deg diagonal blocks & rotated spikes)
      { id: 'nd_wave_portal', type: 'PORTAL_WAVE', x: 67, y: 0, height: 8 },
      { id: 'nd_wv_1', type: 'BLOCK', x: 74, y: 0 },
      { id: 'nd_wv_2', type: 'BLOCK', x: 74, y: 1 },
      { id: 'nd_wv_3', type: 'SPIKE', x: 74, y: 2 },
      { id: 'nd_wv_4', type: 'BLOCK', x: 80, y: 7 },
      { id: 'nd_wv_5', type: 'BLOCK', x: 80, y: 6 },
      { id: 'nd_wv_6', type: 'SPIKE', x: 80, y: 5, rotation: 180 },
      { id: 'nd_wv_7', type: 'BLOCK', x: 86, y: 3.5, rotation: 45 }, // Rotated center diamond!
      { id: 'nd_wv_8', type: 'SPIKE', x: 86, y: 0 },
      { id: 'nd_wv_9', type: 'SPIKE', x: 86, y: 7, rotation: 180 },
      { id: 'nd_wv_10', type: 'BLOCK', x: 93, y: 0 },
      { id: 'nd_wv_11', type: 'SPIKE', x: 93, y: 1 },
      { id: 'nd_wv_12', type: 'BLOCK', x: 93, y: 7 },
      { id: 'nd_wv_13', type: 'SPIKE', x: 93, y: 6, rotation: 180 },

      // BALL GAMEMODE GAUNTLET
      { id: 'nd_ball_portal', type: 'PORTAL_BALL', x: 101, y: 0, height: 8 },
      { id: 'nd_bl_1', type: 'SPIKE', x: 107, y: 0 },
      { id: 'nd_bl_2', type: 'SPIKE', x: 108, y: 0 },
      { id: 'nd_bl_3', type: 'SPIKE', x: 113, y: 7, rotation: 180 },
      { id: 'nd_bl_4', type: 'SPIKE', x: 114, y: 7, rotation: 180 },
      { id: 'nd_bl_5', type: 'BLOCK', x: 119, y: 2 },
      { id: 'nd_bl_6', type: 'SPIKE', x: 118, y: 2, rotation: 270 }, // Left-facing spike
      { id: 'nd_bl_7', type: 'SPIKE', x: 120, y: 2, rotation: 90 }, // Right-facing spike
      { id: 'nd_bl_8', type: 'SPIKE', x: 119, y: 0 },
      { id: 'nd_bl_9', type: 'SPIKE', x: 125, y: 7, rotation: 180 },
      { id: 'nd_c2', type: 'SECRET_COIN', x: 125, y: 5.0 },
      { id: 'nd_bl_10', type: 'SPIKE', x: 131, y: 0 },
      { id: 'nd_bl_11', type: 'SPIKE', x: 132, y: 0 },

      // SHIP TURBO FINALE
      { id: 'nd_ship_portal', type: 'PORTAL_SHIP', x: 139, y: 0, height: 8 },
      { id: 'nd_sh_1', type: 'BLOCK', x: 146, y: 0 },
      { id: 'nd_sh_2', type: 'SPIKE', x: 146, y: 1 },
      { id: 'nd_sh_3', type: 'BLOCK', x: 146, y: 7 },
      { id: 'nd_sh_4', type: 'SPIKE', x: 146, y: 6, rotation: 180 },
      { id: 'nd_sh_5', type: 'BLOCK', x: 153, y: 3, rotation: 45 },
      { id: 'nd_sh_6', type: 'BLOCK', x: 160, y: 4.5, rotation: 45 },
      { id: 'nd_sh_7', type: 'BLOCK', x: 167, y: 2.5, rotation: 45 },
      { id: 'nd_sh_8', type: 'SPIKE', x: 167, y: 7, rotation: 180 },

      // Final CUBE triple-spike finale
      { id: 'nd_cube_portal', type: 'PORTAL_CUBE', x: 175, y: 0, height: 8 },
      { id: 'nd_27', type: 'SPIKE', x: 183, y: 0 },
      { id: 'nd_28', type: 'SPIKE', x: 184, y: 0 },
      { id: 'nd_29', type: 'SPIKE', x: 185, y: 0 },
      { id: 'nd_30', type: 'BLOCK', x: 191, y: 1 },
      { id: 'nd_31', type: 'SPIKE', x: 196, y: 0 },
      { id: 'nd_32', type: 'SPIKE', x: 197, y: 0 },
      { id: 'nd_33', type: 'SPIKE', x: 198, y: 0 },
      { id: 'nd_c3', type: 'SECRET_COIN', x: 197, y: 1.9 },
    ],
  },
];
