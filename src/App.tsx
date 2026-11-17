/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useGameStore } from './store';
import { GameStationHub } from './components/GameStationHub';
import { GameScene } from './components/GameScene';
import { Overlay } from './components/Overlay';
import { ShooterGame } from './components/shooter/ShooterGame';
import { GeometryDashGame } from './components/geometryDash/GeometryDashGame';
import { RobloxGame } from './components/roblox/RobloxGame';
import { GuitarHeroGame } from './components/guitarHero/GuitarHeroGame';
import { Mario3DGame } from './components/mario/Mario3DGame';

export default function App() {
  const appStationMode = useGameStore((s) => s.appStationMode);
  const setAppStationMode = useGameStore((s) => s.setAppStationMode);

  return (
    <div className="w-full h-full relative overflow-hidden bg-black font-sans">
      {appStationMode === 'STATION' && (
        <GameStationHub
          onLaunchNeonApex={() => setAppStationMode('NEON_APEX')}
          onLaunchShooter={() => setAppStationMode('SHOOTER')}
          onLaunchGeometryDash={() => setAppStationMode('GEOMETRY_DASH')}
          onLaunchRoblox={() => setAppStationMode('ROBLOX')}
          onLaunchGuitarHero={() => setAppStationMode('GUITAR_HERO')}
          onLaunchMario3D={() => setAppStationMode('MARIO_3D')}
        />
      )}

      {appStationMode === 'NEON_APEX' && (
        <>
          <GameScene />
          <Overlay />
        </>
      )}

      {appStationMode === 'SHOOTER' && (
        <ShooterGame onExitToStation={() => setAppStationMode('STATION')} />
      )}

      {appStationMode === 'GEOMETRY_DASH' && (
        <GeometryDashGame onExitToStation={() => setAppStationMode('STATION')} />
      )}

      {appStationMode === 'ROBLOX' && (
        <RobloxGame onExitToStation={() => setAppStationMode('STATION')} />
      )}

      {appStationMode === 'GUITAR_HERO' && (
        <GuitarHeroGame onExitToStation={() => setAppStationMode('STATION')} />
      )}

      {appStationMode === 'MARIO_3D' && (
        <Mario3DGame onExitToStation={() => setAppStationMode('STATION')} />
      )}
    </div>
  );
}
