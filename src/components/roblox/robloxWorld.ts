import * as THREE from 'three';
import {
  createCheckerTexture,
  createSpawnPadTexture,
  createStudTexture,
} from './robloxTextures';
import {
  AVATAR_PRESETS,
  createRobloxAvatar,
  RobloxAnimState,
  RobloxAvatarRig,
} from './robloxAvatar';
import {
  AiBotDirective,
  BotBillboard,
  createBotBillboard,
} from './ollamaAiService';

export interface PlatformCollider {
  id: string;
  mesh: THREE.Object3D;
  halfW: number;
  halfH: number;
  halfD: number;
  center: THREE.Vector3; // cached world position updated each frame
  delta: THREE.Vector3;  // per-frame displacement for moving platforms
  kind: 'solid' | 'lava' | 'bounce' | 'checkpoint' | 'finish';
  stageIndex?: number;
  bounceVelocity?: number;
  moveAxis?: 'x' | 'y' | 'z';
  moveOrigin?: THREE.Vector3;
  moveAmp?: number;
  moveSpeed?: number;
  movePhase?: number;
}

export interface TrussCollider {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface SweeperHazard {
  pivot: THREE.Group;
  center: THREE.Vector3;
  armLength: number;
  radius: number;
  speed: number;
  phase: number;
}

export interface BloxCoinItem {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  collected: boolean;
  baseY: number;
  phase: number;
}

export interface CheckpointFlag {
  stage: number;
  padMesh: THREE.Mesh;
  beaconMesh: THREE.Mesh;
  spawnPos: THREE.Vector3;
  activated: boolean;
}

export interface NpcActor {
  id: string;
  name: string;
  rig: RobloxAvatarRig;
  anim: RobloxAnimState;
  directive: AiBotDirective;
  speech: string;
  billboard: BotBillboard;
  baseY: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;
  onGround: boolean;
  waypoints: THREE.Vector3[];
  waypointIdx: number;
  nextThinkAt: number;
  jumpCooldown: number;
  phase: number;
  pinnedAtPodium?: boolean;
}

export interface RobloxWorldHandle {
  worldGroup: THREE.Group;
  platforms: PlatformCollider[];
  trusses: TrussCollider[];
  sweepers: SweeperHazard[];
  coins: BloxCoinItem[];
  checkpoints: CheckpointFlag[];
  npcs: NpcActor[];
  fountainDroplets: THREE.Mesh[];
  clouds: THREE.Group[];
  trophyCrown: THREE.Group;
  spawnPosition: THREE.Vector3;
}

function addStudPart(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  colorHex: string,
  maxAniso: number,
  roughness = 0.46,
  metalness = 0.06,
  emissive?: string,
  emissiveIntensity = 0,
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const topTex = createStudTexture(colorHex, Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(d / 2)), maxAniso);
  const sideMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness,
    metalness,
    emissive: emissive ?? '#000000',
    emissiveIntensity,
  });
  const topMat = new THREE.MeshStandardMaterial({
    map: topTex,
    roughness: Math.max(0.2, roughness - 0.06),
    metalness,
    emissive: emissive ?? '#000000',
    emissiveIntensity,
  });

  const mesh = new THREE.Mesh(geo, [
    sideMat,
    sideMat,
    topMat,
    sideMat,
    sideMat,
    sideMat,
  ]);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildBlockyTree(x: number, y: number, z: number, scale: number, maxAniso: number): THREE.Group {
  const tree = new THREE.Group();
  tree.position.set(x, y, z);

  // Trunk with roots flare
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#78350F', roughness: 0.85, metalness: 0.02 });
  const trunkBase = new THREE.Mesh(new THREE.BoxGeometry(1.3 * scale, 0.7 * scale, 1.3 * scale), trunkMat);
  trunkBase.position.y = 0.35 * scale;
  trunkBase.castShadow = true;
  trunkBase.receiveShadow = true;
  tree.add(trunkBase);

  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.95 * scale, 3.6 * scale, 0.95 * scale), trunkMat);
  trunk.position.y = 2.15 * scale;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  tree.add(trunk);

  // Three tiered leafy stud canopies
  const leafColors = ['#15803D', '#16A34A', '#22C55E'];
  const sizes = [
    { w: 3.6, h: 1.5, y: 4.1 },
    { w: 2.7, h: 1.4, y: 5.3 },
    { w: 1.65, h: 1.2, y: 6.3 },
  ];
  sizes.forEach((s, idx) => {
    addStudPart(
      tree,
      s.w * scale,
      s.h * scale,
      s.w * scale,
      0,
      s.y * scale,
      0,
      leafColors[idx],
      maxAniso,
      0.72,
      0.02,
    );
  });

  return tree;
}

