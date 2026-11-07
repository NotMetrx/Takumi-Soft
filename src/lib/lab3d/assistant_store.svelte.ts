import { explorationStore } from '$lib/exploration/exploration_store.svelte';
import { labStore } from '$lib/interaction/lab_store.svelte';
import { parseIntent, respond } from './assistant_intents';
import type { Step } from './assistant_jobs';

const PENDING_KEY = 'symbiolab.asistente.pendientes';

/** Preguntas que el NLP local no entendió; quedan para responderlas cuando exista el modelo de IA (fase 2). */
function savePending(text: string) {
  try {
    const list = JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]') as { at: string; text: string }[];
    list.push({ at: new Date().toISOString(), text });
    localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-50)));
  } catch {
    // Almacenamiento bloqueado o lleno: la pregunta solo queda en el chat
  }
}

class AssistantStore {
  messages = $state<{ from: 'alumno' | 'robot'; text: string }[]>([]);
  online = $state(typeof navigator === 'undefined' ? true : navigator.onLine);
  /** Pista por inactividad y rondas entre estaciones. */
  autoHelp = $state(true);
  /** Último trabajo pedido al robot; `LabScene` lo ejecuta. Objeto nuevo en cada pedido. */
  request = $state.raw<{ steps: Step[] } | null>(null);

  push(from: 'alumno' | 'robot', text: string) {
    this.messages.push({ from, text });
    if (this.messages.length > 30) this.messages.shift();
  }

  ask(text: string) {
    const question = text.trim();
    if (!question) return;
    this.push('alumno', question);
    const intent = parseIntent(question);
    if (intent.type === 'desconocida') savePending(question);
    const answer = respond(intent, {
      online: this.online,
      recommendation: explorationStore.recommendation,
      epp: { coat: labStore.safetyCoatEquipped, goggles: labStore.safetyGogglesEquipped, gloves: labStore.safetyGlovesType !== 'none' }
    });
    this.push('robot', answer.text);
    this.request = { steps: answer.steps };
  }
}

export const assistantStore = new AssistantStore();
