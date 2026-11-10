// Appearance overrides for the Kanban board. Colors are optional: an empty
// value means "use the host theme token". Kept outside the package so writes
// never reload the extension; the service owns the file.
import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DIR = join(homedir(), '.kanban');
const FILE = join(DIR, 'appearance.json');

const HEX = /^#[0-9a-f]{6}$/i;

const clean = (value) => {
  const text = String(value || '').trim();
  return HEX.test(text) ? text.toLowerCase() : '';
};

const STYLES = ['neumorphism', 'brutalism', 'glass'];
const cleanStyle = (value) => (STYLES.includes(value) ? value : 'neumorphism');

const DEFAULT_KEYS = {
  ideas: 'Shift+Digit1',
  work: 'Shift+Digit2',
  done: 'Shift+Digit3',
  up: 'Shift+ArrowUp',
  down: 'Shift+ArrowDown',
};
const KEY_ACTIONS = Object.keys(DEFAULT_KEYS);
const COMBO = /^([A-Za-z]+\+)*(Digit\d|Key[A-Z]|Numpad\d|Arrow(Up|Down|Left|Right)|F\d{1,2})$/;

const cleanKeys = (value) => {
  const next = { ...DEFAULT_KEYS };
  if (value && typeof value === 'object') {
    for (const action of KEY_ACTIONS) {
      const combo = String(value[action] || '');
      if (COMBO.test(combo)) next[action] = combo;
    }
  }
  return next;
};

const empty = () => ({ version: 1, style: 'neumorphism', keys: { ...DEFAULT_KEYS }, columns: ['', '', ''], card: '' });

export const readAppearance = () => {
  try {
    const parsed = JSON.parse(readFileSync(FILE, 'utf8'));
    if (!parsed || typeof parsed !== 'object') return empty();
    const columns = Array.isArray(parsed.columns) ? parsed.columns.slice(0, 3).map(clean) : [];
    while (columns.length < 3) columns.push('');
    return { version: 1, style: cleanStyle(parsed.style), keys: cleanKeys(parsed.keys), columns, card: clean(parsed.card) };
  } catch {
    return empty();
  }
};

const writeAppearance = (data) => {
  mkdirSync(DIR, { recursive: true, mode: 0o700 });
  const temp = join(DIR, `.appearance-${process.pid}.tmp`);
  writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  renameSync(temp, FILE);
  try {
    chmodSync(FILE, 0o600);
  } catch {
    // Best effort.
  }
};

export const DEFAULT_SHORTCUTS = DEFAULT_KEYS;

export const setAppearance = (input = {}) => {
  const current = readAppearance();
  const columns = Array.isArray(input.columns) ? input.columns.slice(0, 3).map(clean) : current.columns;
  while (columns.length < 3) columns.push('');
  const next = {
    version: 1,
    style: input.style === undefined ? current.style : cleanStyle(input.style),
    keys: input.keys === undefined ? current.keys : cleanKeys(input.keys),
    columns,
    card: input.card === undefined ? current.card : clean(input.card),
  };
  writeAppearance(next);
  return next;
};