function buildLampPost(x: number, y: number, z: number): THREE.Group {
  const lamp = new THREE.Group();
  lamp.position.set(x, y, z);

  const poleMat = new THREE.MeshStandardMaterial({ color: '#1E293B', metalness: 0.75, roughness: 0.32 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: '#FEF08A',
    emissive: '#FACC15',
    emissiveIntensity: 0.85,
    roughness: 0.2,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.9), poleMat);
  base.position.y = 0.25;
  base.castShadow = true;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 4.6, 8), poleMat);
  shaft.position.y = 2.8;
  shaft.castShadow = true;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.16), poleMat);
  arm.position.set(0.45, 5.05, 0);
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 0.48), bulbMat);
  lantern.position.set(0.92, 4.72, 0);

  lamp.add(base, shaft, arm, lantern);
  return lamp;
}

function buildBloxShop(x: number, y: number, z: number, maxAniso: number): THREE.Group {
  const shop = new THREE.Group();
  shop.position.set(x, y, z);

  // Foundation slab
  addStudPart(shop, 10, 0.5, 8, 0, 0.25, 0, '#94A3B8', maxAniso, 0.65);
  // Walls
  addStudPart(shop, 9, 4.5, 7, 0, 2.75, 0, '#FEF3C7', maxAniso, 0.6);
  // Window glass & sign board
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#7DD3FC',
    metalness: 0.35,
    roughness: 0.14,
  });
  const winL = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 0.18), glassMat);
  winL.position.set(-2.5, 2.5, 3.52);
  const winR = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 0.18), glassMat);
  winR.position.set(2.5, 2.5, 3.52);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 2.9, 0.18),
    new THREE.MeshStandardMaterial({ color: '#92400E', roughness: 0.72 }),
  );
  door.position.set(0, 1.95, 3.52);
  shop.add(winL, winR, door);

  // Red/white striped awning overhang
  for (let i = -4; i <= 4; i++) {
    addStudPart(
      shop,
      1.05,
      0.35,
      1.8,
      i * 1.05,
      4.15,
      4.2,
      i % 2 === 0 ? '#EF4444' : '#F8FAFC',
      maxAniso,
      0.45,
    );
  }
  // Pitched stud roof
  addStudPart(shop, 10.2, 0.7, 8.2, 0, 5.35, 0, '#DC2626', maxAniso, 0.45);
  addStudPart(shop, 8.2, 0.8, 6.2, 0, 6.1, 0, '#B91C1C', maxAniso, 0.45);

  return shop;
}

function buildCoin(x: number, y: number, z: number, id: string, phase: number): BloxCoinItem {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const goldMat = new THREE.MeshStandardMaterial({
    color: '#FBBF24',
    metalness: 0.85,
    roughness: 0.18,
    emissive: '#D97706',
    emissiveIntensity: 0.25,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: '#FEF08A',
    metalness: 0.7,
    roughness: 0.2,
  });

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.18, 16), goldMat);
  disc.rotation.x = Math.PI / 2;
  disc.castShadow = true;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.08, 8, 16), rimMat);
  const centerGem = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.24), rimMat);
  group.add(disc, ring, centerGem);

  return {
    id,
    mesh: group,
    position: new THREE.Vector3(x, y, z),
    collected: false,
    baseY: y,
    phase,
  };
}

