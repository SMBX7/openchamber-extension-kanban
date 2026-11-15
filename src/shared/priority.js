// IDEAS priority: a weighted read of each card's text. No model, no session:
// the classification is deterministic and happens inside the panel.
//
// Three levels, in the order anyone would explain them: something is broken,
// then something should improve, then a detail. A parity problem (local vs
// Planka) is a broken thing, not a level of its own.
export const PRIORITY_LEVELS = [
  {
    key: 'broken',
    label: 'No funciona',
    hint: 'Errores, algo roto o que no deja seguir',
    // A broken thing wins on its own, however many interface words the card
    // carries.
    weight: 3,
    pattern:
      /\b(rompe|rompen|roto|rota|fallo|fallos|falla|fallas|error|errores|bug|bugs|crash|congela|congelado|bloquea|bloqueado|bloqueada|imposible|se pierde|se pasa|se mueve|se queda|se cierra|salta|vuelve a|en vez de|deberia|no deja|no me deja|no funciona|no guarda|no carga|no abre|no se puede|no puedo|no responde|no aparece|no se ve|desaparece)\b/g,
    // A local/Planka difference is broken too, but it ranks below an explicit
    // failure: it only promotes the card to this level.
    extra:
      /\b(planka|local|paridad|paralelo|sincroniz\w*|servidor|remoto|dos modos|modo local|mismo comportamiento|tambien en|igual en|los dos|ambos)\b/g,
  },
  {
    key: 'improve',
    label: 'Mejorar',
    hint: 'Cambios de interfaz, mejoras y cosas nuevas',
    weight: 1.5,
    pattern:
      /\b(ux|usabilidad|interfaz|experiencia|diseno|visual|pantalla|panel|lateral|ventana|boton|botones|clic|clics|arrastr\w*|mover|ordenar|filtrado|filtro|complicad\w*|lio|lioso|confus\w*|entiendo|entiende|accesib\w*|movil|responsive|columna|columnas|quiero|anadir|agregar|mejorar|mejora|cambiar|cambio|nuevo|nueva|opcion|opciones|dame)\b/g,
  },
  {
    key: 'detail',
    label: 'Detalle',
    hint: 'Limpieza, textos y documentación',
    weight: 1,
    pattern:
      /\b(refactor\w*|arquitectura|arquitect\w*|codigo|limpia\w*|limpiar|duplicad\w*|rendimiento|lento|test|tests|pruebas|documentacion|readme|docs|index|indice|guia|estructura|nombres|pulir|pulido|deuda|mantener|json|persist\w*|almacen\w*|migrac\w*|guard\w*)\b/g,
  },
];

export const PRIORITY_UNCLASSIFIED = PRIORITY_LEVELS.length;

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const hits = (text, pattern) => (text.match(pattern) || []).length;

// A signal in the title weighs double: it is what the person had in mind.
// "No funciona" is a gate; below it, the weighted score decides between
// improving and a detail, and the first level breaks a tie.
export const classifyPriority = (card) => {
  const title = normalizeText(card?.name);
  const body = normalizeText(card?.description);
  const scores = PRIORITY_LEVELS.map((criterion) => {
    const base = criterion.weight * (2 * hits(title, criterion.pattern) + hits(body, criterion.pattern));
    if (!criterion.extra) return base;
    const extra = 2 * hits(title, criterion.extra) + hits(body, criterion.extra);
    return base > 0 ? base + extra : extra > 0 ? 1 : 0;
  });
  let level = 0;
  if (scores[0] === 0) {
    level = PRIORITY_UNCLASSIFIED;
    for (let index = 1; index < scores.length; index += 1) {
      if (scores[index] > 0 && (level === PRIORITY_UNCLASSIFIED || scores[index] > scores[level])) {
        level = index;
      }
    }
  }
  const criterion = PRIORITY_LEVELS[level];
  return {
    level,
    key: criterion?.key || '',
    label: criterion?.label || '',
    score: scores[level] || 0,
    unclassified: level === PRIORITY_UNCLASSIFIED,
  };
};

// Same level: more signals first. Otherwise the card keeps its place, so the
// sort never shuffles cards that say nothing.
export const sortCardsByPriority = (cards) =>
  (Array.isArray(cards) ? cards : [])
    .map((card, index) => ({ card, index, priority: classifyPriority(card) }))
    .sort(
      (a, b) =>
        a.priority.level - b.priority.level ||
        b.priority.score - a.priority.score ||
        a.index - b.index,
    )
    .map((entry) => entry.card);

export const prioritySummary = (cards) => {
  const counts = Object.fromEntries(PRIORITY_LEVELS.map((criterion) => [criterion.key, 0]));
  let unclassified = 0;
  for (const card of Array.isArray(cards) ? cards : []) {
    const priority = classifyPriority(card);
    if (priority.unclassified) unclassified += 1;
    else counts[priority.key] += 1;
  }
  return { counts, unclassified, total: Array.isArray(cards) ? cards.length : 0 };
};
