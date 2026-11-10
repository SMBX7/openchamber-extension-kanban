// src/shared/config.js
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var ROOT = (0, import_node_path.resolve)(__dirname, "..");
var CONFIG_PATH = (0, import_node_path.join)(ROOT, "config.json");
var DEFAULT_BASE_URL = "http://127.0.0.1:3040";
var EMPTY = {
  source: "planka",
  baseUrl: DEFAULT_BASE_URL,
  email: "",
  token: "",
  boardId: "",
  boardName: ""
};
var normalise = (value) => {
  const baseUrl = String(value?.baseUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, "") || DEFAULT_BASE_URL;
  return {
    source: value?.source === "local" ? "local" : "planka",
    baseUrl,
    email: typeof value?.email === "string" ? value.email : "",
    token: typeof value?.token === "string" ? value.token : "",
    boardId: typeof value?.boardId === "string" ? value.boardId : "",
    boardName: typeof value?.boardName === "string" ? value.boardName : ""
  };
};
var readConfig = () => {
  try {
    const parsed = JSON.parse((0, import_node_fs.readFileSync)(CONFIG_PATH, "utf8"));
    return normalise(parsed);
  } catch {
    return { ...EMPTY };
  }
};

// src/shared/local.js
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");
var import_node_crypto = require("node:crypto");

