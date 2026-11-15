// The pill next to the board selector says what pressing it does: it binds this
// board to the session's project, and pressing it again releases it. Without a
// project there is nothing to bind, so it hides.
export const pinState = ({ pinned, boardId, project }) => {
  const id = String(boardId || '');
  const name = String(project || '');
  const isPinned = Boolean(pinned) && Boolean(id) && String(pinned) === id;
  if (!name) {
    return {
      pinned: isPinned,
      disabled: true,
      hidden: true,
      text: '',
      label: 'Abre Kanban desde una sesión con proyecto para vincular el tablero',
    };
  }
  return {
    pinned: isPinned,
    disabled: !id,
    hidden: false,
    text: isPinned ? name : 'Vincular',
    label: isPinned
      ? `Vinculado a ${name}. Pulsa para desvincular el tablero`
      : `Vincular este tablero a ${name}`,
  };
};
