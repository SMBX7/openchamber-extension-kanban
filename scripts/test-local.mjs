// Exercises the local board client against a throwaway file.
// The extension sources are ESM without "type": "module", so esbuild bundles
// the module to CJS before requiring it.
import { build } from 'esbuild';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const dir = mkdtempSync(join(tmpdir(), 'kanban-local-'));
const bundle = join(dir, 'local.cjs');
process.env.KANBAN_LOCAL_PATH = join(dir, 'board.local.json');

await build({
  entryPoints: [new URL('../src/shared/local.js', import.meta.url).pathname],
  bundle: true,
  outfile: bundle,
  platform: 'node',
  format: 'cjs',
  logLevel: 'silent',
});

const require = createRequire(import.meta.url);
const { LocalClient, exportBoard, localBoardPath } = require(bundle);

// The default-column helper lives in its own module so the service and the
// local client share it; bundle it the same way and exercise it here.
const defaultsBundle = join(dir, 'defaults.cjs');
await build({
  entryPoints: [new URL('../src/shared/defaults.js', import.meta.url).pathname],
  bundle: true,
  outfile: defaultsBundle,
  platform: 'node',
  format: 'cjs',
  logLevel: 'silent',
});
const { DEFAULT_LIST_NAMES, ensureDefaultLists, POSITION_STEP } = require(defaultsBundle);
const client = new LocalClient({});

assert.deepEqual(DEFAULT_LIST_NAMES, ['IDEAS', 'EN PROGRESO', 'HECHO']);

const board = await client.readBoard();
assert.deepEqual(board.lists.map((list) => list.name), ['IDEAS', 'EN PROGRESO', 'HECHO']);
assert.equal(board.doneListId, 'list-3');
assert.equal(board.counts.total, 0);
assert.ok(board.labels.length >= 1, 'the local board has default labels');

const ensured = await ensureDefaultLists(client, 'local');
assert.equal(ensured.created.length, 0, 'a full board creates no columns');

const extra = await client.createList('  Revisión  ');
assert.equal(extra.name, 'Revisión');
assert.ok(extra.id);
let view = await client.readBoard();
assert.deepEqual(
  view.lists.map((list) => list.name),
  ['IDEAS', 'EN PROGRESO', 'HECHO', 'Revisión'],
);
assert.equal(view.doneListId, 'list-3', 'HECHO stays the done column');
await assert.rejects(() => client.createList('   '), /nombre/);

const ideas = board.lists[0];
const doing = board.lists[1];

const card = await client.createCard(ideas.id, '  Comprar pan  ');
assert.equal(card.name, 'Comprar pan');

// The panel sends the title and the description in the same request, so the
// description must survive the very first write, not only a later edit.
const detailed = await client.createCard(ideas.id, 'Llamar al gestor', undefined, {
  description: 'Preguntar por la factura',
});
assert.equal(detailed.description, 'Preguntar por la factura');
await client.deleteCard(detailed.id);

await client.moveCard(card.id, doing.id, 0);
view = await client.readBoard();
assert.equal(view.lists[1].cards[0].id, card.id);
assert.equal(view.counts.incomplete, 1);

await client.updateCard(card.id, { description: 'Integral', dueDate: '2026-12-01' });
view = await client.readBoard();
const updated = view.lists[1].cards[0];
assert.equal(updated.description, 'Integral');
assert.ok(updated.dueDate.startsWith('2026-12-01'));

// Renaming keeps the card in its column and its position: the title edit must
// never become a move to HECHO (the reported S2 bug).
const beforeRename = view.lists[1].cards[0];
await client.updateCard(card.id, { name: 'Pan integral' });
view = await client.readBoard();
const renamed = view.lists[1].cards[0];
assert.equal(renamed.name, 'Pan integral');
assert.equal(renamed.listId, beforeRename.listId, 'renaming keeps the column');
assert.equal(renamed.position, beforeRename.position, 'renaming keeps the position');

