// A batch is one session that works several cards: the main agent delegates
// each card to a subagent and reviews what comes back. In automatic mode it
// also moves the card to HECHO and summarises; in manual it leaves the card in
// EN PROGRESO and the person closes. The extension only decides which session
// is reused and which cards belong to it; the delegation is the agent's job.

const cardBlock = (card) => {
  const checklist = (card?.taskLists || [])
    .flatMap((taskList) => taskList.tasks.map((task) => `- ${task.name}`))
    .slice(0, 12);
  return [
    `Tarjeta: «${card?.name || 'sin título'}» (id ${card?.id || ''})`,
    card?.description ? `Descripción: ${card.description}` : '',
    checklist.length ? `Checklist:\n${checklist.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
};

// Rules shared by the first card and every card added later. The main agent
// never implements a card itself: it hands it to a subagent. In manual mode it
// also stops before HECHO: the person reviews and closes.
const batchRules = (manual) =>
  [
    'Reglas del lote: cada tarjeta la trabaja un subagente, no tú.',
    'Revisa el resultado del subagente antes de dar la tarjeta por buena; si no convence, pídele otra pasada.',
    manual
      ? 'Cuando la tarjeta esté verificada, déjala en EN PROGRESO y avisa de que está lista para revisar. No la muevas a HECHO: lo hará la persona.'
      : 'Solo cuando esté bien implementada y verificada, mueve la tarjeta a HECHO con kanban_complete_card.',
    'No toques las tarjetas que ya están en HECHO.',
    manual
      ? 'No des el resumen del lote ni cierres la sesión por tu cuenta: la persona te lo pedirá cuando haya revisado las tarjetas.'
      : 'Al final del lote, cuando todas las tarjetas estén en HECHO, revisa el conjunto y da un resumen de lo que hizo cada subagente.',
  ].join('\n');

export const batchStartPrompt = (card, board, project, { manual = false } = {}) => [
  `Trabaja las tarjetas del kanban «${board?.name || ''}» desde esta misma sesión, una por una.`,
  `Proyecto: ${project.name}.`,
  cardBlock(card),
  batchRules(manual),
  'Las tarjetas que se lancen después se añaden a esta misma sesión.',
]
  .filter(Boolean)
  .join('\n\n');

export const batchCardPrompt = (card, board, project, { manual = false } = {}) => [
  `Trabaja esta tarjeta del lote de «${board?.name || ''}».`,
  `Proyecto: ${project.name}.`,
  cardBlock(card),
  batchRules(manual),
]
  .filter(Boolean)
  .join('\n\n');

export const batchClosePrompt = () =>
  'Todas las tarjetas del lote están en HECHO. Revisa el conjunto, confirma que todo quedó bien implementado y da un resumen de lo que hizo cada subagente. Deja el resumen en esta sesión y no la cierres.';

// Cards that belong to one batch session, with the ones still outside HECHO.
// The column comes from the list that holds the card, so the rule holds for
// both the Planka snapshot and the local board. A card deleted meanwhile is
// simply not found and does not keep the batch open.
export const batchCards = (links, snapshot, sessionId) => {
  const doneId = String(snapshot?.doneListId || '');
  const byId = new Map();
  for (const list of snapshot?.lists || []) {
    for (const card of list.cards || []) {
      byId.set(String(card.id), { id: String(card.id), done: doneId !== '' && String(list.id) === doneId });
    }
  }
  const entries = Object.entries(links || {}).filter(
    ([, link]) => link?.batch === true && link.sessionId === String(sessionId || ''),
  );
  const cards = entries.map(([cardId]) => byId.get(String(cardId)) || null).filter(Boolean);
  return { total: entries.length, cards, open: cards.filter((card) => !card.done) };
};

export const batchAllDone = (links, snapshot, sessionId) => {
  const { total, cards, open } = batchCards(links, snapshot, sessionId);
  return total > 0 && cards.length > 0 && open.length === 0;
};

// The session a new card should join: the newest batch on this board with the
// same mode that still has a card outside HECHO. Manual and automatic batches
// never mix, because their rules for HECHO are opposite. When every batch is
// closed, the next card opens a fresh one.
export const reusableBatchSession = (links, snapshot, { manual = false } = {}) => {
  const boardId = String(snapshot?.board?.id || '');
  const candidates = new Map();
  for (const [, link] of Object.entries(links || {})) {
    if (link?.batch !== true) continue;
    if ((link.manual === true) !== manual) continue;
    if (String(link.boardId || '') !== boardId) continue;
    const previous = candidates.get(link.sessionId);
    const at = String(link.linkedAt || '');
    if (!previous || at > previous.at) candidates.set(link.sessionId, { at, sessionId: link.sessionId });
  }
  for (const { sessionId } of [...candidates.values()].sort((a, b) => (a.at < b.at ? 1 : -1))) {
    const { total, open } = batchCards(links, snapshot, sessionId);
    if (total > 0 && open.length > 0) return sessionId;
  }
  return '';
};
