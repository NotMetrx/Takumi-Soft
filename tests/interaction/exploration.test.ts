import { describe, expect, it } from 'vitest';
import { ExplorationStore } from '../../src/lib/exploration/exploration_store.svelte';
import { LabStore } from '../../src/lib/interaction/lab_store.svelte';
import { explorationStore } from '../../src/lib/exploration/exploration_store.svelte';

describe('Integración de exploración', () => {
  it('pausa una incompatibilidad antes de mutar y exige una nueva acción tras leer el aviso', () => {
    const s = new ExplorationStore();
    expect(s.add('bleach', 5, 'keyboard')).toBe(true);
    expect(s.add('hcl', 5, 'keyboard')).toBe(false);
    expect(s.state.volumeMl).toBe(55);
    expect(s.pendingSafety?.hazards[0].id).toBe('chlorine');
    s.acknowledge();
    expect(s.state.volumeMl).toBe(55);
    expect(s.add('hcl', 5, 'keyboard')).toBe(true);
    expect(s.state.volumeMl).toBe(60);
    expect(s.result.pH).toBeNull();
    s.reset();
    s.add('bleach', 5, 'keyboard');
    expect(s.add('hcl', 1, 'keyboard')).toBe(false);
  });
  it('comparte volumen y dosificación con los matraces sin cambiar lo ya vertido al reponer', () => {
    explorationStore.reset();
    const s = new LabStore(); s.enterExploration();
    s.setExplorationBottle('hcl', 'carbonate');
    expect(s.pour('hcl', 10)).toBe(true);
    expect(s.totalVolumeMl).toBe(60);
    expect(s.reagents[0].remainingMl).toBe(90);
    s.setExplorationBottle('hcl', 'calcium');
    expect(s.totalVolumeMl).toBe(60);
    expect(s.pour('hcl', 10)).toBe(true);
    expect(explorationStore.result.precipitateG).toBeGreaterThan(0);
    expect(explorationStore.trials.map(t => t.chemicalId)).toEqual(['carbonate', 'calcium']);
    s.resetExperiment(); expect(s.totalVolumeMl).toBe(50);
    s.leaveExploration(); expect(s.beaker.currentResult?.pH).toBe(7);
  });
  it('conserva mezcla y ensayos al ir al MVP y volver', () => {
    explorationStore.reset();
    const s = new LabStore(); s.enterExploration();
    s.pour('hcl', 5);
    const previous = explorationStore.result.pH;
    const bottles = explorationStore.bottles.map(b => ({ ...b }));
    s.leaveExploration(); s.enterExploration();
    expect(s.totalVolumeMl).toBe(55);
    expect(explorationStore.trials).toHaveLength(1);
    expect(explorationStore.result.pH).toBe(previous);
    expect(explorationStore.bottles).toEqual(bottles);
    expect(s.reagents.map(r => ({ chemicalId: r.chemicalId, remainingMl: r.remainingMl }))).toEqual(bottles);
    s.resetExperiment();
  });

  it('registra cambios del colector y conserva predicción/reflexión al reiniciar ensayos', () => {
    const s = new ExplorationStore(); s.hypothesis = 'Comparar presión';
    s.close(true); s.close(false);
    expect(s.events.map(e => e.action)).toEqual(['Cerrar colector', 'Abrir colector']);
    s.reset(); expect(s.events).toHaveLength(0); expect(s.hypothesis).toBe('Comparar presión');
  });
});
