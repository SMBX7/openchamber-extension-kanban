import { connectHost } from '@openchamber/sdk';
import { applyHostReady } from '@openchamber/sdk/ui';

const host = connectHost();
const root = document.querySelector('#root');



const COLUMN_TOKENS = ['var(--oc-info)', 'var(--oc-warning)', 'var(--oc-success)'];
const POLL_MS = 2500;
const TITLE_REQUIRED = 'El título no puede quedar vacío.';

const ICONS = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 4.5 4.5L19 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  external: '<path d="M14 4h6v6M20 4 10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
  edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="m13.5 6.5 3 3"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v5M14 11v5"/>',
  compress: '<path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/>',
  expand: '<path d="m13 7 5 5-5 5"/><path d="m6 7 5 5-5 5"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  sort: '<path d="M7 4v16"/><path d="m4 17 3 3 3-3"/><path d="M13 6h7M13 11h5M13 16h3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 15a1.65 1.65 0 0 0-1.51-1H2a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 3.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 4.6h.09A1.65 1.65 0 0 0 9.1 3.09V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09A1.65 1.65 0 0 0 21 10.1H21a2 2 0 1 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15Z"/>',
};

const state = {
  loginSource: '',
  features: {},
  popoverMounted: false,
  surface: 'panel',
  booted: false,
  view: 'boot',
  config: null,
  boards: [],
  mappings: {},
  projects: [],
  plankaProjects: [],
  session: null,
  directory: '',
  showAllBoards: true,
  snapshot: null,
  sessions: {},
  search: '',
  labels: new Set(),
  sheetId: '',
  sheet: null,
  settings: null,
  settingsDirty: false,
  createBoard: null,
  appearance: { style: 'neumorphism', shortcut: 'shift', columns: ['', '', ''], card: '' },
  hiddenCards: new Set(),
  pendingDelete: null,
  stoppedOnly: false,
  dragId: '',
  dragging: false,
  sorting: false,
  sortPop: null,
  composerListId: '',
  saving: 0,
  fetching: false,
  poll: null,
  refs: null,
  bannerText: '',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const el = (tag, className = '', text = '') => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

const makeIcon = (name) => {
  const span = el('span', 'icon');
  span.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  return span;
};

const labelColor = (name) => {
  const palette = String(name || 'label');
  let hash = 0;
  for (let index = 0; index < palette.length; index += 1) {
    hash = (hash * 31 + palette.charCodeAt(index)) % 360;
  }
  return `hsl(${hash} 58% 62%)`;
};

const startOfDay = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const dueInfo = (iso) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const today = startOfDay(new Date());
  const due = startOfDay(date);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  let label;
  if (diff < 0) label = 'Atrasada';
  else if (diff === 0) label = 'Hoy';
  else if (diff === 1) label = 'Mañana';
  else label = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  return { label, late: diff < 0, due };
};

const parseBody = (text) => {
  try {
    return JSON.parse(text || '{}');
  } catch {
    return {};
  }
};

// The guest service cannot see the active project, so every request carries it.
const withDirectory = (path) => {
  if (!state.directory) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}directory=${encodeURIComponent(state.directory)}`;
};

const api = async (method, path, body) => {
  let result;
  try {
    result = await host.serviceRequest({
      method,
      path: withDirectory(path),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    const wrapped = new Error(
      error?.code === 'NO_SERVICE'
        ? 'El servicio de Kanban no está disponible.'
        : 'No se puede hablar con el servicio de Kanban.',
    );
    wrapped.kind = 'service';
    throw wrapped;
  }
  const data = parseBody(result.body);
  if (result.status >= 200 && result.status < 300) return data;
  const error = new Error(data.message || `Kanban ha respondido ${result.status}.`);
  error.kind = data.kind || 'api';
  error.status = result.status;
  throw error;
};

const toast = (kind, message) => {
  host.toast({ kind, message }).catch(() => {});
};

const renderPopover = (context) => {
  if (state.popoverMounted) return;
  state.popoverMounted = true;
  state.view = 'popover';
  stopPolling();
  const data = context.popover?.data || {};
  document.documentElement.dataset.style = data.style || 'neumorphism';
  document.body.classList.add('popover-surface');

  const wrap = el('div', 'popover-card');
  const head = el('div', 'popover-head');
  head.append(el('span', 'popover-dot'), el('span', 'popover-title', 'Sesión automática'));
  const text = el('div', 'popover-text', data.name || 'Esta tarjeta');
  const where = el('div', 'popover-meta', data.project || '');
  const note = el('div', 'popover-note', 'No se abre nada hasta que lo confirmes.');
  const actions = el('div', 'popover-actions');
  const open = el('button', 'btn-mint', 'Abrir sesión');
  open.type = 'button';
  const skip = el('button', 'ghost-btn', 'Ahora no');
  skip.type = 'button';

  open.addEventListener('click', async () => {
    open.disabled = true;
    skip.disabled = true;
    open.textContent = 'Abriendo…';
    try {
      const result = await api('POST', '/session/start', { cardId: data.cardId });
      await host.close();
      if (result?.sessionId) {
        try {
          await host.openSession(result.sessionId);
        } catch {
          // The session exists; the host simply could not focus it.
        }
      }
    } catch (error) {
      note.textContent = error.message;
      note.classList.add('error');
      open.disabled = false;
      skip.disabled = false;
      open.textContent = 'Abrir sesión';
    }
  });
  skip.addEventListener('click', () => host.close());

  actions.append(open, skip);
  wrap.append(head, text, where, note, actions);
  root.replaceChildren(wrap);
};

const closeAutoBars = () => {
  for (const node of document.querySelectorAll('.auto-bar')) node.remove();
};

const showAutoBar = (cardId, name, project) => {
  closeAutoBars();
  const bar = el('div', 'undo-bar auto-bar');
  const text = el('span', 'undo-text', `¿Abrir sesión para «${name || 'la tarjeta'}»?`);
  const open = el('button', 'undo-action', 'Abrir sesión');
  open.type = 'button';
  const skip = el('button', 'undo-cancel', 'Ahora no');
  skip.type = 'button';
  const progress = el('span', 'undo-progress');
  let timer = null;
  const close = () => {
    clearTimeout(timer);
    bar.remove();
  };
  open.addEventListener('click', async () => {
    close();
    try {
      const result = await api('POST', '/session/start', { cardId });
      await refresh(true);
      if (result?.sessionId) {
        toast('success', `Sesión creada en ${result.project || project || 'el proyecto'}.`);
        try {
          await host.openSession(result.sessionId);
        } catch {
          toast('error', 'La sesión se creó, pero no se pudo abrir.');
        }
      }
    } catch (error) {
      toast('error', error.message);
    }
  });
  skip.addEventListener('click', close);
  bar.append(text, open, skip, progress);
  document.body.append(bar);
  timer = setTimeout(close, 15000);
};

const offerSession = (cardId, name, project, node) => {
  const rect = node?.getBoundingClientRect?.();
  const canPopover = state.features?.popovers === true && typeof host.openPopover === 'function';
  if (!canPopover) {
    showAutoBar(cardId, name, project);
    return;
  }
  host
    .openPopover({
      id: `session-${Date.now().toString(36)}`,
      anchor: rect && rect.width
        ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
        : { x: 40, y: 40, width: 40, height: 40 },
      width: 300,
      height: 150,
      side: 'top',
      focus: true,
      data: { cardId, name: name || '', project: project || '', style: state.appearance.style || 'neumorphism' },
    })
    .catch(() => showAutoBar(cardId, name, project));
};

const removeUndoBar = () => {
  state.pendingDelete?.bar?.remove();
};

const undoDelete = () => {
  const pending = state.pendingDelete;
  if (!pending) return;
  clearTimeout(pending.timer);
  void api('POST', '/card/pending', { id: pending.card.id, pending: false }).catch(() => {});
  removeUndoBar();
  state.pendingDelete = null;
  state.hiddenCards.delete(pending.card.id);
  renderBoard();
  toast('success', 'Tarjeta restaurada.');
};

const commitPendingDelete = async () => {
  const pending = state.pendingDelete;
  if (!pending) return;
  clearTimeout(pending.timer);
  removeUndoBar();
  state.pendingDelete = null;
  try {
    await api('DELETE', '/card', { id: pending.card.id });
    state.hiddenCards.delete(pending.card.id);
    toast('success', `«${pending.card.name}» eliminada.`);
  } catch (error) {
    state.hiddenCards.delete(pending.card.id);
    toast('error', error.message);
  }
  renderBoard();
};

const queueDelete = async (card, node) => {
  if (state.pendingDelete) await commitPendingDelete();
  for (const old of document.querySelectorAll('.undo-bar')) old.remove();
  const bar = el('div', 'undo-bar');
  const progress = el('span', 'undo-progress');
  const text = el('span', 'undo-text', `«${card.name}» eliminada`);
  const action = el('button', 'undo-action', 'Deshacer');
  action.type = 'button';
  action.addEventListener('click', () => undoDelete());
  bar.append(text, action, progress);
  void api('POST', '/card/pending', { id: card.id, pending: true }).catch(() => {});
  node.classList.add('leaving');
  await sleep(140);
  state.hiddenCards.add(card.id);
  document.body.append(bar);
  const timer = setTimeout(() => {
    void commitPendingDelete();
  }, 5000);
  state.pendingDelete = { card, bar, timer };
  renderBoard();
};

const findCard = (id) => {
  const snapshot = state.snapshot;
  if (!snapshot) return null;
  for (const list of snapshot.lists) {
    const card = list.cards.find((item) => item.id === id);
    if (card) return { card, list };
  }
  return null;
};

const findList = (id) => state.snapshot?.lists.find((list) => list.id === id) || null;

const mergeCard = (serverCard) => {
  for (const list of state.snapshot?.lists || []) {
    const index = list.cards.findIndex((item) => item.id === serverCard.id);
    if (index >= 0) {
      list.cards[index] = { ...list.cards[index], ...serverCard };
      return;
    }
  }
};

const sessionActive = (cardId) => {
  const info = state.sessions?.[cardId];
  return Boolean(info && (info.state === 'trabajando' || info.state === 'esperando'));
};

const isStoppedCard = (card) => !sessionActive(card.id);

const matchesFilters = (card) => {
  const query = state.search.trim().toLowerCase();
  if (query) {
    const haystack = `${card.name}\n${card.description}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  if (state.labels.size > 0 && !card.labels.some((label) => state.labels.has(label.id))) return false;
  if (state.stoppedOnly) {
    if (card.listId !== state.snapshot?.workListId) return false;
    if (!isStoppedCard(card)) return false;
  }
  return true;
};

/* --- Ideas priority sort (pure helpers) ---------------------------- */
/* IDEAS is ordered by the four criteria the user gave. The extension reads
   each card's text and picks a level; nothing is stored per card and no
   session is opened. The list is the only one that can be sorted. */

