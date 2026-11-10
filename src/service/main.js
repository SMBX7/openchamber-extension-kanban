// Host service for the Kanban extension. Planka stays the source of truth;
// this process only holds a short-lived snapshot cache and the session password
// in memory. The token is persisted by the config module (mode 600).
import http from 'node:http';
import { createServiceHost, SESSION_EVENTS_PATH, readSessionEventRequest } from '@openchamber/sdk';
import { clearConfig, isConnected, readConfig, saveConfig } from '../shared/config.js';
import { clearClosePending, getLink, linksForSession, listLinks, pendingCloseForSession, removeLink, setLink } from '../shared/links.js';
import { getBoardProject, setBoardProject } from '../shared/board-projects.js';
import { readAppearance, setAppearance } from '../shared/appearance.js';
import { LOCAL_BOARD_ID, LocalClient } from '../shared/local.js';
import { PlankaClient, PlankaError, flattenCards, searchCards } from '../shared/planka.js';

const PORT = Number(process.env.OPENCHAMBER_SERVICE_PORT);
const TOKEN = process.env.OPENCHAMBER_SERVICE_TOKEN || '';
const SNAPSHOT_TTL_MS = 1500;

let sessionPassword = '';
let cache = { boardId: '', at: 0, data: null, inflight: null };
const pendingCloses = new Map();

let serviceHost = null;
try {
  serviceHost = createServiceHost({ env: process.env });
} catch {
  serviceHost = null;
}

const closePrompt = (title) => `La tarjeta «${title || 'sin título'}» se ha movido a HECHO. La tarea está terminada. Cierra esta sesión y guarda el resumen en Engram.`;

const sendClosePrompt = async (cardId, link) => {
  if (!serviceHost) return false;
  try {
    await serviceHost.sessions.send(link.sessionId, closePrompt(link.title));
    pendingCloses.set(link.sessionId, { cardId, phase: 'wait-close', title: link.title });
    clearClosePending(cardId);
    return true;
  } catch {
    pendingCloses.delete(link.sessionId);
    removeLink(cardId);
    return false;
  }
};

const triggerClose = async (cardId) => {
  const link = getLink(cardId);
  if (!link || !serviceHost) return false;
  if (pendingCloses.has(link.sessionId)) return true;
  try {
    const status = await serviceHost.sessions.status(link.sessionId);
    if (status.status === 'idle') return sendClosePrompt(cardId, link);
    pendingCloses.set(link.sessionId, { cardId, phase: 'wait-idle', title: link.title });
    return true;
  } catch {
    removeLink(cardId);
    return false;
  }
};

const handleSessionEvent = async (event) => {
  const sessionId = event?.session?.id;
  let pending = sessionId ? pendingCloses.get(sessionId) : null;
  if (!pending && sessionId && event.type === 'turn-finished') {
    const entry = pendingCloseForSession(sessionId);
    if (entry) {
      const [cardId, link] = entry;
      await sendClosePrompt(cardId, link);
      pending = pendingCloses.get(sessionId) || null;
      if (pending) return;
    }
    const links = linksForSession(sessionId);
    for (const [cardId, link] of links) {
      const boardId = link.boardId || readConfig().boardId;
      if (!boardId) continue;
      try {
        const snapshot = await getSnapshot({ boardId, fresh: true });
        const card = flattenCards(snapshot).find((entry) => entry.id === cardId);
        if (!card) {
          removeLink(cardId);
          continue;
        }
        if (card.listId === snapshot.doneListId) {
          await sendClosePrompt(cardId, link);
          return;
        }
      } catch {
        // A Planka hiccup on one link must not stop the others.
      }
    }
  }
  if (!pending) return;
  if (event.type === 'turn-finished') {
    if (pending.phase === 'wait-idle') {
      const link = getLink(pending.cardId);
      if (link) await sendClosePrompt(pending.cardId, link);
      else pendingCloses.delete(sessionId);
      return;
    }
    if (pending.phase === 'wait-close') {
      try {
        if (serviceHost) await serviceHost.sessions.stop(sessionId);
      } catch {
        // The session may already be gone; the task is closed either way.
      }
      pendingCloses.delete(sessionId);
      removeLink(pending.cardId);
    }
    return;
  }
  if (event.type === 'turn-failed' && pending.phase === 'wait-close') {
    try {
      if (serviceHost) await serviceHost.sessions.stop(sessionId);
    } catch {
      // Same as above.
    }
    pendingCloses.delete(sessionId);
    removeLink(pending.cardId);
  }
};

