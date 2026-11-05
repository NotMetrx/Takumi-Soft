import wasmUrl from './wasm/chemistry.wasm?url';
import * as reference from './numeric_reference';
import type { Inventory } from './numeric_reference';

interface Kernel extends WebAssembly.Exports {
  memory: WebAssembly.Memory;
  science_abi_version(): number;
  solve_equilibrium(volumeL: number, calcium: number, carbon: number, acetate: number, charge: number, citric: number, ammonia: number): number;
  strong_acid_hydronium(excess: number, temperatureC: number): number;
  neutralization_temperature(volumeMl: number, acid: number, base: number): number;
  gas_pressure(volumeMl: number, air: number, co2: number, temperatureC: number): number;
  trapped_air(volumeMl: number, temperatureC: number): number;
  gas_volume(co2: number): number;
  released_co2(carbon: number, charge: number, calcium: number, acetate: number, citric: number): number;
  copper_precipitate(copper: number, hydroxide: number): number;
}
let kernel: Kernel | undefined;
let loading: Promise<boolean> | undefined;
export const getScienceBackend = () => kernel ? 'rust-wasm' : 'typescript';

export function initializeScienceEngine(): Promise<boolean> {
  return loading ??= (async () => {
    try {
      const response = await fetch(wasmUrl, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const { instance } = await WebAssembly.instantiate(await response.arrayBuffer());
      const exports = instance.exports as Kernel;
      const functions = ['science_abi_version', 'solve_equilibrium', 'strong_acid_hydronium', 'neutralization_temperature', 'gas_pressure', 'trapped_air', 'gas_volume', 'released_co2', 'copper_precipitate'];
      if (functions.some(name => typeof exports[name] !== 'function') || !(exports.memory instanceof WebAssembly.Memory) || exports.science_abi_version() !== 1) throw new Error('ABI científica incompatible.');
      kernel = exports;
      return true;
    } catch (error) {
      console.warn('Rust/WASM no disponible; se utiliza el motor TypeScript local.', error);
      return false;
    }
  })();
}

function finite(value: number) {
  if (!Number.isFinite(value)) throw new Error('El modelo recibió datos inválidos o no pudo calcular un resultado finito.');
  return value;
}

export function solveEquilibrium(input: Inventory): ReturnType<typeof reference.solveEquilibrium> {
  let result: ReturnType<typeof reference.solveEquilibrium>;
  if (kernel) {
    const pointer = kernel.solve_equilibrium(input.volumeL, input.calcium, input.carbonMol, input.acetate, input.charge, input.citricMol, input.ammoniaMol);
    // Copy the nine ABI fields immediately: the next synchronous solve reuses this buffer.
    const [pH, residual, solid, hydroxideSolid, h, carbon, alpha1, alpha2, acetateIon] = new Float64Array(kernel.memory.buffer, pointer >>> 0, 9);
    result = { pH, residual, solid, hydroxideSolid, h, carbon, alpha1, alpha2, acetateIon };
  } else result = reference.solveEquilibrium(input);
  Object.values(result).forEach(finite);
  return result;
}
export function strongAcidHydronium(excess: number, temperatureC: number) {
  const h = finite(kernel ? kernel.strong_acid_hydronium(excess, temperatureC) : reference.strongAcidHydronium(excess, temperatureC));
  if (h <= 0) throw new Error('Concentración de hidronio fuera del rango numérico.');
  return h;
}
export const neutralizationTemperature = (volumeMl: number, acid: number, base: number) => finite(kernel ? kernel.neutralization_temperature(volumeMl, acid, base) : reference.neutralizationTemperature(volumeMl, acid, base));
export const gasPressure = (volumeMl: number, air: number, co2: number, temperatureC: number) => finite(kernel ? kernel.gas_pressure(volumeMl, air, co2, temperatureC) : reference.gasPressure(volumeMl, air, co2, temperatureC));
export const trappedAir = (volumeMl: number, temperatureC: number) => finite(kernel ? kernel.trapped_air(volumeMl, temperatureC) : reference.trappedAir(volumeMl, temperatureC));
export const gasVolume = (co2: number) => finite(kernel ? kernel.gas_volume(co2) : reference.gasVolume(co2));
export const releasedCO2 = (carbon: number, charge: number, calcium: number, acetate: number, citric: number) => finite(kernel ? kernel.released_co2(carbon, charge, calcium, acetate, citric) : reference.releasedCO2(carbon, charge, calcium, acetate, citric));
export const copperPrecipitate = (copper: number, hydroxide: number) => finite(kernel ? kernel.copper_precipitate(copper, hydroxide) : reference.copperPrecipitate(copper, hydroxide));
