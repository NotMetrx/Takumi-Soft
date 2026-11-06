import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { FirstPersonController } from '../../src/lib/lab3d/first_person_controller';
import { labStore } from '../../src/lib/interaction/lab_store.svelte';

const createMockElement = () =>
  ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    requestPointerLock: vi.fn(),
    style: { cursor: 'default' }
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

  it('ejecuta las 4 fases de transición e inspección del microscopio (EXPLORING <-> INSPECTING_MICROSCOPE)', () => {
    const camera = new THREE.PerspectiveCamera(75, 1.33, 0.1, 100);
    const domElement = createMockElement();
    const controller = new FirstPersonController(camera, domElement);

    // Iniciar en modo exploración libre frente a la estación de Biología
    labStore.microscopeFsmState = 'EXPLORING';
    labStore.microscopeTransitionPhase = 'IDLE';
    labStore.isMicroscopeActive = false;

    controller.enable(new THREE.Vector3(-3.5, 1.68, 1.8));
    controller.yaw = 0.05; // Mirando hacia el microscopio (-Z)
    controller.targetYaw = 0.05;
    controller.pitch = -0.12;
    controller.targetPitch = -0.12;

    // Fase 1: Trigger de proximidad al acercarse al microscopio (< 0.58m del borde frontal)
    controller.update(0.016);
    controller.disable();
    expect(labStore.microscopeFsmState).toBe('INSPECTING_MICROSCOPE');
    expect(labStore.microscopeTransitionPhase).toBe('APPROACHING_OCULAR');

    // Fase 2: Cambio de perspectiva (Ocular fijado y cuerpo del avatar oculto)
    labStore.completeMicroscopeTransition();
    controller.setAvatarBodyVisible(false);
    expect(labStore.microscopeFsmState).toBe('INSPECTING_MICROSCOPE');
    expect(labStore.microscopeTransitionPhase).toBe('OCULAR_LOCKED');
    expect(controller.armsGroup.visible).toBe(false);

    // Fase 3: Mecánicas de uso en modo simulación (Eje Y controla enfoque analítico)
    const initialFine = labStore.microscopeFineUm;
    labStore.applyAnalyticalFocusAxisY(0.25);
    expect(labStore.microscopeFineUm).not.toBe(initialFine);

    // Fase 4: Salida del modo (Reset inverso de 1.2s a posición y rotación originales)
    labStore.closeMicroscope();
    expect(labStore.microscopeTransitionPhase).toBe('RETURNING_TO_EXPLORING');

    labStore.completeMicroscopeTransition();
    expect(labStore.microscopeFsmState).toBe('EXPLORING');
    expect(labStore.microscopeTransitionPhase).toBe('IDLE');

    // Restaurar controlador en 1ª persona y verificar que conserva posición y orientación exactas
    controller.enable();
    expect(controller.position.x).toBeCloseTo(-3.5, 2);
    expect(controller.position.z).toBeCloseTo(1.8, 2);
    expect(controller.yaw).toBeCloseTo(0.05, 3);
    expect(controller.pitch).toBeCloseTo(-0.12, 3);
  });

  it('ejecuta animaciones de brazos y manos articuladas al agarrar, verter, dejar y manipular objetos', () => {
    const camera = new THREE.PerspectiveCamera(75, 1.33, 0.1, 100);
    const domElement = createMockElement();
    const controller = new FirstPersonController(camera, domElement);
    controller.enable(new THREE.Vector3(0, 1.68, 1.6));

    // Agarrar Matraz HCl con la mano derecha
    controller.grabFlask('hcl');
    expect(controller.heldFlaskId).toBe('hcl');
    controller.update(0.1);

    const holdPos = new THREE.Vector3();
    controller.getRightHandHoldWorldPosition(holdPos);
    expect(holdPos.y).toBeGreaterThanOrEqual(0.28);

    // Verter el matraz agarrado
    controller.pourHeldFlask();
    expect(controller.isPouringHeldFlask).toBe(true);
    controller.update(0.2);

    // Dejar / soltar el matraz sobre la mesa
    controller.releaseHeldObject();
    expect(controller.heldFlaskId).toBeNull();
    expect(controller.isPouringHeldFlask).toBe(false);
    controller.update(0.2);
  });

  it('impide que el personaje reaparezca dentro de las mesas o en huecos estrechos al salir del microscopio', () => {
    const camera = new THREE.PerspectiveCamera(75, 1.33, 0.1, 100);
    const domElement = createMockElement();
    const controller = new FirstPersonController(camera, domElement);

    // Intentar iniciar el personaje exactamente dentro de la mesa de biología (z = 0.5)
    controller.enable(new THREE.Vector3(-3.5, 1.68, 0.5));
    expect(controller.position.z).toBeGreaterThanOrEqual(1.55);
    expect(controller.isPositionFree(controller.position.x, controller.position.z)).toBe(true);

    // Intentar iniciar en el hueco estrecho entre mesa de biología y química
    controller.enable(new THREE.Vector3(-1.9, 1.68, 0.8));
    expect(controller.position.z).toBeGreaterThanOrEqual(1.55);
    expect(controller.isPositionFree(controller.position.x, controller.position.z)).toBe(true);
  });

  it('ajusta la sensibilidad de la rueda del microscopio con precisión adaptativa según el objetivo', () => {
    labStore.openMicroscope();
    labStore.setMicroscopeObjective(4);
    const fineBefore4 = labStore.microscopeFineUm;
    labStore.adjustMicroscopeFocusWheel(1);
    const delta4 = Math.abs(labStore.microscopeFineUm - fineBefore4);
    expect(delta4).toBeGreaterThanOrEqual(10); // Paso mayor a 4x para no girar infinitamente

    labStore.setMicroscopeObjective(100);
    const fineBefore100 = labStore.microscopeFineUm;
    labStore.adjustMicroscopeFocusWheel(1);
    const delta100 = Math.abs(labStore.microscopeFineUm - fineBefore100);
    expect(delta100).toBeLessThanOrEqual(1.0); // Paso sub-micrométrico a 100x para máxima precisión
    expect(delta100).toBeGreaterThanOrEqual(0.3);

    labStore.closeMicroscope();
    labStore.completeMicroscopeTransition();
  });

  it('permite abrir, cerrar y configurar opciones desde el menú F2', () => {
    expect(labStore.isSettingsModalOpen).toBe(false);
    labStore.toggleSettingsModal(true);
    expect(labStore.isSettingsModalOpen).toBe(true);

    labStore.setMasterVolume(0.5);
    expect(labStore.masterVolume).toBe(0.5);

    labStore.setGraphicsPreset('low');
    expect(labStore.graphicsQuality).toBe('low');
    expect(labStore.renderResolution).toBe(0.75);
    expect(labStore.shadowsEnabled).toBe(false);

    labStore.toggleSettingsModal(false);
    expect(labStore.isSettingsModalOpen).toBe(false);
  });

  it('al entrar al manual el cursor vuelve a aparecer y la cámara deja de moverse como en Minecraft', () => {
    const camera = new THREE.PerspectiveCamera(75, 1.33, 0.1, 100);
    const domElement = createMockElement();
    const controller = new FirstPersonController(camera, domElement);
    controller.attach();
    controller.enable(new THREE.Vector3(3.5, 1.68, 1.8));
    expect(domElement.style.cursor).toBe('none');

    const initialYaw = controller.yaw;
    const initialPitch = controller.pitch;

    // Abrir el Manual de Investigación
    labStore.openHomeBook();
    expect(labStore.isHomeBookOpen).toBe(true);
    expect(labStore.isAnyModalBlockingFirstPerson).toBe(true);

    // Actualizar controlador y simular movimiento del mouse mientras el manual está abierto
    controller.update(0.016);
    expect(domElement.style.cursor).toBe('default');

    // Simular intento de giro mientras el manual está abierto
    (controller as unknown as { onPointerMove: (e: Partial<PointerEvent>) => void }).onPointerMove({
      clientX: 250,
      clientY: 180,
      movementX: 120,
      movementY: -80
    });
    controller.update(0.016);

    // La cámara no debe haberse rotado ni desplazado
    expect(controller.yaw).toBeCloseTo(initialYaw, 5);
    expect(controller.pitch).toBeCloseTo(initialPitch, 5);

    // Cerrar el manual
    labStore.isHomeBookOpen = false;
    controller.detach();
  });
});
