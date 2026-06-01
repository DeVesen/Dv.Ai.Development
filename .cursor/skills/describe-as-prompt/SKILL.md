---
name: describe-as-prompt
description: >
  Compresses an Ask-mode or explanatory thread into a single copy-paste-ready Markdown
  handoff prompt for a follow-up agent, using a fixed two-part response layout (brief
  superficial complexity note including an illustrative planning-overview model tier when
  planning is in scope—unless watertight mode—plus fenced prompt body). Section B must
  carry thread-grounded journey (where from / where to / goal), code references and file
  pointers from the chat, examples discussed, and copy-ready references (skills, rules,
  docs, URLs) so the next agent needs minimal re-discovery. For planning-relevant handoffs,
  the generated prompt must always instruct use of @.cursor/skills/planning-workflow and
  mandate strict adherence to the host planning-workflow skill (phases 1–6), except when
  the user explicitly requests watertight/self-contained prompt without workflow scaffolding.
  Triggers (kanonisch gruppiert): .cursor/rules/describe-as-prompt-skill.mdc — u.a.
  describe-as-prompt, handoff, Ask zusammenfassen, wasserdicht, erstelle prompt,
  plane als/im prompt, das/als prompt, fuer neuen Agent. Wasserdicht: no planning meta only.
disable-model-invocation: true
---

## Parameter

| Parameter | Beschreibung |
|-----------|-------------|
| `{agent-index}` | Datei mit der Repository-Agentenübersicht (z. B. `AGENTS.md`) |

# Describe-as-Prompt (conversation to handoff prompt)

Portable skill: copy this folder into another repository unchanged if the host documents the same planning-workflow convention (see **Host paths** below).

## Purpose

After an exploratory discussion (often Ask mode), produce a **single response** that lets the user hand off to **another agent** without re-explaining the thread. The skill defines **formatting** and **planning obligations** inside the generated prompt—not the technical solution itself.

## Before you respond

1. Read this `SKILL.md` fully.
2. Derive content **only** from the **current conversation** (and explicitly cited host rules if the user asked to embed them). Do **not** perform deep repo scouting or planning work **for** this summarization step unless the user explicitly asked you to include scout results already present in the thread. **Do** copy into Section B **every** concrete thread artifact that helps the next agent: paths, code-reference blocks, skills/rules mentioned, examples, and stated goals—do **not** drop a path, cite, or reference that appeared in the thread only to shorten the handoff; summarize wording when helpful but keep **identifiers** (paths, line hints, skill paths) intact.
3. Mark gaps as **open questions** inside the handoff prompt rather than inventing details.

## Planning Workflow hint vs. watertight mode (priority)

Evaluate **in this order**:

### 1) Wasserdicht-Modus (overrides planning hint)

If the user **explicitly** wants a **watertight**, **self-contained**, **compact** handoff **without** Planning-Workflow scaffolding or meta-references, activate **Wasserdicht-Modus**.

Treat any of these as sufficient triggers (non-exhaustive): *wasserdicht*, *wasserdichtes Prompt*, *ohne Planning Workflow*, *ohne Workflow-Verweise*, *kein Planning-Skill*, *nur der Prompt*; English: *watertight prompt*, *self-contained only*, *no planning workflow in the prompt*, *compact handoff only*.

**When active:**

- **Do not** mention `@.cursor/skills/planning-workflow` or mandate loading the planning-workflow skill.
- **Omit** **`## Planning obligation`** from Section B entirely.
- In **Section A**, **omit** the planning-overview model-tier table and recommendation; write **one line**: planning-overview model tier **not applicable — watertight prompt**. You may still give a short coarse complexity rating if it helps the reader; adjust the disclaimer so it does not imply a model-tier recommendation was given.
- **Still** include **factual** density from the thread: **`## Goal`** (journey), **`## Code & Fundstellen`**, **`## Beispiele aus der Unterhaltung`**, **`## Referenzen (Skills, Regeln, Docs)`** when the thread supplied material—Wasserdicht removes **Planning-Workflow meta only**, not concrete handoff payload.

### 2) Planning-relevant handoff (default when not watertight)

When **Wasserdicht-Modus is not active** and **any** of these apply, you **must** include **`## Planning obligation`** in Section B and **must** instruct the next agent—**prominently and first in that section**—to use **`@.cursor/skills/planning-workflow`** and to load and **strictly follow** the host planning workflow file (see **Host paths**). Do **not** treat this block as optional or abbreviate it away for planning-relevant handoffs.

Trigger conditions:

- The user asked for a **plan**, **planning**, **Phase 1–6**, Scout, three-perspective review, or a **new agent to plan** before implementing.
- The discussed work is **feature implementation**, **non-trivial refactor**, **architecture change**, or **multi-step** engineering work where the host project normally uses a planning workflow.

### 3) Pure information

**Do not** include **`## Planning obligation`** or **`@.cursor/skills/planning-workflow`** when the handoff is purely informational (definitions, read-only explanations, no follow-up implementation or planning).

### Host paths

Use **both** the Cursor-style skill mention and the concrete path when planning is mandated:

- **`@.cursor/skills/planning-workflow`** (primary hint for the next agent).
- Typical file: `.cursor/skills/planning-workflow/SKILL.md` from the workspace root.
- Subagent prompt templates (when referenced by that workflow): `.cursor/skills/planning-workflow/references/subagent-prompts.md`

If the host project stores these elsewhere, write in Section B: *“Adjust paths to match this repository’s `{agent-index}` or skill index.”*

## Mandatory response layout

Reply in **two parts**, in this **order**:

### Section A — Short complexity note (superficial)

