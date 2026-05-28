import { Plugin } from "obsidian";
import { GetApiClient } from "./src/api/GetApiClient";
import { SyncEngine } from "./src/sync/SyncEngine";
import { SyncLock } from "./src/sync/SyncLock";
import { summarizeNotice } from "./src/sync/resultTypes";
import { GetNotesSettingTab } from "./src/ui/SettingsTab";
import { GetNotesStatusBar } from "./src/ui/StatusBar";
import { showError, showInfo } from "./src/ui/Notices";
import {
  DEFAULT_SETTINGS,
  DEFAULT_SYNC_STATE,
  GetNotesPluginSettings,
  PluginSyncState,
  UnifiedSyncResult
} from "./src/types";
import { SettingsStore } from "./src/storage/SettingsStore";
import { StateStore } from "./src/storage/StateStore";

export default class GetLinkNoteOgPlugin extends Plugin {
  settings: GetNotesPluginSettings = DEFAULT_SETTINGS;
  state: PluginSyncState = DEFAULT_SYNC_STATE;

  private settingsStore = new SettingsStore(this);
  private stateStore = new StateStore(this);
  private syncLock = new SyncLock();
  private statusBar!: GetNotesStatusBar;
  private syncEngine!: SyncEngine;
  private settingsTab!: GetNotesSettingTab;
  private intervalId: number | null = null;
  private ribbonIconEl: HTMLElement | null = null;

  async onload(): Promise<void> {
    this.settings = await this.settingsStore.load();
    this.state = await this.stateStore.load();
    this.statusBar = new GetNotesStatusBar(this);
    this.syncEngine = new SyncEngine(this.app, this);
    this.settingsTab = new GetNotesSettingTab(this.app, this);
    this.addSettingTab(this.settingsTab);
    this.registerCommands();
    this.applyRibbon();
    this.refreshStatusBar();
    this.refreshInterval();

    if (this.settings.autoSyncOnStartup) {
      window.setTimeout(() => {
        void this.syncNow("startup");
      }, 1000);
    }
  }

  onunload(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async updateSettings(patch: Partial<GetNotesPluginSettings>): Promise<void> {
    this.settings = {
      ...this.settings,
      ...patch,
      syncIntervalMinutes: Math.max(5, patch.syncIntervalMinutes ?? this.settings.syncIntervalMinutes)
    };
    await this.settingsStore.save(this.settings);
    this.applyRibbon();
    this.refreshInterval();
    this.refreshSettingsUI();
  }

  async syncNow(trigger: "manual" | "startup" | "interval" = "manual"): Promise<void> {
    const result = await this.syncLock.runExclusive(async () => {
      this.statusBar.setRunning("openapi");
      this.refreshSettingsUI();
      try {
        this.ensureCredentials();
        this.state = await this.syncEngine.sync(this.settings);
        await this.stateStore.save(this.state);
        this.refreshStatusBar();
        this.refreshSettingsUI();
        const summary = this.state.lastSyncSummary as UnifiedSyncResult;
        showInfo(summarizeNotice(summary));
        return summary;
      } catch (error) {
        this.statusBar.setFailed("openapi");
        showError((error as Error).message);
        throw error;
      } finally {
        this.refreshSettingsUI();
      }
    });

    if (!result) {
      showInfo("Get LinkNote OG 同步已在进行中。");
    }
  }

  async rebuildFromCache(): Promise<void> {
    const result = await this.syncLock.runExclusive(async () => {
      this.statusBar.setRunning("openapi");
      this.state = await this.syncEngine.rebuildFromCache(this.settings);
      await this.stateStore.save(this.state);
      this.statusBar.setIdle(this.state.lastSyncAt, "openapi");
      this.refreshSettingsUI();
      showInfo("已完成从缓存重建。");
      return this.state;
    });
    if (!result) showInfo("Get LinkNote OG 同步已在进行中。");
  }

  async testConnection(): Promise<void> {
    this.ensureCredentials();
    const client = new GetApiClient(this.settings.apiKey, this.settings.clientId);
    await client.testConnection();
  }

  isSyncRunning(): boolean {
    return this.syncLock.isRunning();
  }

  refreshSettingsUI(): void {
    this.settingsTab?.display();
  }

  private registerCommands(): void {
    this.addCommand({
      id: "get-linknote-og-sync-now",
      name: "Sync Link Notes Now",
      callback: () => {
        void this.syncNow().catch(() => undefined);
      }
    });

    this.addCommand({
      id: "get-linknote-og-rebuild-from-cache",
      name: "Rebuild Link Notes From Cache",
      callback: () => {
        void this.rebuildFromCache().catch(() => undefined);
      }
    });

    this.addCommand({
      id: "get-linknote-og-open-sync-folder",
      name: "Open Link Notes Sync Folder",
      callback: async () => {
        const adapter = this.app.vault.adapter as any;
        const basePath = adapter.getBasePath?.();
        if (!basePath) {
          showError("打开同步目录仅支持桌面端本地文件库。");
          return;
        }
        const { shell } = require("electron") as { shell: { openPath(path: string): Promise<string> } };
        await shell.openPath(`${basePath}/${this.settings.targetFolder}`);
      }
    });
  }

  private applyRibbon(): void {
    if (this.ribbonIconEl) {
      this.ribbonIconEl.remove();
      this.ribbonIconEl = null;
    }
    if (!this.settings.showRibbonIcon) return;
    this.ribbonIconEl = this.addRibbonIcon("link", "Sync Link Notes", () => {
      void this.syncNow().catch(() => undefined);
    });
  }

  private refreshInterval(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (!this.settings.autoSyncEnabled) return;
    const intervalMs = Math.max(5, this.settings.syncIntervalMinutes) * 60_000;
    this.intervalId = window.setInterval(() => {
      void this.syncNow("interval").catch(() => undefined);
    }, intervalMs);
    this.registerInterval(this.intervalId);
  }

  private refreshStatusBar(): void {
    const status = this.state.lastSyncSummary?.status;
    if (status === "failed") {
      this.statusBar.setFailed("openapi");
      return;
    }
    this.statusBar.setIdle(this.state.lastSyncAt, "openapi");
  }

  private ensureCredentials(): void {
    if (!this.settings.apiKey) throw new Error("请先填写 API Key。");
    if (!this.settings.clientId) throw new Error("请先填写 Client ID。");
  }
}
