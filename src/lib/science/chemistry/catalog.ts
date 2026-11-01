export interface Chemical {
  id: string; name: string; formula: string; family: string; color: string;
  concentrationM: number; note: string; hazards: string[]; source: string;
}
const textbook = 'https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions';
const incompatibility = 'https://orf.od.nih.gov/EnvironmentalProtection/WasteDisposal/Pages/chem_compat.aspx';
export const CHEMICALS: Chemical[] = [
  { id: 'water', name: 'Agua destilada', formula: 'H₂O', family: 'Disolvente', color: '#7dd3fc', concentrationM: 0, note: 'Dilución y conservación de materia.', hazards: [], source: textbook },
  { id: 'hcl', name: 'Ácido clorhídrico', formula: 'HCl', family: 'Ácido fuerte', color: '#fb7185', concentrationM: 0.1, note: 'Disociación completa en el modelo acuoso.', hazards: ['Ácido; evitar contacto en un laboratorio real.'], source: textbook },
  { id: 'naoh', name: 'Hidróxido de sodio', formula: 'NaOH', family: 'Base fuerte', color: '#c4b5fd', concentrationM: 0.1, note: 'Neutralización; la fuerza no equivale a concentración.', hazards: ['Base; la disolución del sólido puede liberar calor.'], source: 'https://www.ilo.org/dyn/icsc/showcard.display?p_card_id=360' },
  { id: 'acetic', name: 'Ácido acético', formula: 'CH₃COOH', family: 'Ácido débil', color: '#fda4af', concentrationM: 0.1, note: 'Ka = 1.8×10⁻⁵ a 25 °C. Disolución definida, no vinagre comercial.', hazards: ['El peligro depende de la concentración.'], source: 'https://openstax.org/books/chemistry-2e/pages/14-3-relative-strengths-of-acids-and-bases' },
  { id: 'acetate', name: 'Acetato de sodio', formula: 'CH₃COONa', family: 'Tampón / sal', color: '#f9a8d4', concentrationM: 0.1, note: 'Con ácido acético permite estudiar amortiguación de pH.', hazards: [], source: textbook },
  { id: 'bicarbonate', name: 'Bicarbonato de sodio', formula: 'NaHCO₃', family: 'Carbonato', color: '#67e8f9', concentrationM: 0.1, note: 'Especie anfiprótica. Puede liberar CO₂ al acidificar.', hazards: ['La formación de gas en sistemas cerrados puede elevar la presión.'], source: textbook },
  { id: 'carbonate', name: 'Carbonato de sodio', formula: 'Na₂CO₃', family: 'Carbonato', color: '#38bdf8', concentrationM: 0.1, note: 'Distinto del bicarbonato; forma precipitado con calcio.', hazards: ['Disolución alcalina; riesgo de irritación.'], source: textbook },
  { id: 'calcium', name: 'Cloruro de calcio', formula: 'CaCl₂', family: 'Sal de calcio', color: '#e2e8f0', concentrationM: 0.1, note: 'Precipitación de CaCO₃: equilibrio ideal a 25 °C.', hazards: ['Irritante; propiedades dependen de su forma.'], source: 'https://www.colorado.edu/lab/lecture-demo-manual/general-reactions/s130-chemical-rxns-precipitation-cacl2-na2co3-caco3' },
  { id: 'salt', name: 'Cloruro de sodio', formula: 'NaCl', family: 'Sal', color: '#cbd5e1', concentrationM: 0.1, note: 'Iones espectadores; no representa sodio metálico.', hazards: [], source: textbook },
  { id: 'sugar', name: 'Disolución de sacarosa', formula: 'C₁₂H₂₂O₁₁', family: 'Soluto molecular', color: '#fde68a', concentrationM: 0.1, note: 'Dilución; degradación y combustión no modeladas.', hazards: [], source: textbook },
  { id: 'iodine', name: 'Disolución indicadora de yodo', formula: 'I₂ / I⁻', family: 'Indicador', color: '#b45309', concentrationM: 0.005, note: 'Ensayo cualitativo con almidón; composición idealizada.', hazards: ['Irritante; no ingerir.'], source: 'https://www.acs.org/content/dam/acsorg/education/resources/k-8/science-activities/characteristicsofmaterials/food/starch-search.pdf' },
  { id: 'starch', name: 'Dispersión de almidón', formula: '(C₆H₁₀O₅)ₙ', family: 'Indicador', color: '#f1f5f9', concentrationM: 0, note: 'Dispersión cualitativa: no se asigna molaridad al polímero.', hazards: [], source: 'https://www.acs.org/content/dam/acsorg/education/resources/k-8/science-activities/characteristicsofmaterials/food/starch-search.pdf' },
  { id: 'copper', name: 'Sulfato de cobre(II)', formula: 'CuSO₄', family: 'Sal metálica', color: '#38bdf8', concentrationM: 0.1, note: 'Con NaOH: precipitación estequiométrica de Cu(OH)₂. pH no calculado.', hazards: ['Evitar exposición y vertido de residuos al ambiente.'], source: textbook },
  { id: 'ethanol', name: 'Etanol acuoso virtual', formula: 'C₂H₅OH', family: 'Disolvente orgánico', color: '#fbbf24', concentrationM: 0.1, note: 'La combustión y los vapores se representan solo mediante avisos cualitativos.', hazards: ['Los productos con etanol pueden formar atmósferas inflamables según composición y condiciones.'], source: incompatibility },
  { id: 'peroxide', name: 'Peróxido de hidrógeno acuoso', formula: 'H₂O₂', family: 'Oxidante', color: '#a5f3fc', concentrationM: 0.1, note: 'Estabilidad y descomposición sin modelo cuantitativo en esta versión.', hazards: ['Oxidante; la concentración y contaminación modifican su peligro.'], source: incompatibility },
  { id: 'bleach', name: 'Hipoclorito acuoso virtual', formula: 'NaClO', family: 'Oxidante / incompatibilidades', color: '#bef264', concentrationM: 0.1, note: 'Caso virtual de incompatibilidad; no reproduce un producto comercial.', hazards: ['Incompatible con ácidos y amoníaco.'], source: 'https://doh.wa.gov/community-and-environment/contaminants/bleach-mixing-dangers' },
  { id: 'ammonia', name: 'Amoníaco acuoso', formula: 'NH₃(ac)', family: 'Base débil / incompatibilidades', color: '#a3e635', concentrationM: 0.1, note: 'Equilibrio NH₃/NH₄⁺ a 25 °C; volatilidad no cuantificada.', hazards: ['Posible irritación y exposición a vapores.'], source: 'https://www.osha.gov/chemicaldata/623' },
  { id: 'citric', name: 'Ácido cítrico', formula: 'C₆H₈O₇', family: 'Ácido poliprótico', color: '#facc15', concentrationM: 0.1, note: 'Tres disociaciones a 25 °C; complejos y sales de citrato con calcio fuera del modelo.', hazards: ['Una mezcla desconocida no se considera segura.'], source: textbook }
];
export const chemical = (id: string) => {
  const item = CHEMICALS.find(c => c.id === id);
  if (!item) throw new Error(`Sustancia desconocida: ${id}`);
  return item;
};
export const REACTION_SOURCES = {
  equilibrium: 'https://openstax.org/books/chemistry-2e/pages/14-3-relative-strengths-of-acids-and-bases',
  precipitation: 'https://openstax.org/books/chemistry-2e/pages/j-solubility-products',
  gases: 'https://openstax.org/books/chemistry-2e/pages/9-2-relating-pressure-volume-amount-and-temperature-the-ideal-gas-law',
  incompatibility
};
