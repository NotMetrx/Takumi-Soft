import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHEMICALS } from '../../src/lib/science/chemistry/catalog';
import { addDose, initialReactor, readReactor, setClosure, type ReactorResult } from '../../src/lib/science/chemistry/reactor';
import { calculateStrongAcidBase } from '../../src/lib/science/chemistry/acid_base_solver';
import * as engine from '../../src/lib/science/chemistry/numeric_engine';
import * as reference from '../../src/lib/science/chemistry/numeric_reference';

const bytes = new Uint8Array(readFileSync('src/lib/science/chemistry/wasm/chemistry.wasm')).buffer;
const water = { volumeL: 0.1, calcium: 0, carbonMol: 0, acetate: 0, charge: 0, citricMol: 0, ammoniaMol: 0 };
function cases() {
  const states = CHEMICALS.flatMap(a => CHEMICALS.map(b => addDose(addDose(initialReactor(), a.id, 1), b.id, 1)));
  for (const doses of [
    [['hcl', 50], ['naoh', 50]], [['acetic', 25], ['acetate', 25]],
    [['calcium', 25], ['carbonate', 25]], [['calcium', 50], ['naoh', 100]],
    [['citric', 25], ['naoh', 75]], [['ammonia', 50], ['hcl', 50]],
    [['bicarbonate', 50], ['hcl', 25], ['naoh', 20]]
  ] as [string, number][][]) {
    states.push(doses.reduce((state, [id, ml]) => addDose(state, id, ml), initialReactor()));
  }
  states.push(addDose(setClosure(addDose(initialReactor(), 'bicarbonate', 100), true), 'hcl', 30));
  return states.map(state => ({ state, result: readReactor(state) }));
}
function matches(actual: ReactorResult, expected: ReactorResult) {
  for (const key of ['pH', 'temperatureC', 'pressureKpa', 'gasMl', 'trappedGasMl', 'precipitateG'] as const) {
    if (expected[key] === null) expect(actual[key]).toBeNull();
    else expect(actual[key]).toBeCloseTo(expected[key]!, 9);
  }
  for (const key of ['modelId', 'coverage', 'color', 'precipitateName', 'stopped', 'hazards', 'observations', 'limitations'] as const) {
    expect(actual[key]).toEqual(expected[key]);
  }
  expect(actual.species.map(s => s.name)).toEqual(expected.species.map(s => s.name));
  actual.species.forEach((species, index) => expect(species.mol).toBeCloseTo(expected.species[index].mol, 10));
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Motor Rust/WASM real frente a la referencia TypeScript', () => {
  it('conserva resultados, balances, límites y avisos para cada par del catálogo y ensayos completos', async () => {
    expect(engine.getScienceBackend()).toBe('typescript');
    const baseline = cases();
    const fetch = vi.fn(async () => new Response(bytes));
    vi.stubGlobal('fetch', fetch);
    expect(await engine.initializeScienceEngine()).toBe(true);
    expect(engine.getScienceBackend()).toBe('rust-wasm');
    expect(await engine.initializeScienceEngine()).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    const actual = cases();
    actual.forEach((trial, index) => {
      for (const key of ['volumeMl', 'carbonMol', 'generatedCO2Mol', 'trappedCO2Mol', 'escapedCO2Mol', 'airMol'] as const) {
        expect(trial.state[key]).toBeCloseTo(baseline[index].state[key], 12);
      }
      matches(trial.result, baseline[index].result);
    });
  });
  it('mantiene la precisión de la raíz estable en bases, diluciones y cambios de temperatura', () => {
    for (const temperatureC of [0, 25, 60, 100]) for (const concentration of [1e-9, 0.01, 1]) for (const acid of [true, false]) {
      const result = calculateStrongAcidBase({ acidVolumeMl: acid ? 10 : 0, baseVolumeMl: acid ? 0 : 10, waterMl: 100, acidConcentrationMolPerL: concentration, baseConcentrationMolPerL: concentration, temperatureC });
      expect(Number.isFinite(result.pH)).toBe(true);
      expect(result.hydroniumConcentrationMolPerL).toBeGreaterThan(0);
      const expected = reference.strongAcidHydronium(result.excessConcentrationMolPerL, temperatureC);
      expect(result.hydroniumConcentrationMolPerL / expected).toBeCloseTo(1, 12);
    }
    for (const temperatureC of [NaN, Infinity, -273.15]) {
      expect(() => engine.strongAcidHydronium(0, temperatureC)).toThrow();
    }
    expect(() => engine.solveEquilibrium({ ...water, carbonMol: -1 })).toThrow();
    expect(() => engine.solveEquilibrium({ ...water, volumeL: 0 })).toThrow();
    expect(() => engine.gasPressure(250, 0, 0, 25)).toThrow();
    expect(() => engine.copperPrecipitate(NaN, 1)).toThrow();
  });
  it('copia los resultados antes de reutilizar la memoria WASM', () => {
    const first = engine.solveEquilibrium(water);
    const second = engine.solveEquilibrium({ ...water, charge: -0.005 });
    expect(first.pH).toBeCloseTo(7, 9);
    expect(second.pH).toBeCloseTo(1.30103, 6);
    expect(first.pH).toBeCloseTo(7, 9);
  });
  it.each(['http', 'invalid-wasm'])('permite usar el laboratorio con respaldo TypeScript ante %s', async failure => {
    vi.resetModules();
    const fresh = await import('../../src/lib/science/chemistry/numeric_engine');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => failure === 'http' ? new Response('', { status: 503 }) : new Response(new Uint8Array([1, 2, 3]))));
    expect(await fresh.initializeScienceEngine()).toBe(false);
    expect(fresh.getScienceBackend()).toBe('typescript');
    expect(fresh.solveEquilibrium(water).pH).toBeCloseTo(7, 9);
    expect(() => fresh.solveEquilibrium({ ...water, calcium: 1e308, carbonMol: 1e308 })).toThrow();
  });
});
