import { describe, expect, it } from 'vitest';
import { findChemicals, normalize, parseIntent, respond, type AssistantContext } from '../../src/lib/lab3d/assistant_intents';

const ctx = (over: Partial<AssistantContext> = {}): AssistantContext => ({
  online: true,
  recommendation: { title: 'Pista para este paso', detail: 'Mide el pH antes de añadir base.' },
  epp: { coat: true, goggles: false, gloves: false },
  ...over
});

describe('Asistente: NLP local sin tokens', () => {
  it('reconoce sustancias por nombre común, sin tildes y en orden de aparición', () => {
    expect(findChemicals(normalize('¿Qué pasa si mezclo LEJÍA con amoníaco?'))).toEqual(['bleach', 'ammonia']);
    expect(findChemicals(normalize('echo agua oxigenada y después agua'))).toEqual(['peroxide', 'water']);
    expect(findChemicals(normalize('salir de la sala'))).toEqual([]);
  });

  it('clasifica las intenciones frecuentes', () => {
    expect(parseIntent('¿Qué pasa si mezclo lejía con amoníaco?')).toEqual({ type: 'que_pasa_si', ids: ['bleach', 'ammonia'] });
    expect(parseIntent('Llévame a biología')).toEqual({ type: 'ir_a', station: 'biologia' });
    expect(parseIntent('vamos a la esclusa')).toEqual({ type: 'ir_a', station: 'sas' });
    expect(parseIntent('¿qué es el bicarbonato?')).toEqual({ type: 'que_es', id: 'bicarbonate' });
    expect(parseIntent('dame una pista, no sé qué hacer')).toEqual({ type: 'pista' });
    expect(parseIntent('¿me falta algo de protección?')).toEqual({ type: 'epp' });
    expect(parseIntent('tráeme el termómetro')).toEqual({ type: 'agarrar', object: 'termometro' });
    expect(parseIntent('agarra algo')).toEqual({ type: 'agarrar', object: null });
    expect(parseIntent('suéltalo')).toEqual({ type: 'soltar' });
    expect(parseIntent('¿por qué el cielo es azul?')).toEqual({ type: 'desconocida' });
  });

  it('alerta de una mala mezcla con el aviso real del motor y señala', () => {
    const r = respond({ type: 'que_pasa_si', ids: ['bleach', 'ammonia'] }, ctx());
    expect(r.text).toContain('cloraminas');
    expect(r.steps).toContainEqual({ type: 'gesto', clip: 'senalar' });
  });

  it('sin aviso registrado no inventa: pregunta de forma socrática', () => {
    const r = respond({ type: 'que_pasa_si', ids: ['water', 'salt'] }, ctx());
    expect(r.text).toMatch(/no tengo una incompatibilidad registrada/i);
    expect(r.text).toMatch(/\?/);
  });

  it('responde qué es una sustancia, pistas y EPP con datos de la app', () => {
    expect(respond({ type: 'que_es', id: 'bicarbonate' }, ctx()).text).toContain('Bicarbonato de sodio');
    expect(respond({ type: 'pista' }, ctx()).text).toContain('Mide el pH antes de añadir base.');
    expect(respond({ type: 'epp' }, ctx()).text).toMatch(/gafas.*guantes/i);
    expect(respond({ type: 'epp' }, ctx({ epp: { coat: true, goggles: true, gloves: true } })).text).toMatch(/completo/i);
  });

  it('se mueve entre secciones y trae objetos como trabajos encadenados', () => {
    const go = respond({ type: 'ir_a', station: 'quimica' }, ctx());
    expect(go.steps.map(s => s.type)).toEqual(['hablar', 'volar', 'gesto', 'esperar', 'volver']);
    const fetch = respond({ type: 'agarrar', object: 'gotero' }, ctx());
    expect(fetch.steps.map(s => s.type)).toEqual(['hablar', 'volar', 'agarrar', 'volar', 'esperar', 'devolver', 'volver']);
    expect(respond({ type: 'agarrar', object: null }, ctx()).steps).toEqual([{ type: 'hablar', text: expect.stringMatching(/termómetro/) }]);
  });

  it('pregunta desconocida: sin conexión lo dice y no gasta tokens', () => {
    expect(respond({ type: 'desconocida' }, ctx({ online: false })).text).toMatch(/conexión/i);
    expect(respond({ type: 'desconocida' }, ctx()).text).not.toMatch(/conexión/i);
  });
});
