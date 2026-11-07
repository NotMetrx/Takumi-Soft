import { labStore, type LabStationId, type SafetyGlovesType } from '$lib/interaction/lab_store.svelte';
import { labSound } from '$lib/audio/lab_sound';

export type UserRole = 'docente' | 'estudiante';

export interface PeerAvatarState {
  id: string;
  name: string;
  role: UserRole;
  station: LabStationId;
  position: { x: number; y: number; z: number };
  targetPosition: { x: number; y: number; z: number };
  rotationY: number;
  targetRotationY: number;
  activityLabel: string;
  safetyCoat: boolean;
  safetyGoggles: boolean;
  safetyGloves: SafetyGlovesType;
  isSimulated?: boolean;
  animTimer: number;
}

export interface MultiplayerMessage {
  type: 'PEER_HEARTBEAT' | 'TEACHER_CALL_BOARD' | 'SYNC_EXPERIMENT' | 'CHAT_NOTE';
  senderId: string;
  senderName: string;
  role: UserRole;
  station: LabStationId;
  position: { x: number; y: number; z: number };
  rotationY: number;
  safetyCoat: boolean;
  safetyGoggles: boolean;
  safetyGloves: SafetyGlovesType;
  payload?: any;
}

class MultiplayerStore {
  roomId = $state<string>('AULA-HACK4EDU');
  isModalOpen = $state<boolean>(false);
  myRole = $state<UserRole>('docente');
  myName = $state<string>('Prof. Gabriel (Tú)');
  myId = $state<string>('local_host_' + Math.random().toString(36).substring(2, 7));

