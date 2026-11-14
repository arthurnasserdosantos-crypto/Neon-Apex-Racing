import React, { useMemo, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../store';
import {
  FREE_ROAM_BOUNDS,
  FREE_ROAM_BUILDINGS,
  FREE_ROAM_BEACONS,
  STREETLIGHT_POLES,
  FREE_ROAM_PYLONS,
  CityBuilding,
  WorldBeacon,
} from '../utils/freeRoamWorld';
import { BuiltRaceTrack, getBuiltRaceTrack } from '../utils/raceTracks';

function createAsphaltTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base dark asphalt
  ctx.fillStyle = '#2d3238';
  ctx.fillRect(0, 0, size, size);

  // Subtle aggregate speckle
  for (let i = 0; i < 2400; i++) {
    const x = (i * 73) % size;
    const y = (i * 137 + Math.floor(i / 4) * 19) % size;
    const shade = 38 + (i % 24);
    ctx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 9})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Subtle grid reference lines so movement and turning are visually crisp
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(90, 90);
  tex.anisotropy = anisotropy;
  return tex;
}

function buildTrackRibbonGeometries(track: BuiltRaceTrack) {
  const { samples, roadWidth } = track;
  const n = samples.length;
  const halfW = roadWidth / 2;
  const curbWidth = 0.85;

  const roadPositions: number[] = [];
  const roadNormals: number[] = [];
  const roadUvs: number[] = [];

  const curbPositions: number[] = [];
  const curbNormals: number[] = [];
  const curbColors: number[] = [];

  const pushTri = (
    arr: number[],
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    cx: number,
    cy: number,
    cz: number,
  ) => {
    arr.push(ax, ay, az, bx, by, bz, cx, cy, cz);
  };

  const pushColorTri = (arr: number[], r: number, g: number, b: number) => {
    arr.push(r, g, b, r, g, b, r, g, b);
  };

  for (let i = 0; i < n; i++) {
    const a = samples[i];
    const b = samples[(i + 1) % n];

    const aLx = a.pos.x - a.right.x * halfW;
    const aLz = a.pos.z - a.right.z * halfW;
    const aRx = a.pos.x + a.right.x * halfW;
    const aRz = a.pos.z + a.right.z * halfW;

    const bLx = b.pos.x - b.right.x * halfW;
    const bLz = b.pos.z - b.right.z * halfW;
    const bRx = b.pos.x + b.right.x * halfW;
    const bRz = b.pos.z + b.right.z * halfW;

    const v0 = a.s * 0.12;
    const v1 = (a.s + track.sampleStep) * 0.12;

    pushTri(roadPositions, aLx, 0.014, aLz, aRx, 0.014, aRz, bLx, 0.014, bLz);
    pushTri(roadPositions, aRx, 0.014, aRz, bRx, 0.014, bRz, bLx, 0.014, bLz);
    for (let k = 0; k < 6; k++) roadNormals.push(0, 1, 0);
    roadUvs.push(0, v0, 1, v0, 0, v1, 1, v0, 1, v1, 0, v1);

    // Alternating red & white outer racing curbs
    const isRed = Math.floor(i / 2) % 2 === 0;
    const cr = isRed ? 0.86 : 0.94;
    const cg = isRed ? 0.15 : 0.95;
    const cb = isRed ? 0.15 : 0.96;

    // Left curb strip
    const aLInX = a.pos.x - a.right.x * (halfW - curbWidth);
    const aLInZ = a.pos.z - a.right.z * (halfW - curbWidth);
    const bLInX = b.pos.x - b.right.x * (halfW - curbWidth);
    const bLInZ = b.pos.z - b.right.z * (halfW - curbWidth);

    pushTri(curbPositions, aLx, 0.022, aLz, aLInX, 0.022, aLInZ, bLx, 0.022, bLz);
    pushTri(curbPositions, aLInX, 0.022, aLInZ, bLInX, 0.022, bLInZ, bLx, 0.022, bLz);
    pushColorTri(curbColors, cr, cg, cb);
    pushColorTri(curbColors, cr, cg, cb);
    for (let k = 0; k < 6; k++) curbNormals.push(0, 1, 0);

    // Right curb strip
    const aRInX = a.pos.x + a.right.x * (halfW - curbWidth);
    const aRInZ = a.pos.z + a.right.z * (halfW - curbWidth);
    const bRInX = b.pos.x + b.right.x * (halfW - curbWidth);
    const bRInZ = b.pos.z + b.right.z * (halfW - curbWidth);

    pushTri(curbPositions, aRInX, 0.022, aRInZ, aRx, 0.022, aRz, bRInX, 0.022, bRInZ);
    pushTri(curbPositions, aRx, 0.022, aRz, bRx, 0.022, bRz, bRInX, 0.022, bRInZ);
    pushColorTri(curbColors, cr, cg, cb);
    pushColorTri(curbColors, cr, cg, cb);
    for (let k = 0; k < 6; k++) curbNormals.push(0, 1, 0);
  }

  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
  roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));

  const curbGeo = new THREE.BufferGeometry();
  curbGeo.setAttribute('position', new THREE.Float32BufferAttribute(curbPositions, 3));
  curbGeo.setAttribute('normal', new THREE.Float32BufferAttribute(curbNormals, 3));
  curbGeo.setAttribute('color', new THREE.Float32BufferAttribute(curbColors, 3));

  return { roadGeo, curbGeo };
}

