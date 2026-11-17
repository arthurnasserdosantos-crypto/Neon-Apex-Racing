import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { CustomGltfCity } from './CustomGltfCity';
import { CarGeometrySet, createCarGeometrySet, disposeCarGeometrySet } from '../utils/carGeometry';
import {
  clearTrafficInitialized,
  MAX_TRAFFIC_CARS,
  resetTrafficVehicles,
  stepTrafficSimulation,
  trafficVehicles,
} from '../utils/freeRoamTraffic';
import {
  CityBuilding,
  FREE_ROAM_BEACONS,
  FREE_ROAM_BOUNDS,
  FREE_ROAM_BUILDINGS,
  FREE_ROAM_CITY_BLOCKS,
  FREE_ROAM_CONTAINERS,
  FREE_ROAM_GANTRIES,
  FREE_ROAM_PARKED_CARS,
  FREE_ROAM_PYLONS,
  FREE_ROAM_RAMPS,
  FREE_ROAM_ROADS,
  FREE_ROAM_ROAD_COORDS,
  FREE_ROAM_TRAFFIC_SIGNALS,
  FREE_ROAM_TREES,
  getActiveFreeRoamBeacons,
  STREETLIGHT_POLES,
} from '../utils/freeRoamWorld';

const TOTAL_STREET_CARS = FREE_ROAM_PARKED_CARS.length + MAX_TRAFFIC_CARS;

// Pre-allocated transforms & colors for zero-GC per-frame traffic instancing
const _streetDummy = new THREE.Object3D();
const _streetColor = new THREE.Color();
const _brakeColorOn = new THREE.Color('#ff2e2e');
const _brakeColorIdle = new THREE.Color('#8f1414');

const WHEEL_OFFSETS: ReadonlyArray<{
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
}> = [
  { x: -0.86, y: 0.355, z: -1.35, sx: 1.0, sy: 1.0, sz: 1.0 },
  { x: 0.86, y: 0.355, z: -1.35, sx: 1.0, sy: 1.0, sz: 1.0 },
  { x: -0.88, y: 0.37, z: 1.35, sx: 1.12, sy: 1.04, sz: 1.04 },
  { x: 0.88, y: 0.37, z: 1.35, sx: 1.12, sy: 1.04, sz: 1.04 },
];

function createFacadeTexture(
  kind: 'skyscraper' | 'commercial' | 'apartment' | 'warehouse',
): THREE.CanvasTexture {
  const w = 128;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  if (kind === 'warehouse') {
    ctx.fillStyle = '#333944';
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) {
      ctx.fillStyle = x % 16 === 0 ? '#272c35' : '#3d4552';
      ctx.fillRect(x, 0, 4, h);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, 0, w, 12);
    ctx.fillRect(0, h - 14, w, 14);
  } else {
    ctx.fillStyle = kind === 'apartment' ? '#2c303a' : '#161b24';
    ctx.fillRect(0, 0, w, h);

    const cols = kind === 'apartment' ? 6 : 8;
    const rows = kind === 'apartment' ? 12 : 16;
    const padX = 3;
    const padY = 4;
    const cellW = w / cols;
    const cellH = h / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const seed = (r * 31 + c * 17 + (kind === 'skyscraper' ? 7 : 13)) % 19;
        let winColor = '#1e2736';
        if (kind === 'skyscraper') {
          if (seed < 5) winColor = '#7dd3fc';
          else if (seed < 9) winColor = '#fde68a';
          else if (seed < 12) winColor = '#334155';
        } else if (kind === 'commercial') {
          if (seed < 6) winColor = '#bae6fd';
          else if (seed < 10) winColor = '#fef08a';
          else winColor = '#283344';
        } else {
          if (seed < 6) winColor = '#fef08a';
          else if (seed < 9) winColor = '#fed7aa';
          else winColor = '#1d222c';
        }

        ctx.fillStyle = winColor;
        ctx.fillRect(
          c * cellW + padX,
          r * cellH + padY,
          Math.max(2, cellW - padX * 2),
          Math.max(2, cellH - padY * 2),
        );
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (kind === 'skyscraper') tex.repeat.set(2, 4);
  else if (kind === 'commercial') tex.repeat.set(2, 2);
  else if (kind === 'apartment') tex.repeat.set(2, 2);
  else tex.repeat.set(4, 1);
  return tex;
}

/**
 * Unit pitched gabled roof geometry (width = 1, height = 1, depth = 1, ridge along Z).
 * Base sits at y = 0, peak at y = 1.
 */
function createGabledRoofGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.54, 0);
  shape.lineTo(0.54, 0);
  shape.lineTo(0, 1);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1.08,
    bevelEnabled: false,
  });
  geo.translate(0, 0, -0.54);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Unit sloped wedge ramp geometry (width = 1, height = 1, length = 1; low edge at +Z, high edge at -Z).
 */
function createWedgeRampGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0.5, 0);
  shape.lineTo(-0.5, 1);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    bevelEnabled: false,
  });
  geo.translate(0, 0, -0.5);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function getFacingAngleY(facing?: CityBuilding['facing']): number {
  if (facing === 'N') return Math.PI;
  if (facing === 'E') return Math.PI / 2;
  if (facing === 'W') return -Math.PI / 2;
  return 0;
}

interface SculptedShowcaseCarProps {
  position: [number, number, number];
  color: string;
  rimColor: string;
  hasWing: boolean;
  carGeos: CarGeometrySet;
  carGlassMat: THREE.MeshStandardMaterial;
  carTrimMat: THREE.MeshStandardMaterial;
  carTireMat: THREE.MeshStandardMaterial;
  splitterGeo: THREE.BufferGeometry;
  headlightGeo: THREE.BufferGeometry;
  taillightGeo: THREE.BufferGeometry;
}

