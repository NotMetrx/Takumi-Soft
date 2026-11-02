import { describe, expect, it } from 'vitest';
import { Euler, PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three';
import { handDepthOffset, handDragPlane, handFlaskPose } from '../../src/lib/lab3d/hand_manipulation';
import { flaskFluid, pourRate, streamHitsBeaker } from '../../src/lib/lab3d/fluid';

describe('Movimiento de matraces con MediaPipe', () => {
  it('subir la mano eleva el recipiente sin adelantarlo, incluso con la cámara girada', () => {
    for (const cameraX of [0, 1.5, -1.5]) {
      const camera = new PerspectiveCamera(45, 1.5, 0.1, 100);
      camera.position.set(cameraX, 1.9, 3.45); camera.lookAt(0, 0.57, 0); camera.updateMatrixWorld();
      const start = new Vector3(-1.08, 0.02, 0.25);
      const plane = handDragPlane(camera, start);
      const projected = start.clone().add(new Vector3(0, 0.25, 0)).project(camera);
      const pointer = new Vector2(projected.x, projected.y);
      const raycaster = new Raycaster();
      raycaster.setFromCamera(pointer, camera);
      const initialHit = raycaster.ray.intersectPlane(plane, new Vector3())!;
      const grabOffset = start.clone().sub(initialHit);
      expect(initialHit.clone().add(grabOffset).distanceTo(start)).toBeLessThan(1e-10);
      pointer.y += 0.2;
      raycaster.setFromCamera(pointer, camera);
      const lifted = raycaster.ray.intersectPlane(plane, new Vector3())!.add(grabOffset);
      expect(lifted.y).toBeGreaterThan(start.y + 0.2);
      expect(lifted.clone().sub(start).dot(plane.normal)).toBeCloseTo(0, 10);
    }
  });

  it('ignora pequeñas variaciones de tamaño y limita la profundidad relativa', () => {
    for (const size of [0.36, 0.4, 0.44]) expect(handDepthOffset(size, 0.4)).toBe(0);
    expect(handDepthOffset(0.6, 0.4)).toBeGreaterThan(0);
    expect(handDepthOffset(0.25, 0.4)).toBeLessThan(0);
    expect(handDepthOffset(4, 0.4)).toBe(0.45);
    expect(handDepthOffset(0.01, 0.4)).toBe(-0.45);
    for (const size of [NaN, Infinity, 0, -1]) expect(handDepthOffset(size, 0.4)).toBe(0);
  });

  it('mover la mano en profundidad cambia el plano sin convertirlo en un salto de altura', () => {
    const camera = new PerspectiveCamera(45, 1.5, 0.1, 100);
    camera.position.set(0, 1.9, 3.45); camera.lookAt(0, 0.57, 0); camera.updateMatrixWorld();
    const plane = handDragPlane(camera, new Vector3(-1.08, 0.5, 0.25));
    const normal = plane.normal.clone();
    const offset = handDepthOffset(0.6, 0.4);
    const closer = plane.clone(); closer.constant -= offset;
    expect(closer.distanceToPoint(new Vector3(-1.08, 0.5, 0.25).addScaledVector(normal, offset))).toBeCloseTo(0, 10);
    expect(normal.y).toBe(0);
  });

  it('permite elevar y trasladar libremente sin activar la antigua posición de vertido', () => {
    const position = new Vector3(-0.2, 1.3, 0.25);
    const pose = handFlaskPose(position, 0, -1.08);
    expect(pose.position.toArray()).toEqual(position.toArray());
    expect(pose.angle).toBeCloseTo(0, 10);
    const low = handFlaskPose(new Vector3(0.4, 0.3, 0.25), 0, -1.08);
    expect(low.position.x).toBeLessThan(-0.7);
    expect(low.position.y).toBe(0.3);
    expect(low.position.z).toBe(0.25);
  });

  it('el giro conserva su dirección y ambos matraces pueden verter por la boca del vaso', () => {
    for (const side of [-1, 1]) {
      const pose = handFlaskPose(new Vector3(side * 0.9, 1.65, 0), -side, side);
      expect(pose.angle).toBe(side * 1.95);
      const nozzle = new Vector3(-Math.sign(pose.angle) * 0.09, 0.81, 0)
        .applyEuler(new Euler(0, 0, pose.angle)).add(pose.position);
      expect(streamHitsBeaker(nozzle)).toBe(true);
      expect(pourRate(pose.angle, flaskFluid(pose.angle, 0.65).height)).toBeGreaterThan(0);
      const away = handFlaskPose(new Vector3(side * 0.9, 1.65, 0), side, side);
      const awayNozzle = new Vector3(-Math.sign(away.angle) * 0.09, 0.81, 0)
        .applyEuler(new Euler(0, 0, away.angle)).add(away.position);
      expect(streamHitsBeaker(awayNozzle)).toBe(false);
    }
  });

  it('mantiene el recipiente por encima de la mesa y dentro de su alcance', () => {
    for (const tilt of [-1, 0, 1]) {
      const { position, angle } = handFlaskPose(new Vector3(-4, -2, 5), tilt, -1);
      expect(position.x).toBe(-1.7); expect(position.z).toBe(0.65);
      for (const [radius, y] of [[0.3, 0], [0.33, 0.04], [0.135, 0.82]]) {
        expect(position.y + y * Math.cos(angle) - radius * Math.abs(Math.sin(angle))).toBeGreaterThanOrEqual(0.009);
      }
    }
  });
});
