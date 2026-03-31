---
description: Cancel an active background Kimi job in this repository
argument-hint: '[job-id]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

```bash
K_SCRIPT=$(echo "${CLAUDE_PLUGIN_ROOT}/scripts/kimi-companion.mjs" | sed 's/\\/\//g')
node "$K_SCRIPT" cancel $ARGUMENTS
```
