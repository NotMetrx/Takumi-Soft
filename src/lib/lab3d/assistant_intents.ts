import { CHEMICALS, chemical } from '$lib/science/chemistry/catalog';
import { assessHazards, initialReactor } from '$lib/science/chemistry/reactor';
import type { Step } from './assistant_jobs';

/**
 * NLP local del asistente: entiende en español las consultas frecuentes sin conexión y sin gastar tokens.
 * Lo que no entiende queda como `desconocida` (en la fase 2 se enviará a un modelo de IA).
 */
export type Station = 'quimica' | 'biologia' | 'steam' | 'sas' | 'vestidor';
export type Grabbable = 'termometro' | 'gotero' | 'tiras' | 'phmetro';
export type Intent =
  | { type: 'ir_a'; station: Station }
  | { type: 'que_pasa_si'; ids: string[] }
  | { type: 'que_es'; id: string }
  | { type: 'pista' }
  | { type: 'epp' }
  | { type: 'agarrar'; object: Grabbable | null }
  | { type: 'soltar' }
  | { type: 'desconocida' };

export interface AssistantContext {
  online: boolean;
  recommendation: { title: string; detail: string } | null;
  epp: { coat: boolean; goggles: boolean; gloves: boolean };
}

export const normalize = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Nombres comunes con los que un alumno se refiere a cada sustancia del catálogo
const CHEMICAL_ALIASES: Record<string, string[]> = {
  water: ['agua destilada', 'agua'],
  hcl: ['acido clorhidrico', 'clorhidrico', 'acido muriatico', 'muriatico', 'hcl'],
  naoh: ['hidroxido de sodio', 'sosa caustica', 'soda caustica', 'sosa', 'naoh'],
  acetic: ['acido acetico', 'vinagre'],
  acetate: ['acetato de sodio', 'acetato'],
  bicarbonate: ['bicarbonato de sodio', 'bicarbonato'],
  carbonate: ['carbonato de sodio', 'carbonato'],
  calcium: ['cloruro de calcio', 'calcio'],
  salt: ['cloruro de sodio', 'sal'],
  sugar: ['sacarosa', 'azucar'],
  iodine: ['yodo'],
  starch: ['almidon'],
  copper: ['sulfato de cobre', 'cobre'],
  ethanol: ['etanol', 'alcohol'],
  peroxide: ['peroxido de hidrogeno', 'agua oxigenada', 'peroxido'],
  bleach: ['hipoclorito', 'lejia', 'cloro', 'blanqueador'],
  ammonia: ['amoniaco'],
  citric: ['acido citrico', 'citrico', 'limon']
};
const PHRASES = CHEMICALS.flatMap(c => [normalize(c.name), ...(CHEMICAL_ALIASES[c.id] ?? [])].map(p => ({ p, id: c.id })))
  .sort((a, b) => b.p.length - a.p.length);

/** Sustancias mencionadas, en orden de aparición. La frase más larga gana («agua oxigenada» antes que «agua»). */
export function findChemicals(text: string): string[] {
  const padded = ` ${text} `;
  const used = new Array<boolean>(padded.length).fill(false);
  const hits: { at: number; id: string }[] = [];
  for (const { p, id } of PHRASES) {
    for (let at = padded.indexOf(` ${p} `); at !== -1; at = padded.indexOf(` ${p} `, at + 1)) {
      if (used.slice(at + 1, at + 1 + p.length).some(Boolean)) continue;
      used.fill(true, at + 1, at + 1 + p.length);
      hits.push({ at, id });
    }
  }
  return [...new Set(hits.sort((a, b) => a.at - b.at).map(h => h.id))];
}

const STATIONS: [Station, RegExp][] = [
  ['quimica', /\b(quimica|mesa central)\b/],
  ['biologia', /\b(biologia|microscop\w*)\b/],
  ['steam', /\b(steam|fisica)\b/],
  ['vestidor', /\b(vestidor|armario epp)\b/],
  ['sas', /\b(sas|esclusa|salida|ducha|lavaojos)\b/]
];
const OBJECTS: [Grabbable, RegExp][] = [
  ['termometro', /\btermometro\b/],
  ['gotero', /\b(gotero|indicador)\b/],
  ['tiras', /\b(tiras|papel (ph|indicador))\b/],
  ['phmetro', /\b(phmetro|ph metro|medidor de ph|peachimetro)\b/]
];
const RE = {
  soltar: /\b(suelta\w*|soltar\w*|devuelve\w*|dejalo|dejala)\b/,
  agarrar: /\b(agarra\w*|toma\w*|coge\w*|trae\w*|sujeta\w*|levanta\w*|alcanza\w*)\b/,
  ir: /\b(llevame|lleva\w*|vamos|ve|ir|anda|muevete|acompaname|ven|guiame|donde esta|donde queda)\b/,
  pista: /\b(pista|ayuda\w*|que hago|siguiente paso|no se|como sigo|atascad\w*)\b/,
  epp: /\b(epp|proteccion|gafas|guantes|bata|seguridad)\b/
};

