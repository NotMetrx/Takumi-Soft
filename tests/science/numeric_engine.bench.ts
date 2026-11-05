import { readFileSync } from 'node:fs';
import { bench, vi } from 'vitest';
import * as reference from '../../src/lib/science/chemistry/numeric_reference';
import * as engine from '../../src/lib/science/chemistry/numeric_engine';

const water: reference.Inventory = { volumeL: 0.1, calcium: 0, carbonMol: 0, acetate: 0, charge: 0, citricMol: 0, ammoniaMol: 0 };
const cases = [water, { ...water, charge: -0.005 }, { ...water, charge: 0.005 },
  { ...water, acetate: 0.005 }, { ...water, acetate: 0.005, charge: 0.0025 },
  { ...water, calcium: 0.0025, carbonMol: 0.0025 }, { ...water, citricMol: 0.005 },
  { ...water, ammoniaMol: 0.005 }];
const bytes = new Uint8Array(readFileSync('src/lib/science/chemistry/wasm/chemistry.wasm')).buffer;
vi.stubGlobal('fetch', async () => new Response(bytes));
if (!await engine.initializeScienceEngine()) throw new Error('El benchmark requiere el binario Rust/WASM real.');
vi.unstubAllGlobals();

bench('TypeScript: ocho equilibrios', () => { for (const input of cases) reference.solveEquilibrium(input); }, { time: 1000, iterations: 100 });
bench('Rust/WASM + puente JS: ocho equilibrios', () => { for (const input of cases) engine.solveEquilibrium(input); }, { time: 1000, iterations: 100 });
