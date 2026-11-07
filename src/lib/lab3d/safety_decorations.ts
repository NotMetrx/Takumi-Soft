import * as THREE from 'three';

export interface SafetyInteractiveHit {
  type: 'safety_equipment' | 'emergency_shower' | 'eyewash' | 'fire_extinguisher' | 'first_aid';
  subItem?: 'coat' | 'goggles' | 'nitrile_gloves' | 'latex_gloves' | 'shower_lever' | 'eyewash_push' | 'extinguisher_pin';
  label: string;
}

export type SafetyTextureKind =
  | 'ghs_corrosive'
  | 'ghs_toxic'
  | 'ghs_biohazard'
  | 'ghs_flammable'
  | 'iso_shower_eyewash'
  | 'iso_extinguisher'
  | 'iso_emergency_exit'
  | 'ppe_station_sign'
  | 'safety_stripes'
  | 'stainless_grate'
  | 'extinguisher_label'
  | 'nitrile_box_label'
  | 'latex_box_label'
  | 'uvc_cabinet_label'
  | 'donning_protocol_sign'
  | 'push_flag_texture'
  | 'pressure_gauge_dial'
  | 'symbiolab_coat_badge'
  | 'magnehelic_gauge'
  | 'airlock_door_sign'
  | 'air_shower_sign'
  | 'cleanroom_door_leaf';

const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Genera texturas canvas procedurales de alta definición para señalética oficial SGA/GHS,
 * ISO 7010, packaging de consumibles y metrología instrumental.
 * Totalmente seguro para SSR / headless Node en entornos de pruebas Vitest.
 */
