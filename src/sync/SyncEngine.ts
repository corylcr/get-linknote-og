import { App, normalizePath, Plugin } from "obsidian";
import { GetApiClient } from "../api/GetApiClient";
import { GetNoteDetail, GetNoteSummary } from "../api/types";
import { canonicalizeLinkNote } from "../canonical/linkNote";
import { renderLinkNoteMarkdown } from "../canonical/render";
import { RawCacheStore } from "../storage/RawCacheStore";
import { StateStore } from "../storage/StateStore";
import { nextCursor, noteIdentity, pickItems, unwrapData } from "../storage/helpers";
import { GetNotesPluginSettings, PluginSyncState, SyncStateEntry } from "../types";
import { debugLog } from "../utils/logger";
import { ensureVaultFolder, removePathIfExists, toVaultRelativePath, upsertVaultFile } from "../utils/path";
import { nowIso } from "../utils/time";
import { SyncCounters, toLastSyncSummary } from "./SyncResult";

function detailFromPayload(payload: unknown): GetNoteDetail | null {
  const data = unwrapData(payload);
  return (data?.note || data || null) as GetNoteDetail | null;
}

export class SyncEngine {
  private rawCache: RawCacheStore;
  private stateStore: StateStore;

  constructor(private app: App, private plugin: Plugin) {
    this.rawCache = new RawCacheStore(app, plugin.manifest.id);
    this.stateStore = new StateStore(plugin);
  }

  async sync(settings: GetNotesPluginSettings): Promise<PluginSyncState> {
    const startedAt = nowIso();
    const counters: SyncCounters = { added: 0, updated: 0, skipped: 0, failed: 0, totalRemote: 0 };
    const state = await this.stateStore.load();

    try {
      await ensureVaultFolder(this.app, settings.targetFolder);
      const client = new GetApiClient(settings.apiKey, settings.clientId);
      const summaries = await this.fetchAllSummaries(client);
      counters.totalRemote = summaries.length;

      for (const summary of summaries) {
        const noteType = summary.note_type || "";
        if (noteType !== "link") {
          counters.skipped += 1;
          continue;
        }

        try {
          const detailPayload = await client.getNoteDetail(noteIdentity(summary));
          const detail = detailFromPayload(detailPayload);
          const note = canonicalizeLinkNote(summary, detail);

          if (!note.content.body && !note.content.summary) {
            counters.skipped += 1;
            continue;
          }

          const existingEntry = state.notesByCanonicalId[note.canonicalId];
          if (existingEntry && existingEntry.fingerprint === note.fingerprint) {
            counters.skipped += 1;
            continue;
          }

          const localSequence = existingEntry?.localSequence ?? state.nextLocalSequence++;
          const stem = `${note.title.replace(/[\/\\:*?"<>|]/g, "_").slice(0, 100)}-${note.sourceIds.api || ""}`.slice(0, 160);
          const filePath = normalizePath(`${settings.targetFolder}/${stem}.md`);

          const markdown = renderLinkNoteMarkdown(note);
          await upsertVaultFile(this.app, filePath, markdown);

          if (existingEntry) {
            if (existingEntry.filePath !== filePath) {
              await removePathIfExists(this.app, existingEntry.filePath);
            }
            counters.updated += 1;
          } else {
            counters.added += 1;
          }

          state.notesByCanonicalId[note.canonicalId] = {
            canonicalId: note.canonicalId,
            filePath,
            fingerprint: note.fingerprint,
            deleted: false,
            lastSyncedAt: Date.now(),
            localSequence,
            stem,
            sourceIds: note.sourceIds,
            updatedAt: note.updatedAt,
            title: note.title
          };

          if (note.sourceIds.api) {
            await this.rawCache.write(note.sourceIds.api, {
              summary,
              detailPayload,
              detail,
              original: null
            });
          }
        } catch (error) {
          counters.failed += 1;
          debugLog("sync link note failed", noteIdentity(summary), error);
        }
      }

      state.lastSyncAt = nowIso();
      state.lastSyncSummary = toLastSyncSummary(counters, startedAt, nowIso(), settings.targetFolder);
      await this.stateStore.save(state);
      return state;
    } catch (error) {
      state.lastSyncSummary = toLastSyncSummary(
        counters,
        startedAt,
        nowIso(),
        settings.targetFolder,
        (error as Error).message
      );
      await this.stateStore.save(state);
      throw error;
    }
  }

  async rebuildFromCache(settings: GetNotesPluginSettings): Promise<PluginSyncState> {
    const state = await this.stateStore.load();
    await ensureVaultFolder(this.app, settings.targetFolder);

    let rebuilt = 0;
    let failed = 0;
    let skipped = 0;

    for (const entry of Object.values(state.notesByCanonicalId).sort((a, b) => a.localSequence - b.localSequence)) {
      if (entry.deleted) { skipped += 1; continue; }
      const apiId = entry.sourceIds.api;
      if (!apiId) { skipped += 1; continue; }

      const raw = await this.rawCache.read(apiId);
      if (!raw) { failed += 1; continue; }

      try {
        const note = canonicalizeLinkNote(raw.summary, raw.detail);
        const markdown = renderLinkNoteMarkdown(note);
        await upsertVaultFile(this.app, entry.filePath, markdown);
        entry.fingerprint = note.fingerprint;
        rebuilt += 1;
      } catch {
        failed += 1;
      }
    }

    state.lastSyncAt = nowIso();
    state.lastSyncSummary = {
      mode: "openapi",
      startedAt: state.lastSyncAt,
      finishedAt: state.lastSyncAt,
      status: failed > 0 ? (rebuilt > 0 ? "partial_success" : "failed") : "success",
      added: 0,
      updated: rebuilt,
      skipped,
      failed,
      total: rebuilt + skipped + failed,
      totalRemote: rebuilt + skipped + failed,
      outputFolder: settings.targetFolder
    };
    await this.stateStore.save(state);
    return state;
  }

  private async fetchAllSummaries(client: GetApiClient): Promise<GetNoteSummary[]> {
    let sinceId = "0";
    const seen = new Set<string>();
    const summaries: GetNoteSummary[] = [];

    for (;;) {
      const page = await client.listNotes(sinceId);
      const items = pickItems(page) as GetNoteSummary[];
      if (!items.length) break;

      let added = 0;
      for (const item of items) {
        const id = noteIdentity(item);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        summaries.push(item);
        added += 1;
      }

      const cursor = nextCursor(page, items);
      if (!cursor || added === 0 || cursor === sinceId) break;
      sinceId = cursor;
    }

    return summaries;
  }
}
