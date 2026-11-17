/**
 * Geometry Dash: High-Speed Neon Rhythm Platformer
 * Features Cube, Ship, Ball, and Wave gamemodes, rotated objects collision & rendering,
 * interactive Level Studio with object rotation, practice mode, and procedural arcade music.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowLeft,
  CircleDot,
  Grid,
  Music,
  Palette,
  Play,
  Plus,
  Rocket,
  Square,
  Trash2,
  Trophy,
  Volume2,
  Waves,
  Zap,
} from 'lucide-react';
import {
  arcadeMusic,
  ARCADE_PRESETS,
  MusicTrackPreset,
} from './arcadeMusicEngine';
import {
  GEOMETRY_LEVELS,
  GeometryLevelDef,
  PlayerGameMode,
} from './geometryLevels';
import { drawLevelObject } from './levelRenderer';
import { ArcadeMusicStudio } from './ArcadeMusicStudio';
import { LevelStudioModal } from './LevelStudioModal';
import { bgmPlayer } from '../../utils/bgmPlayer';

interface GeometryDashGameProps {
  onExitToStation: () => void;
}

interface DeathParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  alpha: number;
}

interface TrailPoint {
  x: number;
  y: number;
  rotation: number;
  alpha: number;
}

const CUSTOM_LEVELS_STORAGE_KEY = 'gd_custom_levels_v4';

function loadSavedLevels(): GeometryLevelDef[] {
  try {
    const raw = localStorage.getItem(CUSTOM_LEVELS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GeometryLevelDef[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fallback to default levels
  }
  return GEOMETRY_LEVELS;
}

export function GeometryDashGame({ onExitToStation }: GeometryDashGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // View Mode: 'MENU' | 'PLAY' | 'ICONS' | 'EDITOR_MENU'
  const [viewMode, setViewMode] = useState<'MENU' | 'PLAY' | 'ICONS' | 'EDITOR_MENU'>('MENU');

  // Levels & Studio State
  const [levels, setLevels] = useState<GeometryLevelDef[]>(loadSavedLevels);
  const [levelIndex, setLevelIndex] = useState(0);
  const currentLevel = levels[levelIndex] || levels[0];

  const [activeTrack, setActiveTrack] = useState<MusicTrackPreset>(() => {
    return (
      ARCADE_PRESETS.find((p) => p.id === currentLevel.trackPresetId) ||
      ARCADE_PRESETS[0]
    );
  });

  const [attempts, setAttempts] = useState(1);
  const [progressPct, setProgressPct] = useState(0);
  const [bestProgress, setBestProgress] = useState(0);
  const [practiceMode, setPracticeMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isVictorious, setIsVictorious] = useState(false);
  const [isMusicStudioOpen, setIsMusicStudioOpen] = useState(false);
  const [isLevelStudioOpen, setIsLevelStudioOpen] = useState(false);
  const [collectedCoins, setCollectedCoins] = useState(0);

  // Gamemode state: optional manual override ('AUTO' uses level startingMode + portals)
  const [modeOverride, setModeOverride] = useState<'AUTO' | PlayerGameMode>('AUTO');
  const [activeGameMode, setActiveGameMode] = useState<PlayerGameMode>(
    currentLevel.startingMode || 'CUBE',
  );

  // Player Customization
  const [playerColor, setPlayerColor] = useState('#00F0FF');
  const [playerFace, setPlayerFace] = useState<'classic' | 'visor' | 'ninja'>('classic');

  const getInitialMode = useCallback((): PlayerGameMode => {
    if (modeOverride !== 'AUTO') return modeOverride;
    return currentLevel.startingMode || 'CUBE';
  }, [modeOverride, currentLevel]);

  // Refs for 60fps Game Loop
  const gameRef = useRef({
    x: 0, // In pixels
    y: 0, // In pixels above ground
    vy: 0,
    rotation: 0, // In radians
    onGround: true,
    gravityDirection: 1, // 1 = normal (falls to floor), -1 = inverted (falls to ceiling)
    mode: 'CUBE' as PlayerGameMode,
    isDead: false,
    deathTimer: 0,
    jumpHeld: false,
    practiceCheckpoints: [] as Array<{
      x: number;
      y: number;
      gravity: number;
      mode: PlayerGameMode;
    }>,
    levelWidthPx: 0,
    coinsCollectedMap: new Set<string>(),
    usedOrbs: new Set<string>(),
    waveTrail: [] as Array<{ x: number; y: number }>,
    waveRotFrom: 0,
    waveRotTarget: 0,
    waveRotElapsed: 0.12,
  });

  const bestProgressRef = useRef(bestProgress);
  bestProgressRef.current = bestProgress;

  // Pause the root BGM player when Geometry Dash takes over with its arcade engine
  useEffect(() => {
    bgmPlayer.pause();
    arcadeMusic.setPreset(activeTrack);
    arcadeMusic.restart();

    return () => {
      arcadeMusic.stop();
    };
  }, [activeTrack]);

  // Reset level metrics when level or mode override changes
  useEffect(() => {
    const preset =
      ARCADE_PRESETS.find((p) => p.id === currentLevel.trackPresetId) ||
      ARCADE_PRESETS[0];
    setActiveTrack(preset);
    arcadeMusic.setPreset(preset);
    arcadeMusic.restart();

    setAttempts(1);
    setProgressPct(0);
    setIsVictorious(false);
    setCollectedCoins(0);

    const savedBest = localStorage.getItem(`gd_best_${currentLevel.id}`);
    setBestProgress(savedBest ? Number(savedBest) : 0);

    const startMode = getInitialMode();
    gameRef.current.x = 0;
    gameRef.current.y = startMode === 'SHIP' || startMode === 'WAVE' ? 100 : 0;
    gameRef.current.vy = 0;
    gameRef.current.rotation = 0;
    gameRef.current.gravityDirection = 1;
    gameRef.current.mode = startMode;
    setActiveGameMode(startMode);
    gameRef.current.isDead = false;
    gameRef.current.coinsCollectedMap.clear();
    gameRef.current.usedOrbs.clear();
    gameRef.current.practiceCheckpoints = [];
    gameRef.current.waveTrail = [];
    gameRef.current.waveRotFrom = 0;
    gameRef.current.waveRotTarget = 0;
    gameRef.current.waveRotElapsed = 0.12;
  }, [levelIndex, currentLevel, getInitialMode]);

  // Restart / Reset logic
  const restartRun = useCallback(
    (useCheckpoint = false) => {
      const g = gameRef.current;
      g.isDead = false;
      g.deathTimer = 0;
      g.usedOrbs.clear();
      g.waveTrail = [];
      g.waveRotFrom = 0;
      g.waveRotTarget = 0;
      g.waveRotElapsed = 0.12;

      if (practiceMode && useCheckpoint && g.practiceCheckpoints.length > 0) {
        const cp = g.practiceCheckpoints[g.practiceCheckpoints.length - 1];
        g.x = cp.x;
        g.y = cp.y;
        g.vy = 0;
        g.gravityDirection = cp.gravity;
        g.mode = cp.mode;
        setActiveGameMode(cp.mode);
        g.rotation = 0;
      } else {
        const startMode = getInitialMode();
        g.x = 0;
        g.y = startMode === 'SHIP' || startMode === 'WAVE' ? 100 : 0;
        g.vy = 0;
        g.rotation = 0;
        g.gravityDirection = 1;
        g.mode = startMode;
        setActiveGameMode(startMode);
        setAttempts((prev) => prev + 1);
        arcadeMusic.restart();
      }
    },
    [practiceMode, getInitialMode],
  );

  // Jump / Orb / Ball-Flip trigger
  const triggerJump = useCallback(
    (allowOrb = true) => {
      const g = gameRef.current;
      if (g.isDead || isPaused || isVictorious || isLevelStudioOpen || isMusicStudioOpen) {
        return;
      }

      const UNIT = 34;
      const JUMP_VEL = 710; // ~2.19 blocks peak height with GRAVITY = 3380 px/s^2
      const playerBox = {
        x: g.x,
        y: g.y,
        w: UNIT,
        h: UNIT,
      };

      // Check interactive Jump Ring Orbs (tap only)
      let hitOrb = false;
      if (allowOrb) {
        for (const obj of currentLevel.objects) {
          if (
            (obj.type !== 'JUMP_RING_YELLOW' && obj.type !== 'JUMP_RING_BLUE') ||
            g.usedOrbs.has(obj.id)
          ) {
            continue;
          }

          const objPx = {
            x: obj.x * UNIT,
            y: obj.y * UNIT,
            w: UNIT,
            h: UNIT,
          };

          const dist = Math.hypot(
            playerBox.x + UNIT / 2 - (objPx.x + UNIT / 2),
            playerBox.y + UNIT / 2 - (objPx.y + UNIT / 2),
          );

          if (dist < UNIT * 1.35) {
            if (obj.type === 'JUMP_RING_YELLOW') {
              g.vy = JUMP_VEL * g.gravityDirection;
              g.onGround = false;
              g.usedOrbs.add(obj.id);
              hitOrb = true;
              arcadeMusic.playOrbRing();
              break;
            } else if (obj.type === 'JUMP_RING_BLUE') {
              g.gravityDirection *= -1;
              g.vy = -420 * g.gravityDirection;
              g.onGround = false;
              g.usedOrbs.add(obj.id);
              hitOrb = true;
              arcadeMusic.playGravityFlip();
              break;
            }
          }
        }
      }

      if (hitOrb) return;

      if (g.mode === 'CUBE' && g.onGround) {
        g.vy = JUMP_VEL * g.gravityDirection;
        g.onGround = false;
        arcadeMusic.playJump();
      } else if (g.mode === 'BALL' && g.onGround && allowOrb) {
        // Ball mode flips gravity whenever tapped on ground/ceiling/block
        g.gravityDirection *= -1;
        g.vy = -160 * g.gravityDirection; // immediate snap impulse toward new surface
        g.onGround = false;
        arcadeMusic.playGravityFlip();
      }
    },
    [currentLevel, isPaused, isVictorious, isLevelStudioOpen, isMusicStudioOpen],
  );

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    if (viewMode !== 'PLAY') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const UNIT = 34; // 34px per grid unit
    const FLOOR_HEIGHT = 80;
    const CEILING_HEIGHT = 8 * UNIT; // 272px playable vertical corridor
    gameRef.current.levelWidthPx = currentLevel.lengthUnits * UNIT;

    let particles: DeathParticle[] = [];
    let trail: TrailPoint[] = [];

    let animId = 0;
    let lastTime = performance.now();

    const spawnDeathBurst = (x: number, y: number) => {
      particles = [];
      const colors = [playerColor, '#FFFFFF', '#FF0055', '#EAB308'];
      for (let i = 0; i < 28; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 260 + 80;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * Math.PI * 2,
          alpha: 1.0,
        });
      }
    };

    const killPlayer = (g: typeof gameRef.current) => {
      g.isDead = true;
      arcadeMusic.playDeath();
      spawnDeathBurst(g.x + UNIT / 2, g.y + UNIT / 2);
    };

    const setMode = (g: typeof gameRef.current, nextMode: PlayerGameMode) => {
      if (g.mode !== nextMode) {
        g.mode = nextMode;
        setActiveGameMode(nextMode);
        if (nextMode === 'WAVE') {
          g.waveTrail = [{ x: g.x + UNIT / 2, y: g.y + UNIT / 2 }];
          g.waveRotFrom = g.rotation;
          g.waveRotTarget = g.rotation;
          g.waveRotElapsed = 0.12;
        } else {
          g.waveTrail = [];
        }
        arcadeMusic.playGravityFlip();
      }
    };

    const render = (now: number) => {
      animId = requestAnimationFrame(render);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const g = gameRef.current;
      const W = canvas.width;
      const H = canvas.height;
      const gameplayFrozen = isPaused || isVictorious || isLevelStudioOpen || isMusicStudioOpen;

      if (g.isDead) {
        g.deathTimer += dt;
        if (g.deathTimer > 0.65) {
          restartRun(practiceMode);
        }
      } else if (!gameplayFrozen) {
        // Auto-jump while holding in Cube mode
        if (g.mode === 'CUBE' && g.jumpHeld && g.onGround) {
          triggerJump(false);
        }

        // Horizontal forward speed synced to track BPM (~10.39 blocks/sec at 145 BPM)
        const baseSpeedPxPerSec =
          (activeTrack.bpm / 60) * UNIT * 4.3 * currentLevel.speedMultiplier;
        g.x += baseSpeedPxPerSec * dt;

        // Progress Calculation
        const progress = Math.min(100, Math.round((g.x / g.levelWidthPx) * 100));
        setProgressPct(progress);

        if (progress > bestProgressRef.current) {
          setBestProgress(progress);
          localStorage.setItem(`gd_best_${currentLevel.id}`, progress.toString());
        }

        // Check Victory at end of level
        if (g.x >= g.levelWidthPx) {
          setIsVictorious(true);
          arcadeMusic.playVictory();
          return;
        }

        // Mode-Specific Vertical Physics
        if (g.mode === 'CUBE') {
          const GRAVITY = 3380;
          g.vy -= GRAVITY * g.gravityDirection * dt;
          g.y += g.vy * dt;

          if (!g.onGround) {
            g.rotation += dt * 7.6 * g.gravityDirection;
          } else {
            const snapped = Math.round(g.rotation / (Math.PI / 2)) * (Math.PI / 2);
            g.rotation = lerp(g.rotation, snapped, Math.min(1, dt * 22));
          }
        } else if (g.mode === 'SHIP') {
          const SHIP_THRUST = 1850;
          const SHIP_GRAVITY = 1380;
          const accel = g.jumpHeld ? SHIP_THRUST : -SHIP_GRAVITY;
          g.vy += accel * g.gravityDirection * dt;
          g.vy = Math.max(-460, Math.min(460, g.vy));
          g.y += g.vy * dt;

          // Smooth tilt matching vertical flight slope
          const targetRot = Math.max(-0.55, Math.min(0.55, -(g.vy / 520)));
          g.rotation = lerp(g.rotation, targetRot, Math.min(1, dt * 14));
        } else if (g.mode === 'BALL') {
          const BALL_GRAVITY = 2850;
          g.vy -= BALL_GRAVITY * g.gravityDirection * dt;
          g.y += g.vy * dt;
          // Continuous rolling spin
          g.rotation += dt * 11 * g.gravityDirection;
        } else if (g.mode === 'WAVE') {
          // Crisp 45-degree diagonal zig-zag trajectory (instantaneous)
          const waveDir = g.jumpHeld ? 1 : -1;
          g.vy = waveDir * baseSpeedPxPerSec * g.gravityDirection;
          g.y += g.vy * dt;

          const clampedToFloor = g.y <= 0 && waveDir * g.gravityDirection < 0;
          const clampedToCeiling =
            g.y >= CEILING_HEIGHT - UNIT && waveDir * g.gravityDirection > 0;
          const targetRot =
            clampedToFloor || clampedToCeiling
              ? 0
              : waveDir * g.gravityDirection > 0
              ? -Math.PI / 4
              : Math.PI / 4;

          // Smoothly rotate ONLY the Wave icon over 0.12s (trajectory remains unaffected)
          const WAVE_ROT_DURATION = 0.12;
          if (Math.abs(targetRot - g.waveRotTarget) > 0.001) {
            g.waveRotFrom = g.rotation;
            g.waveRotTarget = targetRot;
            g.waveRotElapsed = 0;
          }
          g.waveRotElapsed = Math.min(WAVE_ROT_DURATION, g.waveRotElapsed + dt);
          const rotT = g.waveRotElapsed / WAVE_ROT_DURATION;
          const easedT = rotT < 1 ? 1 - Math.pow(1 - rotT, 2) : 1;
          g.rotation = lerp(g.waveRotFrom, g.waveRotTarget, easedT);
        }

        // Floor & Ceiling Boundaries (y = 0 .. CEILING_HEIGHT - UNIT)
        if (g.y <= 0) {
          g.y = 0;
          if (g.gravityDirection === 1) {
            if (g.vy < 0) g.vy = 0;
            g.onGround = true;
          } else {
            if (g.vy < 0) g.vy = 0;
            g.onGround = g.mode === 'SHIP' || g.mode === 'WAVE';
          }
        } else if (g.y >= CEILING_HEIGHT - UNIT) {
          g.y = CEILING_HEIGHT - UNIT;
          if (g.gravityDirection === -1) {
            if (g.vy > 0) g.vy = 0;
            g.onGround = true;
          } else {
            if (g.vy > 0) g.vy = 0;
            g.onGround = g.mode === 'SHIP' || g.mode === 'WAVE';
          }
        } else {
          g.onGround = false;
        }

        // Trail emission
        if (g.mode === 'WAVE') {
          g.waveTrail.push({ x: g.x + UNIT / 2, y: g.y + UNIT / 2 });
          if (g.waveTrail.length > 90) {
            g.waveTrail.shift();
          }
        } else if (Math.random() > 0.35) {
          trail.push({
            x: g.x + UNIT / 2,
            y: g.y + UNIT / 2,
            rotation: g.rotation,
            alpha: 0.75,
          });
        }

        // Object Collisions (including Rotated Objects!)
        const playerLeft = g.x;
        const playerRight = g.x + UNIT;
        const playerBottom = g.y;
        const playerTop = g.y + UNIT;
        const playerCx = g.x + UNIT / 2;
        const playerCy = g.y + UNIT / 2;

        for (const obj of currentLevel.objects) {
          const isPortal =
            obj.type === 'GRAVITY_PORTAL_BLUE' ||
            obj.type === 'GRAVITY_PORTAL_YELLOW' ||
            obj.type === 'PORTAL_CUBE' ||
            obj.type === 'PORTAL_SHIP' ||
            obj.type === 'PORTAL_BALL' ||
            obj.type === 'PORTAL_WAVE';

          const objW = (obj.width || 1) * UNIT;
          const objH = (obj.height || (isPortal ? 2.2 : 1)) * UNIT;
          const objLeft = obj.x * UNIT;
          const objRight = objLeft + objW;
          const objBottom = obj.y * UNIT;
          const objTop = objBottom + objH;
          const rotDeg = obj.rotation || 0;
          const rotRad = (rotDeg * Math.PI) / 180;

          // Broadphase check with slight padding for rotated corners
          const pad = rotDeg !== 0 ? 12 : 0;
          if (
            playerRight < objLeft - pad ||
            playerLeft > objRight + pad ||
            playerTop < objBottom - pad ||
            playerBottom > objTop + pad
          ) {
            continue;
          }

          // 1. Spikes (transformed into object's local rotated frame for exact angle accuracy)
          if (obj.type === 'SPIKE' || obj.type === 'HALF_SPIKE') {
            const objCx = objLeft + objW / 2;
            const objCy = objBottom + objH / 2;
            const dx = playerCx - objCx;
            const dy = objCy - playerCy; // screen-Y delta (down positive)

            const cos = Math.cos(-rotRad);
            const sin = Math.sin(-rotRad);
            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;

            const halfSpanX = objW * 0.24 + (g.mode === 'WAVE' ? 1 : 0);
            const minTipY = obj.type === 'HALF_SPIKE' ? -objH * 0.05 : -objH * 0.26;
            const maxBaseY = objH * 0.34;

            if (Math.abs(localX) < halfSpanX && localY > minTipY && localY < maxBaseY) {
              killPlayer(g);
              break;
            }
            continue;
          }

          // 2. Solid Blocks & Slabs (rotated diamonds vs axis-aligned platforms)
          if (obj.type === 'BLOCK' || obj.type === 'SLAB') {
            const blockH = obj.type === 'SLAB' ? objH * 0.5 : objH;
            const blockTop = objBottom + blockH;

            if (rotDeg % 90 !== 0) {
              // Tilted / 45-degree rotated diamond block hazard
              const objCx = objLeft + objW / 2;
              const objCy = objBottom + blockH / 2;
              const dx = playerCx - objCx;
              const dy = objCy - playerCy;
              const cos = Math.cos(-rotRad);
              const sin = Math.sin(-rotRad);
              const localX = dx * cos - dy * sin;
              const localY = dx * sin + dy * cos;

              const hitHalf = UNIT * 0.68;
              if (Math.abs(localX) < hitHalf && Math.abs(localY) < hitHalf) {
                killPlayer(g);
                break;
              }
              continue;
            }

            // Axis-aligned block AABB
            if (
              playerRight > objLeft + 4 &&
              playerLeft < objRight - 4 &&
              playerTop > objBottom + 4 &&
              playerBottom < blockTop - 4
            ) {
              if (g.mode === 'WAVE') {
                // Standard GD Wave dies on touching any block
                killPlayer(g);
                break;
              }

              if (g.gravityDirection === 1) {
                if (g.vy <= 0 && playerBottom >= blockTop - 16) {
                  g.y = blockTop;
                  g.vy = 0;
                  g.onGround = true;
                } else if (g.mode === 'SHIP' && g.vy >= 0 && playerTop <= objBottom + 14) {
                  g.y = objBottom - UNIT;
                  g.vy = 0;
                } else if (playerRight > objLeft + 8 && playerBottom < blockTop - 6) {
                  killPlayer(g);
                  break;
                }
              } else {
                if (g.vy >= 0 && playerTop <= objBottom + 16) {
                  g.y = objBottom - UNIT;
                  g.vy = 0;
                  g.onGround = true;
                } else if (g.mode === 'SHIP' && g.vy <= 0 && playerBottom >= blockTop - 14) {
                  g.y = blockTop;
                  g.vy = 0;
                } else if (playerRight > objLeft + 8 && playerTop > objBottom + 6) {
                  killPlayer(g);
                  break;
                }
              }
            }
            continue;
          }

          // Standard overlap check for pads, portals, coins
          if (
            playerRight > objLeft + 3 &&
            playerLeft < objRight - 3 &&
            playerTop > objBottom + 3 &&
            playerBottom < objTop - 3
          ) {
            if (obj.type === 'JUMP_PAD_YELLOW') {
              g.vy = 960 * g.gravityDirection;
              g.onGround = false;
              arcadeMusic.playPadJump();
            } else if (obj.type === 'JUMP_PAD_PINK') {
              g.vy = 800 * g.gravityDirection;
              g.onGround = false;
              arcadeMusic.playPadJump();
            } else if (obj.type === 'GRAVITY_PORTAL_BLUE' && g.gravityDirection === 1) {
              g.gravityDirection = -1;
              g.vy = Math.max(g.vy, 180);
              arcadeMusic.playGravityFlip();
            } else if (obj.type === 'GRAVITY_PORTAL_YELLOW' && g.gravityDirection === -1) {
              g.gravityDirection = 1;
              g.vy = Math.min(g.vy, -180);
              arcadeMusic.playGravityFlip();
            } else if (obj.type === 'PORTAL_CUBE') {
              setMode(g, 'CUBE');
            } else if (obj.type === 'PORTAL_SHIP') {
              setMode(g, 'SHIP');
            } else if (obj.type === 'PORTAL_BALL') {
              setMode(g, 'BALL');
            } else if (obj.type === 'PORTAL_WAVE') {
              setMode(g, 'WAVE');
            } else if (obj.type === 'SECRET_COIN' && !g.coinsCollectedMap.has(obj.id)) {
              g.coinsCollectedMap.add(obj.id);
              setCollectedCoins(g.coinsCollectedMap.size);
              arcadeMusic.playCoin();
            }
          }
        }
      }

      // --- RENDERING PHASE ---
      ctx.clearRect(0, 0, W, H);
      const cameraX = g.x - W * 0.25;
      const floorY = H - FLOOR_HEIGHT;
      const ceilingY = floorY - CEILING_HEIGHT;

      // 1. Pulsing Parallax Background
      const pulse = arcadeMusic.getBeatPulse();
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, currentLevel.bgGradient[0]);
      grad.addColorStop(1, currentLevel.bgGradient[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Geometric Grid Background pulsing with beat
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.05 + pulse * 0.08})`;
      ctx.lineWidth = 1;
      const gridSize = 45;
      const bgOffsetX = -((cameraX * 0.25) % gridSize);
      for (let x = bgOffsetX; x < W; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, floorY);
        ctx.stroke();
      }
      for (let y = 0; y < floorY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Ceiling surface boundary (important for Ship, Ball, Wave & upside-down Cube)
      ctx.fillStyle = 'rgba(7, 9, 13, 0.45)';
      ctx.fillRect(0, 0, W, Math.max(0, ceilingY));
      ctx.strokeStyle = `${currentLevel.accentColor}88`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, ceilingY);
      ctx.lineTo(W, ceilingY);
      ctx.stroke();

      // 2. Floor & Pulsing Floor Chevrons
      ctx.fillStyle = currentLevel.floorColor;
      ctx.fillRect(0, floorY, W, FLOOR_HEIGHT);

      ctx.shadowColor = currentLevel.accentColor;
      ctx.shadowBlur = 8 + pulse * 12;
      ctx.strokeStyle = currentLevel.accentColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, floorY);
      ctx.lineTo(W, floorY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      const floorStep = 32;
      const floorOffX = -(cameraX % floorStep);
      for (let x = floorOffX; x < W; x += floorStep) {
        ctx.beginPath();
        ctx.moveTo(x, floorY + 6);
        ctx.lineTo(x + 12, floorY + FLOOR_HEIGHT);
        ctx.lineTo(x + 8, floorY + FLOOR_HEIGHT);
        ctx.lineTo(x - 4, floorY + 6);
        ctx.fill();
      }

      // 3. Render Wave Zig-Zag Beam or Cube/Ship/Ball Ghost Trail
      if (g.mode === 'WAVE' && g.waveTrail.length > 1) {
        ctx.save();
        ctx.strokeStyle = playerColor;
        ctx.shadowColor = playerColor;
        ctx.shadowBlur = 12;
        ctx.lineWidth = 5;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        g.waveTrail.forEach((pt, idx) => {
          const sx = pt.x - cameraX;
          const sy = floorY - pt.y;
          if (idx === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        });
        ctx.stroke();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      } else {
        for (let i = trail.length - 1; i >= 0; i--) {
          const pt = trail[i];
          pt.alpha -= dt * 2.2;
          if (pt.alpha <= 0) {
            trail.splice(i, 1);
            continue;
          }

          const renderX = pt.x - cameraX;
          const renderY = floorY - pt.y;

          ctx.save();
          ctx.translate(renderX, renderY);
          ctx.rotate(pt.rotation);
          ctx.fillStyle = playerColor;
          ctx.globalAlpha = pt.alpha * 0.38;
          ctx.fillRect(-UNIT * 0.36, -UNIT * 0.36, UNIT * 0.72, UNIT * 0.72);
          ctx.restore();
        }
        ctx.globalAlpha = 1.0;
      }

      // 4. Render Level Objects (with rotation support)
      for (const obj of currentLevel.objects) {
        const objPxX = obj.x * UNIT - cameraX;
        const objW = (obj.width || 1) * UNIT;
        const objH = (obj.height || 1) * UNIT;
        const objPxY = floorY - (obj.y * UNIT + objH);

        if (objPxX + objW < -60 || objPxX > W + 60) continue;

        drawLevelObject(ctx, obj, objPxX, objPxY, objW, objH, now, {
          isCollected: g.coinsCollectedMap.has(obj.id),
        });
      }

      // 5. Render Player Avatar based on Active Gamemode (CUBE / SHIP / BALL / WAVE)
      if (!g.isDead) {
        const playerScreenX = g.x - cameraX + UNIT / 2;
        const playerScreenY = floorY - (g.y + UNIT / 2);

        ctx.save();
        ctx.translate(playerScreenX, playerScreenY);
        ctx.rotate(g.rotation);

        if (g.mode === 'CUBE') {
          ctx.fillStyle = playerColor;
          ctx.shadowColor = playerColor;
          ctx.shadowBlur = 10;
          ctx.fillRect(-UNIT / 2, -UNIT / 2, UNIT, UNIT);
          ctx.shadowBlur = 0;

          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(-UNIT / 2, -UNIT / 2, UNIT, UNIT);

          drawPlayerFace(ctx, UNIT, playerFace);
        } else if (g.mode === 'SHIP') {
          // Mini pilot cube seated on ship cockpit
          ctx.save();
          ctx.translate(2, -6);
          ctx.fillStyle = playerColor;
          ctx.fillRect(-10, -10, 20, 20);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-10, -10, 20, 20);
          drawPlayerFace(ctx, 20, playerFace);
          ctx.restore();

          // Thruster Flame
          if (g.jumpHeld) {
            ctx.fillStyle = '#FF8C00';
            ctx.beginPath();
            ctx.moveTo(-UNIT * 0.55, 2);
            ctx.lineTo(-UNIT * 0.95 - Math.random() * 8, 6);
            ctx.lineTo(-UNIT * 0.55, 11);
            ctx.closePath();
            ctx.fill();
          }

          // Sleek Cyber Ship Hull
          ctx.fillStyle = '#1E293B';
          ctx.strokeStyle = playerColor;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-UNIT * 0.62, 0);
          ctx.lineTo(-UNIT * 0.4, 14);
          ctx.lineTo(UNIT * 0.55, 12);
          ctx.lineTo(UNIT * 0.72, 2);
          ctx.lineTo(UNIT * 0.2, -2);
          ctx.lineTo(-UNIT * 0.62, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (g.mode === 'BALL') {
          const r = UNIT * 0.52;
          // Gear teeth ring
          ctx.fillStyle = playerColor;
          ctx.shadowColor = playerColor;
          ctx.shadowBlur = 10;
          for (let i = 0; i < 8; i++) {
            const ang = (i * Math.PI) / 4;
            ctx.save();
            ctx.rotate(ang);
            ctx.fillRect(-3.5, -r - 3, 7, 6);
            ctx.restore();
          }
          ctx.shadowBlur = 0;

          // Circular body
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Inner spinning core
          ctx.fillStyle = '#0D1117';
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(-3, -3, 6, 6);
        } else if (g.mode === 'WAVE') {
          // Razor 45-degree Wave Dart
          ctx.fillStyle = playerColor;
          ctx.shadowColor = playerColor;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(UNIT * 0.55, 0);
          ctx.lineTo(-UNIT * 0.45, -UNIT * 0.38);
          ctx.lineTo(-UNIT * 0.25, 0);
          ctx.lineTo(-UNIT * 0.45, UNIT * 0.38);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2.2;
          ctx.stroke();
        }

        ctx.restore();
      }

      // 6. Render Death Explosion Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy -= 800 * dt;
        p.alpha -= dt * 1.6;
        p.rotation += dt * 8;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        const renderX = p.x - cameraX;
        const renderY = floorY - p.y;

        ctx.save();
        ctx.translate(renderX, renderY);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
      ctx.globalAlpha = 1.0;
    };

    function drawPlayerFace(
      c: CanvasRenderingContext2D,
      size: number,
      face: 'classic' | 'visor' | 'ninja',
    ) {
      if (face === 'classic') {
        c.fillStyle = '#0D1117';
        c.fillRect(-size * 0.3, -size * 0.25, size * 0.2, size * 0.2);
        c.fillRect(size * 0.1, -size * 0.25, size * 0.2, size * 0.2);
        c.fillRect(-size * 0.2, size * 0.15, size * 0.4, size * 0.1);
      } else if (face === 'visor') {
        c.fillStyle = '#0D1117';
        c.fillRect(-size * 0.38, -size * 0.2, size * 0.76, size * 0.35);
        c.fillStyle = '#FF8C00';
        c.fillRect(-size * 0.3, -size * 0.12, size * 0.6, size * 0.18);
      } else {
        c.fillStyle = '#0D1117';
        c.fillRect(-size * 0.35, -size * 0.15, size * 0.7, size * 0.25);
        c.fillStyle = '#FFFFFF';
        c.fillRect(-size * 0.25, -size * 0.1, size * 0.15, size * 0.15);
        c.fillRect(size * 0.1, -size * 0.1, size * 0.15, size * 0.15);
      }
    }

    function lerp(a: number, b: number, t: number) {
      return (1 - t) * a + t * b;
    }

    animId = requestAnimationFrame(render);

    // Resize handling
    const onResize = () => {
      if (!canvas) return;
      canvas.width = canvas.parentElement?.clientWidth || 900;
      canvas.height = canvas.parentElement?.clientHeight || 500;
    };
    onResize();
    window.addEventListener('resize', onResize);

    // Keyboard & Pointer controls
    const onKeyDown = (e: KeyboardEvent) => {
      if (isLevelStudioOpen || isMusicStudioOpen) return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        gameRef.current.jumpHeld = true;
        if (!e.repeat) {
          triggerJump(true);
        }
      } else if (e.code === 'KeyR') {
        restartRun(false);
      } else if (e.code === 'KeyP') {
        setIsPaused((prev) => !prev);
      } else if (e.code === 'KeyZ' && practiceMode) {
        gameRef.current.practiceCheckpoints.push({
          x: gameRef.current.x,
          y: gameRef.current.y,
          gravity: gameRef.current.gravityDirection,
          mode: gameRef.current.mode,
        });
      } else if (e.code === 'KeyX' && practiceMode) {
        gameRef.current.practiceCheckpoints.pop();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        gameRef.current.jumpHeld = false;
      }
    };

    const onPointerDown = () => {
      if (isLevelStudioOpen || isMusicStudioOpen) return;
      gameRef.current.jumpHeld = true;
      triggerJump(true);
    };

    const onPointerUp = () => {
      gameRef.current.jumpHeld = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [
    currentLevel,
    activeTrack,
    triggerJump,
    restartRun,
    playerColor,
    playerFace,
    practiceMode,
    isPaused,
    isVictorious,
    isLevelStudioOpen,
    isMusicStudioOpen,
    viewMode,
  ]);

  const handleSaveStudioLevels = (updatedLevels: GeometryLevelDef[], playIndex: number) => {
    setLevels(updatedLevels);
    try {
      localStorage.setItem(CUSTOM_LEVELS_STORAGE_KEY, JSON.stringify(updatedLevels));
    } catch {
      // Ignore storage quota issues
    }
    setLevelIndex(playIndex);
    setIsLevelStudioOpen(false);
    setTimeout(() => restartRun(false), 0);
  };

  if (viewMode === 'MENU') {
    return (
      <div className="relative w-full h-full bg-[#07090D] select-none flex flex-col justify-between overflow-hidden font-sans text-white">
        {/* Top Header */}
        <header className="relative z-20 px-6 py-4 bg-[#0D1117]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-[#00F0FF]/20 border border-[#00F0FF] flex items-center justify-center text-[#00F0FF]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-racing)] italic font-black text-xl text-white tracking-wider">NEON DASH</h1>
              <p className="text-xs font-mono text-[#8E96A4]">High-Speed Rhythm Arcade</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMusicStudioOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#FF8C00] hover:brightness-110 text-[#07090D] font-mono font-bold uppercase text-xs cursor-pointer"
            >
              <Music className="w-4 h-4" />
              <span>Music Studio</span>
            </button>
            <button
              type="button"
              onClick={() => arcadeMusic.toggleMute()}
              className="p-2.5 bg-[#141822] hover:bg-[#1a2333] border border-white/10 text-[#8E96A4] hover:text-white cursor-pointer"
              aria-label="Toggle Mute"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                arcadeMusic.stop();
                onExitToStation();
              }}
              className="px-4 py-2 bg-[#141822] hover:bg-white hover:text-[#0D0F14] border border-white/15 font-mono font-bold uppercase text-xs cursor-pointer"
            >
              Station
            </button>
          </div>
        </header>

        {/* Main Menu Body */}
        <main className="relative flex-1 p-6 md:p-10 flex flex-col items-center justify-center overflow-y-auto">
          <div className="max-w-4xl w-full space-y-8 text-center">
            <div className="space-y-3">
              <div className="inline-block px-3 py-1 bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] font-mono text-xs uppercase tracking-widest">
                Rhythm & Platformer Engine
              </div>
              <h2 className="font-[family-name:var(--font-racing)] italic font-black text-6xl md:text-7xl text-white tracking-widest drop-shadow-[0_0_35px_rgba(0,240,255,0.4)]">
                NEON DASH
              </h2>
              <p className="text-[#8E96A4] font-mono text-sm max-w-lg mx-auto">
                Jump, fly, and dash through pulsing geometric hazards with custom music tracks and player skins.
              </p>
            </div>

            {/* Big Action Buttons: Play, Editor, Icon Kit */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <button
                type="button"
                onClick={() => {
                  setViewMode('PLAY');
                  restartRun(false);
                }}
                className="flex items-center justify-center gap-3 py-5 px-6 bg-gradient-to-r from-[#00F0FF] to-[#3B82F6] hover:brightness-110 text-black font-[family-name:var(--font-racing)] italic font-black text-2xl tracking-wider shadow-lg shadow-[#00F0FF]/25 cursor-pointer transform hover:-translate-y-0.5 transition-all"
              >
                <Play className="w-7 h-7 fill-current" />
                <span>PLAY</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('EDITOR_MENU')}
                className="flex items-center justify-center gap-3 py-5 px-6 bg-[#141822] hover:bg-[#1f293d] border-2 border-[#00F0FF]/60 hover:border-[#00F0FF] text-[#00F0FF] font-[family-name:var(--font-racing)] italic font-black text-2xl tracking-wider cursor-pointer transform hover:-translate-y-0.5 transition-all"
              >
                <Grid className="w-7 h-7" />
                <span>EDITOR</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('ICONS')}
                className="flex items-center justify-center gap-3 py-5 px-6 bg-[#141822] hover:bg-[#1f293d] border-2 border-pink-500/60 hover:border-pink-500 text-pink-400 font-[family-name:var(--font-racing)] italic font-black text-2xl tracking-wider cursor-pointer transform hover:-translate-y-0.5 transition-all"
              >
                <Palette className="w-7 h-7" />
                <span>ICON KIT</span>
              </button>
            </div>

            {/* Level Picker Grid */}
            <div className="bg-[#0D1117] border border-white/10 p-6 text-left space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase text-[#8E96A4] tracking-wider">Select Level</span>
                <span className="font-mono text-xs text-[#00F0FF]">{levels.length} Available</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {levels.map((lvl, idx) => {
                  const best = Number(localStorage.getItem(`gd_best_${lvl.id}`) || 0);
                  const isSelected = levelIndex === idx;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => {
                        setLevelIndex(idx);
                      }}
                      className={`p-4 border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#00F0FF]/10 border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                          : 'bg-[#141822] border-white/10 hover:border-white/30 text-[#9CA3AF]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-white">{idx + 1}. {lvl.name}</span>
                        <span className="font-mono text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 text-[#00F0FF]">
                          {lvl.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#8E96A4]">
                        <span>Best: <strong className="text-white">{best}%</strong></span>
                        <span>Coins: <strong className="text-yellow-400">0/3</strong></span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </main>

        {/* Level Studio Modal */}
        {isLevelStudioOpen && (
          <LevelStudioModal
            levels={levels}
            initialLevelIndex={levelIndex}
            onSaveLevels={handleSaveStudioLevels}
            onClose={() => setIsLevelStudioOpen(false)}
          />
        )}

        {/* Music Studio Modal */}
        <ArcadeMusicStudio
          isOpen={isMusicStudioOpen}
          onClose={() => setIsMusicStudioOpen(false)}
          activePresetId={activeTrack.id}
          onApplyTrack={(newPreset) => {
            setActiveTrack(newPreset);
            arcadeMusic.setPreset(newPreset);
            arcadeMusic.restart();
          }}
        />
      </div>
    );
  }

  if (viewMode === 'EDITOR_MENU') {
    return (
      <div className="relative w-full h-full bg-[#07090D] select-none flex flex-col justify-between overflow-hidden font-sans text-white">
        <header className="relative z-20 px-6 py-4 bg-[#0D1117]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewMode('MENU')}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#141822] hover:bg-[#1a2333] border border-white/10 font-mono text-xs text-[#8E96A4] hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Menu</span>
            </button>
            <h1 className="font-[family-name:var(--font-racing)] italic font-black text-xl text-white tracking-wider">LEVEL EDITOR MANAGER</h1>
          </div>

          <button
            type="button"
            onClick={() => {
              const newId = `custom_${Date.now()}`;
              const newLevel: GeometryLevelDef = {
                id: newId,
                name: `Custom Level ${levels.filter((l) => l.isCustom).length + 1}`,
                difficulty: 'Normal',
                stars: 3,
                trackPresetId: 'stereo_blitz',
                speedMultiplier: 1.0,
                lengthUnits: 140,
                startingMode: 'CUBE',
                bgGradient: ['#0f172a', '#1e1b4b'],
                floorColor: '#312e81',
                accentColor: '#00f0ff',
                isCustom: true,
                objects: [], // EMPTY as requested!
              };
              const updated = [...levels, newLevel];
              setLevels(updated);
              setLevelIndex(updated.length - 1);
              try {
                localStorage.setItem(CUSTOM_LEVELS_STORAGE_KEY, JSON.stringify(updated));
              } catch {
                // ignore
              }
              setIsLevelStudioOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#00F0FF] hover:brightness-110 text-black font-mono font-bold uppercase text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Level (Empty)</span>
          </button>
        </header>

        <main className="relative flex-1 p-6 md:p-10 flex flex-col items-center justify-center overflow-y-auto">
          <div className="max-w-3xl w-full bg-[#0D1117] border border-white/10 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="font-[family-name:var(--font-racing)] italic font-black text-2xl text-white tracking-wider">
                  SELECT LEVEL TO EDIT OR DELETE
                </h2>
                <p className="text-xs font-mono text-[#8E96A4]">Manage custom levels saved in localStorage.</p>
              </div>
              <span className="font-mono text-xs text-[#00F0FF]">{levels.length} Total Levels</span>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {levels.map((lvl, idx) => {
                const isCustom = Boolean(lvl.isCustom);
                return (
                  <div
                    key={lvl.id}
                    className="p-4 bg-[#141822] border border-white/10 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">{idx + 1}. {lvl.name}</span>
                        <span className={`font-mono text-[10px] px-2 py-0.5 border ${isCustom ? 'bg-pink-500/20 border-pink-500 text-pink-300' : 'bg-white/5 border-white/10 text-[#00F0FF]'}`}>
                          {isCustom ? 'Custom' : 'Built-In'}
                        </span>
                        <span className="font-mono text-[10px] text-[#8E96A4]">{lvl.difficulty}</span>
                      </div>
                      <div className="font-mono text-[11px] text-[#8E96A4] flex items-center gap-3">
                        <span>Objects: <strong className="text-white">{lvl.objects.length}</strong></span>
                        <span>Length: <strong className="text-white">{lvl.lengthUnits}u</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLevelIndex(idx);
                          setIsLevelStudioOpen(true);
                        }}
                        className="px-3.5 py-2 bg-[#00F0FF] hover:brightness-110 text-black font-mono font-bold uppercase text-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Grid className="w-3.5 h-3.5" />
                        <span>Edit Studio</span>
                      </button>

                      {isCustom ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete custom level "${lvl.name}"?`)) {
                              const updated = levels.filter((_, i) => i !== idx);
                              setLevels(updated);
                              try {
                                localStorage.setItem(CUSTOM_LEVELS_STORAGE_KEY, JSON.stringify(updated));
                              } catch {
                                // ignore
                              }
                              if (levelIndex >= updated.length) {
                                setLevelIndex(Math.max(0, updated.length - 1));
                              }
                            }
                          }}
                          className="px-3.5 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-mono font-bold uppercase text-xs cursor-pointer flex items-center gap-1.5"
                          aria-label={`Delete level ${lvl.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-[#8E96A4] italic px-2">Built-in</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* Level Studio Modal */}
        {isLevelStudioOpen && (
          <LevelStudioModal
            levels={levels}
            initialLevelIndex={levelIndex}
            onSaveLevels={handleSaveStudioLevels}
            onClose={() => setIsLevelStudioOpen(false)}
          />
        )}
      </div>
    );
  }

  if (viewMode === 'ICONS') {
    return (
      <div className="relative w-full h-full bg-[#07090D] select-none flex flex-col justify-between overflow-hidden font-sans text-white">
        <header className="relative z-20 px-6 py-4 bg-[#0D1117]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewMode('MENU')}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#141822] hover:bg-[#1a2333] border border-white/10 font-mono text-xs text-[#8E96A4] hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Menu</span>
            </button>
            <h1 className="font-[family-name:var(--font-racing)] italic font-black text-xl text-white tracking-wider">ICON KIT & CUSTOMIZATION</h1>
          </div>
        </header>

        <main className="relative flex-1 p-6 md:p-10 flex flex-col items-center justify-center overflow-y-auto">
          <div className="max-w-xl w-full bg-[#0D1117] border border-white/10 p-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="font-[family-name:var(--font-racing)] italic font-black text-3xl text-pink-400 tracking-wider">
                PLAYER CUSTOMIZATION
              </h2>
              <p className="text-xs font-mono text-[#8E96A4]">Choose your signature cube color and face expression.</p>
            </div>

            {/* Live Preview */}
            <div className="flex flex-col items-center justify-center p-8 bg-[#141822] border border-white/10 space-y-4">
              <div className="relative w-20 h-20 flex items-center justify-center" style={{ backgroundColor: playerColor, boxShadow: `0 0 25px ${playerColor}60` }}>
                <div className="absolute inset-0 border-2 border-white/80" />
                <div className="relative w-full h-full flex items-center justify-center">
                  {playerFace === 'classic' && (
                    <div className="w-full h-full relative">
                      <div className="absolute top-4 left-4 w-3.5 h-3.5 bg-[#07090D]" />
                      <div className="absolute top-4 right-4 w-3.5 h-3.5 bg-[#07090D]" />
                      <div className="absolute bottom-4 left-4 right-4 h-2 bg-[#07090D]" />
                    </div>
                  )}
                  {playerFace === 'visor' && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-12 h-6 bg-[#07090D] flex items-center justify-center">
                        <div className="w-8 h-2.5 bg-amber-400" />
                      </div>
                    </div>
                  )}
                  {playerFace === 'ninja' && (
                    <div className="w-full h-full relative">
                      <div className="absolute top-5 left-3 right-3 h-4 bg-[#07090D] flex justify-around items-center px-2">
                        <div className="w-2.5 h-2.5 bg-white" />
                        <div className="w-2.5 h-2.5 bg-white" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <span className="font-mono text-xs text-[#8E96A4]">Preview Cube ({playerColor} / {playerFace})</span>
            </div>

            {/* Color Picker */}
            <div className="space-y-3">
              <label className="font-mono text-xs uppercase text-[#8E96A4]">Select Color</label>
              <div className="grid grid-cols-4 gap-3">
                {['#00F0FF', '#10B981', '#EC4899', '#EAB308', '#FF8C00', '#A855F7', '#3B82F6', '#EF4444'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPlayerColor(c)}
                    style={{ backgroundColor: c }}
                    className={`h-12 border-2 cursor-pointer transition-transform ${
                      playerColor === c ? 'scale-105 border-white shadow-lg' : 'border-transparent hover:scale-102'
                    }`}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>

            {/* Face Style */}
            <div className="space-y-3">
              <label className="font-mono text-xs uppercase text-[#8E96A4]">Face Style</label>
              <div className="grid grid-cols-3 gap-3">
                {(['classic', 'visor', 'ninja'] as const).map((face) => (
                  <button
                    key={face}
                    type="button"
                    onClick={() => setPlayerFace(face)}
                    className={`py-3 border font-mono text-xs uppercase font-bold cursor-pointer transition-all ${
                      playerFace === face
                        ? 'bg-pink-500 border-pink-400 text-black shadow-lg shadow-pink-500/30'
                        : 'bg-[#141822] border-white/10 text-[#8E96A4] hover:text-white'
                    }`}
                  >
                    {face}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewMode('MENU')}
              className="w-full py-4 bg-pink-500 hover:bg-pink-400 text-black font-[family-name:var(--font-racing)] italic font-black text-lg tracking-wider cursor-pointer"
            >
              SAVE & RETURN TO MENU
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#07090D] select-none flex flex-col justify-between overflow-hidden font-sans text-white">
      {/* 1. Top HUD Bar */}
      <header className="relative z-20 px-4 md:px-6 py-3 bg-[#0D1117]/90 backdrop-blur-md border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Level Title & Live Stats */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-xs bg-[#00F0FF]/15 border border-[#00F0FF] flex items-center justify-center text-[#00F0FF]">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-[family-name:var(--font-racing)] italic font-black uppercase text-base md:text-lg text-white tracking-wider whitespace-nowrap">
                {currentLevel.name}
              </span>
              <span className="text-xs font-mono text-[#9CA3AF]">·</span>
              <span className="text-xs font-mono font-semibold text-[#00F0FF] whitespace-nowrap">
                {currentLevel.difficulty}
              </span>
              <span className="text-xs font-mono text-[#9CA3AF]">·</span>
              <span className="text-xs font-mono font-bold text-amber-400 whitespace-nowrap">
                Mode: {activeGameMode}
              </span>
            </div>
            <div className="text-[11px] font-mono text-[#8E96A4] flex items-center gap-2.5 tabular-nums">
              <span>Attempt {attempts}</span>
              <span aria-hidden="true">·</span>
              <span>Best {bestProgress}%</span>
              <span aria-hidden="true">·</span>
              <span>Coins {collectedCoins}/3</span>
            </div>
          </div>
        </div>

        {/* Center: Live Progress Bar */}
        <div className="hidden lg:flex flex-col items-center flex-1 max-w-xs">
          <div className="w-full flex items-center justify-between text-[11px] font-mono font-bold text-white mb-1 tabular-nums">
            <span>PROGRESS</span>
            <span className="text-[#00F0FF]">{progressPct}%</span>
          </div>
          <div className="h-2 w-full bg-[#141822] border border-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00F0FF] via-[#A855F7] to-[#EC4899] transition-all duration-75"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('MENU')}
            className="px-3 py-1.5 bg-[#141822] hover:bg-[#1a2333] border border-white/15 font-mono font-bold uppercase text-xs whitespace-nowrap shrink-0 cursor-pointer text-[#00F0FF]"
          >
            Menu
          </button>

          <button
            type="button"
            onClick={() => {
              setPracticeMode((prev) => !prev);
              restartRun(false);
            }}
            className={`px-3 py-1.5 border text-xs font-mono font-bold uppercase whitespace-nowrap shrink-0 cursor-pointer ${
              practiceMode
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400'
                : 'bg-[#141822] border-white/10 text-[#8E96A4] hover:text-white'
            }`}
          >
            {practiceMode ? 'Practice On' : 'Normal'}
          </button>

          <button
            type="button"
            onClick={() => setIsLevelStudioOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00F0FF] hover:brightness-110 text-[#07090D] font-mono font-bold uppercase text-xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Level Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMusicStudioOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF8C00] hover:brightness-110 text-[#07090D] font-mono font-bold uppercase text-xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Music className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Music Studio</span>
          </button>

          <button
            type="button"
            onClick={() => {
              arcadeMusic.toggleMute();
            }}
            className="p-2 bg-[#141822] hover:bg-[#1a2333] border border-white/10 text-[#8E96A4] hover:text-white cursor-pointer"
            aria-label="Toggle Mute"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              arcadeMusic.stop();
              onExitToStation();
            }}
            className="px-3.5 py-1.5 bg-[#141822] hover:bg-white hover:text-[#0D0F14] border border-white/15 font-mono font-bold uppercase text-xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            Station
          </button>
        </div>
      </header>

      {/* 2. Main Game Play Canvas Container */}
      <main className="relative flex-1 w-full h-full flex items-center justify-center cursor-pointer overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {practiceMode && (
          <div className="absolute bottom-4 left-6 pointer-events-none p-2.5 bg-black/65 border border-emerald-500/40 text-[11px] font-mono text-emerald-300 tabular-nums">
            <div>[Z] Place Checkpoint ({gameRef.current.practiceCheckpoints.length})</div>
            <div>[X] Remove Checkpoint</div>
          </div>
        )}
      </main>

      {/* 3. Bottom Controls: Level Switcher, Gamemode Override, Cube Skin */}
      <footer className="relative z-20 px-4 md:px-6 py-2.5 bg-[#0D1117]/95 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Level Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-[#8E96A4] text-[11px] whitespace-nowrap">Level:</span>
          <div className="flex gap-1.5">
            {levels.map((lvl, idx) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => setLevelIndex(idx)}
                className={`px-2.5 py-1 border text-xs font-mono font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                  levelIndex === idx
                    ? 'bg-[#00F0FF] border-[#00F0FF] text-[#0D0F14]'
                    : 'bg-[#141822] border-white/10 text-[#9CA3AF] hover:text-white'
                }`}
              >
                {idx + 1}. {lvl.name}
              </button>
            ))}
          </div>
        </div>

        {/* Gamemode Selector (Auto portals OR test Ship / Ball / Wave directly) */}
        <div className="flex items-center gap-1 bg-[#141822] p-0.5 border border-white/10">
          {(['AUTO', 'CUBE', 'SHIP', 'BALL', 'WAVE'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModeOverride(m)}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                modeOverride === m
                  ? 'bg-amber-400 text-black'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
              title={m === 'AUTO' ? 'Follow level portals' : `Start directly in ${m} mode`}
            >
              {m === 'CUBE' && <Square className="w-3 h-3" />}
              {m === 'SHIP' && <Rocket className="w-3 h-3" />}
              {m === 'BALL' && <CircleDot className="w-3 h-3" />}
              {m === 'WAVE' && <Waves className="w-3 h-3" />}
              <span>{m}</span>
            </button>
          ))}
        </div>

        {/* Player Skin & Controls */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {['#00F0FF', '#10B981', '#EC4899', '#EAB308', '#FF8C00'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setPlayerColor(c)}
                style={{ backgroundColor: c }}
                className={`w-4 h-4 border-2 cursor-pointer transition-transform ${
                  playerColor === c ? 'scale-125 border-white' : 'border-transparent'
                }`}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>

          <div className="flex gap-1 border-l border-white/10 pl-2">
            {(['classic', 'visor', 'ninja'] as const).map((face) => (
              <button
                key={face}
                type="button"
                onClick={() => setPlayerFace(face)}
                className={`px-2 py-0.5 text-[11px] font-mono border whitespace-nowrap shrink-0 cursor-pointer ${
                  playerFace === face
                    ? 'bg-white text-black font-bold'
                    : 'bg-[#141822] border-white/10 text-[#8E96A4] hover:text-white'
                }`}
              >
                {face}
              </button>
            ))}
          </div>
        </div>
      </footer>

      {/* 4. Victory Screen Modal */}
      {isVictorious && (
        <div className="fixed inset-0 z-50 bg-[#07090D]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0D1117] border-2 border-emerald-400 p-8 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-emerald-300 mb-1">
                100% Complete
              </div>
              <h2 className="font-[family-name:var(--font-racing)] italic font-black uppercase text-4xl text-white tracking-wider">
                Level Conquered
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#141822] border border-white/10 font-mono text-xs tabular-nums">
              <div>
                <span className="text-[#8E96A4] uppercase">Attempts</span>
                <div className="text-lg font-bold text-white">{attempts}</div>
              </div>
              <div>
                <span className="text-[#8E96A4] uppercase">Coins</span>
                <div className="text-lg font-bold text-yellow-400">{collectedCoins} / 3</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsVictorious(false);
                  restartRun(false);
                }}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold uppercase text-sm tracking-wider cursor-pointer"
              >
                Play Again
              </button>
              {levelIndex < levels.length - 1 && (
                <button
                  type="button"
                  onClick={() => setLevelIndex((prev) => prev + 1)}
                  className="flex-1 py-3 bg-[#00F0FF] hover:brightness-110 text-black font-mono font-bold uppercase text-sm tracking-wider cursor-pointer"
                >
                  Next Level
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Level Studio Modal */}
      {isLevelStudioOpen && (
        <LevelStudioModal
          levels={levels}
          initialLevelIndex={levelIndex}
          onSaveLevels={handleSaveStudioLevels}
          onClose={() => setIsLevelStudioOpen(false)}
        />
      )}

      {/* 6. Arcade Music Studio Modal */}
      <ArcadeMusicStudio
        isOpen={isMusicStudioOpen}
        onClose={() => setIsMusicStudioOpen(false)}
        activePresetId={activeTrack.id}
        onApplyTrack={(newPreset) => {
          setActiveTrack(newPreset);
          arcadeMusic.setPreset(newPreset);
          arcadeMusic.restart();
        }}
      />
    </div>
  );
}
