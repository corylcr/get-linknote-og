import { LinkNote } from "../types";
import { hashText } from "../utils/hash";

export function normalizeText(value: unknown): string {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

export function nullIfEmpty(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized || null;
}

export function toTimestamp(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1_000_000_000_000 ? value : value * 1000;
  }

  const numeric = Number(String(value));
  if (Number.isFinite(numeric) && String(value).trim() !== "") {
    return numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
  }

  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? null : parsed;
}

export function dedupeStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = normalizeText(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

export function buildCanonicalId(input: {
  apiId?: string;
  title: string;
  createdAt: number | null;
  body: string | null;
}): string {
  if (input.apiId) return `api:${input.apiId}`;
  const fallback = `${input.title}\n${input.createdAt || ""}\n${(input.body || "").slice(0, 1000)}`;
  return `fallback:${hashText(fallback)}`;
}

export function buildLinkNoteFingerprint(note: Omit<LinkNote, "fingerprint">): string {
  return hashText(
    [
      note.content.summary || "",
      note.content.body || "",
      note.content.sourceUrl || "",
      note.updatedAt || ""
    ].join("\n---\n")
  );
}

export function finalizeLinkNote(note: Omit<LinkNote, "fingerprint">): LinkNote {
  return {
    ...note,
    fingerprint: buildLinkNoteFingerprint(note)
  };
}
