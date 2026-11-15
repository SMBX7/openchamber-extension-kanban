// The pin in the header decides what pressing it does: it fills when this board
// is the one the agent uses for the session's project, and it is disabled when
// there is no project to pin the board to. Kept here so the copy and the state
// are tested without a browser.
export const pinState = ({ pinned, boardId, hasProject }) => {
  const id = String(boardId || '');
  const isPinned = Boolean(pinned) && Boolean(id) && String(pinned) === id;
  const label = !hasProject
    ? 'Abre Kanban desde una sesión con proyecto para fijar su tablero'
    : isPinned
      ? 'El agente usa este tablero en este proyecto. Pulsa para quitarlo'
      : pinned
        ? 'El agente usa otro tablero en este proyecto. Pulsa para usar este'
        : 'Fijar este tablero para el agente en este proyecto';
  return { pinned: isPinned, disabled: !hasProject || !id, label };
};
