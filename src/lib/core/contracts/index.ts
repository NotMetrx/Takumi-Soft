/**
 * Contratos Centrales de Dominio — SymbioLab 2.0 (v0.2.0)
 * Desacopla la interfaz (UI / 3D / Gestos) del motor científico y almacenamiento.
 */

export type InputMode = 'gesture' | 'mouse' | 'touch' | 'keyboard' | 'demo';

export type DiagnosticClass = 
  | 'acid_excess' 
  | 'near_equivalence' 
  | 'base_excess' 
  | 'pure_water' 
  | 'invalid_input';

export interface IndicatorBand {
  band: 'strong_acid' | 'weak_acid' | 'neutral' | 'weak_base' | 'strong_base';
  range: [number, number];
  colorHex: string;
  name: string;
  description: string;
}

export interface ChemistryInput {
  acidVolumeMl: number;
  baseVolumeMl: number;
  waterMl: number;
  acidConcentrationMolPerL: number;
  baseConcentrationMolPerL: number;
  temperatureC: number;
}

export interface ChemistryResult {
  modelId: string;
  modelVersion: string;
  pH: number;
  hydroniumConcentrationMolPerL: number;
  excessConcentrationMolPerL: number;
  diagnosticClass: DiagnosticClass;
  indicatorBand: IndicatorBand;
  assumptions: string[];
  warnings: string[];
  computedAt: number;
}

export interface Reagent {
  chemicalId?: string;
  reagentId: string;
  kind: 'strong_acid' | 'strong_base' | 'water';
  name: string;
  formula: string;
  concentrationMolPerL: number;
  remainingMl: number;
  initialMl: number;
  colorHex: string;
  hazardNotice: string;
}

export interface BeakerState {
  capacityMl: number;
  waterMl: number;
  acidVolumeMl: number;
  baseVolumeMl: number;
  temperatureC: number;
  currentResult: ChemistryResult | null;
}

export type IntentKind = 'select' | 'grab' | 'move' | 'pour' | 'release' | 'reset' | 'input_mode_change';

export interface InteractionIntent {
  intentId: string;
  kind: IntentKind;
  objectId: string;
  source: InputMode;
  timestampMs: number;
  requestedMl?: number;
  appliedMl?: number;
  reason?: string;
}

export interface TrialRecord {
  id: string;
  timestamp: string;
  reagentName: string;
  volumeAddedMl: number;
  accumulatedVolumeMl: number;
  resultingPh: number;
  diagnosticClass: DiagnosticClass;
  indicatorColor: string;
  inputMode: InputMode;
}

export interface LabSession {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  experimentId: string;
  hypothesisText: string;
  predictionTrend: 'increase' | 'decrease' | 'neutral' | '';
  trials: TrialRecord[];
  reflectionText: string;
  status: 'draft' | 'in_progress' | 'completed';
}
