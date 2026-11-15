// The panel follows the board bound to the project of the session it is open
// in. A project with no board, or a board that is not available, is left alone:
// the panel never guesses which board to show.
export const shouldFollowBoard = ({ resolved, current, boards }) => {
  const target = String(resolved || '');
  if (!target || target === String(current || '')) return false;
  if (Array.isArray(boards) && boards.length && !boards.some((board) => board.id === target)) {
    return false;
  }
  return true;
};

// The project that owns a directory, including a worktree or a subfolder, which
// is the project whose board the panel shows.
export const projectForDirectory = (projects, directory) => {
  const dir = String(directory || '').replace(/\/+$/, '');
  if (!dir || !Array.isArray(projects)) return null;
  const exact = projects.find((project) => String(project.directory || '').replace(/\/+$/, '') === dir);
  if (exact) return exact;
  const parent = projects
    .filter((project) => {
      const base = String(project.directory || '').replace(/\/+$/, '');
      return base && dir.startsWith(`${base}/`);
    })
    .sort((a, b) => String(b.directory).length - String(a.directory).length)[0];
  return parent || null;
};
