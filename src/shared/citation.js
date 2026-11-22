// The text the card's cite button pastes into the chat composer: enough for the
// agent to find the card and work it without opening the panel. The host
// compose call accepts up to 16000 characters, so the text is capped here.
export const CITATION_TEXT_MAX = 16000;

export const citationText = (card, listName, boardName) => {
  const checklist = (card?.taskLists || [])
    .flatMap((taskList) => taskList.tasks.map((task) => `- ${task.name}`))
    .slice(0, 12);
  return [
    `Tarjeta del kanban «${boardName || ''}»: «${card?.name || ''}» (id ${card?.id || ''}${
      listName ? `, columna ${listName}` : ''
    }).`,
    card?.description ? `Descripción: ${card.description}` : '',
    checklist.length ? `Checklist:\n${checklist.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, CITATION_TEXT_MAX);
};
