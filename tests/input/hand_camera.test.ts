import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ files: vi.fn(), create: vi.fn() }));
vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks: mocks.files }, HandLandmarker: { createFromOptions: mocks.create }
}));
import { HandCamera } from '../../src/lib/input/hand_camera';

describe('Ciclo de vida de cámara y MediaPipe', () => {
  let track: { stop: ReturnType<typeof vi.fn>; onended: (() => void) | null };
  let stream: MediaStream;
  let getUserMedia: ReturnType<typeof vi.fn>;
  let detector: { close: ReturnType<typeof vi.fn>; detectForVideo: ReturnType<typeof vi.fn> };
  let video: HTMLVideoElement;
  beforeEach(() => {
    track = { stop: vi.fn(), onended: null };
    stream = { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
    getUserMedia = vi.fn().mockResolvedValue(stream);
    detector = { close: vi.fn(), detectForVideo: vi.fn().mockReturnValue({ landmarks: [] }) };
    mocks.files.mockReset().mockResolvedValue({});
    mocks.create.mockReset().mockResolvedValue(detector);
    vi.stubGlobal('window', { isSecureContext: true });
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    vi.stubGlobal('document', { hidden: false });
    vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(42));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    video = { play: vi.fn().mockResolvedValue(undefined), srcObject: null } as unknown as HTMLVideoElement;
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it('no pide permiso hasta iniciar y carga solo recursos locales', async () => {
    const camera = new HandCamera();
    expect(getUserMedia).not.toHaveBeenCalled();
    await camera.start(video, vi.fn(), vi.fn());
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false }));
    expect(mocks.files).toHaveBeenCalledWith('/models/mediapipe/wasm');
    expect(mocks.create.mock.calls[0][1].baseOptions.modelAssetPath).toBe('/models/mediapipe/hand_landmarker.task');
    camera.stop();
    expect(track.stop).toHaveBeenCalledOnce();
    expect(detector.close).toHaveBeenCalledOnce();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
  });
  it('libera permisos que llegan después de cancelar', async () => {
    let resolve!: (value: MediaStream) => void;
    getUserMedia.mockImplementation(() => new Promise<MediaStream>(r => { resolve = r; }));
    const camera = new HandCamera();
    const starting = camera.start(video, vi.fn(), vi.fn());
    camera.stop(); resolve(stream); await starting;
    expect(track.stop).toHaveBeenCalledOnce();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('cierra el modelo si termina de cargar después de apagar', async () => {
    let resolve!: (value: typeof detector) => void;
    mocks.create.mockImplementation(() => new Promise(r => { resolve = r; }));
    const camera = new HandCamera();
    const starting = camera.start(video, vi.fn(), vi.fn());
    await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
    camera.stop(); resolve(detector); await starting;
    expect(track.stop).toHaveBeenCalledOnce();
    expect(detector.close).toHaveBeenCalledOnce();
  });
  it('permite informar el permiso rechazado sin iniciar detección', async () => {
    getUserMedia.mockRejectedValue(new Error('Permiso denegado'));
    const camera = new HandCamera();
    await expect(camera.start(video, vi.fn(), vi.fn())).rejects.toThrow('Permiso denegado');
    expect(mocks.create).not.toHaveBeenCalled();
    camera.stop();
  });
  it('entrega una detección lenta como reciente y deja tiempo entre inferencias', async () => {
    let frame!: FrameRequestCallback;
    vi.mocked(requestAnimationFrame).mockImplementation(callback => { frame = callback; return 42; });
    const clock = vi.spyOn(performance, 'now').mockReturnValue(450);
    Object.assign(video, { readyState: 2, currentTime: 1, videoWidth: 640, videoHeight: 480 });
    const landmarks = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
    landmarks[0].y = 0.8; landmarks[9].y = 0.4;
    detector.detectForVideo.mockReturnValue({ landmarks: [landmarks] });
    const onSample = vi.fn();
    const camera = new HandCamera();
    await camera.start(video, onSample, vi.fn());
    frame(100);
    expect(detector.detectForVideo).toHaveBeenCalledWith(video, 100);
    expect(onSample).toHaveBeenLastCalledWith(expect.objectContaining({ palmSize: 0.4 }), 450);
    Object.assign(video, { currentTime: 2 });
    frame(500);
    expect(detector.detectForVideo).toHaveBeenCalledOnce();
    clock.mockReturnValue(520);
    frame(517);
    expect(detector.detectForVideo).toHaveBeenCalledTimes(2);
    camera.stop();
  });
  it('informa pérdida de seguimiento si el video se congela', async () => {
    let frame!: FrameRequestCallback;
    vi.mocked(requestAnimationFrame).mockImplementation(callback => { frame = callback; return 42; });
    vi.spyOn(performance, 'now').mockReturnValue(100);
    Object.assign(video, { readyState: 2, currentTime: 1, videoWidth: 640, videoHeight: 480 });
    const onSample = vi.fn();
    const camera = new HandCamera();
    await camera.start(video, onSample, vi.fn());
    frame(100); frame(351);
    expect(detector.detectForVideo).toHaveBeenCalledOnce();
    expect(onSample).toHaveBeenLastCalledWith(null, 351);
    camera.stop();
  });
});
