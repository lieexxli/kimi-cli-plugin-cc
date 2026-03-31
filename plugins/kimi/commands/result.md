---
description: Retrieve the stored result of a completed Kimi job
argument-hint: '[job-id]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

```bash
K_SCRIPT=$(echo "${CLAUDE_PLUGIN_ROOT}/scripts/kimi-companion.mjs" | sed 's/\\/\//g')
node "$K_SCRIPT" result $ARGUMENTS
```
