import { explorationStore } from '$lib/exploration/exploration_store.svelte';
import { chemical } from '$lib/science/chemistry/catalog';
import { calculateStrongAcidBase } from '$lib/science/chemistry/acid_base_solver';
import { labSound } from '$lib/audio/lab_sound';
import type { GestureState } from '$lib/input/hand_gestures';
import type { Reagent, BeakerState, TrialRecord, InputMode, LabSession } from '$lib/core/contracts';

export type EducationLevel = 'primaria' | 'secundaria';

export type SteamVisualEffect =
  | 'none'
  | 'chupachups'
  | 'antibubbles'
  | 'ice_convection'
  | 'tea_complex'
  | 'botijo_cooling';

export type MicroscopeObjectivePower = 4 | 10 | 40 | 100;

export type MicroscopeOpticalMode = 'brightfield' | 'darkfield' | 'phase' | 'polarized';

export type MicroscopePartId =
  | 'oculars'
  | 'head'
  | 'arm'
  | 'nosepiece'
  | 'objectives'
  | 'stage'
  | 'slide'
  | 'coarse_knob'
  | 'fine_knob'
  | 'condenser'
  | 'diaphragm'
  | 'illuminator';

export type MicroscopeSpecimenId =
  | 'reactor_live'
  | 'onion_lugol'
  | 'elodea_chloroplasts'
  | 'blood_smear'
  | 'tea_microplastics'
  | 'clay_nacl_crystals';

export interface MicroscopeObjectiveSpec {
  power: MicroscopeObjectivePower;
  totalMagnification: number;
  name: string;
  dinColorName: string;
  dinColorHex: string;
  numericalAperture: number;
  workingDistanceMm: number;
  fieldOfViewUm: number;
  depthOfFieldUm: number;
  parfocalTargetUm: number;
  requiresOil: boolean;
  revolverAngleRad: number;
  description: string;
}

export interface MicroscopePartSpec {
  id: MicroscopePartId;
  code: string;
  name: string;
  system: 'Sistema Óptico' | 'Sistema Mecánico' | 'Sistema de Iluminación';
  spec: string;
  primariaExplain: string;
  secundariaExplain: string;
  interactiveHint: string;
}

export interface MicroscopeSpecimenSpec {
  id: MicroscopeSpecimenId;
  name: string;
  scientificName: string;
  stainOrMedium: string;
  recommendedPower: MicroscopeObjectivePower;
  accentColor: string;
  summary: string;
  structuresVisible: string[];
}

export const MICROSCOPE_OBJECTIVES: Record<MicroscopeObjectivePower, MicroscopeObjectiveSpec> = {
  4: {
    power: 4,
    totalMagnification: 40,
    name: 'Plan Acromático 4x / 0.10 (Rastreo)',
    dinColorName: 'Anillo Rojo DIN',
    dinColorHex: '#ef4444',
    numericalAperture: 0.1,
    workingDistanceMm: 18.0,
    fieldOfViewUm: 4500,
    depthOfFieldUm: 260,
    parfocalTargetUm: 4500,
    requiresOil: false,
    revolverAngleRad: Math.PI / 2,
    description:
      'Objetivo seco de barrido panorámico. Permite ubicar la región de interés en el portaobjetos y enfocar con el tornillo macrométrico sin riesgo de impacto.'
  },
  10: {
    power: 10,
    totalMagnification: 100,
    name: 'Plan Acromático 10x / 0.25 (Bajo Aumento)',
    dinColorName: 'Anillo Amarillo DIN',
    dinColorHex: '#eab308',
    numericalAperture: 0.25,
    workingDistanceMm: 6.5,
    fieldOfViewUm: 1800,
    depthOfFieldUm: 85,
    parfocalTargetUm: 4512,
    requiresOil: false,
    revolverAngleRad: Math.PI,
    description:
      'Objetivo seco intermedio para observar tejidos vegetales completos, redes cristalinas de NaCl, antiburbujas y colonias celulares.'
  },
  40: {
    power: 40,
    totalMagnification: 400,
    name: 'Plan Acromático 40x / 0.65 (Alto Seco · 0.17)',
    dinColorName: 'Anillo Azul Claro DIN',
    dinColorHex: '#38bdf8',
    numericalAperture: 0.65,
    workingDistanceMm: 0.55,
    fieldOfViewUm: 450,
    depthOfFieldUm: 18,
    parfocalTargetUm: 4518,
    requiresOil: false,
    revolverAngleRad: 0,
    description:
      'Objetivo retráctil corregido para cubreobjetos de 0.17 mm. Con distancia de trabajo de 0.55 mm, exige enfocar exclusivamente con el tornillo micrométrico.'
  },
  100: {
    power: 100,
    totalMagnification: 1000,
    name: 'Plan Acromático 100x / 1.25 OIL (Inmersión)',
    dinColorName: 'Anillo Blanco + Negro OIL',
    dinColorHex: '#f8fafc',
    numericalAperture: 1.25,
    workingDistanceMm: 0.14,
    fieldOfViewUm: 180,
    depthOfFieldUm: 6,
    parfocalTargetUm: 4522,
    requiresOil: true,
    revolverAngleRad: (3 * Math.PI) / 2,
    description:
      'Objetivo de inmersión en aceite de cedro sintético (n = 1.515). Elimina la refracción aire-vidrio para alcanzar el límite de difracción de Abbe (~0.22 µm).'
  }
};

export const MICROSCOPE_PARTS: MicroscopePartSpec[] = [
  {
    id: 'oculars',
    code: 'OPT-01',
    name: 'Oculares Binoculares WF10x / 18 mm',
    system: 'Sistema Óptico',
    spec: 'Aumento 10x · Campo FN 18 mm · Dioptrías ±5D',
    primariaExplain:
      'Son los dos visores superiores por donde miramos con ambos ojos. Amplían 10 veces la imagen que sube desde los lentes de abajo.',
    secundariaExplain:
      'Sistema de lentes tipo Huygens/ Ramsden de campo amplio (Wide Field 10x, FN 18 mm) que amplifica la imagen real intermedia proyectada por el objetivo en el plano focal del diafragma ocular.',
    interactiveHint: 'Multiplica ×10 el aumento del objetivo activo e incluye retícula micrométrica calibrada.'
  },
  {
    id: 'head',
    code: 'MEC-02',
    name: 'Cabezal Binocular Siedentopf (30°)',
    system: 'Sistema Mecánico',
    spec: 'Inclinación ergonómica 30° · Giro 360° · IPD 55–75 mm',
    primariaExplain:
      'Es la cabeza inclinada del microscopio que sostiene los dos oculares y se ajusta al ancho de nuestros ojos.',
    secundariaExplain:
      'Cabezal prismático tipo Siedentopf que divide el haz luminoso 50/50 mediante prismas de techo sin alterar la longitud mecánica de tubo (160 mm DIN) al ajustar la distancia interpupilar.',
    interactiveHint: 'Mantiene constante la longitud óptica de 160 mm del estándar DIN.'
  },
  {
    id: 'nosepiece',
    code: 'MEC-03',
    name: 'Revólver Portaobjetivos Cuádruple',
    system: 'Sistema Mecánico',
    spec: 'Rotación con retenes de esfera · Parfocalidad 45 mm',
    primariaExplain:
      'Es la rueda giratoria plateada que hace "¡clic!" al girarla para cambiar entre las 4 lupas de colores.',
    secundariaExplain:
      'Torreta giratoria mecanizada con rodamientos de precisión y paradas de clic que garantiza la alineación coaxial de cada objetivo con el eje óptico del condensador.',
    interactiveHint: 'Haz clic en el revólver 3D o selecciona 4x, 10x, 40x o 100x para girarlo físicamente.'
  },
  {
    id: 'objectives',
    code: 'OPT-04',
    name: 'Objetivos Acromáticos DIN (4x, 10x, 40x, 100x)',
    system: 'Sistema Óptico',
    spec: 'ISO 8578 · NA 0.10 a 1.25 Oil · Tubo 160 mm / 0.17',
    primariaExplain:
      'Son las 4 lentes principales cerca de la muestra: Rojo (4x para buscar), Amarillo (10x), Azul (40x muy cerca) y Blanco (100x con gotita de aceite).',
    secundariaExplain:
      'Conjunto de lentes corregidas para aberración cromática y esférica que determinan la resolución límite según la ecuación de Abbe (d = 0.61·λ / NA) y forman la primera imagen real invertida.',
    interactiveHint: 'Cambia entre 40x, 100x, 400x y 1000x de aumento total.'
  },
  {
    id: 'arm',
    code: 'MEC-05',
    name: 'Brazo o Columna Ergonómica en C',
    system: 'Sistema Mecánico',
    spec: 'Aleación de aluminio fundido · Rigidez estructural axial',
    primariaExplain:
      'Es el cuerpo curvo y resistente del microscopio por donde siempre debemos sujetarlo con una mano al transportarlo.',
    secundariaExplain:
      'Columna vertebral de fundición monolítica que conecta el pie con el cabezal óptico y aloja el sistema de cremallera y piñón de precisión para el desplazamiento vertical de la platina.',
    interactiveHint: 'Aísla vibraciones mecánicas durante observaciones a 400x y 1000x.'
  },
  {
    id: 'stage',
    code: 'MEC-06',
    name: 'Platina Mecánica X-Y con Escala Vernier',
    system: 'Sistema Mecánico',
    spec: '140 × 140 mm · Rango X: 75 mm / Y: 50 mm · Precisión 0.1 mm',
    primariaExplain:
      'Es la mesita negra donde ponemos el vidrio con la muestra. Tiene un agujero en el centro para que pase la luz desde abajo.',
    secundariaExplain:
      'Plataforma anodizada dura de doble capa con mandos coaxiales ortogonales (X-Y) y nonio Vernier de 0.1 mm para barrido sistemático y localización por coordenadas.',
    interactiveHint: 'Usa los controles X-Y para desplazar físicamente el portaobjetos 3D.'
  },
  {
    id: 'slide',
    code: 'OPT-07',
    name: 'Portaobjetos, Cubreobjetos (0.17 mm) y Pinza',
    system: 'Sistema Óptico',
    spec: 'Vidrio borosilicato 76×26×1 mm · Cubreobjetos Nº 1.5 (0.17 mm)',
    primariaExplain:
      'Es la lámina de vidrio transparente con una tapita fina donde colocamos una gota del vaso, una telita de cebolla o una hoja.',
    secundariaExplain:
      'Sustrato óptico con índice de refracción n = 1.515 y cubreobjetos calibrado de 0.17 mm de espesor, crítico para evitar aberración esférica en objetivos de alta apertura numérica (40x y 100x).',
    interactiveHint: 'Cambia entre las 6 preparaciones microscópicas o toma una alícuota en vivo del vaso.'
  },
  {
    id: 'coarse_knob',
    code: 'MEC-08',
    name: 'Tornillo Macrométrico (Enfoque Rápido)',
    system: 'Sistema Mecánico',
    spec: 'Desplazamiento grueso · 2000 µm por revolución',
    primariaExplain:
      'Es la rueda grande de los lados: sube y baja rápido la mesita (platina) para encontrar la muestra cuando usamos el lente rojo (4x).',
    secundariaExplain:
      'Mando coaxial exterior de avance rápido para aproximación focal inicial a bajo aumento (4x y 10x). Prohibido su uso en 40x y 100x por riesgo de fractura del cubreobjetos.',
    interactiveHint: 'Gira el macrométrico para subir o bajar la platina 3D rápidamente.'
  },
  {
    id: 'fine_knob',
    code: 'MEC-09',
    name: 'Tornillo Micrométrico (Enfoque de Precisión)',
    system: 'Sistema Mecánico',
    spec: 'Avance micrométrico · 2 µm por división (200 µm/vuelta)',
    primariaExplain:
      'Es la rueda pequeña del centro: mueve la muestra tan poquito que casi no se nota, pero hace que la imagen borrosa se vea súper nítida.',
    secundariaExplain:
      'Mecanismo planetario reductor sin juego (backlash-free) con tambor graduado cada 2 µm, indispensable para explorar planos ópticos sucesivos dentro de la reducida profundidad de campo de 40x y 100x.',
    interactiveHint: 'Ajusta el micrométrico para lograr el 100% de nitidez óptica en alto aumento.'
  },
  {
    id: 'condenser',
    code: 'OPT-10',
    name: 'Condensador Acromático de Abbe (NA 1.25)',
    system: 'Sistema Óptico',
    spec: 'Doble lente convergente · NA 1.25 · Regulable por piñón',
    primariaExplain:
      'Es un lente escondido debajo de la mesita que junta toda la luz de la lámpara en un rayo brillante justo sobre la muestra.',
    secundariaExplain:
      'Sistema óptico subplatina de dos lentes que concentra el haz del colector sobre el plano del espécimen con un ángulo de apertura capaz de igualar la NA de objetivos de inmersión (1.25).',
    interactiveHint: 'Concentra el cono luminoso para maximizar la resolución según la iluminación de Köhler.'
  },
  {
    id: 'diaphragm',
    code: 'OPT-11',
    name: 'Diafragma Iris de Apertura y Portafiltros',
    system: 'Sistema Óptico',
    spec: 'Apertura variable 2–30 mm · Control de NA efectiva y contraste',
    primariaExplain:
      'Se abre y se cierra como la pupila de nuestro ojo para dejar pasar más o menos luz y ver mejor los bordes transparentes.',
    secundariaExplain:
      'Regula la apertura numérica efectiva del cono de iluminación (óptimo al 70–80% de la NA del objetivo). Cerrarlo incrementa el contraste por difracción y la profundidad de foco a costa de resolución.',
    interactiveHint: 'Ajusta la apertura del diafragma iris para equilibrar contraste y resolución.'
  },
  {
    id: 'illuminator',
    code: 'OPT-12',
    name: 'Iluminador Köhler LED (5700 K) y Base Antivibración',
    system: 'Sistema de Iluminación',
    spec: 'LED 3W Luz Día 5700 K · Lente colectora · Reóstato 0–100%',
    primariaExplain:
      'Es la lámpara brillante en el pie pesado del microscopio que ilumina la muestra desde abajo con un botón para subir o bajar el brillo.',
    secundariaExplain:
      'Fuente emisora de estado sólido a temperatura de color constante (5700 K, sin deriva rojiza al atenuar) acoplada a lente colectora de campo y alojada en base ergonómica de baja resonancia.',
    interactiveHint: 'Enciende/apaga el LED y regula el reóstato o cambia a Campo Oscuro / Fase / Polarizada.'
  }
];

