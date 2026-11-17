import * as THREE from 'three';
import { LANE_COLORS } from './guitarHeroSongs';
import {
  createAmpGrillTexture,
  createFlameGlowTexture,
  createFretboardTexture,
} from './guitarHeroTextures';

export const HIGHWAY_WIDTH = 7.6;
export const HIGHWAY_LENGTH = 36;
export const STRIKE_Z = 0;
export const SPAWN_Z = -32;
export const LANE_WIDTH = HIGHWAY_WIDTH / 5;

export function getLaneX(lane: number): number {
  return (lane - 2) * LANE_WIDTH;
}

export interface FretHeadActor {
  lane: number;
  root: THREE.Group;
  pistonGroup: THREE.Group;
  bezelMat: THREE.MeshStandardMaterial;
  pistonCoreMat: THREE.MeshStandardMaterial;
  flameGroup: THREE.Group;
  shockRing: THREE.Mesh;
  pressAmount: number;
  hitFlash: number;
  flameLife: number;
}

export interface NoteVisualHandle {
  group: THREE.Group;
  gemBody: THREE.Group;
  starCap: THREE.Mesh;
  hopoRing: THREE.Mesh;
  normalCap: THREE.Mesh;
  sustainCore: THREE.Mesh;
  sustainAura: THREE.Mesh;
  ringMat: THREE.MeshStandardMaterial;
  domeMat: THREE.MeshStandardMaterial;
  starMat: THREE.MeshStandardMaterial;
  sustainMat: THREE.MeshStandardMaterial;
}

export interface GuitarStageHandle {
  root: THREE.Group;
  fretboardTex: THREE.CanvasTexture;
  fretBars: THREE.Mesh[];
  edgeStrips: THREE.MeshStandardMaterial[];
  fretHeads: FretHeadActor[];
  spotlights: THREE.SpotLight[];
  ampCones: THREE.Mesh[];
  highwayGroup: THREE.Group;
  headstockGroup: THREE.Group;
}

function createStarShape(outerR: number, innerR: number, points = 5): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function createHeadstockGroup(): THREE.Group {
  const head = new THREE.Group();
  head.position.set(0, 0.08, -33.2);

  // Classic slanted asymmetric rock guitar headstock silhouette via ExtrudeGeometry
  const shape = new THREE.Shape();
  shape.moveTo(-1.7, 0);
  shape.lineTo(-2.5, 4.4);
  shape.lineTo(-0.5, 5.5);
  shape.lineTo(2.35, 3.85);
  shape.lineTo(1.7, 0);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.42,
    bevelEnabled: true,
    bevelThickness: 0.09,
    bevelSize: 0.08,
    bevelSegments: 2,
  });
  geo.rotateX(-Math.PI / 2);

  const lacquerMat = new THREE.MeshStandardMaterial({
    color: '#18181B',
    roughness: 0.22,
    metalness: 0.28,
  });
  const headstockMesh = new THREE.Mesh(geo, lacquerMat);
  headstockMesh.castShadow = true;
  head.add(headstockMesh);

  // Ivory Bone Nut Bar at z = 0 (junction with neck)
  const nut = new THREE.Mesh(
    new THREE.BoxGeometry(HIGHWAY_WIDTH * 0.46, 0.34, 0.28),
    new THREE.MeshStandardMaterial({ color: '#FEF3C7', roughness: 0.35, metalness: 0.05 }),
  );
  nut.position.set(0, 0.45, 0.08);
  head.add(nut);

  // Truss rod cover badge
  const badge = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.08, 1.35),
    new THREE.MeshStandardMaterial({
      color: '#F59E0B',
      metalness: 0.72,
      roughness: 0.24,
    }),
  );
  badge.position.set(0, 0.48, -1.35);
  head.add(badge);

  // 6 Brushed Chrome Tuning Pegs (3 left, 3 right)
  const chromeMat = new THREE.MeshStandardMaterial({
    color: '#E2E8F0',
    metalness: 0.88,
    roughness: 0.16,
  });
  for (let i = 0; i < 3; i++) {
    const zOff = -1.2 - i * 1.1;
    // Left pegs
    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.45, 10), chromeMat);
    postL.position.set(-1.35 - i * 0.18, 0.56, zOff);
    const keyL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.24, 0.14), chromeMat);
    keyL.position.set(-2.3 - i * 0.18, 0.25, zOff);
    head.add(postL, keyL);

    // Right pegs
    const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.45, 10), chromeMat);
    postR.position.set(1.35 + i * 0.15, 0.56, zOff);
    const keyR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.24, 0.14), chromeMat);
    keyR.position.set(2.3 + i * 0.15, 0.25, zOff);
    head.add(postR, keyR);
  }

  return head;
}

