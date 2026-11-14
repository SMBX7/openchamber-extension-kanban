# Kanban for OpenChamber

[Español](README.es.md) · English

**A Kanban for [Planka](https://planka.app), and also a local board without Planka.**
It runs inside OpenChamber: three columns, a section in the chat showing what you are
working on, and an agent that can read and move cards.

Point it at Planka, or keep everything on this machine. The interface is in Spanish;
each control below gives its English name and, in brackets, the label on screen.

![The board](docs/panel.png)

## What you get

- **Three columns**: IDEAS, IN PROGRESS and DONE. Nothing else.
- **Boards**: create a Planka board with its three columns from the panel, or add the
  columns to an empty one.
- **Cards** with a title, details and a session.
- **Sessions**: a card follows its OpenChamber session while it works.
- **Manual or automatic**: open the session yourself, or let the agent ask first.
- **A local board per project**: the same board, no server.
- **Three visual styles** for the board.
- **An agent** that creates, moves, completes, edits and searches cards.

It is not a project manager: no sprints, estimates or reports.

## Install

Install from the repository URL. A git URL is the only install OpenChamber can update;
folder and ZIP installs never update.

```
https://github.com/SMBX7/openchamber-extension-kanban.git
```

1. Open **Settings → Extensions** (Ajustes → Extensiones).
2. Paste the URL into **Folder, ZIP, or URL** (Carpeta, ZIP o URL) and press **Add**
   (Añadir).
3. Review the permissions and choose **Allow and enable** (Permitir y activar). The
   **Kanban** icon appears on the right sidebar; open it from there.

Requires OpenChamber **2.7.0 or newer**.

### Where it lives

The extension shows up in three places, and only one of them is configured:

- **The panel, on the right sidebar.** The Kanban icon there opens the board and its
  settings: the first time it asks for the Planka connection, and later
  **Settings → Connection** (Conexión) changes the account, the server or the local
  board. If you do not see the icon, show the right sidebar with "Show or hide right
  sidebar" (Mostrar u ocultar barra lateral derecha).
- **The Kanban section in the chat (Work Status).** It shows what is in progress and the
  ideas so you can work without opening the panel; it configures nothing.
- **The full page.** Open it from **Extension pages** (Páginas de extensiones), above the
  session list: the same board full screen, with the same settings.

### For an AI assistant

- Use the git URL above; do not download a ZIP, clone it, or point OpenChamber at a
  folder.
- Install it in OpenChamber's Settings: the `openchamber` CLI cannot install extensions.
- Do not edit the installed copy; an update replaces it.
- Check that **Kanban** is on the right sidebar and that the extension card's version
  matches `version` in `package.json`.
- Tell the person how to update: **Settings → Extensions → Check for updates** (Buscar
  actualizaciones) → **Update** (Actualizar).

### Updating

Opening **Settings → Extensions** checks git installs once an hour; **Check for updates**
checks now. When a newer version exists, press **Update**; permissions, accounts and
settings are kept. Without a suffix the URL follows `main`; add `#v1.2.0` or `#stable` to
pin a tag or branch. Publishing a version means bumping `version` in `package.json` and
pushing.

## Connecting to Planka

The first time, the panel asks for three things:

| Field | What to put |
| --- | --- |
| Server | Your Planka address, for example `http://127.0.0.1:3040` |
| Email or user | Your Planka account |
| Password | Your Planka password |

The password is used once to request an access key and is not stored. The key stays in a
configuration file next to the extension, on your machine, and is never uploaded. Then
pick the Planka board and the OpenChamber project its sessions belong to.

## Local board

Choose **Local** in **Settings → Connection** (Conexión). You get the three columns,
stored on this machine.

- Only yours: not visible from another device.
- One board per OpenChamber project; switching project switches boards.
- Planka and local are separate: nothing is copied between them, and you can switch
  back to Planka at any time without logging in again.
- **Download MD** (Descargar MD) and **Download CSV** (Descargar CSV) write
  `kanban-YYYY-MM-DD.md` and `.csv` to your Downloads folder, for reading and sharing.
- **JSON copy** (Copia JSON) writes the complete board; it is the only format that can be
  loaded back with **Import a copy…** (Importar copia…).

The file is written by the extension where OpenChamber runs, not by the browser.

![Connection and appearance](docs/settings.png)

## The panel

It opens from the **Kanban** icon on the right sidebar. This is also where you connect
Planka and change the settings.

- **Create**: the `+` next to a column title opens the card box above the cards. Type a
  title and an optional description; `Enter` or **Create** (Crear) saves it. The
  description stays on one line and scrolls sideways.
- **Edit**: the pencil (or `Enter` with the card focused) opens the card. There you
  change the title, details and session; **Confirm** (Confirmar) saves and closes,
  **Cancel** (Cancelar) discards.
- **Delete**: inside the editor, press **Delete card** (Eliminar tarjeta) twice; you get
  five seconds of **Undo** (Deshacer).
- **Move**: drag a card inside a column or to another one. Dragging to DONE completes it;
  a card linked to a session moves on its own when that session finishes its turn.
  Manual moves are never touched.
- **Sort IDEAS**: **Sort** (Ordenar) opens the four priority criteria.
- **Search** with the magnifier.
- **Stopped** (Paradas) filters cards in IN PROGRESS **without an active session**.

## Work Status

The Work Status section beside the chat; it lets you work without opening the panel.

![Work Status](docs/status.png)

- Every card in IN PROGRESS in amber, with its buttons: choose its session, open it, or
  create one with `+`; send the card back to ideas with the arrow, or complete it with
  the tick.
- Titles clamp to two lines; click the text or the chevron to read the whole title, or
  the pencil to edit it.
- The **Auto**/**Manual** pill next to the board name changes the mode.
- The **`+` in the header** adds an idea.
- Below, the ideas: the tick starts one, the trash deletes it (with undo).

## Sessions: manual and automatic

Choose the mode in **Settings → Delegation** (Delegación) or from the Work Status pill.

- **Manual**: moving a card to IN PROGRESS only moves it; open the session with the
  card's `+`. Each card gets its own session.
- **Automatic**: automatic delegation works in batches. The first card you launch opens
  the session; every card launched after it joins the same session. The main agent hands
  each card to a subagent, reviews the result and moves the card to DONE itself. The
  prompt still asks before anything opens.

When an agent takes a card, the extension links it to that session: the card moves to IN
PROGRESS when linked. A batch stays open while any of its cards is outside DONE; when the
last one arrives, the session reviews the whole set, writes the summary of what each
subagent did and closes. In both modes:

- Moving to **DONE** leaves the session open; **Close sessions** (Cerrar sesión/es) in
  the DONE column closes each distinct session once and removes its links.
- Moving back to **IDEAS** releases the card. In a batch only that card leaves; the
  session keeps working the rest.

### The board the agent uses

The panel and the agent are two separate processes. The panel follows the connection you
see here; the agent's tools decide their board from the project the session was opened
in. Pin it once per project in **Settings → Delegation → Board for the agent** (Tablero
del agente). While a project has several boards and none is pinned, the agent refuses to
touch cards instead of guessing. A worktree or a subfolder of the project inherits the
pinned board.
- A card with no session shows under **Stopped** (Paradas).

## Styles

Change them in **Settings → Appearance** (Apariencia).

![The three styles](docs/styles.png)

- **Neumorphism** (Neumorfismo): soft relief, blurred shadows.
- **Brutalism** (Brutalismo): hard borders, square corners, solid shadows.
- **Glass** (Cristal): translucent surfaces with blur.

## Common problems

- **Kanban is not on the right sidebar**: enable it in **Settings → Extensions** and
  reload OpenChamber.
- **I cannot find where to configure it**: it is not in the session list; the icon lives
  on the right sidebar. Show it with "Show or hide right sidebar" (Mostrar u ocultar
  barra lateral derecha) and open **Kanban**.
- **The agent cannot see the cards**: restart OpenCode after updating the extension.
- **The panel and the Work Status section disagree**: they are separate areas; reload
  OpenChamber.
- **The board does not change**: in Planka mode, check that Planka is up and the session
  has not expired; **Settings → Connection** shows the account or the error.
- **I deleted a card by mistake**: **Undo** lasts five seconds.

## License

MIT. See [LICENSE](LICENSE).