// Levels, most important first. The order of this array is the order that
// wins a tie between two levels, and it is what the popover shows.
const SORT_CRITERIA = [
  {
    key: 'flow',
    label: 'Fallos que rompen el flujo',
    hint: 'Rompe, no deja, se pierde, error…',
    pattern: /\b(rompe|rompen|roto|rota|fallo|fallos|falla|fallas|error|errores|bug|bugs|crash|bloquea|bloqueado|bloqueada|imposible|se pierde|se pasa|se mueve|se queda|se cierra|salta|vuelve a|en vez de|deberia|no deja|no me deja|no funciona|no guarda|no carga|no abre|no se puede|no puedo|desaparece)\b/g,
  },
  {
    key: 'parity',
    label: 'Paridad local/Planka',
    hint: 'Local, Planka, servidor, sincronizar…',
    pattern: /\b(planka|local|paridad|paralelo|sincroniz\w*|servidor|remoto|nube|dos modos|modo local|mismo comportamiento|tambien en|igual en|los dos|ambos)\b/g,
  },
  {
    key: 'ux',
    label: 'UX grande',
    hint: 'Interfaz, panel, botones, arrastrar…',
    pattern: /\b(ux|usabilidad|interfaz|experiencia|diseno|visual|pantalla|panel|lateral|ventana|boton|botones|clic|clics|arrastr\w*|mover|ordenar|filtrado|complicad\w*|lio|lioso|confus\w*|entiendo|entiende|accesib\w*|movil|responsive|columna|columnas)\b/g,
  },
  {
    key: 'polish',
    label: 'Pulido y arquitectura',
    hint: 'Refactor, código, tests, rendimiento…',
    pattern: /\b(refactor\w*|arquitectura|arquitect\w*|codigo|limpia\w*|limpiar|duplicad\w*|rendimiento|lento|test|tests|pruebas|documentacion|estructura|nombres|pulir|pulido|deuda|mantener|json|persist\w*|almacen\w*|migrac\w*|guard\w*)\b/g,
  },
];

const SORT_UNCLASSIFIED = SORT_CRITERIA.length;

const normalizeCardText = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

// Score every level and keep the strongest one; the first level wins a tie.
// A card with no signal keeps its place after the classified ones.
const classifyCard = (card) => {
  const text = normalizeCardText(`${card?.name || ''}\n${card?.description || ''}`);
  let level = SORT_UNCLASSIFIED;
  let best = 0;
  SORT_CRITERIA.forEach((criterion, index) => {
    const matches = text.match(criterion.pattern);
    const score = matches ? matches.length : 0;
    if (score > best) {
      best = score;
      level = index;
    }
  });
  return level;
};

// Stable: cards on the same level, and cards without a level, keep their
// current order.
const sortCardsByPriority = (cards) =>
  cards
    .map((card, index) => ({ card, index, level: classifyCard(card) }))
    .sort((a, b) => a.level - b.level || a.index - b.index)
    .map((entry) => entry.card);

/* --- end Ideas priority sort --------------------------------------- */

const isPaused = () =>
  state.view !== 'board' ||
  Boolean(state.sheetId) ||
  state.dragging ||
  Boolean(state.composerListId) ||
  Boolean(state.createBoard) ||
  state.saving > 0;

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

host.onReady((context) => {
  state.features = context.features || {};
  state.directory = context.directory || '';
  applyHostReady(context, document.documentElement);
  if (context.surface === 'popover') {
    renderPopover(context);
    return;
  }
  state.session = context.session || null;
  state.surface = context.surface === 'page' ? 'page' : 'panel';
  if (state.booted) return;
  state.booted = true;
  void boot();
});

host.onDirectory((directory) => {
  const next = directory || '';
  if (next === state.directory) return;
  state.directory = next;
  state.showAllBoards = true;
  if (!state.booted) return;
  void closeSheet();
  void loadMappings().then(() => refresh(true));
});

// The linked cards follow the session: EN PROGRESO while it works, HECHO when
// it finishes. The service owns the move; both frames may report it safely.
// The first event after boot is the session's current state, so an idle boot
// must not complete the cards: act on `completed` only after seeing `started`.
const lifecycleSeen = new Set();
host.onSessionLifecycle((event) => {
  if (!event?.sessionId || !event.phase) return;
  if (event.phase === 'completed' && !lifecycleSeen.has(event.sessionId)) return;
  if (event.phase === 'completed' || event.phase === 'failure') lifecycleSeen.delete(event.sessionId);
  else lifecycleSeen.add(event.sessionId);
  void api('POST', '/session/lifecycle', {
    sessionId: event.sessionId,
    phase: event.phase,
  }).catch(() => {});
});

const configWithRetry = async () => {
  let lastError;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      return await api('GET', '/config');
    } catch (error) {
      lastError = error;
      if (error.kind !== 'service') break;
      await sleep(400);
    }
  }
  throw lastError;
};

const loadProjects = async () => {
  try {
    const snapshot = await host.listProjects();
    state.projects = Array.isArray(snapshot?.projects) ? snapshot.projects : [];
  } catch {
    state.projects = state.projects || [];
  }
  return state.projects;
};

// The board selector narrows to the active project, so the panel needs every
// board's link at once. A failed read keeps the last known links, and an empty
// map falls back to showing every board.
const loadMappings = async () => {
  try {
    const answer = await api('GET', '/mappings');
    const mappings = answer?.mappings;
    state.mappings = mappings && typeof mappings === 'object' && !Array.isArray(mappings)
      ? mappings
      : {};
  } catch {
    state.mappings = state.mappings || {};
  }
  return state.mappings;
};

const applyAppearance = () => {
  const rootEl = document.documentElement;
  const appearance = state.appearance || {};
  rootEl.dataset.style = appearance.style || 'neumorphism';
  for (let index = 0; index < 3; index += 1) {
    const color = appearance.columns?.[index];
    if (color) rootEl.style.setProperty(`--col-tone-${index}`, color);
    else rootEl.style.removeProperty(`--col-tone-${index}`);
  }
  if (appearance.card) rootEl.style.setProperty('--kanban-card-bg', appearance.card);
  else rootEl.style.removeProperty('--kanban-card-bg');
};

const loadAppearance = async () => {
  try {
    const answer = await api('GET', '/appearance');
    if (answer?.appearance) state.appearance = answer.appearance;
  } catch {
    // Theme defaults are fine when the service has no appearance yet.
  }
  applyAppearance();
};

const saveAppearance = async (patch) => {
  const next = {
    style: state.appearance.style || 'neumorphism',
    columns: state.appearance.columns.slice(),
    card: state.appearance.card,
    ...patch,
  };
  state.appearance = next;
  applyAppearance();
  try {
    const answer = await api('POST', '/appearance', next);
    if (answer?.appearance) state.appearance = answer.appearance;
  } catch (error) {
    toast('error', error.message);
  }
  applyAppearance();
  renderBoardOnly();
};

const boot = async () => {
  stopPolling();
  try {
    const config = await configWithRetry();
    state.config = config;
    state.boards = Array.isArray(config.boards) ? config.boards : [];
    state.plankaProjects = Array.isArray(config.projects) ? config.projects : [];
    if (!config.connected) {
      showLogin();
      return;
    }
    await loadProjects();
    await loadMappings();
    await loadAppearance();
    await loadSnapshot();
    await loadSessionStates();
    showBoard();
    startPolling();
  } catch (error) {
    showFatal(error.message);
  }
};

const loadSessionStates = async () => {
  try {
    const answer = await api('GET', '/sessions');
    state.sessions = answer?.sessions || {};
  } catch {
    state.sessions = state.sessions || {};
  }
};

const loadSnapshot = async () => {
  try {
    state.snapshot = await api('GET', '/snapshot?fresh=1');
  } catch (error) {
    if (error.kind === 'not-configured' || error.kind === 'auth') {
      state.snapshot = null;
      showLogin(error.message);
      return;
    }
    throw error;
  }
};

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */

const showLogin = (message = '') => {
  state.view = 'login';
  stopPolling();
  closeSheet();
  closeSortPopover();
  const config = state.config || {};
  const wrapper = el('div', 'center');
  const card = el('div', 'login-card');
  const title = el('h1');
  title.append(makeIcon('check'), el('span', '', 'Kanban'));
  const source = state.loginSource || ((state.config || {}).source === 'local' ? 'local' : 'planka');
  const subtitle = el('p', '', source === 'local'
    ? 'Un tablero guardado en este equipo. No necesita servidor, cuenta ni red.'
    : 'Planka es la única fuente de verdad. Entra con tu cuenta para leer y editar el tablero desde aquí.');

  const toggle = el('div', 'source-toggle');
  const sourceButton = (key, label) => {
    const button = el('button', 'source-btn', label);
    button.type = 'button';
    button.setAttribute('aria-pressed', source === key ? 'true' : 'false');
    button.addEventListener('click', () => {
      state.loginSource = key;
      showLogin(message);
    });
    return button;
  };
  toggle.append(sourceButton('planka', 'Planka'), sourceButton('local', 'Local'));

  const form = el('div');
  form.style.display = 'contents';
  const emailField = el('label', 'field');
  emailField.append(el('span', '', 'Correo o usuario'));
  const email = el('input');
  email.type = 'text';
  email.autocomplete = 'username';
  email.value = config.email || '';
  email.placeholder = 'tu@correo.com';
  email.required = true;
  emailField.append(email);

  const passwordField = el('label', 'field');
  passwordField.append(el('span', '', 'Contraseña'));
  const password = el('input');
  password.type = 'password';
  password.autocomplete = 'current-password';
  password.placeholder = 'Contraseña de Planka';
  password.required = true;
  passwordField.append(password);

  const urlField = el('label', 'field');
  urlField.append(el('span', '', 'Servidor de Planka'));
  const baseUrl = el('input');
  baseUrl.type = 'url';
  baseUrl.value = config.baseUrl || 'http://127.0.0.1:3040';
  baseUrl.placeholder = 'http://127.0.0.1:3040';
  urlField.append(baseUrl);

  const errorBox = el('div', 'login-error');
  errorBox.hidden = true;
  if (message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  const note = el('div', 'login-note');
  note.hidden = true;
  const noteText = el('span', '', '');
  const noteButton = el('button', '', 'Abrir Planka');
  noteButton.type = 'button';
  note.append(noteText, noteButton);

  const actions = el('div', 'login-actions');
  const submit = el('button', 'btn-mint', 'Entrar');
  submit.type = 'button';
  actions.append(submit);

  const useLocal = el('button', 'btn-mint', 'Usar tablero local');
  useLocal.type = 'button';
  useLocal.addEventListener('click', async () => {
    useLocal.disabled = true;
    useLocal.textContent = 'Preparando…';
    try {
      await api('POST', '/config', { source: 'local' });
      await boot();
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.hidden = false;
      useLocal.disabled = false;
      useLocal.textContent = 'Usar tablero local';
    }
  });

  if (source === 'local') {
    const localNote = el('p', 'login-note-text', 'Las tarjetas se guardan en un archivo local por proyecto, junto a la extensión. Las sesiones del agente funcionan igual.');
    form.append(toggle, localNote, errorBox, useLocal);
  } else {
    form.append(toggle, emailField, passwordField, urlField, errorBox, note, actions);
  }
  card.append(title, subtitle, form);

  const submitLogin = () => {
    void doLogin({ email: email.value, password: password.value, baseUrl: baseUrl.value.trim() }, submit, errorBox, note);
  };
  submit.addEventListener('click', submitLogin);
  for (const input of [email, password, baseUrl]) {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitLogin();
      }
    });
  }

  noteButton.addEventListener('click', () => {
    const target = baseUrl.value.trim() || 'http://127.0.0.1:3040';
    host.openUrl(target).catch(() => {});
  });

  wrapper.append(card);
  root.replaceChildren(wrapper);
  state.refs = null;
  setTimeout(() => (source === 'local' ? useLocal.focus() : email.focus()), 30);
};