export function parseIntent(text: string): Intent {
  const t = normalize(text);
  if (RE.soltar.test(t)) return { type: 'soltar' };
  if (RE.agarrar.test(t)) return { type: 'agarrar', object: OBJECTS.find(([, re]) => re.test(t))?.[0] ?? null };
  const station = STATIONS.find(([, re]) => re.test(t))?.[0];
  if (station && RE.ir.test(t)) return { type: 'ir_a', station };
  const ids = findChemicals(t);
  if (ids.length >= 2) return { type: 'que_pasa_si', ids };
  if (ids.length === 1) return { type: 'que_es', id: ids[0] };
  if (RE.pista.test(t)) return { type: 'pista' };
  if (RE.epp.test(t)) return { type: 'epp' };
  return { type: 'desconocida' };
}

const STATION_NAMES: Record<Station, string> = {
  quimica: 'la mesa de Química', biologia: 'la mesa de Biología', steam: 'la mesa STEAM',
  sas: 'la esclusa SAS con la ducha de emergencia', vestidor: 'el vestidor de EPP'
};
const OBJECT_NAMES: Record<Grabbable, string> = {
  termometro: 'el termómetro', gotero: 'el gotero de indicador', tiras: 'las tiras de pH', phmetro: 'el pH-metro'
};
const listNames = (ids: string[]) => ids.map(id => chemical(id).name.toLowerCase()).join(' y ');
const say = (text: string): Step => ({ type: 'hablar', text });

export function respond(intent: Intent, ctx: AssistantContext): { text: string; steps: Step[] } {
  const reply = (text: string, ...steps: Step[]) => ({ text, steps: [say(text), ...steps] });
  switch (intent.type) {
    case 'que_pasa_si': {
      // Mismo motor de avisos que el simulador: el asistente no inventa incompatibilidades
      const state = { ...initialReactor(), addedMl: Object.fromEntries(intent.ids.slice(0, -1).map(id => [id, 10])) };
      const hazards = assessHazards(state, intent.ids.at(-1));
      const danger = hazards.filter(h => h.severity === 'danger');
      const detail = (list: typeof hazards) => list.map(h => `${h.title}. ${h.detail}`).join(' ');
      if (danger.length) {
        return reply(`Cuidado con mezclar ${listNames(intent.ids)}. ${detail(danger)} No lo hagas fuera del simulador.`,
          { type: 'volar', to: 'alumno' }, { type: 'gesto', clip: 'senalar' }, { type: 'esperar', s: 4 }, { type: 'volver' });
      }
      if (hazards.length) return reply(`Se puede, pero con atención. ${detail(hazards)}`, { type: 'gesto', clip: 'asentir' });
      return reply(`No tengo una incompatibilidad registrada para ${listNames(intent.ids)}. ¿Qué crees que cambiará: el pH, la temperatura o el color? Pruébalo en el simulador y compáralo con tu predicción.`,
        { type: 'gesto', clip: 'asentir' });
    }
    case 'que_es': {
      const c = chemical(intent.id);
      return reply(`${c.name} (${c.formula}): ${c.family}. ${c.note}${c.hazards[0] ? ` Precaución: ${c.hazards[0]}` : ''}`);
    }
    case 'pista': {
      const r = ctx.recommendation;
      return reply(r ? `${r.title}. ${r.detail}` : '¿Qué variable quieres observar primero? Escribe tu hipótesis y haz un ensayo pequeño para comprobarla.',
        { type: 'gesto', clip: 'asentir' });
    }
    case 'epp': {
      const missing = [!ctx.epp.coat && 'bata', !ctx.epp.goggles && 'gafas', !ctx.epp.gloves && 'guantes'].filter(Boolean);
      if (!missing.length) return reply('Tienes el EPP completo: bata, gafas y guantes. ¡Bien hecho!', { type: 'gesto', clip: 'asentir' });
      return reply(`Te falta: ${missing.join(', ')}. Equípalos en el vestidor de la esclusa antes de manipular reactivos.`,
        { type: 'volar', to: 'vestidor' }, { type: 'gesto', clip: 'senalar' }, { type: 'esperar', s: 3 }, { type: 'volver' });
    }
    case 'ir_a':
      return reply(`Te muestro ${STATION_NAMES[intent.station]}.`,
        { type: 'volar', to: intent.station }, { type: 'gesto', clip: 'senalar' }, { type: 'esperar', s: 3 }, { type: 'volver' });
    case 'agarrar':
      if (!intent.object) return { text: 'Puedo traerte el termómetro, el gotero, las tiras de pH o el pH-metro. ¿Cuál quieres?', steps: [say('Puedo traerte el termómetro, el gotero, las tiras de pH o el pH-metro. ¿Cuál quieres?')] };
      return reply(`Voy por ${OBJECT_NAMES[intent.object]}.`,
        { type: 'volar', to: `objeto:${intent.object}` }, { type: 'agarrar', object: intent.object },
        { type: 'volar', to: 'alumno' }, { type: 'esperar', s: 6 }, { type: 'devolver' }, { type: 'volver' });
    case 'soltar':
      return reply('Lo devuelvo a su sitio.', { type: 'devolver' }, { type: 'volver' });
    case 'desconocida':
      return reply(ctx.online
        ? 'Todavía no sé responder eso; guardé tu pregunta. Mientras tanto, ¿qué observas en tu experimento y qué crees que lo explica?'
        : 'Sin conexión todavía no sé responder eso; guardé tu pregunta para cuando vuelva internet. ¿Qué observas en tu experimento?');
  }
}
