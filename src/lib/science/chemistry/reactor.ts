import { chemical, REACTION_SOURCES } from './catalog';
import { solveEquilibrium, neutralizationTemperature, gasPressure, trappedAir, gasVolume, releasedCO2, copperPrecipitate } from './numeric_engine';

export const REACTOR_MODEL = 'aqueous-exploration-1.0.0';
const AMBIENT = 101.325;
export interface ReactorState {
  volumeMl: number;
  addedMl: Record<string, number>;
  carbonMol: number;
  generatedCO2Mol: number;
  trappedCO2Mol: number;
  escapedCO2Mol: number;
  closed: boolean;
  airMol: number;
}
export interface Hazard { id: string; title: string; detail: string; severity: 'warning' | 'danger'; source: string }
export interface ReactionObservation { id: string; title: string; equation: string; explanation: string; source: string }
export interface ReactorResult {
  modelId: string; coverage: 'quantitative' | 'partial' | 'unknown'; pH: number | null;
  temperatureC: number | null; pressureKpa: number | null;
  gasMl: number | null; trappedGasMl: number | null;
  precipitateG: number | null; precipitateName: string | null;
  color: string; observations: ReactionObservation[]; hazards: Hazard[];
  limitations: string[]; species: { name: string; mol: number }[];
  stopped: boolean;
}
const inert = ['water', 'salt', 'sugar'];
const core = [...inert, 'hcl', 'naoh', 'acetic', 'acetate', 'bicarbonate', 'carbonate', 'calcium', 'citric', 'ammonia'];
const moles = (s: ReactorState, id: string) => (s.addedMl[id] ?? 0) / 1000 * chemical(id).concentrationM;
export const initialReactor = (): ReactorState => ({ volumeMl: 50, addedMl: {}, carbonMol: 0,
  generatedCO2Mol: 0, trappedCO2Mol: 0, escapedCO2Mol: 0, closed: false, airMol: 0 });
const idsOf = (s: ReactorState) => Object.keys(s.addedMl).filter(id => s.addedMl[id] > 0);
const subset = (ids: string[], allowed: string[]) => ids.every(id => allowed.includes(id));
const supportsEquilibrium = (ids: string[]) => subset(ids, core)
  && !(ids.includes('citric') && ids.includes('calcium'))
  && !(ids.includes('ammonia') && ['carbonate', 'bicarbonate'].some(id => ids.includes(id)));
function ionicInventory(s: ReactorState) {
  const calcium = moles(s, 'calcium');
  const acetate = moles(s, 'acetic') + moles(s, 'acetate');
  const charge = moles(s, 'naoh') - moles(s, 'hcl') + moles(s, 'acetate')
    + moles(s, 'bicarbonate') + 2 * moles(s, 'carbonate') - 2 * calcium;
  return { calcium, acetate, charge };
}

export function assessHazards(s: ReactorState, incoming?: string): Hazard[] {
  const ids = new Set([...idsOf(s), ...(incoming ? [incoming] : [])]);
  const has = (id: string) => ids.has(id);
  const acid = ['hcl', 'acetic', 'citric'].some(has);
  const list: Hazard[] = [];
  const add = (id: string, title: string, detail: string, source = REACTION_SOURCES.incompatibility, severity: Hazard['severity'] = 'danger') => list.push({ id, title, detail, source, severity });
  if (has('bleach') && acid) add('chlorine', 'Posible liberación de cloro', 'Hipoclorito y sustancias ácidas son incompatibles. Puede generarse gas tóxico. Aviso conservador por ingredientes; no se calcula rendimiento ni exposición.', chemical('bleach').source);
  if (has('bleach') && has('ammonia')) add('chloramines', 'Posible formación de cloraminas', 'Esta combinación puede producir gases peligrosos para las vías respiratorias. No equivale a cloro ni a gas mostaza.', chemical('bleach').source);
  if ((has('bleach') || has('peroxide')) && (has('ethanol') || has('sugar') || has('starch'))) add('oxidizer-organic', 'Oxidante y materia orgánica', 'La incompatibilidad depende de composición y condiciones. No hay un modelo de combustión para esta mezcla.');
  if (has('peroxide') && (has('copper') || has('bleach'))) add('peroxide', 'Estabilidad del peróxido no evaluada', 'La contaminación y otros reactivos pueden modificar la descomposición. Posibles calor y gas; sin predicción cuantitativa.');
  if (s.closed && (has('carbonate') || has('bicarbonate')) && acid) add('pressure', 'Acumulación de gas en sistema cerrado', 'La acidificación de carbonatos puede generar CO₂. El colector ideal permite observar el aumento de presión.', REACTION_SOURCES.gases, 'warning');
  if (has('hcl') && has('naoh')) add('heat', 'Neutralización exotérmica', 'La temperatura puede aumentar aunque el pH final esté cerca de neutro.', 'https://openstax.org/books/chemistry-2e/pages/5-2-calorimetry', 'warning');
  if (has('ethanol')) add('vapors', 'Peligro de vapores según composición', 'El escenario no calcula presión de vapor ni inflamabilidad. La disolución virtual no representa alcohol comercial.', chemical('ethanol').source, 'warning');
  return list;
}

