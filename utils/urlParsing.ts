// URL parsing helpers
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

export const normalizeUrl = (url: string): string =>
    url.startsWith("http://") || url.startsWith("https://")
        ? url
        : `https://${url}`;

export const splitLinkParts = (text: string): { type: "text" | "link"; value: string }[] => {
    const parts: { type: "text" | "link"; value: string }[] = [];
    let lastIndex = 0;
    for (const match of text.matchAll(URL_REGEX)) {
        const start = match.index ?? 0;
        const url = match[0];
        if (start > lastIndex) {
            parts.push({ type: "text", value: text.slice(lastIndex, start) });
        }
        parts.push({ type: "link", value: url });
        lastIndex = start + url.length;
    }
    if (lastIndex < text.length) {
        parts.push({ type: "text", value: text.slice(lastIndex) });
    }
    return parts;
};