const client = () => {
  const config = readConfig();
  if (config.source === 'local') return new LocalClient(config);
  return new PlankaClient(config, {
  password: sessionPassword,
  onToken: (token) => {
    try {
      saveConfig({ token });
    } catch {
      // A read-only package still works for this session; the panel shows the
      // failure on the next request.
    }
  },
  });
};

const boardIdOf = async (config, requested) => {
  if (config.source === 'local') return LOCAL_BOARD_ID;
  const candidate = requested || config.boardId;
  if (candidate) return String(candidate);
  return client().resolveBoardId();
};

const getSnapshot = async ({ boardId = '', fresh = false } = {}) => {
  const config = readConfig();
  if (!isConnected(config)) {
    throw new PlankaError('Conecta Kanban con Planka para ver el tablero.', { kind: 'not-configured', status: 401 });
  }
  const id = await boardIdOf(config, boardId);
  const now = Date.now();
  if (!fresh && cache.data && cache.boardId === id && now - cache.at < SNAPSHOT_TTL_MS) {
    return cache.data;
  }
  if (cache.inflight && cache.inflight.id === id) return cache.inflight.promise;

  const promise = client()
    .readBoard(id)
    .then((data) => {
      cache = { boardId: id, at: Date.now(), data, inflight: null };
      return data;
    })
    .catch((error) => {
      if (cache.inflight?.id === id) cache.inflight = null;
      throw error;
    });
  cache.inflight = { id, promise };
  return promise;
};

const WORK_LIST_NAME = /(^|\b)(en progreso|en proceso|in progress|doing|en curso|wip)(\b|$)/i;

const workListFor = (snapshot) => {
  const named = snapshot?.lists?.find((list) => WORK_LIST_NAME.test(list.name));
  if (named) return named;
  const candidates = (snapshot?.lists || []).filter((list) => list.id !== snapshot.doneListId);
  return candidates[1] || null;
};

const snapshotView = (snapshot) => ({
  ...snapshot,
  project: getBoardProject(snapshot.board.id),
  workListId: workListFor(snapshot)?.id || '',
});

const sessionPrompt = (card, board, project) => {
  const checklist = (card?.taskLists || [])
    .flatMap((taskList) => taskList.tasks.map((task) => `- ${task.name}`))
    .slice(0, 12);
  return [
    `Trabaja en la tarjeta de Planka «${card?.name || 'sin título'}» del tablero «${board?.name || ''}».`,
    card?.description ? `Descripción: ${card.description}` : '',
    checklist.length ? `Checklist:\n${checklist.join('\n')}` : '',
    `Proyecto: ${project.name}.`,
    'Empieza investigando el código y proponiendo un plan antes de cambiar nada.',
  ]
    .filter(Boolean)
    .join('\n');
};

const startWorkSession = async (card, board, project, boardId) => {
  if (!serviceHost) throw new Error('El servicio no puede abrir sesiones en este host.');
  const started = await serviceHost.sessions.start({
    prompt: sessionPrompt(card, board, project),
    title: String(card?.name || 'Tarjeta de Kanban').slice(0, 120),
    directory: project.directory,
  });
  setLink(card.id, started.sessionId, { boardId, title: card.name, sessionTitle: card.name });
  return { ...started, project: project.name };
};

const short = (value, max = 60) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const sessionStateFor = async (cardId) => {
  const link = getLink(cardId);
  if (!link) return { state: 'sin sesión', tone: 'warning' };
  if (!serviceHost) return { state: 'sin control', tone: 'muted' };
  try {
    const status = await serviceHost.sessions.status(link.sessionId);
    if (status.status === 'busy') return { state: 'trabajando', tone: 'success' };
    if (status.status === 'waiting') return { state: 'esperando', tone: 'warning' };
    return { state: 'parada', tone: 'muted' };
  } catch {
    return { state: 'sesión cerrada', tone: 'muted' };
  }
};

