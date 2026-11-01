<script lang="ts">
  import { labStore } from '$lib/interaction/lab_store.svelte';
  import ExplorationWorkspace from '$lib/ui/ExplorationWorkspace.svelte';
  import HUD from '$lib/ui/HUD.svelte';
  import LabScene from '$lib/lab3d/LabScene.svelte';
  import AccessibleControls from '$lib/ui/AccessibleControls.svelte';
  import TutorModal from '$lib/ui/TutorModal.svelte';
  import NotebookDrawer from '$lib/ui/NotebookDrawer.svelte';
  import CameraCalibrationModal from '$lib/ui/CameraCalibrationModal.svelte';
  import HomeExperimentsBookModal from '$lib/ui/HomeExperimentsBookModal.svelte';
</script>

{#if labStore.isExplorationMode}
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
  <div class="absolute bottom-5 right-5 z-20 pointer-events-auto">
    <AccessibleControls />
  </div>

  <!-- Modales Globales -->
  <TutorModal />
  <NotebookDrawer />
</main>
{/if}
<HomeExperimentsBookModal />
<CameraCalibrationModal />
