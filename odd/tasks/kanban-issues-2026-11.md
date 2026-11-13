# Kanban extension — issues from the IDEAS column (2026-11)

Objective: implement the seven cards sitting in IDEAS, in isolated worktrees, two sessions per batch.
Branch: `main` (each session works in its own worktree and branch; the parent merges sequentially).
Delivery: `ask-on-risk`. Test runner: `npm test` (`scripts/test-local.mjs` + `scripts/test-planka.mjs`), plus `npm run build` and `npm run check`.

## Specs

### S1 — Edit a card title from the Work Status
Card `1906025663186339367`:
> Desde el Word status no deja editar el título de la etiqueta.

Acceptance: every card shown in the Work Status (current card and IDEAS rows) can rename itself in place from the section, without opening the side panel or a session. Empty title is rejected with the existing message `El título no puede quedar vacío.` The Work Status scroll position is preserved.

### S2 — Editing a title keeps the card in its column
Card `1906277734296847914` (first part):
> Cuando editas un título de una tarjeta y le das a confirmar, se pasa directamente a hecho en vez de quedarse en ideas que es dónde lo he editado. Se tiene que quedar en su sitio en cada uno que se edita

Acceptance: renaming a card in IDEAS or EN PROGRESO keeps it in that column and keeps its position. Verify in local and Planka modes.

### S3 — Edit the card from the Work Status with a pencil
Card `1906277734296847914` (second part):
> También déjame que en el Word Status pueda clicarle o que salga también el lápiz para editar la tarjeta y poder editar desde ahí sin tener que abrir el side panel porque a veces trabajando, a lo mejor con doble chat o algo, no voy a abrir también el panel lateral.

Acceptance: a pencil (or click on the title) on a Work Status card edits the title inline; no side panel opens.

### S4 — Inline editing on the Kanban card and a simpler side panel
Card `1906283819258873395`:
> Al intentar modificar un titulo desde kanban no funciona solamente deja cambiarlo desde el pael lateral.A lo que me refiero es que el panel lateral, sinceramente, no sé si dejarlo aparcado porque es un lío realmente para una persona que no tenga mucha idea. Entonces, creo que lo más coherente es usar el lápiz de la tarjetita para que edite en esa tarjetita, no tenga que abrir ningún panel extra ni nada. Panel lateral es el que sale cuando se da el lápiz de edición que pone título, etiqueta, sesión, fecha, columnas, checklist, descripción. Hay que hacerlo de una forma más ordenada y para entender. Por ejemplo, la fecha, la columna se quita. La etiqueta realmente, elimínalo. Y checklist no sé lo que es, la verdad, descripción sin interesante, pero da más contexto.

Acceptance: the pencil on a card edits the title in place on the card; the side panel no longer offers date, column or label fields; description and checklist remain, with a short explanation of what the checklist is.

### S5 — Local and Planka parity
Card `1906284545234175541`:
> Hay que añadir que sobre todo estos fallos los estamos viendo en local, no en el planca, pero igualmente hay que revisarlo para los dos.

Acceptance: every fix above is checked in local mode and against Planka (unit tests plus manual reasoning where the network is not available).

### S6 — Column header: plus next to the title, better count
Card `1906279140714087983`:
> El botón de más de cada columna en el side panel tiene que ir al lado de cada título y el número lo ubicas en una mejor zona ya que el mas va a pasar a estar ahi

Acceptance: the `+` that creates a card moves next to the column title; the count gets its own readable spot.

### S7 — Sort IDEAS by priority
Card `1906376605895231036`:
> Me gustaría añadir lo que es como un filtrado o un botón de ordenar las columnas. En este caso, prioritariamente en ideas que es donde está todo, pero no veo necesario que sea en progreso y hecho por prioridad. Solo en ideas. Un botón que ponga. ordenar por prioridad o algo así o un botón que abre una pequeña pestañita que pone este botón es para ordenar por orden de prioridad con con tales criterios y te voy a poner por ejemplo Unos criterios que has tenido tú hace unos chats que me has dicho tú, por ejemplo, para que tenga una referencia.( con  criterio: primero los fallos que rompen el flujo, luego la paridad local/Planka, después la UX grande y al final el pulido/arquitectura)

