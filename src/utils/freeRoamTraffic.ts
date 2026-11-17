import * as THREE from 'three';
import { getCustomCityBounds, getCustomCityObstacleObbs } from './collisionPhysics';
import { carTelemetry, FREE_ROAM_ROAD_COORDS } from './freeRoamWorld';

export const MAX_TRAFFIC_CARS = 60;

export interface TrafficVehicle {
  active: boolean;
  id: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  targetSpeed: number;
  currentSpeed: number;
  dir: 0 | 1 | 2 | 3; // 0=N(-Z), 1=E(+X), 2=S(+Z), 3=W(-X)
  roadCoord: number;
  lastCrossCoord: number;
  bumpVx: number;
  bumpVz: number;
  yawOffset: number;
  yawVel: number;
  isBraking: boolean;
  color: string;
}

const TRAFFIC_COLORS = [
  '#e2e8f0', // Pearl Silver
  '#334155', // Gunmetal
  '#2563eb', // Cobalt Blue
  '#dc2626', // Crimson
  '#059669', // Emerald
  '#d97706', // Amber Metallic
  '#f8fafc', // Alpine White
  '#0891b2', // Cyan Slate
  '#475569', // Steel Grey
  '#7c3aed', // Midnight Violet
  '#b45309', // Copper Bronze
  '#1e293b', // Obsidian
];

const DIR_FX = [0, 1, 0, -1] as const;
const DIR_FZ = [-1, 0, 1, 0] as const;
const DIR_YAW = [0, -Math.PI / 2, Math.PI, Math.PI / 2] as const;

function getLaneOffset(roadCoord: number): number {
  return roadCoord === 0 || Math.abs(roadCoord) === 480 ? 4.2 : 3.3;
}

function getLaneCenter(roadCoord: number, dir: 0 | 1 | 2 | 3): number {
  const off = getLaneOffset(roadCoord);
  // N(+off), E(+off), S(-off), W(-off)
  return dir === 0 || dir === 1 ? off : -off;
}

export const trafficVehicles: TrafficVehicle[] = Array.from({ length: MAX_TRAFFIC_CARS }, (_, i) => ({
  active: false,
  id: i,
  x: 0,
  z: 0,
  vx: 0,
  vz: 0,
  yaw: 0,
  targetSpeed: 14,
  currentSpeed: 14,
  dir: 0,
  roadCoord: 0,
  lastCrossCoord: 9999,
  bumpVx: 0,
  bumpVz: 0,
  yawOffset: 0,
  yawVel: 0,
  isBraking: false,
  color: TRAFFIC_COLORS[i % TRAFFIC_COLORS.length],
}));

let initializedForSession = false;

function getActiveRoadConfig() {
  const bounds = getCustomCityBounds();
  if (!bounds) {
    return {
      roadCoords: FREE_ROAM_ROAD_COORDS as readonly number[],
      edgeLimit: 480,
    };
  }
  const maxSpan = Math.max(60, Math.min(Math.abs(bounds.minX), Math.abs(bounds.maxX), Math.abs(bounds.minZ), Math.abs(bounds.maxZ)) - 14);
  const mid = Math.round(maxSpan * 0.48);
  const outer = Math.round(maxSpan);
  return {
    roadCoords: [-outer, -mid, 0, mid, outer] as readonly number[],
    edgeLimit: outer,
  };
}

