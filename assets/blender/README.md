# Microscopio piloto

Modelo creado en Blender 5.2 mediante herramientas de la interfaz: primitivas, extrusión, bisel, Boolean Difference, duplicación y modificadores. No se usaron bpy ni scripts para generar el modelo.

- Fuente editable: `microscope.blend`.
- Exportación: `../../static/models/instruments/microscope.glb`.
- Vista previa: `microscope-preview.png`, renderizada a partir del GLB con Three.js.
- 31 mallas, 7 materiales, 13.622 triángulos; GLB de 442.844 bytes, sin texturas ni archivos externos.
- Altura aproximada de 40,5 cm; GLB con eje Y vertical y raíz `microscope`.

Las piezas conservan sus nombres y orígenes individuales. Los nodos `base`, `arm`, `head`, `tube`, `stage`, `slide`, `condenser`, `diaphragm` e `illuminator` identifican las partes principales. Los prefijos `oculars.*`, `objectives.*`, `coarse_knob.*`, `fine_knob.*`, `stage.clip*` y `slide.*` identifican sus piezas auxiliares. Los objetivos 4x, 10x y 40x tienen anillos rojo, amarillo y azul. La platina tiene una abertura geométrica real.

La geometría original permanece en el `.blend`; los modificadores Decimate reducen la exportación sin unir componentes. La platina usa Weighted Normal para conservar superficies planas. Las bibliotecas de Blender necesarias están empaquetadas. El vidrio utiliza `KHR_materials_transmission`.

Para volver a exportar desde Blender: seleccionar la raíz y sus mallas, File → Export → glTF 2.0, formato GLB, Selected Objects y Apply Modifiers activados; cámaras, luces y animaciones desactivadas. No incluir la cámara y la luz de la escena de trabajo.

La escena carga el GLB y conecta el revólver, la platina, la muestra, los mandos y la iluminación con los controles existentes. La integración identifica las piezas por su nombre original de Blender, conservado en `userData.name` por GLTFLoader.

Validación: estructura binaria, jerarquía, referencias de buffers y carga con GLTFLoader de Three.js 0.170; las 31 piezas conservan su posición y su identificación interactiva. Se confirmó la carga del modelo dentro de la aplicación. No se midió rendimiento en dispositivos reales.

# Mobiliario perimetral del laboratorio

Modelado en Blender 5.2 sobre la escena `laboratorio-app.blend`. Las piezas se construyeron solo con operadores de interfaz enviados por el add-on MCP: primitivas, transformaciones, Bevel, Array, Duplicate, Join y Visual Geometry to Mesh. No se generó geometría vértice a vértice ni se guardaron scripts en el repositorio.

- Fuente editable: `laboratorio-app.blend`. Cada equipo es un objeto separado de la colección `LabProps`, con su nombre y origen en el suelo.
- La colección `REF_Nave (no exportar)` es una maqueta en alambre de la nave de la app (paredes, mesas y SAS) con las mismas coordenadas, para ubicar piezas nuevas.
- Exportación: `../../static/models/lab/lab_props.glb`, con 959.552 bytes, 21.884 triángulos, 86 primitivas y 18 cajas de colisión. No lleva texturas ni UV.

## Escala y coordenadas

En Blender, (x, y, z) corresponde a (x, -z, y) en la app. El suelo está en z = -1,55 y la encimera de las mesas en z = 0. Como la nave de la app no está a escala real (del suelo a la encimera hay 1,55 m), los muebles de piso se modelaron con medidas reales multiplicadas por 1,72. Los instrumentos de mesada se modelaron multiplicados por 1,25.

## Contenido

- **Pared este:** campana extractora de gases con conducto, guillotina y monitor de flujo; armarios de seguridad para inflamables (amarillo) y corrosivos (azul); tres cilindros de gas encadenados con manómetros; estufa de secado sobre mueble de cajones.
- **Pared oeste:** cabina de bioseguridad clase II sobre soporte, incubadora de CO₂ doble, refrigerador de muestras con puerta de vidrio, ultracongelador de -80 °C, autoclave vertical y kit antiderrames.
- **Pared sur, lado oeste:** dos módulos de mesada (vitrina alta con material de vidrio y escurridor de pared), balanza analítica, placa calefactora con agitador, centrífuga, baño María, vórtex con micropipetas y botiquín.
- **Pared sur, lado este (EPP e higiene):** perchero con cuatro batas y banca con cubrecalzado; panel de guantes S/M/L, gafas, mascarillas y cofias; lavamanos de pedal con jabón y toallas; estación de residuos clasificados con contenedor de cortopunzantes.
- **Esquinas del fondo:** vitrina de material de vidrio y vitrina de reactivos.

