// Rows for the composer's `@` menu. The chat asks the service for cards and the
// picked row becomes a text the agent reads. The host sends back only the row
// id, so the id has to carry the board (or the local project) and the card.
import { workListFor } from './defaults.js';

export const MENTION_ITEMS_MAX = 20;
export const MENTION_TITLE_MAX = 120;
export const MENTION_ID_MAX = 256;
export const MENTION_TEXT_MAX = 16000;

const clip = (value, max) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

export const mentionId = ({ source, boardId, directory, cardId }) => {
  const base =
    source === 'local'
      ? `l:${Buffer.from(String(directory || '')).toString('base64url')}`
      : `p:${String(boardId || '')}`;
  const id = `${base}:${String(cardId || '')}`;
  return id.length <= MENTION_ID_MAX ? id : '';
};

export const parseMentionId = (value) => {
  const parts = String(value || '').split(':');
  if (parts.length < 3 || !parts[2]) return null;
  if (parts[0] === 'p' && parts[1]) return { source: 'planka', boardId: parts[1], cardId: parts[2] };
  if (parts[0] === 'l' && parts[1]) {
    try {
      const directory = Buffer.from(parts[1], 'base64url').toString();
      if (!directory) return null;
      return { source: 'local', directory, cardId: parts[2] };
    } catch {
      return null;
    }
  }
  return null;
};

// The cards the menu offers: the work column first, then the backlog, each
// card with its column as the subtitle so the two groups never blur together.
// A card in DONE is finished and stays out; an empty query lists what is left.
export const mentionItems = (board, query, origin) => {
  const needle = String(query || '').trim().toLowerCase();
  const lists = Array.isArray(board?.lists) ? board.lists : [];
  const work = workListFor(board);
  const ordered = work
    ? [work, ...lists.filter((list) => String(list.id) !== String(work.id))]
    : lists;
  const items = [];
  for (const list of ordered) {
    if (String(list.id) === String(board?.doneListId || '')) continue;
    for (const card of list.cards || []) {
      const haystack = `${card.name}\n${card.description}`.toLowerCase();
      if (needle && !haystack.includes(needle)) continue;
      const id = mentionId({ ...origin, cardId: card.id });
      if (!id) continue;
      items.push({
        id,
        title: clip(card.name, MENTION_TITLE_MAX),
        subtitle: clip(list.name, MENTION_TITLE_MAX),
      });
      if (items.length >= MENTION_ITEMS_MAX) return items;
    }
  }
  return items;
};

// What the picked chip gives the agent: enough to find the card and work it
// without opening the panel.
export const mentionText = (card, listName, boardName) => {
  const checklist = (card?.taskLists || [])
    .flatMap((taskList) => taskList.tasks.map((task) => `- ${task.name}`))
    .slice(0, 12);
  return [
    `Tarjeta del kanban «${boardName || ''}»: «${card?.name || ''}» (id ${card?.id || ''}${
      listName ? `, columna ${listName}` : ''
    }).`,
    card?.description ? `Descripción: ${card.description}` : '',
    checklist.length ? `Checklist:\n${checklist.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, MENTION_TEXT_MAX);
};
