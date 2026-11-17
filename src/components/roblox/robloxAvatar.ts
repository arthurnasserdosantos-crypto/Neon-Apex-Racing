import * as THREE from 'three';
import {
  createFaceTexture,
  createShirtTexture,
  RobloxFaceStyle,
} from './robloxTextures';

export type RobloxAccessory = 'none' | 'crown' | 'cap' | 'headphones' | 'visor';
export type RobloxAnimState =
  | 'IDLE'
  | 'WALK'
  | 'RUN'
  | 'JUMP'
  | 'FALL'
  | 'CLIMB'
  | 'WAVE'
  | 'DANCE'
  | 'CHEER'
  | 'SIT';

export interface RobloxAvatarConfig {
  name: string;
  skinColor: string;
  shirtColor: string;
  stripeColor: string;
  pantsColor: string;
  shoeColor: string;
  faceStyle: RobloxFaceStyle;
  accessory: RobloxAccessory;
  hasBackpack: boolean;
  hasSword: boolean;
}

export const AVATAR_PRESETS: Record<string, RobloxAvatarConfig> = {
  noob: {
    name: 'Classic Bloxxer',
    skinColor: '#FACC15',
    shirtColor: '#2563EB',
    stripeColor: '#FACC15',
    pantsColor: '#16A34A',
    shoeColor: '#15803D',
    faceStyle: 'classic',
    accessory: 'cap',
    hasBackpack: true,
    hasSword: false,
  },
  knight: {
    name: 'Cyber Knight',
    skinColor: '#FDE68A',
    shirtColor: '#334155',
    stripeColor: '#38BDF8',
    pantsColor: '#1E293B',
    shoeColor: '#0F172A',
    faceStyle: 'cool',
    accessory: 'visor',
    hasBackpack: true,
    hasSword: true,
  },
  royalty: {
    name: 'Obby King',
    skinColor: '#FDBA74',
    shirtColor: '#7C3AED',
    stripeColor: '#FBBF24',
    pantsColor: '#312E81',
    shoeColor: '#1E1B4B',
    faceStyle: 'happy',
    accessory: 'crown',
    hasBackpack: false,
    hasSword: true,
  },
  dj: {
    name: 'Neon DJ',
    skinColor: '#E2E8F0',
    shirtColor: '#EC4899',
    stripeColor: '#00F0FF',
    pantsColor: '#0F172A',
    shoeColor: '#EC4899',
    faceStyle: 'robot',
    accessory: 'headphones',
    hasBackpack: true,
    hasSword: false,
  },
};

export interface RobloxAvatarRig {
  root: THREE.Group;
  hips: THREE.Group;
  lowerTorso: THREE.Group;
  upperTorso: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  leftUpperArm: THREE.Group;
  leftLowerArm: THREE.Group;
  leftHand: THREE.Group;
  rightUpperArm: THREE.Group;
  rightLowerArm: THREE.Group;
  rightHand: THREE.Group;
  leftUpperLeg: THREE.Group;
  leftLowerLeg: THREE.Group;
  leftFoot: THREE.Group;
  rightUpperLeg: THREE.Group;
  rightLowerLeg: THREE.Group;
  rightFoot: THREE.Group;
  backpackGroup: THREE.Group;
  swordGroup: THREE.Group;
  accessoryGroup: THREE.Group;
  headFrontMat: THREE.MeshStandardMaterial;
  skinMat: THREE.MeshStandardMaterial;
  shirtMat: THREE.MeshStandardMaterial;
  pantsMat: THREE.MeshStandardMaterial;
  shoeMat: THREE.MeshStandardMaterial;
  landingSquash: number;
  baseHipsY: number;
  animPhase: number;
}

function createRoundedBoxMesh(
  w: number,
  h: number,
  d: number,
  material: THREE.Material | THREE.Material[],
  castShadow = true,
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}

