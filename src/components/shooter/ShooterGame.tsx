/**
 * Cyber Strike 3D: FPS Sci-Fi Arena Combat Game
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { buildShooterArena, ArenaBuildResult } from './ShooterArena';
import {
  EnemyEntity,
  EnemyProjectile,
  createEnemyMesh,
} from './ShooterEnemies';
import { WEAPON_DEFS, WeaponId } from './ShooterWeapons';
import { shooterAudio } from './shooterAudio';
import { ShooterHUD } from './ShooterHUD';
import { bgmPlayer } from '../../utils/bgmPlayer';

interface ShooterGameProps {
  onExitToStation: () => void;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export function ShooterGame({ onExitToStation }: ShooterGameProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Gameplay state
  const [health, setHealth] = useState(100);
  const [shield, setShield] = useState(100);
  const [score, setScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [wave, setWave] = useState(1);
  const [combo, setCombo] = useState(1);
  const [activeWeaponId, setActiveWeaponId] = useState<WeaponId>('plasma_rifle');
  const [ammoInMag, setAmmoInMag] = useState(WEAPON_DEFS.plasma_rifle.magSize);
  const [reserveAmmo, setReserveAmmo] = useState(WEAPON_DEFS.plasma_rifle.maxReserve);
  const [isReloading, setIsReloading] = useState(false);
  const [reloadProgress, setReloadProgress] = useState(0);
  const [isScoped, setIsScoped] = useState(false);
  const [hitmarkerActive, setHitmarkerActive] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [enemyRadarDots, setEnemyRadarDots] = useState<Array<{ x: number; y: number; isBoss?: boolean }>>([]);
  const [recentKillText, setRecentKillText] = useState<string | null>(null);

  // High-frequency refs for 60fps loop
  const stateRef = useRef({
    health: 100,
    shield: 100,
    score: 0,
    kills: 0,
    wave: 1,
    combo: 1,
    comboTimer: 0,
    activeWeaponId: 'plasma_rifle' as WeaponId,
    ammoInMag: WEAPON_DEFS.plasma_rifle.magSize,
    reserveAmmo: WEAPON_DEFS.plasma_rifle.maxReserve,
    isReloading: false,
    reloadStartTime: 0,
    lastFireTime: 0,
    isFiring: false,
    isScoped: false,
    isPaused: false,
    isGameOver: false,
  });

  const playerRef = useRef({
    pos: new THREE.Vector3(0, 1.8, 20),
    vel: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    pitch: 0,
    onGround: true,
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    sprint: false,
    jumpRequested: false,
  });

  const lastUnlockTimeRef = useRef(0);
  const pendingLockTimeoutRef = useRef<number | null>(null);

  const safeRequestPointerLock = useCallback((el: HTMLElement | null) => {
    if (!el || typeof document === 'undefined') return;
    if (document.pointerLockElement === el) return;

    const now = performance.now();
    const elapsed = now - lastUnlockTimeRef.current;
    const COOLDOWN_MS = 1350;

    if (elapsed < COOLDOWN_MS) {
      if (pendingLockTimeoutRef.current !== null) {
        window.clearTimeout(pendingLockTimeoutRef.current);
      }
      const delay = Math.max(50, COOLDOWN_MS - elapsed + 50);
      pendingLockTimeoutRef.current = window.setTimeout(() => {
        pendingLockTimeoutRef.current = null;
        if (!el || document.pointerLockElement === el) return;
        try {
          const promise = el.requestPointerLock() as unknown;
          if (promise && typeof (promise as Promise<void>).catch === 'function') {
            (promise as Promise<void>).catch(() => {});
          }
        } catch {
          // Cooldown or user gesture restrictions safely handled
        }
      }, delay);
      return;
    }

    try {
      const promise = el.requestPointerLock() as unknown;
      if (promise && typeof (promise as Promise<void>).catch === 'function') {
        (promise as Promise<void>).catch(() => {});
      }
    } catch {
      // Synchronous DOMException safely caught
    }
  }, []);

  // Switch to gameplay track (Nine Thou) when shooter mounts
  useEffect(() => {
    bgmPlayer.setTrack('GAMEPLAY');
    return () => {
      bgmPlayer.setTrack('MENU');
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06080c);
    scene.fog = new THREE.FogExp2(0x06080c, 0.015);

    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 150);
    camera.position.set(0, 1.8, 20);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0x303d52, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 2.0);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -40;
    dirLight.shadow.camera.right = 40;
    dirLight.shadow.camera.top = 40;
    dirLight.shadow.camera.bottom = -40;
    scene.add(dirLight);

    // Cyan & Magenta atmospheric arena point lights
    const cyanLight = new THREE.PointLight(0x00f0ff, 3.5, 45);
    cyanLight.position.set(0, 8, 0);
    scene.add(cyanLight);

    const orangeLight = new THREE.PointLight(0xff7700, 2.5, 35);
    orangeLight.position.set(-25, 6, -25);
    scene.add(orangeLight);

    const purpleLight = new THREE.PointLight(0xa855f7, 2.5, 35);
    purpleLight.position.set(25, 6, 25);
    scene.add(purpleLight);

    // 3. Arena
    const arena: ArenaBuildResult = buildShooterArena();
    scene.add(arena.rootGroup);

    // 4. Viewmodel Gun mounted in player's hands
    const gunPivot = new THREE.Group();
    camera.add(gunPivot);
    scene.add(camera);

    const gunChassisMat = new THREE.MeshStandardMaterial({
      color: 0x1f242d,
      roughness: 0.4,
      metalness: 0.9,
    });
    const gunAccentMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    const gunChassisGeo = new THREE.BoxGeometry(0.12, 0.16, 0.65);
    const gunChassis = new THREE.Mesh(gunChassisGeo, gunChassisMat);
    gunChassis.position.set(0.24, -0.22, -0.55);
    gunPivot.add(gunChassis);

    const gunBarrelGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.4, 8);
    const gunBarrel = new THREE.Mesh(gunBarrelGeo, gunChassisMat);
    gunBarrel.rotation.x = Math.PI / 2;
    gunBarrel.position.set(0.24, -0.2, -0.9);
    gunPivot.add(gunBarrel);

    const gunGlowGeo = new THREE.BoxGeometry(0.04, 0.04, 0.4);
    const gunGlow = new THREE.Mesh(gunGlowGeo, gunAccentMat);
    gunGlow.position.set(0.24, -0.12, -0.6);
    gunPivot.add(gunGlow);

    // 5. Game Objects Collections
    let enemies: EnemyEntity[] = [];
    let enemyProjectiles: EnemyProjectile[] = [];
    let particles: Particle[] = [];
    let nextEnemyId = 1;
    let nextProjId = 1;

    // Helper: Spawn Enemy Wave
    const spawnWave = (waveNum: number) => {
      const count = Math.min(18, 3 + waveNum * 2);
      for (let i = 0; i < count; i++) {
        const spawnIdx = i % arena.enemySpawnPoints.length;
        const spawnPos = arena.enemySpawnPoints[spawnIdx].clone();
        spawnPos.x += (Math.random() - 0.5) * 6;
        spawnPos.z += (Math.random() - 0.5) * 6;

        let type: 'SCOUT' | 'HUNTER' | 'MECH' = 'SCOUT';
        if (waveNum >= 3 && i % 4 === 0) {
          type = 'MECH';
        } else if (waveNum >= 2 && i % 2 === 0) {
          type = 'HUNTER';
        }

        const mesh = createEnemyMesh(type);
        mesh.position.copy(spawnPos);
        scene.add(mesh);

        const maxHp = type === 'SCOUT' ? 70 : type === 'HUNTER' ? 140 : 360;
        enemies.push({
          id: `enemy_${nextEnemyId++}`,
          type,
          meshGroup: mesh,
          health: maxHp,
          maxHealth: maxHp,
          scoreValue: type === 'SCOUT' ? 100 : type === 'HUNTER' ? 250 : 600,
          speed: type === 'SCOUT' ? 7.2 : type === 'HUNTER' ? 5.2 : 3.6,
          attackIntervalMs: type === 'SCOUT' ? 1400 : type === 'HUNTER' ? 2200 : 3000,
          lastAttackTime: performance.now() + Math.random() * 1500,
          burstCount: type === 'HUNTER' ? 3 : 1,
          burstRemaining: 0,
          nextBurstTime: 0,
          velocity: new THREE.Vector3(0, 0, 0),
          targetPos: spawnPos.clone(),
          hitFlashRemainingMs: 0,
          hoverPhase: Math.random() * Math.PI * 2,
        });
      }
    };

    spawnWave(1);

    // Particle Burst Helper
    const spawnExplosionParticles = (pos: THREE.Vector3, colorHex: number, count = 22) => {
      const pGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
      const pMat = new THREE.MeshBasicMaterial({ color: colorHex });

      for (let i = 0; i < count; i++) {
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.position.copy(pos);
        scene.add(pMesh);

        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 14,
          Math.random() * 10 + 2,
          (Math.random() - 0.5) * 14,
        );

        particles.push({
          mesh: pMesh,
          velocity: vel,
          life: 0,
          maxLife: 0.6 + Math.random() * 0.4,
        });
      }
    };

    // Firing logic
    const fireWeapon = () => {
      const now = performance.now();
      const st = stateRef.current;
      const w = WEAPON_DEFS[st.activeWeaponId];

      if (st.isReloading || st.isPaused || st.isGameOver) return;
      if (now - st.lastFireTime < w.fireIntervalMs) return;
      if (st.ammoInMag <= 0) {
        startReload();
        return;
      }

      st.lastFireTime = now;
      st.ammoInMag--;
      setAmmoInMag(st.ammoInMag);

      // Play procedural audio
      if (w.id === 'plasma_rifle') {
        shooterAudio.playPlasmaRifle();
      } else if (w.id === 'shotgun') {
        shooterAudio.playShotgun();
      } else {
        shooterAudio.playRailgun();
      }

      // Gun recoil animation
      gunPivot.position.z += w.recoilKick;
      gunPivot.rotation.x += w.recoilKick * 0.8;

      // Projectiles / Raycasting
      const raycaster = new THREE.Raycaster();
      const origin = camera.position.clone();

      for (let p = 0; p < w.pellets; p++) {
        const spreadX = (Math.random() - 0.5) * w.spread;
        const spreadY = (Math.random() - 0.5) * w.spread;

        const forward = new THREE.Vector3(spreadX, spreadY, -1)
          .applyEuler(camera.rotation)
          .normalize();

        raycaster.set(origin, forward);

        // Check hits against enemies
        let hitEnemy: EnemyEntity | null = null;
        let closestDist = Infinity;

        for (const enemy of enemies) {
          const enemyPos = enemy.meshGroup.position;
          const dist = origin.distanceTo(enemyPos);
          // Sphere hit check
          const toEnemy = enemyPos.clone().sub(origin);
          const projection = toEnemy.dot(forward);
          if (projection > 0) {
            const nearestPoint = origin.clone().add(forward.clone().multiplyScalar(projection));
            const hitRadius = enemy.type === 'MECH' ? 1.6 : 1.1;
            if (nearestPoint.distanceTo(enemyPos) <= hitRadius && projection < closestDist) {
              closestDist = projection;
              hitEnemy = enemy;
            }
          }
        }

        if (hitEnemy) {
          // Confirm hit
          shooterAudio.playHitmarker();
          setHitmarkerActive(true);
          setTimeout(() => setHitmarkerActive(false), 80);

          hitEnemy.health -= w.damage;
          hitEnemy.hitFlashRemainingMs = 120;

          // Flash enemy white
          hitEnemy.meshGroup.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
              child.material.color?.setHex(0xffffff);
            }
          });

          // Check kill
          if (hitEnemy.health <= 0) {
            shooterAudio.playKillChime();
            shooterAudio.playExplosion();
            spawnExplosionParticles(
              hitEnemy.meshGroup.position,
              hitEnemy.type === 'MECH' ? 0xa855f7 : 0xff7700,
              hitEnemy.type === 'MECH' ? 40 : 25,
            );

            scene.remove(hitEnemy.meshGroup);
            enemies = enemies.filter((e) => e.id !== hitEnemy!.id);

            const addedScore = hitEnemy.scoreValue * st.combo;
            st.score += addedScore;
            st.kills++;
            st.combo = Math.min(10, st.combo + 1);
            st.comboTimer = 4.0; // 4s to maintain combo

            setScore(st.score);
            setKills(st.kills);
            setCombo(st.combo);
            setRecentKillText(
              `TARGET DESTROYED +${addedScore} PTS [${hitEnemy.type}]`,
            );
            setTimeout(() => setRecentKillText(null), 1400);

            // Check if wave cleared
            if (enemies.length === 0) {
              st.wave++;
              setWave(st.wave);
              setRecentKillText(`WAVE ${st.wave - 1} CLEARED! PREPARE FOR WAVE ${st.wave}`);
              setTimeout(() => {
                setRecentKillText(null);
                spawnWave(st.wave);
              }, 2200);
            }
          }
        }
      }
    };

    const startReload = () => {
      const st = stateRef.current;
      const w = WEAPON_DEFS[st.activeWeaponId];
      if (st.isReloading || st.ammoInMag === w.magSize || st.reserveAmmo <= 0) return;

      st.isReloading = true;
      st.reloadStartTime = performance.now();
      setIsReloading(true);
      shooterAudio.playReload();
    };

    // 6. User Input Listeners
    const onKeyDown = (e: KeyboardEvent) => {
      const pl = playerRef.current;
      const st = stateRef.current;

      if (e.code === 'KeyW') pl.moveForward = true;
      if (e.code === 'KeyS') pl.moveBackward = true;
      if (e.code === 'KeyA') pl.moveLeft = true;
      if (e.code === 'KeyD') pl.moveRight = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') pl.sprint = true;
      if (e.code === 'Space') {
        if (pl.onGround) {
          pl.vel.y = 8.5; // Jump
          pl.onGround = false;
        }
      }
      if (e.code === 'KeyR') startReload();

      // Weapon slots 1, 2, 3
      if (e.code === 'Digit1') switchWeapon('plasma_rifle');
      if (e.code === 'Digit2') switchWeapon('shotgun');
      if (e.code === 'Digit3') switchWeapon('railgun');

      if (e.code === 'Escape') {
        if (st.isPaused) {
          setIsPaused(false);
          st.isPaused = false;
        } else {
          setIsPaused(true);
          st.isPaused = true;
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const pl = playerRef.current;
      if (e.code === 'KeyW') pl.moveForward = false;
      if (e.code === 'KeyS') pl.moveBackward = false;
      if (e.code === 'KeyA') pl.moveLeft = false;
      if (e.code === 'KeyD') pl.moveRight = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') pl.sprint = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== container) return;
      const pl = playerRef.current;
      const st = stateRef.current;

      const sens = st.isScoped ? 0.001 : 0.0022;
      pl.yaw -= e.movementX * sens;
      pl.pitch -= e.movementY * sens;
      pl.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, pl.pitch));
    };

    const onMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement !== container) {
        safeRequestPointerLock(container);
        return;
      }
      if (e.button === 0) {
        stateRef.current.isFiring = true;
        fireWeapon();
      } else if (e.button === 2) {
        // Scope zoom with Railgun
        if (stateRef.current.activeWeaponId === 'railgun') {
          stateRef.current.isScoped = true;
          setIsScoped(true);
          camera.fov = 32;
          camera.updateProjectionMatrix();
        }
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        stateRef.current.isFiring = false;
      } else if (e.button === 2) {
        stateRef.current.isScoped = false;
        setIsScoped(false);
        camera.fov = 75;
        camera.updateProjectionMatrix();
      }
    };

    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === container;
      setIsPointerLocked(locked);
      if (!locked) {
        lastUnlockTimeRef.current = performance.now();
        // Pause simulation when pointer lock drops (e.g. user pressed Escape or switched tabs)
        if (!stateRef.current.isGameOver) {
          stateRef.current.isPaused = true;
          setIsPaused(true);
        }
      }
    };

    const onPointerLockError = (e: Event) => {
      // Prevent browser error bubble when lock request is on cooldown
      e.preventDefault?.();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('pointerlockerror', onPointerLockError);

    // Switch weapon helper
    const switchWeapon = (id: WeaponId) => {
      const st = stateRef.current;
      if (st.activeWeaponId === id) return;
      st.activeWeaponId = id;
      st.isReloading = false;
      const w = WEAPON_DEFS[id];
      st.ammoInMag = w.magSize;
      st.reserveAmmo = w.maxReserve;
      setActiveWeaponId(id);
      setAmmoInMag(w.magSize);
      setReserveAmmo(w.maxReserve);
      setIsReloading(false);
      gunAccentMat.color.set(w.color);
    };

    // 7. Main 60FPS Game Loop
    let lastTime = performance.now();
    let animId = 0;

    const tick = (now: number) => {
      animId = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const pl = playerRef.current;
      const st = stateRef.current;

      if (st.isPaused || st.isGameOver) {
        renderer.render(scene, camera);
        return;
      }

      // Continuous firing for automatic weapons
      if (st.isFiring && WEAPON_DEFS[st.activeWeaponId].type === 'automatic') {
        fireWeapon();
      }

      // Reload progress
      if (st.isReloading) {
        const w = WEAPON_DEFS[st.activeWeaponId];
        const elapsed = now - st.reloadStartTime;
        const progress = Math.min(1, elapsed / w.reloadTimeMs);
        setReloadProgress(progress);

        if (progress >= 1) {
          const needed = w.magSize - st.ammoInMag;
          const transfer = Math.min(needed, st.reserveAmmo);
          st.ammoInMag += transfer;
          st.reserveAmmo -= transfer;
          st.isReloading = false;
          setIsReloading(false);
          setAmmoInMag(st.ammoInMag);
          setReserveAmmo(st.reserveAmmo);
        }
      }

      // Combo cooldown decay
      if (st.combo > 1) {
        st.comboTimer -= dt;
        if (st.comboTimer <= 0) {
          st.combo = 1;
          setCombo(1);
        }
      }

      // 8. Player Movement Physics
      const moveSpeed = pl.sprint ? 14 : 9.5;
      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), pl.yaw);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), pl.yaw);

      const wishDir = new THREE.Vector3(0, 0, 0);
      if (pl.moveForward) wishDir.add(forward);
      if (pl.moveBackward) wishDir.sub(forward);
      if (pl.moveRight) wishDir.add(right);
      if (pl.moveLeft) wishDir.sub(right);

      if (wishDir.lengthSq() > 0) {
        wishDir.normalize();
        pl.vel.x = THREE.MathUtils.lerp(pl.vel.x, wishDir.x * moveSpeed, dt * 10);
        pl.vel.z = THREE.MathUtils.lerp(pl.vel.z, wishDir.z * moveSpeed, dt * 10);
      } else {
        pl.vel.x = THREE.MathUtils.lerp(pl.vel.x, 0, dt * 12);
        pl.vel.z = THREE.MathUtils.lerp(pl.vel.z, 0, dt * 12);
      }

      // Gravity
      pl.vel.y -= 24 * dt;
      pl.pos.x += pl.vel.x * dt;
      pl.pos.y += pl.vel.y * dt;
      pl.pos.z += pl.vel.z * dt;

      // Arena bounds and floor clamp
      if (pl.pos.y <= 1.8) {
        pl.pos.y = 1.8;
        pl.vel.y = 0;
        pl.onGround = true;
      }
      pl.pos.x = Math.max(-43, Math.min(43, pl.pos.x));
      pl.pos.z = Math.max(-43, Math.min(43, pl.pos.z));

      // Jump Pad stepping check
      for (const pad of arena.jumpPads) {
        const distToPad = new THREE.Vector2(pl.pos.x - pad.position.x, pl.pos.z - pad.position.z).length();
        if (distToPad <= pad.radius && pl.pos.y < 3.0) {
          pl.vel.y = pad.launchVelocityY;
          pl.onGround = false;
          shooterAudio.playJumpPad();
        }
      }

      // Pickup Stations check (Health & Shield)
      for (const pickup of arena.pickupStations) {
        if (pickup.active) {
          // Slowly rotate floating crystal
          pickup.meshGroup.children[1]?.rotation.set(now * 0.001, now * 0.002, 0);

          const dist = pl.pos.distanceTo(pickup.position);
          if (dist < 2.0) {
            if (pickup.type === 'health' && st.health < 100) {
              st.health = Math.min(100, st.health + 40);
              setHealth(st.health);
              pickup.active = false;
              pickup.meshGroup.visible = false;
              pickup.respawnTimeMs = now + 18000;
              shooterAudio.playKillChime();
            } else if (pickup.type === 'shield' && st.shield < 100) {
              st.shield = Math.min(100, st.shield + 50);
              setShield(st.shield);
              pickup.active = false;
              pickup.meshGroup.visible = false;
              pickup.respawnTimeMs = now + 18000;
              shooterAudio.playKillChime();
            }
          }
        } else if (now > pickup.respawnTimeMs) {
          pickup.active = true;
          pickup.meshGroup.visible = true;
        }
      }

      // Apply camera transform
      camera.position.copy(pl.pos);
      camera.rotation.order = 'YXZ';
      camera.rotation.y = pl.yaw;
      camera.rotation.x = pl.pitch;

      // Weapon Bobbing and Sway
      const speed = Math.hypot(pl.vel.x, pl.vel.z);
      const bobAmount = Math.sin(now * 0.012) * speed * 0.004;
      gunPivot.position.y = THREE.MathUtils.lerp(gunPivot.position.y, bobAmount, dt * 10);
      gunPivot.position.z = THREE.MathUtils.lerp(gunPivot.position.z, 0, dt * 12);
      gunPivot.rotation.x = THREE.MathUtils.lerp(gunPivot.rotation.x, 0, dt * 12);

      // 9. Enemy AI and Attacks
      const radarDots: Array<{ x: number; y: number; isBoss?: boolean }> = [];

      enemies.forEach((enemy) => {
        const enemyMesh = enemy.meshGroup;
        const toPlayer = pl.pos.clone().sub(enemyMesh.position);
        const dist = toPlayer.length();

        // Radar projection relative to player orientation
        const localDot = new THREE.Vector3(toPlayer.x, 0, toPlayer.z).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          -pl.yaw,
        );
        const radarDist = Math.min(42, dist) / 42;
        const normAngle = Math.atan2(localDot.x, -localDot.z);
        radarDots.push({
          x: Math.sin(normAngle) * radarDist,
          y: -Math.cos(normAngle) * radarDist,
          isBoss: enemy.type === 'MECH',
        });

        // Face player
        enemyMesh.lookAt(pl.pos.x, enemyMesh.position.y, pl.pos.z);

        // Hover bobbing
        enemy.hoverPhase += dt * 3.5;
        const hoverY = (enemy.type === 'MECH' ? 1.0 : 2.5) + Math.sin(enemy.hoverPhase) * 0.45;

        // Pathing toward player maintaining engagement distance
        const desiredDist = enemy.type === 'MECH' ? 10 : enemy.type === 'HUNTER' ? 14 : 12;
        if (dist > desiredDist) {
          const moveDir = toPlayer.clone().normalize();
          enemyMesh.position.x += moveDir.x * enemy.speed * dt;
          enemyMesh.position.z += moveDir.z * enemy.speed * dt;
        } else if (dist < desiredDist - 4) {
          const moveDir = toPlayer.clone().normalize().negate();
          enemyMesh.position.x += moveDir.x * (enemy.speed * 0.7) * dt;
          enemyMesh.position.z += moveDir.z * (enemy.speed * 0.7) * dt;
        }
        enemyMesh.position.y = hoverY;

        // Reset hit flash color
        if (enemy.hitFlashRemainingMs > 0) {
          enemy.hitFlashRemainingMs -= dt * 1000;
          if (enemy.hitFlashRemainingMs <= 0) {
            enemyMesh.traverse((child) => {
              if (child instanceof THREE.Mesh && child.material) {
                child.material.color?.setHex(0x1f242d);
              }
            });
          }
        }

        // Enemy firing logic
        if (now - enemy.lastAttackTime > enemy.attackIntervalMs && dist < 38) {
          enemy.lastAttackTime = now;
          shooterAudio.playDroneLaser();

          // Spawn projectile traveling toward player
          const projGeo = new THREE.SphereGeometry(0.18, 8, 8);
          const projMat = new THREE.MeshBasicMaterial({
            color: enemy.type === 'MECH' ? 0xa855f7 : 0xff0055,
          });
          const projMesh = new THREE.Mesh(projGeo, projMat);
          projMesh.position.copy(enemyMesh.position);
          scene.add(projMesh);

          const aimDir = pl.pos
            .clone()
            .add(new THREE.Vector3(0, -0.2, 0))
            .sub(enemyMesh.position)
            .normalize();

          enemyProjectiles.push({
            id: `ep_${nextProjId++}`,
            position: enemyMesh.position.clone(),
            velocity: aimDir.multiplyScalar(enemy.type === 'MECH' ? 18 : 22),
            damage: enemy.type === 'MECH' ? 24 : 12,
            mesh: projMesh,
            lifeRemainingMs: 3500,
            isExplosive: enemy.type === 'MECH',
          });
        }
      });

      setEnemyRadarDots(radarDots);

      // 10. Update Enemy Projectiles
      for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        const proj = enemyProjectiles[i];
        proj.position.addScaledVector(proj.velocity, dt);
        proj.mesh.position.copy(proj.position);
        proj.lifeRemainingMs -= dt * 1000;

        // Player collision check
        const distToPlayer = proj.position.distanceTo(pl.pos);
        if (distToPlayer < 1.2) {
          // Player hit!
          shooterAudio.playPlayerHurt();
          if (st.shield > 0) {
            const shieldDmg = Math.min(st.shield, proj.damage);
            st.shield -= shieldDmg;
            const remainingDmg = proj.damage - shieldDmg;
            st.health -= remainingDmg;
          } else {
            st.health -= proj.damage;
          }

          st.health = Math.max(0, st.health);
          setHealth(st.health);
          setShield(st.shield);

          // Check Player Death
          if (st.health <= 0) {
            st.isGameOver = true;
            setIsGameOver(true);
            shooterAudio.playExplosion();
          }

          scene.remove(proj.mesh);
          enemyProjectiles.splice(i, 1);
          continue;
        }

        // Out of bounds or timed out
        if (proj.lifeRemainingMs <= 0 || proj.position.y <= 0) {
          scene.remove(proj.mesh);
          enemyProjectiles.splice(i, 1);
        }
      }

      // 11. Update Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        p.velocity.y -= 18 * dt; // gravity
        p.mesh.position.addScaledVector(p.velocity, dt);
        p.mesh.rotation.x += dt * 4;

        if (p.life >= p.maxLife) {
          scene.remove(p.mesh);
          particles.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(tick);

    // Resize handler
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('pointerlockerror', onPointerLockError);

      if (pendingLockTimeoutRef.current !== null) {
        window.clearTimeout(pendingLockTimeoutRef.current);
        pendingLockTimeoutRef.current = null;
      }

      if (document.pointerLockElement === container) {
        try {
          document.exitPointerLock();
        } catch {
          // Silently ignore if already exited
        }
      }

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [safeRequestPointerLock]);

  const handleSelectWeapon = useCallback((id: WeaponId) => {
    setActiveWeaponId(id);
    stateRef.current.activeWeaponId = id;
    const w = WEAPON_DEFS[id];
    setAmmoInMag(w.magSize);
    setReserveAmmo(w.maxReserve);
    stateRef.current.ammoInMag = w.magSize;
    stateRef.current.reserveAmmo = w.maxReserve;
  }, []);

  const handleRequestPointerLock = useCallback(() => {
    safeRequestPointerLock(containerRef.current);
  }, [safeRequestPointerLock]);

  const handleResume = useCallback(() => {
    setIsPaused(false);
    stateRef.current.isPaused = false;
    safeRequestPointerLock(containerRef.current);
  }, [safeRequestPointerLock]);

  const handleRestart = useCallback(() => {
    setHealth(100);
    setShield(100);
    setScore(0);
    setKills(0);
    setWave(1);
    setCombo(1);
    setIsPaused(false);
    setIsGameOver(false);
    stateRef.current.health = 100;
    stateRef.current.shield = 100;
    stateRef.current.score = 0;
    stateRef.current.kills = 0;
    stateRef.current.wave = 1;
    stateRef.current.combo = 1;
    stateRef.current.isPaused = false;
    stateRef.current.isGameOver = false;
    playerRef.current.pos.set(0, 1.8, 20);
    playerRef.current.vel.set(0, 0, 0);
    safeRequestPointerLock(containerRef.current);
  }, [safeRequestPointerLock]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <div ref={containerRef} className="w-full h-full cursor-crosshair" />

      <ShooterHUD
        health={health}
        maxHealth={100}
        shield={shield}
        maxShield={100}
        score={score}
        kills={kills}
        wave={wave}
        combo={combo}
        activeWeaponId={activeWeaponId}
        ammoInMag={ammoInMag}
        reserveAmmo={reserveAmmo}
        isReloading={isReloading}
        reloadProgress={reloadProgress}
        isScoped={isScoped}
        hitmarkerActive={hitmarkerActive}
        isPointerLocked={isPointerLocked}
        isPaused={isPaused}
        isGameOver={isGameOver}
        enemyRadarDots={enemyRadarDots}
        recentKillText={recentKillText}
        onSelectWeapon={handleSelectWeapon}
        onRequestPointerLock={handleRequestPointerLock}
        onResume={handleResume}
        onRestart={handleRestart}
        onExitToStation={onExitToStation}
      />
    </div>
  );
}
