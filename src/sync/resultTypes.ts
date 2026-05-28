import { UnifiedSyncResult } from "../types";

export interface SyncCounters {
  added: number;
  updated: number;
  skipped: number;
  failed: number;
  totalRemote: number;
}

export function toLastSyncSummary(
  counters: SyncCounters,
  startedAt: string,
  finishedAt: string,
  outputFolder?: string,
  errorMessage?: string
): UnifiedSyncResult {
  if (errorMessage) {
    return {
      mode: "openapi",
      startedAt,
      finishedAt,
      status: "failed",
      added: counters.added,
      updated: counters.updated,
      skipped: counters.skipped,
      failed: Math.max(1, counters.failed),
      total: counters.totalRemote,
      totalRemote: counters.totalRemote,
      outputFolder,
      errorMessage
    };
  }

  const hadFailures = counters.failed > 0;
  const hadAnySuccess = counters.added > 0 || counters.updated > 0 || counters.skipped > 0;
  const status = hadFailures ? (hadAnySuccess ? "partial_success" : "failed") : "success";

  return {
    mode: "openapi",
    startedAt,
    finishedAt,
    status,
    added: counters.added,
    updated: counters.updated,
    skipped: counters.skipped,
    failed: counters.failed,
    total: counters.totalRemote,
    totalRemote: counters.totalRemote,
    outputFolder,
    errorMessage
  };
}

export function buildModeLabel(mode: string): string {
  return "OpenAPI";
}

export function summarizeNotice(result: UnifiedSyncResult): string {
  if (result.status === "failed") {
    return `同步失败：${result.errorMessage || "未知错误"}`;
  }
  const parts: string[] = [];
  if (result.added) parts.push(`新增 ${result.added}`);
  if (result.updated) parts.push(`更新 ${result.updated}`);
  if (result.skipped) parts.push(`跳过 ${result.skipped}`);
  if (result.failed) parts.push(`失败 ${result.failed}`);
  return `同步完成${parts.length ? "：" + parts.join("，") : ""}`;
}
