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
const SHORTCUTS = ['shift', 'ctrl', 'alt', 'none'];
const cleanStyle = (value) => (STYLES.includes(value) ? value : 'neumorphism');
const cleanShortcut = (value) => (SHORTCUTS.includes(value) ? value : 'shift');

const empty = () => ({ version: 1, style: 'neumorphism', shortcut: 'shift', columns: ['', '', ''], card: '' });

export const readAppearance = () => {
  try {
    const parsed = JSON.parse(readFileSync(FILE, 'utf8'));
    if (!parsed || typeof parsed !== 'object') return empty();
    const columns = Array.isArray(parsed.columns) ? parsed.columns.slice(0, 3).map(clean) : [];
    while (columns.length < 3) columns.push('');
    return { version: 1, style: cleanStyle(parsed.style), shortcut: cleanShortcut(parsed.shortcut), columns, card: clean(parsed.card) };
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

export const setAppearance = (input = {}) => {
  const current = readAppearance();
  const columns = Array.isArray(input.columns) ? input.columns.slice(0, 3).map(clean) : current.columns;
  while (columns.length < 3) columns.push('');
  const next = {
    version: 1,
    style: input.style === undefined ? current.style : cleanStyle(input.style),
    shortcut: input.shortcut === undefined ? current.shortcut : cleanShortcut(input.shortcut),
    columns,
    card: input.card === undefined ? current.card : clean(input.card),
  };
  writeAppearance(next);
  return next;
};
