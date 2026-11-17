// Update safety: the agent's MCP path and the boards must survive an update.
// Both modules are bundled to CJS because the sources are ESM without
// "type": "module", and the bundle's folder decides the package root they
// resolve, exactly as it does in the built extension.
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
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

const root = mkdtempSync(join(tmpdir(), 'kanban-updates-'));
const pkg = join(root, 'pkg');
mkdirSync(join(pkg, 'mcp'), { recursive: true });
mkdirSync(join(pkg, 'shared'), { recursive: true });
// The installed server the repair must point at.
const installed = join(pkg, 'mcp', 'main.js');
writeFileSync(installed, '// installed build\n');

const bundle = join(pkg, 'shared', 'agent-config.cjs');
await build({
  entryPoints: [new URL('../src/shared/agent-config.js', import.meta.url).pathname],
  bundle: true,
  outfile: bundle,
  platform: 'node',
  format: 'cjs',
  logLevel: 'silent',
});
const require = createRequire(import.meta.url);
const { healAgentEntry, parseJsonc, agentConfigFiles } = require(bundle);

const write = (name, text) => {
  const file = join(root, name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  return file;
};
const read = (file) => readFileSync(file, 'utf8');

// --- JSONC is what OpenCode accepts, and what people leave in the file.
assert.deepEqual(parseJsonc('{ "a": 1, /* c */ "b": [1, 2,], }'), { a: 1, b: [1, 2] });
assert.deepEqual(parseJsonc('// x\n{"u":"http://a//b"}'), { u: 'http://a//b' });

// --- A stale entry is rewritten to the installed path, the rest untouched.
const stale = '/home/someone/openchamber-extensions/kanban/mcp/main.js';
const original = `// OpenCode config, with comments
{
  // other servers stay as they are
  "mcp": {
    "other": { "type": "local", "command": ["node", "/opt/other/mcp/main.js"] },
    "kanban": {
      "type": "local",
      "command": ["/usr/bin/node", "${stale}"],
      "enabled": true,
    },
  },
}
`;
const config = write('.config/opencode/opencode.jsonc', original);
const first = healAgentEntry({ files: [config] });
assert.equal(first.state, 'fixed');
assert.equal(first.installed, installed);
assert.equal(first.restart, undefined);

const healed = read(config);
assert.equal(healed, original.replace(JSON.stringify(stale), JSON.stringify(installed)));
assert.ok(healed.startsWith('// OpenCode config, with comments'));
assert.ok(healed.includes('// other servers stay as they are'));
assert.ok(healed.includes('"/opt/other/mcp/main.js"'), 'a foreign server is not touched');
assert.equal(read(`${config}.kanban-backup`), original, 'the original is kept once');

// --- A second run finds it already right and writes nothing.
const second = healAgentEntry({ files: [config] });
assert.equal(second.state, 'ok');
assert.equal(read(config), healed);

// --- An entry that already names the installed file is left alone.
const good = write('good/opencode.json', `{"mcp":{"kanban":{"command":["node",${JSON.stringify(installed)}]}}}`);
const before = read(good);
assert.equal(healAgentEntry({ files: [good] }).state, 'ok');
assert.equal(read(good), before);
assert.ok(!existsSync(`${good}.kanban-backup`), 'no backup for a file that needs no change');

// --- No kanban entry: nothing is added, nothing is created.
const foreign = write('foreign/opencode.json', '{"mcp":{"jira":{"command":["node","/x/mcp/main.js"]}}}');
const foreignText = read(foreign);
assert.equal(healAgentEntry({ files: [foreign] }).state, 'absent');
assert.equal(read(foreign), foreignText);

// --- A config that is not there is not created.
const missing = join(root, 'missing', 'opencode.json');
assert.equal(healAgentEntry({ files: [missing] }).state, 'absent');
assert.ok(!existsSync(missing));

// --- The same path in two servers: stop instead of guessing which one.
const doubled = write(
  'doubled/opencode.json',
  `{"mcp":{"kanban":{"command":["node","${stale}"]},"old":{"command":["node","${stale}"]}}}`,
);
const doubledText = read(doubled);
assert.equal(healAgentEntry({ files: [doubled] }).state, 'ambiguous');
assert.equal(read(doubled), doubledText, 'an ambiguous file is left alone');

// --- A broken file is reported, not rewritten.
const broken = write('broken/opencode.json', '{ "mcp": ');
assert.equal(healAgentEntry({ files: [broken] }).state, 'unreadable');
assert.equal(read(broken), '{ "mcp": ');

// --- Discovery reads the user's OpenCode config, jsonc first.
const home = join(root, 'home');
mkdirSync(join(home, '.config', 'opencode'), { recursive: true });
writeFileSync(join(home, '.config', 'opencode', 'opencode.jsonc'), '{}');
const found = agentConfigFiles({ XDG_CONFIG_HOME: '' }, home);
assert.deepEqual(found, [join(home, '.config', 'opencode', 'opencode.jsonc')]);
assert.deepEqual(agentConfigFiles({ OPENCODE_CONFIG: config }, home), [config]);

// --- The board: a lost board is offered back, never replaced by a silent empty one.
const boardsDir = join(root, 'boards');
process.env.KANBAN_LOCAL_PATH = join(boardsDir, 'board.local.json');
const localBundle = join(pkg, 'shared', 'local.cjs');
await build({
  entryPoints: [new URL('../src/shared/local.js', import.meta.url).pathname],
  bundle: true,
  outfile: localBundle,
  platform: 'node',
  format: 'cjs',
  logLevel: 'silent',
});
const { LocalClient, localBoardPath, boardRecovery, restoreBoard } = require(localBundle);

const project = join(root, 'proyecto-a');
const freshClient = new LocalClient({ projectKey: project });
// A project nobody wrote to is new, not lost: an empty board is the truth here.
assert.equal(boardRecovery(project).state, 'new');
const freshBoard = await freshClient.readBoard();
await freshClient.createCard(freshBoard.lists[0].id, 'Sobrevive a la actualización');
assert.equal(boardRecovery(project).state, 'ok');

const boardFile = localBoardPath(project);
const saved = readFileSync(boardFile, 'utf8');
assert.ok(existsSync(`${boardFile}.prev`), 'every save leaves a copy beside the board');

rmSync(boardFile);
const lost = boardRecovery(project);
assert.equal(lost.state, 'missing');
assert.ok(lost.savedAt.length > 0, 'the panel can say when the copy was saved');

assert.equal(restoreBoard(project).state, 'ok');
assert.equal(readFileSync(boardFile, 'utf8'), saved, 'the copy comes back with its cards');
assert.ok(readFileSync(boardFile, 'utf8').includes('Sobrevive a la actualización'));

// A board that exists is never replaced by an older copy behind the user's back.
const kept = readFileSync(boardFile, 'utf8');
writeFileSync(`${boardFile}.prev`, '{"version":1,"lists":[],"cards":[]}\n');
assert.equal(restoreBoard(project).state, 'ok');
assert.equal(readFileSync(boardFile, 'utf8'), kept);

// Each project keeps its own file and its own copy.
const otherProject = join(root, 'proyecto-b');
assert.equal(boardRecovery(otherProject).state, 'new');
assert.notEqual(localBoardPath(otherProject), boardFile);

// --- The agent refuses to work on a lost board instead of filling an empty one.
const ghost = join(root, 'proyecto-perdido');
mkdirSync(ghost, { recursive: true });
const ghostClient = new LocalClient({ projectKey: ghost });
await ghostClient.createCard((await ghostClient.readBoard()).lists[0].id, 'No me pierdas');
rmSync(localBoardPath(ghost));
assert.equal(boardRecovery(ghost).state, 'missing');

const configFile = join(root, 'kanban-config.json');
writeFileSync(configFile, '{"source":"local"}\n');
const probe = spawnSync(process.execPath, [new URL('../mcp/main.js', import.meta.url).pathname], {
  cwd: ghost,
  encoding: 'utf8',
  env: { ...process.env, KANBAN_LOCAL_PATH: process.env.KANBAN_LOCAL_PATH, KANBAN_CONFIG_PATH: configFile },
  input: [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'probe', version: '1' } } },
    { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'kanban_board', arguments: {} } },
  ]
    .map((line) => JSON.stringify(line))
    .join('\n') + '\n',
});
assert.match(probe.stdout, /Restaurar la copia/, 'the agent says how to bring the board back');
assert.match(probe.stdout, /"isError":true/, 'the agent does not answer with an empty board');

console.log(`update safety: ${assertions} assertions OK`);