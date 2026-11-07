# Motor de reacciones — Plan 1: datos y motor (hitos 1 y 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el catálogo de reacciones en datos TypeScript curados y construir un motor puro (sin interfaz) que, dado un recipiente, sustancias y condiciones, devuelva qué reacciones ocurren, sus consecuencias y las mediciones.

**Architecture:** Módulo nuevo `src/lib/science/reactions/`.
- **Datos:** elementos, sustancias y especies, catálogo de reacciones y pares de elementos.
- **Motor:** un recipiente inmutable que acumula **especies** (claves de fórmula con estado, como `H⁺(ac)`). Las sustancias aportan especies al añadirse. Los electrolitos fuertes escritos en las ecuaciones (`HCl(ac)`) se traducen a sus iones mediante alias. Las reacciones se emparejan por especies presentes, condiciones y orden de adición.
- **Disoluciones existentes:** el motor acuoso actual (`reactor.ts`) se usa sin cambios para el pH y el color de sus 18 disoluciones.

**Tech Stack:** TypeScript, Svelte 5 (solo el tipo `EducationLevel`), Vitest en el entorno Node, Node para el script de importación.

**Spec:** `docs/superpowers/specs/2026-11-07-motor-reacciones-selector-design.md` (hitos 1 y 2 de su §8). Datos de origen: `docs/research/catalogo-reacciones-por-nivel.md`.

Los hitos 3 a 6 (interfaz, mesa, efectos y EPP) tendrán sus propios planes. Este deja el motor probado y listo para conectarlo.

## Global Constraints

- Rama de trabajo `feat/motor-reacciones`, creada desde `main`. El árbol tiene cambios del usuario sin commit (`LabScene.svelte`, `ar_hand_mesh.ts`, `.agents/mcp_config.json`, `assets/blender/*`, `render_resources.ts`, `docs/render-performance.md`…). **Nunca `git add -A` ni `git add .`**: añadir solo los archivos de cada tarea. No modificar `LabScene.svelte` ni `HUD.svelte` en este plan.
- Commits en el estilo del repositorio (`feat: …`, `test: …`, en español), terminando con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Textos visibles en español. Niveles: `'primaria' | 'secundaria' | 'universidad'`.
- **No modificar** `crates/chemistry`, `numeric_engine.ts`, `numeric_reference.ts`, `reactor.ts` ni `catalog.ts`: el motor nuevo solo los consume (spec §6.4).
- Los 19 códigos de consecuencia son exactamente: `color`, `precipitado`, `gas-inocuo`, `gas-inflamable`, `gas-toxico`, `exotermica`, `endotermica`, `llama`, `llamarada`, `sobrepresion`, `explosion`, `salpicadura-corrosiva`, `humo`, `luz`, `cambio-fisico`, `polimero`, `electricidad`, `olor`, `sin-reaccion`.
- Ninguna reacción disponible en primaria puede producir `explosion`.
- Ningún dato del motor expone proporciones ni límites. `measurements.pressureKpa` es `null` salvo que todos los eventos del recipiente sean `buena` y `cuantitativo` (spec §6.3).
- Imports en `src/` con el alias `$lib/…`. En `tests/`, con rutas relativas (convención actual).
- Validación final: `npm test`, `npm run check` y `npm run build` sin errores. Los tests existentes siguen pasando.

## Review Focus

1. **Dosis inválidas o que superan la capacidad:** añadir más de lo que cabe (líquido > 240 mL), cantidades ≤ 0 o NaN lanza un error y no cambia el estado. Test en la tarea 7.
2. **Reacciones en cadena:** un producto que dispara otra reacción en la misma acción se resuelve en el mismo `apply`, con un tope de 10 pasadas para que un ciclo de datos no cuelgue la app. Test en la tarea 8.
3. **Nivel equivocado:** una sustancia de otro nivel lanza un error. Una fila de nivel superior nunca se dispara en un nivel inferior. Tests en las tareas 7 y 8.
4. **Abrir y cerrar:** cerrar sin gas no produce `sobrepresion`. Abrir libera los gases, y la presión vuelve a ser ambiental. Test en la tarea 9.
5. **Alternar condiciones una y otra vez:** encender y apagar la chispa no repite una reacción `≈` sin una adición nueva. Test en la tarea 8.

---

## Estructura de archivos

| Archivo | Responsabilidad |
| --- | --- |
| `src/lib/science/reactions/types.ts` | Tipos compartidos (tarea 1) |
| `src/lib/science/reactions/formula.ts` | Lectura de fórmulas y ecuaciones, balance, masa molar (tareas 1 y 2) |
| `src/lib/science/reactions/elements.ts` | 118 elementos con masa atómica (tarea 2) |
| `scripts/import-reaction-catalog.mjs` | Importador de las tablas del catálogo (tarea 3) |
| `src/lib/science/reactions/reaction_catalog.ts` | Datos de reacciones: generados una vez y luego curados (tareas 3 a 5) |
| `src/lib/science/reactions/element_pairs.ts` | Rejilla de pares (tarea 3) |
| `src/lib/science/reactions/substances.ts` | Sustancias, especies y alias (tareas 4 y 5) |
| `src/lib/science/reactions/catalog_index.ts` | Consultas por nivel, formas, pista de reactividad (tarea 6) |
| `src/lib/science/reactions/vessel.ts` | Recipiente, dosis y condiciones (tarea 7) |
| `src/lib/science/reactions/resolver.ts` | Emparejamiento y aplicación de reacciones (tarea 8) |
| `src/lib/science/reactions/thermo.ts` | Temperatura, presión y rotura (tarea 9) |
| `src/lib/science/reactions/engine.ts` | API `apply` / `preview`, puente acuoso, cobertura (tarea 10) |
| `src/lib/science/reactions/ppe.ts` | EPP frente a consecuencias (tarea 11) |
| `src/lib/interaction/lab_store.svelte.ts:8` | `EducationLevel` con universidad (tarea 12) |
| `tests/science/reactions/*.test.ts` | Tests de cada módulo |

---

### Task 1: Tipos y lectura de fórmulas y ecuaciones

**Files:**
- Create: `src/lib/science/reactions/types.ts`
- Create: `src/lib/science/reactions/formula.ts`
- Test: `tests/science/reactions/formula.test.ts`

**Interfaces:**
- Produces (en `types.ts`, exactamente así):

```ts
export type Level = 'primaria' | 'secundaria' | 'universidad';
export const LEVELS: readonly Level[] = ['primaria', 'secundaria', 'universidad'];
export type ConsequenceCode = 'color' | 'precipitado' | 'gas-inocuo' | 'gas-inflamable' | 'gas-toxico'
  | 'exotermica' | 'endotermica' | 'llama' | 'llamarada' | 'sobrepresion' | 'explosion'
  | 'salpicadura-corrosiva' | 'humo' | 'luz' | 'cambio-fisico' | 'polimero' | 'electricidad' | 'olor' | 'sin-reaccion';
export type MotorMode = 'cuantitativo' | 'cualitativo' | 'aviso';
export type MixQuality = 'buena' | 'mala' | 'neutra';
export type Intensity = 'baja' | 'media' | 'alta' | 'extrema';
export type Condition = 'closed' | 'heat' | 'spark' | 'uv' | 'waterDrop' | 'fumeHood' | 'blastShield';
export type ConfidenceLabel = 'calculado' | 'regla-documentada' | 'reconstruccion';
export type Phase = 's' | 'l' | 'g' | 'ac';
export type PairCode = 'E' | 'C' | 'X' | 'I' | 'A' | '·';
export type VesselKind = 'vaso' | 'crisol';
export type ElementFamily = 'alcalino' | 'alcalinoterreo' | 'transicion' | 'postransicion' | 'metaloide'
  | 'no-metal' | 'halogeno' | 'gas-noble' | 'lantanido' | 'actinido';
export interface ElementInfo { z: number; symbol: string; name: string; mass: number; group: number | null; period: number; family: ElementFamily; focus: boolean }
export type PpeItem = 'gafas' | 'guantes' | 'bata' | 'careta' | 'guantes-termicos' | 'pinzas';
export interface Substance {
  id: string; name: string; formula: string; elements: string[]; phase: Phase;
  kind: 'elemental' | 'ion-disuelto' | 'compuesto' | 'cotidiano';
  grade?: 'diluido' | 'concentrado';
  doseUnit: 'mL' | 'porcion';
  provides: Record<string, number>;   // clave de especie → mol por unidad de dosis (mL o porción)
  levels: Level[]; ghs: string[]; ppe: PpeItem[]; color: string;
  tab: 'tabla' | 'estante'; teacherDemoAt?: Level[]; legacyChemicalId?: string;
}
export interface SpeciesInfo { name: string; color?: string; gasColor?: string }
export interface ReactionEntry {
  id: string; origin: Level | 'matriz'; equation: string; approx: boolean;
  reactants: string[]; catalysts?: string[]; products: string[];
  types: string[]; consequences: ConsequenceCode[]; observable: string; ghs: string[];
  mix: MixQuality; levels: Level[]; ppeText: string; instruments: string; motor: MotorMode;
  requires: Condition[]; medium?: 'seco' | 'acuoso'; order?: { first: string; then: string };
  intensity?: Intensity; deltaHkJ?: number; executable: boolean; sources: string[]; pairCode?: PairCode;
}
```

