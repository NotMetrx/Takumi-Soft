import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { measureHand, type HandSample } from './hand_gestures';

export class HandCamera {
  private stream: MediaStream | null = null;
  private detector: HandLandmarker | null = null;
  private frame = 0;
  private stopped = false;

  async start(video: HTMLVideoElement, onSample: (sample: HandSample | null, now: number) => void, onError: (message: string) => void) {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('La cámara requiere HTTPS o localhost y un navegador compatible. Puedes continuar con mouse.');
    }
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: {
      width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 20, max: 30 }, facingMode: 'user'
    } });
    if (this.stopped) { this.stop(); return; }
    video.srcObject = this.stream;
    this.stream.getVideoTracks()[0].onended = () => onError('Se perdió el acceso a la cámara. Vuelve a activarla o usa mouse.');
    const files = await FilesetResolver.forVisionTasks(`${import.meta.env.BASE_URL}models/mediapipe/wasm`);
    if (this.stopped) return;
    let detector: HandLandmarker;
    try {
      detector = await HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: `${import.meta.env.BASE_URL}models/mediapipe/hand_landmarker.task`, delegate: 'GPU' },
        runningMode: 'VIDEO', numHands: 1
      });
    } catch {
      detector = await HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: `${import.meta.env.BASE_URL}models/mediapipe/hand_landmarker.task`, delegate: 'CPU' },
        runningMode: 'VIDEO', numHands: 1
      });
    }
    if (this.stopped) { detector.close(); return; }
    this.detector = detector;
    await video.play();
    if (this.stopped) return;
    let lastInference = -Infinity, lastVideoTime = -1;
    const detect = (now: number) => {
      if (this.stopped) return;
      try {
        // shortcut: inferencia síncrona a 15 Hz; mover a Worker si las mediciones muestran bloqueos.
        if (!document.hidden && video.readyState >= 2 && now - lastInference >= 1000 / 15 && video.currentTime !== lastVideoTime) {
          lastInference = now;
          lastVideoTime = video.currentTime;
          const result = detector.detectForVideo(video, now);
          // Freshness starts at delivery; CPU inference can outlast the scene's 250 ms watchdog.
          lastInference = performance.now();
          onSample(measureHand(result.landmarks[0] ?? [], video.videoWidth / video.videoHeight), lastInference);
        } else if (!document.hidden && now - lastInference > 250) {
          lastInference = now;
          onSample(null, now);
        }
        this.frame = requestAnimationFrame(detect);
      } catch {
        onError('Falló el seguimiento de manos. Apaga y vuelve a activar la cámara o usa mouse.');
      }
    };
    this.frame = requestAnimationFrame(detect);
  }

  stop() {
    this.stopped = true;
    cancelAnimationFrame(this.frame);
    this.stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    this.stream = null;
    this.detector?.close();
    this.detector = null;
  }
}