export function resetTrafficVehicles(activeCount: number) {
  const clamped = Math.max(0, Math.min(MAX_TRAFFIC_CARS, Math.round(activeCount)));
  const { roadCoords, edgeLimit } = getActiveRoadConfig();
  const customObbs = getCustomCityObstacleObbs();
  const bldgCount = customObbs ? Math.max(0, customObbs.length - 4) : 0;

  for (let i = 0; i < MAX_TRAFFIC_CARS; i++) {
    const v = trafficVehicles[i];
    v.active = i < clamped;
    v.bumpVx = 0;
    v.bumpVz = 0;
    v.yawOffset = 0;
    v.yawVel = 0;
    v.isBraking = false;

    const dir = (i % 4) as 0 | 1 | 2 | 3;
    const roadIdx = (i * 3 + Math.floor(i / 4)) % roadCoords.length;
    const roadCoord = roadCoords[roadIdx];
    const lane = roadCoord + getLaneCenter(roadCoord, dir);

    // Spread positions cleanly along the road and avoid spawning right at (0,0)
    const segmentIdx = (i * 5 + 2) % 11;
    const span = Math.max(40, edgeLimit - 16);
    let along = -span + (segmentIdx / 10) * (span * 2) + ((i * 11) % 15) - 7;
    along = THREE.MathUtils.clamp(along, -span, span);
    if (Math.abs(roadCoord) < 20 && Math.abs(along) < 35) {
      along = along >= 0 ? 44 : -44;
    }

    v.dir = dir;
    v.roadCoord = roadCoord;
    v.lastCrossCoord = 9999;
    v.yaw = DIR_YAW[dir];
    const baseSpeed = Math.abs(roadCoord) >= edgeLimit - 5 ? 18.0 : roadCoord === 0 ? 15.0 : 13.0;
    v.targetSpeed = baseSpeed + (i % 4) * 1.1;
    v.currentSpeed = v.targetSpeed;

    if (dir === 0 || dir === 2) {
      v.x = lane;
      v.z = along;
    } else {
      v.x = along;
      v.z = lane;
    }

    // If custom glTF city is active, nudge initial traffic spawn clear of any building OBB
    if (customObbs && bldgCount > 0) {
      for (let attempt = 0; attempt < 8; attempt++) {
        let hit = false;
        for (let b = 0; b < bldgCount; b++) {
          const o = customObbs[b];
          if (Math.abs(v.x - o.cx) <= o.halfW + 2.4 && Math.abs(v.z - o.cz) <= o.halfL + 2.4) {
            hit = true;
            break;
          }
        }
        if (!hit) break;
        if (dir === 0 || dir === 2) {
          v.z = THREE.MathUtils.clamp(v.z + 18, -span, span);
        } else {
          v.x = THREE.MathUtils.clamp(v.x + 18, -span, span);
        }
      }
    }

    v.vx = DIR_FX[dir] * v.currentSpeed;
    v.vz = DIR_FZ[dir] * v.currentSpeed;
  }

  initializedForSession = true;
}

