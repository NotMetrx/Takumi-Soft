<script lang="ts">
  import { labStore } from '$lib/interaction/lab_store.svelte';
  import { X, FileSpreadsheet, FileJson, BookOpen, ShieldCheck } from '@lucide/svelte';

  const result = $derived(labStore.beaker.currentResult);
  const trials = $derived(labStore.session.trials);

  // Puntos para la curva de titulación SVG (pH 0..14 vs ensayos)
  const chartPoints = $derived.by(() => {
    const pts = [{ vol: 50, ph: 7.0 }];
    for (const t of trials) {
      pts.push({ vol: t.accumulatedVolumeMl, ph: t.resultingPh });
    }
    return pts;
  });

  const polylineStr = $derived.by(() => {
    if (chartPoints.length < 2) return '';
    return chartPoints
      .map((pt, idx) => {
        const x = 28 + (idx / Math.max(1, chartPoints.length - 1)) * 260;
        const y = 110 - (pt.ph / 14) * 95;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });
</script>

{#if labStore.isNotebookOpen}
  <div
    class="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs"
    role="dialog"
    aria-modal="true"
    aria-labelledby="notebook-drawer-title"
  >
    <div class="w-full max-w-md bg-slate-950/95 h-full shadow-2xl flex flex-col border-l border-slate-800 text-slate-100">
      <!-- Encabezado -->
      <div class="p-4 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="p-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
            <BookOpen class="w-5 h-5" />
          </div>
          <div>
            <h2 id="notebook-drawer-title" class="text-sm font-bold text-white">Cuaderno de Laboratorio</h2>
            <p class="text-[11px] text-slate-400">Trazabilidad científica y exportación offline</p>
          </div>
        </div>
        <button
          type="button"
          onclick={() => (labStore.isNotebookOpen = false)}
          class="lab-btn p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <!-- Gráfica de Curva de Titulación pH vs Ensayo -->
        <div class="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-300">Curva de Titulación (pH vs Volumen)</span>
            <span class="font-mono-numbers text-[11px] text-indigo-400 font-bold">pH actual: {result?.pH.toFixed(2) ?? '7.00'}</span>
          </div>
          <svg viewBox="0 0 310 125" class="w-full h-28 bg-slate-950 rounded-lg border border-slate-800/80">
            <!-- Líneas guía de pH 14, 7, 0 -->
            <line x1="28" y1="15" x2="295" y2="15" stroke="#1e293b" stroke-dasharray="3,3" />
            <line x1="28" y1="62.5" x2="295" y2="62.5" stroke="#10b981" stroke-opacity="0.35" stroke-dasharray="4,4" />
            <line x1="28" y1="110" x2="295" y2="110" stroke="#1e293b" />
            <text x="6" y="19" fill="#64748b" font-size="9" font-family="monospace">14</text>
            <text x="11" y="65" fill="#10b981" font-size="9" font-family="monospace">7</text>
            <text x="11" y="112" fill="#64748b" font-size="9" font-family="monospace">0</text>

            {#if chartPoints.length >= 2}
              <polyline
                fill="none"
                stroke="#818cf8"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                points={polylineStr}
              />
            {/if}

            {#each chartPoints as pt, idx}
              {@const cx = 28 + (idx / Math.max(1, chartPoints.length - 1)) * 260}
              {@const cy = 110 - (pt.ph / 14) * 95}
              <circle cx={cx} cy={cy} r="3.5" fill="#f8fafc" stroke="#6366f1" stroke-width="2" />
            {/each}
          </svg>
        </div>

        <!-- Hipótesis Registrada -->
        <div class="bg-indigo-950/40 border border-indigo-500/30 p-3.5 rounded-xl flex flex-col gap-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Hipótesis Registrada</span>
          {#if labStore.session.hypothesisText}
            <p class="text-xs text-white italic">«{labStore.session.hypothesisText}»</p>
          {:else}
            <p class="text-xs text-slate-400 italic">Sin hipótesis registrada aún.</p>
          {/if}
        </div>

        <!-- Historial de Ensayos -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">Registro de Vertidos</span>
            <span class="text-[11px] font-mono-numbers text-slate-400 font-bold">{trials.length} eventos</span>
          </div>

          {#if trials.length === 0}
            <div class="text-center py-6 text-xs text-slate-500 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
              Vierte un reactivo en el vaso para registrar datos experimentales.
            </div>
          {:else}
            <div class="flex flex-col gap-1.5">
              {#each trials as trial}
                <div class="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <span class="w-3 h-3 rounded-full shrink-0" style="background-color: {trial.indicatorColor}"></span>
                    <div>
                      <span class="text-xs font-bold text-slate-100 block">
                        +{trial.volumeAddedMl} mL · {trial.reagentName}
                      </span>
                      <span class="text-[10px] text-slate-400">
                        {trial.timestamp} · Vol. Total: {trial.accumulatedVolumeMl} mL
                      </span>
                    </div>
                  </div>
                  <div class="text-right">
                    <span class="font-mono-numbers text-sm font-extrabold text-white block">
                      pH {trial.resultingPh.toFixed(2)}
                    </span>
                    <span class="text-[9px] uppercase font-bold text-slate-400">{trial.inputMode}</span>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Science Evidence Card -->
        <div class="bg-slate-900/70 border border-slate-800 p-3.5 rounded-xl flex flex-col gap-1.5">
          <div class="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <ShieldCheck class="w-4 h-4" />
            <span>Science Evidence Card</span>
          </div>
          <div class="text-[11px] text-slate-300 space-y-1 font-mono-numbers">
            <div>Modelo: {result?.modelId ?? 'strong-acid-base-25C-v1'}</div>
            <div>Ecuación: [H⁺]² - d·[H⁺] - Kw = 0 (Kw = 10⁻¹⁴)</div>
          </div>
        </div>
      </div>

      <!-- Exportación Offline -->
      <div class="p-4 border-t border-slate-800 bg-slate-900/80 flex flex-col gap-2">
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            onclick={() => labStore.exportNotebook('csv')}
            disabled={trials.length === 0}
            class="lab-btn py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet class="w-4 h-4 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>
          <button
            type="button"
            onclick={() => labStore.exportNotebook('json')}
            disabled={trials.length === 0}
            class="lab-btn py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileJson class="w-4 h-4" />
            <span>Exportar JSON</span>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
