---
description: Resume a previous Kimi task using its stored session context
argument-hint: '<job-id> [new prompt]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

```bash
K_SCRIPT=$(echo "${CLAUDE_PLUGIN_ROOT}/scripts/kimi-companion.mjs" | sed 's/\\/\//g')
node "$K_SCRIPT" resume $ARGUMENTS
```
