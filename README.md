# Kanban for OpenChamber

[Español](README.es.md) · English

A Kanban board inside OpenChamber, backed by [Planka](https://planka.app) or by a
board stored on this machine. Move cards, open an agent session on the card you are
working on, and let the agent read and move cards through its own tools.

The interface is in Spanish.

![The board panel](docs/panel.png)

## What it is

- A **board panel** with three columns: IDEAS, EN PROGRESO and HECHO.
- A compact **Work Status** section in the sidebar with the card in progress.
- **Sessions**: link an OpenChamber session to a card and open it from there.
- An **agent** that can create, move, complete, edit and search cards.

It is not a project manager: there are no sprints, no estimates and no reports. One
board, three columns, cards.

## Requirements

- OpenChamber 2.7.0 or newer.
- **Either** a Planka instance you can reach with an account on it, **or** nothing
  else: the local board needs no server.
- Node.js 20+ only if you are going to build the package yourself.

## Install

1. Open **Settings → Extensions** in OpenChamber.
2. Add the folder that contains this package.
3. The Kanban icon appears in the sidebar. Open it.

The package declares its panel, its Work Status section, its service and its agent
tools in `package.json`, so there is nothing else to wire.

## Connect to Planka

On first open the panel asks for three things:

| Field | What it is |
| --- | --- |
| Server | Your Planka address, for example `http://127.0.0.1:3040` |
| Email or user | Your Planka account |
| Password | Used once to obtain a token; never written to disk |

The token is stored in `config.json` next to the extension, readable only by you.
Once connected, the panel shows your boards: pick one and assign it to an
OpenChamber project. Sessions for that board are created in that project.

## Local board

If you do not have Planka, open **Settings → Conexión** and choose **Local**. A board
with the three lists and three labels appears, saved in `board.local.json` next to the
extension.

- It lives on this machine: no mobile, no second computer.
- Switching back to Planka keeps your token, so you will not have to log in again.
- Nothing is copied between the two: they are separate boards.
- **Backup**: Settings → Conexión offers Copiar tablero and Restaurar. Copy the text
  somewhere safe; paste it back to recover the board.

![Connection and appearance settings](docs/settings.png)

## The panel

- **Create**: the `+` at the bottom of a column opens an input. `Enter` saves, `Esc`
  closes.
- **Edit**: hover a card and press the pencil. You can change the name, description,
  labels, checklist and due date.
- **Delete**: hover a card and press the trash twice. The bar at the top offers
  **Deshacer** for five seconds; after that the card is gone.
- **Move**: drag a card inside a column or to another one. The column it lands in
  decides what happens next.
- **Complete**: the tick moves it to HECHO and closes its session.
- **Search** with the magnifier, and **Paradas** filters cards in progress with no
  session.
- **Keyboard**: tab to a card, `Enter` opens it, `Shift` + arrows move it between columns
  or inside one, and the change is announced to screen readers.

## Work Status

The sidebar section, always at hand while you work:

![The Work Status section](docs/status.png)

- The **card in progress** is highlighted in amber, with its session and its controls:
  pick a session, open one with `+`, send the card back to ideas with the arrow, or
  complete it with the tick.
- The **mode pill** next to the board name says `Auto` or `Manual`; press it to change
  the delegation mode without opening the panel.
- The **`+` in the header** adds an idea without leaving the chat.
- **Ideas** are listed below: the tick starts one, the trash deletes it (with undo).

## Sessions: manual and automatic

There are two delegation modes, chosen in **Settings → Delegación** or from the pill:

- **Manual**: moving a card to EN PROGRESO changes the board and nothing else. You open
  the session with the `+` on the card.
- **Automatic**: when a card reaches EN PROGRESO a small card appears next to it asking
  whether to open the session. Nothing opens until you confirm.

What happens next is the same in both modes:

- **HECHO**: the session receives the close request and stops. The link is removed.
- **Back to ideas**: the session stops and the link is removed.
- Because the link is removed, moving the card again starts a **new** session, with no
  old context mixed in.

## Problems

- **The agent does not see the tools**: after updating the extension, restart OpenCode
  so it loads the new version.
- **The panel and the Work Status look different**: they are two separate frames.
  Reload OpenChamber after an update.
- **The board does not change**: in Planka mode the panel reads from Planka; check that
  the instance is up and the token has not expired. Settings → Conexión shows the
  account or the error.
- **A card disappeared**: deleting is permanent after the five seconds of undo. Labels
  have their own undo bar, also at the top.
- **No sound**: there is none, on purpose. The extension never plays audio.

## License

MIT. See [LICENSE](LICENSE).
