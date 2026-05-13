// Group 1 = URL, Group 2 = phone — no nested groups to avoid index drift
const COMBINED_REGEX =
  /(https?:\/\/[^\s]+|www\.[^\s]+)|(\+?1?[\s\-\.]?\(?\d{3}\)?[\s\-\.]\d{3}[\s\-\.]\d{4}|\+?\d{10,11}(?!\d))/gi;

export const normalizeUrl = (url: string): string =>
  url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`;

export type LinkPart =
  | { type: "text"; value: string }
  | { type: "link"; value: string }
  | { type: "phone"; value: string };

export const splitLinkParts = (text: string): LinkPart[] => {
  const regex = new RegExp(COMBINED_REGEX.source, "gi");
  const parts: LinkPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    if (match[1]) {
      parts.push({ type: "link", value: match[1] });
    } else if (match[2]) {
      parts.push({ type: "phone", value: match[2].trim() });
    }
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }
  return parts;
};
