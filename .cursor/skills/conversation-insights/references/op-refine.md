# Op: Refine / Promote Insight

Refine a specific log entry or promote it to a rule or skill.

## Trigger keywords

`refine insight`, `make rule from insight`, `promote entry`,
`refine insight YYYY-MM-DD slug`

## Execution steps

1. Read the specified entry from `{insights-path}/log.md` by date + slug.
2. Display the current entry in chat.
3. Propose the refined version in chat (updated `insight`, `status: refined`, completed `open-questions`).
4. If promoting to a rule or skill: outline what the new `.mdc` or `SKILL.md` would contain —
   do **not** create files without explicit user confirmation.
5. On explicit user OK: update the entry's `status` field in the log file.

## Entry status lifecycle

`raw` → `refined` → `promoted`

## Integration with other skills

| Skill / Agent | Relationship |
|--------------|-------------|
| `describe-as-prompt` | Complementary — run describe-as-prompt for handoff, this skill for learning capture. Both can run in the same session. |
| `commit-message` | commit-message records WHAT changed in code; insights records WHY a direction was chosen. |
| `buddy-agent` | Buddy surfaces open questions during sparring; insights captures what those questions revealed. |
| `planning-workflow` | After a planning session resolves an architectural ambiguity — that resolution is an insight candidate. |
