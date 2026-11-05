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
