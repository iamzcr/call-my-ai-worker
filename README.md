# Call My AI Worker

一次提问，多个 AI 站点同时回答。两种模式：

- **网页模式**：同页 iframe 平铺各 AI 网页，`content_scripts` 一键把问题分发到所有选中的站点，并跟踪回答状态。
- **API 模式**：接入任意 OpenAI 兼容接口供应商（默认 opencode / OpenRouter），拉取模型列表、搜索多选模型、流式输出文字答案。

## 特性

- **一次提问，多站点并行**：在侧边栏勾选多个 AI，输入问题后一键分发到所有选中站点。
- **国内 / 海外分组**：内置国内（DeepSeek、千问、Kimi、豆包、智谱清言、腾讯元宝、MiniMax、知乎直答）与海外（Gemini、ChatGPT、Copilot、Grok、Claude）站点，侧边栏分组展示。默认勾选 DeepSeek、千问、Kimi。
- **上下文保持**：同一窗口内追问会自动延续各站点对话；第二轮改动勾选时，仍选中的站点 iframe 保留（上下文不丢），新增站点以新对话开始，取消的站点直接移除。
- **单站点刷新**：每个站点行有「↻ 刷新并重问」按钮，可单独重载该站点页面并重新提交当前问题。
- **停止回答**：「停止」按钮会点击各站点的停止生成按钮并中断跟踪，不再关闭插件窗口。
- **附件支持**：可为提问附带多个文件，通过文件输入框赋值 / 拖拽 drop / 点击附件按钮多策略注入各站点（不支持附件的站点由站点自行忽略）。
- **可配置站点**：选项页可增删站点、调整输入框/发送/停止/附件等选择器，支持选择器测试与配置导入导出。
- **iframe 嵌入**：通过 declarativeNetRequest 剥离目标站点的 `Content-Security-Policy` / `X-Frame-Options` 响应头以允许内嵌。
- **API 模式**：供应商 = Base URL + API Key，自动拼 `{baseUrl}/models` 拉取模型（可覆盖地址）；搜索 + 多选下拉选模型；SSE 流式逐字输出；每个模型各自保留上下文；**附件功能当前暂屏蔽**（图片 `image_url` / 文本内嵌 / 二进制 `file` 部件的逻辑已保留，后续再启用）；答案**默认渲染为排版 Markdown**，面板头部可切换「原文」源码；`↻` 重问、`⧉` 复制原始 Markdown。
- **双模式切换**：侧边栏顶部「网页 / API」一键切换，选择 API 模式时回显供应商与模型相关设置；切换时**保留各模式已生成的会话与回答**，来回切换互不清空。
- **Agent 模式（AI 操作浏览器）**：第三个模式。让模型读取你**当前正在浏览的标签页**（DOM 元素快照），通过工具调用执行点击/输入/按键/滚动/跳转/下载视频等动作，循环直到完成目标（如"打开B站找视频并下载"、把标题发给我）；右侧日志面板实时展示每个动作；支持停止与最大步数限制。模型沿用 API 模式的供应商与 Key，单独选择 Agent 模型。B站下载在页面上下文内完成（fetch 流 + blob 保存，浏览器自动带 Referer/Cookie），无需额外权限；720p+ 需登录态，DASH 音视频分开下载需合并。

## 安装

1. 打开 `chrome://extensions`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本目录
4. 点击工具栏图标打开主界面（或点击扩展图标）

## 使用

1. 左侧侧边栏顶部切换模式：**网页** 或 **API**
2. 网页模式：勾选要提问的 AI 站点（按 国内/海外 分组，默认勾选 DeepSeek、千问、Kimi）
3. API 模式：
   - 选择供应商（默认 **opencode-go**：`https://opencode.ai/zen/go/v1`，Go 订阅；**opencode**：`https://opencode.ai/zen/v1`，按量 Credits；OpenRouter：`openrouter.ai/settings/keys`）
   - 供应商支持**多个 Key**：在「添加新的 API Key」输入框粘贴保存即可加入列表，之后可从下拉切换当前使用的 Key，也可删除；选项页同步管理
   - 已有 Key 时自动拉取模型列表；搜索并多选模型（全选/清空），可为模型加载图片附件
