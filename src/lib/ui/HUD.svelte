<script lang="ts">
  import { labStore } from '$lib/interaction/lab_store.svelte';
  import {
    FlaskConical,
    BookOpen,
    RotateCcw,
    Video,
    MousePointer,
    Lightbulb,
    Activity,
    BookMarked,
    CheckCircle2
  } from '@lucide/svelte';

  const result = $derived(labStore.beaker.currentResult);
  const band = $derived(result?.indicatorBand);
  const activePreset = $derived(labStore.activePreset);
</script>

<header class="absolute top-0 left-0 right-0 z-20 p-4 pointer-events-none">
  <div class="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
    <!-- Identidad del Laboratorio y Experimento Activo -->
    <div class="lab-panel px-4 py-2.5 pointer-events-auto flex items-center gap-3">
      <div class="bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 p-2 rounded-xl flex items-center justify-center">
        <FlaskConical class="w-5 h-5" />
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="font-bold text-base tracking-tight text-white">SymbioLab</h1>
          <span class="text-[10px] font-mono-numbers font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {activePreset.badge}
          </span>
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Local
          </span>
        </div>
        <p class="text-[11px] text-slate-300 font-medium">{activePreset.title} · {activePreset.subtitle}</p>
      </div>
    </div>

    <!-- Barra de Herramientas Derecha -->
    <div class="flex items-center gap-2 pointer-events-auto">
      <button type="button" onclick={() => labStore.enterExploration()} class="lab-btn lab-panel px-3 py-2 text-xs font-bold">Exploración libre</button>
      <!-- Botón Destacado: Libro de Experimentos Caseros (también clicable en la mesa 3D) -->
      <button
        type="button"
        onclick={() => (labStore.isHomeBookOpen = true)}
        class="lab-btn px-3.5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 border cursor-pointer min-h-[42px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/50 shadow-lg shadow-amber-500/10"
      >
        <BookMarked class="w-4 h-4 text-amber-400" />
        <span>Libro de actividades</span>
      </button>

      <button
        type="button"
        onclick={() => (labStore.isCameraModalOpen = true)}
        class="lab-btn px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border cursor-pointer min-h-[42px]
        {labStore.inputMode === 'gesture'
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          : 'lab-panel text-slate-200 hover:bg-slate-800/90'}"
      >
        {#if labStore.inputMode === 'gesture'}
          <Video class="w-4 h-4 text-amber-400 animate-pulse" />
          <span>SymbioTouch Activo</span>
        {:else}
          <MousePointer class="w-4 h-4 text-indigo-400" />
          <span>Control: Mouse / 3D</span>
        {/if}
      </button>

      <button
        type="button"
        onclick={() => (labStore.isHypothesisModalOpen = true)}
        class="lab-btn lab-panel hover:bg-slate-800/90 text-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer min-h-[42px]"
      >
        <Lightbulb class="w-4 h-4 text-amber-400" />
        <span>Tutor Socrático</span>
        {#if labStore.session.hypothesisText}
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
        {/if}
      </button>

      <button
        type="button"
        onclick={() => (labStore.isNotebookOpen = true)}
        class="lab-btn lab-panel hover:bg-slate-800/90 text-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer min-h-[42px]"
      >
        <BookOpen class="w-4 h-4 text-indigo-400" />
        <span>Cuaderno</span>
        {#if labStore.session.trials.length > 0}
          <span class="bg-indigo-500 text-white text-[10px] font-mono-numbers font-bold px-1.5 py-0.5 rounded-md">
            {labStore.session.trials.length}
          </span>
        {/if}
      </button>

      <button
        type="button"
        onclick={() => labStore.resetExperiment()}
        class="lab-btn lab-panel hover:bg-rose-950/80 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 p-2.5 rounded-xl cursor-pointer min-h-[42px]"
        title="Reiniciar estación química"
        aria-label="Reiniciar estación química"
      >
        <RotateCcw class="w-4 h-4" />
      </button>
    </div>
  </div>

  <!-- Telemetría Científica Compacta + Misiones del Libro (Izquierda) -->
  <div class="max-w-[1440px] mx-auto mt-3 flex flex-col gap-2.5 items-start pointer-events-none">
    <div class="lab-panel p-4 pointer-events-auto flex flex-col gap-3 w-76">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Activity class="w-3.5 h-3.5 text-indigo-400" />
          Sensor Digital de pH
        </span>
        <span
          class="text-[11px] font-bold px-2 py-0.5 rounded-md text-white shadow-xs"
          style="background-color: {band?.colorHex || '#10b981'}"
        >
          {band?.name || 'Neutro'}
        </span>
      </div>

      <div class="flex items-baseline justify-between">
        <div class="flex items-baseline gap-1.5">
          <span class="font-mono-numbers text-4xl font-extrabold tracking-tight text-white">
            {result?.pH.toFixed(2) ?? '7.00'}
          </span>
          <span class="text-xs font-bold text-slate-400">pH</span>
        </div>
        <div class="text-right">
          <span class="text-[10px] text-slate-400 block uppercase font-semibold">Iones Hidronio</span>
          <span class="font-mono-numbers text-xs font-bold text-slate-200">
            [H⁺] = {result?.hydroniumConcentrationMolPerL.toExponential(1) ?? '1.0e-7'} M
          </span>
        </div>
      </div>

      <!-- Escala de Indicador Universal 0 - 14 -->
      <div>
        <div class="h-2.5 w-full rounded-full overflow-hidden flex border border-slate-700/80">
          <div class="h-full w-[21.4%] bg-red-500" title="0 - 3: Muy ácido"></div>
          <div class="h-full w-[21.4%] bg-amber-400" title="3 - 6: Ácido"></div>
          <div class="h-full w-[14.4%] bg-emerald-500" title="6 - 8: Neutro"></div>
          <div class="h-full w-[21.4%] bg-blue-500" title="8 - 11: Básico"></div>
          <div class="h-full w-[21.4%] bg-purple-600" title="11 - 14: Muy básico"></div>
        </div>
        <div class="relative w-full h-2.5 mt-1">
          <div
            class="absolute top-0 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[7px] border-b-white transition-[left] duration-200 ease-out"
            style="left: {((result?.pH ?? 7) / 14) * 100}%"
          ></div>
        </div>
        <div class="flex justify-between text-[10px] font-mono-numbers text-slate-400 font-bold">
          <span>0 (Ácido)</span>
          <span>7 (Neutro)</span>
          <span>14 (Base)</span>
        </div>
      </div>

      <!-- Balance Volumétrico en el Vaso -->
      <div class="pt-2 border-t border-slate-800 flex flex-col gap-1.5">
        <div class="flex items-center justify-between text-[11px]">
          <span class="text-slate-400 font-semibold">Volumen en Vaso:</span>
          <span class="font-mono-numbers font-bold text-slate-200">{labStore.totalVolumeMl} / {labStore.beaker.capacityMl} mL</span>
        </div>
        <div class="grid grid-cols-3 gap-1.5 text-center text-[11px] pt-0.5">
          <div class="bg-slate-800/80 border border-slate-700/60 py-1 px-1.5 rounded-lg">
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
      </div>

      <!-- Pasos Guiados del Experimento Activo (Checklist en vivo) -->
      <div class="pt-2 border-t border-slate-800 flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            Misión Práctica Activa
          </span>
          <button
            type="button"
            onclick={() => (labStore.isHomeBookOpen = true)}
            class="text-[10px] text-indigo-300 hover:text-white underline cursor-pointer"
          >
            Ver video
          </button>
        </div>
        {#each activePreset.interactiveGoals as goal}
          {@const done = goal.checkFn(labStore.beaker)}
          <div class="flex items-start gap-1.5 text-[11px] {done ? 'text-emerald-300' : 'text-slate-300'}">
            <CheckCircle2 class="w-3.5 h-3.5 shrink-0 mt-0.5 {done ? 'text-emerald-400' : 'text-slate-600'}" />
            <span class="leading-tight {done ? 'line-through opacity-80' : ''}">{goal.description}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</header>
