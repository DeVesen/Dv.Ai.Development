---
name: commit-message
description: >
  Generates an English commit title (max 50 characters) and commit description
  (max 500 characters) from the current conversation context, optional task-*.md
  or Story ID, and optionally read-only git diff/status when local changes are
  the source. Triggers: commit message, commit description, commit beschreibung,
  Commit-Titel, Commit-Beschreibung, erstelle commit, create commit message.
  Buddy-agent applies this skill on those triggers. Not for formal ADO copy line
  Commit-Vorschlag für Task … in Story … (see ado-requests-stories / devops-organisator).
disable-model-invocation: true
---

# Commit message (context-based)

Portable skill: generate a **commit-ready** English title and body from **current context** — conversation thread, cited files, optional local git state — without executing `git commit` unless the user explicitly asks.

## Purpose

After discussion or implementation context, produce a **single chat response** with:

- **Title** — short commit subject, English, max **50** characters
- **Description** — commit body, English, max **500** characters

The skill defines **format and limits** — not which files to change.

## Before you respond

1. Read this `SKILL.md` fully.
2. Derive content **only** from allowed sources below. Do **not** invent changes not supported by context.
3. If the scope is unclear, ask **one** focused question **or** mark gaps as `(needs clarification)` in the body — do not hallucinate file names or behavior.

## Source priority

Use the **first** applicable layer; merge lower layers only when they add facts:

1. **Current conversation** — stated goal, agreed changes, acceptance criteria, paths mentioned in chat.
2. **Explicit `task-*.md` or Story ID** — read read-only if the user or thread named them (`## Anforderung`, `## Umsetzung` when task is done).
3. **Local git state** — only when the user clearly wants a message for **uncommitted work**: read-only `git status` / `git diff` in `lac-db/` (or workspace root per host). **Do not** run `git commit`.

**Forbidden:** writing to Task-MD, ADO MCP, or amending repo files for this operation.

## Language

**Title and Description must always be English**, even when the chat is in German.

## Length limits (hard)

| Field | Limit | Rules |
|-------|-------|-------|
| **Title** | max. **50** characters | Imperative mood; commit-ready; no trailing period; hard-truncate after generation if needed |
| **Description** | max. **500** characters | Prefer *why* then *what*; hard-truncate after generation if needed |

When a **Story ID** is known from context, you **may** prefix the description with `Story #12345:` — **not mandatory** (unlike the ADO Task copy flow).

## Mandatory output format

Reply in chat only — **do not** write to Task-MD or other files.

Use **exactly three** separate fenced code blocks. **Labels and character counts go only on the heading line above each block** — never inside the block.

1. One short intro line (German is fine), e.g. `Commit-Beschreibung:`
2. Heading **`Title (n/50)`** on its own line, then a `text` code block with **only** the title string (no `Title …:` prefix, no wrapping quotes unless part of the title).
3. Heading **`Description (n/500)`** on its own line, then a `text` code block with **only** the description body.
4. Heading **`Git command (copy-paste)`** on its own line, then a `bash` code block with **only** the full `git commit -m "…" -m "…"` line.

**Forbidden:** one combined code fence for title + description + command; prefixes like `Title (n/50):` or `Description (n/500):` inside a block.

**Illustrative structure** (in chat, use real content instead of ellipses):

Commit-Beschreibung:

**Title (n/50)**

```text
…
```

**Description (n/500)**

```text
…
```

**Git command (copy-paste)**

```bash
git commit -m "…" -m "…"
```

- `n` = actual character count **after** truncation (shown in the heading, not in the block).
- The `git commit` line is **suggested copy-paste** — run it **only** if the user explicitly requests a commit.
- Use `-m` twice: first `-m` = title, second `-m` = description (escape inner quotes if needed for shell safety).

## Quality bar

- Title should stand alone in `git log --oneline`.
- Description: complete sentences or tight bullets; no placeholder brackets in the final text.
- No fabricated file paths or behavior — if context is thin, say so briefly in the description or ask one clarifying question first.
- Match the host's commit style when visible in recent `git log` (e.g. conventional prefix `fix:`, `feat:`) — optional, only if thread or log shows that convention.

## Abgrenzung (ADO / devops-organisator)

**Not this skill** when the user uses the formal copy line:

`Commit-Vorschlag für Task {taskDateistamm} in Story {storyId}`

That flow stays in [ado-requests-stories/SKILL.md](../ado-requests-stories/SKILL.md) and **devops-organisator**: Task-MD sources, Description max. **400** characters, **must** include `Story #{storyId}`.

| Trigger | Handler | Description limit |
|---------|---------|-------------------|
| `Commit-Beschreibung`, `commit message`, `erstelle commit` (Buddy / context) | **this skill** | 500 |
| `Commit-Vorschlag für Task … in Story …` | ado-requests-stories / devops-organisator | 400 + Story # |

## Host integration

Repositories indexing skills in `AGENTS.md` should reference this skill for context-based commit text. Buddy-agent loads and applies it when the user asks for a commit description during sparring.

**Trigger-Pflege:** YAML `description` + [buddy-agent.md](../../agents/buddy-agent.md) End-Artefakt routing.
