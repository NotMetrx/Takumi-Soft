import * as THREE from 'three';

export interface SafetyInteractiveHit {
  type: 'safety_equipment' | 'emergency_shower' | 'eyewash' | 'fire_extinguisher' | 'first_aid';
  subItem?: 'coat' | 'goggles' | 'nitrile_gloves' | 'latex_gloves' | 'shower_lever' | 'eyewash_push' | 'extinguisher_pin';
  label: string;
}

/**
 * Genera texturas canvas procedurales para señalética oficial SGA/GHS e ISO 7010
 */
export function createSafetyTexture(
  kind:
    | 'ghs_corrosive'
    | 'ghs_toxic'
    | 'ghs_biohazard'
    | 'ghs_flammable'
    | 'iso_shower_eyewash'
    | 'iso_extinguisher'
    | 'iso_emergency_exit'
    | 'ppe_station_sign'
    | 'safety_stripes'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  if (kind === 'safety_stripes') {
    canvas.width = 256;
    canvas.height = 256;
    ctx.fillStyle = '#eab308'; // Amarillo seguridad
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#0f172a'; // Negro/grafito
    ctx.beginPath();
    const stripeWidth = 32;
    for (let x = -256; x < 512; x += stripeWidth * 2) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeWidth, 0);
      ctx.lineTo(x + stripeWidth + 256, 256);
      ctx.lineTo(x + 256, 256);
      ctx.closePath();
    }
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  if (kind === 'ghs_corrosive' || kind === 'ghs_toxic' || kind === 'ghs_flammable') {
    canvas.width = 256;
    canvas.height = 256;
    ctx.clearRect(0, 0, 256, 256);

    // Rombo blanco con borde rojo oficial SGA/GHS
    ctx.save();
    ctx.translate(128, 128);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-80, -80, 160, 160);
    ctx.strokeStyle = '#dc2626'; // Rojo SGA
    ctx.lineWidth = 14;
    ctx.strokeRect(-80, -80, 160, 160);
    ctx.restore();

    // Pictograma interior
    ctx.fillStyle = '#0f172a';
    if (kind === 'ghs_corrosive') {
      // Dibujo esquemático de tubos de ensayo vertiendo líquido corrosivo sobre barra y mano
      ctx.beginPath();
      // Tubo 1
      ctx.roundRect(70, 75, 40, 14, 4);
      // Tubo 2
      ctx.roundRect(146, 75, 40, 14, 4);
      // Barra de metal corroyéndose
      ctx.rect(65, 150, 48, 18);
      // Mano corroyéndose
      ctx.rect(142, 145, 50, 24);
      ctx.fill();
      // Gotas
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(88, 115, 5, 0, Math.PI * 2);
      ctx.arc(166, 115, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'ghs_toxic') {
      // Calavera con tibias cruzadas
      ctx.beginPath();
      ctx.arc(128, 115, 26, 0, Math.PI * 2);
      ctx.rect(116, 138, 24, 18);
      ctx.fill();
      // Ojos huecos
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(118, 115, 6, 0, Math.PI * 2);
      ctx.arc(138, 115, 6, 0, Math.PI * 2);
      ctx.fill();
      // Huesos cruzados inferiores
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.rect(98, 160, 60, 10);
      ctx.fill();
    } else if (kind === 'ghs_flammable') {
      // Llama de fuego
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(128, 65);
      ctx.bezierCurveTo(155, 95, 175, 130, 160, 165);
      ctx.bezierCurveTo(145, 195, 111, 195, 96, 165);
      ctx.bezierCurveTo(80, 135, 105, 105, 128, 65);
      ctx.fill();
      // Llama interior amarilla
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(128, 105);
      ctx.bezierCurveTo(142, 125, 150, 150, 140, 170);
      ctx.bezierCurveTo(130, 185, 120, 185, 115, 170);
      ctx.bezierCurveTo(110, 150, 120, 125, 128, 105);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  if (kind === 'ghs_biohazard') {
    canvas.width = 256;
    canvas.height = 256;
    ctx.fillStyle = '#f59e0b'; // Amarillo/Ámbar de advertencia
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Símbolo universal de Riesgo Biológico (Biohazard)
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(102, 104, 34, 0, Math.PI * 2);
    ctx.arc(154, 104, 34, 0, Math.PI * 2);
    ctx.arc(128, 158, 34, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(128, 124, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(128, 124, 10, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  if (kind === 'iso_shower_eyewash') {
    canvas.width = 384;
    canvas.height = 256;
    ctx.fillStyle = '#15803d'; // Verde ISO 7010
    ctx.fillRect(0, 0, 384, 256);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 368, 240);

    // Pictograma de ducha de emergencia y lavaojos
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DUCHA & LAVAOJOS', 192, 45);
    ctx.font = '14px "JetBrains Mono", monospace';
    ctx.fillText('EMERGENCY SHOWER / EYEWASH', 192, 70);

    // Icono campana de ducha y cabeza con agua
    ctx.beginPath();
    ctx.arc(110, 115, 24, 0, Math.PI, true); // Campana
    ctx.fill();
    ctx.fillRect(106, 85, 8, 18); // Tubo
    // Gotas
    ctx.fillStyle = '#a7f3d0';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(92 + i * 10, 124, 4, 16);
      ctx.fillRect(96 + i * 10, 148, 4, 14);
    }

    // Icono ojos lavándose
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(260, 130, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(260, 130, 10, 0, Math.PI * 2);
    ctx.fill();

    // Chorros lavaojos
    ctx.fillStyle = '#a7f3d0';
    ctx.beginPath();
    ctx.rect(235, 165, 8, 16);
    ctx.rect(277, 165, 8, 16);
    ctx.arc(245, 155, 6, 0, Math.PI * 2);
    ctx.arc(275, 155, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('Norma UNE-EN 15154 · Descontaminación 15 min', 192, 225);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  if (kind === 'iso_extinguisher') {
    canvas.width = 256;
    canvas.height = 320;
    ctx.fillStyle = '#b91c1c'; // Rojo fuego ISO 7010
    ctx.fillRect(0, 0, 256, 320);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 240, 304);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXTINTOR', 128, 48);

    // Dibujo del extintor
    ctx.fillRect(100, 95, 56, 120); // Cuerpo
    ctx.beginPath();
    ctx.arc(128, 95, 28, Math.PI, 0); // Domo
    ctx.fill();
    ctx.fillRect(122, 60, 12, 14); // Cuello válvula
    ctx.fillRect(110, 52, 36, 8); // Manija
    ctx.beginPath();
    ctx.arc(148, 56, 7, 0, Math.PI * 2); // Pasador
    ctx.fill();

    // Manguera lateral
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(134, 66);
    ctx.lineTo(164, 85);
    ctx.lineTo(164, 180);
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.fillText('CO₂ 5 kg / CLASE B-C', 128, 250);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '12px sans-serif';
    ctx.fillText('Fuegos Eléctricos & Solventes', 128, 275);
    ctx.fillText('Inspección Anual Vigente', 128, 295);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  if (kind === 'iso_emergency_exit') {
    canvas.width = 384;
    canvas.height = 160;
    ctx.fillStyle = '#15803d'; // Verde salida ISO
    ctx.fillRect(0, 0, 384, 160);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 372, 148);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SALIDA DE EMERGENCIA', 215, 65);
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.fillText('EMERGENCY EXIT', 215, 98);
    ctx.font = '12px sans-serif';
    ctx.fillText('Mantener libre de obstáculos', 215, 128);

    // Silueta de hombre corriendo hacia la puerta
    ctx.beginPath();
    ctx.arc(65, 52, 12, 0, Math.PI * 2); // Cabeza
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(65, 66);
    ctx.lineTo(60, 100); // Torso
    ctx.lineTo(44, 128); // Pierna izq
    ctx.moveTo(60, 100);
    ctx.lineTo(82, 122); // Pierna der
    ctx.moveTo(63, 75);
    ctx.lineTo(80, 88); // Brazo der
    ctx.moveTo(63, 75);
    ctx.lineTo(46, 85); // Brazo izq
    ctx.stroke();

    // Marco de puerta
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 30, 24, 100);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  //kind === 'ppe_station_sign'
  canvas.width = 384;
  canvas.height = 256;
  ctx.fillStyle = '#0284c7'; // Azul instrucción ISO
  ctx.fillRect(0, 0, 384, 256);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 368, 240);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ESTACIÓN DE BIOSEGURIDAD', 192, 45);
  ctx.font = '14px "JetBrains Mono", monospace';
  ctx.fillText('EQUIPO DE PROTECCIÓN PERSONAL (EPP)', 192, 70);

  // Iconos círculos de EPP obligatorio
  const items = [
    { label: '🥼 Bata', x: 80 },
    { label: '🥽 Gafas', x: 192 },
    { label: '🧤 Guantes', x: 304 }
  ];
  items.forEach((item) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(item.x, 130, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0369a1';
    ctx.font = '28px sans-serif';
    ctx.fillText(item.label.split(' ')[0], item.x, 138);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(item.label.split(' ')[1], item.x, 192);
  });

  ctx.fillStyle = '#e0f2fe';
  ctx.font = '12px sans-serif';
  ctx.fillText('Uso obligatorio antes de manipular reactivos y muestras', 192, 226);

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

/**
 * Construye la Ducha de Seguridad y Lavaojos Combinada (Safety Shower & Eyewash)
 */
export function buildEmergencyShowerAndEyewash(
  interactiveList: { mesh: THREE.Object3D; hit: SafetyInteractiveHit }[]
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'EmergencyShowerStation';

  // Materiales
  const pipeMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15, // Tubería amarilla oficial de seguridad
    roughness: 0.35,
    metalness: 0.65
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.15,
    metalness: 0.95
  });
  const greenMat = new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    roughness: 0.4
  });

  // Base y columna vertical principal (2.4m)
  const baseFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.04, 20), chromeMat);
  baseFlange.position.y = 0.02;
  group.add(baseFlange);

  const mainColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 2.38, 16), pipeMat);
  mainColumn.position.y = 1.21;
  group.add(mainColumn);

  // Brazo superior de la ducha (curva hacia adelante)
  const topElbow = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.45, 16), pipeMat);
  topElbow.rotation.x = Math.PI / 2;
  topElbow.position.set(0, 2.38, 0.22);
  group.add(topElbow);

  // Campana / Rociador de la Ducha
  const showerHead = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.12, 24, 1, true), greenMat);
  showerHead.rotation.x = Math.PI;
  showerHead.position.set(0, 2.32, 0.44);
  group.add(showerHead);

  // Placa difusora interna perforada
  const diffuser = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), chromeMat);
  diffuser.rotation.x = Math.PI / 2;
  diffuser.position.set(0, 2.26, 0.44);
  group.add(diffuser);

  // Tirador triangular de emergencia con varilla
  const pullRod = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.65, 8), chromeMat);
  pullRod.position.set(0.14, 1.95, 0.42);
  group.add(pullRod);

  const trianglePull = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.008, 8, 3), pipeMat);
  trianglePull.rotation.z = Math.PI;
  trianglePull.position.set(0.14, 1.62, 0.42);
  const showerHit: SafetyInteractiveHit = {
    type: 'emergency_shower',
    subItem: 'shower_lever',
    label: 'Tirador de Ducha de Emergencia (15 minutos de flujo continuo)'
  };
  trianglePull.userData = { isInteractive: true, safetyHit: showerHit };
  group.add(trianglePull);
  interactiveList.push({ mesh: trianglePull, hit: showerHit });

  // Estación Lavaojos (a 1.02m de altura)
  const eyewashBranch = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.28, 16), chromeMat);
  eyewashBranch.rotation.x = Math.PI / 2;
  eyewashBranch.position.set(0, 1.02, 0.14);
  group.add(eyewashBranch);

  // Bacha circular del lavaojos
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.09, 24, 1, true), chromeMat);
  bowl.position.set(0, 1.02, 0.28);
  group.add(bowl);
  const bowlBottom = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), chromeMat);
  bowlBottom.rotation.x = -Math.PI / 2;
  bowlBottom.position.set(0, 0.976, 0.28);
  group.add(bowlBottom);

  // Dos boquillas pulverizadoras aireadas (Eye spray nozzles)
  [-0.055, 0.055].forEach((offset) => {
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.045, 12), greenMat);
    nozzle.position.set(offset, 1.04, 0.28);
    group.add(nozzle);
  });

  // Palanca manual de empuje ("PUSH")
  const pushLever = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.012), greenMat);
  pushLever.position.set(0.19, 1.05, 0.28);
  pushLever.rotation.y = -0.3;
  const eyewashHit: SafetyInteractiveHit = {
    type: 'eyewash',
    subItem: 'eyewash_push',
    label: 'Palanca PUSH Lavaojos (Lavado ocular bilateral con agua templada)'
  };
  pushLever.userData = { isInteractive: true, safetyHit: eyewashHit };
  group.add(pushLever);
  interactiveList.push({ mesh: pushLever, hit: eyewashHit });

  // Cartel mural superior ISO 7010
  const signMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.68, 0.45),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('iso_shower_eyewash') })
  );
  signMesh.position.set(0, 2.7, 0.04);
  group.add(signMesh);

  // Rejilla de desagüe en el suelo con demarcación de seguridad
  const floorDrain = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 0.85),
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.5
    })
  );
  floorDrain.rotation.x = -Math.PI / 2;
  floorDrain.position.set(0, 0.002, 0.28);
  group.add(floorDrain);

  return group;
}

