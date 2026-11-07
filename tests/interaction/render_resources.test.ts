import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { staticInstances, disposeOwnedResources } from '../../src/lib/lab3d/render_resources';
import { ARHandMeshRig, HAND_CONNECTIONS } from '../../src/lib/lab3d/ar_hand_mesh';

afterEach(() => vi.restoreAllMocks());

describe('Instancias y recursos de renderizado', () => {
  it('mantiene las posiciones del mobiliario y sus límites de visibilidad bajo un padre transformado', () => {
    const positions = [[-4.7, -0.88, 0.75], [-4.7, -0.88, -0.45], [-2.3, -0.88, 0.75], [-2.3, -0.88, -0.45]] as const;
    const geometry = new THREE.BoxGeometry(0.09, 1.3, 0.12);
    const mesh = staticInstances(geometry, new THREE.MeshStandardMaterial(), positions);
    const parent = new THREE.Group();
    parent.position.set(2, 1, 3);
    parent.rotation.y = 0.4;
    parent.add(mesh);
    parent.updateMatrixWorld(true);
    const matrix = new THREE.Matrix4();
    positions.forEach((position, index) => {
      mesh.getMatrixAt(index, matrix);
      const local = new THREE.Vector3().setFromMatrixPosition(matrix);
      expect(local.distanceTo(new THREE.Vector3(...position))).toBeLessThan(1e-6);
      expect(mesh.boundingSphere!.containsPoint(local)).toBe(true);
      expect(local.clone().applyMatrix4(mesh.matrixWorld).distanceTo(parent.localToWorld(new THREE.Vector3(...position)))).toBeLessThan(1e-6);
    });
    expect(mesh.matrixAutoUpdate).toBe(false);
    disposeOwnedResources(parent);
  });

  it('libera recursos compartidos una vez y también los buffers propios de las instancias', () => {
    const root = new THREE.Group();
    const texture = new THREE.Texture();
    const material = new THREE.MeshBasicMaterial({ map: texture, alphaMap: texture });
    const geometry = new THREE.BoxGeometry();
    const instance = staticInstances(geometry, material, [[0, 0, 0], [1, 0, 0]]);
    root.add(instance, new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
    const disposals = [vi.spyOn(geometry, 'dispose'), vi.spyOn(material, 'dispose'),
      vi.spyOn(texture, 'dispose'), vi.spyOn(instance, 'dispose')];
    disposeOwnedResources(root);
    disposals.forEach(listener => expect(listener).toHaveBeenCalledTimes(1));
  });
});

describe('Geometría de la mano articulada instanciada', () => {
  const points = Array.from({ length: 21 }, (_, i) => ({ x: 0.5 + i % 5 * 0.03, y: 0.5 + Math.floor(i / 5) * 0.04, z: -0.02 * (i % 4) }));
  const local = (index: number) => new THREE.Vector3(-(points[index].x - points[0].x) * 0.26,
    -(points[index].y - points[0].y) * 0.26, (points[index].z - points[0].z) * 0.26 * 1.5);

  it('alinea ambos extremos de cada hueso con sus landmarks y actualiza límites de culling', () => {
    const rig = new ARHandMeshRig();
    rig.updatePose(points, new THREE.PerspectiveCamera(), new THREE.Vector3(), 0, false, 1000);
    const bones = rig.group.getObjectByName('HandBones') as THREE.InstancedMesh;
    const matrix = new THREE.Matrix4();
    HAND_CONNECTIONS.forEach(([a, b], index) => {
      bones.getMatrixAt(index, matrix);
      expect(new THREE.Vector3(0, -0.5, 0).applyMatrix4(matrix).distanceTo(local(a))).toBeLessThan(1e-6);
      expect(new THREE.Vector3(0, 0.5, 0).applyMatrix4(matrix).distanceTo(local(b))).toBeLessThan(1e-6);
      expect(bones.boundingSphere!.containsPoint(local(a))).toBe(true);
      expect(bones.boundingSphere!.containsPoint(local(b))).toBe(true);
    });
    disposeOwnedResources(rig.group);
  });

  it('reutiliza vectores durante la pose y reinicia el filtro al perder la mano', () => {
    const rig = new ARHandMeshRig();
    const camera = new THREE.PerspectiveCamera();
    const target = new THREE.Vector3();
    rig.updatePose(points, camera, target, 0, false, 1000);
    const clone = vi.spyOn(THREE.Vector3.prototype, 'clone');
    rig.updatePose(points, camera, target, 0, false, 1016);
    expect(clone).not.toHaveBeenCalled();
    rig.updatePose(undefined, camera, target, 0, false, 1032);
    expect(rig.group.visible).toBe(false);
    const changed = points.map((point, index) => ({ ...point, x: point.x + index * 0.01 }));
    rig.updatePose(changed, camera, target, 0, false, 5000);
    const joints = rig.group.getObjectByName('HandJoints') as THREE.InstancedMesh;
    const matrix = new THREE.Matrix4();
    joints.getMatrixAt(1, matrix);
    expect(matrix.elements[12]).toBeCloseTo(-(changed[1].x - changed[0].x) * 0.26, 6);
    disposeOwnedResources(rig.group);
  });
});
