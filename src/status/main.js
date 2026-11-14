import { connectHost } from '@openchamber/sdk';
import { applyHostReady } from '@openchamber/sdk/ui';

const host = connectHost();
const root = document.querySelector('#root');
const POLL_MS = 800;

const ICONS = {
  check: '<path d="m5 12 4.5 4.5L19 7"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M6 7l1 12h10l1-12"/>',
  open: '<path d="M14 4h6v6M20 4 10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
  edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="m13.5 6.5 3 3"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
};

const state = { data: null, error: '', busy: false, booted: false, picking: false, menuOpen: false, adding: false, draft: '', confirmId: '', askSession: '', pendingDelete: null, sessions: [], sessionsProjectId: '', sessionsAt: 0, directory: '', editId: '', editDraft: '', expanded: new Set() };
let confirmTimer = null;
let poll = null;
let inFlight = false;

const el = (tag, className = '', text = '') => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

const icon = (name) => {
  const wrap = el('span', 'icon');
  wrap.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  return wrap;
};

const parseBody = (text) => {
  try {
    return JSON.parse(text || '{}');
  } catch {
    return {};
  }
};

const withDirectory = (path) => {
  if (!state.directory) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}directory=${encodeURIComponent(state.directory)}`;
};

const api = async (method, path, body) => {
  const result = await host.serviceRequest({
    method,
    path: withDirectory(path),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = parseBody(result.body);
  if (result.status >= 200 && result.status < 300) return data;
  throw new Error(data.message || `Kanban ha respondido ${result.status}.`);
};

const toneVar = (tone) => {
  if (tone === 'success') return 'var(--oc-success)';
  if (tone === 'warning') return 'var(--oc-warning)';
  return 'var(--oc-muted)';
};

const tickButton = (label, title, onClick) => {
  const button = el('button', 'tick');
  button.type = 'button';
  button.title = title;
  button.setAttribute('aria-label', label);
  button.disabled = state.busy;
  button.append(icon('check'));
  button.addEventListener('click', () => void onClick());
  return button;
};

const openButton = (sessionId) => {
  const button = el('button', 'open');
  button.type = 'button';
  button.title = 'Abrir sesión';
  button.setAttribute('aria-label', 'Abrir sesión');
  button.append(icon('open'));
  button.addEventListener('click', async () => {
    try {
      await host.openSession(sessionId);
    } catch {
      state.error = 'No se pudo abrir la sesión enlazada.';
      render();
    }
  });
  return button;
};

// Inline title editor for the Work Status. It is the only way to rename a card
// from this section without opening the side panel or a session.
const renderEditor = (card) => {
  const wrap = el('div', 'card-edit');
  const input = el('textarea', 'card-edit-input');
  input.rows = 1;
  input.value = state.editDraft;
  input.dataset.id = card.id;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', 'Título de la tarjeta');

  // The editor must keep the size of the title it replaces: a long title is
  // edited as a wrapped block, never squeezed into one line.
  const grow = () => {
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight}px`;
  };

  let saving = false;
  let finished = false;

  const clearError = () => {
    wrap.querySelector('.card-edit-error')?.remove();
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  };

  // The service rejects an empty title with its own message; showing it in
  // place keeps the card intact and the typed text available for a retry.
  const showError = (message) => {
    clearError();
    const error = el('div', 'card-edit-error', message);
    error.id = 'card-edit-error';
    error.setAttribute('role', 'alert');
    wrap.append(error);
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', 'card-edit-error');
  };

  const commit = async (fromKeyboard) => {
    if (saving || finished) return;
    saving = true;
    state.busy = true;
    input.disabled = true;
    input.setAttribute('aria-busy', 'true');
    clearError();
    try {
      await api('PATCH', '/card', { id: card.id, name: input.value.trim() });
      finished = true;
      state.busy = false;
      if (state.editId === card.id) {
        state.editId = '';
        state.editDraft = '';
      }
      await load(true);
      // The editor no longer exists: put the keyboard back on its pencil so a
      // keyboard user does not lose the place in the list.
      focusEditButton(card.id);
      return;
    } catch (error) {
      saving = false;
      state.busy = false;
      input.disabled = false;
      input.removeAttribute('aria-busy');
      showError(error.message || 'No se pudo guardar el título.');
      if (fromKeyboard) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  };

  const cancel = () => {
    if (finished) return;
    finished = true;
    cancelEdit(card.id);
  };

  input.addEventListener('input', () => {
    state.editDraft = input.value;
    clearError();
    grow();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void commit(true);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    }
  });
  input.addEventListener('blur', () => {
    // A closed editor (Escape or a successful save) must not save on removal.
    if (state.editId !== card.id) return;
    void commit(false);
  });

  wrap.append(input);
  requestAnimationFrame(grow);
  return wrap;
};