export function createSafetyTexture(kind: SafetyTextureKind): THREE.CanvasTexture {
  if (textureCache.has(kind)) {
    return textureCache.get(kind)!;
  }

  if (typeof document === 'undefined') {
    const fallbackCanvas = {} as HTMLCanvasElement;
    const fallbackTex = new THREE.CanvasTexture(fallbackCanvas);
    fallbackTex.repeat.set(1, 1);
    textureCache.set(kind, fallbackTex);
    return fallbackTex;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // 1. Franjas de advertencia y delimitación de seguridad (45° diagonal)
  if (kind === 'safety_stripes') {
    canvas.width = 512;
    canvas.height = 512;
    ctx.fillStyle = '#facc15'; // Amarillo seguridad alta visibilidad
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#0f172a'; // Grafito / negro técnico
    ctx.beginPath();
    const stripeWidth = 48;
    for (let x = -512; x < 1024; x += stripeWidth * 2) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeWidth, 0);
      ctx.lineTo(x + stripeWidth + 512, 512);
      ctx.lineTo(x + 512, 512);
      ctx.closePath();
    }
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    textureCache.set(kind, tex);
    return tex;
  }

  // 2. Rejilla industrial de desagüe de acero inoxidable (Sump Grate)
  if (kind === 'stainless_grate') {
    canvas.width = 512;
    canvas.height = 512;
    // Fondo metálico cepillado
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, 512, 512);

    // Ranuras alargadas de drenaje cortadas con láser
    ctx.fillStyle = '#0f172a';
    const slotW = 12;
    const slotH = 44;
    const gapX = 24;
    const gapY = 56;

    for (let y = 20; y < 492; y += gapY) {
      for (let x = 20; x < 492; x += gapX) {
        // Hueco de drenaje
        ctx.beginPath();
        ctx.roundRect(x, y, slotW, slotH, 6);
        ctx.fill();

        // Resalte metálico superior e izquierdo (bisel especular)
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + slotW, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + slotH);
        ctx.stroke();
      }
    }

    // Cubeta central de drenaje circular con colador
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(256, 256, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Radios del colador
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(256, 256);
      ctx.lineTo(256 + Math.cos(angle) * 44, 256 + Math.sin(angle) * 44);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    textureCache.set(kind, tex);
    return tex;
  }

  // 3. Rombo SGA / GHS (Corrosivo, Tóxico, Inflamable)
  if (kind === 'ghs_corrosive' || kind === 'ghs_toxic' || kind === 'ghs_flammable') {
    canvas.width = 512;
    canvas.height = 512;
    ctx.clearRect(0, 0, 512, 512);

    // Rombo blanco con borde rojo oficial SGA/GHS
    ctx.save();
    ctx.translate(256, 256);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-160, -160, 320, 320);
    ctx.strokeStyle = '#dc2626'; // Rojo SGA
    ctx.lineWidth = 26;
    ctx.strokeRect(-160, -160, 320, 320);
    ctx.restore();

    ctx.fillStyle = '#0f172a';
    if (kind === 'ghs_corrosive') {
      ctx.beginPath();
      ctx.roundRect(140, 150, 75, 26, 8);
      ctx.roundRect(297, 150, 75, 26, 8);
      ctx.rect(130, 300, 96, 36);
      ctx.rect(284, 290, 100, 48);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(176, 230, 10, 0, Math.PI * 2);
      ctx.arc(332, 230, 10, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'ghs_toxic') {
      ctx.beginPath();
      ctx.arc(256, 230, 52, 0, Math.PI * 2);
      ctx.rect(232, 276, 48, 36);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(236, 230, 12, 0, Math.PI * 2);
      ctx.arc(276, 230, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.rect(196, 320, 120, 20);
      ctx.fill();
    } else if (kind === 'ghs_flammable') {
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(256, 130);
      ctx.bezierCurveTo(310, 190, 350, 260, 320, 330);
      ctx.bezierCurveTo(290, 390, 222, 390, 192, 330);
      ctx.bezierCurveTo(160, 270, 210, 210, 256, 130);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(256, 210);
      ctx.bezierCurveTo(284, 250, 300, 300, 280, 340);
      ctx.bezierCurveTo(260, 370, 240, 370, 230, 340);
      ctx.bezierCurveTo(220, 300, 240, 250, 256, 210);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    textureCache.set(kind, tex);
    return tex;
  }

  // 4. Pictograma oficial de Riesgo Biológico (Biohazard)
  if (kind === 'ghs_biohazard') {
    canvas.width = 512;
    canvas.height = 512;
    ctx.fillStyle = '#f59e0b'; // Amarillo/Ámbar oficial
    ctx.beginPath();
    ctx.arc(256, 256, 240, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.arc(204, 208, 68, 0, Math.PI * 2);
    ctx.arc(308, 208, 68, 0, Math.PI * 2);
    ctx.arc(256, 316, 68, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(256, 248, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(256, 248, 20, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    textureCache.set(kind, tex);
    return tex;
  }

  // 5. Señal mural ISO 7010: Ducha de emergencia y lavaojos combinado
  if (kind === 'iso_shower_eyewash') {
    canvas.width = 512;
    canvas.height = 340;
    ctx.fillStyle = '#15803d'; // Verde seguridad ISO 7010
    ctx.fillRect(0, 0, 512, 340);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 492, 320);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DUCHA & LAVAOJOS', 256, 56);
    ctx.font = 'bold 16px monospace';
    ctx.fillText('EMERGENCY SHOWER & EYEWASH', 256, 86);

    // Campana de ducha
    ctx.beginPath();
    ctx.arc(148, 140, 32, 0, Math.PI, true);
    ctx.fill();
    ctx.fillRect(143, 102, 10, 24);

    // Gotas de agua estilizadas
    ctx.fillStyle = '#a7f3d0';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(124 + i * 13, 150, 5, 22);
      ctx.fillRect(130 + i * 13, 180, 5, 18);
    }

    // Ojos lavándose
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(350, 155, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(350, 155, 14, 0, Math.PI * 2);
    ctx.fill();

    // Chorros de agua dirigidos a los ojos
    ctx.fillStyle = '#a7f3d0';
    ctx.beginPath();
    ctx.rect(316, 200, 10, 22);
    ctx.rect(372, 200, 10, 22);
    ctx.arc(328, 186, 8, 0, Math.PI * 2);
    ctx.arc(368, 186, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('ANSI/ISEA Z358.1 · UNE-EN 15154 · Flujo 15 min', 256, 290);
    ctx.font = '13px sans-serif';
    ctx.fillText('Mantener despejado un radio de 1.2 m en todo momento', 256, 314);

    const tex = new THREE.CanvasTexture(canvas);
    textureCache.set(kind, tex);
    return tex;
  }

  // 6. Señal mural ISO 7010: Extintor de incendios
  if (kind === 'iso_extinguisher') {
    canvas.width = 384;
    canvas.height = 480;
    ctx.fillStyle = '#b91c1c'; // Rojo fuego ISO
    ctx.fillRect(0, 0, 384, 480);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 364, 460);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXTINTOR', 192, 68);

    // Silueta de extintor
    ctx.fillRect(150, 135, 84, 180);
    ctx.beginPath();
    ctx.arc(192, 135, 42, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(183, 85, 18, 20);
    ctx.fillRect(165, 72, 54, 12);
    ctx.beginPath();
    ctx.arc(224, 78, 10, 0, Math.PI * 2);
    ctx.fill();

    // Manguera lateral y difusor
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(201, 95);
    ctx.lineTo(246, 120);
    ctx.lineTo(246, 260);
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('CO₂ 5 kg / CLASE B-C', 192, 365);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('Solventes Químicos y Equipos Eléctricos', 192, 405);
    ctx.fillText('Inspección Anual Vigente · Norma NFPA 10', 192, 432);

    const tex = new THREE.CanvasTexture(canvas);
    textureCache.set(kind, tex);
    return tex;
  }

  // 7. Señal mural ISO 7010: Salida de emergencia
  if (kind === 'iso_emergency_exit') {
    canvas.width = 512;
    canvas.height = 200;
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, 0, 512, 200);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 184);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SALIDA DE EMERGENCIA', 285, 80);
    ctx.font = 'bold 20px monospace';
    ctx.fillText('EMERGENCY EXIT', 285, 120);
    ctx.font = '14px sans-serif';
    ctx.fillText('Vía de evacuación · Mantener libre de obstáculos', 285, 155);

    // Silueta de hombre corriendo
    ctx.beginPath();
    ctx.arc(90, 65, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(90, 84);
    ctx.lineTo(84, 126);
    ctx.lineTo(62, 162);
    ctx.moveTo(84, 126);
    ctx.lineTo(112, 154);
    ctx.moveTo(88, 95);
    ctx.lineTo(110, 110);
    ctx.moveTo(88, 95);
    ctx.lineTo(66, 108);
    ctx.stroke();

    // Marco de puerta
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.strokeRect(26, 38, 32, 130);

    const tex = new THREE.CanvasTexture(canvas);
    textureCache.set(kind, tex);
    return tex;
  }

  // 8. Rótulo de la Estación de Bioseguridad y EPP
  if (kind === 'ppe_station_sign') {
    canvas.width = 512;
    canvas.height = 340;
    ctx.fillStyle = '#0284c7'; // Azul ISO instrucción
    ctx.fillRect(0, 0, 512, 340);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 492, 320);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ESTACIÓN DE BIOSEGURIDAD', 256, 56);
    ctx.font = 'bold 16px monospace';
    ctx.fillText('EQUIPO DE PROTECCIÓN PERSONAL (EPP)', 256, 88);

    const items = [
      { icon: '🥼', label: 'BATA', x: 105 },
      { icon: '🥽', label: 'GAFAS EN 166', x: 256 },
      { icon: '🧤', label: 'GUANTES', x: 407 }
    ];
    items.forEach((item) => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(item.x, 170, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '36px sans-serif';
      ctx.fillStyle = '#0284c7';
      ctx.fillText(item.icon, item.x, 182);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 17px sans-serif';
      ctx.fillText(item.label, item.x, 252);
    });

    ctx.fillStyle = '#e0f2fe';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('Protocolo BSL-2 · Uso obligatorio para acceder a mesas de trabajo', 256, 305);

    const tex = new THREE.CanvasTexture(canvas);
    textureCache.set(kind, tex);
    return tex;
  }

  // 9. Etiqueta frontal del cilindro del extintor (PASS + NFPA 704)
  if (kind === 'extinguisher_label') {
    canvas.width = 512;
    canvas.height = 768;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 768);

    // Cabecera roja
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(0, 0, 512, 120);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXTINTOR DE INCENDIOS', 256, 52);
    ctx.font = 'bold 22px monospace';
    ctx.fillText('CO₂ 5 KG · DIÓXIDO DE CARBONO', 256, 92);

    // Rombo NFPA 704
    ctx.save();
    ctx.translate(256, 195);
    ctx.rotate(Math.PI / 4);
    const sz = 38;
    // Azul (Salud 1)
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(-sz, -sz, sz, sz);
    // Rojo (Inflamabilidad 0)
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, -sz, sz, sz);
    // Amarillo (Inestabilidad 0)
    ctx.fillStyle = '#eab308';
    ctx.fillRect(-sz, 0, sz, sz);
    // Blanco (Especial)
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, sz, sz);
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('1', 228, 195);
    ctx.fillText('0', 256, 168);
    ctx.fillText('0', 284, 195);

    // Sección PASS (Instrucciones de accionamiento)
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('MÉTODO P.A.S.S. DE EXTINCIÓN', 256, 280);

    const steps = [
      { step: '1. P - PULL', desc: 'Tirar del pasador y romper el precinto' },
      { step: '2. A - AIM', desc: 'Apuntar la tobera cónica a la base del fuego' },
      { step: '3. S - SQUEEZE', desc: 'Apretar las manijas con firmeza' },
      { step: '4. S - SWEEP', desc: 'Barrer en abanico de lado a lado a 1.5m' }
    ];
    ctx.textAlign = 'left';
    steps.forEach((s, idx) => {
      const y = 330 + idx * 72;
      ctx.fillStyle = '#b91c1c';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(s.step, 40, y);
      ctx.fillStyle = '#334155';
      ctx.font = '16px sans-serif';
      ctx.fillText(s.desc, 40, y + 26);
    });

    // Clases B y C
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(40, 620, 200, 75);
    ctx.fillRect(272, 620, 200, 75);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('CLASE B', 140, 650);
    ctx.font = '13px sans-serif';
    ctx.fillText('Solventes e hidrocarburos', 140, 674);

    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('CLASE C', 372, 650);
    ctx.font = '13px sans-serif';
    ctx.fillText('Riesgo eléctrico con tensión', 372, 674);

    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.fillText('Certificado EN 3-7 · CE 0029 · Presión de prueba 250 bar', 256, 735);

    const tex = new THREE.CanvasTexture(canvas);
    textureCache.set(kind, tex);
    return tex;
  }

  // 10. Packaging comercial para caja de guantes de Nitrilo Azul
  if (kind === 'nitrile_box_label') {
    canvas.width = 512;
    canvas.height = 256;
    const grad = ctx.createLinearGradient(0, 0, 512, 256);
    grad.addColorStop(0, '#1e3a8a');
    grad.addColorStop(1, '#2563eb');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 500, 244);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('NITRILE PRO-CHEM™', 24, 42);
    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText('GUANTES DE NITRILO SIN POLVO · MICROTEXTURADOS', 24, 68);

    // Ranura oval central de extracción
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(256, 140, 110, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TIRAR AQUÍ / DISPENSER SLOT', 256, 145);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#e0f2fe';
    ctx.font = '12px monospace';
    ctx.fillText('EN ISO 374-1:2016 Type A (AJKOPT) · CE 2777 · TALLA M (100 UDS)', 24, 228);

    const tex = new THREE.CanvasTexture(canvas);
    textureCache.set(kind, tex);
    return tex;
  }

  // 11. Packaging comercial para caja de guantes de Látex Blanco
  if (kind === 'latex_box_label') {
    canvas.width = 512;
    canvas.height = 256;
    const grad = ctx.createLinearGradient(0, 0, 512, 256);
    grad.addColorStop(0, '#0f766e');
    grad.addColorStop(1, '#0d9488');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#99f6e4';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 500, 244);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('LATEX BIOCLASSIC™', 24, 42);
    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText('GUANTES DE LÁTEX QUIRÚRGICO · ALTA SENSIBILIDAD', 24, 68);

    // Ranura oval central
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(256, 140, 110, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TIRAR AQUÍ / DISPENSER SLOT', 256, 145);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ccfbf1';
    ctx.font = '12px monospace';
    ctx.fillText('EN 455-1/2/3 · Grado Médico Hospitalario · TALLA M (100 UDS)', 24, 228);

    const tex = new THREE.CanvasTexture(canvas);
    textureCache.set(kind, tex);
    return tex;
  }

  // 12. Panel frontal del gabinete esterilizador UV-C con display digital
  if (kind === 'uvc_cabinet_label') {
    canvas.width = 512;
    canvas.height = 160;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 160);

    // Pantalla digital LED
    ctx.fillStyle = '#020617';
    ctx.fillRect(20, 20, 472, 80);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 472, 80);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('UV-C 254nm GERMICIDAL', 38, 58);
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('15:00 MIN [READY]', 38, 86);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '13px sans-serif';
    ctx.fillText('Cámara Esterilizadora de Gafas EN 166 · Microinterruptor de Seguridad Activo', 24, 134);

    const tex = new THREE.CanvasTexture(canvas);
    textureCache.set(kind, tex);
    return tex;
  }

  // 13. Cuadro mural didáctico de Protocolo de Colocación (Donning/Doffing)
  if (kind === 'donning_protocol_sign') {
    canvas.width = 512;
    canvas.height = 512;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 512);

    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, 512, 80);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PROTOCOLO DE BIOSEGURIDAD · BSL-2', 256, 42);
    ctx.font = 'bold 15px monospace';
    ctx.fillText('SECUENCIA NORMATIVA DE COLOCACIÓN EPP', 256, 68);

    const steps = [
      { num: '1', title: 'Higiene de Manos', desc: 'Gel antiséptico 70% por 30 segundos' },
      { num: '2', title: 'Bata de Laboratorio', desc: '100% Algodón, abotonada hasta el cuello' },
      { num: '3', title: 'Gafas de Seguridad', desc: 'Norma EN 166, sellado ocular estanco' },
      { num: '4', title: 'Guantes de Protección', desc: 'Nitrilo (química) o Látex (microscopía)' }
    ];

    steps.forEach((st, idx) => {
      const y = 135 + idx * 85;
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(60, y + 10, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(st.num, 60, y + 18);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(st.title, 100, y);
      ctx.fillStyle = '#475569';
      ctx.font = '15px sans-serif';
      ctx.fillText(st.desc, 100, y + 25);
    });

    ctx.fillStyle = '#fee2e2';
    ctx.fillRect(20, 460, 472, 40);
    ctx.fillStyle = '#991b1b';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ Retirar en orden inverso (Doffing) para evitar contaminación dérmica', 256, 485);

    const tex = new THREE.CanvasTexture(canvas);
    textureCache.set(kind, tex);
    return tex;
  }

  // 14. Bandera palanca "EMPUJAR / PUSH" de accionamiento del lavaojos
  if (kind === 'push_flag_texture') {
    canvas.width = 256;
    canvas.height = 256;
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 236, 236);

    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    // Mano empujando
    ctx.roundRect(88, 50, 80, 75, 12);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 36px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EMPUJAR', 128, 175);
    ctx.font = '900 28px monospace';
    ctx.fillText('PUSH', 128, 215);

    const tex = new THREE.CanvasTexture(canvas);
    textureCache.set(kind, tex);
    return tex;
  }

  // 15. Esfera de manómetro de presión de fluidos (0-16 bar)
  if (kind === 'pressure_gauge_dial') {
    canvas.width = 256;
    canvas.height = 256;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(128, 128, 124, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Sector verde (presión de servicio 8-14 bar)
    ctx.beginPath();
    ctx.arc(128, 128, 100, Math.PI * 0.75, Math.PI * 1.85);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 16;
    ctx.stroke();

    // Marcas de graduación
    for (let i = 0; i <= 16; i += 2) {
      const angle = Math.PI * 0.75 + (i / 16) * (Math.PI * 1.5);
      const x1 = 128 + Math.cos(angle) * 85;
      const y1 = 128 + Math.sin(angle) * 85;
      const x2 = 128 + Math.cos(angle) * 110;
      const y2 = 128 + Math.sin(angle) * 110;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Aguja indicadora
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(128, 128);
    const needleAngle = Math.PI * 0.75 + (10.5 / 16) * (Math.PI * 1.5);
    ctx.lineTo(128 + Math.cos(needleAngle) * 75, 128 + Math.sin(needleAngle) * 75);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(128, 128, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BAR', 128, 180);

    const tex = new THREE.CanvasTexture(canvas);
    textureCache.set(kind, tex);
    return tex;
  }

  // 17. Manómetro diferencial Magnehelic y pantalla de cascada de presión (ISO 14644-4)
  if (kind === 'magnehelic_gauge') {
    canvas.width = 512;
    canvas.height = 256;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 500, 244);

    // Cabecera
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CASCADA DE PRESIÓN DIFERENCIAL · ISO 14644', 24, 40);

    // Indicadores numéricos de presión en cascada
    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('1. EXTERIOR (PASILLO):', 24, 82);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('0.0 Pa', 320, 82);

    ctx.fillStyle = '#facc15';
    ctx.fillText('2. ESCLUSA SAS:', 24, 120);
    ctx.fillText('-15.0 Pa [BUFFER]', 320, 120);

    ctx.fillStyle = '#4ade80';
    ctx.fillText('3. NÚCLEO LAB BSL-2:', 24, 158);
    ctx.fillText('-35.0 Pa [DEPRESIÓN]', 320, 158);

    // Estado del sistema HEPA
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(20, 185, 472, 45);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Filtros HEPA H14 (99.995%) · Enclavamiento de compuertas ACTIVO', 256, 212);

    const tex = new THREE.CanvasTexture(canvas);
    textureCache.set(kind, tex);
    return tex;
  }

  // 18. Cartel de puerta de esclusa SAS
  if (kind === 'airlock_door_sign') {
    canvas.width = 512;
    canvas.height = 180;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 180);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, 512, 55);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ESCLUSA SAS DE DESCONTAMINACIÓN', 256, 38);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('PERSONNEL AIRLOCK (PAL) · NIVEL BSL-2', 256, 95);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('Uso obligatorio de EPP completo para franquear la esclusa', 256, 125);
    ctx.fillStyle = '#16a34a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('● COMPUERTA NEUMÁTICA HERMÉTICA · ESPERAR LUZ VERDE', 256, 152);

    const tex = new THREE.CanvasTexture(canvas);
    textureCache.set(kind, tex);
    return tex;
  }

  // 19. Rótulo de la Ducha de Aire ciclónica
  if (kind === 'air_shower_sign') {
    canvas.width = 512;
    canvas.height = 140;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 512, 140);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 500, 128);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DUCHA DE AIRE HEPA · AIR SHOWER', 256, 48);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Soplado ciclónico 25 m/s · Purgado de partículas 5 seg', 256, 85);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText('Rotar 360° con los brazos alzados durante el soplado', 256, 114);

    const tex = new THREE.CanvasTexture(canvas);
    textureCache.set(kind, tex);
    return tex;
  }

  // 20. Hoja de puerta corredera hermética de sala limpia (Cleanroom Double Sliding Door Leaf)
  if (kind === 'cleanroom_door_leaf') {
    canvas.width = 512;
    canvas.height = 1280;

    // Acabado lacado epoxi blanco puro esterilizable para sala limpia (RAL 9010)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 512, 1280);

    // Marco perimetral estanco de acero inoxidable cepillado AISI 316L
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 28;
    ctx.strokeRect(14, 14, 484, 1252);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 6;
    ctx.strokeRect(30, 30, 452, 1220);

    // Ojo de buey / Ventana de observación oblonga con esquinas redondeadas (alta y esbelta)
    const winX = 136;
    const winY = 160;
    const winW = 240;
    const winH = 580;
    const winR = 70;

    // Junta perimetral de estanqueidad de EPDM / neopreno negro
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(winX - 18, winY - 18, winW + 36, winH + 36, winR + 14);
    ctx.fill();

    // Marco biselado de acero inoxidable de la ventana
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 10;
    ctx.stroke();

    // Cristal de seguridad laminar doble (vidrio tintado azul cleanroom)
    const glassGrad = ctx.createLinearGradient(winX, winY, winX + winW, winY + winH);
    glassGrad.addColorStop(0, '#38bdf8');
    glassGrad.addColorStop(0.3, '#0284c7');
    glassGrad.addColorStop(0.7, '#0369a1');
    glassGrad.addColorStop(1, '#075985');
    ctx.fillStyle = glassGrad;
    ctx.beginPath();
    ctx.roundRect(winX, winY, winW, winH, winR);
    ctx.fill();

    // Reflejo especular blanco en el vidrio (línea diagonal suave)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(winX, winY, winW, winH, winR);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.moveTo(winX + 20, winY);
    ctx.lineTo(winX + 100, winY);
    ctx.lineTo(winX + 30, winY + winH);
    ctx.lineTo(winX - 50, winY + winH);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Señalética reglamentaria en la puerta a la altura de la vista
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(80, 800, 352, 68, 12);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PUERTA AUTOMÁTICA', 256, 832);
    ctx.font = 'bold 15px monospace';
    ctx.fillText('SALA LIMPIA BSL-2 · MANTENER LIBRE', 256, 856);

    // Pictograma sin contacto "WAVE / SENSOR" a la altura de cintura
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(256, 940, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#0284c7';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👋', 256, 952);

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('SENSOR SIN CONTACTO', 256, 1000);

    // Placa zócalo inferior de protección contra impactos (Kickplate de acero AISI 304)
    const kickGrad = ctx.createLinearGradient(0, 1050, 0, 1250);
    kickGrad.addColorStop(0, '#94a3b8');
    kickGrad.addColorStop(0.5, '#cbd5e1');
    kickGrad.addColorStop(1, '#64748b');
    ctx.fillStyle = kickGrad;
    ctx.fillRect(28, 1050, 456, 200);

    // Remaches avellanados del kickplate
    ctx.fillStyle = '#334155';
    [48, 150, 256, 362, 464].forEach((rx) => {
      [1070, 1150, 1230].forEach((ry) => {
        ctx.beginPath();
        ctx.arc(rx, ry, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    const tex = new THREE.CanvasTexture(canvas);
    textureCache.set(kind, tex);
    return tex;
  }

  // 16. Escudo bordado para el bolsillo de la bata "SymbioLab BSL-2"
  canvas.width = 256;
  canvas.height = 256;
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(16, 16, 224, 224, 28);
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 32px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SymbioLab', 128, 70);

  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('BSL-2 BIOCONTAINMENT', 128, 105);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(104, 160, 24, 0, Math.PI * 2);
  ctx.arc(152, 160, 24, 0, Math.PI * 2);
  ctx.arc(128, 195, 24, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  textureCache.set(kind, tex);
  return tex;
}

/**
 * Construye la Ducha de Seguridad y Lavaojos Combinada de Alta Fidelidad
 * Conforme a la normativa ANSI/ISEA Z358.1 y UNE-EN 15154.
 */
export function buildEmergencyShowerAndEyewash(
  interactiveList: { mesh: THREE.Object3D; hit: SafetyInteractiveHit }[]
): THREE.Group {
  const stationGroup = new THREE.Group();
  stationGroup.name = 'EmergencyShowerStation';

  // =========================================================================
  // MATERIALES TÉCNICOS INDUSTRIALES
  // =========================================================================
  const greenEpoxyMat = new THREE.MeshStandardMaterial({
    color: 0x15803d, // Verde seguridad industrial ANSI Z535
    roughness: 0.35,
    metalness: 0.3
  });
  const safetyYellowMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15, // Amarillo advertencia brillante
    roughness: 0.3,
    metalness: 0.2
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.95,
    roughness: 0.12
  });
  const brushedSteelMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.85,
    roughness: 0.3
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.9,
    roughness: 0.22
  });

  // =========================================================================
  // 1. PLATAFORMA DE DRENAJE Y CONTENCIÓN DE SUELO (SUMP GRATE)
  // =========================================================================
  const floorPlatformGroup = new THREE.Group();
  floorPlatformGroup.name = 'ShowerFloorDrainPlatform';

  // Cubeta de acero inoxidable de 1.2m x 1.2m con borde biselado accesible
  const sumpTray = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.024, 1.2), brushedSteelMat);
  sumpTray.position.set(0, 0.012, 0.28);
  floorPlatformGroup.add(sumpTray);

  // Rejilla de drenaje perforada con textura de ranuras láser
  const grateMat = new THREE.MeshStandardMaterial({
    map: createSafetyTexture('stainless_grate'),
    metalness: 0.9,
    roughness: 0.25
  });
  const drainGrate = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), grateMat);
  drainGrate.rotation.x = -Math.PI / 2;
  drainGrate.position.set(0, 0.025, 0.28);
  floorPlatformGroup.add(drainGrate);

  // Bordillo perimetral con franjas diagonales de advertencia
  const stripesTex = createSafetyTexture('safety_stripes');
  stripesTex.repeat.set(4, 1);
  const borderMat = new THREE.MeshBasicMaterial({ map: stripesTex, side: THREE.DoubleSide });

  // 4 tiras perimetrales de advertencia
  [
    { w: 1.2, h: 0.08, pos: [0, 0.026, -0.28] as [number, number, number], rot: 0 },
    { w: 1.2, h: 0.08, pos: [0, 0.026, 0.84] as [number, number, number], rot: 0 },
    { w: 0.08, h: 1.2, pos: [-0.56, 0.026, 0.28] as [number, number, number], rot: 0 },
    { w: 0.08, h: 1.2, pos: [0.56, 0.026, 0.28] as [number, number, number], rot: 0 }
  ].forEach((b) => {
    const border = new THREE.Mesh(new THREE.PlaneGeometry(b.w, b.h), borderMat);
    border.rotation.x = -Math.PI / 2;
    border.position.set(b.pos[0], b.pos[1], b.pos[2]);
    floorPlatformGroup.add(border);
  });
  stationGroup.add(floorPlatformGroup);

  // =========================================================================
  // 2. COLUMNA VERTICAL Y FONTANERÍA INDUSTRIAL (1¼" SCHEDULE 40)
  // =========================================================================
  const riserGroup = new THREE.Group();
  riserGroup.name = 'ShowerStandpipe';

  // Brida pesada de anclaje a suelo con 4 pernos hexagonales
  const floorFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.035, 24), brushedSteelMat);
  floorFlange.position.set(0, 0.035, 0);
  riserGroup.add(floorFlange);

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.018, 6), chromeMat);
    bolt.position.set(Math.cos(angle) * 0.1, 0.055, Math.sin(angle) * 0.1);
    riserGroup.add(bolt);
  }

  // Tubería vertical principal (Verde seguridad epoxi, altura 2.44m)
  const pipeRadius = 0.024;
  const riserPipe = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius, pipeRadius, 2.42, 18), greenEpoxyMat);
  riserPipe.position.set(0, 1.24, 0);
  riserGroup.add(riserPipe);

  // Manguitos roscados de unión a lo largo de la columna
  [0.55, 1.02, 1.75].forEach((y) => {
    const union = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius * 1.35, pipeRadius * 1.35, 0.045, 16), chromeMat);
    union.position.set(0, y, 0);
    riserGroup.add(union);
  });

  // Válvula de bola de entrada de agua con maneta amarilla
  const ballValve = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.07, 12), brassMat);
  ballValve.rotation.x = Math.PI / 2;
  ballValve.position.set(0, 0.45, 0.03);
  riserGroup.add(ballValve);

  const valveHandle = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.03, 0.12), safetyYellowMat);
  valveHandle.position.set(0.03, 0.45, 0.06);
  valveHandle.rotation.y = 0.2;
  riserGroup.add(valveHandle);

  // Manómetro analógico de presión de línea (10.5 bar)
  const gaugeDial = new THREE.Mesh(
    new THREE.CircleGeometry(0.038, 20),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('pressure_gauge_dial') })
  );
  gaugeDial.position.set(0.036, 1.22, 0.032);
  gaugeDial.rotation.y = Math.PI / 3;
  riserGroup.add(gaugeDial);

  const gaugeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.022, 20), brassMat);
  gaugeBody.position.set(0.03, 1.22, 0.025);
  gaugeBody.rotation.z = Math.PI / 2;
  riserGroup.add(gaugeBody);

  // Soporte de anclaje a pared trasera con abrazadera en U
  const wallStandoff = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.22), brushedSteelMat);
  wallStandoff.position.set(0, 1.65, -0.11);
  riserGroup.add(wallStandoff);

  const wallFlange = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.015), brushedSteelMat);
  wallFlange.position.set(0, 1.65, -0.22);
  riserGroup.add(wallFlange);
  stationGroup.add(riserGroup);

  // =========================================================================
  // 3. CAMPANA Y ROCIADOR DE LA DUCHA DE EMERGENCIA (ANSI Z358.1)
  // =========================================================================
  const showerHeadGroup = new THREE.Group();
  showerHeadGroup.name = 'ShowerHeadAssembly';

  // Brazo horizontal superior con codo de 90°
  const elbow = new THREE.Mesh(new THREE.SphereGeometry(pipeRadius * 1.35, 12, 12), greenEpoxyMat);
  elbow.position.set(0, 2.44, 0);
  showerHeadGroup.add(elbow);

  const topHorizontalArm = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius, pipeRadius, 0.44, 16), greenEpoxyMat);
  topHorizontalArm.rotation.x = Math.PI / 2;
  topHorizontalArm.position.set(0, 2.44, 0.22);
  showerHeadGroup.add(topHorizontalArm);

  const topFrontElbow = new THREE.Mesh(new THREE.SphereGeometry(pipeRadius * 1.35, 12, 12), greenEpoxyMat);
  topFrontElbow.position.set(0, 2.44, 0.44);
  showerHeadGroup.add(topFrontElbow);

  // Válvula de apertura instantánea con palanca
  const showerValve = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.065, 14), brassMat);
  showerValve.position.set(0, 2.39, 0.44);
  showerHeadGroup.add(showerValve);

  const showerLeverArm = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.18), chromeMat);
  showerLeverArm.position.set(0.06, 2.39, 0.44);
  showerLeverArm.rotation.x = 0.25;
  showerHeadGroup.add(showerLeverArm);

  // Campana cónica de alta visibilidad (Diámetro 24cm, ABS amarillo)
  const showerCone = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.1, 24, 1, true), safetyYellowMat);
  showerCone.rotation.x = Math.PI;
  showerCone.position.set(0, 2.32, 0.44);
  showerHeadGroup.add(showerCone);

  const showerConeRim = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.008, 8, 24), safetyYellowMat);
  showerConeRim.rotation.x = Math.PI / 2;
  showerConeRim.position.set(0, 2.27, 0.44);
  showerHeadGroup.add(showerConeRim);

  // Placa difusora de acero perforada con 120 microorificios de dispersión
  const diffuserMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.95,
    roughness: 0.15
  });
  const diffuserPlate = new THREE.Mesh(new THREE.CircleGeometry(0.118, 24), diffuserMat);
  diffuserPlate.rotation.x = Math.PI / 2;
  diffuserPlate.position.set(0, 2.27, 0.44);
  showerHeadGroup.add(diffuserPlate);

  // Varilla rígida de acero inoxidable que desciende hasta 1.95m
  const pullRod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.42, 8), chromeMat);
  pullRod.position.set(0.14, 2.18, 0.44);
  showerHeadGroup.add(pullRod);

  // Tirador triangular ergonómico de emergencia (Amarillo alta visibilidad)
  const trianglePull = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.01, 8, 3), safetyYellowMat);
  trianglePull.rotation.z = Math.PI;
  trianglePull.position.set(0.14, 1.95, 0.44);

  // Rótulo fotoluminiscente en el tirador "PULL"
  const pullLabel = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.022, 0.008), safetyYellowMat);
  pullLabel.position.set(0.14, 1.95, 0.44);

  const showerHit: SafetyInteractiveHit = {
    type: 'emergency_shower',
    subItem: 'shower_lever',
    label: 'Tirador de Ducha de Emergencia (Norma ANSI Z358.1 · Descontaminación continua 15 min)'
  };
  trianglePull.userData = { isInteractive: true, safetyHit: showerHit };
  showerCone.userData = { isInteractive: true, safetyHit: showerHit };
  pullLabel.userData = { isInteractive: true, safetyHit: showerHit };

  // Proxy invisible ampliado para facilitar el clic o apuntado con la retícula
  const showerHitProxy = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.35, 0.35),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  showerHitProxy.position.set(0.14, 1.95, 0.44);
  showerHitProxy.userData = { isInteractive: true, safetyHit: showerHit };
  showerHeadGroup.add(showerHitProxy);

  showerHeadGroup.add(trianglePull);
  showerHeadGroup.add(pullLabel);
  interactiveList.push({ mesh: trianglePull, hit: showerHit });
  interactiveList.push({ mesh: showerHitProxy, hit: showerHit });
  stationGroup.add(showerHeadGroup);

  // =========================================================================
  // 4. ESTACIÓN LAVAOJOS / LAVACARAS DE DOBLE BOQUILLA (ANSI Z358.1)
  // =========================================================================
  const eyewashGroup = new THREE.Group();
  eyewashGroup.name = 'EyewashStation';

  // Derivación en T a 1.02m de altura
  const eyewashBranch = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.28, 14), chromeMat);
  eyewashBranch.rotation.x = Math.PI / 2;
  eyewashBranch.position.set(0, 1.02, 0.14);
  eyewashGroup.add(eyewashBranch);

  // Bacha circular embutida de acero inoxidable pulido (Diámetro 32cm)
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.09, 24, 1, true), chromeMat);
  bowl.position.set(0, 1.02, 0.28);
  eyewashGroup.add(bowl);

  const bowlBottom = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), chromeMat);
  bowlBottom.rotation.x = -Math.PI / 2;
  bowlBottom.position.set(0, 0.975, 0.28);
  eyewashGroup.add(bowlBottom);

  // Colador de desagüe central de la bacha
  const drainStrainer = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.01, 14), brushedSteelMat);
  drainStrainer.position.set(0, 0.977, 0.28);
  eyewashGroup.add(drainStrainer);

  // Tubo sifón de desagüe inferior
  const drainTrap = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.24, 12), chromeMat);
  drainTrap.position.set(0, 0.85, 0.28);
  eyewashGroup.add(drainTrap);

  // Colector bifurcado de suministro a las dos boquillas
  const manifold = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.018, 0.018), chromeMat);
  manifold.position.set(0, 1.03, 0.28);
  eyewashGroup.add(manifold);

  // Dos boquillas pulverizadoras aireadas con tapas amarillas antipolvo abatibles
  [-0.045, 0.045].forEach((offset) => {
    // Cuerpo cromado del aireador
    const nozzleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.035, 14), chromeMat);
    nozzleBody.position.set(offset, 1.055, 0.28);
    eyewashGroup.add(nozzleBody);

    // Malla microfiltrante superior
    const screen = new THREE.Mesh(new THREE.CircleGeometry(0.014, 12), brushedSteelMat);
    screen.rotation.x = -Math.PI / 2;
    screen.position.set(offset, 1.073, 0.28);
    eyewashGroup.add(screen);

    // Tapa protectora antipolvo abatible (Flip-top dust cover en ABS amarillo)
    const dustCap = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.012, 14), safetyYellowMat);
    dustCap.position.set(offset, 1.082, 0.28);
    dustCap.rotation.z = offset > 0 ? 0.35 : -0.35; // Entreabierta para mostrar dinamismo
    eyewashGroup.add(dustCap);

    // Cadena de bolitas de retención
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.05, 6), chromeMat);
    chain.position.set(offset + (offset > 0 ? 0.018 : -0.018), 1.06, 0.28);
    eyewashGroup.add(chain);
  });

  // Gran bandera de empuje fotoluminiscente "EMPUJAR / PUSH"
  const pushFlagMat = new THREE.MeshBasicMaterial({ map: createSafetyTexture('push_flag_texture') });
  const pushFlag = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.12, 0.14), pushFlagMat);
  pushFlag.position.set(0.19, 1.04, 0.28);
  pushFlag.rotation.y = -0.15;

  const pushFlagShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 8), chromeMat);
  pushFlagShaft.rotation.z = Math.PI / 2;
  pushFlagShaft.position.set(0.16, 1.04, 0.28);
  eyewashGroup.add(pushFlagShaft);

  // Pedal de pie (Foot Treadle) en el suelo conectado mecánicamente
  const footTreadle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.015, 0.14), safetyYellowMat);
  footTreadle.position.set(0, 0.038, 0.52);
  footTreadle.rotation.x = 0.1;
  eyewashGroup.add(footTreadle);

  const treadleRod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.98, 8), chromeMat);
  treadleRod.position.set(0.09, 0.52, 0.36);
  eyewashGroup.add(treadleRod);

  const eyewashHit: SafetyInteractiveHit = {
    type: 'eyewash',
    subItem: 'eyewash_push',
    label: 'Palanca PUSH Lavaojos (Lavado ocular bilateral templado · 15 min continuo)'
  };
  pushFlag.userData = { isInteractive: true, safetyHit: eyewashHit };
  bowl.userData = { isInteractive: true, safetyHit: eyewashHit };
  footTreadle.userData = { isInteractive: true, safetyHit: eyewashHit };

  const eyewashHitProxy = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.25, 0.35),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  eyewashHitProxy.position.set(0.08, 1.04, 0.28);
  eyewashHitProxy.userData = { isInteractive: true, safetyHit: eyewashHit };
  eyewashGroup.add(eyewashHitProxy);

  eyewashGroup.add(pushFlag);
  interactiveList.push({ mesh: pushFlag, hit: eyewashHit });
  interactiveList.push({ mesh: eyewashHitProxy, hit: eyewashHit });
  stationGroup.add(eyewashGroup);

  // =========================================================================
  // 5. SEÑALÉTICA MURAL OFICIAL ISO 7010
  // =========================================================================
  const signMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.48),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('iso_shower_eyewash') })
  );
  signMesh.position.set(0, 2.76, 0.02);
  stationGroup.add(signMesh);

  // Brazos de fijación mural del letrero
  [-0.3, 0.3].forEach((dx) => {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.14), brushedSteelMat);
    bracket.position.set(dx, 2.76, -0.05);
    stationGroup.add(bracket);
  });

  return stationGroup;
}

