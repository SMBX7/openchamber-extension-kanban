// Update safety: the boards must survive an update, and an old hand-written MCP
// entry must be visible without being touched.
import { build } from 'esbuild';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
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

const root = mkdtempSync(join(tmpdir(), 'kanban-updates-'));
const pkg = join(root, 'pkg');
mkdirSync(join(pkg, 'shared'), { recursive: true });
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
const { legacyAgentEntry, parseJsonc, agentConfigFiles } = require(bundle);

const write = (name, text) => {
  const file = join(root, name);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, text);
  return file;
};
const read = (file) => readFileSync(file, 'utf8');

// --- JSONC is what OpenCode accepts, and what people leave in the file.
assert.deepEqual(parseJsonc('{ "a": 1, /* c */ "b": [1, 2,], }'), { a: 1, b: [1, 2] });
assert.deepEqual(parseJsonc('// x\n{"u":"http://a//b"}'), { u: 'http://a//b' });

// --- An old hand-written kanban MCP entry is reported, never rewritten.
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
const legacy = legacyAgentEntry({ files: [config] });
assert.equal(legacy.found, true);
assert.equal(legacy.path, stale);
assert.equal(read(config), original, 'the file is the user\'s: nothing is rewritten');

// --- The newer mcp.servers.kanban container is read the same way.
const serversShape = write(
  'servers/opencode.json',
  `{"mcp":{"servers":{"kanban":{"command":["node","${stale}"]}}}}`,
);
assert.equal(legacyAgentEntry({ files: [serversShape] }).path, stale);

// --- A kanban entry with no mcp path is still reported, with an empty path.
const remote = write('remote/opencode.json', '{"mcp":{"kanban":{"type":"remote","url":"http://x"}}}');
assert.deepEqual(legacyAgentEntry({ files: [remote] }), { found: true, file: remote, path: '' });

// --- Servers that are not ours are ignored, and a file without one is nothing.
const foreign = write('foreign/opencode.json', '{"mcp":{"jira":{"command":["node","/x/mcp/main.js"]}}}');
assert.equal(legacyAgentEntry({ files: [foreign] }), null);
assert.equal(legacyAgentEntry({ files: [join(root, 'missing', 'opencode.json')] }), null);
assert.equal(legacyAgentEntry({ files: [write('broken/opencode.json', '{ "mcp": ')] }), null);

// --- A byte-order mark is tolerated.
const bom = write('bom/opencode.json', `\uFEFF{"mcp":{"kanban":{"command":["node","${stale}"]}}}`);
assert.equal(legacyAgentEntry({ files: [bom] }).path, stale);

// --- Discovery reads the user's OpenCode config, jsonc first.
const home = join(root, 'home');
mkdirSync(join(home, '.config', 'opencode'), { recursive: true });
writeFileSync(join(home, '.config', 'opencode', 'opencode.jsonc'), '{}');
writeFileSync(join(home, '.config', 'opencode', 'opencode.json'), '{}');
assert.deepEqual(agentConfigFiles({ XDG_CONFIG_HOME: '' }, home), [
  join(home, '.config', 'opencode', 'opencode.jsonc'),
  join(home, '.config', 'opencode', 'opencode.json'),
]);
// OPENCODE_CONFIG is added on top of the default file, not instead of it.
assert.deepEqual(agentConfigFiles({ OPENCODE_CONFIG: config }, home), [
  config,
  join(home, '.config', 'opencode', 'opencode.jsonc'),
  join(home, '.config', 'opencode', 'opencode.json'),
]);
const noConfig = join(root, 'probe', 'nocfg', 'opencode.json');
assert.ok(!agentConfigFiles({ OPENCODE_CONFIG: noConfig }, join(root, 'nada')).includes(noConfig));
assert.equal(legacyAgentEntry({ env: { OPENCODE_CONFIG: noConfig }, home: join(root, 'nada') }), null);
assert.ok(!existsSync(noConfig), 'a config that is not there is never created');

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
const saved = read(boardFile);
assert.ok(existsSync(`${boardFile}.prev`), 'every save leaves a copy beside the board');

rmSync(boardFile);
const lost = boardRecovery(project);
assert.equal(lost.state, 'missing');
assert.equal(lost.canRestore, true);
assert.ok(lost.savedAt.length > 0, 'the panel can say when the copy was saved');

assert.equal(restoreBoard(project).state, 'ok');
assert.equal(read(boardFile), saved, 'the copy comes back with its cards');
assert.ok(read(boardFile).includes('Sobrevive a la actualización'));

// A board that exists is never replaced by an older copy behind the user's back.
const kept = read(boardFile);
writeFileSync(`${boardFile}.prev`, '{"version":1,"lists":[],"cards":[]}\n');
assert.equal(restoreBoard(project).state, 'ok');
assert.equal(read(boardFile), kept);

// --- A damaged board is reported, and its good copy survives the next write.
const damagedProject = join(root, 'proyecto-danado');
const damagedClient = new LocalClient({ projectKey: damagedProject });
await damagedClient.createCard((await damagedClient.readBoard()).lists[0].id, 'La buena');
const damagedFile = localBoardPath(damagedProject);
writeFileSync(damagedFile, '{"corrupt": ');
const damaged = boardRecovery(damagedProject);
assert.equal(damaged.state, 'corrupt');
assert.equal(damaged.canRestore, true);
assert.ok(damaged.savedAt.length > 0, 'the panel can date the copy');

await damagedClient.createCard((await damagedClient.readBoard()).lists[0].id, 'Otra');
const keptAfterDamage = read(`${damagedFile}.prev`);
assert.ok(keptAfterDamage.includes('La buena'), 'the good copy is not overwritten by a write over a damaged board');
assert.ok(!keptAfterDamage.includes('Otra'));

writeFileSync(damagedFile, '{"corrupt": ');
assert.equal(restoreBoard(damagedProject).state, 'ok');
assert.ok(read(damagedFile).includes('La buena'));

// --- A broken copy is never copied over the board.
const brokenCopy = join(root, 'proyecto-copia-rota');
writeFileSync(localBoardPath(brokenCopy), '{"corrupt": ');
writeFileSync(`${localBoardPath(brokenCopy)}.prev`, 'not json at all');
const brokenState = boardRecovery(brokenCopy);
assert.equal(brokenState.state, 'corrupt');
assert.equal(brokenState.canRestore, false, 'a copy that cannot be read offers no button');
assert.equal(restoreBoard(brokenCopy).state, 'corrupt');
assert.equal(read(localBoardPath(brokenCopy)), '{"corrupt": ');

// Each project keeps its own file and its own copy.
const otherProject = join(root, 'proyecto-b');
assert.equal(boardRecovery(otherProject).state, 'new');
assert.notEqual(localBoardPath(otherProject), boardFile);

console.log(`update safety: ${assertions} assertions OK`);
