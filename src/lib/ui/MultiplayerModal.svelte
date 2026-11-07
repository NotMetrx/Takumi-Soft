<script lang="ts">
  import { multiplayerStore } from '$lib/multiplayer/multiplayer_store.svelte';
  import { labStore, EXPERIMENT_PRESETS } from '$lib/interaction/lab_store.svelte';
  import { labSound } from '$lib/audio/lab_sound';
  import {
    Users,
    X,
    Wifi,
    Radio,
    Sparkles,
    ShieldCheck,
    Megaphone,
    GraduationCap,
    FlaskConical,
    QrCode,
    Copy,
    Check
  } from '@lucide/svelte';

  let copied = $state(false);

  function copyLocalLink() {
    labSound.playInstrumentClick();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('http://192.168.43.198:5173/');
      copied = true;
      setTimeout(() => (copied = false), 2000);
    }
  }

  function syncPresetToClass(presetId: string) {
    labSound.playInstrumentClick();
    const preset = EXPERIMENT_PRESETS.find((p) => p.id === presetId);
    multiplayerStore.broadcastMyState('SYNC_EXPERIMENT', {
      presetId,
      title: preset?.title
    });
    labStore.loadExperimentPreset(presetId);
  }
</script>

{#if multiplayerStore.isModalOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
    role="dialog"
    aria-modal="true"
    aria-labelledby="multiplayer-title"
  >
    <div
      class="apple-glass rounded-3xl p-5 sm:p-7 max-w-2xl w-full border border-white/[0.12] shadow-2xl flex flex-col gap-5 text-white max-h-[90vh] overflow-y-auto"
    >
      <!-- Cabecera del Modal -->
      <div class="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/35 flex items-center justify-center shadow-lg">
            <Users class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 id="multiplayer-title" class="text-base sm:text-lg font-bold tracking-tight text-white">
                Aula de Laboratorio 3D Multiusuario
              </h2>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                FASE BETA
              </span>
            </div>
            <p class="text-xs text-white/60">
              Colaboración síncrona en red local (Reto 02 Hack4edu · Zero-Cloud & 100% Offline)
            </p>
          </div>
        </div>

        <button
          type="button"
          onclick={() => multiplayerStore.toggleModal(false)}
          class="lab-btn w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
          aria-label="Cerrar modal de aula virtual"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Tarjeta de Estado de Sala Local -->
      <div class="apple-card-inner rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-white/[0.08]">
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
          <div>
            <span class="text-[10px] uppercase font-bold text-white/50 tracking-wider block">Sala Local Activa</span>
            <span class="font-mono-numbers text-sm font-bold text-white">{multiplayerStore.roomId}</span>
          </div>
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onclick={copyLocalLink}
            class="lab-btn flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-white flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
            title="Copiar enlace de conexión en red local"
          >
            {#if copied}
              <Check class="w-3.5 h-3.5 text-emerald-400" />
              <span>¡Copiado!</span>
            {:else}
              <Copy class="w-3.5 h-3.5" />
              <span>Enlace LAN</span>
            {/if}
          </button>

          <button
            type="button"
            onclick={() => (multiplayerStore.myRole = multiplayerStore.myRole === 'docente' ? 'estudiante' : 'docente')}
            class="lab-btn px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer border {multiplayerStore.myRole === 'docente'
              ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/35'
              : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/35'}"
            title="Alternar rol de usuario"
          >
            <GraduationCap class="w-3.5 h-3.5" />
            <span>Rol: {multiplayerStore.myRole === 'docente' ? '👨‍🏫 Docente' : '🔬 Alumno'}</span>
          </button>
        </div>
      </div>

      <!-- Panel de Control del Docente (Herramientas Pedagógicas) -->
      {#if multiplayerStore.myRole === 'docente'}
        <div class="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/25 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Megaphone class="w-3.5 h-3.5" /> Panel de Conducción Docente
            </span>
            <span class="text-[10.5px] text-white/50">Control de aula en vivo</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onclick={() => multiplayerStore.callAllStudentsToSmartBoard()}
              class="lab-btn p-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 text-cyan-100 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all"
            >
              <Megaphone class="w-4 h-4 text-cyan-300 shrink-0" />
              <div class="text-left">
                <div class="leading-tight">📢 Convocar Todos a la Pizarra</div>
                <div class="text-[10px] text-cyan-300/70 font-normal">Reúne la atención en la SmartBoard</div>
              </div>
            </button>

            <button
              type="button"
              onclick={() => multiplayerStore.toggleDemoClassmates()}
              class="lab-btn p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all {multiplayerStore.demoClassmatesActive
                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/30 text-emerald-100'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70'}"
            >
              <Sparkles class="w-4 h-4 text-emerald-300 shrink-0" />
              <div class="text-left">
                <div class="leading-tight">
                  {multiplayerStore.demoClassmatesActive ? '👥 Compañeros 3D: ACTIVOS' : '👥 Compañeros 3D: PAUSADOS'}
                </div>
                <div class="text-[10px] opacity-75 font-normal">Avatares autónomos para demo pitch</div>
              </div>
            </button>
          </div>
        </div>
      {/if}

      <!-- Lista de Avatares y Alumnos Conectados en la Sala -->
      <div class="flex flex-col gap-2.5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-white/60">
            Personas en este Laboratorio ({multiplayerStore.peers.length + 1})
          </span>
          <span class="text-[11px] font-mono-numbers text-white/40">Latencia LAN: &lt; 2 ms</span>
        </div>

        <div class="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
          <!-- Mi Avatar -->
          <div class="apple-card-inner rounded-xl p-3 flex items-center justify-between border border-cyan-500/30 bg-cyan-500/10">
            <div class="flex items-center gap-3">
              <span class="text-xl">👨‍🔬</span>
              <div>
                <div class="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{multiplayerStore.myName}</span>
                  <span class="px-1.5 py-0.2 rounded text-[9px] bg-cyan-500/30 text-cyan-200">LOCAL</span>
                </div>
                <span class="text-[11px] text-white/60">
                  Pabellón: {labStore.activeStation.toUpperCase()} · EPP: {labStore.isFullyProtected ? 'Completo' : 'Parcial'}
                </span>
              </div>
            </div>
            <span class="text-[10px] font-mono-numbers text-cyan-300 font-semibold">TÚ</span>
          </div>

          <!-- Compañeros Conectados -->
          {#each multiplayerStore.peers as peer (peer.id)}
            <div class="apple-card-inner rounded-xl p-3 flex items-center justify-between border border-white/[0.06]">
              <div class="flex items-center gap-3">
                <span class="text-xl">{peer.role === 'docente' ? '👨‍🏫' : '👩‍🔬'}</span>
                <div>
                  <div class="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{peer.name}</span>
                    {#if peer.isSimulated}
                      <span class="px-1.5 py-0.2 rounded text-[8.5px] bg-purple-500/20 text-purple-200 border border-purple-500/30">
                        SIMULADO 3D
                      </span>
                    {/if}
                  </div>
                  <span class="text-[11px] text-white/60">
                    {peer.activityLabel}
                  </span>
                </div>
              </div>

              <div class="text-right flex items-center gap-1.5">
                <span class="px-2 py-0.5 rounded-full text-[9.5px] font-medium {peer.safetyCoat && peer.safetyGoggles
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-amber-500/20 text-amber-300'}">
                  {peer.safetyCoat && peer.safetyGoggles ? '🛡️ EPP OK' : '⚠️ Falta EPP'}
                </span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}
