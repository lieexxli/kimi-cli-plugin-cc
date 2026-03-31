---
name: kimi-cli-runtime
description: How to invoke Kimi CLI from Claude Code plugin scripts
---

# Kimi CLI Runtime Contract

This skill documents the contract for invoking the Kimi CLI from the Claude Code plugin.

## Binary

The Kimi CLI binary is `kimi`. It must be available on the system PATH.

## Invocation Modes

### Stream JSON Mode (for tasks with progress tracking)

```bash
kimi --print --output-format stream-json -p "<prompt>" --work-dir <cwd> --yolo
```

- Output: JSONL (one JSON object per line)
- Each line may contain progress events, tool calls, or assistant messages
- The last `role: "assistant"` message contains the final result
- Use `--model <model>` to specify a model
- Use `--thinking` / `--no-thinking` to control thinking mode
- Use `--max-steps <n>` to limit agent steps

### Quiet Mode (for simple tasks and reviews)

```bash
kimi --quiet -p "<prompt>" --work-dir <cwd> --yolo
```

- Output: Plain text (stdout)
- Simpler, no JSONL parsing needed
- Good for reviews and short tasks

## Key Flags

| Flag | Description |
|------|-------------|
| `--print` | Non-interactive mode, print output to stdout |
| `--quiet` | Minimal output mode |
| `--output-format stream-json` | JSONL streaming output |
| `-p <prompt>` | The prompt/task to execute |
| `--work-dir <dir>` | Working directory for the task |
| `--yolo` | Skip confirmation prompts (auto-approve) |
| `--model <model>` | Model to use |
| `--thinking` | Enable extended thinking |
| `--no-thinking` | Disable extended thinking |
| `--max-steps <n>` | Maximum number of agent steps |
| `--session <id>` | Resume a specific session |
| `--continue` | Continue the last session |

## Authentication

- Users authenticate via `kimi login`
- No programmatic auth probing is done
- If auth fails, the error will be visible in stderr

## Error Handling

- Non-zero exit code indicates failure
- stderr contains error messages
- Common failures: auth expired, rate limited, network errors
