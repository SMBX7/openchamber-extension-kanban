// Local board client, the offline counterpart of PlankaClient.
//
// It implements the same surface and returns the same shapes, so the panel, the
// Work Status section, the service and the MCP server do not need to know where
// the data comes from. Each OpenChamber project owns one board file beside
// board.local.json, so switching project shows that project's board and leaves
// the others untouched; writes are atomic and serialised with a lock file
// because the service and the MCP server are different processes.
import {
  chmodSync,
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { ROOT } from './config.js';
import { DEFAULT_LIST_NAMES } from './defaults.js';
import { PlankaError } from './planka.js';

const POSITION_STEP = 65536;
const DONE_NAME = /(^|\b)(hecho|done|completad[oa]?s?|finalizad[oa]?s?|listo)(\b|$)/i;
const BOARD_ID = 'local';
const DEFAULT_LABELS = [
  { name: 'Urgente', color: 'hsl(0 62% 58%)' },
  { name: 'Importante', color: 'hsl(38 78% 58%)' },
  { name: 'Idea', color: 'hsl(210 70% 62%)' },
];

// The base path: the explicit override for tests, or board.local.json next to
// config.json. It keeps naming the board used when no project is known.
const basePath = () => process.env.KANBAN_LOCAL_PATH || join(ROOT, 'board.local.json');

// A readable, collision-free name for the file of one project. The hash keeps
// two projects with the same folder name apart.
const projectSlug = (projectKey) => {
  const text = String(projectKey || '').trim().replace(/[\\/]+$/, '');
  if (!text) return '';
  const tail = text.split(/[\\/]+/).filter(Boolean).pop() || 'proyecto';
  const readable = tail
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-.]+|-+$/g, '')
    .slice(0, 40);
  const hash = createHash('sha1').update(text).digest('hex').slice(0, 8);
  return `${readable || 'proyecto'}-${hash}`;
};

// board.local.json becomes board.local.<project>.json, always beside the base
// path so KANBAN_LOCAL_PATH keeps deciding where the boards live.
export const localBoardPath = (projectKey = '') => {
  const slug = projectSlug(projectKey);
  if (!slug) return basePath();
  const base = basePath();
  const stem = basename(base).toLowerCase().endsWith('.json')
    ? base.slice(0, -'.json'.length)
    : base;
  return join(dirname(base), `${basename(stem)}.${slug}.json`);
};

const lockPath = (projectKey) => `${localBoardPath(projectKey)}.lock`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const byPosition = (a, b) => {
  const left = Number.isFinite(a?.position) ? a.position : Number.POSITIVE_INFINITY;
  const right = Number.isFinite(b?.position) ? b.position : Number.POSITIVE_INFINITY;
  if (left !== right) return left - right;
  return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
};

const uid = (prefix) => `${prefix}-${randomUUID()}`;

const toIso = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

const emptyStore = () => ({
  version: 1,
  board: { id: BOARD_ID, name: 'Kanban local' },
  lists: DEFAULT_LIST_NAMES.map((name, index) => ({
    id: `list-${index + 1}`,
    name,
    position: (index + 1) * POSITION_STEP,
  })),
  cards: [],
  labels: DEFAULT_LABELS.map((label, index) => ({
    id: `label-${index + 1}`,
    name: label.name,
    color: label.color,
  })),
  cardLabels: [],
  taskLists: [],
  tasks: [],
});