function CustomRaceTrack({
  track,
  asphaltTexture,
}: {
  track: BuiltRaceTrack;
  asphaltTexture: THREE.CanvasTexture;
}) {
  const { roadGeo, curbGeo } = useMemo(() => buildTrackRibbonGeometries(track), [track]);

  useEffect(() => {
    return () => {
      roadGeo.dispose();
      curbGeo.dispose();
    };
  }, [roadGeo, curbGeo]);

  // 80 barrier segments spaced evenly around loop on both left and right track edges
  const barrierSegments = useMemo(() => {
    const segCount = 80;
    const step = track.samples.length / segCount;
    const wallOffset = track.roadWidth / 2 + 1.05;
    const segLen = (track.totalLength / segCount) * 1.04;

    const list: {
      x: number;
      z: number;
      yaw: number;
      len: number;
      isLeft: boolean;
      isRed: boolean;
    }[] = [];

    for (let i = 0; i < segCount; i++) {
      const idxA = Math.floor(i * step) % track.samples.length;
      const idxB = Math.floor((i + 1) * step) % track.samples.length;
      const sA = track.samples[idxA];
      const sB = track.samples[idxB];

      const midX = (sA.pos.x + sB.pos.x) / 2;
      const midZ = (sA.pos.z + sB.pos.z) / 2;
      const dx = sB.pos.x - sA.pos.x;
      const dz = sB.pos.z - sA.pos.z;
      const yaw = Math.atan2(-dx, -dz);

      const rx = (sA.right.x + sB.right.x) / 2;
      const rz = (sA.right.z + sB.right.z) / 2;
      const rLen = Math.hypot(rx, rz) || 1;
      const nrx = rx / rLen;
      const nrz = rz / rLen;

      list.push({
        x: midX - nrx * wallOffset,
        z: midZ - nrz * wallOffset,
        yaw,
        len: segLen,
        isLeft: true,
        isRed: i % 2 === 0,
      });
      list.push({
        x: midX + nrx * wallOffset,
        z: midZ + nrz * wallOffset,
        yaw,
        len: segLen,
        isLeft: false,
        isRed: i % 2 === 0,
      });
    }
    return list;
  }, [track]);

  // Centerline dashes
  const centerDashes = useMemo(() => {
    const dashes: { x: number; z: number; yaw: number }[] = [];
    for (let i = 0; i < track.samples.length; i += 3) {
      const s = track.samples[i];
      dashes.push({
        x: s.pos.x,
        z: s.pos.z,
        yaw: Math.atan2(-s.tangent.x, -s.tangent.z),
      });
    }
    return dashes;
  }, [track]);

  // Corner warning pylons on outside of sharp bends
  const cornerMarkers = useMemo(() => {
    const markers: { x: number; z: number }[] = [];
    for (let i = 0; i < track.samples.length; i += 6) {
      const s = track.samples[i];
      if (s.curvature > 0.032) {
        const next = track.samples[(i + 4) % track.samples.length];
        const crossY = s.tangent.z * next.tangent.x - s.tangent.x * next.tangent.z;
        const outsideSign = crossY >= 0 ? -1 : 1;
        const dist = track.roadWidth / 2 + 0.35;
        markers.push({
          x: s.pos.x + s.right.x * dist * outsideSign,
          z: s.pos.z + s.right.z * dist * outsideSign,
        });
      }
    }
    return markers;
  }, [track]);

  const startSample = track.samples[0];
  const startYaw = Math.atan2(-startSample.tangent.x, -startSample.tangent.z);

  return (
    <group>
      {/* Procedural closed-circuit asphalt surface */}
      <mesh geometry={roadGeo} receiveShadow>
        <meshStandardMaterial
          map={asphaltTexture}
          color="#1e232a"
          roughness={0.82}
          metalness={0.08}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {/* Red & white curbs */}
      <mesh geometry={curbGeo} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.6} />
      </mesh>

      {/* Dashed yellow centerline */}
      {centerDashes.map((d, i) => (
        <mesh
          key={`dash-${i}`}
          position={[d.x, 0.025, d.z]}
          rotation={[-Math.PI / 2, 0, d.yaw]}
        >
          <planeGeometry args={[0.3, Math.max(1.8, track.sampleStep * 1.4)]} />
          <meshStandardMaterial
            color="#facc15"
            roughness={0.6}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
      ))}

      {/* Corner warning beacons on high-curvature turns */}
      {cornerMarkers.map((m, i) => (
        <mesh key={`corner-${i}`} position={[m.x, 0.9, m.z]} castShadow>
          <cylinderGeometry args={[0.25, 0.35, 1.8, 10]} />
          <meshStandardMaterial
            color="#f97316"
            emissive="#ea580c"
            emissiveIntensity={0.45}
            roughness={0.4}
          />
        </mesh>
      ))}

      {/* Solid physical outer walls along circuit edges */}
      {barrierSegments.map((b, i) => (
        <RigidBody
          key={`wall-${track.id}-${i}`}
          type="fixed"
          position={[b.x, 0.85, b.z]}
          rotation={[0, b.yaw, 0]}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.75, 1.7, b.len]} />
            <meshStandardMaterial color={b.isRed ? '#dc2626' : '#f4f4f5'} roughness={0.6} />
          </mesh>
        </RigidBody>
      ))}

      {/* Start / Finish Checkered Strip & Overhead Gantry */}
      <group
        position={[startSample.pos.x, 0, startSample.pos.z]}
        rotation={[0, startYaw, 0]}
      >
        <mesh position={[0, 0.028, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[track.roadWidth - 1.5, 3.6]} />
          <meshStandardMaterial color="#facc15" roughness={0.35} />
        </mesh>
        <mesh position={[-(track.roadWidth / 2 + 0.2), 3.3, 0]} castShadow>
          <boxGeometry args={[0.65, 6.6, 0.65]} />
          <meshStandardMaterial color="#18181b" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[track.roadWidth / 2 + 0.2, 3.3, 0]} castShadow>
          <boxGeometry args={[0.65, 6.6, 0.65]} />
          <meshStandardMaterial color="#18181b" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 6.3, 0]} castShadow>
          <boxGeometry args={[track.roadWidth + 1.1, 1.15, 0.85]} />
          <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={0.35} />
        </mesh>
      </group>
    </group>
  );
}

