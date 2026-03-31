---
description: Check whether the local Kimi CLI is ready for use
argument-hint: ''
allowed-tools: Bash(node:*), AskUserQuestion
---

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/kimi-companion.mjs" setup --json $ARGUMENTS
```

If the result says Kimi CLI is unavailable:
- Tell the user to install Kimi CLI and ensure `kimi` is on their PATH.
- Suggest running `!kimi login` to authenticate after installation.

Output rules:
- Present the final setup output to the user.
- If Kimi CLI is installed but not authenticated, suggest running `!kimi login`.
