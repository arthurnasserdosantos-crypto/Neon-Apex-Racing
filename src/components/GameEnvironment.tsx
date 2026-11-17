import React, { useMemo, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { BuiltRaceTrack, getBuiltRaceTrack } from '../utils/raceTracks';
import { FreeRoamCity } from './FreeRoamCity';

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
  tex.repeat.set(120, 120);
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

  // Smooth continuous rounded tubular/arched track walls along left and right edges
  const wallOffset = roadWidth / 2 + 1.05;
  const wallPositions: number[] = [];
  const wallNormals: number[] = [];
  const wallColors: number[] = [];

  // Cross-section profile points (u = lateral across wall width, y = height, nu/ny = smooth outward normal)
  // Forms a sleek rounded stadium-arch barrier (width ~0.84m, height ~1.40m, smooth curved sides & dome top)
  const profile: Array<{ u: number; y: number; nu: number; ny: number }> = [];
  const rx = 0.42;
  const ry = 0.72;
  const cy = 0.68;
  const arcSteps = 10;
  // Inner ground skirt anchor
  profile.push({ u: -0.34, y: 0.0, nu: -0.96, ny: -0.28 });
  for (let p = 0; p <= arcSteps; p++) {
    const theta = Math.PI + 0.34 - (p / arcSteps) * (Math.PI + 0.68);
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const px = rx * cosT;
    const py = Math.max(0.02, cy + ry * sinT);
    const nLen = Math.hypot(cosT / rx, sinT / ry) || 1;
    profile.push({
      u: px,
      y: py,
      nu: (cosT / rx) / nLen,
      ny: (sinT / ry) / nLen,
    });
  }
  // Outer ground skirt anchor
  profile.push({ u: 0.34, y: 0.0, nu: 0.96, ny: -0.28 });

  const pushWallQuadSide = (sideSign: -1 | 1) => {
    for (let i = 0; i < n; i++) {
      const a = samples[i];
      const b = samples[(i + 1) % n];

      const isRed = Math.floor(i / 3) % 2 === 0;
      const cr = isRed ? 0.86 : 0.95;
      const cg = isRed ? 0.15 : 0.96;
      const cb = isRed ? 0.15 : 0.97;

      const aCenterX = a.pos.x + a.right.x * (sideSign * wallOffset);
      const aCenterZ = a.pos.z + a.right.z * (sideSign * wallOffset);
      const bCenterX = b.pos.x + b.right.x * (sideSign * wallOffset);
      const bCenterZ = b.pos.z + b.right.z * (sideSign * wallOffset);

      for (let k = 0; k < profile.length - 1; k++) {
        const p0 = profile[k];
        const p1 = profile[k + 1];

        const a0x = aCenterX + a.right.x * p0.u;
        const a0y = p0.y;
        const a0z = aCenterZ + a.right.z * p0.u;

        const a1x = aCenterX + a.right.x * p1.u;
        const a1y = p1.y;
        const a1z = aCenterZ + a.right.z * p1.u;

        const b0x = bCenterX + b.right.x * p0.u;
        const b0y = p0.y;
        const b0z = bCenterZ + b.right.z * p0.u;

        const b1x = bCenterX + b.right.x * p1.u;
        const b1y = p1.y;
        const b1z = bCenterZ + b.right.z * p1.u;

        const na0x = a.right.x * p0.nu;
        const na0y = p0.ny;
        const na0z = a.right.z * p0.nu;

        const na1x = a.right.x * p1.nu;
        const na1y = p1.ny;
        const na1z = a.right.z * p1.nu;

        const nb0x = b.right.x * p0.nu;
        const nb0y = p0.ny;
        const nb0z = b.right.z * p0.nu;

        const nb1x = b.right.x * p1.nu;
        const nb1y = p1.ny;
        const nb1z = b.right.z * p1.nu;

        // Triangle 1: (a0, a1, b0)
        wallPositions.push(a0x, a0y, a0z, a1x, a1y, a1z, b0x, b0y, b0z);
        wallNormals.push(na0x, na0y, na0z, na1x, na1y, na1z, nb0x, nb0y, nb0z);
        pushColorTri(wallColors, cr, cg, cb);

        // Triangle 2: (a1, b1, b0)
        wallPositions.push(a1x, a1y, a1z, b1x, b1y, b1z, b0x, b0y, b0z);
        wallNormals.push(na1x, na1y, na1z, nb1x, nb1y, nb1z, nb0x, nb0y, nb0z);
        pushColorTri(wallColors, cr, cg, cb);
      }
    }
  };

  pushWallQuadSide(-1);
  pushWallQuadSide(1);

  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
  roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));

  const curbGeo = new THREE.BufferGeometry();
  curbGeo.setAttribute('position', new THREE.Float32BufferAttribute(curbPositions, 3));
  curbGeo.setAttribute('normal', new THREE.Float32BufferAttribute(curbNormals, 3));
  curbGeo.setAttribute('color', new THREE.Float32BufferAttribute(curbColors, 3));

  const wallGeo = new THREE.BufferGeometry();
  wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wallPositions, 3));
  wallGeo.setAttribute('normal', new THREE.Float32BufferAttribute(wallNormals, 3));
  wallGeo.setAttribute('color', new THREE.Float32BufferAttribute(wallColors, 3));

  return { roadGeo, curbGeo, wallGeo };
}

function CustomRaceTrack({
  track,
  asphaltTexture,
}: {
  track: BuiltRaceTrack;
  asphaltTexture: THREE.CanvasTexture;
}) {
  const { roadGeo, curbGeo, wallGeo } = useMemo(() => buildTrackRibbonGeometries(track), [track]);

  useEffect(() => {
    return () => {
      roadGeo.dispose();
      curbGeo.dispose();
      wallGeo.dispose();
    };
  }, [roadGeo, curbGeo, wallGeo]);

  // 120 smooth collision segments spaced evenly around loop on both left and right track edges
  const barrierSegments = useMemo(() => {
    const segCount = 120;
    const step = track.samples.length / segCount;
    const wallOffset = track.roadWidth / 2 + 1.05;
    const segLen = (track.totalLength / segCount) * 1.04;

    const list: {
      x: number;
      z: number;
      yaw: number;
      len: number;
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
      });
      list.push({
        x: midX + nrx * wallOffset,
        z: midZ + nrz * wallOffset,
        yaw,
        len: segLen,
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

      {/* Smooth continuous rounded tubular barriers along circuit edges (1 draw call + smooth physics colliders) */}
      <mesh geometry={wallGeo} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.42} metalness={0.18} />
      </mesh>
      <RigidBody type="fixed" colliders={false} friction={0}>
        {barrierSegments.map((b, i) => (
          <CuboidCollider
            key={`wall-col-${track.id}-${i}`}
            args={[0.4, 0.72, b.len * 0.5]}
            position={[b.x, 0.72, b.z]}
            rotation={[0, b.yaw, 0]}
            friction={0}
          />
        ))}
      </RigidBody>

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
        <CuboidCollider args={[700, 0.5, 700]} position={[0, -0.5, 0]} friction={0} />
        <mesh
          receiveShadow
          position={[0, isShowroom ? -0.045 : 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[isShowroom ? 160 : 1400, isShowroom ? 160 : 1400]} />
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

      {/* FREE ROAM MODE: 2x Expanded 1120x1120 Urban & Suburban City */}
      {view === 'FREE_ROAM' && <FreeRoamCity />}


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
