<script lang="ts">
  import { explorationStore as lab } from '$lib/exploration/exploration_store.svelte';
  import { BookOpen, Check, Lightbulb } from '@lucide/svelte';
  let { onNavigate }: { onNavigate: (tab: 'catalog' | 'results' | 'notebook') => void } = $props();
</script>

{#if lab.guide}
  <section id="experiment-guide" class="experiment-guide" aria-label="Guía de investigación" tabindex="-1">
    <div class="section-heading"><div><span class="eyebrow">APRENDE EXPERIMENTANDO</span><h2><BookOpen size={17} aria-hidden="true" /> Tu investigación</h2></div><span class="muted">{lab.evidence.length}/{lab.guide.steps.length}</span></div>
    <progress max={lab.guide.steps.length} value={lab.evidence.length} aria-label="Pasos completados"></progress>
    <p class="guide-current" role="status">{lab.assessment ? 'Investigación evaluada. Puedes revisar tu conclusión.' : lab.currentStep ? `Paso ${lab.evidence.length + 1}: ${lab.currentStep.title}` : 'Observaciones registradas. Prepara tu conclusión.'}</p>
    {#if lab.currentStep}<p>{lab.currentStep.instruction}</p>{/if}
    {#if !lab.trials.length || lab.currentStep?.id === 'predict'}
      <fieldset disabled={!!lab.trials.length}>
        <legend>{lab.guide.predictionQuestion}</legend>
        {#each lab.guide.predictions as prediction}
          <label class="guide-choice" class:chosen={lab.prediction === prediction.id}><input type="radio" name="guide-prediction" value={prediction.id} checked={lab.prediction === prediction.id} onchange={() => lab.predict(prediction.id)} />{prediction.label}</label>
        {/each}
      </fieldset>
    {:else}
      <p class="muted">Tu predicción inicial: {lab.guide.predictions.find(p => p.id === lab.prediction)?.label ?? 'No registrada antes del ensayo'}.</p>
    {/if}
    {#if lab.recommendation}
      <article class="guide-hint"><h3><Lightbulb size={16} aria-hidden="true" />{lab.recommendation.title}</h3><p>{lab.recommendation.detail}</p></article>
    {/if}
    <div class="guide-actions"><button onclick={() => onNavigate('catalog')}>Ir a los reactivos</button><button onclick={() => onNavigate('results')}>Ver resultados</button><button onclick={() => onNavigate('notebook')}>Abrir cuaderno</button></div>
    <details><summary>Pasos y mediciones guardadas</summary><ol class="guide-steps">
      {#each lab.guide.steps as step, i}
        {@const evidence = lab.evidence[i]}
        <li aria-current={lab.currentStep?.id === step.id ? 'step' : undefined}><span>{#if evidence}<Check size={14} aria-hidden="true" /> Completado · {/if}{step.title}</span>
          {#if evidence && step.id !== 'predict'}<small>pH {evidence.pH?.toFixed(2) ?? '—'} · presión {evidence.pressureKpa?.toFixed(2) ?? '—'} kPa · sólido {evidence.precipitateG?.toFixed(4) ?? '—'} g · CO₂ {evidence.gasMl?.toFixed(2) ?? '—'} mL</small>{/if}
        </li>
      {/each}
    </ol></details>
    {#if lab.guideReady}
      <section class="guide-evaluation" aria-labelledby="guide-evaluation-title">
        <h2 id="guide-evaluation-title">Contrasta y explica</h2>
        <fieldset><legend>{lab.guide.quiz.question}</legend>
          {#each lab.guide.quiz.options as option, i}
            <label class="guide-choice" class:chosen={lab.quizAnswer === i}><input type="radio" name="guide-answer" value={i} checked={lab.quizAnswer === i} onchange={() => lab.answer(i)} />{option}</label>
          {/each}
        </fieldset>
        <label for="guide-reflection">Tu conclusión: compara la predicción con las mediciones</label>
        <textarea id="guide-reflection" rows="4" bind:value={lab.reflection} oninput={() => lab.evaluated = false} placeholder="Predije… Observé… Lo explico porque…"></textarea>
        <p class="muted">Incluye al menos una medición. Tu explicación escrita queda disponible para revisión docente.</p>
        <button class="primary" disabled={!lab.canEvaluate} onclick={() => lab.evaluate()}>Evaluar mi investigación</button>
        {#if lab.assessment}
          <article class="guide-assessment" role="status"><h3>Comparación con tu predicción</h3>
            <p>{lab.assessment.matches ? 'La observación coincide con tu predicción.' : 'La observación fue diferente de tu predicción. Usa esa diferencia para revisar tu explicación.'}</p>
            <p>{lab.assessment.observed}</p><p>{lab.assessment.detail}</p>
            <h3>{lab.assessment.quizCorrect ? 'Concepto identificado correctamente' : 'Revisa el concepto'}</h3><p>{lab.assessment.quizExplanation}</p>
            <p class="muted">Conclusión registrada. El sistema no califica automáticamente la calidad de tu texto.</p>
          </article>
        {/if}
      </section>
    {/if}
  </section>
{/if}