export const MICROSCOPE_SPECIMENS: MicroscopeSpecimenSpec[] = [
  {
    id: 'reactor_live',
    name: 'Alícuota en Vivo del Vaso Central',
    scientificName: 'Reactor Químico SymbioLab (Tiempo Real)',
    stainOrMedium: 'Sincronizado con pH, T (°C) y Caso STEAM activo',
    recommendedPower: 40,
    accentColor: '#10b981',
    summary:
      'Extrae una gota en tiempo real del vaso de precipitados central: observa vesículas de antocianina cambiando de color con el pH actual, movimiento browniano térmico, micelas de antiburbujas, complejos Fe-tanino o cristales de NaCl.',
    structuresVisible: [
      'Vesículas cromóforas sensibles al pH actual del vaso',
      'Microcristales cúbicos de NaCl por neutralización ácido-base',
      'Agitación térmica browniana proporcional a la temperatura (°C)',
      'Coloides de MnO₂ / Tanato férrico / Micelas según experimento STEAM'
    ]
  },
  {
    id: 'onion_lugol',
    name: 'Epidermis de Cebolla (Allium cepa)',
    scientificName: 'Allium cepa · Tejido epidérmico vegetal',
    stainOrMedium: 'Tinción con Solución de Lugol (I₂/KI)',
    recommendedPower: 10,
    accentColor: '#f59e0b',
    summary:
      'Preparación histológica clásica en túnica interna de bulbo de cebolla teñida con yodo-yoduro potásico. Permite distinguir con gran nitidez la arquitectura en ladrillo de las células vegetales.',
    structuresVisible: [
      'Pared celular celulósica rígida de doble contorno',
      'Núcleo celular esférico teñido en ámbar por complejo triyoduro',
      'Nucléolos refringentes intranucleares (visibles a 40x y 100x)',
      'Citoplasma periférico y gran vacuola central hipertónica'
    ]
  },
  {
    id: 'elodea_chloroplasts',
    name: 'Hoja de Elodea (Ciclosis en Vivo)',
    scientificName: 'Elodea canadensis · Parénquima clorofílico',
    stainOrMedium: 'Montaje húmedo en fresco (H₂O a 25 °C)',
    recommendedPower: 40,
    accentColor: '#22c55e',
    summary:
      'Hoja acuática viva de dos capas celulares de espesor. Muestra decenas de cloroplastos verdes desplazándose en corriente circular (ciclosis) impulsados por filamentos de actina y miosina.',
    structuresVisible: [
      'Cloroplastos lenticulares ricos en clorofila a y b (~5 µm)',
      'Corriente de ciclosis citoplasmática perivacuolar en tiempo real',
      'Pared celular con plasmodesmos intercelulares',
      'Región central transparente ocupada por la vacuola'
    ]
  },
  {
    id: 'blood_smear',
    name: 'Frotis Sanguíneo Humano',
    scientificName: 'Homo sapiens · Tejido hematopoyético periférico',
    stainOrMedium: 'Tinción diferencial de Wright-Giemsa',
    recommendedPower: 100,
    accentColor: '#ef4444',
    summary:
      'Extensión monocapa de sangre periférica ideal para practicar el uso del objetivo 100x de inmersión en aceite (n = 1.515) y diferenciar eritrocitos, leucocitos y plaquetas.',
    structuresVisible: [
      'Eritrocitos discos bicóncavos anucleados (7.5 µm) con halo central',
      'Neutrófilos polimorfonucleares con núcleo multilobulado violeta',
      'Linfocitos de núcleo esférico denso y citoplasma basófilo',
      'Plaquetas (trombocitos de 2–3 µm) agrupadas entre hematíes'
    ]
  },
  {
    id: 'tea_microplastics',
    name: 'Microplásticos y Complejos en Té (Caso 3 PDF)',
    scientificName: 'Camellia sinensis + Polímeros de Bolsita Piramidal',
    stainOrMedium: 'Infusión a 95 °C + Cloruro de Hierro(III)',
    recommendedPower: 40,
    accentColor: '#8b5cf6',
    summary:
      'Basado en el Caso 3 de Prolongo & Pinto (RSEQ): permite observar las microfibras poliméricas de nailon/PET liberadas por bolsitas piramidales calientes junto a los agregados negros de tanato férrico.',
    structuresVisible: [
      'Microfibras birrefringentes de nailon y tereftalato de polietileno (PET)',
      'Precipitados octaédricos oscuros de complejo Fe(III)-ácido gálico',
      'Cristales aciculares de polifenoles y catequinas del té',
      'Nanopartículas submicrónicas detectables en Campo Oscuro y Polarizada'
    ]
  },
  {
    id: 'clay_nacl_crystals',
    name: 'Cristales de NaCl y Poros de Botijo (Casos 4 y 5 PDF)',
    scientificName: 'Halita cúbica (NaCl) sobre matriz de arcilla ilita/caolinita',
    stainOrMedium: 'Cristalización evaporativa / Luz Polarizada',
    recommendedPower: 10,
    accentColor: '#38bdf8',
    summary:
      'Relacionado con los Casos 4 y 5 de Prolongo & Pinto: muestra la red microporosa capilar de la cerámica del botijo donde el agua se evapora absorbiendo 44 kJ/mol y los cristales cúbicos de salmuera.',
    structuresVisible: [
      'Cristales cúbicos perfectos de cloruro de sodio (hábito en tolva)',
      'Red de microporos intercomunicados (1–15 µm) de arcilla cocida',
      'Meniscos capilares de evaporación endotérmica en bordes minerales',
      'Birrefringencia mineral en granos de cuarzo y feldespato bajo polarizador'
    ]
  }
];

export interface PourAnimationRequest {
  id: number;
  reagentId: string;
  amountMl: number;
  source: InputMode;
}

export interface VideoChapter {
  timeSec: number;
  durationSec: number;
  title: string;
  caption: string;
  actionType: 'prep' | 'pour_acid' | 'pour_base' | 'neutralize';
  simPh: number;
  simColor: string;
}

export interface LabToolInfo {
  id:
    | 'burette'
    | 'thermometer'
    | 'ph_strips'
    | 'dropper'
    | 'ph_meter'
    | 'test_rack'
    | 'microscope'
    | 'cabinet';
  name: string;
  shortLabel: string;
  icon: string;
  levelBadge: 'Primaria y Secundaria' | 'Ideal Primaria' | 'Precisión Secundaria';
  primariaExplain: string;
  secundariaExplain: string;
  actionLabel: string;
}

export interface CabinetComponentInfo {
  id:
    | 'chupachups_glucose'
    | 'kmno4_reagent'
    | 'antibubble_kit'
    | 'agave_syrup'
    | 'blue_tea_infusion'
    | 'fe3_tannin'
    | 'dyed_ice_block'
    | 'nacl_brine'
    | 'ceramic_botijo';
  name: string;
  formulaOrSpec: string;
  category: 'Reactivos Caseros STEAM' | 'Reactivos Redox y Complejos' | 'Física y Termodinámica';
  shelfIndex: 0 | 1 | 2;
  slotIndex: 0 | 1 | 2;
  colorHex: string;
  icon: string;
  pdfCaseRef: string;
  relatedPresetId: string;
  visualEffect: SteamVisualEffect;
  description: string;
  actionText: string;
}

export const CABINET_COMPONENTS: CabinetComponentInfo[] = [
  // ESTANTE SUPERIOR (0): Reactivos Caseros STEAM (PDF Prolongo & Pinto)
  {
    id: 'chupachups_glucose',
    name: 'Chupa Chups en Agitador',
    formulaOrSpec: 'Glucosa C₆H₁₂O₆ (Reductor)',
    category: 'Reactivos Caseros STEAM',
    shelfIndex: 0,
    slotIndex: 0,
    colorHex: '#ec4899',
    icon: '🍭',
    pdfCaseRef: 'Caso 1 · Reacciones con Chupa Chups',
    relatedPresetId: 'steam-chupachups-redox',
    visualEffect: 'chupachups',
    description:
      'Caramelo con glucosa acoplado a un agitador. Sus grupos aldehído (-CHO) y alcohol (-CHOH-) ceden electrones en medio alcalino reduciendo al permanganato del púrpura (+7) al azul (+5), verde (+6) y amarillo-naranja (+4).',
    actionText: 'Sumergir Chupa Chups y Activar Camaleón Redox'
  },
  {
    id: 'antibubble_kit',
    name: 'Agua Jabonosa + Pajita 3mm',
    formulaOrSpec: 'Tensioactivo Anfifílico (SDS)',
    category: 'Reactivos Caseros STEAM',
    shelfIndex: 0,
    slotIndex: 1,
    colorHex: '#38bdf8',
    icon: '🫧',
    pdfCaseRef: 'Caso 2 · Química de la Antiburbuja',
    relatedPresetId: 'steam-antibubbles-lab',
    visualEffect: 'antibubbles',
    description:
      '1 gota de detergente por 10 mL de agua. Permite inyectar gotas líquidas rodeadas de una película de aire (antiburbujas), análogas a las nanopartículas lipídicas que encapsulan ARNm.',
    actionText: 'Inyectar Antiburbujas Encapsuladas en el Vaso'
  },
  {
    id: 'blue_tea_infusion',
    name: 'Té Azul y Té Negro',
    formulaOrSpec: 'Antocianinas + Ácido Gálico',
    category: 'Reactivos Caseros STEAM',
    shelfIndex: 0,
    slotIndex: 2,
    colorHex: '#6366f1',
    icon: '🍵',
    pdfCaseRef: 'Caso 3 · Experiencias con Té',
    relatedPresetId: 'steam-tea-complexes-redox',
    visualEffect: 'tea_complex',
    description:
      'Infusiones ricas en cromóforos: el té azul actúa como indicador ácido-base natural y el té negro contiene taninos (ácido gálico) que forman complejos negros con Fe³⁺.',
    actionText: 'Preparar Infusión de Té Reactivo en Mesa'
  },

  // ESTANTE MEDIO (1): Reactivos Redox y Complejos
  {
    id: 'kmno4_reagent',
    name: 'Permanganato de Potasio',
    formulaOrSpec: 'KMnO₄(aq) · Mn(+7)',
    category: 'Reactivos Redox y Complejos',
    shelfIndex: 1,
    slotIndex: 0,
    colorHex: '#a855f7',
    icon: '🔮',
    pdfCaseRef: 'Caso 1 · Estados de Oxidación Mn',
    relatedPresetId: 'steam-chupachups-redox',
    visualEffect: 'chupachups',
    description:
      'Oxidante fuerte de color púrpura intenso (MnO₄⁻, estado +7). Al reducirse con glucosa pasa a manganato verde (MnO₄²⁻, +6) y dióxido de manganeso coloidal amarillo-marrón (MnO₂, +4).',
    actionText: 'Añadir Cristales de KMnO₄ al Reactor'
  },
  {
    id: 'fe3_tannin',
    name: 'Cloruro de Hierro(III) + Ditionita',
    formulaOrSpec: 'Fe³⁺(aq) / Na₂S₂O₄',
    category: 'Reactivos Redox y Complejos',
    shelfIndex: 1,
    slotIndex: 1,
    colorHex: '#d97706',
    icon: '🧪',
    pdfCaseRef: 'Caso 3 · Complejos y Redox en Té',
    relatedPresetId: 'steam-tea-complexes-redox',
    visualEffect: 'tea_complex',
    description:
      'Los iones Fe³⁺ reaccionan con el ácido gálico (taninos del té negro) formando un complejo octaédrico de color negro intenso. La ditionita decolora el té de hibisco por reducción.',
    actionText: 'Formar Complejo de Ácido Gálico-Hierro(III)'
  },
  {
    id: 'agave_syrup',
    name: 'Sirope de Agave (Densidad)',
    formulaOrSpec: 'Gradiente ρ > 1.15 g/cm³',
    category: 'Reactivos Redox y Complejos',
    shelfIndex: 1,
    slotIndex: 2,
    colorHex: '#f59e0b',
    icon: '🍯',
    pdfCaseRef: 'Caso 2 · Gradiente para Antiburbujas',
    relatedPresetId: 'steam-antibubbles-lab',
    visualEffect: 'antibubbles',
    description:
      'Aumenta la densidad del fondo del vaso con agua jabonosa para que las antiburbujas queden suspendidas flotando a distintas alturas sin hundirse ni escapar.',
    actionText: 'Crear Gradiente de Densidades con Sirope'
  },

  // ESTANTE INFERIOR (2): Física, Densidad y Termodinámica
  {
    id: 'dyed_ice_block',
    name: 'Cubo de Hielo con Colorante',
    formulaOrSpec: 'H₂O(s) 0 °C · ρ = 0.917 g/cm³',
    category: 'Física y Termodinámica',
    shelfIndex: 2,
    slotIndex: 0,
    colorHex: '#f43f5e',
    icon: '🧊',
    pdfCaseRef: 'Caso 4 · Velocidad de Fusión del Hielo',
    relatedPresetId: 'steam-ice-melting-density',
    visualEffect: 'ice_convection',
    description:
      'Permite visualizar las corrientes de convección al fundirse: en agua pura (0.998 g/cm³) el agua fría se hunde acelerando la fusión; en salmuera queda flotando arriba y funde lento.',
    actionText: 'Colocar Hielo Teñido y Observar Convección'
  },
  {
    id: 'nacl_brine',
    name: 'Salmuera NaCl y Etanol',
    formulaOrSpec: 'Agua Salada vs Etanol (0.791 g/cm³)',
    category: 'Física y Termodinámica',
    shelfIndex: 2,
    slotIndex: 1,
    colorHex: '#06b6d4',
    icon: '🧂',
    pdfCaseRef: 'Caso 4 · Medios de Distinta Densidad',
    relatedPresetId: 'steam-ice-melting-density',
    visualEffect: 'ice_convection',
    description:
      'Compara la fusión del hielo en agua dulce (0.998 g/cm³), agua saturada de sal, aceite de oliva (0.918 g/cm³) y etanol (0.791 g/cm³).',
    actionText: 'Comparar Fusión en Agua Dulce vs Agua con Sal'
  },
  {
    id: 'ceramic_botijo',
    name: 'Botijo Cerámico / Pot-in-Pot',
    formulaOrSpec: 'Arcilla Porosa · ΔHvap = 44 kJ/mol',
    category: 'Física y Termodinámica',
    shelfIndex: 2,
    slotIndex: 2,
    colorHex: '#ea580c',
    icon: '🏺',
    pdfCaseRef: 'Casos 5 y 6 · Botijo y Condensación',
    relatedPresetId: 'steam-botijo-condensation',
    visualEffect: 'botijo_cooling',
    description:
      'Enfriamiento evaporativo a través de arcilla microporosa (-dV/dt = k·a·(Xs - X)) que mantiene alimentos a ~22 °C y 80% H.R., junto al estudio del condensado ácido de calderas.',
    actionText: 'Simular Enfriamiento Evaporativo y Condensado'
  }
];