const startCardFromStatus = async (cardId, { forceSession = false } = {}) => {
  const config = readConfig();
  if (!isConnected(config)) throw new PlankaError('Conecta Kanban con Planka.', { kind: 'not-configured', status: 401 });
  const boardId = await boardIdOf(config);
  const project = getBoardProject(boardId);
  if (!project) throw new PlankaError('Asigna un proyecto al tablero en el panel de Kanban.', { kind: 'validation' });
  const existing = getLink(cardId);
  if (existing) return { sessionId: existing.sessionId, project: project.name };
  const snapshot = await getSnapshot({ boardId, fresh: true });
  const card = flattenCards(snapshot).find((entry) => entry.id === String(cardId));
  if (!card) throw new PlankaError('Esa tarjeta ya no existe.', { kind: 'not-found', status: 404 });
  const workList = workListFor(snapshot);
  if (!workList) throw new PlankaError('Este tablero no tiene una columna de trabajo.', { kind: 'validation' });
  if (card.listId !== workList.id) {
    await client().moveCard(card.id, workList.id, undefined, boardId);
    invalidate();
  }
  if (!forceSession && project.autoSession !== true) return { moved: true, project: project.name };
  const started = await startWorkSession(card, snapshot.board, project, boardId);
  return { sessionId: started.sessionId, project: project.name };
};

const moveCardToBacklog = async (cardId) => {
  const config = readConfig();
  if (!isConnected(config)) throw new PlankaError('Conecta Kanban con Planka.', { kind: 'not-configured', status: 401 });
  const boardId = await boardIdOf(config);
  const snapshot = await getSnapshot({ boardId, fresh: true });
  const card = flattenCards(snapshot).find((entry) => entry.id === String(cardId));
  if (!card) throw new PlankaError('Esa tarjeta ya no existe.', { kind: 'not-found', status: 404 });
  const workList = workListFor(snapshot);
  const backlog = snapshot.lists.find((list) => list.id !== workList?.id && list.id !== snapshot.doneListId);
  if (!backlog) throw new PlankaError('Este tablero no tiene una lista de ideas.', { kind: 'validation' });
  if (card.listId === backlog.id) return;
  await client().moveCard(card.id, backlog.id, 0, boardId);
  invalidate();
};

const handleStatusAction = async (body) => {
  const id = String(body.id || '');
  if (id.startsWith('back-')) {
    await moveCardToBacklog(id.slice('back-'.length));
    return;
  }
  if (id.startsWith('start-idea-')) {
    await startCardFromStatus(id.slice('start-idea-'.length));
    return;
  }
  if (id === 'start-task') {
    const cardId = String(body.value || '');
    if (cardId && cardId !== 'none') await startCardFromStatus(cardId);
    return;
  }
  if (id.startsWith('start-')) {
    await startCardFromStatus(id.slice('start-'.length));
    return;
  }
  if (id.startsWith('complete-')) {
    const cardId = id.slice('complete-'.length);
    const config = readConfig();
    const boardId = await boardIdOf(config);
    await client().completeCard(cardId, boardId);
    invalidate();
    await triggerClose(cardId);
    return;
  }
  throw new PlankaError('Acción no reconocida.', { kind: 'validation' });
};

const invalidate = () => {
  cache = { boardId: cache.boardId, at: 0, data: null, inflight: null };
};

