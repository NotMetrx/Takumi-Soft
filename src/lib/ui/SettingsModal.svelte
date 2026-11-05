<script lang="ts">
  import { labStore } from '$lib/interaction/lab_store.svelte';
  import { labSound } from '$lib/audio/lab_sound';
  import {
    X,
    Sliders,
    Zap,
    Gauge,
    Volume2,
    VolumeX,
    Keyboard,
    Languages,
    Sparkles,
    Check,
    RotateCcw,
    MousePointer,
    Eye
  } from '@lucide/svelte';

  let activeTab = $state<'graphics' | 'audio' | 'controls' | 'shortcuts' | 'language'>('graphics');

  function close() {
    labStore.isSettingsModalOpen = false;
  }

  function testSound() {
    labSound.playDrop();
  }

  const isEs = $derived(labStore.language === 'es');
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'F2') {
      e.preventDefault();
      labStore.isSettingsModalOpen = !labStore.isSettingsModalOpen;
    } else if (e.key === 'Escape' && labStore.isSettingsModalOpen) {
      e.preventDefault();
      close();
    }
  }}
/>

{#if labStore.isSettingsModalOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md pointer-events-auto select-none"
    role="dialog"
    aria-modal="true"
    aria-label={isEs ? 'Menú de Configuración y Optimización' : 'Settings and Optimization Menu'}
  >
    <div
      class="w-full max-w-3xl rounded-[24px] lab-panel shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
    >
      <!-- Cabecera del Menú -->
      <header class="px-5 sm:px-6 py-4 border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-white/[0.08] border border-white/15 flex items-center justify-center text-sky-400 shrink-0">
            <Sliders class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-mono-numbers font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                Atajo: F2
              </span>
              <span class="text-[11px] text-white/50">
                SymbioLab 2.0
              </span>
            </div>
            <h2 class="text-base sm:text-lg font-bold text-white tracking-tight">
              {isEs ? 'Configuración & Optimización' : 'Settings & Optimization'}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onclick={close}
          class="lab-btn w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.18] flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer shrink-0"
          title={isEs ? 'Cerrar (Esc)' : 'Close (Esc)'}
          aria-label={isEs ? 'Cerrar ventana de configuración' : 'Close settings modal'}
        >
          <X class="w-4 h-4" />
        </button>
      </header>

      <!-- Selector de Pestañas (Horizontal) -->
      <div class="px-5 sm:px-6 pt-3.5 pb-2 border-b border-white/[0.06] flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
        <button
          type="button"
          onclick={() => (activeTab = 'graphics')}
          class="lab-btn px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap {activeTab ===
          'graphics'
            ? 'bg-white text-black shadow-md'
            : 'text-white/70 hover:bg-white/[0.06] hover:text-white'}"
        >
          <Zap class="w-3.5 h-3.5" />
          <span>{isEs ? 'Optimización & Gráficos' : 'Optimization & Graphics'}</span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = 'audio')}
          class="lab-btn px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap {activeTab ===
          'audio'
            ? 'bg-white text-black shadow-md'
            : 'text-white/70 hover:bg-white/[0.06] hover:text-white'}"
        >
          <Volume2 class="w-3.5 h-3.5" />
          <span>{isEs ? 'Audio & Volumen' : 'Audio & Volume'}</span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = 'controls')}
          class="lab-btn px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap {activeTab ===
          'controls'
            ? 'bg-white text-black shadow-md'
            : 'text-white/70 hover:bg-white/[0.06] hover:text-white'}"
        >
          <MousePointer class="w-3.5 h-3.5" />
          <span>{isEs ? 'Ratón & Microscopio' : 'Mouse & Microscope'}</span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = 'shortcuts')}
          class="lab-btn px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap {activeTab ===
          'shortcuts'
            ? 'bg-white text-black shadow-md'
            : 'text-white/70 hover:bg-white/[0.06] hover:text-white'}"
        >
          <Keyboard class="w-3.5 h-3.5" />
          <span>{isEs ? 'Guía de Teclas' : 'Shortcuts Guide'}</span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = 'language')}
          class="lab-btn px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap {activeTab ===
          'language'
            ? 'bg-white text-black shadow-md'
            : 'text-white/70 hover:bg-white/[0.06] hover:text-white'}"
        >
          <Languages class="w-3.5 h-3.5" />
          <span>{isEs ? 'Idioma' : 'Language'}</span>
        </button>
      </div>

      <!-- Contenido Principal con Scroll -->
      <div class="p-5 sm:p-6 overflow-y-auto min-h-0 flex-1 flex flex-col gap-5 text-sm text-white/85">
        {#if activeTab === 'graphics'}
          <!-- 1. PESTAÑA: OPTIMIZACIÓN Y GRÁFICOS -->
          <section class="flex flex-col gap-4">
            <div>
              <h3 class="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-300">
                {isEs ? 'Presets de Rendimiento Rápido' : 'Quick Performance Presets'}
              </h3>
              <p class="text-xs text-white/60 mt-0.5">
                {isEs
                  ? 'Si tu equipo tiene recursos limitados (Chromebook o GPU integrada), selecciona Modo Fluido para máxima tasa de cuadros.'
                  : 'If your device has limited hardware (Chromebook or integrated GPU), pick Smooth Mode for maximum framerate.'}
              </p>
            </div>

            <!-- Botones de Presets -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onclick={() => labStore.setGraphicsPreset('low')}
                class="lab-btn p-3.5 rounded-2xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer {labStore.graphicsQuality ===
                'low'
                  ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_15px_rgba(52,211,153,0.25)]'
                  : 'apple-card-inner text-white/80'}"
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                    🚀 {isEs ? 'Modo Fluido' : 'Performance Mode'}
                  </span>
                  {#if labStore.graphicsQuality === 'low'}
                    <Check class="w-4 h-4 text-emerald-400" />
                  {/if}
                </div>
                <p class="text-[11px] text-white/60 leading-relaxed">
                  {isEs
                    ? '0.75x resolución, sin sombras, partículas frugales. Ideal para PCs lentas.'
                    : '0.75x resolution, no dynamic shadows, lightweight particles. For budget PCs.'}
                </p>
              </button>

              <button
                type="button"
                onclick={() => labStore.setGraphicsPreset('medium')}
                class="lab-btn p-3.5 rounded-2xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer {labStore.graphicsQuality ===
                'medium'
                  ? 'bg-white/[0.14] border-white/40 text-white shadow-[0_0_15px_rgba(255,255,255,0.12)]'
                  : 'apple-card-inner text-white/80'}"
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-xs text-white flex items-center gap-1.5">
                    ⚖️ {isEs ? 'Equilibrado' : 'Balanced'}
                  </span>
                  {#if labStore.graphicsQuality === 'medium'}
                    <Check class="w-4 h-4 text-emerald-400" />
                  {/if}
                </div>
                <p class="text-[11px] text-white/60 leading-relaxed">
                  {isEs
                    ? '1.0x resolución nativa, sombras optimizadas y 60 FPS estables.'
                    : '1.0x native resolution, optimized shadows and steady 60 FPS.'}
                </p>
              </button>

              <button
                type="button"
                onclick={() => labStore.setGraphicsPreset('high')}
                class="lab-btn p-3.5 rounded-2xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer {labStore.graphicsQuality ===
                'high'
                  ? 'bg-amber-500/20 border-amber-400/50 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'apple-card-inner text-white/80'}"
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-xs text-amber-200 flex items-center gap-1.5">
                    ✨ {isEs ? 'Calidad Alta' : 'High Quality'}
                  </span>
                  {#if labStore.graphicsQuality === 'high'}
                    <Check class="w-4 h-4 text-amber-300" />
                  {/if}
                </div>
                <p class="text-[11px] text-white/60 leading-relaxed">
                  {isEs
                    ? '1.25x nitidez máxima, sombras suaves y partículas completas.'
                    : '1.25x maximum sharpness, soft shadows, full particle physics.'}
                </p>
              </button>
            </div>

            <!-- Parámetros Individuales -->
            <div class="rounded-2xl apple-card-inner p-4 flex flex-col gap-4 mt-2">
              <h4 class="text-xs font-semibold text-white/90">
                {isEs ? 'Ajustes Granulares de Rendimiento' : 'Granular Performance Parameters'}
              </h4>

              <!-- Escala de Resolución -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span class="font-medium text-white">{isEs ? 'Escala de Renderizado' : 'Render Scale'}</span>
                  <p class="text-[11px] text-white/50">{isEs ? 'Resolución interna de la escena 3D' : 'Internal 3D scene resolution'}</p>
                </div>
                <div class="flex items-center gap-1.5 bg-white/[0.06] p-1 rounded-xl border border-white/[0.08]">
                  {#each [0.75, 1.0, 1.25] as r}
                    <button
                      type="button"
                      onclick={() => (labStore.renderResolution = r)}
                      class="lab-btn px-2.5 py-1 rounded-lg font-mono-numbers text-[11px] font-semibold transition-all cursor-pointer {labStore.renderResolution ===
                      r
                        ? 'bg-white text-black'
                        : 'text-white/60 hover:text-white'}"
                    >
                      {r * 100}%
                    </button>
                  {/each}
                </div>
              </div>

              <!-- Sombras en Tiempo Real -->
              <div class="flex items-center justify-between gap-2 text-xs pt-3 border-t border-white/[0.06]">
                <div>
                  <span class="font-medium text-white">{isEs ? 'Sombras Dinámicas 3D' : 'Dynamic 3D Shadows'}</span>
                  <p class="text-[11px] text-white/50">{isEs ? 'Desactivar alivia notablemente la GPU' : 'Disabling greatly relieves the GPU'}</p>
                </div>
                <button
                  type="button"
                  onclick={() => (labStore.shadowsEnabled = !labStore.shadowsEnabled)}
                  class="lab-btn px-3 py-1 rounded-full font-semibold text-xs border transition-all cursor-pointer {labStore.shadowsEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-white/10 text-white/50 border-white/15'}"
                >
                  {labStore.shadowsEnabled ? (isEs ? 'Activadas' : 'Enabled') : (isEs ? 'Desactivadas' : 'Disabled')}
                </button>
              </div>

              <!-- Partículas y Fluidos -->
              <div class="flex items-center justify-between gap-2 text-xs pt-3 border-t border-white/[0.06]">
                <div>
                  <span class="font-medium text-white">{isEs ? 'Física de Fluidos & Partículas' : 'Fluid Physics & Particles'}</span>
                  <p class="text-[11px] text-white/50">{isEs ? 'Vapor, reactores químicos y extintor' : 'Vapor, chemical reactors and extinguisher'}</p>
                </div>
                <div class="flex items-center gap-1.5 bg-white/[0.06] p-1 rounded-xl border border-white/[0.08]">
                  <button
                    type="button"
                    onclick={() => (labStore.particlesQuality = 'low')}
                    class="lab-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer {labStore.particlesQuality ===
                    'low'
                      ? 'bg-white text-black'
                      : 'text-white/60 hover:text-white'}"
                  >
                    {isEs ? 'Frugal (Baja)' : 'Frugal (Low)'}
                  </button>
                  <button
                    type="button"
                    onclick={() => (labStore.particlesQuality = 'high')}
                    class="lab-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer {labStore.particlesQuality ===
                    'high'
                      ? 'bg-white text-black'
                      : 'text-white/60 hover:text-white'}"
                  >
                    {isEs ? 'Completa' : 'Full'}
                  </button>
                </div>
              </div>

              <!-- Límite de Cuadros por Segundo (FPS) -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-3 border-t border-white/[0.06]">
                <div>
                  <span class="font-medium text-white">{isEs ? 'Límite de Fotogramas (FPS)' : 'Framerate Cap (FPS)'}</span>
                  <p class="text-[11px] text-white/50">{isEs ? '30 FPS reduce el consumo de batería en laptops' : '30 FPS saves laptop battery'}</p>
                </div>
                <div class="flex items-center gap-1.5 bg-white/[0.06] p-1 rounded-xl border border-white/[0.08]">
                  {#each [
                    { fps: 30 as const, label: '30 FPS' },
                    { fps: 60 as const, label: '60 FPS' },
                    { fps: 0 as const, label: isEs ? 'Ilimitado' : 'Max' }
                  ] as item}
                    <button
                      type="button"
                      onclick={() => (labStore.targetFps = item.fps)}
                      class="lab-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold font-mono-numbers transition-all cursor-pointer {labStore.targetFps ===
                      item.fps
                        ? 'bg-white text-black'
                        : 'text-white/60 hover:text-white'}"
                    >
                      {item.label}
                    </button>
                  {/each}
                </div>
              </div>
            </div>
          </section>
        {:else if activeTab === 'audio'}
          <!-- 2. PESTAÑA: AUDIO Y VOLUMEN -->
          <section class="flex flex-col gap-4">
            <div>
              <h3 class="text-xs font-mono font-semibold uppercase tracking-wider text-sky-400">
                {isEs ? 'Control de Volumen y Síntesis Web Audio' : 'Volume Control & Web Audio Synthesis'}
              </h3>
              <p class="text-xs text-white/60 mt-0.5">
                {isEs
                  ? 'Efectos de laboratorio sintetizados en tiempo real offline (goteros, efervescencia, instrumental y pisadas).'
                  : 'Real-time synthesized offline lab sounds (droppers, effervescence, tools and footsteps).'}
              </p>
            </div>

            <div class="rounded-2xl apple-card-inner p-4 flex flex-col gap-4">
              <!-- Interruptor de Silencio -->
              <div class="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                    {#if labStore.soundEnabled}
                      <Volume2 class="w-4 h-4 text-emerald-400" />
                    {:else}
                      <VolumeX class="w-4 h-4 text-rose-400" />
                    {/if}
                  </div>
                  <div>
                    <span class="font-medium text-white">{isEs ? 'Sonido del Laboratorio' : 'Lab Audio'}</span>
                    <p class="text-[11px] text-white/50">{labStore.soundEnabled ? (isEs ? 'Activado' : 'Active') : (isEs ? 'Silenciado' : 'Muted')}</p>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    onclick={testSound}
                    class="lab-btn px-3 py-1 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                  >
                    🔔 {isEs ? 'Probar' : 'Test'}
                  </button>
                  <button
                    type="button"
                    onclick={() => labStore.toggleSound()}
                    class="lab-btn px-3.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer {labStore.soundEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'}"
                  >
                    {labStore.soundEnabled ? (isEs ? 'ON' : 'ON') : (isEs ? 'MUTED' : 'MUTED')}
                  </button>
                </div>
              </div>

              <!-- Control Deslizante de Volumen General -->
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-medium text-white">{isEs ? 'Volumen General (Master)' : 'Master Volume'}</span>
                  <span class="font-mono-numbers text-sky-400 font-semibold">{Math.round(labStore.masterVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={labStore.masterVolume}
                  oninput={(e) => labStore.setMasterVolume(Number((e.currentTarget as HTMLInputElement).value))}
                  class="w-full accent-sky-400 cursor-pointer h-2 bg-white/15 rounded-lg"
                />
              </div>

              <!-- Pisadas en Primera Persona -->
              <div class="flex items-center justify-between gap-3 pt-3 border-t border-white/[0.06] text-xs">
                <div>
                  <span class="font-medium text-white">{isEs ? 'Sonido de Pisadas en 1ª Persona' : 'First Person Footstep Sounds'}</span>
                  <p class="text-[11px] text-white/50">{isEs ? 'Audio de calzado con paso y carrera' : 'Walking and sprinting audio'}</p>
                </div>
                <button
                  type="button"
                  onclick={() => (labStore.footstepsEnabled = !labStore.footstepsEnabled)}
                  class="lab-btn px-3 py-1 rounded-full font-semibold border transition-all cursor-pointer {labStore.footstepsEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-white/10 text-white/50 border-white/15'}"
                >
                  {labStore.footstepsEnabled ? (isEs ? 'Activadas' : 'Enabled') : (isEs ? 'Silenciadas' : 'Disabled')}
                </button>
              </div>
            </div>
          </section>
        {:else if activeTab === 'controls'}
          <!-- 3. PESTAÑA: RATÓN Y MICROSCOPIO -->
          <section class="flex flex-col gap-4">
            <div>
              <h3 class="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">
                {isEs ? 'Sensibilidad y Control de Precisión' : 'Sensitivity & Precision Controls'}
              </h3>
              <p class="text-xs text-white/60 mt-0.5">
                {isEs
                  ? 'Ajusta la respuesta de la rueda del ratón en el microscopio óptico y la vista libre en primera persona.'
                  : 'Fine-tune mouse wheel response in the optical microscope and first-person free-look.'}
              </p>
            </div>

            <div class="rounded-2xl apple-card-inner p-4 flex flex-col gap-4">
              <!-- Sensibilidad de Rueda en el Microscopio -->
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between text-xs">
                  <div>
                    <span class="font-medium text-white">
                      🔬 {isEs ? 'Sensibilidad de Rueda en el Microscopio' : 'Microscope Wheel Sensitivity'}
                    </span>
                    <p class="text-[11px] text-white/50">
                      {isEs
                        ? 'Calibrado para fijar el 100% de nitidez girando la rueda solo lo suficiente'
                        : 'Calibrated to lock 100% focus by turning the wheel just enough'}
                    </p>
                  </div>
                  <span class="font-mono-numbers text-emerald-300 font-semibold">{Math.round(labStore.microscopeWheelSensitivity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={labStore.microscopeWheelSensitivity}
                  oninput={(e) => (labStore.microscopeWheelSensitivity = Number((e.currentTarget as HTMLInputElement).value))}
                  class="w-full accent-emerald-400 cursor-pointer h-2 bg-white/15 rounded-lg"
                />
                <div class="flex justify-between text-[10px] text-white/40 font-mono-numbers">
                  <span>{isEs ? '0.5x (Micro-precisión)' : '0.5x (Micro)'}</span>
                  <span>{isEs ? '1.0x (Equilibrado DIN)' : '1.0x (Standard)'}</span>
                  <span>{isEs ? '2.0x (Rápido)' : '2.0x (Fast)'}</span>
                </div>
              </div>

              <!-- Sensibilidad del Ratón en 1ª Persona -->
              <div class="flex flex-col gap-2 pt-3 border-t border-white/[0.06]">
                <div class="flex items-center justify-between text-xs">
                  <div>
                    <span class="font-medium text-white">
                      🚶 {isEs ? 'Sensibilidad de Mirada en 1ª Persona' : 'First Person Look Sensitivity'}
                    </span>
                    <p class="text-[11px] text-white/50">{isEs ? 'Velocidad de rotación de cámara con el ratón' : 'Mouse look rotation speed'}</p>
                  </div>
                  <span class="font-mono-numbers text-sky-300 font-semibold">{Math.round(labStore.mouseSensitivity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={labStore.mouseSensitivity}
                  oninput={(e) => (labStore.mouseSensitivity = Number((e.currentTarget as HTMLInputElement).value))}
                  class="w-full accent-sky-400 cursor-pointer h-2 bg-white/15 rounded-lg"
                />
              </div>

              <!-- Invertir Eje Y -->
              <div class="flex items-center justify-between gap-3 pt-3 border-t border-white/[0.06] text-xs">
                <div>
                  <span class="font-medium text-white">{isEs ? 'Invertir Eje Vertical (Eje Y)' : 'Invert Vertical Axis (Y)'}</span>
                  <p class="text-[11px] text-white/50">{isEs ? 'Control de estilo simulador de vuelo' : 'Flight simulator style pitch control'}</p>
                </div>
                <button
                  type="button"
                  onclick={() => (labStore.invertY = !labStore.invertY)}
                  class="lab-btn px-3 py-1 rounded-full font-semibold border transition-all cursor-pointer {labStore.invertY
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-white/10 text-white/50 border-white/15'}"
                >
                  {labStore.invertY ? (isEs ? 'Invertido' : 'Inverted') : (isEs ? 'Normal' : 'Normal')}
                </button>
              </div>
            </div>
          </section>
        {:else if activeTab === 'shortcuts'}
          <!-- 4. PESTAÑA: GUÍA DE TECLAS Y ATAJOS -->
          <section class="flex flex-col gap-3">
            <div>
              <h3 class="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400">
                {isEs ? 'Guía Completa de Teclas y Atajos Asignados' : 'Complete Keyboard & Shortcut Guide'}
              </h3>
              <p class="text-xs text-white/60 mt-0.5">
                {isEs
                  ? 'Todos los controles del laboratorio virtual para navegar e interactuar fluidamente.'
                  : 'All virtual lab controls for smooth navigation and interaction.'}
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <!-- Tarjeta 1: Movilidad -->
              <div class="p-3.5 rounded-2xl apple-card-inner flex flex-col gap-2">
                <span class="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                  {isEs ? 'Movimiento (Paseo 1ª Persona)' : 'Movement (1st Person)'}
                </span>
                <div class="flex flex-col gap-1.5 text-xs">
                  <div class="flex items-center justify-between">
                    <span class="text-white/70">{isEs ? 'Caminar / Desplazarse' : 'Walk'}</span>
                    <div class="flex items-center gap-1 font-mono">
                      <kbd class="px-1.5 py-0.5 rounded bg-white/15 border border-white/20 text-[10px]">W</kbd>
                      <kbd class="px-1.5 py-0.5 rounded bg-white/15 border border-white/20 text-[10px]">A</kbd>
                      <kbd class="px-1.5 py-0.5 rounded bg-white/15 border border-white/20 text-[10px]">S</kbd>
                      <kbd class="px-1.5 py-0.5 rounded bg-white/15 border border-white/20 text-[10px]">D</kbd>
                    </div>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-white/70">{isEs ? 'Correr (Sprint)' : 'Sprint'}</span>
                    <kbd class="px-2 py-0.5 rounded bg-white/15 border border-white/20 text-[10px] font-mono">Shift</kbd>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-white/70">{isEs ? 'Alternar 1ªP / Estación' : 'Toggle 1st Person'}</span>
                    <kbd class="px-2 py-0.5 rounded bg-white/15 border border-white/20 text-[10px] font-mono">V</kbd>
                  </div>
                </div>
              </div>

              <!-- Tarjeta 2: Interacción Instrumental (Química) -->
              <div class="p-3.5 rounded-2xl apple-card-inner flex flex-col gap-2">
                <span class="text-[11px] font-semibold text-sky-400 uppercase tracking-wider">
                  🧪 {isEs ? 'Acciones e Instrumentos' : 'Actions & Tools'}
                </span>
                <div class="flex flex-col gap-1.5 text-xs">
                  <div class="flex items-center justify-between">
                    <span class="text-white/70">{isEs ? 'Agarrar / Mirar Microscopio' : 'Grab / Inspect Tool'}</span>
                    <div class="flex items-center gap-1 font-mono">
                      <kbd class="px-1.5 py-0.5 rounded bg-white/15 border border-white/20 text-[10px]">E</kbd>
                      <span class="text-white/40">/</span>
                      <kbd class="px-1.5 py-0.5 rounded bg-white/15 border border-white/20 text-[10px]">Clic Izq.</kbd>
                    </div>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-white/70">{isEs ? 'Soltar objeto / Dejar' : 'Release / Drop'}</span>
                    <div class="flex items-center gap-1 font-mono">
                      <kbd class="px-1.5 py-0.5 rounded bg-white/15 border border-white/20 text-[10px]">Q</kbd>
                      <span class="text-white/40">/</span>
                      <kbd class="px-1.5 py-0.5 rounded bg-white/15 border border-white/20 text-[10px]">Clic Der.</kbd>
                    </div>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-white/70">{isEs ? 'Verter reactivo líquido' : 'Pour liquid'}</span>
                    <kbd class="px-2 py-0.5 rounded bg-white/15 border border-white/20 text-[10px] font-mono">R</kbd>
                  </div>
                </div>
              </div>

              <!-- Tarjeta 3: Microscopio Óptico (Biología) -->
              <div class="p-3.5 rounded-2xl apple-card-inner flex flex-col gap-2">
                <span class="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  🔬 {isEs ? 'Microscopio & Ocular' : 'Microscope & Eyepiece'}
                </span>
                <div class="flex flex-col gap-1.5 text-xs">
                  <div class="flex items-center justify-between">
                    <span class="text-white/70">{isEs ? 'Enfoque de precisión' : 'Precision focus'}</span>
                    <kbd class="px-2 py-0.5 rounded bg-white/15 border border-white/20 text-[10px] font-mono">{isEs ? 'Rueda del Ratón' : 'Mouse Wheel'}</kbd>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-white/70">{isEs ? 'Mover platina X-Y' : 'Stage pan'}</span>
                    <kbd class="px-2 py-0.5 rounded bg-white/15 border border-white/20 text-[10px] font-mono">{isEs ? 'Arrastrar en Ocular' : 'Drag on ocular'}</kbd>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-white/70">{isEs ? 'Salir / Alejarse' : 'Exit microscope'}</span>
                    <kbd class="px-2 py-0.5 rounded bg-white/15 border border-white/20 text-[10px] font-mono">ESC</kbd>
                  </div>
                </div>
              </div>

              <!-- Tarjeta 4: Atajos Generales y Sistema (STEAM) -->
              <div class="p-3.5 rounded-2xl apple-card-inner flex flex-col gap-2">
                <span class="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                  📚 {isEs ? 'Atajos de Sistema' : 'System Shortcuts'}
                </span>
                <div class="flex flex-col gap-1.5 text-xs">
                  <div class="flex items-center justify-between">
                    <span class="text-white/70">{isEs ? 'Menú de Configuración' : 'Settings Menu'}</span>
                    <kbd class="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400 text-sky-200 text-[10px] font-mono font-bold">F2</kbd>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-white/70">{isEs ? 'Mesa Química / Bio / STEAM' : 'Stations'}</span>
                    <div class="flex items-center gap-1 font-mono">
                      <kbd class="px-1.5 py-0.5 rounded bg-white/15 border border-white/20 text-[10px]">1</kbd>
                      <kbd class="px-1.5 py-0.5 rounded bg-white/15 border border-white/20 text-[10px]">2</kbd>
                      <kbd class="px-1.5 py-0.5 rounded bg-white/15 border border-white/20 text-[10px]">3</kbd>
                    </div>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-white/70">{isEs ? 'Cerrar ventanas / menús' : 'Close modal'}</span>
                    <kbd class="px-2 py-0.5 rounded bg-white/15 border border-white/20 text-[10px] font-mono">ESC</kbd>
                  </div>
                </div>
              </div>
            </div>
          </section>
        {:else if activeTab === 'language'}
          <!-- 5. PESTAÑA: IDIOMA -->
          <section class="flex flex-col gap-4">
            <div>
              <h3 class="text-xs font-mono font-semibold uppercase tracking-wider text-sky-400">
                {isEs ? 'Selección de Idioma del Entorno' : 'Language Selection'}
              </h3>
              <p class="text-xs text-white/60 mt-0.5">
                {isEs
                  ? 'Cambia el idioma de la interfaz, el manual científico y las guías de laboratorio.'
                  : 'Switch interface language, scientific manual and lab guides.'}
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onclick={() => (labStore.language = 'es')}
                class="lab-btn p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer {labStore.language ===
                'es'
                  ? 'bg-sky-500/15 border-sky-400 text-white shadow-md'
                  : 'apple-card-inner text-white/80'}"
              >
                <div class="flex items-center gap-3">
                  <span class="text-2xl">🇪🇸</span>
                  <div>
                    <span class="font-bold text-sm text-white block">Español</span>
                    <span class="text-[11px] text-white/50">Castellano (Estándar RSEQ / Educativo)</span>
                  </div>
                </div>
                {#if labStore.language === 'es'}
                  <Check class="w-5 h-5 text-sky-400" />
                {/if}
              </button>

              <button
                type="button"
                onclick={() => (labStore.language = 'en')}
                class="lab-btn p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer {labStore.language ===
                'en'
                  ? 'bg-sky-500/15 border-sky-400 text-white shadow-md'
                  : 'apple-card-inner text-white/80'}"
              >
                <div class="flex items-center gap-3">
                  <span class="text-2xl">🇬🇧</span>
                  <div>
                    <span class="font-bold text-sm text-white block">English</span>
                    <span class="text-[11px] text-white/50">English (International / STEAM Standard)</span>
                  </div>
                </div>
                {#if labStore.language === 'en'}
                  <Check class="w-5 h-5 text-sky-400" />
                {/if}
              </button>
            </div>
          </section>
        {/if}
      </div>

      <!-- Pie de página del Modal -->
      <footer class="px-5 sm:px-6 py-3.5 border-t border-white/[0.08] flex items-center justify-between gap-3 shrink-0 bg-white/[0.02]">
        <span class="text-[11px] text-white/50 flex items-center gap-1.5 font-mono-numbers">
          <Sparkles class="w-3.5 h-3.5 text-sky-400" />
          <span>{isEs ? 'Los cambios se aplican en tiempo real' : 'Changes apply in real-time'}</span>
        </span>

        <button
          type="button"
          onclick={close}
          class="lab-btn px-5 py-2 rounded-full bg-white text-black hover:bg-white/90 text-xs font-bold transition-all shadow-md cursor-pointer"
        >
          {isEs ? 'Aceptar & Cerrar (Esc)' : 'Done (Esc)'}
        </button>
      </footer>
    </div>
  </div>
{/if}
