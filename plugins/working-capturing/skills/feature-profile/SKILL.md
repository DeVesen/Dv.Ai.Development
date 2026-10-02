---
name: feature-profile
description: Use when you've worked out — or the user explained — what a feature is for, what a user can actually do with it, or which services and areas it spans, and that isn't recorded in the project's feature profiles yet. Also use when deliberately reviewing a feature's code to inventory its current capabilities before planning changes to it.
---

# Feature Profile

## Overview

The main job of a feature profile is a **capability inventory**: the discrete things a user can actually do in this feature, listed one by one. Its purpose is planning safety — when a change is designed against a feature, an existing capability nobody remembered is exactly what silently breaks. Tests catch regressions after the fact; this list keeps them out of the design.

A feature crosses layers by nature (UI components, state, endpoints, storage), so it can never be described from one service's point of view alone.

## Phase Gate — Up to the Spec Only

**As an input to work, these profiles belong to the road up to the specification.** They are consulted while a request is being discussed and while a spec is being written. From the spec onward they are closed: a planner, implementer or reviewer works against the spec, the plan and the task card, and nothing beside them. Needing a profile in order to plan, build or judge means the spec is incomplete — that's a finding to report upward, never a reason to look it up. The gate is the phase you're in, not the role you hold: it binds the main agent just as much.

**Capturing is not consulting.** Recording what was just learned — with the owner present to answer the ask — is this skill's own job and isn't tied to a phase; a capture pass right after an implementation session is exactly what it's for. What the gate forbids is reading a profile *as input* to planning, building or reviewing. The dedup read this skill requires before writing happens inside a capture, so it's allowed there.

**Which side of the gate am I on?** If the answer to "why am I opening this file" is *to decide how to build or judge something*, you're past the gate — stop. If it's *to record or correct what we just established*, you're inside a capture — continue.

## Ask First — No Exceptions

**REQUIRED SUB-SKILL:** the ask-first discipline in `glossary` applies here identically — read that skill's "Ask First" section and follow it. Never create or extend a profile without presenting your finding and getting an answer first. In Review Mode the ask covers the whole draft at once (below), but it is still an ask before any write.

Only the ask discipline is imported. This skill does **not** use the glossary's per-entry confidence tag — `Coverage` is its equivalent, and it grades the inventory as a whole rather than each line. Where that skill's unattended branch says to leave a finding for the next session, this skill's "Handing Off" section (below) governs instead: still no write, but the draft goes back to whoever dispatched you rather than being dropped.

## When to Use

- You're about to plan or design a change to a feature and its current capabilities aren't inventoried (this is the primary case — inventory first, then design against it)
- You're deliberately walking a feature's code to record what it can do today (see Review Mode)
- You discovered a capability, or a cross-layer connection, that the profile doesn't mention
- The user explained a feature's intent, or what it's supposed to let people do
- An existing profile's capability turned out to be wrong or gone

## When NOT to Use

- Nothing new: the capability is already listed, unchanged
- The insight is about one service's or library's internal structure, not user-facing behavior → use `module-profile`
- The insight is a term/naming mapping → use `glossary`

## Storage

One directory per feature, holding a `feature.md`: `<feature-profile-root>/<feature-name>/feature.md`. Take `<feature-profile-root>` from the project's CLAUDE.md (or equivalent instructions file), which names where feature profiles live. Read **the file on disk** — grep it. Neither a claim that the section is missing, nor the copy of CLAUDE.md already sitting in your context, counts as evidence: a context snapshot can predate the section being added, and acting on it lands you in the wrong branch below or writes to a superseded path. Disk wins.

**If no root is actually named:** don't invent one, and don't abort either — fold the location question into the same ask as the finding ("where should feature profiles live? I'd suggest X"). One ask, two questions. Directory structure below the root is this skill's call; the root itself is the project's.

**Directory name:** how the team actually refers to the feature, lowercased with hyphens. If that differs from the code's folder name, that difference is itself a glossary entry — see `glossary`.

**One feature or a part of one?** If what you inventoried is a *component inside* something the team calls a feature (a grid inside a search feature, a dialog inside a wizard), it belongs to the parent feature's directory — as a section of `feature.md`, or as its own reference file there. Only give it its own feature directory if the team talks about it as a feature in its own right. When unsure which, that's a question for the ask, not a guess.

**Language:** follow the project's documentation-language convention (its CLAUDE.md or equivalent will say; if it doesn't, ask as part of the same ask) for prose. Section headings, field names, and the `User can` / `User sees` capability prefixes stay English regardless of prose language — they're structure, not prose, and keeping them fixed makes profiles scannable and machine-comparable across projects.

**Reference files:** split a capability area into its own file (e.g. `grid-capabilities.md`, linked from `feature.md` with a one-line summary) once it passes ~30 capability lines, or once `feature.md` would otherwise exceed roughly 120 lines. Below that, keep everything in `feature.md` — a split that early costs a reader an extra hop for nothing. `feature.md` always stays the entry point.

## Profile Structure

```markdown
# <Feature Name>

**Intent:** <one field, three jobs, in 1-3 sentences: what this feature is for, what it's worth to whoever uses it, and what makes it this feature rather than a neighbouring one>
**Coverage:** partial | inventoried
**Last reviewed:** YYYY-MM-DD  <!-- date the profile was written/updated, not the date of the code walk -->
**Graphify node:** `exact_node_id` (optional — see Graphify Pointer)

## Capabilities
- User can <single, concrete, observable action> — `path/to/where/it/lives`
- User sees <observable state or feedback the user doesn't trigger> — `path`
  - <sub-capability, when it only exists inside the parent one>

## Spans
- **Frontend:** `path` — <role in this feature>
- **Backend:** `<service>` — <role in this feature>
- **Other:** <storage, external system, job — whatever else participates>

## Notes
<intent, deliberate constraints, known gaps, behavior that surprises people>
```