const statusView = async () => {
  const config = readConfig();
  if (!isConnected(config)) {
    return {
      rows: [
        {
          kind: 'note',
          id: 'kanban-connect',
          text: 'Kanban: abre la extensión y conecta con Planka.',
          tone: 'info',
        },
      ],
    };
  }
  try {
    const snapshot = await getSnapshot();
    const project = getBoardProject(snapshot.board.id);
    const workList = workListFor(snapshot);
    const doneList = snapshot.lists.find((list) => list.id === snapshot.doneListId) || null;
    const total = snapshot.counts.total;
    const completed = doneList?.cards.length || 0;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    const backlog = snapshot.lists.find((list) => list.id !== workList?.id && list.id !== snapshot.doneListId) || null;
    const current = workList?.cards[0] || null;
    const session = current ? await sessionStateFor(current.id) : null;

    const rows = [
      {
        kind: 'line',
        id: 'kanban-summary',
        label: snapshot.board.name,
        dot: snapshot.counts.incomplete > 0 ? 'accent' : 'success',
        content: { kind: 'bar', value: percent, tone: 'success' },
        value: `${completed}/${total}`,
        tooltip: project ? `Sesiones en ${project.name}` : 'Sin proyecto asignado; asígnalo en el panel de Kanban.',
      },
    ];

    if (current) {
      const actions = [
        {
          kind: 'button',
          id: `complete-${current.id}`,
          label: 'Completar',
          variant: 'outline',
          confirm: `¿Completar «${short(current.name, 40)}»?`,
        },
      ];
      rows.push({
        kind: 'line',
        id: 'kanban-current',
        label: 'En curso',
        dot: session.tone,
        value: short(current.name, 18),
        tooltip: `${current.name} · ${session.state}`,
        actions,
      });
    } else {
      rows.push({
        kind: 'note',
        id: 'kanban-current',
        text: 'Sin tarea en curso.',
        tone: 'muted',
      });
    }

    const ideas = backlog?.cards || [];
    const ideaCards = ideas.slice(0, 3);
    ideaCards.forEach((card, index) => {
      rows.push({
        kind: 'note',
        id: `kanban-idea-${card.id}`,
        text: `${index + 1}. ${String(card.name || 'Idea').slice(0, 195)}`,
      });
    });
    const controls = ideaCards.length
      ? ideaCards.map((card, index) => ({
          kind: 'button',
          id: `start-idea-${card.id}`,
          label: String(index + 1),
        }))
      : undefined;
    if (ideas.length > 3) {
      rows.push({
        kind: 'note',
        id: 'kanban-more-ideas',
        text: `y ${ideas.length - 3} ideas más en ${backlog?.name || 'la lista'}.`,
        tone: 'muted',
      });
    } else if (!ideas.length) {
      rows.push({
        kind: 'note',
        id: 'kanban-no-ideas',
        text: 'No hay ideas en la lista de entrada.',
        tone: 'muted',
      });
    }

    if (!project) {
      rows.push({
        kind: 'note',
        id: 'kanban-project',
        text: 'Asigna un proyecto a este tablero en el panel de Kanban para crear sesiones.',
        tone: 'warning',
      });
    }

    return controls ? { rows, controls } : { rows };
  } catch (error) {
    return {
      rows: [
        {
          kind: 'note',
          id: 'kanban-error',
          text: error instanceof PlankaError ? error.message : 'No se puede leer Planka.',
          tone: 'warning',
        },
      ],
    };
  }
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 2_000_000) {
        reject(new PlankaError('La petición es demasiado grande.', { kind: 'validation', status: 413 }));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new PlankaError('El cuerpo de la petición no es JSON válido.', { kind: 'validation', status: 400 }));
      }
    });
    req.on('error', reject);
  });

const requireConnected = () => {
  const config = readConfig();
  if (!isConnected(config)) {
    throw new PlankaError('Conecta Kanban con Planka para continuar.', { kind: 'not-configured', status: 401 });
  }
  return config;
};

const statusOf = (error) => {
  if (!(error instanceof PlankaError)) return 500;
  if (error.status) return error.status;
  if (error.kind === 'network') return 502;
  if (error.kind === 'auth' || error.kind === 'credentials' || error.kind === 'not-configured') return 401;
  if (error.kind === 'terms' || error.kind === 'totp') return 403;
  if (error.kind === 'not-found') return 404;
  return 400;
};

