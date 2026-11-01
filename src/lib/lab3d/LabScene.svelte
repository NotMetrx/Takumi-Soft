<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
  import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
  import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
  import { Timer } from 'three/addons/misc/Timer.js';
  import { flaskFluid, pourRate, streamHitsBeaker } from './fluid';
  import { explorationStore } from '$lib/exploration/exploration_store.svelte';
  import { labStore } from '$lib/interaction/lab_store.svelte';

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

  // Pantalla 3D del pH-metro
  let phScreenCanvas: HTMLCanvasElement;
  let phScreenCtx: CanvasRenderingContext2D | null = null;
  let phScreenTexture: THREE.CanvasTexture;

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
  let isBookHovered = $state<boolean>(false);

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

  // Reactividad del Store
  const result = $derived(labStore.beaker.currentResult);
  const totalVolume = $derived(labStore.totalVolumeMl);
  const selectedId = $derived(labStore.selectedReagentId);
  const activePourAnim = $derived(labStore.activePourAnim);
  const presetRevision = $derived(labStore.presetRevision);

  const targetLiquidColor = new THREE.Color(0x10b981);
  let currentFillRatio = 50 / 250;
  let targetFillRatio = 50 / 250;

  function drawPhMeterScreen(pH: number | null, tempC: number | null, bandName: string, hexColor: string, volMl: number) {
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
    ctx.fillText(`T: ${(tempC?.toFixed(1) ?? '—')}°C   VOL: ${volMl.toFixed(0)} mL`, 26, 222);

    if (phScreenTexture) {
      phScreenTexture.needsUpdate = true;
    }
  }

  $effect(() => {
    if (labStore.isExplorationMode) {
      const r = explorationStore.result;
      const hex = explorationStore.indicator || r.coverage !== 'quantitative' ? r.color : '#b6d6e2';
      targetLiquidColor.set(hex);
      drawPhMeterScreen(r.pH, r.temperatureC, r.pH === null ? 'SIN MODELO DE pH' : 'pH REF. 25 C', hex, totalVolume);
    } else if (result) {
      targetLiquidColor.set(result.indicatorBand.colorHex);
      drawPhMeterScreen(
        result.pH,
        labStore.beaker.temperatureC,
        result.indicatorBand.name,
        result.indicatorBand.colorHex,
        totalVolume
      );
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

  // Actualizar etiquetas 3D y colores de matraces cuando el usuario elige un Experimento Casero del Libro
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
    canvas.width = 768; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = background; ctx.fillRect(0, 0, 768, 128);
    ctx.fillStyle = ink; ctx.font = '500 40px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 384, 64, 716);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
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
      const y = canvas.height * (1 - (0.02 + 0.8 * ml / 250) / 0.86);
      const major = ml % 50 === 0;
      ctx.beginPath(); ctx.moveTo(centerX - (major ? 34 : 18), y); ctx.lineTo(centerX, y); ctx.stroke();
      if (major) ctx.fillText(String(ml), centerX + 12, y + 6);
    }
    ctx.font = '500 17px sans-serif';
    ctx.fillText('mL', centerX - 32, 24);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }

  function createFlaskLabelTexture(
    formula: string,
    subtitle: string,
    accentHex: string,
    specLine = '0.01 mol/L · 100 mL'
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 768; canvas.height = 384;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#eaf0ed'; ctx.fillRect(0, 0, 768, 384);
    ctx.fillStyle = accentHex; ctx.fillRect(0, 0, 20, 384);
    ctx.fillStyle = '#263d43'; ctx.font = '600 26px sans-serif';
    ctx.fillText('SYMBIOLAB  /  REACTIVO VIRTUAL', 52, 57);
    ctx.font = '700 100px sans-serif'; ctx.fillStyle = '#132a31';
    ctx.fillText(formula, 48, 180, 670);
    ctx.font = '500 35px sans-serif'; ctx.fillStyle = '#354e57';
    ctx.fillText(subtitle, 52, 250, 660);
    ctx.font = '500 31px monospace'; ctx.fillStyle = '#354e57';
    ctx.fillText(specLine, 52, 326, 660);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }

  /**
   * Genera la textura de las páginas abiertas del Libro de Actividades de química en la mesa
   */
  function createOpenBookPagesTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 768;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(0, 0, 1024, 768);
    ctx.fillStyle = '#172554'; ctx.font = 'bold 48px sans-serif';
    ctx.fillText('EXPLORA', 60, 110); ctx.fillText('OBSERVA', 560, 110);
    ctx.font = '28px sans-serif';
    const topics = labStore.isExplorationMode
      ? ['Acidos y bases', 'Equilibrio y tampones', 'Carbonatos y CO2', 'Precipitacion', 'Yodo y almidon']
      : ['HCl y NaOH', 'Modelo a 25 C', 'Neutralizacion', 'Indicador virtual', 'Conservacion'];
    topics.forEach((t, i) => ctx.fillText(t, 60, 230 + i * 75));
    ['Lee las fichas', 'Plantea tu pregunta', 'Mide y compara', 'Reconoce el peligro', 'Explica lo observado'].forEach((t, i) => ctx.fillText(t, 560, 230 + i * 75));
    return new THREE.CanvasTexture(canvas);
  }

  function buildInteractiveHomeBook(): THREE.Group {
    const group = new THREE.Group();
    // Ubicado al costado derecho de la mesa, inclinado hacia el estudiante
    group.position.set(1.58, 0.02, 0.5);
    group.scale.setScalar(0.66);
    group.rotation.y = -0.42;
    group.userData = { isHomeBook: true };

    // Atril de lectura inclinado de madera/metal oscuro bajo el libro
    const standGeo = new THREE.BoxGeometry(0.68, 0.06, 0.48);
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

    // Tapa dura del libro (Cubierta color ámbar/índigo)
    const coverGeo = new THREE.BoxGeometry(0.66, 0.025, 0.46);
    const coverMat = new THREE.MeshStandardMaterial({
      color: 0x617c7c,
      roughness: 0.35,
      metalness: 0.1
    });
    const cover = new THREE.Mesh(coverGeo, coverMat);
    cover.position.set(0, 0.08, 0);
    cover.rotation.x = 0.24;
    cover.castShadow = true;
    group.add(cover);

    // Bloque de páginas blancas abiertas con la textura ilustrada
    const pagesTex = createOpenBookPagesTexture();
    const pagesMaterials = [
      new THREE.MeshStandardMaterial({ color: 0xfef3c7 }), // right edge
      new THREE.MeshStandardMaterial({ color: 0xfef3c7 }), // left edge
      new THREE.MeshBasicMaterial({ map: pagesTex }), // top open pages!
      new THREE.MeshStandardMaterial({ color: 0x617c7c }), // bottom
      new THREE.MeshStandardMaterial({ color: 0xfef3c7 }), // front edge
      new THREE.MeshStandardMaterial({ color: 0xfef3c7 }) // back edge
    ];
    const pagesGeo = new THREE.BoxGeometry(0.62, 0.032, 0.42);
    const pagesMesh = new THREE.Mesh(pagesGeo, pagesMaterials);
    pagesMesh.position.set(0, 0.105, 0);
    pagesMesh.rotation.x = 0.24;
    pagesMesh.castShadow = true;
    pagesMesh.userData = { isHomeBook: true };
    group.add(pagesMesh);

    // Cinta marcapáginas roja sobresaliendo
    const ribbonGeo = new THREE.BoxGeometry(0.035, 0.006, 0.12);
    const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
    const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
    ribbon.position.set(0.12, 0.06, 0.24);
    ribbon.rotation.x = 0.24;
    group.add(ribbon);

    // Aro luminoso pulsante alrededor del libro para indicar que es interactivo
    const glowGeo = new THREE.RingGeometry(0.42, 0.47, 48);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xbad3cc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55
    });
    bookGlowRing = new THREE.Mesh(glowGeo, glowMat);
    bookGlowRing.rotation.x = -Math.PI / 2;
    bookGlowRing.position.y = 0.005;
    group.add(bookGlowRing);

    // Proxy de colisión amplio para que sea comodísimo hacer clic
    const proxyGeo = new THREE.BoxGeometry(0.75, 0.35, 0.55);
    const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
    const proxy = new THREE.Mesh(proxyGeo, proxyMat);
    proxy.position.y = 0.14;
    proxy.userData = { isHomeBook: true };
    group.add(proxy);

    return group;
  }

  /**
   * Construye la Gradilla de Tubos de Ensayo de Referencia Colorimétrica (pH 2, 5, 7, 9, 12)
   * y el entorno arquitectónico de laboratorio al fondo.
   */
  function buildLabEnvironmentAndRack(glassMaterial: THREE.MeshPhysicalMaterial): THREE.Group {
    const group = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x193340, roughness: 0.9 });
    const wall = roundedBox(5.4, 3.1, 0.12, 0.04, wallMat);
    wall.position.set(0, 0.95, -1.5); group.add(wall);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x203e4b, roughness: 0.85 });
    [-1.7, 0, 1.7].forEach(x => {
      const panel = roundedBox(1.62, 2.12, 0.02, 0.01, panelMat);
      panel.position.set(x, 1.1, -1.425); group.add(panel);
    });
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x40545c, roughness: 0.45, metalness: 0.35 });
    const shelf = roundedBox(4.2, 0.04, 0.3, 0.015, shelfMat);
    shelf.position.set(0, 1.38, -1.27); group.add(shelf);
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(3.95, 0.008, 0.016), new THREE.MeshBasicMaterial({ color: 0xaddbd7 }));
    diffuser.position.set(0, 1.353, -1.13); group.add(diffuser);
    const amber = new THREE.MeshStandardMaterial({ color: 0x5b4630, roughness: 0.3, metalness: 0.1 });
    [-1.6, -1.3, 1.55].forEach(x => {
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.21, 20), amber);
      bottle.position.set(x, 1.505, -1.28); group.add(bottle);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.041, 0.04, 16), shelfMat);
      cap.position.set(x, 1.63, -1.28); group.add(cap);
    });
    const sign = textPlate('SYMBIOLAB  /  OBSERVA Y DESCUBRE', 1.38, 0.16, '#c4d8da', '#203e4b');
    sign.position.set(0.25, 1.72, -1.4); group.add(sign);

    const rack = new THREE.Group(); rack.position.set(1.02, 0, -0.83);
    const rackMat = new THREE.MeshStandardMaterial({ color: 0xc2ccca, roughness: 0.4, metalness: 0.25 });
    const tray = roundedBox(0.82, 0.04, 0.23, 0.016, rackMat); tray.position.y = 0.025; rack.add(tray);
    [-0.37, 0.37].forEach(x => {
      const upright = roundedBox(0.025, 0.25, 0.17, 0.008, rackMat);
      upright.position.set(x, 0.16, 0); rack.add(upright);
    });
    [-0.075, 0.075].forEach(z => {
      const support = roundedBox(0.78, 0.025, 0.025, 0.008, rackMat);
      support.position.set(0, 0.27, z); rack.add(support);
    });
    [0xf0a18e, 0xe7c77d, 0x8ed1a5, 0x73b9ce, 0xae9bda].forEach((color, i) => {
      const x = (i - 2) * 0.14;
      const tube = new THREE.Mesh(new THREE.LatheGeometry([
        new THREE.Vector2(0, 0), new THREE.Vector2(0.025, 0.008),
        new THREE.Vector2(0.032, 0.04), new THREE.Vector2(0.032, 0.37),
        new THREE.Vector2(0.027, 0.37), new THREE.Vector2(0.025, 0.04), new THREE.Vector2(0, 0.016)
      ], 20), glassMaterial);
      tube.position.set(x, 0.05, 0); tube.renderOrder = 3; rack.add(tube);
      const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.17, 18), new THREE.MeshStandardMaterial({ color, roughness: 0.28, transparent: true, opacity: 0.9 }));
      liquid.position.set(x, 0.15, 0); liquid.renderOrder = 2; rack.add(liquid);
    });
    const rackLabel = textPlate('REFERENCIA DE INDICADOR', 0.67, 0.048, '#3b5259', '#c2ccca');
    rackLabel.position.set(0, 0.071, 0.117); rack.add(rackLabel);
    group.add(rack);
    return group;
  }

  function buildCentralBeakerStation(glassMaterial: THREE.MeshPhysicalMaterial): THREE.Group {
    const station = new THREE.Group();
    station.position.set(0, 0, 0);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd2d9d6, roughness: 0.42, metalness: 0.15 });
    const plateBase = roundedBox(1.12, 0.09, 1.04, 0.035, bodyMat);
    plateBase.position.y = 0.045; station.add(plateBase);
    const top = roundedBox(0.94, 0.015, 0.83, 0.007, new THREE.MeshStandardMaterial({ color: 0xa9b6b4, roughness: 0.6, metalness: 0.12 }));
    top.position.y = 0.095; station.add(top);
    const front = textPlate('AGITADOR  /  VIRTUAL', 0.62, 0.043, '#39525c', '#d2d9d6');
    front.position.set(-0.12, 0.048, 0.524); station.add(front);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.022, 24), new THREE.MeshStandardMaterial({ color: 0x354d56, roughness: 0.5, metalness: 0.3 }));
    knob.rotation.x = Math.PI / 2; knob.position.set(0.4, 0.048, 0.53); station.add(knob);
    const status = new THREE.Mesh(new THREE.CircleGeometry(0.009, 12), new THREE.MeshBasicMaterial({ color: 0x93d7be }));
    status.position.set(0.31, 0.048, 0.533); station.add(status);

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
    const rimMesh = new THREE.Mesh(rimGeo, new THREE.MeshStandardMaterial({ color: 0xb3ced6, transparent: true, opacity: 0.55, roughness: 0.2, metalness: 0.15 }));
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

    return station;
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
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.117, 0.008, 8, 40), new THREE.MeshStandardMaterial({ color: 0xb3ced6, transparent: true, opacity: 0.65, roughness: 0.18 }));
    lip.rotation.x = Math.PI / 2; lip.position.y = 0.81; group.add(lip);
    const marker = textPlate(id === 'hcl' ? 'A  /  REACTIVO' : 'B  /  REACTIVO', 0.43, 0.068, '#bed4da', '#2a414b');
    marker.rotation.x = -Math.PI / 2; marker.position.set(xPos, 0.015, 0.67); scene.add(marker);

    const liqGeo = new THREE.BufferGeometry();
    liqGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9216), 3).setUsage(THREE.DynamicDrawUsage));
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
    const data = labStore.reagents.find(r => r.reagentId === id)!;
    const labelTex = createFlaskLabelTexture(formula, subtitle, accentCss, `${data.concentrationMolPerL} mol/L · ${data.initialMl} mL`);
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
    const housing = new THREE.MeshStandardMaterial({ color: 0xbfcac9, roughness: 0.4, metalness: 0.15 });
    const graphite = new THREE.MeshStandardMaterial({ color: 0x2c434e, roughness: 0.5, metalness: 0.25 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x9caeb3, roughness: 0.28, metalness: 0.7 });
    const foot = roundedBox(0.54, 0.04, 0.34, 0.015, graphite);
    foot.position.set(-0.83, 0.026, -0.65); group.add(foot);
    const support = roundedBox(0.06, 0.51, 0.055, 0.015, steel);
    support.position.set(-0.83, 0.29, -0.69); group.add(support);
    const body = roundedBox(0.68, 0.38, 0.09, 0.035, housing);
    body.position.set(-0.83, 0.63, -0.62); body.rotation.x = -0.2; group.add(body);
    phScreenCanvas = document.createElement('canvas');
    phScreenCanvas.width = 512; phScreenCanvas.height = 256;
    phScreenCtx = phScreenCanvas.getContext('2d');
    phScreenTexture = new THREE.CanvasTexture(phScreenCanvas); phScreenTexture.colorSpace = THREE.SRGBColorSpace;
    const display = new THREE.Mesh(new THREE.PlaneGeometry(0.59, 0.295), new THREE.MeshBasicMaterial({ map: phScreenTexture, toneMapped: false }));
    display.position.set(0, 0.018, 0.047); body.add(display);
    [-0.2, 0, 0.2].forEach(x => {
      const key = roundedBox(0.08, 0.02, 0.007, 0.003, graphite);
      key.position.set(x, -0.157, 0.047); body.add(key);
    });
    const standFoot = roundedBox(0.3, 0.04, 0.29, 0.015, graphite);
    standFoot.position.set(0.59, 0.026, -0.43); group.add(standFoot);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.23, 18), steel);
    rod.position.set(0.59, 0.65, -0.43); group.add(rod);
    const start = new THREE.Vector3(0.59, 1.23, -0.43), end = new THREE.Vector3(0.12, 1.23, 0.04);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, start.distanceTo(end), 16), steel);
    arm.position.copy(start).add(end).multiplyScalar(0.5);
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize()); group.add(arm);
    const clamp = roundedBox(0.065, 0.07, 0.065, 0.012, graphite);
    clamp.position.copy(start); group.add(clamp);
    const probeHead = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.14, 18), graphite);
    probeHead.position.set(0.12, 1.15, 0.04); group.add(probeHead);
    const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.86, 18), new THREE.MeshStandardMaterial({ color: 0xa6c7cd, roughness: 0.3, metalness: 0.15, transparent: true, opacity: 0.65 }));
    probe.position.set(0.12, 0.65, 0.04); group.add(probe);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), new THREE.MeshStandardMaterial({ color: 0xb3dcd5, roughness: 0.23 }));
    tip.position.set(0.12, 0.21, 0.04); group.add(tip);
    const cable = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.72, 0.60, -0.7), new THREE.Vector3(-0.55, 0.15, -0.95),
      new THREE.Vector3(0.4, 0.13, -0.85), new THREE.Vector3(0.6, 1.27, -0.45), new THREE.Vector3(0.12, 1.27, 0.04)
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(cable, 45, 0.007, 6, false), graphite));
    const current = explorationStore.result;
    drawPhMeterScreen(labStore.isExplorationMode ? current.pH : labStore.beaker.currentResult?.pH ?? 7,
      labStore.isExplorationMode ? current.temperatureC : 25, 'REFERENCIA 25 C', current.color, labStore.totalVolumeMl);
    return group;
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
      'Laboratorio químico 3D interactivo con vaso de precipitado de 250 mL, pH-metro digital, matraces reactivos, gradilla colorimétrica y Libro de Actividades de química en la mesa.'
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

    // Luz cálida focalizada sobre el Libro de Actividades de química a la derecha
    const bookSpotLight = new THREE.SpotLight(0xfbbf24, 5.5, 5, Math.PI / 4, 0.6);
    bookSpotLight.position.set(1.6, 1.8, 1.1);
    bookSpotLight.target.position.set(1.52, 0, 0.34);
    scene.add(bookSpotLight);
    scene.add(bookSpotLight.target);

    underGlowLight = new THREE.PointLight(0x10b981, 0.35, 1.1);
    underGlowLight.position.set(0, 0.25, 0);
    scene.add(underGlowLight);

    // Rounded composite worktop, quiet work mat and grounded supports.
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x819397, roughness: 0.58, metalness: 0.15 });
    const bench = roundedBox(4.8, 0.16, 2.65, 0.06, benchMat);
    bench.position.y = -0.08; scene.add(bench);
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x334c59, roughness: 0.4, metalness: 0.45 });
    const underside = roundedBox(4.65, 0.08, 2.48, 0.035, trimMat);
    underside.position.y = -0.2; scene.add(underside);
    [-2.05, 2.05].forEach(x => {
      const leg = roundedBox(0.09, 1.3, 0.12, 0.025, trimMat);
      leg.position.set(x, -0.88, 0.7); scene.add(leg);
    });
    const mat = roundedBox(3.94, 0.008, 1.97, 0.003, new THREE.MeshStandardMaterial({ color: 0x253d47, roughness: 0.95 }));
    mat.position.set(0, 0.004, 0.02); scene.add(mat);
    const matLabel = textPlate('SYMBIOLAB  /  QUÍMICA VIRTUAL', 0.88, 0.055, '#819da7', '#253d47');
    matLabel.rotation.x = -Math.PI / 2; matLabel.position.set(-1.15, 0.009, -0.86); scene.add(matLabel);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x172a34, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -1.55; floor.receiveShadow = true; scene.add(floor);

    const borosilicateGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xcce4ec,
      transmission: basicGraphics ? 0 : 0.92,
      opacity: basicGraphics ? 0.10 : 1,
      depthWrite: !basicGraphics,
      transparent: true,
      roughness: 0.06,
      ior: 1.47,
      thickness: 0.08,
      reflectivity: 0.9,
      side: THREE.FrontSide
    });

    // Entorno arquitectónico + Gradilla de tubos de ensayo
    const labEnv = buildLabEnvironmentAndRack(borosilicateGlassMat);
    scene.add(labEnv);

    // Vaso central + pH-metro
    const beakerStation = buildCentralBeakerStation(borosilicateGlassMat);
    scene.add(beakerStation);

    const phMeter = buildPhMeterInstrument();
    scene.add(phMeter);

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

    // Libro 3D de Actividades de química en el costado derecho de la mesa
    bookGroup = buildInteractiveHomeBook();
    scene.add(bookGroup);

    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.415, 0.415, 0.018, 48),
      new THREE.MeshStandardMaterial({ color: 0xa8bcbd, metalness: 0.5, roughness: 0.35, transparent: true, opacity: 0.72 }));
    lid.position.set(0, 1.04, 0); lid.visible = false; scene.add(lid);
    const sediment = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.1, 40),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.85 }));
    sediment.position.set(0, 0.13, 0); sediment.visible = false; scene.add(sediment);
    const bubbleGeo = new THREE.BufferGeometry();
    bubbleGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(90), 3));
    const bubbles = new THREE.Points(bubbleGeo, new THREE.PointsMaterial({ color: 0xe0f2fe, size: 0.018, transparent: true, opacity: 0.7 }));
    bubbles.visible = false; scene.add(bubbles);
    let lastGas = 0, bubblingUntil = 0;

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

    // Raycaster para Matraces y para el Libro 3D en la mesa
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

    function checkInteractiveHit(e: PointerEvent): { type: 'flask'; id: 'hcl' | 'naoh' } | { type: 'book' } | null {
      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);
      const targets = [flasks.hcl.group, flasks.naoh.group, bookGroup];
      const hits = raycaster.intersectObjects(targets, true);
      if (hits.length === 0) return null;

      let curr: THREE.Object3D | null = hits[0].object;
      while (curr) {
        if (curr.userData?.flaskId) return { type: 'flask', id: curr.userData.flaskId };
        if (curr.userData?.isHomeBook) return { type: 'book' };
        curr = curr.parent;
      }
      return null;
    }

    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0 || activePointerId !== null || labStore.activePourAnim || (labStore.isExplorationMode && explorationStore.pendingSafety)) return;
      const hit = checkInteractiveHit(e);
      if (!hit) return;

      if (hit.type === 'book') {
        labStore.isHomeBookOpen = true;
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
        renderer!.domElement.style.cursor = 'grab';
      } else if (hit?.type === 'book') {
        hoveredFlaskId = null;
        isBookHovered = true;
        renderer!.domElement.style.cursor = 'pointer';
      } else {
        hoveredFlaskId = null;
        isBookHovered = false;
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
        activePointerId = null;
        flowAccumulator = 0;
        controls.enabled = true;
        if (renderer?.domElement.hasPointerCapture(e.pointerId)) {
          renderer.domElement.releasePointerCapture(e.pointerId);
        }
      }
    }

    // Captura antes de OrbitControls para que un arrastre no rote la cámara.
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
    const onVisibility = () => { if (document.hidden) cancelInteraction(); };
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
        (sediment.material as THREE.MeshStandardMaterial).color.set(r.precipitateName?.includes('cobre') ? '#38bdf8' : '#f1f5f9');
        const gas = r.gasMl ?? 0;
        if (gas > lastGas + 1e-5) bubblingUntil = elapsed + 1.5;
        lastGas = gas;
        bubbles.visible = elapsed < bubblingUntil && !isReducedMotion;
        const pos = bubbleGeo.getAttribute('position') as THREE.BufferAttribute;
        if (bubbles.visible) {
          for (let i = 0; i < 30; i++) {
            const age = (elapsed * 0.7 + i / 30) % 1;
            pos.setXYZ(i, Math.sin(i * 8) * 0.25, 0.14 + age * Math.max(0.02, 0.8 * currentFillRatio - 0.03), Math.cos(i * 7) * 0.25);
          }
          pos.needsUpdate = true;
        }
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
        stirBarMesh.rotation.y += dt * 14;
      }

      // Animación de realce cuando el usuario apunta al Libro de Actividades de química en la mesa
      if (bookGroup && bookGlowRing) {
        const targetBookY = isBookHovered ? 0.065 : 0.02;
        bookGroup.position.y = THREE.MathUtils.lerp(bookGroup.position.y, targetBookY, dt * 10);
        const pulseScale = isBookHovered ? 1.12 : 1.0 + Math.sin(elapsed * 3) * 0.04;
        bookGlowRing.scale.setScalar(pulseScale);
        (bookGlowRing.material as THREE.MeshBasicMaterial).opacity = isBookHovered ? 0.95 : 0.45;
      }

      const hand = labStore.gestureInput;
      const handFresh = hand && hand.tracked && performance.now() - hand.timestampMs < 250;
      const handEnabled = labStore.isCameraActive && !(labStore.isExplorationMode && explorationStore.pendingSafety) && !draggedFlaskId && !labStore.activePourAnim
        && !labStore.isCatalogOpen && !labStore.isCameraModalOpen && !labStore.isHomeBookOpen && !labStore.isNotebookOpen && !labStore.isHypothesisModalOpen;
      handCursor = handEnabled && handFresh ? { x: hand.x, y: hand.y, pinched: hand.pinched } : null;
      let gestureCanPour = false;
      if (!handEnabled || !hand || performance.now() - hand.timestampMs >= 1500) {
        releaseGesture();
        wasPinched = hand?.pinched ?? false;
      } else if (handFresh) {
        pointer.set(hand.x * 2 - 1, 1 - hand.y * 2);
        raycaster.setFromCamera(pointer, camera);
        if (hand.pinched && !wasPinched) {
          scene.updateMatrixWorld(true);
          const hits = raycaster.intersectObjects([flasks.hcl.group, flasks.naoh.group], true);
          let object: THREE.Object3D | null = hits[0]?.object ?? null;
          while (object && !object.userData.flaskId) object = object.parent;
          if (object?.userData.flaskId) {
            gestureFlaskId = object.userData.flaskId as 'hcl' | 'naoh';
            labStore.selectReagent(gestureFlaskId);
            if (raycaster.ray.intersectPlane(dragPlane, intersectPt)) {
              gestureOffset.copy(flasks[gestureFlaskId].group.position).sub(intersectPt);
              gestureOffset.y = 0;
            }
          }
        }
        if (!hand.pinched) releaseGesture();
        if (gestureFlaskId && raycaster.ray.intersectPlane(dragPlane, intersectPt)) {
          intersectPt.add(gestureOffset);
          const overZone = moveFlask(flasks[gestureFlaskId], intersectPt, Math.abs(hand.tilt));
          gestureCanPour = overZone && hand.pouring;
          labStore.gestureStatus = overZone ? (hand.pouring ? 'Vertiendo: abre la pinza para detener' : 'Frasco sobre el vaso: gira la mano para verter') : 'Frasco agarrado: muévelo hacia el vaso';
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
        // Elevar primero evita atravesar el vaso al inclinar o devolver el matraz.
        const returning = rig.targetPos.y < 0.5;
        rig.group.rotation.z = THREE.MathUtils.lerp(rig.group.rotation.z,
          !returning && rig.group.position.y < 1.4 ? 0 : rig.targetRotZ, smoothing);
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

        const isSel = selectedId === id || hoveredFlaskId === id || draggedFlaskId === id;
        rig.ringMat.opacity = isSel ? 0.9 : 0.25;
        rig.ringMesh.scale.setScalar(isSel ? 1.08 : 1.0);

      });

      const nozzle = flowingRig
        ? new THREE.Vector3(-Math.sign(flowingRig.group.rotation.z) * 0.09, 0.81, 0)
            .applyEuler(flowingRig.group.rotation).add(flowingRig.group.position)
        : new THREE.Vector3();
      if (flowingRig && streamHitsBeaker(nozzle)) {
        requestedFlow = pourRate(flowingRig.group.rotation.z, flowingRig.fluidHeight) * dt;
      }
      const reagent = flowingRig && labStore.reagents.find(r => r.reagentId === flowingRig?.id);
      const isFlowing = requestedFlow > 0 && !(labStore.isExplorationMode && (explorationStore.pendingSafety || explorationStore.result.stopped)) && (reagent?.remainingMl ?? 0) > 0 && labStore.availableCapacityMl > 0;
      if (isFlowing && flowingRig) {
        flowAccumulator += requestedFlow;
        const amount = Math.min(Math.floor(flowAccumulator * 10 + 1e-8) / 10, animState?.remainingMl ?? Infinity);
        if (amount >= 0.1) {
          const before = reagent!.remainingMl;
          const appliedSuccessfully = labStore.pour(flowingRig.id, amount, labStore.activePourAnim?.source ?? (gestureFlaskId === flowingRig.id ? 'gesture' : dragSource));
          if (!appliedSuccessfully) { labStore.activePourAnim = null; flowingRig = null; }
          const applied = Number((before - reagent!.remainingMl).toFixed(1));
          flowAccumulator -= amount;
          if (animState) animState.remainingMl = Number((animState.remainingMl - applied).toFixed(1));
        }
      } else {
        flowAccumulator = 0;
      }
      if (animState && (animState.remainingMl < 0.1 || labStore.availableCapacityMl <= 0 || (reagent && reagent.remainingMl <= 0))) {
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
          posAttr.setXYZ(i, Math.cos(azimuth) * radius, 0.4 * age * (1 - age), Math.sin(azimuth) * radius);
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
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(42 / 2)) * Math.max(1, 1.45 / camera.aspect)));
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
      scene.traverse(object => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) geometries.add(mesh.geometry);
        if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => materials.add(m));
      });
      geometries.forEach(g => g.dispose());
      materials.forEach(m => { for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose(); m.dispose(); });
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
    <div class="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-lg flex items-center justify-center {handCursor.pinched ? 'w-6 h-6 border-amber-200 bg-amber-400/70' : 'w-9 h-9 border-white bg-amber-400/20'}"
      style:left={`${handCursor.x * 100}%`} style:top={`${handCursor.y * 100}%`} aria-hidden="true"></div>
  {/if}

  <!-- Notificación flotante cuando el usuario apunta al Libro 3D en la mesa -->
  {#if isBookHovered && !labStore.isExplorationMode}
    <div class="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-amber-500 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl shadow-xl flex items-center gap-2">
      <span>📖 Haz clic en el Libro de la mesa para ver los Videos de Actividades de química y practicarlos aquí</span>
    </div>
  {/if}

  <!-- Guía del prototipo; Exploración muestra su guía en el marco de la mesa. -->
  {#if !labStore.isExplorationMode}
  <div class="absolute bottom-5 left-6 z-10 pointer-events-none flex items-center gap-2.5 bg-slate-950/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800/80 text-[11px] font-medium text-slate-300 shadow-lg">
    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
    <span>
      <strong class="text-white">{labStore.isExplorationMode ? 'Exploración libre' : labStore.activePreset.title}:</strong> Arrastra un matraz al vaso. Cambia su contenido en el catálogo y observa los instrumentos.
    </span>
  </div>
  {/if}
</div>
