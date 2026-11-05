// TypeScript reference for parity tests and browsers where the local WASM cannot load.
const R = 8.314462618, AMBIENT = 101.325;
const K1 = 4.3e-7, K2 = 4.7e-11, KA = 1.8e-5, KSP = 8.7e-9;
export interface Inventory {
  volumeL: number; calcium: number; carbonMol: number; acetate: number;
  charge: number; citricMol: number; ammoniaMol: number;
}

function nonnegative(...values: number[]) {
  if (values.some(value => !Number.isFinite(value) || value < 0)) throw new Error('Inventario numérico inválido.');
}

export function solveEquilibrium({ volumeL, calcium, carbonMol, acetate, charge, citricMol, ammoniaMol }: Inventory) {
  nonnegative(volumeL, calcium, carbonMol, acetate, citricMol, ammoniaMol);
  if (volumeL === 0 || !Number.isFinite(charge)) throw new Error('Volumen o balance de carga inválido.');
  const c1 = 10 ** -3.13, c2 = 10 ** -4.76, c3 = 10 ** -6.40;
  const at = (pH: number) => {
    const h = 10 ** -pH;
    const denominator = h * h + K1 * h + K1 * K2;
    const alpha1 = K1 * h / denominator, alpha2 = K1 * K2 / denominator;
    const product = alpha2 > 0 ? KSP * volumeL ** 2 / alpha2 : Infinity;
    let solid = 0;
    if (calcium * carbonMol > product) {
      solid = 2 * (calcium * carbonMol - product)
        / (calcium + carbonMol + Math.sqrt((calcium - carbonMol) ** 2 + 4 * product));
    }
    let hydroxideSolid = 0;
    const maxCalciumFromHydroxide = 1.3e-6 * volumeL / (1e-14 / h) ** 2;
    if (calcium - solid > maxCalciumFromHydroxide) {
      const freeCalcium = maxCalciumFromHydroxide;
      const dissolvedCarbon = alpha2 > 0 && freeCalcium > 0 ? KSP * volumeL ** 2 / (freeCalcium * alpha2) : Infinity;
      solid = Math.min(calcium - freeCalcium, Math.max(0, carbonMol - dissolvedCarbon));
      hydroxideSolid = Math.max(0, calcium - freeCalcium - solid);
    }
    const carbon = Math.max(0, carbonMol - solid);
    const acetateIon = acetate * KA / (KA + h);
    const citrateCharge = citricMol * (c1 * h * h + 2 * c1 * c2 * h + 3 * c1 * c2 * c3)
      / (h ** 3 + c1 * h * h + c1 * c2 * h + c1 * c2 * c3);
    const ammonium = ammoniaMol * h / (h + 1e-14 / 1.8e-5);
    const residual = h * volumeL + charge + 2 * (calcium - solid - hydroxideSolid)
      + ammonium - 1e-14 / h * volumeL - carbon * (alpha1 + 2 * alpha2) - acetateIon - citrateCharge;
    return { residual, solid, hydroxideSolid, h, carbon, alpha1, alpha2, acetateIon };
  };
  let low = -1, high = 15;
  for (let i = 0; i < 90; i++) {
    const middle = (low + high) / 2;
    if (at(middle).residual > 0) low = middle;
    else high = middle;
  }
  const pH = (low + high) / 2;
  return { pH, ...at(pH) };
}

export function strongAcidHydronium(excess: number, temperatureC: number) {
  if (!Number.isFinite(excess) || !Number.isFinite(temperatureC) || temperatureC <= -273.15) throw new Error('Temperatura o concentración inválida.');
  const kw = temperatureC === 25 ? 1e-14 : 1e-14 * Math.exp((55800 / 8.314) * (1 / 298.15 - 1 / (temperatureC + 273.15)));
  const root = Math.sqrt(excess * excess + 4 * kw);
  return excess >= 0 ? (excess + root) / 2 : 2 * kw / (root - excess);
}
export function neutralizationTemperature(volumeMl: number, acidMol: number, baseMol: number) {
  nonnegative(volumeMl, acidMol, baseMol);
  if (!volumeMl) throw new Error('Volumen nulo.');
  return 25 + Math.min(acidMol, baseMol) * 57300 / (volumeMl * 4.184);
}
export function gasPressure(volumeMl: number, airMol: number, co2Mol: number, temperatureC: number) {
  nonnegative(volumeMl, airMol, co2Mol);
  if (volumeMl >= 250 || !Number.isFinite(temperatureC) || temperatureC <= -273.15) throw new Error('Colector o temperatura inválidos.');
  return (airMol + co2Mol) * R * (temperatureC + 273.15) / ((250 - volumeMl) / 1000);
}
export function trappedAir(volumeMl: number, temperatureC: number) {
  nonnegative(volumeMl);
  if (volumeMl >= 250 || !Number.isFinite(temperatureC) || temperatureC <= -273.15) throw new Error('Colector o temperatura inválidos.');
  return AMBIENT * ((250 - volumeMl) / 1000) / (R * (temperatureC + 273.15));
}
export function gasVolume(co2Mol: number) {
  nonnegative(co2Mol);
  return co2Mol * R * 298.15 / AMBIENT * 1000;
}
export function releasedCO2(carbon: number, charge: number, calcium: number, acetate: number, citric: number) {
  nonnegative(carbon, calcium, acetate, citric);
  if (!Number.isFinite(charge)) throw new Error('Balance de carga inválido.');
  return Math.min(carbon, Math.max(0, carbon - (charge + 2 * calcium - acetate - 3 * citric)));
}
export function copperPrecipitate(copper: number, hydroxide: number) {
  nonnegative(copper, hydroxide);
  return Math.min(copper, hydroxide / 2) * 97.56;
}