function buildAmpStack(x: number, z: number, rotY: number, maxAniso: number): {
  group: THREE.Group;
  speakerGlow: THREE.Mesh;
} {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;

  const tolexMat = new THREE.MeshStandardMaterial({ color: '#18181B', roughness: 0.78, metalness: 0.08 });
  const grillMat = new THREE.MeshStandardMaterial({
    map: createAmpGrillTexture(maxAniso),
    roughness: 0.82,
    metalness: 0.05,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: '#D97706',
    metalness: 0.78,
    roughness: 0.25,
  });

  // Lower 4x12 Cabinet
  const cabLow = new THREE.Mesh(new THREE.BoxGeometry(5.4, 5.2, 2.8), tolexMat);
  cabLow.position.y = 2.6;
  cabLow.castShadow = true;
  const grillLow = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 4.6), grillMat);
  grillLow.position.set(0, 2.6, 1.42);
  group.add(cabLow, grillLow);

  // Upper 4x12 Cabinet
  const cabTop = new THREE.Mesh(new THREE.BoxGeometry(5.2, 4.8, 2.6), tolexMat);
  cabTop.position.y = 7.7;
  cabTop.castShadow = true;
  const grillTop = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.2), grillMat);
  grillTop.position.set(0, 7.7, 1.32);
  group.add(cabTop, grillTop);

  // Tube Amp Head on Top
  const headBox = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.75, 2.2), tolexMat);
  headBox.position.y = 11.0;
  const brassPanel = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.75, 0.1), brassMat);
  brassPanel.position.set(0, 10.95, 1.12);
  const powerLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 8),
    new THREE.MeshStandardMaterial({
      color: '#EF4444',
      emissive: '#EF4444',
      emissiveIntensity: 1.4,
    }),
  );
  powerLed.position.set(1.85, 10.95, 1.16);
  group.add(headBox, brassPanel, powerLed);

  return { group, speakerGlow: cabTop };
}

