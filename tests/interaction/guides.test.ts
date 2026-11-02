import { describe, expect, it } from 'vitest';
import { ExplorationStore } from '../../src/lib/exploration/exploration_store.svelte';

function investigation(activityId: string) {
  const s = new ExplorationStore(); s.activityId = activityId; return s;
}
describe('Guías ligadas a la experimentación', () => {
  it('registra predicción, acidez y neutralización con las dosis reales; contrasta y evalúa', () => {
    const s = investigation('neutral');
    expect(s.predict('inventada')).toBe(false);
    expect(s.predict('acid')).toBe(true);
    expect(s.state.volumeMl).toBe(50);
    expect(s.currentStep?.id).toBe('acid');
    s.add('hcl', 10, 'gesture');
    expect(s.currentStep?.id).toBe('neutralize');
    expect(s.predict('neutral')).toBe(false);
    s.add('naoh', 5, 'keyboard');
    expect(s.guideReady).toBe(false);
    s.add('naoh', 5, 'mouse');
    expect(s.evidence.map(e => e.stepId)).toEqual(['predict', 'acid', 'neutralize']);
    expect(s.evidence[1].pH).toBeLessThan(3);
    expect(s.evidence[2].temperatureC).toBeGreaterThan(25);
    expect(s.guideReady).toBe(true);
    expect(s.evaluate()).toBe(false);
    s.answer(0); s.reflection = 'Predije acidez; el pH final fue 7. Se neutralizaron los mismos moles.';
    expect(s.evaluate()).toBe(true);
    expect(s.assessment).toMatchObject({ matches: false, quizCorrect: true });
    expect(s.assessment?.observed).toContain('7.00');
    s.add('naoh', 1, 'touch');
    expect(s.assessment).toBeNull();
    s.evaluate();
    expect(s.assessment?.observed).not.toContain('7.00');
  });
  it('detecta el exceso de base y permite compensar sin perder la medición inicial', () => {
    const s = investigation('neutral'); s.predict('neutral');
    s.add('hcl', 5, 'mouse'); s.add('naoh', 10, 'mouse');
    expect(s.recommendation?.title).toBe('Hay exceso de base');
    expect(s.guideReady).toBe(false);
    s.add('hcl', 5, 'mouse');
    expect(s.guideReady).toBe(true);
    expect(s.evidence).toHaveLength(3);
  });
  it('solo avanza la precipitación al observar CaCO₃ calculado y evalúa su identidad', () => {
    const s = investigation('solid'); s.predict('solid');
    s.add('calcium', 10, 'keyboard');
    expect(s.currentStep?.id).toBe('precipitate');
    s.add('water', 1, 'mouse');
    expect(s.guideReady).toBe(false);
    s.add('carbonate', 10, 'mouse');
    expect(s.guideReady).toBe(true);
    expect(s.evidence[2].precipitateG).toBeGreaterThan(0);
    s.answer(1); s.reflection = 'Apareció CaCO₃; la masa pasó de cero a un valor positivo.'; s.evaluate();
    expect(s.assessment).toMatchObject({ matches: true, quizCorrect: true });
  });
  it('compara presión antes/después con el colector cerrado y conserva el gas al abrir', () => {
    const s = investigation('gas'); s.predict('rise');
    s.add('bicarbonate', 10, 'gesture');
    expect(s.currentStep?.id).toBe('close');
    s.close(true);
    expect(s.currentStep?.id).toBe('generate');
    s.add('hcl', 1, 'gesture');
    expect(s.currentStep?.id).toBe('open');
    const gas = s.result.gasMl;
    s.close(false);
    expect(s.result.gasMl).toBe(gas);
    expect(s.guideReady).toBe(true);
    expect(s.evidence[3].pressureKpa).toBeGreaterThan(s.evidence[2].pressureKpa!);
    s.answer(0); s.reflection = 'La presión subió mientras el gas estaba capturado y regresó a la referencia al abrir.'; s.evaluate();
    expect(s.assessment).toMatchObject({ matches: true, quizCorrect: false });
    expect(s.assessment?.observed).toContain('101.33');
  });
  it('no acepta predicciones retrospectivas, orden incorrecto ni cobertura desconocida', () => {
    const s = investigation('neutral'); s.add('hcl', 10, 'mouse');
    expect(s.predict('neutral')).toBe(false);
    expect(s.evidence).toHaveLength(0);
    expect(s.recommendation?.title).toContain('predicción');
    s.reset(); s.predict('neutral'); s.add('naoh', 10, 'mouse');
    expect(s.recommendation?.title).toBe('Falta la medición inicial');
    expect(s.evidence).toHaveLength(1);
    s.reset(); s.predict('neutral'); s.add('iodine', 1, 'mouse');
    expect(s.result.coverage).toBe('unknown');
    expect(s.recommendation?.title).toContain('apartaste');
    expect(s.guideReady).toBe(false);
  });
  it('prioriza sobrepresión y mantiene el aviso previo sin dosificación automática', () => {
    const s = investigation('gas'); s.predict('rise');
    s.add('bicarbonate', 80, 'mouse'); s.close(true); s.add('hcl', 80, 'mouse');
    expect(s.result.stopped).toBe(true);
    expect(s.recommendation?.title).toContain('límite didáctico');
    expect(s.guideReady).toBe(false);
    s.close(false); expect(s.guideReady).toBe(true);
    s.add('bleach', 1, 'mouse');
    expect(s.pendingSafety).not.toBeNull();
    expect(s.guideReady).toBe(false);
    const volume = s.state.volumeMl; s.acknowledge();
    expect(s.state.volumeMl).toBe(volume);
  });
  it('explica por qué el gas evacuado no permite recuperar la comparación al cerrar después', () => {
    const s = investigation('gas'); s.predict('rise'); s.add('bicarbonate', 10, 'mouse');
    s.close(true); s.close(false); s.add('hcl', 1, 'mouse');
    expect(s.currentStep?.id).toBe('generate');
    expect(s.recommendation?.title).toBe('El gas se generó con el colector abierto');
    expect(s.guideReady).toBe(false);
  });
});

