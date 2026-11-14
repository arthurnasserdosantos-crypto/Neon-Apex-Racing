import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Car,
  Check,
  ChevronRight,
  DollarSign,
  Flag,
  Flame,
  Gauge,
  RotateCcw,
  Sliders,
  Terminal,
  Trophy,
  Unlock,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useGameStore } from '../store';
import { CAR_CATALOG, getCarDefinition } from '../utils/carCatalog';
import { engineAudio } from '../utils/engineAudio';
import {
  ACT1_BOSS_ID,
  FINAL_BOSS_ID,
  getProgressionStatus,
  RACE_TRACK_DEFINITIONS,
} from '../utils/raceTracks';
import { getCarPerformanceSpecs } from '../utils/carTuning';

const CHEAT_SEQUENCE = '2445746';

/**
 * Normalizes keyboard events into digits when typing with Shift held down.
 * Supports standard top-row numeric keys (which emit @, $, %, &, ^ on US layouts),
 * standard key codes (Digit2, Digit4, etc.), and Numpad keys.
 */
function extractDigit(e: KeyboardEvent): string | null {
  // Check layout-independent codes first
  if (/^Digit[0-9]$/.test(e.code)) {
    return e.code.replace('Digit', '');
  }
  if (/^Numpad[0-9]$/.test(e.code)) {
    return e.code.replace('Numpad', '');
  }

  // Common shifted characters for standard numbers
  const shiftedNumberMap: Record<string, string> = {
    '!': '1',
    '@': '2',
    '#': '3',
    '$': '4',
    '%': '5',
    '^': '6',
    '&': '7',
    '*': '8',
    '(': '9',
    ')': '0',
  };
  if (shiftedNumberMap[e.key]) {
    return shiftedNumberMap[e.key];
  }

  // If already a digit
  if (/^[0-9]$/.test(e.key)) {
    return e.key;
  }

  return null;
}