export const LAB_TOOLS_CATALOG: Record<LabToolInfo['id'], LabToolInfo> = {
  burette: {
    id: 'burette',
    name: 'Bureta Volumétrica de 50 mL en Soporte Universal',
    shortLabel: 'Bureta Graduada (+1 mL)',
    icon: '🧪',
    levelBadge: 'Precisión Secundaria',
    primariaExplain:
      'Es un tubo largo de vidrio con una llavecita roja que deja caer líquido gotita a gotita para no pasarnos al mezclar.',
    secundariaExplain:
      'Instrumento volumétrico calibrado de alta precisión (±0.05 mL) sujeto por pinza doble a un soporte universal metálico. Permite encontrar exactamente el punto de equivalencia estequiométrico.',
    actionLabel: 'Abrir Llave de Paso (+1.0 mL Base)'
  },
  thermometer: {
    id: 'thermometer',
    name: 'Placa Calefactora y Termómetro Digital de Inmersión',
    shortLabel: 'Termómetro / Calefactor',
    icon: '🌡️',
    levelBadge: 'Primaria y Secundaria',
    primariaExplain:
      'Calienta o enfría el vaso y mide su temperatura (desde el hielo y el botijo cerámico a 15 °C hasta 65 °C).',
    secundariaExplain:
      'Controla la temperatura termodinámica del reactor: permite estudiar tanto el enfriamiento evaporativo en cerámica porosa (Caso 5 PDF) como la variación endotérmica de Kw(T).',
    actionLabel: 'Cambiar Temperatura (15°C / 25°C / 45°C / 65°C)'
  },
  ph_strips: {
    id: 'ph_strips',
    name: 'Dispensador de Tiras Reactivas de pH Universal (1–14)',
    shortLabel: 'Tiras de Papel pH',
    icon: '🎗️',
    levelBadge: 'Ideal Primaria',
    primariaExplain:
      '¡Papel mágico de ciencias! Al mojar la punta de una tirita en el vaso, cambia de color al instante para decirnos si es ácido como el limón o alcalino como el jabón.',
    secundariaExplain:
      'Tiras de celulosa impregnadas con indicadores mixtos para determinación colorimétrica rápida en infusiones de té azul, col lombarda y agua de calderas de condensación.',
    actionLabel: 'Sumergir Tira Reactiva de pH'
  },
  dropper: {
    id: 'dropper',
    name: 'Frasco Gotero Ámbar con Pipeta Pasteur (Indicador / Antiburbujas)',
    shortLabel: 'Gotero / Pipeta Pasteur',
    icon: '💧',
    levelBadge: 'Ideal Primaria',
    primariaExplain:
      'Sirve para echar gotas de indicador morado o para disparar gotas de agua jabonosa y formar antiburbujas mágicas dentro del vaso.',
    secundariaExplain:
      'Frasco reactivo de vidrio borosilicato ámbar con pipeta Pasteur de 1–3 mL para dosificar indicadores o inyectar antiburbujas encapsuladas en gradiente de densidad (Caso 2 PDF).',
    actionLabel: 'Dosificar con Pipeta Pasteur'
  },
  ph_meter: {
    id: 'ph_meter',
    name: 'pH-metro Potenciométrico Digital pH-200 PRO',
    shortLabel: 'pH-metro Digital',
    icon: '📟',
    levelBadge: 'Precisión Secundaria',
    primariaExplain:
      'Es una computadora pequeña con un sensor dentro del agua que nos muestra con números grandes el nivel exacto de pH.',
    secundariaExplain:
      'Sensor electroquímico con electrodo combinado de membrana de vidrio sensible a la actividad de iones H₃O⁺ según la ecuación de Nernst.',
    actionLabel: 'Ver Lectura Potenciométrica'
  },
  test_rack: {
    id: 'test_rack',
    name: 'Gradilla Colorimétrica con 5 Tubos de Ensayo Patrón',
    shortLabel: 'Gradilla de Tubos',
    icon: '🔬',
    levelBadge: 'Primaria y Secundaria',
    primariaExplain:
      'Son 5 tubitos ordenados como un arcoíris químico para comparar los colores del té azul, la col morada o el camaleón redox.',
    secundariaExplain:
      'Serie de soluciones patrón para control visual del viraje de antocianinas (Caso 3 PDF) y de los estados de oxidación del manganeso +7, +6, +5 y +4 (Caso 1 PDF).',
    actionLabel: 'Comparar Escala de Colores'
  },
  microscope: {
    id: 'microscope',
    name: 'Microscopio Óptico Compuesto Binocular (4x–100x)',
    shortLabel: 'Microscopio Escolar',
    icon: '🔭',
    levelBadge: 'Primaria y Secundaria',
    primariaExplain:
      'Nos permite ver de cerca los cristales de sal, la película de aire de las antiburbujas y los microporos de la arcilla del botijo.',
    secundariaExplain:
      'Microscopio binocular Siedentopf con objetivos DIN (4x–100x) para observar micelas anfifílicas, microplásticos en bolsitas de té piramidales (Caso 3 PDF) y estructura laminar de arcillas (Caso 5 PDF).',
    actionLabel: 'Inspeccionar Muestra en Microscopio'
  },
  cabinet: {
    id: 'cabinet',
    name: 'Mueble 3D Clasificado de Componentes y Materiales STEAM',
    shortLabel: 'Mueble de Componentes 3D',
    icon: '🗄️',
    levelBadge: 'Primaria y Secundaria',
    primariaExplain:
      '¡Es nuestro armario de ciencias! Aquí están ordenados y con su nombre el Chupa Chups, el jabón para antiburbujas, el té azul, el hielo con colorante y el botijo.',
    secundariaExplain:
      'Estantería modular clasificada en 3 niveles (Reactivos Caseros STEAM, Reactivos Redox/Complejos y Materiales Termodinámicos) para ejecutar los 6 casos experimentales de Prolongo & Pinto (RSEQ).',
    actionLabel: 'Abrir Selector del Mueble de Componentes'
  }
};

export interface HomeExperimentPreset {
  id: string;
  level: EducationLevel;
  gradeRange: string;
  title: string;
  subtitle: string;
  badge: string;
  difficulty: 'Primaria · En Casa y Aula' | 'Secundaria · Laboratorio Analítico';
  durationMin: number;
  summary: string;
  scientificPrinciple: string;
  safetyNote: string;
  steamEffect?: SteamVisualEffect;
  recommendedTools: LabToolInfo['id'][];
  householdMaterials: { name: string; role: string; icon: string }[];
  videoChapters: VideoChapter[];
  interactiveGoals: {
    id: string;
    description: string;
    checkFn: (beaker: BeakerState) => boolean;
  }[];
  quizQuestion: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  acidReagent: Omit<Reagent, 'reagentId' | 'kind'>;
  baseReagent: Omit<Reagent, 'reagentId' | 'kind'>;
}

