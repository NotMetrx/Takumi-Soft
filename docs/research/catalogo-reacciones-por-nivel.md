# Catálogo de reacciones químicas por nivel académico

Fecha: 2026-11-07. Complementa la [investigación principal](laboratorio-quimico-investigacion.md), el [catálogo de sustancias propuesto](catalogo-quimico-propuesto.md) y el [registro de fuentes](fuentes-quimica.md).

Este documento es la base de contenido para los siguientes proyectos de SymbioLab: el motor de reacciones y efectos, el selector de tabla periódica, los laboratorios por nivel y el aula virtual. Responde a cuatro preguntas para cada reacción: **qué ocurre** (ecuación balanceada), **qué se ve** (observable que el motor 3D debe mostrar), **qué consecuencia tiene** (código fijo de la taxonomía) y **en qué nivel tiene sentido** (primaria, secundaria o universidad).

**Límites.** Es un catálogo educativo y conceptual. No incluye cantidades, proporciones, concentraciones de trabajo ni procedimientos para preparar mezclas peligrosas, y excluye por completo la síntesis de materiales energéticos. Una reacción incluida aquí no está autorizada para realizarse fuera del simulador. Como en la investigación previa, «no aparece en el catálogo» significa **sin datos**, no «seguro».

**Niveles.** Genéricos e internacionales, sin atarse al currículo de un país: **primaria** (≈6–12 años), **secundaria** (≈12–17) y **universidad**. Cada nivel incluye lo de los anteriores, salvo indicación contraria.

## Cómo leer las tablas

| Columna | Significado |
| --- | --- |
| ID | P = primaria, S = secundaria, U = universidad, M = matriz de elementos |
| Ecuación | Balanceada en átomos y carga, verificada automáticamente (§9). `≈` marca un esquema representativo de un proceso sin ecuación única |
| Tipo | Familias de la §1 |
| Observable | Lo que se ve, oye o mide: es la especificación visual del motor 3D |
| Consecuencia | Códigos de la §2 |
| Peligro GHS | Pictogramas de reactivos y productos relevantes |
| Mezcla | `buena` (didáctica), `mala` (error o incompatibilidad que el alumno debe reconocer), `neutra` (no reacciona o es informativa) |
| EPP / Instrumentos | Equipo de protección e instrumentos asociados (mapa por nivel en §7) |
| Motor | `cuantitativo` (calculable con datos tabulados), `cualitativo` (fenómeno sin cifras fiables), `aviso` (solo advertencia, no se simula) |

## Resumen

| Nivel | Reacciones | Buenas | Malas | Neutras | Con `explosion` |
| --- | --- | --- | --- | --- | --- |
| Primaria | 39 | 22 | 9 | 8 | 0 |
| Secundaria | 50 | 34 | 16 | 0 | 1 |
| Universidad | 50 | 27 | 22 | 1 | 9 |

Además, la **matriz elemento × elemento** (§6) describe 98 combinaciones de los 24 elementos foco y clasifica los 276 pares posibles. Todas las ecuaciones no esquemáticas se verificaron automáticamente (§9).

## 1. Taxonomía de reacciones

| Tipo | Patrón general | Ejemplo representativo | Primer nivel |
| --- | --- | --- | --- |
| síntesis | A + B → AB | `2 Mg(s) + O₂(g) → 2 MgO(s)` | primaria |
| descomposición | AB → A + B | `2 H₂O₂(ac) → 2 H₂O(l) + O₂(g)` | primaria |
| desplazamiento-simple | A + BC → AC + B (serie de actividad) | `Zn(s) + Cu²⁺(ac) → Zn²⁺(ac) + Cu(s)` | primaria |
| doble-desplazamiento / precipitación | AB + CD → AD↓ + CB | `Ag⁺(ac) + Cl⁻(ac) → AgCl(s)` | primaria |
| ácido-base | H⁺ + base → sal + agua | `H⁺(ac) + OH⁻(ac) → H₂O(l)` | primaria |
| redox | Transferencia de electrones | `2 MnO₄⁻ + 5 H₂O₂ + 6 H⁺ → 2 Mn²⁺ + 5 O₂ + 8 H₂O` | primaria |
| combustión | Combustible + O₂ → óxidos + calor | `CH₄(g) + 2 O₂(g) → CO₂(g) + 2 H₂O(g)` | primaria |
| gas | Una reacción libera un gas | `CaCO₃(s) + 2 H⁺(ac) → Ca²⁺(ac) + H₂O(l) + CO₂(g)` | primaria |
| complejación | Ion metálico + ligandos | `Cu²⁺(ac) + 4 NH₃(ac) → [Cu(NH₃)₄]²⁺(ac)` | primaria |
| indicador | Cambio de color según pH u otra especie | Antocianinas de la col lombarda | primaria |
| electroquímica | Pilas y electrólisis | `2 H₂O(l) → 2 H₂(g) + O₂(g)` (electrólisis) | secundaria |
| alcalinos | Metales del grupo 1 y 2 con agua, aire o halógenos | `2 Na(s) + 2 H₂O(l) → 2 NaOH(ac) + H₂(g)` | secundaria |
| polimerización | Monómeros → cadena | Slime de PVA con bórax, nailon | universidad |
| orgánica | Esterificación, saponificación, oxidación de alcoholes | Ésteres con olor a fruta | primaria |
| térmica | Requiere calor o lo descompone | `CaCO₃(s) → CaO(s) + CO₂(g)` | primaria |
| catalítica | Un catalizador acelera sin consumirse | H₂O₂ con levadura (catalasa) o MnO₂ | primaria |
| equilibrio | Reversible; responde a Le Chatelier | `[Co(H₂O)₆]²⁺ + 4 Cl⁻ ⇌ [CoCl₄]²⁻ + 6 H₂O` | secundaria |
| cinética | La velocidad es el fenómeno visible | Reloj de yodo, Belousov-Zhabotinsky | primaria |
| físico | Cambio físico que parece reacción | Disolver sal, cristalizar, mezclar agua y aceite | primaria |

## 2. Taxonomía de consecuencias

Cada reacción lleva uno o más códigos. Esta tabla es también la **especificación visual del motor**: dice cómo debe representarse cada código y, sobre todo, cuándo no debe usarse. Así no todas las mezclas peligrosas terminan en el mismo efecto (§8 de la investigación principal).

| Código | Fenómeno real | Representación propuesta en 3D | Instrumento que lo confirma | No usar cuando… |
| --- | --- | --- | --- | --- |
| `color` | Cambia el color del líquido o sólido | Transición gradual del color del material; velocidad según la reacción | Colorímetro, observación | El cambio es solo dilución |
| `precipitado` | Aparece un sólido insoluble | Turbidez, partículas que sedimentan con el color real del sólido | Observación, filtración | Es cristalización por evaporación (`físico`) |
| `gas-inocuo` | Burbujas de CO₂ u O₂ | Burbujas, espuma, efervescencia audible; globo que se infla | Sensor de CO₂/O₂, astilla | El gas es tóxico o inflamable. En recipiente cerrado se combina con `sobrepresion` |
| `gas-inflamable` | Burbujas de un gas que no es tóxico pero arde (H₂, C₂H₂, CH₄) | Las mismas burbujas que `gas-inocuo`, más un indicador de inflamabilidad; una llama cercana dispara `llama`, `llamarada` o `explosion` según la fila | Sensor de gas (% LIE), astilla encendida | — |
| `gas-toxico` | Gas tóxico o irritante | **Solo se colorea si el gas real tiene color** (Cl₂ amarillo verdoso, NO₂ pardo, Br₂ pardo rojizo, I₂ violeta). Los gases incoloros (CO, H₂S, cloraminas, SO₂, HCl) se muestran con el sensor, la alarma y los síntomas del avatar, nunca con humo verde genérico | Sensor de gas con alarma | — |
| `exotermica` | Sube la temperatura | Termómetro que sube, vapor, ebullición si corresponde, brillo solo en casos extremos | Termómetro, cámara térmica | — |
| `endotermica` | Baja la temperatura | Termómetro que baja, condensación o escarcha en el vaso | Termómetro | — |
| `llama` | Combustión sostenida | Llama con el color de emisión real (Na amarillo, K lila, Li y Sr carmesí, Cu verde-azulado, B verde, Ca rojo-anaranjado) | Termómetro, detector de llama | No hay combustible y comburente reales |
| `llamarada` | Destello breve de combustión rápida sin confinamiento | Flash, bola de fuego breve, humo | — | Hay confinamiento y sobrepresión |
| `sobrepresion` | El gas acumulado en un recipiente cerrado supera su resistencia | Globo o tapón que salta, recipiente que se deforma o se rompe; manómetro en rojo | Manómetro | La causa es una combustión explosiva (`explosion`) |
| `explosion` | Deflagración o detonación: mezcla gaseosa o polvo en sus límites de inflamabilidad con ignición, reacción extremadamente violenta (K con Br₂, Cs con agua) o explosión física de vapor (agua sobre metal fundido). La rotura de un recipiente por gas acumulado **no** es `explosion`, es `sobrepresion` | Destello, onda expansiva, sonido fuerte, fragmentos; intensidad según el caso del catálogo | Manómetro (pico), sonómetro | Solo hay calor, gas o incompatibilidad: usar la consecuencia real |
| `salpicadura-corrosiva` | Gotas proyectadas de líquido corrosivo | Gotas que saltan y marcan la mesa o el EPP | — | — |
| `humo` | Partículas sólidas finas en el aire (NH₄Cl, MgO, P₄O₁₀) | Humo blanco o del color real del sólido | — | Es un gas incoloro (`gas-toxico`) |
| `luz` | Emisión de luz: Mg ardiendo, quimioluminiscencia | Emisión intensa (bloom) o brillo en la oscuridad | Luxómetro | — |
| `cambio-fisico` | Algo visible cambia sin reacción química: crecen cristales, se disuelve un sólido, se forma una aleación | Cristales que crecen, sólido que desaparece al disolverse | Balanza, lupa | El resultado es «no pasa nada» (`sin-reaccion`) |
| `polimero` | Se forma un sólido flexible, una película o un gel (nailon, slime) | Película o hilo que se puede estirar, gel viscoso; no partículas que sedimentan | — | Es un sólido granular insoluble (`precipitado`) |
| `electricidad` | La reacción produce corriente (pilas) | LED que se enciende, aguja del voltímetro | Voltímetro, amperímetro | Es electrólisis: ahí la corriente es una entrada, no una consecuencia |
| `olor` | Se forma una sustancia con olor característico e inocuo (ésteres) | Indicador de olor en la interfaz; no hay forma visual honesta | — | El olor es de un gas tóxico (`gas-toxico`): el olor no mide el peligro |
| `sin-reaccion` | No pasa nada en condiciones de aula | Se dice explícitamente: «no reaccionan» | — | Faltan datos: entonces es «sin datos», no `sin-reaccion` |

### 2.1 Intensidad de las explosiones

Un mismo código `explosion` cubre desde el «pop» de un tubo de ensayo hasta el cesio en agua. Su intensidad la asigna el catálogo, no se deduce de cantidades (§8.6). Escala: **baja** (sonido seco, sin daños), **media** (estallido, tapón o tubo proyectado), **alta** (onda de presión, rotura de vidrio, fuego), **extrema** (destrucción del recipiente y proyección de material).

| Fila | Caso | Intensidad |
| --- | --- | --- |
| S15 | «Pop» del H₂ con astilla en un tubo | baja |
| M01 | H₂ + O₂, mezcla de gases con chispa | media |
| M02, U27 | H₂ + Cl₂ con luz | media |
| U37 | Peróxidos en éteres envejecidos | media |
| U10 | H₂/O₂ premezclado con ignición | alta |
| U04 | Rubidio en agua | alta |
| U14 | Metano acumulado en un recinto con chispa | alta |
| U15, M20 | Nube de polvo (harina, aluminio) confinada | alta |
| U22 | Agua sobre hierro fundido (vapor) | alta |
| U35 | Oxidante fuerte con materia orgánica | alta |
| M54 | Potasio con bromo líquido | alta |
| U05 | Cesio en agua | extrema |

**Tres etiquetas de confianza.** Cada desenlace mostrado lleva una de las etiquetas de la §8.2 de la investigación principal: *resultado calculado dentro del modelo*, *consecuencia plausible según una regla documentada* o *reconstrucción didáctica de un caso*. La columna **Motor** de cada fila indica cuál corresponde por defecto.

## 3. Nivel primaria

Criterio del nivel: entran fenómenos de la cocina y de casa que un niño de 6 a 12 años puede ver, oír o tocar (burbujas, espuma, cambios de color, calor y frío, óxido, llama de una vela), casi todos con sustancias de uso doméstico y descritos con una ecuación sencilla o con un esquema marcado `≈` cuando no existe una ecuación única honesta. Las malas mezclas se presentan como avisos amables: gases irritantes de limpiadores, envases cerrados que se hinchan y saltan, quemaduras por calor o por sustancias cáusticas y llamaradas en la cocina. Las que solo sirven para avisar llevan `aviso` en Motor, sin simular el proceso. Se excluye cualquier explosión, todo reactivo que no sea doméstico salvo los indicadores clásicos de aula (tintura de yodo, agua de cal) y cualquier mezcla cuyo desenlace real sea una explosión. También se excluyen los ensayos que requieren llama abierta manipulada por el alumno, salvo una vela vigilada.

