import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Disc,
  DollarSign,
  Flame,
  Gauge,
  Lock,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Volume2,
  Zap,
} from 'lucide-react';
import { useGameStore } from '../store';
import { CAR_CATALOG, CAR_ORDER, CarDefinition } from '../utils/carCatalog';
import { getCarPerformanceSpecs } from '../utils/carTuning';
import { engineAudio } from '../utils/engineAudio';

export function CarLot() {
  const view = useGameStore((s) => s.view);
  const previousView = useGameStore((s) => s.previousView);
  const setView = useGameStore((s) => s.setView);
  const cash = useGameStore((s) => s.cash);
  const ownedCarIds = useGameStore((s) => s.ownedCarIds);
  const selectedCarId = useGameStore((s) => s.selectedCarId);
  const cars = useGameStore((s) => s.cars);
  const buyCar = useGameStore((s) => s.buyCar);
  const selectCar = useGameStore((s) => s.selectCar);

  const [browseIndex, setBrowseIndex] = useState(() => {
    const idx = CAR_ORDER.indexOf(selectedCarId);
    return idx >= 0 ? idx : 0;
  });

  const [auditioning, setAuditioning] = useState(false);
  const [auditionProgress, setAuditionProgress] = useState(0);
  const [auditionPhase, setAuditionPhase] = useState<'idle' | 'accel' | 'decel' | 'brake'>('idle');

  const activeCarId = CAR_ORDER[browseIndex] ?? 'apex_gt';
  const carDef: CarDefinition = CAR_CATALOG[activeCarId] ?? CAR_CATALOG.apex_gt;
  const isOwned = ownedCarIds.includes(activeCarId);
  const isEquipped = selectedCarId === activeCarId;
  const canAfford = cash >= carDef.price;

  // Subscribe to live audio audition updates
  useEffect(() => {
    const unsub = engineAudio.subscribeAudition((isAud, prog, phase, carId) => {
      if (carId === activeCarId) {
        setAuditioning(isAud);
        setAuditionProgress(prog);
        setAuditionPhase(phase);
      } else {
        setAuditioning(false);
        setAuditionProgress(0);
        setAuditionPhase('idle');
      }
    });
    return () => {
      unsub();
      engineAudio.stopAudition();
    };
  }, [activeCarId]);

  // Calculate stats for previewed car using its current build or level 1 defaults
  const previewSpecs = useMemo(() => {
    const carBuild = cars[activeCarId] ?? {
      color: carDef.defaultColor,
      wheelsColor: carDef.defaultWheelsColor,
      speedLevel: 1,
      accelLevel: 1,
      handlingLevel: 1,
      vinyl: 'none',
    };
    return getCarPerformanceSpecs(carBuild, activeCarId);
  }, [cars, activeCarId, carDef]);

  // If user browses to an owned car, live-select it so the 3D showroom camera/model reflects it
  const handleSelectCar = (index: number) => {
    engineAudio.stopAudition();
    engineAudio.playUiHover();
    setBrowseIndex(index);
    const targetId = CAR_ORDER[index];
    engineAudio.setCarProfile(targetId);
    if (ownedCarIds.includes(targetId)) {
      selectCar(targetId);
    }
  };

  const handleToggleAudition = () => {
    if (auditioning) {
      engineAudio.stopAudition();
    } else {
      engineAudio.auditionCar(activeCarId);
    }
  };

  const handleAction = () => {
    if (isEquipped) return;
    if (isOwned) {
      engineAudio.playUiClick();
      selectCar(activeCarId);
    } else {
      if (canAfford) {
        engineAudio.playCountdownTone(0);
        buyCar(activeCarId);
      } else {
        engineAudio.playUiClick();
      }
    }
  };

  const handleBack = () => {
    engineAudio.stopAudition();
    engineAudio.playUiClick();
    setView(previousView || 'MENU');
  };

  // Keyboard navigation: A/D or ArrowLeft/Right to switch car, R to audition, Enter to buy/equip, Esc to exit
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (view !== 'CAR_LOT') return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setBrowseIndex((prev) => {
          const next = (prev - 1 + CAR_ORDER.length) % CAR_ORDER.length;
          const targetId = CAR_ORDER[next];
          engineAudio.stopAudition();
          engineAudio.setCarProfile(targetId);
          if (ownedCarIds.includes(targetId)) selectCar(targetId);
          engineAudio.playUiHover();
          return next;
        });
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setBrowseIndex((prev) => {
          const next = (prev + 1) % CAR_ORDER.length;
          const targetId = CAR_ORDER[next];
          engineAudio.stopAudition();
          engineAudio.setCarProfile(targetId);
          if (ownedCarIds.includes(targetId)) selectCar(targetId);
          engineAudio.playUiHover();
          return next;
        });
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleToggleAudition();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleAction();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleBack();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [view, isEquipped, isOwned, canAfford, activeCarId, previousView, ownedCarIds, auditioning]);

  return (
    <main className="flex-1 grid grid-cols-12 pointer-events-none h-full min-h-0">
      {/* Left/Center Viewport: 3D Car Focus with Vehicle Selector Tab Bar */}
      <section className="col-span-12 md:col-span-7 lg:col-span-8 flex flex-col justify-between p-5 md:p-10">
        {/* Top Header & Back Button */}
        <div className="flex flex-wrap items-center justify-between gap-4 pointer-events-auto">
          <button
            type="button"
            onClick={handleBack}
            className="mw-slant bg-[#FF9900] hover:bg-[#E65100] border border-[#FF9900] px-5 py-2.5 text-[#0D0E10] transition-colors cursor-pointer"
          >
            <span className="mw-unslant flex items-center gap-2 font-[family-name:var(--font-display)] italic font-black uppercase text-sm tracking-wider">
              <ArrowLeft className="w-4 h-4" />
              <span>Back [ESC]</span>
            </span>
          </button>

          <div className="mw-slant bg-[#0D0E10]/92 border border-[#3A3E45] border-l-4 border-l-[#00B0FF] px-5 py-2 text-right">
            <div className="mw-unslant flex items-center gap-3">
              <DollarSign className="w-4 h-4 text-[#FF9900]" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#8E9299] block">
                  Available Syndicate Funds
                </span>
                <span className="font-mono font-bold text-base text-[#F4F4F4]">
                  ${cash.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Vehicle Selector Navigation Controls */}
        <div className="flex flex-col gap-4 pointer-events-auto max-w-xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectCar((browseIndex - 1 + CAR_ORDER.length) % CAR_ORDER.length)}
              className="p-3 mw-slant bg-[#1A1C20]/90 hover:bg-[#FF9900] border border-[#3A3E45] text-[#F4F4F4] hover:text-[#0D0E10] transition-colors cursor-pointer"
              aria-label="Previous Vehicle"
            >
              <ChevronLeft className="w-5 h-5 mw-unslant" />
            </button>

            <div className="grid grid-cols-3 gap-2 flex-1">
              {CAR_ORDER.map((id, index) => {
                const def = CAR_CATALOG[id];
                const active = browseIndex === index;
                const owned = ownedCarIds.includes(id);
                const equipped = selectedCarId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectCar(index)}
                    className={`mw-slant p-2.5 md:p-3 text-left border transition-all cursor-pointer ${
                      active
                        ? 'bg-[#FF9900] border-[#FF9900] text-[#0D0E10] shadow-[0_4px_20px_rgba(255,153,0,0.35)]'
                        : 'bg-[#1A1C20]/85 border-[#3A3E45] text-[#F4F4F4] hover:border-[#FF9900]'
                    }`}
                  >
                    <div className="mw-unslant">
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                        <span className={active ? 'text-[#0D0E10]/80' : 'text-[#8E9299]'}>
                          0{index + 1}
                        </span>
                        {equipped ? (
                          <span className="font-bold text-[9px] uppercase px-1.5 py-0.2 bg-[#0D0E10] text-[#00B0FF]">
                            ACTIVE
                          </span>
                        ) : owned ? (
                          <span className="text-[9px] uppercase font-bold text-emerald-400">
                            OWNED
                          </span>
                        ) : (
                          <span className="text-[9px] uppercase font-bold text-amber-500">
                            ${def.price.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="font-[family-name:var(--font-display)] italic font-black uppercase text-sm md:text-base leading-tight truncate">
                        {def.name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => handleSelectCar((browseIndex + 1) % CAR_ORDER.length)}
              className="p-3 mw-slant bg-[#1A1C20]/90 hover:bg-[#FF9900] border border-[#3A3E45] text-[#F4F4F4] hover:text-[#0D0E10] transition-colors cursor-pointer"
              aria-label="Next Vehicle"
            >
              <ChevronRight className="w-5 h-5 mw-unslant" />
            </button>
          </div>
        </div>
      </section>

      {/* Right Sidebar: Vehicle Dossier, Stats & Dealership Actions */}
      <aside className="col-span-12 md:col-span-5 lg:col-span-4 bg-[#0D0E10]/94 border-l border-[#3A3E45] p-6 md:p-8 flex flex-col justify-between overflow-y-auto pointer-events-auto shadow-2xl backdrop-blur-md">
        <div className="space-y-5">
          {/* Top Title & Classification */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF9900] bg-[#FF9900]/10 border border-[#FF9900]/30 px-2 py-0.5">
                {carDef.class}
              </span>
              {isOwned && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/30 px-2 py-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>TITLED</span>
                </span>
              )}
            </div>
            <h1 className="font-[family-name:var(--font-display)] italic font-black uppercase text-3xl md:text-4xl text-[#F4F4F4] tracking-wide leading-none">
              {carDef.name}
            </h1>
            <p className="text-xs text-[#8E9299] mt-1 italic">
              "{carDef.tagline}"
            </p>
          </div>

          {/* Vehicle Lore / Overview */}
          <div className="bg-[#1A1C20]/80 p-3.5 border border-[#3A3E45] text-xs text-[#CCCCCC] leading-relaxed">
            {carDef.description}
          </div>

          {/* Aero & Engineering Badges */}
          <div>
            <span className="font-[family-name:var(--font-display)] italic font-bold text-xs tracking-widest uppercase block mb-2 text-[#8E9299]">
              Factory Specifications &amp; Aero Package
            </span>
            <div className="flex flex-wrap gap-1.5">
              {carDef.visualBadges.map((b, i) => (
                <span
                  key={i}
                  className="text-[10px] font-mono uppercase tracking-wider text-[#F4F4F4] bg-[#222630] border border-[#3A3E45] px-2 py-1"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Dedicated Acoustic Profile & Live Sound Test */}
          <div className="space-y-3 bg-[#1A1C20]/90 p-4 border border-[#3A3E45] border-l-4 border-l-[#00E5FF]">
            <div className="flex items-center justify-between border-b border-[#3A3E45] pb-2">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#00E5FF]" />
                <span className="font-[family-name:var(--font-display)] italic font-black text-xs uppercase tracking-wider text-[#F4F4F4]">
                  Acoustic Telemetry
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 bg-[#0D0F14] border border-[#00E5FF]/40 text-[#00E5FF]">
                {carDef.acousticProfile.badge}
              </span>
            </div>

            {/* Powertrain architecture note */}
            <div className="text-xs font-mono">
              <span className="text-[#8E9299] text-[10px] block uppercase">Powertrain Sound Signature</span>
              <strong className="text-white text-xs">{carDef.acousticProfile.engineType}</strong>
            </div>

            {/* 3 Specific Sound Attributes */}
            <div className="space-y-2 text-[11px] font-mono">
              {/* Acceleration Note */}
              <div className="p-2 bg-[#121620] border border-white/5 rounded-xs">
                <div className="flex items-center justify-between text-[#FF8C00] font-bold text-[10px] uppercase mb-0.5">
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-3 h-3 text-[#FF8C00]" />
                    <span>Acceleration Note</span>
                  </span>
                  {auditioning && auditionPhase === 'accel' && (
                    <span className="text-[9px] font-black animate-pulse text-[#FF8C00]">PLAYING REVS...</span>
                  )}
                </div>
                <p className="text-[#A0AEC0] leading-tight text-[10px]">
                  {carDef.acousticProfile.acceleration}
                </p>
              </div>

              {/* Losing Speed / Deceleration Overrun */}
              <div className="p-2 bg-[#121620] border border-white/5 rounded-xs">
                <div className="flex items-center justify-between text-[#00E5FF] font-bold text-[10px] uppercase mb-0.5">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-[#00E5FF]" />
                    <span>Losing Speed / Coasting</span>
                  </span>
                  {auditioning && auditionPhase === 'decel' && (
                    <span className="text-[9px] font-black animate-pulse text-[#00E5FF]">OVERRUN BURBLE...</span>
                  )}
                </div>
                <p className="text-[#A0AEC0] leading-tight text-[10px]">
                  {carDef.acousticProfile.deceleration}
                </p>
              </div>

              {/* Braking Sound */}
              <div className="p-2 bg-[#121620] border border-white/5 rounded-xs">
                <div className="flex items-center justify-between text-red-400 font-bold text-[10px] uppercase mb-0.5">
                  <span className="flex items-center gap-1.5">
                    <Disc className="w-3 h-3 text-red-400" />
                    <span>Braking &amp; Pad Friction</span>
                  </span>
                  {auditioning && auditionPhase === 'brake' && (
                    <span className="text-[9px] font-black animate-pulse text-red-400">BRAKE SQUEAL CLAMP...</span>
                  )}
                </div>
                <p className="text-[#A0AEC0] leading-tight text-[10px]">
                  {carDef.acousticProfile.braking}
                </p>
              </div>
            </div>

            {/* Audition Trigger Button & Equalizer */}
            <div className="pt-2 border-t border-[#3A3E45] space-y-2">
              <button
                type="button"
                onClick={handleToggleAudition}
                className={`w-full py-2.5 px-3 flex items-center justify-center gap-2 text-xs font-[family-name:var(--font-display)] italic font-black uppercase tracking-wider transition-all cursor-pointer ${
                  auditioning
                    ? 'bg-[#DC2626] text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]'
                    : 'bg-gradient-to-r from-[#00E5FF] to-[#0099FF] text-[#0D0F14] hover:brightness-110 shadow-[0_0_15px_rgba(0,229,255,0.3)]'
                }`}
              >
                {auditioning ? (
                  <>
                    <span className="w-2.5 h-2.5 bg-white rounded-xs animate-ping" />
                    <span>Stop Audition</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>Audition Engine &amp; Brakes [R]</span>
                  </>
                )}
              </button>

              {/* Dynamic Equalizer Visualizer Bars */}
              <div className="flex items-end justify-between h-5 bg-[#0D0F14] p-1 border border-white/10 rounded-xs gap-0.5">
                {Array.from({ length: 18 }).map((_, i) => {
                  let barHeight = 15;
                  if (auditioning) {
                    const wave = Math.sin((auditionProgress * 18 + i) * 1.5);
                    const intensity =
                      auditionPhase === 'accel'
                        ? 0.4 + (i / 18) * 0.55 + wave * 0.25
                        : auditionPhase === 'decel'
                        ? 0.35 + wave * 0.3
                        : auditionPhase === 'brake'
                        ? 0.5 + Math.cos(i) * 0.4
                        : 0.15;
                    barHeight = Math.max(15, Math.min(100, intensity * 100));
                  }
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-xs transition-all duration-75 ${
                        auditioning
                          ? auditionPhase === 'accel'
                            ? 'bg-gradient-to-t from-[#FF8C00] to-[#FF5500]'
                            : auditionPhase === 'decel'
                            ? 'bg-gradient-to-t from-[#00E5FF] to-[#0099FF]'
                            : 'bg-gradient-to-t from-[#EF4444] to-[#DC2626]'
                          : 'bg-[#222836]'
                      }`}
                      style={{ height: `${barHeight}%` }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Performance Dyno Bars */}
          <div className="space-y-3 bg-[#1A1C20]/90 p-4 border border-[#3A3E45]">
            <div className="flex items-center justify-between border-b border-[#3A3E45] pb-2 mb-2">
              <span className="flex items-center gap-1.5 font-[family-name:var(--font-display)] italic font-black text-xs uppercase tracking-wider text-[#FF9900]">
                <Gauge className="w-3.5 h-3.5" />
                <span>Dyno Ratings</span>
              </span>
              <span className="text-[10px] font-mono text-[#8E9299]">
                TIER S{cars[activeCarId]?.speedLevel ?? 1}
              </span>
            </div>

            {/* Top Speed Bar */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-[#8E9299]">Top Velocity</span>
                <span className="font-bold text-[#F4F4F4]">{previewSpecs.topSpeedKph} KPH</span>
              </div>
              <div className="h-2 bg-[#0D0E10] border border-[#3A3E45] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FF9900] to-[#E65100] transition-all duration-300"
                  style={{ width: `${Math.min(100, (previewSpecs.topSpeedKph / 260) * 100)}%` }}
                />
              </div>
            </div>

            {/* Acceleration 0-60 Bar */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-[#8E9299]">0–60 Acceleration</span>
                <span className="font-bold text-[#FF9900]">{previewSpecs.zeroToSixtySec.toFixed(2)}s</span>
              </div>
              <div className="h-2 bg-[#0D0E10] border border-[#3A3E45] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FF9900] to-[#E65100] transition-all duration-300"
                  style={{ width: `${Math.max(15, Math.min(100, (2.6 / previewSpecs.zeroToSixtySec) * 55))}%` }}
                />
              </div>
            </div>

            {/* Cornering Grip Bar */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-[#8E9299]">Chassis Lateral Grip</span>
                <span className="font-bold text-[#F4F4F4]">{previewSpecs.gripScore}%</span>
              </div>
              <div className="h-2 bg-[#0D0E10] border border-[#3A3E45] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#00B0FF] to-[#0284c7] transition-all duration-300"
                  style={{ width: `${previewSpecs.gripScore}%` }}
                />
              </div>
            </div>

            {/* Curb Weight */}
            <div className="pt-2 border-t border-[#3A3E45] flex items-center justify-between text-xs font-mono">
              <span className="text-[#8E9299]">Curb Weight</span>
              <span className="font-bold text-[#F4F4F4]">{carDef.baseSpecs.weightKg} KG</span>
            </div>
          </div>
        </div>

        {/* Bottom Purchase / Equip CTA Button */}
        <div className="pt-6 border-t border-[#3A3E45]">
          {isEquipped ? (
            <div className="mw-slant bg-[#10b981]/20 border border-[#10b981] p-3 text-center">
              <span className="mw-unslant flex items-center justify-center gap-2 font-[family-name:var(--font-display)] italic font-black uppercase text-sm tracking-wider text-[#10b981]">
                <Check className="w-5 h-5" />
                <span>CURRENTLY EQUIPPED</span>
              </span>
            </div>
          ) : isOwned ? (
            <button
              type="button"
              onClick={handleAction}
              className="w-full mw-slant bg-[#00B0FF] hover:bg-[#0284c7] border border-[#00B0FF] p-3.5 text-[#0D0E10] transition-colors cursor-pointer"
            >
              <span className="mw-unslant flex items-center justify-center gap-2 font-[family-name:var(--font-display)] italic font-black uppercase text-base tracking-wider">
                <Zap className="w-5 h-5" />
                <span>EQUIP VEHICLE [ENTER]</span>
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAction}
              disabled={!canAfford}
              className={`w-full mw-slant p-3.5 border transition-all cursor-pointer ${
                canAfford
                  ? 'bg-[#FF9900] hover:bg-[#E65100] border-[#FF9900] text-[#0D0E10] shadow-[0_4px_24px_rgba(255,153,0,0.35)]'
                  : 'bg-[#1A1C20] border-[#3A3E45] text-[#8E9299] opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="mw-unslant flex items-center justify-between">
                <div className="flex items-center gap-2 font-[family-name:var(--font-display)] italic font-black uppercase text-base tracking-wider">
                  <ShoppingBag className="w-5 h-5" />
                  <span>{canAfford ? 'PURCHASE VEHICLE' : 'INSUFFICIENT FUNDS'}</span>
                </div>
                <div className="font-mono font-bold text-sm">
                  ${carDef.price.toLocaleString()}
                </div>
              </div>
            </button>
          )}
        </div>
      </aside>
    </main>
  );
}