const normaliseStore = (value) => {
  const base = emptyStore();
  const store = value && typeof value === 'object' ? value : {};
  const lists = Array.isArray(store.lists) && store.lists.length ? store.lists : base.lists;
  return {
    version: 1,
    board: {
      id: BOARD_ID,
      name: typeof store.board?.name === 'string' && store.board.name.trim() ? store.board.name.trim().slice(0, 120) : base.board.name,
    },
    lists: lists
      .filter((list) => list && list.id)
      .map((list, index) => ({
        id: String(list.id),
        name: String(list.name || `Columna ${index + 1}`).slice(0, 120),
        position: Number.isFinite(list.position) ? list.position : (index + 1) * POSITION_STEP,
      })),
    cards: (Array.isArray(store.cards) ? store.cards : [])
      .filter((card) => card && card.id && card.listId)
      .map((card) => ({
        id: String(card.id),
        listId: String(card.listId),
        name: String(card.name || 'Sin título').slice(0, 1024),
        description: typeof card.description === 'string' ? card.description : '',
        position: Number.isFinite(card.position) ? card.position : 0,
        dueDate: typeof card.dueDate === 'string' ? card.dueDate : '',
        isDueCompleted: Boolean(card.isDueCompleted),
        createdAt: Number.isFinite(card.createdAt) ? card.createdAt : Date.now(),
      })),
    labels: (Array.isArray(store.labels) ? store.labels : base.labels)
      .filter((label) => label && label.id)
      .map((label) => ({
        id: String(label.id),
        name: String(label.name || 'Etiqueta').slice(0, 120),
        color: String(label.color || 'hsl(210 20% 60%)'),
      })),
    cardLabels: (Array.isArray(store.cardLabels) ? store.cardLabels : [])
      .filter((link) => link && link.id && link.cardId && link.labelId)
      .map((link) => ({ id: String(link.id), cardId: String(link.cardId), labelId: String(link.labelId) })),
    taskLists: (Array.isArray(store.taskLists) ? store.taskLists : [])
      .filter((taskList) => taskList && taskList.id && taskList.cardId)
      .map((taskList) => ({
        id: String(taskList.id),
        cardId: String(taskList.cardId),
        name: String(taskList.name || 'Checklist').slice(0, 120),
        position: Number.isFinite(taskList.position) ? taskList.position : POSITION_STEP,
      })),
    tasks: (Array.isArray(store.tasks) ? store.tasks : [])
      .filter((task) => task && task.id && task.taskListId)
      .map((task) => ({
        id: String(task.id),
        taskListId: String(task.taskListId),
        name: String(task.name || '').slice(0, 1024),
        isCompleted: Boolean(task.isCompleted),
        position: Number.isFinite(task.position) ? task.position : POSITION_STEP,
      })),
  };
};

const writeStore = (store, target) => {
  const temp = `${target}.tmp`;
  writeFileSync(temp, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
  renameSync(temp, target);
  try {
    chmodSync(target, 0o600);
  } catch {
    // The rename already applied the mode on the platforms we support.
  }
};

// Until this version the board was one file for every project. The first
// project that opens the local board after upgrading keeps that data: its
// board file is written beside the old one and the old file is moved away, so
// no other project inherits the same cards. A second process that migrates at
// the same time writes the same content and loses nothing.
const migrateLegacyBoard = (projectKey) => {
  if (!projectSlug(projectKey)) return;
  const legacy = basePath();
  const target = localBoardPath(projectKey);
  if (existsSync(target) || !existsSync(legacy)) return;
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(legacy, 'utf8'));
  } catch {
    return;
  }
  writeStore(normaliseStore(parsed), target);
  try {
    renameSync(legacy, `${legacy}.migrated`);
  } catch {
    // The legacy file is kept: nothing is lost and the copy already exists.
  }
};

const readStore = (projectKey = '') => {
  migrateLegacyBoard(projectKey);
  try {
    return normaliseStore(JSON.parse(readFileSync(localBoardPath(projectKey), 'utf8')));
  } catch {
    return emptyStore();
  }
};

const withLock = async (projectKey, work) => {
  const lock = lockPath(projectKey);
  const deadline = Date.now() + 2500;
  let handle = null;
  while (handle === null) {
    try {
      handle = openSync(lock, 'wx');
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        if (Date.now() - statSync(lock).mtimeMs > 5000) {
          unlinkSync(lock);
          continue;
        }
      } catch {
        continue;
      }
      if (Date.now() > deadline) {
        throw new PlankaError('El tablero local está ocupado, inténtalo otra vez.', { kind: 'busy' });
      }
      await sleep(25);
    }
  }
  try {
    return await work();
  } finally {
    try {
      closeSync(handle);
    } catch {
      // Already closed.
    }
    try {
      unlinkSync(lock);
    } catch {
      // Someone else cleaned a stale lock.
    }
  }
};

const mutate = (projectKey, work) =>
  withLock(projectKey, () => {
    const store = readStore(projectKey);
    const result = work(store);
    writeStore(store, localBoardPath(projectKey));
    return result;
  });

