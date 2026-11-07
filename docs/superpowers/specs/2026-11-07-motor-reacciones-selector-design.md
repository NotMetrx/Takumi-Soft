# Diseño — Proyecto 2: laboratorio abierto con motor de reacciones, efectos y selector de tabla periódica

Fecha: 2026-11-07. Parte de la hoja de ruta de SymbioLab (proyecto 2 de 5). Base de contenido: [catálogo de reacciones por nivel](../../research/catalogo-reacciones-por-nivel.md) (en adelante, «el catálogo»).

## 1. Intención

El usuario quiere que los alumnos **sientan la química real**: que puedan elegir elementos y sustancias con libertad, mezclarlos y ver las consecuencias reales. Las malas mezclas tienen que verse: gas tóxico, calor, fuego, salpicadura, recipiente que revienta y, solo cuando el fenómeno real lo es, explosión. Las buenas mezclas también: colores, precipitados, luz, burbujas.

Hoy el laboratorio no puede hacerlo:
- El modo inmersivo (primera persona, manos, vestidor de EPP, HUD) solo ofrece experimentos guiados de ácido-base (`calculateStrongAcidBase`).
- El panel de exploración libre (`ExplorationWorkspace` + `reactor.ts`) cubre 18 disoluciones acuosas con dos frascos fijos, y desde el commit 063fb7d ya no tiene botón de entrada.
- No hay elementos, sólidos, metales ni gases distintos del CO₂.
- No hay condiciones como calor, chispa o luz.
- No hay fuego ni explosiones.

El catálogo define 139 reacciones (39 de primaria, 50 de secundaria y 50 de universidad), 98 pares de elementos y una taxonomía de consecuencias con su representación visual. Este proyecto convierte ese catálogo en un **laboratorio abierto jugable dentro del modo inmersivo**.

## 2. Objetivos

1. **Modo «Laboratorio abierto»** dentro del modo inmersivo, junto a los experimentos guiados.
2. **Selector de tabla periódica** en ventana a pantalla completa (opción A, elegida por el usuario). Se elige un elemento, luego una de sus **formas químicas**, y se filtra por nivel.
3. **Motor de reacciones basado en datos**: cada combinación de sustancias y condiciones se resuelve buscando en el catálogo. Si no hay datos, el resultado es «sin datos», nunca «seguro».
4. **Efectos 3D y sonido** para cada código de consecuencia del catálogo (§2), con intensidad para las explosiones (§2.1).
5. **Mesa con 4 frascos** y **condiciones como herramientas**.
6. **Consecuencias sobre el alumno según su EPP** (efecto simple).
7. **Nivel universidad**, y el nivel elegido al entrar, con bloqueo docente por PIN.

## 3. No objetivos (quedan para otros proyectos)

- Escenas de laboratorio distintas por nivel, inventarios ampliados y ambientación: proyecto 3. Aquí el nivel solo filtra sustancias y reacciones sobre la escena actual.
- Aula virtual, red y docente en línea: proyecto 4.
- Asistente IA y misiones guiadas: proyecto 5. Las actividades de exploración que se retiran (§6.10) quedan como material para esas misiones.
- Sistema de salud o exposición acumulada.
- Cinética real, CFD de llamas, transición deflagración-detonación.
- Cambiar los experimentos guiados existentes (presets de `lab_store` con `calculateStrongAcidBase`).
- Cambios en el núcleo Rust/WASM (§6.4).
- Infraestructura de tests de componentes (jsdom o testing-library).
- Nuevas mallas 3D de EPP en el vestidor (careta, pantalla, guantes térmicos): proyecto 3. Aquí son interruptores del panel de EPP (§6.8).

## 4. Anti-objetivos (un fracaso aunque «funcione»)

- Mostrar una **explosión donde la química real no la produce**, o el mismo efecto para todas las malas mezclas.
- Que la interfaz revele **proporciones, cantidades óptimas, límites de inflamabilidad, presiones de rotura o tiempos** de reacciones peligrosas (§8.5 del catálogo).
- Presentar una combinación desconocida como segura.
- Colorear un gas que en la realidad es incoloro (CO, H₂S, cloraminas, HCl…).
- Bajar los FPS en equipos de gama baja (`docs/render-performance.md`).
- Que un laboratorio de primaria muestre explosiones, o que un niño salte a universidad sin permiso cuando el nivel está bloqueado.
- Romper los experimentos guiados existentes.

