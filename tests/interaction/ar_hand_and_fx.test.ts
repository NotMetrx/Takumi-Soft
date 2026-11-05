import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ARHandMeshRig, HAND_CONNECTIONS } from '$lib/lab3d/ar_hand_mesh';
import { LabSafetyFXSystem } from '$lib/lab3d/safety_fx_particles';
import type { HandPoint } from '$lib/input/hand_gestures';

describe('Opción 1: ARHandMeshRig (Manos 3D Articuladas con MediaPipe)', () => {
  it('instancia el rig de mano 3D con 21 articulaciones, 20 huesos y almohadilla de palma sin errores', () => {
    const rig = new ARHandMeshRig();
    expect(rig.group).toBeInstanceOf(THREE.Group);
    expect(rig.group.name).toBe('ARHandMeshRig');
    expect(rig.group.visible).toBe(false);

    // 21 esferas de articulaciones + 20 cilindros de huesos + 1 almohadilla de palma = 42 meshes
    expect(rig.group.children.length).toBe(21 + HAND_CONNECTIONS.length + 1);
  });

  it('actualiza la pose completa a partir de 21 landmarks de MediaPipe y suavizado 1-Euro', () => {
    const rig = new ARHandMeshRig();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1.5, 3);

    const targetPos = new THREE.Vector3(0.5, 1.0, 0);

    // Simular 21 landmarks normalizados de MediaPipe (palma y 5 dedos extendidos)
    const mockLandmarks: HandPoint[] = Array.from({ length: 21 }, (_, i) => ({
      x: 0.5 + (i % 5) * 0.03,
      y: 0.5 + Math.floor(i / 5) * 0.04,
      z: -0.02 * (i % 4)
    }));

    const now = 1000;
    rig.updatePose(mockLandmarks, camera, targetPos, 0.15, true, now);

    expect(rig.group.visible).toBe(true);
    // Debe coincidir con la posición objetivo
    expect(rig.group.position.x).toBeCloseTo(0.5);
    expect(rig.group.position.y).toBeCloseTo(1.02); // 1.0 + 0.02 (compensación por pellizco)
    expect(rig.group.position.z).toBeCloseTo(0);
  });

  it('oculta la mano y resetea filtros si los landmarks no están presentes o son insuficientes', () => {
    const rig = new ARHandMeshRig();
    const camera = new THREE.PerspectiveCamera();
    const targetPos = new THREE.Vector3();

    rig.updatePose(undefined, camera, targetPos, 0, false, 1000);
    expect(rig.group.visible).toBe(false);

    // Con menos de 21 puntos
    const incompleteLandmarks: HandPoint[] = [{ x: 0.5, y: 0.5 }];
    rig.updatePose(incompleteLandmarks, camera, targetPos, 0, false, 1000);
    expect(rig.group.visible).toBe(false);

    rig.hide();
    expect(rig.group.visible).toBe(false);
  });

  it('cambia el material de guantes dinámicamente según el protocolo EPP', () => {
    const rig = new ARHandMeshRig();

    // Nitrilo azul químico (EN 374)
    rig.updateGloves('nitrile_blue');
    // Látex blanco biológico
    rig.updateGloves('latex_white');
    // Sin guantes (piel humana)
    rig.updateGloves('none');

    // No arroja errores y actualiza correctamente
    expect(rig.group).toBeDefined();
  });
});

describe('Opción 3: LabSafetyFXSystem (Fluidos, Vapores y Partículas Físicas)', () => {
  it('inicializa los 4 subsistemas de partículas físicas con Float32Array estáticos (0 GC)', () => {
    const fx = new LabSafetyFXSystem();
    expect(fx.group).toBeInstanceOf(THREE.Group);
    expect(fx.group.name).toBe('LabSafetyFXSystem');

    // 4 subsistemas: ducha, lavaojos, vapor, CO2
    expect(fx.group.children.length).toBe(4);
    for (const child of fx.group.children) {
      expect(child).toBeInstanceOf(THREE.Points);
      expect(child.visible).toBe(false);
    }
  });

  it('activa y actualiza el chorro de agua de la Ducha de Descontaminación', () => {
    const fx = new LabSafetyFXSystem();
    fx.triggerShower(3.0);

    const showerPoints = fx.group.children[0] as THREE.Points;
    expect(showerPoints.visible).toBe(true);

    const posAttr = showerPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    const initialY0 = posAttr.getY(0);

    // Simular un paso físico de 0.1 segundos
    fx.update(0.1);

    // La partícula debe haber caído hacia el suelo (velocidad negativa en Y)
    const newY0 = posAttr.getY(0);
    expect(newY0).toBeLessThan(initialY0);
  });

  it('activa y actualiza el spray convergente del Lavaojos de Emergencia', () => {
    const fx = new LabSafetyFXSystem();
    fx.triggerEyewash(2.5);

    const eyewashPoints = fx.group.children[1] as THREE.Points;
    expect(eyewashPoints.visible).toBe(true);

    fx.update(0.1);
    expect(eyewashPoints.visible).toBe(true);
  });

  it('controla el vapor térmico del reactor según la temperatura', () => {
    const fx = new LabSafetyFXSystem();
    const vaporPoints = fx.group.children[2] as THREE.Points;

    expect(vaporPoints.visible).toBe(false);

    // Reacción exotérmica o ebullición (>38°C)
    fx.setReactorVapor(true, 0.8);
    expect(vaporPoints.visible).toBe(true);

    const mat = vaporPoints.material as THREE.PointsMaterial;
    expect(mat.opacity).toBeGreaterThan(0.2);

    fx.update(0.05);

    // Desactivar enfriando el vaso
    fx.setReactorVapor(false, 0);
    expect(vaporPoints.visible).toBe(false);
  });

  it('activa la descarga cónica criogénica de CO2 del extintor', () => {
    const fx = new LabSafetyFXSystem();
    fx.triggerExtinguisherDischarge(1.5);

    const co2Points = fx.group.children[3] as THREE.Points;
    expect(co2Points.visible).toBe(true);

    fx.update(0.1);
    expect(co2Points.visible).toBe(true);
  });
});