const topPosition = (cards) => {
  const positions = cards
    .map((card) => Number(card.position))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!positions.length) return POSITION_STEP;
  const first = Math.min(...positions);
  return first > 0 ? first / 2 : 0.5;
};

const nextPosition = (rows) => {
  const positions = rows
    .map((row) => Number(row.position))
    .filter((value) => Number.isFinite(value) && value >= 0);
  return positions.length ? Math.max(...positions) + POSITION_STEP : POSITION_STEP;
};

const positionAtIndex = (cards, index, movingId) => {
  const rest = cards.filter((card) => card.id !== String(movingId)).slice().sort(byPosition);
  const target = Math.max(0, Math.min(index, rest.length));
  const previous = rest[target - 1];
  const next = rest[target];
  const previousPosition = Number(previous?.position);
  const nextPositionValue = Number(next?.position);
  if (Number.isFinite(previousPosition) && Number.isFinite(nextPositionValue)) {
    return (previousPosition + nextPositionValue) / 2;
  }
  if (Number.isFinite(nextPositionValue)) return nextPositionValue / 2;
  if (Number.isFinite(previousPosition)) return previousPosition + POSITION_STEP;
  return POSITION_STEP;
};

const findCardRow = (store, cardId) => {
  const card = store.cards.find((item) => item.id === String(cardId));
  if (!card) throw new PlankaError('Esa tarjeta ya no existe en el tablero local.', { kind: 'not-found', status: 404 });
  return card;
};

const findListRow = (store, listId) => {
  const list = store.lists.find((item) => item.id === String(listId));
  if (!list) throw new PlankaError('Esa columna ya no existe en el tablero local.', { kind: 'not-found', status: 404 });
  return list;
};