// Ends any open inline edit without saving: Escape, or another card taking
// over the editor. The typed text is dropped and the card keeps its title.
const cancelEdit = (cardId) => {
  if (!state.editId) return false;
  if (cardId && state.editId !== cardId) return false;
  const id = state.editId;
  state.editId = '';
  state.editDraft = '';
  render();
  focusEditButton(id);
  return true;
};

const startEdit = (card) => {
  if (state.busy) return;
  const open = root.querySelector('.card-edit-input');
  if (open) {
    // The open editor keeps the section until it saves or cancels: swapping it
    // for another card would drop its inline validation error.
    open.focus();
    if (open.dataset.id === card.id) {
      const end = open.value.length;
      open.setSelectionRange(end, end);
    }
    return;
  }
  state.editId = card.id;
  state.editDraft = card.name || '';
  render();
  requestAnimationFrame(() => {
    const input = root.querySelector('.card-edit-input');
    if (!input || input.dataset.id !== card.id) return;
    const scroller = root.querySelector('.status-scroll');
    const scrollTop = scroller ? scroller.scrollTop : 0;
    input.focus({ preventScroll: true });
    const end = input.value.length;
    input.setSelectionRange(end, end);
    // Editing must not move the section to the bottom of the text.
    if (scroller) scroller.scrollTop = scrollTop;
    requestAnimationFrame(() => {
      if (scroller) scroller.scrollTop = scrollTop;
    });
  });
};

const focusEditButton = (cardId) => {
  for (const button of root.querySelectorAll('.card-edit-btn')) {
    if (button.dataset.id !== cardId) continue;
    button.focus();
    return;
  }
};

const editButton = (card) => {
  if (state.editId === card.id) {
    const cancel = el('button', 'card-edit-btn card-cancel-btn');
    cancel.type = 'button';
    cancel.title = 'Cancelar la edición';
    cancel.setAttribute('aria-label', 'Cancelar la edición');
    cancel.append(icon('close'));
    cancel.addEventListener('click', (event) => {
      event.stopPropagation();
      cancelEdit(card.id);
    });
    return cancel;
  }
  const button = el('button', 'card-edit-btn');
  button.type = 'button';
  button.dataset.id = card.id;
  button.title = 'Editar título';
  button.setAttribute('aria-label', `Editar el título de ${card.name || 'la tarjeta'}`);
  button.disabled = state.busy;
  button.append(icon('edit'));
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    startEdit(card);
  });
  return button;
};

// The title itself is the second entry point to the same editor.
const toggleExpanded = (cardId) => {
  if (state.expanded.has(cardId)) state.expanded.delete(cardId);
  else state.expanded.add(cardId);
  render();
};

