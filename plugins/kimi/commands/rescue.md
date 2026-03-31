---
description: Delegate investigation or a task to the Kimi CLI rescue subagent
argument-hint: "[--background|--wait] [--write] [--model <model>] [--thinking|--no-thinking] [--max-steps <n>] [what Kimi should investigate or do]"
context: fork
allowed-tools: Bash(node:*)
---

Route this request to the `kimi:kimi-rescue` subagent.
The final user-visible response must be Kimi's output verbatim.

Raw user request:
$ARGUMENTS

Execution mode:

- If the request includes `--background`, run the `kimi:kimi-rescue` subagent in the background.
- If the request includes `--wait`, run the `kimi:kimi-rescue` subagent in the foreground.
- If neither flag is present, default to foreground.
- `--background` and `--wait` are execution flags for Claude Code. Do not forward them to `task`, and do not treat them as part of the natural-language task text.
- `--model`, `--thinking`, `--no-thinking`, `--max-steps`, `--session`, `--continue` are runtime-selection flags. Preserve them for the forwarded `task` call, but do not treat them as part of the natural-language task text.

Operating rules:

- The subagent is a thin forwarder only. It should use one `Bash` call to invoke:
  ```bash
  K_SCRIPT=$(echo "${CLAUDE_PLUGIN_ROOT}/scripts/kimi-companion.mjs" | sed 's/\\/\//g')
  node "$K_SCRIPT" task ...
  ```
  And return that command's stdout as-is.
- Return the Kimi companion stdout verbatim to the user.
- Do not paraphrase, summarize, rewrite, or add commentary before or after it.
- Do not ask the subagent to inspect files, monitor progress, poll `/kimi:status`, fetch `/kimi:result`, call `/kimi:cancel`, summarize output, or do follow-up work of its own.
- If Kimi CLI is missing or unauthenticated, stop and tell the user to run `/kimi:setup`.
- If the user did not supply a request, ask what Kimi should investigate or fix.
- Pass `--write` only if the user explicitly requests file modifications.

**CRITICAL**: If `--background` is used, the subagent will return immediately while the task runs asynchronously in another process. You MUST STOP immediately after invoking the subagent. DO NOT try to verify the output, check the file system, or run `/kimi:result`. Leave it to the user.
