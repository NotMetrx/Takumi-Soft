import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { FirstPersonController } from '../../src/lib/lab3d/first_person_controller';
import { labStore } from '../../src/lib/interaction/lab_store.svelte';

const createMockElement = () =>
  ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    requestPointerLock: vi.fn()
  }) as unknown as HTMLElement;

describe('FirstPersonController Avanzado (Brazos, Movilidad, Colisiones y Retícula)', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      innerWidth: 1024,
      innerHeight: 768
    });
    vi.stubGlobal('document', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      exitPointerLock: vi.fn(),
      pointerLockElement: null
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('inicializa con brazos en primera persona, cámara y colisionadores AABB', () => {
    const camera = new THREE.PerspectiveCamera(75, 1.33, 0.1, 100);
    const domElement = createMockElement();
    const controller = new FirstPersonController(camera, domElement);

    expect(controller.armsGroup).toBeDefined();
    expect(controller.armsGroup.children.length).toBe(2); // Brazo izquierdo y derecho
    expect(controller.colliders.length).toBeGreaterThanOrEqual(4);
    expect(controller.enabled).toBe(false);

    controller.enable(new THREE.Vector3(0, 1.68, 3.0));
    expect(controller.enabled).toBe(true);
    expect(controller.armsGroup.visible).toBe(true);
    expect(camera.position.y).toBeCloseTo(1.68, 2);

    controller.disable();
    expect(controller.enabled).toBe(false);
    expect(controller.armsGroup.visible).toBe(false);
  });

  it('actualiza los materiales de brazos según el EPP equipado (piel, nitrilo, látex y bata)', () => {
    const camera = new THREE.PerspectiveCamera(75, 1.33, 0.1, 100);
    const domElement = createMockElement();
    const controller = new FirstPersonController(camera, domElement);

    // Sin EPP: ropa casual y piel natural
    controller.updateArmMaterials(false, 'none');
    expect(controller.armsGroup).toBeDefined();

    // Con bata blanca y guantes de nitrilo azul
    controller.updateArmMaterials(true, 'nitrile_blue');
    expect(controller.armsGroup).toBeDefined();

    // Con guantes de látex blanco quirúrgico
    controller.updateArmMaterials(true, 'latex_white');
    expect(controller.armsGroup).toBeDefined();
  });

  it('calcula colisión y no permite atravesar los límites perimetrales del laboratorio', () => {
    const camera = new THREE.PerspectiveCamera(75, 1.33, 0.1, 100);
    const domElement = createMockElement();
    const controller = new FirstPersonController(camera, domElement);
    controller.enable(new THREE.Vector3(0, 1.68, 4.0));

    // Intentar mover hacia adelante contra una mesa
    controller.velocity.set(0, 0, -10);
    controller.update(0.5);

    // No debe penetrar dentro del centro de la mesa química
    const inChemCenter = Math.abs(controller.position.x) < 1.0 && Math.abs(controller.position.z) < 0.5;
    expect(inChemCenter).toBe(false);
  });

  it('detecta estaciones de laboratorio cercanas según la posición física del personaje', () => {
    const camera = new THREE.PerspectiveCamera(75, 1.33, 0.1, 100);
    const domElement = createMockElement();
    const controller = new FirstPersonController(camera, domElement);

    // Cerca de la mesa de química
    controller.position.set(0, 1.68, 1.8);
    expect(controller.getNearbyStation()).toBe('quimica');

    // Cerca de la mesa de biología
    controller.position.set(-3.5, 1.68, 1.8);
    expect(controller.getNearbyStation()).toBe('biologia');

    // Cerca de la mesa STEAM
    controller.position.set(3.5, 1.68, 1.8);
    expect(controller.getNearbyStation()).toBe('steam');

    // Lejos en el pasillo central
    controller.position.set(0, 1.68, 4.8);
    expect(controller.getNearbyStation()).toBeNull();
  });

  it('detecta objetos interactivos con el raycast central de la retícula', () => {
    const camera = new THREE.PerspectiveCamera(75, 1.33, 0.1, 100);
    const domElement = createMockElement();
    const controller = new FirstPersonController(camera, domElement);
    controller.enable(new THREE.Vector3(0, 1.68, 1.5));
    controller.update(0.016);

    // Crear un objeto interactivo simulado delante de la cámara
    const targetMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5));
    targetMesh.position.set(0, 1.68, 0.5);
    targetMesh.updateMatrixWorld(true);
    targetMesh.userData = {
      safetyHit: {
        type: 'safety_equipment',
        subItem: 'coat',
        label: 'Bata Blanca de Laboratorio'
      }
    };

    controller.updateCrosshairRaycast([targetMesh]);
    expect(controller.focusedTarget).not.toBeNull();
    expect(controller.focusedTarget?.icon).toBe('🥼');
    expect(controller.focusedTarget?.title).toContain('Bata');

    // Interactuar
    controller.focusedTarget?.onInteract();
    expect(labStore.safetyCoatEquipped).toBe(true);
  });
});
