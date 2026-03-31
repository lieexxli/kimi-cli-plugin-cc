---
description: Delegate code review to Kimi CLI for the current repository changes
argument-hint: '[--base <ref>] [--scope <auto|working-tree|branch>] [--model <model>]'
context: fork
allowed-tools: Bash(node:*)
---

Route this request to run a Kimi code review.

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/kimi-companion.mjs" review $ARGUMENTS
```

Operating rules:
- Return the Kimi review output verbatim to the user.
- Do not paraphrase, summarize, rewrite, or add commentary before or after it.
- If Kimi CLI is missing or unauthenticated, stop and tell the user to run `/kimi:setup`.