// The title is clamped to two lines. Clicking it (or the chevron) expands it
// in place so the whole text can be read on desktop and mobile; the pencil
// remains the edit affordance.
const renderTitle = (card) => {
  if (state.editId === card.id) return renderEditor(card);
  const expanded = state.expanded.has(card.id);
  const row = el('div', 'card-title-row');
  const title = el('div', 'card-name card-name-read', card.name || 'Sin título');
  if (expanded) title.classList.add('expanded');
  title.title = card.name || '';
  title.setAttribute('role', 'button');
  title.tabIndex = 0;
  title.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  title.setAttribute('aria-label', `${expanded ? 'Contraer' : 'Leer'} el título de ${card.name || 'la tarjeta'}`);
  title.addEventListener('click', () => toggleExpanded(card.id));
  title.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggleExpanded(card.id);
  });
  const toggle = el('button', `card-expand-btn${expanded ? ' expanded' : ''}`);
  toggle.type = 'button';
  toggle.title = expanded ? 'Contraer el título' : 'Leer el título completo';
  toggle.setAttribute('aria-label', toggle.title);
  toggle.append(icon('chevron'));
  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleExpanded(card.id);
  });
  row.append(title, toggle);
  return row;
};

const act = async (id) => {
  if (state.busy) return;
  state.busy = true;
  state.error = '';
  render();
  try {
    await api('POST', '/status', { id });
  } catch (error) {
    state.error = error.message;
  }
  state.busy = false;
  await load(true);
};

const setAutoMode = async (enabled) => {
  const project = state.data?.project;
  if (!project || state.busy) return;
  state.busy = true;
  state.error = '';
  render();
  try {
    await api('POST', '/mapping', {
      boardId: state.data?.board?.id || '',
      projectId: project.id,
      directory: project.directory,
      name: project.name,
      autoSession: enabled,
    });
    project.autoSession = enabled;
  } catch (error) {
    state.error = error.message;
  }
  state.busy = false;
  render();
};

// The + of the summary always works: with a backlog it opens the idea input;
// without columns it first creates IDEAS, EN PROGRESO and HECHO, then opens it.
const openIdea = async () => {
  if (state.busy) return;
  if (state.data?.backlogId) {
    state.adding = true;
    state.draft = '';
    render();
    requestAnimationFrame(() => root.querySelector('.idea-input')?.focus());
    return;
  }
  state.busy = true;
  state.error = '';
  render();
  try {
    await api('POST', '/lists/default', { boardId: state.data?.board?.id || '' });
    state.adding = true;
    state.draft = '';
  } catch (error) {
    state.error = error.message;
  }
  state.busy = false;
  if (state.error) {
    render();
    return;
  }
  await load(true);
  if (state.adding) requestAnimationFrame(() => root.querySelector('.idea-input')?.focus());
};

const renderSummary = (data) => {
  const row = el('div', 'summary');
  const dot = el('span', 'board-dot');
  if (data.counts.incomplete === 0) dot.style.background = 'var(--oc-success)';
  const project = data.project;
  const mode = el('button', 'board-mode');
  mode.type = 'button';
  mode.disabled = state.busy || !project;
  if (project) {
    mode.title = project.autoSession
      ? 'Delegación automática: al mover a EN PROGRESO te pedirá confirmación. Pulsa para pasar a manual.'
      : 'Delegación manual: la sesión la abres tú. Pulsa para activar la automática.';
    mode.setAttribute('aria-label', mode.title);
  }
  const board = el('span', 'board-name', data.board?.name || 'Kanban');
  mode.append(dot, board);
  if (project) {
    const pill = el('span', `mode-pill${project.autoSession ? ' on' : ''}`, project.autoSession ? 'Auto' : 'Manual');
    mode.append(pill);
    mode.addEventListener('click', () => void setAutoMode(project.autoSession !== true));
  }
  const bar = el('span', 'bar');
  const fill = el('i');
  const total = Number(data.counts?.total) || 0;
  const completed = Number(data.counts?.completed) || 0;
  fill.style.width = `${total ? Math.round((completed / total) * 100) : 0}%`;
  bar.append(fill);
  const count = el('span', 'count', `${completed}/${total}`);
  row.append(mode, bar, count);
  const add = el('button', 'summary-add');
  add.type = 'button';
  add.title = data.backlogId
    ? `Añadir ${data.backlogName || 'ideas'}`
    : 'Añadir una idea y crear las columnas que falten';
  add.setAttribute('aria-label', add.title);
  add.disabled = state.busy;
  add.append(icon('plus'));
  add.addEventListener('click', () => void openIdea());
  row.append(add);
  return row;
};

