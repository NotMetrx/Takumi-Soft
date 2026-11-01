<script lang="ts">
  import { onDestroy } from 'svelte';
  import { labStore } from '$lib/interaction/lab_store.svelte';
  import { Video, MousePointer, Shield, X, AlertTriangle, Hand } from '@lucide/svelte';

  let isRequesting = $state<boolean>(false);
  let errorMessage = $state<string>('');
  let videoEl = $state<HTMLVideoElement | null>(null);
  let activeStream = $state<MediaStream | null>(null);

  async function requestCamera() {
    isRequesting = true;
    errorMessage = '';
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador o dispositivo no soporta acceso a cámara web.');
      }
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
      activeStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' }
      });

      labStore.inputMode = 'gesture';
      labStore.isCameraActive = true;
      labStore.isCameraModalOpen = false;
    } catch (err: any) {
      errorMessage = err.message || 'Permiso de cámara denegado o cámara no disponible.';
    } finally {
      isRequesting = false;
    }
  }

  $effect(() => {
    if (videoEl && activeStream && labStore.isCameraActive) {
      videoEl.srcObject = activeStream;
    }
  });

  function stopCameraAndSwitchToMouse() {
    if (activeStream) {
      activeStream.getTracks().forEach((t) => t.stop());
      activeStream = null;
    }
    labStore.inputMode = 'mouse';
    labStore.isCameraActive = false;
    labStore.isCameraModalOpen = false;
  }

  onDestroy(() => {
    if (activeStream) {
      activeStream.getTracks().forEach((t) => t.stop());
    }
  });
</script>

<!-- Ventana Picture-in-Picture de SymbioTouch cuando la cámara está activa -->
{#if labStore.isCameraActive && activeStream}
  <div class="fixed bottom-16 left-6 z-30 lab-panel p-2.5 w-60 flex flex-col gap-2 border border-amber-500/40">
    <div class="flex items-center justify-between text-[11px] font-bold">
      <span class="text-amber-300 flex items-center gap-1.5">
        <Hand class="w-3.5 h-3.5" />
        SymbioTouch Visión Local
      </span>
      <button
        type="button"
        onclick={stopCameraAndSwitchToMouse}
        class="text-slate-400 hover:text-white cursor-pointer text-[10px] bg-slate-800 px-1.5 py-0.5 rounded"
      >
        Apagar
      </button>
    </div>
    <div class="relative rounded-xl overflow-hidden bg-black aspect-4/3 border border-slate-700">
      <video
        bind:this={videoEl}
        autoplay
        playsinline
        muted
        class="w-full h-full object-cover -scale-x-100"
      ></video>
      <div class="absolute bottom-1.5 left-1.5 right-1.5 bg-slate-950/80 backdrop-blur-xs px-2 py-1 rounded text-[10px] text-slate-200 flex items-center justify-between">
        <span>Gesto Pinza + Giro</span>
        <button
          type="button"
          onclick={() => {
            if (labStore.selectedReagentId) {
              labStore.triggerAnimatedPour(labStore.selectedReagentId, 10, 'gesture');
            }
          }}
          class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-1.5 py-0.5 rounded cursor-pointer"
        >
          Simular Pinza (+10mL)
        </button>
      </div>
    </div>
  </div>
{/if}

{#if labStore.isCameraModalOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="camera-modal-title"
  >
    <div class="lab-panel p-6 max-w-md w-full flex flex-col gap-4 border border-slate-700/80">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Video class="w-5 h-5" />
          </div>
          <div>
            <h2 id="camera-modal-title" class="text-base font-bold text-white">Control Gestual (SymbioTouch)</h2>
            <p class="text-xs text-slate-400">Interacción natural con manos o mouse 3D</p>
          </div>
        </div>
        <button
          type="button"
          onclick={() => (labStore.isCameraModalOpen = false)}
          class="lab-btn p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="bg-emerald-950/50 border border-emerald-500/30 p-3 rounded-xl flex items-start gap-2.5 text-xs text-emerald-200">
        <Shield class="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong class="font-bold block text-emerald-300">Privacidad Local Garantizada</strong>
          <span>El seguimiento se procesa localmente en tu navegador. Ningún fotograma de video se almacena ni se envía por red.</span>
        </div>
      </div>

      {#if errorMessage}
        <div class="bg-rose-950/60 border border-rose-500/40 p-3 rounded-xl flex items-center gap-2 text-xs text-rose-200">
          <AlertTriangle class="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      {/if}

      <div class="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2 text-xs text-slate-300">
        <span class="font-bold text-white">Modos de manipulación en el laboratorio 3D:</span>
        <ul class="list-disc pl-4 space-y-1">
          <li><strong>Arrastre 3D directo:</strong> Haz clic sobre cualquier matraz Erlenmeyer y arrástralo hacia el vaso central para verter continuamente.</li>
          <li><strong>SymbioTouch (Cámara):</strong> Activa la ventana espejo de cámara para manipular con gestos de pinza e inclinación.</li>
        </ul>
      </div>

      <div class="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onclick={requestCamera}
          disabled={isRequesting}
          class="lab-btn w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <Video class="w-4 h-4" />
          <span>{isRequesting ? 'Activando cámara...' : 'Activar Cámara (SymbioTouch)'}</span>
        </button>

        <button
          type="button"
          onclick={stopCameraAndSwitchToMouse}
          class="lab-btn w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <MousePointer class="w-4 h-4 text-indigo-400" />
          <span>Usar Interacción 3D con Mouse / Teclado</span>
        </button>
      </div>
    </div>
  </div>
{/if}
