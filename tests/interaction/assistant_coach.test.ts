import { describe, expect, it } from 'vitest';
import { adviceForDanger, adviceForSafetyAlert, adviceForWarnings } from '../../src/lib/lab3d/assistant_coach';
import type { Hazard } from '../../src/lib/science/chemistry/reactor';

const hazard = (id: string, severity: Hazard['severity']): Hazard => ({
  id, severity, title: `Título ${id}`, detail: `Detalle ${id}.`, source: 'https://example.org'
});

describe('Asistente: alertas y recomendaciones', () => {
  it('una mala mezcla produce una alerta hablada con gesto de señalar', () => {
    const advice = adviceForDanger([hazard('chloramines', 'danger')]);
    expect(advice.kind).toBe('alerta');
    expect(advice.gesture).toBe('senalar');
    expect(advice.text).toContain('Título chloramines');
    expect(advice.text).toContain('Detalle chloramines.');
    expect(advice.text).toMatch(/cancela/i);
  });

  it('los avisos leves se recomiendan una sola vez y se pueden volver a avisar tras reiniciar', () => {
    const seen = new Set<string>();
    const first = adviceForWarnings([hazard('heat', 'warning'), hazard('x', 'danger')], seen);
    expect(first?.kind).toBe('recomendacion');
    expect(first?.gesture).toBe('asentir');
    expect(first?.text).toContain('Título heat');
    expect(first?.text).not.toContain('Título x');
    expect(adviceForWarnings([hazard('heat', 'warning')], seen)).toBeNull();
    expect(adviceForWarnings([], seen)).toBeNull();
    expect(adviceForWarnings([hazard('heat', 'warning')], seen)?.text).toContain('Título heat');
  });

  it('lee las alertas de seguridad del laboratorio sin emojis y solo si son advertencias', () => {
    const advice = adviceForSafetyAlert({ title: '⚠️ PROTOCOLO DE SEGURIDAD (SGA)', message: 'Faltan gafas.', type: 'warning' });
    expect(advice?.text).toBe('PROTOCOLO DE SEGURIDAD (SGA). Faltan gafas.');
    expect(advice?.gesture).toBe('senalar');
    expect(adviceForSafetyAlert({ title: 'ℹ️ EPP', message: 'ok', type: 'info' })).toBeNull();
    expect(adviceForSafetyAlert(null)).toBeNull();
  });
});
