// The agent's tool surface, independent of how it is delivered.
//
// OpenCode reaches these through the extension's plugin (`src/plugin/main.js`),
// inside OpenCode's own process, so the project comes from the session that
// calls the tool instead of from a process directory. Same client, same config
// (~/.kanban/config.json), same board files as the panel and the service.
import { readConfig } from './config.js';
import { LOCAL_BOARD_ID, LocalClient, boardRecovery } from './local.js';
import { workListFor } from './defaults.js';
import { resolveProjectBoard } from './board-projects.js';
import { clearClosePending, getLink, removeLink, setLink } from './links.js';
import {
  PlankaClient,
  boardSummary,
  findCardByReference,
  findListByReference,
  findTaskByReference,
  searchCards,
} from './planka.js';

const json = (value) => JSON.stringify(value);
const textResult = (value) => (typeof value === 'string' ? value : json(value));

/**
 * The client and board for one tool call.
 *
 * @param {string} directory the project the calling session was opened in
 */
const context = async (directory) => {
  const config = readConfig();
  if (config.source === 'local') {
    // The session's project is the key the service uses for the per-project
    // local board, so the panel and the agent read the same file.
    const projectKey = String(directory || '');
    if (!projectKey) {
      throw new Error(
        'No sé en qué proyecto estás. Abre esta sesión dentro de un proyecto de OpenChamber para que pueda leer su tablero.',
      );
    }
    // A board that is gone or damaged while a copy sits beside it is a board
    // that needs restoring, not a new project. Refusing here keeps the agent
    // from writing cards into a fresh empty board that would then hide the copy.
    const recovery = boardRecovery(projectKey);
    if (recovery.state === 'missing') {
      throw new Error(
        'El tablero local de este proyecto no está en disco, pero hay una copia guardada. Abre el panel de Kanban en esta sesión y pulsa «Restaurar la copia»; no voy a trabajar sobre un tablero vacío.',
      );
    }
    if (recovery.state === 'corrupt') {
      throw new Error(
        'El tablero local de este proyecto está dañado y no se puede leer. Abre el panel de Kanban en esta sesión para recuperarlo; no voy a trabajar sobre un tablero vacío.',
      );
    }
    return { client: new LocalClient({ ...config, projectKey }), boardId: LOCAL_BOARD_ID };
  }
  if (!config.token) {
    throw new Error('Kanban is not connected to Planka yet. Sign in from the Kanban panel in OpenChamber.');
  }
  const client = new PlankaClient(config);
  // The board follows the session, not a global selection: the project this
  // session belongs to must have a board pinned. A worktree or a subfolder
  // inherits the board of its project.
  const boardId = resolveProjectBoard(directory);
  if (!boardId) {
    throw new Error(
      'Este proyecto no tiene tablero de Kanban fijado. Abre el panel de Kanban en esta sesión, en Ajustes, y fija el tablero del agente; hasta entonces no toco ninguna tarjeta.',
    );
  }
  return { client, boardId };
};

// A finished card no longer points at a session. A batch keeps its links until
// the whole batch closes, so only single links are released.
const releaseDoneLink = (cardId) => {
  const link = getLink(cardId);
  if (!link || link.batch === true) return;
  removeLink(cardId);
};

const resolveCard = async (client, boardId, reference) => {
  const board = await client.readBoard(boardId);
  const found = findCardByReference(board, reference);
  if (found.card) return { board, card: found.card };
  if (found.candidates.length > 1) {
    const names = found.candidates.map((card) => `- ${card.name} (${card.id})`).join('\n');
    throw new Error(`"${reference}" matches more than one card. Use the id or a longer title:\n${names}`);
  }
  throw new Error(`No card matches "${reference}".`);
};

const resolveList = async (client, boardId, reference) => {
  const board = await client.readBoard(boardId);
  const found = findListByReference(board, reference);
  if (found.list) return { board, list: found.list };
  if (found.candidates.length > 1) {
    const names = found.candidates.map((list) => `- ${list.name} (${list.id})`).join('\n');
    throw new Error(`"${reference}" matches more than one column. Use the id or a longer name:\n${names}`);
  }
  throw new Error(
    `No column matches "${reference}". Columns: ${board.lists.map((list) => list.name).join(', ')}.`,
  );
};

