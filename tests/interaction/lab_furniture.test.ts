import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  buildProfessionalLabBench,
  createLabFloorTexture,
  createLabCeilingTexture,
  buildLaboratoryCeilingAndLighting,
  buildLaboratoryPerimeterWalls
} from '$lib/lab3d/lab_furniture';

describe('Mobiliario Profesional de Laboratorio (lab_furniture.ts)', () => {
  it('genera una textura procedural de suelo técnico sin errores', () => {
    const tex = createLabFloorTexture();
    expect(tex).toBeInstanceOf(THREE.CanvasTexture);
    expect(tex.image).toBeDefined();
    expect(tex.repeat.x).toBe(12);
  });

  it('genera una textura procedural de falso techo acústico sin errores', () => {
    const tex = createLabCeilingTexture();
    expect(tex).toBeInstanceOf(THREE.CanvasTexture);
    expect(tex.repeat.x).toBe(16);
  });

  it('construye el techo técnico con paneles LED Cleanroom y elementos de seguridad', () => {
    const ceiling = buildLaboratoryCeilingAndLighting();
    expect(ceiling).toBeInstanceOf(THREE.Group);
    expect(ceiling.name).toBe('LaboratoryCeilingAndLighting');
    // Debe incluir falso techo, marcos troffer, difusores, luces y ventilación
    expect(ceiling.children.length).toBeGreaterThan(15);
  });

  it('construye las paredes perimetrales del laboratorio con zócalos sanitarios y puertas automáticas dobles', () => {
    const walls = buildLaboratoryPerimeterWalls();
    expect(walls).toBeInstanceOf(THREE.Group);
    expect(walls.name).toBe('LaboratoryPerimeterWalls');
    expect(walls.children.length).toBeGreaterThan(4);

    // Rig de puertas automáticas correderas que se juntan en el centro
    const doubleDoors = walls.userData.doubleDoors;
    expect(doubleDoors).toBeDefined();
    expect(doubleDoors.leftLeaf).toBeDefined();
    expect(doubleDoors.rightLeaf).toBeDefined();
    expect(doubleDoors.sensorLed).toBeDefined();

    // En reposo están juntas en el centro (-0.64 y +0.64)
    expect(doubleDoors.leftLeaf.position.x).toBeCloseTo(-0.64, 2);
    expect(doubleDoors.rightLeaf.position.x).toBeCloseTo(0.64, 2);

    // Al acercarse el usuario (distancia < 3.2m a la puerta en z = 10.0)
    const nearPos = new THREE.Vector3(0, 1.68, 9.2);
    for (let i = 0; i < 20; i++) {
      doubleDoors.update(nearPos, 0.1);
    }
    expect(doubleDoors.currentOpen).toBeGreaterThan(0.8);
    expect(doubleDoors.leftLeaf.position.x).toBeLessThan(-1.5);
    expect(doubleDoors.rightLeaf.position.x).toBeGreaterThan(1.5);

    // Al alejarse el usuario (distancia > 3.2m, z = 4.0)
    const farPos = new THREE.Vector3(0, 1.68, 4.0);
    for (let i = 0; i < 30; i++) {
      doubleDoors.update(farPos, 0.1);
    }
    expect(doubleDoors.currentOpen).toBeLessThan(0.05);
    expect(doubleDoors.leftLeaf.position.x).toBeCloseTo(-0.64, 1);
    expect(doubleDoors.rightLeaf.position.x).toBeCloseTo(0.64, 1);
  });

  it('construye la mesa de Química con encimera marina, bastidor en C, grifo y repisa', () => {
    const bench = buildProfessionalLabBench({
      stationId: 'quimica',
      width: 4.4,
      depth: 2.6,
      position: new THREE.Vector3(0, 0, 0),
      label: '1. Química Analítica & Reacciones',
      labelAccentColor: '#38bdf8',
      hasReagentOverheadRack: true,
      hasPlumbingAndSink: true,
      hasGasTurret: true,
      hasElectricalStrip: true,
      hasTestTubeRack: true,
      hasWashBottle: true
    });

    expect(bench).toBeInstanceOf(THREE.Group);
    expect(bench.name).toBe('LabBench_quimica');
    expect(bench.position.x).toBe(0);
    expect(bench.position.y).toBe(0);

    // Debe contener encimera, rebordes marinos, bastidor en C, cajonera, grifería, repisa y accesorios
    expect(bench.children.length).toBeGreaterThan(15);
  });

  it('construye la mesa de Biología con superficie diáfana para microscopía', () => {
    const bench = buildProfessionalLabBench({
      stationId: 'biologia',
      width: 3.5,
      depth: 2.4,
      position: new THREE.Vector3(-4.3, 0, 0.15),
      label: '2. Biología Celular & Microscopía',
      labelAccentColor: '#4ade80',
      hasReagentOverheadRack: false,
      hasElectricalStrip: true,
      hasWashBottle: true
    });

    expect(bench).toBeInstanceOf(THREE.Group);
    expect(bench.name).toBe('LabBench_biologia');
    expect(bench.position.x).toBeCloseTo(-4.3);
  });

  it('construye la mesa STEAM con puente de reactivos y tomas eléctricas', () => {
    const bench = buildProfessionalLabBench({
      stationId: 'steam',
      width: 3.5,
      depth: 2.4,
      position: new THREE.Vector3(4.3, 0, 0.15),
      label: '3. Ciencias STEAM & Física Cotidiana',
      labelAccentColor: '#facc15',
      hasReagentOverheadRack: true,
      hasElectricalStrip: true,
      hasTestTubeRack: true
    });

    expect(bench).toBeInstanceOf(THREE.Group);
    expect(bench.name).toBe('LabBench_steam');
    expect(bench.position.x).toBeCloseTo(4.3);
  });
});
