import * as THREE from 'three';
import { ROBOT_CLIPS, type AssistantRobot, type RobotClip } from './assistant_robot';

/**
 * Pasos que el asistente sabe ejecutar. Es la lista blanca: lo que venga del NLP local (o, en el futuro,
 * de un modelo de IA) se valida contra ella antes de mover al robot.
 */
export type Step =
  | { type: 'hablar'; text: string } // no bloquea: el robot habla mientras sigue con el siguiente paso
  | { type: 'volar'; to: string } // estación, 'alumno' u 'objeto:<id>'
  | { type: 'volver' }
  | { type: 'gesto'; clip: RobotClip }
  | { type: 'esperar'; s: number }
  | { type: 'agarrar'; object: string }
  | { type: 'devolver' }; // lleva lo agarrado a su sitio y lo suelta

export interface JobHost {
  robot: AssistantRobot;
  resolve(to: string): { pos: THREE.Vector3; lookAt: THREE.Vector3 } | null;
  object(id: string): THREE.Object3D | null;
  say(text: string): void;
}

/** Posición del robot para tomar o dejar un objeto: algo más abajo y delante de él. */
export const APPROACH = new THREE.Vector3(0, -0.9, 0.9);

function isStep(s: Step): boolean {
  switch (s?.type) {
    case 'hablar': return typeof s.text === 'string';
    case 'volar': return typeof s.to === 'string';
    case 'gesto': return ROBOT_CLIPS.includes(s.clip);
    case 'esperar': return Number.isFinite(s.s) && s.s >= 0 && s.s <= 60;
    case 'agarrar': return typeof s.object === 'string';
    case 'volver':
    case 'devolver': return true;
    default: return false;
  }
}

/** Cola de «trabajos» del robot: avanza un paso por vez dentro del bucle de animación. */
export class JobQueue {
  private steps: Step[] = [];
  private active: Step | null = null;
  private timer = 0;

  constructor(private readonly host: JobHost) {}

  get busy() {
    return this.active !== null || this.steps.length > 0;
  }

  run(steps: Step[]) {
    this.cancel();
    this.steps = steps.filter(s => isStep(s) || (console.warn('Paso del asistente rechazado', s), false));
  }

  /** Corta el trabajo en curso; lo que llevaba vuelve a su sitio y el robot regresa a casa. */
  cancel() {
    this.steps = [];
    this.active = null;
    this.host.robot.release();
    this.host.robot.returnHome();
  }

  update(dt: number) {
    this.host.robot.update(dt);
    if (!this.active) {
      const next = this.steps.shift();
      if (!next) return;
      if (!this.start(next)) return;
      this.active = next;
    }
    if (this.done(this.active, dt)) this.active = null;
  }

  private start(step: Step): boolean {
    const { robot } = this.host;
    switch (step.type) {
      case 'hablar':
        this.host.say(step.text);
        return true;
      case 'volar': {
        const target = this.host.resolve(step.to);
        if (!target) {
          console.warn('Destino del asistente desconocido', step.to);
          return false;
        }
        robot.flyTo(target.pos, target.lookAt, Infinity);
        return true;
      }
      case 'volver':
        robot.returnHome();
        return true;
      case 'gesto':
        robot.play(step.clip);
        return true;
      case 'esperar':
        this.timer = step.s;
        return true;
      case 'agarrar': {
        const obj = this.host.object(step.object);
        if (obj) robot.grab(obj);
        else console.warn('Objeto del asistente desconocido', step.object);
        return true;
      }
      case 'devolver': {
        const home = robot.heldHome();
        if (!home) return false;
        robot.flyTo(home.clone().add(APPROACH), home, Infinity);
        return true;
      }
    }
  }

  private done(step: Step, dt: number): boolean {
    const { robot } = this.host;
    switch (step.type) {
      case 'volar':
      case 'volver':
        return robot.arrived;
      case 'gesto':
        return robot.current === 'flotar';
      case 'esperar':
        return (this.timer -= dt) <= 0;
      case 'devolver':
        if (!robot.arrived) return false;
        robot.release();
        return true;
      default:
        return true;
    }
  }
}
