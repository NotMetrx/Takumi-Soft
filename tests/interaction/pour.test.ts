import { describe, expect, it } from 'vitest';
import { LabStore } from '../../src/lib/interaction/lab_store.svelte';

describe('Dosificación del laboratorio', () => {
  it('reserva una animación sin transferir líquido y bloquea órdenes simultáneas', () => {
    const store = new LabStore();
    expect(store.triggerAnimatedPour('hcl', 10)).toBe(true);
    expect(store.totalVolumeMl).toBe(50);
    expect(store.reagents[0].remainingMl).toBe(100);
    expect(store.triggerAnimatedPour('naoh', 5)).toBe(false);
    expect(store.activePourAnim?.amountMl).toBe(10);
  });

  it('conserva volumen al aplicar caudal hasta agotar reactivos y llenar el vaso', () => {
    const store = new LabStore();
    for (const reagentId of ['hcl', 'naoh']) {
      for (let i = 0; i < 400; i++) store.pour(reagentId, 0.3);
    }
    expect(store.totalVolumeMl).toBe(250);
    expect(store.reagents.map(r => r.remainingMl)).toEqual([0, 0]);
    expect(store.beaker.currentResult?.pH).toBeCloseTo(7, 3);
    expect(store.pour('hcl', 1)).toBe(false);
    expect(store.totalVolumeMl).toBe(250);
  });

  it('rechaza volúmenes no finitos sin contaminar el experimento', () => {
    const store = new LabStore();
    for (const amount of [NaN, Infinity, -Infinity, -1, 0, 0.01]) {
      expect(store.pour('hcl', amount)).toBe(false);
      expect(store.triggerAnimatedPour('hcl', amount)).toBe(false);
    }
    expect(store.totalVolumeMl).toBe(50);
    expect(store.activePourAnim).toBeNull();
  });

  it('reiniciar cancela una dosificación pendiente', () => {
    const store = new LabStore();
    store.triggerAnimatedPour('hcl', 25);
    store.pour('hcl', 2.5);
    const revision = store.presetRevision;
    store.resetExperiment();
    expect(store.activePourAnim).toBeNull();
    expect(store.totalVolumeMl).toBe(50);
    expect(store.presetRevision).toBeGreaterThan(revision);
  });
});
