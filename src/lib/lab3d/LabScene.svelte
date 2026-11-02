<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
  import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
  import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
  import { Timer } from 'three/addons/misc/Timer.js';
  import { flaskFluid, pourRate, streamHitsBeaker } from './fluid';
  import { explorationStore } from '$lib/exploration/exploration_store.svelte';
  import {
    labStore,
    LAB_TOOLS_CATALOG,
    CABINET_COMPONENTS,
    type LabToolInfo,
    type CabinetComponentInfo
  } from '$lib/interaction/lab_store.svelte';
  import { labSound } from '$lib/audio/lab_sound';

  let { resetViewRevision = 0 }: { resetViewRevision?: number } = $props();
  let container: HTMLDivElement;
  let renderer: THREE.WebGLRenderer | null = null;
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

  let isBookHovered = $state<boolean>(false);
  let hoveredToolId = $state<LabToolInfo['id'] | null>(null);
  let hoveredCabinetId = $state<string | null>(null);

  let pourStreamMesh: THREE.Mesh;
  let pourStreamMat: THREE.MeshBasicMaterial;
  let splashParticles: THREE.Points;
  let splashGeo: THREE.BufferGeometry;

  // Estado de interacción 3D directa
  let draggedFlaskId = $state<'hcl' | 'naoh' | null>(null);
  let handCursor = $state<{ x: number; y: number; pinched: boolean } | null>(null);
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

  function homeCamera() {
    camera.position.set(0.08, 1.9, 3.45);
    controls.target.set(0, 0.57, 0);
    controls.update();
  }

  $effect(() => {
    const revision = resetViewRevision;
    if (revision > 0 && camera && controls) homeCamera();
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

  function createSciencePosterTexture(kind: 'ph_scale' | 'lab_rules'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 320);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 308);

    if (kind === 'ph_scale') {
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
    } else {
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
   * Genera la textura de las páginas abiertas del Libro 3D en la mesa
   */
  function createOpenBookPagesTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#fdf8e7';
    ctx.fillRect(0, 0, 1024, 768);

    const spineGrad = ctx.createLinearGradient(465, 0, 559, 0);
    spineGrad.addColorStop(0, 'rgba(0,0,0,0)');
    spineGrad.addColorStop(0.5, 'rgba(71, 36, 12, 0.35)');
    spineGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spineGrad;
    ctx.fillRect(465, 0, 94, 768);

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 6;
    ctx.strokeRect(28, 28, 445, 712);
    ctx.strokeRect(551, 28, 445, 712);

    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 24px "Outfit", sans-serif';
    ctx.fillText('NIVEL PRIMARIA', 54, 76);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 30px "Outfit", sans-serif';
    ctx.fillText('Col Morada y Volcán', 54, 118);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(54, 148, 392, 220);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.strokeRect(54, 148, 392, 220);

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(250, 258, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(238, 236);
    ctx.lineTo(238, 280);
    ctx.lineTo(274, 258);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 21px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('• Pág. 2: Col Morada y Limón', 54, 425);
    ctx.fillText('• Pág. 4: Volcán de Vinagre', 54, 468);
    ctx.fillText('• Tiras reactivas y Gotero 3D', 54, 511);

    ctx.fillStyle = '#3730a3';
    ctx.font = 'bold 24px "Outfit", sans-serif';
    ctx.fillText('NIVEL SECUNDARIA', 578, 76);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 28px "Outfit", sans-serif';
    ctx.fillText('Titulación y Termoquímica', 578, 118);

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 21px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('• Pág. 6: Bureta HCl + NaOH', 578, 190);
    ctx.fillText('• Pág. 8: Efecto Térmico Kw(T)', 578, 240);
    ctx.fillText('• Pág. 10: Guía de Herramientas', 578, 290);

    ctx.fillStyle = '#d97706';
    ctx.fillRect(578, 590, 392, 86);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Outfit", sans-serif';
    ctx.fillText('HAZ CLIC PARA ABRIR LIBRO', 602, 642);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }

  function buildInteractiveHomeBook(): THREE.Group {
    const group = new THREE.Group();
    group.position.set(1.62, 0.02, 0.48);
    group.scale.setScalar(0.72);
    group.rotation.y = -0.42;
    group.userData = { isHomeBook: true };

    const standGeo = new THREE.BoxGeometry(0.72, 0.06, 0.50);
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.5
    });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.y = 0.04;
    stand.rotation.x = 0.24;
    stand.castShadow = true;
    stand.receiveShadow = true;
    group.add(stand);

    const coverGeo = new THREE.BoxGeometry(0.70, 0.026, 0.48);
    const coverMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.4,
      metalness: 0.2
    });
    const cover = new THREE.Mesh(coverGeo, coverMat);
    cover.position.set(0, 0.08, 0);
    cover.rotation.x = 0.24;
    cover.castShadow = true;
    group.add(cover);

    const spineBump = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.485, 16),
      new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.5 })
    );
    spineBump.rotation.x = Math.PI / 2 + 0.24;
    spineBump.position.set(0, 0.075, 0);
    group.add(spineBump);

    const pagesTex = createOpenBookPagesTexture();
    const pagesMaterials = [
      new THREE.MeshStandardMaterial({ color: 0xfef3c7 }),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7 }),
      new THREE.MeshBasicMaterial({ map: pagesTex }),
      new THREE.MeshStandardMaterial({ color: 0x78350f }),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7 }),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7 })
    ];
    const pagesGeo = new THREE.BoxGeometry(0.65, 0.036, 0.44);
    const pagesMesh = new THREE.Mesh(pagesGeo, pagesMaterials);
    pagesMesh.position.set(0, 0.106, 0);
    pagesMesh.rotation.x = 0.24;
    pagesMesh.castShadow = true;
    pagesMesh.userData = { isHomeBook: true };
    group.add(pagesMesh);

    const ribbonGeo = new THREE.BoxGeometry(0.035, 0.006, 0.14);
    const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
    const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
    ribbon.position.set(0.12, 0.06, 0.25);
    ribbon.rotation.x = 0.24;
    group.add(ribbon);

    const glowGeo = new THREE.RingGeometry(0.44, 0.49, 48);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55
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
   * Construye la Gradilla de Tubos de Ensayo de Referencia Colorimétrica (pH 2, 5, 7, 9, 12)
   * y el entorno arquitectónico con pósters didácticos al fondo.
   */
  function buildLabEnvironmentAndRack(glassMaterial: THREE.MeshPhysicalMaterial): THREE.Group {
    const group = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x193340, roughness: 0.9 });
    const wall = roundedBox(5.6, 3.1, 0.12, 0.04, wallMat);
    wall.position.set(0, 0.95, -1.5);
    group.add(wall);

    const panelMat = new THREE.MeshStandardMaterial({ color: 0x203e4b, roughness: 0.85 });
    [-1.7, 0, 1.7].forEach((x) => {
      const panel = roundedBox(1.62, 2.12, 0.02, 0.01, panelMat);
      panel.position.set(x, 1.1, -1.425);
      group.add(panel);
    });

    // Pósters científicos en la pared
    const poster1 = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.68),
      new THREE.MeshBasicMaterial({ map: createSciencePosterTexture('ph_scale') })
    );
    poster1.position.set(-1.7, 1.82, -1.405);
    group.add(poster1);

    const poster2 = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.68),
      new THREE.MeshBasicMaterial({ map: createSciencePosterTexture('lab_rules') })
    );
    poster2.position.set(1.7, 1.82, -1.405);
    group.add(poster2);

    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x40545c, roughness: 0.45, metalness: 0.35 });
    const shelf = roundedBox(4.2, 0.04, 0.3, 0.015, shelfMat);
    shelf.position.set(0, 1.38, -1.27);
    group.add(shelf);
    const diffuser = new THREE.Mesh(
      new THREE.BoxGeometry(3.95, 0.008, 0.016),
      new THREE.MeshBasicMaterial({ color: 0xaddbd7 })
    );
    diffuser.position.set(0, 1.353, -1.13);
    group.add(diffuser);
    const amber = new THREE.MeshStandardMaterial({ color: 0x5b4630, roughness: 0.3, metalness: 0.1 });
    [-1.6, -1.3, 1.55].forEach((x) => {
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.21, 20), amber);
      bottle.position.set(x, 1.505, -1.28);
      group.add(bottle);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.041, 0.04, 16), shelfMat);
      cap.position.set(x, 1.63, -1.28);
      group.add(cap);
    });
    const sign = textPlate('SYMBIOLAB  /  OBSERVA Y DESCUBRE', 1.38, 0.16, '#c4d8da', '#203e4b');
    sign.position.set(0, 1.78, -1.4);
    group.add(sign);

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
   * Microscopio Óptico Compuesto Binocular Profesional a Escala Real
   * Altura total ~1.48 unidades (más de 4 veces más alto que los tubos de ensayo de 0.34 u
   * y más alto que el vaso de precipitados de 250 mL).
   */
  function buildSchoolMicroscope(): THREE.Group {
    const group = new THREE.Group();
    group.position.set(-1.62, 0, -0.68);
    group.rotation.y = 0.52;
    group.scale.setScalar(1.18);
    group.userData = { toolId: 'microscope' };

    const enamelMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.22,
      metalness: 0.25
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.78
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.15,
      metalness: 0.92
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.22,
      metalness: 0.88
    });

    // 1. Base piramidal pesada con iluminador Köhler
    const footBase = roundedBox(0.40, 0.065, 0.50, 0.018, darkMetalMat);
    footBase.position.set(0, 0.0325, 0);
    group.add(footBase);

    const upperBase = roundedBox(0.32, 0.045, 0.42, 0.014, enamelMat);
    upperBase.position.set(0, 0.08, -0.02);
    group.add(upperBase);

    const fieldLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.065, 0.03, 28),
      darkMetalMat
    );
    fieldLens.position.set(0, 0.11, 0.09);
    group.add(fieldLens);

    const ledGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.008, 24),
      new THREE.MeshBasicMaterial({ color: 0x7dd3fc })
    );
    ledGlow.position.set(0, 0.126, 0.09);
    group.add(ledGlow);

    // 2. Columna y brazo ergonómico en C
    const lowerPillar = roundedBox(0.11, 0.48, 0.13, 0.02, enamelMat);
    lowerPillar.position.set(0, 0.32, -0.16);
    lowerPillar.rotation.x = 0.08;
    group.add(lowerPillar);

    const upperSpine = roundedBox(0.10, 0.46, 0.12, 0.02, enamelMat);
    upperSpine.position.set(0, 0.74, -0.13);
    upperSpine.rotation.x = -0.12;
    group.add(upperSpine);

    const topCantilever = roundedBox(0.11, 0.09, 0.28, 0.02, enamelMat);
    topCantilever.position.set(0, 0.94, -0.02);
    group.add(topCantilever);

    // 3. Tornillos macrométrico y micrométrico coaxiales
    const coarseKnob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.19, 28),
      darkMetalMat
    );
    coarseKnob.rotation.z = Math.PI / 2;
    coarseKnob.position.set(0, 0.28, -0.15);
    group.add(coarseKnob);

    const fineKnob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.034, 0.034, 0.23, 24),
      chromeMat
    );
    fineKnob.rotation.z = Math.PI / 2;
    fineKnob.position.set(0, 0.28, -0.15);
    group.add(fineKnob);

    // 4. Platina mecánica XY de doble capa + Portaobjetos y muestra
    const stageCarrier = roundedBox(0.09, 0.22, 0.12, 0.015, darkMetalMat);
    stageCarrier.position.set(0, 0.42, -0.08);
    group.add(stageCarrier);

    const stage = roundedBox(0.32, 0.032, 0.30, 0.01, darkMetalMat);
    stage.position.set(0, 0.50, 0.07);
    group.add(stage);

    const condenser = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.036, 0.09, 24),
      darkMetalMat
    );
    condenser.position.set(0, 0.43, 0.09);
    group.add(condenser);

    const slideGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.19, 0.006, 0.068),
      new THREE.MeshPhysicalMaterial({
        color: 0xe0f2fe,
        transmission: 0.85,
        transparent: true,
        opacity: 0.9,
        roughness: 0.05
      })
    );
    slideGlass.position.set(0, 0.52, 0.09);
    group.add(slideGlass);

    const specimenCover = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.008, 20),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    specimenCover.position.set(0, 0.525, 0.09);
    group.add(specimenCover);

    // 5. Revólver cuádruple con 4 objetivos DIN codificados por color
    const nosepiece = new THREE.Mesh(
      new THREE.CylinderGeometry(0.082, 0.092, 0.042, 28),
      chromeMat
    );
    nosepiece.position.set(0, 0.84, 0.08);
    nosepiece.rotation.x = 0.16;
    group.add(nosepiece);

    const objectives = [
      { angle: 0, len: 0.16, bandColor: 0x38bdf8 },
      { angle: Math.PI / 2, len: 0.11, bandColor: 0xef4444 },
      { angle: Math.PI, len: 0.14, bandColor: 0xeab308 },
      { angle: (3 * Math.PI) / 2, len: 0.17, bandColor: 0xf8fafc }
    ];
    objectives.forEach((obj) => {
      const objGroup = new THREE.Group();
      const ox = Math.sin(obj.angle) * 0.052;
      const oz = Math.cos(obj.angle) * 0.052;
      objGroup.position.set(ox, 0.83, 0.08 + oz);
      objGroup.rotation.x = obj.angle === 0 ? 0.08 : 0.24;

      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.013, obj.len, 20),
        chromeMat
      );
      barrel.position.y = -obj.len / 2;
      objGroup.add(barrel);

      const colorRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.019, 0.019, 0.016, 20),
        new THREE.MeshBasicMaterial({ color: obj.bandColor })
      );
      colorRing.position.y = -obj.len * 0.65;
      objGroup.add(colorRing);

      group.add(objGroup);
    });

    // 6. Cabezal binocular Siedentopf y dos oculares WF10x inclinados
    const headBlock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.09, 0.12, 24),
      enamelMat
    );
    headBlock.position.set(0, 1.02, 0.05);
    group.add(headBlock);

    [-0.044, 0.044].forEach((xOff) => {
      const ocularGroup = new THREE.Group();
      ocularGroup.position.set(xOff, 1.07, 0.08);
      ocularGroup.rotation.x = 0.56;

      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.024, 0.022, 0.19, 20),
        darkMetalMat
      );
      tube.position.y = 0.095;
      ocularGroup.add(tube);

      const silverRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.022, 20),
        brassMat
      );
      silverRing.position.y = 0.175;
      ocularGroup.add(silverRing);

      const eyeCup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.024, 0.032, 20),
        darkMetalMat
      );
      eyeCup.position.y = 0.20;
      ocularGroup.add(eyeCup);

      group.add(ocularGroup);
    });

    const proxy = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 1.32, 0.56),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    proxy.position.set(0, 0.66, 0);
    proxy.userData = { toolId: 'microscope' };
    group.add(proxy);

    return group;
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

    return station;
  }

  /**
   * Construye el Mueble 3D Clasificado de Componentes STEAM (Prolongo & Pinto · RSEQ / Scientix)
   * con 3 repisas categorizadas y 9 componentes modelados en 3D y etiquetados individualmente.
   */
  function buildClassifiedComponentsCabinet(glassMaterial: THREE.MeshPhysicalMaterial): THREE.Group {
    const cabinet = new THREE.Group();
    cabinet.position.set(1.76, 0, -0.44);
    cabinet.rotation.y = -0.46;

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
    scene.background = new THREE.Color(0x142833);
    scene.fog = new THREE.FogExp2(0x142833, 0.045);

    camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    camera.position.set(0.08, 1.9, 3.45);

    const basicGraphics = explorationStore.renderQuality === 'basic';
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, basicGraphics ? 1 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = !basicGraphics;
    renderer.shadowMap.type = THREE.PCFShadowMap;

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

    // Iluminación
    const ambientLight = new THREE.HemisphereLight(0xd7e9ed, 0x293b43, 1.35);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e6, 2.4);
    keyLight.position.set(2.5, 4.5, 3.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.SpotLight(0xa8d9e0, 6, 10, Math.PI / 3, 0.5);
    rimLight.position.set(-2.5, 3.0, -2.0);
    scene.add(rimLight);

    // Luz cálida focalizada sobre el Libro 3D a la derecha
    const bookSpotLight = new THREE.SpotLight(0xfbbf24, 5.5, 5, Math.PI / 4, 0.6);
    bookSpotLight.position.set(1.6, 1.8, 1.1);
    bookSpotLight.target.position.set(1.52, 0, 0.34);
    scene.add(bookSpotLight);
    scene.add(bookSpotLight.target);

    underGlowLight = new THREE.PointLight(0x10b981, 0.35, 1.1);
    underGlowLight.position.set(0, 0.25, 0);
    scene.add(underGlowLight);

    // Mesa de laboratorio compuesta
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x819397, roughness: 0.58, metalness: 0.15 });
    const bench = roundedBox(5.1, 0.16, 2.65, 0.06, benchMat);
    bench.position.y = -0.08;
    scene.add(bench);
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x334c59, roughness: 0.4, metalness: 0.45 });
    const underside = roundedBox(4.95, 0.08, 2.48, 0.035, trimMat);
    underside.position.y = -0.2;
    scene.add(underside);
    [-2.15, 2.15].forEach((x) => {
      const leg = roundedBox(0.09, 1.3, 0.12, 0.025, trimMat);
      leg.position.set(x, -0.88, 0.7);
      scene.add(leg);
    });
    const mat = roundedBox(
      4.24,
      0.008,
      1.97,
      0.003,
      new THREE.MeshStandardMaterial({ color: 0x253d47, roughness: 0.95 })
    );
    mat.position.set(0, 0.004, 0.02);
    scene.add(mat);
    const matLabel = textPlate('SYMBIOLAB  /  QUÍMICA VIRTUAL', 0.88, 0.055, '#819da7', '#253d47');
    matLabel.rotation.x = -Math.PI / 2;
    matLabel.position.set(-1.15, 0.009, -0.86);
    scene.add(matLabel);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x172a34, roughness: 1 })
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

    // Matraces Erlenmeyer (Izquierda y Derecha)
    const hclRig = buildErlenmeyerFlask(
      'hcl',
      labStore.reagents[0].formula,
      labStore.reagents[0].name,
      parseInt(labStore.reagents[0].colorHex.slice(1), 16),
      labStore.reagents[0].colorHex,
      -1.08,
      borosilicateGlassMat
    );
    const naohRig = buildErlenmeyerFlask(
      'naoh',
      labStore.reagents[1].formula,
      labStore.reagents[1].name,
      parseInt(labStore.reagents[1].colorHex.slice(1), 16),
      labStore.reagents[1].colorHex,
      1.08,
      borosilicateGlassMat
    );
    flasks = { hcl: hclRig, naoh: naohRig };

    // Libro 3D en el costado derecho de la mesa
    bookGroup = buildInteractiveHomeBook();
    scene.add(bookGroup);

    // Mueble 3D Clasificado de Componentes STEAM (Prolongo & Pinto · RSEQ / Scientix)
    const componentsCabinet = buildClassifiedComponentsCabinet(borosilicateGlassMat);
    scene.add(componentsCabinet);

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
    let wasPinched = false;
    const gestureOffset = new THREE.Vector3();

    function releaseGesture() {
      if (gestureFlaskId) {
        const rig = flasks[gestureFlaskId];
        rig.targetPos.copy(rig.homePos);
        rig.targetRotZ = 0;
        flowAccumulator = 0;
      }
      gestureFlaskId = null;
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
      | { type: 'tool'; toolId: LabToolInfo['id'] }
      | { type: 'cabinet'; compId: string }
      | null {
      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);
      const targets = [
        flasks.hcl.group,
        flasks.naoh.group,
        bookGroup,
        ...interactiveToolGroups,
        ...cabinetItemGroups
      ];
      const hits = raycaster.intersectObjects(targets, true);
      if (hits.length === 0) return null;

      let curr: THREE.Object3D | null = hits[0].object;
      while (curr) {
        if (curr.userData?.flaskId) return { type: 'flask', id: curr.userData.flaskId };
        if (curr.userData?.isHomeBook) return { type: 'book' };
        if (curr.userData?.toolId) return { type: 'tool', toolId: curr.userData.toolId };
        if (curr.userData?.cabinetComponentId)
          return { type: 'cabinet', compId: curr.userData.cabinetComponentId };
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

      if (hit.type === 'book') {
        labSound.playBookOpen();
        labStore.isHomeBookOpen = true;
        return;
      }

      if (hit.type === 'tool') {
        handleToolInteraction(hit.toolId);
        return;
      }

      if (hit.type === 'cabinet') {
        labSound.playInstrumentClick();
        labStore.selectCabinetComponent(hit.compId as CabinetComponentInfo['id']);
        return;
      }

      if (hit.type === 'flask') {
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
      if (hit?.type === 'flask') {
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

    function animate(timestamp?: number) {
      timer.update(timestamp);
      const dt = Math.min(timer.getDelta(), 0.1);
      const elapsed = timer.getElapsed();
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
        cancelInteraction();
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
        dropperBulbMesh.scale.lerp(new THREE.Vector3(1, 1, 1), dt * 8);
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
        grp.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), dt * 10);
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

      const hand = labStore.gestureInput;
      const handFresh = hand && hand.tracked && performance.now() - hand.timestampMs < 250;
      const handEnabled =
        labStore.isCameraActive &&
        !(labStore.isExplorationMode && explorationStore.pendingSafety) &&
        !draggedFlaskId &&
        !labStore.activePourAnim &&
        !labStore.isCatalogOpen &&
        !labStore.isCameraModalOpen &&
        !labStore.isHomeBookOpen &&
        !labStore.isNotebookOpen &&
        !labStore.isHypothesisModalOpen;
      handCursor = handEnabled && handFresh ? { x: hand.x, y: hand.y, pinched: hand.pinched } : null;
      let gestureCanPour = false;
      if (!handEnabled || !hand || performance.now() - hand.timestampMs >= 1500) {
        releaseGesture();
        wasPinched = hand?.pinched ?? false;
      } else if (handFresh) {
        pointer.set(hand.x * 2 - 1, 1 - hand.y * 2);
        raycaster.setFromCamera(pointer, camera);
        dragPlane.constant = -0.15;
        if (hand.pinched && !wasPinched && !gestureFlaskId) {
          const hits = raycaster.intersectObjects([flasks.hcl.group, flasks.naoh.group], true);
          let curr: THREE.Object3D | null = hits[0]?.object ?? null;
          while (curr && !curr.userData?.flaskId) curr = curr.parent;
          const id = curr?.userData?.flaskId as 'hcl' | 'naoh' | undefined;
          if (id) {
            gestureFlaskId = id;
            labStore.selectReagent(id);
            flowAccumulator = 0;
            if (raycaster.ray.intersectPlane(dragPlane, intersectPt)) {
              gestureOffset.copy(flasks[id].group.position).sub(intersectPt);
              gestureOffset.y = 0;
            }
          }
        }
        if (!hand.pinched) releaseGesture();
        if (gestureFlaskId && raycaster.ray.intersectPlane(dragPlane, intersectPt)) {
          intersectPt.add(gestureOffset);
          const overZone = moveFlask(flasks[gestureFlaskId], intersectPt, Math.abs(hand.tilt));
          gestureCanPour = overZone && hand.pouring;
          labStore.gestureStatus = overZone
            ? hand.pouring
              ? 'Vertiendo: abre la pinza para detener'
              : 'Frasco sobre el vaso: gira la mano para verter'
            : 'Frasco agarrado: muévelo hacia el vaso';
        }
        wasPinched = hand.pinched;
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
        const smoothing = 1 - Math.exp(-8 * dt);
        const returning = rig.targetPos.y < 0.5;
        rig.group.rotation.z = THREE.MathUtils.lerp(
          rig.group.rotation.z,
          !returning && rig.group.position.y < 1.4 ? 0 : rig.targetRotZ,
          smoothing
        );
        const safeTarget = rig.targetPos.clone();
        if (returning && Math.abs(rig.group.rotation.z) > 0.15) safeTarget.y = 1.65;
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

        const isSel = selectedId === id || hoveredFlaskId === id || draggedFlaskId === id;
        rig.ringMat.opacity = isSel ? 0.9 : 0.25;
        rig.ringMesh.scale.setScalar(isSel ? 1.08 : 1.0);
      });

      const nozzle = flowingRig
        ? new THREE.Vector3(-Math.sign(flowingRig.group.rotation.z) * 0.09, 0.81, 0)
            .applyEuler(flowingRig.group.rotation)
            .add(flowingRig.group.position)
        : new THREE.Vector3();
      if (flowingRig && streamHitsBeaker(nozzle)) {
        requestedFlow = pourRate(flowingRig.group.rotation.z, flowingRig.fluidHeight) * dt;
      }
      const reagent = flowingRig && labStore.reagents.find((r) => r.reagentId === flowingRig?.id);
      const isFlowing =
        requestedFlow > 0 &&
        !(labStore.isExplorationMode && (explorationStore.pendingSafety || explorationStore.result.stopped)) &&
        (reagent?.remainingMl ?? 0) > 0 &&
        labStore.availableCapacityMl > 0;
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

      controls.update(dt);
      renderer?.render(scene, camera);
    }

    renderer.setAnimationLoop(animate);

    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.fov = THREE.MathUtils.radToDeg(
        2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(42 / 2)) * Math.max(1, 1.45 / camera.aspect))
      );
      camera.updateProjectionMatrix();
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
      window.removeEventListener('blur', cancelInteraction);
      document.removeEventListener('visibilitychange', onVisibility);
      labStore.activePourAnim = null;
      resizeObserver.disconnect();
    };
  });

  onDestroy(() => {
    timer?.dispose();
    controls?.dispose();
    if (scene) {
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) geometries.add(mesh.geometry);
        if (mesh.material)
          (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) =>
            materials.add(m)
          );
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => {
        for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
        m.dispose();
      });
      if (scene.environment instanceof THREE.Texture) scene.environment.dispose();
    }
    if (renderer) {
      renderer.setAnimationLoop(null);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }
  });
</script>

<div class="relative w-full h-full overflow-hidden select-none bg-[#080c14]">
  <div bind:this={container} class="w-full h-full"></div>

  {#if handCursor}
    <div
      class="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-lg flex items-center justify-center {handCursor.pinched
        ? 'w-6 h-6 border-amber-200 bg-amber-400/70'
        : 'w-9 h-9 border-white bg-amber-400/20'}"
      style:left={`${handCursor.x * 100}%`}
      style:top={`${handCursor.y * 100}%`}
      aria-hidden="true"
    ></div>
  {/if}

  <!-- Píldora espacial contextual (estilo Apple visionOS Look Pill, sin colores chillones ni emojis) -->
  {#if isBookHovered}
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

  <!-- INSPECTOR ESPACIAL DE COMPONENTE STEAM (ESTILO AIRPODS / VISIONOS) -->
  {#if labStore.selectedCabinetComponent}
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
  {:else if labStore.inspectedTool && labStore.inspectedTool.id !== 'ph_meter'}
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
