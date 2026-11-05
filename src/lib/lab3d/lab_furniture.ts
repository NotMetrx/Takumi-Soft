import * as THREE from 'three';
import { createSafetyTexture } from './safety_decorations';

export interface LabBenchConfig {
  stationId: 'quimica' | 'biologia' | 'steam';
  width: number;
  depth: number;
  position: THREE.Vector3;
  label: string;
  labelAccentColor: string;
  hasReagentOverheadRack?: boolean;
  hasPlumbingAndSink?: boolean;
  hasGasTurret?: boolean;
  hasElectricalStrip?: boolean;
  hasTestTubeRack?: boolean;
  hasWashBottle?: boolean;
}

/**
 * Textura procedural de suelo técnico de laboratorio (Losas continuas de vinilo/linóleo con juntas termosoldadas)
 */
export function createLabFloorTexture(): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    const fallbackTex = new THREE.CanvasTexture({} as HTMLCanvasElement);
    fallbackTex.repeat.set(12, 8);
    return fallbackTex;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base gris perla técnico ultra limpio
  ctx.fillStyle = '#18242e';
  ctx.fillRect(0, 0, 512, 512);

  // Cuadrícula de baldosas técnicas de 60x60 cm
  const tileSize = 128;
  for (let x = 0; x < 512; x += tileSize) {
    for (let y = 0; y < 512; y += tileSize) {
      // Sutil variación de tono entre losas
      const tone = Math.sin(x * 12.3 + y * 45.6) * 3;
      ctx.fillStyle = `rgb(${24 + tone}, ${36 + tone}, ${46 + tone})`;
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

      // Moteado sutil antibacteriano
      ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
      for (let i = 0; i < 12; i++) {
        const px = x + 4 + Math.random() * (tileSize - 8);
        const py = y + 4 + Math.random() * (tileSize - 8);
        ctx.fillRect(px, py, 2, 2);
      }
    }
  }

  // Línea de soldadura sanitaria termosoldada
  ctx.strokeStyle = '#0f171d';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += tileSize) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 8);
  return texture;
}

/**
 * Textura procedural de falso techo acústico registrable modular (Placas de 60x60 cm con perfilería T)
 */
export function createLabCeilingTexture(): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    const fallbackTex = new THREE.CanvasTexture({} as HTMLCanvasElement);
    fallbackTex.repeat.set(16, 12);
    return fallbackTex;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base blanco tiza / acústico claro de laboratorio
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 512);

  // Cuadrícula modular de falso techo registrable (perfilería T de 60x60 cm)
  const tileSize = 128;
  for (let x = 0; x < 512; x += tileSize) {
    for (let y = 0; y < 512; y += tileSize) {
      // Placa acústica con bisel perimetral tegular
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(x + 3, y + 3, tileSize - 6, tileSize - 6);

      // Microperforaciones acústicas de absorción fónica
      ctx.fillStyle = 'rgba(100, 116, 139, 0.08)';
      for (let px = x + 16; px < x + tileSize - 16; px += 16) {
        for (let py = y + 16; py < y + tileSize - 16; py += 16) {
          ctx.beginPath();
          ctx.arc(px, py, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // Perfilería T metálica lacada en blanco
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 512; i += tileSize) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 12);
  return texture;
}

/**
 * Construye el Techo Técnico del Laboratorio con Luminarias Cleanroom LED Troffers,
 * Difusores de Aire Acondicionado HVAC, Detectores de Humo y Rociadores Contra Incendios.
 */
export function buildLaboratoryCeilingAndLighting(): THREE.Group {
  const ceilingGroup = new THREE.Group();
  ceilingGroup.name = 'LaboratoryCeilingAndLighting';
  const ceilingY = 3.65;

  // 1. Plano del Falso Techo Registrable
  const ceilingTex = createLabCeilingTexture();
  const ceilingMat = new THREE.MeshStandardMaterial({
    map: ceilingTex,
    roughness: 0.88,
    metalness: 0.05
  });
  const ceilingMesh = new THREE.Mesh(new THREE.PlaneGeometry(42, 28), ceilingMat);
  ceilingMesh.rotation.x = Math.PI / 2;
  ceilingMesh.position.set(0, ceilingY, 1.5);
  ceilingGroup.add(ceilingMesh);

  // 2. Luminarias Cleanroom LED Troffers (120x60 cm empotradas en falso techo)
  const trofferMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    toneMapped: false
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.25,
    metalness: 0.8
  });

  const lightPositions: [number, number][] = [
    // 4 paneles sobre Química Central
    [-1.2, -0.6],
    [1.2, -0.6],
    [-1.2, 0.7],
    [1.2, 0.7],
    // 2 paneles sobre Biología
    [-4.3, -0.5],
    [-4.3, 0.7],
    // 2 paneles sobre STEAM
    [4.3, -0.5],
    [4.3, 0.7],
    // 2 paneles sobre Pasillo y Seguridad
    [-6.3, 0.3],
    [-6.3, 2.0]
  ];

  lightPositions.forEach(([lx, lz]) => {
    // Marco exterior de aluminio
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.03, 0.68), frameMat);
    frame.position.set(lx, ceilingY - 0.015, lz);
    ceilingGroup.add(frame);

    // Difusor opal blanco radiante
    const diffuser = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), trofferMat);
    diffuser.rotation.x = Math.PI / 2;
    diffuser.position.set(lx, ceilingY - 0.028, lz);
    ceilingGroup.add(diffuser);
  });

  // 3. Luces cenitales de laboratorio (proyectan luz pura 5000K sobre las mesas)
  const chemOverheadLight = new THREE.DirectionalLight(0xf8fbff, 1.8);
  chemOverheadLight.position.set(0, ceilingY - 0.2, 0.5);
  chemOverheadLight.target.position.set(0, 0, 0.2);
  ceilingGroup.add(chemOverheadLight);
  ceilingGroup.add(chemOverheadLight.target);

  const bioOverheadLight = new THREE.SpotLight(0xf0fdf4, 3.2, 7, Math.PI / 3, 0.6);
  bioOverheadLight.position.set(-4.3, ceilingY - 0.2, 0.5);
  bioOverheadLight.target.position.set(-4.3, 0, 0.2);
  ceilingGroup.add(bioOverheadLight);
  ceilingGroup.add(bioOverheadLight.target);

  const steamOverheadLight = new THREE.SpotLight(0xfefce8, 3.2, 7, Math.PI / 3, 0.6);
  steamOverheadLight.position.set(4.3, ceilingY - 0.2, 0.5);
  steamOverheadLight.target.position.set(4.3, 0, 0.2);
  ceilingGroup.add(steamOverheadLight);
  ceilingGroup.add(steamOverheadLight.target);

  // 4. Difusores de aire acondicionado HVAC (impulsión de aire filtrado)
  const hvacMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35 });
  const hvacPositions: [number, number][] = [
    [0, -1.5],
    [-4.3, -1.5],
    [4.3, -1.5],
    [0, 2.2]
  ];
  hvacPositions.forEach(([hx, hz]) => {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.6), hvacMat);
    vent.position.set(hx, ceilingY - 0.01, hz);
    ceilingGroup.add(vent);

    // Ranuras concéntricas de impulsión
    const inner = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.022, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 })
    );
    inner.position.set(hx, ceilingY - 0.01, hz);
    ceilingGroup.add(inner);
  });

  // 5. Rociadores automáticos contra incendios (Fire Sprinklers)
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15, metalness: 0.9 });
  const redBulbMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.2, metalness: 0.1 });
  const sprinklerPositions: [number, number][] = [
    [-2.2, 0],
    [2.2, 0],
    [-4.3, 1.8],
    [4.3, 1.8],
    [0, 1.8]
  ];
  sprinklerPositions.forEach(([sx, sz]) => {
    const escutcheon = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.008, 14), chromeMat);
    escutcheon.position.set(sx, ceilingY - 0.004, sz);
    ceilingGroup.add(escutcheon);

    const deflector = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.025, 12), chromeMat);
    deflector.position.set(sx, ceilingY - 0.02, sz);
    ceilingGroup.add(deflector);

    const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.014, 8), redBulbMat);
    bulb.position.set(sx, ceilingY - 0.018, sz);
    ceilingGroup.add(bulb);
  });

  // 6. Detectores ópticos de humo
  const smokeDetectorPositions: [number, number][] = [
    [-1.2, 1.5],
    [1.2, 1.5]
  ];
  smokeDetectorPositions.forEach(([dx, dz]) => {
    const detector = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.085, 0.035, 18),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
    );
    detector.position.set(dx, ceilingY - 0.018, dz);
    ceilingGroup.add(detector);

    const led = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
    led.position.set(dx + 0.05, ceilingY - 0.035, dz);
    ceilingGroup.add(led);
  });

  return ceilingGroup;
}

