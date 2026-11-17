// How the extension meets OpenCode, and what the panel can say about it.
//
// The agent's tools are an OpenCode plugin now: OpenChamber lists the package's
// plugin folder in the OpenCode config it owns, so there is no path for a
// person to write and none for an update to leave pointing at an old copy. What
// is left here is (a) the plugin's heartbeat, which is the only proof that the
// agent really loaded this version, and (b) a read-only look for an old `kanban`
// MCP entry, which does nothing now and is the user's to delete or keep.
import { existsSync, readFileSync, realpathSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { DATA_DIR, ROOT } from './config.js';

export const AGENT_SERVER_NAME = 'kanban';
const HEARTBEAT = join(DATA_DIR, 'agent.json');

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
// OpenCode accepts and what people leave in the file. Read only.
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

const commandPath = (server) => {
  const command = Array.isArray(server?.command) ? server.command : [server?.command];
  return command.find((item) => typeof item === 'string' && /[\\/]mcp[\\/]main\.js$/.test(item)) || '';
};

/**
 * An old `kanban` MCP server the person wrote into OpenCode's config by hand.
 * Nothing here changes the file: the plugin is the agent now, and this is only
 * so the panel can name it instead of leaving a dead entry unexplained.
 *
 * @returns {{ found: boolean, file: string, path: string } | null}
 */
export const legacyAgentEntry = ({ env = process.env, home = homedir(), files } = {}) => {
  const paths = files || agentConfigFiles(env, home);
  for (const file of paths) {
    let doc;
    try {
      doc = parseJsonc(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    } catch {
      continue;
    }
    const servers = kanbanServers(doc);
    if (!servers.length) continue;
    return { found: true, file, path: commandPath(servers[0]) };
  }
  return null;
};

export const agentVersion = () => {
  try {
    return String(JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version || '');
  } catch {
    return '';
  }
};

export const heartbeatPath = () => HEARTBEAT;

/**
 * Written by the plugin when it loads, so the panel can tell "the agent is
 * running this version" from "the agent never loaded". A tool call refreshes
 * it too, which keeps the date honest during a long session.
 *
 * @param {{ location?: string, event?: string }} info
 */
export const writeAgentHeartbeat = (info = {}) => {
  const value = {
    version: agentVersion(),
    at: new Date().toISOString(),
    location: String(info.location || ''),
    event: String(info.event || 'setup'),
  };
  try {
    const temp = `${HEARTBEAT}.${process.pid}.tmp`;
    writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
    renameSync(temp, HEARTBEAT);
  } catch {
    // A heartbeat is a courtesy to the panel; a tool call must work without it.
  }
  return value;
};

export const readAgentHeartbeat = () => {
  try {
    const value = JSON.parse(readFileSync(HEARTBEAT, 'utf8'));
    const at = typeof value?.at === 'string' ? value.at : '';
    return {
      version: typeof value?.version === 'string' ? value.version : '',
      at,
      location: typeof value?.location === 'string' ? value.location : '',
      event: typeof value?.event === 'string' ? value.event : '',
      savedAt: existsSync(HEARTBEAT) ? new Date(statSync(HEARTBEAT).mtimeMs).toISOString() : at,
    };
  } catch {
    return null;
  }
};

// The plugin folder as OpenChamber resolves it: a real directory inside the
// package, with an entry file OpenCode finds.
export const pluginFolder = () => {
  try {
    return realpathSync(join(ROOT, 'plugin'));
  } catch {
    return '';
  }
};
