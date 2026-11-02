import type { ReactorResult, ReactorState } from '$lib/science/chemistry/reactor';

export const ACTIVITIES = [
  { id: 'free', name: 'Exploración libre', pair: ['hcl', 'bicarbonate'], question: 'Elige una pregunta, cambia una condición y compara los resultados.' },
  { id: 'neutral', name: 'Neutralización y calor', pair: ['hcl', 'naoh'], question: '¿Cómo se relacionan pH, cantidad añadida y calor liberado?' },
  { id: 'weak', name: 'Ácido débil y base', pair: ['acetic', 'naoh'], question: '¿El punto de equivalencia de un ácido débil tiene siempre pH 7?' },
  { id: 'buffer', name: 'Ácido acético / acetato', pair: ['acetic', 'acetate'], question: 'Prepara un tampón; luego carga ácido o base y compara su respuesta.' },
  { id: 'citric', name: 'Ácido cítrico poliprótico', pair: ['citric', 'naoh'], question: '¿Por qué un ácido con tres disociaciones no se comporta como HCl?' },
  { id: 'ammonia', name: 'Base débil y ácido', pair: ['ammonia', 'hcl'], question: '¿Qué cambia entre una base débil y NaOH? La volatilidad no está modelada.' },
  { id: 'gas', name: 'Carbonatos y CO₂', pair: ['hcl', 'bicarbonate'], question: '¿Qué cambia al capturar el gas en un colector cerrado?' },
  { id: 'solid', name: 'Precipitación de CaCO₃', pair: ['calcium', 'carbonate'], question: '¿Qué evidencia muestra la formación de un sólido? ¿Puede redisolverse al acidificar?' },
  { id: 'copper', name: 'Precipitado azul', pair: ['copper', 'naoh'], question: '¿Qué reactivo limita la cantidad de Cu(OH)₂? El pH está fuera de este modelo.' },
  { id: 'starch', name: 'Yodo y almidón', pair: ['iodine', 'starch'], question: '¿Qué indica el color azul oscuro y qué no permite concluir?' },
  { id: 'risk', name: 'Reconocer incompatibilidades', pair: ['bleach', 'hcl'], question: 'Lee las fichas y anticipa el peligro. Esta actividad no calcula generación de gas tóxico.' }
];

