// Default board structure shared by the local board, the service and the panel.
// The three columns are the only structure the extension guarantees; when a
// board arrives without them (a Planka board created empty), they can be
// created from the extension instead of sending the person to Planka.

export const DEFAULT_LIST_NAMES = ['IDEAS', 'EN PROGRESO', 'HECHO'];

export const POSITION_STEP = 65536;

// Creates the default columns that are missing, by name. Existing columns are
// never duplicated or renamed, so the call is safe to repeat from the panel and
// from the Work Status section at the same time.
export const ensureDefaultLists = async (client, boardId) => {
  const board = await client.readBoard(boardId);
  const present = new Set(
    (board.lists || []).map((list) => String(list.name || '').trim().toUpperCase()),
  );
  const missing = DEFAULT_LIST_NAMES.filter((name) => !present.has(name));
  if (!missing.length) return { created: [], board };

  let position =
    (board.lists || []).reduce((max, list) => Math.max(max, Number(list.position) || 0), 0) +
    POSITION_STEP;
  const created = [];
  for (const name of missing) {
    created.push(await client.createList(name, boardId, position));
    position += POSITION_STEP;
  }
  return { created, board: await client.readBoard(boardId) };
};
