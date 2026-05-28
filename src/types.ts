export type SyncMode = "openapi";
export type SyncStatus = "success" | "partial_success" | "failed";
export type CompletenessSource = "api" | "none";

export interface GetNotesPluginSettings {
  syncMode: SyncMode;
  apiKey: string;
  clientId: string;
  targetFolder: string;
  autoSyncOnStartup: boolean;
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  showRibbonIcon: boolean;
}

export interface LinkNote {
  canonicalId: string;
  sourceIds: {
    api?: string;
  };
  title: string;
  createdAt: number | null;
  updatedAt: number | null;
  content: {
    summary: string | null;
    body: string | null;
    sourceUrl: string | null;
  };
  tags: string[];
  notebook: string | null;
  fingerprint: string;
}

export interface SyncStateEntry {
  canonicalId: string;
  filePath: string;
  fingerprint: string;
  deleted: boolean;
  lastSyncedAt: number;
  localSequence: number;
  stem: string;
  sourceIds: {
    api?: string;
  };
  updatedAt: number | null;
  title: string;
}

export interface PluginSyncState {
  schemaVersion: number;
  lastSyncAt?: string;
  nextLocalSequence: number;
  notesByCanonicalId: Record<string, SyncStateEntry>;
  lastSyncSummary?: UnifiedSyncResult;
}

export interface UnifiedSyncResult {
  mode: SyncMode;
  startedAt: string;
  finishedAt: string;
  status: SyncStatus;
  added?: number;
  updated?: number;
  skipped?: number;
  failed?: number;
  total?: number;
  totalRemote?: number;
  outputFolder?: string;
  message?: string;
  errorMessage?: string;
}

export const DEFAULT_SETTINGS: GetNotesPluginSettings = {
  syncMode: "openapi",
  apiKey: "",
  clientId: "",
  targetFolder: "00_Inbox/020 GetLinks",
  autoSyncOnStartup: true,
  autoSyncEnabled: true,
  syncIntervalMinutes: 30,
  showRibbonIcon: true
};

export const DEFAULT_SYNC_STATE: PluginSyncState = {
  schemaVersion: 1,
  nextLocalSequence: 1,
  notesByCanonicalId: {}
};
