import { describe, expect, it } from 'vitest';
import { addDose, assessHazards, initialReactor, readReactor, setClosure } from '../../src/lib/science/chemistry/reactor';
import { CHEMICALS } from '../../src/lib/science/chemistry/catalog';
function mix(doses: [string, number][]) { return doses.reduce((s, [id, ml]) => addDose(s, id, ml), initialReactor()); }

describe('Reactor acuoso de exploración', () => {
  it('resuelve ácido fuerte, base fuerte y neutralización conservando volúmenes', () => {
    expect(readReactor(initialReactor()).pH).toBeCloseTo(7, 8);
    expect(readReactor(mix([['hcl', 50]])).pH).toBeCloseTo(1.30103, 5);
    expect(readReactor(mix([['naoh', 50]])).pH).toBeCloseTo(12.69897, 5);
    const r = readReactor(mix([['hcl', 50], ['naoh', 50]]));
    expect(r.pH).toBeCloseTo(7, 6);
    expect(r.temperatureC).toBeGreaterThan(25);
    expect(r.gasMl).toBe(0);
  });
  it('distingue ácido débil, tampón y equivalencia básica', () => {
    const acid = readReactor(mix([['acetic', 50]]));
    expect(acid.pH).toBeCloseTo(3.03, 2);
    const buffer = readReactor(mix([['acetic', 25], ['acetate', 25]]));
    expect(buffer.pH).toBeCloseTo(-Math.log10(1.8e-5), 2);
    const equivalence = readReactor(mix([['acetic', 50], ['naoh', 50]]));
    expect(equivalence.pH).toBeGreaterThan(8);
    expect(equivalence.pH).toBeLessThan(9);
  });
  it('modela bicarbonato anfiprótico y conserva carbono después de desgasificar', () => {
    const s = mix([['bicarbonate', 50], ['hcl', 25]]);
    expect(readReactor(mix([['bicarbonate', 50]])).pH).toBeCloseTo(8.34, 1);
    expect(s.carbonMol + s.generatedCO2Mol).toBeCloseTo(0.005, 10);
    expect(s.generatedCO2Mol).toBeCloseTo(0.0025, 10);
    const afterBase = addDose(s, 'naoh', 20);
    expect(afterBase.generatedCO2Mol).toBeCloseTo(s.generatedCO2Mol, 12);
    expect(afterBase.escapedCO2Mol).toBeCloseTo(s.escapedCO2Mol, 12);
  });
  it('precipita CaCO3 y permite redisolución al acidificar', () => {
    const s = mix([['carbonate', 25], ['calcium', 25]]);
    const r = readReactor(s);
    expect(r.precipitateG).toBeGreaterThan(0.2);
    expect(r.precipitateG).toBeLessThanOrEqual(0.0025 * 100.0869);
    expect(readReactor(addDose(s, 'hcl', 50)).precipitateG).toBeLessThan(1e-6);
    const reverse = readReactor(mix([['calcium', 25], ['carbonate', 25]]));
    expect(reverse.precipitateG).toBeCloseTo(r.precipitateG!, 8);
  });
  it('el gas evacuado no se recaptura al cerrar y abrir preserva el balance', () => {
    const vented = mix([['bicarbonate', 20], ['hcl', 10]]);
    let s = setClosure(vented, true);
    expect(s.trappedCO2Mol).toBe(0);
    expect(readReactor(s).pressureKpa).toBeCloseTo(101.325, 6);
    s = addDose(s, 'hcl', 5);
    expect(s.trappedCO2Mol).toBeGreaterThan(0);
    expect(readReactor(s).pressureKpa).toBeGreaterThan(101.325);
    const opened = setClosure(s, false);
    expect(opened.escapedCO2Mol).toBeCloseTo(s.generatedCO2Mol, 12);
    expect(opened.trappedCO2Mol).toBe(0);
  });
  it('pausa al llegar al límite didáctico y no sigue dosificando', () => {
    let s = setClosure(mix([['bicarbonate', 100]]), true);
    s = addDose(s, 'hcl', 30);
    expect(readReactor(s).stopped).toBe(true);
    expect(() => addDose(s, 'water', 1)).toThrow();
    expect(readReactor(setClosure(s, false)).stopped).toBe(false);
  });
  it('modela Cu(OH)2 por reactivo limitante y yodo/almidón cualitativo sin inventar pH', () => {
    const copper = readReactor(mix([['copper', 10], ['naoh', 10]]));
    expect(copper.precipitateG).toBeCloseTo(0.0005 * 97.56, 8);
    expect(copper.pH).toBeNull();
    const starch = readReactor(mix([['starch', 10], ['iodine', 5]]));
    expect(starch.coverage).toBe('partial');
    expect(starch.color).toBe('#312e81');
    expect(starch.pH).toBeNull();
  });
  it('diferencia cloro y cloraminas, también en mezclas de tres componentes', () => {
    const s = mix([['bleach', 5], ['ammonia', 5]]);
    const hazards = assessHazards(s, 'hcl');
    expect(hazards.map(h => h.id)).toEqual(expect.arrayContaining(['chlorine', 'chloramines']));
    const r = readReactor(addDose(s, 'hcl', 5));
    expect(r.coverage).toBe('unknown');
    expect(r.pH).toBeNull(); expect(r.gasMl).toBeNull(); expect(r.pressureKpa).toBeNull();
  });
  it('rechaza datos inválidos, sustancias desconocidas y sobrellenado', () => {
    for (const amount of [NaN, Infinity, -1, 0, 191]) expect(() => addDose(initialReactor(), 'water', amount)).toThrow();
    expect(() => addDose(initialReactor(), 'invented', 1)).toThrow();
  });
  it('cada par del catálogo tiene resultado explícito, sin NaN ni falsa cuantificación', () => {
    for (const a of CHEMICALS) for (const b of CHEMICALS) {
      const s = mix([[a.id, 1], [b.id, 1]]), r = readReactor(s);
      expect(['quantitative', 'partial', 'unknown']).toContain(r.coverage);
      expect(s.volumeMl).toBe(52);
      for (const value of [r.pH, r.temperatureC, r.pressureKpa, r.gasMl, r.precipitateG]) {
        if (value !== null) expect(Number.isFinite(value)).toBe(true);
      }
      if (r.coverage === 'unknown') expect(r.pH).toBeNull();
      expect(r.observations.length).toBeGreaterThan(0);
    }
  });
});

