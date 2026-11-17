/**
 * Interactive Arcade Music Studio & Beat Generator for Geometry Dash
 */

import React, { useEffect, useState } from 'react';
import {
  Flame,
  Music,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import {
  arcadeMusic,
  ARCADE_PRESETS,
  MusicTrackPreset,
} from './arcadeMusicEngine';

interface ArcadeMusicStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTrack: (preset: MusicTrackPreset) => void;
  activePresetId: string;
}

export function ArcadeMusicStudio({
  isOpen,
  onClose,
  onApplyTrack,
  activePresetId,
}: ArcadeMusicStudioProps) {
  const [selectedPreset, setSelectedPreset] = useState<MusicTrackPreset>(() => {
    return (
      ARCADE_PRESETS.find((p) => p.id === activePresetId) || ARCADE_PRESETS[0]
    );
  });
  const [customTracks, setCustomTracks] = useState<MusicTrackPreset[]>([]);
  const [targetBpm, setTargetBpm] = useState(150);
  const [energyLevel, setEnergyLevel] = useState<'high' | 'ultra' | 'frenzy'>('ultra');
  const [customTrackName, setCustomTrackName] = useState('Cyber Turbo 3000');
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [pulseLevel, setPulseLevel] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      if (isPlayingPreview) {
        arcadeMusic.stop();
        setIsPlayingPreview(false);
      }
      return;
    }

    const interval = setInterval(() => {
      setPulseLevel(arcadeMusic.getBeatPulse());
    }, 40);

    return () => clearInterval(interval);
  }, [isOpen, isPlayingPreview]);

  if (!isOpen) return null;

  const handleTogglePlay = (preset: MusicTrackPreset) => {
    if (isPlayingPreview && selectedPreset.id === preset.id) {
      arcadeMusic.stop();
      setIsPlayingPreview(false);
    } else {
      arcadeMusic.setPreset(preset);
      arcadeMusic.start();
      setSelectedPreset(preset);
      setIsPlayingPreview(true);
    }
  };

  const handleGenerate = () => {
    const cleanName = customTrackName.trim() || `Arcade Rush #${customTracks.length + 1}`;
    const newTrack = arcadeMusic.generateTrack(cleanName, targetBpm, energyLevel);
    setCustomTracks((prev) => [newTrack, ...prev]);
    setSelectedPreset(newTrack);
    arcadeMusic.setPreset(newTrack);
    arcadeMusic.restart();
    setIsPlayingPreview(true);
  };

  const allPresets = [...ARCADE_PRESETS, ...customTracks];

  return (
    <div className="fixed inset-0 z-50 bg-[#07090D]/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-[#0D1117] border-2 border-[#00F0FF] shadow-[0_0_50px_rgba(0,240,255,0.35)] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <header className="p-4 md:px-6 bg-[#141822] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-[#00F0FF]/15 border border-[#00F0FF] flex items-center justify-center text-[#00F0FF]">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-racing)] italic font-black uppercase text-xl text-white tracking-wider">
                ARCADE BANGER MUSIC STUDIO
              </h2>
              <p className="text-[10px] font-mono text-[#8E96A4] uppercase tracking-widest">
                PROCEDURAL EDM &amp; CHIPTUNE BEAT GENERATOR
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#8E96A4] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 text-white font-sans">
          {/* Live Audio Visualizer Banner */}
          <div className="p-4 bg-gradient-to-r from-[#141822] via-[#1a2333] to-[#141822] border border-[#00F0FF]/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-mono text-[#00F0FF] uppercase tracking-widest font-bold">
                ACTIVE MONITOR
              </div>
              <div className="font-[family-name:var(--font-racing)] italic font-bold text-lg text-white">
                {selectedPreset.name}
              </div>
              <div className="text-xs font-mono text-[#8E96A4]">
                TEMPO: <strong className="text-white">{selectedPreset.bpm} BPM</strong> · ENERGY:{' '}
                <strong className="text-[#FF8C00] uppercase">{selectedPreset.energy}</strong>
              </div>
            </div>

            {/* Dynamic Equalizer Bars */}
            <div className="flex items-end gap-1.5 h-10 px-4 bg-black/40 rounded-xs border border-white/5">
              {[0.4, 0.9, 0.6, 1.0, 0.7, 0.85, 0.5, 0.95, 0.65].map((scale, i) => (
                <div
                  key={i}
                  className="w-2 bg-gradient-to-t from-[#00F0FF] to-[#A855F7] rounded-xs"
                  style={{
                    height: isPlayingPreview
                      ? `${Math.max(15, Math.min(100, scale * (50 + pulseLevel * 50)))}%`
                      : '20%',
                    transition: 'height 0.08s ease-out',
                  }}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTogglePlay(selectedPreset)}
                className="px-4 py-2 bg-gradient-to-r from-[#00F0FF] to-[#0088FF] text-[#0D0F14] font-[family-name:var(--font-racing)] italic font-black uppercase text-xs tracking-wider flex items-center gap-2 shadow-md cursor-pointer hover:brightness-110"
              >
                {isPlayingPreview ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    STOP
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    TEST BEAT
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generator Controls Section */}
          <div className="p-4 bg-[#141822] border border-white/10 rounded-xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-[#FF8C00] font-bold uppercase tracking-widest">
              <Wand2 className="w-4 h-4" />
              <span>PROCEDURAL BEAT GENERATOR</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#8E96A4] mb-1">
                  Track Name
                </label>
                <input
                  type="text"
                  value={customTrackName}
                  onChange={(e) => setCustomTrackName(e.target.value)}
                  className="w-full bg-[#0D1117] border border-white/15 focus:border-[#00F0FF] px-3 py-1.5 text-xs font-mono text-white outline-none"
                  placeholder="Custom Track Name"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[#8E96A4] mb-1">
                  <span>Tempo (BPM)</span>
                  <span className="text-white font-bold">{targetBpm}</span>
                </div>
                <input
                  type="range"
                  min={130}
                  max={175}
                  step={1}
                  value={targetBpm}
                  onChange={(e) => setTargetBpm(Number(e.target.value))}
                  className="w-full accent-[#00F0FF] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#8E96A4] mb-1">
                  Energy Profile
                </label>
                <div className="flex gap-1">
                  {(['high', 'ultra', 'frenzy'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setEnergyLevel(lvl)}
                      className={`flex-1 py-1.5 text-[10px] font-mono font-bold uppercase border cursor-pointer transition-colors ${
                        energyLevel === lvl
                          ? 'bg-[#FF8C00] border-[#FFAA33] text-[#0D0F14]'
                          : 'bg-[#0D1117] border-white/10 text-[#8E96A4] hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              className="w-full py-2.5 bg-gradient-to-r from-[#FF8C00] via-[#FF7700] to-[#FF5500] hover:brightness-110 text-[#0D0F14] font-[family-name:var(--font-racing)] italic font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              SYNTHESIZE NEW BANGER ARCADE BEAT
            </button>
          </div>

          {/* Preset Selector Grid */}
          <div>
            <div className="text-[10px] font-mono text-[#8E96A4] uppercase tracking-widest mb-2.5 font-bold">
              SOUNDTRACK LIBRARY ({allPresets.length} TRACKS)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {allPresets.map((preset) => {
                const isSelected = selectedPreset.id === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      setSelectedPreset(preset);
                      if (isPlayingPreview) {
                        arcadeMusic.setPreset(preset);
                        arcadeMusic.restart();
                      }
                    }}
                    className={`p-3 border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#141822] border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                        : 'bg-[#0D1117] border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div>
                      <div className="font-[family-name:var(--font-racing)] italic font-bold text-sm text-white flex items-center gap-2">
                        {preset.name}
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-ping" />
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-[#8E96A4]">
                        {preset.bpm} BPM · {preset.energy.toUpperCase()} ENERGY
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePlay(preset);
                      }}
                      className="p-2 bg-[#0D1117] hover:bg-[#00F0FF] hover:text-[#0D0F14] text-[#00F0FF] border border-[#00F0FF]/40 rounded-xs transition-colors cursor-pointer"
                    >
                      {isPlayingPreview && selectedPreset.id === preset.id ? (
                        <Square className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <footer className="p-4 md:px-6 bg-[#141822] border-t border-white/10 flex items-center justify-between">
          <span className="text-xs font-mono text-[#8E96A4]">
            ACTIVE: <strong className="text-white">{selectedPreset.name}</strong>
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#0D1117] hover:bg-[#1a2333] border border-white/15 text-xs font-mono font-bold uppercase text-[#8E96A4] hover:text-white cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={() => {
                onApplyTrack(selectedPreset);
                onClose();
              }}
              className="px-5 py-2 bg-gradient-to-r from-[#00F0FF] to-[#0088FF] text-[#0D0F14] font-[family-name:var(--font-racing)] italic font-black uppercase text-xs tracking-wider shadow-md hover:brightness-110 cursor-pointer"
            >
              APPLY TO GEOMETRY DASH
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
