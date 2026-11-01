<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { labStore, EXPERIMENT_PRESETS, type HomeExperimentPreset } from '$lib/interaction/lab_store.svelte';
  import {
    BookOpen,
    Play,
    Pause,
    RotateCcw,
    CheckCircle2,
    Sparkles,
    X,
    ShieldCheck,
    FlaskConical,
    Upload,
    HelpCircle,
    ArrowRight
  } from '@lucide/svelte';

  let viewedPresetId = $state<string>(labStore.activePresetId === 'chemistry-p0-acid-base' ? 'cabbage-home-lab' : labStore.activePresetId);
  const currentPreset = $derived<HomeExperimentPreset>(
    EXPERIMENT_PRESETS.find((p) => p.id === viewedPresetId) ?? EXPERIMENT_PRESETS[0]
  );

  // Estado del Reproductor de Video Didáctico
  let isPlaying = $state<boolean>(true);
  let currentTime = $state<number>(0);
  let playbackRate = $state<number>(1);
  let customVideoUrl = $state<string | null>(null);
  let fileInputEl = $state<HTMLInputElement | null>(null);

  // Canvas del video demostrativo procedimental (funciona 100% offline sin depender de internet)
  let videoCanvas = $state<HTMLCanvasElement | null>(null);
  let animFrameId: number;
  let lastTick = performance.now();

  // Estado del Mini-Quiz interactivo
  let selectedQuizOption = $state<number | null>(null);

  const totalDuration = $derived(
    currentPreset.videoChapters.reduce((acc, ch) => Math.max(acc, ch.timeSec + ch.durationSec), 15)
  );

  const activeChapterIndex = $derived.by(() => {
    for (let i = currentPreset.videoChapters.length - 1; i >= 0; i--) {
      if (currentTime >= currentPreset.videoChapters[i].timeSec) return i;
    }
    return 0;
  });

  const activeChapter = $derived(currentPreset.videoChapters[activeChapterIndex] ?? currentPreset.videoChapters[0]);

  function selectTab(presetId: string) {
    viewedPresetId = presetId;
    currentTime = 0;
    selectedQuizOption = null;
    isPlaying = true;
  }

  function jumpToChapter(timeSec: number) {
    currentTime = timeSec;
    isPlaying = true;
  }

  function handleCustomVideoUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      if (customVideoUrl) URL.revokeObjectURL(customVideoUrl);
      customVideoUrl = URL.createObjectURL(file);
    }
  }

  function launchExperimentOn3DTable() {
    labStore.loadExperimentPreset(currentPreset.id);
  }

  /**
   * Renderiza la animación de video didáctico paso a paso en el Canvas
   */
  function renderProceduralVideoFrame(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
    const ch = activeChapter;
    const chProgress = Math.min(1, Math.max(0, (t - ch.timeSec) / ch.durationSec));

    // Fondo de estudio de laboratorio casero
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Superficie de mesa de cocina / laboratorio
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, h * 0.74, w, h * 0.26);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.74);
    ctx.lineTo(w, h * 0.74);
    ctx.stroke();

    const cx = w * 0.5;
    const baseY = h * 0.76;

    // Vaso central en el video
    const bw = 110;
    const bh = 135;
    const bx = cx - bw / 2;
    const by = baseY - bh;

    // Nivel de líquido animado según el capítulo
    const fillRatio =
      ch.actionType === 'prep'
        ? 0.38 + chProgress * 0.08
        : ch.actionType === 'pour_acid'
          ? 0.46 + chProgress * 0.16
          : 0.62 + chProgress * 0.18;

    const liqH = bh * fillRatio;
    const liqY = baseY - liqH;

    // Resplandor detrás del vaso con el color actual del pH
    const glow = ctx.createRadialGradient(cx, baseY - bh * 0.4, 10, cx, baseY - bh * 0.4, 120);
    glow.addColorStop(0, ch.simColor + '55');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 140, baseY - bh - 40, 280, bh + 80);

    // Líquido dentro del vaso
    ctx.fillStyle = ch.simColor + 'cc';
    ctx.beginPath();
    ctx.roundRect(bx + 6, liqY, bw - 12, liqH - 4, [0, 0, 12, 12]);
    ctx.fill();

    // Menisco superior del líquido
    ctx.fillStyle = '#ffffff55';
    ctx.beginPath();
    ctx.ellipse(cx, liqY, (bw - 12) / 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Burbujas de reacción química en el líquido
    for (let i = 0; i < 8; i++) {
      const bxOff = Math.sin(t * 3 + i * 1.7) * (bw * 0.32);
      const byOff = ((t * 45 + i * 22) % Math.max(20, liqH - 12));
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.arc(cx + bxOff, baseY - 10 - byOff, 3 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    // Contorno de cristal del vaso graduado
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.85)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, [2, 2, 14, 14]);
    ctx.stroke();

    // Marcas de graduación del vaso en el video
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    for (let m = 1; m <= 4; m++) {
      const my = baseY - (bh * m) / 5;
      ctx.beginPath();
      ctx.moveTo(bx + 14, my);
      ctx.lineTo(bx + 34, my);
      ctx.stroke();
    }

    // Animación del recipiente vertiendo desde arriba
    if (ch.actionType === 'pour_acid' || ch.actionType === 'pour_base' || ch.actionType === 'neutralize') {
      const isLeft = ch.actionType === 'pour_acid';
      const pourColor = isLeft ? currentPreset.acidReagent.colorHex : currentPreset.baseReagent.colorHex;
      const flaskX = isLeft ? cx - 95 : cx + 95;
      const flaskY = by - 28 + Math.sin(chProgress * Math.PI) * 8;
      const tiltAngle = isLeft ? 0.85 : -0.85;

      // Chorro cayendo al vaso
      ctx.strokeStyle = pourColor;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(isLeft ? cx - 22 : cx + 22, by - 16);
      ctx.lineTo(isLeft ? cx - 12 : cx + 12, liqY + 6);
      ctx.stroke();

      // Frasco inclinado
      ctx.save();
      ctx.translate(flaskX, flaskY);
      ctx.rotate(tiltAngle);
      ctx.fillStyle = pourColor + 'aa';
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-24, -36, 48, 72, 8);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Insignia superior con lectura de pH simulada en el video
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(16, 16, 175, 54, 10);
    ctx.fill();
    ctx.strokeStyle = ch.simColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Outfit", sans-serif';
    ctx.fillText('LECTURA EN VIVO', 28, 34);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillText(`pH ${ch.simPh.toFixed(2)}`, 28, 58);

    // Subtítulo explicativo en la parte inferior del video
    ctx.fillStyle = 'rgba(9, 13, 22, 0.88)';
    ctx.beginPath();
    ctx.roundRect(16, h - 68, w - 32, 54, 10);
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px "Outfit", sans-serif';
    ctx.fillText(ch.title.toUpperCase(), 28, h - 48);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '500 12px "Outfit", sans-serif';
    const maxChars = 76;
    const textLine = ch.caption.length > maxChars ? ch.caption.slice(0, maxChars) + '…' : ch.caption;
    ctx.fillText(textLine, 28, h - 26);
  }

  onMount(() => {
    function step(now: number) {
      const dt = Math.min(0.1, (now - lastTick) / 1000);
      lastTick = now;

      if (labStore.isHomeBookOpen && isPlaying && !customVideoUrl) {
        currentTime += dt * playbackRate;
        if (currentTime >= totalDuration) {
          currentTime = 0;
        }
      }

      if (labStore.isHomeBookOpen && videoCanvas && !customVideoUrl) {
        const ctx = videoCanvas.getContext('2d');
        if (ctx) {
          renderProceduralVideoFrame(ctx, videoCanvas.width, videoCanvas.height, currentTime);
        }
      }

      animFrameId = requestAnimationFrame(step);
    }

    animFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrameId);
  });

  onDestroy(() => {
    cancelAnimationFrame(animFrameId);
    if (customVideoUrl) URL.revokeObjectURL(customVideoUrl);
  });
