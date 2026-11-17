import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { useGameStore } from '../store';
import {
  CityBounds2D,
  OBB2D,
  setCustomCityBounds,
  setCustomCityObstacleObbs,
} from '../utils/collisionPhysics';
import { resetTrafficVehicles } from '../utils/freeRoamTraffic';
import {
  FREE_ROAM_BEACONS,
  setCustomCityBeacons,
  WorldBeacon,
} from '../utils/freeRoamWorld';

const CANDIDATE_CITY_URLS = [
  '/assets/aistudio/city.glb',
  '/assets/aistudio/scene.glb',
  '/assets/aistudio/city.gltf',
  '/assets/aistudio/scene.gltf',
  '/city.glb',
  '/scene.glb',
  '/city.gltf',
  '/scene.gltf',
] as const;

// 1x1 neutral gray PNG used when external glTF textures folder isn't present on disk
const FALLBACK_1X1_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function isUrlRealBinaryOrJson(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) return false;
    return true;
  } catch {
    return false;
  }
}

interface ResolvedCityAsset {
  url: string;
  hasTextures: boolean;
}

async function resolveLoadableCityUrl(): Promise<ResolvedCityAsset | null> {
  for (const url of CANDIDATE_CITY_URLS) {
    const exists = await isUrlRealBinaryOrJson(url);
    if (!exists) continue;

    if (url.endsWith('.glb')) {
      return { url, hasTextures: true };
    }

    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('text/html')) continue;
      const json = (await res.json()) as {
        buffers?: Array<{ uri?: string }>;
        images?: Array<{ uri?: string }>;
      };
      const baseDir = url.slice(0, url.lastIndexOf('/') + 1);
      let allBuffersOk = true;
      for (const buf of json.buffers || []) {
        if (!buf.uri || buf.uri.startsWith('data:')) continue;
        const bufUrl = `${baseDir}${buf.uri}`;
        const bufOk = await isUrlRealBinaryOrJson(bufUrl);
        if (!bufOk) {
          allBuffersOk = false;
          break;
        }
      }
      if (!allBuffersOk) continue;

      let hasTextures = true;
      for (const img of json.images || []) {
        if (!img.uri || img.uri.startsWith('data:')) continue;
        const imgOk = await isUrlRealBinaryOrJson(`${baseDir}${img.uri}`);
        if (!imgOk) {
          hasTextures = false;
          break;
        }
      }

      return { url, hasTextures };
    } catch {
      continue;
    }
  }
  return null;
}

function createProceduralCityTexture(
  kind: 'facadeA' | 'facadeB' | 'asphalt' | 'metal',
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  if (kind === 'asphalt') {
    ctx.fillStyle = '#242933';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 3600; i++) {
      const x = (i * 73) % size;
      const y = (i * 137 + Math.floor(i / 4) * 19) % size;
      const v = 30 + (i % 20);
      ctx.fillStyle = `rgb(${v}, ${v + 4}, ${v + 10})`;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, size - 4, size - 4);
  } else if (kind === 'metal') {
    ctx.fillStyle = '#3c4350';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 16) {
      ctx.fillStyle = y % 32 === 0 ? '#323844' : '#464f5e';
      ctx.fillRect(0, y, size, 8);
    }
  } else {
    ctx.fillStyle = kind === 'facadeA' ? '#1c2330' : '#262b36';
    ctx.fillRect(0, 0, size, size);

    const cols = 8;
    const rows = 16;
    const cw = size / cols;
    const ch = size / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const seed = (r * 31 + c * 17 + (kind === 'facadeA' ? 5 : 13)) % 17;
        let col = '#111620';
        if (seed < 4) col = '#fde68a';
        else if (seed < 8) col = '#7dd3fc';
        else if (seed < 11) col = '#334155';
        ctx.fillStyle = col;
        ctx.fillRect(c * cw + 4, r * ch + 3, cw - 8, ch - 6);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (kind === 'asphalt') tex.repeat.set(32, 32);
  else if (kind === 'facadeA' || kind === 'facadeB') tex.repeat.set(3, 4);
  else tex.repeat.set(4, 4);
  tex.needsUpdate = true;
  return tex;
}