export const EXPERIMENT_PRESETS: HomeExperimentPreset[] = [
  // ============================================================================
  // BLOQUE PRIMARIA (4 Experimentos: 2 Clásicos + Caso 2 y Caso 4 del PDF STEAM)
  // ============================================================================
  {
    id: 'cabbage-home-lab',
    level: 'primaria',
    gradeRange: 'Primaria (3.° a 6.° Grado)',
    title: 'El Detective de Colores con Col Lombarda',
    subtitle: 'Jugo de Limón vs. Bicarbonato de Cocina',
    badge: 'Primaria · Experimento #1',
    difficulty: 'Primaria · En Casa y Aula',
    durationMin: 10,
    summary:
      'Descubre cómo el extracto de col lombarda actúa como un detector natural de pH gracias a las antocianinas: se vuelve rojo con el limón, verde en agua neutra y azul/violeta con bicarbonato.',
    scientificPrinciple:
      'Las hojas de col lombarda contienen antocianinas hidrosolubles cuyos cromóforos cambian su absorción de luz según la concentración de protones (H⁺).',
    safetyNote:
      '100% seguro con ingredientes de cocina. Usa el Gotero Ámbar y las Tiras de Papel pH en la mesa para explorar cada color.',
    steamEffect: 'none',
    recommendedTools: ['dropper', 'ph_strips', 'test_rack'],
    householdMaterials: [
      { name: '2 hojas de Col Lombarda', role: 'Indicador natural rico en antocianinas', icon: '🥬' },
      { name: 'Jugo de 1 Limón exprimido', role: 'Ácido cítrico natural (pH ~2.2)', icon: '🍋' },
      { name: '1 cdta. de Bicarbonato en agua', role: 'Base suave de cocina (pH ~9.5)', icon: '🥄' },
      { name: 'Tiras de papel pH y Gotero', role: 'Herramientas didácticas en tu mesa 3D', icon: '🎗️' }
    ],
    videoChapters: [
      {
        timeSec: 0,
        durationSec: 5,
        title: '1. Extraer las antocianinas de Col Lombarda',
        caption: 'Hervimos hojas de col lombarda en agua, colamos el extracto y añadimos 3 gotas con el gotero en el vaso central (pH 7.0).',
        actionType: 'prep',
        simPh: 7.0,
        simColor: '#10b981'
      },
      {
        timeSec: 5,
        durationSec: 5,
        title: '2. ¡Prueba Ácida con Jugo de Limón!',
        caption: 'Al verter 15 mL de jugo de limón, los protones H⁺ alteran el cromóforo y el líquido vira a rojo brillante (pH ~2.35).',
        actionType: 'pour_acid',
        simPh: 2.35,
        simColor: '#ef4444'
      },
      {
        timeSec: 10,
        durationSec: 5,
        title: '3. Regreso al Equilibrio con Bicarbonato',
        caption: 'Agregamos bicarbonato disuelto: se desprenden microburbujas de CO₂ y el color regresa al verde neutro (pH 7.0).',
        actionType: 'pour_base',
        simPh: 7.0,
        simColor: '#10b981'
      },
      {
        timeSec: 15,
        durationSec: 5,
        title: '4. Medio Alcalino (Azul y Violeta)',
        caption: 'Con exceso de bicarbonato superamos el punto neutro y la solución brilla en tonos azules y violetas.',
        actionType: 'neutralize',
        simPh: 11.4,
        simColor: '#8b5cf6'
      }
    ],
    interactiveGoals: [
      {
        id: 'goal-1',
        description: 'Vierte al menos 10 mL de Jugo de Limón para virar el vaso a rojo (pH < 3.5).',
        checkFn: (b) => b.acidVolumeMl >= 10 && (b.currentResult?.pH ?? 7) < 3.5
      },
      {
        id: 'goal-2',
        description: 'Agrega Bicarbonato de Sodio para subir el pH por encima de 6.0.',
        checkFn: (b) => b.acidVolumeMl >= 10 && b.baseVolumeMl >= 10 && (b.currentResult?.pH ?? 0) >= 6.0
      },
      {
        id: 'goal-3',
        description: 'Lleva tu mezcla al color azul/morado (pH > 10.5) añadiendo más Bicarbonato.',
        checkFn: (b) => (b.currentResult?.pH ?? 0) > 10.5
      }
    ],
    quizQuestion: {
      question: '¿Qué pigmentos hidrosolubles de la col lombarda y del té azul cambian de color según el pH?',
      options: [
        'Las antocianinas (o antocianos)',
        'El cloruro de sodio',
        'El aceite de oliva'
      ],
      correctIndex: 0,
      explanation:
        '¡Correcto! Como explican Prolongo y Pinto en el documento STEAM, las antocianinas alteran su absorción de luz según la concentración de protones H⁺.'
    },
    acidReagent: {
      chemicalId: 'citric',
      name: 'Jugo de Limón Casero',
      formula: 'Ác. Cítrico',
      concentrationMolPerL: 0.02,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#f43f5e',
      hazardNotice: 'Nivel Primaria: Ingrediente doméstico seguro.'
    },
    baseReagent: {
      chemicalId: 'bicarbonate',
      name: 'Bicarbonato en Agua',
      formula: 'NaHCO₃ (ac)',
      concentrationMolPerL: 0.02,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#06b6d4',
      hazardNotice: 'Nivel Primaria: Ingrediente de cocina inocuo.'
    }
  },
  {
    id: 'steam-antibubbles-lab',
    level: 'primaria',
    gradeRange: 'Primaria y ESO · Caso 2 PDF Scientix',
    title: 'Química de la Antiburbuja y Encapsulación',
    subtitle: 'Agua Jabonosa + Sirope de Agave (Analogía Vacunas ARNm)',
    badge: 'Caso 2 PDF · STEAM',
    difficulty: 'Primaria · En Casa y Aula',
    durationMin: 12,
    summary:
      'Crea antiburbujas reales en el vaso 3D: gotas de líquido jabonoso coloreado rodeadas por una finísima capa de aire que flotan a distintas alturas gracias a un gradiente de densidad con sirope de agave.',
    scientificPrinciple:
      'Una antiburbuja es lo opuesto a una pompa de jabón: es una gota de solución jabonosa rodeada por una película de aire dentro del líquido. Las moléculas anfifílicas del detergente (cabeza hidrófila polar + cola hidrófoba apolar) se orientan igual que las nanopartículas lipídicas que encapsulan el ARNm en las vacunas.',
    safetyNote:
      'Experimento oficial del PDF (Caso 2). Haz clic en el Kit de Antiburbujas o Sirope de Agave del Mueble 3D para encapsular gotas en el vaso.',
    steamEffect: 'antibubbles',
    recommendedTools: ['cabinet', 'dropper', 'microscope'],
    householdMaterials: [
      { name: 'Agua + Detergente (1 gota/10 mL)', role: 'Moléculas anfifílicas (cabeza polar y cola apolar)', icon: '🫧' },
      { name: 'Pajita de 3-4 mm o Pipeta 1-3 mL', role: 'Inyector de gotas para arrastrar la capa de aire', icon: '🥤' },
      { name: 'Colorante, Cúrcuma o Col Lombarda', role: 'Sustancia encapsulada dentro de la antiburbuja', icon: '🎨' },
      { name: 'Sirope de Agave en el fondo', role: 'Crea un gradiente de densidades en el vaso', icon: '🍯' }
    ],
    videoChapters: [
      {
        timeSec: 0,
        durationSec: 5,
        title: '1. Preparar Disolución Jabonosa y Sirope de Agave',
        caption: 'Mezclamos 1 gota de detergente por cada 10 mL de agua y añadimos sirope de agave al fondo para crear un gradiente de densidad.',
        actionType: 'prep',
        simPh: 7.2,
        simColor: '#38bdf8'
      },
      {
        timeSec: 5,
        durationSec: 5,
        title: '2. Sumergir Pajita (2-3 cm) y Disparar Gota',
        caption: 'Tomamos solución jabonosa con colorante en la pipeta y la inyectamos: la fina capa de aire rodea la gota formando la antiburbuja.',
        actionType: 'pour_acid',
        simPh: 6.5,
        simColor: '#06b6d4'
      },
      {
        timeSec: 10,
        durationSec: 5,
        title: '3. Flotación en el Gradiente y Analogía con ARNm',
        caption: 'La capa de aire reduce la densidad promedio de la gota y las antiburbujas quedan suspendidas a distintas alturas como nanopartículas lipídicas.',
        actionType: 'pour_base',
        simPh: 7.4,
        simColor: '#10b981'
      }
    ],
    interactiveGoals: [
      {
        id: 'goal-ab1',
        description: 'Vierte al menos 10 mL de Disolución A (Agua jabonosa con colorante) en el vaso.',
        checkFn: (b) => b.acidVolumeMl >= 10
      },
      {
        id: 'goal-ab2',
        description: 'Añade 10 mL de Sirope de Agave / Disolución B para estabilizar el gradiente de densidad.',
        checkFn: (b) => b.acidVolumeMl >= 10 && b.baseVolumeMl >= 10
      }
    ],
    quizQuestion: {
      question: 'Según el Caso 2 de Prolongo y Pinto, ¿qué es exactamente una antiburbuja y con qué nanotecnología médica se compara?',
      options: [
        'Una gota de líquido jabonoso rodeada por una fina capa de aire, análoga a las nanopartículas lipídicas que encapsulan el ARNm de las vacunas',
        'Una burbuja rellena de gas helio que explota con el calor',
        'Un cristal sólido de cloruro de sodio'
      ],
      correctIndex: 0,
      explanation:
        '¡Exacto! La disposición de la cabeza hidrófila y la cadena hidrófoba del tensioactivo en la antiburbuja es análoga a las nanopartículas lipídicas que protegen y transportan el ARNm.'
    },
    acidReagent: {
      chemicalId: 'citric',
      name: 'Disolución A (Jabón + Colorante)',
      formula: 'Tensioactivo A',
      concentrationMolPerL: 0.01,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#06b6d4',
      hazardNotice: 'Caso 2 PDF: Solución anfifílica para encapsular.'
    },
    baseReagent: {
      chemicalId: 'bicarbonate',
      name: 'Disolución B (Sirope + Jabón)',
      formula: 'Gradiente Agave',
      concentrationMolPerL: 0.01,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#f59e0b',
      hazardNotice: 'Caso 2 PDF: Gradiente de densidad con sirope de agave.'
    }
  },
  {
    id: 'steam-ice-melting-density',
    level: 'primaria',
    gradeRange: 'Primaria y ESO · Caso 4 PDF Scientix',
    title: 'Velocidad de Fusión del Hielo y Convección',
    subtitle: '¿Dónde funde antes un cubito de hielo: en agua pura o en agua con sal?',
    badge: 'Caso 4 PDF · STEAM',
    difficulty: 'Primaria · En Casa y Aula',
    durationMin: 10,
    summary:
      'Pon a prueba tu intuición científica con el Caso 4 del PDF: observa con un cubito de hielo teñido de rojo por qué el hielo se derrite mucho más rápido en agua dulce que en agua saturada de sal, y qué ocurre en aceite o etanol.',
    scientificPrinciple:
      'En agua pura (ρ = 0.998 g/cm³), el agua fría derretida del hielo es más densa y se hunde al fondo, creando corrientes de convección que aceleran la fusión. En agua saturada con sal (mayor densidad), el agua dulce fría derretida es menos densa que la salmuera y queda flotando arriba como una capa aislante fría.',
    safetyNote:
      'Experimento oficial del PDF (Caso 4). Usa el Cubo de Hielo Teñido del Mueble 3D para observar las plumas rojas de convección.',
    steamEffect: 'ice_convection',
    recommendedTools: ['cabinet', 'thermometer', 'test_rack'],
    householdMaterials: [
      { name: 'Cubito de Hielo con colorante rojo', role: 'Hielo a 0 °C (ρ = 0.917 g/cm³) para trazar corrientes', icon: '🧊' },
      { name: 'Vaso con Agua Pura (20 °C)', role: 'Densidad 0.998 g/cm³ (convección activa)', icon: '💧' },
      { name: 'Vaso con Agua Saturada de Sal', role: 'Salmuera densa (estratificación sin convección)', icon: '🧂' },
      { name: 'Aceite (0.918) y Etanol (0.791)', role: 'Líquidos para comparar flotabilidad del hielo', icon: '🍾' }
    ],
    videoChapters: [
      {
        timeSec: 0,
        durationSec: 5,
        title: '1. Colocar Hielo Teñido en Agua Pura vs Agua con Sal',
        caption: 'Colocamos un cubito de hielo rojo (0.917 g/cm³) en el vaso. En agua pura, el hilo rojo de agua fría desciende directo hasta el fondo.',
        actionType: 'prep',
        simPh: 7.0,
        simColor: '#38bdf8'
      },
      {
        timeSec: 5,
        durationSec: 5,
        title: '2. Corrientes de Convección vs Capa Aislante en Salmuera',
        caption: 'En agua con sal, el agua derretida (dulce) no puede hundirse porque la salmuera es más densa: queda atrapada arriba en una piscina roja fría.',
        actionType: 'pour_acid',
        simPh: 6.8,
        simColor: '#ef4444'
      },
      {
        timeSec: 10,
        durationSec: 5,
        title: '3. Hielo en Aceite de Oliva (0.918) y Etanol (0.791)',
        caption: 'En etanol (0.791 g/cm³) el hielo se hunde y salen burbujas de aire; en aceite (0.918 g/cm³) flota y caen gotas esféricas de agua líquida.',
        actionType: 'pour_base',
        simPh: 7.0,
        simColor: '#f59e0b'
      }
    ],
    interactiveGoals: [
      {
        id: 'goal-ice1',
        description: 'Vierte al menos 15 mL del Trazador Rojo de Deshielo (Matraz A) para visualizar la pluma de convección.',
        checkFn: (b) => b.acidVolumeMl >= 15
      },
      {
        id: 'goal-ice2',
        description: 'Añade 15 mL de Disolución Salina NaCl (Matraz B) para observar la estratificación por densidad.',
        checkFn: (b) => b.acidVolumeMl >= 15 && b.baseVolumeMl >= 15
      }
    ],
    quizQuestion: {
      question: '¿Dónde se funde ANTES un cubito de hielo a temperatura ambiente: en un vaso con agua pura o en agua saturada de sal?',
      options: [
        'En agua pura, porque el agua fría derretida se hunde generando corrientes de convección que renuevan el calor',
        'En agua saturada de sal, porque la sal quema el hielo instantáneamente sin necesidad de convección',
        'Tardan exactamente el mismo tiempo al milisegundo'
      ],
      correctIndex: 0,
      explanation:
        '¡Exacto! En agua con sal, el agua dulce fría del deshielo es menos densa que la salmuera y queda retenida en la parte superior enfriando el entorno inmediato del hielo y frenando su fusión.'
    },
    acidReagent: {
      chemicalId: 'hcl',
      name: 'Agua de Deshielo Teñida (0 °C)',
      formula: 'H₂O Trazador',
      concentrationMolPerL: 0.005,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#ef4444',
      hazardNotice: 'Caso 4 PDF: Trazador colorimétrico de convección.'
    },
    baseReagent: {
      chemicalId: 'naoh',
      name: 'Agua Saturada de Sal (Salmuera)',
      formula: 'NaCl(sat)',
      concentrationMolPerL: 0.005,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#38bdf8',
      hazardNotice: 'Caso 4 PDF: Disolución de alta densidad para estratificación.'
    }
  },
  {
    id: 'vinegar-baking-soda',
    level: 'primaria',
    gradeRange: 'Primaria (4.° a 6.° Grado)',
    title: 'El Volcán Espumoso: Vinagre y Bicarbonato',
    subtitle: 'Efervescencia de CO₂ y Equilibrio de pH',
    badge: 'Primaria · Experimento #4',
    difficulty: 'Primaria · En Casa y Aula',
    durationMin: 8,
    summary:
      'Observa cómo el vinagre blanco de cocina y el bicarbonato se neutralizan liberando burbujas de gas dióxido de carbono (CO₂) hasta transformar un líquido ácido en agua neutra.',
    scientificPrinciple:
      'Cuando el ácido acético del vinagre (CH₃COOH) reacciona con el bicarbonato (NaHCO₃), forma acetato de sodio, agua y gas CO₂ que escapa en forma de espuma burbujeante.',
    safetyNote:
      'Experimento casero sin toxicidad. Prueba también las Tiras de Papel pH y el Termómetro de la mesa 3D.',
    steamEffect: 'none',
    recommendedTools: ['ph_strips', 'thermometer', 'test_rack'],
    householdMaterials: [
      { name: 'Vinagre Blanco de cocina', role: 'Líquido ácido para iniciar el volcán', icon: '🍶' },
      { name: 'Bicarbonato de Sodio disuelto', role: 'Base que produce las burbujas y neutraliza', icon: '🥣' },
      { name: 'Agua tibia o fría (50 mL)', role: 'Base líquida en el vaso graduado', icon: '💧' },
      { name: 'Termómetro y Tiras de pH 3D', role: 'Para medir el cambio en la mesa', icon: '🌡️' }
    ],
    videoChapters: [
      {
        timeSec: 0,
        durationSec: 5,
        title: '1. Agua Neutra Inicial (50 mL)',
        caption: 'Empezamos con 50 mL de agua a pH 7.00 (color verde esmeralda) en nuestro vaso de precipitados.',
        actionType: 'prep',
        simPh: 7.0,
        simColor: '#10b981'
      },
      {
        timeSec: 5,
        durationSec: 5,
        title: '2. Agregar 20 mL de Vinagre Blanco',
        caption: 'Vertemos 20 mL de vinagre blanco y el pH baja rápidamente a 2.45 (color rojo ácido).',
        actionType: 'pour_acid',
        simPh: 2.45,
        simColor: '#ef4444'
      },
      {
        timeSec: 10,
        durationSec: 5,
        title: '3. ¡Espuma y Punto Neutro Exacto!',
        caption: 'Al agregar 20 mL de solución de bicarbonato se liberan burbujas y ambos se equilibran en pH 7.00.',
        actionType: 'neutralize',
        simPh: 7.0,
        simColor: '#10b981'
      }
    ],
    interactiveGoals: [
      {
        id: 'goal-v1',
        description: 'Vierte 20 mL de Vinagre Blanco en el vaso central.',
        checkFn: (b) => b.acidVolumeMl >= 20
      },
      {
        id: 'goal-v2',
        description: 'Neutraliza el volcán agregando la misma cantidad (20 mL) de Bicarbonato hasta lograr pH 7.00.',
        checkFn: (b) => b.acidVolumeMl >= 20 && Math.abs((b.currentResult?.pH ?? 0) - 7.0) <= 0.15
      }
    ],
    quizQuestion: {
      question: 'Si pusiste 20 mL de Vinagre, ¿cuántos mL de Bicarbonato de igual concentración necesitas para empatar en pH 7.00?',
      options: [
        'Exactamente 20 mL (relación estequiométrica 1:1)',
        'Solo 1 gotita',
        '200 mL llenando todo el vaso'
      ],
      correctIndex: 0,
      explanation:
        '¡Excelente! Como ambos tienen la misma concentración molar, 20 mL de ácido se equilibran con 20 mL de base.'
    },
    acidReagent: {
      chemicalId: 'acetic',
      name: 'Vinagre Blanco Casero',
      formula: 'CH₃COOH',
      concentrationMolPerL: 0.015,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#f59e0b',
      hazardNotice: 'Nivel Primaria: Ácido doméstico diluido.'
    },
    baseReagent: {
      chemicalId: 'bicarbonate',
      name: 'Solución de Bicarbonato',
      formula: 'NaHCO₃',
      concentrationMolPerL: 0.015,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#3b82f6',
      hazardNotice: 'Nivel Primaria: Base doméstica segura.'
    }
  },

  // ============================================================================
  // BLOQUE SECUNDARIA (4 Experimentos: Caso 1, Caso 3, Caso 5/6 PDF + Titulación P0)
  // ============================================================================
  {
    id: 'steam-chupachups-redox',
    level: 'secundaria',
    gradeRange: 'Secundaria y Bachillerato · Caso 1 PDF Scientix',
    title: 'Reacciones Redox con Chupa Chups (Camaleón Químico)',
    subtitle: 'Reducción de KMnO₄ en medio básico (NaOH) por oxidación de Glucosa',
    badge: 'Caso 1 PDF · STEAM',
    difficulty: 'Secundaria · Laboratorio Analítico',
    durationMin: 15,
    summary:
      'Reproduce el célebre experimento de Marisa Prolongo y Gabriel Pinto: sumerge un Chupa Chups en una disolución alcalina de permanganato de potasio (KMnO₄ + NaOH) y observa la cascada de colores de los estados de oxidación del manganeso (+7 → +5 → +6 → +4).',
    scientificPrinciple:
      'La glucosa del Chupa Chups actúa como agente reductor en medio OH⁻ (-CHO + 3OH⁻ → -COO⁻ + 2H₂O + 2e⁻). El permanganato púrpura MnO₄⁻ (+7) se reduce primero pasando por una etapa azul intermedia (MnO₄³⁻, +5 o mezcla púrpura+verde) hacia manganato verde MnO₄²⁻ (+6): MnO₄⁻(aq) + e⁻ → MnO₄²⁻(aq), y finalmente hasta dióxido de manganeso coloidal amarillo-marrón/naranja MnO₂(s) (+4): MnO₄²⁻ + 2H₂O + 2e⁻ → MnO₂(s) + 4OH⁻.',
    safetyNote:
      'Caso 1 del PDF RSEQ/Scientix. Haz clic en el Chupa Chups o en el frasco de KMnO₄ del Mueble 3D para sumergir el caramelo giratorio en el vaso.',
    steamEffect: 'chupachups',
    recommendedTools: ['cabinet', 'ph_meter', 'test_rack'],
    householdMaterials: [
      { name: 'Chupa Chups (o gominola con glucosa)', role: 'Agente reductor (grupos aldehído y alcohol)', icon: '🍭' },
      { name: 'Cristales de KMnO₄ (Permanganato)', role: 'Agente oxidante con Mn en estado +7 (púrpura)', icon: '🔮' },
      { name: '1 cucharadita de NaOH en 100 mL H₂O', role: 'Medio fuertemente alcalino (aportador de OH⁻)', icon: '⚗️' },
      { name: 'Agitador eléctrico con soporte', role: 'Mantiene el Chupa Chups girando en la solución', icon: '🔄' }
    ],
    videoChapters: [
      {
        timeSec: 0,
        durationSec: 5,
        title: '1. Estado Inicial Púrpura: Permanganato MnO₄⁻ (Mn +7)',
        caption: 'Disolvemos NaOH y una pizca de KMnO₄ en 100 mL de agua: el ion MnO₄⁻ (+7) tiñe la solución de púrpura intenso.',
        actionType: 'prep',
        simPh: 12.6,
        simColor: '#9333ea'
      },
      {
        timeSec: 5,
        durationSec: 5,
        title: '2. Etapa Azul (+5) y Reducción a Manganato Verde MnO₄²⁻ (+6)',
        caption: 'Sumergimos el Chupa Chups: la glucosa cede electrones y el color vira de púrpura a azul (MnO₄³⁻) y luego a verde esmeralda (MnO₄²⁻).',
        actionType: 'pour_base',
        simPh: 11.8,
        simColor: '#10b981'
      },
      {
        timeSec: 10,
        durationSec: 5,
        title: '3. Reducción Final a Dióxido de Manganeso MnO₂ (+4)',
        caption: 'Al seguir incorporando glucosa, el MnO₄²⁻ (+6) se reduce a una suspensión coloidal alcalina de MnO₂ (+4) amarillo-marrón y naranja.',
        actionType: 'pour_acid',
        simPh: 4.5,
        simColor: '#f59e0b'
      }
    ],
    interactiveGoals: [
      {
        id: 'goal-cc1',
        description: 'Alcaliniza el medio añadiendo al menos 20 mL de NaOH + KMnO₄ (Matraz B) para iniciar en púrpura (pH > 11).',
        checkFn: (b) => b.baseVolumeMl >= 20 && (b.currentResult?.pH ?? 7) > 11
      },
      {
        id: 'goal-cc2',
        description: 'Incorpora la solución reductora de Glucosa del Chupa Chups (Matraz A, >= 20 mL) para observar el viraje al verde y amarillo-naranja.',
        checkFn: (b) => b.baseVolumeMl >= 20 && b.acidVolumeMl >= 20
      }
    ],
    quizQuestion: {
      question: 'En la reacción del Chupa Chups con KMnO₄ en medio básico, ¿a qué especies químicas corresponden los colores Púrpura → Verde → Amarillo-Marrón?',
      options: [
        'MnO₄⁻ (Mn +7, púrpura) → MnO₄²⁻ (Mn +6, verde) → MnO₂ coloidal (Mn +4, amarillo-marrón)',
        'Clorofila → Antocianina → Caroteno',
        'Hierro(II) → Hierro(III) → Cobre(II)'
      ],
      correctIndex: 0,
      explanation:
        '¡Exacto! El manganeso presenta múltiples estados de oxidación estables con colores complementarios a la luz absorbida por sus electrones de orbitales d: MnO₄⁻ (+7, púrpura), MnO₄²⁻ (+6, verde) y MnO₂ (+4, amarillo-marrón).'
    },
    acidReagent: {
      chemicalId: 'citric',
      name: 'Glucosa de Chupa Chups (Reductor)',
      formula: 'C₆H₁₂O₆ (ac)',
      concentrationMolPerL: 0.015,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#f59e0b',
      hazardNotice: 'Caso 1 PDF: Agente reductor con grupos aldehído y alcohol.'
    },
    baseReagent: {
      chemicalId: 'naoh',
      name: 'KMnO₄ en NaOH (Medio Básico)',
      formula: 'KMnO₄ + OH⁻',
      concentrationMolPerL: 0.015,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#9333ea',
      hazardNotice: 'Caso 1 PDF: Permanganato potásico en solución alcalina.'
    }
  },
  {
    id: 'steam-tea-complexes-redox',
    level: 'secundaria',
    gradeRange: 'Secundaria · Caso 3 (11) PDF Scientix',
    title: 'Reacciones Químicas con Té: Ácido-Base, Complejos y Redox',
    subtitle: 'Té Azul (Antocianinas), Té Negro (Taninos + Fe³⁺) y Té de Hibisco (Ditionita)',
    badge: 'Caso 3 PDF · STEAM',
    difficulty: 'Secundaria · Laboratorio Analítico',
    durationMin: 14,
    summary:
      'Explora los 4 tipos de reacciones químicas con infusiones de té del documento de Prolongo y Pinto: viraje ácido-base con té azul, formación del complejo negro de ácido gálico con hierro(III) en té negro, decoloración redox del hibisco con ditionita y análisis de bolsitas de té.',
    scientificPrinciple:
      'A) Ácido-Base: Los antocianatos del té azul cambian su conjugación electrónica con [H⁺]. B) Complejos: Los taninos (ácido gálico) del té negro reaccionan con Fe³⁺ formando un complejo de ácido gálico-hierro(III) negro intenso (2 Ác. Gálico + Fe³⁺ + 2H₂O → Complejo + 4H⁺). C) Redox: El té de hibisco se decolora con ditionita (reductor) pero no con percarbonato (oxidante).',
    safetyNote:
      'Caso 3 (11) del PDF RSEQ/Scientix.Selecciona el Té Azul/Negro o el FeCl₃ en el Mueble 3D para observar los complejos.',
    steamEffect: 'tea_complex',
    recommendedTools: ['cabinet', 'ph_strips', 'microscope'],
    householdMaterials: [
      { name: 'Infusión de Té Azul (Clitoria)', role: 'Indicador ácido-base rico en antocianinas', icon: '🍵' },
      { name: 'Té Negro (rico en Taninos)', role: 'Contiene ácido gálico para complejar con Fe³⁺', icon: '☕' },
      { name: 'Disolución de Hierro(III) Fe³⁺', role: 'Forma el complejo negro intenso con los taninos', icon: '🧪' },
      { name: 'Té de Hibisco + Ditionita', role: 'Demuestra el poder oxidante del té frente a un reductor', icon: '🌺' }
    ],
    videoChapters: [
      {
        timeSec: 0,
        durationSec: 5,
        title: '1. Reacción Ácido-Base con Té Azul (Antocianinas)',
        caption: 'El té azul en medio neutro luce azul turquesa (pH 7); al añadir ácido cítrico pasa a púrpura/rojo y en medio básico a verde.',
        actionType: 'prep',
        simPh: 7.0,
        simColor: '#0284c7'
      },
      {
        timeSec: 5,
        durationSec: 5,
        title: '2. Formación de Complejo: Té Negro + Iones Hierro(III)',
        caption: 'Los taninos (ácido gálico) del té negro reaccionan con Fe³⁺ liberando 4H⁺ y formando un complejo de coordinación oscuro.',
        actionType: 'pour_acid',
        simPh: 3.2,
        simColor: '#312e81'
      },
      {
        timeSec: 10,
        durationSec: 5,
        title: '3. Redox en Té de Hibisco y Microplásticos en Bolsitas',
        caption: 'La ditionita (agente reductor) decolora el té de hibisco. Además, en el microscopio comparamos bolsitas de papel filtro vs piramidales plásticas.',
        actionType: 'neutralize',
        simPh: 7.2,
        simColor: '#10b981'
      }
    ],
    interactiveGoals: [
      {
        id: 'goal-tea1',
        description: 'Añade al menos 15 mL del Reactivo Ácido / Fe³⁺ (Matraz A) sobre la infusión de té para observar el cambio electrónico.',
        checkFn: (b) => b.acidVolumeMl >= 15
      },
      {
        id: 'goal-tea2',
        description: 'Agrega 15 mL del Agente Reductor / Alcalino (Matraz B) para restituir el equilibrio en pH neutro.',
        checkFn: (b) => b.acidVolumeMl >= 15 && b.baseVolumeMl >= 15
      }
    ],
    quizQuestion: {
      question: '¿Qué compuesto astringente del té negro reacciona con los iones Hierro(III) (Fe³⁺) formando un complejo de color negro intenso?',
      options: [
        'Los taninos, específicamente el ácido gálico (formando el complejo de ácido gálico con hierro(III))',
        'El cloruro de sodio',
        'El gas metano'
      ],
      correctIndex: 0,
      explanation:
        '¡Correcto! Dos moléculas de ácido gálico (tanino del té negro) se coordinan con un ion Fe³⁺ formando el complejo de ácido gálico-hierro(III) de color negro intenso.'
    },
    acidReagent: {
      chemicalId: 'hcl',
      name: 'Reactivo Fe³⁺ / Ácido Cítrico',
      formula: 'Fe³⁺ / H⁺',
      concentrationMolPerL: 0.015,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#ef4444',
      hazardNotice: 'Caso 3 PDF: Formación de complejo con ácido gálico y protonación.'
    },
    baseReagent: {
      chemicalId: 'bicarbonate',
      name: 'Infusión Alcalina / Ditionita',
      formula: 'Té Azul / S₂O₄²⁻',
      concentrationMolPerL: 0.015,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#3b82f6',
      hazardNotice: 'Caso 3 PDF: Extracto de antocianinas y reductor redox.'
    }
  },
  {
    id: 'chemistry-p0-acid-base',
    level: 'secundaria',
    gradeRange: 'Secundaria (1.° a 5.° Grado)',
    title: 'Titulación Volumétrica con Bureta: HCl + NaOH',
    subtitle: 'Ácido Clorhídrico (0.01 M) + Hidróxido de Sodio (0.01 M)',
    badge: 'Secundaria · Estándar P0',
    difficulty: 'Secundaria · Laboratorio Analítico',
    durationMin: 15,
    summary:
      'Práctica cuantitativa de Secundaria: utiliza los matraces Erlenmeyer y la Bureta Graduada de 50 mL para determinar el punto de equivalencia estequiométrico entre un ácido fuerte y una base fuerte.',
    scientificPrinciple:
      'Resuelve la ecuación cuadrática de electroneutralidad H² - d·H - Kw = 0 donde d = (Ca·Va - Cb·Vb)/Vtotal. En las cercanías del punto de equivalencia (d → 0), una sola gota de la bureta produce un salto abrupto en la curva sigmoidea de pH.',
    safetyNote:
      'Nivel Secundaria: En laboratorio físico requiere bata, guantes de nitrilo y gafas ANSI Z87.1. Usa la Bureta 3D para titular gota a gota (+1 mL).',
    steamEffect: 'none',
    recommendedTools: ['burette', 'ph_meter', 'microscope'],
    householdMaterials: [
      { name: 'Matraz de HCl 0.01 M (100 mL)', role: 'Analito ácido fuerte monoprótico', icon: '🧪' },
      { name: 'Bureta de 50 mL con NaOH 0.01 M', role: 'Titulante básico para adición gota a gota', icon: '⚗️' },
      { name: 'pH-metro Digital pH-200 PRO', role: 'Sensor potenciométrico (±0.01 pH)', icon: '📟' },
      { name: 'Microscopio Óptico en mesa', role: 'Para observar cristales cúbicos de NaCl formado', icon: '🔭' }
    ],
    videoChapters: [
      {
        timeSec: 0,
        durationSec: 5,
        title: '1. Calibración Potenciométrica (pH 7.00)',
        caption: 'Verificamos que el electrodo pH-200 PRO marque 7.00 en 50 mL de agua desionizada a 25.0 °C (Kw = 1.0×10⁻¹⁴).',
        actionType: 'prep',
        simPh: 7.0,
        simColor: '#10b981'
      },
      {
        timeSec: 5,
        durationSec: 5,
        title: '2. Adición de Analito: 25 mL de HCl 0.01 M',
        caption: 'Al verter 25 mL de HCl 0.01 M en 50 mL de agua (Vtotal = 75 mL), [H₃O⁺] = 3.33×10⁻³ M y el pH desciende a 2.48.',
        actionType: 'pour_acid',
        simPh: 2.48,
        simColor: '#ef4444'
      },
      {
        timeSec: 10,
        durationSec: 5,
        title: '3. Titulación Fina con Bureta hasta Equivalencia',
        caption: 'Dosificamos NaOH 0.01 M con la bureta graduada hasta completar 25.0 mL: Ca·Va = Cb·Vb y el pH salta exactamente a 7.00.',
        actionType: 'neutralize',
        simPh: 7.0,
        simColor: '#10b981'
      }
    ],
    interactiveGoals: [
      {
        id: 'goal-s1',
        description: 'Vierte HCl 0.01 M hasta acidificar la solución por debajo de pH 2.60.',
        checkFn: (b) => b.acidVolumeMl >= 15 && (b.currentResult?.pH ?? 7) <= 2.6
      },
      {
        id: 'goal-s2',
        description: 'Usa la Bureta Graduada 3D (+1 mL) o el matraz de NaOH para alcanzar exactamente pH = 7.00 (±0.05).',
        checkFn: (b) => b.acidVolumeMl >= 15 && Math.abs((b.currentResult?.pH ?? 0) - 7.0) <= 0.05
      }
    ],
    quizQuestion: {
      question: 'En una titulación con 25 mL de HCl 0.01 M en 50 mL de agua, ¿cuál es la concentración molar [H⁺] antes de añadir NaOH?',
      options: [
        '[H⁺] = (0.01 M × 25 mL) / 75 mL = 3.33 × 10⁻³ M (pH = 2.48)',
        '[H⁺] = 0.01 M sin importar el agua (pH = 2.00)',
        '[H⁺] = 1.0 × 10⁻⁷ M (pH = 7.00)'
      ],
      correctIndex: 0,
      explanation:
        '¡Exacto! Por factor de dilución, los 0.25 mmol de HCl se distribuyen en un volumen total de 75 mL (50 mL de H₂O + 25 mL de HCl), resultando en 3.33×10⁻³ M y pH = -log(0.00333) = 2.48.'
    },
    acidReagent: {
      chemicalId: 'hcl',
      name: 'Ácido Clorhídrico',
      formula: 'HCl 0.01 M',
      concentrationMolPerL: 0.01,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#ef4444',
      hazardNotice: 'Nivel Secundaria: Ácido fuerte monoprótico (25 °C).'
    },
    baseReagent: {
      chemicalId: 'naoh',
      name: 'Hidróxido de Sodio',
      formula: 'NaOH 0.01 M',
      concentrationMolPerL: 0.01,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#8b5cf6',
      hazardNotice: 'Nivel Secundaria: Base fuerte monovalente (25 °C).'
    }
  },
  {
    id: 'steam-botijo-condensation',
    level: 'secundaria',
    gradeRange: 'Secundaria y Bachillerato · Casos 5 y 6 PDF Scientix',
    title: 'Termodinámica del Botijo (Pot-in-Pot) y Calderas de Condensación',
    subtitle: 'Enfriamiento Evaporativo en Cerámica Porosa y Acidez del Condensado',
    badge: 'Casos 5 y 6 PDF · STEAM',
    difficulty: 'Secundaria · Laboratorio Analítico',
    durationMin: 16,
    summary:
      'Integra los Casos 5 y 6 de Prolongo y Pinto: estudia cómo la evaporación de agua a través de cerámica porosa (botijo y sistema Pot-in-Pot de Mohammed Bah Abba) enfría sin electricidad, y analiza por qué el agua líquida obtenida en una caldera de condensación de gas natural es ácida y ahorra energía.',
    scientificPrinciple:
      'Caso 5: La velocidad de evaporación en el botijo cumple -dV/dt = k·a·(Xs - X), absorbiendo calor latente λw y reduciendo la temperatura interior a ~22 °C (80% H.R.). Caso 6: En una caldera de condensación, el vapor de agua de la combustión de CH₄ y C₂H₆ condensa a H₂O(l) recuperando ~44 kJ/mol adicionales; el agua condensada absorbe CO₂ formando H₂CO₃ y presenta carácter ácido (pH ~3.8–4.5).',
    safetyNote:
      'Casos 5 y 6 del PDF RSEQ/Scientix. Usa el Termómetro 3D (15 °C a 65 °C) y el Botijo Cerámico del Mueble 3D.',
    steamEffect: 'botijo_cooling',
    recommendedTools: ['cabinet', 'thermometer', 'burette'],
    householdMaterials: [
      { name: 'Botijo / Sistema Pot-in-Pot Cerámico', role: 'Arcilla porosa que enfría por evaporación (-λw·dV/dt)', icon: '🏺' },
      { name: 'Agua de Caldera de Condensación', role: 'H₂O(l) con CO₂ disuelto de carácter ácido (pH ~4.0)', icon: '💧' },
      { name: 'Neutralizante Alcalino (NaHCO₃ / NaOH)', role: 'Neutraliza el condensado ácido antes del vertido', icon: '⚗️' },
      { name: 'Termómetro y Placa Térmica 3D', role: 'Simula el ciclo térmico entre 15 °C y 65 °C', icon: '🌡️' }
    ],
    videoChapters: [
      {
        timeSec: 0,
        durationSec: 5,
        title: '1. Enfriamiento Evaporativo en Botijo y Pot-in-Pot (15 °C – 22 °C)',
        caption: 'El agua suda por los poros de la arcilla y se evapora absorbiendo λw = 62.8 kcal/h·m², enfriando el interior hasta ~22 °C y conservando alimentos 9 días.',
        actionType: 'prep',
        simPh: 7.0,
        simColor: '#10b981'
      },
      {
        timeSec: 5,
        durationSec: 5,
        title: '2. Agua Líquida Ácida en Caldera de Condensación (Caso 6)',
        caption: 'Al condensar el vapor H₂O(g) → H₂O(l) de la combustión del gas natural, se recupera el calor latente pero el CO₂ disuelto acidifica el agua (pH ~3.8).',
        actionType: 'pour_acid',
        simPh: 3.8,
        simColor: '#f59e0b'
      },
      {
        timeSec: 10,
        durationSec: 5,
        title: '3. Neutralización del Condensado para Sostenibilidad',
        caption: 'Titulamos el agua ácida de la caldera de condensación con solución alcalina hasta restituir pH 7.00.',
        actionType: 'neutralize',
        simPh: 7.0,
        simColor: '#10b981'
      }
    ],
    interactiveGoals: [
      {
        id: 'goal-bc1',
        description: 'Cambia la temperatura con el Termómetro 3D o añade 15 mL de Agua de Condensación Ácida (Matraz A).',
        checkFn: (b) => b.temperatureC !== 25 || b.acidVolumeMl >= 15
      },
      {
        id: 'goal-bc2',
        description: 'Neutraliza el agua ácida de la caldera de condensación con el Matraz B o la Bureta hasta lograr pH entre 6.5 y 7.5.',
        checkFn: (b) => b.acidVolumeMl >= 10 && b.baseVolumeMl >= 10 && Math.abs((b.currentResult?.pH ?? 0) - 7.0) <= 0.5
      }
    ],
    quizQuestion: {
      question: 'Según los Casos 5 y 6 del documento de Prolongo y Pinto, ¿por qué ahorra energía una caldera de condensación y qué carácter ácido-base tiene el agua condensada?',
      options: [
        'Porque obtiene el agua de combustión en estado líquido recuperando el calor latente de condensación, y el agua es ácida por la disolución de CO₂ y óxidos ácidos',
        'Porque obtiene el agua en forma de hielo sólido a -20 °C y es fuertemente básica (pH 14)',
        'Porque no produce ni agua ni dióxido de carbono al quemar metano'
      ],
      correctIndex: 0,
      explanation:
        '¡Brillante! En las calderas de condensación el agua se obtiene en estado líquido (ΔH°comb mayor en valor absoluto que cuando sale como gas), ahorrando ~10% de combustible, y el condensado es ácido por el CO₂ disuelto.'
    },
    acidReagent: {
      chemicalId: 'hcl',
      name: 'Agua de Caldera de Condensación',
      formula: 'H₂CO₃ / H₂O(l)',
      concentrationMolPerL: 0.01,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#f97316',
      hazardNotice: 'Caso 6 PDF: Condensado ácido de combustión de gas natural.'
    },
    baseReagent: {
      chemicalId: 'naoh',
      name: 'Neutralizador Alcalino de Caldera',
      formula: 'NaHCO₃ / OH⁻',
      concentrationMolPerL: 0.01,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#06b6d4',
      hazardNotice: 'Caso 6 PDF: Solución alcalina para neutralizar condensados.'
    }
  }
];

