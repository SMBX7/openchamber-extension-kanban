// Agent <-> OpenCode wiring.
//
// The extension's agent tools are an MCP server that OpenCode starts from a
// path written into OpenCode's own config. The manifest cannot declare it, so
// that entry is made by hand and an update can leave it naming the folder it
// replaced: a dev checkout, the previous install. The agent then runs old code
// while the panel runs new code.
//
// This module puts the installed path back. It is the user's file, it carries
// comments and other servers, so: only an entry already named `kanban` whose
// command already names an `mcp/main.js` is touched, only the path string is
// replaced, the rest of the bytes stay as they were, and the original is copied
// aside once before the first write.
import { copyFileSync, existsSync, readFileSync, realpathSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { ROOT } from './config.js';

export const AGENT_SERVER_NAME = 'kanban';
const BACKUP_SUFFIX = '.kanban-backup';
const MCP_MAIN = /[\\/]mcp[\\/]main\.js$/;

// The file the installed package ships. Nothing else is a valid target.
export const installedAgentPath = () => join(ROOT, 'mcp', 'main.js');

const normalPath = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  try {
    return realpathSync(text);
  } catch {
    return resolve(text).replace(/[\\/]+$/, '');
  }
};

// Where OpenCode reads its config. An explicit OPENCODE_CONFIG is added on top
// of the default file, it does not replace it, so both are read. Never created
// here.
export const agentConfigFiles = (env = process.env, home = homedir()) => {
  const configHome = env.XDG_CONFIG_HOME || join(home, '.config');
  const files = [
    env.OPENCODE_CONFIG,
    join(configHome, 'opencode', 'opencode.jsonc'),
    join(configHome, 'opencode', 'opencode.json'),
  ];
  const seen = new Set();
  return files.filter((file) => {
    if (!file) return false;
    const key = resolve(file);
    if (seen.has(key)) return false;
    seen.add(key);
    return existsSync(file);
  });
};

// JSONC: JSON plus `//` and `/* */` comments and trailing commas, which is what
// OpenCode accepts and what people leave in the file. Read only; the write is a
// string replacement so the original bytes survive.
export const parseJsonc = (text) => {
  let i = 0;
  const fail = () => {
    throw new Error('jsonc');
  };
  const skip = () => {
    for (;;) {
      const c = text[i];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
        i += 1;
        continue;
      }
      if (c === '/' && text[i + 1] === '/') {
        i += 2;
        while (i < text.length && text[i] !== '\n') i += 1;
        continue;
      }
      if (c === '/' && text[i + 1] === '*') {
        i += 2;
        while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i += 1;
        i += 2;
        continue;
      }
      return;
    }
  };
  const readString = () => {
    const start = i;
    i += 1;
    while (i < text.length) {
      const c = text[i];
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === '"') {
        i += 1;
        return JSON.parse(text.slice(start, i));
      }
      i += 1;
    }
    return fail();
  };
  const readValue = () => {
    skip();
    const c = text[i];
    if (c === '{') {
      i += 1;
      const out = {};
      for (;;) {
        skip();
        if (text[i] === '}') {
          i += 1;
          return out;
        }
        if (text[i] !== '"') return fail();
        const key = readString();
        skip();
        if (text[i] !== ':') return fail();
        i += 1;
        out[key] = readValue();
        skip();
        if (text[i] === ',') {
          i += 1;
          continue;
        }
        if (text[i] === '}') {
          i += 1;
          return out;
        }
        return fail();
      }
    }
    if (c === '[') {
      i += 1;
      const out = [];
      for (;;) {
        skip();
        if (text[i] === ']') {
          i += 1;
          return out;
        }
        out.push(readValue());
        skip();
        if (text[i] === ',') {
          i += 1;
          continue;
        }
        if (text[i] === ']') {
          i += 1;
          return out;
        }
        return fail();
      }
    }
    if (c === '"') return readString();
    const start = i;
    while (i < text.length && !',}] \t\n\r'.includes(text[i])) i += 1;
    const raw = text.slice(start, i);
    if (!raw) return fail();
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (raw === 'null') return null;
    const number = Number(raw);
    if (!Number.isFinite(number)) return fail();
    return number;
  };
  const value = readValue();
  skip();
  if (i < text.length) fail();
  return value;
};