// src/shared/planka.js
var POSITION_STEP = 65536;
var DONE_NAME = /(^|\b)(hecho|done|completad[oa]?s?|finalizad[oa]?s?|listo)(\b|$)/i;
var PlankaError = class extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "PlankaError";
    this.kind = options.kind || "api";
    this.status = options.status || 0;
    this.step = options.step || "";
    this.code = options.code || "";
  }
};
var byPosition = (a, b) => {
  const left = Number.isFinite(a?.position) ? a.position : Number.POSITIVE_INFINITY;
  const right = Number.isFinite(b?.position) ? b.position : Number.POSITIVE_INFINITY;
  if (left !== right) return left - right;
  return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
};
var textOf = (value) => typeof value === "string" ? value : "";
var messageFrom = (data, fallback) => {
  if (!data || typeof data !== "object") return fallback;
  if (typeof data.message === "string" && data.message) return data.message;
  if (Array.isArray(data.problems) && data.problems.length) return data.problems.join(" \xB7 ");
  return fallback;
};
var normaliseBaseUrl = (value) => {
  const raw = textOf(value).trim() || DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
};
var encode = (value) => encodeURIComponent(String(value));
var dueTimestamp = (value) => {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date2 = /* @__PURE__ */ new Date(`${value}T12:00:00`);
    return Number.isNaN(date2.getTime()) ? null : date2.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
var PlankaClient = class {
  constructor(config, options = {}) {
    this.baseUrl = normaliseBaseUrl(config?.baseUrl);
    this.token = textOf(config?.token);
    this.email = textOf(config?.email);
    this.password = textOf(options.password);
    this.onToken = typeof options.onToken === "function" ? options.onToken : null;
    this.reauthing = null;
  }
  async request(path, options = {}) {
    const method = options.method || "GET";
    const auth = options.auth !== false;
    const retry = options.retry !== false;
    const headers = { Accept: "application/json" };
    if (options.body !== void 0) headers["Content-Type"] = "application/json";
    if (options.basic) headers.Authorization = `Basic ${options.basic}`;
    else if (auth && this.token) headers.Authorization = `Bearer ${this.token}`;
    let response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: options.body === void 0 ? void 0 : JSON.stringify(options.body),
        signal: AbortSignal.timeout(options.timeout || 15e3)
      });
    } catch (error) {
      throw new PlankaError(
        error?.name === "TimeoutError" || error?.name === "AbortError" ? "Planka no ha respondido a tiempo." : "No se puede conectar con Planka.",
        { kind: "network" }
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
      if (response.status === 403 && (step === "accept-terms" || /terms|t[eé]rminos/i.test(message))) {
        throw new PlankaError(
          "Planka pide aceptar los t\xE9rminos: entra una vez en Planka y vuelve a intentarlo.",
          { kind: "terms", status: 403, step, code: textOf(data?.code) }
        );
      }
      if (response.status === 403 && (step === "verify-totp" || /totp/i.test(message))) {
        throw new PlankaError("Planka pide el c\xF3digo de doble factor. Entra en Planka y vuelve a intentarlo.", {
          kind: "totp",
          status: 403,
          step
        });
      }
      if (response.status === 401) {
        if (options.basic) {
          throw new PlankaError("Correo o contrase\xF1a incorrectos.", {
            kind: "credentials",
            status: 401,
            code: textOf(data?.code)
          });
        }
        throw new PlankaError("La sesi\xF3n de Planka ha caducado. Vuelve a entrar en Kanban.", {
          kind: "auth",
          status: 401,
          code: textOf(data?.code)
        });
      }
      throw new PlankaError(message, {
        kind: "api",
        status: response.status,
        code: textOf(data?.code)
      });
    }
    return data;
  }
  async login() {
    if (!this.email || !this.password) {
      throw new PlankaError("Hacen falta el correo y la contrase\xF1a de Planka.", { kind: "credentials" });
    }
    const basic = Buffer.from(`${this.email}:${this.password}`).toString("base64");
    let data;
    try {
      data = await this.request("/api/access-tokens", {
        method: "POST",
        auth: false,
        basic,
        body: { emailOrUsername: this.email, password: this.password },
        timeout: 15e3
      });
    } catch (error) {
      if (!(error instanceof PlankaError) || error.status !== 400) throw error;
      data = await this.request("/api/access-tokens", {
        method: "POST",
        auth: false,
        basic,
        body: {},
        timeout: 15e3
      });
    }
    const token = typeof data?.item === "string" ? data.item : "";
    if (!token) {
      throw new PlankaError("Planka no ha devuelto un token de acceso.", { kind: "credentials" });
    }
    this.token = token;
    if (this.onToken) this.onToken(token);
    return token;
  }
  async relogin() {
    if (!this.password) {
      throw new PlankaError("La sesi\xF3n de Planka ha caducado. Vuelve a entrar en Kanban.", { kind: "auth" });
    }
    if (!this.reauthing) {
      this.reauthing = this.login().finally(() => {
        this.reauthing = null;
      });
    }
    return this.reauthing;
  }
  async getBoards() {
    const data = await this.request("/api/projects");
    const boards = Array.isArray(data?.included?.boards) ? data.included.boards : [];
    const seen = /* @__PURE__ */ new Set();
    return boards.filter((board2) => board2 && board2.id && !seen.has(board2.id) && seen.add(board2.id)).map((board2) => ({
      id: String(board2.id),
      name: textOf(board2.name) || "Tablero",
      projectId: String(board2.projectId || ""),
      position: Number.isFinite(board2.position) ? board2.position : 0,
      url: `${this.baseUrl}/boards/${board2.id}`
    })).sort((a, b) => a.name.localeCompare(b.name, "es"));
  }
  async resolveBoardId(boardId) {
    if (boardId) return String(boardId);
    const boards = await this.getBoards();
    if (!boards.length) {
      throw new PlankaError("Tu usuario de Planka no tiene tableros.", { kind: "empty" });
    }
    return boards[0].id;
  }
  async readBoard(boardId) {
    const data = await this.request(`/api/boards/${encode(boardId)}`);
    return normaliseBoard(data, this.baseUrl, boardId);
  }
  async findCard(cardId, boardId) {
    const board2 = await this.readBoard(boardId);
    const card = flattenCards(board2).find((item) => item.id === String(cardId));
    if (!card) throw new PlankaError("Esa tarjeta ya no existe en Planka.", { kind: "not-found", status: 404 });
    return { board: board2, card };
  }
  async createCard(listId, name, boardId, options = {}) {
    const board2 = await this.readBoard(boardId);
    const list = board2.lists.find((item) => item.id === String(listId));
    if (!list) throw new PlankaError("Esa columna ya no existe en Planka.", { kind: "not-found", status: 404 });
    const position = topPosition(list.cards);
    const data = await this.request(`/api/lists/${encode(listId)}/cards`, {
      method: "POST",
      body: {
        type: "project",
        name: String(name || "").trim().slice(0, 1024),
        position,
        ...options.description ? { description: String(options.description) } : {},
        ...options.dueDate ? { dueDate: dueTimestamp(options.dueDate) } : {}
      }
    });
    return data?.item ?? null;
  }
  async updateCard(cardId, patch, boardId) {
    const body = {};
    if (typeof patch.name === "string") {
      const name = patch.name.trim();
      if (!name) throw new PlankaError("El t\xEDtulo no puede quedar vac\xEDo.", { kind: "validation" });
      body.name = name.slice(0, 1024);
    }
    if (patch.description !== void 0) {
      const description = typeof patch.description === "string" ? patch.description : "";
      body.description = description.trim() ? description : null;
    }
    if (patch.dueDate !== void 0) body.dueDate = dueTimestamp(patch.dueDate);
    if (patch.isDueCompleted !== void 0) body.isDueCompleted = Boolean(patch.isDueCompleted);
    if (patch.listId !== void 0) {
      const board2 = await this.readBoard(boardId);
      const list = board2.lists.find((item) => item.id === String(patch.listId));
      if (!list) throw new PlankaError("Esa columna ya no existe en Planka.", { kind: "not-found", status: 404 });
      const index = Number.isInteger(patch.index) ? Math.max(0, Math.min(patch.index, list.cards.length)) : 0;
      body.listId = list.id;
      body.position = positionAtIndex(list.cards, index, cardId);
    }
    if (!Object.keys(body).length) return null;
    const data = await this.request(`/api/cards/${encode(cardId)}`, { method: "PATCH", body });
    return data?.item ?? null;
  }
  async renameList(listId, name) {
    const trimmed = String(name || "").trim().slice(0, 128);
    if (!trimmed) throw new PlankaError("El nombre de la columna no puede quedar vac\xEDo.", { kind: "validation" });
    const data = await this.request(`/api/lists/${encode(listId)}`, {
      method: "PATCH",
      body: { name: trimmed }
    });
    return data?.item ?? null;
  }
  async moveCard(cardId, listId, index, boardId) {
    const board2 = await this.readBoard(boardId);
    const card = flattenCards(board2).find((item) => item.id === String(cardId));
    if (!card) throw new PlankaError("Esa tarjeta ya no existe en Planka.", { kind: "not-found", status: 404 });
    const list = board2.lists.find((item) => item.id === String(listId));
    if (!list) throw new PlankaError("Esa columna ya no existe en Planka.", { kind: "not-found", status: 404 });
    const targetIndex = Number.isInteger(index) ? Math.max(0, Math.min(index, list.cards.filter((item) => item.id !== card.id).length)) : 0;
    const position = positionAtIndex(list.cards, targetIndex, card.id);
    const data = await this.request(`/api/cards/${encode(cardId)}`, {
      method: "PATCH",
      body: { listId: list.id, position }
    });
    return data?.item ?? null;
  }
  async completeCard(cardId, boardId) {
    const board2 = await this.readBoard(boardId);
    const card = flattenCards(board2).find((item) => item.id === String(cardId));
    if (!card) throw new PlankaError("Esa tarjeta ya no existe en Planka.", { kind: "not-found", status: 404 });
    if (!board2.doneListId) {
      throw new PlankaError("Este tablero no tiene una columna HECHO donde completar la tarjeta.", {
        kind: "validation"
      });
    }
    if (card.listId === board2.doneListId) return { item: null, already: true };
    const done = board2.lists.find((item) => item.id === board2.doneListId);
    const position = topPosition(done?.cards ?? []);
    const data = await this.request(`/api/cards/${encode(cardId)}`, {
      method: "PATCH",
      body: { listId: board2.doneListId, position }
    });
    return { item: data?.item ?? null, already: false };
  }
  async deleteCard(cardId) {
    await this.request(`/api/cards/${encode(cardId)}`, { method: "DELETE" });
    return true;
  }
  async addChecklist(cardId, name, boardId, tasks = []) {
    const board2 = await this.readBoard(boardId);
    const card = flattenCards(board2).find((item) => item.id === String(cardId));
    if (!card) throw new PlankaError("Esa tarjeta ya no existe en Planka.", { kind: "not-found", status: 404 });
    const position = card.taskLists.length ? Math.max(...card.taskLists.map((item) => item.position || 0)) + POSITION_STEP : POSITION_STEP;
    const created = await this.request(`/api/cards/${encode(cardId)}/task-lists`, {
      method: "POST",
      body: { name: String(name || "Checklist").trim().slice(0, 128), position }
    });
    const taskListId = created?.item?.id;
    const added = [];
    if (taskListId) {
      let next = POSITION_STEP;
      for (const taskName of tasks) {
        const trimmed = String(taskName || "").trim();
        if (!trimmed) continue;
        const data = await this.request(`/api/task-lists/${encode(taskListId)}/tasks`, {
          method: "POST",
          body: { name: trimmed.slice(0, 1024), position: next }
        });
        next += POSITION_STEP;
        if (data?.item) added.push(data.item);
      }
    }
    return { taskList: created?.item ?? null, tasks: added };
  }
  async addTask(taskListId, name) {
    const boardId = await this.resolveBoardId();
    const board2 = await this.readBoard(boardId);
    const taskList = board2.lists.flatMap((list) => list.cards).flatMap((card) => card.taskLists).find((item) => item.id === String(taskListId));
    const position = taskList && taskList.tasks.length ? Math.max(...taskList.tasks.map((task) => task.position || 0)) + POSITION_STEP : POSITION_STEP;
    const data = await this.request(`/api/task-lists/${encode(taskListId)}/tasks`, {
      method: "POST",
      body: { name: String(name || "").trim().slice(0, 1024), position }
    });
    return data?.item ?? null;
  }
  async checkTask(taskId, isCompleted) {
    const data = await this.request(`/api/tasks/${encode(taskId)}`, {
      method: "PATCH",
      body: { isCompleted: Boolean(isCompleted) }
    });
    return data?.item ?? null;
  }
  async addLabel(cardId, labelId) {
    const data = await this.request(`/api/cards/${encode(cardId)}/card-labels`, {
      method: "POST",
      body: { labelId: String(labelId) }
    });
    return data?.item ?? null;
  }
  async removeLabel(cardId, labelId, boardId) {
    const { board: board2 } = await this.findCard(cardId, boardId);
    const card = flattenCards(board2).find((item) => item.id === String(cardId));
    const match = card?.labels.find((label) => label.id === String(labelId));
    if (!match?.cardLabelId) return false;
    await this.request(`/api/card-labels/${encode(match.cardLabelId)}`, { method: "DELETE" });
    return true;
  }
  async toggleLabel(cardId, labelId, boardId) {
    const { board: board2 } = await this.findCard(cardId, boardId);
    const card = flattenCards(board2).find((item) => item.id === String(cardId));
    const match = card?.labels.find((label) => label.id === String(labelId));
    if (match) {
      await this.request(`/api/card-labels/${encode(match.cardLabelId)}`, { method: "DELETE" });
      return false;
    }
    await this.addLabel(cardId, labelId);
    return true;
  }
};
var flattenCards = (board2) => board2.lists.flatMap((list) => list.cards);
var topPosition = (cards) => {
  const positions = cards.map((card) => Number(card.position)).filter((value) => Number.isFinite(value) && value > 0);
  if (!positions.length) return POSITION_STEP;
  const first = Math.min(...positions);
  return first > 0 ? first / 2 : 0.5;
};
var positionAtIndex = (cards, index, movingId) => {
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
var normaliseBoard = (payload, baseUrl, requestedBoardId) => {
  const item = payload?.item || {};
  const included = payload?.included || {};
  const labels = Array.isArray(included.labels) ? included.labels : [];
  const labelsById = new Map(labels.map((label) => [String(label.id), label]));
  const cardLabels = Array.isArray(included.cardLabels) ? included.cardLabels : [];
  const taskLists = Array.isArray(included.taskLists) ? included.taskLists : [];
  const tasks = Array.isArray(included.tasks) ? included.tasks : [];
  const lists = (Array.isArray(included.lists) ? included.lists : []).filter((list) => list && list.type === "active").sort(byPosition).map((list) => ({
    id: String(list.id),
    name: textOf(list.name).trim() || "Sin nombre",
    color: textOf(list.color),
    position: Number.isFinite(list.position) ? list.position : 0,
    cards: []
  }));
  const listsById = new Map(lists.map((list) => [list.id, list]));
  const doneList = lists.find((list) => DONE_NAME.test(list.name)) || lists[lists.length - 1] || null;
  const cards = (Array.isArray(included.cards) ? included.cards : []).filter((card) => card && !card.isClosed && listsById.has(String(card.listId))).sort(byPosition);
  for (const card of cards) {
    const list = listsById.get(String(card.listId));
    if (!list) continue;
    const cardTaskLists = taskLists.filter((taskList) => String(taskList.cardId) === String(card.id)).sort(byPosition).map((taskList) => {
      const cardTasks = tasks.filter((task) => String(task.taskListId) === String(taskList.id)).sort(byPosition).map((task) => ({
        id: String(task.id),
        name: textOf(task.name),
        isCompleted: Boolean(task.isCompleted),
        position: Number.isFinite(task.position) ? task.position : 0
      }));
      return {
        id: String(taskList.id),
        name: textOf(taskList.name) || "Checklist",
        position: Number.isFinite(taskList.position) ? taskList.position : 0,
        tasks: cardTasks
      };
    });
    const total = cardTaskLists.reduce((sum, taskList) => sum + taskList.tasks.length, 0);
    const done = cardTaskLists.reduce(
      (sum, taskList) => sum + taskList.tasks.filter((task) => task.isCompleted).length,
      0
    );
    const cardLabelRows = cardLabels.filter((cardLabel) => String(cardLabel.cardId) === String(card.id)).map((cardLabel) => {
      const label = labelsById.get(String(cardLabel.labelId));
      return label ? {
        id: String(label.id),
        name: textOf(label.name) || "Etiqueta",
        color: textOf(label.color),
        cardLabelId: String(cardLabel.id)
      } : null;
    }).filter(Boolean);
    list.cards.push({
      id: String(card.id),
      name: textOf(card.name),
      description: textOf(card.description),
      dueDate: card.dueDate ? String(card.dueDate) : "",
      isDueCompleted: Boolean(card.isDueCompleted),
      listId: list.id,
      position: Number.isFinite(card.position) ? card.position : 0,
      labels: cardLabelRows,
      taskLists: cardTaskLists,
      checklist: { total, done }
    });
  }
  for (const list of lists) list.cards.sort(byPosition);
  const allCards = lists.flatMap((list) => list.cards);
  const boardId = String(item.id || requestedBoardId || "");
  return {
    board: {
      id: boardId,
      name: textOf(item.name) || "Tablero",
      url: `${baseUrl}/boards/${boardId}`,
      baseUrl
    },
    lists,
    labels: labels.map((label) => ({
      id: String(label.id),
      name: textOf(label.name) || "Etiqueta",
      color: textOf(label.color)
    })).sort((a, b) => a.name.localeCompare(b.name, "es")),
    doneListId: doneList?.id || "",
    counts: {
      total: allCards.length,
      incomplete: doneList ? allCards.filter((card) => card.listId !== doneList.id).length : allCards.length
    },
    updatedAt: Date.now()
  };
};
var searchCards = (board2, query) => {
  const needle = textOf(query).trim().toLowerCase();
  const cards = flattenCards(board2);
  if (!needle) return cards;
  return cards.filter(
    (card) => card.name.toLowerCase().includes(needle) || card.description.toLowerCase().includes(needle)
  );
};
var findCardByReference = (board2, reference) => {
  const raw = textOf(reference).trim();
  if (!raw) return { card: null, candidates: [] };
  const cards = flattenCards(board2);
  const exact = cards.find((card) => card.id === raw);
  if (exact) return { card: exact, candidates: [] };
  const needle = raw.toLowerCase();
  const matches = cards.filter((card) => card.name.toLowerCase().includes(needle));
  if (matches.length === 1) return { card: matches[0], candidates: [] };
  return { card: null, candidates: matches };
};
var findListByReference = (board2, reference) => {
  const raw = textOf(reference).trim();
  if (!raw) return { list: null, candidates: [] };
  const exact = board2.lists.find((list) => list.id === raw);
  if (exact) return { list: exact, candidates: [] };
  const needle = raw.toLowerCase();
  const matches = board2.lists.filter((list) => list.name.toLowerCase().includes(needle));
  if (matches.length === 1) return { list: matches[0], candidates: [] };
  return { list: null, candidates: matches };
};
var findTaskByReference = (card, reference) => {
  const raw = textOf(reference).trim();
  if (!raw) return { task: null, candidates: [] };
  const tasks = (card?.taskLists || []).flatMap(
    (taskList) => taskList.tasks.map((task) => ({ ...task, taskListId: taskList.id, taskListName: taskList.name }))
  );
  const exact = tasks.find((task) => task.id === raw);
  if (exact) return { task: exact, candidates: [] };
  const needle = raw.toLowerCase();
  const matches = tasks.filter((task) => task.name.toLowerCase().includes(needle));
  if (matches.length === 1) return { task: matches[0], candidates: [] };
  return { task: null, candidates: matches };
};
var boardSummary = (board2) => ({
  board: { id: board2.board.id, name: board2.board.name, url: board2.board.url },
  doneListId: board2.doneListId,
  lists: board2.lists.map((list) => ({
    id: list.id,
    name: list.name,
    cards: list.cards.map((card) => ({
      id: card.id,
      name: card.name,
      dueDate: card.dueDate || null,
      labels: card.labels.map((label) => label.name),
      checklist: card.checklist
    }))
  })),
  counts: board2.counts
});

// src/shared/local.js
var POSITION_STEP2 = 65536;
var DONE_NAME2 = /(^|\b)(hecho|done|completad[oa]?s?|finalizad[oa]?s?|listo)(\b|$)/i;
var BOARD_ID = "local";
var DEFAULT_LISTS = ["IDEAS", "EN PROGRESO", "HECHO"];
var DEFAULT_LABELS = [
  { name: "Urgente", color: "hsl(0 62% 58%)" },
  { name: "Importante", color: "hsl(38 78% 58%)" },
  { name: "Idea", color: "hsl(210 70% 62%)" }
];
var boardPath = () => process.env.KANBAN_LOCAL_PATH || (0, import_node_path2.join)(ROOT, "board.local.json");
var lockPath = () => `${boardPath()}.lock`;
var sleep = (ms) => new Promise((resolve2) => setTimeout(resolve2, ms));
var byPosition2 = (a, b) => {
  const left = Number.isFinite(a?.position) ? a.position : Number.POSITIVE_INFINITY;
  const right = Number.isFinite(b?.position) ? b.position : Number.POSITIVE_INFINITY;
  if (left !== right) return left - right;
  return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
};
var uid = (prefix) => `${prefix}-${(0, import_node_crypto.randomUUID)()}`;
var toIso = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date2 = /* @__PURE__ */ new Date(`${value}T12:00:00`);
    return Number.isNaN(date2.getTime()) ? "" : date2.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};
