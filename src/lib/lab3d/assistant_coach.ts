import type { Hazard } from '$lib/science/chemistry/reactor';
import type { RobotClip } from './assistant_robot';

export interface Advice {
  kind: 'alerta' | 'recomendacion';
  text: string;
  gesture: RobotClip;
}

const describe = (hazards: Hazard[]) => hazards.map(h => `${h.title}. ${h.detail}`).join(' ');

/** Mezcla incompatible: el vertido ya está pausado, el asistente lo explica y pide cancelar. */
export function adviceForDanger(hazards: Hazard[]): Advice {
  return {
    kind: 'alerta',
    gesture: 'senalar',
    text: `¡Alto! ${describe(hazards)} Te recomiendo cancelar el vertido y revisar la ficha de seguridad antes de continuar.`
  };
}

/**
 * Avisos leves tras mezclar (calor, presión, vapores). `seen` evita repetir el mismo aviso;
 * cuando la lista queda vacía (reinicio) se olvida para poder avisar de nuevo.
 */
export function adviceForWarnings(hazards: Hazard[], seen: Set<string>): Advice | null {
  const warnings = hazards.filter(h => h.severity === 'warning');
  if (!warnings.length) {
    seen.clear();
    return null;
  }
  const fresh = warnings.filter(h => !seen.has(h.id));
  fresh.forEach(h => seen.add(h.id));
  if (!fresh.length) return null;
  return { kind: 'recomendacion', gesture: 'asentir', text: `Atención. ${describe(fresh)}` };
}

/** Advertencias del laboratorio (EPP, protocolos). Las informativas no se leen en voz alta. */
export function adviceForSafetyAlert(alert: { title: string; message: string; type: string } | null): Advice | null {
  if (!alert || alert.type !== 'warning') return null;
  const title = alert.title.replace(/[\p{Extended_Pictographic}️]/gu, '').trim();
  return { kind: 'alerta', gesture: 'senalar', text: `${title}. ${alert.message}` };
}

/** Voz del asistente con la síntesis del navegador; corta la frase anterior para no encolar avisos viejos. */
export function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  // Voces instaladas en el equipo primero: funcionan sin internet
  const spanish = synth.getVoices().filter(v => v.lang.startsWith('es'));
  utterance.voice = spanish.find(v => v.localService) ?? spanish[0] ?? null;
  utterance.pitch = 0.8; // voz más grave para el personaje
  utterance.rate = 1.0;
  synth.cancel();
  synth.speak(utterance);
}