function SculptedShowcaseCar({
  position,
  color,
  rimColor,
  hasWing,
  carGeos,
  carGlassMat,
  carTrimMat,
  carTireMat,
  splitterGeo,
  headlightGeo,
  taillightGeo,
}: SculptedShowcaseCarProps) {
  return (
    <group position={position}>
      {/* Central monocoque & roofline */}
      <mesh geometry={carGeos.centerBody} castShadow>
        <meshStandardMaterial color={color} metalness={0.72} roughness={0.18} />
      </mesh>
      <mesh geometry={carGeos.roofCap} castShadow>
        <meshStandardMaterial color={color} metalness={0.72} roughness={0.18} />
      </mesh>

      {/* Left & right sculpted fenders with wheel-arch cutouts */}
      <mesh geometry={carGeos.sideFender} position={[-0.78, 0, 0]} castShadow>
        <meshStandardMaterial color={color} metalness={0.72} roughness={0.18} />
      </mesh>
      <mesh geometry={carGeos.sideFender} position={[0.78, 0, 0]} castShadow>
        <meshStandardMaterial color={color} metalness={0.72} roughness={0.18} />
      </mesh>

      {/* Tinted wraparound cabin glass */}
      <mesh geometry={carGeos.cabinGlass} material={carGlassMat} />

      {/* Front aero splitter & rear diffuser */}
      <mesh geometry={splitterGeo} position={[0, 0.23, -2.14]} material={carTrimMat} />
      <mesh geometry={splitterGeo} position={[0, 0.28, 2.13]} material={carTrimMat} />

      {/* Headlights & full-width taillight bar */}
      <mesh geometry={headlightGeo} position={[-0.66, 0.5, -2.11]}>
        <meshBasicMaterial color="#e0f2fe" />
      </mesh>
      <mesh geometry={headlightGeo} position={[0.66, 0.5, -2.11]}>
        <meshBasicMaterial color="#e0f2fe" />
      </mesh>
      <mesh geometry={taillightGeo} position={[0, 0.65, 2.18]}>
        <meshBasicMaterial color="#ef4444" />
      </mesh>

      {/* Optional GT Rear Wing (or clean street spoiler lip) */}
      {hasWing && (
        <group>
          <mesh geometry={carGeos.rearWingBlade} position={[0, 1.01, 1.94]} material={carTrimMat} />
          <mesh position={[-0.54, 0.87, 1.94]} material={carTrimMat}>
            <boxGeometry args={[0.06, 0.28, 0.24]} />
          </mesh>
          <mesh position={[0.54, 0.87, 1.94]} material={carTrimMat}>
            <boxGeometry args={[0.06, 0.28, 0.24]} />
          </mesh>
          <mesh position={[-0.94, 1.01, 1.94]} material={carTrimMat}>
            <boxGeometry args={[0.04, 0.18, 0.42]} />
          </mesh>
          <mesh position={[0.94, 1.01, 1.94]} material={carTrimMat}>
            <boxGeometry args={[0.04, 0.18, 0.42]} />
          </mesh>
        </group>
      )}

      {/* 4 Profiled Performance Wheels */}
      {WHEEL_OFFSETS.map((w, idx) => (
        <group key={`sc-w-${idx}`} position={[w.x, w.y, w.z]} scale={[w.sx, w.sy, w.sz]}>
          <mesh geometry={carGeos.tire} material={carTireMat} castShadow />
          <mesh geometry={carGeos.rimLip}>
            <meshStandardMaterial color={rimColor} metalness={0.88} roughness={0.18} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function FreeRoamCity() {
  const [hasCustomGltfCity, setHasCustomGltfCity] = useState(false);

  const {
    skyTex,
    commTex,
    aptTex,
    wareTex,
    roofGeo,
    rampGeo,
    unitBoxGeo,
    unitPlaneGeo,
    dashGeo,
    crosswalkGeo,
    poleGeo,
    armGeo,
    lampGeo,
    trunkGeo,
    foliageLowGeo,
    foliageTopGeo,
    containerGeo,
    carGeos,
    headlightGeo,
    taillightGeo,
    splitterGeo,
    signalHeadGeo,
    beaconRingGeo,
    beaconPadGeo,
    beaconColGeo,
    beaconGemGeo,
    sharedMats,
  } = useMemo(() => {
    const sTex = createFacadeTexture('skyscraper');
    const cTex = createFacadeTexture('commercial');
    const aTex = createFacadeTexture('apartment');
    const wTex = createFacadeTexture('warehouse');

    return {
      skyTex: sTex,
      commTex: cTex,
      aptTex: aTex,
      wareTex: wTex,
      roofGeo: createGabledRoofGeometry(),
      rampGeo: createWedgeRampGeometry(),
      unitBoxGeo: new THREE.BoxGeometry(1, 1, 1),
      unitPlaneGeo: new THREE.PlaneGeometry(1, 1),
      dashGeo: new THREE.PlaneGeometry(0.34, 6.0),
      crosswalkGeo: new THREE.PlaneGeometry(12, 2.5),
      poleGeo: new THREE.CylinderGeometry(0.09, 0.13, 7.6, 8),
      armGeo: new THREE.CylinderGeometry(0.06, 0.06, 1.7, 6),
      lampGeo: new THREE.BoxGeometry(0.46, 0.14, 0.26),
      trunkGeo: new THREE.CylinderGeometry(0.24, 0.36, 2.4, 6),
      foliageLowGeo: new THREE.ConeGeometry(2.3, 4.2, 7),
      foliageTopGeo: new THREE.ConeGeometry(1.75, 3.4, 7),
      containerGeo: new THREE.BoxGeometry(2.5, 2.6, 6.2),
      carGeos: createCarGeometrySet(),
      headlightGeo: new THREE.BoxGeometry(0.32, 0.07, 0.08),
      taillightGeo: new THREE.BoxGeometry(1.66, 0.075, 0.08),
      splitterGeo: new THREE.BoxGeometry(1.88, 0.065, 0.24),
      signalHeadGeo: new THREE.BoxGeometry(0.45, 1.25, 0.45),
      beaconRingGeo: new THREE.RingGeometry(0.94, 1.0, 32),
      beaconPadGeo: new THREE.CircleGeometry(0.93, 32),
      beaconColGeo: new THREE.CylinderGeometry(0.7, 0.9, 12, 20, 1, true),
      beaconGemGeo: new THREE.OctahedronGeometry(0.85, 0),
      sharedMats: {
        skyscraper: new THREE.MeshStandardMaterial({
          map: sTex,
          color: '#d4dce8',
          roughness: 0.34,
          metalness: 0.52,
        }),
        commercial: new THREE.MeshStandardMaterial({
          map: cTex,
          color: '#d4dce8',
          roughness: 0.55,
          metalness: 0.28,
        }),
        apartment: new THREE.MeshStandardMaterial({
          map: aTex,
          color: '#d4dce8',
          roughness: 0.72,
          metalness: 0.15,
        }),
        warehouse: new THREE.MeshStandardMaterial({
          map: wTex,
          color: '#cbd5e1',
          roughness: 0.74,
          metalness: 0.24,
        }),
        foundation: new THREE.MeshStandardMaterial({
          color: '#111317',
          roughness: 0.85,
        }),
        darkTrim: new THREE.MeshStandardMaterial({
          color: '#181e27',
          roughness: 0.5,
          metalness: 0.4,
        }),
        roadStd: new THREE.MeshStandardMaterial({
          color: '#1b1f27',
          roughness: 0.83,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        }),
        roadHwy: new THREE.MeshStandardMaterial({
          color: '#151920',
          roughness: 0.82,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        }),
        dealershipGlass: new THREE.MeshStandardMaterial({
          color: '#38bdf8',
          emissive: '#0284c7',
          emissiveIntensity: 0.42,
          roughness: 0.12,
          metalness: 0.82,
          transparent: true,
          opacity: 0.78,
        }),
        carGlass: new THREE.MeshStandardMaterial({
          color: '#0b0e14',
          roughness: 0.08,
          metalness: 0.9,
        }),
        carTrim: new THREE.MeshStandardMaterial({
          color: '#14171f',
          roughness: 0.45,
          metalness: 0.45,
        }),
        carTire: new THREE.MeshStandardMaterial({
          color: '#16161a',
          roughness: 0.86,
          metalness: 0.05,
        }),
        carRim: new THREE.MeshStandardMaterial({
          color: '#d4d4d8',
          roughness: 0.22,
          metalness: 0.85,
        }),
      },
    };
  }, []);

  useEffect(() => {
    return () => {
      skyTex.dispose();
      commTex.dispose();
      aptTex.dispose();
      wareTex.dispose();
      roofGeo.dispose();
      rampGeo.dispose();
      unitBoxGeo.dispose();
      unitPlaneGeo.dispose();
      dashGeo.dispose();
      crosswalkGeo.dispose();
      poleGeo.dispose();
      armGeo.dispose();
      lampGeo.dispose();
      trunkGeo.dispose();
      foliageLowGeo.dispose();
      foliageTopGeo.dispose();
      containerGeo.dispose();
      disposeCarGeometrySet(carGeos);
      headlightGeo.dispose();
      taillightGeo.dispose();
      splitterGeo.dispose();
      signalHeadGeo.dispose();
      beaconRingGeo.dispose();
      beaconPadGeo.dispose();
      beaconColGeo.dispose();
      beaconGemGeo.dispose();
      Object.values(sharedMats).forEach((m) => m.dispose());
    };
  }, [
    skyTex,
    commTex,
    aptTex,
    wareTex,
    roofGeo,
    rampGeo,
    unitBoxGeo,
    unitPlaneGeo,
    dashGeo,
    crosswalkGeo,
    poleGeo,
    armGeo,
    lampGeo,
    trunkGeo,
    foliageLowGeo,
    foliageTopGeo,
    containerGeo,
    carGeos,
    headlightGeo,
    taillightGeo,
    splitterGeo,
    signalHeadGeo,
    beaconRingGeo,
    beaconPadGeo,
    beaconColGeo,
    beaconGemGeo,
    sharedMats,
  ]);

  const houses = useMemo(
    () => FREE_ROAM_BUILDINGS.filter((b) => b.type === 'house'),
    [],
  );
  const nonHouseBuildings = useMemo(
    () => FREE_ROAM_BUILDINGS.filter((b) => b.type !== 'house'),
    [],
  );

  // --- Instanced City Block Pads (36 blocks -> 1 draw call) ---
  const blockMeshRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = blockMeshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < FREE_ROAM_CITY_BLOCKS.length; i++) {
      const blk = FREE_ROAM_CITY_BLOCKS[i];
      dummy.position.set(blk.x, 0.015, blk.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(blk.w, 0.03, blk.d);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.set(
        blk.kind === 'grass'
          ? '#1c3322'
          : blk.kind === 'industrial'
          ? '#20242c'
          : '#272c36',
      );
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  // --- Instanced Road Dashes ---
  const roadDashes = useMemo(() => {
    const items: Array<{ x: number; z: number; rotZ: number }> = [];
    for (const coord of FREE_ROAM_ROAD_COORDS) {
      for (let p = -470; p <= 470; p += 14) {
        const nearCross = FREE_ROAM_ROAD_COORDS.some((c) => Math.abs(p - c) < 11);
        if (nearCross) continue;
        items.push({ x: coord, z: p, rotZ: 0 });
        items.push({ x: p, z: coord, rotZ: Math.PI / 2 });
      }
    }
    return items;
  }, []);

  const dashMeshRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = dashMeshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < roadDashes.length; i++) {
      const d = roadDashes[i];
      dummy.position.set(d.x, 0.022, d.z);
      dummy.rotation.set(-Math.PI / 2, 0, d.rotZ);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [roadDashes]);

  // --- Instanced Pedestrian Crosswalks ---
  const crosswalks = useMemo(() => {
    const list: Array<{ x: number; z: number; rotZ: number }> = [];
    for (const cx of [-300, -140, 0, 140, 300]) {
      for (const cz of [-300, -140, 0, 140, 300]) {
        const off = cx === 0 || cz === 0 ? 10.5 : 9.0;
        list.push({ x: cx, z: cz - off, rotZ: 0 });
        list.push({ x: cx, z: cz + off, rotZ: 0 });
        list.push({ x: cx - off, z: cz, rotZ: Math.PI / 2 });
        list.push({ x: cx + off, z: cz, rotZ: Math.PI / 2 });
      }
    }
    return list;
  }, []);

  const crosswalkMeshRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = crosswalkMeshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < crosswalks.length; i++) {
      const cw = crosswalks[i];
      dummy.position.set(cw.x, 0.024, cw.z);
      dummy.rotation.set(-Math.PI / 2, 0, cw.rotZ);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [crosswalks]);

  // --- Instanced Suburban Houses (ALL 57 houses in 9 draw calls total!) ---
  const houseWallsRef = useRef<THREE.InstancedMesh>(null);
  const housePlinthRef = useRef<THREE.InstancedMesh>(null);
  const houseRoofRef = useRef<THREE.InstancedMesh>(null);
  const houseChimneyRef = useRef<THREE.InstancedMesh>(null);
  const houseDoorRef = useRef<THREE.InstancedMesh>(null);
  const houseGarageRef = useRef<THREE.InstancedMesh>(null);
  const houseDrivewayRef = useRef<THREE.InstancedMesh>(null);
  const housePorchRef = useRef<THREE.InstancedMesh>(null);
  const houseWindowsRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const walls = houseWallsRef.current;
    const plinth = housePlinthRef.current;
    const roof = houseRoofRef.current;
    const chimney = houseChimneyRef.current;
    const door = houseDoorRef.current;
    const garage = houseGarageRef.current;
    const driveway = houseDrivewayRef.current;
    const porch = housePorchRef.current;
    const windows = houseWindowsRef.current;
    if (
      !walls ||
      !plinth ||
      !roof ||
      !chimney ||
      !door ||
      !garage ||
      !driveway ||
      !porch ||
      !windows
    ) {
      return;
    }

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const localVec = new THREE.Vector3();
    const yAxis = new THREE.Vector3(0, 1, 0);

    const setTransformed = (
      mesh: THREE.InstancedMesh,
      idx: number,
      bx: number,
      bz: number,
      rotY: number,
      lx: number,
      ly: number,
      lz: number,
      sx: number,
      sy: number,
      sz: number,
      extraRotX = 0,
    ) => {
      localVec.set(lx, ly, lz).applyAxisAngle(yAxis, rotY);
      dummy.position.set(bx + localVec.x, localVec.y, bz + localVec.z);
      dummy.rotation.set(extraRotX, rotY, 0);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    };

    for (let i = 0; i < houses.length; i++) {
      const b = houses[i];
      const [w, h, d] = b.size;
      const roofH = Math.max(2.1, h * 0.45);
      const rotY = getFacingAngleY(b.facing);

      // Walls
      dummy.position.set(b.x, h / 2, b.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(w, h, d);
      dummy.updateMatrix();
      walls.setMatrixAt(i, dummy.matrix);
      color.set(b.color);
      walls.setColorAt(i, color);

      // Foundation Plinth
      dummy.position.set(b.x, 0.25, b.z);
      dummy.scale.set(w + 0.3, 0.5, d + 0.3);
      dummy.updateMatrix();
      plinth.setMatrixAt(i, dummy.matrix);

      // Pitched Gabled Roof
      dummy.position.set(b.x, h - 0.04, b.z);
      dummy.scale.set(w, roofH, d);
      dummy.updateMatrix();
      roof.setMatrixAt(i, dummy.matrix);
      color.set(b.roofColor ?? '#475569');
      roof.setColorAt(i, color);

      // Brick Chimney
      dummy.position.set(b.x + w * 0.26, h + roofH * 0.62, b.z - d * 0.18);
      dummy.scale.set(0.9, roofH * 0.85, 0.9);
      dummy.updateMatrix();
      chimney.setMatrixAt(i, dummy.matrix);

      // Front Door
      setTransformed(door, i, b.x, b.z, rotY, -w * 0.18, 1.25, d / 2 + 0.06, 1.2, 2.2, 0.12);
      color.set(b.accentColor);
      door.setColorAt(i, color);

      // Porch Canopy
      setTransformed(porch, i, b.x, b.z, rotY, -w * 0.18, 2.6, d / 2 + 0.7, 2.6, 0.18, 1.4);

      // Garage Bay Door
      setTransformed(garage, i, b.x, b.z, rotY, w * 0.22, 1.35, d / 2 + 0.06, w * 0.36, 2.4, 0.12);

      // Concrete Driveway Apron
      setTransformed(
        driveway,
        i,
        b.x,
        b.z,
        rotY,
        w * 0.22,
        0.032,
        d / 2 + 4.5,
        w * 0.42,
        8.8,
        1,
        -Math.PI / 2,
      );

      // 4 Warm Lit Windows per house (2 front, 2 side)
      const wBase = i * 4;
      setTransformed(windows, wBase, b.x, b.z, rotY, -w * 0.34, h * 0.5 + 0.55, d / 2 + 0.05, 1.65, 1.25, 0.08);
      setTransformed(windows, wBase + 1, b.x, b.z, rotY, 0, h * 0.5 + 0.55, d / 2 + 0.05, 1.65, 1.25, 0.08);
      setTransformed(windows, wBase + 2, b.x, b.z, 0, -(w / 2 + 0.05), h * 0.5 + 0.4, 0, 0.08, 1.3, d * 0.48);
      setTransformed(windows, wBase + 3, b.x, b.z, 0, w / 2 + 0.05, h * 0.5 + 0.4, 0, 0.08, 1.3, d * 0.48);
    }

    [walls, plinth, roof, chimney, door, garage, driveway, porch, windows].forEach((m) => {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
  }, [houses]);

  // --- Instanced Streetlights ---
  const poleMeshRef = useRef<THREE.InstancedMesh>(null);
  const armMeshRef = useRef<THREE.InstancedMesh>(null);
  const lampMeshRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const pMesh = poleMeshRef.current;
    const aMesh = armMeshRef.current;
    const lMesh = lampMeshRef.current;
    if (!pMesh || !aMesh || !lMesh) return;

    const dummy = new THREE.Object3D();
    const localOffset = new THREE.Vector3();
    const yAxis = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < STREETLIGHT_POLES.length; i++) {
      const pole = STREETLIGHT_POLES[i];

      dummy.position.set(pole.x, 3.8, pole.z);
      dummy.rotation.set(0, pole.rotationY, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      pMesh.setMatrixAt(i, dummy.matrix);

      localOffset.set(0.7, 7.5, 0).applyAxisAngle(yAxis, pole.rotationY);
      dummy.position.set(pole.x + localOffset.x, localOffset.y, pole.z + localOffset.z);
      dummy.rotation.set(0, pole.rotationY, -Math.PI / 6);
      dummy.updateMatrix();
      aMesh.setMatrixAt(i, dummy.matrix);

      localOffset.set(1.38, 7.82, 0).applyAxisAngle(yAxis, pole.rotationY);
      dummy.position.set(pole.x + localOffset.x, localOffset.y, pole.z + localOffset.z);
      dummy.rotation.set(0, pole.rotationY, 0);
      dummy.updateMatrix();
      lMesh.setMatrixAt(i, dummy.matrix);
    }
    pMesh.instanceMatrix.needsUpdate = true;
    aMesh.instanceMatrix.needsUpdate = true;
    lMesh.instanceMatrix.needsUpdate = true;
  }, []);

  // --- Instanced Trees ---
  const trunkMeshRef = useRef<THREE.InstancedMesh>(null);
  const foliageLowMeshRef = useRef<THREE.InstancedMesh>(null);
  const foliageTopMeshRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const tMesh = trunkMeshRef.current;
    const flMesh = foliageLowMeshRef.current;
    const ftMesh = foliageTopMeshRef.current;
    if (!tMesh || !flMesh || !ftMesh) return;

    const dummy = new THREE.Object3D();
    const tints = [
      new THREE.Color('#166534'),
      new THREE.Color('#15803d'),
      new THREE.Color('#14532d'),
    ];
    for (let i = 0; i < FREE_ROAM_TREES.length; i++) {
      const t = FREE_ROAM_TREES[i];
      const s = t.scale;

      dummy.position.set(t.x, 1.2 * s, t.z);
      dummy.rotation.set(0, (i * 0.7) % Math.PI, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      tMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(t.x, 3.6 * s, t.z);
      dummy.updateMatrix();
      flMesh.setMatrixAt(i, dummy.matrix);
      flMesh.setColorAt(i, tints[t.tint % tints.length]);

      dummy.position.set(t.x, 5.4 * s, t.z);
      dummy.updateMatrix();
      ftMesh.setMatrixAt(i, dummy.matrix);
      ftMesh.setColorAt(i, tints[(t.tint + 1) % tints.length]);
    }
    tMesh.instanceMatrix.needsUpdate = true;
    flMesh.instanceMatrix.needsUpdate = true;
    ftMesh.instanceMatrix.needsUpdate = true;
    if (flMesh.instanceColor) flMesh.instanceColor.needsUpdate = true;
    if (ftMesh.instanceColor) ftMesh.instanceColor.needsUpdate = true;
  }, []);

  // --- Instanced Shipping Containers ---
  const containerMeshRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = containerMeshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < FREE_ROAM_CONTAINERS.length; i++) {
      const c = FREE_ROAM_CONTAINERS[i];
      dummy.position.set(c.x, c.y, c.z);
      dummy.rotation.set(0, c.rotationY, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.set(c.color);
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  // --- Instanced Sculpted Street Cars (Parked Props + Live AI Traffic in 8 draw calls total) ---
  const streetBodyRef = useRef<THREE.InstancedMesh>(null);
  const streetFenderRef = useRef<THREE.InstancedMesh>(null);
  const streetRoofRef = useRef<THREE.InstancedMesh>(null);
  const streetGlassRef = useRef<THREE.InstancedMesh>(null);
  const streetTireRef = useRef<THREE.InstancedMesh>(null);
  const streetRimRef = useRef<THREE.InstancedMesh>(null);
  const streetHeadlightRef = useRef<THREE.InstancedMesh>(null);
  const streetTaillightRef = useRef<THREE.InstancedMesh>(null);

  const writeStreetCarSlot = (
    slot: number,
    x: number,
    z: number,
    yaw: number,
    colorHex: string,
    isBraking: boolean,
    visible: boolean,
  ) => {
    const bodyMesh = streetBodyRef.current;
    const fenderMesh = streetFenderRef.current;
    const roofMesh = streetRoofRef.current;
    const glassMesh = streetGlassRef.current;
    const tireMesh = streetTireRef.current;
    const rimMesh = streetRimRef.current;
    const headMesh = streetHeadlightRef.current;
    const tailMesh = streetTaillightRef.current;
    if (
      !bodyMesh ||
      !fenderMesh ||
      !roofMesh ||
      !glassMesh ||
      !tireMesh ||
      !rimMesh ||
      !headMesh ||
      !tailMesh
    ) {
      return;
    }

    if (!visible) {
      _streetDummy.position.set(0, -100, 0);
      _streetDummy.rotation.set(0, 0, 0);
      _streetDummy.scale.set(0, 0, 0);
      _streetDummy.updateMatrix();
      bodyMesh.setMatrixAt(slot, _streetDummy.matrix);
      roofMesh.setMatrixAt(slot, _streetDummy.matrix);
      glassMesh.setMatrixAt(slot, _streetDummy.matrix);
      tailMesh.setMatrixAt(slot, _streetDummy.matrix);
      fenderMesh.setMatrixAt(slot * 2, _streetDummy.matrix);
      fenderMesh.setMatrixAt(slot * 2 + 1, _streetDummy.matrix);
      headMesh.setMatrixAt(slot * 2, _streetDummy.matrix);
      headMesh.setMatrixAt(slot * 2 + 1, _streetDummy.matrix);
      for (let w = 0; w < 4; w++) {
        tireMesh.setMatrixAt(slot * 4 + w, _streetDummy.matrix);
        rimMesh.setMatrixAt(slot * 4 + w, _streetDummy.matrix);
      }
      return;
    }

    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);

    // Center monocoque, roofline, cabin glass
    _streetDummy.position.set(x, 0, z);
    _streetDummy.rotation.set(0, yaw, 0);
    _streetDummy.scale.set(1, 1, 1);
    _streetDummy.updateMatrix();
    bodyMesh.setMatrixAt(slot, _streetDummy.matrix);
    roofMesh.setMatrixAt(slot, _streetDummy.matrix);
    glassMesh.setMatrixAt(slot, _streetDummy.matrix);

    _streetColor.set(colorHex);
    bodyMesh.setColorAt(slot, _streetColor);
    roofMesh.setColorAt(slot, _streetColor);

    // Left & Right Sculpted Side Fenders (x = ±0.78)
    for (let s = 0; s < 2; s++) {
      const lx = s === 0 ? -0.78 : 0.78;
      _streetDummy.position.set(x + lx * cosY, 0, z - lx * sinY);
      _streetDummy.rotation.set(0, yaw, 0);
      _streetDummy.scale.set(1, 1, 1);
      _streetDummy.updateMatrix();
      fenderMesh.setMatrixAt(slot * 2 + s, _streetDummy.matrix);
      fenderMesh.setColorAt(slot * 2 + s, _streetColor);
    }

    // 4 Profiled Performance Wheels (tires + alloy rims)
    for (let w = 0; w < 4; w++) {
      const wo = WHEEL_OFFSETS[w];
      _streetDummy.position.set(
        x + wo.x * cosY + wo.z * sinY,
        wo.y,
        z - wo.x * sinY + wo.z * cosY,
      );
      _streetDummy.rotation.set(0, yaw, 0);
      _streetDummy.scale.set(wo.sx, wo.sy, wo.sz);
      _streetDummy.updateMatrix();
      tireMesh.setMatrixAt(slot * 4 + w, _streetDummy.matrix);
      rimMesh.setMatrixAt(slot * 4 + w, _streetDummy.matrix);
    }

    // Left & Right Headlight Pods (lx = ±0.66, ly = 0.50, lz = -2.11)
    for (let h = 0; h < 2; h++) {
      const lx = h === 0 ? -0.66 : 0.66;
      const lz = -2.11;
      _streetDummy.position.set(x + lx * cosY + lz * sinY, 0.50, z - lx * sinY + lz * cosY);
      _streetDummy.rotation.set(0, yaw, 0);
      _streetDummy.scale.set(1, 1, 1);
      _streetDummy.updateMatrix();
      headMesh.setMatrixAt(slot * 2 + h, _streetDummy.matrix);
    }

    // Full-Width Rear LED Taillight Bar (lx = 0, ly = 0.65, lz = +2.18)
    _streetDummy.position.set(x + 2.18 * sinY, 0.65, z + 2.18 * cosY);
    _streetDummy.rotation.set(0, yaw, 0);
    _streetDummy.scale.set(1, 1, 1);
    _streetDummy.updateMatrix();
    tailMesh.setMatrixAt(slot, _streetDummy.matrix);
    tailMesh.setColorAt(slot, isBraking ? _brakeColorOn : _brakeColorIdle);
  };

  useEffect(() => {
    resetTrafficVehicles(useGameStore.getState().trafficCount);
    return () => {
      clearTrafficInitialized();
    };
  }, []);

  useLayoutEffect(() => {
    // Populate static parked cars in slots [0 .. FREE_ROAM_PARKED_CARS.length - 1]
    for (let i = 0; i < FREE_ROAM_PARKED_CARS.length; i++) {
      const p = FREE_ROAM_PARKED_CARS[i];
      writeStreetCarSlot(i, p.x, p.z, p.rotationY, p.color, false, !hasCustomGltfCity);
    }
    // Hide traffic slots initially until first useFrame step
    for (let i = 0; i < MAX_TRAFFIC_CARS; i++) {
      writeStreetCarSlot(FREE_ROAM_PARKED_CARS.length + i, 0, 0, 0, '#ffffff', false, false);
    }

    [
      streetBodyRef.current,
      streetFenderRef.current,
      streetRoofRef.current,
      streetGlassRef.current,
      streetTireRef.current,
      streetRimRef.current,
      streetHeadlightRef.current,
      streetTaillightRef.current,
    ].forEach((m) => {
      if (!m) return;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
  }, [hasCustomGltfCity]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const trafficCount = useGameStore.getState().trafficCount;
    stepTrafficSimulation(dt, trafficCount);

    for (let i = 0; i < MAX_TRAFFIC_CARS; i++) {
      const v = trafficVehicles[i];
      const slot = FREE_ROAM_PARKED_CARS.length + i;
      writeStreetCarSlot(slot, v.x, v.z, v.yaw, v.color, v.isBraking, v.active);
    }

    [
      streetBodyRef.current,
      streetFenderRef.current,
      streetRoofRef.current,
      streetGlassRef.current,
      streetTireRef.current,
      streetRimRef.current,
      streetHeadlightRef.current,
      streetTaillightRef.current,
    ].forEach((m) => {
      if (!m) return;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
  });

  // --- Instanced Traffic Signals ---
  const sigPoleRef = useRef<THREE.InstancedMesh>(null);
  const sigHeadRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const pMesh = sigPoleRef.current;
    const hMesh = sigHeadRef.current;
    if (!pMesh || !hMesh) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < FREE_ROAM_TRAFFIC_SIGNALS.length; i++) {
      const s = FREE_ROAM_TRAFFIC_SIGNALS[i];
      dummy.position.set(s.x, 2.7, s.z);
      dummy.rotation.set(0, s.rotationY, 0);
      dummy.scale.set(0.95, 0.72, 0.95);
      dummy.updateMatrix();
      pMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(s.x, 5.2, s.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      hMesh.setMatrixAt(i, dummy.matrix);
    }
    pMesh.instanceMatrix.needsUpdate = true;
    hMesh.instanceMatrix.needsUpdate = true;
  }, []);

  // --- Instanced World Beacons (Zero dynamic pointLights; 4 fast instanced draw calls) ---
  const beaconRingRef = useRef<THREE.InstancedMesh>(null);
  const beaconPadRef = useRef<THREE.InstancedMesh>(null);
  const beaconColRef = useRef<THREE.InstancedMesh>(null);
  const beaconGemRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const rMesh = beaconRingRef.current;
    const pMesh = beaconPadRef.current;
    const cMesh = beaconColRef.current;
    const gMesh = beaconGemRef.current;
    if (!rMesh || !pMesh || !cMesh || !gMesh) return;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const beacons = getActiveFreeRoamBeacons();
    for (let i = 0; i < beacons.length; i++) {
      const b = beacons[i];
      color.set(b.color);

      dummy.position.set(b.x, 0.025, b.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(b.radius, b.radius, 1);
      dummy.updateMatrix();
      rMesh.setMatrixAt(i, dummy.matrix);
      rMesh.setColorAt(i, color);

      dummy.position.set(b.x, 0.023, b.z);
      dummy.updateMatrix();
      pMesh.setMatrixAt(i, dummy.matrix);
      pMesh.setColorAt(i, color);

      dummy.position.set(b.x, 6, b.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(b.radius, 1, b.radius);
      dummy.updateMatrix();
      cMesh.setMatrixAt(i, dummy.matrix);
      cMesh.setColorAt(i, color);

      dummy.position.set(b.x, 4.5, b.z);
      dummy.rotation.set(0.4, 0.4, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      gMesh.setMatrixAt(i, dummy.matrix);
      gMesh.setColorAt(i, color);
    }

    [rMesh, pMesh, cMesh, gMesh].forEach((m) => {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
  }, [hasCustomGltfCity]);

  return (
    <group>
      {/* --- CUSTOM USER GLTF/GLB CITY MODEL (automatically activates when valid .glb or .gltf+.bin exists) --- */}
      <CustomGltfCity onLoadedChange={setHasCustomGltfCity} />

      {/* --- PROCEDURAL CITY LAYOUT (active when no complete custom glTF/GLB city is loaded) --- */}
      <group visible={!hasCustomGltfCity}>
        {/* --- INSTANCED CITY BLOCK PADS --- */}
        <instancedMesh
          ref={blockMeshRef}
          args={[unitBoxGeo, undefined, FREE_ROAM_CITY_BLOCKS.length]}
          receiveShadow
        >
          <meshStandardMaterial color="#ffffff" roughness={0.9} />
        </instancedMesh>

      {/* --- INTERCONNECTED 1120x1120 ASPHALT ROAD GRID --- */}
      {FREE_ROAM_ROADS.map((road, idx) => (
        <mesh
          key={`road-${idx}`}
          position={[
            road.axis === 'x' ? road.coord : 0,
            0.018,
            road.axis === 'z' ? road.coord : 0,
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={road.isHighway ? sharedMats.roadHwy : sharedMats.roadStd}
          receiveShadow
        >
          <planeGeometry
            args={road.axis === 'x' ? [road.width, road.length] : [road.length, road.width]}
          />
        </mesh>
      ))}

      {/* Instanced Yellow Centerline Dashes & Crosswalks */}
      <instancedMesh ref={dashMeshRef} args={[dashGeo, undefined, roadDashes.length]}>
        <meshBasicMaterial color="#facc15" polygonOffset polygonOffsetFactor={-2} />
      </instancedMesh>
      <instancedMesh ref={crosswalkMeshRef} args={[crosswalkGeo, undefined, crosswalks.length]}>
        <meshBasicMaterial color="#e4e4e7" polygonOffset polygonOffsetFactor={-3} />
      </instancedMesh>

      {/* --- CENTRAL NORTH URBAN PARK PLAZA & MONUMENT (x: -71, z: -220) --- */}
      <group position={[-71, 0.032, -220]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[10, 118]} />
          <meshStandardMaterial color="#333945" roughness={0.85} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[118, 10]} />
          <meshStandardMaterial color="#333945" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.35, 0]} receiveShadow>
          <cylinderGeometry args={[8.5, 9.2, 0.7, 20]} />
          <meshStandardMaterial color="#3f4654" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[7.4, 20]} />
          <meshBasicMaterial color="#0ea5e9" />
        </mesh>
        <mesh position={[0, 2.8, 0]}>
          <octahedronGeometry args={[1.6, 0]} />
          <meshBasicMaterial color="#ff9900" />
        </mesh>
      </group>

      {/* --- INSTANCED SUBURBAN HOUSES (57 detailed homes in 9 draw calls, collision via OBB cache) --- */}
      <instancedMesh ref={houseWallsRef} args={[unitBoxGeo, undefined, houses.length]} receiveShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.82} metalness={0.05} />
      </instancedMesh>
      <instancedMesh ref={housePlinthRef} args={[unitBoxGeo, sharedMats.foundation, houses.length]} />
      <instancedMesh ref={houseRoofRef} args={[roofGeo, undefined, houses.length]}>
        <meshStandardMaterial color="#ffffff" roughness={0.78} metalness={0.1} />
      </instancedMesh>
      <instancedMesh ref={houseChimneyRef} args={[unitBoxGeo, undefined, houses.length]}>
        <meshStandardMaterial color="#7c2d12" roughness={0.88} />
      </instancedMesh>
      <instancedMesh ref={houseDoorRef} args={[unitBoxGeo, undefined, houses.length]}>
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={housePorchRef} args={[unitBoxGeo, sharedMats.darkTrim, houses.length]} />
      <instancedMesh ref={houseGarageRef} args={[unitBoxGeo, undefined, houses.length]}>
        <meshStandardMaterial color="#475569" roughness={0.55} metalness={0.25} />
      </instancedMesh>
      <instancedMesh ref={houseDrivewayRef} args={[unitPlaneGeo, undefined, houses.length]}>
        <meshStandardMaterial color="#3b424d" roughness={0.9} polygonOffset polygonOffsetFactor={-1} />
      </instancedMesh>
      <instancedMesh ref={houseWindowsRef} args={[unitBoxGeo, undefined, houses.length * 4]}>
        <meshBasicMaterial color="#fde047" />
      </instancedMesh>

      {/* --- SKYSCRAPERS, COMMERCIAL TOWERS, APARTMENTS, WAREHOUSES & LANDMARKS (OBB-collidable) --- */}
      {nonHouseBuildings.map((b) => {
        const facadeMat =
          b.type === 'skyscraper'
            ? sharedMats.skyscraper
            : b.type === 'commercial'
            ? sharedMats.commercial
            : b.type === 'residential'
            ? sharedMats.apartment
            : b.type === 'warehouse'
            ? sharedMats.warehouse
            : null;

        return (
          <group key={b.id} position={[b.x, b.size[1] / 2, b.z]}>
            {/* Main Building Monolith */}
            <mesh material={facadeMat ?? undefined} receiveShadow>
              <boxGeometry args={b.size} />
              {!facadeMat && (
                <meshStandardMaterial color={b.color} roughness={0.7} metalness={0.22} />
              )}
            </mesh>

            {/* Base Foundation */}
            <mesh position={[0, -b.size[1] / 2 + 0.7, 0]} material={sharedMats.foundation}>
              <boxGeometry args={[b.size[0] + 0.45, 1.4, b.size[2] + 0.45]} />
            </mesh>

            {/* Skyscraper Crown, Corner Pillars & Aviation Beacon */}
            {b.type === 'skyscraper' && (
              <group>
                {[-1, 1].map((sx, xi) =>
                  [-1, 1].map((sz, zi) => (
                    <mesh
                      key={`col-${xi}-${zi}`}
                      position={[(b.size[0] / 2) * sx, 0, (b.size[2] / 2) * sz]}
                    >
                      <boxGeometry args={[0.48, b.size[1] * 0.99, 0.48]} />
                      <meshBasicMaterial color={b.accentColor} />
                    </mesh>
                  )),
                )}
                <mesh position={[0, b.size[1] / 2 + 2.2, 0]} material={sharedMats.darkTrim}>
                  <boxGeometry args={[b.size[0] * 0.62, 4.4, b.size[2] * 0.62]} />
                </mesh>
                <mesh position={[0, b.size[1] / 2 + 8.0, 0]} material={sharedMats.darkTrim}>
                  <cylinderGeometry args={[0.08, 0.28, 7.5, 6]} />
                </mesh>
                <mesh position={[0, b.size[1] / 2 + 11.8, 0]}>
                  <sphereGeometry args={[0.34, 8, 8]} />
                  <meshBasicMaterial color="#ef4444" />
                </mesh>
              </group>
            )}

            {/* Commercial Parapet & Ground Canopy */}
            {b.type === 'commercial' && (
              <group>
                <mesh position={[0, b.size[1] / 2 + 0.45, 0]} material={sharedMats.darkTrim}>
                  <boxGeometry args={[b.size[0] * 0.96, 0.9, b.size[2] * 0.96]} />
                </mesh>
                <mesh position={[0, -b.size[1] / 2 + 3.4, b.size[2] / 2 + 1.0]}>
                  <boxGeometry args={[b.size[0] * 0.7, 0.35, 2.0]} />
                  <meshBasicMaterial color={b.accentColor} />
                </mesh>
              </group>
            )}

            {/* Residential Apartment Rooftop Water Tank & Stair Bulkhead */}
            {b.type === 'residential' && (
              <group>
                <mesh position={[b.size[0] * 0.25, b.size[1] / 2 + 1.4, b.size[2] * 0.2]} material={sharedMats.darkTrim}>
                  <cylinderGeometry args={[1.3, 1.3, 2.8, 10]} />
                </mesh>
                <mesh position={[-b.size[0] * 0.22, b.size[1] / 2 + 1.1, -b.size[2] * 0.18]} material={sharedMats.darkTrim}>
                  <boxGeometry args={[4.5, 2.2, 4.5]} />
                </mesh>
              </group>
            )}

            {/* Warehouse Gabled Roof & Loading Bays */}
            {b.type === 'warehouse' && (
              <group>
                <mesh
                  geometry={roofGeo}
                  position={[0, b.size[1] / 2 - 0.05, 0]}
                  scale={[b.size[0], 3.2, b.size[2]]}
                  material={sharedMats.darkTrim}
                />
                <mesh position={[0, -b.size[1] / 2 + 2.6, b.size[2] / 2 + 0.06]} material={sharedMats.foundation}>
                  <boxGeometry args={[b.size[0] * 0.72, 3.6, 0.12]} />
                </mesh>
                <mesh position={[0, -b.size[1] / 2 + 4.6, b.size[2] / 2 + 0.12]}>
                  <boxGeometry args={[b.size[0] * 0.76, 0.42, 0.14]} />
                  <meshBasicMaterial color={b.accentColor} />
                </mesh>
              </group>
            )}

            {/* CENTRAL GARAGE HQ LANDMARK BRANDING */}
            {b.type === 'garage_hq' && (
              <group>
                <mesh position={[0, b.size[1] / 2 - 1.2, b.size[2] / 2 + 0.12]} material={sharedMats.foundation}>
                  <boxGeometry args={[16, 1.9, 0.22]} />
                </mesh>
                <mesh position={[0, b.size[1] / 2 - 1.2, b.size[2] / 2 + 0.25]}>
                  <boxGeometry args={[15.2, 1.25, 0.06]} />
                  <meshBasicMaterial color="#FF9900" />
                </mesh>
                {[-5.2, 5.2].map((xPos, di) => (
                  <mesh key={`gdoor-${di}`} position={[xPos, -b.size[1] / 2 + 2.3, b.size[2] / 2 + 0.08]}>
                    <boxGeometry args={[6.2, 4.4, 0.14]} />
                    <meshStandardMaterial color="#27272a" metalness={0.65} roughness={0.3} />
                  </mesh>
                ))}
              </group>
            )}

            {/* APEX DEALERSHIP / CAR LOT LANDMARK BRANDING (no transmission pass!) */}
            {b.type === 'dealership' && (
              <group>
                <mesh position={[0, b.size[1] / 2 - 1.2, b.size[2] / 2 + 0.12]} material={sharedMats.foundation}>
                  <boxGeometry args={[18, 2.0, 0.22]} />
                </mesh>
                <mesh position={[0, b.size[1] / 2 - 1.2, b.size[2] / 2 + 0.25]}>
                  <boxGeometry args={[17.0, 1.3, 0.06]} />
                  <meshBasicMaterial color="#00B0FF" />
                </mesh>
                <mesh position={[0, -0.5, b.size[2] / 2 + 0.08]} material={sharedMats.dealershipGlass}>
                  <planeGeometry args={[22, 5.2]} />
                </mesh>
              </group>
            )}

            {/* NEON PIT-STOP GAS STATION CANOPY & PUMPS */}
            {b.type === 'gas_station' && (
              <group>
                <mesh position={[0, b.size[1] / 2 - 0.8, b.size[2] / 2 + 0.15]}>
                  <boxGeometry args={[14, 0.9, 0.15]} />
                  <meshBasicMaterial color="#f97316" />
                </mesh>
                <mesh position={[0, 1.6, b.size[2] / 2 + 7.5]} material={sharedMats.darkTrim}>
                  <boxGeometry args={[22, 0.9, 11]} />
                </mesh>
                <mesh position={[0, 1.6, b.size[2] / 2 + 13.05]}>
                  <boxGeometry args={[22, 0.55, 0.15]} />
                  <meshBasicMaterial color="#FF9900" />
                </mesh>
                {[-6.5, 6.5].map((px, pi) => (
                  <group key={`pump-${pi}`} position={[px, -b.size[1] / 2, b.size[2] / 2 + 7.5]}>
                    <mesh position={[0, 2.3, 0]}>
                      <cylinderGeometry args={[0.3, 0.35, 4.6, 8]} />
                      <meshStandardMaterial color="#e4e4e7" metalness={0.6} />
                    </mesh>
                    <mesh position={[2.4 * (px < 0 ? 1 : -1), 0.9, 0]}>
                      <boxGeometry args={[1.1, 1.8, 0.8]} />
                      <meshStandardMaterial color="#dc2626" roughness={0.4} />
                    </mesh>
                  </group>
                ))}
              </group>
            )}
          </group>
        );
      })}

      {/* --- CAR LOT OUTDOOR SHOWCASE PEDESTALS (Beside Dealership off West Avenue) --- */}
      <group position={[-62, 0, -14]} rotation={[0, 0.3, 0]}>
        <mesh position={[0, 0.22, 0]} receiveShadow>
          <cylinderGeometry args={[3.0, 3.2, 0.44, 24]} />
          <meshStandardMaterial color="#1a1c22" metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.445, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.8, 3.0, 24]} />
          <meshBasicMaterial color="#00B0FF" />
        </mesh>
        <SculptedShowcaseCar
          position={[0, 0.44, 0]}
          color="#059669"
          rimColor="#18181b"
          hasWing
          carGeos={carGeos}
          carGlassMat={sharedMats.carGlass}
          carTrimMat={sharedMats.carTrim}
          carTireMat={sharedMats.carTire}
          splitterGeo={splitterGeo}
          headlightGeo={headlightGeo}
          taillightGeo={taillightGeo}
        />
      </group>

      <group position={[-90, 0, -14]} rotation={[0, -0.3, 0]}>
        <mesh position={[0, 0.22, 0]} receiveShadow>
          <cylinderGeometry args={[3.0, 3.2, 0.44, 24]} />
          <meshStandardMaterial color="#1a1c22" metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.445, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.8, 3.0, 24]} />
          <meshBasicMaterial color="#FF9900" />
        </mesh>
        <SculptedShowcaseCar
          position={[0, 0.44, 0]}
          color="#d97706"
          rimColor="#e4e4e7"
          hasWing={false}
          carGeos={carGeos}
          carGlassMat={sharedMats.carGlass}
          carTrimMat={sharedMats.carTrim}
          carTireMat={sharedMats.carTire}
          splitterGeo={splitterGeo}
          headlightGeo={headlightGeo}
          taillightGeo={taillightGeo}
        />
      </group>

      {/* --- OVERHEAD HIGHWAY SIGN GANTRIES --- */}
      {FREE_ROAM_GANTRIES.map((g, i) => (
        <group key={`gantry-${i}`} position={[g.x, 0, g.z]} rotation={[0, g.rotationY, 0]}>
          <mesh position={[-g.width / 2, 4.1, 0]}>
            <cylinderGeometry args={[0.25, 0.3, 8.2, 8]} />
            <meshStandardMaterial color="#3f4652" metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[g.width / 2, 4.1, 0]}>
            <cylinderGeometry args={[0.25, 0.3, 8.2, 8]} />
            <meshStandardMaterial color="#3f4652" metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0, 7.6, 0]}>
            <boxGeometry args={[g.width + 0.8, 0.75, 0.65]} />
            <meshStandardMaterial color="#272c36" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 7.2, 0]}>
            <boxGeometry args={[11.5, 2.0, 0.82]} />
            <meshStandardMaterial color="#065f46" roughness={0.4} />
          </mesh>
          <mesh position={[0, 6.3, 0]}>
            <boxGeometry args={[11.5, 0.2, 0.88]} />
            <meshBasicMaterial color={g.labelColor} />
          </mesh>
        </group>
      ))}

        {/* --- DRIVEABLE URBAN STUNT RAMPS --- */}
        {!hasCustomGltfCity &&
          FREE_ROAM_RAMPS.map((r, i) => {
            const slopeAngle = Math.atan2(r.height, r.length);
            const slopeLen = Math.hypot(r.length, r.height);
            return (
              <RigidBody
                key={`ramp-${i}`}
                type="fixed"
                colliders={false}
                friction={0}
                position={[r.x, 0, r.z]}
                rotation={[0, r.rotationY, 0]}
              >
                <CuboidCollider
                  args={[r.width * 0.5, 0.14, slopeLen * 0.5]}
                  position={[0, r.height * 0.5 - 0.1, 0]}
                  rotation={[slopeAngle, 0, 0]}
                  friction={0}
                />
                <mesh geometry={rampGeo} scale={[r.width, r.height, r.length]} castShadow receiveShadow>
                  <meshStandardMaterial color="#272c36" roughness={0.7} metalness={0.25} />
                </mesh>
                <mesh position={[0, r.height - 0.08, -r.length / 2 + 0.25]}>
                  <boxGeometry args={[r.width, 0.16, 0.5]} />
                  <meshBasicMaterial color="#FF9900" />
                </mesh>
              </RigidBody>
            );
          })}

        {/* --- SLALOM DRIFT PYLONS --- */}
        {!hasCustomGltfCity &&
          FREE_ROAM_PYLONS.map((p, i) => (
            <RigidBody key={`pylon-${i}`} type="dynamic" mass={2} position={[p.x, 0.5, p.z]}>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.25, 0.45, 1.0, 8]} />
                <meshStandardMaterial color="#f97316" roughness={0.4} />
              </mesh>
            </RigidBody>
          ))}

      {/* --- INSTANCED TREES --- */}
      <instancedMesh ref={trunkMeshRef} args={[trunkGeo, undefined, FREE_ROAM_TREES.length]}>
        <meshStandardMaterial color="#5c4033" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={foliageLowMeshRef} args={[foliageLowGeo, undefined, FREE_ROAM_TREES.length]}>
        <meshStandardMaterial color="#ffffff" roughness={0.82} />
      </instancedMesh>
      <instancedMesh ref={foliageTopMeshRef} args={[foliageTopGeo, undefined, FREE_ROAM_TREES.length]}>
        <meshStandardMaterial color="#ffffff" roughness={0.82} />
      </instancedMesh>

      {/* --- INSTANCED STREETLIGHTS --- */}
      <instancedMesh ref={poleMeshRef} args={[poleGeo, undefined, STREETLIGHT_POLES.length]}>
        <meshStandardMaterial color="#1c1f26" metalness={0.7} roughness={0.3} />
      </instancedMesh>
      <instancedMesh ref={armMeshRef} args={[armGeo, undefined, STREETLIGHT_POLES.length]}>
        <meshStandardMaterial color="#1c1f26" metalness={0.7} roughness={0.3} />
      </instancedMesh>
      <instancedMesh ref={lampMeshRef} args={[lampGeo, undefined, STREETLIGHT_POLES.length]}>
        <meshBasicMaterial color="#fef08a" />
      </instancedMesh>

        {/* --- INSTANCED SHIPPING CONTAINERS --- */}
        <instancedMesh
          ref={containerMeshRef}
          args={[containerGeo, undefined, FREE_ROAM_CONTAINERS.length]}
          receiveShadow
        >
          <meshStandardMaterial map={wareTex} color="#ffffff" roughness={0.62} metalness={0.28} />
        </instancedMesh>
      </group>

      {/* --- INSTANCED SCULPTED STREET CARS (PARKED + DYNAMIC AI TRAFFIC) --- */}
      <instancedMesh
        ref={streetBodyRef}
        args={[carGeos.centerBody, undefined, TOTAL_STREET_CARS]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#ffffff" metalness={0.62} roughness={0.22} />
      </instancedMesh>
      <instancedMesh
        ref={streetFenderRef}
        args={[carGeos.sideFender, undefined, TOTAL_STREET_CARS * 2]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#ffffff" metalness={0.62} roughness={0.22} />
      </instancedMesh>
      <instancedMesh
        ref={streetRoofRef}
        args={[carGeos.roofCap, undefined, TOTAL_STREET_CARS]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#ffffff" metalness={0.62} roughness={0.22} />
      </instancedMesh>
      <instancedMesh
        ref={streetGlassRef}
        args={[carGeos.cabinGlass, sharedMats.carGlass, TOTAL_STREET_CARS]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={streetTireRef}
        args={[carGeos.tire, sharedMats.carTire, TOTAL_STREET_CARS * 4]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={streetRimRef}
        args={[carGeos.rimLip, sharedMats.carRim, TOTAL_STREET_CARS * 4]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={streetHeadlightRef}
        args={[headlightGeo, undefined, TOTAL_STREET_CARS * 2]}
        frustumCulled={false}
      >
        <meshBasicMaterial color="#e0f2fe" />
      </instancedMesh>
      <instancedMesh
        ref={streetTaillightRef}
        args={[taillightGeo, undefined, TOTAL_STREET_CARS]}
        frustumCulled={false}
      >
        <meshBasicMaterial color="#ffffff" />
      </instancedMesh>

      {/* --- INSTANCED TRAFFIC SIGNALS --- */}
      <group visible={!hasCustomGltfCity}>
        <instancedMesh ref={sigPoleRef} args={[poleGeo, undefined, FREE_ROAM_TRAFFIC_SIGNALS.length]}>
          <meshStandardMaterial color="#272c36" metalness={0.7} roughness={0.35} />
        </instancedMesh>
        <instancedMesh ref={sigHeadRef} args={[signalHeadGeo, undefined, FREE_ROAM_TRAFFIC_SIGNALS.length]}>
          <meshBasicMaterial color="#f59e0b" />
        </instancedMesh>
      </group>

      {/* --- INSTANCED INTERACTIVE GLOWING WORLD BEACONS (4 draw calls total, zero pointLights) --- */}
      <instancedMesh ref={beaconRingRef} args={[beaconRingGeo, undefined, FREE_ROAM_BEACONS.length]}>
        <meshBasicMaterial color="#ffffff" polygonOffset polygonOffsetFactor={-3} />
      </instancedMesh>
      <instancedMesh ref={beaconPadRef} args={[beaconPadGeo, undefined, FREE_ROAM_BEACONS.length]}>
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.18}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </instancedMesh>
      <instancedMesh ref={beaconColRef} args={[beaconColGeo, undefined, FREE_ROAM_BEACONS.length]}>
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </instancedMesh>
      <instancedMesh ref={beaconGemRef} args={[beaconGemGeo, undefined, FREE_ROAM_BEACONS.length]}>
        <meshBasicMaterial color="#ffffff" />
      </instancedMesh>

      {/* --- OUTER 1120x1120 CITY PERIMETER BOUNDARY WALLS (OBB-collidable) --- */}
      <group visible={!hasCustomGltfCity}>
        <mesh position={[FREE_ROAM_BOUNDS.centerX, 2.5, FREE_ROAM_BOUNDS.minZ]}>
          <boxGeometry args={[FREE_ROAM_BOUNDS.width, 5, 2]} />
          <meshStandardMaterial color="#1f242e" roughness={0.8} />
        </mesh>
        <mesh position={[FREE_ROAM_BOUNDS.centerX, 2.5, FREE_ROAM_BOUNDS.maxZ]}>
          <boxGeometry args={[FREE_ROAM_BOUNDS.width, 5, 2]} />
          <meshStandardMaterial color="#1f242e" roughness={0.8} />
        </mesh>
        <mesh position={[FREE_ROAM_BOUNDS.minX, 2.5, FREE_ROAM_BOUNDS.centerZ]}>
          <boxGeometry args={[2, 5, FREE_ROAM_BOUNDS.depth]} />
          <meshStandardMaterial color="#1f242e" roughness={0.8} />
        </mesh>
        <mesh position={[FREE_ROAM_BOUNDS.maxX, 2.5, FREE_ROAM_BOUNDS.centerZ]}>
          <boxGeometry args={[2, 5, FREE_ROAM_BOUNDS.depth]} />
          <meshStandardMaterial color="#1f242e" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}
