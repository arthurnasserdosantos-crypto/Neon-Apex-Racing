import * as THREE from 'three';

/**
 * Configuration constants for the Main Menu Showcase Turntable & Camera
 */
export const TURNTABLE_CONFIG = {
  // Center world anchor for the player's car on the turntable
  defaultTurntablePosition: { x: 0, y: 0.04, z: 0 },

  // Default hero showcase angle: -35.5 degrees yaw (-0.62 rad) so the car sits
  // in an aggressive 3/4 stance showing off front fascia, side profile, and wheels
  defaultTurntableRotationY: -0.62,

  // Camera establishing showcase framing
  defaultCameraPosition: [4.4, 2.05, 5.6] as const,
  defaultCameraTarget: [0.45, 0.55, 0] as const,
  defaultCameraFov: 46,

  // Duration in ms to keep the transition screen cover active to hide snapping
  transitionDurationMs: 380,
} as const;

/**
 * Returns a new THREE.Quaternion matching the default turntable showcase rotation
 */
export function getTurntableShowcaseQuaternion(
  angleYRad: number = TURNTABLE_CONFIG.defaultTurntableRotationY,
): THREE.Quaternion {
  const quat = new THREE.Quaternion();
  quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angleYRad);
  return quat;
}
