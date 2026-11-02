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
    Check,
    FlaskConical,
    Upload,
    X,
    ChevronLeft,
    ChevronRight,
    Volume2,
    VolumeX,
    ArrowUpRight
  } from '@lucide/svelte';

  /**
   * Estructura física del Libro 3D Correlativo (Estilo Editorial Apple Books / Taschen):
   * - Hoja 0 (Sheet 0): Frente = Portada Editorial | Reverso = Página 1 (Índice General Correlativo: 8 Experimentos + Estantería 3D)
   * - Hojas 1..8 (Sheets 1..8):
   *    - Frente = Página par (2, 4, 6, 8, 10, 12, 14, 16): Fundamento STEAM, Materiales Clasificados y Video Demostrativo
   *    - Reverso = Página impar (3, 5, 7, 9, 11, 13, 15, 17): Protocolo en el Laboratorio 3D, Evaluación y Botón Equipar
   * - Hoja 9 (Sheet 9):
   *    - Frente = Página 18: Guía de la Estantería 3D Clasificada STEAM e Instrumentación de Escala Real
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

    // Fondo de estudio oscuro estilo Apple Keynote
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#090a0f');
    bgGrad.addColorStop(1, '#12151e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Superficie de mesa minimalista
    ctx.fillStyle = '#181c26';
    ctx.fillRect(0, h - 48, w, 48);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h - 48);
    ctx.lineTo(w, h - 48);
    ctx.stroke();

    // Píldora superior izquierda sin emojis (estilo Apple visionOS)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(14, 12, 195, 26, 13);
    ctx.fill();

    ctx.fillStyle = preset.acidReagent.colorHex;
    ctx.beginPath();
    ctx.arc(27, 25, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f5f5f7';
    ctx.font = '600 10.5px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
    ctx.fillText(
      preset.steamEffect !== 'none'
        ? `${preset.level === 'primaria' ? 'PRIMARIA' : 'SECUNDARIA'} · STEAM RSEQ`
        : preset.level === 'primaria'
          ? 'NIVEL PRIMARIA'
          : 'NIVEL SECUNDARIA',
      38,
      29
    );

    // Base del Agitador Magnético bajo el vaso
    const cx = w * 0.5;
    const plateY = h - 60;
    ctx.fillStyle = '#2c3240';
    ctx.beginPath();
    ctx.roundRect(cx - 64, plateY, 128, 13, 6);
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

    // Efectos visuales específicos de los experimentos STEAM
    if (preset.steamEffect === 'chupachups') {
      const candyX = cx + Math.sin(videoTimeSec * 8) * 6;
      const candyY = by + bh - liqH * 0.55;
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(cx, by - 26);
      ctx.lineTo(candyX, candyY);
      ctx.stroke();

      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(candyX, candyY, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fecdd3';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.strokeStyle = ch.simColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(candyX, candyY, 16 + Math.sin(videoTimeSec * 6) * 4, 0, Math.PI * 1.4);
      ctx.stroke();
    } else if (preset.steamEffect === 'antibubbles') {
      const syrupGrad = ctx.createLinearGradient(0, by + bh - 34, 0, by + bh);
      syrupGrad.addColorStop(0, 'rgba(245, 158, 11, 0.15)');
      syrupGrad.addColorStop(1, 'rgba(217, 119, 6, 0.72)');
      ctx.fillStyle = syrupGrad;
      ctx.beginPath();
      ctx.roundRect(bx + 4, by + bh - 34, bw - 8, 31, [0, 0, 10, 10]);
      ctx.fill();

      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx + 8, by - 25);
      ctx.lineTo(cx + 2, by + bh - liqH + 6);
      ctx.stroke();

      for (let i = 0; i < 5; i++) {
        const abX = bx + 22 + ((i * 15) % (bw - 40));
        const abY =
          by +
          bh -
          28 -
          ((Math.sin(videoTimeSec * 2.2 + i * 1.3) * 0.5 + 0.5) * Math.max(18, liqH - 36));
        const radius = 5.5 + (i % 2) * 2;
        ctx.fillStyle = i % 2 === 0 ? '#0284c7' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(abX, abY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f0f9ff';
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }
    } else if (preset.steamEffect === 'ice_convection') {
      const iceY = by + bh - liqH - 4;
      ctx.fillStyle = 'rgba(225, 29, 72, 0.82)';
      ctx.strokeStyle = '#ffe4e6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx - 16, iceY, 32, 18, 4);
      ctx.fill();
      ctx.stroke();

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
        ctx.fillStyle = 'rgba(225, 29, 72, 0.72)';
        ctx.fillRect(bx + 5, by + bh - liqH + 2, bw - 10, 12);
      }
    } else if (preset.steamEffect === 'tea_complex') {
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
      const botX = bx - 54;
      const botY = plateY - 42;
      ctx.fillStyle = '#c2410c';
      ctx.strokeStyle = '#fdba74';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(botX, botY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
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
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx + 16, by - 20);
    ctx.lineTo(bx + 16, by + bh - 16);
    ctx.stroke();

    // Contorno de cristal borosilicato y marcas volumétricas
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.88)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, [2, 2, 12, 12]);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '600 8.5px "SF Mono", "JetBrains Mono", monospace';
    [50, 150, 250].forEach((ml, idx) => {
      const my = by + bh - 24 - idx * 33;
      ctx.fillRect(bx + bw - 20, my, 10, 1.2);
      ctx.fillText(`${ml}`, bx + bw - 40, my + 3);
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
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
    }

    // Píldora de telemetría pH estilo Dynamic Island (esquina superior derecha)
    ctx.fillStyle = 'rgba(14, 14, 18, 0.88)';
    ctx.beginPath();
    ctx.roundRect(w - 134, 10, 120, 44, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = ch.simColor;
    ctx.beginPath();
    ctx.arc(w - 118, 32, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '600 9px "SF Mono", "JetBrains Mono", monospace';
    ctx.fillText('pH EN VIVO', w - 106, 24);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 16px "SF Mono", "JetBrains Mono", monospace';
    ctx.fillText(ch.simPh.toFixed(2), w - 106, 42);
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
    class="fixed inset-0 z-50 flex flex-col items-center justify-center p-2 sm:p-5 bg-black/80 backdrop-blur-xl select-none"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    aria-labelledby="physical-book-title"
    onpointerdown={onBookPointerDown}
    onpointermove={onBookPointerMove}
    onpointerup={onBookPointerUp}
  >
    <!-- =========================================================================
         BARRA DE NAVEGACIÓN FLOTANTE DEL LIBRO (ESTILO APPLE BOOKS / VISIONOS)
         ========================================================================= -->
    <div class="w-full max-w-4xl mb-3 flex items-center justify-between gap-2 apple-island rounded-full px-3.5 py-1.5">
      <div class="flex items-center gap-2.5 min-w-0 pl-1">
        <BookOpen class="w-4 h-4 text-white/75 shrink-0" />
        <span id="physical-book-title" class="text-xs font-semibold tracking-[-0.015em] text-white truncate">
          Manual Experimental SymbioLab
        </span>
        <span class="font-mono-numbers text-[11px] text-white/45 hidden sm:inline">
          {currentSpread === 0
            ? 'Portada'
            : `Págs. ${currentSpread * 2 - 1}–${currentSpread * 2} de ${MAX_SPREAD * 2}`}
        </span>
      </div>

      <!-- Control segmentado estilo Apple Books para saltar entre secciones -->
      <div class="flex items-center bg-white/[0.07] p-0.5 rounded-full border border-white/[0.08]">
        <button
          type="button"
          onclick={() => goToSpread(1)}
          class="lab-btn px-3 py-1 rounded-full text-[11px] font-medium cursor-pointer {currentSpread >= 1 && currentSpread <= 4
            ? 'bg-white text-black font-semibold shadow-xs'
            : 'text-white/65 hover:text-white'}"
        >
          Primaria
        </button>
        <button
          type="button"
          onclick={() => goToSpread(5)}
          class="lab-btn px-3 py-1 rounded-full text-[11px] font-medium cursor-pointer {currentSpread >= 5 && currentSpread <= 8
            ? 'bg-white text-black font-semibold shadow-xs'
            : 'text-white/65 hover:text-white'}"
        >
          Secundaria
        </button>
        <button
          type="button"
          onclick={() => goToSpread(MAX_SPREAD)}
          class="lab-btn px-3 py-1 rounded-full text-[11px] font-medium cursor-pointer {currentSpread === MAX_SPREAD
            ? 'bg-white text-black font-semibold shadow-xs'
            : 'text-white/65 hover:text-white'}"
        >
          Estantería 3D
        </button>
      </div>

      <div class="flex items-center gap-1.5">
        <button
          type="button"
          onclick={() => labStore.toggleSound()}
          class="lab-btn w-7 h-7 rounded-full bg-white/[0.07] hover:bg-white/[0.14] flex items-center justify-center text-white/75 hover:text-white cursor-pointer"
          title={labStore.soundEnabled ? 'Sonido de páginas activado' : 'Sonido de páginas silenciado'}
          aria-label="Alternar sonido de páginas"
        >
          {#if labStore.soundEnabled}
            <Volume2 class="w-3.5 h-3.5" />
          {:else}
            <VolumeX class="w-3.5 h-3.5 text-white/40" />
          {/if}
        </button>

        <button
          type="button"
          onclick={closeBookWithAnimation}
          class="lab-btn w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.18] flex items-center justify-center text-white/80 hover:text-white cursor-pointer"
          title="Cerrar manual (Esc)"
          aria-label="Cerrar manual"
        >
          <X class="w-3.5 h-3.5" />
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
    <div class="book-stage relative w-full max-w-5xl aspect-16/10 max-h-[82vh] {turningDirection ? `turning-${turningDirection}` : ''}">
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
           HOJA 0: PORTADA DURA EDITORIAL (FRENTE) / PÁGINA 1: ÍNDICE GENERAL (REVERSO)
           ========================================================================= -->
      <div
        class="book-sheet"
        style={getSheetStyle(0)}
      >
        <!-- FRENTE DE HOJA 0: PORTADA DURA ESTILO MONOGRAFÍA APPLE / TASCHEN -->
        <div class="sheet-face sheet-front book-hardcover flex flex-col justify-between p-8 sm:p-10 text-left">
          <div class="w-full h-full border border-white/12 rounded-2xl p-6 sm:p-8 flex flex-col justify-between bg-gradient-to-b from-white/[0.03] to-transparent">
            <div class="flex items-center justify-between border-b border-white/10 pb-4">
              <span class="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/55">
                SymbioLab Press · Edición STEAM
              </span>
              <span class="font-mono-numbers text-[10px] text-white/40">
                RSEQ / Scientix
              </span>
            </div>

            <div class="my-auto flex flex-col gap-4">
              <div class="w-12 h-12 rounded-2xl bg-white/[0.07] border border-white/15 flex items-center justify-center">
                <FlaskConical class="w-6 h-6 text-white/90" />
              </div>

              <div>
                <p class="text-xs font-medium text-white/50 tracking-wide mb-1">
                  Monografía Interactiva de Laboratorio
                </p>
                <h1 class="text-2xl sm:text-4xl font-semibold text-white tracking-[-0.03em] leading-[1.1]">
                  Manual de Ciencias<br />y Experimentación
                </h1>
              </div>

              <p class="text-xs sm:text-[13px] text-white/60 max-w-sm leading-relaxed">
                Ocho prácticas correlativas de Primaria y Secundaria basadas en materiales cotidianos, reacciones redox, termodinámica y química analítica.
              </p>

              <div class="flex flex-wrap items-center gap-1.5 pt-1">
                <span class="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white/75 text-[10px] font-medium">
                  01–04 Primaria
                </span>
                <span class="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white/75 text-[10px] font-medium">
                  05–08 Secundaria
                </span>
                <span class="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white/75 text-[10px] font-medium">
                  Estantería 3D
                </span>
              </div>
            </div>

            <div class="flex items-center justify-between pt-4 border-t border-white/10">
              <span class="text-[11px] text-white/45">
                18 páginas correlativas
              </span>
              <button
                type="button"
                onclick={() => goToSpread(1)}
                class="lab-btn px-5 py-2 rounded-full bg-white hover:bg-white/90 text-black font-semibold text-xs tracking-[-0.01em] cursor-pointer shadow-md"
              >
                Abrir Manual →
              </button>
            </div>
          </div>
        </div>

        <!-- REVERSO DE HOJA 0: PÁGINA 1 (ÍNDICE EDITORIAL CORRELATIVO) -->
        <div class="sheet-face sheet-back book-paper-left p-5 sm:p-6 flex flex-col justify-between">
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between border-b border-stone-900/12 pb-2">
              <span class="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                Índice General
              </span>
              <span class="text-[10px] font-medium text-stone-400">
                Prolongo & Pinto · RSEQ
              </span>
            </div>

            <!-- SECCIÓN PRIMARIA EN EL ÍNDICE (EXP 01 A 04) -->
            <div class="flex flex-col gap-1">
              <div class="flex items-center justify-between py-0.5">
                <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500">
                  I · Nivel Primaria (Págs. 02–09)
                </span>
                <span class="text-[10px] text-stone-400">3.° a 6.° Grado</span>
              </div>

              {#each primariaPresets as p, idx}
                <button
                  type="button"
                  onclick={() => goToSpread(idx + 1)}
                  class="group text-left px-2.5 py-1.5 rounded-xl bg-stone-900/[0.03] hover:bg-stone-900/[0.08] border border-stone-900/[0.06] transition-colors cursor-pointer flex items-center justify-between gap-2"
                >
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span class="font-mono-numbers text-[10px] font-semibold text-stone-400">
                      0{idx + 1}
                    </span>
                    <span
                      class="w-2 h-2 rounded-full shrink-0"
                      style="background-color: {p.acidReagent.colorHex};"
                    ></span>
                    <span class="font-semibold text-stone-900 text-xs truncate group-hover:text-black">
                      {p.title}
                    </span>
                  </div>
                  <span class="font-mono-numbers text-[11px] font-medium text-stone-500 shrink-0">
                    Pág. 0{(idx + 1) * 2}
                  </span>
                </button>
              {/each}
            </div>

            <!-- SECCIÓN SECUNDARIA EN EL ÍNDICE (EXP 05 A 08) -->
            <div class="flex flex-col gap-1 pt-1">
              <div class="flex items-center justify-between py-0.5">
                <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500">
                  II · Nivel Secundaria (Págs. 10–17)
                </span>
                <span class="text-[10px] text-stone-400">1.° a 5.° Secundaria</span>
              </div>

              {#each secundariaPresets as p, idx}
                {@const spreadNum = primariaPresets.length + idx + 1}
                <button
                  type="button"
                  onclick={() => goToSpread(spreadNum)}
                  class="group text-left px-2.5 py-1.5 rounded-xl bg-stone-900/[0.03] hover:bg-stone-900/[0.08] border border-stone-900/[0.06] transition-colors cursor-pointer flex items-center justify-between gap-2"
                >
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span class="font-mono-numbers text-[10px] font-semibold text-stone-400">
                      0{spreadNum}
                    </span>
                    <span
                      class="w-2 h-2 rounded-full shrink-0"
                      style="background-color: {p.acidReagent.colorHex};"
                    ></span>
                    <span class="font-semibold text-stone-900 text-xs truncate group-hover:text-black">
                      {p.title}
                    </span>
                  </div>
                  <span class="font-mono-numbers text-[11px] font-medium text-stone-500 shrink-0">
                    Pág. {spreadNum * 2}
                  </span>
                </button>
              {/each}

              <button
                type="button"
                onclick={() => goToSpread(MAX_SPREAD)}
                class="group text-left px-2.5 py-1.5 mt-0.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 transition-colors cursor-pointer flex items-center justify-between"
              >
                <span class="font-medium text-xs">
                  III · Catálogo de la Estantería 3D STEAM
                </span>
                <span class="font-mono-numbers text-[11px] text-white/70">Pág. {MAX_SPREAD * 2}</span>
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-stone-900/10 text-[10px] text-stone-500">
            <span class="font-mono-numbers font-semibold text-stone-700">01</span>
            <span>Desliza o pulsa las esquinas para pasar de hoja</span>
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
          <div class="sheet-face sheet-front book-paper-right p-5 sm:p-6 flex flex-col justify-between">
            <div class="flex flex-col gap-2.5">
              <!-- Encabezado editorial limpio -->
              <div class="flex items-center justify-between border-b border-stone-900/12 pb-1.5">
                <div class="flex items-center gap-2">
                  <span
                    class="w-2 h-2 rounded-full"
                    style="background-color: {preset.acidReagent.colorHex};"
                  ></span>
                  <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
                    {isPrimaria ? 'Sección I · Primaria' : 'Sección II · Secundaria'} · Práctica 0{sheetIdx}
                  </span>
                </div>
                <span class="text-[10px] font-medium text-stone-400">{preset.gradeRange}</span>
              </div>

              <div>
                <h2 class="text-base sm:text-lg font-semibold tracking-[-0.02em] text-stone-950 leading-snug">
                  {preset.title}
                </h2>
                <p class="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                  {preset.summary}
                </p>
              </div>

              <!-- Materiales clasificados (diseño limpio sin emojis) -->
              <div class="grid grid-cols-2 gap-1.5">
                {#each preset.householdMaterials as item, mIdx}
                  <div class="bg-stone-900/[0.035] border border-stone-900/[0.07] rounded-xl px-2.5 py-1.5 flex items-center gap-2">
                    <span class="font-mono-numbers text-[10px] font-semibold text-stone-400 shrink-0">
                      0{mIdx + 1}
                    </span>
                    <div class="min-w-0">
                      <div class="text-[11px] font-semibold text-stone-900 leading-tight truncate">
                        {item.name}
                      </div>
                      <div class="text-[9.5px] text-stone-500 leading-tight truncate">
                        {item.role}
                      </div>
                    </div>
                  </div>
                {/each}
              </div>

              <!-- Reproductor de Video Científico estilo Apple Keynote -->
              <div class="rounded-2xl overflow-hidden border border-stone-900/15 bg-[#090a0f] shadow-md">
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
                  <div class="absolute bottom-2 left-2.5 right-2.5 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                    <div class="text-[10px] font-semibold text-white">
                      {ch.title}
                    </div>
                    <p class="text-[9.5px] text-white/70 leading-snug">{ch.caption}</p>
                  </div>
                </div>
                <div class="px-3 py-1.5 bg-[#121318] text-white flex items-center justify-between text-[10px]">
                  <div class="flex items-center gap-1.5">
                    <button
                      type="button"
                      onclick={togglePlay}
                      class="lab-btn px-2.5 py-1 rounded-full bg-white text-black font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {#if isPlaying}<Pause class="w-3 h-3" /> Pausar{:else}<Play class="w-3 h-3" /> Reproducir{/if}
                    </button>
                    <button
                      type="button"
                      onclick={restartVideo}
                      class="lab-btn w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                      title="Reiniciar demostración"
                    >
                      <RotateCcw class="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onclick={() => fileInputEl?.click()}
                    class="text-[10px] font-medium text-white/60 hover:text-white cursor-pointer flex items-center gap-1"
                  >
                    <Upload class="w-3 h-3" /> Subir MP4
                  </button>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between pt-1.5 border-t border-stone-900/10">
              <span class="font-mono-numbers text-[11px] font-semibold text-stone-700">
                {evenPage < 10 ? `0${evenPage}` : evenPage}
              </span>
              <button type="button" onclick={nextPage} class="page-corner-btn right-corner">
                <span>Protocolo · Pág. {oddPage < 10 ? `0${oddPage}` : oddPage}</span>
                <ChevronRight class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- REVERSO DE LA HOJA (PÁGINA IMPAR): PROTOCOLO PRÁCTICO, METAS EN VIVO Y EVALUACIÓN -->
          <div class="sheet-face sheet-back book-paper-left p-5 sm:p-6 flex flex-col justify-between">
            <div class="flex flex-col gap-2.5">
              <div class="flex items-center justify-between border-b border-stone-900/12 pb-1.5">
                <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
                  Protocolo Experimental · 0{sheetIdx}
                </span>
                <span class="text-[10px] font-medium text-stone-400 truncate max-w-[180px]">
                  {preset.subtitle}
                </span>
              </div>

              <!-- Fundamento Científico STEAM -->
              <div class="bg-stone-900/[0.04] border border-stone-900/[0.08] p-3 rounded-2xl text-[11px] text-stone-700 leading-relaxed">
                <span class="text-[10px] font-bold uppercase tracking-wider text-stone-900 block mb-0.5">
                  Fundamento Científico
                </span>
                {preset.scientificPrinciple}
              </div>

              <!-- Metas interactivas verificadas en tiempo real con el vaso 3D -->
              <div class="flex flex-col gap-1.5">
                <span class="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  Secuencia de Laboratorio
                </span>
                {#each preset.interactiveGoals as goal, i}
                  {@const done = labStore.activePresetId === preset.id && goal.checkFn(labStore.beaker)}
                  <div
                    class="px-3 py-2 rounded-xl border flex items-start gap-2.5 text-[11px] transition-colors
                    {done
                      ? 'bg-emerald-950/[0.08] border-emerald-700/35 text-stone-950 font-medium'
                      : 'bg-white/75 border-stone-900/10 text-stone-700'}"
                  >
                    <span
                      class="w-4 h-4 rounded-full shrink-0 mt-0.5 flex items-center justify-center text-[10px] {done
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-900/10 text-stone-600 font-mono-numbers font-semibold'}"
                    >
                      {#if done}
                        <Check class="w-2.5 h-2.5 stroke-[3]" />
                      {:else}
                        {i + 1}
                      {/if}
                    </span>
                    <span class="leading-snug">{goal.description}</span>
                  </div>
                {/each}
              </div>

              <!-- Pregunta de Autoevaluación -->
              <div class="bg-stone-900/[0.035] border border-stone-900/[0.08] p-3 rounded-2xl flex flex-col gap-1.5">
                <span class="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Verificación de Concepto
                </span>
                <p class="text-[11px] text-stone-900 font-semibold leading-snug">
                  {preset.quizQuestion.question}
                </p>
                <div class="flex flex-col gap-1 pt-0.5">
                  {#each preset.quizQuestion.options as opt, qIdx}
                    {@const picked = quizAnswers[preset.id] === qIdx}
                    {@const isOk = qIdx === preset.quizQuestion.correctIndex}
                    <button
                      type="button"
                      onclick={() => (quizAnswers[preset.id] = qIdx)}
                      class="text-left px-2.5 py-1.5 rounded-xl border text-[10.5px] cursor-pointer flex justify-between items-center gap-2 transition-colors
                      {picked
                        ? isOk
                          ? 'bg-stone-900 text-white border-stone-900 font-semibold'
                          : 'bg-rose-900 text-white border-rose-900 font-semibold'
                        : 'bg-white/85 border-stone-900/10 text-stone-700 hover:bg-white'}"
                    >
                      <span class="leading-tight">{opt}</span>
                      {#if picked}
                        <span class="text-[10px] font-mono-numbers shrink-0">
                          {isOk ? 'Correcto' : 'Revisar'}
                        </span>
                      {/if}
                    </button>
                  {/each}
                </div>
              </div>

              <button
                type="button"
                onclick={() => launchExperimentFromPage(preset.id)}
                class="lab-btn w-full py-2.5 px-4 rounded-full bg-stone-950 hover:bg-stone-800 text-white font-semibold text-xs tracking-[-0.01em] flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Equipar práctica en el laboratorio 3D</span>
                <ArrowUpRight class="w-3.5 h-3.5" />
              </button>
            </div>

            <div class="flex items-center justify-between pt-1.5 border-t border-stone-900/10">
              <button type="button" onclick={prevPage} class="page-corner-btn left-corner">
                <ChevronLeft class="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
              <span class="font-mono-numbers text-[11px] font-semibold text-stone-700">
                {oddPage < 10 ? `0${oddPage}` : oddPage}
              </span>
            </div>
          </div>
        </div>
      {/each}

      <!-- =========================================================================
           HOJA 9: PÁGINA 18 (CATÁLOGO DE LA ESTANTERÍA 3D CLASIFICADA DE COMPONENTES STEAM)
           ========================================================================= -->
      <div
        class="book-sheet"
        style={getSheetStyle(MAX_SPREAD)}
      >
        <div class="sheet-face sheet-front book-paper-right p-5 sm:p-6 flex flex-col justify-between">
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center justify-between border-b border-stone-900/12 pb-1.5">
              <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
                Anexo III · Estantería 3D STEAM
              </span>
              <span class="text-[10px] font-medium text-stone-400">
                9 Componentes Clasificados
              </span>
            </div>

            <div>
              <h2 class="text-base sm:text-lg font-semibold tracking-[-0.02em] text-stone-950 leading-snug">
                Componentes Clasificados en la Estantería 3D
              </h2>
              <p class="text-[11px] text-stone-600 mt-0.5">
                Selecciona cualquier reactivo aquí o directamente en las tres repisas de la estantería situada a la derecha de la mesa:
              </p>
            </div>

            <div class="grid grid-cols-1 gap-1.5 overflow-y-auto max-h-[52vh] pr-1">
              {#each CABINET_COMPONENTS as comp}
                <div class="bg-white/85 border border-stone-900/10 rounded-xl p-2.5 flex items-start justify-between gap-2.5">
                  <div class="flex items-start gap-2.5 min-w-0">
                    <span
                      class="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                      style="background-color: {comp.colorHex};"
                    ></span>
                    <div class="text-[10.5px] leading-snug">
                      <div class="font-semibold text-stone-950 flex flex-wrap items-center gap-1.5">
                        <span>{comp.name}</span>
                        <span class="text-[9.5px] font-mono-numbers px-2 py-0.5 rounded-full bg-stone-900/[0.06] text-stone-600">
                          Estante {comp.shelfIndex + 1} · {comp.formulaOrSpec}
                        </span>
                      </div>
                      <p class="text-stone-600 mt-0.5 leading-relaxed">{comp.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onclick={() => equipCabinetComponentFromBook(comp.id)}
                    class="lab-btn shrink-0 px-3 py-1.5 rounded-full bg-stone-950 hover:bg-stone-800 text-white font-semibold text-[10px] cursor-pointer"
                  >
                    Equipar
                  </button>
                </div>
              {/each}

              <!-- Resumen de instrumentación de escala real -->
              <div class="mt-2 pt-2 border-t border-stone-900/10">
                <div class="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                  Instrumentación de Escala Real en la Mesa
                </div>
                {#each Object.values(LAB_TOOLS_CATALOG) as tool}
                  <div class="bg-stone-900/[0.03] border border-stone-900/[0.06] rounded-xl px-2.5 py-1.5 mb-1 flex items-center justify-between text-[10.5px]">
                    <span class="font-semibold text-stone-900">{tool.name}</span>
                    <span class="text-[9.5px] text-stone-500">{tool.levelBadge}</span>
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-stone-900/10">
            <button
              type="button"
              onclick={() => goToSpread(1)}
              class="text-xs font-semibold text-stone-700 hover:text-black cursor-pointer"
            >
              ← Volver al Índice (Pág. 01)
            </button>
            <span class="font-mono-numbers font-semibold text-[11px] text-stone-700">
              {MAX_SPREAD * 2}
            </span>
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

  /* Tapas traseras editoriales en grafito/obsidiana con cantos de hojas de papel marfil */
  .book-back-board {
    position: absolute;
    top: -1.4%;
    bottom: -1.4%;
    width: 50.6%;
    background: linear-gradient(145deg, #1c1d22 0%, #121317 60%, #0b0c0e 100%);
    border: 2px solid rgba(255, 255, 255, 0.14);
    box-shadow: 0 30px 70px rgba(0, 0, 0, 0.85);
    transform: translateZ(-22px);
    z-index: 1;
  }

  .book-back-board.left-board {
    left: -0.6%;
    border-radius: 18px 4px 4px 18px;
    box-shadow:
      inset 10px 0 0 #f4f1ea,
      inset 13px 0 0 #ded9ce,
      inset 16px 0 0 #f4f1ea,
      0 30px 70px rgba(0, 0, 0, 0.85);
  }

  .book-back-board.right-board {
    right: -0.6%;
    border-radius: 4px 18px 18px 4px;
    box-shadow:
      inset -10px 0 0 #f4f1ea,
      inset -13px 0 0 #ded9ce,
      inset -16px 0 0 #f4f1ea,
      0 30px 70px rgba(0, 0, 0, 0.85);
  }

  /* Lomo central minimalista en grafito anodizado */
  .book-spine {
    position: absolute;
    top: -1.6%;
    bottom: -1.6%;
    left: calc(50% - 14px);
    width: 28px;
    background: linear-gradient(90deg, #0b0c0e 0%, #23252c 35%, #32353e 50%, #23252c 65%, #0b0c0e 100%);
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
    transition: transform 720ms cubic-bezier(0.32, 0.72, 0, 1);
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

  /* Portada dura editorial estilo "Designed by Apple in California" (Lino Grafito Oscuro) */
  .book-hardcover {
    background: radial-gradient(circle at 25% 20%, #24262d 0%, #15161b 55%, #0d0e12 100%);
    border: 2px solid rgba(255, 255, 255, 0.16);
    box-shadow:
      inset 0 0 40px rgba(0, 0, 0, 0.75),
      -10px 0 25px rgba(0, 0, 0, 0.6);
  }

  /* Papel editorial marfil cálido (Apple Books Ivory) 100% opaco con sombreado sutil hacia el pliegue central */
  .book-paper-right {
    background-color: #faf8f5;
    background-image: linear-gradient(90deg, #e2ddd3 0%, #f1ede4 5%, #faf8f5 13%, #fcfbf9 92%, #f2eee6 100%);
    border-right: 3px solid #ded8cc;
    border-top: 1px solid #ebe6dc;
    border-bottom: 2px solid #d5cfc2;
    box-shadow: inset 14px 0 20px -12px rgba(15, 15, 18, 0.18);
  }

  .book-paper-left {
    background-color: #faf8f5;
    background-image: linear-gradient(-90deg, #e2ddd3 0%, #f1ede4 5%, #faf8f5 13%, #fcfbf9 92%, #f2eee6 100%);
    border-left: 3px solid #ded8cc;
    border-top: 1px solid #ebe6dc;
    border-bottom: 2px solid #d5cfc2;
    box-shadow: inset -14px 0 20px -12px rgba(15, 15, 18, 0.18);
  }

  /* Botones de paso de página minimalistas estilo editorial */
  .page-corner-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.32rem 0.75rem;
    border-radius: 9999px;
    background: rgba(28, 25, 23, 0.06);
    color: #1c1917;
    font-weight: 600;
    font-size: 0.68rem;
    border: 1px solid rgba(28, 25, 23, 0.12);
    cursor: pointer;
    transition:
      transform 160ms var(--ease-out-strong),
      background-color 160ms ease-out;
  }

  .page-corner-btn:hover {
    background: rgba(28, 25, 23, 0.12);
  }

  .page-corner-btn:active {
    transform: scale(0.96);
  }
</style>
