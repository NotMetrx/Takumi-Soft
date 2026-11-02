# Revisión SDD e integración de MediaPipe

Fecha: 2026-10-31. Documento revisado: `SymbioLab_SDD_Consolidado_v0.2.0.md`, especialmente Feature 001, US-002, US-003, US-006, plan y contratos integrados; también `docs/architecture.md`.

Movilidad actualizada el 2026-11-01: altura, profundidad relativa, giro con dirección, alcance del cursor y encuadre del modo manos.

Reconocimiento corregido el 2026-11-01: calibración menos exigente al reabrir la pinza, tolerancia a ausencias breves, indicador de mano detectada y entrega de resultados recientes tras inferencias lentas.

El repositorio contiene el consolidado 0.2.0. Las rutas individuales `specs/001-chemistry-gestural-mvp/` y `.specify/memory/constitution.md` citadas por él no están presentes. Se conserva el consolidado como referencia; este informe registra implementación y pendientes sin cambiar sus criterios de aceptación.

## Resultado de la revisión

La cámara anterior solo mostraba vídeo y un botón «Simular Pinza». Eso no acreditaba agarre, movimiento ni inclinación reales. Además, Vite no tenía `publicDir: 'static'`, así que esa carpeta no estaba configurada para entregar los modelos locales.

| Requisito | Implementación actual | Evidencia pendiente |
| --- | --- | --- |
| Consentimiento y cierre de cámara | Inicio explícito, apagar, alternativa mouse, cierre de tracks y modelo, cancelación de solicitudes pendientes | Permisos reales, revocación y salida de página en navegador |
| Una mano y calibración | Modelo local, imagen espejo, calibración abierta/cerrada y ángulo neutro | Distintas manos, iluminación y dispositivos |
| Pinza y liberación | Distancia dividida por tamaño de palma, histéresis, agarre a 150 ms, liberación a 100 ms | Usabilidad con webcam |
| Traslado e inclinación | Cursor con resaltado de agarre, plano vertical para altura y lateralidad, profundidad relativa por tamaño aparente de palma, giro con dirección y suavizado | Recorrido completo en la escena con una mano real |
| Pérdida de tracking | Corte inmediato del flujo al recibir ausencia; watchdog de datos de 250 ms; tras 1500 ms de ausencia se pide Retomar y abrir la mano | Oclusión, vídeo congelado y pérdida de permisos en hardware |
| Conservación de volumen | El gesto usa el mismo dosificador y límites que el mouse; ensayos etiquetados `gesture` | Comparación manual de dosis y pH |
| Privacidad | No se persisten ni transmiten frames o landmarks; solo estado interpretado efímero | Auditoría de red y almacenamiento durante uso real |
| Recursos locales y offline | SDK fijado, modelo/WASM locales y manifiesto de hashes; indicador HUD «Local» | Service worker, precache, reapertura y sesión completa en modo avión |

No se declara P0 completado. También quedan pendientes otros requisitos del SDD, como persistencia IndexedDB, paridad completa por teclado y perfiles de rendimiento.

## Uso

1. Abrir `http://localhost:5173/` y seleccionar **Manos AR** en el modo inmersivo, o **Control con manos** en Exploración libre.
2. Pulsar **Activar Cámara** y conceder permiso. Fuera de localhost se necesita HTTPS: una URL LAN con HTTP no habilita la cámara.
3. Mantener la palma vertical y los dedos abiertos; pulsar **Calibrar mano abierta** y sostener un segundo.
4. Juntar índice y pulgar sin girar; pulsar **Calibrar pinza** y sostener un segundo.
5. Abrir la mano y llevar el cursor sobre un matraz: el cursor verde y el mensaje «Matraz al alcance» confirman el objetivo. Sostener la pinza para agarrarlo sin saltos de posición.
6. Manteniendo la pinza, subir/bajar la mano para elevar/bajar el matraz y desplazarla lateralmente para trasladarlo. Acercar la mano a la cámara acerca el recipiente; alejarla lo lleva hacia el fondo. Pequeñas variaciones de tamaño de la mano no cambian la profundidad.
7. Elevar el matraz y colocar su boca por encima de la abertura del vaso. Girar la muñeca hacia el vaso respecto del ángulo calibrado; una inclinación cercana a 57° alcanza el ángulo máximo del matraz. Girar en sentido contrario inclina en sentido contrario. El líquido solo fluye cuando la boca está sobre el vaso y la geometría permite verter; ya no se fuerza una posición fija al entrar en la zona central.
8. Abrir para cortar y devolver el recipiente a su apoyo. Al perder seguimiento por más de 1.5 segundos o cambiar de pestaña, pulsar **Retomar con la mano abierta**. **Apagar** libera la cámara.

El video se oculta al completar la calibración para despejar la mesa; **Mostrar video de la mano** permite recuperarlo sin detener el seguimiento. El 70% central del encuadre controla toda la mesa, para alcanzar sus extremos sin sacar la mano de la imagen. El modo manos amplía el campo de visión para dejar espacio al levantar recipientes; al apagarlo se recupera el encuadre habitual. La cámara de la escena no gira mientras se sostiene un matraz.

La integración con el modo inmersivo, el mueble STEAM y el libro de Primaria/Secundaria conserva estos controles. Abrir el libro, el selector de actividades o la biblioteca de reactivos suspende la manipulación gestual de la escena. Mientras el microscopio está activo o su cámara regresa a la mesa, la manipulación de matraces también se suspende.

