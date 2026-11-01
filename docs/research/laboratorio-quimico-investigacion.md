# Investigación para un laboratorio químico virtual de exploración y aprendizaje del riesgo

**Proyecto:** SymbioLab. **Fecha de consulta:** 2026-11-01. **Estado:** investigación y propuesta para revisión; no implementación ni validación experimental.

**Audiencia de trabajo:** secundaria, con ampliaciones identificadas para química universitaria inicial. Es una hipótesis de diseño pendiente de concretar con el usuario; no se ha fijado grado, edad ni currículo nacional.

**Documentos relacionados:** [catálogo propuesto](catalogo-quimico-propuesto.md), [fuentes y sus límites](fuentes-quimica.md), SDD consolidado 0.2.0 y arquitectura existente.

## 1. Conclusiones que determinan el proyecto

La visión es viable como **laboratorio virtual de exploración con cobertura científica declarada**. El estudiante podría elegir materiales, equivocarse, observar consecuencias simuladas y explicar cómo habría evitado un incidente. Para hacerlo bien, el laboratorio debe conservar el estado de cada mezcla y reconocer cuándo carece de un modelo válido.

Las decisiones principales propuestas son:

1. Ofrecer los **118 elementos como biblioteca de consulta**, y un inventario de sustancias y reacciones seleccionadas para experimentar. El número de elementos no mide cuánta química puede simularse. La tabla reconocida y las particularidades de los pesos atómicos se documentan en [IUPAC](https://iupac.org/what-we-do/periodic-table-of-elements/) y [CIAAW](https://ciaaw.org/atomic-weights.htm).
2. Diferenciar elemento, sustancia elemental, compuesto, ion y mezcla. El peligro depende de la forma química y de las condiciones: no se puede trasladar automáticamente el peligro del sodio metálico al ion sodio de una sal.
3. Separar **resultado químico**, **peligro conocido**, **riesgo del escenario** y **certeza de la predicción**. Una mezcla puede tener pH cercano a neutro y seguir siendo peligrosa.
4. Usar modelos cuantitativos solo para sistemas y condiciones validados; usar advertencias cualitativas documentadas para incompatibilidades; declarar expresamente los casos desconocidos.
5. Representar gases con sensores virtuales y balances de materia. Un efecto de humo coloreado no prueba qué sustancia existe ni cuánto peligro representa.
6. Incluir incidentes virtuales por calor, presión, vapores, salpicaduras y contaminación. Reservar el término «explosión» para el fenómeno que corresponda, y evitar que toda mezcla llamativa termine con el mismo efecto.
7. Permitir observar errores graves en un modo de análisis de accidentes: advertencia, predicción del alumno, consecuencia conceptual, explicación y repetición con una decisión distinta. No necesita mostrar procedimientos prácticos de fabricación de explosivos ni de gases tóxicos.
8. Evaluar comprensión y transferencia: reconocer el peligro en un caso nuevo es más valioso que descubrir cuántas explosiones produce el escenario.

Los puntos 2–8 son la síntesis y la propuesta de diseño de este informe; no constituyen resultados ya demostrados en SymbioLab.

## 2. Alcance y método de investigación

Se consultaron fuentes primarias institucionales y documentación oficial: IUPAC/CIAAW, NIST, NOAA/CAMEO, AIChE/CCPS, UNECE, OSHA, NIOSH/CDC, NIH, ILO, ACS, universidades y proyectos científicos. Para bases conceptuales se utilizó el texto universitario abierto Chemistry 2e de OpenStax. Para pedagogía se revisaron recursos del propio ChemCollective, investigación de PhET y una experiencia de evaluación de Carnegie Mellon.

La búsqueda cubrió identidad química; propiedades físicas y termodinámicas; familias de reacciones; gases; incompatibilidades; incidentes educativos; comunicación de peligros; límites de motores científicos; y aprendizaje por investigación y retroalimentación.

**No es una revisión sistemática ni un inventario exhaustivo de todas las sustancias.** No se descargó una base química completa, no se validó una ficha SDS para cada candidato del catálogo y no se realizaron experimentos. El anexo identifica propuestas que necesitan curación posterior. Las fuentes citadas justifican conceptos y peligros generales; no convierten automáticamente cada escenario propuesto en una simulación validada.

Se mantuvo la investigación independiente de las decisiones de implementación: no se instalaron motores químicos ni se modificó el simulador para este trabajo.

## 3. Punto de partida real de SymbioLab

El SDD consolidado disponible delimita Feature 001 a HCl/NaOH idealizados, una estación, 25 °C y un indicador virtual. Señala expresamente que no pretende química universal. La nueva visión necesita una ampliación documentada del producto y de sus modelos, conservando las evidencias y pendientes del MVP.

La lectura de los archivos actuales detectó estos asuntos para la siguiente fase, **sin corregirlos en esta investigación**:

| Hallazgo en el código o contenido | Implicación científica | Trabajo posterior |
| --- | --- | --- |
| Todos los presets usan el solver de ácido/base fuertes | Los nombres vinagre, limón y bicarbonato no hacen que ese solver represente su química | Añadir modelos de ácidos débiles, especies polipróticas y carbonatos, o etiquetar escenarios como analogías |
| Se propone equivalencia de vinagre/bicarbonato como pH 7 por igualar volúmenes | La equivalencia estequiométrica no fija por sí sola el pH, y el CO₂ introduce intercambio con fase gas | Revisar objetivos, preguntas y modelo de ese escenario |
| Se propone llevar bicarbonato doméstico a pH superior a 10.5 y se muestra 11.4 | No corresponde a una disolución ordinaria de bicarbonato puro | Eliminar la meta o cambiar de sustancia y modelo con justificación |
| Las bandas del indicador llaman «ácido débil» a un intervalo de pH | La fuerza de un ácido se refiere a su ionización, no al pH de cualquier muestra | Separar identidad/fuerza del reactivo, concentración y estado de la mezcla |
| Col morada reutiliza colores y neutralidad de un indicador universal virtual | Los indicadores tienen respuestas diferentes | Ficha propia del indicador y límites de interpretación |
| El solver acota pH entre 0 y 14 y conserva temperatura fija | Ese dominio no cubre todas las disoluciones ni procesos exotérmicos | Declarar el rango actual; no extrapolar a química general |
| Existen expresiones como «100% seguro» o «inocuo» para ingredientes domésticos | Pueden trasladar una confianza injustificada a cantidades, condiciones o mezclas diferentes | Sustituir absolutos por información contextual y por límites del escenario |

Evidencia local: src/lib/science/chemistry/acid_base_solver.ts y src/lib/interaction/lab_store.svelte.ts. Estos hallazgos describen el código inspeccionado, no resultados de nuevas pruebas.

Fundamento para la revisión: la ionización distingue ácidos fuertes y débiles ([OpenStax 14.3](https://openstax.org/books/chemistry-2e/pages/14-3-relative-strengths-of-acids-and-bases)); las curvas de valoración requieren considerar los equilibrios de las sustancias ([OpenStax 14.7](https://openstax.org/books/chemistry-2e/pages/14-7-acid-base-titrations)). Una ficha técnica de bicarbonato informa pH 8.3 para una disolución fresca 0.1 M a 25 °C; es un dato para esas condiciones, no una constante universal ([Sigma-Aldrich](https://www.sigmaaldrich.com/deepweb/assets/sigmaaldrich/product/documents/209/082/s4019pis.pdf)). ACS describe para col morada un color neutro azulado, diferente del verde neutro usado en el prototipo ([ACS: indicador de col](https://www.acs.org/education/activities/red-cabbage-indicator.html)).

## 4. Qué hay que conocer sobre los elementos

### 4.1 Cinco niveles de identidad

| Nivel | Ejemplo | Lo que representa |
| --- | --- | --- |
| Elemento | Cl, número atómico 17 | Identidad de los átomos por número de protones |
| Sustancia elemental | Cl₂ | Forma molecular del elemento; tiene propiedades de sustancia |
| Ion | Cl⁻ en agua | Especie cargada; no equivale al gas Cl₂ |
| Compuesto | NaCl | Sustancia con composición definida; su comportamiento depende de fase y disolución |
| Mezcla o producto | Agua salada; un limpiador comercial | Varias sustancias; composición y concentración pueden variar |

Una fórmula puede requerir más información: estado de oxidación, hidratación, isómero, alótropo o estado físico. Carbono como grafito y diamante ilustra la importancia de la estructura; fósforo ilustra que los alótropos no deben compartir una única ficha de comportamiento. Fuentes: [RSC: carbono](https://periodic-table.rsc.org/element/6/carbon), [RSC: fósforo](https://periodic-table.rsc.org/element/15/phosphorus).

### 4.2 Organización de la biblioteca periódica

La biblioteca debería enseñar número atómico, símbolo y nombre; grupo y período; configuración electrónica; electrones de valencia; estados de oxidación frecuentes; radio, electronegatividad y energía de ionización; usos y ejemplos de compuestos. Las tendencias sirven para razonar, pero no sustituyen una reacción documentada.

Separar tres conceptos en la presentación: número másico de un isótopo, masa isotópica y peso atómico estándar. No inventar un peso estándar para elementos que no lo tienen. Las fuentes de referencia recomendadas son [CIAAW](https://ciaaw.org/atomic-weights.htm), [NIST: tabla periódica](https://www.nist.gov/pml/periodic-table-elements) y [RSC](https://periodic-table.rsc.org/).

La selección didáctica inicial se organiza en familias: H y no metales de interés biológico; alcalinos; alcalinotérreos; metales representativos y de transición; halógenos; gases nobles. Una categoría didáctica no autoriza a asignar el mismo peligro ni la misma velocidad de reacción a todos sus miembros.

### 4.3 El inventario experimental no debe ser una caja de átomos

Una interacción de dos símbolos de la tabla no permite deducir todos sus productos. Hay que elegir sustancias reales o virtuales definidas y un contexto: disolución acuosa, sólido, gas, atmósfera, energía y recipiente.

Ejemplo de contraste propuesto: comparar la ficha de Na metálico, Na⁺ acuoso y NaCl. La ficha del metal y la del compuesto deben conservar identidades distintas; no se representa «sodio peligroso dentro de la sal» como si pudiera separarse mezclando ingredientes domésticos. [RSC: sodio](https://periodic-table.rsc.org/element/11/sodium).

## 5. Ficha científica mínima de cada sustancia y muestra

Propuesta de información para investigar y curar antes de modelar:

| Bloque | Datos necesarios | Por qué importa |
| --- | --- | --- |
| Identidad | Nombre, fórmula, carga, identificadores y forma específica | Evitar sinónimos y sustancias equivocadas |
| Composición | Sustancia pura o mezcla; componentes y fracciones | Un nombre comercial no fija composición |
| Estado inicial | Fase, masa, cantidad de sustancia, volumen, temperatura | Define qué hay realmente en el recipiente |
| Concentración | Valor, unidad y base: mol/L, mol/kg, % masa o % volumen | Estas unidades no son intercambiables automáticamente |
| Propiedades físicas | Densidad, viscosidad, presión de vapor, puntos de transición | Determinan transferencia, volatilidad y fases |
| Equilibrios | Ka/Kb, Ksp, complejación y sus condiciones | Necesarios para pH, disolución y precipitación |
| Energía | Entalpías, capacidades caloríficas y datos de mezcla | Necesarios para calentamiento o enfriamiento |
| Cinética | Ley y parámetros ajustados a un sistema concreto | Un producto posible no determina cuándo aparece |
| Peligros | SDS de la forma y concentración, incompatibilidades, vías de exposición | Evitar etiquetas genéricas incorrectas |
| Procedencia | Fuente original, fecha, incertidumbre, licencia y revisión | Permite auditar y actualizar cada dato |

La SDS organiza, entre otras cosas, identificación de peligros, composición, almacenamiento, controles, propiedades y reactividad en secciones diferentes. Su estructura es una guía útil para la ficha educativa, sin presentar esa ficha como una SDS profesional. Referencia: [OSHA, Appendix D](https://www.osha.gov/hazcom/appendix-d).

El recipiente requiere su propia ficha: material, capacidad, volumen libre sobre el líquido, abierto/cerrado, conexiones, calentamiento y compatibilidad. No se debe asignar una presión de rotura real por el aspecto del modelo 3D. El estado del entorno debe incluir al menos ventilación conceptual, fuentes de calor/ignición y posibles derrames; solo se calculan magnitudes para las que exista un modelo.

## 6. Familias de fenómenos que debe cubrir el laboratorio

OpenStax distingue precipitación, ácido/base y oxidación/reducción como familias fundamentales. La propuesta añade procesos físicos y acoplamientos para ofrecer variedad sin forzar que toda manipulación sea una reacción química. [OpenStax 4.2](https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions).

| Familia | Qué aprende el alumno | Observables apropiados | Límite esencial |
| --- | --- | --- | --- |
| Mezcla y dilución | Conservación y concentración | Volumen, concentración, homogeneización | Los volúmenes no siempre son aditivos |
| Disolución y cristalización | Solubilidad y saturación | Sólido restante, cristales, temperatura | No todo soluto desaparece ni toda curva crece con T |
| Cambio de fase | Calor y estados | Ebullición, condensación, sublimación | Burbujas no implican reacción química |
| Ácido/base fuerte | Estequiometría e indicador | pH, especies, calor si se modela | Modelo acuoso y rango declarado |
| Ácido/base débil y tampones | Equilibrio y capacidad amortiguadora | Curva de pH y composición | No usar reglas de ácido fuerte |
| Carbonatos y fase gas | Acoplamiento de equilibrio y transferencia | Gas, pH, masa del sistema | Parte del gas puede quedar disuelta |
| Precipitación | Producto iónico y solubilidad | Turbidez, sólido y sobrenadante | No decidir solo por nombres de sales |
| Redox | Transferencia de electrones | Color, metal depositado, potencial | Cinética y pasivación pueden importar |
| Termoquímica | Diferencia entre energía y temperatura | Temperatura y balance energético | Calor liberado no implica explosión |
| Cinética y catálisis | Velocidad, concentración y temperatura | Evolución temporal | Un catalizador no crea materia |
| Combustión | Combustible, oxidante y energía de inicio | Consumo de reactivos, calor, gases | No predecir explosiones con una simple suma de ingredientes |
| Presión y confinamiento | Cantidad de gas, temperatura, espacio libre | Presión y deformación conceptual | Requiere distinguir recipiente ventilado y sellado |

Cada actividad debe relacionar tres representaciones: lo visible, las especies/partículas y las ecuaciones o medidas. Se propone poder alternarlas sin afirmar que las esferas moleculares se ven realmente a escala macroscópica.

## 7. Gases: catálogo educativo y riesgos distintos

La propuesta distingue gases de estudio general y sustancias reservadas al análisis virtual de peligros. «Solo análisis virtual» describe un modo educativo, no la imposibilidad de aprender su química.

| Gas o familia | Idea central | Peligro que merece enseñanza | Presentación propuesta |
| --- | --- | --- | --- |
| O₂ | Oxidante y respiración | Favorece combustión; no se etiqueta como combustible | Sensor y comparación conceptual |
| N₂ | Atmósfera y baja reactividad en condiciones ordinarias | Puede desplazar oxígeno | Escenario de atmósfera, sin llama obligatoria |
| CO₂ | Carbonatos, disolución y fase sólida | Acumulación, efectos fisiológicos y presión; frío en fase sólida | Modelo gas/líquido y escenarios de confinamiento |
| H₂ | Gas combustible | Incendio o explosión si concurren condiciones apropiadas | Escenario virtual controlado, sin recetas de generación |
| Vapor de agua | Cambio de fase | Calor y presión | Diferenciar vapor de niebla de gotitas |
| NH₃ | Gas y equilibrio acuoso | Irritación y corrosividad según exposición | Caso de riesgo, no frasco de «base inocua» |
| Cl₂ | Sustancia elemental distinta de cloruro | Peligro respiratorio y carácter oxidante | Análisis virtual con advertencia previa |
| CO | Gas diferente de CO₂ | Toxicidad; puede ser invisible e inodoro | Sensor virtual; evitar detección por color |
| H₂S | Riesgo de gases industriales | Toxicidad; el olor no es un detector fiable | Caso virtual de reconocimiento |
| NO₂ y SO₂ | Contaminación y exposición respiratoria | Daño respiratorio y dependencia del contexto | Casos avanzados separados |

Bases: para H₂, [DOE: uso seguro](https://www.energy.gov/cmei/fuels/safe-use-hydrogen?trk=article-ssr-frontend-pulse_little-text-block) y [DOE: requisitos de oxidante](https://www1.eere.energy.gov/hydrogenandfuelcells/pdfs/doe_h2_safety.pdf); para N₂, [CDC: prácticas de laboratorio](https://www.cdc.gov/mmwr/preview/mmwrhtml/su6101a1.htm); para CO₂, [NIOSH](https://www.cdc.gov/niosh/npg/npgd0103.html); para NH₃ y CO, [OSHA: amoníaco](https://www.osha.gov/chemicaldata/623) y [OSHA: monóxido](https://www.osha.gov/chemicaldata/462). Para H₂S, [NIOSH](https://www.cdc.gov/niosh/npg/npgd0337.html); para NO₂, [NIOSH](https://www.cdc.gov/NIOSH/npg/npgd0454.html); para SO₂, [ATSDR](https://wwwn.cdc.gov/TSP/substances/ToxSubstance.aspx?toxid=46). Cl₂ y cloraminas se documentan en la sección 9.

**Reglas de representación propuestas:**

- Una nube de color usada para enseñar concentración debe llevar la etiqueta «visualización del simulador»; muchos gases son invisibles, y un gas coloreado puede ser peligroso antes de que el color resulte evidente.
- Mostrar por separado gas producido, gas disuelto, gas en el recipiente y gas que salió al entorno. «Ya no hay burbujas» no significa que no quede peligro.
- La densidad relativa no basta para predecir dónde se acumulará un gas: también importan corrientes, temperatura y mezcla del aire. Una animación cualitativa no debe aparentar una predicción de exposición real.
- No convertir límites ocupacionales en límites de seguridad para niños. La guía NIOSH está dirigida a peligros laborales y no contiene todos los datos necesarios para cada situación. [NIOSH: alcance de la guía](https://www.cdc.gov/niosh/npg/default.html).
- El alumno puede comparar un sistema abierto y otro confinado como estados virtuales de una actividad; no necesita recibir instrucciones para fabricar un recipiente peligroso real.

## 8. Incendios y explosiones: qué representar y qué no confundir

### 8.1 Fenómenos diferentes

| Fenómeno | Explicación conceptual | Tratamiento educativo propuesto |
| --- | --- | --- |
| Calentamiento exotérmico | La transformación libera energía; parte aumenta T | Balance de calor, termómetro y aviso contextual |
| Incendio o llamarada | Combustión con liberación de calor y propagación | Mostrar condiciones y consumo de reactivos, sin asumir sobrepresión |
| Rotura por sobrepresión | La presión supera la resistencia del sistema | Alerta de presión y representación conceptual de fallo |
| Descontrol térmico | La generación de calor supera su evacuación y acelera el proceso | Gráficas de generación/pérdida de calor; modelo específico |
| Deflagración y detonación | Regímenes distintos de propagación de una reacción | Explicación avanzada y casos curados; sin predicción universal |
| Evento de polvo combustible | Estado disperso y condiciones ambientales alteran el peligro | Comparar formas de un material de forma cualitativa |

Una rotura no requiere necesariamente una reacción química. WorkSafe documenta un incidente por acumulación de CO₂ en un recipiente cerrado con hielo seco; permite enseñar presión, cambio de fase y consecuencias sin confundirlo con síntesis de un explosivo. [WorkSafe Victoria, 2026](https://www.worksafe.vic.gov.au/safety-alerts/working-dry-ice).

El CCOHS distingue el triángulo del fuego y las condiciones adicionales de dispersión y confinamiento para explosiones de polvo; también advierte que una llamarada puede ocurrir sin confinamiento. Esta distinción justifica separar estados físicos del material en el catálogo. [CCOHS: polvo combustible](https://www.ccohs.ca/oshanswers/chemicals/combustible_dust.html).

### 8.2 Límite de realismo

No debe asignarse una animación explosiva únicamente porque dos sustancias sean incompatibles, porque ΔH sea negativo o porque exista formación de gas. Para predecir un desenlace específico hacen falta datos del sistema, de la velocidad, la transferencia de calor, el confinamiento y la resistencia mecánica.

Propuesta: tres etiquetas visibles para los incidentes: **resultado calculado dentro del modelo**, **consecuencia plausible según una regla documentada**, y **reconstrucción didáctica de un caso**. Solo el primero puede presentar cifras como salidas del cálculo, con sus unidades y límites. Una animación de los otros dos casos no debe aparentar un tiempo de explosión o una presión de fallo verificados.

No se propone un optimizador de explosiones ni un inventario de formulaciones explosivas. El contenido necesario para el objetivo del usuario es reconocer señales, comprender causas y aprender decisiones preventivas.

### 8.3 Un antecedente educativo importante

El Chemical Safety Board investigó accidentes en demostraciones escolares con líquidos inflamables y retroceso de llama hacia envases. Enseñan que el riesgo no es solo «qué reacción elegí»: también depende del equipo, la proximidad de materiales y la disposición del entorno. [CSB: incidentes en demostraciones educativas](https://www.csb.gov/key-lessons-for-preventing-incidents-from-flammable-chemicals-in-educational-demonstrations/).

La consecuencia de diseño propuesta es registrar el contexto del incidente y no premiar al alumno por provocar un efecto más intenso. La reconstrucción puede centrarse en instrumentos y gráficas, sin daño gráfico a personas.

## 9. Incompatibilidades que el estudiante debe aprender a reconocer

Esta tabla presenta **categorías de peligro y mensajes educativos**, no procedimientos de mezcla, proporciones, temperaturas ni métodos de preparación. Su redacción debe adaptarse al contenido y a las condiciones que finalmente tenga cada escenario.

| Combinación o condición | Qué puede ocurrir | Aviso propuesto | Base |
| --- | --- | --- | --- |
| Hipoclorito con productos ácidos | Liberación de cloro y exposición respiratoria | «Incompatibilidad grave: puede liberarse gas tóxico.» | Salud pública de Washington |
| Hipoclorito con productos que contienen amoníaco | Formación de cloraminas y exposición peligrosa | «No combinar estos productos; el resultado puede dañar las vías respiratorias.» | Salud pública de Washington |
| Ácido y base, especialmente concentrados | Calor y salpicaduras | «La neutralización puede liberar calor; pH final no describe todo el riesgo.» | NIH |
| Oxidante y combustible/reductor | Incendio o reacción violenta, según sustancias y contexto | «Incompatibilidad: el oxidante puede intensificar una reacción.» | NIH |
| Material reactivo con agua y medio húmedo | Calor y posibles gases peligrosos/inflamables | «No asumir que el agua hace segura la mezcla.» | NIH |
| Ácido con determinadas sales de sulfuro o cianuro | Posible liberación de gases extremadamente peligrosos | «Caso de alta peligrosidad, disponible solo como análisis virtual.» | NIH |
| Formación de gas dentro de un sistema confinado | Acumulación de presión y posible fallo | «La generación de gas puede presurizar el recipiente.» | WorkSafe |
| Gas o vapor combustible en un entorno con condiciones de ignición | Incendio; algunos escenarios pueden producir explosión | «El peligro también está en la atmósfera del entorno.» | DOE/CSB |
| Disolución de determinadas sustancias, como NaOH sólido | Aumento de temperatura y peligro corrosivo | «Disolver no significa ausencia de peligro térmico.» | ILO |
| Calentar o mantener un recipiente con contenido desconocido | Cambios de fase, reactividad o presión no evaluados | «Faltan datos: no hay predicción fiable de este escenario.» | Regla conservadora propuesta |

Fuentes directas: [Washington State Department of Health](https://doh.wa.gov/community-and-environment/contaminants/bleach-mixing-dangers?trk=public_post_comment-text), [NIH: compatibilidad química](https://orf.od.nih.gov/EnvironmentalProtection/WasteDisposal/Pages/chem_compat.aspx), [WorkSafe: hielo seco](https://www.worksafe.vic.gov.au/safety-alerts/working-dry-ice), [DOE](https://www1.eere.energy.gov/hydrogenandfuelcells/pdfs/doe_h2_safety.pdf), [CSB](https://www.csb.gov/key-lessons-for-preventing-incidents-from-flammable-chemicals-in-educational-demonstrations/), [ILO: NaOH](https://www.ilo.org/dyn/icsc/showcard.display?p_card_id=360).

Las advertencias de hipoclorito deben diferenciar cloro y cloraminas; no etiquetar todo como el mismo gas ni como «gas mostaza». La referencia sanitaria distingue las primeras dos familias de mezclas. Los envases comerciales tampoco deben modelarse como una molécula pura: composición y concentraciones requieren la ficha del producto concreto.

Una matriz de incompatibilidad ayuda a reconocer peligros, pero **no predice por sí sola los productos ni la severidad exacta de toda mezcla**. AIChE/CCPS explica que las predicciones por pares pueden omitir efectos de tres o más componentes y de catalizadores. Por ello «no se conoce una reacción peligrosa» no basta para emitir un sello de seguridad. [AIChE/CCPS: límites del Chemical Reactivity Worksheet](https://ccps.aiche.org/resources/faqs).

## 10. Modelos científicos: hasta dónde puede calcularse

### 10.1 Conservación de materia y carga

El motor futuro necesita conservar el inventario de especies o cantidades elementales y distinguir transferencia de transformación. Balancear una ecuación comprueba conservación; no demuestra que el proceso ocurra en las condiciones elegidas.

Propuesta de evidencia por resultado: inventario inicial, ecuaciones admitidas, cantidades transformadas, productos, fases y salidas al entorno. Los gases que abandonan un vaso se descuentan del vaso y se registran en el sistema; no se elimina su masa de la contabilidad global.

### 10.2 Acidez y equilibrio

La definición de pH utiliza actividad de los iones de hidrógeno; reemplazar actividad por concentración es una aproximación que requiere un dominio. [IUPAC Gold Book](https://goldbook.iupac.org/terms/view/P04524).

Para ampliar el solver actual harían falta balances de masa y carga, disociación de ácidos/bases débiles, especies polipróticas y el equilibrio del agua dependiente de temperatura. En el nivel universitario deben distinguirse concentración y actividad; no añadir un coeficiente genérico sin una base apropiada.

Un pH bajo no identifica la sustancia ni su toxicidad. Tampoco se debe imponer 0–14 como rango universal: USGS documenta valores fuera de ese intervalo en sistemas concentrados. La respuesta adecuada para un modelo elemental puede ser declarar «fuera de rango» en lugar de simularlos con precisión inventada. [USGS: medición de pH](https://pubs.usgs.gov/twri/twri9a6/twri9a64/twri9a_6.4_ver2.0.pdf).

### 10.3 Precipitación y solubilidad

Para una fase sólida admitida se compara el producto de actividades iónicas con su constante de solubilidad y se resuelve el equilibrio conservando materia. Hace falta declarar si el escenario trata equilibrio o precipitación instantánea idealizada; turbidez, tamaño de partícula y sedimentación exigen datos adicionales. [OpenStax 15.1](https://openstax.org/books/chemistry-2e/pages/15-1-precipitation-and-dissolution).

Actividad candidata bien delimitada: disoluciones de cloruro de calcio y carbonato de sodio forman carbonato de calcio sólido. Una demostración de la Universidad de Colorado respalda la identidad del precipitado; no valida automáticamente la intensidad visual ni el tiempo que tendría nuestra simulación. [Colorado Boulder](https://www.colorado.edu/lab/lecture-demo-manual/general-reactions/s130-chemical-rxns-precipitation-cacl2-na2co3-caco3).

### 10.4 Gases y presión

Como modelo introductorio, P·V = n·R·T relaciona presión, volumen de gas, cantidad de sustancia y temperatura absoluta. Debe utilizarse el **volumen libre del gas**, no el volumen total del recipiente lleno de líquido. La presión absoluta y la diferencia respecto del entorno tienen significados distintos.

La idealidad deja de representar bien ciertos estados, especialmente a presiones altas o cerca de condensación; no extrapolar un ejemplo de gas ideal a una predicción de explosión. [OpenStax 9.2](https://openstax.org/books/chemistry-2e/pages/9-2-relating-pressure-volume-amount-and-temperature-the-ideal-gas-law).

Debe declararse qué parte del gas se disuelve o sale del sistema. La ley de Henry solo se aplica con la convención de constante y condiciones correspondientes; la reacción del gas con el agua puede requerir equilibrios adicionales. [OpenStax 11.3](https://openstax.org/books/chemistry-2e/pages/11-3-solubility).

### 10.5 Energía y temperatura

La entalpía de reacción corresponde a una ecuación y a estados definidos. Para estimar temperatura también importan masa y capacidades caloríficas de muestra/recipiente, pérdida de calor, mezcla y cambios de fase. Un primer cálculo adiabático puede ser útil si se etiqueta como tal; no describe necesariamente la temperatura máxima real de una mezcla no homogénea. [OpenStax 5.3](https://openstax.org/books/chemistry-2e/pages/5-3-enthalpy), [OpenStax 5.2](https://openstax.org/books/chemistry-2e/pages/5-2-calorimetry).

En un sistema presurizado o con trabajo significativo, no se debe usar automáticamente una aproximación de calor a presión constante para toda su evolución. Tampoco generar una explosión cuando una temperatura arbitraria cruza un umbral visual.

### 10.6 Velocidad y espontaneidad

La favorabilidad termodinámica y la rapidez son preguntas distintas. El signo de ΔG bajo condiciones especificadas informa dirección termodinámica; una barrera de activación y la cinética determinan si el cambio es observable en el tiempo del ensayo. [OpenStax 16.4](https://openstax.org/books/chemistry-2e/pages/16-4-free-energy), [OpenStax 12.5](https://openstax.org/books/chemistry-2e/pages/12-5-collision-theory).

La propuesta evita velocidades «realistas» escogidas solo para que una animación dure unos segundos. Si hay compresión del tiempo, mostrar el factor. Si no existe una ley cinética validada, presentar la evolución como una ilustración, sin otorgarle un tiempo de accidente predictivo.

### 10.7 Qué aportan las herramientas existentes

| Recurso | Para qué sirve | Qué no debemos atribuirle |
| --- | --- | --- |
| IUPAC/CIAAW y NIST atómico | Identidad y propiedades elementales evaluadas | Un motor de reacciones |
| NIST Chemistry WebBook | Propiedades de especies, termodinámica y datos de referencia | Cobertura uniforme de cualquier compuesto o proceso |
| PubChem | Identificadores, estructuras, propiedades y anotaciones con procedencia | Una ficha única infalible o permiso global para redistribuir todo |
| CAMEO / CRW | Identificación de peligros de reactividad y consulta de sustancias | Predicción cuantitativa universal de rendimiento, tiempo o explosión |
| PHREEQC | Especiación y procesos acuosos con bases termodinámicas seleccionadas | Un laboratorio universal sin revisar especies y consistencia de datos |
| Cantera | Cálculos con modelos de cinética, termodinámica y transporte | Un descubridor automático de todas las reacciones posibles |

Referencias: [NIST WebBook](https://webbook.nist.gov/chemistry/guide/), [PubChem: actualización científica](https://pmc.ncbi.nlm.nih.gov/articles/PMC11701573/), [CAMEO](https://cameochemicals.noaa.gov/), [PHREEQC: limitaciones](https://water.usgs.gov/water-resources/software/PHREEQC/documentation/phreeqc3-html/phreeqc3-2.htm), [Cantera](https://www.cantera.org/).

**Propuesta para la fase posterior:** catálogo curado + modelos por familia + reglas de peligro independientes. Evaluar PHREEQC/Cantera como herramientas de referencia o contraste antes de elegir si alguno conviene al producto. Esta investigación no concluye que haya que instalarlos o ejecutarlos en el navegador.

## 11. Sistema de advertencias educativas

### 11.1 Peligro, riesgo y confianza

La clasificación de peligro describe propiedades; el riesgo del escenario incorpora posibilidad de exposición y condiciones. ECHA hace explícita esa diferencia en su explicación de clasificación. [ECHA](https://echa.europa.eu/en/regulations/clp/classification).

Propuesta: cada advertencia conserva cuatro aspectos independientes:

- **Tipo:** corrosión, calor, gas tóxico, inflamabilidad, sobrepresión, frío, contaminación u otro documentado.
- **Gravedad y condiciones:** qué daño podría ocurrir y qué parte del escenario lo permite.
- **Evidencia:** dato específico, regla de incompatibilidad o hipótesis didáctica; fuentes y versión.
- **Cobertura:** modelo aplicable, modelo parcial o resultado desconocido.

No usar una única barra de «peligro de explosión» para todos los problemas. No calcular una probabilidad porcentual de accidente si no existe una base estadística válida. Las categorías de progreso del alumno tampoco deben parecer clases legales de peligro.

### 11.2 Momento de los avisos

1. **Antes de actuar:** mostrar incompatibilidad conocida y pedir una predicción breve. Esto evita que el aprendizaje dependa únicamente de la sorpresa posterior.
2. **Durante:** avisar si cambian temperatura, presión, atmósfera o cobertura del modelo. Respetar modalidades sin sonido ni destellos.
3. **Al producirse el incidente virtual:** pausar y explicar qué variable disparó el evento; identificar si fue calculado o ilustrativo.
4. **Después:** reconstruir la secuencia, preguntar por la causa, comparar decisiones y permitir repetir desde antes del error.

En exploración libre pueden mantenerse avisos breves. En análisis de accidentes, el alumno puede observar una consecuencia tras reconocer el aviso, sin convertir ese botón en una autorización para reproducirla físicamente.

### 11.3 Mensajes de ejemplo, de redacción propia

**Gas peligroso conocido:** «Esta combinación es incompatible y puede liberar gas tóxico. La vista coloreada representa un sensor virtual. No indica que el gas pueda reconocerse por su color en la realidad.»

**Gas y recipiente:** «Se está acumulando gas en el espacio libre. La presión depende de cuánto gas hay, su temperatura y el volumen disponible. En este escenario se representa un posible fallo por sobrepresión.»

**Temperatura:** «El proceso libera calor. Que la mezcla termine cerca de pH neutro no elimina el peligro de salpicaduras o temperatura.»

**Sin reacción neta prevista:** «El modelo no predice una reacción neta para estas sustancias en estas condiciones. Las propiedades de la mezcla y sus riesgos deben evaluarse por separado.»

**Datos insuficientes:** «No contamos con un modelo validado para esta combinación. No se presenta como segura ni se inventan productos o un pH. Revisa las fichas o explora una combinación documentada.»

**Aprender del error:** «La variable que cambiaste fue el confinamiento. Compara el historial de presión de los dos casos. ¿Qué evidencia permite explicar la diferencia?»

**Contexto real:** «Este es un escenario virtual de formación. Un incidente químico real debe comunicarse al responsable del laboratorio y seguir el protocolo del centro.» No introducir instrucciones improvisadas de neutralización, olfateo o respuesta médica a partir de la animación.

### 11.4 GHS como lenguaje, no como decoración

Se propone enseñar los pictogramas, las palabras de advertencia y el significado de clases de peligro a partir del SGA/GHS. La revisión 11 de UNECE es de 2025 y está disponible en español. La clasificación de mezclas exige los criterios y datos aplicables; no se obtiene sumando iconos de los ingredientes. No se ha analizado aquí la adopción normativa de cada país. [UNECE GHS Rev.11](https://unece.org/transport/documents/2025/09/standards/globally-harmonized-system-classification-and-labelling), [PubChem: resumen GHS 11](https://pubchem.ncbi.nlm.nih.gov/ghs/ghs_11.html).

Las fichas educativas deben mostrar tanto pictograma como texto; distinguir peligro intrínseco, escenario y estado de la simulación. Un color verde de interfaz no debe equivaler a «puedes mezclarlo en casa».

## 12. Cómo aprender de los errores sin perder autonomía

ACS organiza la seguridad alrededor de reconocer peligros, evaluar riesgos, minimizarlos y preparar la respuesta a emergencias: RAMP. Se puede convertir en una secuencia educativa dentro de cada actividad. [ACS: RAMP y enseñanza secundaria](https://www.acs.org/education/policies/middle-and-high-school-chemistry/safety.html).

### 12.1 Ciclo de exploración propuesto

1. Elegir una pregunta propia y consultar las fichas.
2. Predecir qué cambiará: especies, fase, temperatura, pH o presión.
3. Identificar un peligro y una variable que se mantendrá constante.
4. Ejecutar acciones virtuales con cantidades y condiciones registradas.
5. Observar también los casos donde no hay un cambio espectacular.
6. Explicar un resultado o incidente usando medidas y un modelo.
7. Repetir cambiando una sola condición relevante.
8. Registrar qué podría y qué no podría concluirse para una situación real.

Esto es una propuesta para SymbioLab. ChemCollective documenta el uso de problemas abiertos para que el alumno diseñe experimentos, y PhET investiga cómo sus interfaces apoyan la exploración. Son antecedentes, no pruebas de eficacia de nuestra implementación. [ChemCollective: guía docente](https://chemcollective.org/teachers/teacherGuide), [PhET: investigación](https://phet.colorado.edu/en/research).

### 12.2 Tres modos complementarios

| Modo | Libertad | Apoyo |
| --- | --- | --- |
| Exploración | Elegir materiales dentro del catálogo y del dominio conocido | Fichas, avisos y mensajes de cobertura |
| Investigación con pregunta | Decidir procedimiento para resolver un problema | Hipótesis, instrumentos y pistas opcionales |
| Análisis de accidentes | Investigar un caso peligroso reconstruido | Línea temporal, pausa, comparación y explicación causal |

La propuesta ofrece acceso al conocimiento de peligros altos sin obligar a presentar sus sustancias como materiales de libre manipulación escolar real. Los niveles de acceso corresponden a objetivos didácticos y revisión docente.

### 12.3 Evaluación

Evaluar si el alumno puede: distinguir gas, precipitado y cambio de fase; identificar una variable causal; reconocer una incompatibilidad nueva de una familia estudiada; justificar cuándo falta información; interpretar una SDS educativa; y proponer una decisión preventiva coherente.

No usar como único indicador número de mezclas, tiempo de uso, espectáculo visual o ausencia de accidentes. Una experiencia de Carnegie Mellon encontró útil la estrategia de elicitar, confrontar y resolver ideas mediante pistas y retroalimentación, pero también observó dificultad en problemas de diseño experimental. Es evidencia contextual, no una garantía universal de aprendizaje. [CMU: evaluación del laboratorio virtual](https://www.cmu.edu/teaching/assessment/examples/courselevel-bytype/assignmentsexams/course_virtuallab-intromodernchem.html).

Un ensayo educativo futuro debería comparar conocimiento previo/posterior, explicación de un caso nuevo y retención. La transferencia a destrezas de laboratorio físico necesita su propia evaluación; manejar una pinza con MediaPipe no demuestra habilidad con reactivos reales. El historial educativo puede conservar acciones y resultados sin almacenar vídeo ni landmarks.

## 13. Curación de datos y control de calidad

### 13.1 Jerarquía propuesta

- Identidad y pesos atómicos: IUPAC/CIAAW y NIST.
- Propiedades de especie: bases evaluadas y publicaciones originales; anotar estados y condiciones.
- Peligros del producto: SDS de proveedor/forma/concentración y fuentes institucionales de seguridad.
- Incompatibilidad: datos específicos cuando existan; reglas de familias con alcance explícito.
- Contenidos didácticos: fuentes docentes contrastadas y revisión por especialista en química y enseñanza.

Una entrada de PubChem puede combinar datos calculados, experimentales y de varios contribuidores. Su procedencia debe conservarse y las discrepancias resolverse explícitamente. Para redistribución offline hay que revisar licencias por fuente, no asumir que todo contenido agregado tiene una autorización uniforme. [PubChem: descarga y procedencia](https://pubchem.ncbi.nlm.nih.gov/docs/downloads), [PubChem: fuentes y licencias](https://pubchem.ncbi.nlm.nih.gov/rest/source/).

### 13.2 Ficha de evidencia por fenómeno

Cada fenómeno que se incorpore debería entregar: pregunta didáctica; sustancias y especies; ecuación/modelo; rango; datos y condiciones de referencia; observables previstos; advertencias; alternativas de desenlace; incertidumbres; fuentes; revisión docente/científica; y criterios para declarar que el modelo ya no aplica.

No inventar una constante para completar una ficha. Marcar «sin dato» es un resultado válido de curación. Separar incertidumbre del dato, limitación del modelo y condición desconocida del escenario.

### 13.3 Matriz de verificación futura

| Caso | Qué debería comprobarse |
| --- | --- |
| Transferir una alícuota | Masa y composición transferidas coherentes; sin crear reactivo |
| Neutralizar | Balance y pH correctos para el modelo específico |
| Comparar ácido fuerte/débil | Diferencias de equilibrio justificadas |
| Añadir un tercer componente | Reevaluación de toda la mezcla y de su cobertura |
| Formar un precipitado | Especies, masa del sólido y fase acuosa coherentes |
| Producir gas | Balance entre fases y salida al entorno |
| Cambiar apertura del recipiente | Diferencia conceptual entre acumulación y escape |
| Calentar | Energía, fases y T coherentes; límites explícitos |
| Agotar un reactivo | Transformación limitada; no continúan apareciendo productos |
| Elegir combinación no soportada | Estado desconocido explícito; ningún sello de seguridad |
| Reiniciar/repetir | Resultado reproducible a iguales entradas y versión |
| Ejecutar sin cámara | Misma química y mismos avisos |
| Ejecutar offline | Fuentes y modelos del paquete disponibles y versiones identificables |

Estos son criterios de investigación para preparar aceptación posterior, no pruebas añadidas o ejecutadas ahora.

## 14. Expansión propuesta para discutir antes de implementar

No conviene medir progreso por cantidad de frascos. Se propone ampliar por dominios que cierren un ciclo de contenido, modelo, aviso y evaluación.

| Etapa candidata | Contenido | Condición para pasar a la siguiente |
| --- | --- | --- |
| A. Base científica | Corregir conceptos actuales y separar identidad de modelo | Presets coherentes con lo que realmente calcula el motor |
| B. Química acuosa | Disolución, ácidos débiles, tampones, carbonatos y precipitación | Datos curados y casos de referencia reproducibles |
| C. Gases y energía | Transferencia gas/líquido, presión y calor | Conservación y límites de los modelos documentados |
| D. Riesgos y accidentes | Reglas de incompatibilidad, confinamiento, vapores e incidentes | Advertencias trazables y revisión educativa de los desenlaces |
| E. Exploración ampliada | Más sustancias y problemas abiertos | Cada ampliación conserva cobertura explícita y funcionamiento del núcleo |

No son plazos ni un compromiso de incorporar todas las sustancias del anexo. Antes de implementarlas habrá que fijar nivel educativo, alcance del primer inventario, realismo cuantitativo y revisión especializada.

## 15. Entregables definidos por esta investigación

Queda una base para decidir: qué identidades químicas se consultarán; qué sustancias se ofrecerán para experimentar; qué fenómenos se calcularán; qué peligros se representarán cualitativamente; qué avisos acompañarán al error; y qué evidencias se exigirán antes de ampliar el alcance.

Los siguientes pasos serían convertir las decisiones aceptadas en una ampliación del SDD y en un catálogo curado versionado. **No se ha hecho esa ampliación ni se ha empezado la implementación en este trabajo.**

Pendientes explícitos: nivel/edad y currículo; ficha de cada producto y forma; selección numérica de constantes; licencias de redistribución; calibración y validación de modelos; revisión docente/científica; pruebas de aprendizaje y accesibilidad. El objetivo de «laboratorio completo» se mantiene como visión de crecimiento, con una frontera de conocimiento visible para cada ensayo.
