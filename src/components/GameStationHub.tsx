/**
 * Apex Game Station: Unified Main Hub & Game Launcher
 * Features 3 premier title experiences:
 * 1. Neon Apex: Street Syndicate (Underground Racing & Free Roam)
 * 2. Cyber Strike 3D: Arena Shooter (First-Person Sci-Fi Combat)
 * 3. Neon Dash: Geometry Arcade (Rhythm Platformer with Procedural Arcade Music Generator)
 */

import React, { useEffect, useState } from 'react';
import {
  Award,
  Blocks,
  Car,
  Crosshair,
  Flame,
  Gamepad2,
  Music,
  Play,
  Sparkles,
  Volume2,
  VolumeX,
  Wand2,
  Zap,
} from 'lucide-react';
import { bgmPlayer, BgmState } from '../utils/bgmPlayer';

interface GameStationHubProps {
  onLaunchNeonApex: () => void;
  onLaunchShooter: () => void;
  onLaunchGeometryDash: () => void;
  onLaunchRoblox: () => void;
  onLaunchGuitarHero: () => void;
  onLaunchMario3D: () => void;
}

export function GameStationHub({
  onLaunchNeonApex,
  onLaunchShooter,
  onLaunchGeometryDash,
  onLaunchRoblox,
  onLaunchGuitarHero,
  onLaunchMario3D,
}: GameStationHubProps) {
  const [bgmState, setBgmState] = useState<BgmState>(() => bgmPlayer.getState());
  const [selectedGame, setSelectedGame] = useState<
    'GUITAR' | 'ROBLOX' | 'RACING' | 'SHOOTER' | 'DASH' | 'MARIO'
  >('MARIO');

  useEffect(() => {
    // When Game Station opens, ensure menu music (Hush - Fired Up) is playing
    bgmPlayer.setTrack('MENU');
    const unsubscribe = bgmPlayer.subscribe(setBgmState);
    return () => unsubscribe();
  }, []);

  return (
    <div className="relative w-full h-full bg-[#07090D] overflow-y-auto overflow-x-hidden flex flex-col justify-between text-white font-sans select-none">
      {/* Background Cyber Grid & Radiant Ambience */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 140, 0, 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0, 240, 255, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-radial from-transparent via-[#07090D]/60 to-[#07090D]" />
      </div>

      {/* Top Station Header */}
      <header className="relative z-10 px-6 md:px-12 py-5 border-b border-white/10 backdrop-blur-md bg-[#0D1017]/80 flex flex-wrap items-center justify-between gap-4">
        {/* Brand Lockup */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#FF8C00] via-[#FF5500] to-[#00F0FF] p-[2px] shadow-[0_0_20px_rgba(255,140,0,0.4)]">
            <div className="w-full h-full bg-[#07090D] flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-[#FF8C00]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-[family-name:var(--font-racing)] italic font-black uppercase text-xl md:text-2xl tracking-wider text-white">
                APEX GAME STATION
              </h1>
              <span className="px-2 py-0.5 bg-[#FF8C00]/20 border border-[#FF8C00]/40 text-[#FF8C00] text-[9px] font-mono font-bold uppercase tracking-widest">
                5-TITLE SUITE
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#8E96A4] tracking-widest uppercase">
              SELECT TITLE // GUITAR HERO 3D · ROBLOX 3D · GEOMETRY DASH · RACING · 3D SHOOTER
            </p>
          </div>
        </div>

        {/* Live Music Player Controller Widget */}
        <div className="flex items-center gap-3 bg-[#141822]/90 border border-white/10 px-3.5 py-2 shadow-lg">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-[#FF8C00] animate-bounce" />
            <div className="text-left">
              <div className="text-[9px] font-mono uppercase tracking-widest text-[#8E96A4]">
                {bgmState.isPlaying ? 'NOW PLAYING' : 'AUDIO PAUSED'}
              </div>
              <div className="text-xs font-mono font-bold text-white max-w-[190px] truncate">
                {bgmState.artist} — {bgmState.trackTitle}
              </div>
            </div>
          </div>

          {/* Equalizer Waveform animation */}
          <div className="flex items-end gap-1 h-4 px-1">
            {[0.4, 0.8, 1.0, 0.6, 0.9, 0.5].map((scale, i) => (
              <div
                key={i}
                className="w-1 bg-[#FF8C00] rounded-xs"
                style={{
                  height: bgmState.isPlaying ? `${scale * 100}%` : '20%',
                  transition: 'height 0.2s ease',
                }}
              />
            ))}
          </div>

          {/* Play/Pause & Mute controls */}
          <div className="flex items-center gap-1.5 border-l border-white/10 pl-2">
            <button
              type="button"
              onClick={() => bgmPlayer.togglePlayPause()}
              className="p-1.5 bg-[#0D0F14] hover:bg-[#FF8C00] hover:text-[#0D0F14] text-white transition-colors cursor-pointer"
              title={bgmState.isPlaying ? 'Pause Music' : 'Play Music'}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
            <button
              type="button"
              onClick={() => bgmPlayer.toggleMute()}
              className="p-1.5 bg-[#0D0F14] hover:bg-white/20 text-[#8E96A4] hover:text-white transition-colors cursor-pointer"
              title={bgmState.isMuted ? 'Unmute' : 'Mute'}
            >
              {bgmState.isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Triple Game Showcase */}
      <main className="relative z-10 flex-1 px-6 md:px-8 py-8 flex flex-col justify-center max-w-[1460px] mx-auto w-full">
        <div className="text-center mb-6">
          <div className="inline-block px-3 py-1 bg-gradient-to-r from-[#FF8C00]/20 via-[#00F0FF]/20 to-transparent border-l-2 border-l-[#00F0FF] text-[10px] font-mono uppercase tracking-[0.25em] text-[#00F0FF] mb-2">
            AVAILABLE TITLE EXPERIENCES
          </div>
          <h2 className="font-[family-name:var(--font-racing)] italic font-black uppercase text-3xl md:text-5xl tracking-wider text-white">
            CHOOSE YOUR DISCIPLINE
          </h2>
        </div>

        {/* 6-Title Showcase Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-stretch">
          {/* Card: Super Mario 3D */}
          <div
            onMouseEnter={() => setSelectedGame('MARIO')}
            className={`group relative flex flex-col justify-between p-6 bg-gradient-to-b from-[#2e1015]/95 to-[#1a080c]/98 border transition-all duration-300 ${
              selectedGame === 'MARIO'
                ? 'border-[#EF4444] shadow-[0_0_35px_rgba(239,68,68,0.35)] -translate-y-1'
                : 'border-white/10 hover:border-white/30'
            }`}
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#EF4444] via-[#F59E0B] to-[#22C55E]" />

            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#EF4444]/20 border border-[#EF4444]/50 text-[#FCA5A5] text-[10px] font-mono font-bold uppercase tracking-widest">
                  <Award className="w-3.5 h-3.5" />
                  3D PLATFORMER
                </span>
                <span className="text-[9px] font-mono text-[#F59E0B] uppercase font-bold">
                  WORLD 1-1
                </span>
              </div>

              <h3 className="font-[family-name:var(--font-racing)] italic font-black uppercase text-2xl md:text-3xl tracking-wider text-white group-hover:text-[#FCA5A5] transition-colors">
                SUPER MARIO 3D
              </h3>
              <p className="mt-2 text-xs text-[#8E96A4] leading-relaxed">
                Jump and run through the 3D Mushroom Kingdom! Navigate floating platforms, green pipes, collect gold coins, and reach the castle flagpole to save the kingdom.
              </p>

              <div className="flex flex-wrap gap-1.5 mt-4">
                {[
                  '3D Mario Rig',
                  'Floating Platforms',
                  'Gold Coins',
                  'Green Warp Pipes',
                  'Castle Flag',
                  'Retro SFX',
                ].map((chip) => (
                  <span
                    key={chip}
                    className="px-2 py-0.5 bg-[#0D0F14] border border-white/10 text-[10px] font-mono text-zinc-300 flex items-center gap-1"
                  >
                    <Award className="w-2.5 h-2.5 text-[#EF4444]" />
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  bgmPlayer.unlock();
                  onLaunchMario3D();
                }}
                className="w-full py-3.5 bg-gradient-to-r from-[#EF4444] via-[#F59E0B] to-[#22C55E] hover:brightness-110 text-white font-[family-name:var(--font-racing)] italic font-black uppercase text-base tracking-wider shadow-[0_8px_24px_rgba(239,68,68,0.35)] flex items-center justify-center gap-2 transition-transform cursor-pointer"
              >
                <Award className="w-4 h-4" />
                ENTER SUPER MARIO 3D
              </button>
            </div>
          </div>
          {/* Card 0: Shred Hero 3D (Guitar Hero) */}
          <div
            onMouseEnter={() => setSelectedGame('GUITAR')}
            className={`group relative flex flex-col justify-between p-5 bg-gradient-to-b from-[#231016]/95 to-[#0D070A]/98 border transition-all duration-300 ${
              selectedGame === 'GUITAR'
                ? 'border-[#F43F5E] shadow-[0_0_35px_rgba(244,63,94,0.35)] -translate-y-1'
                : 'border-white/10 hover:border-white/30'
            }`}
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#22C55E] via-[#FACC15] to-[#EF4444]" />

            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="flex items-center gap-1.5 px-2 py-1 bg-[#F43F5E]/20 border border-[#F43F5E]/50 text-[#FDA4AF] text-[10px] font-mono font-bold uppercase tracking-widest">
                  <Flame className="w-3.5 h-3.5" />
                  3D RHYTHM ROCK
                </span>
                <span className="text-[9px] font-mono text-[#FACC15] uppercase font-bold">
                  LIVE SYNTH AMP
                </span>
              </div>

              <h3 className="font-[family-name:var(--font-racing)] italic font-black uppercase text-2xl tracking-wider text-white group-hover:text-[#FDA4AF] transition-colors">
                SHRED HERO 3D: GUITAR
              </h3>
              <p className="mt-2 text-xs text-[#8E96A4] leading-relaxed">
                5-lane sculpted rosewood highway with 3D steel strings, scrolling fret bars, headstock &amp; amp stacks, 7-part note gems, depressing piston fret heads, hit flames, and live tube-overdrive guitar audio!
              </p>

              <div className="flex flex-wrap gap-1.5 mt-4">
                {[
                  '3D Rosewood Neck',
                  '7-Part Notes',
                  'Piston Fret Heads',
                  'HOPO & Star Power',
                  'Amp Stacks',
                  'Tap / Strum',
                ].map((chip) => (
                  <span
                    key={chip}
                    className="px-2 py-0.5 bg-[#0D0F14] border border-white/10 text-[10px] font-mono text-zinc-300 flex items-center gap-1"
                  >
                    <Flame className="w-2.5 h-2.5 text-[#F43F5E]" />
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-white/10">
              <button
                type="button"
                onClick={onLaunchGuitarHero}
                className="w-full py-3.5 bg-gradient-to-r from-[#EF4444] via-[#F97316] to-[#FACC15] hover:brightness-110 text-[#07090D] font-[family-name:var(--font-racing)] italic font-black uppercase text-base tracking-wider shadow-[0_8px_24px_rgba(244,63,94,0.35)] flex items-center justify-center gap-2 transition-transform cursor-pointer"
              >
                <Flame className="w-4 h-4" />
                ENTER SHRED HERO 3D
              </button>
            </div>
          </div>

          {/* Card 1: BloxVerse 3D: Avatar Obby World */}
          <div
            onMouseEnter={() => setSelectedGame('ROBLOX')}
            className={`group relative flex flex-col justify-between p-6 bg-gradient-to-b from-[#0F2133]/95 to-[#08101A]/98 border transition-all duration-300 ${
              selectedGame === 'ROBLOX'
                ? 'border-[#38BDF8] shadow-[0_0_35px_rgba(56,189,248,0.35)] -translate-y-1'
                : 'border-white/10 hover:border-white/30'
            }`}
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#38BDF8] via-[#22C55E] to-[#FACC15]" />

            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#38BDF8]/20 border border-[#38BDF8]/50 text-[#7DD3FC] text-[10px] font-mono font-bold uppercase tracking-widest">
                  <Blocks className="w-3.5 h-3.5" />
                  3D SANDBOX OBBY
                </span>
                <span className="text-[9px] font-mono text-[#22C55E] uppercase font-bold">
                  15-PART R15 RIG
                </span>
              </div>

              <h3 className="font-[family-name:var(--font-racing)] italic font-black uppercase text-2xl tracking-wider text-white group-hover:text-[#7DD3FC] transition-colors">
                BLOXVERSE 3D: OBBY WORLD
              </h3>
              <p className="mt-2 text-xs text-[#8E96A4] leading-relaxed">
                Explore Blox Plaza &amp; conquer the 10-stage Sky Obby with an articulated 15-part R15 avatar, procedural walk/run/climb/emote animations, custom hats &amp; outfits, moving sliders, sweepers, and trusses.
              </p>

              <div className="flex flex-wrap gap-1.5 mt-4">
                {[
                  '15-Part R15 Rig',
                  '10-Stage Obby',
                  'Avatar Studio',
                  'Emote Wheel',
                  'Truss Climbs',
                  'Bounce Pads',
                ].map((chip) => (
                  <span
                    key={chip}
                    className="px-2 py-0.5 bg-[#0D0F14] border border-white/10 text-[10px] font-mono text-zinc-300 flex items-center gap-1"
                  >
                    <Blocks className="w-2.5 h-2.5 text-[#38BDF8]" />
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-white/10">
              <button
                type="button"
                onClick={onLaunchRoblox}
                className="w-full py-3.5 bg-gradient-to-r from-[#38BDF8] via-[#22C55E] to-[#FACC15] hover:brightness-110 text-[#07090D] font-[family-name:var(--font-racing)] italic font-black uppercase text-base tracking-wider shadow-[0_8px_24px_rgba(56,189,248,0.35)] flex items-center justify-center gap-2 transition-transform cursor-pointer"
              >
                <Blocks className="w-4 h-4" />
                ENTER BLOXVERSE 3D
              </button>
            </div>
          </div>

          {/* Card 1: Neon Dash: Geometry Arcade */}
          <div
            onMouseEnter={() => setSelectedGame('DASH')}
            className={`group relative flex flex-col justify-between p-6 bg-gradient-to-b from-[#181324]/95 to-[#0A0813]/98 border transition-all duration-300 ${
              selectedGame === 'DASH'
                ? 'border-[#A855F7] shadow-[0_0_35px_rgba(168,85,247,0.35)] -translate-y-1'
                : 'border-white/10 hover:border-white/30'
            }`}
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#A855F7] via-[#EC4899] to-[#00F0FF]" />

            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#A855F7]/20 border border-[#A855F7]/50 text-[#C084FC] text-[10px] font-mono font-bold uppercase tracking-widest">
                  <Zap className="w-3.5 h-3.5" />
                  RHYTHM PLATFORMER
                </span>
                <span className="text-[9px] font-mono text-[#EC4899] uppercase font-bold">
                  BANGER ARCADE BEATS
                </span>
              </div>

              <h3 className="font-[family-name:var(--font-racing)] italic font-black uppercase text-2xl md:text-3xl tracking-wider text-white group-hover:text-[#F472B6] transition-colors">
                NEON DASH: GEOMETRY ARCADE
              </h3>
              <p className="mt-2 text-xs text-[#8E96A4] leading-relaxed">
                Authentic geometric rhythm platformer! Dodge spikes, launch off bounce pads, chain mid-air gravity orbs, flip through gravity portals, and generate your own procedural arcade EDM beats on the fly!
              </p>

              {/* Highlights Chips */}
              <div className="flex flex-wrap gap-1.5 mt-4">
                {[
                  'Beat Synthesizer',
                  'Gravity Portals',
                  'Jump Rings',
                  'Secret Coins',
                  'Practice Mode',
                  'Cube Customizer',
                ].map((chip) => (
                  <span
                    key={chip}
                    className="px-2 py-0.5 bg-[#0D0F14] border border-white/10 text-[10px] font-mono text-zinc-300 flex items-center gap-1"
                  >
                    <Wand2 className="w-2.5 h-2.5 text-[#A855F7]" />
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            {/* Launch Button */}
            <div className="mt-6 pt-5 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  onLaunchGeometryDash();
                }}
                className="w-full py-3.5 bg-gradient-to-r from-[#A855F7] via-[#EC4899] to-[#00F0FF] hover:brightness-110 text-white font-[family-name:var(--font-racing)] italic font-black uppercase text-base tracking-wider shadow-[0_8px_24px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2 transition-transform cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current" />
                ENTER NEON DASH
              </button>
            </div>
          </div>

          {/* Card 2: Neon Apex (Racing & Free Roam) */}
          <div
            onMouseEnter={() => setSelectedGame('RACING')}
            className={`group relative flex flex-col justify-between p-6 bg-gradient-to-b from-[#131722]/90 to-[#0A0D13]/95 border transition-all duration-300 ${
              selectedGame === 'RACING'
                ? 'border-[#FF8C00] shadow-[0_0_35px_rgba(255,140,0,0.35)] -translate-y-1'
                : 'border-white/10 hover:border-white/30'
            }`}
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#FF8C00] to-[#FF5500]" />

            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FF8C00]/15 border border-[#FF8C00]/40 text-[#FF8C00] text-[10px] font-mono font-bold uppercase tracking-widest">
                  <Car className="w-3.5 h-3.5" />
                  STREET RACING
                </span>
                <span className="text-[9px] font-mono text-[#8E96A4] uppercase">
                  BGM: STYLES OF BEYOND
                </span>
              </div>

              <h3 className="font-[family-name:var(--font-racing)] italic font-black uppercase text-2xl md:text-3xl tracking-wider text-white group-hover:text-[#FFAA33] transition-colors">
                NEON APEX: SYNDICATE
              </h3>
              <p className="mt-2 text-xs text-[#8E96A4] leading-relaxed">
                Take over the blacklist circuit. Build and tune 5 exotic supercars, conquer 16 championship tracks across 3 Acts, topple 7 Syndicate Bosses, and cruise the 2X open-world city with live traffic.
              </p>

              {/* Highlights Chips */}
              <div className="flex flex-wrap gap-1.5 mt-4">
                {[
                  '16 Tracks',
                  '7 Bosses',
                  '5 Supercars',
                  '2X Free Roam',
                  'Live Traffic',
                  'Engine Audio',
                ].map((chip) => (
                  <span
                    key={chip}
                    className="px-2 py-0.5 bg-[#0D0F14] border border-white/10 text-[10px] font-mono text-zinc-300 flex items-center gap-1"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-[#FF8C00]" />
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            {/* Launch Button */}
            <div className="mt-6 pt-5 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  bgmPlayer.unlock();
                  bgmPlayer.restartTrack('MENU');
                  onLaunchNeonApex();
                }}
                className="w-full py-3.5 bg-gradient-to-r from-[#FF8C00] via-[#FF7700] to-[#FF5500] hover:brightness-110 text-[#0D0F14] font-[family-name:var(--font-racing)] italic font-black uppercase text-base tracking-wider shadow-[0_8px_24px_rgba(255,140,0,0.4)] flex items-center justify-center gap-2 transition-transform cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                ENTER NEON APEX
              </button>
            </div>
          </div>

          {/* Card 3: Cyber Strike 3D (FPS Sci-Fi Arena Shooter) */}
          <div
            onMouseEnter={() => setSelectedGame('SHOOTER')}
            className={`group relative flex flex-col justify-between p-6 bg-gradient-to-b from-[#131722]/90 to-[#0A0D13]/95 border transition-all duration-300 ${
              selectedGame === 'SHOOTER'
                ? 'border-[#00F0FF] shadow-[0_0_35px_rgba(0,240,255,0.35)] -translate-y-1'
                : 'border-white/10 hover:border-white/30'
            }`}
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#00F0FF] to-[#0088FF]" />

            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] text-[10px] font-mono font-bold uppercase tracking-widest">
                  <Crosshair className="w-3.5 h-3.5" />
                  3D SCI-FI FPS
                </span>
                <span className="text-[9px] font-mono text-[#8E96A4] uppercase">
                  BGM: STYLES OF BEYOND
                </span>
              </div>

              <h3 className="font-[family-name:var(--font-racing)] italic font-black uppercase text-2xl md:text-3xl tracking-wider text-white group-hover:text-[#67e8f9] transition-colors">
                CYBER STRIKE 3D
              </h3>
              <p className="mt-2 text-xs text-[#8E96A4] leading-relaxed">
                High-velocity 3D first-person combat in an illuminated cyber arena. Master Plasma Rifles, Scatter Shotguns, and Piercing Railguns against rogue scout drones and heavy mech walkers.
              </p>

              {/* Highlights Chips */}
              <div className="flex flex-wrap gap-1.5 mt-4">
                {[
                  'Plasma Rifle',
                  'Shotgun',
                  'Railgun Zoom',
                  'Jump Pads',
                  'Mech Swarms',
                  'Hitmarkers',
                ].map((chip) => (
                  <span
                    key={chip}
                    className="px-2 py-0.5 bg-[#0D0F14] border border-white/10 text-[10px] font-mono text-zinc-300 flex items-center gap-1"
                  >
                    <Crosshair className="w-2.5 h-2.5 text-[#00F0FF]" />
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            {/* Launch Button */}
            <div className="mt-6 pt-5 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  bgmPlayer.unlock();
                  onLaunchShooter();
                }}
                className="w-full py-3.5 bg-gradient-to-r from-[#00F0FF] via-[#00B0FF] to-[#0088FF] hover:brightness-110 text-[#0D0F14] font-[family-name:var(--font-racing)] italic font-black uppercase text-base tracking-wider shadow-[0_8px_24px_rgba(0,240,255,0.4)] flex items-center justify-center gap-2 transition-transform cursor-pointer"
              >
                <Crosshair className="w-4 h-4" />
                ENTER CYBER STRIKE
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer System Bar */}
      <footer className="relative z-10 px-6 md:px-12 py-4 border-t border-white/10 bg-[#0A0D13]/90 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-[#8E96A4]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            STATION STATUS: ONLINE
          </span>
          <span>CONTROLS: KEYBOARD + MOUSE</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span>SOUNDTRACK: HUSH - FIRED UP // STYLES OF BEYOND // PROCEDURAL ARCADE BEATS</span>
        </div>
      </footer>
    </div>
  );
}