const doLogin = async (values, submit, errorBox, note) => {
  submit.disabled = true;
  submit.textContent = 'Entrando…';
  errorBox.hidden = true;
  note.hidden = true;
  try {
    const result = await api('POST', '/login', values);
    state.boards = Array.isArray(result.boards) ? result.boards : [];
    state.plankaProjects = Array.isArray(result.projects) ? result.projects : state.plankaProjects;
    state.config = {
      ...(state.config || {}),
      connected: true,
      email: values.email,
      baseUrl: values.baseUrl,
      boardId: result.boardId,
      boards: state.boards,
    };
    if (result.snapshot) state.snapshot = result.snapshot;
    else await loadSnapshot();
    await loadProjects();
    await loadMappings();
    await loadAppearance();
    await loadSessionStates();
    showBoard();
    startPolling();
  } catch (error) {
    if (error.kind === 'terms') {
      noteText.textContent = error.message;
      noteButton.onclick = () => host.openUrl(values.baseUrl || 'http://127.0.0.1:3040').catch(() => {});
      note.hidden = false;
    } else if (error.kind === 'service') {
      // Writing config.json can reload the extension; the fresh frame will
      // boot connected, so look once more before reporting a failure.
      await sleep(1000);
      try {
        const config = await api('GET', '/config');
        if (config.connected) {
          state.config = config;
          state.boards = config.boards || [];
          state.plankaProjects = config.projects || state.plankaProjects;
          await loadProjects();
          await loadMappings();
          await loadSnapshot();
          await loadSessionStates();
          showBoard();
          startPolling();
          return;
        }
      } catch {
        // Fall through to the visible error.
      }
      errorBox.textContent = error.message;
      errorBox.hidden = false;
    } else {
      errorBox.textContent = error.message;
      errorBox.hidden = false;
    }
  } finally {
    submit.disabled = false;
    submit.textContent = 'Entrar';
  }
};

/* ------------------------------------------------------------------ */
/* Board shell                                                         */
/* ------------------------------------------------------------------ */

const activeProject = () => {
  if (!state.directory) return null;
  return state.projects.find((project) => project.directory === state.directory) || null;
};

// The selector keeps the active project's boards plus every board that is not
// linked yet, so a project can still reach a second board and a board can still
// be linked. With no active project, or nothing left to show, the full list
// stays available.
const boardsForActiveProject = (boards) => {
  if (state.showAllBoards) return boards;
  const project = activeProject();
  if (!project) return boards;
  const current = state.snapshot?.board?.id || state.config?.boardId || '';
  const visible = boards.filter((board) => {
    const mapping = state.mappings?.[board.id];
    return !mapping || mapping.projectId === project.id || board.id === current;
  });
  return visible.length ? visible : boards;
};

const syncBoardOptions = () => {
  const refs = state.refs;
  if (!refs) return;
  const boards = state.boards.length
    ? state.boards
    : state.snapshot
      ? [{ id: state.snapshot.board.id, name: state.snapshot.board.name }]
      : [];
  const visible = boardsForActiveProject(boards);
  const selected = state.snapshot?.board?.id || state.config?.boardId || '';
  const control = refs.boardSelect;
  if (control) {
    const project = activeProject();
    const options = visible.map((board) => ({ value: board.id, label: board.name }));
    if (project) {
      options.unshift(
        state.showAllBoards
          ? { value: '__project__', label: 'Solo tableros de este proyecto' }
          : { value: '__all__', label: 'Ver todos los tableros' },
      );
    }
    const value = visible.some((board) => board.id === selected)
      ? selected
      : control.value || visible[0]?.id || '';
    control.update(options, value, visible.length < 2 && options.length < 2);
    control.button.title = project && !state.showAllBoards && visible.length < boards.length
      ? `Tableros de ${project.name} y tableros sin proyecto`
      : 'Todos los tableros';
  }
  if (refs.openButton) refs.openButton.disabled = !state.snapshot?.board?.url;
};

const syncProjectChip = () => {
  const refs = state.refs;
  if (!refs?.projectChip) return;
  const mapping = state.snapshot?.project || null;
  const auto = mapping?.autoSession === true;
  const mode = mapping ? (auto ? 'Automática' : 'Manual') : 'Sin proyecto';
  refs.projectChip.textContent = mapping ? `${mapping.name} · ${mode}` : 'Sin proyecto · Asignar';
  refs.projectChip.classList.toggle('missing', !mapping);
  refs.projectChip.classList.toggle('auto', Boolean(mapping) && auto);
  refs.projectChip.setAttribute('aria-pressed', auto ? 'true' : 'false');
  refs.projectChip.title = mapping
    ? `${mapping.name} · Delegación ${mode.toLowerCase()}. Pulsa para cambiar.`
    : 'Asigna este tablero a un proyecto de OpenChamber';
};

const syncProjectSelect = () => {
  const control = state.refs?.projectSelect;
  if (!control) return;
  const mapping = state.snapshot?.project || null;
  const options = [{ value: '', label: 'Sin proyecto' }];
  for (const project of state.projects) options.push({ value: project.id, label: project.name });
  if (mapping && !state.projects.some((project) => project.id === mapping.projectId)) {
    options.push({ value: mapping.projectId, label: mapping.name });
  }
  control.update(options, mapping?.projectId || '', state.projects.length === 0);
  control.button.title = mapping
    ? `Proyecto de las sesiones: ${mapping.name}`
    : 'Asigna un proyecto a este tablero';
};

const labeledField = (text, control) => {
  const wrap = el('label', 'labeled-field');
  wrap.append(el('span', 'labeled-field-label', text), control);
  return wrap;
};

const changeBoardProject = async (projectId) => {
  const snapshot = state.snapshot;
  if (!snapshot) return;
  const project = state.projects.find((item) => item.id === projectId) || null;
  try {
    const answer = await api('POST', '/mapping', {
      boardId: snapshot.board.id,
      projectId: project?.id || '',
      directory: project?.directory || '',
      name: project?.name || '',
      autoSession: snapshot.project?.autoSession === true,
    });
    state.snapshot.project = answer.project || null;
    await loadMappings();
    toast('success', project ? `Tablero asignado a ${project.name}.` : 'Proyecto quitado del tablero.');
  } catch (error) {
    toast('error', error.message);
  }
  renderAll();
  reopenSettings();
};

const showBoard = () => {
  state.view = 'board';
  state.bannerText = '';
  closeSheet();
  if (state.surface === 'page') buildPage();
  else buildPanel();
  renderAll();
};

const setBanner = (message) => {
  state.bannerText = message;
  const banner = state.refs?.banner;
  if (!banner) return;
  if (!message) {
    banner.hidden = true;
    banner.replaceChildren();
    return;
  }
  banner.hidden = false;
  banner.replaceChildren();
  banner.append(el('span', '', message));
  const retry = el('button', '', 'Reintentar');
  retry.type = 'button';
  retry.addEventListener('click', () => void refresh(false));
  banner.append(retry);
};

const MENU_SELECTS = new Set();

const closeMenuSelects = () => {
  for (const item of MENU_SELECTS) item.close();
};

const menuSelect = ({ ariaLabel = '', options = [], value = '', onChange = () => {} }) => {
  const wrap = el('div', 'menu-select');
  const button = el('button', 'menu-select-button');
  button.type = 'button';
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', ariaLabel);
  const label = el('span', 'menu-select-label');
  const chevron = makeIcon('chevron');
  chevron.classList.add('menu-select-chevron');
  button.append(label, chevron);
  const menu = el('div', 'menu-select-menu');
  menu.hidden = true;
  menu.setAttribute('role', 'listbox');
  wrap.append(button, menu);

  let currentOptions = options;
  let currentValue = value;
  let disabled = false;
  let signature = '';

  const render = () => {
    const found = currentOptions.find((option) => option.value === currentValue);
    label.textContent = found?.label || currentOptions[0]?.label || 'Selecciona…';
    button.disabled = disabled;
    menu.replaceChildren();
    for (const option of currentOptions) {
      const item = el('button', 'menu-select-option', option.label);
      item.type = 'button';
      item.dataset.value = option.value;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', option.value === currentValue ? 'true' : 'false');
      item.addEventListener('click', (event) => {
        event.stopPropagation();
        currentValue = option.value;
        render();
        close();
        onChange(option.value);
      });
      menu.append(item);
    }
  };

  const close = () => {
    if (menu.hidden) return;
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  };

  const open = () => {
    if (disabled) return;
    closeMenuSelects();
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
  };

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    if (menu.hidden) open();
    else close();
  });
  menu.addEventListener('click', (event) => event.stopPropagation());

  const item = {
    wrap,
    button,
    menu,
    close,
    get value() {
      return currentValue;
    },
    update(nextOptions, nextValue, nextDisabled = false) {
      const nextSignature = `${JSON.stringify(nextOptions)}|${nextValue}|${nextDisabled}`;
      if (nextSignature === signature) return;
      signature = nextSignature;
      currentOptions = nextOptions || [];
      currentValue = nextValue || '';
      disabled = Boolean(nextDisabled);
      render();
    },
  };
  MENU_SELECTS.add(item);
  render();
  return item;
};

document.addEventListener('click', () => closeMenuSelects());
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenuSelects();
});

/* ------------------------------------------------------------------ */
/* New board                                                           */
/* ------------------------------------------------------------------ */

const closeCreateBoard = (force = false) => {
  const dialog = state.createBoard;
  if (!dialog) return;
  if (!force && state.saving > 0) return;
  dialog.backdrop.remove();
  dialog.sheet.remove();
  state.createBoard = null;
};

const openCreateBoard = () => {
  if (state.createBoard) closeCreateBoard(true);
  const backdrop = el('div', 'sheet-backdrop open');
  const sheet = el('aside', 'sheet create-sheet open');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', 'Crear tablero');

  const head = el('div', 'sheet-head');
  const title = el('div', 'settings-title', 'Nuevo tablero');
  const close = el('button', 'icon-btn');
  close.type = 'button';
  close.title = 'Cerrar';
  close.setAttribute('aria-label', 'Cerrar');
  close.append(makeIcon('close'));
  head.append(title, close);

  const scroll = el('div', 'sheet-scroll');
  const section = el('section', 'settings-section');
  section.append(el('div', 'settings-heading', 'Tablero de Planka'));

  const nameField = el('label', 'field');
  nameField.append(el('span', '', 'Nombre'));
  const nameInput = el('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Mi tablero';
  nameInput.maxLength = 128;
  nameField.append(nameInput);

  const projectField = el('label', 'field');
  projectField.append(el('span', '', 'Proyecto de Planka'));
  const projectSelect = el('select');
  projectSelect.append(new Option('Proyecto nuevo…', ''));
  for (const project of state.plankaProjects) {
    projectSelect.append(new Option(project.name, project.id));
  }
  projectField.append(projectSelect);

  const newProjectField = el('label', 'field');
  newProjectField.append(el('span', '', 'Nombre del proyecto nuevo'));
  const projectInput = el('input');
  projectInput.type = 'text';
  projectInput.placeholder = 'Mi proyecto';
  projectInput.maxLength = 128;
  newProjectField.append(projectInput);

  const note = el(
    'p',
    'settings-note',
    'Se crearán las columnas IDEAS, EN PROGRESO y HECHO, y quedarás en el tablero nuevo.',
  );
  const error = el('p', 'settings-note warning');
  error.hidden = true;

  const syncProjectField = () => {
    newProjectField.hidden = Boolean(projectSelect.value);
  };
  projectSelect.addEventListener('change', syncProjectField);

  const actions = el('div', 'settings-actions');
  const cancel = el('button', 'ghost-btn', 'Cancelar');
  cancel.type = 'button';
  const submit = el('button', 'btn-mint', 'Crear tablero');
  submit.type = 'button';
  actions.append(cancel, submit);

  section.append(nameField, projectField, newProjectField, note, error, actions);
  scroll.append(section);
  sheet.append(head, scroll);
  root.append(backdrop, sheet);
  state.createBoard = { backdrop, sheet };
  syncProjectField();

  let creating = false;
  const create = async () => {
    if (creating) return;
    const name = nameInput.value.trim();
    const projectId = projectSelect.value;
    const projectName = projectId ? '' : projectInput.value.trim();
    error.hidden = true;
    if (!name) {
      error.textContent = 'Escribe un nombre para el tablero.';
      error.hidden = false;
      nameInput.focus();
      return;
    }
    if (!projectId && !projectName) {
      error.textContent = 'Elige un proyecto de Planka o escribe uno nuevo.';
      error.hidden = false;
      projectInput.focus();
      return;
    }
    state.saving += 1;
    creating = true;
    submit.disabled = true;
    cancel.disabled = true;
    submit.textContent = 'Creando…';
    try {
      const answer = await api('POST', '/board/create', { name, projectId, projectName });
      state.boards = Array.isArray(answer?.boards) && answer.boards.length ? answer.boards : state.boards;
      await loadMappings();
      state.config = {
        ...state.config,
        boardId: answer?.board?.id || state.config?.boardId,
        boardName: answer?.board?.name || state.config?.boardName,
      };
      if (answer?.snapshot) state.snapshot = answer.snapshot;
      if (answer?.project && !state.plankaProjects.some((project) => project.id === answer.project.id)) {
        state.plankaProjects = [...state.plankaProjects, answer.project];
      }
      state.saving -= 1;
      creating = false;
      closeCreateBoard(true);
      if (answer?.columnsError) {
        toast('error', `Tablero creado, pero no se pudieron crear las columnas: ${answer.columnsError}`);
      } else {
        toast('success', `Tablero «${answer?.board?.name || name}» creado con ${answer?.columns || 0} columnas.`);
      }
      renderAll();
    } catch (nextError) {
      state.saving -= 1;
      creating = false;
      submit.disabled = false;
      cancel.disabled = false;
      submit.textContent = 'Crear tablero';
      error.textContent = nextError.message;
      error.hidden = false;
    }
  };

  submit.addEventListener('click', () => void create());
  cancel.addEventListener('click', () => closeCreateBoard());
  close.addEventListener('click', () => closeCreateBoard());
  backdrop.addEventListener('click', () => closeCreateBoard());
  for (const input of [nameInput, projectInput]) {
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      void create();
    });
  }
  requestAnimationFrame(() => nameInput.focus());
};