## Volver a exportar

El GLB no se exporta objeto por objeto. Para reducir llamadas de dibujo, se duplican los objetos de cada zona (`zona_pared_este`, `zona_pared_oeste`, `zona_sur_instrumental`, `zona_sur_epp_higiene`, `zona_norte_vitrinas`) y se unen; el exportador separa una primitiva por material. Además se agrega un Empty de cubo `COL_<objeto>` por cada mueble de piso, con escala igual a la semiextensión de su huella. Configuración de File → Export → glTF 2.0: GLB, Selected Objects, Apply Modifiers y +Y Up; desactivar UV, cámaras, luces y animaciones. Al terminar, borrar los duplicados temporales.

La compresión Draco y meshopt del exportador no funciona en el Blender flatpak porque faltan `libdraco.so.9` y `libmeshoptimizer.so`.

`src/lib/lab3d/lab_props.ts` convierte los `COL_` en colisiones del modo primera persona y congela las matrices. En el perfil gráfico básico reemplaza el vidrio con transmisión por un vidrio translúcido simple. `tests/interaction/lab_props.test.ts` comprueba el presupuesto de triángulos y primitivas, y que ningún mueble atraviese paredes ni invada las mesas, el paso a la SAS o el pasillo central.

# Infraestructura de la nave

Viene del mismo `laboratorio-app.blend`, de la colección `LabInfra`, y se exporta a `../../static/models/lab/lab_infra.glb`: 362.320 bytes, 8.952 triángulos y 20 primitivas, en tres objetos (`infra_muros`, `infra_techo` e `infra_suelo`). No reemplaza la geometría de Three.js: se monta encima, así que las puertas animadas, la SAS y los pizarrones siguen como estaban.

- **Muros:** juntas de aluminio en paneles fenólicos cada 2,4 m, cornisa perimetral y guardacantos de acero en las cuatro esquinas. En los muros este y oeste hay ventanas altas (y entre 3,0 y 3,54) con montantes, de cuatro tramos por lado, por encima de la campana y de la cabina. También hay un panel ambiental, un reloj, y un detector de gases con baliza y cartel sobre los cilindros.
- **Techo técnico:** dos conductos de impulsión vistos en x = ±1,5, entre las luminarias del pasillo, desde z = 2,3 hasta el muro sur, con difusores, juntas y abrazaderas. Hay una bandeja portacables con cables de colores sobre los pizarrones y luminarias lineales colgantes en x = ±8,4 sobre los equipos perimetrales.
- **Suelo:** flechas y líneas fotoluminiscentes de evacuación hacia la SAS.

Se exporta como el mobiliario, pero sin nodos `COL_`. Antes de exportar hay que aplicar todas las transformaciones (Ctrl+A → All Transforms) para que las cajas envolventes sean exactas. La app la carga sin sombras propias. La prueba de `lab_props.test.ts` comprueba el presupuesto, que todo quede dentro de la nave, y que ningún vértice tape los pizarrones, el vano de la puerta ni las luminarias del pasillo.

# Asistente robot

Avatar original del asistente IA, guardado en `asistente-robot.blend`: blanco liso, flotante, con visor de ojos LED, torso en V y brazos sin manos que terminan en anillos de agarre. Mide 1,13 m a escala real y en la app se escala ×1,72.

- **Esqueleto `esqueleto`:** huesos `raiz`, `cuerpo`, `torso`, `cabeza`, `brazo_izq`/`brazo_der` y `antebrazo_izq`/`antebrazo_der`. Cada pieza rígida cuelga de su hueso (Ctrl+P → Bone), sin pesos de piel.
- **Acciones (24 fps):** `flotar` (bucle de 96 cuadros), `saludar` (60), `senalar` (48) y `asentir` (30).
- **Exportación:** `../../static/models/assistant/robot.glb` pesa 222.644 bytes y tiene 9.292 triángulos. Se seleccionan el esqueleto y sus hijos, con glTF en modo de animación «Actions» y muestreo forzado.

En código, `src/lib/lab3d/assistant_robot.ts` expone `AssistantRobot.play('saludar' | 'senalar' | 'asentir' | 'flotar')` y `update(dt)`. Los gestos vuelven solos a `flotar`.

# Esclusa sanitaria SAS-01

Rediseño detallado de la esclusa del fondo, dentro de `laboratorio-app.blend`. Vive en su propia colección `Desinfeccion_SAS`, separada de `LabInfra` y `LabProps`, con cinco subcolecciones: `SAS_Estructura` (166 objetos), `SAS_Equipamiento` (246), `SAS_Instalaciones` (127), `SAS_Senaletica` (92) y `SAS_Iluminacion` (27). En total son 658 objetos: 600 mallas, 58 textos 3D y unas 16.600 caras. No se modificó el mobiliario ni la infraestructura existentes.

