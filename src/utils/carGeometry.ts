import * as THREE from 'three';

export interface CarGeometrySet {
  centerBody: THREE.BufferGeometry;
  sideFender: THREE.BufferGeometry;
  cabinGlass: THREE.BufferGeometry;
  roofCap: THREE.BufferGeometry;
  rearWingBlade: THREE.BufferGeometry;
  tire: THREE.BufferGeometry;
  rimLip: THREE.BufferGeometry;
  archFlare: THREE.BufferGeometry;
}

/**
 * Builds procedural, beveled sports-car geometries oriented so:
 *  - Forward = -Z
 *  - Rear    = +Z
 *  - Up      = +Y
 *  - Width   = X
 *  - Ground  = Y = 0
 */
export function createCarGeometrySet(): CarGeometrySet {
  // 1. Central monocoque body (hood -> cabin base -> engine deck)
  const centerShape = new THREE.Shape();
  centerShape.moveTo(-2.14, 0.26); // rear bottom
  centerShape.lineTo(2.10, 0.22);  // flat undertray to front splitter
  centerShape.lineTo(2.18, 0.34);  // front nose tip
  centerShape.quadraticCurveTo(2.05, 0.56, 1.55, 0.64); // sloped hood
  centerShape.lineTo(0.86, 0.73);  // cowl / windshield base
  centerShape.lineTo(-0.92, 0.80); // cabin waist
  centerShape.lineTo(-1.95, 0.83); // rear engine deck
  centerShape.lineTo(-2.16, 0.74); // rear fascia top
  centerShape.lineTo(-2.14, 0.26); // close

  const centerBody = new THREE.ExtrudeGeometry(centerShape, {
    depth: 1.32,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.04,
    bevelSegments: 4,
    curveSegments: 16,
  });
  centerBody.translate(0, 0, -0.66);
  centerBody.rotateY(Math.PI / 2);
  centerBody.computeVertexNormals();

  // 2. Sculpted side fender pod with real semicircular wheel-arch cutouts
  //    Wheel centers: front z = -1.35 (shape x = +1.35), rear z = +1.35 (shape x = -1.35)
  const sideShape = new THREE.Shape();
  // Start at rear bumper bottom
  sideShape.moveTo(-2.10, 0.28);
  sideShape.lineTo(-1.82, 0.26);
  // Rear wheel arch cutout (center x = -1.35, y = 0.36, r = 0.43)
  sideShape.absarc(-1.35, 0.36, 0.43, Math.PI, 0, true);
  // Rocker / side skirt bottom
  sideShape.lineTo(0.94, 0.23);
  // Front wheel arch cutout (center x = +1.35, y = 0.35, r = 0.41)
  sideShape.absarc(1.35, 0.35, 0.41, Math.PI, 0, true);
  // Front bumper bottom to nose
  sideShape.lineTo(2.10, 0.23);
  sideShape.lineTo(2.14, 0.38);
  // Muscular front fender arch line
  sideShape.quadraticCurveTo(1.75, 0.72, 1.35, 0.79);
  sideShape.quadraticCurveTo(0.95, 0.80, 0.55, 0.74);
  // Door shoulder & rear haunch kick-up
  sideShape.lineTo(-0.65, 0.77);
  sideShape.quadraticCurveTo(-1.15, 0.90, -1.60, 0.88);
  sideShape.lineTo(-2.12, 0.78);
  sideShape.lineTo(-2.10, 0.28);

  const sideFender = new THREE.ExtrudeGeometry(sideShape, {
    depth: 0.24,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 3,
    curveSegments: 20,
  });
  sideFender.translate(0, 0, -0.12);
  sideFender.rotateY(Math.PI / 2);
  sideFender.computeVertexNormals();

  // 3. Tinted wrap-around cabin glass canopy
  const glassShape = new THREE.Shape();
  glassShape.moveTo(-1.26, 0.76);
  glassShape.lineTo(0.86, 0.71);
  glassShape.quadraticCurveTo(0.50, 1.06, 0.18, 1.15); // raked windshield
  glassShape.lineTo(-0.56, 1.14); // roofline
  glassShape.quadraticCurveTo(-0.96, 0.98, -1.26, 0.76); // fastback rear glass

  const cabinGlass = new THREE.ExtrudeGeometry(glassShape, {
    depth: 1.24,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 3,
    curveSegments: 16,
  });
  cabinGlass.translate(0, 0, -0.62);
  cabinGlass.rotateY(Math.PI / 2);
  cabinGlass.computeVertexNormals();

  // 4. Painted roof panel & A/C pillar frame cap
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-1.22, 0.78);
  roofShape.lineTo(-0.56, 1.18);
  roofShape.lineTo(0.20, 1.19);
  roofShape.lineTo(0.76, 0.76);
  roofShape.lineTo(0.60, 0.74);
  roofShape.lineTo(0.16, 1.12);
  roofShape.lineTo(-0.52, 1.11);
  roofShape.lineTo(-1.06, 0.76);
  roofShape.lineTo(-1.22, 0.78);

  const roofCap = new THREE.ExtrudeGeometry(roofShape, {
    depth: 1.26,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.03,
    bevelSegments: 3,
  });
  roofCap.translate(0, 0, -0.63);
  roofCap.rotateY(Math.PI / 2);
  roofCap.computeVertexNormals();

  // 5. Cambered GT rear wing airfoil
  const wingShape = new THREE.Shape();
  wingShape.moveTo(-0.18, 0.02);
  wingShape.quadraticCurveTo(0.0, 0.06, 0.22, 0.0);
  wingShape.quadraticCurveTo(0.0, 0.015, -0.18, 0.02);

  const rearWingBlade = new THREE.ExtrudeGeometry(wingShape, {
    depth: 1.86,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  rearWingBlade.translate(0, 0, -0.93);
  rearWingBlade.rotateY(Math.PI / 2);
  rearWingBlade.computeVertexNormals();

  // 6. Profiled performance tire via LatheGeometry (radius 0.35, width 0.28)
  const tirePoints: THREE.Vector2[] = [
    new THREE.Vector2(0.23, -0.13),
    new THREE.Vector2(0.32, -0.145),
    new THREE.Vector2(0.35, -0.12),
    new THREE.Vector2(0.355, 0.0),
    new THREE.Vector2(0.35, 0.12),
    new THREE.Vector2(0.32, 0.145),
    new THREE.Vector2(0.23, 0.13),
  ];
  const tire = new THREE.LatheGeometry(tirePoints, 28);
  tire.rotateZ(Math.PI / 2);
  tire.computeVertexNormals();

  // 7. Alloy rim barrel & outer lip
  const rimPoints: THREE.Vector2[] = [
    new THREE.Vector2(0.18, -0.12),
    new THREE.Vector2(0.235, -0.13),
    new THREE.Vector2(0.24, -0.10),
    new THREE.Vector2(0.21, 0.0),
    new THREE.Vector2(0.24, 0.11),
    new THREE.Vector2(0.235, 0.135),
    new THREE.Vector2(0.19, 0.12),
  ];
  const rimLip = new THREE.LatheGeometry(rimPoints, 28);
  rimLip.rotateZ(Math.PI / 2);
  rimLip.computeVertexNormals();

  // 8. Fender arch flare trim
  const archFlare = new THREE.TorusGeometry(0.43, 0.028, 8, 20, Math.PI);
  archFlare.rotateY(Math.PI / 2);

  return {
    centerBody,
    sideFender,
    cabinGlass,
    roofCap,
    rearWingBlade,
    tire,
    rimLip,
    archFlare,
  };
}

export function disposeCarGeometrySet(set: CarGeometrySet) {
  Object.values(set).forEach((geo) => geo.dispose());
}
