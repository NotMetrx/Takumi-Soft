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
 * Textura procedural de paisaje exterior de campus universitario / parque científico
 * para el Gran Ventanal Panorámico Técnico.
 */
export function createCampusLandscapeTexture(): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    const fallbackTex = new THREE.CanvasTexture({} as HTMLCanvasElement);
    return fallbackTex;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Gradiente de cielo diurno luminoso de campus
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 360);
  skyGrad.addColorStop(0, '#38bdf8');   // Azul cielo brillante
  skyGrad.addColorStop(0.55, '#bae6fd'); // Azul suave
  skyGrad.addColorStop(0.85, '#fef08a'); // Calidez solar cerca del horizonte
  skyGrad.addColorStop(1.0, '#fed7aa');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 1024, 360);

  // Nubes suaves algodonadas
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  for (let i = 0; i < 6; i++) {
    const cx = 80 + i * 170;
    const cy = 70 + (i % 3) * 35;
    ctx.beginPath();
    ctx.arc(cx, cy, 45, 0, Math.PI * 2);
    ctx.arc(cx + 40, cy - 10, 55, 0, Math.PI * 2);
    ctx.arc(cx + 80, cy, 40, 0, Math.PI * 2);
    ctx.fill();
  }

  // Colinas verdes lejanas del campus
  ctx.fillStyle = '#15803d'; // Verde bosque lejano
  ctx.beginPath();
  ctx.moveTo(0, 360);
  ctx.bezierCurveTo(250, 300, 500, 330, 750, 290);
  ctx.bezierCurveTo(900, 270, 1000, 310, 1024, 330);
  ctx.lineTo(1024, 512);
  ctx.lineTo(0, 512);
  ctx.closePath();
  ctx.fill();

  // Arboleda y parque científico universitario en primer plano
  ctx.fillStyle = '#166534';
  ctx.beginPath();
  ctx.moveTo(0, 380);
  for (let x = 0; x <= 1024; x += 32) {
    const h = 330 + Math.sin(x * 0.04) * 25 + Math.cos(x * 0.08) * 15;
    ctx.lineTo(x, h);
  }
  ctx.lineTo(1024, 512);
  ctx.lineTo(0, 512);
  ctx.closePath();
  ctx.fill();

  // Sendero peatonal y césped iluminado
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(0, 430, 1024, 82);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
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
    // Paneles sobre pasillos laterales
    [-6.5, 0.3],
    [-6.5, 2.5],
    [6.5, 0.3],
    [6.5, 2.5],
    // Paneles en la nave central diáfana y amplia extendida (z = 3.5 a 8.5)
    [-3.0, 4.5],
    [3.0, 4.5],
    [0.0, 4.5],
    [-3.0, 7.8],
    [3.0, 7.8],
    [0.0, 7.8]
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
  wallsGroup.add(backWall);

  const backBaseboard = new THREE.Mesh(new THREE.BoxGeometry(42, 0.16, 0.18), baseboardMat);
  backBaseboard.position.set(0, -1.47, -2.4);
  wallsGroup.add(backBaseboard);

  // =========================================================================
  // 2. PARED DERECHA DEL LABORATORIO (Este, x = 10.0, z de -2.4 a 10.0 -> long 12.4m)
  // Incorpora el Gran Ventanal Panorámico Técnico con luz natural y vistas al exterior (z = 0.5 a 6.5)
  // =========================================================================
  // Tramo sólido Norte de la pared Este (z = -2.4 a 0.5, largo 2.9m)
  const rightWallNorth = new THREE.Mesh(new THREE.BoxGeometry(0.15, wallHeight, 2.9), wallMat);
  rightWallNorth.position.set(10.0, wallY, -0.95);
  wallsGroup.add(rightWallNorth);

  const rightBaseboardNorth = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 2.9), baseboardMat);
  rightBaseboardNorth.position.set(10.0, -1.47, -0.95);
  wallsGroup.add(rightBaseboardNorth);

  // Tramo sólido Sur de la pared Este (z = 6.5 a 10.0, largo 3.5m)
  const rightWallSouth = new THREE.Mesh(new THREE.BoxGeometry(0.15, wallHeight, 3.5), wallMat);
  rightWallSouth.position.set(10.0, wallY, 8.25);
  wallsGroup.add(rightWallSouth);

  const rightBaseboardSouth = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 3.5), baseboardMat);
  rightBaseboardSouth.position.set(10.0, -1.47, 8.25);
  wallsGroup.add(rightBaseboardSouth);

  // Antepecho inferior bajo el ventanal (z = 0.5 a 6.5, largo 6.0m, y = -1.55 a 0.05, alto 1.60m)
  const windowSillWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.60, 6.0), wallMat);
  windowSillWall.position.set(10.0, -0.75, 3.5);
  wallsGroup.add(windowSillWall);

  const windowSillBaseboard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 6.0), baseboardMat);
  windowSillBaseboard.position.set(10.0, -1.47, 3.5);
  wallsGroup.add(windowSillBaseboard);

  // Dintel superior sobre el ventanal (z = 0.5 a 6.5, largo 6.0m, y = 2.65 a 3.75, alto 1.10m)
  const windowLintelWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.10, 6.0), wallMat);
  windowLintelWall.position.set(10.0, 3.20, 3.5);
  wallsGroup.add(windowLintelWall);

  // MARCO TÉCNICO Y VIDRIO DEL GRAN VENTANAL PANORÁMICO (x = 10.0, z = 0.5 a 6.5, y = 0.05 a 2.65)
  const windowGroup = new THREE.Group();
  windowGroup.name = 'TechnicalPanoramicWindow';

  // Perfil perimetral exterior de aluminio anodizado / acero inoxidable cepillado
  const outerFrame = new THREE.Mesh(new THREE.BoxGeometry(0.20, 2.64, 6.04), stainlessMat);
  outerFrame.position.set(10.0, 1.35, 3.5);
  windowGroup.add(outerFrame);

  // Montantes verticales divisores (crean 4 grandes paños de luz natural)
  [1.95, 3.5, 5.05].forEach((mz) => {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.58, 0.07), stainlessMat);
    mullion.position.set(10.0, 1.35, mz);
    windowGroup.add(mullion);
  });

  // Travesaño horizontal medio
  const transom = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 5.96), stainlessMat);
  transom.position.set(10.0, 1.35, 3.5);
  windowGroup.add(transom);

  // Vidrio doble templado con sutil transmisión y tinte azul cielo
  const windowGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xcde8f5,
    transmission: 0.92,
    opacity: 0.88,
    transparent: true,
    roughness: 0.04,
    ior: 1.52,
    reflectivity: 0.95,
    thickness: 0.04,
    side: THREE.DoubleSide
  });
  const windowGlassPane = new THREE.Mesh(new THREE.PlaneGeometry(5.95, 2.55), windowGlassMat);
  windowGlassPane.rotation.y = -Math.PI / 2; // Cara hacia el interior del laboratorio
  windowGlassPane.position.set(9.98, 1.35, 3.5);
  windowGroup.add(windowGlassPane);

  // Panel exterior panorámico de alta definición con vistas al campus universitario verde
  const landscapeTex = createCampusLandscapeTexture();
  const landscapeMat = new THREE.MeshBasicMaterial({
    map: landscapeTex,
    side: THREE.FrontSide
  });
  const landscapePanel = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 3.8), landscapeMat);
  landscapePanel.rotation.y = -Math.PI / 2;
  landscapePanel.position.set(10.55, 1.35, 3.5);
  windowGroup.add(landscapePanel);

  // Luz solar suave en ángulo rasante entrando por el ventanal hacia el interior
  const naturalSunlight = new THREE.DirectionalLight(0xfff5e6, 1.35);
  naturalSunlight.position.set(11.5, 3.2, 3.5);
  naturalSunlight.target.position.set(0, 0, 3.5);
  windowGroup.add(naturalSunlight);
  windowGroup.add(naturalSunlight.target);

  wallsGroup.add(windowGroup);

  // =========================================================================
  // 3. PARED IZQUIERDA DEL LABORATORIO (Oeste, x = -10.0, z de -2.4 a 10.0 -> long 12.4m)
  // Nave amplia y diáfana de 20m de ancho total
  // =========================================================================
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, wallHeight, 12.4), wallMat);
  leftWall.position.set(-10.0, wallY, 3.8);
  wallsGroup.add(leftWall);

  const leftBaseboard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 12.4), baseboardMat);
  leftBaseboard.position.set(-10.0, -1.47, 3.8);
  wallsGroup.add(leftBaseboard);

  // =========================================================================
  // 4. PARED SUR DEL LABORATORIO (z = 10.0) CON VANO MONUMENTAL PARA PUERTAS DOBLES
  // Situada al fondo para dejar una gran nave libre y espaciosa de casi 9m frente a las mesas
  // =========================================================================
  // Tramo sólido Oeste (desde x = -10.0 hasta x = -1.3, ancho 8.7m)
  const southWallWest = new THREE.Mesh(new THREE.BoxGeometry(8.7, wallHeight, 0.15), wallMat);
  southWallWest.position.set(-5.65, wallY, 10.0);
  wallsGroup.add(southWallWest);

  const southBaseboardWest = new THREE.Mesh(new THREE.BoxGeometry(8.7, 0.16, 0.18), baseboardMat);
  southBaseboardWest.position.set(-5.65, -1.47, 10.0);
  wallsGroup.add(southBaseboardWest);

  // Tramo sólido Este (desde x = 1.3 hasta x = 10.0, ancho 8.7m)
  const southWallEast = new THREE.Mesh(new THREE.BoxGeometry(8.7, wallHeight, 0.15), wallMat);
  southWallEast.position.set(5.65, wallY, 10.0);
  wallsGroup.add(southWallEast);

  const southBaseboardEast = new THREE.Mesh(new THREE.BoxGeometry(8.7, 0.16, 0.18), baseboardMat);
  southBaseboardEast.position.set(5.65, -1.47, 10.0);
  wallsGroup.add(southBaseboardEast);

  // Dintel superior sobre el vano alto de las puertas automáticas (x = -1.3 a 1.3, y = 2.25 a 3.75)
  const southDoorLintel = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.50, 0.15), wallMat);
  southDoorLintel.position.set(0, 3.00, 10.0);
  wallsGroup.add(southDoorLintel);

  // Rótulo de Esclusa SAS sobre el dintel de acceso
  const airlockSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.45),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('airlock_door_sign') })
  );
  airlockSign.position.set(0, 2.65, 9.92);
  airlockSign.rotation.y = Math.PI; // Orientado hacia el interior del laboratorio
  wallsGroup.add(airlockSign);

  // Panel Magnehelic de Presión Diferencial en la jamba este de la puerta
  const magnehelicPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.35),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('magnehelic_gauge') })
  );
  magnehelicPanel.position.set(1.55, 0.35, 9.92);
  magnehelicPanel.rotation.y = Math.PI;
  wallsGroup.add(magnehelicPanel);

  // =========================================================================
  // 5. PUERTAS AUTOMÁTICAS DOBLES DE SALA LIMPIA ALTA (3.80m de altura)
  // "Se juntan solas en el centro", de gran altura monumental y esbeltez profesional
  // =========================================================================
  const doorsGroup = new THREE.Group();
  doorsGroup.name = 'DoubleCleanroomDoorsRig';

  // Guía / Carcasa superior del operador motorizado telescópico de acero inoxidable
  const operatorHousing = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.16, 0.22), stainlessMat);
  operatorHousing.position.set(0, 2.30, 10.0);
  doorsGroup.add(operatorHousing);

  // Sensor Cleanroom Radar Doppler sobre la guía (cara laboratorio y cara esclusa)
  const radarSensorLab = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.08, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
  );
  radarSensorLab.position.set(0, 2.38, 9.88);
  doorsGroup.add(radarSensorLab);

  const radarSensorAirlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.08, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
  );
  radarSensorAirlock.position.set(0, 2.38, 10.12);
  doorsGroup.add(radarSensorAirlock);

  // LED de estado del sensor (Azul standby / Verde apertura)
  const sensorLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  sensorLed.position.set(0, 2.38, 9.84);
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

  // Puerta alta monumental: 3.80m de altura libre desde el suelo Y = -1.55 hasta Y = 2.25
  const leafWidth = 1.30;
  const leafHeight = 3.80;
  const leafThickness = 0.05;
  const leafY = -1.55 + leafHeight / 2; // = 0.35

  // Hoja Izquierda
  const leftLeaf = new THREE.Mesh(
    new THREE.BoxGeometry(leafWidth, leafHeight, leafThickness),
    leafMaterials
  );
  leftLeaf.position.set(-0.64, leafY, 10.0);
  leftLeaf.castShadow = true;
  doorsGroup.add(leftLeaf);

  // Hoja Derecha
  const rightLeaf = new THREE.Mesh(
    new THREE.BoxGeometry(leafWidth, leafHeight, leafThickness),
    leafMaterials
  );
  rightLeaf.position.set(0.64, leafY, 10.0);
  rightLeaf.castShadow = true;
  doorsGroup.add(rightLeaf);

  // Guía de suelo empotrada de acero inoxidable (ranura guía continua al ras)
  const floorTrack = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.008, 0.08), stainlessMat);
  floorTrack.position.set(0, -1.546, 10.0);
  doorsGroup.add(floorTrack);

  // Rig cinemático con método update optimizado O(1) 0 GC
  const doubleDoorsRig: DoubleDoorsRig = {
    group: doorsGroup,
    leftLeaf,
    rightLeaf,
    sensorLed,
    currentOpen: 0,
    update(playerPos: THREE.Vector3, dt: number) {
      // Distancia horizontal al umbral central de la puerta (0, Y, 10.0)
      const dx = playerPos.x;
      const dz = playerPos.z - 10.0;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Si el usuario está a menos de 3.2m, las puertas se abren automáticamente;
      // al alejarse, vuelven al centro y se juntan solas de forma fluida.
      const targetOpen = dist < 3.2 ? 1.0 : 0.0;
      const speed = targetOpen > this.currentOpen ? 3.5 : 2.4;
      this.currentOpen = THREE.MathUtils.damp(this.currentOpen, targetOpen, speed, dt);

      // Desplazamiento simétrico de ambas hojas correderas
      this.leftLeaf.position.x = THREE.MathUtils.lerp(-0.64, -1.95, this.currentOpen);
      this.rightLeaf.position.x = THREE.MathUtils.lerp(0.64, 1.95, this.currentOpen);

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
  // 6. CÁMARA SAS DE DESCONTAMINACIÓN & VESTIDOR DE BIOSEGURIDAD (z = 10.0 a 14.5)
  // Antecámara ubicada más al fondo, liberando por completo el espacio interior del lab
  // =========================================================================
  const airlockGroup = new THREE.Group();
  airlockGroup.name = 'AirlockChamberStructure';

  // Suelo continuo de resina epoxi estéril (8.0m x 4.5m) al nivel real del suelo (-1.548)
  const airlockFloor = new THREE.Mesh(new THREE.PlaneGeometry(8.0, 4.5), airlockFloorMat);
  airlockFloor.rotation.x = -Math.PI / 2;
  airlockFloor.position.set(0, -1.548, 12.25);
  airlockFloor.receiveShadow = true;
  airlockGroup.add(airlockFloor);

  // Pared Oeste de la esclusa (x = -4.0, desde z = 10.0 hasta 14.5, long 4.5m)
  const airlockWallWest = new THREE.Mesh(new THREE.BoxGeometry(0.15, wallHeight, 4.5), wallMat);
  airlockWallWest.position.set(-4.0, wallY, 12.25);
  airlockGroup.add(airlockWallWest);

  const airlockBaseboardWest = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 4.5), baseboardMat);
  airlockBaseboardWest.position.set(-4.0, -1.47, 12.25);
  airlockGroup.add(airlockBaseboardWest);

  // Pared Este de la esclusa (x = 4.0, desde z = 10.0 hasta 14.5, long 4.5m)
  const airlockWallEast = new THREE.Mesh(new THREE.BoxGeometry(0.15, wallHeight, 4.5), wallMat);
  airlockWallEast.position.set(4.0, wallY, 12.25);
  airlockGroup.add(airlockWallEast);

  const airlockBaseboardEast = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 4.5), baseboardMat);
  airlockBaseboardEast.position.set(4.0, -1.47, 12.25);
  airlockGroup.add(airlockBaseboardEast);

  // Pared Sur exterior de la esclusa (z = 14.5, desde x = -4.0 hasta 4.0)
  // Tramo izquierdo
  const airlockWallSouthL = new THREE.Mesh(new THREE.BoxGeometry(3.2, wallHeight, 0.15), wallMat);
  airlockWallSouthL.position.set(-2.4, wallY, 14.5);
  airlockGroup.add(airlockWallSouthL);

  const airlockBaseboardSouthL = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 0.18), baseboardMat);
  airlockBaseboardSouthL.position.set(-2.4, -1.47, 14.5);
  airlockGroup.add(airlockBaseboardSouthL);

  // Tramo derecho
  const airlockWallSouthR = new THREE.Mesh(new THREE.BoxGeometry(3.2, wallHeight, 0.15), wallMat);
  airlockWallSouthR.position.set(2.4, wallY, 14.5);
  airlockGroup.add(airlockWallSouthR);

  const airlockBaseboardSouthR = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 0.18), baseboardMat);
  airlockBaseboardSouthR.position.set(2.4, -1.47, 14.5);
  airlockGroup.add(airlockBaseboardSouthR);

  // Dintel de acceso exterior (x = -0.8 a 0.8, y = 0.85 a 3.75)
  const exteriorDoorLintel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.9, 0.15), wallMat);
  exteriorDoorLintel.position.set(0, 2.30, 14.5);
  airlockGroup.add(exteriorDoorLintel);

  // Marco de puerta de acceso exterior del pasillo general (x = 0, z = 14.5)
  const exteriorDoorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.18), stainlessMat);
  exteriorDoorFrame.position.set(0, -0.35, 14.5);
  airlockGroup.add(exteriorDoorFrame);

  // Lector biométrico / RFID de control de accesos exterior
  const rfidScanner = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.18, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
  );
  rfidScanner.position.set(0.95, -0.15, 14.42);
  airlockGroup.add(rfidScanner);

  const rfidLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  rfidLed.position.set(0.95, -0.10, 14.40);
  airlockGroup.add(rfidLed);

  // Banqueta de cruce de zona limpia / sucia (Step-Over Bench a z = 13.4, apoyada en Y = -1.55)
  const benchWoodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.45 });
  const stepOverBench = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.45, 0.35), benchWoodMat);
  stepOverBench.position.set(0, -1.325, 13.4);
  airlockGroup.add(stepOverBench);

  // Patas de acero de la banqueta
  [-1.5, -0.5, 0.5, 1.5].forEach((bx) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 12), stainlessMat);
    leg.position.set(bx, -1.325, 13.4);
    airlockGroup.add(leg);
  });

  // Franja en el suelo que divide zona exterior y zona limpia
  const stripeTex = createSafetyTexture('safety_stripes');
  stripeTex.repeat.set(8, 1);
  const dividerLine = new THREE.Mesh(
    new THREE.PlaneGeometry(7.8, 0.1),
    new THREE.MeshBasicMaterial({ map: stripeTex, side: THREE.DoubleSide })
  );
  dividerLine.rotation.x = -Math.PI / 2;
  dividerLine.position.set(0, -1.545, 13.4);
  airlockGroup.add(dividerLine);

  // Pórtico de Ducha de Aire ciclónica HEPA (Air Shower) en el umbral hacia el lab (z = 10.60)
  const airShowerArch = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.75, 0.32), stainlessMat);
  airShowerArch.position.set(0, 0.325, 10.60);
  airlockGroup.add(airShowerArch);

  // Hueco interior del pórtico para paso fluido alto
  const airShowerOpening = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 3.55, 0.34),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 })
  );
  airShowerOpening.position.set(0, 0.225, 10.60);
  airlockGroup.add(airShowerOpening);

  // Boquillas cromadas de soplado ciclónico de aire (25 m/s) en ambas paredes del pórtico
  [-0.92, 0.92].forEach((sideX) => {
    [-1.0, -0.4, 0.2, 0.8, 1.4].forEach((ny) => {
      const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.03, 10), stainlessMat);
      jet.rotation.z = Math.PI / 2;
      jet.position.set(sideX, ny, 10.60);
      airlockGroup.add(jet);
    });
  });

  // Cartel de Ducha de Aire
  const airShowerSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.35),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('air_shower_sign') })
  );
  airShowerSign.position.set(0, 2.35, 10.42);
  airlockGroup.add(airShowerSign);

  // 4 Paneles de iluminación LED Cleanroom en el techo de la esclusa
  const trofferMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  [-1.5, 1.5].forEach((tx) => {
    [11.5, 13.5].forEach((tz) => {
      const lightTroffer = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 1.2), trofferMat);
      lightTroffer.position.set(tx, 3.63, tz);
      airlockGroup.add(lightTroffer);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.02, 1.26), stainlessMat);
      frame.position.set(tx, 3.65, tz);
      airlockGroup.add(frame);
    });
  });

  wallsGroup.add(airlockGroup);

  return wallsGroup;
}

