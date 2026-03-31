---
description: Perform a high-pressure, security-focused adversarial review on changes
argument-hint: '[--base <ref>] [--scope <auto|working-tree|branch>] [--model <model>]'
context: fork
allowed-tools: Bash(node:*)
---

Route this request to run a Kimi adversarial code review.

Run:

```bash
K_SCRIPT=$(echo "${CLAUDE_PLUGIN_ROOT}/scripts/kimi-companion.mjs" | sed 's/\\/\//g')
node "$K_SCRIPT" review --adversarial $ARGUMENTS
```

Operating rules:
- Return the Kimi review output verbatim to the user.
- This mode uses a specialized strict auditor persona.
- If Kimi CLI is missing or unauthenticated, stop and tell the user to run `/kimi:setup`.
