---
name: actual-knowledge
description: Use when the user asks for a capture pass over the current session — "was gibt's zu erfassen", "capture", "capturing" — and when a substantial stretch of work just finished (feature done, tests green, before wrapping up), to offer one. Sweeps the conversation for anything worth recording as project knowledge and brings it back as a single bundled ask.
---

# Actual Knowledge

## Overview

Three kinds of project knowledge get captured in this family of skills: **terms**, **module profiles** (services, shared libraries, executables), and **feature profiles**. Each has its own passive trigger — something you notice in passing. This skill is the active counterpart: it sweeps the whole session on purpose and brings back everything worth capturing in one go, so nothing is left sitting in a conversation that's about to end.

This skill dispatches; it never captures on its own.

## Phase Gate — Up to the Spec Only

**A sweep is a capture, not a consultation** — it's run with the owner present to answer the ask, so it isn't tied to a phase; the natural seam it's offered at is usually the end of an implementation session, and that's intended.

What stays closed is reading the profiles *as input* to work: from the spec onward, a planner, implementer or reviewer works against the spec, the plan and the task card, and nothing beside them. So a sweep may establish what's already recorded in order to write, and may hand candidates to the three target skills — but it never turns into a briefing for whatever is being built right now. The gate is the phase you're in, not the role you hold.

## When to Use

- The user explicitly asks for a capture pass ("capture", "capturing", "was gibt's zu erfassen", "anything worth writing down?")
- A substantial stretch of work just finished — feature implemented, tests green, branch about to close, session winding down — then **offer** a sweep (see Offering below); don't run it unasked

## When NOT to Use

- One single thing to capture, already obvious, and nobody asked for a sweep → go straight to the matching skill below
- Mid-task, unprompted: an unrequested sweep interrupts. Wait for the ask or a real seam in the work.

**An explicit request always wins over these.** When the user asks for a sweep, run it — even if the session looks thin, even if you think there's only one thing in it. "Nothing new to capture" and "just this one item" are findings you establish by running steps 1-2, not guesses you make up front.

Also: the bare word "capturing" names *this* skill, not one of the three single-target capture skills — treat it as a sweep request, not as ambiguous.

## The Three Targets

| Candidate looks like | Skill to dispatch to |
|---|---|
| A word/phrase someone used that maps to a specific place in the code | `glossary` |
| What a service or shared library is for, how it's built, what it talks to or who consumes it | `module-profile` |
| What a feature is for, what a user can do in it, which layers it spans | `feature-profile` |

Each target skill owns its own storage layout, entry format, maturity/confidence tags, and graphify rules. Read every target skill you have a candidate for — before the ask, not after, since step 2 needs their storage layouts to check what's already recorded. Follow their rules; don't reimplement them here, and don't invent a format.

**A candidate that fits none of the three** — a real finding that isn't a human-originated term, isn't one service's structure, and isn't user-observable behavior (a de-facto shared type across layers, say) — must be neither forced into the closest category nor dropped. Put it in the bundled ask as its own "open item" group: what you found, why it fits none of the three, and let the owner decide. You may name the category you'd guess and why, as long as it reads as a question, not as a placement you've already made.

Where such an item lands is the owner's call, and their answer is what unlocks writing it: if they name a category, follow that target skill's rules; if they name a location and shape, follow that. Without one of those, there is nothing you're allowed to write — a bare "yes, write it down" isn't enough, so ask which of the two you should treat it as rather than inventing a format. And if an open item was raised in an earlier sweep and declined, don't raise it again; note it as previously declined at most once, then let it go.

**A candidate whose storage root isn't defined** is still a candidate. Both profile skills forbid inventing a root and instead fold the location question into their ask — do the same here: keep the candidate in the bundle and add the one location question to the same message. That's not "one interruption per candidate"; it's still one ask.

