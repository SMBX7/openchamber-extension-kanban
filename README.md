# Kanban for OpenChamber

An OpenChamber extension that turns a [Planka](https://planka.app) board into a working
Kanban inside the app: a full board panel, a compact Work Status section, a host
service that talks to Planka, and an MCP server so the agent can read and move cards.

Planka is the only source of truth. The extension keeps no local copy of the board;
it caches a short-lived snapshot for rendering and invalidates it on every write.

## Requirements

- OpenChamber `>= 2.7.0`
- A reachable Planka instance and an account on it
- Node.js 20+ to build the bundles

## Install

1. Build the package:

   ```bash
   npm ci
   npm run build
   ```

2. Add the folder in OpenChamber under **Settings → Extensions**. The package
   declares its panel, its status section, its host service and its MCP server in
   `package.json` (`openchamber.contributes`), so no extra wiring is needed.

3. Open the Kanban panel and connect it to Planka with the base URL, the account
   email and the password. The password is used once to obtain a token and is never
   written to disk; the token is stored in `config.json` next to the package with
   mode `600`.

`config.json` holds machine-local credentials and is git-ignored. It is created on
first login and looks like this:

```json
{
  "baseUrl": "http://127.0.0.1:3040",
  "email": "",
  "token": "",
  "boardId": "",
  "boardName": ""
}
```

## Layout

| Path | What it is |
| --- | --- |
| `src/panel/main.js` | Board panel: lists, drag and drop, card sheet, settings |
| `src/status/main.js` | Compact Work Status section: current card, ideas, session picker |
| `src/service/main.js` | Host service: Planka client, routes, session link, caching |
| `src/mcp/main.js` | MCP server exposing the board to the agent |
| `src/shared/` | Planka client, config, links and board-to-project mapping |
| `scripts/build.mjs` | esbuild bundling into `panel/`, `status/`, `service/`, `mcp/` |
| `scripts/check.mjs` | Package validation |

The bundles under `panel/`, `status/`, `service/` and `mcp/` are committed so the
folder can be installed as-is; run `npm run build` after changing anything in `src/`.

## Build

```bash
npm run build   # bundle every entry point
npm run check   # validate the package manifest and outputs
```

## MCP tools

The server exposes board reads and card operations: list boards, lists and cards,
create a card, move it between lists, complete it, start or link a session, and read
the current Work Status payload.

## Notes

- A card moved to the work list does not start a session by itself; starting one is
  explicit from the card controls.
- Returning a card to the ideas list stops and unlinks its session.
- Deleting a card stops its linked session before removing it from Planka.

## License

MIT
