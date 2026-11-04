<script lang="ts">
  import {
    labStore,
    EXPERIMENT_PRESETS,
    CABINET_COMPONENTS,
    type EducationLevel
  } from '$lib/interaction/lab_store.svelte';
  import { labSound } from '$lib/audio/lab_sound';
  import {
    FlaskConical,
    BookOpen,
    RotateCcw,
    Video,
    Compass,
    Activity,
    Check,
    ChevronDown,
    ChevronUp,
    Volume2,
    VolumeX,
    X,
    Layers,
    SlidersHorizontal,
    Plus
  } from '@lucide/svelte';

  const result = $derived(labStore.beaker.currentResult);
  const band = $derived(result?.indicatorBand);
  const activePreset = $derived(labStore.activePreset);

  // Estado de la Dynamic Island superior y los popovers del Dock inferior
  let isIslandExpanded = $state<boolean>(false);
  let activeDockSheet = $state<'experiments' | 'cabinet' | null>(null);
  let sheetLevelFilter = $state<'all' | EducationLevel>('all');
  let activeShelfTab = $state<0 | 1 | 2>(0);

  // Progreso de metas del experimento activo
  const completedGoalsCount = $derived(
    activePreset.interactiveGoals.filter((g) => g.checkFn(labStore.beaker)).length
  );
  const totalGoalsCount = $derived(activePreset.interactiveGoals.length);

  const filteredPresets = $derived(
    sheetLevelFilter === 'all'
      ? EXPERIMENT_PRESETS
      : EXPERIMENT_PRESETS.filter((p) => p.level === sheetLevelFilter)
  );

  const shelfComponents = $derived(
    CABINET_COMPONENTS.filter((c) => c.shelfIndex === activeShelfTab)
  );

  function toggleDockSheet(sheet: 'experiments' | 'cabinet') {
    labSound.playInstrumentClick();
    if (activeDockSheet === sheet) {
      activeDockSheet = null;
    } else {
      activeDockSheet = sheet;
      sheetLevelFilter = labStore.educationLevel;
    }
  }

  function switchLevelMode(level: EducationLevel) {
    labSound.playInstrumentClick();
    labStore.isExplorationMode = false;
    labStore.educationLevel = level;
    const currentPreset = EXPERIMENT_PRESETS.find((p) => p.id === labStore.activePresetId);
    if (!currentPreset || currentPreset.level !== level) {
      const firstForLevel = EXPERIMENT_PRESETS.find((p) => p.level === level);
      if (firstForLevel) {
        labStore.loadExperimentPreset(firstForLevel.id);
      }
    }
  }
</script>

