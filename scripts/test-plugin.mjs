// The agent enters OpenCode as a plugin now, so this suite loads the built
// plugin the way OpenCode does (a bare import of the folder's entry), runs its
// setup with the context shape OpenCode documents, and calls every tool against
// a real board file. Planka is covered through its HTTP client, which is the
// same one the panel uses.
import { build } from 'esbuild';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assertImpl from 'node:assert/strict';

let assertions = 0;
const assert = new Proxy(assertImpl, {
  apply(target, thisArg, args) {
    assertions += 1;
    return Reflect.apply(target, thisArg, args);
  },
  get(target, prop) {
    const value = target[prop];
    if (typeof value !== 'function') return value;
    return (...args) => {
      assertions += 1;
      return value.apply(target, args);
    };
  },
});

const dir = mkdtempSync(join(tmpdir(), 'kanban-plugin-'));
// The files the plugin reads live in DATA_DIR, resolved when it loads.
process.env.KANBAN_DATA_DIR = join(dir, 'data');
process.env.KANBAN_BOARD_PROJECTS_PATH = join(dir, 'data', 'board-projects.json');
mkdirSync(process.env.KANBAN_DATA_DIR, { recursive: true });

// The bundle resolves the package from its folder, so the fake package carries
// the real manifest and the version assertion means something.
const realManifest = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
writeFileSync(join(dir, 'package.json'), realManifest);

// Build the plugin exactly as `npm run build` does, then import the output.
const entry = join(dir, 'plugin', 'index.mjs');
await build({
  entryPoints: [new URL('../src/plugin/main.js', import.meta.url).pathname],
  bundle: true,
  outfile: entry,
  format: 'esm',
  platform: 'node',
  target: ['node20'],
  logLevel: 'silent',
  define: { __KANBAN_VERSION__: JSON.stringify(JSON.parse(realManifest).version) },
  banner: {
    js: "import { fileURLToPath as __f } from 'node:url';\nimport { dirname as __d } from 'node:path';\nconst __dirname = __d(__f(import.meta.url));",
  },
});

const { default: plugin } = await import(`file://${entry}`);
assert.equal(plugin.id, 'kanban');
assert.equal(typeof plugin.setup, 'function');

const project = join(dir, 'proyecto');
mkdirSync(project, { recursive: true });

// What OpenCode hands a plugin. `ctx.tool.transform` is the only hook used, and
// the editor is the object the plugin receives.
const register = async ({ location = project } = {}) => {
  const tools = {};
  const ctx = {
    location: { directory: location },
    session: { get: async () => ({ location: { directory: location }, subpath: undefined }) },
    tool: {
      transform: async (callback) => {
        callback({
          namespace() {},
          add(tool) {
            tools[`kanban_${tool.name}`] = tool;
          },
        });
      },
    },
  };
  await plugin.setup(ctx);
  return tools;
};

const tools = await register();
assert.deepEqual(
  Object.keys(tools).sort(),
  [
    'kanban_board',
    'kanban_boards',
    'kanban_checklist_add',
    'kanban_checklist_check',
    'kanban_complete_card',
    'kanban_create_card',
    'kanban_delete_card',
    'kanban_link_session',
    'kanban_move_card',
    'kanban_search',
    'kanban_update_card',
  ],
  'the tool names the agent already knows',
);
for (const [name, tool] of Object.entries(tools)) {
  assert.equal(tool.input.type, 'object', `${name} takes an object`);
  assert.equal(tool.options.namespace, 'kanban', `${name} lives in the kanban namespace`);
  assert.equal(tool.options.codemode, true, `${name} works in Code Mode`);
  assert.ok(tool.description.length > 10, `${name} explains itself`);
}

// The heartbeat is the panel's proof that the agent loaded this version.
const heartbeat = JSON.parse(readFileSync(join(process.env.KANBAN_DATA_DIR, 'agent.json'), 'utf8'));
assert.equal(heartbeat.version, JSON.parse(realManifest).version);
assert.equal(heartbeat.installed, JSON.parse(realManifest).version);
assert.equal(heartbeat.event, 'setup');


// --- Local board, through the plugin, end to end.
writeFileSync(join(process.env.KANBAN_DATA_DIR, 'config.json'), '{"source":"local"}\n');
const call = (name, args = {}) => tools[name].execute(args, { sessionID: 'ses_plugin_test' });

const created = JSON.parse((await call('kanban_create_card', { list: 'IDEAS', name: 'Probado por el plugin' })).content);
assert.equal(created.created, true);
assert.equal(created.list, 'IDEAS');

const board = JSON.parse((await call('kanban_board')).content);
assert.ok(board.lists.some((list) => list.name === 'EN PROGRESO'));
assert.ok(board.lists.flatMap((list) => list.cards).some((card) => card.name === 'Probado por el plugin'));