/**
 * Construye la Estación / Consola de Bioseguridad y Vestuario EPP de Grado Clínico
 * Incluye módulo de batas con solapas bordadas, gabinete UV-C para gafas,
 * triple dispensador acrílico de guantes, espejo de comprobación y cartel de protocolos.
 */
export function buildSafetyPPEStation(
  interactiveList: { mesh: THREE.Object3D; hit: SafetyInteractiveHit }[]
): THREE.Group {
  const stationGroup = new THREE.Group();
  stationGroup.name = 'SafetyPPEStation';

  // =========================================================================
  // MATERIALES
  // =========================================================================
  const cleanroomWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc, // Pintura epoxi polvo estéril
    roughness: 0.35,
    metalness: 0.1
  });
  const slateTrimMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.6,
    metalness: 0.2
  });
  const aluminumTrimMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.85,
    roughness: 0.25
  });
  const coatFabricMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, // Algodón blanco puro
    roughness: 0.85,
    metalness: 0.02
  });
  const woodHangerMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.5
  });
  const acrylicGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.55,
    roughness: 0.08,
    transmission: 0.9,
    ior: 1.49
  });
  const uvcTintedGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.72,
    roughness: 0.1,
    transmission: 0.85,
    ior: 1.52
  });
  const mirrorMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.98,
    roughness: 0.02
  });

  // =========================================================================
  // 1. CARCASA ESTRUCTURAL DEL VESTIDOR / MUEBLE CLÍNICO (1.4m x 2.2m x 0.46m)
  // =========================================================================
  const casework = new THREE.Group();
  casework.name = 'PPECasework';

  // Plinto inferior sanitario cóncavo (Zócalo gris pizarra)
  const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.44), slateTrimMat);
  basePlinth.position.set(0, 0.06, 0);
  casework.add(basePlinth);

  // Panel posterior
  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.08, 0.03), cleanroomWhiteMat);
  backPanel.position.set(0, 1.16, -0.215);
  casework.add(backPanel);

  // Paneles laterales (Izquierdo y Derecho)
  [-0.685, 0.685].forEach((x) => {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.08, 0.44), cleanroomWhiteMat);
    sideWall.position.set(x, 1.16, 0);
    casework.add(sideWall);

    // Moldura de aluminio anodizado en aristas frontales
    const edgeTrim = new THREE.Mesh(new THREE.BoxGeometry(0.015, 2.08, 0.015), aluminumTrimMat);
    edgeTrim.position.set(x > 0 ? 0.7 : -0.7, 1.16, 0.22);
    casework.add(edgeTrim);
  });

  // Techo superior
  const topCap = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.46), cleanroomWhiteMat);
  topCap.position.set(0, 2.2, 0);
  casework.add(topCap);

  // Panel divisor central (Separa vestuario de batas del módulo instrumental)
  const centerDivider = new THREE.Mesh(new THREE.BoxGeometry(0.025, 2.08, 0.43), cleanroomWhiteMat);
  centerDivider.position.set(0, 1.16, 0);
  casework.add(centerDivider);

  // Estantes horizontales del módulo derecho
  [0.85, 1.35].forEach((y) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.67, 0.025, 0.42), cleanroomWhiteMat);
    shelf.position.set(0.34, y, 0);
    casework.add(shelf);
  });

  // Puertas inferiores del módulo derecho (Gabinete de almacenamiento)
  const lowerDoorLeft = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.7, 0.02), cleanroomWhiteMat);
  lowerDoorLeft.position.set(0.18, 0.48, 0.21);
  casework.add(lowerDoorLeft);

  const lowerDoorRight = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.7, 0.02), cleanroomWhiteMat);
  lowerDoorRight.position.set(0.5, 0.48, 0.21);
  casework.add(lowerDoorRight);

  // Tiradores de aluminio embutidos en puertas inferiores
  [0.32, 0.36].forEach((x) => {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.12, 0.015), aluminumTrimMat);
    handle.position.set(x, 0.65, 0.225);
    casework.add(handle);
  });
  stationGroup.add(casework);

  // =========================================================================
  // 2. MÓDULO IZQUIERDO: COLGADOR DE ROPA Y BATA BLANCA HIPERREALISTA
  // =========================================================================
  const wardrobeGroup = new THREE.Group();
  wardrobeGroup.name = 'LabCoatWardrobe';

  // Barra de colgar cilíndrica de acero inoxidable pulido
  const hangerRail = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.65, 16), aluminumTrimMat);
  hangerRail.rotation.z = Math.PI / 2;
  hangerRail.position.set(-0.34, 2.02, 0);
  wardrobeGroup.add(hangerRail);

  // Dos perchas anatómicas de madera con gancho cromado
  [-0.44, -0.24].forEach((x, idx) => {
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.003, 8, 16, Math.PI * 1.3), aluminumTrimMat);
    hook.position.set(x, 2.05, 0);
    hook.rotation.z = Math.PI / 2;
    wardrobeGroup.add(hook);

    const hangerBody = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.02, 0.02), woodHangerMat);
    hangerBody.position.set(x, 2.0, 0);
    hangerBody.rotation.z = idx === 0 ? 0.05 : -0.05;
    wardrobeGroup.add(hangerBody);
  });

  // BATA DE LABORATORIO DE ALTA FIDELIDAD (Malla articulada con solapas, bolsillo y mangas)
  const coatGroup = new THREE.Group();
  coatGroup.name = 'RealisticLabCoatModel';
  coatGroup.position.set(-0.34, 1.45, 0);

  // Torso / Cuerpo principal acampanado
  const coatTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.96, 20), coatFabricMat);
  coatTorso.position.y = 0;
  coatGroup.add(coatTorso);

  // Cuello con solapas dobladas en V
  const lapelLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.03), coatFabricMat);
  lapelLeft.position.set(-0.06, 0.42, 0.16);
  lapelLeft.rotation.z = -0.3;
  coatGroup.add(lapelLeft);

  const lapelRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.03), coatFabricMat);
  lapelRight.position.set(0.06, 0.42, 0.16);
  lapelRight.rotation.z = 0.3;
  coatGroup.add(lapelRight);

  // Tapeta frontal con 4 botones perlados
  const placket = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.88, 0.015), coatFabricMat);
  placket.position.set(0, 0, 0.19);
  coatGroup.add(placket);

  const buttonMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2 });
  [-0.28, -0.1, 0.08, 0.26].forEach((y) => {
    const button = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.004, 12), buttonMat);
    button.rotation.x = Math.PI / 2;
    button.position.set(0, y, 0.2);
    coatGroup.add(button);
  });

  // Bolsillo en el pecho con escudo bordado "SymbioLab BSL-2"
  const pocketBadge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.075, 0.075),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('symbiolab_coat_badge') })
  );
  pocketBadge.position.set(-0.11, 0.22, 0.185);
  pocketBadge.rotation.y = 0.15;
  coatGroup.add(pocketBadge);

  // Dos bolsillos inferiores a la altura de la cintura
  [-0.12, 0.12].forEach((x) => {
    const waistPocket = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.015), coatFabricMat);
    waistPocket.position.set(x, -0.22, 0.21);
    coatGroup.add(waistPocket);
  });

  // Mangas drapeadas naturales con puños abotonados
  [-0.24, 0.24].forEach((x) => {
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.65, 14), coatFabricMat);
    sleeve.position.set(x, 0.1, 0);
    sleeve.rotation.z = x > 0 ? -0.22 : 0.22;
    coatGroup.add(sleeve);

    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 14), coatFabricMat);
    cuff.position.set(x > 0 ? x + 0.06 : x - 0.06, -0.2, 0);
    coatGroup.add(cuff);
  });

  const coatHit: SafetyInteractiveHit = {
    type: 'safety_equipment',
    subItem: 'coat',
    label: 'Bata Blanca de Laboratorio 100% Algodón (Norma EN 14126 · Protección dérmica integral)'
  };
  coatTorso.userData = { isInteractive: true, safetyHit: coatHit };
  placket.userData = { isInteractive: true, safetyHit: coatHit };
  pocketBadge.userData = { isInteractive: true, safetyHit: coatHit };

  const coatHitProxy = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.95, 0.35),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  coatHitProxy.userData = { isInteractive: true, safetyHit: coatHit };
  coatGroup.add(coatHitProxy);

  wardrobeGroup.add(coatGroup);
  interactiveList.push({ mesh: coatTorso, hit: coatHit });
  interactiveList.push({ mesh: coatHitProxy, hit: coatHit });
  stationGroup.add(wardrobeGroup);

  // =========================================================================
  // 3. MÓDULO DERECHO SUPERIOR: GABINETE ESTERILIZADOR UV-C DE GAFAS EN 166
  // =========================================================================
  const uvcCabinet = new THREE.Group();
  uvcCabinet.name = 'UVCGoggleCabinet';
  uvcCabinet.position.set(0.34, 1.74, 0);

  // Carcasa de acero inoxidable
  const uvcBox = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.44, 0.28), aluminumTrimMat);
  uvcCabinet.add(uvcBox);

  // Hueco interior oscuro con rejilla
  const uvcInterior = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.4, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.8 })
  );
  uvcInterior.position.z = 0.02;
  uvcCabinet.add(uvcInterior);

  // Puerta de acrílico tintado azul/ámbar para protección UV
  const uvcWindow = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.32), uvcTintedGlassMat);
  uvcWindow.position.set(0, -0.02, 0.145);
  uvcCabinet.add(uvcWindow);

  // Cabecera con display digital LED
  const uvcPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 0.08),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('uvc_cabinet_label') })
  );
  uvcPanel.position.set(0, 0.175, 0.145);
  uvcCabinet.add(uvcPanel);

  // Rejilla porta-gafas interior cromada
  const wireRack = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.015, 0.2), aluminumTrimMat);
  wireRack.position.set(0, -0.1, 0.04);
  uvcCabinet.add(wireRack);

  // Gafas de seguridad panorámicas EN 166 (Modelo hiperrealista)
  const gogglesGroup = new THREE.Group();
  gogglesGroup.name = 'PanoramicSafetyGoggles';
  gogglesGroup.position.set(0, -0.04, 0.05);

  // Lente panorámico curvo de policarbonato con tratamiento antiempañamiento
  const panoramicLens = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.065, 24, 1, true, 0, Math.PI), acrylicGlassMat);
  panoramicLens.rotation.x = Math.PI / 2;
  panoramicLens.position.set(0, 0, 0.02);
  gogglesGroup.add(panoramicLens);

  // Montura suave de PVC transparente con canales de ventilación indirecta
  const gogglesFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.07, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.25, metalness: 0.1 })
  );
  gogglesGroup.add(gogglesFrame);

  // 4 Válvulas indirectas de aireación
  [-0.06, 0.06].forEach((dx) => {
    [0.035, -0.035].forEach((dy) => {
      const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.006, 10), slateTrimMat);
      vent.rotation.x = Math.PI / 2;
      vent.position.set(dx, dy, 0.022);
      gogglesGroup.add(vent);
    });
  });

  // Banda elástica ajustable trasera
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.018, 0.005), slateTrimMat);
  strap.position.set(0, 0, -0.025);
  gogglesGroup.add(strap);

  const gogglesHit: SafetyInteractiveHit = {
    type: 'safety_equipment',
    subItem: 'goggles',
    label: 'Gafas de Seguridad Policarbonato EN 166 (Esterilizadas con UV-C · Protección ocular total)'
  };
  panoramicLens.userData = { isInteractive: true, safetyHit: gogglesHit };
  gogglesFrame.userData = { isInteractive: true, safetyHit: gogglesHit };
  uvcWindow.userData = { isInteractive: true, safetyHit: gogglesHit };

  const gogglesHitProxy = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.3, 0.25),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  gogglesHitProxy.userData = { isInteractive: true, safetyHit: gogglesHit };
  uvcCabinet.add(gogglesHitProxy);

  uvcCabinet.add(gogglesGroup);
  interactiveList.push({ mesh: panoramicLens, hit: gogglesHit });
  interactiveList.push({ mesh: gogglesHitProxy, hit: gogglesHit });
  stationGroup.add(uvcCabinet);

  // =========================================================================
  // 4. MÓDULO DERECHO MEDIO: DISPENSADOR TRIPLE ACRÍLICO DE GUANTES (NITRILO Y LÁTEX)
  // =========================================================================
  const gloveDispenserRack = new THREE.Group();
  gloveDispenserRack.name = 'GloveDispenserStation';
  gloveDispenserRack.position.set(0.34, 1.05, 0.05);

  // Soporte mural de metacrilato transparente cortado por láser
  const acrylicRack = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 0.16), acrylicGlassMat);
  gloveDispenserRack.add(acrylicRack);

  // 1. Caja de Guantes de Nitrilo Azul Químico (EN ISO 374-1)
  const nitrileBoxGroup = new THREE.Group();
  nitrileBoxGroup.position.set(-0.16, 0, 0);

  const nitrileBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.13, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      map: createSafetyTexture('nitrile_box_label'),
      roughness: 0.35
    })
  );
  nitrileBoxGroup.add(nitrileBox);

  // Pliegue saliente de guante de nitrilo azul listo para extraer
  const blueGlovePeek = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.038, 0.045, 12),
    new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 })
  );
  blueGlovePeek.rotation.x = Math.PI / 2;
  blueGlovePeek.position.set(0, 0, 0.065);
  nitrileBoxGroup.add(blueGlovePeek);

  const nitrileHit: SafetyInteractiveHit = {
    type: 'safety_equipment',
    subItem: 'nitrile_gloves',
    label: 'Guantes de Nitrilo Azul EN 374 (Resistentes a ácidos HCl, bases NaOH y solventes)'
  };
  nitrileBox.userData = { isInteractive: true, safetyHit: nitrileHit };
  blueGlovePeek.userData = { isInteractive: true, safetyHit: nitrileHit };
  nitrileBoxGroup.add(nitrileBox);
  gloveDispenserRack.add(nitrileBoxGroup);
  interactiveList.push({ mesh: nitrileBox, hit: nitrileHit });

  // 2. Caja de Guantes de Látex Blanco Quirúrgico (EN 455)
  const latexBoxGroup = new THREE.Group();
  latexBoxGroup.position.set(0.16, 0, 0);

  const latexBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.13, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0x0f766e,
      map: createSafetyTexture('latex_box_label'),
      roughness: 0.35
    })
  );
  latexBoxGroup.add(latexBox);

  // Pliegue saliente de guante de látex blanco
  const whiteGlovePeek = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.038, 0.045, 12),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })
  );
  whiteGlovePeek.rotation.x = Math.PI / 2;
  whiteGlovePeek.position.set(0, 0, 0.065);
  latexBoxGroup.add(whiteGlovePeek);

  const latexHit: SafetyInteractiveHit = {
    type: 'safety_equipment',
    subItem: 'latex_gloves',
    label: 'Guantes de Látex Quirúrgico Blanco EN 455 (Alta sensibilidad táctil para microscopía y biología)'
  };
  latexBox.userData = { isInteractive: true, safetyHit: latexHit };
  whiteGlovePeek.userData = { isInteractive: true, safetyHit: latexHit };
  latexBoxGroup.add(latexBox);
  gloveDispenserRack.add(latexBoxGroup);
  interactiveList.push({ mesh: latexBox, hit: latexHit });

  stationGroup.add(gloveDispenserRack);

  // =========================================================================
  // 5. ACCESORIOS: DISPENSADOR AUTOMÁTICO DE GEL Y ESPEJO DE SEGURIDAD
  // =========================================================================
  // Dispensador mural touchless de gel hidroalcohólico / clorhexidina
  const dispenser = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.26, 0.1), cleanroomWhiteMat);
  dispenser.position.set(-0.68, 1.35, 0.18);
  stationGroup.add(dispenser);

  const levelWindow = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.14, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2 })
  );
  levelWindow.position.set(-0.68, 1.35, 0.235);
  stationGroup.add(levelWindow);

  const nozzleTip = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 10), aluminumTrimMat);
  nozzleTip.position.set(-0.68, 1.21, 0.2);
  stationGroup.add(nozzleTip);

  // Espejo de comprobación de EPP de acero inoxidable pulido especular
  const mirrorGroup = new THREE.Group();
  mirrorGroup.name = 'SafetyInspectionMirror';
  mirrorGroup.position.set(-0.34, 1.68, -0.19);

  const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.58, 0.02), aluminumTrimMat);
  mirrorGroup.add(mirrorFrame);

  const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.55), mirrorMat);
  mirrorGlass.position.z = 0.012;
  mirrorGroup.add(mirrorGlass);
  stationGroup.add(mirrorGroup);

  // =========================================================================
  // 6. RÓTULOS Y SEÑALIZACIÓN REGLAMENTARIA DEL VESTIDOR
  // =========================================================================
  // Rótulo mural superior ISO "ESTACIÓN DE BIOSEGURIDAD"
  const headerSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.36, 0.44),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('ppe_station_sign') })
  );
  headerSign.position.set(0, 2.45, 0.02);
  stationGroup.add(headerSign);

  // Cuadro didáctico de Protocolo de Colocación (Donning/Doffing)
  const protocolSign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.55),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('donning_protocol_sign') })
  );
  protocolSign.position.set(0.34, 0.46, -0.19);
  stationGroup.add(protocolSign);

  return stationGroup;
}

