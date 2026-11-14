// MCP stdio server for the Kanban extension. Same Planka client and the same
// config.json as the service; cards are addressed by id or by part of a title.
import { readConfig } from '../shared/config.js';
import { LOCAL_BOARD_ID, LocalClient } from '../shared/local.js';
import { workListFor } from '../shared/defaults.js';
import { clearClosePending, removeLink, setLink } from '../shared/links.js';
import {
  PlankaClient,
  PlankaError,
  boardSummary,
  findCardByReference,
  findListByReference,
  findTaskByReference,
  searchCards,
} from '../shared/planka.js';

const PROTOCOL_FALLBACK = '2024-11-05';

// Keep the process identifiable in `ps` and make it exit as soon as the MCP
// transport closes, so a finished session cannot leave a Node process behind.
process.title = 'kanban-mcp';

const json = (value) => JSON.stringify(value);
const send = (message) => process.stdout.write(`${json(message)}\n`);

const textResult = (value) => ({
  content: [{ type: 'text', text: typeof value === 'string' ? value : json(value) }],
});

const failResult = (message) => ({
  content: [{ type: 'text', text: message }],
  isError: true,
});

const context = async () => {
  const config = readConfig();
  if (config.source === 'local') {
    // The host starts this server in the session's project directory, which is
    // the key the service also uses for the per-project local board.
    return { client: new LocalClient({ ...config, projectKey: process.cwd() }), boardId: LOCAL_BOARD_ID };
  }
  if (!config.token) {
    throw new Error('Kanban is not connected to Planka yet. Sign in from the Kanban panel in OpenChamber.');
  }
  const client = new PlankaClient(config);
  const boardId = await client.resolveBoardId(config.boardId);
  return { client, boardId };
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

const tools = [
  {
    name: 'kanban_board',
    description: 'Read the Planka board: columns in order, cards with labels, due dates and checklist progress.',
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
    description: 'List the Planka boards this user can edit.',
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
    description: 'Delete a card from Planka permanently.',
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
        tasks: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional task names.',
        },
      },
      required: ['card', 'name'],
      additionalProperties: false,
    },
  },
  {
    name: 'kanban_link_session',
    description: 'Link a card to the OpenChamber session working on it. The card moves to EN PROGRESO now and to HECHO when that session finishes its turn.',
    inputSchema: {
      type: 'object',
      properties: {
        card: { type: 'string', description: 'Card id or part of the title.' },
        sessionId: { type: 'string', description: 'OpenChamber session id working on that card.' },
      },
      required: ['card', 'sessionId'],
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

const callTool = async (name, args = {}) => {
  const { client, boardId } = await context();

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
      if (targetList.id !== (await client.readBoard(boardId)).doneListId) clearClosePending(card.id);
    }
    return textResult({ updated: true, id: card.id, card: updated });
  }

  if (name === 'kanban_move_card') {
    const { board, card } = await resolveCard(client, boardId, args.card);
    const { list } = await resolveList(client, boardId, args.list);
    const index = Number.isInteger(args.position) ? args.position : undefined;
    await client.moveCard(card.id, list.id, index, boardId);
    if (list.id !== board.doneListId) clearClosePending(card.id);
    return textResult({ moved: true, id: card.id, name: card.name, list: list.name });
  }

  if (name === 'kanban_complete_card') {
    const { card } = await resolveCard(client, boardId, args.card);
    const result = await client.completeCard(card.id, boardId);
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
    const sessionId = String(args.sessionId || '').trim();
    if (!sessionId) throw new Error('sessionId is required.');
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

let inFlight = 0;
let stdinClosed = false;

const exitWhenDone = () => {
  if (stdinClosed && inFlight === 0) {
    setTimeout(() => process.exit(0), 10);
  }
};

const handleMessage = async (message) => {
  const { id, method, params } = message || {};

  if (!method) return;

  if (method === 'initialize') {
    send({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: typeof params?.protocolVersion === 'string' ? params.protocolVersion : PROTOCOL_FALLBACK,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'kanban', version: '1.0.0' },
      },
    });
    return;
  }

  if (method === 'notifications/initialized' || method === 'notifications/cancelled') return;

  if (method === 'ping') {
    send({ jsonrpc: '2.0', id, result: {} });
    return;
  }

  if (method === 'tools/list') {
    send({ jsonrpc: '2.0', id, result: { tools } });
    return;
  }

  if (method === 'tools/call') {
    const name = params?.name;
    const args = params?.arguments || {};
    try {
      send({ jsonrpc: '2.0', id, result: await callTool(String(name), args) });
    } catch (error) {
      const message = error instanceof PlankaError ? error.message : error instanceof Error ? error.message : 'Tool failed.';
      send({ jsonrpc: '2.0', id, result: failResult(message) });
    }
    return;
  }

  if (id !== undefined) {
    send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
  }
};

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let newline = buffer.indexOf('\n');
  while (newline >= 0) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    newline = buffer.indexOf('\n');
    if (!line) continue;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      send({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null });
      continue;
    }
    inFlight += 1;
    handleMessage(message)
      .catch(() => {})
      .finally(() => {
        inFlight -= 1;
        exitWhenDone();
      });
  }
});

const stop = () => {
  stdinClosed = true;
  exitWhenDone();
};

process.stdin.on('end', stop);
process.stdin.on('close', stop);
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
process.on('SIGHUP', stop);
process.on('disconnect', stop);