  myPosition = $state<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 2.2 });
  myRotationY = $state<number>(0);

  // Peers remotos conectados en la misma sala (físicos o simulados)
  peers = $state<PeerAvatarState[]>([]);
  demoClassmatesActive = $state<boolean>(true);

  private broadcastChannel: BroadcastChannel | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private simTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initNetwork();
    this.initSimulatedClassmates();
  }

  private initNetwork() {
    if (typeof window === 'undefined' || !window.BroadcastChannel) return;
    try {
      this.broadcastChannel = new BroadcastChannel('symbiolab_classroom_p2p');
      this.broadcastChannel.onmessage = (event) => {
        this.handleIncomingMessage(event.data as MultiplayerMessage);
      };

      // Heartbeat periódico local (1 Hz) para descubrir pestañas/dispositivos
      this.heartbeatInterval = setInterval(() => {
        this.broadcastMyState('PEER_HEARTBEAT');
      }, 1000);
    } catch {
      // Entornos sin soporte BroadcastChannel continúan con compañeros simulados
    }
  }

  private initSimulatedClassmates() {
    // 3 compañeros de clase inteligentes modelados para la presentación del Hackathon
    const demoPeers: PeerAvatarState[] = [
      {
        id: 'peer_maria',
        name: 'María López',
        role: 'estudiante',
        station: 'quimica',
        position: { x: -1.4, y: 0, z: 1.8 },
        targetPosition: { x: -1.4, y: 0, z: 1.8 },
        rotationY: Math.PI,
        targetRotationY: Math.PI,
        activityLabel: '🧪 Titulando con Bureta',
        safetyCoat: true,
        safetyGoggles: true,
        safetyGloves: 'nitrile_blue',
        isSimulated: true,
        animTimer: 0
      },
      {
        id: 'peer_carlos',
        name: 'Carlos Méndez',
        role: 'estudiante',
        station: 'biologia',
        position: { x: -5.5, y: 0, z: 1.8 },
        targetPosition: { x: -5.5, y: 0, z: 1.8 },
        rotationY: Math.PI * 0.85,
        targetRotationY: Math.PI * 0.85,
        activityLabel: '🔬 Muestra en Microscopio 40x',
        safetyCoat: true,
        safetyGoggles: true,
        safetyGloves: 'latex_white',
        isSimulated: true,
        animTimer: 1.5
      },
      {
        id: 'peer_sofia',
        name: 'Sofía Ramírez',
        role: 'estudiante',
        station: 'steam',
        position: { x: 5.5, y: 0, z: 1.8 },
        targetPosition: { x: 5.5, y: 0, z: 1.8 },
        rotationY: -Math.PI * 0.85,
        targetRotationY: -Math.PI * 0.85,
        activityLabel: '📚 Leyendo Manual STEAM',
        safetyCoat: true,
        safetyGoggles: false,
        safetyGloves: 'none',
        isSimulated: true,
        animTimer: 3.2
      }
    ];

    this.peers = demoPeers;

    // Rutina sutil de comportamiento autónomo en el laboratorio (IA de aula)
    this.simTimer = setInterval(() => {
      if (!this.demoClassmatesActive) return;
      this.updateSimulatedBehaviors();
    }, 4000);
  }

  private updateSimulatedBehaviors() {
    this.peers.forEach((peer) => {
      if (!peer.isSimulated) return;
      // Pequeño desplazamiento sutil en su estación para dar sensación viva
      const offset = (Math.random() - 0.5) * 0.35;
      if (peer.id === 'peer_maria') {
        peer.targetPosition.x = -1.4 + offset;
        peer.activityLabel =
          labStore.beaker.acidVolumeMl + labStore.beaker.baseVolumeMl > 5
            ? '🧪 Análisis de pH en tiempo real'
            : '🧪 Titulación volumétrica';
      } else if (peer.id === 'peer_carlos') {
        peer.targetPosition.x = -5.5 + offset;
        peer.activityLabel = '🔬 Ajuste fino tornillo micrométrico';
      } else if (peer.id === 'peer_sofia') {
        peer.targetPosition.x = 5.5 + offset;
        peer.activityLabel = '📚 Ensayo de Convección y Botijo';
      }
    });
  }

  updateMyPose(pos: { x: number; y: number; z: number }, rotY: number) {
    this.myPosition = { x: pos.x, y: pos.y, z: pos.z };
    this.myRotationY = rotY;
  }

  public broadcastMyState(type: MultiplayerMessage['type'] = 'PEER_HEARTBEAT', payload?: any) {
    if (!this.broadcastChannel) return;
    const msg: MultiplayerMessage = {
      type,
      senderId: this.myId,
      senderName: this.myName,
      role: this.myRole,
      station: labStore.activeStation,
      position: { ...this.myPosition },
      rotationY: this.myRotationY,
      safetyCoat: labStore.safetyCoatEquipped,
      safetyGoggles: labStore.safetyGogglesEquipped,
      safetyGloves: labStore.safetyGlovesType,
      payload
    };
    try {
      this.broadcastChannel.postMessage(msg);
    } catch {
      // Ignorar errores en desconexión
    }
  }

  private handleIncomingMessage(msg: MultiplayerMessage) {
    if (msg.senderId === this.myId) return;

    if (msg.type === 'TEACHER_CALL_BOARD') {
      labSound.playBookOpen();
      labStore.setSafetyAlert(
        '📢 CONVOCATORIA DOCENTE EN VIVO',
        `${msg.senderName} ha convocado a toda la clase a la Pizarra SmartBoard para explicar la teoría.`,
        'info'
      );
      labStore.setStation('quimica');
      return;
    }

    if (msg.type === 'SYNC_EXPERIMENT' && msg.payload?.presetId) {
      labStore.loadExperimentPreset(msg.payload.presetId);
      labStore.setSafetyAlert(
        '🎯 PRÁCTICA SINCRONIZADA POR EL DOCENTE',
        `Se ha cargado la práctica oficial: "${msg.payload.title || msg.payload.presetId}".`,
        'info'
      );
      return;
    }

    // Actualizar o registrar peer en la lista
    const idx = this.peers.findIndex((p) => p.id === msg.senderId);
    if (idx >= 0) {
      this.peers[idx].targetPosition = msg.position;
      this.peers[idx].targetRotationY = msg.rotationY;
      this.peers[idx].station = msg.station;
      this.peers[idx].safetyCoat = msg.safetyCoat;
      this.peers[idx].safetyGoggles = msg.safetyGoggles;
      this.peers[idx].safetyGloves = msg.safetyGloves;
    } else {
      this.peers.push({
        id: msg.senderId,
        name: msg.senderName,
        role: msg.role,
        station: msg.station,
        position: msg.position,
        targetPosition: msg.position,
        rotationY: msg.rotationY,
        targetRotationY: msg.rotationY,
        activityLabel: msg.role === 'docente' ? '👨‍🏫 Profesor Guía' : '🔬 Alumno en Mesa',
        safetyCoat: msg.safetyCoat,
        safetyGoggles: msg.safetyGoggles,
        safetyGloves: msg.safetyGloves,
        isSimulated: false,
        animTimer: 0
      });
    }
  }

  /**
   * Acción del Docente: Convoca a todos los estudiantes a la Pizarra SmartBoard
   */
  callAllStudentsToSmartBoard() {
    labSound.playInstrumentClick();
    this.broadcastMyState('TEACHER_CALL_BOARD');
    labStore.setStation('quimica');
    labStore.setSafetyAlert(
      '📢 CONVOCATORIA DE AULA EMITIDA',
      'Has convocado a todos los estudiantes de la sala a la Pizarra SmartBoard del Pabellón 1.',
      'info'
    );
  }

  /**
   * Alternar presencia de compañeros simulados en tiempo real para demostraciones
   */
  toggleDemoClassmates() {
    labSound.playInstrumentClick();
    this.demoClassmatesActive = !this.demoClassmatesActive;
    if (!this.demoClassmatesActive) {
      this.peers = this.peers.filter((p) => !p.isSimulated);
    } else {
      this.initSimulatedClassmates();
    }
  }

  toggleModal(open?: boolean) {
    labSound.playInstrumentClick();
    this.isModalOpen = open !== undefined ? open : !this.isModalOpen;
  }
}

export const multiplayerStore = new MultiplayerStore();