export function buildRobloxWorld(maxAniso = 4): RobloxWorldHandle {
  const worldGroup = new THREE.Group();
  const platforms: PlatformCollider[] = [];
  const trusses: TrussCollider[] = [];
  const sweepers: SweeperHazard[] = [];
  const coins: BloxCoinItem[] = [];
  const checkpoints: CheckpointFlag[] = [];
  const npcs: NpcActor[] = [];
  const fountainDroplets: THREE.Mesh[] = [];
  const clouds: THREE.Group[] = [];

  const registerPlatform = (
    id: string,
    mesh: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    kind: PlatformCollider['kind'],
    extra: Partial<PlatformCollider> = {},
  ) => {
    const pos = new THREE.Vector3();
    mesh.getWorldPosition(pos);
    platforms.push({
      id,
      mesh,
      halfW: w * 0.5,
      halfH: h * 0.5,
      halfD: d * 0.5,
      center: pos,
      delta: new THREE.Vector3(),
      kind,
      ...extra,
    });
  };

  // --- 1. PLAZA GRASS BASEPLATE (y = -1..0, top surface at y = 0) ---
  const baseplate = addStudPart(worldGroup, 64, 1.5, 58, 0, -0.75, -2, '#22C55E', maxAniso, 0.68, 0.02);
  registerPlatform('plaza_baseplate', baseplate, 64, 1.5, 58, 'solid');

  // Stone Cobble Walkways leading toward Fountain & Obby Start
  const walkway1 = addStudPart(worldGroup, 6, 0.18, 34, 0, 0.09, -4, '#CBD5E1', maxAniso, 0.55);
  registerPlatform('walkway_main', walkway1, 6, 0.18, 34, 'solid');

  const walkwayCross = addStudPart(worldGroup, 26, 0.18, 5, 0, 0.09, 2, '#CBD5E1', maxAniso, 0.55);
  registerPlatform('walkway_cross', walkwayCross, 26, 0.18, 5, 'solid');

  // Iconic Roblox Spawn Pad at (0, 0.25, 11)
  const spawnMat = new THREE.MeshStandardMaterial({
    map: createSpawnPadTexture(maxAniso),
    roughness: 0.35,
    metalness: 0.15,
  });
  const spawnSide = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.45 });
  const spawnPad = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.35, 5),
    [spawnSide, spawnSide, spawnMat, spawnSide, spawnSide, spawnSide],
  );
  spawnPad.position.set(0, 0.175, 11);
  spawnPad.receiveShadow = true;
  worldGroup.add(spawnPad);
  registerPlatform('spawn_pad', spawnPad, 5, 0.35, 5, 'solid');

  // Center Plaza Fountain at (-12, 0, 2)
  const fountainGroup = new THREE.Group();
  fountainGroup.position.set(-12, 0, 2);
  worldGroup.add(fountainGroup);

  const rimBasin = addStudPart(fountainGroup, 7.6, 0.9, 7.6, 0, 0.45, 0, '#94A3B8', maxAniso, 0.45);
  registerPlatform('fountain_basin', rimBasin, 7.6, 0.9, 7.6, 'solid');

  const waterSurface = new THREE.Mesh(
    new THREE.BoxGeometry(6.2, 0.6, 6.2),
    new THREE.MeshStandardMaterial({
      color: '#38BDF8',
      roughness: 0.12,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85,
    }),
  );
  waterSurface.position.set(0, 0.72, 0);
  fountainGroup.add(waterSurface);

  const spire = addStudPart(fountainGroup, 1.8, 2.8, 1.8, 0, 1.8, 0, '#CBD5E1', maxAniso, 0.4);
  registerPlatform('fountain_spire', spire, 1.8, 2.8, 1.8, 'solid');

  const dropletMat = new THREE.MeshStandardMaterial({
    color: '#BAE6FD',
    roughness: 0.15,
    metalness: 0.1,
  });
  for (let i = 0; i < 12; i++) {
    const drop = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), dropletMat);
    drop.position.set(-12, 3.2, 2);
    worldGroup.add(drop);
    fountainDroplets.push(drop);
  }

  // Blox Shop Building on Right Plaza (14, 0, 2)
  const shop = buildBloxShop(15, 0, 2, maxAniso);
  worldGroup.add(shop);
  // Register walkable porch/foundation & roof
  const shopBase = new THREE.Object3D();
  shopBase.position.set(15, 2.6, 2);
  worldGroup.add(shopBase);
  registerPlatform('shop_building', shopBase, 9.2, 5.2, 7.2, 'solid');

  // Trees & Lamp Posts decorating the Plaza
  const treeCoords: [number, number, number][] = [
    [-22, 0, 14],
    [-23, 0, -10],
    [-19, 0, -21],
    [22, 0, 15],
    [23, 0, -12],
    [18, 0, -22],
    [-10, 0, 18],
    [11, 0, 18],
  ];
  treeCoords.forEach(([tx, ty, tz], idx) => {
    const tree = buildBlockyTree(tx, ty, tz, idx % 2 === 0 ? 1.05 : 0.88, maxAniso);
    worldGroup.add(tree);
  });

  const lampCoords: [number, number, number][] = [
    [-4.5, 0, 8],
    [4.5, 0, 8],
    [-4.5, 0, -4],
    [4.5, 0, -4],
    [-4.5, 0, -16],
    [4.5, 0, -16],
  ];
  lampCoords.forEach(([lx, ly, lz]) => {
    worldGroup.add(buildLampPost(lx, ly, lz));
  });

  // Plaza Welcome Coins
  coins.push(buildCoin(-12, 4.4, 2, 'coin_fountain', 0.2));
  coins.push(buildCoin(15, 7.8, 2, 'coin_shop_roof', 1.4));
  coins.push(buildCoin(-4.5, 1.5, 11, 'coin_plaza_1', 2.1));
  coins.push(buildCoin(4.5, 1.5, 11, 'coin_plaza_2', 2.8));

  // Decorative Outer Distant Islands & Sky Clouds
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.9, metalness: 0 });
  const cloudPositions: [number, number, number, number][] = [
    [-35, 36, -30, 1.4],
    [32, 42, -55, 1.7],
    [-28, 46, -95, 1.5],
    [38, 38, -135, 1.6],
    [0, 52, -165, 2.0],
  ];
  cloudPositions.forEach(([cx, cy, cz, sc]) => {
    const cl = new THREE.Group();
    cl.position.set(cx, cy, cz);
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(8 * sc, 2.2 * sc, 4.5 * sc), cloudMat);
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(4.5 * sc, 2.0 * sc, 3.6 * sc), cloudMat);
    b2.position.set(1.2 * sc, 1.5 * sc, 0);
    cl.add(b1, b2);
    worldGroup.add(cl);
    clouds.push(cl);
  });

  // Autonomous Ollama AI Players across Blox Plaza & Obby Entry
  const aiSpecs: {
    id: string;
    name: string;
    preset: keyof typeof AVATAR_PRESETS;
    pos: [number, number, number];
    rotY: number;
    directive: AiBotDirective;
    speech: string;
    waypoints: THREE.Vector3[];
  }[] = [
    {
      id: 'ai_obbyking',
      name: 'ObbyKing',
      preset: 'royalty',
      pos: [-4.2, 0.09, 6.2],
      rotY: 0.6,
      directive: 'WAVE',
      speech: 'Welcome to Blox Plaza!',
      waypoints: [
        new THREE.Vector3(-4.2, 0.1, 6.2),
        new THREE.Vector3(0, 0.1, 3),
        new THREE.Vector3(4.5, 0.1, -3),
        new THREE.Vector3(-3, 0.1, -10),
      ],
    },
    {
      id: 'ai_neondj',
      name: 'NeonDJ',
      preset: 'dj',
      pos: [4.6, 0.09, 6.4],
      rotY: -0.55,
      directive: 'DANCE',
      speech: 'Fountain beats active!',
      waypoints: [
        new THREE.Vector3(4.6, 0.1, 6.4),
        new THREE.Vector3(8, 0.1, 2),
        new THREE.Vector3(12, 0.1, 6),
        new THREE.Vector3(2, 0.1, 8),
      ],
    },
    {
      id: 'ai_cyberknight',
      name: 'CyberKnight',
      preset: 'knight',
      pos: [-12, 0.09, 8.2],
      rotY: 0,
      directive: 'PATROL',
      speech: 'Patrolling Fountain Sector',
      waypoints: [
        new THREE.Vector3(-12, 0.1, 8.2),
        new THREE.Vector3(-17, 0.1, 2),
        new THREE.Vector3(-12, 0.1, -4.5),
        new THREE.Vector3(-6.5, 0.1, 2),
      ],
    },
    {
      id: 'ai_bloxracer',
      name: 'BloxRacer',
      preset: 'noob',
      pos: [0, 0.18, -14],
      rotY: Math.PI,
      directive: 'RACE_OBBY',
      speech: 'Racing to Stage 1!',
      waypoints: [
        new THREE.Vector3(0, 0.2, -16),
        new THREE.Vector3(0, 0.2, -26),
        new THREE.Vector3(0, 1.0, -32.5),
        new THREE.Vector3(0, 1.8, -37.5),
        new THREE.Vector3(0, 2.25, -44),
        new THREE.Vector3(-1.8, 2.6, -50.5),
        new THREE.Vector3(1.8, 2.9, -54.5),
        new THREE.Vector3(0, 0.2, -18),
      ],
    },
  ];
  aiSpecs.forEach((spec, idx) => {
    const rig = createRobloxAvatar(AVATAR_PRESETS[spec.preset], maxAniso);
    rig.root.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
    rig.root.rotation.y = spec.rotY;
    const billboard = createBotBillboard(spec.name, spec.directive, spec.speech, false);
    rig.root.add(billboard.sprite);
    worldGroup.add(rig.root);
    npcs.push({
      id: spec.id,
      name: spec.name,
      rig,
      anim: spec.directive === 'DANCE' ? 'DANCE' : spec.directive === 'WAVE' ? 'WAVE' : 'WALK',
      directive: spec.directive,
      speech: spec.speech,
      billboard,
      baseY: spec.pos[1],
      position: new THREE.Vector3(spec.pos[0], spec.pos[1], spec.pos[2]),
      velocity: new THREE.Vector3(),
      yaw: spec.rotY,
      onGround: true,
      waypoints: spec.waypoints,
      waypointIdx: 0,
      nextThinkAt: 1.5 + idx * 1.4,
      jumpCooldown: 0,
      phase: idx * 1.3,
    });
  });

  // Helper to create Obby Checkpoints
  const addCheckpoint = (stage: number, x: number, y: number, z: number, colorHex = '#38BDF8') => {
    const pad = addStudPart(worldGroup, 6.5, 0.9, 6.5, x, y, z, colorHex, maxAniso, 0.38, 0.12);
    registerPlatform(`cp_${stage}`, pad, 6.5, 0.9, 6.5, 'checkpoint', { stageIndex: stage });

    // Glowing Checkpoint Banner Pillar
    const poleMat = new THREE.MeshStandardMaterial({ color: '#E2E8F0', metalness: 0.65, roughness: 0.3 });
    const beaconMat = new THREE.MeshStandardMaterial({
      color: '#F59E0B',
      emissive: '#D97706',
      emissiveIntensity: 0.45,
      roughness: 0.25,
    });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.6, 8), poleMat);
    pole.position.set(x + 2.6, y + 2.25, z - 2.4);
    pole.castShadow = true;
    const beacon = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.25), beaconMat);
    beacon.position.set(x + 2.0, y + 3.55, z - 2.4);
    worldGroup.add(pole, beacon);

    checkpoints.push({
      stage,
      padMesh: pad,
      beaconMesh: beacon,
      spawnPos: new THREE.Vector3(x, y + 0.55, z),
      activated: false,
    });
  };

  // --- 2. 10-STAGE SKY OBBY TOWER COURSE (extends -Z and +Y) ---
  // Stage 1: Obby Entrance Bridge (from plaza z=-28 onward)
  const entryStair1 = addStudPart(worldGroup, 5.5, 0.8, 4.5, 0, 0.6, -32.5, '#38BDF8', maxAniso);
  registerPlatform('s1_stair1', entryStair1, 5.5, 0.8, 4.5, 'solid');
  const entryStair2 = addStudPart(worldGroup, 5.5, 0.8, 4.5, 0, 1.4, -37.5, '#0EA5E9', maxAniso);
  registerPlatform('s1_stair2', entryStair2, 5.5, 0.8, 4.5, 'solid');

  // Checkpoint 1 (Obby Start)
  addCheckpoint(1, 0, 1.8, -44, '#0284C7');

  // Stage 2: Neon Lava Stepping Stones
  const lavaFloor = addStudPart(worldGroup, 8, 0.5, 16, 0, 1.4, -56, '#EF4444', maxAniso, 0.3, 0.05, '#DC2626', 0.65);
  registerPlatform('s2_lava_floor', lavaFloor, 8, 0.5, 16, 'lava');
  const stonePositions: [number, number, number, string][] = [
    [-1.8, 2.2, -50.5, '#FACC15'],
    [1.8, 2.5, -54.5, '#FB923C'],
    [-1.6, 2.8, -58.5, '#FACC15'],
    [1.4, 3.1, -62.5, '#FB923C'],
  ];
  stonePositions.forEach(([sx, sy, sz, col], idx) => {
    const st = addStudPart(worldGroup, 3.0, 0.8, 3.0, sx, sy, sz, col, maxAniso);
    registerPlatform(`s2_stone_${idx}`, st, 3.0, 0.8, 3.0, 'solid');
    if (idx === 1 || idx === 3) coins.push(buildCoin(sx, sy + 1.5, sz, `coin_s2_${idx}`, idx));
  });

  // Checkpoint 2
  addCheckpoint(2, 0, 3.4, -68, '#0284C7');

  // Stage 3: Dual-Lane Moving Sliders
  for (let i = 0; i < 3; i++) {
    const mz = -75 - i * 5.2;
    const plat = addStudPart(worldGroup, 4.4, 0.85, 4.2, 0, 3.6 + i * 0.4, mz, i % 2 === 0 ? '#A855F7' : '#EC4899', maxAniso);
    registerPlatform(`s3_mover_${i}`, plat, 4.4, 0.85, 4.2, 'solid', {
      moveAxis: 'x',
      moveOrigin: new THREE.Vector3(0, 3.6 + i * 0.4, mz),
      moveAmp: 4.5,
      moveSpeed: 1.45 + i * 0.15,
      movePhase: i * 1.9,
    });
    if (i === 1) coins.push(buildCoin(0, 6.2, mz, 'coin_s3', 1.2));
  }

  // Checkpoint 3
  addCheckpoint(3, 0, 4.6, -92, '#7C3AED');

  // Stage 4: Spinning Sweeper Beams Bridge
  const sweeperDeck = addStudPart(worldGroup, 7.5, 0.9, 17, 0, 4.6, -104, '#E2E8F0', maxAniso);
  registerPlatform('s4_deck', sweeperDeck, 7.5, 0.9, 17, 'solid');

  [-100, -108].forEach((sz, idx) => {
    const hub = new THREE.Group();
    hub.position.set(0, 5.85, sz);
    const hubMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.7, 1.5, 10),
      new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.7, roughness: 0.25 }),
    );
    const beamMat = new THREE.MeshStandardMaterial({
      color: '#EF4444',
      emissive: '#B91C1C',
      emissiveIntensity: 0.55,
      roughness: 0.28,
    });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.55, 0.55), beamMat);
    beam.position.y = 0.2;
    beam.castShadow = true;
    hub.add(hubMesh, beam);
    worldGroup.add(hub);

    sweepers.push({
      pivot: hub,
      center: new THREE.Vector3(0, 6.05, sz),
      armLength: 3.6,
      radius: 0.45,
      speed: idx === 0 ? 1.75 : -2.05,
      phase: idx * 1.5,
    });
  });
  coins.push(buildCoin(0, 7.3, -104, 'coin_s4', 0.8));

  // Checkpoint 4
  addCheckpoint(4, 0, 4.8, -116.5, '#7C3AED');

  // Stage 5: Trampoline Bounce Launchers
  const bounceDeck1 = addStudPart(worldGroup, 5.2, 0.8, 5.2, 0, 4.8, -124.5, '#1E293B', maxAniso);
  registerPlatform('s5_pad1_base', bounceDeck1, 5.2, 0.8, 5.2, 'solid');
  const bounce1 = addStudPart(worldGroup, 3.6, 0.35, 3.6, 0, 5.38, -124.5, '#22C55E', maxAniso, 0.25, 0.1, '#16A34A', 0.45);
  registerPlatform('s5_bounce1', bounce1, 3.6, 0.35, 3.6, 'bounce', { bounceVelocity: 27 });

  const highStep = addStudPart(worldGroup, 5.5, 0.9, 5.5, 0, 10.6, -133, '#10B981', maxAniso);
  registerPlatform('s5_high_step', highStep, 5.5, 0.9, 5.5, 'solid');
  const bounce2 = addStudPart(worldGroup, 3.6, 0.35, 3.6, 0, 11.2, -133, '#22C55E', maxAniso, 0.25, 0.1, '#16A34A', 0.45);
  registerPlatform('s5_bounce2', bounce2, 3.6, 0.35, 3.6, 'bounce', { bounceVelocity: 27 });
  coins.push(buildCoin(0, 13.8, -128.5, 'coin_s5_mid', 2.4));

  // Checkpoint 5 (Sky Terrace)
  addCheckpoint(5, 0, 16.4, -142.5, '#10B981');

  // Stage 6: Climbable Truss Tower Shaft
  const trussWall = addStudPart(worldGroup, 3.2, 12, 1.4, 0, 22.4, -148.5, '#F59E0B', maxAniso, 0.4, 0.3);
  registerPlatform('s6_truss_core', trussWall, 3.2, 12, 1.4, 'solid');
  // Visual ladder rungs on front (+z) of truss wall
  const rungMat = new THREE.MeshStandardMaterial({ color: '#FEF08A', metalness: 0.45, roughness: 0.35 });
  for (let ry = 17.5; ry <= 28.0; ry += 1.2) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 0.32), rungMat);
    rung.position.set(0, ry, -147.65);
    rung.castShadow = true;
    worldGroup.add(rung);
  }
  trusses.push({
    minX: -1.9,
    maxX: 1.9,
    minY: 16.4,
    maxY: 29.3,
    minZ: -148.3,
    maxZ: -146.3,
  });

  const towerTop = addStudPart(worldGroup, 6.5, 0.9, 6.5, 0, 28.6, -151.5, '#F59E0B', maxAniso);
  registerPlatform('s6_tower_top', towerTop, 6.5, 0.9, 6.5, 'solid');
  coins.push(buildCoin(0, 30.6, -151.5, 'coin_s6', 1.1));

  // Checkpoint 6
  addCheckpoint(6, 0, 28.6, -158.5, '#F59E0B');

  // Stage 7: Alternating Laser Hop Beams + Lava Slabs
  for (let i = 0; i < 4; i++) {
    const bz = -165 - i * 4.5;
    const beam = addStudPart(worldGroup, 2.2, 0.85, 3.2, i % 2 === 0 ? -1.4 : 1.4, 28.8 + i * 0.35, bz, '#EC4899', maxAniso);
    registerPlatform(`s7_hop_${i}`, beam, 2.2, 0.85, 3.2, 'solid');

    // Crosswise glowing hazard bar slightly elevated/sideways to hop cleanly over
    const laser = addStudPart(worldGroup, 4.8, 0.45, 0.65, 0, 29.85 + i * 0.35, bz - 2.2, '#EF4444', maxAniso, 0.25, 0.1, '#EF4444', 0.7);
    registerPlatform(`s7_laser_${i}`, laser, 4.8, 0.45, 0.65, 'lava');
  }

  // Checkpoint 7
  addCheckpoint(7, 0, 30.2, -184, '#EC4899');

  // Stage 8: Vertical Elevator Lift + Floating Gems
  const elevator = addStudPart(worldGroup, 5.2, 0.9, 5.2, 0, 33.5, -191, '#06B6D4', maxAniso);
  registerPlatform('s8_elevator', elevator, 5.2, 0.9, 5.2, 'solid', {
    moveAxis: 'y',
    moveOrigin: new THREE.Vector3(0, 33.5, -191),
    moveAmp: 3.4,
    moveSpeed: 1.5,
    movePhase: 0,
  });
  coins.push(buildCoin(0, 38.6, -191, 'coin_s8', 0.4));

  // Checkpoint 8
  addCheckpoint(8, 0, 36.8, -198.5, '#06B6D4');

  // Stage 9: Final Gauntlet Bridge + Rotating Sweeper + Checkerboard Finish Runway
  const finalBridge = addStudPart(worldGroup, 6.2, 0.9, 14, 0, 36.8, -209, '#6366F1', maxAniso);
  registerPlatform('s9_bridge', finalBridge, 6.2, 0.9, 14, 'solid');

  const finalHub = new THREE.Group();
  finalHub.position.set(0, 38.05, -209);
  const fHubMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.65, 1.4, 10),
    new THREE.MeshStandardMaterial({ color: '#1E293B', metalness: 0.75, roughness: 0.25 }),
  );
  const fBeam = new THREE.Mesh(
    new THREE.BoxGeometry(6.0, 0.5, 0.5),
    new THREE.MeshStandardMaterial({
      color: '#F43F5E',
      emissive: '#BE123C',
      emissiveIntensity: 0.6,
    }),
  );
  fBeam.position.y = 0.18;
  fBeam.castShadow = true;
  finalHub.add(fHubMesh, fBeam);
  worldGroup.add(finalHub);
  sweepers.push({
    pivot: finalHub,
    center: new THREE.Vector3(0, 38.23, -209),
    armLength: 3.0,
    radius: 0.45,
    speed: 2.3,
    phase: 0.7,
  });

  // Checkered Finish Runway into Golden Winner Podium (Stage 10 Finish!)
  const checkerMat = new THREE.MeshStandardMaterial({
    map: createCheckerTexture(maxAniso),
    roughness: 0.35,
    metalness: 0.1,
  });
  const finishRunway = new THREE.Mesh(new THREE.BoxGeometry(8, 0.9, 5), checkerMat);
  finishRunway.position.set(0, 36.9, -218.5);
  finishRunway.receiveShadow = true;
  worldGroup.add(finishRunway);
  registerPlatform('s10_checker', finishRunway, 8, 0.9, 5, 'solid');

  // Grand Golden Winner Podium
  const podium = addStudPart(worldGroup, 11, 1.2, 11, 0, 37.2, -226.5, '#FBBF24', maxAniso, 0.25, 0.45);
  registerPlatform('s10_winner_podium', podium, 11, 1.2, 11, 'finish', { stageIndex: 10 });

  // Floating Golden Crown Trophy above Podium
  const trophyCrown = new THREE.Group();
  trophyCrown.position.set(0, 41.2, -226.5);
  const crownGold = new THREE.MeshStandardMaterial({
    color: '#FBBF24',
    metalness: 0.85,
    roughness: 0.18,
    emissive: '#B45309',
    emissiveIntensity: 0.3,
  });
  const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.65, 8), crownGold);
  trophyCrown.add(crownBase);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.75, 4), crownGold);
    spike.position.set(Math.cos(a) * 1.0, 0.65, Math.sin(a) * 1.0);
    trophyCrown.add(spike);
  }
  worldGroup.add(trophyCrown);

  // Cheering Champion AI Player waiting on Podium
  const cheerNpc = createRobloxAvatar(AVATAR_PRESETS.noob, maxAniso);
  cheerNpc.root.position.set(-3.6, 37.8, -228);
  cheerNpc.root.rotation.y = 0.4;
  const podiumBb = createBotBillboard('PodiumChamp', 'CHEER', 'Reach Stage 10!', false);
  cheerNpc.root.add(podiumBb.sprite);
  worldGroup.add(cheerNpc.root);
  npcs.push({
    id: 'ai_podium',
    name: 'PodiumChamp',
    rig: cheerNpc,
    anim: 'CHEER',
    directive: 'CHEER',
    speech: 'Reach Stage 10!',
    billboard: podiumBb,
    baseY: 37.8,
    position: new THREE.Vector3(-3.6, 37.8, -228),
    velocity: new THREE.Vector3(),
    yaw: 0.4,
    onGround: true,
    waypoints: [new THREE.Vector3(-3.6, 37.8, -228)],
    waypointIdx: 0,
    nextThinkAt: 8,
    jumpCooldown: 0,
    phase: 0.5,
    pinnedAtPodium: true,
  });

  coins.push(buildCoin(0, 39.2, -226.5, 'coin_podium_crown', 0));
  coins.forEach((c) => worldGroup.add(c.mesh));

  return {
    worldGroup,
    platforms,
    trusses,
    sweepers,
    coins,
    checkpoints,
    npcs,
    fountainDroplets,
    clouds,
    trophyCrown,
    spawnPosition: new THREE.Vector3(0, 0.55, 11),
  };
}