export interface GuideEvidence {
  stepId: string; at: string; pH: number | null; temperatureC: number | null;
  pressureKpa: number | null; gasMl: number | null; precipitateG: number | null;
}
interface GuideContext {
  state: ReactorState; result: ReactorResult; prediction: string;
  trialCount: number; evidence: GuideEvidence[];
}
export interface ExperimentGuide {
  predictionQuestion: string;
  predictions: { id: string; label: string }[];
  steps: { id: string; title: string; instruction: string; hint: string; done: (c: GuideContext) => boolean }[];
  quiz: { question: string; options: string[]; correct: number; explanation: string };
}
const predict = {
  id: 'predict', title: 'Haz una predicción',
  instruction: 'Elige qué esperas observar antes de añadir reactivos. Puedes justificarlo en el cuaderno.',
  hint: 'Una predicción puede ser incorrecta: lo que importa es contrastarla con las mediciones.',
  done: (c: GuideContext) => !!c.prediction && c.trialCount === 0
};
const added = (c: GuideContext, id: string) => c.state.addedMl[id] ?? 0;
export const GUIDES: Record<string, ExperimentGuide> = {
  neutral: {
    predictionQuestion: 'Con los mismos moles de HCl y NaOH, ¿cómo quedará el pH en este modelo?',
    predictions: [{ id: 'acid', label: 'Ácido' }, { id: 'neutral', label: 'Cerca de 7' }, { id: 'base', label: 'Básico' }],
    steps: [predict, {
      id: 'acid', title: 'Observa la disolución ácida',
      instruction: 'Añade HCl del matraz A al agua y observa el pH antes de incorporar base.',
      hint: 'Selecciona A y usa la pipeta virtual o el matraz. Registra cómo cambia el pH.',
      done: c => added(c, 'hcl') > 0 && added(c, 'naoh') === 0 && c.result.pH !== null && c.result.pH < 6.5
    }, {
      id: 'neutralize', title: 'Acércate a la neutralización',
      instruction: 'Añade NaOH del matraz B hasta obtener un pH entre 6.5 y 7.5. Observa también la temperatura.',
      hint: 'Ambas disoluciones son 0.1 mol/L: compara los volúmenes añadidos y reduce la dosis al acercarte al objetivo.',
      done: c => added(c, 'hcl') > 0 && added(c, 'naoh') > 0 && c.result.pH !== null && Math.abs(c.result.pH - 7) <= 0.5
    }],
    quiz: { question: '¿Qué permite explicar la neutralización en este ensayo?',
      options: ['Se igualan los moles de H₃O⁺ y OH⁻ aportados.', 'Mezclar cualquier ácido y base siempre produce pH 7.', 'El calor desaparece cuando el pH llega a 7.'],
      correct: 0, explanation: 'Para HCl y NaOH ideales, la equivalencia se obtiene con los mismos moles. La neutralización libera calor; otros ácidos o bases pueden tener un pH de equivalencia diferente.' }
  },
  solid: {
    predictionQuestion: 'Al combinar las disoluciones de calcio y carbonato, ¿esperas un sólido?',
    predictions: [{ id: 'solid', label: 'Se formará un sólido' }, { id: 'none', label: 'No se formará sólido' }],
    steps: [predict, {
      id: 'calcium', title: 'Prepara la disolución de calcio',
      instruction: 'Añade cloruro de calcio del matraz A y observa la masa de precipitado antes de mezclar.',
      hint: 'La presencia de iones disueltos por sí sola no implica un precipitado.',
      done: c => added(c, 'calcium') > 0 && added(c, 'carbonate') === 0
    }, {
      id: 'precipitate', title: 'Busca evidencia de precipitación',
      instruction: 'Añade carbonato de sodio del matraz B. Comprueba la masa y la identidad del sólido en Resultados.',
      hint: 'Compara la medición antes y después. El aspecto blanco es una representación; la masa procede del equilibrio calculado.',
      done: c => added(c, 'carbonate') > 0 && c.result.precipitateName?.includes('CaCO₃') === true && (c.result.precipitateG ?? 0) > 1e-6
    }],
    quiz: { question: '¿Qué evidencia respalda la formación de CaCO₃ en el modelo?',
      options: ['Cualquier cambio de color prueba que apareció un sólido.', 'La masa de precipitado calculada aumenta y se identifica CaCO₃.', 'El volumen total por sí solo demuestra precipitación.'],
      correct: 1, explanation: 'El modelo calcula el sólido mediante el producto de solubilidad y los balances de materia y carga. Color y volumen no bastan para identificarlo.' }
  },
  gas: {
    predictionQuestion: 'Si se genera CO₂ dentro del colector virtual cerrado, ¿qué esperas de la presión?',
    predictions: [{ id: 'rise', label: 'Aumentará' }, { id: 'same', label: 'Seguirá igual' }, { id: 'fall', label: 'Disminuirá' }],
    steps: [predict, {
      id: 'bicarbonate', title: 'Prepara el bicarbonato',
      instruction: 'Con el colector abierto, añade bicarbonato del matraz B antes de incorporar el ácido.',
      hint: 'Selecciona B. El gas debe generarse después de cerrar el colector virtual para poder compararlo.',
      done: c => !c.state.closed && added(c, 'bicarbonate') > 0 && added(c, 'hcl') === 0
    }, {
      id: 'close', title: 'Registra la presión inicial',
      instruction: 'Activa Colector cerrado en Mediciones. Esta comparación se realiza únicamente en el simulador.',
      hint: 'El manómetro muestra presión absoluta. Cerrar no crea CO₂: primero registra el valor de referencia.',
      done: c => c.state.closed && c.state.generatedCO2Mol === 0
    }, {
      id: 'generate', title: 'Observa el gas y la presión',
      instruction: 'Añade una pequeña dosis virtual de HCl del matraz A y compara CO₂ y presión con el registro inicial.',
      hint: 'Empieza con la dosis virtual de 1 mL. El límite de entrenamiento no representa la resistencia de un recipiente real.',
      done: c => c.state.closed && (c.result.gasMl ?? 0) > 0 && (c.result.pressureKpa ?? 0) > (c.evidence.find(e => e.stepId === 'close')?.pressureKpa ?? Infinity) + 0.1
    }, {
      id: 'open', title: 'Compara con el colector abierto',
      instruction: 'Desactiva Colector cerrado y observa cómo cambian presión, gas capturado y gas evacuado.',
      hint: 'Abrir el colector virtual transfiere el gas capturado al registro de gas evacuado; no borra el gas generado.',
      done: c => !c.state.closed && c.state.escapedCO2Mol > 0 && c.state.trappedCO2Mol === 0
    }],
    quiz: { question: '¿Por qué aumentó la presión del colector virtual cerrado?',
      options: ['El CO₂ siempre explota.', 'Cerrar el colector crea materia.', 'Aumentó la cantidad de gas en un espacio limitado.'],
      correct: 2, explanation: 'El modelo usa gas ideal y un espacio libre limitado. No calcula explosiones, velocidad de reacción ni resistencia del vidrio. Al abrir, el gas capturado se evacua.' }
  }
};