const loadSessions = async (projectId, force = false) => {
  if (!projectId) return;
  if (!force && state.sessionsProjectId === projectId && Date.now() - state.sessionsAt < 30000) return;
  state.sessionsProjectId = projectId;
  try {
    const snapshot = await host.listSessions(projectId);
    const list = Array.isArray(snapshot?.sessions) ? snapshot.sessions : [];
    state.sessions = list
      .filter((session) => !session.archivedAt)
      .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
      .slice(0, 40);
  } catch {
    state.sessions = [];
  }
  state.sessionsAt = Date.now();
};

const closeSessionMenu = () => {
  document.querySelector('.session-menu')?.remove();
  if (!state.menuOpen) return;
  state.menuOpen = false;
  host.setHeight(190).catch(() => {});
  render();
};

const openSessionMenu = async (current, anchor) => {
  const projectId = state.data?.project?.id || '';
  if (!projectId) return;
  await loadSessions(projectId, true);
  if (!state.sessions.length) {
    state.error = 'No hay sesiones disponibles en este proyecto.';
    render();
    return;
  }
  document.querySelector('.session-menu')?.remove();
  state.menuOpen = true;
  await host.setHeight(320).catch(() => {});
  const menu = el('div', 'session-menu');
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(240, window.innerWidth - 8);
  menu.style.width = `${width}px`;
  menu.style.left = `${Math.max(4, Math.min(window.innerWidth - width - 4, rect.right - width))}px`;
  menu.style.top = `${Math.max(4, Math.min(window.innerHeight - 228, rect.bottom + 4))}px`;
  const list = el('div', 'session-menu-list');

  const item = (label, value, active) => {
    const button = el('button', '', label);
    button.type = 'button';
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      closeSessionMenu();
      if (value === (current.sessionId || '')) return;
      state.busy = true;
      state.error = '';
      render();
      try {
        if (!value) {
          await api('DELETE', '/link', { cardId: current.id });
        } else {
          const chosen = state.sessions.find((session) => session.id === value);
          await api('POST', '/link', {
            cardId: current.id,
            sessionId: value,
            sessionTitle: chosen?.title || '',
          });
        }
      } catch (error) {
        state.error = error.message;
      }
      state.busy = false;
      await load(true);
    });
    return button;
  };

  list.append(item('Sin sesión', '', !current.sessionId));
  for (const session of state.sessions.slice(0, 12)) {
    const label = String(session.title || session.id || 'Sesión');
    const suffix = session.activity === 'running' ? ' · trabajando' : '';
    list.append(item(`${label}${suffix}`, session.id, session.id === current.sessionId));
  }
  menu.append(list);
  document.body.append(menu);
  setTimeout(() => {
    document.addEventListener('click', closeSessionMenu, { once: true });
  }, 0);
};

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (state.menuOpen) {
    event.preventDefault();
    closeSessionMenu();
    return;
  }
  // Escape also leaves the inline editor, even when focus moved away from it.
  if (state.editId) {
    event.preventDefault();
    cancelEdit();
  }
});

const createSession = async (current) => {
  if (state.busy) return;
  state.busy = true;
  state.error = '';
  render();
  let sessionId = '';
  state.askSession = '';
  try {
    const answer = await api('POST', '/session/start', { cardId: current.id });
    sessionId = answer?.sessionId || '';
    if (!sessionId) state.error = 'No se pudo crear la sesión.';
  } catch (error) {
    state.error = error.message;
  }
  state.busy = false;
  await load(true);
  if (sessionId) {
    try {
      await host.openSession(sessionId);
    } catch {
      state.error = 'La sesión se creó, pero no se pudo abrir.';
      render();
    }
  }
};

