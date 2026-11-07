import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { extractLabPropColliders, prepareLabPropsAsset } from '../../src/lib/lab3d/lab_props';

function loadLabPropsGlb(): Promise<THREE.Group> {
  const bytes = readFileSync(new URL('../../static/models/lab/lab_props.glb', import.meta.url));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Promise((resolve, reject) => new GLTFLoader().parse(buffer, '', gltf => resolve(gltf.scene), reject));
}

const overlaps = (a: { minX: number; maxX: number; minZ: number; maxZ: number }, b: typeof a) =>
  a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;

describe('Mobiliario de laboratorio modelado en Blender', () => {
  it('convierte los nodos COL_ en cajas de colisión y los retira de la escena', () => {
    const root = new THREE.Group();
    const col = new THREE.Object3D();
    col.name = 'COL_campana_extractora';
    col.position.set(9, 1, 2);
    col.scale.set(0.75, 2.6, 1.3);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    root.add(col, mesh);

    const boxes = extractLabPropColliders(root);

    expect(boxes).toHaveLength(1);
    expect(boxes[0].name).toBe('scene:lab_props:campana_extractora');
    expect(boxes[0].minX).toBeCloseTo(8.25);
    expect(boxes[0].maxX).toBeCloseTo(9.75);
    expect(boxes[0].minZ).toBeCloseTo(0.7);
    expect(boxes[0].maxZ).toBeCloseTo(3.3);
    expect(col.parent).toBeNull();
    expect(mesh.parent).toBe(root);
  });

  it('en perfil básico reemplaza el vidrio con transmisión y libera el material original', () => {
    const root = new THREE.Group();
    const glass = new THREE.MeshPhysicalMaterial({ transmission: 1, color: 0xdcebf0 });
    let disposed = 0;
    glass.addEventListener('dispose', () => disposed++);
    const opaque = new THREE.MeshStandardMaterial();
    const a = new THREE.Mesh(new THREE.BoxGeometry(), glass);
    const b = new THREE.Mesh(new THREE.BoxGeometry(), glass);
    const c = new THREE.Mesh(new THREE.BoxGeometry(), opaque);
    root.add(a, b, c);

    prepareLabPropsAsset(root, { basicGraphics: true, shadows: false });

    const replaced = a.material as THREE.MeshStandardMaterial;
    expect(replaced).toBe(b.material);
    expect(replaced).not.toBeInstanceOf(THREE.MeshPhysicalMaterial);
    expect(replaced.transparent).toBe(true);
    expect(replaced.depthWrite).toBe(false);
    expect(c.material).toBe(opaque);
    expect(disposed).toBe(1);
    expect(a.castShadow).toBe(false);
    expect(a.matrixAutoUpdate).toBe(false);
  });

  it('en perfil estándar conserva el vidrio físico y activa sombras', () => {
    const root = new THREE.Group();
    const glass = new THREE.MeshPhysicalMaterial({ transmission: 1 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), glass);
    root.add(mesh);
    prepareLabPropsAsset(root, { basicGraphics: false, shadows: true });
    expect(mesh.material).toBe(glass);
    expect(mesh.castShadow).toBe(true);
    expect(mesh.receiveShadow).toBe(true);
  });

  it('el GLB exportado respeta el presupuesto y no invade mesas, SAS ni la zona de aparición', async () => {
    const asset = await loadLabPropsGlb();
    const boxes = extractLabPropColliders(asset);
    expect(boxes.length).toBe(18);

    let triangles = 0;
    let drawCalls = 0;
    asset.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      drawCalls++;
      const index = mesh.geometry.index;
      triangles += (index ? index.count : mesh.geometry.attributes.position.count) / 3;
    });
    expect(triangles).toBeLessThan(30000);
    expect(drawCalls).toBeLessThanOrEqual(100);

    const keepOut = [
      { name: 'chem_table', minX: -2.25, maxX: 2.25, minZ: -1.35, maxZ: 1.35 },
      { name: 'bio_table', minX: -6.1, maxX: -2.5, minZ: -1.1, maxZ: 1.4 },
      { name: 'steam_table', minX: 2.5, maxX: 6.1, minZ: -1.1, maxZ: 1.4 },
      { name: 'paso_sas', minX: -1.6, maxX: 1.6, minZ: 7.5, maxZ: 14.5 },
      { name: 'pasillo_central', minX: -6.5, maxX: 6.5, minZ: 1.6, maxZ: 7.5 }
    ];
    for (const box of boxes) {
      expect(box.minX, box.name).toBeGreaterThanOrEqual(-9.95);
      expect(box.maxX, box.name).toBeLessThanOrEqual(9.95);
      expect(box.minZ, box.name).toBeGreaterThanOrEqual(-2.35);
      expect(box.maxZ, box.name).toBeLessThanOrEqual(9.95);
      expect(box.maxX - box.minX, box.name).toBeLessThan(3.2);
      expect(box.maxZ - box.minZ, box.name).toBeLessThan(3.2);
      for (const zone of keepOut) expect(overlaps(box, zone), `${box.name} invade ${zone.name}`).toBe(false);
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        expect(overlaps(boxes[i], boxes[j]), `${boxes[i].name} se superpone con ${boxes[j].name}`).toBe(false);
      }
    }
  });
});