export interface DoubleDoorsRig {
  group: THREE.Group;
  leftLeaf: THREE.Mesh;
  rightLeaf: THREE.Mesh;
  sensorLed: THREE.Mesh;
  currentOpen: number;
  update: (playerPos: THREE.Vector3, dt: number) => void;
}

/**
 * Paredes perimetrales del laboratorio con revestimiento sanitario blanco, zócalo cóncavo
 * y Esclusa SAS de Descontaminación & Vestidor de Bioseguridad en el acceso principal sur,
 * provista de puertas automáticas dobles correderas que se juntan en el centro.
 */
export function buildLaboratoryPerimeterWalls(): THREE.Group {
  const wallsGroup = new THREE.Group();
  wallsGroup.name = 'LaboratoryPerimeterWalls';

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xedf3f6, // Revestimiento fenólico higiénico lavable blanco-grisáceo
    roughness: 0.65,
    metalness: 0.05
  });

  const baseboardMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // Zócalo sanitario cóncavo gris pizarra (media caña)
    roughness: 0.75,
    metalness: 0.1
  });

  const stainlessMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Perfilería estéril de acero inoxidable cepillado AISI 316L
    metalness: 0.85,
    roughness: 0.25
  });

  const airlockFloorMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Suelo continuo estéril de resina epoxi de alta resistencia química
    roughness: 0.35,
    metalness: 0.15
  });

  const wallHeight = 5.3;
  const wallY = 1.05; // desde -1.55 hasta 3.75

  // =========================================================================
  // 1. PARED POSTERIOR DEL LABORATORIO (Norte, z = -2.4)
  // =========================================================================
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(42, wallHeight, 0.15), wallMat);
  backWall.position.set(0, wallY, -2.4);
  backWall.receiveShadow = true;
  wallsGroup.add(backWall);

  const backBaseboard = new THREE.Mesh(new THREE.BoxGeometry(42, 0.16, 0.18), baseboardMat);
  backBaseboard.position.set(0, -1.47, -2.4);
  wallsGroup.add(backBaseboard);

  // =========================================================================
  // 2. PARED DERECHA DEL LABORATORIO (Este, x = 8.2)
  // =========================================================================
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, wallHeight, 14.4), wallMat);
  rightWall.position.set(8.2, wallY, 1.2);
  rightWall.receiveShadow = true;
  wallsGroup.add(rightWall);

  const rightBaseboard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 14.4), baseboardMat);
  rightBaseboard.position.set(8.2, -1.47, 1.2);
  wallsGroup.add(rightBaseboard);

  // =========================================================================
  // 3. PARED IZQUIERDA DEL LABORATORIO (Oeste, x = -8.2) - COMPLETAMENTE CONTINUA Y DIÁFANA
  // Deja el pasillo lateral de la estación de Biología libre y limpio
  // =========================================================================
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, wallHeight, 14.4), wallMat);
  leftWall.position.set(-8.2, wallY, 1.2);
  leftWall.receiveShadow = true;
  wallsGroup.add(leftWall);

  const leftBaseboard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 14.4), baseboardMat);
  leftBaseboard.position.set(-8.2, -1.47, 1.2);
  wallsGroup.add(leftBaseboard);

  // =========================================================================
  // 4. PARED SUR DEL LABORATORIO (z = 4.8) CON VANO CENTRAL PARA ACCESO Y PUERTAS DOBLES
  // =========================================================================
  // Tramo sólido Oeste (desde x = -8.2 hasta x = -1.2)
  const southWallWest = new THREE.Mesh(new THREE.BoxGeometry(7.0, wallHeight, 0.15), wallMat);
  southWallWest.position.set(-4.7, wallY, 4.8);
  southWallWest.receiveShadow = true;
  wallsGroup.add(southWallWest);

  const southBaseboardWest = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.16, 0.18), baseboardMat);
  southBaseboardWest.position.set(-4.7, -1.47, 4.8);
  wallsGroup.add(southBaseboardWest);

  // Tramo sólido Este (desde x = 1.2 hasta x = 8.2)
  const southWallEast = new THREE.Mesh(new THREE.BoxGeometry(7.0, wallHeight, 0.15), wallMat);
  southWallEast.position.set(4.7, wallY, 4.8);
  southWallEast.receiveShadow = true;
  wallsGroup.add(southWallEast);

  const southBaseboardEast = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.16, 0.18), baseboardMat);
  southBaseboardEast.position.set(4.7, -1.47, 4.8);
  wallsGroup.add(southBaseboardEast);

  // Dintel superior sobre el vano de las puertas automáticas (x = -1.2 a 1.2, y = 1.20 a 3.75)
  const southDoorLintel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.55, 0.15), wallMat);
  southDoorLintel.position.set(0, 2.475, 4.8);
  wallsGroup.add(southDoorLintel);

  // Rótulo de Esclusa SAS sobre el dintel de acceso
  const airlockSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.42),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('airlock_door_sign') })
  );
  airlockSign.position.set(0, 1.75, 4.72);
  airlockSign.rotation.y = Math.PI; // Orientado hacia el interior del laboratorio
  wallsGroup.add(airlockSign);

  // Panel Magnehelic de Presión Diferencial en la jamba este de la puerta
  const magnehelicPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.35),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('magnehelic_gauge') })
  );
  magnehelicPanel.position.set(1.45, 0.15, 4.72);
  magnehelicPanel.rotation.y = Math.PI;
  wallsGroup.add(magnehelicPanel);

  // =========================================================================
  // 5. PUERTAS AUTOMÁTICAS DOBLES DE SALA LIMPIA ("SE JUNTAN SOLAS EN EL CENTRO")
  // =========================================================================
  const doorsGroup = new THREE.Group();
  doorsGroup.name = 'DoubleCleanroomDoorsRig';

  // Guía / Carcasa superior del operador motorizado telescópico de acero inoxidable
  const operatorHousing = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.18, 0.22), stainlessMat);
  operatorHousing.position.set(0, 1.28, 4.8);
  doorsGroup.add(operatorHousing);

  // Sensor Cleanroom Radar Doppler sobre la guía (cara laboratorio y cara esclusa)
  const radarSensorLab = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.08, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
  );
  radarSensorLab.position.set(0, 1.34, 4.68);
  doorsGroup.add(radarSensorLab);

  const radarSensorAirlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.08, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
  );
  radarSensorAirlock.position.set(0, 1.34, 4.92);
  doorsGroup.add(radarSensorAirlock);

  // LED de estado del sensor (Azul standby / Verde apertura)
  const sensorLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  sensorLed.position.set(0, 1.34, 4.64);
  doorsGroup.add(sensorLed);

  // Textura y materiales de las hojas de las puertas correderas
  const doorLeafTex = createSafetyTexture('cleanroom_door_leaf');
  const doorFaceMat = new THREE.MeshStandardMaterial({
    map: doorLeafTex,
    roughness: 0.4,
    metalness: 0.1
  });
  const leafMaterials = [
    stainlessMat, // derecha (+X)
    stainlessMat, // izquierda (-X)
    stainlessMat, // superior (+Y)
    stainlessMat, // inferior (-Y)
    doorFaceMat,  // frontal (+Z, cara esclusa)
    doorFaceMat   // posterior (-Z, cara laboratorio)
  ];

  const leafWidth = 1.18;
  const leafHeight = 2.70;
  const leafThickness = 0.05;
  const leafY = -1.55 + leafHeight / 2; // = -0.20

  // Hoja Izquierda
  const leftLeaf = new THREE.Mesh(
    new THREE.BoxGeometry(leafWidth, leafHeight, leafThickness),
    leafMaterials
  );
  leftLeaf.position.set(-0.585, leafY, 4.80);
  leftLeaf.castShadow = true;
  doorsGroup.add(leftLeaf);

  // Hoja Derecha
  const rightLeaf = new THREE.Mesh(
    new THREE.BoxGeometry(leafWidth, leafHeight, leafThickness),
    leafMaterials
  );
  rightLeaf.position.set(0.585, leafY, 4.80);
  rightLeaf.castShadow = true;
  doorsGroup.add(rightLeaf);

  // Guía de suelo empotrada de acero inoxidable (ranura guía continua al ras)
  const floorTrack = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.008, 0.08), stainlessMat);
  floorTrack.position.set(0, -1.546, 4.8);
  doorsGroup.add(floorTrack);

  // Rig cinemático con método update optimizado O(1) 0 GC
  const doubleDoorsRig: DoubleDoorsRig = {
    group: doorsGroup,
    leftLeaf,
    rightLeaf,
    sensorLed,
    currentOpen: 0,
    update(playerPos: THREE.Vector3, dt: number) {
      // Distancia horizontal al umbral central de la puerta (0, Y, 4.8)
      const dx = playerPos.x;
      const dz = playerPos.z - 4.8;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Si el usuario está a menos de 2.8m, las puertas se abren automáticamente;
      // al alejarse, vuelven al centro y se juntan solas de forma fluida.
      const targetOpen = dist < 2.8 ? 1.0 : 0.0;
      const speed = targetOpen > this.currentOpen ? 3.5 : 2.4;
      this.currentOpen = THREE.MathUtils.damp(this.currentOpen, targetOpen, speed, dt);

      // Desplazamiento simétrico de ambas hojas correderas
      this.leftLeaf.position.x = THREE.MathUtils.lerp(-0.585, -1.72, this.currentOpen);
      this.rightLeaf.position.x = THREE.MathUtils.lerp(0.585, 1.72, this.currentOpen);

      // Actualizar color del indicador luminoso del radar de aproximación
      const ledMat = this.sensorLed.material as THREE.MeshBasicMaterial;
      if (this.currentOpen > 0.05) {
        ledMat.color.setHex(0x22c55e); // Verde activo
      } else {
        ledMat.color.setHex(0x38bdf8); // Azul standby
      }
    }
  };

  wallsGroup.userData.doubleDoors = doubleDoorsRig;
  wallsGroup.add(doorsGroup);

  // =========================================================================
  // 6. CÁMARA SAS DE DESCONTAMINACIÓN & VESTIDOR DE BIOSEGURIDAD (z = 4.8 a 8.2)
  // Antecámara previa al laboratorio con suelo continuo exacto a Y = -1.548
  // =========================================================================
  const airlockGroup = new THREE.Group();
  airlockGroup.name = 'AirlockChamberStructure';

  // Suelo continuo de resina epoxi estéril (9.0m x 3.4m) al nivel real del suelo (-1.548)
  const airlockFloor = new THREE.Mesh(new THREE.PlaneGeometry(9.0, 3.4), airlockFloorMat);
  airlockFloor.rotation.x = -Math.PI / 2;
  airlockFloor.position.set(0, -1.548, 6.5);
  airlockFloor.receiveShadow = true;
  airlockGroup.add(airlockFloor);

  // Pared Oeste de la esclusa (x = -4.5, desde z = 4.8 hasta 8.2)
  const airlockWallWest = new THREE.Mesh(new THREE.BoxGeometry(0.15, wallHeight, 3.4), wallMat);
  airlockWallWest.position.set(-4.5, wallY, 6.5);
  airlockGroup.add(airlockWallWest);

  const airlockBaseboardWest = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 3.4), baseboardMat);
  airlockBaseboardWest.position.set(-4.5, -1.47, 6.5);
  airlockGroup.add(airlockBaseboardWest);

  // Pared Este de la esclusa (x = 4.5, desde z = 4.8 hasta 8.2)
  const airlockWallEast = new THREE.Mesh(new THREE.BoxGeometry(0.15, wallHeight, 3.4), wallMat);
  airlockWallEast.position.set(4.5, wallY, 6.5);
  airlockGroup.add(airlockWallEast);

  const airlockBaseboardEast = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 3.4), baseboardMat);
  airlockBaseboardEast.position.set(4.5, -1.47, 6.5);
  airlockGroup.add(airlockBaseboardEast);

  // Pared Sur exterior de la esclusa (z = 8.2, desde x = -4.5 hasta 4.5)
  // Tramo izquierdo
  const airlockWallSouthL = new THREE.Mesh(new THREE.BoxGeometry(3.7, wallHeight, 0.15), wallMat);
  airlockWallSouthL.position.set(-2.65, wallY, 8.2);
  airlockGroup.add(airlockWallSouthL);

  const airlockBaseboardSouthL = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.16, 0.18), baseboardMat);
  airlockBaseboardSouthL.position.set(-2.65, -1.47, 8.2);
  airlockGroup.add(airlockBaseboardSouthL);

  // Tramo derecho
  const airlockWallSouthR = new THREE.Mesh(new THREE.BoxGeometry(3.7, wallHeight, 0.15), wallMat);
  airlockWallSouthR.position.set(2.65, wallY, 8.2);
  airlockGroup.add(airlockWallSouthR);

  const airlockBaseboardSouthR = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.16, 0.18), baseboardMat);
  airlockBaseboardSouthR.position.set(2.65, -1.47, 8.2);
  airlockGroup.add(airlockBaseboardSouthR);

  // Dintel de acceso exterior (x = -0.8 a 0.8, y = 0.85 a 3.75)
  const exteriorDoorLintel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.9, 0.15), wallMat);
  exteriorDoorLintel.position.set(0, 2.30, 8.2);
  airlockGroup.add(exteriorDoorLintel);

  // Marco de puerta de acceso exterior del pasillo general (x = 0, z = 8.2)
  const exteriorDoorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.18), stainlessMat);
  exteriorDoorFrame.position.set(0, -0.35, 8.2);
  airlockGroup.add(exteriorDoorFrame);

  // Lector biométrico / RFID de control de accesos exterior
  const rfidScanner = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.18, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
  );
  rfidScanner.position.set(0.95, -0.15, 8.12);
  airlockGroup.add(rfidScanner);

  const rfidLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  rfidLed.position.set(0.95, -0.10, 8.1);
  airlockGroup.add(rfidLed);

  // Banqueta de cruce de zona limpia / sucia (Step-Over Bench a z = 7.0, apoyada en Y = -1.55)
  const benchWoodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.45 });
  const stepOverBench = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.45, 0.35), benchWoodMat);
  stepOverBench.position.set(0, -1.325, 7.0);
  airlockGroup.add(stepOverBench);

  // Patas de acero de la banqueta
  [-1.5, -0.5, 0.5, 1.5].forEach((bx) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 12), stainlessMat);
    leg.position.set(bx, -1.325, 7.0);
    airlockGroup.add(leg);
  });

  // Franja en el suelo que divide zona exterior y zona limpia
  const stripeTex = createSafetyTexture('safety_stripes');
  stripeTex.repeat.set(8, 1);
  const dividerLine = new THREE.Mesh(
    new THREE.PlaneGeometry(8.8, 0.1),
    new THREE.MeshBasicMaterial({ map: stripeTex, side: THREE.DoubleSide })
  );
  dividerLine.rotation.x = -Math.PI / 2;
  dividerLine.position.set(0, -1.545, 7.0);
  airlockGroup.add(dividerLine);

  // Pórtico de Ducha de Aire ciclónica HEPA (Air Shower) en el umbral hacia el lab (z = 5.25)
  const airShowerArch = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.65, 0.32), stainlessMat);
  airShowerArch.position.set(0, -0.225, 5.25);
  airlockGroup.add(airShowerArch);

  // Hueco interior del pórtico para paso fluido
  const airShowerOpening = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 2.45, 0.34),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 })
  );
  airShowerOpening.position.set(0, -0.325, 5.25);
  airlockGroup.add(airShowerOpening);

  // Boquillas cromadas de soplado ciclónico de aire (25 m/s) en ambas paredes del pórtico
  [-0.82, 0.82].forEach((sideX) => {
    [-1.0, -0.5, 0.0, 0.5].forEach((ny) => {
      const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.03, 10), stainlessMat);
      jet.rotation.z = Math.PI / 2;
      jet.position.set(sideX, ny, 5.25);
      airlockGroup.add(jet);
    });
  });

  // Cartel de Ducha de Aire
  const airShowerSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.32),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('air_shower_sign') })
  );
  airShowerSign.position.set(0, 1.25, 5.08);
  airlockGroup.add(airShowerSign);

  // 2 Paneles de iluminación LED Cleanroom en el techo de la esclusa
  const trofferMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  [-1.5, 1.5].forEach((tx) => {
    const lightTroffer = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 1.2), trofferMat);
    lightTroffer.position.set(tx, 3.63, 6.5);
    airlockGroup.add(lightTroffer);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.02, 1.26), stainlessMat);
    frame.position.set(tx, 3.65, 6.5);
    airlockGroup.add(frame);
  });

  wallsGroup.add(airlockGroup);

  return wallsGroup;
}

