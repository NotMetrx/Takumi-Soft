/**
 * Sintetizador de efectos sonoros de laboratorio y libro físico (Web Audio API)
 * 100% Offline-First (Reto 02 Hack4Edu) — No requiere archivos MP3 externos.
 */

class LabSoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Sonido realista de hoja de papel deslizándose y doblándose al pasar de página
   */
  playPageTurn(direction: 'next' | 'prev' = 'next') {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.36;

    // 1. Ruido filtrado que simula la fricción de las fibras de papel pergamino
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Ruido rosa suave modulado por la curvatura de la hoja
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      const t = i / bufferSize;
      // Envolvente doble: despegue de la esquina + asentamiento de la hoja
      const env = Math.sin(t * Math.PI) * (0.75 + 0.25 * Math.sin(t * Math.PI * 3));
      output[i] = (b0 + b1 + b2 + white * 0.18) * env;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    // Filtro pasabanda que barre frecuencias según dirección de la página
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(2.2, now);
    if (direction === 'next') {
      filter.frequency.setValueAtTime(750, now);
      filter.frequency.exponentialRampToValueAtTime(2400, now + duration * 0.45);
      filter.frequency.exponentialRampToValueAtTime(920, now + duration);
    } else {
      filter.frequency.setValueAtTime(950, now);
      filter.frequency.exponentialRampToValueAtTime(2100, now + duration * 0.4);
      filter.frequency.exponentialRampToValueAtTime(680, now + duration);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.34, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.008, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  /**
   * Sonido de apertura de tapa dura de libro + abanico sutil de páginas
   */
  playBookOpen() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Golpe cálido de cubierta de cuero/madera sobre el atril
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(125, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.18);

    oscGain.gain.setValueAtTime(0.22, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);

    // Seguido del roce de la primera hoja abriéndose
    setTimeout(() => this.playPageTurn('next'), 90);
  }

  /**
   * Sonido de cierre firme del libro de tapa dura
   */
  playBookClose() {
    const ctx = this.getContext();
    if (!ctx) return;

    this.playPageTurn('prev');
    setTimeout(() => {
      const c = this.getContext();
      if (!c) return;
      const t = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(98, t);
      osc.frequency.exponentialRampToValueAtTime(42, t + 0.16);
      gain.gain.setValueAtTime(0.26, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    }, 180);
  }

  /**
   * Sonido de gota precisa (Bureta graduada o Gotero de indicador)
   */
  playDrop() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(1180, now + 0.09);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  /**
   * Sonido de clic táctil al usar instrumentos del laboratorio (Termómetro, Tiras de pH, Agitador)
   */
  playInstrumentClick() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(840, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.045);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  /**
   * Sonido procedimental de pisada sobre suelo de resina epoxi de laboratorio (1ª persona)
   */
  playFootstep(isSprint = false) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = isSprint ? 0.065 : 0.085;
    const pitchJitter = (Math.random() - 0.5) * 24;

    // Contacto sordo del talón en el suelo
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95 + pitchJitter, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + duration);

    const volume = isSprint ? 0.08 : 0.05;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  /**
   * Sonido de chorro de agua continuo para Ducha de Emergencia y Lavaojos (Web Audio API)
   */
  playWaterStream(duration = 2.4) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, now);
    filter.Q.setValueAtTime(1.2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.15);
    gain.gain.setValueAtTime(0.18, now + duration - 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  /**
   * Sonido de descarga criogénica presurizada de CO2 para el Extintor de Incendios
   */
  playGasDischarge(duration = 1.6) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(800, now + duration);
    filter.Q.setValueAtTime(2.5, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }
}

export const labSound = new LabSoundEngine();