export interface FumeHoodRig {
  group: THREE.Group;
  sashMesh: THREE.Mesh;
  digitalDisplay: THREE.Mesh;
  interiorLight: THREE.PointLight;
  currentOpen: number;
  update: (targetOpen: boolean, dt: number) => void;
}

/**
 * Construye la Campana Extractora de Gases (Industrial Fume Hood - ISO 14644 / SGA)
 * Equipada con guillotina de policarbonato móvil, flujo laminar de 0.52 m/s,
 * luz LED fría interior y armario inferior de seguridad para reactivos volátiles.
 */
export function buildFumeHoodWorkstation(position = new THREE.Vector3(-7.8, -1.55, -1.2)): FumeHoodRig {
  const hoodGroup = new THREE.Group();
  hoodGroup.name = 'IndustrialFumeHoodRig';
  hoodGroup.position.copy(position);

  const stainlessMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.85,
    roughness: 0.25
  });

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.15,
    roughness: 0.45
  });

  const ceramicTopMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.05,
    roughness: 0.18
  });

  const darkInteriorMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.2,
    roughness: 0.75
  });

  // 1. Armario inferior de seguridad para solventes y corrosivos (Alto 0.85m, Ancho 2.2m, Fondo 1.05m)
  const baseCabinet = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 1.05), bodyMat);
  baseCabinet.position.set(0, 0.425, 0);
  hoodGroup.add(baseCabinet);

  // Puertas dobles del armario inferior con rejillas de ventilación
  const doorL = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.80, 0.03), stainlessMat);
  doorL.position.set(-0.54, 0.425, 0.54);
  hoodGroup.add(doorL);

  const doorR = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.80, 0.03), stainlessMat);
  doorR.position.set(0.54, 0.425, 0.54);
  hoodGroup.add(doorR);

  // 2. Encimera interior de cerámica técnica vitrificada resistente a ácidos (Y = 0.85)
  const worktop = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.06, 1.1), ceramicTopMat);
  worktop.position.set(0, 0.88, 0.02);
  hoodGroup.add(worktop);

  // Perfil alféizar aerodinámico (Airfoil sill) para evitar reflujo de vapores
  const airfoil = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.2, 12), stainlessMat);
  airfoil.rotation.z = Math.PI / 2;
  airfoil.position.set(0, 0.92, 0.55);
  hoodGroup.add(airfoil);

  // 3. Estructura superior de la cabina de extracción (Alto 1.85m, desde Y = 0.88 hasta Y = 2.73)
  // Pared trasera
  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.85, 0.05), darkInteriorMat);
  backPanel.position.set(0, 1.805, -0.50);
  hoodGroup.add(backPanel);

  // Deflector aerodinámico interior de aspiración (Baffle)
  const baffle = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.6, 0.02), stainlessMat);
  baffle.position.set(0, 1.80, -0.42);
  hoodGroup.add(baffle);

  // Pared lateral izquierda
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.85, 1.05), bodyMat);
  sideL.position.set(-1.07, 1.805, 0);
  hoodGroup.add(sideL);

  // Pared lateral derecha
  const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.85, 1.05), bodyMat);
  sideR.position.set(1.07, 1.805, 0);
  hoodGroup.add(sideR);

  // Techo de la cabina con orificio de extracción
  const hoodRoof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 1.05), bodyMat);
  hoodRoof.position.set(0, 2.73, 0);
  hoodGroup.add(hoodRoof);

  // Conducto cilíndrico de extracción que sube hacia el falso techo (Y = 2.73 a Y = 5.20)
  const exhaustDuct = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.5, 20), stainlessMat);
  exhaustDuct.position.set(0, 3.98, -0.15);
  hoodGroup.add(exhaustDuct);

  // 4. Dintel frontal con Pantalla Digital de Velocidad de Flujo (Y = 2.35 a 2.73)
  const headerFront = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.38, 0.08), bodyMat);
  headerFront.position.set(0, 2.54, 0.52);
  hoodGroup.add(headerFront);

  // Placa frontal con texto técnico
  const headerSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.18),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('air_shower_sign') })
  );
  headerSign.position.set(-0.2, 2.58, 0.565);
  hoodGroup.add(headerSign);

  // Display digital Magnehelic (LED verde luminoso con lectura de 0.52 m/s)
  const displayCanvas = document.createElement('canvas');
  displayCanvas.width = 256;
  displayCanvas.height = 128;
  const dCtx = displayCanvas.getContext('2d')!;
  dCtx.fillStyle = '#0f172a';
  dCtx.fillRect(0, 0, 256, 128);
  dCtx.fillStyle = '#22c55e';
  dCtx.font = 'bold 36px monospace';
  dCtx.fillText('0.52 m/s', 24, 52);
  dCtx.fillStyle = '#94a3b8';
  dCtx.font = 'bold 18px sans-serif';
  dCtx.fillText('AIRFLOW NORMAL', 24, 92);
  const displayTex = new THREE.CanvasTexture(displayCanvas);

  const digitalDisplay = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.22),
    new THREE.MeshBasicMaterial({ map: displayTex })
  );
  digitalDisplay.position.set(0.75, 2.54, 0.565);
  hoodGroup.add(digitalDisplay);

  // 5. Guillotina Móvil de Vidrio / Policarbonato Templado (Sash)
  // Se desliza verticalmente: cerrada = Y 1.40, abierta = Y 2.05
  const sashGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xcfe8f3,
    transmission: 0.9,
    opacity: 0.85,
    transparent: true,
    roughness: 0.05,
    ior: 1.5,
    side: THREE.DoubleSide
  });

  const sashMesh = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.95, 0.024), sashGlassMat);
  sashMesh.position.set(0, 1.40, 0.51); // Posición inicial cerrada
  hoodGroup.add(sashMesh);

  // Tirador inferior de aluminio de la guillotina
  const sashHandle = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.04, 0.05), stainlessMat);
  sashHandle.position.set(0, -0.455, 0.02);
  sashMesh.add(sashHandle);

  // 6. Luz LED fría interior (proyecta haz limpio dentro de la zona de trabajo)
  const interiorLight = new THREE.PointLight(0xf0fdf4, 1.8, 4.0);
  interiorLight.position.set(0, 2.65, 0.1);
  hoodGroup.add(interiorLight);

  // Rig cinemático con actualización suave lerp
  const fumeHoodRig: FumeHoodRig = {
    group: hoodGroup,
    sashMesh,
    digitalDisplay,
    interiorLight,
    currentOpen: 0,
    update(targetOpen: boolean, dt: number) {
      const targetVal = targetOpen ? 1.0 : 0.0;
      this.currentOpen = THREE.MathUtils.damp(this.currentOpen, targetVal, 4.0, dt);
      // Recorrido vertical de la guillotina: cerrada Y = 1.40, abierta Y = 2.05
      this.sashMesh.position.y = THREE.MathUtils.lerp(1.40, 2.05, this.currentOpen);
    }
  };

  return fumeHoodRig;
}