export class LabStore {
  isExplorationMode = $state(false);
  activePresetId = $state<string>('chemistry-p0-acid-base');
  presetRevision = $state<number>(1);
  educationLevel = $state<EducationLevel>('secundaria');
  soundEnabled = $state<boolean>(true);

  // Efecto visual STEAM en el vaso 3D y componente activo del Mueble 3D Clasificado
  activeSteamEffect = $state<SteamVisualEffect>('none');
  selectedCabinetComponentId = $state<CabinetComponentInfo['id'] | null>(null);
  isCabinetModalOpen = $state<boolean>(false);
  steamEffectRevision = $state<number>(0);

  // Herramientas 3D interactivas del laboratorio ampliado
  inspectedToolId = $state<LabToolInfo['id'] | null>(null);
  lastTestedStripPh = $state<number | null>(null);
  lastTestedStripColor = $state<string>('#fde047');
  indicatorDropsCount = $state<number>(3);
  burettePulseRevision = $state<number>(0);
  dropperPulseRevision = $state<number>(0);
  stripDipRevision = $state<number>(0);

  // Estado completo del Microscopio Óptico Compuesto Binocular 3D (Estación Óptica Interactiva)
  isMicroscopeActive = $state<boolean>(false);
  microscopeObjective = $state<MicroscopeObjectivePower>(10);
  microscopeOpticalMode = $state<MicroscopeOpticalMode>('brightfield');
  microscopeSpecimenId = $state<MicroscopeSpecimenId>('reactor_live');
  microscopeSelectedPartId = $state<MicroscopePartId>('objectives');
  microscopeCoarseUm = $state<number>(4490); // Enfoque macrométrico (rango 3800 – 4700 µm)
  microscopeFineUm = $state<number>(20); // Enfoque micrométrico (rango -150 a +150 µm)
  microscopeStageXUm = $state<number>(0); // Platina mecánica eje X (-1500 a +1500 µm)
  microscopeStageYUm = $state<number>(0); // Platina mecánica eje Y (-1500 a +1500 µm)
  microscopeLampOn = $state<boolean>(true);
  microscopeLampIntensity = $state<number>(0.85); // Reóstato Köhler 0.0 – 1.0
  microscopeDiaphragm = $state<number>(0.72); // Diafragma iris de Abbe 0.10 – 1.0
  microscopeImmersionOilApplied = $state<boolean>(false); // Gota de aceite n = 1.515 para 100x

