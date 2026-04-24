export function normalizeInlineText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function sanitizeDisplayLine(value: string) {
  return normalizeInlineText(value)
    .replace(/^[\s,.;:!?\-–—•*]+/u, "")
    .replace(/[\s,.;:!?\-–—•*]+$/u, "")
    .trim();
}

export function isMeaningfulDisplayLine(value: string) {
  return /[\p{L}\p{N}]/u.test(value);
}

export function sanitizeTextList(items: Array<string | null | undefined>) {
  return items
    .map((item) => sanitizeDisplayLine(item || ""))
    .filter((item) => item.length > 0 && isMeaningfulDisplayLine(item));
}
