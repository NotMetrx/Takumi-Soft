import { describe, expect, it } from 'vitest';
import { HandGestures, measureHand, type HandSample } from '../../src/lib/input/hand_gestures';
const open: HandSample = { x: 0.5, y: 0.5, pinch: 1, angle: 0, palmSize: 0.4 };
const closed: HandSample = { ...open, pinch: 0.1 };
function controller() {
  const gestures = new HandGestures();
  expect(gestures.calibrate(open, closed)).toBe(true);
  gestures.update(open, 0);
  return gestures;
}
describe('Control gestual de una mano', () => {
  it('normaliza la pinza a la palma, respeta el espejo y no usa profundidad como medida', () => {
    const points = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 100 }));
    points[0] = { x: 0.5, y: 0.8, z: 900 };
    points[9] = { x: 0.5, y: 0.4, z: -90 };
    points[4] = { x: 0.2, y: 0.3, z: 0 };
    points[8] = { x: 0.3, y: 0.3, z: 0 };
    const sample = measureHand(points, 1)!;
    expect(sample.pinch).toBeCloseTo(0.25);
    expect(sample.x).toBe(0.75);
    expect(sample.palmSize).toBeCloseTo(0.4);
    const scaled = points.map(p => ({ x: p.x * 0.5, y: p.y * 0.5 }));
    expect(measureHand(scaled, 1)!.pinch).toBeCloseTo(sample.pinch);
    expect(measureHand(scaled, 1)!.palmSize).toBeCloseTo(sample.palmSize / 2);
    expect(measureHand([])).toBeNull();
    expect(measureHand(points.map(p => ({ ...p, x: NaN })))).toBeNull();
    expect(measureHand(points, Infinity)).toBeNull();
  });
  it('exige 150 ms de pinza estable y tolera pequeñas oscilaciones', () => {
    const g = controller();
    expect(g.update(closed, 10).pinched).toBe(false);
    expect(g.update(closed, 159).pinched).toBe(false);
    expect(g.update(closed, 160).pinched).toBe(true);
    expect(g.update({ ...closed, pinch: 0.5 }, 170).pinched).toBe(true);
  });
  it('corta al abrir y confirma la liberación tras 100 ms', () => {
    const g = controller();
    g.update(closed, 10);
    expect(g.update({ ...closed, angle: 0.8 }, 160).pouring).toBe(true);
    const releasing = g.update({ ...open, angle: 0.8 }, 170);
    expect(releasing.pinched).toBe(true);
    expect(releasing.pouring).toBe(false);
    expect(g.update(open, 270).pinched).toBe(false);
  });
  it('pausa inmediatamente sin mano, cancela tras 1500 ms y exige volver a abrir', () => {
    const g = controller();
    g.update(closed, 10); g.update(closed, 160);
    expect(g.update(null, 170).pouring).toBe(false);
    expect(g.update(null, 170).pinched).toBe(true);
    expect(g.update(null, 1670).pinched).toBe(false);
    expect(g.update(closed, 1700).pinched).toBe(false);
    expect(g.update(closed, 2000).pinched).toBe(false);
    g.update(open, 2100); g.update(closed, 2200);
    expect(g.update(closed, 2350).pinched).toBe(true);
  });
  it('calibra el ángulo neutro y rechaza dos gestos indistinguibles', () => {
    const g = new HandGestures();
    expect(g.calibrate(open, { ...closed, pinch: 0.95 })).toBe(false);
    expect(g.calibrate({ ...open, angle: 3 }, { ...closed, angle: 3 })).toBe(true);
    expect(Math.abs(g.update({ ...open, angle: -3.1 }, 0).tilt)).toBeLessThan(0.2);
    expect(g.calibrate({ ...open, pinch: NaN }, closed)).toBe(false);
    expect(g.calibrate(open, { ...closed, angle: Infinity })).toBe(false);
  });
  it.each([0.1, 0.55])('permite reabrir una pinza calibrada con los dedos muy separados (cierre %s)', pinch => {
    const g = new HandGestures();
    const grip = { ...closed, pinch };
    const relaxed = { ...open, pinch: pinch + 0.4 };
    expect(g.calibrate({ ...open, pinch: 3 }, grip)).toBe(true);
    expect(g.update(grip, 0)).toMatchObject({ needsOpen: true, pinched: false });
    expect(g.update(grip, 200)).toMatchObject({ needsOpen: true, pinched: false });
    expect(g.update(relaxed, 210).needsOpen).toBe(false);
    g.update(grip, 220);
    expect(g.update({ ...grip, angle: 0.8 }, 370).pinched).toBe(true);
    expect(g.update({ ...relaxed, angle: 0.8 }, 380).pouring).toBe(false);
    expect(g.update(relaxed, 480).pinched).toBe(false);
    g.update(null, 500);
    expect(g.update(null, 2000).needsOpen).toBe(true);
    expect(g.update(grip, 2010)).toMatchObject({ needsOpen: true, pinched: false });
  });
  it('suaviza el tamaño de palma y el giro sin retrasar el corte al abrir', () => {
    const g = controller();
    g.update(closed, 10); g.update(closed, 160);
    const moved = g.update({ ...closed, palmSize: 0.8, angle: 1 }, 170);
    expect(moved.palmSize).toBeGreaterThan(0.4);
    expect(moved.palmSize).toBeLessThan(0.5);
    expect(moved.tilt).toBeGreaterThan(0);
    expect(moved.tilt).toBeLessThan(0.2);
    g.update({ ...closed, angle: 1 }, 400);
    expect(g.update({ ...open, angle: 1 }, 410).pouring).toBe(false);
  });
  it('permite recorrer la mesa sin llevar la mano a los bordes de la cámara', () => {
    const g = new HandGestures();
    expect(g.update({ ...open, x: 0.15, y: 0.15 }, 0)).toMatchObject({ x: 0, y: 0 });
    const opposite = g.update({ ...open, x: 0.85, y: 0.85 }, 5000);
    expect(opposite.x).toBeCloseTo(1, 8); expect(opposite.y).toBeCloseTo(1, 8);
  });
});
