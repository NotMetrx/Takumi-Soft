import * as THREE from 'three';

export interface FirstPersonColliderBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  name: string;
}

export class FirstPersonController {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;

  enabled = false;
  position = new THREE.Vector3(0, 1.68, 3.2); // Altura de ojos de pie (1.68m)
  velocity = new THREE.Vector3(0, 0, 0);

  yaw = 0; // Rotación horizontal (radianes)
  pitch = 0; // Rotación vertical (radianes)

  walkSpeed = 2.4; // m/s
  sprintSpeed = 3.8; // m/s
  headBobbingCycle = 0;
  baseEyeHeight = 1.68;

  private keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false
  };

  private isDragging = false;
  private prevMouseX = 0;
  private prevMouseY = 0;

  // Cajas de colisión AABB para impedir atravesar mesas y paredes del laboratorio
  colliders: FirstPersonColliderBox[] = [
    // Perímetro del Laboratorio (Muros)
    { minX: -7.2, maxX: 7.2, minZ: -0.7, maxZ: 5.5, name: 'bounds' },
    // Mesa Central Química
    { minX: -1.75, maxX: 1.75, minZ: -1.15, maxZ: 1.15, name: 'chem_table' },
    // Mesa Biología
    { minX: -4.95, maxX: -2.05, minZ: -0.9, maxZ: 1.2, name: 'bio_table' },
    // Mesa STEAM
    { minX: 2.05, maxX: 4.95, minZ: -0.9, maxZ: 1.2, name: 'steam_table' },
    // Estación de Bioseguridad y Vestidor EPP
    { minX: -6.2, maxX: -5.1, minZ: 1.5, maxZ: 2.5, name: 'ppe_station' }
  ];

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
  }

  attach() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  detach() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
  }

  enable(startPos?: THREE.Vector3) {
    this.enabled = true;
    if (startPos) {
      this.position.set(startPos.x, this.baseEyeHeight, startPos.z);
    }
    // Orientar hacia el centro del laboratorio (mesa química)
    const toCenter = new THREE.Vector2(-this.position.x, -this.position.z);
    this.yaw = Math.atan2(toCenter.x, -toCenter.y);
    this.pitch = -0.12;
    this.velocity.set(0, 0, 0);
  }

  disable() {
    this.enabled = false;
    this.keys.forward = false;
    this.keys.backward = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.sprint = false;
    this.isDragging = false;
  }

  private onKeyDown(e: KeyboardEvent) {
    if (!this.enabled) return;
    const key = e.code;
    if (key === 'KeyW' || key === 'ArrowUp') this.keys.forward = true;
    if (key === 'KeyS' || key === 'ArrowDown') this.keys.backward = true;
    if (key === 'KeyA' || key === 'ArrowLeft') this.keys.left = true;
    if (key === 'KeyD' || key === 'ArrowRight') this.keys.right = true;
    if (key === 'ShiftLeft' || key === 'ShiftRight') this.keys.sprint = true;
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
    if (!this.enabled || e.button !== 0) return;
    this.isDragging = true;
    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.enabled || !this.isDragging) return;
    const dx = e.clientX - this.prevMouseX;
    const dy = e.clientY - this.prevMouseY;
    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;

    const sensitivity = 0.0035;
    this.yaw -= dx * sensitivity;
    this.pitch -= dy * sensitivity;

    // Limitar cabeceo vertical entre -70° y +70°
    const maxPitch = Math.PI * 0.42;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  }

  private onPointerUp() {
    this.isDragging = false;
  }

  update(dt: number) {
    if (!this.enabled) return;

    // Vector de dirección horizontal según el yaw
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    const moveDir = new THREE.Vector3(0, 0, 0);
    if (this.keys.forward) moveDir.add(forward);
    if (this.keys.backward) moveDir.sub(forward);
    if (this.keys.right) moveDir.add(right);
    if (this.keys.left) moveDir.sub(right);

    const isMoving = moveDir.lengthSq() > 0.001;
    if (isMoving) {
      moveDir.normalize();
      const speed = this.keys.sprint ? this.sprintSpeed : this.walkSpeed;
      this.velocity.copy(moveDir).multiplyScalar(speed);

      // Oscilación armónica de paso de caminata (Head bobbing realista)
      this.headBobbingCycle += dt * (this.keys.sprint ? 12 : 8.5);
    } else {
      // Fricción exponencial para frenado orgánico
      this.velocity.multiplyScalar(Math.exp(-dt * 14));
      this.headBobbingCycle = 0;
    }

    // Nueva posición potencial
    const deltaMove = this.velocity.clone().multiplyScalar(dt);
    const nextX = this.position.x + deltaMove.x;
    const nextZ = this.position.z + deltaMove.z;

    // Comprobación de colisiones AABB contra obstáculos y muros
    const playerRadius = 0.35;
    let allowedX = nextX;
    let allowedZ = nextZ;

    // 1. Limitar dentro de los muros perimetrales
    const bounds = this.colliders[0];
    allowedX = Math.max(bounds.minX + playerRadius, Math.min(bounds.maxX - playerRadius, allowedX));
    allowedZ = Math.max(bounds.minZ + playerRadius, Math.min(bounds.maxZ - playerRadius, allowedZ));

    // 2. Colisión contra las 3 mesas y vestidor
    for (let i = 1; i < this.colliders.length; i++) {
      const box = this.colliders[i];
      if (
        allowedX + playerRadius > box.minX &&
        allowedX - playerRadius < box.maxX &&
        allowedZ + playerRadius > box.minZ &&
        allowedZ - playerRadius < box.maxZ
      ) {
        // Separación suave por el eje con menor penetración
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

    this.position.x = allowedX;
    this.position.z = allowedZ;

    // Aplicar cabeceo de paso
    const bobOffset = isMoving ? Math.sin(this.headBobbingCycle) * 0.022 : 0;
    this.camera.position.set(this.position.x, this.baseEyeHeight + bobOffset, this.position.z);

    // Calcular vector de vista hacia donde mira el personaje
    const targetDirection = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    const lookTarget = this.camera.position.clone().add(targetDirection);
    this.camera.lookAt(lookTarget);
  }

  /**
   * Detecta si el jugador está a corta distancia de alguna de las 3 estaciones
   */
  getNearbyStation(): 'quimica' | 'biologia' | 'steam' | null {
    const distChem = Math.hypot(this.position.x - 0, this.position.z - 1.6);
    if (distChem < 1.45) return 'quimica';

    const distBio = Math.hypot(this.position.x - (-3.5), this.position.z - 1.6);
    if (distBio < 1.45) return 'biologia';

    const distSteam = Math.hypot(this.position.x - 3.5, this.position.z - 1.6);
    if (distSteam < 1.45) return 'steam';

    return null;
  }
}
