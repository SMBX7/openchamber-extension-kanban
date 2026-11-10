// Planka 1.x/2.x HTTP client shared by the service and the MCP server.
// Planka stays the only source of truth: nothing is cached on disk except the
// access token.
import { DEFAULT_BASE_URL } from './config.js';

const POSITION_STEP = 65536;
const DONE_NAME = /(^|\b)(hecho|done|completad[oa]?s?|finalizad[oa]?s?|listo)(\b|$)/i;

export class PlankaError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'PlankaError';
    this.kind = options.kind || 'api';
    this.status = options.status || 0;
    this.step = options.step || '';
    this.code = options.code || '';
  }
}

const byPosition = (a, b) => {
  const left = Number.isFinite(a?.position) ? a.position : Number.POSITIVE_INFINITY;
  const right = Number.isFinite(b?.position) ? b.position : Number.POSITIVE_INFINITY;
  if (left !== right) return left - right;
  return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
};

const textOf = (value) => (typeof value === 'string' ? value : '');

const messageFrom = (data, fallback) => {
  if (!data || typeof data !== 'object') return fallback;
  if (typeof data.message === 'string' && data.message) return data.message;
  if (Array.isArray(data.problems) && data.problems.length) return data.problems.join(' · ');
  return fallback;
};

const normaliseBaseUrl = (value) => {
  const raw = textOf(value).trim() || DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, '');
};

const encode = (value) => encodeURIComponent(String(value));