const backToIdeas = async (current) => {
  if (state.busy) return;
  state.askSession = '';
  state.busy = true;
  state.error = '';
  render();
  try {
    await api('POST', '/card/back', { cardId: current.id });
  } catch (error) {
    state.error = error.message;
  }
  state.busy = false;
  await load(true);
};

const commitRemove = async (card) => {
  try {
    await api('DELETE', '/card', { id: card.id });
  } catch (error) {
    state.error = error.message;
  }
  state.pendingDelete = null;
  await load(true);
};

const removeCard = (card) => {
  if (state.busy) return;
  if (state.pendingDelete) {
    clearTimeout(state.pendingDelete.timer);
    const previous = state.pendingDelete.card;
    state.pendingDelete = null;
    void commitRemove(previous);
  }
  state.pendingDelete = {
    card,
    timer: setTimeout(() => {
      const pending = state.pendingDelete;
      if (!pending) return;
      state.pendingDelete = null;
      void commitRemove(pending.card);
    }, 5000),
  };
  void api('POST', '/card/pending', { id: card.id, pending: true }).catch(() => {});
  render();
};

const undoRemove = () => {
  if (!state.pendingDelete) return;
  const card = state.pendingDelete.card;
  clearTimeout(state.pendingDelete.timer);
  void api('POST', '/card/pending', { id: card.id, pending: false }).catch(() => {});
  state.pendingDelete = null;
  render();
};

const deleteButton = (card) => {
  const button = el('button', 'card-delete');
  button.type = 'button';
  const confirming = state.confirmId === card.id;
  if (confirming) button.classList.add('confirming');
  button.title = confirming ? 'Pulsa otra vez para eliminar' : 'Eliminar tarjeta';
  button.setAttribute('aria-label', confirming ? `Confirmar eliminar ${card.name || ''}` : `Eliminar ${card.name || ''}`);
  button.disabled = state.busy;
  button.append(icon('trash'));
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    if (state.confirmId !== card.id) {
      state.confirmId = card.id;
      clearTimeout(confirmTimer);
      confirmTimer = setTimeout(() => {
        state.confirmId = '';
        render();
      }, 2500);
      render();
      return;
    }
    clearTimeout(confirmTimer);
    state.confirmId = '';
    void removeCard(card);
  });
  return button;
};

const renderAddRow = () => {
  const row = el('div', 'idea-add');
  const input = el('input', 'idea-input');
  input.type = 'text';
  input.value = state.draft || '';
  input.placeholder = `Nueva idea en ${state.data?.backlogName || 'ideas'}…`;
  input.setAttribute('aria-label', input.placeholder);
  input.addEventListener('input', () => {
    state.draft = input.value;
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const name = input.value.trim();
      if (!name || state.busy) return;
      state.busy = true;
      state.adding = false;
      state.draft = '';
      void (async () => {
        try {
          await api('POST', '/card', { listId: state.data.backlogId, name });
        } catch (error) {
          state.error = error.message;
        }
        state.busy = false;
        await load(true);
      })();
      return;
    }
    if (event.key === 'Escape') {
      state.adding = false;
      state.draft = '';
      render();
    }
  });
  row.append(input);
  return row;
};

