import * as THREE from 'three';

/**
 * Configurable showcase anchor, orientation, camera framing, and transition timings
 * for the Main Menu Turntable.
 */
export const TURNTABLE_CONFIG = {
  // World/local anchor for the player's car on the showroom turntable (tires sit flush at y = 0)
  defaultTurntablePosition: { x: 0, y: 0, z: 0 },

  // Default hero showcase yaw rotation in radians.
  // 0 rad aligns the car along -Z so the establishing camera sits in the rear-right 3/4 hero angle.
  defaultTurntableRotationY: 0,

  // Default establishing camera position, lookAt target, and field-of-view
  defaultCameraPosition: [4.4, 2.05, 5.6] as readonly [number, number, number],
  defaultCameraTarget: [0.45, 0.55, 0] as readonly [number, number, number],
  defaultCameraFov: 46,

  // Transition curtain timing (ms):
  // - transitionSnapHoldMs: opaque cover duration while car & camera transforms snap cleanly
  // - transitionFadeOutMs: smooth fade-in duration revealing the Main Menu while orbit stays briefly locked
  transitionSnapHoldMs: 140,
  transitionFadeOutMs: 360,
  transitionDurationMs: 500,
} as const;

/**
 * Returns a new THREE.Quaternion matching the default turntable showcase rotation.
 */
export function getTurntableShowcaseQuaternion(
  angleYRad: number = TURNTABLE_CONFIG.defaultTurntableRotationY,
): THREE.Quaternion {
  const quat = new THREE.Quaternion();
  quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angleYRad);
  return quat;
}

type ResetHandler = () => void;

let vehicleResetHandler: ResetHandler | null = null;
let cameraResetHandler: ResetHandler | null = null;

export function registerTurntableVehicleReset(handler: ResetHandler | null) {
  vehicleResetHandler = handler;
}

export function registerTurntableCameraReset(handler: ResetHandler | null) {
  cameraResetHandler = handler;
}

/**
 * Encapsulated reset method for the Main Menu turntable showcase.
 * Snaps the active vehicle to its turntable anchor/orientation, clears residual
 * gameplay physics/effects, and resets the Q/E camera orbit back to default framing.
 */
export function ResetTurntableShowcase() {
  vehicleResetHandler?.();
  cameraResetHandler?.();
}
