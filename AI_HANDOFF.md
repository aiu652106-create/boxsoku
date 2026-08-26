# AI_HANDOFF

Shared handoff file for ChatGPT and Codex.

## Operating rules
- Codex: read this file before starting work and update it before finishing.
- ChatGPT: use the repository state, diffs, tests, and this file for review instead of asking the user to relay long reports.
- Keep user-facing back-and-forth minimal. Resolve ordinary implementation/test failures internally.
- Do not expose or commit secrets, tokens, cookies, `.env` values, service-role keys, or credentials.
- Do not perform destructive production changes unless the current task explicitly authorizes them.
- Do not treat a completion report alone as proof. Record concrete files, commit SHA, tests, and verification results.

## Current task
- Status: idle
- Goal: none set

## Last result
- Status: none
- Commit: none
- Verification: none

## Blockers
- none

## Next action
- Wait for the next task from the user/ChatGPT.

## Update format for Codex
When finishing a task, replace the sections above with:
- Current task / goal
- Status: PASS / BLOCKED
- Changed files
- Commit SHA
- Tests/verification actually run
- Production/public changes: yes/no
- Remaining blockers
- Next action

Do not append long chat transcripts.