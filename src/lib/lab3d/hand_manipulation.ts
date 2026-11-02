import { Camera, MathUtils, Plane, Vector3 } from 'three';

/** A vertical plane preserves height instead of translating screen Y into table depth. */
export function handDragPlane(camera: Camera, position: Vector3) {
  const normal = camera.getWorldDirection(new Vector3()).negate();
  normal.y = 0;
  return new Plane().setFromNormalAndCoplanarPoint(normal.normalize(), position);
}

export function handDepthOffset(palmSize: number, grabbedPalmSize: number) {
  if (![palmSize, grabbedPalmSize].every(n => Number.isFinite(n) && n > 0)) return 0;
  // shortcut: apparent palm size estimates relative depth, not distance in metres; calibrate hardware for metric tracking.
  const change = Math.log(palmSize / grabbedPalmSize);
  const deadZone = Math.log(1.15);
  if (Math.abs(change) <= deadZone) return 0;
  return MathUtils.clamp(Math.sign(change) * Math.max(0, Math.abs(change) - deadZone) * 0.9, -0.45, 0.45);
}

export function handFlaskPose(point: Vector3, wristTilt: number, sideX: number) {
  // The camera preview is mirrored: the flask follows the visible direction of the wrist.
  const angle = -MathUtils.clamp(wristTilt, -1, 1) * 1.95;
  const sin = Math.abs(Math.sin(angle)), cos = Math.cos(angle);
  const lowest = Math.min(-0.3 * sin, 0.04 * cos - 0.33 * sin, 0.82 * cos - 0.135 * sin);
  const position = new Vector3(
    MathUtils.clamp(point.x, -1.7, 1.7),
    MathUtils.clamp(point.y, Math.max(0.02, 0.01 - lowest), 1.5),
    MathUtils.clamp(point.z, -0.4, 0.65)
  );
  // shortcut: lateral clearance, not full glass contact; use solid collisions for tilted-vessel contact.
  if (position.y < 1.04 && Math.abs(position.z) < 0.76) {
    const edge = Math.sqrt(0.76 ** 2 - position.z ** 2);
    position.x = sideX < 0 ? Math.min(position.x, -edge) : Math.max(position.x, edge);
  }
  return { position, angle };
}
