import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Flame,
  GripHorizontal,
  Music,
  Pause,
  Play,
  RotateCcw,
  Star,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  ChartNote,
  generateSongChart,
  GUITAR_SONGS,
  GuitarDifficulty,
  LANE_COLORS,
} from './guitarHeroSongs';
import {
  createDetailedGuitarStage,
  createPooledNoteVisual,
  getLaneX,
  NoteVisualHandle,
  SPAWN_Z,
  STRIKE_Z,
} from './guitarHeroModels';
import { guitarHeroAudio } from './guitarHeroAudio';

interface GuitarHeroGameProps {
  onExitToStation: () => void;
}

const KEY_TO_LANE: Record<string, number> = {
  KeyA: 0,
  Digit1: 0,
  KeyS: 1,
  Digit2: 1,
  KeyD: 2,
  Digit3: 2,
  KeyF: 3,
  Digit4: 3,
  KeyG: 4,
  Digit5: 4,
};

const LANE_KEY_LABELS = ['A', 'S', 'D', 'F', 'G'];

interface HitFeedback {
  id: number;
  label: string;
  color: string;
}

interface SongStats {
  score: number;
  combo: number;
  maxCombo: number;
  hits: number;
  misses: number;
  rockMeter: number; // 0..100 (starts at 55)
  starPower: number; // 0..100
  starActive: boolean;
  progress: number;  // 0..1
}

