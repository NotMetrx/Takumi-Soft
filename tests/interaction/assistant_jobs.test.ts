import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { AssistantRobot } from '../../src/lib/lab3d/assistant_robot';
import { JobQueue, type JobHost } from '../../src/lib/lab3d/assistant_jobs';

function loadRobot(): Promise<GLTF> {
  const bytes = readFileSync(new URL('../../static/models/assistant/robot.glb', import.meta.url));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Promise((resolve, reject) => new GLTFLoader().parse(buffer, '', resolve, reject));
}

async function setup() {
  const gltf = await loadRobot();
  const world = new THREE.Scene();
  gltf.scene.position.set(-7, -1.55, 2.3);
  world.add(gltf.scene);
  const shelf = new THREE.Group();
  shelf.position.set(2, 0, 0);
  const tool = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.1));
  tool.position.set(0.5, 0.1, 0);
  shelf.add(tool);
  world.add(shelf);
  const robot = new AssistantRobot(gltf.scene, gltf.animations);
  const said: string[] = [];
  const host: JobHost = {
    robot,
    resolve: to => (to === 'quimica' ? { pos: new THREE.Vector3(0, -1, 2), lookAt: new THREE.Vector3(0, 0, 0) }
      : to === 'alumno' ? { pos: new THREE.Vector3(0, 0, 5), lookAt: new THREE.Vector3(0, 1.9, 8) }
      : to === 'objeto:gotero' ? { pos: new THREE.Vector3(2.5, -0.5, 0.8), lookAt: new THREE.Vector3(2.5, 0, 0) }
      : null),
    object: id => (id === 'gotero' ? tool : null),
    say: text => said.push(text)
  };
  return { robot, host, tool, shelf, said, root: gltf.scene };
}

const run = (queue: JobQueue, seconds: number) => { for (let t = 0; t < seconds; t += 0.05) queue.update(0.05); };

describe('Asistente: cola de trabajos', () => {
  it('ejecuta los pasos en orden: habla, vuela, señala, espera y vuelve a su sitio', async () => {
    const { host, said, root, robot } = await setup();
    const queue = new JobQueue(host);
    queue.run([
      { type: 'hablar', text: 'Vamos a química.' },
      { type: 'volar', to: 'quimica' },
      { type: 'gesto', clip: 'senalar' },
      { type: 'esperar', s: 1 },
      { type: 'volver' }
    ]);
    expect(queue.busy).toBe(true);
    queue.update(0.05);
    expect(said).toEqual(['Vamos a química.']);
    run(queue, 4);
    expect(root.position.distanceTo(new THREE.Vector3(0, -1, 2))).toBeLessThan(1e-6);
    expect(robot.current).toBe('senalar');
    run(queue, 8);
    expect(root.position.distanceTo(new THREE.Vector3(-7, -1.55, 2.3))).toBeLessThan(1e-6);
    expect(queue.busy).toBe(false);
  });

  it('agarra un objeto, lo lleva y lo devuelve exactamente a su sitio', async () => {
    const { host, tool, shelf } = await setup();
    const queue = new JobQueue(host);
    queue.run([
      { type: 'volar', to: 'objeto:gotero' },
      { type: 'agarrar', object: 'gotero' },
      { type: 'volar', to: 'alumno' },
      { type: 'esperar', s: 0.5 },
      { type: 'devolver' },
      { type: 'volver' }
    ]);
    run(queue, 4);
    expect(tool.parent).not.toBe(shelf);
    const carried = tool.getWorldPosition(new THREE.Vector3());
    expect(carried.distanceTo(new THREE.Vector3(2.5, 0.1, 0))).toBeGreaterThan(1);
    run(queue, 15);
    expect(tool.parent).toBe(shelf);
    expect(tool.position.toArray()).toEqual([0.5, 0.1, 0]);
    expect(queue.busy).toBe(false);
  });

  it('ignora pasos fuera de la lista blanca y destinos desconocidos', async () => {
    const { host } = await setup();
    const queue = new JobQueue(host);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    queue.run([{ type: 'borrar_todo' } as never, { type: 'volar', to: 'luna' }, { type: 'esperar', s: 0.1 }]);
    run(queue, 1);
    expect(queue.busy).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('cancelar a mitad suelta lo que llevaba en su sitio', async () => {
    const { host, tool, shelf } = await setup();
    const queue = new JobQueue(host);
    queue.run([{ type: 'volar', to: 'objeto:gotero' }, { type: 'agarrar', object: 'gotero' }, { type: 'volar', to: 'alumno' }]);
    run(queue, 3);
    expect(tool.parent).not.toBe(shelf);
    queue.cancel();
    expect(tool.parent).toBe(shelf);
    expect(tool.position.toArray()).toEqual([0.5, 0.1, 0]);
  });
});