/**
 * Construye el Extintor de Incendios CO2 / Polvo ABC montado en pared
 */
export function buildFireExtinguisherStation(
  interactiveList: { mesh: THREE.Object3D; hit: SafetyInteractiveHit }[]
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'FireExtinguisherStation';

  const redMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.25,
    metalness: 0.4
  });
  const blackMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.8
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.9,
    roughness: 0.2
  });

  // Cilindro del extintor
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.42, 20), redMat);
  cylinder.position.y = 0.22;
  group.add(cylinder);

  const topDome = new THREE.Mesh(new THREE.SphereGeometry(0.082, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), redMat);
  topDome.position.y = 0.43;
  group.add(topDome);

  const bottomCap = new THREE.Mesh(new THREE.CylinderGeometry(0.083, 0.08, 0.04, 20), blackMat);
  bottomCap.position.y = 0.02;
  group.add(bottomCap);

  // Válvula de latón con manómetro
  const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 12), brassMat);
  valve.position.y = 0.525;
  group.add(valve);

  const pressureGauge = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.01, 12), brassMat);
  pressureGauge.rotation.x = Math.PI / 2;
  pressureGauge.position.set(0, 0.53, 0.035);
  group.add(pressureGauge);

  // Manija de accionamiento y pasador de seguridad amarillo
  const handleGroup = new THREE.Group();
  const carryHandle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.08), blackMat);
  carryHandle.position.set(0, 0.55, -0.02);
  handleGroup.add(carryHandle);

  const squeezeHandle = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.01, 0.075), blackMat);
  squeezeHandle.position.set(0, 0.57, -0.02);
  squeezeHandle.rotation.x = 0.15;
  handleGroup.add(squeezeHandle);

  const safetyPin = new THREE.Mesh(
    new THREE.TorusGeometry(0.016, 0.003, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 })
  );
  safetyPin.position.set(0.025, 0.54, 0.01);
  handleGroup.add(safetyPin);
  group.add(handleGroup);

  // Manguera difusora con trompeta cónica CO2
  const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 10), blackMat);
  hose.position.set(0.09, 0.35, 0.02);
  group.add(hose);

  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.12, 16, 1, true), blackMat);
  horn.rotation.z = Math.PI;
  horn.position.set(0.09, 0.15, 0.02);
  group.add(horn);

  // Soporte de anclaje a pared
  const wallMount = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.03), blackMat);
  wallMount.position.set(0, 0.3, -0.085);
  group.add(wallMount);

  // Cartel fotoluminiscente superior ISO 7010
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.48),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('iso_extinguisher') })
  );
  sign.position.set(0, 0.88, -0.08);
  group.add(sign);

  // Marcar como interactivo
  const extHit: SafetyInteractiveHit = {
    type: 'fire_extinguisher',
    subItem: 'extinguisher_pin',
    label: 'Extintor CO₂ (Inspección técnica al día · Regla PASS: Tirar, Apuntar, Apretar, Mover)'
  };
  cylinder.userData = { isInteractive: true, safetyHit: extHit };
  interactiveList.push({ mesh: cylinder, hit: extHit });

  return group;
}

