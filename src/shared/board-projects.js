// Board <-> OpenChamber project mapping. Kept outside the package so writes do
// not reload the extension. One mapping per Planka board, plus the board each
// project pins for its agent sessions.
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const DIR = join(homedir(), '.kanban');
const FILE = process.env.KANBAN_BOARD_PROJECTS_PATH || join(DIR, 'board-projects.json');

const empty = () => ({ version: 1, boards: {}, projects: {} });

const normalize = (value) => String(value || '').trim().replace(/\/+$/, '');

const ancestors = (directory) => {
  const dir = normalize(directory);
  const list = [];
  let current = dir;
  while (current) {
    list.push(current);
    const parent = dirname(current);
    if (parent === current) break;
    current = normalize(parent);
  }
  return list;
};

const repoCache = new Map();
// A worktree and its main checkout share this key, so a session opened in a
// worktree inherits the board pinned for the project.
const repoKey = (directory) => {
  const dir = normalize(directory);
  if (!dir) return '';
  if (repoCache.has(dir)) return repoCache.get(dir);
  let key = dir;
  try {
    const common = execFileSync(
      'git',
      ['-C', dir, 'rev-parse', '--path-format=absolute', '--git-common-dir'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 },
    ).trim();
    if (common) key = normalize(common.replace(/[\\/]\.git$/, ''));
  } catch {
    // Not a git checkout: the directory itself is the key.
  }
  repoCache.set(dir, key);
  return key;
};

export const readBoardProjects = () => {
  try {
    const parsed = JSON.parse(readFileSync(FILE, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || typeof parsed.boards !== 'object' || !parsed.boards) return empty();
    if (!parsed.projects || typeof parsed.projects !== 'object') parsed.projects = {};
    return parsed;
  } catch {
    return empty();
  }
};

const write = (data) => {
  mkdirSync(DIR, { recursive: true, mode: 0o700 });
  const temp = join(DIR, `.board-projects-${process.pid}.tmp`);
  writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  renameSync(temp, FILE);
  try {
    chmodSync(FILE, 0o600);
  } catch {
    // Best effort.
  }
};

export const getBoardProject = (boardId) => {
  const id = String(boardId || '');
  if (!id) return null;
  const project = readBoardProjects().boards[id];
  return project && project.projectId && project.directory ? project : null;
};

export const setBoardProject = (boardId, project) => {
  const id = String(boardId || '');
  if (!id) throw new Error('Falta el tablero.');
  const data = readBoardProjects();
  const projectId = String(project?.projectId || '').trim();
  const directory = String(project?.directory || '').trim();
  if (!projectId || !directory) {
    delete data.boards[id];
    write(data);
    return null;
  }
  const value = {
    projectId,
    directory,
    name: String(project?.name || projectId).slice(0, 120),
    autoSession: project?.autoSession === true,
    updatedAt: new Date().toISOString(),
  };
  data.boards[id] = value;
  write(data);
  return value;
};

// The board pinned for one project, by its exact directory.
export const getProjectBoard = (directory) => {
  const dir = normalize(directory);
  if (!dir) return '';
  const entry = readBoardProjects().projects[dir];
  return entry?.boardId ? String(entry.boardId) : '';
};

export const setProjectBoard = (directory, boardId) => {
  const dir = normalize(directory);
  if (!dir) throw new Error('Falta el proyecto.');
  const data = readBoardProjects();
  const value = String(boardId || '');
  if (!value) {
    delete data.projects[dir];
    write(data);
    return null;
  }
  data.projects[dir] = { boardId: value, updatedAt: new Date().toISOString() };
  write(data);
  return data.projects[dir];
};

// The board the agent must use for a session opened in this directory:
// 1. the board pinned for the project; a worktree or a subfolder inherits it;
// 2. when there is no pin, the only board mapped to that project;
// 3. otherwise nothing, so the agent never guesses another board.
export const resolveProjectBoard = (directory) => {
  const dir = normalize(directory);
  if (!dir) return '';
  const data = readBoardProjects();
  const pins = Object.entries(data.projects || {}).filter(([, entry]) => entry?.boardId);
  const candidates = new Set(ancestors(dir));

  for (const [pinned, entry] of pins) {
    if (candidates.has(normalize(pinned))) return String(entry.boardId);
  }

  const key = repoKey(dir);
  for (const [pinned, entry] of pins) {
    if (repoKey(pinned) === key) return String(entry.boardId);
  }

  const mapped = Object.entries(data.boards).filter(([, project]) => {
    if (!project?.directory) return false;
    return candidates.has(normalize(project.directory)) || repoKey(project.directory) === key;
  });
  return mapped.length === 1 ? String(mapped[0][0]) : '';
};

export const listBoardProjects = () => readBoardProjects().boards;
