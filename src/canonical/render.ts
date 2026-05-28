import { LinkNote } from "../types";
import { normalizeText } from "./common";

function formatUpdated(value: number | null): string {
  if (!value) return "unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "unknown" : date.toISOString();
}

export function renderLinkNoteMarkdown(note: LinkNote): string {
  const summary = normalizeText(note.content.summary);
  const body = normalizeText(note.content.body);
  const sourceUrl = normalizeText(note.content.sourceUrl);

  const lines = [
    `# ${note.title}`,
    "",
  ];

  if (body) {
    lines.push("## 原文", "", body, "");
  }

  if (summary) {
    lines.push("## AI 分析", "", summary, "");
  }

  if (sourceUrl) {
    lines.push("## 来源", "", `- [${note.title}](${sourceUrl})`, "");
  } else {
    lines.push("## 来源", "", "（暂无来源链接）", "");
  }

  if (note.tags.length) {
    lines.push("## 标签", "", note.tags.map((t) => `#${t}`).join(" "), "");
  }

  lines.push(
    "---",
    `source: api`,
    `updated: ${formatUpdated(note.updatedAt)}`,
    `canonicalId: ${note.canonicalId}`
  );

  return `${lines.join("\n").trim()}\n`;
}