/**
 * Construye la Estación / Vestidor de Bioseguridad y EPP (Locker / Armario)
 */
export function buildSafetyPPEStation(
  interactiveList: { mesh: THREE.Object3D; hit: SafetyInteractiveHit }[]
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'SafetyPPEStation';

  const lockerMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Azul laboratorio
    roughness: 0.3,
    metalness: 0.4
  });
  const shelfMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.4
  });
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.8
  });
  const nitrileBlueMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    roughness: 0.3,
    metalness: 0.2
  });
  const clearGogglesMat = new THREE.MeshPhysicalMaterial({
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.75,
    roughness: 0.1,
    transmission: 0.9,
    ior: 1.52
  });

  // Estructura del armario/estación de bioseguridad (Ancho 1.1m, Alto 2.1m, Fondo 0.45m)
  const frameBack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.04), lockerMat);
  frameBack.position.set(0, 1.05, -0.2);
  group.add(frameBack);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.1, 0.42), lockerMat);
  leftWall.position.set(-0.53, 1.05, 0);
  group.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.1, 0.42), lockerMat);
  rightWall.position.set(0.53, 1.05, 0);
  group.add(rightWall);

  const topRoof = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 0.42), lockerMat);
  topRoof.position.set(0, 2.1, 0);
  group.add(topRoof);

  // Estantes horizontales
  [0.85, 1.45].forEach((y) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.025, 0.38), shelfMat);
    shelf.position.set(0, y, 0);
    group.add(shelf);
  });

  // Percha con Bata de Laboratorio colgada
  const hangerRod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.46, 12), shelfMat);
  hangerRod.rotation.z = Math.PI / 2;
  hangerRod.position.set(-0.25, 1.95, 0);
  group.add(hangerRod);

  // Modelo esquemático de Bata Blanca colgada
  const labCoatGroup = new THREE.Group();
  const coatBody = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.85, 16), whiteMat);
  coatBody.position.set(-0.25, 1.48, 0);
  labCoatGroup.add(coatBody);

  // Mangas
  [-0.14, 0.14].forEach((dx) => {
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.55, 12), whiteMat);
    sleeve.position.set(-0.25 + dx, 1.55, 0);
    sleeve.rotation.z = dx > 0 ? -0.25 : 0.25;
    labCoatGroup.add(sleeve);
  });
  const coatHit: SafetyInteractiveHit = {
    type: 'safety_equipment',
    subItem: 'coat',
    label: 'Bata Blanca de Laboratorio 100% Algodón (Protección dérmica contra salpicaduras)'
  };
  coatBody.userData = { isInteractive: true, safetyHit: coatHit };
  group.add(labCoatGroup);
  interactiveList.push({ mesh: coatBody, hit: coatHit });

  // Soporte con Gafas de Seguridad
  const gogglesGroup = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.045, 0.02), lockerMat);
  frame.position.set(0.24, 1.52, 0.05);
  gogglesGroup.add(frame);

  const lenses = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.035), clearGogglesMat);
  lenses.position.set(0.24, 1.52, 0.06);
  const gogglesHit: SafetyInteractiveHit = {
    type: 'safety_equipment',
    subItem: 'goggles',
    label: 'Gafas de Seguridad Policarbonato EN 166 (Protección ocular contra impactos y gotas químicas)'
  };
  lenses.userData = { isInteractive: true, safetyHit: gogglesHit };
  gogglesGroup.add(lenses);
  interactiveList.push({ mesh: lenses, hit: gogglesHit });

  // Cajas de Guantes en el estante medio
  // 1. Caja de Guantes de Nitrilo Azul
  const nitrileBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.14), nitrileBlueMat);
  nitrileBox.position.set(0.14, 0.91, 0.06);
  const nitrileHit: SafetyInteractiveHit = {
    type: 'safety_equipment',
    subItem: 'nitrile_gloves',
    label: 'Guantes de Nitrilo Azul (Resistentes a ácidos HCl, bases NaOH y solventes)'
  };
  nitrileBox.userData = { isInteractive: true, safetyHit: nitrileHit };
  group.add(nitrileBox);
  interactiveList.push({ mesh: nitrileBox, hit: nitrileHit });

  // 2. Caja de Guantes de Látex Blanco
  const latexBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.14), whiteMat);
  latexBox.position.set(-0.14, 0.91, 0.06);
  const latexHit: SafetyInteractiveHit = {
    type: 'safety_equipment',
    subItem: 'latex_gloves',
    label: 'Guantes de Látex Quirúrgico Blanco (Alta sensibilidad táctil para microscopía y biología)'
  };
  latexBox.userData = { isInteractive: true, safetyHit: latexHit };
  group.add(latexBox);
  interactiveList.push({ mesh: latexBox, hit: latexHit });

  // Dispensador mural de Alcohol Antiséptico / Jabón desinfectante
  const dispenser = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.22, 0.09),
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 })
  );
  dispenser.position.set(0.35, 1.15, -0.15);
  group.add(dispenser);
  const pumpLevel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 0.06), shelfMat);
  pumpLevel.position.set(0.35, 1.04, -0.09);
  group.add(pumpLevel);

  // Cartel superior de la estación
  const stationSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.4),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('ppe_station_sign') })
  );
  stationSign.position.set(0, 2.34, 0.02);
  group.add(stationSign);

  return group;
}