const handleBoardSelect = (value) => {
  if (value === '__all__') {
    state.showAllBoards = true;
    syncBoardOptions();
    return;
  }
  if (value === '__project__') {
    state.showAllBoards = false;
    syncBoardOptions();
    return;
  }
  void switchBoard(value);
};

const boardControl = (boardSelect) => {
  const wrap = el('div', 'board-control');
  wrap.append(boardSelect.wrap);
  if ((state.config?.source || 'planka') !== 'local') {
    const create = el('button', 'icon-btn board-add');
    create.type = 'button';
    create.title = 'Crear tablero en Planka';
    create.setAttribute('aria-label', 'Crear tablero en Planka');
    create.append(makeIcon('plus'));
    create.addEventListener('click', () => openCreateBoard());
    wrap.append(create);
  }
  return wrap;
};

const buildPage = () => {
  const app = el('div', 'app');
  const topbar = el('div', 'topbar');
  const brand = el('div', 'brand');
  brand.append(el('span', 'brand-dot'), el('span', '', 'Kanban'), el('span', 'brand-sub', 'Planka'));

  const boardSelect = menuSelect({
    ariaLabel: 'Tablero',
    onChange: (value) => handleBoardSelect(value),
  });

  const projectSelect = menuSelect({
    ariaLabel: 'Proyecto del tablero',
    onChange: (value) => void changeBoardProject(value),
  });

  const projectChip = el('button', 'project-chip');
  projectChip.type = 'button';
  projectChip.title = 'Cambiar delegación manual o automática';
  projectChip.addEventListener('click', () => {
    const mapping = state.snapshot?.project;
    if (!mapping) {
      openSettings();
      return;
    }
    void changeAutoMode(mapping.autoSession !== true);
  });

  const stoppedChip = el('button', 'quick-filter');
  stoppedChip.type = 'button';
  stoppedChip.title = 'Ver solo tarjetas en progreso sin sesión o con la sesión parada';
  stoppedChip.addEventListener('click', () => toggleStopped());

  const settingsButton = el('button', 'icon-btn');
  settingsButton.type = 'button';
  settingsButton.title = 'Ajustes de Kanban';
  settingsButton.setAttribute('aria-label', 'Ajustes de Kanban');
  settingsButton.append(makeIcon('settings'));
  settingsButton.addEventListener('click', () => openSettings());

  const searchWrap = el('div', 'field-wrap');
  const searchInput = el('input', 'search-input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Buscar por título o descripción';
  searchInput.setAttribute('aria-label', 'Buscar tarjetas');
  searchInput.addEventListener('input', () => {
    state.search = searchInput.value;
    renderBoard();
  });
  searchWrap.append(makeIcon('search'), searchInput);

  const labelFilters = el('div', 'label-filters');
  labelFilters.setAttribute('aria-label', 'Filtrar por etiqueta');

  const spacer = el('div', 'toolbar-spacer');

  const openButton = el('button', 'ghost-btn');
  openButton.type = 'button';
  openButton.append(makeIcon('external'), el('span', '', 'Abrir en Planka'));
  openButton.addEventListener('click', () => {
    const url = state.snapshot?.board?.url;
    if (url) host.openUrl(url).catch(() => {});
  });

  topbar.append(
    brand,
    labeledField('Proyecto', projectSelect.wrap),
    labeledField('Tablero', boardControl(boardSelect)),
    projectChip,
    stoppedChip,
    settingsButton,
    searchWrap,
    labelFilters,
    spacer,
    openButton,
  );

  const banner = el('div', 'banner');
  banner.hidden = true;
  banner.setAttribute('role', 'status');

  const board = el('div', 'board');
  app.append(topbar, banner, board);
  root.replaceChildren(app);
  state.refs = { board, banner, boardSelect, projectSelect, projectChip, stoppedChip, settingsButton, searchInput, labelFilters, openButton };
  setBanner(state.bannerText);
};

const buildPanel = () => {
  const app = el('div', 'app panel-app');
  const topbar = el('div', 'topbar panel-topbar');
  const brand = el('div', 'brand');
  brand.append(el('span', 'brand-dot'), el('span', '', 'Kanban'));

  const boardSelect = menuSelect({
    ariaLabel: 'Tablero',
    onChange: (value) => handleBoardSelect(value),
  });

  const projectSelect = menuSelect({
    ariaLabel: 'Proyecto del tablero',
    onChange: (value) => void changeBoardProject(value),
  });

  const projectChip = el('button', 'project-chip');
  projectChip.type = 'button';
  projectChip.title = 'Cambiar delegación manual o automática';
  projectChip.addEventListener('click', () => {
    const mapping = state.snapshot?.project;
    if (!mapping) {
      openSettings();
      return;
    }
    void changeAutoMode(mapping.autoSession !== true);
  });

  const stoppedChip = el('button', 'quick-filter');
  stoppedChip.type = 'button';
  stoppedChip.title = 'Ver solo tarjetas en progreso sin sesión o con la sesión parada';
  stoppedChip.addEventListener('click', () => toggleStopped());

  const settingsButton = el('button', 'icon-btn');
  settingsButton.type = 'button';
  settingsButton.title = 'Ajustes de Kanban';
  settingsButton.setAttribute('aria-label', 'Ajustes de Kanban');
  settingsButton.append(makeIcon('settings'));
  settingsButton.addEventListener('click', () => openSettings());

  const spacer = el('div', 'toolbar-spacer');

  const openButton = el('button', 'icon-btn');
  openButton.type = 'button';
  openButton.title = 'Abrir en Planka';
  openButton.setAttribute('aria-label', 'Abrir en Planka');
  openButton.append(makeIcon('external'));
  openButton.addEventListener('click', () => {
    const url = state.snapshot?.board?.url;
    if (url) host.openUrl(url).catch(() => {});
  });

  topbar.append(brand, spacer, openButton, settingsButton);

  const selectorRow = el('div', 'selector-row');
  selectorRow.append(
    labeledField('Proyecto', projectSelect.wrap),
    labeledField('Tablero', boardControl(boardSelect)),
  );

  const delegationRow = el('div', 'delegation-row');
  delegationRow.append(projectChip, stoppedChip);

  const banner = el('div', 'banner');
  banner.hidden = true;
  banner.setAttribute('role', 'status');

  const board = el('div', 'board panel-board');
  app.append(topbar, selectorRow, delegationRow, banner, board);
  root.replaceChildren(app);
  state.refs = { board, banner, boardSelect, projectSelect, projectChip, stoppedChip, settingsButton, openButton };
  setBanner(state.bannerText);
};

const syncStoppedChip = () => {
  const chip = state.refs?.stoppedChip;
  if (!chip) return;
  const workList = state.snapshot?.lists?.find((list) => list.id === state.snapshot?.workListId);
  const count = workList ? workList.cards.filter(isStoppedCard).length : 0;
  chip.replaceChildren(el('span', '', 'Paradas'), el('span', 'quick-filter-count', String(count)));
  chip.setAttribute('aria-pressed', state.stoppedOnly ? 'true' : 'false');
  chip.title = count
    ? `${count} tarjeta${count === 1 ? '' : 's'} en progreso sin sesión o parada${count === 1 ? '' : 's'}`
    : 'No hay tarjetas paradas en progreso';
};

const toggleStopped = () => {
  state.stoppedOnly = !state.stoppedOnly;
  if (state.surface === 'page') renderFilters();
  syncStoppedChip();
  renderBoard();
};

const changeAutoMode = async (enabled) => {
  const snapshot = state.snapshot;
  const mapping = snapshot?.project;
  if (!snapshot || !mapping) {
    renderAll();
    return;
  }
  try {
    const answer = await api('POST', '/mapping', {
      boardId: snapshot.board.id,
      projectId: mapping.projectId,
      directory: mapping.directory,
      name: mapping.name,
      autoSession: Boolean(enabled),
    });
    state.snapshot.project = answer.project || mapping;
    toast('success', enabled ? 'Delegación automática: te pedirá confirmación al mover una tarjeta.' : 'Delegación manual: usa Crear sesión en la tarjeta.');
  } catch (error) {
    toast('error', error.message);
  }
  renderAll();
  reopenSettings();
};

const reopenSettings = () => {
  if (!state.settings) return;
  closeSettings(true);
  openSettings();
};

const closeSettings = (force = false) => {
  const settings = state.settings;
  if (!settings) return;
  if (!force && state.settingsDirty) state.settingsDirty = false;
  settings.backdrop.remove();
  settings.sheet.remove();
  state.settings = null;
};

const openSettings = () => {
  if (state.settings) closeSettings(true);
  const snapshot = state.snapshot;
  if (!snapshot) return;
  const config = state.config || {};
  const mapping = snapshot.project || null;

  const backdrop = el('div', 'sheet-backdrop open');
  const sheet = el('aside', 'sheet settings-sheet open');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', 'Ajustes de Kanban');

  const head = el('div', 'sheet-head');
  const title = el('div', 'settings-title', 'Ajustes de Kanban');
  const close = el('button', 'icon-btn');
  close.type = 'button';
  close.title = 'Cerrar';
  close.setAttribute('aria-label', 'Cerrar ajustes');
  close.append(makeIcon('close'));
  head.append(title, close);

  const scroll = el('div', 'sheet-scroll settings-scroll');

  /* Conexión */
  const conexion = el('section', 'settings-section');
  conexion.append(el('div', 'settings-heading', 'Conexión'));
  const isLocal = (config.source || 'planka') === 'local';

  const sourceRow = el('div', 'source-toggle');
  const switchSource = async (target) => {
    try {
      await api('POST', '/config', { source: target });
      closeSettings(true);
      await boot();
      toast('success', target === 'local' ? 'Tablero local activado.' : 'Has vuelto a Planka.');
    } catch (error) {
      toast('error', error.message);
    }
  };
  const sourcePick = (key, label) => {
    const button = el('button', 'source-btn', label);
    button.type = 'button';
    button.setAttribute('aria-pressed', (isLocal ? 'local' : 'planka') === key ? 'true' : 'false');
    button.addEventListener('click', () => void switchSource(key));
    return button;
  };
  sourceRow.append(sourcePick('planka', 'Planka'), sourcePick('local', 'Local'));
  conexion.append(sourceRow);

  const sourceBox = el('div', 'settings-box');
  const connRow = el('div', 'settings-line');
  const connDot = el('span', 'col-dot');
  connDot.style.setProperty('--dot', config.connected ? 'var(--oc-success)' : 'var(--oc-error)');
  connRow.append(connDot, el('span', 'settings-line-text', isLocal
    ? 'Tablero local en este equipo'
    : (config.connected ? `${config.email || 'Planka'} en ${config.baseUrl || 'Planka'}` : 'Sin conexión con Planka')));
  sourceBox.append(connRow);

  if (isLocal) {
    sourceBox.append(el('p', 'settings-note', 'Guardado en un archivo local por proyecto, junto a la extensión. Solo se ve en este equipo.'));
    const backup = el('div', 'settings-actions');
    const downloadButton = (format, label) => {
      const button = el('button', 'ghost-btn', label);
      button.type = 'button';
      button.addEventListener('click', async () => {
        try {
          const answer = await api('POST', '/local/export', { format });
          toast('success', `Guardado en ${answer.path}`);
        } catch (error) {
          toast('error', error.message);
        }
      });
      return button;
    };
    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json,application/json';
    importInput.hidden = true;
    importInput.addEventListener('change', async () => {
      const file = importInput.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        await api('POST', '/local/import', { data: text });
        toast('success', 'Tablero restaurado.');
        closeSettings(true);
        await boot();
      } catch (error) {
        toast('error', error.message);
      } finally {
        importInput.value = '';
      }
    });
    const importButton = el('button', 'ghost-btn', 'Importar copia…');
    importButton.type = 'button';
    importButton.addEventListener('click', () => importInput.click());
    backup.append(
      downloadButton('md', 'Descargar MD'),
      downloadButton('csv', 'Descargar CSV'),
      downloadButton('json', 'Copia JSON'),
      importButton,
      importInput,
    );
    sourceBox.append(backup);
    sourceBox.append(el('p', 'settings-note', 'Se guardan en tu carpeta de Descargas. MD y CSV son para leer y compartir; la copia JSON es la que se puede volver a importar.'));
  } else {
    const connActions = el('div', 'settings-actions');
    const openPlanka = el('button', 'ghost-btn', 'Abrir Planka');
    openPlanka.type = 'button';
    openPlanka.addEventListener('click', () => {
      const url = snapshot.board?.url || config.baseUrl || 'http://127.0.0.1:3040';
      host.openUrl(url).catch(() => {});
    });
    const logout = el('button', 'ghost-btn danger', 'Desconectar Planka');
    logout.type = 'button';
    logout.addEventListener('click', async () => {
      try {
        await api('POST', '/logout');
        state.config = { ...config, connected: false };
        toast('success', 'Kanban desconectado de Planka.');
        closeSettings(true);
        await boot();
      } catch (error) {
        toast('error', error.message);
      }
    });
    connActions.append(openPlanka, logout);
    sourceBox.append(connActions);
  }
  conexion.append(sourceBox);

  /* Delegación */
  const delegacion = el('section', 'settings-section');
  delegacion.append(el('div', 'settings-heading', 'Delegación'));
  delegacion.append(el('p', 'settings-note', 'Solo cambia quién abre la sesión.'));
  const modes = el('div', 'settings-modes');
  const modeCard = (label, description, active, enabled) => {
    const button = el('button', 'mode-card');
    button.type = 'button';
    button.disabled = !enabled;
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.append(el('span', 'mode-card-title', label), el('span', 'mode-card-text', description));
    return button;
  };
  const manualCard = modeCard('Manual', 'Tú abres la sesión con el + de la tarjeta.', mapping?.autoSession !== true, Boolean(mapping));
  const autoCard = modeCard('Automática', 'Al mover a EN PROGRESO te pregunta antes de abrirla.', mapping?.autoSession === true, Boolean(mapping));
  manualCard.addEventListener('click', () => { if (mapping?.autoSession === true) void changeAutoMode(false); });
  autoCard.addEventListener('click', () => { if (mapping?.autoSession !== true) void changeAutoMode(true); });
  modes.append(manualCard, autoCard);
  delegacion.append(modes);
  if (!mapping) delegacion.append(el('p', 'settings-note warning', 'Asigna primero un proyecto al tablero.'));

  /* Estilo */
  const estilo = el('section', 'settings-section');
  estilo.append(el('div', 'settings-heading', 'Apariencia'));
  estilo.append(el('p', 'settings-note', 'Acabado de las tarjetas, los botones y los paneles. Los colores se mantienen como están.'));
  const styleGrid = el('div', 'style-grid');
  const styleOptions = [
    ['neumorphism', 'Neumorfismo', 'Relieve suave y sombras difusas.'],
    ['brutalism', 'Brutalismo', 'Bordes duros y sombras sólidas.'],
    ['glass', 'Cristal', 'Fondo translúcido con desenfoque.'],
  ];
  for (const [key, label, text] of styleOptions) {
    const option = el('button', 'style-card');
    option.type = 'button';
    option.setAttribute('aria-pressed', (state.appearance.style || 'neumorphism') === key ? 'true' : 'false');
    const preview = el('span', 'style-preview');
    preview.dataset.preview = key;
    option.append(preview, el('span', 'style-name', label), el('span', 'style-text', text));
    option.addEventListener('click', () => {
      void saveAppearance({ style: key });
      reopenSettings();
    });
    styleGrid.append(option);
  }
  estilo.append(styleGrid);


  /* Sesiones */
  const sesiones = el('section', 'settings-section');
  sesiones.append(el('div', 'settings-heading', 'Cómo funciona'));
  const sesionesBox = el('div', 'settings-box');
  const fact = (label, text) => {
    const row = el('div', 'settings-fact');
    row.append(el('b', '', label), el('span', '', text));
    return row;
  };
  sesionesBox.append(
    fact('IDEAS', 'el + de la columna crea una tarjeta. El lápiz abre la tarjeta para editar título, detalles, checklist y sesión, y para borrarla. El tic la pasa a EN PROGRESO.'),
    fact('EN PROGRESO', 'es la tarjeta actual. En manual abres la sesión con el +; en automático te pregunta antes de abrirla.'),
    fact('HECHO', 'la tarjeta queda terminada. Las sesiones se cierran cuando pulses el botón de la columna HECHO.'),
  );
  sesionesBox.append(el('p', 'settings-note', 'Al cerrar se borra el vínculo: si vuelves a mover la tarjeta, empieza una sesión nueva. La sesión detenida sigue en la lista para que la archives.'));
  sesiones.append(sesionesBox);

  /* Avanzado */
  const avanzado = el('section', 'settings-section');
  avanzado.append(el('div', 'settings-heading', 'Avanzado'));
  const avanzadoBox = el('div', 'settings-box');
  avanzadoBox.append(el('p', 'settings-note', 'La extensión lee y escribe en la fuente que elijas: tu Planka o un tablero local guardado en este equipo. El agente usa el MCP de Kanban para:'));
  const toolChips = el('div', 'tool-chips');
  for (const name of ['crear tarjetas', 'moverlas', 'completarlas', 'editarlas', 'checklist', 'buscar', 'enlazar sesión']) {
    toolChips.append(el('span', 'tool-chip', name));
  }
  avanzadoBox.append(toolChips);
  avanzadoBox.append(el('p', 'settings-note', 'El MCP solo actúa cuando el agente llama a una herramienta. En Planka lo ves desde cualquier dispositivo; el tablero local vive solo en este equipo. Tras actualizar la extensión, reinicia OpenCode.'));
  avanzado.append(avanzadoBox);

  scroll.append(conexion, estilo, delegacion, sesiones, avanzado);

  const foot = el('div', 'sheet-foot settings-foot');
  const done = el('button', 'btn-mint', 'Listo');
  done.type = 'button';
  done.addEventListener('click', () => closeSettings(true));
  foot.append(el('span', 'settings-foot-text', 'Los cambios se guardan al elegirlos.'), done);

  sheet.append(head, scroll, foot);
  close.addEventListener('click', () => closeSettings(true));
  backdrop.addEventListener('click', () => closeSettings(true));
  root.append(backdrop, sheet);
  state.settings = { backdrop, sheet };
};

