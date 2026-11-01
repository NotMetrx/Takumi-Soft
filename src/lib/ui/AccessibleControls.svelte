<script lang="ts">
  import { labStore } from '$lib/interaction/lab_store.svelte';
  import { Beaker, CheckCircle2, AlertCircle, Droplets } from '@lucide/svelte';

  let customPourMl = $state<number>(10);
  const selectedReagent = $derived(labStore.selectedReagent);
</script>

<div class="lab-panel p-4 flex flex-col gap-3 w-80">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <Beaker class="w-4 h-4 text-indigo-400" />
      <h2 class="text-xs font-bold uppercase tracking-wider text-slate-200">Dosificador de Precisión</h2>
    </div>
    <span class="text-[10px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60">
      Paridad Accesible
    </span>
  </div>

  <!-- Selector de Matraces Reactivos -->
  <div class="grid grid-cols-2 gap-2">
    {#each labStore.reagents as reagent}
      {@const isSelected = labStore.selectedReagentId === reagent.reagentId}
      <button
        type="button"
        onclick={() => labStore.selectReagent(reagent.reagentId)}
        class="lab-btn p-2.5 rounded-xl border text-left flex flex-col gap-1 cursor-pointer min-h-[54px]
        {isSelected
          ? reagent.kind === 'strong_acid'
            ? 'bg-rose-950/60 border-rose-500/80 text-white shadow-sm'
            : 'bg-violet-950/60 border-violet-500/80 text-white shadow-sm'
          : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-800/80'}"
        aria-pressed={isSelected}
      >
        <div class="flex items-center justify-between">
          <span class="font-mono-numbers font-extrabold text-xs {reagent.kind === 'strong_acid' ? 'text-rose-400' : 'text-violet-400'}">
            {reagent.formula}
          </span>
          {#if isSelected}
            <CheckCircle2 class="w-3.5 h-3.5 {reagent.kind === 'strong_acid' ? 'text-rose-400' : 'text-violet-400'}" />
          {/if}
        </div>
        <span class="text-[11px] font-semibold text-slate-200 truncate">{reagent.name}</span>
        <span class="font-mono-numbers text-[10px] text-slate-400 font-bold">{reagent.remainingMl} mL disp.</span>
      </button>
    {/each}
  </div>

  <!-- Control de Volumen Exacto -->
  <div class="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
    <div class="flex items-center justify-between text-xs font-bold">
      <label for="pour-volume-slider" class="text-slate-400">Volumen a dosificar:</label>
      <span class="font-mono-numbers text-white text-sm">{customPourMl} mL</span>
    </div>

    <input
      id="pour-volume-slider"
      type="range"
      min="1"
      max={Math.max(1, Math.min(50, selectedReagent?.remainingMl ?? 50, labStore.availableCapacityMl))}
      step="1"
      bind:value={customPourMl}
      class="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
    />

    <div class="grid grid-cols-3 gap-1.5 pt-0.5">
      {#each [5, 10, 25] as ml}
        <button
          type="button"
          onclick={() => {
            customPourMl = ml;
            if (selectedReagent) {
              labStore.triggerAnimatedPour(selectedReagent.reagentId, ml, 'mouse');
            }
          }}
          disabled={!!labStore.activePourAnim || ml > (selectedReagent?.remainingMl ?? 0) || ml > labStore.availableCapacityMl}
          class="lab-btn py-1.5 px-2 bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 rounded-lg text-[11px] font-mono-numbers font-bold text-slate-200 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
        >
          +{ml} mL
        </button>
      {/each}
    </div>
  </div>

  <!-- Botón Principal con Animación 3D de Vertido -->
  <button
    type="button"
    onclick={() => {
      if (selectedReagent) {
        labStore.triggerAnimatedPour(selectedReagent.reagentId, customPourMl, 'mouse');
      }
    }}
    disabled={!!labStore.activePourAnim || !selectedReagent || selectedReagent.remainingMl <= 0 || labStore.availableCapacityMl <= 0}
    class="lab-btn w-full py-3 px-4 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 cursor-pointer min-h-[44px] shadow-lg
    {selectedReagent?.kind === 'strong_acid'
      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25'
      : 'bg-violet-600 hover:bg-violet-500 shadow-violet-600/25'}
    disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed"
  >
    <Droplets class="w-4 h-4" />
    <span>{labStore.activePourAnim ? 'Vertiendo…' : `Verter ${customPourMl} mL de ${selectedReagent?.formula.split(' ')[0] ?? ''}`}</span>
  </button>

  {#if labStore.availableCapacityMl <= 0}
    <div class="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-950/60 p-2 rounded-lg border border-amber-500/40">
      <AlertCircle class="w-4 h-4 shrink-0" />
      <span>Vaso en capacidad máxima (250 mL).</span>
    </div>
  {/if}
</div>
