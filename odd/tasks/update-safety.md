# Update safety: no stale agent path, no lost boards, no silent empty board

Branch: `fix/update-safety` · Delivery: ask-on-risk · Test runner: `node scripts/test-*.mjs` (`npm test`)

## Specs

S1. After an update the agent must not point at an old copy. Exact words: "las
siguientes actualizaciones no hagan eso mismo [...] No apunten a rutas viejas."
An existing `kanban` server entry in OpenCode's config whose command names an
`mcp/main.js` outside the installed package is rewritten to the installed
`mcp/main.js`. The rest of the file is kept byte for byte, comments included,
and the original is backed up first. No other server is touched.

S2. Updates must not destroy what was there. Exact words: "Después las
actualizaciones no destruyan lo anterior." Every board write keeps the previous
version of that board recoverable in `~/.kanban`.

S3. A board must never come back empty without saying so. Exact words: "Y no
devuelvan tableros vacíos después." When a board file is missing but a previous
copy exists, the panel offers to restore it and the agent reports the missing
board instead of operating on a fresh empty one.

S4. Nothing to reconfigure. Exact words: "Obviamente no hay que reconfigurar
nada." The repair happens without the user editing a file or pressing a button
for the state files that already exist.

S5. The documentation must say what happens, honestly. Exact words: "Hay que
intentar hacerlo más cómodo y sencillo para el cliente."

S6. The agent path must stop depending on a hand-written file. The structural
fix is `contributes.opencodePlugin` (OpenChamber writes the path it installs,
in the config it manages). Tracked here, shipped separately because it changes
what the user approves at install.

## Tasks

T1. Rewrite a stale `kanban` entry to the installed `mcp/main.js`, with a backup
    and JSONC preserved — S1, S4 — inline — done
T2. Keep the previous board version and offer a restore instead of an empty
    board — S2, S3 — inline — done
T3. README (EN + ES): what an update keeps, what it cannot keep, and the manual
    fallback — S5 — inline — done
T4. Agent as an OpenCode plugin so OpenChamber owns the path — S6, S1 — inline —
    pending

## Evidence

T1: `src/shared/agent-config.js` (`healAgentEntry`), wired at service start and
on `GET /agent`, reported in Settings → Advanced. `scripts/test-updates.mjs`
covers: JSONC with comments and trailing commas, byte-for-byte preservation, the
one backup, a foreign server untouched, an already-correct path, a missing file
not created, an ambiguous path left alone, a broken file reported.
T2: `src/shared/local.js` (`writeStore` keeps `.prev`, `boardRecovery`,
`restoreBoard`), `POST /local/restore`, the panel notice above the columns, and
the MCP refusing a missing board with the restore instruction. Tests cover new
vs lost, restore, no overwrite of a live board, per-project files, and the MCP
probe over stdio.
T3: README.md and README.es.md, "Updating" and "The board the agent uses".
Checks: `npm test` 159 + 40 + 13 assertions, `npm run check` clean.

## Log

L1 (user, verbatim):
"No, a mi amigo, no pasa nada. Lo que sí quiero es que, obviamente, las
siguientes actualizaciones no hagan eso mismo, ¿vale? No apunten a rutas viejas.
Después las actualizaciones no destruyan lo anterior. Y no devuelvan tableros
vacíos después en el Redmi. Eh. Obviamente no hay que reconfigurar nada. Hay que
intentar hacerlo más cómodo y sencillo para el cliente. Y amigo, en mi caso."

L2 Evidence (verified in the repo and on this machine):
- v1.9.1 (`ee57ee5`) moved `config.json` and `board.local*.json` to `~/.kanban`.
  Before it, an OpenChamber git update renamed and deleted the package folder, so
  those files died with it. Issue #6, closed 2026-11-17.
- `~/.config/opencode/opencode.json` carries `mcp.kanban.command` with an
  absolute path. A copy from 2026-11-14 pointed at
  `/home/ubuntu/openchamber-extensions/kanban/mcp/main.js`, a folder that still
  exists with an older build. Nothing rewrites that path on update.
- `src/shared/local.js#readStore` returns `emptyStore()` for a missing file, so a
  lost board renders as a new empty board with no warning.
- `@openchamber/sdk@2.7.0` declares `contributes.opencodePlugin`: OpenChamber
  lists the plugin folder in the OpenCode config it manages and OpenCode reloads
  it in seconds. No `contributes.mcp` exists.

L3 (implementation, 2026-11-17): T1, T2 and T3 landed on `fix/update-safety`.
The agent repair runs once per service start, before any panel read. The board
copy is written after every successful save, so the copy always matches the last
good state. Neither path deletes anything: the config keeps a `.kanban-backup`
and boards keep `.prev`.
