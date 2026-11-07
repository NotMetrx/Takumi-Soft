<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
  import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
  import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
  import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
  import { Timer } from 'three/addons/misc/Timer.js';
  import { flaskFluid, pourRate, streamHitsBeaker } from './fluid';
  import { handDepthOffset, handDragPlane, handFlaskPose } from './hand_manipulation';
  import { buildCompleteLabSafetyInfrastructure, type SafetyInteractiveHit } from './safety_decorations';
  import { FirstPersonController } from './first_person_controller';
  import { ARHandMeshRig } from './ar_hand_mesh';
  import { LabSafetyFXSystem } from './safety_fx_particles';
  import {
    buildProfessionalLabBench,
    createLabFloorTexture,
    buildLaboratoryCeilingAndLighting,
    buildLaboratoryPerimeterWalls,
    type DoubleDoorsRig
  } from './lab_furniture';
  import { disposeOwnedResources } from './render_resources';
  import { LAB_PROPS_URL, extractLabPropColliders, prepareLabPropsAsset } from './lab_props';
  import { explorationStore } from '$lib/exploration/exploration_store.svelte';
  import {
    labStore,
    LAB_TOOLS_CATALOG,
    CABINET_COMPONENTS,
    MICROSCOPE_PARTS,
    type LabStationId,
    type LabToolInfo,
    type CabinetComponentInfo,
    type MicroscopePartId,
    type MicroscopeSpecimenId
  } from '$lib/interaction/lab_store.svelte';
  import { labSound } from '$lib/audio/lab_sound';

  let { resetViewRevision = 0 }: { resetViewRevision?: number } = $props();
  let container: HTMLDivElement;
  let renderer: THREE.WebGLRenderer | null = null;
  let sceneDisposed = false;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let controls: OrbitControls;
  let timer: Timer;

  // Referencias 3D del vaso central y sensores
  let beakerLiquidMesh: THREE.Mesh;
  let beakerMeniscusMesh: THREE.Mesh;
  let beakerLiquidMat: THREE.MeshPhysicalMaterial;
  let beakerMeniscusMat: THREE.MeshBasicMaterial;
  let underGlowLight: THREE.PointLight;
  let stirBarMesh: THREE.Mesh;
  let heaterGlowRingMat: THREE.MeshBasicMaterial;
  let steamParticles: THREE.Points;
  let steamGeo: THREE.BufferGeometry;

  // Pantalla 3D del pH-metro
  let phScreenCanvas: HTMLCanvasElement;
  let phScreenCtx: CanvasRenderingContext2D | null = null;
  let phScreenTexture: THREE.CanvasTexture;

  // Pantalla 3D del Termómetro Digital
  let thermoCanvas: HTMLCanvasElement;
  let thermoCtx: CanvasRenderingContext2D | null = null;
  let thermoTexture: THREE.CanvasTexture;

  // Herramientas 3D interactivas adicionales
  let buretteLiquidMesh: THREE.Mesh;
  let buretteValveMesh: THREE.Mesh;
  let buretteStreamMesh: THREE.Mesh;
  let buretteStreamTimer = 0;

  let dropperBulbMesh: THREE.Mesh;
  let dropperAnimTimer = 0;

  let phStripTipMat: THREE.MeshStandardMaterial;
  let phStripGroup: THREE.Group;
  let stripDipAnimTimer = 0;

  interface FlaskRig {
    id: 'hcl' | 'naoh';
    group: THREE.Group;
    liquidMesh: THREE.Mesh;
    liquidMat: THREE.MeshPhysicalMaterial;
    labelMesh: THREE.Mesh;
    ringMesh: THREE.Mesh;
    ringMat: THREE.MeshBasicMaterial;
    homePos: THREE.Vector3;
    targetPos: THREE.Vector3;
    targetRotZ: number;
    colorHex: number;
    fluidHeight: number;
    fluidKey: string;
  }

  let flasks: Record<'hcl' | 'naoh', FlaskRig>;
  let bookGroup: THREE.Group;
  let bookGlowRing: THREE.Mesh;
  let interactiveToolGroups: THREE.Object3D[] = [];
  let cabinetItemGroups: THREE.Object3D[] = [];
  let safetyInfrastructureGroup: THREE.Group | null = null;
  let fpController: FirstPersonController | null = null;
  let arHandRig: ARHandMeshRig | null = null;
  let safetyFx: LabSafetyFXSystem | null = null;
  let doubleDoorsRig: DoubleDoorsRig | null = null;
  let keyLight: THREE.DirectionalLight | null = null;
  let lastShowerRev = 0;
  let lastEyewashRev = 0;
  let lastExtinguisherRev = 0;

  // Referencias 3D articuladas del Microscopio Compuesto Binocular
  let microscopeGroup: THREE.Group;
  let microscopeFocusPedestal: THREE.Group;
  let microscopeRevolverGroup: THREE.Group;
  let microscopeStageAssembly: THREE.Group;
  let microscopeSlideGroup: THREE.Group;
  let microscopeSlideHome = new THREE.Vector3(0, 0, 0.09);
  let microscopeSpecimenMat: THREE.MeshBasicMaterial;
  let microscopeOilDropMesh: THREE.Mesh;
  let microscopeCoarseKnobMesh: THREE.Object3D;
  let microscopeFineKnobMesh: THREE.Object3D;
  let microscopeLedGlowMat: THREE.MeshBasicMaterial;
  let microscopeLightBeamMesh: THREE.Mesh;
  let microscopeLightBeamMat: THREE.MeshBasicMaterial;
  let microscopeProxyMesh: THREE.Object3D | null = null;

  // Posición fija realista del Microscopio en la Estación de Biología
  const MICROSCOPE_BIOLOGY_POS = new THREE.Vector3(-4.3, 0, 0.15);
  const MICROSCOPE_BIOLOGY_ROT_Y = 0.35;
  const MICROSCOPE_HOME_POS = MICROSCOPE_BIOLOGY_POS;
  const MICROSCOPE_HOME_ROT_Y = MICROSCOPE_BIOLOGY_ROT_Y;
  const MICROSCOPE_FOCUS_POS = MICROSCOPE_BIOLOGY_POS;
  const MICROSCOPE_FOCUS_ROT_Y = MICROSCOPE_BIOLOGY_ROT_Y;
  const MICROSCOPE_REVOLVER_TILT = 0.35;

  // Poses de cámara cinemática para cada una de las 3 estaciones de laboratorio
  const STATION_VIEW_POSES: Record<LabStationId, { camPos: THREE.Vector3; target: THREE.Vector3 }> = {
    quimica: {
      camPos: new THREE.Vector3(0.08, 2.05, 3.85),
      target: new THREE.Vector3(0, 0.55, 0)
    },
    biologia: {
      camPos: new THREE.Vector3(-4.3, 1.55, 2.35),
      target: new THREE.Vector3(-4.3, 0.52, 0.15)
    },
    steam: {
      camPos: new THREE.Vector3(4.3, 1.65, 2.35),
      target: new THREE.Vector3(4.3, 0.55, 0.15)
    }
  };

  const BIOLOGY_MICROSCOPE_FOCUS_POSE = {
    camPos: new THREE.Vector3(-3.98, 0.98, 1.15),
    target: new THREE.Vector3(-4.3, 0.55, 0.15)
  };

  let isTransitioningStation = false;
  let lastStationId: LabStationId = 'quimica';
  let lastStationRev = 0;
  let lastMicroscopeActiveState = false;
  const MICROSCOPE_OBJECTIVE_ANGLES: Record<number, number> = {
    4: Math.PI / 2,
    10: Math.PI,
    40: 0,
    100: (3 * Math.PI) / 2
  };
  const MICROSCOPE_SPECIMEN_COLORS: Record<MicroscopeSpecimenId, number> = {
    reactor_live: 0x10b981,
    onion_lugol: 0xd97706,
    elodea_chloroplasts: 0x16a34a,
    blood_smear: 0xdc2626,
    tea_microplastics: 0x4c1d95,
    clay_nacl_crystals: 0xc2410c
  };

  // Grupos 3D de los Efectos STEAM en el Vaso Central (Prolongo & Pinto · RSEQ)
  let steamChupaChupsGroup: THREE.Group;
  let steamLollipopRotor: THREE.Group;
  let steamAntibubblesGroup: THREE.Group;
  let antibubbleOrbs: THREE.Group[] = [];
  let steamIceConvectionGroup: THREE.Group;
  let iceCubeMesh: THREE.Mesh;
  let icePlumeParticles: THREE.Points;
  let icePlumeGeo: THREE.BufferGeometry;
  let steamTeaComplexGroup: THREE.Group;
  let steamBotijoGroup: THREE.Group;
  let steamBenzeneInvisibleFireGroup: THREE.Group;
  let benzeneHeavyVaporGeo: THREE.BufferGeometry;
  let benzeneHeavyVaporParticles: THREE.Points;
  let benzeneThermalFlameMesh: THREE.Mesh;
  let benzeneThermalFlameShaderMat: THREE.ShaderMaterial;
  const specColorTemp = new THREE.Color();

  let isBookHovered = $state<boolean>(false);
  let hoveredToolId = $state<LabToolInfo['id'] | null>(null);
  let hoveredMicroscopePartId = $state<MicroscopePartId | null>(null);
  let hoveredCabinetId = $state<string | null>(null);

  let pourStreamMesh: THREE.Mesh;
  let pourStreamMat: THREE.MeshBasicMaterial;
  let splashParticles: THREE.Points;
  let splashGeo: THREE.BufferGeometry;

  // Estado de interacción 3D directa
  let draggedFlaskId = $state<'hcl' | 'naoh' | null>(null);
  let handCursor = $state<{ x: number; y: number; pinched: boolean; overFlask: boolean } | null>(null);
  let hoveredFlaskId = $state<'hcl' | 'naoh' | null>(null);
  let isOverPourZone = $state<boolean>(false);
  let flowAccumulator = 0;
  let dragSource: 'mouse' | 'touch' = 'mouse';

  // Animación disparada por botón o gesto
  let animState: {
    active: boolean;
    flaskId: 'hcl' | 'naoh';
    elapsed: number;
    remainingMl: number;
    requestId: number;
  } | null = null;
  let lastHandledAnimId = 0;
  let lastBuretteRev = 0;
  let lastDropperRev = 0;
  let lastStripRev = 0;

  // Reactividad del Store
  const result = $derived(labStore.beaker.currentResult);
  const totalVolume = $derived(labStore.totalVolumeMl);
  const selectedId = $derived(labStore.selectedReagentId);
  const activePourAnim = $derived(labStore.activePourAnim);
  const presetRevision = $derived(labStore.presetRevision);
  const tempC = $derived(
    labStore.isExplorationMode
      ? (explorationStore.result.temperatureC ?? 25)
      : labStore.beaker.temperatureC
  );
  const burettePulse = $derived(labStore.burettePulseRevision);
  const dropperPulse = $derived(labStore.dropperPulseRevision);
  const stripPulse = $derived(labStore.stripDipRevision);

  const targetLiquidColor = new THREE.Color(0x10b981);
  let currentFillRatio = 50 / 250;
  let targetFillRatio = 50 / 250;

  function drawPhMeterScreen(
    pH: number | null,
    temperature: number | null,
    bandName: string,
    hexColor: string,
    volMl: number
  ) {
    if (!phScreenCtx || !phScreenCanvas) return;
    const ctx = phScreenCtx;
    const w = phScreenCanvas.width;
    const h = phScreenCanvas.height;

    ctx.fillStyle = '#10242b';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = hexColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillText('SYMBIO  /  pH-METRO VIRTUAL', 26, 44);

    ctx.fillStyle = hexColor;
    ctx.beginPath();
    ctx.arc(w - 38, 36, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 86px "JetBrains Mono", monospace';
    ctx.fillText(pH?.toFixed(2) ?? '—', 26, 138);

    ctx.fillStyle = hexColor;
    ctx.font = 'bold 28px "Outfit", sans-serif';
    ctx.fillText('pH', 295, 100);

    ctx.fillStyle = hexColor;
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(bandName.toUpperCase(), 26, 182);

    ctx.fillStyle = '#b0c8cc';
    ctx.font = '500 20px "JetBrains Mono", monospace';
    ctx.fillText(`T: ${temperature?.toFixed(1) ?? '—'}°C   VOL: ${volMl.toFixed(0)} mL`, 26, 222);

    if (phScreenTexture) {
      phScreenTexture.needsUpdate = true;
    }
  }

  function drawThermometerScreen(temperature: number) {
    if (!thermoCtx || !thermoCanvas) return;
    const ctx = thermoCtx;
    const w = thermoCanvas.width;
    const h = thermoCanvas.height;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    const isHot = temperature > 30;
    const accent = isHot ? '#f97316' : '#38bdf8';

    ctx.strokeStyle = accent;
    ctx.lineWidth = 5;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.fillText('TERMÓMETRO LAB', 14, 26);

    ctx.fillStyle = accent;
    ctx.font = 'bold 48px "JetBrains Mono", monospace';
    ctx.fillText(`${temperature.toFixed(1)}°C`, 14, 82);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 14px "Outfit", sans-serif';
    ctx.fillText(isHot ? '🔥 PLACA ACTIVA' : '❄️ ESTÁNDAR 25°C', 14, 112);

    if (thermoTexture) {
      thermoTexture.needsUpdate = true;
    }
  }

  $effect(() => {
    if (labStore.isExplorationMode) {
      const r = explorationStore.result;
      const hex = explorationStore.indicator || r.coverage !== 'quantitative' ? r.color : '#b6d6e2';
      targetLiquidColor.set(hex);
      drawPhMeterScreen(
        r.pH,
        r.temperatureC,
        r.pH === null ? 'SIN MODELO DE pH' : 'pH REF. 25 C',
        hex,
        totalVolume
      );
      drawThermometerScreen(r.temperatureC ?? 25);
    } else if (result) {
      let displayHex = result.indicatorBand.colorHex;
      let displayBand = result.indicatorBand.name;

      // Colorimetría Redox real para el Camaleón Químico con Chupa Chups (Caso 1 PDF Prolongo & Pinto)
      if (labStore.activePresetId === 'steam-chupachups-redox') {
        const kmno4Ml = labStore.beaker.acidVolumeMl;
        const glucoseMl = labStore.beaker.baseVolumeMl;
        if (kmno4Ml > 0.5) {
          const ratio = glucoseMl / Math.max(1, kmno4Ml);
          if (ratio < 0.25) {
            displayHex = '#9333ea'; // Púrpura MnO4- (+7)
            displayBand = 'MnO₄⁻ (+7) Púrpura';
          } else if (ratio < 0.7) {
            displayHex = '#2563eb'; // Azul MnO4(3-) (+5)
            displayBand = 'MnO₄³⁻ (+5) Azul';
          } else if (ratio < 1.35) {
            displayHex = '#10b981'; // Verde MnO4(2-) (+6)
            displayBand = 'MnO₄²⁻ (+6) Verde';
          } else {
            displayHex = '#f59e0b'; // Amarillo-naranja coloidal MnO2 (+4)
            displayBand = 'MnO₂ (+4) Ámbar';
          }
        }
      } else if (labStore.activePresetId === 'steam-tea-complexes-redox') {
        const feMl = labStore.beaker.acidVolumeMl;
        const dithioniteMl = labStore.beaker.baseVolumeMl;
        if (feMl > 2 && dithioniteMl < feMl * 0.8) {
          displayHex = '#312e81'; // Complejo negro-azulado de taninos con Fe3+
          displayBand = 'Complejo Fe³⁺-Tanino';
        } else if (dithioniteMl >= feMl * 0.8 && dithioniteMl > 2) {
          displayHex = '#eab308'; // Decoloración redox por ditionita
          displayBand = 'Redox Ditionita';
        }
      }

      targetLiquidColor.set(displayHex);
      drawPhMeterScreen(result.pH, tempC, displayBand, displayHex, totalVolume);
      drawThermometerScreen(tempC);
    }
  });

  $effect(() => {
    targetFillRatio = Math.max(0, Math.min(1, totalVolume / labStore.beaker.capacityMl));
  });

  $effect(() => {
    if (activePourAnim && activePourAnim.id !== lastHandledAnimId) {
      lastHandledAnimId = activePourAnim.id;
      const fid = activePourAnim.reagentId as 'hcl' | 'naoh';
      if (flasks && flasks[fid]) {
        animState = {
          active: true,
          flaskId: fid,
          elapsed: 0,
          remainingMl: activePourAnim.amountMl,
          requestId: activePourAnim.id
        };
      }
    }
  });

  $effect(() => {
    if (burettePulse > lastBuretteRev) {
      lastBuretteRev = burettePulse;
      buretteStreamTimer = 0.65;
    }
  });

  $effect(() => {
    if (dropperPulse > lastDropperRev) {
      lastDropperRev = dropperPulse;
      dropperAnimTimer = 0.5;
    }
  });

  $effect(() => {
    if (stripPulse > lastStripRev) {
      lastStripRev = stripPulse;
      stripDipAnimTimer = 0.8;
      if (phStripTipMat && labStore.lastTestedStripColor) {
        phStripTipMat.color.set(labStore.lastTestedStripColor);
      }
    }
  });

  // Actualizar etiquetas 3D y colores de matraces cuando el usuario elige un Experimento o Reactivo
  $effect(() => {
    const rev = presetRevision;
    if (rev && flasks) {
      (['hcl', 'naoh'] as const).forEach((id) => {
        const rData = labStore.reagents.find((r) => r.reagentId === id);
        const rig = flasks[id];
        if (rData && rig) {
          const parsedHex = parseInt(rData.colorHex.replace('#', ''), 16);
          rig.colorHex = parsedHex;
          rig.liquidMat.color.setHex(parsedHex);
          rig.ringMat.color.setHex(parsedHex);

          const newLabelTex = createFlaskLabelTexture(
            rData.formula,
            rData.name,
            rData.colorHex,
            `${rData.concentrationMolPerL} mol/L · ${rData.initialMl} mL`
          );
          const mat = rig.labelMesh.material as THREE.MeshBasicMaterial;
          if (mat.map) mat.map.dispose();
          mat.map = newLabelTex;
          mat.needsUpdate = true;
        }
      });
    }
  });

  // Reacciones a eventos de bioseguridad en tiempo real (Ducha, Lavaojos, Extintor)
  $effect(() => {
    if (labStore.showerFxRevision > lastShowerRev) {
      lastShowerRev = labStore.showerFxRevision;
      safetyFx?.triggerShower();
    }
  });

  $effect(() => {
    if (labStore.eyewashFxRevision > lastEyewashRev) {
      lastEyewashRev = labStore.eyewashFxRevision;
      safetyFx?.triggerEyewash();
    }
  });

  $effect(() => {
    if (labStore.extinguisherFxRevision > lastExtinguisherRev) {
      lastExtinguisherRev = labStore.extinguisherFxRevision;
      safetyFx?.triggerExtinguisherDischarge();
    }
  });

  const MICROSCOPE_TRANSITION_DURATION = 1.2; // 1.2 segundos exactos (Lerp + Slerp + Cubic Ease-In-Out)
  const microCamStartPos = new THREE.Vector3();
  const microCamStartQuat = new THREE.Quaternion();
  const microCamTargetPos = new THREE.Vector3();
  const microCamTargetQuat = new THREE.Quaternion();
  const savedOrbitTarget = new THREE.Vector3(0, 0.55, 0);
  const microLookMat = new THREE.Matrix4();
  const microUpVec = new THREE.Vector3(0, 1, 0);
  let lastMicroFsmDirection: 1 | -1 | 0 = 0;

  function easeInOutCubic(u: number): number {
    return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  }

  /**
   * Convierte objetos de suelo en cajas AABB (planta XZ) para el controlador de primera persona.
   * Descarta decoraciones planas (carteles, marcas de suelo) y elementos enormes (muros/suelo).
   */
  function registerFirstPersonSceneColliders(objects: THREE.Object3D[]) {
    if (!fpController) return;
    const boxes: { minX: number; maxX: number; minZ: number; maxZ: number; name: string }[] = [];
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    objects.forEach((obj, idx) => {
      obj.updateWorldMatrix(true, true);
      box.setFromObject(obj);
      if (box.isEmpty()) return;
      box.getSize(size);
      const footprintOk = size.x > 0.05 && size.z > 0.05 && size.x < 3.2 && size.z < 3.2;
      if (!footprintOk || size.y < 0.3) return;
      boxes.push({
        minX: box.min.x,
        maxX: box.max.x,
        minZ: box.min.z,
        maxZ: box.max.z,
        name: obj.name || `floor_object_${idx}`
      });
    });
    fpController.setSceneColliders(boxes);
  }

  /**
   * Calcula la pose final del acercamiento al microscopio: la cámara se sitúa justo encima de los
   * oculares (lado del usuario) y mira hacia el centro del lente, de modo que el ocular quede en el
   * centro exacto de la pantalla. La UI (MicroscopeWorkstation) amplía después el lente desde ese punto.
   */
  function computeEyepieceApproachPose(): { camPos: THREE.Vector3; target: THREE.Vector3 } {
    const fallback = BIOLOGY_MICROSCOPE_FOCUS_POSE;
    if (!microscopeGroup) return fallback;
    microscopeGroup.updateMatrixWorld(true);
    const box = new THREE.Box3();
    microscopeGroup.traverse((obj) => {
      if (obj.userData?.microscopePart === 'oculars' && (obj as THREE.Mesh).isMesh) {
        box.expandByObject(obj);
      }
    });
    if (box.isEmpty()) return fallback;

    const target = new THREE.Vector3();
    box.getCenter(target);
    target.y = box.max.y;

    // Dirección horizontal hacia el lado del observador (desde el microscopio hacia la pose de estudio)
    const front = new THREE.Vector3()
      .subVectors(fallback.camPos, microscopeGroup.position)
      .setY(0);
    if (front.lengthSq() < 1e-6) front.set(0, 0, 1);
    front.normalize();

    const size = box.getSize(new THREE.Vector3());
    const dist = THREE.MathUtils.clamp(Math.max(size.x, size.z) * 2.4, 0.2, 0.45);
    const camPos = target
      .clone()
      .addScaledVector(front, dist * 0.42)
      .add(new THREE.Vector3(0, dist * 0.9, 0));
    return { camPos, target };
  }

  function roundedBox(width: number, height: number, depth: number, radius: number, material: THREE.Material) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 3, radius), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function textPlate(text: string, width: number, height: number, ink = '#c6d9df', background = '#20323e') {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 768, 128);
    ctx.fillStyle = ink;
    ctx.font = '500 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 384, 64, 716);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
    );
  }

  function getActiveStationPose(): { camPos: THREE.Vector3; target: THREE.Vector3 } {
    if (labStore.activeStation === 'biologia' && labStore.isMicroscopeActive) {
      return BIOLOGY_MICROSCOPE_FOCUS_POSE;
    }
    return STATION_VIEW_POSES[labStore.activeStation] ?? STATION_VIEW_POSES.quimica;
  }

  function homeCamera() {
    if (!camera || !controls) return;
    const pose = getActiveStationPose();
    camera.position.copy(pose.camPos);
    controls.target.copy(pose.target);
    controls.update();
  }
  function fitCamera(handsActive: boolean) {
    if (!camera) return;
    const verticalFov = handsActive ? 62 : 42;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(verticalFov / 2)) * Math.max(1, 1.45 / camera.aspect)));
    camera.updateProjectionMatrix();
  }
  $effect(() => fitCamera(labStore.isCameraActive && !labStore.isMicroscopeActive));
  $effect(() => {
    const revision = resetViewRevision;
    if (revision > 0 && camera && controls) homeCamera();
  });
  $effect(() => {
    const res = labStore.renderResolution;
    const shadows = labStore.shadowsEnabled;
    const mouseSens = labStore.mouseSensitivity;
    const invY = labStore.invertY;
    if (renderer) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, res));
      renderer.shadowMap.enabled = shadows;
    }
    if (keyLight) {
      keyLight.castShadow = shadows;
    }
    if (fpController) {
      fpController.mouseSensitivity = mouseSens;
      fpController.invertY = invY;
    }
  });
  $effect(() => {
    const station = labStore.activeStation;
    const rev = labStore.stationRevision;
    const microActive = labStore.isMicroscopeActive;
    const phase = labStore.microscopeTransitionPhase;
    const fsmDir: 1 | -1 | 0 =
      phase === 'APPROACHING_OCULAR' ? 1 : phase === 'RETURNING_TO_EXPLORING' ? -1 : 0;

    if (fsmDir !== 0 && fsmDir !== lastMicroFsmDirection && camera && controls) {
      lastMicroFsmDirection = fsmDir;
      if (fsmDir === 1) {
        if (fpController?.enabled) {
          fpController.capturePreInspectPose();
        }
        // Capturar pose exacta de inicio (1ª persona o vista de mesa) al iniciar la transición de 1.2s hacia el ocular
        camera.getWorldPosition(microCamStartPos);
        camera.getWorldQuaternion(microCamStartQuat);
        savedOrbitTarget.copy(controls.target);

        // Destino: cámara asomada sobre los oculares, mirando hacia el lente (estilo "inventario"):
        // al terminar el acercamiento el lente queda centrado en pantalla y la UI lo amplía.
        const eyepiecePose = computeEyepieceApproachPose();
        microCamTargetPos.copy(eyepiecePose.camPos);
        microLookMat.lookAt(eyepiecePose.camPos, eyepiecePose.target, microUpVec);
        microCamTargetQuat.setFromRotationMatrix(microLookMat);
      }
      isTransitioningStation = false;
      return;
    } else if (fsmDir === 0) {
      lastMicroFsmDirection = 0;
    }

    if (
      station !== lastStationId ||
      rev !== lastStationRev ||
      microActive !== lastMicroscopeActiveState
    ) {
      lastStationId = station;
      lastStationRev = rev;
      lastMicroscopeActiveState = microActive;
      if (labStore.microscopeFsmState === 'EXPLORING' && phase === 'IDLE') {
        isTransitioningStation = true;
      }
    }
  });

  function createBeakerGraduationsTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(222, 243, 249, 0.75)';
    ctx.fillStyle = 'rgba(235, 248, 250, 0.85)';
    ctx.font = '500 20px monospace';
    ctx.lineWidth = 2;
    const centerX = 512;
    for (let ml = 25; ml <= 250; ml += 25) {
      const y = canvas.height * (1 - (0.02 + (0.8 * ml) / 250) / 0.86);
      const major = ml % 50 === 0;
      ctx.beginPath();
      ctx.moveTo(centerX - (major ? 34 : 18), y);
      ctx.lineTo(centerX, y);
      ctx.stroke();
      if (major) ctx.fillText(String(ml), centerX + 12, y + 6);
    }
    ctx.font = '500 17px sans-serif';
    ctx.fillText('mL', centerX - 32, 24);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }

  function createBuretteGraduationsTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(248, 250, 252, 0.9)';
    ctx.fillStyle = 'rgba(248, 250, 252, 0.95)';
    ctx.font = 'bold 18px "JetBrains Mono", monospace';
    ctx.lineWidth = 2;

    const marks = [0, 10, 20, 30, 40, 50];
    marks.forEach((ml, idx) => {
      const y = 40 + (idx / (marks.length - 1)) * 430;
      ctx.beginPath();
      ctx.moveTo(90, y);
      ctx.lineTo(145, y);
      ctx.stroke();
      ctx.fillText(`${ml}`, 152, y + 6);
    });

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  function createFlaskLabelTexture(
    formula: string,
    subtitle: string,
    accentHex: string,
    specLine = '0.01 mol/L · 100 mL'
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 384;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#eaf0ed';
    ctx.fillRect(0, 0, 768, 384);
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 0, 20, 384);
    ctx.fillStyle = '#263d43';
    ctx.font = '600 26px sans-serif';
    ctx.fillText('SYMBIOLAB  /  REACTIVO VIRTUAL', 52, 57);
    ctx.font = '700 100px sans-serif';
    ctx.fillStyle = '#132a31';
    ctx.fillText(formula, 48, 180, 670);
    ctx.font = '500 35px sans-serif';
    ctx.fillStyle = '#354e57';
    ctx.fillText(subtitle, 52, 250, 660);
    ctx.font = '500 31px monospace';
    ctx.fillStyle = '#354e57';
    ctx.fillText(specLine, 52, 326, 660);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }

  function createSciencePosterTexture(
    kind: 'ph_scale' | 'lab_rules' | 'biology_cells' | 'steam_physics'
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 320);

    if (kind === 'ph_scale') {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, 500, 308);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 22px "Outfit", sans-serif';
      ctx.fillText('ESCALA DE pH & INDICADORES', 24, 40);

      const colors = ['#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6'];
      const labels = ['pH 1', 'pH 3', 'pH 5', 'pH 7', 'pH 9', 'pH 11', 'pH 14'];
      colors.forEach((c, i) => {
        const x = 24 + i * 66;
        ctx.fillStyle = c;
        ctx.fillRect(x, 65, 58, 95);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px "JetBrains Mono", monospace';
        ctx.fillText(labels[i], x + 8, 185);
      });

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('• Primaria: Detecta ácidos (limón) y bases (jabón)', 24, 232);
      ctx.fillText('• Secundaria: pH = -log₁₀[H₃O⁺]  |  Kw = 10⁻¹⁴ (25°C)', 24, 264);
    } else if (kind === 'biology_cells') {
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, 500, 308);

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 22px "Outfit", sans-serif';
      ctx.fillText('BIOLOGÍA & MICROSCOPÍA ÓPTICA', 24, 40);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('• Óptica DIN 160 mm · Oculares WF10x/18 mm', 24, 85);
      ctx.fillText('• Objetivos: 4x (Rojo) · 10x (Amarillo) · 40x (Azul) · 100x OIL', 24, 122);

      ctx.fillStyle = '#a7f3d0';
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.fillText('Muestras: Cebolla + Lugol · Elodea viva · Halita NaCl', 24, 168);
      ctx.fillText('Resolución: Límite de Abbe d = λ / (2·NA)', 24, 204);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText('Ajusta foco macrométrico y micrométrico para máxima nitidez.', 24, 255);
    } else if (kind === 'steam_physics') {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, 500, 308);

      ctx.fillStyle = '#fde68a';
      ctx.font = 'bold 22px "Outfit", sans-serif';
      ctx.fillText('CIENCIAS STEAM & FENÓMENOS (RSEQ)', 24, 40);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('• Experimentos didácticos de M. Prolongo y G. Pinto', 24, 85);
      ctx.fillText('• Termodinámica: Refrigeración evaporativa en botijo cerámico', 24, 122);
      ctx.fillText('• Convección térmica con plumas coloreadas de agua fría', 24, 160);
      ctx.fillText('• Tensión superficial y antiburbujas con solución anfifílica', 24, 198);

      ctx.fillStyle = '#fcd34d';
      ctx.font = '13px "JetBrains Mono", monospace';
      ctx.fillText('Abre el Libro 3D o la Estantería para equipar cada fenómeno.', 24, 255);
    } else {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, 500, 308);

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 22px "Outfit", sans-serif';
      ctx.fillText('MÉTODO CIENTÍFICO EN EL LAB', 24, 40);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('1. Observa el video en el Libro 3D', 24, 88);
      ctx.fillText('2. Formula tu hipótesis con el Tutor IA', 24, 128);
      ctx.fillText('3. Dosifica con Matraces, Bureta o Gotero', 24, 168);
      ctx.fillText('4. Mide con pH-metro, Tiras o Termómetro', 24, 208);
      ctx.fillText('5. Registra y exporta en tu Cuaderno', 24, 248);
    }

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Genera la textura editorial estilo Apple Books / Taschen de las páginas abiertas del Libro 3D en la mesa
   */
  function createOpenBookPagesTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d')!;

    // Papel marfil cálido de museo (Apple Books Warm Ivory)
    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, 1024, 768);

    // Sombra suave de pliegue central realista
    const spineGrad = ctx.createLinearGradient(468, 0, 556, 0);
    spineGrad.addColorStop(0, 'rgba(0,0,0,0)');
    spineGrad.addColorStop(0.5, 'rgba(24, 24, 27, 0.22)');
    spineGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spineGrad;
    ctx.fillRect(468, 0, 88, 768);

    // Marcos editoriales de 1px hairline
    ctx.strokeStyle = 'rgba(28, 25, 23, 0.14)';
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 36, 434, 696);
    ctx.strokeRect(554, 36, 434, 696);

    // Página izquierda — Índice Editorial & Primaria
    ctx.fillStyle = '#78716c';
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.fillText('SYMBIOLAB PRESS  •  01', 64, 82);

    ctx.fillStyle = '#0c0a09';
    ctx.font = 'bold 32px "Outfit", sans-serif';
    ctx.fillText('Prácticas STEAM', 64, 130);

    // Visor Keynote oscuro minimalista en página izquierda
    ctx.fillStyle = '#090a0d';
    ctx.fillRect(64, 162, 378, 210);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(64, 162, 378, 210);

    // Botón play estilo Apple Keynote (blanco traslúcido)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.beginPath();
    ctx.arc(253, 267, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#090a0d';
    ctx.beginPath();
    ctx.moveTo(243, 249);
    ctx.lineTo(243, 285);
    ctx.lineTo(273, 267);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#44403c';
    ctx.font = 'bold 19px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('01  Indicador Antocianina', 64, 428);
    ctx.fillText('02  Neutralización y CO₂', 64, 468);
    ctx.fillText('03  Camaleón Redox (Mn)', 64, 508);
    ctx.fillText('04   Antiburbujas en Sirope', 64, 548);

    // Página derecha — Secundaria & Acción
    ctx.fillStyle = '#78716c';
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.fillText('MONOGRAFÍA EXPERIMENTAL  •  02', 582, 82);

    ctx.fillStyle = '#0c0a09';
    ctx.font = 'bold 30px "Outfit", sans-serif';
    ctx.fillText('Química Cuantitativa', 582, 130);

    ctx.fillStyle = '#44403c';
    ctx.font = 'bold 19px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('05  Titulación Ácido-Base', 582, 198);
    ctx.fillText('06  Termoquímica Kw(T)', 582, 242);
    ctx.fillText('07  Complejos Fe-Taninos', 582, 286);
    ctx.fillText('08   Termodinámica & Botijo', 582, 330);
    ctx.fillText('09  Catálogo Estantería 3D', 582, 374);

    // Botón Píldora Editorial Oscuro (Apple Books CTA)
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(582, 594, 378, 78);
    ctx.fillStyle = '#faf8f5';
    ctx.font = 'bold 21px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('ABRIR LIBRO INTERACTIVO', 630, 641);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }

  function buildInteractiveHomeBook(): THREE.Group {
    const group = new THREE.Group();
    group.position.set(4.05, 0.02, 0.28);
    group.scale.setScalar(0.72);
    group.rotation.y = -0.28;
    group.userData = { isHomeBook: true };

    const standGeo = new THREE.BoxGeometry(0.72, 0.06, 0.50);
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.35,
      metalness: 0.65
    });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.y = 0.04;
    stand.rotation.x = 0.24;
    stand.castShadow = true;
    stand.receiveShadow = true;
    group.add(stand);

    const coverGeo = new THREE.BoxGeometry(0.70, 0.026, 0.48);
    const coverMat = new THREE.MeshStandardMaterial({
      color: 0x18191e,
      roughness: 0.55,
      metalness: 0.15
    });
    const cover = new THREE.Mesh(coverGeo, coverMat);
    cover.position.set(0, 0.08, 0);
    cover.rotation.x = 0.24;
    cover.castShadow = true;
    group.add(cover);

    const spineBump = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.485, 16),
      new THREE.MeshStandardMaterial({ color: 0x0f1014, roughness: 0.6 })
    );
    spineBump.rotation.x = Math.PI / 2 + 0.24;
    spineBump.position.set(0, 0.075, 0);
    group.add(spineBump);

    const pagesTex = createOpenBookPagesTexture();
    const pagesMaterials = [
      new THREE.MeshStandardMaterial({ color: 0xf5f2eb }),
      new THREE.MeshStandardMaterial({ color: 0xf5f2eb }),
      new THREE.MeshBasicMaterial({ map: pagesTex }),
      new THREE.MeshStandardMaterial({ color: 0x18191e }),
      new THREE.MeshStandardMaterial({ color: 0xf5f2eb }),
      new THREE.MeshStandardMaterial({ color: 0xf5f2eb })
    ];
    const pagesGeo = new THREE.BoxGeometry(0.65, 0.036, 0.44);
    const pagesMesh = new THREE.Mesh(pagesGeo, pagesMaterials);
    pagesMesh.position.set(0, 0.106, 0);
    pagesMesh.rotation.x = 0.24;
    pagesMesh.castShadow = true;
    pagesMesh.userData = { isHomeBook: true };
    group.add(pagesMesh);

    const ribbonGeo = new THREE.BoxGeometry(0.032, 0.006, 0.14);
    const ribbonMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 });
    const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
    ribbon.position.set(0.12, 0.06, 0.25);
    ribbon.rotation.x = 0.24;
    group.add(ribbon);

    const glowGeo = new THREE.RingGeometry(0.44, 0.48, 48);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35
    });
    bookGlowRing = new THREE.Mesh(glowGeo, glowMat);
    bookGlowRing.rotation.x = -Math.PI / 2;
    bookGlowRing.position.y = 0.005;
    group.add(bookGlowRing);

    const proxyGeo = new THREE.BoxGeometry(0.78, 0.35, 0.58);
    const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
    const proxy = new THREE.Mesh(proxyGeo, proxyMat);
    proxy.position.y = 0.14;
    proxy.userData = { isHomeBook: true };
    group.add(proxy);

    return group;
  }

  /**
   * Construye un Pizarrón Científico / Pizarra de Laboratorio con superficie de pizarra oscura,
   * marco perimetral de aluminio cepillado, bandeja porta-rotuladores/tizas y borrador.
   */
  function buildLabBlackboard(
    width: number,
    height: number,
    position: THREE.Vector3,
    accentColor: number
  ): THREE.Group {
    const boardGroup = new THREE.Group();
    boardGroup.name = 'LabBlackboard';
    boardGroup.position.copy(position);

    // Marco exterior de aluminio anodizado cepillado
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.35,
      metalness: 0.8
    });
    const frame = roundedBox(width + 0.08, height + 0.08, 0.024, 0.015, frameMat);
    frame.position.z = -0.004;
    boardGroup.add(frame);

    // Superficie de pizarra técnica de laboratorio (verde oscuro pizarra / grafito científico)
    const slateMat = new THREE.MeshStandardMaterial({
      color: 0x162d38, // Verde grafito oscuro pizarra de alto contraste
      roughness: 0.88,
      metalness: 0.06
    });
    const slate = roundedBox(width, height, 0.018, 0.008, slateMat);
    slate.position.z = 0.002;
    boardGroup.add(slate);

    // Filete decorativo superior del color de la estación
    const accentTrimMat = new THREE.MeshBasicMaterial({ color: accentColor });
    const accentLine = new THREE.Mesh(new THREE.BoxGeometry(width - 0.04, 0.014, 0.006), accentTrimMat);
    accentLine.position.set(0, height / 2 - 0.02, 0.012);
    boardGroup.add(accentLine);

    // Bandeja porta-tizas / rotuladores en el borde inferior
    const tray = new THREE.Mesh(new THREE.BoxGeometry(width - 0.3, 0.016, 0.06), frameMat);
    tray.position.set(0, -height / 2 - 0.008, 0.03);
    boardGroup.add(tray);

    // Borrador de pizarra
    const eraserMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
    const eraser = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.038), eraserMat);
    eraser.position.set(-width * 0.28, -height / 2 + 0.012, 0.03);
    boardGroup.add(eraser);

    // Tizas / rotuladores de colores en la bandeja
    const chalkMat1 = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
    const chalk1 = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.075, 8), chalkMat1);
    chalk1.rotation.z = Math.PI / 2;
    chalk1.position.set(width * 0.22, -height / 2 + 0.008, 0.03);
    boardGroup.add(chalk1);

    const chalkMat2 = new THREE.MeshBasicMaterial({ color: accentColor });
    const chalk2 = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.07, 8), chalkMat2);
    chalk2.rotation.z = Math.PI / 2;
    chalk2.position.set(width * 0.22 + 0.1, -height / 2 + 0.008, 0.03);
    boardGroup.add(chalk2);

    return boardGroup;
  }

  /**
   * Construye los pizarrones de laboratorio con su marco y bandeja porta-tizas,
   * letreros de estación y pósters temáticos montados sobre la pared norte.
   */
  function buildLabEnvironmentAndRack(glassMaterial: THREE.MeshPhysicalMaterial): THREE.Group {
    const group = new THREE.Group();

    // =========================================================================
    // PIZARRONES CIENTÍFICOS DE LABORATORIO (BLACKBOARDS) EN LA PARED NORTE
    // Superficie oscura de alto contraste con marco de aluminio y bandeja porta-tizas
    // =========================================================================
    const boardBio = buildLabBlackboard(3.5, 2.15, new THREE.Vector3(-4.3, 1.95, -2.315), 0x4ade80);
    group.add(boardBio);

    const boardChem = buildLabBlackboard(4.5, 2.15, new THREE.Vector3(0, 1.95, -2.315), 0x38bdf8);
    group.add(boardChem);

    const boardSteam = buildLabBlackboard(3.5, 2.15, new THREE.Vector3(4.3, 1.95, -2.315), 0xfacc15);
    group.add(boardSteam);

    // 1. SECCIÓN DE BIOLOGÍA Y MICROSCOPÍA (IZQUIERDA: x = -4.3, montado en pizarrón z = -2.298)
    const posterBio = new THREE.Mesh(
      new THREE.PlaneGeometry(1.35, 0.80),
      new THREE.MeshBasicMaterial({ map: createSciencePosterTexture('biology_cells') })
    );
    posterBio.position.set(-4.3, 1.82, -2.298);
    group.add(posterBio);

    const signBio = textPlate('SYMBIOLAB  /  2. BIOLOGÍA & MICROSCOPÍA', 1.75, 0.15, '#86efac', '#14532d');
    signBio.position.set(-4.3, 2.76, -2.298);
    group.add(signBio);

    // 2. SECCIÓN DE QUÍMICA ANALÍTICA (CENTRO: x = 0, montado en pizarrón z = -2.298)
    const posterChem1 = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.72),
      new THREE.MeshBasicMaterial({ map: createSciencePosterTexture('ph_scale') })
    );
    posterChem1.position.set(-1.10, 1.82, -2.298);
    group.add(posterChem1);

    const posterChem2 = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.72),
      new THREE.MeshBasicMaterial({ map: createSciencePosterTexture('lab_rules') })
    );
    posterChem2.position.set(1.10, 1.82, -2.298);
    group.add(posterChem2);

    const signChem = textPlate('SYMBIOLAB  /  1. QUÍMICA ANALÍTICA & REACCIONES', 1.95, 0.15, '#93c5fd', '#1e293b');
    signChem.position.set(0, 2.76, -2.298);
    group.add(signChem);

    // 3. SECCIÓN STEAM Y CIENCIAS FENOMENOLÓGICAS (DERECHA: x = 4.3, montado en pizarrón z = -2.298)
    const posterSteam = new THREE.Mesh(
      new THREE.PlaneGeometry(1.35, 0.80),
      new THREE.MeshBasicMaterial({ map: createSciencePosterTexture('steam_physics') })
    );
    posterSteam.position.set(4.3, 1.82, -2.298);
    group.add(posterSteam);

    const signSteam = textPlate('SYMBIOLAB  /  3. CIENCIAS STEAM & FÍSICA', 1.75, 0.15, '#fde047', '#713f12');
    signSteam.position.set(4.3, 2.76, -2.298);
    group.add(signSteam);

    // Gradilla de 5 Tubos de Ensayo (altura 0.34 u, proporcional frente al microscopio de 1.50 u)
    const rack = new THREE.Group();
    rack.position.set(0.76, 0, -0.88);
    rack.userData = { toolId: 'test_rack' };

    const rackMat = new THREE.MeshStandardMaterial({ color: 0xc2ccca, roughness: 0.4, metalness: 0.25 });
    const tray = roundedBox(0.74, 0.035, 0.20, 0.014, rackMat);
    tray.position.y = 0.02;
    rack.add(tray);
    [-0.33, 0.33].forEach((x) => {
      const upright = roundedBox(0.022, 0.22, 0.15, 0.008, rackMat);
      upright.position.set(x, 0.14, 0);
      rack.add(upright);
    });
    [-0.065, 0.065].forEach((z) => {
      const support = roundedBox(0.70, 0.022, 0.022, 0.008, rackMat);
      support.position.set(0, 0.23, z);
      rack.add(support);
    });
    [0xf0a18e, 0xe7c77d, 0x8ed1a5, 0x73b9ce, 0xae9bda].forEach((color, i) => {
      const x = (i - 2) * 0.125;
      const tube = new THREE.Mesh(
        new THREE.LatheGeometry(
          [
            new THREE.Vector2(0, 0),
            new THREE.Vector2(0.022, 0.008),
            new THREE.Vector2(0.026, 0.03),
            new THREE.Vector2(0.026, 0.31),
            new THREE.Vector2(0.022, 0.31),
            new THREE.Vector2(0.021, 0.03),
            new THREE.Vector2(0, 0.014)
          ],
          20
        ),
        glassMaterial
      );
      tube.position.set(x, 0.04, 0);
      tube.renderOrder = 3;
      tube.userData = { toolId: 'test_rack' };
      rack.add(tube);

      const liquid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.020, 0.020, 0.15, 18),
        new THREE.MeshStandardMaterial({ color, roughness: 0.28, transparent: true, opacity: 0.9 })
      );
      liquid.position.set(x, 0.13, 0);
      liquid.renderOrder = 2;
      rack.add(liquid);
    });
    const rackLabel = textPlate('REFERENCIA DE INDICADOR', 0.62, 0.044, '#3b5259', '#c2ccca');
    rackLabel.position.set(0, 0.062, 0.105);
    rack.add(rackLabel);

    const rackProxy = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.38, 0.26),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    rackProxy.position.set(0, 0.19, 0);
    rackProxy.userData = { toolId: 'test_rack' };
    rack.add(rackProxy);

    interactiveToolGroups.push(rack);
    group.add(rack);
    return group;
  }

  /**
   * Construye el conjunto de instrumentación y reactivos especializados para la Estación de Biología
   * (Bandeja con 6 portaobjetos, cubreobjetos, tinciones de Lugol/Azul de Metileno, frasco de aceite y placa Petri).
   */
  function buildBiologyWorkstationAccessories(glassMaterial: THREE.MeshPhysicalMaterial): THREE.Group {
    const group = new THREE.Group();
    group.position.set(-4.3, 0, 0.15);

    // 1. Bandeja de madera pulida con 6 portaobjetos de muestras preparadas
    const trayGroup = new THREE.Group();
    trayGroup.position.set(-0.75, 0.015, 0.18);
    const trayBase = roundedBox(0.48, 0.024, 0.62, 0.01, new THREE.MeshStandardMaterial({ color: 0x2b1d14, roughness: 0.6 }));
    trayGroup.add(trayBase);

    const slideSpecs: { id: MicroscopeSpecimenId; name: string; color: number }[] = [
      { id: 'onion_lugol', name: 'Cebolla + Lugol', color: 0xd97706 },
      { id: 'elodea_chloroplasts', name: 'Elodea (Cloroplastos)', color: 0x16a34a },
      { id: 'blood_smear', name: 'Frotis Sanguíneo', color: 0xdc2626 },
      { id: 'tea_microplastics', name: 'Microplásticos Té', color: 0x4c1d95 },
      { id: 'clay_nacl_crystals', name: 'Halita NaCl & Arcilla', color: 0xc2410c },
      { id: 'reactor_live', name: 'Reactor Químico Vivo', color: 0x10b981 }
    ];

    slideSpecs.forEach((spec, i) => {
      const z = -0.22 + i * 0.088;
      const slideMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.008, 0.065),
        glassMaterial
      );
      slideMesh.position.set(0, 0.016, z);
      slideMesh.userData = { toolId: 'microscope_slide', specimenId: spec.id };
      trayGroup.add(slideMesh);

      const specimenSpot = new THREE.Mesh(
        new THREE.CircleGeometry(0.018, 16),
        new THREE.MeshBasicMaterial({ color: spec.color, side: THREE.DoubleSide })
      );
      specimenSpot.rotation.x = -Math.PI / 2;
      specimenSpot.position.set(0.04, 0.021, z);
      trayGroup.add(specimenSpot);

      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.08, 0.05),
        new THREE.MeshBasicMaterial({ color: 0xf1f5f9 })
      );
      label.rotation.x = -Math.PI / 2;
      label.position.set(-0.13, 0.021, z);
      trayGroup.add(label);
    });
    group.add(trayGroup);

    // 2. Frasco ámbar de Aceite de Inmersión (n = 1.515)
    const amberGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x451a03,
      roughness: 0.2,
      transmission: 0.6,
      transparent: true,
      thickness: 0.05
    });
    const oilBottle = new THREE.Group();
    oilBottle.position.set(-0.45, 0.015, -0.45);
    oilBottle.userData = { toolId: 'immersion_oil' };
    const bottleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.12, 20), amberGlassMat);
    bottleBody.position.y = 0.06;
    oilBottle.add(bottleBody);
    const dropperCap = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.032, 0.055, 16), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 }));
    dropperCap.position.y = 0.145;
    oilBottle.add(dropperCap);
    const oilLabel = textPlate('ACEITE n=1.515', 0.16, 0.05, '#fef08a', '#1e1b4b');
    oilLabel.position.set(0, 0.06, 0.044);
    oilBottle.add(oilLabel);
    interactiveToolGroups.push(oilBottle);
    group.add(oilBottle);

    // 3. Frascos de Tinciones Biológicas (Lugol y Azul de Metileno)
    const lugolBottle = new THREE.Group();
    lugolBottle.position.set(0.48, 0.015, -0.45);
    const lugolBody = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.13, 20), amberGlassMat);
    lugolBody.position.y = 0.065;
    lugolBottle.add(lugolBody);
    const lugolCap = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.035, 16), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 }));
    lugolCap.position.y = 0.145;
    lugolBottle.add(lugolCap);
    const lugolLabel = textPlate('LUGOL (I₂/KI)', 0.16, 0.05, '#ffffff', '#78350f');
    lugolLabel.position.set(0, 0.065, 0.048);
    lugolBottle.add(lugolLabel);
    group.add(lugolBottle);

    const methBottle = new THREE.Group();
    methBottle.position.set(0.72, 0.015, -0.45);
    const blueMat = new THREE.MeshPhysicalMaterial({ color: 0x1e3a8a, roughness: 0.2, transmission: 0.65, transparent: true, thickness: 0.05 });
    const methBody = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.13, 20), blueMat);
    methBody.position.y = 0.065;
    methBottle.add(methBody);
    const methCap = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.035, 16), new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.5 }));
    methCap.position.y = 0.145;
    methBottle.add(methCap);
    const methLabel = textPlate('AZUL METILENO', 0.16, 0.05, '#ffffff', '#1e3a8a');
    methLabel.position.set(0, 0.065, 0.048);
    methBottle.add(methLabel);
    group.add(methBottle);

    // 4. Placa de Petri de Borosilicato con pinzas finas
    const petriGroup = new THREE.Group();
    petriGroup.position.set(0.62, 0.015, 0.25);
    const petriDish = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.022, 32), glassMaterial);
    petriDish.position.y = 0.011;
    petriGroup.add(petriDish);
    const tweezerMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 });
    const tweezers = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.008, 0.22), tweezerMat);
    tweezers.rotation.y = 0.42;
    tweezers.position.set(0.04, 0.025, 0);
    petriGroup.add(tweezers);
    group.add(petriGroup);

    return group;
  }

  /**
   * Soporte Universal Metálico Alto con Bureta Volumétrica de 50 mL (Altura 1.92 u, sobre el vaso)
   */
  function buildBuretteStation(glassMaterial: THREE.MeshPhysicalMaterial): THREE.Group {
    const group = new THREE.Group();
    group.userData = { toolId: 'burette' };

    const castIronMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.55
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.16,
      metalness: 0.92
    });

    // Base en el sector trasero izquierdo del vaso
    const basePlate = roundedBox(0.38, 0.036, 0.34, 0.012, castIronMat);
    basePlate.position.set(-0.46, 0.018, -0.44);
    group.add(basePlate);

    // Varilla vertical de acero inoxidable (altura 1.92 u)
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.90, 24), chromeMat);
    rod.position.set(-0.46, 0.96, -0.44);
    rod.castShadow = true;
    group.add(rod);

    // Doble nuez y brazo hacia (-0.15, 1.48, -0.02)
    const start = new THREE.Vector3(-0.46, 1.50, -0.44);
    const end = new THREE.Vector3(-0.15, 1.50, -0.02);
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, start.distanceTo(end), 16),
      chromeMat
    );
    arm.position.copy(start).add(end).multiplyScalar(0.5);
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
    group.add(arm);

    const bosshead = roundedBox(0.065, 0.075, 0.065, 0.012, castIronMat);
    bosshead.position.copy(start);
    group.add(bosshead);

    // Tubo volumétrico de la bureta de 50 mL sobre la boca del vaso
    const bx = -0.15;
    const bz = -0.02;
    const buretteBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.72, 32, 1, true),
      glassMaterial
    );
    buretteBody.position.set(bx, 1.52, bz);
    buretteBody.renderOrder = 3;
    group.add(buretteBody);

    const gradMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.029, 0.029, 0.66, 32, 1, true),
      new THREE.MeshBasicMaterial({
        map: createBuretteGraduationsTexture(),
        transparent: true,
        depthWrite: false
      })
    );
    gradMesh.position.set(bx, 1.52, bz);
    gradMesh.rotation.y = -Math.PI / 2;
    gradMesh.renderOrder = 4;
    group.add(gradMesh);

    buretteLiquidMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.023, 0.023, 0.62, 24),
      new THREE.MeshPhysicalMaterial({
        color: 0x8b5cf6,
        transmission: 0.45,
        transparent: true,
        opacity: 0.88,
        roughness: 0.15
      })
    );
    buretteLiquidMesh.position.set(bx, 1.50, bz);
    buretteLiquidMesh.renderOrder = 2;
    group.add(buretteLiquidMesh);

    // Llave de paso PTFE roja y punta capilar (y = 1.07, justo sobre el borde del vaso a y = 1.03)
    const stopcockHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.07, 20),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 })
    );
    stopcockHousing.rotation.z = Math.PI / 2;
    stopcockHousing.position.set(bx, 1.13, bz);
    group.add(stopcockHousing);

    buretteValveMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.095, 0.018, 0.026),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
    );
    buretteValveMesh.position.set(bx, 1.13, bz);
    group.add(buretteValveMesh);

    const tip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.004, 0.09, 20),
      glassMaterial
    );
    tip.position.set(bx, 1.08, bz);
    group.add(tip);

    buretteStreamMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 0.72, 12),
      new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.85 })
    );
    buretteStreamMesh.position.set(bx, 0.68, bz);
    buretteStreamMesh.visible = false;
    group.add(buretteStreamMesh);

    const proxy = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 1.05, 0.28),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    proxy.position.set(bx, 1.45, bz);
    proxy.userData = { toolId: 'burette' };
    group.add(proxy);

    return group;
  }

  /**
   * Termómetro Digital de Inmersión con Sonda Metálica en el Vaso
   */
  function buildDigitalThermometer(): THREE.Group {
    const group = new THREE.Group();
    group.userData = { toolId: 'thermometer' };

    const probe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.007, 0.86, 16),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.18, metalness: 0.92 })
    );
    probe.position.set(-0.24, 0.64, -0.14);
    probe.rotation.z = 0.08;
    group.add(probe);

    const headGroup = new THREE.Group();
    headGroup.position.set(-0.29, 1.12, -0.14);
    headGroup.rotation.y = 0.28;
    headGroup.rotation.x = -0.15;
    group.add(headGroup);

    const body = roundedBox(
      0.24,
      0.14,
      0.032,
      0.01,
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.4 })
    );
    headGroup.add(body);

    thermoCanvas = document.createElement('canvas');
    thermoCanvas.width = 256;
    thermoCanvas.height = 128;
    thermoCtx = thermoCanvas.getContext('2d');
    thermoTexture = new THREE.CanvasTexture(thermoCanvas);
    drawThermometerScreen(25.0);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.21, 0.11),
      new THREE.MeshBasicMaterial({ map: thermoTexture })
    );
    screen.position.z = 0.018;
    screen.userData = { toolId: 'thermometer' };
    headGroup.add(screen);

    const proxy = new THREE.Mesh(
      new THREE.BoxGeometry(0.30, 0.95, 0.20),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    proxy.position.set(-0.26, 0.78, -0.14);
    proxy.userData = { toolId: 'thermometer' };
    group.add(proxy);

    return group;
  }

  /**
   * Dispensador de Rollo de Papel Indicador Universal pH (1-14) + Vidrio de Reloj
   */
  function buildPhPaperStripsDispenser(glassMaterial: THREE.MeshPhysicalMaterial): THREE.Group {
    const group = new THREE.Group();
    group.position.set(-1.58, 0, 0.56);
    group.rotation.y = 0.38;
    group.userData = { toolId: 'ph_strips' };

    const reelCase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.045, 32),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.32, metalness: 0.1 })
    );
    reelCase.rotation.x = Math.PI / 2;
    reelCase.position.set(-0.10, 0.12, 0);
    reelCase.castShadow = true;
    group.add(reelCase);

    const watchGlassPts = [
      new THREE.Vector2(0.0, 0.008),
      new THREE.Vector2(0.07, 0.011),
      new THREE.Vector2(0.13, 0.032),
      new THREE.Vector2(0.125, 0.037),
      new THREE.Vector2(0.065, 0.016),
      new THREE.Vector2(0.0, 0.013)
    ];
    const watchGlass = new THREE.Mesh(new THREE.LatheGeometry(watchGlassPts, 36), glassMaterial);
    watchGlass.position.set(0.10, 0.002, 0.04);
    watchGlass.renderOrder = 3;
    group.add(watchGlass);

    phStripGroup = new THREE.Group();
    phStripGroup.position.set(0.10, 0.028, 0.04);
    phStripGroup.rotation.z = -0.08;
    group.add(phStripGroup);

    const stripPaper = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.005, 0.034),
      new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.65 })
    );
    phStripGroup.add(stripPaper);

    phStripTipMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4 });
    const stripTip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.006, 0.035), phStripTipMat);
    stripTip.position.set(0.05, 0.001, 0);
    phStripGroup.add(stripTip);

    const proxy = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.28, 0.28),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    proxy.position.y = 0.14;
    proxy.userData = { toolId: 'ph_strips' };
    group.add(proxy);

    return group;
  }

  /**
   * Frasco Gotero Ámbar de 60 mL con Pipeta Pasteur (Altura 0.34 u)
   */
  function buildIndicatorDropperBottle(): THREE.Group {
    const group = new THREE.Group();
    group.position.set(-1.60, 0, -0.02);
    group.userData = { toolId: 'dropper' };

    const bottlePts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.085, 0.0),
      new THREE.Vector2(0.092, 0.02),
      new THREE.Vector2(0.092, 0.16),
      new THREE.Vector2(0.072, 0.20),
      new THREE.Vector2(0.040, 0.22),
      new THREE.Vector2(0.040, 0.26),
      new THREE.Vector2(0.034, 0.26),
      new THREE.Vector2(0.034, 0.20),
      new THREE.Vector2(0.084, 0.15),
      new THREE.Vector2(0.084, 0.012),
      new THREE.Vector2(0.0, 0.012)
    ];
    const bottle = new THREE.Mesh(
      new THREE.LatheGeometry(bottlePts, 36),
      new THREE.MeshPhysicalMaterial({
        color: 0x92400e,
        transmission: 0.62,
        transparent: true,
        opacity: 0.92,
        roughness: 0.12,
        ior: 1.5
      })
    );
    bottle.castShadow = true;
    group.add(bottle);

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.046, 0.048, 0.042, 24),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45 })
    );
    cap.position.y = 0.255;
    group.add(cap);

    dropperBulbMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.028, 0.048, 12, 20),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.38 })
    );
    dropperBulbMesh.position.y = 0.31;
    group.add(dropperBulbMesh);

    const proxy = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.40, 0.24),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    proxy.position.y = 0.20;
    proxy.userData = { toolId: 'dropper' };
    group.add(proxy);

    return group;
  }

  /**
   * Microscopio Óptico Compuesto Binocular Profesional a Escala Real (articulado)
   * Altura total ~1.48 unidades (más de 4 veces más alto que los tubos de ensayo de 0.34 u
   * y más alto que el vaso de precipitados de 250 mL).
   * Cada pieza lleva userData.microscopePart para poder seleccionarla y manipularla en 3D:
   * oculares, cabezal, brazo, revólver, objetivos, platina, portaobjetos, macrométrico,
   * micrométrico, condensador, diafragma e iluminador.
   */
  function buildSchoolMicroscope(): THREE.Group {
    const group = new THREE.Group();
    group.position.copy(MICROSCOPE_HOME_POS);
    group.rotation.y = MICROSCOPE_HOME_ROT_Y;
    group.scale.setScalar(1.18);
    group.userData = { toolId: 'microscope' };

    const tag = (obj: THREE.Object3D, part: MicroscopePartId) => {
      obj.traverse((o) => (o.userData = { ...o.userData, microscopePart: part }));
      return obj;
    };

    const enamelMat = new THREE.MeshStandardMaterial({ color: 0xf1f3f5, roughness: 0.28, metalness: 0.18 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.38, metalness: 0.7 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, roughness: 0.14, metalness: 0.95 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x0b0c0f, roughness: 0.85, metalness: 0.05 });

    // 1. ILUMINADOR KÖHLER LED EN BASE ANTIVIBRACIÓN
    const baseGroup = new THREE.Group();
    const footBase = roundedBox(0.40, 0.065, 0.50, 0.02, darkMetalMat);
    footBase.position.set(0, 0.0325, 0);
    baseGroup.add(footBase);
    const upperBase = roundedBox(0.32, 0.045, 0.42, 0.016, enamelMat);
    upperBase.position.set(0, 0.085, -0.02);
    baseGroup.add(upperBase);
    const collector = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.03, 32), darkMetalMat);
    collector.position.set(0, 0.12, 0.09);
    baseGroup.add(collector);
    microscopeLedGlowMat = new THREE.MeshBasicMaterial({ color: 0xf8fbff, toneMapped: false });
    const ledGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.006, 28), microscopeLedGlowMat);
    ledGlow.position.set(0, 0.137, 0.09);
    baseGroup.add(ledGlow);
    // Reóstato lateral de intensidad
    const dimmer = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 24), rubberMat);
    dimmer.rotation.z = Math.PI / 2;
    dimmer.position.set(0.215, 0.06, 0.08);
    baseGroup.add(dimmer);
    group.add(tag(baseGroup, 'illuminator'));

    // 2. BRAZO / COLUMNA EN C
    const armGroup = new THREE.Group();
    const lowerPillar = roundedBox(0.11, 0.5, 0.13, 0.024, enamelMat);
    lowerPillar.position.set(0, 0.34, -0.17);
    armGroup.add(lowerPillar);
    const upperSpine = roundedBox(0.10, 0.42, 0.12, 0.024, enamelMat);
    upperSpine.position.set(0, 0.76, -0.14);
    upperSpine.rotation.x = -0.14;
    armGroup.add(upperSpine);
    const cantilever = roundedBox(0.11, 0.09, 0.26, 0.024, enamelMat);
    cantilever.position.set(0, 0.93, -0.04);
    armGroup.add(cantilever);
    group.add(tag(armGroup, 'arm'));

    // 3. TORNILLOS COAXIALES: macrométrico (exterior) y micrométrico (interior), a ambos lados
    const makeKnob = (radius: number, length: number, mat: THREE.Material, ridges: number) => {
      const holder = new THREE.Group();
      holder.rotation.z = Math.PI / 2; // eje del tornillo a lo largo de X
      const spinner = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 32), mat);
      // Estrías moleteadas para que la rotación sea visible
      for (let i = 0; i < ridges; i++) {
        const a = (i / ridges) * Math.PI * 2;
        const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.006, length * 0.98, 0.006), mat);
        ridge.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
        spinner.add(ridge);
      }
      holder.add(spinner);
      return { holder, spinner };
    };
    const coarse = makeKnob(0.056, 0.2, darkMetalMat, 18);
    coarse.holder.position.set(0, 0.3, -0.16);
    microscopeCoarseKnobMesh = coarse.spinner;
    group.add(tag(coarse.holder, 'coarse_knob'));
    const fine = makeKnob(0.032, 0.26, chromeMat, 12);
    fine.holder.position.set(0, 0.3, -0.16);
    microscopeFineKnobMesh = fine.spinner;
    group.add(tag(fine.holder, 'fine_knob'));

    // 4. CONJUNTO PLATINA (sube y baja con el enfoque): platina X-Y, condensador, diafragma y portaobjetos
    microscopeStageAssembly = new THREE.Group();
    group.add(microscopeStageAssembly);

    const stageGroup = new THREE.Group();
    const stageCarrier = roundedBox(0.09, 0.2, 0.12, 0.016, darkMetalMat);
    stageCarrier.position.set(0, 0.46, -0.09);
    stageGroup.add(stageCarrier);
    const stagePlate = roundedBox(0.32, 0.03, 0.3, 0.012, darkMetalMat);
    stagePlate.position.set(0, 0.545, 0.07);
    stageGroup.add(stagePlate);
    // Carro mecánico con nonio Vernier y mandos coaxiales X-Y colgantes
    const vernierRail = roundedBox(0.3, 0.012, 0.03, 0.004, chromeMat);
    vernierRail.position.set(0, 0.566, -0.05);
    stageGroup.add(vernierRail);
    const xyKnobs = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.09, 20), rubberMat);
    xyKnobs.position.set(0.15, 0.49, 0.12);
    stageGroup.add(xyKnobs);
    microscopeStageAssembly.add(tag(stageGroup, 'stage'));

    const condenserGroup = new THREE.Group();
    const condenser = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.036, 0.075, 32), darkMetalMat);
    condenser.position.set(0, 0.49, 0.09);
    condenserGroup.add(condenser);
    const condenserLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.004, 28),
      new THREE.MeshPhysicalMaterial({ color: 0xdbeafe, transmission: 0.8, transparent: true, opacity: 0.85, roughness: 0.02 })
    );
    condenserLens.position.set(0, 0.529, 0.09);
    condenserGroup.add(condenserLens);
    microscopeStageAssembly.add(tag(condenserGroup, 'condenser'));

    const diaphragmGroup = new THREE.Group();
    const irisRing = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.014, 32), chromeMat);
    irisRing.position.set(0, 0.445, 0.09);
    diaphragmGroup.add(irisRing);
    const irisLever = roundedBox(0.05, 0.008, 0.01, 0.003, rubberMat);
    irisLever.position.set(0.06, 0.445, 0.11);
    diaphragmGroup.add(irisLever);
    microscopeStageAssembly.add(tag(diaphragmGroup, 'diaphragm'));

    // Portaobjetos 76×26 mm con cubreobjetos y muestra teñida (se desplaza con la platina X-Y)
    microscopeSlideGroup = new THREE.Group();
    microscopeSlideGroup.position.set(0, 0.564, 0.09);
    const slideGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.19, 0.006, 0.066),
      new THREE.MeshPhysicalMaterial({ color: 0xe8f4fb, transmission: 0.85, transparent: true, opacity: 0.88, roughness: 0.04 })
    );
    microscopeSlideGroup.add(slideGlass);
    const frostedLabel = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.0065, 0.064),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 })
    );
    frostedLabel.position.x = -0.07;
    microscopeSlideGroup.add(frostedLabel);
    microscopeSpecimenMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.8 });
    const specimen = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.002, 28), microscopeSpecimenMat);
    specimen.position.y = 0.004;
    microscopeSlideGroup.add(specimen);
    const coverSlip = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.0015, 0.05),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, transparent: true, opacity: 0.55, roughness: 0.02 })
    );
    coverSlip.position.y = 0.0055;
    microscopeSlideGroup.add(coverSlip);
    microscopeOilDropMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.009, 16, 12),
      new THREE.MeshPhysicalMaterial({ color: 0xfef3c7, transmission: 0.7, transparent: true, opacity: 0.8, roughness: 0.02 })
    );
    microscopeOilDropMesh.scale.set(1, 0.45, 1);
    microscopeOilDropMesh.position.y = 0.008;
    microscopeOilDropMesh.visible = false;
    microscopeSlideGroup.add(microscopeOilDropMesh);
    // Pinzas de sujeción
    [-0.05, 0.05].forEach((zOff) => {
      const clip = roundedBox(0.09, 0.004, 0.008, 0.002, chromeMat);
      clip.position.set(0.045, 0.004, zOff * 0.62);
      microscopeSlideGroup.add(clip);
    });
    microscopeStageAssembly.add(tag(microscopeSlideGroup, 'slide'));

    // Haz de luz cónico condensador → muestra (visible con el LED encendido)
    microscopeLightBeamMat = new THREE.MeshBasicMaterial({
      color: 0xf8fbff,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    microscopeLightBeamMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.028, 0.03, 24, 1, true),
      microscopeLightBeamMat
    );
    microscopeLightBeamMesh.position.set(0, 0.546, 0.09);
    microscopeStageAssembly.add(microscopeLightBeamMesh);

    // 5. REVÓLVER CUÁDRUPLE INCLINADO + 4 OBJETIVOS DIN (ISO 8578: rojo 4x, amarillo 10x, azul 40x, blanco 100x)
    const revolverTilt = new THREE.Group();
    revolverTilt.position.set(0, 0.875, 0.04);
    revolverTilt.rotation.x = MICROSCOPE_REVOLVER_TILT;
    group.add(revolverTilt);
    microscopeRevolverGroup = new THREE.Group();
    revolverTilt.add(microscopeRevolverGroup);
    const nosepiece = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.04, 36), chromeMat);
    microscopeRevolverGroup.add(tag(nosepiece, 'nosepiece'));
    const knurlRing = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.005, 8, 48), darkMetalMat);
    knurlRing.rotation.x = Math.PI / 2;
    knurlRing.position.y = -0.018;
    microscopeRevolverGroup.add(tag(knurlRing, 'nosepiece'));

    const objectiveDefs: { power: 4 | 10 | 40 | 100; len: number; color: number }[] = [
      { power: 4, len: 0.075, color: 0xef4444 },
      { power: 10, len: 0.1, color: 0xeab308 },
      { power: 40, len: 0.13, color: 0x38bdf8 },
      { power: 100, len: 0.14, color: 0xf8fafc }
    ];
    const revolverAngles: Record<number, number> = { 4: Math.PI / 2, 10: Math.PI, 40: 0, 100: (3 * Math.PI) / 2 };
    objectiveDefs.forEach((def) => {
      const a = revolverAngles[def.power];
      const mount = new THREE.Group();
      mount.position.set(Math.sin(a) * 0.05, -0.02, Math.cos(a) * 0.05);
      mount.rotation.y = a;
      const plumb = new THREE.Group();
      plumb.rotation.x = -MICROSCOPE_REVOLVER_TILT; // queda vertical cuando está en posición de trabajo
      mount.add(plumb);

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.014, def.len, 24), chromeMat);
      barrel.position.y = -def.len / 2;
      plumb.add(barrel);
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0195, 0.0195, 0.012, 24),
        new THREE.MeshBasicMaterial({ color: def.color })
      );
      band.position.y = -def.len * 0.62;
      plumb.add(band);
      if (def.power === 100) {
        const oilRing = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0172, 0.0172, 0.006, 24),
          new THREE.MeshBasicMaterial({ color: 0x0b0c0f })
        );
        oilRing.position.y = -def.len * 0.8;
        plumb.add(oilRing);
      }
      const frontLens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.003, 18),
        new THREE.MeshPhysicalMaterial({ color: 0xbfdbfe, transmission: 0.6, transparent: true, opacity: 0.9, roughness: 0.02 })
      );
      frontLens.position.y = -def.len - 0.001;
      plumb.add(frontLens);
      microscopeRevolverGroup.add(tag(mount, 'objectives'));
    });

    // 6. CABEZAL BINOCULAR SIEDENTOPF (30°) Y OCULARES WF10x/18
    const headGroup = new THREE.Group();
    const headBlock = roundedBox(0.16, 0.11, 0.17, 0.035, enamelMat);
    headBlock.position.set(0, 1.0, 0.04);
    headGroup.add(headBlock);
    const prismHousing = roundedBox(0.2, 0.06, 0.09, 0.025, enamelMat);
    prismHousing.position.set(0, 1.07, 0.08);
    prismHousing.rotation.x = 0.52;
    headGroup.add(prismHousing);
    group.add(tag(headGroup, 'head'));

    [-0.046, 0.046].forEach((xOff) => {
      const ocular = new THREE.Group();
      ocular.position.set(xOff, 1.08, 0.1);
      ocular.rotation.x = 0.52;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.022, 0.16, 24), darkMetalMat);
      tube.position.y = 0.08;
      ocular.add(tube);
      const dioptre = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.018, 24), chromeMat);
      dioptre.position.y = 0.15;
      ocular.add(dioptre);
      const eyeCup = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.025, 0.03, 24), rubberMat);
      eyeCup.position.y = 0.175;
      ocular.add(eyeCup);
      const eyeLens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.016, 0.002, 20),
        new THREE.MeshPhysicalMaterial({ color: 0x93c5fd, transmission: 0.5, transparent: true, opacity: 0.9, roughness: 0.02 })
      );
      eyeLens.position.y = 0.191;
      ocular.add(eyeLens);
      group.add(tag(ocular, 'oculars'));
    });

    // Hitbox global para seleccionar el microscopio cuando está en reposo
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.32, 0.56), new THREE.MeshBasicMaterial({ visible: false }));
    proxy.position.set(0, 0.66, 0);
    proxy.userData = { toolId: 'microscope', isMicroscopeProxy: true };
    group.add(proxy);

    microscopeProxyMesh = proxy;
    microscopeGroup = group;
    loadMicroscopeModel(group, proxy);
    return group;
  }

  function loadMicroscopeModel(group: THREE.Group, proxy: THREE.Object3D) {
    new GLTFLoader().load('/models/instruments/microscope.glb', ({ scene: asset }) => {
      if (sceneDisposed) {
        disposeOwnedResources(asset);
        return;
      }
      // GLTFLoader preserves Blender's original names in userData after sanitizing node names.
      const modelObjects = new Map<string, THREE.Object3D>();
      asset.traverse((object) => modelObjects.set(object.userData.name ?? object.name, object));
      const named = (name: string) => modelObjects.get(name);
      const requireObject = (name: string) => {
        const object = named(name);
        if (!object) throw new Error(`No se encontró la pieza ${name} del microscopio`);
        return object;
      };

      try {
        const stage = requireObject('stage');
        const slide = requireObject('slide');
        const coverslip = requireObject('slide.coverslip');
        const condenser = requireObject('condenser');
        const diaphragm = requireObject('diaphragm');
        const turret = requireObject('objectives');
        requireObject('coarse_knob.left');
        requireObject('fine_knob.left');
        requireObject('illuminator.lens');

        asset.updateMatrixWorld(true);
        const movingParts = new THREE.Group();
        movingParts.name = 'MicroscopeMovingParts';
        group.add(movingParts);
        movingParts.add(asset);

        const stageAssembly = new THREE.Group();
        stageAssembly.name = 'MicroscopeStageAssembly';
        movingParts.add(stageAssembly);
        stageAssembly.attach(stage);
        stageAssembly.attach(condenser);
        stageAssembly.attach(diaphragm);
        for (const [name, object] of modelObjects) {
          if (name.startsWith('stage.') || name.startsWith('condenser.')) stageAssembly.attach(object);
        }
        microscopeStageAssembly = stageAssembly;

        const slideGroup = new THREE.Group();
        slideGroup.name = 'MicroscopeSlideAssembly';
        stageAssembly.add(slideGroup);
        slideGroup.position.copy(slide.position);
        microscopeSlideHome.copy(slideGroup.position);
        slideGroup.attach(slide);
        slideGroup.attach(coverslip);
        microscopeSlideGroup = slideGroup;

        const revolver = new THREE.Group();
        revolver.name = 'MicroscopeRevolver';
        revolver.position.copy(turret.position);
        movingParts.add(revolver);
        revolver.attach(turret);
        for (const [name, object] of modelObjects) {
          if (name.startsWith('objectives.')) revolver.attach(object);
        }
        microscopeRevolverGroup = revolver;

        const makeKnobPivot = (name: string) => {
          const mesh = requireObject(name) as THREE.Mesh;
          const mount = new THREE.Group();
          movingParts.attach(mesh);
          mount.position.copy(mesh.position);
          mount.quaternion.copy(mesh.quaternion);
          movingParts.add(mount);
          const pivot = new THREE.Group();
          mount.add(pivot);
          mesh.position.set(0, 0, 0);
          mesh.rotation.set(0, 0, 0);
          pivot.add(mesh);
          return pivot;
        };
        microscopeCoarseKnobMesh = makeKnobPivot('coarse_knob.left');
        microscopeFineKnobMesh = makeKnobPivot('fine_knob.left');
        const illuminatorLens = requireObject('illuminator.lens') as THREE.Mesh;
        illuminatorLens.material = new THREE.MeshBasicMaterial({ color: 0xd9f0f5, toneMapped: false });
        microscopeLedGlowMat = illuminatorLens.material as THREE.MeshBasicMaterial;

        microscopeSpecimenMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.8 });
        const specimen = new THREE.Mesh(new THREE.SphereGeometry(0.009, 16, 12), microscopeSpecimenMat);
        specimen.name = 'MicroscopeSpecimen';
        specimen.scale.y = 0.05;
        specimen.position.set(0, 0.001, 0);
        slideGroup.add(specimen);

        const oil = new THREE.Mesh(
          new THREE.SphereGeometry(0.009, 16, 12),
          new THREE.MeshPhysicalMaterial({ color: 0xfef3c7, transmission: 0.7, transparent: true, opacity: 0.8, roughness: 0.02 })
        );
        oil.scale.y = 0.45;
        oil.position.set(0, 0.006, 0);
        oil.visible = false;
        slideGroup.add(oil);
        microscopeOilDropMesh = oil;

        microscopeLightBeamMat = new THREE.MeshBasicMaterial({
          color: 0xf8fbff,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false
        });
        microscopeLightBeamMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.006, 0.02, 0.016, 20, 1, true),
          microscopeLightBeamMat
        );
        microscopeLightBeamMesh.position.set(0, 0.174, microscopeSlideHome.z);
        stageAssembly.add(microscopeLightBeamMesh);

        for (const [name, part] of Object.entries({
          base: 'illuminator', arm: 'arm', head: 'head', tube: 'head', stage: 'stage', slide: 'slide',
          condenser: 'condenser', diaphragm: 'diaphragm', illuminator: 'illuminator', objectives: 'nosepiece'
        } satisfies Record<string, MicroscopePartId>)) {
          named(name)?.traverse((object) => { object.userData.microscopePart = part; });
        }
        for (const part of ['oculars', 'objectives', 'coarse_knob', 'fine_knob', 'condenser', 'illuminator', 'slide'] as const) {
          for (const [name, object] of modelObjects) {
            if (name.startsWith(`${part}.`)) object.userData.microscopePart = part;
          }
        }
        for (const [name, object] of modelObjects) {
          if (name.startsWith('stage.clip')) object.userData.microscopePart = 'slide';
        }

        group.scale.setScalar(3);
        movingParts.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
        });
        const discarded = new THREE.Group();
        for (const child of [...group.children]) {
          if (child !== proxy && child !== movingParts) discarded.add(child);
        }
        disposeOwnedResources(discarded);
        proxy.scale.set(0.4, 0.31, 0.45);
        proxy.position.y = 0.205;
      } catch (error) {
        const movingParts = group.getObjectByName('MicroscopeMovingParts');
        if (movingParts) group.remove(movingParts);
        console.error('No se pudo preparar el modelo GLB del microscopio:', error);
      }
    }, undefined, (error) => console.error('No se pudo cargar el modelo GLB del microscopio:', error));
  }

  function buildCentralBeakerStation(glassMaterial: THREE.MeshPhysicalMaterial): THREE.Group {
    const station = new THREE.Group();
    station.position.set(0, 0, 0);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd2d9d6, roughness: 0.42, metalness: 0.15 });
    const plateBase = roundedBox(1.12, 0.09, 1.04, 0.035, bodyMat);
    plateBase.position.y = 0.045;
    station.add(plateBase);
    const top = roundedBox(
      0.94,
      0.015,
      0.83,
      0.007,
      new THREE.MeshStandardMaterial({ color: 0xa9b6b4, roughness: 0.6, metalness: 0.12 })
    );
    top.position.y = 0.095;
    station.add(top);
    const front = textPlate('AGITADOR  /  VIRTUAL', 0.62, 0.043, '#39525c', '#d2d9d6');
    front.position.set(-0.12, 0.048, 0.524);
    station.add(front);
    const knob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 0.022, 24),
      new THREE.MeshStandardMaterial({ color: 0x354d56, roughness: 0.5, metalness: 0.3 })
    );
    knob.rotation.x = Math.PI / 2;
    knob.position.set(0.4, 0.048, 0.53);
    station.add(knob);
    const status = new THREE.Mesh(
      new THREE.CircleGeometry(0.009, 12),
      new THREE.MeshBasicMaterial({ color: 0x93d7be })
    );
    status.position.set(0.31, 0.048, 0.533);
    station.add(status);

    // Anillo térmico incandescente
    heaterGlowRingMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0
    });
    const heaterRing = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.41, 48), heaterGlowRingMat);
    heaterRing.rotation.x = -Math.PI / 2;
    heaterRing.position.y = 0.104;
    station.add(heaterRing);

    const beakerYOffset = 0.1;
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.38, 0.0),
      new THREE.Vector2(0.4, 0.03),
      new THREE.Vector2(0.4, 0.88),
      new THREE.Vector2(0.43, 0.93),
      new THREE.Vector2(0.39, 0.93),
      new THREE.Vector2(0.385, 0.02),
      new THREE.Vector2(0.0, 0.02)
    ];
    const beakerGeo = new THREE.LatheGeometry(pts, 64);
    const beakerMesh = new THREE.Mesh(beakerGeo, glassMaterial);
    beakerMesh.position.y = beakerYOffset;
    beakerMesh.castShadow = true;
    beakerMesh.renderOrder = 3;
    station.add(beakerMesh);

    const rimGeo = new THREE.TorusGeometry(0.41, 0.009, 10, 64);
    const rimMesh = new THREE.Mesh(
      rimGeo,
      new THREE.MeshStandardMaterial({
        color: 0xb3ced6,
        transparent: true,
        opacity: 0.55,
        roughness: 0.2,
        metalness: 0.15
      })
    );
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = beakerYOffset + 0.925;
    station.add(rimMesh);

    const gradGeo = new THREE.CylinderGeometry(0.403, 0.403, 0.86, 64, 1, true);
    const gradTex = createBeakerGraduationsTexture();
    const gradMat = new THREE.MeshBasicMaterial({
      map: gradTex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const gradMesh = new THREE.Mesh(gradGeo, gradMat);
    gradMesh.position.y = beakerYOffset + 0.45;
    gradMesh.rotation.y = Math.PI - 0.18;
    gradMesh.renderOrder = 4;
    station.add(gradMesh);

    const liquidGeo = new THREE.CylinderGeometry(0.38, 0.375, 0.8, 48);
    beakerLiquidMat = new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      transmission: explorationStore.renderQuality === 'basic' ? 0 : 0.55,
      opacity: 0.9,
      transparent: true,
      roughness: 0.12,
      ior: 1.333,
      attenuationColor: new THREE.Color(0x10b981),
      attenuationDistance: 0.6
    });
    beakerLiquidMesh = new THREE.Mesh(liquidGeo, beakerLiquidMat);
    beakerLiquidMesh.position.y = beakerYOffset + 0.02 + (0.8 * currentFillRatio) / 2;
    beakerLiquidMesh.scale.set(1, currentFillRatio, 1);
    beakerLiquidMesh.renderOrder = 2;
    station.add(beakerLiquidMesh);

    const meniscusGeo = new THREE.RingGeometry(0.34, 0.38, 48);
    beakerMeniscusMat = new THREE.MeshBasicMaterial({
      color: 0x6ee7b7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });
    beakerMeniscusMesh = new THREE.Mesh(meniscusGeo, beakerMeniscusMat);
    beakerMeniscusMesh.rotation.x = -Math.PI / 2;
    beakerMeniscusMesh.position.y = beakerYOffset + 0.02 + 0.8 * currentFillRatio + 0.002;
    beakerMeniscusMesh.renderOrder = 3;
    station.add(beakerMeniscusMesh);

    const stirGeo = new THREE.CapsuleGeometry(0.022, 0.14, 8, 16);
    const stirMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2
    });
    stirBarMesh = new THREE.Mesh(stirGeo, stirMat);
    stirBarMesh.rotation.z = Math.PI / 2;
    stirBarMesh.position.y = beakerYOffset + 0.045;
    station.add(stirBarMesh);

    // Partículas de vapor cuando se calienta
    const steamCount = 26;
    const steamPos = new Float32Array(steamCount * 3);
    for (let i = 0; i < steamCount; i++) {
      steamPos[i * 3] = (Math.random() - 0.5) * 0.42;
      steamPos[i * 3 + 1] = 0.6 + Math.random() * 0.7;
      steamPos[i * 3 + 2] = (Math.random() - 0.5) * 0.42;
    }
    steamGeo = new THREE.BufferGeometry();
    steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
    steamParticles = new THREE.Points(
      steamGeo,
      new THREE.PointsMaterial({
        color: 0xe2e8f0,
        size: 0.045,
        transparent: true,
        opacity: 0.45
      })
    );
    steamParticles.visible = false;
    station.add(steamParticles);

    // =========================================================================
    // EFECTOS 3D EN EL VASO CENTRAL PARA LOS EXPERIMENTOS STEAM (PROLONGO & PINTO)
    // =========================================================================

    // 1. Caso 1: Chupa Chups giratorio sumergido en el vaso (Camaleón Químico Redox)
    steamChupaChupsGroup = new THREE.Group();
    steamChupaChupsGroup.visible = false;
    station.add(steamChupaChupsGroup);

    const clampHolder = roundedBox(
      0.16,
      0.032,
      0.05,
      0.008,
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.6 })
    );
    clampHolder.position.set(0.08, 1.12, 0);
    steamChupaChupsGroup.add(clampHolder);

    steamLollipopRotor = new THREE.Group();
    steamLollipopRotor.position.set(0.02, 0.72, 0);
    steamChupaChupsGroup.add(steamLollipopRotor);

    const lollipopStick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, 0.76, 16),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 })
    );
    lollipopStick.position.y = 0.06;
    steamLollipopRotor.add(lollipopStick);

    const candySphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.062, 28, 28),
      new THREE.MeshPhysicalMaterial({
        color: 0xe11d48,
        roughness: 0.14,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08
      })
    );
    candySphere.position.y = -0.32;
    steamLollipopRotor.add(candySphere);

    const candyBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.061, 0.011, 12, 32),
      new THREE.MeshStandardMaterial({ color: 0xfda4af, roughness: 0.25 })
    );
    candyBand.rotation.x = Math.PI / 2;
    candyBand.position.y = -0.32;
    steamLollipopRotor.add(candyBand);

    // 2. Caso 2: Antiburbujas esféricas con película de aire refractiva + capa de Sirope de Agave
    steamAntibubblesGroup = new THREE.Group();
    steamAntibubblesGroup.visible = false;
    station.add(steamAntibubblesGroup);

    const agaveLayer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.372, 0.368, 0.14, 40),
      new THREE.MeshPhysicalMaterial({
        color: 0xd97706,
        transmission: 0.45,
        transparent: true,
        opacity: 0.85,
        roughness: 0.15
      })
    );
    agaveLayer.position.y = beakerYOffset + 0.09;
    steamAntibubblesGroup.add(agaveLayer);

    const strawPipette = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.008, 0.55, 20),
      new THREE.MeshPhysicalMaterial({
        color: 0xe0f2fe,
        transmission: 0.8,
        transparent: true,
        opacity: 0.85,
        roughness: 0.1
      })
    );
    strawPipette.position.set(0.06, 0.96, 0.04);
    strawPipette.rotation.z = -0.14;
    steamAntibubblesGroup.add(strawPipette);

    antibubbleOrbs = [];
    for (let i = 0; i < 9; i++) {
      const orbGroup = new THREE.Group();
      const angle = (i / 9) * Math.PI * 2;
      const rad = 0.08 + (i % 3) * 0.075;
      orbGroup.position.set(
        Math.cos(angle) * rad,
        beakerYOffset + 0.22 + (i % 4) * 0.09,
        Math.sin(angle) * rad
      );

      const innerDrop = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 20, 20),
        new THREE.MeshPhysicalMaterial({
          color: i % 2 === 0 ? 0x0284c7 : 0x38bdf8,
          transmission: 0.35,
          transparent: true,
          opacity: 0.92,
          roughness: 0.1
        })
      );
      orbGroup.add(innerDrop);

      const airShell = new THREE.Mesh(
        new THREE.SphereGeometry(0.033, 24, 24),
        new THREE.MeshPhysicalMaterial({
          color: 0xf0f9ff,
          transmission: 0.88,
          transparent: true,
          opacity: 0.65,
          roughness: 0.04,
          ior: 1.05,
          side: THREE.DoubleSide
        })
      );
      orbGroup.add(airShell);

      antibubbleOrbs.push(orbGroup);
      steamAntibubblesGroup.add(orbGroup);
    }

    // 3. Caso 4: Bloque de Hielo Teñido flotante y penachos convectivos (Agua pura vs Salmuera)
    steamIceConvectionGroup = new THREE.Group();
    steamIceConvectionGroup.visible = false;
    station.add(steamIceConvectionGroup);

    iceCubeMesh = new THREE.Mesh(
      new RoundedBoxGeometry(0.16, 0.11, 0.16, 3, 0.022),
      new THREE.MeshPhysicalMaterial({
        color: 0xe11d48,
        transmission: 0.55,
        transparent: true,
        opacity: 0.88,
        roughness: 0.15,
        ior: 1.31
      })
    );
    iceCubeMesh.position.set(0, 0.45, 0);
    steamIceConvectionGroup.add(iceCubeMesh);

    const plumeCount = 36;
    const plumePos = new Float32Array(plumeCount * 3);
    for (let i = 0; i < plumeCount; i++) {
      plumePos[i * 3] = (Math.random() - 0.5) * 0.18;
      plumePos[i * 3 + 1] = 0.18 + Math.random() * 0.28;
      plumePos[i * 3 + 2] = (Math.random() - 0.5) * 0.18;
    }
    icePlumeGeo = new THREE.BufferGeometry();
    icePlumeGeo.setAttribute('position', new THREE.BufferAttribute(plumePos, 3));
    icePlumeParticles = new THREE.Points(
      icePlumeGeo,
      new THREE.PointsMaterial({
        color: 0xf43f5e,
        size: 0.026,
        transparent: true,
        opacity: 0.85
      })
    );
    steamIceConvectionGroup.add(icePlumeParticles);

    // 4. Caso 3: Bolsita piramidal de Té (Antocianinas y Taninos)
    steamTeaComplexGroup = new THREE.Group();
    steamTeaComplexGroup.visible = false;
    station.add(steamTeaComplexGroup);

    const teaThread = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.58, 8),
      new THREE.MeshBasicMaterial({ color: 0xf8fafc })
    );
    teaThread.position.set(-0.04, 0.72, 0.04);
    steamTeaComplexGroup.add(teaThread);

    const pyramidTeaBag = new THREE.Mesh(
      new THREE.ConeGeometry(0.095, 0.14, 4),
      new THREE.MeshPhysicalMaterial({
        color: 0xfef3c7,
        transmission: 0.55,
        transparent: true,
        opacity: 0.82,
        roughness: 0.4
      })
    );
    pyramidTeaBag.position.set(-0.04, 0.40, 0.04);
    steamTeaComplexGroup.add(pyramidTeaBag);

    // 5. Caso 5: Botijo de Cerámica Porosa / Sistema Pot-in-Pot junto al vaso central
    steamBotijoGroup = new THREE.Group();
    steamBotijoGroup.position.set(0.58, 0.01, 0.42);
    steamBotijoGroup.visible = false;
    station.add(steamBotijoGroup);

    const terracottaMat = new THREE.MeshStandardMaterial({
      color: 0xc2410c,
      roughness: 0.78,
      metalness: 0.05
    });
    const botijoBody = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 28, 24),
      terracottaMat
    );
    botijoBody.scale.set(1, 1.12, 1);
    botijoBody.position.y = 0.16;
    botijoBody.castShadow = true;
    steamBotijoGroup.add(botijoBody);

    const botijoFoot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.095, 0.04, 24),
      terracottaMat
    );
    botijoFoot.position.y = 0.02;
    steamBotijoGroup.add(botijoFoot);

    const botijoHandle = new THREE.Mesh(
      new THREE.TorusGeometry(0.065, 0.014, 12, 28, Math.PI),
      terracottaMat
    );
    botijoHandle.position.set(0, 0.30, 0);
    steamBotijoGroup.add(botijoHandle);

    const botijoSpout = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.024, 0.09, 16),
      terracottaMat
    );
    botijoSpout.position.set(-0.09, 0.28, 0.04);
    botijoSpout.rotation.z = 0.55;
    steamBotijoGroup.add(botijoSpout);

    const botijoMouth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.022, 0.06, 16),
      terracottaMat
    );
    botijoMouth.position.set(0.08, 0.27, -0.02);
    botijoMouth.rotation.z = -0.35;
    steamBotijoGroup.add(botijoMouth);

    // 6. Caso 6: Volatilidad y Fuego Invisible (Etanol y Benceno · Prolongo & Pinto)
    steamBenzeneInvisibleFireGroup = new THREE.Group();
    steamBenzeneInvisibleFireGroup.visible = false;
    station.add(steamBenzeneInvisibleFireGroup);

    const heavyVaporCount = 72;
    const heavyVaporPos = new Float32Array(heavyVaporCount * 3);
    for (let i = 0; i < heavyVaporCount; i++) {
      const ang = (i / heavyVaporCount) * Math.PI * 2;
      const t = (i % 12) / 12;
      const r = 0.36 + t * 0.65;
      heavyVaporPos[i * 3] = Math.cos(ang) * r;
      heavyVaporPos[i * 3 + 1] = Math.max(0.03, 0.92 * (1 - t));
      heavyVaporPos[i * 3 + 2] = Math.sin(ang) * r;
    }
    benzeneHeavyVaporGeo = new THREE.BufferGeometry();
    benzeneHeavyVaporGeo.setAttribute('position', new THREE.BufferAttribute(heavyVaporPos, 3));
    benzeneHeavyVaporParticles = new THREE.Points(
      benzeneHeavyVaporGeo,
      new THREE.PointsMaterial({
        color: 0xfcd34d,
        size: 0.042,
        transparent: true,
        opacity: 0.38,
        depthWrite: false
      })
    );
    steamBenzeneInvisibleFireGroup.add(benzeneHeavyVaporParticles);

    benzeneThermalFlameShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0.45 }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uIntensity;
        varying vec2 vUv;
        varying float vElevation;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float wave = sin(pos.y * 14.0 - uTime * 8.5 + pos.x * 9.0) * 0.028 * vUv.y * uIntensity;
          float waveZ = cos(pos.y * 12.0 - uTime * 7.2 + pos.z * 9.0) * 0.028 * vUv.y * uIntensity;
          pos.x += wave;
          pos.z += waveZ;
          vElevation = vUv.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        varying vec2 vUv;
        varying float vElevation;
        void main() {
          float shimmer = sin(vUv.y * 26.0 - uTime * 11.0 + sin(vUv.x * 18.0 + uTime * 4.0)) * 0.5 + 0.5;
          float rim = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 1.6);
          float fadeTop = smoothstep(1.0, 0.12, vElevation);
          vec3 coldRefraction = vec3(0.45, 0.82, 1.0);
          vec3 hotCore = vec3(1.0, 0.86, 0.48);
          vec3 col = mix(coldRefraction, hotCore, shimmer * 0.55);
          float alpha = (0.07 + shimmer * 0.16) * rim * fadeTop * uIntensity;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    benzeneThermalFlameMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.36, 0.72, 32, 18, true),
      benzeneThermalFlameShaderMat
    );
    benzeneThermalFlameMesh.position.y = 0.96;
    steamBenzeneInvisibleFireGroup.add(benzeneThermalFlameMesh);

    return station;
  }

  /**
   * Construye el Mueble 3D Clasificado de Componentes STEAM (Prolongo & Pinto · RSEQ / Scientix)
   * con 3 repisas categorizadas y 9 componentes modelados en 3D y etiquetados individualmente.
   */
  function buildClassifiedComponentsCabinet(glassMaterial: THREE.MeshPhysicalMaterial): THREE.Group {
    const cabinet = new THREE.Group();
    cabinet.position.set(5.05, 0, -0.32);
    cabinet.rotation.y = -0.42;

    const woodDarkMat = new THREE.MeshStandardMaterial({
      color: 0x3b1d0a,
      roughness: 0.52,
      metalness: 0.12
    });
    const woodShelfMat = new THREE.MeshStandardMaterial({
      color: 0x5c2d10,
      roughness: 0.45,
      metalness: 0.1
    });
    const steelTrimMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.28,
      metalness: 0.8
    });

    // Estructura del mueble: paneles laterales, respaldo, zócalo y cornisa superior
    const sideLeft = roundedBox(0.036, 1.46, 0.34, 0.008, woodDarkMat);
    sideLeft.position.set(-0.54, 0.73, 0);
    cabinet.add(sideLeft);

    const sideRight = roundedBox(0.036, 1.46, 0.34, 0.008, woodDarkMat);
    sideRight.position.set(0.54, 0.73, 0);
    cabinet.add(sideRight);

    const backBoard = roundedBox(1.10, 1.46, 0.022, 0.006, woodDarkMat);
    backBoard.position.set(0, 0.73, -0.16);
    cabinet.add(backBoard);

    const topCrown = roundedBox(1.14, 0.06, 0.38, 0.012, woodDarkMat);
    topCrown.position.set(0, 1.46, 0.01);
    cabinet.add(topCrown);

    // Letrero principal del Mueble 3D en la cornisa superior
    const mainHeader = textPlate(
      'MUEBLE 3D · COMPONENTES CLASIFICADOS STEAM',
      1.08,
      0.088,
      '#fef3c7',
      '#451a03'
    );
    mainHeader.position.set(0, 1.46, 0.205);
    cabinet.add(mainHeader);

    // Alturas de las 3 repisas clasificadas
    // Estante 1 (Superior): y = 0.96 | Estante 2 (Medio): y = 0.50 | Estante 3 (Inferior): y = 0.04
    const shelvesConfig = [
      {
        shelfIndex: 1,
        y: 0.96,
        title: 'ESTANTE 1 · REACTIVOS CASEROS STEAM',
        ink: '#a7f3d0',
        bg: '#064e3b'
      },
      {
        shelfIndex: 2,
        y: 0.50,
        title: 'ESTANTE 2 · REDOX Y COMPLEJOS',
        ink: '#ddd6fe',
        bg: '#3b0764'
      },
      {
        shelfIndex: 3,
        y: 0.04,
        title: 'ESTANTE 3 · FÍSICA Y TERMODINÁMICA',
        ink: '#bae6fd',
        bg: '#0c4a6e'
      }
    ];

    shelvesConfig.forEach((sh) => {
      const board = roundedBox(1.06, 0.028, 0.32, 0.006, woodShelfMat);
      board.position.set(0, sh.y, 0);
      cabinet.add(board);

      // Riel frontal metálico de seguridad y placa de categoría
      const rail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 1.04, 12),
        steelTrimMat
      );
      rail.rotation.z = Math.PI / 2;
      rail.position.set(0, sh.y + 0.036, 0.15);
      cabinet.add(rail);

      const catPlate = textPlate(sh.title, 1.02, 0.034, sh.ink, sh.bg);
      catPlate.position.set(0, sh.y - 0.002, 0.165);
      cabinet.add(catPlate);
    });

    // Construir los 9 componentes 3D clasificados y sus etiquetas individuales
    cabinetItemGroups = [];
    const slotX = [-0.33, 0.0, 0.33];

    CABINET_COMPONENTS.forEach((comp) => {
      const shY = comp.shelfIndex === 0 ? 0.975 : comp.shelfIndex === 1 ? 0.515 : 0.055;
      const xPos = slotX[comp.slotIndex] ?? 0;

      const itemGroup = new THREE.Group();
      itemGroup.position.set(xPos, shY, 0.01);
      itemGroup.userData = { cabinetComponentId: comp.id };

      // Peana circular bajo cada componente
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.095, 0.105, 0.014, 24),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
      );
      pad.position.y = 0.007;
      itemGroup.add(pad);

      // Modelo 3D específico según el componente clasificado
      if (comp.id === 'chupachups_glucose') {
        // Soporte con Chupa Chups esférico rojo/rosa
        const holder = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.045, 0.06, 20),
          steelTrimMat
        );
        holder.position.y = 0.04;
        itemGroup.add(holder);

        const stick = new THREE.Mesh(
          new THREE.CylinderGeometry(0.007, 0.007, 0.18, 12),
          new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        stick.position.y = 0.13;
        itemGroup.add(stick);

        const candy = new THREE.Mesh(
          new THREE.SphereGeometry(0.048, 24, 24),
          new THREE.MeshPhysicalMaterial({ color: 0xe11d48, roughness: 0.15, clearcoat: 1 })
        );
        candy.position.y = 0.23;
        itemGroup.add(candy);

        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.047, 0.008, 10, 24),
          new THREE.MeshStandardMaterial({ color: 0xfda4af })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.23;
        itemGroup.add(ring);
      } else if (comp.id === 'antibubble_kit') {
        // Vaso con agua jabonosa cian y pajita dosificadora
        const cup = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.048, 0.17, 24, 1, true),
          glassMaterial
        );
        cup.position.y = 0.10;
        itemGroup.add(cup);

        const soapLiq = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.044, 0.12, 20),
          new THREE.MeshPhysicalMaterial({
            color: 0x06b6d4,
            transmission: 0.5,
            transparent: true,
            opacity: 0.88
          })
        );
        soapLiq.position.y = 0.075;
        itemGroup.add(soapLiq);

        const straw = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.008, 0.24, 12),
          new THREE.MeshStandardMaterial({ color: 0xfef08a })
        );
        straw.position.set(0.015, 0.16, 0);
        straw.rotation.z = -0.25;
        itemGroup.add(straw);
      } else if (comp.id === 'blue_tea_infusion') {
        // Frasco de infusión de Té Azul / Negro con bolsita piramidal
        const jar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.058, 0.058, 0.18, 24),
          new THREE.MeshPhysicalMaterial({
            color: 0x4f46e5,
            transmission: 0.45,
            transparent: true,
            opacity: 0.9,
            roughness: 0.15
          })
        );
        jar.position.y = 0.105;
        itemGroup.add(jar);

        const pyramid = new THREE.Mesh(
          new THREE.ConeGeometry(0.038, 0.06, 4),
          new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.5 })
        );
        pyramid.position.set(0, 0.22, 0);
        itemGroup.add(pyramid);
      } else if (comp.id === 'kmno4_reagent') {
        // Frasco reactivo violeta oscuro de KMnO4
        const bottle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.056, 0.056, 0.19, 24),
          new THREE.MeshPhysicalMaterial({
            color: 0x7e22ce,
            roughness: 0.2,
            metalness: 0.1,
            clearcoat: 0.8
          })
        );
        bottle.position.y = 0.11;
        itemGroup.add(bottle);

        const neck = new THREE.Mesh(
          new THREE.CylinderGeometry(0.026, 0.032, 0.05, 18),
          new THREE.MeshStandardMaterial({ color: 0x3b0764 })
        );
        neck.position.y = 0.225;
        itemGroup.add(neck);
      } else if (comp.id === 'fe3_tannin') {
        // Par de viales: Sal Férrica Fe3+ (ámbar) y Ditionita (blanco)
        const vialFe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.036, 0.036, 0.17, 20),
          new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25 })
        );
        vialFe.position.set(-0.032, 0.10, 0);
        itemGroup.add(vialFe);

        const vialDith = new THREE.Mesh(
          new THREE.CylinderGeometry(0.036, 0.036, 0.15, 20),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35 })
        );
        vialDith.position.set(0.035, 0.09, 0.01);
        itemGroup.add(vialDith);
      } else if (comp.id === 'agave_syrup') {
        // Bote dosificador dorado de Sirope de Agave
        const syrupBottle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.048, 0.058, 0.18, 24),
          new THREE.MeshPhysicalMaterial({
            color: 0xf59e0b,
            transmission: 0.4,
            transparent: true,
            opacity: 0.92,
            roughness: 0.18
          })
        );
        syrupBottle.position.y = 0.105;
        itemGroup.add(syrupBottle);

        const nozzleCap = new THREE.Mesh(
          new THREE.ConeGeometry(0.028, 0.06, 18),
          new THREE.MeshStandardMaterial({ color: 0xfef08a })
        );
        nozzleCap.position.y = 0.225;
        itemGroup.add(nozzleCap);
      } else if (comp.id === 'dyed_ice_block') {
        // Cubo de hielo teñido de rojo carmín sobre cristalizador
        const dish = new THREE.Mesh(
          new THREE.CylinderGeometry(0.075, 0.07, 0.035, 24),
          glassMaterial
        );
        dish.position.y = 0.032;
        itemGroup.add(dish);

        const ice = new THREE.Mesh(
          new RoundedBoxGeometry(0.085, 0.085, 0.085, 3, 0.014),
          new THREE.MeshPhysicalMaterial({
            color: 0xe11d48,
            transmission: 0.65,
            transparent: true,
            opacity: 0.9,
            roughness: 0.12
          })
        );
        ice.position.y = 0.085;
        ice.rotation.y = 0.35;
        itemGroup.add(ice);
      } else if (comp.id === 'nacl_brine') {
        // Matraz de Salmuera Saturada NaCl con cristales blancos en el fondo
        const brineJar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.055, 0.18, 24),
          new THREE.MeshPhysicalMaterial({
            color: 0x38bdf8,
            transmission: 0.6,
            transparent: true,
            opacity: 0.85,
            roughness: 0.15
          })
        );
        brineJar.position.y = 0.105;
        itemGroup.add(brineJar);

        const saltDeposit = new THREE.Mesh(
          new THREE.CylinderGeometry(0.052, 0.052, 0.035, 20),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
        );
        saltDeposit.position.y = 0.032;
        itemGroup.add(saltDeposit);
      } else if (comp.id === 'ceramic_botijo') {
        // Botijo de arcilla porosa rojiza tradicional
        const clayMat = new THREE.MeshStandardMaterial({
          color: 0xc2410c,
          roughness: 0.78
        });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.068, 24, 20), clayMat);
        body.scale.set(1, 1.15, 1);
        body.position.y = 0.095;
        itemGroup.add(body);

        const handle = new THREE.Mesh(
          new THREE.TorusGeometry(0.034, 0.008, 10, 20, Math.PI),
          clayMat
        );
        handle.position.y = 0.175;
        itemGroup.add(handle);

        const spout = new THREE.Mesh(
          new THREE.CylinderGeometry(0.007, 0.014, 0.05, 12),
          clayMat
        );
        spout.position.set(-0.048, 0.16, 0.02);
        spout.rotation.z = 0.55;
        itemGroup.add(spout);
      }

      // Etiqueta 3D individual con el nombre y fórmula de cada componente
      const shortName =
        comp.id === 'chupachups_glucose'
          ? 'CHUPA CHUPS'
          : comp.id === 'antibubble_kit'
            ? 'ANTIBURBUJAS'
            : comp.id === 'blue_tea_infusion'
              ? 'TÉ AZUL/NEGRO'
              : comp.id === 'kmno4_reagent'
                ? 'KMnO₄ + NaOH'
                : comp.id === 'fe3_tannin'
                  ? 'Fe³⁺ / DITIONITA'
                  : comp.id === 'agave_syrup'
                    ? 'SIROPE AGAVE'
                    : comp.id === 'dyed_ice_block'
                      ? 'HIELO TEÑIDO'
                      : comp.id === 'nacl_brine'
                        ? 'SALMUERA NaCl'
                        : 'BOTIJO POROSO';

      const namePlate = textPlate(shortName, 0.30, 0.042, '#fef3c7', '#1e293b');
      namePlate.position.set(0, 0.032, 0.135);
      namePlate.rotation.x = -0.22;
      namePlate.userData = { cabinetComponentId: comp.id };
      itemGroup.add(namePlate);

      // Hitbox invisible para selección cómoda con ratón o pantalla táctil
      const hitProxy = new THREE.Mesh(
        new THREE.BoxGeometry(0.30, 0.34, 0.28),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitProxy.position.y = 0.17;
      hitProxy.userData = { cabinetComponentId: comp.id };
      itemGroup.add(hitProxy);

      cabinetItemGroups.push(itemGroup);
      cabinet.add(itemGroup);
    });

    return cabinet;
  }

  function buildErlenmeyerFlask(
    id: 'hcl' | 'naoh',
    formula: string,
    subtitle: string,
    colorHex: number,
    accentCss: string,
    xPos: number,
    glassMaterial: THREE.MeshPhysicalMaterial
  ): FlaskRig {
    const coasterGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.012, 40);
    const coasterMat = new THREE.MeshStandardMaterial({
      color: 0x2a414b,
      roughness: 0.8
    });
    const coaster = new THREE.Mesh(coasterGeo, coasterMat);
    coaster.position.set(xPos, 0.006, 0.25);
    coaster.receiveShadow = true;
    scene.add(coaster);

    const ringGeo = new THREE.RingGeometry(0.345, 0.358, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(xPos, 0.014, 0.25);
    scene.add(ringMesh);

    const group = new THREE.Group();
    const homePos = new THREE.Vector3(xPos, 0.02, 0.25);
    group.position.copy(homePos);
    group.userData = { flaskId: id };

    const flaskPts: THREE.Vector2[] = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.3, 0.0),
      new THREE.Vector2(0.33, 0.04),
      new THREE.Vector2(0.32, 0.12),
      new THREE.Vector2(0.11, 0.56),
      new THREE.Vector2(0.11, 0.78),
      new THREE.Vector2(0.135, 0.82),
      new THREE.Vector2(0.095, 0.82),
      new THREE.Vector2(0.095, 0.56),
      new THREE.Vector2(0.3, 0.03),
      new THREE.Vector2(0.0, 0.03)
    ];
    const flaskGeo = new THREE.LatheGeometry(flaskPts, 56);
    const flaskMesh = new THREE.Mesh(flaskGeo, glassMaterial);
    flaskMesh.castShadow = true;
    flaskMesh.renderOrder = 3;
    group.add(flaskMesh);
    const lip = new THREE.Mesh(
      new THREE.TorusGeometry(0.117, 0.008, 8, 40),
      new THREE.MeshStandardMaterial({
        color: 0xb3ced6,
        transparent: true,
        opacity: 0.65,
        roughness: 0.18
      })
    );
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 0.81;
    group.add(lip);
    const marker = textPlate(
      id === 'hcl' ? 'A  /  REACTIVO' : 'B  /  REACTIVO',
      0.43,
      0.068,
      '#bed4da',
      '#2a414b'
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(xPos, 0.015, 0.67);
    scene.add(marker);

    const liqGeo = new THREE.BufferGeometry();
    liqGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(9216), 3).setUsage(THREE.DynamicDrawUsage)
    );
    const liquidMat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      transmission: explorationStore.renderQuality === 'basic' ? 0 : 0.5,
      transparent: true,
      opacity: 0.88,
      roughness: 0.15,
      ior: 1.33,
      side: THREE.DoubleSide
    });
    const liquidMesh = new THREE.Mesh(liqGeo, liquidMat);
    liquidMesh.position.y = 0;
    liquidMesh.renderOrder = 2;
    group.add(liquidMesh);

    const labelGeo = new THREE.CylinderGeometry(0.232, 0.309, 0.16, 40, 1, true, -0.85, 1.7);
    const data = labStore.reagents.find((r) => r.reagentId === id)!;
    const labelTex = createFlaskLabelTexture(
      formula,
      subtitle,
      accentCss,
      `${data.concentrationMolPerL} mol/L · ${data.initialMl} mL`
    );
    const labelMat = new THREE.MeshBasicMaterial({
      map: labelTex,
      transparent: true,
      depthWrite: false
    });
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.position.y = 0.23;
    labelMesh.rotation.y = 0;
    labelMesh.renderOrder = 4;
    group.add(labelMesh);

    const proxyGeo = new THREE.CylinderGeometry(0.28, 0.34, 0.85, 16);
    const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
    const proxyMesh = new THREE.Mesh(proxyGeo, proxyMat);
    proxyMesh.position.y = 0.42;
    proxyMesh.userData = { flaskId: id };
    group.add(proxyMesh);

    scene.add(group);

    return {
      id,
      group,
      liquidMesh,
      liquidMat,
      labelMesh,
      ringMesh,
      ringMat,
      homePos,
      targetPos: homePos.clone(),
      targetRotZ: 0,
      fluidHeight: 0,
      fluidKey: '',
      colorHex
    };
  }

  function buildPhMeterInstrument(): THREE.Group {
    const group = new THREE.Group();
    group.userData = { toolId: 'ph_meter' };

    const housing = new THREE.MeshStandardMaterial({ color: 0xbfcac9, roughness: 0.4, metalness: 0.15 });
    const graphite = new THREE.MeshStandardMaterial({ color: 0x2c434e, roughness: 0.5, metalness: 0.25 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x9caeb3, roughness: 0.28, metalness: 0.7 });
    const foot = roundedBox(0.54, 0.04, 0.34, 0.015, graphite);
    foot.position.set(-0.92, 0.026, -0.68);
    group.add(foot);
    const support = roundedBox(0.06, 0.51, 0.055, 0.015, steel);
    support.position.set(-0.92, 0.29, -0.72);
    group.add(support);
    const body = roundedBox(0.68, 0.38, 0.09, 0.035, housing);
    body.position.set(-0.92, 0.63, -0.65);
    body.rotation.x = -0.2;
    body.userData = { toolId: 'ph_meter' };
    group.add(body);

    phScreenCanvas = document.createElement('canvas');
    phScreenCanvas.width = 512;
    phScreenCanvas.height = 256;
    phScreenCtx = phScreenCanvas.getContext('2d');
    phScreenTexture = new THREE.CanvasTexture(phScreenCanvas);
    phScreenTexture.colorSpace = THREE.SRGBColorSpace;
    const display = new THREE.Mesh(
      new THREE.PlaneGeometry(0.59, 0.295),
      new THREE.MeshBasicMaterial({ map: phScreenTexture, toneMapped: false })
    );
    display.position.set(0, 0.018, 0.047);
    display.userData = { toolId: 'ph_meter' };
    body.add(display);
    [-0.2, 0, 0.2].forEach((x) => {
      const key = roundedBox(0.08, 0.02, 0.007, 0.003, graphite);
      key.position.set(x, -0.157, 0.047);
      body.add(key);
    });
    const standFoot = roundedBox(0.3, 0.04, 0.29, 0.015, graphite);
    standFoot.position.set(0.59, 0.026, -0.43);
    group.add(standFoot);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.23, 18), steel);
    rod.position.set(0.59, 0.65, -0.43);
    group.add(rod);
    const start = new THREE.Vector3(0.59, 1.23, -0.43),
      end = new THREE.Vector3(0.12, 1.23, 0.04);
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, start.distanceTo(end), 16),
      steel
    );
    arm.position.copy(start).add(end).multiplyScalar(0.5);
    arm.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      end.clone().sub(start).normalize()
    );
    group.add(arm);
    const clamp = roundedBox(0.065, 0.07, 0.065, 0.012, graphite);
    clamp.position.copy(start);
    group.add(clamp);
    const probeHead = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.14, 18), graphite);
    probeHead.position.set(0.12, 1.15, 0.04);
    group.add(probeHead);
    const probe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.86, 18),
      new THREE.MeshStandardMaterial({
        color: 0xa6c7cd,
        roughness: 0.3,
        metalness: 0.15,
        transparent: true,
        opacity: 0.65
      })
    );
    probe.position.set(0.12, 0.65, 0.04);
    group.add(probe);
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xb3dcd5, roughness: 0.23 })
    );
    tip.position.set(0.12, 0.21, 0.04);
    group.add(tip);
    const cable = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.80, 0.6, -0.72),
      new THREE.Vector3(-0.55, 0.15, -0.95),
      new THREE.Vector3(0.4, 0.13, -0.85),
      new THREE.Vector3(0.6, 1.27, -0.45),
      new THREE.Vector3(0.12, 1.27, 0.04)
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(cable, 45, 0.007, 6, false), graphite));
    const current = explorationStore.result;
    drawPhMeterScreen(
      labStore.isExplorationMode ? current.pH : (labStore.beaker.currentResult?.pH ?? 7),
      labStore.isExplorationMode ? current.temperatureC : 25,
      'REFERENCIA 25 C',
      current.color,
      labStore.totalVolumeMl
    );
    return group;
  }

  /**
   * Acción física de cada pieza del microscopio al hacer clic sobre ella en 3D
   * (Shift + clic invierte el sentido en tornillos y platina).
   */
  function handleMicroscopePartClick(partId: MicroscopePartId, reverse = false) {
    const dir = reverse ? -1 : 1;
    switch (partId) {
      case 'nosepiece':
      case 'objectives':
        labStore.cycleMicroscopeObjective();
        break;
      case 'coarse_knob':
        labStore.adjustCoarseFocus(25 * dir);
        break;
      case 'fine_knob':
        labStore.adjustFineFocus(4 * dir);
        break;
      case 'illuminator':
        labStore.microscopeLampOn = !labStore.microscopeLampOn;
        labStore.selectMicroscopePart('illuminator');
        break;
      case 'diaphragm': {
        const next = labStore.microscopeDiaphragm + 0.15 * dir;
        labStore.microscopeDiaphragm = next > 1.001 ? 0.15 : next < 0.15 ? 1 : Number(next.toFixed(2));
        labStore.selectMicroscopePart('diaphragm');
        break;
      }
      case 'stage':
        labStore.moveMicroscopeStage(120 * dir, 0);
        break;
      default:
        labStore.selectMicroscopePart(partId);
    }
  }

  function handleToolInteraction(toolId: LabToolInfo['id']) {
    labStore.inspectTool(toolId);
    if (toolId === 'burette') {
      labStore.doseFromBurette(1.0);
    } else if (toolId === 'thermometer') {
      labStore.cycleTemperature();
    } else if (toolId === 'ph_strips') {
      labStore.dipPhPaperStrip();
    } else if (toolId === 'dropper') {
      labStore.squeezeIndicatorDropper();
    }
  }

  onMount(() => {
    const width = container.clientWidth;
    const height = container.clientHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdce7ec);
    scene.fog = new THREE.FogExp2(0xdce7ec, 0.015);

    camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    camera.position.set(0.08, 1.9, 3.45);

    const isLowEndDevice = () => {
      if (typeof navigator === 'undefined') return false;
      const cores = navigator.hardwareConcurrency ?? 4;
      const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
      return cores <= 4 || memory <= 4;
    };
    const lowTier = isLowEndDevice();

    const basicGraphics = explorationStore.renderQuality === 'basic' || lowTier;
    renderer = new THREE.WebGLRenderer({
      antialias: !lowTier,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowTier ? 1.0 : basicGraphics ? 1.0 : 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = !lowTier && !basicGraphics;
    if (renderer.shadowMap.enabled) {
      renderer.shadowMap.type = THREE.PCFShadowMap;
    }

    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute(
      'aria-label',
      'Laboratorio químico 3D interactivo a escala real con vaso de precipitado de 250 mL, bureta volumétrica de 50 mL, microscopio compuesto binocular, pH-metro digital, termómetro, tiras de papel pH, gotero ámbar y Libro 3D.'
    );
    container.appendChild(renderer.domElement);

    if (!basicGraphics) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
      scene.environmentIntensity = 0.88;
      roomEnv.dispose();
      pmremGenerator.dispose();
    }

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.57, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.1;
    controls.maxDistance = 5.2;
    controls.minPolarAngle = Math.PI * 0.2;
    controls.maxPolarAngle = Math.PI * 0.46;
    controls.minAzimuthAngle = -Math.PI * 0.35;
    controls.maxAzimuthAngle = Math.PI * 0.35;
    controls.enablePan = false;
    controls.update();

    // Controlador de Personaje en Primera Persona (Pasear libremente por el Laboratorio)
    fpController = new FirstPersonController(camera, renderer.domElement);
    fpController.attach();

    function onGlobalShortcuts(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'KeyV') {
        labStore.toggleFirstPersonWalk();
      } else if (e.code === 'KeyE' && labStore.isFirstPersonWalking && labStore.nearbyStationPrompt) {
        labStore.enterStationFromWalk(labStore.nearbyStationPrompt);
      }
    }
    window.addEventListener('keydown', onGlobalShortcuts);

    // Iluminación diáfana de laboratorio profesional (Luz blanca pura de alto rendimiento)
    const ambientLight = new THREE.HemisphereLight(0xffffff, 0xc8dce5, 1.65);
    scene.add(ambientLight);

    keyLight = new THREE.DirectionalLight(0xfffbf5, 2.2);
    keyLight.position.set(2.0, 3.4, 2.5);
    keyLight.castShadow = !lowTier && !basicGraphics;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0002;
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 10;
    scene.add(keyLight);

    const rimLight = new THREE.SpotLight(0xa8d9e0, 6, 10, Math.PI / 3, 0.5);
    rimLight.position.set(-2.5, 3.0, -2.0);
    scene.add(rimLight);

    // Luz focalizada sobre la Estación STEAM
    const bookSpotLight = new THREE.SpotLight(0xfef3c7, 6.0, 7, Math.PI / 4, 0.5);
    bookSpotLight.position.set(4.3, 2.4, 1.2);
    bookSpotLight.target.position.set(4.3, 0.2, 0.2);
    scene.add(bookSpotLight);
    scene.add(bookSpotLight.target);

    underGlowLight = new THREE.PointLight(0x10b981, 0.35, 1.1);
    underGlowLight.position.set(0, 0.25, 0);
    scene.add(underGlowLight);

    // Falso Techo Modular Técnico con Luminarias LED Cleanroom, Difusores HVAC y Sprinklers
    const ceilingAndLighting = buildLaboratoryCeilingAndLighting();
    scene.add(ceilingAndLighting);

    // Paredes Perimetrales Higiénicas con Zócalo Sanitario
    const perimeterWalls = buildLaboratoryPerimeterWalls();
    doubleDoorsRig = (perimeterWalls.userData.doubleDoors as DoubleDoorsRig) || null;
    scene.add(perimeterWalls);

    const trimMat = new THREE.MeshStandardMaterial({ color: 0x334c59, roughness: 0.4, metalness: 0.45 });

    // =========================================================================
    // 1. MESA CENTRAL: QUÍMICA ANALÍTICA Y REACCIONES (x = 0)
    // Dimensiones ampliadas: 4.4m ancho × 2.6m profundidad (Mesa Isla Profesional)
    // =========================================================================
    const chemBench = buildProfessionalLabBench({
      stationId: 'quimica',
      width: 4.4,
      depth: 2.6,
      position: new THREE.Vector3(0, 0, 0),
      label: '1. Química Analítica & Reacciones',
      labelAccentColor: '#38bdf8',
      hasReagentOverheadRack: true,
      hasPlumbingAndSink: true,
      hasGasTurret: true,
      hasElectricalStrip: true,
      hasTestTubeRack: true,
      hasWashBottle: true
    });
    scene.add(chemBench);

    // =========================================================================
    // 2. MESA LATERAL IZQUIERDA: BIOLOGÍA Y MICROSCOPÍA ÓPTICA (x = -4.3)
    // Dimensiones ampliadas: 3.5m ancho × 2.4m profundidad
    // =========================================================================
    const bioBench = buildProfessionalLabBench({
      stationId: 'biologia',
      width: 3.5,
      depth: 2.4,
      position: new THREE.Vector3(-4.3, 0, 0.15),
      label: '2. Biología Celular & Microscopía',
      labelAccentColor: '#4ade80',
      hasReagentOverheadRack: false, // Área diáfana para el microscopio
      hasPlumbingAndSink: false,
      hasElectricalStrip: true,
      hasWashBottle: true
    });
    scene.add(bioBench);

    // =========================================================================
    // 3. MESA LATERAL DERECHA: CIENCIAS STEAM Y FÍSICA (x = 4.3)
    // Dimensiones ampliadas: 3.5m ancho × 2.4m profundidad
    // =========================================================================
    const steamBench = buildProfessionalLabBench({
      stationId: 'steam',
      width: 3.5,
      depth: 2.4,
      position: new THREE.Vector3(4.3, 0, 0.15),
      label: '3. Ciencias STEAM & Física Cotidiana',
      labelAccentColor: '#facc15',
      hasReagentOverheadRack: true,
      hasElectricalStrip: true,
      hasTestTubeRack: true
    });
    scene.add(steamBench);

    // Suelo técnico de laboratorio (Losas higiénicas termosoldadas de linóleo)
    const floorTexture = createLabFloorTexture();
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 40),
      new THREE.MeshStandardMaterial({
        map: floorTexture,
        roughness: 0.65,
        metalness: 0.12
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.55;
    floor.receiveShadow = true;
    scene.add(floor);

    const borosilicateGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xcce4ec,
      transmission: basicGraphics ? 0 : 0.92,
      opacity: basicGraphics ? 0.1 : 1,
      depthWrite: !basicGraphics,
      transparent: true,
      roughness: 0.06,
      ior: 1.47,
      thickness: 0.08,
      reflectivity: 0.9,
      side: THREE.FrontSide
    });

    interactiveToolGroups = [];

    // Entorno arquitectónico + Gradilla de tubos de ensayo + Pósters
    const labEnv = buildLabEnvironmentAndRack(borosilicateGlassMat);
    scene.add(labEnv);

    // Vaso central + pH-metro
    const beakerStation = buildCentralBeakerStation(borosilicateGlassMat);
    scene.add(beakerStation);

    const phMeter = buildPhMeterInstrument();
    interactiveToolGroups.push(phMeter);
    scene.add(phMeter);

    // Instrumentos a escala real: Bureta, Termómetro, Tiras de pH, Gotero y Microscopio Binocular
    const buretteStation = buildBuretteStation(borosilicateGlassMat);
    interactiveToolGroups.push(buretteStation);
    scene.add(buretteStation);

    const digitalThermo = buildDigitalThermometer();
    interactiveToolGroups.push(digitalThermo);
    scene.add(digitalThermo);

    const phStripsBox = buildPhPaperStripsDispenser(borosilicateGlassMat);
    interactiveToolGroups.push(phStripsBox);
    scene.add(phStripsBox);

    const dropperBottle = buildIndicatorDropperBottle();
    interactiveToolGroups.push(dropperBottle);
    scene.add(dropperBottle);

    const microscope = buildSchoolMicroscope();
    interactiveToolGroups.push(microscope);
    scene.add(microscope);

    // Base antivibración permanente bajo el microscopio en la Estación de Biología
    microscopeFocusPedestal = new THREE.Group();
    microscopeFocusPedestal.position.set(MICROSCOPE_BIOLOGY_POS.x, 0, MICROSCOPE_BIOLOGY_POS.z);
    const pedestalTop = roundedBox(
      0.72,
      0.03,
      0.72,
      0.018,
      new THREE.MeshPhysicalMaterial({ color: 0x16181f, roughness: 0.35, metalness: 0.4, clearcoat: 0.8 })
    );
    pedestalTop.position.y = 0.015;
    microscopeFocusPedestal.add(pedestalTop);
    const pedestalHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.40, 0.43, 64),
      new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    pedestalHalo.rotation.x = -Math.PI / 2;
    pedestalHalo.position.y = 0.032;
    microscopeFocusPedestal.add(pedestalHalo);
    microscopeFocusPedestal.scale.setScalar(1);
    microscopeFocusPedestal.visible = true;
    scene.add(microscopeFocusPedestal);

    // Luz de estudio sobre la estación óptica de Biología
    const microscopeKeyLight = new THREE.SpotLight(0xf0fdf4, 6.0, 7, Math.PI / 4, 0.5);
    microscopeKeyLight.position.set(MICROSCOPE_BIOLOGY_POS.x + 0.5, 2.5, MICROSCOPE_BIOLOGY_POS.z + 1.0);
    microscopeKeyLight.target.position.copy(MICROSCOPE_BIOLOGY_POS);
    scene.add(microscopeKeyLight);
    scene.add(microscopeKeyLight.target);

    // Instrumentación y accesorios especializados de la mesa de Biología
    const biologyAccessories = buildBiologyWorkstationAccessories(borosilicateGlassMat);
    scene.add(biologyAccessories);

    // Matraces Erlenmeyer (Izquierda y Derecha) con separación holgada
    const hclRig = buildErlenmeyerFlask(
      'hcl',
      labStore.reagents[0].formula,
      labStore.reagents[0].name,
      parseInt(labStore.reagents[0].colorHex.slice(1), 16),
      labStore.reagents[0].colorHex,
      -1.25,
      borosilicateGlassMat
    );
    const naohRig = buildErlenmeyerFlask(
      'naoh',
      labStore.reagents[1].formula,
      labStore.reagents[1].name,
      parseInt(labStore.reagents[1].colorHex.slice(1), 16),
      labStore.reagents[1].colorHex,
      1.25,
      borosilicateGlassMat
    );
    flasks = { hcl: hclRig, naoh: naohRig };

    // Libro 3D en el costado derecho de la mesa
    bookGroup = buildInteractiveHomeBook();
    scene.add(bookGroup);

    // Mueble 3D Clasificado de Componentes STEAM (Prolongo & Pinto · RSEQ / Scientix)
    const componentsCabinet = buildClassifiedComponentsCabinet(borosilicateGlassMat);
    scene.add(componentsCabinet);

    // Infraestructura Integral de Bioseguridad y Normativa Oficial (Ducha, Lavaojos, Extintor, Vestidor EPP)
    const safetyInteractiveItems: { mesh: THREE.Object3D; hit: SafetyInteractiveHit }[] = [];
    safetyInfrastructureGroup = buildCompleteLabSafetyInfrastructure(safetyInteractiveItems);
    scene.add(safetyInfrastructureGroup);

    // Mobiliario perimetral modelado en Blender: campana, cabina de bioseguridad, armarios de seguridad,
    // equipos de frío, mesada instrumental, perchero de batas, dispensadores de EPP, lavamanos y residuos.
    new GLTFLoader().load(
      LAB_PROPS_URL,
      ({ scene: asset }) => {
        if (sceneDisposed) {
          disposeOwnedResources(asset);
          return;
        }
        asset.name = 'LabPerimeterProps';
        const colliders = extractLabPropColliders(asset);
        prepareLabPropsAsset(asset, { basicGraphics, shadows: !lowTier && !basicGraphics });
        scene.add(asset);
        fpController?.setSceneColliders(colliders);
      },
      undefined,
      (error) => console.warn('No se pudo cargar el mobiliario del laboratorio', error)
    );

    // Manos 3D Articuladas con MediaPipe y Filtro 1-Euro (Opción 1)
    arHandRig = new ARHandMeshRig();
    scene.add(arHandRig.group);

    // Sistema Frugal de Partículas Físicas y Efectos del Laboratorio (Opción 3)
    safetyFx = new LabSafetyFXSystem();
    scene.add(safetyFx.group);

    const lid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.415, 0.415, 0.018, 48),
      new THREE.MeshStandardMaterial({
        color: 0xa8bcbd,
        metalness: 0.5,
        roughness: 0.35,
        transparent: true,
        opacity: 0.72
      })
    );
    lid.position.set(0, 1.04, 0);
    lid.visible = false;
    scene.add(lid);
    const sediment = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.1, 40),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.85 })
    );
    sediment.position.set(0, 0.13, 0);
    sediment.visible = false;
    scene.add(sediment);
    const bubbleGeo = new THREE.BufferGeometry();
    bubbleGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(90), 3));
    const bubbles = new THREE.Points(
      bubbleGeo,
      new THREE.PointsMaterial({ color: 0xe0f2fe, size: 0.018, transparent: true, opacity: 0.7 })
    );
    bubbles.visible = false;
    scene.add(bubbles);
    let lastGas = 0,
      bubblingUntil = 0;

    // Chorro de vertido 3D y partículas
    const streamGeo = new THREE.CylinderGeometry(0.012, 0.022, 0.65, 16);
    pourStreamMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.85
    });
    pourStreamMesh = new THREE.Mesh(streamGeo, pourStreamMat);
    pourStreamMesh.visible = false;
    scene.add(pourStreamMesh);

    const particleCount = 28;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.35;
      positions[i * 3 + 1] = Math.random() * 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.35;
    }
    splashGeo = new THREE.BufferGeometry();
    splashGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const splashMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.035,
      transparent: true,
      opacity: 0.75
    });
    splashParticles = new THREE.Points(splashGeo, splashMat);
    splashParticles.position.set(0, 0.15, 0);
    splashParticles.visible = false;
    scene.add(splashParticles);

    // Raycaster para Matraces, Herramientas y Libro 3D en la mesa
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.15);
    const intersectPt = new THREE.Vector3();
    const dragOffset = new THREE.Vector3();
    let activePointerId: number | null = null;
    let gestureFlaskId: 'hcl' | 'naoh' | null = null;
    let wasPinched = labStore.gestureInput?.pinched ?? false;
    const gestureOffset = new THREE.Vector3();
    const gesturePlane = new THREE.Plane();
    let grabbedPalmSize = 0;
    let handHoveredFlaskId: 'hcl' | 'naoh' | null = null;
    let lastHandSeen = 0;

    function releaseGesture() {
      if (gestureFlaskId) {
        const rig = flasks[gestureFlaskId];
        rig.targetPos.copy(rig.homePos);
        rig.targetRotZ = 0;
        flowAccumulator = 0;
      }
      gestureFlaskId = null;
      if (!draggedFlaskId) controls.enabled = true;
    }

    function moveFlask(rig: FlaskRig, point: THREE.Vector3, tilt: number) {
      const x = THREE.MathUtils.clamp(point.x, -1.4, 1.25);
      const z = THREE.MathUtils.clamp(point.z, -0.4, 0.6);
      const overZone = Math.hypot(x, z) < 0.68;
      if (overZone) {
        const side = rig.id === 'hcl' ? -1 : 1;
        rig.targetPos.set(side * 0.9, 1.65, 0);
        rig.targetRotZ = side * 1.95 * THREE.MathUtils.clamp(tilt, 0, 1);
      } else {
        rig.targetPos.set(x, 0.22, z);
        rig.targetRotZ = 0;
      }
      return overZone;
    }

    function updatePointer(e: PointerEvent) {
      const rect = renderer!.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
    }

    function checkInteractiveHit(
      e: PointerEvent
    ):
      | { type: 'flask'; id: 'hcl' | 'naoh' }
      | { type: 'book' }
      | { type: 'tool'; toolId: LabToolInfo['id']; specimenId?: MicroscopeSpecimenId }
      | { type: 'cabinet'; compId: string }
      | { type: 'microscopePart'; partId: MicroscopePartId }
      | { type: 'safety'; safetyHit: SafetyInteractiveHit }
      | null {
      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);
      const microActive = labStore.isMicroscopeActive;
      // En modo enfoque solo el microscopio es interactivo: la atención queda centrada en él
      const targets = microActive
        ? [microscopeGroup]
        : [
            flasks.hcl.group,
            flasks.naoh.group,
            bookGroup,
            ...(safetyInfrastructureGroup ? [safetyInfrastructureGroup] : []),
            ...interactiveToolGroups,
            ...cabinetItemGroups
          ];
      const hits = raycaster
        .intersectObjects(targets, true)
        .filter((h) => !(microActive && h.object === microscopeProxyMesh));
      if (hits.length === 0) return null;

      let curr: THREE.Object3D | null = hits[0].object;
      while (curr) {
        if (curr.userData?.microscopePart && microActive)
          return { type: 'microscopePart', partId: curr.userData.microscopePart };
        if (curr.userData?.specimenId)
          return { type: 'tool', toolId: 'microscope_slide' as LabToolInfo['id'], specimenId: curr.userData.specimenId };
        if (curr.userData?.flaskId) return { type: 'flask', id: curr.userData.flaskId };
        if (curr.userData?.isHomeBook) return { type: 'book' };
        if (curr.userData?.toolId) return { type: 'tool', toolId: curr.userData.toolId };
        if (curr.userData?.cabinetComponentId)
          return { type: 'cabinet', compId: curr.userData.cabinetComponentId };
        if (curr.userData?.safetyHit)
          return { type: 'safety', safetyHit: curr.userData.safetyHit as SafetyInteractiveHit };
        curr = curr.parent;
      }
      return null;
    }

    function onPointerDown(e: PointerEvent) {
      if (
        e.button !== 0 ||
        activePointerId !== null ||
        labStore.activePourAnim ||
        (labStore.isExplorationMode && explorationStore.pendingSafety)
      )
        return;
      const hit = checkInteractiveHit(e);
      if (!hit) return;

      if (hit.type === 'safety') {
        const safety = hit.safetyHit;
        if (safety.type === 'safety_equipment') {
          if (safety.subItem === 'coat') {
            labStore.toggleSafetyCoat();
          } else if (safety.subItem === 'goggles') {
            labStore.toggleSafetyGoggles();
          } else if (safety.subItem === 'nitrile_gloves') {
            labStore.setSafetyGloves(labStore.safetyGlovesType === 'nitrile_blue' ? 'none' : 'nitrile_blue');
          } else if (safety.subItem === 'latex_gloves') {
            labStore.setSafetyGloves(labStore.safetyGlovesType === 'latex_white' ? 'none' : 'latex_white');
          }
        } else if (safety.type === 'emergency_shower') {
          labStore.triggerEmergencyShower();
        } else if (safety.type === 'eyewash') {
          labStore.triggerEmergencyEyewash();
        } else if (safety.type === 'fire_extinguisher') {
          labStore.triggerFireExtinguisher();
        }
        return;
      }

      if (hit.type === 'microscopePart') {
        labStore.setStation('biologia');
        handleMicroscopePartClick(hit.partId, e.shiftKey);
        return;
      }

      if (hit.type === 'book') {
        labSound.playBookOpen();
        labStore.setStation('steam');
        labStore.isHomeBookOpen = true;
        return;
      }

      if (hit.type === 'tool') {
        if (hit.toolId === 'microscope') {
          labStore.setStation('biologia');
          labStore.openMicroscope();
          return;
        }
        if (hit.toolId === ('microscope_slide' as LabToolInfo['id']) && hit.specimenId) {
          labSound.playInstrumentClick();
          labStore.setStation('biologia');
          labStore.selectMicroscopeSpecimen(hit.specimenId);
          return;
        }
        if (hit.toolId === ('immersion_oil' as LabToolInfo['id'])) {
          labSound.playInstrumentClick();
          labStore.setStation('biologia');
          labStore.applyMicroscopeImmersionOil();
          return;
        }
        labStore.setStation('quimica');
        handleToolInteraction(hit.toolId);
        return;
      }

      if (hit.type === 'cabinet') {
        labSound.playInstrumentClick();
        labStore.setStation('steam');
        labStore.selectCabinetComponent(hit.compId as CabinetComponentInfo['id']);
        return;
      }

      if (hit.type === 'flask') {
        labStore.setStation('quimica');
        releaseGesture();
        labStore.selectReagent(hit.id);
        draggedFlaskId = hit.id;
        dragSource = e.pointerType === 'touch' ? 'touch' : 'mouse';
        activePointerId = e.pointerId;
        flowAccumulator = 0;
        dragPlane.constant = -0.15;
        if (raycaster.ray.intersectPlane(dragPlane, intersectPt)) {
          dragOffset.copy(flasks[hit.id].group.position).sub(intersectPt);
          dragOffset.y = 0;
        }
        controls.enabled = false;
        renderer!.domElement.setPointerCapture(e.pointerId);
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (draggedFlaskId) {
        if (e.pointerId !== activePointerId) return;
        updatePointer(e);
        raycaster.setFromCamera(pointer, camera);
        if (raycaster.ray.intersectPlane(dragPlane, intersectPt)) {
          const rig = flasks[draggedFlaskId];
          intersectPt.add(dragOffset);
          isOverPourZone = moveFlask(rig, intersectPt, 1);
        }
        return;
      }

      const hit = checkInteractiveHit(e);
      hoveredMicroscopePartId = hit?.type === 'microscopePart' ? hit.partId : null;
      if (hit?.type === 'microscopePart') {
        hoveredFlaskId = null;
        isBookHovered = false;
        hoveredToolId = null;
        hoveredCabinetId = null;
        renderer!.domElement.style.cursor = 'pointer';
      } else if (hit?.type === 'flask') {
        hoveredFlaskId = hit.id;
        isBookHovered = false;
        hoveredToolId = null;
        hoveredCabinetId = null;
        renderer!.domElement.style.cursor = 'grab';
      } else if (hit?.type === 'book') {
        hoveredFlaskId = null;
        isBookHovered = true;
        hoveredToolId = null;
        hoveredCabinetId = null;
        renderer!.domElement.style.cursor = 'pointer';
      } else if (hit?.type === 'tool') {
        hoveredFlaskId = null;
        isBookHovered = false;
        hoveredToolId = hit.toolId;
        hoveredCabinetId = null;
        renderer!.domElement.style.cursor = 'pointer';
      } else if (hit?.type === 'cabinet') {
        hoveredFlaskId = null;
        isBookHovered = false;
        hoveredToolId = null;
        hoveredCabinetId = hit.compId;
        renderer!.domElement.style.cursor = 'pointer';
      } else {
        hoveredFlaskId = null;
        isBookHovered = false;
        hoveredToolId = null;
        hoveredCabinetId = null;
        renderer!.domElement.style.cursor = 'default';
      }
    }

    function onPointerUp(e: PointerEvent) {
      if (e.pointerId !== activePointerId) return;
      if (draggedFlaskId) {
        const rig = flasks[draggedFlaskId];
        rig.targetPos.copy(rig.homePos);
        rig.targetRotZ = 0;
        isOverPourZone = false;
        draggedFlaskId = null;
        flowAccumulator = 0;
        controls.enabled = true;
        if (renderer?.domElement.hasPointerCapture(e.pointerId)) {
          renderer.domElement.releasePointerCapture(e.pointerId);
        }
      }
      activePointerId = null;
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown, true);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerUp);
    renderer.domElement.addEventListener('lostpointercapture', onPointerUp);

    // Rueda del ratón sobre los tornillos: girarlos como en un microscopio real
    function onMicroscopeWheel(e: WheelEvent) {
      if (!labStore.isMicroscopeActive) return;
      const part = hoveredMicroscopePartId;
      if (part !== 'coarse_knob' && part !== 'fine_knob' && part !== 'diaphragm') return;
      e.preventDefault();
      const dir = e.deltaY < 0 ? 1 : -1;
      if (part === 'coarse_knob') labStore.adjustCoarseFocus(15 * dir);
      else if (part === 'fine_knob') labStore.adjustFineFocus(2 * dir);
      else
        labStore.microscopeDiaphragm = THREE.MathUtils.clamp(
          Number((labStore.microscopeDiaphragm + 0.05 * dir).toFixed(2)),
          0.15,
          1
        );
    }
    renderer.domElement.addEventListener('wheel', onMicroscopeWheel, { passive: false });

    // Encuadre de cámara: se guarda la vista de la mesa para volver al cerrar el microscopio
    const homeCameraPos = camera.position.clone();
    const homeCameraTarget = controls.target.clone();
    const focusCameraTarget = new THREE.Vector3(
      MICROSCOPE_FOCUS_POS.x + 0.42,
      MICROSCOPE_FOCUS_POS.y + 0.68,
      MICROSCOPE_FOCUS_POS.z
    );
    const focusCameraPos = focusCameraTarget.clone().add(new THREE.Vector3(0.22, 0.38, 2.2));
    let microscopeWasActive = false;
    let cameraReturnTimer = 0;
    let revolverAngle = MICROSCOPE_OBJECTIVE_ANGLES[labStore.microscopeObjective];
    const cancelInteraction = () => {
      if (activePointerId !== null) onPointerUp({ pointerId: activePointerId } as PointerEvent);
      labStore.activePourAnim = null;
      releaseGesture();
    };
    const onVisibility = () => {
      if (document.hidden) cancelInteraction();
    };
    window.addEventListener('blur', cancelInteraction);
    document.addEventListener('visibilitychange', onVisibility);

    let interactionRevision = labStore.presetRevision;
    timer = new Timer();

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let isReducedMotion = mediaQuery.matches;
    const onMotionChange = (ev: MediaQueryListEvent) => (isReducedMotion = ev.matches);
    mediaQuery.addEventListener('change', onMotionChange);

    // Ajuste adaptativo de carga gráfica según el intervalo entre cuadros.
    let smoothedFps = 60;
    let lowFpsStreak = 0;
    let adaptiveOptimizationActive = lowTier;
    const unitScale = new THREE.Vector3(1, 1, 1);
    const scaleTarget = new THREE.Vector3();
    const flaskTarget = new THREE.Vector3();
    const nozzle = new THREE.Vector3();
    const gestureDragPlane = new THREE.Plane();

    function animate(timestamp?: number) {
      timer.update(timestamp);
      const dt = Math.min(timer.getDelta(), 0.1);
      const elapsed = timer.getElapsed();

      // Escalado dinámico de carga gráfica si la tasa de cuadros desciende
      if (dt > 0 && dt < 0.2) {
        const instantFps = 1 / dt;
        smoothedFps = smoothedFps * 0.94 + instantFps * 0.06;
        if (smoothedFps < 35) {
          lowFpsStreak++;
          if (lowFpsStreak > 50 && !adaptiveOptimizationActive && renderer) {
            adaptiveOptimizationActive = true;
            renderer.setPixelRatio(1.0);
            renderer.shadowMap.enabled = false;
            if (keyLight) keyLight.castShadow = false;
          }
        } else {
          lowFpsStreak = Math.max(0, lowFpsStreak - 1);
        }
      }
      if (labStore.isExplorationMode) {
        const r = explorationStore.result;
        lid.visible = explorationStore.state.closed;
        sediment.visible = (r.precipitateG ?? 0) > 1e-6;
        sediment.scale.y = Math.min(1, (r.precipitateG ?? 0) * 2);
        sediment.position.y = 0.12 + 0.05 * sediment.scale.y;
        (sediment.material as THREE.MeshStandardMaterial).color.set(
          r.precipitateName?.includes('cobre') ? '#38bdf8' : '#f1f5f9'
        );
        const gas = r.gasMl ?? 0;
        if (gas > lastGas + 1e-5) bubblingUntil = elapsed + 1.5;
        lastGas = gas;
        bubbles.visible = elapsed < bubblingUntil && !isReducedMotion;
        const pos = bubbleGeo.getAttribute('position') as THREE.BufferAttribute;
        if (bubbles.visible) {
          for (let i = 0; i < 30; i++) {
            const age = (elapsed * 0.7 + i / 30) % 1;
            pos.setXYZ(
              i,
              Math.sin(i * 8) * 0.25,
              0.14 + age * Math.max(0.02, 0.8 * currentFillRatio - 0.03),
              Math.cos(i * 7) * 0.25
            );
          }
          pos.needsUpdate = true;
        }
      } else {
        lid.visible = false;
        sediment.visible = false;
        bubbles.visible = false;
      }

      if (interactionRevision !== labStore.presetRevision) {
        interactionRevision = labStore.presetRevision;
        if (activePointerId !== null) onPointerUp({ pointerId: activePointerId } as PointerEvent);
        releaseGesture();
        wasPinched = labStore.gestureInput?.pinched ?? false;
        for (const rig of Object.values(flasks)) {
          rig.targetPos.copy(rig.homePos);
          rig.targetRotZ = 0;
        }
      }

      if (beakerLiquidMat) {
        beakerLiquidMat.color.lerp(targetLiquidColor, dt * 6);
        beakerLiquidMat.attenuationColor.lerp(targetLiquidColor, dt * 6);
        beakerMeniscusMat.color.lerp(targetLiquidColor, dt * 6);
        underGlowLight.color.lerp(targetLiquidColor, dt * 6);
      }

      currentFillRatio = THREE.MathUtils.lerp(currentFillRatio, targetFillRatio, dt * 6);
      if (beakerLiquidMesh && beakerMeniscusMesh) {
        const h = 0.8 * currentFillRatio;
        beakerLiquidMesh.scale.set(1, currentFillRatio, 1);
        beakerLiquidMesh.position.y = 0.12 + h / 2;
        beakerMeniscusMesh.position.y = 0.12 + h + 0.002;
      }

      if (stirBarMesh && !isReducedMotion) {
        const speed = tempC > 35 ? 22 : 14;
        stirBarMesh.rotation.y += dt * speed;
      }

      // Efecto térmico en la placa calefactora y partículas de vapor
      const isHeated = tempC > 30;
      if (heaterGlowRingMat) {
        const targetGlow = isHeated ? 0.65 + Math.sin(elapsed * 5) * 0.2 : 0.0;
        heaterGlowRingMat.opacity = THREE.MathUtils.lerp(heaterGlowRingMat.opacity, targetGlow, dt * 6);
      }
      if (steamParticles) {
        steamParticles.visible = isHeated && !isReducedMotion;
        if (steamParticles.visible) {
          const sAttr = steamGeo.getAttribute('position') as THREE.BufferAttribute;
          for (let i = 0; i < sAttr.count; i++) {
            let sy = sAttr.getY(i) + dt * 0.42;
            if (sy > 1.55) sy = 0.65;
            sAttr.setY(i, sy);
          }
          sAttr.needsUpdate = true;
        }
      }

      // Animación de llave y chorro de la Bureta Graduada 3D
      if (buretteStreamTimer > 0) {
        buretteStreamTimer -= dt;
        if (buretteStreamMesh) buretteStreamMesh.visible = true;
        if (buretteValveMesh) buretteValveMesh.rotation.x = Math.PI / 2;
      } else {
        if (buretteStreamMesh) buretteStreamMesh.visible = false;
        if (buretteValveMesh) buretteValveMesh.rotation.x = 0;
      }

      // Animación del bulbo del Gotero Ámbar
      if (dropperAnimTimer > 0 && dropperBulbMesh) {
        dropperAnimTimer -= dt;
        dropperBulbMesh.scale.set(0.75, 0.85, 0.75);
      } else if (dropperBulbMesh) {
        dropperBulbMesh.scale.lerp(unitScale, dt * 8);
      }

      // Animación de la tira de papel pH
      if (stripDipAnimTimer > 0 && phStripGroup) {
        stripDipAnimTimer -= dt;
        phStripGroup.position.y = 0.028 + Math.sin(stripDipAnimTimer * 12) * 0.028;
      } else if (phStripGroup) {
        phStripGroup.position.y = 0.028;
      }

      // Animación de realce cuando el usuario apunta al Libro 3D en la mesa
      if (bookGroup && bookGlowRing) {
        const targetBookY = isBookHovered ? 0.065 : 0.02;
        bookGroup.position.y = THREE.MathUtils.lerp(bookGroup.position.y, targetBookY, dt * 10);
        const pulseScale = isBookHovered ? 1.12 : 1.0 + Math.sin(elapsed * 3) * 0.04;
        bookGlowRing.scale.setScalar(pulseScale);
        (bookGlowRing.material as THREE.MeshBasicMaterial).opacity = isBookHovered ? 0.95 : 0.45;
      }

      // Realce 3D suave en los componentes clasificados del Mueble 3D al pasar el ratón o seleccionarlos
      cabinetItemGroups.forEach((grp) => {
        const cid = grp.userData?.cabinetComponentId;
        const isHot = cid === hoveredCabinetId || cid === labStore.selectedCabinetComponentId;
        const targetScale = isHot ? 1.16 : 1.0;
        grp.scale.lerp(scaleTarget.setScalar(targetScale), dt * 10);
      });

      // Animación 3D en vivo de los Efectos STEAM en el Vaso Central (Prolongo & Pinto)
      const steamEff = labStore.isExplorationMode ? 'none' : labStore.activeSteamEffect;
      if (steamChupaChupsGroup) {
        steamChupaChupsGroup.visible = steamEff === 'chupachups';
        if (steamChupaChupsGroup.visible && steamLollipopRotor && !isReducedMotion) {
          steamLollipopRotor.rotation.y += dt * 7.5;
          steamLollipopRotor.position.x = Math.sin(elapsed * 5) * 0.03;
          steamLollipopRotor.position.z = Math.cos(elapsed * 5) * 0.03;
        }
      }

      if (steamAntibubblesGroup) {
        steamAntibubblesGroup.visible = steamEff === 'antibubbles';
        if (steamAntibubblesGroup.visible && !isReducedMotion) {
          const maxLiqY = Math.max(0.28, 0.12 + 0.8 * currentFillRatio - 0.05);
          antibubbleOrbs.forEach((orb, idx) => {
            const baseH = 0.24 + ((idx * 0.065) % Math.max(0.12, maxLiqY - 0.24));
            orb.position.y = baseH + Math.sin(elapsed * 2.2 + idx * 1.1) * 0.025;
            orb.rotation.y = elapsed * 0.8 + idx;
          });
        }
      }

      if (steamIceConvectionGroup) {
        steamIceConvectionGroup.visible = steamEff === 'ice_convection';
        if (steamIceConvectionGroup.visible && iceCubeMesh && icePlumeGeo) {
          const meniscusY = 0.12 + 0.8 * currentFillRatio;
          iceCubeMesh.position.y = Math.max(0.22, meniscusY - 0.025) + Math.sin(elapsed * 2.5) * 0.008;
          iceCubeMesh.rotation.y = elapsed * 0.25;

          const brineMl = labStore.beaker.baseVolumeMl;
          const pAttr = icePlumeGeo.getAttribute('position') as THREE.BufferAttribute;
          for (let i = 0; i < pAttr.count; i++) {
            if (brineMl > 8) {
              // En salmuera saturada (NaCl), el agua fundida fría flota atrapada arriba (estratificación)
              const topBandY = Math.max(0.20, meniscusY - 0.02 - ((i % 5) * 0.015));
              pAttr.setY(i, topBandY);
            } else {
              // En agua pura, penachos convectivos rojos descienden hasta el fondo
              let py = pAttr.getY(i) - dt * 0.18;
              if (py < 0.14) py = Math.max(0.22, meniscusY - 0.04);
              pAttr.setY(i, py);
            }
          }
          pAttr.needsUpdate = true;
        }
      }

      if (steamTeaComplexGroup) {
        steamTeaComplexGroup.visible = steamEff === 'tea_complex';
        if (steamTeaComplexGroup.visible && !isReducedMotion) {
          steamTeaComplexGroup.position.y = Math.sin(elapsed * 2) * 0.015;
        }
      }

      if (steamBotijoGroup) {
        steamBotijoGroup.visible = steamEff === 'botijo_cooling';
      }

      if (steamBenzeneInvisibleFireGroup) {
        steamBenzeneInvisibleFireGroup.visible = steamEff === 'benzene_invisible_fire';
        if (steamBenzeneInvisibleFireGroup.visible && !isReducedMotion) {
          const benzeneVol = labStore.beaker.acidVolumeMl + labStore.beaker.baseVolumeMl;
          const heatFactor = Math.max(0.25, Math.min(1.3, (tempC - 18) / 35));
          if (benzeneHeavyVaporGeo) {
            const vAttr = benzeneHeavyVaporGeo.getAttribute('position') as THREE.BufferAttribute;
            for (let i = 0; i < vAttr.count; i++) {
              const phase = (elapsed * (0.38 + heatFactor * 0.25) + i / vAttr.count) % 1;
              const ang = (i / vAttr.count) * Math.PI * 2 + elapsed * 0.15;
              const rad = 0.35 + Math.pow(phase, 0.85) * (0.55 + Math.min(0.45, benzeneVol * 0.01));
              const vy = Math.max(0.025, 0.94 * (1 - Math.pow(phase, 0.72)));
              vAttr.setXYZ(i, Math.cos(ang) * rad, vy, Math.sin(ang) * rad);
            }
            vAttr.needsUpdate = true;
          }
          if (benzeneThermalFlameShaderMat && benzeneThermalFlameMesh) {
            benzeneThermalFlameShaderMat.uniforms.uTime.value = elapsed;
            const targetInt =
              tempC >= 35
                ? Math.min(1.25, 0.65 + (tempC - 35) * 0.02 + benzeneVol * 0.01)
                : 0.35 + Math.min(0.35, benzeneVol * 0.008);
            benzeneThermalFlameShaderMat.uniforms.uIntensity.value = targetInt;
          }
          const activeAngle =
            Math.abs(flasks.hcl.group.rotation.z) >= Math.abs(flasks.naoh.group.rotation.z)
              ? flasks.hcl.group.rotation.z
              : flasks.naoh.group.rotation.z;
          labStore.updateDelicatePourAngle(
            activeAngle,
            Math.abs(activeAngle) > 0.25 || !!labStore.activePourAnim
          );
        }
      }

      const hand = labStore.gestureInput;
      const handFresh = hand && hand.tracked && performance.now() - hand.timestampMs < 250;
      if (handFresh) lastHandSeen = hand.timestampMs;
      const handEnabled = labStore.isCameraActive && !labStore.isMicroscopeActive && cameraReturnTimer <= 0 && !(labStore.isExplorationMode && explorationStore.pendingSafety) && !draggedFlaskId && !labStore.activePourAnim
        && !labStore.isCatalogOpen && !labStore.isCameraModalOpen && !labStore.isHomeBookOpen && !labStore.isNotebookOpen && !labStore.isHypothesisModalOpen;
      handHoveredFlaskId = null;
      let gestureCanPour = false;
      if (!handEnabled || !hand || performance.now() - lastHandSeen >= 1500) {
        releaseGesture();
        wasPinched = hand?.pinched ?? false;
        if (labStore.isCameraActive && handFresh && labStore.isMicroscopeActive) labStore.gestureStatus = 'Mano detectada. Vuelve a la mesa para agarrar recipientes.';
      } else if (handFresh) {
        pointer.set(hand.x * 2 - 1, 1 - hand.y * 2);
        raycaster.setFromCamera(pointer, camera);
        if (!gestureFlaskId) {
          flasks.hcl.group.updateWorldMatrix(true, true);
          flasks.naoh.group.updateWorldMatrix(true, true);
          const hits = raycaster.intersectObjects([flasks.hcl.group, flasks.naoh.group], true);
          let object: THREE.Object3D | null = hits[0]?.object ?? null;
          while (object && !object.userData.flaskId) object = object.parent;
          handHoveredFlaskId = object?.userData.flaskId ?? null;
          if (!hand.needsOpen && hand.pinched && !wasPinched && handHoveredFlaskId) {
            const rig = flasks[handHoveredFlaskId];
            gesturePlane.copy(handDragPlane(camera, rig.group.position));
            if (raycaster.ray.intersectPlane(gesturePlane, intersectPt)) {
              gestureFlaskId = handHoveredFlaskId;
              gestureOffset.copy(rig.group.position).sub(intersectPt);
              grabbedPalmSize = hand.palmSize;
              labStore.selectReagent(gestureFlaskId);
              flowAccumulator = 0;
              controls.enabled = false;
            }
          }
        }
        if (!hand.pinched) releaseGesture();
        if (gestureFlaskId) {
          const plane = gestureDragPlane.copy(gesturePlane);
          plane.constant -= handDepthOffset(hand.palmSize, grabbedPalmSize);
          if (raycaster.ray.intersectPlane(plane, intersectPt)) {
            const rig = flasks[gestureFlaskId];
            const pose = handFlaskPose(intersectPt.add(gestureOffset), hand.tilt, rig.group.position.x || rig.homePos.x);
            rig.targetPos.copy(pose.position);
            rig.targetRotZ = pose.angle;
            gestureCanPour = hand.pouring;
          }
          labStore.gestureStatus = hand.pouring ? 'Inclinado: coloca la boca por encima de la abertura del vaso' : 'Matraz agarrado: sube o baja la mano; acércala o aléjala para cambiar profundidad';
        } else {
          labStore.gestureStatus = hand.needsOpen ? 'Mano detectada. Separa índice y pulgar para activar el agarre.'
            : hand.pinched ? 'Abre la pinza, apunta al matraz y vuelve a juntar índice y pulgar.'
            : handHoveredFlaskId ? `Matraz ${handHoveredFlaskId === 'hcl' ? 'A' : 'B'} al alcance: junta índice y pulgar para agarrar` : 'Señala un matraz y junta índice y pulgar';
        }
        wasPinched = hand.pinched;
      }
      handCursor = handEnabled && handFresh ? { x: hand.x, y: hand.y, pinched: hand.pinched, overFlask: !hand.needsOpen && !!(handHoveredFlaskId || gestureFlaskId) } : null;

      // Actualizar Mano 3D Articulada con MediaPipe y Filtro 1-Euro (Opción 1)
      if (arHandRig) {
        if (handEnabled && handFresh && hand && !labStore.isFirstPersonWalking) {
          let targetPos = intersectPt;
          if (gestureFlaskId && flasks[gestureFlaskId]) {
            targetPos = flasks[gestureFlaskId].group.position;
          } else if (draggedFlaskId && flasks[draggedFlaskId]) {
            targetPos = flasks[draggedFlaskId].group.position;
          }
          arHandRig.updateGloves(labStore.safetyGlovesType);
          arHandRig.updatePose(
            hand.landmarks,
            camera,
            targetPos,
            hand.tilt,
            hand.pinched,
            performance.now()
          );
        } else {
          arHandRig.hide();
        }
      }

      if (labStore.isExplorationMode && explorationStore.result.stopped) labStore.activePourAnim = null;
      let flowingRig: FlaskRig | null = null;
      let requestedFlow = 0;
      if (animState && labStore.activePourAnim?.id !== animState.requestId) {
        const rig = flasks[animState.flaskId];
        rig.targetPos.copy(rig.homePos);
        rig.targetRotZ = 0;
        animState = null;
        flowAccumulator = 0;
      }
      if (animState) {
        animState.elapsed += dt;
        const rig = flasks[animState.flaskId];
        const side = rig.id === 'hcl' ? -1 : 1;
        rig.targetPos.set(side * 0.9, 1.65, 0);
        rig.targetRotZ = animState.elapsed > 0.45 ? side * 1.95 : 0;
        flowingRig = rig;
      } else if (draggedFlaskId && isOverPourZone) {
        flowingRig = flasks[draggedFlaskId];
      } else if (gestureFlaskId && gestureCanPour) {
        flowingRig = flasks[gestureFlaskId];
      }

      (['hcl', 'naoh'] as const).forEach((id) => {
        const rig = flasks[id];
        const reagentData = labStore.reagents.find((r) => r.reagentId === id);
        const remRatio = reagentData ? reagentData.remainingMl / reagentData.initialMl : 0;
        const heldByHand = gestureFlaskId === id;
        const smoothing = 1 - Math.exp(-(heldByHand ? 14 : 8) * dt);
        // Elevar primero evita atravesar el vaso al inclinar o devolver el matraz.
        const returning = !heldByHand && rig.targetPos.y < 0.5;
        rig.group.rotation.z = THREE.MathUtils.lerp(rig.group.rotation.z,
          !heldByHand && !returning && rig.group.position.y < 1.4 ? 0 : rig.targetRotZ, smoothing);
        const safeTarget = flaskTarget.copy(rig.targetPos);
        if (returning && Math.abs(rig.group.rotation.z) > 0.15) safeTarget.y = 1.65;
        if (returning && Math.hypot(rig.group.position.x, rig.group.position.z) < 0.76 && rig.group.position.y > 0.9) {
          safeTarget.y = Math.max(safeTarget.y, rig.group.position.y, 1.04);
        }
        rig.group.position.lerp(safeTarget, smoothing);
        const key = `${rig.group.rotation.z.toFixed(3)}:${remRatio.toFixed(4)}`;
        if (key !== rig.fluidKey) {
          const fluid = flaskFluid(rig.group.rotation.z, remRatio * 0.65);
          rig.fluidHeight = fluid.height;
          const attribute = rig.liquidMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
          (attribute.array as Float32Array).fill(0);
          (attribute.array as Float32Array).set(fluid.positions);
          attribute.needsUpdate = true;
          rig.liquidMesh.geometry.setDrawRange(0, fluid.positions.length / 3);
          rig.liquidMesh.geometry.computeVertexNormals();
          rig.liquidMesh.geometry.computeBoundingSphere();
          rig.fluidKey = key;
        }
        rig.liquidMesh.visible = remRatio > 0;

        if (id === 'naoh' && buretteLiquidMesh) {
          buretteLiquidMesh.scale.set(1, Math.max(0.05, remRatio), 1);
        }

        const isSel = selectedId === id || hoveredFlaskId === id || handHoveredFlaskId === id || draggedFlaskId === id;
        rig.ringMat.opacity = isSel ? 0.9 : 0.25;
        rig.ringMesh.scale.setScalar(isSel ? 1.08 : 1.0);
      });

      if (flowingRig) {
        nozzle.set(-Math.sign(flowingRig.group.rotation.z) * 0.09, 0.81, 0)
          .applyEuler(flowingRig.group.rotation).add(flowingRig.group.position);
      } else nozzle.set(0, 0, 0);
      if (flowingRig && streamHitsBeaker(nozzle)) {
        requestedFlow = pourRate(flowingRig.group.rotation.z, flowingRig.fluidHeight) * dt;
      }
      const reagent = flowingRig && labStore.reagents.find(r => r.reagentId === flowingRig?.id);
      const isFlowing = requestedFlow > 0 && !(labStore.isExplorationMode && (explorationStore.pendingSafety || explorationStore.result.stopped)) && (reagent?.remainingMl ?? 0) > 0 && labStore.availableCapacityMl > 0;
      if (gestureFlaskId && gestureCanPour && isFlowing) labStore.gestureStatus = 'Vertiendo: abre la pinza para cortar y devolver el matraz';
      if (isFlowing && flowingRig) {
        flowAccumulator += requestedFlow;
        const amount = Math.min(
          Math.floor(flowAccumulator * 10 + 1e-8) / 10,
          animState?.remainingMl ?? Infinity
        );
        if (amount >= 0.1) {
          const before = reagent!.remainingMl;
          const appliedSuccessfully = labStore.pour(
            flowingRig.id,
            amount,
            labStore.activePourAnim?.source ?? (gestureFlaskId === flowingRig.id ? 'gesture' : dragSource)
          );
          if (!appliedSuccessfully) {
            labStore.activePourAnim = null;
            flowingRig = null;
          }
          const applied = Number((before - reagent!.remainingMl).toFixed(1));
          flowAccumulator -= amount;
          if (animState) animState.remainingMl = Number((animState.remainingMl - applied).toFixed(1));
        }
      } else {
        flowAccumulator = 0;
      }
      if (
        animState &&
        (animState.remainingMl < 0.1 ||
          labStore.availableCapacityMl <= 0 ||
          (reagent && reagent.remainingMl <= 0))
      ) {
        const rig = flasks[animState.flaskId];
        rig.targetPos.copy(rig.homePos);
        rig.targetRotZ = 0;
        animState = null;
        labStore.activePourAnim = null;
        flowAccumulator = 0;
      }
      pourStreamMesh.visible = isFlowing;
      splashParticles.visible = isFlowing;
      if (isFlowing && flowingRig) {
        pourStreamMat.color.setHex(flowingRig.colorHex);
        const impactY = 0.12 + 0.8 * currentFillRatio;
        const length = nozzle.y - impactY;
        pourStreamMesh.scale.set(1, length / 0.65, 1);
        pourStreamMesh.quaternion.identity();
        pourStreamMesh.position.set(nozzle.x, impactY + length / 2, nozzle.z);
        splashParticles.position.set(nozzle.x, impactY, nozzle.z);
        const posAttr = splashGeo.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < posAttr.count; i++) {
          const age = (elapsed * 2 + i / posAttr.count) % 1;
          const azimuth = i * 2.4;
          const radius = age * 0.13;
          posAttr.setXYZ(
            i,
            Math.cos(azimuth) * radius,
            0.4 * age * (1 - age),
            Math.sin(azimuth) * radius
          );
        }
        posAttr.needsUpdate = true;
      }

      // ===================== EFECTOS DE FLUIDOS Y PARTÍCULAS FÍSICAS (DUCHA, LAVAOJOS, VAPOR, CO2) =====================
      if (safetyFx) {
        safetyFx.update(dt);
        const isVaporActive = labStore.beaker.temperatureC >= 38;
        const vaporIntensity = Math.min(1.0, Math.max(0.1, (labStore.beaker.temperatureC - 35) / 45));
        safetyFx.setReactorVapor(isVaporActive, vaporIntensity);
      }

      // ===================== FSM DE INTERACCIÓN CON EL MICROSCOPIO (EXPLORING <-> INSPECTING_MICROSCOPE) =====================
      const knobAngleRad =
        ((labStore.microscopeCoarseUm - 4500) / 2000) * Math.PI * 2 +
        (labStore.microscopeFineUm / 200) * Math.PI * 2;
      const stageXNorm = THREE.MathUtils.clamp(labStore.microscopeStageXUm / 800, -1, 1);
      const stageYNorm = THREE.MathUtils.clamp(labStore.microscopeStageYUm / 800, -1, 1);

      if (
        labStore.microscopeTransitionPhase === 'APPROACHING_OCULAR' ||
        labStore.microscopeTransitionPhase === 'RETURNING_TO_EXPLORING'
      ) {
        // Fase 1 y Fase 4: Locomoción y movimiento libre del mouse completamente bloqueados durante la interpolación de 1.2s
        if (controls.enabled) controls.enabled = false;
        if (fpController?.enabled) fpController.disable();
        fpController?.setAvatarBodyVisible(false);

        const duration = isReducedMotion ? 0.15 : MICROSCOPE_TRANSITION_DURATION;
        const nextProgress = THREE.MathUtils.clamp(
          labStore.microscopeTransitionProgress +
            (dt / duration) * labStore.microscopeTransitionDirection,
          0,
          1
        );
        labStore.microscopeTransitionProgress = nextProgress;
        const alpha = easeInOutCubic(nextProgress);

        camera.position.lerpVectors(microCamStartPos, microCamTargetPos, alpha);
        camera.position.y += Math.sin(alpha * Math.PI) * 0.025;
        camera.quaternion.slerpQuaternions(microCamStartQuat, microCamTargetQuat, alpha);

        if (
          (labStore.microscopeTransitionDirection === 1 && nextProgress >= 1) ||
          (labStore.microscopeTransitionDirection === -1 && nextProgress <= 0)
        ) {
          const returningToExploring = labStore.microscopeTransitionDirection === -1;
          labStore.completeMicroscopeTransition();
          if (returningToExploring) {
            if (labStore.isFirstPersonWalking && fpController) {
              fpController.enable(microCamStartPos);
              fpController.setAvatarBodyVisible(true);
            } else {
              fpController?.updateMicroscopeHands(0, knobAngleRad, stageXNorm, stageYNorm);
              controls.target.copy(savedOrbitTarget);
              controls.enabled = true;
              controls.update();
            }
          }
        }
      } else if (labStore.microscopeFsmState === 'INSPECTING_MICROSCOPE') {
        // Fase 2: Cámara fija en la matriz de transformación exacta frente al ocular y cuerpo del avatar oculto
        if (controls.enabled) controls.enabled = false;
        if (fpController?.enabled) fpController.disable();
        fpController?.setAvatarBodyVisible(false);

        camera.position.copy(microCamTargetPos);
        camera.quaternion.copy(microCamTargetQuat);
      } else if (labStore.isFirstPersonWalking && fpController) {
        if (controls.enabled) controls.enabled = false;
        if (!fpController.enabled) fpController.enable(camera.position);
        fpController.setAvatarBodyVisible(true);
        fpController.update(dt);
        fpController.updateCrosshairRaycast([
          flasks.hcl.group,
          flasks.naoh.group,
          bookGroup,
          ...(safetyInfrastructureGroup ? [safetyInfrastructureGroup] : []),
          ...interactiveToolGroups.map((g) => (g === microscopeGroup && microscopeProxyMesh ? microscopeProxyMesh : g)),
          ...cabinetItemGroups
        ]);
        labStore.nearbyStationPrompt = fpController.getNearbyStation();
        labStore.firstPersonTargetPrompt = fpController.focusedTarget
          ? {
              title: fpController.focusedTarget.title,
              actionHint: fpController.focusedTarget.actionHint,
              icon: fpController.focusedTarget.icon,
              distanceM: fpController.focusedTarget.distanceM
            }
          : null;
        labStore.firstPersonPointerLocked = fpController.isPointerLocked;
      } else {
        if (fpController?.enabled) fpController.disable();
        fpController?.setAvatarBodyVisible(false);

        if (isTransitioningStation) {
          const targetPose = (labStore.activeStation === 'biologia' && labStore.isMicroscopeActive)
            ? BIOLOGY_MICROSCOPE_FOCUS_POSE
            : (STATION_VIEW_POSES[labStore.activeStation] ?? STATION_VIEW_POSES.quimica);

          const k = 1 - Math.exp(-(isReducedMotion ? 40 : 5.5) * dt);
          camera.position.lerp(targetPose.camPos, k);
          controls.target.lerp(targetPose.target, k);
          controls.update();

          if (
            camera.position.distanceTo(targetPose.camPos) < 0.015 &&
            controls.target.distanceTo(targetPose.target) < 0.015
          ) {
            camera.position.copy(targetPose.camPos);
            controls.target.copy(targetPose.target);
            controls.update();
            isTransitioningStation = false;
          }
        }
      }

      // ===================== MICROSCOPIO FIJO EN ESTACIÓN DE BIOLOGÍA =====================
      if (microscopeGroup) {
        const k = 1 - Math.exp(-(isReducedMotion ? 30 : 6) * dt);
        microscopeGroup.position.copy(MICROSCOPE_BIOLOGY_POS);
        microscopeGroup.rotation.y = MICROSCOPE_BIOLOGY_ROT_Y;

        if (microscopeKeyLight) {
          const targetIntensity = labStore.activeStation === 'biologia' ? (labStore.isMicroscopeActive ? 8.5 : 5.5) : 1.5;
          microscopeKeyLight.intensity = THREE.MathUtils.lerp(microscopeKeyLight.intensity, targetIntensity, k);
        }

        // Revólver: gira por el camino más corto hasta el objetivo activo (con retén de clic)
        const targetAngle = -MICROSCOPE_OBJECTIVE_ANGLES[labStore.microscopeObjective];
        let diff = targetAngle - revolverAngle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        revolverAngle += diff * (1 - Math.exp(-9 * dt));
        microscopeRevolverGroup.rotation.y = revolverAngle;

        // Tornillos: macrométrico 2000 µm/vuelta, micrométrico 200 µm/vuelta
        microscopeCoarseKnobMesh.rotation.y = THREE.MathUtils.lerp(
          microscopeCoarseKnobMesh.rotation.y,
          ((labStore.microscopeCoarseUm - 4500) / 2000) * Math.PI * 2,
          k
        );
        microscopeFineKnobMesh.rotation.y = THREE.MathUtils.lerp(
          microscopeFineKnobMesh.rotation.y,
          (labStore.microscopeFineUm / 200) * Math.PI * 2,
          k
        );

        // La platina sube/baja según el enfoque (cremallera y piñón) y se traslada en X-Y
        const stageLift =
          (labStore.microscopeCoarseUm - 4500) * 0.00004 + labStore.microscopeFineUm * 0.00002;
        microscopeStageAssembly.position.y = THREE.MathUtils.lerp(
          microscopeStageAssembly.position.y,
          stageLift,
          k
        );
        microscopeSlideGroup.position.x = THREE.MathUtils.lerp(
          microscopeSlideGroup.position.x,
          labStore.microscopeStageXUm * 0.00003,
          k
        );
        microscopeSlideGroup.position.z = THREE.MathUtils.lerp(
          microscopeSlideGroup.position.z,
          microscopeSlideHome.z - labStore.microscopeStageYUm * 0.00003,
          k
        );

        // Muestra, aceite de inmersión e iluminación Köhler (Zero-GC)
        if (labStore.microscopeSpecimenId === 'reactor_live') {
          specColorTemp.copy(targetLiquidColor);
        } else {
          specColorTemp.setHex(MICROSCOPE_SPECIMEN_COLORS[labStore.microscopeSpecimenId]);
        }
        microscopeSpecimenMat.color.lerp(specColorTemp, k);
        microscopeOilDropMesh.visible = labStore.microscopeImmersionOilApplied;
        const lamp = labStore.microscopeLampOn ? labStore.microscopeLampIntensity : 0;
        microscopeLedGlowMat.color.setRGB(0.15 + lamp * 0.85, 0.16 + lamp * 0.84, 0.18 + lamp * 0.82);
        microscopeLightBeamMesh.visible = lamp > 0.02;
        microscopeLightBeamMat.opacity = lamp * (0.08 + labStore.microscopeDiaphragm * 0.22);
        microscopeLightBeamMesh.scale.set(
          0.4 + labStore.microscopeDiaphragm * 0.8,
          1,
          0.4 + labStore.microscopeDiaphragm * 0.8
        );
      }

      if (doubleDoorsRig) {
        const checkPos = fpController && fpController.enabled ? fpController.position : camera.position;
        doubleDoorsRig.update(checkPos, dt);
      }

      if (
        labStore.microscopeFsmState === 'EXPLORING' &&
        !labStore.isFirstPersonWalking &&
        controls.enabled
      ) {
        controls.update(dt);
      }
      renderer?.render(scene, camera);
    }

    renderer.setAnimationLoop(animate);

    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      fitCamera(labStore.isCameraActive && !labStore.isMicroscopeActive);
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      mediaQuery.removeEventListener('change', onMotionChange);
      renderer?.domElement.removeEventListener('pointerdown', onPointerDown, true);
      renderer?.domElement.removeEventListener('pointermove', onPointerMove);
      renderer?.domElement.removeEventListener('pointerup', onPointerUp);
      renderer?.domElement.removeEventListener('pointercancel', onPointerUp);
      renderer?.domElement.removeEventListener('lostpointercapture', onPointerUp);
      renderer?.domElement.removeEventListener('wheel', onMicroscopeWheel);
      window.removeEventListener('blur', cancelInteraction);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('keydown', onGlobalShortcuts);
      fpController?.detach();
      labStore.activePourAnim = null;
      resizeObserver.disconnect();
    };
  });

  onDestroy(() => {
    sceneDisposed = true;
    renderer?.setAnimationLoop(null);
    timer?.dispose();
    controls?.dispose();
    if (scene) {
      disposeOwnedResources(scene);
      if (scene.environment instanceof THREE.Texture) scene.environment.dispose();
    }
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }
  });
