<script lang="ts">
  let title = $state('SymbioLab 2.0');
  let status = $state('Listo para inicializar estación 3D');
</script>

<main class="container">
  <header>
    <h1>{title}</h1>
    <p class="subtitle">Laboratorio Científico Inmersivo, Gestual y Offline</p>
  </header>
  <div class="card">
    <p class="status"><strong>Estado:</strong> {status}</p>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: #0f172a;
    color: #f8fafc;
  }
  .container {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem 1rem;
    text-align: center;
  }
  h1 {
    font-size: 2.25rem;
    margin-bottom: 0.5rem;
    color: #38bdf8;
  }
  .subtitle {
    font-size: 1.125rem;
    color: #94a3b8;
    margin-top: 0;
  }
  .card {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin-top: 2rem;
  }
  .status {
    color: #e2e8f0;
  }
</style>
