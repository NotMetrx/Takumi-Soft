import { describe, expect, it } from 'vitest';
import { Euler, Vector3 } from 'three';
import { flaskFluid, pourRate, streamHitsBeaker } from '../../src/lib/lab3d/fluid';

describe('Líquido y vertido de matraces', () => {
  it('conserva el volumen al inclinar en ambas direcciones y mantiene la superficie horizontal', () => {
    for (const fraction of [0.01, 0.2, 0.65]) {
      const upright = flaskFluid(0, fraction);
      for (const angle of [-1.95, -1, 1, 1.95]) {
        const fluid = flaskFluid(angle, fraction);
        expect(fluid.volume).toBeCloseTo(upright.volume, 4);
        for (let i = 0; i < fluid.positions.length; i += 3) {
          const [x, y, z] = fluid.positions.slice(i, i + 3);
          expect(x * Math.sin(angle) + y * Math.cos(angle)).toBeLessThanOrEqual(fluid.height + 1e-6);
          const radius = y < 0.56 ? 0.295 - (y - 0.035) * 0.2 / 0.525 : 0.095;
          expect(Math.hypot(x, z)).toBeLessThanOrEqual(radius + 1e-6);
        }
      }
    }
  });

  it('no vierte vertical y permite vaciar ambos matraces inclinados', () => {
    expect(pourRate(0, flaskFluid(0, 0.65).height)).toBe(0);
    for (const angle of [-1.95, 1.95]) {
      for (const fraction of [0.001, 0.1, 0.65]) {
        expect(pourRate(angle, flaskFluid(angle, fraction).height)).toBeGreaterThan(0);
      }
    }
  });

  it('solo acepta una boca por encima y dentro de la abertura del vaso', () => {
    for (const side of [-1, 1]) {
      const angle = side * 1.95;
      const nozzle = new Vector3(-Math.sign(angle) * 0.09, 0.81, 0)
        .applyEuler(new Euler(0, 0, angle)).add(new Vector3(side * 0.9, 1.65, 0));
      expect(streamHitsBeaker(nozzle)).toBe(true);
    }
    expect(streamHitsBeaker(new Vector3(0.12, 1.27, 0))).toBe(true);
    expect(streamHitsBeaker(new Vector3(0.4, 1.27, 0))).toBe(false);
    expect(streamHitsBeaker(new Vector3(0.1, 0.9, 0))).toBe(false);
  });
});
