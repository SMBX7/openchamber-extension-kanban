// Persistent settings for the Kanban extension. The token lives beside the
// package (config.json, mode 600); the password never touches disk.
import { chmodSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const ROOT = resolve(__dirname, '..');
export const CONFIG_PATH = join(ROOT, 'config.json');
export const DEFAULT_BASE_URL = 'http://127.0.0.1:3040';

const EMPTY = {
  baseUrl: DEFAULT_BASE_URL,
  email: '',
  token: '',
  boardId: '',
  boardName: '',
};

const normalise = (value) => {
  const baseUrl = String(value?.baseUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, '') || DEFAULT_BASE_URL;
  return {
    baseUrl,
    email: typeof value?.email === 'string' ? value.email : '',
    token: typeof value?.token === 'string' ? value.token : '',
    boardId: typeof value?.boardId === 'string' ? value.boardId : '',
    boardName: typeof value?.boardName === 'string' ? value.boardName : '',
  };
};

export const readConfig = () => {
  try {
    const parsed = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    return normalise(parsed);
  } catch {
    return { ...EMPTY };
  }
};

export const isConnected = (config = readConfig()) => Boolean(config.token);

export const saveConfig = (patch) => {
  const next = normalise({ ...readConfig(), ...patch });
  const previous = readConfig();
  if (JSON.stringify(previous) === JSON.stringify(next)) return next;

  const temp = join(ROOT, '.config.json.tmp');
  writeFileSync(temp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  renameSync(temp, CONFIG_PATH);
  try {
    chmodSync(CONFIG_PATH, 0o600);
  } catch {
    // The rename already applied the mode on the platforms we support.
  }
  return next;
};

export const clearConfig = () => {
  const next = { ...EMPTY, baseUrl: readConfig().baseUrl };
  const temp = join(ROOT, '.config.json.tmp');
  writeFileSync(temp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  renameSync(temp, CONFIG_PATH);
  try {
    chmodSync(CONFIG_PATH, 0o600);
  } catch {
    // Best effort.
  }
  return next;
};
