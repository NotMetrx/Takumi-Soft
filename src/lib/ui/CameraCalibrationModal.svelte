<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { labStore } from '$lib/interaction/lab_store.svelte';
  import { HandCamera } from '$lib/input/hand_camera';
  import { HandGestures, type HandSample } from '$lib/input/hand_gestures';
  import { Video, MousePointer, Shield, X, AlertTriangle, Hand } from '@lucide/svelte';

  let isRequesting = $state(false);
  let errorMessage = $state('');
  let videoEl = $state<HTMLVideoElement>(null!);
  let cameraSession: HandCamera | null = null;
  const gestures = new HandGestures();
  let phase = $state<'open' | 'closed' | 'ready'>('open');
  let sampling = $state(false);
  let paused = $state(false);
  let previewExpanded = $state(true);
  let hasHand = $state(false);
  let captureProgress = $state(0);
  let sampleStart = 0;
  let samples: HandSample[] = [];
  let openSample: HandSample | null = null;
  let lostSince: number | null = null;

  function stopCameraAndSwitchToMouse() {
    cameraSession?.stop();
    cameraSession = null;
    if (videoEl) videoEl.srcObject = null;
    gestures.reset();
    labStore.gestureInput = null;
    labStore.gestureStatus = 'Cámara apagada';
    labStore.inputMode = 'mouse';
    labStore.isCameraActive = false;
    labStore.isCameraModalOpen = false;
    isRequesting = false;
    sampling = false;
    samples = [];
    openSample = null;
    hasHand = false;
    captureProgress = 0;
  }

  function cameraError(message: string) {
    stopCameraAndSwitchToMouse();
    errorMessage = message;
    labStore.isCameraModalOpen = true;
  }

  function onSample(sample: HandSample | null, now: number) {
    hasHand = sample !== null;
    if (sampling && lostSince !== null && now - lostSince > 350) { sampling = false; samples = []; captureProgress = 0; }
    if (!sample) {
      lostSince ??= now;
      if (now - lostSince >= 1500 && phase === 'ready') paused = true;
      labStore.gestureStatus = paused ? 'Seguimiento pausado. Abre la mano y pulsa Retomar.' : 'Muestra una mano completa con buena luz';
    } else lostSince = null;
    if (phase !== 'ready') {
      labStore.gestureInput = null;
      if (sample && sampling) {
        samples.push(sample);
        captureProgress = Math.min(1, samples.length / 8, (now - sampleStart) / 1000);
        if (now - sampleStart >= 1000 && samples.length >= 8) {
          const median = (key: 'x' | 'y' | 'pinch' | 'angle' | 'palmSize'): number =>
            (samples.map((s) => s[key]).sort((a, b) => a - b)[Math.floor(samples.length / 2)]) ?? 0;
          const measured: HandSample = {
            x: median('x'),
            y: median('y'),
            pinch: median('pinch'),
            angle: median('angle'),
            palmSize: median('palmSize'),
            landmarks: sample.landmarks
          };
          if (phase === 'open') { openSample = measured; phase = 'closed'; }
          else if (openSample && gestures.calibrate(openSample, measured)) {
            phase = 'ready';
            previewExpanded = false;
            labStore.gestureStatus = 'Calibración lista. Abre la mano antes de agarrar.';
          } else {
            phase = 'open';
            labStore.gestureStatus = 'No se distinguió la pinza. Repite con la mano abierta y después junta índice y pulgar.';
          }
          sampling = false;
          samples = [];
          captureProgress = 0;
        }
      }
      return;
    }
    if (paused) { labStore.gestureInput = null; return; }
    const state = gestures.update(sample, now);
    labStore.gestureInput = state;
  }

  async function requestCamera() {
    if (isRequesting) return;
    stopCameraAndSwitchToMouse();
    isRequesting = true;
    errorMessage = '';
    phase = 'open';
    previewExpanded = true;
    paused = false;
    lostSince = null;
    openSample = null;
    labStore.gestureStatus = 'Preparando cámara y seguimiento local…';
    const session = new HandCamera();
    cameraSession = session;
    try {
      await tick();
      await session.start(videoEl, onSample, cameraError);
      if (cameraSession !== session) return;
      labStore.inputMode = 'gesture';
      labStore.isCameraActive = true;
      labStore.isCameraModalOpen = false;
      labStore.gestureStatus = 'Calibra primero la mano abierta y después la pinza';
    } catch (error) {
      if (cameraSession === session) cameraError(error instanceof Error ? error.message : 'No se pudo iniciar la cámara.');
    } finally {
      if (cameraSession === session) isRequesting = false;
    }
  }

  function calibrate() {
    gestures.reset();
    labStore.gestureInput = null;
    samples = [];
    sampleStart = performance.now();
    captureProgress = 0;
    sampling = true;
  }

  onMount(() => {
    const pause = () => {
      if (labStore.isCameraActive) {
        paused = true;
        gestures.reset();
        labStore.gestureInput = null;
        labStore.gestureStatus = 'Seguimiento pausado. Abre la mano y pulsa Retomar.';
      }
    };
    const visibility = () => { if (document.hidden) pause(); };
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', stopCameraAndSwitchToMouse);
    return () => {
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', stopCameraAndSwitchToMouse);
    };
  });
  onDestroy(stopCameraAndSwitchToMouse);
