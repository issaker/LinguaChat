# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目修改原则

- 沟通语言：使用中文与用户沟通，包括回复、注释和文档。
- 站在全局角度考虑，用架构师视野思考系统实现和设计上的不足。
- 不写防御性代码、不提前兼容未知需求、不写回退兜底，让 bug 暴露出来。
- 发现两处及以上重复代码即抽象。
- 依赖接口而不是实现。一个模块只干一件事。
- 尽量少使用继承，多使用组合。
- 一点一点地增加功能，确保每一步都测试完毕。
- 小心全局状态，多写纯函数。
- 错误应向上传播，不要吞掉（不写 `try {} catch { return [] }` 这类防御性回退）。
- 对于可能失败的操作，写入带识别度的调试日志（`console.warn`/`console.error` 加 `Memo:` 前缀），方便通过 DevTools 发现诊断，禁止用静默回退隐藏 bug。
- 修改后运行 `npx vite build` 验证零错误。

## 项目简介

LinguaChat (语伴) — AI 外语伴学桌面应用。用户和 AI 角色聊天，AI 同时回复外语+母语翻译，单词可点击查义，AI 自动纠错。支持多角色群聊、SM2 间隔重复复习。

## 技术栈

- **桌面壳**: Electron (macOS titleBarStyle: hiddenInset)
- **前端**: React 18 + TypeScript + Vite 5
- **样式**: Tailwind CSS 3
- **状态管理**: Zustand (persist 中间件 → localStorage)
- **AI API**: 通过 LLM 服务提供（翻译、查词、聊天回复均走 LLM，不再依赖 Google Translate API）
- **TTS**: Web Speech API (macOS 原生语音引擎，完全本地)
- **本地词典**: CC-CEDICT 开源中英词典（`npm run cedict` 下载更新）
- **复习算法**: SM2

## 常用命令

```bash
npm run dev:web              # 浏览器开发模式（快速调试 UI）
npm run dev                  # 完整 Electron 开发模式
npm run build:renderer       # Vite 构建前端
npm run build:electron       # tsc 编译 Electron 主进程
npm run build                # 前端 + 主进程
npm run dist:mac             # macOS 打包
npm run cedict               # 下载/更新 CC-CEDICT 本地词典
npm run preview              # 预览构建产物
```

## 项目架构

### 核心数据流

```
用户输入 → ChatWindow.handleSend
  ├── translateViaLLM (异步，将用户母语译为外语，走 LLM)
  ├── 上下文压缩 (超过阈值时调用 LLM 压缩旧消息)
  ├── LLM API 调用 (流式/非流式)
  └── parseTranslation → 提取翻译/纠错 → 渲染

单词点击 → WordSpan.onClick → WordDetail
  ├── dictionary.lookup (本地词典，零 token)
  └── lookupWordViaLLM (本地未命中时 LLM 兜底)
```

### 状态管理层 (Zustand + persist → localStorage)

| Store | 用途 | localStorage key |
|-------|------|-----------------|
| `settingsStore` | API 配置、语言对、语速、压缩阈值等 | `linguachat-settings` |
| `chatStore` | 对话列表、消息、流式状态 | `linguachat-conversations` |
| `characterStore` | 角色列表、活跃角色、场景 | `linguachat-characters` |
| `flashcardStore` | 单词本卡片、SM2 调度数据 | `linguachat-flashcards` |

每个 Store 用 `persist` 中间件自动持久化。新增字段须同时添加 Interface + DEFAULT_SETTINGS，并在 persist merge 中处理旧数据兼容。

### 视图切换 (App.tsx)

```
App (view state: 'chat' | 'settings' | 'memo')
 ├── chat    → ChatWindow (主聊天)
 ├── settings → SettingsPanel (API/语言/语音配置)
 └── memo   → ReviewView (单词本 + SM2 复习)
```

### 服务层

| 服务 | 功能 | 调用方 |
|------|------|--------|
| `services/llm.ts` | LLM API 调用 + System Prompt + `translateViaLLM` + `lookupWordViaLLM` +  Provider 分发 | ChatWindow, WordDetail, compression |
| `services/compression.ts` | 对话历史压缩（超阈值时用 LLM 总结旧消息） | ChatWindow |
| `services/dictionary.ts` | CC-CEDICT 本地词典懒加载查询（12 万条中英词条） | WordDetail |
| `services/translate.ts` | 仅剩 `LANGUAGES` 映射和 `getLangCode`（供 TTS 和设置面板使用） | MessageBubble, WordDetail, SettingsPanel |
| `services/tts.ts` | Web Speech API 语音朗读 | MessageBubble, WordDetail |
| `services/sm2.ts` | SM2 间隔重复算法 | flashcardStore |

