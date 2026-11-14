# Kanban for OpenChamber

[Español](README.es.md) · English

**A Kanban for [Planka](https://planka.app), and also a local Kanban without Planka.**
It runs inside OpenChamber: a board with three columns, a small sidebar section showing
what you are working on, and an agent that can read and move cards.

Point it at your Planka instance, or choose the local board and keep everything on this
machine: same board, same sessions, no server. If you were looking for a local Kanban
inside OpenChamber, this works that way too.

The interface is in Spanish. Every control mentioned below gives its English name and,
in brackets, the label you will actually see on screen.

![The board](docs/panel.png)

## What you get

- **Three columns**: IDEAS, IN PROGRESS and DONE. Nothing else.
- **Boards**: create a Planka board with its three columns from the extension, and add
  the columns to a board that arrives empty.
- **Cards** with a title, details and an assigned session.
- **Sessions**: each card can be assigned an OpenChamber session; the card follows that session while it works.
- **Automatic or manual**: let the agent open the session when a card moves, or open it
  yourself.
- **Three visual styles** for the board.
- **An agent** that can create, move, complete, edit and search cards.

It is not a project manager: no sprints, no estimates, no reports.

## Before you start

- OpenChamber **2.7.0 or newer**.
- **Either** a Planka account and its address, **or** nothing: the local board needs no
  server.
- Only if you are going to build the extension yourself: Node.js 20 or newer.

## Install

Install it from the GitHub repository URL. Do not download the code or pick a folder:
a git URL install is the only one OpenChamber can update later from
**Settings → Extensions**.

```
https://github.com/SMBX7/openchamber-extension-kanban.git
```

1. Open **Settings → Extensions** (Ajustes → Extensiones).
2. Paste that URL into **Folder, ZIP, or URL** (Carpeta, ZIP o URL).
3. Press **Add** (Añadir).
4. The permission dialog lists what it needs, including access to your projects and
   sessions, and a local service that follows them. Review it and choose
   **Allow and enable** (Permitir y activar).
5. **Kanban** appears on the rail. Open it.

There is nothing else to wire: the extension already declares its panel, its section
and its agent tools.

### For an AI assistant

If you are an AI installing this for someone, follow these rules. They keep the install
updatable:

- Use the git URL above as the source. Do **not** download the repository as a ZIP,
  clone it, or point OpenChamber at a folder. Folder and ZIP installs never update; only
  a git URL install does.
- The install happens in OpenChamber's own Settings. The `openchamber` CLI has no
  command that installs an extension.
- Do not edit the installed copy inside OpenChamber's data folder; an update replaces
  it from the repository.
- Check the result: **Kanban** is on the rail, the panel opens with the three columns,
  and the version on the extension card matches `version` in the repository's
  `package.json`.
- When you finish, tell the person how to update: **Settings → Extensions → Check for
  updates** (Buscar actualizaciones) → **Update** (Actualizar).

### Updating

A git URL install updates from inside OpenChamber:

- Opening **Settings → Extensions** checks each git install at most once an hour;
  **Check for updates** (Buscar actualizaciones) checks right away.
- When the repository's version is newer, the card shows **Update available**
  (Actualización disponible). Press **Update** (Actualizar).
- Permissions, accounts and settings are kept. If the new version asks for more, you
  approve it again.
- Without a suffix, the URL follows the default branch (`main`). Add `#v1.2.0` or
  `#stable` only if you want to follow a tag or branch instead; a tag pins that version,
  while a branch follows its own commits.
- Folder and ZIP installs do not update: replace them by hand. If you installed an older
  copy that way, remove it and reinstall from the URL above.

An update in this repository means bumping `version` in `package.json` and pushing;
OpenChamber compares that version with the installed one.

## Connecting to Planka

The first time, the panel asks for three things:

| Field | What to put |
| --- | --- |
| Server | Your Planka address, for example `http://127.0.0.1:3040` |
| Email or user | Your Planka account |
| Password | Your Planka password |

The password is used **once** to request an access key and is not stored. The key does
stay in a configuration file next to the extension, on your machine, and is never
uploaded anywhere.

Then pick the Planka board and which OpenChamber project it belongs to. Sessions for
that board are created in that project.

## Local board

If you do not have Planka, open **Settings → Connection** (Conexión) and choose
**Local**. You get a board with the three lists and three labels, stored on your
machine.

- It is yours only: not visible from your phone or another computer.
- You can go back to Planka whenever you want; you will not have to log in again.
- Planka and local are separate boards: nothing is copied between them.
- **One board per project**: each OpenChamber project keeps its own local board. A
  project with no board starts empty; going back restores its lists and cards.

The local board can be exported:

- **Download MD** (Descargar MD) and **Download CSV** (Descargar CSV) write the board
  into your Downloads folder as `kanban-YYYY-MM-DD.md` or `.csv`. They are meant for
  reading and sharing.
- **JSON copy** (Copia JSON) writes the complete board. It is the only format that can
  be loaded back.
- **Import a copy…** (Importar copia…) opens a file picker and restores that JSON file.

Each project's file is written by the extension on the machine where OpenChamber runs,
not by the browser. If you use OpenChamber remotely, the file lands on that machine.

![Connection and appearance](docs/settings.png)

## The panel

- **Create**: the `+` next to the column title opens the card box under the header,
  above the cards. Type a title and an optional description, then press `Enter`
  (or **Create** (Crear)). The description stays on one line and scrolls sideways,
  so the column never grows while you type.
- **Edit the card**: hover it and press the pencil (or press `Enter` with the card
  focused). There you change the title, details and session; **Confirm** (Confirmar) saves
  and closes, **Cancel** (Cancelar) discards.
- **Delete**: inside the editor, press **Delete card** (Eliminar tarjeta) twice; then you get five
  seconds of **Undo** (Deshacer) in the bar at the top.
- **Move**: drag the card inside a column or to another one.
- **Sort IDEAS**: the **Sort** (Ordenar) button in the IDEAS header opens the four criteria
  and reorders the cards by priority.
- **Complete**: the tick sends it to DONE. If the card is linked to a session, it
  moves to DONE automatically when that session finishes its turn; only that card
  moves. Manual moves are never touched.
- **Search** with the magnifier.
- **Stopped** (Paradas) filters cards in IN PROGRESS **with no session**. It is how you
  see what has been parked for a long time and decide whether to pick it up or send it
  back to ideas.

## Work Status

It is the sidebar section. It lets you work without opening the panel.

![Work Status](docs/status.png)

- At the top, **every card in IN PROGRESS** in amber, each with its buttons: pick a
  session, open one with `+`, send it back to ideas with the arrow, or complete it with
  the tick.
- Titles are clamped to two lines. Click the text or the chevron to expand it and read
  the whole title; the pencil still edits.
- Next to the board name, a pill says **Auto** or **Manual**; press it to change the
  mode without opening anything.
- The **`+` in the header** adds an idea without leaving the chat.
- Below, the **ideas**: the tick starts one, the trash deletes it (also with undo).

## Sessions: manual and automatic

Choose the mode in **Settings → Delegation** (Delegación) or from the Work Status pill.

- **Manual**: moving a card to IN PROGRESS only moves it. You open the session with the
  card's `+`.
- **Automatic**: when a card reaches IN PROGRESS, a small prompt appears next to it
  asking whether to open the session. Nothing opens until you say yes.

In manual mode you have the button to open it whenever you want. In automatic mode,
moving the card shows the prompt and you decide right there.

When you delegate a card to an agent, link it to that agent's session (the extension's
tools do it). The card moves to IN PROGRESS when linked and to DONE when that session
finishes its turn; only that card moves. Manual moves are never touched.