const checklist = await client.addChecklist(card.id, 'Pasos', undefined, ['Masa', 'Horno']);
assert.equal(checklist.tasks.length, 2);
await client.checkTask(checklist.tasks[0].id, true);
view = await client.readBoard();
assert.deepEqual(view.lists[1].cards[0].checklist, { total: 2, done: 1 });

// A new task goes after the last one of its checklist, the order Planka keeps:
// the service route hands the board to the client for exactly this.
const extraTask = await client.addTask(checklist.taskList.id, 'Enfriar');
assert.ok(extraTask.position > checklist.tasks[1].position, 'a new task is appended');
view = await client.readBoard();
assert.deepEqual(
  view.lists[1].cards[0].taskLists[0].tasks.map((task) => task.name),
  ['Masa', 'Horno', 'Enfriar'],
);
assert.deepEqual(view.lists[1].cards[0].checklist, { total: 3, done: 1 });

const labelId = view.labels[0].id;
assert.equal(await client.toggleLabel(card.id, labelId), true);
view = await client.readBoard();
assert.equal(view.lists[1].cards[0].labels.length, 1);
assert.equal(await client.toggleLabel(card.id, labelId), false);

const completed = await client.completeCard(card.id);
assert.equal(completed.already, false);
assert.equal((await client.completeCard(card.id)).already, true);
view = await client.readBoard();
assert.equal(view.lists[2].cards[0].id, card.id);
assert.equal(view.counts.incomplete, 0);

// Persistence: a fresh client sees the same file.
const again = new LocalClient({});
assert.equal((await again.readBoard()).counts.total, 1);

// Concurrent writers must not lose cards.
await Promise.all(
  Array.from({ length: 10 }, (_, index) => again.createCard(ideas.id, `Idea ${index + 1}`)),
);
assert.equal((await again.readBoard()).counts.total, 11);

// Deleting drops the card and its checklist.
await again.deleteCard(card.id);
view = await again.readBoard();
assert.equal(view.counts.total, 10);
assert.equal(view.lists.flatMap((list) => list.cards).some((item) => item.id === card.id), false);

// A corrupt file must not crash the panel.
writeFileSync(process.env.KANBAN_LOCAL_PATH, '{ not json');
assert.equal((await new LocalClient({}).readBoard()).counts.total, 0);

// S8: one board file per OpenChamber project. KANBAN_LOCAL_PATH keeps working
// as the base path, and each project gets its own file beside it.
const projectA = '/home/ana/proyectos/tienda';
const projectB = '/home/ana/proyectos/blog';
const pathA = localBoardPath(projectA);
const pathB = localBoardPath(projectB);
assert.equal(localBoardPath(''), process.env.KANBAN_LOCAL_PATH, 'the override still names the base board');
assert.ok(pathA.startsWith(dir), 'project boards stay beside the base path');
assert.notEqual(pathA, pathB, 'two projects resolve to two files');
assert.equal(localBoardPath(`${projectA}/`), pathA, 'the same project spelled with a trailing slash is one board');

// The single board file of the current project migrates into its project file
// with every list, card, label and checklist intact.
const legacy = {
  version: 1,
  board: { id: 'local', name: 'Kanban local' },
  lists: [
    { id: 'list-1', name: 'IDEAS', position: 65536 },
    { id: 'list-2', name: 'EN PROGRESO', position: 131072 },
    { id: 'list-3', name: 'HECHO', position: 196608 },
  ],
  cards: [
    {
      id: 'card-legacy',
      listId: 'list-1',
      name: 'Vieja tarjeta',
      description: 'Del tablero de antes',
      position: 65536,
      dueDate: '',
      isDueCompleted: false,
      createdAt: 1,
    },
  ],
  labels: [{ id: 'label-1', name: 'Urgente', color: 'hsl(0 62% 58%)' }],
  cardLabels: [{ id: 'cardlabel-1', cardId: 'card-legacy', labelId: 'label-1' }],
  taskLists: [{ id: 'checklist-1', cardId: 'card-legacy', name: 'Pasos', position: 65536 }],
  tasks: [
    { id: 'task-1', taskListId: 'checklist-1', name: 'Masa', isCompleted: true, position: 65536 },
    { id: 'task-2', taskListId: 'checklist-1', name: 'Horno', isCompleted: false, position: 131072 },
  ],
};
writeFileSync(process.env.KANBAN_LOCAL_PATH, JSON.stringify(legacy));