/**
 * Construye el Extintor de Incendios CO2 / Polvo ABC Montado en Pedestal / Pared
 * Conforme a la norma UNE-EN 3 / NFPA 10, con etiqueta serigrafiada de método PASS,
 * manómetro analógico, tobera criogénica cónica y pasador con precinto.
 */
export function buildFireExtinguisherStation(
  interactiveList: { mesh: THREE.Object3D; hit: SafetyInteractiveHit }[]
): THREE.Group {
  const stationGroup = new THREE.Group();
  stationGroup.name = 'FireExtinguisherStation';

  // Materiales
  const fireRedMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626, // Rojo fuego RAL 3000
    roughness: 0.22,
    metalness: 0.35
  });
  const blackSteelMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.75,
    metalness: 0.3
  });
  const brassValveMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.9,
    roughness: 0.2
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.95,
    roughness: 0.15
  });

  // =========================================================================
  // 1. CILINDRO DE ACERO SIN SOLDADURA (5 KG CO2 PRESURIZADO)
  // =========================================================================
  const cylinderGroup = new THREE.Group();
  cylinderGroup.name = 'ExtinguisherBody';

  const mainCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.086, 0.086, 0.46, 24), fireRedMat);
  mainCylinder.position.y = 0.25;
  cylinderGroup.add(mainCylinder);

  const topDome = new THREE.Mesh(new THREE.SphereGeometry(0.086, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), fireRedMat);
  topDome.position.y = 0.48;
  cylinderGroup.add(topDome);

  const bottomRing = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.084, 0.04, 24), blackSteelMat);
  bottomRing.position.y = 0.02;
  cylinderGroup.add(bottomRing);

  // Etiqueta técnica serigrafiada envolvente (Instrucciones PASS y rombo NFPA)
  const labelGeometry = new THREE.CylinderGeometry(0.0865, 0.0865, 0.36, 24, 1, true, -Math.PI * 0.4, Math.PI * 0.8);
  const labelMat = new THREE.MeshBasicMaterial({
    map: createSafetyTexture('extinguisher_label'),
    side: THREE.DoubleSide
  });
  const silkscreenLabel = new THREE.Mesh(labelGeometry, labelMat);
  silkscreenLabel.position.y = 0.24;
  cylinderGroup.add(silkscreenLabel);

  // =========================================================================
  // 2. VÁLVULA DE LATÓN FORJADO, MANÓMETRO Y PALANCAS PASS
  // =========================================================================
  const valveNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.06, 16), brassValveMat);
  valveNeck.position.y = 0.58;
  cylinderGroup.add(valveNeck);

  // Manómetro analógico de presión (con escala rojo-verde-rojo)
  const pressureGauge = new THREE.Mesh(
    new THREE.CircleGeometry(0.016, 16),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('pressure_gauge_dial') })
  );
  pressureGauge.position.set(0, 0.585, 0.038);
  pressureGauge.rotation.x = -0.1;
  cylinderGroup.add(pressureGauge);

  const gaugeBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 16), brassValveMat);
  gaugeBezel.rotation.x = Math.PI / 2;
  gaugeBezel.position.set(0, 0.585, 0.03);
  cylinderGroup.add(gaugeBezel);

  // Palanca fija de transporte (Carry Handle)
  const carryHandle = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.012, 0.1), blackSteelMat);
  carryHandle.position.set(0, 0.61, -0.025);
  cylinderGroup.add(carryHandle);

  // Palanca móvil de descarga (Squeeze Trigger)
  const squeezeLever = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.095), blackSteelMat);
  squeezeLever.position.set(0, 0.635, -0.025);
  squeezeLever.rotation.x = 0.18;
  cylinderGroup.add(squeezeLever);

  // Pasador de seguridad con precinto plástico amarillo
  const pullPin = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.003, 8, 16), chromeMat);
  pullPin.position.set(0.028, 0.6, 0.01);
  cylinderGroup.add(pullPin);

  const tamperSeal = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.018, 0.006),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 })
  );
  tamperSeal.position.set(0.028, 0.58, 0.01);
  cylinderGroup.add(tamperSeal);

  // =========================================================================
  // 3. MANGUERA REFORZADA Y TOBERA CÓNICA CRIOGÉNICA DE CO2
  // =========================================================================
  const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.42, 12), blackSteelMat);
  hose.position.set(0.1, 0.38, 0.02);
  cylinderGroup.add(hose);

  // Trompeta / tobera difusora cónica en polímero negro aislante
  const dischargeHorn = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 20, 1, true), blackSteelMat);
  dischargeHorn.rotation.z = Math.PI;
  dischargeHorn.position.set(0.1, 0.14, 0.02);
  cylinderGroup.add(dischargeHorn);

  const hornGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.06, 14), blackSteelMat);
  hornGrip.position.set(0.1, 0.22, 0.02);
  cylinderGroup.add(hornGrip);

  // Soporte mural / pedestal de acero
  const wallBracket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.035), blackSteelMat);
  wallBracket.position.set(0, 0.35, -0.095);
  cylinderGroup.add(wallBracket);

  const safetyStrap = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.008, 8, 24, Math.PI), chromeMat);
  safetyStrap.position.set(0, 0.32, 0);
  cylinderGroup.add(safetyStrap);

  // Marcar como interactivo
  const extHit: SafetyInteractiveHit = {
    type: 'fire_extinguisher',
    subItem: 'extinguisher_pin',
    label: 'Extintor CO₂ 5 kg (Regla PASS · Sofoca solventes químicos y fuegos eléctricos sin dejar residuo)'
  };
  mainCylinder.userData = { isInteractive: true, safetyHit: extHit };
  squeezeLever.userData = { isInteractive: true, safetyHit: extHit };
  dischargeHorn.userData = { isInteractive: true, safetyHit: extHit };
  pullPin.userData = { isInteractive: true, safetyHit: extHit };

  const extHitProxy = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.75, 0.35),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  extHitProxy.position.y = 0.35;
  extHitProxy.userData = { isInteractive: true, safetyHit: extHit };
  cylinderGroup.add(extHitProxy);

  interactiveList.push({ mesh: mainCylinder, hit: extHit });
  interactiveList.push({ mesh: extHitProxy, hit: extHit });
  stationGroup.add(cylinderGroup);

  // =========================================================================
  // 4. SEÑAL FOTOLUMINISCENTE MURAL ISO 7010
  // =========================================================================
  const signMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.52),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('iso_extinguisher') })
  );
  signMesh.position.set(0, 1.02, -0.09);
  stationGroup.add(signMesh);

  return stationGroup;
}

