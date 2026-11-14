import React from 'react';
import { Radio, ShieldAlert, Trophy, Wallet, Zap } from 'lucide-react';
import { useGameStore } from '../store';
import { getBlacklistRankSummary, getProgressionStatus } from '../utils/raceTracks';
import { getCarDefinition } from '../utils/carCatalog';

export function PlayerRapSheet() {
  const driverAlias = useGameStore((s) => s.driverAlias);
  const cash = useGameStore((s) => s.cash);
  const completedRaces = useGameStore((s) => s.completedRaces);
  const car = useGameStore((s) => s.car);
  const selectedCarId = useGameStore((s) => s.selectedCarId);

  const carDef = getCarDefinition(selectedCarId);
  const rank = getBlacklistRankSummary(completedRaces);
  const totalStage = car.speedLevel + car.accelLevel + car.handlingLevel;
  const raceProgressPct = rank.totalEvents > 0 ? Math.round((rank.totalWins / rank.totalEvents) * 100) : 0;
  const stagePct = Math.round((totalStage / 15) * 100);

  return (
    <header className="pointer-events-auto inline-block mw-slant mw-glass border-l-4 border-l-[#FF8C00] px-5 py-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.85)]">
      <div className="mw-unslant flex flex-wrap items-center gap-4 sm:gap-6">
        {/* Module 1: Driver Profile & Rank Emblem */}
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 bg-[#181C24] border border-white/15 flex items-center justify-center shrink-0 shadow-inner">
            <ShieldAlert className="w-4 h-4 text-[#FF8C00]" />
            <div className="absolute -bottom-1 -right-1 px-1 bg-[#FF8C00] text-[#0D0F14] font-mono font-black text-[8px] leading-tight">
              #{rank.rankNumber.toString().padStart(2, '0')}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.22em] text-[#8E96A4] leading-none">
              <span>DRIVER TELEMETRY</span>
              <span className="text-[#3A3E45]">·</span>
              <span className="text-[#00B0FF] font-bold">{carDef.title}</span>
            </div>
            <div className="font-[family-name:var(--font-racing)] italic font-black uppercase text-lg tracking-wider text-[#FFFFFF] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] mt-0.5">
              {driverAlias}
            </div>
          </div>
        </div>

        {/* Angled Slash Divider */}
        <span className="text-[#3A3E45] font-mono text-base font-bold hidden sm:inline select-none">/</span>

        {/* Module 2: Blacklist Status */}
        <div className="min-w-[120px]">
          <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#8E96A4] leading-none mb-1">
            BLACKLIST STATUS
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-[family-name:var(--font-display)] italic font-extrabold uppercase text-base tracking-wider text-[#FF8C00] tabular-nums">
              {rank.rankLabel}
            </span>
          </div>
          {/* Micro Progress Underline */}
          <div className="h-1 w-full bg-[#181C24] border border-white/10 mt-1 overflow-hidden rounded-xs">
            <div
              className="h-full bg-gradient-to-r from-[#FF8C00] to-[#FF5500] transition-all duration-300"
              style={{ width: `${Math.max(10, Math.min(100, (11 - rank.rankNumber) * 10))}%` }}
            />
          </div>
        </div>

        {/* Angled Slash Divider */}
        <span className="text-[#3A3E45] font-mono text-base font-bold hidden md:inline select-none">/</span>

        {/* Module 3: Completed Events */}
        <div className="min-w-[110px]">
          <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.2em] text-[#8E96A4] leading-none mb-1">
            <span className="flex items-center gap-1">
              <Trophy className="w-3 h-3 text-[#FF8C00]" />
              <span>COMPLETED</span>
            </span>
            <span className="text-zinc-400 font-mono text-[9px]">{raceProgressPct}%</span>
          </div>
          <div className="font-mono font-bold text-sm text-[#FFFFFF] tabular-nums leading-tight">
            {rank.totalWins} / {rank.totalEvents} <span className="text-[10px] text-[#8E96A4]">RACES</span>
          </div>
          {/* Micro Progress Underline */}
          <div className="h-1 w-full bg-[#181C24] border border-white/10 mt-1 overflow-hidden rounded-xs">
            <div
              className="h-full bg-gradient-to-r from-[#FF8C00] to-[#E65100] transition-all duration-300"
              style={{ width: `${raceProgressPct}%` }}
            />
          </div>
        </div>

        {/* Angled Slash Divider */}
        <span className="text-[#3A3E45] font-mono text-base font-bold hidden sm:inline select-none">/</span>

        {/* Module 4: Bounty / Cash & Spec Stage */}
        <div className="min-w-[130px]">
          <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.2em] text-[#8E96A4] leading-none mb-1">
            <span className="flex items-center gap-1">
              <Wallet className="w-3 h-3 text-[#FF8C00]" />
              <span>BOUNTY / CASH</span>
            </span>
            <span className="text-[#00B0FF] font-mono font-bold text-[9px]">SPEC S{totalStage}</span>
          </div>
          <div className="font-mono font-bold text-sm text-[#FFFFFF] tabular-nums leading-tight">
            ${cash.toLocaleString()}
          </div>
          {/* Micro Progress Underline */}
          <div className="h-1 w-full bg-[#181C24] border border-white/10 mt-1 overflow-hidden rounded-xs">
            <div
              className="h-full bg-gradient-to-r from-[#00B0FF] to-[#0284c7] transition-all duration-300"
              style={{ width: `${stagePct}%` }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

interface ControlHint {
  keyLabel: string;
  action: string;
}

export function BottomControlTicker({ hints }: { hints: ControlHint[] }) {
  const driverAlias = useGameStore((s) => s.driverAlias);
  const cash = useGameStore((s) => s.cash);
  const completedRaces = useGameStore((s) => s.completedRaces);
  const prog = getProgressionStatus(completedRaces);

  const nextTarget = prog.finalBossDefeated
    ? 'GRAND CHAMPION STATUS CONFIRMED — ALL 10 BLACKLIST RIVALS NEUTRALIZED'
    : prog.finalBossUnlocked
    ? 'FINAL BOSS ALERT // APEX SOVEREIGN AWAITS IN 1V1 BLACKLIST FINALE'
    : prog.act2Unlocked
    ? `ACT II APEX SERIES ACTIVE // ${prog.act2Wins}/${prog.act2Total} BLACKLIST EVENTS CONQUERED`
    : prog.boss1Unlocked
    ? 'ACT I CLIMAX // CHALLENGE RAZOR IN 1V1 BOSS DUEL TO UNLOCK ACT II'
    : `ACT I SYNDICATE QUALIFIERS // WIN ${prog.act1Total - prog.act1Wins} MORE RACE(S) TO UNLOCK BOSS 1`;

  const scannerFeed = `STREET SCANNER // DISPATCH 09 // TARGET: ${driverAlias} // BOUNTY $${cash.toLocaleString()} // ${nextTarget} // HIGHWAY PATROL INTERCEPTORS MOBILIZED ON URBAN HIGHWAY 01 // SPIKE STRIP WARNING AT EAST BOULEVARD INTERSECTION // MAINTAIN CRITICAL VELOCITY`;

  return (
    <footer className="relative z-30 pointer-events-auto w-full bg-[#0D0F14]/94 backdrop-blur-md border-t border-[#3A3E45] px-4 md:px-8 h-10 flex items-center justify-between gap-6 shrink-0 shadow-[0_-6px_25px_rgba(0,0,0,0.7)]">
      {/* Left: Tactile Keycap Control Badges */}
      <div className="flex items-center gap-3 shrink-0 overflow-x-auto py-0.5">
        {hints.map((h) => {
          // Highlight keys like "W / S" into distinct keycaps
          const parts = h.keyLabel.split(' / ');
          return (
            <div key={h.keyLabel} className="flex items-center gap-1.5 whitespace-nowrap">
              <div className="flex items-center gap-1">
                {parts.map((k, ki) => (
                  <span
                    key={ki}
                    className="mw-keycap px-2 py-0.5 rounded-xs text-[10px] font-mono font-black text-[#FF8C00] uppercase tracking-wider"
                  >
                    {k}
                  </span>
                ))}
              </div>
              <span className="text-[11px] font-[family-name:var(--font-display)] italic font-bold uppercase tracking-wider text-[#E2E8F0]">
                {h.action}
              </span>
            </div>
          );
        })}
      </div>

      {/* Right: Police Scanner Live Broadcast Ticker */}
      <div className="hidden md:flex flex-1 min-w-0 items-center gap-3 overflow-hidden border-l border-[#3A3E45] pl-4">
        {/* Pulsing Police Radio Dispatch Badge */}
        <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-0.5 bg-[#181C24] border border-[#FF8C00]/40 rounded-xs shadow-sm">
          <span className="w-2 h-2 rounded-full bg-red-500 mw-radio-pulse shrink-0" />
          <Radio className="w-3 h-3 text-[#FF8C00] shrink-0" />
          <span className="text-[10px] font-[family-name:var(--font-display)] italic font-black uppercase tracking-widest text-[#FF8C00]">
            Scanner
          </span>
        </div>

        {/* Live CRT / Dot-Matrix Scanline Text Stream */}
        <div className="flex-1 min-w-0 overflow-hidden relative mw-scanline py-0.5">
          <div className="mw-ticker-track text-[11px] font-mono uppercase tracking-wider text-[#8E96A4]">
            <span className="pr-16 text-[#A0AEC0]">{scannerFeed}</span>
            <span className="pr-16 text-[#A0AEC0]" aria-hidden="true">
              {scannerFeed}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