export function guideMatches(activityId: string, state: ReactorState) {
  const activity = ACTIVITIES.find(a => a.id === activityId);
  return !!activity && Object.entries(state.addedMl).every(([id, ml]) => ml === 0 || id === 'water' || activity.pair.includes(id));
}

export function guideRecommendation(activityId: string, c: GuideContext) {
  const guide = GUIDES[activityId];
  if (!guide) return null;
  if (c.result.stopped) return { title: 'Se alcanzó el límite didáctico', detail: 'Abre el colector virtual para continuar el análisis. Este límite no predice el fallo del vidrio.' };
  if (c.result.coverage !== 'quantitative' || !guideMatches(activityId, c.state)) return { title: 'Te apartaste de esta investigación', detail: 'Puedes seguir explorando libremente. Para evaluar esta guía, reinicia y usa sus reactivos; las mezclas fuera del modelo no reciben resultados inventados.' };
  const step = guide.steps[c.evidence.length];
  if (step?.id === 'predict' && c.trialCount) return { title: 'La predicción debe preceder al ensayo', detail: 'Puedes continuar libremente o reiniciar para registrar una predicción antes de añadir sustancias.' };
  if ((step?.id === 'acid' && added(c, 'naoh') > 0) || (step?.id === 'calcium' && added(c, 'carbonate') > 0) || (activityId === 'gas' && ['bicarbonate', 'close'].includes(step?.id ?? '') && c.state.generatedCO2Mol > 0)) return { title: 'Falta la medición inicial', detail: 'Ya mezclaste antes de registrar la referencia. Conserva tus observaciones en el cuaderno y reinicia si quieres comparar los pasos de la guía.' };
  if (step?.id === 'neutralize' && (c.result.pH ?? 0) > 7.5) return { title: 'Hay exceso de base', detail: 'Compara los volúmenes de HCl y NaOH. Reduce la dosis y compensa con ácido para acercarte al equilibrio; explica qué cambió.' };
  if (activityId === 'gas' && step?.id === 'generate' && !c.state.closed && c.state.generatedCO2Mol > 0) return { title: 'El gas se generó con el colector abierto', detail: 'El CO₂ evacuado no vuelve al cerrar. Registra esta observación y reinicia para comparar la generación de gas con el colector virtual cerrado.' };
  return { title: step ? 'Pista para este paso' : 'Contrasta tu predicción', detail: step?.hint ?? 'Revisa las mediciones, responde la pregunta y escribe una conclusión con evidencia en la evaluación.' };
}

export function comparePrediction(activityId: string, prediction: string, result: ReactorResult, evidence: GuideEvidence[]) {
  if (activityId === 'neutral') {
    const pH = result.pH!;
    const observed = pH < 6.5 ? 'acid' : pH > 7.5 ? 'base' : 'neutral';
    return { matches: prediction === observed, observed: `pH final ${pH.toFixed(2)}; temperatura estimada ${result.temperatureC?.toFixed(2) ?? '—'} °C.`, detail: 'Compara el resultado final con la predicción para moles iguales. Si añadiste más reactivo después de llegar al objetivo, explica el exceso.' };
  }
  if (activityId === 'solid') {
    const solid = (result.precipitateG ?? 0) > 1e-6;
    return { matches: prediction === (solid ? 'solid' : 'none'), observed: `Precipitado final ${(result.precipitateG ?? 0).toFixed(4)} g · ${result.precipitateName ?? 'sin sólido'}.`, detail: 'Compara la masa inicial con la final y usa la identificación del precipitado como evidencia.' };
  }
  const before = evidence.find(e => e.stepId === 'close')!;
  const after = evidence.find(e => e.stepId === 'generate')!;
  return { matches: prediction === 'rise', observed: `Colector cerrado: ${before.pressureKpa!.toFixed(2)} → ${after.pressureKpa!.toFixed(2)} kPa; abierto al finalizar: ${result.pressureKpa!.toFixed(2)} kPa.`, detail: 'La comparación usa las mediciones guardadas antes y después de generar gas. El CO₂ total no desaparece al abrir el colector.' };
}