function buildAccessoryGroup(
  accessory: RobloxAccessory,
  accentHex: string,
): THREE.Group {
  const group = new THREE.Group();
  if (accessory === 'none') return group;

  if (accessory === 'crown') {
    const goldMat = new THREE.MeshStandardMaterial({
      color: '#FBBF24',
      metalness: 0.78,
      roughness: 0.22,
    });
    const gemMat = new THREE.MeshStandardMaterial({
      color: '#EF4444',
      metalness: 0.3,
      roughness: 0.15,
      emissive: '#991B1B',
      emissiveIntensity: 0.35,
    });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.18, 8), goldMat);
    band.position.y = 0.42;
    band.castShadow = true;
    group.add(band);

    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 4), goldMat);
      spike.position.set(Math.cos(ang) * 0.36, 0.58, Math.sin(ang) * 0.36);
      spike.castShadow = true;
      group.add(spike);

      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.055), gemMat);
      gem.position.set(Math.cos(ang) * 0.43, 0.42, Math.sin(ang) * 0.43);
      group.add(gem);
    }
  } else if (accessory === 'cap') {
    const capMat = new THREE.MeshStandardMaterial({
      color: accentHex,
      roughness: 0.58,
      metalness: 0.06,
    });
    const brimMat = new THREE.MeshStandardMaterial({
      color: '#0F172A',
      roughness: 0.42,
      metalness: 0.12,
    });
    const dome = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.32, 0.94), capMat);
    dome.position.set(0, 0.42, -0.02);
    dome.castShadow = true;
    group.add(dome);

    const button = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8), brimMat);
    button.position.set(0, 0.6, -0.02);
    group.add(button);

    // Front visor brim
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.08, 0.48), brimMat);
    brim.position.set(0, 0.3, 0.54);
    brim.rotation.x = 0.08;
    brim.castShadow = true;
    group.add(brim);
  } else if (accessory === 'headphones') {
    const darkMat = new THREE.MeshStandardMaterial({
      color: '#1E293B',
      roughness: 0.35,
      metalness: 0.65,
    });
    const neonMat = new THREE.MeshStandardMaterial({
      color: '#00F0FF',
      emissive: '#00F0FF',
      emissiveIntensity: 0.6,
      roughness: 0.25,
    });
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.055, 8, 20, Math.PI), darkMat);
    arc.position.set(0, 0.16, 0);
    arc.castShadow = true;
    group.add(arc);

    [-1, 1].forEach((side) => {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 12), darkMat);
      cup.rotation.z = Math.PI / 2;
      cup.position.set(side * 0.49, 0.02, 0);
      cup.castShadow = true;
      group.add(cup);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 14), neonMat);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(side * 0.56, 0.02, 0);
      group.add(ring);
    });
  } else if (accessory === 'visor') {
    const steelMat = new THREE.MeshStandardMaterial({
      color: '#475569',
      metalness: 0.78,
      roughness: 0.28,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: '#38BDF8',
      emissive: '#0284C7',
      emissiveIntensity: 0.45,
      metalness: 0.4,
      roughness: 0.12,
    });
    const crownBand = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.26, 0.96), steelMat);
    crownBand.position.set(0, 0.42, 0);
    crownBand.castShadow = true;
    group.add(crownBand);

    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.88), glassMat);
    crest.position.set(0, 0.62, -0.02);
    group.add(crest);

    const visorShield = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.22, 0.12), glassMat);
    visorShield.position.set(0, 0.06, 0.47);
    group.add(visorShield);
  }

  return group;
}