</script>

<!-- Ventana Picture-in-Picture de SymbioTouch cuando la cámara está activa -->
{#if labStore.isCameraActive || isRequesting}
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
    {#if phase === 'ready'}<button type="button" onclick={() => previewExpanded = !previewExpanded} aria-expanded={previewExpanded} aria-controls="hand-camera-preview" class="lab-btn min-h-11 text-xs text-amber-200">{previewExpanded ? 'Ocultar video' : 'Mostrar video de la mano'}</button>{/if}
    <div id="hand-camera-preview" class:hidden={phase === 'ready' && !previewExpanded} class="relative rounded-xl overflow-hidden bg-black aspect-4/3 border border-slate-700">
      <video
        bind:this={videoEl}
        autoplay
        playsinline
        muted
        class="w-full h-full object-cover -scale-x-100"
      ></video>
    </div>
    <p class="text-[11px] flex items-center gap-1.5" class:text-emerald-300={hasHand} class:text-slate-300={!hasHand}>
      <span class="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true"></span>
      {isRequesting ? 'Cargando reconocimiento…' : hasHand ? 'Mano detectada' : 'Buscando una mano en el encuadre'}
    </p>
    <p class="text-[11px] text-slate-200" role="status">{labStore.gestureStatus}</p>
    {#if !isRequesting && phase !== 'ready'}
      <p class="text-[11px] text-amber-200">{phase === 'open' ? '1. Mantén la palma vertical y los dedos abiertos.' : '2. Junta índice y pulgar sin girar la mano.'}</p>
      <button type="button" onclick={calibrate} disabled={sampling || !hasHand} class="lab-btn bg-amber-500 text-slate-950 rounded-lg p-2 text-xs font-bold disabled:opacity-50">
        {sampling ? `Capturando… ${Math.round(captureProgress * 100)}%` : phase === 'open' ? 'Calibrar mano abierta' : 'Calibrar pinza'}
      </button>
    {:else if paused}
      <button type="button" onclick={() => { paused = false; gestures.reset(); lostSince = null; }} class="lab-btn bg-amber-500 text-slate-950 rounded-lg p-2 text-xs font-bold">Retomar con la mano abierta</button>
    {:else if phase === 'ready'}
      <p class="text-[11px] text-slate-300">Abre la mano para empezar. Apunta al matraz y junta índice y pulgar para agarrar. Sube o baja la mano para elevar o bajar el matraz. Acerca o aleja la mano para cambiar profundidad. Inclina hacia el vaso para verter. Abre para cortar y devolverlo.</p>
      <button type="button" onclick={() => { phase = 'open'; previewExpanded = true; gestures.reset(); labStore.gestureInput = null; }} class="min-h-11 text-xs text-amber-300 underline">Recalibrar</button>
    {/if}
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
          aria-label="Cerrar configuración de cámara"
          onclick={() => { if (isRequesting) stopCameraAndSwitchToMouse(); else labStore.isCameraModalOpen = false; }}
          class="lab-btn p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="bg-emerald-950/50 border border-emerald-500/30 p-3 rounded-xl flex items-start gap-2.5 text-xs text-emerald-200">
        <Shield class="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong class="font-bold block text-emerald-300">Procesamiento local</strong>
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