### 服务关键模式

```
Provider 分发（llm.ts）:
  所有 LLM 调用通过 createClient (OpenAI) 或 createAnthropicClient 统一创建客户端。
  4 个调用点: sendMessage, sendGroupMessage, translateViaLLM, lookupWordViaLLM
  compression.ts 的 summarizeHistory 也复用这两个工厂函数。

翻译回退链:
  用户翻译: translateViaLLM (LLM) → 失败时 translationStatus='failed'
  单词查义: dictionary.lookup (本地) → 未命中 → lookupWordViaLLM (LLM)
```

### 组件目录

```
components/
├── Chat/           # 聊天核心
│   ├── ChatWindow.tsx      # 主容器 (发送/翻译/压缩/流式接收)
│   ├── MessageBubble.tsx   # 消息气泡 (双语/单词点击/纠错/TTS)
│   ├── InputArea.tsx       # 输入框 (Enter发送, Shift+Enter换行)
│   ├── WordSpan.tsx        # 可点击单词 (支持CJK逐字/拉丁整词)
│   └── TypingIndicator.tsx # 打字指示器
├── Characters/     # 角色系统
├── Settings/       # 设置面板
├── Memo/           # 单词本复习 (SM2)
├── Common/         # 通用组件
│   └── WordDetail.tsx     # 单词释义弹窗 (本地词典 → LLM 兜底)
└── Sidebar/        # 侧边栏
```

### 工具模块

```
utils/
├── id.ts     — generateId(prefix) 生成唯一 ID
└── text.ts   — CJK_RE, isCJK(), tokenizeText() 文本分词
```

## 关键模式

### 消息双语结构
AI 回复: 外语为主内容，`\n---\n` 分隔后为母语翻译。
用户消息: 母语内容，通过 `translateViaLLM` 异步翻译为外语（`translationStatus: 'pending' | 'loaded' | 'failed'`）。

### Provider 兼容
- `openai` / `openrouter` / `ollama` → 走 OpenAI 兼容客户端 (`createClient`)
- `anthropic` → 走 Anthropic SDK (`createAnthropicClient`)
- `sendGroupMessage` 和 `summarizeHistory` 均支持 Anthropic

### 上下文压缩
超过 `settings.compressionTokenLimit` (默认 30000) 时触发：
1. 保留最近 40 条完整消息
2. 调用 LLM 将旧消息压缩为摘要
3. 摘要作为 system 消息插入，保留旧消息的 ID 以保护并发的翻译更新

### 查词回退链
1. `dictionary.lookup(word)` — 先试中→英，再试英→中，双向本地词典
2. 均未命中 → `lookupWordViaLLM(word)` — LLM API 调用，结果缓存（LRU 上限 500）

### 本地词典维护
```bash
npm run cedict  # 从 MDBG 下载最新 CC-CEDICT，转换为中→英 JSON
npm run ecdict  # 从 CC-CEDICT 提取英文释义，构建英→中反向索引
```
分别输出到 `src/renderer/public/dictionaries/cedict.json`（~12MB，中→英）和 `ecdict.json`（~10MB，英→中）。`dictionary.ts` 同时加载两份，查询时正向反向依次尝试。

### 角色预设数据
`src/renderer/src/data/presetCharacters.ts` — 8 个预设角色 + 7 个场景。每角色有 emoji、身份、人物小传、性格、说话风格。新增角色直接扩展该文件。

## 关键约束

- 不要在 services/llm.ts 中重复 `if (apiProvider === 'anthropic')` 分支模式 —— 使用 `createClient()` / `createAnthropicClient()` 工厂函数。
- 不要引入新的 Google Translate API 依赖。翻译和查词全部走 LLM API 通道。
- Message ID 使用 `generateId('msg-')`，不要用 `Date.now()` 内联生成。
- `settings.apiKey` 守卫统一用 `.trim()` 处理空白值。
