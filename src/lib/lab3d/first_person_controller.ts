import * as THREE from 'three';
import { labSound } from '$lib/audio/lab_sound';
import { labStore, type SafetyGlovesType, type LabStationId } from '$lib/interaction/lab_store.svelte';

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

  // Estado de Pointer Lock
  isPointerLocked = false;
  private isDragging = false;
  private prevMouseX = 0;
  private prevMouseY = 0;

  // Retícula y objeto enfocado en el punto de mira central
  focusedTarget: FocusedTargetInfo | null = null;
  private centerRaycaster = new THREE.Raycaster();
  private centerPointer = new THREE.Vector2(0, 0);

  // Brazos y manos articuladas en 1ª persona
  armsGroup: THREE.Group;
  private leftArmGroup: THREE.Group;
  private rightArmGroup: THREE.Group;
  private sleeveMat: THREE.MeshStandardMaterial;
  private skinOrGloveMat: THREE.MeshStandardMaterial;

  // Sway inercial de manos al girar la cámara
  private armSwayX = 0;
  private armSwayY = 0;

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

  // Cajas de colisión AABB para impedir atravesar mesas y muros
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

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, scene?: THREE.Scene) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;

    // Inicializar materiales de brazos
    this.sleeveMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.85
    });
    this.skinOrGloveMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373,
      roughness: 0.55
    });

    // Construir el rig de brazos en primera persona
    this.armsGroup = new THREE.Group();
    this.armsGroup.name = 'FirstPersonArmsRig';
    this.leftArmGroup = this.buildArmMesh('left');
    this.rightArmGroup = this.buildArmMesh('right');
    this.armsGroup.add(this.leftArmGroup);
    this.armsGroup.add(this.rightArmGroup);

    this.armsGroup.position.set(0, -0.27, -0.42);
    this.camera.add(this.armsGroup);
    this.armsGroup.visible = false;

    // Binds de eventos
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onPointerLockChange = this.onPointerLockChange.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
  }

  /**
   * Construye un brazo y mano procedural anatómica en 1ª persona
   */
  private buildArmMesh(side: 'left' | 'right'): THREE.Group {
    const arm = new THREE.Group();
    const sign = side === 'left' ? -1 : 1;

    // 1. Antebrazo / Manga (cilindro suavemente cónico)
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.054, 0.28, 16), this.sleeveMat);
    sleeve.rotation.x = Math.PI / 2.6;
    sleeve.rotation.z = sign * 0.18;
    sleeve.position.set(sign * 0.21, -0.06, 0.08);
    arm.add(sleeve);

    // 2. Muñeca con doble pliegue
    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.05, 14), this.skinOrGloveMat);
    wrist.rotation.x = Math.PI / 2.6;
    wrist.position.set(sign * 0.175, 0.03, -0.05);
    arm.add(wrist);

    // 3. Palma de la mano
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.024, 0.075), this.skinOrGloveMat);
    palm.rotation.x = -0.15;
    palm.rotation.y = sign * 0.1;
    palm.rotation.z = sign * 0.12;
    palm.position.set(sign * 0.165, 0.045, -0.1);
    arm.add(palm);

    // 4. Pulgar articulado orientado hacia el centro
    const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.042, 10), this.skinOrGloveMat);
    thumb.rotation.z = -sign * 0.75;
    thumb.rotation.x = 0.4;
    thumb.position.set(sign * 0.125, 0.048, -0.09);
    arm.add(thumb);

    // 5. Dedos relajados en postura natural
    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.045, 8), this.skinOrGloveMat);
      finger.rotation.x = Math.PI / 2.1;
      finger.position.set(sign * (0.145 + f * 0.014), 0.042, -0.145);
      arm.add(finger);
    }

    return arm;
  }

  attach() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
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
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);

    this.domElement.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);

    if (this.isPointerLocked) {
      document.exitPointerLock?.();
    }
  }

  enable(startPos?: THREE.Vector3) {
    this.enabled = true;
    if (startPos) {
      this.position.set(startPos.x, this.baseEyeHeight, startPos.z);
    }
    const toCenter = new THREE.Vector2(-this.position.x, -this.position.z);
    this.yaw = Math.atan2(toCenter.x, -toCenter.y);
    this.pitch = -0.08;
    this.targetYaw = this.yaw;
    this.targetPitch = this.pitch;
    this.velocity.set(0, 0, 0);
    this.camera.position.set(this.position.x, this.baseEyeHeight, this.position.z);
    this.camera.updateMatrixWorld(true);
    this.armsGroup.visible = true;
  }

  disable() {
    this.enabled = false;
    this.keys.forward = false;
    this.keys.backward = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.sprint = false;
    this.isDragging = false;
    this.touchMoveActive = false;
    this.touchLookActive = false;
    this.armsGroup.visible = false;
    this.focusedTarget = null;

    if (this.isPointerLocked) {
      document.exitPointerLock?.();
    }
  }

  requestLock() {
    if (!this.enabled || this.isPointerLocked) return;
    try {
      this.domElement.requestPointerLock?.();
    } catch {
      // Navegador sin soporte o restringido por permisos
    }
  }

  exitLock() {
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }

  private onPointerLockChange() {
    this.isPointerLocked = document.pointerLockElement === this.domElement;
  }

  private onKeyDown(e: KeyboardEvent) {
    if (!this.enabled) return;
    const key = e.code;
    if (key === 'KeyW' || key === 'ArrowUp') this.keys.forward = true;
    if (key === 'KeyS' || key === 'ArrowDown') this.keys.backward = true;
    if (key === 'KeyA' || key === 'ArrowLeft') this.keys.left = true;
    if (key === 'KeyD' || key === 'ArrowRight') this.keys.right = true;
    if (key === 'ShiftLeft' || key === 'ShiftRight') this.keys.sprint = true;

    // Tecla de interacción rápida [E] con el objeto enfocado en la retícula
    if (key === 'KeyE') {
      if (this.focusedTarget) {
        this.focusedTarget.onInteract();
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
    if (!this.enabled || e.button !== 0) return;

    // Si tenemos un objeto interactivo enfocado con la retícula central, activar interacción con clic
    if (this.focusedTarget) {
      this.focusedTarget.onInteract();
      return;
    }

    if (!this.isPointerLocked) {
      this.isDragging = true;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    }
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.enabled) return;

    let deltaX = 0;
    let deltaY = 0;

    if (this.isPointerLocked) {
      deltaX = e.movementX || 0;
      deltaY = e.movementY || 0;
    } else if (this.isDragging) {
      deltaX = e.clientX - this.prevMouseX;
      deltaY = e.clientY - this.prevMouseY;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    } else {
      return;
    }

    const sensitivity = this.isPointerLocked ? 0.0022 : 0.0035;
    this.targetYaw -= deltaX * sensitivity;
    this.targetPitch -= deltaY * sensitivity;

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
    if (!this.enabled) return;
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
    if (!this.enabled) return;
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
   * Raycasting central continuo desde la retícula de 1ª persona
   */
  updateCrosshairRaycast(interactiveTargets: THREE.Object3D[]) {
    if (!this.enabled) {
      this.focusedTarget = null;
      return;
    }

    this.camera.updateMatrixWorld(true);
    this.centerRaycaster.setFromCamera(this.centerPointer, this.camera);
    this.centerRaycaster.far = 2.65; // Rango de alcance de brazo (2.65m)

    const hits = this.centerRaycaster.intersectObjects(interactiveTargets, true);
    if (hits.length === 0) {
      this.focusedTarget = null;
      return;
    }

    const hit = hits[0];
    let curr: THREE.Object3D | null = hit.object;

    while (curr) {
      if (curr.userData?.safetyHit) {
        const s = curr.userData.safetyHit;
        let hint = 'Presiona [E] o Clic para accionar';
        let icon = '🛡️';
        let onInteract = () => {};

        if (s.subItem === 'coat') {
          hint = labStore.safetyCoatEquipped ? '[E] Quitarse Bata' : '[E] Ponerse Bata Blanca';
          icon = '🥼';
          onInteract = () => labStore.toggleSafetyCoat();
        } else if (s.subItem === 'goggles') {
          hint = labStore.safetyGogglesEquipped ? '[E] Quitarse Gafas' : '[E] Equipar Gafas EN 166';
          icon = '🥽';
          onInteract = () => labStore.toggleSafetyGoggles();
        } else if (s.subItem === 'nitrile_gloves') {
          hint = labStore.safetyGlovesType === 'nitrile_blue' ? '[E] Retirar Guantes' : '[E] Equipar Guantes Nitrilo';
          icon = '🧤';
          onInteract = () =>
            labStore.setSafetyGloves(labStore.safetyGlovesType === 'nitrile_blue' ? 'none' : 'nitrile_blue');
        } else if (s.subItem === 'latex_gloves') {
          hint = labStore.safetyGlovesType === 'latex_white' ? '[E] Retirar Guantes' : '[E] Equipar Guantes Látex';
          icon = '🧤';
          onInteract = () =>
            labStore.setSafetyGloves(labStore.safetyGlovesType === 'latex_white' ? 'none' : 'latex_white');
        } else if (s.type === 'emergency_shower') {
          hint = '[E] Tirar Ducha de Descontaminación';
          icon = '🚿';
          onInteract = () => labStore.triggerEmergencyShower();
        } else if (s.type === 'eyewash') {
          hint = '[E] Accionar Palanca Lavaojos';
          icon = '👀';
          onInteract = () => labStore.triggerEmergencyEyewash();
        } else if (s.type === 'fire_extinguisher') {
          hint = '[E] Inspeccionar Extintor CO₂ (PASS)';
          icon = '🧯';
          onInteract = () => labStore.triggerFireExtinguisher();
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
          actionHint: '[E] Abrir Libro de Fenómenos Cotidianos',
          icon: '📖',
          distanceM: Number(hit.distance.toFixed(1)),
          onInteract: () => labStore.enterStationFromWalk('steam')
        };
        return;
      }

      if (curr.userData?.cabinetComponentId) {
        this.focusedTarget = {
          id: curr.userData.cabinetComponentId,
          title: 'Reactivo o Material STEAM',
          actionHint: '[E] Inspeccionar Casilla del Mueble',
          icon: '🗄️',
          distanceM: Number(hit.distance.toFixed(1)),
          onInteract: () => labStore.enterStationFromWalk('steam')
        };
        return;
      }

      if (curr.userData?.microscopePart || curr.userData?.toolId === 'microscope') {
        this.focusedTarget = {
          id: 'microscope',
          title: 'Microscopio Óptico Compuesto Binocular DIN 160',
          actionHint: '[E] Iniciar Observación Microscópica',
          icon: '🔬',
          distanceM: Number(hit.distance.toFixed(1)),
          onInteract: () => {
            labStore.enterStationFromWalk('biologia');
            labStore.openMicroscope();
          }
        };
        return;
      }

      if (curr.userData?.flaskId || curr.userData?.toolId === 'burette' || curr.userData?.toolId === 'ph_meter') {
        this.focusedTarget = {
          id: 'chemistry_table',
          title: 'Mesa de Química Analítica & Neutralización',
          actionHint: '[E] Trabajar con Reactor y Bureta',
          icon: '🧪',
          distanceM: Number(hit.distance.toFixed(1)),
          onInteract: () => labStore.enterStationFromWalk('quimica')
        };
        return;
      }

      curr = curr.parent;
    }

    this.focusedTarget = null;
  }

  update(dt: number) {
    if (!this.enabled) return;

    // Suavizado de giro de cámara (Smoothing interpolativo)
    const smoothFactor = 1 - Math.exp(-dt * 26);
    this.yaw += (this.targetYaw - this.yaw) * smoothFactor;
    this.pitch += (this.targetPitch - this.pitch) * smoothFactor;

    // Dirección horizontal según el yaw
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    const moveDir = new THREE.Vector3(0, 0, 0);
    if (this.keys.forward) moveDir.add(forward);
    if (this.keys.backward) moveDir.sub(forward);
    if (this.keys.right) moveDir.add(right);
    if (this.keys.left) moveDir.sub(right);

    // Añadir vector táctil si está activo
    if (this.touchMoveActive) {
      moveDir.add(right.clone().multiplyScalar(this.touchMoveVector.x));
      moveDir.sub(forward.clone().multiplyScalar(this.touchMoveVector.y));
    }

    const isMoving = moveDir.lengthSq() > 0.001;
    if (isMoving) {
      moveDir.normalize();
      const speed = this.keys.sprint ? this.sprintSpeed : this.walkSpeed;
      this.velocity.copy(moveDir).multiplyScalar(speed);

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
    const deltaMove = this.velocity.clone().multiplyScalar(dt);
    let allowedX = this.position.x + deltaMove.x;
    let allowedZ = this.position.z + deltaMove.z;

    const playerRadius = 0.35;

    // 1. Muros perimetrales
    const bounds = this.colliders[0];
    allowedX = Math.max(bounds.minX + playerRadius, Math.min(bounds.maxX - playerRadius, allowedX));
    allowedZ = Math.max(bounds.minZ + playerRadius, Math.min(bounds.maxZ - playerRadius, allowedZ));

    // 2. Colisión suave contra mesas con deslizamiento tangencial
    for (let i = 1; i < this.colliders.length; i++) {
      const box = this.colliders[i];
      if (
        allowedX + playerRadius > box.minX &&
        allowedX - playerRadius < box.maxX &&
        allowedZ + playerRadius > box.minZ &&
        allowedZ - playerRadius < box.maxZ
      ) {
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

    // Cabeceo vertical de paso
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

    // =========================================================================
    // ANIMACIÓN PROCEDIMENTAL DE BRAZOS Y MANOS EN 1ª PERSONA
    // =========================================================================
    this.updateArmMaterials(labStore.safetyCoatEquipped, labStore.safetyGlovesType);

    // Respiración en reposo + oscilación de brazos al caminar
    const nowSec = performance.now() * 0.001;
    const idleBreath = Math.sin(nowSec * 2.2) * 0.003;
    const armBob = isMoving ? Math.sin(this.headBobbingCycle) * 0.028 : 0;
    const armSwing = isMoving ? Math.cos(this.headBobbingCycle) * 0.045 : 0;

    // Recuperación elástica del sway inercial de manos
    this.armSwayX *= Math.exp(-dt * 10);
    this.armSwayY *= Math.exp(-dt * 10);

    this.armsGroup.position.set(this.armSwayX, -0.27 + idleBreath + armBob + this.armSwayY, -0.42);

    // Oscilación opuesta y natural entre brazo izquierdo y derecho
    this.leftArmGroup.position.y = armSwing * 0.4;
    this.leftArmGroup.rotation.x = -armSwing * 0.8;
    this.rightArmGroup.position.y = -armSwing * 0.4;
    this.rightArmGroup.rotation.x = armSwing * 0.8;
  }

  /**
   * Detecta si el jugador está a corta distancia de alguna de las 3 estaciones
   */
  getNearbyStation(): LabStationId | null {
    const distChem = Math.hypot(this.position.x - 0, this.position.z - 1.6);
    if (distChem < 1.45) return 'quimica';

    const distBio = Math.hypot(this.position.x - -3.5, this.position.z - 1.6);
    if (distBio < 1.45) return 'biologia';

    const distSteam = Math.hypot(this.position.x - 3.5, this.position.z - 1.6);
    if (distSteam < 1.45) return 'steam';

    return null;
  }
}