## 5. Decisiones tomadas con el usuario

| Tema | Decisión |
| --- | --- |
| Dónde vive el laboratorio abierto | **Dentro del modo inmersivo**: primera persona, manos, EPP real del vestidor y efectos en la mesa. El panel de exploración actual se retira (§6.10) |
| Dónde vive la tabla periódica | **Ventana a pantalla completa** con la escena oscurecida detrás |
| Flujo del alumno | El de la maqueta aprobada (§7) |
| Mezclas marcadas `aviso` (alto riesgo) | **Se permiten tras confirmar el aviso**. Se muestran como **reconstrucción didáctica**, seguidas de un análisis. En primaria, versión suave |
| EPP | **Efecto simple**: sin el EPP adecuado, destello rojo, visión borrosa, sobresalto, tos y registro en el cuaderno. Con el EPP correcto, «el EPP te protegió». Sin barra de salud |
| Nivel | **Se elige al entrar al laboratorio abierto**. En Ajustes, el docente puede **bloquearlo con un PIN** |
| Niveles | Genéricos e internacionales: primaria, secundaria, universidad |

## 6. Cómo se construye

### 6.1 Punto de partida reutilizable

| Pieza existente | Dónde | Uso |
| --- | --- | --- |
| Diálogo nativo `<dialog>` + `showModal()` con trampa de foco y Escape | `ExplorationWorkspace.svelte:71-76,210`, estilos `.explore-dialog` y `.catalog-dialog` en `exploration-workspace.css` | Base del selector. Es el único patrón del repositorio con trampa de foco real |
| Bandera que bloquea la primera persona mientras hay un modal | `labStore.isCatalogOpen` → `isAnyModalBlockingFirstPerson` (`lab_store.svelte.ts:1927-1937`) | El selector debe activarla |
| Aviso previo con confirmación | `pendingSafety` / `allow()` / `acknowledge()` en `src/lib/exploration/exploration_store.svelte.ts:28,70-76`; `safetyDialog` en `ExplorationWorkspace.svelte:215-220` | Se traslada al HUD y se amplía con el EPP que falta |
| Panel de resultados | Pestaña Resultados de `ExplorationWorkspace.svelte:177-182` | Su contenido pasa a un panel del HUD |
| Nivel educativo | `EducationLevel` (`lab_store.svelte.ts:8`), `labStore.educationLevel` (`:1745`), botones en `HUD.svelte:191-205` | Añadir `'universidad'`. El nivel del laboratorio abierto es independiente del de los presets |
| EPP | `safetyCoatEquipped`, `safetyGogglesEquipped`, `safetyGlovesType`, `safetyStrictMode`, `verifySafetyEquipmentForChemistry()` (`lab_store.svelte.ts:1796-2410`); panel EPP en `HUD.svelte:397-490`; superposición de gafas «EN 166» en `HUD.svelte:566-578` | Aviso previo y consecuencias. La superposición de lente ya existe |
| Aviso flotante | `labStore.safetyAlert` / `setSafetyAlert()`, dibujado en `HUD.svelte:495-560` | Mensajes como «el EPP te protegió» y «sin datos» |
| Transición de color del líquido | `targetLiquidColor` + lerp en `LabScene.svelte:3970` | El código `color` |
| Burbujas, sedimento y tapa | `LabScene.svelte:3518-3545`, `3927-3957` | Base de `gas-*`, `precipitado` y `sobrepresion` |
| Shader de llama | `benzene_invisible_fire`, `LabScene.svelte:2499-2547` | Plantilla de `llama` con color por elemento |
| Contadores `*Revision` que disparan efectos | Declarados en `lab_store.svelte.ts:1742-1807`, observados por `$effect` en `LabScene.svelte:454-473` | Patrón para la cola de eventos de reacción |
| Sonido sintetizado | `src/lib/audio/lab_sound.ts` (`playGasDischarge`, `playWaterStream`) | Base de los sonidos nuevos |
| Manos y cámara en primera persona | `FirstPersonController.triggerHandGesture` (`first_person_controller.ts:520`); altura de la cámara en `:1523` | Sobresalto y sacudida de cámara |
| Liberación de recursos | `disposeOwnedResources` (`render_resources.ts:19`) | Todo efecto nuevo se cuelga de la escena |
| Motor acuoso cuantitativo | `reactor.ts`, `numeric_engine.ts` (Rust/WASM con respaldo en TypeScript) | Subsistema de pH, CO₂ y precipitados para sus 18 disoluciones |
| Etiquetas de honestidad | `coverage`, `limitations` y `source` en `ReactorResult` | Se conservan |