const switchBoard = async (boardId) => {
  if (!boardId) return;
  const previous = state.snapshot?.board?.id;
  if (boardId === previous) return;
  try {
    const snapshot = await api('POST', '/board', { boardId });
    state.snapshot = snapshot;
    state.config = { ...state.config, boardId, boardName: snapshot.board.name };
    renderAll();
  } catch (error) {
    if (error.kind === 'service') {
      await sleep(900);
      try {
        const config = await api('GET', '/config');
        state.config = config;
        state.boards = config.boards || [];
        state.plankaProjects = config.projects || state.plankaProjects;
        await loadMappings();
        state.snapshot = await api('GET', '/snapshot?fresh=1');
        renderAll();
        return;
      } catch {
        // Fall through.
      }
    }
    toast('error', error.message);
    renderAll();
  }
};

/* ------------------------------------------------------------------ */
/* Board rendering                                                     */
/* ------------------------------------------------------------------ */

const renderAll = () => {
  if (state.view !== 'board') return;
  syncBoardOptions();
  syncProjectSelect();
  syncProjectChip();
  syncStoppedChip();
  if (state.surface === 'page') renderFilters();
  renderBoard();
};

const renderFilters = () => {
  const holder = state.refs?.labelFilters;
  if (!holder) return;
  holder.replaceChildren();
  const labels = state.snapshot?.labels || [];
  holder.hidden = labels.length === 0;
  for (const label of labels) {
    const chip = el('button', 'label-chip');
    chip.type = 'button';
    chip.style.setProperty('--label', labelColor(label.color || label.name));
    chip.setAttribute('aria-pressed', state.labels.has(label.id) ? 'true' : 'false');
    const dot = el('span', 'label-dot');
    chip.append(dot, el('span', '', label.name));
    chip.addEventListener('click', () => {
      if (state.labels.has(label.id)) state.labels.delete(label.id);
      else state.labels.add(label.id);
      renderFilters();
      renderBoard();
    });
    holder.append(chip);
  }
};

const cardDraggable = () => !state.search.trim() && state.labels.size === 0;