const renderCurrent = (current) => {
  if (!current) {
    return el('div', 'muted', 'Sin tarea en curso.');
  }
  if (state.pendingDelete?.card.id === current.id) {
    return el('div', 'muted', `Eliminando «${current.name || 'tarjeta'}»…`);
  }
  const card = el('div', 'card current');
  const stopped = current.state === 'parada' || current.state === 'sesión cerrada';
  card.style.setProperty('--tone', stopped ? 'var(--oc-muted)' : 'var(--oc-warning)');

  const head = el('div', 'card-head');
  const projectId = state.data?.project?.id || '';
  if (projectId && state.sessions.length) {
    const picker = el('button', 'session-pick');
    picker.type = 'button';
    picker.title = 'Elegir sesión de esta tarjeta';
    picker.setAttribute('aria-label', 'Sesión de esta tarjeta');
    const currentTitle = current.sessionId
      ? (state.sessions.find((session) => session.id === current.sessionId)?.title || current.state || 'Sesión')
      : 'Sin sesión';
    const chevron = icon('chevron');
    chevron.classList.add('session-chevron');
    picker.append(el('span', 'session-pick-text', currentTitle), chevron);
    picker.addEventListener('click', (event) => {
      event.stopPropagation();
      void openSessionMenu(current, picker);
    });
    head.append(picker);
  } else {
    head.append(el('span', 'state', current.state || ''));
  }

  const project = state.data?.project;
  if (!current.sessionId && project) {
    const create = el('button', 'session-create');
    create.type = 'button';
    create.title = `Abrir sesión en ${project.name || 'el proyecto'}`;
    create.setAttribute('aria-label', create.title);
    create.disabled = state.busy;
    create.append(icon('plus'));
    create.addEventListener('click', () => void createSession(current));
    head.append(create);
  }

  if (current.sessionId) head.append(openButton(current.sessionId));
  head.append(el('span', 'card-head-spacer'));
  head.append(editButton(current));
  head.append(deleteButton(current));
  if (state.data?.backlogId) {
    const back = el('button', 'session-back');
    back.type = 'button';
    back.title = `Volver a ${state.data.backlogName || 'ideas'}`;
    back.setAttribute('aria-label', back.title);
    back.disabled = state.busy;
    back.append(icon('back'));
    back.addEventListener('click', () => void backToIdeas(current));
    head.append(back);
  }
  head.append(tickButton('Completar tarjeta', 'Completar', () => act(`complete-${current.id}`)));

  const body = el('div', 'card-body');
  body.append(renderTitle(current));
  card.append(head, body);

  if (state.askSession === current.id && !current.sessionId) {
    const row = el('div', 'card-pending');
    row.append(el('span', 'card-pending-text', '¿Abrir sesión?'));
    const yes = el('button', 'pending-btn pending-yes', 'Abrir');
    yes.type = 'button';
    yes.disabled = state.busy;
    yes.addEventListener('click', () => {
      state.askSession = '';
      void createSession(current);
    });
    const no = el('button', 'pending-btn', 'No');
    no.type = 'button';
    no.disabled = state.busy;
    no.addEventListener('click', () => {
      state.askSession = '';
      render();
    });
    row.append(yes, no);
    card.append(row);
  }
  return card;
};

const renderIdea = (idea) => {
  const card = el('div', 'card');
  const body = el('div', 'card-body');
  body.append(renderTitle(idea));
  const meta = el('span', 'card-meta');
  const startIdea = () => {
    if (state.data?.project?.autoSession) state.askSession = idea.id;
    void act(`start-${idea.id}`);
  };
  meta.append(editButton(idea), deleteButton(idea), tickButton('Empezar idea', 'Empezar', startIdea));
  card.append(body, meta);
  return card;
};

let renderSignature = '';

