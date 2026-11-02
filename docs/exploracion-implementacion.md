# Laboratorio de exploración — implementación 1.0.0

Fecha: 2026-11-01. El usuario autorizó ampliar el alcance más allá del SDD anterior. El laboratorio conserva el modo inmersivo y permite entrar a Exploración mediante **Libre**; al recargar se recupera el modo de la última sesión de exploración guardada.

## Alcance disponible

- Catálogo de 18 sustancias/preparaciones virtuales, dos matraces recargables y dosificación animada o por arrastre. El mismo control de volumen admite MediaPipe.
- Exploración libre y actividades de neutralización, ácido débil, tampón, ácido cítrico, amoníaco, carbonatos, precipitados, yodo/almidón e incompatibilidades.
- pH de referencia a 25 °C, temperatura adiabática estimada donde procede, manómetro, colector abierto/cerrado, registro de CO₂ y sólido precipitado.
- Representación 3D de líquido, sedimento, burbujas de CO₂ y tapa del colector. Las posiciones/tamaños visuales no son mediciones físicas.
- Avisos de incompatibilidad antes de dosificar, con lectura explícita y una nueva acción requerida para verter. No se añade automáticamente líquido al leer un aviso.
- Panel de resultados con ecuaciones, explicación, fuentes, especies seleccionadas y límites. Estado cuantitativo, parcial o desconocido explícito.
- Cuaderno con predicción, reflexión y exportación JSON/CSV. IndexedDB recupera la última sesión de exploración, su mezcla, actividad, pasos, mediciones, evaluación y existencias de los dos matraces. Cambiar de modo conserva esos datos. JSON incluye también el progreso y la evaluación; CSV conserva el historial de dosis.
- Guías paso a paso para neutralización, precipitación de CaCO₃ y generación de CO₂ con colector virtual. Se avanza por evidencia del reactor; no se dosifica automáticamente ni se necesita cron.
- Casos conceptuales de presión, llamarada y gas tóxico. No hay cálculo universal de explosiones ni generación cuantificada de gases tóxicos.
- Perfil gráfico básico por defecto, detalle de vidrio opcional y distribución adaptable a pantalla estrecha.

## Mesa e interfaz

La mesa usa una cubierta redondeada, tapete de trabajo y materiales mates, con los dos matraces a igual distancia del vaso. Se remodelaron el agitador, pH-metro, electrodo con soporte y cable, gradilla, tubos, colector y libro. Los matraces tienen etiquetas frontales y marcas A/B; el vaso tiene graduaciones alineadas con su altura de llenado. Los instrumentos conservan el motor químico y los controles de vertido existentes. La decoración no añade funciones científicas.

La interfaz aplica vidrio esmerilado oscuro, bordes discretos y acentos menta, con controles de fondo sólido. En escritorio, las mediciones están a la izquierda y el reactivo seleccionado y la dosificación a la derecha; resultados, cuaderno y casos comparten pestañas. La biblioteca de 18 reactivos se abre en un diálogo con búsqueda y filtro de familia. Abrirla suspende la manipulación gestual de los matraces.

Ampliar mesa oculta los paneles conservando la escena y la mezcla. Restablecer vista solo devuelve la cámara a su posición inicial. Calidad gráfica y acceso al MVP se agrupan en Opciones. En tableta, las mediciones pasan debajo de la escena; en móvil, mesa, mediciones y controles forman una página desplazable. Se mantienen foco visible, controles con nombre accesible, cierre de diálogos con Escape y preferencia de movimiento reducido. El perfil básico no exige transmisión de vidrio.

## Modelo científico y dominio

El motor puro está en src/lib/science/chemistry/reactor.ts. El catálogo está en catalog.ts; el control de sesión en exploration/exploration_store.svelte.ts. La escena observa los resultados del motor y no calcula pH ni productos.

### Equilibrio acuoso

Se resuelve por bisección el balance de carga, con concentraciones ideales y volúmenes aditivos. Se consideran:

- HCl y NaOH completamente disociados.
- Acético/acetato: Ka = 1.8×10⁻⁵.
- Carbonatos: K1 = 4.3×10⁻⁷ y K2 = 4.7×10⁻¹¹, usando CO₂* como especie neutra combinada del modelo.
- Cítrico: pKa 3.13, 4.76 y 6.40.
- NH₃/NH₄⁺: Kb = 1.8×10⁻⁵.
- Agua: Kw = 10⁻¹⁴. Los resultados de pH se etiquetan como referencia a 25 °C, incluso cuando se informa un incremento adiabático de temperatura.
- CaCO₃: Ksp = 8.7×10⁻⁹, tomado de la tabla de OpenStax indicada abajo. Otras fuentes pueden usar otro valor; este modelo no los intercambia silenciosamente.
- Ca(OH)₂: Ksp = 1.3×10⁻⁶. Se comprueba saturación y se acopla la competencia entre sólidos de calcio cuando corresponde.