const found = JSON.parse((await call('kanban_search', { query: 'plugin' })).content);
assert.equal(found.cards.length, 1);

const moved = JSON.parse((await call('kanban_move_card', { card: 'Probado por el plugin', list: 'EN PROGRESO' })).content);
assert.equal(moved.moved, true);
assert.equal(moved.list, 'EN PROGRESO');

const updated = JSON.parse((await call('kanban_update_card', { card: 'Probado por el plugin', description: 'Con detalle' })).content);
assert.equal(updated.updated, true);

const checklist = JSON.parse((await call('kanban_checklist_add', { card: 'Probado por el plugin', name: 'Pasos', tasks: ['Uno', 'Dos'] })).content);
assert.equal(checklist.tasks.length, 2);
const checked = JSON.parse((await call('kanban_checklist_check', { card: 'Probado por el plugin', task: 'Uno' })).content);
assert.equal(checked.checked, true);

const linked = JSON.parse((await call('kanban_link_session', { card: 'Probado por el plugin' })).content);
assert.equal(linked.linked, true);
assert.equal(linked.sessionId, 'ses_plugin_test', 'the tool call session is the default');

const completed = JSON.parse((await call('kanban_complete_card', { card: 'Probado por el plugin' })).content);
assert.equal(completed.completed, true);

const removed = JSON.parse((await call('kanban_delete_card', { card: 'Probado por el plugin' })).content);
assert.equal(removed.deleted, true);
assert.equal(JSON.parse((await call('kanban_board')).content).counts.total, 0);

// The version in the heartbeat is the code's, not the manifest's: an update can
// replace package.json while OpenCode still holds the module it loaded.
writeFileSync(join(dir, 'package.json'), JSON.stringify({ version: '9.9.9' }));
await tools.kanban_board.execute({}, { sessionID: 'ses_version' });
const afterUpdate = JSON.parse(readFileSync(join(process.env.KANBAN_DATA_DIR, 'agent.json'), 'utf8'));
assert.equal(afterUpdate.version, JSON.parse(realManifest).version, 'the heartbeat reports the running code');
assert.equal(afterUpdate.installed, '9.9.9', 'and the manifest that is on disk now');
writeFileSync(join(dir, 'package.json'), realManifest);

// A board that is missing while a copy sits beside it is refused, not filled.
const lost = join(dir, 'proyecto-perdido');
mkdirSync(lost, { recursive: true });
const lostTools = await register({ location: lost });
await lostTools.kanban_create_card.execute({ list: 'IDEAS', name: 'Se pierde' }, { sessionID: 's' });
const lostFile = (await import('node:fs')).readdirSync(process.env.KANBAN_DATA_DIR).find((name) => name.startsWith('board.local.proyecto-perdido'));
(await import('node:fs')).rmSync(join(process.env.KANBAN_DATA_DIR, lostFile));
await assert.rejects(
  () => lostTools.kanban_board.execute({}, { sessionID: 's' }),
  /Restaurar la copia/,
  'a lost board is refused with the way back',
);

// --- Planka: the same tools, over the HTTP client the panel uses.
const plankaProject = join(dir, 'proyecto-planka');
mkdirSync(plankaProject, { recursive: true });
writeFileSync(
  join(process.env.KANBAN_DATA_DIR, 'config.json'),
  JSON.stringify({ source: 'planka', baseUrl: 'http://planka.test', token: 't' }),
);
writeFileSync(
  process.env.KANBAN_BOARD_PROJECTS_PATH,
  JSON.stringify({
    version: 1,
    boards: { b1: { projectId: 'p1', directory: plankaProject } },
    projects: { [plankaProject]: { boardId: 'b1' } },
  }),
);

const calls = [];
globalThis.fetch = async (url, init) => {
  calls.push(`${init?.method || 'GET'} ${url}`);
  return {
    status: 200,
    ok: true,
    async text() {
      return JSON.stringify({ included: { boards: [{ id: 'b1', name: 'Del agente', projectId: 'p1' }] } });
    },
  };
};

const plankaTools = await register({ location: plankaProject });
const boards = JSON.parse((await plankaTools.kanban_boards.execute({}, { sessionID: 'ses_planka' })).content);
assert.equal(boards.length, 1);
assert.equal(boards[0].name, 'Del agente');
assert.deepEqual(calls, ['GET http://planka.test/api/projects']);

// A project with no pinned board refuses instead of writing somewhere else.
const unpinned = join(dir, 'proyecto-sin-tablero');
mkdirSync(unpinned, { recursive: true });
const unpinnedTools = await register({ location: unpinned });
await assert.rejects(
  () => unpinnedTools.kanban_board.execute({}, { sessionID: 's' }),
  /no tiene tablero de Kanban fijado/,
);

console.log(`agent plugin: ${assertions} assertions OK`);
