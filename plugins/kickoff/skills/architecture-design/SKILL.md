---
name: architecture-design
description: Use when a new software product or app needs its architecture clarified before specs, plans or code exist — stack, architecture style, interfaces, security and auth, file structure, operations — or when someone says "architecture kickoff", "design the architecture", "how should we build this", "grill me on the architecture", "Architektur klären", "Basisarchitektur", "grüne Wiese", "neues Projekt, noch kein Code", "durchgrillen".
---

# Architecture Design

Turns a vague product start into a shared architecture baseline through brainstorming with recommendations, not a form. Architecture only: no views, pages, components, specs or plans. The skill is neutral about language and framework; examples in the references are offers, never defaults.

Read `${CLAUDE_PLUGIN_ROOT}/shared/conventions.md` first (config block, status labels, common rules).

## Flow

1. **Collect material.** If no material was named, your first message asks only: do any files or notes exist (project brief, requirements, workshop notes, `.md`/PDF/other)? Read all of it. No material is fine; the architect then answers more. Never require `project-brief`. Files the user did not name stay unread unless they sit in the folder the user pointed to and belong to this project.
2. **Play back.** Summarise what the material already answers as DERIVED, or DECIDED where a source marks it so. Let the user correct before the first question.
3. **Grill through the catalog** in `references/questions-catalog.md`, in its order, skipping what is settled. Protocol rules: `references/decision-log.md`.
4. **Close**: collect open points, mark module dependencies as DERIVED to check.
5. **Deliver** (only when asked): `references/deliverables.md` — checklist, concept, overview graphic.
6. **Verify** before handing over: `references/quality-check.md`.

## Conversation rules

- **Exactly one question per message**, and the first question comes in the message after the material request. Several questions in one message get answered partially and the rest silently drops; a broad topic is split across messages instead (scale first, team next). A side check such as "is this available for you?" belongs into the recommendation text as an assumption, not as a second question; the message contains one question mark.
- Recommend first, then alternatives. The user decides faster with something to reject.
- Architecture and file skeleton before detail; details (status model, role matrix) become OPEN points.
- A decision that depends on the customer goes behind an interface and is marked OPEN.
- Check current versions/LTS before recommending one; do not recite from memory.
- When asked to explain without file talk ("coffee machine mode"), use everyday language and plain text diagrams.
- Changing an earlier architecture decision is a new, documented decision.