</script>

<div
  class="relative w-full h-full overflow-hidden select-none bg-[#080c14] {labStore.isFirstPersonWalking &&
  labStore.microscopeFsmState === 'EXPLORING' &&
  !labStore.isAnyModalBlockingFirstPerson
    ? 'cursor-none'
    : ''}"
>
  <div bind:this={container} class="w-full h-full"></div>

  {#if handCursor}
    <div class="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-lg flex items-center justify-center {handCursor.pinched ? 'w-6 h-6 border-amber-200 bg-amber-400/70' : handCursor.overFlask ? 'w-9 h-9 border-emerald-200 bg-emerald-400/30' : 'w-9 h-9 border-white bg-amber-400/20'}"
      style:left={`${handCursor.x * 100}%`} style:top={`${handCursor.y * 100}%`} aria-hidden="true"></div>
  {/if}

  <!-- Píldora espacial contextual (estilo Apple visionOS Look Pill, sin colores chillones ni emojis) -->
  {#if labStore.isMicroscopeActive && hoveredMicroscopePartId}
    {@const part = MICROSCOPE_PARTS.find((p) => p.id === hoveredMicroscopePartId)}
    {#if part}
      <div class="fixed bottom-20 left-6 z-30 pointer-events-none apple-glass rounded-full px-4 py-1.5 flex items-center gap-2.5 text-xs shadow-xl max-w-[46vw]">
        <span class="w-2 h-2 rounded-full bg-sky-400 shrink-0"></span>
        <span class="font-mono-numbers text-white/50 text-[10px] shrink-0">{part.code}</span>
        <span class="font-semibold text-white truncate">{part.name}</span>
        <span class="text-white/45">·</span>
        <span class="text-white/65 truncate">
          {hoveredMicroscopePartId === 'coarse_knob' || hoveredMicroscopePartId === 'fine_knob'
            ? 'Rueda o clic para girar (Shift invierte)'
            : hoveredMicroscopePartId === 'nosepiece' || hoveredMicroscopePartId === 'objectives'
              ? 'Clic para girar el revólver'
              : hoveredMicroscopePartId === 'illuminator'
                ? 'Clic para encender / apagar el LED'
                : hoveredMicroscopePartId === 'diaphragm'
                  ? 'Rueda o clic para abrir / cerrar el iris'
                  : 'Clic para ver su función'}
        </span>
      </div>
    {/if}
  {:else if labStore.isMicroscopeActive}
    <!-- Sin píldoras de otros objetos mientras el microscopio está en primer plano -->
  {:else if isBookHovered}
    <div class="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none apple-glass rounded-full px-4 py-1.5 flex items-center gap-2.5 text-xs shadow-xl">
      <span class="w-2 h-2 rounded-full bg-amber-400"></span>
      <span class="font-semibold text-white">Manual Correlativo 3D</span>
      <span class="text-white/45">·</span>
      <span class="text-white/65">Clic para abrir páginas</span>
    </div>
  {:else if hoveredFlaskId}
    {@const r = labStore.reagents.find((item) => item.reagentId === hoveredFlaskId)}
    <div class="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none apple-glass rounded-full px-4 py-1.5 flex items-center gap-2.5 text-xs shadow-xl">
      <span class="w-2 h-2 rounded-full" style="background-color: {r?.colorHex || '#38bdf8'};"></span>
      <span class="font-semibold text-white">{r?.name}</span>
      <span class="font-mono-numbers text-white/50 text-[11px]">{r?.formula}</span>
      <span class="text-white/45">·</span>
      <span class="text-white/65">Arrastra hacia el vaso central</span>
    </div>
  {:else if hoveredCabinetId && CABINET_COMPONENTS.find((c) => c.id === hoveredCabinetId)}
    {@const comp = CABINET_COMPONENTS.find((c) => c.id === hoveredCabinetId)!}
    <div class="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none apple-glass rounded-full px-4 py-1.5 flex items-center gap-2.5 text-xs shadow-xl">
      <span class="w-2 h-2 rounded-full" style="background-color: {comp.colorHex};"></span>
      <span class="font-semibold text-white">{comp.name}</span>
      <span class="text-white/45">·</span>
      <span class="text-white/65">Estante {comp.shelfIndex + 1} · Clic para equipar</span>
    </div>
  {:else if hoveredToolId}
    {@const tool = LAB_TOOLS_CATALOG[hoveredToolId]}
    <div class="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none apple-glass rounded-full px-4 py-1.5 flex items-center gap-2.5 text-xs shadow-xl">
      <span class="w-2 h-2 rounded-full bg-sky-400"></span>
      <span class="font-semibold text-white">{tool.name}</span>
      <span class="text-white/45">·</span>
      <span class="text-white/65">Clic para utilizar</span>
    </div>
  {/if}

  <!-- INSPECTOR ESPACIAL DE COMPONENTE STEAM (SE OCULTA DURANTE INSPECTING_MICROSCOPE SEGÚN FASE 2) -->
  {#if labStore.microscopeFsmState === 'EXPLORING' && labStore.selectedCabinetComponent}
    {@const comp = labStore.selectedCabinetComponent}
    <div class="fixed bottom-22 left-6 z-20 w-full max-w-[340px] pointer-events-auto apple-popover-enter">
      <div class="apple-glass rounded-[26px] p-4 flex flex-col gap-3">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span
                class="w-2.5 h-2.5 rounded-full shrink-0"
                style="background-color: {comp.colorHex}; box-shadow: 0 0 10px {comp.colorHex};"
              ></span>
              <span class="text-[11px] font-medium text-white/50 truncate">
                Estante {comp.shelfIndex + 1} · {comp.formulaOrSpec}
              </span>
            </div>
            <h3 class="text-[15px] font-semibold tracking-[-0.02em] text-white mt-0.5 leading-snug">
              {comp.name}
            </h3>
          </div>
          <button
            type="button"
            onclick={() => (labStore.selectedCabinetComponentId = null)}
            class="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-white/65 hover:text-white text-xs cursor-pointer shrink-0"
            aria-label="Cerrar inspector"
          >
            ✕
          </button>
        </div>

        <p class="text-[12px] text-white/75 leading-relaxed bg-white/[0.04] border border-white/[0.06] rounded-2xl p-3">
          {comp.description}
        </p>

        <div class="flex items-center justify-between gap-2 pt-0.5">
          <button
            type="button"
            onclick={() => {
              labSound.playBookOpen();
              labStore.isHomeBookOpen = true;
            }}
            class="lab-btn px-3 py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-white/85 text-[11px] font-medium cursor-pointer"
          >
            Ver en Manual
          </button>

          <div class="flex items-center gap-1.5">
            <button
              type="button"
              onclick={() => labStore.triggerAnimatedPour('hcl', 5)}
              class="lab-btn px-3 py-2 rounded-full bg-white/[0.12] hover:bg-white/[0.2] text-white text-[11px] font-semibold cursor-pointer"
            >
              +5 mL A
            </button>
            <button
              type="button"
              onclick={() => labStore.triggerAnimatedPour('naoh', 5)}
              class="lab-btn px-3.5 py-2 rounded-full bg-white text-black hover:bg-white/90 text-[11px] font-semibold cursor-pointer"
            >
              +5 mL B
            </button>
          </div>
        </div>
      </div>
    </div>
  {:else if labStore.microscopeFsmState === 'EXPLORING' && labStore.inspectedTool && labStore.inspectedTool.id !== 'ph_meter' && labStore.inspectedTool.id !== 'microscope'}
    {@const tool = labStore.inspectedTool}
    <div class="fixed bottom-22 left-6 z-20 w-full max-w-[340px] pointer-events-auto apple-popover-enter">
      <div class="apple-glass rounded-[26px] p-4 flex flex-col gap-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <span class="text-[11px] font-medium text-white/50 block">
              Instrumentación · {labStore.educationLevel === 'primaria' ? 'Modo Primaria' : 'Modo Secundaria'}
            </span>
            <h3 class="text-[15px] font-semibold tracking-[-0.02em] text-white mt-0.5">
              {tool.name}
            </h3>
          </div>
          <button
            type="button"
            onclick={() => labStore.inspectTool(null)}
            class="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-white/65 hover:text-white text-xs cursor-pointer shrink-0"
            aria-label="Cerrar inspector de instrumento"
          >
            ✕
          </button>
        </div>

        <!-- Explicación adaptativa según el nivel seleccionado en la Dynamic Island -->
        <p class="text-[12px] text-white/75 leading-relaxed bg-white/[0.04] border border-white/[0.06] rounded-2xl p-3">
          {labStore.educationLevel === 'primaria' ? tool.primariaExplain : tool.secundariaExplain}
        </p>

        {#if tool.id === 'ph_strips' && labStore.lastTestedStripPh !== null}
          <div class="flex items-center justify-between px-3 py-2 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-xs">
            <span class="text-white/65">Lectura colorimétrica</span>
            <span class="font-mono-numbers font-semibold text-white flex items-center gap-2">
              <span
                class="w-2.5 h-2.5 rounded-full inline-block"
                style="background: {labStore.lastTestedStripColor}; box-shadow: 0 0 8px {labStore.lastTestedStripColor};"
              ></span>
              pH {labStore.lastTestedStripPh.toFixed(2)}
            </span>
          </div>
        {/if}

        <div class="flex items-center justify-end pt-0.5">
          {#if tool.id === 'burette'}
            <button
              type="button"
              onclick={() => labStore.doseFromBurette(1.0)}
              class="lab-btn w-full py-2.5 px-4 rounded-full bg-white text-black hover:bg-white/90 text-xs font-semibold cursor-pointer"
            >
              {tool.actionLabel}
            </button>
          {:else if tool.id === 'thermometer'}
            <button
              type="button"
              onclick={() => labStore.cycleTemperature()}
              class="lab-btn w-full py-2.5 px-4 rounded-full bg-white text-black hover:bg-white/90 text-xs font-semibold cursor-pointer"
            >
              {tool.actionLabel} · {tempC.toFixed(0)}°C
            </button>
          {:else if tool.id === 'ph_strips'}
            <button
              type="button"
              onclick={() => labStore.dipPhPaperStrip()}
              class="lab-btn w-full py-2.5 px-4 rounded-full bg-white text-black hover:bg-white/90 text-xs font-semibold cursor-pointer"
            >
              {tool.actionLabel}
            </button>
          {:else if tool.id === 'dropper'}
            <button
              type="button"
              onclick={() => labStore.squeezeIndicatorDropper()}
              class="lab-btn w-full py-2.5 px-4 rounded-full bg-white text-black hover:bg-white/90 text-xs font-semibold cursor-pointer"
            >
              {tool.actionLabel} ({labStore.indicatorDropsCount})
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>