Everything else works the same in both modes:

- Moving to **DONE** leaves the session open. The DONE column has a **Close sessions** (Cerrar sesión/es)
  button; it closes each distinct session once, even when several cards share it, and
  removes all its links.
- Moving back to **IDEAS** stops the session and releases the card.
- Because the card is released, moving it again starts a **new** session, without the
  previous conversation.
- If a card ends up with no session, it shows under **Stopped** (Paradas): that is where
  you see the ones parked for a long time.

## Styles

The same board with three finishes. Change them in **Settings → Appearance**
(Apariencia).

![The three styles](docs/styles.png)

- **Neumorphism**: soft relief, blurred shadows.
- **Brutalism**: hard borders, square corners, solid shadows.
- **Glass**: translucent surfaces with blur.

## Common problems

- **Kanban does not appear on the rail**: check **Settings → Extensions**
  (Ajustes → Extensiones) that the card is enabled, then reload OpenChamber.
- **The agent cannot see the cards**: after updating the extension, restart OpenCode so
  it loads the new version.
- **The panel and the sidebar disagree**: they are two separate areas; reload
  OpenChamber.
- **The board does not change**: in Planka mode, check that Planka is up and that the
  session has not expired. **Settings → Connection** (Conexión) shows the account or
  the error.
- **I deleted a card by mistake**: you have five seconds of **Undo** (Deshacer). After
  that it cannot be recovered.
- **There is no sound**: there is none, on purpose.

## License

MIT. See [LICENSE](LICENSE).