const routes = {
  'POST /login': async (body) => {
    const email = String(body.email || '').trim();
    const password = String(body.password || '');
    const baseUrl = String(body.baseUrl || readConfig().baseUrl || '').trim();
    if (!email || !password) {
      throw new PlankaError('Escribe tu correo y tu contraseña de Planka.', { kind: 'validation' });
    }
    const next = new PlankaClient({ ...readConfig(), baseUrl, email }, {
      password,
      onToken: () => {},
    });
    const token = await next.login();
    sessionPassword = password;

    const boards = await next.getBoards().catch(() => []);
    const chosen =
      (body.boardId && String(body.boardId)) ||
      (boards.find((board) => board.id === readConfig().boardId)?.id ?? '') ||
      boards[0]?.id ||
      '';
    const boardName = boards.find((board) => board.id === chosen)?.name || '';
    saveConfig({ baseUrl, email, token, boardId: chosen, boardName });
    invalidate();
    let snapshot = null;
    try {
      snapshot = await getSnapshot({ fresh: true });
    } catch {
      snapshot = null;
    }
    return { ok: true, boards, boardId: chosen, snapshot };
  },

  'POST /logout': async () => {
    sessionPassword = '';
    clearConfig();
    invalidate();
    return { ok: true };
  },

  'GET /config': async () => {
    const config = readConfig();
    if (config.source === 'local') {
      let boards = [];
      try {
        boards = await client().getBoards();
      } catch {
        boards = [];
      }
      const board = boards[0] || null;
      return {
        connected: true,
        source: 'local',
        baseUrl: '',
        email: '',
        boardId: LOCAL_BOARD_ID,
        boardName: board?.name || 'Kanban local',
        boards,
        boardUrl: '',
      };
    }
    if (!isConnected(config)) {
      return {
        connected: false,
        source: 'planka',
        baseUrl: config.baseUrl,
        email: config.email,
        boardId: config.boardId,
        boardName: config.boardName,
        boards: [],
      };
    }
    let boards = [];
    try {
      boards = await client().getBoards();
    } catch {
      boards = [];
    }
    const board = boards.find((item) => item.id === config.boardId) || boards[0] || null;
    return {
      connected: true,
      baseUrl: config.baseUrl,
      email: config.email,
      boardId: board?.id || config.boardId,
      boardName: board?.name || config.boardName,
      boards,
      boardUrl: board?.url || '',
      source: 'planka',
    };
  },

  'POST /config': async (body) => {
    const source = body?.source === 'local' ? 'local' : 'planka';
    if (source === 'local') {
      saveConfig({ source: 'local', boardId: LOCAL_BOARD_ID, boardName: 'Kanban local' });
    } else {
      saveConfig({ source: 'planka', boardId: '', boardName: '' });
    }
    invalidate();
    return { source };
  },

  'GET /appearance': async () => ({ appearance: readAppearance() }),

  'POST /appearance': async (body) => ({ appearance: setAppearance(body || {}) }),

  'GET /work': async () => {
    const config = readConfig();
    if (!isConnected(config)) return { connected: false };
    const boardId = await boardIdOf(config);
    const snapshot = await getSnapshot({ boardId });
    const project = getBoardProject(boardId);
    const workList = workListFor(snapshot);
    const doneList = snapshot.lists.find((list) => list.id === snapshot.doneListId) || null;
    const total = snapshot.counts.total;
    const completed = doneList?.cards.length || 0;
    const backlog = snapshot.lists.find((list) => list.id !== workList?.id && list.id !== snapshot.doneListId) || null;
    const currentCard = workList?.cards[0] || null;
    let current = null;
    if (currentCard) {
      const state = await sessionStateFor(currentCard.id);
      const link = getLink(currentCard.id);
      current = {
        id: currentCard.id,
        name: currentCard.name,
        state: state.state,
        tone: state.tone,
        sessionId: link?.sessionId || '',
      };
    }
    return {
      connected: true,
      board: { name: snapshot.board.name },
      counts: { total, completed, incomplete: total - completed },
      project: project
        ? {
            id: project.projectId,
            name: project.name,
            directory: project.directory,
            autoSession: project.autoSession === true,
          }
        : null,
      current,
      ideas: (backlog?.cards || []).slice(0, 3).map((card) => ({ id: card.id, name: card.name })),
      backlogId: backlog?.id || '',
      backlogName: backlog?.name || '',
    };
  },

  'GET /boards': async () => {
    requireConnected();
    return { boards: await client().getBoards() };
  },

  'GET /sessions': async () => {
    const links = listLinks();
    const entries = await Promise.all(
      Object.keys(links).map(async (cardId) => [cardId, await sessionStateFor(cardId)]),
    );
    return { sessions: Object.fromEntries(entries) };
  },

  'GET /link': async (_body, url) => ({
    link: getLink(url.searchParams.get('cardId') || ''),
  }),

  'POST /link': async (body) => {
    requireConnected();
    const cardId = String(body.cardId || '');
    const sessionId = String(body.sessionId || '');
    if (!cardId || !sessionId) throw new PlankaError('Faltan la tarjeta o la sesión.', { kind: 'validation' });
    const config = readConfig();
    const boardId = await boardIdOf(config);
    const snapshot = await getSnapshot({ boardId });
    const card = flattenCards(snapshot).find((entry) => entry.id === cardId);
    if (!card) throw new PlankaError('Esa tarjeta ya no existe en Planka.', { kind: 'not-found', status: 404 });
    const link = setLink(cardId, sessionId, {
      boardId,
      title: card.name,
      sessionTitle: String(body.sessionTitle || '').trim() || sessionId,
    });
    return { link };
  },

  'DELETE /link': async (body) => {
    const cardId = String(body.cardId || '');
    if (!cardId) throw new PlankaError('Falta la tarjeta.', { kind: 'validation' });
    removeLink(cardId);
    return { ok: true };
  },

  'GET /snapshot': async (_body, url) => {
    const boardId = url.searchParams.get('boardId') || '';
    const fresh = url.searchParams.get('fresh') === '1';
    const snapshot = await getSnapshot({ boardId, fresh });
    return snapshotView(snapshot);
  },

  'GET /mapping': async (_body, url) => ({
    project: getBoardProject(url.searchParams.get('boardId') || ''),
  }),

  'POST /mapping': async (body) => {
    requireConnected();
    const boardId = String(body.boardId || readConfig().boardId || '');
    if (!boardId) throw new PlankaError('Falta el tablero.', { kind: 'validation' });
    const project = setBoardProject(boardId, body);
    return { project };
  },

  'GET /card': async (_body, url) => {
    requireConnected();
    const id = url.searchParams.get('id');
    if (!id) throw new PlankaError('Falta el id de la tarjeta.', { kind: 'validation' });
    const config = readConfig();
    const boardId = await boardIdOf(config);
    const board = await getSnapshot({ boardId, fresh: true });
    const card = flattenCards(board).find((item) => item.id === String(id));
    if (!card) throw new PlankaError('Esa tarjeta ya no existe en Planka.', { kind: 'not-found', status: 404 });
    return { card, askedAt: Date.now() };
  },

  'GET /search': async (_body, url) => {
    requireConnected();
    const snapshot = await getSnapshot();
    const query = url.searchParams.get('q') || '';
    return {
      query,
      cards: searchCards(snapshot, query).map((card) => ({
        id: card.id,
        name: card.name,
        description: card.description,
        listId: card.listId,
        labels: card.labels,
      })),
    };
  },

  'POST /card': async (body) => {
    requireConnected();
    const listId = String(body.listId || '');
    const name = String(body.name || '').trim();
    if (!listId || !name) throw new PlankaError('La tarjeta necesita columna y título.', { kind: 'validation' });
    const config = readConfig();
    const boardId = await boardIdOf(config);
    const item = await client().createCard(listId, name, boardId, {
      description: body.description,
      dueDate: body.dueDate,
    });
    invalidate();
    return { card: item };
  },

  'PATCH /card': async (body) => {
    requireConnected();
    const id = String(body.id || '');
    if (!id) throw new PlankaError('Falta el id de la tarjeta.', { kind: 'validation' });
    const config = readConfig();
    const boardId = await boardIdOf(config);
    const item = await client().updateCard(id, body, boardId);
    invalidate();
    return { card: item };
  },

  'PATCH /list': async (body) => {
    requireConnected();
    const id = String(body.id || '');
    const name = String(body.name || '').trim();
    if (!id || !name) throw new PlankaError('La columna necesita id y nombre.', { kind: 'validation' });
    const item = await client().renameList(id, name);
    invalidate();
    return { list: item };
  },

  'POST /card/move': async (body) => {
    requireConnected();
    const id = String(body.id || '');
    const listId = String(body.listId || '');
    if (!id || !listId) throw new PlankaError('Faltan la tarjeta o la columna.', { kind: 'validation' });
    const config = readConfig();
    const boardId = await boardIdOf(config);
    const before = await getSnapshot({ boardId, fresh: true }).catch(() => null);
    const beforeCard = before ? flattenCards(before).find((card) => card.id === id) : null;
    const workList = before ? workListFor(before) : null;
    const item = await client().moveCard(id, listId, Number.isInteger(body.index) ? body.index : undefined, boardId);
    invalidate();
    const snapshot = await getSnapshot({ boardId }).catch(() => null);
    if (snapshot?.doneListId !== listId) clearClosePending(id);

    let linked = false;
    let sessionId = '';
    let needsMapping = false;
    let manual = false;
    let sessionError = '';

    if (snapshot?.doneListId === listId) {
      linked = await triggerClose(id);
    } else if (workList && listId === workList.id && beforeCard?.listId !== workList.id) {
      const existing = getLink(id);
      if (existing) {
        sessionId = existing.sessionId;
      } else {
        const project = getBoardProject(boardId);
        if (!project) {
          needsMapping = true;
        } else if (project.autoSession !== true) {
          manual = true;
        } else {
          try {
            const card = snapshot ? flattenCards(snapshot).find((entry) => entry.id === id) : beforeCard;
            const started = await startWorkSession(card, snapshot?.board || before?.board, project, boardId);
            sessionId = started.sessionId;
          } catch (error) {
            sessionError = error instanceof Error ? error.message : 'No se pudo crear la sesión.';
          }
        }
      }
    }

    return {
      card: item,
      linked,
      sessionId,
      needsMapping,
      manual,
      sessionError,
      project: getBoardProject(boardId)?.name || '',
    };
  },

  'POST /card/back': async (body) => {
    requireConnected();
    const cardId = String(body.cardId || '');
    if (!cardId) throw new PlankaError('Falta la tarjeta.', { kind: 'validation' });
    const config = readConfig();
    const boardId = await boardIdOf(config);
    const snapshot = await getSnapshot({ boardId, fresh: true });
    const workList = workListFor(snapshot);
    const backlog = snapshot.lists.find(
      (list) => list.id !== workList?.id && list.id !== snapshot.doneListId,
    );
    if (!backlog) throw new PlankaError('Este tablero no tiene una lista de ideas.', { kind: 'validation' });
    const card = flattenCards(snapshot).find((entry) => entry.id === cardId);
    if (!card) throw new PlankaError('Esa tarjeta ya no existe.', { kind: 'not-found', status: 404 });
    const link = getLink(cardId);
    if (link) {
      if (serviceHost) {
        try {
          await serviceHost.sessions.stop(link.sessionId);
        } catch {
          // The card still returns to ideas even if its session is already gone.
        }
      }
      removeLink(cardId);
    }
    await client().moveCard(card.id, backlog.id, 0, boardId);
    invalidate();
    return { ok: true, list: backlog.name, stopped: Boolean(link) };
  },

  'POST /session/start': async (body) => {
    requireConnected();
    const cardId = String(body.cardId || '');
    if (!cardId) throw new PlankaError('Falta la tarjeta.', { kind: 'validation' });
    return startCardFromStatus(cardId, { forceSession: true });
  },

  'POST /session/stop': async (body) => {
    requireConnected();
    const sessionId = String(body.sessionId || '');
    if (!sessionId) throw new PlankaError('Falta la sesión.', { kind: 'validation' });
    if (!serviceHost) throw new PlankaError('El servicio no puede controlar sesiones en este host.', { kind: 'api' });
    const result = await serviceHost.sessions.stop(sessionId);
    pendingCloses.delete(sessionId);
    return result;
  },

  'POST /card/complete': async (body) => {
    requireConnected();
    const id = String(body.id || '');
    if (!id) throw new PlankaError('Falta el id de la tarjeta.', { kind: 'validation' });
    const config = readConfig();
    const boardId = await boardIdOf(config);
    const result = await client().completeCard(id, boardId);
    invalidate();
    const linked = result.already ? false : await triggerClose(id);
    return { ...result, linked };
  },

  'DELETE /card': async (body) => {
    requireConnected();
    const id = String(body.id || '');
    if (!id) throw new PlankaError('Falta el id de la tarjeta.', { kind: 'validation' });
    const link = getLink(id);
    if (link) {
      if (serviceHost) {
        try {
          await serviceHost.sessions.stop(link.sessionId);
        } catch {
          // The card is deleted even if its session is already gone.
        }
      }
      removeLink(id);
    }
    await client().deleteCard(id);
    invalidate();
    return { ok: true };
  },

  'POST /board': async (body) => {
    requireConnected();
    const boardId = String(body.boardId || '');
    if (!boardId) throw new PlankaError('Elige un tablero.', { kind: 'validation' });
    const boards = await client().getBoards();
    const board = boards.find((item) => item.id === boardId);
    if (!board) throw new PlankaError('Ese tablero no está disponible.', { kind: 'not-found', status: 404 });
    saveConfig({ boardId: board.id, boardName: board.name });
    invalidate();
    return snapshotView(await getSnapshot({ boardId, fresh: true }));
  },

  'POST /checklist': async (body) => {
    requireConnected();
    const cardId = String(body.cardId || '');
    const name = String(body.name || 'Checklist').trim();
    if (!cardId) throw new PlankaError('Falta la tarjeta.', { kind: 'validation' });
    const config = readConfig();
    const boardId = await boardIdOf(config);
    const tasks = Array.isArray(body.tasks) ? body.tasks : [];
    const result = await client().addChecklist(cardId, name, boardId, tasks);
    invalidate();
    return result;
  },

  'POST /task': async (body) => {
    requireConnected();
    const taskListId = String(body.taskListId || '');
    const name = String(body.name || '').trim();
    if (!taskListId || !name) throw new PlankaError('La tarea necesita checklist y nombre.', { kind: 'validation' });
    const item = await client().addTask(taskListId, name);
    invalidate();
    return { task: item };
  },

  'PATCH /task': async (body) => {
    requireConnected();
    const id = String(body.id || '');
    if (!id) throw new PlankaError('Falta el id de la tarea.', { kind: 'validation' });
    const item = await client().checkTask(id, body.isCompleted);
    invalidate();
    return { task: item };
  },

  'POST /label': async (body) => {
    requireConnected();
    const cardId = String(body.cardId || '');
    const labelId = String(body.labelId || '');
    if (!cardId || !labelId) throw new PlankaError('Faltan la tarjeta o la etiqueta.', { kind: 'validation' });
    const config = readConfig();
    const boardId = await boardIdOf(config);
    const added = await client().toggleLabel(cardId, labelId, boardId);
    invalidate();
    return { added };
  },

  'DELETE /label': async (body) => {
    requireConnected();
    const cardId = String(body.cardId || '');
    const labelId = String(body.labelId || '');
    if (!cardId || !labelId) throw new PlankaError('Faltan la tarjeta o la etiqueta.', { kind: 'validation' });
    const config = readConfig();
    const boardId = await boardIdOf(config);
    await client().removeLabel(cardId, labelId, boardId);
    invalidate();
    return { ok: true };
  },
};