const migrated = await new LocalClient({ projectKey: projectA }).readBoard();
assert.equal(migrated.counts.total, 1, 'the old board keeps its card');
const migratedCard = migrated.lists[0].cards[0];
assert.equal(migratedCard.name, 'Vieja tarjeta');
assert.equal(migratedCard.description, 'Del tablero de antes');
assert.deepEqual(migratedCard.checklist, { total: 2, done: 1 });
assert.equal(migratedCard.labels.length, 1);
assert.equal(existsSync(pathA), true, 'the card lives in the project file');
assert.equal(existsSync(process.env.KANBAN_LOCAL_PATH), false, 'the old single file is moved, not copied');
assert.equal(existsSync(`${process.env.KANBAN_LOCAL_PATH}.migrated`), true);

// A different project starts empty and keeps its own cards.
const clientB = new LocalClient({ projectKey: projectB });
const otherBoard = await clientB.readBoard();
assert.equal(otherBoard.counts.total, 0, 'a project that never had a board starts empty');
assert.deepEqual(otherBoard.lists.map((list) => list.name), ['IDEAS', 'EN PROGRESO', 'HECHO']);
await clientB.createCard(otherBoard.lists[0].id, 'Del blog');
assert.equal((await clientB.readBoard()).counts.total, 1);
assert.equal(
  (await new LocalClient({ projectKey: projectA }).readBoard()).counts.total,
  1,
  'returning restores the old project',
);

// Completing a card into an empty HECHO gives it the same top position a new
// card gets (POSITION_STEP), which is what Planka computes: the card is not
// part of the column it is arriving in, so its old position must not halve the
// result and drift with every completion.
const doneProject = '/home/ana/proyectos/hecho';
const doneClient = new LocalClient({ projectKey: doneProject });
const doneBoard = await doneClient.readBoard();
assert.deepEqual(doneBoard.lists.map((list) => list.name), ['IDEAS', 'EN PROGRESO', 'HECHO']);
const firstDone = await doneClient.createCard(doneBoard.lists[0].id, 'Primera');
const secondDone = await doneClient.createCard(doneBoard.lists[0].id, 'Segunda');
await doneClient.completeCard(firstDone.id);
await doneClient.completeCard(secondDone.id);
const doneView = await doneClient.readBoard();
assert.equal(doneView.lists[2].cards.length, 2);
assert.equal(doneView.lists[2].cards[0].id, secondDone.id, 'the last completed card goes on top');
assert.equal(
  doneView.lists[2].cards.find((item) => item.id === firstDone.id).position,
  POSITION_STEP,
  'the first card of HECHO keeps the column step',
);

// Exports read the board of the project they are asked about.
assert.ok(exportBoard('json', projectA).includes('Vieja tarjeta'));
assert.equal(exportBoard('json', projectB).includes('Vieja tarjeta'), false);

// Without a project key the explicit path is written as before.
const keyless = new LocalClient({});
await keyless.createCard(migrated.lists[0].id, 'Sin proyecto');
assert.equal(existsSync(process.env.KANBAN_LOCAL_PATH), true);
assert.ok(exportBoard('json').includes('Sin proyecto'));

// The service routes scope the local copy to the project that asks for it: the
// board file is per project (S8) and the panel sends ?directory= on every
// request, so a copy must read and write that project's file and never the
// legacy board no project writes any more.
const ext = join(dir, 'ext');
const home = join(dir, 'home');
mkdirSync(home, { recursive: true });
await build({
  entryPoints: [new URL('../src/service/main.js', import.meta.url).pathname],
  bundle: true,
  outfile: join(ext, 'service', 'main.js'),
  platform: 'node',
  format: 'cjs',
  target: ['node20'],
  logLevel: 'silent',
});
writeFileSync(join(ext, 'config.json'), JSON.stringify({ source: 'local' }));