export function createDetailedGuitarStage(maxAniso = 8): GuitarStageHandle {
  const root = new THREE.Group();
  const highwayGroup = new THREE.Group();
  root.add(highwayGroup);

  const fretboardTex = createFretboardTexture(maxAniso);

  // 1. Main Sculpted Rosewood Fretboard Slab
  const deckMat = new THREE.MeshStandardMaterial({
    map: fretboardTex,
    roughness: 0.42,
    metalness: 0.1,
  });
  const sideWoodMat = new THREE.MeshStandardMaterial({
    color: '#1C110D',
    roughness: 0.65,
    metalness: 0.08,
  });

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(HIGHWAY_WIDTH, 0.45, HIGHWAY_LENGTH),
    [sideWoodMat, sideWoodMat, deckMat, sideWoodMat, sideWoodMat, sideWoodMat],
  );
  deck.position.set(0, -0.225, -14.5);
  deck.receiveShadow = true;
  highwayGroup.add(deck);

  // 2. Sculpted Multi-Part Side Rails (Ivory Binding + Brushed Titanium Rail + Neon Strips)
  const bindingMat = new THREE.MeshStandardMaterial({ color: '#F1F5F9', roughness: 0.35, metalness: 0.1 });
  const railMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.28, metalness: 0.78 });
  const edgeStrips: THREE.MeshStandardMaterial[] = [];

  [-1, 1].forEach((side) => {
    const xBase = side * (HIGHWAY_WIDTH * 0.5 + 0.14);
    const binding = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, HIGHWAY_LENGTH), bindingMat);
    binding.position.set(xBase, -0.18, -14.5);
    highwayGroup.add(binding);

    const outerRail = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.56, HIGHWAY_LENGTH + 1.2), railMat);
    outerRail.position.set(xBase + side * 0.22, -0.14, -14.5);
    outerRail.castShadow = true;
    highwayGroup.add(outerRail);

    const stripMat = new THREE.MeshStandardMaterial({
      color: '#38BDF8',
      emissive: '#0284C7',
      emissiveIntensity: 0.75,
      roughness: 0.2,
    });
    edgeStrips.push(stripMat);

    const neonRail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, HIGHWAY_LENGTH), stripMat);
    neonRail.position.set(xBase + side * 0.22, 0.17, -14.5);
    highwayGroup.add(neonRail);
  });

  // 3. Five Raised 3D Steel Guitar Strings spanning the entire neck
  const stringMat = new THREE.MeshStandardMaterial({
    color: '#E2E8F0',
    metalness: 0.88,
    roughness: 0.18,
  });
  for (let lane = 0; lane < 5; lane++) {
    const r = 0.032 - lane * 0.0035;
    const strMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, HIGHWAY_LENGTH, 8),
      stringMat,
    );
    strMesh.rotation.x = Math.PI / 2;
    strMesh.position.set(getLaneX(lane), 0.03, -14.5);
    highwayGroup.add(strMesh);
  }

  // 4. Physical 3D Scrolling Nickel-Silver Fret Bars (16 bars moving cleanly toward player)
  const fretBars: THREE.Mesh[] = [];
  const fretMat = new THREE.MeshStandardMaterial({
    color: '#CBD5E1',
    metalness: 0.85,
    roughness: 0.22,
  });
  for (let i = 0; i < 16; i++) {
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, HIGHWAY_WIDTH - 0.12, 8),
      fretMat,
    );
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 0.015, SPAWN_Z + i * 2.25);
    highwayGroup.add(bar);
    fretBars.push(bar);
  }

  // 5. Bridge Tailpiece Bar & 5 Articulated Fret Heads at STRIKE_Z
  const bridgeHousing = new THREE.Mesh(
    new THREE.BoxGeometry(HIGHWAY_WIDTH + 0.7, 0.36, 1.85),
    new THREE.MeshStandardMaterial({ color: '#1E293B', metalness: 0.72, roughness: 0.3 }),
  );
  bridgeHousing.position.set(0, -0.08, STRIKE_Z);
  bridgeHousing.receiveShadow = true;
  highwayGroup.add(bridgeHousing);

  const fretHeads: FretHeadActor[] = [];
  const flameTex = createFlameGlowTexture();

  for (let lane = 0; lane < 5; lane++) {
    const x = getLaneX(lane);
    const col = LANE_COLORS[lane];

    const rootHead = new THREE.Group();
    rootHead.position.set(x, 0.06, STRIKE_Z);

    // Part A: Recessed dark steel socket cup
    const socket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.73, 0.14, 24),
      new THREE.MeshStandardMaterial({ color: '#0F172A', metalness: 0.75, roughness: 0.28 }),
    );
    rootHead.add(socket);

    // Part B: Outer Chrome Bevel Ring
    const chromeCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.065, 10, 24),
      new THREE.MeshStandardMaterial({ color: '#E2E8F0', metalness: 0.9, roughness: 0.15 }),
    );
    chromeCollar.rotation.x = Math.PI / 2;
    chromeCollar.position.y = 0.06;
    rootHead.add(chromeCollar);

    // Part C: Glowing Lane Color Outer Ring
    const bezelMat = new THREE.MeshStandardMaterial({
      color: col,
      emissive: col,
      emissiveIntensity: 0.32,
      roughness: 0.25,
      metalness: 0.35,
    });
    const colorRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.51, 0.075, 10, 24),
      bezelMat,
    );
    colorRing.rotation.x = Math.PI / 2;
    colorRing.position.y = 0.075;
    rootHead.add(colorRing);

    // Part D: Articulated Depressing Piston Head (3 sub-parts: puck, inner ring, saddle pin)
    const pistonGroup = new THREE.Group();
    pistonGroup.position.y = 0.09;
    rootHead.add(pistonGroup);

    const pistonCoreMat = new THREE.MeshStandardMaterial({
      color: '#1E293B',
      emissive: col,
      emissiveIntensity: 0.14,
      roughness: 0.32,
      metalness: 0.52,
    });
    const pistonBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.46, 0.13, 20),
      pistonCoreMat,
    );
    pistonBody.castShadow = true;
    pistonGroup.add(pistonBody);

    const innerCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.26, 0.05, 16),
      new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.25, metalness: 0.25 }),
    );
    innerCap.position.y = 0.07;
    pistonGroup.add(innerCap);

    // 4 Cardinal Micro-Lug Tension Pins around socket
    const lugMat = new THREE.MeshStandardMaterial({ color: '#94A3B8', metalness: 0.85, roughness: 0.2 });
    for (let b = 0; b < 4; b++) {
      const a = (b * Math.PI) / 2 + Math.PI / 4;
      const lug = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.14, 8), lugMat);
      lug.position.set(Math.cos(a) * 0.65, 0.06, Math.sin(a) * 0.65);
      rootHead.add(lug);
    }

    // Part E: Multi-Blade Hit Flame Column + Expanding Shockwave Ring
    const flameGroup = new THREE.Group();
    flameGroup.position.y = 0.15;
    flameGroup.visible = false;
    const flameMat = new THREE.MeshBasicMaterial({
      map: flameTex,
      color: col,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (let f = 0; f < 3; f++) {
      const blade = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 2.25), flameMat);
      blade.position.y = 0.95;
      blade.rotation.y = (f * Math.PI) / 3;
      flameGroup.add(blade);
    }
    rootHead.add(flameGroup);

    const shockRing = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.68, 24),
      new THREE.MeshBasicMaterial({
        color: '#FFFFFF',
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    shockRing.rotation.x = -Math.PI / 2;
    shockRing.position.y = 0.14;
    shockRing.visible = false;
    rootHead.add(shockRing);

    highwayGroup.add(rootHead);
    fretHeads.push({
      lane,
      root: rootHead,
      pistonGroup,
      bezelMat,
      pistonCoreMat,
      flameGroup,
      shockRing,
      pressAmount: 0,
      hitFlash: 0,
      flameLife: 0,
    });
  }

  // 6. Sculpted Electric Guitar Headstock at Far Horizon
  const headstockGroup = createHeadstockGroup();
  highwayGroup.add(headstockGroup);

  // 7. Arena Concert Stage Floor, Flanking Amp Stacks & Lighting Truss
  const stageFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 140),
    new THREE.MeshStandardMaterial({ color: '#090B10', roughness: 0.62, metalness: 0.2 }),
  );
  stageFloor.rotation.x = -Math.PI / 2;
  stageFloor.position.set(0, -6.5, -24);
  stageFloor.receiveShadow = true;
  root.add(stageFloor);

  const ampCones: THREE.Mesh[] = [];
  const leftStack = buildAmpStack(-13.5, -28, 0.38, maxAniso);
  leftStack.group.position.y = -6.5;
  const rightStack = buildAmpStack(13.5, -28, -0.38, maxAniso);
  rightStack.group.position.y = -6.5;
  const leftOuter = buildAmpStack(-20.5, -23, 0.55, maxAniso);
  leftOuter.group.position.y = -6.5;
  const rightOuter = buildAmpStack(20.5, -23, -0.55, maxAniso);
  rightOuter.group.position.y = -6.5;
  root.add(leftStack.group, rightStack.group, leftOuter.group, rightOuter.group);
  ampCones.push(leftStack.speakerGlow, rightStack.speakerGlow);

  // Overhead Arena Light Truss Arch
  const trussMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.8, roughness: 0.3 });
  const topTruss = new THREE.Mesh(new THREE.BoxGeometry(36, 0.8, 0.8), trussMat);
  topTruss.position.set(0, 12.5, -30);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 19.5, 0.9), trussMat);
  legL.position.set(-17.5, 3, -30);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.9, 19.5, 0.9), trussMat);
  legR.position.set(17.5, 3, -30);
  root.add(topTruss, legL, legR);

  const spotlights: THREE.SpotLight[] = [];
  const spotColors = ['#38BDF8', '#EC4899', '#F59E0B'];
  [-11, 0, 11].forEach((sx, idx) => {
    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.45, 0.9, 10),
      new THREE.MeshStandardMaterial({ color: '#0F172A', metalness: 0.7, roughness: 0.3 }),
    );
    can.position.set(sx, 11.9, -29.6);
    can.rotation.x = 0.55;
    root.add(can);

    const bulb = new THREE.Mesh(
      new THREE.CircleGeometry(0.36, 12),
      new THREE.MeshBasicMaterial({ color: spotColors[idx] }),
    );
    bulb.position.set(sx, 11.55, -29.3);
    bulb.rotation.x = Math.PI / 2 - 0.55;
    root.add(bulb);

    const spot = new THREE.SpotLight(spotColors[idx], 45, 55, 0.45, 0.65, 1.5);
    spot.position.set(sx, 11.6, -29);
    spot.target.position.set(sx * 0.3, -1, -12);
    root.add(spot);
    root.add(spot.target);
    spotlights.push(spot);
  });

  return {
    root,
    fretboardTex,
    fretBars,
    edgeStrips,
    fretHeads,
    spotlights,
    ampCones,
    highwayGroup,
    headstockGroup,
  };
}

