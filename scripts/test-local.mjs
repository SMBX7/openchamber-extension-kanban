// Exercises the local board client against a throwaway file.
// The extension sources are ESM without "type": "module", so esbuild bundles
// the module to CJS before requiring it.
import { build } from 'esbuild';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
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
const { DEFAULT_LIST_NAMES, ensureDefaultLists } = require(defaultsBundle);
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

// Exports read the board of the project they are asked about.
assert.ok(exportBoard('json', projectA).includes('Vieja tarjeta'));
assert.equal(exportBoard('json', projectB).includes('Vieja tarjeta'), false);

// Without a project key the explicit path is written as before.
const keyless = new LocalClient({});
await keyless.createCard(migrated.lists[0].id, 'Sin proyecto');
assert.equal(existsSync(process.env.KANBAN_LOCAL_PATH), true);
assert.ok(exportBoard('json').includes('Sin proyecto'));

rmSync(dir, { recursive: true, force: true });
console.log('local mode: 53 assertions ok');
