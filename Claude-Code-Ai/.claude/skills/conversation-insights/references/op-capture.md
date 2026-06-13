# Op: Capture Insights

Scan the current conversation for decisive insights and append them to `<insights-path>/log.md`.

## Trigger keywords

EN: `capture insights`, `log insights`, `session insights`, `conversation insights`,
`what did we learn`, `log learnings`, `record insights`, `note what was decisive`,
`learning log`, `log what we learned`, `write to insights log`

DE: `insights sammeln`, `was haben wir gelernt`, `erkenntnisse protokollieren`,
`notiere was wichtig war`, `was war entscheidend`, `lern-log`

## Purpose

At the end of a session or implementation round, extract insights worth remembering:
things that **changed direction**, **resolved hard ambiguity**, **were surprising**,
or **could become a rule, skill, or workflow improvement**.

This is **not** a handoff prompt. It is a **learning log**.

| This skill | describe-as-prompt |
|-----------|-------------------|
| WHAT WAS DECISIVE — surprising, direction-changing | WHAT WAS DONE — handoff context for next agent |
| Audience: future-you / project memory | Audience: next agent in this thread |
| Appends to `<insights-path>/log.md` | Produces a copy-paste markdown prompt |

## Execution steps

1. Scan the **entire current conversation** from start to the trigger message.
2. Extract only insights that meet the quality bar below — do not pad.
3. Ask **one** clarifying question if the session context is unclear rather than guessing.
4. Present the formatted entries in chat **first**, then append to `<insights-path>/log.md`.

## Source

Only the **current conversation thread**. No repo scouting, no external URLs, no invented facts.

## What counts as a decisive insight

Capture an entry when **at least one** of these holds:

- It **changed the approach** taken (direction shift)
- It **resolved an ambiguity** that was blocking progress
- It was **surprising** given prior assumptions
- It reveals a **repeatable pattern** — positive or negative
- It could **become a rule, skill, or workflow change**
- It is a **gotcha / anti-pattern** to avoid next time

Do **not** capture:
- Routine implementation steps (belongs in commit message)
- Status updates ("I added file X")
- Information the user already knew and stated upfront

## Entry format (per insight)

Each entry uses this exact structure inside the log file:

```markdown
### YYYY-MM-DD — {slug}

- **context:** One sentence: what task or session this was.
- **insight:** The decisive discovery in 1–3 sentences. Be specific.
- **why-decisive:** Why it mattered — what would have gone wrong without it.
- **category:** `rule-candidate` | `skill-candidate` | `pattern` | `anti-pattern` | `workflow-improvement`
- **status:** `raw`
- **open-questions:** What still needs refinement or decision before promoting. Omit if none.
```

`slug` = short kebab-case label, max 50 chars, e.g. `disable-model-invocation-discovery`.

## Output format (chat response)

1. One intro line in the user's language (German is fine), e.g.:
   `Session insights (N entries):`

2. Each entry shown as a fenced `markdown` block — one block per entry.

3. After all entries: one confirmation line stating the file was appended:
   `→ Appended to <insights-path>/log.md`

4. If zero qualifying insights: say so explicitly in one sentence — do **not** invent entries.

## Appending to the log file

Append to `<insights-path>/log.md`:
- If the file does not exist: create it with the README header (see [op-new-log.md](op-new-log.md)), then append.
- Blank line before and after each new entry block.
- Do **not** overwrite or reorder existing entries.
- Do **not** add a session-level heading — the date in each `###` heading is sufficient.

## Quality bar

- **Specific**: vague entries ("we learned something about Angular") are not logged.
- **Decisive**: must answer "what would have been different without this knowledge?"
- **Actionable**: ideally states what follow-up (rule, skill, note) would capture this.
- **Concise**: `insight` max ~4 sentences; `why-decisive` max 2 sentences.
- No fabricated information. If context is thin for a candidate, mark `open-questions`.