describe('Ampliaciones de equilibrio', () => {
  it('resuelve las tres disociaciones de cítrico y no inventa complejos con calcio', () => {
    const acid = readReactor(mix([['citric', 50]]));
    expect(acid.coverage).toBe('quantitative');
    expect(acid.pH).toBeGreaterThan(2); expect(acid.pH).toBeLessThan(3);
    const neutral = readReactor(mix([['citric', 25], ['naoh', 75]]));
    expect(neutral.pH).toBeGreaterThan(8);
    expect(readReactor(mix([['citric', 10], ['calcium', 10]])).pH).toBeNull();
    const carbon = mix([['citric', 10], ['bicarbonate', 20]]);
    expect(carbon.generatedCO2Mol).toBeCloseTo(0.002, 10);
    expect(carbon.carbonMol + carbon.generatedCO2Mol).toBeCloseTo(0.002, 10);
  });
  it('resuelve amoníaco acuoso pero no inventa volatilización ni presión', () => {
    const basic = readReactor(mix([['ammonia', 50]]));
    expect(basic.pH).toBeCloseTo(10.97, 2);
    expect(basic.pressureKpa).toBeNull();
    const acidic = readReactor(mix([['ammonia', 50], ['hcl', 50]]));
    expect(acidic.pH).toBeGreaterThan(5); expect(acidic.pH).toBeLessThan(6);
    expect(readReactor(mix([['ammonia', 10], ['bicarbonate', 10]])).coverage).toBe('unknown');
  });
  it('evita asumir que calcio y una base fuerte son solo una mezcla sin precipitado', () => {
    const r = readReactor(mix([['calcium', 50], ['naoh', 100]]));
    expect(r.precipitateName).toContain('Ca(OH)₂');
    expect(r.precipitateG).toBeGreaterThan(0);
    expect(r.precipitateG).toBeLessThan(0.005 * 74.0927);
  });
});
