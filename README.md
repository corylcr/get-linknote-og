# Get LinkNote OG

Obsidian 插件，通过 Get OpenAPI 将 **链接笔记的原文** 同步到你的 Vault。

基于 [obsidian-get-notes](https://github.com/JinzheAI/obsidian-get-notes) 的架构简化而来，专注于提取 Get 中 AI 链接笔记的 `web_page.content`（链接原文）。

## 为什么需要这个插件

Get 的 AI 链接笔记有两个核心内容：

- **AI 分析**：Get 自动生成的结构化总结
- **链接原文**：被收藏网页的原始文本

[obsidian-get-notes](https://github.com/JinzheAI/obsidian-get-notes) 同步的是 AI 分析部分，链接原文（`web_page.content`）没有被提取。本插件填补了这个缺口。

## 同步结果

每篇链接笔记会生成如下结构的 Markdown：

```markdown
# 笔记标题

## 原文
（链接原文，即 web_page.content）

## AI 分析
（Get 自动生成的 AI 总结）

## 来源
- [笔记标题](https://原始链接)

## 标签
#tag1 #tag2
---
source: api
updated: 2026-05-28T...
canonicalId: api:xxx
```

## 安装

### 方式一：手动安装 Release

1. 从 [Releases](https://github.com/corylcr/get-linknote-og/releases) 下载最新版本的 `main.js`、`manifest.json`、`styles.css`
2. 在你的 Vault 中创建目录：`.obsidian/plugins/get-linknote-og/`
3. 将三个文件放入该目录
4. 重启 Obsidian，在 设置 → 社区插件 中启用 **Get LinkNote OG**

### 方式二：从源码构建

```bash
git clone https://github.com/corylcr/get-linknote-og.git
cd get-linknote-og
npm install
npm run build
```

将生成的 `main.js`、`manifest.json`、`styles.css` 复制到 Vault 的插件目录。

## 配置

1. 打开 插件设置
2. 填写 **API Key** 和 **Client ID**（从 [Get OpenAPI](https://www.biji.com/openapi?tab=keys) 获取）
3. 点击 **测试连接** 确认正常
4. 点击左侧栏图标或使用命令面板执行同步

### 可选配置

| 设置 | 说明 | 默认值 |
|------|------|--------|
| 同步目标目录 | 链接笔记保存到 Vault 中的路径 | `00_Inbox/020 GetLinks` |
| 启动时自动同步 | 打开 Obsidian 时自动同步一次 | 开启 |
| 定时自动同步 | 按设定间隔自动同步 | 开启，30 分钟 |
| 显示侧边栏图标 | 在左侧栏显示同步按钮 | 开启 |

## 命令

- **Sync Link Notes Now**：立即同步
- **Rebuild Link Notes From Cache**：从本地缓存重建（不需要网络）
- **Open Link Notes Sync Folder**：在文件管理器中打开同步目录

## 同步行为

- 仅同步 `note_type === "link"` 的笔记，其他类型（语音、纯文本等）会跳过
- 增量同步：通过 fingerprint 比对，内容未变化的笔记不会重复写入
- 每篇笔记的原始 API 响应会缓存在插件的 `raw-cache` 目录，支持离线重建

## 技术细节

- 从 `detail.web_page.content` 提取链接原文
- 从 `detail.content` 提取 AI 分析
- 从 `detail.web_page.url` 或 `attachments` 中的 link 类型提取来源链接
- 不依赖 Playwright，仅使用 API 模式

## 开发

```bash
npm install
npm run dev      # 开发模式（监听文件变化）
npm run build    # 生产构建
```

## License

MIT