const dueTimestamp = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const labelColor = (name) => {
  const palette = textOf(name) || 'label';
  let hash = 0;
  for (let index = 0; index < palette.length; index += 1) {
    hash = (hash * 31 + palette.charCodeAt(index)) % 360;
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue} 58% 62%)`;
};

export class PlankaClient {
  constructor(config, options = {}) {
    this.baseUrl = normaliseBaseUrl(config?.baseUrl);
    this.token = textOf(config?.token);
    this.email = textOf(config?.email);
    this.password = textOf(options.password);
    this.onToken = typeof options.onToken === 'function' ? options.onToken : null;
    this.reauthing = null;
  }

  async request(path, options = {}) {
    const method = options.method || 'GET';
    const auth = options.auth !== false;
    const retry = options.retry !== false;

    const headers = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.basic) headers.Authorization = `Basic ${options.basic}`;
    else if (auth && this.token) headers.Authorization = `Bearer ${this.token}`;

    let response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: AbortSignal.timeout(options.timeout || 15000),
      });
    } catch (error) {
      throw new PlankaError(
        error?.name === 'TimeoutError' || error?.name === 'AbortError'
          ? 'Planka no ha respondido a tiempo.'
          : 'No se puede conectar con Planka.',
        { kind: 'network' },
      );
    }

    const raw = await response.text();
    let data = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = { message: raw.slice(0, 300) };
      }
    }

    if (response.status === 401 && auth && retry && this.password) {
      await this.relogin();
      return this.request(path, { ...options, retry: false });
    }

    if (!response.ok) {
      const step = textOf(data?.step);
      const message = messageFrom(data, `Planka ha respondido ${response.status}.`);
      if (response.status === 403 && (step === 'accept-terms' || /terms|t[eé]rminos/i.test(message))) {
        throw new PlankaError(
          'Planka pide aceptar los términos: entra una vez en Planka y vuelve a intentarlo.',
          { kind: 'terms', status: 403, step, code: textOf(data?.code) },
        );
      }
      if (response.status === 403 && (step === 'verify-totp' || /totp/i.test(message))) {
        throw new PlankaError('Planka pide el código de doble factor. Entra en Planka y vuelve a intentarlo.', {
          kind: 'totp',
          status: 403,
          step,
        });
      }
      if (response.status === 401) {
        if (options.basic) {
          throw new PlankaError('Correo o contraseña incorrectos.', {
            kind: 'credentials',
            status: 401,
            code: textOf(data?.code),
          });
        }
        throw new PlankaError('La sesión de Planka ha caducado. Vuelve a entrar en Kanban.', {
          kind: 'auth',
          status: 401,
          code: textOf(data?.code),
        });
      }
      throw new PlankaError(message, {
        kind: 'api',
        status: response.status,
        code: textOf(data?.code),
      });
    }

    return data;
  }

  async login() {
    if (!this.email || !this.password) {
      throw new PlankaError('Hacen falta el correo y la contraseña de Planka.', { kind: 'credentials' });
    }
    // This Planka wants emailOrUsername/password in the body; 1.x wanted Basic.
    // Send both so one package works on either.
    const basic = Buffer.from(`${this.email}:${this.password}`).toString('base64');
    // This Planka wants emailOrUsername/password in the body; 1.x wanted Basic.
    // Sending both makes one package work on either.
    let data;
    try {
      data = await this.request('/api/access-tokens', {
        method: 'POST',
        auth: false,
        basic,
        body: { emailOrUsername: this.email, password: this.password },
        timeout: 15000,
      });
    } catch (error) {
      // A Planka that rejects the body fields takes the 1.x Basic-only flow.
      if (!(error instanceof PlankaError) || error.status !== 400) throw error;
      data = await this.request('/api/access-tokens', {
        method: 'POST',
        auth: false,
        basic,
        body: {},
        timeout: 15000,
      });
    }

    const token = typeof data?.item === 'string' ? data.item : '';
    if (!token) {
      throw new PlankaError('Planka no ha devuelto un token de acceso.', { kind: 'credentials' });
    }
    this.token = token;
    if (this.onToken) this.onToken(token);
    return token;
  }

  async relogin() {
    if (!this.password) {
      throw new PlankaError('La sesión de Planka ha caducado. Vuelve a entrar en Kanban.', { kind: 'auth' });
    }
    if (!this.reauthing) {
      this.reauthing = this.login().finally(() => {
        this.reauthing = null;
      });
    }
    return this.reauthing;
  }

  async getBoards() {
    const data = await this.request('/api/projects');
    const boards = Array.isArray(data?.included?.boards) ? data.included.boards : [];
    const seen = new Set();
    return boards
      .filter((board) => board && board.id && !seen.has(board.id) && seen.add(board.id))
      .map((board) => ({
        id: String(board.id),
        name: textOf(board.name) || 'Tablero',
        projectId: String(board.projectId || ''),
        position: Number.isFinite(board.position) ? board.position : 0,
        url: `${this.baseUrl}/boards/${board.id}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  async resolveBoardId(boardId) {
    if (boardId) return String(boardId);
    const boards = await this.getBoards();
    if (!boards.length) {
      throw new PlankaError('Tu usuario de Planka no tiene tableros.', { kind: 'empty' });
    }
    return boards[0].id;
  }

  async readBoard(boardId) {
    const data = await this.request(`/api/boards/${encode(boardId)}`);
    return normaliseBoard(data, this.baseUrl, boardId);
  }

  async findCard(cardId, boardId) {
    const board = await this.readBoard(boardId);
    const card = flattenCards(board).find((item) => item.id === String(cardId));
    if (!card) throw new PlankaError('Esa tarjeta ya no existe en Planka.', { kind: 'not-found', status: 404 });
    return { board, card };
  }

  async createCard(listId, name, boardId, options = {}) {
    const board = await this.readBoard(boardId);
    const list = board.lists.find((item) => item.id === String(listId));
    if (!list) throw new PlankaError('Esa columna ya no existe en Planka.', { kind: 'not-found', status: 404 });
    const position = topPosition(list.cards);
    const data = await this.request(`/api/lists/${encode(listId)}/cards`, {
      method: 'POST',
      body: {
        type: 'project',
        name: String(name || '').trim().slice(0, 1024),
        position,
        ...(options.description ? { description: String(options.description) } : {}),
        ...(options.dueDate ? { dueDate: dueTimestamp(options.dueDate) } : {}),
      },
    });
    return data?.item ?? null;
  }

  async updateCard(cardId, patch, boardId) {
    const body = {};
    if (typeof patch.name === 'string') {
      const name = patch.name.trim();
      if (!name) throw new PlankaError('El título no puede quedar vacío.', { kind: 'validation' });
      body.name = name.slice(0, 1024);
    }
    if (patch.description !== undefined) {
      const description = typeof patch.description === 'string' ? patch.description : '';
      body.description = description.trim() ? description : null;
    }
    if (patch.dueDate !== undefined) body.dueDate = dueTimestamp(patch.dueDate);
    if (patch.isDueCompleted !== undefined) body.isDueCompleted = Boolean(patch.isDueCompleted);

    if (patch.listId !== undefined) {
      const board = await this.readBoard(boardId);
      const list = board.lists.find((item) => item.id === String(patch.listId));
      if (!list) throw new PlankaError('Esa columna ya no existe en Planka.', { kind: 'not-found', status: 404 });
      const index = Number.isInteger(patch.index)
        ? Math.max(0, Math.min(patch.index, list.cards.length))
        : 0;
      body.listId = list.id;
      body.position = positionAtIndex(list.cards, index, cardId);
    }

    if (!Object.keys(body).length) return null;
    const data = await this.request(`/api/cards/${encode(cardId)}`, { method: 'PATCH', body });
    return data?.item ?? null;
  }

  async renameList(listId, name) {
    const trimmed = String(name || '').trim().slice(0, 128);
    if (!trimmed) throw new PlankaError('El nombre de la columna no puede quedar vacío.', { kind: 'validation' });
    const data = await this.request(`/api/lists/${encode(listId)}`, {
      method: 'PATCH',
      body: { name: trimmed },
    });
    return data?.item ?? null;
  }

  async moveCard(cardId, listId, index, boardId) {
    const board = await this.readBoard(boardId);
    const card = flattenCards(board).find((item) => item.id === String(cardId));
    if (!card) throw new PlankaError('Esa tarjeta ya no existe en Planka.', { kind: 'not-found', status: 404 });
    const list = board.lists.find((item) => item.id === String(listId));
    if (!list) throw new PlankaError('Esa columna ya no existe en Planka.', { kind: 'not-found', status: 404 });
    const targetIndex = Number.isInteger(index)
      ? Math.max(0, Math.min(index, list.cards.filter((item) => item.id !== card.id).length))
      : 0;
    const position = positionAtIndex(list.cards, targetIndex, card.id);
    const data = await this.request(`/api/cards/${encode(cardId)}`, {
      method: 'PATCH',
      body: { listId: list.id, position },
    });
    return data?.item ?? null;
  }

  async completeCard(cardId, boardId) {
    const board = await this.readBoard(boardId);
    const card = flattenCards(board).find((item) => item.id === String(cardId));
    if (!card) throw new PlankaError('Esa tarjeta ya no existe en Planka.', { kind: 'not-found', status: 404 });
    if (!board.doneListId) {
      throw new PlankaError('Este tablero no tiene una columna HECHO donde completar la tarjeta.', {
        kind: 'validation',
      });
    }
    if (card.listId === board.doneListId) return { item: null, already: true };
    const done = board.lists.find((item) => item.id === board.doneListId);
    const position = topPosition(done?.cards ?? []);
    const data = await this.request(`/api/cards/${encode(cardId)}`, {
      method: 'PATCH',
      body: { listId: board.doneListId, position },
    });
    return { item: data?.item ?? null, already: false };
  }

  async deleteCard(cardId) {
    await this.request(`/api/cards/${encode(cardId)}`, { method: 'DELETE' });
    return true;
  }

  async addChecklist(cardId, name, boardId, tasks = []) {
    const board = await this.readBoard(boardId);
    const card = flattenCards(board).find((item) => item.id === String(cardId));
    if (!card) throw new PlankaError('Esa tarjeta ya no existe en Planka.', { kind: 'not-found', status: 404 });
    const position = card.taskLists.length ? Math.max(...card.taskLists.map((item) => item.position || 0)) + POSITION_STEP : POSITION_STEP;
    const created = await this.request(`/api/cards/${encode(cardId)}/task-lists`, {
      method: 'POST',
      body: { name: String(name || 'Checklist').trim().slice(0, 128), position },
    });
    const taskListId = created?.item?.id;
    const added = [];
    if (taskListId) {
      let next = POSITION_STEP;
      for (const taskName of tasks) {
        const trimmed = String(taskName || '').trim();
        if (!trimmed) continue;
        const data = await this.request(`/api/task-lists/${encode(taskListId)}/tasks`, {
          method: 'POST',
          body: { name: trimmed.slice(0, 1024), position: next },
        });
        next += POSITION_STEP;
        if (data?.item) added.push(data.item);
      }
    }
    return { taskList: created?.item ?? null, tasks: added };
  }

  async addTask(taskListId, name) {
    const boardId = await this.resolveBoardId();
    const board = await this.readBoard(boardId);
    const taskList = board.lists
      .flatMap((list) => list.cards)
      .flatMap((card) => card.taskLists)
      .find((item) => item.id === String(taskListId));
    const position = taskList && taskList.tasks.length
      ? Math.max(...taskList.tasks.map((task) => task.position || 0)) + POSITION_STEP
      : POSITION_STEP;
    const data = await this.request(`/api/task-lists/${encode(taskListId)}/tasks`, {
      method: 'POST',
      body: { name: String(name || '').trim().slice(0, 1024), position },
    });
    return data?.item ?? null;
  }

  async checkTask(taskId, isCompleted) {
    const data = await this.request(`/api/tasks/${encode(taskId)}`, {
      method: 'PATCH',
      body: { isCompleted: Boolean(isCompleted) },
    });
    return data?.item ?? null;
  }

  async addLabel(cardId, labelId) {
    const data = await this.request(`/api/cards/${encode(cardId)}/card-labels`, {
      method: 'POST',
      body: { labelId: String(labelId) },
    });
    return data?.item ?? null;
  }

  async removeLabel(cardId, labelId, boardId) {
    const { board } = await this.findCard(cardId, boardId);
    const card = flattenCards(board).find((item) => item.id === String(cardId));
    const match = card?.labels.find((label) => label.id === String(labelId));
    if (!match?.cardLabelId) return false;
    await this.request(`/api/card-labels/${encode(match.cardLabelId)}`, { method: 'DELETE' });
    return true;
  }

  async toggleLabel(cardId, labelId, boardId) {
    const { board } = await this.findCard(cardId, boardId);
    const card = flattenCards(board).find((item) => item.id === String(cardId));
    const match = card?.labels.find((label) => label.id === String(labelId));
    if (match) {
      await this.request(`/api/card-labels/${encode(match.cardLabelId)}`, { method: 'DELETE' });
      return false;
    }
    await this.addLabel(cardId, labelId);
    return true;
  }
}

