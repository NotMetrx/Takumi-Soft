import { explorationStore } from '$lib/exploration/exploration_store.svelte';
import { chemical } from '$lib/science/chemistry/catalog';
import { calculateStrongAcidBase } from '$lib/science/chemistry/acid_base_solver';
import type { GestureState } from '$lib/input/hand_gestures';
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
  isExplorationMode = $state(false);
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
  gestureInput = $state<GestureState | null>(null);
  gestureStatus = $state('Cámara apagada');

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
  isCatalogOpen = $state(false);

  constructor() {
    this.recalculate();
  }

  get activePreset(): HomeExperimentPreset {
    return EXPERIMENT_PRESETS.find((p) => p.id === this.activePresetId) ?? EXPERIMENT_PRESETS[0];
  }

  get totalVolumeMl(): number {
    if (this.isExplorationMode) return explorationStore.state.volumeMl;
    return Number((this.beaker.waterMl + this.beaker.acidVolumeMl + this.beaker.baseVolumeMl).toFixed(1));
  }

  get availableCapacityMl(): number {
    return Math.max(0, Number(((this.isExplorationMode ? 240 : this.beaker.capacityMl) - this.totalVolumeMl).toFixed(1)));
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
    if (this.isExplorationMode) return;
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
    if (!reagent || !Number.isFinite(requestedMl) || requestedMl <= 0) return false;
    if (this.activePourAnim) return false;
    if (this.isExplorationMode && (!explorationStore.allow(reagent.chemicalId!) || explorationStore.result.stopped)) return false;
    const actualMl = Math.floor(Math.min(requestedMl, reagent.remainingMl, this.availableCapacityMl) * 10 + 1e-8) / 10;
    if (actualMl <= 0) return false;

    this.selectedReagentId = reagentId;
    this.animCounter += 1;
    this.activePourAnim = {
      id: this.animCounter,
      reagentId,
      amountMl: actualMl,
      source
    };
    return true;
  }

  pour(reagentId: string, requestedMl: number, source: InputMode = this.inputMode): boolean {
    const reagent = this.reagents.find((r) => r.reagentId === reagentId);
    if (!reagent || !Number.isFinite(requestedMl) || requestedMl <= 0) return false;

    const actualMl = Math.floor(Math.min(requestedMl, reagent.remainingMl, this.availableCapacityMl) * 10 + 1e-8) / 10;
    if (actualMl <= 0) return false;

    if (this.isExplorationMode) {
      if (!explorationStore.add(reagent.chemicalId!, actualMl, source)) return false;
      reagent.remainingMl = Math.max(0, Number((reagent.remainingMl - actualMl).toFixed(1)));
      return true;
    }
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

  enterExploration() {
    this.activePourAnim = null;
    this.isExplorationMode = true;
    this.isHomeBookOpen = this.isNotebookOpen = this.isHypothesisModalOpen = false;
    this.setExplorationBottle('hcl', 'hcl');
    this.setExplorationBottle('naoh', 'bicarbonate');
  }

  leaveExploration() {
    this.isExplorationMode = false;
    this.loadExperimentPreset('chemistry-p0-acid-base');
  }

  setExplorationBottle(slot: 'hcl' | 'naoh', id: string) {
    if (this.activePourAnim) return;
    const item = chemical(id);
    const index = slot === 'hcl' ? 0 : 1;
    this.reagents[index] = { reagentId: slot, chemicalId: id, kind: index === 0 ? 'strong_acid' : 'strong_base',
      name: item.name, formula: item.formula, concentrationMolPerL: item.concentrationM,
      initialMl: 100, remainingMl: 100, colorHex: item.color, hazardNotice: item.hazards.join(' ') };
    this.presetRevision += 1;
  }

  resetExperiment() {
    if (this.isExplorationMode) explorationStore.reset();
    this.reagents.forEach((r) => (r.remainingMl = r.initialMl));
    this.beaker.waterMl = 50;
    this.beaker.acidVolumeMl = 0;
    this.beaker.baseVolumeMl = 0;
    this.activePourAnim = null;
    this.presetRevision += 1;
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