const server = http.createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (TOKEN && req.headers.authorization !== `Bearer ${TOKEN}`) {
    res.writeHead(401).end(JSON.stringify({ message: 'No autorizado.' }));
    return;
  }

  const url = new URL(req.url || '/', 'http://127.0.0.1');
  const path = url.pathname;
  const method = (req.method || 'GET').toUpperCase();

  if (path === '/health') {
    res.writeHead(200).end('{}');
    return;
  }

  const run = async () => {
    if (path === '/status') {
      if (method === 'POST') {
        const body = await readBody(req);
        await handleStatusAction(body);
      }
      const view = await statusView();
      res.writeHead(200).end(JSON.stringify(view));
      return;
    }
    if (path === SESSION_EVENTS_PATH && method === 'POST') {
      const body = await readBody(req);
      res.writeHead(200).end(JSON.stringify({ ok: true }));
      const request = readSessionEventRequest(JSON.stringify(body));
      if (request) void handleSessionEvent(request.event);
      return;
    }
    const handler = routes[`${method} ${path}`];
    if (!handler) {
      res.writeHead(404).end(JSON.stringify({ message: 'Ruta no encontrada.' }));
      return;
    }
    let body = {};
    if (method !== 'GET' && method !== 'DELETE') body = await readBody(req);
    else if (method === 'DELETE') body = await readBody(req);
    const answer = await handler(body, url);
    res.writeHead(200).end(JSON.stringify(answer));
  };

  run().catch((error) => {
    const status = statusOf(error);
    res.writeHead(status).end(
      JSON.stringify({
        message: error instanceof Error ? error.message : 'Ha fallado la petición.',
        kind: error instanceof PlankaError ? error.kind : 'unknown',
      }),
    );
  });
});

server.listen(PORT, '127.0.0.1');

const shutdown = () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