  reagents = $state<Reagent[]>([
    {
      reagentId: 'hcl',
      chemicalId: 'hcl',
      kind: 'strong_acid',
      name: 'Ácido Clorhídrico',
      formula: 'HCl 0.01 M',
      concentrationMolPerL: 0.01,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#ef4444',
      hazardNotice: 'Ácido fuerte monoprótico idealizado (25 °C).'
    },
    {
      reagentId: 'naoh',
      chemicalId: 'naoh',
      kind: 'strong_base',
      name: 'Hidróxido de Sodio',
      formula: 'NaOH 0.01 M',
      concentrationMolPerL: 0.01,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#8b5cf6',
      hazardNotice: 'Base fuerte monovalente idealizada (25 °C).'
    }
  ]);

  beaker = $state<BeakerState>({
    capacityMl: 250,
    waterMl: 50,
    acidVolumeMl: 0,
    baseVolumeMl: 0,
    temperatureC: 25,
    currentResult: null
  });

  selectedReagentId = $state<string | null>('hcl');
  inputMode = $state<InputMode>('mouse');
  isCameraActive = $state<boolean>(false);
  gestureInput = $state<GestureState | null>(null);
  gestureStatus = $state('Cámara apagada');

  activePourAnim = $state<PourAnimationRequest | null>(null);
  private animCounter = 0;

