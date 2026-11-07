import * as THREE from 'three';

/** Avatar del asistente modelado en Blender (`assets/blender/asistente-robot.blend`). Mide 1,13 m a escala real. */
export const ASSISTANT_ROBOT_URL = '/models/assistant/robot.glb';

export const ROBOT_CLIPS = ['flotar', 'saludar', 'senalar', 'asentir'] as const;
export type RobotClip = (typeof ROBOT_CLIPS)[number];

const IDLE: RobotClip = 'flotar';
const FADE = 0.25;
const SPEED = 3.5; // m/s en unidades de la nave
const TURN = 4.0; // rad/s

/**
 * Reproduce las animaciones del robot. `flotar` es el reposo en bucle; los gestos se reproducen una vez
 * y al terminar vuelven solos al reposo. Punto de entrada para que el asistente IA dispare gestos.
 */
export class AssistantRobot {
  current: RobotClip = IDLE;
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<RobotClip, THREE.AnimationAction>();
  private readonly home: THREE.Vector3;
  private readonly homeYaw: number;
  private readonly target = new THREE.Vector3();
  private targetYaw = 0;
  private stayLeft = 0;
  private flying = false;
  private arrivalGesture: RobotClip | null = null;
  private readonly hand: THREE.Object3D;
  private readonly grip: THREE.Vector3;
  private held: { obj: THREE.Object3D; parent: THREE.Object3D; position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 } | null = null;

  constructor(readonly root: THREE.Object3D, clips: THREE.AnimationClip[]) {
    // Punta del antebrazo derecho (anillo de agarre) medida en pose de reposo, en coordenadas del hueso
    this.hand = root.getObjectByName('antebrazo_der') ?? root;
    root.updateMatrixWorld(true);
    this.grip = this.hand.worldToLocal(root.localToWorld(new THREE.Vector3(-0.272, 0.35, 0.09)));
    this.home = root.position.clone();
    this.homeYaw = root.rotation.y;
    this.target.copy(this.home);
    this.targetYaw = this.homeYaw;
    this.mixer = new THREE.AnimationMixer(root);
    for (const name of ROBOT_CLIPS) {
      const clip = clips.find(c => c.name === name);
      if (!clip) throw new Error(`Falta la animación ${name} del robot`);
      const action = this.mixer.clipAction(clip);
      if (name !== IDLE) {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions.set(name, action);
    }
    this.mixer.addEventListener('finished', () => this.play(IDLE));
    this.actions.get(IDLE)!.play();
  }

  play(name: RobotClip) {
    const next = this.actions.get(name)!;
    const previous = this.actions.get(this.current)!;
    next.reset().play();
    if (previous !== next) previous.crossFadeTo(next, FADE, false);
    this.current = name;
  }

  /**
   * Vuela hasta `position` mirando hacia `lookAt` (el alumno), se queda `stay` segundos y regresa a su sitio.
   * shortcut: vuelo en línea recta sin esquivar mesas; añadir rutas si el robot pasa a moverse por el suelo.
   */
  flyTo(position: THREE.Vector3, lookAt: THREE.Vector3, stay: number, gesture?: RobotClip) {
    this.target.copy(position);
    this.targetYaw = Math.atan2(lookAt.x - position.x, lookAt.z - position.z);
    this.stayLeft = stay;
    this.flying = true;
    this.arrivalGesture = gesture ?? null;
  }

  get arrived() {
    return this.root.position.equals(this.target);
  }

  returnHome() {
    this.flying = false;
    this.arrivalGesture = null;
    this.target.copy(this.home);
    this.targetYaw = this.homeYaw;
  }

  /** Engancha el objeto al anillo de agarre (sin manos: «campo de fuerza»), erguido respecto al mundo. */
  grab(obj: THREE.Object3D) {
    this.release();
    if (!obj.parent) return;
    this.held = { obj, parent: obj.parent, position: obj.position.clone(), quaternion: obj.quaternion.clone(), scale: obj.scale.clone() };
    this.hand.attach(obj);
    obj.position.copy(this.grip);
    obj.quaternion.copy(this.hand.getWorldQuaternion(new THREE.Quaternion()).invert());
  }

  /** Devuelve lo agarrado exactamente a su padre y pose originales. */
  release() {
    const h = this.held;
    if (!h) return;
    h.parent.add(h.obj);
    h.obj.position.copy(h.position);
    h.obj.quaternion.copy(h.quaternion);
    h.obj.scale.copy(h.scale);
    this.held = null;
  }

  /** Posición en el mundo donde estaba lo agarrado, o null si no lleva nada. */
  heldHome() {
    const h = this.held;
    if (!h) return null;
    h.parent.updateWorldMatrix(true, false);
    return h.parent.localToWorld(h.position.clone());
  }

  update(dt: number) {
    this.mixer.update(dt);
    const pos = this.root.position;
    const toTarget = this.target.clone().sub(pos);
    const step = SPEED * dt;
    if (toTarget.length() <= step) pos.copy(this.target);
    else pos.addScaledVector(toTarget.normalize(), step);
    // Giro por el camino más corto hacia la orientación objetivo
    const turn = Math.atan2(Math.sin(this.targetYaw - this.root.rotation.y), Math.cos(this.targetYaw - this.root.rotation.y));
    this.root.rotation.y += Math.abs(turn) <= TURN * dt ? turn : Math.sign(turn) * TURN * dt;

    if (this.flying && pos.equals(this.target)) {
      if (this.arrivalGesture) {
        this.play(this.arrivalGesture); // el gesto se hace frente al alumno, no durante el vuelo
        this.arrivalGesture = null;
      }
      this.stayLeft -= dt;
      if (this.stayLeft <= 0) {
        this.flying = false;
        this.target.copy(this.home);
        this.targetYaw = this.homeYaw;
      }
    }
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
  }
}
