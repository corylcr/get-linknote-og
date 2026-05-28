import { GetNoteDetail, GetNoteSummary } from "../api/types";
import { LinkNote } from "../types";
import {
  buildCanonicalId,
  dedupeStrings,
  finalizeLinkNote,
  normalizeText,
  nullIfEmpty,
  toTimestamp
} from "./common";

export function canonicalizeLinkNote(summary: GetNoteSummary, detail: GetNoteDetail | null): LinkNote {
  const apiId = String(detail?.note_id ?? summary.note_id ?? summary.id ?? summary.prime_id ?? "");
  const title = normalizeText(detail?.title || summary.title || summary.name) || "Untitled";
  const createdAt = toTimestamp(detail?.created_at || summary.created_at);
  const updatedAt = toTimestamp(detail?.updated_at || summary.updated_at);

  const summaryText = normalizeText(detail?.content) || null;
  const bodyText = normalizeText(detail?.web_page?.content) || null;
  const sourceUrl = normalizeText(detail?.web_page?.url) ||
    normalizeText(detail?.attachments?.find((a) => a.type === "link")?.url) || null;

  const tags = dedupeStrings(
    (Array.isArray(detail?.tags) ? detail?.tags : []).map((item) => item?.name || "")
  );
  const notebook = nullIfEmpty(Array.isArray(detail?.topics) ? detail?.topics[0]?.name : null);

  return finalizeLinkNote({
    canonicalId: apiId ? `api:${apiId}` : buildCanonicalId({ title, createdAt, body: bodyText }),
    sourceIds: apiId ? { api: apiId } : {},
    title,
    createdAt,
    updatedAt,
    content: {
      summary: summaryText,
      body: bodyText,
      sourceUrl
    },
    tags,
    notebook
  });
}
