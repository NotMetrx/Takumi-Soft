import { addDose, assessHazards, initialReactor, readReactor, setClosure, REACTOR_MODEL, type Hazard, type ReactorState } from '$lib/science/chemistry/reactor';
import { CHEMICALS, chemical } from '$lib/science/chemistry/catalog';
import type { InputMode } from '$lib/core/contracts';
import { ACTIVITIES, GUIDES, comparePrediction, guideMatches, guideRecommendation, type GuideEvidence } from './guides';
export interface ExplorationTrial {
  at: string; chemicalId: string; name: string; ml: number; volumeMl: number;
  pH: number | null; temperatureC: number | null; pressureKpa: number | null;
  gasMl: number | null; precipitateG: number | null; coverage: string; modelId: string;
  observations: string[]; hazards: string[]; source: InputMode;
}
export class ExplorationStore {
  state = $state<ReactorState>(initialReactor());
  trials = $state<ExplorationTrial[]>([]);
  renderQuality = $state<'basic' | 'standard'>('basic');
  indicator = $state(true);
  hypothesis = $state('');
  reflection = $state('');
  activityId = $state('free');
  prediction = $state('');
  evidence = $state<GuideEvidence[]>([]);
  quizAnswer = $state<number | null>(null);
  evaluated = $state(false);
  bottles = $state([{ chemicalId: 'hcl', remainingMl: 100 }, { chemicalId: 'bicarbonate', remainingMl: 100 }]);
  saveStatus = $state('Recuperando sesión local…');
  saveError = $state('');
  events = $state<{ at: string; action: string; pressureKpa: number | null }[]>([]);
  notice = $state('');
  pendingSafety = $state<{ hazards: Hazard[]; signature: string } | null>(null);
  private acknowledged = new Set<string>();
  result = $derived(readReactor(this.state));
  guide = $derived(GUIDES[this.activityId] ?? null);
  currentStep = $derived(this.guide?.steps[this.evidence.length] ?? null);
  recommendation = $derived(guideRecommendation(this.activityId, this.guideContext()));
  guideReady = $derived(!!this.guide && this.evidence.length === this.guide.steps.length
    && guideMatches(this.activityId, this.state) && this.result.coverage === 'quantitative'
    && !this.pendingSafety && !this.result.stopped && (this.activityId !== 'gas' || !this.state.closed));
  canEvaluate = $derived(this.guideReady && this.quizAnswer !== null && !!this.reflection.trim());
  assessment = $derived(this.evaluated && this.canEvaluate ? {
    ...comparePrediction(this.activityId, this.prediction, this.result, this.evidence),
    quizCorrect: this.quizAnswer === this.guide!.quiz.correct,
    quizExplanation: this.guide!.quiz.explanation
  } : null);
  private guideContext() {
    return { state: this.state, result: this.result, prediction: this.prediction, trialCount: this.trials.length, evidence: this.evidence };
  }
  predict(id: string) {
    if (this.trials.length || !this.guide?.predictions.some(p => p.id === id)) return false;
    this.prediction = id;
    this.evaluated = false;
    this.advanceGuide();
    return true;
  }
  private advanceGuide() {
    if (!this.guide || this.pendingSafety || this.result.coverage !== 'quantitative' || !guideMatches(this.activityId, this.state)) return;
    const step = this.currentStep;
    if (step?.done(this.guideContext())) {
      const { pH, temperatureC, pressureKpa, gasMl, precipitateG } = this.result;
      this.evidence.push({ stepId: step.id, at: new Date().toISOString(), pH, temperatureC, pressureKpa, gasMl, precipitateG });
    }
  }
  answer(index: number) {
    if (!this.guide || !Number.isInteger(index) || index < 0 || index >= this.guide.quiz.options.length) return;
    this.quizAnswer = index; this.evaluated = false;
  }
  evaluate() {
    if (!this.canEvaluate) return false;
    this.evaluated = true;
    return true;
  }
  preview(id: string) { return assessHazards(this.state, id); }
  allow(id: string) {
    const hazards = this.preview(id).filter(h => h.severity === 'danger');
    const signature = [...new Set([...Object.keys(this.state.addedMl), id])].sort().join('|') + ':' + hazards.map(h => h.id).sort().join('|');
    if (hazards.length && !this.acknowledged.has(signature)) {
      this.pendingSafety = { hazards, signature };
      this.notice = 'Vertido pausado: revisa la incompatibilidad antes de continuar en el simulador.';
      return false;
    }
    return true;
  }
  acknowledge() {
    if (this.pendingSafety) this.acknowledged.add(this.pendingSafety.signature);
    this.pendingSafety = null;
    this.notice = 'Aviso leído. Puedes volver a accionar el vertido virtual. No autoriza realizar la mezcla físicamente.';
  }
  add(id: string, ml: number, source: InputMode) {
    if (!this.allow(id)) return false;
    try {
      this.state = addDose(this.state, id, ml);
      const r = readReactor(this.state);
      this.trials.push({ at: new Date().toISOString(), chemicalId: id, name: chemical(id).name, ml,
        volumeMl: this.state.volumeMl, pH: r.pH, temperatureC: r.temperatureC, pressureKpa: r.pressureKpa,
        gasMl: r.gasMl, precipitateG: r.precipitateG, coverage: r.coverage, modelId: r.modelId,
        observations: r.observations.map(o => o.title), hazards: r.hazards.map(h => h.title), source });
      this.notice = r.stopped ? 'Ensayo pausado: límite didáctico de presión alcanzado. Abre el colector virtual o reinicia.' : '';
      this.evaluated = false;
      this.advanceGuide();
      return true;
    } catch (error) {
      this.notice = error instanceof Error ? error.message : 'No se pudo aplicar la dosis.';
      return false;
    }
  }
  close(closed: boolean) {
    this.state = setClosure(this.state, closed);
    this.events.push({ at: new Date().toISOString(), action: closed ? 'Cerrar colector' : 'Abrir colector', pressureKpa: this.result.pressureKpa });
    this.notice = closed ? 'Colector cerrado: vigila la presión. El límite de 150 kPa es didáctico y no representa resistencia de vidrio.' : 'Colector abierto: gas capturado transferido al registro de gas evacuado.';
    this.evaluated = false;
    this.advanceGuide();
  }
  reset() {
    this.state = initialReactor(); this.trials = []; this.events = []; this.pendingSafety = null;
    this.acknowledged.clear(); this.notice = '';
    this.prediction = ''; this.evidence = []; this.quizAnswer = null; this.evaluated = false;
    this.bottles.forEach(b => b.remainingMl = 100);
  }
  snapshot(exploring: boolean) {
    return $state.snapshot({ schemaVersion: 1, modelId: REACTOR_MODEL, exploring,
      state: this.state, trials: this.trials, events: this.events, activityId: this.activityId,
      hypothesis: this.hypothesis, reflection: this.reflection, prediction: this.prediction,
      evidence: this.evidence, quizAnswer: this.quizAnswer, evaluated: this.evaluated,
      bottles: this.bottles, indicator: this.indicator, renderQuality: this.renderQuality });
  }
  restore(value: unknown) {
    const s = value as ReturnType<ExplorationStore['snapshot']>;
    const fail = () => { throw new Error('La sesión guardada es incompatible o está dañada. Se conserva la copia anterior; puedes continuar y exportar este ensayo.'); };
    const nullable = (n: unknown) => n === null || (typeof n === 'number' && Number.isFinite(n));
    const timestamp = (t: unknown) => typeof t === 'string' && Number.isFinite(Date.parse(t));
    if (!s || s.schemaVersion !== 1 || s.modelId !== REACTOR_MODEL || typeof s.exploring !== 'boolean'
      || !ACTIVITIES.some(a => a.id === s.activityId) || typeof s.hypothesis !== 'string' || typeof s.reflection !== 'string'
      || typeof s.prediction !== 'string' || typeof s.evaluated !== 'boolean' || typeof s.indicator !== 'boolean'
      || !['basic', 'standard'].includes(s.renderQuality) || !Array.isArray(s.trials) || !Array.isArray(s.events)
      || !Array.isArray(s.evidence) || !Array.isArray(s.bottles) || s.bottles.length !== 2) return fail();
    try {
      readReactor(s.state);
      if (typeof s.state.closed !== 'boolean' || s.state.volumeMl > 240 + 1e-8 || Math.abs(s.state.volumeMl - 50 - Object.values(s.state.addedMl).reduce((a, b) => a + b, 0)) > 1e-6) return fail();
      const carbon = ['carbonate', 'bicarbonate'].reduce((sum, id) => sum + (s.state.addedMl[id] ?? 0) * chemical(id).concentrationM / 1000, 0);
      if (Math.abs(carbon - s.state.carbonMol - s.state.generatedCO2Mol) > 1e-9
        || (!s.state.closed && (s.state.airMol !== 0 || s.state.trappedCO2Mol !== 0))) return fail();
      for (const b of s.bottles) {
        chemical(b.chemicalId);
        if (!Number.isFinite(b.remainingMl) || b.remainingMl < 0 || b.remainingMl > 100) return fail();
      }
      const totals: Record<string, number> = {};
      for (const t of s.trials) {
        chemical(t.chemicalId);
        if (!timestamp(t.at) || t.modelId !== REACTOR_MODEL || !['mouse', 'touch', 'keyboard', 'gesture'].includes(t.source)
          || !Number.isFinite(t.ml) || t.ml <= 0 || !Number.isFinite(t.volumeMl) || !Array.isArray(t.observations)
          || !t.observations.every(x => typeof x === 'string') || !Array.isArray(t.hazards) || !t.hazards.every(x => typeof x === 'string')
          || ![t.pH, t.temperatureC, t.pressureKpa, t.gasMl, t.precipitateG].every(nullable)) return fail();
        totals[t.chemicalId] = (totals[t.chemicalId] ?? 0) + t.ml;
      }
      for (const id of new Set([...Object.keys(totals), ...Object.keys(s.state.addedMl)])) {
        if (Math.abs((totals[id] ?? 0) - (s.state.addedMl[id] ?? 0)) > 1e-6) return fail();
      }
      if (s.events.some(e => !timestamp(e.at) || !['Cerrar colector', 'Abrir colector'].includes(e.action) || !nullable(e.pressureKpa))) return fail();
      const guide = GUIDES[s.activityId];
      if ((s.prediction && !guide?.predictions.some(p => p.id === s.prediction)) || (s.evidence.length > 0 && !s.prediction) || s.evidence.length > (guide?.steps.length ?? 0)
        || (s.quizAnswer !== null && (!Number.isInteger(s.quizAnswer) || !guide || s.quizAnswer < 0 || s.quizAnswer >= guide.quiz.options.length))) return fail();
      if (s.evidence.some((e, i) => e.stepId !== guide?.steps[i].id || !timestamp(e.at)
        || ![e.pH, e.temperatureC, e.pressureKpa, e.gasMl, e.precipitateG].every(nullable))) return fail();
      if (s.activityId === 'gas' && s.evidence.some(e => ['close', 'generate'].includes(e.stepId) && e.pressureKpa === null)) return fail();
    } catch { return fail(); }
    const copy = structuredClone(s);
    this.state = copy.state; this.trials = copy.trials; this.events = copy.events;
    this.activityId = copy.activityId; this.hypothesis = copy.hypothesis; this.reflection = copy.reflection;
    this.prediction = copy.prediction; this.evidence = copy.evidence; this.quizAnswer = copy.quizAnswer;
    this.evaluated = copy.evaluated; this.bottles = copy.bottles; this.indicator = copy.indicator; this.renderQuality = copy.renderQuality;
    this.pendingSafety = null; this.acknowledged.clear();
    return s.exploring;
  }
  export(format: 'json' | 'csv') {
    const escape = (v: unknown) => '"' + String(v ?? '').replaceAll('"', '""') + '"';
    const csv = [
      ['Fecha', 'Sustancia', 'Añadido_mL', 'Volumen_mL', 'pH_referencia_25C', 'T_adiabatica_C', 'P_kPa', 'CO2_total_mL_25C_1atm', 'Precipitado_g', 'Cobertura', 'Modelo', 'Control', 'Observaciones', 'Avisos'].map(escape).join(','),
      ...this.trials.map(t => [t.at, t.name, t.ml, t.volumeMl, t.pH, t.temperatureC, t.pressureKpa, t.gasMl, t.precipitateG, t.coverage, t.modelId, t.source, t.observations.join('; '), t.hazards.join('; ')].map(escape).join(','))
    ].join('\r\n');
    const blob = new Blob([format === 'json' ? JSON.stringify({ ...this.snapshot(true), schemaVersion: '1.0.0', catalogVersion: '1.0.0', stockCatalog: CHEMICALS, instrumentEvents: this.events, result: this.result, assessment: this.assessment }, null, 2) : csv], { type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `symbiolab-exploracion-${Date.now()}.${format}`; a.click(); URL.revokeObjectURL(url);
  }
}
export const explorationStore = new ExplorationStore();
