/**
 * Cyber Strike 3D Tactical HUD
 */

import React from 'react';
import {
  Activity,
  Crosshair,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { WeaponDef, WeaponId, WEAPON_DEFS } from './ShooterWeapons';
import { bgmPlayer } from '../../utils/bgmPlayer';

export interface ShooterHUDProps {
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  score: number;
  kills: number;
  wave: number;
  combo: number;
  activeWeaponId: WeaponId;
  ammoInMag: number;
  reserveAmmo: number;
  isReloading: boolean;
  reloadProgress: number; // 0..1
  isScoped: boolean;
  hitmarkerActive: boolean;
  isPointerLocked: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  enemyRadarDots: Array<{ x: number; y: number; isBoss?: boolean }>;
  recentKillText: string | null;
  onSelectWeapon: (id: WeaponId) => void;
  onRequestPointerLock: () => void;
  onResume: () => void;
  onRestart: () => void;
  onExitToStation: () => void;
}

export function ShooterHUD({
  health,
  maxHealth,
  shield,
  maxShield,
  score,
  kills,
  wave,
  combo,
  activeWeaponId,
  ammoInMag,
  reserveAmmo,
  isReloading,
  reloadProgress,
  isScoped,
  hitmarkerActive,
  isPointerLocked,
  isPaused,
  isGameOver,
  enemyRadarDots,
  recentKillText,
  onSelectWeapon,
  onRequestPointerLock,
  onResume,
  onRestart,
  onExitToStation,
}: ShooterHUDProps) {
  const [isMuted, setIsMuted] = React.useState(() => bgmPlayer.getState().isMuted);
  const currentWeapon: WeaponDef = WEAPON_DEFS[activeWeaponId];

  const hpPct = Math.max(0, Math.min(100, Math.round((health / maxHealth) * 100)));
  const shieldPct = Math.max(0, Math.min(100, Math.round((shield / maxShield) * 100)));

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-sans text-white">
      {/* 1. Tactical Top Bar */}
      <header className="absolute top-0 inset-x-0 p-4 md:px-8 flex items-center justify-between z-20">
        {/* Game Title & Mission Status */}
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-7 bg-[#00F0FF] shadow-[0_0_12px_#00F0FF]" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-[family-name:var(--font-racing)] italic font-black uppercase text-xl tracking-wider text-white">
                CYBER STRIKE 3D
              </span>
              <span className="px-2 py-0.5 bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] text-[10px] font-mono font-bold uppercase tracking-widest">
                WAVE {wave}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-[#8E96A4]">
              <span>SCORE: <strong className="text-white tabular-nums">{score.toLocaleString()}</strong></span>
              <span>KILLS: <strong className="text-white tabular-nums">{kills}</strong></span>
              {combo > 1 && (
                <span className="flex items-center gap-1 text-[#FF8C00] font-bold animate-pulse">
                  <Flame className="w-3.5 h-3.5" />
                  {combo}X COMBO
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center Radar / Compass */}
        <div className="hidden md:flex flex-col items-center">
          <div className="relative w-28 h-28 rounded-full bg-[#0D1117]/80 border border-[#00F0FF]/40 shadow-[0_0_16px_rgba(0,240,255,0.2)] flex items-center justify-center overflow-hidden">
            {/* Radar Sweep line */}
            <div className="absolute inset-0 border border-white/5 rounded-full" />
            <div className="absolute w-full h-[1px] bg-white/10" />
            <div className="absolute h-full w-[1px] bg-white/10" />
            {/* Center Player Dot */}
            <div className="w-2 h-2 rounded-full bg-[#00F0FF] shadow-[0_0_6px_#00F0FF] z-10" />

            {/* Enemy Dots */}
            {enemyRadarDots.map((dot, idx) => (
              <div
                key={idx}
                className="absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `calc(50% + ${dot.x * 46}px)`,
                  top: `calc(50% + ${dot.y * 46}px)`,
                  backgroundColor: dot.isBoss ? '#A855F7' : '#FF0055',
                  boxShadow: `0 0 6px ${dot.isBoss ? '#A855F7' : '#FF0055'}`,
                }}
              />
            ))}
          </div>
          <span className="mt-1 text-[9px] font-mono tracking-widest text-[#00F0FF]/80 uppercase">
            COMBAT RADAR
          </span>
        </div>

        {/* Right Station Actions & Sound */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Audio toggle */}
          <button
            type="button"
            onClick={() => {
              const muted = bgmPlayer.toggleMute();
              setIsMuted(muted);
            }}
            className="p-2 bg-[#0D1117]/80 hover:bg-[#1C222D] border border-white/10 hover:border-[#00F0FF] text-[#8E96A4] hover:text-[#00F0FF] transition-colors cursor-pointer"
            aria-label="Toggle Mute"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Exit to Station Hub */}
          <button
            type="button"
            onClick={onExitToStation}
            className="px-3.5 py-1.5 bg-[#141822]/90 hover:bg-[#FF8C00] hover:text-[#0D0F14] border border-[#3A3E45] hover:border-[#FFAA33] font-[family-name:var(--font-racing)] italic font-bold uppercase text-xs tracking-wider transition-all cursor-pointer shadow-md"
          >
            EXIT TO STATION
          </button>
        </div>
      </header>

      {/* 2. Scoped Sniper Overlay */}
      {isScoped && (
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
          <div className="relative w-[480px] h-[480px] rounded-full border-2 border-[#A855F7] shadow-[0_0_60px_rgba(168,85,247,0.4)] flex items-center justify-center">
            <div className="w-full h-[1px] bg-[#A855F7]/60" />
            <div className="h-full w-[1px] bg-[#A855F7]/60 absolute" />
            <div className="w-16 h-16 rounded-full border border-[#A855F7]/80 absolute" />
          </div>
        </div>
      )}

      {/* 3. Center Crosshair & Hitmarker */}
      {!isScoped && isPointerLocked && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-15">
          <div className="relative w-8 h-8 flex items-center justify-center">
            {/* Dynamic reticle based on weapon */}
            {activeWeaponId === 'plasma_rifle' && (
              <>
                <div className="w-1.5 h-1.5 bg-[#00F0FF] rounded-full shadow-[0_0_8px_#00F0FF]" />
                <div className="absolute -top-3 w-0.5 h-2 bg-[#00F0FF]/80" />
                <div className="absolute -bottom-3 w-0.5 h-2 bg-[#00F0FF]/80" />
                <div className="absolute -left-3 w-2 h-0.5 bg-[#00F0FF]/80" />
                <div className="absolute -right-3 w-2 h-0.5 bg-[#00F0FF]/80" />
              </>
            )}

            {activeWeaponId === 'shotgun' && (
              <div className="w-7 h-7 rounded-full border border-dashed border-[#FF4422] flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-[#FF4422] rounded-full shadow-[0_0_6px_#FF4422]" />
              </div>
            )}

            {activeWeaponId === 'railgun' && (
              <>
                <div className="w-2 h-2 bg-[#A855F7] rotate-45 shadow-[0_0_8px_#A855F7]" />
                <div className="absolute w-5 h-5 border border-[#A855F7]/60 rotate-45" />
              </>
            )}

            {/* Hitmarker confirmation */}
            {hitmarkerActive && (
              <div className="absolute w-6 h-6 border-2 border-red-500 rotate-45 animate-ping" />
            )}
          </div>
        </div>
      )}

      {/* 4. Kill Notification Toast */}
      {recentKillText && (
        <div className="absolute top-28 inset-x-0 flex justify-center z-20 pointer-events-none animate-bounce">
          <div className="px-4 py-1.5 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 text-[#0D0F14] font-[family-name:var(--font-racing)] italic font-black uppercase text-sm tracking-wider shadow-[0_0_20px_rgba(255,100,0,0.6)]">
            {recentKillText}
          </div>
        </div>
      )}

      {/* 5. Bottom HUD Dock: Health & Shields (Left), Weapon & Ammo (Right) */}
      <footer className="absolute bottom-0 inset-x-0 p-5 md:px-10 flex items-end justify-between z-20">
        {/* Bottom Left: Vitals Status */}
        <div className="flex flex-col gap-2.5 w-64 md:w-72 bg-[#0D1117]/85 backdrop-blur-md border border-[#3A3E45]/80 border-l-4 border-l-[#00F0FF] p-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.85)]">
          {/* Health Bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider mb-1">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Activity className="w-3.5 h-3.5" />
                HEALTH
              </span>
              <span className="text-white font-bold tabular-nums">
                {health} / {maxHealth}
              </span>
            </div>
            <div className="h-2.5 w-full bg-[#141822] border border-white/10 rounded-xs overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  hpPct < 30 ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                }`}
                style={{ width: `${hpPct}%` }}
              />
            </div>
          </div>

          {/* Plasma Shield Bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider mb-1">
              <span className="flex items-center gap-1.5 text-[#00F0FF] font-bold">
                <Shield className="w-3.5 h-3.5" />
                PLASMA SHIELD
              </span>
              <span className="text-white font-bold tabular-nums">
                {shield} / {maxShield}
              </span>
            </div>
            <div className="h-2 w-full bg-[#141822] border border-white/10 rounded-xs overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#0088FF] to-[#00F0FF] transition-all duration-200"
                style={{ width: `${shieldPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Center: Weapon Quick Selector */}
        <div className="hidden lg:flex items-center gap-2 pointer-events-auto">
          {(['plasma_rifle', 'shotgun', 'railgun'] as WeaponId[]).map((id, idx) => {
            const w = WEAPON_DEFS[id];
            const isEquipped = activeWeaponId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectWeapon(id)}
                className={`px-3 py-1.5 border font-mono text-xs uppercase flex items-center gap-2 transition-all cursor-pointer ${
                  isEquipped
                    ? 'bg-[#1C222D] border-[#00F0FF] text-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                    : 'bg-[#0D1117]/80 border-white/10 text-[#8E96A4] hover:text-white'
                }`}
              >
                <span className="font-bold text-[#FF8C00]">[{idx + 1}]</span>
                <span className="font-bold">{w.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom Right: Active Weapon & Ammo Counter */}
        <div className="flex flex-col items-end gap-2 w-64 md:w-72 bg-[#0D1117]/85 backdrop-blur-md border border-[#3A3E45]/80 border-r-4 border-r-[#FF8C00] p-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.85)]">
          <div className="flex items-center justify-between w-full border-b border-white/10 pb-1.5">
            <span className="font-[family-name:var(--font-racing)] italic font-black uppercase text-sm tracking-wider text-white">
              {currentWeapon.name}
            </span>
            <span className="text-[10px] font-mono text-[#FF8C00] uppercase font-bold">
              {currentWeapon.type}
            </span>
          </div>

          {/* Ammo display */}
          <div className="flex items-baseline gap-2">
            <span
              className={`font-mono font-black text-4xl tabular-nums ${
                ammoInMag === 0
                  ? 'text-red-500 animate-pulse'
                  : ammoInMag <= 5
                  ? 'text-yellow-400'
                  : 'text-white'
              }`}
            >
              {isReloading ? '--' : ammoInMag}
            </span>
            <span className="font-mono text-lg text-[#8E96A4]">/</span>
            <span className="font-mono text-lg font-bold text-[#8E96A4] tabular-nums">
              {reserveAmmo}
            </span>
          </div>

          {/* Reload status / Prompt */}
          {isReloading ? (
            <div className="w-full space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#00F0FF] uppercase">
                <span>RELOADING...</span>
                <span>{Math.round(reloadProgress * 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-[#141822] rounded-xs overflow-hidden">
                <div
                  className="h-full bg-[#00F0FF] transition-all duration-75"
                  style={{ width: `${reloadProgress * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-[10px] font-mono text-[#8E96A4]">
              {ammoInMag === 0 ? (
                <span className="text-red-400 font-bold animate-pulse">PRESS [R] TO RELOAD</span>
              ) : (
                <span>PRESS [R] TO RELOAD</span>
              )}
            </div>
          )}
        </div>
      </footer>

      {/* 6. Click to Play / Unlock Pointer Lock Splash Banner */}
      {!isPointerLocked && !isPaused && !isGameOver && (
        <div
          onClick={onRequestPointerLock}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-40 cursor-pointer pointer-events-auto"
        >
          <div className="p-8 max-w-md bg-[#0D1117] border-2 border-[#00F0FF] shadow-[0_0_40px_rgba(0,240,255,0.4)] text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#00F0FF]/15 border border-[#00F0FF] flex items-center justify-center text-[#00F0FF]">
              <Crosshair className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-racing)] italic font-black uppercase text-2xl tracking-wider text-white">
                CLICK TO ENGAGE ARENA
              </h2>
              <p className="font-mono text-xs text-[#8E96A4] mt-1">
                Locks mouse for 360° combat aim. Press [ESC] anytime to pause.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-left text-xs font-mono bg-[#141822] p-3 border border-white/5">
              <div><strong className="text-[#00F0FF]">WASD</strong> : Move</div>
              <div><strong className="text-[#00F0FF]">MOUSE</strong> : Aim &amp; Look</div>
              <div><strong className="text-[#00F0FF]">LEFT CLICK</strong> : Fire</div>
              <div><strong className="text-[#00F0FF]">RIGHT CLICK</strong> : Scope Zoom</div>
              <div><strong className="text-[#00F0FF]">SPACE</strong> : Jump / Launch Pad</div>
              <div><strong className="text-[#00F0FF]">1 / 2 / 3</strong> : Swap Weapon</div>
            </div>
            <button
              type="button"
              className="w-full py-2.5 bg-gradient-to-r from-[#00F0FF] to-[#0088FF] text-[#0D0F14] font-[family-name:var(--font-racing)] italic font-black uppercase text-sm tracking-wider shadow-lg"
            >
              START COMBAT
            </button>
          </div>
        </div>
      )}

      {/* 7. Pause Menu Modal */}
      {isPaused && (
        <div className="absolute inset-0 bg-[#0D0F14]/85 backdrop-blur-md flex items-center justify-center z-50 pointer-events-auto">
          <div className="w-full max-w-sm bg-[#0D1117] border-l-4 border-l-[#FF8C00] border border-white/10 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="font-[family-name:var(--font-racing)] italic font-black uppercase text-2xl tracking-wider text-white">
                SIMULATION PAUSED
              </h2>
            </div>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={onResume}
                className="w-full py-3 bg-gradient-to-r from-[#FF8C00] to-[#FF5500] hover:brightness-110 text-[#0D0F14] font-[family-name:var(--font-racing)] italic font-black uppercase text-sm tracking-wider shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                RESUME COMBAT
              </button>
              <button
                type="button"
                onClick={onRestart}
                className="w-full py-2.5 bg-[#141822] hover:bg-[#1C222D] border border-white/10 hover:border-[#00F0FF] text-white font-[family-name:var(--font-racing)] italic font-bold uppercase text-xs tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                RESTART WAVE
              </button>
              <button
                type="button"
                onClick={onExitToStation}
                className="w-full py-2.5 bg-[#141822] hover:bg-red-950 border border-white/10 hover:border-red-500 text-red-400 font-[family-name:var(--font-racing)] italic font-bold uppercase text-xs tracking-wider transition-colors cursor-pointer"
              >
                EXIT TO GAME STATION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Game Over Screen Modal */}
      {isGameOver && (
        <div className="absolute inset-0 bg-red-950/80 backdrop-blur-md flex items-center justify-center z-50 pointer-events-auto">
          <div className="w-full max-w-md bg-[#0D1117] border-2 border-red-500 p-8 shadow-[0_0_50px_rgba(239,68,68,0.5)] text-center space-y-5">
            <div className="inline-block px-3 py-1 bg-red-500/20 border border-red-500 text-red-400 font-mono text-xs uppercase tracking-widest">
              MISSION TERMINATED
            </div>
            <h2 className="font-[family-name:var(--font-racing)] italic font-black uppercase text-4xl tracking-wider text-white">
              SYSTEM BREACHED
            </h2>
            <div className="grid grid-cols-3 gap-3 p-3 bg-[#141822] border border-white/10 text-center font-mono">
              <div>
                <div className="text-[10px] text-[#8E96A4] uppercase">SURVIVED</div>
                <div className="text-lg font-bold text-white">WAVE {wave}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#8E96A4] uppercase">KILLS</div>
                <div className="text-lg font-bold text-[#00F0FF]">{kills}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#8E96A4] uppercase">FINAL SCORE</div>
                <div className="text-lg font-bold text-[#FF8C00]">{score.toLocaleString()}</div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onRestart}
                className="flex-1 py-3 bg-gradient-to-r from-[#00F0FF] to-[#0088FF] text-[#0D0F14] font-[family-name:var(--font-racing)] italic font-black uppercase text-sm tracking-wider shadow-lg cursor-pointer"
              >
                REDEPLOY
              </button>
              <button
                type="button"
                onClick={onExitToStation}
                className="flex-1 py-3 bg-[#141822] hover:bg-[#1C222D] border border-[#3A3E45] text-white font-[family-name:var(--font-racing)] italic font-black uppercase text-sm tracking-wider cursor-pointer"
              >
                GAME STATION
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
