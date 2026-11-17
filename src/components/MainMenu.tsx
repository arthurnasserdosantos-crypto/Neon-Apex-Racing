import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Compass,
  Flag,
  Gamepad2,
  RotateCcw,
  Settings,
  ShoppingBag,
  Sliders,
  Volume2,
  VolumeX,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useGameStore } from '../store';
import { getCarPerformanceSpecs } from '../utils/carTuning';
import { engineAudio } from '../utils/engineAudio';
import { CAR_ORDER, getCarDefinition } from '../utils/carCatalog';
import {
  getBuiltRaceTrack,
  getProgressionStatus,
  getQuickRaceTrackId,
} from '../utils/raceTracks';
import { ResetTurntableShowcase } from '../utils/turntableConfig';

interface NavOption {
  id: 'CAREER' | 'GARAGE' | 'CAR_LOT' | 'QUICK_RACE' | 'FREE_ROAM' | 'OPTIONS' | 'GAME_STATION';
  label: string;
  tag: string;
  icon: React.ReactNode;
}

export function MainMenu() {
  const setAppStationMode = useGameStore((s) => s.setAppStationMode);
  const setView = useGameStore((s) => s.setView);
  const openCarLot = useGameStore((s) => s.openCarLot);
  const startRace = useGameStore((s) => s.startRace);
  const car = useGameStore((s) => s.car);
  const selectedCarId = useGameStore((s) => s.selectedCarId);
  const ownedCarIds = useGameStore((s) => s.ownedCarIds);
  const completedRaces = useGameStore((s) => s.completedRaces);
  const driverAlias = useGameStore((s) => s.driverAlias);
  const setDriverAlias = useGameStore((s) => s.setDriverAlias);
  const autoOrbitCam = useGameStore((s) => s.autoOrbitCam);
  const setAutoOrbitCam = useGameStore((s) => s.setAutoOrbitCam);
  const trafficCount = useGameStore((s) => s.trafficCount);
  const setTrafficCount = useGameStore((s) => s.setTrafficCount);
  const resetProgression = useGameStore((s) => s.resetProgression);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [aliasDraft, setAliasDraft] = useState(driverAlias);
  const [audioMuted, setAudioMuted] = useState(() => engineAudio.isMuted());
  const [masterVolume, setMasterVolume] = useState(() =>
    Math.round(engineAudio.getMasterVolume() * 100),
  );
  const [confirmReset, setConfirmReset] = useState(false);

  // OnEnter() lifecycle hook: ensure car & turntable camera cleanly reset to default hero framing
  useEffect(() => {
    ResetTurntableShowcase();
  }, []);

  useEffect(() => {
    setAliasDraft(driverAlias);
  }, [driverAlias]);

  const carDef = getCarDefinition(selectedCarId);
  const specs = getCarPerformanceSpecs(car, selectedCarId);
  const topSpeedPct = Math.min(100, Math.max(12, Math.round((specs.topSpeedKph / 350) * 100)));
  const accelPct = Math.min(100, Math.max(12, Math.round((2.4 / specs.zeroToSixtySec) * 65)));
  const gripPct = Math.min(100, Math.max(12, specs.gripScore));

  const prog = getProgressionStatus(completedRaces);
  const quickTrackId = useMemo(() => getQuickRaceTrackId(completedRaces), [completedRaces]);
  const quickTrack = useMemo(() => getBuiltRaceTrack(quickTrackId), [quickTrackId]);

  const careerTag = prog.finalBossDefeated
    ? 'ALL CLEARED'
    : prog.finalBossUnlocked
    ? 'FINAL BOSS #7 READY'
    : prog.act3Unlocked
    ? `ACT III · ${prog.act3Wins}/${prog.act3Total} BOSSES`
    : prog.boss2Unlocked
    ? 'BOSS 2 READY'
    : prog.act2Unlocked
    ? `ACT II · ${prog.act2Wins}/${prog.act2Total}`
    : prog.boss1Unlocked
    ? 'BOSS 1 READY'
    : `ACT I · ${prog.act1Wins}/${prog.act1Total}`;

  const navOptions: NavOption[] = useMemo(
    () => [
      {
        id: 'CAREER',
        label: 'CAREER / RACE SELECT',
        tag: careerTag,
        icon: <Flag className="w-4 h-4" />,
      },
      {
        id: 'GARAGE',
        label: 'GARAGE',
        tag: `S${car.speedLevel + car.accelLevel + car.handlingLevel} TUNING`,
        icon: <Wrench className="w-4 h-4" />,
      },
      {
        id: 'CAR_LOT',
        label: 'CAR LOT / DEALERSHIP',
        tag: `${ownedCarIds.length}/${CAR_ORDER.length} VEHICLES`,
        icon: <ShoppingBag className="w-4 h-4" />,
      },
      {
        id: 'QUICK_RACE',
        label: 'QUICK RACE',
        tag: quickTrack.title.toUpperCase(),
        icon: <Zap className="w-4 h-4" />,
      },
      {
        id: 'FREE_ROAM',
        label: 'FREE ROAM',
        tag: 'OPEN CITY MAP',
        icon: <Compass className="w-4 h-4" />,
      },
      {
        id: 'OPTIONS',
        label: 'OPTIONS',
        tag: optionsOpen ? 'OPEN' : 'SETTINGS',
        icon: <Settings className="w-4 h-4" />,
      },
      {
        id: 'GAME_STATION',
        label: 'GAME STATION',
        tag: 'TITLE SELECTOR',
        icon: <Gamepad2 className="w-4 h-4" />,
      },
    ],
    [careerTag, car.speedLevel, car.accelLevel, car.handlingLevel, ownedCarIds.length, quickTrack.title, optionsOpen],
  );

  const activateOption = useCallback(
    (id: NavOption['id']) => {
      engineAudio.playUiClick();
      if (id === 'CAREER') {
        setView('CAREER');
      } else if (id === 'GARAGE') {
        setView('GARAGE');
      } else if (id === 'CAR_LOT') {
        openCarLot('MENU');
      } else if (id === 'QUICK_RACE') {
        startRace(quickTrackId);
      } else if (id === 'FREE_ROAM') {
        setView('FREE_ROAM');
      } else if (id === 'OPTIONS') {
        setOptionsOpen((prev) => !prev);
      } else if (id === 'GAME_STATION') {
        setAppStationMode('STATION');
      }
    },
    [setView, openCarLot, startRace, quickTrackId, setAppStationMode],
  );

  // Keyboard navigation matching bottom ticker: W/S or ArrowUp/Down, Enter, Esc
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        engineAudio.playUiHover();
        setSelectedIndex((prev) => (prev - 1 + navOptions.length) % navOptions.length);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        engineAudio.playUiHover();
        setSelectedIndex((prev) => (prev + 1) % navOptions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        activateOption(navOptions[selectedIndex].id);
      } else if (e.key === 'Escape' && optionsOpen) {
        e.preventDefault();
        engineAudio.playUiClick();
        setOptionsOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navOptions, selectedIndex, optionsOpen, activateOption]);

  return (
    <main className="flex-1 relative px-5 md:px-10 py-6 flex flex-col justify-end min-h-0">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 w-full">
        {/* Lower-Left Brand Lockup + Slanted Vertical Navigation Stack */}
        <div className="flex flex-col md:flex-row md:items-end gap-6 pointer-events-auto">
          <div className="w-full max-w-[420px]">
            {/* Title Block with aggressive wide-stance metallic italic NEON APEX */}
            <div className="mb-6 pl-2">
              <div className="inline-block mw-slant bg-gradient-to-r from-[#FF8C00] via-[#FF7700] to-[#FF5500] px-3.5 py-1 mb-2.5 shadow-[0_4px_16px_rgba(255,140,0,0.35)]">
                <span className="mw-unslant block font-[family-name:var(--font-racing)] italic font-black uppercase text-[11px] tracking-[0.26em] text-[#0D0F14]">
                  Most Wanted · Street Syndicate
                </span>
              </div>
              <h1 className="font-[family-name:var(--font-racing)] italic font-black uppercase text-5xl md:text-6xl lg:text-7xl leading-none tracking-wider bg-gradient-to-b from-[#FFFFFF] via-[#F1F5F9] to-[#8E96A4] bg-clip-text text-transparent drop-shadow-[0_8px_24px_rgba(0,0,0,0.95)]">
                Neon Apex
              </h1>
              <div className="flex items-center gap-2.5 mt-2">
                <span className="w-3 h-0.5 bg-[#FF8C00] shrink-0" />
                <p className="font-[family-name:var(--font-tech)] font-bold uppercase text-xs md:text-sm tracking-[0.22em] text-[#8E96A4]">
                  Urban Underground Circuit &amp; Blacklist Duels
                </p>
              </div>
            </div>

            {/* Slanted Vertical Navigation Stack */}
            <nav aria-label="Main Menu" className="flex flex-col gap-2.5 pl-2">
              {navOptions.map((item, idx) => {
                const isSelected = selectedIndex === idx || (item.id === 'OPTIONS' && optionsOpen);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => {
                      if (selectedIndex !== idx) {
                        engineAudio.playUiHover();
                        setSelectedIndex(idx);
                      }
                    }}
                    onFocus={() => setSelectedIndex(idx)}
                    onClick={() => activateOption(item.id)}
                    className={`group relative w-full text-left mw-slant transition-all duration-150 ease-out px-5 py-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8C00] ${
                      isSelected
                        ? 'translate-x-3 bg-gradient-to-r from-[#FF8C00] via-[#FF7700] to-[#FF5500] border border-[#FFAA33] text-[#0D0F14] shadow-[0_10px_28px_rgba(255,140,0,0.42)]'
                        : 'mw-glass-card border border-[#3A3E45]/80 border-l-4 border-l-transparent text-[#F4F4F4] hover:translate-x-3 hover:border-l-[#FF8C00] hover:bg-[#1C222D]/90'
                    }`}
                  >
                    {/* Active Light Sweep Highlight Layer */}
                    {isSelected && (
                      <div className="mw-sweep-layer rounded-xs">
                        <div className="mw-sweep-line" />
                      </div>
                    )}

                    <div className="mw-unslant relative z-10 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`shrink-0 transition-colors ${
                            isSelected ? 'text-[#0D0F14]' : 'text-[#FF8C00] group-hover:text-[#FFAA33]'
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span
                          className={`font-[family-name:var(--font-racing)] italic font-black uppercase text-base md:text-lg tracking-wider whitespace-nowrap truncate ${
                            isSelected ? 'text-[#0D0F14]' : 'text-[#FFFFFF]'
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap ${
                            isSelected
                              ? 'text-[#0D0F14]/85'
                              : 'text-[#8E96A4] group-hover:text-[#E2E8F0]'
                          }`}
                        >
                          {item.tag}
                        </span>
                        <ChevronRight
                          className={`w-4 h-4 shrink-0 transition-transform duration-120 ease-out ${
                            isSelected
                              ? 'text-[#0D0F14] translate-x-1'
                              : 'text-[#8E96A4] group-hover:translate-x-1 group-hover:text-[#FF8C00]'
                          }`}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Centered Modal System Options Dialog when OPTIONS is toggled */}
          {optionsOpen && (
            <div className="fixed inset-0 z-50 pointer-events-auto bg-[#0D0F14]/85 backdrop-blur-md flex items-center justify-center p-4">
              <section
                aria-label="Game Options"
                className="w-full max-w-md mw-slant mw-glass border-l-4 border-l-[#FF8C00] p-6 md:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.95)]"
              >
                <div className="mw-unslant space-y-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <Sliders className="w-5 h-5 text-[#FF8C00]" />
                      <h2 className="font-[family-name:var(--font-racing)] italic font-black uppercase text-xl tracking-wider text-[#FFFFFF]">
                        System Options
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        engineAudio.playUiClick();
                        setOptionsOpen(false);
                      }}
                      className="p-1.5 text-[#8E96A4] hover:text-[#FF8C00] transition-colors cursor-pointer"
                      aria-label="Close Options"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Driver Alias Input */}
                  <div className="p-3 bg-[#141822]/80 border border-white/5 rounded-xs">
                    <label
                      htmlFor="driver-alias-input"
                      className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#8E96A4] mb-1.5"
                    >
                      Blacklist Alias
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="driver-alias-input"
                        type="text"
                        maxLength={18}
                        value={aliasDraft}
                        onChange={(e) => setAliasDraft(e.target.value.toUpperCase())}
                        onBlur={() => setDriverAlias(aliasDraft)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setDriverAlias(aliasDraft);
                            engineAudio.playUiClick();
                          }
                        }}
                        className="flex-1 bg-[#0D0F14] border border-[#3A3E45] focus:border-[#FF8C00] px-3.5 py-2 text-xs font-mono font-bold uppercase text-[#FFFFFF] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setDriverAlias(aliasDraft);
                          engineAudio.playUiClick();
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-[#FF8C00] to-[#FF5500] hover:brightness-110 text-[#0D0F14] font-[family-name:var(--font-racing)] italic font-black uppercase text-xs tracking-wider shadow-sm cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  {/* Engine & UI Audio Controls */}
                  <div className="p-3 bg-[#141822]/80 border border-white/5 rounded-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8E96A4]">
                        Audio Output
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          engineAudio.unlock();
                          const muted = engineAudio.toggleMute();
                          setAudioMuted(muted);
                          if (!muted) engineAudio.playUiClick();
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 border text-[10px] font-mono font-bold uppercase cursor-pointer ${
                          audioMuted
                            ? 'bg-[#181C24] border-[#EF4444] text-[#EF4444]'
                            : 'bg-gradient-to-r from-[#FF8C00] to-[#FF5500] border-[#FFAA33] text-[#0D0F14]'
                        }`}
                      >
                        {audioMuted ? (
                          <VolumeX className="w-3.5 h-3.5" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        <span>{audioMuted ? 'Muted' : 'Active'}</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={masterVolume}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setMasterVolume(val);
                          engineAudio.setMasterVolume(val / 100);
                        }}
                        aria-label="Master Volume"
                        className="flex-1 accent-[#FF8C00] cursor-pointer"
                      />
                      <span className="text-xs font-mono tabular-nums text-[#FFFFFF] w-10 text-right">
                        {masterVolume}%
                      </span>
                    </div>
                  </div>

                  {/* Showroom Auto-Orbit Camera Toggle */}
                  <div className="p-3 bg-[#141822]/80 border border-white/5 rounded-xs flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8E96A4]">
                      Cinematic Orbit Cam
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        engineAudio.playUiClick();
                        setAutoOrbitCam(!autoOrbitCam);
                      }}
                      className={`px-3.5 py-1.5 border text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                        autoOrbitCam
                          ? 'bg-gradient-to-r from-[#FF8C00] to-[#FF5500] border-[#FFAA33] text-[#0D0F14]'
                          : 'bg-[#0D0F14] border-[#3A3E45] text-[#8E96A4]'
                      }`}
                    >
                      {autoOrbitCam ? 'Auto Pan ON' : 'Manual Only'}
                    </button>
                  </div>

                  {/* Free Roam Traffic Density Setting */}
                  <div className="p-3 bg-[#141822]/80 border border-white/5 rounded-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8E96A4]">
                        Free Roam Traffic
                      </span>
                      <span className="text-xs font-mono font-bold tabular-nums text-[#FF8C00]">
                        {trafficCount === 0 ? 'OFF (0)' : `${trafficCount} CARS`}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { label: 'Off', count: 0 },
                        { label: 'Low', count: 12 },
                        { label: 'Med', count: 24 },
                        { label: 'High', count: 40 },
                        { label: 'Max', count: 60 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            engineAudio.playUiClick();
                            setTrafficCount(preset.count);
                          }}
                          className={`py-1 border text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                            trafficCount === preset.count
                              ? 'bg-gradient-to-r from-[#FF8C00] to-[#FF5500] border-[#FFAA33] text-[#0D0F14]'
                              : 'bg-[#0D0F14] border-[#3A3E45] text-[#8E96A4] hover:text-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={60}
                        step={2}
                        value={trafficCount}
                        onChange={(e) => setTrafficCount(Number(e.target.value))}
                        aria-label="Free Roam Traffic Count"
                        className="flex-1 accent-[#FF8C00] cursor-pointer"
                      />
                      <span className="text-xs font-mono tabular-nums text-[#FFFFFF] w-10 text-right">
                        {trafficCount}
                      </span>
                    </div>
                  </div>

                  {/* Reset Career Save */}
                  <div className="pt-2 border-t border-white/10">
                    {!confirmReset ? (
                      <button
                        type="button"
                        onClick={() => {
                          engineAudio.playUiClick();
                          setConfirmReset(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#141822] hover:bg-[#DC2626] border border-[#3A3E45] hover:border-[#DC2626] text-[#8E96A4] hover:text-white text-xs font-[family-name:var(--font-racing)] italic font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Reset Blacklist Save</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between gap-2 bg-[#DC2626]/20 border border-[#DC2626] px-3.5 py-2">
                        <span className="text-[10px] font-mono uppercase text-[#FFFFFF]">
                          Wipe career progress?
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              engineAudio.playUiClick();
                              resetProgression();
                              setConfirmReset(false);
                            }}
                            className="px-3 py-1 bg-[#DC2626] text-white text-[10px] font-mono font-bold uppercase cursor-pointer"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmReset(false)}
                            className="px-3 py-1 bg-[#0D0F14] border border-[#3A3E45] text-[#FFFFFF] text-[10px] font-mono font-bold uppercase cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Bottom-Right Compact Automotive Gauge Cluster (leaves 3D vehicle unobstructed) */}
        <aside className="hidden lg:flex flex-col items-end gap-2.5 pointer-events-none">
          <div className="mw-slant mw-glass-card border-l-4 border-l-[#FF8C00] px-5 py-3.5 shadow-[0_16px_36px_rgba(0,0,0,0.85)] min-w-[340px]">
            <div className="mw-unslant space-y-2.5">
              {/* Header telemetry badge */}
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF8C00] shadow-[0_0_8px_#FF8C00]" />
                  <span className="font-[family-name:var(--font-racing)] italic font-black uppercase text-xs tracking-[0.2em] text-[#FF8C00]">
                    ACTIVE SPEC
                  </span>
                  <span className="text-[#3A3E45] font-mono text-xs">//</span>
                  <span className="font-[family-name:var(--font-tech)] font-extrabold uppercase text-xs tracking-wider text-[#FFFFFF]">
                    {carDef.name}
                  </span>
                </div>
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 bg-[#0D0F14] border border-white/10 text-[#00B0FF]">
                  {carDef.class}
                </span>
              </div>

              {/* 3 Metric Stat Bars with live ECU readouts */}
              <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                {/* Top Speed */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[9px] text-[#8E96A4] tracking-wider uppercase">
                    <span>TOP SPD</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-[#FFFFFF] tabular-nums">
                    {specs.topSpeedKph} <span className="text-[9px] text-[#8E96A4]">KPH</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#0D0F14] border border-white/10 rounded-xs overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#FF8C00] to-[#FF5500] transition-all duration-300"
                      style={{ width: `${topSpeedPct}%` }}
                    />
                  </div>
                </div>

                {/* 0-60 Accel */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[9px] text-[#8E96A4] tracking-wider uppercase">
                    <span>0–60 MPH</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-[#FF8C00] tabular-nums">
                    {specs.zeroToSixtySec.toFixed(2)}s
                  </div>
                  <div className="h-1.5 w-full bg-[#0D0F14] border border-white/10 rounded-xs overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#FF8C00] to-[#E65100] transition-all duration-300"
                      style={{ width: `${accelPct}%` }}
                    />
                  </div>
                </div>

                {/* Lateral Grip */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[9px] text-[#8E96A4] tracking-wider uppercase">
                    <span>LAT GRIP</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-[#FFFFFF] tabular-nums">
                    {specs.gripScore}%
                  </div>
                  <div className="h-1.5 w-full bg-[#0D0F14] border border-white/10 rounded-xs overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#00B0FF] to-[#0284c7] transition-all duration-300"
                      style={{ width: `${gripPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
