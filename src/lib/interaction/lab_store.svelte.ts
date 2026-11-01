import { calculateStrongAcidBase } from '$lib/science/chemistry/acid_base_solver';
import type { Reagent, BeakerState, TrialRecord, InputMode, LabSession } from '$lib/core/contracts';

export interface PourAnimationRequest {
  id: number;
  reagentId: string;
  amountMl: number;
  source: InputMode;
}

export interface VideoChapter {
  timeSec: number;
  durationSec: number;
  title: string;
  caption: string;
  actionType: 'prep' | 'pour_acid' | 'pour_base' | 'neutralize';
  simPh: number;
  simColor: string;
}

export interface HomeExperimentPreset {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  difficulty: 'Fácil · En Casa' | 'Intermedio · En Casa' | 'Estándar Escolar';
  durationMin: number;
  summary: string;
  scientificPrinciple: string;
  safetyNote: string;
  householdMaterials: { name: string; role: string; icon: string }[];
  videoChapters: VideoChapter[];
  interactiveGoals: {
    id: string;
    description: string;
    checkFn: (beaker: BeakerState) => boolean;
  }[];
  quizQuestion: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  acidReagent: Omit<Reagent, 'reagentId' | 'kind'>;
  baseReagent: Omit<Reagent, 'reagentId' | 'kind'>;
}

