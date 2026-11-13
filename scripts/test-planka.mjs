// Pins the Planka label-removal route. Planka 2.x moved it to
// /cards/:cardId/card-labels/labelId:<id>; 1.x only has /card-labels/:id.
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const dir = mkdtempSync(join(tmpdir(), 'kanban-planka-'));
const bundle = join(dir, 'planka.cjs');
await build({
  entryPoints: [new URL('../src/shared/planka.js', import.meta.url).pathname],
  bundle: true,
  outfile: bundle,
  platform: 'node',
  format: 'cjs',
  logLevel: 'silent',
});

const require = createRequire(import.meta.url);
const { PlankaClient } = require(bundle);

const calls = [];
const bodies = [];
let queue = [];
globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), method: init?.method || 'GET' });
  bodies.push(init?.body ? String(init.body) : '');
  const next = queue.shift();
  if (!next) throw new Error(`unexpected fetch ${url}`);
  return {
    status: next.status,
    ok: next.status >= 200 && next.status < 300,
    async text() {
      return next.body === undefined ? '' : JSON.stringify(next.body);
    },
  };
};

const client = () => new PlankaClient({ baseUrl: 'http://planka.test', token: 't' });

// Planka 2.x route succeeds: no fallback.
queue = [{ status: 200, body: { item: { id: 'cl1' } } }];
assert.equal(await client().deleteCardLabel('c1', 'l1', 'cl1'), true);
assert.deepEqual(
  calls.map((call) => `${call.method} ${call.url}`),
  ['DELETE http://planka.test/api/cards/c1/card-labels/labelId:l1'],
);

// Planka 1.x: the new route 404s, so the old card-label id is used.
calls.length = 0;
queue = [
  { status: 404, body: { code: 'E_NOT_FOUND' } },
  { status: 200, body: { item: { id: 'cl1' } } },
];
assert.equal(await client().deleteCardLabel('c1', 'l1', 'cl1'), true);
assert.deepEqual(
  calls.map((call) => `${call.method} ${call.url}`),
  [
    'DELETE http://planka.test/api/cards/c1/card-labels/labelId:l1',
    'DELETE http://planka.test/api/card-labels/cl1',
  ],
);

// Without a known card-label id a 404 is a real error, not a silent fallback.
calls.length = 0;
queue = [{ status: 404, body: { code: 'E_NOT_FOUND' } }];
await assert.rejects(() => client().deleteCardLabel('c1', 'l1', ''));

// Renaming must send only the name: sending listId would move the card, and a
// listId without index teleports it to index 0 of that column.
calls.length = 0;
bodies.length = 0;
queue = [{ status: 200, body: { item: { id: 'c1', name: 'Renombrada' } } }];
const renamed = await client().updateCard('c1', { id: 'c1', name: 'Renombrada' }, 'b1');
assert.equal(renamed.name, 'Renombrada');
assert.deepEqual(JSON.parse(bodies[0]), { name: 'Renombrada' });

// One board with a checklist, used by the task and checklist scenarios.
const boardWithChecklist = {
  item: { id: 'b1', name: 'Tablero' },
  included: {
    lists: [{ id: 'l1', name: 'IDEAS', position: 65536, type: 'active' }],
    cards: [{ id: 'c1', listId: 'l1', name: 'Tarjeta', position: 65536 }],
    labels: [],
    cardLabels: [],
    taskLists: [{ id: 'tl1', cardId: 'c1', name: 'Pasos', position: 65536 }],
    tasks: [
      { id: 't1', taskListId: 'tl1', name: 'Masa', position: 65536, isCompleted: false },
      { id: 't2', taskListId: 'tl1', name: 'Horno', position: 131072, isCompleted: false },
    ],
  },
};

// A new task goes after the last one of its checklist. Reading the first board
// of the account instead of the selected one loses the checklist and puts the
// task at the top, while the local board appends it.
calls.length = 0;
bodies.length = 0;
queue = [
  { status: 200, body: boardWithChecklist },
  { status: 200, body: { item: { id: 't3' } } },
];
await client().addTask('tl1', 'Enfriar', 'b1');
assert.deepEqual(
  calls.map((call) => `${call.method} ${call.url}`),
  ['GET http://planka.test/api/boards/b1', 'POST http://planka.test/api/task-lists/tl1/tasks'],
);
assert.equal(JSON.parse(bodies[1]).position, 196608);

// A blank checklist name falls back to "Checklist", the name the local board
// gives it; sending an empty name makes Planka reject the request.
calls.length = 0;
bodies.length = 0;
queue = [
  { status: 200, body: boardWithChecklist },
  { status: 200, body: { item: { id: 'tl2', name: 'Checklist' } } },
];
await client().addChecklist('c1', '   ', 'b1');
assert.equal(JSON.parse(bodies[1]).name, 'Checklist');

// An empty title is refused before any request, exactly as the local board
// does; Planka would otherwise create a nameless card.
calls.length = 0;
queue = [];
await assert.rejects(() => client().createCard('l1', '   ', 'b1'), /El título no puede quedar vacío/);
assert.equal(calls.length, 0);

rmSync(dir, { recursive: true, force: true });
console.log('planka routes: 12 assertions ok');