function addPerimeterBounds(obbs: OBB2D[], bounds: CityBounds2D) {
  obbs.push(
    {
      cx: bounds.centerX,
      cz: bounds.minZ,
      ux: 1,
      uz: 0,
      fx: 0,
      fz: -1,
      halfW: bounds.width * 0.5,
      halfL: 1.0,
    },
    {
      cx: bounds.centerX,
      cz: bounds.maxZ,
      ux: 1,
      uz: 0,
      fx: 0,
      fz: -1,
      halfW: bounds.width * 0.5,
      halfL: 1.0,
    },
    {
      cx: bounds.minX,
      cz: bounds.centerZ,
      ux: 1,
      uz: 0,
      fx: 0,
      fz: -1,
      halfW: 1.0,
      halfL: bounds.depth * 0.5,
    },
    {
      cx: bounds.maxX,
      cz: bounds.centerZ,
      ux: 1,
      uz: 0,
      fx: 0,
      fz: -1,
      halfW: 1.0,
      halfL: bounds.depth * 0.5,
    },
  );
}

function pointHitsAnyObb(px: number, pz: number, obbs: OBB2D[], pad = 3.5): boolean {
  for (let i = 0; i < obbs.length; i++) {
    const o = obbs[i];
    if (Math.abs(px - o.cx) <= o.halfW + pad && Math.abs(pz - o.cz) <= o.halfL + pad) {
      return true;
    }
  }
  return false;
}

function findNearestClearPoint(
  targetX: number,
  targetZ: number,
  obbs: OBB2D[],
  bounds: CityBounds2D,
  pad = 4.5,
): { x: number; z: number } {
  const clampedX = THREE.MathUtils.clamp(targetX, bounds.minX + 10, bounds.maxX - 10);
  const clampedZ = THREE.MathUtils.clamp(targetZ, bounds.minZ + 10, bounds.maxZ - 10);
  if (!pointHitsAnyObb(clampedX, clampedZ, obbs, pad)) {
    return { x: clampedX, z: clampedZ };
  }
  let bestX = clampedX;
  let bestZ = clampedZ;
  let bestD2 = Infinity;
  for (let r = 4; r <= 72; r += 4) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const cx = THREE.MathUtils.clamp(
        clampedX + Math.cos(angle) * r,
        bounds.minX + 10,
        bounds.maxX - 10,
      );
      const cz = THREE.MathUtils.clamp(
        clampedZ + Math.sin(angle) * r,
        bounds.minZ + 10,
        bounds.maxZ - 10,
      );
      if (!pointHitsAnyObb(cx, cz, obbs, pad)) {
        const d2 = (cx - clampedX) ** 2 + (cz - clampedZ) ** 2;
        if (d2 < bestD2) {
          bestD2 = d2;
          bestX = cx;
          bestZ = cz;
        }
      }
    }
    if (bestD2 < Infinity) break;
  }
  return { x: bestX, z: bestZ };
}

interface CustomGltfCityProps {
  onLoadedChange: (loaded: boolean) => void;
}