export const flattenCards = (board) => board.lists.flatMap((list) => list.cards);

const nextPosition = (cards) => {
  const positions = cards.map((card) => Number(card.position)).filter((value) => Number.isFinite(value) && value >= 0);
  return positions.length ? Math.max(...positions) + POSITION_STEP : POSITION_STEP;
};

const topPosition = (cards) => {
  const positions = cards
    .map((card) => Number(card.position))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!positions.length) return POSITION_STEP;
  const first = Math.min(...positions);
  return first > 0 ? first / 2 : 0.5;
};

const positionAtIndex = (cards, index, movingId) => {
  const rest = cards.filter((card) => card.id !== String(movingId)).slice().sort(byPosition);
  const target = Math.max(0, Math.min(index, rest.length));
  const previous = rest[target - 1];
  const next = rest[target];
  const previousPosition = Number(previous?.position);
  const nextPositionValue = Number(next?.position);
  let position;
  if (Number.isFinite(previousPosition) && Number.isFinite(nextPositionValue)) {
    position = (previousPosition + nextPositionValue) / 2;
  } else if (Number.isFinite(nextPositionValue)) {
    position = nextPositionValue / 2;
  } else if (Number.isFinite(previousPosition)) {
    position = previousPosition + POSITION_STEP;
  } else {
    position = POSITION_STEP;
  }
  return position > 0 ? position : POSITION_STEP;
};