describe('Recuperación validada del progreso', () => {
  it('recupera mezcla, pasos, textos, respuesta y existencias; no conserva autorizaciones de peligro', () => {
    const original = investigation('neutral'); original.hypothesis = 'Quedará neutro'; original.predict('neutral');
    original.add('hcl', 10, 'mouse'); original.add('naoh', 10, 'mouse');
    original.bottles = [{ chemicalId: 'hcl', remainingMl: 90 }, { chemicalId: 'naoh', remainingMl: 90 }];
    original.answer(0); original.reflection = 'pH 7 y aumento de temperatura'; original.evaluate();
    const saved = original.snapshot(true);
    const restored = new ExplorationStore();
    expect(restored.restore(saved)).toBe(true);
    expect(restored.snapshot(true)).toEqual(saved);
    expect(restored.assessment).toMatchObject({ matches: true, quizCorrect: true });
    restored.reset(); expect(original.state.volumeMl).toBe(70);
    const risk = new ExplorationStore(); risk.add('bleach', 1, 'mouse'); risk.add('hcl', 1, 'mouse'); risk.acknowledge();
    const resumedRisk = new ExplorationStore(); resumedRisk.restore(risk.snapshot(false));
    expect(resumedRisk.add('hcl', 1, 'mouse')).toBe(false);
    expect(resumedRisk.pendingSafety).not.toBeNull();
  });
  it.each(['version', 'volume', 'gas', 'trials', 'stock', 'steps', 'prediction', 'nonfinite'])('rechaza una sesión dañada (%s) sin cambiar el ensayo actual', change => {
    const s = investigation('neutral'); s.predict('neutral'); s.add('hcl', 1, 'mouse');
    const saved = s.snapshot(true);
    const corrupt = structuredClone(saved);
    if (change === 'version') corrupt.schemaVersion = 999;
    if (change === 'volume') corrupt.state.volumeMl += 1;
    if (change === 'gas') corrupt.state.generatedCO2Mol = 1;
    if (change === 'trials') corrupt.trials = [];
    if (change === 'stock') corrupt.bottles[0].remainingMl = -1;
    if (change === 'steps') corrupt.evidence[0].stepId = 'neutralize';
    if (change === 'prediction') corrupt.prediction = 'inventada';
    if (change === 'nonfinite') corrupt.evidence[0].pH = NaN;
    expect(() => s.restore(corrupt)).toThrow();
    expect(s.snapshot(true)).toEqual(saved);
  });
});
