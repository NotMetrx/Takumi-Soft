import * as THREE from 'three';
import type { HandPoint } from '$lib/input/hand_gestures';
import type { SafetyGlovesType } from '$lib/interaction/lab_store.svelte';

// Conexiones óseas estándar entre los 21 landmarks de MediaPipe Hand
export const HAND_CONNECTIONS: [number, number][] = [
  // Muñeca a base de dedos (Palma/Metacarpo)
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4], // Pulgar
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8], // Índice
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12], // Medio
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16], // Anular
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20], // Meñique
  // Arcos intermetacarpianos de la palma
  [5, 9],
  [9, 13],
  [13, 17]
];

/**
 * Filtro 1-Euro para suavizar coordenadas 3D de landmarks con latencia mínima
 */
class OneEuroFilter3D {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private initialized = false;
  private xPrev = new THREE.Vector3();
  private derivative = new THREE.Vector3();
  private dxPrev: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private tPrev = 0;

  constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private smoothingFactor(dt: number, cutoff: number): number {
    const r = 2 * Math.PI * cutoff * dt;
    return r / (r + 1);
  }

  filter(val: THREE.Vector3, timestampMs: number): THREE.Vector3 {
    if (!this.initialized) {
      this.initialized = true;
      this.xPrev.copy(val);
      this.tPrev = timestampMs;
      return this.xPrev;
    }

    const dt = Math.max(0.001, (timestampMs - this.tPrev) * 0.001);
    this.tPrev = timestampMs;

    // Derivada (velocidad del movimiento)
    const dVal = this.derivative.copy(val).sub(this.xPrev).divideScalar(dt);
    const alphaD = this.smoothingFactor(dt, this.dCutoff);
    this.dxPrev.lerp(dVal, alphaD);

    // Frecuencia de corte adaptativa: aumenta con la velocidad para eliminar lag
    const speed = this.dxPrev.length();
    const cutoff = this.minCutoff + this.beta * speed;
    const alpha = this.smoothingFactor(dt, cutoff);

    this.xPrev.lerp(val, alpha);
    return this.xPrev;
  }

  reset() {
    this.initialized = false;
    this.dxPrev.set(0, 0, 0);
  }
}

/**
 * Mano 3D Articulada de Alta Fidelidad para Visión AR en Mesa
 * Joint and bone instances preserve the original geometry in four draw calls.
 */
export class ARHandMeshRig {
  group: THREE.Group;
  private jointInstances: THREE.InstancedMesh;
  private tipInstances: THREE.InstancedMesh;
  private boneInstances: THREE.InstancedMesh;
  private palmMesh: THREE.Mesh;

  private skinOrGloveMat: THREE.MeshStandardMaterial;
  private jointMat: THREE.MeshStandardMaterial;
  private glovesType: SafetyGlovesType = 'none';

  private filters: OneEuroFilter3D[] = [];
  private currentLandmarks: THREE.Vector3[] = [];

  // Vectores temporales para evitar Garbage Collection
  private tempVecA = new THREE.Vector3();
  private tempMid = new THREE.Vector3();
  private tempDiff = new THREE.Vector3();
  private instanceTransform = new THREE.Object3D();
  private up = new THREE.Vector3(0, 1, 0);

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'ARHandMeshRig';

