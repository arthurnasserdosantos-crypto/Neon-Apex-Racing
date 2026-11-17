/**
 * Procedural 3D Cyber Arena Architecture for Cyber Strike 3D
 */

import * as THREE from 'three';

export interface BoundingBoxDef {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export interface JumpPadDef {
  position: THREE.Vector3;
  radius: number;
  launchVelocityY: number;
}

export interface PickupStationDef {
  id: string;
  type: 'health' | 'shield';
  position: THREE.Vector3;
  meshGroup: THREE.Group;
  active: boolean;
  respawnTimeMs: number;
}

export interface ArenaBuildResult {
  rootGroup: THREE.Group;
  colliders: BoundingBoxDef[];
  jumpPads: JumpPadDef[];
  pickupStations: PickupStationDef[];
  enemySpawnPoints: THREE.Vector3[];
}

export function buildShooterArena(): ArenaBuildResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'ShooterArena';

  const colliders: BoundingBoxDef[] = [];
  const jumpPads: JumpPadDef[] = [];
  const pickupStations: PickupStationDef[] = [];
  const enemySpawnPoints: THREE.Vector3[] = [];

  // Helper to add box collider
  const addBoxCollider = (
    centerX: number,
    centerY: number,
    centerZ: number,
    sizeX: number,
    sizeY: number,
    sizeZ: number,
  ) => {
    colliders.push({
      min: new THREE.Vector3(centerX - sizeX / 2, centerY - sizeY / 2, centerZ - sizeZ / 2),
      max: new THREE.Vector3(centerX + sizeX / 2, centerY + sizeY / 2, centerZ + sizeZ / 2),
    });
  };

