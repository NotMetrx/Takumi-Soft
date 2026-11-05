import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { initializeScienceEngine } from './lib/science/chemistry/numeric_engine';

const app = initializeScienceEngine().then(() => mount(App, {
  target: document.getElementById('app')!
}));

export default app;
