---
name: kimi-result-handling
description: How to present and interpret Kimi CLI results
---

# Kimi Result Handling

This skill describes how to present Kimi CLI results to the user within Claude Code.

## Result Sources

Kimi results come in two forms:

### 1. Foreground Task Results
- Returned immediately after task completion
- Available as the `lastAssistantMessage` from JSONL parsing
- Rendered directly to stdout

### 2. Background Task Results
- Stored in job files under `$CLAUDE_PLUGIN_DATA/state/<workspace-hash>/jobs/`
- Retrieved via `/kimi:result <job-id>`
- Contains both raw output and rendered markdown

## Presentation Guidelines

### For Task Results
- Present the raw Kimi output directly — it's already well-formatted markdown
- If the output is very long (>500 lines), summarize key findings first, then show the full output
- Highlight any files that Kimi modified (if `--write` was used)

### For Review Results
- Present the review output as-is — Kimi formats it as structured feedback
- Call attention to critical/high severity findings
- Suggest concrete follow-up actions

### For Failed Tasks
- Show the error message clearly
- Check stderr for additional context
- Suggest common fixes:
  - Auth issues → `!kimi login`
  - Binary not found → check installation
  - Rate limiting → wait and retry

## Job Status Interpretation

| Status | Meaning |
|--------|---------|
| `queued` | Task is waiting to start |
| `running` | Task is actively executing |
| `completed` | Task finished successfully |
| `failed` | Task encountered an error |
| `cancelled` | User cancelled the task |

## Phase Values

| Phase | Meaning |
|-------|---------|
| `starting` | Kimi CLI is initializing |
| `running` | Kimi is working on the task |
| `investigating` | Kimi is reading files or searching |
| `editing` | Kimi is modifying files |
| `reviewing` | Kimi is reviewing code |
| `responding` | Kimi is generating its response |
| `done` | Task completed |
| `failed` | Task failed |
