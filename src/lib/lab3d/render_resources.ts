import * as THREE from 'three';

/** Repeated opaque scenery; instance transforms remain fixed after construction. */
export function staticInstances(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  positions: readonly (readonly [number, number, number])[]
) {
  const mesh = new THREE.InstancedMesh(geometry, material, positions.length);
  const matrix = new THREE.Matrix4();
  positions.forEach((position, index) => mesh.setMatrixAt(index, matrix.makeTranslation(...position)));
  mesh.computeBoundingSphere();
  mesh.updateMatrix();
  mesh.matrixAutoUpdate = false;
  return mesh;
}

/** Only for an owner's discarded subtree; shared resources inside it are disposed once. */
export function disposeOwnedResources(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material) {
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material);
    }
    if (object instanceof THREE.InstancedMesh) object.dispose();
  });
  for (const material of materials) {
    for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
  }
  geometries.forEach(geometry => geometry.dispose());
  textures.forEach(texture => texture.dispose());
  materials.forEach(material => material.dispose());
}
