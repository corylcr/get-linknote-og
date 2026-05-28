import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, GetNotesPluginSettings, PluginSyncState, DEFAULT_SYNC_STATE } from "../types";

type PluginDataOwner = Plugin & {
  settings?: GetNotesPluginSettings;
  state?: PluginSyncState;
};

interface PluginDataShape {
  settings: GetNotesPluginSettings;
  state: PluginSyncState;
}

export class SettingsStore {
  constructor(private plugin: PluginDataOwner) {}

  async load(): Promise<GetNotesPluginSettings> {
    const data = (await this.plugin.loadData()) as Partial<PluginDataShape> | null;
    return {
      ...DEFAULT_SETTINGS,
      ...(data?.settings || {})
    };
  }

  async save(settings: GetNotesPluginSettings): Promise<void> {
    const data = ((await this.plugin.loadData()) as Partial<PluginDataShape> | null) || {};
    const merged: PluginDataShape = {
      settings,
      state: this.plugin.state || data.state || DEFAULT_SYNC_STATE
    };
    await this.plugin.saveData(merged);
  }
}
