import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BeakerState } from '../../src/lib/core/contracts';
import { EXPERIMENT_PRESETS, LabStore } from '../../src/lib/interaction/lab_store.svelte';
import { EXPERIMENT_DEMOS, getExperimentDemo } from '../../src/lib/interaction/experiment_demos';
import { calculateStrongAcidBase } from '../../src/lib/science/chemistry/acid_base_solver';

function initialTemperature(presetId: string): number {
  if (presetId === 'steam-botijo-condensation') return 18;
  if (presetId === 'steam-ice-melting-density') return 15;
  return 25;
}

function simulateDemo(preset: (typeof EXPERIMENT_PRESETS)[number]): {
  beaker: BeakerState;
  satisfiedGoals: Set<string>;
} {
  const demo = getExperimentDemo(preset.id);
  if (!demo) throw new Error(`Falta el guion de ${preset.id}`);

  let acidVolumeMl = 0;
  let baseVolumeMl = 0;
  let temperatureC = initialTemperature(preset.id);
  const satisfiedGoals = new Set<string>();

  const evaluate = () => {
    const currentResult = calculateStrongAcidBase({
      acidVolumeMl,
      baseVolumeMl,
      waterMl: 50,
      acidConcentrationMolPerL: preset.acidReagent.concentrationMolPerL,
      baseConcentrationMolPerL: preset.baseReagent.concentrationMolPerL,
      temperatureC
    });
    const beaker: BeakerState = {
      capacityMl: 250,
      waterMl: 50,
      acidVolumeMl,
      baseVolumeMl,
      temperatureC,
      currentResult
    };
    for (const goal of preset.interactiveGoals) {
      if (goal.checkFn(beaker)) satisfiedGoals.add(goal.id);
    }
    return beaker;
  };

  let beaker = evaluate();
  for (const step of demo.steps) {
    if (step.action.kind === 'pour') {
      if (step.action.reagentId === 'hcl') acidVolumeMl += step.action.amountMl;
      else baseVolumeMl += step.action.amountMl;
      beaker = evaluate();
    } else if (step.action.kind === 'temperature') {
      temperatureC = step.action.valueC;
      beaker = evaluate();
    }
  }

  return { beaker, satisfiedGoals };
}

describe('Guiones del modo «Ver demostración»', () => {
  it('cubre exactamente los nueve experimentos del manual', () => {
    expect(EXPERIMENT_PRESETS).toHaveLength(9);
    expect(EXPERIMENT_DEMOS).toHaveLength(9);
    expect(EXPERIMENT_DEMOS.map((demo) => demo.presetId).sort()).toEqual(
      EXPERIMENT_PRESETS.map((preset) => preset.id).sort()
    );
  });

  it('cada paso tiene título, explicación y una acción válida', () => {
    for (const demo of EXPERIMENT_DEMOS) {
      expect(demo.steps.length).toBeGreaterThanOrEqual(3);
      for (const step of demo.steps) {
        expect(step.title.length).toBeGreaterThan(0);
        expect(step.detail.length).toBeGreaterThan(0);
        expect(step.holdMs).toBeGreaterThanOrEqual(0);
        if (step.action.kind === 'pour') {
          expect(step.action.amountMl).toBeGreaterThan(0);
          expect(['hcl', 'naoh']).toContain(step.action.reagentId);
        } else if (step.action.kind === 'temperature') {
          expect(step.action.valueC).toBeGreaterThanOrEqual(10);
          expect(step.action.valueC).toBeLessThanOrEqual(85);
        } else {
          expect(step.action.durationMs).toBeGreaterThan(0);
        }
      }
    }
  });

  for (const preset of EXPERIMENT_PRESETS) {
    it(`completa todas las metas de «${preset.title}»`, () => {
      const { beaker, satisfiedGoals } = simulateDemo(preset);
      const totalVolume = beaker.waterMl + beaker.acidVolumeMl + beaker.baseVolumeMl;

      expect(totalVolume).toBeLessThanOrEqual(beaker.capacityMl);
      expect(beaker.acidVolumeMl).toBeLessThanOrEqual(preset.acidReagent.initialMl);
      expect(beaker.baseVolumeMl).toBeLessThanOrEqual(preset.baseReagent.initialMl);

      for (const goal of preset.interactiveGoals) {
        expect(satisfiedGoals.has(goal.id), `${preset.id} · ${goal.id}`).toBe(true);
      }
    });
  }
});

describe('Controlador del modo demostración', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('bloquea los vertidos manuales mientras la demostración está en curso', () => {
    const store = new LabStore();
    store.loadExperimentPreset('vinegar-baking-soda');

    expect(store.startExperimentDemo()).toBe(true);
    expect(store.demoStatus).toBe('running');
    expect(store.demoStepCount).toBe(getExperimentDemo('vinegar-baking-soda')?.steps.length);

    expect(store.pour('hcl', 5, 'mouse')).toBe(false);
    expect(store.triggerAnimatedPour('hcl', 5, 'mouse')).toBe(false);
    expect(store.doseFromBurette(1)).toBe(false);
    expect(store.beaker.acidVolumeMl).toBe(0);

    store.stopExperimentDemo();
    expect(store.demoStatus).toBe('idle');
    expect(store.triggerAnimatedPour('hcl', 5, 'mouse')).toBe(true);
  });

  it('ejecuta el guion, reinicia el vaso y deja la estación lista para el alumno', () => {
    const store = new LabStore();
    store.loadExperimentPreset('vinegar-baking-soda');
    expect(store.startExperimentDemo()).toBe(true);

    for (let ticks = 0; ticks < 800 && store.demoStatus === 'running'; ticks += 1) {
      vi.advanceTimersByTime(100);
      // En la app, LabScene aplica el caudal mientras dura la animación; aquí la resolvemos de golpe.
      if (store.activePourAnim) {
        const { reagentId, amountMl } = store.activePourAnim;
        store.pour(reagentId, amountMl, 'demo');
        store.activePourAnim = null;
      }
    }

    expect(store.demoStatus).toBe('completed');
    expect(store.demoProgressPercent).toBe(100);
    expect(store.beaker.waterMl).toBe(50);
    expect(store.beaker.acidVolumeMl).toBe(0);
    expect(store.beaker.baseVolumeMl).toBe(0);
    expect(store.beaker.temperatureC).toBe(25);
    expect(store.reagents.map((reagent) => reagent.remainingMl)).toEqual([100, 100]);
    expect(store.session.trials.length).toBeGreaterThan(0);

    store.dismissExperimentDemo();
    expect(store.demoStatus).toBe('idle');
  });

  it('pide consentimiento legal antes de demostrar el módulo de benceno', () => {
    const store = new LabStore();
    const started = store.startExperimentDemo('steam-benzene-invisible-fire');

    expect(started).toBe(false);
    expect(store.demoStatus).toBe('idle');
    expect(store.pendingLegalConsentPresetId).toBe('steam-benzene-invisible-fire');
  });
});
