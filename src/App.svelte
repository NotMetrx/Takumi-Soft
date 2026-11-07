<script lang="ts">
  import { onMount } from 'svelte';
  import { labStore } from '$lib/interaction/lab_store.svelte';
  import { explorationStore } from '$lib/exploration/exploration_store.svelte';
  import { loadSession, saveSession } from '$lib/exploration/session_storage';
  import ExplorationWorkspace from '$lib/ui/ExplorationWorkspace.svelte';
  import HUD from '$lib/ui/HUD.svelte';
  import LabScene from '$lib/lab3d/LabScene.svelte';
  import AccessibleControls from '$lib/ui/AccessibleControls.svelte';
  import TutorModal from '$lib/ui/TutorModal.svelte';
  import NotebookDrawer from '$lib/ui/NotebookDrawer.svelte';
  import CameraCalibrationModal from '$lib/ui/CameraCalibrationModal.svelte';
  import HomeExperimentsBookModal from '$lib/ui/HomeExperimentsBookModal.svelte';
  import MicroscopeWorkstation from '$lib/ui/MicroscopeWorkstation.svelte';
  import SettingsModal from '$lib/ui/SettingsModal.svelte';
  import MultiplayerModal from '$lib/ui/MultiplayerModal.svelte';
  let sessionReady = $state(false);
  let storageEnabled = $state(false);
  let revision = 0;

  async function persist(session: ReturnType<typeof explorationStore.snapshot>, currentRevision: number) {
    try {
      await saveSession(session);
      if (currentRevision === revision) {
        explorationStore.saveStatus = 'Progreso guardado en este navegador';
        explorationStore.saveError = '';
      }
    } catch {
      if (currentRevision === revision) {
        explorationStore.saveStatus = 'No se pudo guardar el progreso';
        explorationStore.saveError = 'El ensayo sigue en memoria. Exporta el cuaderno; el guardado se reintentará con el próximo cambio.';
      }
    }
  }
  onMount(() => {
    let active = true;
    loadSession().then(saved => {
      if (!active) return;
      if (saved !== undefined && explorationStore.restore(saved)) labStore.enterExploration();
      storageEnabled = true;
    }).catch(error => {
      if (!active) return;
      explorationStore.saveStatus = 'Recuperación local no disponible';
      explorationStore.saveError = error instanceof Error ? error.message : 'No se pudo leer la sesión. Exporta el cuaderno antes de cerrar.';
    }).finally(() => { if (active) sessionReady = true; });
    const flush = () => {
      if (sessionReady && storageEnabled) void persist(explorationStore.snapshot(labStore.isExplorationMode), ++revision);
    };
    const visibility = () => { if (document.hidden) flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', visibility);
    return () => { active = false; window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', visibility); };
  });
  $effect(() => {
    if (!sessionReady || !storageEnabled) return;
    const session = explorationStore.snapshot(labStore.isExplorationMode);
    const currentRevision = ++revision;
    explorationStore.saveStatus = 'Guardando progreso…';
    const timer = window.setTimeout(() => { void persist(session, currentRevision); }, 300);
    return () => window.clearTimeout(timer);
  });
</script>

{#if !sessionReady}
  <main class="min-h-screen bg-[#080c14] text-slate-200 flex items-center justify-center"><p role="status">Recuperando tu laboratorio…</p></main>
{:else if labStore.isExplorationMode}
  <ExplorationWorkspace />
{:else}
<main class="relative w-screen h-screen overflow-hidden bg-[#080c14] flex flex-col">
  <!-- HUD de Instrumentación Científica -->
  <HUD />

  <!-- Estación de Laboratorio 3D en Primera Persona (Three.js WebGL2) -->
  <div class="flex-1 w-full h-full relative z-0">
    <LabScene />
  </div>

  <!-- Dosificador de Precisión (Esquina inferior derecha) -->
  {#if !labStore.isMicroscopeActive}
    <div class="absolute bottom-5 right-5 z-20 pointer-events-auto">
      <AccessibleControls />
    </div>
  {/if}

  <!-- Estación Óptica Binocular del Microscopio 3D -->
  <MicroscopeWorkstation />

  <!-- Modales Globales -->
  <TutorModal />
  <NotebookDrawer />
</main>
{/if}
<HomeExperimentsBookModal />
<CameraCalibrationModal />
<SettingsModal />
<MultiplayerModal />