**A shared library is a module candidate, not a homeless one.** Cross-cutting code that several units pull in — auth/permission helpers, shared models, utility packages — has a home: `module-profile` with `Kind: library`, where the consumer list is the point. Don't route it to the open-item group just because it isn't a deployable.

## Offering (at a natural seam, unasked)

Offer once, in one message, mentioning roughly what you'd bring back ("I've got a couple of glossary terms and one feature capability from this session — want me to run a capture pass?"). If the answer is no, drop it; don't re-offer for the same stretch of work.

## Sweep

1. **Scan the session** for candidates in all three categories — the whole conversation, not just the last few turns. Look at: terms the user used that you had to resolve, services you worked in or explained, features you touched and behavior you discovered along the way.
2. **Check what's already recorded** before proposing anything. A candidate that's already captured, unchanged, is not a candidate. This also catches corrections: something recorded that turned out wrong *is* worth proposing.

   Check against **the files on disk**, not against what a summary or a project doc claims is there — locate the records yourself, and read CLAUDE.md from disk rather than trusting the copy in your context, which can predate a change. A stated path that doesn't exist, or records that live somewhere other than the documented root, is exactly what this step is for: proposing writes into a path that isn't the real one creates duplicates nobody finds later. Also verify that paths inside existing records still resolve; a stale record is a correction candidate.

   **Verify the candidates too, not just the records.** A finding recalled from earlier in the session can be wrong in its details — a symbol you place in the wrong project, a dependency count from memory. Check each candidate's concrete claims against the code before putting it in the ask; the code wins over recollection. A candidate that dissolves under checking isn't a candidate, and one whose details were off gets proposed corrected, with the correction named.
3. **Bundle everything into ONE ask.** All candidates, grouped by category, each with what you found and where it lives. Never one interruption per candidate — a sweep that asks eight separate questions is worse than no sweep. Say which are solid and which are guesses; that framing is for the reader, while the recorded tags (confidence / maturity / coverage) are set in step 4 from what the answer actually says.
4. **Write only what comes back approved**, following each target skill's own rules for the items it owns. Approved for one category ≠ approved for another, and approving a category doesn't approve the shaky items inside it — if an item's own detail was uncertain, say in the ask which parts you'd write on a plain "yes", so a short answer stays unambiguous.
5. **Report what you wrote** — and what you dropped, briefly, so nothing silently disappears.

If nothing survives step 2, say "nothing new to capture" and stop — but still name the candidates you considered and why each was dropped, so the empty result is verifiable rather than just asserted. An empty sweep is a valid result.

## Red Flags — Stop

- Writing anything before the bundled ask comes back → that's the target skills' ask-first rule, and it applies through this skill too
- Asking per candidate instead of once → re-bundle
- Padding the list to make the sweep look productive → an empty sweep is fine
- Improvising an entry format because reading the target skill felt like a detour → read it; the format is its call, not yours
- Running a sweep unprompted mid-task → offer at a seam, or wait to be asked

## Common Mistakes

| Mistake | Fix |
|---|---|
| Capturing directly instead of dispatching | This skill only finds and bundles; the target skill does the write |
| One ask per candidate | One bundled ask, grouped by category |
| Re-proposing something already recorded | Check existing records in step 2 first |
| Trusting a claimed record path instead of looking | Locate the records on disk; a documented path can be wrong |
| Only scanning the last few turns | Sweep the whole session |
| Treating one approval as blanket approval | Only write what the answer actually covered |
| Forcing a homeless finding into the nearest category | Raise it as an explicit open item group in the ask |
| Writing a homeless item off a bare "yes" | Ask which category or shape to treat it as first |
| Re-raising an open item the owner already declined | Let it go after one note at most |
| Proposing a candidate without checking its details | Verify claims against code in step 2; code beats recollection |
| Dropping a candidate because its storage root is undefined | Keep it; add the location question to the same ask |
| Reporting an empty sweep with no reasoning | Name what you considered and why it was dropped |
| Opening a profile to decide how to build or judge something | Past the gate — work from spec/plan/card; report the gap instead |
