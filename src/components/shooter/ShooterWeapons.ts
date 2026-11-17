/**
 * Weapon Definitions & Configurations for Cyber Strike 3D
 */

export type WeaponId = 'plasma_rifle' | 'shotgun' | 'railgun';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  type: 'automatic' | 'scatter' | 'beam';
  damage: number;
  fireIntervalMs: number;
  magSize: number;
  maxReserve: number;
  reloadTimeMs: number;
  spread: number;
  pellets: number;
  color: string;
  accentColor: string;
  recoilKick: number;
  description: string;
}

export const WEAPON_DEFS: Record<WeaponId, WeaponDef> = {
  plasma_rifle: {
    id: 'plasma_rifle',
    name: 'PULSE-9 PLASMA RIFLE',
    type: 'automatic',
    damage: 28,
    fireIntervalMs: 115,
    magSize: 32,
    maxReserve: 192,
    reloadTimeMs: 1300,
    spread: 0.022,
    pellets: 1,
    color: '#00F0FF',
    accentColor: '#0088FF',
    recoilKick: 0.05,
    description: 'High rate-of-fire ionized plasma pulse with balanced stability.',
  },
  shotgun: {
    id: 'shotgun',
    name: 'VULCAN-8 SCATTER SHOTGUN',
    type: 'scatter',
    damage: 18, // 18 * 8 = 144 max point-blank damage
    fireIntervalMs: 680,
    magSize: 8,
    maxReserve: 48,
    reloadTimeMs: 1750,
    spread: 0.085,
    pellets: 8,
    color: '#FF4422',
    accentColor: '#FFAA00',
    recoilKick: 0.16,
    description: '8-pellet thermal dispersion core. Devastating at close range.',
  },
  railgun: {
    id: 'railgun',
    name: 'HYPERION-X RAILGUN',
    type: 'beam',
    damage: 195,
    fireIntervalMs: 1100,
    magSize: 4,
    maxReserve: 20,
    reloadTimeMs: 2100,
    spread: 0.002,
    pellets: 1,
    color: '#A855F7',
    accentColor: '#EC4899',
    recoilKick: 0.24,
    description: 'High-voltage magnetic beam accelerator. Pierces targets instantly.',
  },
};