Fuentes: [ácidos](https://openstax.org/books/chemistry-2e/pages/h-ionization-constants-of-weak-acids), [bases](https://openstax.org/books/chemistry-2e/pages/i-ionization-constants-of-weak-bases), [productos de solubilidad](https://openstax.org/books/chemistry-2e/pages/j-solubility-products), [pKa cítrico](https://www2.csudh.edu/oliver/chemdata/data-ka.htm).

No se resuelven citrato con calcio (complejos/sales) ni amoníaco con carbonatos (acoplamiento de volatilidad); esas combinaciones pasan a desconocido. La adición de una sustancia fuera del dominio suspende las magnitudes no calculables, sin emitir un certificado de seguridad.

### CO₂ y colector

La acidificación de carbonatos se aproxima mediante desgasificación estequiométrica completa por equivalentes hacia un colector ideal. El carbono que permanece en líquido/sólido, el gas atrapado y el evacuado se conservan separadamente. La base añadida después no recupera el gas ya evacuado.

Es una aproximación de transformación completa: no resuelve velocidades, redisolución ni partición de Henry. En el caso de cítrico se utilizan sus tres equivalentes ácidos dentro de esta aproximación, no una cinética real de liberación.

El colector tiene capacidad geométrica de 250 mL y un máximo de trabajo de 240 mL, dejando espacio de gas. Al cerrarlo se registra el aire inicialmente atrapado. El manómetro aplica P·V = n·R·T al aire y al CO₂ capturado; la reducción de volumen libre también aumenta la presión. Abrirlo transfiere gas capturado al registro de evacuado. Gas producido antes de cerrarlo no se recaptura.

Para mezclas con amoníaco no se muestra presión cuantitativa, ya que no se modela su volatilización. Si la temperatura no está calculada se usa referencia de 25 °C, indicada en los límites.

El ensayo se pausa a 150 kPa absolutos: es un umbral de entrenamiento arbitrario, no resistencia de vidrio ni presión real de explosión. No se permite seguir dosificando mientras se mantiene ese estado; abrir el colector virtual permite continuar.

Fuente de la ley de gases: [OpenStax](https://openstax.org/books/chemistry-2e/pages/9-2-relating-pressure-volume-amount-and-temperature-the-ideal-gas-law).

### Temperatura y modelos parciales

Solo para agua, NaCl/sacarosa como espectadores y el par HCl/NaOH se usa calor de neutralización aproximado de 57.3 kJ/mol y Cp de agua de 4.184 J/(g·K), sin pérdida de calor, calor de dilución ni capacidad del recipiente. No equivale a un termómetro físico. En otras composiciones la temperatura se informa como desconocida.

CuSO₄/NaOH se trata con precipitación completa limitada por estequiometría para Cu(OH)₂; su pH no se calcula. Yodo/almidón produce una observación de complejo azul oscuro, sin molaridad del polímero, rendimiento ni pH.

El resto de combinaciones conserva el registro de dosis, informa cobertura desconocida y evalúa incompatibilidades cualitativas. La cantidad, exposición y cinética de gases tóxicos no se calculan.

## Avisos y aprendizaje

Las reglas consideran todos los ingredientes registrados, no solo el último par: hipoclorito/ácidos, hipoclorito/amoníaco, oxidantes/orgánicos y estabilidad de peróxido, además de calor y presión. Son conservadoras por historial de ingredientes; no implican que quede reactivo libre suficiente ni predicen severidad real.

Los casos de accidente son conceptuales. Los factores combustible/oxidante/ignición/confinamiento ayudan a discutir decisiones, sin mostrar recetas o predecir detonación. Las fuentes se enlazan desde cada ficha y observación.

### Guías, recomendaciones y evaluación

En **Libre**, elegir una de las tres actividades marcadas **Guía** prepara sus reactivos y abre el panel de investigación. Cada guía pide una predicción antes de añadir sustancias; después se conserva esa elección. La guía no bloquea la exploración libre: si se omite la predicción, se mezcla antes de medir la referencia o se usan otros reactivos, explica cómo retomar el objetivo sin inventar evidencias anteriores.

Los pasos se verifican desde `ExplorationStore.add` y `close`, compartidos por pipeta, arrastre, teclado y gestos. `guides.ts` conserva las actividades existentes y define las condiciones, preguntas y pistas de las tres guías. Cada paso guarda sus mediciones al completarse; esa evidencia histórica permanece aunque el alumno siga experimentando. Las recomendaciones señalan exceso de base, referencia perdida, gas ya evacuado, sobrepresión o mezcla fuera del alcance de la guía. Los avisos de incompatibilidad siguen interrumpiendo antes de añadir líquido.

La evaluación requiere completar la secuencia, responder una pregunta conceptual y escribir una conclusión. Compara la predicción con el resultado y explica la respuesta conceptual; no puntúa automáticamente la calidad del texto. Para el gas se comparan las presiones guardadas antes y después de generar CO₂, además de la presión actual con el colector abierto. Añadir líquido o cambiar el colector invalida la evaluación mostrada para poder repetirla con el nuevo resultado. Las otras actividades mantienen su exploración y sus preguntas originales.

### Guardado y recuperación

`session_storage.ts` usa IndexedDB nativo (`symbiolab`, almacén `sessions`) sin dependencias nuevas. El guardado se agrupa con una espera de 300 ms tras los cambios; también se intenta al ocultar o salir de la página. Se confirma al completar la transacción, siguiendo la [API de IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/complete_event). No guarda imágenes, landmarks ni permisos de cámara, y nunca reanuda un vertido automáticamente.

Antes de restaurar se comprueban versión, modelo, catálogo, inventario de carbono/gas, coherencia de volumen e historial, pasos y existencias. No se recuperan autorizaciones de incompatibilidad: una nueva mezcla peligrosa vuelve a pedir lectura del aviso. Una sesión incompatible o dañada se conserva sin sobrescribir y el ensayo nuevo funciona en memoria con exportación disponible. Los errores de escritura se muestran y se reintentan con el próximo cambio.

El guardado cubre la última sesión de exploración en este navegador y origen. No sincroniza dispositivos ni conserva un archivo de intentos anteriores; cambiar actividad o reiniciar reemplaza el intento. El navegador puede borrar sus datos y un cierre abrupto puede perder cambios pendientes: JSON/CSV permite conservar una copia aparte. La sesión del modo inmersivo tiene su cuaderno independiente y no se persiste en esta entrega.

## Verificación y pendientes

Las pruebas en tests/science/reactor.test.ts comprueban referencias de pH, tampón, carbonatos, conservación de carbono, precipitación/redisolución, colector, límites y resultados explícitos para los 324 pares ordenados del catálogo. Recorrer esos pares verifica la clasificación y la ausencia de NaN; no valida experimentalmente 324 reacciones.

Las pruebas en tests/interaction/exploration.test.ts comprueban el aviso previo, la ausencia de dosis automática al aceptarlo, recarga sin borrar la mezcla, integración con los matraces y eventos del colector. Se mantienen las pruebas del MVP, fluidos y entrada gestual.

Pendientes: comparación independiente de equilibrios multicomponente; datos no ideales; cinética, complejación y volatilidad; transferencia de calor y vapor; productos comerciales; persistencia del modo inmersivo; verificación offline; pruebas con webcam real y revisión docente. Las guías nuevas usan el motor acuoso de exploración; los presets y demostraciones del libro inmersivo requieren su propia revisión científica.

## Evidencia de esta entrega

- Chequeo Svelte/TypeScript sin errores ni avisos.
- Suite de 67 pruebas de ciencia, interacción, guías, recuperación, fluidos y cámara. Las regresiones nuevas cubren las tres secuencias, predicción previa, exceso de base, presión, cobertura desconocida, evaluación, existencias entre modos y rechazo de datos guardados inválidos.
- Compilación de producción; permanece el aviso de tamaño del bundle de Three.js/MediaPipe.
- Chromium automatizado: renderizado WebGL en modo básico, dosificación animada, neutralización, yodo/almidón sin pH inventado, aviso previo y cancelación, exportación JSON, cambio de modo y distribución móvil de 390 px sin desbordamiento horizontal.
- Regresión del rediseño en Chromium: arrastre real de un matraz en la escena y sincronización con el selector lateral; búsqueda/filtro de biblioteca; recarga sin borrar mezcla; Escape; ampliación a 1280 px conservando el mismo canvas; aviso previo, cancelación y exportación. Distribuciones de 1440, 1024, 390 y 320 px sin desbordamiento horizontal, con biblioteca centrada y desplazable. Sin errores de ejecución del navegador.
- Inspección visual de capturas de escritorio, tableta y móvil en perfil básico, y de la opción de vidrio detallado. El cambio de calidad conserva las lecturas y no produce errores de ejecución. Webcam real, dispositivos táctiles físicos, medidas de rendimiento y prueba offline pendientes.
- Guías en Chromium con el dibujado 3D sustituido, conservando la escena, la animación de dosificación y el reactor reales: neutralización por pipeta, precipitación, secuencia de gas, evaluación y recuperación tras recargar con IndexedDB real. Verificados existencias y actividad entre modos, errores de escritura y reintento, sesión incompatible sin sobrescritura y funcionamiento en memoria cuando se bloquea IndexedDB. Sin errores de ejecución. Interfaz sin desbordamiento horizontal a 1440, 1024, 390 y 320 px; el acceso móvil lleva el encabezado de la guía a la vista. Estas comprobaciones no miden rendimiento WebGL ni validan su uso con estudiantes.
