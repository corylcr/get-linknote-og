import { PluginSettingTab, Setting } from "obsidian";
import { GetNotesPluginSettings } from "../types";

export class GetNotesSettingTab extends PluginSettingTab {
  private plugin: any;

  constructor(app: any, plugin: any) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Get LinkNote OG Settings" });

    new Setting(containerEl)
      .setName("API Key")
      .setDesc("Get OpenAPI Key")
      .addText((text) =>
        text
          .setPlaceholder("输入你的 API Key")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ apiKey: value });
          })
      );

    new Setting(containerEl)
      .setName("Client ID")
      .setDesc("Get OpenAPI Client ID")
      .addText((text) =>
        text
          .setPlaceholder("输入你的 Client ID")
          .setValue(this.plugin.settings.clientId)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ clientId: value });
          })
      );

    new Setting(containerEl)
      .setName("测试连接")
      .setDesc("测试 API 连接是否正常")
      .addButton((button) =>
        button.setButtonText("测试").onClick(async () => {
          try {
            await this.plugin.testConnection();
            button.setButtonText("成功").setDisabled(true);
            window.setTimeout(() => {
              button.setButtonText("测试").setDisabled(false);
            }, 2000);
          } catch (error) {
            button.setButtonText("失败").setDisabled(true);
            window.setTimeout(() => {
              button.setButtonText("测试").setDisabled(false);
            }, 2000);
          }
        })
      );

    new Setting(containerEl)
      .setName("同步目标目录")
      .setDesc("链接原文保存到 Vault 中的目录")
      .addText((text) =>
        text
          .setPlaceholder("00_Inbox/020 GetLinks")
          .setValue(this.plugin.settings.targetFolder)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ targetFolder: value });
          })
      );

    new Setting(containerEl)
      .setName("启动时自动同步")
      .setDesc("打开 Obsidian 时自动同步一次")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoSyncOnStartup).onChange(async (value) => {
          await this.plugin.updateSettings({ autoSyncOnStartup: value });
        })
      );

    new Setting(containerEl)
      .setName("定时自动同步")
      .setDesc("开启后按设定间隔自动同步")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoSyncEnabled).onChange(async (value) => {
          await this.plugin.updateSettings({ autoSyncEnabled: value });
        })
      );

    new Setting(containerEl)
      .setName("同步间隔（分钟）")
      .setDesc("最小 5 分钟")
      .addText((text) =>
        text
          .setPlaceholder("30")
          .setValue(String(this.plugin.settings.syncIntervalMinutes))
          .onChange(async (value) => {
            const minutes = parseInt(value, 10);
            if (Number.isFinite(minutes)) {
              await this.plugin.updateSettings({ syncIntervalMinutes: minutes });
            }
          })
      );

    new Setting(containerEl)
      .setName("显示侧边栏图标")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showRibbonIcon).onChange(async (value) => {
          await this.plugin.updateSettings({ showRibbonIcon: value });
        })
      );
  }
}
