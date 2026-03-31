太棒了！既然我们已经确认了 **Kimi CLI 在 `--output-format=stream-json` 模式下能吐出包含 `tool_calls` 的完整执行轨迹**，这就意味着我们可以在**不引入沉重的 RPC / App-Server 架构**的前提下，在前端（Claude Code 的终端）完美复刻 Codex 插件那极具科技感的实时进度追踪和深度审查功能。

这是一份在现有 `lieexxli/kimi-cli-plugin-cc` 基础上，全面对标 `openai/codex-plugin-cc` 的完整升级落地计划：

---

### 阶段一：核心解析层升级 —— 实现“上帝视角”的进度追踪
**目标：** 让 Claude Code 能够像 Codex 一样，实时渲染 Kimi 正在执行的子任务（如读文件、跑命令等），而不是只显示干巴巴的“思考中”。

1. **重写流解析器 (`plugins/kimi/scripts/lib/kimi.mjs`)**
   * **当前状态：** 只提取 `role === "assistant"` 的 `text` 和 `think`。
   * **升级动作：**
       * 增加对 `tool_calls` 字段的拦截。当检测到 `role === "assistant"` 且包含 `tool_calls` 时，解析出工具名称（如 `Shell`, `ReadFile`, `WriteFile`）和参数。
       * 增加对 `role === "tool"` 的拦截，获取工具执行的结果状态（成功/失败）。
       * 通过事件发射器（Event Emitter）或回调函数，将这些细粒度的事件实时推送到任务追踪器。

2. **对接状态机与任务渲染 (`plugins/kimi/scripts/lib/tracked-jobs.mjs` & `render.mjs`)**
   * **借鉴 Codex：** 恢复 Codex 中用于记录子节点状态的数据结构（如 `mcpToolCall`, `commandExecution`, `fileChange`）。
   * **升级动作：**
       * 将 Kimi 解析出的 `Shell` 工具调用映射为 `commandExecution` 进度条。
       * 将 Kimi 解析出的 `ReadFile`/`WriteFile` 映射为 `fileChange` 进度条。
       * 在 `render.mjs` 中，重新启用 Codex 那套华丽的终端 UI（带有 Spinner、Checkmark、以及折叠的工具调用明细）。

---

### 阶段二：恢复高价值业务命令
**目标：** 补齐 Codex 中最受开发者欢迎的深度审查和任务管理命令。

1. **复活对抗性审查 (`plugins/kimi/commands/adversarial-review.md`)**
   * **动作：** 新建命令，允许用户输入 `<focus>`（特定关注点）。
   * **实现：** 组装 Prompt（例如：“请作为严苛的安全专家，重点审查以下代码中关于 `<focus>` 的部分”），然后调用 `kimi.mjs` 的静默模式（`--quiet`）返回纯文本结果。

2. **实现任务恢复 (`plugins/kimi/commands/resume.md` 或在 `task` 中强化)**
   * **Codex 的做法：** 查找本地存储的挂起任务，通过 App-Server 恢复 `threadId`。
   * **Kimi 的做法（更简单）：**
       * 在 `tracked-jobs` 写入本地 JSON 状态文件时，额外记录 Kimi CLI 本次执行的 `--session <SESSION_ID>`。
       * 当用户请求恢复任务时，读取该 Job 的 Session ID，再次 spawn Kimi CLI 并追加 `--continue` 参数，即可完美恢复上次的上下文。

---

### 阶段三：工作流拦截与强制护栏 (Review Gate)
**目标：** 引入 Codex 标志性的“关卡”机制，确保代码质量。

1. **重构生命周期钩子 (`plugins/kimi/hooks/hooks.json`)**
   * **动作：** 加回 `"Stop"` 钩子，并将其指向新的拦截脚本。
   * *注意：超时时间可以根据 Kimi 的响应速度适当调整，比如设为 300 秒或 600 秒。*

2. **实现强制审查关卡 (`plugins/kimi/scripts/stop-review-gate-hook.mjs`)**
   * **动作：** 编写拦截逻辑。
   * **流程：**
       * 当用户在 Claude Code 中输入 `/stop` 或退出时触发。
       * 利用 `git.mjs` 获取当前工作区的未提交 Diff。
       * 如果 Diff 为空，直接放行。
       * 如果有 Diff，自动在后台 spawn Kimi CLI 跑一次审查 Prompt。
       * 如果 Kimi 发现严重问题，在终端阻断退出并打印警告；如果没有问题，放行退出。

3. **提供配置开关 (`plugins/kimi/commands/setup.md` & `kimi-companion.mjs`)**
   * 强制审查可能很烦人，需要像 Codex 一样提供 `--enable-review-gate` 和 `--disable-review-gate` 的参数选项，将其写入用户的配置文件（如 `~/.claude/kimi-plugin-config.json`）。

---

### 阶段四：架构解耦与健壮性优化
**目标：** 确保直接 Spawn 进程的方式在复杂项目下依然稳定。

1. **进程树管理 (`plugins/kimi/scripts/lib/process.mjs`)**
   * **动作：** 由于我们直接 spawn Kimi，如果用户在 Claude Code 强行 `Ctrl+C` 或输入 `/kimi:cancel`，我们需要确保不仅杀掉了 `node` 的 worker 进程，还要干掉底层的 Kimi 二进制进程，避免留下僵尸进程。确保 `tree-kill` 逻辑在 Windows 和 Unix 上都绝对可靠。

2. **去除 Codex 的遗留冗余**
   * 在完成上述补齐后，彻底清理代码库中为了兼容 Codex 遗留下来的空函数、无用的常量定义（比如任何带有 `broker` 或 `rpc` 字样的注释和废弃代码），保持 Kimi 插件的轻量和纯粹。

### 总结路线图 (Roadmap)
* **Sprint 1 (核心攻坚):** 搞定 `stream-json` 的工具调用拦截与 UI 渲染（阶段一）。这是最出彩的部分。
* **Sprint 2 (功能补齐):** 实现 `adversarial-review` 和基于 `--continue` 的任务恢复（阶段二）。
* **Sprint 3 (工作流):** 跑通 `Stop Review Gate` 拦截机制（阶段三）。
* **Sprint 4 (收尾):** 测试进程管理、清理代码、编写 README。

沿着这个计划，你最终得到的将是一个**免去了微服务运维烦恼，但拥有同样强大感知能力的“轻量级满血版 Codex 平替”**！