export const EXPERIMENT_PRESETS: HomeExperimentPreset[] = [
  {
    id: 'cabbage-home-lab',
    title: 'Indicador Casero con Col Morada',
    subtitle: 'Jugo de Limón vs. Bicarbonato de Cocina',
    badge: 'Experimento Casero #1',
    difficulty: 'Fácil · En Casa',
    durationMin: 10,
    summary:
      'Aprende a fabricar tu propio indicador de pH natural hirviendo hojas de col morada (repollo morado) y úsalo para medir la acidez del limón y el bicarbonato que tienes en tu cocina.',
    scientificPrinciple:
      'La col morada contiene antocianinas, pigmentos vegetales cuyas moléculas cambian su estructura electrónica según la concentración de iones H⁺: se tornan rojas en medio ácido (limón), moradas/verdes en medio neutro y azul-verdosas en medio básico (bicarbonato).',
    safetyNote:
      '100% seguro con ingredientes de cocina. Pide ayuda a un adulto únicamente al calentar el agua para extraer el pigmento de la col morada.',
    householdMaterials: [
      { name: '2 hojas de Col Morada', role: 'Fuente natural del pigmento indicador (antocianina)', icon: '🥬' },
      { name: 'Jugo de 1 Limón exprimido', role: 'Reactivo ácido casero (Ácido cítrico ~pH 2.2)', icon: '🍋' },
      { name: '1 cdta. de Bicarbonato en agua', role: 'Reactivo básico casero (NaHCO₃ ~pH 9.0)', icon: '🥄' },
      { name: 'Vasos transparentes y cuchara', role: 'Recipientes de reacción y medición', icon: '🥛' }
    ],
    videoChapters: [
      {
        timeSec: 0,
        durationSec: 5,
        title: '1. Extraer el indicador de Col Morada',
        caption: 'Trozamos hojas de col morada en agua tibia durante 5 minutos y colamos el líquido morado/neutro en el vaso central.',
        actionType: 'prep',
        simPh: 7.0,
        simColor: '#10b981'
      },
      {
        timeSec: 5,
        durationSec: 5,
        title: '2. Añadir Jugo de Limón (Ácido Cítrico)',
        caption: 'Al verter 15 mL de jugo de limón, los iones H⁺ protonan la antocianina y el líquido vira instantáneamente a rojo intenso (pH ~2.4).',
        actionType: 'pour_acid',
        simPh: 2.35,
        simColor: '#ef4444'
      },
      {
        timeSec: 10,
        durationSec: 5,
        title: '3. Neutralizar con Bicarbonato de Sodio',
        caption: 'Agregamos disolución de bicarbonato poco a poco: se liberan microburbujas y el color pasa por ámbar hasta regresar al verde esmeralda neutro.',
        actionType: 'pour_base',
        simPh: 7.0,
        simColor: '#10b981'
      },
      {
        timeSec: 15,
        durationSec: 5,
        title: '4. Exceso Básico (Azul / Violeta Alcalino)',
        caption: 'Si seguimos agregando bicarbonato, superamos el punto neutro y la solución vira hacia tonos azules y violetas alcalinos.',
        actionType: 'neutralize',
        simPh: 11.4,
        simColor: '#8b5cf6'
      }
    ],
    interactiveGoals: [
      {
        id: 'goal-1',
        description: 'Vierte al menos 10 mL de Jugo de Limón en el vaso para acidificar la mezcla (pH < 3.5).',
        checkFn: (b) => b.acidVolumeMl >= 10 && (b.currentResult?.pH ?? 7) < 3.5
      },
      {
        id: 'goal-2',
        description: 'Añade Bicarbonato de Sodio para subir el pH por encima de 6.0.',
        checkFn: (b) => b.acidVolumeMl >= 10 && b.baseVolumeMl >= 10 && (b.currentResult?.pH ?? 0) >= 6.0
      },
      {
        id: 'goal-3',
        description: 'Lleva la mezcla a un exceso alcalino (pH > 10.5) agregando más Bicarbonato.',
        checkFn: (b) => (b.currentResult?.pH ?? 0) > 10.5
      }
    ],
    quizQuestion: {
      question: '¿Qué compuesto natural de la col morada permite que cambie de color según el pH?',
      options: [
        'La clorofila verde de las hojas exteriores',
        'Las antocianinas (pigmentos sensibles a iones H⁺)',
        'El cloruro de sodio disuelto en el agua'
      ],
      correctIndex: 1,
      explanation:
        '¡Exacto! Las antocianinas son flavonas hidrosolubles que cambian reversiblemente su color según la acidez del medio.'
    },
    acidReagent: {
      name: 'Jugo de Limón Casero',
      formula: 'Ác. Cítrico',
      concentrationMolPerL: 0.02,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#f43f5e',
      hazardNotice: 'Ingrediente doméstico seguro (evitar contacto con los ojos).'
    },
    baseReagent: {
      name: 'Bicarbonato en Agua',
      formula: 'NaHCO₃ (ac)',
      concentrationMolPerL: 0.02,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#06b6d4',
      hazardNotice: 'Ingrediente de cocina inocuo.'
    }
  },
  {
    id: 'vinegar-baking-soda',
    title: 'Neutralización Efervescente Casera',
    subtitle: 'Vinagre Blanco + Solución de Bicarbonato',
    badge: 'Experimento Casero #2',
    difficulty: 'Intermedio · En Casa',
    durationMin: 8,
    summary:
      'Comprueba cómo el ácido acético del vinagre blanco de cocina reacciona estequiométricamente con una base casera neutralizando su pH exactamente en el punto de equivalencia.',
    scientificPrinciple:
      'El vinagre contiene ácido acético (CH₃COOH). Al mezclarse en proporciones equimolares con una base, los iones H⁺ y OH⁻ forman agua (H₂O), llevando el pH de 2.5 exactamente a 7.00.',
    safetyNote:
      'Experimento casero sin toxicidad. Realizar sobre una bandeja o mesa fácil de limpiar.',
    householdMaterials: [
      { name: 'Vinagre Blanco de cocina', role: 'Fuente de ácido acético diluido', icon: '🍶' },
      { name: 'Bicarbonato de Sodio disuelto', role: 'Solución alcalina neutralizante', icon: '🥣' },
      { name: 'Agua filtrada o hervida fría', role: 'Medio de dilución inicial (50 mL)', icon: '💧' },
      { name: 'Jeringa dosificadora sin aguja (mL)', role: 'Para medir volúmenes exactos de 5 y 10 mL', icon: '📏' }
    ],
    videoChapters: [
      {
        timeSec: 0,
        durationSec: 5,
        title: '1. Base de Agua con Indicador (50 mL)',
        caption: 'Comenzamos con 50 mL de agua a pH 7.00 en nuestro vaso graduado.',
        actionType: 'prep',
        simPh: 7.0,
        simColor: '#10b981'
      },
      {
        timeSec: 5,
        durationSec: 5,
        title: '2. Adición de 20 mL de Vinagre Blanco',
        caption: 'Medimos 20 mL de vinagre con la jeringa graduada y los vertemos en el vaso. El pH cae a ~2.45.',
        actionType: 'pour_acid',
        simPh: 2.45,
        simColor: '#ef4444'
      },
      {
        timeSec: 10,
        durationSec: 5,
        title: '3. Titulación con 20 mL de Base Casera',
        caption: 'Añadimos exactamente 20 mL de la solución básica de igual concentración: ¡alcanzamos pH 7.00 en el punto de equivalencia!',
        actionType: 'neutralize',
        simPh: 7.0,
        simColor: '#10b981'
      }
    ],
    interactiveGoals: [
      {
        id: 'goal-v1',
        description: 'Vierte exactamente 20 mL de Vinagre Blanco en el vaso.',
        checkFn: (b) => b.acidVolumeMl >= 20
      },
      {
        id: 'goal-v2',
        description: 'Logra el Punto de Equivalencia (pH = 7.00 ± 0.1) igualando el volumen de Base.',
        checkFn: (b) => b.acidVolumeMl >= 20 && Math.abs((b.currentResult?.pH ?? 0) - 7.0) <= 0.15
      }
    ],
    quizQuestion: {
      question: 'Si agregaste 20 mL de Vinagre (0.015 M), ¿cuántos mL de Base de la misma concentración (0.015 M) necesitas para llegar a pH 7.00?',
      options: [
        '10 mL (la mitad del volumen)',
        'Exactamente 20 mL (volúmenes iguales a igual concentración)',
        '40 mL (el doble del volumen)'
      ],
      correctIndex: 1,
      explanation:
        '¡Correcto! Cuando ambas disoluciones tienen la misma concentración molar, se requiere exactamente el mismo volumen para igualar los moles de ácido y base (n_ácido = n_base).'
    },
    acidReagent: {
      name: 'Vinagre Blanco Casero',
      formula: 'CH₃COOH',
      concentrationMolPerL: 0.015,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#f59e0b',
      hazardNotice: 'Ácido orgánico doméstico diluido.'
    },
    baseReagent: {
      name: 'Solución Alcalina Casera',
      formula: 'NaHCO₃',
      concentrationMolPerL: 0.015,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#3b82f6',
      hazardNotice: 'Base doméstica segura.'
    }
  },
  {
    id: 'chemistry-p0-acid-base',
    title: 'Titulación Estándar de Laboratorio',
    subtitle: 'Ácido Clorhídrico (HCl) + Hidróxido de Sodio (NaOH)',
    badge: 'Estándar Científico P0',
    difficulty: 'Estándar Escolar',
    durationMin: 12,
    summary:
      'Simulación rigurosa de neutralización entre un ácido fuerte monoprótico (HCl 0.01 M) y una base fuerte monovalente (NaOH 0.01 M) a 25 °C.',
    scientificPrinciple:
      'Resuelve el equilibrio iónico exacto del agua (Kw = 10⁻¹⁴) acoplado al balance de electroneutralidad H² - d·H - Kw = 0.',
    safetyNote:
      'En la vida real, el HCl y el NaOH requieren bata, gafas de seguridad y guantes. En SymbioLab 3D puedes experimentar con ellos sin ningún riesgo físico.',
    householdMaterials: [
      { name: 'Matraz de HCl 0.01 M (100 mL)', role: 'Ácido fuerte completamente disociado', icon: '🧪' },
      { name: 'Matraz de NaOH 0.01 M (100 mL)', role: 'Base fuerte completamente disociada', icon: '⚗️' },
      { name: 'Vaso Borosilicato 250 mL + Agitador', role: 'Reactor principal con indicador universal', icon: '🔬' },
      { name: 'Electrodo pH-200 PRO sumergido', role: 'Sensor potenciométrico digital en tiempo real', icon: '📟' }
    ],
    videoChapters: [
      {
        timeSec: 0,
        durationSec: 5,
        title: '1. Calibración con Agua Destilada (pH 7.00)',
        caption: 'El electrodo marca pH 7.00 en 50 mL de agua pura desionizada a 25.0 °C.',
        actionType: 'prep',
        simPh: 7.0,
        simColor: '#10b981'
      },
      {
        timeSec: 5,
        durationSec: 5,
        title: '2. Acidificación Fuerte con HCl 0.01 M',
        caption: 'Al añadir 25 mL de HCl 0.01 M, la concentración de hidronios sube a 3.33×10⁻³ M (pH 2.48).',
        actionType: 'pour_acid',
        simPh: 2.48,
        simColor: '#ef4444'
      },
      {
        timeSec: 10,
        durationSec: 5,
        title: '3. Punto de Equivalencia Estequiométrico',
        caption: 'Al verter 25 mL de NaOH 0.01 M se forma NaCl acuoso + H₂O y el pH salta abruptamente a 7.00.',
        actionType: 'neutralize',
        simPh: 7.0,
        simColor: '#10b981'
      }
    ],
    interactiveGoals: [
      {
        id: 'goal-s1',
        description: 'Agrega HCl 0.01 M hasta llevar el pH por debajo de 2.60.',
        checkFn: (b) => b.acidVolumeMl >= 15 && (b.currentResult?.pH ?? 7) <= 2.6
      },
      {
        id: 'goal-s2',
        description: 'Neutraliza exactamente la solución con NaOH 0.01 M hasta lograr pH = 7.00.',
        checkFn: (b) => b.acidVolumeMl >= 15 && Math.abs((b.currentResult?.pH ?? 0) - 7.0) < 0.05
      }
    ],
    quizQuestion: {
      question: '¿Qué sal disuelta se forma cuando el HCl reacciona con el NaOH en agua?',
      options: [
        'Cloruro de sodio (NaCl, sal común) + Agua (H₂O)',
        'Ácido sulfúrico (H₂SO₄)',
        'Amoníaco gaseoso (NH₃)'
      ],
      correctIndex: 0,
      explanation:
        '¡Exacto! HCl(ac) + NaOH(ac) → NaCl(ac) + H₂O(l). Los iones Na⁺ y Cl⁻ quedan como iones espectadores neutros.'
    },
    acidReagent: {
      name: 'Ácido Clorhídrico',
      formula: 'HCl 0.01 M',
      concentrationMolPerL: 0.01,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#ef4444',
      hazardNotice: 'Ácido fuerte monoprótico idealizado (25 °C).'
    },
    baseReagent: {
      name: 'Hidróxido de Sodio',
      formula: 'NaOH 0.01 M',
      concentrationMolPerL: 0.01,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#8b5cf6',
      hazardNotice: 'Base fuerte monovalente idealizada (25 °C).'
    }
  }
];