export function GameEnvironment() {
  const view = useGameStore((state) => state.view);
  const activeTrackId = useGameStore((state) => state.activeTrackId);
  const { gl } = useThree();

  const asphaltTexture = useMemo(() => {
    const maxAniso = gl.capabilities.getMaxAnisotropy();
    return createAsphaltTexture(Math.min(maxAniso, 8));
  }, [gl]);

  useEffect(() => {
    return () => asphaltTexture.dispose();
  }, [asphaltTexture]);

  const activeTrack = useMemo(() => getBuiltRaceTrack(activeTrackId), [activeTrackId]);
  const isShowroom = view === 'MENU' || view === 'GARAGE' || view === 'CAREER' || view === 'CAR_LOT';

  return (
    <group>
      {/* Solid Ground Collider (friction 0 so CarModel controls rolling/grip cleanly) */}
      <RigidBody type="fixed" friction={0} restitution={0}>
        <CuboidCollider args={[600, 0.5, 600]} position={[0, -0.5, 0]} friction={0} />
        <mesh
          receiveShadow
          position={[0, isShowroom ? -0.045 : 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[isShowroom ? 160 : 1200, isShowroom ? 160 : 1200]} />
          <meshStandardMaterial
            map={isShowroom ? null : asphaltTexture}
            color={isShowroom ? '#12151c' : view === 'RACE' ? '#243028' : '#232830'}
            roughness={isShowroom ? 0.65 : 0.88}
            metalness={isShowroom ? 0.12 : 0.04}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        </mesh>
      </RigidBody>

      {/* RACE MODE: Custom Procedural Closed Circuit */}
      {view === 'RACE' && <CustomRaceTrack track={activeTrack} asphaltTexture={asphaltTexture} />}

      {/* FREE ROAM MODE: 2x Expanded Urban Street Grid with Buildings & Interactive Beacons */}
      {view === 'FREE_ROAM' && (
        <group>
          {/* --- INTERCONNECTED ASPHALT ROAD NETWORK --- */}
          {/* Grand North-South Boulevard (x = 0, width 16m, length 480m) */}
          <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[16, 480]} />
            <meshStandardMaterial color="#1a1e24" roughness={0.84} polygonOffset polygonOffsetFactor={-1} />
          </mesh>

          {/* Central East-West Cross Avenue (z = 0, width 16m, length 480m) */}
          <mesh position={[0, 0.013, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[480, 16]} />
            <meshStandardMaterial color="#1a1e24" roughness={0.84} polygonOffset polygonOffsetFactor={-1} />
          </mesh>

          {/* District Avenues: North & South (z = ±120, width 14m, length 480m) */}
          {[-120, 120].map((z, idx) => (
            <mesh key={`h-ave-${idx}`} position={[0, 0.012, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[480, 14]} />
              <meshStandardMaterial color="#1c2026" roughness={0.85} polygonOffset polygonOffsetFactor={-1} />
            </mesh>
          ))}

          {/* District Boulevards: West & East (x = ±120, width 14m, length 480m) */}
          {[-120, 120].map((x, idx) => (
            <mesh key={`v-ave-${idx}`} position={[x, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[14, 480]} />
              <meshStandardMaterial color="#1c2026" roughness={0.85} polygonOffset polygonOffsetFactor={-1} />
            </mesh>
          ))}

          {/* Perimeter Highway Loop (x = ±240, z = ±240, width 16m) */}
          {[-240, 240].map((z, idx) => (
            <mesh key={`perim-h-${idx}`} position={[0, 0.012, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[500, 16]} />
              <meshStandardMaterial color="#171a20" roughness={0.82} polygonOffset polygonOffsetFactor={-1} />
            </mesh>
          ))}
          {[-240, 240].map((x, idx) => (
            <mesh key={`perim-v-${idx}`} position={[x, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[16, 500]} />
              <meshStandardMaterial color="#171a20" roughness={0.82} polygonOffset polygonOffsetFactor={-1} />
            </mesh>
          ))}

          {/* Yellow Dashed Centerlines along Grand North-South Boulevard */}
          {Array.from({ length: 48 }).map((_, i) => (
            <mesh
              key={`dash-ns-${i}`}
              position={[0, 0.02, -235 + i * 10]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[0.32, 5.5]} />
              <meshStandardMaterial color="#facc15" roughness={0.6} polygonOffset polygonOffsetFactor={-2} />
            </mesh>
          ))}

          {/* Yellow Dashed Centerlines along Central East-West Cross Avenue */}
          {Array.from({ length: 48 }).map((_, i) => (
            <mesh
              key={`dash-ew-${i}`}
              position={[-235 + i * 10, 0.02, 0]}
              rotation={[-Math.PI / 2, 0, Math.PI / 2]}
            >
              <planeGeometry args={[0.32, 5.5]} />
              <meshStandardMaterial color="#facc15" roughness={0.6} polygonOffset polygonOffsetFactor={-2} />
            </mesh>
          ))}

          {/* Pedestrian Zebra Crosswalks at Major Intersections */}
          {[-120, 0, 120].map((crossZ) =>
            [-120, 0, 120].map((crossX) => (
              <group key={`crosswalk-${crossX}-${crossZ}`} position={[crossX, 0.022, crossZ]}>
                {/* 4 striped pedestrian zones around intersection */}
                {[-10, 10].map((offsetZ, zi) => (
                  <mesh key={`cw-z-${zi}`} position={[0, 0, offsetZ]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[12, 2.4]} />
                    <meshStandardMaterial color="#f4f4f5" roughness={0.5} polygonOffset polygonOffsetFactor={-3} />
                  </mesh>
                ))}
                {[-10, 10].map((offsetX, xi) => (
                  <mesh key={`cw-x-${xi}`} position={[offsetX, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                    <planeGeometry args={[12, 2.4]} />
                    <meshStandardMaterial color="#f4f4f5" roughness={0.5} polygonOffset polygonOffsetFactor={-3} />
                  </mesh>
                ))}
              </group>
            )),
          )}

          {/* --- SLALOM DRIFT PYLONS IN SPAWN AREA --- */}
          {FREE_ROAM_PYLONS.map((p, i) => (
            <RigidBody key={`pylon-${i}`} type="dynamic" mass={2} position={[p.x, 0.5, p.z]}>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.25, 0.45, 1.0, 12]} />
                <meshStandardMaterial color="#f97316" roughness={0.4} />
              </mesh>
            </RigidBody>
          ))}

          {/* --- 3D CITY BUILDINGS WITH RIGIDBODIES --- */}
          {FREE_ROAM_BUILDINGS.map((b) => (
            <RigidBody key={b.id} type="fixed" position={[b.x, b.size[1] / 2, b.z]}>
              <group>
                {/* Main Building Monolith */}
                <mesh castShadow receiveShadow>
                  <boxGeometry args={b.size} />
                  <meshStandardMaterial color={b.color} roughness={0.7} metalness={0.25} />
                </mesh>

                {/* Building Base Trim / Foundation */}
                <mesh position={[0, -b.size[1] / 2 + 0.6, 0]}>
                  <boxGeometry args={[b.size[0] + 0.4, 1.2, b.size[2] + 0.4]} />
                  <meshStandardMaterial color="#111317" roughness={0.8} />
                </mesh>

                {/* Skyscraper Windows & Vertical Illuminated Fins */}
                {b.type === 'skyscraper' && (
                  <group>
                    {/* Glowing Accent Corner Pillars */}
                    {[-1, 1].map((sx, xi) =>
                      [-1, 1].map((sz, zi) => (
                        <mesh
                          key={`col-${xi}-${zi}`}
                          position={[(b.size[0] / 2) * sx, 0, (b.size[2] / 2) * sz]}
                        >
                          <boxGeometry args={[0.4, b.size[1] * 0.98, 0.4]} />
                          <meshStandardMaterial color={b.accentColor} emissive={b.accentColor} emissiveIntensity={0.6} />
                        </mesh>
                      )),
                    )}
                    {/* Roof Communications Tower & Warning Beacon */}
                    <mesh position={[0, b.size[1] / 2 + 4, 0]}>
                      <cylinderGeometry args={[0.08, 0.25, 8, 8]} />
                      <meshStandardMaterial color="#a1a1aa" metalness={0.8} />
                    </mesh>
                    <mesh position={[0, b.size[1] / 2 + 8, 0]}>
                      <sphereGeometry args={[0.3, 12, 12]} />
                      <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2.5} />
                    </mesh>
                  </group>
                )}

                {/* Industrial Warehouse Loading Bays & Corrugated Roof */}
                {b.type === 'warehouse' && (
                  <group>
                    {/* Industrial Amber Hazard Stripes above Loading Bay */}
                    <mesh position={[0, -b.size[1] / 2 + 2.5, b.size[2] / 2 + 0.05]}>
                      <boxGeometry args={[b.size[0] * 0.7, 3.2, 0.1]} />
                      <meshStandardMaterial color="#1e222a" roughness={0.6} />
                    </mesh>
                    <mesh position={[0, -b.size[1] / 2 + 4.2, b.size[2] / 2 + 0.12]}>
                      <boxGeometry args={[b.size[0] * 0.75, 0.4, 0.12]} />
                      <meshStandardMaterial color="#f59e0b" emissive="#b45309" emissiveIntensity={0.6} />
                    </mesh>
                  </group>
                )}

                {/* CENTRAL GARAGE LANDMARK BUILDING BRANDING */}
                {b.type === 'garage_hq' && (
                  <group>
                    {/* Illuminated Orange Garage Signboard */}
                    <mesh position={[-b.size[0] / 2 - 0.1, b.size[1] / 2 - 1.2, 0]} rotation={[0, -Math.PI / 2, 0]}>
                      <boxGeometry args={[14, 1.8, 0.2]} />
                      <meshStandardMaterial color="#0d0e10" />
                    </mesh>
                    <mesh position={[-b.size[0] / 2 - 0.22, b.size[1] / 2 - 1.2, 0]} rotation={[0, -Math.PI / 2, 0]}>
                      <boxGeometry args={[13.4, 1.2, 0.05]} />
                      <meshStandardMaterial color="#FF9900" emissive="#FF9900" emissiveIntensity={2.2} />
                    </mesh>
                    {/* Workshop Bay Rollup Doors */}
                    {[-4.5, 4.5].map((zPos, di) => (
                      <mesh key={`door-${di}`} position={[-b.size[0] / 2 - 0.08, -b.size[1] / 2 + 2.2, zPos]} rotation={[0, -Math.PI / 2, 0]}>
                        <boxGeometry args={[5.5, 4.2, 0.12]} />
                        <meshStandardMaterial color="#27272a" metalness={0.6} roughness={0.3} />
                      </mesh>
                    ))}
                  </group>
                )}

                {/* DEALERSHIP / CAR LOT LANDMARK BUILDING BRANDING */}
                {b.type === 'dealership' && (
                  <group>
                    {/* Glowing Cyan Dealership Signboard */}
                    <mesh position={[b.size[0] / 2 + 0.1, b.size[1] / 2 - 1.2, 0]} rotation={[0, Math.PI / 2, 0]}>
                      <boxGeometry args={[16, 2.0, 0.2]} />
                      <meshStandardMaterial color="#0d0e10" />
                    </mesh>
                    <mesh position={[b.size[0] / 2 + 0.22, b.size[1] / 2 - 1.2, 0]} rotation={[0, Math.PI / 2, 0]}>
                      <boxGeometry args={[15.2, 1.3, 0.05]} />
                      <meshStandardMaterial color="#00B0FF" emissive="#00B0FF" emissiveIntensity={2.4} />
                    </mesh>
                    {/* Tinted Showroom Glass Front */}
                    <mesh position={[b.size[0] / 2 + 0.08, -0.6, 0]} rotation={[0, Math.PI / 2, 0]}>
                      <planeGeometry args={[20, 5.2]} />
                      <meshPhysicalMaterial
                        color="#38bdf8"
                        transmission={0.85}
                        transparent
                        opacity={0.88}
                        roughness={0.1}
                        metalness={0.2}
                      />
                    </mesh>
                  </group>
                )}
              </group>
            </RigidBody>
          ))}

          {/* --- CAR LOT OUTDOOR SHOWCASE CARS ON DISPLAY PEDESTALS --- */}
          {/* Display Pedestal 1: Shinobi Type-R in Emerald Green */}
          <group position={[-76, 0, -15]} rotation={[0, 0.35, 0]}>
            {/* Illuminated Pedestal */}
            <mesh position={[0, 0.22, 0]} receiveShadow>
              <cylinderGeometry args={[3.2, 3.4, 0.44, 32]} />
              <meshStandardMaterial color="#1a1c22" metalness={0.5} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.445, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[3.0, 3.2, 32]} />
              <meshStandardMaterial color="#00B0FF" emissive="#00B0FF" emissiveIntensity={2.0} />
            </mesh>
            {/* Static 3D Showcase Car (Shinobi RX Tuner) */}
            <group position={[0, 0.72, 0]}>
              <mesh castShadow>
                <boxGeometry args={[1.82, 0.52, 4.1]} />
                <meshStandardMaterial color="#059669" metalness={0.7} roughness={0.2} />
              </mesh>
              <mesh position={[0, 0.44, -0.3]} castShadow>
                <boxGeometry args={[1.5, 0.46, 2.2]} />
                <meshStandardMaterial color="#18181b" roughness={0.1} metalness={0.8} />
              </mesh>
              {/* Tuner Wing */}
              <mesh position={[0, 0.65, 1.85]} castShadow>
                <boxGeometry args={[1.72, 0.08, 0.42]} />
                <meshStandardMaterial color="#18181b" roughness={0.3} />
              </mesh>
              <pointLight position={[0, 2.5, 0]} intensity={3} distance={8} color="#00B0FF" />
            </group>
          </group>

          {/* Display Pedestal 2: Vanguard V12 in Amber Gold */}
          <group position={[-76, 0, 15]} rotation={[0, -0.35, 0]}>
            {/* Illuminated Pedestal */}
            <mesh position={[0, 0.22, 0]} receiveShadow>
              <cylinderGeometry args={[3.2, 3.4, 0.44, 32]} />
              <meshStandardMaterial color="#1a1c22" metalness={0.5} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.445, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[3.0, 3.2, 32]} />
              <meshStandardMaterial color="#FF9900" emissive="#FF9900" emissiveIntensity={2.0} />
            </mesh>
            {/* Static 3D Showcase Car (Vanguard V12 Supercar) */}
            <group position={[0, 0.72, 0]}>
              <mesh castShadow>
                <boxGeometry args={[1.92, 0.48, 4.3]} />
                <meshStandardMaterial color="#d97706" metalness={0.75} roughness={0.18} />
              </mesh>
              <mesh position={[0, 0.42, -0.2]} castShadow>
                <boxGeometry args={[1.55, 0.42, 2.4]} />
                <meshStandardMaterial color="#18181b" roughness={0.1} metalness={0.8} />
              </mesh>
              <pointLight position={[0, 2.5, 0]} intensity={3} distance={8} color="#FF9900" />
            </group>
          </group>

          {/* --- INTERACTIVE GLOWING WORLD BEACONS (GARAGE, CAR LOT, RACE EVENTS) --- */}
          {FREE_ROAM_BEACONS.map((beacon) => (
            <group key={beacon.id} position={[beacon.x, 0, beacon.z]}>
              {/* Outer Ground Pulse Ring */}
              <mesh position={[0, 0.024, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[beacon.radius - 0.45, beacon.radius, 48]} />
                <meshStandardMaterial
                  color={beacon.color}
                  emissive={beacon.glowColor}
                  emissiveIntensity={2.5}
                  roughness={0.2}
                  polygonOffset
                  polygonOffsetFactor={-3}
                />
              </mesh>

              {/* Inner Translucent Ground Pad */}
              <mesh position={[0, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[beacon.radius - 0.48, 48]} />
                <meshBasicMaterial
                  color={beacon.color}
                  transparent
                  opacity={0.18}
                  polygonOffset
                  polygonOffsetFactor={-2}
                />
              </mesh>

              {/* Vertical Translucent Light Column */}
              <mesh position={[0, 6, 0]}>
                <cylinderGeometry args={[beacon.radius * 0.7, beacon.radius * 0.9, 12, 32, 1, true]} />
                <meshBasicMaterial
                  color={beacon.color}
                  transparent
                  opacity={0.12}
                  side={THREE.DoubleSide}
                />
              </mesh>

              {/* Floating Overhead Beacon Gem */}
              <group position={[0, 4.5, 0]}>
                <mesh rotation={[0.4, 0.4, 0]}>
                  <octahedronGeometry args={[0.85, 0]} />
                  <meshStandardMaterial
                    color={beacon.color}
                    emissive={beacon.glowColor}
                    emissiveIntensity={2.2}
                    metalness={0.3}
                    roughness={0.2}
                  />
                </mesh>
                <pointLight position={[0, 0, 0]} intensity={4.5} distance={14} color={beacon.color} />
              </group>
            </group>
          ))}

          {/* --- STREETLIGHT POSTS --- */}
          {STREETLIGHT_POLES.map((pole, i) => (
            <group key={`light-${i}`} position={[pole.x, 0, pole.z]} rotation={[0, pole.rotationY, 0]}>
              {/* Vertical Dark Steel Post */}
              <mesh position={[0, 3.8, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.12, 7.6, 8]} />
                <meshStandardMaterial color="#1c1f26" metalness={0.7} roughness={0.3} />
              </mesh>
              {/* Overhanging Arm */}
              <mesh position={[0.7, 7.5, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow>
                <cylinderGeometry args={[0.06, 0.06, 1.6, 8]} />
                <meshStandardMaterial color="#1c1f26" metalness={0.7} roughness={0.3} />
              </mesh>
              {/* Light Fixture */}
              <mesh position={[1.35, 7.8, 0]}>
                <boxGeometry args={[0.42, 0.12, 0.24]} />
                <meshStandardMaterial color="#0f1115" metalness={0.5} roughness={0.4} />
              </mesh>
              <mesh position={[1.35, 7.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.36, 0.18]} />
                <meshBasicMaterial color="#fef08a" />
              </mesh>
            </group>
          ))}

          {/* --- OUTER 560x560 CITY PERIMETER BOUNDARY WALLS --- */}
          <RigidBody type="fixed" position={[FREE_ROAM_BOUNDS.centerX, 2.5, FREE_ROAM_BOUNDS.minZ]}>
            <mesh receiveShadow>
              <boxGeometry args={[FREE_ROAM_BOUNDS.width, 5, 2]} />
              <meshStandardMaterial color="#1f242e" roughness={0.8} />
            </mesh>
          </RigidBody>
          <RigidBody type="fixed" position={[FREE_ROAM_BOUNDS.centerX, 2.5, FREE_ROAM_BOUNDS.maxZ]}>
            <mesh receiveShadow>
              <boxGeometry args={[FREE_ROAM_BOUNDS.width, 5, 2]} />
              <meshStandardMaterial color="#1f242e" roughness={0.8} />
            </mesh>
          </RigidBody>
          <RigidBody type="fixed" position={[FREE_ROAM_BOUNDS.minX, 2.5, FREE_ROAM_BOUNDS.centerZ]}>
            <mesh receiveShadow>
              <boxGeometry args={[2, 5, FREE_ROAM_BOUNDS.depth]} />
              <meshStandardMaterial color="#1f242e" roughness={0.8} />
            </mesh>
          </RigidBody>
          <RigidBody type="fixed" position={[FREE_ROAM_BOUNDS.maxX, 2.5, FREE_ROAM_BOUNDS.centerZ]}>
            <mesh receiveShadow>
              <boxGeometry args={[2, 5, FREE_ROAM_BOUNDS.depth]} />
              <meshStandardMaterial color="#1f242e" roughness={0.8} />
            </mesh>
          </RigidBody>
        </group>
      )}

      {/* Garage / Menu / Career / Car Lot Showroom Turntable */}
      {isShowroom && (
        <group>
          <mesh position={[0, -0.0225, 0]} receiveShadow>
            <cylinderGeometry args={[3.6, 3.8, 0.045, 64]} />
            <meshStandardMaterial color="#1e222b" metalness={0.45} roughness={0.42} />
          </mesh>
          <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[3.52, 3.62, 64]} />
            <meshStandardMaterial
              color="#ff9900"
              emissive="#ff9900"
              emissiveIntensity={1.5}
              roughness={0.25}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
            />
          </mesh>
          <pointLight position={[0, 4.5, 0]} intensity={8} distance={14} color="#ffedd5" />
        </group>
      )}
    </group>
  );
}