const view = (store) => {
  const lists = store.lists
    .slice()
    .sort(byPosition)
    .map((list) => ({ id: list.id, name: list.name, color: '', position: list.position, cards: [] }));
  const listsById = new Map(lists.map((list) => [list.id, list]));
  const doneList = lists.find((list) => DONE_NAME.test(list.name)) || lists[lists.length - 1] || null;

  for (const card of store.cards.slice().sort(byPosition)) {
    const list = listsById.get(card.listId);
    if (!list) continue;
    const cardTaskLists = store.taskLists
      .filter((taskList) => taskList.cardId === card.id)
      .sort(byPosition)
      .map((taskList) => {
        const cardTasks = store.tasks
          .filter((task) => task.taskListId === taskList.id)
          .sort(byPosition)
          .map((task) => ({
            id: task.id,
            name: task.name,
            isCompleted: Boolean(task.isCompleted),
            position: task.position,
          }));
        return { id: taskList.id, name: taskList.name, position: taskList.position, tasks: cardTasks };
      });
    const total = cardTaskLists.reduce((sum, taskList) => sum + taskList.tasks.length, 0);
    const done = cardTaskLists.reduce(
      (sum, taskList) => sum + taskList.tasks.filter((task) => task.isCompleted).length,
      0,
    );
    const cardLabelRows = store.cardLabels
      .filter((link) => link.cardId === card.id)
      .map((link) => {
        const label = store.labels.find((item) => item.id === link.labelId);
        return label
          ? { id: label.id, name: label.name, color: label.color, cardLabelId: link.id }
          : null;
      })
      .filter(Boolean);

    list.cards.push({
      id: card.id,
      name: card.name,
      description: card.description,
      dueDate: card.dueDate || '',
      isDueCompleted: Boolean(card.isDueCompleted),
      listId: list.id,
      position: card.position,
      labels: cardLabelRows,
      taskLists: cardTaskLists,
      checklist: { total, done },
    });
  }

  for (const list of lists) list.cards.sort(byPosition);

  const allCards = lists.flatMap((list) => list.cards);
  return {
    board: { id: store.board.id, name: store.board.name, url: '', baseUrl: '' },
    lists,
    labels: store.labels
      .slice()
      .map((label) => ({ id: label.id, name: label.name, color: label.color }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    doneListId: doneList?.id || '',
    counts: {
      total: allCards.length,
      incomplete: doneList ? allCards.filter((card) => card.listId !== doneList.id).length : allCards.length,
    },
    updatedAt: Date.now(),
  };
};

export class LocalClient {
  constructor(config = {}) {
    this.boardId = BOARD_ID;
    this.boardName = typeof config?.boardName === 'string' ? config.boardName : '';
    // The OpenChamber project this client reads and writes. Empty keeps the
    // single legacy board, which is what an unknown project must not split.
    this.projectKey = typeof config?.projectKey === 'string' ? config.projectKey.trim() : '';
  }

  async login() {
    return { token: 'local' };
  }

  async getBoards() {
    const store = readStore(this.projectKey);
    return [
      {
        id: BOARD_ID,
        name: store.board.name || 'Kanban local',
        projectId: 'local',
        position: 0,
        url: '',
      },
    ];
  }

  async resolveBoardId() {
    return BOARD_ID;
  }

  async readBoard() {
    return view(readStore(this.projectKey));
  }

  async findCard(cardId, boardId) {
    const board = await this.readBoard(boardId);
    const card = board.lists.flatMap((list) => list.cards).find((item) => item.id === String(cardId));
    if (!card) throw new PlankaError('Esa tarjeta ya no existe en el tablero local.', { kind: 'not-found', status: 404 });
    return { board, card };
  }

  async createCard(listId, name, boardId, options = {}) {
    return mutate(this.projectKey, (store) => {
      const list = findListRow(store, listId);
      const title = String(name || '').trim().slice(0, 1024);
      if (!title) throw new PlankaError('El título no puede quedar vacío.', { kind: 'validation' });
      const card = {
        id: uid('card'),
        listId: list.id,
        name: title,
        description: typeof options.description === 'string' ? options.description : '',
        position: topPosition(store.cards.filter((item) => item.listId === list.id)),
        dueDate: toIso(options.dueDate),
        isDueCompleted: false,
        createdAt: Date.now(),
      };
      store.cards.push(card);
      return card;
    });
  }

  async updateCard(cardId, patch = {}, boardId) {
    return mutate(this.projectKey, (store) => {
      const card = findCardRow(store, cardId);
      if (typeof patch.name === 'string') {
        const name = patch.name.trim();
        if (!name) throw new PlankaError('El título no puede quedar vacío.', { kind: 'validation' });
        card.name = name.slice(0, 1024);
      }
      if (patch.description !== undefined) {
        const description = typeof patch.description === 'string' ? patch.description : '';
        card.description = description.trim() ? description : '';
      }
      if (patch.dueDate !== undefined) card.dueDate = toIso(patch.dueDate);
      if (patch.isDueCompleted !== undefined) card.isDueCompleted = Boolean(patch.isDueCompleted);
      if (patch.listId !== undefined) {
        const list = findListRow(store, patch.listId);
        const index = Number.isInteger(patch.index) ? patch.index : 0;
        card.listId = list.id;
        card.position = positionAtIndex(
          store.cards.filter((item) => item.listId === list.id),
          index,
          card.id,
        );
      }
      return card;
    });
  }

  async moveCard(cardId, listId, index, boardId) {
    return mutate(this.projectKey, (store) => {
      const card = findCardRow(store, cardId);
      const list = findListRow(store, listId);
      const target = Number.isInteger(index) ? index : 0;
      card.listId = list.id;
      card.position = positionAtIndex(
        store.cards.filter((item) => item.listId === list.id),
        target,
        card.id,
      );
      return card;
    });
  }

  async completeCard(cardId, boardId) {
    return mutate(this.projectKey, (store) => {
      const card = findCardRow(store, cardId);
      const lists = store.lists.slice().sort(byPosition);
      const done = lists.find((list) => DONE_NAME.test(list.name)) || lists[lists.length - 1];
      if (!done) throw new PlankaError('Este tablero no tiene una columna HECHO.', { kind: 'validation' });
      if (card.listId === done.id) return { item: null, already: true };
      // The top position is read from the column the card is arriving in,
      // without the card itself: including it would halve the column's first
      // position and drift away from what Planka computes.
      card.position = topPosition(
        store.cards.filter((item) => item.listId === done.id && item.id !== card.id),
      );
      card.listId = done.id;
      return { item: card, already: false };
    });
  }

  async deleteCard(cardId) {
    return mutate(this.projectKey, (store) => {
      const id = String(cardId);
      store.cards = store.cards.filter((card) => card.id !== id);
      const taskLists = new Set(store.taskLists.filter((taskList) => taskList.cardId === id).map((item) => item.id));
      store.taskLists = store.taskLists.filter((taskList) => taskList.cardId !== id);
      store.tasks = store.tasks.filter((task) => !taskLists.has(task.taskListId));
      store.cardLabels = store.cardLabels.filter((link) => link.cardId !== id);
      return true;
    });
  }

  async renameList(listId, name) {
    return mutate(this.projectKey, (store) => {
      const list = findListRow(store, listId);
      const trimmed = String(name || '').trim().slice(0, 120);
      if (!trimmed) throw new PlankaError('El nombre de la columna no puede quedar vacío.', { kind: 'validation' });
      list.name = trimmed;
      return list;
    });
  }

  // Same surface as PlankaClient.createList. The position is computed inside
  // the store lock so two callers cannot append to the same slot.
  async createList(name) {
    const trimmed = String(name || '').trim().slice(0, 120);
    if (!trimmed) throw new PlankaError('La columna necesita un nombre.', { kind: 'validation' });
    return mutate(this.projectKey, (store) => {
      const list = {
        id: uid('list'),
        name: trimmed,
        position: nextPosition(store.lists),
      };
      store.lists.push(list);
      return { id: list.id, name: list.name, color: '', position: list.position, cards: [] };
    });
  }

  async addChecklist(cardId, name, boardId, tasks = []) {
    return mutate(this.projectKey, (store) => {
      const card = findCardRow(store, cardId);
      const taskList = {
        id: uid('checklist'),
        cardId: card.id,
        name: String(name || 'Checklist').trim().slice(0, 120) || 'Checklist',
        position: nextPosition(store.taskLists.filter((item) => item.cardId === card.id)),
      };
      store.taskLists.push(taskList);
      const added = [];
      let position = POSITION_STEP;
      for (const taskName of tasks) {
        const trimmed = String(taskName || '').trim();
        if (!trimmed) continue;
        const task = {
          id: uid('task'),
          taskListId: taskList.id,
          name: trimmed.slice(0, 1024),
          isCompleted: false,
          position,
        };
        position += POSITION_STEP;
        store.tasks.push(task);
        added.push(task);
      }
      return { taskList, tasks: added };
    });
  }

  // Same surface as PlankaClient.addTask: the board is the store this client
  // already holds, so the third argument is accepted and unused.
  async addTask(taskListId, name, boardId) {
    return mutate(this.projectKey, (store) => {
      const taskList = store.taskLists.find((item) => item.id === String(taskListId));
      if (!taskList) throw new PlankaError('Esa checklist ya no existe.', { kind: 'not-found', status: 404 });
      const task = {
        id: uid('task'),
        taskListId: taskList.id,
        name: String(name || '').trim().slice(0, 1024),
        isCompleted: false,
        position: nextPosition(store.tasks.filter((item) => item.taskListId === taskList.id)),
      };
      store.tasks.push(task);
      return task;
    });
  }

  async checkTask(taskId, isCompleted) {
    return mutate(this.projectKey, (store) => {
      const task = store.tasks.find((item) => item.id === String(taskId));
      if (!task) throw new PlankaError('Esa tarea ya no existe.', { kind: 'not-found', status: 404 });
      task.isCompleted = Boolean(isCompleted);
      return task;
    });
  }

  async addLabel(cardId, labelId) {
    return mutate(this.projectKey, (store) => {
      const card = findCardRow(store, cardId);
      const label = store.labels.find((item) => item.id === String(labelId));
      if (!label) throw new PlankaError('Esa etiqueta ya no existe.', { kind: 'not-found', status: 404 });
      const existing = store.cardLabels.find((link) => link.cardId === card.id && link.labelId === label.id);
      if (existing) return existing;
      const link = { id: uid('cardlabel'), cardId: card.id, labelId: label.id };
      store.cardLabels.push(link);
      return link;
    });
  }

  async removeLabel(cardId, labelId, boardId) {
    return mutate(this.projectKey, (store) => {
      const before = store.cardLabels.length;
      store.cardLabels = store.cardLabels.filter(
        (link) => !(link.cardId === String(cardId) && link.labelId === String(labelId)),
      );
      return store.cardLabels.length !== before;
    });
  }

  async toggleLabel(cardId, labelId, boardId) {
    const store = readStore(this.projectKey);
    const has = store.cardLabels.some(
      (link) => link.cardId === String(cardId) && link.labelId === String(labelId),
    );
    if (has) {
      await this.removeLabel(cardId, labelId, boardId);
      return false;
    }
    await this.addLabel(cardId, labelId);
    return true;
  }
}

const csvCell = (value) => {
  const text = String(value ?? '').replace(/"/g, '""');
  return /[",\n]/.test(text) ? `"${text}"` : text;
};

const storeRows = (store) => {
  const lists = store.lists.slice().sort(byPosition);
  const doneId = (lists.find((list) => DONE_NAME.test(list.name)) || lists[lists.length - 1])?.id;
  return lists.map((list) => ({
    list,
    cards: store.cards
      .filter((card) => card.listId === list.id)
      .sort(byPosition)
      .map((card) => {
        const taskLists = store.taskLists.filter((taskList) => taskList.cardId === card.id);
        const tasks = store.tasks.filter((task) => taskLists.some((taskList) => taskList.id === task.taskListId));
        return {
          card,
          done: list.id === doneId,
          labels: store.cardLabels
            .filter((link) => link.cardId === card.id)
            .map((link) => store.labels.find((label) => label.id === link.labelId)?.name)
            .filter(Boolean),
          total: tasks.length,
          checked: tasks.filter((task) => task.isCompleted).length,
        };
      }),
  }));
};

const toMarkdown = (store) => {
  const lines = [`# ${store.board.name}`, ''];
  for (const { list, cards } of storeRows(store)) {
    lines.push(`## ${list.name} (${cards.length})`, '');
    if (!cards.length) lines.push('_Sin tarjetas._', '');
    for (const { card, done, labels, total, checked } of cards) {
      lines.push(`- [${done ? 'x' : ' '}] ${card.name}`);
      if (card.description.trim()) lines.push(`  - ${card.description.replace(/\n/g, ' ').trim()}`);
      if (labels.length) lines.push(`  - Etiquetas: ${labels.join(', ')}`);
      if (total) lines.push(`  - Checklist: ${checked}/${total}`);
      if (card.dueDate) lines.push(`  - Fecha: ${card.dueDate.slice(0, 10)}`);
      lines.push('');
    }
  }
  return `${lines.join('\n')}\n`;
};

const toCsv = (store) => {
  const rows = [['lista', 'estado', 'tarjeta', 'descripcion', 'etiquetas', 'checklist_hechas', 'checklist_total', 'fecha']];
  for (const { list, cards } of storeRows(store)) {
    for (const { card, done, labels, total, checked } of cards) {
      rows.push([
        list.name,
        done ? 'hecha' : 'pendiente',
        card.name,
        card.description,
        labels.join('; '),
        checked,
        total,
        card.dueDate ? card.dueDate.slice(0, 10) : '',
      ]);
    }
  }
  return `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
};

export const exportBoard = (format = 'json', projectKey = '') => {
  const store = readStore(projectKey);
  if (format === 'md') return toMarkdown(store);
  if (format === 'csv') return toCsv(store);
  return `${JSON.stringify(store, null, 2)}\n`;
};

export const importBoard = async (raw, projectKey = '') => {
  let parsed;
  try {
    parsed = JSON.parse(String(raw || ''));
  } catch {
    throw new PlankaError('Ese texto no es un tablero válido.', { kind: 'validation' });
  }
  if (!parsed || !Array.isArray(parsed.lists) || !parsed.lists.length) {
    throw new PlankaError('Ese tablero no tiene columnas.', { kind: 'validation' });
  }
  const store = normaliseStore(parsed);
  // Import is the last writer that skipped the cross-process lock.
  await withLock(projectKey, () => writeStore(store, localBoardPath(projectKey)));
  return view(store);
};

export const LOCAL_BOARD_ID = BOARD_ID;