// Renames the card on the card itself: the pencil never opens the sheet, so a
// title edit cannot move the card to another column or position.
const buildCard = (card, listIndex) => {
  const node = el('article', 'card');
  node.tabIndex = 0;
  node.draggable = cardDraggable();
  node.dataset.cardId = card.id;
  node.setAttribute('role', 'button');
  node.setAttribute('aria-label', `${card.name}. Abrir tarjeta`);

  const actions = el('div', 'card-actions');
  node.append(actions);

  const title = el('div', 'card-title', card.name || 'Sin título');
  node.append(title);

  if (card.description.trim()) node.append(el('div', 'card-desc', card.description));

  const meta = el('div', 'card-meta');
  const sessionState = state.sessions?.[card.id];
  if (sessionState) {
    const dot = el('span', 'session-dot');
    const tone = sessionState.tone === 'success'
      ? 'var(--oc-success)'
      : sessionState.tone === 'warning'
        ? 'var(--oc-warning)'
        : 'var(--oc-muted)';
    dot.style.setProperty('--session-tone', tone);
    dot.title = `Sesión: ${sessionState.state}`;
    dot.setAttribute('aria-label', `Sesión: ${sessionState.state}`);
    meta.append(dot);
  }
  if (card.labels.length) {
    const dots = el('div', 'card-labels');
    for (const label of card.labels) {
      const dot = el('span', 'label-dot');
      dot.style.setProperty('--label', labelColor(label.color || label.name));
      dot.title = label.name;
      dots.append(dot);
    }
    meta.append(dots);
  }
  const due = dueInfo(card.dueDate);
  if (due) {
    const dueNode = el('span', `due${due.late ? ' late' : ''}`);
    dueNode.append(makeIcon('calendar'), el('span', '', due.label));
    meta.append(dueNode);
  }
  if (card.checklist.total > 0) {
    const check = el('span', 'check-mini');
    const bar = el('span', 'bar');
    const fill = el('i');
    fill.style.width = `${Math.round((card.checklist.done / card.checklist.total) * 100)}%`;
    bar.append(fill);
    check.append(bar, el('span', '', `${card.checklist.done}/${card.checklist.total}`));
    meta.append(check);
  }
  if (meta.childNodes.length) node.append(meta);

  const edit = el('button', 'card-edit');
  edit.type = 'button';
  edit.title = 'Editar tarjeta';
  edit.setAttribute('aria-label', `Editar la tarjeta ${card.name}`);
  edit.append(makeIcon('edit'));
  edit.addEventListener('click', (event) => {
    event.stopPropagation();
    openSheet(card.id);
  });
  actions.append(edit);

  const open = () => openSheet(card.id);
  node.title = 'Pulsa el lápiz para editar la tarjeta';
  node.setAttribute('aria-label', `${card.name}. Pulsa el lápiz para editar la tarjeta.`);
  // Editing goes through the card sheet only: no inline editor and no
  // double-click shortcut.
  node.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    }
    if (event.key === 'F2') {
      event.preventDefault();
      open();
    }
  });
  node.addEventListener('dragstart', (event) => {
    state.dragging = true;
    state.dragId = card.id;
    node.classList.add('dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', card.id);
    }
  });
  node.addEventListener('dragend', () => {
    state.dragging = false;
    state.dragId = '';
    node.classList.remove('dragging');
    clearDropDecorations();
  });

  return node;
};

const clearDropDecorations = () => {
  const board = state.refs?.board;
  if (!board) return;
  for (const line of board.querySelectorAll('.drop-line')) line.remove();
  for (const column of board.querySelectorAll('.column.drop-target')) column.classList.remove('drop-target');
};

const attachDropTarget = (column, cardsEl, listId) => {
  const otherCards = () =>
    [...cardsEl.querySelectorAll('.card')].filter((node) => node.dataset.cardId !== state.dragId);

  const lineIndexAt = (event) => {
    const cards = otherCards();
    const y = event.clientY;
    let index = cards.length;
    for (let i = 0; i < cards.length; i += 1) {
      const rect = cards[i].getBoundingClientRect();
      if (y < rect.top + rect.height / 2) {
        index = i;
        break;
      }
    }
    return { cards, index };
  };

  const fullIndex = (cards, index) => {
    const list = state.snapshot?.lists.find((entry) => entry.id === listId);
    const all = list?.cards || [];
    const nextId = cards[index]?.dataset.cardId || '';
    let at = nextId ? all.findIndex((card) => card.id === nextId) : all.length;
    if (at < 0) at = all.length;
    const from = all.findIndex((card) => card.id === state.dragId);
    if (from >= 0 && from < at) at -= 1;
    return Math.max(0, at);
  };

  const showLine = (cards, index) => {
    for (const line of cardsEl.querySelectorAll('.drop-line')) line.remove();
    const line = el('div', 'drop-line');
    const before = cards[index];
    if (before) cardsEl.insertBefore(line, before);
    else if (cards.length) cards[cards.length - 1].after(line);
    else cardsEl.append(line);
  };

  const onDragOver = (event) => {
    if (!state.dragId) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    column.classList.add('drop-target');
    const { cards, index } = lineIndexAt(event);
    showLine(cards, index);
  };

  const onDrop = (event) => {
    if (!state.dragId) return;
    event.preventDefault();
    const cardId = state.dragId;
    const { cards, index } = lineIndexAt(event);
    const target = fullIndex(cards, index);
    clearDropDecorations();
    state.dragging = false;
    state.dragId = '';
    void moveCard(cardId, listId, target);
  };

  cardsEl.addEventListener('dragover', onDragOver);
  cardsEl.addEventListener('drop', onDrop);
  cardsEl.addEventListener('dragleave', (event) => {
    if (!cardsEl.contains(event.relatedTarget)) {
      for (const line of cardsEl.querySelectorAll('.drop-line')) line.remove();
    }
  });
  column.addEventListener('dragover', (event) => {
    if (event.target.closest('.cards')) return;
    onDragOver(event);
  });
  column.addEventListener('drop', (event) => {
    if (event.target.closest('.cards')) return;
    onDrop(event);
  });
  column.addEventListener('dragleave', (event) => {
    if (!column.contains(event.relatedTarget)) {
      column.classList.remove('drop-target');
      for (const line of column.querySelectorAll('.drop-line')) line.remove();
    }
  });
};

const createDefaultColumns = async (button) => {
  const boardId = state.snapshot?.board?.id || '';
  if (!boardId) return;
  if (button) button.disabled = true;
  try {
    const answer = await api('POST', '/lists/default', { boardId });
    if (answer?.snapshot) state.snapshot = answer.snapshot;
    const names = Array.isArray(answer?.names) ? answer.names.join(', ') : '';
    if (answer?.created && names) toast('success', `Columnas creadas: ${names}.`);
    else toast('success', 'Las columnas ya existían.');
  } catch (error) {
    toast('error', error.message);
    if (button) button.disabled = false;
    return;
  }
  renderAll();
};

const closeDoneSessions = async (button) => {
  if (button) button.disabled = true;
  try {
    const answer = await api('POST', '/sessions/close-done');
    const count = Number(answer?.count) || 0;
    if (count) {
      toast('success', `Cerrando ${count} sesión${count === 1 ? '' : 'es'} de HECHO.`);
    } else {
      toast('info', 'No hay sesiones que cerrar en HECHO.');
    }
  } catch (error) {
    toast('error', error.message);
  }
  if (button) button.disabled = false;
  await refresh(true);
};

const IDEAS_NAME = /^ideas?$/i;

// IDEAS is the backlog: the list named IDEAS when it exists, otherwise the one
// that is neither EN PROGRESO nor HECHO (the same rule the service uses).
const ideasListId = () => {
  const snapshot = state.snapshot;
  if (!snapshot?.lists?.length) return '';
  const named = snapshot.lists.find((list) => IDEAS_NAME.test(String(list.name || '').trim()));
  if (named) return named.id;
  const backlog = snapshot.lists.find(
    (list) => list.id !== snapshot.workListId && list.id !== snapshot.doneListId,
  );
  return backlog?.id || '';
};

const closeSortPopover = () => {
  const pop = state.sortPop;
  if (!pop) return;
  pop.node.remove();
  if (pop.anchor?.isConnected) {
    pop.anchor.setAttribute('aria-expanded', 'false');
    pop.anchor.classList.remove('open');
  }
  state.sortPop = null;
};

const sortIdeasByPriority = async (listId, action, status) => {
  if (state.sorting) return;
  const list = findList(listId);
  if (!list) {
    closeSortPopover();
    return;
  }
  const targetIds = sortCardsByPriority(list.cards).map((card) => card.id);
  const currentIds = list.cards.map((card) => card.id);
  if (targetIds.join('|') === currentIds.join('|')) {
    status.textContent = 'Ya está ordenada por prioridad.';
    return;
  }

  state.sorting = true;
  state.saving += 1;
  action.disabled = true;
  action.textContent = 'Ordenando…';
  status.textContent = `${targetIds.length} tarjetas · guardando el orden…`;

  let moved = 0;
  try {
    // One moveCard per card that is out of place; each one persists in Planka
    // or in the local board. The list is re-read after every move because
    // moveCard refreshes the snapshot.
    for (let index = 0; index < targetIds.length; index += 1) {
      const live = findList(listId);
      // The board changed under the sort (another project or board): stop.
      if (!live) {
        closeSortPopover();
        return;
      }
      if (live.cards[index]?.id === targetIds[index]) continue;
      await moveCard(targetIds[index], listId, index);
      moved += 1;
    }
  } finally {
    state.sorting = false;
    state.saving -= 1;
    action.disabled = false;
    action.textContent = 'Ordenar IDEAS';
  }

  // moveCard reports its own failure with a toast, so the saved order is the
  // only honest proof that every move landed.
  const saved = (findList(listId)?.cards || []).map((card) => card.id).join('|');
  if (moved && saved === targetIds.join('|')) {
    status.textContent = 'Orden aplicado y guardado en el tablero.';
    toast('success', 'IDEAS ordenadas por prioridad.');
    // The order is saved; the popover has done its job.
    closeSortPopover();
  } else if (moved) {
    status.textContent = 'No se pudo guardar el orden completo. Prueba otra vez.';
    toast('error', 'No se pudo guardar el orden de IDEAS.');
  } else {
    status.textContent = 'Ya está ordenada por prioridad.';
  }
};

const openSortPopover = (anchor, listId) => {
  closeSortPopover();
  const node = el('div', 'sort-pop');
  node.setAttribute('role', 'dialog');
  node.setAttribute('aria-label', 'Ordenar IDEAS por prioridad');

  const head = el('div', 'sort-pop-head');
  head.append(el('span', 'sort-pop-title', 'Ordenar por prioridad'));
  const close = el('button', 'sort-pop-close');
  close.type = 'button';
  close.title = 'Cerrar';
  close.setAttribute('aria-label', 'Cerrar el orden de IDEAS');
  close.append(makeIcon('close'));
  head.append(close);

  const note = el(
    'p',
    'sort-pop-note',
    'Solo IDEAS. Cada tarjeta se clasifica por su título y sus detalles; las que empatan mantienen su orden.',
  );

  const criteria = el('ol', 'sort-criteria');
  SORT_CRITERIA.forEach((criterion, index) => {
    const item = el('li', 'sort-criterion');
    const text = el('span', 'sort-criterion-text');
    text.append(
      el('span', 'sort-criterion-label', criterion.label),
      el('span', 'sort-criterion-hint', criterion.hint),
    );
    item.append(el('span', 'sort-step', String(index + 1)), text);
    criteria.append(item);
  });

  const foot = el('div', 'sort-pop-foot');
  const action = el('button', 'btn-mint sort-run', 'Ordenar IDEAS');
  action.type = 'button';
  const status = el('div', 'sort-pop-status', 'El orden se guarda en el tablero.');
  foot.append(action, status);

  node.append(head, note, criteria, foot);
  document.body.append(node);

  const width = Math.min(268, window.innerWidth - 16);
  node.style.width = `${width}px`;
  const rect = anchor.getBoundingClientRect();
  node.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
  const below = rect.bottom + 6;
  if (below + node.offsetHeight <= window.innerHeight - 8) {
    node.style.top = `${below}px`;
  } else {
    node.style.top = `${Math.max(8, rect.top - node.offsetHeight - 6)}px`;
  }

  anchor.setAttribute('aria-expanded', 'true');
  anchor.classList.add('open');
  state.sortPop = { node, anchor };

  close.addEventListener('click', () => closeSortPopover());
  action.addEventListener('click', () => void sortIdeasByPriority(listId, action, status));
  node.addEventListener('click', (event) => event.stopPropagation());
};

