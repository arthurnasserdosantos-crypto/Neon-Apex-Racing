import React from 'react';
import { useGameStore } from '../store';
import { MainMenu } from './MainMenu';
import { Garage } from './Garage';
import { Career } from './Career';
import { CarLot } from './CarLot';
import { HUD } from './HUD';
import { BottomControlTicker, PlayerRapSheet } from './ShowroomChrome';
import { DevMenu } from './DevMenu';
import { TURNTABLE_CONFIG } from '../utils/turntableConfig';

export function Overlay() {
  const view = useGameStore((state) => state.view);
  const menuTransitionPhase = useGameStore((state) => state.menuTransitionPhase);
  const isShowroom = view === 'MENU' || view === 'GARAGE' || view === 'CAREER' || view === 'CAR_LOT';

  const tickerHints =
    view === 'MENU'
      ? [
          { keyLabel: 'W / S', action: 'Navigate' },
          { keyLabel: 'ENTER', action: 'Select' },
          { keyLabel: 'Q / E', action: 'Rotate Cam' },
          { keyLabel: 'ESC', action: 'Close Panel' },
        ]
      : view === 'CAREER'
      ? [
          { keyLabel: 'CLICK', action: 'Launch Event' },
          { keyLabel: 'ESC', action: 'Main Menu' },
          { keyLabel: 'Q / E', action: 'Rotate Cam' },
        ]
      : view === 'CAR_LOT'
      ? [
          { keyLabel: 'A / D', action: 'Browse Cars' },
          { keyLabel: 'R', action: 'Audition Sound' },
          { keyLabel: 'ENTER', action: 'Purchase / Equip' },
          { keyLabel: 'ESC', action: 'Return' },
        ]
      : [
          { keyLabel: 'DRAG', action: 'Orbit Car' },
          { keyLabel: 'Q / E', action: 'Rotate Cam' },
          { keyLabel: 'ESC', action: 'Main Menu' },
        ];

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col text-[#F4F4F4] font-sans">
      {/* Developer Command Override Menu & Cheat Sequence Listener */}
      <DevMenu />

      {/* Screen-Edge Vignette + Atmospheric Scrims over 3D Showroom Backdrop */}
      {isShowroom && (
        <div className="absolute inset-0 z-0 pointer-events-none mw-vignette">
          <div className="absolute inset-y-0 left-0 w-3/5 bg-gradient-to-r from-[#0D0E10]/85 via-[#0D0E10]/40 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-[#0D0E10]/90 via-[#0D0E10]/35 to-transparent" />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background:
                'radial-gradient(circle at 65% 48%, rgba(255, 153, 0, 0.16), transparent 58%)',
            }}
          />
        </div>
      )}

      {/* Top-Left Player Rap Sheet (visible across Showroom views) */}
      {isShowroom && (
        <div className="relative z-20 flex flex-wrap items-start justify-between gap-4 px-5 md:px-10 pt-5 md:pt-7 pointer-events-none">
          <PlayerRapSheet />
        </div>
      )}

      {/* Active Screen Viewport */}
      <div className="flex-1 relative z-10 flex flex-col min-h-0">
        {view === 'MENU' && <MainMenu />}
        {view === 'GARAGE' && <Garage />}
        {view === 'CAREER' && <Career />}
        {view === 'CAR_LOT' && <CarLot />}
        {(view === 'RACE' || view === 'FREE_ROAM') && <HUD />}
      </div>

      {/* Bottom Control Hints & Scrolling Street Scanner Ticker */}
      {isShowroom && <BottomControlTicker hints={tickerHints} />}

      {/* Opaque Transition Curtain hiding turntable/camera snap before smoothly revealing Main Menu */}
      {menuTransitionPhase !== 'idle' && (
        <div
          aria-hidden="true"
          style={{
            transitionDuration:
              menuTransitionPhase === 'fading_in'
                ? `${TURNTABLE_CONFIG.transitionFadeOutMs}ms`
                : '0ms',
          }}
          className={`fixed inset-0 z-[90] bg-[#07090D] ${
            menuTransitionPhase === 'covered'
              ? 'opacity-100 transition-none pointer-events-auto'
              : 'opacity-0 transition-opacity ease-out pointer-events-none'
          }`}
        />
      )}
    </div>
  );
}