const freePort = () =>
  new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });

const port = await freePort();
const service = spawn(process.execPath, [join(ext, 'service', 'main.js')], {
  env: {
    ...process.env,
    HOME: home,
    KANBAN_LOCAL_PATH: process.env.KANBAN_LOCAL_PATH,
    OPENCHAMBER_SERVICE_PORT: String(port),
    OPENCHAMBER_SERVICE_TOKEN: '',
  },
  stdio: 'ignore',
});
const serviceUrl = (path, directory) =>
  `http://127.0.0.1:${port}${path}${path.includes('?') ? '&' : '?'}directory=${encodeURIComponent(directory)}`;
const post = async (path, directory, body) => {
  const response = await fetch(serviceUrl(path, directory), {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return response.json();
};
const get = async (path, directory) => (await fetch(serviceUrl(path, directory))).json();

try {
  let ready = false;
  for (let attempt = 0; attempt < 100 && !ready; attempt += 1) {
    try {
      ready = (await fetch(`http://127.0.0.1:${port}/health`)).ok;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  assert.equal(ready, true, 'the service answers /health');

  const copy = await post('/local/export', projectA, { format: 'json' });
  assert.equal(copy.format, 'json');
  const exported = readFileSync(join(ext, copy.name), 'utf8');
  assert.ok(exported.includes('Vieja tarjeta'), 'the copy is the board of the project that asked');
  assert.equal(exported.includes('Sin proyecto'), false, 'the copy is not the legacy board');

  const restored = await post('/local/import', projectB, { data: exported });
  assert.equal(restored.ok, true);
  assert.equal(
    (await new LocalClient({ projectKey: projectB }).readBoard()).counts.total,
    1,
    'the import lands in the project that asked',
  );
  assert.equal(
    (await new LocalClient({ projectKey: projectA }).readBoard()).counts.total,
    1,
    'the other project keeps its board',
  );
  assert.ok(exportBoard('json').includes('Sin proyecto'), 'the legacy board is untouched');

  // A manual move to work links the session it came from: that is the "sin
  // sesión" the card showed after being dragged, and it is why the panel sends
  // the session with the move.
  mkdirSync(join(home, '.kanban'), { recursive: true });
  writeFileSync(
    join(home, '.kanban', 'board-projects.json'),
    JSON.stringify({
      version: 1,
      boards: {
        local: { projectId: 'p-a', directory: projectA, name: 'A', autoSession: false },
      },
      projects: {},
    }),
  );
  const before = await get('/snapshot', projectA);
  const work = before.lists.find((list) => list.id === before.workListId) || before.lists[1];
  const backlog = before.lists.find((list) => list.id !== work.id && list.id !== before.doneListId);
  const fresh = await post('/card', projectA, { listId: backlog.id, name: 'Con sesión' });
  const dragged = await post('/card/move', projectA, {
    id: fresh.card.id,
    listId: work.id,
    sessionId: 'ses-test',
    sessionTitle: 'Esta sesión',
  });
  assert.equal(dragged.linked, true, 'a manual move links the session it came from');
  assert.equal(dragged.manual, false, 'a linked move does not ask to open a batch');
  const link = await get(`/link?cardId=${fresh.card.id}`, projectA);
  assert.equal(link.link.sessionId, 'ses-test', 'the card points at that session');
  assert.equal(link.link.sessionTitle, 'Esta sesión', 'the link keeps the session title');
  assert.equal(link.link.batch, undefined, 'the link is not a batch link');
} finally {
  service.kill('SIGTERM');
  if (service.exitCode === null) {
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 2000);
      service.on('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
}

// Automatic delegation shares one session per batch. These are the pure
// decisions, exercised without a host so a change in the reuse rule is caught.
const batchBundle = join(dir, 'batch.cjs');
await build({
  entryPoints: [new URL('../src/shared/batch.js', import.meta.url).pathname],
  bundle: true,
  outfile: batchBundle,
  platform: 'node',
  format: 'cjs',
  logLevel: 'silent',
});
const {
  batchStartPrompt,
  batchCardPrompt,
  batchClosePrompt,
  batchAllDone,
  reusableBatchSession,
} = require(batchBundle);

const batchBoard = { id: 'board-1', name: 'Tablero de prueba' };
const batchProject = { name: 'demo' };
const cardA = { id: 'card-a', name: 'Primera', description: 'Arregla el borde', taskLists: [] };
const cardB = { id: 'card-b', name: 'Segunda', description: '', taskLists: [] };
const openSnapshot = {
  board: batchBoard,
  doneListId: 'done',
  lists: [
    { id: 'ideas', name: 'IDEAS', cards: [] },
    { id: 'work', name: 'EN PROGRESO', cards: [cardA, cardB] },
    { id: 'done', name: 'HECHO', cards: [] },
  ],
};

const startPrompt = batchStartPrompt(cardA, batchBoard, batchProject);
assert.ok(
  startPrompt.includes('Primera') && startPrompt.includes('subagente'),
  'the first card opens the batch and asks the main agent for a subagent',
);
assert.ok(startPrompt.includes('kanban_complete_card'), 'the agent is told how to finish a card');
const addPrompt = batchCardPrompt(cardB, batchBoard, batchProject);
assert.ok(
  addPrompt.includes('Segunda') && addPrompt.includes('subagente'),
  'a card added later carries the same delegation rule',
);
assert.ok(batchClosePrompt().includes('resumen'), 'the batch closes with a summary per subagent');
assert.ok(
  !batchClosePrompt().includes('cierra esta sesión'),
  'the batch summary does not close the session',
);
assert.ok(
  batchClosePrompt().includes('no la cierres'),
  'the batch summary asks to keep the session open',
);

const batchLinks = {
  'card-a': { sessionId: 's1', boardId: 'board-1', batch: true, linkedAt: '2026-11-14T10:00:00.000Z' },
  'card-b': { sessionId: 's1', boardId: 'board-1', batch: true, linkedAt: '2026-11-14T10:01:00.000Z' },
};
assert.equal(reusableBatchSession(batchLinks, openSnapshot), 's1', 'an open batch is reused');
assert.equal(batchAllDone(batchLinks, openSnapshot, 's1'), false, 'a card outside HECHO keeps the batch open');

const doneSnapshot = {
  board: batchBoard,
  doneListId: 'done',
  lists: [
    { id: 'ideas', name: 'IDEAS', cards: [] },
    { id: 'work', name: 'EN PROGRESO', cards: [] },
    { id: 'done', name: 'HECHO', cards: [cardA, cardB] },
  ],
};
assert.equal(batchAllDone(batchLinks, doneSnapshot, 's1'), true, 'every card in HECHO closes the batch');
assert.equal(reusableBatchSession(batchLinks, doneSnapshot), '', 'a finished batch is not reused');

const manualLink = { 'card-a': { sessionId: 's2', boardId: 'board-1', linkedAt: '2026-11-14T10:00:00.000Z' } };
assert.equal(reusableBatchSession(manualLink, openSnapshot), '', 'a manual session is never a batch');
assert.equal(
  reusableBatchSession(batchLinks, { ...openSnapshot, board: { id: 'board-2', name: 'Otro' } }),
  '',
  'a batch never crosses boards',
);

// Manual batches stop before DONE and never share a session with automatic ones.
const manualStart = batchStartPrompt(cardA, batchBoard, batchProject, { manual: true });
assert.ok(manualStart.includes('déjala en EN PROGRESO'), 'a manual batch leaves the card for review');
assert.ok(!manualStart.includes('mueve la tarjeta a HECHO'), 'a manual batch does not move cards to DONE');
assert.ok(startPrompt.includes('mueve la tarjeta a HECHO'), 'an automatic batch moves the card to DONE');
const manualBatchLinks = {
  'card-a': { sessionId: 'm1', boardId: 'board-1', batch: true, manual: true, linkedAt: '2026-11-14T10:00:00.000Z' },
};
assert.equal(
  reusableBatchSession(manualBatchLinks, openSnapshot, { manual: true }),
  'm1',
  'a manual batch is reused by manual',
);
assert.equal(
  reusableBatchSession(manualBatchLinks, openSnapshot, { manual: false }),
  '',
  'automatic never joins a manual batch',
);
assert.equal(
  reusableBatchSession(batchLinks, openSnapshot, { manual: true }),
  '',
  'manual never joins an automatic batch',
);

// The board the agent uses follows the project of the session, never a global
// selection. Pinning is manual; a worktree inherits its project's board.
process.env.KANBAN_BOARD_PROJECTS_PATH = join(dir, 'board-projects.json');
const projectsBundle = join(dir, 'board-projects.cjs');
await build({
  entryPoints: [new URL('../src/shared/board-projects.js', import.meta.url).pathname],
  bundle: true,
  outfile: projectsBundle,
  platform: 'node',
  format: 'cjs',
  logLevel: 'silent',
});
const { resolveProjectBoard, setProjectBoard, getProjectBoard, setBoardProject } = require(projectsBundle);

const pinProjectA = join(dir, 'proj-a');
const pinProjectB = join(dir, 'proj-b');
assert.equal(
  resolveProjectBoard(pinProjectA),
  '',
  'a project with no board and no pin resolves to nothing',
);
setProjectBoard(pinProjectA, 'board-a');
assert.equal(getProjectBoard(pinProjectA), 'board-a', 'the pin is stored for the exact project');
assert.equal(resolveProjectBoard(pinProjectA), 'board-a', 'the pinned board is the one the agent uses');
assert.equal(
  resolveProjectBoard(join(pinProjectA, 'packages', 'app')),
  'board-a',
  'a subfolder inherits the project board',
);
assert.equal(resolveProjectBoard(pinProjectB), '', 'another project never reuses that board');

setBoardProject('board-b', { projectId: 'p-b', directory: pinProjectB });
assert.equal(resolveProjectBoard(pinProjectB), 'board-b', 'a project with a single board needs no pin');
setBoardProject('board-c', { projectId: 'p-c', directory: pinProjectB });
assert.equal(resolveProjectBoard(pinProjectB), '', 'two boards and no pin: the agent does not guess');

// A worktree shares the git common dir, so it inherits its checkout's pin.
const repo = join(dir, 'repo');
mkdirSync(repo, { recursive: true });
execFileSync('git', ['-C', repo, 'init', '-q']);
writeFileSync(join(repo, 'README.md'), '# demo\n');
execFileSync('git', ['-C', repo, 'add', '.']);
execFileSync('git', ['-C', repo, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init']);
const worktree = join(dir, 'repo-worktree');
execFileSync('git', ['-C', repo, 'worktree', 'add', '-q', worktree]);
setProjectBoard(repo, 'board-repo');
assert.equal(resolveProjectBoard(worktree), 'board-repo', 'a worktree inherits the board pinned for its project');

// The header pin says what pressing it does, so the state and the copy are
// derived in one place and checked here without a browser.
const pinBundle = join(dir, 'board-pin.cjs');
await build({
  entryPoints: [new URL('../src/shared/board-pin.js', import.meta.url).pathname],
  bundle: true,
  outfile: pinBundle,
  platform: 'node',
  format: 'cjs',
  logLevel: 'silent',
});
const { pinState } = require(pinBundle);
assert.deepEqual(
  pinState({ pinned: '', boardId: 'board-a', hasProject: true }),
  {
    pinned: false,
    disabled: false,
    label: 'Fijar este tablero para el agente en este proyecto',
  },
  'a board that is not pinned offers to pin itself',
);
assert.equal(
  pinState({ pinned: 'board-a', boardId: 'board-a', hasProject: true }).pinned,
  true,
  'the pinned board fills the pin',
);
assert.equal(
  pinState({ pinned: 'board-b', boardId: 'board-a', hasProject: true }).pinned,
  false,
  'another pinned board never fills this one',
);
assert.equal(
  pinState({ pinned: '', boardId: 'board-a', hasProject: false }).disabled,
  true,
  'without a project the pin cannot be pressed',
);
assert.equal(
  pinState({ pinned: '', boardId: '', hasProject: true }).disabled,
  true,
  'without a board the pin cannot be pressed',
);

// The chat's @ menu asks the service for cards. The picked row comes back as an
// id alone, so the id must round-trip the board or the local project.
const mentionsBundle = join(dir, 'mentions.cjs');
await build({
  entryPoints: [new URL('../src/shared/mentions.js', import.meta.url).pathname],
  bundle: true,
  outfile: mentionsBundle,
  platform: 'node',
  format: 'cjs',
  logLevel: 'silent',
});
const { mentionId, parseMentionId, mentionItems, mentionText, promoteCardList } = require(mentionsBundle);

const plankaMention = mentionId({ source: 'planka', boardId: 'board-1', cardId: 'card-a' });
assert.deepEqual(parseMentionId(plankaMention), { source: 'planka', boardId: 'board-1', cardId: 'card-a' });
const localMention = mentionId({ source: 'local', directory: '/home/ana/proyecto', cardId: 'card-b' });
assert.deepEqual(parseMentionId(localMention), {
  source: 'local',
  directory: '/home/ana/proyecto',
  cardId: 'card-b',
});
assert.equal(parseMentionId('nope'), null, 'an unknown row id resolves to nothing');

const mentionBoard = {
  name: 'Tablero',
  doneListId: 'done',
  lists: [
    {
      id: 'ideas',
      name: 'IDEAS',
      cards: [{ id: 'c1', name: 'Arreglar el borde', description: 'Se sale', taskLists: [] }],
    },
    { id: 'work', name: 'EN PROGRESO', cards: [{ id: 'c2', name: 'Ordenar ideas', description: '', taskLists: [] }] },
    { id: 'done', name: 'HECHO', cards: [{ id: 'c3', name: 'Vieja', description: '', taskLists: [] }] },
  ],
};
const mentionOrigin = { source: 'planka', boardId: 'board-1' };
const allMentions = mentionItems(mentionBoard, '', mentionOrigin);
assert.equal(allMentions.length, 2, 'a card in DONE stays out of the menu');
assert.equal(allMentions[0].title, 'Ordenar ideas', 'cards in progress come first');
assert.equal(allMentions[0].subtitle, 'EN PROGRESO', 'the subtitle names the column');
assert.equal(allMentions[1].subtitle, 'IDEAS', 'ideas follow their own group');
assert.equal(
  mentionItems(mentionBoard, 'borde', mentionOrigin).length,
  1,
  'the query filters by title and description',
);
const mentionCardText = mentionText(mentionBoard.lists[0].cards[0], 'IDEAS', 'Tablero');
assert.ok(mentionCardText.includes('id c1'), 'the chip text carries the card id');
assert.ok(mentionCardText.includes('Se sale'), 'the chip text carries the description');

// The host draws this list at the bottom of the composer, so it stays short:
// a query ranks exact and prefix title matches first, and accents do not matter.
const manyBoard = {
  name: 'Tablero',
  doneListId: 'done',
  lists: [
    {
      id: 'ideas',
      name: 'IDEAS',
      cards: Array.from({ length: 8 }, (_, index) => ({
        id: `m${index}`,
        name: index === 7 ? 'borde' : `borde ${index}`,
        description: '',
        taskLists: [],
      })),
    },
    { id: 'done', name: 'HECHO', cards: [] },
  ],
};
const manyItems = mentionItems(manyBoard, 'borde', mentionOrigin);
assert.equal(manyItems.length, 6, 'the menu caps at six rows');
assert.equal(manyItems[0].title, 'borde', 'an exact title comes first');
const accentedBoard = {
  name: 'Tablero',
  doneListId: 'done',
  lists: [
    { id: 'ideas', name: 'IDEAS', cards: [{ id: 'a1', name: 'Índice del README', description: '', taskLists: [] }] },
    { id: 'done', name: 'HECHO', cards: [] },
  ],
};
assert.equal(
  mentionItems(accentedBoard, 'indice', mentionOrigin).length,
  1,
  'the search ignores accents',
);

// IDEAS size: speed and complexity read the same text.
const workBundle = join(dir, 'work.cjs');
await build({
  entryPoints: [new URL('../src/shared/work.js', import.meta.url).pathname],
  bundle: true,
  outfile: workBundle,
  platform: 'node',
  format: 'cjs',
  logLevel: 'silent',
});
const { classifyWork, sortCardsByWork } = require(workBundle);

assert.equal(
  classifyWork({ name: 'Añadir un index al README', description: '' }).key,
  'quick',
  'texts and documentation count as quick work',
);
assert.equal(
  classifyWork({ name: 'Rediseñar todo el panel', description: 'reescribir la interfaz' }).key,
  'big',
  'a redesign is big work',
);
assert.equal(
  classifyWork({ name: 'Pintar el logo', description: '' }).key,
  'medium',
  'a card with no size signal is a normal change',
);
const workCards = [
  { name: 'Pintar el logo', description: '' },
  { name: 'Rediseñar todo el panel', description: '' },
  { name: 'Añadir un index al README', description: '' },
];
assert.deepEqual(
  sortCardsByWork(workCards, 'quick').map((card) => card.name),
  ['Añadir un index al README', 'Pintar el logo', 'Rediseñar todo el panel'],
  'speed puts the small work first',
);
assert.deepEqual(
  sortCardsByWork(workCards, 'big').map((card) => card.name),
  ['Rediseñar todo el panel', 'Pintar el logo', 'Añadir un index al README'],
  'complexity puts the big work first',
);

rmSync(dir, { recursive: true, force: true });
const promoteBoard = {
  doneListId: 'done',
  lists: [
    { id: 'ideas', name: 'IDEAS', cards: [] },
    { id: 'work', name: 'EN PROGRESO', cards: [] },
    { id: 'done', name: 'HECHO', cards: [] },
  ],
};
assert.equal(promoteCardList(promoteBoard, 'ideas'), 'work', 'a backlog card moves to work');
assert.equal(promoteCardList(promoteBoard, 'work'), '', 'a card already in progress stays');
assert.equal(promoteCardList(promoteBoard, 'done'), '', 'a finished card never moves');

// The composer grows with what you type instead of hiding it: the title keeps
// two lines, the description four, and anything longer scrolls inside the box.
const composerBundle = join(dir, 'composer.cjs');
await build({
  entryPoints: [new URL('../src/shared/composer.js', import.meta.url).pathname],
  bundle: true,
  outfile: composerBundle,
  platform: 'node',
  format: 'cjs',
  logLevel: 'silent',
});
const { composerFieldHeight } = require(composerBundle);
const field = (lines, textLines) =>
  composerFieldHeight({
    scrollHeight: textLines * 16 + 14,
    lineHeight: 16,
    padding: 14,
    border: 2,
    lines,
  });
assert.deepEqual(field(2, 1), { height: 32, scroll: false }, 'one line keeps the title short');
assert.deepEqual(field(2, 2), { height: 48, scroll: false }, 'two lines fit the title');
assert.deepEqual(field(2, 3), { height: 48, scroll: true }, 'a third line scrolls inside the title');
assert.deepEqual(field(4, 4), { height: 80, scroll: false }, 'four lines fit the description');
assert.deepEqual(field(4, 6), { height: 80, scroll: true }, 'a longer description scrolls');

// The Work Status section is sized by the manifest before any script runs, and
// 190px showed a card and a half: three cards only fitted while the session
// menu asked for more height. It has to open tall.
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.ok(
  manifest.openchamber.contributes.statusSection.height >= 320,
  'the Work Status opens tall enough for three cards',
);

console.log('local mode: 132 assertions ok');