- Produces (en `formula.ts`):
  - `interface Term { coef: number; species: string }`. `species` es la clave tal como aparece en la ecuación, con su estado: `'H₂O(l)'`, `'[Cu(NH₃)₄]²⁺(ac)'`.
  - `parseFormula(species: string): { atoms: Record<string, number>; charge: number }`. Acepta subíndices y superíndices Unicode, `( )` y `[ ]` anidados, hidratos con `·`, estados `(s)(l)(g)(ac)(aq)(sol)` y `e⁻`. Lanza un error ante caracteres desconocidos. Las claves de `atoms` van en orden de primera aparición.
  - `parseEquation(eq: string): { reactants: Term[]; products: Term[]; reversible: boolean }`. Una sola flecha `→` o `⇌`; ignora los términos `hν`, `luz`, `energía` y `calor`.
  - `checkBalance(eq: string): string | null`: `null` si cuadra; si no, los elementos descuadrados en orden alfabético y la carga al final, como `'Al: 1≠2; Fe: 2≠1'`. Si hay varias ecuaciones separadas por `;`, comprueba cada una y une los errores con `' | '`.

- [ ] **Step 1: Write the failing test** `tests/science/reactions/formula.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { parseFormula, parseEquation, checkBalance } from '../../../src/lib/science/reactions/formula';

describe('formula', () => {
  it('lee complejos, hidratos, cargas y electrones', () => {
    expect(parseFormula('[Cu(NH₃)₄]²⁺(ac)')).toEqual({ atoms: { Cu: 1, N: 4, H: 12 }, charge: 2 });
    expect(parseFormula('CuSO₄·5H₂O(s)')).toEqual({ atoms: { Cu: 1, S: 1, O: 9, H: 10 }, charge: 0 });
    expect(parseFormula('SO₄²⁻(ac)').charge).toBe(-2);
    expect(parseFormula('e⁻')).toEqual({ atoms: {}, charge: -1 });
    expect(() => parseFormula('C₈H₇N₃O₂%')).toThrow();
  });
  it('separa coeficientes y detecta reversibles', () => {
    const r = parseEquation('2 Na(s) + 2 H₂O(l) → 2 NaOH(ac) + H₂(g)');
    expect(r.reactants).toEqual([{ coef: 2, species: 'Na(s)' }, { coef: 2, species: 'H₂O(l)' }]);
    expect(r.products[1]).toEqual({ coef: 1, species: 'H₂(g)' });
    expect(parseEquation('H₂(g) + I₂(g) ⇌ 2 HI(g)').reversible).toBe(true);
  });
  it('verifica balance de átomos y carga', () => {
    expect(checkBalance('2 MnO₄⁻(ac) + 5 H₂O₂(ac) + 6 H⁺(ac) → 2 Mn²⁺(ac) + 5 O₂(g) + 8 H₂O(l)')).toBeNull();
    expect(checkBalance('Fe₂O₃(s) + Al(s) → Al₂O₃(s) + Fe(l)')).toBe('Al: 1≠2; Fe: 2≠1');
    expect(checkBalance('C₈H₇N₃O₂(ac) + 2 H₂O₂(ac) + 2 OH⁻(ac) → C₈H₅NO₄²⁻(ac) + N₂(g) + 4 H₂O(l) + hν')).toBeNull();
    expect(checkBalance('H₂O(l) → H₂O(g); 3 Fe(l) + 4 H₂O(g) → Fe₃O₄(s) + 4 H₂(g)')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails.** Run: `npx vitest run tests/science/reactions/formula.test.ts`. Expected: FAIL (no se encuentra el módulo).
- [ ] **Step 3: Create `types.ts` with the exact content above and implement `formula.ts`.** El lector es un descenso recursivo con pila para `(` y `[`.
- [ ] **Step 4: Run to verify it passes.** Expected: PASS (3 tests).
- [ ] **Step 5: Commit** the three files with `feat: tipos y lector de fórmulas del motor de reacciones`.

---

### Task 2: Elementos y masa molar

**Files:**
- Create: `src/lib/science/reactions/elements.ts`
- Modify: `src/lib/science/reactions/formula.ts` (añadir `molarMass`)
- Test: `tests/science/reactions/elements.test.ts`

**Interfaces:**
- Consumes: `ElementInfo` (tarea 1), `parseFormula` (tarea 1).
- Produces:
  - `ELEMENTS: readonly ElementInfo[]`: 118 entradas en orden de Z. `name` en español. `mass` = peso atómico estándar abreviado de CIAAW (para los elementos sin valor estándar, el número másico del isótopo más estable). `group` es `null` en La–Lu y Ac–Lr.
  - `focus` es `true` exactamente en `H C N O B Si P S Cl Br I Li Na K Mg Ca Al Fe Cu Zn Ag He Ne Ar`.
  - `elementBySymbol(symbol: string): ElementInfo`, que lanza un error si el símbolo no existe.
  - `molarMass(species: string): number`, en `formula.ts`, en g/mol.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { ELEMENTS, elementBySymbol } from '../../../src/lib/science/reactions/elements';
import { molarMass } from '../../../src/lib/science/reactions/formula';

describe('elementos', () => {
  it('tiene 118 elementos ordenados y 24 foco', () => {
    expect(ELEMENTS).toHaveLength(118);
    ELEMENTS.forEach((e, i) => expect(e.z).toBe(i + 1));
    expect(ELEMENTS.filter(e => e.focus).map(e => e.symbol).sort()).toEqual(
      ['Ag','Al','Ar','B','Br','C','Ca','Cl','Cu','Fe','H','He','I','K','Li','Mg','N','Na','Ne','O','P','S','Si','Zn']);
  });
  it('usa pesos atómicos estándar y la familia correcta', () => {
    expect(elementBySymbol('H').mass).toBeCloseTo(1.008, 3);
    expect(elementBySymbol('Cl').mass).toBeCloseTo(35.45, 2);
    expect(elementBySymbol('Na')).toMatchObject({ name: 'Sodio', group: 1, period: 3, family: 'alcalino' });
    expect(elementBySymbol('Br').family).toBe('halogeno');
    expect(elementBySymbol('La').group).toBeNull();
    expect(() => elementBySymbol('Xx')).toThrow();
  });
  it('calcula masas molares', () => {
    expect(molarMass('H₂O(l)')).toBeCloseTo(18.015, 2);
    expect(molarMass('CaCO₃(s)')).toBeCloseTo(100.087, 2);
    expect(molarMass('CuSO₄·5H₂O(s)')).toBeCloseTo(249.68, 1);
  });
});
```

- [ ] **Step 2: Run to verify it fails.** `npx vitest run tests/science/reactions/elements.test.ts`. Expected: FAIL.
- [ ] **Step 3: Create `elements.ts`; add `molarMass` to `formula.ts`** (suma de `atoms × masa`).
- [ ] **Step 4: Run to verify it passes.** Expected: PASS (3 tests).
- [ ] **Step 5: Commit** with `feat: tabla de 118 elementos y masa molar`.

---

### Task 3: Importador del catálogo y comprobaciones estructurales

**Files:**
- Create: `scripts/import-reaction-catalog.mjs`
- Create (generados): `src/lib/science/reactions/reaction_catalog.ts`, `src/lib/science/reactions/element_pairs.ts`
- Test: `tests/science/reactions/catalog_data.test.ts`

**Interfaces:**
- Consumes: `docs/research/catalogo-reacciones-por-nivel.md`. Contiene:
  - Filas de nivel con 11 columnas `| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |`, con ID `P\d+`, `S\d+` o `U\d+`.
  - Filas de matriz (§6.2) con 7 columnas `| ID | Ecuación | Par | Condición | Observable | Consecuencia | Nivel mín. |`, con ID `M\d+`.
  - La rejilla (§6.1).
  - La tabla de intensidades (§2.1).
- Produces:
  - `REACTIONS: ReactionEntry[]`.
  - `PAIR_GRID: Record<string, PairCode>`, con clave de símbolos ordenados alfabéticamente unidos por `|` (`'Na|O'`), solo para los pares distintos de `·`.
  - `pairCode(a: string, b: string): PairCode`, que devuelve `'·'` si no hay entrada.

Reglas del importador:

| Campo | Regla |
| --- | --- |
| `origin` | P → `primaria`, S → `secundaria`, U → `universidad`, M → `matriz` |
| `levels` | P → los 3 niveles; S → secundaria y universidad; U → universidad; M → desde «Nivel mín.» hacia arriba |
| `approx` | La ecuación empieza por `≈` o no tiene flecha |
| `reactants` / `products` | Especies de cada término de la ecuación si `!approx` (con `;`, solo la última ecuación); `[]` si `approx` |
| `consequences`, `ghs`, `types` | Separar por coma o `;`. GHS `—` → `[]` |
| `motor`, `mix`, `executable` (P/S/U) | De sus columnas; `executable = !approx` |
| `motor`, `mix`, `executable` (M) | X → `aviso`/`mala`/ejecutable; E y C → `cualitativo`/`buena`/ejecutable; I, A y `·` → `cualitativo`/`neutra`/no ejecutable |
| `sources` | URLs de los enlaces Markdown. M: `[]` |
| `intensity` | De la tabla §2.1; una celda con `M02, U27` asigna la intensidad a ambos ids |
| `requires` | `[]` (se cura después) |
| `pairCode` | Solo en las filas M, desde la rejilla |

El script escribe los dos `.ts` **solo si no existen**. Con `--force` los sobrescribe y avisa de que se perderá la curación.

- [ ] **Step 1: Write the failing test** `catalog_data.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { REACTIONS } from '../../../src/lib/science/reactions/reaction_catalog';
import { pairCode } from '../../../src/lib/science/reactions/element_pairs';
import { checkBalance } from '../../../src/lib/science/reactions/formula';

const CODES = ['color','precipitado','gas-inocuo','gas-inflamable','gas-toxico','exotermica','endotermica','llama','llamarada','sobrepresion','explosion','salpicadura-corrosiva','humo','luz','cambio-fisico','polimero','electricidad','olor','sin-reaccion'];

describe('catálogo de reacciones: estructura', () => {
  it('importa todas las filas con ids únicos', () => {
    expect(REACTIONS.filter(r => r.origin === 'primaria')).toHaveLength(39);
    expect(REACTIONS.filter(r => r.origin === 'secundaria')).toHaveLength(50);
    expect(REACTIONS.filter(r => r.origin === 'universidad')).toHaveLength(50);
    expect(REACTIONS.filter(r => r.origin === 'matriz')).toHaveLength(98);
    expect(new Set(REACTIONS.map(r => r.id)).size).toBe(REACTIONS.length);
  });
  it('toda ecuación no aproximada cuadra en átomos y carga', () => {
    const bad = REACTIONS.filter(r => !r.approx).map(r => [r.id, checkBalance(r.equation)]).filter(([, e]) => e);
    expect(bad).toEqual([]);
  });
  it('usa solo códigos válidos y respeta primaria', () => {
    for (const r of REACTIONS) for (const c of r.consequences) expect(CODES).toContain(c);
    expect(REACTIONS.filter(r => r.levels.includes('primaria') && r.consequences.includes('explosion'))).toEqual([]);
  });
  it('toda fila de nivel tiene fuente y las explosiones tienen intensidad', () => {
    expect(REACTIONS.filter(r => r.origin !== 'matriz' && r.sources.length === 0).map(r => r.id)).toEqual([]);
    expect(REACTIONS.filter(r => r.consequences.includes('explosion') && !r.intensity).map(r => r.id)).toEqual([]);
    expect(REACTIONS.find(r => r.id === 'S15')?.intensity).toBe('baja');
    expect(REACTIONS.find(r => r.id === 'U05')?.intensity).toBe('extrema');
  });
  it('lee la rejilla de pares', () => {
    expect(pairCode('Na', 'O')).toBe('E');
    expect(pairCode('O', 'Na')).toBe('E');
    expect(pairCode('K', 'Br')).toBe('X');
    expect(pairCode('He', 'Na')).toBe('·');
  });
});
```

- [ ] **Step 2: Run to verify it fails.** `npx vitest run tests/science/reactions/catalog_data.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement and run the importer.** `node scripts/import-reaction-catalog.mjs`. Expected: genera los dos archivos e imprime `P 39 · S 50 · U 50 · M 98`.
- [ ] **Step 4: Run to verify it passes.** Expected: PASS (5 tests).
- [ ] **Step 5: Commit** script, generated files and test with `feat: importador del catálogo de reacciones y datos generados`.

---

### Task 4: Sustancias, especies, alias y curación de primaria

**Files:**
- Create: `src/lib/science/reactions/substances.ts`
- Modify: `src/lib/science/reactions/reaction_catalog.ts` (filas P)
- Test: `tests/science/reactions/curation.test.ts`

**Interfaces:**
- Consumes: tipos (tarea 1), `REACTIONS` (tarea 3), `CHEMICALS` de `$lib/science/chemistry/catalog`.
- Produces:
  - `SUBSTANCES: Substance[]`.
  - `substanceById(id: string): Substance`, que lanza un error si no existe.
  - `LEGACY_IDS: string[]`: los 18 ids de `CHEMICALS`.
  - `WATER_MOL_PER_ML = 1 / 18.015`.
  - `SPECIES: Record<string, SpeciesInfo>`: nombre y color de las especies de productos. `gasColor` solo en `Cl₂(g)` `#c8d64b`, `NO₂(g)` `#8b3a0e`, `Br₂(g)` `#7a2a10` e `I₂(g)` `#6b2a8c`.
  - `SPECIES_ALIASES: Record<string, Record<string, number>>`: electrolitos fuertes en disolución → iones. Por ejemplo, `'HCl(ac)': { 'H⁺(ac)': 1, 'Cl⁻(ac)': 1 }`, `'NaOH(ac)': { 'Na⁺(ac)': 1, 'OH⁻(ac)': 1 }`, `'H₂SO₄(ac)': { 'H⁺(ac)': 2, 'SO₄²⁻(ac)': 1 }`, `'CuSO₄(ac)'`, `'AgNO₃(ac)'`, `'NaCl(ac)'`, `'KOH(ac)'`, `'CaCl₂(ac)'`…
  - `expandSpecies(species: string): Record<string, number>`: el alias, o `{ [species]: 1 }` si no tiene.

Reglas de curación (valen también para las tareas 5a y 5b):

1. **Las 18 disoluciones heredadas** son `Substance` con el mismo `id` y `legacyChemicalId`. `doseUnit: 'mL'`. `provides` en iones (o en la especie molecular, si es un electrolito débil) a `concentrationM / 1000` mol/mL. Por ejemplo, `hcl` → `{ 'H⁺(ac)': 1e-4, 'Cl⁻(ac)': 1e-4 }`; `acetic` → `{ 'CH₃COOH(ac)': 1e-4 }`.
2. **Los iones van siempre disociados en el inventario.** Las ecuaciones conservan la forma escrita (`HCl(ac)`), y el resolvedor las traduce con `expandSpecies`.
3. **Sólidos y metales:** `doseUnit: 'porcion'` de 0,5 g, con `provides` = `0.5 / molarMass` mol de su especie. La porción no se muestra.
4. **Concentración discreta:** sustancias distintas con `grade` (`h2so4-diluido`, `h2so4-concentrado`).
5. **Productos cotidianos:** `kind: 'cotidiano'`, `tab: 'estante'`. Fijados aquí: `vinegar` (vinagre, `{ 'CH₃COOH(ac)': 0.83e-3 }` por mL) y `bicarbonato-solido` (porción de NaHCO₃(s)). Pueden usar seudoespecies con prefijo `x:` (`'x:catalasa'`, `'x:antocianina'`, `'x:caseina'`).
6. **Filas `≈`:** se rellenan a mano `reactants` y `products` (especies reales o `x:`). `executable: true` si sus especies son aportables en su nivel.
7. **Condiciones:** llama, mechero o chispa → `spark`; calentar → `heat`; luz → `uv`; recipiente cerrado → `closed`; gota de agua → `waterDrop`. **Medio:** `medium: 'seco'` en las reacciones entre sólidos (Fe + S, termita, Al + I₂…).
8. **Montajes no soportados** (globo, fuente y electrodos, oscuridad): `executable: false`. Si varias filas solo se distinguen por el montaje, una queda ejecutable con la condición equivalente y las demás `executable: false`.
9. **ΔH:** `deltaHkJ` solo calculado con ΔH°f del NIST WebBook, con la URL añadida a `sources`. Si no, vacío.
10. **Ids fijos** que usan los tests posteriores: `vinegar`, `bicarbonato-solido`, `mg-cinta`, `na-metal`, `k-metal`, `cs-metal`, `h2so4-concentrado`, `br2-liquido`.

- [ ] **Step 1: Write the failing test** `curation.test.ts` (las tareas 5a y 5b amplían `CURATED`):

```ts
import { describe, it, expect } from 'vitest';
import { REACTIONS } from '../../../src/lib/science/reactions/reaction_catalog';
import { SUBSTANCES, substanceById, LEGACY_IDS, expandSpecies } from '../../../src/lib/science/reactions/substances';
import { CHEMICALS } from '../../../src/lib/science/chemistry/catalog';
import type { Level, ReactionEntry } from '../../../src/lib/science/reactions/types';

const CURATED: ReactionEntry['origin'][] = ['primaria'];
const AIR = ['O₂(g)', 'N₂(g)', 'H₂O(l)'];
const providable = (species: string, levels: Level[]) => Object.keys(expandSpecies(species)).every(sp =>
  AIR.includes(sp) || SUBSTANCES.some(s => s.provides[sp] && s.levels.some(l => levels.includes(l))));

describe('sustancias', () => {
  it('conserva los 18 ids del catálogo acuoso', () => {
    expect([...LEGACY_IDS].sort()).toEqual(CHEMICALS.map(c => c.id).sort());
    for (const id of LEGACY_IDS) expect(substanceById(id).legacyChemicalId).toBe(id);
  });
  it('ids únicos y toda sustancia con nivel', () => {
    expect(new Set(SUBSTANCES.map(s => s.id)).size).toBe(SUBSTANCES.length);
    expect(SUBSTANCES.filter(s => s.levels.length === 0)).toEqual([]);
  });
  it('alias de electrolitos fuertes', () => {
    expect(expandSpecies('HCl(ac)')).toEqual({ 'H⁺(ac)': 1, 'Cl⁻(ac)': 1 });
    expect(expandSpecies('Mg(s)')).toEqual({ 'Mg(s)': 1 });
  });
});
describe.each(CURATED)('curación %s', (origin) => {
  const rows = REACTIONS.filter(r => r.origin === origin);
  it('al menos el 80 % es ejecutable', () => {
    expect(rows.filter(r => r.executable).length / rows.length).toBeGreaterThanOrEqual(0.8);
  });
  it('toda fila ejecutable tiene reactivos aportables en su nivel', () => {
    const bad = rows.filter(r => r.executable && (r.reactants.length === 0 || !r.reactants.every(sp => providable(sp, r.levels))));
    expect(bad.map(r => r.id)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails.** `npx vitest run tests/science/reactions/curation.test.ts`. Expected: FAIL.
- [ ] **Step 3: Create `substances.ts` and curate the P rows** following rules 1–10.
- [ ] **Step 4: Run to verify it passes.** Run this test and `catalog_data.test.ts`. Expected: PASS ambos.
- [ ] **Step 5: Commit** with `feat: sustancias, alias de especies y curación de primaria`. En el cuerpo del mensaje, lista las filas P que quedan `executable: false`.

### Task 5a: Curación de secundaria

Igual que la tarea 4, con `CURATED = ['primaria', 'secundaria']`.
- Las formas concentradas solo tienen niveles secundaria y universidad.
- **S05** recibe `order: { first: 'h2so4-concentrado', then: 'water' }`. Los ids de `order` son **ids de sustancia**.
- Commit: `feat: curación de reacciones de secundaria`.

### Task 5b: Curación de universidad y matriz

Igual que la tarea 4, con `CURATED = ['primaria', 'secundaria', 'universidad', 'matriz']`.
- Las filas M con código X o con P₄ quedan `motor: 'aviso'`. Las I, A y `·` siguen sin ser ejecutables.
- Existen las sustancias elementales de la matriz: `Na(s)`, `Cl₂(g)`, `Br₂(l)`, `S(s)`, `P₄(s)`…
- Commit: `feat: curación de reacciones de universidad y matriz de elementos`.

---

### Task 6: Consultas del catálogo

**Files:**
- Create: `src/lib/science/reactions/catalog_index.ts`
- Test: `tests/science/reactions/catalog_index.test.ts`

**Interfaces:**
- Consumes: `REACTIONS`, `SUBSTANCES`, `expandSpecies`, `pairCode`.
- Produces:
  - `substancesForLevel(level: Level): Substance[]`
  - `formsOfElement(symbol: string, level: Level): { available: Substance[]; locked: { substance: Substance; unlocksAt: Level }[] }`. Las bloqueadas son las de niveles superiores, con el primer nivel que las contiene.
  - `reactionsForLevel(level: Level): ReactionEntry[]`: solo las `executable` cuyo `levels` incluye `level`.
  - `reactivityHint(substanceId: string, level: Level): Record<string, 'E' | 'C' | 'X'>`, por símbolo:
    - Sustancia `elemental`: `pairCode` con cada elemento foco, solo E/C/X.
    - Si no: recorre `reactionsForLevel(level)` cuyas especies expandidas comparten alguna con `provides` de la sustancia. Para cada otra especie reactiva aportada por una sustancia `elemental`, marca su elemento: `X` si la fila tiene `explosion` o `motor: 'aviso'`; `C` si `requires` no está vacío; `E` en otro caso.
    - Si dos filas marcan el mismo elemento, gana el rango mayor (`X` > `C` > `E`).
    - En primaria, las entradas `X` se omiten.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { formsOfElement, reactivityHint, reactionsForLevel, substancesForLevel } from '../../../src/lib/science/reactions/catalog_index';

describe('consultas del catálogo', () => {
  it('filtra por nivel', () => {
    expect(reactionsForLevel('primaria').every(r => r.levels.includes('primaria') && r.executable)).toBe(true);
    expect(reactionsForLevel('primaria').some(r => r.consequences.includes('explosion'))).toBe(false);
    expect(substancesForLevel('primaria').length).toBeLessThan(substancesForLevel('universidad').length);
  });
  it('separa formas disponibles y bloqueadas', () => {
    const na = formsOfElement('Na', 'secundaria');
    expect(na.available.some(s => s.id === 'salt')).toBe(true);
    expect(na.locked.every(l => l.unlocksAt === 'universidad')).toBe(true);
  });
  it('pista: elemental por pares; compuesto por filas reales', () => {
    expect(reactivityHint('na-metal', 'universidad').O).toBe('E');
    expect(reactivityHint('hcl', 'secundaria').Cl).toBeUndefined();   // HCl no es Cl₂
    expect(reactivityHint('hcl', 'secundaria').Mg).toBe('E');         // S13
    expect(Object.values(reactivityHint('bicarbonate', 'primaria'))).not.toContain('X');
  });
});
```

- [ ] **Step 2–4:** fail → implement → pass (3 tests). Run: `npx vitest run tests/science/reactions/catalog_index.test.ts`.
- [ ] **Step 5: Commit** with `feat: consultas por nivel, formas y pista de reactividad`.

---

### Task 7: Recipiente

**Files:**
- Create: `src/lib/science/reactions/vessel.ts`
- Test: `tests/science/reactions/vessel.test.ts`

**Interfaces:**
- Consumes: `substanceById`, `WATER_MOL_PER_ML`, tipos.
- Produces:

```ts
export const VESSEL_TOTAL_ML = 250;
export const VESSEL_MAX_LIQUID_ML = 240;
export const INITIAL_WATER_ML = 50;     // solo en 'vaso'
export const AMBIENT_C = 25;
export const HEAT_C = 80;
export interface VesselState {
  level: Level; kind: VesselKind;
  species: Record<string, number>;          // mol > 0; las claves que llegan a 0 se eliminan
  recentGas: Record<string, number>;        // gas producido en recipiente abierto; vive una acción
  liquidMl: number; temperatureC: number;
  conditions: Condition[];                  // incluye 'closed' si está tapado
  additions: { substanceId: string; amount: number }[];
  fired: Record<string, number>;            // id de reacción → índice de additions al dispararse
  airMol: number;                           // aire atrapado al tapar
  ruptured: boolean;
}
export function createVessel(level: Level, kind?: VesselKind): VesselState;
export function addSubstance(v: VesselState, substanceId: string, amount: number): VesselState;
export function setCondition(v: VesselState, c: Condition, on: boolean): VesselState;
```

Comportamiento:
- **`createVessel`:** `'vaso'` (por defecto) con 50 mL de agua, 25 °C y abierto; `'crisol'` seco.
- **`addSubstance`:**
  - Suma `provides × amount`.
  - Si `doseUnit === 'mL'` y `phase` es `'ac'` o `'l'`, suma `amount` a `liquidMl` y `amount × WATER_MOL_PER_ML` de `H₂O(l)`.
  - Añade la entrada a `additions`.
  - Lanza un error si la sustancia no está en `v.level`, si `amount` no es finito o es ≤ 0, o si el líquido supera `VESSEL_MAX_LIQUID_ML`.
- **`setCondition('closed', true)`:** `airMol = 101.325·Vlibre_L / (8.314·T_K)` con `Vlibre = VESSEL_TOTAL_ML − liquidMl`, y añade `O₂(g) = 0.21·airMol`.
- **`setCondition('closed', false)`:** elimina todas las especies `(g)` y pone `airMol = 0`.
- **`setCondition('heat', true)`:** `temperatureC = max(temperatureC, HEAT_C)`.
- Nunca muta la entrada.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { createVessel, addSubstance, setCondition } from '../../../src/lib/science/reactions/vessel';

describe('recipiente', () => {
  it('empieza con agua y es inmutable', () => {
    const v = createVessel('secundaria');
    expect(v.liquidMl).toBe(50);
    expect(v.species['H₂O(l)']).toBeCloseTo(50 / 18.015, 6);
    const w = addSubstance(v, 'hcl', 10);
    expect(v.liquidMl).toBe(50);
    expect(w.liquidMl).toBe(60);
    expect(w.species['H⁺(ac)']).toBeCloseTo(0.001, 9);
    expect(w.additions).toEqual([{ substanceId: 'hcl', amount: 10 }]);
  });
  it('el crisol empieza seco', () => {
    expect(createVessel('universidad', 'crisol').species).toEqual({});
  });
  it('rechaza capacidad, cantidades inválidas y otro nivel sin cambiar el estado', () => {
    const v = createVessel('primaria');
    expect(() => addSubstance(v, 'water', 191)).toThrow();
    expect(() => addSubstance(v, 'water', 0)).toThrow();
    expect(() => addSubstance(v, 'water', Number.NaN)).toThrow();
    expect(() => addSubstance(v, 'na-metal', 1)).toThrow();
    expect(v.additions).toEqual([]);
  });
  it('tapar atrapa aire con oxígeno y destapar libera gases', () => {
    const closed = setCondition(createVessel('secundaria'), 'closed', true);
    expect(closed.conditions).toContain('closed');
    expect(closed.airMol).toBeCloseTo(101.325 * 0.2 / (8.314 * 298.15), 4);
    expect(closed.species['O₂(g)']).toBeCloseTo(0.21 * closed.airMol, 6);
    const open = setCondition(closed, 'closed', false);
    expect(open.species['O₂(g)']).toBeUndefined();
    expect(open.airMol).toBe(0);
  });
});
```

- [ ] **Step 2–4:** fail → implement `vessel.ts` → pass (4 tests). Run: `npx vitest run tests/science/reactions/vessel.test.ts`.
- [ ] **Step 5: Commit** with `feat: recipiente del motor de reacciones`.

---

### Task 8: Resolución de reacciones

**Files:**
- Create: `src/lib/science/reactions/resolver.ts`
- Test: `tests/science/reactions/resolver.test.ts`

**Interfaces:**
- Consumes: `VesselState` (tarea 7), `reactionsForLevel` (tarea 6), `parseEquation` (tarea 1), `expandSpecies`, `substanceById` (tarea 4).
- Produces:

```ts
export const SEVERITY: ConsequenceCode[] = ['explosion','sobrepresion','llamarada','gas-toxico','salpicadura-corrosiva','llama',
  'gas-inflamable','exotermica','precipitado','gas-inocuo','humo','luz','color','endotermica','polimero','electricidad','olor','cambio-fisico','sin-reaccion'];
export const MAX_PASSES = 10;
export interface FiredReaction { entry: ReactionEntry; extent: number }   // mol de reacción; 0 en filas ≈
export function resolveReactions(v: VesselState, catalog?: ReactionEntry[]): { vessel: VesselState; fired: FiredReaction[] };
```

Algoritmo:
1. **Expansión.** Cada término de `reactants`, `catalysts` y `products` se traduce con `expandSpecies` (coeficiente × multiplicidad del alias).
2. **Disponibilidad.** Una especie está disponible si `species[sp] > 0`, si `recentGas[sp] > 0`, o si es `O₂(g)`/`N₂(g)` y el recipiente no está `closed` (aire ilimitado).
3. **Candidatas.** `catalog ?? reactionsForLevel(v.level)`, filtradas por:
   - todas las especies expandidas de los reactivos y catalizadores disponibles;
   - `requires ⊆ conditions`;
   - `medium: 'seco'` solo si `liquidMl === 0`;
   - si hay `order`, primer índice de `order.first` en `additions` menor que el de `order.then` (ambos deben existir).
4. **Duplicados.** Entre candidatas con el mismo conjunto de reactivos expandidos y los mismos `requires`, se conserva una: P/S/U gana a M, y entre P/S/U gana la de `origin` más alto que no supere `v.level`.
5. **Orden.** Por severidad (el índice más bajo en `SEVERITY` entre sus consecuencias). A igual severidad, gana la que tiene más reactivos más requisitos.
6. **Filas no aproximadas:**
   - `extent = min(n_disponible / coef)` sobre los reactivos. El aire abierto no limita. Los catalizadores no se consumen.
   - Se consume primero de `species` y después de `recentGas`.
   - Productos `(g)`: si el recipiente está abierto, a `recentGas`; si está cerrado, a `species`. Los demás productos van a `species`.
   - Se dispara si `extent > 1e-12`.
7. **Filas `≈`.** Se disparan si `fired[id]` es `undefined`, o si es menor que el índice de la última adición de una sustancia que aporte alguna especie de sus reactivos. Registran `fired[id] = additions.length - 1` y no consumen.
8. **Pasadas.** Se repiten los pasos 3 a 7 hasta que nada nuevo se dispare, con un máximo de `MAX_PASSES`.
9. **Gas reciente.** Las entradas de `recentGas` que ya existían antes de esta llamada se eliminan al final. Las producidas en esta llamada se conservan.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { resolveReactions, MAX_PASSES } from '../../../src/lib/science/reactions/resolver';
import { createVessel, addSubstance, setCondition } from '../../../src/lib/science/reactions/vessel';
import type { ReactionEntry } from '../../../src/lib/science/reactions/types';

const row = (o: Partial<ReactionEntry>): ReactionEntry => ({ id: 'T', origin: 'secundaria', equation: '', approx: false,
  reactants: [], products: [], types: [], consequences: ['color'], observable: '', ghs: [], mix: 'buena',
  levels: ['secundaria', 'universidad'], ppeText: '', instruments: '', motor: 'cualitativo', requires: [],
  executable: true, sources: ['x'], ...o });
const neutral = row({ id: 'N', equation: 'HCl(ac) + NaOH(ac) → NaCl(ac) + H₂O(l)',
  reactants: ['HCl(ac)', 'NaOH(ac)'], products: ['NaCl(ac)', 'H₂O(l)'], consequences: ['exotermica'] });
const base = () => addSubstance(addSubstance(createVessel('secundaria'), 'hcl', 10), 'naoh', 5);

describe('resolución', () => {
  it('traduce alias, consume con reactivo limitante e ignora espectadores', () => {
    const { vessel, fired } = resolveReactions(addSubstance(base(), 'salt', 5), [neutral]);
    expect(fired[0].extent).toBeCloseTo(5e-4, 9);
    expect(vessel.species['H⁺(ac)']).toBeCloseTo(5e-4, 9);
    expect(vessel.species['OH⁻(ac)']).toBeUndefined();
  });
  it('exige condiciones y orden de adición', () => {
    const spark = row({ ...neutral, id: 'K', requires: ['spark'] });
    expect(resolveReactions(base(), [spark]).fired).toEqual([]);
    expect(resolveReactions(setCondition(base(), 'spark', true), [spark]).fired).toHaveLength(1);
    const ordered = row({ ...neutral, id: 'O', order: { first: 'naoh', then: 'hcl' } });
    expect(resolveReactions(base(), [ordered]).fired).toEqual([]);
  });
  it('encadena y respeta el tope de pasadas ante un ciclo', () => {
    const loop = [row({ id: 'A', approx: true, reactants: ['H⁺(ac)'], products: ['x:b'] }),
                  row({ id: 'B', approx: true, reactants: ['x:b'], products: ['H⁺(ac)'] })];
    expect(() => resolveReactions(addSubstance(createVessel('secundaria'), 'hcl', 1), loop)).not.toThrow();
    expect(MAX_PASSES).toBe(10);
  });
  it('una fila ≈ no se repite al alternar condiciones sin nuevas adiciones', () => {
    const burn = row({ id: 'Q', approx: true, reactants: ['H⁺(ac)'], requires: ['spark'], consequences: ['llama'] });
    const r = resolveReactions(setCondition(addSubstance(createVessel('secundaria'), 'hcl', 5), 'spark', true), [burn]);
    expect(r.fired).toHaveLength(1);
    const toggled = setCondition(setCondition(r.vessel, 'spark', false), 'spark', true);
    expect(resolveReactions(toggled, [burn]).fired).toEqual([]);
  });
  it('aplica primero lo más severo y no dispara filas de otro nivel', () => {
    const mild = row({ ...neutral, id: 'M1', consequences: ['color'] });
    const severe = row({ ...neutral, id: 'M2', reactants: ['HCl(ac)', 'NaOH(ac)', 'Cl⁻(ac)'], consequences: ['salpicadura-corrosiva'] });
    expect(resolveReactions(base(), [mild, severe]).fired[0].entry.id).toBe('M2');
    expect(resolveReactions(base()).fired.every(f => f.entry.levels.includes('secundaria'))).toBe(true);
  });
});
```

- [ ] **Step 2–4:** fail → implement `resolver.ts` → pass (5 tests). Run: `npx vitest run tests/science/reactions/resolver.test.ts`.
- [ ] **Step 5: Commit** with `feat: resolución de reacciones con alias, reactivo limitante, condiciones y orden`.

---

### Task 9: Temperatura, presión y rotura

**Files:**
- Create: `src/lib/science/reactions/thermo.ts`
- Test: `tests/science/reactions/thermo.test.ts`

**Interfaces:**
- Consumes: `VesselState`, `setCondition` (tarea 7), `FiredReaction` (tarea 8).
- Produces:

```ts
export const QUAL_EXO_DT = 12; export const QUAL_ENDO_DT = -6; export const MAX_T_C = 100; export const MAX_T_CRUCIBLE_C = 1500;
export const ALERT_KPA = 130; export const RUPTURE_KPA = 180;
export type PressureZone = 'ambiente' | 'normal' | 'alerta' | 'rotura';
export function applyHeat(v: VesselState, fired: FiredReaction[]): { vessel: VesselState; deltaC: Record<string, number> };
export function pressureOf(v: VesselState): { kPa: number; zone: PressureZone };
export function checkRupture(v: VesselState): { vessel: VesselState; ruptured: boolean };
```

- **`applyHeat`:**
  - Con `deltaHkJ`: `ΔT = −deltaHkJ·1000·extent / (max(liquidMl, 1)·4.184)`.
  - Sin él: `QUAL_EXO_DT` si la fila incluye `exotermica`, `QUAL_ENDO_DT` si incluye `endotermica`, y 0 en otro caso.
  - Los ΔT se suman y la temperatura se limita a `[−10, MAX_T_C]` (`MAX_T_CRUCIBLE_C` en el crisol).
- **`pressureOf`:**
  - Abierto: `{ kPa: 101.325, zone: 'ambiente' }`.
  - Cerrado: `(airMol + Σ especies (g) salvo O₂(g))·8.314·T_K / Vlibre_L`.
  - Zonas: < `ALERT_KPA` → `normal`; < `RUPTURE_KPA` → `alerta`; si no, `rotura`.
- **`checkRupture`:** en `rotura`, devuelve `setCondition(v, 'closed', false)` con `ruptured: true`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { applyHeat, pressureOf, checkRupture, ALERT_KPA, RUPTURE_KPA } from '../../../src/lib/science/reactions/thermo';
import { createVessel, setCondition } from '../../../src/lib/science/reactions/vessel';

describe('termodinámica', () => {
  it('calienta con ΔH y de forma cualitativa sin él', () => {
    const v = createVessel('secundaria');
    const withDH = applyHeat(v, [{ entry: { id: 'A', deltaHkJ: -55.8, consequences: ['exotermica'] } as never, extent: 0.005 }]);
    expect(withDH.vessel.temperatureC).toBeCloseTo(25 + 55.8 * 1000 * 0.005 / (50 * 4.184), 3);
    expect(applyHeat(v, [{ entry: { id: 'B', consequences: ['exotermica'] } as never, extent: 0 }]).deltaC.B).toBe(12);
  });
  it('presión: abierto ambiente; cerrado sin gas normal; rotura abre', () => {
    expect(pressureOf(createVessel('secundaria')).zone).toBe('ambiente');
    const closed = setCondition(createVessel('secundaria'), 'closed', true);
    expect(pressureOf(closed).zone).toBe('normal');
    expect(checkRupture(closed).ruptured).toBe(false);
    const full = { ...closed, species: { ...closed.species, 'CO₂(g)': 0.02 } };
    expect(pressureOf(full).kPa).toBeGreaterThan(RUPTURE_KPA);
    const r = checkRupture(full);
    expect(r.ruptured).toBe(true);
    expect(pressureOf(r.vessel).zone).toBe('ambiente');
    expect(ALERT_KPA).toBeLessThan(RUPTURE_KPA);
  });
});
```

- [ ] **Step 2–4:** fail → implement → pass (2 tests). Run: `npx vitest run tests/science/reactions/thermo.test.ts`.
- [ ] **Step 5: Commit** with `feat: temperatura, presión por zonas y rotura del recipiente`.

---

### Task 10: API del motor, puente acuoso y cobertura

**Files:**
- Create: `src/lib/science/reactions/engine.ts`
- Test: `tests/science/reactions/engine.test.ts`

**Interfaces:**
- Consumes: tareas 6–9; `addDose`, `initialReactor` y `readReactor` de `$lib/science/chemistry/reactor`; `SPECIES`, `substanceById`.
- Produces:

```ts
export type VesselAction =
  | { type: 'add'; substanceId: string; amount: number }
  | { type: 'condition'; condition: Condition; on: boolean };
export interface ReactionEvent {
  rowId: string;                       // id del catálogo, o 'sistema:rotura'
  equation: string; observable: string; consequences: ConsequenceCode[];
  intensity?: Intensity; mix: MixQuality; motor: MotorMode; confidence: ConfidenceLabel;
  sources: string[]; ghs: string[]; ppeText: string; deltaC: number;
}
export interface ReactionOutcome {
  events: ReactionEvent[];
  measurements: {
    pH: number | null; temperatureC: number;
    pressureZone: PressureZone; pressureKpa: number | null;
    gases: { species: string; mol: number; color: string | null }[];
    precipitates: { species: string; color: string | null }[];
    liquidColor: string | null;
  };
  coverage: 'quantitative' | 'partial' | 'unknown';
  unknownPairs: [string, string][];
  limitations: string[];
}
export interface PendingRisk { rows: ReactionEntry[]; reconstruction: boolean }
export function apply(v: VesselState, action: VesselAction): { vessel: VesselState; outcome: ReactionOutcome };
export function preview(v: VesselState, action: VesselAction): PendingRisk | null;
```

Reglas:
- **`apply`:**
  1. Aplica la acción.
  2. Ejecuta `resolveReactions`, `applyHeat` y `checkRupture`.
  3. Si hay rotura, añade el evento `{ rowId: 'sistema:rotura', consequences: ['sobrepresion'], mix: 'mala', motor: 'cualitativo', confidence: 'regla-documentada', intensity: level === 'primaria' ? 'baja' : 'media' }`.
- **`confidence`:** `motor === 'aviso'` → `'reconstruccion'`; `motor === 'cuantitativo' && !approx` → `'calculado'`; si no, `'regla-documentada'`.
- **Puente acuoso:**
  - Se aplica si todas las sustancias añadidas tienen `legacyChemicalId` y `readReactor(estado reproducido con addDose desde initialReactor()).coverage === 'quantitative'`.
  - En ese caso, `pH`, `liquidColor` y `limitations` salen del reactor, y `coverage = 'quantitative'`.
  - Los eventos del catálogo se generan igual.
  - Si no se aplica, `pH = null` y `liquidColor = null`.
- **`coverage`:** `'unknown'` si hay `unknownPairs`; si no, `'quantitative'` con el puente; si no, `'partial'`.
- **`unknownPairs`:** pares (en orden de adición) de sustancias añadidas que cumplen todo esto:
  - ninguna de las dos es `water`, `salt` o `sugar`;
  - el puente acuoso no las cubre;
  - ninguna reacción disparada desde la creación del recipiente tiene especies de ambas.

  Si hay alguno, se añade a `limitations` el texto exacto `'Sin datos para esta combinación: no significa que sea segura.'`. Para el historial, `VesselState.fired` basta (las claves son los ids que se dispararon).
- **`pressureKpa`:** valor de `pressureOf` solo si la zona no es `ambiente` y todas las filas de `vessel.fired` son `mix: 'buena'` y `motor: 'cuantitativo'`. Si no, `null`.
- **`gases`:** las especies `(g)` de `species` y `recentGas`, sin O₂/N₂. `color = SPECIES[sp]?.gasColor ?? null`.
- **`precipitates`:** las especies `(s)` producidas por reacciones, con `SPECIES[sp]?.color ?? null`.
- **`preview`:** ejecuta `apply` sobre la entrada (que es inmutable) y devuelve las filas disparadas con `motor === 'aviso'` o `mix === 'mala'`, con `reconstruction` igual a «alguna es `aviso`». Devuelve `null` si no hay ninguna.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { apply, preview } from '../../../src/lib/science/reactions/engine';
import { createVessel } from '../../../src/lib/science/reactions/vessel';
import type { Level } from '../../../src/lib/science/reactions/types';

const run = (level: Level, steps: [string, number][]) => steps.reduce(
  (acc, [id, amount]) => apply(acc.vessel, { type: 'add', substanceId: id, amount }),
  { vessel: createVessel(level) } as ReturnType<typeof apply>);

describe('motor: API', () => {
  it('usa el reactor acuoso para las disoluciones heredadas', () => {
    const { outcome } = run('secundaria', [['hcl', 50], ['naoh', 50]]);
    expect(outcome.coverage).toBe('quantitative');
    expect(outcome.measurements.pH).toBeCloseTo(7, 4);
  });
  it('declara sin datos y no lo presenta como seguro', () => {
    const { outcome } = run('secundaria', [['starch', 5], ['copper', 5]]);
    expect(outcome.coverage).toBe('unknown');
    expect(outcome.unknownPairs).toContainEqual(['starch', 'copper']);
    expect(outcome.limitations).toContain('Sin datos para esta combinación: no significa que sea segura.');
  });
  it('preview avisa antes de una mala mezcla sin cambiar el estado', () => {
    const v = run('secundaria', [['bleach', 10]]).vessel;
    const p = preview(v, { type: 'add', substanceId: 'hcl', amount: 10 });
    expect(p?.rows.some(r => r.consequences.includes('gas-toxico'))).toBe(true);
    expect(v.additions).toHaveLength(1);
  });
});
```

- [ ] **Step 2–4:** fail → implement `engine.ts` → pass (3 tests). Then run `npx vitest run tests/science` to confirm `reactor.test.ts` and `numeric_engine.test.ts` still pass.
- [ ] **Step 5: Commit** with `feat: API del motor con puente acuoso, cobertura y aviso previo`.

---

### Task 11: Protección del EPP

**Files:**
- Create: `src/lib/science/reactions/ppe.ts`
- Test: `tests/science/reactions/ppe.test.ts`

**Interfaces:**
- Consumes: `ReactionEvent` (tarea 10), `Condition`, `Level`.
- Produces:

```ts
export interface PpeState { goggles: boolean; gloves: boolean; coat: boolean; faceShield: boolean; thermalGloves: boolean; tongs: boolean }
export type PpeRequirement = 'gafas' | 'guantes' | 'bata' | 'campana' | 'pantalla' | 'guantes-termicos-o-pinzas';
export const INTENSE_EXO_DT = 30;
export function ppeCheck(event: Pick<ReactionEvent, 'consequences' | 'deltaC'>, ppe: PpeState, conditions: Condition[], level: Level):
  { protected: boolean; missing: PpeRequirement[] };
```

Requisitos (spec §6.8):
- `salpicadura-corrosiva` → `gafas`, `guantes`.
- `gas-toxico` → `campana` (`fumeHood`).
- `explosion` y `llamarada` → `gafas`, `bata`, y en universidad también `pantalla` (`blastShield`).
- `exotermica` con `deltaC ≥ INTENSE_EXO_DT` → `guantes-termicos-o-pinzas`.

`missing` sin duplicados, en el orden `gafas, guantes, bata, campana, pantalla, guantes-termicos-o-pinzas`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { ppeCheck } from '../../../src/lib/science/reactions/ppe';
const none = { goggles: false, gloves: false, coat: false, faceShield: false, thermalGloves: false, tongs: false };

describe('EPP', () => {
  it('salpicadura exige gafas y guantes', () => {
    expect(ppeCheck({ consequences: ['salpicadura-corrosiva'], deltaC: 0 }, none, [], 'secundaria'))
      .toEqual({ protected: false, missing: ['gafas', 'guantes'] });
    expect(ppeCheck({ consequences: ['salpicadura-corrosiva'], deltaC: 0 }, { ...none, goggles: true, gloves: true }, [], 'secundaria').protected).toBe(true);
  });
  it('gas tóxico con campana; explosión en universidad pide pantalla', () => {
    expect(ppeCheck({ consequences: ['gas-toxico'], deltaC: 0 }, none, ['fumeHood'], 'secundaria').protected).toBe(true);
    const dressed = { ...none, goggles: true, coat: true };
    expect(ppeCheck({ consequences: ['explosion'], deltaC: 0 }, dressed, [], 'secundaria').protected).toBe(true);
    expect(ppeCheck({ consequences: ['explosion'], deltaC: 0 }, dressed, [], 'universidad').missing).toEqual(['pantalla']);
  });
  it('calor intenso pide guantes térmicos o pinzas', () => {
    expect(ppeCheck({ consequences: ['exotermica'], deltaC: 29 }, none, [], 'secundaria').protected).toBe(true);
    expect(ppeCheck({ consequences: ['exotermica'], deltaC: 30 }, none, [], 'secundaria').missing).toEqual(['guantes-termicos-o-pinzas']);
    expect(ppeCheck({ consequences: ['exotermica'], deltaC: 40 }, { ...none, tongs: true }, [], 'secundaria').protected).toBe(true);
  });
});
```

- [ ] **Step 2–4:** fail → implement → pass (3 tests). Run: `npx vitest run tests/science/reactions/ppe.test.ts`.
- [ ] **Step 5: Commit** with `feat: comprobación del EPP frente a consecuencias`.

---

### Task 12: Nivel universidad en el store

**Files:**
- Modify: `src/lib/interaction/lab_store.svelte.ts:8`
- Test: `tests/interaction/education_level.test.ts`

**Interfaces:**
- Produces: `export type EducationLevel = Level;` en `lab_store.svelte.ts`, importando `type Level` desde `$lib/science/reactions/types`, para que haya un único tipo.

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect } from 'vitest';
import { LabStore } from '../../src/lib/interaction/lab_store.svelte';

describe('nivel educativo', () => {
  it('acepta universidad', () => {
    const store = new LabStore();
    store.educationLevel = 'universidad';
    expect(store.educationLevel).toBe('universidad');
  });
});
```

- [ ] **Step 2: Verify the type error.** Run: `npm run check`. Expected: error de tipo (`'universidad'` no es asignable). Vitest no comprueba tipos.
- [ ] **Step 3: Change line 8** to `export type EducationLevel = Level;` with the import.
- [ ] **Step 4: Verify.** `npx vitest run tests/interaction` → PASS. `npm run check` → 0 errores.
- [ ] **Step 5: Commit** both files with `feat: nivel universidad en EducationLevel`.

---

### Task 13: Escenarios de la spec con el catálogo curado

**Files:**
- Test: `tests/science/reactions/scenarios.test.ts`

**Interfaces:**
- Consumes: `apply`, `preview` (tarea 10), `createVessel` (tarea 7), `substancesForLevel` (tarea 6), `ppeCheck` (tarea 11). Ids de sustancia de la regla 10 de la tarea 4.

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect } from 'vitest';
import { apply, preview } from '../../../src/lib/science/reactions/engine';
import { createVessel } from '../../../src/lib/science/reactions/vessel';
import { substancesForLevel } from '../../../src/lib/science/reactions/catalog_index';
import { ppeCheck } from '../../../src/lib/science/reactions/ppe';
import type { Condition, Level } from '../../../src/lib/science/reactions/types';

type R = ReturnType<typeof apply>;
const start = (level: Level, kind: 'vaso' | 'crisol' = 'vaso'): R => ({ vessel: createVessel(level, kind) } as R);
const add = (r: R, id: string, amount: number) => apply(r.vessel, { type: 'add', substanceId: id, amount });
const cond = (r: R, c: Condition, on = true) => apply(r.vessel, { type: 'condition', condition: c, on });
const none = { goggles: false, gloves: false, coat: false, faceShield: false, thermalGloves: false, tongs: false };

describe('escenarios de la spec §10', () => {
  it('primaria: bicarbonato + vinagre burbujea', () => {
    const r = add(add(start('primaria'), 'bicarbonato-solido', 2), 'vinegar', 15);
    expect(r.outcome.events.some(e => e.consequences.includes('gas-inocuo'))).toBe(true);
  });
  it('primaria: botella tapada revienta con intensidad baja', () => {
    const r = add(add(cond(start('primaria'), 'closed'), 'bicarbonato-solido', 2), 'vinegar', 15);
    const rupture = r.outcome.events.find(e => e.rowId === 'sistema:rotura');
    expect(rupture?.intensity).toBe('baja');
  });
  it('primaria: ninguna pareja de sustancias produce explosión, ni con chispa ni con calor', () => {
    const subs = substancesForLevel('primaria');
    for (const a of subs) for (const b of subs) {
      let r = cond(cond(start('primaria'), 'spark'), 'heat');
      r = add(r, a.id, a.doseUnit === 'mL' ? 10 : 1);
      r = add(r, b.id, b.doseUnit === 'mL' ? 10 : 1);
      expect(r.outcome.events.some(e => e.consequences.includes('explosion')), `${a.id}+${b.id}`).toBe(false);
    }
  });
  it('secundaria: Mg + HCl y luego chispa → «pop» S15 de intensidad baja', () => {
    const r = cond(add(add(start('secundaria'), 'mg-cinta', 1), 'hcl', 20), 'spark');
    const pop = r.outcome.events.find(e => e.rowId === 'S15');
    expect(pop?.consequences).toContain('explosion');
    expect(pop?.intensity).toBe('baja');
  });
  it('secundaria: lejía + ácido → gas tóxico; la campana protege', () => {
    const r = add(add(start('secundaria'), 'bleach', 10), 'hcl', 10);
    const toxic = r.outcome.events.find(e => e.consequences.includes('gas-toxico'))!;
    expect(ppeCheck(toxic, none, r.vessel.conditions, 'secundaria').missing).toContain('campana');
    expect(ppeCheck(toxic, none, ['fumeHood'], 'secundaria').protected).toBe(true);
  });
  it('secundaria: S05 depende del orden de adición', () => {
    const wrong = add(add(start('secundaria'), 'h2so4-concentrado', 1), 'water', 20);
    expect(wrong.outcome.events.some(e => e.rowId === 'S05')).toBe(true);
    const right = add(add(start('secundaria'), 'water', 20), 'h2so4-concentrado', 1);
    expect(right.outcome.events.some(e => e.rowId === 'S05')).toBe(false);
  });
  it('universidad: Na + agua → U02 con gas inflamable; Cs → aviso de reconstrucción', () => {
    const na = add(start('universidad'), 'na-metal', 1);
    const u02 = na.outcome.events.find(e => e.rowId === 'U02');
    expect(u02?.consequences).toContain('gas-inflamable');
    expect(preview(start('universidad').vessel, { type: 'add', substanceId: 'cs-metal', amount: 1 })?.reconstruction).toBe(true);
  });
  it('universidad: K + Br₂ (M54) se ejecuta como reconstrucción con explosión alta', () => {
    const withK = add(start('universidad', 'crisol'), 'k-metal', 1);
    expect(preview(withK.vessel, { type: 'add', substanceId: 'br2-liquido', amount: 1 })?.reconstruction).toBe(true);
    const r = add(withK, 'br2-liquido', 1);
    const m54 = r.outcome.events.find(e => e.rowId === 'M54');
    expect(m54?.confidence).toBe('reconstruccion');
    expect(m54?.intensity).toBe('alta');
  });
  it('no muestra cifras de presión tras una mala mezcla en recipiente cerrado', () => {
    const r = add(add(cond(start('secundaria'), 'closed'), 'bleach', 10), 'hcl', 10);
    expect(r.outcome.measurements.pressureKpa).toBeNull();
  });
});
```

- [ ] **Step 2: Run.** `npx vitest run tests/science/reactions/scenarios.test.ts`. Si un escenario falla, la causa está en la curación (reactivos, `requires`, `medium`, `order` o `levels` de la fila): se corrige en `reaction_catalog.ts` o `substances.ts`, no se debilita el test.
- [ ] **Step 3: Full verification.** Run: `npm test && npm run check && npm run build`. Expected: todo en verde.
- [ ] **Step 4: Commit** the test (and any curation fixes) with `test: escenarios del motor de reacciones según la spec`.