const render = () => {
  if (state.picking || state.menuOpen) return;
  // An open title editor owns its DOM: the 800 ms poll must not rebuild the
  // list while editing, or it would drop the focus and the typed text.
  const openEditor = root.querySelector('.card-edit-input');
  if (state.editId && openEditor?.dataset.id === state.editId) return;
  // Only the current card's session label is drawn, and the host session list
  // changes its timestamps constantly. Keying on the whole list repainted the
  // section on every poll (the hover flicker); key on the label instead.
  const currentSessionId = state.data?.current?.sessionId || '';
  const currentSession = state.sessions.find((session) => session.id === currentSessionId);
  const sessionKey = currentSession ? `${currentSession.id}:${currentSession.title || ''}` : '';
  const signature = JSON.stringify([
    state.data,
    state.adding,
    state.draft,
    state.busy,
    state.error,
    state.confirmId,
    state.askSession,
    state.pendingDelete?.card.id || '',
    sessionKey,
    state.editId,
    [...state.expanded].sort().join('|'),
  ]);
  if (signature === renderSignature) return;
  renderSignature = signature;
  const data = state.data;
  const previousScroll = root.querySelector('.status-scroll');
  const scrollTop = previousScroll ? previousScroll.scrollTop : 0;
  root.replaceChildren();
  const wrap = el('div', 'status');
  if (!data) {
    wrap.append(el('div', 'muted', state.error || 'Cargando…'));
    root.append(wrap);
    return;
  }
  if (data.connected === false) {
    wrap.append(el('div', 'warning', 'Conecta Kanban con Planka desde el panel de Kanban.'));
    root.append(wrap);
    return;
  }
  wrap.append(renderSummary(data));
  const scroll = el('div', 'status-scroll');
  if (state.pendingDelete) {
    const undo = el('div', 'status-undo');
    undo.append(el('span', 'status-undo-text', `Eliminada: «${state.pendingDelete.card.name || 'Tarjeta'}»`));
    const action = el('button', 'status-undo-action', 'Deshacer');
    action.type = 'button';
    action.addEventListener('click', undoRemove);
    undo.append(action);
    scroll.append(undo);
  }
  if (data.needsLists) {
    scroll.append(
      el('div', 'muted', 'Este tablero no tiene columnas. Pulsa + para crearlas y añadir una idea.'),
    );
  } else {
    const working = Array.isArray(data.working) ? data.working : [];
    if (working.length) {
      for (const card of working) scroll.append(renderCurrent(card));
    } else {
      scroll.append(renderCurrent(data.current));
    }
    if (state.adding && data.backlogId) scroll.append(renderAddRow());
    for (const idea of data.ideas || []) {
      if (state.pendingDelete?.card.id === idea.id) continue;
      scroll.append(renderIdea(idea));
    }
    if (!(data.ideas || []).length) {
      scroll.append(el('div', 'muted', `Sin ideas en ${data.backlogName || 'la lista de entrada'}.`));
    }
  }
  if (!data.project) {
    scroll.append(el('div', 'warning', 'Asigna un proyecto a este tablero en el panel de Kanban.'));
  }
  if (state.error) scroll.append(el('div', 'error', state.error));
  wrap.append(scroll);
  root.append(wrap);
  const nextScroll = root.querySelector('.status-scroll');
  if (nextScroll && scrollTop) nextScroll.scrollTop = scrollTop;
};

const load = async (force = false) => {
  if (state.adding && !force) return;
  if (inFlight && !force) return;
  inFlight = true;
  let projectId = '';
  try {
    const data = await api('GET', '/work');
    state.data = data;
    document.documentElement.dataset.style = data?.style || 'neumorphism';
    state.error = '';
    projectId = data?.project?.id || '';
  } catch (error) {
    state.error = error.message;
  } finally {
    inFlight = false;
  }
  render();
  // The next poll picks up the refreshed session label through the signature.
  if (projectId) void loadSessions(projectId);
};

const startPolling = () => {
  if (poll) clearInterval(poll);
  poll = setInterval(() => {
    if (document.visibilityState === 'visible') void load();
  }, POLL_MS);
};

host.onReady((context) => {
  state.directory = context.directory || '';
  applyHostReady(context, document.documentElement);
  if (state.booted) return;
  state.booted = true;
  void load(true);
  startPolling();
});

host.onDirectory((directory) => {
  const next = directory || '';
  if (next === state.directory) return;
  state.directory = next;
  if (state.booted) void load(true);
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !state.adding) void load(true);
});