  session = $state<LabSession>({
    sessionId: `session-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    experimentId: 'chemistry-p0-acid-base',
    hypothesisText: '',
    predictionTrend: '',
    trials: [],
    reflectionText: '',
    status: 'draft'
  });

  // Modales, Pestaña Izquierda y Fichas Contextuales (solo visibles al usar el material)
  isLeftSidebarOpen = $state<boolean>(false);
  isSensorCardVisible = $state<boolean>(false);
  isDosifierCardVisible = $state<boolean>(false);
  isHypothesisModalOpen = $state<boolean>(false);
  isNotebookOpen = $state<boolean>(false);
  isCameraModalOpen = $state<boolean>(false);
  isHomeBookOpen = $state<boolean>(false);
  isCatalogOpen = $state(false);

  constructor() {
    this.recalculate();
  }

  get activePreset(): HomeExperimentPreset {
    return (
      EXPERIMENT_PRESETS.find((p) => p.id === this.activePresetId) ??
      EXPERIMENT_PRESETS.find((p) => p.id === 'chemistry-p0-acid-base') ??
      EXPERIMENT_PRESETS[0]
    );
  }

  get inspectedTool(): LabToolInfo | null {
    return this.inspectedToolId ? LAB_TOOLS_CATALOG[this.inspectedToolId] : null;
  }

  get selectedCabinetComponent(): CabinetComponentInfo | null {
    return (
      CABINET_COMPONENTS.find((c) => c.id === this.selectedCabinetComponentId) ?? null
    );
  }

  get totalVolumeMl(): number {
    if (this.isExplorationMode) return explorationStore.state.volumeMl;
    return Number((this.beaker.waterMl + this.beaker.acidVolumeMl + this.beaker.baseVolumeMl).toFixed(1));
  }

  get availableCapacityMl(): number {
    return Math.max(
      0,
      Number(((this.isExplorationMode ? 240 : this.beaker.capacityMl) - this.totalVolumeMl).toFixed(1))
    );
  }

  get selectedReagent(): Reagent | undefined {
    return this.reagents.find((r) => r.reagentId === this.selectedReagentId);
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    labSound.enabled = this.soundEnabled;
    if (this.soundEnabled) {
      labSound.playInstrumentClick();
    }
  }

  selectReagent(id: string, showPanels = true) {
    this.selectedReagentId = id;
    if (showPanels) {
      this.isDosifierCardVisible = true;
      this.isSensorCardVisible = true;
    }
  }

  /**
   * Selecciona un componente clasificado del Mueble 3D y permite ejecutar su experiencia STEAM
   */
  selectCabinetComponent(componentId: CabinetComponentInfo['id'] | null, equipImmediately = false) {
    this.selectedCabinetComponentId = componentId;
    if (!componentId) return;
    labSound.playInstrumentClick();
    const comp = CABINET_COMPONENTS.find((c) => c.id === componentId);
    if (!comp) return;

    this.activeSteamEffect = comp.visualEffect;
    this.steamEffectRevision += 1;

    if (equipImmediately) {
      this.isExplorationMode = false;
      this.loadExperimentPreset(comp.relatedPresetId);
      this.activeSteamEffect = comp.visualEffect;
      this.selectedCabinetComponentId = componentId;
    }
  }

  inspectTool(toolId: LabToolInfo['id'] | null) {
    this.inspectedToolId = toolId;
    if (toolId === 'ph_meter') {
      this.isSensorCardVisible = true;
    } else if (toolId === 'burette') {
      this.isDosifierCardVisible = true;
      this.isSensorCardVisible = true;
    } else if (toolId === 'cabinet') {
      this.isCabinetModalOpen = true;
    } else if (toolId === 'microscope') {
      this.openMicroscope();
      return;
    }
    if (toolId) {
      labSound.playInstrumentClick();
    }
  }

  get activeMicroscopeObjectiveSpec(): MicroscopeObjectiveSpec {
    return MICROSCOPE_OBJECTIVES[this.microscopeObjective];
  }

  get activeMicroscopeSpecimenSpec(): MicroscopeSpecimenSpec {
    return (
      MICROSCOPE_SPECIMENS.find((s) => s.id === this.microscopeSpecimenId) ??
      MICROSCOPE_SPECIMENS[0]
    );
  }

  get activeMicroscopePartSpec(): MicroscopePartSpec {
    return (
      MICROSCOPE_PARTS.find((p) => p.id === this.microscopeSelectedPartId) ??
      MICROSCOPE_PARTS[0]
    );
  }

  get microscopeTotalStageUm(): number {
    return this.microscopeCoarseUm + this.microscopeFineUm;
  }

  get microscopeFocusErrorUm(): number {
    const target = this.activeMicroscopeObjectiveSpec.parfocalTargetUm;
    return this.microscopeTotalStageUm - target;
  }

  get microscopeBlurPx(): number {
    const spec = this.activeMicroscopeObjectiveSpec;
    const absErr = Math.abs(this.microscopeFocusErrorUm);
    const dof = spec.depthOfFieldUm;
    let focusBlur = Math.max(0, (absErr - dof * 0.25) / (dof * 0.85)) * 4.5;
    if (spec.requiresOil && !this.microscopeImmersionOilApplied) {
      focusBlur += 4.2; // Aberración esférica y reflexión total interna sin aceite n=1.515
    }
    return Math.min(18, Number(focusBlur.toFixed(2)));
  }

  get microscopeFocusQualityPercent(): number {
    const spec = this.activeMicroscopeObjectiveSpec;
    const absErr = Math.abs(this.microscopeFocusErrorUm);
    const raw = Math.max(0, 100 - (absErr / (spec.depthOfFieldUm * 2.2)) * 100);
    const oilPenalty = spec.requiresOil && !this.microscopeImmersionOilApplied ? 45 : 0;
    return Math.max(0, Math.min(100, Math.round(raw - oilPenalty)));
  }

  get microscopeSlideCollisionWarning(): boolean {
    return (
      (this.microscopeObjective === 40 || this.microscopeObjective === 100) &&
      this.microscopeFocusErrorUm > 48
    );
  }

  openMicroscope(partId?: MicroscopePartId) {
    labSound.playInstrumentClick();
    this.isMicroscopeActive = true;
    this.inspectedToolId = 'microscope';
    this.selectedCabinetComponentId = null;
    if (partId) {
      this.microscopeSelectedPartId = partId;
    }
  }

  closeMicroscope() {
    labSound.playInstrumentClick();
    this.isMicroscopeActive = false;
    if (this.inspectedToolId === 'microscope') {
      this.inspectedToolId = null;
    }
  }

  setMicroscopeObjective(power: MicroscopeObjectivePower) {
    labSound.playInstrumentClick();
    this.microscopeObjective = power;
    this.microscopeSelectedPartId = 'objectives';
    // Parfocalidad real DIN (45 mm): al girar el revólver la muestra queda cerca del foco pero requiere ajuste fino en 40x/100x
    const target = MICROSCOPE_OBJECTIVES[power].parfocalTargetUm;
    const currentTotal = this.microscopeCoarseUm + this.microscopeFineUm;
    if (Math.abs(currentTotal - target) > 180) {
      this.microscopeCoarseUm = 4500;
      this.microscopeFineUm = power === 4 ? 0 : power === 10 ? 8 : power === 40 ? 9 : 11;
    }
  }

  cycleMicroscopeObjective() {
    const order: MicroscopeObjectivePower[] = [4, 10, 40, 100];
    const idx = order.indexOf(this.microscopeObjective);
    const next = order[(idx + 1) % order.length];
    this.setMicroscopeObjective(next);
    this.microscopeSelectedPartId = 'nosepiece';
  }

  autoFocusMicroscope() {
    labSound.playInstrumentClick();
    const spec = this.activeMicroscopeObjectiveSpec;
    this.microscopeCoarseUm = 4500;
    this.microscopeFineUm = spec.parfocalTargetUm - 4500;
    if (spec.requiresOil) {
      this.microscopeImmersionOilApplied = true;
    }
    // Ajuste óptimo de diafragma según criterio de Köhler (~75% de NA)
    this.microscopeDiaphragm =
      spec.power === 4 ? 0.45 : spec.power === 10 ? 0.6 : spec.power === 40 ? 0.78 : 0.92;
    this.microscopeLampOn = true;
  }

  adjustCoarseFocus(deltaUm: number) {
    this.microscopeCoarseUm = Math.max(
      3900,
      Math.min(4650, Math.round(this.microscopeCoarseUm + deltaUm))
    );
    this.microscopeSelectedPartId = 'coarse_knob';
  }

  adjustFineFocus(deltaUm: number) {
    this.microscopeFineUm = Math.max(
      -150,
      Math.min(150, Number((this.microscopeFineUm + deltaUm).toFixed(1)))
    );
    this.microscopeSelectedPartId = 'fine_knob';
  }

  moveMicroscopeStage(dxUm: number, dyUm: number) {
    this.microscopeStageXUm = Math.max(
      -1200,
      Math.min(1200, Math.round(this.microscopeStageXUm + dxUm))
    );
    this.microscopeStageYUm = Math.max(
      -1200,
      Math.min(1200, Math.round(this.microscopeStageYUm + dyUm))
    );
    this.microscopeSelectedPartId = 'stage';
  }

  selectMicroscopePart(partId: MicroscopePartId) {
    labSound.playInstrumentClick();
    this.microscopeSelectedPartId = partId;
  }

  selectMicroscopeSpecimen(specimenId: MicroscopeSpecimenId) {
    labSound.playInstrumentClick();
    this.microscopeSpecimenId = specimenId;
    this.microscopeStageXUm = 0;
    this.microscopeStageYUm = 0;
    this.microscopeSelectedPartId = 'slide';
  }

  applyImmersionOil() {
    labSound.playDrop();
    this.microscopeImmersionOilApplied = !this.microscopeImmersionOilApplied;
    this.microscopeSelectedPartId = 'objectives';
  }

  /**
   * Dosifica +1.0 mL desde la Bureta Graduada de 50 mL montada en el Soporte Universal 3D
   */
  doseFromBurette(amountMl = 1.0) {
    labSound.playDrop();
    this.burettePulseRevision += 1;
    return this.pour('naoh', amountMl, this.inputMode);
  }

  /**
   * Cambia la temperatura (15 °C enfriamiento cerámico -> 25 °C -> 45 °C -> 65 °C)
   */
  cycleTemperature() {
    labSound.playInstrumentClick();
    if (this.beaker.temperatureC < 22) {
      this.beaker.temperatureC = 25;
    } else if (this.beaker.temperatureC < 40) {
      this.beaker.temperatureC = 45;
    } else if (this.beaker.temperatureC < 60) {
      this.beaker.temperatureC = 65;
    } else {
      this.beaker.temperatureC = 16;
    }
    this.recalculate();
    this.isSensorCardVisible = true;
  }

  setTemperature(tempC: number) {
    this.beaker.temperatureC = Math.max(10, Math.min(85, tempC));
    this.recalculate();
    this.isSensorCardVisible = true;
  }

  /**
   * Sumerge una tira reactiva de papel pH en el vaso y actualiza su color
   */
  dipPhPaperStrip() {
    labSound.playInstrumentClick();
    this.stripDipRevision += 1;
    if (this.isExplorationMode) {
      this.lastTestedStripPh = explorationStore.result.pH ?? 7.0;
      this.lastTestedStripColor = explorationStore.result.color;
    } else if (this.beaker.currentResult) {
      this.lastTestedStripPh = this.beaker.currentResult.pH;
      this.lastTestedStripColor = this.beaker.currentResult.indicatorBand.colorHex;
    }
  }

  /**
   * Añade una gota o antiburbuja desde el Frasco Gotero Ámbar con Pipeta Pasteur
   */
  squeezeIndicatorDropper() {
    labSound.playDrop();
    this.indicatorDropsCount += 1;
    this.dropperPulseRevision += 1;
  }

  /**
   * Equipa el laboratorio con el experimento de Primaria o Secundaria elegido en el Libro o Mueble 3D
   */
  loadExperimentPreset(presetId: string) {
    const preset = EXPERIMENT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    this.activePresetId = preset.id;
    this.educationLevel = preset.level;
    this.activeSteamEffect = preset.steamEffect ?? 'none';
    this.steamEffectRevision += 1;
    this.reagents = [
      {
        reagentId: 'hcl',
        kind: 'strong_acid',
        ...preset.acidReagent
      },
      {
        reagentId: 'naoh',
        kind: 'strong_base',
        ...preset.baseReagent
      }
    ];
    this.beaker.waterMl = 50;
    this.beaker.acidVolumeMl = 0;
    this.beaker.baseVolumeMl = 0;
    this.beaker.temperatureC =
      preset.id === 'steam-botijo-condensation'
        ? 18
        : preset.id === 'steam-ice-melting-density'
          ? 15
          : 25;
    this.activePourAnim = null;
    this.lastTestedStripPh = null;
    this.session.experimentId = preset.id;
    this.presetRevision += 1;
    this.recalculate();
    this.isSensorCardVisible = false;
    this.isDosifierCardVisible = false;
    this.inspectedToolId = null;
    this.isHomeBookOpen = false;
    this.isCabinetModalOpen = false;
  }

  recalculate() {
    if (this.isExplorationMode) return;
    const acidReagent = this.reagents.find((r) => r.kind === 'strong_acid')!;
    const baseReagent = this.reagents.find((r) => r.kind === 'strong_base')!;

    this.beaker.currentResult = calculateStrongAcidBase({
      acidVolumeMl: this.beaker.acidVolumeMl,
      baseVolumeMl: this.beaker.baseVolumeMl,
      waterMl: this.beaker.waterMl,
      acidConcentrationMolPerL: acidReagent.concentrationMolPerL,
      baseConcentrationMolPerL: baseReagent.concentrationMolPerL,
      temperatureC: this.beaker.temperatureC
    });
  }

  triggerAnimatedPour(reagentId: string, requestedMl: number, source: InputMode = this.inputMode) {
    const reagent = this.reagents.find((r) => r.reagentId === reagentId);
    if (!reagent || !Number.isFinite(requestedMl) || requestedMl <= 0) return false;
    if (this.activePourAnim) return false;
    if (this.isExplorationMode && (!explorationStore.allow(reagent.chemicalId!) || explorationStore.result.stopped))
      return false;
    const actualMl = Math.floor(Math.min(requestedMl, reagent.remainingMl, this.availableCapacityMl) * 10 + 1e-8) / 10;
    if (actualMl <= 0) return false;

    labSound.playDrop();
    this.selectedReagentId = reagentId;
    this.animCounter += 1;
    this.activePourAnim = {
      id: this.animCounter,
      reagentId,
      amountMl: actualMl,
      source
    };
    return true;
  }

  pour(reagentId: string, requestedMl: number, source: InputMode = this.inputMode): boolean {
    const reagent = this.reagents.find((r) => r.reagentId === reagentId);
    if (!reagent || !Number.isFinite(requestedMl) || requestedMl <= 0) return false;

    const actualMl = Math.floor(Math.min(requestedMl, reagent.remainingMl, this.availableCapacityMl) * 10 + 1e-8) / 10;
    if (actualMl <= 0) return false;

    if (this.isExplorationMode) {
      if (!explorationStore.add(reagent.chemicalId!, actualMl, source)) return false;
      reagent.remainingMl = Math.max(0, Number((reagent.remainingMl - actualMl).toFixed(1)));
      explorationStore.bottles[reagentId === 'hcl' ? 0 : 1].remainingMl = reagent.remainingMl;
      return true;
    }
    reagent.remainingMl = Math.max(0, Number((reagent.remainingMl - actualMl).toFixed(1)));

    if (reagent.kind === 'strong_acid') {
      this.beaker.acidVolumeMl = Number((this.beaker.acidVolumeMl + actualMl).toFixed(1));
    } else if (reagent.kind === 'strong_base') {
      this.beaker.baseVolumeMl = Number((this.beaker.baseVolumeMl + actualMl).toFixed(1));
    }

    this.recalculate();
    this.isSensorCardVisible = true;

    if (this.beaker.currentResult) {
      const trial: TrialRecord = {
        id: `trial-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        reagentName: reagent.name,
        volumeAddedMl: actualMl,
        accumulatedVolumeMl: this.totalVolumeMl,
        resultingPh: this.beaker.currentResult.pH,
        diagnosticClass: this.beaker.currentResult.diagnosticClass,
        indicatorColor: this.beaker.currentResult.indicatorBand.colorHex,
        inputMode: source
      };
      this.session.trials.push(trial);
      this.session.updatedAt = new Date().toISOString();
    }

