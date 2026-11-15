// IDEAS sort by size: how much work a card looks like. No model, no session:
// the read is deterministic and happens inside the panel. A card with no size
// signal is a normal change and keeps its place in the middle.
const QUICK =
  /\b(readme|docs|documentacion|texto|textos|titulo|titulos|nombre|nombres|etiqueta|etiquetas|color|colores|icono|iconos|indice|index|typo|renombrar|alinear|margen|espacio|pequen\w*|simple|rapido|rapida|minimo|quitar|ocultar|mostrar)\b/g;

const BIG =
  /\b(redisen\w*|reescrib\w*|reescritura|refactor\w*|arquitectura|migrac\w*|integrac\w*|inteligencia artificial|nuevo modo|desde cero|todo el panel|toda la interfaz|panel completo|flujo completo|sistema|complejo|compleja|rehacer|interfaz|panel|pantalla|columna|columnas|ventana|lateral)\b/g;

export const WORK_LEVELS = [
  { key: 'quick', label: 'Rápido' },
  { key: 'medium', label: 'Medio' },
  { key: 'big', label: 'Complejo' },
];

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const hits = (text, pattern) => (text.match(pattern) || []).length;

// A signal in the title weighs double: it is what the person had in mind.
export const classifyWork = (card) => {
  const title = normalizeText(card?.name);
  const body = normalizeText(card?.description);
  const quick = 2 * hits(title, QUICK) + hits(body, QUICK);
  const big = 2 * hits(title, BIG) + hits(body, BIG);
  const level = big > quick ? 2 : quick > big ? 0 : 1;
  const criterion = WORK_LEVELS[level];
  return { level, key: criterion.key, label: criterion.label, quick, big };
};

// 'quick' puts the small work first, 'big' the large work first. Same level:
// more signals first; otherwise the card keeps its place.
export const sortCardsByWork = (cards, direction = 'quick') => {
  const sign = direction === 'big' ? -1 : 1;
  return (Array.isArray(cards) ? cards : [])
    .map((card, index) => ({ card, index, work: classifyWork(card) }))
    .sort((a, b) => {
      const levelDiff = a.work.level - b.work.level;
      if (levelDiff) return sign * levelDiff;
      const aScore = direction === 'big' ? a.work.big : a.work.quick;
      const bScore = direction === 'big' ? b.work.big : b.work.quick;
      return bScore - aScore || a.index - b.index;
    })
    .map((entry) => entry.card);
};
