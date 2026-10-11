// Default House data. Every field can be overridden from the page (Webflow CMS) via
// [data-house-key] elements, see readHousesFromDOM(). House names are WORKING PROPOSALS
// to be finalized with students, families and staff (community co-design).
export const DEFAULT_HOUSES = [
  {
    key: 'lumiere',
    name: 'Lumière',
    language: 'French',
    meaning: 'light',
    say: 'loo-mee-AIR',
    color: '#0FD1EB',
    ink: '#000000',
    pillar: 'Think Critically',
    blurb: 'Members of Lumière bring light to hard questions. They look closely, test ideas against evidence, and never stop asking why.',
    traits: ['Curious', 'Analytical', 'Reflective'],
  },
  {
    key: 'pluma',
    name: 'Pluma',
    language: 'Spanish',
    meaning: 'feather · pen',
    say: 'PLOO-mah',
    color: '#FCD615',
    ink: '#000000',
    pillar: 'Write Powerfully',
    blurb: 'In Spanish, pluma means both feather and pen. Members of Pluma read deeply, write with clarity, and speak with confidence and purpose.',
    traits: ['Expressive', 'Clear', 'Persuasive'],
  },
  {
    key: 'igboya',
    name: 'Ìgboyà',
    language: 'Yoruba',
    meaning: 'courage',
    say: 'ee-gboh-YAH',
    color: '#FCA00C',
    ink: '#000000',
    pillar: 'Advocate Boldly',
    blurb: 'Members of Ìgboyà stand up and speak up. They study the issue, listen first, and act with courage for themselves and their communities.',
    traits: ['Brave', 'Principled', 'Action-ready'],
  },
  {
    key: 'umoja',
    name: 'Umoja',
    language: 'Swahili',
    meaning: 'unity',
    say: 'oo-MOH-jah',
    color: '#111111',
    ink: '#FFFFFF',
    pillar: 'Belong Together',
    blurb: 'Umoja is the black of every REA feather, the base that holds all the colors together. Members of Umoja build belonging and make sure every voice is heard.',
    traits: ['Loyal', 'Supportive', 'Community-minded'],
  },
];

/** Merge defaults with [data-house-key][data-house-name] elements on the page (first element per key wins). */
export function readHousesFromDOM(root = document) {
  const byKey = new Map(DEFAULT_HOUSES.map((h) => [h.key, { ...h }]));
  const seen = new Set();
  root.querySelectorAll('[data-house-key][data-house-name]').forEach((el) => {
    const d = el.dataset;
    if (seen.has(d.houseKey)) return;
    seen.add(d.houseKey);
    const h = byKey.get(d.houseKey) || { key: d.houseKey, color: '#cccccc', ink: '#000000', traits: [] };
    h.name = d.houseName;
    if (d.houseColor) h.color = d.houseColor;
    if (d.houseInk) h.ink = d.houseInk;
    if (d.houseMeaning) h.meaning = d.houseMeaning;
    if (d.houseLanguage) h.language = d.houseLanguage;
    byKey.set(d.houseKey, h);
  });
  return [...byKey.values()].slice(0, 4);
}
