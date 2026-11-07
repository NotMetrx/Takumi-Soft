import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { AssistantRobot, ROBOT_CLIPS } from '../../src/lib/lab3d/assistant_robot';

function loadRobot(): Promise<GLTF> {
  const bytes = readFileSync(new URL('../../static/models/assistant/robot.glb', import.meta.url));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Promise((resolve, reject) => new GLTFLoader().parse(buffer, '', resolve, reject));
}

describe('Asistente robot', () => {
  it('el GLB trae el esqueleto, sus piezas y las cuatro animaciones', async () => {
    const gltf = await loadRobot();
    expect(gltf.animations.map(clip => clip.name).sort()).toEqual([...ROBOT_CLIPS].sort());
    for (const name of ['cabeza', 'torso', 'brazo_der', 'antebrazo_der', 'brazo_izq', 'antebrazo_izq']) {
      expect(gltf.scene.getObjectByName(name), name).toBeTruthy();
    }
    let triangles = 0;
    gltf.scene.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) triangles += mesh.geometry.index!.count / 3;
    });
    expect(triangles).toBeLessThan(12000);
  });

  it('flota en bucle, saluda moviendo el brazo derecho y vuelve solo a flotar', async () => {
    const gltf = await loadRobot();
    const robot = new AssistantRobot(gltf.scene, gltf.animations);
    expect(robot.current).toBe('flotar');

    const arm = gltf.scene.getObjectByName('brazo_der')!;
    gltf.scene.updateMatrixWorld(true);
    const rest = arm.getWorldQuaternion(new THREE.Quaternion());
    robot.play('saludar');
    expect(robot.current).toBe('saludar');
    robot.update(0.8);
    gltf.scene.updateMatrixWorld(true);
    expect(arm.getWorldQuaternion(new THREE.Quaternion()).angleTo(rest)).toBeGreaterThan(1);

    // 60 cuadros a 24 fps = 2,5 s: al terminar regresa a la animación de reposo
    for (let t = 0; t < 3; t += 0.1) robot.update(0.1);
    expect(robot.current).toBe('flotar');
    robot.dispose();
  });

  it('vuela hasta el alumno, lo mira, espera y regresa a su sitio', async () => {
    const gltf = await loadRobot();
    gltf.scene.position.set(-7, -1.55, 2.3);
    gltf.scene.rotation.y = 1.7;
    const robot = new AssistantRobot(gltf.scene, gltf.animations);
    const target = new THREE.Vector3(0, 0, 3);
    const student = new THREE.Vector3(0, 1.9, 6);

    robot.flyTo(target, student, 4, 'senalar');
    robot.update(0.5);
    expect(gltf.scene.position.distanceTo(target)).toBeLessThan(new THREE.Vector3(-7, -1.55, 2.3).distanceTo(target));
    expect(robot.current).toBe('flotar'); // no señala mientras vuela
    // ~7,5 m a 3,5 m/s: llega antes de 2,5 s y sigue esperando
    for (let t = 0; t < 2; t += 0.1) robot.update(0.1);
    expect(gltf.scene.position.distanceTo(target)).toBeLessThan(1e-6);
    expect(robot.current).toBe('senalar');
    expect(gltf.scene.rotation.y).toBeCloseTo(Math.atan2(student.x - target.x, student.z - target.z), 3);

    for (let t = 0; t < 8; t += 0.1) robot.update(0.1);
    expect(gltf.scene.position.distanceTo(new THREE.Vector3(-7, -1.55, 2.3))).toBeLessThan(1e-6);
    expect(gltf.scene.rotation.y).toBeCloseTo(1.7, 3);
    robot.dispose();
  });
});
