import { describe, it, expect } from 'vitest';
import { multiplayerStore } from '../../src/lib/multiplayer/multiplayer_store.svelte';
import { labStore } from '../../src/lib/interaction/lab_store.svelte';

describe('SymbioLab Multiplayer & Collaborative Classroom (Beta)', () => {
  it('inicializa la sala de aula virtual y los compañeros demostrativos', () => {
    expect(multiplayerStore.roomId).toBe('AULA-HACK4EDU');
    expect(multiplayerStore.peers.length).toBeGreaterThanOrEqual(3);
    const maria = multiplayerStore.peers.find((p) => p.id === 'peer_maria');
    expect(maria).toBeDefined();
    expect(maria?.role).toBe('estudiante');
  });

  it('permite alternar la apertura del modal del aula', () => {
    multiplayerStore.toggleModal(true);
    expect(multiplayerStore.isModalOpen).toBe(true);
    multiplayerStore.toggleModal(false);
    expect(multiplayerStore.isModalOpen).toBe(false);
  });

  it('actualiza la pose y rotación local del usuario', () => {
    multiplayerStore.updateMyPose({ x: 1.5, y: 1.68, z: 2.8 }, Math.PI / 4);
    expect(multiplayerStore.myPosition.x).toBe(1.5);
    expect(multiplayerStore.myPosition.z).toBe(2.8);
    expect(multiplayerStore.myRotationY).toBe(Math.PI / 4);
  });

  it('permite al docente convocar a los estudiantes a la Pizarra SmartBoard', () => {
    labStore.setStation('biologia');
    expect(labStore.activeStation).toBe('biologia');

    multiplayerStore.callAllStudentsToSmartBoard();
    expect(labStore.activeStation).toBe('quimica');
    expect(labStore.safetyAlert).not.toBeNull();
    expect(labStore.safetyAlert?.title).toContain('CONVOCATORIA');
  });

  it('permite activar y desactivar compañeros de clase simulados', () => {
    expect(multiplayerStore.demoClassmatesActive).toBe(true);
    multiplayerStore.toggleDemoClassmates();
    expect(multiplayerStore.demoClassmatesActive).toBe(false);
    expect(multiplayerStore.peers.filter((p) => p.isSimulated).length).toBe(0);

    multiplayerStore.toggleDemoClassmates();
    expect(multiplayerStore.demoClassmatesActive).toBe(true);
    expect(multiplayerStore.peers.length).toBeGreaterThanOrEqual(3);
  });
});
