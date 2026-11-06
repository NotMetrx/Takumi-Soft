import * as THREE from 'three';
import { labSound } from '$lib/audio/lab_sound';
import {
  labStore,
  type SafetyGlovesType,
  type LabStationId,
  type MicroscopeSpecimenId,
  type CabinetComponentInfo
} from '$lib/interaction/lab_store.svelte';

export interface FirstPersonColliderBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  name: string;
}

export interface FocusedTargetInfo {
  id: string;
  title: string;
  actionHint: string;
  icon: string;
  distanceM: number;
  onInteract: () => void;
}

export type HandInteractionGesture =
  | 'NONE'
  | 'GRAB_HOLD'
  | 'RELEASE_PLACE'
  | 'POUR_LIQUID'
  | 'PINCH_TURN'
  | 'SQUEEZE_DROPPER'
  | 'DIP_STRIP'
  | 'GRAB_AND_PLACE'
  | 'TWO_HAND_EQUIP'
  | 'PULL_LEVER';

interface FingerJointChain {
  proximalPivot: THREE.Group;
  distalPivot: THREE.Group;
  baseX: number;
  baseY: number;
  baseZ: number;
  spreadZ: number;
}

interface ArticulatedArmRig {
  root: THREE.Group;
  wristPivot: THREE.Group;
  gripSocket: THREE.Group;
  thumbProximalPivot: THREE.Group;
  thumbDistalPivot: THREE.Group;
  fingers: FingerJointChain[];
}

export class FirstPersonController {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  scene?: THREE.Scene;

  enabled = false;
  position = new THREE.Vector3(0, 1.68, 3.2); // Altura de ojos de pie (1.68m)
  velocity = new THREE.Vector3(0, 0, 0);

  yaw = 0; // Rotación horizontal
  pitch = 0; // Rotación vertical
  targetYaw = 0;
  targetPitch = 0;

  walkSpeed = 2.4; // m/s
  sprintSpeed = 3.8; // m/s
  headBobbingCycle = 0;
  lastFootstepHalf = 0;
  baseEyeHeight = 1.68;

  // Estado de Pointer Lock y rotación libre estilo Minecraft (sin requerir clic)
  isPointerLocked = false;
  private isDragging = false;
  private hasMouseSample = false;
  private prevMouseX = 0;
  private prevMouseY = 0;
  private readonly tableSurfacePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly tempPlaneHit = new THREE.Vector3();

  // Retícula y objeto enfocado en el punto de mira central
  focusedTarget: FocusedTargetInfo | null = null;
  private centerRaycaster = new THREE.Raycaster();
  private centerPointer = new THREE.Vector2(0, 0);

  // Brazos y manos articuladas en 1ª persona (con falanges proximales/distales, muñeca y socket de agarre)
  armsGroup: THREE.Group;
  private leftArmGroup: THREE.Group;
  private rightArmGroup: THREE.Group;
  private leftRig!: ArticulatedArmRig;
  private rightRig!: ArticulatedArmRig;
  private rightThumbMesh!: THREE.Mesh;
  private rightIndexMesh!: THREE.Mesh;
  private leftThumbMesh!: THREE.Mesh;
  private leftIndexMesh!: THREE.Mesh;
  private sleeveMat: THREE.MeshStandardMaterial;
  private cuffMat: THREE.MeshStandardMaterial;
  private skinOrGloveMat: THREE.MeshStandardMaterial;
  private nailMat: THREE.MeshStandardMaterial;

  // Estado de manipulación física con las manos en 1ª persona (Agarrar, Sostener, Verter, Dejar, Accionar)
  heldFlaskId: 'hcl' | 'naoh' | null = null;
  isPouringHeldFlask = false;
  private pourPulseTimer = 0;
  private activeGesture: HandInteractionGesture = 'NONE';
  private gestureTimer = 0;
  private gestureDuration = 0.45;
  private rightHandCurl = 0.22;
  private leftHandCurl = 0.22;
  private rightPinchAmount = 0;
  private leftPinchAmount = 0;
  private rightReachProgress = 0;
  private leftReachProgress = 0;
  private rightWristTwist = 0;
  private leftWristTwist = 0;

  // Sway inercial de manos al girar la cámara
  private armSwayX = 0;
  private armSwayY = 0;

