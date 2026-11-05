import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  createSafetyTexture,
  buildEmergencyShowerAndEyewash,
  buildSafetyPPEStation,
  buildFireExtinguisherStation,
  buildSafetyEnvironmentSignage,
  buildCompleteLabSafetyInfrastructure,
  type SafetyInteractiveHit
} from '$lib/lab3d/safety_decorations';

describe('Infraestructura de Bioseguridad y Equipamiento EPP (ANSI Z358.1 / ISO 7010)', () => {
  it('genera y cachea texturas de seguridad técnica con respaldo seguro para SSR / Node', () => {
    const stripesTex = createSafetyTexture('safety_stripes');
    expect(stripesTex).toBeInstanceOf(THREE.CanvasTexture);

    const grateTex = createSafetyTexture('stainless_grate');
    expect(grateTex).toBeInstanceOf(THREE.CanvasTexture);

    const ghsBioTex = createSafetyTexture('ghs_biohazard');
    expect(ghsBioTex).toBeInstanceOf(THREE.CanvasTexture);

    const isoShowerTex = createSafetyTexture('iso_shower_eyewash');
    expect(isoShowerTex).toBeInstanceOf(THREE.CanvasTexture);

    const extLabelTex = createSafetyTexture('extinguisher_label');
    expect(extLabelTex).toBeInstanceOf(THREE.CanvasTexture);

    const nitrileTex = createSafetyTexture('nitrile_box_label');
    expect(nitrileTex).toBeInstanceOf(THREE.CanvasTexture);

    const latexTex = createSafetyTexture('latex_box_label');
    expect(latexTex).toBeInstanceOf(THREE.CanvasTexture);

    const uvcTex = createSafetyTexture('uvc_cabinet_label');
    expect(uvcTex).toBeInstanceOf(THREE.CanvasTexture);

    const gaugeTex = createSafetyTexture('pressure_gauge_dial');
    expect(gaugeTex).toBeInstanceOf(THREE.CanvasTexture);

    // Cache hit: debe devolver exactamente la misma instancia O(1)
    const cachedTex = createSafetyTexture('stainless_grate');
    expect(cachedTex).toBe(grateTex);
  });

  it('construye la Ducha de Seguridad y Lavaojos Combinada ANSI Z358.1 con todos sus elementos interactivos', () => {
    const interactiveList: { mesh: THREE.Object3D; hit: SafetyInteractiveHit }[] = [];
    const station = buildEmergencyShowerAndEyewash(interactiveList);

    expect(station).toBeInstanceOf(THREE.Group);
    expect(station.name).toBe('EmergencyShowerStation');

    // Debe contener plataforma de drenaje, columna standpipe, campana rociadora, lavaojos y cartel ISO
    const childNames = station.children.map((c) => c.name);
    expect(childNames).toContain('ShowerFloorDrainPlatform');
    expect(childNames).toContain('ShowerStandpipe');
    expect(childNames).toContain('ShowerHeadAssembly');
    expect(childNames).toContain('EyewashStation');

    // Comprobar elementos interactivos registrados
    const showerHits = interactiveList.filter((item) => item.hit.type === 'emergency_shower');
    expect(showerHits.length).toBeGreaterThanOrEqual(1);
    expect(showerHits[0].hit.subItem).toBe('shower_lever');
    expect(showerHits[0].hit.label).toContain('ANSI Z358.1');

    const eyewashHits = interactiveList.filter((item) => item.hit.type === 'eyewash');
    expect(eyewashHits.length).toBeGreaterThanOrEqual(1);
    expect(eyewashHits[0].hit.subItem).toBe('eyewash_push');
    expect(eyewashHits[0].hit.label).toContain('Lavaojos');
  });

  it('construye la Estación / Vestidor de Bioseguridad y EPP con bata, gabinete UV-C y dispensadores', () => {
    const interactiveList: { mesh: THREE.Object3D; hit: SafetyInteractiveHit }[] = [];
    const ppeStation = buildSafetyPPEStation(interactiveList);

    expect(ppeStation).toBeInstanceOf(THREE.Group);
    expect(ppeStation.name).toBe('SafetyPPEStation');

    // Debe incluir carcasa clínica, armario de batas, gabinete UV-C, dispensador de guantes y espejo
    const childNames = ppeStation.children.map((c) => c.name);
    expect(childNames).toContain('PPECasework');
    expect(childNames).toContain('LabCoatWardrobe');

    // Verificar EPP interactivos: Bata, Gafas, Guantes de Nitrilo y Guantes de Látex
    const coatHit = interactiveList.find((i) => i.hit.subItem === 'coat');
    expect(coatHit).toBeDefined();
    expect(coatHit?.hit.label).toContain('Bata');

    const gogglesHit = interactiveList.find((i) => i.hit.subItem === 'goggles');
    expect(gogglesHit).toBeDefined();
    expect(gogglesHit?.hit.label).toContain('Gafas');

    const nitrileHit = interactiveList.find((i) => i.hit.subItem === 'nitrile_gloves');
    expect(nitrileHit).toBeDefined();
    expect(nitrileHit?.hit.label).toContain('Nitrilo');

    const latexHit = interactiveList.find((i) => i.hit.subItem === 'latex_gloves');
    expect(latexHit).toBeDefined();
    expect(latexHit?.hit.label).toContain('Látex');
  });

  it('construye el Extintor de Incendios CO2 con etiqueta técnica PASS, manómetro y tobera', () => {
    const interactiveList: { mesh: THREE.Object3D; hit: SafetyInteractiveHit }[] = [];
    const extinguisher = buildFireExtinguisherStation(interactiveList);

    expect(extinguisher).toBeInstanceOf(THREE.Group);
    expect(extinguisher.name).toBe('FireExtinguisherStation');

    const extHit = interactiveList.find((i) => i.hit.type === 'fire_extinguisher');
    expect(extHit).toBeDefined();
    expect(extHit?.hit.subItem).toBe('extinguisher_pin');
    expect(extHit?.hit.label).toContain('PASS');
  });

  it('genera la señalética ambiental y franjas perimetrales perimetrales', () => {
    const signage = buildSafetyEnvironmentSignage();
    expect(signage).toBeInstanceOf(THREE.Group);
    expect(signage.name).toBe('SafetyEnvironmentSignage');
    expect(signage.children.length).toBeGreaterThanOrEqual(6);
  });

  it('integra la infraestructura completa con todas las estaciones posicionadas y listas para raycast', () => {
    const interactiveList: { mesh: THREE.Object3D; hit: SafetyInteractiveHit }[] = [];
    const master = buildCompleteLabSafetyInfrastructure(interactiveList);

    expect(master).toBeInstanceOf(THREE.Group);
    expect(master.name).toBe('CompleteLabSafetyInfrastructure');
    expect(master.children.length).toBe(4); // Ducha, EPP, Extintor, Señalética

    // Al menos 7 dianas interactivas registradas (ducha, lavaojos, bata, gafas, nitrilo, látex, extintor)
    expect(interactiveList.length).toBeGreaterThanOrEqual(7);

    // Todos los elementos interactivos tienen userData.safetyHit definido
    for (const item of interactiveList) {
      expect(item.mesh.userData.isInteractive).toBe(true);
      expect(item.mesh.userData.safetyHit).toBe(item.hit);
    }
  });
});
