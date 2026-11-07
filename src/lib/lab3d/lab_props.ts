import * as THREE from 'three';
import type { FirstPersonColliderBox } from './first_person_controller';

/**
 * Mobiliario perimetral modelado en Blender (`assets/blender/laboratorio-app.blend`).
 * El GLB ya viene en coordenadas de la nave (Y arriba, suelo en y = -1.55) y agrupado por zona y material.
 */
export const LAB_PROPS_URL = '/models/lab/lab_props.glb';

/**
 * Infraestructura de la nave (mismo `.blend`, colección `LabInfra`): despiece de paneles, ventanas altas,
 * conductos de ventilación vistos, bandeja portacables, luminarias lineales, detector de gases y
 * señalización de evacuación en el suelo. Va sobre paredes, techo y suelo, así que no lleva colisiones.
 */
export const LAB_INFRA_URL = '/models/lab/lab_infra.glb';

const COLLIDER_PREFIX = 'COL_';

/**
 * Los nodos `COL_<objeto>` son Empties de cubo exportados desde Blender: su escala es la semiextensión
 * de la huella del mueble. Se convierten en cajas AABB y se retiran del grafo para no recorrerlos al renderizar.
 */
export function extractLabPropColliders(root: THREE.Object3D): FirstPersonColliderBox[] {
  root.updateMatrixWorld(true);
  const nodes: THREE.Object3D[] = [];
  root.traverse(object => {
    const name = (object.userData.name as string | undefined) ?? object.name;
    if (name.startsWith(COLLIDER_PREFIX)) nodes.push(object);
  });

  const center = new THREE.Vector3();
  const half = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  return nodes.map(node => {
    node.matrixWorld.decompose(center, quaternion, half);
    node.removeFromParent();
    const name = ((node.userData.name as string | undefined) ?? node.name).slice(COLLIDER_PREFIX.length);
    return {
      minX: center.x - Math.abs(half.x),
      maxX: center.x + Math.abs(half.x),
      minZ: center.z - Math.abs(half.z),
      maxZ: center.z + Math.abs(half.z),
      name: `scene:lab_props:${name}`
    };
  });
}

/**
 * Ajusta el GLB al perfil gráfico: el mobiliario es estático, así que se congelan sus matrices.
 * En perfil básico el vidrio con transmisión (pasada extra de render) se sustituye por un vidrio translúcido simple.
 */
export function prepareLabPropsAsset(root: THREE.Object3D, options: { basicGraphics: boolean; shadows: boolean }) {
  const replacements = new Map<THREE.Material, THREE.Material>();
  const simplify = (material: THREE.Material) => {
    if (!options.basicGraphics || !(material instanceof THREE.MeshPhysicalMaterial) || material.transmission <= 0) {
      return material;
    }
    let simple = replacements.get(material);
    if (!simple) {
      simple = new THREE.MeshStandardMaterial({
        name: material.name,
        color: material.color,
        roughness: Math.max(material.roughness, 0.1),
        metalness: 0,
        transparent: true,
        opacity: 0.28,
        depthWrite: false
      });
      replacements.set(material, simple);
    }
    return simple;
  };

  root.traverse(object => {
    object.matrixAutoUpdate = false;
    object.updateMatrix();
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = options.shadows;
    mesh.receiveShadow = options.shadows;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(simplify) : simplify(mesh.material);
  });
  for (const original of replacements.keys()) original.dispose();
  root.updateMatrixWorld(true);
}
