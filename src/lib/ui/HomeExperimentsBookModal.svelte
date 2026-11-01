<script lang="ts">
  import { onDestroy } from 'svelte';
  import {
    labStore,
    EXPERIMENT_PRESETS,
    LAB_TOOLS_CATALOG,
    type HomeExperimentPreset
  } from '$lib/interaction/lab_store.svelte';
  import { labSound } from '$lib/audio/lab_sound';
  import {
    BookOpen,
    Play,
    Pause,
    RotateCcw,
    CheckCircle2,
    FlaskConical,
    Sparkles,
    Upload,
    X,
    ChevronLeft,
    ChevronRight,
    ShieldCheck,
    Volume2,
    VolumeX,
    GraduationCap,
    Compass
  } from '@lucide/svelte';

  /**
   * Estructura física del Libro 3D (Primaria y Secundaria):
   * - Hoja 0 (Sheet 0): Frente = Portada Dura | Reverso = Página 1 (Índice General Primaria y Secundaria)
   * - Hoja 1 (Sheet 1): Frente = Página 2 (Primaria Exp. 1: Col Morada + Video) | Reverso = Página 3 (Primaria Exp. 1: Práctica)
   * - Hoja 2 (Sheet 2): Frente = Página 4 (Primaria Exp. 2: Volcán Espumoso + Video) | Reverso = Página 5 (Primaria Exp. 2: Práctica)
   * - Hoja 3 (Sheet 3): Frente = Página 6 (Secundaria Exp. 3: Titulación Bureta HCl+NaOH + Video) | Reverso = Página 7 (Secundaria Exp. 3: Práctica)
   * - Hoja 4 (Sheet 4): Frente = Página 8 (Secundaria Exp. 4: Termoquímica Kw(T) + Video) | Reverso = Página 9 (Secundaria Exp. 4: Práctica)
   * - Hoja 5 (Sheet 5): Frente = Página 10 (Guía Ilustrada de Herramientas del Laboratorio 3D y Síntesis)
   *
   * Total de pliegos abiertos (currentSpread):
   * - 0: Libro cerrado mostrando la Portada Dura (se abre automáticamente con sonido de libro real)
   * - 1: Páginas 1 y 2   (Índice General + Primaria Exp. 1 Teoría/Video)
   * - 2: Páginas 3 y 4   (Primaria Exp. 1 Práctica + Primaria Exp. 2 Teoría/Video)
   * - 3: Páginas 5 y 6   (Primaria Exp. 2 Práctica + Secundaria Exp. 3 Teoría/Video)
   * - 4: Páginas 7 y 8   (Secundaria Exp. 3 Práctica + Secundaria Exp. 4 Teoría/Video)
   * - 5: Páginas 9 y 10  (Secundaria Exp. 4 Práctica + Guía de Herramientas 3D)
   */
  const MAX_SPREAD = 5;

  let currentSpread = $state<number>(0);
  let turningDirection = $state<'next' | 'prev' | null>(null);
  let turningSheets = $state<number[]>([]);
  let openAnimTimer: ReturnType<typeof setTimeout> | null = null;
  let turnFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

  // Deslizamiento / arrastre (swipe) con ratón o pantalla táctil para pasar páginas
  let pointerStartX: number | null = null;
  let pointerDragDeltaX = $state<number>(0);

  // Videos demostrativos integrados en las páginas del libro
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

  const preset1 = EXPERIMENT_PRESETS[0]; // Primaria #1: Col Morada
  const preset2 = EXPERIMENT_PRESETS[1]; // Primaria #2: Volcán Espumoso
  const preset3 = EXPERIMENT_PRESETS[2]; // Secundaria #1: Titulación HCl + NaOH
  const preset4 = EXPERIMENT_PRESETS[3]; // Secundaria #2: Termoquímica HNO3 + KOH

  const activeVideoPreset = $derived<HomeExperimentPreset>(
    currentSpread <= 1
      ? preset1
      : currentSpread === 2
        ? preset2
        : currentSpread === 3
          ? preset3
          : preset4
  );

  const currentChapter = $derived(
    activeVideoPreset.videoChapters.find(
      (ch) => videoTimeSec >= ch.timeSec && videoTimeSec < ch.timeSec + ch.durationSec
    ) ?? activeVideoPreset.videoChapters[activeVideoPreset.videoChapters.length - 1]
  );

  // Al abrir el modal, el libro aparece cerrado (Portada) y en 160 ms gira su tapa dura con sonido real
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
      zPx = 12;
      zIdx = 95;
    } else if (isFlipped) {
      const depthFromTop = currentSpread - 1 - sheetIndex;
      zPx = 2 - depthFromTop * 3;
      zIdx = 20 + sheetIndex;
    } else {
      const depthFromTop = sheetIndex - currentSpread;
      zPx = 2 - depthFromTop * 3;
      zIdx = 40 - sheetIndex;
    }

    // Solo mostrar la hoja activa izquierda, la hoja activa derecha y la que está girando
    const isVisible =
      isTurning ||
      sheetIndex === currentSpread ||
      sheetIndex === currentSpread - 1 ||
      (turningSheets.length > 0 && (sheetIndex === currentSpread + 1 || sheetIndex === currentSpread - 2));

    return `z-index: ${zIdx}; transform: translateZ(${zPx}px) rotateY(${rotY}deg); pointer-events: ${
      !isTurning && (sheetIndex === currentSpread || sheetIndex === currentSpread - 1) ? 'auto' : 'none'
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
    const ch =
      preset.videoChapters.find(
        (c) => videoTimeSec >= c.timeSec && videoTimeSec < c.timeSec + c.durationSec
      ) ?? preset.videoChapters[preset.videoChapters.length - 1];
    const progressInChapter = Math.min(1, Math.max(0, (videoTimeSec - ch.timeSec) / ch.durationSec));

    // Fondo de laboratorio científico
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#090e1a');
    bgGrad.addColorStop(1, '#162033');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Mesa de laboratorio en la parte inferior
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, h - 54, w, 54);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h - 54);
    ctx.lineTo(w, h - 54);
    ctx.stroke();

    // Badge de Nivel Educativo
    ctx.fillStyle = preset.level === 'primaria' ? '#065f46' : '#312e81';
    ctx.beginPath();
    ctx.roundRect(14, 12, 168, 28, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Outfit", sans-serif';
    ctx.fillText(preset.level === 'primaria' ? '🎒 NIVEL PRIMARIA' : '🔬 NIVEL SECUNDARIA', 24, 30);

    // Base del Agitador Magnético bajo el vaso
    const cx = w * 0.5;
    const plateY = h - 66;
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(cx - 64, plateY, 128, 16, 6);
    ctx.fill();

    // Vaso de precipitados graduado (250 mL)
    const bx = cx - 48;
    const by = plateY - 122;
    const bw = 96;
    const bh = 120;

    const fillRatio =
      ch.actionType === 'prep'
        ? 0.36
        : ch.actionType === 'pour_acid'
          ? 0.56
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

    // Pastilla magnética giratoria en el fondo del vaso
    const stirW = 14 + Math.sin(videoTimeSec * 16) * 8;
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(cx - stirW / 2, by + bh - 10, stirW, 5, 3);
    ctx.fill();

    // Burbujas ascendentes de reacción
    if (ch.actionType !== 'prep') {
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      for (let i = 0; i < 8; i++) {
        const bubX = bx + 16 + ((i * 13) % (bw - 30));
        const bubY = by + bh - 12 - ((videoTimeSec * 44 + i * 17) % Math.max(18, liqH - 14));
        ctx.beginPath();
        ctx.arc(bubX, bubY, 2.5 + (i % 2), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Sonda del pH-metro sumergida por la izquierda
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bx + 18, by - 22);
    ctx.lineTo(bx + 18, by + bh - 18);
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
      const my = by + bh - 24 - idx * 34;
      ctx.fillRect(bx + bw - 22, my, 12, 1.5);
      ctx.fillText(`${ml}`, bx + bw - 42, my + 3);
    });

    // Animación de matraz Erlenmeyer vertiendo reactivo
    if (ch.actionType !== 'prep' && progressInChapter < 0.85) {
      const isAcid = ch.actionType === 'pour_acid';
      const bottleColor = isAcid ? preset.acidReagent.colorHex : preset.baseReagent.colorHex;
      const streamX = isAcid ? cx - 8 : cx + 12;

      ctx.strokeStyle = bottleColor;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(streamX, by - 28);
      ctx.lineTo(streamX, by + bh - liqH + 4);
      ctx.stroke();

      ctx.save();
      ctx.translate(isAcid ? streamX - 28 : streamX + 28, by - 36);
      ctx.rotate(isAcid ? 1.05 : -1.05);
      ctx.fillStyle = bottleColor;
      ctx.beginPath();
      ctx.moveTo(-8, -22);
      ctx.lineTo(8, -22);
      ctx.lineTo(18, 16);
      ctx.lineTo(-18, 16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Pantalla OLED de lectura en vivo (esquina superior derecha)
    ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
    ctx.beginPath();
    ctx.roundRect(w - 152, 12, 138, 56, 10);
    ctx.fill();
    ctx.strokeStyle = ch.simColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText('SENSOR pH EN VIVO', w - 140, 28);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 21px "JetBrains Mono", monospace';
    ctx.fillText(`pH ${ch.simPh.toFixed(2)}`, w - 140, 54);
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
    <!-- Barra superior flotante con saltos rápidos a Primaria / Secundaria y control de sonido de hojas -->
    <div class="w-full max-w-5xl mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-100/95 px-2">
      <div class="flex items-center gap-2">
        <BookOpen class="w-4 h-4 text-amber-400 shrink-0" />
        <span id="physical-book-title" class="font-bold tracking-wide">
          Manual Correlativo de Laboratorio · Primaria y Secundaria
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onclick={() => goToSpread(1)}
          class="px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors {currentSpread === 1 || currentSpread === 2 ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-900/90 text-emerald-300 border-emerald-500/40 hover:bg-emerald-950'}"
        >
          🎒 Primaria (Págs. 2–5)
        </button>

        <button
          type="button"
          onclick={() => goToSpread(3)}
          class="px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors {currentSpread >= 3 ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-900/90 text-indigo-300 border-indigo-500/40 hover:bg-indigo-950'}"
        >
          🔬 Secundaria (Págs. 6–10)
        </button>

        <button
          type="button"
          onclick={() => labStore.toggleSound()}
          class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-950/80 border border-amber-500/40 text-amber-200 hover:bg-amber-900/80 flex items-center gap-1 cursor-pointer"
          title="Activar o silenciar el sonido de las hojas al pasar de página"
        >
          {#if labStore.soundEnabled}
            <Volume2 class="w-3.5 h-3.5 text-amber-400" />
            <span class="hidden sm:inline">Sonido Hojas: ON</span>
          {:else}
            <VolumeX class="w-3.5 h-3.5 text-slate-400" />
            <span class="hidden sm:inline">Silenciado</span>
          {/if}
        </button>

        <span class="font-mono-numbers text-[11px] bg-slate-900/90 border border-slate-700 px-2.5 py-1 rounded-lg text-amber-300">
          {currentSpread === 0 ? 'Portada' : `Págs. ${currentSpread * 2 - 1}–${currentSpread * 2} / 10`}
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
           HOJA 0: PORTADA DURA (FRENTE) / PÁGINA 1: ÍNDICE GENERAL (REVERSO)
           ========================================================================= -->
      <div
        class="book-sheet"
        style={getSheetStyle(0)}
      >
        <!-- FRENTE DE HOJA 0: PORTADA DURA DEL LIBRO -->
        <div class="sheet-face sheet-front book-hardcover flex flex-col items-center justify-between p-8 text-center">
          <div class="w-full border-2 border-amber-400/50 rounded-2xl p-6 flex-1 flex flex-col items-center justify-between bg-gradient-to-br from-amber-950/70 via-slate-950/85 to-amber-950/70 shadow-inner">
            <div class="text-amber-300/90 text-xs font-bold tracking-[0.22em] uppercase">
              SymbioLab 2.0 · Edición Escolar Completa
            </div>

            <div class="my-auto flex flex-col items-center gap-3.5">
              <div class="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center shadow-lg">
                <FlaskConical class="w-10 h-10 text-amber-300" />
              </div>
              <h1 class="font-serif text-2xl sm:text-4xl font-extrabold text-amber-100 tracking-tight leading-tight">
                GRAN MANUAL DE<br />CIENCIAS Y LABORATORIO
              </h1>
              <div class="flex items-center gap-2">
                <span class="px-3 py-1 rounded-full bg-emerald-500/25 border border-emerald-400/50 text-emerald-200 text-xs font-bold">
                  🎒 Nivel Primaria
                </span>
                <span class="px-3 py-1 rounded-full bg-indigo-500/25 border border-indigo-400/50 text-indigo-200 text-xs font-bold">
                  🔬 Nivel Secundaria
                </span>
              </div>
              <p class="text-xs sm:text-sm text-amber-200/85 max-w-xs font-medium">
                Experimentos guiados paso a paso con video integrado y equipamiento 3D completo
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

        <!-- REVERSO DE HOJA 0: PÁGINA 1 (ÍNDICE GENERAL PRIMARIA Y SECUNDARIA) -->
        <div class="sheet-face sheet-back book-paper-left p-5 sm:p-6 flex flex-col justify-between">
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center justify-between border-b-2 border-amber-900/25 pb-1.5">
              <span class="text-[11px] font-bold uppercase tracking-widest text-amber-900">
                Índice Correlativo del Manual
              </span>
              <span class="text-[11px] font-serif italic text-stone-600">Ex Libris · SymbioLab</span>
            </div>

            <h2 class="font-serif text-lg sm:text-xl font-extrabold text-stone-900">
              Contenidos por Nivel Educativo
            </h2>

            <!-- SECCIÓN PRIMARIA EN EL ÍNDICE -->
            <div class="rounded-xl bg-emerald-950/10 border border-emerald-800/25 p-2.5 flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <span class="text-xs font-extrabold text-emerald-900 uppercase tracking-wide flex items-center gap-1">
                  🎒 Sección I · Nivel Primaria (3.° a 6.° Grado)
                </span>
                <span class="text-[10px] font-bold bg-emerald-700 text-white px-2 py-0.5 rounded-full">Didáctico y Casero</span>
              </div>

              <button
                type="button"
                onclick={() => goToSpread(1)}
                class="group text-left p-2 rounded-lg bg-white/80 hover:bg-emerald-50 border border-emerald-900/15 transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div class="font-serif font-bold text-stone-900 text-xs group-hover:text-emerald-800">
                    Exp. 1 · El Detective de Colores con Col Morada
                  </div>
                  <div class="text-[11px] text-stone-600">Jugo de limón, bicarbonato, gotero y tiras de pH + Video</div>
                </div>
                <span class="font-mono-numbers font-bold text-xs text-emerald-900">Pág. 2</span>
              </button>

              <button
                type="button"
                onclick={() => goToSpread(2)}
                class="group text-left p-2 rounded-lg bg-white/80 hover:bg-emerald-50 border border-emerald-900/15 transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div class="font-serif font-bold text-stone-900 text-xs group-hover:text-emerald-800">
                    Exp. 2 · El Volcán Espumoso: Vinagre y Bicarbonato
                  </div>
                  <div class="text-[11px] text-stone-600">Burbujas de CO₂, equilibrio ácido-base y termómetro + Video</div>
                </div>
                <span class="font-mono-numbers font-bold text-xs text-emerald-900">Pág. 4</span>
              </button>
            </div>

            <!-- SECCIÓN SECUNDARIA EN EL ÍNDICE -->
            <div class="rounded-xl bg-indigo-950/10 border border-indigo-800/25 p-2.5 flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <span class="text-xs font-extrabold text-indigo-900 uppercase tracking-wide flex items-center gap-1">
                  🔬 Sección II · Nivel Secundaria (1.° a 5.° Grado)
                </span>
                <span class="text-[10px] font-bold bg-indigo-700 text-white px-2 py-0.5 rounded-full">Rigor Volumétrico</span>
              </div>

              <button
                type="button"
                onclick={() => goToSpread(3)}
                class="group text-left p-2 rounded-lg bg-white/80 hover:bg-indigo-50 border border-indigo-900/15 transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div class="font-serif font-bold text-stone-900 text-xs group-hover:text-indigo-800">
                    Exp. 3 · Titulación con Bureta: HCl 0.01 M + NaOH 0.01 M
                  </div>
                  <div class="text-[11px] text-stone-600">Bureta de 50 mL, curva sigmoidea y punto de equivalencia + Video</div>
                </div>
                <span class="font-mono-numbers font-bold text-xs text-indigo-900">Pág. 6</span>
              </button>

              <button
                type="button"
                onclick={() => goToSpread(4)}
                class="group text-left p-2 rounded-lg bg-white/80 hover:bg-indigo-50 border border-indigo-900/15 transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div class="font-serif font-bold text-stone-900 text-xs group-hover:text-indigo-800">
                    Exp. 4 · Termoquímica del Agua Kw(T): HNO₃ + KOH
                  </div>
                  <div class="text-[11px] text-stone-600">Ecuación de Van ’t Hoff (25 °C a 65 °C), placa térmica y vapor + Video</div>
                </div>
                <span class="font-mono-numbers font-bold text-xs text-indigo-900">Pág. 8</span>
              </button>

              <button
                type="button"
                onclick={() => goToSpread(5)}
                class="group text-left p-1.5 rounded-lg bg-amber-900/10 hover:bg-amber-900/20 border border-amber-900/20 transition-all cursor-pointer flex items-center justify-between"
              >
                <span class="font-serif font-bold text-amber-950 text-xs">
                  🛠️ Anexo: Catálogo de Herramientas del Laboratorio 3D
                </span>
                <span class="font-mono-numbers font-bold text-xs text-amber-900">Pág. 10</span>
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between pt-1.5 border-t border-amber-900/15 text-[11px] text-stone-600">
            <span class="font-serif font-bold text-stone-800">Pág. 1</span>
            <span class="italic">Desliza o haz clic en las esquinas para hojear con sonido 🔊</span>
          </div>
        </div>
      </div>

      <!-- =========================================================================
           HOJA 1: PÁGINA 2 (PRIMARIA EXP. 1 TEORÍA + VIDEO) / PÁGINA 3 (PRIMARIA EXP. 1 PRÁCTICA)
           ========================================================================= -->
      <div
        class="book-sheet"
        style={getSheetStyle(1)}
      >
        <!-- FRENTE DE HOJA 1: PÁGINA 2 (PRIMARIA EXP. 1 + VIDEO) -->
        <div class="sheet-face sheet-front book-paper-right p-5 sm:p-6 flex flex-col justify-between">
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center justify-between border-b-2 border-emerald-900/25 pb-1">
              <span class="text-[11px] font-extrabold uppercase tracking-widest text-emerald-800 flex items-center gap-1">
                🎒 Nivel Primaria · Experimento #1
              </span>
              <span class="text-[11px] font-serif italic text-stone-600">{preset1.gradeRange}</span>
            </div>

            <div>
              <h2 class="font-serif text-lg sm:text-xl font-extrabold text-stone-900 leading-tight">
                {preset1.title}
              </h2>
              <p class="text-[11px] text-stone-700 mt-0.5 leading-relaxed">
                {preset1.summary}
              </p>
            </div>

            <!-- Ingredientes y herramientas para Primaria -->
            <div class="grid grid-cols-2 gap-1.5">
              {#each preset1.householdMaterials as item}
                <div class="bg-white/80 border border-stone-300/80 rounded-lg p-1.5 flex items-center gap-2">
                  <span class="text-base">{item.icon}</span>
                  <div>
                    <div class="text-[11px] font-bold text-stone-900 leading-tight">{item.name}</div>
                    <div class="text-[10px] text-stone-600 leading-tight">{item.role}</div>
                  </div>
                </div>
              {/each}
            </div>

            <!-- Reproductor de Video integrado en la Página 2 -->
            <div class="rounded-xl overflow-hidden border-2 border-stone-800 bg-slate-950 shadow-md">
              <div class="relative aspect-16/9 w-full">
                {#if customVideoUrl}
                  <video src={customVideoUrl} controls class="w-full h-full object-cover">
                    <track kind="captions" />
                  </video>
                {:else}
                  <canvas
                    bind:this={videoCanvases[preset1.id]}
                    width="560"
                    height="315"
                    class="w-full h-full object-cover"
                  ></canvas>
                {/if}
                <div class="absolute bottom-2 left-2 right-2 bg-slate-950/90 px-2.5 py-1.5 rounded-lg border border-slate-700/80">
                  <div class="text-[10px] font-bold text-emerald-400">{currentChapter.title}</div>
                  <p class="text-[10px] text-slate-200 leading-snug">{currentChapter.caption}</p>
                </div>
              </div>
              <div class="px-2.5 py-1.5 bg-stone-900 text-amber-100 flex items-center justify-between text-[11px]">
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    onclick={togglePlay}
                    class="px-2.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {#if isPlaying}<Pause class="w-3 h-3" /> Pausar{:else}<Play class="w-3 h-3" /> Ver Video{/if}
                  </button>
                  <button
                    type="button"
                    onclick={restartVideo}
                    class="p-1 rounded bg-stone-800 hover:bg-stone-700 cursor-pointer"
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

          <div class="flex items-center justify-between pt-1.5 border-t border-amber-900/15">
            <span class="text-[11px] text-stone-500 italic">Sigue en la Pág. 3 →</span>
            <button type="button" onclick={nextPage} class="page-corner-btn right-corner">
              <span>Pág. 2 · Siguiente</span>
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- REVERSO DE HOJA 1: PÁGINA 3 (PRIMARIA EXP. 1 PRÁCTICA Y RETO) -->
        <div class="sheet-face sheet-back book-paper-left p-5 sm:p-6 flex flex-col justify-between">
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center justify-between border-b-2 border-emerald-900/25 pb-1">
              <span class="text-[11px] font-extrabold uppercase tracking-widest text-emerald-800">
                🎒 Primaria · Misión Práctica #1
              </span>
              <span class="text-[11px] font-serif italic text-stone-600">Col Morada y Limón</span>
            </div>

            <div class="bg-emerald-950/10 border border-emerald-800/25 p-2.5 rounded-xl text-xs text-stone-800">
              <strong class="text-emerald-950 block mb-0.5">💡 ¿Cómo funciona en tu mesa 3D?</strong>
              En la mesa tienes el <strong>Gotero Ámbar</strong> (con extracto de col morada), las <strong>Tiras de Papel pH</strong> a la izquierda y los matraces con <strong>Jugo de Limón</strong> y <strong>Bicarbonato</strong>.
            </div>

            <div class="flex flex-col gap-1.5">
              <span class="text-xs font-extrabold text-stone-900 uppercase tracking-wider">
                ⭐ Pasos para ganar tu insignia de Primaria:
              </span>
              {#each preset1.interactiveGoals as goal, i}
                {@const done = labStore.activePresetId === preset1.id && goal.checkFn(labStore.beaker)}
                <div
                  class="p-2 rounded-xl border flex items-start gap-2 text-xs
                  {done
                    ? 'bg-emerald-100 border-emerald-600 text-emerald-950 font-semibold'
                    : 'bg-white/85 border-stone-300 text-stone-800'}"
                >
                  <CheckCircle2 class="w-4 h-4 shrink-0 mt-0.5 {done ? 'text-emerald-700' : 'text-stone-400'}" />
                  <span><strong>Paso {i + 1}:</strong> {goal.description}</span>
                </div>
              {/each}
            </div>

            <!-- Mini-pregunta de Primaria -->
            <div class="bg-amber-100/70 border border-amber-900/20 p-2.5 rounded-xl flex flex-col gap-1">
              <span class="text-xs font-bold text-amber-950">✍️ Pregunta de Primaria:</span>
              <p class="text-[11px] text-stone-800 font-semibold">{preset1.quizQuestion.question}</p>
              {#each preset1.quizQuestion.options as opt, idx}
                {@const picked = quizAnswers[preset1.id] === idx}
                {@const isOk = idx === preset1.quizQuestion.correctIndex}
                <button
                  type="button"
                  onclick={() => (quizAnswers[preset1.id] = idx)}
                  class="text-left px-2.5 py-1 rounded-lg border text-xs cursor-pointer flex justify-between
                  {picked
                    ? isOk
                      ? 'bg-emerald-700 text-white border-emerald-800 font-bold'
                      : 'bg-rose-700 text-white border-rose-800 font-bold'
                    : 'bg-white/90 border-stone-300 text-stone-800 hover:bg-amber-50'}"
                >
                  <span>{opt}</span>
                  {#if picked}<span>{isOk ? '✓' : '✗'}</span>{/if}
                </button>
              {/each}
            </div>

            <button
              type="button"
              onclick={() => launchExperimentFromPage(preset1.id)}
              class="lab-btn w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <FlaskConical class="w-4 h-4" />
              <span>🎒 ¡Equipar Laboratorio para Primaria: Col Morada!</span>
            </button>
          </div>

          <div class="flex items-center justify-between pt-1.5 border-t border-amber-900/15">
            <button type="button" onclick={prevPage} class="page-corner-btn left-corner">
              <ChevronLeft class="w-4 h-4" />
              <span>Anterior · Pág. 3</span>
            </button>
            <span class="text-[11px] text-stone-500 italic">Primaria Exp. 2 en Pág. 4 →</span>
          </div>
        </div>
      </div>

      <!-- =========================================================================
           HOJA 2: PÁGINA 4 (PRIMARIA EXP. 2 VOLCÁN + VIDEO) / PÁGINA 5 (PRIMARIA EXP. 2 PRÁCTICA)
           ========================================================================= -->
      <div
        class="book-sheet"
        style={getSheetStyle(2)}
      >
        <!-- FRENTE DE HOJA 2: PÁGINA 4 (PRIMARIA EXP. 2 + VIDEO) -->
        <div class="sheet-face sheet-front book-paper-right p-5 sm:p-6 flex flex-col justify-between">
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center justify-between border-b-2 border-emerald-900/25 pb-1">
              <span class="text-[11px] font-extrabold uppercase tracking-widest text-emerald-800">
                🎒 Nivel Primaria · Experimento #2
              </span>
              <span class="text-[11px] font-serif italic text-stone-600">{preset2.gradeRange}</span>
            </div>

            <div>
              <h2 class="font-serif text-lg sm:text-xl font-extrabold text-stone-900 leading-tight">
                {preset2.title}
              </h2>
              <p class="text-[11px] text-stone-700 mt-0.5 leading-relaxed">
                {preset2.summary}
              </p>
            </div>

            <div class="grid grid-cols-2 gap-1.5">
              {#each preset2.householdMaterials as item}
                <div class="bg-white/80 border border-stone-300/80 rounded-lg p-1.5 flex items-center gap-2">
                  <span class="text-base">{item.icon}</span>
                  <div>
                    <div class="text-[11px] font-bold text-stone-900 leading-tight">{item.name}</div>
                    <div class="text-[10px] text-stone-600 leading-tight">{item.role}</div>
                  </div>
                </div>
              {/each}
            </div>

            <div class="rounded-xl overflow-hidden border-2 border-stone-800 bg-slate-950 shadow-md">
              <div class="relative aspect-16/9 w-full">
                {#if customVideoUrl}
                  <video src={customVideoUrl} controls class="w-full h-full object-cover">
                    <track kind="captions" />
                  </video>
                {:else}
                  <canvas
                    bind:this={videoCanvases[preset2.id]}
                    width="560"
                    height="315"
                    class="w-full h-full object-cover"
                  ></canvas>
                {/if}
                <div class="absolute bottom-2 left-2 right-2 bg-slate-950/90 px-2.5 py-1.5 rounded-lg border border-slate-700/80">
                  <div class="text-[10px] font-bold text-amber-400">{currentChapter.title}</div>
                  <p class="text-[10px] text-slate-200 leading-snug">{currentChapter.caption}</p>
                </div>
              </div>
              <div class="px-2.5 py-1.5 bg-stone-900 text-amber-100 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onclick={togglePlay}
                  class="px-2.5 py-0.5 rounded bg-amber-400 text-slate-950 font-bold flex items-center gap-1 cursor-pointer"
                >
                  {#if isPlaying}<Pause class="w-3 h-3" /> Pausar{:else}<Play class="w-3 h-3" /> Reproducir{/if}
                </button>
                <span class="font-mono-numbers text-[10px]">Volcán Casero · Primaria</span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-1.5 border-t border-amber-900/15">
            <span class="text-[11px] text-stone-500 italic">Práctica en Pág. 5 →</span>
            <button type="button" onclick={nextPage} class="page-corner-btn right-corner">
              <span>Pág. 4 · Siguiente</span>
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- REVERSO DE HOJA 2: PÁGINA 5 (PRIMARIA EXP. 2 PRÁCTICA) -->
        <div class="sheet-face sheet-back book-paper-left p-5 sm:p-6 flex flex-col justify-between">
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center justify-between border-b-2 border-emerald-900/25 pb-1">
              <span class="text-[11px] font-extrabold uppercase tracking-widest text-emerald-800">
                🎒 Primaria · Misión Práctica #2
              </span>
              <span class="text-[11px] font-serif italic text-stone-600">Vinagre + Bicarbonato</span>
            </div>

            <div class="bg-emerald-950/10 border border-emerald-800/25 p-2.5 rounded-xl text-xs text-stone-800">
              <strong class="text-emerald-950 block mb-0.5">🌋 ¿Por qué salen burbujas?</strong>
              {preset2.scientificPrinciple}
            </div>

            <div class="flex flex-col gap-1.5">
              {#each preset2.interactiveGoals as goal, i}
                {@const done = labStore.activePresetId === preset2.id && goal.checkFn(labStore.beaker)}
                <div
                  class="p-2.5 rounded-xl border flex items-start gap-2 text-xs
                  {done
                    ? 'bg-emerald-100 border-emerald-600 text-emerald-950 font-semibold'
                    : 'bg-white/85 border-stone-300 text-stone-800'}"
                >
                  <CheckCircle2 class="w-4 h-4 shrink-0 mt-0.5 {done ? 'text-emerald-700' : 'text-stone-400'}" />
                  <span><strong>Paso {i + 1}:</strong> {goal.description}</span>
                </div>
              {/each}
            </div>

            <div class="bg-amber-100/70 border border-amber-900/20 p-2.5 rounded-xl flex flex-col gap-1">
              <span class="text-xs font-bold text-amber-950">✍️ Pregunta de Primaria:</span>
              <p class="text-[11px] text-stone-800 font-semibold">{preset2.quizQuestion.question}</p>
              {#each preset2.quizQuestion.options as opt, idx}
                {@const picked = quizAnswers[preset2.id] === idx}
                {@const isOk = idx === preset2.quizQuestion.correctIndex}
                <button
                  type="button"
                  onclick={() => (quizAnswers[preset2.id] = idx)}
                  class="text-left px-2.5 py-1 rounded-lg border text-xs cursor-pointer flex justify-between
                  {picked
                    ? isOk
                      ? 'bg-emerald-700 text-white border-emerald-800 font-bold'
                      : 'bg-rose-700 text-white border-rose-800 font-bold'
                    : 'bg-white/90 border-stone-300 text-stone-800 hover:bg-amber-50'}"
                >
                  <span>{opt}</span>
                  {#if picked}<span>{isOk ? '✓' : '✗'}</span>{/if}
                </button>
              {/each}
            </div>

            <button
              type="button"
              onclick={() => launchExperimentFromPage(preset2.id)}
              class="lab-btn w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <FlaskConical class="w-4 h-4" />
              <span>🎒 ¡Equipar Laboratorio para Primaria: Volcán Espumoso!</span>
            </button>
          </div>

          <div class="flex items-center justify-between pt-1.5 border-t border-amber-900/15">
            <button type="button" onclick={prevPage} class="page-corner-btn left-corner">
              <ChevronLeft class="w-4 h-4" />
              <span>Anterior · Pág. 5</span>
            </button>
            <span class="text-[11px] text-indigo-800 font-bold">Nivel Secundaria en Pág. 6 →</span>
          </div>
        </div>
      </div>

      <!-- =========================================================================
           HOJA 3: PÁGINA 6 (SECUNDARIA EXP. 3 BURETA + VIDEO) / PÁGINA 7 (SECUNDARIA EXP. 3 PRÁCTICA)
           ========================================================================= -->
      <div
        class="book-sheet"
        style={getSheetStyle(3)}
      >
        <!-- FRENTE DE HOJA 3: PÁGINA 6 (SECUNDARIA EXP. 3 + VIDEO) -->
        <div class="sheet-face sheet-front book-paper-right p-5 sm:p-6 flex flex-col justify-between">
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center justify-between border-b-2 border-indigo-900/25 pb-1">
              <span class="text-[11px] font-extrabold uppercase tracking-widest text-indigo-900">
                🔬 Nivel Secundaria · Experimento #3
              </span>
              <span class="text-[11px] font-serif italic text-stone-600">{preset3.gradeRange}</span>
            </div>

            <div>
              <h2 class="font-serif text-lg sm:text-xl font-extrabold text-stone-900 leading-tight">
                {preset3.title}
              </h2>
              <p class="text-[11px] text-stone-700 mt-0.5 leading-relaxed">
                {preset3.scientificPrinciple}
              </p>
            </div>

            <div class="grid grid-cols-2 gap-1.5">
              {#each preset3.householdMaterials as item}
                <div class="bg-white/80 border border-stone-300/80 rounded-lg p-1.5 flex items-center gap-2">
                  <span class="text-base">{item.icon}</span>
                  <div>
                    <div class="text-[11px] font-bold text-stone-900 leading-tight">{item.name}</div>
                    <div class="text-[10px] text-stone-600 leading-tight">{item.role}</div>
                  </div>
                </div>
              {/each}
            </div>

            <div class="rounded-xl overflow-hidden border-2 border-stone-800 bg-slate-950 shadow-md">
              <div class="relative aspect-16/9 w-full">
                {#if customVideoUrl}
                  <video src={customVideoUrl} controls class="w-full h-full object-cover">
                    <track kind="captions" />
                  </video>
                {:else}
                  <canvas
                    bind:this={videoCanvases[preset3.id]}
                    width="560"
                    height="315"
                    class="w-full h-full object-cover"
                  ></canvas>
                {/if}
                <div class="absolute bottom-2 left-2 right-2 bg-slate-950/90 px-2.5 py-1.5 rounded-lg border border-slate-700/80">
                  <div class="text-[10px] font-bold text-indigo-400">{currentChapter.title}</div>
                  <p class="text-[10px] text-slate-200 leading-snug">{currentChapter.caption}</p>
                </div>
              </div>
              <div class="px-2.5 py-1.5 bg-stone-900 text-amber-100 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onclick={togglePlay}
                  class="px-2.5 py-0.5 rounded bg-indigo-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                >
                  {#if isPlaying}<Pause class="w-3 h-3" /> Pausar{:else}<Play class="w-3 h-3" /> Reproducir{/if}
                </button>
                <span class="font-mono-numbers text-[10px]">Ca·Va = Cb·Vb · Kw = 10⁻¹⁴</span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-1.5 border-t border-amber-900/15">
            <span class="text-[11px] text-stone-500 italic">Protocolo en Pág. 7 →</span>
            <button type="button" onclick={nextPage} class="page-corner-btn right-corner">
              <span>Pág. 6 · Siguiente</span>
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- REVERSO DE HOJA 3: PÁGINA 7 (SECUNDARIA EXP. 3 PRÁCTICA ANALÍTICA) -->
        <div class="sheet-face sheet-back book-paper-left p-5 sm:p-6 flex flex-col justify-between">
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center justify-between border-b-2 border-indigo-900/25 pb-1">
              <span class="text-[11px] font-extrabold uppercase tracking-widest text-indigo-900">
                🔬 Secundaria · Protocolo Volumétrico #3
              </span>
              <span class="text-[11px] font-serif italic text-stone-600">Uso de Bureta 50 mL</span>
            </div>

            <div class="bg-indigo-950/10 border border-indigo-900/25 p-2.5 rounded-xl text-xs text-stone-800">
              <strong class="text-indigo-950 block mb-0.5">🧪 Técnica de Titulación con Bureta 3D:</strong>
              Primero vierte el ácido con el matraz Erlenmeyer izquierdo y luego haz clic en la <strong>Bureta Graduada de 50 mL</strong> sobre el vaso para dosificar NaOH gota a gota (+1.0 mL) hasta clavar el punto de equivalencia en <strong>pH 7.00</strong>.
            </div>

            <div class="flex flex-col gap-1.5">
              {#each preset3.interactiveGoals as goal, i}
                {@const done = labStore.activePresetId === preset3.id && goal.checkFn(labStore.beaker)}
                <div
                  class="p-2.5 rounded-xl border flex items-start gap-2 text-xs
                  {done
                    ? 'bg-emerald-100 border-emerald-600 text-emerald-950 font-semibold'
                    : 'bg-white/85 border-stone-300 text-stone-800'}"
                >
                  <CheckCircle2 class="w-4 h-4 shrink-0 mt-0.5 {done ? 'text-emerald-700' : 'text-stone-400'}" />
                  <span><strong>Objetivo {i + 1}:</strong> {goal.description}</span>
                </div>
              {/each}
            </div>

            <div class="bg-amber-100/70 border border-amber-900/20 p-2.5 rounded-xl flex flex-col gap-1">
              <span class="text-xs font-bold text-amber-950">✍️ Evaluación de Secundaria:</span>
              <p class="text-[11px] text-stone-800 font-semibold">{preset3.quizQuestion.question}</p>
              {#each preset3.quizQuestion.options as opt, idx}
                {@const picked = quizAnswers[preset3.id] === idx}
                {@const isOk = idx === preset3.quizQuestion.correctIndex}
                <button
                  type="button"
                  onclick={() => (quizAnswers[preset3.id] = idx)}
                  class="text-left px-2.5 py-1 rounded-lg border text-xs cursor-pointer flex justify-between
                  {picked
                    ? isOk
                      ? 'bg-emerald-700 text-white border-emerald-800 font-bold'
                      : 'bg-rose-700 text-white border-rose-800 font-bold'
                    : 'bg-white/90 border-stone-300 text-stone-800 hover:bg-amber-50'}"
                >
                  <span>{opt}</span>
                  {#if picked}<span>{isOk ? '✓' : '✗'}</span>{/if}
                </button>
              {/each}
            </div>

            <button
              type="button"
              onclick={() => launchExperimentFromPage(preset3.id)}
              class="lab-btn w-full py-2.5 px-4 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <FlaskConical class="w-4 h-4" />
              <span>🔬 ¡Equipar Laboratorio para Secundaria: Titulación HCl + NaOH!</span>
            </button>
          </div>

          <div class="flex items-center justify-between pt-1.5 border-t border-amber-900/15">
            <button type="button" onclick={prevPage} class="page-corner-btn left-corner">
              <ChevronLeft class="w-4 h-4" />
              <span>Anterior · Pág. 7</span>
            </button>
            <span class="text-[11px] text-stone-500 italic">Termoquímica en Pág. 8 →</span>
          </div>
        </div>
      </div>

      <!-- =========================================================================
           HOJA 4: PÁGINA 8 (SECUNDARIA EXP. 4 TERMOQUÍMICA + VIDEO) / PÁGINA 9 (PRÁCTICA)
           ========================================================================= -->
      <div
        class="book-sheet"
        style={getSheetStyle(4)}
      >
        <!-- FRENTE DE HOJA 4: PÁGINA 8 (SECUNDARIA EXP. 4 + VIDEO) -->
        <div class="sheet-face sheet-front book-paper-right p-5 sm:p-6 flex flex-col justify-between">
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center justify-between border-b-2 border-indigo-900/25 pb-1">
              <span class="text-[11px] font-extrabold uppercase tracking-widest text-indigo-900">
                🔬 Nivel Secundaria · Experimento #4
              </span>
              <span class="text-[11px] font-serif italic text-stone-600">{preset4.gradeRange}</span>
            </div>

            <div>
              <h2 class="font-serif text-lg sm:text-xl font-extrabold text-stone-900 leading-tight">
                {preset4.title}
              </h2>
              <p class="text-[11px] text-stone-700 mt-0.5 leading-relaxed">
                {preset4.scientificPrinciple}
              </p>
            </div>

            <div class="grid grid-cols-2 gap-1.5">
              {#each preset4.householdMaterials as item}
                <div class="bg-white/80 border border-stone-300/80 rounded-lg p-1.5 flex items-center gap-2">
                  <span class="text-base">{item.icon}</span>
                  <div>
                    <div class="text-[11px] font-bold text-stone-900 leading-tight">{item.name}</div>
                    <div class="text-[10px] text-stone-600 leading-tight">{item.role}</div>
                  </div>
                </div>
              {/each}
            </div>

            <div class="rounded-xl overflow-hidden border-2 border-stone-800 bg-slate-950 shadow-md">
              <div class="relative aspect-16/9 w-full">
                {#if customVideoUrl}
                  <video src={customVideoUrl} controls class="w-full h-full object-cover">
                    <track kind="captions" />
                  </video>
                {:else}
                  <canvas
                    bind:this={videoCanvases[preset4.id]}
                    width="560"
                    height="315"
                    class="w-full h-full object-cover"
                  ></canvas>
                {/if}
                <div class="absolute bottom-2 left-2 right-2 bg-slate-950/90 px-2.5 py-1.5 rounded-lg border border-slate-700/80">
                  <div class="text-[10px] font-bold text-orange-400">{currentChapter.title}</div>
                  <p class="text-[10px] text-slate-200 leading-snug">{currentChapter.caption}</p>
                </div>
              </div>
              <div class="px-2.5 py-1.5 bg-stone-900 text-amber-100 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onclick={togglePlay}
                  class="px-2.5 py-0.5 rounded bg-orange-500 text-slate-950 font-bold flex items-center gap-1 cursor-pointer"
                >
                  {#if isPlaying}<Pause class="w-3 h-3" /> Pausar{:else}<Play class="w-3 h-3" /> Reproducir{/if}
                </button>
                <span class="font-mono-numbers text-[10px]">ΔH° = +55.8 kJ/mol · Van ’t Hoff</span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-1.5 border-t border-amber-900/15">
            <span class="text-[11px] text-stone-500 italic">Práctica en Pág. 9 →</span>
            <button type="button" onclick={nextPage} class="page-corner-btn right-corner">
              <span>Pág. 8 · Siguiente</span>
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- REVERSO DE HOJA 4: PÁGINA 9 (SECUNDARIA EXP. 4 PRÁCTICA TERMOQUÍMICA) -->
        <div class="sheet-face sheet-back book-paper-left p-5 sm:p-6 flex flex-col justify-between">
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center justify-between border-b-2 border-indigo-900/25 pb-1">
              <span class="text-[11px] font-extrabold uppercase tracking-widest text-indigo-900">
                🔬 Secundaria · Práctica Termoquímica #4
              </span>
              <span class="text-[11px] font-serif italic text-stone-600">HNO₃ 0.02 M + KOH 0.02 M</span>
            </div>

            <div class="bg-orange-950/10 border border-orange-900/25 p-2.5 rounded-xl text-xs text-stone-800">
              <strong class="text-orange-950 block mb-0.5">🌡️ Uso del Termómetro Digital y Placa Calefactora 3D:</strong>
              Al activar este experimento la placa inicia a <strong>65 °C</strong> con desprendimiento de vapor. Haz clic sobre el <strong>Termómetro 3D</strong> en la mesa para alternar entre 25 °C, 45 °C y 65 °C y observar cómo cambia el pH en vivo.
            </div>

            <div class="flex flex-col gap-1.5">
              {#each preset4.interactiveGoals as goal, i}
                {@const done = labStore.activePresetId === preset4.id && goal.checkFn(labStore.beaker)}
                <div
                  class="p-2.5 rounded-xl border flex items-start gap-2 text-xs
                  {done
                    ? 'bg-emerald-100 border-emerald-600 text-emerald-950 font-semibold'
                    : 'bg-white/85 border-stone-300 text-stone-800'}"
                >
                  <CheckCircle2 class="w-4 h-4 shrink-0 mt-0.5 {done ? 'text-emerald-700' : 'text-stone-400'}" />
                  <span><strong>Objetivo {i + 1}:</strong> {goal.description}</span>
                </div>
              {/each}
            </div>

            <div class="bg-amber-100/70 border border-amber-900/20 p-2.5 rounded-xl flex flex-col gap-1">
              <span class="text-xs font-bold text-amber-950">✍️ Pregunta Avanzada de Secundaria:</span>
              <p class="text-[11px] text-stone-800 font-semibold">{preset4.quizQuestion.question}</p>
              {#each preset4.quizQuestion.options as opt, idx}
                {@const picked = quizAnswers[preset4.id] === idx}
                {@const isOk = idx === preset4.quizQuestion.correctIndex}
                <button
                  type="button"
                  onclick={() => (quizAnswers[preset4.id] = idx)}
                  class="text-left px-2.5 py-1 rounded-lg border text-xs cursor-pointer flex justify-between
                  {picked
                    ? isOk
                      ? 'bg-emerald-700 text-white border-emerald-800 font-bold'
                      : 'bg-rose-700 text-white border-rose-800 font-bold'
                    : 'bg-white/90 border-stone-300 text-stone-800 hover:bg-amber-50'}"
                >
                  <span>{opt}</span>
                  {#if picked}<span>{isOk ? '✓' : '✗'}</span>{/if}
                </button>
              {/each}
            </div>

            <button
              type="button"
              onclick={() => launchExperimentFromPage(preset4.id)}
              class="lab-btn w-full py-2.5 px-4 rounded-xl bg-orange-700 hover:bg-orange-600 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <FlaskConical class="w-4 h-4" />
              <span>🔬 ¡Equipar Laboratorio para Secundaria: Termoquímica y pH!</span>
            </button>
          </div>

          <div class="flex items-center justify-between pt-1.5 border-t border-amber-900/15">
            <button type="button" onclick={prevPage} class="page-corner-btn left-corner">
              <ChevronLeft class="w-4 h-4" />
              <span>Anterior · Pág. 9</span>
            </button>
            <span class="text-[11px] text-stone-500 italic">Guía de Herramientas en Pág. 10 →</span>
          </div>
        </div>
      </div>

      <!-- =========================================================================
           HOJA 5: PÁGINA 10 (GUÍA ILUSTRADA DE HERRAMIENTAS DEL LABORATORIO 3D)
           ========================================================================= -->
      <div
        class="book-sheet"
        style={getSheetStyle(5)}
      >
        <div class="sheet-face sheet-front book-paper-right p-5 sm:p-6 flex flex-col justify-between">
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between border-b-2 border-amber-900/25 pb-1">
              <span class="text-[11px] font-extrabold uppercase tracking-widest text-amber-900">
                🛠️ Anexo Didáctico · Equipamiento del Laboratorio 3D
              </span>
              <span class="text-[11px] font-serif italic text-stone-600">Primaria y Secundaria</span>
            </div>

            <h2 class="font-serif text-lg font-extrabold text-stone-900">
              Guía de Instrumentos Interactivos en tu Mesa
            </h2>

            <div class="grid grid-cols-1 gap-1.5 overflow-y-auto max-h-[54vh] pr-1">
              {#each Object.values(LAB_TOOLS_CATALOG) as tool}
                <div class="bg-white/85 border border-stone-300 rounded-xl p-2 flex items-start gap-2.5">
                  <span class="text-xl shrink-0 mt-0.5">{tool.icon}</span>
                  <div class="text-[11px] leading-snug">
                    <div class="font-bold text-stone-900 flex items-center gap-1.5">
                      <span>{tool.name}</span>
                      <span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                        {tool.levelBadge}
                      </span>
                    </div>
                    <p class="text-emerald-900 mt-0.5">
                      <strong>🎒 Primaria:</strong> {tool.primariaExplain}
                    </p>
                    <p class="text-indigo-950 mt-0.5">
                      <strong>🔬 Secundaria:</strong> {tool.secundariaExplain}
                    </p>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-amber-900/15">
            <button
              type="button"
              onclick={() => goToSpread(1)}
              class="text-xs font-bold text-amber-900 hover:underline cursor-pointer"
            >
              ← Volver al Índice General (Pág. 1)
            </button>
            <span class="font-serif font-bold text-xs text-stone-800">Pág. 10 · Fin del Manual</span>
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
    transform: translateZ(-14px);
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
    transform: translateZ(-10px);
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
    padding: 0.38rem 0.85rem;
    border-radius: 0.65rem;
    background: linear-gradient(135deg, rgba(180, 83, 9, 0.14) 0%, rgba(180, 83, 9, 0.28) 100%);
    color: #78350f;
    font-family: 'Outfit', sans-serif;
    font-weight: 800;
    font-size: 0.72rem;
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