const normaliseBoard = (payload, baseUrl, requestedBoardId) => {
  const item = payload?.item || {};
  const included = payload?.included || {};
  const labels = Array.isArray(included.labels) ? included.labels : [];
  const labelsById = new Map(labels.map((label) => [String(label.id), label]));
  const cardLabels = Array.isArray(included.cardLabels) ? included.cardLabels : [];
  const taskLists = Array.isArray(included.taskLists) ? included.taskLists : [];
  const tasks = Array.isArray(included.tasks) ? included.tasks : [];

  const lists = (Array.isArray(included.lists) ? included.lists : [])
    .filter((list) => list && list.type === 'active')
    .sort(byPosition)
    .map((list) => ({
      id: String(list.id),
      name: textOf(list.name).trim() || 'Sin nombre',
      color: textOf(list.color),
      position: Number.isFinite(list.position) ? list.position : 0,
      cards: [],
    }));
  const listsById = new Map(lists.map((list) => [list.id, list]));

  const doneList =
    lists.find((list) => DONE_NAME.test(list.name)) ||
    lists[lists.length - 1] ||
    null;

  const cards = (Array.isArray(included.cards) ? included.cards : [])
    .filter((card) => card && !card.isClosed && listsById.has(String(card.listId)))
    .sort(byPosition);

  for (const card of cards) {
    const list = listsById.get(String(card.listId));
    if (!list) continue;
    const cardTaskLists = taskLists
      .filter((taskList) => String(taskList.cardId) === String(card.id))
      .sort(byPosition)
      .map((taskList) => {
        const cardTasks = tasks
          .filter((task) => String(task.taskListId) === String(taskList.id))
          .sort(byPosition)
          .map((task) => ({
            id: String(task.id),
            name: textOf(task.name),
            isCompleted: Boolean(task.isCompleted),
            position: Number.isFinite(task.position) ? task.position : 0,
          }));
        return {
          id: String(taskList.id),
          name: textOf(taskList.name) || 'Checklist',
          position: Number.isFinite(taskList.position) ? taskList.position : 0,
          tasks: cardTasks,
        };
      });
    const total = cardTaskLists.reduce((sum, taskList) => sum + taskList.tasks.length, 0);
    const done = cardTaskLists.reduce(
      (sum, taskList) => sum + taskList.tasks.filter((task) => task.isCompleted).length,
      0,
    );
    const cardLabelRows = cardLabels
      .filter((cardLabel) => String(cardLabel.cardId) === String(card.id))
      .map((cardLabel) => {
        const label = labelsById.get(String(cardLabel.labelId));
        return label
          ? {
              id: String(label.id),
              name: textOf(label.name) || 'Etiqueta',
              color: textOf(label.color),
              cardLabelId: String(cardLabel.id),
            }
          : null;
      })
      .filter(Boolean);

    list.cards.push({
      id: String(card.id),
      name: textOf(card.name),
      description: textOf(card.description),
      dueDate: card.dueDate ? String(card.dueDate) : '',
      isDueCompleted: Boolean(card.isDueCompleted),
      listId: list.id,
      position: Number.isFinite(card.position) ? card.position : 0,
      labels: cardLabelRows,
      taskLists: cardTaskLists,
      checklist: { total, done },
    });
  }

  for (const list of lists) list.cards.sort(byPosition);

  const allCards = lists.flatMap((list) => list.cards);
  const boardId = String(item.id || requestedBoardId || '');
  return {
    board: {
      id: boardId,
      name: textOf(item.name) || 'Tablero',
      url: `${baseUrl}/boards/${boardId}`,
      baseUrl,
    },
    lists,
    labels: labels
      .map((label) => ({
        id: String(label.id),
        name: textOf(label.name) || 'Etiqueta',
        color: textOf(label.color),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    doneListId: doneList?.id || '',
    counts: {
      total: allCards.length,
      incomplete: doneList ? allCards.filter((card) => card.listId !== doneList.id).length : allCards.length,
    },
    updatedAt: Date.now(),
  };
};

export const searchCards = (board, query) => {
  const needle = textOf(query).trim().toLowerCase();
  const cards = flattenCards(board);
  if (!needle) return cards;
  return cards.filter(
    (card) =>
      card.name.toLowerCase().includes(needle) ||
      card.description.toLowerCase().includes(needle),
  );
};

export const findCardByReference = (board, reference) => {
  const raw = textOf(reference).trim();
  if (!raw) return { card: null, candidates: [] };
  const cards = flattenCards(board);
  const exact = cards.find((card) => card.id === raw);
  if (exact) return { card: exact, candidates: [] };
  const needle = raw.toLowerCase();
  const matches = cards.filter((card) => card.name.toLowerCase().includes(needle));
  if (matches.length === 1) return { card: matches[0], candidates: [] };
  return { card: null, candidates: matches };
};

export const findListByReference = (board, reference) => {
  const raw = textOf(reference).trim();
  if (!raw) return { list: null, candidates: [] };
  const exact = board.lists.find((list) => list.id === raw);
  if (exact) return { list: exact, candidates: [] };
  const needle = raw.toLowerCase();
  const matches = board.lists.filter((list) => list.name.toLowerCase().includes(needle));
  if (matches.length === 1) return { list: matches[0], candidates: [] };
  return { list: null, candidates: matches };
};

export const findTaskByReference = (card, reference) => {
  const raw = textOf(reference).trim();
  if (!raw) return { task: null, candidates: [] };
  const tasks = (card?.taskLists || []).flatMap((taskList) =>
    taskList.tasks.map((task) => ({ ...task, taskListId: taskList.id, taskListName: taskList.name })),
  );
  const exact = tasks.find((task) => task.id === raw);
  if (exact) return { task: exact, candidates: [] };
  const needle = raw.toLowerCase();
  const matches = tasks.filter((task) => task.name.toLowerCase().includes(needle));
  if (matches.length === 1) return { task: matches[0], candidates: [] };
  return { task: null, candidates: matches };
};

export const boardSummary = (board) => ({
  board: { id: board.board.id, name: board.board.name, url: board.board.url },
  doneListId: board.doneListId,
  lists: board.lists.map((list) => ({
    id: list.id,
    name: list.name,
    cards: list.cards.map((card) => ({
      id: card.id,
      name: card.name,
      dueDate: card.dueDate || null,
      labels: card.labels.map((label) => label.name),
      checklist: card.checklist,
    })),
  })),
  counts: board.counts,
});