// The names are the public contract: the agent's instructions, the citation
// text and the README all use them, so they do not change when the delivery does.
export const AGENT_TOOLS = [
  {
    name: 'kanban_board',
    description: 'Read the board: columns in order, cards with labels, due dates and checklist progress.',
    inputSchema: {
      type: 'object',
      properties: { board: { type: 'string', description: 'Optional board id. Defaults to the selected board.' } },
      additionalProperties: false,
    },
  },
  {
    name: 'kanban_search',
    description: 'Find cards by text in the title or the description.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Text to find.' } },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'kanban_boards',
    description: 'List the boards this user can edit.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'kanban_create_card',
    description: 'Create a card in a column. The card is appended to the end of the column.',
    inputSchema: {
      type: 'object',
      properties: {
        list: { type: 'string', description: 'Column name or id.' },
        name: { type: 'string', description: 'Card title.' },
        description: { type: 'string', description: 'Optional description.' },
        dueDate: { type: 'string', description: 'Optional due date (YYYY-MM-DD or ISO).' },
      },
      required: ['list', 'name'],
      additionalProperties: false,
    },
  },
  {
    name: 'kanban_update_card',
    description: 'Change a card title, description, due date or column.',
    inputSchema: {
      type: 'object',
      properties: {
        card: { type: 'string', description: 'Card id or part of the title.' },
        name: { type: 'string', description: 'New title.' },
        description: { type: 'string', description: 'New description. Empty clears it.' },
        dueDate: { type: 'string', description: 'New due date (YYYY-MM-DD or ISO). Empty clears it.' },
        list: { type: 'string', description: 'Move the card to this column name or id.' },
      },
      required: ['card'],
      additionalProperties: false,
    },
  },
  {
    name: 'kanban_move_card',
    description: 'Move a card to another column and optionally to a position inside it.',
    inputSchema: {
      type: 'object',
      properties: {
        card: { type: 'string', description: 'Card id or part of the title.' },
        list: { type: 'string', description: 'Target column name or id.' },
        position: { type: 'number', description: 'Zero-based position inside the target column. Default: end.' },
      },
      required: ['card', 'list'],
      additionalProperties: false,
    },
  },
  {
    name: 'kanban_complete_card',
    description: 'Complete a card: move it to the board HECHO (done) column.',
    inputSchema: {
      type: 'object',
      properties: { card: { type: 'string', description: 'Card id or part of the title.' } },
      required: ['card'],
      additionalProperties: false,
    },
  },
  {
    name: 'kanban_delete_card',
    description: 'Delete a card permanently.',
    inputSchema: {
      type: 'object',
      properties: { card: { type: 'string', description: 'Card id or part of the title.' } },
      required: ['card'],
      additionalProperties: false,
    },
  },
  {
    name: 'kanban_checklist_add',
    description: 'Add a checklist to a card, with optional initial tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        card: { type: 'string', description: 'Card id or part of the title.' },
        name: { type: 'string', description: 'Checklist name.' },
        tasks: { type: 'array', items: { type: 'string' }, description: 'Optional task names.' },
      },
      required: ['card', 'name'],
      additionalProperties: false,
    },
  },
  {
    name: 'kanban_link_session',
    description:
      'Link a card to the OpenChamber session working on it. The card moves to EN PROGRESO now and to HECHO when that session finishes its turn.',
    inputSchema: {
      type: 'object',
      properties: {
        card: { type: 'string', description: 'Card id or part of the title.' },
        sessionId: {
          type: 'string',
          description: 'OpenChamber session id working on that card. Defaults to this agent session.',
        },
      },
      required: ['card'],
      additionalProperties: false,
    },
  },
  {
    name: 'kanban_checklist_check',
    description: 'Mark a checklist task as completed or not completed.',
    inputSchema: {
      type: 'object',
      properties: {
        card: { type: 'string', description: 'Card id or part of the title.' },
        task: { type: 'string', description: 'Task id or part of its name.' },
        done: { type: 'boolean', description: 'True to check it, false to uncheck it. Default true.' },
      },
      required: ['card', 'task'],
      additionalProperties: false,
    },
  },
];

/**
 * Run one tool and answer the text the model reads.
 *
 * @param {string} name one of AGENT_TOOLS
 * @param {Record<string, unknown>} args
 * @param {{ directory: string, sessionId?: string }} where the calling session
 */
