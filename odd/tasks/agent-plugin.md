# Agent as an OpenCode plugin, and the MCP removed

Branch: `feat/agent-plugin` · Delivery: ask-on-risk · Test runner: `node scripts/test-*.mjs`

## Specs

S1. The agent's tools come from the extension itself, not from an entry the
user writes. Exact words: "eliminamos el mcp". The package no longer ships an
MCP server: `src/mcp/main.js`, the build target and `mcp/main.js` are deleted,
and `contributes.opencodePlugin` names the plugin folder. OpenChamber lists that
folder in the OpenCode config it owns, so the path is always the installed one.

S2. Every update reaches the agent with no restart and no hand-editing. Exact
words: "las siguientes actualizaciones no hagan eso mismo [...] No apunten a
rutas viejas". OpenCode reloads the plugin from the folder; a new build is used
on the next tool call.

S3. The 11 tool names and their behavior stay the same: `kanban_board`,
`kanban_boards`, `kanban_search`, `kanban_create_card`, `kanban_update_card`,
`kanban_move_card`, `kanban_complete_card`, `kanban_delete_card`,
`kanban_checklist_add`, `kanban_checklist_check`, `kanban_link_session`. The
agent's instructions and the mention text keep working unchanged.

S4. The tools resolve the project of the session they run in, not the process
directory: `session.location.directory` from `ctx.session.get`.

S5. A lost or damaged local board still refuses with the restore instruction
(kept from `odd/tasks/update-safety.md` S3).

S6. The panel can say whether the agent is running this version: the plugin
writes a heartbeat in `~/.kanban`, and the panel reads it.

S7. An old `kanban` MCP entry the user created by hand can be removed from the
panel in one action, with a backup, and never automatically.

S8. Tested against a local board and against Planka before deleting the MCP.

## Contract (verified, not assumed)

Spike run on 2026-11-17 with OpenCode 2.3.0 in a throwaway project:

- `export default { id, setup }` in `plugin/index.js`, with no `Plugin.define`
  and no imports beyond Node builtins: the plugin loads and `opencode plugin
  list` shows `kanban-spike local <folder>`. `Plugin.define` is not required.
- `setup(ctx)` runs when the location activates, and `ctx.tool.transform` runs
  inside it (`setup ran in <dir>`, tool registration completed).
- Tool definition: `{ name, description, input: <JSON Schema>,
  options: { namespace, codemode: true }, execute(input, context) }`. The
  effective name is `<namespace>_<name>`, so namespace `kanban` + name
  `board` gives `kanban_board`.
- `context` carries `sessionID`, `agent`, `messageID`, `id`, `signal`,
  `progress`; it does not carry a directory. `ctx.session.get({ sessionID })`
  returns `location.directory`.
- `execute` answers `{ content }`; a thrown `Tool.Error` reaches the model.

## Tasks

T1. Extract the tool surface into `src/shared/agent-tools.js` (list + call,
    taking a directory), so the plugin is a thin adapter and the tools are
    testable without OpenCode — S3, S4 — inline — pending
T2. `src/plugin/main.js` + build target `plugin/index.js` + manifest
    `contributes.opencodePlugin` — S1, S2, S3, S4 — inline — pending
T3. Heartbeat for the panel and `GET /agent` reporting plugin state plus the old
    entry — S6, S7 — inline — pending
T4. Remove the MCP: `src/mcp/main.js`, the build target, `mcp/main.js`, and
    rewrite the stale-entry repair as detection + one-click removal — S1, S7 —
    inline — pending
T5. Tests: plugin registration and every tool against a temp local board, and
    against the Planka fake the suite already uses — S8 — inline — pending
T6. README (EN + ES): the agent connects itself, what an old entry means, no
    restart after an update — S2 — inline — pending

## Log

L1 (user, verbatim):
"si, planificatelo bien para hacerlo ordenado y no falle y pruebalo en local y
planca y eliminamos el mcp"

L2 Spike, 2026-11-17. A throwaway folder `/…/spike/plugin` with
`export default { id: 'kanban-spike', setup }`, configured through
`OPENCODE_CONFIG.plugins`, was listed by `opencode plugin list` as
`kanban-spike local /…/spike/plugin`, and `opencode run "say ok"` produced
`setup ran in /…/spike/work` plus a completed `ctx.tool.transform`. The model
call failed for billing on an unrelated account; activation and tool
registration are what the spike needed. The spike folder is removed.

L3 Implementation, 2026-11-17. T1-T4 landed:
- `src/shared/agent-tools.js` holds the 11 names, their JSON Schema and the
  dispatch, taking `{ directory, sessionId }` instead of a process directory.
- `src/plugin/main.js` is the adapter: one `ctx.tool.transform`, namespace
  `kanban`, names without the prefix, `codemode: true`, project from
  `ctx.session.get(...).location.directory`, heartbeat on setup and on each call.
- `src/mcp/main.js`, `mcp/main.js` and the MCP build target are deleted.
- `agent-config.js` no longer repairs paths: it reads the plugin heartbeat and
  names an old `kanban` MCP entry without touching it.
- Manifest: `contributes.opencodePlugin: "plugin"`; version 1.10.0.

L4 Proof with a real OpenCode 2.3.0, not only unit tests:
- `opencode plugin list` resolves the folder and reports the plugin.
- `opencode run` in a throwaway project with a config naming the folder wrote
  `~/.kanban/agent.json` with `{ version: 1.10.0, location: <project> }`, so
  `setup` ran and the tool transform completed inside OpenCode.
- `resolveOpenCodePluginFolder` from the installed OpenChamber returns
  `/…/openchamber-kanban/plugin`, so the install will accept the package.
Suites: local 159, update safety 40, agent plugin 69, planka routes 13;
`npm run check` clean.

L5 Not covered by a live test: a real Planka server. The Planka path is
exercised through the same `PlankaClient` the panel uses, with the HTTP layer
mocked, plus the "no pinned board" refusal.

L6 (found while answering a question, 2026-11-17): the heartbeat read the
version from `package.json` at runtime, so an update that replaced the manifest
while OpenCode still held the old module would report the *new* version from
*old* code — the exact false "connected" the panel exists to prevent. The build
now bakes the version into the plugin (`__KANBAN_VERSION__`), the heartbeat
carries `version` (running code) and `installed` (manifest on disk), and the
service only says connected when they match. Test: a manifest rewritten to
9.9.9 keeps the heartbeat on the built version and reports 9.9.9 as installed.
Version 1.10.1.