- A **coarse** rating (e.g. **Low** / **Medium** / **High**) **or** a one-line qualitative label.
- **Planning-overview model tier (mandatory when planning is in scope and Wasserdicht-Modus is off):** Recommend **one** of three tiers for which capability level should **lead** the host **Planning Workflow** overview (Phasen 1–6 — orchestration, trade-offs, review synthesis). Use **illustrative** examples only; the IDE/catalog decides actual model IDs.

  | Tier | Illustrative examples (do not treat as mandatory brands) |
  |------|----------------------------------------------------------|
  | **Upper / reasoning-strong** | e.g. Opus-class, GPT‑5.5-class |
  | **Middle / balanced** | e.g. Composer-class, Sonnet-class |
  | **Light / fast** | e.g. GPT‑5 mini-class, Haiku-class |

  Tie the recommendation to thread-discussed **scope, ambiguity, cross-cutting impact**, and **review obligation** (not to literal benchmarking). One sentence: **why** this tier fits.

  If the handoff is **not** planungsrelevant (pure information, no Planning Workflow), write **one line**: planning-overview model recommendation **not applicable**.

  If **Wasserdicht-Modus** is on, follow **Wasserdicht-Modus** above (single **not applicable — watertight prompt** line instead of the tier block).

- **2–4 sentences** (overall) of justification for the complexity rating based **only** on what was discussed in the thread—**no** codebase audit, **no** substitute for Scout or a formal plan.
- One sentence disclaimer: complexity (+ model tier **when you gave one**) are **not** reliable effort estimates, **not** risk analysis, **not** a guarantee that a named model exists in the user’s environment.

If there is **no implementation or planning topic**, state that the complexity note is **not applicable** (one short sentence) and skip the tier table except the “not applicable” line for planning-overview models.

### Section B — Handoff prompt for the next agent

Wrap the entire handoff prompt in **one** fenced code block with language tag **`markdown`** so the user can copy-paste in one gesture.

**Inside** that block, use at least these headings (omit sections that are truly empty; if the thread had no items for a section, write **keine im Thread** or drop the heading—do not invent):

1. **`## Context`** — Repo/workspace hints **only if** the user supplied them (e.g. nested project root). Avoid embedding unexplored file paths.
2. **`## Goal`** — Structure **explicitly** for the next agent (facts from the thread only):
   - **Ausgangslage / Herkunft** — what was established, current state, problem as understood.
   - **Ziel / Wunschergebnis** — what the follow-up should achieve (**wohin**).
   - **Nutzen / Motivation** — optional sub-bullet if the thread stated *why* it matters.
3. **`## Code & Fundstellen`** — Every **named or cited** code location from the thread: Cursor-style references (`startLine:endLine:path`) or clear `Datei:Zeile` from chat, plus **one context line** per entry (why it matters). Optional **short** fenced snippets **only** if already small in the thread—**do not** fabricate large new dumps from the repo.
4. **`## Beispiele aus der Unterhaltung`** — Bullets: behavior examples, edge cases, user stories, error messages, or test cases the thread mentioned.
5. **`## Referenzen (Skills, Regeln, Docs)`** — Copy-ready list of everything the thread invoked: `@.cursor/skills/...`, `.mdc` rules, `{agent-index}` pointers, implementation/planning workflow mentions, external URLs, policy/commands.
6. **`## Acceptance criteria`** — Testable or reviewable outcomes when discussed.
7. **`## Edge cases / open questions`** — Explicitly list unresolved decisions.
8. **`## Current vs desired behavior`** — If the thread contrasted today’s behavior with target behavior.
9. **`## Planning obligation`** — **Only when required** (**Planning-relevant handoff** above; **never** in Wasserdicht-Modus or pure-information handoffs). Start by instructing the next agent to use **`@.cursor/skills/planning-workflow`** and to load and **strictly follow** the host’s planning workflow (`SKILL.md` phases 1–6): Phase 1 without code scouting; Phase 2 short status summary only (no user gate before Scout); Phase 3 Codebereichs-Scout Subagent immediately after Phase 2 per `references/subagent-prompts.md`; Phase 4 working plan; Phase 5 mandatory Optimist / Pessimist / Normalo review (parallel or documented fallback); Phase 6 mandatory **Review-Digest** in chat after all three reviews (per `references/subagent-prompts.md`), then synthesis per **Synthese-Checkliste**, then the orchestrating agent formulates the **final** user-facing plan package for approval. Reference **`references/subagent-prompts.md`** for Scout and review templates **when** that workflow file exists at the host path.

Language: match the user’s language for Section A and B **unless** they requested English for portability.

## Quality bar

- The handoff prompt should be **executable by a new agent** without reading the full prior chat.
- **Thread fidelity:** Carry **concrete** file paths, code references, examples, and documentation/skill mentions from the conversation into Section B so the follow-up needs **minimal re-research**. Vague pointers (*siehe vorherige Nachricht*) only when the thread itself contained **no** specific cite.
- **Wasserdicht-Modus:** Deliver a dense, self-contained Section B **without** meta-workflow references to planning (`@.cursor/skills/planning-workflow`, mandatory phases, or **`## Planning obligation`**); **do** retain journey, code fundstellen, examples, and other references from the thread.
- Prefer **summarized bullets** over pasting huge excerpts; never invent code not present in the thread.

## Host integration

Repositories that index skills in `{agent-index}` should add this skill to their table so agents load it when the user requests a **prompt handoff**. This skill does **not** replace the planning or implementation workflows of the host.

**Trigger-Pflege:** Änderungen an Auslösern **doppelt** pflegen: YAML-`description` (kompakt) und [.cursor/rules/describe-as-prompt-skill.mdc](../../rules/describe-as-prompt-skill.mdc) (kanonische Trigger-Liste).
