# Kanban for OpenChamber

An OpenChamber extension that turns a [Planka](https://planka.app) board — or a board
stored on this machine — into a working Kanban inside the app. It ships four pieces:

- a **board panel** for planning,
- a compact **Work Status** section in the sidebar for day-to-day work,
- a **host service** that owns the Planka connection and the session links,
- an **MCP server** so the agent can read and move cards.

Planka is the single source of truth in Planka mode, and the extension keeps no local
copy of the board: it caches a snapshot for 1.5 s to render and invalidates it on every
write. Local mode swaps the backend for a single JSON file with the same shape, so the
panel, the Work Status section, the service and the MCP server do not change.

## Data sources

Choose where the board lives under **Settings → Conexión**:

- **Planka** (default): a Planka instance stores the board, so it is visible from any
  device that can reach it.
- **Local**: the board lives in `board.local.json` next to the package, mode `600`, on
  this machine only.

Sessions, the session picker and manual or automatic delegation behave the same in both
modes: they belong to OpenChamber, not to the storage. Switching to local keeps the
Planka token, so going back does not ask for the password again. Local mode starts with
three lists (IDEAS, EN PROGRESO, HECHO) and three labels.

## What you can do

### Board panel

- Columns, cards and full drag and drop between lists and positions.
- Create, edit and delete cards. Deleting is a two-step confirmation and shows an
  undo bar for five seconds before it reaches Planka.
- Card sheet with description, labels, checklist items, due date and the linked
  session.
- Search across the board, filter stopped work, and switch between boards.
- Settings sheet: board ↔ OpenChamber project mapping, delegation mode, style presets
  (neumorphism, brutalism, glass), colours and the data source.

### Work Status section

- The card in progress, highlighted, with its state and session.
- Session picker per card: link an existing session or start a new one explicitly.
- Add an idea straight into the backlog list with the `+` in the header.
- Delete any card from the section, with the same two-step confirmation as the panel.
- Complete the current card, or send it back to the ideas list.

### Sessions

- A card moved to the work list **never** starts a session by itself. Automatic mode
  asks first (a bar in the panel, a row inside the status card); the `+` button and the
  picker always start one explicitly.
- **Manual** delegation links sessions by hand; **automatic** delegation offers to start
  one when a card reaches the work list and waits for a confirmation. Nothing starts on
  its own, so an accidental drag costs nothing.
- Completing a card, sending it back to ideas or deleting it **stops and unlinks** its
  session, so no agent keeps working on something that is no longer in progress.
- Opening the linked session from the card puts the card's title on that session.

### Agent (MCP)

Eleven tools: `kanban_boards`, `kanban_board`, `kanban_search`, `kanban_create_card`,
`kanban_update_card`, `kanban_move_card`, `kanban_complete_card`, `kanban_delete_card`,
`kanban_checklist_add`, `kanban_checklist_check`, `kanban_link_session`.

## How it works

```
panel/index.html  ─┐
status/index.html ─┼─ iframes ─> service/main.js ─> Planka REST API
                   │                  │
                   │                  └─> OpenChamber sessions (link, start, stop)
                   └─ MCP: mcp/main.js ─> shared/planka.js ─> Planka REST API
```

- `src/shared/planka.js` is the only Planka client. The service and the MCP server both
  import it, and both read the same `config.json`.
- The service exposes `/work`, `/snapshot`, `/card`, `/card/move`, `/card/back`,
  `/session/*`, `/mapping`, `/appearance` and friends over the host bridge.
- The snapshot is cached for 1.5 s; writes call `invalidate()` so the next read is fresh.
- Session links live in `src/shared/links.js`; they are the bridge between a Planka card
  and an OpenChamber session.

## Requirements

- OpenChamber `>= 2.7.0`, with the host service capability.
- **Either** a reachable Planka instance with an account on it, **or** the local board,
  which needs nothing else.
- Node.js 20+ to build the bundles.
- A Planka account is asked once for base URL, email and password. The password is used
  to obtain a token and is never written to disk; the token is stored in `config.json`
  next to the package with mode `600`.

`config.json` is machine-local and git-ignored. Its shape (`source` is `planka` or
`local`):

```json
{
  "source": "planka",
  "baseUrl": "http://127.0.0.1:3040",
  "email": "",
  "token": "",
  "boardId": "",
  "boardName": ""
}
```

## Things to know

- **Local mode is single-device.** The board is one JSON file on this machine: no
  mobile, no second computer, no sharing. Switching modes does not migrate cards between
  Planka and the local file.
- **One board at a time** for the Work Status; the panel can switch between boards.
- **Mobile** needs both OpenChamber and the Planka instance reachable from the phone,
  which usually means a private network (Tailscale, WireGuard) or a tunnel.
- **Deleting is permanent** in Planka. The undo bar only delays the request for five
  seconds; once it fires, the card is gone.
- **Snapshot latency**: up to 1.5 s behind Planka for changes made outside the extension.
- **MCP cost**: one server process per workspace, about 40 MB each. It exits when its
  transport closes.
- The panel and the Work Status are two separate iframes, so a visual change needs the
  app reloaded to be picked up.

## Install

1. Build the package:

   ```bash
   npm ci
   npm run build
   ```

2. Add the folder in OpenChamber under **Settings → Extensions**. The package declares
   its panel, status section, host service and MCP server in `openchamber.contributes`,
   so no extra wiring is needed.

3. Open the Kanban panel and connect it to Planka with base URL, email and password.

The bundles under `panel/`, `status/`, `service/` and `mcp/` are committed so the folder
can be installed as-is; run `npm run build` after changing anything in `src/`.

## Layout

| Path | What it is |
| --- | --- |
| `src/panel/main.js` | Board panel: lists, drag and drop, card sheet, settings |
| `src/status/main.js` | Compact Work Status section: current card, ideas, session picker |
| `src/service/main.js` | Host service: Planka client usage, routes, session link, caching |
| `src/mcp/main.js` | MCP server exposing the board to the agent |
| `src/shared/planka.js` | Planka REST client and snapshot builders |
| `src/shared/local.js` | Local board client with the same surface, JSON storage |
| `src/shared/config.js` | `config.json` read/write with mode 600 |
| `src/shared/links.js` | Card ↔ session links |
| `src/shared/board-projects.js` | Board ↔ project mapping |
| `src/shared/appearance.js` | Colours and relief tokens |
| `scripts/build.mjs` | esbuild bundling into `panel/`, `status/`, `service/`, `mcp/` |
| `scripts/check.mjs` | Package validation |
| `scripts/test-local.mjs` | Local board client tests, run with `npm test` |

## Build

```bash
npm run build   # bundle every entry point
npm run check   # validate the package manifest and outputs
npm test        # exercise the local board client in a temp file
```

## License

MIT