/**
 * Genera la señalética mural y franjas perimetrales de suelo de seguridad
 */
export function buildSafetyEnvironmentSignage(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'SafetyEnvironmentSignage';

  // 1. Pictogramas SGA en la pared detrás de Química
  const ghsCorrosive = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.38),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('ghs_corrosive'), transparent: true })
  );
  ghsCorrosive.position.set(-0.65, 2.45, -0.86);
  group.add(ghsCorrosive);

  const ghsToxic = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.38),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('ghs_toxic'), transparent: true })
  );
  ghsToxic.position.set(0.65, 2.45, -0.86);
  group.add(ghsToxic);

  // 2. Pictograma de Riesgo Biológico en Biología
  const biohazardSign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.42),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('ghs_biohazard'), transparent: true })
  );
  biohazardSign.position.set(-3.5, 2.5, -0.86);
  group.add(biohazardSign);

  // 3. Pictograma Inflamable / STEAM en estación STEAM
  const flammableSign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.38),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('ghs_flammable'), transparent: true })
  );
  flammableSign.position.set(3.5, 2.5, -0.86);
  group.add(flammableSign);

  // 4. Salida de Emergencia superior (ISO 7010)
  const exitSign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.38),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('iso_emergency_exit') })
  );
  exitSign.position.set(-5.6, 2.85, 1.8);
  exitSign.rotation.y = Math.PI / 2;
  group.add(exitSign);

  // 5. Franjas de suelo perimetrales amarillas y negras
  const stripeTex = createSafetyTexture('safety_stripes');

  // Franja perímetro Mesa Central Química (3.7m x 2.5m)
  const chemBorder = new THREE.Mesh(
    new THREE.RingGeometry(1.65, 1.78, 4),
    new THREE.MeshBasicMaterial({ map: stripeTex, side: THREE.DoubleSide })
  );
  chemBorder.rotation.x = -Math.PI / 2;
  chemBorder.rotation.z = Math.PI / 4;
  chemBorder.position.set(0, 0.003, 0);
  group.add(chemBorder);

  // Franja perímetro Mesa Biología
  const bioBorder = new THREE.Mesh(
    new THREE.RingGeometry(1.4, 1.52, 4),
    new THREE.MeshBasicMaterial({ map: stripeTex, side: THREE.DoubleSide })
  );
  bioBorder.rotation.x = -Math.PI / 2;
  bioBorder.rotation.z = Math.PI / 4;
  bioBorder.position.set(-3.5, 0.003, 0.15);
  group.add(bioBorder);

  // Franja perímetro Mesa STEAM
  const steamBorder = new THREE.Mesh(
    new THREE.RingGeometry(1.4, 1.52, 4),
    new THREE.MeshBasicMaterial({ map: stripeTex, side: THREE.DoubleSide })
  );
  steamBorder.rotation.x = -Math.PI / 2;
  steamBorder.rotation.z = Math.PI / 4;
  steamBorder.position.set(3.5, 0.003, 0.15);
  group.add(steamBorder);

  return group;
}