export const callAgentTool = async (name, args = {}, where = {}) => {
  const { client, boardId } = await context(where.directory);

  if (name === 'kanban_boards') {
    return textResult(await client.getBoards());
  }

  if (name === 'kanban_board') {
    const target = args.board ? await client.resolveBoardId(String(args.board)) : boardId;
    return textResult(boardSummary(await client.readBoard(target)));
  }

  if (name === 'kanban_search') {
    const board = await client.readBoard(boardId);
    const cards = searchCards(board, String(args.query || '')).map((card) => ({
      id: card.id,
      name: card.name,
      list: board.lists.find((list) => list.id === card.listId)?.name || '',
      description: card.description,
      dueDate: card.dueDate || null,
      labels: card.labels.map((label) => label.name),
    }));
    return textResult({ query: String(args.query || ''), cards });
  }

  if (name === 'kanban_create_card') {
    const { list } = await resolveList(client, boardId, args.list);
    const card = await client.createCard(list.id, args.name, boardId, {
      description: args.description,
      dueDate: args.dueDate,
    });
    return textResult({ created: true, id: card?.id, name: card?.name, list: list.name });
  }

  if (name === 'kanban_update_card') {
    const { card } = await resolveCard(client, boardId, args.card);
    const patch = {};
    if (args.name !== undefined) patch.name = String(args.name);
    if (args.description !== undefined) patch.description = String(args.description);
    if (args.dueDate !== undefined) patch.dueDate = String(args.dueDate);
    let targetList = null;
    if (args.list !== undefined) {
      const resolved = await resolveList(client, boardId, args.list);
      targetList = resolved.list;
      patch.listId = targetList.id;
      patch.index = 0;
    }
    const updated = await client.updateCard(card.id, patch, boardId);
    if (targetList) {
      const doneId = (await client.readBoard(boardId)).doneListId;
      if (targetList.id === doneId) releaseDoneLink(card.id);
      else clearClosePending(card.id);
    }
    return textResult({ updated: true, id: card.id, card: updated });
  }

  if (name === 'kanban_move_card') {
    const { board, card } = await resolveCard(client, boardId, args.card);
    const { list } = await resolveList(client, boardId, args.list);
    const index = Number.isInteger(args.position) ? args.position : undefined;
    await client.moveCard(card.id, list.id, index, boardId);
    if (list.id === board.doneListId) releaseDoneLink(card.id);
    else clearClosePending(card.id);
    return textResult({ moved: true, id: card.id, name: card.name, list: list.name });
  }

  if (name === 'kanban_complete_card') {
    const { card } = await resolveCard(client, boardId, args.card);
    const result = await client.completeCard(card.id, boardId);
    releaseDoneLink(card.id);
    return textResult({ completed: true, id: card.id, name: card.name, already: result.already });
  }

  if (name === 'kanban_delete_card') {
    const { card } = await resolveCard(client, boardId, args.card);
    await client.deleteCard(card.id);
    removeLink(card.id);
    return textResult({ deleted: true, id: card.id, name: card.name });
  }

  if (name === 'kanban_checklist_add') {
    const { card } = await resolveCard(client, boardId, args.card);
    const tasks = Array.isArray(args.tasks) ? args.tasks.map(String) : [];
    const result = await client.addChecklist(card.id, args.name, boardId, tasks);
    return textResult({
      added: true,
      card: card.name,
      checklist: result.taskList?.name || String(args.name || 'Checklist'),
      tasks: result.tasks.map((task) => ({ id: task.id, name: task.name })),
    });
  }

  if (name === 'kanban_link_session') {
    const { board, card } = await resolveCard(client, boardId, args.card);
    // The agent's own session is the one doing the work, so it is the default:
    // asking the model to repeat its id only added a way to get it wrong.
    const sessionId = String(args.sessionId || where.sessionId || '').trim();
    if (!sessionId) {
      throw new Error('sessionId is required: pass one, or run inside an OpenChamber session.');
    }
    // Delegating moves the card to the working column unless it is done. The
    // card follows this agent session from now on, not the orchestrator's.
    const workList = workListFor(board);
    const moved = Boolean(workList && card.listId !== workList.id && card.listId !== board.doneListId);
    if (moved) await client.moveCard(card.id, workList.id, undefined, boardId);
    setLink(card.id, sessionId, { boardId, title: card.name });
    return textResult({
      linked: true,
      moved,
      card: { id: card.id, name: card.name },
      sessionId,
    });
  }

  if (name === 'kanban_checklist_check') {
    const { card } = await resolveCard(client, boardId, args.card);
    const found = findTaskByReference(card, args.task);
    if (!found.task) {
      if (found.candidates.length > 1) {
        throw new Error(
          `"${args.task}" matches more than one task: ${found.candidates.map((task) => `"${task.name}"`).join(', ')}.`,
        );
      }
      throw new Error(`No checklist task matches "${args.task}" on "${card.name}".`);
    }
    const done = args.done === undefined ? true : Boolean(args.done);
    await client.checkTask(found.task.id, done);
    return textResult({ checked: done, card: card.name, task: found.task.name });
  }

  throw new Error(`Unknown tool: ${name}`);
};
