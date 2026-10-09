// Readable excerpts from AI answers, which arrive as Markdown with citation
// markers. Only for previews: the full raw answer is always shown verbatim
// on the response page.

export function plainText(md: string | null | undefined): string {
  if (!md) return "";
  return (
    md
      // ([label](url)) and [label](url) -> label
      .replace(/\(\[([^\]]+)\]\([^)]*\)\)/g, "($1)")
      .replace(/\[([^\]]+)\]\((?:https?:)?[^)]*\)/g, "$1")
      // Citation markers: [1], [2][3], 【1】
      .replace(/\s?(\[\d+\])+/g, "")
      .replace(/【\d+】/g, "")
      // Emphasis and inline code
      .replace(/(\*\*|__)(.+?)\1/g, "$2")
      .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,;:!?]|$)/g, "$1$2")
      .replace(/`([^`]+)`/g, "$1")
      // Headings and list bullets
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "• ")
      // Empty brackets left behind, extra spaces
      .replace(/\(\s*\)/g, "")
      .replace(/[ \t]{2,}/g, " ")
      .trim()
  );
}

/** First `max` characters of the plain text, cut at a word boundary. */
export function excerpt(md: string | null | undefined, max = 400): string {
  const text = plainText(md).replace(/\s*\n\s*/g, " ");
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 40))}…`;
}
