import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = path.join(root, 'src/lib/science/chemistry/wasm/chemistry.wasm');

try {
  execFileSync('cargo', ['build', '--manifest-path', 'crates/chemistry/Cargo.toml', '--target', 'wasm32-unknown-unknown', '--release', '--locked'], { cwd: root, stdio: 'inherit' });
  mkdirSync(path.dirname(destination), { recursive: true });
  copyFileSync(path.join(root, 'crates/chemistry/target/wasm32-unknown-unknown/release/symbiolab_chemistry.wasm'), destination);
  console.log(`Rust/WASM: ${statSync(destination).size} bytes → ${path.relative(root, destination)}`);
} catch (err) {
  if (existsSync(destination)) {
    console.log(`Rust/WASM precompilado disponible (${statSync(destination).size} bytes): ${path.relative(root, destination)} (omitiendo compilación cargo)`);
  } else {
    throw err;
  }
}