### Writing capabilities

One capability = one thing a user can observably do — or observably see. Split, don't summarize: "user can group rows", "user can collapse a group", "user can pin a column left" — never "grid supports grouping and column management", which hides exactly the details this list exists to preserve. Each line carries the path where the behavior lives, so a planner can jump straight to it.

**Behavior nobody triggers still counts.** Conditional menu items, colored/derived cell states, validation feedback, empty states, auto-refresh — a user never "does" them, but a redesign breaks them just as silently. Write those as "User sees …". Never drop an observable behavior because it doesn't fit the "User can" phrasing; bend the phrasing, not the inventory.

**Internals are Notes, not capabilities** — re-entrance guards, retry timers, state-sync flags aren't user-observable, so they don't belong in Capabilities. But they are exactly the kind of thing a redesign trips over, so record them in Notes rather than dropping them.

**Coverage** is `partial` until someone has walked the feature's code specifically to enumerate capabilities; only then does it become `inventoried`. A profile grown from opportunistic findings stays `partial` no matter how long the list gets — an incomplete list that claims completeness is worse than an obviously partial one, because a planner will trust it.

`inventoried` requires that the walk covered the feature's **user-facing surface** — its templates, its components' handlers, its dialogs. An unverified backend detail (which endpoint serves a capability, exact permission rules) does not block `inventoried`, since the inventory is about observable behavior; note the gap in Notes and move on. An unwalked part of the *visible* surface does block it.

## Review Mode (deliberate capability inventory)

This is the mode that makes the profile trustworthy for planning. When the goal is to inventory a feature rather than log one finding:

1. Find the feature's user-facing surface — its components and templates, its state services, and the API calls its frontend makes — via file search and signature-level reads. Templates and handlers are where capabilities actually show up; a signature list alone will miss them. Stop at the frontend's API-client layer: knowing *that* a capability calls an endpoint is enough for the inventory; tracing that endpoint through backend services is a separate job and not part of this walk.
2. Enumerate every capability you can see, at the granularity above. Note where you suspect more exists but couldn't confirm — and where what you find contradicts what you remembered, treat the code as right and flag the contradiction explicitly.
3. Present the complete draft in ONE ask — not a question per capability. Mark read-directly vs inferred per block, not per line (per-line marking doubles the draft for no gain; mark individual lines only inside a block that mixes both). List what you could not determine. Plain chat text is the right medium — don't publish a draft awaiting approval as a shareable document.
4. Write what the answer confirms or corrects. Set `Coverage: inventoried` only per the rule above; otherwise leave `partial` and record the gap in Notes.

## Before Trusting an Existing Profile

Before planning against a profile, treat it as a lead, not a guarantee: a `partial` profile is explicitly incomplete, so look for capabilities beyond it rather than assuming the list is the whole feature. Verify the paths on the capabilities you're about to rely on still exist — a capability whose path is gone may have moved or may have been dropped, and those need opposite responses. Corrections found this way are writes: ask first, same as any other.

## Graphify Pointer (optional)

If the project has a graphify graph, the same rules as in `glossary`'s "Graphify Pointer" section apply: query only — never build one as a side effect — store exact node IDs rather than label queries, and treat any stored ID as a refreshable cache over the path, not as truth.

A feature spans many nodes, so the optional header pointer is the node for the thing other code enters the feature *through* — its opener/entry service if it has one, otherwise its main component. Can't pick one cleanly? Omit it — the per-capability paths are what a planner actually navigates by, and a wrong pointer is worse than none.

## Handing Off (subagent / can't receive an answer)

If you're running where the owner's answer can't reach you (dispatched subagent, unattended run), the capture cannot complete here — you must not write it. Do the read-only inventory work, then hand the finished draft plus the open questions back to whoever dispatched you, stated as a draft awaiting approval, so they can run the ask. Never present it as recorded, and never leave the inventory entirely unmentioned.

Fields the ask was supposed to settle stay open in a handoff draft: propose a `Coverage` value with your reasoning rather than asserting one, and if the parent-vs-own-feature question (above) is unresolved, say so instead of picking a target path — the draft's destination is part of what's awaiting approval.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Writing or extending a profile without asking first | Present the finding, wait for the answer, then write |
| Summarizing several capabilities into one line | Split them — the hidden detail is what breaks later |
| Capability with no path | Add where it lives, or a planner can't check it |
| `Coverage: inventoried` off opportunistic findings | Only a deliberate enumeration walk earns it |
| One ask per capability in Review Mode | One ask for the whole draft |
| Planning against a `partial` profile as if complete | Treat it as a lead; look past it and verify paths |
| Dropping observable behavior that doesn't fit "User can" | Write it as "User sees" — bend the phrasing, not the inventory |
| Inventing a storage root because CLAUDE.md seems to lack one | Grep to confirm, then fold the location question into the ask |
| Giving a component its own feature directory | If the team calls the parent the feature, it belongs there |
| Writing as a subagent that can't receive the answer | Hand the draft back as awaiting approval; don't write |
| Describing a module's internals as a capability | Internals go in Notes; `module-profile` owns structure |
| Opening a profile to decide how to build or judge something | Past the gate — work from spec/plan/card; report the gap instead |