var emptyStore = () => ({
  version: 1,
  board: { id: BOARD_ID, name: "Kanban local" },
  lists: DEFAULT_LISTS.map((name, index) => ({
    id: `list-${index + 1}`,
    name,
    position: (index + 1) * POSITION_STEP2
  })),
  cards: [],
  labels: DEFAULT_LABELS.map((label, index) => ({
    id: `label-${index + 1}`,
    name: label.name,
    color: label.color
  })),
  cardLabels: [],
  taskLists: [],
  tasks: []
});
var normaliseStore = (value) => {
  const base = emptyStore();
  const store = value && typeof value === "object" ? value : {};
  const lists = Array.isArray(store.lists) && store.lists.length ? store.lists : base.lists;
  return {
    version: 1,
    board: {
      id: BOARD_ID,
      name: typeof store.board?.name === "string" && store.board.name.trim() ? store.board.name.trim().slice(0, 120) : base.board.name
    },
    lists: lists.filter((list) => list && list.id).map((list, index) => ({
      id: String(list.id),
      name: String(list.name || `Columna ${index + 1}`).slice(0, 120),
      position: Number.isFinite(list.position) ? list.position : (index + 1) * POSITION_STEP2
    })),
    cards: (Array.isArray(store.cards) ? store.cards : []).filter((card) => card && card.id && card.listId).map((card) => ({
      id: String(card.id),
      listId: String(card.listId),
      name: String(card.name || "Sin t\xEDtulo").slice(0, 1024),
      description: typeof card.description === "string" ? card.description : "",
      position: Number.isFinite(card.position) ? card.position : 0,
      dueDate: typeof card.dueDate === "string" ? card.dueDate : "",
      isDueCompleted: Boolean(card.isDueCompleted),
      createdAt: Number.isFinite(card.createdAt) ? card.createdAt : Date.now()
    })),
    labels: (Array.isArray(store.labels) ? store.labels : base.labels).filter((label) => label && label.id).map((label) => ({
      id: String(label.id),
      name: String(label.name || "Etiqueta").slice(0, 120),
      color: String(label.color || "hsl(210 20% 60%)")
    })),
    cardLabels: (Array.isArray(store.cardLabels) ? store.cardLabels : []).filter((link) => link && link.id && link.cardId && link.labelId).map((link) => ({ id: String(link.id), cardId: String(link.cardId), labelId: String(link.labelId) })),
    taskLists: (Array.isArray(store.taskLists) ? store.taskLists : []).filter((taskList) => taskList && taskList.id && taskList.cardId).map((taskList) => ({
      id: String(taskList.id),
      cardId: String(taskList.cardId),
      name: String(taskList.name || "Checklist").slice(0, 120),
      position: Number.isFinite(taskList.position) ? taskList.position : POSITION_STEP2
    })),
    tasks: (Array.isArray(store.tasks) ? store.tasks : []).filter((task) => task && task.id && task.taskListId).map((task) => ({
      id: String(task.id),
      taskListId: String(task.taskListId),
      name: String(task.name || "").slice(0, 1024),
      isCompleted: Boolean(task.isCompleted),
      position: Number.isFinite(task.position) ? task.position : POSITION_STEP2
    }))
  };
};
var readStore = () => {
  try {
    return normaliseStore(JSON.parse((0, import_node_fs2.readFileSync)(boardPath(), "utf8")));
  } catch {
    return emptyStore();
  }
};
var writeStore = (store) => {
  const target = boardPath();
  const temp = `${target}.tmp`;
  (0, import_node_fs2.writeFileSync)(temp, `${JSON.stringify(store, null, 2)}
`, { mode: 384 });
  (0, import_node_fs2.renameSync)(temp, target);
  try {
    (0, import_node_fs2.chmodSync)(target, 384);
  } catch {
  }
};
var withLock = async (work) => {
  const deadline = Date.now() + 2500;
  let handle = null;
  while (handle === null) {
    try {
      handle = (0, import_node_fs2.openSync)(lockPath(), "wx");
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      try {
        if (Date.now() - (0, import_node_fs2.statSync)(lockPath()).mtimeMs > 5e3) {
          (0, import_node_fs2.unlinkSync)(lockPath());
          continue;
        }
      } catch {
        continue;
      }
      if (Date.now() > deadline) {
        throw new PlankaError("El tablero local est\xE1 ocupado, int\xE9ntalo otra vez.", { kind: "busy" });
      }
      await sleep(25);
    }
  }
  try {
    return await work();
  } finally {
    try {
      (0, import_node_fs2.closeSync)(handle);
    } catch {
    }
    try {
      (0, import_node_fs2.unlinkSync)(lockPath());
    } catch {
    }
  }
};
var mutate = (work) => withLock(() => {
  const store = readStore();
  const result = work(store);
  writeStore(store);
  return result;
});
var topPosition2 = (cards) => {
  const positions = cards.map((card) => Number(card.position)).filter((value) => Number.isFinite(value) && value > 0);
  if (!positions.length) return POSITION_STEP2;
  const first = Math.min(...positions);
  return first > 0 ? first / 2 : 0.5;
};
var nextPosition = (rows) => {
  const positions = rows.map((row) => Number(row.position)).filter((value) => Number.isFinite(value) && value >= 0);
  return positions.length ? Math.max(...positions) + POSITION_STEP2 : POSITION_STEP2;
};
var positionAtIndex2 = (cards, index, movingId) => {
  const rest = cards.filter((card) => card.id !== String(movingId)).slice().sort(byPosition2);
  const target = Math.max(0, Math.min(index, rest.length));
  const previous = rest[target - 1];
  const next = rest[target];
  const previousPosition = Number(previous?.position);
  const nextPositionValue = Number(next?.position);
  if (Number.isFinite(previousPosition) && Number.isFinite(nextPositionValue)) {
    return (previousPosition + nextPositionValue) / 2;
  }
  if (Number.isFinite(nextPositionValue)) return nextPositionValue / 2;
  if (Number.isFinite(previousPosition)) return previousPosition + POSITION_STEP2;
  return POSITION_STEP2;
};
var findCardRow = (store, cardId) => {
  const card = store.cards.find((item) => item.id === String(cardId));
  if (!card) throw new PlankaError("Esa tarjeta ya no existe en el tablero local.", { kind: "not-found", status: 404 });
  return card;
};
var findListRow = (store, listId) => {
  const list = store.lists.find((item) => item.id === String(listId));
  if (!list) throw new PlankaError("Esa columna ya no existe en el tablero local.", { kind: "not-found", status: 404 });
  return list;
};
var view = (store) => {
  const lists = store.lists.slice().sort(byPosition2).map((list) => ({ id: list.id, name: list.name, color: "", position: list.position, cards: [] }));
  const listsById = new Map(lists.map((list) => [list.id, list]));
  const doneList = lists.find((list) => DONE_NAME2.test(list.name)) || lists[lists.length - 1] || null;
  for (const card of store.cards.slice().sort(byPosition2)) {
    const list = listsById.get(card.listId);
    if (!list) continue;
    const cardTaskLists = store.taskLists.filter((taskList) => taskList.cardId === card.id).sort(byPosition2).map((taskList) => {
      const cardTasks = store.tasks.filter((task) => task.taskListId === taskList.id).sort(byPosition2).map((task) => ({
        id: task.id,
        name: task.name,
        isCompleted: Boolean(task.isCompleted),
        position: task.position
      }));
      return { id: taskList.id, name: taskList.name, position: taskList.position, tasks: cardTasks };
    });
    const total = cardTaskLists.reduce((sum, taskList) => sum + taskList.tasks.length, 0);
    const done = cardTaskLists.reduce(
      (sum, taskList) => sum + taskList.tasks.filter((task) => task.isCompleted).length,
      0
    );
    const cardLabelRows = store.cardLabels.filter((link) => link.cardId === card.id).map((link) => {
      const label = store.labels.find((item) => item.id === link.labelId);
      return label ? { id: label.id, name: label.name, color: label.color, cardLabelId: link.id } : null;
    }).filter(Boolean);
    list.cards.push({
      id: card.id,
      name: card.name,
      description: card.description,
      dueDate: card.dueDate || "",
      isDueCompleted: Boolean(card.isDueCompleted),
      listId: list.id,
      position: card.position,
      labels: cardLabelRows,
      taskLists: cardTaskLists,
      checklist: { total, done }
    });
  }
  for (const list of lists) list.cards.sort(byPosition2);
  const allCards = lists.flatMap((list) => list.cards);
  return {
    board: { id: store.board.id, name: store.board.name, url: "", baseUrl: "" },
    lists,
    labels: store.labels.slice().map((label) => ({ id: label.id, name: label.name, color: label.color })).sort((a, b) => a.name.localeCompare(b.name, "es")),
    doneListId: doneList?.id || "",
    counts: {
      total: allCards.length,
      incomplete: doneList ? allCards.filter((card) => card.listId !== doneList.id).length : allCards.length
    },
    updatedAt: Date.now()
  };
};
var LocalClient = class {
  constructor(config = {}) {
    this.boardId = BOARD_ID;
    this.boardName = typeof config?.boardName === "string" ? config.boardName : "";
  }
  async login() {
    return { token: "local" };
  }
  async getBoards() {
    const store = readStore();
    return [
      {
        id: BOARD_ID,
        name: store.board.name || "Kanban local",
        projectId: "local",
        position: 0,
        url: ""
      }
    ];
  }
  async resolveBoardId() {
    return BOARD_ID;
  }
  async readBoard() {
    return view(readStore());
  }
  async findCard(cardId, boardId) {
    const board2 = await this.readBoard(boardId);
    const card = board2.lists.flatMap((list) => list.cards).find((item) => item.id === String(cardId));
    if (!card) throw new PlankaError("Esa tarjeta ya no existe en el tablero local.", { kind: "not-found", status: 404 });
    return { board: board2, card };
  }
  async createCard(listId, name, boardId, options = {}) {
    return mutate((store) => {
      const list = findListRow(store, listId);
      const title = String(name || "").trim().slice(0, 1024);
      if (!title) throw new PlankaError("El t\xEDtulo no puede quedar vac\xEDo.", { kind: "validation" });
      const card = {
        id: uid("card"),
        listId: list.id,
        name: title,
        description: typeof options.description === "string" ? options.description : "",
        position: topPosition2(store.cards.filter((item) => item.listId === list.id)),
        dueDate: toIso(options.dueDate),
        isDueCompleted: false,
        createdAt: Date.now()
      };
      store.cards.push(card);
      return card;
    });
  }
  async updateCard(cardId, patch = {}, boardId) {
    return mutate((store) => {
      const card = findCardRow(store, cardId);
      if (typeof patch.name === "string") {
        const name = patch.name.trim();
        if (!name) throw new PlankaError("El t\xEDtulo no puede quedar vac\xEDo.", { kind: "validation" });
        card.name = name.slice(0, 1024);
      }
      if (patch.description !== void 0) {
        const description = typeof patch.description === "string" ? patch.description : "";
        card.description = description.trim() ? description : "";
      }
      if (patch.dueDate !== void 0) card.dueDate = toIso(patch.dueDate);
      if (patch.isDueCompleted !== void 0) card.isDueCompleted = Boolean(patch.isDueCompleted);
      if (patch.listId !== void 0) {
        const list = findListRow(store, patch.listId);
        const index = Number.isInteger(patch.index) ? patch.index : 0;
        card.listId = list.id;
        card.position = positionAtIndex2(
          store.cards.filter((item) => item.listId === list.id),
          index,
          card.id
        );
      }
      return card;
    });
  }
  async moveCard(cardId, listId, index, boardId) {
    return mutate((store) => {
      const card = findCardRow(store, cardId);
      const list = findListRow(store, listId);
      const target = Number.isInteger(index) ? index : 0;
      card.listId = list.id;
      card.position = positionAtIndex2(
        store.cards.filter((item) => item.listId === list.id),
        target,
        card.id
      );
      return card;
    });
  }
  async completeCard(cardId, boardId) {
    return mutate((store) => {
      const card = findCardRow(store, cardId);
      const lists = store.lists.slice().sort(byPosition2);
      const done = lists.find((list) => DONE_NAME2.test(list.name)) || lists[lists.length - 1];
      if (!done) throw new PlankaError("Este tablero no tiene una columna HECHO.", { kind: "validation" });
      if (card.listId === done.id) return { item: null, already: true };
      card.listId = done.id;
      card.position = topPosition2(store.cards.filter((item) => item.listId === done.id));
      return { item: card, already: false };
    });
  }
  async deleteCard(cardId) {
    return mutate((store) => {
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
    return mutate((store) => {
      const list = findListRow(store, listId);
      const trimmed = String(name || "").trim().slice(0, 120);
      if (!trimmed) throw new PlankaError("El nombre de la columna no puede quedar vac\xEDo.", { kind: "validation" });
      list.name = trimmed;
      return list;
    });
  }
  async addChecklist(cardId, name, boardId, tasks = []) {
    return mutate((store) => {
      const card = findCardRow(store, cardId);
      const taskList = {
        id: uid("checklist"),
        cardId: card.id,
        name: String(name || "Checklist").trim().slice(0, 120) || "Checklist",
        position: nextPosition(store.taskLists.filter((item) => item.cardId === card.id))
      };
      store.taskLists.push(taskList);
      const added = [];
      let position = POSITION_STEP2;
      for (const taskName of tasks) {
        const trimmed = String(taskName || "").trim();
        if (!trimmed) continue;
        const task = {
          id: uid("task"),
          taskListId: taskList.id,
          name: trimmed.slice(0, 1024),
          isCompleted: false,
          position
        };
        position += POSITION_STEP2;
        store.tasks.push(task);
        added.push(task);
      }
      return { taskList, tasks: added };
    });
  }
  async addTask(taskListId, name) {
    return mutate((store) => {
      const taskList = store.taskLists.find((item) => item.id === String(taskListId));
      if (!taskList) throw new PlankaError("Esa checklist ya no existe.", { kind: "not-found", status: 404 });
      const task = {
        id: uid("task"),
        taskListId: taskList.id,
        name: String(name || "").trim().slice(0, 1024),
        isCompleted: false,
        position: nextPosition(store.tasks.filter((item) => item.taskListId === taskList.id))
      };
      store.tasks.push(task);
      return task;
    });
  }
  async checkTask(taskId, isCompleted) {
    return mutate((store) => {
      const task = store.tasks.find((item) => item.id === String(taskId));
      if (!task) throw new PlankaError("Esa tarea ya no existe.", { kind: "not-found", status: 404 });
      task.isCompleted = Boolean(isCompleted);
      return task;
    });
  }
  async addLabel(cardId, labelId) {
    return mutate((store) => {
      const card = findCardRow(store, cardId);
      const label = store.labels.find((item) => item.id === String(labelId));
      if (!label) throw new PlankaError("Esa etiqueta ya no existe.", { kind: "not-found", status: 404 });
      const existing = store.cardLabels.find((link2) => link2.cardId === card.id && link2.labelId === label.id);
      if (existing) return existing;
      const link = { id: uid("cardlabel"), cardId: card.id, labelId: label.id };
      store.cardLabels.push(link);
      return link;
    });
  }
  async removeLabel(cardId, labelId, boardId) {
    return mutate((store) => {
      const before = store.cardLabels.length;
      store.cardLabels = store.cardLabels.filter(
        (link) => !(link.cardId === String(cardId) && link.labelId === String(labelId))
      );
      return store.cardLabels.length !== before;
    });
  }
  async toggleLabel(cardId, labelId, boardId) {
    const store = readStore();
    const has = store.cardLabels.some(
      (link) => link.cardId === String(cardId) && link.labelId === String(labelId)
    );
    if (has) {
      await this.removeLabel(cardId, labelId, boardId);
      return false;
    }
    await this.addLabel(cardId, labelId);
    return true;
  }
};
var LOCAL_BOARD_ID = BOARD_ID;

// src/shared/links.js
var import_node_fs3 = require("node:fs");
var import_node_os = require("node:os");
var import_node_path3 = require("node:path");
var DIR = (0, import_node_path3.join)((0, import_node_os.homedir)(), ".kanban");
var FILE = (0, import_node_path3.join)(DIR, "links.json");
var empty = () => ({ version: 1, links: {} });
var readLinks = () => {
  try {
    const parsed = JSON.parse((0, import_node_fs3.readFileSync)(FILE, "utf8"));
    if (!parsed || typeof parsed !== "object" || typeof parsed.links !== "object" || !parsed.links) return empty();
    return parsed;
  } catch {
    return empty();
  }
};
var writeLinks = (data) => {
  (0, import_node_fs3.mkdirSync)(DIR, { recursive: true, mode: 448 });
  const temp = (0, import_node_path3.join)(DIR, `.links-${process.pid}.tmp`);
  (0, import_node_fs3.writeFileSync)(temp, `${JSON.stringify(data, null, 2)}
`, { mode: 384 });
  (0, import_node_fs3.renameSync)(temp, FILE);
  try {
    (0, import_node_fs3.chmodSync)(FILE, 384);
  } catch {
  }
};
var setLink = (cardId, sessionId, meta = {}) => {
  const id = String(cardId || "");
  const session = String(sessionId || "").trim();
  if (!id || !session) throw new Error("La tarjeta y la sesi\xF3n son obligatorias.");
  const data = readLinks();
  data.links[id] = {
    sessionId: session,
    boardId: String(meta.boardId || ""),
    title: String(meta.title || "").slice(0, 200),
    sessionTitle: String(meta.sessionTitle || meta.title || session).slice(0, 120),
    linkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  writeLinks(data);
  return data.links[id];
};
var markClosePending = (cardId) => {
  const id = String(cardId || "");
  const data = readLinks();
  if (!data.links[id]) return false;
  data.links[id].closePending = true;
  data.links[id].closePendingAt = (/* @__PURE__ */ new Date()).toISOString();
  writeLinks(data);
  return true;
};
var clearClosePending = (cardId) => {
  const id = String(cardId || "");
  const data = readLinks();
  if (!data.links[id]?.closePending) return false;
  delete data.links[id].closePending;
  delete data.links[id].closePendingAt;
  writeLinks(data);
  return true;
};
var removeLink = (cardId) => {
  const id = String(cardId || "");
  const data = readLinks();
  if (!data.links[id]) return false;
  delete data.links[id];
  writeLinks(data);
  return true;
};

// src/mcp/main.js
var PROTOCOL_FALLBACK = "2024-11-05";
process.title = "kanban-mcp";
var json = (value) => JSON.stringify(value);
var send = (message) => process.stdout.write(`${json(message)}
`);
var textResult = (value) => ({
  content: [{ type: "text", text: typeof value === "string" ? value : json(value) }]
});
var failResult = (message) => ({
  content: [{ type: "text", text: message }],
  isError: true
});
var context = async () => {
  const config = readConfig();
  if (config.source === "local") {
    return { client: new LocalClient(config), boardId: LOCAL_BOARD_ID };
  }
  if (!config.token) {
    throw new Error("Kanban is not connected to Planka yet. Sign in from the Kanban panel in OpenChamber.");
  }
  const client = new PlankaClient(config);
  const boardId = await client.resolveBoardId(config.boardId);
  return { client, boardId };
};
var resolveCard = async (client, boardId, reference) => {
  const board2 = await client.readBoard(boardId);
  const found = findCardByReference(board2, reference);
  if (found.card) return { board: board2, card: found.card };
  if (found.candidates.length > 1) {
    const names = found.candidates.map((card) => `- ${card.name} (${card.id})`).join("\n");
    throw new Error(`"${reference}" matches more than one card. Use the id or a longer title:
${names}`);
  }
  throw new Error(`No card matches "${reference}".`);
};
var resolveList = async (client, boardId, reference) => {
  const board2 = await client.readBoard(boardId);
  const found = findListByReference(board2, reference);
  if (found.list) return { board: board2, list: found.list };
  if (found.candidates.length > 1) {
    const names = found.candidates.map((list) => `- ${list.name} (${list.id})`).join("\n");
    throw new Error(`"${reference}" matches more than one column. Use the id or a longer name:
${names}`);
  }
  throw new Error(
    `No column matches "${reference}". Columns: ${board2.lists.map((list) => list.name).join(", ")}.`
  );
};
var tools = [
  {
    name: "kanban_board",
    description: "Read the Planka board: columns in order, cards with labels, due dates and checklist progress.",
    inputSchema: {
      type: "object",
      properties: { board: { type: "string", description: "Optional board id. Defaults to the selected board." } },
      additionalProperties: false
    }
  },
  {
    name: "kanban_search",
    description: "Find cards by text in the title or the description.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Text to find." } },
      required: ["query"],
      additionalProperties: false
    }
  },
  {
    name: "kanban_boards",
    description: "List the Planka boards this user can edit.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "kanban_create_card",
    description: "Create a card in a column. The card is appended to the end of the column.",
    inputSchema: {
      type: "object",
      properties: {
        list: { type: "string", description: "Column name or id." },
        name: { type: "string", description: "Card title." },
        description: { type: "string", description: "Optional description." },
        dueDate: { type: "string", description: "Optional due date (YYYY-MM-DD or ISO)." }
      },
      required: ["list", "name"],
      additionalProperties: false
    }
  },
  {
    name: "kanban_update_card",
    description: "Change a card title, description, due date or column.",
    inputSchema: {
      type: "object",
      properties: {
        card: { type: "string", description: "Card id or part of the title." },
        name: { type: "string", description: "New title." },
        description: { type: "string", description: "New description. Empty clears it." },
        dueDate: { type: "string", description: "New due date (YYYY-MM-DD or ISO). Empty clears it." },
        list: { type: "string", description: "Move the card to this column name or id." }
      },
      required: ["card"],
      additionalProperties: false
    }
  },
  {
    name: "kanban_move_card",
    description: "Move a card to another column and optionally to a position inside it.",
    inputSchema: {
      type: "object",
      properties: {
        card: { type: "string", description: "Card id or part of the title." },
        list: { type: "string", description: "Target column name or id." },
        position: { type: "number", description: "Zero-based position inside the target column. Default: end." }
      },
      required: ["card", "list"],
      additionalProperties: false
    }
  },
  {
    name: "kanban_complete_card",
    description: "Complete a card: move it to the board HECHO (done) column.",
    inputSchema: {
      type: "object",
      properties: { card: { type: "string", description: "Card id or part of the title." } },
      required: ["card"],
      additionalProperties: false
    }
  },
  {
    name: "kanban_delete_card",
    description: "Delete a card from Planka permanently.",
    inputSchema: {
      type: "object",
      properties: { card: { type: "string", description: "Card id or part of the title." } },
      required: ["card"],
      additionalProperties: false
    }
  },
  {
    name: "kanban_checklist_add",
    description: "Add a checklist to a card, with optional initial tasks.",
    inputSchema: {
      type: "object",
      properties: {
        card: { type: "string", description: "Card id or part of the title." },
        name: { type: "string", description: "Checklist name." },
        tasks: {
          type: "array",
          items: { type: "string" },
          description: "Optional task names."
        }
      },
      required: ["card", "name"],
      additionalProperties: false
    }
  },
  {
    name: "kanban_link_session",
    description: "Link a card to the OpenChamber session working on it. When the card reaches HECHO, that session is asked to save its Engram summary and is stopped.",
    inputSchema: {
      type: "object",
      properties: {
        card: { type: "string", description: "Card id or part of the title." },
        sessionId: { type: "string", description: "OpenChamber session id working on that card." }
      },
      required: ["card", "sessionId"],
      additionalProperties: false
    }
  },
  {
    name: "kanban_checklist_check",
    description: "Mark a checklist task as completed or not completed.",
    inputSchema: {
      type: "object",
      properties: {
        card: { type: "string", description: "Card id or part of the title." },
        task: { type: "string", description: "Task id or part of its name." },
        done: { type: "boolean", description: "True to check it, false to uncheck it. Default true." }
      },
      required: ["card", "task"],
      additionalProperties: false
    }
  }
];
var callTool = async (name, args = {}) => {
  const { client, boardId } = await context();
  if (name === "kanban_boards") {
    return textResult(await client.getBoards());
  }
  if (name === "kanban_board") {
    const target = args.board ? await client.resolveBoardId(String(args.board)) : boardId;
    return textResult(boardSummary(await client.readBoard(target)));
  }
  if (name === "kanban_search") {
    const board2 = await client.readBoard(boardId);
    const cards = searchCards(board2, String(args.query || "")).map((card) => ({
      id: card.id,
      name: card.name,
      list: board2.lists.find((list) => list.id === card.listId)?.name || "",
      description: card.description,
      dueDate: card.dueDate || null,
      labels: card.labels.map((label) => label.name)
    }));
    return textResult({ query: String(args.query || ""), cards });
  }
  if (name === "kanban_create_card") {
    const { list } = await resolveList(client, boardId, args.list);
    const card = await client.createCard(list.id, args.name, boardId, {
      description: args.description,
      dueDate: args.dueDate
    });
    return textResult({ created: true, id: card?.id, name: card?.name, list: list.name });
  }
  if (name === "kanban_update_card") {
    const { card } = await resolveCard(client, boardId, args.card);
    const patch = {};
    if (args.name !== void 0) patch.name = String(args.name);
    if (args.description !== void 0) patch.description = String(args.description);
    if (args.dueDate !== void 0) patch.dueDate = String(args.dueDate);
    let targetList = null;
    if (args.list !== void 0) {
      const resolved = await resolveList(client, boardId, args.list);
      targetList = resolved.list;
      patch.listId = targetList.id;
      patch.index = 0;
    }
    const updated = await client.updateCard(card.id, patch, boardId);
    if (targetList) {
      if (targetList.id === (await client.readBoard(boardId)).doneListId) markClosePending(card.id);
      else clearClosePending(card.id);
    }
    return textResult({ updated: true, id: card.id, card: updated });
  }
  if (name === "kanban_move_card") {
    const { card } = await resolveCard(client, boardId, args.card);
    const { list } = await resolveList(client, boardId, args.list);
    const index = Number.isInteger(args.position) ? args.position : void 0;
    await client.moveCard(card.id, list.id, index, boardId);
    if (list.id === board.doneListId) markClosePending(card.id);
    else clearClosePending(card.id);
    return textResult({ moved: true, id: card.id, name: card.name, list: list.name });
  }
  if (name === "kanban_complete_card") {
    const { card } = await resolveCard(client, boardId, args.card);
    const result = await client.completeCard(card.id, boardId);
    const closePending = !result.already && markClosePending(card.id);
    return textResult({ completed: true, id: card.id, name: card.name, already: result.already, closePending });
  }
  if (name === "kanban_delete_card") {
    const { card } = await resolveCard(client, boardId, args.card);
    await client.deleteCard(card.id);
    removeLink(card.id);
    return textResult({ deleted: true, id: card.id, name: card.name });
  }
  if (name === "kanban_checklist_add") {
    const { card } = await resolveCard(client, boardId, args.card);
    const tasks = Array.isArray(args.tasks) ? args.tasks.map(String) : [];
    const result = await client.addChecklist(card.id, args.name, boardId, tasks);
    return textResult({
      added: true,
      card: card.name,
      checklist: result.taskList?.name || String(args.name || "Checklist"),
      tasks: result.tasks.map((task) => ({ id: task.id, name: task.name }))
    });
  }
  if (name === "kanban_link_session") {
    const { card } = await resolveCard(client, boardId, args.card);
    const sessionId = String(args.sessionId || "").trim();
    if (!sessionId) throw new Error("sessionId is required.");
    setLink(card.id, sessionId, { boardId, title: card.name });
    return textResult({ linked: true, card: { id: card.id, name: card.name }, sessionId });
  }
  if (name === "kanban_checklist_check") {
    const { card } = await resolveCard(client, boardId, args.card);
    const found = findTaskByReference(card, args.task);
    if (!found.task) {
      if (found.candidates.length > 1) {
        throw new Error(
          `"${args.task}" matches more than one task: ${found.candidates.map((task) => `"${task.name}"`).join(", ")}.`
        );
      }
      throw new Error(`No checklist task matches "${args.task}" on "${card.name}".`);
    }
    const done = args.done === void 0 ? true : Boolean(args.done);
    await client.checkTask(found.task.id, done);
    return textResult({ checked: done, card: card.name, task: found.task.name });
  }
  throw new Error(`Unknown tool: ${name}`);
};
var inFlight = 0;
var stdinClosed = false;
var exitWhenDone = () => {
  if (stdinClosed && inFlight === 0) {
    setTimeout(() => process.exit(0), 10);
  }
};
var handleMessage = async (message) => {
  const { id, method, params } = message || {};
  if (!method) return;
  if (method === "initialize") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: typeof params?.protocolVersion === "string" ? params.protocolVersion : PROTOCOL_FALLBACK,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "kanban", version: "1.0.0" }
      }
    });
    return;
  }
  if (method === "notifications/initialized" || method === "notifications/cancelled") return;
  if (method === "ping") {
    send({ jsonrpc: "2.0", id, result: {} });
    return;
  }
  if (method === "tools/list") {
    send({ jsonrpc: "2.0", id, result: { tools } });
    return;
  }
  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments || {};
    try {
      send({ jsonrpc: "2.0", id, result: await callTool(String(name), args) });
    } catch (error) {
      const message2 = error instanceof PlankaError ? error.message : error instanceof Error ? error.message : "Tool failed.";
      send({ jsonrpc: "2.0", id, result: failResult(message2) });
    }
    return;
  }
  if (id !== void 0) {
    send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  }
};
var buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let newline = buffer.indexOf("\n");
  while (newline >= 0) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    newline = buffer.indexOf("\n");
    if (!line) continue;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      send({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null });
      continue;
    }
    inFlight += 1;
    handleMessage(message).catch(() => {
    }).finally(() => {
      inFlight -= 1;
      exitWhenDone();
    });
  }
});
var stop = () => {
  stdinClosed = true;
  exitWhenDone();
};
process.stdin.on("end", stop);
process.stdin.on("close", stop);
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
process.on("SIGHUP", stop);
process.on("disconnect", stop);
