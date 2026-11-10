// Board -> OpenChamber project mapping. Kept outside the package so writes do
// not reload the extension. One mapping per Planka board.
import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DIR = join(homedir(), '.kanban');
const FILE = join(DIR, 'board-projects.json');

const empty = () => ({ version: 1, boards: {} });

export const readBoardProjects = () => {
  try {
    const parsed = JSON.parse(readFileSync(FILE, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || typeof parsed.boards !== 'object' || !parsed.boards) return empty();
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

export const listBoardProjects = () => readBoardProjects().boards;
