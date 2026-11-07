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
