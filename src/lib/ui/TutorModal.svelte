<script lang="ts">
  import { labStore } from '$lib/interaction/lab_store.svelte';
  import { Lightbulb, X, Check, HelpCircle } from '@lucide/svelte';

  let hypothesisInput = $state<string>(labStore.session.hypothesisText || '');
  let selectedTrend = $state<'increase' | 'decrease' | 'neutral' | ''>(labStore.session.predictionTrend || '');

  const result = $derived(labStore.beaker.currentResult);

  const socraticQuestion = $derived.by(() => {
    if (!result) return null;
    switch (result.diagnosticClass) {
      case 'acid_excess':
        return {
          question: '¿Por qué el pH desciende por debajo de 7 cuando hay exceso de ácido clorhídrico?',
          hint: 'Considera qué ión se encuentra en mayor concentración: ¿hidronio [H⁺] o hidróxido [OH⁻]?'
        };
      case 'base_excess':
        return {
          question: '¿Qué relación observas entre la concentración de OH⁻ añadida y el incremento del valor de pH?',
          hint: 'Recuerda que cada unidad de pH representa una escala logarítmica (factor de 10).'
        };
      case 'near_equivalence':
        return {
          question: '¡Punto de equivalencia alcanzado! ¿Cuántos moles de ácido neutralizan exactamente a los moles de base?',
          hint: 'En neutralización de ácido fuerte con base fuerte equimolar: n(ácido) = n(base).'
        };
      default:
        return {
          question: '¿Cómo influye el volumen inicial de agua destilada antes de agregar los reactivos?',
          hint: 'El agua aporta volumen total, diluyendo la concentración efectiva de los iones agregados.'
        };
    }
  });

  function handleSave() {
    if (selectedTrend) {
      labStore.saveHypothesis(hypothesisInput, selectedTrend);
    }
  }
</script>

{#if labStore.isHypothesisModalOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="tutor-dialog-title"
  >
    <div class="lab-panel p-6 max-w-lg w-full flex flex-col gap-4 border border-slate-700/80">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Lightbulb class="w-5 h-5" />
          </div>
          <div>
            <h2 id="tutor-dialog-title" class="text-base font-bold text-white">Tutor Socrático · Método Científico</h2>
            <p class="text-xs text-slate-400">Planteamiento de hipótesis y análisis de evidencias</p>
          </div>
        </div>
        <button
          type="button"
          onclick={() => (labStore.isHypothesisModalOpen = false)}
          class="lab-btn p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="flex flex-col gap-3">
        <p class="text-xs font-semibold text-slate-200">
          1. Predicción: Si mantienes el volumen constante y agregas base fuerte (NaOH), ¿qué tendencia esperas en el pH?
        </p>

        <div class="grid grid-cols-3 gap-2">
          <button
            type="button"
            onclick={() => (selectedTrend = 'increase')}
            class="lab-btn p-2.5 rounded-xl border text-center text-xs font-bold cursor-pointer min-h-[44px]
            {selectedTrend === 'increase'
              ? 'bg-indigo-600 text-white border-indigo-400'
              : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800'}"
          >
            Subirá (pH &gt; 7)
          </button>
          <button
            type="button"
            onclick={() => (selectedTrend = 'neutral')}
            class="lab-btn p-2.5 rounded-xl border text-center text-xs font-bold cursor-pointer min-h-[44px]
            {selectedTrend === 'neutral'
              ? 'bg-indigo-600 text-white border-indigo-400'
              : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800'}"
          >
            Neutro (~7)
          </button>
          <button
            type="button"
            onclick={() => (selectedTrend = 'decrease')}
            class="lab-btn p-2.5 rounded-xl border text-center text-xs font-bold cursor-pointer min-h-[44px]
            {selectedTrend === 'decrease'
              ? 'bg-indigo-600 text-white border-indigo-400'
              : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800'}"
          >
            Bajará (pH &lt; 7)
          </button>
        </div>

        <div class="flex flex-col gap-1.5 mt-1">
          <label for="hypothesis-text" class="text-xs font-semibold text-slate-300">
            2. Justifica tu hipótesis científica:
          </label>
          <textarea
            id="hypothesis-text"
            rows="3"
            bind:value={hypothesisInput}
            placeholder="Explica qué ocurre con los iones [H⁺] y [OH⁻] al mezclar las disoluciones..."
            class="w-full text-xs p-3 rounded-xl bg-slate-950/90 text-slate-100 border border-slate-700 focus:outline-none focus:border-indigo-500 resize-none"
          ></textarea>
        </div>
      </div>

      {#if socraticQuestion && labStore.session.trials.length > 0}
        <div class="bg-indigo-950/50 border border-indigo-500/30 p-3.5 rounded-xl flex flex-col gap-1.5">
          <div class="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
            <HelpCircle class="w-4 h-4 text-indigo-400" />
            <span>Pregunta Socrática sobre tu experimento actual:</span>
          </div>
          <p class="text-xs text-white font-semibold">{socraticQuestion.question}</p>
          <p class="text-[11px] text-indigo-300/80 italic">Pista: {socraticQuestion.hint}</p>
        </div>
      {/if}

      <button
        type="button"
        onclick={handleSave}
        disabled={!selectedTrend}
        class="lab-btn w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Check class="w-4 h-4" />
        <span>Registrar Hipótesis en el Cuaderno</span>
      </button>
    </div>
  </div>
{/if}
