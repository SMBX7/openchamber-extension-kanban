// Persistent settings for the Kanban extension. They live in ~/.kanban, beside
// the other files this extension keeps between runs, because an update
// replaces the installed package wholesale: anything written next to it
// (config.json included) is deleted, and the user would have to sign in again.
// The token lives there with mode 600; the password never touches disk.
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

// The installed package. The downloads fallback and the one-time adoption of
// the files older versions wrote beside it still need it.
export const ROOT = resolve(__dirname, '..');
// One folder for the files of this extension. The agent's MCP server is started
// by OpenCode, not by OpenChamber, so it never sees
// OPENCHAMBER_SERVICE_DATA_DIR: ~/.kanban is the one path the service and the
// MCP process both resolve. board-projects.json, appearance.json and
// links.json already live here.
export const DATA_DIR = process.env.KANBAN_DATA_DIR || join(homedir(), '.kanban');
export const CONFIG_PATH = process.env.KANBAN_CONFIG_PATH || join(DATA_DIR, 'config.json');
const LEGACY_CONFIG_PATH = join(ROOT, 'config.json');
export const DEFAULT_BASE_URL = 'http://127.0.0.1:3040';

const EMPTY = {
  source: 'planka',
  baseUrl: DEFAULT_BASE_URL,
  email: '',
  token: '',
  boardId: '',
  boardName: '',
};

const normalise = (value) => {
  const baseUrl = String(value?.baseUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, '') || DEFAULT_BASE_URL;
  return {
    source: value?.source === 'local' ? 'local' : 'planka',
    baseUrl,
    email: typeof value?.email === 'string' ? value.email : '',
    token: typeof value?.token === 'string' ? value.token : '',
    boardId: typeof value?.boardId === 'string' ? value.boardId : '',
    boardName: typeof value?.boardName === 'string' ? value.boardName : '',
  };
};

const persist = (value) => {
  const dir = dirname(CONFIG_PATH);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const temp = join(dir, `.${process.pid}.config.json.tmp`);
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  renameSync(temp, CONFIG_PATH);
  try {
    chmodSync(CONFIG_PATH, 0o600);
  } catch {
    // The rename already applied the mode on the platforms we support.
  }
};

// Before 1.9.1 the config sat beside the package. A git update deletes that
// folder before this code runs, so the adoption covers in-place installs (a dev
// folder, a rebuilt copy) and nothing else; the upgrade to 1.9.1 therefore
// still asks for the Planka login once. Either way the original is left alone,
// because two processes starting at once must not lose the token.
let adopted = false;
const adoptLegacyConfig = () => {
  if (adopted) return;
  adopted = true;
  if (existsSync(CONFIG_PATH) || !existsSync(LEGACY_CONFIG_PATH)) return;
  try {
    persist(normalise(JSON.parse(readFileSync(LEGACY_CONFIG_PATH, 'utf8'))));
  } catch {
    // A damaged legacy file is ignored; the panel asks to connect again.
  }
};

export const readConfig = () => {
  adoptLegacyConfig();
  try {
    const parsed = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    return normalise(parsed);
  } catch {
    return { ...EMPTY };
  }
};

export const isConnected = (config = readConfig()) => config.source === 'local' || Boolean(config.token);

export const saveConfig = (patch) => {
  const previous = readConfig();
  const next = normalise({ ...previous, ...patch });
  if (JSON.stringify(previous) === JSON.stringify(next)) return next;
  persist(next);
  return next;
};

export const clearConfig = () => {
  const next = { ...EMPTY, baseUrl: readConfig().baseUrl };
  persist(next);
  return next;
};
