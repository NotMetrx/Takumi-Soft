# Optimización de renderizado

Se aplicó `threejs-performance` sobre Three.js 0.170.0, sin actualizar el motor ni cambiar el diseño del HUD. Rust/WASM conserva los cálculos científicos; esta entrega reduce trabajo del renderizador y del bucle de animación.

## Cambios

- Mano AR: 16 articulaciones, 5 puntas y 23 huesos se dibujan como tres `InstancedMesh`, junto a la palma. Se conservan las 45 piezas originales y sus 3.020 triángulos. Se actualizan los límites de las instancias al cambiar la pose para mantener el culling correcto.
- Se reutilizan los vectores del filtro 1-Euro, las orientaciones de huesos y las variables temporales de animación. Los materiales de los guantes solo cambian cuando cambia el EPP.
- Los cuatro frascos de fondo y sus tapas comparten dos llamadas de dibujo. Las doce patas comparten una geometría, con matrices locales fijas y culling individual.
- Tras una carga correcta del microscopio GLB se retiran y liberan las piezas del modelo de respaldo. Si falla la carga se conserva el modelo original. Si el componente se destruye durante la descarga, el recurso recibido se libera.
- La limpieza de escena libera una vez las geometrías, materiales y texturas compartidos, además de los buffers propios de `InstancedMesh`.
- Para seleccionar matraces con la mano se actualizan las matrices de esos dos objetos, en lugar de las de toda la escena.

## Mediciones antes y después

Referencia anterior: commit `5c7c0b7`. Misma cámara por estación, viewport de 680×480, DPR 1, perfil básico, sombras desactivadas, movimiento reducido y modelo GLB cargado. Chromium headless utiliza ANGLE/SwiftShader (renderizado por software), con hardwareConcurrency y deviceMemory fijados a 8 para conservar el mismo perfil. La mano se comprueba aparte con 21 landmarks sintéticos idénticos.

Posiciones/objetivos de cámara: Química `(0.08, 1.88, 3.42)` → `(0, 0.55, 0)`; Biología `(-3.5, 1.45, 1.95)` → `(-3.5, 0.52, 0.15)`; STEAM `(3.5, 1.45, 1.95)` → `(3.5, 0.52, 0.15)`. FOV de 42° en las tres vistas.

Se renderizó realmente cada vista, con un dibujo de calentamiento y tres posteriores. El bucle continuo se pausó para fijar el estado. Los contadores se leyeron de `renderer.info` después del dibujo. Las capturas de Química y de la mano se revisaron visualmente.

| Vista | Llamadas antes | Llamadas después | Triángulos antes/después |
|---|---:|---:|---:|
| Química | 232 | 220 | 71.508 / 71.508 |
| Biología | 152 | 152 | 46.792 / 46.792 |
| STEAM | 155 | 155 | 34.272 / 34.272 |
| Mano AR aislada | 45 | 4 | 3.020 / 3.020 |

El grafo completo pasó de 583 a 433 nodos y de 479 a 351 mallas. Las geometrías referenciadas por el grafo bajaron de 438 a 340; estos son recuentos, no bytes de VRAM. La reducción de llamadas de la mano es del 91 %, no una mejora equivalente de FPS.

Se descartó agrupar las cuatro patas de cada mesa en una sola instancia múltiple: en Química aumentaba los triángulos enviados de 71.508 a 76.212 al perder granularidad de culling. La versión final conserva los límites individuales y comparte el buffer geométrico.

## Verificación y límites

Las pruebas comprueban el número de articulaciones y huesos, el mismo detalle geométrico, la coincidencia de los extremos de cada hueso con sus landmarks, los límites de visibilidad, la recuperación del filtro tras perder la mano y la reutilización de vectores. También verifican la liberación única de recursos compartidos y de instancias. La prueba de caída de gotas usa una altura controlada para no confundir la caída con el reciclado aleatorio.

```bash
npm test
npm run check
npm run build
```

Los tiempos de envío de los pocos cuadros de diagnóstico en SwiftShader no se usan como prueba de mejora de FPS o de latencia en GPU física. Falta medir distribuciones de tiempo de cuadro con webcam y MediaPipe en equipos reales y en el perfil estándar con sombras. No se modificaron mallas GLB, reglas químicas, advertencias ni controles del HUD.
