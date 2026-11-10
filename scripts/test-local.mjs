// Exercises the local board client against a throwaway file.
// The extension sources are ESM without "type": "module", so esbuild bundles
// the module to CJS before requiring it.
import { build } from 'esbuild';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
const { LocalClient } = require(bundle);
const client = new LocalClient({});

const board = await client.readBoard();
assert.deepEqual(board.lists.map((list) => list.name), ['IDEAS', 'EN PROGRESO', 'HECHO']);
assert.equal(board.doneListId, 'list-3');
assert.equal(board.counts.total, 0);
assert.ok(board.labels.length >= 1, 'the local board has default labels');

const ideas = board.lists[0];
const doing = board.lists[1];

const card = await client.createCard(ideas.id, '  Comprar pan  ');
assert.equal(card.name, 'Comprar pan');

await client.moveCard(card.id, doing.id, 0);
let view = await client.readBoard();
assert.equal(view.lists[1].cards[0].id, card.id);
assert.equal(view.counts.incomplete, 1);

await client.updateCard(card.id, { description: 'Integral', dueDate: '2026-12-01' });
view = await client.readBoard();
const updated = view.lists[1].cards[0];
assert.equal(updated.description, 'Integral');
assert.ok(updated.dueDate.startsWith('2026-12-01'));

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

rmSync(dir, { recursive: true, force: true });
console.log('local mode: 14 assertions ok');