// OpenCode has taken both `mcp.<name>` and `mcp.servers.<name>` over time.
const kanbanServers = (doc) => {
  const out = [];
  for (const container of [doc?.mcp, doc?.mcp?.servers]) {
    if (!container || typeof container !== 'object') continue;
    const server = container[AGENT_SERVER_NAME];
    if (server && typeof server === 'object') out.push(server);
  }
  return out;
};

// The `mcp/main.js` a server's command names, when it is not the installed one.
const stalePathOf = (server, installed) => {
  const command = Array.isArray(server?.command) ? server.command : [server?.command];
  for (const item of command) {
    if (typeof item !== 'string' || !MCP_MAIN.test(item)) continue;
    if (normalPath(item) === normalPath(installed)) return '';
    return item;
  }
  return '';
};

const replacePaths = (file, oldPath, newPath, expected) => {
  const text = readFileSync(file, 'utf8');
  const token = JSON.stringify(oldPath);
  const occurrences = text.split(token).length - 1;
  // Every occurrence must belong to a `kanban` entry. One more means the same
  // path also lives in a server that is not ours, and guessing is worse than
  // leaving the file alone.
  if (occurrences === 0) return { changed: false, reason: 'absent' };
  if (occurrences !== expected) return { changed: false, reason: 'ambiguous' };
  const backup = `${file}${BACKUP_SUFFIX}`;
  if (!existsSync(backup)) copyFileSync(file, backup);
  const next = text.split(token).join(JSON.stringify(newPath));
  const temp = `${file}.${process.pid}.agent.tmp`;
  writeFileSync(temp, next, { mode: statSync(file).mode });
  renameSync(temp, file);
  return { changed: true, backup };
};

/**
 * Put the installed `mcp/main.js` back into any `kanban` entry that names
 * another copy. Never adds an entry, never creates a file, never rewrites a
 * config without a `kanban` entry in it.
 *
 * @returns {{ state: 'absent'|'ok'|'fixed'|'stale'|'ambiguous'|'unreadable',
 *   installed: string, files: string[], entries: Array<object> }}
 */
export const healAgentEntry = ({ env = process.env, home = homedir(), files } = {}) => {
  const installed = installedAgentPath();
  const installedReady = existsSync(installed);
  const paths = files || agentConfigFiles(env, home);
  const entries = [];
  let state = 'absent';

  for (const file of paths) {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    let doc;
    try {
      // A byte-order mark is not a comment: OpenCode tolerates one, and so do we.
      doc = parseJsonc(text.replace(/^\uFEFF/, ''));
    } catch {
      entries.push({ file, state: 'unreadable' });
      if (state === 'absent' || state === 'ok') state = 'unreadable';
      continue;
    }
    const servers = kanbanServers(doc);
    if (!servers.length) continue;
    const stalePaths = [...new Set(servers.map((server) => stalePathOf(server, installed)).filter(Boolean))];
    if (!stalePaths.length) {
      if (state === 'absent') state = 'ok';
      entries.push({ file, state: 'ok', path: installed });
      continue;
    }
    if (!installedReady) {
      if (state !== 'fixed') state = 'stale';
      entries.push({ file, state: 'stale', from: stalePaths[0], to: installed });
      continue;
    }
    let fixed = false;
    let blocked = '';
    let backup = '';
    for (const stale of stalePaths) {
      // How many `kanban` entries name this path: the only occurrences the
      // rewrite is allowed to find.
      const expected = servers.filter((server) => stalePathOf(server, installed) === stale).length;
      const result = replacePaths(file, stale, installed, expected);
      if (result.changed) {
        fixed = true;
        backup = result.backup || backup;
        continue;
      }
      if (!blocked) blocked = result.reason === 'ambiguous' ? stale : '';
    }
    if (fixed) {
      state = 'fixed';
      entries.push({ file, state: 'fixed', from: stalePaths[0], to: installed, backup });
      continue;
    }
    if (blocked) {
      if (state !== 'fixed') state = 'ambiguous';
      entries.push({ file, state: 'ambiguous', from: blocked, to: installed });
      continue;
    }
    if (state === 'absent') state = 'ok';
    entries.push({ file, state: 'ok', path: installed });
  }

  return { state, installed, files: paths, entries };
};