export function GuitarHeroGame({ onExitToStation }: GuitarHeroGameProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [songId, setSongId] = useState<string>(GUITAR_SONGS[0].id);
  const [difficulty, setDifficulty] = useState<GuitarDifficulty>('HARD');
  const [tapMode, setTapMode] = useState<boolean>(true);
  const [scrollSpeedMult, setScrollSpeedMult] = useState<number>(1.0);
  const [muted, setMuted] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [songFinished, setSongFinished] = useState<boolean>(false);
  const [songFailed, setSongFailed] = useState<boolean>(false);
  const [dockOpen, setDockOpen] = useState<boolean>(true);
  const [panelPos, setPanelPos] = useState<{ x: number; y: number }>(() => ({
    x: 16,
    y: typeof window !== 'undefined' ? Math.max(80, window.innerHeight - 255) : 480,
  }));
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    active: boolean;
    offsetX: number;
    offsetY: number;
  }>({ active: false, offsetX: 0, offsetY: 0 });

  const [feedback, setFeedback] = useState<HitFeedback | null>(null);
  const [stats, setStats] = useState<SongStats>({
    score: 0,
    combo: 0,
    maxCombo: 0,
    hits: 0,
    misses: 0,
    rockMeter: 58,
    starPower: 0,
    starActive: false,
    progress: 0,
  });

  // Refs synced with Three.js render loop
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const tapModeRef = useRef(tapMode);
  tapModeRef.current = tapMode;

  const scrollSpeedRef = useRef(scrollSpeedMult);
  scrollSpeedRef.current = scrollSpeedMult;

  const heldLanesRef = useRef<boolean[]>([false, false, false, false, false]);
  const triggerStrumRef = useRef<((specificLanes?: number[]) => void) | null>(null);
  const activateStarRef = useRef<(() => void) | null>(null);
  const restartSongRef = useRef<(() => void) | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  // Draggable Controls / Settings window pointer handling
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current.active) return;
      const el = panelRef.current;
      const w = el ? el.offsetWidth : 360;
      const h = el ? el.offsetHeight : 180;
      const maxX = Math.max(8, window.innerWidth - w - 8);
      const maxY = Math.max(64, window.innerHeight - h - 8);
      setPanelPos({
        x: Math.max(8, Math.min(maxX, e.clientX - dragRef.current.offsetX)),
        y: Math.max(64, Math.min(maxY, e.clientY - dragRef.current.offsetY)),
      });
    };

    const onPointerUp = () => {
      dragRef.current.active = false;
    };

    const onWindowResize = () => {
      const el = panelRef.current;
      const w = el ? el.offsetWidth : 360;
      const h = el ? el.offsetHeight : 180;
      setPanelPos((prev) => ({
        x: Math.max(8, Math.min(Math.max(8, window.innerWidth - w - 8), prev.x)),
        y: Math.max(64, Math.min(Math.max(64, window.innerHeight - h - 8), prev.y)),
      }));
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', onWindowResize);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onWindowResize);
    };
  }, []);

  const activeSong = GUITAR_SONGS.find((s) => s.id === songId) ?? GUITAR_SONGS[0];

  const pushFeedback = (label: string, color: string) => {
    setFeedback({ id: Date.now(), label, color });
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback(null);
      feedbackTimerRef.current = null;
    }, 520);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Software WebGL check
    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const maxAniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#07090F');
    scene.fog = new THREE.FogExp2('#07090F', 0.017);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.75;

    // 3-Point Studio + Concert Arena Lighting
    const hemi = new THREE.HemisphereLight('#93C5FD', '#1E1B4B', 0.6);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight('#FFF7ED', 2.4);
    keyLight.position.set(8, 18, 10);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -12;
      keyLight.shadow.camera.right = 12;
      keyLight.shadow.camera.top = 12;
      keyLight.shadow.camera.bottom = -28;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#38BDF8', 1.1);
    rimLight.position.set(-10, 9, -22);
    scene.add(rimLight);

    // Hero Guitar Camera Perspective angled cleanly down the highway
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      200,
    );
    camera.position.set(0, 6.7, 8.3);
    camera.lookAt(0, 0.2, -9.8);

    const stage = createDetailedGuitarStage(maxAniso);
    scene.add(stage.root);

    // Pre-allocate pooled 3D Note Visuals per lane (Zero GC during gameplay!)
    const notePools: NoteVisualHandle[][] = Array.from({ length: 5 }, (_, lane) =>
      Array.from({ length: 24 }, () => {
        const visual = createPooledNoteVisual(lane);
        stage.highwayGroup.add(visual.group);
        return visual;
      }),
    );

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Active Song & Chart Simulation State
    let currentSongDef = GUITAR_SONGS.find((s) => s.id === songId) ?? GUITAR_SONGS[0];
    let chart: ChartNote[] = generateSongChart(currentSongDef, difficulty);
    let songElapsed = 0;
    let lastScheduledBeat = -1;
    let score = 0;
    let combo = 0;
    let maxCombo = 0;
    let hits = 0;
    let misses = 0;
    let rockMeter = 58;
    let starPower = 0;
    let starActive = false;
    let finished = false;
    let failed = false;
    let cameraShake = 0;

    const resetSession = (newSongId = songId, newDiff = difficulty) => {
      currentSongDef = GUITAR_SONGS.find((s) => s.id === newSongId) ?? GUITAR_SONGS[0];
      chart = generateSongChart(currentSongDef, newDiff);
      songElapsed = 0;
      lastScheduledBeat = -1;
      score = 0;
      combo = 0;
      maxCombo = 0;
      hits = 0;
      misses = 0;
      rockMeter = 58;
      starPower = 0;
      starActive = false;
      finished = false;
      failed = false;
      cameraShake = 0;
      setSongFinished(false);
      setSongFailed(false);
      setIsPlaying(true);
      setStats({
        score: 0,
        combo: 0,
        maxCombo: 0,
        hits: 0,
        misses: 0,
        rockMeter: 58,
        starPower: 0,
        starActive: false,
        progress: 0,
      });
    };

    restartSongRef.current = () => resetSession(songId, difficulty);

    const getMultiplier = () => {
      const base = Math.min(4, 1 + Math.floor(combo / 10));
      return starActive ? base * 2 : base;
    };

    const registerHit = (note: ChartNote, deltaSec: number) => {
      note.hit = true;
      if (note.duration > 0) {
        note.holding = true;
      }
      hits += 1;
      combo += 1;
      if (combo > maxCombo) maxCombo = combo;
      rockMeter = Math.min(100, rockMeter + 3.2);

      const absD = Math.abs(deltaSec);
      const quality = absD < 0.055 ? 'PERFECT!' : absD < 0.11 ? 'GREAT!' : 'GOOD';
      const basePts = absD < 0.055 ? 100 : absD < 0.11 ? 75 : 50;
      score += basePts * getMultiplier();

      if (note.isStarPower && !starActive) {
        starPower = Math.min(100, starPower + 12);
      }

      // Trigger Fret Head Flame & Flash Animation
      const head = stage.fretHeads[note.lane];
      head.hitFlash = 1.0;
      head.flameLife = 1.0;
      head.flameGroup.visible = true;
      head.shockRing.visible = true;
      cameraShake = Math.max(cameraShake, starActive ? 0.11 : 0.045);

      guitarHeroAudio.unlock();
      guitarHeroAudio.playGuitarNote(note.freqHz, note.duration, starActive);
      pushFeedback(
        quality,
        absD < 0.055 ? '#FACC15' : absD < 0.11 ? '#38BDF8' : '#22C55E',
      );
    };

    const registerMiss = (reason: string) => {
      misses += 1;
      combo = 0;
      rockMeter = Math.max(0, rockMeter - 5.5);
      guitarHeroAudio.playMissClack();
      pushFeedback(reason, '#EF4444');
      if (rockMeter <= 0 && !failed) {
        failed = true;
        setSongFailed(true);
        setIsPlaying(false);
      }
    };

    // Hit detection for either Tap-Mode single key or Classic Strum across held keys
    const evaluateStrum = (lanesToCheck?: number[]) => {
      if (!isPlayingRef.current || finished || failed) return;
      const windowSec = 0.165;
      const targetLanes =
        lanesToCheck ??
        heldLanesRef.current
          .map((held, idx) => (held ? idx : -1))
          .filter((idx) => idx >= 0);

      if (targetLanes.length === 0) return;

      let matchedAny = false;
      for (const lane of targetLanes) {
        // Find closest unhit/unmissed note in this lane within hit window
        let bestNote: ChartNote | null = null;
        let bestDelta = Infinity;
        for (const n of chart) {
          if (n.hit || n.missed || n.lane !== lane) continue;
          const d = n.time - songElapsed;
          if (Math.abs(d) <= windowSec && Math.abs(d) < Math.abs(bestDelta)) {
            bestNote = n;
            bestDelta = d;
          }
        }
        if (bestNote) {
          registerHit(bestNote, bestDelta);
          matchedAny = true;
        }
      }

      if (!matchedAny) {
        // Over-strum penalty
        registerMiss('OVERSTRUM');
      }
    };

    triggerStrumRef.current = evaluateStrum;

    const triggerStarPower = () => {
      if (starPower >= 50 && !starActive && !finished && !failed) {
        starActive = true;
        guitarHeroAudio.playStarPowerActivate();
        pushFeedback('STAR POWER 2X!', '#00F0FF');
      }
    };
    activateStarRef.current = triggerStarPower;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const lane = KEY_TO_LANE[e.code];
      if (lane !== undefined) {
        heldLanesRef.current[lane] = true;
        if (tapModeRef.current) {
          evaluateStrum([lane]);
        }
        return;
      }

      if (e.code === 'Enter' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault();
        evaluateStrum();
      } else if (e.code === 'Space') {
        e.preventDefault();
        triggerStarPower();
      } else if (e.code === 'KeyP') {
        setIsPlaying((v) => !v);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const lane = KEY_TO_LANE[e.code];
      if (lane !== undefined) {
        heldLanesRef.current[lane] = false;
      }
    };

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);

    // Loop & Timing
    let lastNow = performance.now();
    let uiSyncAccum = 0;
    let rafId = 0;
    let timerId = 0;
    let disposed = false;

    const afterDraw = isSoftwareGl
      ? (cb: () => void) => {
          const gl = renderer.getContext() as WebGL2RenderingContext;
          const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
          if (sync) gl.deleteSync(sync);
          gl.flush();
          timerId = window.setTimeout(() => {
            if (!disposed) cb();
          }, 80);
        }
      : (cb: () => void) => {
          rafId = window.requestAnimationFrame(cb);
        };

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;

      const beatSec = 60 / currentSongDef.bpm;
      const scrollUnitsPerSec = 18.5 * scrollSpeedRef.current;

      if (isPlayingRef.current && !finished && !failed) {
        songElapsed += dt;

        // Backing Drum & Bass beat scheduler
        const beatPos = Math.floor(songElapsed / beatSec);
        if (beatPos > lastScheduledBeat) {
          lastScheduledBeat = beatPos;
          const barIdx = Math.floor(beatPos / 4);
          const rootMidi =
            currentSongDef.rootMidi +
            currentSongDef.progression[barIdx % currentSongDef.progression.length];
          const rootHz = 440 * Math.pow(2, (rootMidi - 69) / 12);
          guitarHeroAudio.playBackingBeat(beatPos, rootHz);
        }

        // Scroll Fretboard Texture + 3D Fret Bars synced to song speed
        const fretSpacing = 2.25;
        const barTravel = (songElapsed * scrollUnitsPerSec) % fretSpacing;
        for (let i = 0; i < stage.fretBars.length; i++) {
          const zPos = SPAWN_Z + i * fretSpacing + barTravel;
          stage.fretBars[i].position.z = zPos;
          stage.fretBars[i].visible = zPos <= STRIKE_Z + 1.2;
        }
        stage.fretboardTex.offset.y = -(songElapsed * scrollUnitsPerSec) / 6.5;

        // Star Power drain
        if (starActive) {
          starPower = Math.max(0, starPower - dt * 11.5);
          if (starPower <= 0) {
            starActive = false;
          }
        }

        // Process Sustain Holds & Missed Notes
        for (const n of chart) {
          if (n.holding && !n.holdCompleted) {
            const endTime = n.time + n.duration;
            if (heldLanesRef.current[n.lane] && songElapsed <= endTime) {
              score += Math.round(dt * 120 * getMultiplier());
              stage.fretHeads[n.lane].hitFlash = 0.7;
            } else {
              n.holdCompleted = true;
              n.holding = false;
            }
          }
          if (!n.hit && !n.missed && songElapsed - n.time > 0.18) {
            n.missed = true;
            registerMiss('MISS');
          }
        }

        if (songElapsed >= currentSongDef.durationSec && !finished) {
          finished = true;
          setSongFinished(true);
          setIsPlaying(false);
        }
      }

      // Update Pooled Note Meshes across all 5 lanes
      const poolIdx = [0, 0, 0, 0, 0];
      for (let i = 0; i < notePools.length; i++) {
        for (const pv of notePools[i]) {
          pv.group.visible = false;
        }
      }

      const lookAheadSec = Math.abs(SPAWN_Z - STRIKE_Z) / scrollUnitsPerSec;
      for (const n of chart) {
        if (n.missed) continue;
        const endT = n.time + n.duration;
        if (n.hit && !n.holding) continue;
        if (n.time > songElapsed + lookAheadSec) continue;
        if (endT < songElapsed - 0.3) continue;

        const lanePool = notePools[n.lane];
        const slot = poolIdx[n.lane];
        if (slot >= lanePool.length) continue;
        poolIdx[n.lane] += 1;

        const pv = lanePool[slot];
        pv.group.visible = true;

        const headZ = n.holding
          ? STRIKE_Z
          : STRIKE_Z - (n.time - songElapsed) * scrollUnitsPerSec;
        pv.group.position.set(getLaneX(n.lane), 0.07, headZ);

        // Toggle Note Head Style (Normal vs HOPO vs Star Power)
        pv.gemBody.visible = !n.holding;
        pv.starCap.visible = n.isStarPower || starActive;
        pv.normalCap.visible = !pv.starCap.visible;
        pv.hopoRing.visible = n.isHopo && !pv.starCap.visible;
        if (pv.starCap.visible) {
          pv.starCap.rotation.y = songElapsed * 2.5;
        }

        // Update 3D Sustain Tail Beam length cleanly behind gem
        if (n.duration > 0) {
          const remainingDur = n.holding ? Math.max(0, endT - songElapsed) : n.duration;
          const tailLen = Math.max(0.05, remainingDur * scrollUnitsPerSec);
          pv.sustainCore.visible = true;
          pv.sustainAura.visible = true;
          pv.sustainCore.scale.set(1, 1, tailLen);
          pv.sustainCore.position.z = -tailLen * 0.5;
          pv.sustainAura.scale.set(1, 1, tailLen);
          pv.sustainAura.position.z = -tailLen * 0.5;
        } else {
          pv.sustainCore.visible = false;
          pv.sustainAura.visible = false;
        }
      }

      // Animate Articulated Fret Heads (Depress, LED Glow, Flames, Shockwave)
      for (let i = 0; i < 5; i++) {
        const head = stage.fretHeads[i];
        const isHeld = heldLanesRef.current[i];
        head.pressAmount = THREE.MathUtils.damp(head.pressAmount, isHeld ? 1 : 0, 22, dt);
        head.hitFlash = Math.max(0, head.hitFlash - dt * 4.2);

        const baseY = 0.09 - head.pressAmount * 0.085 + head.hitFlash * 0.065;
        head.pistonGroup.position.y = baseY;
        head.bezelMat.emissiveIntensity = (isHeld ? 1.15 : 0.3) + head.hitFlash * 1.4;
        head.pistonCoreMat.emissiveIntensity = (isHeld ? 0.55 : 0.14) + head.hitFlash * 1.3;

        if (head.flameLife > 0) {
          head.flameLife = Math.max(0, head.flameLife - dt * 3.4);
          head.flameGroup.visible = head.flameLife > 0.01;
          const sc = 0.65 + (1 - head.flameLife) * 0.9;
          head.flameGroup.scale.set(sc, head.flameLife * 1.25, sc);
          head.flameGroup.rotation.y += dt * 7;

          head.shockRing.visible = head.flameLife > 0.1;
          const ringScale = 1 + (1 - head.flameLife) * 2.1;
          head.shockRing.scale.set(ringScale, ringScale, 1);
          (head.shockRing.material as THREE.MeshBasicMaterial).opacity = head.flameLife * 0.8;
        } else {
          head.flameGroup.visible = false;
          head.shockRing.visible = false;
        }
      }

      // Animate Stage Spotlights, Highway Edge Equalizer & Star Power Mode
      const beatPulse = Math.pow(1 - ((songElapsed % beatSec) / beatSec), 2);
      for (const strip of stage.edgeStrips) {
        strip.color.set(starActive ? '#00F0FF' : currentSongDef.accentColor);
        strip.emissive.set(starActive ? '#00F0FF' : currentSongDef.accentColor);
        strip.emissiveIntensity = (starActive ? 1.65 : 0.6) + beatPulse * 0.65;
      }

      stage.spotlights.forEach((spot, idx) => {
        spot.target.position.x = Math.sin(songElapsed * 1.4 + idx * 2.1) * 11;
        spot.intensity = 38 + beatPulse * 35;
      });

      // Subtle camera kick & sway
      cameraShake = Math.max(0, cameraShake - dt * 0.35);
      camera.position.x = (Math.random() - 0.5) * cameraShake;
      camera.position.y = 6.7 + (Math.random() - 0.5) * cameraShake * 0.6;

      renderer.render(scene, camera);

      // Sync React HUD at ~15Hz for crisp feedback without DOM overhead
      uiSyncAccum += dt;
      if (uiSyncAccum >= 0.065) {
        uiSyncAccum = 0;
        setStats({
          score,
          combo,
          maxCombo,
          hits,
          misses,
          rockMeter,
          starPower,
          starActive,
          progress: Math.min(1, songElapsed / currentSongDef.durationSec),
        });
      }

      afterDraw(tick);
    };

    afterDraw(tick);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      envTarget.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [songId, difficulty]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    guitarHeroAudio.setMuted(next);
  };

  const multiplier = Math.min(4, 1 + Math.floor(stats.combo / 10)) * (stats.starActive ? 2 : 1);
  const totalNotesPlayed = stats.hits + stats.misses;
  const accuracy = totalNotesPlayed > 0 ? Math.round((stats.hits / totalNotesPlayed) * 100) : 100;
  const starRating =
    accuracy >= 95 ? 5 : accuracy >= 85 ? 4 : accuracy >= 72 ? 3 : accuracy >= 55 ? 2 : 1;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#07090F] select-none font-sans">
      {/* Three.js Canvas Mount */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Top HUD Header */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={onExitToStation}
            className="px-3 py-2 bg-[#0F172A] hover:bg-[#1E293B] border border-slate-700 text-white text-xs font-mono font-bold uppercase flex items-center gap-1.5 shadow-lg cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-sky-400" />
            STATION
          </button>

          <div className="px-3.5 py-1.5 bg-[#0F172A] border border-slate-700 shadow-lg">
            <div className="text-[10px] font-mono uppercase tracking-widest text-sky-400">
              SHRED HERO 3D · {difficulty}
            </div>
            <div className="text-sm font-black italic text-white">
              {activeSong.title} — {activeSong.bpm} BPM
            </div>
          </div>
        </div>

        {/* Score / Combo / Rock Meter Strip */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="px-3.5 py-1.5 bg-[#0F172A] border border-slate-700 shadow-lg text-right min-w-[110px]">
            <div className="text-[9px] font-mono uppercase text-slate-400">SCORE</div>
            <div className="text-base font-mono font-black tabular-nums text-white">
              {stats.score.toLocaleString()}
            </div>
          </div>

          <div
            className={`px-3.5 py-1.5 bg-[#0F172A] border shadow-lg text-center min-w-[92px] ${
              stats.starActive ? 'border-cyan-400' : 'border-slate-700'
            }`}
          >
            <div className="text-[9px] font-mono uppercase text-slate-400">
              {stats.combo} STREAK
            </div>
            <div
              className={`text-base font-mono font-black tabular-nums ${
                stats.starActive ? 'text-cyan-300' : 'text-amber-400'
              }`}
            >
              {multiplier}X
            </div>
          </div>

          {/* Rock Meter */}
          <div className="px-3 py-1.5 bg-[#0F172A] border border-slate-700 shadow-lg w-32">
            <div className="flex justify-between text-[9px] font-mono uppercase text-slate-400 mb-1">
              <span>ROCK</span>
              <span>{Math.round(stats.rockMeter)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${
                  stats.rockMeter > 65
                    ? 'bg-emerald-400'
                    : stats.rockMeter > 30
                      ? 'bg-amber-400'
                      : 'bg-rose-500'
                }`}
                style={{ width: `${stats.rockMeter}%` }}
              />
            </div>
          </div>

          {/* Star Power Trigger Button */}
          <button
            type="button"
            onClick={() => activateStarRef.current?.()}
            className={`px-3 py-1.5 border shadow-lg text-left min-w-[118px] cursor-pointer ${
              stats.starActive
                ? 'bg-cyan-500 border-cyan-300 text-slate-950'
                : stats.starPower >= 50
                  ? 'bg-[#0F172A] border-cyan-400 text-cyan-300 hover:bg-slate-800'
                  : 'bg-[#0F172A] border-slate-700 text-slate-400'
            }`}
            title="Press Space to unleash Star Power when >= 50%"
          >
            <div className="flex items-center justify-between text-[9px] font-mono font-bold uppercase mb-1">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                STAR POWER
              </span>
              <span>{Math.round(stats.starPower)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-cyan-400"
                style={{ width: `${stats.starPower}%` }}
              />
            </div>
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="p-2 bg-[#0F172A] hover:bg-slate-800 border border-slate-700 text-white shadow-lg cursor-pointer"
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
          </button>
        </div>
      </div>

      {/* Song Progress Thin Line under Top Bar */}
      <div className="absolute top-0 inset-x-0 h-1 bg-slate-900 z-30">
        <div
          className="h-full bg-sky-400 transition-all duration-100"
          style={{ width: `${stats.progress * 100}%` }}
        />
      </div>

      {/* Floating Hit Quality Callout */}
      {feedback && (
        <div
          key={feedback.id}
          className="absolute top-[22%] left-1/2 -translate-x-1/2 z-20 pointer-events-none font-black italic tracking-widest text-2xl drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
          style={{ color: feedback.color }}
        >
          {feedback.label}
        </div>
      )}

      {/* Song Finished / Failed Results Card */}
      {(songFinished || songFailed) && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 w-[min(92vw,420px)] bg-[#0F172A] border-2 border-amber-400 p-6 shadow-2xl text-center">
          <div className="text-xs font-mono uppercase tracking-widest text-sky-400">
            {songFailed ? 'CROWD BOOED YOU OFF STAGE' : 'ENCORE COMPLETE'}
          </div>
          <h2 className="text-2xl font-black italic uppercase text-white mt-1">
            {activeSong.title}
          </h2>

          {!songFailed && (
            <div className="flex items-center justify-center gap-1.5 my-3">
              {[1, 2, 3, 4, 5].map((idx) => (
                <Star
                  key={idx}
                  className={`w-6 h-6 ${
                    idx <= starRating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 my-4 p-3 bg-slate-900 border border-slate-700 text-center font-mono">
            <div>
              <div className="text-[10px] text-slate-400">SCORE</div>
              <div className="text-sm font-bold text-white tabular-nums">{stats.score.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">ACCURACY</div>
              <div className="text-sm font-bold text-emerald-400 tabular-nums">{accuracy}%</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">MAX COMBO</div>
              <div className="text-sm font-bold text-amber-400 tabular-nums">{stats.maxCombo}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => restartSongRef.current?.()}
            className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black uppercase text-sm tracking-wider cursor-pointer"
          >
            Play Again
          </button>
        </div>
      )}

      {/* Draggable Controls & Settings Window (Positioned off-center so fret heads are 100% clear) */}
      <div
        ref={panelRef}
        style={{ left: `${panelPos.x}px`, top: `${panelPos.y}px` }}
        className="fixed z-20 w-[min(92vw,372px)] pointer-events-auto"
      >
        <div className="bg-[#0F172A] border border-slate-700 shadow-2xl">
          {/* Drag Handle Top Bar */}
          <div
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest('button')) return;
              dragRef.current.active = true;
              dragRef.current.offsetX = e.clientX - panelPos.x;
              dragRef.current.offsetY = e.clientY - panelPos.y;
            }}
            className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-700 cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300">
              <GripHorizontal className="w-3.5 h-3.5 text-sky-400" />
              CONTROLS &amp; SETTINGS (DRAG)
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  guitarHeroAudio.unlock();
                  setIsPlaying((v) => !v);
                }}
                className="px-2 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 text-[10px] font-mono font-bold uppercase flex items-center gap-1 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button
                type="button"
                onClick={() => restartSongRef.current?.()}
                className="p-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white cursor-pointer"
                title="Restart Song"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setDockOpen((v) => !v)}
                className="p-1 text-slate-300 hover:text-white cursor-pointer"
                title={dockOpen ? 'Collapse Settings' : 'Expand Settings'}
              >
                {dockOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* 5 Tactile Interactive Fret Buttons */}
          <div className="flex items-center justify-between gap-1.5 px-3 py-2 border-b border-slate-700/80">
            {[0, 1, 2, 3, 4].map((lane) => (
              <button
                key={lane}
                type="button"
                onPointerDown={() => {
                  heldLanesRef.current[lane] = true;
                  triggerStrumRef.current?.([lane]);
                }}
                onPointerUp={() => {
                  heldLanesRef.current[lane] = false;
                }}
                onPointerLeave={() => {
                  heldLanesRef.current[lane] = false;
                }}
                className="flex-1 py-1.5 text-sm font-mono font-black text-slate-950 border border-white/30 cursor-pointer active:translate-y-0.5 transition-transform"
                style={{ backgroundColor: LANE_COLORS[lane] }}
              >
                {LANE_KEY_LABELS[lane]}
              </button>
            ))}
          </div>

          {dockOpen && (
            <div className="px-3 py-2.5 space-y-2 text-[11px] font-mono">
              {/* Song Switcher */}
              <div className="flex flex-wrap items-center gap-1">
                <Music className="w-3.5 h-3.5 text-sky-400 mr-0.5 shrink-0" />
                {GUITAR_SONGS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSongId(s.id)}
                    className={`px-2 py-1 border cursor-pointer ${
                      songId === s.id
                        ? 'bg-sky-500 text-slate-950 border-sky-300 font-bold'
                        : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>

              {/* Difficulty + Strum Mode + Speed */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-800">
                <div className="flex items-center gap-1">
                  {(['NORMAL', 'HARD', 'EXPERT'] as GuitarDifficulty[]).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setDifficulty(diff)}
                      className={`px-2 py-1 border cursor-pointer ${
                        difficulty === diff
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                          : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTapMode((v) => !v)}
                    className={`px-2 py-1 border cursor-pointer flex items-center gap-1 ${
                      tapMode
                        ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-bold'
                        : 'bg-slate-800 text-slate-200 border-slate-600'
                    }`}
                    title="Tap Mode hits immediately on key press; Strum Mode uses Enter/Arrows while holding frets"
                  >
                    <Flame className="w-3 h-3" />
                    {tapMode ? 'Tap' : 'Strum'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setScrollSpeedMult((s) => (s >= 1.4 ? 0.85 : Number((s + 0.15).toFixed(2))))
                    }
                    className="px-2 py-1 bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700 cursor-pointer"
                  >
                    {scrollSpeedMult.toFixed(2)}x
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
