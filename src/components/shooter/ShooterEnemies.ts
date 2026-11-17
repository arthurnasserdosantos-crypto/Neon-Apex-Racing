/**
 * Enemy Definitions & Procedural 3D Models for Cyber Strike 3D
 */

import * as THREE from 'three';

export type EnemyType = 'SCOUT' | 'HUNTER' | 'MECH';

export interface EnemyEntity {
  id: string;
  type: EnemyType;
  meshGroup: THREE.Group;
  health: number;
  maxHealth: number;
  scoreValue: number;
  speed: number;
  attackIntervalMs: number;
  lastAttackTime: number;
  burstCount: number;
  burstRemaining: number;
  nextBurstTime: number;
  velocity: THREE.Vector3;
  targetPos: THREE.Vector3;
  hitFlashRemainingMs: number;
  hoverPhase: number;
}

export interface EnemyProjectile {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  damage: number;
  mesh: THREE.Mesh;
  lifeRemainingMs: number;
  isExplosive?: boolean;
}

export function createEnemyMesh(type: EnemyType): THREE.Group {
  const group = new THREE.Group();

  const darkArmorMat = new THREE.MeshStandardMaterial({
    color: 0x1f242d,
    roughness: 0.5,
    metalness: 0.85,
  });

  const glowingEyeMat = new THREE.MeshBasicMaterial({
    color: type === 'SCOUT' ? 0xff0055 : type === 'HUNTER' ? 0xff7700 : 0x00f0ff,
  });

  const thrusterMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
  });

  if (type === 'SCOUT') {
    // Agile Hover Drone (Spherical core + dual rotor pods + front gun barrel)
    const coreGeo = new THREE.SphereGeometry(0.55, 14, 14);
    const coreMesh = new THREE.Mesh(coreGeo, darkArmorMat);
    group.add(coreMesh);

    // Glowing Visor / Sensor Eye
    const eyeGeo = new THREE.BoxGeometry(0.35, 0.12, 0.2);
    const eyeMesh = new THREE.Mesh(eyeGeo, glowingEyeMat);
    eyeMesh.position.set(0, 0.1, 0.48);
    group.add(eyeMesh);

    // Dual Thrusters / Wings
    const wingGeo = new THREE.BoxGeometry(1.6, 0.08, 0.35);
    const wingMesh = new THREE.Mesh(wingGeo, darkArmorMat);
    wingMesh.position.y = 0.05;
    group.add(wingMesh);

    const podGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.4, 8);
    const podL = new THREE.Mesh(podGeo, darkArmorMat);
    podL.position.set(-0.8, 0.05, 0);
    const podR = new THREE.Mesh(podGeo, darkArmorMat);
    podR.position.set(0.8, 0.05, 0);
    group.add(podL);
    group.add(podR);

    // Thruster glow rings
    const glowGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.05, 8);
    const glowL = new THREE.Mesh(glowGeo, thrusterMat);
    glowL.position.set(-0.8, -0.16, 0);
    const glowR = new THREE.Mesh(glowGeo, thrusterMat);
    glowR.position.set(0.8, -0.16, 0);
    group.add(glowL);
    group.add(glowR);

    // Front Gun Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8);
    const barrelMesh = new THREE.Mesh(barrelGeo, darkArmorMat);
    barrelMesh.rotation.x = Math.PI / 2;
    barrelMesh.position.set(0, -0.18, 0.45);
    group.add(barrelMesh);
  } else if (type === 'HUNTER') {
    // Armored Assault Mech Drone (Triangular chassis, twin auto-cannons, heavy thrusters)
    const chassisGeo = new THREE.BoxGeometry(1.1, 0.65, 1.3);
    const chassisMesh = new THREE.Mesh(chassisGeo, darkArmorMat);
    group.add(chassisMesh);

    // Glowing Optical Array
    const eyeGeo = new THREE.BoxGeometry(0.6, 0.15, 0.1);
    const eyeMesh = new THREE.Mesh(eyeGeo, glowingEyeMat);
    eyeMesh.position.set(0, 0.08, 0.66);
    group.add(eyeMesh);

    // Twin Cannons on Left and Right
    const cannonGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8);
    const cannonL = new THREE.Mesh(cannonGeo, darkArmorMat);
    cannonL.rotation.x = Math.PI / 2;
    cannonL.position.set(-0.65, -0.1, 0.35);
    const cannonR = new THREE.Mesh(cannonGeo, darkArmorMat);
    cannonR.rotation.x = Math.PI / 2;
    cannonR.position.set(0.65, -0.1, 0.35);
    group.add(cannonL);
    group.add(cannonR);

    // Side armor sponsons
    const sponsonGeo = new THREE.BoxGeometry(0.3, 0.4, 0.8);
    const spL = new THREE.Mesh(sponsonGeo, darkArmorMat);
    spL.position.set(-0.65, 0.05, -0.1);
    const spR = new THREE.Mesh(sponsonGeo, darkArmorMat);
    spR.position.set(0.65, 0.05, -0.1);
    group.add(spL);
    group.add(spR);

    // Heavy Rear Jets
    const jetGeo = new THREE.CylinderGeometry(0.2, 0.14, 0.4, 8);
    const jetL = new THREE.Mesh(jetGeo, thrusterMat);
    jetL.rotation.x = Math.PI / 2;
    jetL.position.set(-0.35, 0, -0.7);
    const jetR = new THREE.Mesh(jetGeo, thrusterMat);
    jetR.rotation.x = Math.PI / 2;
    jetR.position.set(0.35, 0, -0.7);
    group.add(jetL);
    group.add(jetR);
  } else {
    // MECH ENFORCER - Heavy Walking/Hover Combat Mech
    const torsoGeo = new THREE.BoxGeometry(1.6, 1.4, 1.2);
    const torsoMesh = new THREE.Mesh(torsoGeo, darkArmorMat);
    torsoMesh.position.y = 1.0;
    group.add(torsoMesh);

    // Reinforced Head Visor
    const headGeo = new THREE.BoxGeometry(0.8, 0.5, 0.7);
    const headMesh = new THREE.Mesh(headGeo, darkArmorMat);
    headMesh.position.set(0, 1.9, 0.15);
    group.add(headMesh);

    const eyeGeo = new THREE.BoxGeometry(0.6, 0.12, 0.1);
    const eyeMesh = new THREE.Mesh(eyeGeo, glowingEyeMat);
    eyeMesh.position.set(0, 1.9, 0.51);
    group.add(eyeMesh);

    // Shoulder Launchers
    const launcherGeo = new THREE.BoxGeometry(0.5, 0.5, 0.8);
    const launcherL = new THREE.Mesh(launcherGeo, darkArmorMat);
    launcherL.position.set(-1.1, 1.8, 0);
    const launcherR = new THREE.Mesh(launcherGeo, darkArmorMat);
    launcherR.position.set(1.1, 1.8, 0);
    group.add(launcherL);
    group.add(launcherR);

    // Heavy Arm Cannons
    const armGeo = new THREE.CylinderGeometry(0.16, 0.14, 1.2, 8);
    const armL = new THREE.Mesh(armGeo, darkArmorMat);
    armL.rotation.x = Math.PI / 2;
    armL.position.set(-1.1, 0.9, 0.7);
    const armR = new THREE.Mesh(armGeo, darkArmorMat);
    armR.rotation.x = Math.PI / 2;
    armR.position.set(1.1, 0.9, 0.7);
    group.add(armL);
    group.add(armR);

    // Heavy Legs / Hover Pylons
    const legGeo = new THREE.BoxGeometry(0.4, 1.0, 0.5);
    const legL = new THREE.Mesh(legGeo, darkArmorMat);
    legL.position.set(-0.6, 0.1, 0);
    const legR = new THREE.Mesh(legGeo, darkArmorMat);
    legR.position.set(0.6, 0.1, 0);
    group.add(legL);
    group.add(legR);
  }

  return group;
}