export function CustomGltfCity({ onLoadedChange }: CustomGltfCityProps) {
  const [cityRoot, setCityRoot] = useState<THREE.Group | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadedRoot: THREE.Group | null = null;
    let dracoLoader: DRACOLoader | null = null;
    const proceduralTextures: THREE.CanvasTexture[] = [];

    async function loadCity() {
      const resolved = await resolveLoadableCityUrl();
      if (cancelled || !resolved) {
        onLoadedChange(false);
        return;
      }

      const manager = new THREE.LoadingManager();
      if (!resolved.hasTextures) {
        manager.setURLModifier((reqUrl) => {
          if (/\.(jpe?g|png|webp)$/i.test(reqUrl)) {
            return FALLBACK_1X1_PNG;
          }
          return reqUrl;
        });
      }

      dracoLoader = new DRACOLoader(manager);
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

      const loader = new GLTFLoader(manager);
      loader.setDRACOLoader(dracoLoader);

      loader.load(
        resolved.url,
        (gltf) => {
          if (cancelled) return;
          const root = gltf.scene;
          root.updateMatrixWorld(true);

          // Compute overall bounding box to verify 1:1 car scale (~3.8-4.3m sedan == 1.08x)
          const rawBox = new THREE.Box3().setFromObject(root);
          const rawSize = rawBox.getSize(new THREE.Vector3());
          const rawCenter = rawBox.getCenter(new THREE.Vector3());

          const maxXZ = Math.max(rawSize.x, rawSize.z, 1);
          // City vehicles in scene.gltf are already ~3.83m-4.71m vs player's 4.32m car:
          // Keep 1.08x real-world scale (~432m x 432m) rather than over-scaling to 1040m.
          const scaleFactor = maxXZ < 120 || maxXZ > 900 ? 440 / maxXZ : 1.08;

          // Estimate road ground Y from widest low horizontal meshes ('base', 'road', 'ground', etc.)
          let groundY = rawBox.min.y;
          let widestArea = 0;
          let groundMesh: THREE.Mesh | null = null;
          const tmpBox = new THREE.Box3();
          const tmpSize = new THREE.Vector3();

          root.traverse((obj) => {
            if (!(obj instanceof THREE.Mesh)) return;
            tmpBox.setFromObject(obj);
            tmpBox.getSize(tmpSize);
            const footprint = tmpSize.x * tmpSize.z;
            const matName = Array.isArray(obj.material)
              ? obj.material.map((m) => m.name).join(' ')
              : obj.material?.name || '';
            const isGroundHint = /base|road|ground|asphalt|street|terrain/i.test(
              `${obj.name} ${matName}`,
            );

            if ((isGroundHint || (tmpSize.y < 4 && footprint > widestArea)) && footprint > 400) {
              widestArea = footprint;
              groundY = tmpBox.max.y;
              groundMesh = obj;
            }
          });

          root.scale.setScalar(scaleFactor);
          root.position.set(
            -rawCenter.x * scaleFactor,
            -groundY * scaleFactor + 0.02,
            -rawCenter.z * scaleFactor,
          );
          root.updateMatrixWorld(true);

          // Build procedural textures only if external textures folder is missing
          let texMap: Record<string, THREE.CanvasTexture> | null = null;
          if (!resolved.hasTextures) {
            const facadeA = createProceduralCityTexture('facadeA');
            const facadeB = createProceduralCityTexture('facadeB');
            const asphalt = createProceduralCityTexture('asphalt');
            const metal = createProceduralCityTexture('metal');
            proceduralTextures.push(facadeA, facadeB, asphalt, metal);
            texMap = { facadeA, facadeB, asphalt, metal };
          }

          // Remove baked-in static road cars from the city 3D model, configure PBR materials & extract building OBBs
          const buildingObbs: OBB2D[] = [];
          root.traverse((obj) => {
            if (!(obj instanceof THREE.Mesh)) return;

            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            const matName = mats.map((m) => m?.name || '').join(' ');
            const fullName = `${obj.name} ${obj.parent?.name || ''} ${matName}`;

            // Strip baked-in city cars (sedans, police cars, vans, SUVs, fire trucks) while keeping elevated trains
            const isBakedCar =
              (/\bvehicles\b/i.test(matName) ||
                /\b(sedan|police|van|suv|fire\s*truck|taxi|bus|truck)\b/i.test(fullName)) &&
              !/\b(train|wagon)\b/i.test(fullName);

            if (isBakedCar) {
              obj.visible = false;
              return;
            }

            obj.receiveShadow = true;
            obj.castShadow = false;

            for (const mat of mats) {
              if (!mat) continue;
              if (!resolved.hasTextures && texMap && mat instanceof THREE.MeshStandardMaterial) {
                const mn = (mat.name || '').toLowerCase();
                if (mn === 'base') {
                  mat.map = texMap.asphalt;
                  mat.normalMap = null;
                  mat.roughnessMap = null;
                  mat.color.set('#ffffff');
                  mat.roughness = 0.88;
                  mat.metalness = 0.05;
                  mat.polygonOffset = true;
                  mat.polygonOffsetFactor = -1;
                  mat.polygonOffsetUnits = -1;
                } else if (mn === 'fasades') {
                  mat.map = texMap.facadeA;
                  mat.normalMap = null;
                  mat.roughnessMap = null;
                  mat.aoMap = null;
                  mat.color.set('#e2e8f0');
                  mat.roughness = 0.55;
                  mat.metalness = 0.25;
                } else if (mn === 'fasades2') {
                  mat.map = texMap.facadeB;
                  mat.roughnessMap = null;
                  mat.color.set('#cbd5e1');
                  mat.roughness = 0.62;
                  mat.metalness = 0.2;
                } else if (mn === 'details' || mn === 'rails') {
                  mat.map = texMap.metal;
                  mat.color.set('#94a3b8');
                  mat.roughness = 0.45;
                  mat.metalness = 0.45;
                } else if (mn === 'vehicles') {
                  // Elevated trains/wagons
                  mat.map = null;
                  mat.emissiveMap = null;
                  mat.emissive.set('#1e293b');
                  mat.emissiveIntensity = 0.25;
                  mat.color.set('#475569');
                  mat.roughness = 0.28;
                  mat.metalness = 0.68;
                }
              } else {
                if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
                if (mat.emissiveMap) mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
              }
              mat.needsUpdate = true;
            }

            tmpBox.setFromObject(obj);
            tmpBox.getSize(tmpSize);
            const isGround = /base|road|ground|asphalt/i.test(`${obj.name} ${matName}`);

            // Keep solid ground-touching building volumes as OBB walls
            if (
              !isGround &&
              tmpBox.max.y > 1.4 &&
              tmpBox.min.y < 5.5 &&
              tmpSize.x >= 2.2 &&
              tmpSize.z >= 2.2 &&
              tmpSize.x < 180 &&
              tmpSize.z < 180 &&
              tmpSize.x * tmpSize.z < 30000
            ) {
              const c = tmpBox.getCenter(new THREE.Vector3());
              buildingObbs.push({
                cx: c.x,
                cz: c.z,
                ux: 1,
                uz: 0,
                fx: 0,
                fz: -1,
                halfW: tmpSize.x * 0.5,
                halfL: tmpSize.z * 0.5,
              });
            }
          });

          // Shift city slightly if origin (0, 0) overlaps a building so spawn & Garage sit on an open avenue
          if (pointHitsAnyObb(0, 0, buildingObbs, 5.0)) {
            let bestDx = 0;
            let bestDz = 0;
            let bestDist = Infinity;
            for (let dz = -60; dz <= 60; dz += 2) {
              for (let dx = -60; dx <= 60; dx += 2) {
                if (!pointHitsAnyObb(dx, dz, buildingObbs, 5.0)) {
                  const d = dx * dx + dz * dz;
                  if (d < bestDist) {
                    bestDist = d;
                    bestDx = dx;
                    bestDz = dz;
                  }
                }
              }
            }
            if (bestDist < Infinity) {
              root.position.x -= bestDx;
              root.position.z -= bestDz;
              root.updateMatrixWorld(true);
              for (const obb of buildingObbs) {
                obb.cx -= bestDx;
                obb.cz -= bestDz;
              }
            }
          }

          // Compute final grounded city bounds (prefer groundMesh 'base' footprint so bounds match drivable ground)
          const boundsBox = groundMesh
            ? new THREE.Box3().setFromObject(groundMesh)
            : new THREE.Box3().setFromObject(root);
          const bounds: CityBounds2D = {
            minX: boundsBox.min.x,
            maxX: boundsBox.max.x,
            minZ: boundsBox.min.z,
            maxZ: boundsBox.max.z,
            centerX: (boundsBox.min.x + boundsBox.max.x) * 0.5,
            centerZ: (boundsBox.min.z + boundsBox.max.z) * 0.5,
            width: boundsBox.max.x - boundsBox.min.x,
            depth: boundsBox.max.z - boundsBox.min.z,
          };

          // Scale and place Garage, Car Lot & Race beacons cleanly inside the smaller city's streets
          const beaconScale = Math.min(bounds.width, bounds.depth) / 1080;
          const scaledBeacons: WorldBeacon[] = FREE_ROAM_BEACONS.map((b) => {
            if (b.id === 'beacon-garage') {
              return { ...b, x: 0, z: 0 };
            }
            const rawX = b.x * beaconScale;
            const rawZ = b.z * beaconScale;
            const clearPt = findNearestClearPoint(rawX, rawZ, buildingObbs, bounds, 4.5);
            return {
              ...b,
              x: Math.round(clearPt.x * 10) / 10,
              z: Math.round(clearPt.z * 10) / 10,
              radius: Math.max(6.5, Math.round(b.radius * 0.85 * 10) / 10),
            };
          });

          addPerimeterBounds(buildingObbs, bounds);

          // Freeze static transforms on glTF nodes to save per-frame matrix updates
          root.traverse((obj) => {
            obj.matrixAutoUpdate = false;
            obj.updateMatrix();
          });

          setCustomCityBounds(bounds);
          setCustomCityObstacleObbs(buildingObbs);
          setCustomCityBeacons(scaledBeacons);
          resetTrafficVehicles(useGameStore.getState().trafficCount);

          loadedRoot = root;
          setCityRoot(root);
          onLoadedChange(true);
        },
        undefined,
        () => {
          if (!cancelled) {
            onLoadedChange(false);
          }
        },
      );
    }

    loadCity();

    return () => {
      cancelled = true;
      setCustomCityObstacleObbs(null);
      setCustomCityBounds(null);
      setCustomCityBeacons(null);
      onLoadedChange(false);
      dracoLoader?.dispose();
      proceduralTextures.forEach((t) => t.dispose());
      if (loadedRoot) {
        loadedRoot.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m) => m?.dispose());
          }
        });
      }
    };
  }, [onLoadedChange]);

  if (!cityRoot) return null;
  return <primitive object={cityRoot} />;
}
