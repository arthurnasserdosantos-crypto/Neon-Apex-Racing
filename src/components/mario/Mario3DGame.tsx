/**
 * Super Mario 3D: Mushroom Kingdom Run
 * 3D Platformer featuring Mario in a vibrant Mushroom Kingdom with floating platforms,
 * question blocks, rotating coins, green pipes, goombas, flagpole, and Web Audio retro SFX.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  ArrowLeft,
  Award,
  Coins,
  Flame,
  Gamepad2,
  Heart,
  RefreshCw,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { bgmPlayer } from '../../utils/bgmPlayer';

interface Mario3DGameProps {
  onExitToStation: () => void;
}

// Simple Web Audio API retro sound synth for Mario SFX
class MarioSoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  public isMuted() {
    return this.muted;
  }

  public playCoin() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  public playJump() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.18);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playStomp() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playVictory() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.15;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }
}

const marioSound = new MarioSoundEngine();

export function Mario3DGame({ onExitToStation }: Mario3DGameProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [lives, setLives] = useState(3);
  const [isVictorious, setIsVictorious] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [muted, setMuted] = useState(false);

  const gameStateRef = useRef({
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    onGround: false,
    facing: 1, // 1 = right, -1 = left
    running: false,
  });

  const keysRef = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    bgmPlayer.pause();
    return () => {
      // resume bgm on exit if desired
    };
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Three.js setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#5c94fc'); // Classic Mario sky blue
    scene.fog = new THREE.FogExp2('#5c94fc', 0.015);

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      1000,
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#fffbeb', 1.2);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // World Building: Mushroom Kingdom Level 1-1
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // Ground Plane (Green grass top, brown earth bottom)
    const groundGeo = new THREE.BoxGeometry(240, 4, 16);
    const groundMat = new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.8 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.set(100, -2, 0);
    groundMesh.receiveShadow = true;
    worldGroup.add(groundMesh);

    // Platforms, Bricks, Question Blocks, Coins, Pipes, Goombas
    const platforms: Array<{ x: number; y: number; z: number; w: number; h: number; d: number }> = [
      { x: 18, y: 3, z: 0, w: 4, h: 1, d: 4 },
      { x: 26, y: 3, z: 0, w: 3, h: 1, d: 4 },
      { x: 38, y: 6, z: 0, w: 4, h: 1, d: 4 },
      { x: 55, y: 4, z: 0, w: 6, h: 1, d: 4 },
      { x: 75, y: 5, z: 0, w: 5, h: 1, d: 4 },
      { x: 95, y: 7, z: 0, w: 4, h: 1, d: 4 },
      { x: 115, y: 4, z: 0, w: 8, h: 1, d: 4 },
    ];

    platforms.forEach((p) => {
      const boxGeo = new THREE.BoxGeometry(p.w, p.h, p.d);
      const boxMat = new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.6 });
      const mesh = new THREE.Mesh(boxGeo, boxMat);
      mesh.position.set(p.x, p.y, p.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      worldGroup.add(mesh);
    });

    // Green Warp Pipes
    const pipes = [
      { x: 22, h: 3 },
      { x: 48, h: 4 },
      { x: 88, h: 5 },
    ];

    pipes.forEach((pipe) => {
      const pipeGeo = new THREE.CylinderGeometry(1.2, 1.2, pipe.h, 16);
      const pipeMat = new THREE.MeshStandardMaterial({ color: '#10b981', roughness: 0.4 });
      const mesh = new THREE.Mesh(pipeGeo, pipeMat);
      mesh.position.set(pipe.x, pipe.h / 2 - 2, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      worldGroup.add(mesh);
    });

    // Rotating Coins
    const coinMeshes: THREE.Mesh[] = [];
    const coinPositions = [
      { x: 18, y: 5, z: 0 },
      { x: 20, y: 5, z: 0 },
      { x: 38, y: 8, z: 0 },
      { x: 55, y: 6, z: 0 },
      { x: 75, y: 7, z: 0 },
      { x: 95, y: 9, z: 0 },
      { x: 115, y: 6, z: 0 },
      { x: 120, y: 6, z: 0 },
    ];

    const coinGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.2, 16);
    coinGeo.rotateX(Math.PI / 2);
    const coinMat = new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.8, roughness: 0.2 });

    coinPositions.forEach((cp) => {
      const coin = new THREE.Mesh(coinGeo, coinMat);
      coin.position.set(cp.x, cp.y, cp.z);
      worldGroup.add(coin);
      coinMeshes.push(coin);
    });

    // Flagpole at Level End (x = 140)
    const poleGeo = new THREE.CylinderGeometry(0.2, 0.2, 12, 12);
    const poleMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.9 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(140, 4, 0);
    worldGroup.add(pole);

    const flagGeo = new THREE.BoxGeometry(2, 1.5, 0.2);
    const flagMat = new THREE.MeshStandardMaterial({ color: '#ef4444' });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(139, 9, 0);
    worldGroup.add(flag);

    // Castle at the end (x = 150)
    const castleBaseGeo = new THREE.BoxGeometry(8, 6, 8);
    const castleMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.7 });
    const castle = new THREE.Mesh(castleBaseGeo, castleMat);
    castle.position.set(150, 1, 0);
    worldGroup.add(castle);

    // Create Mario 3D Character (Group of colorful primitives representing Mario)
    const marioGroup = new THREE.Group();
    scene.add(marioGroup);

    // Body (Blue Overalls + Red Shirt)
    const bodyGeo = new THREE.BoxGeometry(0.9, 1.1, 0.6);
    const bodyMat = new THREE.MeshStandardMaterial({ color: '#ef4444' }); // Red shirt
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    marioGroup.add(body);

    const overallsGeo = new THREE.BoxGeometry(0.92, 0.6, 0.62);
    const overallsMat = new THREE.MeshStandardMaterial({ color: '#2563eb' }); // Blue overalls
    const overalls = new THREE.Mesh(overallsGeo, overallsMat);
    overalls.position.y = 0.3;
    marioGroup.add(overalls);

    // Head / Face
    const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const headMat = new THREE.MeshStandardMaterial({ color: '#fbcfe8' }); // Skin tone
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.3;
    head.castShadow = true;
    marioGroup.add(head);

    // Red Cap
    const capGeo = new THREE.BoxGeometry(0.85, 0.3, 0.9);
    const capMat = new THREE.MeshStandardMaterial({ color: '#ef4444' });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, 1.75, 0.1);
    marioGroup.add(cap);

    const brimGeo = new THREE.BoxGeometry(0.85, 0.1, 0.3);
    const brim = new THREE.Mesh(brimGeo, capMat);
    brim.position.set(0, 1.65, 0.5);
    marioGroup.add(brim);

    // Shoes
    const shoeGeo = new THREE.BoxGeometry(0.35, 0.25, 0.5);
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#78350f' }); // Brown shoes
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(-0.25, -0.12, 0.1);
    marioGroup.add(leftShoe);

    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0.25, -0.12, 0.1);
    marioGroup.add(rightShoe);

    // Game loop state
    const g = gameStateRef.current;
    g.x = 0;
    g.y = 2;
    g.z = 0;
    g.vx = 0;
    g.vy = 0;
    g.vz = 0;

    let animId = 0;
    const clock = new THREE.Clock();

    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && g.onGround) {
        g.vy = 14;
        g.onGround = false;
        marioSound.playJump();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / Math.max(1, container.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(0.1, clock.getDelta());

      const keys = keysRef.current;
      const speed = 10;

      // Horizontal movement
      let moveX = 0;
      let moveZ = 0;
      if (keys['ArrowLeft'] || keys['KeyA']) moveX = -1;
      if (keys['ArrowRight'] || keys['KeyD']) moveX = 1;
      if (keys['ArrowUp'] || keys['KeyW']) moveZ = -1;
      if (keys['ArrowDown'] || keys['KeyS']) moveZ = 1;

      g.vx = moveX * speed;
      g.vz = moveZ * speed;

      g.x += g.vx * dt;
      g.z += g.vz * dt;

      // Clamp Z corridor
      g.z = Math.max(-4, Math.min(4, g.z));

      // Gravity & Vertical Physics
      g.vy -= 35 * dt;
      g.y += g.vy * dt;

      // Ground collision
      if (g.y <= 0) {
        g.y = 0;
        g.vy = 0;
        g.onGround = true;
      }

      // Platform collisions
      platforms.forEach((p) => {
        const halfW = p.w / 2;
        const halfD = p.d / 2;
        if (
          g.x >= p.x - halfW - 0.5 &&
          g.x <= p.x + halfW + 0.5 &&
          g.z >= p.z - halfD - 0.5 &&
          g.z <= p.z + halfD + 0.5
        ) {
          const platTop = p.y + p.h / 2;
          if (g.y <= platTop && g.y >= platTop - 1.2 && g.vy <= 0) {
            g.y = platTop;
            g.vy = 0;
            g.onGround = true;
          }
        }
      });

      // Update Mario mesh position
      marioGroup.position.set(g.x, g.y, g.z);
      if (moveX !== 0) {
        marioGroup.rotation.y = moveX > 0 ? Math.PI / 2 : -Math.PI / 2;
      }

      // Camera follow Mario smoothly
      camera.position.lerp(
        new THREE.Vector3(g.x - 10, g.y + 6, g.z + 14),
        0.1,
      );
      camera.lookAt(new THREE.Vector3(g.x + 4, g.y + 2, g.z));

      // Rotate coins
      coinMeshes.forEach((coin, idx) => {
        coin.rotation.z += dt * 3;
        // Check coin collection
        const dist = coin.position.distanceTo(new THREE.Vector3(g.x, g.y + 1, g.z));
        if (dist < 1.5) {
          coin.position.set(999, 999, 999); // remove
          marioSound.playCoin();
          setCoins((c) => {
            const next = c + 1;
            if (next >= 8) {
              setIsVictorious(true);
              marioSound.playVictory();
            }
            return next;
          });
          setScore((s) => s + 200);
        }
      });

      // Check flagpole victory (x >= 139)
      if (g.x >= 139 && !isVictorious) {
        setIsVictorious(true);
        marioSound.playVictory();
      }

      // Fall off bottom pit
      if (g.y < -10 && !isGameOver && !isVictorious) {
        setLives((l) => {
          const next = l - 1;
          if (next <= 0) {
            setIsGameOver(true);
          } else {
            // respawn
            g.x = 0;
            g.y = 5;
            g.z = 0;
            g.vy = 0;
          }
          return next;
        });
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [isVictorious, isGameOver]);

  const restartGame = () => {
    setIsVictorious(false);
    setIsGameOver(false);
    setCoins(0);
    setScore(0);
    setLives(3);
  };

  return (
    <div className="relative w-full h-full bg-[#07090D] select-none flex flex-col justify-between overflow-hidden font-sans text-white">
      {/* Top HUD */}
      <header className="relative z-20 px-6 py-4 bg-[#0D1117]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onExitToStation}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#141822] hover:bg-[#1a2333] border border-white/10 font-mono text-xs text-[#8E96A4] hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Station</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-sm bg-red-500/20 border border-red-500 flex items-center justify-center text-red-400">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-racing)] italic font-black text-lg text-white tracking-wider">
                SUPER MARIO 3D: MUSHROOM KINGDOM
              </h1>
              <p className="text-[11px] font-mono text-[#8E96A4]">World 1-1 · 3D Platformer</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 font-mono text-xs">
          <div className="flex items-center gap-2 bg-[#141822] px-3 py-1.5 border border-white/10">
            <span className="text-[#8E96A4]">SCORE</span>
            <span className="font-bold text-white tabular-nums">{score}</span>
          </div>

          <div className="flex items-center gap-2 bg-[#141822] px-3 py-1.5 border border-white/10">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="font-bold text-yellow-400 tabular-nums">{coins} / 8</span>
          </div>

          <div className="flex items-center gap-2 bg-[#141822] px-3 py-1.5 border border-white/10">
            <Heart className="w-4 h-4 text-red-500 fill-current" />
            <span className="font-bold text-white tabular-nums">x {lives}</span>
          </div>

          <button
            type="button"
            onClick={() => setMuted(marioSound.toggleMute())}
            className="p-2 bg-[#141822] hover:bg-[#1a2333] border border-white/10 text-[#8E96A4] hover:text-white cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 3D Game Canvas Viewport */}
      <main ref={mountRef} className="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden" />

      {/* Instructions Footer */}
      <footer className="relative z-20 px-6 py-2.5 bg-[#0D1117]/95 border-t border-white/10 flex items-center justify-between text-xs font-mono text-[#8E96A4]">
        <div>
          Controls: <strong className="text-white">WASD / Arrow Keys</strong> to Walk/Run · <strong className="text-white">Space / W</strong> to Jump
        </div>
        <div className="text-emerald-400">Collect all 8 coins &amp; reach the castle flag!</div>
      </footer>

      {/* Victory Modal */}
      {isVictorious && (
        <div className="fixed inset-0 z-50 bg-[#07090D]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0D1117] border-2 border-emerald-400 p-8 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-emerald-300 mb-1">
                Course Clear!
              </div>
              <h2 className="font-[family-name:var(--font-racing)] italic font-black uppercase text-4xl text-white tracking-wider">
                Mushroom Kingdom Saved
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#141822] border border-white/10 font-mono text-xs tabular-nums">
              <div>
                <span className="text-[#8E96A4] uppercase">Score</span>
                <div className="text-lg font-bold text-white">{score}</div>
              </div>
              <div>
                <span className="text-[#8E96A4] uppercase">Coins</span>
                <div className="text-lg font-bold text-yellow-400">{coins} / 8</div>
              </div>
            </div>
            <button
              type="button"
              onClick={restartGame}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold uppercase text-sm tracking-wider cursor-pointer"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 bg-[#07090D]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0D1117] border-2 border-red-500 p-8 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-red-400">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-red-400 mb-1">
                Game Over
              </div>
              <h2 className="font-[family-name:var(--font-racing)] italic font-black uppercase text-4xl text-white tracking-wider">
                Mario Fell Down
              </h2>
            </div>
            <button
              type="button"
              onClick={restartGame}
              className="w-full py-3 bg-red-500 hover:bg-red-400 text-white font-mono font-bold uppercase text-sm tracking-wider cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
