# Kimi CLI plugin for Claude Code

English | [简体中文](README_zh.md)

Use Kimi from inside Claude Code for code reviews or to delegate tasks to the Kimi CLI agent.

This plugin is for Claude Code users who want an easy way to start using Kimi from the workflow they already have, taking advantage of a powerful independent coding agent for second opinions or heavy lifting.

## What You Get
- `/kimi:review` for a read-only code review by Kimi
- `/kimi:rescue`, `/kimi:status`, `/kimi:result`, and `/kimi:cancel` to delegate work and manage background jobs
- Powerful delegation using Kimi's `--thinking` mode and custom models

## Requirements
- **Kimi CLI installed** on your system.
- **Node.js 18.18 or later**.

## Install

You can install the plugin directly using its GitHub URL:

```bash
claude plugin add https://github.com/lieexxli/kimi-cli-plugin-cc
```

Or clone it locally and install from the local path:

```bash
git clone https://github.com/lieexxli/kimi-cli-plugin-cc.git
claude plugin add /path/to/kimi-cli-plugin-cc
```

Then run:

```bash
/kimi:setup
```

`/kimi:setup` will tell you whether Kimi is ready and available on your PATH.

If Kimi is installed but not logged in yet, you will need to authenticate:

```bash
!kimi login
```

After installing, you should see:
- the slash commands listed below
- the `kimi:kimi-rescue` subagent in `/agents`

---

## Commands

### `/kimi:review`
Runs a code review on your current work. Use it when you want an independent review of your uncommitted changes or your branch compared to a base branch.

Examples:
```bash
/kimi:review
/kimi:review --base main
/kimi:review --background
```

This command is read-only. When run in the background, use `/kimi:status` to check progress.

### `/kimi:rescue`
Hands a task over to Kimi through the `kimi:kimi-rescue` subagent.

Use it when you want Kimi to:
- investigate a tricky bug
- write a fix while you do something else
- continue a long-running investigation

>**Note:** By default, Kimi tasks from this plugin are read-only to protect your workspace. To allow Kimi to modify your files, explicitly add the `--write` flag.

Options supported:
- `--background`: Run the task in the background
- `--write`: Allow Kimi to modify files
- `--thinking` / `--no-thinking`: Enable or disable extended reasoning
- `--model <model>`: Specify a specific model to use

Examples:
```bash
/kimi:rescue investigate why the tests started failing
/kimi:rescue --write fix the failing test with the smallest safe patch
/kimi:rescue --background --thinking "refactor the database layer"
```

You can also use natural language to let Claude decide how to use the subagent:
```text
Ask Kimi to review the database connection code and see if it is resilient.
```

### `/kimi:status`
Shows running and recent Kimi tasks in the current repository.

Examples:
```bash
/kimi:status
/kimi:status task-abc123
```

### `/kimi:result`
Shows the final output for a finished background job. 

Examples:
```bash
/kimi:result
/kimi:result task-abc123
```

### `/kimi:cancel`
Cancels an active background Kimi job.

Examples:
```bash
/kimi:cancel
/kimi:cancel task-abc123
```

## How It Works

This plugin wraps the [Kimi CLI](https://github.com/MoonshotAI/kimi-cli) local binary. It leverages Claude Code's extension system to spawn sub-processes for foreground and background execution. 

### Minimalist Architecture
Unlike the original official Codex plugin (which uses a heavy `app-server` and `broker` architecture with complex TypeScript protocols), this Kimi plugin takes a drastically simplified approach:
- **No Broker/App-Server**: It directly uses a lightweight `kimi-companion.mjs` script to spawn Kimi processes.
- **Native JSONL Parsing**: Progress reporting works by directly reading the Kimi CLI's `--output-format stream-json`, separating `thinking` traces from `text` output in real-time.
- **Robust State Management**: It reuses the battle-tested filesystem-based job tracking from the Codex plugin to support robust background running (`--background`) and cancellation.
- **Cross-Platform**: Includes specific patches for proper process termination (`taskkill`) on localized Windows environments.

### Will it use my existing Kimi login?
Yes. The plugin delegates directly to the local `kimi` executable in your environment. It uses the same authentication state and configurations you've already set up.

## Acknowledgments

This project is a fork of and conceptually inspired by the excellent baseline architecture provided by [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc). We adapted their cleanly designed task-runner and job-tracking architecture to build this lightweight, Kimi-native iteration. All structural credit for the overarching plugin design goes to the original authors at OpenAI.
