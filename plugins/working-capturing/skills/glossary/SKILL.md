---
name: glossary
description: Use when a user's casual term, abbreviation, or business phrasing clearly refers to a specific file, folder, service, or concept in the current project's code, and this mapping isn't already recorded — captures the term-to-reality mapping so it doesn't need re-discovering or re-asking next time.
---

# Glossary

## Overview

Codebases grow their own vocabulary — folder names, service names, DB entities — that rarely matches how people talk about the product ("search-strategie" vs. "search feature"). When you resolve that kind of mismatch, write it down once, in the project itself, so a future session (yours or a teammate's) skips the re-discovery.

## Phase Gate — Up to the Spec Only

**As an input to work, these profiles belong to the road up to the specification.** They are consulted while a request is being discussed and while a spec is being written. From the spec onward they are closed: a planner, implementer or reviewer works against the spec, the plan and the task card, and nothing beside them. Needing a profile in order to plan, build or judge means the spec is incomplete — that's a finding to report upward, never a reason to look it up. The gate is the phase you're in, not the role you hold: it binds the main agent just as much.

**Capturing is not consulting.** Recording what was just learned — with the owner present to answer the ask — is this skill's own job and isn't tied to a phase; a capture pass right after an implementation session is exactly what it's for. What the gate forbids is reading a profile *as input* to planning, building or reviewing. The dedup read this skill requires before writing happens inside a capture, so it's allowed there.

**Which side of the gate am I on?** If the answer to "why am I opening this file" is *to decide how to build or judge something*, you're past the gate — stop. If it's *to record or correct what we just established*, you're inside a capture — continue.

## Ask First — No Exceptions

Never write a new entry, and never extend an existing one, without asking the owner first. This applies equally to a brand-new term and to something that looks like it belongs under an entry that already exists — "just an alias" is still a write, still needs the ask.

The ask always presents two things together, before any file is touched:
1. The expression / buzzword, exactly as it came up.
2. What you found — the concrete file/symbol/path, and the graphify node if one exists (see Graphify Pointer below).

Wait for their answer. What they say decides the Confidence tag (below); it never decides whether to write — that's already settled by having asked.

**No exceptions:**
- Not because the mapping "is obviously right"
- Not because it's "just a minor alias, doesn't need a check"
- Not because asking would interrupt the current flow — ask anyway, or hold the write until there's a natural moment to ask; don't write in the meantime
- Not for an `ambiguous` case either — present every candidate and ask, don't silently pre-select one to save a question

If genuinely nobody is reachable to ask (unattended run), do not write a speculative entry — leave it for the next session where someone can be asked.

## When to Use

- User names a UI element, business concept, or casual term and you had to search or ask before finding what it maps to in code
- Exploration surfaces a term/synonym mismatch (folder/class name vs. how people actually refer to it)
- You worked out a mapping yourself while exploring, even without the user having confirmed it yet — that's exactly the case to bring back and ask about
- A term someone (the user, or a past conversation) actually used could plausibly point to more than one distinct target in this project — bring back all candidates and ask which one. This still requires a human-originated term, same as the other bullets: a coincidence you stumble into while exploring code or a graph, with nobody having used the word, is not by itself a trigger.

## When NOT to Use

- User already used the exact code identifier (file, class, service name) — nothing to translate
- Generic programming vocabulary, not specific to this project
- The mapping is already in the glossary, unchanged (run the dedup check first)

## Storage

One file per area: `<glossary-root>/<area>.md` (repo-tracked, English filenames) — e.g. `frontend-terms.md`, `backend-terms.md`, `domain-terms.md`, `devops-terms.md`. Take `<glossary-root>` from the project's CLAUDE.md (or equivalent instructions file), which names where the glossary lives; an unrelated convention written for a different skill (e.g. a spec-storage override) doesn't count. Absent an explicit glossary-location note, default to `docs/glossary/`.

**Which area file:** route by where the resolved *target* lives, not by how the user's phrasing sounds — a business-sounding term whose target is a frontend folder still goes in `frontend-terms.md`. Reach for `domain-terms.md` only when the target itself is a cross-cutting business concept with no single technical home (e.g. an entity/concept referenced from both frontend and backend). Add a new area file only when none of the existing ones fit.

If `docs/glossary/` doesn't exist yet, create it — the file you're about to write is the first entry, so there's nothing to dedup against.

## Entry Format

A new area file starts with a one-line title (`# <Area> Terms`), followed by entries:

```markdown
# Frontend Terms

### <term as the user said it>
- **Maps to:** `path/or/symbol` — <one-line what it actually is>
- **Graphify node:** `exact_node_id` (optional — see Graphify Pointer)
- **Confidence:** user-confirmed | inferred
- **First seen:** YYYY-MM-DD
```

A term with more than one plausible target uses a candidate list instead of a single line, and `ambiguous` as its confidence:

```markdown
### <term as the user said it>
- **Maps to:**
  - `path/or/symbol/A` — <one-line what it is> (graphify node: `exact_node_id_a`, optional)
  - `path/or/symbol/B` — <one-line what it is> (graphify node: `exact_node_id_b`, optional)
- **Confidence:** ambiguous
- **First seen:** YYYY-MM-DD
```

Multiple phrasings for the same target become alias lines under one entry, not separate entries.

## Graphify Pointer (optional)

Check the *project's own* convention for where its graphify graph lives (its CLAUDE.md or equivalent) rather than assuming a fixed path — the tool's bare default and a given project's chosen location can differ. If a graph exists there and the target resolves to a graph node, add its exact node ID as a `**Graphify node:**` line — not a label-based query. Labels collide: more than one node can carry the same human-readable label, and a label-based `graphify explain "<label>"` can silently resolve to the wrong one. Resolve the exact ID once (match on `source_file` / path, not just the label) and store that ID.

**Query only — never build.** If no graph exists yet, that's not a reason to create one. Building/updating a graphify graph is a deliberate, expensive, main-agent-only action in its own right (see the project's own graphify conventions, if it has them) — a glossary lookup never triggers it as a side effect. Omit the field entirely when no graph exists, or when the target has no corresponding node in whatever graph does exist — don't fabricate one and don't go build one.

