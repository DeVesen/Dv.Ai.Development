# .cursor/insights/

Running knowledge base — decisive insights from coding sessions in this repository.

## Files

| File | Purpose |
|------|---------|
| `log.md` | Append-only log of all captured insights |

## Entry lifecycle

```
raw  →  refined  →  promoted
```

- **raw**: captured as-is from session; may have open questions
- **refined**: open questions resolved; wording sharpened; not yet in rules/skills
- **promoted**: converted into a `.cursor/rules/*.mdc`, `SKILL.md`, or agent profile

## How to use

**Capture** — at end of session, trigger the `conversation-insights` skill:

| Mode | How |
|------|-----|
| Keyword (inline) | `capture insights` · `session insights` · `log what we learned` |
| Explicit SubAgent | `/conversation-insights` or `@conversation-insights-agent` |

**Refine a specific entry:**
`refine insight YYYY-MM-DD my-slug`

**Promote to rule:**
`make rule from insight YYYY-MM-DD my-slug`

## Category guide

| Tag | When to use |
|-----|-------------|
| `rule-candidate` | A constraint or trigger that should fire automatically in future sessions |
| `skill-candidate` | A reusable workflow that deserves its own SKILL.md |
| `pattern` | A positive approach worth repeating |
| `anti-pattern` | A mistake or gotcha to actively avoid |
| `workflow-improvement` | A change to an existing planning/implementation/buddy process |
