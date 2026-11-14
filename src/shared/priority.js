// IDEAS priority: a weighted read of each card's text. No model, no session:
// the classification is deterministic and happens inside the panel.
export const PRIORITY_LEVELS = [
  {
    key: 'flow',
    label: 'Fallos que rompen el flujo',
    hint: 'Rompe, no deja, se pierde, error…',
    // A bug costs more than any amount of interface wording, so one flow
    // signal beats several UX words.
    weight: 3,
    pattern:
      /\b(rompe|rompen|roto|rota|fallo|fallos|falla|fallas|error|errores|bug|bugs|crash|congela|congelado|bloquea|bloqueado|bloqueada|imposible|se pierde|se pasa|se mueve|se queda|se cierra|salta|vuelve a|en vez de|deberia|no deja|no me deja|no funciona|no guarda|no carga|no abre|no se puede|no puedo|no responde|no aparece|no se ve|desaparece)\b/g,
  },
  {
    key: 'parity',
    label: 'Paridad local/Planka',
    hint: 'Local, Planka, servidor, sincronizar…',
    weight: 2,
    pattern:
      /\b(planka|local|paridad|paralelo|sincroniz\w*|servidor|remoto|nube|dos modos|modo local|mismo comportamiento|tambien en|igual en|los dos|ambos)\b/g,
  },
  {
    key: 'ux',
    label: 'UX grande',
    hint: 'Interfaz, panel, botones, arrastrar…',
    weight: 1.5,
    pattern:
      /\b(ux|usabilidad|interfaz|experiencia|diseno|visual|pantalla|panel|lateral|ventana|boton|botones|clic|clics|arrastr\w*|mover|ordenar|filtrado|complicad\w*|lio|lioso|confus\w*|entiendo|entiende|accesib\w*|movil|responsive|columna|columnas)\b/g,
  },
  {
    key: 'polish',
    label: 'Pulido y arquitectura',
    hint: 'Refactor, código, tests, rendimiento…',
    weight: 1,
    pattern:
      /\b(refactor\w*|arquitectura|arquitect\w*|codigo|limpia\w*|limpiar|duplicad\w*|rendimiento|lento|test|tests|pruebas|documentacion|readme|docs|indice|guia|estructura|nombres|pulir|pulido|deuda|mantener|json|persist\w*|almacen\w*|migrac\w*|guard\w*)\b/g,
  },
];

export const PRIORITY_UNCLASSIFIED = PRIORITY_LEVELS.length;

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const hits = (text, pattern) => (text.match(pattern) || []).length;

// A bug wins on its own: the four criteria are a hierarchy, and "fallos que
// rompen el flujo" is the first one. One signal there beats any amount of UX
// wording. The remaining levels score their words, so more signals or a signal
// in the title weigh more; the first level breaks a tie.
export const classifyPriority = (card) => {
  const title = normalizeText(card?.name);
  const body = normalizeText(card?.description);
  const scores = PRIORITY_LEVELS.map(
    (criterion) => criterion.weight * (2 * hits(title, criterion.pattern) + hits(body, criterion.pattern)),
  );
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