4. 在输入框填写问题，回车或点击「提问」
5. 右侧内容区展示各站点实时网页 / 流式文字答案，徽标显示加载/生成/已答完等状态
6. 可随时：
   - 点击某站点行切换查看该站点的右侧页面
   - 点击「↻」单独刷新某个站点并重问
   - 点击「⧉」复制某模型答案（API 模式）
   - 点击「停止」让所有站点停止生成
   - 点击「新对话」重置会话
   - 点击「＋ 附件」为本次提问附带文件（**暂屏蔽**，后续再开发）

## 工作原理

- **主界面**（`app/app.html`）：左侧侧边栏负责提问与模式管理，右侧 `#frames` 内平铺各选中站点/模型的展示面板（一次只显示一个，切换查看）。核心壳 `app/app.js` 提供模式切换、状态徽标与面板切换共用机制，网页逻辑在 `app/web-mode.js`，API 逻辑在 `app/api-mode.js`。
- **后台**（`background/service-worker.js`）：维护网页模式会话状态，通过 `webNavigation` 监听 iframe，用 `chrome.scripting` 向目标 frame 注入 `content/lib.js` + `content/fill-watch.js`；转发提问、停止、附件等消息，汇总 `answer-update` / `answer-done` 广播给主界面。
- **内容脚本**（`content/fill-watch.js`）：收到 `ask-question` 后，等待输入框出现 → 填入问题 → 提交（Enter 或点击发送按钮）→ 轮询提取答案 → 上报状态；支持 `stop-answer`（点击站点停止按钮）与附件注入。
- **公共库**（`content/lib.js`）：输入框查找/聚焦/填充、提交、停止按钮、发送按钮、附件注入、答案提取、完成判定（停止按钮消失或答案稳定）等。
- **站点配置**（`lib/providers.js`）：内置站点列表及各站点 DOM 选择器，可通过选项页覆盖保存到 `chrome.storage.local`。
- **API 供应商库**（`lib/api-providers.js`）：供应商增删改、模型列表拉取（带缓存）、OpenAI 风格 SSE 流式对话、附件内容构建、多 Key 管理、API 错误分类提示，纯逻辑无 DOM，供主界面与选项页复用。
- **Markdown 渲染**：API 面板使用本地打包的 [marked](https://github.com/markedjs/marked)（MIT）解析 + [DOMPurify](https://github.com/cure53/DOMPurify)（Apache-2.0 / MPL-2.0）清洗防 XSS；面板头部「原文」按钮可在渲染视图与源码间切换，复制保留原始 Markdown。
- **API 模式**：页面内直接 `fetch` 供应商接口（扩展具备 `<all_urls>` 主机权限，无 CORS 限制），每个模型独立 `AbortController` 控制流式输出与停止，按模型保留对话历史实现追问上下文。

## 打包发布（Edge / Chrome 商店）

```powershell
powershell -ExecutionPolicy Bypass -File scripts\package.ps1
```

- 默认自动 **patch 递增** `manifest.json` 版本（商店要求每次提交版本递增），可用 `-Bump minor|major|none` 控制
- 只打包发布所需文件（排除 `.git` / `_metadata` / 脚本 / 文档 / 临时文件），生成 `dist/call-my-ai-worker-v<版本>.zip`
- 打包后自动校验：manifest 引用文件齐全、扫描疑似硬编码密钥（误报可忽略）、列出 zip 条目
- 产物 zip 直接用于 Chrome Web Store 与 Edge Add-ons 上传；上架时需在后台说明权限用途并声明第三方库（marked / DOMPurify）

## 选项页

点击主界面右上角「⚙」打开站点配置：

- 每个站点可配置：名称、URL、输入框选择器、提交方式（回车/按钮）、发送按钮选择器、停止按钮选择器、重新生成选择器、答案选择器、附件输入框选择器、附件按钮选择器、备注。
- 可新增自定义站点、删除站点、导出/导入站点配置（JSON）。
- 「测试选择器」会打开站点并高亮找到的输入框，用于站点改版后校准选择器。
- **API 供应商**：可新增/编辑/删除多个供应商（名称、Base URL、多个 API Key、可选模型列表地址）；Key 以列表形式管理（添加/删除/标记当前）。「测试连接」会拉取一次模型列表验证配置。内置 opencode-go、opencode、OpenRouter 三个预设。

## 目录结构

```
├── manifest.json          # 扩展清单（MV3）
├── rules.json             # declarativeNetRequest 规则（剥 CSP / X-Frame-Options）
├── background/
│   └── service-worker.js  # 后台：会话管理、iframe 注入、消息路由
├── content/
│   ├── lib.js             # 内容脚本公共库
│   ├── fill-watch.js      # 填充提问、跟踪答案、停止、附件注入
│   ├── agent.js           # Agent 模式：页面快照 + 动作执行
│   └── test-selector.js   # 选项页「测试选择器」辅助脚本
├── lib/
│   ├── providers.js       # 内置站点列表与默认设置
│   ├── api-providers.js   # API 供应商：增删改、模型拉取、流式对话、附件构建
│   ├── marked.umd.js      # Markdown 解析（MIT，本地打包）
│   └── dompurify.js       # HTML 清洗防 XSS（Apache-2.0/MPL-2.0，本地打包）
├── app/                   # 主界面（问答）
│   ├── app.html
│   ├── app.js             # 核心壳：模式切换、共用机制、事件分发
│   ├── web-mode.js        # 网页模式模块
│   ├── api-mode.js        # API 模式模块
│   ├── agent-mode.js      # Agent 模式：模型操作当前浏览器页面
│   ├── init.js            # 启动入口（符合 MV3 CSP）
│   └── app.css
├── options/               # 选项页（站点配置 + API 供应商）
│   ├── options.html
│   ├── options.js         # 网页站点配置
│   ├── api-options.js     # API 供应商管理
│   └── options.css
└── icons/                 # 扩展图标
scripts/
  └── package.ps1          # 商店打包脚本（版本自增 + zip + 校验）
```

## 注意事项与限制

- 需要先在各站点浏览器里登录好账号（或站点支持免登录）。
- 站点改版导致选择器失效时，用选项页「测试选择器」校准。
- 海外站点（ChatGPT / Claude / Gemini 等）反嵌入较强、需要登录，剥离响应头后能否 iframe 显示需实测；不适用时可用行内「在新标签页打开」。
- 某些站点（如 MiniMax）可能有积分/登录限制，页面反复跳转属站点自身行为，扩展无法阻止；此时对应站点会显示空状态，不影响其他站点。
- 大文件附件经 base64 传输可能较慢或超限，建议常规文档/图片尺寸使用。
- 部分站点不识别程序化派发的键盘/粘贴事件，自动提交可能失败，可在页面内手动操作（状态不显示红色失败，仅留空）。
- API 模式附件功能**当前暂屏蔽**（部分 OpenAI 兼容下游不识别 `image_url`/`file` content 部件，待后续按模型原生协议适配后再启用）。
- API 模式依赖供应商接口的 OpenAI 兼容 `chat/completions` 端点；opencode/opencode-go 目录中的部分模型（如 GPT / Claude / Gemini 官方仅提供 `/responses`、`/messages` 等协议）可能无法通过该端点调用，会显示失败原因，不影响其他模型。
- **余额/Key 相关错误**：`CreditsError` 表示该 Key 对应工作区（opencode Zen）余额不足——OpenCode Go 订阅额度与 Zen 按量 Credits 是两套计费，Go 订阅不进入 API 的 Credits 余额，需到工作区账单页充值或改用其他供应商/Key。其余 401/429/模型不可用均有友好提示。
- API Key 保存在 `chrome.storage.local`，仅本机浏览器内使用。
