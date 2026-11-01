<script lang="ts">
  import { labStore, EXPERIMENT_PRESETS } from '$lib/interaction/lab_store.svelte';
  import { labSound } from '$lib/audio/lab_sound';
  import {
    FlaskConical,
    BookOpen,
    RotateCcw,
    Video,
    MousePointer,
    Lightbulb,
    Activity,
    BookMarked,
    CheckCircle2,
    ChevronRight,
    ChevronLeft,
    Volume2,
    VolumeX,
    X,
    Compass,
    Layers,
    Sparkles,
    Beaker
  } from '@lucide/svelte';

  const result = $derived(labStore.beaker.currentResult);
  const band = $derived(result?.indicatorBand);
  const activePreset = $derived(labStore.activePreset);
</script>

<!-- 1. PESTAÑA LATERAL IZQUIERDA DESPLEGABLE (NAVEGACIÓN Y FUNCIONES DEL PROYECTO) -->
<aside
  class="fixed top-0 left-0 bottom-0 z-30 flex items-center pointer-events-none"
  aria-label="Menú lateral de funciones del laboratorio"
>
  <!-- Cajón lateral izquierdo (se despliega suavemente al abrir la pestaña) -->
  <div
    class="pointer-events-auto h-full w-80 bg-slate-950/92 backdrop-blur-xl border-r border-slate-800/90 shadow-2xl flex flex-col justify-between p-4 transition-transform duration-300 ease-out
    {labStore.isLeftSidebarOpen ? 'translate-x-0' : '-translate-x-full'}"
  >
    <div class="flex flex-col gap-4 overflow-y-auto pr-1">
      <!-- Encabezado de la Pestaña Izquierda -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="flex items-center gap-2.5">
          <div class="bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 p-2 rounded-xl">
            <FlaskConical class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <h1 class="font-bold text-sm tracking-tight text-white">SymbioLab 3D</h1>
              <span class="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Local
              </span>
            </div>
            <p class="text-[11px] text-slate-400">Centro de Funciones y Módulos</p>
          </div>
        </div>
        <button
          type="button"
          onclick={() => (labStore.isLeftSidebarOpen = false)}
          class="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          title="Ocultar pestaña izquierda"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
      </div>

      <!-- SECCIÓN A: NIVEL EDUCATIVO Y EXPERIMENTOS (PRIMARIA / SECUNDARIA / EXPLORACIÓN) -->
      <div class="flex flex-col gap-2">
        <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <Compass class="w-3.5 h-3.5 text-amber-400" />
          Niveles y Modos de Laboratorio
        </span>

        <button
          type="button"
          onclick={() => {
            labStore.isLeftSidebarOpen = false;
            labSound.playBookOpen();
            labStore.isHomeBookOpen = true;
          }}
          class="lab-btn w-full p-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 font-extrabold text-xs flex items-center justify-between cursor-pointer"
        >
          <span class="flex items-center gap-2">
            <BookMarked class="w-4 h-4 text-amber-400" />
            Abrir Libro 3D (Primaria/Secundaria)
          </span>
          <ChevronRight class="w-4 h-4" />
        </button>

        <button
          type="button"
          onclick={() => {
            labStore.isLeftSidebarOpen = false;
            labStore.enterExploration();
          }}
          class="lab-btn w-full p-2.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/50 text-teal-200 font-extrabold text-xs flex items-center justify-between cursor-pointer"
        >
          <span class="flex items-center gap-2">
            <Beaker class="w-4 h-4 text-teal-400" />
            Modo Exploración Libre (Catálogo + AR)
          </span>
          <ChevronRight class="w-4 h-4" />
        </button>

        <div class="grid grid-cols-1 gap-1.5 pt-1">
          {#each EXPERIMENT_PRESETS as preset}
            {@const isCurrent = labStore.activePresetId === preset.id}
            <button
              type="button"
              onclick={() => {
                labStore.loadExperimentPreset(preset.id);
                labStore.isLeftSidebarOpen = false;
              }}
              class="text-left p-2 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between
              {isCurrent
                ? 'bg-indigo-950/70 border-indigo-500/70 text-white font-bold'
                : 'bg-slate-900/70 border-slate-800/80 text-slate-300 hover:bg-slate-800/70'}"
            >
              <div class="truncate pr-2">
                <span class="text-[9px] uppercase font-extrabold block {preset.level === 'primaria' ? 'text-emerald-400' : 'text-indigo-400'}">
                  {preset.level === 'primaria' ? '🎒 Primaria' : '🔬 Secundaria'}
                </span>
                <span class="truncate block text-[11px]">{preset.title}</span>
              </div>
              {#if isCurrent}
                <span class="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <!-- SECCIÓN B: FUNCIONES PRINCIPALES DEL LABORATORIO -->
      <div class="flex flex-col gap-1.5 pt-2 border-t border-slate-800/80">
        <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <Sparkles class="w-3.5 h-3.5 text-indigo-400" />
          Herramientas y Asistentes
        </span>

        <button
          type="button"
          onclick={() => {
            labStore.isLeftSidebarOpen = false;
            labStore.isHypothesisModalOpen = true;
          }}
          class="lab-btn w-full px-3 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold flex items-center justify-between cursor-pointer"
        >
          <span class="flex items-center gap-2">
            <Lightbulb class="w-4 h-4 text-amber-400" />
            Tutor Socrático IA
          </span>
          {#if labStore.session.hypothesisText}
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          {/if}
        </button>

        <button
          type="button"
          onclick={() => {
            labStore.isLeftSidebarOpen = false;
            labStore.isNotebookOpen = true;
          }}
          class="lab-btn w-full px-3 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold flex items-center justify-between cursor-pointer"
        >
          <span class="flex items-center gap-2">
            <BookOpen class="w-4 h-4 text-indigo-400" />
            Cuaderno de Datos (CSV/JSON)
          </span>
          {#if labStore.session.trials.length > 0}
            <span class="bg-indigo-500 text-white text-[10px] font-mono-numbers font-bold px-1.5 py-0.5 rounded-md">
              {labStore.session.trials.length}
            </span>
          {/if}
        </button>

        <button
          type="button"
          onclick={() => {
            labStore.isLeftSidebarOpen = false;
            labStore.isCameraModalOpen = true;
          }}
          class="lab-btn w-full px-3 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold flex items-center justify-between cursor-pointer"
        >
          <span class="flex items-center gap-2">
            {#if labStore.isCameraActive}
              <Video class="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Manos AR Activas</span>
            {:else}
              <MousePointer class="w-4 h-4 text-sky-400" />
              <span>Control con Manos (AR MediaPipe)</span>
            {/if}
          </span>
        </button>

        <button
          type="button"
          onclick={() => labStore.toggleSound()}
          class="lab-btn w-full px-3 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold flex items-center justify-between cursor-pointer"
        >
          <span class="flex items-center gap-2">
            {#if labStore.soundEnabled}
              <Volume2 class="w-4 h-4 text-emerald-400" />
              <span>Sonidos del Laboratorio: ON</span>
            {:else}
              <VolumeX class="w-4 h-4 text-slate-500" />
              <span>Sonidos del Laboratorio: OFF</span>
            {/if}
          </span>
        </button>
      </div>

      <!-- SECCIÓN C: NAVEGACIÓN DE PRÓXIMAS FUNCIONES / MÓDULOS EXPANDIBLES -->
      <div class="flex flex-col gap-1.5 pt-2 border-t border-slate-800/80">
        <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <Layers class="w-3.5 h-3.5 text-emerald-400" />
          Espacio para Nuevas Funciones
        </span>
        <div class="p-2.5 rounded-xl bg-slate-900/50 border border-dashed border-slate-700/80 text-[11px] text-slate-400 flex flex-col gap-1.5">
          <p class="leading-relaxed">
            Esta pestaña lateral está lista para alojar las nuevas funciones y módulos que agregues al proyecto.
          </p>
          <div class="grid grid-cols-2 gap-1.5 pt-1">
            <span class="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300 text-center">
              + Nuevo Módulo 1
            </span>
            <span class="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300 text-center">
              + Nuevo Módulo 2
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Pie de la Pestaña Izquierda: Reiniciar Estación -->
    <div class="pt-3 border-t border-slate-800">
      <button
        type="button"
        onclick={() => {
          labStore.resetExperiment();
          labStore.isLeftSidebarOpen = false;
        }}
        class="lab-btn w-full py-2.5 px-3 rounded-xl bg-rose-950/50 hover:bg-rose-900/70 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
      >
        <RotateCcw class="w-4 h-4" />
        <span>Reiniciar Mesa 3D</span>
      </button>
    </div>
  </div>

  <!-- Solapa / Pestaña vertical pegada al borde izquierdo para abrir/cerrar sin estorbar la vista 3D -->
  <button
    type="button"
    onclick={() => (labStore.isLeftSidebarOpen = !labStore.isLeftSidebarOpen)}
    class="pointer-events-auto -ml-px py-4 px-2.5 rounded-r-2xl bg-slate-950/90 hover:bg-indigo-950/95 text-slate-200 border border-l-0 border-slate-700/80 shadow-xl flex flex-col items-center gap-2 cursor-pointer transition-transform duration-300 ease-out
    {labStore.isLeftSidebarOpen ? 'translate-x-0' : '-translate-x-80'}"
    title={labStore.isLeftSidebarOpen ? 'Ocultar pestaña de funciones' : 'Abrir pestaña de funciones y navegación'}
  >
    {#if labStore.isLeftSidebarOpen}
      <ChevronLeft class="w-4 h-4 text-indigo-400" />
    {:else}
      <ChevronRight class="w-4 h-4 text-amber-400" />
    {/if}
    <span class="text-[10px] font-extrabold uppercase tracking-widest [writing-mode:vertical-lr] rotate-180 text-slate-200">
      Funciones
    </span>
  </button>
</aside>

<!-- 2. FICHA CONTEXTUAL: SENSOR DIGITAL DE pH (SOLO APARECE CUANDO EL USUARIO USA EL MATERIAL O EL pH-METRO) -->
{#if labStore.isSensorCardVisible}
  <div class="fixed top-4 right-4 z-20 pointer-events-auto w-76 animate-in fade-in duration-200">
    <div class="lab-panel p-4 flex flex-col gap-2.5 border border-slate-700/80 shadow-2xl">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Activity class="w-3.5 h-3.5 text-indigo-400" />
          Sensor Digital de pH
        </span>
        <div class="flex items-center gap-1.5">
          <span
            class="text-[10px] font-bold px-2 py-0.5 rounded-md text-white"
            style="background-color: {band?.colorHex || '#10b981'}"
          >
            {band?.name || 'Neutro'}
          </span>
          <button
            type="button"
            onclick={() => (labStore.isSensorCardVisible = false)}
            class="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
            title="Ocultar ficha de Sensor Digital"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div class="flex items-baseline justify-between">
        <div class="flex items-baseline gap-1.5">
          <span class="font-mono-numbers text-3xl font-extrabold tracking-tight text-white">
            {result?.pH.toFixed(2) ?? '7.00'}
          </span>
          <span class="text-xs font-bold text-slate-400">pH</span>
        </div>
        <div class="text-right">
          <span class="text-[10px] text-slate-400 block uppercase font-semibold">Temp / Vol</span>
          <span class="font-mono-numbers text-xs font-bold text-slate-200">
            {labStore.beaker.temperatureC}°C · {labStore.totalVolumeMl} mL
          </span>
        </div>
      </div>

      <!-- Escala de Indicador Universal 0 - 14 -->
      <div>
        <div class="h-2 w-full rounded-full overflow-hidden flex border border-slate-700/80">
          <div class="h-full w-[21.4%] bg-red-500" title="0 - 3: Muy ácido"></div>
          <div class="h-full w-[21.4%] bg-amber-400" title="3 - 6: Ácido"></div>
          <div class="h-full w-[14.4%] bg-emerald-500" title="6 - 8: Neutro"></div>
          <div class="h-full w-[21.4%] bg-blue-500" title="8 - 11: Básico"></div>
          <div class="h-full w-[21.4%] bg-purple-600" title="11 - 14: Muy básico"></div>
        </div>
        <div class="relative w-full h-2 mt-0.5">
          <div
            class="absolute top-0 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-white transition-[left] duration-200 ease-out"
            style="left: {((result?.pH ?? 7) / 14) * 100}%"
          ></div>
        </div>
      </div>

      <!-- Balance Volumétrico en el Vaso -->
      <div class="grid grid-cols-3 gap-1.5 text-center text-[10px] pt-1 border-t border-slate-800/80">
        <div class="bg-slate-800/80 py-1 px-1.5 rounded-lg">
          <span class="text-slate-400 block text-[9px] font-bold">H₂O</span>
          <span class="font-mono-numbers font-bold text-sky-300">{labStore.beaker.waterMl} mL</span>
        </div>
        <div class="bg-rose-950/40 border border-rose-500/30 py-1 px-1.5 rounded-lg">
          <span class="text-rose-300/70 block text-[9px] font-bold truncate">{labStore.reagents[0].formula.split(' ')[0]}</span>
          <span class="font-mono-numbers font-bold text-rose-300">{labStore.beaker.acidVolumeMl} mL</span>
        </div>
        <div class="bg-violet-950/40 border border-violet-500/30 py-1 px-1.5 rounded-lg">
          <span class="text-violet-300/70 block text-[9px] font-bold truncate">{labStore.reagents[1].formula.split(' ')[0]}</span>
          <span class="font-mono-numbers font-bold text-violet-300">{labStore.beaker.baseVolumeMl} mL</span>
        </div>
      </div>

      <!-- Objetivos rápidos del experimento actual -->
      <div class="pt-1.5 border-t border-slate-800/80 flex flex-col gap-1">
        {#each activePreset.interactiveGoals as goal}
          {@const done = goal.checkFn(labStore.beaker)}
          <div class="flex items-start gap-1.5 text-[10px] {done ? 'text-emerald-300' : 'text-slate-300'}">
            <CheckCircle2 class="w-3 h-3 shrink-0 mt-0.5 {done ? 'text-emerald-400' : 'text-slate-600'}" />
            <span class="leading-tight {done ? 'line-through opacity-80' : ''}">{goal.description}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}
