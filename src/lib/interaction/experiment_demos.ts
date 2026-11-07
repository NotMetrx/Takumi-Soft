/**
 * Guiones del modo «Ver demostración».
 *
 * Cada experimento del Manual tiene un guion con los mismos pasos y cantidades que el
 * procedimiento oficial, pero pensado para que el laboratorio lo ejecute solo: el store
 * inicia los vertidos animados, espera a que terminen y deja pasar el tiempo de observación.
 * Al final el vaso se reinicia para que el alumno repita la práctica por su cuenta.
 */

export type DemoReagentId = 'hcl' | 'naoh';

export type DemoAction =
  | { kind: 'pour'; reagentId: DemoReagentId; amountMl: number }
  | { kind: 'temperature'; valueC: number }
  | { kind: 'wait'; durationMs: number };

export interface DemoStep {
  id: string;
  title: string;
  detail: string;
  action: DemoAction;
  /** Tiempo de observación después de ejecutar la acción, en milisegundos. */
  holdMs: number;
}

export interface ExperimentDemo {
  presetId: string;
  title: string;
  summary: string;
  steps: DemoStep[];
}

const OBSERVE_MS = 3000;

function waitStep(id: string, title: string, detail: string, durationMs = 1500): DemoStep {
  return { id, title, detail, action: { kind: 'wait', durationMs }, holdMs: 0 };
}

function pourStep(
  id: string,
  title: string,
  detail: string,
  reagentId: DemoReagentId,
  amountMl: number,
  holdMs = 2400
): DemoStep {
  return { id, title, detail, action: { kind: 'pour', reagentId, amountMl }, holdMs };
}

function temperatureStep(id: string, title: string, detail: string, valueC: number): DemoStep {
  return { id, title, detail, action: { kind: 'temperature', valueC }, holdMs: 2400 };
}

