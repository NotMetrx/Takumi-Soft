<script lang="ts">
  import { onDestroy } from 'svelte';
  import {
    labStore,
    EXPERIMENT_PRESETS,
    LAB_TOOLS_CATALOG,
    CABINET_COMPONENTS,
    type HomeExperimentPreset,
    type CabinetComponentInfo
  } from '$lib/interaction/lab_store.svelte';
  import { labSound } from '$lib/audio/lab_sound';
  import {
    BookOpen,
    Play,
    Pause,
    RotateCcw,
    CheckCircle2,
    FlaskConical,
    Upload,
    X,
    ChevronLeft,
    ChevronRight,
    Volume2,
    VolumeX,
    Package
  } from '@lucide/svelte';

  /**
   * Estructura física del Libro 3D Correlativo (Primaria, Secundaria y Casos STEAM Prolongo & Pinto 2022):
   * - Hoja 0 (Sheet 0): Frente = Portada Dura | Reverso = Página 1 (Índice General Correlativo: 8 Experimentos + Mueble 3D)
   * - Hojas 1..8 (Sheets 1..8):
   *    - Frente = Página par (2, 4, 6, 8, 10, 12, 14, 16): Fundamento STEAM, Materiales Clasificados y Video Demostrativo
   *    - Reverso = Página impar (3, 5, 7, 9, 11, 13, 15, 17): Misión Práctica en el Laboratorio 3D, Evaluación y Botón Equipar
   * - Hoja 9 (Sheet 9):
   *    - Frente = Página 18: Guía del Mueble 3D Clasificado de Componentes STEAM y Herramientas de Escala Real
   */
  const MAX_SPREAD = EXPERIMENT_PRESETS.length + 1; // 9 pliegos (Páginas 1 a 18)

  let currentSpread = $state<number>(0);
  let turningDirection = $state<'next' | 'prev' | null>(null);
  let turningSheets = $state<number[]>([]);
  let openAnimTimer: ReturnType<typeof setTimeout> | null = null;
  let turnFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

  // Deslizamiento / arrastre (swipe) con ratón o pantalla táctil para pasar páginas
  let pointerStartX: number | null = null;
  let pointerDragDeltaX = $state<number>(0);

  // Videos demostrativos integrados en las páginas pares del libro
  let videoCanvases: Record<string, HTMLCanvasElement | undefined> = $state({});
  let isPlaying = $state<boolean>(false);
  let videoTimeSec = $state<number>(0);
  const totalDurationSec = 20;
  let rafId: number | null = null;
  let lastFrameTs = 0;

  // Video MP4/WebM opcional subido por el usuario
  let customVideoUrl = $state<string | null>(null);
  let fileInputEl: HTMLInputElement | undefined = $state();

  // Respuestas a las preguntas de autoevaluación escritas en el libro
  let quizAnswers = $state<Record<string, number | null>>({});

  const primariaPresets = EXPERIMENT_PRESETS.filter((p) => p.level === 'primaria');
  const secundariaPresets = EXPERIMENT_PRESETS.filter((p) => p.level === 'secundaria');

  const activeVideoPreset = $derived<HomeExperimentPreset>(
    EXPERIMENT_PRESETS[Math.max(0, Math.min(EXPERIMENT_PRESETS.length - 1, currentSpread - 1))] ??
      EXPERIMENT_PRESETS[0]
  );

  // Al abrir el modal, el libro aparece cerrado (Portada) y en 180 ms gira su tapa dura con sonido real
  $effect(() => {
    if (labStore.isHomeBookOpen) {
      currentSpread = 0;
      turningSheets = [];
      videoTimeSec = 0;
      isPlaying = true;
      lastFrameTs = performance.now();
      startVideoLoop();

      if (openAnimTimer) clearTimeout(openAnimTimer);
      openAnimTimer = setTimeout(() => {
        markSheetsTurning(0, 1, 'next');
        currentSpread = 1;
      }, 180);
    } else {
      stopVideoLoop();
      if (openAnimTimer) clearTimeout(openAnimTimer);
    }
  });

  function getChapterForPreset(preset: HomeExperimentPreset) {
    return (
      preset.videoChapters.find(
        (ch) => videoTimeSec >= ch.timeSec && videoTimeSec < ch.timeSec + ch.durationSec
      ) ?? preset.videoChapters[preset.videoChapters.length - 1]
    );
  }

  function markSheetsTurning(fromSpread: number, toSpread: number, dir: 'next' | 'prev') {
    const low = Math.min(fromSpread, toSpread);
    const high = Math.max(fromSpread, toSpread);
    const affected: number[] = [];
    for (let i = low; i < high; i++) {
      affected.push(i);
    }
    turningSheets = affected;
    turningDirection = dir;
    if (turnFeedbackTimer) clearTimeout(turnFeedbackTimer);
    turnFeedbackTimer = setTimeout(() => {
      turningDirection = null;
      turningSheets = [];
    }, 760);
  }

  function goToSpread(targetSpread: number, playAudio = true) {
    const clamped = Math.max(0, Math.min(MAX_SPREAD, targetSpread));
    if (clamped === currentSpread) return;

    const dir = clamped > currentSpread ? 'next' : 'prev';
    if (playAudio) {
      labSound.playPageTurn(dir);
    }
    markSheetsTurning(currentSpread, clamped, dir);
    currentSpread = clamped;
    videoTimeSec = 0;
    drawAllVisibleCanvases();
  }

  function nextPage() {
    if (currentSpread < MAX_SPREAD) {
      goToSpread(currentSpread + 1, true);
    }
  }

  function prevPage() {
    if (currentSpread > 1) {
      goToSpread(currentSpread - 1, true);
    } else if (currentSpread === 1) {
      goToSpread(0, true);
    }
  }

  function closeBookWithAnimation() {
    labSound.playBookClose();
    markSheetsTurning(currentSpread, 0, 'prev');
    currentSpread = 0;
    setTimeout(() => {
      labStore.isHomeBookOpen = false;
    }, 520);
  }

  /**
   * Calcula posición 3D física (rotateY + translateZ escalonado) para evitar
   * cualquier colisión o z-fighting entre páginas en transform-style: preserve-3d
   */
  function getSheetStyle(sheetIndex: number): string {
    const isFlipped = sheetIndex < currentSpread;
    const isTurning = turningSheets.includes(sheetIndex);
    const rotY = isFlipped ? -180 : 0;

    let zPx = 0;
    let zIdx = 20;
    if (isTurning) {
      zPx = 14;
      zIdx = 95;
    } else if (isFlipped) {
      const depthFromTop = currentSpread - 1 - sheetIndex;
      zPx = 2 - depthFromTop * 2.2;
      zIdx = 20 + sheetIndex;
    } else {
      const depthFromTop = sheetIndex - currentSpread;
      zPx = 2 - depthFromTop * 2.2;
      zIdx = 45 - sheetIndex;
    }

    const isVisible =
      isTurning ||
      sheetIndex === currentSpread ||
      sheetIndex === currentSpread - 1 ||
      (turningSheets.length > 0 &&
        (sheetIndex === currentSpread + 1 || sheetIndex === currentSpread - 2));

    return `z-index: ${zIdx}; transform: translateZ(${zPx}px) rotateY(${rotY}deg); pointer-events: ${
      !isTurning && (sheetIndex === currentSpread || sheetIndex === currentSpread - 1)
        ? 'auto'
        : 'none'
    }; opacity: ${isVisible ? 1 : 0}; visibility: ${isVisible ? 'visible' : 'hidden'};`;
  }

  function onBookPointerDown(e: PointerEvent) {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, video, a')) return;
    pointerStartX = e.clientX;
    pointerDragDeltaX = 0;
  }

  function onBookPointerMove(e: PointerEvent) {
    if (pointerStartX === null) return;
    pointerDragDeltaX = e.clientX - pointerStartX;
  }

  function onBookPointerUp() {
    if (pointerStartX === null) return;
    if (pointerDragDeltaX < -55 && currentSpread < MAX_SPREAD) {
      nextPage();
    } else if (pointerDragDeltaX > 55 && currentSpread > 0) {
      prevPage();
    }
    pointerStartX = null;
    pointerDragDeltaX = 0;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!labStore.isHomeBookOpen) return;
    if (e.key === 'ArrowRight') nextPage();
    if (e.key === 'ArrowLeft') prevPage();
    if (e.key === 'Escape') closeBookWithAnimation();
  }

  function togglePlay() {
    isPlaying = !isPlaying;
    if (isPlaying) {
      if (videoTimeSec >= totalDurationSec) videoTimeSec = 0;
      lastFrameTs = performance.now();
      startVideoLoop();
    } else {
      stopVideoLoop();
    }
  }

  function restartVideo() {
    videoTimeSec = 0;
    isPlaying = true;
    lastFrameTs = performance.now();
    startVideoLoop();
  }

  function startVideoLoop() {
    stopVideoLoop();
    const tick = (now: number) => {
      if (!isPlaying) return;
      const dt = (now - lastFrameTs) / 1000;
      lastFrameTs = now;
      videoTimeSec += dt;
      if (videoTimeSec >= totalDurationSec) {
        videoTimeSec = 0;
      }
      drawAllVisibleCanvases();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  function stopVideoLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function drawAllVisibleCanvases() {
    EXPERIMENT_PRESETS.forEach((p) => {
      const c = videoCanvases[p.id];
      if (c) drawPresetVideoFrame(c, p);
    });
  }

  function drawPresetVideoFrame(canvas: HTMLCanvasElement, preset: HomeExperimentPreset) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const ch = getChapterForPreset(preset);
    const progressInChapter = Math.min(
      1,
      Math.max(0, (videoTimeSec - ch.timeSec) / ch.durationSec)
    );

    // Fondo de laboratorio científico
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#090e1a');
    bgGrad.addColorStop(1, '#162033');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Mesa de laboratorio en la parte inferior
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, h - 50, w, 50);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h - 50);
    ctx.lineTo(w, h - 50);
    ctx.stroke();

    // Badge de Nivel Educativo + Referencia STEAM
    ctx.fillStyle = preset.level === 'primaria' ? '#065f46' : '#312e81';
    ctx.beginPath();
    ctx.roundRect(12, 10, 210, 26, 7);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Outfit", sans-serif';
    ctx.fillText(
      preset.steamEffect !== 'none'
        ? `${preset.level === 'primaria' ? '🎒 PRIMARIA' : '🔬 SECUNDARIA'} · STEAM RSEQ`
        : preset.level === 'primaria'
          ? '🎒 NIVEL PRIMARIA'
          : '🔬 NIVEL SECUNDARIA',
      20,
      27
    );

    // Base del Agitador Magnético bajo el vaso
    const cx = w * 0.5;
    const plateY = h - 62;
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(cx - 64, plateY, 128, 14, 6);
    ctx.fill();

    // Vaso de precipitados graduado (250 mL)
    const bx = cx - 48;
    const by = plateY - 120;
    const bw = 96;
    const bh = 118;

    const fillRatio =
      ch.actionType === 'prep'
        ? 0.42
        : ch.actionType === 'pour_acid'
          ? 0.58
          : ch.actionType === 'pour_base'
            ? 0.74
            : 0.84;
    const liqH = bh * fillRatio;

    // Líquido coloreado y menisco brillante
    ctx.fillStyle = ch.simColor;
    ctx.globalAlpha = 0.86;
    ctx.beginPath();
    ctx.roundRect(bx + 4, by + bh - liqH, bw - 8, liqH - 3, [0, 0, 10, 10]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.35;
    ctx.fillRect(bx + 5, by + bh - liqH, bw - 10, 3);
    ctx.globalAlpha = 1.0;

    // =========================================================================
    // EFECTOS VISUALES ESPECÍFICOS DE LOS EXPERIMENTOS STEAM (PROLONGO & PINTO)
    // =========================================================================
    if (preset.steamEffect === 'chupachups') {
      // Palito del Chupa Chups girando y caramelo esférico sumergido en el KMnO4
      const candyX = cx + Math.sin(videoTimeSec * 8) * 6;
      const candyY = by + bh - liqH * 0.55;
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(cx, by - 26);
      ctx.lineTo(candyX, candyY);
      ctx.stroke();

      // Caramelo esférico con anillo ecuatorial
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(candyX, candyY, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fecdd3';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Estelas espirales redox Mn(+7) -> Mn(+6) -> Mn(+4)
      ctx.strokeStyle = ch.simColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(candyX, candyY, 16 + Math.sin(videoTimeSec * 6) * 4, 0, Math.PI * 1.4);
      ctx.stroke();
    } else if (preset.steamEffect === 'antibubbles') {
      // Gradiente inferior de Sirope de Agave denso
      const syrupGrad = ctx.createLinearGradient(0, by + bh - 34, 0, by + bh);
      syrupGrad.addColorStop(0, 'rgba(245, 158, 11, 0.15)');
      syrupGrad.addColorStop(1, 'rgba(217, 119, 6, 0.72)');
      ctx.fillStyle = syrupGrad;
      ctx.beginPath();
      ctx.roundRect(bx + 4, by + bh - 34, bw - 8, 31, [0, 0, 10, 10]);
      ctx.fill();

      // Pajita / Pipeta Pasteur dosificando gotas desde arriba
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx + 8, by - 25);
      ctx.lineTo(cx + 2, by + bh - liqH + 6);
      ctx.stroke();

      // Antiburbujas esféricas suspendidas con película plateada de aire (refractive rim)
      for (let i = 0; i < 5; i++) {
        const abX = bx + 22 + ((i * 15) % (bw - 40));
        const abY =
          by +
          bh -
          28 -
          ((Math.sin(videoTimeSec * 2.2 + i * 1.3) * 0.5 + 0.5) * Math.max(18, liqH - 36));
        const radius = 5.5 + (i % 2) * 2;
        // Núcleo de líquido coloreado
        ctx.fillStyle = i % 2 === 0 ? '#0284c7' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(abX, abY, radius, 0, Math.PI * 2);
        ctx.fill();
        // Película esférica de aire brillante
        ctx.strokeStyle = '#f0f9ff';
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }
    } else if (preset.steamEffect === 'ice_convection') {
      // Cubito de hielo teñido de rojo flotando en el menisco
      const iceY = by + bh - liqH - 4;
      ctx.fillStyle = 'rgba(225, 29, 72, 0.82)';
      ctx.strokeStyle = '#ffe4e6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx - 16, iceY, 32, 18, 4);
      ctx.fill();
      ctx.stroke();

      // Si es agua pura (prep / pour_acid), penachos convectivos rojos descienden al fondo
      if (ch.actionType === 'prep' || ch.actionType === 'pour_acid') {
        ctx.strokeStyle = 'rgba(225, 29, 72, 0.65)';
        ctx.lineWidth = 2.5;
        for (let i = -1; i <= 1; i++) {
          const plumeX = cx + i * 9 + Math.sin(videoTimeSec * 4 + i) * 3;
          const plumeLen = ((videoTimeSec * 28 + Math.abs(i) * 14) % Math.max(20, liqH - 18)) + 12;
          ctx.beginPath();
          ctx.moveTo(cx + i * 6, iceY + 18);
          ctx.lineTo(plumeX, iceY + plumeLen);
          ctx.stroke();
        }
      } else {
        // En salmuera saturada (NaCl), capa roja estratificada flotando arriba
        ctx.fillStyle = 'rgba(225, 29, 72, 0.72)';
        ctx.fillRect(bx + 5, by + bh - liqH + 2, bw - 10, 12);
      }
    } else if (preset.steamEffect === 'tea_complex') {
      // Bolsita piramidal de té suspendida con hilo
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 10, by - 20);
      ctx.lineTo(cx - 10, by + bh - liqH * 0.65);
      ctx.stroke();

      ctx.fillStyle = 'rgba(254, 243, 199, 0.75)';
      ctx.beginPath();
      ctx.moveTo(cx - 10, by + bh - liqH * 0.65 - 8);
      ctx.lineTo(cx - 22, by + bh - liqH * 0.65 + 12);
      ctx.lineTo(cx + 2, by + bh - liqH * 0.65 + 12);
      ctx.closePath();
      ctx.fill();
    } else if (preset.steamEffect === 'botijo_cooling') {
      // Mini-botijo de arcilla porosa junto al vaso con flechas de evaporación endotérmica (-λw)
      const botX = bx - 54;
      const botY = plateY - 42;
      ctx.fillStyle = '#c2410c';
      ctx.strokeStyle = '#fdba74';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(botX, botY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Sudoración fría de microgotas azules en la pared del botijo
      ctx.fillStyle = '#38bdf8';
      for (let i = 0; i < 4; i++) {
        const ang = videoTimeSec * 2 + i * 1.5;
        ctx.beginPath();
        ctx.arc(botX + Math.cos(ang) * 25, botY + Math.sin(ang) * 25, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Pastilla magnética giratoria en el fondo del vaso
    const stirW = 14 + Math.sin(videoTimeSec * 16) * 8;
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(cx - stirW / 2, by + bh - 10, stirW, 5, 3);
    ctx.fill();

    // Burbujas ascendentes de reacción
    if (ch.actionType !== 'prep' && preset.steamEffect !== 'ice_convection') {
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      for (let i = 0; i < 7; i++) {
        const bubX = bx + 16 + ((i * 13) % (bw - 30));
        const bubY = by + bh - 12 - ((videoTimeSec * 42 + i * 17) % Math.max(18, liqH - 14));
        ctx.beginPath();
        ctx.arc(bubX, bubY, 2.2 + (i % 2), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Sonda del pH-metro sumergida por la izquierda
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(bx + 16, by - 20);
    ctx.lineTo(bx + 16, by + bh - 16);
    ctx.stroke();

    // Contorno de cristal borosilicato y marcas volumétricas
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.92)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, [2, 2, 12, 12]);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    [50, 150, 250].forEach((ml, idx) => {
      const my = by + bh - 24 - idx * 33;
      ctx.fillRect(bx + bw - 22, my, 12, 1.5);
      ctx.fillText(`${ml}`, bx + bw - 42, my + 3);
    });

    // Animación de matraz Erlenmeyer vertiendo reactivo
    if (
      ch.actionType !== 'prep' &&
      progressInChapter < 0.85 &&
      preset.steamEffect !== 'antibubbles'
    ) {
      const isAcid = ch.actionType === 'pour_acid';
      const bottleColor = isAcid ? preset.acidReagent.colorHex : preset.baseReagent.colorHex;
      const streamX = isAcid ? cx - 8 : cx + 12;

      ctx.strokeStyle = bottleColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(streamX, by - 26);
      ctx.lineTo(streamX, by + bh - liqH + 4);
      ctx.stroke();

      ctx.save();
      ctx.translate(isAcid ? streamX - 26 : streamX + 26, by - 34);
      ctx.rotate(isAcid ? 1.05 : -1.05);
      ctx.fillStyle = bottleColor;
      ctx.beginPath();
      ctx.moveTo(-7, -20);
      ctx.lineTo(7, -20);
      ctx.lineTo(16, 14);
      ctx.lineTo(-16, 14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();
    }

    // Pantalla OLED de lectura en vivo (esquina superior derecha)
    ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
    ctx.beginPath();
    ctx.roundRect(w - 150, 10, 138, 54, 10);
    ctx.fill();
    ctx.strokeStyle = ch.simColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
    ctx.fillText('SENSOR pH EN VIVO', w - 138, 25);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.fillText(`pH ${ch.simPh.toFixed(2)}`, w - 138, 50);
  }

  function handleCustomVideoUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (customVideoUrl) URL.revokeObjectURL(customVideoUrl);
    customVideoUrl = URL.createObjectURL(file);
  }

  function launchExperimentFromPage(presetId: string) {
    labSound.playBookClose();
    currentSpread = 0;
    setTimeout(() => {
      labStore.isExplorationMode = false;
      labStore.loadExperimentPreset(presetId);
    }, 360);
  }

  function equipCabinetComponentFromBook(compId: CabinetComponentInfo['id']) {
    labSound.playBookClose();
    currentSpread = 0;
    setTimeout(() => {
      labStore.isExplorationMode = false;
      labStore.isHomeBookOpen = false;
      labStore.selectCabinetComponent(compId);
    }, 360);
  }

  onDestroy(() => {
    stopVideoLoop();
    if (openAnimTimer) clearTimeout(openAnimTimer);
    if (turnFeedbackTimer) clearTimeout(turnFeedbackTimer);
    if (customVideoUrl) URL.revokeObjectURL(customVideoUrl);
  });
</script>

<svelte:window onkeydown={onKeyDown} />

{#if labStore.isHomeBookOpen}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex flex-col items-center justify-center p-2 sm:p-5 bg-black/82 backdrop-blur-md select-none"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    aria-labelledby="physical-book-title"
    onpointerdown={onBookPointerDown}
    onpointermove={onBookPointerMove}
    onpointerup={onBookPointerUp}
  >
    <!-- Barra superior flotante con saltos rápidos a Primaria, Secundaria, Mueble 3D y control de sonido -->
    <div class="w-full max-w-5xl mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-100/95 px-2">
      <div class="flex items-center gap-2">
        <BookOpen class="w-4 h-4 text-amber-400 shrink-0" />
        <span id="physical-book-title" class="font-bold tracking-wide">
          Manual Correlativo STEAM (Prolongo & Pinto · RSEQ) · Primaria y Secundaria
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onclick={() => goToSpread(1)}
          class="px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors {currentSpread >= 1 && currentSpread <= 4 ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-900/90 text-emerald-300 border-emerald-500/40 hover:bg-emerald-950'}"
        >
          🎒 Primaria (Págs. 2–9)
        </button>

        <button
          type="button"
          onclick={() => goToSpread(5)}
          class="px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors {currentSpread >= 5 && currentSpread <= 8 ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-900/90 text-indigo-300 border-indigo-500/40 hover:bg-indigo-950'}"
        >
          🔬 Secundaria (Págs. 10–17)
        </button>

        <button
          type="button"
          onclick={() => goToSpread(MAX_SPREAD)}
          class="px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors {currentSpread === MAX_SPREAD ? 'bg-amber-500 text-slate-950 border-amber-300' : 'bg-slate-900/90 text-amber-300 border-amber-500/40 hover:bg-amber-950'}"
        >
          🗄️ Mueble 3D (Pág. 18)
        </button>

        <button
          type="button"
          onclick={() => labStore.toggleSound()}
          class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-950/80 border border-amber-500/40 text-amber-200 hover:bg-amber-900/80 flex items-center gap-1 cursor-pointer"
          title="Activar o silenciar el sonido de las hojas al pasar de página"
        >
          {#if labStore.soundEnabled}
            <Volume2 class="w-3.5 h-3.5 text-amber-400" />
            <span class="hidden sm:inline">Sonido: ON</span>
          {:else}
            <VolumeX class="w-3.5 h-3.5 text-slate-400" />
            <span class="hidden sm:inline">Silenciado</span>
          {/if}
        </button>

        <span class="font-mono-numbers text-[11px] bg-slate-900/90 border border-slate-700 px-2.5 py-1 rounded-lg text-amber-300">
          {currentSpread === 0
            ? 'Portada'
            : `Págs. ${currentSpread * 2 - 1}–${currentSpread * 2} / ${MAX_SPREAD * 2}`}
        </span>

        <button
          type="button"
          onclick={closeBookWithAnimation}
          class="lab-btn bg-slate-900/90 hover:bg-rose-950 text-slate-200 hover:text-rose-200 border border-slate-700 px-3 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
        >
          <X class="w-4 h-4" />
          <span>Cerrar</span>
        </button>
      </div>
    </div>

    <input
      bind:this={fileInputEl}
      type="file"
      accept="video/mp4,video/webm"
      onchange={handleCustomVideoUpload}
      class="hidden"
    />

    <!-- ESCENARIO 3D DEL LIBRO REAL CON CANTO DE HOJAS Y ANIMACIÓN DE CURVATURA -->
    <div class="book-stage relative w-full max-w-5xl aspect-16/10 max-h-[83vh] {turningDirection ? `turning-${turningDirection}` : ''}">
      <!-- Cubierta trasera izquierda y canto de páginas apiladas -->
      <div
        class="book-back-board left-board"
        style="opacity: {currentSpread > 0 ? 1 : 0}; transition: opacity 400ms ease;"
      ></div>
      <!-- Cubierta trasera derecha y canto de páginas apiladas -->
      <div class="book-back-board right-board"></div>

      <!-- Lomo central cosido del libro -->
      <div
        class="book-spine"
        style="opacity: {currentSpread > 0 ? 1 : 0.45};"
      ></div>

      <!-- =========================================================================
           HOJA 0: PORTADA DURA (FRENTE) / PÁGINA 1: ÍNDICE GENERAL STEAM (REVERSO)
           ========================================================================= -->
      <div
        class="book-sheet"
        style={getSheetStyle(0)}
      >
        <!-- FRENTE DE HOJA 0: PORTADA DURA DEL LIBRO -->
        <div class="sheet-face sheet-front book-hardcover flex flex-col items-center justify-between p-8 text-center">
          <div class="w-full border-2 border-amber-400/50 rounded-2xl p-6 flex-1 flex flex-col items-center justify-between bg-gradient-to-br from-amber-950/70 via-slate-950/85 to-amber-950/70 shadow-inner">
            <div class="text-amber-300/90 text-xs font-bold tracking-[0.22em] uppercase">
              SymbioLab 2.0 · Edición STEAM (Prolongo & Pinto · RSEQ / Scientix)
            </div>

            <div class="my-auto flex flex-col items-center gap-3.5">
              <div class="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center shadow-lg">
                <FlaskConical class="w-10 h-10 text-amber-300" />
              </div>
              <h1 class="font-serif text-2xl sm:text-4xl font-extrabold text-amber-100 tracking-tight leading-tight">
                GRAN MANUAL DE<br />EXPERIMENTOS STEAM
              </h1>
              <div class="flex flex-wrap items-center justify-center gap-2">
                <span class="px-3 py-1 rounded-full bg-emerald-500/25 border border-emerald-400/50 text-emerald-200 text-xs font-bold">
                  🎒 4 Prácticas Primaria
                </span>
                <span class="px-3 py-1 rounded-full bg-indigo-500/25 border border-indigo-400/50 text-indigo-200 text-xs font-bold">
                  🔬 4 Prácticas Secundaria
                </span>
                <span class="px-3 py-1 rounded-full bg-amber-500/25 border border-amber-400/50 text-amber-200 text-xs font-bold">
                  🗄️ Mueble 3D Clasificado
                </span>
              </div>
              <p class="text-xs sm:text-sm text-amber-200/85 max-w-sm font-medium">
                Experimentos con materiales caseros y de laboratorio: Camaleón Redox con Chupa Chups, Antiburbujas LNP, Hielo en Salmuera, Complejos del Té y Cerámica Porosa
              </p>
            </div>

            <button
              type="button"
              onclick={() => goToSpread(1)}
              class="lab-btn px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-lg"
            >
              Abrir Libro →
            </button>
          </div>
        </div>

        <!-- REVERSO DE HOJA 0: PÁGINA 1 (ÍNDICE GENERAL DE LOS 8 EXPERIMENTOS + MUEBLE 3D) -->
        <div class="sheet-face sheet-back book-paper-left p-4 sm:p-5 flex flex-col justify-between">
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between border-b-2 border-amber-900/25 pb-1">
              <span class="text-[10px] font-bold uppercase tracking-widest text-amber-900">
                Índice Correlativo STEAM · 8 Experimentos
              </span>
              <span class="text-[10px] font-serif italic text-stone-600">Prolongo & Pinto (RSEQ / UPM)</span>
            </div>

            <!-- SECCIÓN PRIMARIA EN EL ÍNDICE (EXP 1 A 4) -->
            <div class="rounded-xl bg-emerald-950/10 border border-emerald-800/25 p-2 flex flex-col gap-1">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-extrabold text-emerald-900 uppercase tracking-wide">
                  🎒 Sección I · Nivel Primaria (Págs. 2–9)
                </span>
                <span class="text-[9px] font-bold bg-emerald-700 text-white px-2 py-0.5 rounded-full">Materiales Caseros</span>
              </div>

              {#each primariaPresets as p, idx}
                <button
                  type="button"
                  onclick={() => goToSpread(idx + 1)}
                  class="group text-left px-2 py-1 rounded-lg bg-white/85 hover:bg-emerald-50 border border-emerald-900/15 transition-all cursor-pointer flex items-center justify-between gap-2"
                >
                  <div class="truncate">
                    <span class="font-serif font-bold text-stone-900 text-[11px] group-hover:text-emerald-800">
                      Exp. {idx + 1} · {p.title}
                    </span>
                  </div>
                  <span class="font-mono-numbers font-bold text-[10px] text-emerald-900 shrink-0">
                    Pág. {(idx + 1) * 2}
                  </span>
                </button>
              {/each}
            </div>

            <!-- SECCIÓN SECUNDARIA EN EL ÍNDICE (EXP 5 A 8) -->
            <div class="rounded-xl bg-indigo-950/10 border border-indigo-800/25 p-2 flex flex-col gap-1">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-extrabold text-indigo-900 uppercase tracking-wide">
                  🔬 Sección II · Nivel Secundaria (Págs. 10–17)
                </span>
                <span class="text-[9px] font-bold bg-indigo-700 text-white px-2 py-0.5 rounded-full">Rigor Analítico y Redox</span>
              </div>

              {#each secundariaPresets as p, idx}
                {@const spreadNum = primariaPresets.length + idx + 1}
                <button
                  type="button"
                  onclick={() => goToSpread(spreadNum)}
                  class="group text-left px-2 py-1 rounded-lg bg-white/85 hover:bg-indigo-50 border border-indigo-900/15 transition-all cursor-pointer flex items-center justify-between gap-2"
                >
                  <div class="truncate">
                    <span class="font-serif font-bold text-stone-900 text-[11px] group-hover:text-indigo-800">
                      Exp. {spreadNum} · {p.title}
                    </span>
                  </div>
                  <span class="font-mono-numbers font-bold text-[10px] text-indigo-900 shrink-0">
                    Pág. {spreadNum * 2}
                  </span>
                </button>
              {/each}

              <button
                type="button"
                onclick={() => goToSpread(MAX_SPREAD)}
                class="group text-left px-2 py-1 rounded-lg bg-amber-900/15 hover:bg-amber-900/25 border border-amber-900/25 transition-all cursor-pointer flex items-center justify-between"
              >
                <span class="font-serif font-bold text-amber-950 text-[11px]">
                  🗄️ Anexo: Mueble 3D Clasificado de Componentes STEAM
                </span>
                <span class="font-mono-numbers font-bold text-[10px] text-amber-900">Pág. {MAX_SPREAD * 2}</span>
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between pt-1 border-t border-amber-900/15 text-[10px] text-stone-600">
            <span class="font-serif font-bold text-stone-800">Pág. 1</span>
            <span class="italic">Desliza o haz clic en las esquinas para hojear con sonido 🔊</span>
          </div>
        </div>
      </div>

      <!-- =========================================================================
           HOJAS 1..8: LOS 8 EXPERIMENTOS CORRELATIVOS (FRENTE = TEORÍA+VIDEO, REVERSO = PRÁCTICA)
           ========================================================================= -->
      {#each EXPERIMENT_PRESETS as preset, idx (preset.id)}
        {@const sheetIdx = idx + 1}
        {@const evenPage = sheetIdx * 2}
        {@const oddPage = evenPage + 1}
        {@const isPrimaria = preset.level === 'primaria'}
        {@const ch = getChapterForPreset(preset)}

        <div
          class="book-sheet"
          style={getSheetStyle(sheetIdx)}
        >
          <!-- FRENTE DE LA HOJA (PÁGINA PAR): FUNDAMENTO CIENTÍFICO, MATERIALES Y VIDEO SIMULADO -->
          <div class="sheet-face sheet-front book-paper-right p-4 sm:p-5 flex flex-col justify-between">
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between border-b-2 {isPrimaria ? 'border-emerald-900/25' : 'border-indigo-900/25'} pb-1">
                <span class="text-[10px] font-extrabold uppercase tracking-widest {isPrimaria ? 'text-emerald-800' : 'text-indigo-900'}">
                  {isPrimaria ? '🎒 Nivel Primaria' : '🔬 Nivel Secundaria'} · Experimento #{sheetIdx}
                </span>
                <span class="text-[10px] font-serif italic text-stone-600">{preset.gradeRange}</span>
              </div>

              <div>
                <h2 class="font-serif text-base sm:text-lg font-extrabold text-stone-900 leading-tight">
                  {preset.title}
                </h2>
                <p class="text-[11px] text-stone-700 mt-0.5 leading-snug">
                  {preset.summary}
                </p>
              </div>

              <!-- Materiales clasificados (disponibles en la mesa y en el Mueble 3D) -->
              <div class="grid grid-cols-2 gap-1.5">
                {#each preset.householdMaterials as item}
                  <div class="bg-white/85 border border-stone-300/80 rounded-lg p-1.5 flex items-center gap-1.5">
                    <span class="text-sm shrink-0">{item.icon}</span>
                    <div class="min-w-0">
                      <div class="text-[10px] font-bold text-stone-900 leading-tight truncate">{item.name}</div>
                      <div class="text-[9.5px] text-stone-600 leading-tight truncate">{item.role}</div>
                    </div>
                  </div>
                {/each}
              </div>

              <!-- Reproductor de Video Científico Integrado en la Página Par -->
              <div class="rounded-xl overflow-hidden border-2 border-stone-800 bg-slate-950 shadow-md">
                <div class="relative aspect-16/9 w-full">
                  {#if customVideoUrl}
                    <video src={customVideoUrl} controls class="w-full h-full object-cover">
                      <track kind="captions" />
                    </video>
                  {:else}
                    <canvas
                      bind:this={videoCanvases[preset.id]}
                      width="560"
                      height="315"
                      class="w-full h-full object-cover"
                    ></canvas>
                  {/if}
                  <div class="absolute bottom-1.5 left-2 right-2 bg-slate-950/90 px-2.5 py-1 rounded-lg border border-slate-700/80">
                    <div class="text-[10px] font-bold {isPrimaria ? 'text-emerald-400' : 'text-indigo-400'}">
                      {ch.title}
                    </div>
                    <p class="text-[9.5px] text-slate-200 leading-snug">{ch.caption}</p>
                  </div>
                </div>
                <div class="px-2.5 py-1 bg-stone-900 text-amber-100 flex items-center justify-between text-[10px]">
                  <div class="flex items-center gap-1.5">
                    <button
                      type="button"
                      onclick={togglePlay}
                      class="px-2 py-0.5 rounded {isPrimaria ? 'bg-emerald-500 text-slate-950' : 'bg-indigo-500 text-white'} font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {#if isPlaying}<Pause class="w-3 h-3" /> Pausar{:else}<Play class="w-3 h-3" /> Ver Video{/if}
                    </button>
                    <button
                      type="button"
                      onclick={restartVideo}
                      class="p-1 rounded bg-stone-800 hover:bg-stone-700 cursor-pointer"
                      title="Reiniciar demostración"
                    >
                      <RotateCcw class="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onclick={() => fileInputEl?.click()}
                    class="text-[10px] underline text-amber-300 cursor-pointer"
                  >
                    Subir MP4
                  </button>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between pt-1 border-t border-amber-900/15">
              <span class="text-[10px] text-stone-500 italic">Práctica y Reto en Pág. {oddPage} →</span>
              <button type="button" onclick={nextPage} class="page-corner-btn right-corner">
                <span>Pág. {evenPage} · Siguiente</span>
                <ChevronRight class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- REVERSO DE LA HOJA (PÁGINA IMPAR): PROTOCOLO PRÁCTICO, METAS EN VIVO Y EVALUACIÓN -->
          <div class="sheet-face sheet-back book-paper-left p-4 sm:p-5 flex flex-col justify-between">
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between border-b-2 {isPrimaria ? 'border-emerald-900/25' : 'border-indigo-900/25'} pb-1">
                <span class="text-[10px] font-extrabold uppercase tracking-widest {isPrimaria ? 'text-emerald-800' : 'text-indigo-900'}">
                  {isPrimaria ? '🎒 Primaria' : '🔬 Secundaria'} · Protocolo Práctico #{sheetIdx}
                </span>
                <span class="text-[10px] font-serif italic text-stone-600">{preset.subtitle}</span>
              </div>

              <!-- Principio Científico STEAM y cita a Prolongo & Pinto -->
              <div class="{isPrimaria ? 'bg-emerald-950/10 border-emerald-800/25' : 'bg-indigo-950/10 border-indigo-900/25'} border p-2 rounded-xl text-[11px] text-stone-800 leading-snug">
                <strong class="{isPrimaria ? 'text-emerald-950' : 'text-indigo-950'} block mb-0.5">
                  🔬 Fundamento Científico en tu Mesa y Mueble 3D:
                </strong>
                {preset.scientificPrinciple}
              </div>

              <!-- Metas interactivas verificadas en tiempo real con el vaso 3D -->
              <div class="flex flex-col gap-1">
                <span class="text-[10px] font-extrabold text-stone-900 uppercase tracking-wider">
                  ⭐ Pasos Experimentales en el Laboratorio 3D:
                </span>
                {#each preset.interactiveGoals as goal, i}
                  {@const done = labStore.activePresetId === preset.id && goal.checkFn(labStore.beaker)}
                  <div
                    class="p-2 rounded-xl border flex items-start gap-2 text-[11px]
                    {done
                      ? 'bg-emerald-100 border-emerald-600 text-emerald-950 font-semibold'
                      : 'bg-white/85 border-stone-300 text-stone-800'}"
                  >
                    <CheckCircle2 class="w-3.5 h-3.5 shrink-0 mt-0.5 {done ? 'text-emerald-700' : 'text-stone-400'}" />
                    <span><strong>Paso {i + 1}:</strong> {goal.description}</span>
                  </div>
                {/each}
              </div>

              <!-- Pregunta de Autoevaluación -->
              <div class="bg-amber-100/70 border border-amber-900/20 p-2 rounded-xl flex flex-col gap-1">
                <span class="text-[11px] font-bold text-amber-950">✍️ Autoevaluación STEAM:</span>
                <p class="text-[10.5px] text-stone-800 font-semibold leading-snug">{preset.quizQuestion.question}</p>
                {#each preset.quizQuestion.options as opt, qIdx}
                  {@const picked = quizAnswers[preset.id] === qIdx}
                  {@const isOk = qIdx === preset.quizQuestion.correctIndex}
                  <button
                    type="button"
                    onclick={() => (quizAnswers[preset.id] = qIdx)}
                    class="text-left px-2 py-1 rounded-lg border text-[10.5px] cursor-pointer flex justify-between items-center gap-1
                    {picked
                      ? isOk
                        ? 'bg-emerald-700 text-white border-emerald-800 font-bold'
                        : 'bg-rose-700 text-white border-rose-800 font-bold'
                      : 'bg-white/90 border-stone-300 text-stone-800 hover:bg-amber-50'}"
                  >
                    <span class="leading-tight">{opt}</span>
                    {#if picked}<span>{isOk ? '✓' : '✗'}</span>{/if}
                  </button>
                {/each}
              </div>

              <button
                type="button"
                onclick={() => launchExperimentFromPage(preset.id)}
                class="lab-btn w-full py-2 px-3 rounded-xl {isPrimaria ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-indigo-700 hover:bg-indigo-600'} text-white font-extrabold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <FlaskConical class="w-4 h-4 shrink-0" />
                <span>¡Equipar Laboratorio y Mueble 3D para este Experimento!</span>
              </button>
            </div>

            <div class="flex items-center justify-between pt-1 border-t border-amber-900/15">
              <button type="button" onclick={prevPage} class="page-corner-btn left-corner">
                <ChevronLeft class="w-4 h-4" />
                <span>Anterior · Pág. {oddPage}</span>
              </button>
              <span class="text-[10px] text-stone-500 italic">
                {sheetIdx < EXPERIMENT_PRESETS.length
                  ? `Sigue Exp. #${sheetIdx + 1} en Pág. ${oddPage + 1} →`
                  : `Catálogo Mueble 3D en Pág. ${oddPage + 1} →`}
              </span>
            </div>
          </div>
        </div>
      {/each}

      <!-- =========================================================================
           HOJA 9: PÁGINA 18 (CATÁLOGO DEL MUEBLE 3D CLASIFICADO DE COMPONENTES STEAM)
           ========================================================================= -->
      <div
        class="book-sheet"
        style={getSheetStyle(MAX_SPREAD)}
      >
        <div class="sheet-face sheet-front book-paper-right p-4 sm:p-5 flex flex-col justify-between">
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between border-b-2 border-amber-900/25 pb-1">
              <span class="text-[10px] font-extrabold uppercase tracking-widest text-amber-900 flex items-center gap-1">
                <Package class="w-3.5 h-3.5" />
                Mueble 3D Clasificado de Componentes STEAM
              </span>
              <span class="text-[10px] font-serif italic text-stone-600">Estantería Derecha del Laboratorio</span>
            </div>

            <div>
              <h2 class="font-serif text-base sm:text-lg font-extrabold text-stone-900 leading-tight">
                Componentes Clasificados y Nombrados en el Mueble 3D
              </h2>
              <p class="text-[10.5px] text-stone-700">
                Haz clic en cualquier componente aquí o directamente en las 3 repisas del <strong>Mueble Clasificador 3D</strong> situado a la derecha de la mesa para cargarlo en tu experimento:
              </p>
            </div>

            <div class="grid grid-cols-1 gap-1.5 overflow-y-auto max-h-[52vh] pr-1">
              {#each CABINET_COMPONENTS as comp}
                <div class="bg-white/90 border border-stone-300 rounded-xl p-2 flex items-start justify-between gap-2 shadow-xs">
                  <div class="flex items-start gap-2 min-w-0">
                    <span class="text-lg shrink-0 mt-0.5">{comp.icon}</span>
                    <div class="text-[10.5px] leading-snug">
                      <div class="font-bold text-stone-900 flex flex-wrap items-center gap-1">
                        <span>{comp.name}</span>
                        <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          Estante {comp.shelfIndex + 1}: {comp.formulaOrSpec}
                        </span>
                      </div>
                      <p class="text-stone-700 mt-0.5">{comp.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onclick={() => equipCabinetComponentFromBook(comp.id)}
                    class="shrink-0 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider cursor-pointer shadow-xs"
                  >
                    Usar en 3D
                  </button>
                </div>
              {/each}

              <!-- Resumen rápido de instrumentos de escala real -->
              <div class="mt-1 pt-1.5 border-t border-stone-300">
                <div class="text-[10px] font-extrabold uppercase tracking-wider text-stone-700 mb-1">
                  🛠️ Instrumentos de Escala Real en la Mesa Principal:
                </div>
                {#each Object.values(LAB_TOOLS_CATALOG) as tool}
                  <div class="bg-stone-100/90 border border-stone-300/80 rounded-lg p-1.5 mb-1 flex items-center gap-2 text-[10px]">
                    <span class="text-base">{tool.icon}</span>
                    <div>
                      <strong class="text-stone-900">{tool.name}</strong> ({tool.levelBadge})
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-1.5 border-t border-amber-900/15">
            <button
              type="button"
              onclick={() => goToSpread(1)}
              class="text-xs font-bold text-amber-900 hover:underline cursor-pointer"
            >
              ← Volver al Índice General (Pág. 1)
            </button>
            <span class="font-serif font-bold text-xs text-stone-800">Pág. {MAX_SPREAD * 2} · Fin del Manual</span>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Escenario 3D con perspectiva profunda y sombras realistas */
  .book-stage {
    perspective: 2600px;
    transform-style: preserve-3d;
  }

  /* Tapas traseras de cuero con cantos de hojas apiladas (situadas físicamente detrás en Z) */
  .book-back-board {
    position: absolute;
    top: -1.5%;
    bottom: -1.5%;
    width: 50.8%;
    background: linear-gradient(145deg, #451a03 0%, #270e02 55%, #1c0a01 100%);
    border: 3px solid #92400e;
    box-shadow: 0 28px 65px rgba(0, 0, 0, 0.85);
    transform: translateZ(-22px);
    z-index: 1;
  }

  .book-back-board.left-board {
    left: -0.8%;
    border-radius: 18px 4px 4px 18px;
    box-shadow:
      inset 10px 0 0 #fef3c7,
      inset 13px 0 0 #d6d3d1,
      inset 16px 0 0 #fef3c7,
      0 28px 65px rgba(0, 0, 0, 0.85);
  }

  .book-back-board.right-board {
    right: -0.8%;
    border-radius: 4px 18px 18px 4px;
    box-shadow:
      inset -10px 0 0 #fef3c7,
      inset -13px 0 0 #d6d3d1,
      inset -16px 0 0 #fef3c7,
      0 28px 65px rgba(0, 0, 0, 0.85);
  }

  /* Lomo central cosido (detrás del eje de giro de las hojas para no atravesarlas) */
  .book-spine {
    position: absolute;
    top: -1.8%;
    bottom: -1.8%;
    left: calc(50% - 14px);
    width: 28px;
    background: linear-gradient(90deg, #1c0a01 0%, #78350f 30%, #b45309 50%, #78350f 70%, #1c0a01 100%);
    border-radius: 6px;
    transform: translateZ(-18px);
    z-index: 5;
    box-shadow: 0 0 24px rgba(0, 0, 0, 0.85);
    pointer-events: none;
  }

  /* Cada hoja física ocupa la mitad derecha y gira -180deg sin 'filter' que aplane preserve-3d */
  .book-sheet {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 50%;
    transform-origin: left center;
    transform-style: preserve-3d;
    transition: transform 720ms cubic-bezier(0.34, 0.08, 0.18, 1);
    will-change: transform;
  }

  /* Caras delantera (derecha) y trasera (izquierda) separadas ±0.8px en Z para evitar z-fighting */
  .sheet-face {
    position: absolute;
    inset: 0;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    overflow: hidden;
  }

  .sheet-front {
    transform: rotateY(0deg) translateZ(0.8px);
    border-radius: 3px 14px 14px 3px;
  }

  .sheet-back {
    transform: rotateY(180deg) translateZ(0.8px);
    border-radius: 14px 3px 3px 14px;
  }

  /* Portada dura de cuero repujado */
  .book-hardcover {
    background: radial-gradient(circle at 30% 25%, #78350f 0%, #451a03 55%, #1c0a01 100%);
    border: 3px solid #b45309;
    box-shadow:
      inset 0 0 35px rgba(0, 0, 0, 0.8),
      -10px 0 25px rgba(0, 0, 0, 0.6);
  }

  /* Papel pergamino cálido 100% opaco con sombreado suave hacia el pliegue central */
  .book-paper-right {
    background-color: #fdf8e7;
    background-image: linear-gradient(90deg, #dfd0b5 0%, #f2e8d2 5%, #fdf8e7 12%, #fefce8 92%, #f3e6ca 100%);
    border-right: 4px solid #d6c7a7;
    border-top: 1px solid #e7dcc3;
    border-bottom: 2px solid #cbb994;
    box-shadow: inset 12px 0 18px -10px rgba(69, 26, 3, 0.22);
  }

  .book-paper-left {
    background-color: #fdf8e7;
    background-image: linear-gradient(-90deg, #dfd0b5 0%, #f2e8d2 5%, #fdf8e7 12%, #fefce8 92%, #f3e6ca 100%);
    border-left: 4px solid #d6c7a7;
    border-top: 1px solid #e7dcc3;
    border-bottom: 2px solid #cbb994;
    box-shadow: inset -12px 0 18px -10px rgba(69, 26, 3, 0.22);
  }

  /* Esquinas inferiores interactivas con efecto de pliegue de hoja */
  .page-corner-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.35rem 0.78rem;
    border-radius: 0.65rem;
    background: linear-gradient(135deg, rgba(180, 83, 9, 0.14) 0%, rgba(180, 83, 9, 0.28) 100%);
    color: #78350f;
    font-family: 'Outfit', sans-serif;
    font-weight: 800;
    font-size: 0.7rem;
    border: 1px solid rgba(180, 83, 9, 0.35);
    cursor: pointer;
    transition: all 180ms ease;
    box-shadow: 0 2px 6px rgba(69, 26, 3, 0.12);
  }

  .page-corner-btn.right-corner:hover {
    background: rgba(180, 83, 9, 0.32);
    transform: translate(-3px, -2px) rotate(-1.5deg);
    box-shadow: 4px 4px 10px rgba(69, 26, 3, 0.22);
  }

  .page-corner-btn.left-corner:hover {
    background: rgba(180, 83, 9, 0.32);
    transform: translate(3px, -2px) rotate(1.5deg);
    box-shadow: -4px 4px 10px rgba(69, 26, 3, 0.22);
  }
</style>
