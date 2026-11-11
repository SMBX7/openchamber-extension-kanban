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
let queue = [];
globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), method: init?.method || 'GET' });
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

rmSync(dir, { recursive: true, force: true });
console.log('planka label routes: 5 assertions ok');