export function createRobloxAvatar(
  config: RobloxAvatarConfig,
  maxAniso = 4,
): RobloxAvatarRig {
  const root = new THREE.Group();
  const baseHipsY = 1.65;

  const skinMat = new THREE.MeshStandardMaterial({
    color: config.skinColor,
    roughness: 0.42,
    metalness: 0.05,
  });

  const shirtTex = createShirtTexture(config.shirtColor, config.stripeColor, maxAniso);
  const shirtMat = new THREE.MeshStandardMaterial({
    map: shirtTex,
    roughness: 0.58,
    metalness: 0.04,
  });

  const sleeveMat = new THREE.MeshStandardMaterial({
    color: config.shirtColor,
    roughness: 0.56,
    metalness: 0.05,
  });

  const pantsMat = new THREE.MeshStandardMaterial({
    color: config.pantsColor,
    roughness: 0.68,
    metalness: 0.04,
  });

  const shoeMat = new THREE.MeshStandardMaterial({
    color: config.shoeColor,
    roughness: 0.35,
    metalness: 0.15,
  });

  const headFrontMat = new THREE.MeshStandardMaterial({
    map: createFaceTexture(config.faceStyle, config.skinColor, maxAniso),
    roughness: 0.38,
    metalness: 0.04,
  });

  // 1. Hips (root pelvis joint at waist-bottom ~1.65)
  const hips = new THREE.Group();
  hips.position.y = baseHipsY;
  root.add(hips);

  // 2. LowerTorso (pelvis block)
  const lowerTorso = new THREE.Group();
  hips.add(lowerTorso);
  const pelvisMesh = createRoundedBoxMesh(1.16, 0.38, 0.66, pantsMat);
  pelvisMesh.position.y = 0.16;
  lowerTorso.add(pelvisMesh);

  // Belt detail
  const beltMesh = createRoundedBoxMesh(
    1.21,
    0.12,
    0.71,
    new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.4, metalness: 0.35 }),
  );
  beltMesh.position.y = 0.32;
  lowerTorso.add(beltMesh);

  // 3. UpperTorso (pivots on LowerTorso)
  const upperTorso = new THREE.Group();
  upperTorso.position.y = 0.36;
  lowerTorso.add(upperTorso);

  const chestMesh = createRoundedBoxMesh(1.22, 0.92, 0.68, [
    sleeveMat, // +x
    sleeveMat, // -x
    sleeveMat, // +y
    sleeveMat, // -y
    shirtMat,  // +z front
    sleeveMat, // -z back
  ]);
  chestMesh.position.y = 0.46;
  upperTorso.add(chestMesh);

  // 4 & 5. Neck + Head (iconic slightly rounded stud-top cylinder-box hybrid)
  const neck = new THREE.Group();
  neck.position.y = 0.96;
  upperTorso.add(neck);

  const neckCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.14, 10), skinMat);
  neckCollar.position.y = 0.04;
  neck.add(neckCollar);

  const head = new THREE.Group();
  head.position.y = 0.46;
  neck.add(head);

  const headBlock = createRoundedBoxMesh(0.84, 0.78, 0.84, [
    skinMat,
    skinMat,
    skinMat,
    skinMat,
    headFrontMat, // +z face
    skinMat,
  ]);
  head.add(headBlock);

  // Classic cylindrical top stud on Roblox head
  const headStud = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.09, 12), skinMat);
  headStud.position.y = 0.43;
  headStud.castShadow = true;
  head.add(headStud);

  const accessoryGroup = buildAccessoryGroup(config.accessory, config.shirtColor);
  head.add(accessoryGroup);

  // Backpack on UpperTorso back (-z)
  const backpackGroup = new THREE.Group();
  backpackGroup.visible = config.hasBackpack;
  const packMat = new THREE.MeshStandardMaterial({
    color: config.stripeColor,
    roughness: 0.48,
    metalness: 0.12,
  });
  const packTrimMat = new THREE.MeshStandardMaterial({
    color: '#0F172A',
    roughness: 0.4,
    metalness: 0.3,
  });
  const packBody = createRoundedBoxMesh(0.84, 0.76, 0.32, packMat);
  packBody.position.set(0, 0.5, -0.49);
  const packPocket = createRoundedBoxMesh(0.62, 0.34, 0.1, packTrimMat);
  packPocket.position.set(0, 0.36, -0.66);
  backpackGroup.add(packBody, packPocket);
  upperTorso.add(backpackGroup);

  // Helper to build 3-part R15 Arm (UpperArm -> LowerArm -> Hand)
  const buildArm = (side: -1 | 1) => {
    const upperArm = new THREE.Group();
    upperArm.position.set(side * 0.84, 0.84, 0);
    upperTorso.add(upperArm);

    // Shoulder joint ball + upper sleeve
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), sleeveMat);
    shoulder.castShadow = true;
    upperArm.add(shoulder);

    const upperMesh = createRoundedBoxMesh(0.42, 0.46, 0.46, sleeveMat);
    upperMesh.position.y = -0.22;
    upperArm.add(upperMesh);

    const lowerArm = new THREE.Group();
    lowerArm.position.y = -0.46;
    upperArm.add(lowerArm);

    const lowerMesh = createRoundedBoxMesh(0.4, 0.42, 0.42, skinMat);
    lowerMesh.position.y = -0.21;
    lowerArm.add(lowerMesh);

    const hand = new THREE.Group();
    hand.position.y = -0.44;
    lowerArm.add(hand);

    const handMesh = createRoundedBoxMesh(0.36, 0.24, 0.36, skinMat);
    handMesh.position.y = -0.09;
    hand.add(handMesh);

    return { upperArm, lowerArm, hand };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // Blox Sword mounted cleanly in Right Hand (+z forward)
  const swordGroup = new THREE.Group();
  swordGroup.visible = config.hasSword;
  const hiltMat = new THREE.MeshStandardMaterial({
    color: '#FBBF24',
    metalness: 0.75,
    roughness: 0.25,
  });
  const bladeMat = new THREE.MeshStandardMaterial({
    color: '#38BDF8',
    emissive: '#0284C7',
    emissiveIntensity: 0.45,
    metalness: 0.82,
    roughness: 0.16,
  });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.32, 8), hiltMat);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, -0.1, 0.14);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.08), hiltMat);
  guard.position.set(0, -0.1, 0.3);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 1.05), bladeMat);
  blade.position.set(0, -0.1, 0.86);
  blade.castShadow = true;
  swordGroup.add(handle, guard, blade);
  rightArm.hand.add(swordGroup);

  // Helper to build 3-part R15 Leg (UpperLeg -> LowerLeg -> Foot)
  const buildLeg = (side: -1 | 1) => {
    const upperLeg = new THREE.Group();
    upperLeg.position.set(side * 0.32, 0, 0);
    hips.add(upperLeg);

    const thighMesh = createRoundedBoxMesh(0.54, 0.64, 0.56, pantsMat);
    thighMesh.position.y = -0.32;
    upperLeg.add(thighMesh);

    const lowerLeg = new THREE.Group();
    lowerLeg.position.y = -0.66;
    upperLeg.add(lowerLeg);

    const shinMesh = createRoundedBoxMesh(0.5, 0.64, 0.52, pantsMat);
    shinMesh.position.y = -0.32;
    lowerLeg.add(shinMesh);

    const foot = new THREE.Group();
    foot.position.y = -0.66;
    lowerLeg.add(foot);

    const shoeMesh = createRoundedBoxMesh(0.52, 0.3, 0.66, shoeMat);
    shoeMesh.position.set(0, -0.15, 0.07);
    foot.add(shoeMesh);

    return { upperLeg, lowerLeg, foot };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  return {
    root,
    hips,
    lowerTorso,
    upperTorso,
    neck,
    head,
    leftUpperArm: leftArm.upperArm,
    leftLowerArm: leftArm.lowerArm,
    leftHand: leftArm.hand,
    rightUpperArm: rightArm.upperArm,
    rightLowerArm: rightArm.lowerArm,
    rightHand: rightArm.hand,
    leftUpperLeg: leftLeg.upperLeg,
    leftLowerLeg: leftLeg.lowerLeg,
    leftFoot: leftLeg.foot,
    rightUpperLeg: rightLeg.upperLeg,
    rightLowerLeg: rightLeg.lowerLeg,
    rightFoot: rightLeg.foot,
    backpackGroup,
    swordGroup,
    accessoryGroup,
    headFrontMat,
    skinMat,
    shirtMat,
    pantsMat,
    shoeMat,
    landingSquash: 0,
    baseHipsY,
    animPhase: 0,
  };
}