/**
 * Genera la señalética mural, pictogramas de seguridad SGA/GHS y franjas perimetrales
 */
export function buildSafetyEnvironmentSignage(): THREE.Group {
  const signageGroup = new THREE.Group();
  signageGroup.name = 'SafetyEnvironmentSignage';

  // 1. Pictogramas SGA en las esquinas superiores del pizarrón de Química (sin colisión con letrero)
  const ghsCorrosive = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.36),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('ghs_corrosive'), transparent: true, depthWrite: false })
  );
  ghsCorrosive.position.set(-1.80, 2.74, -2.296);
  signageGroup.add(ghsCorrosive);

  const ghsToxic = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.36),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('ghs_toxic'), transparent: true, depthWrite: false })
  );
  ghsToxic.position.set(1.80, 2.74, -2.296);
  signageGroup.add(ghsToxic);

  // 2. Pictograma de Riesgo Biológico en la esquina superior izquierda del pizarrón del Salón de Biología (x = -12.0)
  const biohazardSign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.38),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('ghs_biohazard'), transparent: true, depthWrite: false })
  );
  biohazardSign.position.set(-13.80, 2.74, -2.296);
  signageGroup.add(biohazardSign);

  // 3. Pictograma Inflamable en la esquina superior derecha del pizarrón del Salón STEAM (x = +12.0)
  const flammableSign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.36),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('ghs_flammable'), transparent: true, depthWrite: false })
  );
  flammableSign.position.set(13.80, 2.74, -2.296);
  signageGroup.add(flammableSign);

  // 4. Salida de Emergencia superior (ISO 7010) sobre las puertas automáticas principales (Pared Sur Z = 9.92)
  const exitSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.42),
    new THREE.MeshBasicMaterial({ map: createSafetyTexture('iso_emergency_exit') })
  );
  exitSign.position.set(0, 2.50, 9.92);
  exitSign.rotation.y = Math.PI; // Orientado hacia el interior del laboratorio (-Z)
  signageGroup.add(exitSign);

  // Marco perimetral estanco de la salida de emergencia
  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(1.08, 0.48, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 })
  );
  doorFrame.position.set(0, 2.50, 9.94);
  signageGroup.add(doorFrame);

  // 5. Franjas de suelo perimetrales amarillas y negras en cada uno de los 3 salones
  const stripeTex = createSafetyTexture('safety_stripes');

  // Franja perímetro Mesa Central Química (4.4m x 2.6m en Salón 1: x = 0)
  const chemBorder = new THREE.Mesh(
    new THREE.RingGeometry(2.3, 2.45, 4),
    new THREE.MeshBasicMaterial({ map: stripeTex, side: THREE.DoubleSide })
  );
  chemBorder.rotation.x = -Math.PI / 2;
  chemBorder.rotation.z = Math.PI / 4;
  chemBorder.position.set(0, -1.545, 0.15);
  signageGroup.add(chemBorder);

  // Franja perímetro Mesa Biología (4.0m x 2.5m en Salón 2: x = -12.0)
  const bioBorder = new THREE.Mesh(
    new THREE.RingGeometry(2.05, 2.2, 4),
    new THREE.MeshBasicMaterial({ map: stripeTex, side: THREE.DoubleSide })
  );
  bioBorder.rotation.x = -Math.PI / 2;
  bioBorder.rotation.z = Math.PI / 4;
  bioBorder.position.set(-12.0, -1.545, 0.15);
  signageGroup.add(bioBorder);

  // Franja perímetro Mesa STEAM (4.0m x 2.5m en Salón 3: x = +12.0)
  const steamBorder = new THREE.Mesh(
    new THREE.RingGeometry(2.05, 2.2, 4),
    new THREE.MeshBasicMaterial({ map: stripeTex, side: THREE.DoubleSide })
  );
  steamBorder.rotation.x = -Math.PI / 2;
  steamBorder.rotation.z = Math.PI / 4;
  steamBorder.position.set(12.0, -1.545, 0.15);
  signageGroup.add(steamBorder);

  return signageGroup;
}

