// Links a Planka card to the OpenChamber session working on it. Kept outside
// the package so writes never reload the extension; the service and the MCP
// server share the same file.
import { chmodSync, closeSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DIR = join(homedir(), '.kanban');
const FILE = join(DIR, 'links.json');

const empty = () => ({ version: 1, links: {} });

export const readLinks = () => {
  try {
    const parsed = JSON.parse(readFileSync(FILE, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || typeof parsed.links !== 'object' || !parsed.links) return empty();
    return parsed;
  } catch {
    return empty();
  }
};

// The service and the MCP server mutate the same file from different processes.
// A read-modify-write without a lock can drop one card's link when two links are
// saved at once, which is exactly the missing green dot for the second card.
const withLock = (work) => {
  mkdirSync(DIR, { recursive: true, mode: 0o700 });
  const lock = `${FILE}.lock`;
  const deadline = Date.now() + 2500;
  let handle = null;
  while (handle === null) {
    try {
      handle = openSync(lock, 'wx');
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        if (Date.now() - statSync(lock).mtimeMs > 5000) {
          unlinkSync(lock);
          continue;
        }
      } catch {
        // The lock vanished between the failed open and the stat.
      }
      if (Date.now() > deadline) throw new Error('No se pudo bloquear el archivo de enlaces.');
    }
  }
  try {
    return work();
  } finally {
    try {
      closeSync(handle);
    } catch {
      // Already closed.
    }
    try {
      unlinkSync(lock);
    } catch {
      // Someone else cleaned a stale lock.
    }
  }
};

const writeLinks = (data) => {
  mkdirSync(DIR, { recursive: true, mode: 0o700 });
  const temp = join(DIR, `.links-${process.pid}.tmp`);
  writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  renameSync(temp, FILE);
  try {
    chmodSync(FILE, 0o600);
  } catch {
    // Best effort.
  }
};

export const getLink = (cardId) => readLinks().links[String(cardId)] || null;

export const setLink = (cardId, sessionId, meta = {}) => {
  const id = String(cardId || '');
  const session = String(sessionId || '').trim();
  if (!id || !session) throw new Error('La tarjeta y la sesión son obligatorias.');
  return withLock(() => {
    const data = readLinks();
    data.links[id] = {
      sessionId: session,
      boardId: String(meta.boardId || ''),
      title: String(meta.title || '').slice(0, 200),
      sessionTitle: String(meta.sessionTitle || meta.title || session).slice(0, 120),
      linkedAt: new Date().toISOString(),
    };
    writeLinks(data);
    return data.links[id];
  });
};

export const markClosePending = (cardId) => {
  const id = String(cardId || '');
  return withLock(() => {
    const data = readLinks();
    if (!data.links[id]) return false;
    data.links[id].closePending = true;
    data.links[id].closePendingAt = new Date().toISOString();
    writeLinks(data);
    return true;
  });
};

export const clearClosePending = (cardId) => {
  const id = String(cardId || '');
  return withLock(() => {
    const data = readLinks();
    if (!data.links[id]?.closePending) return false;
    delete data.links[id].closePending;
    delete data.links[id].closePendingAt;
    writeLinks(data);
    return true;
  });
};

export const linksForSession = (sessionId) => {
  const session = String(sessionId || '');
  return Object.entries(readLinks().links).filter(([, link]) => link.sessionId === session);
};

export const pendingCloseForSession = (sessionId) => {
  const session = String(sessionId || '');
  const entry = Object.entries(readLinks().links).find(([, link]) => link.closePending && link.sessionId === session);
  return entry || null;
};

export const removeLink = (cardId) => {
  const id = String(cardId || '');
  return withLock(() => {
    const data = readLinks();
    if (!data.links[id]) return false;
    delete data.links[id];
    writeLinks(data);
    return true;
  });
};

export const listLinks = () => readLinks().links;
