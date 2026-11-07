import * as THREE from 'three';
import { multiplayerStore, type PeerAvatarState } from '$lib/multiplayer/multiplayer_store.svelte';

interface Avatar3DMeshRig {
  id: string;
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  headMesh: THREE.Mesh;
  gogglesMesh: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  tagMesh: THREE.Mesh;
  tagCanvas: HTMLCanvasElement;
  tagCtx: CanvasRenderingContext2D;
  tagTex: THREE.CanvasTexture;
  leftGloveMat: THREE.MeshStandardMaterial;
  rightGloveMat: THREE.MeshStandardMaterial;
  coatMat: THREE.MeshStandardMaterial;
  lastState: PeerAvatarState;
}

export class MultiplayerAvatarsRig {
  group: THREE.Group;
  private avatarRigs: Map<string, Avatar3DMeshRig> = new Map();

  // Materiales compartidos para bajo consumo VRAM
  private skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.55 });
  private gogglesMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    transmission: 0.8,
    opacity: 0.9,
    transparent: true,
    roughness: 0.1,
    ior: 1.45
  });
  private pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
  private shoesMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'MultiplayerAvatarsGroup';
  }

  private createNameTag(peer: PeerAvatarState): { mesh: THREE.Mesh; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture } {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    this.renderTagCanvas(ctx, canvas.width, canvas.height, peer);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.28), mat);
    mesh.position.set(0, 2.15, 0);

    return { mesh, canvas, ctx, tex };
  }

  private renderTagCanvas(ctx: CanvasRenderingContext2D, w: number, h: number, peer: PeerAvatarState) {
    ctx.clearRect(0, 0, w, h);

    // Cápsula redondeada de fondo tipo Apple visionOS
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(8, 8, w - 16, h - 16, 24);
    ctx.fill();

    // Borde iluminado
    ctx.strokeStyle = peer.role === 'docente' ? '#38bdf8' : '#4ade80';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Badge de rol
    ctx.fillStyle = peer.role === 'docente' ? '#38bdf8' : '#4ade80';
    ctx.font = 'bold 20px "Outfit", sans-serif';
    ctx.fillText(peer.role === 'docente' ? '👨‍🏫 DOCENTE GUÍA' : '🔬 ALUMNO', 24, 42);

    // Nombre
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Outfit", sans-serif';
    ctx.fillText(peer.name, 24, 78);

    // Actividad en vivo
    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px "JetBrains Mono", monospace';
    ctx.fillText(peer.activityLabel, 24, 106);
  }

  private buildAvatarMesh(peer: PeerAvatarState): Avatar3DMeshRig {
    const avatarGroup = new THREE.Group();
    // Escala antropométrica real de laboratorio: suelo Y = -1.55, encimera Y = 0.0, altura de ojos Y = +1.62
    avatarGroup.position.set(peer.position.x, -1.55, peer.position.z);
    avatarGroup.rotation.y = peer.rotationY;
    avatarGroup.scale.setScalar(1.85);

    // 1. Torso y Bata Blanca (Bata de laboratorio UNE-EN 340)
    const coatMat = new THREE.MeshStandardMaterial({
      color: peer.safetyCoat ? 0xf8fafc : 0x334155, // Blanco si tiene bata, oscuro si es ropa de calle
      roughness: 0.72
    });
    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.72, 0.24), coatMat);
    bodyMesh.position.set(0, 1.05, 0);
    bodyMesh.castShadow = true;
    avatarGroup.add(bodyMesh);

    // 2. Cabeza
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), this.skinMat);
    headMesh.position.set(0, 1.58, 0);
    headMesh.castShadow = true;
    avatarGroup.add(headMesh);

    // Pelo / Gorro técnico
    const hairMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.1, 0.26),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 })
    );
    hairMesh.position.set(0, 1.72, 0);
    avatarGroup.add(hairMesh);

    // 3. Gafas de Seguridad EN 166 (visera reflectante)
    const gogglesMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.08), this.gogglesMat);
    gogglesMesh.position.set(0, 1.58, 0.13);
    gogglesMesh.visible = peer.safetyGoggles;
    avatarGroup.add(gogglesMesh);

    // 4. Brazos Articulados
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.27, 1.38, 0);
    const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.62, 0.11), coatMat);
    leftArmMesh.position.set(0, -0.31, 0);
    leftArm.add(leftArmMesh);

    // Guante izquierdo
    const leftGloveMat = new THREE.MeshStandardMaterial({
      color: peer.safetyGloves === 'nitrile_blue' ? 0x2563eb : peer.safetyGloves === 'latex_white' ? 0xf8fafc : 0xd4a373,
      roughness: 0.45
    });
    const leftHandMesh = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 0.10), leftGloveMat);
    leftHandMesh.position.set(0, -0.64, 0);
    leftArm.add(leftHandMesh);
    avatarGroup.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.27, 1.38, 0);
    const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.62, 0.11), coatMat);
    rightArmMesh.position.set(0, -0.31, 0);
    rightArm.add(rightArmMesh);

    // Guante derecho
    const rightGloveMat = new THREE.MeshStandardMaterial({
      color: peer.safetyGloves === 'nitrile_blue' ? 0x2563eb : peer.safetyGloves === 'latex_white' ? 0xf8fafc : 0xd4a373,
      roughness: 0.45
    });
    const rightHandMesh = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 0.10), rightGloveMat);
    rightHandMesh.position.set(0, -0.64, 0);
    rightArm.add(rightHandMesh);
    avatarGroup.add(rightArm);

    // 5. Piernas
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.12, 0.70, 0);
    const leftPantsMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.14), this.pantsMat);
    leftPantsMesh.position.set(0, -0.32, 0);
    leftLeg.add(leftPantsMesh);
    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.22), this.shoesMat);
    leftShoe.position.set(0, -0.65, 0.04);
    leftLeg.add(leftShoe);
    avatarGroup.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.12, 0.70, 0);
    const rightPantsMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.14), this.pantsMat);
    rightPantsMesh.position.set(0, -0.32, 0);
    rightLeg.add(rightPantsMesh);
    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.22), this.shoesMat);
    rightShoe.position.set(0, -0.65, 0.04);
    rightLeg.add(rightShoe);
    avatarGroup.add(rightLeg);

    // 6. Etiqueta flotante 3D sobre la cabeza
    const { mesh: tagMesh, canvas: tagCanvas, ctx: tagCtx, tex: tagTex } = this.createNameTag(peer);
    avatarGroup.add(tagMesh);

    this.group.add(avatarGroup);

    return {
      id: peer.id,
      group: avatarGroup,
      bodyMesh,
      headMesh,
      gogglesMesh,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      tagMesh,
      tagCanvas,
      tagCtx,
      tagTex,
      leftGloveMat,
      rightGloveMat,
      coatMat,
      lastState: { ...peer }
    };
  }

  update(camera: THREE.PerspectiveCamera, dt: number) {
    const peers = multiplayerStore.peers;
    const currentPeerIds = new Set(peers.map((p) => p.id));

    // Eliminar avatares desconectados
    for (const [id, rig] of this.avatarRigs.entries()) {
      if (!currentPeerIds.has(id)) {
        this.group.remove(rig.group);
        rig.tagTex.dispose();
        this.avatarRigs.delete(id);
      }
    }

    // Actualizar o crear avatares
    peers.forEach((peer) => {
      let rig = this.avatarRigs.get(peer.id);
      if (!rig) {
        rig = this.buildAvatarMesh(peer);
        this.avatarRigs.set(peer.id, rig);
      }

      peer.animTimer += dt;

      // 1. Interpolación suave de posición y rotación (Lerp & Slerp)
      const targetY = -1.55;
      rig.group.position.x = THREE.MathUtils.lerp(rig.group.position.x, peer.targetPosition.x, dt * 4.5);
      rig.group.position.y = targetY;
      rig.group.position.z = THREE.MathUtils.lerp(rig.group.position.z, peer.targetPosition.z, dt * 4.5);

      rig.group.rotation.y = THREE.MathUtils.lerp(rig.group.rotation.y, peer.targetRotationY, dt * 5.0);

      // 2. Animación procedural de extremidades (Caminar y respirar)
      const dx = peer.targetPosition.x - rig.group.position.x;
      const dz = peer.targetPosition.z - rig.group.position.z;
      const speed = Math.sqrt(dx * dx + dz * dz);
      const isWalking = speed > 0.02;

      if (isWalking) {
        const swing = Math.sin(peer.animTimer * 9) * 0.45;
        rig.leftLeg.rotation.x = swing;
        rig.rightLeg.rotation.x = -swing;
        rig.leftArm.rotation.x = -swing * 0.7;
        rig.rightArm.rotation.x = swing * 0.7;
      } else {
        // En postura de trabajo en mesa: sutil respiración y brazos semi-extendidos manipulando instrumental
        const breathe = Math.sin(peer.animTimer * 2.2) * 0.06;
        rig.leftLeg.rotation.x = 0;
        rig.rightLeg.rotation.x = 0;
        rig.leftArm.rotation.x = THREE.MathUtils.damp(rig.leftArm.rotation.x, -0.38 + breathe, 4, dt);
        rig.rightArm.rotation.x = THREE.MathUtils.damp(rig.rightArm.rotation.x, -0.52 - breathe, 4, dt);
      }

      // 3. Orientar la etiqueta 3D siempre hacia la cámara en espacio mundial (Billboard sin inversión por rotación del padre)
      rig.tagMesh.lookAt(camera.position);

      // 4. Actualizar indumentaria EPP si cambió
      if (
        peer.safetyCoat !== rig.lastState.safetyCoat ||
        peer.safetyGoggles !== rig.lastState.safetyGoggles ||
        peer.safetyGloves !== rig.lastState.safetyGloves ||
        peer.activityLabel !== rig.lastState.activityLabel
      ) {
        rig.coatMat.color.setHex(peer.safetyCoat ? 0xf8fafc : 0x334155);
        rig.gogglesMesh.visible = peer.safetyGoggles;

        const gloveHex = peer.safetyGloves === 'nitrile_blue' ? 0x2563eb : peer.safetyGloves === 'latex_white' ? 0xf8fafc : 0xd4a373;
        rig.leftGloveMat.color.setHex(gloveHex);
        rig.rightGloveMat.color.setHex(gloveHex);

        this.renderTagCanvas(rig.tagCtx, rig.tagCanvas.width, rig.tagCanvas.height, peer);
        rig.tagTex.needsUpdate = true;

        rig.lastState = { ...peer };
      }
    });
  }
}