/**
 * Agrupa y posiciona toda la infraestructura reglamentaria de seguridad en el laboratorio 3D
 */
export function buildCompleteLabSafetyInfrastructure(
  interactiveList: { mesh: THREE.Object3D; hit: SafetyInteractiveHit }[]
): THREE.Group {
  const masterGroup = new THREE.Group();
  masterGroup.name = 'CompleteLabSafetyInfrastructure';

  // 1. Ducha de emergencia y lavaojos combinado DENTRO de la cámara SAS de bioseguridad
  // Montada contra la pared oeste de la esclusa al fondo (x = -3.4, z = 12.2), flush sobre el suelo real (Y = -1.55)
  const shower = buildEmergencyShowerAndEyewash(interactiveList);
  shower.position.set(-3.4, -1.55, 12.2);
  shower.rotation.y = Math.PI / 2; // Orientada hacia el interior del SAS
  masterGroup.add(shower);

  // 2. Estación / Vestidor de Bioseguridad y EPP DENTRO de la cámara SAS
  // Montada contra la pared este de la esclusa al fondo (x = 3.4, z = 12.2), apoyada al suelo real (Y = -1.55)
  const ppeStation = buildSafetyPPEStation(interactiveList);
  ppeStation.position.set(3.4, -1.55, 12.2);
  ppeStation.rotation.y = -Math.PI / 2; // Orientada hacia el centro del vestidor
  masterGroup.add(ppeStation);

  // 3. Extintor de incendios CO2 montado en la pared sur junto al vano de las puertas automáticas
  const extinguisher = buildFireExtinguisherStation(interactiveList);
  extinguisher.position.set(-1.65, -0.40, 9.92);
  extinguisher.rotation.y = Math.PI; // Orientado hacia el interior del laboratorio
  masterGroup.add(extinguisher);

  // 4. Señalética mural, pictogramas SGA/GHS y franjas perimetrales de suelo
  const signage = buildSafetyEnvironmentSignage();
  masterGroup.add(signage);

  return masterGroup;
}