    return true;
  }

  enterExploration() {
    this.activePourAnim = null;
    this.isExplorationMode = true;
    this.isHomeBookOpen = this.isNotebookOpen = this.isHypothesisModalOpen = false;
    explorationStore.bottles.forEach((b, i) => this.setExplorationBottle(i === 0 ? 'hcl' : 'naoh', b.chemicalId, b.remainingMl));
  }

  leaveExploration() {
    this.isExplorationMode = false;
    this.loadExperimentPreset('chemistry-p0-acid-base');
  }

  setExplorationBottle(slot: 'hcl' | 'naoh', id: string, remainingMl = 100) {
    if (this.activePourAnim) return;
    const item = chemical(id);
    const index = slot === 'hcl' ? 0 : 1;
    this.reagents[index] = {
      reagentId: slot,
      chemicalId: id,
      kind: index === 0 ? 'strong_acid' : 'strong_base',
      name: item.name,
      formula: item.formula,
      concentrationMolPerL: item.concentrationM,
      initialMl: 100,
      remainingMl,
      colorHex: item.color,
      hazardNotice: item.hazards.join(' ')
    };
    explorationStore.bottles[index] = { chemicalId: id, remainingMl };
    this.presetRevision += 1;
  }

  resetExperiment() {
    labSound.playInstrumentClick();
    if (this.isExplorationMode) explorationStore.reset();
    this.reagents.forEach((r) => (r.remainingMl = r.initialMl));
    this.beaker.waterMl = 50;
    this.beaker.acidVolumeMl = 0;
    this.beaker.baseVolumeMl = 0;
    this.beaker.temperatureC = 25;
    this.lastTestedStripPh = null;
    this.activePourAnim = null;
    this.isSensorCardVisible = false;
    this.isDosifierCardVisible = false;
    this.inspectedToolId = null;
    this.selectedCabinetComponentId = null;
    this.presetRevision += 1;
    this.recalculate();
  }

  saveHypothesis(text: string, trend: 'increase' | 'decrease' | 'neutral') {
    this.session.hypothesisText = text;
    this.session.predictionTrend = trend;
    this.session.status = 'in_progress';
    this.isHypothesisModalOpen = false;
  }

  exportNotebook(format: 'json' | 'csv') {
    let content = '';
    let filename = `symbiolab_reporte_${Date.now()}`;
    let mimeType = '';

    if (format === 'json') {
      content = JSON.stringify(
        {
          session: this.session,
          educationLevel: this.educationLevel,
          experimentPreset: this.activePreset.title,
          beakerState: this.beaker,
          lastResult: this.beaker.currentResult
        },
        null,
        2
      );
      filename += '.json';
      mimeType = 'application/json';
    } else {
      const headers = [
        'ID',
        'Hora',
        'Reactivo Añadido',
        'Volumen Añadido (mL)',
        'Volumen Total (mL)',
        'pH Resultante',
        'Diagnostico',
        'Modo de Control'
      ];
      const rows = this.session.trials.map((t) =>
        [
          t.id,
          t.timestamp,
          `"${t.reagentName}"`,
          t.volumeAddedMl,
          t.accumulatedVolumeMl,
          t.resultingPh,
          t.diagnosticClass,
          t.inputMode
        ].join(',')
      );
      content = [headers.join(','), ...rows].join('\n');
      filename += '.csv';
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const labStore = new LabStore();