**The pointer is orientation, not authority.** Same standing as graphify itself wherever a project has spelled that out: useful for quick orientation, never the sole basis for a claim about the code. The node ID in particular is a cache on top of `Maps to`, never the source of truth — it's derived from path + symbol name, so it drifts whenever the file/symbol is renamed or moved (same staleness class as the path itself), and graphify has changed its own ID-generation scheme across versions before, which can invalidate every stored ID at once with no error, not just this one entry. Before using a stored node ID for anything, re-verify it still resolves in the *current* graph. If it doesn't, don't treat the entry as broken — re-resolve a fresh node ID from the `Maps to` path/symbol against the current graph instead, and quietly correct the stored ID (no need to ask for this specific repair; you're not changing the mapping, only refreshing a derived cache of it).

## Before Writing: Dedup Check

Grep the target area file — and, if unsure, the others too, since a term can drift to a different file over time — for the term or an obvious synonym before proposing a new entry. Found a near-match? Propose adding the new phrasing as an alias under the existing entry instead of a duplicate — but this is still a write, still needs the ask (see Ask First above). Skip only the grep step itself when the area file doesn't exist yet; the ask step is never skipped.

## Before Writing: Ambiguity Check

Before proposing a single target, ask yourself: could this same term just as plausibly mean something else in this project (a same-named symbol elsewhere, a different feature using the same word, two files that both fit)? A second hit only counts as a real candidate when it has its own genuine signal (a source file, real usage, real connections) — a coincidental name-only match with no substance behind it (an empty stub, a generic AST artifact with no source) is noise, not a candidate; don't let it force an `ambiguous` proposal.

Found a real second candidate? Bring back every plausible candidate in the same ask (see Ask First) and let the owner pick — never pre-select one to keep the question shorter, and never write `ambiguous` as a way to skip asking.

## Before Trusting an Existing Entry

An entry's target can go stale after a refactor or rename. Before acting on a glossary lookup as fact, confirm the path/symbol still exists (file search, not a guess). If it's gone, that's an update to propose — ask before fixing it, same as any other write.

An entry marked `ambiguous` is not resolved — don't silently pick the first or most-obvious-looking candidate when you hit one. Ask the user which candidate they mean, then propose updating the entry to a single-target one with the answer.

## Confidence Tag

The ask (above) always happens; this tag records what the answer actually told you — not whether you asked.

Three states only:
- `user-confirmed` — the user's answer confirmed the mapping is correct
- `inferred` — the user greenlit writing it down, without confirming the mapping itself is correct (they're trusting your read, not vouching for it)
- `ambiguous` — the owner didn't settle on one candidate, so more than one remains plausible

Never upgrade an `inferred` or `ambiguous` entry to `user-confirmed` on your own initiative — only on an answer that actually confirms the mapping.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Writing (new entry or extending one) without asking first | Always ask — present the buzzword and your finding, wait for the answer, before touching any file |
| Treating "just an alias" as not needing the ask | An alias is still a write. Ask. |
| Writing an entry for every file lookup | Only when the user's wording and the code reality genuinely diverged |
| Skipping the dedup check | Creates 2-3 entries for the same thing under different phrasings |
| Marking your own guess as `user-confirmed` | Keep it `inferred` unless the answer actually confirms the mapping |
| Trusting an old entry blindly | Verify the target still exists before acting on it |
| Picking one candidate when a term is genuinely ambiguous, to avoid asking | Bring back all candidates and ask — never pre-select to save a question |
| Storing a label-based graphify query | Store the exact node ID — labels can collide and resolve to the wrong node |
| Opening the glossary to decide how to build or judge something | Past the gate — work from spec/plan/card; report the gap instead |

## Red Flags — Stop and Ask

- "This is obviously right, no need to check"
- "It's just a small addition to an existing entry"
- "Asking right now would interrupt what we're doing"
- "I'll log it and mention it afterward"

All of these mean: stop, ask first, then write.