export const EXPERIMENT_DEMOS: ExperimentDemo[] = [
  {
    presetId: 'cabbage-home-lab',
    title: 'Detective de colores con col lombarda',
    summary:
      'El laboratorio prepara el extracto de antocianinas y recorre la escala ácido-base: limón, bicarbonato y exceso alcalino.',
    steps: [
      waitStep(
        'cabbage-prep',
        'Preparar el extracto de col lombarda',
        'El vaso parte con 50 mL de agua a pH 7.00. Se añaden tres gotas del extracto verde de antocianinas antes de empezar.'
      ),
      pourStep(
        'cabbage-acid',
        'Añadir 12 mL de jugo de limón',
        'El ácido cítrico 0.02 M aporta protones H⁺ y el cromóforo de la antocianina vira a rojo. El pH baja hasta ≈2.48.',
        'hcl',
        12
      ),
      pourStep(
        'cabbage-base',
        'Neutralizar con 12 mL de bicarbonato',
        'El bicarbonato 0.02 M consume el exceso de ácido y devuelve la disolución al verde neutro, alrededor de pH 7.00.',
        'naoh',
        12
      ),
      pourStep(
        'cabbage-alkaline',
        'Exceso alcalino: 6 mL más de bicarbonato',
        'Con el nuevo exceso de base el pH sube hasta ≈11.2 y la antocianina pasa por azul y violeta.',
        'naoh',
        6
      ),
      waitStep(
        'cabbage-observe',
        'Observar la escala de colores',
        'Compara el rojo ácido, el verde neutro y el violeta básico. Al terminar, el vaso se reiniciará para que repitas el procedimiento.',
        OBSERVE_MS
      )
    ]
  },
  {
    presetId: 'steam-antibubbles-lab',
    title: 'Antiburbujas y encapsulación',
    summary:
      'Se forma el gradiente de densidad con sirope de agave y se inyecta la disolución jabonosa para crear antiburbujas.',
    steps: [
      waitStep(
        'antibubbles-prep',
        'Preparar las dos disoluciones',
        'Disolución A: agua con una gota de detergente y colorante. Disolución B: sirope de agave diluido para crear el gradiente de densidad.'
      ),
      pourStep(
        'antibubbles-a',
        'Verter 12 mL de la disolución jabonosa',
        'La disolución A aporta las moléculas anfifílicas que estabilizan la película de aire alrededor de cada gota.',
        'hcl',
        12
      ),
      pourStep(
        'antibubbles-b',
        'Añadir 12 mL de sirope de agave',
        'La disolución B se acumula en el fondo y genera un gradiente de densidad donde las antiburbujas quedan suspendidas a distintas alturas.',
        'naoh',
        12
      ),
      waitStep(
        'antibubbles-observe',
        'Observar las antiburbujas',
        'Las gotas encapsuladas flotan y se ordenan por densidad, igual que las nanopartículas lipídicas que protegen el ARNm.',
        OBSERVE_MS
      )
    ]
  },
  {
    presetId: 'steam-ice-melting-density',
    title: 'Fusión del hielo y convección',
    summary:
      'El hielo teñido se coloca en agua y después se añade salmuera para comparar la convección con la estratificación.',
    steps: [
      waitStep(
        'ice-prep',
        'Colocar el cubito de hielo teñido',
        'El hielo está a 0 °C y tiene una densidad de 0.917 g/cm³. El vaso parte con 50 mL de agua a 15 °C.'
      ),
      pourStep(
        'ice-tracer',
        'Añadir 15 mL de trazador rojo',
        'El agua fría del deshielo es más densa que el agua líquida y se hunde, dibujando una pluma de convección roja.',
        'hcl',
        15
      ),
      pourStep(
        'ice-brine',
        'Añadir 15 mL de salmuera',
        'La salmuera saturada es más densa: el agua dulce del deshielo queda atrapada arriba como una capa aislante y la fusión se frena.',
        'naoh',
        15
      ),
      waitStep(
        'ice-observe',
        'Comparar convección y estratificación',
        'En agua pura la pluma desciende; en salmuera se forma una piscina fría estable sobre la superficie.',
        OBSERVE_MS
      )
    ]
  },
  {
    presetId: 'vinegar-baking-soda',
    title: 'Volcán espumoso de vinagre y bicarbonato',
    summary:
      'Se acidifica el vaso con 20 mL de vinagre y se neutraliza con 20 mL de bicarbonato, liberando CO₂ hasta pH 7.00.',
    steps: [
      waitStep(
        'volcano-prep',
        'Partir de 50 mL de agua neutra',
        'El vaso contiene 50 mL de agua a pH 7.00. El indicador verde confirma el punto de partida neutro.'
      ),
      pourStep(
        'volcano-acid',
        'Verter 20 mL de vinagre blanco',
        'El ácido acético 0.015 M baja el pH hasta ≈2.45 y el indicador vira a rojo.',
        'hcl',
        20
      ),
      pourStep(
        'volcano-base',
        'Añadir 20 mL de bicarbonato',
        'La relación estequiométrica 1:1 neutraliza el ácido, libera burbujas de CO₂ y devuelve el pH a 7.00.',
        'naoh',
        20
      ),
      waitStep(
        'volcano-observe',
        'Observar la espuma y el pH final',
        'La efervescencia cesa cuando se agota el ácido. El pH vuelve al entorno neutro y el vaso queda listo para repetirlo.',
        OBSERVE_MS
      )
    ]
  },
  {
    presetId: 'steam-chupachups-redox',
    title: 'Camaleón químico con Chupa Chups',
    summary:
      'Se prepara el medio básico con KMnO₄ y se incorpora la glucosa del caramelo para recorrer los estados de oxidación del manganeso.',
    steps: [
      waitStep(
        'redox-prep',
        'Preparar el medio básico púrpura',
        'Se disuelven NaOH y una pizca de KMnO₄. El ion MnO₄⁻ (Mn +7) tiñe la disolución de púrpura intenso.'
      ),
      pourStep(
        'redox-base',
        'Añadir 20 mL de KMnO₄ en NaOH',
        'El medio fuertemente alcalino alcanza pH ≈11.6 y deja el permanganato listo para reducirse.',
        'naoh',
        20
      ),
      pourStep(
        'redox-glucose',
        'Incorporar 20 mL de glucosa reductora',
        'La glucosa cede electrones: el manganeso pasa por tonos azules y verdes hasta el MnO₂ coloidal amarillo-marrón.',
        'hcl',
        20
      ),
      waitStep(
        'redox-observe',
        'Observar la cascada de colores',
        'Púrpura (+7) → verde (+6) → amarillo-marrón (+4). El vaso se reiniciará al terminar la demostración.',
        3500
      )
    ]
  },
  {
    presetId: 'steam-tea-complexes-redox',
    title: 'Reacciones con té: complejos y redox',
    summary:
      'Sobre la infusión de té se añaden el reactivo de Fe³⁺ y la disolución alcalina reductora para comparar complejación y redox.',
    steps: [
      waitStep(
        'tea-prep',
        'Preparar la infusión de té',
        'El vaso parte con la infusión azul rica en antocianinas a pH neutro; también hay té negro con taninos para el complejo con hierro.'
      ),
      pourStep(
        'tea-iron',
        'Añadir 15 mL de Fe³⁺ / ácido cítrico',
        'Los taninos del té negro coordinan el hierro(III) y forman el complejo de ácido gálico-hierro de color negro intenso.',
        'hcl',
        15
      ),
      pourStep(
        'tea-reducer',
        'Añadir 15 mL de infusión alcalina / ditionita',
        'El reductor decolora el té de hibisco y devuelve la mezcla al entorno neutro, cerrando el ciclo ácido-base y redox.',
        'naoh',
        15
      ),
      waitStep(
        'tea-observe',
        'Comparar los cuatro tipos de reacción',
        'Ácido-base con antocianinas, complejación con Fe³⁺, redox con ditionita y observación de microplásticos en el microscopio.',
        OBSERVE_MS
      )
    ]
  },
  {
    presetId: 'chemistry-p0-acid-base',
    title: 'Titulación volumétrica HCl + NaOH',
    summary:
      'Se vierten 25 mL de HCl 0.01 M y se titulan con 25 mL de NaOH 0.01 M hasta el punto de equivalencia en pH 7.00.',
    steps: [
      waitStep(
        'titration-prep',
        'Calibrar el pH-metro',
        'El electrodo se comprueba en 50 mL de agua desionizada a 25 °C: lectura inicial pH 7.00.'
      ),
      pourStep(
        'titration-acid',
        'Añadir 25 mL de HCl 0.01 M',
        'Los 0.25 mmol de HCl se diluyen en 75 mL totales: [H⁺] = 3.33×10⁻³ M y el pH desciende a 2.48.',
        'hcl',
        25
      ),
      pourStep(
        'titration-base',
        'Titular con 25 mL de NaOH 0.01 M',
        'Ca·Va = Cb·Vb. Al completar los 25.0 mL de base, el pH salta al punto de equivalencia exacto de 7.00.',
        'naoh',
        25
      ),
      waitStep(
        'titration-observe',
        'Leer el punto de equivalencia',
        'La curva sigmoidea de pH muestra el salto abrupto alrededor de 25 mL. El vaso se reinicia para repetir la titulación.',
        3000
      )
    ]
  },
  {
    presetId: 'steam-botijo-condensation',
    title: 'Botijo, condensación y condensado ácido',
    summary:
      'Se simula el enfriamiento evaporativo del botijo y se neutraliza el agua ácida de una caldera de condensación.',
    steps: [
      waitStep(
        'botijo-prep',
        'Enfriamiento evaporativo del botijo',
        'El agua atraviesa la cerámica porosa y se evapora absorbiendo calor latente; el interior baja de 25 °C a unos 16 °C.'
      ),
      temperatureStep(
        'botijo-cool',
        'Estabilizar el interior a 16 °C',
        'La evaporación en la superficie cerámica enfría el agua sin electricidad, como en el sistema Pot-in-Pot.',
        16
      ),
      pourStep(
        'botijo-condensate',
        'Añadir 12 mL de condensado ácido',
        'El agua de la caldera de condensación contiene CO₂ disuelto y óxidos ácidos; su pH ronda 3.8–4.5.',
        'hcl',
        12
      ),
      pourStep(
        'botijo-neutralize',
        'Neutralizar con 12 mL de solución alcalina',
        'El neutralizante consume la acidez del condensado y devuelve la mezcla a pH ≈7.00 antes del vertido.',
        'naoh',
        12
      ),
      waitStep(
        'botijo-observe',
        'Comparar temperatura y pH final',
        'El botijo enfría por evaporación y la caldera recupera calor latente, pero su condensado debe neutralizarse.',
        OBSERVE_MS
      )
    ]
  },
  {
    presetId: 'steam-benzene-invisible-fire',
    title: 'Fuego invisible: benceno y etanol',
    summary:
      'Demostración de riesgo extremo: decantación controlada de benceno, adición de etanol y activación térmica de la llama casi invisible.',
    steps: [
      waitStep(
        'benzene-prep',
        'Verificar campana, EPP y DELICATE_POUR',
        'Se comprueba la extracción, la pantalla de seguridad y que la máquina DELICATE_POUR mantiene el ángulo de vertido en la ventana segura.',
        1800
      ),
      pourStep(
        'benzene-decant',
        'Decantar 10 mL de benceno puro',
        'El benceno (Pv = 10.0 kPa a 20 °C) libera vapores 2.77 veces más densos que el aire que se acumulan sobre la mesa.',
        'hcl',
        10,
        2800
      ),
      pourStep(
        'benzene-ethanol',
        'Añadir 10 mL de etanol absoluto',
        'El etanol comparte la alta volatilidad y reduce la temperatura de ignición de la mezcla; sus llamas son casi invisibles en luz diurna.',
        'naoh',
        10,
        2800
      ),
      temperatureStep(
        'benzene-ignite',
        'Elevar la placa térmica a 45 °C',
        'Al alcanzar la temperatura de ignición, la capa de vapor se inflama y se revela mediante ondas de refracción térmica (efecto Schlieren).',
        45
      ),
      waitStep(
        'benzene-observe',
        'Observar la refracción térmica',
        'La llama apenas se ve, pero las ondas de calor delatan la combustión. El vaso se reinicia al terminar la demostración.',
        3500
      )
    ]
  }
];

export function getExperimentDemo(presetId: string): ExperimentDemo | undefined {
  return EXPERIMENT_DEMOS.find((demo) => demo.presetId === presetId);
}