Decision: the extension classifies each card locally by its text with the four criteria. No per-card priority is stored and no session is opened.

### S8 — One local board per OpenChamber project
Card `1906281365817525809`:
> Cada proyecto tiene que tener su JSON para que se guarde solo ese Kanban en local en ese proyecto y cuando te cambies de proyecto estén las columnas en vacías. Cuando vuelvas al proyecto anterior, se guarden sus columnas con sus tarjeas,

Acceptance: in local mode the board file is keyed by the OpenChamber project; switching project shows an empty board; returning restores the previous project's lists and cards. Existing `board.local.json` is migrated without losing data.

## Tasks

- T1 (S1, S3) — Work Status editing — DONE, commit `1e09722` (branch `feat/work-status-editing`). Self-verified: build, tests, check; scratch DOM probe 56 assertions; scratch removed.
- T2 (S2, S4, S5) — Kanban inline editing and simpler sheet — DONE, commit `2b16333` (branch `feat/card-inline-editing`). Self-verified: build, tests, check; browser harness on a real local board; S2 regression tests added to `scripts/test-local.mjs` (33 assertions) and `scripts/test-planka.mjs` (7 assertions).
- T3 (S8) — Local board per project — route: delegated, batch 2.
- T4 (S6, S7) — Column header and IDEAS sort — route: delegated, batch 2. S7 decided: the extension classifies locally by card text with the four criteria; no per-card priority and no session opened.

## Log

- L1 (user, verbatim): "vale ahora me han mandado unos cuantos issues mira la lista de idea del kanban y veras, podrias delegar por tandas de 2 en 2 cuando 2 se acabe con exito y este bien pasar a las otras 2 , delegarlo en sus sesiones aparte para cada implementacion, hacer q no se pisen ninguna sesion trabajando en el mismo repo, despues si es posible que esta sesion hable con esas creadas para ver si esta todo listo y okay y que cuando acabe fusionar los trabajo sin que pise ni rompa nada parar mergear y commitearlo que opinas"
- L2: Grouped the seven cards into four units by edit surface. Parallel pairs must touch disjoint files: `src/status/*` + `status/*` vs `src/panel/*` + `panel/*` in batch 1; `src/shared/*` + `src/service/*` vs `src/panel/*` + `panel/*` in batch 2. Arbitrary pairs would collide inside `src/panel/main.js`.
- L3: Committed the pending UI work before branching (`fd8ea7a`, `89c2ac4`) so every worktree starts from the same clean HEAD.
- L4 (merge): T1 fast-forwarded into `main` and verified (`npm run build`, `npm test` 30+5, `npm run check`). T2 rebased onto `main` and fast-forwarded; verified with the new regression tests (`npm test` 33+7, `npm run check`). Worktrees and branches removed after the merge.
- L5 (user correction, 2026-11-12): the Work Status editor must keep the size of the title — a long title is edited as a wrapped block, never squeezed into one line. In the board, a single click must not open the sheet: double-click edits the title, the pencil opens the sheet. The sheet footer becomes **Confirmar** (saves pending title/description and closes) and **Cancelar** (discards and closes); "Mover a HECHO" is gone. Make the title visibly editable and explain what the checklist is.
- L6 (user swap, 2026-11-12): the pencil edits only the title; double-click on the title edits only the title; double-click anywhere else on the card opens the sheet. The dotted underline appears on hover only, and the single click still does nothing.
- L7 (user correction, 2026-11-13): card settings are a draft with **Guardar** and **Cancelar**; they hold the title, the column and delete — date and labels are removed. Glass now uses the same radii for the settings fields and the card action buttons. The Work Status pencil no longer animates opacity on hover (scrolling under the pointer flickered), and the render signature compares session data instead of the `sessionsAt` timestamp.
- L8 (user correction, 2026-11-13): editing is unified in the card sheet opened by the pencil. Inline editing, double-click editing and the separate gear settings sheet are removed; the card has one pencil. The sheet title is a large auto-growing textarea, "Descripción" becomes "Detalles", and the delete action lives inside the sheet. The Work Status title no longer underlines on hover, and its render key uses the current session label instead of the churning host session list.