export function DevMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'CAR' | 'CASH' | 'CAREER' | 'LIVE'>('CAR');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Store bindings
  const cash = useGameStore((s) => s.cash);
  const setCash = useGameStore((s) => s.setCash);
  const driverAlias = useGameStore((s) => s.driverAlias);
  const setDriverAlias = useGameStore((s) => s.setDriverAlias);
  const selectedCarId = useGameStore((s) => s.selectedCarId);
  const selectCar = useGameStore((s) => s.selectCar);
  const ownedCarIds = useGameStore((s) => s.ownedCarIds);
  const cars = useGameStore((s) => s.cars);
  const setCarStat = useGameStore((s) => s.setCarStat);
  const maxOutCar = useGameStore((s) => s.maxOutCar);
  const resetCarStats = useGameStore((s) => s.resetCarStats);
  const unlockAllCars = useGameStore((s) => s.unlockAllCars);
  const completedRaces = useGameStore((s) => s.completedRaces);
  const unlockAct2Dev = useGameStore((s) => s.unlockAct2Dev);
  const completeAllRacesDev = useGameStore((s) => s.completeAllRacesDev);
  const toggleRaceCompletedDev = useGameStore((s) => s.toggleRaceCompletedDev);
  const resetProgression = useGameStore((s) => s.resetProgression);
  const view = useGameStore((s) => s.view);
  const raceState = useGameStore((s) => s.raceState);
  const instantWinCurrentRace = useGameStore((s) => s.instantWinCurrentRace);
  const autoOrbitCam = useGameStore((s) => s.autoOrbitCam);
  const setAutoOrbitCam = useGameStore((s) => s.setAutoOrbitCam);

  // Local draft states
  const [editingCarId, setEditingCarId] = useState(selectedCarId);
  const [cashInput, setCashInput] = useState(cash.toString());
  const [aliasInput, setAliasInput] = useState(driverAlias);

  // Keep editing car in sync when selectedCarId changes if user hasn't switched
  useEffect(() => {
    setEditingCarId(selectedCarId);
  }, [selectedCarId]);

  useEffect(() => {
    setCashInput(cash.toString());
  }, [cash]);

  useEffect(() => {
    setAliasInput(driverAlias);
  }, [driverAlias]);

  // Toast feedback helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    engineAudio.playUiClick();
    setTimeout(() => setToastMessage(null), 2400);
  };

  // Keyboard cheat sequence listener: Holding Shift and typing "2445746"
  const bufferRef = useRef('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow closing with Escape when open
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
        engineAudio.playUiClick();
        return;
      }

      // Check if user is holding Shift
      if (e.shiftKey) {
        // If typing inside an input field within the DevMenu, don't trigger
        if (
          isOpen &&
          (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        ) {
          return;
        }

        const digit = extractDigit(e);
        if (digit) {
          bufferRef.current = (bufferRef.current + digit).slice(-CHEAT_SEQUENCE.length);

          if (bufferRef.current === CHEAT_SEQUENCE) {
            bufferRef.current = '';
            setIsOpen((prev) => {
              const nextState = !prev;
              if (nextState) {
                engineAudio.playUiClick();
              }
              return nextState;
            });
            showToast('DEV COMMAND CONSOLE // AUTH ACCEPTED (SHIFT+2445746)');
          }
        } else if (e.key !== 'Shift') {
          // A non-digit was pressed while holding shift; reset buffer
          bufferRef.current = '';
        }
      } else {
        // Shift was released; clear buffer
        bufferRef.current = '';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const activeCarConfig = cars[editingCarId] ?? {
    color: '#dc2626',
    wheelsColor: '#27272a',
    speedLevel: 1,
    accelLevel: 1,
    handlingLevel: 1,
    vinyl: 'none' as const,
  };

  const editingCarDef = getCarDefinition(editingCarId);
  const specs = getCarPerformanceSpecs(activeCarConfig, editingCarId);
  const prog = getProgressionStatus(completedRaces);

  return (
    <>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] pointer-events-none mw-slant bg-[#00E5FF] text-[#0D0F14] px-5 py-2 shadow-[0_10px_30px_rgba(0,229,255,0.45)] border border-white">
          <div className="mw-unslant flex items-center gap-2.5 font-[family-name:var(--font-racing)] italic font-black text-xs tracking-widest uppercase">
            <Terminal className="w-4 h-4 shrink-0 text-[#0D0F14]" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Main Developer Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] pointer-events-auto bg-[#07090D]/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="w-full max-w-2xl mw-slant mw-glass border border-[#00E5FF]/40 border-l-4 border-l-[#00E5FF] shadow-[0_24px_70px_rgba(0,0,0,0.95)] overflow-hidden">
            <div className="mw-unslant flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#0D1017]/90">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xs bg-[#00E5FF]/15 border border-[#00E5FF]/40 flex items-center justify-center text-[#00E5FF]">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-[family-name:var(--font-racing)] italic font-black uppercase text-lg md:text-xl tracking-wider text-white">
                        DEV COMMAND OVERRIDE
                      </h2>
                      <span className="px-2 py-0.5 bg-[#00E5FF] text-[#0D0F14] text-[9px] font-mono font-black uppercase tracking-widest">
                        AUTHORIZED
                      </span>
                    </div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8E96A4] mt-0.5">
                      TRIGGER: [SHIFT + 2445746] · LIVE STAT &amp; TELEMETRY INJECTOR
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    engineAudio.playUiClick();
                    setIsOpen(false);
                  }}
                  className="p-1.5 text-[#8E96A4] hover:text-[#00E5FF] transition-colors cursor-pointer"
                  aria-label="Close Developer Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-white/10 bg-[#090C12] px-6 gap-2 pt-2 overflow-x-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    engineAudio.playUiClick();
                    setActiveTab('CAR');
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-[family-name:var(--font-racing)] italic font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                    activeTab === 'CAR'
                      ? 'border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/10'
                      : 'border-transparent text-[#8E96A4] hover:text-white'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Car Stats &amp; Tuning</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    engineAudio.playUiClick();
                    setActiveTab('CASH');
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-[family-name:var(--font-racing)] italic font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                    activeTab === 'CASH'
                      ? 'border-[#FF8C00] text-[#FF8C00] bg-[#FF8C00]/10'
                      : 'border-transparent text-[#8E96A4] hover:text-white'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Bounty &amp; Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    engineAudio.playUiClick();
                    setActiveTab('CAREER');
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-[family-name:var(--font-racing)] italic font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                    activeTab === 'CAREER'
                      ? 'border-[#00FF66] text-[#00FF66] bg-[#00FF66]/10'
                      : 'border-transparent text-[#8E96A4] hover:text-white'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Career &amp; Blacklist</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    engineAudio.playUiClick();
                    setActiveTab('LIVE');
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-[family-name:var(--font-racing)] italic font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                    activeTab === 'LIVE'
                      ? 'border-[#A855F7] text-[#A855F7] bg-[#A855F7]/10'
                      : 'border-transparent text-[#8E96A4] hover:text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Live Controls</span>
                </button>
              </div>

              {/* Tab Content Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0 bg-[#0C0F16]/95">
                {/* TAB 1: CAR STATS */}
                {activeTab === 'CAR' && (
                  <div className="space-y-6">
                    {/* Vehicle Target Selector */}
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#8E96A4] mb-2">
                        Target Vehicle
                      </label>
                      <div className="grid grid-cols-3 gap-2.5">
                        {Object.values(CAR_CATALOG).map((def) => {
                          const isTarget = editingCarId === def.id;
                          const isEquipped = selectedCarId === def.id;
                          const isOwned = ownedCarIds.includes(def.id);
                          return (
                            <button
                              key={def.id}
                              type="button"
                              onClick={() => {
                                engineAudio.playUiClick();
                                setEditingCarId(def.id);
                              }}
                              className={`p-3 text-left border rounded-xs transition-all cursor-pointer ${
                                isTarget
                                  ? 'border-[#00E5FF] bg-[#00E5FF]/15 text-white shadow-sm'
                                  : 'border-white/10 bg-[#121620] text-[#8E96A4] hover:border-white/20 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[9px] font-mono mb-1">
                                <span className={isOwned ? 'text-[#00FF66]' : 'text-amber-500'}>
                                  {isOwned ? 'OWNED' : 'LOCKED'}
                                </span>
                                {isEquipped && (
                                  <span className="text-[#00E5FF] font-bold">EQUIPPED</span>
                                )}
                              </div>
                              <div className="font-[family-name:var(--font-racing)] italic font-bold text-xs uppercase truncate">
                                {def.name}
                              </div>
                              <div className="text-[9px] font-mono text-[#8E96A4] uppercase">
                                {def.class}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Equip or Unlock Button */}
                      <div className="flex items-center gap-3 mt-3">
                        {selectedCarId !== editingCarId && (
                          <button
                            type="button"
                            onClick={() => {
                              selectCar(editingCarId);
                              showToast(`EQUIPPED ${editingCarDef.name.toUpperCase()}`);
                            }}
                            className="px-3 py-1.5 bg-[#00E5FF] hover:bg-[#00B0FF] text-[#0D0F14] text-xs font-[family-name:var(--font-racing)] italic font-black uppercase tracking-wider cursor-pointer"
                          >
                            Equip This Car
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            unlockAllCars();
                            showToast('ALL 3 VEHICLES UNLOCKED INTO GARAGE');
                          }}
                          className="px-3 py-1.5 bg-[#18202E] hover:bg-[#222C3E] border border-white/20 text-white text-xs font-[family-name:var(--font-racing)] italic font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                        >
                          <Unlock className="w-3.5 h-3.5 text-[#00E5FF]" />
                          <span>Unlock All 3 Vehicles</span>
                        </button>
                      </div>
                    </div>

                    {/* Live ECU Telemetry Strip */}
                    <div className="p-3 bg-[#121620] border border-white/10 rounded-xs flex items-center justify-between gap-4 font-mono text-xs">
                      <div>
                        <span className="text-[#8E96A4] text-[10px] block">TOP VELOCITY</span>
                        <strong className="text-white text-sm">{specs.topSpeedKph} KPH</strong>
                      </div>
                      <div>
                        <span className="text-[#8E96A4] text-[10px] block">0–60 MPH TIME</span>
                        <strong className="text-[#FF8C00] text-sm">
                          {specs.zeroToSixtySec.toFixed(2)}s
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#8E96A4] text-[10px] block">LATERAL GRIP</span>
                        <strong className="text-[#00E5FF] text-sm">{specs.gripScore}%</strong>
                      </div>
                      <div>
                        <span className="text-[#8E96A4] text-[10px] block">TOTAL SPEC STAGE</span>
                        <strong className="text-[#00FF66] text-sm">
                          S{activeCarConfig.speedLevel + activeCarConfig.accelLevel + activeCarConfig.handlingLevel}
                        </strong>
                      </div>
                    </div>

                    {/* Stat Sliders / Steppers */}
                    <div className="space-y-4">
                      {/* Speed Level */}
                      <div className="p-3 bg-[#121620] border border-white/10 rounded-xs space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-[#8E96A4] font-bold uppercase">Speed Upgrade Level</span>
                          <span className="text-white font-bold">
                            STAGE {activeCarConfig.speedLevel} / 5
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={1}
                            max={5}
                            step={1}
                            value={activeCarConfig.speedLevel}
                            onChange={(e) => {
                              const lvl = Number(e.target.value);
                              setCarStat('speedLevel', lvl, editingCarId);
                            }}
                            className="flex-1 accent-[#00E5FF] cursor-pointer"
                          />
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((lvl) => (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => setCarStat('speedLevel', lvl, editingCarId)}
                                className={`w-7 h-7 text-xs font-mono font-bold rounded-xs cursor-pointer ${
                                  activeCarConfig.speedLevel === lvl
                                    ? 'bg-[#00E5FF] text-[#0D0F14]'
                                    : 'bg-[#18202E] text-[#8E96A4] hover:text-white'
                                }`}
                              >
                                {lvl}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Acceleration Level */}
                      <div className="p-3 bg-[#121620] border border-white/10 rounded-xs space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-[#8E96A4] font-bold uppercase">
                            Acceleration Upgrade Level
                          </span>
                          <span className="text-[#FF8C00] font-bold">
                            STAGE {activeCarConfig.accelLevel} / 5
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={1}
                            max={5}
                            step={1}
                            value={activeCarConfig.accelLevel}
                            onChange={(e) => {
                              const lvl = Number(e.target.value);
                              setCarStat('accelLevel', lvl, editingCarId);
                            }}
                            className="flex-1 accent-[#FF8C00] cursor-pointer"
                          />
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((lvl) => (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => setCarStat('accelLevel', lvl, editingCarId)}
                                className={`w-7 h-7 text-xs font-mono font-bold rounded-xs cursor-pointer ${
                                  activeCarConfig.accelLevel === lvl
                                    ? 'bg-[#FF8C00] text-[#0D0F14]'
                                    : 'bg-[#18202E] text-[#8E96A4] hover:text-white'
                                }`}
                              >
                                {lvl}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Handling Level */}
                      <div className="p-3 bg-[#121620] border border-white/10 rounded-xs space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-[#8E96A4] font-bold uppercase">
                            Handling Upgrade Level
                          </span>
                          <span className="text-[#00FF66] font-bold">
                            STAGE {activeCarConfig.handlingLevel} / 5
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={1}
                            max={5}
                            step={1}
                            value={activeCarConfig.handlingLevel}
                            onChange={(e) => {
                              const lvl = Number(e.target.value);
                              setCarStat('handlingLevel', lvl, editingCarId);
                            }}
                            className="flex-1 accent-[#00FF66] cursor-pointer"
                          />
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((lvl) => (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => setCarStat('handlingLevel', lvl, editingCarId)}
                                className={`w-7 h-7 text-xs font-mono font-bold rounded-xs cursor-pointer ${
                                  activeCarConfig.handlingLevel === lvl
                                    ? 'bg-[#00FF66] text-[#0D0F14]'
                                    : 'bg-[#18202E] text-[#8E96A4] hover:text-white'
                                }`}
                              >
                                {lvl}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Tuning Presets */}
                    <div className="flex flex-wrap gap-3 pt-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          maxOutCar(editingCarId);
                          showToast(`MAXED OUT ${editingCarDef.name.toUpperCase()} TO STAGE 5`);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-[#00E5FF] to-[#0099FF] text-[#0D0F14] font-[family-name:var(--font-racing)] italic font-black uppercase text-xs tracking-wider cursor-pointer shadow-md"
                      >
                        ⚡ Max Out Car (Stage 5 God Tier)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          resetCarStats(editingCarId);
                          showToast(`RESET ${editingCarDef.name.toUpperCase()} TO STAGE 1 STOCK`);
                        }}
                        className="px-4 py-2 bg-[#18202E] hover:bg-[#232D3E] border border-white/20 text-[#8E96A4] hover:text-white font-[family-name:var(--font-racing)] italic font-bold uppercase text-xs tracking-wider cursor-pointer"
                      >
                        Reset to Stock (Stage 1)
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: BOUNTY & CASH */}
                {activeTab === 'CASH' && (
                  <div className="space-y-6">
                    {/* Current Cash display and Direct input */}
                    <div className="p-4 bg-[#121620] border border-white/10 rounded-xs space-y-3">
                      <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#8E96A4]">
                        Current Available Bankroll / Cash
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FF8C00] font-mono font-bold">
                            $
                          </span>
                          <input
                            type="number"
                            min={0}
                            step={500}
                            value={cashInput}
                            onChange={(e) => setCashInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = Number(cashInput);
                                if (!isNaN(val)) {
                                  setCash(val);
                                  showToast(`BANKROLL SET TO $${val.toLocaleString()}`);
                                }
                              }
                            }}
                            className="w-full bg-[#0D0F14] border border-[#3A3E45] focus:border-[#FF8C00] pl-8 pr-3.5 py-2.5 text-base font-mono font-bold text-white outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const val = Number(cashInput);
                            if (!isNaN(val)) {
                              setCash(val);
                              showToast(`BANKROLL SET TO $${val.toLocaleString()}`);
                            }
                          }}
                          className="px-5 py-2.5 bg-gradient-to-r from-[#FF8C00] to-[#FF5500] text-[#0D0F14] font-[family-name:var(--font-racing)] italic font-black uppercase text-xs tracking-wider cursor-pointer shadow-md"
                        >
                          Set Cash
                        </button>
                      </div>
                    </div>

                    {/* Quick Presets */}
                    <div>
                      <span className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#8E96A4] mb-2.5">
                        Quick Injection Presets
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCash(cash + 10000);
                            showToast('+$10,000 ADDED TO WALLET');
                          }}
                          className="p-3 bg-[#18202E] hover:bg-[#242F42] border border-white/10 text-white font-mono text-xs font-bold rounded-xs cursor-pointer text-center"
                        >
                          +$10,000
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCash(cash + 50000);
                            showToast('+$50,000 ADDED TO WALLET');
                          }}
                          className="p-3 bg-[#18202E] hover:bg-[#242F42] border border-white/10 text-white font-mono text-xs font-bold rounded-xs cursor-pointer text-center"
                        >
                          +$50,000
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCash(cash + 250000);
                            showToast('+$250,000 ADDED TO WALLET');
                          }}
                          className="p-3 bg-[#18202E] hover:bg-[#242F42] border border-white/10 text-white font-mono text-xs font-bold rounded-xs cursor-pointer text-center"
                        >
                          +$250,000
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCash(999999);
                            showToast('WALLET SET TO $999,999 MAXIMUM');
                          }}
                          className="p-3 bg-gradient-to-r from-[#FF8C00] to-[#E65100] text-[#0D0F14] font-mono text-xs font-black rounded-xs cursor-pointer text-center shadow-md"
                        >
                          $999,999 MAX
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: CAREER & BLACKLIST */}
                {activeTab === 'CAREER' && (
                  <div className="space-y-6">
                    {/* Status overview */}
                    <div className="p-4 bg-[#121620] border border-white/10 rounded-xs flex items-center justify-between gap-4 font-mono">
                      <div>
                        <span className="text-[10px] text-[#8E96A4] uppercase block">
                          Current Blacklist Progress
                        </span>
                        <strong className="text-white text-sm">
                          {Object.keys(completedRaces).length} / 11 RACES CONQUERED
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#8E96A4] uppercase block">
                          Campaign Status
                        </span>
                        <strong className="text-[#00FF66] text-sm">
                          {prog.finalBossDefeated
                            ? 'GRAND CHAMPION'
                            : prog.act2Unlocked
                            ? 'ACT II CONQUEROR'
                            : 'ACT I SYNDICATE'}
                        </strong>
                      </div>
                    </div>

                    {/* Master Campaign Overrides */}
                    <div className="space-y-2">
                      <span className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#8E96A4]">
                        Master Progression Jump
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            unlockAct2Dev();
                            showToast('ACT II UNLOCKED // BOSS 1 RAZOR DEFEATED');
                          }}
                          className="p-3 bg-[#18202E] hover:bg-[#242F42] border border-[#00FF66]/40 text-left rounded-xs cursor-pointer group"
                        >
                          <div className="flex items-center justify-between text-xs font-[family-name:var(--font-racing)] italic font-bold text-white uppercase">
                            <span>Unlock Act II</span>
                            <ChevronRight className="w-4 h-4 text-[#00FF66] group-hover:translate-x-1 transition-transform" />
                          </div>
                          <p className="text-[10px] font-mono text-[#8E96A4] mt-0.5">
                            Marks all 4 Act 1 races &amp; Razor as beaten
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            completeAllRacesDev();
                            showToast('100% BLACKLIST CONQUERED // ALL 11 RACES WON');
                          }}
                          className="p-3 bg-gradient-to-r from-[#00FF66]/20 to-[#00FF66]/5 hover:bg-[#00FF66]/30 border border-[#00FF66] text-left rounded-xs cursor-pointer group"
                        >
                          <div className="flex items-center justify-between text-xs font-[family-name:var(--font-racing)] italic font-black text-white uppercase">
                            <span>100% Blacklist Clear</span>
                            <Trophy className="w-4 h-4 text-[#00FF66]" />
                          </div>
                          <p className="text-[10px] font-mono text-[#8E96A4] mt-0.5">
                            Sets 1st place on all 11 tracks including Apex Sovereign
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Individual Track Toggle Matrix */}
                    <div className="space-y-2">
                      <span className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#8E96A4]">
                        Individual Track Toggles (Click to toggle completed)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                        {RACE_TRACK_DEFINITIONS.map((track) => {
                          const isWon = !!completedRaces[track.id];
                          return (
                            <button
                              key={track.id}
                              type="button"
                              onClick={() => {
                                toggleRaceCompletedDev(track.id);
                                showToast(
                                  `${track.title.toUpperCase()} ${isWon ? 'LOCKED' : 'MARKED WON'}`,
                                );
                              }}
                              className={`p-2.5 border rounded-xs flex items-center justify-between text-left cursor-pointer transition-colors ${
                                isWon
                                  ? 'bg-[#00FF66]/10 border-[#00FF66]/60 text-white'
                                  : 'bg-[#121620] border-white/10 text-[#8E96A4] hover:text-white'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="text-[11px] font-[family-name:var(--font-racing)] italic font-bold uppercase truncate">
                                  {track.order}. {track.title}
                                </div>
                                <div className="text-[9px] font-mono text-[#8E96A4]">
                                  {track.isBoss ? 'BOSS DUEL' : `ACT ${track.act}`} · {track.laps} LAPS
                                </div>
                              </div>
                              <span
                                className={`w-5 h-5 rounded-xs flex items-center justify-center shrink-0 text-xs font-mono font-bold ${
                                  isWon
                                    ? 'bg-[#00FF66] text-[#0D0F14]'
                                    : 'bg-[#18202E] text-[#8E96A4]'
                                }`}
                              >
                                {isWon ? <Check className="w-3.5 h-3.5" /> : '—'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Reset Career */}
                    <div className="pt-3 border-t border-white/10 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          resetProgression();
                          showToast('CAREER PROGRESSION RESET TO ZERO');
                        }}
                        className="px-4 py-2 bg-[#DC2626]/20 hover:bg-[#DC2626] border border-[#DC2626] text-white text-xs font-[family-name:var(--font-racing)] italic font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Career Progression</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 4: LIVE CONTROLS & PROFILE */}
                {activeTab === 'LIVE' && (
                  <div className="space-y-6">
                    {/* Driver Alias */}
                    <div className="p-4 bg-[#121620] border border-white/10 rounded-xs space-y-3">
                      <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#8E96A4]">
                        Driver Blacklist Alias
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={18}
                          value={aliasInput}
                          onChange={(e) => setAliasInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setDriverAlias(aliasInput);
                              showToast(`ALIAS SET TO ${aliasInput}`);
                            }
                          }}
                          className="flex-1 bg-[#0D0F14] border border-[#3A3E45] focus:border-[#00E5FF] px-3.5 py-2 text-xs font-mono font-bold uppercase text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setDriverAlias(aliasInput);
                            showToast(`ALIAS SET TO ${aliasInput}`);
                          }}
                          className="px-4 py-2 bg-[#00E5FF] text-[#0D0F14] font-[family-name:var(--font-racing)] italic font-black uppercase text-xs tracking-wider cursor-pointer"
                        >
                          Save Alias
                        </button>
                      </div>
                    </div>

                    {/* Camera & Race state triggers */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-[#121620] border border-white/10 rounded-xs flex items-center justify-between">
                        <div>
                          <span className="text-xs font-[family-name:var(--font-racing)] italic font-bold uppercase text-white block">
                            Cinematic Auto-Orbit Cam
                          </span>
                          <span className="text-[10px] font-mono text-[#8E96A4]">
                            Showroom turntable rotation
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAutoOrbitCam(!autoOrbitCam);
                            showToast(`ORBIT CAM ${!autoOrbitCam ? 'ENABLED' : 'DISABLED'}`);
                          }}
                          className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-xs cursor-pointer ${
                            autoOrbitCam
                              ? 'bg-[#00E5FF] text-[#0D0F14]'
                              : 'bg-[#18202E] text-[#8E96A4]'
                          }`}
                        >
                          {autoOrbitCam ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      <div className="p-3 bg-[#121620] border border-white/10 rounded-xs flex items-center justify-between">
                        <div>
                          <span className="text-xs font-[family-name:var(--font-racing)] italic font-bold uppercase text-white block">
                            Instant Race Victory
                          </span>
                          <span className="text-[10px] font-mono text-[#8E96A4]">
                            {view === 'RACE' ? 'Ready to trigger' : 'Available during active race'}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={view !== 'RACE'}
                          onClick={() => {
                            instantWinCurrentRace();
                            showToast('INSTANT VICTORY TRIGGERED // 1ST PLACE RECORDED');
                            setIsOpen(false);
                          }}
                          className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-xs ${
                            view === 'RACE'
                              ? 'bg-[#00FF66] text-[#0D0F14] cursor-pointer'
                              : 'bg-white/5 text-white/20 cursor-not-allowed'
                          }`}
                        >
                          Win Race Now
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer status */}
              <div className="border-t border-white/10 px-6 py-3 bg-[#090C12] flex items-center justify-between text-[10px] font-mono text-[#8E96A4]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00E5FF] shadow-[0_0_6px_#00E5FF]" />
                  <span>DEV CONSOLE ACTIVE · PRESS [ESC] TO CLOSE</span>
                </div>
                <div>CODE: SHIFT + 2445746</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
