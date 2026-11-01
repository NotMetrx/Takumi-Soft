<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
  import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
  import { Timer } from 'three/addons/misc/Timer.js';
  import { labStore } from '$lib/interaction/lab_store.svelte';

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
  let hoveredFlaskId = $state<'hcl' | 'naoh' | null>(null);
  let isOverPourZone = $state<boolean>(false);
  let pourHoldTimer = 0;

  // Animación disparada por botón o gesto
  let animState: {
    active: boolean;
    flaskId: 'hcl' | 'naoh';
    elapsed: number;
    duration: number;
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

  function drawPhMeterScreen(pH: number, tempC: number, bandName: string, hexColor: string, volMl: number) {
    if (!phScreenCtx || !phScreenCanvas) return;
    const ctx = phScreenCtx;
    const w = phScreenCanvas.width;
    const h = phScreenCanvas.height;

    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = hexColor;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillText('SYMBIO pH-200 PRO', 26, 44);

    ctx.fillStyle = hexColor;
    ctx.beginPath();
    ctx.arc(w - 38, 36, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 86px "JetBrains Mono", monospace';
    ctx.fillText(pH.toFixed(2), 26, 138);

    ctx.fillStyle = hexColor;
    ctx.font = 'bold 28px "Outfit", sans-serif';
    ctx.fillText('pH', 295, 100);

    ctx.fillStyle = hexColor;
    ctx.font = 'bold 24px "Outfit", sans-serif';
    ctx.fillText(bandName.toUpperCase(), 26, 182);

    ctx.fillStyle = '#64748b';
    ctx.font = '500 20px "JetBrains Mono", monospace';
    ctx.fillText(`T: ${tempC.toFixed(1)}°C   VOL: ${volMl.toFixed(0)} mL`, 26, 222);

    if (phScreenTexture) {
      phScreenTexture.needsUpdate = true;
    }
  }

  $effect(() => {
    if (result) {
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
    targetFillRatio = Math.max(0.08, Math.min(0.95, totalVolume / 250));
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
          duration: 1.45
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

  function createBeakerGraduationsTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 24px "JetBrains Mono", monospace';
    ctx.lineWidth = 3;

    const centerX = 512;
    const marks = [50, 100, 150, 200, 250];
    marks.forEach((ml) => {
      const ratio = ml / 270;
      const y = canvas.height - ratio * (canvas.height * 0.82) - 30;
      ctx.beginPath();
      ctx.moveTo(centerX - 45, y);
      ctx.lineTo(centerX + 15, y);
      ctx.stroke();
      ctx.fillText(`${ml} mL`, centerX + 24, y + 8);
    });

    ctx.lineWidth = 2;
    [25, 75, 125, 175, 225].forEach((ml) => {
      const ratio = ml / 270;
      const y = canvas.height - ratio * (canvas.height * 0.82) - 30;
      ctx.beginPath();
      ctx.moveTo(centerX - 25, y);
      ctx.lineTo(centerX + 5, y);
      ctx.stroke();
    });

    ctx.font = 'bold 20px "Outfit", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('SYMBIOLAB 250 mL', centerX - 185, 95);
    ctx.font = '600 16px "JetBrains Mono", monospace';
    ctx.fillText('BORO 3.3 · ±5% · 25°C', centerX - 185, 122);

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
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const lx = 300;
    const lw = 424;
    const ly = 22;
    const lh = 212;

    ctx.fillStyle = 'rgba(248, 250, 252, 0.96)';
    ctx.beginPath();
    ctx.roundRect(lx, ly, lw, lh, 18);
    ctx.fill();

    ctx.fillStyle = accentHex;
    ctx.beginPath();
    ctx.roundRect(lx, ly, 28, lh, [18, 0, 0, 18]);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = '800 44px "JetBrains Mono", monospace';
    ctx.fillText(formula.slice(0, 12), lx + 44, ly + 82);

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 26px "Outfit", sans-serif';
    ctx.fillText(subtitle.slice(0, 22), lx + 44, ly + 132);

    ctx.fillStyle = accentHex;
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillText(specLine, lx + 44, ly + 178);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }

  /**
   * Genera la textura de las páginas abiertas del Libro de Experimentos Caseros en la mesa
   */
  function createOpenBookPagesTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d')!;

    // Papel crema cálido de libro ilustrado
    ctx.fillStyle = '#fefce8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sombra del pliegue central entre ambas páginas
    const spineGrad = ctx.createLinearGradient(470, 0, 554, 0);
    spineGrad.addColorStop(0, 'rgba(0,0,0,0)');
    spineGrad.addColorStop(0.5, 'rgba(30, 27, 75, 0.35)');
    spineGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spineGrad;
    ctx.fillRect(460, 0, 104, canvas.height);

    // Marco decorativo en ambas páginas
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 4;
    ctx.strokeRect(32, 32, 444, canvas.height - 64);
    ctx.strokeRect(548, 32, 444, canvas.height - 64);

    // PÁGINA IZQUIERDA: Título + Miniatura de Video
    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 22px "Outfit", sans-serif';
    ctx.fillText('GUÍA INTERACTIVA · EN CASA', 58, 82);

    ctx.fillStyle = '#0f172a';
    ctx.font = '800 38px "Outfit", sans-serif';
    ctx.fillText('Experimentos', 58, 132);
    ctx.fillText('Caseros + Video', 58, 174);

    // Recuadro de reproductor de video ilustrado en la página izquierda
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(58, 210, 392, 230, 16);
    ctx.fill();

    // Botón Play central en la ilustración del video
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(254, 325, 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(242, 304);
    ctx.lineTo(242, 346);
    ctx.lineTo(276, 325);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 22px "Outfit", sans-serif';
    ctx.fillText('1. Col Morada + Limón (pH)', 58, 495);
    ctx.fillText('2. Vinagre + Bicarbonato', 58, 535);
    ctx.fillText('3. Titulación HCl + NaOH', 58, 575);

    ctx.fillStyle = '#d97706';
    ctx.font = 'bold 24px "Outfit", sans-serif';
    ctx.fillText('👉 HAZ CLIC PARA ABRIR', 58, 655);

    // PÁGINA DERECHA: Diagrama de Escala de pH Casero y vasos
    ctx.fillStyle = '#4f46e5';
    ctx.font = 'bold 24px "Outfit", sans-serif';
    ctx.fillText('ESCALA DE COLOR NATURAL', 576, 85);

    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
    const labels = ['Limón (pH 2)', 'Vinagre (pH 3)', 'Agua (pH 7)', 'Bicarbonato (9)', 'Alcalino (12)'];
    colors.forEach((c, idx) => {
      const y = 130 + idx * 82;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.roundRect(576, y, 64, 54, 12);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 26px "Outfit", sans-serif';
      ctx.fillText(labels[idx], 660, y + 36);
    });

    // Botón impreso en la página derecha
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.roundRect(576, 565, 386, 95, 18);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 28px "Outfit", sans-serif';
    ctx.fillText('VER VIDEO Y PRACTICAR', 602, 622);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }

  /**
   * Construye el Libro 3D Interactivo de Experimentos Caseros en el costado derecho de la mesa
   */
  function buildInteractiveHomeBook(): THREE.Group {
    const group = new THREE.Group();
    // Ubicado al costado derecho de la mesa, inclinado hacia el estudiante
    group.position.set(1.52, 0.02, 0.34);
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
      color: 0xd97706,
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
      new THREE.MeshStandardMaterial({ color: 0xd97706 }), // bottom
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
      color: 0xf59e0b,
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
    const envGroup = new THREE.Group();

    // 1. Pared trasera de laboratorio con paneles científicos oscuros
    const wallGeo = new THREE.BoxGeometry(5.6, 3.2, 0.12);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0d1322,
      roughness: 0.5,
      metalness: 0.2
    });
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 1.4, -1.18);
    backWall.receiveShadow = true;
    envGroup.add(backWall);

    // Estante superior de laboratorio en la pared trasera
    const shelfGeo = new THREE.BoxGeometry(3.8, 0.06, 0.38);
    const shelfMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.6
    });
    const shelf = new THREE.Mesh(shelfGeo, shelfMat);
    shelf.position.set(0, 1.72, -0.95);
    shelf.castShadow = true;
    envGroup.add(shelf);

    // Tira de luz LED cálida/científica bajo el estante superior
    const ledStripGeo = new THREE.BoxGeometry(3.4, 0.015, 0.03);
    const ledStripMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const ledStrip = new THREE.Mesh(ledStripGeo, ledStripMat);
    ledStrip.position.set(0, 1.68, -0.82);
    envGroup.add(ledStrip);

    // Frascos ámbar de reserva en el estante superior (decoración de laboratorio)
    const amberMat = new THREE.MeshPhysicalMaterial({
      color: 0xb45309,
      transmission: 0.65,
      transparent: true,
      roughness: 0.15,
      ior: 1.5
    });
    [-1.2, -0.85, 0.9, 1.25].forEach((bx) => {
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.28, 24), amberMat);
      bottle.position.set(bx, 1.89, -0.95);
      envGroup.add(bottle);
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.06, 16),
        new THREE.MeshStandardMaterial({ color: 0x0f172a })
      );
      cap.position.set(bx, 2.05, -0.95);
      envGroup.add(cap);
    });

    // 2. Gradilla de Tubos de Ensayo con los 5 Colores Patrón de pH en la mesa (atrás a la derecha)
    const rackGroup = new THREE.Group();
    rackGroup.position.set(0.78, 0.0, -0.52);
    rackGroup.rotation.y = -0.18;

    const rackFrameMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.35,
      metalness: 0.7
    });

    const bottomBar = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.03, 0.18), rackFrameMat);
    bottomBar.position.y = 0.015;
    rackGroup.add(bottomBar);

    const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.025, 0.18), rackFrameMat);
    topBar.position.y = 0.26;
    rackGroup.add(topBar);

    [-0.31, 0.31].forEach((px) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.26, 12), rackFrameMat);
      pillar.position.set(px, 0.135, 0);
      rackGroup.add(pillar);
    });

    const refColors = [0xef4444, 0xf59e0b, 0x10b981, 0x3b82f6, 0x8b5cf6];
    refColors.forEach((colHex, idx) => {
      const tx = (idx - 2) * 0.12;
      // Tubo de cristal
      const tubeGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.38, 24);
      const tubeMesh = new THREE.Mesh(tubeGeo, glassMaterial);
      tubeMesh.position.set(tx, 0.22, 0);
      rackGroup.add(tubeMesh);

      // Muestra líquida coloreada según pH patrón
      const sampleGeo = new THREE.CylinderGeometry(0.027, 0.027, 0.24, 20);
      const sampleMat = new THREE.MeshBasicMaterial({
        color: colHex,
        transparent: true,
        opacity: 0.88
      });
      const sampleMesh = new THREE.Mesh(sampleGeo, sampleMat);
      sampleMesh.position.set(tx, 0.15, 0);
      rackGroup.add(sampleMesh);
    });

    envGroup.add(rackGroup);
    return envGroup;
  }

  function buildCentralBeakerStation(glassMaterial: THREE.MeshPhysicalMaterial): THREE.Group {
    const station = new THREE.Group();
    station.position.set(0, 0, 0);

    const plateBaseGeo = new THREE.CylinderGeometry(0.56, 0.62, 0.09, 48);
    const plateBaseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.6
    });
    const plateBase = new THREE.Mesh(plateBaseGeo, plateBaseMat);
    plateBase.position.y = 0.045;
    plateBase.castShadow = true;
    plateBase.receiveShadow = true;
    station.add(plateBase);

    const topCeramicGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.015, 48);
    const topCeramicMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.3
    });
    const topCeramic = new THREE.Mesh(topCeramicGeo, topCeramicMat);
    topCeramic.position.y = 0.095;
    station.add(topCeramic);

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

    const rimGeo = new THREE.TorusGeometry(0.41, 0.016, 16, 64);
    const rimMesh = new THREE.Mesh(rimGeo, glassMaterial);
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
    gradMesh.rotation.y = -Math.PI / 2;
    gradMesh.renderOrder = 4;
    station.add(gradMesh);

    const liquidGeo = new THREE.CylinderGeometry(0.38, 0.375, 0.8, 48);
    beakerLiquidMat = new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      transmission: 0.55,
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
    const coasterGeo = new THREE.CylinderGeometry(0.36, 0.38, 0.02, 36);
    const coasterMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8
    });
    const coaster = new THREE.Mesh(coasterGeo, coasterMat);
    coaster.position.set(xPos, 0.01, 0.15);
    coaster.receiveShadow = true;
    scene.add(coaster);

    const ringGeo = new THREE.RingGeometry(0.37, 0.42, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(xPos, 0.015, 0.15);
    scene.add(ringMesh);

    const group = new THREE.Group();
    const homePos = new THREE.Vector3(xPos, 0.02, 0.15);
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

    const liqGeo = new THREE.CylinderGeometry(0.17, 0.305, 0.34, 40);
    const liquidMat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      transmission: 0.5,
      transparent: true,
      opacity: 0.88,
      roughness: 0.15,
      ior: 1.33
    });
    const liquidMesh = new THREE.Mesh(liqGeo, liquidMat);
    liquidMesh.position.y = 0.03 + 0.17;
    liquidMesh.renderOrder = 2;
    group.add(liquidMesh);

    const labelGeo = new THREE.CylinderGeometry(0.195, 0.275, 0.22, 48, 1, true);
    const labelTex = createFlaskLabelTexture(formula, subtitle, accentCss);
    const labelMat = new THREE.MeshBasicMaterial({
      map: labelTex,
      transparent: true,
      depthWrite: false
    });
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.position.y = 0.28;
    labelMesh.rotation.y = -Math.PI / 2;
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
      colorHex
    };
  }

  function buildPhMeterInstrument(): THREE.Group {
    const meterGroup = new THREE.Group();

    const baseGeo = new THREE.BoxGeometry(0.36, 0.05, 0.36);
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.3,
      metalness: 0.8
    });
    const base = new THREE.Mesh(baseGeo, metalMat);
    base.position.set(-0.62, 0.025, -0.35);
    base.castShadow = true;
    meterGroup.add(base);

    const rodGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.35, 24);
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.15,
      metalness: 0.9
    });
    const rod = new THREE.Mesh(rodGeo, chromeMat);
    rod.position.set(-0.62, 0.7, -0.35);
    meterGroup.add(rod);

    const armGeo = new THREE.BoxGeometry(0.68, 0.03, 0.04);
    const arm = new THREE.Mesh(armGeo, metalMat);
    arm.position.set(-0.32, 1.24, -0.18);
    arm.rotation.y = -0.48;
    meterGroup.add(arm);

    const probeGeo = new THREE.CylinderGeometry(0.022, 0.018, 0.95, 24);
    const probeMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.2,
      metalness: 0.4
    });
    const probe = new THREE.Mesh(probeGeo, probeMat);
    probe.position.set(-0.14, 0.82, -0.06);
    meterGroup.add(probe);

    const tipGeo = new THREE.SphereGeometry(0.024, 16, 16);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.set(-0.14, 0.34, -0.06);
    meterGroup.add(tip);

    const screenBodyGeo = new THREE.BoxGeometry(0.58, 0.38, 0.06);
    const screenBody = new THREE.Mesh(screenBodyGeo, metalMat);
    screenBody.position.set(-0.66, 0.98, -0.32);
    screenBody.rotation.y = 0.32;
    meterGroup.add(screenBody);

    phScreenCanvas = document.createElement('canvas');
    phScreenCanvas.width = 512;
    phScreenCanvas.height = 256;
    phScreenCtx = phScreenCanvas.getContext('2d');
    phScreenTexture = new THREE.CanvasTexture(phScreenCanvas);

    const displayPlaneGeo = new THREE.PlaneGeometry(0.54, 0.34);
    const displayPlaneMat = new THREE.MeshBasicMaterial({ map: phScreenTexture });
    const displayPlane = new THREE.Mesh(displayPlaneGeo, displayPlaneMat);
    displayPlane.position.set(0, 0, 0.032);
    screenBody.add(displayPlane);

    drawPhMeterScreen(7.0, 25.0, 'Neutro / Equivalencia', '#10b981', 50);

    return meterGroup;
  }

  onMount(() => {
    const width = container.clientWidth;
    const height = container.clientHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080c14);
    scene.fog = new THREE.FogExp2(0x080c14, 0.075);

    camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    camera.position.set(0.12, 1.42, 2.55);

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute(
      'aria-label',
      'Laboratorio químico 3D interactivo con vaso de precipitado de 250 mL, pH-metro digital, matraces reactivos, gradilla colorimétrica y Libro de Experimentos Caseros en la mesa.'
    );
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    scene.environmentIntensity = 0.88;
    roomEnv.dispose();
    pmremGenerator.dispose();

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0.15, 0.48, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 1.5;
    controls.maxDistance = 3.8;
    controls.minPolarAngle = Math.PI * 0.2;
    controls.maxPolarAngle = Math.PI * 0.46;
    controls.minAzimuthAngle = -Math.PI * 0.35;
    controls.maxAzimuthAngle = Math.PI * 0.35;
    controls.enablePan = false;
    controls.update();

    // Iluminación
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.3);
    keyLight.position.set(2.5, 4.5, 3.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.SpotLight(0x38bdf8, 8, 10, Math.PI / 3, 0.5);
    rimLight.position.set(-2.5, 3.0, -2.0);
    scene.add(rimLight);

    // Luz cálida focalizada sobre el Libro de Experimentos Caseros a la derecha
    const bookSpotLight = new THREE.SpotLight(0xfbbf24, 5.5, 5, Math.PI / 4, 0.6);
    bookSpotLight.position.set(1.6, 1.8, 1.1);
    bookSpotLight.target.position.set(1.52, 0, 0.34);
    scene.add(bookSpotLight);
    scene.add(bookSpotLight.target);

    underGlowLight = new THREE.PointLight(0x10b981, 3.5, 1.8);
    underGlowLight.position.set(0, 0.25, 0);
    scene.add(underGlowLight);

    // Mesa de Laboratorio + Mueble inferior
    const benchGeo = new THREE.BoxGeometry(5.2, 0.14, 2.4);
    const benchMat = new THREE.MeshStandardMaterial({
      color: 0x131b2e,
      roughness: 0.26,
      metalness: 0.18
    });
    const bench = new THREE.Mesh(benchGeo, benchMat);
    bench.position.set(0, -0.07, 0);
    bench.receiveShadow = true;
    scene.add(bench);

    const railGeo = new THREE.BoxGeometry(5.22, 0.04, 0.04);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.25,
      metalness: 0.85
    });
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(0, -0.01, 1.2);
    scene.add(rail);

    const grid = new THREE.GridHelper(5.0, 25, 0x1e293b, 0x1e293b);
    grid.position.y = 0.002;
    scene.add(grid);

    const borosilicateGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.92,
      opacity: 1,
      transparent: true,
      roughness: 0.06,
      ior: 1.47,
      thickness: 0.08,
      reflectivity: 0.9,
      side: THREE.DoubleSide
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
      'HCl 0.01 M',
      'Ácido Clorhídrico',
      0xef4444,
      '#ef4444',
      -0.96,
      borosilicateGlassMat
    );
    const naohRig = buildErlenmeyerFlask(
      'naoh',
      'NaOH 0.01 M',
      'Hidróxido de Sodio',
      0x8b5cf6,
      '#8b5cf6',
      0.78,
      borosilicateGlassMat
    );
    flasks = { hcl: hclRig, naoh: naohRig };

    // Libro 3D de Experimentos Caseros en el costado derecho de la mesa
    bookGroup = buildInteractiveHomeBook();
    scene.add(bookGroup);

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
      if (e.button !== 0) return;
      const hit = checkInteractiveHit(e);
      if (!hit) return;

      if (hit.type === 'book') {
        labStore.isHomeBookOpen = true;
        return;
      }

      if (hit.type === 'flask') {
        labStore.selectReagent(hit.id);
        draggedFlaskId = hit.id;
        controls.enabled = false;
        renderer!.domElement.setPointerCapture(e.pointerId);
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (draggedFlaskId) {
        updatePointer(e);
        raycaster.setFromCamera(pointer, camera);
        if (raycaster.ray.intersectPlane(dragPlane, intersectPt)) {
          const rig = flasks[draggedFlaskId];
          const clampedX = THREE.MathUtils.clamp(intersectPt.x, -1.4, 1.25);
          const clampedZ = THREE.MathUtils.clamp(intersectPt.z, -0.4, 0.6);

          const distToBeaker = Math.hypot(clampedX, clampedZ);
          if (distToBeaker < 0.68) {
            isOverPourZone = true;
            const side = rig.id === 'hcl' ? -1 : 1;
            rig.targetPos.set(side * 0.48, 1.05, 0);
            rig.targetRotZ = side * -1.08;
          } else {
            isOverPourZone = false;
            rig.targetPos.set(clampedX, 0.22, clampedZ);
            rig.targetRotZ = 0;
          }
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
      if (draggedFlaskId) {
        const rig = flasks[draggedFlaskId];
        rig.targetPos.copy(rig.homePos);
        rig.targetRotZ = 0;
        isOverPourZone = false;
        draggedFlaskId = null;
        controls.enabled = true;
        if (renderer?.domElement.hasPointerCapture(e.pointerId)) {
          renderer.domElement.releasePointerCapture(e.pointerId);
        }
      }
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    timer = new Timer();

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let isReducedMotion = mediaQuery.matches;
    const onMotionChange = (ev: MediaQueryListEvent) => (isReducedMotion = ev.matches);
    mediaQuery.addEventListener('change', onMotionChange);

    function animate(timestamp?: number) {
      timer.update(timestamp);
      const dt = Math.min(timer.getDelta(), 0.1);
      const elapsed = timer.getElapsed();

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

      // Animación de realce cuando el usuario apunta al Libro de Experimentos Caseros en la mesa
      if (bookGroup && bookGlowRing) {
        const targetBookY = isBookHovered ? 0.065 : 0.02;
        bookGroup.position.y = THREE.MathUtils.lerp(bookGroup.position.y, targetBookY, dt * 10);
        const pulseScale = isBookHovered ? 1.12 : 1.0 + Math.sin(elapsed * 3) * 0.04;
        bookGlowRing.scale.setScalar(pulseScale);
        (bookGlowRing.material as THREE.MeshBasicMaterial).opacity = isBookHovered ? 0.95 : 0.45;
      }

      let isCurrentlyPouringStream = false;
      let activeStreamColor = 0xef4444;
      let streamX = 0;

      if (draggedFlaskId && isOverPourZone) {
        const rig = flasks[draggedFlaskId];
        const reagentObj = labStore.reagents.find((r) => r.reagentId === draggedFlaskId);
        if (reagentObj && reagentObj.remainingMl > 0 && labStore.availableCapacityMl > 0) {
          isCurrentlyPouringStream = true;
          activeStreamColor = rig.colorHex;
          streamX = rig.id === 'hcl' ? -0.18 : 0.18;

          pourHoldTimer += dt;
          if (pourHoldTimer >= 0.25) {
            pourHoldTimer = 0;
            labStore.pour(draggedFlaskId, 2.5, 'mouse');
          }
        }
      } else {
        pourHoldTimer = 0;
      }

      if (animState && animState.active) {
        animState.elapsed += dt;
        const p = animState.elapsed / animState.duration;
        const rig = flasks[animState.flaskId];
        const side = rig.id === 'hcl' ? -1 : 1;

        if (p < 0.28) {
          rig.targetPos.set(side * 0.48, 1.06, 0);
          rig.targetRotZ = side * -1.08;
        } else if (p < 0.78) {
          rig.targetPos.set(side * 0.48, 1.06, 0);
          rig.targetRotZ = side * -1.12;
          isCurrentlyPouringStream = true;
          activeStreamColor = rig.colorHex;
          streamX = side * 0.16;
        } else if (p < 1.0) {
          rig.targetPos.copy(rig.homePos);
          rig.targetRotZ = 0;
        } else {
          rig.targetPos.copy(rig.homePos);
          rig.targetRotZ = 0;
          animState = null;
        }
      }

      (['hcl', 'naoh'] as const).forEach((id) => {
        const rig = flasks[id];
        const reagentData = labStore.reagents.find((r) => r.reagentId === id);
        const remRatio = reagentData ? Math.max(0.02, reagentData.remainingMl / reagentData.initialMl) : 1;

        rig.liquidMesh.scale.set(1, remRatio, 1);
        rig.liquidMesh.position.y = 0.03 + 0.17 * remRatio;
        rig.liquidMesh.visible = (reagentData?.remainingMl ?? 0) > 0.5;

        const isSel = selectedId === id || hoveredFlaskId === id || draggedFlaskId === id;
        rig.ringMat.opacity = isSel ? 0.9 : 0.25;
        rig.ringMesh.scale.setScalar(isSel ? 1.08 : 1.0);

        rig.group.position.lerp(rig.targetPos, dt * 10);
        rig.group.rotation.z = THREE.MathUtils.lerp(rig.group.rotation.z, rig.targetRotZ, dt * 10);
      });

      if (isCurrentlyPouringStream) {
        pourStreamMesh.visible = true;
        pourStreamMat.color.setHex(activeStreamColor);
        pourStreamMesh.position.set(streamX, 0.66, 0);

        splashParticles.visible = true;
        const posAttr = splashGeo.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < posAttr.count; i++) {
          let py = posAttr.getY(i) + dt * 0.75;
          if (py > 0.75 * currentFillRatio) py = 0.05;
          posAttr.setY(i, py);
        }
        posAttr.needsUpdate = true;
      } else {
        pourStreamMesh.visible = false;
        splashParticles.visible = false;
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
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      mediaQuery.removeEventListener('change', onMotionChange);
      renderer?.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer?.domElement.removeEventListener('pointermove', onPointerMove);
      renderer?.domElement.removeEventListener('pointerup', onPointerUp);
      resizeObserver.disconnect();
    };
  });

  onDestroy(() => {
    timer?.dispose();
    controls?.dispose();
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

  <!-- Notificación flotante cuando el usuario apunta al Libro 3D en la mesa -->
  {#if isBookHovered}
    <div class="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-amber-500 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl shadow-xl flex items-center gap-2">
      <span>📖 Haz clic en el Libro de la mesa para ver los Videos de Experimentos Caseros y practicarlos aquí</span>
    </div>
  {/if}

  <!-- Guía inferior con estado del experimento activo -->
  <div class="absolute bottom-5 left-6 z-10 pointer-events-none flex items-center gap-2.5 bg-slate-950/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800/80 text-[11px] font-medium text-slate-300 shadow-lg">
    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
    <span>
      <strong class="text-white">{labStore.activePreset.title}:</strong> Arrastra los matraces al vaso o haz clic en el <strong class="text-amber-400">Libro de Experimentos Caseros</strong> a la derecha de la mesa.
    </span>
  </div>
</div>