export interface PavilionDividersRig {
  group: THREE.Group;
  bioDoorLeft: THREE.Mesh;
  bioDoorRight: THREE.Mesh;
  steamDoorLeft: THREE.Mesh;
  steamDoorRight: THREE.Mesh;
  bioDoorOpen: number;
  steamDoorOpen: number;
  update: (playerPos: THREE.Vector3, dt: number) => void;
}

function createPortalSignTexture(text: string, bgColor: string, textColor: string): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    const fallbackTex = new THREE.CanvasTexture({} as HTMLCanvasElement);
    return fallbackTex;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 512, 96);
  ctx.strokeStyle = textColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 88);
  ctx.fillStyle = textColor;
  ctx.font = 'bold 24px "JetBrains Mono", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 48);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

/**
 * Construye los cerramientos arquitectónicos divisorios y puertas correderas
 * que separan los 3 Pabellones Científicos Especializados:
 * 1. Pabellón de Química Analítica (Centro, x = -2.25 a +2.25)
 * 2. Pabellón de Biología Celular y Microscopía (Oeste, x = -10.0 a -2.25)
 * 3. Pabellón Taller STEAM & Fenómenos Cotidianos (Este, x = +2.25 a +10.0)
 */
export function buildPavilionDividers(): PavilionDividersRig {
  const group = new THREE.Group();
  group.name = 'PavilionDividersRig';

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.85,
    roughness: 0.25
  });

  const dividerGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xdbeef5,
    transmission: 0.88,
    opacity: 0.82,
    transparent: true,
    roughness: 0.08,
    ior: 1.5,
    thickness: 0.03,
    side: THREE.DoubleSide
  });

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xedf3f6,
    roughness: 0.65,
    metalness: 0.05
  });

  const wallHeight = 5.2;
  const wallY = 1.05;

  // =========================================================================
  // 1. DIVISORIA OESTE: SEPARA QUÍMICA DE BIOLOGÍA (x = -2.25)
  // =========================================================================
  // Tramo sólido/vidrio Norte (z = -2.4 a 0.5, largo 2.9m)
  const westNorthWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, wallHeight, 2.9), wallMat);
  westNorthWall.position.set(-2.25, wallY, -0.95);
  group.add(westNorthWall);

  // Tramo sólido/vidrio Sur (z = 2.5 a 4.8, largo 2.3m)
  const westSouthWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, wallHeight, 2.3), wallMat);
  westSouthWall.position.set(-2.25, wallY, 3.65);
  group.add(westSouthWall);

  // Dintel superior sobre el portal de paso (z = 0.5 a 2.5, alto 2.6m cota libre, dintel alto 2.6m a 3.65m)
  const westLintel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.05, 2.0), frameMat);
  westLintel.position.set(-2.25, 3.125, 1.5);
  group.add(westLintel);

  // Rótulos luminosos de acceso al Pabellón de Biología / Regreso a Química
  const bioSignTexIn = createPortalSignTexture('➔ 2. BIOLOGÍA & MICROSCOPÍA', '#0f172a', '#4ade80');
  const bioSignMeshIn = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 0.35),
    new THREE.MeshBasicMaterial({ map: bioSignTexIn })
  );
  bioSignMeshIn.rotation.y = Math.PI / 2; // Cara hacia Química (+X)
  bioSignMeshIn.position.set(-2.16, 2.45, 1.5);
  group.add(bioSignMeshIn);

  const bioSignTexOut = createPortalSignTexture('➔ 1. QUÍMICA ANALÍTICA', '#0f172a', '#38bdf8');
  const bioSignMeshOut = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 0.35),
    new THREE.MeshBasicMaterial({ map: bioSignTexOut })
  );
  bioSignMeshOut.rotation.y = -Math.PI / 2; // Cara hacia Biología (-X)
  bioSignMeshOut.position.set(-2.34, 2.45, 1.5);
  group.add(bioSignMeshOut);

  // Puertas correderas dobles de vidrio de acceso a Biología (z = 0.5 a 2.5)
  const bioDoorLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.5, 0.96), dividerGlassMat);
  bioDoorLeft.position.set(-2.25, -0.30, 1.02);
  group.add(bioDoorLeft);

  const bioDoorRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.5, 0.96), dividerGlassMat);
  bioDoorRight.position.set(-2.25, -0.30, 1.98);
  group.add(bioDoorRight);

  // =========================================================================
  // 2. DIVISORIA ESTE: SEPARA QUÍMICA DE STEAM (x = +2.25)
  // =========================================================================
  // Tramo sólido/vidrio Norte (z = -2.4 a 0.5, largo 2.9m)
  const eastNorthWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, wallHeight, 2.9), wallMat);
  eastNorthWall.position.set(2.25, wallY, -0.95);
  group.add(eastNorthWall);

  // Tramo sólido/vidrio Sur (z = 2.5 a 4.8, largo 2.3m)
  const eastSouthWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, wallHeight, 2.3), wallMat);
  eastSouthWall.position.set(2.25, wallY, 3.65);
  group.add(eastSouthWall);

  // Dintel superior sobre el portal de paso
  const eastLintel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.05, 2.0), frameMat);
  eastLintel.position.set(2.25, 3.125, 1.5);
  group.add(eastLintel);

  // Rótulos luminosos de acceso al Pabellón STEAM / Regreso a Química
  const steamSignTexIn = createPortalSignTexture('➔ 3. CIENCIAS STEAM', '#0f172a', '#facc15');
  const steamSignMeshIn = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 0.35),
    new THREE.MeshBasicMaterial({ map: steamSignTexIn })
  );
  steamSignMeshIn.rotation.y = -Math.PI / 2; // Cara hacia Química (-X)
  steamSignMeshIn.position.set(2.16, 2.45, 1.5);
  group.add(steamSignMeshIn);

  const steamSignTexOut = createPortalSignTexture('➔ 1. QUÍMICA ANALÍTICA', '#0f172a', '#38bdf8');
  const steamSignMeshOut = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 0.35),
    new THREE.MeshBasicMaterial({ map: steamSignTexOut })
  );
  steamSignMeshOut.rotation.y = Math.PI / 2; // Cara hacia STEAM (+X)
  steamSignMeshOut.position.set(2.34, 2.45, 1.5);
  group.add(steamSignMeshOut);

  // Puertas correderas dobles de vidrio de acceso a STEAM
  const steamDoorLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.5, 0.96), dividerGlassMat);
  steamDoorLeft.position.set(2.25, -0.30, 1.02);
  group.add(steamDoorLeft);

  const steamDoorRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.5, 0.96), dividerGlassMat);
  steamDoorRight.position.set(2.25, -0.30, 1.98);
  group.add(steamDoorRight);

  // =========================================================================
  // 3. PAVIMENTOS TÉCNICOS DIFERENCIADOS POR PABELLÓN (Cota Y = -1.547)
  // =========================================================================
  // Pabellón de Biología: Suelo continuo antiestático azul cobalto sala limpia
  const bioFloorMat = new THREE.MeshStandardMaterial({
    color: 0x0f2744,
    roughness: 0.35,
    metalness: 0.15
  });
  const bioFloor = new THREE.Mesh(new THREE.PlaneGeometry(7.7, 7.2), bioFloorMat);
  bioFloor.rotation.x = -Math.PI / 2;
  bioFloor.position.set(-6.12, -1.547, 1.2);
  group.add(bioFloor);

  // Pabellón STEAM: Suelo cálido de terrazo y madera técnica
  const steamFloorMat = new THREE.MeshStandardMaterial({
    color: 0x3d2817,
    roughness: 0.45,
    metalness: 0.08
  });
  const steamFloor = new THREE.Mesh(new THREE.PlaneGeometry(7.7, 7.2), steamFloorMat);
  steamFloor.rotation.x = -Math.PI / 2;
  steamFloor.position.set(6.12, -1.547, 1.2);
  group.add(steamFloor);

  const rig: PavilionDividersRig = {
    group,
    bioDoorLeft,
    bioDoorRight,
    steamDoorLeft,
    steamDoorRight,
    bioDoorOpen: 0,
    steamDoorOpen: 0,
    update(playerPos: THREE.Vector3, dt: number) {
      // 1. Puertas de Biología (Portal en x = -2.25, z = 1.5)
      const dxBio = playerPos.x - (-2.25);
      const dzBio = playerPos.z - 1.5;
      const distBio = Math.sqrt(dxBio * dxBio + dzBio * dzBio);
      const targetBio = distBio < 2.2 ? 1.0 : 0.0;
      this.bioDoorOpen = THREE.MathUtils.damp(this.bioDoorOpen, targetBio, 4.0, dt);
      this.bioDoorLeft.position.z = THREE.MathUtils.lerp(1.02, 0.58, this.bioDoorOpen);
      this.bioDoorRight.position.z = THREE.MathUtils.lerp(1.98, 2.42, this.bioDoorOpen);

      // 2. Puertas de STEAM (Portal en x = +2.25, z = 1.5)
      const dxSteam = playerPos.x - 2.25;
      const dzSteam = playerPos.z - 1.5;
      const distSteam = Math.sqrt(dxSteam * dxSteam + dzSteam * dzSteam);
      const targetSteam = distSteam < 2.2 ? 1.0 : 0.0;
      this.steamDoorOpen = THREE.MathUtils.damp(this.steamDoorOpen, targetSteam, 4.0, dt);
      this.steamDoorLeft.position.z = THREE.MathUtils.lerp(1.02, 0.58, this.steamDoorOpen);
      this.steamDoorRight.position.z = THREE.MathUtils.lerp(1.98, 2.42, this.steamDoorOpen);
    }
  };

  return rig;
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
