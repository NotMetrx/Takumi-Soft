import { describe, it, expect } from 'vitest';
import { calculateStrongAcidBase } from '../../src/lib/science/chemistry/acid_base_solver';

describe('Science Engine: Acid-Base Ideal Equilibrium (25°C)', () => {
  it('Fixture 1: Agua pura debe dar pH ≈ 7.00', () => {
    const res = calculateStrongAcidBase({
      acidVolumeMl: 0,
      baseVolumeMl: 0,
      waterMl: 100,
      acidConcentrationMolPerL: 0.01,
      baseConcentrationMolPerL: 0.01,
      temperatureC: 25
    });
    expect(res.pH).toBeCloseTo(7.00, 2);
    expect(res.diagnosticClass).toBe('pure_water');
    expect(res.indicatorBand.band).toBe('neutral');
  });

  it('Fixture 2: Ácido puro (HCl 0.01M) debe dar pH ≈ 2.00', () => {
    const res = calculateStrongAcidBase({
      acidVolumeMl: 100,
      baseVolumeMl: 0,
      waterMl: 0,
      acidConcentrationMolPerL: 0.01,
      baseConcentrationMolPerL: 0.01,
      temperatureC: 25
    });
    expect(res.pH).toBeCloseTo(2.00, 2);
    expect(res.diagnosticClass).toBe('acid_excess');
    expect(res.indicatorBand.band).toBe('strong_acid');
  });

  it('Fixture 3: Base pura (NaOH 0.01M) debe dar pH ≈ 12.00', () => {
    const res = calculateStrongAcidBase({
      acidVolumeMl: 0,
      baseVolumeMl: 100,
      waterMl: 0,
      acidConcentrationMolPerL: 0.01,
      baseConcentrationMolPerL: 0.01,
      temperatureC: 25
    });
    expect(res.pH).toBeCloseTo(12.00, 2);
    expect(res.diagnosticClass).toBe('base_excess');
    expect(res.indicatorBand.band).toBe('strong_base');
  });

  it('Fixture 4: Neutralización equimolar (50 mL HCl + 50 mL NaOH) debe dar pH ≈ 7.00', () => {
    const res = calculateStrongAcidBase({
      acidVolumeMl: 50,
      baseVolumeMl: 50,
      waterMl: 0,
      acidConcentrationMolPerL: 0.01,
      baseConcentrationMolPerL: 0.01,
      temperatureC: 25
    });
    expect(res.pH).toBeCloseTo(7.00, 2);
    expect(res.diagnosticClass).toBe('near_equivalence');
    expect(res.indicatorBand.band).toBe('neutral');
  });

  it('Invariante: rechaza entradas negativas o no finitas', () => {
    expect(() => calculateStrongAcidBase({
      acidVolumeMl: -10,
      baseVolumeMl: 50,
      waterMl: 50,
      acidConcentrationMolPerL: 0.01,
      baseConcentrationMolPerL: 0.01,
      temperatureC: 25
    })).toThrow();
  });
});
