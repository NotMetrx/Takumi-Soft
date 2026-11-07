<script lang="ts">
  import { onMount } from 'svelte';
  import { Bot, Mic, Send, X, WifiOff } from '@lucide/svelte';
  import { assistantStore as assistant } from './assistant_store.svelte';

  // Reconocimiento de voz del navegador (en Chrome usa servidores: sin conexión se desactiva)
  type Recognizer = {
    lang: string;
    interimResults: boolean;
    onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
    onend: () => void;
    onerror: () => void;
    start(): void;
    stop(): void;
  };
  const w = typeof window === 'undefined' ? undefined : (window as unknown as Record<string, unknown>);
  const Recognition = (w?.SpeechRecognition ?? w?.webkitSpeechRecognition) as (new () => Recognizer) | undefined;

  let open = $state(false);
  let text = $state('');
  let listening = $state(false);
  let recognizer: Recognizer | null = null;
  let log = $state<HTMLElement | null>(null);
  const micReady = $derived(!!Recognition && assistant.online);

  onMount(() => {
    const sync = () => (assistant.online = navigator.onLine);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
      recognizer?.stop();
    };
  });

  $effect(() => {
    assistant.messages.length;
    log?.scrollTo({ top: log.scrollHeight });
  });

  function send(e: SubmitEvent) {
    e.preventDefault();
    assistant.ask(text);
    text = '';
  }

  function listen() {
    if (!Recognition || !micReady) return;
    if (listening) {
      recognizer?.stop();
      return;
    }
    recognizer = new Recognition();
    recognizer.lang = 'es-ES';
    recognizer.interimResults = false;
    recognizer.onresult = (e) => assistant.ask(e.results[0][0].transcript);
    recognizer.onend = () => (listening = false);
    recognizer.onerror = () => (listening = false);
    listening = true;
    recognizer.start();
  }
</script>

<div class="absolute bottom-5 left-5 z-30 flex flex-col items-start gap-2 pointer-events-auto text-xs text-white">
  {#if open}
    <section
      class="w-80 max-w-[calc(100vw-2.5rem)] rounded-2xl bg-black/70 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col"
      aria-label="Asistente del laboratorio"
    >
      <header class="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span class="font-semibold flex items-center gap-1.5"><Bot size={14} /> Asistente</span>
        <span class="flex items-center gap-2">
          {#if !assistant.online}
            <span class="flex items-center gap-1 text-amber-300"><WifiOff size={12} /> Sin conexión</span>
          {/if}
          <button type="button" class="p-1 rounded-full hover:bg-white/10" aria-label="Cerrar asistente" onclick={() => (open = false)}>
            <X size={14} />
          </button>
        </span>
      </header>

      <div bind:this={log} class="max-h-56 overflow-y-auto px-3 py-2 flex flex-col gap-1.5" aria-live="polite">
        {#if !assistant.messages.length}
          <p class="text-white/60">Pregúntame, por ejemplo: «¿qué pasa si mezclo lejía con amoníaco?», «llévame a Biología» o «tráeme el termómetro».</p>
        {/if}
        {#each assistant.messages as m}
          <p class="rounded-xl px-2.5 py-1.5 {m.from === 'robot' ? 'bg-teal-500/15 text-teal-50 self-start' : 'bg-white/10 self-end'}">{m.text}</p>
        {/each}
      </div>

      <form class="flex items-center gap-1.5 px-2 py-2 border-t border-white/10" onsubmit={send}>
        <input
          bind:value={text}
          onkeydown={(e) => e.stopPropagation()}
          class="flex-1 min-w-0 rounded-full bg-white/10 px-3 py-1.5 outline-none focus:ring-2 focus:ring-teal-400/60"
          placeholder="Escribe tu pregunta…"
          aria-label="Pregunta para el asistente"
        />
        <button
          type="button"
          onclick={listen}
          disabled={!micReady}
          class="p-2 rounded-full {listening ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'} disabled:opacity-40"
          aria-label={listening ? 'Detener micrófono' : 'Hablar con el asistente'}
          title={micReady ? 'Hablar' : 'Micrófono no disponible sin conexión o en este navegador'}
        >
          <Mic size={14} />
        </button>
        <button type="submit" class="p-2 rounded-full bg-teal-500 hover:bg-teal-400 text-black" aria-label="Enviar pregunta">
          <Send size={14} />
        </button>
      </form>

      <label class="flex items-center gap-2 px-3 pb-2 text-white/70">
        <input type="checkbox" bind:checked={assistant.autoHelp} />
        Ayuda automática (pistas por inactividad y rondas)
      </label>
    </section>
  {/if}

  <button
    type="button"
    onclick={() => (open = !open)}
    class="flex items-center gap-2 rounded-full bg-teal-500 hover:bg-teal-400 text-black font-semibold px-4 py-2 shadow-xl"
    aria-expanded={open}
  >
    <Bot size={16} /> Asistente
  </button>
</div>
