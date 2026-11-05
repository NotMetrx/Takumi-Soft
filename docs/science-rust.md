# Motor científico Rust/WASM

El núcleo numérico está en `crates/chemistry`, sin dependencias de crates externos. Se compila como WebAssembly y se ejecuta dentro del navegador. Esta entrega no añade un servidor remoto.

## Cálculos conectados

- Equilibrio acuoso: balance de carga, autoionización del agua, acetato, carbonatos, ácido cítrico y amoníaco.
- Precipitación acoplada de CaCO₃ y Ca(OH)₂, y límite estequiométrico de Cu(OH)₂.
- Neutralización: raíz estable de hidronio, Kw dependiente de temperatura y estimación adiabática del calor.
- Gas: desgasificación ideal por equivalentes, aire atrapado, presión y volumen de CO₂.

Las constantes, unidades, supuestos y cobertura corresponden a `aqueous-exploration-1.0.0` y `strong-acid-base-25C-v1`. Las fuentes científicas están en `catalog.ts` y las observaciones de `reactor.ts`. El balance y la especiación usan `f64`. La búsqueda de pH conserva el intervalo [-1, 15] y se detiene cuando su ancho es menor que 1e-12, con un máximo de 90 iteraciones.

El catálogo, los avisos de incompatibilidad, las observaciones y las reglas docentes permanecen en TypeScript. Las mezclas fuera del modelo siguen devolviendo cobertura parcial o desconocida; no se infieren productos ni rendimientos nuevos. Yodo/almidón sigue siendo cualitativo. Esta migración mejora la ejecución de modelos existentes, no su validez científica ni la cobertura de todas las reacciones posibles.

## Integración

`numeric_engine.ts` carga el binario local antes de montar la aplicación. Vite empaqueta el WASM como recurso con hash. La carga tiene un límite de cinco segundos y comprueba la versión de ABI y las exportaciones. Si falla, se conserva el motor TypeScript de `numeric_reference.ts`, sin depender de un servidor ni de un CDN. El precache completo y la reapertura offline de la aplicación siguen siendo trabajo separado.

La ABI intercambia escalares y un bloque de nueve `f64`: pH, residual de carga, CaCO₃ en mol, Ca(OH)₂ en mol, concentración de H⁺, carbono acuoso en mol, fracciones de bicarbonato y carbonato, y acetato en mol. El bloque se copia a un objeto JavaScript antes de la siguiente llamada. No hay serialización JSON ni asignaciones de resultados por reacción en el núcleo Rust. `getScienceBackend()` permite comprobar si se está usando `rust-wasm` o `typescript`.

## Compilar y validar

```bash
rustup target add wasm32-unknown-unknown
npm run build:science
npm run test:science
npm test
npm run check
npm run build
npm run bench:science
```

El binario generado se incluye en `src/lib/science/chemistry/wasm/chemistry.wasm` para permitir `npm run dev` sin compilar Rust en cada arranque. `prebuild` lo recompila desde fuentes para producción; después de editar Rust, ejecutar también `build:science` durante el desarrollo. Cargo.lock fija la compilación; los directorios `target` se excluyen de Git.

La suite carga el binario WASM real y compara los 324 pares ordenados de las 18 sustancias del catálogo, además de ensayos de neutralización, tampón, precipitación, citrato, amoníaco, gas y parada por presión. Comprueba cantidades, especies, observaciones y avisos, entradas inválidas, reutilización de memoria y respaldo ante HTTP fallido o binario inválido. Las pruebas nativas Rust comprueban balances y límites numéricos.

El benchmark compara ocho equilibrios representativos entre la referencia TypeScript y Rust/WASM, incluyendo las llamadas y la copia de resultados hacia JavaScript. Una ejecución local con Node 24 registró 0,4989 ms por lote en TypeScript y 0,2463 ms en Rust/WASM (2,03×); son mediciones de este equipo, no una garantía para otros dispositivos.

No mide FPS, MediaPipe, acceso a red, carga inicial ni dispositivos de estudiantes. El rendimiento de mallas, materiales y texturas 3D se optimiza por separado. Se comprobó en navegador tanto el arranque con `rust-wasm` como el respaldo `typescript` ante un HTTP 503 del binario, incluyendo neutralización y bloqueo por incompatibilidad.

## Referencias de integración

- [Destino oficial wasm32-unknown-unknown de Rust](https://doc.rust-lang.org/rustc/platform-support/wasm32-unknown-unknown.html).
- Los modelos didácticos y fuentes de constantes se conservan en `src/lib/science/chemistry/catalog.ts` y `reactor.ts`.
