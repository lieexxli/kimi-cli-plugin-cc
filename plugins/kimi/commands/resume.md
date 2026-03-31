---
description: Resume a previous Kimi task using its stored session context
argument-hint: '<job-id> [new prompt]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/kimi-companion.mjs" resume $ARGUMENTS`