  // Vectores pre-alocados para evitar Garbage Collection en el render loop (Zero-GC)
  private readonly tempForward = new THREE.Vector3();
  private readonly tempRight = new THREE.Vector3();
  private readonly tempMoveDir = new THREE.Vector3();
  private readonly tempDeltaMove = new THREE.Vector3();
  private readonly tempTargetDir = new THREE.Vector3();
  private readonly tempLookTarget = new THREE.Vector3();
  private readonly tempQuatIdleL = new THREE.Quaternion();
  private readonly tempQuatIdleR = new THREE.Quaternion();
  private readonly tempQuatGripL = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.42, 0.28, -0.22));
  private readonly tempQuatGripR = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.54, -0.34, 0.28));
  private lastRaycastMs = 0;
  private proximityTriggered = false;
  private readonly savedPreInspectPos = new THREE.Vector3();
  private savedPreInspectYaw = 0;
  private savedPreInspectPitch = -0.08;
  private hasSavedPreInspectPose = false;

  // Teclado
  private keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false
  };

  // Controles táctiles móviles (Virtual Joystick)
  touchMoveActive = false;
  touchMoveStart = { x: 0, y: 0 };
  touchMoveCurrent = { x: 0, y: 0 };
  touchMoveVector = { x: 0, y: 0 };
  touchLookActive = false;
  touchLookPrev = { x: 0, y: 0 };

  // Sensibilidad y configuración del ratón
  mouseSensitivity = 1.0;
  invertY = false;

  // Cajas de colisión AABB para impedir atravesar mesas, muros y cámara SAS
  colliders: FirstPersonColliderBox[] = [
    // Perímetro General del Complejo (Gran Nave de Laboratorio + Esclusa SAS al Fondo)
    { minX: -9.8, maxX: 9.8, minZ: -1.2, maxZ: 14.3, name: 'bounds' },
    // Mesa Central Química (4.4m x 2.6m ampliada)
    { minX: -2.25, maxX: 2.25, minZ: -1.35, maxZ: 1.35, name: 'chem_table' },
    // Mesa Biología (3.5m x 2.4m en x = -4.3)
    { minX: -6.1, maxX: -2.5, minZ: -1.1, maxZ: 1.4, name: 'bio_table' },
    // Mesa STEAM (3.5m x 2.4m en x = 4.3)
    { minX: 2.5, maxX: 6.1, minZ: -1.1, maxZ: 1.4, name: 'steam_table' },
    // Pared Sur del Laboratorio (Ala Oeste: x de -9.8 a -1.25, en z = 10.0)
    { minX: -9.8, maxX: -1.25, minZ: 9.85, maxZ: 10.15, name: 'south_wall_left' },
    // Pared Sur del Laboratorio (Ala Este: x de 1.25 a 9.8, en z = 10.0)
    { minX: 1.25, maxX: 9.8, minZ: 9.85, maxZ: 10.15, name: 'south_wall_right' },
    // Pared Lateral Oeste de la Esclusa SAS (x = -4.0, z de 10.0 a 14.3)
    { minX: -4.15, maxX: -3.85, minZ: 10.0, maxZ: 14.3, name: 'sas_west_wall' },
    // Pared Lateral Este de la Esclusa SAS (x = +4.0, z de 10.0 a 14.3)
    { minX: 3.85, maxX: 4.15, minZ: 10.0, maxZ: 14.3, name: 'sas_east_wall' },
    // Pared Posterior Exterior de la Esclusa SAS (z = 14.3)
    { minX: -4.0, maxX: 4.0, minZ: 14.25, maxZ: 14.55, name: 'sas_back_wall' },
    // Equipamiento técnico en SAS: Ducha de emergencia en pared oeste
    { minX: -3.95, maxX: -2.7, minZ: 11.6, maxZ: 12.8, name: 'sas_shower' },
    // Equipamiento técnico en SAS: Armario EPP en pared este
    { minX: 2.7, maxX: 3.95, minZ: 11.6, maxZ: 12.8, name: 'sas_ppe_wardrobe' }
  ];

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, scene?: THREE.Scene) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;

    // Inicializar materiales de brazos y manos anatómicas
    this.sleeveMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.82
    });
    this.cuffMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.72
    });
    this.skinOrGloveMat = new THREE.MeshStandardMaterial({
      color: 0xd8a47f,
      roughness: 0.52
    });
    this.nailMat = new THREE.MeshStandardMaterial({
      color: 0xf3d5c0,
      roughness: 0.35
    });

    // Construir el rig de brazos y manos articuladas en primera persona
    this.armsGroup = new THREE.Group();
    this.armsGroup.name = 'FirstPersonArmsRig';
    this.leftArmGroup = this.buildArmMesh('left');
    this.rightArmGroup = this.buildArmMesh('right');
    this.armsGroup.add(this.leftArmGroup);
    this.armsGroup.add(this.rightArmGroup);

    this.armsGroup.position.set(0, -0.21, -0.37);
    this.camera.add(this.armsGroup);
    this.armsGroup.visible = false;

    // Binds de eventos
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);
    this.onPointerLockChange = this.onPointerLockChange.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
  }

  /**
   * Construye un brazo y mano anatómica articulada en 1ª persona (con antebrazo, puño de bata,
   * muñeca rotatoria, palma esculpida, eminencia tenar y 5 dedos con falanges proximales y distales)
   */
  private buildArmMesh(side: 'left' | 'right'): THREE.Group {
    const arm = new THREE.Group();
    const sign = side === 'left' ? -1 : 1;

    // 1. Antebrazo anatómico con manga de laboratorio
    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.041, 0.055, 0.31, 18),
      this.sleeveMat
    );
    sleeve.rotation.x = Math.PI / 2.45;
    sleeve.rotation.z = sign * 0.21;
    sleeve.position.set(sign * 0.215, -0.068, 0.095);
    arm.add(sleeve);

    // Puño elástico de la bata / manga
    const cuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.039, 0.042, 0.034, 18),
      this.cuffMat
    );
    cuff.rotation.x = Math.PI / 2.45;
    cuff.rotation.z = sign * 0.21;
    cuff.position.set(sign * 0.175, 0.015, -0.028);
    arm.add(cuff);

    // Reloj de laboratorio en la muñeca izquierda para realismo en primera persona
    if (side === 'left') {
      const watchStrap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0365, 0.0365, 0.016, 16),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
      );
      watchStrap.rotation.x = Math.PI / 2.45;
      watchStrap.rotation.z = sign * 0.21;
      watchStrap.position.set(sign * 0.168, 0.027, -0.045);
      arm.add(watchStrap);

      const watchFace = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.014, 0.006, 16),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.4, roughness: 0.2 })
      );
      watchFace.position.set(sign * 0.156, 0.044, -0.048);
      arm.add(watchFace);
    }

    // 2. Pivote de Muñeca Articulada (permite flexión, extensión y pronación al verter/girar)
    const wristPivot = new THREE.Group();
    wristPivot.position.set(sign * 0.162, 0.036, -0.056);
    wristPivot.rotation.set(-0.14, sign * 0.12, sign * 0.1);
    arm.add(wristPivot);

    const wristMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.036, 0.045, 16),
      this.skinOrGloveMat
    );
    wristMesh.rotation.x = Math.PI / 2.2;
    wristPivot.add(wristMesh);

    // 3. Palma anatómica esculpida + Eminencia tenar + Nudillos metacarpianos (MCP)
    const palm = new THREE.Mesh(
      new THREE.BoxGeometry(0.072, 0.025, 0.082),
      this.skinOrGloveMat
    );
    palm.position.set(0, 0.008, -0.048);
    wristPivot.add(palm);

    const palmBack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.034, 0.036, 0.068, 14),
      this.skinOrGloveMat
    );
    palmBack.rotation.z = Math.PI / 2;
    palmBack.scale.set(0.42, 1, 1.12);
    palmBack.position.set(0, 0.012, -0.048);
    wristPivot.add(palmBack);

    // Músculo tenar en la base del pulgar
    const thenar = new THREE.Mesh(
      new THREE.SphereGeometry(0.021, 12, 10),
      this.skinOrGloveMat
    );
    thenar.scale.set(0.85, 0.65, 1.35);
    thenar.position.set(-sign * 0.024, -0.002, -0.036);
    wristPivot.add(thenar);

    // Socket de sujeción en la palma para objetos agarrados (matraces, instrumentos)
    const gripSocket = new THREE.Group();
    gripSocket.position.set(-sign * 0.018, 0.022, -0.078);
    wristPivot.add(gripSocket);

    // 4. Pulgar articulado en 2 falanges (Oposición real para pinza y agarre cilíndrico)
    const thumbProximalPivot = new THREE.Group();
    thumbProximalPivot.position.set(-sign * 0.034, 0.004, -0.036);
    thumbProximalPivot.rotation.set(0.32, -sign * 0.42, -sign * 0.58);
    wristPivot.add(thumbProximalPivot);

    const thumbProxMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0105, 0.0125, 0.034, 12),
      this.skinOrGloveMat
    );
    thumbProxMesh.rotation.x = Math.PI / 2;
    thumbProxMesh.position.set(0, 0, -0.017);
    thumbProximalPivot.add(thumbProxMesh);

    const thumbJointSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.0105, 10, 10),
      this.skinOrGloveMat
    );
    thumbJointSphere.position.set(0, 0, -0.034);
    thumbProximalPivot.add(thumbJointSphere);

    const thumbDistalPivot = new THREE.Group();
    thumbDistalPivot.position.set(0, 0, -0.034);
    thumbDistalPivot.rotation.set(0.18, 0, 0);
    thumbProximalPivot.add(thumbDistalPivot);

    const thumbDistMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0085, 0.0102, 0.028, 12),
      this.skinOrGloveMat
    );
    thumbDistMesh.rotation.x = Math.PI / 2;
    thumbDistMesh.position.set(0, 0, -0.014);
    thumbDistalPivot.add(thumbDistMesh);

    const thumbTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.0085, 10, 10),
      this.skinOrGloveMat
    );
    thumbTip.position.set(0, 0, -0.028);
    thumbDistalPivot.add(thumbTip);

    const thumbNail = new THREE.Mesh(
      new THREE.BoxGeometry(0.009, 0.002, 0.01),
      this.nailMat
    );
    thumbNail.position.set(0, 0.007, -0.022);
    thumbDistalPivot.add(thumbNail);

    if (side === 'right') this.rightThumbMesh = thumbProxMesh;
    else this.leftThumbMesh = thumbProxMesh;

    // 5. Los 4 dedos largos articulados (Índice, Medio, Anular, Meñique) con falanges proximales y distales
    const fingerSpecs = [
      { name: 'index', offsetX: -0.025, lenProx: 0.036, lenDist: 0.031, rad: 0.0088, spread: -0.04 },
      { name: 'middle', offsetX: -0.008, lenProx: 0.04, lenDist: 0.034, rad: 0.0092, spread: -0.01 },
      { name: 'ring', offsetX: 0.009, lenProx: 0.037, lenDist: 0.031, rad: 0.0086, spread: 0.025 },
      { name: 'pinky', offsetX: 0.025, lenProx: 0.03, lenDist: 0.025, rad: 0.0076, spread: 0.06 }
    ];

    const fingers: FingerJointChain[] = [];

    fingerSpecs.forEach((spec, idx) => {
      const knuckleX = sign * spec.offsetX;
      const knuckleZ = -0.086 + Math.abs(idx - 1) * 0.003;

      // Nudillo metacarpofalángico (MCP)
      const mcpSphere = new THREE.Mesh(
        new THREE.SphereGeometry(spec.rad * 1.15, 10, 10),
        this.skinOrGloveMat
      );
      mcpSphere.position.set(knuckleX, 0.009, knuckleZ);
      wristPivot.add(mcpSphere);

      const proximalPivot = new THREE.Group();
      proximalPivot.position.set(knuckleX, 0.009, knuckleZ);
      const baseX = -0.22 - idx * 0.04;
      const baseY = 0;
      const baseZ = sign * spec.spread;
      proximalPivot.rotation.set(baseX, baseY, baseZ);
      wristPivot.add(proximalPivot);

      const proxMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(spec.rad * 0.9, spec.rad * 1.05, spec.lenProx, 10),
        this.skinOrGloveMat
      );
      proxMesh.rotation.x = Math.PI / 2;
      proxMesh.position.set(0, 0, -spec.lenProx / 2);
      proximalPivot.add(proxMesh);

      // Articulación interfalángica proximal (PIP)
      const pipSphere = new THREE.Mesh(
        new THREE.SphereGeometry(spec.rad * 0.92, 10, 10),
        this.skinOrGloveMat
      );
      pipSphere.position.set(0, 0, -spec.lenProx);
      proximalPivot.add(pipSphere);

      const distalPivot = new THREE.Group();
      distalPivot.position.set(0, 0, -spec.lenProx);
      distalPivot.rotation.set(-0.24, 0, 0);
      proximalPivot.add(distalPivot);

      const distMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(spec.rad * 0.76, spec.rad * 0.88, spec.lenDist, 10),
        this.skinOrGloveMat
      );
      distMesh.rotation.x = Math.PI / 2;
      distMesh.position.set(0, 0, -spec.lenDist / 2);
      distalPivot.add(distMesh);

      const tipSphere = new THREE.Mesh(
        new THREE.SphereGeometry(spec.rad * 0.76, 10, 10),
        this.skinOrGloveMat
      );
      tipSphere.position.set(0, 0, -spec.lenDist);
      distalPivot.add(tipSphere);

      const nailMesh = new THREE.Mesh(
        new THREE.BoxGeometry(spec.rad * 1.2, 0.0018, 0.009),
        this.nailMat
      );
      nailMesh.position.set(0, spec.rad * 0.72, -spec.lenDist + 0.005);
      distalPivot.add(nailMesh);

      if (idx === 0) {
        if (side === 'right') this.rightIndexMesh = proxMesh;
        else this.leftIndexMesh = proxMesh;
      }

      fingers.push({
        proximalPivot,
        distalPivot,
        baseX,
        baseY,
        baseZ,
        spreadZ: sign * spec.spread
      });
    });

    const rig: ArticulatedArmRig = {
      root: arm,
      wristPivot,
      gripSocket,
      thumbProximalPivot,
      thumbDistalPivot,
      fingers
    };
    if (side === 'right') this.rightRig = rig;
    else this.leftRig = rig;

    return arm;
  }

  attach() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    this.domElement.addEventListener('contextmenu', this.onContextMenu);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);

    // Eventos táctiles para móviles / tablets
    this.domElement.addEventListener('touchstart', this.onTouchStart, { passive: false });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd);
  }

  detach() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);

    this.domElement.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);

    if (this.isPointerLocked) {
      document.exitPointerLock?.();
    }
  }

  /**
   * Dispara una animación física de agarre, liberación, vertido o manipulación sobre las manos 3D
   */
  triggerHandGesture(gesture: HandInteractionGesture, duration = 0.45) {
    this.activeGesture = gesture;
    this.gestureTimer = 0;
    this.gestureDuration = duration;
  }

  /**
   * Agarra un matraz 3D (HCl o NaOH) con la mano derecha en primera persona
   */
  grabFlask(flaskId: 'hcl' | 'naoh') {
    labSound.playInstrumentClick();
    labStore.selectReagent(flaskId);
    this.heldFlaskId = flaskId;
    this.isPouringHeldFlask = false;
    this.pourPulseTimer = 0;
    this.triggerHandGesture('GRAB_HOLD', 0.36);
  }

  /**
   * Suelta / deja el objeto sostenido devolviéndolo suavemente a su lugar en la mesa
   */
  releaseHeldObject() {
    if (!this.heldFlaskId) return;
    labSound.playInstrumentClick();
    this.heldFlaskId = null;
    this.isPouringHeldFlask = false;
    this.pourPulseTimer = 0;
    this.triggerHandGesture('RELEASE_PLACE', 0.38);
  }

  /**
   * Inclina la muñeca derecha y vierte el matraz sostenido en el reactor central
   */
  pourHeldFlask() {
    if (!this.heldFlaskId) return;
    this.isPouringHeldFlask = true;
    this.pourPulseTimer = 0.72;
    this.triggerHandGesture('POUR_LIQUID', 0.72);
  }

  /**
   * Devuelve la posición en el mundo 3D donde la mano derecha sostiene el objeto agarrado
   */
  getRightHandHoldWorldPosition(outWorldPos: THREE.Vector3): THREE.Vector3 {
    this.camera.updateMatrixWorld(true);
    this.rightRig.gripSocket.getWorldPosition(outWorldPos);
    // Proyectar ligeramente hacia adelante y ajustar altura sobre el nivel de la mesa
    outWorldPos.addScaledVector(this.tempTargetDir, 0.24);
    outWorldPos.y = Math.max(0.28, Math.min(1.48, outWorldPos.y - 0.16));
    return outWorldPos;
  }

  /** Radio del cuerpo del personaje usado para colisiones y para validar puntos de reaparición */
  static readonly SPAWN_RADIUS = 0.35;

  /**
   * Registra colisionadores derivados de la escena (mobiliario y objetos de suelo).
   * Sustituye los previamente registrados con prefijo `scene:` sin tocar los estáticos.
   */
  setSceneColliders(boxes: FirstPersonColliderBox[]) {
    const statics = this.colliders.filter((c) => !c.name.startsWith('scene:'));
    this.colliders = [
      ...statics,
      ...boxes.map((b) => ({ ...b, name: b.name.startsWith('scene:') ? b.name : `scene:${b.name}` }))
    ];
  }

  /** Indica si un círculo de radio `radius` en (x, z) está dentro del perímetro y libre de obstáculos */
  isPositionFree(x: number, z: number, radius = FirstPersonController.SPAWN_RADIUS): boolean {
    const bounds = this.colliders[0];
    if (
      x - radius < bounds.minX ||
      x + radius > bounds.maxX ||
      z - radius < bounds.minZ ||
      z + radius > bounds.maxZ
    ) {
      return false;
    }
    for (let i = 1; i < this.colliders.length; i++) {
      const b = this.colliders[i];
      if (x + radius > b.minX && x - radius < b.maxX && z + radius > b.minZ && z - radius < b.maxZ) {
        return false;
      }
    }
    return true;
  }

  /**
   * Devuelve el punto libre más cercano a (x, z). Primero intenta expulsar el cuerpo por la cara de
   * menor penetración de cada obstáculo; si sigue atrapado (p.ej. entre dos mesas), busca en anillos
   * concéntricos alrededor del punto original.
   */
  findNearestFreePosition(x: number, z: number, radius = FirstPersonController.SPAWN_RADIUS): { x: number; z: number } {
    if (this.isPositionFree(x, z, radius)) return { x, z };
    const margin = 0.02;
    let px = x;
    let pz = z;
    for (let iter = 0; iter < 8; iter++) {
      const bounds = this.colliders[0];
      px = Math.max(bounds.minX + radius + margin, Math.min(bounds.maxX - radius - margin, px));
      pz = Math.max(bounds.minZ + radius + margin, Math.min(bounds.maxZ - radius - margin, pz));
      let moved = false;
      for (let i = 1; i < this.colliders.length; i++) {
        const b = this.colliders[i];
        if (px + radius > b.minX && px - radius < b.maxX && pz + radius > b.minZ && pz - radius < b.maxZ) {
          const pushes = [
            { d: px + radius - b.minX, nx: b.minX - radius - margin, nz: pz },
            { d: b.maxX - (px - radius), nx: b.maxX + radius + margin, nz: pz },
            { d: pz + radius - b.minZ, nx: px, nz: b.minZ - radius - margin },
            { d: b.maxZ - (pz - radius), nx: px, nz: b.maxZ + radius + margin }
          ].sort((a, c) => a.d - c.d);
          px = pushes[0].nx;
          pz = pushes[0].nz;
          moved = true;
        }
      }
      if (!moved) break;
    }
    if (this.isPositionFree(px, pz, radius)) return { x: px, z: pz };

    for (let ring = 1; ring <= 30; ring++) {
      const r = ring * 0.15;
      const steps = 12 + ring * 4;
      for (let s = 0; s < steps; s++) {
        const a = (s / steps) * Math.PI * 2;
        const cx = x + Math.cos(a) * r;
        const cz = z + Math.sin(a) * r;
        if (this.isPositionFree(cx, cz, radius)) return { x: cx, z: cz };
      }
    }
    // Último recurso: pasillo frontal central del laboratorio (siempre libre)
    return { x: 0, z: 3.0 };
  }

  capturePreInspectPose() {
    // Si la posición previa ya está en una zona de pie segura frente a la mesa (Z >= 1.25), guardarla;
    // de lo contrario, fijar una posición de reposición segura frente al microscopio para evitar
    // reaparecer dentro de las mesas o en los huecos estrechos
    if (this.isPositionFree(this.position.x, this.position.z) && this.position.z >= 1.25) {
      this.savedPreInspectPos.copy(this.position);
      this.savedPreInspectYaw = this.yaw;
      this.savedPreInspectPitch = this.pitch;
    } else {
      this.savedPreInspectPos.set(-3.5, this.baseEyeHeight, 1.75);
      this.savedPreInspectYaw = 0;
      this.savedPreInspectPitch = -0.08;
    }
    this.hasSavedPreInspectPose = true;
    this.proximityTriggered = true;
  }

  enable(startPos?: THREE.Vector3) {
    this.enabled = true;
    let targetX = -3.5;
    let targetZ = 1.75;
    let targetYaw = 0;
    let targetPitch = -0.08;

    if (this.hasSavedPreInspectPose) {
      targetX = this.savedPreInspectPos.x;
      targetZ = this.savedPreInspectPos.z;
      targetYaw = this.savedPreInspectYaw;
      targetPitch = this.savedPreInspectPitch;
      this.hasSavedPreInspectPose = false;
    } else if (startPos) {
      targetX = startPos.x;
      targetZ = startPos.z;
      const toCenter = new THREE.Vector2(-targetX, -targetZ);
      targetYaw = Math.atan2(toCenter.x, -toCenter.y);
      targetPitch = -0.08;
    }

    // Si la posición de origen intentaba aparecer dentro o detrás de las mesas (Z < 1.25 en X: -5 a 5),
    // o al salir del microscopio con coordenadas de la platina/lente, recolocar en zona frontal segura frente al microscopio
    if (targetZ < 1.25 && targetX >= -5.0 && targetX <= 5.0) {
      targetX = -3.5;
      targetZ = 1.75;
      targetYaw = 0;
      targetPitch = -0.08;
    }

    // Comprobar y garantizar que el punto de aparición esté 100% libre de obstáculos
    const freeSpawn = this.findNearestFreePosition(targetX, targetZ);
    this.position.set(freeSpawn.x, this.baseEyeHeight, freeSpawn.z);
    this.yaw = targetYaw;
    this.pitch = targetPitch;
    this.targetYaw = this.yaw;
    this.targetPitch = this.pitch;
    this.velocity.set(0, 0, 0);
    this.camera.position.set(this.position.x, this.baseEyeHeight, this.position.z);
    this.tempTargetDir.set(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    this.tempLookTarget.copy(this.camera.position).add(this.tempTargetDir);
    this.camera.lookAt(this.tempLookTarget);
    this.camera.updateMatrixWorld(true);
    this.armsGroup.visible = true;
    this.hasMouseSample = false;
    if (this.domElement?.style) {
      this.domElement.style.cursor = 'none';
    }
    this.requestLock();
  }

  disable() {
    this.enabled = false;
    this.keys.forward = false;
    this.keys.backward = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.sprint = false;
    this.isDragging = false;
    this.hasMouseSample = false;
    this.touchMoveActive = false;
    this.touchLookActive = false;
    this.armsGroup.visible = false;
    this.focusedTarget = null;
    if (this.domElement?.style) {
      this.domElement.style.cursor = 'default';
    }

    if (this.isPointerLocked) {
      document.exitPointerLock?.();
    }
  }

  private isUiModalBlocking(): boolean {
    return labStore.isAnyModalBlockingFirstPerson;
  }

  requestLock() {
    if (!this.enabled || this.isPointerLocked || this.isUiModalBlocking()) return;
    try {
      this.domElement.requestPointerLock?.();
    } catch {
      // Navegador sin soporte o restringido por permisos
    }
  }

  exitLock() {
    if (typeof document !== 'undefined' && document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    this.isPointerLocked = false;
  }

  private onPointerLockChange() {
    this.isPointerLocked = document.pointerLockElement === this.domElement;
  }

  private onKeyDown(e: KeyboardEvent) {
    if (!this.enabled || this.isUiModalBlocking()) return;
    const key = e.code;
    if (key === 'KeyW' || key === 'ArrowUp') this.keys.forward = true;
    if (key === 'KeyS' || key === 'ArrowDown') this.keys.backward = true;
    if (key === 'KeyA' || key === 'ArrowLeft') this.keys.left = true;
    if (key === 'KeyD' || key === 'ArrowRight') this.keys.right = true;
    if (key === 'ShiftLeft' || key === 'ShiftRight') this.keys.sprint = true;

    // Tecla [Q] o [G]: Dejar / soltar el objeto actualmente agarrado en la mano
    if (key === 'KeyQ' || key === 'KeyG') {
      if (this.heldFlaskId) {
        this.releaseHeldObject();
        return;
      }
    }

    // Tecla [R]: Verter del matraz agarrado hacia el vaso central
    if (key === 'KeyR' && this.heldFlaskId) {
      this.pourHeldFlask();
      return;
    }

    // Tecla [F]: Entrar a la vista de estación de la mesa cercana
    if (key === 'KeyF') {
      if (this.heldFlaskId) this.releaseHeldObject();
      const nearby = this.getNearbyStation();
      if (nearby) labStore.enterStationFromWalk(nearby);
      return;
    }

    // Tecla de interacción rápida [E] con el objeto enfocado en el punto central
    if (key === 'KeyE') {
      if (this.focusedTarget) {
        this.focusedTarget.onInteract();
      } else if (this.heldFlaskId) {
        this.releaseHeldObject();
      } else {
        const nearby = this.getNearbyStation();
        if (nearby) labStore.enterStationFromWalk(nearby);
      }
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    if (!this.enabled) return;
    const key = e.code;
    if (key === 'KeyW' || key === 'ArrowUp') this.keys.forward = false;
    if (key === 'KeyS' || key === 'ArrowDown') this.keys.backward = false;
    if (key === 'KeyA' || key === 'ArrowLeft') this.keys.left = false;
    if (key === 'KeyD' || key === 'ArrowRight') this.keys.right = false;
    if (key === 'ShiftLeft' || key === 'ShiftRight') this.keys.sprint = false;
  }

  private onPointerDown(e: PointerEvent) {
    if (!this.enabled) return;
    if (this.isUiModalBlocking()) {
      this.exitLock();
      this.hasMouseSample = false;
      if (this.domElement?.style && this.domElement.style.cursor !== 'default') {
        this.domElement.style.cursor = 'default';
      }
      return;
    }

    // Clic derecho (button === 2): Dejar / soltar el objeto agarrado en la mesa
    if (e.button === 2) {
      if (this.heldFlaskId) {
        e.preventDefault();
        this.releaseHeldObject();
      }
      return;
    }

    if (e.button !== 0) return;

    // Si el navegador aún no activó Pointer Lock, engancharlo al primer clic
    if (!this.isPointerLocked) {
      this.requestLock();
    }

    // Si el punto central está alineado con una mesa u objeto interactivo, interactuar con las manos
    if (this.focusedTarget) {
      this.focusedTarget.onInteract();
      return;
    }

    // Si sostiene un matraz y hace clic apuntando al frente, verter o dejar
    if (this.heldFlaskId) {
      this.pourHeldFlask();
    }
  }

  private onContextMenu(e: MouseEvent) {
    if (this.enabled && !this.isUiModalBlocking() && this.heldFlaskId) {
      e.preventDefault();
    }
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.enabled) return;
    if (this.isUiModalBlocking()) {
      this.exitLock();
      this.hasMouseSample = false;
      if (this.domElement?.style && this.domElement.style.cursor !== 'default') {
        this.domElement.style.cursor = 'default';
      }
      return;
    }
    if (this.domElement?.style && this.domElement.style.cursor !== 'none') {
      this.domElement.style.cursor = 'none';
    }

    let deltaX = 0;
    let deltaY = 0;

    if (this.isPointerLocked) {
      deltaX = e.movementX || 0;
      deltaY = e.movementY || 0;
    } else {
      // Rotación continua estilo Minecraft sin necesidad de mantener presionado el clic
      if (!this.hasMouseSample) {
        this.prevMouseX = e.clientX;
        this.prevMouseY = e.clientY;
        this.hasMouseSample = true;
        return;
      }
      const movX = e.movementX;
      const movY = e.movementY;
      if (movX !== undefined && movY !== undefined && (movX !== 0 || movY !== 0)) {
        deltaX = movX;
        deltaY = movY;
      } else {
        deltaX = e.clientX - this.prevMouseX;
        deltaY = e.clientY - this.prevMouseY;
      }
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    }

    const sensitivity = (this.isPointerLocked ? 0.0024 : 0.0042) * this.mouseSensitivity;
    this.targetYaw -= deltaX * sensitivity;
    this.targetPitch -= (this.invertY ? -1 : 1) * deltaY * sensitivity;

    // Limitar cabeceo vertical entre -75° y +75°
    const maxPitch = Math.PI * 0.42;
    this.targetPitch = Math.max(-maxPitch, Math.min(maxPitch, this.targetPitch));

    // Inercia de brazos (Sway)
    this.armSwayX = THREE.MathUtils.clamp(this.armSwayX - deltaX * 0.0006, -0.05, 0.05);
    this.armSwayY = THREE.MathUtils.clamp(this.armSwayY - deltaY * 0.0006, -0.04, 0.04);
  }

  private onPointerUp() {
    this.isDragging = false;
  }

  // Soporte de toque móvil / tablet
  private onTouchStart(e: TouchEvent) {
    if (!this.enabled || this.isUiModalBlocking()) return;
    const width = window.innerWidth;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.clientX < width / 2) {
        // Lado izquierdo: Joystick virtual de movimiento
        this.touchMoveActive = true;
        this.touchMoveStart = { x: touch.clientX, y: touch.clientY };
        this.touchMoveCurrent = { x: touch.clientX, y: touch.clientY };
      } else {
        // Lado derecho: Rotación de cámara
        this.touchLookActive = true;
        this.touchLookPrev = { x: touch.clientX, y: touch.clientY };
      }
    }
  }

  private onTouchMove(e: TouchEvent) {
    if (!this.enabled || this.isUiModalBlocking()) return;
    const width = window.innerWidth;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.clientX < width / 2 && this.touchMoveActive) {
        this.touchMoveCurrent = { x: touch.clientX, y: touch.clientY };
        const dx = this.touchMoveCurrent.x - this.touchMoveStart.x;
        const dy = this.touchMoveCurrent.y - this.touchMoveStart.y;
        const maxDist = 48;
        const dist = Math.hypot(dx, dy);
        const norm = dist > 0 ? Math.min(dist, maxDist) / maxDist : 0;
        this.touchMoveVector.x = (dx / (dist || 1)) * norm;
        this.touchMoveVector.y = (dy / (dist || 1)) * norm;
      } else if (this.touchLookActive) {
        const dx = touch.clientX - this.touchLookPrev.x;
        const dy = touch.clientY - this.touchLookPrev.y;
        this.touchLookPrev = { x: touch.clientX, y: touch.clientY };
        this.targetYaw -= dx * 0.005;
        this.targetPitch -= dy * 0.005;
        const maxPitch = Math.PI * 0.42;
        this.targetPitch = Math.max(-maxPitch, Math.min(maxPitch, this.targetPitch));
      }
    }
  }

  private onTouchEnd() {
    this.touchMoveActive = false;
    this.touchMoveVector = { x: 0, y: 0 };
    this.touchLookActive = false;
  }

  /**
   * Actualiza el material de los brazos según el EPP equipado en tiempo real
   */
  updateArmMaterials(coatEquipped: boolean, glovesType: SafetyGlovesType) {
    // 1. Manga: Bata blanca o ropa casual
    if (coatEquipped) {
      this.sleeveMat.color.setHex(0xf8fafc); // Blanco algodón bata
      this.sleeveMat.roughness = 0.85;
      this.sleeveMat.metalness = 0.0;
    } else {
      this.sleeveMat.color.setHex(0x334155); // Azul pizarra casual
      this.sleeveMat.roughness = 0.8;
      this.sleeveMat.metalness = 0.05;
    }

    // 2. Piel o Guantes de Nitrilo/Látex
    if (glovesType === 'nitrile_blue') {
      this.skinOrGloveMat.color.setHex(0x2563eb); // Azul nitrilo vibrante
      this.skinOrGloveMat.roughness = 0.28;
      this.skinOrGloveMat.metalness = 0.15;
    } else if (glovesType === 'latex_white') {
      this.skinOrGloveMat.color.setHex(0xf1f5f9); // Blanco perla látex
      this.skinOrGloveMat.roughness = 0.32;
      this.skinOrGloveMat.metalness = 0.08;
    } else {
      this.skinOrGloveMat.color.setHex(0xd4a373); // Piel humana natural
      this.skinOrGloveMat.roughness = 0.55;
      this.skinOrGloveMat.metalness = 0.02;
    }
  }

  /**
   * Raycasting central continuo desde la retícula de 1ª persona (throttled a 20 Hz para baja latencia)
   */
  updateCrosshairRaycast(interactiveTargets: THREE.Object3D[]) {
    if (!this.enabled || this.isUiModalBlocking()) {
      this.focusedTarget = null;
      return;
    }

    const now = performance.now();
    if (now - this.lastRaycastMs < 33) return;
    this.lastRaycastMs = now;

    this.camera.updateMatrixWorld(true);
    this.centerRaycaster.setFromCamera(this.centerPointer, this.camera);
    this.centerRaycaster.far = 4.2; // Rango de enfoque del punto central (4.2m)

    const hits = this.centerRaycaster.intersectObjects(interactiveTargets, true);
    if (hits.length > 0) {
      const hit = hits[0];
      let curr: THREE.Object3D | null = hit.object;

      while (curr) {
        if (curr.userData?.safetyHit) {
          const s = curr.userData.safetyHit;
          let hint = 'Alineado · [E] o Clic para accionar';
          let icon = '🛡️';
          let onInteract = () => {};

          if (s.subItem === 'coat') {
            hint = labStore.safetyCoatEquipped ? '[E/Clic] Quitarse Bata' : '[E/Clic] Agarrar y Ponerse Bata';
            icon = '🥼';
            onInteract = () => {
              this.triggerHandGesture('TWO_HAND_EQUIP', 0.55);
              labStore.toggleSafetyCoat();
            };
          } else if (s.subItem === 'goggles') {
            hint = labStore.safetyGogglesEquipped ? '[E/Clic] Quitarse Gafas' : '[E/Clic] Agarrar y Ponerse Gafas EN 166';
            icon = '🥽';
            onInteract = () => {
              this.triggerHandGesture('TWO_HAND_EQUIP', 0.52);
              labStore.toggleSafetyGoggles();
            };
          } else if (s.subItem === 'nitrile_gloves') {
            hint = labStore.safetyGlovesType === 'nitrile_blue' ? '[E/Clic] Retirar Guantes' : '[E/Clic] Ponerse Guantes Nitrilo';
            icon = '🧤';
            onInteract = () => {
              this.triggerHandGesture('TWO_HAND_EQUIP', 0.55);
              labStore.setSafetyGloves(labStore.safetyGlovesType === 'nitrile_blue' ? 'none' : 'nitrile_blue');
            };
          } else if (s.subItem === 'latex_gloves') {
            hint = labStore.safetyGlovesType === 'latex_white' ? '[E/Clic] Retirar Guantes' : '[E/Clic] Ponerse Guantes Látex';
            icon = '🧤';
            onInteract = () => {
              this.triggerHandGesture('TWO_HAND_EQUIP', 0.55);
              labStore.setSafetyGloves(labStore.safetyGlovesType === 'latex_white' ? 'none' : 'latex_white');
            };
          } else if (s.type === 'emergency_shower') {
            hint = '[E/Clic] Agarrar y Tirar Palanca de Ducha';
            icon = '🚿';
            onInteract = () => {
              this.triggerHandGesture('PULL_LEVER', 0.6);
              labStore.triggerEmergencyShower();
            };
          } else if (s.type === 'eyewash') {
            hint = '[E/Clic] Presionar Válvula Lavaojos';
            icon = '👀';
            onInteract = () => {
              this.triggerHandGesture('PULL_LEVER', 0.55);
              labStore.triggerEmergencyEyewash();
            };
          } else if (s.type === 'fire_extinguisher') {
            hint = '[E/Clic] Sujetar y Accionar Extintor CO₂';
            icon = '🧯';
            onInteract = () => {
              this.triggerHandGesture('PULL_LEVER', 0.65);
              labStore.triggerFireExtinguisher();
            };
          }

          this.focusedTarget = {
            id: s.subItem || s.type,
            title: s.label,
            actionHint: hint,
            icon,
            distanceM: Number(hit.distance.toFixed(1)),
            onInteract
          };
          return;
        }

        if (curr.userData?.isHomeBook) {
          this.focusedTarget = {
            id: 'home_book',
            title: 'Manual de Experimentos STEAM (Prolongo & Pinto)',
            actionHint: '[E/Clic] Abrir Páginas del Libro con las Manos',
            icon: '📖',
            distanceM: Number(hit.distance.toFixed(1)),
            onInteract: () => {
              this.triggerHandGesture('TWO_HAND_EQUIP', 0.5);
              this.exitLock();
              this.hasMouseSample = false;
              if (this.domElement?.style) {
                this.domElement.style.cursor = 'default';
              }
              labStore.openHomeBook();
            }
          };
          return;
        }

        if (curr.userData?.cabinetComponentId) {
          const compId = curr.userData.cabinetComponentId as CabinetComponentInfo['id'];
          this.focusedTarget = {
            id: compId,
            title: 'Reactivo o Material de Estantería STEAM',
            actionHint: '[E/Clic] Tomar Reactivo del Estante',
            icon: '🗄️',
            distanceM: Number(hit.distance.toFixed(1)),
            onInteract: () => {
              this.triggerHandGesture('GRAB_AND_PLACE', 0.52);
              labSound.playInstrumentClick();
              labStore.setStation('steam');
              labStore.selectCabinetComponent(compId);
            }
          };
          return;
        }

        if (curr.userData?.microscopePart || curr.userData?.toolId === 'microscope') {
          this.focusedTarget = {
            id: 'microscope',
            title: 'Microscopio Óptico Compuesto Binocular DIN 160',
            actionHint: '[E/Clic] Sujetar y Mirar por el Ocular (1.2s)',
            icon: '🔬',
            distanceM: Number(hit.distance.toFixed(1)),
            onInteract: () => {
              if (this.heldFlaskId) this.releaseHeldObject();
              this.capturePreInspectPose();
              labStore.openMicroscope();
            }
          };
          return;
        }

        if (curr.userData?.specimenId) {
          const specId = curr.userData.specimenId as MicroscopeSpecimenId;
          this.focusedTarget = {
            id: `slide_${specId}`,
            title: 'Portaobjetos Biológico Calibrado',
            actionHint: '[E/Clic] Tomar Portaobjetos y Colocar en Platina',
            icon: '🧫',
            distanceM: Number(hit.distance.toFixed(1)),
            onInteract: () => {
              this.triggerHandGesture('GRAB_AND_PLACE', 0.52);
              labSound.playInstrumentClick();
              labStore.setStation('biologia');
              labStore.selectMicroscopeSpecimen(specId);
            }
          };
          return;
        }

        if (curr.userData?.toolId === 'immersion_oil') {
          this.focusedTarget = {
            id: 'immersion_oil',
            title: 'Frasco de Aceite de Inmersión (n = 1.515)',
            actionHint: '[E/Clic] Tomar Gotero y Aplicar Aceite 100x',
            icon: '💧',
            distanceM: Number(hit.distance.toFixed(1)),
            onInteract: () => {
              this.triggerHandGesture('SQUEEZE_DROPPER', 0.55);
              labSound.playInstrumentClick();
              labStore.setStation('biologia');
              labStore.applyMicroscopeImmersionOil();
            }
          };
          return;
        }

        if (curr.userData?.flaskId) {
          const fid = curr.userData.flaskId as 'hcl' | 'naoh';
          const reagentInfo = labStore.reagents.find((r) => r.reagentId === fid);
          const isCurrentlyHeld = this.heldFlaskId === fid;
          this.focusedTarget = {
            id: `flask_${fid}`,
            title: reagentInfo ? `${reagentInfo.name} (${reagentInfo.formula})` : `Matraz ${fid.toUpperCase()}`,
            actionHint: isCurrentlyHeld
              ? '[E/Clic] Verter en Vaso · [Q / Clic Der.] Dejar en Mesa'
              : this.heldFlaskId
                ? '[E/Clic] Cambiar a este Matraz · [Q] Soltar actual'
                : '[E/Clic] Agarrar Matraz con la Mano Derecha',
            icon: '🧪',
            distanceM: Number(hit.distance.toFixed(1)),
            onInteract: () => {
              if (this.heldFlaskId === fid) {
                this.pourHeldFlask();
              } else {
                this.grabFlask(fid);
              }
            }
          };
          return;
        }

        if (curr.userData?.toolId) {
          const tid = curr.userData.toolId as string;
          if (tid === 'burette') {
            this.focusedTarget = {
              id: 'burette',
              title: 'Bureta Volumétrica Graduada (50 mL)',
              actionHint: '[E/Clic] Girar Llave con los Dedos (+1.0 mL)',
              icon: '🧪',
              distanceM: Number(hit.distance.toFixed(1)),
              onInteract: () => {
                this.triggerHandGesture('PINCH_TURN', 0.48);
                labStore.doseFromBurette(1.0);
              }
            };
            return;
          }
          if (tid === 'dropper') {
            this.focusedTarget = {
              id: 'dropper',
              title: 'Frasco Gotero de Indicador Ácido-Base',
              actionHint: '[E/Clic] Apretar Bulbo del Gotero con la Mano',
              icon: '💧',
              distanceM: Number(hit.distance.toFixed(1)),
              onInteract: () => {
                this.triggerHandGesture('SQUEEZE_DROPPER', 0.5);
                labStore.squeezeIndicatorDropper();
              }
            };
            return;
          }
          if (tid === 'ph_strips') {
            this.focusedTarget = {
              id: 'ph_strips',
              title: 'Tiras Reactivas Colorimétricas de pH',
              actionHint: '[E/Clic] Agarrar Tira y Sumergir en el Vaso',
              icon: '📏',
              distanceM: Number(hit.distance.toFixed(1)),
              onInteract: () => {
                this.triggerHandGesture('DIP_STRIP', 0.62);
                labStore.dipPhPaperStrip();
              }
            };
            return;
          }
          if (tid === 'thermometer') {
            this.focusedTarget = {
              id: 'thermometer',
              title: 'Sonda Termométrica & Placa Calefactora',
              actionHint: '[E/Clic] Girar Perilla Térmica con la Mano',
              icon: '🌡️',
              distanceM: Number(hit.distance.toFixed(1)),
              onInteract: () => {
                this.triggerHandGesture('PINCH_TURN', 0.48);
                labStore.cycleTemperature();
              }
            };
            return;
          }
          if (tid === 'ph_meter') {
            this.focusedTarget = {
              id: 'ph_meter',
              title: 'pH-Metro Digital de Electrodo de Vidrio',
              actionHint: this.heldFlaskId
                ? '[E/Clic] Verter Matraz en el Reactor · [Q] Dejar Matraz'
                : '[E/Clic] Calibrar / Inspeccionar Lectura Digital',
              icon: '📟',
              distanceM: Number(hit.distance.toFixed(1)),
              onInteract: () => {
                if (this.heldFlaskId) {
                  this.pourHeldFlask();
                } else {
                  this.triggerHandGesture('PINCH_TURN', 0.45);
                  labSound.playInstrumentClick();
                }
              }
            };
            return;
          }
        }

        curr = curr.parent;
      }
    }

    // Si el punto central apunta directamente a la superficie de una de las 3 mesas de laboratorio
    if (this.centerRaycaster.ray.intersectPlane(this.tableSurfacePlane, this.tempPlaneHit)) {
      const dist = this.camera.position.distanceTo(this.tempPlaneHit);
      if (dist <= 3.8) {
        const px = this.tempPlaneHit.x;
        const pz = this.tempPlaneHit.z;
        if (px >= -4.95 && px <= -2.05 && pz >= -0.9 && pz <= 1.2) {
          if (Math.hypot(px - -3.5, pz - 0.15) < 0.58) {
            this.focusedTarget = {
              id: 'microscope',
              title: 'Microscopio Óptico Compuesto Binocular DIN 160',
              actionHint: '[E/Clic] Sujetar y Mirar por el Ocular (1.2s)',
              icon: '🔬',
              distanceM: Number(dist.toFixed(1)),
              onInteract: () => {
                if (this.heldFlaskId) this.releaseHeldObject();
                this.capturePreInspectPose();
                labStore.openMicroscope();
              }
            };
          } else {
            this.focusedTarget = {
              id: 'biology_table',
              title: 'Mesa de Biología & Microscopía Óptica',
              actionHint: this.heldFlaskId
                ? '[E/Clic] Dejar Matraz en la Mesa'
                : '[E/Clic] Trabajar en Estación de Biología',
              icon: '🔬',
              distanceM: Number(dist.toFixed(1)),
              onInteract: () => {
                if (this.heldFlaskId) {
                  this.releaseHeldObject();
                } else {
                  labStore.enterStationFromWalk('biologia');
                }
              }
            };
          }
          return;
        }
        if (px >= -1.75 && px <= 1.75 && pz >= -1.15 && pz <= 1.15) {
          // Si apunta cerca del centro de la mesa de química (0, 0) y sostiene un matraz, verter en el vaso; si apunta al borde, dejar el matraz
          const nearCentralBeaker = Math.hypot(px, pz) < 0.58;
          this.focusedTarget = {
            id: nearCentralBeaker ? 'central_beaker' : 'chemistry_table',
            title: nearCentralBeaker
              ? 'Reactor Central (Vaso de Precipitados 250 mL)'
              : 'Mesa Central de Química Analítica',
            actionHint: this.heldFlaskId
              ? nearCentralBeaker
                ? '[E/Clic] Inclinar Mano y Verter en el Vaso · [Q] Dejar'
                : '[E/Clic] Dejar Matraz sobre la Mesa · [R] Verter'
              : '[E/Clic] Trabajar en Mesa de Química',
            icon: '🧪',
            distanceM: Number(dist.toFixed(1)),
            onInteract: () => {
              if (this.heldFlaskId) {
                if (nearCentralBeaker) {
                  this.pourHeldFlask();
                } else {
                  this.releaseHeldObject();
                }
              } else {
                labStore.enterStationFromWalk('quimica');
              }
            }
          };
          return;
        }
        if (px >= 2.05 && px <= 4.95 && pz >= -0.9 && pz <= 1.2) {
          this.focusedTarget = {
            id: 'steam_table',
            title: 'Mesa de Ciencias Cotidianas & Fenómenos STEAM',
            actionHint: this.heldFlaskId
              ? '[E/Clic] Dejar Matraz en la Mesa'
              : '[E/Clic] Trabajar en Mesa STEAM',
            icon: '📚',
            distanceM: Number(dist.toFixed(1)),
            onInteract: () => {
              if (this.heldFlaskId) {
                this.releaseHeldObject();
              } else {
                labStore.enterStationFromWalk('steam');
              }
            }
          };
          return;
        }
      }
    }

    this.focusedTarget = null;
  }

  update(dt: number) {
    if (!this.enabled) return;

    // Al entrar al Manual 3D o cualquier modal, restaurar el cursor normal y congelar el movimiento de cámara estilo Minecraft
    if (this.isUiModalBlocking()) {
      if (this.isPointerLocked || (typeof document !== 'undefined' && document.pointerLockElement)) {
        this.exitLock();
      }
      if (this.domElement?.style && this.domElement.style.cursor !== 'default') {
        this.domElement.style.cursor = 'default';
      }
      this.hasMouseSample = false;
      this.keys.forward = false;
      this.keys.backward = false;
      this.keys.left = false;
      this.keys.right = false;
      this.keys.sprint = false;
      this.touchMoveActive = false;
      this.touchLookActive = false;
      this.targetYaw = this.yaw;
      this.targetPitch = this.pitch;
      this.velocity.set(0, 0, 0);
      this.focusedTarget = null;
      return;
    }

    // Suavizado de giro de cámara (Smoothing interpolativo)
    const smoothFactor = 1 - Math.exp(-dt * 26);
    this.yaw += (this.targetYaw - this.yaw) * smoothFactor;
    this.pitch += (this.targetPitch - this.pitch) * smoothFactor;

    // Dirección horizontal según el yaw (Zero-GC)
    this.tempForward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    this.tempRight.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    this.tempMoveDir.set(0, 0, 0);
    if (this.keys.forward) this.tempMoveDir.add(this.tempForward);
    if (this.keys.backward) this.tempMoveDir.sub(this.tempForward);
    if (this.keys.right) this.tempMoveDir.add(this.tempRight);
    if (this.keys.left) this.tempMoveDir.sub(this.tempRight);

    // Añadir vector táctil si está activo
    if (this.touchMoveActive) {
      this.tempMoveDir.addScaledVector(this.tempRight, this.touchMoveVector.x);
      this.tempMoveDir.addScaledVector(this.tempForward, -this.touchMoveVector.y);
    }

    const isMoving = this.tempMoveDir.lengthSq() > 0.001;
    if (isMoving) {
      this.tempMoveDir.normalize();
      const speed = this.keys.sprint ? this.sprintSpeed : this.walkSpeed;
      this.velocity.copy(this.tempMoveDir).multiplyScalar(speed);

      // Oscilación armónica de paso de caminata
      const stepRate = this.keys.sprint ? 12.5 : 8.5;
      this.headBobbingCycle += dt * stepRate;

      // Sonido de pisadas sincronizadas al impactar el talón (cada semiciclo de pi)
      const currentHalf = Math.floor(this.headBobbingCycle / Math.PI);
      if (currentHalf > this.lastFootstepHalf) {
        this.lastFootstepHalf = currentHalf;
        labSound.playFootstep(this.keys.sprint);
      }
    } else {
      this.velocity.multiplyScalar(Math.exp(-dt * 14));
      // Desvanecer el ciclo de paso hacia el neutro suavemente
      this.headBobbingCycle = 0;
    }

    // Deslizamiento físico por colisión (Wall Sliding Physics)
    this.tempDeltaMove.copy(this.velocity).multiplyScalar(dt);
    let allowedX = this.position.x + this.tempDeltaMove.x;
    let allowedZ = this.position.z + this.tempDeltaMove.z;

    const playerRadius = 0.35;
    const bounds = this.colliders[0];

    // Resolución de colisiones iterativa (3 pasadas) para esquinas, huecos y deslizamiento limpio
    for (let iter = 0; iter < 3; iter++) {
      let collided = false;
      for (let i = 1; i < this.colliders.length; i++) {
        const box = this.colliders[i];
        if (
          allowedX + playerRadius > box.minX &&
          allowedX - playerRadius < box.maxX &&
          allowedZ + playerRadius > box.minZ &&
          allowedZ - playerRadius < box.maxZ
        ) {
          collided = true;
          const penLeft = Math.abs(allowedX + playerRadius - box.minX);
          const penRight = Math.abs(box.maxX - (allowedX - playerRadius));
          const penBack = Math.abs(allowedZ + playerRadius - box.minZ);
          const penFront = Math.abs(box.maxZ - (allowedZ - playerRadius));

          const minPen = Math.min(penLeft, penRight, penBack, penFront);
          if (minPen === penLeft) allowedX = box.minX - playerRadius;
          else if (minPen === penRight) allowedX = box.maxX + playerRadius;
          else if (minPen === penBack) allowedZ = box.minZ - playerRadius;
          else allowedZ = box.maxZ + playerRadius;
        }
      }
      // Re-aplicar límites perimetrales del laboratorio tras cada ajuste
      allowedX = Math.max(bounds.minX + playerRadius, Math.min(bounds.maxX - playerRadius, allowedX));
      allowedZ = Math.max(bounds.minZ + playerRadius, Math.min(bounds.maxZ - playerRadius, allowedZ));
      if (!collided) break;
    }

    this.position.x = allowedX;
    this.position.z = allowedZ;

    // Trigger de Proximidad (< 0.60m del borde frontal del microscopio / < 1.55m del eje óptico)
    const distToMicroscopeFront = Math.min(
      Math.hypot(this.position.x - -3.5, this.position.z - 1.55),
      Math.hypot(this.position.x - -3.5, this.position.z - 1.77),
      Math.hypot(this.position.x - -4.3, this.position.z - 1.77)
    );
    const lookingTowardBioBench = Math.cos(this.yaw) > 0.2 || this.focusedTarget?.id === 'microscope';
    if (distToMicroscopeFront < 0.58 && lookingTowardBioBench) {
      if (!this.proximityTriggered) {
        this.capturePreInspectPose();
        labStore.openMicroscope();
        return;
      }
    } else if (distToMicroscopeFront > 0.82) {
      this.proximityTriggered = false;
    }

    // Cabeceo vertical de paso
    const bobOffset = isMoving ? Math.sin(this.headBobbingCycle) * 0.022 : 0;
    this.camera.position.set(this.position.x, this.baseEyeHeight + bobOffset, this.position.z);

    // Calcular vector de vista hacia donde mira el personaje
    this.tempTargetDir.set(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    this.tempLookTarget.copy(this.camera.position).add(this.tempTargetDir);
    this.camera.lookAt(this.tempLookTarget);

    // =========================================================================
    // ANIMACIÓN PROCEDIMENTAL Y CINEMÁTICA DE BRAZOS Y MANOS ARTICULADAS EN 1ª PERSONA
    // =========================================================================
    this.updateArmMaterials(labStore.safetyCoatEquipped, labStore.safetyGlovesType);

    // Temporizador de vertido activo en 1ª persona
    if (this.pourPulseTimer > 0) {
      this.pourPulseTimer = Math.max(0, this.pourPulseTimer - dt);
      if (this.pourPulseTimer <= 0) {
        this.isPouringHeldFlask = false;
      }
    }

    // Avanzar máquina de gestos de interacción física
    if (this.activeGesture !== 'NONE') {
      this.gestureTimer += dt;
      if (this.gestureTimer >= this.gestureDuration) {
        this.activeGesture = 'NONE';
        this.gestureTimer = 0;
      }
    }

    // Respiración en reposo + oscilación de brazos al caminar
    const nowSec = performance.now() * 0.001;
    const idleBreath = Math.sin(nowSec * 2.2) * 0.0035;
    const armBob = isMoving ? Math.sin(this.headBobbingCycle) * 0.025 : 0;
    const armSwing = isMoving ? Math.cos(this.headBobbingCycle) * 0.04 : 0;

    // Recuperación elástica del sway inercial de manos
    this.armSwayX *= Math.exp(-dt * 10);
    this.armSwayY *= Math.exp(-dt * 10);

    this.armsGroup.position.set(this.armSwayX, -0.21 + idleBreath + armBob + this.armSwayY, -0.37);

    // Calcular objetivos de alcance, curvatura de falanges (curl), pinza y giro de muñeca
    const hasHoverTarget = this.focusedTarget !== null && this.focusedTarget.distanceM <= 2.8;
    const gNorm =
      this.activeGesture !== 'NONE' && this.gestureDuration > 0
        ? Math.min(1, this.gestureTimer / this.gestureDuration)
        : 0;
    const gPulse = Math.sin(gNorm * Math.PI); // Curva suave 0 -> 1 -> 0

    let targetRightCurl = this.heldFlaskId ? 0.78 : hasHoverTarget ? 0.08 : 0.24;
    let targetLeftCurl = hasHoverTarget ? 0.14 : 0.24;
    let targetRightPinch = 0;
    let targetLeftPinch = 0;
    let targetRightReach = this.heldFlaskId ? 0.42 : hasHoverTarget ? 0.22 : 0;
    let targetLeftReach = hasHoverTarget ? 0.12 : 0;
    let targetRightTwist = 0;
    let targetLeftTwist = 0;
    let rightLiftY = this.heldFlaskId ? 0.045 : 0;
    let leftLiftY = 0;

    if (this.activeGesture === 'GRAB_HOLD') {
      // Extender el brazo hacia el objeto, abrir dedos en la primera mitad y cerrarlos firmemente alrededor del objeto
      targetRightReach = 0.42 + gPulse * 0.48;
      targetRightCurl = gNorm < 0.35 ? 0.04 : 0.82;
      rightLiftY = gPulse * 0.06;
    } else if (this.activeGesture === 'RELEASE_PLACE') {
      // Extender hacia la mesa y abrir ampliamente los 5 dedos para dejar el objeto
      targetRightReach = gPulse * 0.65;
      targetRightCurl = 0.02;
      targetRightTwist = -gPulse * 0.25;
      rightLiftY = -gPulse * 0.045;
    } else if (this.activeGesture === 'POUR_LIQUID' || this.isPouringHeldFlask) {
      // Elevar e inclinar la muñeca derecha (pronación) para verter el reactivo en el vaso central
      targetRightReach = 0.68;
      targetRightCurl = 0.84;
      targetRightTwist = 1.22;
      rightLiftY = 0.085;
    } else if (this.activeGesture === 'PINCH_TURN') {
      // Pinza de precisión entre pulgar e índice y rotación de muñeca (llave de bureta / perilla térmica)
      targetRightReach = gPulse * 0.62;
      targetRightPinch = gPulse * 0.92;
      targetRightCurl = 0.52;
      targetRightTwist = Math.sin(gNorm * Math.PI * 2) * 0.68;
      rightLiftY = gPulse * 0.05;
    } else if (this.activeGesture === 'SQUEEZE_DROPPER') {
      // Sujetar frasco gotero y apretar repetidamente el bulbo con pulgar e índice
      targetRightReach = gPulse * 0.58;
      targetRightPinch = 0.45 + Math.sin(gNorm * Math.PI * 3) * 0.45;
      targetRightCurl = 0.68;
      rightLiftY = gPulse * 0.055;
    } else if (this.activeGesture === 'DIP_STRIP') {
      // Tomar tira de pH en pinza fina, bajar la mano para sumergirla en el vaso y subirla
      targetRightReach = 0.55;
      targetRightPinch = 0.88;
      targetRightCurl = 0.6;
      rightLiftY = -Math.sin(gNorm * Math.PI) * 0.09;
    } else if (this.activeGesture === 'GRAB_AND_PLACE') {
      // Agarrar portaobjetos o reactivo de estantería y colocarlo en la mesa/platina
      targetRightReach = gPulse * 0.64;
      targetRightPinch = gPulse * 0.75;
      targetRightCurl = gNorm < 0.7 ? 0.65 : 0.08;
      rightLiftY = gPulse * 0.04;
    } else if (this.activeGesture === 'TWO_HAND_EQUIP') {
      // Ambas manos se extienden para agarrar el EPP o abrir el libro y lo traen hacia el cuerpo
      targetRightReach = gPulse * 0.55;
      targetLeftReach = gPulse * 0.55;
      targetRightCurl = gPulse * 0.72;
      targetLeftCurl = gPulse * 0.72;
      rightLiftY = gPulse * 0.05;
      leftLiftY = gPulse * 0.05;
    } else if (this.activeGesture === 'PULL_LEVER') {
      // Alcanzar palanca de emergencia / extintor, cerrar puño y tirar hacia abajo
      targetRightReach = gPulse * 0.62;
      targetLeftReach = gPulse * 0.35;
      targetRightCurl = 0.88;
      rightLiftY = Math.cos(gNorm * Math.PI) * 0.07;
    }

    const handSmooth = 1 - Math.exp(-dt * 18);
    this.rightHandCurl = THREE.MathUtils.lerp(this.rightHandCurl, targetRightCurl, handSmooth);
    this.leftHandCurl = THREE.MathUtils.lerp(this.leftHandCurl, targetLeftCurl, handSmooth);
    this.rightPinchAmount = THREE.MathUtils.lerp(this.rightPinchAmount, targetRightPinch, handSmooth);
    this.leftPinchAmount = THREE.MathUtils.lerp(this.leftPinchAmount, targetLeftPinch, handSmooth);
    this.rightReachProgress = THREE.MathUtils.lerp(this.rightReachProgress, targetRightReach, handSmooth);
    this.leftReachProgress = THREE.MathUtils.lerp(this.leftReachProgress, targetLeftReach, handSmooth);
    this.rightWristTwist = THREE.MathUtils.lerp(this.rightWristTwist, targetRightTwist, handSmooth);
    this.leftWristTwist = THREE.MathUtils.lerp(this.leftWristTwist, targetLeftTwist, handSmooth);

    // Posición y orientación cinemática de brazo izquierdo y derecho
    this.leftArmGroup.position.set(
      this.leftReachProgress * 0.045,
      armSwing * 0.35 + leftLiftY + this.leftReachProgress * 0.035,
      -this.leftReachProgress * 0.15
    );
    this.leftArmGroup.rotation.set(
      -armSwing * 0.65 + this.leftReachProgress * 0.22,
      -this.leftReachProgress * 0.14,
      0
    );

    this.rightArmGroup.position.set(
      -this.rightReachProgress * 0.055,
      -armSwing * 0.35 + rightLiftY + this.rightReachProgress * 0.04,
      -this.rightReachProgress * 0.17
    );
    this.rightArmGroup.rotation.set(
      armSwing * 0.65 + this.rightReachProgress * 0.24,
      this.rightReachProgress * 0.16,
      0
    );

    // Aplicar articulación falángica a ambas manos
    this.applyHandSkeletonPose(
      this.rightRig,
      'right',
      this.rightHandCurl,
      this.rightPinchAmount,
      this.rightWristTwist,
      nowSec
    );
    this.applyHandSkeletonPose(
      this.leftRig,
      'left',
      this.leftHandCurl,
      this.leftPinchAmount,
      this.leftWristTwist,
      nowSec + 1.4
    );
  }

  /**
   * Articula muñeca, pulgar (2 falanges) y los 4 dedos (falanges proximales y distales) en tiempo real
   */
  private applyHandSkeletonPose(
    rig: ArticulatedArmRig,
    side: 'left' | 'right',
    curl: number,
    pinch: number,
    wristTwist: number,
    timeSec: number
  ) {
    const sign = side === 'left' ? -1 : 1;

    // 1. Muñeca: rotación orgánica y pronación/supinación al verter o girar válvulas
    rig.wristPivot.rotation.set(
      -0.14 + curl * 0.12 - Math.abs(wristTwist) * 0.15,
      sign * 0.12 - sign * pinch * 0.1,
      sign * 0.1 - sign * wristTwist
    );

    // 2. Pulgar: oposición hacia el índice (pinch) o cierre cilíndrico (curl)
    const thumbOppose = Math.max(curl * 0.65, pinch * 0.95);
    rig.thumbProximalPivot.rotation.set(
      0.32 + thumbOppose * 0.48,
      -sign * (0.42 + thumbOppose * 0.36),
      -sign * (0.58 - thumbOppose * 0.32)
    );
    rig.thumbDistalPivot.rotation.set(0.18 + thumbOppose * 0.62, 0, 0);

    // 3. Los 4 dedos: flexión de falanges proximales (MCP) y distales (PIP/DIP) + apertura al soltar
    for (let i = 0; i < rig.fingers.length; i++) {
      const f = rig.fingers[i];
      const microIdle = Math.sin(timeSec * 2.1 + i * 0.7) * 0.025;
      // Si hay pinza activa, el índice (i === 0) se curva hacia el pulgar mientras los demás acompañan suavemente
      const fingerCurl =
        i === 0 ? Math.max(curl, pinch * 0.85) : curl * (0.92 + i * 0.04);
      // Cuando curl es muy bajo (< 0.12, ej. al alcanzar o soltar/dejar un objeto), los dedos se separan (spread)
      const openSpreadFactor = curl < 0.15 ? 1.45 : 1.0 - fingerCurl * 0.45;

      f.proximalPivot.rotation.set(
        f.baseX - fingerCurl * 1.18 + microIdle,
        f.baseY,
        f.spreadZ * openSpreadFactor
      );
      f.distalPivot.rotation.set(-0.22 - fingerCurl * 1.25, 0, 0);
    }
  }

  /**
   * Fase 2: Oculta el cuerpo/brazos del avatar durante INSPECTING_MICROSCOPE
   * para despejar la lente del ocular y el HUD de inspección científica.
   */
  setAvatarBodyVisible(visible: boolean) {
    this.armsGroup.visible = visible && this.enabled;
  }

  updateMicroscopeHands(
    alpha: number,
    _knobAngleRad: number,
    _stageXNorm: number,
    _stageYNorm: number
  ) {
    // Al entrar en transición / inspección del ocular (alpha > 0.05), se oculta el cuerpo del avatar
    if (alpha > 0.05) {
      this.armsGroup.visible = false;
      return;
    }
    this.armsGroup.visible = this.enabled;
  }

  /**
   * Detecta si el jugador está a corta distancia de alguna de las 3 estaciones
   */
  getNearbyStation(): LabStationId | null {
    if (Math.abs(this.position.z - 1.8) > 1.25) return null;
    if (Math.abs(this.position.x - 0) < 1.8) return 'quimica';
    if (this.position.x <= -2.2 && this.position.x >= -6.0) return 'biologia';
    if (this.position.x >= 2.2 && this.position.x <= 6.0) return 'steam';

    return null;
  }
}
