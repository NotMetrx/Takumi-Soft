<script lang="ts">
  import { tick } from 'svelte';
  import './exploration-workspace.css';
  import { Search, Settings2, Maximize2, Minimize2, Plus, ChevronDown, Beaker, Check, FlaskConical, Hand, RotateCcw, Droplets, ShieldAlert, Thermometer, Gauge, Wind, BookOpen, BookMarked, Download, ArrowLeft, X } from '@lucide/svelte';
  import LabScene from '$lib/lab3d/LabScene.svelte';
  import ExperimentGuide from './ExperimentGuide.svelte';
  import { labStore } from '$lib/interaction/lab_store.svelte';
  import { labSound } from '$lib/audio/lab_sound';
  import { explorationStore as lab } from '$lib/exploration/exploration_store.svelte';
  import { CHEMICALS, chemical } from '$lib/science/chemistry/catalog';
  import { ACTIVITIES as activities, GUIDES } from '$lib/exploration/guides';

  let tab = $state<'guide' | 'catalog' | 'results' | 'notebook' | 'cases'>(lab.guide ? 'guide' : 'catalog');
  const slot = $derived(labStore.selectedReagentId === 'naoh' ? 'naoh' : 'hcl');
  let catalogOpen = $state(false);
  let guideOpen = $state(false);
  let catalogDialog = $state<HTMLDialogElement | null>(null);
  let family = $state('all');
  let focusMode = $state(false);
  let viewRevision = $state(0);
  const families = [...new Set(CHEMICALS.map(c => c.family))];
  let dose = $state(10);
  let query = $state('');
  let safetyDialog = $state<HTMLDialogElement | null>(null);
  let guideDialog = $state<HTMLDialogElement | null>(null);
  let caseId = $state('pressure');
  let replay = $state(false);
  let hasFuel = $state(true), hasOxidant = $state(true), hasIgnition = $state(false), confined = $state(false);
  const r = $derived(lab.result);
  const bottle = $derived(labStore.reagents.find(x => x.reagentId === slot)!);
  const item = $derived(chemical(bottle.chemicalId!));
  const filtered = $derived(CHEMICALS.filter(x => `${x.name} ${x.formula} ${x.family}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')) && (family === 'all' || x.family === family)));
  const maxDose = $derived(Math.max(0, Math.min(50, bottle.remainingMl, labStore.availableCapacityMl)));
  const preview = $derived(lab.preview(item.id));
  const busy = $derived(!!labStore.activePourAnim || r.stopped);
  const question = $derived(activities.find(a => a.id === lab.activityId)?.question ?? activities[0].question);
  async function showGuide() {
    tab = 'guide'; focusMode = false;
    await tick();
    const panel = document.getElementById('experiment-guide');
    panel?.focus({ preventScroll: true });
    panel?.scrollIntoView({ block: 'start' });
  }
  function chooseActivity(id: string) {
    const a = activities.find(x => x.id === id)!;
    labStore.resetExperiment();
    labStore.setExplorationBottle('hcl', a.pair[0]);
    labStore.setExplorationBottle('naoh', a.pair[1]);
    guideOpen = false;
    labStore.isHomeBookOpen = false;
    labStore.selectReagent('hcl');
    lab.activityId = id; lab.hypothesis = ''; lab.reflection = '';
    tab = GUIDES[id] ? 'guide' : 'catalog';
    if (GUIDES[id]) void showGuide();
  }
  function pour(event: MouseEvent) {
    const amount = Math.min(dose, maxDose);
    if (Number.isFinite(amount) && amount >= 0.1) {
      labStore.selectReagent(slot);
      labStore.triggerAnimatedPour(slot, amount, event.detail === 0 ? 'keyboard' : (event as PointerEvent).pointerType === 'touch' ? 'touch' : 'mouse');
    }
  }
  function loadChemical(id: string) {
    labStore.setExplorationBottle(slot, id);
    catalogOpen = false;
  }
  $effect(() => {
    labStore.isCatalogOpen = catalogOpen || guideOpen;
    return () => { labStore.isCatalogOpen = false; };
  });
  $effect(() => {
    if (catalogDialog) {
      if (catalogOpen && !catalogDialog.open) catalogDialog.showModal();
      else if (!catalogOpen && catalogDialog.open) catalogDialog.close();
    }
  });
  function cancelSafety() {
    lab.pendingSafety = null;
    lab.notice = 'Dosis cancelada. No se añadió líquido.';
    labStore.activePourAnim = null;
  }
  $effect(() => {
    if (safetyDialog) {
      if (lab.pendingSafety && !safetyDialog.open) safetyDialog.showModal();
      else if (!lab.pendingSafety && safetyDialog.open) safetyDialog.close();
    }
  });
  $effect(() => {
    if (guideDialog) {
      if (guideOpen && !guideDialog.open) guideDialog.showModal();
      else if (!guideOpen && guideDialog.open) guideDialog.close();
    }
  });
</script>
<div class="workspace">
  <header class="explore-header">
    <div class="identity">
      <div class="brand-mark"><FlaskConical size={25} aria-hidden="true" /></div>
      <div><h1>SymbioLab <span>Exploración</span></h1><p>Tu espacio para descubrir química</p></div>
    </div>
    <div class="toolbar">
      <span class="session-label" title={lab.saveStatus}><span></span> Sesión local</span>
      <button aria-label="Libro 3D Primaria y Secundaria" onclick={() => { labSound.playBookOpen(); labStore.isHomeBookOpen = true; }}><BookMarked size={17} aria-hidden="true" /> <span>Libro 3D</span></button>
      <button aria-label="Actividades" onclick={() => guideOpen = true}><BookOpen size={17} aria-hidden="true" /> <span>Actividades</span></button>
      <button aria-label="Modo Guiado 3D" onclick={() => labStore.leaveExploration()}><ArrowLeft size={16} aria-hidden="true" /> <span>Modo Inmersivo</span></button>
      <button aria-label={labStore.isCameraActive ? 'Manos activas' : 'Control con manos'} class:camera-active={labStore.isCameraActive} onclick={() => labStore.isCameraModalOpen = true}><Hand size={17} aria-hidden="true" /><span>{labStore.isCameraActive ? 'Manos activas' : 'Control con manos'}</span></button>
      <button class="icon-button" onclick={() => labStore.resetExperiment()} aria-label="Reiniciar experimento" title="Reiniciar experimento"><RotateCcw size={17} /></button>
      <details class="settings-menu">
        <summary aria-label="Opciones del laboratorio" title="Opciones del laboratorio"><Settings2 size={18} /></summary>
        <div class="settings-popover glass-surface">
          <label for="graphics-quality">Calidad de la escena</label>
          <select id="graphics-quality" aria-label="Calidad gráfica" bind:value={lab.renderQuality} disabled={!!labStore.activePourAnim}><option value="basic">Gráficos básicos</option><option value="standard">Vidrio detallado</option></select>
          <button onclick={() => labStore.leaveExploration()}><ArrowLeft size={16} aria-hidden="true" /> Modo Inmersivo (Primaria/Secundaria)</button>
        </div>
      </details>
    </div>
  </header>
  <div class="experiment-bar">
    <div class="activity-picker"><span class="activity-icon"><Beaker size={18} aria-hidden="true" /></span><div><label for="activity">Investigación actual</label><select id="activity" value={lab.activityId} onchange={e => chooseActivity(e.currentTarget.value)} disabled={!!labStore.activePourAnim}>{#each activities as a}<option value={a.id}>{a.name}{GUIDES[a.id] ? ' · Guía' : ''}</option>{/each}</select></div></div>
    <p>{question}</p>
    {#if lab.guide}<button class="guide-shortcut" onclick={showGuide}>Guía · {lab.currentStep ? `Paso ${lab.evidence.length + 1}/${lab.guide.steps.length}` : 'Evaluación'}</button>{:else}<span class="learning-label">Predice. Experimenta. Comprende.</span>{/if}
  </div>
  {#if lab.saveError}<p class="storage-error" role="alert">{lab.saveError}</p>{/if}
  <div class:focus-mode={focusMode} class="workbench">
    <aside class="instruments glass-surface" aria-label="Instrumentos virtuales">
      <div class="panel-heading"><div><span class="eyebrow">EN TIEMPO DE ENSAYO</span><h2>Mediciones</h2></div><Gauge size={18} aria-hidden="true" /></div>
      <div class="instrument-body">
        <div class="sensor ph-sensor">
          <div class="sensor-label"><span>Acidez de la mezcla</span><span class="sensor-code">pH</span></div>
          <strong>{r.pH?.toFixed(2) ?? '—'}</strong>
          <small>{r.pH === null ? 'Sin modelo de pH' : r.pH < 6.99 ? 'Medio ácido' : r.pH > 7.01 ? 'Medio básico' : 'Próximo a neutro'} <span>· ref. 25 °C</span></small>
          <div class="ph-spectrum" aria-hidden="true">{#if r.pH !== null}<span style:left={`${Math.max(0, Math.min(100, r.pH / 14 * 100))}%`}></span>{/if}</div>
          <div class="spectrum-labels" aria-hidden="true"><span>Ácido</span><span>Neutro</span><span>Básico</span></div>
        </div>
        <div class="sensor-pair">
          <div class="sensor"><div class="sensor-label"><Thermometer size={15} aria-hidden="true" /><span>Temperatura</span></div><strong>{r.temperatureC?.toFixed(1) ?? '—'}<span>°C</span></strong><small>Estimada, adiabática</small></div>
          <div class:critical={r.stopped} class="sensor"><div class="sensor-label"><Gauge size={15} aria-hidden="true" /><span>Presión</span></div><strong>{r.pressureKpa?.toFixed(1) ?? '—'}<span>kPa</span></strong><small>{r.pressureKpa === null ? 'No determinada' : lab.state.closed ? 'Absoluta · cerrado' : 'Absoluta · abierto'}</small></div>
        </div>
        <div class="sensor gas-sensor"><div class="sensor-label"><Wind size={15} aria-hidden="true" /><span>CO₂ acumulado</span></div><strong>{r.gasMl?.toFixed(1) ?? '—'}<span>mL</span></strong><small>Equivalente a 25 °C y 1 atm</small>{#if r.trappedGasMl !== null}<div class="gas-breakdown"><span>Capturado <b>{r.trappedGasMl.toFixed(1)}</b></span><span>Evacuado <b>{((r.gasMl ?? 0) - r.trappedGasMl).toFixed(1)}</b></span></div>{/if}</div>
        <div class="sensor solid-sensor"><div class="sensor-label"><Beaker size={15} aria-hidden="true" /><span>Precipitado</span></div><strong>{r.precipitateG?.toFixed(4) ?? '—'}<span>g</span></strong><small>{r.precipitateName ?? (r.precipitateG === null ? 'No determinado' : 'Sin sólido previsto')}</small></div>
        <div class="instrument-controls">
          <label class="switch-row"><span>Colector cerrado</span><input type="checkbox" checked={lab.state.closed} onchange={e => lab.close(e.currentTarget.checked)} disabled={!!labStore.activePourAnim} /></label>
          <label class="switch-row"><span>Indicador de pH virtual</span><input type="checkbox" bind:checked={lab.indicator} /></label>
          <details class="instrument-note"><summary>Sobre estas mediciones</summary><p>El pH es una referencia a 25 °C. La temperatura se estima solo para las composiciones admitidas. El colector usa gas seco ideal; su límite didáctico de 150 kPa no representa la resistencia del vidrio.</p><p>Los colores y las burbujas son representaciones educativas. Consulta el alcance en Resultados.</p></details>
        </div>
      </div>
    </aside>
    <section class="stage glass-surface" aria-label="Mesa de experimentación">
      <div class="stage-heading"><div><span class="eyebrow">ESTACIÓN 01</span><h2>Mesa de trabajo</h2></div><div class="stage-actions"><button class="icon-button" onclick={() => viewRevision += 1} aria-label="Restablecer vista" title="Restablecer vista"><RotateCcw size={16} /></button><button class="icon-button" onclick={() => focusMode = !focusMode} aria-label={focusMode ? 'Mostrar paneles' : 'Ampliar mesa'} title={focusMode ? 'Mostrar paneles' : 'Ampliar mesa'} aria-pressed={focusMode}>{#if focusMode}<Minimize2 size={17} />{:else}<Maximize2 size={17} />{/if}</button></div></div>
      <div class="scene-viewport">
        {#key lab.renderQuality}<LabScene resetViewRevision={viewRevision} />{/key}
        <div class="stage-status"><span class:limited={r.coverage !== 'quantitative'} class="pill"><span class="status-dot"></span>{r.coverage === 'quantitative' ? 'Modelo acuoso ideal' : r.coverage === 'partial' ? 'Resultado parcial' : 'No determinado'}</span><span class="volume-tag">{lab.state.volumeMl.toFixed(1)} <span>/ 240 mL</span></span></div>
        {#if r.stopped}<div class="incident" role="alert"><ShieldAlert size={32} /><h2>Ensayo detenido por sobrepresión</h2><p>Se alcanzó el límite didáctico del colector. Observa la relación entre gas, espacio libre y presión.</p><p>Este evento no predice una explosión ni el fallo de un recipiente real.</p><button onclick={() => lab.close(false)}>Abrir el colector virtual</button></div>{/if}
      </div>
      <div class="stage-foot"><span><Hand size={15} aria-hidden="true" /> Arrastra un matraz hacia el vaso para verter</span><span class="scene-caption">Vista 3D interactiva</span></div>
    </section>
    <aside class="explorer glass-surface" aria-label="Catálogo, resultados y cuaderno">
      <nav class="tabs" aria-label="Panel de exploración">{#each [...(lab.guide ? [{id:'guide', label:'Guía'}] : []), {id:'catalog', label:'Reactivos'}, {id:'results', label:'Resultados'}, {id:'notebook', label:'Cuaderno'}, {id:'cases', label:'Accidentes'}] as t}<button class:active={tab === t.id} aria-pressed={tab === t.id} onclick={() => tab = t.id as typeof tab}>{t.label}</button>{/each}</nav>
      <div class="panel-body">
        {#if tab === 'guide' && lab.guide}
          <ExperimentGuide onNavigate={next => tab = next} />
        {:else if tab === 'catalog'}
          <div class="section-heading"><div><span class="eyebrow">PREPARA TU ENSAYO</span><h2>Matraz seleccionado</h2></div><FlaskConical size={18} aria-hidden="true" /></div>
          <div class="slots">{#each labStore.reagents as reagent, i}<button class:active={slot === reagent.reagentId} onclick={() => labStore.selectReagent(reagent.reagentId)} aria-pressed={slot === reagent.reagentId}><span class="slot-top"><span class="slot-id">{i === 0 ? 'A' : 'B'}</span><small>{i === 0 ? 'Izquierdo' : 'Derecho'}</small>{#if slot === reagent.reagentId}<Check size={13} aria-hidden="true" />{/if}</span><strong style:color={reagent.colorHex}>{reagent.formula}</strong><span class="stock-volume">{reagent.remainingMl.toFixed(1)} <small>mL disponibles</small></span></button>{/each}</div>
          <div class="reagent-summary"><div class="reagent-symbol" style:color={item.color}><FlaskConical size={23} aria-hidden="true" /></div><div><h3>{item.name}</h3><span>{item.id === 'starch' ? 'Dispersión cualitativa' : item.concentrationM === 0 ? 'Disolvente' : `${item.concentrationM} mol/L · disolución virtual`}</span></div></div>
          <button class="library-trigger" aria-haspopup="dialog" onclick={() => catalogOpen = true} disabled={!!labStore.activePourAnim}><Plus size={17} aria-hidden="true" /><span>Cambiar reactivo</span><span class="count-badge">{CHEMICALS.length}</span></button>
          <section class="dosing-card" aria-label="Dosificación">
            <div class="section-heading"><h3>Pipeta virtual</h3><Droplets size={17} aria-hidden="true" /></div>
            <label for="dose">Volumen a añadir <span>mL</span></label>
            <div class="dose-row"><input id="dose" type="number" min="0.1" max={maxDose} step="0.1" bind:value={dose} /><button class="primary" onclick={pour} disabled={busy || maxDose < 0.1 || !Number.isFinite(dose) || dose <= 0}><Droplets size={16} aria-hidden="true" />{labStore.activePourAnim ? 'Vertiendo…' : `Verter ${Math.min(dose || 0, maxDose)} mL`}</button></div>
            <div class="dose-shortcuts">{#each [1, 5, 10, 25] as ml}<button onclick={() => dose = ml} disabled={ml > maxDose || busy} aria-label={`Seleccionar dosis de ${ml} mL`}>{ml} mL</button>{/each}</div>
            <small>Disponible en el vaso: {labStore.availableCapacityMl.toFixed(1)} mL</small>
          </section>
          {#if preview.length}<div class="preview"><ShieldAlert size={18} aria-hidden="true" /><div><strong>Antes de mezclar</strong><span>{preview.map(h => h.title).join(' · ')}</span></div></div>{/if}
          <details class="bottle-detail"><summary>Ficha del reactivo <ChevronDown size={15} aria-hidden="true" /></summary><p>{item.note}</p>{#each item.hazards as h}<p class="warning-text">{h}</p>{/each}<a href={item.source} target="_blank" rel="noreferrer">Consultar referencia ↗</a></details>
          <p class="muted cabinet-note">Cambiar un reactivo repone el matraz a 100 mL. La mezcla del vaso se conserva.</p>
        {:else if tab === 'results'}
          <h2>Qué ocurrió en la mezcla</h2>
          {#each r.observations as observation}<article><h3>{observation.title}</h3><p class="equation">{observation.equation}</p><p>{observation.explanation}</p><a href={observation.source} target="_blank" rel="noreferrer">Fundamento científico ↗</a></article>{/each}
          {#if r.hazards.length}<h2>Avisos e incompatibilidades</h2>{#each r.hazards as h}<article class:danger={h.severity === 'danger'}><h3><ShieldAlert size={17} /> {h.title}</h3><p>{h.detail}</p><a href={h.source} target="_blank" rel="noreferrer">Fuente del aviso ↗</a></article>{/each}{/if}
          {#if r.species.length}<details><summary>Especies calculadas</summary><table><thead><tr><th>Especie</th><th>mol</th></tr></thead><tbody>{#each r.species as species}<tr><td>{species.name}</td><td>{species.mol.toExponential(3)}</td></tr>{/each}</tbody></table><p class="muted">Lista parcial de especies observables, no inventario elemental completo.</p></details>{/if}
          <details open><summary>Alcance y límites del resultado</summary><p class="muted">Modelo: {r.modelId}</p><ul>{#each r.limitations as limitation}<li>{limitation}</li>{/each}</ul></details>
        {:else if tab === 'notebook'}
          <h2>Cuaderno de investigación</h2><label for="hypothesis-explore">Mi pregunta y predicción</label><textarea id="hypothesis-explore" rows="3" bind:value={lab.hypothesis} placeholder="¿Qué cambiará si…? ¿Qué mantendré constante?"></textarea>
          <label for="reflection-explore">Qué observé y cómo lo explico</label><textarea id="reflection-explore" rows="3" bind:value={lab.reflection} oninput={() => lab.evaluated = false} placeholder="Compara tu predicción con los datos y los límites del modelo."></textarea>
          <div class="dose-row"><button onclick={() => lab.export('json')}><Download size={16} /> JSON</button><button onclick={() => lab.export('csv')}><Download size={16} /> CSV</button></div>
          <p class="muted" role="status">{lab.saveStatus}. Reiniciar borra los ensayos del intento actual. Exporta para conservar una copia aparte.</p>
          {#if lab.guide}<button onclick={showGuide}>Volver a la guía y evaluación</button>{/if}
          {#each lab.events.slice(-8).reverse() as event}<p class="muted">{event.action} · {event.pressureKpa?.toFixed(1) ?? '—'} kPa abs.</p>{/each}
          <h3>Últimas dosificaciones · {lab.trials.length} registros</h3>
          {#each lab.trials.slice(-40).reverse() as trial}<article><h3>+{trial.ml.toFixed(1)} mL · {trial.name}</h3><p>pH {trial.pH?.toFixed(2) ?? 'no determinado'} · {trial.pressureKpa?.toFixed(1) ?? '—'} kPa · {trial.source}</p><small>{trial.observations.join(' · ')}</small></article>{/each}
          {#if !lab.trials.length}<p>Dosifica una sustancia para registrar tu primer ensayo.</p>{/if}
        {:else}
          <h2>Aprender de un accidente</h2><p>Reconstrucciones cualitativas. No son predicciones de explosión ni procedimientos para reproducirlas.</p>
          <label for="case">Caso de estudio</label><select id="case" bind:value={caseId} onchange={() => replay = false}><option value="pressure">Rotura por sobrepresión</option><option value="fire">Llamarada y confinamiento</option><option value="gas">Gas tóxico invisible</option></select>
          {#if caseId === 'fire'}
            <div class="instrument-controls"><label><input type="checkbox" bind:checked={hasFuel} /> Presencia de combustible</label><label><input type="checkbox" bind:checked={hasOxidant} /> Presencia de oxidante</label><label><input type="checkbox" bind:checked={hasIgnition} /> Condición de ignición</label><label><input type="checkbox" bind:checked={confined} /> Entorno confinado</label></div>
            <button class="primary" onclick={() => replay = true}>Observar consecuencia conceptual</button>
            {#if replay}<article class:danger={hasFuel && hasOxidant && hasIgnition}><h3>{hasFuel && hasOxidant && hasIgnition ? confined ? 'Posible incendio con sobrepresión' : 'Posible llamarada' : 'No se reúnen las condiciones seleccionadas'}</h3><p>El triángulo del fuego ayuda a reconocer el peligro. Tener estos factores no determina un tiempo, una intensidad ni una detonación.</p><p>¿Qué condición cambiaste? ¿Qué evidencia adicional necesitarías?</p></article>{/if}
          {:else if caseId === 'pressure'}<article><h3>El gas necesita espacio</h3><p>Un cambio de fase o la formación de gas puede elevar la presión si no puede salir. Una rotura física no necesita combustión.</p><p>En la mesa, compara el colector abierto y cerrado con la actividad de carbonatos. El sistema se detiene a un límite de entrenamiento.</p><a href="https://www.worksafe.vic.gov.au/safety-alerts/working-dry-ice" target="_blank" rel="noreferrer">Incidente documentado ↗</a></article>
          {:else}<article class="danger"><h3>Ausencia de humo no significa ausencia de peligro</h3><p>El hipoclorito con sustancias ácidas puede liberar cloro; con amoníaco puede formar cloraminas. Este simulador muestra el aviso y deja el rendimiento y la exposición como desconocidos.</p><p>¿Qué información de las fichas permitiría anticipar la incompatibilidad?</p><a href={chemical('bleach').source} target="_blank" rel="noreferrer">Referencia sanitaria ↗</a></article>{/if}
          <p class="muted">Ante un incidente real, comunicar al responsable y seguir el protocolo del centro. El simulador no prescribe respuesta médica ni neutralización.</p>
        {/if}
      </div>
    </aside>
  </div>
  <footer class="feedback"><span class="feedback-mark"><ShieldAlert size={15} aria-hidden="true" /></span><span role="status">{lab.notice || (r.hazards.length ? r.hazards.map(h => h.title).join(' · ') : 'Explora con libertad. Consulta las fichas y comprueba tu predicción.')}</span><button onclick={() => { tab = 'results'; focusMode = false; }}>Ver explicación <span aria-hidden="true">↗</span></button></footer>
</div>

<dialog bind:this={catalogDialog} oncancel={() => catalogOpen = false} class="explore-dialog catalog-dialog" aria-labelledby="catalog-title">
  <div class="catalog-header"><div><span class="eyebrow">BIBLIOTECA DE REACTIVOS</span><h2 id="catalog-title">¿Con qué quieres experimentar?</h2><p>Cargar en matraz {slot === 'hcl' ? 'A · izquierdo' : 'B · derecho'} · la mezcla del vaso se conserva</p></div><button class="icon-button" onclick={() => catalogOpen = false} aria-label="Cerrar biblioteca de reactivos"><X size={20} /></button></div>
  <div class="catalog-filters"><div><label for="chemical-search">Buscar reactivo</label><div class="search-field"><Search size={17} aria-hidden="true" /><input id="chemical-search" type="search" placeholder="Nombre o fórmula…" bind:value={query} /></div></div><div><label for="chemical-family">Familia</label><select id="chemical-family" bind:value={family}><option value="all">Todas las familias</option>{#each families as f}<option>{f}</option>{/each}</select></div></div>
  <div class="catalog"><span class="catalog-count" role="status">{filtered.length} sustancias disponibles</span><div class="catalog-grid">{#each filtered as c}<button disabled={!!labStore.activePourAnim} onclick={() => loadChemical(c.id)} class:selected={item.id === c.id}><span class="catalog-formula" style:color={c.color}>{c.formula}</span><span class="catalog-description"><strong>{c.name}</strong><small>{c.family}</small></span>{#if item.id === c.id}<Check size={17} aria-label="Cargado" />{:else}<Plus size={17} aria-hidden="true" />{/if}</button>{/each}</div>{#if !filtered.length}<p class="empty-catalog">No encontramos ese reactivo. Prueba otro nombre o familia.</p>{/if}</div>
</dialog>
<dialog bind:this={safetyDialog} oncancel={cancelSafety} class="explore-dialog" aria-labelledby="safety-title">
  <h2 id="safety-title"><ShieldAlert size={24} /> Revisa esta incompatibilidad</h2>
  {#each lab.pendingSafety?.hazards ?? [] as h}<article><h3>{h.title}</h3><p>{h.detail}</p><a href={h.source} target="_blank" rel="noreferrer">Consultar fuente ↗</a></article>{/each}
  <p>No se añadió líquido. El modelo no calcula productos ni exposición para estas combinaciones. Continuar permite estudiar el aviso dentro del simulador.</p>
  <div class="toolbar"><button onclick={cancelSafety}>Cancelar mezcla</button><button class="primary" onclick={() => lab.acknowledge()}>Leí el aviso</button></div>
</dialog>
<dialog bind:this={guideDialog} oncancel={() => guideOpen = false} class="explore-dialog" aria-labelledby="guide-title">
  <div class="section-heading"><h2 id="guide-title">Elige una investigación</h2><button onclick={() => guideOpen = false} aria-label="Cerrar actividades"><X size={20} /></button></div>
  <p>Elegir una actividad inicia un ensayo nuevo. Puedes cambiar los reactivos después y explorar por tu cuenta.</p>
  {#each activities as a}<button class="activity-option" disabled={!!labStore.activePourAnim} onclick={() => chooseActivity(a.id)}><strong>{a.name}{GUIDES[a.id] ? ' · Guía paso a paso' : ''}</strong><span>{a.question}</span></button>{/each}
</dialog>