### 6.2 Datos (TypeScript versionado)

Un módulo nuevo `src/lib/science/reactions/` con:

- **`elements.ts`**: los 118 elementos (Z, símbolo, nombre en español, grupo, periodo, familia). Los 24 elementos foco son experimentables; los demás, solo de consulta.
- **`substances.ts`**: sustancias y formas químicas (`id`, nombre, fórmula, elementos, fase, tipo de forma, niveles, GHS, EPP, color, masa molar, pestaña —tabla o estante—).
  - **La concentración es discreta**: «diluido» y «concentrado» son formas distintas, cada una con su nivel y peligro (S05, S43, U34, P20).
  - Las 18 disoluciones de `catalog.ts` conservan su `id`.
- **`reaction_catalog.ts`**: una entrada por fila P/S/U y por fila M con código E, C o X. Campos de la §8.8 del catálogo.
- **`element_pairs.ts`**: la rejilla de la §6 del catálogo.

**El hito de datos es una curación química, no una importación automática.** Las tablas del catálogo tienen ecuación, consecuencias, observable, GHS, mezcla, EPP, instrumentos, motor y fuente. Pero no tienen condiciones, ΔH ni niveles en columnas: el nivel sale de la sección, y la condición de las filas M está en texto libre. Por eso:

1. Un script (`scripts/import-reaction-catalog.mjs`) importa lo que sí está en columnas.
2. El constructor completa a mano, fila por fila:
   - **condiciones**, a partir del observable y la condición;
   - **ΔH**, solo donde haya un ΔH°f tabulado en el [NIST WebBook](https://webbook.nist.gov/chemistry/); si no, queda vacío y el motor usa el incremento cualitativo;
   - **intensidad**, de la §2.1 del catálogo.
3. Después, el TypeScript es la fuente de verdad.

**Montajes que las herramientas no cubren** (globo, vela, astilla, tubo frente a botella, fuente y electrodos, oscuridad):
- Las filas que solo se distinguen por el montaje se fusionan cuando el montaje es un detalle de presentación. Por ejemplo, P01/P04/P05/P06: la botella tapada pasa a ser la condición «tapar».
- Las que necesitan un montaje no soportado se marcan como **solo consulta**: se ven en la ficha y en el panel, pero no se ejecutan.
- El objetivo es que al menos el 80 % de las filas de cada nivel sean ejecutables. La lista de filas solo de consulta se entrega con el hito.

**Tests de datos.** El comprobador de balance se **escribe desde cero** en `tests/science/` (el de la investigación no está en el repositorio). Comprueba:
- átomos y carga de cada ecuación no esquemática;
- códigos válidos;
- ninguna `explosion` en primaria;
- toda fila con fuente;
- toda sustancia citada existe.

La revisión de un especialista se recomienda (catálogo §9), pero no bloquea la entrega.

### 6.3 Motor

**Arquitectura: recipiente que acumula especies** (no búsqueda por pares).

- **Estado del recipiente** (inmutable): inventario de especies (mol, fase), **orden de adición** (para filas como S05: agua sobre ácido frente a ácido sobre agua), volumen líquido, temperatura, presión, si está tapado, condiciones activas y reacciones ya ocurridas.
- **Dosis.** Los líquidos se añaden en mL. Los sólidos y metales, en **porciones** con masa nominal interna. Los gases solo aparecen como productos, o como botellas del estante en universidad.
- **Resolución.** Tras cada dosis o cambio de condición, se buscan las filas ejecutables del nivel cuyos reactivos estén presentes (por identidad y forma) y cuyas condiciones y orden se cumplan:
  1. Se aplican primero las de mayor severidad y, a igual severidad, la más específica.
  2. Se consume según la ecuación, con reactivo limitante (las filas `≈` no consumen de forma cuantitativa).
  3. Se añaden los productos y se recalcula.
  4. Los espectadores no impiden que una fila se dispare.
  5. Si hay especies reactivas sin ninguna fila que las cubra, el resultado incluye **«sin datos»** con un aviso.
- **Subsistema acuoso.** Si todas las especies disueltas pertenecen al conjunto de `readReactor`, el pH, el CO₂, los precipitados y la neutralización salen del motor actual (WASM con respaldo en TypeScript), sin tocarlo.
- **Temperatura.** Con ΔH: ΔT adiabática estimada. Sin ΔH: un incremento cualitativo según el código. La herramienta «calentar» conecta `labStore.setTemperature` con el recipiente.
- **Presión y cifras.** Gas ideal con todos los gases producidos en el recipiente tapado. `sobrepresion` salta al superar la resistencia interna del recipiente.
  - Siguiendo la §8.5 del catálogo, las filas `buena` con motor `cuantitativo` muestran cifras: kPa, mL de gas y g de precipitado, como hoy.
  - En las peligrosas, el manómetro se muestra por zonas (normal, alerta, rotura), sin cifras.
  - La **pausa didáctica a 150 kPa** del reactor actual se sustituye por la consecuencia real: la tapa salta. En primaria es un «pop» amable.
- **Explosión.** Solo si la fila la declara, o por la regla de mezcla gaseosa (§8.3 del catálogo), con límites internos que nunca se muestran.
- **Filas `aviso` y filas M con código X o con fósforo.** Pasan por el aviso previo. Tras confirmar se ejecutan como **reconstrucción didáctica**, coherente con la decisión del usuario. Esto sustituye la regla «X → solo consulta» de la §6 del catálogo, que se actualiza.
- **Salida: `ReactionOutcome`.** Lista de `ReactionEvent` (fila, consecuencias, intensidad, observable, ecuación, explicación, etiqueta de confianza, fuentes, peligros, EPP implicado) más el estado medible para los instrumentos. Se conservan `coverage` y `limitations`.
- **Nivel.** Las filas y sustancias de otro nivel no existen en ese laboratorio. Primaria nunca recibe `explosion`.

### 6.4 Por qué no se toca Rust/WASM

El ABI v1 tiene 9 exportaciones fijas y un test de paridad TypeScript↔WASM campo a campo. Lo nuevo es búsqueda en datos y reglas, no cálculo numérico pesado. El cálculo acuoso existente se reutiliza tal cual.

### 6.5 Selector (ventana a pantalla completa)

- Diálogo nativo a pantalla completa (variante de `.catalog-dialog`, con sus estilos movidos a un CSS propio del selector). Activa `labStore.isCatalogOpen`. Ratón, táctil y teclado: flechas, Enter, Escape.
- Pestañas `role="tablist"`: **Tabla periódica** (118 elementos, colores por familia, lo que el nivel no tiene queda atenuado), **Estante** y **Recientes**. Búsqueda por nombre, símbolo o fórmula.
- Al elegir un elemento se muestran sus formas en el nivel actual, con GHS, EPP, nivel y «demo del docente». Las bloqueadas indican en qué nivel se desbloquean.
- **Pista de reactividad.** La referencia es el **frasco seleccionado** en la mesa:
  - Si contiene una sustancia elemental, se usa la rejilla de pares.
  - Si contiene un compuesto, se marcan los elementos que aparecen como reactivos en filas P/S/U junto a ese compuesto, en su forma real (nunca se marca «Cl» por tener HCl).
  - E en verde, C en ámbar, X en rojo. Primaria nunca ve X.
  - Se puede desactivar. El docente la controlará en el proyecto 4.
- Se abre desde el «+» de cada ranura en la mesa 3D y desde el HUD del laboratorio abierto.

### 6.6 Laboratorio abierto, nivel, 4 frascos y condiciones

- **Entrada.** El HUD ofrece «Experimentos guiados» (lo actual) y «Laboratorio abierto». Al entrar en el abierto se elige el nivel, salvo que esté bloqueado.
- **Bloqueo de nivel.** En `SettingsModal.svelte` hay una pestaña nueva, «Docente», con un PIN de 4 dígitos para fijar el nivel. Se guarda en almacenamiento local y es una protección escolar, no criptográfica. Con el nivel bloqueado, el alumno no puede cambiarlo.
- **Nivel independiente.** El nivel del laboratorio abierto no cambia el de los presets: cargar un preset sigue usando su propio nivel.
- **Ranuras.** En el laboratorio abierto, los frascos pasan de los ids fijos `'hcl' | 'naoh'` a **ranuras genéricas** `s1…s4`. Afecta a:
  - `LabScene.svelte`: los rigs `Record<'hcl'|'naoh', FlaskRig>` (`:96`), los ids arrastrados (`:205-215`), las etiquetas (`:2985`) y `reagents[0]`/`[1]` (`:3478-3490`);
  - `HUD.svelte:319-345`;
  - `lab_store`: `pour`, `triggerAnimatedPour` y el chequeo de EPP, hoy limitado a hcl/naoh.

  Los **experimentos guiados siguen con sus dos frascos**.
- **Persistencia.** La sesión del laboratorio abierto se guarda con un esquema nuevo. Las sesiones de exploración antiguas se descartan con un aviso (`App.svelte:38` deja de llamar a `enterExploration`).
- **Barra de condiciones:**
  - Verter.
  - Tapar.
  - Calentar (placa).
  - Chispa (mechero o encendedor; también la «astilla encendida» de las pruebas de gas).
  - Luz UV.
  - Gota de agua.
  - Campana (mitiga `gas-toxico`).
  - Pantalla de seguridad (solo universidad).

  Cada condición cambia el estado y vuelve a resolver. El orden de adición lo registra el propio vertido.
- **Modo estricto.** `safetyStrictMode` se conserva como opción docente. Si está activo, el EPP incompleto **bloquea** la mezcla, como hoy. Por defecto está desactivado y el aviso no bloquea.

### 6.7 Efectos 3D y sonido

- **Emisor genérico con pool** (`src/lib/lab3d/reaction_fx.ts`): partículas preasignadas con color, transparencia, tamaño y vida propios, y sprite suave. Zero-GC. Interfaz: `update(dt, { quality, reducedMotion })`. `lowTier`, `adaptiveOptimizationActive` e `isReducedMotion`, hoy locales de `onMount`, se pasan como parámetro.
- **Un efecto por código de consecuencia** (§2 del catálogo):
  - `llama`: shader generalizado con color de emisión por elemento.
  - `explosion`: destello de luz y CSS, anillo de onda, restos, sacudida de cámara (offset tras `fpController.update()`) y sonido. Escala según la intensidad.
  - `sobrepresion`: la tapa salta; en rotura, fragmentos.
  - `gas-toxico`: nube coloreada solo si el gas tiene color real; si no, alarma del sensor.
  - `precipitado`: partículas que caen con el color real (sustituye al disco estático).
  - Además: humo, espuma, vapor (fusionando los dos sistemas duplicados), escarcha, salpicadura, luz, polímero y cambio físico.
- **Sin post-procesado ni bloom.** En gama baja y modo adaptativo se reducen las partículas. Con movimiento reducido, sin sacudida ni destellos.
- **Sonido sintetizado** con intensidad: explosión, fuego, burbujeo, tapón, vidrio, tos.
- **Correcciones incluidas**, porque se tocan los mismos archivos:
  - Puntos de reaparición de las partículas en `safety_fx_particles.ts:216-296`.
  - `playBookClose`, que se salta el volumen maestro (`lab_sound.ts:156`).

### 6.8 Consecuencias sobre el alumno según el EPP

| Consecuencia | Protege |
| --- | --- |
| `salpicadura-corrosiva` | Gafas + guantes |
| `gas-toxico` | Condición «campana» activa |
| `explosion`, `llamarada` | Gafas + bata; en universidad, también la condición «pantalla de seguridad» |
| `exotermica` intensa | Guantes térmicos o pinzas |

- Los guantes térmicos, las pinzas y la careta se añaden como **interruptores del panel de EPP** (`HUD.svelte:397-490`) y como estado en `labStore`. Sus mallas 3D en el vestidor quedan para el proyecto 3. Los guantes térmicos no cambian `safetyGlovesType`: son un estado aparte.
- **Sin el EPP**: destello rojo, desenfoque unos segundos, `triggerHandGesture` de sobresalto, tos si es gas y una entrada en el cuaderno.
- **Con el EPP**: el efecto se ve igual y aparece «el EPP te protegió». Si era una salpicadura, las gotas quedan visibles un momento sobre la lente de las gafas, en vez del destello rojo.
- En primaria todo es más suave. No hay salud acumulada. La superposición de gafas existente (`HUD.svelte:566-578`) se reutiliza tal cual.

### 6.9 Explicación posterior

Es un panel nuevo del HUD, que reutiliza el contenido de la pestaña Resultados de exploración. Para cada `ReactionEvent` muestra:
- qué pasó (observable y ecuación);
- por qué;
- la etiqueta de confianza;
- cómo evitarlo, en las malas mezclas;
- las fuentes.

Se abre solo en las reconstrucciones `aviso`. También están el «sin datos» y los límites del modelo.

### 6.10 Retiro del panel de exploración

`ExplorationWorkspace.svelte`, `ExperimentGuide.svelte` y `src/lib/exploration/guides.ts` no tienen entrada desde la interfaz desde el commit 063fb7d.

Se retiran cuando el laboratorio abierto los sustituya, en el hito 3:
- Su lógica útil se traslada: el aviso previo, la sesión y el panel de resultados.
- Las 5 actividades guiadas de `guides.ts` se documentan como material para las misiones del proyecto 5.
- Se eliminan o adaptan sus tests (`tests/interaction/exploration.test.ts` y `guides.test.ts`).
- `reactor.ts` y `numeric_engine.ts` **se conservan**: son el subsistema acuoso.

## 7. Flujo del alumno (maqueta aprobada)

1. Entra en «Laboratorio abierto». Elige el nivel, salvo que esté bloqueado.
2. Toca un «+» en una de las 4 ranuras de la mesa → selector a pantalla completa.
3. Elige un elemento (con la pista de reactividad) y una forma → vuelve a la mesa con el frasco cargado.
4. Usa las herramientas: verter, tapar, calentar, chispa, UV, gota, campana.
5. Si la mezcla es de riesgo: aviso con el EPP que falta → confirma (o queda bloqueada en modo estricto).
6. Ve el efecto en 3D y lo oye. Los instrumentos reaccionan. Si le faltaba EPP, nota la consecuencia.
7. Panel: qué pasó, por qué y cómo evitarlo.

## 8. Orden de construcción (cada hito se puede entregar por separado)

1. **Datos**: curación de elementos, sustancias, catálogo y pares, con importador y tests de datos.
2. **Motor**: recipiente, resolución, subsistema acuoso, temperatura, presión y `ReactionOutcome`. Nivel `universidad` en `EducationLevel`. Tests de lógica en Node.
3. **Laboratorio abierto + selector**: entrada en el HUD, nivel al entrar y bloqueo por PIN, selector a pantalla completa, aviso previo y panel de explicación en el HUD, con 2 frascos. Retiro del panel de exploración.
4. **4 frascos y condiciones**: ranuras genéricas, barra de herramientas y persistencia.
5. **Efectos y sonido** por código de consecuencia.
6. **EPP**: interruptores nuevos y consecuencias sobre el alumno.

## 9. Lo que queda a criterio del constructor

- La forma de los tipos y la organización interna de los módulos.
- Las partículas, las curvas de los efectos y el diseño de los sonidos, dentro de los límites de rendimiento.
- La masa de cada porción y la resistencia de cada recipiente. Son internas.
- El estilo visual del selector y del panel, dentro del lenguaje actual (iconos Lucide, español).
- La representación de cada herramienta (objeto 3D o botón), accesible por teclado.
- Qué filas se fusionan por montaje y cuáles quedan como solo consulta, respetando el objetivo del 80 %.

## 10. Verificación

- `npm test`:
  - Tests de datos: balance, códigos, niveles y referencias.
  - Tests del motor:
    - Una fila por consecuencia.
    - Espectadores.
    - «Sin datos».
    - Reactivo limitante.
    - Orden de adición (S05).
    - Concentrado frente a diluido.
    - Tapado → `sobrepresion`.
    - Mezcla gaseosa + chispa → `explosion`.
    - Primaria sin `explosion`.
    - Aviso y confirmación.
    - Modo estricto.
    - EPP → consecuencia.
    - Bloqueo de nivel.
  - Los tests actuales del reactor, del motor numérico, de la paridad WASM y de los experimentos guiados siguen pasando.
- `npm run check` sin errores y `npm run build` correcto.
- Prueba manual en el navegador, en el modo inmersivo:
  - **Primaria**: bicarbonato + vinagre; botella tapada → «pop» amable; sin explosiones.
  - **Secundaria**: Mg + HCl con chispa → «pop»; lejía + ácido con y sin campana.
  - **Universidad**: Na y K en agua; termita como reconstrucción; cesio como aviso; K + Br₂ (fila M con X) como reconstrucción.
  - **Bloqueo por PIN**: el nivel no cambia sin el PIN.
  - **Calidad básica y movimiento reducido** en los tres niveles.
  - **Experimentos guiados**: funcionan como antes.
- Rendimiento con el perfil básico, como en `docs/render-performance.md`: la vista de Química no supera de forma apreciable la línea base durante un efecto.