    // Materiales PBR reactivos (Piel humana por defecto)
    this.skinOrGloveMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373,
      roughness: 0.55,
      metalness: 0.05
    });

    this.jointMat = new THREE.MeshStandardMaterial({
      color: 0xc69263,
      roughness: 0.5,
      metalness: 0.08
    });

    // Geometrías compartidas (instancing estático ligero para low-end PCs)
    const jointGeo = new THREE.SphereGeometry(0.012, 10, 8);
    const tipJointGeo = new THREE.SphereGeometry(0.010, 8, 6);
    const boneGeo = new THREE.CylinderGeometry(0.008, 0.009, 1, 8, 1, true);

    this.jointInstances = new THREE.InstancedMesh(jointGeo, this.jointMat, 16);
    this.tipInstances = new THREE.InstancedMesh(tipJointGeo, this.skinOrGloveMat, 5);
    this.boneInstances = new THREE.InstancedMesh(boneGeo, this.skinOrGloveMat, HAND_CONNECTIONS.length);
    this.jointInstances.name = 'HandJoints';
    this.tipInstances.name = 'HandFingertips';
    this.boneInstances.name = 'HandBones';
    for (const instances of [this.jointInstances, this.tipInstances, this.boneInstances]) {
      instances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.group.add(instances);
    }

    for (let i = 0; i < 21; i++) {
      this.filters.push(new OneEuroFilter3D(1.2, 0.008, 1.0));
      this.currentLandmarks.push(new THREE.Vector3(0, 0, 0));
    }

    // Almohadilla central de la palma
    this.palmMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.065, 0.018, 0.07),
      this.skinOrGloveMat
    );
    this.group.add(this.palmMesh);

    this.group.visible = false;
  }

  /**
   * Actualiza el material de la mano en tiempo real según el EPP equipado
   */
  updateGloves(glovesType: SafetyGlovesType) {
    if (glovesType === this.glovesType) return;
    this.glovesType = glovesType;
    if (glovesType === 'nitrile_blue') {
      this.skinOrGloveMat.color.setHex(0x2563eb); // Nitrilo azul químico
      this.skinOrGloveMat.roughness = 0.26;
      this.skinOrGloveMat.metalness = 0.16;

      this.jointMat.color.setHex(0x1d4ed8);
      this.jointMat.roughness = 0.28;
    } else if (glovesType === 'latex_white') {
      this.skinOrGloveMat.color.setHex(0xf1f5f9); // Látex blanco quirúrgico
      this.skinOrGloveMat.roughness = 0.32;
      this.skinOrGloveMat.metalness = 0.08;

      this.jointMat.color.setHex(0xe2e8f0);
      this.jointMat.roughness = 0.35;
    } else {
      this.skinOrGloveMat.color.setHex(0xd4a373); // Piel humana natural
      this.skinOrGloveMat.roughness = 0.55;
      this.skinOrGloveMat.metalness = 0.05;

      this.jointMat.color.setHex(0xc69263);
      this.jointMat.roughness = 0.5;
    }
  }

  /**
   * Actualiza la postura de la mano en la mesa basándose en los landmarks de MediaPipe
   */
  updatePose(
    landmarks: HandPoint[] | undefined,
    camera: THREE.Camera,
    targetPosition: THREE.Vector3,
    tilt: number,
    pinched: boolean,
    now: number
  ) {
    if (!landmarks || landmarks.length !== 21) {
      this.hide();
      return;
    }

    this.group.visible = true;

    // Escala métrica estimada de la palma en el mundo 3D (~18 cm mano adulta)
    const scale = 0.26;

    // 1. Calcular orientación e interpolar landmarks con el filtro 1-Euro
    const wristRaw = landmarks[0];

    for (let i = 0; i < 21; i++) {
      const p = landmarks[i];
      // Normalizar respecto a la muñeca (p[0])
      const lx = -(p.x - wristRaw.x) * scale;
      const ly = -(p.y - wristRaw.y) * scale;
      const lz = ((p.z ?? 0) - (wristRaw.z ?? 0)) * scale * 1.5;

      this.tempVecA.set(lx, ly, lz);
      // Aplicar filtro de suavizado adaptativo 1-Euro
      const filtered = this.filters[i].filter(this.tempVecA, now);
      this.currentLandmarks[i].copy(filtered);
    }

    // 2. Posicionar el grupo completo en la escena cerca del recipiente o cursor
    this.group.position.copy(targetPosition);
    this.group.rotation.set(0, 0, 0);
    this.group.rotateZ(tilt * 0.9);

    // Si está agarrando un matraz, inclinar la mano ligeramente hacia la boca del frasco
    if (pinched) {
      this.group.position.y += 0.02;
    }

    // 3. Posicionar articulaciones
    const transform = this.instanceTransform;
    transform.quaternion.identity();
    transform.scale.setScalar(1);
    let jointIndex = 0, tipIndex = 0;
    for (let i = 0; i < 21; i++) {
      transform.position.copy(this.currentLandmarks[i]);
      transform.updateMatrix();
      if (i > 0 && i % 4 === 0) this.tipInstances.setMatrixAt(tipIndex++, transform.matrix);
      else this.jointInstances.setMatrixAt(jointIndex++, transform.matrix);
    }

    // 4. Posicionar y orientar cilindros de conexión (huesos)
    for (let c = 0; c < HAND_CONNECTIONS.length; c++) {
      const [idxA, idxB] = HAND_CONNECTIONS[c];
      const posA = this.currentLandmarks[idxA];
      const posB = this.currentLandmarks[idxB];

      this.tempMid.copy(posA).add(posB).multiplyScalar(0.5);
      this.tempDiff.copy(posB).sub(posA);
      const len = this.tempDiff.length();

      transform.position.copy(this.tempMid);
      transform.scale.set(1, len, 1);
      transform.quaternion.setFromUnitVectors(this.up, this.tempDiff.normalize());
      transform.updateMatrix();
      this.boneInstances.setMatrixAt(c, transform.matrix);
    }
    this.jointInstances.instanceMatrix.needsUpdate = true;
    this.tipInstances.instanceMatrix.needsUpdate = true;
    this.boneInstances.instanceMatrix.needsUpdate = true;
    // Poses change the local bounds; refresh them so fingers remain visible while moving.
    this.jointInstances.computeBoundingSphere();
    this.tipInstances.computeBoundingSphere();
    this.boneInstances.computeBoundingSphere();

    // 5. Posicionar la palma central (punto medio entre muñeca y base de dedos)
    const wristPos = this.currentLandmarks[0];
    const middleMcpPos = this.currentLandmarks[9];
    this.palmMesh.position.copy(wristPos).add(middleMcpPos).multiplyScalar(0.5);
    this.palmMesh.lookAt(middleMcpPos);
  }

  hide() {
    if (!this.group.visible) return;
    this.group.visible = false;
    for (let i = 0; i < this.filters.length; i++) {
      this.filters[i].reset();
    }
  }
}
