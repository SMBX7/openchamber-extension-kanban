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
const { resolveProjectBoard, setProjectBoard, getProjectBoard, setBoardProject, pinForDirectory } = require(projectsBundle);

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
assert.deepEqual(
  pinForDirectory(repo),
  { key: repo, boardId: 'board-repo' },
  'a project directory reads its own pin',
);
assert.deepEqual(
  pinForDirectory(join(repo, 'packages', 'app')),
  { key: repo, boardId: 'board-repo' },
  'a subfolder reads the project pin, not an empty one',
);
assert.deepEqual(
  pinForDirectory(worktree),
  { key: repo, boardId: 'board-repo' },
  'a worktree reads the project pin through the shared repository',
);
assert.deepEqual(
  pinForDirectory(pinProjectB),
  { key: '', boardId: '' },
  'a project with no pin reads nothing instead of guessing',
);

// The panel follows the board bound to the project of the session it is open
// in, and binds a picked board to that project.
const followBundle = join(dir, 'board-follow.cjs');
await build({
  entryPoints: [new URL('../src/shared/board-follow.js', import.meta.url).pathname],
  bundle: true,
  outfile: followBundle,
  platform: 'node',
  format: 'cjs',
  logLevel: 'silent',
});
const { shouldFollowBoard, projectForDirectory } = require(followBundle);
const available = [{ id: 'board-a' }, { id: 'board-b' }];
assert.equal(
  shouldFollowBoard({ resolved: 'board-b', current: 'board-a', boards: available }),
  true,
  'the panel follows the board of the project',
);
assert.equal(
  shouldFollowBoard({ resolved: '', current: 'board-a', boards: available }),
  false,
  'a project without a board leaves the panel alone',
);
assert.equal(
  shouldFollowBoard({ resolved: 'board-a', current: 'board-a', boards: available }),
  false,
  'the board already shown is not fetched again',
);
assert.equal(
  shouldFollowBoard({ resolved: 'board-z', current: 'board-a', boards: available }),
  false,
  'a board that is not available is never followed',
);
assert.equal(
  shouldFollowBoard({ resolved: 'board-b', current: '', boards: [] }),
  true,
  'before the board list loads, a resolved board is followed',
);

const projects = [
  { id: 'p-ext', name: 'openchamber-kanban', directory: '/home/ana/proyectos/ext' },
  { id: 'p-shop', name: 'tienda', directory: '/home/ana/proyectos/tienda' },
  { id: 'p-nested', name: 'app', directory: '/home/ana/proyectos/ext/packages/app' },
];
assert.equal(
  projectForDirectory(projects, '/home/ana/proyectos/tienda')?.id,
  'p-shop',
  'the exact directory is the project',
);
assert.equal(
  projectForDirectory(projects, '/home/ana/proyectos/ext/worktrees/rama')?.id,
  'p-ext',
  'a worktree belongs to its project',
);
assert.equal(
  projectForDirectory(projects, '/home/ana/proyectos/ext/packages/app/src')?.id,
  'p-nested',
  'the closest project wins in a nested folder',
);
assert.equal(
  projectForDirectory(projects, '/home/ana/otra-cosa'),
  null,
  'a directory outside every project matches nothing',
);
assert.equal(projectForDirectory(projects, ''), null, 'no directory, no project');

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
const pinBase = { pinned: '', boardId: 'board-a', project: 'SMB Points' };
assert.deepEqual(
  pinState(pinBase),
  {
    pinned: false,
    disabled: false,
    hidden: false,
    text: 'Vincular',
    label: 'Vincular este tablero a SMB Points',
  },
  'a board that is not bound offers to bind itself to the project',
);
assert.deepEqual(
  pinState({ ...pinBase, pinned: 'board-a' }),
  {
    pinned: true,
    disabled: false,
    hidden: false,
    text: 'SMB Points',
    label: 'Vinculado a SMB Points. Pulsa para desvincular el tablero',
  },
  'the bound board names the project',
);
assert.equal(
  pinState({ ...pinBase, pinned: 'board-b' }).pinned,
  false,
  'another project board never fills this one',
);
assert.equal(
  pinState({ ...pinBase, project: '' }).hidden,
  true,
  'without a project the pill hides',
);
assert.equal(
  pinState({ ...pinBase, boardId: '' }).disabled,
  true,
  'without a board the pill cannot be pressed',
);

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

console.log('local mode: 146 assertions ok');