### Burbujas de gas: ácidos con bicarbonato

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P01 | `NaHCO₃(s) + CH₃COOH(ac) → CH₃COONa(ac) + H₂O(l) + CO₂(g)` | ácido-base; gas; térmica | Burbujeo intenso y espuma blanca que sube; el vaso se enfría unos grados | gas-inocuo, endotermica | — | buena | gafas | termómetro, balanza | cuantitativo | [ACS Middle School Chemistry 6.7](https://www.acs.org/middleschoolchemistry/lessonplans/chapter6/lesson7.html) |
| P02 | `3 NaHCO₃(s) + C₆H₈O₇(ac) → Na₃C₆H₅O₇(ac) + 3 H₂O(l) + 3 CO₂(g)` | ácido-base; gas | Al echar zumo de limón (ácido cítrico) sobre bicarbonato aparece una espuma burbujeante, algo más suave que con vinagre | gas-inocuo | — | buena | gafas | balanza | cuantitativo | [Scientific American / Science Buddies: Carbonation Countdown](https://www.scientificamerican.com/article/bring-science-home-carbonation-time/) |
| P03 | `HCO₃⁻(ac) + H⁺(ac) → H₂O(l) + CO₂(g)` | ácido-base; gas; cinética | Una tableta efervescente se disuelve entre burbujas y suena a efervescencia; en agua caliente termina mucho antes que en agua fría | gas-inocuo | — | buena | gafas | termómetro, cronómetro | cualitativo | [Scientific American / Science Buddies: Carbonation Countdown](https://www.scientificamerican.com/article/bring-science-home-carbonation-time/) |
| P04 | `NaHCO₃(s) + CH₃COOH(ac) → CH₃COONa(ac) + H₂O(l) + CO₂(g)` | ácido-base; gas | Un globo colocado en la boca de la botella se infla solo; con más reactivos el globo se infla más | gas-inocuo | — | buena | gafas | balanza, cinta métrica | cuantitativo | [ACS: More Than Hot Air](https://www.acs.org/content/dam/acsorg/education/outreach/kidschemistry/activities/more-than-hot-air.pdf) |
| P05 | `NaHCO₃(s) + CH₃COOH(ac) → CH₃COONa(ac) + H₂O(l) + CO₂(g)` | ácido-base; gas; combustión | El CO₂ invisible se "vierte" desde un vaso sobre velitas encendidas y las llamas se apagan una a una | gas-inocuo | — | buena | gafas, pelo recogido, adulto con la vela | mechero (vela), sensor de gas | cualitativo | [AACT: Fire Extinguisher](https://teachchemistry.org/classroom-resources/fire-extinguisher); [Science World: Firefighting CO₂](https://www.scienceworld.ca/resource/firefighting-co2-balloons/) |
| P06 | `NaHCO₃(s) + CH₃COOH(ac) → CH₃COONa(ac) + H₂O(l) + CO₂(g)` | ácido-base; gas | En una botella con tapón la presión crece, la botella se pone dura y el tapón sale disparado con un "pop" y salpica espuma | gas-inocuo, sobrepresion | — | mala | gafas | manómetro | cuantitativo | [OpenStax Chemistry 2e 9.2](https://openstax.org/books/chemistry-2e/pages/9-2-relating-pressure-volume-amount-and-temperature-the-ideal-gas-law) |
| P07 | `CO₂(s) → CO₂(g)` | físico; gas | Hielo seco que humea; en un recipiente cerrado el gas no puede salir y el envase se hincha hasta reventar; tocarlo quema por frío | sobrepresion | — | mala | guantes térmicos, gafas | manómetro, termómetro | aviso | [WorkSafe Victoria: trabajar con hielo seco](https://www.worksafe.vic.gov.au/safety-alerts/working-dry-ice) |

### Colores que cambian: indicadores de cocina

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P08 | `≈ antocianina (morada) + H⁺(ac) → catión flavilio (rojo-rosa)` | indicador; ácido-base | El jugo morado de col lombarda se vuelve rosa o rojo con vinagre o limón | color | — | buena | gafas | papel indicador, pHmetro | cualitativo | [ACS: Red Cabbage Indicator](https://www.acs.org/education/activities/red-cabbage-indicator.html) |
| P09 | `≈ antocianina (morada) + OH⁻(ac) → forma básica⁻ (azul-verde) + H₂O(l)` | indicador; ácido-base | El mismo jugo se vuelve azul con bicarbonato y verde con detergente en polvo | color | — | buena | gafas | papel indicador, pHmetro | cualitativo | [ACS: Red Cabbage Indicator](https://www.acs.org/education/activities/red-cabbage-indicator.html) |
| P10 | `≈ curcumina (amarilla) + OH⁻(ac) → curcumina desprotonada⁻ (rojo-anaranjada) + H₂O(l)` | indicador; ácido-base | Papel teñido con cúrcuma pasa de amarillo a rojo anaranjado al tocar agua con bicarbonato; con vinagre sigue amarillo (sirve para "mensajes secretos") | color | — | buena | gafas, delantal (mancha) | papel indicador | cualitativo | [ChemEdX: Three Turmeric Treats](https://chemedx.org/node/5242) |
| P11 | `≈ tearubigina⁻ (marrón rojizo) + H⁺(ac) → tearubigina neutra (ámbar claro)` | indicador; ácido-base | El té negro se aclara al añadir limón | color | — | buena | — | pHmetro, colorímetro | cualitativo | [The Conversation: lemon juice and tea](https://theconversation.com/ive-always-wondered-why-does-lemon-juice-lighten-the-colour-of-tea-91324) |
| P12 | `≈ I₂(ac) + I⁻(ac) ⇌ I₃⁻(ac); I₃⁻(ac) + almidón (amilosa) → complejo azul-negro` | complejación; indicador | Una gota de yodo marrón anaranjado se vuelve azul oscuro, casi negra, sobre papa cortada, pan o harina | color | GHS07 | buena | gafas, guantes de nitrilo (mancha) | cuentagotas | cualitativo | [SFI Primary Science: Exploring Starch](https://www.sfi.ie/site-files/primary-science/media/pdfs/col/exploring_starch.pdf) |
| P13 | `≈ I₂(ac) + sal o azúcar → sin cambio` | indicador | Sobre sal o azúcar la gota de yodo se queda marrón anaranjada: es la prueba de control, no hay almidón | sin-reaccion | GHS07 | neutra | gafas, guantes de nitrilo | cuentagotas | cualitativo | [SFI Primary Science: Exploring Starch](https://www.sfi.ie/site-files/primary-science/media/pdfs/col/exploring_starch.pdf) |

### Alimentos que reaccionan

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P14 | `≈ caseína (micelas dispersas en la leche) + H⁺(ac) → caseína coagulada (cuajada)` | ácido-base; precipitación | La leche caliente con vinagre forma grumos blancos (cuajada) que se separan de un líquido amarillento; los grumos se moldean como plástico | precipitado | — | buena | guantes térmicos (leche caliente, la calienta un adulto) | termómetro, colador | cualitativo | [Scientific American / Science Buddies: Milk Plastic](https://www.scientificamerican.com/article/bring-science-home-milk-plastic/) |
| P15 | `CaCO₃(s) + 2 CH₃COOH(ac) → Ca(CH₃COO)₂(ac) + H₂O(l) + CO₂(g)` | ácido-base; gas | Un huevo crudo en vinagre se cubre de burbujitas; días después la cáscara desaparece y queda un huevo blando y translúcido | gas-inocuo | — | buena | gafas | balanza, cinta métrica | cuantitativo | [Science World: Naked Eggs](https://www.scienceworld.ca/resource/naked-eggs-acid-base-reaction/); [AACT: Soft Eggs](https://teachchemistry.org/classroom-resources/soft-eggs) |
| P16 | `≈ polifenol + O₂(g) → o-quinona → melaninas (pardas)` | redox; catalítica; orgánica | La manzana cortada se pone marrón en la superficie al cabo de un rato | color | — | neutra | — | cronómetro, colorímetro | cualitativo | [UW–Madison Extension: Apple Browning Experiment](https://health.extension.wisc.edu/files/2024/11/Apple-Browning-Experiment.pdf) |
| P17 | `≈ o-quinona + C₆H₈O₆ (vitamina C) → o-difenol + C₆H₆O₆` | redox; orgánica | La rodaja untada con limón sigue blanca mucho más tiempo que la rodaja sin nada | color | — | buena | — | cronómetro, colorímetro | cualitativo | [UW–Madison Extension: Apple Browning Experiment](https://health.extension.wisc.edu/files/2024/11/Apple-Browning-Experiment.pdf) |
| P18 | `≈ C₆H₁₂O₆(ac) → 2 C₂H₅OH(ac) + 2 CO₂(g)` | orgánica; gas; catalítica | Levadura con azúcar y agua tibia: espuma que crece y un globo que se infla poco a poco; es el mismo gas que hace subir la masa del pan | gas-inocuo | — | buena | — | termómetro, cinta métrica | cualitativo | [Scientific American / Science Buddies: Yeasty Beasties](https://www.scientificamerican.com/article/single-celled-science-yeasty-beasties/) |
| P19 | `2 H₂O₂(ac) → 2 H₂O(l) + O₂(g)` | descomposición; catalítica; gas | "Pasta de dientes de elefante": con agua oxigenada de botiquín, levadura y jabón sale una columna de espuma tibia | gas-inocuo, exotermica | GHS07 | buena | gafas, guantes de nitrilo | termómetro | cualitativo | [Scientific American / Science Buddies: Elephant Toothpaste](https://www.scientificamerican.com/article/make-elephant-toothpaste/) |
| P20 | `2 H₂O₂(ac) → 2 H₂O(l) + O₂(g)` | descomposición; catalítica; gas | Si se usa agua oxigenada concentrada (industrial, no de botiquín), la espuma sale muy caliente y con vapor, salpica y quema la piel y los ojos | exotermica, salpicadura-corrosiva | GHS03, GHS05, GHS07 | mala | gafas, guantes de nitrilo, bata | termómetro | aviso | [ILO ICSC 0164: peróxido de hidrógeno](https://www.ilo.org/dyn/icsc/showcard.display?p_card_id=0164) |

### Metales: óxido, brillo y verdín

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P21 | `≈ 4 Fe(s) + 3 O₂(g) + 6 H₂O(l) → 4 Fe(OH)₃(s)` | redox; síntesis | La lana de acero húmeda se cubre de herrumbre naranja-marrón en días; si se moja antes con vinagre se oxida más rápido | color | — | neutra | guantes (astillas de acero) | termómetro, balanza | cualitativo | [RSC: How much oxygen is used when iron wool rusts?](https://edu.rsc.org/experiments/how-much-oxygen-is-used-when-iron-wool-rusts/453.article) |
| P22 | `4 Fe(s) + 3 O₂(g) → 2 Fe₂O₃(s)` | redox; síntesis; térmica | Al abrir una compresa calentadora de manos, el polvo de hierro se oxida y la bolsa se calienta durante horas | exotermica | — | buena | — | termómetro | cuantitativo | [LibreTexts: Thermochemistry of Hand Warmers](https://chem.libretexts.org/Courses/Duke_University/CHEM_110_Honors_Writing_Projects/Duke_CHEM_110_Fall_2022:_Cox_and_Shorb/Thermochemistry_of_Hand_Warmers_in_Everyday_Life) |
| P23 | `CuO(s) + 2 H⁺(ac) → Cu²⁺(ac) + H₂O(l)` | ácido-base | Monedas de cobre oscuras quedan brillantes y rosadas tras unos segundos en vinagre con sal | color | — | buena | gafas | cronómetro | cualitativo | [Exploratorium: Copper Caper](https://annex.exploratorium.edu/science-explorer/copper_caper.html); [Scientific American / Science Buddies: Shine Bright Like a Penny](https://www.scientificamerican.com/article/shine-bright-like-a-penny/) |
| P24 | `Fe(s) + Cu²⁺(ac) → Fe²⁺(ac) + Cu(s)` | redox; desplazamiento-simple | Un clavo de acero dejado en el vinagre con sal que limpió las monedas se cubre de una capa cobriza | color | — | buena | gafas | cronómetro | cualitativo | [Exploratorium: Copper Caper](https://annex.exploratorium.edu/science-explorer/copper_caper.html) |
| P25 | `≈ 2 Cu(s) + O₂(g) + CO₂(g) + H₂O(l) → Cu₂(OH)₂CO₃(s)` | redox; síntesis | El cobre rojizo se oscurece y, con los años al aire libre, se cubre de una capa verde azulada (como la Estatua de la Libertad) | color | — | neutra | — | — | cualitativo | [ACS Reactions: The Statue of Liberty's true colors](https://www.acs.org/pressroom/reactions/library/the-statue-of-libertys-true-colors.html); [RSC: Why does copper jewellery turn your skin green?](https://edu.rsc.org/everyday-chemistry/why-does-copper-jewellery-turn-your-skin-green/4020461.article) |

### Fuego y aire: la vela

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P26 | `C₂₅H₅₂(s) + 38 O₂(g) → 25 CO₂(g) + 26 H₂O(g)` | combustión; redox | Llama amarilla de la vela; un vaso frío sobre ella se empaña con gotitas de agua | llama, exotermica, luz | — | buena | pelo recogido, adulto presente | mechero (vela), termómetro, sensor de gas | cuantitativo | [RSC: Identifying the products of combustion](https://edu.rsc.org/experiments/identifying-the-products-of-combustion/707.article) |
| P27 | `C₂₅H₅₂(s) + 38 O₂(g) → 25 CO₂(g) + 26 H₂O(g)` | combustión; redox | Al tapar la vela con un frasco, la llama se achica y se apaga cuando falta oxígeno | llama | — | buena | pelo recogido, adulto presente | sensor de gas, cronómetro | cualitativo | [RSC: The candle in the bell jar](https://edu.rsc.org/resources/the-candle-in-the-bell-jar/605.article) |
| P28 | `Ca(OH)₂(ac) + CO₂(g) → CaCO₃(s) + H₂O(l)` | precipitación; ácido-base | Al soplar con una pajita en agua de cal transparente, se vuelve blanca lechosa: el aliento lleva CO₂ | precipitado | GHS05, GHS07 | buena | gafas, guantes de nitrilo; soplar sin aspirar | pajita | cuantitativo | [Education.com: The Limewater Carbon Dioxide Test](https://www.education.com/activity/article/gas-sniffers/) |
| P29 | `≈ (C₆H₁₀O₅)ₙ(s) + 6n O₂(g) → 6n CO₂(g) + 5n H₂O(g)` | combustión; redox | Una servilleta o una cortina demasiado cerca de la vela se prende: llama grande, humo gris y ceniza negra | llama, humo, exotermica | — | mala | adulto presente; apagar la vela al salir | — | aviso | [USFA: Candle fire safety](https://www.usfa.fema.gov/prevention/home-fires/prevent-fires/candle) |
| P30 | `≈ 2 C₅₇H₁₀₄O₆(l) + 160 O₂(g) → 114 CO₂(g) + 104 H₂O(g)` | combustión; físico | Si se echa agua a una sartén con aceite ardiendo, el agua hierve de golpe, el aceite salta y la llama crece en una bola de fuego; lo correcto es tapar la sartén y apagar el fuego | llamarada, humo | — | mala | adulto presente; tapa a mano | — | aviso | [USFA: Cooking Safety](https://www.usfa.fema.gov/downloads/fief/handouts/fief_cooking_safety_flyer.pdf) |

### Calor y frío: disolver, hidratar o reaccionar

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P31 | `NH₄NO₃(s) → NH₄⁺(ac) + NO₃⁻(ac)` | físico; térmica | Al apretar una compresa fría instantánea (bolsa cerrada de fábrica) se rompe la bolsita de agua y la compresa se enfría mucho | endotermica | GHS03, GHS07 | buena | no abrir la bolsa | termómetro | cuantitativo | [OpenStax Chemistry 2e 5.2, ejemplo 5.6](https://openstax.org/books/chemistry-2e/pages/5-2-calorimetry) |
| P32 | `NaCl(s) → Na⁺(ac) + Cl⁻(ac)` | físico | La sal desaparece en el agua al remover; no hay burbujas, ni cambio de color, ni calor: se disuelve, no reacciona | cambio-fisico | — | neutra | — | balanza, termómetro | cuantitativo | [ACS Middle School Chemistry 5.3](https://www.acs.org/middleschoolchemistry/lessonplans/chapter5/lesson3.html) |
| P33 | `≈ aceite(l) + H₂O(l) → aceite(l) + H₂O(l) (dos capas)` | físico | El aceite flota en una capa amarilla sobre el agua; al agitar se rompe en gotas y vuelve a separarse | sin-reaccion | — | neutra | — | — | cualitativo | [ACS Middle School Chemistry 5.7](https://www.acs.org/content/dam/acsorg/msc/downloads/chapter-5/lesson-7/ch5-l7-lesson-plan.pdf) |
| P34 | `C₁₂H₂₂O₁₁(ac) → C₁₂H₂₂O₁₁(s)` | físico | Del agua muy azucarada crecen en días cristales transparentes en un palito o hilo ("caramelo de roca") | cambio-fisico | — | neutra | guantes térmicos (el almíbar caliente lo prepara un adulto) | balanza, termómetro, lupa | cualitativo | [Penn State MRSEC: Growing Crystals](https://www.mrsec.psu.edu/education-outreach/public/nano-activities-kids/liquid-metal/growing-crystals) |
| P35 | `K⁺(ac) + Al³⁺(ac) + 2 SO₄²⁻(ac) + 12 H₂O(l) → KAl(SO₄)₂·12H₂O(s)` | físico; precipitación | Al evaporarse el agua crecen cristales de alumbre transparentes con forma de octaedro (con sal salen cubitos) | cambio-fisico | — | neutra | gafas, guantes de nitrilo | balanza, lupa | cualitativo | [UW–Madison: How to grow crystals](https://wicgc.chem.wisc.edu/how-to-grow-crystals/); [Penn State MRSEC: Growing Crystals](https://www.mrsec.psu.edu/education-outreach/public/nano-activities-kids/liquid-metal/growing-crystals) |
| P36 | `CaO(s) + H₂O(l) → Ca(OH)₂(s)` | síntesis; térmica | La cal viva con agua chisporrotea, humea y se calienta tanto que puede hervir el agua y quemar; el polvo cáustico daña ojos y piel | exotermica, salpicadura-corrosiva | GHS05, GHS07 | mala | gafas, guantes de nitrilo, bata | termómetro | aviso | [ILO ICSC 0409: óxido de calcio](https://www.ilo.org/dyn/icsc/showcard.display?p_card_id=0409) |
| P37 | `NaOH(s) → Na⁺(ac) + OH⁻(ac)` | físico; térmica | Las bolitas del desatascador en agua se calientan mucho y pueden salpicar un líquido que quema la piel y los ojos | exotermica, salpicadura-corrosiva | GHS05 | mala | gafas, guantes de nitrilo, bata | termómetro | aviso | [ILO ICSC 0360: hidróxido de sodio](https://www.ilo.org/dyn/icsc/showcard.display?p_card_id=360) |

### Limpiadores de casa que nunca se mezclan

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P38 | `OCl⁻(ac) + Cl⁻(ac) + 2 H⁺(ac) → Cl₂(g) + H₂O(l)` | redox; gas | Lejía con vinagre o con un limpiador ácido: olor fuerte a cloro, tos y ojos que pican; en el simulador solo aparece la señal de peligro y la ventana abierta | gas-toxico | GHS05, GHS06, GHS09 | mala | no mezclar; ventilar y salir | sensor de gas | aviso | [Washington State DOH: Bleach mixing dangers](https://doh.wa.gov/community-and-environment/contaminants/bleach-mixing-dangers) |
| P39 | `NH₃(ac) + OCl⁻(ac) → NH₂Cl(ac) + OH⁻(ac)` | redox; gas | Lejía con limpiacristales amoniacal: olor picante, tos y falta de aire por las cloraminas que escapan; en el simulador solo hay aviso | gas-toxico | GHS05, GHS07, GHS09 | mala | no mezclar; ventilar y salir | sensor de gas | aviso | [Washington State DOH: Bleach mixing dangers](https://doh.wa.gov/community-and-environment/contaminants/bleach-mixing-dangers) |

### Excluidas deliberadamente
- Cualquier explosión (hidrógeno y oxígeno, polvo de harina, metales alcalinos con agua, termita) — el nivel primaria no contiene `explosion`; estos casos pasan a secundaria o universidad.
- Lejía con alcohol o con acetona — produce compuestos clorados tóxicos que van más allá de las dos malas mezclas domésticas documentadas; no aporta nada a este nivel.
- Aluminio con desatascador de sosa — libera hidrógeno inflamable; el desenlace real puede ser una llama o una explosión, así que no entra en primaria.
- Ácido con sulfuros (H₂S) y otras generaciones de gases tóxicos de libro de texto — quedan para secundaria, y solo como `aviso`.
- Agua oxigenada con vinagre (ácido peracético) — corrosiva y sin un observable atractivo para niños.
- "Sangre de dragón" como indicador — no se encontró una fuente verificable de un ensayo infantil con ese nombre; la versión habitual del "agua que se vuelve vino" usa fenolftaleína (GHS08), no apta para primaria. La sustituyen la col lombarda (P08–P09) y la cúrcuma (P10).
- Cohete con bote de carrete y tableta efervescente — lanza un proyectil por sobrepresión; el concepto ya lo cubre P06 como aviso de envase cerrado.
- Combustión de cinta de magnesio — luz muy intensa que daña la vista y llama metálica difícil de apagar; pasa a secundaria.
- Mezclar cal viva o sosa para "ver el calor" fuera de la advertencia — P36 y P37 son solo `aviso`; no se modela ninguna preparación.
- Mentos con refresco y "leche mágica" (leche, colorante y jabón) — son fenómenos físicos de nucleación y de tensión superficial que no enseñan una reacción en este nivel.

## 4. Nivel secundaria

Criterio del nivel: entran las reacciones clásicas del aula de 12–17 años: neutralización con indicador y calor, metales con ácidos y prueba del "pop", serie de actividad, precipitados de colores, combustiones, electrólisis sencilla, pilas, descomposiciones térmicas y catálisis. Aquí ya aparecen consecuencias serias de libro de texto (gas tóxico de malas mezclas domésticas, salpicadura corrosiva al diluir mal, calor fuerte, llama, llamarada, sobrepresión y la explosión del H₂ o del potasio en agua), siempre solo como ecuación, observable y peligro. Las reacciones marcadas como demostración del docente (alcalinos, azúcar con H₂SO₄ concentrado, cobre con HNO₃ concentrado, KMnO₄ con glicerina) se muestran como fenómeno o aviso, nunca como práctica del alumno. Se excluyen los materiales energéticos, los gases tóxicos fuera de los casos domésticos y de libro de texto, y la química orgánica o de equilibrio cuantitativo propia de la universidad.

### Ácidos, bases e indicadores

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S01 | `HCl(ac) + NaOH(ac) → NaCl(ac) + H₂O(l)` | ácido-base; indicador | La fenolftaleína pasa de rosa a incolora justo en el punto de equivalencia; el termómetro sube varios grados y luego se estabiliza | color, exotermica | GHS05 | buena | gafas, guantes de nitrilo | termómetro, pHmetro, bureta | cuantitativo | [OpenStax 14.7](https://openstax.org/books/chemistry-2e/pages/14-7-acid-base-titrations); [RSC: energía en la neutralización](https://edu.rsc.org/download?ac=506445) |
| S02 | `H₂SO₄(ac) + 2 NaOH(ac) → Na₂SO₄(ac) + 2 H₂O(l)` | ácido-base; indicador | El indicador universal recorre rojo → naranja → verde (neutro) → azul → violeta al añadir base; la disolución se calienta | color, exotermica | GHS05 | buena | gafas, guantes de nitrilo | pHmetro, papel indicador, termómetro | cuantitativo | [OpenStax 14.7](https://openstax.org/books/chemistry-2e/pages/14-7-acid-base-titrations) |
| S03 | `NaOH(s) → Na⁺(ac) + OH⁻(ac)` | físico; térmica | Las lentejas blancas se disuelven y el vaso se calienta mucho; la disolución resulta resbaladiza al tacto (corrosiva) | exotermica | GHS05 | buena | gafas, guantes de nitrilo, bata | termómetro, balanza | cuantitativo | [ILO ICSC 0360: NaOH](https://www.ilo.org/dyn/icsc/showcard.display?p_card_id=360) |
| S04 | `NH₃(g) + HCl(g) → NH₄Cl(s)` | ácido-base; síntesis; gas | Dos gases incoloros forman un humo blanco; en un tubo largo aparece un anillo blanco más cerca del extremo del HCl (el NH₃ difunde más rápido) | humo | GHS05, GHS07, GHS09 | buena | gafas, guantes, campana de extracción | regla, cronómetro | cuantitativo | [Chemguide: difusión](https://chemguide.co.uk/14to16/slg/diffusion.html); [RSC: notas técnicas NH₃/HCl](https://edu.rsc.org/download?ac=513800) |
| S05 | `H₂SO₄(l) + H₂O(l) → H₃O⁺(ac) + HSO₄⁻(ac)` | ácido-base; térmica | **Error: echar agua sobre el ácido concentrado.** El agua flota, hierve en la superficie, chisporrotea y proyecta gotas de ácido y vapor | exotermica, salpicadura-corrosiva | GHS05 | mala | careta, guantes, bata | termómetro | cualitativo | [ILO ICSC 0362: H₂SO₄ concentrado](https://inchem.org/documents/icsc/icsc/eics0362.htm) |
| S06 | `ClO⁻(ac) + Cl⁻(ac) + 2 H⁺(ac) → Cl₂(g) + H₂O(l)` | redox; gas | **Lejía + salfumán (HCl).** Burbujeo y gas amarillo verdoso de olor picante a piscina; tos e irritación de ojos | gas-toxico | GHS05, GHS06, GHS09 | mala | no mezclar; ventilación | sensor de gas | aviso | [Washington DOH: mezclar lejía](https://doh.wa.gov/community-and-environment/contaminants/bleach-mixing-dangers) |
| S07 | `ClO⁻(ac) + Cl⁻(ac) + 2 CH₃COOH(ac) → Cl₂(g) + H₂O(l) + 2 CH₃COO⁻(ac)` | redox; gas | **Lejía + vinagre.** Mismo gas irritante que S06, con menos burbujeo pero igual de peligroso en un baño cerrado | gas-toxico | GHS05, GHS06, GHS09 | mala | no mezclar; ventilación | sensor de gas | aviso | [Washington DOH: mezclar lejía](https://doh.wa.gov/community-and-environment/contaminants/bleach-mixing-dangers) |
| S08 | `NH₃(ac) + ClO⁻(ac) → NH₂Cl(ac) + OH⁻(ac)` | redox; gas | **Lejía + amoníaco.** Sin cambio de color visible; olor acre; se liberan vapores de cloraminas que irritan ojos y vías respiratorias | gas-toxico | GHS05, GHS06, GHS09 | mala | no mezclar; ventilación | sensor de gas | aviso | [Washington DOH: mezclar lejía](https://doh.wa.gov/community-and-environment/contaminants/bleach-mixing-dangers) |

### Carbonatos, gases y pruebas de gases

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S09 | `CaCO₃(s) + 2 HCl(ac) → CaCl₂(ac) + H₂O(l) + CO₂(g)` | ácido-base; gas | Efervescencia sobre los trozos de mármol, que se van disolviendo; la masa del sistema abierto disminuye | gas-inocuo | GHS07 | buena | gafas | balanza, jeringa de gas, cronómetro | cuantitativo | [Chemguide: ácidos y carbonatos](https://chemguide.co.uk/14to16/acids/carbonates.html) |
| S10 | `Ca(OH)₂(ac) + CO₂(g) → CaCO₃(s) + H₂O(l)` | precipitación; gas | Prueba del CO₂: el agua de cal transparente se vuelve lechosa; con mucho CO₂ vuelve a aclararse | precipitado | GHS05 | buena | gafas | — | cuantitativo | [Chemguide: ácidos y carbonatos](https://chemguide.co.uk/14to16/acids/carbonates.html) |
| S11 | `NaHCO₃(s) + CH₃COOH(ac) → CH₃COONa(ac) + H₂O(l) + CO₂(g)` | ácido-base; gas | **Error: hacerlo en un frasco tapado.** El envase se hincha, el tapón sale disparado y proyecta espuma | gas-inocuo, sobrepresion | — | mala | gafas | manómetro | cuantitativo | [OpenStax 9.2: ley del gas ideal](https://openstax.org/books/chemistry-2e/pages/9-2-relating-pressure-volume-amount-and-temperature-the-ideal-gas-law) |
| S12 | `FeS(s) + 2 HCl(ac) → FeCl₂(ac) + H₂S(g)` | ácido-base; gas | Burbujeo y olor a huevo podrido que "desaparece" porque el olfato se fatiga, no porque se vaya el gas | gas-toxico | GHS02, GHS04, GHS06, GHS09 | mala | campana de extracción | sensor de gas | aviso | [NIOSH: H₂S](https://www.cdc.gov/niosh/npg/npgd0337.html) |

### Metales y ácidos (o bases)

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S13 | `Mg(s) + 2 HCl(ac) → MgCl₂(ac) + H₂(g)` | desplazamiento-simple; redox; gas | Burbujeo muy vigoroso, la cinta gris desaparece en segundos y el tubo se calienta | gas-inflamable, exotermica | GHS02, GHS07 | buena | gafas | termómetro, cronómetro, jeringa de gas | cuantitativo | [RSC: metales y ácidos](https://edu.rsc.org/resources/metals-and-acids-experiment/446.article) |
| S14 | `Fe(s) + 2 HCl(ac) → FeCl₂(ac) + H₂(g)` | desplazamiento-simple; redox; gas | Burbujeo lento sobre las limaduras; la disolución se vuelve verde muy pálido (Fe²⁺) | gas-inflamable, color | GHS07 | buena | gafas | cronómetro | cuantitativo | [RSC: metales y ácidos](https://edu.rsc.org/resources/metals-and-acids-experiment/446.article) |
| S15 | `2 H₂(g) + O₂(g) → 2 H₂O(g)` | combustión; síntesis; redox | Prueba del hidrógeno: al acercar una astilla encendida a la boca del tubo se oye un "pop" agudo y aparece vaho | explosion | GHS02 | buena | gafas | mechero, astilla | cualitativo | [RSC: metales y ácidos](https://edu.rsc.org/resources/metals-and-acids-experiment/446.article); [RSC: burbujas de H₂/O₂](https://edu.rsc.org/experiments/exploding-bubbles-of-hydrogen-and-oxygen/752.article) |
| S16 | `Zn(s) + H₂SO₄(ac) → ZnSO₄(ac) + H₂(g)` | desplazamiento-simple; gas | **Error: ácido + metal en recipiente cerrado.** El gas se acumula, el tapón salta; el H₂ acumulado puede inflamarse si hay una llama cerca | gas-inflamable, sobrepresion | GHS02, GHS05 | mala | gafas, careta | manómetro | cuantitativo | [OpenStax 9.2](https://openstax.org/books/chemistry-2e/pages/9-2-relating-pressure-volume-amount-and-temperature-the-ideal-gas-law); [RSC: metales y ácidos](https://edu.rsc.org/resources/metals-and-acids-experiment/446.article) |
| S17 | `2 Al(s) + 2 OH⁻(ac) + 6 H₂O(l) → 2 [Al(OH)₄]⁻(ac) + 3 H₂(g)` | redox; gas; térmica | **Desatascador (NaOH) en recipiente de aluminio.** Tras un retraso, burbujeo violento, la mezcla se calienta hasta hervir y desprende vapor e H₂ inflamable | gas-inflamable, exotermica, salpicadura-corrosiva | GHS02, GHS05 | mala | careta, guantes, bata | termómetro | cualitativo | [ILO ICSC 0360: NaOH](https://www.ilo.org/dyn/icsc/showcard.display?p_card_id=360); [UW–Madison: Al en NaOH](https://demolab.chem.wisc.edu/types-of-chemical-reactions-reaction-of-aluminum-with-naoh/) |

### Serie de actividad y desplazamiento de metales

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S18 | `Zn(s) + Cu²⁺(ac) → Zn²⁺(ac) + Cu(s)` | desplazamiento-simple; redox | El azul de la disolución se desvanece, se deposita un polvo marrón rojizo de cobre y la temperatura sube | color, exotermica | GHS07, GHS09 | buena | gafas | termómetro | cuantitativo | [RSC: desplazamiento exotérmico](https://edu.rsc.org/experiments/exothermic-metal-displacement-reactions/1730.article) |
| S19 | `Fe(s) + Cu²⁺(ac) → Fe²⁺(ac) + Cu(s)` | desplazamiento-simple; redox | Un clavo de hierro se recubre de cobre rojizo; la disolución pasa de azul a verde pálido | color | GHS07, GHS09 | buena | gafas | — | cuantitativo | [RSC: desplazamiento metales/sales](https://edu.rsc.org/experiments/displacement-reactions-between-metals-and-their-salts/720.article) |
| S20 | `Cu(s) + 2 Ag⁺(ac) → Cu²⁺(ac) + 2 Ag(s)` | desplazamiento-simple; redox | "Árbol de plata": cristales plateados ramificados crecen sobre el hilo de cobre y la disolución se vuelve azul | color, precipitado | GHS03, GHS05, GHS09 | buena | gafas, guantes de nitrilo | lupa o microscopio | cualitativo | [UW–Madison: Silver Tree](https://demolab.chem.wisc.edu/general-chemistry-demonstrations-topic-page/electrochemistry-silver-tree/) |
| S21 | `Cu(s) + 4 HNO₃(ac) → Cu(NO₃)₂(ac) + 2 NO₂(g) + 2 H₂O(l)` | redox; gas | Demostración del docente: gas pardo rojizo denso, la disolución se vuelve verde y luego azul, el matraz se calienta | gas-toxico, color, exotermica | GHS03, GHS05, GHS06 | mala | campana de extracción, careta, guantes | sensor de gas | aviso | [RSC: cobre en ácido nítrico](https://edu.rsc.org/exhibition-chemistry/dissolving-copper-in-nitric-acid/2020047.article); [UW–Madison: HNO₃ sobre Cu](https://demolab.chem.wisc.edu/acids-and-bases-nitric-acid-acts-on-copper/) |

### Precipitados de colores e identificación de iones

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S22 | `Ag⁺(ac) + Cl⁻(ac) → AgCl(s)` | precipitación; doble-desplazamiento | Precipitado blanco que con la luz se oscurece a gris violáceo (prueba de cloruros) | precipitado | GHS05, GHS09 | buena | gafas, guantes de nitrilo | — | cuantitativo | [OpenStax 15.1](https://openstax.org/books/chemistry-2e/pages/15-1-precipitation-and-dissolution); [RSC: identificar iones](https://edu.rsc.org/practical/identifying-ions-practical-videos-14-16-students/4011491.article) |
| S23 | `Pb²⁺(ac) + 2 I⁻(ac) → PbI₂(s)` | precipitación; doble-desplazamiento | Precipitado amarillo intenso; se redisuelve en caliente y al enfriar caen escamas doradas brillantes ("lluvia dorada") | precipitado, color | GHS03, GHS05, GHS07, GHS08, GHS09 | buena | gafas, guantes de nitrilo; residuos de plomo aparte | placa calefactora | cualitativo | [RSC: lluvia dorada](https://edu.rsc.org/exhibition-chemistry/golden-rain/2000048.article); [ILO ICSC 1000: nitrato de plomo](https://inchem.org/documents/icsc/icsc/eics1000.htm) |
| S24 | `Cu²⁺(ac) + 2 OH⁻(ac) → Cu(OH)₂(s)` | precipitación | Precipitado azul claro gelatinoso | precipitado, color | GHS05, GHS07, GHS09 | buena | gafas, guantes de nitrilo | — | cuantitativo | [RSC: cationes con NaOH](https://edu.rsc.org/download?ac=17359) |
| S25 | `Fe³⁺(ac) + 3 OH⁻(ac) → Fe(OH)₃(s)` | precipitación | Precipitado pardo anaranjado (color óxido) | precipitado, color | GHS05, GHS07 | buena | gafas, guantes de nitrilo | — | cuantitativo | [RSC: cationes con NaOH](https://edu.rsc.org/download?ac=17359) |
| S26 | `Fe²⁺(ac) + 2 OH⁻(ac) → Fe(OH)₂(s)`; `4 Fe(OH)₂(s) + O₂(g) + 2 H₂O(l) → 4 Fe(OH)₃(s)` | precipitación; redox | Precipitado verde sucio que en contacto con el aire se oscurece y vira a pardo anaranjado en la superficie | precipitado, color | GHS05, GHS07 | buena | gafas, guantes de nitrilo | cronómetro | cualitativo | [RSC: cationes con NaOH](https://edu.rsc.org/download?ac=17359) |
| S27 | `Ba²⁺(ac) + SO₄²⁻(ac) → BaSO₄(s)` | precipitación; doble-desplazamiento | Precipitado blanco denso y fino (prueba de sulfatos) | precipitado | GHS06 | buena | gafas, guantes de nitrilo | — | cuantitativo | [OpenStax 15.1](https://openstax.org/books/chemistry-2e/pages/15-1-precipitation-and-dissolution); [RSC: identificar iones](https://edu.rsc.org/practical/identifying-ions-practical-videos-14-16-students/4011491.article) |

### Combustión, llamas y oxidantes

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S28 | `2 Mg(s) + O₂(g) → 2 MgO(s)` | combustión; síntesis; redox | Luz blanca cegadora (no mirar directamente); queda una ceniza blanca y la masa aumenta | luz, llama, exotermica, humo | GHS02 | buena | gafas; no mirar la llama | mechero, pinzas, crisol, balanza | cuantitativo | [RSC: masa al quemar Mg](https://edu.rsc.org/experiments/the-change-in-mass-when-magnesium-burns/718.article) |
| S29 | `CH₄(g) + 2 O₂(g) → CO₂(g) + 2 H₂O(g)` | combustión; redox | Llama azul del mechero con la entrada de aire abierta, sin hollín; vaho en un vaso frío colocado encima | llama, exotermica | GHS02, GHS04 | buena | gafas | mechero, termómetro | cuantitativo | [OpenStax 4.1](https://openstax.org/books/chemistry-2e/pages/4-1-writing-and-balancing-chemical-equations); [OpenStax 5.3](https://openstax.org/books/chemistry-2e/pages/5-3-enthalpy) |
| S30 | `C₂H₅OH(l) + 3 O₂(g) → 2 CO₂(g) + 3 H₂O(g)` | combustión; redox | Llama azul pálida casi invisible con luz de día; calienta el agua de una lata (calorimetría sencilla) | llama, exotermica | GHS02, GHS07 | buena | gafas | lamparilla de alcohol, termómetro, balanza | cuantitativo | [OpenStax 5.3](https://openstax.org/books/chemistry-2e/pages/5-3-enthalpy) |
| S31 | `2 CH₄(g) + 3 O₂(g) → 2 CO(g) + 4 H₂O(g)` | combustión; redox | Con poco aire: llama amarilla y humeante, hollín negro sobre superficies frías; el CO no se ve ni se huele | gas-toxico, humo, llama | GHS02, GHS04, GHS06, GHS08 | mala | ventilación | sensor de gas (CO) | aviso | [OSHA: CO](https://www.osha.gov/chemicaldata/462) |
| S32 | `2 CH₃OH(l) + 3 O₂(g) → 2 CO₂(g) + 4 H₂O(g)` | combustión; redox | **Error: añadir alcohol a una llama o rellenar un quemador encendido.** Los vapores se inflaman y la llama retrocede hacia el recipiente como una bola de fuego casi invisible | llamarada | GHS02, GHS06, GHS08 | mala | no hacerlo; extintor y manta cerca | — | aviso | [CSB: demostraciones con metanol](https://www.csb.gov/csb-releases-key-lessons-for-preventing-incidents-from-flammable-chemicals-in-educational-demonstrations-in-wake-of-several-serious-methanol-accidents-that-injured-children-and-adults/); [ChemEdX: alerta ACS](https://www.chemedx.org/article/acs-publishes-safety-alert) |
| S33 | `2 Mg(s) + CO₂(g) → 2 MgO(s) + C(s)` | redox; combustión | **Error: apagar magnesio ardiendo con CO₂ (o agua).** El Mg sigue ardiendo con luz blanca y deja motas negras de carbono entre la ceniza blanca | luz, llama, exotermica, humo | GHS02 | mala | gafas; arena seca para metales | — | cualitativo | [RSC: carbono en la serie de actividad](https://edu.rsc.org/experiments/where-is-carbon-in-the-reactivity-series/1787.article); [Purdue: Mg y CO₂](https://chemed.chem.purdue.edu/genchem/demosheets/9.8.html) |
| S34 | `14 KMnO₄(s) + 4 C₃H₅(OH)₃(l) → 7 K₂CO₃(s) + 7 Mn₂O₃(s) + 5 CO₂(g) + 16 H₂O(g)` | redox; combustión | Demostración del docente: tras unos segundos sin nada, sale humo, chisporrotea y estalla en llama violeta con mucho calor | llama, humo, exotermica | GHS03, GHS05, GHS09 | mala | campana de extracción, careta, guantes | — | cualitativo | [UW: glicerol y KMnO₄](https://chem.washington.edu/lecture-demos/glycerol-and-kmno4); [UW–Madison: KMnO₄ y glicerina](https://demolab.chem.wisc.edu/thermochemistry-reaction-of-potassium-permanganate-and-glycerine/) |

### Electroquímica: electrólisis y pilas

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S35 | `2 H₂O(l) → 2 H₂(g) + O₂(g)` | electroquímica; descomposición; redox | Burbujas en ambos electrodos; en el cátodo se recoge el doble de volumen (H₂, da "pop") que en el ánodo (O₂, reaviva una astilla en ascuas) | gas-inflamable | GHS02, GHS03 | buena | gafas | fuente y electrodos, probetas graduadas | cuantitativo | [RSC: burbujas de H₂/O₂](https://edu.rsc.org/experiments/exploding-bubbles-of-hydrogen-and-oxygen/752.article); [OpenStax 17.7](https://openstax.org/books/chemistry-2e/pages/17-7-electrolysis) |
| S36 | `Cu²⁺(ac) + 2 Cl⁻(ac) → Cu(s) + Cl₂(g)` | electroquímica; redox | Capa marrón rojiza de cobre en el cátodo; burbujas en el ánodo con olor a piscina que decoloran el papel tornasol húmedo | color, gas-toxico | GHS05, GHS06, GHS07, GHS09 | buena | gafas, ventilación (mejor en microescala) | fuente y electrodos, papel indicador | cuantitativo | [RSC: electrólisis en microescala](https://edu.rsc.org/experiments/electrolysis-on-a-microscale-14-16-years/4020615.article); [OpenStax 17.7](https://openstax.org/books/chemistry-2e/pages/17-7-electrolysis) |
| S37 | `Zn(s) + Cu²⁺(ac) → Zn²⁺(ac) + Cu(s)` | electroquímica; redox | Pila Daniell: el voltímetro marca alrededor de 1,1 V; el zinc se corroe, se deposita cobre y el azul se aclara poco a poco | color, electricidad | GHS07, GHS09 | buena | gafas | voltímetro, puente salino | cuantitativo | [OpenStax 17.2](https://openstax.org/books/chemistry-2e/pages/17-2-galvanic-cells); [Nuffield: pilas y baterías](https://www.nuffieldfoundation.org/sites/default/files/11_Cells_and_batteries.pdf) |
| S38 | `≈ Zn(s) + 2 H⁺(ac) → Zn²⁺(ac) + H₂(g)` | electroquímica; redox | Pila de limón: un limón con tiras de zinc y cobre da un voltaje pequeño; varios en serie encienden un LED | gas-inflamable, electricidad | — | buena | — | voltímetro, LED | cualitativo | [ANU: pila de limón](https://science.anu.edu.au/engagement/science-lab-experiments-home-school/how-make-lemon-battery) |

### Descomposición térmica, hidratos y catálisis

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S39 | `CaCO₃(s) → CaO(s) + CO₂(g)`; `CaO(s) + H₂O(l) → Ca(OH)₂(s)` | descomposición; térmica; síntesis | Al calentar fuerte, el trozo brilla (luz de calcio) y se desmorona; con gotas de agua chisporrotea, humea vapor y el papel indicador se vuelve violeta | gas-inocuo, luz, exotermica | GHS05, GHS07 | buena | gafas, pinzas | mechero, papel indicador | cuantitativo | [RSC: descomposición de CaCO₃](https://edu.rsc.org/experiments/thermal-decomposition-of-calcium-carbonate/704.article); [Bristol: cal](https://www.chm.bris.ac.uk/motm/lime/limeh.htm) |
| S40 | `CuCO₃(s) → CuO(s) + CO₂(g)` | descomposición; térmica | El polvo verde se vuelve negro; el gas enturbia el agua de cal | color, gas-inocuo | GHS07, GHS09 | buena | gafas | mechero, balanza | cuantitativo | [RSC: descomposición de carbonatos](https://edu.rsc.org/resources/thermal-decomposition-ofmetal-carbonates/450.article) |
| S41 | `CuSO₄·5H₂O(s) ⇌ CuSO₄(s) + 5 H₂O(g)` | descomposición; equilibrio; térmica | Cristales azules → polvo blanco y gotas de agua en la boca del tubo; al devolver el agua vuelve el azul y el tubo se calienta | color, endotermica, exotermica | GHS07, GHS09 | buena | gafas | mechero, termómetro, balanza | cuantitativo | [RSC: reacción reversible del CuSO₄ hidratado](https://edu.rsc.org/resources/a-reversible-reaction-of-hydrated-copper-ii-sulfate/437.article) |
| S42 | `2 H₂O₂(ac) → 2 H₂O(l) + O₂(g)` | descomposición; catalítica; redox | Con MnO₂ (o hígado o patata, por la catalasa) aparece efervescencia y una columna de espuma si hay detergente; una astilla en ascuas se reaviva | gas-inocuo, exotermica | GHS05, GHS07 | buena | gafas, guantes | cronómetro, jeringa de gas | cuantitativo | [RSC: descomposición del H₂O₂](https://edu.rsc.org/resources/hydrogen-peroxide-decomposition/831.article) |
| S43 | `C₁₂H₂₂O₁₁(s) → 12 C(s) + 11 H₂O(g)` | descomposición; térmica | Demostración del docente con H₂SO₄ concentrado: el azúcar amarillea, se pone marrón y luego negro; crece una columna negra porosa que humea y huele a SO₂ | exotermica, humo, gas-toxico, color | GHS05, GHS06 | mala | campana de extracción, careta, guantes | termómetro | cualitativo | [RSC: deshidratación de la sacarosa](https://edu.rsc.org/exhibition-chemistry/the-dehydration-of-sucrose/2020073.article); [RSC: H₂SO₄ como deshidratante](https://edu.rsc.org/experiments/sulfuric-acid-as-a-dehydrating-agent/999.article) |

### Ensayos a la llama y metales alcalinos

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S44 | `≈ M(g) → M*(g) → M(g) + hν` | físico | Color de llama por ion: Li rojo intenso, Na amarillo intenso, K lila pálido, Ca rojo anaranjado, Sr rojo, Ba verde pálido, Cu verde con vetas azules | color, llama, luz | GHS07 | buena | gafas | mechero, asa de nicromo o astilla, espectroscopio | cualitativo | [RSC: ensayos a la llama](https://edu.rsc.org/resources/flame-tests-using-metal-salts/1875.article); [RSC: colores de llama](https://edu.rsc.org/resources/flame-colours-a-demonstration/760.article) |
| S45 | `2 Na(s) + 2 H₂O(l) → 2 NaOH(ac) + H₂(g)` | alcalinos; redox; gas | Demostración del docente: la bolita plateada se funde, corre siseando por la superficie y desaparece; la fenolftaleína deja una estela rosa | gas-inflamable, exotermica, color | GHS02, GHS05 | mala | pantalla de seguridad, careta | — | cualitativo | [RSC: alcalinos en agua](https://edu.rsc.org/lesson-plans/how-do-alkali-metals-react-with-water-14-16-years/89.article); [UW: alcalinos en agua](https://chem.washington.edu/lecture-demos/activity-series-alkali-metals-water) |
| S46 | `2 K(s) + 2 H₂O(l) → 2 KOH(ac) + H₂(g)` | alcalinos; redox; gas | Demostración del docente: se inflama al instante con llama lila, chisporrotea y puede terminar con un pequeño estallido que proyecta gotas alcalinas | gas-inflamable, llama, exotermica, salpicadura-corrosiva | GHS02, GHS05 | mala | pantalla de seguridad, careta | — | cualitativo | [RSC: alcalinos en agua](https://edu.rsc.org/lesson-plans/how-do-alkali-metals-react-with-water-14-16-years/89.article); [UW–Madison: reactividad de alcalinos](https://demolab.chem.wisc.edu/atomic-structure-relative-reactivate-of-alkali-metals-with-water/) |

### Química cotidiana, orgánica sencilla y cinética

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S47 | `≈ 4 Fe(s) + 3 O₂(g) + 6 H₂O(l) → 4 Fe(OH)₃(s)` | redox; síntesis | Oxidación: manchas pardo anaranjadas en días; más rápida con sal, ninguna en aire seco ni en agua hervida bajo aceite | color | — | buena | — | balanza | cualitativo | [RSC: qué oxida el hierro](https://edu.rsc.org/experiments/what-causes-iron-to-rust/434.article) |
| S48 | `CH₃COOH(l) + C₂H₅OH(l) ⇌ CH₃COOC₂H₅(l) + H₂O(l)` | orgánica; equilibrio; catalítica | Con H₂SO₄ como catalizador y calor suave aparece olor afrutado o a quitaesmalte; capa aceitosa al verter sobre agua | olor | GHS02, GHS05, GHS07 | buena | gafas, guantes, campana de extracción | baño maría | cualitativo | [RSC: ésteres](https://edu.rsc.org/experiments/making-esters-from-alcohols-and-acids/1743.article); [OpenStax 20.3](https://openstax.org/books/chemistry-2e/pages/20-3-aldehydes-ketones-carboxylic-acids-and-esters) |
| S49 | `(C₁₇H₃₅COO)₃C₃H₅(s) + 3 NaOH(ac) → 3 C₁₇H₃₅COONa(s) + C₃H₅(OH)₃(ac)` | orgánica; ácido-base | Saponificación: la grasa y la sosa calientes forman una pasta espesa; con sal se separa un sólido blanco (jabón) que hace espuma | precipitado | GHS05 | buena | gafas, guantes de nitrilo | placa calefactora, papel indicador | cualitativo | [RSC: jabón con aceite de ricino](https://edu.rsc.org/experiments/making-soaps-and-detergents-using-castor-oil/1746.article); [UW: saponificación](https://chem.washington.edu/lecture-demos/saponification) |
| S50 | `H₂O₂(ac) + 2 I⁻(ac) + 2 H⁺(ac) → I₂(ac) + 2 H₂O(l)`; `I₂(ac) + 2 S₂O₃²⁻(ac) → 2 I⁻(ac) + S₄O₆²⁻(ac)` | redox; cinética; indicador | Reloj de yodo: la mezcla sigue incolora durante un tiempo y de golpe se vuelve azul negra (almidón) | color | GHS07 | buena | gafas | cronómetro, colorímetro | cualitativo | [RSC: reloj de yodo](https://edu.rsc.org/resources/iodine-clock-reaction-demonstration-method/744.article) |

### Excluidas deliberadamente
- Termita (Fe₂O₃ + Al) — demostración clásica, pero su temperatura y sus proyecciones la hacen propia de la sección universitaria; aquí bastan la combustión del Mg y S33 para la idea de un metal muy reactivo ardiendo.
- Cualquier cantidad, concentración o proporción de trabajo para S05–S08, S11, S12, S16, S17, S21, S31–S34, S43, S45 y S46 — por los límites de seguridad, solo se dan la ecuación, lo que se observa y la consecuencia.
- "Bombas" de botella (hielo seco, desatascador con aluminio, ácido con metal en botella cerrada) como actividad — se muestran solo como error de sobrepresión (S11, S16, S17), nunca como montaje.
- Rubidio y cesio en agua — su violencia excede la demostración del aula; el potasio (S46) basta para la tendencia del grupo.
- "Arcoíris" de llamas con metanol en mesa abierta — causa accidentes reales; los colores se muestran con astilla o asa en mechero (S44) y el peligro del alcohol como S32.
- Generación deliberada de Cl₂, H₂S o NO₂ como práctica del alumno — se muestran solo como `aviso` (S06–S08, S12, S21); S36 se limita a la microescala con ventilación.
- Disolución de Mn₂O₇ (KMnO₄ + H₂SO₄ concentrado) con algodón y otras demostraciones con oxidantes fuertes además de S34 — riesgo de detonación de un intermedio inestable.
- Cobre con HCl diluido y otras "no reacciones" — se descartaron por espacio; la serie de actividad ya se ve con S18–S20.
- Síntesis de pólvora, nitratos con combustible, triyoduro de nitrógeno, fulminatos y similares — materiales energéticos, excluidos por el brief.

## 5. Nivel universidad

Criterio del nivel: entra la química de primeros cursos universitarios (general, inorgánica, cinética, equilibrio, electroquímica y polímeros) con sus consecuencias reales, incluidas las demostraciones clásicas de alto riesgo (alcalinos con agua, termita, H₂/O₂, H₂/Cl₂ fotoquímico), siempre descritas solo por ecuación, observable, peligro y consecuencia, sin cantidades, proporciones ni procedimientos. Los códigos de consecuencia se usan con precisión: `exotermica` es solo calor; `llama`, combustión localizada y estable; `llamarada`, frente de fuego rápido sin confinamiento; `sobrepresion`, fallo de un recipiente por gas acumulado; `explosion`, solo deflagración o detonación de mezclas gas/polvo, reacción violenta de alcalinos pesados, o explosión física de vapor (agua sobre metal fundido). El H₂ nunca se codifica como `gas-inocuo`: no es tóxico, pero sí inflamable. Su riesgo aparece como `llama`, `llamarada` o `explosion` cuando procede, y en el observable. Se excluyen la síntesis de materiales energéticos y la generación deliberada de gases tóxicos: los casos de cianuro, sulfuro, cloratos y peróxidos orgánicos figuran solo como `aviso`.

### Metales alcalinos y alcalinotérreos con agua

La violencia aumenta de Li a Cs porque baja la energía de ionización y el metal se oxida más deprisa. También baja el punto de fusión: Na y K se funden por el propio calor de reacción, la superficie se renueva y se acelera la liberación de H₂. Rb y Cs son más densos que el agua y se hunden, así que el H₂ y el vapor se generan bajo el líquido. La etapa inicial explosiva se ha explicado como una «explosión de Coulomb» del metal cargado ([Mason et al., Nature Chemistry 2015](https://www.nature.com/articles/nchem.2161)). Después, el calor puede inflamar el H₂.

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| U01 | `2 Li(s) + 2 H₂O(l) → 2 LiOH(ac) + H₂(g)` | redox; alcalinos; gas | El metal flota y burbujea de forma lenta y continua sin fundirse. Con fenolftaleína aparece un halo rosa. Calentamiento suave. | gas-inflamable, exotermica, color | GHS02, GHS05 | buena | gafas, guantes de nitrilo, bata, pantalla | termómetro, pHmetro, sensor de gas | cuantitativo | [OpenStax 18.1](https://openstax.org/books/chemistry-2e/pages/18-1-periodicity); [CU Boulder X818](https://www.colorado.edu/lab/lecture-demo-manual/x818-periodic-trends-alkali-metals-water) |
| U02 | `2 Na(s) + 2 H₂O(l) → 2 NaOH(ac) + H₂(g)` | redox; alcalinos; gas | Se forma una bola fundida plateada que corre siseando por la superficie y deja una estela rosa con fenolftaleína. A veces da un destello amarillo y proyecta gotas. | gas-inflamable, exotermica, color, salpicadura-corrosiva | GHS02, GHS05 | buena | gafas, careta, guantes de nitrilo, bata, pantalla | termómetro, pHmetro | cuantitativo | [CU Boulder X818](https://www.colorado.edu/lab/lecture-demo-manual/x818-periodic-trends-alkali-metals-water); [ICSC 0717: sodio](https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0717) |
| U03 | `2 K(s) + 2 H₂O(l) → 2 KOH(ac) + H₂(g)` | redox; alcalinos; gas | Se funde al instante y el H₂ arde con llama lila. Suena un chasquido final y salta metal fundido fuera del recipiente. | gas-inflamable, exotermica, llama, salpicadura-corrosiva | GHS02, GHS05 | mala | careta, gafas, guantes, bata, pantalla de seguridad | termómetro | cualitativo | [ICSC 0716: potasio](https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0716); [UW Chemistry: alcalinos en agua](https://chem.washington.edu/lecture-demos/activity-series-alkali-metals-water) |
| U04 | `2 Rb(s) + 2 H₂O(l) → 2 RbOH(ac) + H₂(g)` | redox; alcalinos; gas | El metal se hunde y la reacción es inmediata y violenta: el H₂ se inflama y una onda de agua y vapor sale despedida. Se puede inflamar ya en el aire. | gas-inflamable, llama, explosion, salpicadura-corrosiva | GHS02, GHS05 | mala | — (solo virtual) | — | aviso | [RSC: rubidio](https://periodic-table.rsc.org/element/37/rubidium); [Mason et al. 2015](https://www.nature.com/articles/nchem.2161) |
| U05 | `2 Cs(s) + 2 H₂O(l) → 2 CsOH(ac) + H₂(g)` | redox; alcalinos; gas | Estallido instantáneo al contacto, con destello, proyección de agua y rotura posible del recipiente de vidrio. El CsOH resultante ataca el vidrio. | gas-inflamable, explosion, salpicadura-corrosiva | GHS02, GHS05 | mala | — (solo virtual) | — | aviso | [RSC: cesio](https://periodic-table.rsc.org/element/55/caesium); [Mason et al. 2015](https://www.nature.com/articles/nchem.2161) |
| U06 | `Ca(s) + 2 H₂O(l) → Ca(OH)₂(s) + H₂(g)` | redox; gas; precipitación | El calcio se hunde y efervesce de forma constante. El agua se enturbia de blanco porque el Ca(OH)₂ es poco soluble. Calentamiento moderado. | gas-inflamable, exotermica, precipitado | GHS02, GHS05 | buena | gafas, guantes de nitrilo, bata | termómetro, pHmetro | cuantitativo | [CU Boulder X818](https://www.colorado.edu/lab/lecture-demo-manual/x818-periodic-trends-alkali-metals-water); [RSC: calcio](https://periodic-table.rsc.org/element/20/calcium) |
| U07 | `Mg(s) + 2 H₂O(l) → Mg(OH)₂(s) + H₂(g)` | redox | En agua fría no se ve reacción. En agua caliente salen burbujas muy lentas. La capa de óxido y el Mg(OH)₂ pasivan la superficie. | gas-inflamable | GHS02 | neutra | gafas | termómetro, placa calefactora | cualitativo | [CU Boulder X818](https://www.colorado.edu/lab/lecture-demo-manual/x818-periodic-trends-alkali-metals-water) |
| U08 | `Mg(s) + H₂O(g) → MgO(s) + H₂(g)` | redox; combustión; gas | El Mg encendido sigue ardiendo en vapor de agua con luz blanca cegadora y deja un polvo blanco de MgO. El H₂ que se forma puede arder a la salida. | gas-inflamable, luz, exotermica, llama | GHS02 | buena | gafas, pantalla, no mirar la llama | mechero | cualitativo | [RSC: magnesio con vapor](https://edu.rsc.org/download?ac=509182); [OpenStax 18.1](https://openstax.org/books/chemistry-2e/pages/18-1-periodicity) |
| U09 | `2 Mg(s) + CO₂(g) → 2 MgO(s) + C(s)` | redox; combustión | El Mg ardiendo no se apaga en CO₂ ni sobre hielo seco: sigue brillando, chisporrotea y deja polvo blanco con motas negras de carbono. Por eso un extintor de CO₂ no sirve para fuegos metálicos. | llama, luz, humo, exotermica | GHS02 | mala | gafas, pantalla, no mirar la llama | mechero | cualitativo | [CU Boulder X862](https://www.colorado.edu/lab/lecture-demo-manual/x862-burning-magnesium-and-dry-ice); [ICSC 0289: Mg](https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0289) |

### Hidrógeno, combustibles y atmósferas explosivas

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| U10 | `2 H₂(g) + O₂(g) → 2 H₂O(g)` | síntesis; combustión; redox | Mezcla premezclada de H₂ y O₂ con ignición: estampido seco muy fuerte, destello breve y onda de presión, sin bola de fuego duradera. | explosion | GHS02, GHS03, GHS04 | mala | protección auditiva, careta, distancia (solo virtual) | sensor de gas, sonómetro | cualitativo | [OpenStax 18.5](https://openstax.org/books/chemistry-2e/pages/18-5-occurrence-preparation-and-compounds-of-hydrogen); [UW–Madison demo H₂/O₂](https://demolab.chem.wisc.edu/stoichiometry-explosive-reaction-of-hydrogen-and-oxygen/) |
| U11 | `2 H₂(g) + O₂(g) → 2 H₂O(g)` | combustión; redox | H₂ puro (globo o fuga) que se enciende en aire: la combustión solo ocurre donde el H₂ se mezcla con el aire. Sale una bola de fuego anaranjada que sube, con un «buf» sordo, sin el estampido de la premezcla. | llamarada | GHS02, GHS04 | mala | careta, distancia | sensor de gas | cualitativo | [UW Chemistry: globos de H₂](https://chem.washington.edu/lecture-demos/scientific-method-hydrogen-balloons); [ICSC 0001: H₂](https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0001) |
| U12 | `CH₄(g) + 2 O₂(g) → CO₂(g) + 2 H₂O(g)` | combustión; redox | Llama azul estable, sin hollín, en mechero con buen aporte de aire. Se condensa agua en una superficie fría. | llama, exotermica | GHS02, GHS04 | buena | gafas, bata | mechero, termómetro | cuantitativo | [OpenStax 5.3](https://openstax.org/books/chemistry-2e/pages/5-3-enthalpy); [ICSC 0291: metano](https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0291) |
| U13 | `2 CH₄(g) + 3 O₂(g) → 2 CO(g) + 4 H₂O(g)` | combustión; redox | Con poco aire, la llama es amarilla y luminosa y deposita hollín. El CO no se ve ni se huele: solo lo delata el sensor. | llama, humo, gas-toxico | GHS02, GHS04, GHS06, GHS08 | mala | ventilación, detector de CO | sensor de gas (CO) | cualitativo | [ICSC 0023: CO](https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0023); [ICSC 0291: metano](https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0291) |
| U14 | `CH₄(g) + 2 O₂(g) → CO₂(g) + 2 H₂O(g)` | combustión; redox | Fuga de metano acumulada en un recinto y una chispa. Por debajo del límite inferior de inflamabilidad no pasa nada; dentro del intervalo la llama recorre todo el volumen y la presión sube de golpe. Por encima del límite superior no se propaga, pero arde en cuanto se diluye con aire. | explosion | GHS02, GHS04 | mala | — (solo virtual) | sensor de gas (% LIE), manómetro | aviso | [ICSC 0291: metano](https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0291); [CSB: demostraciones educativas](https://www.csb.gov/key-lessons-for-preventing-incidents-from-flammable-chemicals-in-educational-demonstrations/) |
| U15 | `≈ (C₆H₁₀O₅)ₙ(s, nube) + 6n O₂(g) → 6n CO₂(g) + 5n H₂O(g); 4 Al(s, nube) + 3 O₂(g) → 2 Al₂O₃(s)` | combustión; redox | Un montón de harina o polvo de aluminio apenas arde. Dispersado en nube con ignición, sin confinar da una llamarada; confinado, explota: es el «pentágono del polvo». | llamarada, explosion | GHS02 | mala | — (solo virtual) | — | aviso | [CCOHS: polvo combustible](https://www.ccohs.ca/oshanswers/chemicals/combustible_dust.html); [ICSC 0988: polvo de Al](https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0988) |
| U16 | `CaC₂(s) + 2 H₂O(l) → C₂H₂(g) + Ca(OH)₂(s)` | ácido-base; gas; precipitación | Burbujeo vigoroso con olor a ajo (impurezas de fosfina) y residuo blanco lechoso. El acetileno, si se enciende, arde con llama amarilla muy humeante. | exotermica, precipitado, llama, humo | GHS02, GHS05 | buena | gafas, guantes, campana de extracción | sensor de gas, pHmetro | cuantitativo | [Purdue 24.9: acetileno](https://chemed.chem.purdue.edu/demos/demosheets/24.9.html); [ICSC 0406: CaC₂](https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0406) |
| U17 | `CaH₂(s) + 2 H₂O(l) → Ca(OH)₂(s) + 2 H₂(g)` | redox; gas | Efervescencia violenta y calor, con residuo blanco. El agua no «apaga» el hidruro: lo activa y libera H₂ inflamable. | gas-inflamable, exotermica, precipitado | GHS02 | mala | gafas, guantes, bata, atmósfera seca | sensor de gas, termómetro | cualitativo | [OpenStax 18.5](https://openstax.org/books/chemistry-2e/pages/18-5-occurrence-preparation-and-compounds-of-hydrogen); [UAB EHS: reactivos con agua](https://bb.uab.edu/ehs/images/docs/chem/water_reactive_chemicals.pdf) |

### Presión, confinamiento y descontrol térmico

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| U18 | `CO₂(s) → CO₂(g)` | físico | Hielo seco en un recipiente hermético: niebla blanca y presión que sube sin parar hasta que el envase revienta y lanza fragmentos. No hay reacción química. | sobrepresion | — | mala | guantes térmicos, gafas | manómetro, termómetro | cuantitativo | [WorkSafe Victoria: hielo seco](https://www.worksafe.vic.gov.au/safety-alerts/working-dry-ice); [OpenStax 9.2](https://openstax.org/books/chemistry-2e/pages/9-2-relating-pressure-volume-amount-and-temperature-the-ideal-gas-law) |
| U19 | `CaCO₃(s) + 2 H⁺(ac) → Ca²⁺(ac) + H₂O(l) + CO₂(g)` | ácido-base; gas | En un recipiente abierto solo se ve efervescencia. Tapado, el manómetro sube hasta que el tapón salta o el vidrio se rompe. | gas-inocuo, sobrepresion | GHS05 | mala | gafas, careta | manómetro, balanza | cuantitativo | [NIH: compatibilidad química](https://orf.od.nih.gov/EnvironmentalProtection/WasteDisposal/Pages/chem_compat.aspx); [OpenStax 9.2](https://openstax.org/books/chemistry-2e/pages/9-2-relating-pressure-volume-amount-and-temperature-the-ideal-gas-law) |
| U20 | `≈ q̇_gen = (−ΔH)·V·k₀·e^(−Eₐ/RT)·f(c)  >  q̇_rem = U·A·(T − T_ref)  ⇒  T↑ ⇒ k↑ ⇒ q̇_gen↑` | cinética; térmica | Descontrol térmico, mostrado en gráfica: el calor generado crece exponencialmente con T y el evacuado solo de forma lineal. Pasado el punto de no retorno, T y P se disparan, los gases se descomponen y el reactor se rompe. | exotermica, sobrepresion | — | mala | — (concepto) | termómetro, manómetro | aviso | [CSB: T2 Laboratories](https://www.csb.gov/csb-finds-t2-laboratories-explosion-caused-by-failure-of-cooling-system-resulting-in-runaway-chemical-reaction-report-notes-company-did-not-recognize-hazards-of-chemical-process/) |

### Termita y síntesis directa metal + no metal

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| U21 | `Fe₂O₃(s) + 2 Al(s) → Al₂O₃(s) + 2 Fe(l)` | redox; desplazamiento-simple; térmica | Tras una ignición difícil sale luz blanca cegadora, lluvia de chispas y humo, y queda una gota de hierro fundido al rojo blanco que atraviesa el soporte. | exotermica, luz, humo | GHS02 | buena | careta, gafas oscuras, ropa ignífuga, distancia | termómetro IR | cualitativo | [CU Boulder T510: termita](https://www.colorado.edu/lab/lecture-demo-manual/t510-exothermic-reaction-thermite); [LibreTexts: termita](https://chem.libretexts.org/Ancillary_Materials/Demos_Techniques_and_Experiments/Lecture_Demonstrations/Additional_Demos/Thermite_Reaction) |
| U22 | `H₂O(l) → H₂O(g); 3 Fe(l) + 4 H₂O(g) → Fe₃O₄(s) + 4 H₂(g)` | físico; redox | Agua sobre termita o hierro fundido: vaporización instantánea, proyección explosiva de metal fundido y H₂ que puede inflamarse. | explosion, llamarada | GHS02 | mala | — (solo virtual) | — | aviso | [CU Boulder T510: termita](https://www.colorado.edu/lab/lecture-demo-manual/t510-exothermic-reaction-thermite) |
| U23 | `Fe(s) + S(s) → FeS(s)` | síntesis; redox; térmica | Al iniciarla, una incandescencia roja avanza sola por la mezcla. Queda un sólido negro que el imán ya no separa. Si el azufre arde, huele a SO₂. | exotermica, luz | GHS07 | buena | gafas, campana de extracción | mechero, imán, balanza | cuantitativo | [RSC: hierro y azufre](https://edu.rsc.org/resources/iron-and-sulfur-reaction/713.article) |
| U24 | `8 Zn(s) + S₈(s) → 8 ZnS(s)` | síntesis; redox; térmica | Destello brillante casi explosivo, chispas, siseo y nube blanca en forma de hongo. El producto es un sólido blanco amarillento. | llamarada, luz, humo, exotermica | GHS02, GHS07, GHS09 | buena | gafas, pantalla, campana de extracción | — | aviso | [UW–Madison: Zn + S](https://demolab.chem.wisc.edu/general-chemistry-demonstrations-topic-page/atoms-and-molecules-reaction-of-zinc-and-sulfur/); [RSC: Zn + S (notas)](https://edu.rsc.org/download?ac=549311) |
| U25 | `2 Al(s) + 3 I₂(s) → 2 AlI₃(s)` | síntesis; redox; catalítica | Mezcla seca inerte. Tras una gota de agua y un periodo de inducción salen densos vapores violetas de I₂, humo y a veces llama. | llamarada, humo, gas-toxico, exotermica | GHS02, GHS07, GHS08, GHS09 | buena | gafas, guantes, campana de extracción | — | cualitativo | [CU Boulder S128: Al + I₂](https://www.colorado.edu/lab/lecture-demo-manual/general-reactions/s128-chemical-rxns-synthesis-2als-3i2s-2ali3s); [RSC: aluminio y yodo](https://edu.rsc.org/experiments/reacting-aluminium-and-iodine/715.article) |
| U26 | `2 Na(s) + Cl₂(g) → 2 NaCl(s)` | síntesis; redox | El Na fundido arde en Cl₂ con llama amarilla intensa y humo blanco de NaCl, y el verde del gas se aclara. Metal blando y gas tóxico dan una sal comestible. | llama, luz, humo, exotermica | GHS02, GHS03, GHS05, GHS06, GHS09 | buena | campana de extracción, gafas, guantes | — | cuantitativo | [RSC: sodio y cloro](https://edu.rsc.org/exhibition-chemistry/the-reaction-between-sodium-and-chlorine/4015463.article); [ICSC 0126: cloro](https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0126) |
| U27 | `H₂(g) + Cl₂(g) → 2 HCl(g)` | síntesis; redox; cinética | A oscuras no ocurre nada. Con luz UV o un destello de Mg, el Cl₂ se rompe en Cl·, la cadena se acelera y la mezcla estalla, lanzando el tapón. Se forman humos ácidos de HCl. | explosion, gas-toxico | GHS02, GHS03, GHS05, GHS06, GHS09 | mala | — (solo virtual) | fuente de luz | cualitativo | [OpenStax 18.5](https://openstax.org/books/chemistry-2e/pages/18-5-occurrence-preparation-and-compounds-of-hydrogen); [UW–Madison: cañón de HCl](https://demolab.chem.wisc.edu/kinetics-hcl-cannon/) |

### Oxidantes fuertes, redox de metales de transición e incompatibilidades graves

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| U28 | `2 MnO₄⁻(ac) + H⁺(ac) + 5 HSO₃⁻(ac) → 2 Mn²⁺(ac) + 5 SO₄²⁻(ac) + 3 H₂O(l)` | redox | En medio ácido, el violeta intenso se decolora hasta quedar incoloro o rosa muy pálido (Mn²⁺). | color | GHS03, GHS05, GHS07, GHS09 | buena | gafas, guantes de nitrilo | colorímetro, pHmetro | cuantitativo | [UC Davis: estados de oxidación del Mn](https://chem.libretexts.org/Courses/University_of_California_Davis/UCDemos/Oxidation_States_of_Manganese); [OpenStax 19.1](https://openstax.org/books/chemistry-2e/pages/19-1-occurrence-preparation-and-properties-of-transition-metals-and-their-compounds) |
| U29 | `OH⁻(ac) + 2 MnO₄⁻(ac) + 3 HSO₃⁻(ac) → 2 MnO₂(s) + 3 SO₄²⁻(ac) + 2 H₂O(l)` | redox; precipitación | En medio neutro o débilmente básico desaparece el violeta y precipita un sólido pardo oscuro (MnO₂). | color, precipitado | GHS03, GHS07, GHS09 | buena | gafas, guantes de nitrilo | colorímetro, pHmetro | cuantitativo | [UC Davis: estados de oxidación del Mn](https://chem.libretexts.org/Courses/University_of_California_Davis/UCDemos/Oxidation_States_of_Manganese) |
| U30 | `2 MnO₄⁻(ac) + 3 OH⁻(ac) + HSO₃⁻(ac) → 2 MnO₄²⁻(ac) + SO₄²⁻(ac) + 2 H₂O(l)` | redox | En medio fuertemente básico, el violeta pasa a verde (manganato, Mn⁺⁶). | color | GHS03, GHS05, GHS07, GHS09 | buena | gafas, guantes de nitrilo | colorímetro, pHmetro | cuantitativo | [UC Davis: estados de oxidación del Mn](https://chem.libretexts.org/Courses/University_of_California_Davis/UCDemos/Oxidation_States_of_Manganese) |
| U31 | `≈ MnO₄⁻ (violeta) → MnO₄²⁻ (verde) → MnO₂ coloidal (pardo-amarillo), con un azúcar como reductor en medio OH⁻` | redox; cinética | «Camaleón químico»: la misma disolución pasa sola de violeta a azulado, verde, amarillo-ámbar y pardo en minutos. | color | GHS03, GHS05, GHS07, GHS09 | buena | gafas, guantes de nitrilo | colorímetro, cronómetro | cualitativo | [Science in School: camaleón con piruletas](https://www.scienceinschool.org/article/2018/colourful-chemistry-redox-reactions-lollipops/); [Wikipedia: camaleón químico](https://en.wikipedia.org/wiki/Chemical_chameleon) |
| U32 | `14 KMnO₄(s) + 4 C₃H₅(OH)₃(l) → 7 K₂CO₃(s) + 7 Mn₂O₃(s) + 5 CO₂(g) + 16 H₂O(g)` | redox; combustión | Tras unos segundos de aparente calma salen humo y vapor, chisporroteo y llamas violáceas. Una mezcla «fallida» puede inflamarse horas después en la papelera. | exotermica, llama, humo | GHS03, GHS07, GHS08, GHS09 | mala | pantalla, gafas, campana de extracción | termómetro IR, cronómetro | cualitativo | [RSC: reacción exotérmica espontánea](https://edu.rsc.org/resources/spontaneous-exothermic-reaction/742.article); [Bristol: glicerol](https://www.chm.bris.ac.uk/motm/glycerol/glycerolh.htm) |
| U33 | `Cr₂O₇²⁻(ac) + 3 CH₃CH₂OH(ac) + 8 H⁺(ac) → 2 Cr³⁺(ac) + 3 CH₃CHO(ac) + 7 H₂O(l)` | redox; orgánica | Naranja que vira a marrón y luego a verde azulado (Cr³⁺); es el principio del antiguo alcoholímetro. El Cr⁶⁺ es carcinógeno por inhalación y sensibilizante. | color | GHS03, GHS05, GHS06, GHS08, GHS09 | buena | guantes de nitrilo, gafas, campana de extracción | colorímetro (≈600 nm) | cuantitativo | [RSC: reacción del alcoholímetro](https://edu.rsc.org/resources/the-breathalyser-reaction/1772.article); [ICSC 1371: dicromato potásico](https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=1371) |
| U34 | `Cu(s) + 4 H⁺(ac) + 2 NO₃⁻(ac) → Cu²⁺(ac) + 2 NO₂(g) + 2 H₂O(l)` | redox | Con HNO₃ concentrado sale una nube densa pardo-rojiza de NO₂. El líquido se calienta y pasa de verde a azul. El cobre «no reactivo frente a ácidos» se disuelve porque el oxidante es el nitrato, no el H⁺. | gas-toxico, color, exotermica | GHS03, GHS04, GHS05, GHS06, GHS09 | mala | campana de extracción, gafas, guantes, careta | sensor de gas (NO₂) | cualitativo | [UW–Madison: HNO₃ sobre cobre](https://demolab.chem.wisc.edu/acids-and-bases-nitric-acid-acts-on-copper/); [ICSC 0930: NO₂](https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0930) |
| U35 | `≈ oxidante (ClO₃⁻, ClO₄⁻, NO₃⁻) + materia orgánica (azúcar, papel) → CO₂ + H₂O + sal + calor` | redox; combustión | Solo aviso: cloratos, percloratos o nitratos en contacto con combustibles orgánicos pueden inflamarse por fricción o calor y arder con violencia. | llamarada, explosion | GHS03, GHS07, GHS09 | mala | — (solo aviso) | — | aviso | [NIH: compatibilidad química](https://orf.od.nih.gov/EnvironmentalProtection/WasteDisposal/Pages/chem_compat.aspx); [ICSC 0548: clorato potásico](https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0548) |
| U36 | `P₄(s) + 5 O₂(g) → P₄O₁₀(s)` | combustión; redox | Solo aviso: el fósforo blanco se inflama solo en el aire a temperatura ambiente moderada y suelta un humo blanco denso y corrosivo. Puede volver a encenderse después de apagado. | llama, humo, gas-toxico | GHS02, GHS05, GHS06, GHS09 | mala | — (solo aviso) | — | aviso | [ICSC 0628: fósforo blanco](https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0628) |
| U37 | `(C₂H₅)₂O(l) + O₂(g) → CH₃CH(OOH)OC₂H₅(l)` | redox; orgánica | Solo aviso: el éter envejecido con aire y luz acumula hidroperóxidos. Cristales en el tapón o líquido estratificado indican peligro de explosión por choque, fricción, calor o al concentrarlo. | explosion | GHS01, GHS02, GHS07 | mala | — (solo aviso) | tiras de peróxidos | aviso | [UNR EHS: formadores de peróxidos](https://www.unr.edu/ehs/policies-manuals/peroxide-forming-chemicals); [ICSC 0355: éter dietílico](https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0355) |
| U38 | `CH₃MgBr(sol) + H₂O(l) → CH₄(g) + Mg(OH)Br(s)` | ácido-base; orgánica | Solo aviso: un reactivo de Grignard reacciona violentamente con el agua, con calor y gas inflamable, y el disolvente etéreo puede inflamarse. | exotermica, llamarada | GHS02, GHS05, GHS07 | mala | — (solo aviso) | — | aviso | [UAB EHS: reactivos con agua](https://bb.uab.edu/ehs/images/docs/chem/water_reactive_chemicals.pdf) |
| U39 | `CN⁻(ac) + H⁺(ac) → HCN(g); FeS(s) + 2 H⁺(ac) → Fe²⁺(ac) + H₂S(g)` | ácido-base; gas | Solo aviso: acidificar cianuros o sulfuros libera HCN (incoloro) o H₂S (olor a huevo podrido que deja de percibirse a concentración peligrosa). | gas-toxico | GHS02, GHS05, GHS06, GHS09 | mala | — (solo aviso) | sensor de gas | aviso | [NIH: compatibilidad química](https://orf.od.nih.gov/EnvironmentalProtection/WasteDisposal/Pages/chem_compat.aspx); [ICSC 0165: H₂S](https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0165) |

### Equilibrio, complejos, cinética y quimioluminiscencia

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| U40 | `[Cu(H₂O)₆]²⁺(ac) + 4 NH₃(ac) ⇌ [Cu(NH₃)₄(H₂O)₂]²⁺(ac) + 4 H₂O(l)` | complejación; equilibrio | El azul celeste da primero un precipitado azul pálido de Cu(OH)₂. Con más NH₃ se redisuelve en un azul violáceo intenso. Al acidificar vuelve el azul claro. | color, precipitado | GHS05, GHS07, GHS09 | buena | gafas, guantes, campana de extracción | colorímetro | cuantitativo | [ChemEd X: iones complejos](https://www.chemedx.org/activity/complex-ions-lab); [OpenStax 19.2](https://openstax.org/books/chemistry-2e/pages/19-2-coordination-chemistry-of-transition-metals) |
| U41 | `[Co(H₂O)₆]²⁺(ac) + 4 Cl⁻(ac) ⇌ [CoCl₄]²⁻(ac) + 6 H₂O(l)` | complejación; equilibrio | Disolución violeta: en baño frío se vuelve rosa y en caliente azul, de forma reversible. El sentido directo es endotérmico. | color | GHS05, GHS07, GHS08, GHS09 | buena | guantes de nitrilo, gafas | termómetro, placa calefactora, colorímetro | cuantitativo | [CU Boulder E720: cobalto](https://www.colorado.edu/lab/lecture-demo-manual/equilibrium/e720-effect-temperature-coh2o62cocl42); [ICSC 0783: CoCl₂](https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0783) |
| U42 | `2 NO₂(g) ⇌ N₂O₄(g)` | equilibrio | Tubos sellados: pardo intenso en baño caliente, casi incoloro en hielo; el cambio es reversible. El sentido directo es exotérmico. | color | GHS03, GHS04, GHS05, GHS06 | buena | gafas, tubos sellados | termómetro, colorímetro | cuantitativo | [CU Boulder E715: NO₂/N₂O₄](https://www.colorado.edu/lab/lecture-demo-manual/equilibrium/e715-effect-temperature-no2n2o4); [OpenStax 13.3](https://openstax.org/books/chemistry-2e/pages/13-3-shifting-equilibria-le-chateliers-principle) |
| U43 | `Fe³⁺(ac) + SCN⁻(ac) ⇌ [Fe(SCN)]²⁺(ac)` | complejación; equilibrio | Amarillo pálido que pasa a rojo sangre. Se intensifica al añadir Fe³⁺ o SCN⁻ y palidece si se retira Fe³⁺ (con fosfato) o al calentar. | color | GHS05, GHS07 | buena | gafas, guantes de nitrilo | colorímetro, termómetro | cuantitativo | [Harvard: equilibrio Fe³⁺/SCN⁻](https://sciencedemonstrations.fas.harvard.edu/presentations/equilibrium-iron-iii-thiocyanate); [OpenStax 13.3](https://openstax.org/books/chemistry-2e/pages/13-3-shifting-equilibria-le-chateliers-principle) |
| U44 | `IO₃⁻(ac) + 3 HSO₃⁻(ac) → I⁻(ac) + 3 SO₄²⁻(ac) + 3 H⁺(ac); IO₃⁻(ac) + 5 I⁻(ac) + 6 H⁺(ac) → 3 I₂(ac) + 3 H₂O(l)` | cinética; redox; indicador | Reloj de yodo (Landolt): disolución incolora que, tras un tiempo que depende de la concentración y la temperatura, vira de golpe a azul-negro (I₂–almidón). | color | GHS03, GHS05, GHS07 | buena | gafas, guantes | cronómetro, termómetro, colorímetro | cualitativo | [CU Boulder K910: reloj de yodo](https://www.colorado.edu/lab/lecture-demo-manual/k910-effect-concentration-and-temperature-rates-iodine-clock); [LibreTexts: reloj de yodo](https://chem.libretexts.org/Ancillary_Materials/Demos_Techniques_and_Experiments/Lecture_Demonstrations/Iodine_Clock) |
| U45 | `IO₃⁻(ac) + 2 H₂O₂(ac) + CH₂(COOH)₂(ac) + H⁺(ac) → ICH(COOH)₂(ac) + 2 O₂(g) + 3 H₂O(l)` | cinética; redox; catalítica | Briggs-Rauscher: oscila entre incoloro, ámbar y azul oscuro durante varios minutos, con burbujas de O₂. | color, gas-inocuo | GHS03, GHS05, GHS07, GHS08, GHS09 | buena | gafas, guantes | cronómetro, colorímetro | cualitativo | [CU Boulder X870: Briggs-Rauscher](https://www.colorado.edu/lab/lecture-demo-manual/x870-briggs-rauscher-reaction-oscillating-clock) |
| U46 | `3 BrO₃⁻(ac) + 5 CH₂(COOH)₂(ac) + 3 H⁺(ac) → 3 BrCH(COOH)₂(ac) + 2 HCOOH(ac) + 4 CO₂(g) + 5 H₂O(l)` | cinética; redox; catalítica | Belousov-Zhabotinsky: con ferroína el color oscila entre rojo y azul. En placa Petri se ven ondas y espirales que se propagan. | color, gas-inocuo | GHS03, GHS05, GHS06, GHS08 | buena | gafas, guantes de nitrilo | cronómetro, colorímetro | cualitativo | [RSC: oscilación rojo-azul](https://edu.rsc.org/resources/a-colourful-oscillating-reaction/440.article); [Purdue 22.9](https://chemed.chem.purdue.edu/genchem/demosheets/22.9.html) |
| U47 | `C₈H₇N₃O₂(ac) + 2 H₂O₂(ac) + 2 OH⁻(ac) → C₈H₅NO₄²⁻(ac) + N₂(g) + 4 H₂O(l) + hν` | redox; catalítica | Luminol en medio básico con catalizador de Cu o Fe: brillo azul frío en la oscuridad, sin apenas calor. | luz | GHS07 | buena | gafas, guantes | luxómetro o espectroscopio | cualitativo | [CU Boulder Q260: luminol](https://www.colorado.edu/lab/lecture-demo-manual/q260-chemiluminescence-luminol-firefly-reaction); [LibreTexts: luminol](https://chem.libretexts.org/Ancillary_Materials/Demos_Techniques_and_Experiments/Lecture_Demonstrations/Additional_Demos/Chemiluminescence--Luminol) |

### Polímeros

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| U48 | `≈ n ClCO(CH₂)₈COCl + n H₂N(CH₂)₆NH₂ → [–CO(CH₂)₈CO–NH(CH₂)₆NH–]ₙ + 2n HCl` | polimerización; orgánica | Nailon 6,10: en la interfase entre dos líquidos inmiscibles se forma una película blanca que se puede estirar como un hilo continuo. | polimero | GHS02, GHS05, GHS07, GHS08, GHS09 | buena | guantes de nitrilo, gafas, campana de extracción | pinzas | cualitativo | [RSC: el truco de la cuerda de nailon](https://edu.rsc.org/resources/making-nylon-the-nylon-rope-trick/755.article); [UW Chemistry: nailon](https://chem.washington.edu/lecture-demos/nylon-rope-trick) |
| U49 | `≈ 2 PVA–OH + B(OH)₄⁻ ⇌ (PVA–O)₂B(OH)₂⁻ + 2 H₂O (entrecruzamiento reversible entre cadenas [–CH₂–CH(OH)–]ₙ)` | polimerización; equilibrio | La disolución viscosa de PVA se transforma en un gel viscoelástico (slime) que fluye despacio y se rompe si se estira rápido. Se licúa si se acidifica. | polimero | GHS08 | buena | guantes, gafas | pHmetro | cualitativo | [Purdue 25.4: slime](https://chemed.chem.purdue.edu/genchem/demosheets/25.4.html); [RSC: slime de PVA](https://edu.rsc.org/experiments/pva-polymer-slime/756.article) |

### Electroquímica

| ID | Ecuación | Tipo | Observable | Consecuencia | Peligro GHS | Mezcla | EPP | Instrumentos | Motor | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| U50 | `2 Cl⁻(ac) + 2 H₂O(l) → Cl₂(g) + H₂(g) + 2 OH⁻(ac)` | electroquímica; redox | Electrólisis de salmuera: burbujas en ambos electrodos y gas amarillo verdoso con olor a cloro en el ánodo (mezclado con algo de O₂). En el cátodo la fenolftaleína se pone rosa. Si los productos no se separan, H₂ y Cl₂ forman una mezcla explosiva (ver U27) y el Cl₂ reacciona con el OH⁻ para dar hipoclorito. | gas-inflamable, gas-toxico, color | GHS02, GHS03, GHS05, GHS06, GHS09 | buena | campana de extracción, gafas, guantes | fuente y electrodos, sensor de gas, pHmetro | cuantitativo | [OpenStax 17.7](https://openstax.org/books/chemistry-2e/pages/17-7-electrolysis); [OpenStax 18.11](https://openstax.org/books/chemistry-2e/pages/18-11-occurrence-preparation-and-properties-of-halogens) |

### Excluidas deliberadamente
- Mezclas clorato/perclorato/nitrato + azúcar, azufre o metales en polvo con fórmula o proporción: son composiciones pirotécnicas o explosivas. Solo se conserva el aviso genérico U35.
- Termita con iniciadores alternativos, termitas de cobre u otros óxidos, y su uso para cortar o perforar: aportan detalle operativo de un material incendiario. Se mantiene solo la ecuación clásica U21.
- Polvos de Mg o Al con azufre: la RSC los desaconseja por explosivos y no añaden concepto a U23–U24.
- Generación de cloro (KMnO₄ + HCl, lejía + ácido) o de H₂S/HCN para usarlos como reactivos: es producción deliberada de gas tóxico. Solo figuran como productos de mezclas peligrosas (U39) y de la electrólisis (U50).
- Nitroglicerina, nitrocelulosa («algodón pólvora»), TATP, triyoduro de nitrógeno, fulminatos, pólvora negra, ANFO, acetiluros de plata o cobre y percloratos orgánicos: síntesis de materiales energéticos, excluida por el brief.
- Mn₂O₇ (KMnO₄ + H₂SO₄ concentrado) y su contacto con orgánicos: el óxido es explosivo, su preparación es un procedimiento peligroso y no tiene valor didáctico seguro.
- Concentración o destilación de éteres con peróxidos y ensayos de choque: solo se modela el aviso U37.
- Cifras de límites de inflamabilidad, tamaños de trozo de metal alcalino, cantidades de reactivo y tiempos de inducción: el brief prohíbe cantidades y proporciones. Los fenómenos se describen de forma conceptual.
- Reacción de Na o K con agua confinada o con disolventes clorados (CCl₄, CHCl₃): son explosiones conocidas pero sin valor didáctico añadido a U02–U05, y su descripción se acercaría a un procedimiento.

## 6. Matriz elemento × elemento

Es la base del nuevo selector de tabla periódica: qué ocurre al combinar dos elementos **en su forma elemental** (Na metálico, Cl₂ gaseoso, S sólido…). Cubre los 24 elementos foco del [catálogo propuesto](catalogo-quimico-propuesto.md); los demás elementos quedan como consulta, con «sin datos» como resultado por defecto.

Las reacciones con agua, ácidos, bases y sales no son pares de elementos, así que están en los catálogos por nivel (§3–§5). Algunos pares solo reaccionan con un tercer componente (una gota de agua, un disolvente, la humedad del aire). Ese componente se indica en la columna **Condición**, y el par no se dispara sin él. Fuera de esos casos, la matriz no predice efectos de otros componentes ni de catalizadores: según AIChE/CCPS, las predicciones por pares no los capturan ([CCPS](https://ccps.aiche.org/resources/faqs)).

**Cómo se ejecutan las filas M.** Las filas M no tienen columnas propias de Mezcla, Motor, GHS ni EPP. Se aplica esta regla por defecto:

| Código | Comportamiento en el simulador |
| --- | --- |
| E, C | Ejecutable como `cualitativo`, con el observable de la fila |
| X | `aviso`: tras confirmar el aviso, se ejecuta como **reconstrucción didáctica** con análisis posterior (decisión del 2026-11-07, ver el [diseño del proyecto 2](../superpowers/specs/2026-11-07-motor-reacciones-selector-design.md)) |
| I | Consulta: «solo ocurre en condiciones industriales o extremas» |
| A | `cambio-fisico` |
| · | `sin-reaccion` en condiciones de laboratorio |

Hay dos excepciones. Todo par con **fósforo** (P₄ blanco) es solo `aviso`, igual que U36. Y si existe una fila de catálogo con la misma ecuación, esa fila manda (§8.6).

**Códigos de la rejilla:** **E** espontánea en condiciones de aula · **C** requiere calor, ignición o catalizador · **X** violenta o explosiva · **I** solo en condiciones extremas o industriales · **A** aleación (cambio físico) · **·** sin reacción en condiciones de laboratorio · **—** mismo elemento.

Los gases nobles (He, Ne, Ar) no reaccionan con ninguno, pero no son inocuos: desplazan el oxígeno y pueden asfixiar en espacios cerrados ([CDC](https://www.cdc.gov/mmwr/preview/mmwrhtml/su6101a1.htm)). La plata no reacciona con el O₂ del aire: se ennegrece por los compuestos de azufre (M82). Fuentes generales de la matriz: [OpenStax Chemistry 2e, cap. 18: metales representativos, metaloides y no metales](https://openstax.org/books/chemistry-2e/pages/18-introduction), [RSC: tabla periódica](https://periodic-table.rsc.org/) y [LibreTexts: química de los grupos](https://chem.libretexts.org/Bookshelves/Inorganic_Chemistry/Supplemental_Modules_and_Websites_(Inorganic_Chemistry)/Descriptive_Chemistry/Elements_Organized_by_Block).

### 6.1 Rejilla

| | H | C | N | O | B | Si | P | S | Cl | Br | I | Li | Na | K | Mg | Ca | Al | Fe | Cu | Zn | Ag | He | Ne | Ar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **H** | — | I | I | X | · | · | · | C | X | C | C | C | C | C | · | C | · | · | · | · | · | · | · | · |
| **C** | I | — | · | C | I | I | · | I | · | · | · | · | · | · | · | I | I | A | · | · | · | · | · | · |
| **N** | I | · | — | I | I | I | · | · | · | · | · | E | · | · | C | C | I | · | · | · | · | · | · | · |
| **O** | X | C | I | — | C | I | E | C | · | · | · | E | E | E | C | C | C | C | C | C | · | · | · | · |
| **B** | · | I | I | C | — | · | · | · | C | C | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| **Si** | · | I | I | I | · | — | · | · | C | C | · | · | · | · | C | · | · | · | · | · | · | · | · | · |
| **P** | · | · | · | E | · | · | — | C | E | X | C | · | · | · | · | · | · | · | · | · | · | · | · | · |
| **S** | C | I | · | C | · | · | C | — | C | C | · | C | X | X | X | C | X | C | C | X | E | · | · | · |
| **Cl** | X | · | · | · | C | C | E | C | — | E | E | C | C | X | C | C | C | C | C | C | C | · | · | · |
| **Br** | C | · | · | · | C | C | X | C | E | — | E | C | C | X | C | C | X | C | C | C | C | · | · | · |
| **I** | C | · | · | · | · | · | C | · | E | E | — | C | C | C | C | C | C | C | C | E | C | · | · | · |
| **Li** | C | · | E | E | · | · | · | C | C | C | C | — | · | · | · | · | · | · | · | · | · | · | · | · |
| **Na** | C | · | · | E | · | · | · | X | C | C | C | · | — | A | · | · | · | · | · | · | · | · | · | · |
| **K** | C | · | · | E | · | · | · | X | X | X | C | · | A | — | · | · | · | · | · | · | · | · | · | · |
| **Mg** | · | · | C | C | · | C | · | X | C | C | C | · | · | · | — | · | · | · | · | · | · | · | · | · |
| **Ca** | C | I | C | C | · | · | · | C | C | C | C | · | · | · | · | — | · | · | · | · | · | · | · | · |
| **Al** | · | I | I | C | · | · | · | X | C | X | C | · | · | · | · | · | — | · | · | · | · | · | · | · |
| **Fe** | · | A | · | C | · | · | · | C | C | C | C | · | · | · | · | · | · | — | · | · | · | · | · | · |
| **Cu** | · | · | · | C | · | · | · | C | C | C | C | · | · | · | · | · | · | · | — | A | · | · | · | · |
| **Zn** | · | · | · | C | · | · | · | X | C | C | E | · | · | · | · | · | · | · | A | — | · | · | · | · |
| **Ag** | · | · | · | · | · | · | · | E | C | C | C | · | · | · | · | · | · | · | · | · | — | · | · | · |
| **He** | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | — | · | · |
| **Ne** | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | — | · |
| **Ar** | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | — |

### 6.2 Pares con reacción

| ID | Ecuación | Par | Condición | Observable | Consecuencia | Nivel mín. |
| --- | --- | --- | --- | --- | --- | --- |
| M01 | `2 H₂(g) + O₂(g) → 2 H₂O(g)` | H–O | Mezcla de gases + chispa o llama | «Pop» seco con poco gas; con más mezcla, estallido y gotas de agua | explosion, exotermica | S |
| M02 | `H₂(g) + Cl₂(g) → 2 HCl(g)` | H–Cl | Luz intensa (UV) o llama | Estallido fotoquímico; desaparece el color verde-amarillo; humo ácido en aire húmedo | explosion, gas-toxico | U |
| M03 | `H₂(g) + Br₂(g) → 2 HBr(g)` | H–Br | Calor o catalizador | Se desvanece el vapor pardo-rojizo | color, gas-toxico | U |
| M04 | `H₂(g) + I₂(g) ⇌ 2 HI(g)` | H–I | Calor; equilibrio | El vapor violeta se aclara sin desaparecer del todo | color, gas-toxico | U |
| M05 | `N₂(g) + 3 H₂(g) ⇌ 2 NH₃(g)` | H–N | Alta presión, ~400–500 °C y catalizador de hierro (proceso Haber) | Nada visible en el aula: reacción industrial | sin-reaccion | U |
| M06 | `C(s) + 2 H₂(g) → CH₄(g)` | H–C | Alta temperatura y catalizador | Sin observable de aula | sin-reaccion | U |
| M07 | `H₂(g) + S(l) → H₂S(g)` | H–S | Azufre fundido | Olor a huevo podrido que deja de percibirse al aumentar la exposición | gas-toxico | U |
| M08 | `2 Li(s) + H₂(g) → 2 LiH(s)` | H–Li | Calor | Sólido blanco | exotermica | U |
| M09 | `2 Na(s) + H₂(g) → 2 NaH(s)` | H–Na | Calor | Sólido blanco-grisáceo | exotermica | U |
| M10 | `2 K(s) + H₂(g) → 2 KH(s)` | H–K | Calor | Sólido blanco | exotermica | U |
| M11 | `Ca(s) + H₂(g) → CaH₂(s)` | H–Ca | Calor | Sólido gris-blanco | exotermica | U |
| M12 | `C(s) + O₂(g) → CO₂(g)` | C–O | Ignición | Brasas rojas, llama corta, calor | llama, exotermica | S |
| M13 | `2 C(s) + O₂(g) → 2 CO(g)` | C–O | Combustión con poco oxígeno | Gas incoloro e inodoro: no se ve nada | gas-toxico | S |
| M14 | `4 Li(s) + O₂(g) → 2 Li₂O(s)` | Li–O | Aire (lento); arde al calentarlo | Se opaca poco a poco; al arder, llama carmesí | color, llama | U |
| M15 | `4 Na(s) + O₂(g) → 2 Na₂O(s)` | Na–O | Aire, temperatura ambiente | El corte plateado brillante se empaña en segundos | color | S |
| M16 | `2 Na(s) + O₂(g) → Na₂O₂(s)` | Na–O | Al arder en aire | Llama amarilla intensa y humo blanco | llama, humo, exotermica | U |
| M17 | `K(s) + O₂(g) → KO₂(s)` | K–O | Aire; arde al calentarlo | Se empaña casi al instante; al arder, llama lila | color, llama | U |
| M18 | `2 Mg(s) + O₂(g) → 2 MgO(s)` | Mg–O | Ignición de la cinta | Luz blanca cegadora y ceniza blanca | luz, llama, humo, exotermica | S |
| M19 | `2 Ca(s) + O₂(g) → 2 CaO(s)` | Ca–O | Calor | Llama rojo-anaranjada y sólido blanco | llama, exotermica | S |
| M20 | `4 Al(s) + 3 O₂(g) → 2 Al₂O₃(s)` | Al–O | En bloque, una capa de óxido lo protege; en polvo fino disperso, ignición | Bloque: nada. Polvo en llama: chispas brillantes. Polvo en nube confinada: explosión de polvo | llama, explosion | U |
| M21 | `3 Fe(s) + 2 O₂(g) → Fe₃O₄(s)` | Fe–O | Lana de acero en una llama | Chispas anaranjadas y residuo negro más pesado | llama, luz, exotermica | S |
| M22 | `≈ 4 Fe(s) + 3 O₂(g) + n H₂O(l) → 2 Fe₂O₃·nH₂O(s)` | Fe–O | Humedad, días o semanas | Herrumbre pardo-anaranjada | color | P |
| M23 | `2 Cu(s) + O₂(g) → 2 CuO(s)` | Cu–O | Calentar en una llama | La superficie rojiza se vuelve negra | color | S |
| M24 | `2 Zn(s) + O₂(g) → 2 ZnO(s)` | Zn–O | Calentar fuerte | Polvo amarillo en caliente que se vuelve blanco al enfriar | color | S |
| M25 | — (sin reacción) | Ag–O | Aire | No cambia; el ennegrecimiento de la plata se debe a compuestos de azufre, no al oxígeno | sin-reaccion | S |
| M26 | `4 B(s) + 3 O₂(g) → 2 B₂O₃(s)` | B–O | Temperatura alta | Llama verde | llama | U |
| M27 | `Si(s) + O₂(g) → SiO₂(s)` | Si–O | Temperatura muy alta | Sin observable de aula | sin-reaccion | U |
| M28 | `P₄(s) + 5 O₂(g) → P₄O₁₀(s)` | P–O | Fósforo blanco: se inflama solo en aire | Brillo verdoso en la oscuridad, luego llama y humo blanco denso | llama, humo, exotermica | U |
| M29 | `S(s) + O₂(g) → SO₂(g)` | S–O | Ignición | Llama azul tenue y olor picante e irritante | llama, gas-toxico | S |
| M30 | `N₂(g) + O₂(g) → 2 NO(g)` | N–O | Rayos o motores: temperatura muy alta | Sin observable de aula (el NO pasa a NO₂ pardo en aire) | sin-reaccion | U |
| M31 | `6 Li(s) + N₂(g) → 2 Li₃N(s)` | Li–N | Temperatura ambiente, lenta | Capa oscura rojizo-negruzca | color | U |
| M32 | `3 Mg(s) + N₂(g) → Mg₃N₂(s)` | Mg–N | Al arder magnesio en aire | Parte amarillenta en la ceniza | color | U |
| M33 | `3 Ca(s) + N₂(g) → Ca₃N₂(s)` | Ca–N | Calor | Sólido pardo | color | U |
| M34 | `2 B(s) + N₂(g) → 2 BN(s)` | B–N | Temperatura muy alta | Sin observable de aula | sin-reaccion | U |
| M35 | `2 Al(s) + N₂(g) → 2 AlN(s)` | Al–N | Temperatura muy alta | Sin observable de aula | sin-reaccion | U |
| M36 | `3 Si(s) + 2 N₂(g) → Si₃N₄(s)` | Si–N | Temperatura muy alta | Sin observable de aula | sin-reaccion | U |
| M37 | `2 Na(s) + Cl₂(g) → 2 NaCl(s)` | Na–Cl | Sodio caliente en cloro | Llama amarilla brillante y humo blanco de sal | llama, humo, exotermica | U |
| M38 | `2 K(s) + Cl₂(g) → 2 KCl(s)` | K–Cl | Contacto; muy vigorosa | Llama lila y humo blanco | llamarada, humo, exotermica | U |
| M39 | `2 Li(s) + Cl₂(g) → 2 LiCl(s)` | Li–Cl | Calor | Llama roja y humo blanco | llama, humo | U |
| M40 | `Mg(s) + Cl₂(g) → MgCl₂(s)` | Mg–Cl | Calor | Luz blanca y humo blanco | luz, humo | U |
| M41 | `Ca(s) + Cl₂(g) → CaCl₂(s)` | Ca–Cl | Calor | Sólido blanco | exotermica | U |
| M42 | `2 Al(s) + 3 Cl₂(g) → 2 AlCl₃(s)` | Al–Cl | Calor; luego se automantiene | Brillo y humo blanco | luz, humo, exotermica | U |
| M43 | `2 Fe(s) + 3 Cl₂(g) → 2 FeCl₃(s)` | Fe–Cl | Lana de hierro caliente | Incandescencia y humo pardo-rojizo | luz, humo | U |
| M44 | `Cu(s) + Cl₂(g) → CuCl₂(s)` | Cu–Cl | Cobre caliente | Brillo y humo pardo-amarillento | luz, humo | U |
| M45 | `Zn(s) + Cl₂(g) → ZnCl₂(s)` | Zn–Cl | Calor | Sólido blanco | exotermica | U |
| M46 | `2 Ag(s) + Cl₂(g) → 2 AgCl(s)` | Ag–Cl | Lenta y superficial | Capa blanquecina que se oscurece con la luz | color | U |
| M47 | `P₄(s) + 6 Cl₂(g) → 4 PCl₃(l)` | P–Cl | Fósforo blanco: arde solo en cloro | Llama pálida y humo | llama, humo, gas-toxico | U |
| M48 | `Si(s) + 2 Cl₂(g) → SiCl₄(l)` | Si–Cl | Calor | Líquido incoloro que humea en aire húmedo | humo, gas-toxico | U |
| M49 | `2 B(s) + 3 Cl₂(g) → 2 BCl₃(g)` | B–Cl | Calor | Gas que humea en aire húmedo | humo, gas-toxico | U |
| M50 | `2 S(l) + Cl₂(g) → S₂Cl₂(l)` | S–Cl | Azufre fundido | Líquido amarillo-anaranjado de olor sofocante | color, gas-toxico | U |
| M51 | `I₂(s) + Cl₂(g) → 2 ICl(l)` | I–Cl | Temperatura ambiente | Los cristales violetas se vuelven líquido pardo-rojizo | color, gas-toxico | U |
| M52 | `Br₂(l) + Cl₂(g) ⇌ 2 BrCl(g)` | Br–Cl | Temperatura ambiente; equilibrio | Vapor amarillo-rojizo | color, gas-toxico | U |
| M53 | `2 Al(s) + 3 Br₂(l) → 2 AlBr₃(s)` | Al–Br | Contacto, tras unos segundos | Chispas, llamas y nube parda | llamarada, humo, gas-toxico | U |
| M54 | `2 K(s) + Br₂(l) → 2 KBr(s)` | K–Br | Contacto | Detonación violenta | explosion, gas-toxico | U |
| M55 | `2 Na(s) + Br₂(l) → 2 NaBr(s)` | Na–Br | Lenta en frío; violenta al calentar | Sólido blanco y vapores pardos | exotermica, gas-toxico | U |
| M56 | `2 Li(s) + Br₂(l) → 2 LiBr(s)` | Li–Br | Calor | Sólido blanco | exotermica | U |
| M57 | `Mg(s) + Br₂(l) → MgBr₂(s)` | Mg–Br | Calor | Se decolora el bromo | color, exotermica | U |
| M58 | `Ca(s) + Br₂(l) → CaBr₂(s)` | Ca–Br | Calor | Sólido blanco | exotermica | U |
| M59 | `2 Fe(s) + 3 Br₂(l) → 2 FeBr₃(s)` | Fe–Br | Calor | Sólido pardo-rojizo | color | U |
| M60 | `Cu(s) + Br₂(l) → CuBr₂(s)` | Cu–Br | Calor | Sólido negro | color | U |
| M61 | `Zn(s) + Br₂(l) → ZnBr₂(s)` | Zn–Br | Calor (en agua, espontánea) | Se decolora el bromo | color, exotermica | U |
| M62 | `2 Ag(s) + Br₂(l) → 2 AgBr(s)` | Ag–Br | Calor | Capa amarillo pálido | color | U |
| M63 | `P₄(s) + 6 Br₂(l) → 4 PBr₃(l)` | P–Br | Contacto; violenta con fósforo blanco | Llamas y humo | llamarada, humo, gas-toxico | U |
| M64 | `2 B(s) + 3 Br₂(l) → 2 BBr₃(l)` | B–Br | Temperatura alta | Líquido incoloro que humea en aire húmedo | humo, gas-toxico | U |
| M65 | `Si(s) + 2 Br₂(l) → SiBr₄(l)` | Si–Br | Temperatura alta | Líquido incoloro que humea en aire húmedo | humo, gas-toxico | U |
| M66 | `2 S(s) + Br₂(l) → S₂Br₂(l)` | S–Br | Calor suave | Líquido rojo oscuro | color | U |
| M67 | `I₂(s) + Br₂(l) → 2 IBr(s)` | I–Br | Temperatura ambiente | Sólido gris-negruzco | color | U |
| M68 | `2 Al(s) + 3 I₂(s) → 2 AlI₃(s)` | Al–I | Una gota de agua como catalizador | Tras unos segundos, nube violeta, chispas y llama | llamarada, humo, gas-toxico, exotermica | U |
| M69 | `Zn(s) + I₂(s) → ZnI₂(ac)` | Zn–I | En agua | El pardo del yodo se desvanece y el tubo se calienta | color, exotermica | S |
| M70 | `Mg(s) + I₂(s) → MgI₂(s)` | Mg–I | Una gota de agua | Nube violeta y calor | humo, exotermica | U |
| M71 | `2 Li(s) + I₂(s) → 2 LiI(s)` | Li–I | Calor | Sólido blanco | exotermica | U |
| M72 | `2 Na(s) + I₂(s) → 2 NaI(s)` | Na–I | Calor | Sólido blanco | exotermica | U |
| M73 | `2 K(s) + I₂(s) → 2 KI(s)` | K–I | Calor | Sólido blanco | exotermica | U |
| M74 | `Ca(s) + I₂(s) → CaI₂(s)` | Ca–I | Calor | Sólido blanco | exotermica | U |
| M75 | `Fe(s) + I₂(s) → FeI₂(s)` | Fe–I | Calor (en agua, espontánea) | Se pierde el color pardo-violeta | color | U |
| M76 | `2 Cu(s) + I₂(s) → 2 CuI(s)` | Cu–I | Calor | Capa blanquecina | color | U |
| M77 | `2 Ag(s) + I₂(s) → 2 AgI(s)` | Ag–I | Contacto o calor | Capa amarilla | color | U |
| M78 | `P₄(s) + 6 I₂(s) → 4 PI₃(s)` | P–I | Contacto, en disolvente | Sólido rojo oscuro | color | U |
| M79 | `Fe(s) + S(s) → FeS(s)` | Fe–S | Calentar la mezcla en un punto | Brillo rojo que avanza solo por la mezcla; sólido negro no magnético | luz, exotermica | S |
| M80 | `Zn(s) + S(s) → ZnS(s)` | Zn–S | Ignición de la mezcla en polvo | Llamarada verde-azulada y nube blanco-amarillenta | llamarada, luz, humo, exotermica | U |
| M81 | `2 Cu(s) + S(s) → Cu₂S(s)` | Cu–S | Calor | El cobre brilla y se ennegrece | color, luz | S |
| M82 | `2 Ag(s) + S(s) → Ag₂S(s)` | Ag–S | Lenta y superficial | Capa negra de plata empañada | color | S |
| M83 | `Mg(s) + S(s) → MgS(s)` | Mg–S | Ignición | Destello violento de luz | llamarada, luz | U |
| M84 | `2 Na(s) + S(s) → Na₂S(s)` | Na–S | Contacto en polvo o al fundir | Reacción violenta con llama | llamarada | U |
| M85 | `2 K(s) + S(s) → K₂S(s)` | K–S | Contacto en polvo o al fundir | Reacción violenta con llama | llamarada | U |
| M86 | `2 Li(s) + S(s) → Li₂S(s)` | Li–S | Calor | Sólido blanco-amarillento | exotermica | U |
| M87 | `Ca(s) + S(s) → CaS(s)` | Ca–S | Calor | Sólido blanco | exotermica | U |
| M88 | `2 Al(s) + 3 S(s) → Al₂S₃(s)` | Al–S | Ignición | Llamarada y sólido gris | llamarada | U |
| M89 | `C(s) + 2 S(g) → CS₂(g)` | C–S | Temperatura muy alta | Sin observable de aula | sin-reaccion | U |
| M90 | `4 P(s) + 3 S(s) → P₄S₃(s)` | P–S | Calor | Sólido amarillo (el de las cabezas de cerilla) | color | U |
| M91 | `Ca(s) + 2 C(s) → CaC₂(s)` | Ca–C | Horno eléctrico | Sin observable de aula | sin-reaccion | U |
| M92 | `4 Al(s) + 3 C(s) → Al₄C₃(s)` | Al–C | Temperatura muy alta | Sin observable de aula | sin-reaccion | U |
| M93 | `Si(s) + C(s) → SiC(s)` | Si–C | Temperatura muy alta | Sin observable de aula | sin-reaccion | U |
| M94 | `4 B(s) + C(s) → B₄C(s)` | B–C | Temperatura muy alta | Sin observable de aula | sin-reaccion | U |
| M95 | — (aleación: acero) | Fe–C | Fundición | Cambio físico: disolución de carbono en hierro | cambio-fisico | S |
| M96 | `2 Mg(s) + Si(s) → Mg₂Si(s)` | Mg–Si | Calor | Sólido gris-azulado | exotermica | U |
| M97 | — (aleación NaK) | Na–K | Contacto a temperatura ambiente | Se forma un líquido metálico que se inflama en aire | llama | U |
| M98 | — (aleación: latón) | Cu–Zn | Fundición | Cambio físico: metal dorado | cambio-fisico | S |

## 7. Mapa de EPP e instrumentos por nivel

Este mapa resume lo que piden las filas de cada nivel. Cada laboratorio desbloquea lo suyo y conserva lo de los niveles anteriores. Es la lista de partida del proyecto 3 (laboratorios por nivel) y del aula virtual, donde el docente elige de este conjunto.

| | Primaria | Secundaria (añade) | Universidad (añade) |
| --- | --- | --- | --- |
| **EPP** | Gafas, bata o delantal, guantes de nitrilo, guantes térmicos (manipulados por un adulto), pelo recogido | Careta, campana de extracción (demostraciones del docente), pantalla de seguridad, pinzas, extintor, manta ignífuga, arena seca para metales | Ropa ignífuga, protección auditiva, gafas oscuras para luz intensa, detector de CO personal, atmósfera seca (guantera) para alcalinos e hidruros |
| **Instrumentos** | Termómetro, balanza, cronómetro, papel indicador y col lombarda, pHmetro sencillo, colorímetro, sensor de gas, manómetro (envases cerrados), lupa, cuentagotas, cinta métrica, vela | Mechero y lamparilla, placa calefactora, baño maría, crisol, jeringa de gas, astilla, bureta y probetas, fuente y electrodos, voltímetro, puente salino, asa de nicromo, espectroscopio de mano, microscopio | Termómetro infrarrojo, sonómetro, sensor de gas específico (CO, NO₂, % LIE), colorímetro por longitud de onda, luxómetro, imán, fuente de luz, tiras de peróxidos |
| **Rol del adulto** | Un adulto presente en todo lo caliente o con llama; las malas mezclas son solo aviso | Las reacciones peligrosas son demostración del docente, no práctica del alumno | Las de alto riesgo se ven como simulación o caso virtual (`aviso`) |

**Conductas que el simulador debe evaluar** (aparecen en la columna EPP, aunque no son equipo): ventilar, no mezclar limpiadores, salir del lugar ante un gas, no mirar directamente la luz del magnesio, guardar distancia, no aspirar al soplar y separar los residuos de plomo. Son buenas candidatas para las **misiones guiadas** del asistente (proyecto 5).

## 8. Implicaciones para el motor (entrada al diseño del proyecto 2)

Estas son propuestas para discutir en el diseño del motor; no son decisiones tomadas.

### 8.1 Qué se puede calcular

| Magnitud | Cómo | Datos | Ya existe en SymbioLab |
| --- | --- | --- | --- |
| Estequiometría y reactivo limitante | De la ecuación balanceada de cada fila | Masas molares (CIAAW) | Parcial (Cu(OH)₂) |
| Calor y ΔT | ΔH°r a partir de ΔH°f tabulados; ΔT adiabática estimada con la capacidad calorífica de la mezcla | [NIST WebBook](https://webbook.nist.gov/chemistry/) | Sí, para neutralización |
| Presión en recipiente cerrado | Gas ideal con los moles de gas producidos; `sobrepresion` cuando se supera la resistencia declarada del recipiente | Volumen y resistencia de cada recipiente virtual | Sí, CO₂ con parada por presión |
| pH y especiación | Solucionador actual de balance de carga | Ka, Kb, Kw(T) | Sí |
| Precipitación | Producto de solubilidad | Ksp ([OpenStax, apéndice J](https://openstax.org/books/chemistry-2e/pages/j-solubility-products)) | Sí, CaCO₃ y Ca(OH)₂ |
| Color de llama | Tabla de emisión por elemento | Líneas de emisión (cualitativo) | No |
| Desplazamiento de equilibrio con T | Le Chatelier, cualitativo con dirección calculable por el signo de ΔH | ΔH°r | No |

### 8.2 Qué no se puede calcular de forma fiable

Velocidades reales, transición deflagración-detonación, explosiones de polvo, descontrol térmico de un sistema concreto, ignición espontánea y efectos de tres o más componentes. Estos casos usan **reglas documentadas** o **reconstrucciones didácticas** y nunca muestran cifras de tiempo o presión como si fueran calculadas.

### 8.3 Regla propuesta para decidir el desenlace

1. Si la combinación (identidad + forma + estado + condiciones) está en el catálogo y en el nivel del laboratorio, se usa su fila: consecuencias, observable y modo de motor.
2. Si no está, el resultado es **«sin datos»**: se muestra un aviso, no un efecto inventado.
3. `explosion` solo se dispara si la fila lo indica, o si se cumple la regla de mezcla gaseosa: combustible y comburente dentro de los límites de inflamabilidad + fuente de ignición. El confinamiento aumenta la severidad.
4. `sobrepresion` se dispara cuando la presión calculada supera la resistencia del recipiente cerrado, sea cual sea la reacción que produjo el gas.
5. En **primaria** nunca se muestra `explosion`: una fila de primaria no lleva ese código, y en ese laboratorio no hay sustancias capaces de producirla.

### 8.4 Requisitos para el selector de tabla periódica

- Elegir un elemento abre sus **formas** disponibles en el nivel: sustancia elemental, iones en disolución y compuestos comunes. Así no se confunde Na metálico con Na⁺ (investigación principal, §4).
- Al tener un elemento elegido, la rejilla de la §6 permite marcar en la tabla con qué otros elementos reacciona (E/C/X) antes de mezclar. Es una pista que el docente puede desactivar en el aula para no revelar el resultado.
- El nivel filtra las filas: primaria no ve filas `X`. Las filas `aviso` se ejecutan como reconstrucción didáctica tras confirmar el aviso, seguidas de un análisis (decisión del 2026-11-07).

### 8.5 Qué cifras se muestran

Las filas `buena` de motor `cuantitativo` pueden mostrar cifras: pH, temperatura, masa, volumen de gas y presión de CO₂ en un recipiente del laboratorio, como ya hace el motor actual. Las filas peligrosas (`explosion`, `llamarada`, `gas-toxico` de las malas mezclas, termita, H₂/O₂, CO, NO₂) se tratan como `cualitativo` o `aviso`. El motor puede calcular internamente para decidir el desenlace, pero **no muestra proporciones óptimas, límites de inflamabilidad, presiones de rotura ni tiempos**. Para `sobrepresion`, el manómetro se muestra por zonas (normal, alerta, rotura) y no como una cifra que permita dimensionar un recipiente. Así se mantiene el límite de seguridad de este catálogo sin vaciar la parte didáctica.

### 8.6 Filas repetidas entre niveles

Algunas reacciones aparecen en más de un nivel con tratamiento distinto, a propósito. Por ejemplo, el potasio en agua es una demostración del docente en secundaria (S46) y una simulación con más detalle en universidad (U03). La regla es que **cada laboratorio usa la fila de su propio nivel**. Si no existe, usa la del nivel inferior más cercano. Una fila de catálogo (P/S/U) prevalece sobre la fila M de la misma ecuación. Duplicados conocidos: P37/S03, P07/U18, S21/U34, S28/M18, S31/U13, S33/U09, S45/U02, S46/U03, U23/M79, U24/M80, U25/M68, U27/M02 y U10/M01.

### 8.7 Preguntas abiertas para el diseño del proyecto 2

La revisión del documento dejó preguntas que no corresponden a la investigación, sino al diseño del motor. Se resolverán en esa conversación:

1. **Arquitectura:** ¿el motor es un recipiente que acumula especies a lo largo del tiempo (como el `reactor.ts` actual) o una búsqueda por pares? ¿Qué pasa con espectadores (agua, sal) y con dos filas activas a la vez (lejía + amoníaco + vinagre)?
2. **Condiciones:** recipiente abierto o cerrado, calor, luz UV, chispa, gota de agua, orden de adición y concentración. ¿Son acciones del alumno con herramientas 3D, condiciones fijas del escenario o texto? ¿La concentración es discreta («de botiquín» o «concentrada») o continua?
3. **Inventario por nivel:** ¿qué sustancias y formas hay en cada laboratorio? ¿Hay un estante de productos cotidianos (vinagre, leche, levadura) aparte del selector de tabla periódica?
4. **Filas `aviso`:** ¿se bloquea la mezcla antes, se avisa después o se muestra el observable sin efectos?
5. **Avatar y EPP:** ¿hay un modelo de exposición y salud, y el EPP puesto cambia el desenlace (salpicadura sobre gafas o sin gafas), o eso queda para los proyectos 3 y 5?

### 8.8 Modelo de datos sugerido

Un catálogo versionado, como el actual `src/lib/science/chemistry/catalog.ts`, con un registro por fila: `id`, `reactivos[] {especie, forma, estado}`, `productos[]`, `ecuacion`, `tipos[]`, `consecuencias[]`, `observable`, `ghs[]`, `mezcla`, `niveles[]`, `epp[]`, `instrumentos[]`, `motor`, `condiciones[]`, `intensidad?` (solo para `explosion`), `deltaH?`, `fuentes[]`. Las tablas de este documento tienen la mayoría de esas columnas. Las condiciones, el ΔH y los niveles (que salen de la sección de cada fila) hay que completarlos al curar los datos, así que la conversión es solo en parte mecánica.

## 9. Verificación y fuentes

**Balance.** Un comprobador automático leyó las 237 filas de este documento y verificó la conservación de átomos y de carga en todas las ecuaciones que no son esquemas, sin fallas. Las filas restantes son esquemas `≈`, cambios físicos o aleaciones sin ecuación química. El comprobador se incorporará al catálogo de datos cuando se implemente el proyecto 2, para volver a ejecutarlo en cada ampliación.

**Códigos.** Todas las filas de los niveles usan solo tipos y consecuencias de las §1 y §2, un valor válido de Mezcla y de Motor, y al menos una fuente enlazada. Las filas M usan las fuentes generales de la §6 y la regla de ejecución por defecto de esa sección. Ninguna fila de primaria lleva `explosion`. La columna «Primer nivel» de la §1 se calcula a partir de las filas.

**Revisión independiente.** Un revisor leyó el documento como si tuviera que construir el motor del proyecto 2. Se corrigieron los errores químicos y de coherencia que encontró: H₂ como gas inflamable y no inocuo, `explosion` reservada a fenómenos reales, consistencia entre filas repetidas y entre catálogo y matriz, motor `cualitativo` en las reacciones peligrosas y nuevos códigos para cambios físicos, polímeros, electricidad y olor. Sus preguntas de arquitectura quedan en la §8.7.

**Contenido peligroso.** Se revisó que ninguna fila contenga cantidades, concentraciones de trabajo, proporciones ni procedimientos de preparación de mezclas peligrosas. Cada nivel termina con su lista de reacciones excluidas deliberadamente.

**Fuentes.** Se priorizaron OpenStax, RSC, ACS, ILO ICSC, NIOSH/CDC, CSB, CCOHS, NIH, LibreTexts y demostraciones universitarias. Límites de verificación:

- Las páginas de **edu.rsc.org** y parte de **acs.org** bloquean la descarga automática con desafíos anti-bot (HTTP 202/403). Se confirmaron por título y extracto en resultados de búsqueda, no abriendo la página completa.
- Las actividades de **Science Buddies** se citan en su versión republicada en *Scientific American*, que sí pudo leerse.
- La página de AIChE/CCPS devuelve 403 a clientes automáticos, igual que en la investigación anterior.
- Las fichas ICSC aparecen con los dominios `www.ilo.org` y `chemicalsafety.ilo.org`: el primero redirige al segundo. Conviene unificarlos al curar los datos.
- Los **pictogramas GHS** se asignaron según la clasificación habitual de cada sustancia. Antes de usarlos en producción hay que contrastarlos con las fichas de seguridad del proveedor de cada forma y concentración concreta.
- Falta la revisión de un docente o químico especialista, como ya se indicaba en la investigación principal (§15).