function wrapAngleDelta(target: number, current: number): number {
  let d = target - current;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Advances all active Free Roam traffic vehicles cleanly along the 7x7 road grid.
 */
export function stepTrafficSimulation(dt: number, requestedCount: number) {
  const count = Math.max(0, Math.min(MAX_TRAFFIC_CARS, Math.round(requestedCount)));
  if (!initializedForSession) {
    resetTrafficVehicles(count);
  }

  for (let i = 0; i < MAX_TRAFFIC_CARS; i++) {
    const v = trafficVehicles[i];
    const shouldBeActive = i < count;
    if (shouldBeActive && !v.active) {
      v.active = true;
    } else if (!shouldBeActive && v.active) {
      v.active = false;
    }
  }

  if (count === 0) return;

  const { roadCoords, edgeLimit } = getActiveRoadConfig();

  for (let i = 0; i < count; i++) {
    const v = trafficVehicles[i];
    if (!v.active) continue;

    // 1. Decay any collision knockback impulse & spin
    const bumpDecay = Math.exp(-3.6 * dt);
    v.bumpVx *= bumpDecay;
    v.bumpVz *= bumpDecay;
    v.yawOffset += v.yawVel * dt;
    v.yawVel *= Math.exp(-5.0 * dt);
    v.yawOffset = THREE.MathUtils.damp(v.yawOffset, 0, 3.8, dt);

    const fx = DIR_FX[v.dir];
    const fz = DIR_FZ[v.dir];

    // 2. Check forward gap to other traffic cars and player car to avoid tailgating/stacking
    let minGap = Infinity;

    const pDx = carTelemetry.x - v.x;
    const pDz = carTelemetry.z - v.z;
    const pFwd = pDx * fx + pDz * fz;
    if (pFwd > 1.5 && pFwd < 15.0) {
      const pLat = Math.abs(pDx * -fz + pDz * fx);
      if (pLat < 2.6) {
        minGap = pFwd;
      }
    }

    for (let j = 0; j < count; j++) {
      if (i === j) continue;
      const other = trafficVehicles[j];
      const dx = other.x - v.x;
      const dz = other.z - v.z;
      const fwd = dx * fx + dz * fz;
      if (fwd > 0.5 && fwd < 14.0 && fwd < minGap) {
        const lat = Math.abs(dx * -fz + dz * fx);
        if (lat < 2.4) {
          minGap = fwd;
        }
      }
    }

    let desiredSpeed = v.targetSpeed;
    v.isBraking = false;
    if (minGap < 6.0) {
      desiredSpeed = 0;
      v.isBraking = true;
    } else if (minGap < 13.5) {
      desiredSpeed = v.targetSpeed * ((minGap - 6.0) / 7.5);
      if (desiredSpeed < v.currentSpeed - 1.5) v.isBraking = true;
    }

    const accelRate = desiredSpeed < v.currentSpeed ? 6.5 : 2.6;
    v.currentSpeed = THREE.MathUtils.damp(v.currentSpeed, desiredSpeed, accelRate, dt);

    // 2b. Avoid driving through custom glTF city buildings if a custom city model is active
    const customObbs = getCustomCityObstacleObbs();
    if (customObbs) {
      const lookX = v.x + fx * 6.5;
      const lookZ = v.z + fz * 6.5;
      const bldgLimit = Math.max(0, customObbs.length - 4);
      for (let b = 0; b < bldgLimit; b++) {
        const o = customObbs[b];
        if (
          Math.abs(lookX - o.cx) <= o.halfW + 1.8 &&
          Math.abs(lookZ - o.cz) <= o.halfL + 1.8
        ) {
          // Turn around cleanly onto opposite lane
          v.dir = ((v.dir + 2) % 4) as 0 | 1 | 2 | 3;
          v.x -= fx * 2.2;
          v.z -= fz * 2.2;
          v.currentSpeed = Math.min(v.currentSpeed, 6);
          v.isBraking = true;
          break;
        }
      }
    }

    // 3. Advance along lane & check intersections
    v.vx = fx * v.currentSpeed + v.bumpVx;
    v.vz = fz * v.currentSpeed + v.bumpVz;
    v.x += v.vx * dt;
    v.z += v.vz * dt;

    // Smoothly align lateral coordinate back to lane center after cornering or bumps
    const targetLanePos = v.roadCoord + getLaneCenter(v.roadCoord, v.dir);
    if (v.dir === 0 || v.dir === 2) {
      v.x = THREE.MathUtils.damp(v.x, targetLanePos, 4.5, dt);
    } else {
      v.z = THREE.MathUtils.damp(v.z, targetLanePos, 4.5, dt);
    }

    // Check intersection turning on the axis of travel
    const along = v.dir === 0 || v.dir === 2 ? v.z : v.x;
    for (let r = 0; r < roadCoords.length; r++) {
      const cross = roadCoords[r];
      if (cross === v.lastCrossCoord) continue;

      if (Math.abs(along - cross) < 2.2) {
        v.lastCrossCoord = cross;

        // Determine valid turns at this intersection (never leave ±edgeLimit perimeter)
        const atNorthEdge = v.dir === 0 && cross <= -edgeLimit;
        const atSouthEdge = v.dir === 2 && cross >= edgeLimit;
        const atWestEdge = v.dir === 3 && cross <= -edgeLimit;
        const atEastEdge = v.dir === 1 && cross >= edgeLimit;
        const mustTurn = atNorthEdge || atSouthEdge || atWestEdge || atEastEdge;

        // Deterministic pseudo-random decision so turns look organic
        const hash = ((i * 73 + Math.round(Math.abs(v.roadCoord)) + Math.round(Math.abs(cross))) * 17) % 100;
        if (mustTurn || hash < 34) {
          const rightDir = ((v.dir + 1) % 4) as 0 | 1 | 2 | 3;
          const leftDir = ((v.dir + 3) % 4) as 0 | 1 | 2 | 3;

          const canGoDir = (d: 0 | 1 | 2 | 3) => {
            if (d === 0 && cross <= -edgeLimit) return false;
            if (d === 2 && cross >= edgeLimit) return false;
            if (d === 3 && cross <= -edgeLimit) return false;
            if (d === 1 && cross >= edgeLimit) return false;
            // Check perpendicular coordinate edge
            if (d === 0 && v.z <= -(edgeLimit - 5)) return false;
            if (d === 2 && v.z >= edgeLimit - 5) return false;
            if (d === 3 && v.x <= -(edgeLimit - 5)) return false;
            if (d === 1 && v.x >= edgeLimit - 5) return false;
            return true;
          };

          let nextDir: 0 | 1 | 2 | 3 = v.dir;
          if (hash % 2 === 0) {
            nextDir = canGoDir(rightDir) ? rightDir : canGoDir(leftDir) ? leftDir : ((v.dir + 2) % 4) as 0 | 1 | 2 | 3;
          } else {
            nextDir = canGoDir(leftDir) ? leftDir : canGoDir(rightDir) ? rightDir : ((v.dir + 2) % 4) as 0 | 1 | 2 | 3;
          }

          v.lastCrossCoord = v.roadCoord;
          v.roadCoord = cross;
          v.dir = nextDir;
        }
        break;
      }
    }

    // Hard safety clamp inside perimeter
    v.x = THREE.MathUtils.clamp(v.x, -(edgeLimit + 8), edgeLimit + 8);
    v.z = THREE.MathUtils.clamp(v.z, -(edgeLimit + 8), edgeLimit + 8);

    // Smooth visual heading toward lane direction + collision yaw offset
    const targetYaw = DIR_YAW[v.dir] + v.yawOffset;
    const dYaw = wrapAngleDelta(targetYaw, v.yaw);
    v.yaw += dYaw * (1 - Math.exp(-8.5 * dt));
  }
}

export function clearTrafficInitialized() {
  initializedForSession = false;
}
