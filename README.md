# Kimi CLI Plugin for Claude Code (CC)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-active-success.svg)]()

> A specialized deep-refactor of `openai/codex-plugin-cc` tailored for Kimi CLI. We’ve stripped away heavy RPC legacy in favor of raw performance and seamless automation with `kimi-cli`.

[English](README.md) | [简体中文](README_zh.md)

---

## 🚀 Positioning: From "Armored Truck" to "Supercar"

This project references `openai/codex-plugin-cc`, featuring a specialized deep "subtraction" refactor and feature adaptation tailored for `kimi-cli`. We have completely discarded the heavy RPC architecture.

### Core Comparison

| Feature | Original Codex (`codex-plugin-cc`) | Kimi Adapted (This Project) |
| :--- | :--- | :--- |
| **Architecture** | **RPC / Broker Server** (Heavy state) | **Native Subprocess** (Low-latency, lightweight) |
| **Execution** | **Forced Review Gate** (Manual confirmation) | **Full Auto YOLO** (Autonomous by default) |
| **Parsing** | **Heavy Telemetry** (Complex MCP tracking) | **Stream Parsing** (Real-time tool & thinking traces) |
| **Philosophy** | High-safety, prevents hallucinations via audit | High-throughput, developer-centric automation |

---

## ✨ Key Features

- **🚀 Zero-Config Startup**: No heavy broker setup. If `kimi` is in your PATH, you're ready.
- **📊 Real-time Progress Tracking**: See Kimi’s internal steps (Shell, File I/O) with live status indicators (⏳, ✅, ❌) in your terminal.
- **🧠 Thinking Model Integration**: Native support for `--thinking`, forcing deep reasoning before action.
- **⚡ Quiet & Autonomous**: Persistent `--yolo` injection ensures complex refactors run without constant hand-holding.
- **🛡️ Adversarial Review**: A dedicated security-first review mode to find hidden bugs and vulnerabilities.
- **⚠️ Safety Review Gate**: Automatically scans your uncommitted changes when you exit a session to prevent shipping bugs.
- **🔄 Session Persistence**: Inherits Kimi's session state via `--session` and `--continue`.

---

## 📖 Usage

### Commands

| Command | Description |
| :--- | :--- |
| `/kimi:task` | Main entry point for any Kimi task (e.g., refactoring, debugging). |
| `/kimi:status` | Check background job status and see **real-time tool progress**. |
| `/kimi:review` | Standard code review for current git changes. |
| `/kimi:adversarial-review`| **Security-focused** adversarial review with a strict persona. |
| `/kimi:result` | View final output of a completed background job. |
| `/kimi:cancel` | Terminate a running background job. |
| `/kimi:resume` | Continue a previous Kimi session using its Job ID. |
| `/kimi:setup` | Verify your Kimi CLI environment and installation status. |

### Examples

```bash
# Run a task in the background with deep thinking
/kimi:task --background --thinking "refactor the auth layer to use JWT"

# Check the real-time steps of a running job
/kimi:status task-abc123

# Run a high-pressure security review
/kimi:adversarial-review --scope working-tree
```


## 🏗️ Architecture

Unlike the original Codex plugin which uses a persistent `app-server`, this plugin takes a minimalist approach:
- **Direct Spawn**: Spawns `kimi-cli` as a subprocess for every task.
- **JSONL Stream Parsing**: Directly reads `--output-format stream-json` to separate `thinking` traces from `text` output in real-time.
- **Stop Hook Hook**: Registers a session-end hook to perform safety checks and cleanup background processes.

## 🛡️ Safety & Lifecycle

- **Automatic Cleanup**: Background processes are terminated when the Claude session ends.
- **Review Gate**: Intercepts session exits to warn you about uncommitted changes with a quick Kimi scan.

## Acknowledgments

Special thanks to [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc) for the excellent asynchronous scheduling and job-tracking architecture. We adapted their structural patterns to build this lightweight, Kimi CLI-native iteration.