</script>

{#if labStore.isHomeBookOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
    role="dialog"
    aria-modal="true"
    aria-labelledby="home-book-title"
  >
    <!-- Contenedor de Libro Abierto a Doble Página -->
    <div class="relative w-full max-w-5xl bg-slate-950 border-2 border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
      <!-- Cabecera del Libro con Pestañas de Experimentos Caseros -->
      <div class="bg-slate-900/95 border-b border-slate-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <BookOpen class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 id="home-book-title" class="text-base font-extrabold text-white tracking-tight">
                Manual Interactivo de Experimentos Caseros
              </h2>
              <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                SymbioReality · Del Video a la Mesa 3D
              </span>
            </div>
            <p class="text-xs text-slate-400">
              Mira cómo se realiza cada experimento paso a paso y luego ejecútalo tú mismo en el laboratorio 3D
            </p>
          </div>
        </div>

        <!-- Separadores / Pestañas de Experimentos -->
        <div class="flex items-center gap-1.5">
          {#each EXPERIMENT_PRESETS as preset}
            <button
              type="button"
              onclick={() => selectTab(preset.id)}
              class="lab-btn px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer
              {viewedPresetId === preset.id
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-800'}"
            >
              {preset.title.split(' ')[0]} · {preset.badge.split('#')[1] ? `#${preset.badge.split('#')[1]}` : 'Lab'}
            </button>
          {/each}

          <button
            type="button"
            onclick={() => (labStore.isHomeBookOpen = false)}
            class="lab-btn ml-2 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            aria-label="Cerrar manual de experimentos"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Cuerpo del Libro Abierto (2 Páginas: Izquierda Video + Materiales / Derecha Guía Interactiva + Cargar en 3D) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-800/90">
        <!-- PÁGINA IZQUIERDA: Reproductor de Video Demostrativo + Materiales de Casa -->
        <div class="lg:col-span-6 p-6 flex flex-col gap-4 bg-slate-950/60">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold uppercase tracking-wider text-amber-400">{currentPreset.badge}</span>
              <h3 class="text-lg font-extrabold text-white">{currentPreset.title}</h3>
              <p class="text-xs text-slate-400">{currentPreset.subtitle}</p>
            </div>
            <span class="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300">
              ⏱ {currentPreset.durationMin} min · {currentPreset.difficulty}
            </span>
          </div>

          <!-- Pantalla de Video Demostrativo (Animación Procedimental Offline o Video MP4 Local) -->
          <div class="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-inner">
            {#if customVideoUrl}
              <video
                src={customVideoUrl}
                controls
                autoplay
                class="w-full aspect-16/10 object-cover bg-black"
              >
                <track kind="captions" />
              </video>
            {:else}
              <canvas
                bind:this={videoCanvas}
                width="560"
                height="320"
                class="w-full aspect-16/10 block"
              ></canvas>
            {/if}

            <!-- Controles del Video Paso a Paso -->
            {#if !customVideoUrl}
              <div class="bg-slate-900/95 border-t border-slate-800 px-3.5 py-2 flex items-center gap-3">
                <button
                  type="button"
                  onclick={() => (isPlaying = !isPlaying)}
                  class="lab-btn p-1.5 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
                  aria-label={isPlaying ? 'Pausar demostración' : 'Reproducir demostración'}
                >
                  {#if isPlaying}
                    <Pause class="w-4 h-4" />
                  {:else}
                    <Play class="w-4 h-4" />
                  {/if}
                </button>

                <button
                  type="button"
                  onclick={() => (currentTime = 0)}
                  class="lab-btn p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                  title="Reiniciar video"
                >
                  <RotateCcw class="w-3.5 h-3.5" />
                </button>

                <!-- Barra de progreso interactiva -->
                <input
                  type="range"
                  min="0"
                  max={totalDuration}
                  step="0.1"
                  bind:value={currentTime}
                  class="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />

                <span class="font-mono-numbers text-[11px] text-slate-300 font-bold">
                  {currentTime.toFixed(1)}s / {totalDuration}s
                </span>

                <button
                  type="button"
                  onclick={() => (playbackRate = playbackRate === 1 ? 1.5 : 1)}
                  class="text-[10px] font-mono-numbers font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 cursor-pointer"
                >
                  {playbackRate}x
                </button>
              </div>
            {/if}
          </div>

          <!-- Capítulos Interactivos del Video -->
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Pasos del Video (Haz clic para saltar al paso)
              </span>
              <input
                bind:this={fileInputEl}
                type="file"
                accept="video/mp4,video/webm"
                onchange={handleCustomVideoUpload}
                class="hidden"
              />
              <button
                type="button"
                onclick={() => fileInputEl?.click()}
                class="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <Upload class="w-3 h-3" />
                <span>{customVideoUrl ? 'Cambiar video MP4' : 'Cargar video MP4 propio'}</span>
              </button>
            </div>

            <div class="grid grid-cols-1 gap-1.5">
              {#each currentPreset.videoChapters as chapter, idx}
                {@const isCurrent = activeChapterIndex === idx && !customVideoUrl}
                <button
                  type="button"
                  onclick={() => {
                    if (customVideoUrl) customVideoUrl = null;
                    jumpToChapter(chapter.timeSec);
                  }}
                  class="lab-btn text-left p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer
                  {isCurrent
                    ? 'bg-amber-500/15 border-amber-500/50 text-white'
                    : 'bg-slate-900/70 border-slate-800/90 text-slate-300 hover:bg-slate-900'}"
                >
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span
                      class="w-2.5 h-2.5 rounded-full shrink-0"
                      style="background-color: {chapter.simColor}"
                    ></span>
                    <div class="truncate">
                      <span class="text-xs font-bold block truncate">{chapter.title}</span>
                      <span class="text-[11px] text-slate-400 block truncate">{chapter.caption}</span>
                    </div>
                  </div>
                  <span class="font-mono-numbers text-[11px] font-bold px-2 py-0.5 rounded bg-slate-950 text-slate-300 shrink-0">
                    pH {chapter.simPh.toFixed(1)}
                  </span>
                </button>
              {/each}
            </div>
          </div>

          <!-- Lista de Materiales Caseros -->
          <div class="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl flex flex-col gap-2">
            <span class="text-xs font-bold text-slate-200 uppercase tracking-wider">
              🏠 Materiales para hacerlo en casa:
            </span>
            <div class="grid grid-cols-2 gap-2">
              {#each currentPreset.householdMaterials as item}
                <div class="bg-slate-950/80 border border-slate-800/80 p-2 rounded-xl flex items-start gap-2">
                  <span class="text-lg">{item.icon}</span>
                  <div>
                    <span class="text-xs font-bold text-white block">{item.name}</span>
                    <span class="text-[10px] text-slate-400 leading-tight block">{item.role}</span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>

        <!-- PÁGINA DERECHA: Explicación Didáctica, Retos Interactivos, Quiz y Botón "¡Hacerlo en la Mesa 3D!" -->
        <div class="lg:col-span-6 p-6 flex flex-col justify-between gap-4 bg-slate-950/30">
          <div class="flex flex-col gap-4">
            <!-- Resumen y Principio Científico -->
            <div class="bg-indigo-950/40 border border-indigo-500/30 p-4 rounded-2xl flex flex-col gap-2">
              <div class="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                <Sparkles class="w-4 h-4 text-indigo-400" />
                <span>¿Qué ocurre químicamente?</span>
              </div>
              <p class="text-xs text-slate-200 leading-relaxed">{currentPreset.summary}</p>
              <p class="text-xs text-indigo-200/90 bg-indigo-950/60 p-2.5 rounded-xl border border-indigo-500/20 font-medium">
                {currentPreset.scientificPrinciple}
              </p>
            </div>

            <!-- Retos Prácticos Interactivos (Se marcan solos al realizarlos en el laboratorio 3D) -->
            <div class="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col gap-2.5">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <FlaskConical class="w-4 h-4" />
                  Misiones Prácticas en la Mesa 3D
                </span>
                {#if labStore.activePresetId === currentPreset.id}
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Activo en tu mesa 3D
                  </span>
                {/if}
              </div>

              <div class="flex flex-col gap-2">
                {#each currentPreset.interactiveGoals as goal, i}
                  {@const isCompleted =
                    labStore.activePresetId === currentPreset.id && goal.checkFn(labStore.beaker)}
                  <div
                    class="p-2.5 rounded-xl border flex items-center gap-2.5 text-xs
                    {isCompleted
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300'}"
                  >
                    <CheckCircle2
                      class="w-4 h-4 shrink-0 {isCompleted ? 'text-emerald-400' : 'text-slate-600'}"
                    />
                    <span class={isCompleted ? 'line-through font-semibold' : 'font-medium'}>
                      <strong>Paso {i + 1}:</strong> {goal.description}
                    </span>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Mini-Quiz Didáctico de Comprobación -->
            <div class="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col gap-2.5">
              <div class="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <HelpCircle class="w-4 h-4 text-amber-400" />
                <span>Reto Rápido de Comprensión:</span>
              </div>
              <p class="text-xs font-semibold text-white">{currentPreset.quizQuestion.question}</p>

              <div class="flex flex-col gap-1.5">
                {#each currentPreset.quizQuestion.options as opt, idx}
                  {@const isSelected = selectedQuizOption === idx}
                  {@const isCorrect = idx === currentPreset.quizQuestion.correctIndex}
                  <button
                    type="button"
                    onclick={() => (selectedQuizOption = idx)}
                    class="lab-btn text-left p-2.5 rounded-xl border text-xs font-medium cursor-pointer flex items-center justify-between
                    {isSelected
                      ? isCorrect
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 font-bold'
                        : 'bg-rose-950/70 border-rose-500 text-rose-200 font-bold'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:bg-slate-800'}"
                  >
                    <span>{opt}</span>
                    {#if isSelected}
                      <span>{isCorrect ? '✓ Correcto' : '✗ Intenta otra'}</span>
                    {/if}
                  </button>
                {/each}
              </div>

              {#if selectedQuizOption === currentPreset.quizQuestion.correctIndex}
                <p class="text-[11px] text-emerald-300 bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/30">
                  {currentPreset.quizQuestion.explanation}
                </p>
              {/if}
            </div>

            <!-- Nota de Seguridad -->
            <div class="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-900/50 px-3 py-2 rounded-xl border border-slate-800">
              <ShieldCheck class="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{currentPreset.safetyNote}</span>
            </div>
          </div>

          <!-- Acción Principal: Cargar estos mismos reactivos en la Mesa 3D -->
          <button
            type="button"
            onclick={launchExperimentOn3DTable}
            class="lab-btn w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2.5 cursor-pointer shadow-xl shadow-amber-500/20"
          >
            <FlaskConical class="w-5 h-5" />
            <span>¡Hacer este Experimento Ahora en la Mesa 3D!</span>
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