const buildSortControl = (list) => {
  const button = el('button', 'col-sort');
  button.type = 'button';
  button.title = 'Ordenar IDEAS por prioridad';
  button.setAttribute('aria-label', 'Ordenar IDEAS por prioridad');
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', 'false');
  button.append(makeIcon('sort'), el('span', 'col-sort-label', 'Ordenar'));
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    if (state.sortPop) {
      closeSortPopover();
      return;
    }
    openSortPopover(button, list.id);
  });
  return button;
};

document.addEventListener('click', (event) => {
  const pop = state.sortPop;
  if (!pop) return;
  if (pop.node.contains(event.target) || event.target.closest?.('.col-sort')) return;
  closeSortPopover();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeSortPopover();
});

// The popover is fixed; a scroll would leave it behind the header.
document.addEventListener(
  'scroll',
  () => {
    if (!state.sorting) closeSortPopover();
  },
  true,
);

window.addEventListener('resize', () => closeSortPopover());

const renderBoard = () => {
  const board = state.refs?.board;
  if (!board) return;
  const snapshot = state.snapshot;
  const scrollState = new Map();
  for (const existing of board.querySelectorAll('.column')) {
    const cards = existing.querySelector('.cards');
    if (!cards) continue;
    const overflowing = cards.scrollHeight > cards.clientHeight + 2;
    scrollState.set(existing.dataset.listId, {
      top: cards.scrollTop,
      atBottom: overflowing && cards.scrollHeight - cards.scrollTop - cards.clientHeight <= 2,
    });
  }
  const boardScrollLeft = board.scrollLeft;
  board.replaceChildren();
  if (!snapshot) return;
  if (!snapshot.lists.length) {
    const isLocal = (state.config?.source || 'planka') === 'local';
    const empty = el('div', 'board-empty');
    const create = el('button', 'btn-mint board-empty-action');
    create.type = 'button';
    create.append(makeIcon('plus'), el('span', '', 'Crear columnas'));
    create.addEventListener('click', () => void createDefaultColumns(create));
    empty.append(
      el('div', 'board-empty-title', 'Este tablero no tiene columnas'),
      el(
        'p',
        'board-empty-text',
        isLocal
          ? 'Crea IDEAS, EN PROGRESO y HECHO para empezar.'
          : 'Crea IDEAS, EN PROGRESO y HECHO desde aquí. Se crearán en Planka.',
      ),
      create,
    );
    board.append(empty);
    return;
  }

  snapshot.lists.forEach((list, listIndex) => {
    const column = el('section', 'column');
    column.dataset.listId = list.id;
    if (state.composerListId === list.id) column.classList.add('composing');

    const head = el('div', 'col-head');
    const dot = el('span', 'col-dot');
    const tone = state.appearance?.columns?.[listIndex] || COLUMN_TOKENS[listIndex % COLUMN_TOKENS.length];
    dot.style.setProperty('--dot', tone);
    column.style.setProperty('--column-tone', tone);
    const name = el('button', 'col-name', list.name);
    name.type = 'button';
    name.title = 'Editar nombre de la columna';
    name.setAttribute('aria-label', `Editar nombre de la columna ${list.name}`);
    name.addEventListener('click', (event) => {
      event.stopPropagation();
      startListRename(column, list, name);
    });
    const visible = list.cards.filter((card) => !state.hiddenCards.has(card.id) && matchesFilters(card));
    const count = el('span', 'col-count', String(visible.length));
    head.append(dot, name);

    const cardsEl = el('div', 'cards');
    if (!visible.length) {
      const hint = el('div', 'column-hint', state.search || state.labels.size ? 'Sin coincidencias' : 'Arrastra una tarjeta aquí');
      cardsEl.append(hint);
    }
    for (const card of visible) cardsEl.append(buildCard(card, listIndex));

    const composer = el('div', 'composer');
    const input = el('input');
    input.type = 'text';
    input.placeholder = 'Título y Enter';
    input.setAttribute('aria-label', `Nueva tarjeta en ${list.name}`);
    const row = el('div', 'composer-row');
    const hint = el('span', 'composer-hint', 'Enter guarda · Esc cierra');
    const cancel = el('button', 'ghost-btn', 'Cancelar');
    cancel.type = 'button';
    const create = el('button', 'btn-mint', 'Crear');
    create.type = 'button';
    row.append(hint, cancel, create);
    composer.append(input, row);

    const submitComposer = () => {
      const value = input.value.trim();
      if (!value) return;
      void createCard(list.id, value, input);
    };
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitComposer();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closeComposer();
      }
    });
    input.addEventListener('input', () => {
      state.composerListId = list.id;
    });
    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (state.composerListId !== list.id) return;
        const focused = document.activeElement;
        if (focused && composer.contains(focused)) return;
        if (!input.value.trim()) closeComposer();
      }, 120);
    });
    cancel.addEventListener('click', () => closeComposer());
    create.addEventListener('click', submitComposer);

    const addCard = el('button', 'add-card');
    addCard.type = 'button';
    addCard.title = `Crear tarjeta en ${list.name}`;
    addCard.setAttribute('aria-label', `Crear tarjeta en ${list.name}`);
    addCard.append(makeIcon('plus'));
    addCard.addEventListener('click', () => openComposer(list.id));
    // The + sits next to the column title; the count keeps the far right.
    // Only IDEAS can be ordered by priority, and its chip sits next to the count.
    head.append(addCard);
    if (list.id === ideasListId()) head.append(buildSortControl(list));
    head.append(count);

    let closeDone = null;
    if (list.id === snapshot.doneListId) {
      // Count distinct sessions, not cards: three cards can share one session.
      const sessions = new Set();
      for (const card of list.cards) {
        const session = state.sessions?.[card.id];
        if (!session) continue;
        sessions.add(session.sessionId || `card:${card.id}`);
      }
      const linked = sessions.size;
      if (linked) {
        closeDone = el('button', 'ghost-btn done-close');
        closeDone.type = 'button';
        closeDone.title = 'Cerrar las sesiones de las tarjetas en HECHO';
        closeDone.setAttribute('aria-label', closeDone.title);
        closeDone.append(
          makeIcon('close'),
          el('span', '', linked === 1 ? 'Cerrar sesión' : `Cerrar ${linked} sesiones`),
        );
        closeDone.addEventListener('click', () => void closeDoneSessions(closeDone));
      }
    }

    column.append(head, ...(closeDone ? [closeDone] : []), cardsEl, composer);
    attachDropTarget(column, cardsEl, list.id);
    board.append(column);

    if (state.composerListId === list.id) {
      setTimeout(() => input.focus(), 0);
    }
  });

  for (const column of board.querySelectorAll('.column')) {
    const saved = scrollState.get(column.dataset.listId);
    if (!saved) continue;
    const cards = column.querySelector('.cards');
    if (!cards) continue;
    cards.scrollTop = saved.atBottom ? cards.scrollHeight : saved.top;
  }
  board.scrollLeft = boardScrollLeft;
};


const startListRename = (column, list, nameButton) => {
  if (column.querySelector('.col-name-input')) return;
  const input = el('input', 'col-name-input');
  input.value = list.name;
  input.setAttribute('aria-label', 'Nombre de la columna');
  let finished = false;
  const finish = async (save) => {
    if (finished) return;
    finished = true;
    const value = input.value.trim();
    if (!save || !value || value === list.name) {
      renderBoard();
      return;
    }
    try {
      await api('PATCH', '/list', { id: list.id, name: value });
      await refresh(true);
    } catch (error) {
      toast('error', error.message);
      renderBoard();
    }
  };
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void finish(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      void finish(false);
    }
  });
  input.addEventListener('blur', () => void finish(true));
  nameButton.replaceWith(input);
  input.focus();
  input.select();
};

const openComposer = (listId) => {
  state.composerListId = listId;
  renderBoard();
};

const closeComposer = () => {
  state.composerListId = '';
  renderBoard();
};

const createCard = async (listId, name, input) => {
  try {
    await api('POST', '/card', { listId, name });
    if (input) input.value = '';
    await refresh(true);
  } catch (error) {
    toast('error', error.message);
  }
};

const moveCard = async (cardId, listId, index) => {
  const found = findCard(cardId);
  if (!found) return;
  const target = findList(listId);
  if (!target) return;
  const currentIndex = found.list.cards.findIndex((card) => card.id === cardId);
  if (found.list.id === listId) {
    const destination = Math.max(0, Math.min(index, found.list.cards.length - 1));
    if (destination === currentIndex) return;
  }

  const [card] = found.list.cards.splice(currentIndex, 1);
  const bounded = Math.max(0, Math.min(index, target.cards.length));
  target.cards.splice(bounded, 0, { ...card, listId });
  renderBoard();

  try {
    const answer = await api('POST', '/card/move', { id: cardId, listId, index: bounded });
    await refresh(true);
    if (answer?.sent) {
      toast('success', `Mensaje enviado a la sesión de ${answer.project || 'el proyecto del tablero'}.`);
      try {
        await host.openSession(answer.sessionId);
      } catch {
        toast('error', 'El mensaje se envió, pero no se pudo abrir la sesión.');
      }
    } else if (answer?.sessionError) {
      toast('error', `No se pudo enviar el mensaje a la sesión: ${answer.sessionError}`);
    } else if (answer?.sessionId) {
      toast('success', answer.reused ? 'Sesión abierta.' : `Sesión creada en ${answer.project || 'el proyecto del tablero'}.`);
      try {
        await host.openSession(answer.sessionId);
      } catch {
        toast('error', 'La sesión se creó, pero no se pudo abrir.');
      }
    } else if (answer?.autoPending) {
      offerSession(cardId, card?.name, answer.project, document.querySelector(`[data-card-id="${CSS.escape(cardId)}"]`));
    } else if (answer?.manual) {
      toast('info', 'Delegación manual: abre la tarjeta y pulsa Crear sesión.');
    } else if (answer?.needsMapping) {
      toast('error', 'Asigna un proyecto a este tablero para crear la sesión.');
    }
  } catch (error) {
    toast('error', error.message);
    await refresh(true);
  }
};

const renderBoardOnly = () => {
  if (state.view === 'board') renderBoard();
};

/* ------------------------------------------------------------------ */
/* Sheet                                                               */
/* ------------------------------------------------------------------ */