/**
 * Construye una Mesa Profesional de Laboratorio con Encimera Fenólica Marina,
 * Bastidor de Acero en C, Cajoneras Técnicas y Servicios Integrados.
 */
export function buildProfessionalLabBench(config: LabBenchConfig): THREE.Group {
  const benchGroup = new THREE.Group();
  benchGroup.name = `LabBench_${config.stationId}`;
  benchGroup.position.copy(config.position);

  // =========================================================================
  // MATERIALES NORMALIZADOS DE LABORATORIO (Reutilizados en O(1) para bajo consumo VRAM)
  // =========================================================================
  const epoxyTopMat = new THREE.MeshStandardMaterial({
    color: 0xd8e1e8, // Resina epoxi gris perla claro / marfil técnico
    roughness: 0.28,
    metalness: 0.08
  });

  const marineEdgeMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // Reborde perimetral antiderrames (polímero técnico oscuro)
    roughness: 0.45,
    metalness: 0.15
  });

  const cFrameMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9, // Acero tubular lacado epoxi blanco polar
    roughness: 0.35,
    metalness: 0.2
  });

  const cabinetWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc, // Melamina ignífuga blanca para puertas y cajones
    roughness: 0.5,
    metalness: 0.05
  });

  const plinthDarkMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Zócalo sanitario oscuro retrasado
    roughness: 0.75,
    metalness: 0.1
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc, // Acero inoxidable / cromo brillante
    roughness: 0.14,
    metalness: 0.92
  });

  const aluminumHandleMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Tiradores de aluminio anodizado mate
    roughness: 0.25,
    metalness: 0.8
  });

  const polypropyleneBlackMat = new THREE.MeshStandardMaterial({
    color: 0x1e2226, // Polipropileno negro de alta densidad (cubeta / pileta)
    roughness: 0.65,
    metalness: 0.05
  });

  const w = config.width;
  const d = config.depth;
  const topThickness = 0.05;

  // =========================================================================
  // 1. ENCIMERA TÉCNICA PRINCIPAL (Cota superior exacta en Y = 0)
  // =========================================================================
  const worktop = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.04, topThickness, d - 0.04),
    epoxyTopMat
  );
  worktop.position.set(0, -topThickness / 2, 0);
  worktop.receiveShadow = true;
  benchGroup.add(worktop);

  // 1.1 Reborde Marino Antiderrames Perimetral (Marine Edge de 6 mm de altura)
  // Evita que los líquidos derramados se viertan por el canto
  const edgeH = 0.016;
  const edgeT = 0.024;
  // Borde frontal (+Z)
  const frontEdge = new THREE.Mesh(new THREE.BoxGeometry(w, edgeH, edgeT), marineEdgeMat);
  frontEdge.position.set(0, edgeH / 2 - 0.005, d / 2 - edgeT / 2);
  benchGroup.add(frontEdge);
  // Borde posterior (-Z) - Copete sanitario / Backsplash elevado (0.06m)
  const backEdge = new THREE.Mesh(new THREE.BoxGeometry(w, 0.075, edgeT), marineEdgeMat);
  backEdge.position.set(0, 0.075 / 2 - 0.005, -d / 2 + edgeT / 2);
  benchGroup.add(backEdge);
  // Bordes laterales (-X, +X)
  const leftEdge = new THREE.Mesh(new THREE.BoxGeometry(edgeT, edgeH, d - edgeT * 2), marineEdgeMat);
  leftEdge.position.set(-w / 2 + edgeT / 2, edgeH / 2 - 0.005, 0);
  benchGroup.add(leftEdge);
  const rightEdge = new THREE.Mesh(new THREE.BoxGeometry(edgeT, edgeH, d - edgeT * 2), marineEdgeMat);
  rightEdge.position.set(w / 2 - edgeT / 2, edgeH / 2 - 0.005, 0);
  benchGroup.add(rightEdge);

  // =========================================================================
  // 2. BASTIDOR DE ACERO ESTRUCTURAL EN "C" (C-Frame 60x40 mm)
  // =========================================================================
  // Las patas bajan desde la base de la encimera (-0.05) hasta el suelo (-1.55) -> Altura ~1.50m
  const legHeight = 1.48;
  const legY = -topThickness - legHeight / 2;
  const legOffsetX = w / 2 - 0.16;

  [-legOffsetX, legOffsetX].forEach((lx) => {
    // Montante vertical trasero
    const vLeg = new THREE.Mesh(new THREE.BoxGeometry(0.06, legHeight, 0.06), cFrameMat);
    vLeg.position.set(lx, legY, -d / 2 + 0.12);
    vLeg.castShadow = true;
    benchGroup.add(vLeg);

    // Brazo superior de soporte bajo encimera
    const topArm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, d - 0.35), cFrameMat);
    topArm.position.set(lx, -topThickness - 0.025, 0.05);
    benchGroup.add(topArm);

    // Pie horizontal inferior de soporte en suelo
    const baseArm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, d - 0.3), cFrameMat);
    baseArm.position.set(lx, -topThickness - legHeight + 0.03, 0.08);
    benchGroup.add(baseArm);

    // Patas niveladoras regulables de acero inoxidable en los extremos del pie
    [-0.32, 0.32].forEach((fz) => {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.035, 12), chromeMat);
      foot.position.set(lx, -topThickness - legHeight + 0.015, 0.08 + fz);
      benchGroup.add(foot);
    });
  });

  // Tirante longitudinal de rigidización transversal trasera
  const rearStretcher = new THREE.Mesh(new THREE.BoxGeometry(w - 0.38, 0.05, 0.04), cFrameMat);
  rearStretcher.position.set(0, legY - 0.15, -d / 2 + 0.12);
  benchGroup.add(rearStretcher);

  // =========================================================================
  // 3. MÓDULOS DE CAJONERAS Y ARMARIO TÉCNICO BAJO ENCIMERA (Casework)
  // =========================================================================
  const cabinetHeight = 0.95;
  const cabinetDepth = d - 0.38;
  const cabinetY = -topThickness - 0.03 - cabinetHeight / 2;
  const plinthHeight = 0.12;

  // 3.1 Cajonera Izquierda (3 cajones técnicos)
  const drawerWidth = 0.72;
  const drawerBlockX = -w / 2 + drawerWidth / 2 + 0.22;

  const drawerBox = new THREE.Mesh(
    new THREE.BoxGeometry(drawerWidth, cabinetHeight, cabinetDepth),
    cabinetWhiteMat
  );
  drawerBox.position.set(drawerBlockX, cabinetY, 0.02);
  drawerBox.castShadow = true;
  benchGroup.add(drawerBox);

  // Zócalo negro retrasado para la cajonera izquierda
  const drawerPlinth = new THREE.Mesh(
    new THREE.BoxGeometry(drawerWidth - 0.08, plinthHeight, cabinetDepth - 0.1),
    plinthDarkMat
  );
  drawerPlinth.position.set(drawerBlockX, -topThickness - cabinetHeight - plinthHeight / 2 - 0.03, 0.02);
  benchGroup.add(drawerPlinth);

  // 3 Frentes de cajón con tiradores continuos de aluminio
  const singleDrawerH = (cabinetHeight - 0.06) / 3;
  for (let i = 0; i < 3; i++) {
    const frontY = cabinetY + cabinetHeight / 2 - (i + 0.5) * singleDrawerH - 0.015;
    const drawerFront = new THREE.Mesh(
      new THREE.BoxGeometry(drawerWidth - 0.03, singleDrawerH - 0.015, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.42 })
    );
    drawerFront.position.set(drawerBlockX, frontY, 0.02 + cabinetDepth / 2 + 0.01);
    benchGroup.add(drawerFront);

    // Tirador empotrado lineal
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(drawerWidth * 0.65, 0.018, 0.018),
      aluminumHandleMat
    );
    handle.position.set(drawerBlockX, frontY + singleDrawerH * 0.25, 0.02 + cabinetDepth / 2 + 0.025);
    benchGroup.add(handle);
  }

  // 3.2 Armario Técnico Derecho (2 puertas ventiladas)
  const cabWidth = 0.72;
  const cabBlockX = w / 2 - cabWidth / 2 - 0.22;

  const rightCabinet = new THREE.Mesh(
    new THREE.BoxGeometry(cabWidth, cabinetHeight, cabinetDepth),
    cabinetWhiteMat
  );
  rightCabinet.position.set(cabBlockX, cabinetY, 0.02);
  rightCabinet.castShadow = true;
  benchGroup.add(rightCabinet);

  const rightPlinth = new THREE.Mesh(
    new THREE.BoxGeometry(cabWidth - 0.08, plinthHeight, cabinetDepth - 0.1),
    plinthDarkMat
  );
  rightPlinth.position.set(cabBlockX, -topThickness - cabinetHeight - plinthHeight / 2 - 0.03, 0.02);
  benchGroup.add(rightPlinth);

  // 2 Puertas con línea divisoria central
  [-cabWidth / 4 + 0.01, cabWidth / 4 - 0.01].forEach((px, idx) => {
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(cabWidth / 2 - 0.025, cabinetHeight - 0.03, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.42 })
    );
    door.position.set(cabBlockX + px, cabinetY, 0.02 + cabinetDepth / 2 + 0.01);
    benchGroup.add(door);

    // Tirador vertical
    const vHandle = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.16, 0.018), aluminumHandleMat);
    vHandle.position.set(cabBlockX + px + (idx === 0 ? 0.12 : -0.12), cabinetY + 0.15, 0.02 + cabinetDepth / 2 + 0.025);
    benchGroup.add(vHandle);
  });

  // =========================================================================
  // 4. REPISA ELEVADA DE REACTIVOS / PUENTE TÉCNICO (Reagent Rack)
  // =========================================================================
  if (config.hasReagentOverheadRack) {
    const rackW = w - 0.45;
    const rackH = 0.58;
    const rackZ = -d / 2 + 0.24;

    // Columnas de soporte de aluminio ranurado
    [-rackW / 2 + 0.12, rackW / 2 - 0.12].forEach((cx) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, rackH, 14), aluminumHandleMat);
      col.position.set(cx, rackH / 2, rackZ);
      col.castShadow = true;
      benchGroup.add(col);

      // Brida de fijación a la encimera
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 16), chromeMat);
      flange.position.set(cx, 0.006, rackZ);
      benchGroup.add(flange);
    });

    // Balda técnica portafrascos
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(rackW, 0.025, 0.28),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.1 })
    );
    shelf.position.set(0, rackH, rackZ);
    shelf.castShadow = true;
    benchGroup.add(shelf);

    // Barandilla de seguridad anticaída de frascos (acero inoxidable)
    const railGeo = new THREE.CylinderGeometry(0.006, 0.006, rackW, 8);
    const rail = new THREE.Mesh(railGeo, chromeMat);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, rackH + 0.045, rackZ + 0.13);
    benchGroup.add(rail);

    // Frascos de reactivos decorativos sobre la repisa
    const bottleColors = [0x38bdf8, 0xef4444, 0xf59e0b, 0x10b981, 0x8b5cf6];
    for (let b = 0; b < 5; b++) {
      const bx = -rackW / 2 + 0.32 + b * 0.24;
      const bGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.1, 14);
      const bMat = new THREE.MeshPhysicalMaterial({
        color: bottleColors[b],
        transmission: 0.65,
        transparent: true,
        opacity: 0.85,
        roughness: 0.15
      });
      const bottle = new THREE.Mesh(bGeo, bMat);
      bottle.position.set(bx, rackH + 0.065, rackZ);
      benchGroup.add(bottle);

      // Tapón blanco con rosca
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.025, 12), cFrameMat);
      cap.position.set(bx, rackH + 0.125, rackZ);
      benchGroup.add(cap);
    }

    // Luz LED focalizada de tarea bajo la repisa (Task Lighting 4500K)
    const taskLightBar = new THREE.Mesh(
      new THREE.BoxGeometry(rackW * 0.8, 0.01, 0.03),
      new THREE.MeshBasicMaterial({ color: 0xfef9c3 })
    );
    taskLightBar.position.set(0, rackH - 0.018, rackZ);
    benchGroup.add(taskLightBar);

    const taskSpotLight = new THREE.PointLight(0xfffbeb, 0.85, 3.2, 1.2);
    taskSpotLight.position.set(0, rackH - 0.06, rackZ);
    benchGroup.add(taskSpotLight);
  }

  // =========================================================================
  // 5. GRIFO DE CUELLO DE CISNE Y PILETA DE RESINA (Plumbing & Cup Sink)
  // =========================================================================
  if (config.hasPlumbingAndSink) {
    const sinkX = -0.05;
    const sinkZ = -d / 2 + 0.28;

    // Cubeta / Pileta de desagüe de polipropileno embutida en la mesa
    const sinkRim = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.012, 0.22),
      polypropyleneBlackMat
    );
    sinkRim.position.set(sinkX, 0.006, sinkZ);
    benchGroup.add(sinkRim);

    const sinkCavity = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.14, 0.18),
      polypropyleneBlackMat
    );
    sinkCavity.position.set(sinkX, -0.07, sinkZ);
    benchGroup.add(sinkCavity);

    // Rejilla de desagüe cromada en el fondo de la pileta
    const strainer = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.005, 14), chromeMat);
    strainer.position.set(sinkX, -0.138, sinkZ);
    benchGroup.add(strainer);

    // Grifo alto de cuello de cisne (Gooseneck Faucet DIN EN 13792)
    const faucetGroup = new THREE.Group();
    faucetGroup.position.set(sinkX, 0.01, sinkZ - 0.13);

    // Base cilíndrica de latón cromado
    const fBase = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.05, 14), chromeMat);
    faucetGroup.add(fBase);

    // Tubo vertical
    const fPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 12), chromeMat);
    fPipe.position.y = 0.14;
    faucetGroup.add(fPipe);

    // Arco de cuello de cisne
    const archGeo = new THREE.TorusGeometry(0.065, 0.011, 8, 16, Math.PI);
    const arch = new THREE.Mesh(archGeo, chromeMat);
    arch.position.set(0, 0.28, 0.065);
    arch.rotation.y = Math.PI / 2;
    faucetGroup.add(arch);

    // Tobera de salida con aireador
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.015, 0.038, 12), chromeMat);
    nozzle.position.set(0, 0.26, 0.13);
    faucetGroup.add(nozzle);

    // Volantes de control normalizados DIN EN 13792:
    // Verde: Agua fría de red / Azul: Agua pura destilada
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.3 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3 });

    const valveGreen = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.022, 10), greenMat);
    valveGreen.rotation.z = Math.PI / 2;
    valveGreen.position.set(-0.032, 0.11, 0);
    faucetGroup.add(valveGreen);

    const valveBlue = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.022, 10), blueMat);
    valveBlue.rotation.z = Math.PI / 2;
    valveBlue.position.set(0.032, 0.11, 0);
    faucetGroup.add(valveBlue);

    benchGroup.add(faucetGroup);
  }

  // =========================================================================
  // 6. TORRETA DE GASES DE LABORATORIO (Bunsen Gas Turret)
  // =========================================================================
  if (config.hasGasTurret) {
    const gasTurretGroup = new THREE.Group();
    gasTurretGroup.position.set(-0.52, 0.008, -d / 2 + 0.26);

    const turretPost = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.08, 14), chromeMat);
    turretPost.position.y = 0.04;
    gasTurretGroup.add(turretPost);

    // Boquilla cónica estriada para tubo de goma de mechero Bunsen
    const nozzleL = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.035, 12), chromeMat);
    nozzleL.rotation.z = Math.PI / 2;
    nozzleL.position.set(-0.035, 0.065, 0);
    gasTurretGroup.add(nozzleL);

    // Llave de 90° amarilla normalizada (Gas combustible)
    const yellowGasMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.35 });
    const gasLever = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.04), yellowGasMat);
    gasLever.position.set(0, 0.088, 0);
    gasTurretGroup.add(gasLever);

    benchGroup.add(gasTurretGroup);
  }

  // =========================================================================
  // 7. COLUMNA DE TOMAS ELÉCTRICAS ESTANCAS (Power Strip IP55)
  // =========================================================================
  if (config.hasElectricalStrip) {
    const elecGroup = new THREE.Group();
    elecGroup.position.set(-1.12, 0.008, -d / 2 + 0.24);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.09, 0.065),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 })
    );
    box.position.y = 0.045;
    elecGroup.add(box);

    // Dos tapas basculantes protectoras Schuko (IP55)
    [-0.04, 0.04].forEach((sx) => {
      const cover = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.045, 0.008),
        new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.35 })
      );
      cover.position.set(sx, 0.045, 0.034);
      elecGroup.add(cover);
    });

    benchGroup.add(elecGroup);
  }

  // =========================================================================
  // 8. ACCESORIOS CIENTÍFICOS REALISTAS SOBRE LA MESA
  // =========================================================================
  // 8.1 Gradilla de Tubos de Ensayo (Polipropileno blanco con 6 tubos y reactivos)
  if (config.hasTestTubeRack) {
    const rackGroup = new THREE.Group();
    rackGroup.position.set(-1.22, 0.005, 0.22);

    const rackFrameMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.008, 0.08), rackFrameMat);
    basePlate.position.y = 0.004;
    rackGroup.add(basePlate);

    const topPlate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.008, 0.08), rackFrameMat);
    topPlate.position.y = 0.09;
    rackGroup.add(topPlate);

    [-0.105, 0.105].forEach((rx) => {
      const upright = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.075), rackFrameMat);
      upright.position.set(rx, 0.045, 0);
      rackGroup.add(upright);
    });

    // 6 tubos de ensayo de vidrio con líquidos de color
    const tubeLiquidColors = [0x38bdf8, 0xf43f5e, 0x10b981, 0xa855f7, 0xfacc15, 0x06b6d4];
    for (let t = 0; t < 6; t++) {
      const tx = -0.085 + t * 0.034;
      const glassTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0085, 0.0085, 0.11, 10),
        new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, transparent: true, opacity: 0.45, roughness: 0.1 })
      );
      glassTube.position.set(tx, 0.055, 0);
      rackGroup.add(glassTube);

      // Nivel de líquido coloreado
      const liquid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0075, 0.0075, 0.045, 10),
        new THREE.MeshBasicMaterial({ color: tubeLiquidColors[t], transparent: true, opacity: 0.85 })
      );
      liquid.position.set(tx, 0.03, 0);
      rackGroup.add(liquid);

      // Tapón de corcho
      const cork = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.007, 0.016, 10),
        new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.9 })
      );
      cork.position.set(tx, 0.115, 0);
      rackGroup.add(cork);
    }
    benchGroup.add(rackGroup);
  }

  // 8.2 Frasco Lavador (Piseta de Polietileno para Agua Destilada)
  if (config.hasWashBottle) {
    const washGroup = new THREE.Group();
    washGroup.position.set(0.68, 0.005, 0.42);

    const bottleBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.038, 0.14, 14),
      new THREE.MeshPhysicalMaterial({ color: 0xf1f5f9, transmission: 0.65, transparent: true, opacity: 0.82, roughness: 0.35 })
    );
    bottleBody.position.y = 0.07;
    washGroup.add(bottleBody);

    const shoulder = new THREE.Mesh(
      new THREE.ConeGeometry(0.036, 0.03, 14),
      new THREE.MeshPhysicalMaterial({ color: 0xf1f5f9, transmission: 0.65, transparent: true, opacity: 0.82, roughness: 0.35 })
    );
    shoulder.position.y = 0.155;
    washGroup.add(shoulder);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 12), cFrameMat);
    cap.position.y = 0.175;
    washGroup.add(cap);

    // Cánula curva de salida (tubo dosificador curvo de agua H2O)
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.175, 0),
      new THREE.Vector3(0.02, 0.22, 0),
      new THREE.Vector3(0.05, 0.24, 0),
      new THREE.Vector3(0.075, 0.20, 0)
    ]);
    const cannula = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.004, 8, false), cFrameMat);
    washGroup.add(cannula);

    benchGroup.add(washGroup);
  }

  // =========================================================================
  // 9. PLACA IDENTIFICATIVA TÉCNICA (Grabada en Aluminio)
  // =========================================================================
  const labelPlate = createTextPlateMesh(
    `SYMBIOLAB  /  ${config.label.toUpperCase()}`,
    1.15,
    0.055,
    config.labelAccentColor,
    '#1e293b'
  );
  labelPlate.rotation.x = -Math.PI / 2;
  labelPlate.position.set(-w / 2 + 0.72, 0.008, -d / 2 + 0.1);
  benchGroup.add(labelPlate);

  return benchGroup;
}

/**
 * Placa identificativa serigrafiada en alta resolución
 */
function createTextPlateMesh(
  text: string,
  width: number,
  height: number,
  textColor: string,
  bgColor: string
): THREE.Mesh {
  if (typeof document === 'undefined') {
    return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial());
  }
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  ctx.fillStyle = textColor;
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({ map: texture });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
}