export function applyAvatarCustomization(
  rig: RobloxAvatarRig,
  config: RobloxAvatarConfig,
  maxAniso = 4,
) {
  rig.skinMat.color.set(config.skinColor);
  rig.pantsMat.color.set(config.pantsColor);
  rig.shoeMat.color.set(config.shoeColor);

  rig.shirtMat.map = createShirtTexture(config.shirtColor, config.stripeColor, maxAniso);
  rig.shirtMat.needsUpdate = true;

  rig.headFrontMat.map = createFaceTexture(config.faceStyle, config.skinColor, maxAniso);
  rig.headFrontMat.needsUpdate = true;

  rig.backpackGroup.visible = config.hasBackpack;
  rig.swordGroup.visible = config.hasSword;

  while (rig.accessoryGroup.children.length > 0) {
    rig.accessoryGroup.remove(rig.accessoryGroup.children[0]);
  }
  const built = buildAccessoryGroup(config.accessory, config.shirtColor);
  while (built.children.length > 0) {
    rig.accessoryGroup.add(built.children[0]);
  }
}

export function animateRobloxRig(
  rig: RobloxAvatarRig,
  state: RobloxAnimState,
  dt: number,
  elapsed: number,
  speedRatio = 1,
) {
  const damp = THREE.MathUtils.damp;
  const lambda = 12;

  // Target joint angles
  let hipsY = rig.baseHipsY;
  let hipsRotZ = 0;
  let upperTorsoRotX = 0;
  let upperTorsoRotY = 0;
  let upperTorsoRotZ = 0;
  let headRotX = 0;
  let headRotY = 0;
  let headRotZ = 0;

  let lArmX = 0;
  let lArmZ = 0.08;
  let lElbowX = -0.08;
  let rArmX = 0;
  let rArmZ = -0.08;
  let rElbowX = -0.08;

  let lLegX = 0;
  let lLegZ = 0;
  let lKneeX = 0;
  let lFootX = 0;
  let rLegX = 0;
  let rLegZ = 0;
  let rKneeX = 0;
  let rFootX = 0;

  if (state === 'IDLE') {
    const breathe = Math.sin(elapsed * 2.2);
    const look = Math.sin(elapsed * 0.85) * 0.18;
    hipsY = rig.baseHipsY + breathe * 0.025;
    upperTorsoRotX = 0.02 + breathe * 0.02;
    headRotY = look;
    headRotX = Math.sin(elapsed * 1.4) * 0.04;
    lArmZ = 0.12 + breathe * 0.02;
    rArmZ = -0.12 - breathe * 0.02;
    lElbowX = -0.14;
    rElbowX = -0.14;
  } else if (state === 'WALK' || state === 'RUN') {
    const isRun = state === 'RUN';
    const freq = isRun ? 11.5 : 7.6;
    rig.animPhase += dt * freq * Math.max(0.55, speedRatio);
    const p = rig.animPhase;
    const stride = isRun ? 0.92 : 0.56;
    const armSwing = isRun ? 1.02 : 0.58;

    hipsY = rig.baseHipsY + Math.abs(Math.sin(p)) * (isRun ? 0.14 : 0.065);
    hipsRotZ = Math.cos(p) * (isRun ? 0.06 : 0.03);
    upperTorsoRotX = isRun ? 0.18 : 0.06;
    upperTorsoRotY = Math.sin(p) * (isRun ? 0.16 : 0.08);

    lLegX = Math.sin(p) * stride;
    rLegX = -Math.sin(p) * stride;
    // Bend knee cleanly during swing recovery
    lKneeX = Math.max(0, -Math.cos(p)) * (isRun ? 1.15 : 0.62);
    rKneeX = Math.max(0, Math.cos(p)) * (isRun ? 1.15 : 0.62);
    lFootX = Math.cos(p) * 0.16;
    rFootX = -Math.cos(p) * 0.16;

    lArmX = -Math.sin(p) * armSwing;
    rArmX = Math.sin(p) * armSwing;
    lArmZ = isRun ? 0.2 : 0.12;
    rArmZ = isRun ? -0.2 : -0.12;
    lElbowX = isRun ? -0.78 - Math.max(0, Math.sin(p)) * 0.35 : -0.28;
    rElbowX = isRun ? -0.78 - Math.max(0, -Math.sin(p)) * 0.35 : -0.28;
  } else if (state === 'JUMP') {
    hipsY = rig.baseHipsY + 0.04;
    upperTorsoRotX = -0.06;
    lArmX = -2.35;
    rArmX = -2.35;
    lArmZ = 0.25;
    rArmZ = -0.25;
    lElbowX = -0.22;
    rElbowX = -0.22;
    lLegX = -0.45;
    lKneeX = 0.65;
    rLegX = 0.22;
    rKneeX = 0.25;
  } else if (state === 'FALL') {
    const flail = Math.sin(elapsed * 12) * 0.16;
    upperTorsoRotX = 0.1;
    lArmX = -1.65 + flail;
    rArmX = -1.65 - flail;
    lArmZ = 0.55;
    rArmZ = -0.55;
    lElbowX = -0.4;
    rElbowX = -0.4;
    lLegX = -0.3 + flail * 0.5;
    lKneeX = 0.55;
    rLegX = 0.2 - flail * 0.5;
    rKneeX = 0.45;
  } else if (state === 'CLIMB') {
    rig.animPhase += dt * 9.0;
    const p = rig.animPhase;
    hipsY = rig.baseHipsY + Math.sin(p * 2) * 0.05;
    lArmX = -2.1 + Math.sin(p) * 0.55;
    rArmX = -2.1 - Math.sin(p) * 0.55;
    lElbowX = -0.7;
    rElbowX = -0.7;
    lLegX = -0.5 - Math.sin(p) * 0.45;
    rLegX = -0.5 + Math.sin(p) * 0.45;
    lKneeX = 0.85;
    rKneeX = 0.85;
  } else if (state === 'WAVE') {
    const wave = Math.sin(elapsed * 10);
    rArmX = -2.55;
    rArmZ = -0.35 + wave * 0.35;
    rElbowX = -0.45 + wave * 0.22;
    lArmZ = 0.14;
    headRotZ = -0.08;
    headRotY = 0.12;
  } else if (state === 'DANCE') {
    const beat = elapsed * 8.2;
    hipsY = rig.baseHipsY + Math.abs(Math.sin(beat)) * 0.16;
    hipsRotZ = Math.sin(beat * 0.5) * 0.16;
    upperTorsoRotZ = -Math.sin(beat * 0.5) * 0.18;
    upperTorsoRotY = Math.cos(beat * 0.5) * 0.25;
    headRotZ = Math.sin(beat * 0.5) * 0.14;
    lArmX = -1.2 + Math.sin(beat) * 0.7;
    rArmX = -1.2 - Math.sin(beat) * 0.7;
    lArmZ = 0.45;
    rArmZ = -0.45;
    lElbowX = -0.85;
    rElbowX = -0.85;
    lLegX = Math.max(0, Math.sin(beat)) * 0.4;
    lKneeX = Math.max(0, Math.sin(beat)) * 0.65;
    rLegX = Math.max(0, -Math.sin(beat)) * 0.4;
    rKneeX = Math.max(0, -Math.sin(beat)) * 0.65;
  } else if (state === 'CHEER') {
    const jump = Math.abs(Math.sin(elapsed * 7.2));
    hipsY = rig.baseHipsY + jump * 0.28;
    lArmX = -2.75 + Math.sin(elapsed * 14) * 0.15;
    rArmX = -2.75 - Math.sin(elapsed * 14) * 0.15;
    lArmZ = 0.35;
    rArmZ = -0.35;
    lKneeX = jump * 0.35;
    rKneeX = jump * 0.35;
  } else if (state === 'SIT') {
    hipsY = rig.baseHipsY - 0.62;
    upperTorsoRotX = -0.06;
    lLegX = -1.42;
    rLegX = -1.42;
    lLegZ = -0.08;
    rLegZ = 0.08;
    lKneeX = 0.45;
    rKneeX = 0.45;
    lArmX = -0.25;
    rArmX = -0.25;
    lArmZ = 0.22;
    rArmZ = -0.22;
  }

  // Landing squash recovery
  rig.landingSquash = damp(rig.landingSquash, 0, 14, dt);
  const scaleY = 1 - rig.landingSquash * 0.18;
  const scaleXZ = 1 + rig.landingSquash * 0.12;
  rig.root.scale.set(scaleXZ, scaleY, scaleXZ);

  rig.hips.position.y = damp(rig.hips.position.y, hipsY, lambda, dt);
  rig.hips.rotation.z = damp(rig.hips.rotation.z, hipsRotZ, lambda, dt);
  rig.upperTorso.rotation.x = damp(rig.upperTorso.rotation.x, upperTorsoRotX, lambda, dt);
  rig.upperTorso.rotation.y = damp(rig.upperTorso.rotation.y, upperTorsoRotY, lambda, dt);
  rig.upperTorso.rotation.z = damp(rig.upperTorso.rotation.z, upperTorsoRotZ, lambda, dt);

  rig.head.rotation.x = damp(rig.head.rotation.x, headRotX, lambda, dt);
  rig.head.rotation.y = damp(rig.head.rotation.y, headRotY, lambda, dt);
  rig.head.rotation.z = damp(rig.head.rotation.z, headRotZ, lambda, dt);

  rig.leftUpperArm.rotation.x = damp(rig.leftUpperArm.rotation.x, lArmX, lambda, dt);
  rig.leftUpperArm.rotation.z = damp(rig.leftUpperArm.rotation.z, lArmZ, lambda, dt);
  rig.leftLowerArm.rotation.x = damp(rig.leftLowerArm.rotation.x, lElbowX, lambda, dt);

  rig.rightUpperArm.rotation.x = damp(rig.rightUpperArm.rotation.x, rArmX, lambda, dt);
  rig.rightUpperArm.rotation.z = damp(rig.rightUpperArm.rotation.z, rArmZ, lambda, dt);
  rig.rightLowerArm.rotation.x = damp(rig.rightLowerArm.rotation.x, rElbowX, lambda, dt);

  rig.leftUpperLeg.rotation.x = damp(rig.leftUpperLeg.rotation.x, lLegX, lambda, dt);
  rig.leftUpperLeg.rotation.z = damp(rig.leftUpperLeg.rotation.z, lLegZ, lambda, dt);
  rig.leftLowerLeg.rotation.x = damp(rig.leftLowerLeg.rotation.x, lKneeX, lambda, dt);
  rig.leftFoot.rotation.x = damp(rig.leftFoot.rotation.x, lFootX, lambda, dt);

  rig.rightUpperLeg.rotation.x = damp(rig.rightUpperLeg.rotation.x, rLegX, lambda, dt);
  rig.rightUpperLeg.rotation.z = damp(rig.rightUpperLeg.rotation.z, rLegZ, lambda, dt);
  rig.rightLowerLeg.rotation.x = damp(rig.rightLowerLeg.rotation.x, rKneeX, lambda, dt);
  rig.rightFoot.rotation.x = damp(rig.rightFoot.rotation.x, rFootX, lambda, dt);
}
