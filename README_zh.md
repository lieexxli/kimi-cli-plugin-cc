# 适用于 Claude Code 的 Kimi CLI 插件

[English](README.md) | 简体中文

在 Claude Code 内部使用 Kimi 进行代码审查，或者将复杂任务委托给 Kimi CLI 代理。

这个插件旨在为 Claude Code 用户提供一种简便的方式，直接在现有的工作流中无缝接入 Kimi，利用另一个强大的独立代码助理来提供第二意见或处理繁重的工作。

## 功能介绍
- `/kimi:review` —— 让 Kimi 对代码进行只读的代码审查
- `/kimi:rescue`、`/kimi:status`、`/kimi:result` 和 `/kimi:cancel` —— 委托后台任务并管理运行状态
- 支持强大的委托能力，可开启 Kimi 的 `--thinking` 深度思考模式，或指定具体的模型版本 

## 环境要求
- 系统中已**安装 Kimi CLI**
- **Node.js 18.18 或更高版本**

## 安装指南

你可以直接使用 GitHub URL 全局安装此插件：

```bash
claude plugin add https://github.com/lieexxli/kimi-cli-plugin-cc
```

或者将其克隆到本地后再安装：

```bash
git clone https://github.com/lieexxli/kimi-cli-plugin-cc.git
claude plugin add /path/to/kimi-cli-plugin-cc
```

完成后，运行检查：

```bash
/kimi:setup
```

`/kimi:setup` 命令会告诉你 Kimi 是否已准备就绪，并在 PATH 环境变量中可用。

如果已经安装了 Kimi 但还未登录，你需要先进行认证：

```bash
!kimi login
```

安装完毕后，你应该能看到：
- 下方列出的所有斜杠命令
- 在 `/agents` 中出现 `kimi:kimi-rescue` 子代理

---

## 常用命令

### `/kimi:review`
对你当前的工作进行代码审查。当你想对未提交的更改进行独立审查，或是对比某个特定的基础分支（如 `main`）时非常有用。

示例：
```bash
/kimi:review
/kimi:review --base main
/kimi:review --background
```

此命令为只读命令。如果在后台运行，请使用 `/kimi:status` 检查进度。

### `/kimi:rescue`
通过 `kimi:kimi-rescue` 子代理将任务交给 Kimi。

适用于你想让 Kimi 帮你处理以下事项：
- 调查难以复现的 Bug
- 在你做其他事时编写修复补丁
- 继续执行某个长期调查任务

>**注意：** 这个插件派发的任务默认是只读的，以保护你的工作区安全。如果要允许 Kimi 修改你的本地文件，请明确加上 `--write` 标志。

支持的可选参数：
- `--background`：在后台运行任务
- `--write`：允许 Kimi 修改文件
- `--thinking` / `--no-thinking`：启用/禁用扩展深度思考
- `--model <model>`：指定具体使用哪一个 Kimi 模型

示例：
```bash
/kimi:rescue 调查测试开始报错的原因
/kimi:rescue --write 修复失败的测试环节，用最安全的小范围补丁
/kimi:rescue --background --thinking "重构数据库访问层"
```

你甚至可以直接用自然语言让 Claude Code 自己决定如何使用该子代理：
```text
让 Kimi 帮忙审查一下数据库连接部分代码，看看它的鲁棒性如何。
```

### `/kimi:status`
查看当前仓库中正在运行或近期完成的 Kimi 任务状态。

示例：
```bash
/kimi:status
/kimi:status task-abc123
```

### `/kimi:result`
查看后台已完成任务的最终输出结果。 

示例：
```bash
/kimi:result
/kimi:result task-abc123
```

### `/kimi:cancel`
取消一个正在后台执行的 Kimi 任务。

示例：
```bash
/kimi:cancel
/kimi:cancel task-abc123
```

## 工作原理

本插件通过封装你本地的 [Kimi CLI](https://github.com/MoonshotAI/kimi-cli) 二进制程序来工作。它利用 Claude Code 的扩展系统直接拉起子进程来执行前台和后台任务。

### 极简架构设计
与官方原版 Codex 插件（使用了包含 `app-server` 和 `broker` 的重型架构及复杂的 TypeScript 协议）不同，本 Kimi 插件采取了大幅简化的直连策略：
- **无 Broker/App-Server**：完全去除了冗余的服务端点逻辑，仅依靠轻量级的 `kimi-companion.mjs` 脚本即可直接拉起并管理 Kimi 进程。
- **原生 JSONL 解析**：通过监听 Kimi CLI 的 `--output-format stream-json` 日志流，实时分离深度思考（`thinking`）与最终结果（`text`），提供完美的终端交互视觉体验。
- **健壮的状态追踪**：沿用了原项目中经过实战检验的基于文件系统的任务编排队列，完美支持 `--background` 后台挂起与多任务统筹。
- **跨平台优化**：在底层补齐了包含中文 Windows 系统在内的多处平台兼容性 Bug（如修正了中文版 `taskkill` 返回值识别），保障了真正的多端稳定。

### 它会使用我现有的 Kimi 登录状态吗？
是的。此插件直接调用你系统环境中的 `kimi` 可执行文件。它使用与你手动在终端运行 Kimi 时完全相同的身份验证信息和配置。

## 致谢 (Acknowledgments)

本项目派生（Fork）且深度借鉴了 [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc) 开源项目极其优秀的架构模式。我们沿用了其稳健的异步底层调度闭环，将其裁剪并重构为了一个适配 Kimi 环境的纯享直连轻量化版本。原项目所有的基础扩展骨架与交互设计理念，其核心版权和创意均归 OpenAI 作者团队所有。特此致谢！