function equilibrium(s: ReactorState) {
  return solveEquilibrium({ ...ionicInventory(s), volumeL: s.volumeMl / 1000,
    carbonMol: s.carbonMol, citricMol: moles(s, 'citric'), ammoniaMol: moles(s, 'ammonia') });
}

export function readReactor(s: ReactorState): ReactorResult {
  validateState(s);
  const ids = idsOf(s);
  const quantitative = supportsEquilibrium(ids);
  const starchTest = subset(ids, [...inert, 'iodine', 'starch']) && ids.includes('iodine') && ids.includes('starch');
  const copperTest = subset(ids, [...inert, 'copper', 'naoh']) && ids.includes('copper') && ids.includes('naoh');
  const thermal = subset(ids, [...inert, 'hcl', 'naoh']);
  const neutralized = Math.min(moles(s, 'hcl'), moles(s, 'naoh'));
  // shortcut: calor adiabático con Cp de agua; no estima calor de dilución ni pérdidas.
  const temperatureC = thermal ? neutralizationTemperature(s.volumeMl, moles(s, 'hcl'), moles(s, 'naoh')) : null;
  const pressureKpa = s.closed ? gasPressure(s.volumeMl, s.airMol, s.trappedCO2Mol, temperatureC ?? 25) : AMBIENT;
  const observations: ReactionObservation[] = [];
  const note = (id: string, title: string, equation: string, explanation: string, source: string = REACTION_SOURCES.equilibrium) => observations.push({ id, title, equation, explanation, source });
  let pH: number | null = null, precipitateG: number | null = null, precipitateName: string | null = null;
  let color = '#94a3b8';
  const species: ReactorResult['species'] = [];
  if (quantitative) {
    const eq = equilibrium(s);
    pH = eq.pH;
    color = pH < 3 ? '#ef4444' : pH < 6 ? '#f59e0b' : pH <= 8 ? '#10b981' : pH < 11 ? '#3b82f6' : '#8b5cf6';
    precipitateG = eq.solid * 100.0869 + eq.hydroxideSolid * 74.0927;
    precipitateName = [eq.solid > 1e-10 ? 'Carbonato de calcio · CaCO₃' : '', eq.hydroxideSolid > 1e-10 ? 'Hidróxido de calcio · Ca(OH)₂' : ''].filter(Boolean).join(' + ') || null;
    species.push({ name: 'H₃O⁺', mol: eq.h * s.volumeMl / 1000 }, { name: 'OH⁻', mol: 1e-14 / eq.h * s.volumeMl / 1000 });
    if (s.carbonMol > 0) species.push({ name: 'HCO₃⁻ acuoso', mol: eq.carbon * eq.alpha1 }, { name: 'CO₃²⁻ acuoso', mol: eq.carbon * eq.alpha2 });
    if (eq.acetateIon > 0) species.push({ name: 'Acetato acuoso', mol: eq.acetateIon });
    if (neutralized > 0) note('neutralization', 'Neutralización', 'H₃O⁺ + OH⁻ → 2 H₂O', 'Los iones espectadores permanecen en disolución. Equilibrio de referencia a 25 °C.');
    if (ids.includes('acetic') || ids.includes('acetate')) note('weak-acid', 'Equilibrio del ácido acético', 'CH₃COOH + H₂O ⇌ H₃O⁺ + CH₃COO⁻', 'Se resuelven balance de carga y disociación; no se trata como ácido fuerte.');
    if (ids.includes('citric')) note('citric', 'Equilibrio poliprótico del ácido cítrico', 'H₃Cit ⇌ H₂Cit⁻ ⇌ HCit²⁻ ⇌ Cit³⁻', 'Se incluyen tres disociaciones; pKa 3.13, 4.76 y 6.40. No se modelan complejos o sales de citrato.', 'https://www2.csudh.edu/oliver/chemdata/data-ka.htm');
    if (ids.includes('ammonia')) note('ammonia', 'Equilibrio de amoníaco acuoso', 'NH₃ + H₂O ⇌ NH₄⁺ + OH⁻', 'Kb = 1.8×10⁻⁵; no se calcula volatilización de amoníaco.', 'https://openstax.org/books/chemistry-2e/pages/i-ionization-constants-of-weak-bases');
    if (ids.includes('acetic') && ids.includes('acetate')) note('buffer', 'Sistema amortiguador', 'Ácido acético / acetato', 'El tampón tiene capacidad limitada; observa qué pasa al añadir ácido o base.');
    if (s.carbonMol > 0) note('carbonates', 'Equilibrio de carbonatos', 'CO₂* ⇌ HCO₃⁻ ⇌ CO₃²⁻', 'El carbono acuoso restante se distribuye mediante dos constantes de equilibrio.');
    if (eq.solid > 1e-10) note('calcite', 'Precipitado de carbonato de calcio', 'Ca²⁺ + CO₃²⁻ ⇌ CaCO₃(s)', 'La cantidad de sólido se calcula acoplando Ksp, carbono y balance de carga.', REACTION_SOURCES.precipitation);
    if (eq.hydroxideSolid > 1e-10) note('calcium-hydroxide', 'Precipitado de hidróxido de calcio', 'Ca²⁺ + 2 OH⁻ ⇌ Ca(OH)₂(s)', 'Equilibrio ideal con Ksp = 1.3×10⁻⁶ a 25 °C.', REACTION_SOURCES.precipitation);
    if (!observations.length) note('dilution', 'Mezcla y dilución', 'Conservación de soluto', 'No se predice una reacción neta en este modelo. Esto no es una certificación de seguridad.');
  } else if (starchTest) {
    color = '#312e81';
    note('starch', 'Complejo azul oscuro', 'Yodo + almidón ⇌ complejo coloreado', 'Observación cualitativa; no se asigna pH ni rendimiento al polímero.', chemical('iodine').source);
  } else if (copperTest) {
    precipitateG = copperPrecipitate(moles(s, 'copper'), moles(s, 'naoh'));
    precipitateName = 'Hidróxido de cobre(II) · Cu(OH)₂'; color = '#38bdf8';
    note('copper-hydroxide', 'Precipitado azul de hidróxido', 'Cu²⁺ + 2 OH⁻ → Cu(OH)₂(s)', 'Límite estequiométrico ideal de precipitación completa; no resuelve hidrólisis, Ksp ni pH.', REACTION_SOURCES.precipitation);
  } else {
    note('unknown', 'Combinación fuera del modelo cuantitativo', 'Resultado no determinado', 'Se conservan los volúmenes dosificados. No se inventan productos, gases, pH ni temperatura. Consulta los avisos de incompatibilidad.');
  }
  if (s.generatedCO2Mol > 0) note('gas', 'Desprendimiento de CO₂', 'HCO₃⁻ + H₃O⁺ → CO₂(g) + 2 H₂O', 'Modelo de desgasificación completa hacia un colector ideal. El gas ya evacuado no reaparece al añadir más base.', REACTION_SOURCES.gases);
  const limitations = ['Disoluciones virtuales a concentración fija; no representan productos comerciales.', 'Volúmenes aditivos y actividades ideales. pH y Ksp de referencia a 25 °C; no se calcula cinética.'];
  if (s.generatedCO2Mol > 0) limitations.push('Desgasificación estequiométrica ideal; no modela redisolución ni transferencia gas/líquido.');
  if (!thermal) limitations.push('Temperatura no calculada para esta composición. Para el manómetro se usa referencia de 25 °C.');
  if (s.closed) limitations.push('Colector seco ideal de 250 mL: aire atrapado y CO₂. Sin vapor de agua ni resistencia real de vidrio.');
  if (!quantitative) limitations.push('La cobertura es parcial o desconocida. Un aviso por ingredientes no predice exposición ni severidad real.');
  const gasKnown = quantitative;
  return { modelId: REACTOR_MODEL, coverage: quantitative ? 'quantitative' : starchTest || copperTest ? 'partial' : 'unknown',
    pH, temperatureC, pressureKpa: gasKnown && !ids.includes('ammonia') ? pressureKpa : null,
    gasMl: gasKnown ? gasVolume(s.generatedCO2Mol) : null,
    trappedGasMl: gasKnown ? gasVolume(s.trappedCO2Mol) : null,
    precipitateG, precipitateName, color, observations, hazards: assessHazards(s), limitations, species,
    stopped: gasKnown && !ids.includes('ammonia') && pressureKpa >= 150 };
}
function validateState(s: ReactorState) {
  if (!Number.isFinite(s.volumeMl) || s.volumeMl <= 0 || s.volumeMl >= 250) throw new Error('Volumen fuera del colector virtual (0–250 mL).');
  for (const value of [s.carbonMol, s.generatedCO2Mol, s.trappedCO2Mol, s.escapedCO2Mol, s.airMol]) {
    if (!Number.isFinite(value) || value < 0) throw new Error('Inventario de materia inválido.');
  }
  if (Math.abs(s.generatedCO2Mol - s.trappedCO2Mol - s.escapedCO2Mol) > 1e-9) throw new Error('Balance de gas inconsistente.');
  for (const [id, ml] of Object.entries(s.addedMl)) {
    chemical(id);
    if (!Number.isFinite(ml) || ml < 0) throw new Error('Cantidad inválida.');
  }
}
export function addDose(s: ReactorState, id: string, ml: number): ReactorState {
  const item = chemical(id);
  if (!Number.isFinite(ml) || ml <= 0 || s.volumeMl + ml > 240 + 1e-8) throw new Error('Dosis inválida o capacidad de trabajo superada (240 mL).');
  if (readReactor(s).stopped) throw new Error('Ensayo pausado por el límite didáctico de presión.');
  const next: ReactorState = { ...s, volumeMl: s.volumeMl + ml, addedMl: { ...s.addedMl, [id]: (s.addedMl[id] ?? 0) + ml } };
  if (id === 'carbonate' || id === 'bicarbonate') next.carbonMol += ml / 1000 * item.concentrationM;
  if (supportsEquilibrium(idsOf(next))) {
    const { charge, calcium, acetate } = ionicInventory(next);
    // shortcut: desgasificación completa por equivalentes; no predice velocidad ni redisolución en el colector.
    const gas = releasedCO2(next.carbonMol, charge, calcium, acetate, moles(next, 'citric'));
    next.carbonMol = Math.max(0, next.carbonMol - gas);
    next.generatedCO2Mol += gas;
    if (next.closed) next.trappedCO2Mol += gas;
    else next.escapedCO2Mol += gas;
  }
  return next;
}
export function setClosure(s: ReactorState, closed: boolean): ReactorState {
  if (s.closed === closed) return s;
  const temperature = readReactor(s).temperatureC ?? 25;
  return closed ? { ...s, closed, airMol: trappedAir(s.volumeMl, temperature) }
    : { ...s, closed, airMol: 0, escapedCO2Mol: s.escapedCO2Mol + s.trappedCO2Mol, trappedCO2Mol: 0 };
}
