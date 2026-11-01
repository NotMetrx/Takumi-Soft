# Revisión SDD e integración de MediaPipe

Fecha: 2026-10-31. Documento revisado: `SymbioLab_SDD_Consolidado_v0.2.0.md`, especialmente Feature 001, US-002, US-003, US-006, plan y contratos integrados; también `docs/architecture.md`.

El repositorio contiene el consolidado 0.2.0. Las rutas individuales `specs/001-chemistry-gestural-mvp/` y `.specify/memory/constitution.md` citadas por él no están presentes. Se conserva el consolidado como referencia; este informe registra implementación y pendientes sin cambiar sus criterios de aceptación.

## Resultado de la revisión

La cámara anterior solo mostraba vídeo y un botón «Simular Pinza». Eso no acreditaba agarre, movimiento ni inclinación reales. Además, Vite no tenía `publicDir: 'static'`, así que esa carpeta no estaba configurada para entregar los modelos locales.

| Requisito | Implementación actual | Evidencia pendiente |
| --- | --- | --- |
| Consentimiento y cierre de cámara | Inicio explícito, apagar, alternativa mouse, cierre de tracks y modelo, cancelación de solicitudes pendientes | Permisos reales, revocación y salida de página en navegador |
| Una mano y calibración | Modelo local, imagen espejo, calibración abierta/cerrada y ángulo neutro | Distintas manos, iluminación y dispositivos |
| Pinza y liberación | Distancia dividida por tamaño de palma, histéresis, agarre a 150 ms, liberación a 100 ms | Usabilidad con webcam |
| Traslado e inclinación | Cursor y raycast, traslado sobre plano, snap al vaso, inclinación relativa controla ángulo | Recorrido completo en la escena con una mano real |
| Pérdida de tracking | Corte inmediato del flujo al recibir ausencia; watchdog de datos de 250 ms; tras 1500 ms de ausencia se pide Retomar y abrir la mano | Oclusión, vídeo congelado y pérdida de permisos en hardware |
| Conservación de volumen | El gesto usa el mismo dosificador y límites que el mouse; ensayos etiquetados `gesture` | Comparación manual de dosis y pH |
| Privacidad | No se persisten ni transmiten frames o landmarks; solo estado interpretado efímero | Auditoría de red y almacenamiento durante uso real |
| Recursos locales y offline | SDK fijado, modelo/WASM locales y manifiesto de hashes; indicador HUD «Local» | Service worker, precache, reapertura y sesión completa en modo avión |

No se declara P0 completado. También quedan pendientes otros requisitos del SDD, como persistencia IndexedDB, paridad completa por teclado y perfiles de rendimiento.

## Uso

1. Abrir `http://localhost:5173/` y seleccionar **Control: Mouse / 3D**.
2. Pulsar **Activar Cámara** y conceder permiso. Fuera de localhost se necesita HTTPS: una URL LAN con HTTP no habilita la cámara.
3. Mantener la palma vertical y los dedos abiertos; pulsar **Calibrar mano abierta** y sostener un segundo.
4. Juntar índice y pulgar sin girar; pulsar **Calibrar pinza** y sostener un segundo.
5. Abrir la mano, llevar el cursor sobre un matraz y sostener la pinza para agarrarlo.
6. Manteniendo la pinza, moverlo hacia el vaso. Girar la mano respecto del ángulo calibrado; una inclinación cercana a 57° alcanza el ángulo máximo del matraz. El líquido solo fluye cuando la boca está sobre el vaso y la geometría permite verter.
7. Abrir para cortar y soltar. Al perder seguimiento por más de 1.5 segundos o cambiar de pestaña, pulsar **Retomar con la mano abierta**. **Apagar** libera la cámara.

La escala de los landmarks no se convierte a centímetros ni a mL. Las cantidades proceden del caudal virtual y del tiempo, limitadas por disponibilidad y capacidad.

## Recursos y ejecución

- SDK `@mediapipe/tasks-vision` fijado a `0.10.35`.
- `static/models/mediapipe/hand_landmarker.task`: modelo oficial `float16/1`.
- `static/models/mediapipe/wasm/`: variantes SIMD, no SIMD y módulo de esa versión del SDK.
- `static/models/mediapipe/manifest.json`: origen, tamaños y SHA-256. Es un inventario verificable; todavía no es un verificador de caché en tiempo de ejecución.
- Vite publica `static` en desarrollo y lo copia a `dist` al compilar.
- Inferencia síncrona en CPU limitada a 15 Hz, separada del render por su cadencia. Puede bloquear la UI durante cada detección; debe medirse antes de validar NFR-001/002. Si hay bloqueos, trasladar inferencia a Worker y probar compatibilidad. No se promete FPS ni latencia.

Se usa `HandLandmarker.createFromOptions` y `detectForVideo(video, timestamp)` siguiendo la [guía oficial de Google](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js). El modelo se obtiene de [Google MediaPipe Models](https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task). Durante el uso se carga desde el mismo origen de la aplicación.

## Verificación

Pruebas automatizadas en `tests/input/hand_gestures.test.ts` y `tests/input/hand_camera.test.ts`: normalización, espejo, histéresis, inclinación, ausencia prolongada, recursos locales, solicitud explícita y cierre tras cancelaciones asíncronas. Las pruebas de cámara usan dobles; no ejecutan el modelo ni sustituyen una webcam real.

Antes de aceptar AC-002/003 hay que probar manualmente ambos matraces, ambas manos, mala luz, apertura rápida, oclusiones breves/prolongadas, pestaña oculta, permiso denegado/revocado, vaso lleno, reactivo agotado y la alternativa mouse. Medir tiempos de detección y frames durante el recorrido. Para AC-006.1 se requiere además completar y probar la instalación offline.
