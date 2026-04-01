# 适用于 Claude Code 的 Kimi CLI 插件

[![GitHub License](https://img.shields.io/github/license/lieexxli/kimi-cli-plugin-cc)](LICENSE)
[![Status](https://img.shields.io/badge/status-active-success.svg)]()

> 基于 `openai/codex-plugin-cc` 进行深度“减法”重构与 Kimi 特性适配。摒弃沉重的 RPC 架构，换取针对 `kimi-cli` 的极致性能与全自动生产力转化。

[English](README.md) | 简体中文

---

## 🚀 项目定位：从“装甲运钞车”到“超跑”的进化

本项目是在 `openai/codex-plugin-cc` 基础上进行的**大幅度简化与适配重构**。原版 Codex 插件追求的是企业级的“绝对安全”，而 **Kimi CLI Plugin** 则专注于利用 Kimi 的长文本原生能力与极致的响应速度。

### 核心差异对比

| 特性 | Codex 原版 (`codex-plugin-cc`) | Kimi 适配版 (本项目) |
| :--- | :--- | :--- |
| **底层架构** | **RPC / Broker 服务端**（重度状态维持） | **原生子进程 (Spawn)**（低延迟，轻量化） |
| **执行策略** | **强制 Review Gate**（人工确认） | **全自动 YOLO**（默认开启 `--yolo`，自动驾驶） |
| **解析机制** | **重度遥测解析**（复杂工具追踪） | **流式实时解析**（实时查看思考链路与工具执行） |
| **设计哲学** | 工业级安全性，通过审计防止幻觉 | 高吞吐率，以开发者为中心的自动化 |

---

## ✨ 核心特性

- **🚀 零配置快速启动**：不再需要复杂的 Broker 代理配置，只要 `kimi` 在你的 PATH 中，即可直接调用。
- **📊 实时进度追踪**：在终端实时渲染 Kimi 的执行轨迹（Shell、文件操作等），并配有动态状态图标（⏳, ✅, ❌）。
- **🧠 深度思考模式集成**：原生支持 `--thinking` 参数，允许强制 Kimi 在行动前进行深度逻辑拆解。
- **⚡ 静默全自动执行**：底层强制注入 `--yolo` 标志，确保复杂任务无需反复手动确认。
- **🛡️ 对抗性审查**：新增专门的安全性代码审计模式，以极其严苛的视角挖掘隐藏 Bug。
- **⚠️ 退出安全关卡**：在退出会话时自动扫描未提交更改，防止带着 Bug 下班。
- **🔄 Session 延续能力**：通过 `--session` 完美继承 Kimi 的会话一致性。

---

## 📖 使用指南

### 核心命令

| 命令 | 描述 |
| :--- | :--- |
| `/kimi:task` | 发起任务（重构、Debug、写功能等）。 |
| `/kimi:status` | 查看后台任务状态及**实时工具执行进度**。 |
| `/kimi:review` | 对当前 Git 更改进行标准代码审查。 |
| `/kimi:adversarial-review` | **对抗性审计模式**，以更严苛的视觉扫描安全性问题。 |
| `/kimi:result` | 查看已完成任务的最终输出。 |
| `/kimi:cancel` | 终止正在运行的后台任务。 |
| `/kimi:resume` | 通过 Job ID 恢复之前的 Kimi 会话。 |
| `/kimi:setup` | 验证 Kimi CLI 环境与安装状态。 |

### 命令示例

```bash
# 在后台开启深度思考模式重构代码
/kimi:task --background --thinking "将认证层重构为使用 JWT"

# 实时查看正在运行的任务步骤
/kimi:status task-abc123

# 发起一次高强度的安全性审查
/kimi:adversarial-review --scope working-tree
```


## 🏗️ 架构说明

不同于原版 Codex 插件使用持久化的 `app-server`，本项目采用了极致简约的方案：
- **直接派生 (Spawn)**：每个任务都直接派生一个 `kimi-cli` 子进程。
- **JSONL 流解析**：通过直接读取 `--output-format stream-json`，实现“思考链路”与“文本输出”的毫秒级实时分离。
- **生命周期钩子**：注册了 Session 退出钩子，用于执行安全检查并清理后台僵尸进程。

---

## 🛡️ 安全与生命周期

- **自动清理**：当 Claude 会话结束时，所有后台 Kimi 进程将自动终止。
- **安全关卡**：在退出或 `/stop` 时，会拦截未提交的代码更改，并引导一次快速的 Kimi 安全扫描。

## 致谢 (Acknowledgments)

特别鸣谢 [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc) 提供的卓越异步调度与任务追踪架构。我们沿用了其极其稳健的设计模式，并将其重构为 Kimi 原生的轻量化版本。