export class LabStore {
  activePresetId = $state<string>('chemistry-p0-acid-base');
  presetRevision = $state<number>(1);

  reagents = $state<Reagent[]>([
    {
      reagentId: 'hcl',
      kind: 'strong_acid',
      name: 'Ácido Clorhídrico',
      formula: 'HCl 0.01 M',
      concentrationMolPerL: 0.01,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#ef4444',
      hazardNotice: 'Ácido fuerte monoprótico idealizado (25 °C).'
    },
    {
      reagentId: 'naoh',
      kind: 'strong_base',
      name: 'Hidróxido de Sodio',
      formula: 'NaOH 0.01 M',
      concentrationMolPerL: 0.01,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#8b5cf6',
      hazardNotice: 'Base fuerte monovalente idealizada (25 °C).'
    }
  ]);

  beaker = $state<BeakerState>({
    capacityMl: 250,
    waterMl: 50,
    acidVolumeMl: 0,
    baseVolumeMl: 0,
    temperatureC: 25,
    currentResult: null
  });

  selectedReagentId = $state<string | null>('hcl');
  inputMode = $state<InputMode>('mouse');
  isCameraActive = $state<boolean>(false);

  activePourAnim = $state<PourAnimationRequest | null>(null);
  private animCounter = 0;

  session = $state<LabSession>({
    sessionId: `session-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    experimentId: 'chemistry-p0-acid-base',
    hypothesisText: '',
    predictionTrend: '',
    trials: [],
    reflectionText: '',
    status: 'draft'
  });

  // Modales y Libro Interactivo 3D
  isHypothesisModalOpen = $state<boolean>(false);
  isNotebookOpen = $state<boolean>(false);
  isCameraModalOpen = $state<boolean>(false);
  isHomeBookOpen = $state<boolean>(false);

  constructor() {
    this.recalculate();
  }

  get activePreset(): HomeExperimentPreset {
    return EXPERIMENT_PRESETS.find((p) => p.id === this.activePresetId) ?? EXPERIMENT_PRESETS[2];
  }

  get totalVolumeMl(): number {
    return Number((this.beaker.waterMl + this.beaker.acidVolumeMl + this.beaker.baseVolumeMl).toFixed(1));
  }

  get availableCapacityMl(): number {
    return Math.max(0, Number((this.beaker.capacityMl - this.totalVolumeMl).toFixed(1)));
  }

  get selectedReagent(): Reagent | undefined {
    return this.reagents.find((r) => r.reagentId === this.selectedReagentId);
  }

  selectReagent(id: string) {
    this.selectedReagentId = id;
  }

  /**
   * Carga un experimento del Libro de Experimentos Caseros directamente en la mesa 3D
   */
  loadExperimentPreset(presetId: string) {
    const preset = EXPERIMENT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    this.activePresetId = preset.id;
    this.reagents = [
      {
        reagentId: 'hcl',
        kind: 'strong_acid',
        ...preset.acidReagent
      },
      {
        reagentId: 'naoh',
        kind: 'strong_base',
        ...preset.baseReagent
      }
    ];
    this.beaker.waterMl = 50;
    this.beaker.acidVolumeMl = 0;
    this.beaker.baseVolumeMl = 0;
    this.activePourAnim = null;
    this.session.experimentId = preset.id;
    this.presetRevision += 1;
    this.recalculate();
    this.isHomeBookOpen = false;
  }

  recalculate() {
    const acidReagent = this.reagents.find((r) => r.kind === 'strong_acid')!;
    const baseReagent = this.reagents.find((r) => r.kind === 'strong_base')!;

    this.beaker.currentResult = calculateStrongAcidBase({
      acidVolumeMl: this.beaker.acidVolumeMl,
      baseVolumeMl: this.beaker.baseVolumeMl,
      waterMl: this.beaker.waterMl,
      acidConcentrationMolPerL: acidReagent.concentrationMolPerL,
      baseConcentrationMolPerL: baseReagent.concentrationMolPerL,
      temperatureC: this.beaker.temperatureC
    });
  }

  triggerAnimatedPour(reagentId: string, requestedMl: number, source: InputMode = this.inputMode) {
    const reagent = this.reagents.find((r) => r.reagentId === reagentId);
    if (!reagent || requestedMl <= 0) return false;
    const actualMl = Math.min(requestedMl, reagent.remainingMl, this.availableCapacityMl);
    if (actualMl <= 0) return false;

    this.selectedReagentId = reagentId;
    this.animCounter += 1;
    this.activePourAnim = {
      id: this.animCounter,
      reagentId,
      amountMl: actualMl,
      source
    };
    return this.pour(reagentId, actualMl, source);
  }

  pour(reagentId: string, requestedMl: number, source: InputMode = this.inputMode): boolean {
    const reagent = this.reagents.find((r) => r.reagentId === reagentId);
    if (!reagent || requestedMl <= 0) return false;

    const actualMl = Number(Math.min(requestedMl, reagent.remainingMl, this.availableCapacityMl).toFixed(1));
    if (actualMl <= 0) return false;

    reagent.remainingMl = Math.max(0, Number((reagent.remainingMl - actualMl).toFixed(1)));

    if (reagent.kind === 'strong_acid') {
      this.beaker.acidVolumeMl = Number((this.beaker.acidVolumeMl + actualMl).toFixed(1));
    } else if (reagent.kind === 'strong_base') {
      this.beaker.baseVolumeMl = Number((this.beaker.baseVolumeMl + actualMl).toFixed(1));
    }

    this.recalculate();

    if (this.beaker.currentResult) {
      const trial: TrialRecord = {
        id: `trial-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        reagentName: reagent.name,
        volumeAddedMl: actualMl,
        accumulatedVolumeMl: this.totalVolumeMl,
        resultingPh: this.beaker.currentResult.pH,
        diagnosticClass: this.beaker.currentResult.diagnosticClass,
        indicatorColor: this.beaker.currentResult.indicatorBand.colorHex,
        inputMode: source
      };
      this.session.trials.push(trial);
      this.session.updatedAt = new Date().toISOString();
    }

