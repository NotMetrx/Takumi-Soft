import { explorationStore } from '$lib/exploration/exploration_store.svelte';
import { chemical } from '$lib/science/chemistry/catalog';
import { calculateStrongAcidBase } from '$lib/science/chemistry/acid_base_solver';
import { labSound } from '$lib/audio/lab_sound';
import type { GestureState } from '$lib/input/hand_gestures';
import type { Reagent, BeakerState, TrialRecord, InputMode, LabSession } from '$lib/core/contracts';

export type EducationLevel = 'primaria' | 'secundaria';

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
  id: 'burette' | 'thermometer' | 'ph_strips' | 'dropper' | 'ph_meter' | 'test_rack' | 'microscope';
  name: string;
  shortLabel: string;
  icon: string;
  levelBadge: 'Primaria y Secundaria' | 'Ideal Primaria' | 'Precisión Secundaria';
  primariaExplain: string;
  secundariaExplain: string;
  actionLabel: string;
}

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
      'Calienta suavemente el vaso y mide qué tan tibia o caliente está el agua (de 25 °C a 65 °C), haciendo que las moléculas se muevan más rápido y salga vapor.',
    secundariaExplain:
      'Controla la temperatura termodinámica del reactor. La autoionización del agua es endotérmica (ΔH° = +55.8 kJ/mol): al subir T aumenta Kw y disminuye el pH neutro (p. ej. pH 6.47 a 65 °C).',
    actionLabel: 'Cambiar Temperatura (25°C / 45°C / 65°C)'
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
      'Tiras de celulosa impregnadas con indicadores mixtos (rojo de metilo, azul de bromotimol y fenolftaleína) para determinación colorimétrica rápida por comparación con escala patrón.',
    actionLabel: 'Sumergir Tira Reactiva de pH'
  },
  dropper: {
    id: 'dropper',
    name: 'Frasco Gotero Ámbar con Pipeta Pasteur (Indicador)',
    shortLabel: 'Gotero de Indicador',
    icon: '💧',
    levelBadge: 'Ideal Primaria',
    primariaExplain:
      'Guarda el jugo morado de col o el indicador universal. El vidrio es oscuro para protegerlo de la luz y su gomita superior permite echar gotas.',
    secundariaExplain:
      'Frasco reactivo de vidrio borosilicato ámbar actínico con pipeta Pasteur y bulbo de elastómero para dosificar alícuotas de indicador ácido-base sin fotodegradación.',
    actionLabel: 'Añadir 1 Gota de Indicador'
  },
  ph_meter: {
    id: 'ph_meter',
    name: 'pH-metro Potenciométrico Digital pH-200 PRO',
    shortLabel: 'pH-metro Digital',
    icon: '📟',
    levelBadge: 'Precisión Secundaria',
    primariaExplain:
      'Es una computadora pequeña con un sensor azul dentro del agua que nos muestra con números grandes el nivel exacto de pH.',
    secundariaExplain:
      'Sensor electroquímico con electrodo combinado de membrana de vidrio sensible a la actividad de iones H₃O⁺ según la ecuación de Nernst, con compensación térmica.',
    actionLabel: 'Ver Lectura Potenciométrica'
  },
  test_rack: {
    id: 'test_rack',
    name: 'Gradilla Colorimétrica con 5 Tubos de Ensayo Patrón',
    shortLabel: 'Gradilla de Tubos (pH 2–12)',
    icon: '🔬',
    levelBadge: 'Primaria y Secundaria',
    primariaExplain:
      'Son 5 tubitos ordenados como un arcoíris químico (rojo, naranja, verde, azul y morado) para que compares el color de tu vaso.',
    secundariaExplain:
      'Serie de soluciones amortiguadoras (buffers) de referencia certificada a pH 2.0, 5.0, 7.0, 9.0 y 12.0 para control visual de viraje del indicador universal.',
    actionLabel: 'Comparar Escala de Colores'
  },
  microscope: {
    id: 'microscope',
    name: 'Microscopio Óptico Compuesto Binocular (4x–100x)',
    shortLabel: 'Microscopio Escolar',
    icon: '🔭',
    levelBadge: 'Primaria y Secundaria',
    primariaExplain:
      'Cuando un ácido y una base se juntan forman agua y sal. ¡Con el microscopio podemos ver los cristalitos cúbicos de sal cuando se evapora el agua!',
    secundariaExplain:
      'Microscopio biológico/cristalográfico binocular Siedentopf con revólver cuádruple (4x, 10x, 40x, 100x) y platina mecánica XY para observar la cristalización de sales neutras (NaCl, KNO₃).',
    actionLabel: 'Inspeccionar Cristales de Sal Formados'
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
  {
    id: 'cabbage-home-lab',
    level: 'primaria',
    gradeRange: 'Primaria (3.° a 6.° Grado)',
    title: 'El Detective de Colores con Col Morada',
    subtitle: 'Jugo de Limón vs. Bicarbonato de Cocina',
    badge: 'Primaria · Experimento #1',
    difficulty: 'Primaria · En Casa y Aula',
    durationMin: 10,
    summary:
      'Descubre cómo el agua de col morada actúa como una poción detectora de colores: se vuelve roja con el jugo de limón, verde en el agua pura y azul/morada con el bicarbonato.',
    scientificPrinciple:
      'Las hojas de col morada tienen un pigmento natural llamado antocianina. Este pigmento cambia de forma y de color cuando toca sustancias ácidas (como el limón) o alcalinas (como el bicarbonato o el jabón).',
    safetyNote:
      '100% seguro con ingredientes de cocina. Usa el Gotero Ámbar y las Tiras de Papel pH en la mesa para explorar cada color.',
    recommendedTools: ['dropper', 'ph_strips', 'test_rack'],
    householdMaterials: [
      { name: '2 hojas de Col Morada', role: 'Indicador mágico natural (antocianina)', icon: '🥬' },
      { name: 'Jugo de 1 Limón exprimido', role: 'Ácido natural de cocina (pH ~2.2)', icon: '🍋' },
      { name: '1 cdta. de Bicarbonato en agua', role: 'Base suave de cocina (pH ~9.5)', icon: '🥄' },
      { name: 'Tiras de papel pH y Gotero', role: 'Herramientas didácticas en tu mesa 3D', icon: '🎗️' }
    ],
    videoChapters: [
      {
        timeSec: 0,
        durationSec: 5,
        title: '1. Preparar el extracto de Col Morada',
        caption: 'Ponemos hojas de col morada en agua tibia, colamos el líquido y agregamos 3 gotas con el gotero en nuestro vaso central (pH 7.0).',
        actionType: 'prep',
        simPh: 7.0,
        simColor: '#10b981'
      },
      {
        timeSec: 5,
        durationSec: 5,
        title: '2. ¡Prueba Ácida con Jugo de Limón!',
        caption: 'Al echar 15 mL de jugo de limón exprimido, el agua cambia de inmediato a color rojo brillante porque el limón es ácido (pH ~2.35).',
        actionType: 'pour_acid',
        simPh: 2.35,
        simColor: '#ef4444'
      },
      {
        timeSec: 10,
        durationSec: 5,
        title: '3. Regreso al Equilibrio con Bicarbonato',
        caption: 'Echamos agua con bicarbonato: salen burbujitas y el color pasa por naranja hasta volver al verde esmeralda neutro (pH 7.0).',
        actionType: 'pour_base',
        simPh: 7.0,
        simColor: '#10b981'
      },
      {
        timeSec: 15,
        durationSec: 5,
        title: '4. Arcoíris Alcalino (Azul y Violeta)',
        caption: 'Si añadimos más bicarbonato, la mezcla se vuelve básica y brilla con tonos azules y violetas.',
        actionType: 'neutralize',
        simPh: 11.4,
        simColor: '#8b5cf6'
      }
    ],
    interactiveGoals: [
      {
        id: 'goal-1',
        description: 'Vierte al menos 10 mL de Jugo de Limón para que el vaso se ponga rojo (pH < 3.5).',
        checkFn: (b) => b.acidVolumeMl >= 10 && (b.currentResult?.pH ?? 7) < 3.5
      },
      {
        id: 'goal-2',
        description: 'Agrega Bicarbonato de Sodio para subir el pH por encima de 6.0 (color verde/neutro).',
        checkFn: (b) => b.acidVolumeMl >= 10 && b.baseVolumeMl >= 10 && (b.currentResult?.pH ?? 0) >= 6.0
      },
      {
        id: 'goal-3',
        description: 'Lleva tu mezcla al color azul/morado (pH > 10.5) añadiendo más Bicarbonato.',
        checkFn: (b) => (b.currentResult?.pH ?? 0) > 10.5
      }
    ],
    quizQuestion: {
      question: '¿A qué color cambia el indicador cuando le echamos bastante Jugo de Limón?',
      options: [
        'Se pone de color Rojo intenso porque el limón es un ácido',
        'Se queda transparente como el hielo',
        'Se vuelve de color negro oscuro'
      ],
      correctIndex: 0,
      explanation:
        '¡Muy bien! Los ácidos como el limón hacen que el indicador de col morada e indicador universal se tiñan de rojo intenso.'
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
    id: 'vinegar-baking-soda',
    level: 'primaria',
    gradeRange: 'Primaria (4.° a 6.° Grado)',
    title: 'El Volcán Espumoso: Vinagre y Bicarbonato',
    subtitle: 'Efervescencia de CO₂ y Equilibrio de pH',
    badge: 'Primaria · Experimento #2',
    difficulty: 'Primaria · En Casa y Aula',
    durationMin: 8,
    summary:
      'Observa cómo el vinagre blanco de cocina y el bicarbonato se neutralizan liberando burbujas de gas dióxido de carbono (CO₂) hasta transformar un líquido ácido en agua neutra.',
    scientificPrinciple:
      'Cuando el ácido del vinagre (CH₃COOH) choca con el bicarbonato (NaHCO₃), reaccionan formando agua, una sal suave y gas CO₂ que escapa en forma de espuma burbujeante.',
    safetyNote:
      'Experimento casero sin toxicidad. Prueba también las Tiras de Papel pH y el Termómetro de la mesa 3D.',
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
      question: 'Si pusiste 20 mL de Vinagre, ¿cuántos mL de Bicarbonato de igual fuerza necesitas para que queden empatados en pH 7.00?',
      options: [
        'Exactamente 20 mL (la misma cantidad para empatar)',
        'Solo 1 gotita',
        '200 mL llenando todo el vaso'
      ],
      correctIndex: 0,
      explanation:
        '¡Excelente! Como ambos tienen la misma fuerza, 20 mL de ácido se equilibran exactamente con 20 mL de base.'
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
  {
    id: 'chemistry-p0-acid-base',
    level: 'secundaria',
    gradeRange: 'Secundaria (1.° a 5.° Grado)',
    title: 'Titulación Volumétrica con Bureta: HCl + NaOH',
    subtitle: 'Ácido Clorhídrico (0.01 M) + Hidróxido de Sodio (0.01 M)',
    badge: 'Secundaria · Experimento #3',
    difficulty: 'Secundaria · Laboratorio Analítico',
    durationMin: 15,
    summary:
      'Práctica cuantitativa de Secundaria: utiliza los matraces Erlenmeyer y la Bureta Graduada de 50 mL para determinar el punto de equivalencia estequiométrico entre un ácido fuerte y una base fuerte.',
    scientificPrinciple:
      'Resuelve la ecuación cuadrática de electroneutralidad H² - d·H - Kw = 0 donde d = (Ca·Va - Cb·Vb)/Vtotal. En las cercanías del punto de equivalencia (d → 0), una sola gota de la bureta produce un salto abrupto en la curva sigmoidea de pH.',
    safetyNote:
      'Nivel Secundaria: En laboratorio físico requiere bata, guantes de nitrilo y gafas ANSI Z87.1. Usa la Bureta 3D para titular gota a gota (+1 mL).',
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
    id: 'thermal-kw-buffer-lab',
    level: 'secundaria',
    gradeRange: 'Secundaria Avanzada (3.° a 5.° Grado)',
    title: 'Termoquímica del Agua y Neutralización: HNO₃ + KOH',
    subtitle: 'Efecto de la Temperatura (Van ’t Hoff) sobre Kw y el pH',
    badge: 'Secundaria · Experimento #4',
    difficulty: 'Secundaria · Laboratorio Analítico',
    durationMin: 15,
    summary:
      'Investiga por qué el pH del agua pura y del punto de equivalencia varía al calentar la solución en la placa térmica de 25 °C a 65 °C, y realiza una valoración entre Ácido Nítrico (HNO₃ 0.02 M) e Hidróxido de Potasio (KOH 0.02 M).',
    scientificPrinciple:
      'La autoionización del agua (2H₂O ⇌ H₃O⁺ + OH⁻) es un proceso endotérmico (ΔH° = +55.8 kJ/mol). Por el principio de Le Chatelier y la ecuación de Van ’t Hoff, al elevar la temperatura a 65 °C la constante Kw aumenta ~11 veces, por lo que una solución perfectamente neutra ([H⁺] = [OH⁻]) marca pH ≈ 6.47.',
    safetyNote:
      'Nivel Secundaria: Activa la Placa Calefactora y el Termómetro Digital 3D para observar el vapor térmico y la variación de Kw(T).',
    recommendedTools: ['thermometer', 'burette', 'ph_meter'],
    householdMaterials: [
      { name: 'Placa Calefactora + Termómetro 3D', role: 'Control térmico de 25 °C, 45 °C y 65 °C', icon: '🌡️' },
      { name: 'Ácido Nítrico (HNO₃ 0.02 M)', role: 'Ácido fuerte oxidante monoprótico', icon: '🧪' },
      { name: 'Hidróxido de Potasio (KOH 0.02 M)', role: 'Base fuerte alcalina para titulación', icon: '⚗️' },
      { name: 'Bureta de 50 mL y pH-metro PRO', role: 'Medición de alta resolución de Kw(T)', icon: '📟' }
    ],
    videoChapters: [
      {
        timeSec: 0,
        durationSec: 5,
        title: '1. Calentamiento Endotérmico a 65 °C',
        caption: 'Encendemos la placa calefactora a 65 °C: observa cómo el agua pura neutra pasa de pH 7.00 a pH 6.47 porque aumenta Kw(T).',
        actionType: 'prep',
        simPh: 6.47,
        simColor: '#10b981'
      },
      {
        timeSec: 5,
        durationSec: 5,
        title: '2. Adición de 20 mL de Ácido Nítrico (HNO₃ 0.02 M)',
        caption: 'Vertemos 20 mL de HNO₃ 0.02 M y el pH desciende a 2.24 con desprendimiento de vapor térmico.',
        actionType: 'pour_acid',
        simPh: 2.24,
        simColor: '#ef4444'
      },
      {
        timeSec: 10,
        durationSec: 5,
        title: '3. Neutralización con KOH 0.02 M y Enfriamiento a 25 °C',
        caption: 'Añadimos 20 mL de KOH 0.02 M formando nitrato de potasio (KNO₃) y regresamos la temperatura a 25 °C para verificar pH 7.00.',
        actionType: 'neutralize',
        simPh: 7.0,
        simColor: '#10b981'
      }
    ],
    interactiveGoals: [
      {
        id: 'goal-t1',
        description: 'Haz clic en el Termómetro / Placa Calefactora 3D para elevar la temperatura a 45 °C o 65 °C.',
        checkFn: (b) => b.temperatureC >= 45
      },
      {
        id: 'goal-t2',
        description: 'Vierte al menos 15 mL de HNO₃ 0.02 M y neutralízalo con la misma cantidad de KOH 0.02 M.',
        checkFn: (b) => b.acidVolumeMl >= 15 && Math.abs(b.acidVolumeMl - b.baseVolumeMl) <= 0.5
      }
    ],
    quizQuestion: {
      question: 'A 65 °C el agua pura tiene un pH de 6.47. ¿Significa eso que el agua se volvió ácida al calentarla?',
      options: [
        'No: sigue siendo neutra porque [H₃O⁺] = [OH⁻], solo aumentó Kw por ser endotérmica',
        'Sí: el calor destruye los iones OH⁻',
        'No: el termómetro está descalibrado'
      ],
      correctIndex: 0,
      explanation:
        '¡Brillante! La neutralidad química se define por la igualdad [H₃O⁺] = [OH⁻]. A mayor temperatura se disocian más moléculas de agua en partes iguales de H⁺ y OH⁻, desplazando el pH neutro a 6.47.'
    },
    acidReagent: {
      chemicalId: 'hcl',
      name: 'Ácido Nítrico',
      formula: 'HNO₃ 0.02 M',
      concentrationMolPerL: 0.02,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#f97316',
      hazardNotice: 'Nivel Secundaria: Ácido fuerte monoprótico.'
    },
    baseReagent: {
      chemicalId: 'naoh',
      name: 'Hidróxido de Potasio',
      formula: 'KOH 0.02 M',
      concentrationMolPerL: 0.02,
      initialMl: 100,
      remainingMl: 100,
      colorHex: '#6366f1',
      hazardNotice: 'Nivel Secundaria: Base fuerte alcalina.'
    }
  }
];

export class LabStore {
  isExplorationMode = $state(false);
  activePresetId = $state<string>('chemistry-p0-acid-base');
  presetRevision = $state<number>(1);
  educationLevel = $state<EducationLevel>('secundaria');
  soundEnabled = $state<boolean>(true);

  // Herramientas 3D interactivas del laboratorio ampliado
  inspectedToolId = $state<LabToolInfo['id'] | null>(null);
  lastTestedStripPh = $state<number | null>(null);
  lastTestedStripColor = $state<string>('#fde047');
  indicatorDropsCount = $state<number>(3);
  burettePulseRevision = $state<number>(0);
  dropperPulseRevision = $state<number>(0);
  stripDipRevision = $state<number>(0);

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
    return EXPERIMENT_PRESETS.find((p) => p.id === this.activePresetId) ?? EXPERIMENT_PRESETS[2];
  }

  get inspectedTool(): LabToolInfo | null {
    return this.inspectedToolId ? LAB_TOOLS_CATALOG[this.inspectedToolId] : null;
  }

  get totalVolumeMl(): number {
    if (this.isExplorationMode) return explorationStore.state.volumeMl;
    return Number((this.beaker.waterMl + this.beaker.acidVolumeMl + this.beaker.baseVolumeMl).toFixed(1));
  }

  get availableCapacityMl(): number {
    return Math.max(0, Number(((this.isExplorationMode ? 240 : this.beaker.capacityMl) - this.totalVolumeMl).toFixed(1)));
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

  inspectTool(toolId: LabToolInfo['id'] | null) {
    this.inspectedToolId = toolId;
    if (toolId === 'ph_meter') {
      this.isSensorCardVisible = true;
    } else if (toolId === 'burette') {
      this.isDosifierCardVisible = true;
      this.isSensorCardVisible = true;
    }
    if (toolId) {
      labSound.playInstrumentClick();
    }
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
   * Cambia la temperatura de la placa calefactora (25 °C -> 45 °C -> 65 °C -> 25 °C)
   */
  cycleTemperature() {
    labSound.playInstrumentClick();
    if (this.beaker.temperatureC < 40) {
      this.beaker.temperatureC = 45;
    } else if (this.beaker.temperatureC < 60) {
      this.beaker.temperatureC = 65;
    } else {
      this.beaker.temperatureC = 25;
    }
    this.recalculate();
    this.isSensorCardVisible = true;
  }

  setTemperature(tempC: number) {
    this.beaker.temperatureC = Math.max(15, Math.min(85, tempC));
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
   * Añade una gota desde el Frasco Gotero Ámbar con Pipeta Pasteur
   */
  squeezeIndicatorDropper() {
    labSound.playDrop();
    this.indicatorDropsCount += 1;
    this.dropperPulseRevision += 1;
  }

  /**
   * Equipa el laboratorio con el experimento de Primaria o Secundaria elegido en el Libro
   */
  loadExperimentPreset(presetId: string) {
    const preset = EXPERIMENT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    this.activePresetId = preset.id;
    this.educationLevel = preset.level;
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
    this.beaker.temperatureC = preset.id === 'thermal-kw-buffer-lab' ? 65 : 25;
    this.activePourAnim = null;
    this.lastTestedStripPh = null;
    this.session.experimentId = preset.id;
    this.presetRevision += 1;
    this.recalculate();
    this.isSensorCardVisible = false;
    this.isDosifierCardVisible = false;
    this.inspectedToolId = null;
    this.isHomeBookOpen = false;
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
    if (this.isExplorationMode && (!explorationStore.allow(reagent.chemicalId!) || explorationStore.result.stopped)) return false;
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
    this.setExplorationBottle('hcl', 'hcl');
    this.setExplorationBottle('naoh', 'bicarbonate');
  }

  leaveExploration() {
    this.isExplorationMode = false;
    this.loadExperimentPreset('chemistry-p0-acid-base');
  }

  setExplorationBottle(slot: 'hcl' | 'naoh', id: string) {
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
      remainingMl: 100,
      colorHex: item.color,
      hazardNotice: item.hazards.join(' ')
    };
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