// Shared static geometry caches for high-FPS pooled 3D notes
const noteGeoCache = {
  collar: new THREE.CylinderGeometry(0.62, 0.66, 0.1, 20),
  colorRing: new THREE.CylinderGeometry(0.54, 0.59, 0.17, 20),
  dome: new THREE.SphereGeometry(0.41, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
  normalCap: new THREE.CylinderGeometry(0.24, 0.27, 0.08, 16),
  hopoRing: new THREE.TorusGeometry(0.44, 0.055, 8, 20),
  lug: new THREE.BoxGeometry(0.11, 0.14, 0.11),
  star: (() => {
    const s = new THREE.ExtrudeGeometry(createStarShape(0.58, 0.26, 5), {
      depth: 0.18,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.035,
      bevelSegments: 2,
    });
    s.rotateX(-Math.PI / 2);
    return s;
  })(),
  sustainCore: new THREE.BoxGeometry(0.16, 0.09, 1),
  sustainAura: new THREE.BoxGeometry(0.38, 0.04, 1),
};

const darkMetalMat = new THREE.MeshStandardMaterial({
  color: '#0F172A',
  metalness: 0.82,
  roughness: 0.26,
});
const chromeLugMat = new THREE.MeshStandardMaterial({
  color: '#F1F5F9',
  metalness: 0.9,
  roughness: 0.15,
});
const whiteCoreMat = new THREE.MeshStandardMaterial({
  color: '#FFFFFF',
  emissive: '#E2E8F0',
  emissiveIntensity: 0.45,
  roughness: 0.18,
  metalness: 0.15,
});
const hopoGlowMat = new THREE.MeshStandardMaterial({
  color: '#FFFFFF',
  emissive: '#BAE6FD',
  emissiveIntensity: 0.95,
  roughness: 0.15,
});

export function createPooledNoteVisual(lane: number): NoteVisualHandle {
  const col = LANE_COLORS[lane];
  const group = new THREE.Group();
  const gemBody = new THREE.Group();
  group.add(gemBody);

  // 1. Machined dark locking base collar
  const collar = new THREE.Mesh(noteGeoCache.collar, darkMetalMat);
  collar.position.y = 0.05;
  collar.castShadow = true;
  gemBody.add(collar);

  // 2. Vibrant colored chamfered outer housing
  const ringMat = new THREE.MeshStandardMaterial({
    color: col,
    emissive: col,
    emissiveIntensity: 0.35,
    roughness: 0.26,
    metalness: 0.28,
  });
  const ringMesh = new THREE.Mesh(noteGeoCache.colorRing, ringMat);
  ringMesh.position.y = 0.14;
  ringMesh.castShadow = true;
  gemBody.add(ringMesh);

  // 3. Glossy inner dome crystal
  const domeMat = new THREE.MeshStandardMaterial({
    color: col,
    emissive: col,
    emissiveIntensity: 0.55,
    roughness: 0.12,
    metalness: 0.15,
  });
  const domeMesh = new THREE.Mesh(noteGeoCache.dome, domeMat);
  domeMesh.scale.set(1, 0.52, 1);
  domeMesh.position.y = 0.19;
  gemBody.add(domeMesh);

  // 4. White center crest cap (standard note)
  const normalCap = new THREE.Mesh(noteGeoCache.normalCap, whiteCoreMat);
  normalCap.position.y = 0.36;
  gemBody.add(normalCap);

  // 5. Elevated luminous HOPO halo ring
  const hopoRing = new THREE.Mesh(noteGeoCache.hopoRing, hopoGlowMat);
  hopoRing.rotation.x = Math.PI / 2;
  hopoRing.position.y = 0.27;
  hopoRing.visible = false;
  gemBody.add(hopoRing);

  // 6. 4 Cardinal chrome lugs on collar
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const lug = new THREE.Mesh(noteGeoCache.lug, chromeLugMat);
    lug.position.set(Math.cos(a) * 0.59, 0.12, Math.sin(a) * 0.59);
    gemBody.add(lug);
  }

  // 7. Star Power 5-Point Extruded Star Cap (replaces normal cap on star phrases)
  const starMat = new THREE.MeshStandardMaterial({
    color: '#38BDF8',
    emissive: '#00F0FF',
    emissiveIntensity: 0.85,
    metalness: 0.5,
    roughness: 0.18,
  });
  const starCap = new THREE.Mesh(noteGeoCache.star, starMat);
  starCap.position.y = 0.15;
  starCap.visible = false;
  gemBody.add(starCap);

  // 8. Sustain Tail Core + Outer Plasma Aura
  const sustainMat = new THREE.MeshStandardMaterial({
    color: col,
    emissive: col,
    emissiveIntensity: 0.65,
    roughness: 0.2,
    metalness: 0.1,
  });
  const sustainCore = new THREE.Mesh(noteGeoCache.sustainCore, whiteCoreMat);
  sustainCore.position.y = 0.13;
  sustainCore.visible = false;
  group.add(sustainCore);

  const sustainAura = new THREE.Mesh(noteGeoCache.sustainAura, sustainMat);
  sustainAura.position.y = 0.1;
  sustainAura.visible = false;
  group.add(sustainAura);

  group.visible = false;
  return {
    group,
    gemBody,
    starCap,
    hopoRing,
    normalCap,
    sustainCore,
    sustainAura,
    ringMat,
    domeMat,
    starMat,
    sustainMat,
  };
}
