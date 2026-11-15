// A composer field grows with its text up to the number of lines it declares
// and then scrolls. The maths is here so the limit is tested without a browser:
// the title keeps two lines, the description four.
export const composerFieldHeight = ({ scrollHeight, lineHeight, padding, border, lines }) => {
  const room = Math.round(lineHeight * lines + padding + border);
  const needed = Math.ceil(scrollHeight + border);
  return { height: Math.min(needed, room), scroll: needed > room };
};
