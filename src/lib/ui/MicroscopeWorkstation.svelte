<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    labStore,
    MICROSCOPE_OBJECTIVES,
    MICROSCOPE_PARTS,
    MICROSCOPE_SPECIMENS,
    type MicroscopeObjectivePower,
    type MicroscopeOpticalMode
  } from '$lib/interaction/lab_store.svelte';
  import { explorationStore } from '$lib/exploration/exploration_store.svelte';
  import {
    X,
    Sparkles,
    Eye,
    Sliders,
    Layers,
    Sun,
    Power,
    Crosshair,
    Droplets,
    AlertTriangle,
    CheckCircle2
  } from '@lucide/svelte';

  let ocularCanvas = $state<HTMLCanvasElement | null>(null);
  let activeRightTab = $state<'controls' | 'parts'>('controls');
  let animFrameId: number | null = null;
  let lastOcularRenderMs = 0;
  let isDraggingSlide = $state(false);
  let isDraggingFineKnob = $state(false);
  let ocularDragMode = $state<'focus_y' | 'stage_xy'>('focus_y');
  let lastPointer = { x: 0, y: 0 };
  let lastHoverOcularY: number | null = null;
  let lastKnobDragY = 0;
  const quantizedBlurPx = $derived(Math.round(labStore.microscopeBlurPx * 2) / 2);

  // Tamaño real (px CSS) del lente central para escalar el desenfoque óptico de forma proporcional
  let lensPx = $state(560);
  const lensBlurScale = $derived(Math.max(1, lensPx / 236));

  // Animación estilo "inventario": el lente emerge desde el centro de la pantalla durante el
  // último tramo del acercamiento de cámara (y se recoge al alejarse).
  const LENS_APPEAR_START = 0.55;
  const inventoryAppear = $derived.by(() => {
    if (labStore.microscopeTransitionPhase === 'OCULAR_LOCKED') return 1;
    const p = labStore.microscopeTransitionProgress;
    const u = Math.min(1, Math.max(0, (p - LENS_APPEAR_START) / (1 - LENS_APPEAR_START)));
    return u * u * (3 - 2 * u);
  });
  // Rebote sutil de "pop" al abrir (overshoot tipo easeOutBack) solo en la escala del lente
  const lensScale = $derived.by(() => {
    const u = inventoryAppear;
    const c1 = 1.2;
    const c3 = c1 + 1;
    const back = 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
    return 0.18 + 0.82 * back;
  });
  const panelsAppear = $derived(Math.min(1, Math.max(0, (inventoryAppear - 0.35) / 0.65)));

  const objectivePowers: MicroscopeObjectivePower[] = [4, 10, 40, 100];

  const opticalModes: { id: MicroscopeOpticalMode; label: string }[] = [
    { id: 'brightfield', label: 'Campo Claro' },
    { id: 'darkfield', label: 'Campo Oscuro' },
    { id: 'phase', label: 'Contraste Fase' },
    { id: 'polarized', label: 'Polarizada' }
  ];

  // Escala del micrómetro ocular según objetivo activo (µm por cada 10 divisiones)
  const scaleBarUm = $derived(
    labStore.microscopeObjective === 4
      ? 500
      : labStore.microscopeObjective === 10
        ? 200
        : labStore.microscopeObjective === 40
          ? 50
          : 20
  );

  // Estado químico actual del vaso para la muestra en vivo
  const livePh = $derived(
    labStore.isExplorationMode
      ? (explorationStore.result.pH ?? 7.0)
      : (labStore.beaker.currentResult?.pH ?? 7.0)
  );
  const liveColor = $derived(
    labStore.isExplorationMode
      ? explorationStore.result.color
      : (labStore.beaker.currentResult?.indicatorBand.colorHex ?? '#10b981')
  );
  const liveTempC = $derived(
    (labStore.isExplorationMode ? explorationStore.result.temperatureC : labStore.beaker.temperatureC) ?? 25
  );

  function onOcularPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    isDraggingSlide = true;
    lastPointer = { x: e.clientX, y: e.clientY };
    lastHoverOcularY = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onOcularPointerMove(e: PointerEvent) {
    if (!isDraggingSlide) {
      // Fase 3: En modo Simulación (INSPECTING_MICROSCOPE), el movimiento del mouse (eje Y) controla la variable de enfoque analítica
      if (
        ocularDragMode === 'focus_y' &&
        labStore.microscopeFsmState === 'INSPECTING_MICROSCOPE' &&
        labStore.microscopeTransitionPhase === 'OCULAR_LOCKED'
      ) {
        if (lastHoverOcularY !== null) {
          const dy = e.clientY - lastHoverOcularY;
          if (Math.abs(dy) > 0.4 && Math.abs(dy) < 80) {
            labStore.applyAnalyticalFocusAxisY(-dy / 260);
          }
        }
        lastHoverOcularY = e.clientY;
      }
      return;
    }
    const dx = e.clientX - lastPointer.x;
    const dy = e.clientY - lastPointer.y;
    lastPointer = { x: e.clientX, y: e.clientY };
    lastHoverOcularY = e.clientY;
    if (ocularDragMode === 'focus_y' && !e.shiftKey) {
      // Modo Simulación Científica (INSPECTING_MICROSCOPE): el eje Y del input controla el enfoque analítico (nitidez)
      const normDeltaY = -dy / 180;
      labStore.applyAnalyticalFocusAxisY(normDeltaY);
      if (Math.abs(dx) > 1.5) {
        const sensitivity = 90 / labStore.microscopeObjective;
        labStore.moveMicroscopeStage(-dx * sensitivity, 0);
      }
    } else {
      // Desplazamiento X-Y de la platina mecánica (inversión óptica compuesta)
      const sensitivity = 120 / labStore.microscopeObjective;
      labStore.moveMicroscopeStage(-dx * sensitivity, -dy * sensitivity);
    }
  }

  function onOcularPointerLeave() {
    lastHoverOcularY = null;
  }

  function onFineKnobPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    isDraggingFineKnob = true;
    lastKnobDragY = e.clientY;
    labStore.selectMicroscopePart('fine_knob');
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onFineKnobPointerMove(e: PointerEvent) {
    if (!isDraggingFineKnob) return;
    const dy = lastKnobDragY - e.clientY;
    lastKnobDragY = e.clientY;
    if (Math.abs(dy) > 0.3) {
      labStore.adjustFineFocus(Math.round(dy * 0.8));
    }
  }

  function onFineKnobPointerUp(e: PointerEvent) {
    if (!isDraggingFineKnob) return;
    isDraggingFineKnob = false;
    const el = e.currentTarget as HTMLElement;
    if (el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
  }

  function onOcularWheel(e: WheelEvent) {
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : -1;
    labStore.adjustMicroscopeFocusWheel(dir);
  }

  function onOcularPointerUp(e: PointerEvent) {
    if (!isDraggingSlide) return;
    isDraggingSlide = false;
    const el = e.currentTarget as HTMLElement;
    if (el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
  }

  function renderOcularField(timeMs: number) {
    if (
      !ocularCanvas ||
      (!labStore.isMicroscopeActive && labStore.microscopeFsmState === 'EXPLORING')
    ) {
      animFrameId = null;
      return;
    }
    // Limitar redibujado del canvas 2D del ocular a ~24 FPS (40ms) para eliminar latencia de CPU/compositor
    if (timeMs - lastOcularRenderMs < 40) {
      animFrameId = requestAnimationFrame(renderOcularField);
      return;
    }
    lastOcularRenderMs = timeMs;
    const ctx = ocularCanvas.getContext('2d');
    if (!ctx) return;

    const w = ocularCanvas.width;
    const h = ocularCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = w * 0.47;
    const t = timeMs * 0.001;

    ctx.clearRect(0, 0, w, h);

    // Si el iluminador Köhler está apagado, el campo ocular permanece oscuro
    if (!labStore.microscopeLampOn || labStore.microscopeLampIntensity <= 0.02) {
      ctx.fillStyle = '#050608';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      drawOcularReticleAndVignette(ctx, cx, cy, radius, false);
      if (labStore.isMicroscopeActive) {
        animFrameId = requestAnimationFrame(renderOcularField);
      } else {
        animFrameId = null;
      }
      return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // 1. Fondo óptico según el modo de iluminación (Campo Claro, Oscuro, Fase, Polarizada)
    const mode = labStore.microscopeOpticalMode;
    const brightness = labStore.microscopeLampIntensity;
    const diaph = labStore.microscopeDiaphragm;
    // Contraste ganado al cerrar moderadamente el diafragma iris de Abbe
    const contrastFactor = 0.65 + (1 - Math.abs(diaph - 0.72)) * 0.55;

    if (mode === 'brightfield') {
      const l = Math.round(245 * brightness * (0.78 + diaph * 0.22));
      const bgGrad = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
      bgGrad.addColorStop(0, `rgb(${l}, ${Math.max(0, l - 2)}, ${Math.max(0, l - 8)})`);
      bgGrad.addColorStop(1, `rgb(${Math.max(0, l - 28)}, ${Math.max(0, l - 30)}, ${Math.max(0, l - 36)})`);
      ctx.fillStyle = bgGrad;
    } else if (mode === 'darkfield') {
      ctx.fillStyle = '#07090e';
    } else if (mode === 'phase') {
      const l = Math.round(165 * brightness);
      ctx.fillStyle = `rgb(${Math.max(0, l - 12)}, ${l}, ${Math.min(255, l + 8)})`;
    } else {
      // Luz polarizada (Nicoles cruzados)
      ctx.fillStyle = '#0c0a18';
    }
    ctx.fillRect(0, 0, w, h);

    // 2. Transformación de aumento (4x, 10x, 40x, 100x) e inversión óptica de la platina X-Y
    const zoomScale =
      labStore.microscopeObjective === 4
        ? 0.55
        : labStore.microscopeObjective === 10
          ? 1.15
          : labStore.microscopeObjective === 40
            ? 2.85
            : 5.4;

    ctx.save();
    ctx.translate(cx, cy);
    // Escala base: los preparados están dibujados para un lienzo de referencia de 320 px
    const baseScale = w / 320;
    ctx.scale(zoomScale * baseScale, zoomScale * baseScale);
    // Inversión óptica real: al mover platina +X, la imagen se desplaza en sentido opuesto
    ctx.translate(-labStore.microscopeStageXUm * 0.08, -labStore.microscopeStageYUm * 0.08);

    const specId = labStore.microscopeSpecimenId;

    if (specId === 'onion_lugol') {
      drawOnionEpidermis(ctx, mode, contrastFactor, t);
    } else if (specId === 'elodea_chloroplasts') {
      drawElodeaChloroplasts(ctx, mode, contrastFactor, t);
    } else if (specId === 'blood_smear') {
      drawHumanBloodSmear(ctx, mode, contrastFactor, t);
    } else if (specId === 'tea_microplastics') {
      drawTeaMicroplastics(ctx, mode, contrastFactor, t);
    } else if (specId === 'clay_nacl_crystals') {
      drawClayAndNaClCrystals(ctx, mode, contrastFactor, t);
    } else {
      drawLiveReactorSample(ctx, mode, contrastFactor, t);
    }

    ctx.restore();

    // 3. Efecto de aberración cromática/esférica cuando se usa 100x OIL sin aceite de inmersión
    if (labStore.microscopeObjective === 100 && !labStore.microscopeImmersionOilApplied) {
      const oilWarnGrad = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
      oilWarnGrad.addColorStop(0, 'rgba(56, 189, 248, 0.08)');
      oilWarnGrad.addColorStop(0.7, 'rgba(244, 63, 94, 0.16)');
      oilWarnGrad.addColorStop(1, 'rgba(15, 23, 42, 0.55)');
      ctx.fillStyle = oilWarnGrad;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();

    // 4. Retícula micrométrica ocular calibrada y bisel óptico
    drawOcularReticleAndVignette(
      ctx,
      cx,
      cy,
      radius,
      mode === 'darkfield' || mode === 'polarized'
    );

    if (labStore.isMicroscopeActive) {
      animFrameId = requestAnimationFrame(renderOcularField);
    } else {
      animFrameId = null;
    }
  }

  function drawOnionEpidermis(
    ctx: CanvasRenderingContext2D,
    mode: MicroscopeOpticalMode,
    contrast: number,
    t: number
  ) {
    const cellW = 74;
    const cellH = 34;
    for (let row = -6; row <= 6; row++) {
      for (let col = -4; col <= 4; col++) {
        const offsetX = (row % 2) * (cellW * 0.5);
        const x = col * cellW + offsetX;
        const y = row * cellH;

        // Citoplasma y vacuola teñidos con Lugol
        ctx.fillStyle =
          mode === 'darkfield'
            ? 'rgba(251, 191, 36, 0.14)'
            : mode === 'polarized'
              ? 'rgba(168, 85, 247, 0.18)'
              : mode === 'phase'
                ? 'rgba(148, 163, 184, 0.25)'
                : `rgba(245, 158, 11, ${0.18 * contrast})`;
        ctx.strokeStyle =
          mode === 'darkfield'
            ? 'rgba(253, 224, 71, 0.85)'
            : mode === 'polarized'
              ? 'rgba(56, 189, 248, 0.9)'
              : `rgba(120, 53, 15, ${0.75 * contrast})`;
        ctx.lineWidth = 2.2;

        ctx.beginPath();
        ctx.roundRect(x - cellW / 2 + 2, y - cellH / 2 + 2, cellW - 4, cellH - 4, 6);
        ctx.fill();
        ctx.stroke();

        // Doble contorno de pared celular celulósica
        ctx.strokeStyle =
          mode === 'darkfield' ? 'rgba(255,255,255,0.4)' : 'rgba(180, 83, 9, 0.35)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(x - cellW / 2 + 4, y - cellH / 2 + 4, cellW - 8, cellH - 8);

        // Núcleo teñido intensamente por triyoduro (I3-) y nucléolos
        const nx = x + Math.sin(row * 1.7 + col) * 14;
        const ny = y + Math.cos(col * 1.3 + row) * 5;
        ctx.fillStyle =
          mode === 'darkfield'
            ? '#fde047'
            : mode === 'polarized'
              ? '#f472b6'
              : `rgba(146, 64, 14, ${0.88 * contrast})`;
        ctx.beginPath();
        ctx.arc(nx, ny, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Nucléolos refringentes visibles a 40x y 100x
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.arc(nx - 1.6, ny - 1.2, 1.3, 0, Math.PI * 2);
        ctx.arc(nx + 1.8, ny + 1.1, 1.1, 0, Math.PI * 2);
        ctx.fill();

        // Amiloplastos / gránulos citoplasmáticos con leve agitación térmica
        for (let g = 0; g < 4; g++) {
          const gx = x + Math.cos(t * 0.6 + g * 2 + row) * 22;
          const gy = y + Math.sin(t * 0.6 + g * 3 + col) * 9;
          ctx.fillStyle = 'rgba(120, 53, 15, 0.45)';
          ctx.beginPath();
          ctx.arc(gx, gy, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawElodeaChloroplasts(
    ctx: CanvasRenderingContext2D,
    mode: MicroscopeOpticalMode,
    contrast: number,
    t: number
  ) {
    const cellW = 68;
    const cellH = 38;
    for (let row = -5; row <= 5; row++) {
      for (let col = -4; col <= 4; col++) {
        const x = col * cellW + (row % 2) * 20;
        const y = row * cellH;

        ctx.fillStyle =
          mode === 'darkfield'
            ? 'rgba(16, 185, 129, 0.12)'
            : `rgba(187, 247, 208, ${0.24 * contrast})`;
        ctx.strokeStyle =
          mode === 'darkfield'
            ? 'rgba(110, 231, 183, 0.85)'
            : `rgba(21, 128, 61, ${0.8 * contrast})`;
        ctx.lineWidth = 2.4;
        ctx.strokeRect(x - cellW / 2 + 1.5, y - cellH / 2 + 1.5, cellW - 3, cellH - 3);
        ctx.fillRect(x - cellW / 2 + 1.5, y - cellH / 2 + 1.5, cellW - 3, cellH - 3);

        // Ciclosis en vivo: cloroplastos girando alrededor de la vacuola central
        const chloroplastCount = 10;
        for (let c = 0; c < chloroplastCount; c++) {
          const angle = t * 0.55 + (c / chloroplastCount) * Math.PI * 2 + row * 0.5;
          const rx = x + Math.cos(angle) * (cellW * 0.36);
          const ry = y + Math.sin(angle) * (cellH * 0.34);

          ctx.fillStyle =
            mode === 'darkfield'
              ? '#4ade80'
              : mode === 'polarized'
                ? '#2dd4bf'
                : `rgba(22, 163, 74, ${0.9 * contrast})`;
          ctx.beginPath();
          ctx.ellipse(rx, ry, 3.6, 2.2, angle + Math.PI / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawHumanBloodSmear(
    ctx: CanvasRenderingContext2D,
    mode: MicroscopeOpticalMode,
    contrast: number,
    t: number
  ) {
    // 1. Eritrocitos bicóncavos (7.5 µm) distribuidos en monocapa
    for (let i = 0; i < 95; i++) {
      const seed1 = Math.sin(i * 12.9898) * 43758.5453;
      const seed2 = Math.cos(i * 78.233) * 29432.1234;
      const rx = ((seed1 - Math.floor(seed1)) - 0.5) * 340 + Math.sin(t * 0.2 + i) * 0.4;
      const ry = ((seed2 - Math.floor(seed2)) - 0.5) * 340 + Math.cos(t * 0.2 + i) * 0.4;

      // Disco externo de hemoglobina eosinófila
      ctx.fillStyle =
        mode === 'darkfield'
          ? 'rgba(251, 113, 133, 0.85)'
          : `rgba(225, 29, 72, ${0.72 * contrast})`;
      ctx.beginPath();
      ctx.arc(rx, ry, 7.2, 0, Math.PI * 2);
      ctx.fill();

      // Palidez central bicóncava característica del eritrocito
      ctx.fillStyle =
        mode === 'darkfield'
          ? '#0f172a'
          : mode === 'phase'
            ? '#cbd5e1'
            : 'rgba(254, 226, 226, 0.78)';
      ctx.beginPath();
      ctx.arc(rx, ry, 3.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Leucocitos (Neutrófilos polimorfonucleares y Linfocitos teñidos con Giemsa)
    const wbcCoords = [
      { x: -38, y: -22, type: 'neutrophil' },
      { x: 46, y: 32, type: 'lymphocyte' },
      { x: 12, y: -58, type: 'neutrophil' },
      { x: -64, y: 48, type: 'monocyte' }
    ];
    wbcCoords.forEach((wbc) => {
      // Citoplasma leucocitario
      ctx.fillStyle = 'rgba(199, 210, 254, 0.82)';
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(wbc.x, wbc.y, 11.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Lóbulos nucleares basófilos púrpura oscuro (azur de metileno)
      ctx.fillStyle = '#4c1d95';
      if (wbc.type === 'neutrophil') {
        [-3.8, 0, 3.8].forEach((lx, idx) => {
          ctx.beginPath();
          ctx.arc(wbc.x + lx, wbc.y + (idx === 1 ? -3.2 : 2.2), 3.6, 0, Math.PI * 2);
          ctx.fill();
        });
      } else {
        ctx.beginPath();
        ctx.arc(wbc.x, wbc.y, 7.8, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 3. Plaquetas (trombocitos de 2 µm)
    for (let p = 0; p < 24; p++) {
      const px = Math.sin(p * 4.1) * 120;
      const py = Math.cos(p * 5.7) * 120;
      ctx.fillStyle = '#7e22ce';
      ctx.beginPath();
      ctx.arc(px, py, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawTeaMicroplastics(
    ctx: CanvasRenderingContext2D,
    mode: MicroscopeOpticalMode,
    contrast: number,
    t: number
  ) {
    // 1. Complejos octaédricos oscuros de Fe(III)-Ácido Gálico (Tanato férrico, Caso 3 PDF)
    for (let i = 0; i < 42; i++) {
      const x = Math.sin(i * 7.3) * 135;
      const y = Math.cos(i * 11.1) * 135;
      const r = 3 + (i % 5) * 2.2;
      ctx.fillStyle =
        mode === 'darkfield'
          ? 'rgba(167, 139, 250, 0.8)'
          : `rgba(30, 27, 75, ${0.82 * contrast})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Microfibras poliméricas birrefringentes (Nailon / PET desprendidas de bolsitas piramidales a 95°C)
    for (let f = 0; f < 14; f++) {
      const startX = Math.sin(f * 3.7) * 110;
      const startY = Math.cos(f * 2.9) * 110;
      ctx.strokeStyle =
        mode === 'polarized'
          ? f % 2 === 0
            ? '#38bdf8'
            : '#f472b6'
          : mode === 'darkfield'
            ? '#e0f2fe'
            : 'rgba(14, 165, 233, 0.78)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(
        startX + 35 * Math.cos(f + t * 0.15),
        startY + 35 * Math.sin(f),
        startX + 68 * Math.sin(f * 1.4),
        startY - 48 * Math.cos(f * 1.2)
      );
      ctx.stroke();
    }
  }

  function drawClayAndNaClCrystals(
    ctx: CanvasRenderingContext2D,
    mode: MicroscopeOpticalMode,
    contrast: number,
    t: number
  ) {
    // 1. Matriz laminar microporosa de cerámica de botijo (Ilita/Caolinita, Caso 5 PDF)
    for (let p = 0; p < 36; p++) {
      const px = Math.sin(p * 5.2) * 140;
      const py = Math.cos(p * 8.4) * 140;
      ctx.fillStyle =
        mode === 'polarized'
          ? 'rgba(251, 146, 60, 0.45)'
          : `rgba(194, 65, 12, ${0.38 * contrast})`;
      ctx.beginPath();
      ctx.ellipse(px, py, 12 + (p % 4) * 4, 7 + (p % 3) * 3, p * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Cristales cúbicos perfectos de Halita (NaCl) con crecimiento en tolva (Caso 4 PDF)
    const cubes = [
      { x: -45, y: -30, size: 32, rot: 0.18 },
      { x: 38, y: 24, size: 40, rot: -0.24 },
      { x: -12, y: 52, size: 26, rot: 0.42 },
      { x: 54, y: -44, size: 28, rot: 0.08 },
      { x: 0, y: -4, size: 46, rot: 0.12 + Math.sin(t * 0.2) * 0.01 }
    ];
    cubes.forEach((c, idx) => {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);

      ctx.fillStyle =
        mode === 'polarized'
          ? idx % 2 === 0
            ? 'rgba(56, 189, 248, 0.55)'
            : 'rgba(168, 85, 247, 0.55)'
          : mode === 'darkfield'
            ? 'rgba(224, 242, 254, 0.35)'
            : 'rgba(241, 245, 249, 0.72)';
      ctx.strokeStyle =
        mode === 'polarized' || mode === 'darkfield'
          ? '#38bdf8'
          : `rgba(15, 23, 42, ${0.78 * contrast})`;
      ctx.lineWidth = 2.2;
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size);
      ctx.strokeRect(-c.size / 2, -c.size / 2, c.size, c.size);

      // Escalones concéntricos de crecimiento cristalino cúbico (hábito en tolva)
      ctx.lineWidth = 1.1;
      ctx.strokeRect(-c.size * 0.32, -c.size * 0.32, c.size * 0.64, c.size * 0.64);
      ctx.strokeRect(-c.size * 0.15, -c.size * 0.15, c.size * 0.3, c.size * 0.3);
      ctx.restore();
    });
  }

  function drawLiveReactorSample(
    ctx: CanvasRenderingContext2D,
    mode: MicroscopeOpticalMode,
    contrast: number,
    t: number
  ) {
    // Velocidad de agitación térmica browniana según la temperatura real del vaso (15 °C a 65 °C)
    const thermalSpeed = 0.35 + (liveTempC / 25) * 0.85;
    const steamEff = labStore.activeSteamEffect;

    // 1. Vesículas de indicador / antocianina teñidas con el color exacto del pH actual del vaso
    for (let i = 0; i < 38; i++) {
      const baseX = Math.sin(i * 9.2) * 125;
      const baseY = Math.cos(i * 6.7) * 125;
      const bx = baseX + Math.sin(t * thermalSpeed + i) * 5;
      const by = baseY + Math.cos(t * thermalSpeed * 1.1 + i * 2) * 5;
      const r = 6 + (i % 4) * 3.2;

      ctx.fillStyle = liveColor;
      ctx.globalAlpha = mode === 'darkfield' ? 0.85 : 0.58 * contrast;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();

      // Membrana / doble película (especialmente pronunciada en experimento de Antiburbujas)
      ctx.globalAlpha = 0.92;
      ctx.strokeStyle =
        steamEff === 'antibubbles'
          ? '#e0f2fe'
          : mode === 'darkfield'
            ? '#ffffff'
            : liveColor;
      ctx.lineWidth = steamEff === 'antibubbles' ? 2.6 : 1.4;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 2. Microcristales de sal NaCl proporcionales al volumen de ácido + base neutralizados
    const saltAmount = Math.min(
      24,
      Math.floor((labStore.beaker.acidVolumeMl + labStore.beaker.baseVolumeMl) * 0.8) + 4
    );
    for (let s = 0; s < saltAmount; s++) {
      const sx = Math.cos(s * 4.8) * 95;
      const sy = Math.sin(s * 7.1) * 95;
      const sz = 7 + (s % 3) * 4;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(s * 0.4 + t * 0.15);
      ctx.strokeStyle = mode === 'darkfield' || mode === 'polarized' ? '#38bdf8' : '#334155';
      ctx.fillStyle = 'rgba(226, 232, 240, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
      ctx.strokeRect(-sz / 2, -sz / 2, sz, sz);
      ctx.restore();
    }
  }

  function drawOcularReticleAndVignette(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    lightReticle: boolean
  ) {
    // Retícula micrométrica ocular calibrada (0 a 100 unidades)
    ctx.save();
    ctx.strokeStyle = lightReticle ? 'rgba(226, 232, 240, 0.42)' : 'rgba(15, 23, 42, 0.42)';
    ctx.fillStyle = lightReticle ? 'rgba(226, 232, 240, 0.65)' : 'rgba(15, 23, 42, 0.65)';
    ctx.lineWidth = Math.max(1, radius / 150);

    // Línea horizontal central del micrómetro ocular
    const reticleHalf = radius * 0.55;
    ctx.beginPath();
    ctx.moveTo(cx - reticleHalf, cy);
    ctx.lineTo(cx + reticleHalf, cy);
    ctx.stroke();

    for (let tick = -10; tick <= 10; tick++) {
      const tx = cx + (tick / 10) * reticleHalf;
      const tickH = (tick % 5 === 0 ? 8 : 4) * (radius / 150);
      ctx.beginPath();
      ctx.moveTo(tx, cy - tickH);
      ctx.lineTo(tx, cy + tickH);
      ctx.stroke();
    }

    // Viñeteado óptico perimetral del tubo ocular WF10x/18
    const vig = ctx.createRadialGradient(cx, cy, radius * 0.82, cx, cy, radius * 1.02);
    vig.addColorStop(0, 'rgba(8,9,12,0)');
    vig.addColorStop(0.85, 'rgba(8,9,12,0.38)');
    vig.addColorStop(1, 'rgba(8,9,12,0.96)');
    ctx.fillStyle = vig;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Anillo metálico interior del ocular
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  $effect(() => {
    const visible =
      labStore.isMicroscopeActive ||
      labStore.microscopeFsmState === 'INSPECTING_MICROSCOPE' ||
      labStore.microscopeTransitionPhase !== 'IDLE';
    if (visible && ocularCanvas) {
      if (animFrameId === null) {
        animFrameId = requestAnimationFrame(renderOcularField);
      }
    } else if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    return () => {
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    };
  });

  onDestroy(() => {
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
    }
  });
</script>

<svelte:window
  onkeydown={(e) => {
    if (
      (e.key === 'Escape' || e.key === 'Backspace') &&
      !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) &&
      (labStore.isMicroscopeActive || labStore.microscopeFsmState === 'INSPECTING_MICROSCOPE')
    ) {
      e.preventDefault();
      labStore.closeMicroscope();
    }
  }}
/>

{#if labStore.isMicroscopeActive || labStore.microscopeFsmState === 'INSPECTING_MICROSCOPE' || labStore.microscopeTransitionPhase !== 'IDLE'}
  {@const objSpec = labStore.activeMicroscopeObjectiveSpec}
  {@const partSpec = labStore.activeMicroscopePartSpec}
  {@const specSpec = labStore.activeMicroscopeSpecimenSpec}

  <!-- VISTA "INVENTARIO" DEL OCULAR: fondo atenuado + lente gigante centrado + ajustes a la izquierda -->
  <div
    class="fixed inset-0 z-30 pointer-events-none"
    style="opacity: {inventoryAppear}; background: radial-gradient(ellipse at center, rgba(8, 9, 12, 0.65) 0%, rgba(8, 9, 12, 0.88) 62%, rgba(8, 9, 12, 0.98) 100%); backdrop-filter: blur({inventoryAppear * 6}px); -webkit-backdrop-filter: blur({inventoryAppear * 6}px);"
    aria-hidden="true"
  ></div>

  <div
    class="microscope-inventory fixed inset-0 z-30 {inventoryAppear > 0.02 ? 'pointer-events-auto' : 'pointer-events-none'}"
    style="--lens-scale: {lensScale}; --panel-appear: {panelsAppear}; opacity: {Math.min(1, inventoryAppear * 1.6)};"
    aria-label="Vista ocular del microscopio"
    role="dialog"
  >
    <!-- COLUMNA IZQUIERDA: AJUSTES ÓPTICOS Y MECÁNICOS -->
    <aside class="inv-left" aria-label="Ajustes del microscopio">
      <div class="lab-panel rounded-[24px] p-3.5 h-full flex flex-col gap-3 overflow-hidden shadow-2xl">
        <!-- Segmented Control estilo Apple visionOS -->
        <div class="flex items-center bg-white/[0.07] p-0.5 rounded-full border border-white/[0.08] shrink-0">
          <button
            type="button"
            onclick={() => (activeRightTab = 'controls')}
            class="lab-btn flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 {activeRightTab ===
            'controls'
              ? 'bg-white text-black font-semibold shadow-sm'
              : 'text-white/70 hover:text-white'}"
          >
            <Sliders class="w-3.5 h-3.5" />
            <span>Óptica y Enfoque</span>
          </button>
          <button
            type="button"
            onclick={() => (activeRightTab = 'parts')}
            class="lab-btn flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 {activeRightTab ===
            'parts'
              ? 'bg-white text-black font-semibold shadow-sm'
              : 'text-white/70 hover:text-white'}"
          >
            <Layers class="w-3.5 h-3.5" />
            <span>12 Partes</span>
          </button>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-3">
          {#if activeRightTab === 'controls'}
            <!-- Selector de modo de arrastre en el ocular: Eje Y (Enfoque Analítico) vs Platina X-Y -->
            <div class="w-full flex items-center justify-between bg-white/[0.05] p-0.5 rounded-full border border-white/[0.08] text-[10px] shrink-0">
              <button
                type="button"
                onclick={() => (ocularDragMode = 'focus_y')}
                class="lab-btn flex-1 py-1 px-2 rounded-full font-semibold transition-all cursor-pointer {ocularDragMode === 'focus_y'
                  ? 'bg-emerald-400 text-black'
                  : 'text-white/65 hover:text-white'}"
              >
                Eje Y · Enfoque Analítico
              </button>
              <button
                type="button"
                onclick={() => (ocularDragMode = 'stage_xy')}
                class="lab-btn flex-1 py-1 px-2 rounded-full font-semibold transition-all cursor-pointer {ocularDragMode === 'stage_xy'
                  ? 'bg-white text-black'
                  : 'text-white/65 hover:text-white'}"
              >
                Platina X-Y
              </button>
            </div>

            <section class="apple-card-inner rounded-2xl p-3 flex flex-col gap-2.5">
          <!-- Aviso de inmersión en aceite (100x) o alerta de colisión de cubreobjetos -->
          {#if labStore.microscopeSlideCollisionWarning}
            <div class="w-full px-3 py-1.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center gap-2 text-[11px] text-rose-200">
              <AlertTriangle class="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>¡Riesgo de impacto con cubreobjetos (0.17 mm)! Baja el macrométrico.</span>
            </div>
          {:else if objSpec.requiresOil && !labStore.microscopeImmersionOilApplied}
            <button
              type="button"
              onclick={() => labStore.applyImmersionOil()}
              class="lab-btn w-full py-1.5 px-3 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 flex items-center justify-center gap-2 text-[11px] font-semibold text-emerald-200 cursor-pointer"
            >
              <Droplets class="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>Aplicar Aceite de Inmersión (n = 1.515)</span>
            </button>
          {/if}

          <!-- Selector del Revólver de 4 Objetivos DIN (4x, 10x, 40x, 100x) -->
          <div class="w-full flex flex-col gap-1.5">
            <div class="flex items-center justify-between text-[10px] text-white/50 px-1">
              <span class="uppercase tracking-wider font-semibold">Revólver de Objetivos DIN</span>
              <button
                type="button"
                onclick={() => labStore.autoFocusMicroscope()}
                class="lab-btn text-emerald-300 hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles class="w-3 h-3" />
                <span>Auto-Enfocar</span>
              </button>
            </div>
            <div class="grid grid-cols-4 gap-1.5">
              {#each objectivePowers as power}
                {@const spec = MICROSCOPE_OBJECTIVES[power]}
                {@const isActive = labStore.microscopeObjective === power}
                <button
                  type="button"
                  onclick={() => labStore.setMicroscopeObjective(power)}
                  class="lab-btn py-2 px-1.5 rounded-2xl border flex flex-col items-center gap-0.5 cursor-pointer {isActive
                    ? 'bg-white text-black border-white font-bold shadow-md'
                    : 'bg-white/[0.05] hover:bg-white/[0.1] text-white/80 border-white/[0.08]'}"
                >
                  <div class="flex items-center gap-1">
                    <span
                      class="w-2 h-2 rounded-full border border-black/20"
                      style="background-color: {spec.dinColorHex};"
                    ></span>
                    <span class="font-mono-numbers text-xs font-bold">{power}x</span>
                  </div>
                  <span class="font-mono-numbers text-[9px] {isActive ? 'text-black/70' : 'text-white/45'}">
                    {spec.totalMagnification}x
                  </span>
                </button>
              {/each}
            </div>
          </div>

          <!-- Modos de Iluminación Óptica -->
          <div class="w-full grid grid-cols-2 gap-1.5">
            {#each opticalModes as m}
              <button
                type="button"
                onclick={() => {
                  labStore.microscopeOpticalMode = m.id;
                  labStore.selectMicroscopePart('condenser');
                }}
                class="py-1.5 px-2.5 rounded-xl text-[11px] font-medium border transition-all cursor-pointer {labStore.microscopeOpticalMode ===
                m.id
                  ? 'bg-white/18 text-white border-white/35 font-semibold'
                  : 'bg-white/[0.04] text-white/60 border-white/[0.06] hover:text-white'}"
              >
                {m.label}
              </button>
            {/each}
          </div>
            </section>
            <!-- 1. Selector de Preparación Microscópica (6 Muestras) -->
            <section class="bg-white/[0.04] border border-white/[0.07] rounded-3xl p-3.5 flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-mono-numbers uppercase tracking-[0.12em] text-white/50">
                  Portaobjetos en Platina (76 × 26 mm · Cubre 0.17 mm)
                </span>
                <span class="text-[10px] font-mono-numbers text-emerald-300">
                  Recomendado: {specSpec.recommendedPower}x
                </span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {#each MICROSCOPE_SPECIMENS as specimen}
                  {@const isSelected = labStore.microscopeSpecimenId === specimen.id}
                  <button
                    type="button"
                    onclick={() => labStore.selectMicroscopeSpecimen(specimen.id)}
                    class="text-left p-2.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-2 {isSelected
                      ? 'bg-white/[0.14] border-white/30 text-white shadow-sm'
                      : 'bg-white/[0.03] border-white/[0.06] text-white/70 hover:bg-white/[0.07]'}"
                  >
                    <span
                      class="w-2 h-2 rounded-full mt-1 shrink-0"
                      style="background-color: {specimen.accentColor}; box-shadow: 0 0 8px {specimen.accentColor};"
                    ></span>
                    <div class="min-w-0">
                      <p class="text-xs font-semibold leading-tight truncate">{specimen.name}</p>
                      <p class="text-[10px] text-white/50 truncate mt-0.5">{specimen.stainOrMedium}</p>
                    </div>
                  </button>
                {/each}
              </div>

              <!-- Estructuras observables en la preparación actual -->
              <div class="mt-1 pt-2 border-t border-white/[0.07] flex flex-col gap-1">
                <p class="text-[11px] text-white/75 leading-relaxed">{specSpec.summary}</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
                  {#each specSpec.structuresVisible as st}
                    <div class="flex items-center gap-1.5 text-[10.5px] text-white/65">
                      <CheckCircle2 class="w-3 h-3 text-emerald-400 shrink-0" />
                      <span class="truncate">{st}</span>
                    </div>
                  {/each}
                </div>
              </div>
            </section>

            <!-- 2. Tornillos Coaxiales Macrométrico y Micrométrico -->
            <section class="bg-white/[0.04] border border-white/[0.07] rounded-3xl p-3.5 flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-mono-numbers uppercase tracking-[0.12em] text-white/50">
                  Sistema Mecánico de Enfoque Coaxial
                </span>
                <span class="font-mono-numbers text-[11px] text-white/80">
                  Altura Z: {labStore.microscopeTotalStageUm.toFixed(1)} µm
                </span>
              </div>

              <!-- Macrométrico -->
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-medium text-white/85">Tornillo Macrométrico (Enfoque Rápido)</span>
                  <span class="font-mono-numbers text-[11px] text-white/55">{labStore.microscopeCoarseUm} µm</span>
                </div>
                <input
                  type="range"
                  min="4200"
                  max="4620"
                  step="5"
                  value={labStore.microscopeCoarseUm}
                  oninput={(e) => {
                    labStore.microscopeCoarseUm = Number((e.currentTarget as HTMLInputElement).value);
                    labStore.microscopeSelectedPartId = 'coarse_knob';
                  }}
                  class="w-full accent-white cursor-pointer h-1.5 bg-white/15 rounded-lg"
                />
              </div>

              <!-- Micrométrico + Rueda Táctil Arrastrable -->
              <div class="flex flex-col gap-1.5">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-medium text-white/85">
                    Tornillo Micrométrico (Precisión 2 µm/div)
                  </span>
                  <div class="flex items-center gap-2">
                    <div
                      onpointerdown={onFineKnobPointerDown}
                      onpointermove={onFineKnobPointerMove}
                      onpointerup={onFineKnobPointerUp}
                      onpointercancel={onFineKnobPointerUp}
                      role="slider"
                      tabindex="0"
                      aria-label="Tambor micrométrico arrastrable en eje Y"
                      aria-valuemin={-120}
                      aria-valuemax={120}
                      aria-valuenow={labStore.microscopeFineUm}
                      class="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-[10px] font-semibold text-emerald-200 cursor-ns-resize select-none"
                      title="Arrastra verticalmente para girar el tambor micrométrico"
                    >
                      ↕ Arrastrar Tambor
                    </div>
                    <span class="font-mono-numbers text-[11px] text-emerald-300">
                      {labStore.microscopeFineUm >= 0 ? `+${labStore.microscopeFineUm}` : labStore.microscopeFineUm} µm
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="-120"
                  max="120"
                  step="1"
                  value={labStore.microscopeFineUm}
                  oninput={(e) => {
                    labStore.microscopeFineUm = Number((e.currentTarget as HTMLInputElement).value);
                    labStore.microscopeSelectedPartId = 'fine_knob';
                  }}
                  class="w-full accent-emerald-400 cursor-pointer h-1.5 bg-white/15 rounded-lg"
                />
              </div>
            </section>

            <!-- 3. Platina Mecánica X-Y (Nonio Vernier) + Condensador de Abbe e Iluminador Köhler -->
            <div class="grid grid-cols-1 gap-3">
              <!-- Platina X-Y -->
              <section class="apple-card-inner rounded-2xl p-3.5 flex flex-col justify-between gap-2.5">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-mono-numbers uppercase tracking-wider text-white/50">
                    Platina Vernier X-Y
                  </span>
                  <button
                    type="button"
                    onclick={() => {
                      labStore.microscopeStageXUm = 0;
                      labStore.microscopeStageYUm = 0;
                    }}
                    class="lab-btn text-[10px] text-white/60 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Crosshair class="w-3 h-3" />
                    <span>Centrar</span>
                  </button>
                </div>

                <div class="grid grid-cols-3 gap-1.5 max-w-[156px] mx-auto my-0.5">
                  <div></div>
                  <button
                    type="button"
                    onclick={() => labStore.moveMicroscopeStage(0, -80)}
                    class="lab-btn py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-white text-xs font-bold cursor-pointer"
                  >
                    ▲
                  </button>
                  <div></div>
                  <button
                    type="button"
                    onclick={() => labStore.moveMicroscopeStage(-80, 0)}
                    class="lab-btn py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-white text-xs font-bold cursor-pointer"
                  >
                    ◀
                  </button>
                  <div class="flex items-center justify-center font-mono-numbers text-[10px] text-white/55">
                    XY
                  </div>
                  <button
                    type="button"
                    onclick={() => labStore.moveMicroscopeStage(80, 0)}
                    class="lab-btn py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-white text-xs font-bold cursor-pointer"
                  >
                    ▶
                  </button>
                  <div></div>
                  <button
                    type="button"
                    onclick={() => labStore.moveMicroscopeStage(0, 80)}
                    class="lab-btn py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-white text-xs font-bold cursor-pointer"
                  >
                    ▼
                  </button>
                  <div></div>
                </div>

                <div class="flex items-center justify-between text-[10.5px] font-mono-numbers text-white/60 pt-1 border-t border-white/[0.06]">
                  <span>X: {(40 + labStore.microscopeStageXUm / 1000).toFixed(2)} mm</span>
                  <span>Y: {(25 + labStore.microscopeStageYUm / 1000).toFixed(2)} mm</span>
                </div>
              </section>

              <!-- Condensador de Abbe, Diafragma Iris e Iluminador LED Köhler -->
              <section class="apple-card-inner rounded-2xl p-3.5 flex flex-col justify-between gap-2.5">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-mono-numbers uppercase tracking-wider text-white/50">
                    Condensador & LED Köhler
                  </span>
                  <button
                    type="button"
                    onclick={() => {
                      labStore.microscopeLampOn = !labStore.microscopeLampOn;
                      labStore.selectMicroscopePart('illuminator');
                    }}
                    class="lab-btn px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 cursor-pointer {labStore.microscopeLampOn
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35'
                      : 'bg-white/10 text-white/50'}"
                  >
                    <Power class="w-2.5 h-2.5" />
                    <span>{labStore.microscopeLampOn ? 'LED ON' : 'OFF'}</span>
                  </button>
                </div>

                <div class="flex flex-col gap-1">
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="text-white/75 flex items-center gap-1">
                      <Sun class="w-3 h-3 text-amber-300" />
                      Reóstato LED (5700 K)
                    </span>
                    <span class="font-mono-numbers text-white/60">
                      {Math.round(labStore.microscopeLampIntensity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={labStore.microscopeLampIntensity}
                    oninput={(e) => {
                      labStore.microscopeLampIntensity = Number(
                        (e.currentTarget as HTMLInputElement).value
                      );
                      labStore.microscopeSelectedPartId = 'illuminator';
                    }}
                    class="w-full accent-amber-300 cursor-pointer h-1.5 bg-white/15 rounded-lg"
                  />
                </div>

                <div class="flex flex-col gap-1">
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="text-white/75">Diafragma Iris (Abbe NA 1.25)</span>
                    <span class="font-mono-numbers text-white/60">
                      {Math.round(labStore.microscopeDiaphragm * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.15"
                    max="1"
                    step="0.05"
                    value={labStore.microscopeDiaphragm}
                    oninput={(e) => {
                      labStore.microscopeDiaphragm = Number(
                        (e.currentTarget as HTMLInputElement).value
                      );
                      labStore.microscopeSelectedPartId = 'diaphragm';
                    }}
                    class="w-full accent-emerald-400 cursor-pointer h-1.5 bg-white/15 rounded-lg"
                  />
                </div>
              </section>
            </div>
          {:else}
            <!-- PESTAÑA 2: ANATOMÍA FUNCIONAL DE LAS 12 PARTES REALES DEL MICROSCOPIO -->
            <div class="bg-white/[0.06] border border-white/[0.12] rounded-3xl p-3.5 flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <span class="font-mono-numbers text-[10px] uppercase tracking-[0.14em] text-emerald-300">
                  {partSpec.code} · {partSpec.system}
                </span>
                <span class="font-mono-numbers text-[10px] text-white/50">{partSpec.spec}</span>
              </div>
              <h3 class="text-sm font-semibold text-white">{partSpec.name}</h3>
              <p class="text-xs text-white/80 leading-relaxed">
                {labStore.educationLevel === 'primaria'
                  ? partSpec.primariaExplain
                  : partSpec.secundariaExplain}
              </p>
              <p class="text-[11px] text-emerald-300/90 font-medium pt-1 border-t border-white/[0.08]">
                {partSpec.interactiveHint}
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 overflow-y-auto pr-0.5">
              {#each MICROSCOPE_PARTS as part}
                {@const isSelected = labStore.microscopeSelectedPartId === part.id}
                <button
                  type="button"
                  onclick={() => labStore.selectMicroscopePart(part.id)}
                  class="text-left p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-0.5 {isSelected
                    ? 'bg-white text-black border-white shadow-md'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] text-white border-white/[0.07]'}"
                >
                  <div class="flex items-center justify-between gap-1">
                    <span
                      class="font-mono-numbers text-[9.5px] uppercase tracking-wider {isSelected
                        ? 'text-black/60 font-bold'
                        : 'text-white/45'}"
                    >
                      {part.code} · {part.system.replace('Sistema ', '')}
                    </span>
                  </div>
                  <span class="text-xs font-semibold leading-snug">{part.name}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </aside>

    <!-- CENTRO: LENTE OCULAR GIGANTE (estilo inventario) — Eje Y controla enfoque analítico; rueda o arrastre -->
    <div class="inv-center">
      <div class="inv-lens-frame" bind:clientWidth={lensPx}>
        <div
          class="relative w-full h-full rounded-full bg-black overflow-hidden {ocularDragMode === 'focus_y'
            ? 'cursor-ns-resize'
            : 'cursor-grab active:cursor-grabbing'} select-none"
          onpointerdown={onOcularPointerDown}
          onpointermove={onOcularPointerMove}
          onpointerup={onOcularPointerUp}
          onpointercancel={onOcularPointerUp}
          onpointerleave={onOcularPointerLeave}
          onwheel={onOcularWheel}
          role="application"
          aria-label="Campo visual del ocular binocular. Mueve el ratón en el Eje Y o gira la rueda para ajustar el enfoque analítico."
        >
          <canvas
            bind:this={ocularCanvas}
            width="768"
            height="768"
            class="w-full h-full block"
            style="filter: {quantizedBlurPx > 0 ? `blur(${quantizedBlurPx * lensBlurScale}px)` : 'none'}; transform: translateZ(0);"
          ></canvas>

          <!-- Retícula SVG vectorial y muestra translúcida con profundidad de campo analítica -->
          <svg
            viewBox="0 0 200 200"
            class="absolute inset-0 w-full h-full pointer-events-none"
            style="filter: {quantizedBlurPx > 0 ? `blur(${Math.min(8, quantizedBlurPx * 0.45) * lensBlurScale}px)` : 'none'}; opacity: {labStore.microscopeLampOn ? 0.55 : 0.08};"
          >
            <g
              transform="translate({100 - labStore.microscopeStageXUm * 0.04}, {100 - labStore.microscopeStageYUm * 0.04})"
            >
              <circle
                cx="0"
                cy="0"
                r="48"
                fill="none"
                stroke={specSpec.accentColor}
                stroke-width="0.75"
                stroke-dasharray="3 2"
              />
              <path
                d="M -28 -12 Q 0 -28 28 -12 Q 36 12 0 26 Q -36 12 -28 -12 Z"
                fill="{specSpec.accentColor}22"
                stroke={specSpec.accentColor}
                stroke-width="1.1"
              />
              <circle cx="-6" cy="-2" r="5" fill={specSpec.accentColor} fill-opacity="0.55" />
            </g>
          </svg>

          <!-- Barra de escala micrométrica calibrada dentro del ocular -->
          <div class="absolute bottom-[7%] left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-1 bg-black/75 px-3.5 py-1.5 rounded-full border border-white/15">
            <div class="w-14 h-0.5 bg-white relative">
              <span class="absolute -left-0.5 -top-1 w-0.5 h-2.5 bg-white"></span>
              <span class="absolute -right-0.5 -top-1 w-0.5 h-2.5 bg-white"></span>
            </div>
            <span class="font-mono-numbers text-[11px] text-white/90">
              {scaleBarUm} µm · FOV {objSpec.fieldOfViewUm} µm
            </span>
          </div>

          <!-- Nitidez en la parte superior del campo -->
          <div class="absolute top-[6%] left-1/2 -translate-x-1/2 pointer-events-none">
            <span
              class="font-mono-numbers px-3 py-1 rounded-full text-[11px] font-semibold backdrop-blur-sm {labStore.microscopeFocusQualityPercent >=
              85
                ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-500/40'
                : labStore.microscopeFocusQualityPercent >= 45
                  ? 'bg-amber-500/25 text-amber-200 border border-amber-500/40'
                  : 'bg-rose-500/25 text-rose-200 border border-rose-500/40'}"
            >
              Nitidez {labStore.microscopeFocusQualityPercent}%
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- COLUMNA DERECHA: ESTADO, TELEMETRÍA Y SALIDA -->
    <aside class="inv-right" aria-label="Estado del microscopio">
      <div class="apple-island rounded-[24px] px-4 py-3.5 flex flex-col gap-3 shadow-2xl">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-2xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center shrink-0">
              <Eye class="w-4 h-4 text-white" />
            </div>
            <div class="min-w-0">
              <span class="text-[9.5px] font-mono-numbers uppercase tracking-[0.14em] text-white/50 block">
                DIN 160 MM · WF10x/18
              </span>
              <h2 class="text-sm font-semibold tracking-[-0.02em] text-white leading-tight">
                Microscopio Binocular
              </h2>
            </div>
          </div>
          <button
            type="button"
            onclick={() => labStore.closeMicroscope()}
            class="lab-btn w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.16] flex items-center justify-center text-white/75 hover:text-white cursor-pointer shrink-0"
            title="Cerrar estación de microscopía (Esc)"
            aria-label="Cerrar microscopio"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="flex items-center gap-2">
          <span
            class="w-2.5 h-2.5 rounded-full {labStore.microscopeTransitionPhase === 'OCULAR_LOCKED'
              ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
              : 'bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse'}"
          ></span>
          <span class="text-[10.5px] font-mono-numbers font-semibold tracking-[0.06em] uppercase text-white/85">
            FSM: {labStore.microscopeFsmState}
          </span>
        </div>

        <p class="text-[11.5px] text-white/80 leading-relaxed">
          {#if labStore.microscopeTransitionPhase === 'APPROACHING_OCULAR'}
            <strong class="text-amber-300">Acercamiento:</strong> la cámara se asoma al ocular…
          {:else if labStore.microscopeTransitionPhase === 'RETURNING_TO_EXPLORING'}
            <strong class="text-emerald-300">Alejándose:</strong> volviendo a la posición original…
          {:else}
            Mueve el ratón en el <strong class="text-white">Eje Y</strong> sobre el lente o usa la rueda para enfocar. Arrastra para mover la platina.
          {/if}
        </p>

        <div class="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-white/10">
          <div class="flex flex-col">
            <span class="text-white/45 text-[9.5px] uppercase tracking-wider">Aumento</span>
            <span class="font-mono-numbers text-white font-semibold flex items-center gap-1.5">
              <span
                class="w-2 h-2 rounded-full"
                style="background-color: {objSpec.dinColorHex}; box-shadow: 0 0 8px {objSpec.dinColorHex};"
              ></span>
              {objSpec.totalMagnification}x
            </span>
          </div>
          <div class="flex flex-col">
            <span class="text-white/45 text-[9.5px] uppercase tracking-wider">NA · WD</span>
            <span class="font-mono-numbers text-white/80">
              {objSpec.numericalAperture.toFixed(2)} · {objSpec.workingDistanceMm} mm
            </span>
          </div>
          <div class="flex flex-col">
            <span class="text-white/45 text-[9.5px] uppercase tracking-wider">Pieza activa</span>
            <span class="text-white font-semibold truncate">{partSpec.name.split(' ')[0]}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-white/45 text-[9.5px] uppercase tracking-wider">Altura Z</span>
            <span class="font-mono-numbers text-white/80">{labStore.microscopeTotalStageUm.toFixed(1)} µm</span>
          </div>
        </div>

        <div class="flex items-start gap-2 pt-2 border-t border-white/10">
          <span
            class="w-2 h-2 rounded-full mt-1 shrink-0"
            style="background-color: {specSpec.accentColor}; box-shadow: 0 0 8px {specSpec.accentColor};"
          ></span>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-white leading-tight">{specSpec.name}</p>
            <p class="text-[10.5px] text-white/55 mt-0.5">{specSpec.stainOrMedium}</p>
          </div>
        </div>

        <button
          type="button"
          onclick={() => labStore.closeMicroscope()}
          class="lab-btn w-full py-2 rounded-full bg-white text-black hover:bg-white/90 text-[12px] font-bold cursor-pointer shadow-sm"
        >
          Alejarse (ESC)
        </button>
      </div>
    </aside>
  </div>
{/if}

<style>
  .microscope-inventory {
    --lens-size: min(84vh, 50vw);
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    column-gap: clamp(12px, 2vw, 32px);
    padding: clamp(12px, 2.5vh, 28px) clamp(12px, 2vw, 28px);
  }

  .inv-left {
    justify-self: end;
    width: min(390px, 100%);
    height: min(var(--lens-size), calc(100vh - 32px));
    opacity: var(--panel-appear);
    transform: translate3d(calc((1 - var(--panel-appear)) * -48px), 0, 0);
  }

  .inv-right {
    justify-self: start;
    align-self: center;
    width: min(300px, 100%);
    opacity: var(--panel-appear);
    transform: translate3d(calc((1 - var(--panel-appear)) * 48px), 0, 0);
  }

  .inv-center {
    width: var(--lens-size);
    height: var(--lens-size);
    display: grid;
    place-items: center;
  }

  /* Bisel de precisión del lente ocular (diseño espacial en titanio oscuro y antirreflejo) */
  .inv-lens-frame {
    width: 100%;
    height: 100%;
    padding: clamp(8px, 1.4vh, 16px);
    border-radius: 9999px;
    background:
      radial-gradient(circle at 50% 50%, transparent 63%, rgba(16, 185, 129, 0.09) 64.5%, transparent 66%, rgba(255, 255, 255, 0.08) 67%),
      conic-gradient(from 215deg, #101217, #1e222a, #0b0d11, #282d38, #13151b, #21252f, #101217);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.12),
      0 28px 80px -10px rgba(0, 0, 0, 0.85),
      inset 0 2px 6px rgba(255, 255, 255, 0.14),
      inset 0 -8px 22px rgba(0, 0, 0, 0.8);
    transform: scale(var(--lens-scale));
    transform-origin: 50% 50%;
    will-change: transform;
  }

  @media (max-width: 960px) {
    .microscope-inventory {
      --lens-size: min(92vw, 62vh);
      grid-template-columns: minmax(0, 1fr);
      justify-items: center;
      align-content: start;
      row-gap: 14px;
      overflow-y: auto;
    }
    .inv-center {
      order: 1;
    }
    .inv-left {
      order: 2;
      justify-self: stretch;
      width: 100%;
      height: auto;
    }
    .inv-right {
      order: 3;
      justify-self: stretch;
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .inv-lens-frame,
    .inv-left,
    .inv-right {
      transform: none;
    }
  }
</style>