    return true;
  }

  resetExperiment() {
    this.reagents.forEach((r) => (r.remainingMl = r.initialMl));
    this.beaker.waterMl = 50;
    this.beaker.acidVolumeMl = 0;
    this.beaker.baseVolumeMl = 0;
    this.activePourAnim = null;
    this.recalculate();
  }

  saveHypothesis(text: string, trend: 'increase' | 'decrease' | 'neutral') {
    this.session.hypothesisText = text;
    this.session.predictionTrend = trend;
    this.session.status = 'in_progress';
    this.isHypothesisModalOpen = false;
  }

  exportNotebook(format: 'json' | 'csv') {
    let content = '';
    let filename = `symbiolab_reporte_${Date.now()}`;
    let mimeType = '';

    if (format === 'json') {
      content = JSON.stringify(
        {
          session: this.session,
          experimentPreset: this.activePreset.title,
          beakerState: this.beaker,
          lastResult: this.beaker.currentResult
        },
        null,
        2
      );
      filename += '.json';
      mimeType = 'application/json';
    } else {
      const headers = [
        'ID',
        'Hora',
        'Reactivo Añadido',
        'Volumen Añadido (mL)',
        'Volumen Total (mL)',
        'pH Resultante',
        'Diagnostico',
        'Modo de Control'
      ];
      const rows = this.session.trials.map((t) =>
        [
          t.id,
          t.timestamp,
          `"${t.reagentName}"`,
          t.volumeAddedMl,
          t.accumulatedVolumeMl,
          t.resultingPh,
          t.diagnosticClass,
          t.inputMode
        ].join(',')
      );
      content = [headers.join(','), ...rows].join('\n');
      filename += '.csv';
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const labStore = new LabStore();