## Coordenadas y flujo

- Huella: x −4,0 a 4,0; y −10,0 a −14,5; suelo z = −1,55. Se conserva la correspondencia (x, y, z) de Blender con (x, −z, y) de la app.
- Muro norte en y = −10,0, con las dos hojas correderas del laboratorio aparcadas en x −2,51..−1,39 y 1,39..2,51, igual que en la app. Muro sur en y = −14,5, con el acceso exterior, la marquesina y el apron de entrada.
- Secuencia: acceso exterior (zona sucia) → bandeja de desinfección de calzado → banco de cruce → zona limpia → vestidor de EPP en el muro este → pórtico de ducha de aire + UV-C en y = −10,6 → puertas del laboratorio.
- El banco de cruce se sitúa en y = −12,95, 0,45 m al norte del banco básico de la app, para ampliar la zona sucia y separar la bandeja de calzado del acceso. La huella, los muros, el pórtico, la ducha y el vestidor conservan la posición de la app.
- Zonas: epoxi rojo al sur y verde al norte, banco de acero con filos rojo/verde y leyendas LIMPIO/SUCIO, bandeja de calzado con rejilla y líquido azul, y marcas de paso 1–6 alineadas con el póster de secuencia.

## Equipamiento y seguridad

- **Ducha de emergencia y lavaojos (muro oeste):** columna y cabezal de acero, plato de ducha, mango triangular rojo con agarres negros y placa `TIRAR`, señales de ducha y lavaojos, y extintor de CO₂ con señalización.
- **Vestidor de EPP (muro este):** armario de acero con tres bahías, batas colgadas con silueta, perchas y pinzas, estantes con cajas rotuladas de guantes, mascarillas, gafas y cofias, cajones inferiores y batas dobladas. Un cabecero teal rotula cada bahía y el conjunto se cierra con un rótulo `EQUIPO DE PROTECCION PERSONAL`.
- **Pórtico de ducha de aire + UV-C (y = −10,6):** marco de acero, boquillas de soplado, dintel con rótulo de advertencia `NO MIRAR A LA LUZ UV`, lámparas UV-C, sensor de presencia y panel de interlock con display, pulsador de emergencia y pilotos rojo/ámbar/verde.
- **Control de acceso (fachada sur):** lector RFID/biométrico junto al vano, intercomunicador con pulsador, panel de estado OCUPADO/LIBRE, aforo máximo 2 personas y señalización de EPP obligatorio.
- **Instalaciones:** extracción de aire en la esquina sureste con ducto, rejilla, brida, abrazadera y rótulo `EXTRACCION / AIRE`; manómetro de presión diferencial, reloj, luces de emergencia, CCTV, detectores y tomas de servicios.
- **Iluminación:** cuatro paneles LED de techo, tiras LED en el vestidor y en el pórtico, balizas de estado y acentos UV-C violeta. Las luminarias son emisivas; las cámaras y luces de render viven en la colección aparte `PREVIEW (no exportar)`.

## Lógica de interlock prevista

El panel y la señalización describen una secuencia de esclusa: el acceso valida identidad y aforo (máximo 2), las puertas exterior y de laboratorio no pueden quedar abiertas a la vez, y la ducha de aire con UV-C solo se habilita con el volumen cerrado. La luz UV-C se mantiene apantallada y señalizada; el pulsador de emergencia y el intercomunicador están siempre activos. La app sigue resolviendo la colisión y el recorrido con su geometría procedural; este modelo desarrolla el volumen, el equipamiento y la señalización con mucho más detalle.

## Previsualizaciones

En `assets/_preview/` quedaron los renders finales: `sas_final_front.png`, `sas_final_entry.png`, `sas_final_ext.png`, `sas_final_plan.png`, `sas_final_int_sw.png`, `sas_final_int_se.png`, `sas_final_epp.png`, `sas_final_handle.png`, `sas_final_aforo.png`, `sas_final_extraction.png` y `sas_final_ne_strip.png`. `sas_before.png` conserva el estado inicial para comparar.

`REF SAS` sigue oculta y no se borró. La colección `Desinfeccion_SAS` no se exportó a GLB: la app continúa usando su SAS procedural y este archivo queda como fuente editable. Para exportarla, seleccionar solo esa colección, aplicar transformaciones y usar glTF 2.0 en GLB con `+Y Up`, sin cámaras, luces ni animaciones.
