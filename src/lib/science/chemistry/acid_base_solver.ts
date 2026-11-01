import type { ChemistryInput, ChemistryResult, DiagnosticClass, IndicatorBand } from '$lib/core/contracts';

const KW_25C = 1.0e-14;

export const INDICATOR_BANDS: Record<string, IndicatorBand> = {
  strong_acid: {
    band: 'strong_acid',
    range: [0, 3],
    colorHex: '#EF4444', // Rojo accesible
    name: 'Muy ácido',
    description: 'Exceso predominante de iones hidronio [H⁺]'
  },
  weak_acid: {
    band: 'weak_acid',
    range: [3, 6],
    colorHex: '#F59E0B', // Ámbar accesible
    name: 'Ácido',
    description: 'Leve exceso de iones hidronio [H⁺]'
  },
  neutral: {
    band: 'neutral',
    range: [6, 8],
    colorHex: '#10B981', // Verde esmeralda accesible
    name: 'Neutro / Equivalencia',
    description: 'Equilibrio estequiométrico [H⁺] ≈ [OH⁻]'
  },
  weak_base: {
    band: 'weak_base',
    range: [8, 11],
    colorHex: '#3B82F6', // Azul accesible
    name: 'Básico',
    description: 'Leve exceso de iones hidróxido [OH⁻]'
  },
  strong_base: {
    band: 'strong_base',
    range: [11, 14],
    colorHex: '#8B5CF6', // Violeta accesible
    name: 'Muy básico',
    description: 'Exceso predominante de iones hidróxido [OH⁻]'
  }
};

export function getIndicatorBandForPh(pH: number): IndicatorBand {
  if (pH < 3) return INDICATOR_BANDS.strong_acid;
  if (pH < 6) return INDICATOR_BANDS.weak_acid;
  if (pH <= 8) return INDICATOR_BANDS.neutral;
  if (pH < 11) return INDICATOR_BANDS.weak_base;
  return INDICATOR_BANDS.strong_base;
}

export function calculateStrongAcidBase(input: ChemistryInput): ChemistryResult {
  const { acidVolumeMl, baseVolumeMl, waterMl, acidConcentrationMolPerL, baseConcentrationMolPerL, temperatureC } = input;

  // Validaciones de invariantes físicos y numéricos
  if (!Number.isFinite(acidVolumeMl) || acidVolumeMl < 0 ||
      !Number.isFinite(baseVolumeMl) || baseVolumeMl < 0 ||
      !Number.isFinite(waterMl) || waterMl < 0 ||
      !Number.isFinite(acidConcentrationMolPerL) || acidConcentrationMolPerL < 0 ||
      !Number.isFinite(baseConcentrationMolPerL) || baseConcentrationMolPerL < 0) {
    throw new Error('Parámetros químicos inválidos: deben ser números finitos no negativos.');
  }

  const totalVolumeMl = acidVolumeMl + baseVolumeMl + waterMl;
  if (totalVolumeMl <= 0) {
    throw new Error('Volumen total debe ser estrictamente mayor a 0 mL.');
  }

  const vTotalL = totalVolumeMl / 1000.0;
  const vAcidL = acidVolumeMl / 1000.0;
  const vBaseL = baseVolumeMl / 1000.0;

  const molesAcid = acidConcentrationMolPerL * vAcidL;
  const molesBase = baseConcentrationMolPerL * vBaseL;

  // Exceso de concentración molar firmado (mol/L)
  const d = (molesAcid - molesBase) / vTotalL;

  // Raíz de electroneutralidad: H^2 - d*H - Kw = 0 (evitando cancelación numérica catastrófica)
  let hydroniumConcentration: number;
  const sqrtDiscriminant = Math.sqrt(d * d + 4 * KW_25C);

  if (d >= 0) {
    hydroniumConcentration = (d + sqrtDiscriminant) / 2.0;
  } else {
    hydroniumConcentration = (2.0 * KW_25C) / (sqrtDiscriminant - d);
  }

  // Cálculo de pH acotado entre 0 y 14
  let rawPh = -Math.log10(hydroniumConcentration);
  const pH = Math.max(0, Math.min(14, Number(rawPh.toFixed(2))));

  // Diagnóstico pedagógico
  let diagnosticClass: DiagnosticClass;
  if (acidVolumeMl === 0 && baseVolumeMl === 0) {
    diagnosticClass = 'pure_water';
  } else if (Math.abs(d) < 1e-6) {
    diagnosticClass = 'near_equivalence';
  } else if (d > 0) {
    diagnosticClass = 'acid_excess';
  } else {
    diagnosticClass = 'base_excess';
  }

  const indicatorBand = getIndicatorBandForPh(pH);

  return {
    modelId: 'strong-acid-base-25C-v1',
    modelVersion: '0.2.0',
    pH,
    hydroniumConcentrationMolPerL: hydroniumConcentration,
    excessConcentrationMolPerL: d,
    diagnosticClass,
    indicatorBand,
    assumptions: [
      'Disociación completa (100%) de HCl y NaOH.',
      'Comportamiento de dilución ideal a 25 °C.',
      'Coeficiente de actividad unitario (γ = 1).',
      'Sin efecto de amortiguamiento ni absorción de CO₂ atmosférico.'
    ],
    warnings: [],
    computedAt: Date.now()
  };
}
