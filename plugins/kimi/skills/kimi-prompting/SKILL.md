---
name: kimi-prompting
description: Best practices for crafting prompts to delegate to Kimi CLI
---

# Kimi Prompting Guide

This skill provides guidance on crafting effective prompts when delegating tasks to the Kimi CLI agent.

## When to Delegate to Kimi

Kimi is most useful for:
- **Second opinions**: When you want independent verification of your approach
- **Deep investigation**: Complex debugging or code archaeology across large codebases
- **Parallel tasks**: Running a background task while continuing main work
- **Code review**: Getting a fresh perspective on code changes
- **Large refactoring**: Tasks that benefit from a separate agent's full attention

## Prompt Structure

### Good Prompts

Be specific and provide context:

```
Analyze the error handling patterns in src/api/ and identify any endpoints 
that don't properly handle database connection failures. List each endpoint 
with the specific issue and suggest a fix.
```

```
Review the authentication middleware in middleware/auth.js. Check for:
1. JWT token validation completeness
2. Token expiry handling
3. Role-based access control correctness
4. Any security vulnerabilities
```

### Bad Prompts

Too vague:
```
Fix the bugs
```

Too broad:
```
Review everything
```

## Prompt Tips

1. **Include file paths** when you know where the relevant code is
2. **Specify the desired output format** if you need structured results
3. **Mention constraints** (e.g., "don't modify test files", "use the existing error handling pattern")
4. **Provide context** about what you've already tried or what you know about the issue
5. **Be explicit about write permissions**: Use `--write` only when you actually want Kimi to modify files

## Flag Selection Guide

| Scenario | Recommended Flags |
|----------|-------------------|
| Quick investigation | (none — defaults are fine) |
| File modifications | `--write` |
| Long-running task | `--background` |
| Complex reasoning | `--thinking` |
| Fast simple task | `--no-thinking` |
| Limit scope | `--max-steps 10` |

## Combining with Claude Code

After Kimi completes a task, Claude Code can:
1. Review Kimi's output and apply suggestions selectively
2. Run verification tests on Kimi's changes
3. Iterate on the approach based on Kimi's findings
4. Use Kimi's analysis to inform its own next steps
