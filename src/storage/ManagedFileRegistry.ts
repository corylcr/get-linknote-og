import { App, normalizePath } from "obsidian";
import { PluginSyncState } from "../types";
import { removePathIfExists } from "../utils/path";

export class ManagedFileRegistry {
  constructor(private app: App) {}

  async clearManagedContent(targetFolder: string, state?: PluginSyncState): Promise<void> {
    const managedPaths = new Set<string>();

    for (const noteState of Object.values(state?.notesByCanonicalId || {})) {
      if (noteState.filePath) managedPaths.add(normalizePath(noteState.filePath));
    }

    if (managedPaths.size > 0) {
      for (const filePath of managedPaths) {
        await removePathIfExists(this.app, filePath);
      }
    }
  }
}
