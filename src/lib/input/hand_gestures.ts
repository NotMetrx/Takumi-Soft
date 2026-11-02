export interface HandPoint { x: number; y: number }
export interface HandSample { x: number; y: number; pinch: number; angle: number; palmSize: number }
export interface GestureState {
  x: number; y: number; tilt: number; palmSize: number; pinched: boolean; pouring: boolean;
  tracked: boolean; timestampMs: number;
}

export function measureHand(points: HandPoint[], aspect = 4 / 3): HandSample | null {
  if (!Number.isFinite(aspect) || aspect <= 0 || points.length !== 21 || !points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))) return null;
  const distance = (a: HandPoint, b: HandPoint) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);
  const palm = distance(points[0], points[9]);
  if (palm < 0.025) return null;
  return {
    x: 1 - (points[4].x + points[8].x) / 2,
    y: (points[4].y + points[8].y) / 2,
    palmSize: palm,
    pinch: distance(points[4], points[8]) / palm,
    angle: Math.atan2((points[0].x - points[9].x) * aspect, points[0].y - points[9].y)
  };
}

export class HandGestures {
  private closeThreshold = 0.25;
  private openThreshold = 0.4;
  private neutralAngle = 0;
  private candidateSince: number | null = null;
  private releaseSince: number | null = null;
  private lostSince: number | null = null;
  private lastTime = 0;
  private armed = false;
  private state: GestureState = { x: 0.5, y: 0.5, tilt: 0, palmSize: 0, pinched: false, pouring: false, tracked: false, timestampMs: 0 };

  calibrate(open: HandSample, closed: HandSample) {
    if (open.pinch - closed.pinch < 0.2 || closed.pinch < 0) return false;
    const gap = open.pinch - closed.pinch;
    this.closeThreshold = closed.pinch + gap * 0.3;
    this.openThreshold = closed.pinch + gap * 0.65;
    this.neutralAngle = open.angle;
    this.reset();
    return true;
  }

  reset() {
    this.armed = false;
    this.candidateSince = this.releaseSince = this.lostSince = null;
    this.state = { ...this.state, pinched: false, pouring: false, tracked: false };
  }

  update(sample: HandSample | null, now: number): GestureState {
    const dt = Math.max(0, now - this.lastTime);
    this.lastTime = now;
    if (!sample) {
      this.lostSince ??= now;
      this.candidateSince = this.releaseSince = null;
      if (now - this.lostSince >= 1500) this.reset();
      this.state = { ...this.state, tracked: false, pouring: false, timestampMs: now };
      return this.state;
    }
    this.lostSince = null;
    if (sample.pinch >= this.openThreshold) this.armed = true;
    let pinched = this.state.pinched;
    if (!pinched && this.armed && sample.pinch <= this.closeThreshold) {
      this.candidateSince ??= now;
      if (now - this.candidateSince >= 150) pinched = true;
    } else this.candidateSince = null;
    if (pinched && sample.pinch >= this.openThreshold) {
      this.releaseSince ??= now;
      if (now - this.releaseSince >= 100) pinched = false;
    } else this.releaseSince = null;
    const measuredTilt = Math.atan2(Math.sin(sample.angle - this.neutralAngle), Math.cos(sample.angle - this.neutralAngle));
    const smoothing = this.state.tracked ? 1 - Math.exp(-dt / 65) : 1;
    const tilt = this.state.tracked ? this.state.tilt + Math.atan2(Math.sin(measuredTilt - this.state.tilt), Math.cos(measuredTilt - this.state.tilt)) * smoothing : measuredTilt;
    const sizeSmoothing = this.state.tracked ? 1 - Math.exp(-dt / 150) : 1;
    const workspace = (coordinate: number) => Math.max(0, Math.min(1, (coordinate - 0.15) / 0.7));
    this.state = {
      x: this.state.x + (workspace(sample.x) - this.state.x) * smoothing,
      y: this.state.y + (workspace(sample.y) - this.state.y) * smoothing,
      palmSize: this.state.palmSize + (sample.palmSize - this.state.palmSize) * sizeSmoothing,
      tilt, pinched, tracked: true, timestampMs: now,
      pouring: pinched && this.releaseSince === null && Math.abs(tilt) > Math.PI / 9
    };
    return this.state;
  }
}
