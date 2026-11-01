import { addDose, assessHazards, initialReactor, readReactor, setClosure, type Hazard, type ReactorState } from '$lib/science/chemistry/reactor';
import { CHEMICALS, chemical } from '$lib/science/chemistry/catalog';
import type { InputMode } from '$lib/core/contracts';
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
  events = $state<{ at: string; action: string; pressureKpa: number | null }[]>([]);
  notice = $state('');
  pendingSafety = $state<{ hazards: Hazard[]; signature: string } | null>(null);
  private acknowledged = new Set<string>();
  result = $derived(readReactor(this.state));
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
  }
  reset() {
    this.state = initialReactor(); this.trials = []; this.events = []; this.pendingSafety = null;
    this.acknowledged.clear(); this.notice = '';
  }
  export(format: 'json' | 'csv') {
    const escape = (v: unknown) => '"' + String(v ?? '').replaceAll('"', '""') + '"';
    const csv = [
      ['Fecha', 'Sustancia', 'Añadido_mL', 'Volumen_mL', 'pH_referencia_25C', 'T_adiabatica_C', 'P_kPa', 'CO2_total_mL_25C_1atm', 'Precipitado_g', 'Cobertura', 'Modelo', 'Control', 'Observaciones', 'Avisos'].map(escape).join(','),
      ...this.trials.map(t => [t.at, t.name, t.ml, t.volumeMl, t.pH, t.temperatureC, t.pressureKpa, t.gasMl, t.precipitateG, t.coverage, t.modelId, t.source, t.observations.join('; '), t.hazards.join('; ')].map(escape).join(','))
    ].join('\r\n');
    const blob = new Blob([format === 'json' ? JSON.stringify({ schemaVersion: '1.0.0', catalogVersion: '1.0.0', stockCatalog: CHEMICALS, instrumentEvents: this.events, hypothesis: this.hypothesis, reflection: this.reflection, state: this.state, result: this.result, trials: this.trials }, null, 2) : csv], { type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `symbiolab-exploracion-${Date.now()}.${format}`; a.click(); URL.revokeObjectURL(url);
  }
}
export const explorationStore = new ExplorationStore();
