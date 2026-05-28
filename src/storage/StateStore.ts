import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, DEFAULT_SYNC_STATE, PluginSyncState } from "../types";

type PluginDataOwner = Plugin & {
  settings?: GetNotesPluginSettings;
  state?: PluginSyncState;
};

import type { GetNotesPluginSettings } from "../types";

interface PluginDataShape {
  settings: GetNotesPluginSettings;
  state: PluginSyncState;
}

export class StateStore {
  constructor(private plugin: PluginDataOwner) {}

  async load(): Promise<PluginSyncState> {
    const data = (await this.plugin.loadData()) as Partial<PluginDataShape> | null;
    const rawState = data?.state;
    return {
      ...DEFAULT_SYNC_STATE,
      ...(rawState || {}),
      notesByCanonicalId: {
        ...DEFAULT_SYNC_STATE.notesByCanonicalId,
        ...(rawState?.notesByCanonicalId || {})
      }
    };
  }

  async save(state: PluginSyncState): Promise<void> {
    const data = ((await this.plugin.loadData()) as Partial<PluginDataShape> | null) || {};
    const merged: PluginDataShape = {
      settings: this.plugin.settings || data.settings || DEFAULT_SETTINGS,
      state
    };
    await this.plugin.saveData(merged);
  }
}