  // Materials
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x141820,
    roughness: 0.7,
    metalness: 0.8,
  });

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x1a2130,
    roughness: 0.6,
    metalness: 0.65,
  });

  const catwalkMat = new THREE.MeshStandardMaterial({
    color: 0x242d3d,
    roughness: 0.5,
    metalness: 0.85,
  });

  const cyanEmissiveMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
  });

  const orangeEmissiveMat = new THREE.MeshBasicMaterial({
    color: 0xff7700,
  });

  const purpleEmissiveMat = new THREE.MeshBasicMaterial({
    color: 0xa855f7,
  });

  // 1. Floor (80m x 80m)
  const floorGeo = new THREE.PlaneGeometry(90, 90, 32, 32);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0d1117,
    roughness: 0.8,
    metalness: 0.5,
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  rootGroup.add(floorMesh);

  // Floor Grid Overlay
  const gridHelper = new THREE.GridHelper(90, 45, 0x00f0ff, 0x1c2b3d);
  gridHelper.position.y = 0.02;
  rootGroup.add(gridHelper);

  // 2. Perimeter Boundary Walls
  const wallHeight = 14;
  const arenaHalf = 45;

  // North, South, East, West walls
  const wallDefs = [
    { x: 0, z: -arenaHalf, w: 90, d: 2, rot: 0 },
    { x: 0, z: arenaHalf, w: 90, d: 2, rot: 0 },
    { x: -arenaHalf, z: 0, w: 2, d: 90, rot: 0 },
    { x: arenaHalf, z: 0, w: 2, d: 90, rot: 0 },
  ];

  wallDefs.forEach((w) => {
    const wallGeo = new THREE.BoxGeometry(w.w, wallHeight, w.d);
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.set(w.x, wallHeight / 2, w.z);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    rootGroup.add(wallMesh);
    addBoxCollider(w.x, wallHeight / 2, w.z, w.w, wallHeight, w.d);

    // Neon Accent Line near top of wall
    const neonGeo = new THREE.BoxGeometry(w.w, 0.4, w.d + 0.1);
    const neonMesh = new THREE.Mesh(neonGeo, cyanEmissiveMat);
    neonMesh.position.set(w.x, wallHeight - 1.2, w.z);
    rootGroup.add(neonMesh);
  });

  // 3. Central Monolith / Energy Core Structure
  const centerGroup = new THREE.Group();
  centerGroup.position.set(0, 0, 0);

  const centerBaseGeo = new THREE.CylinderGeometry(5, 6, 2, 8);
  const centerBase = new THREE.Mesh(centerBaseGeo, darkMetalMat);
  centerBase.position.y = 1;
  centerGroup.add(centerBase);
  addBoxCollider(0, 1, 0, 10, 2, 10);

  const centerPillarGeo = new THREE.CylinderGeometry(2.5, 3.2, 10, 8);
  const centerPillar = new THREE.Mesh(centerPillarGeo, darkMetalMat);
  centerPillar.position.y = 7;
  centerGroup.add(centerPillar);
  addBoxCollider(0, 7, 0, 5, 10, 5);

  const coreGlowGeo = new THREE.SphereGeometry(1.4, 16, 16);
  const coreGlow = new THREE.Mesh(coreGlowGeo, orangeEmissiveMat);
  coreGlow.position.y = 6.5;
  centerGroup.add(coreGlow);

  rootGroup.add(centerGroup);

  // 4. Elevated Catwalks & Platforms
  // 4 elevated sniper bridges on the sides
  const platformY = 5.0;
  const platformDefs = [
    { x: 0, z: -26, w: 28, d: 6 },
    { x: 0, z: 26, w: 28, d: 6 },
    { x: -26, z: 0, w: 6, d: 28 },
    { x: 26, z: 0, w: 6, d: 28 },
  ];

  platformDefs.forEach((p) => {
    // Platform deck
    const platGeo = new THREE.BoxGeometry(p.w, 0.8, p.d);
    const platMesh = new THREE.Mesh(platGeo, catwalkMat);
    platMesh.position.set(p.x, platformY, p.z);
    rootGroup.add(platMesh);
    addBoxCollider(p.x, platformY, p.z, p.w, 0.8, p.d);

    // Support pillars
    const pilGeo = new THREE.CylinderGeometry(0.5, 0.5, platformY, 8);
    const pil1 = new THREE.Mesh(pilGeo, darkMetalMat);
    pil1.position.set(p.x - p.w * 0.35, platformY / 2, p.z);
    const pil2 = new THREE.Mesh(pilGeo, darkMetalMat);
    pil2.position.set(p.x + p.w * 0.35, platformY / 2, p.z);
    rootGroup.add(pil1);
    rootGroup.add(pil2);
    addBoxCollider(p.x - p.w * 0.35, platformY / 2, p.z, 1.2, platformY, 1.2);
    addBoxCollider(p.x + p.w * 0.35, platformY / 2, p.z, 1.2, platformY, 1.2);

    // Guard rails
    const railMat = cyanEmissiveMat;
    const railGeo = new THREE.BoxGeometry(p.w, 0.2, 0.2);
    const rail1 = new THREE.Mesh(railGeo, railMat);
    rail1.position.set(p.x, platformY + 1.1, p.z - p.d / 2);
    const rail2 = new THREE.Mesh(railGeo, railMat);
    rail2.position.set(p.x, platformY + 1.1, p.z + p.d / 2);
    rootGroup.add(rail1);
    rootGroup.add(rail2);
  });

  // 5. Tactical Cover Blocks (Crates & Barriers)
  const coverBlocks = [
    // Near center
    { x: -10, z: -10, w: 3, h: 2.2, d: 1.5, rot: 0.4 },
    { x: 10, z: -10, w: 3, h: 2.2, d: 1.5, rot: -0.4 },
    { x: -10, z: 10, w: 3, h: 2.2, d: 1.5, rot: -0.4 },
    { x: 10, z: 10, w: 3, h: 2.2, d: 1.5, rot: 0.4 },

    // Outer zones
    { x: -18, z: -18, w: 4, h: 3.0, d: 2, rot: 0 },
    { x: 18, z: -18, w: 4, h: 3.0, d: 2, rot: 0 },
    { x: -18, z: 18, w: 4, h: 3.0, d: 2, rot: 0 },
    { x: 18, z: 18, w: 4, h: 3.0, d: 2, rot: 0 },

    // Midfield chokepoints
    { x: 0, z: -15, w: 6, h: 1.8, d: 1.2, rot: 0 },
    { x: 0, z: 15, w: 6, h: 1.8, d: 1.2, rot: 0 },
    { x: -15, z: 0, w: 1.2, h: 1.8, d: 6, rot: 0 },
    { x: 15, z: 0, w: 1.2, h: 1.8, d: 6, rot: 0 },
  ];

  coverBlocks.forEach((c) => {
    const crateGeo = new THREE.BoxGeometry(c.w, c.h, c.d);
    const crateMesh = new THREE.Mesh(crateGeo, wallMat);
    crateMesh.position.set(c.x, c.h / 2, c.z);
    crateMesh.rotation.y = c.rot;
    crateMesh.castShadow = true;
    crateMesh.receiveShadow = true;
    rootGroup.add(crateMesh);

    // Hazard stripe line
    const stripeGeo = new THREE.BoxGeometry(c.w * 0.9, 0.15, c.d + 0.05);
    const stripeMesh = new THREE.Mesh(stripeGeo, orangeEmissiveMat);
    stripeMesh.position.set(c.x, c.h - 0.4, c.z);
    stripeMesh.rotation.y = c.rot;
    rootGroup.add(stripeMesh);

    // Collider (use AABB approximation for rotated boxes)
    const maxDimension = Math.max(c.w, c.d);
    addBoxCollider(c.x, c.h / 2, c.z, maxDimension, c.h, maxDimension);
  });

  // 6. Jump Pads (Launch player up onto high catwalks!)
  const jumpPadLocations = [
    new THREE.Vector3(0, 0, -19),
    new THREE.Vector3(0, 0, 19),
    new THREE.Vector3(-19, 0, 0),
    new THREE.Vector3(19, 0, 0),
  ];

  jumpPadLocations.forEach((pos) => {
    const padGroup = new THREE.Group();
    padGroup.position.copy(pos);

    // Base rim
    const rimGeo = new THREE.CylinderGeometry(1.8, 2.0, 0.25, 16);
    const rimMesh = new THREE.Mesh(rimGeo, darkMetalMat);
    rimMesh.position.y = 0.125;
    padGroup.add(rimMesh);

    // Glowing core
    const coreGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.28, 16);
    const coreMesh = new THREE.Mesh(coreGeo, cyanEmissiveMat);
    coreMesh.position.y = 0.14;
    padGroup.add(coreMesh);

    // Vertical indicator ring
    const beamGeo = new THREE.CylinderGeometry(1.2, 1.2, 3, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.y = 1.5;
    padGroup.add(beamMesh);

    rootGroup.add(padGroup);

    jumpPads.push({
      position: pos.clone(),
      radius: 1.8,
      launchVelocityY: 14.5, // launches high onto catwalk
    });
  });

  // 7. Health & Plasma Shield Pickup Stations
  const pickupDefs: Array<{ id: string; type: 'health' | 'shield'; pos: THREE.Vector3 }> = [
    { id: 'hp_1', type: 'health', pos: new THREE.Vector3(-22, 0.8, -22) },
    { id: 'hp_2', type: 'health', pos: new THREE.Vector3(22, 0.8, 22) },
    { id: 'shield_1', type: 'shield', pos: new THREE.Vector3(22, 0.8, -22) },
    { id: 'shield_2', type: 'shield', pos: new THREE.Vector3(-22, 0.8, 22) },
  ];

  pickupDefs.forEach((p) => {
    const stationGroup = new THREE.Group();
    stationGroup.position.copy(p.pos);

    // Station Pedestal
    const baseGeo = new THREE.CylinderGeometry(1.0, 1.2, 0.5, 12);
    const baseMesh = new THREE.Mesh(baseGeo, darkMetalMat);
    baseMesh.position.y = -0.4;
    stationGroup.add(baseMesh);

    // Floating Orb / Crystal
    const isHp = p.type === 'health';
    const orbGeo = isHp ? new THREE.BoxGeometry(0.7, 0.7, 0.7) : new THREE.OctahedronGeometry(0.65);
    const orbMat = new THREE.MeshStandardMaterial({
      color: isHp ? 0x10b981 : 0x00f0ff,
      emissive: isHp ? 0x059669 : 0x0088ff,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.7,
    });
    const orbMesh = new THREE.Mesh(orbGeo, orbMat);
    orbMesh.position.y = 0.5;
    stationGroup.add(orbMesh);

    rootGroup.add(stationGroup);

    pickupStations.push({
      id: p.id,
      type: p.type,
      position: p.pos.clone(),
      meshGroup: stationGroup,
      active: true,
      respawnTimeMs: 0,
    });
  });

  // 8. Enemy Spawn Coordinates
  enemySpawnPoints.push(
    new THREE.Vector3(-30, 2, -30),
    new THREE.Vector3(30, 2, -30),
    new THREE.Vector3(-30, 2, 30),
    new THREE.Vector3(30, 2, 30),
    new THREE.Vector3(0, 6, -34),
    new THREE.Vector3(0, 6, 34),
    new THREE.Vector3(-34, 6, 0),
    new THREE.Vector3(34, 6, 0),
  );

  return {
    rootGroup,
    colliders,
    jumpPads,
    pickupStations,
    enemySpawnPoints,
  };
}