<!-- Fondo invisible para cerrar popovers del Dock al hacer clic fuera -->
{#if activeDockSheet !== null}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-20 bg-black/20 backdrop-blur-[2px]"
    onclick={() => (activeDockSheet = null)}
  ></div>
{/if}

<!-- ===========================================================================
     1. DYNAMIC LAB ISLAND (CÁPSULA SUPERIOR ADAPTATIVA ESTILO APPLE)
     =========================================================================== -->
<header
  class="fixed top-4 left-1/2 -translate-x-1/2 z-30 w-[94vw] max-w-3xl pointer-events-none flex flex-col items-center"
  aria-label="Telemetría y control de nivel de SymbioLab"
>
  <div
    class="pointer-events-auto apple-island w-full {isIslandExpanded
      ? 'rounded-[28px] p-3.5'
      : 'rounded-full px-3.5 py-2'}"
  >
    <!-- Fila principal siempre visible en la Dynamic Island -->
    <div class="flex items-center justify-between gap-2 sm:gap-4">
      <!-- Identidad de marca + Experimento activo -->
      <button
        type="button"
        onclick={() => toggleDockSheet('experiments')}
        class="lab-btn flex items-center gap-2.5 min-w-0 text-left group cursor-pointer pl-1"
        title="Cambiar práctica experimental"
      >
        <span
          class="w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-200 group-hover:scale-125"
          style="background-color: {band?.colorHex || '#10b981'}; box-shadow: 0 0 12px {band?.colorHex || '#10b981'};"
        ></span>
        <div class="flex items-center gap-2 min-w-0">
          <span class="font-semibold text-[13px] tracking-[-0.02em] text-white shrink-0">
            SymbioLab
          </span>
          <span class="text-white/20 text-xs hidden sm:inline">/</span>
          <span class="text-[12px] text-white/70 font-medium truncate hidden sm:inline max-w-[190px] group-hover:text-white transition-colors">
            {activePreset.title}
          </span>
        </div>
      </button>

      <!-- Control Segmentado de Estaciones de Laboratorio 3D -->
      <div
        class="flex items-center bg-white/[0.08] p-0.5 rounded-full border border-white/[0.12] shrink-0"
        role="group"
        aria-label="Selector de estación temática de laboratorio"
      >
        <button
          type="button"
          onclick={() => labStore.setStation('quimica')}
          class="lab-btn px-2.5 sm:px-3 py-1 rounded-full text-[11px] font-medium tracking-[-0.01em] flex items-center gap-1.5 cursor-pointer {labStore.activeStation === 'quimica'
            ? 'bg-white text-black font-semibold shadow-sm'
            : 'text-white/70 hover:text-white'}"
          title="Mesa de Química Analítica (Reactor, Bureta, pH)"
        >
          <span>🧪</span>
          <span class="hidden sm:inline">Química</span>
        </button>
        <button
          type="button"
          onclick={() => labStore.setStation('biologia')}
          class="lab-btn px-2.5 sm:px-3 py-1 rounded-full text-[11px] font-medium tracking-[-0.01em] flex items-center gap-1.5 cursor-pointer {labStore.activeStation === 'biologia'
            ? 'bg-white text-black font-semibold shadow-sm'
            : 'text-white/70 hover:text-white'}"
          title="Mesa de Biología & Microscopía Óptica"
        >
          <span>🔬</span>
          <span class="hidden sm:inline">Biología</span>
        </button>
        <button
          type="button"
          onclick={() => labStore.setStation('steam')}
          class="lab-btn px-2.5 sm:px-3 py-1 rounded-full text-[11px] font-medium tracking-[-0.01em] flex items-center gap-1.5 cursor-pointer {labStore.activeStation === 'steam'
            ? 'bg-white text-black font-semibold shadow-sm'
            : 'text-white/70 hover:text-white'}"
          title="Mesa de Ciencias Cotidianas & Fenómenos STEAM"
        >
          <span>📚</span>
          <span class="hidden sm:inline">STEAM</span>
        </button>
      </div>

      <!-- Control de Nivel Educativo -->
      <div
        class="hidden lg:flex items-center bg-white/[0.06] p-0.5 rounded-full border border-white/[0.08] shrink-0"
        role="group"
        aria-label="Selector de nivel educativo"
      >
        <button
          type="button"
          onclick={() => switchLevelMode('primaria')}
          class="lab-btn px-2.5 py-1 rounded-full text-[10.5px] font-medium tracking-[-0.01em] cursor-pointer {!labStore.isExplorationMode && labStore.educationLevel === 'primaria'
            ? 'bg-white text-black font-semibold shadow-xs'
            : 'text-white/60 hover:text-white'}"
        >
          Primaria
        </button>
        <button
          type="button"
          onclick={() => switchLevelMode('secundaria')}
          class="lab-btn px-2.5 py-1 rounded-full text-[10.5px] font-medium tracking-[-0.01em] cursor-pointer {!labStore.isExplorationMode && labStore.educationLevel === 'secundaria'
            ? 'bg-white text-black font-semibold shadow-xs'
            : 'text-white/60 hover:text-white'}"
        >
          Secundaria
        </button>
      </div>

      <!-- Indicador de Bioseguridad y EPP (ISO 7010 / SGA) -->
      <button
        type="button"
        onclick={() => labStore.equipAllPPE()}
        class="lab-btn px-2.5 py-1 rounded-full text-[10.5px] font-medium flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 {labStore.isFullyProtected
          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
          : 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'}"
        title={labStore.isFullyProtected
          ? 'Bioseguridad completa: Bata, Gafas EN 166 y Guantes reglamentarios'
          : 'Atención: Falta equipar EPP reglamentario (haz clic para auto-equipar)'}
      >
        <span>{labStore.isFullyProtected ? '🛡️' : '⚠️'}</span>
        <span class="hidden md:inline font-semibold">
          {labStore.isFullyProtected ? 'EPP OK' : 'Falta EPP'}
        </span>
      </button>

      <!-- Telemetría Óptica en Vivo (pH · Temp · Progreso) + Botón expandir -->
      <button
        type="button"
        onclick={() => {
          labSound.playInstrumentClick();
          isIslandExpanded = !isIslandExpanded;
        }}
        class="lab-btn flex items-center gap-2.5 bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.08] px-3 py-1 rounded-full cursor-pointer shrink-0"
        title={isIslandExpanded ? 'Contraer telemetría' : 'Desplegar telemetría y pasos del experimento'}
      >
        <div class="flex items-baseline gap-1">
          <span class="text-[10px] font-medium text-white/50 uppercase">pH</span>
          <span class="font-mono-numbers text-[13px] font-semibold text-white">
            {result?.pH.toFixed(2) ?? '7.00'}
          </span>
        </div>

        <span class="w-px h-3 bg-white/15 hidden sm:inline-block"></span>

        <span class="font-mono-numbers text-[11px] text-white/70 hidden sm:inline">
          {labStore.beaker.temperatureC}°C
        </span>

        <span class="w-px h-3 bg-white/15"></span>

        <span class="font-mono-numbers text-[11px] font-medium text-white/80">
          {completedGoalsCount}/{totalGoalsCount}
        </span>

        {#if isIslandExpanded}
          <ChevronUp class="w-3.5 h-3.5 text-white/60" />
        {:else}
          <ChevronDown class="w-3.5 h-3.5 text-white/60" />
        {/if}
      </button>
    </div>

    <!-- =======================================================================
         CONTENIDO EXPANDIDO DE LA DYNAMIC ISLAND (TELEMETRÍA + DOSIFICACIÓN + METAS)
         ======================================================================= -->
    {#if isIslandExpanded}
      <div class="mt-3.5 pt-3.5 border-t border-white/[0.08] flex flex-col gap-3.5 animate-in fade-in duration-150">
        <!-- Fila 1: Espectro óptico continuo de pH (0 - 14) y estado químico -->
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-[11px]">
            <div class="flex items-center gap-2">
              <span class="text-white/50 font-medium">Estado de la disolución</span>
              <span
                class="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                style="background-color: {band?.colorHex || '#10b981'}33; border: 1px solid {band?.colorHex || '#10b981'}66;"
              >
                {band?.name || 'Neutro'}
              </span>
            </div>
            <span class="font-mono-numbers text-white/65">
              Volumen total: <strong class="text-white font-semibold">{labStore.totalVolumeMl} mL</strong> / 250 mL
            </span>
          </div>

          <!-- Barra de espectro continuo estilo Apple Weather -->
          <div class="relative h-2 w-full rounded-full overflow-hidden bg-white/10">
            <div
              class="absolute inset-0 opacity-85"
              style="background: linear-gradient(90deg, #ef4444 0%, #f59e0b 28%, #10b981 50%, #3b82f6 72%, #8b5cf6 100%);"
            ></div>
            <div
              class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md border-2 border-black transition-[left] duration-200 ease-out"
              style="left: {Math.max(2, Math.min(98, ((result?.pH ?? 7) / 14) * 100))}%"
            ></div>
          </div>
        </div>

        <!-- Fila 2: Composición volumétrica y micro-dosificación rápida (+5 mL) -->
        <div class="grid grid-cols-3 gap-2">
          <div class="apple-card-inner rounded-2xl p-2.5 flex items-center justify-between">
            <div>
              <span class="text-[10px] text-white/50 block font-medium">Medio Base (H₂O)</span>
              <span class="font-mono-numbers text-sm font-semibold text-white">
                {labStore.beaker.waterMl} mL
              </span>
            </div>
            <button
              type="button"
              onclick={() => labStore.cycleTemperature()}
              class="lab-btn px-2.5 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-[10px] font-medium text-white/85 cursor-pointer"
              title="Alternar temperatura de la placa"
            >
              {labStore.beaker.temperatureC}°C
            </button>
          </div>

          <div class="apple-card-inner rounded-2xl p-2.5 flex items-center justify-between gap-1">
            <div class="min-w-0">
              <span class="text-[10px] text-white/50 block font-medium truncate">
                {labStore.reagents[0].name}
              </span>
              <span class="font-mono-numbers text-sm font-semibold text-white">
                {labStore.beaker.acidVolumeMl} mL
              </span>
            </div>
            <button
              type="button"
              onclick={() => labStore.triggerAnimatedPour('hcl', 5)}
              class="lab-btn shrink-0 px-2.5 py-1 rounded-full bg-white text-black hover:bg-white/90 text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              <Plus class="w-3 h-3" /> 5 mL
            </button>
          </div>

          <div class="apple-card-inner rounded-2xl p-2.5 flex items-center justify-between gap-1">
            <div class="min-w-0">
              <span class="text-[10px] text-white/50 block font-medium truncate">
                {labStore.reagents[1].name}
              </span>
              <span class="font-mono-numbers text-sm font-semibold text-white">
                {labStore.beaker.baseVolumeMl} mL
              </span>
            </div>
            <button
              type="button"
              onclick={() => labStore.triggerAnimatedPour('naoh', 5)}
              class="lab-btn shrink-0 px-2.5 py-1 rounded-full bg-white text-black hover:bg-white/90 text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              <Plus class="w-3 h-3" /> 5 mL
            </button>
          </div>
        </div>

        <!-- Fila 3: Pasos de la práctica actual -->
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-medium text-white/45 uppercase tracking-wider">
              Protocolo activo · {activePreset.title}
            </span>
            <button
              type="button"
              onclick={() => {
                isIslandExpanded = false;
                labSound.playBookOpen();
                labStore.isHomeBookOpen = true;
              }}
              class="text-[11px] font-medium text-white/75 hover:text-white underline underline-offset-2 cursor-pointer"
            >
              Abrir teoría en el Manual 3D
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {#each activePreset.interactiveGoals as goal, idx}
              {@const done = goal.checkFn(labStore.beaker)}
              <div
                class="px-3 py-2 rounded-xl border text-[11px] flex items-start gap-2 transition-colors {done
                  ? 'bg-emerald-500/12 border-emerald-500/30 text-white'
                  : 'bg-white/[0.03] border-white/[0.06] text-white/75'}"
              >
                <span
                  class="w-4 h-4 rounded-full shrink-0 mt-0.5 flex items-center justify-center text-[10px] {done
                    ? 'bg-emerald-500 text-black'
                    : 'border border-white/25 text-white/40 font-mono-numbers'}"
                >
                  {#if done}
                    <Check class="w-2.5 h-2.5 stroke-[3]" />
                  {:else}
                    {idx + 1}
                  {/if}
                </span>
                <span class="leading-snug">{goal.description}</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Fila 4: Panel de Bioseguridad y Equipamiento EPP (ISO 7010 / SGA) -->
        <div class="apple-card-inner rounded-2xl p-3 flex flex-col gap-2 border border-white/[0.08]">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-[12px] font-semibold text-white flex items-center gap-1.5">
                <span>🛡️</span> Protocolo de Bioseguridad & EPP
              </span>
              <span
                class="text-[10px] px-2 py-0.5 rounded-full {labStore.isFullyProtected
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}"
              >
                {labStore.isFullyProtected ? 'Protección Completa' : 'Equipo Pendiente'}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                onclick={() => (labStore.safetyStrictMode = !labStore.safetyStrictMode)}
                class="lab-btn text-[10.5px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer {labStore.safetyStrictMode
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-semibold'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}"
                title="Bloquear manipulaciones químicas si no se tiene el EPP puesto"
              >
                {labStore.safetyStrictMode ? '🔒 Modo Estricto: ON' : '🔓 Modo Estricto: OFF'}
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <button
              type="button"
              onclick={() => labStore.toggleSafetyCoat()}
              class="lab-btn p-2 rounded-xl border flex items-center gap-2 text-[11px] transition-all cursor-pointer {labStore.safetyCoatEquipped
                ? 'bg-white/20 border-white/40 text-white font-semibold'
                : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:bg-white/[0.08]'}"
            >
              <span class="text-base">🥼</span>
              <span class="truncate">Bata Blanca</span>
              <span class="ml-auto text-[9px] opacity-75">{labStore.safetyCoatEquipped ? 'PUESTA' : 'NO'}</span>
            </button>

            <button
              type="button"
              onclick={() => labStore.toggleSafetyGoggles()}
              class="lab-btn p-2 rounded-xl border flex items-center gap-2 text-[11px] transition-all cursor-pointer {labStore.safetyGogglesEquipped
                ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200 font-semibold'
                : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:bg-white/[0.08]'}"
            >
              <span class="text-base">🥽</span>
              <span class="truncate">Gafas EN 166</span>
              <span class="ml-auto text-[9px] opacity-75">{labStore.safetyGogglesEquipped ? 'PUESTAS' : 'NO'}</span>
            </button>

            <button
              type="button"
              onclick={() => {
                const next =
                  labStore.safetyGlovesType === 'none'
                    ? 'nitrile_blue'
                    : labStore.safetyGlovesType === 'nitrile_blue'
                      ? 'latex_white'
                      : 'none';
                labStore.setSafetyGloves(next);
              }}
              class="lab-btn p-2 rounded-xl border flex items-center gap-2 text-[11px] transition-all cursor-pointer {labStore.safetyGlovesType !== 'none'
                ? 'bg-blue-500/20 border-blue-400/40 text-blue-200 font-semibold'
                : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:bg-white/[0.08]'}"
            >
              <span class="text-base">🧤</span>
              <span class="truncate">
                {labStore.safetyGlovesType === 'nitrile_blue'
                  ? 'Nitrilo Azul'
                  : labStore.safetyGlovesType === 'latex_white'
                    ? 'Látex Blanco'
                    : 'Sin Guantes'}
              </span>
              <span class="ml-auto text-[9px] opacity-75">
                {labStore.safetyGlovesType !== 'none' ? 'PUESTOS' : 'NO'}
              </span>
            </button>

            <button
              type="button"
              onclick={() => (labStore.isFullyProtected ? labStore.clearSafetyPPE() : labStore.equipAllPPE())}
              class="lab-btn p-2 rounded-xl border flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-all cursor-pointer {labStore.isFullyProtected
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30'}"
            >
              <span>{labStore.isFullyProtected ? '❌ Retirar Todo' : '⚡ Equipar Todo'}</span>
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</header>

<!-- Notificación Flotante de Protocolo de Seguridad (Alertas Didácticas) -->
{#if labStore.safetyAlert}
  <aside
    class="pointer-events-auto fixed top-20 left-1/2 -translate-x-1/2 z-30 w-[92vw] max-w-xl animate-in fade-in slide-in-from-top-2 duration-200"
    role="alert"
    aria-live="assertive"
  >
    <div
      class="px-4 py-3 rounded-2xl backdrop-blur-xl border flex items-start gap-3 shadow-2xl {labStore.safetyAlert.type === 'warning'
        ? 'bg-amber-950/85 border-amber-500/40 text-amber-200'
        : labStore.safetyAlert.type === 'success'
          ? 'bg-emerald-950/85 border-emerald-500/40 text-emerald-200'
          : 'bg-sky-950/85 border-sky-500/40 text-sky-200'}"
    >
      <span class="text-xl shrink-0 mt-0.5">
        {labStore.safetyAlert.type === 'warning' ? '⚠️' : labStore.safetyAlert.type === 'success' ? '🛡️' : 'ℹ️'}
      </span>
      <div class="flex-1 min-w-0">
        <h4 class="text-[13px] font-bold tracking-tight text-white">
          {labStore.safetyAlert.title}
        </h4>
        <p class="text-[12px] opacity-90 leading-relaxed mt-0.5">
          {labStore.safetyAlert.message}
        </p>
        <div class="flex items-center gap-2 mt-2">
          {#if !labStore.isFullyProtected}
            <button
              type="button"
              onclick={() => labStore.equipAllPPE()}
              class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
            >
              Equipar Todo el EPP
            </button>
          {/if}
          <button
            type="button"
            onclick={() => labStore.clearSafetyAlert()}
            class="px-2 py-1 rounded-lg text-[11px] font-medium opacity-70 hover:opacity-100 hover:bg-white/10 text-white transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
      <button
        type="button"
        onclick={() => labStore.clearSafetyAlert()}
        class="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
        aria-label="Cerrar notificación de seguridad"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </aside>
{/if}

<!-- Overlay Óptico Inmersivo en 1ra Persona cuando las Gafas EN 166 están equipadas -->
{#if labStore.safetyGogglesEquipped}
  <div class="pointer-events-none fixed inset-0 z-10 overflow-hidden">
    <!-- Marco perimetral con tono de policarbonato y refracción sutil -->
    <div
      class="absolute inset-0 border-[6px] border-cyan-400/20 rounded-3xl shadow-[inset_0_0_100px_rgba(34,211,238,0.1)]"
    ></div>
    <div
      class="absolute top-5 right-6 px-2.5 py-1 rounded-md bg-black/40 backdrop-blur-sm border border-cyan-400/30 text-[10px] font-mono text-cyan-300 tracking-wider flex items-center gap-1.5 shadow-sm"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
      <span>EN 166 1-BT · POLICARBONATO UV400</span>
    </div>
  </div>
{/if}

<!-- HUD y Controles de Navegación en 1ª Persona (Paseo por el Laboratorio) -->
{#if labStore.isFirstPersonWalking}
  <div
    class="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-2.5 animate-in fade-in duration-200"
  >
    <!-- Prompt contextual al acercarse a una mesa -->
    {#if labStore.nearbyStationPrompt}
      <button
        type="button"
        onclick={() => labStore.enterStationFromWalk(labStore.nearbyStationPrompt!)}
        class="pointer-events-auto px-4 py-2 rounded-2xl bg-black/85 backdrop-blur-md border border-white/20 text-white shadow-2xl flex items-center gap-2.5 text-xs font-semibold hover:bg-white/20 hover:scale-105 transition-all cursor-pointer"
      >
        <span class="text-base">
          {labStore.nearbyStationPrompt === 'quimica'
            ? '🧪'
            : labStore.nearbyStationPrompt === 'biologia'
              ? '🔬'
              : '📚'}
        </span>
        <span>
          Trabajar en {labStore.nearbyStationPrompt === 'quimica'
            ? 'Mesa de Química'
            : labStore.nearbyStationPrompt === 'biologia'
              ? 'Estación de Biología'
              : 'Mesa STEAM'}
        </span>
        <kbd class="px-2 py-0.5 rounded bg-white/20 text-[10px] font-mono border border-white/30">Presiona E</kbd>
      </button>
    {/if}

    <!-- Leyenda de Controles First Person -->
    <div
      class="px-4 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-white/80 text-[11px] flex items-center gap-3 shadow-lg"
    >
      <span class="flex items-center gap-1">
        <kbd class="px-1.5 py-0.5 rounded bg-white/15 text-[9px] font-mono">W A S D</kbd> Caminar
      </span>
      <span class="text-white/25">|</span>
      <span class="flex items-center gap-1">
        <kbd class="px-1.5 py-0.5 rounded bg-white/15 text-[9px] font-mono">Shift</kbd> Correr
      </span>
      <span class="text-white/25">|</span>
      <span>Ratón: Mirar</span>
      <span class="text-white/25">|</span>
      <button
        type="button"
        onclick={() => labStore.toggleFirstPersonWalk(false)}
        class="pointer-events-auto text-cyan-300 font-semibold hover:underline cursor-pointer"
      >
        Salir (V)
      </button>
    </div>
  </div>
{/if}

<!-- ===========================================================================
     2. POPOVER SHEETS ANCLADOS AL DOCK (PRÁCTICAS Y ESTANTERÍA 3D STEAM)
     =========================================================================== -->
{#if activeDockSheet === 'experiments'}
  <section
    class="fixed bottom-22 left-1/2 -translate-x-1/2 z-30 w-[92vw] max-w-2xl apple-glass rounded-[28px] p-5 apple-popover-enter"
    aria-label="Selector de prácticas de laboratorio"
  >
    <div class="flex items-center justify-between gap-2 pb-3.5 mb-3.5 border-b border-white/[0.08]">
      <div>
        <h2 class="text-sm font-semibold tracking-[-0.02em] text-white">
          Prácticas de Laboratorio
        </h2>
        <p class="text-[11px] text-white/55">
          Selecciona un experimento para equipar los reactivos e instrumentos 3D
        </p>
      </div>

      <div class="flex items-center gap-2">
        <div class="flex items-center bg-white/[0.07] p-0.5 rounded-full border border-white/[0.08]">
          <button
            type="button"
            onclick={() => (sheetLevelFilter = 'all')}
            class="px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer {sheetLevelFilter === 'all'
              ? 'bg-white text-black font-semibold'
              : 'text-white/65 hover:text-white'}"
          >
            Todas
          </button>
          <button
            type="button"
            onclick={() => (sheetLevelFilter = 'primaria')}
            class="px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer {sheetLevelFilter === 'primaria'
              ? 'bg-white text-black font-semibold'
              : 'text-white/65 hover:text-white'}"
          >
            Primaria
          </button>
          <button
            type="button"
            onclick={() => (sheetLevelFilter = 'secundaria')}
            class="px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer {sheetLevelFilter === 'secundaria'
              ? 'bg-white text-black font-semibold'
              : 'text-white/65 hover:text-white'}"
          >
            Secundaria
          </button>
        </div>

        <button
          type="button"
          onclick={() => (activeDockSheet = null)}
          class="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
          aria-label="Cerrar selector de prácticas"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[52vh] overflow-y-auto pr-1">
      {#each filteredPresets as preset (preset.id)}
        {@const isCurrent = !labStore.isExplorationMode && labStore.activePresetId === preset.id}
        <button
          type="button"
          onclick={() => {
            labSound.playInstrumentClick();
            labStore.isExplorationMode = false;
            labStore.loadExperimentPreset(preset.id);
            activeDockSheet = null;
          }}
          class="lab-btn text-left p-3.5 rounded-2xl border flex flex-col justify-between gap-2 cursor-pointer {isCurrent
            ? 'bg-white/[0.14] border-white/35 shadow-sm'
            : 'apple-card-inner'}"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2">
              <span
                class="w-2.5 h-2.5 rounded-full shrink-0"
                style="background-color: {preset.acidReagent.colorHex};"
              ></span>
              <span class="text-[10px] font-medium text-white/50">
                {preset.level === 'primaria' ? 'Primaria' : 'Secundaria'} · {preset.gradeRange}
              </span>
            </div>
            {#if isCurrent}
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-black">
                Activa
              </span>
            {/if}
          </div>

          <div>
            <div class="text-[13px] font-semibold tracking-[-0.015em] text-white leading-snug">
              {preset.title}
            </div>
            <p class="text-[11px] text-white/55 line-clamp-2 mt-0.5 leading-relaxed">
              {preset.summary}
            </p>
          </div>
        </button>
      {/each}
    </div>
  </section>
{/if}

{#if activeDockSheet === 'cabinet'}
  <section
    class="fixed bottom-22 left-1/2 -translate-x-1/2 z-30 w-[92vw] max-w-2xl apple-glass rounded-[28px] p-5 apple-popover-enter"
    aria-label="Mueble 3D de componentes STEAM"
  >
    <div class="flex items-center justify-between gap-2 pb-3.5 mb-3.5 border-b border-white/[0.08]">
      <div>
        <h2 class="text-sm font-semibold tracking-[-0.02em] text-white">
          Estantería 3D de Componentes STEAM
        </h2>
        <p class="text-[11px] text-white/55">
          Selecciona un reactivo o material clasificado para activarlo en la mesa 3D
        </p>
      </div>

      <button
        type="button"
        onclick={() => (activeDockSheet = null)}
        class="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
        aria-label="Cerrar estantería 3D"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Pestañas de los 3 estantes del Mueble 3D -->
    <div class="grid grid-cols-3 gap-1.5 bg-white/[0.05] p-1 rounded-2xl border border-white/[0.07] mb-3.5">
      {#each [
        { idx: 0 as const, label: 'Estante 1 · Caseros STEAM' },
        { idx: 1 as const, label: 'Estante 2 · Redox y Complejos' },
        { idx: 2 as const, label: 'Estante 3 · Termodinámica' }
      ] as tab}
        <button
          type="button"
          onclick={() => (activeShelfTab = tab.idx)}
          class="lab-btn py-1.5 px-2 rounded-xl text-[11px] font-medium truncate cursor-pointer {activeShelfTab === tab.idx
            ? 'bg-white text-black font-semibold shadow-xs'
            : 'text-white/65 hover:text-white'}"
        >
          {tab.label}
        </button>
      {/each}
    </div>

    <!-- Los 3 componentes del estante seleccionado -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      {#each shelfComponents as comp (comp.id)}
        {@const isSelected = labStore.selectedCabinetComponentId === comp.id}
        <button
          type="button"
          onclick={() => {
            labSound.playInstrumentClick();
            labStore.selectCabinetComponent(comp.id);
            activeDockSheet = null;
          }}
          class="lab-btn text-left p-3.5 rounded-2xl border flex flex-col justify-between gap-2.5 cursor-pointer {isSelected
            ? 'bg-white/[0.15] border-white/40'
            : 'apple-card-inner'}"
        >
          <div class="flex items-center justify-between">
            <span
              class="w-3 h-3 rounded-full"
              style="background-color: {comp.colorHex}; box-shadow: 0 0 10px {comp.colorHex}88;"
            ></span>
            <span class="font-mono-numbers text-[10px] text-white/50 truncate max-w-[120px]">
              {comp.formulaOrSpec}
            </span>
          </div>

          <div>
            <div class="text-[13px] font-semibold tracking-[-0.01em] text-white leading-snug">
              {comp.name}
            </div>
            <p class="text-[11px] text-white/55 line-clamp-3 mt-1 leading-relaxed">
              {comp.description}
            </p>
          </div>

          <span class="text-[11px] font-medium text-white/85 pt-1 border-t border-white/[0.06] flex items-center justify-between">
            <span>Equipar en mesa 3D</span>
            <span>→</span>
          </span>
        </button>
      {/each}
    </div>
  </section>
{/if}

<!-- ===========================================================================
     3. DOCK INFERIOR FLOTANTE ESTILO APPLE visionOS / macOS
     =========================================================================== -->
<nav
  class="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto"
  aria-label="Dock principal del laboratorio"
>
  <div class="apple-glass rounded-full px-2 py-1.5 flex items-center gap-1 sm:gap-1.5">
    <!-- 1. Selector de Prácticas -->
    <button
      type="button"
      onclick={() => toggleDockSheet('experiments')}
      class="lab-btn px-3.5 py-2 rounded-full text-xs font-medium flex items-center gap-2 cursor-pointer {activeDockSheet === 'experiments'
        ? 'bg-white text-black font-semibold'
        : 'text-white/85 hover:bg-white/[0.09] hover:text-white'}"
    >
      <FlaskConical class="w-4 h-4 shrink-0" />
      <span>Prácticas</span>
    </button>

    <!-- 2. Estantería 3D de Componentes STEAM -->
    <button
      type="button"
      onclick={() => toggleDockSheet('cabinet')}
      class="lab-btn px-3.5 py-2 rounded-full text-xs font-medium flex items-center gap-2 cursor-pointer {activeDockSheet === 'cabinet'
        ? 'bg-white text-black font-semibold'
        : 'text-white/85 hover:bg-white/[0.09] hover:text-white'}"
    >
      <Layers class="w-4 h-4 shrink-0" />
      <span>Estantería</span>
    </button>

    <!-- 3. Manual / Libro 3D Correlativo -->
    <button
      type="button"
      onclick={() => {
        activeDockSheet = null;
        labSound.playBookOpen();
        labStore.isHomeBookOpen = true;
      }}
      class="lab-btn px-3.5 py-2 rounded-full text-xs font-medium text-white/85 hover:bg-white/[0.09] hover:text-white flex items-center gap-2 cursor-pointer"
    >
      <BookOpen class="w-4 h-4 shrink-0" />
      <span>Manual</span>
    </button>

    <!-- 4. Tutor Socrático / Hipótesis -->
    <button
      type="button"
      onclick={() => {
        activeDockSheet = null;
        labStore.isHypothesisModalOpen = true;
      }}
      class="lab-btn px-3.5 py-2 rounded-full text-xs font-medium text-white/85 hover:bg-white/[0.09] hover:text-white flex items-center gap-2 cursor-pointer relative"
    >
      <Compass class="w-4 h-4 shrink-0" />
      <span class="hidden sm:inline">Tutor</span>
      {#if labStore.session.hypothesisText}
        <span class="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
      {/if}
    </button>

    <!-- 5. Cuaderno de Datos -->
    <button
      type="button"
      onclick={() => {
        activeDockSheet = null;
        labStore.isNotebookOpen = true;
      }}
      class="lab-btn px-3.5 py-2 rounded-full text-xs font-medium text-white/85 hover:bg-white/[0.09] hover:text-white flex items-center gap-2 cursor-pointer"
    >
      <Activity class="w-4 h-4 shrink-0" />
      <span class="hidden sm:inline">Datos</span>
      {#if labStore.session.trials.length > 0}
        <span class="font-mono-numbers text-[10px] px-1.5 py-0.2 rounded-full bg-white/15 text-white">
          {labStore.session.trials.length}
        </span>
      {/if}
    </button>

    <!-- 6. Modo Paseo Libre 1ª Persona (WASD + Movilidad en Laboratorio) -->
    <button
      type="button"
      onclick={() => {
        activeDockSheet = null;
        labStore.toggleFirstPersonWalk();
      }}
      class="lab-btn px-3.5 py-2 rounded-full text-xs font-medium flex items-center gap-2 cursor-pointer transition-all {labStore.isFirstPersonWalking
        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/35 shadow-sm'
        : 'text-white/85 hover:bg-white/[0.09] hover:text-white'}"
      title="Alternar entre paseo libre en 1ª persona (WASD) y modo estación (Tecla V)"
    >
      <Compass class="w-4 h-4 shrink-0" />
      <span class="hidden md:inline">{labStore.isFirstPersonWalking ? 'Paseo 1ªP' : 'Caminar'}</span>
    </button>

    <!-- 7. Control Gestual por Cámara AR -->
    <button
      type="button"
      onclick={() => {
        activeDockSheet = null;
        labStore.isCameraModalOpen = true;
      }}
      class="lab-btn px-3.5 py-2 rounded-full text-xs font-medium flex items-center gap-2 cursor-pointer {labStore.isCameraActive
        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35'
        : 'text-white/85 hover:bg-white/[0.09] hover:text-white'}"
      title="Control con manos por cámara (MediaPipe AR)"
    >
      <Video class="w-4 h-4 shrink-0" />
      <span class="hidden md:inline">{labStore.isCameraActive ? 'AR Activo' : 'Manos AR'}</span>
    </button>

    <div class="w-px h-5 bg-white/12 mx-0.5"></div>

    <!-- Controles rápidos de sistema (Sonido y Reiniciar) -->
    <button
      type="button"
      onclick={() => labStore.toggleSound()}
      class="lab-btn w-8 h-8 rounded-full flex items-center justify-center text-white/75 hover:bg-white/[0.09] hover:text-white cursor-pointer"
      title={labStore.soundEnabled ? 'Silenciar sonidos del laboratorio' : 'Activar sonidos del laboratorio'}
      aria-label="Alternar sonido"
    >
      {#if labStore.soundEnabled}
        <Volume2 class="w-4 h-4" />
      {:else}
        <VolumeX class="w-4 h-4 text-white/40" />
      {/if}
    </button>

    <button
      type="button"
      onclick={() => {
        activeDockSheet = null;
        labStore.resetExperiment();
      }}
      class="lab-btn w-8 h-8 rounded-full flex items-center justify-center text-white/75 hover:bg-white/[0.09] hover:text-white cursor-pointer"
      title="Reiniciar estación 3D"
      aria-label="Reiniciar estación 3D"
    >
      <RotateCcw class="w-4 h-4" />
    </button>
  </div>
</nav>
