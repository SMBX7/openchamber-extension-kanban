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
const { PlankaClient, boardSummary } = require(bundle);

const calls = [];
const bodies = [];
const requests = [];
let queue = [];
globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), method: init?.method || 'GET' });
  requests.push(init || {});
  bodies.push(init?.body && typeof init.body === 'string' ? init.body : '');
  const next = queue.shift();
  if (!next) throw new Error(`unexpected fetch ${url}`);
  return {
    status: next.status,
    ok: next.status >= 200 && next.status < 300,
    headers: {
      get(name) {
        return String(name).toLowerCase() === 'content-type' ? next.mime || null : null;
      },
    },
    async text() {
      return next.body === undefined ? '' : JSON.stringify(next.body);
    },
    async arrayBuffer() {
      return Uint8Array.from(next.bytes || []).buffer;
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

// The panel sends the title and the description in the same request, so the
// description must reach Planka in the create body.
calls.length = 0;
bodies.length = 0;
queue = [
  { status: 200, body: { item: { id: 'b1', name: 'Tablero' }, included: { lists: [{ id: 'l1', name: 'IDEAS', position: 65536, type: 'active' }], cards: [] } } },
  { status: 200, body: { item: { id: 'c2' } } },
];
await client().createCard('l1', 'Newsletter', 'b1', { description: 'Asunto y prueba' });
assert.equal(JSON.parse(bodies[1]).description, 'Asunto y prueba');

// An empty title is refused before any request, exactly as the local board
// does; Planka would otherwise create a nameless card.
calls.length = 0;
queue = [];
await assert.rejects(() => client().createCard('l1', '   ', 'b1'), /El título no puede quedar vacío/);
assert.equal(calls.length, 0);

// Attachments travel inside the board payload. The panel reads them from the
// card, so the normalised card carries the files and which one is the cover.
const boardWithAttachments = {
  item: { id: 'b1', name: 'Tablero' },
  included: {
    lists: [{ id: 'l1', name: 'IDEAS', position: 65536, type: 'active' }],
    cards: [{ id: 'c1', listId: 'l1', name: 'Tarjeta', position: 65536, coverAttachmentId: 'a2' }],
    labels: [],
    cardLabels: [],
    taskLists: [],
    tasks: [],
    attachments: [
      {
        id: 'a1',
        cardId: 'c1',
        type: 'file',
        name: 'foto.jpg',
        createdAt: '2026-01-01T10:00:00.000Z',
        data: {
          mimeType: 'image/jpeg',
          size: 2048,
          image: { width: 800, height: 600, thumbnailsExtension: 'jpg' },
          url: 'http://planka.test/attachments/a1/download/foto.jpg',
          thumbnailUrls: {
            outside360: 'http://planka.test/attachments/a1/download/thumbnails/outside-360.jpg',
            outside720: 'http://planka.test/attachments/a1/download/thumbnails/outside-720.jpg',
          },
        },
      },
      {
        id: 'a2',
        cardId: 'c1',
        type: 'file',
        name: 'plan.pdf',
        createdAt: '2026-01-02T10:00:00.000Z',
        data: {
          mimeType: 'application/pdf',
          size: 999,
          image: null,
          url: 'http://planka.test/attachments/a2/download/plan.pdf',
        },
      },
    ],
  },
};

queue = [{ status: 200, body: boardWithAttachments }];
const board = await client().readBoard('b1');
const attachedCard = board.lists[0].cards[0];
assert.equal(attachedCard.attachments.length, 2);
assert.equal(attachedCard.attachments[0].isImage, true);
assert.equal(attachedCard.attachments[1].isImage, false);
assert.equal(
  attachedCard.attachments[0].thumbnailUrl,
  'http://planka.test/attachments/a1/download/thumbnails/outside-360.jpg',
);
assert.equal(attachedCard.coverAttachmentId, 'a2');
assert.equal(attachedCard.cover.name, 'plan.pdf');
// The agent reads the board through the summary: it counts the files too.
assert.equal(boardSummary(board).lists[0].cards[0].attachments, 2);

// A photo goes up as one multipart file with the Planka shape: type=file, a
// name, and the bytes. Planka turns the first attachment into the cover.
calls.length = 0;
bodies.length = 0;
requests.length = 0;
queue = [{ status: 200, body: { item: { id: 'a3', cardId: 'c1' } } }];
const uploaded = await client().uploadAttachment('c1', {
  name: 'foto.jpg',
  mime: 'image/jpeg',
  buffer: Buffer.from('hola'),
});
assert.equal(uploaded.id, 'a3');
assert.equal(calls[0].url, 'http://planka.test/api/cards/c1/attachments');
assert.equal(requests[0].method, 'POST');
assert.ok(requests[0].body instanceof FormData);
assert.equal(requests[0].body.get('type'), 'file');
assert.equal(requests[0].body.get('name'), 'foto.jpg');
assert.ok(requests[0].body.get('file') instanceof Blob);

// Deleting an attachment is the Planka route by attachment id.
calls.length = 0;
queue = [{ status: 200, body: { item: {} } }];
await client().deleteAttachment('a3');
assert.equal(calls[0].url, 'http://planka.test/api/attachments/a3');
assert.equal(calls[0].method, 'DELETE');

// The cover is a card field: an id sets it and null clears it.
calls.length = 0;
bodies.length = 0;
queue = [{ status: 200, body: { item: { id: 'c1' } } }];
await client().setCardCover('c1', 'a1', 'b1');
assert.deepEqual(JSON.parse(bodies[0]), { coverAttachmentId: 'a1' });
bodies.length = 0;
queue = [{ status: 200, body: { item: { id: 'c1' } } }];
await client().setCardCover('c1', '', 'b1');
assert.deepEqual(JSON.parse(bodies[0]), { coverAttachmentId: null });

// The panel never talks to Planka: the service reads the bytes with the
// token and hands them over as a buffer.
calls.length = 0;
queue = [{ status: 200, bytes: [1, 2, 3], mime: 'image/jpeg' }];
const file = await client().readAttachmentFile('/attachments/a1/download/thumbnails/outside-360.jpg');
assert.equal(file.mime, 'image/jpeg');
assert.deepEqual([...file.buffer], [1, 2, 3]);
assert.equal(
  calls[0].url,
  'http://planka.test/attachments/a1/download/thumbnails/outside-360.jpg',
);

rmSync(dir, { recursive: true, force: true });
console.log('planka routes: 24 assertions ok');
