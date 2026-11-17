import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  ChevronUp,
  Coins,
  Crown,
  FileUp,
  Flag,
  FolderOpen,
  Plug,
  RotateCcw,
  Send,
  Shirt,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  animateRobloxRig,
  applyAvatarCustomization,
  AVATAR_PRESETS,
  createRobloxAvatar,
  RobloxAccessory,
  RobloxAnimState,
  RobloxAvatarConfig,
} from './robloxAvatar';
import { RobloxFaceStyle } from './robloxTextures';
import { buildRobloxWorld } from './robloxWorld';
import { robloxAudio } from './robloxAudio';
import {
  createBotBillboard,
  OllamaAiController,
  OllamaModelStatus,
  PlayerControlMove,
  updateBotBillboard,
} from './ollamaAiService';

interface RobloxGameProps {
  onExitToStation: () => void;
}

const TOTAL_STAGES = 10;

// Pre-allocated math vectors for zero-GC animation loop
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _camDesired = new THREE.Vector3();

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 6, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.52)');
  grad.addColorStop(0.6, 'rgba(15, 23, 42, 0.22)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createGradientSkyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#0284C7');
  grad.addColorStop(0.55, '#38BDF8');
  grad.addColorStop(0.88, '#BAE6FD');
  grad.addColorStop(1, '#E0F2FE');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function RobloxGame({ onExitToStation }: RobloxGameProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [avatarConfig, setAvatarConfig] = useState<RobloxAvatarConfig>(() => ({
    ...AVATAR_PRESETS.noob,
  }));
  const avatarConfigRef = useRef(avatarConfig);
  avatarConfigRef.current = avatarConfig;

  const [currentStage, setCurrentStage] = useState<number>(0);
  const [coinsCollected, setCoinsCollected] = useState<number>(0);
  const [totalCoins, setTotalCoins] = useState<number>(10);
  const [muted, setMuted] = useState<boolean>(false);
  const [dockOpen, setDockOpen] = useState<boolean>(true);
  const [dockTab, setDockTab] = useState<'EMOTES' | 'AI_BOTS' | 'AVATAR' | 'WORLD'>('EMOTES');
  const [activeEmote, setActiveEmote] = useState<RobloxAnimState | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>('Welcome to BloxVerse 3D! Drag to orbit · WASD to move');
  const [victoryElapsed, setVictoryElapsed] = useState<number | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaModelStatus>({
    state: 'idle',
    mode: 'none',
    progressPct: 0,
    endpointUrl: 'http://localhost:11434',
    models: [],
  });
  const [ollamaUrlInput, setOllamaUrlInput] = useState<string>('http://localhost:11434');
  const [botRoster, setBotRoster] = useState<
    { id: string; name: string; directive: string; speech: string }[]
  >([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [aiControlEnabled, setAiControlEnabled] = useState<boolean>(false);
  const [aiPilotLabel, setAiPilotLabel] = useState<string>('OFF');

  const activeEmoteRef = useRef<RobloxAnimState | null>(null);
  const respawnTriggerRef = useRef<'checkpoint' | 'spawn' | null>(null);
  const rigUpdateRef = useRef<((cfg: RobloxAvatarConfig) => void) | null>(null);
  const chatToBotsRef = useRef<((msg: string) => void) | null>(null);
  const aiControlRef = useRef<boolean>(false);
  const aiCommandTriggerRef = useRef<((goal: string) => void) | null>(null);
  const ollamaCtrlRef = useRef<OllamaAiController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dirInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (msg: string, ms = 2400) => {
    setToastMsg(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg(null);
      toastTimerRef.current = null;
    }, ms);
  };

  useEffect(() => {
    if (rigUpdateRef.current) {
      rigUpdateRef.current(avatarConfig);
    }
  }, [avatarConfig]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Renderer initialization with WebGL software probe
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const maxAniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);

    // Scene + Sky Backdrop + Fog + IBL RoomEnvironment
    const scene = new THREE.Scene();
    scene.background = createGradientSkyTexture();
    scene.fog = new THREE.FogExp2('#BAE6FD', 0.0028);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.65;

    // 3-Point Lighting
    const hemiLight = new THREE.HemisphereLight('#E0F2FE', '#334155', 0.55);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#FFFBEB', 2.4);
    sunLight.position.set(28, 52, 24);
    if (!isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(2048, 2048);
      sunLight.shadow.camera.near = 2;
      sunLight.shadow.camera.far = 160;
      sunLight.shadow.camera.left = -42;
      sunLight.shadow.camera.right = 42;
      sunLight.shadow.camera.top = 42;
      sunLight.shadow.camera.bottom = -42;
      sunLight.shadow.bias = -0.0005;
    }
    scene.add(sunLight);
    scene.add(sunLight.target);

    const rimLight = new THREE.DirectionalLight('#60A5FA', 0.65);
    rimLight.position.set(-24, 18, -32);
    scene.add(rimLight);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.15,
      480,
    );

    // Build World + Player Avatar + Contact Shadow + Ollama AI Controller
    const world = buildRobloxWorld(maxAniso);
    scene.add(world.worldGroup);
    setTotalCoins(world.coins.length);
    setBotRoster(
      world.npcs
        .filter((b) => !b.pinnedAtPodium)
        .map((b) => ({
          id: b.id,
          name: b.name,
          directive: b.directive,
          speech: b.speech,
        })),
    );

    const ollamaCtrl = new OllamaAiController();
    ollamaCtrlRef.current = ollamaCtrl;
    setOllamaUrlInput(ollamaCtrl.getStatus().endpointUrl);
    ollamaCtrl.start();
    const unsubOllama = ollamaCtrl.subscribe((st) => {
      setOllamaStatus(st);
    });
    const inFlightBots = new Set<string>();
    let uiBotSyncTimer = 0;

    const playerRig = createRobloxAvatar(avatarConfigRef.current, maxAniso);
    const playerPos = world.spawnPosition.clone();
    playerRig.root.position.copy(playerPos);
    playerRig.root.rotation.y = Math.PI; // face -Z toward Plaza & Obby
    scene.add(playerRig.root);

    const playerBillboard = createBotBillboard(
      avatarConfigRef.current.name,
      'AI PILOT',
      '',
      false,
    );
    playerBillboard.sprite.visible = false;
    playerRig.root.add(playerBillboard.sprite);

    rigUpdateRef.current = (cfg: RobloxAvatarConfig) => {
      applyAvatarCustomization(playerRig, cfg, maxAniso);
    };

    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 2.1),
      new THREE.MeshBasicMaterial({
        map: createContactShadowTexture(),
        transparent: true,
        depthWrite: false,
      }),
    );
    contactShadow.rotation.x = -Math.PI / 2;
    scene.add(contactShadow);

    // Player & Camera Physics State
    let camYaw = Math.PI; // looking toward -Z
    let camPitch = 0.34;
    let camDist = 11.5;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    let playerYaw = Math.PI;
    const playerVel = new THREE.Vector3(0, 0, 0);
    let onGround = true;
    let onTruss = false;
    let coyoteTimer = 0;
    let jumpBuffer = 0;
    let activeCheckpointPos = world.spawnPosition.clone();
    let bestStage = 0;
    let coinCount = 0;
    let footstepTimer = 0;
    let obbyStartMs = performance.now();
    let obbyWon = false;

    // AI Character Pilot State
    let aiMove: PlayerControlMove = 'TO_OBBY';
    let aiSprint = false;
    let aiThinkInFlight = false;
    let nextAiThinkAt = 0;
    let aiPendingGoal = '';
    let aiSpeechHideAt = 0;
    let aiJumpCooldown = 0;

    const keys = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      keys.add(code);
      if (code === 'Space') {
        jumpBuffer = 0.14;
      }
      if (code === 'Digit1') {
        activeEmoteRef.current = 'WAVE';
        setActiveEmote('WAVE');
        robloxAudio.playEmoteChime();
      } else if (code === 'Digit2') {
        activeEmoteRef.current = 'DANCE';
        setActiveEmote('DANCE');
        robloxAudio.playEmoteChime();
      } else if (code === 'Digit3') {
        activeEmoteRef.current = 'CHEER';
        setActiveEmote('CHEER');
        robloxAudio.playEmoteChime();
      } else if (code === 'Digit4') {
        activeEmoteRef.current = 'SIT';
        setActiveEmote('SIT');
        robloxAudio.playEmoteChime();
      } else if (code === 'KeyR') {
        respawnTriggerRef.current = 'checkpoint';
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 0 || e.button === 2) {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      camYaw -= dx * 0.0065;
      camPitch = THREE.MathUtils.clamp(camPitch + dy * 0.0055, -0.25, 1.18);
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camDist = THREE.MathUtils.clamp(camDist + e.deltaY * 0.012, 2.5, 24);
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    const canvasEl = renderer.domElement;
    canvasEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvasEl.addEventListener('wheel', onWheel, { passive: false });
    canvasEl.addEventListener('contextmenu', onContextMenu);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const respawnPlayer = (toOrigin: boolean, playOof: boolean) => {
      if (playOof) robloxAudio.playOof();
      if (toOrigin) {
        playerPos.copy(world.spawnPosition);
        activeCheckpointPos.copy(world.spawnPosition);
      } else {
        playerPos.copy(activeCheckpointPos);
      }
      playerVel.set(0, 0, 0);
      onGround = false;
      onTruss = false;
    };

    // Frame Loop with Software GL pacing
    let lastTime = performance.now();
    let elapsed = 0;
    let rafId = 0;
    let timerId = 0;
    let disposed = false;

    const afterDraw = isSoftwareGl
      ? (cb: () => void) => {
          const sync = (gl as WebGL2RenderingContext).fenceSync(
            (gl as WebGL2RenderingContext).SYNC_GPU_COMMANDS_COMPLETE,
            0,
          );
          if (sync) (gl as WebGL2RenderingContext).deleteSync(sync);
          gl.flush();
          timerId = window.setTimeout(() => {
            if (!disposed) cb();
          }, 80);
        }
      : (cb: () => void) => {
          rafId = window.requestAnimationFrame(cb);
        };

    const playerRadius = 0.62;
    const playerHeight = 3.2;

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += dt;

      // Handle manual respawn/teleport request
      if (respawnTriggerRef.current) {
        const mode = respawnTriggerRef.current;
        respawnTriggerRef.current = null;
        respawnPlayer(mode === 'spawn', false);
        showToast(mode === 'spawn' ? 'Teleported to Blox Plaza' : 'Respawned at Checkpoint');
      }

      // 1. Update Dynamic Platforms & Calculate Frame Deltas
      for (const p of world.platforms) {
        if (p.moveAxis && p.moveOrigin && p.moveAmp !== undefined && p.moveSpeed !== undefined) {
          const prevX = p.mesh.position.x;
          const prevY = p.mesh.position.y;
          const prevZ = p.mesh.position.z;
          const offset = Math.sin(elapsed * p.moveSpeed + (p.movePhase ?? 0)) * p.moveAmp;
          p.mesh.position.copy(p.moveOrigin);
          p.mesh.position[p.moveAxis] += offset;
          p.delta.set(
            p.mesh.position.x - prevX,
            p.mesh.position.y - prevY,
            p.mesh.position.z - prevZ,
          );
          p.center.copy(p.mesh.position);
        }
      }

      // Update Rotating Sweeper Hazards
      for (const sw of world.sweepers) {
        sw.pivot.rotation.y = elapsed * sw.speed + sw.phase;
      }

      // Update Floating Coins & Clouds & Trophy & Fountain
      for (const c of world.coins) {
        if (!c.collected) {
          c.mesh.rotation.y = elapsed * 2.4 + c.phase;
          c.mesh.position.y = c.baseY + Math.sin(elapsed * 3.1 + c.phase) * 0.24;
        }
      }
      world.trophyCrown.rotation.y = elapsed * 1.1;
      world.trophyCrown.position.y = 41.2 + Math.sin(elapsed * 2.4) * 0.35;

      for (let i = 0; i < world.fountainDroplets.length; i++) {
        const d = world.fountainDroplets[i];
        const t = ((elapsed * 1.35 + i / world.fountainDroplets.length) % 1);
        const angle = (i / world.fountainDroplets.length) * Math.PI * 2;
        const rad = t * 2.4;
        d.position.set(
          -12 + Math.cos(angle) * rad,
          3.25 + (1 - (2 * t - 1) ** 2) * 1.65 - t * 2.1,
          2 + Math.sin(angle) * rad,
        );
      }

      // Autonomous Ollama AI Players Update & Physics
      const getBotZone = (pos: THREE.Vector3) => {
        if (pos.z < -28) return 'ObbyStage1';
        if (pos.x < -7) return 'Fountain';
        if (pos.x > 9) return 'BloxShop';
        return 'Plaza';
      };

      const triggerBotThink = (
        np: (typeof world.npcs)[number],
        playerChatText?: string,
      ) => {
        if (inFlightBots.has(np.id)) return;
        inFlightBots.add(np.id);
        const dist = np.position.distanceTo(playerPos);
        ollamaCtrl
          .decideAction({
            botName: np.name,
            zone: getBotZone(np.position),
            playerNear: dist < 11,
            lastAction: np.directive,
            playerChat: playerChatText,
          })
          .then((decision) => {
            inFlightBots.delete(np.id);
            if (disposed) return;
            np.directive = decision.directive;
            np.speech = decision.speech;
            updateBotBillboard(
              np.billboard,
              np.name,
              np.directive,
              np.speech,
              decision.source === 'ollama',
            );
            if (decision.directive === 'JUMP' && np.onGround) {
              np.velocity.y = 14.5;
              np.onGround = false;
            }
          })
          .catch(() => {
            inFlightBots.delete(np.id);
          });
      };

      chatToBotsRef.current = (msg: string) => {
        const activeBots = world.npcs.filter((n) => !n.pinnedAtPodium);
        activeBots.forEach((b, idx) => {
          window.setTimeout(() => {
            if (!disposed) triggerBotThink(b, msg);
          }, idx * 140);
        });
      };

      for (const np of world.npcs) {
        if (np.pinnedAtPodium) {
          animateRobloxRig(np.rig, np.anim, dt, elapsed + np.phase, 0.9);
          continue;
        }

        if (elapsed >= np.nextThinkAt) {
          np.nextThinkAt = elapsed + 4.8 + (np.phase % 2);
          triggerBotThink(np);
        }

        np.jumpCooldown = Math.max(0, np.jumpCooldown - dt);
        let moveTarget: THREE.Vector3 | null = null;
        let botSpeed = 5.4;

        if (np.directive === 'FOLLOW') {
          const distToPlayer = np.position.distanceTo(playerPos);
          if (distToPlayer > 4.2 && distToPlayer < 32) {
            moveTarget = playerPos;
            botSpeed = distToPlayer > 9 ? 9.5 : 5.8;
          }
        } else if (np.directive === 'PATROL' || np.directive === 'RACE_OBBY') {
          moveTarget = np.waypoints[np.waypointIdx] ?? null;
          botSpeed = np.directive === 'RACE_OBBY' ? 8.2 : 5.0;
          if (moveTarget) {
            const dx = moveTarget.x - np.position.x;
            const dz = moveTarget.z - np.position.z;
            if (dx * dx + dz * dz < 1.1) {
              np.waypointIdx = (np.waypointIdx + 1) % np.waypoints.length;
              moveTarget = np.waypoints[np.waypointIdx];
            }
          }
        }

        let movingHoriz = false;
        if (moveTarget) {
          const dx = moveTarget.x - np.position.x;
          const dz = moveTarget.z - np.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 0.35) {
            movingHoriz = true;
            const dirX = dx / dist;
            const dirZ = dz / dist;
            np.velocity.x = THREE.MathUtils.damp(np.velocity.x, dirX * botSpeed, 8, dt);
            np.velocity.z = THREE.MathUtils.damp(np.velocity.z, dirZ * botSpeed, 8, dt);

            const targetYaw = Math.atan2(dirX, dirZ);
            let diff = targetYaw - np.yaw;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            np.yaw += diff * Math.min(1, dt * 10);

            // Hop up stairs / gaps cleanly
            if (moveTarget.y > np.position.y + 0.45 && np.onGround && np.jumpCooldown <= 0) {
              np.velocity.y = 15.2;
              np.onGround = false;
              np.jumpCooldown = 0.9;
            }
          }
        } else {
          np.velocity.x = THREE.MathUtils.damp(np.velocity.x, 0, 10, dt);
          np.velocity.z = THREE.MathUtils.damp(np.velocity.z, 0, 10, dt);
          if (np.directive === 'WAVE' || np.directive === 'CHEER') {
            const faceYaw = Math.atan2(playerPos.x - np.position.x, playerPos.z - np.position.z);
            let diff = faceYaw - np.yaw;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            np.yaw += diff * Math.min(1, dt * 7);
          }
        }

        // Gravity & ground landing for AI Players
        np.velocity.y -= 40 * dt;
        const botPrevY = np.position.y;
        np.position.x += np.velocity.x * dt;
        np.position.z += np.velocity.z * dt;
        np.position.y += np.velocity.y * dt;

        np.onGround = false;
        for (const p of world.platforms) {
          const minX = p.center.x - p.halfW - 0.45;
          const maxX = p.center.x + p.halfW + 0.45;
          const minZ = p.center.z - p.halfD - 0.45;
          const maxZ = p.center.z + p.halfD + 0.45;
          const topY = p.center.y + p.halfH;
          const botY = p.center.y - p.halfH;

          if (
            np.position.x >= minX &&
            np.position.x <= maxX &&
            np.position.z >= minZ &&
            np.position.z <= maxZ
          ) {
            const overlappingVert = np.position.y < topY && np.position.y + 3.2 > botY;
            const feetCrossedTop = botPrevY >= topY - 1.2 && np.position.y <= topY + 0.35;

            if (p.kind === 'lava' && (feetCrossedTop || overlappingVert)) {
              np.position.copy(np.waypoints[0]);
              np.velocity.set(0, 0, 0);
              np.waypointIdx = 0;
              break;
            }

            if (np.velocity.y <= 0 && feetCrossedTop) {
              np.position.y = topY;
              np.velocity.y = 0;
              np.onGround = true;
              break;
            }
          }
        }

        if (np.position.y < -10) {
          np.position.copy(np.waypoints[0]);
          np.velocity.set(0, 0, 0);
          np.waypointIdx = 0;
        }

        np.rig.root.position.copy(np.position);
        np.rig.root.rotation.y = np.yaw;

        const botHorizSpeed = Math.hypot(np.velocity.x, np.velocity.z);
        if (!np.onGround) {
          np.anim = np.velocity.y > 0.5 ? 'JUMP' : 'FALL';
        } else if (movingHoriz && botHorizSpeed > 0.8) {
          np.anim = botHorizSpeed > 7.2 ? 'RUN' : 'WALK';
        } else if (np.directive === 'DANCE') {
          np.anim = 'DANCE';
        } else if (np.directive === 'WAVE') {
          np.anim = 'WAVE';
        } else if (np.directive === 'CHEER') {
          np.anim = 'CHEER';
        } else {
          np.anim = 'IDLE';
        }

        animateRobloxRig(np.rig, np.anim, dt, elapsed + np.phase, botHorizSpeed / 8);
      }

      uiBotSyncTimer += dt;
      if (uiBotSyncTimer >= 0.7) {
        uiBotSyncTimer = 0;
        setBotRoster(
          world.npcs
            .filter((b) => !b.pinnedAtPodium)
            .map((b) => ({
              id: b.id,
              name: b.name,
              directive: b.directive,
              speech: b.speech,
            })),
        );
      }

      // 2. Gather Manual Keyboard Input + Optional AI Character Control
      let inX = 0;
      let inZ = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) inZ += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) inZ -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) inX += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) inX -= 1;

      const manualMoveInput = inX !== 0 || inZ !== 0;
      let isSprinting = keys.has('ShiftLeft') || keys.has('ShiftRight');

      const hasSupportAt = (px: number, py: number, pz: number) => {
        for (const p of world.platforms) {
          if (p.kind === 'lava') continue;
          const topY = p.center.y + p.halfH;
          if (Math.abs(topY - py) > 3.2) continue;
          if (
            px >= p.center.x - p.halfW - 0.2 &&
            px <= p.center.x + p.halfW + 0.2 &&
            pz >= p.center.z - p.halfD - 0.2 &&
            pz <= p.center.z + p.halfD + 0.2
          ) {
            return true;
          }
        }
        return false;
      };

      const requestAiCharacterThink = (goalOverride?: string) => {
        if (aiThinkInFlight) return;
        aiThinkInFlight = true;

        let nearestCoinDist: number | undefined;
        for (const c of world.coins) {
          if (c.collected) continue;
          const d = playerPos.distanceTo(c.position);
          if (nearestCoinDist === undefined || d < nearestCoinDist) nearestCoinDist = d;
        }

        let nearestBotName: string | undefined;
        let minBotDist = Infinity;
        for (const np of world.npcs) {
          const d = playerPos.distanceTo(np.position);
          if (d < minBotDist) {
            minBotDist = d;
            nearestBotName = np.name;
          }
        }

        const probeX = playerPos.x + Math.sin(playerYaw) * 1.9;
        const probeZ = playerPos.z + Math.cos(playerYaw) * 1.9;
        const gapAhead = onGround && !hasSupportAt(probeX, playerPos.y, probeZ);

        const goalToUse = goalOverride ?? aiPendingGoal;
        aiPendingGoal = '';

        ollamaCtrl
          .decidePlayerControl({
            stage: bestStage,
            totalStages: TOTAL_STAGES,
            coins: coinCount,
            totalCoins: world.coins.length,
            onGround,
            onTruss,
            gapAhead,
            nearestCoinDist,
            nearestBotName,
            lastMove: aiMove,
            userGoal: goalToUse || undefined,
          })
          .then((decision) => {
            aiThinkInFlight = false;
            if (disposed) return;
            aiMove = decision.move;
            aiSprint = decision.sprint;
            setAiPilotLabel(decision.move);

            if (decision.jump && onGround) {
              jumpBuffer = 0.16;
            }
            if (decision.emote !== 'NONE') {
              activeEmoteRef.current = decision.emote;
              setActiveEmote(decision.emote);
              robloxAudio.playEmoteChime();
            } else if (decision.move !== 'STOP' && activeEmoteRef.current) {
              activeEmoteRef.current = null;
              setActiveEmote(null);
            }
            if (decision.say) {
              updateBotBillboard(
                playerBillboard,
                avatarConfigRef.current.name,
                `AI · ${decision.move}`,
                decision.say,
                decision.source === 'ollama',
              );
              playerBillboard.sprite.visible = true;
              aiSpeechHideAt = elapsed + 5.5;
            }
          })
          .catch(() => {
            aiThinkInFlight = false;
          });
      };

      aiCommandTriggerRef.current = (goal: string) => {
        aiPendingGoal = goal;
        nextAiThinkAt = 0;
        if (!aiControlRef.current) {
          aiControlRef.current = true;
          setAiControlEnabled(true);
        }
        requestAiCharacterThink(goal);
      };

      if (playerBillboard.sprite.visible && (!aiControlRef.current || elapsed > aiSpeechHideAt)) {
        playerBillboard.sprite.visible = false;
      }

      aiJumpCooldown = Math.max(0, aiJumpCooldown - dt);

      if (aiControlRef.current && elapsed >= nextAiThinkAt) {
        nextAiThinkAt = elapsed + 1.85;
        requestAiCharacterThink();
      }

      let hasMoveInput = manualMoveInput;

      if (manualMoveInput) {
        if (activeEmoteRef.current) {
          activeEmoteRef.current = null;
          setActiveEmote(null);
        }
        _forward.set(Math.sin(camYaw), 0, Math.cos(camYaw));
        _right.set(-Math.cos(camYaw), 0, Math.sin(camYaw));
        _moveDir.set(0, 0, 0).addScaledVector(_forward, inZ).addScaledVector(_right, inX);
      } else if (aiControlRef.current) {
        isSprinting = aiSprint;
        _moveDir.set(0, 0, 0);

        if (aiMove === 'FORWARD' || aiMove === 'BACK' || aiMove === 'LEFT' || aiMove === 'RIGHT') {
          _forward.set(Math.sin(camYaw), 0, Math.cos(camYaw));
          _right.set(-Math.cos(camYaw), 0, Math.sin(camYaw));
          if (aiMove === 'FORWARD') _moveDir.add(_forward);
          else if (aiMove === 'BACK') _moveDir.sub(_forward);
          else if (aiMove === 'RIGHT') _moveDir.add(_right);
          else _moveDir.sub(_right);
        } else if (aiMove === 'TO_FOUNTAIN') {
          _moveDir.set(-12 - playerPos.x, 0, 2 - playerPos.z);
          if (_moveDir.lengthSq() < 4) _moveDir.set(0, 0, 0);
        } else if (aiMove === 'TO_COIN') {
          let targetCoin: THREE.Vector3 | null = null;
          let bestDist = Infinity;
          for (const c of world.coins) {
            if (c.collected) continue;
            const d = playerPos.distanceTo(c.position);
            if (d < bestDist) {
              bestDist = d;
              targetCoin = c.position;
            }
          }
          if (targetCoin) {
            _moveDir.set(targetCoin.x - playerPos.x, 0, targetCoin.z - playerPos.z);
          }
        } else if (aiMove === 'TO_BOT') {
          let targetBot: THREE.Vector3 | null = null;
          let bestDist = Infinity;
          for (const np of world.npcs) {
            if (np.pinnedAtPodium) continue;
            const d = playerPos.distanceTo(np.position);
            if (d < bestDist) {
              bestDist = d;
              targetBot = np.position;
            }
          }
          if (targetBot && bestDist > 3.2) {
            _moveDir.set(targetBot.x - playerPos.x, 0, targetBot.z - playerPos.z);
          }
        } else if (aiMove === 'TO_OBBY') {
          const nextCp =
            world.checkpoints.find((cp) => !cp.activated && cp.stage > bestStage) ??
            world.checkpoints[world.checkpoints.length - 1];
          const finishPlat = world.platforms.find((p) => p.kind === 'finish');
          const targetVec =
            bestStage >= TOTAL_STAGES - 1 && finishPlat
              ? finishPlat.center
              : nextCp
                ? nextCp.spawnPos
                : new THREE.Vector3(0, 1, -45);
          _moveDir.set(targetVec.x - playerPos.x, 0, targetVec.z - playerPos.z);
        }

        if (_moveDir.lengthSq() > 0.04) {
          hasMoveInput = true;
          if (activeEmoteRef.current) {
            activeEmoteRef.current = null;
            setActiveEmote(null);
          }
          const dirNormX = _moveDir.x / Math.hypot(_moveDir.x, _moveDir.z);
          const dirNormZ = _moveDir.z / Math.hypot(_moveDir.x, _moveDir.z);
          if (
            onGround &&
            aiJumpCooldown <= 0 &&
            (aiMove === 'TO_OBBY' || aiMove === 'TO_COIN') &&
            !hasSupportAt(playerPos.x + dirNormX * 1.85, playerPos.y, playerPos.z + dirNormZ * 1.85)
          ) {
            jumpBuffer = 0.16;
            aiJumpCooldown = 0.65;
          }
        }
      } else {
        _moveDir.set(0, 0, 0);
      }

      if (_moveDir.lengthSq() > 0.001) {
        _moveDir.normalize();
      }

      const maxSpeed = isSprinting ? 17.5 : 11.2;
      const accel = onGround ? 52 : 24;
      const targetVx = _moveDir.x * maxSpeed;
      const targetVz = _moveDir.z * maxSpeed;

      playerVel.x = THREE.MathUtils.damp(playerVel.x, targetVx, accel * 0.25, dt);
      playerVel.z = THREE.MathUtils.damp(playerVel.z, targetVz, accel * 0.25, dt);

      if (hasMoveInput) {
        const desiredYaw = Math.atan2(_moveDir.x, _moveDir.z);
        // Smooth shortest-angle turn
        let diff = desiredYaw - playerYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        playerYaw += diff * Math.min(1, dt * 13);
      }

      // Check Truss Ladder Overlap
      onTruss = false;
      for (const tr of world.trusses) {
        if (
          playerPos.x >= tr.minX &&
          playerPos.x <= tr.maxX &&
          playerPos.y + 0.5 >= tr.minY &&
          playerPos.y <= tr.maxY &&
          playerPos.z >= tr.minZ &&
          playerPos.z <= tr.maxZ
        ) {
          onTruss = true;
          break;
        }
      }

      // Jump / Gravity / Truss Climb
      if (onGround) {
        coyoteTimer = 0.12;
      } else {
        coyoteTimer = Math.max(0, coyoteTimer - dt);
      }
      if (jumpBuffer > 0) jumpBuffer = Math.max(0, jumpBuffer - dt);

      if (onTruss) {
        let climbDir = 0;
        if (keys.has('KeyW') || keys.has('ArrowUp') || keys.has('Space')) {
          climbDir = 1;
        } else if (keys.has('KeyS') || keys.has('ArrowDown')) {
          climbDir = -1;
        } else if (aiControlRef.current && (aiMove === 'TO_OBBY' || aiMove === 'FORWARD')) {
          climbDir = 1;
        }
        playerVel.y = climbDir * 9.5;
        onGround = false;
      } else {
        if (jumpBuffer > 0 && coyoteTimer > 0) {
          playerVel.y = 17.8;
          onGround = false;
          coyoteTimer = 0;
          jumpBuffer = 0;
          robloxAudio.playJump();
        }
        playerVel.y -= 44 * dt; // crisp Roblox-style platforming gravity
      }

      // Integrate Position
      const prevY = playerPos.y;
      playerPos.x += playerVel.x * dt;
      playerPos.z += playerVel.z * dt;
      playerPos.y += playerVel.y * dt;

      // 3. Platform & Hazard AABB Resolution
      const wasOnGround = onGround;
      onGround = false;
      let highestShadowY = -50;
      let ridingPlatform: (typeof world.platforms)[number] | null = null;

      for (const p of world.platforms) {
        const minX = p.center.x - p.halfW - playerRadius * 0.72;
        const maxX = p.center.x + p.halfW + playerRadius * 0.72;
        const minZ = p.center.z - p.halfD - playerRadius * 0.72;
        const maxZ = p.center.z + p.halfD + playerRadius * 0.72;
        const topY = p.center.y + p.halfH;
        const botY = p.center.y - p.halfH;

        if (playerPos.x >= minX && playerPos.x <= maxX && playerPos.z >= minZ && playerPos.z <= maxZ) {
          // Track surface beneath player for contact shadow
          if (topY <= playerPos.y + 0.35 && topY > highestShadowY) {
            highestShadowY = topY;
          }

          // Vertical landing on top surface
          const feetCrossedTop = prevY >= topY - 0.45 && playerPos.y <= topY + 0.14;
          const overlappingVert = playerPos.y < topY && playerPos.y + playerHeight > botY;

          if (p.kind === 'lava' && (feetCrossedTop || overlappingVert)) {
            respawnPlayer(false, true);
            showToast('Oof! Watch out for neon lava!');
            break;
          }

          if (p.kind === 'bounce' && feetCrossedTop && playerVel.y <= 0.5) {
            playerPos.y = topY;
            playerVel.y = p.bounceVelocity ?? 26;
            onGround = false;
            robloxAudio.playBounce();
            continue;
          }

          if (playerVel.y <= 0 && feetCrossedTop) {
            playerPos.y = topY;
            if (!wasOnGround && playerVel.y < -10) {
              playerRig.landingSquash = Math.min(1, Math.abs(playerVel.y) / 28);
            }
            playerVel.y = 0;
            onGround = true;
            ridingPlatform = p;

            if (p.kind === 'checkpoint' && p.stageIndex !== undefined) {
              const cp = world.checkpoints.find((c) => c.stage === p.stageIndex);
              if (cp && !cp.activated) {
                cp.activated = true;
                (cp.beaconMesh.material as THREE.MeshStandardMaterial).color.set('#22C55E');
                (cp.beaconMesh.material as THREE.MeshStandardMaterial).emissive.set('#16A34A');
                activeCheckpointPos.copy(cp.spawnPos);
                if (p.stageIndex > bestStage) {
                  bestStage = p.stageIndex;
                  setCurrentStage(bestStage);
                }
                robloxAudio.playCheckpoint();
                showToast(`Checkpoint Stage ${p.stageIndex} / ${TOTAL_STAGES} Reached!`);
              } else if (cp) {
                activeCheckpointPos.copy(cp.spawnPos);
              }
            }

            if (p.kind === 'finish' && !obbyWon) {
              obbyWon = true;
              const secs = Math.round((now - obbyStartMs) / 100) / 10;
              setVictoryElapsed(secs);
              setCurrentStage(TOTAL_STAGES);
              activeEmoteRef.current = 'CHEER';
              setActiveEmote('CHEER');
              robloxAudio.playVictory();
              showToast(`OBBY TOWER COMPLETE in ${secs}s!`, 5000);
            }
          } else if (overlappingVert && !onTruss) {
            // Side wall push-out
            const dxLeft = playerPos.x - minX;
            const dxRight = maxX - playerPos.x;
            const dzBack = playerPos.z - minZ;
            const dzFront = maxZ - playerPos.z;
            const minPen = Math.min(dxLeft, dxRight, dzBack, dzFront);
            if (minPen < 0.75) {
              if (minPen === dxLeft) {
                playerPos.x = minX;
                playerVel.x = Math.min(0, playerVel.x);
              } else if (minPen === dxRight) {
                playerPos.x = maxX;
                playerVel.x = Math.max(0, playerVel.x);
              } else if (minPen === dzBack) {
                playerPos.z = minZ;
                playerVel.z = Math.min(0, playerVel.z);
              } else {
                playerPos.z = maxZ;
                playerVel.z = Math.max(0, playerVel.z);
              }
            }
          }
        }
      }

      // Carry player smoothly on moving platforms
      if (ridingPlatform) {
        playerPos.add(ridingPlatform.delta);
      }

      // Check Spinning Sweeper Beam Collisions
      for (const sw of world.sweepers) {
        if (Math.abs(playerPos.y + 0.9 - sw.center.y) < 1.1) {
          const ang = sw.pivot.rotation.y;
          const dirX = Math.cos(ang);
          const dirZ = -Math.sin(ang);
          const relX = playerPos.x - sw.center.x;
          const relZ = playerPos.z - sw.center.z;
          const proj = THREE.MathUtils.clamp(relX * dirX + relZ * dirZ, -sw.armLength, sw.armLength);
          const closestX = dirX * proj;
          const closestZ = dirZ * proj;
          const distSq = (relX - closestX) ** 2 + (relZ - closestZ) ** 2;
          if (distSq < (playerRadius + sw.radius * 0.7) ** 2) {
            respawnPlayer(false, true);
            showToast('Oof! Sweeper beam knocked you off!');
            break;
          }
        }
      }

      // Check Collectible Coins
      for (const c of world.coins) {
        if (!c.collected) {
          const dx = playerPos.x - c.position.x;
          const dy = playerPos.y + 1.4 - c.position.y;
          const dz = playerPos.z - c.position.z;
          if (dx * dx + dy * dy + dz * dz < 2.25) {
            c.collected = true;
            c.mesh.visible = false;
            coinCount += 1;
            setCoinsCollected(coinCount);
            robloxAudio.playCoin();
          }
        }
      }

      // Void Respawn Check
      if (playerPos.y < -14) {
        respawnPlayer(false, true);
        showToast('Oof! Fell into the void — respawned!');
      }

      // 4. Sync Avatar Transform, Procedural R15 Animation & Footsteps
      playerRig.root.position.copy(playerPos);
      playerRig.root.rotation.y = playerYaw;

      const horizSpeed = Math.hypot(playerVel.x, playerVel.z);
      let animState: RobloxAnimState = 'IDLE';
      if (onTruss && !onGround) {
        animState = 'CLIMB';
      } else if (!onGround) {
        animState = playerVel.y > 0.8 ? 'JUMP' : 'FALL';
      } else if (horizSpeed > 1.2) {
        animState = isSprinting && horizSpeed > 11.5 ? 'RUN' : 'WALK';
        footstepTimer -= dt;
        if (footstepTimer <= 0) {
          robloxAudio.playFootstep(animState === 'RUN');
          footstepTimer = animState === 'RUN' ? 0.25 : 0.38;
        }
      } else if (activeEmoteRef.current) {
        animState = activeEmoteRef.current;
      }

      animateRobloxRig(playerRig, animState, dt, elapsed, horizSpeed / 11);

      // Update Contact Shadow directly beneath player
      if (highestShadowY > -40) {
        contactShadow.visible = true;
        contactShadow.position.set(playerPos.x, highestShadowY + 0.03, playerPos.z);
        const heightAbove = Math.max(0, playerPos.y - highestShadowY);
        const shadowScale = Math.max(0.35, 1 - heightAbove * 0.12);
        contactShadow.scale.setScalar(shadowScale);
      } else {
        contactShadow.visible = false;
      }

      // Keep shadow frustum centered near player
      sunLight.position.set(playerPos.x + 28, playerPos.y + 46, playerPos.z + 24);
      sunLight.target.position.copy(playerPos);

      // 5. Smooth 3rd-Person Orbit Camera Follow
      _camTarget.set(playerPos.x, playerPos.y + 2.35, playerPos.z);
      const horizDist = Math.cos(camPitch) * camDist;
      const vertOffset = Math.sin(camPitch) * camDist;
      _camDesired.set(
        _camTarget.x - Math.sin(camYaw) * horizDist,
        Math.max(highestShadowY + 0.7, _camTarget.y + vertOffset),
        _camTarget.z - Math.cos(camYaw) * horizDist,
      );
      camera.position.lerp(_camDesired, 1 - Math.exp(-16 * dt));
      camera.lookAt(_camTarget);

      // First-person fade if zoomed super close
      playerRig.head.visible = camDist > 3.1;

      renderer.render(scene, camera);
      afterDraw(tick);
    };

    afterDraw(tick);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvasEl.removeEventListener('wheel', onWheel);
      canvasEl.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('resize', onResize);

      unsubOllama();
      ollamaCtrl.dispose();
      ollamaCtrlRef.current = null;
      envTarget.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (canvasEl.parentNode === container) {
        container.removeChild(canvasEl);
      }
    };
  }, []);

  const triggerEmote = (emote: RobloxAnimState) => {
    const next = activeEmote === emote ? null : emote;
    activeEmoteRef.current = next;
    setActiveEmote(next);
    if (next) robloxAudio.playEmoteChime();
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    robloxAudio.setMuted(next);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-sky-900 select-none font-sans">
      {/* Three.js WebGL Viewport Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top HUD Bar (Clean opaque-backed cards, zero backdrop-filter over WebGL) */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={onExitToStation}
            className="px-3 py-2 bg-[#0F172A] hover:bg-[#1E293B] border border-slate-600 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-sky-400" />
            STATION
          </button>

          <div className="px-3.5 py-1.5 bg-[#0F172A] border border-slate-600 shadow-lg flex items-center gap-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-sky-400">
                BLOXVERSE 3D
              </div>
              <div className="text-sm font-black italic tracking-wide text-white">
                {avatarConfig.name}
              </div>
            </div>
          </div>
        </div>

        {/* Live Progress Chips & AI Character Control Toggle */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              const next = !aiControlEnabled;
              aiControlRef.current = next;
              setAiControlEnabled(next);
              if (next) {
                setAiPilotLabel('STARTING');
                aiCommandTriggerRef.current?.('Explore and beat the obby');
                showToast('AI Control ON — Ollama is steering your character! (WASD overrides anytime)');
              } else {
                setAiPilotLabel('OFF');
                showToast('AI Control OFF — Manual control active');
              }
            }}
            className={`px-3 py-1.5 border text-xs font-mono font-bold uppercase flex items-center gap-1.5 shadow-lg cursor-pointer transition-colors ${
              aiControlEnabled
                ? 'bg-emerald-500 hover:bg-emerald-400 border-emerald-300 text-slate-950'
                : 'bg-[#0F172A] hover:bg-[#1E293B] border-slate-600 text-slate-200'
            }`}
            title="Let your Ollama model pilot your character"
          >
            <Bot className="w-4 h-4" />
            {aiControlEnabled ? `AI Pilot: ${aiPilotLabel}` : 'AI Pilot: OFF'}
          </button>

          <div className="px-3 py-1.5 bg-[#0F172A] border border-slate-600 shadow-lg flex items-center gap-2">
            <Flag className="w-4 h-4 text-emerald-400" />
            <div className="text-xs font-mono font-bold text-white">
              STAGE {currentStage}/{TOTAL_STAGES}
            </div>
          </div>

          <div className="px-3 py-1.5 bg-[#0F172A] border border-slate-600 shadow-lg flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <div className="text-xs font-mono font-bold text-amber-300">
              {coinsCollected}/{totalCoins}
            </div>
          </div>

          <button
            type="button"
            onClick={toggleMute}
            className="p-2 bg-[#0F172A] hover:bg-[#1E293B] border border-slate-600 text-white shadow-lg cursor-pointer"
            title={muted ? 'Unmute SFX' : 'Mute SFX'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
          </button>
        </div>
      </div>

      {/* Subtle Floating Toast Feedback */}
      {toastMsg && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 bg-[#0F172A] border border-sky-400/70 text-white text-xs font-mono font-bold tracking-wide shadow-xl pointer-events-none">
          {toastMsg}
        </div>
      )}

      {/* Victory Banner */}
      {victoryElapsed !== null && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-20 px-6 py-4 bg-[#0F172A] border-2 border-amber-400 shadow-2xl text-center">
          <div className="flex items-center justify-center gap-2 text-amber-400 font-black italic text-xl">
            <Trophy className="w-6 h-6" />
            OBBY TOWER CONQUERED!
          </div>
          <div className="text-xs font-mono text-slate-200 mt-1">
            TIME: {victoryElapsed}s · COINS COLLECTED: {coinsCollected}/{totalCoins}
          </div>
          <div className="mt-3 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setVictoryElapsed(null);
                respawnTriggerRef.current = 'spawn';
              }}
              className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase cursor-pointer"
            >
              Return to Plaza
            </button>
            <button
              type="button"
              onClick={() => setVictoryElapsed(null)}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs uppercase cursor-pointer"
            >
              Keep Exploring
            </button>
          </div>
        </div>
      )}

      {/* Collapsible Bottom Dock (Emotes, Avatar Customizer, Teleport Controls) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[min(94vw,680px)] pointer-events-auto">
        <div className="bg-[#0F172A] border border-slate-600 shadow-2xl">
          {/* Dock Header & Tabs */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-700">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'EMOTES', label: 'Emotes', icon: Sparkles },
                  { id: 'AI_BOTS', label: 'AI (Ollama)', icon: Bot },
                  { id: 'AVATAR', label: 'Avatar', icon: Shirt },
                  { id: 'WORLD', label: 'Controls', icon: Crown },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setDockTab(id);
                    setDockOpen(true);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-mono font-bold uppercase flex items-center gap-1 cursor-pointer transition-colors ${
                    dockTab === id && dockOpen
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-300 max-w-[210px] truncate">
                Ollama:{' '}
                <span
                  className={
                    ollamaStatus.state === 'ready'
                      ? 'text-emerald-400 font-bold'
                      : ollamaStatus.state === 'error'
                        ? 'text-amber-400 font-bold'
                        : 'text-sky-400 font-bold'
                  }
                >
                  {ollamaStatus.state === 'ready'
                    ? `${ollamaStatus.mode === 'local-file' ? 'File' : 'API'} · ${ollamaStatus.activeModel ?? 'Ready'}`
                    : ollamaStatus.state === 'loading'
                      ? `Loading ${ollamaStatus.progressPct}%`
                      : ollamaStatus.state === 'error'
                        ? 'Not Connected'
                        : 'Pick File / Connect'}
                </span>
              </span>

              <button
                type="button"
                onClick={() => setDockOpen((v) => !v)}
                className="p-1 text-slate-300 hover:text-white cursor-pointer"
                title={dockOpen ? 'Collapse Dock' : 'Expand Dock'}
              >
                {dockOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {dockOpen && (
            <div className="p-2.5">
              {dockTab === 'EMOTES' && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { state: 'WAVE', label: '[1] Wave' },
                        { state: 'DANCE', label: '[2] Dance' },
                        { state: 'CHEER', label: '[3] Cheer' },
                        { state: 'SIT', label: '[4] Sit' },
                      ] as const
                    ).map((em) => (
                      <button
                        key={em.state}
                        type="button"
                        onClick={() => triggerEmote(em.state)}
                        className={`px-3 py-1.5 text-xs font-mono font-bold cursor-pointer border ${
                          activeEmote === em.state
                            ? 'bg-amber-400 text-slate-950 border-amber-300'
                            : 'bg-slate-800 text-white border-slate-600 hover:bg-slate-700'
                        }`}
                      >
                        {em.label}
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    WASD Move · Shift Run · Space Jump · Drag Orbit
                  </div>
                </div>
              )}

              {dockTab === 'AI_BOTS' && (
                <div className="space-y-2">
                  {/* Hidden file request inputs for ~/.ollama/models folder or blob/GGUF file */}
                  <input
                    ref={dirInputRef}
                    type="file"
                    multiple
                    {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        void ollamaCtrlRef.current?.loadFromFiles(files);
                      }
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        void ollamaCtrlRef.current?.loadFromFiles(files);
                      }
                      e.target.value = '';
                    }}
                  />

                  {/* Ollama File Request & Localhost API Connection Controls */}
                  <div className="flex flex-wrap items-center gap-1.5 pb-1.5 border-b border-slate-700">
                    <button
                      type="button"
                      onClick={() => dirInputRef.current?.click()}
                      className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-mono font-bold uppercase flex items-center gap-1 cursor-pointer"
                      title="Select your ~/.ollama/models folder to load local Ollama models directly"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      .ollama/models Folder
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-[11px] font-mono font-bold uppercase flex items-center gap-1 cursor-pointer"
                      title="Select a single Ollama blob (sha256-*) or .gguf file"
                    >
                      <FileUp className="w-3.5 h-3.5 text-sky-400" />
                      Pick Blob / GGUF
                    </button>

                    <div className="flex items-center gap-1 flex-1 min-w-[200px]">
                      <input
                        type="text"
                        value={ollamaUrlInput}
                        onChange={(e) => setOllamaUrlInput(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="http://localhost:11434"
                        className="flex-1 min-w-0 px-2 py-1 bg-slate-900 border border-slate-600 text-[11px] font-mono text-white focus:outline-none focus:border-sky-400"
                      />
                      <button
                        type="button"
                        onClick={() => void ollamaCtrlRef.current?.connectOllamaApi(ollamaUrlInput, false)}
                        className="px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 text-[11px] font-mono font-bold uppercase flex items-center gap-1 cursor-pointer"
                      >
                        <Plug className="w-3 h-3" />
                        Connect
                      </button>
                    </div>
                  </div>

                  {/* Discovered Ollama Models Selector */}
                  {ollamaStatus.models.length > 0 && (
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span className="text-slate-400 uppercase shrink-0">MODEL:</span>
                      <select
                        value={
                          ollamaStatus.models.find((m) =>
                            ollamaStatus.mode === 'ollama-api'
                              ? m.id === `api:${ollamaStatus.activeModel}`
                              : m.label === ollamaStatus.activeModel,
                          )?.id ?? ollamaStatus.models[0].id
                        }
                        onChange={(e) => void ollamaCtrlRef.current?.selectModel(e.target.value)}
                        className="flex-1 px-2 py-1 bg-slate-900 border border-slate-600 text-emerald-300 font-mono text-[11px] focus:outline-none focus:border-sky-400"
                      >
                        {ollamaStatus.models.map((m) => (
                          <option key={m.id} value={m.id}>
                            [{m.mode === 'local-file' ? 'FILE' : 'API'}] {m.label}
                          </option>
                        ))}
                      </select>
                      {ollamaStatus.modelKind && (
                        <span
                          className={`px-2 py-0.5 border text-[10px] font-bold uppercase shrink-0 ${
                            ollamaStatus.modelKind === 'instruct'
                              ? 'bg-emerald-950 border-emerald-500/70 text-emerald-300'
                              : 'bg-sky-950 border-sky-500/70 text-sky-300'
                          }`}
                          title={
                            ollamaStatus.modelKind === 'instruct'
                              ? 'Chat template detected (Instruct mode)'
                              : 'Few-shot completion fallback (Base model)'
                          }
                        >
                          {ollamaStatus.modelKind === 'instruct' ? 'Instruct' : 'Base'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* AI Character Control Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 px-2 py-1.5 bg-slate-900/90 border border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !aiControlEnabled;
                        aiControlRef.current = next;
                        setAiControlEnabled(next);
                        if (next) {
                          setAiPilotLabel('STARTING');
                          aiCommandTriggerRef.current?.('Explore and beat the obby');
                          showToast('AI Control ON — steering your character!');
                        } else {
                          setAiPilotLabel('OFF');
                          showToast('AI Control OFF');
                        }
                      }}
                      className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase flex items-center gap-1 cursor-pointer border ${
                        aiControlEnabled
                          ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                          : 'bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700'
                      }`}
                    >
                      <Bot className="w-3 h-3" />
                      {aiControlEnabled ? `Controlling (${aiPilotLabel})` : 'Control My Character'}
                    </button>

                    <div className="flex flex-wrap items-center gap-1">
                      {[
                        { label: 'Beat Obby', goal: 'Go climb and beat the Sky Obby!' },
                        { label: 'Hunt Coins', goal: 'Collect the nearest gold Blox Coin!' },
                        { label: 'Follow Bot', goal: 'Follow the nearest AI player bot!' },
                        { label: 'Dance', goal: 'Stop and do a celebration dance!' },
                      ].map((cmd) => (
                        <button
                          key={cmd.label}
                          type="button"
                          onClick={() => {
                            aiCommandTriggerRef.current?.(cmd.goal);
                            showToast(`AI Command: ${cmd.label}`);
                          }}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-sky-300 text-[10px] font-mono font-bold uppercase cursor-pointer"
                        >
                          {cmd.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {ollamaStatus.state === 'loading' && (
                    <div className="px-2 py-1 bg-sky-950/70 border border-sky-500/60 text-sky-200 text-[10px] font-mono flex items-center justify-between gap-2">
                      <span>{ollamaStatus.loadingStep ?? 'Initializing Ollama model...'}</span>
                      <span className="font-bold">{ollamaStatus.progressPct}%</span>
                    </div>
                  )}

                  {ollamaStatus.errorMsg && (
                    <div className="px-2 py-1 bg-amber-950/60 border border-amber-500/60 text-amber-200 text-[10px] font-mono">
                      {ollamaStatus.errorMsg}
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {botRoster.map((bot) => (
                      <div
                        key={bot.id}
                        className="px-2 py-1.5 bg-slate-900 border border-slate-700 text-[10px] font-mono"
                      >
                        <div className="flex items-center justify-between text-sky-400 font-bold">
                          <span>{bot.name}</span>
                          <span className="text-emerald-400">{bot.directive}</span>
                        </div>
                        <div className="text-slate-300 break-words leading-snug mt-0.5">{bot.speech}</div>
                      </div>
                    ))}
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const cleaned = chatInput.trim();
                      if (!cleaned) return;
                      if (aiControlRef.current) {
                        aiCommandTriggerRef.current?.(cleaned);
                      }
                      chatToBotsRef.current?.(cleaned);
                      setChatInput('');
                      showToast(
                        aiControlRef.current
                          ? `Commanded AI Pilot & Bots: "${cleaned}"`
                          : `Sent "${cleaned}" to Ollama AI Players`,
                      );
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder={
                        aiControlEnabled
                          ? 'Command AI Pilot or chat with bots (e.g. Jump onto Stage 2!)'
                          : 'Chat with Ollama AI Players (or enable Control My Character)'
                      }
                      className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-600 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-mono font-bold uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send
                    </button>
                  </form>
                </div>
              )}

              {dockTab === 'AVATAR' && (
                <div className="space-y-2">
                  {/* Presets & Accessories */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase mr-1">PRESET:</span>
                    {Object.entries(AVATAR_PRESETS).map(([key, preset]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAvatarConfig({ ...preset })}
                        className={`px-2 py-1 text-[11px] font-mono font-bold border cursor-pointer ${
                          avatarConfig.name === preset.name
                            ? 'bg-sky-500 text-slate-950 border-sky-300'
                            : 'bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700'
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>

                  {/* Shirt Colors + Hats + Faces */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">SHIRT:</span>
                      {['#2563EB', '#EF4444', '#16A34A', '#9333EA', '#EC4899', '#F59E0B', '#334155'].map(
                        (hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => setAvatarConfig((prev) => ({ ...prev, shirtColor: hex }))}
                            className={`w-5 h-5 border-2 cursor-pointer ${
                              avatarConfig.shirtColor === hex ? 'border-white scale-110' : 'border-slate-600'
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        ),
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono text-slate-400 uppercase mr-1">HAT:</span>
                      {(['none', 'cap', 'crown', 'headphones', 'visor'] as RobloxAccessory[]).map((acc) => (
                        <button
                          key={acc}
                          type="button"
                          onClick={() => setAvatarConfig((prev) => ({ ...prev, accessory: acc }))}
                          className={`px-2 py-0.5 text-[10px] font-mono uppercase border cursor-pointer ${
                            avatarConfig.accessory === acc
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                              : 'bg-slate-800 text-slate-300 border-slate-600'
                          }`}
                        >
                          {acc}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono text-slate-400 uppercase mr-1">FACE:</span>
                      {(['classic', 'happy', 'cool', 'robot'] as RobloxFaceStyle[]).map((face) => (
                        <button
                          key={face}
                          type="button"
                          onClick={() => setAvatarConfig((prev) => ({ ...prev, faceStyle: face }))}
                          className={`px-2 py-0.5 text-[10px] font-mono uppercase border cursor-pointer ${
                            avatarConfig.faceStyle === face
                              ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-bold'
                              : 'bg-slate-800 text-slate-300 border-slate-600'
                          }`}
                        >
                          {face}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {dockTab === 'WORLD' && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        respawnTriggerRef.current = 'checkpoint';
                      }}
                      className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      [R] Checkpoint
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        respawnTriggerRef.current = 'spawn';
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-mono font-bold uppercase cursor-pointer"
                    >
                      Back to Spawn Plaza
                    </button>
                  </div>
                  <div className="text-[11px] font-mono text-slate-300">
                    Scroll to Zoom (down to 1st-person) · Climb Orange Trusses
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