const buildSheet = (card) => {
  const backdrop = el('div', 'sheet-backdrop');
  const sheet = el('aside', 'sheet');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', `Tarjeta ${card.name}`);

  const head = el('div', 'sheet-head');
  const titleWrap = el('div', 'sheet-title-wrap');
  titleWrap.append(el('span', 'section-label', 'Título'));
  const title = el('textarea', 'sheet-title');
  title.rows = 1;
  title.value = card.name;
  title.placeholder = 'Título de la tarjeta';
  title.setAttribute('aria-label', 'Título de la tarjeta');
  titleWrap.append(title);
  // The title keeps its real size: a long title wraps and grows instead of
  // scrolling inside one line.
  const growTitle = () => {
    title.style.height = 'auto';
    title.style.height = `${title.scrollHeight}px`;
  };
  const close = el('button', 'icon-btn');
  close.type = 'button';
  close.title = 'Cerrar';
  close.setAttribute('aria-label', 'Cerrar');
  close.append(makeIcon('close'));
  head.append(titleWrap, close);

  const scroll = el('div', 'sheet-scroll');

  const sessionSection = el('div', 'sheet-session-section');
  sessionSection.append(el('span', 'section-label', 'Sesión'));
  const sessionRow = el('div', 'sheet-session');
  const sessionSelect = el('select', 'session-select');
  sessionSelect.setAttribute('aria-label', 'Sesión asignada a la tarjeta');
  const sessionRemove = el('button', 'ghost-btn', 'Quitar');
  sessionRemove.type = 'button';
  sessionRemove.style.display = 'none';
  const sessionNote = el('div', 'session-note', 'Cargando sesiones…');
  sessionRow.append(sessionSelect, sessionRemove);
  sessionSection.append(sessionRow, sessionNote);

  const descriptionSection = el('div');
  descriptionSection.append(el('span', 'section-label', 'Detalles'));
  const description = el('textarea', 'description');
  description.value = card.description;
  description.placeholder = 'Añade detalles…';
  descriptionSection.append(description);

  const deleteSection = el('div', 'sheet-delete-section');
  const remove = el('button', 'ghost-btn sheet-delete');
  remove.type = 'button';
  remove.append(makeIcon('trash'), el('span', '', 'Eliminar tarjeta'));
  let confirmingDelete = false;
  let deleteTimer = null;
  const resetDelete = () => {
    confirmingDelete = false;
    remove.classList.remove('confirming');
    remove.replaceChildren(makeIcon('trash'), el('span', '', 'Eliminar tarjeta'));
  };
  remove.addEventListener('click', () => {
    if (!confirmingDelete) {
      confirmingDelete = true;
      remove.classList.add('confirming');
      remove.replaceChildren(makeIcon('trash'), el('span', '', 'Pulsa otra vez para eliminar'));
      deleteTimer = setTimeout(resetDelete, 2500);
      return;
    }
    clearTimeout(deleteTimer);
    remove.disabled = true;
    const node = document.querySelector(`[data-card-id="${CSS.escape(card.id)}"]`);
    void closeSheet();
    void queueDelete(card, node || document.createElement('div'));
  });
  deleteSection.append(remove);

  scroll.append(sessionSection, descriptionSection, deleteSection);

  const foot = el('div', 'sheet-foot');
  const saveState = el('span', 'save-state', '');
  const cancel = el('button', 'ghost-btn sheet-cancel', 'Cancelar');
  cancel.type = 'button';
  const confirm = el('button', 'btn-mint sheet-confirm', 'Confirmar');
  confirm.type = 'button';
  foot.append(saveState, cancel, confirm);

  sheet.append(head, scroll, foot);

  const session = {
    card,
    backdrop,
    sheet,
    title,
    growTitle,
    sessionSelect,
    sessionRemove,
    sessionNote,
    description,
    saveState,
    pending: new Set(),
  };
  state.sheet = session;

  // The sheet is a draft until Confirmar: nothing is written while typing, so
  // Cancelar can discard every change and close.
  title.addEventListener('input', () => {
    session.pending.add('name');
    setSaveState('Sin guardar');
    growTitle();
  });
  title.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void confirmSheet();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      void closeSheet();
    }
  });

  description.addEventListener('input', () => {
    session.pending.add('description');
    setSaveState('Sin guardar');
  });


  close.addEventListener('click', () => void closeSheet());
  backdrop.addEventListener('click', () => void closeSheet());
  cancel.addEventListener('click', () => void closeSheet());
  confirm.addEventListener('click', () => void confirmSheet());

  root.append(backdrop, sheet);
  void loadSessionSheet(session);
  requestAnimationFrame(() => {
    backdrop.classList.add('open');
    sheet.classList.add('open');
    growTitle();
    title.focus({ preventScroll: true });
    title.setSelectionRange(title.value.length, title.value.length);
  });

  return session;
};

const loadSessionSheet = async (sheet) => {
  if (!sheet) return;
  let link = null;
  try {
    const answer = await api('GET', `/link?cardId=${encodeURIComponent(sheet.card.id)}`);
    link = answer.link || null;
  } catch {
    link = null;
  }
  if (state.sheet !== sheet) return;

  const options = [{ id: '', title: 'Sin sesión' }];
  const add = (id, title) => {
    if (!id || options.some((option) => option.id === id)) return;
    options.push({ id, title: title || id });
  };
  const mapping = state.snapshot?.project || null;
  if (mapping?.projectId) {
    try {
      const snapshot = await host.listSessions(mapping.projectId);
      const list = Array.isArray(snapshot?.sessions) ? snapshot.sessions : [];
      for (const entry of list
        .filter((item) => !item.archivedAt)
        .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
        .slice(0, 40)) {
        add(entry.id, entry.title || entry.id);
      }
    } catch {
      // The current session is still offered.
    }
  }
  if (state.session?.id) add(state.session.id, state.session.title || 'Esta sesión');
  if (link?.sessionId) add(link.sessionId, link.sessionTitle || link.sessionId);
  if (state.sheet !== sheet) return;

  sheet.sessionSelect.replaceChildren();
  for (const option of options) sheet.sessionSelect.append(new Option(option.title, option.id));
  sheet.sessionSelect.value = link?.sessionId || '';
  sheet.sessionRemove.style.display = link ? '' : 'none';
  sheet.sessionNote.textContent = link
    ? 'Sesión asignada. Mientras trabaja, la tarjeta va a EN PROGRESO; al terminar, a HECHO.'
    : 'Sin sesión asignada. Elige una para vincularla a esta tarjeta.';

  sheet.sessionSelect.onchange = async () => {
    const value = sheet.sessionSelect.value;
    try {
      if (!value) await api('DELETE', '/link', { cardId: sheet.card.id });
      else {
        const chosen = options.find((option) => option.id === value);
        await api('POST', '/link', {
          cardId: sheet.card.id,
          sessionId: value,
          sessionTitle: chosen?.title || '',
        });
      }
      await loadSessionStates();
      await refreshBoardOnly();
      await loadSessionSheet(sheet);
    } catch (error) {
      toast('error', error.message);
    }
  };

  sheet.sessionRemove.onclick = async () => {
    try {
      await api('DELETE', '/link', { cardId: sheet.card.id });
      await loadSessionStates();
      await refreshBoardOnly();
      await loadSessionSheet(sheet);
    } catch (error) {
      toast('error', error.message);
    }
  };
};

const openSheet = (cardId) => {
  const found = findCard(cardId);
  if (!found) return;
  if (state.sheet) {
    removeSheetNodes();
    state.sheet = null;
  }
  state.sheetId = cardId;
  buildSheet(found.card);
};

const removeSheetNodes = () => {
  const session = state.sheet;
  if (!session) return;
  session.backdrop.remove();
  session.sheet.remove();
};

const closeSheet = async () => {
  const session = state.sheet;
  if (!session) {
    state.sheetId = '';
    return;
  }
  removeSheetNodes();
  state.sheet = null;
  state.sheetId = '';
  renderBoardOnly();
};

const setSaveState = (text, kind = '') => {
  const node = state.sheet?.saveState;
  if (!node) return;
  node.textContent = text;
  node.className = `save-state${kind ? ` ${kind}` : ''}`;
};

const saveSheet = async () => {
  const session = state.sheet;
  if (!session) return false;
  const fields = session.pending;
  const name = session.title.value.trim();
  // A title or description edit never carries a column: the sheet cannot move
  // the card, so an edit always keeps it in its list and position.
  if (fields.has('name') && !name) {
    setSaveState(TITLE_REQUIRED, 'error');
    toast('error', TITLE_REQUIRED);
    return false;
  }
  const payload = { id: session.card.id };
  if (fields.has('name')) payload.name = name;
  if (fields.has('description')) payload.description = session.description.value;
  if (Object.keys(payload).length === 1) return true;

  state.saving += 1;
  setSaveState('Guardando…');
  try {
    await api('PATCH', '/card', payload);
    session.pending.clear();
    try {
      const answer = await api('GET', `/card?id=${encodeURIComponent(session.card.id)}`);
      applyServerCard(answer.card);
    } catch {
      // The PATCH already saved: a failed reread must not block Confirmar.
    }
    setSaveState('Guardado');
    await refreshBoardOnly();
    return true;
  } catch (error) {
    setSaveState(error.message, 'error');
    toast('error', error.message);
    return false;
  } finally {
    state.saving -= 1;
  }
};

const confirmSheet = async () => {
  if (!state.sheet) return;
  const saved = await saveSheet();
  if (!saved) return;
  await closeSheet();
};

const rereadSheet = async (silent = false) => {
  const session = state.sheet;
  if (!session) return;
  try {
    const answer = await api('GET', `/card?id=${encodeURIComponent(session.card.id)}`);
    applyServerCard(answer.card);
    if (!silent) setSaveState('Guardado');
    await refreshBoardOnly();
  } catch (error) {
    if (!silent) {
      setSaveState(error.message, 'error');
      toast('error', error.message);
    }
    if (error.kind === 'not-found') await closeSheet();
  }
};

const applyServerCard = (server) => {
  const session = state.sheet;
  if (!session || server.id !== session.card.id) return;
  session.card = server;
  mergeCard(server);

  const pending = session.pending;
  if (!pending.has('name') && document.activeElement !== session.title) {
    session.title.value = server.name;
    session.growTitle?.();
  }
  if (!pending.has('description') && document.activeElement !== session.description) {
    session.description.value = server.description;
  }
};

/* ------------------------------------------------------------------ */
/* Refresh loop                                                        */
/* ------------------------------------------------------------------ */

const refresh = async (silent = false) => {
  if (state.fetching || state.view !== 'board') return;
  state.fetching = true;
  try {
    const [snapshot] = await Promise.all([
      api('GET', '/snapshot'),
      loadSessionStates(),
    ]);
    state.snapshot = snapshot;
    setBanner('');
    renderAll();
  } catch (error) {
    if (error.kind === 'not-configured' || error.kind === 'auth') {
      showLogin(error.message);
      return;
    }
    if (!silent) toast('error', error.message);
    setBanner(error.message);
  } finally {
    state.fetching = false;
  }
};

const refreshBoardOnly = async () => {
  if (state.view !== 'board') return;
  try {
    const [snapshot] = await Promise.all([
      api('GET', '/snapshot'),
      loadSessionStates(),
    ]);
    state.snapshot = snapshot;
    setBanner('');
    renderAll();
  } catch {
    // The sheet keeps working from the last read.
  }
};

const startPolling = () => {
  stopPolling();
  state.poll = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (isPaused()) return;
    void refresh(true);
  }, POLL_MS);
};

const stopPolling = () => {
  if (state.poll) clearInterval(state.poll);
  state.poll = null;
};

window.addEventListener('pagehide', () => {
  const pending = state.pendingDelete;
  if (!pending) return;
  api('DELETE', '/card', { id: pending.card.id }).catch(() => {});
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !isPaused()) void refresh(true);
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (state.sheet) {
    event.preventDefault();
    void closeSheet();
  } else if (state.settings) {
    event.preventDefault();
    closeSettings(true);
  } else if (state.createBoard) {
    event.preventDefault();
    closeCreateBoard();
  } else if (state.composerListId) {
    event.preventDefault();
    closeComposer();
  }
});

const showFatal = (message) => {
  state.view = 'error';
  stopPolling();
  const wrapper = el('div', 'center');
  const box = el('div', 'empty-state');
  box.append(
    el('h2', '', 'No se puede abrir Kanban'),
    el('p', '', message || 'Inténtalo de nuevo en unos segundos.'),
  );
  const retry = el('button', 'btn-mint', 'Reintentar');
  retry.type = 'button';
  retry.addEventListener('click', () => void boot());
  box.append(retry);
  wrapper.append(box);
  root.replaceChildren(wrapper);
  state.refs = null;
};