La escala de los landmarks no se convierte a centímetros ni a mL. La profundidad usa el cambio relativo del tamaño aparente de la palma desde el agarre, suavizado y con margen del 15%; no es una medición de distancia y puede variar si se gira la palma hacia la cámara. La altura y el desplazamiento lateral usan un plano vertical orientado a la cámara, para que levantar la mano no empuje el objeto sobre la mesa. Se limita el alcance y se impide bajar un matraz por el centro del vaso; esto no equivale a un motor completo de colisiones. Las cantidades proceden del caudal virtual y del tiempo, limitadas por disponibilidad y capacidad.

## Recursos y ejecución

- SDK `@mediapipe/tasks-vision` fijado a `0.10.35`.
- Detección, presencia y seguimiento usan la confianza predeterminada del SDK (0.5), en lugar de exigir 0.65.
- `static/models/mediapipe/hand_landmarker.task`: modelo oficial `float16/1`.
- `static/models/mediapipe/wasm/`: variantes SIMD, no SIMD y módulo de esa versión del SDK.
- `static/models/mediapipe/manifest.json`: origen, tamaños y SHA-256. Es un inventario verificable; todavía no es un verificador de caché en tiempo de ejecución.
- Vite publica `static` en desarrollo y lo copia a `dist` al compilar.
- Inferencia síncrona en CPU limitada a 15 Hz, separada del render por su cadencia. Puede bloquear la UI durante cada detección; debe medirse antes de validar NFR-001/002. Si hay bloqueos, trasladar inferencia a Worker y probar compatibilidad. No se promete FPS ni latencia.
- La antigüedad del resultado se cuenta desde que termina la inferencia; una detección lenta no se descarta como antigua al entregarla. La cadencia deja al menos 67 ms desde esa entrega antes de volver a inferir. El vídeo congelado sigue notificando ausencia.

La captura de calibración solo se habilita al detectar una mano y muestra su progreso. Tolera hasta 350 ms de ausencia; una interrupción mayor cancela la captura. Los umbrales de pinza siguen adaptándose al cierre de cada persona, pero limitan la separación adicional exigida: abrir mucho los dedos durante la calibración ya no obliga a repetir esa apertura extrema para activar o soltar el agarre. Después de calibrar o retomar, la interfaz indica que hay que separar índice y pulgar antes de agarrar.

Se usa `HandLandmarker.createFromOptions` y `detectForVideo(video, timestamp)` siguiendo la [guía oficial de Google](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js). El modelo se obtiene de [Google MediaPipe Models](https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task). Durante el uso se carga desde el mismo origen de la aplicación.

## Verificación

Pruebas automatizadas en `tests/input/hand_gestures.test.ts` y `tests/input/hand_camera.test.ts`: normalización, espejo, histéresis, inclinación, ausencia prolongada, reapertura tras calibraciones muy separadas, datos de calibración inválidos, frescura tras inferencias lentas, vídeo congelado, recursos locales, solicitud explícita y cierre tras cancelaciones asíncronas. Las pruebas unitarias de cámara usan dobles; no ejecutan el modelo ni sustituyen una webcam real.

`tests/interaction/hand_manipulation.test.ts` verifica que elevar la mano conserva profundidad con tres orientaciones de cámara, el agarre no salta, el tamaño de palma tiene margen y límites, ambos giros permiten verter por la boca y el alcance respeta la mesa. La suite completa contiene 51 pruebas; el chequeo Svelte/TypeScript no tiene errores ni avisos. La compilación conserva el aviso de tamaño de bundle.

En Chromium se verificaron secuencias sintéticas a través de `HandGestures` y la escena WebGL: agarre desde el apoyo, elevación con profundidad constante y cuello visible, cambio de profundidad, vertido con ambos matraces, corte al abrir, devolución al apoyo y pérdida de seguimiento aun recibiendo continuamente muestras ausentes. Se comprobó también dosificación por botón tras reiniciar en el mismo fotograma y después del uso gestual. Otra comprobación con el adaptador de cámara sustituido verifica las dos etapas de calibración, ocultar/mostrar video, pausa, apertura obligatoria al retomar, pérdida de foco y apagado. No se usaron imágenes de una webcam real para estas comprobaciones.

La corrección del reconocimiento se comprobó además con `HandCamera` y el modelo local real en Chromium, alimentando un `canvas.captureStream(15)` con la [imagen pública de mano del ejemplo oficial de Google](https://github.com/google-ai-edge/mediapipe-samples-web/blob/main/public/hand_model.png): 16 detecciones válidas, ninguna ausencia, también con el vídeo oculto; al apagar se cerró el stream. Un ensayo de interfaz con el adaptador de cámara y el dibujado 3D sustituidos comprobó el bloqueo de captura sin mano, progreso, tolerancia a una ausencia de 200 ms, cancelación tras más de 350 ms, reapertura relajada después de calibrar con dedos muy separados, mensajes de activación/objetivo, pausa prolongada, retomar y apagado. Estas comprobaciones no acreditan rendimiento ni usabilidad con una webcam física.

Antes de aceptar AC-002/003 hay que probar manualmente ambos matraces, ambas manos, mala luz, apertura rápida, oclusiones breves/prolongadas, pestaña oculta, permiso denegado/revocado, vaso lleno, reactivo agotado y la alternativa mouse. Medir tiempos de detección y frames durante el recorrido. Para AC-006.1 se requiere además completar y probar la instalación offline.
