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

Unlike more complex plugins (like Codex), this plugin takes a minimalist approach using standard process spawning, reducing the need for an intermediate app server while still retaining the capability for powerful background job tracking. Progress reporting works by reading Kimi CLI `--output-format stream-json`.

### Will it use my existing Kimi login?
Yes. The plugin delegates directly to the local `kimi` executable in your environment. It uses the same authentication state and configurations you've already set up.

## Acknowledgments

This project conceptually forks and iterates upon the excellent baseline architecture provided by [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc). While the original repository provided a robust structural pattern for Claude Code async plugins, the core engine has been significantly completely rebuilt by the community (specifically Lihao / lieexxli).

**Key Independent Contributions in this version:**
- Reverse-engineered and implemented a custom complex JSONL stream parser to seamlessly decode Moonshot Kimi CLI's multi-part (`thinking` arrays vs `text` chunks) responses in real-time.
- Fixed severe cross-platform Windows process termination (`taskkill`) bugs from the original repository, specifically patching compatibility for localized environments (e.g., Chinese Windows).
- Rebuilt the prompt routing pipeline to exclusively interface with the Moonshot Kimi API endpoint logic, adding vital dual-language documentation suitable for domestic developers.