/**
 * Agrupa y posiciona toda la infraestructura reglamentaria de seguridad en el laboratorio 3D
 */
export function buildCompleteLabSafetyInfrastructure(
  interactiveList: { mesh: THREE.Object3D; hit: SafetyInteractiveHit }[]
): THREE.Group {
  const masterGroup = new THREE.Group();
  masterGroup.name = 'CompleteLabSafetyInfrastructure';

  // 1. Ducha de emergencia y lavaojos combinado en el ala de seguridad
  const shower = buildEmergencyShowerAndEyewash(interactiveList);
  shower.position.set(-6.0, 0, 0.35);
  shower.rotation.y = Math.PI / 5;
  masterGroup.add(shower);

  // 2. Estación / Vestidor de Bioseguridad y EPP (bata, gafas, nitrilo y látex)
  const ppeStation = buildSafetyPPEStation(interactiveList);
  ppeStation.position.set(-5.6, 0, 2.05);
  ppeStation.rotation.y = Math.PI / 2;
  masterGroup.add(ppeStation);

  // 3. Extintor de incendios CO2 montado en la pared entre Química y Biología
  const extinguisher = buildFireExtinguisherStation(interactiveList);
  extinguisher.position.set(-1.85, 0.95, -0.82);
  masterGroup.add(extinguisher);

  // 4. Señalética mural, pictogramas SGA/GHS y franjas perimetrales de suelo
  const signage = buildSafetyEnvironmentSignage();
  masterGroup.add(signage);

  return masterGroup;
}
