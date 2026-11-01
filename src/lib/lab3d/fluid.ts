import * as THREE from 'three';

// Interior del matraz, en las mismas unidades que su vidrio.
const interior = new THREE.LatheGeometry([
  new THREE.Vector2(0, 0.035), new THREE.Vector2(0.295, 0.035),
  new THREE.Vector2(0.095, 0.56), new THREE.Vector2(0.095, 0.81),
  new THREE.Vector2(0, 0.81)
], 24).toNonIndexed();
const vertices = interior.getAttribute('position');
const triangles: THREE.Vector3[][] = [];
for (let i = 0; i < vertices.count; i += 3) {
  triangles.push([0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(vertices, i + j)));
}
interior.dispose();

function clip(normal: THREE.Vector3, height: number, build = false) {
  const faces: THREE.Vector3[][] = [];
  const rim: THREE.Vector3[] = [];
  const origin = normal.clone().multiplyScalar(height);
  const aRelative = new THREE.Vector3(), bRelative = new THREE.Vector3(), cRelative = new THREE.Vector3();
  const cross = new THREE.Vector3();
  let signedVolume = 0;
  for (const triangle of triangles) {
    const polygon: THREE.Vector3[] = [];
    for (let i = 0; i < 3; i++) {
      const a = triangle[i], b = triangle[(i + 1) % 3];
      const da = a.dot(normal) - height, db = b.dot(normal) - height;
      if (da <= 0) polygon.push(a);
      if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
        const point = a.clone().lerp(b, da / (da - db));
        polygon.push(point);
        if (build) rim.push(point);
      }
    }
    for (let i = 1; i < polygon.length - 1; i++) {
      const a = polygon[0], b = polygon[i], c = polygon[i + 1];
      signedVolume += aRelative.subVectors(a, origin).dot(cross.crossVectors(
        bRelative.subVectors(b, origin), cRelative.subVectors(c, origin))) / 6;
      if (build) faces.push([a, b, c]);
    }
  }
  if (rim.length > 2) {
    const center = rim.reduce((sum, p) => sum.add(p), new THREE.Vector3()).divideScalar(rim.length);
    const u = new THREE.Vector3(0, 0, 1);
    const v = normal.clone().cross(u);
    rim.sort((a, b) => Math.atan2(a.clone().sub(center).dot(v), a.clone().sub(center).dot(u))
      - Math.atan2(b.clone().sub(center).dot(v), b.clone().sub(center).dot(u)));
    for (let i = 0; i < rim.length; i++) faces.push([center, rim[i], rim[(i + 1) % rim.length]]);
  }
  // Con origen sobre el plano, la tapa aporta volumen tetraédrico cero.
  const volume = Math.abs(signedVolume);
  return { faces, volume };
}

const fullVolume = clip(new THREE.Vector3(0, 1, 0), 1).volume;

// shortcut: equilibrio hidrostático; añadir viscosidad y oleaje si se requiere dinámica de fluidos.
/** Superficie libre horizontal y volumen conservado dentro del perfil del vidrio. */
export function flaskFluid(angle: number, fraction: number) {
  const normal = new THREE.Vector3(Math.sin(angle), Math.cos(angle), 0);
  let low = -1, high = 1;
  const target = fullVolume * THREE.MathUtils.clamp(fraction, 0, 1);
  for (let i = 0; i < 15; i++) {
    const mid = (low + high) / 2;
    if (clip(normal, mid).volume < target) low = mid;
    else high = mid;
  }
  const height = (low + high) / 2;
  const { faces, volume } = clip(normal, height, true);
  return { positions: new Float32Array(faces.flatMap(face => face.flatMap(p => p.toArray()))), height, volume };
}

export function pourRate(angle: number, surfaceHeight: number) {
  const lipHeight = 0.81 * Math.cos(angle) - 0.095 * Math.abs(Math.sin(angle));
  const head = surfaceHeight - lipHeight;
  return head > 0 && Math.abs(angle) > 0.5 ? Math.min(18, 45 * Math.sqrt(head)) : 0;
}

export function streamHitsBeaker(nozzle: THREE.Vector3) {
  return nozzle.y > 1.025 && Math.hypot(nozzle.x, nozzle.z) < 0.35;
}
