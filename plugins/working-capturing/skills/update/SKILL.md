---
name: update
description: Use when resuming work on a branch that has commits a base branch doesn't (or vice versa) and the project's application docs (glossary/module/feature profiles) might be missing capabilities or structure introduced since they were last reviewed.
---

# Update

## Overview

Finds what changed **in git** since the docs were last reviewed, and turns that into candidates for the existing `glossary` / `module-profile` / `feature-profile` skills. This skill is a **supplier, not a writer** — it never touches `docs/application/` itself.

## Phase Gate — Up to the Spec Only

Running this skill **is** a capture, not a consultation: it's started deliberately, with the owner present to answer the asks it feeds. So it isn't bound to the spec phase, and the reads it needs — git history, plus the current docs for the overlap check — are allowed as part of it.

What it must never become is a briefing for work in progress. From the spec onward, a planner, implementer or reviewer works against the spec, the plan and the task card, and nothing beside them. A diff-derived finding goes into a capture ask — never into an answer about how to build whatever is being built right now.

## When to Use

- Switching branches, or resuming after a gap, and application docs may be stale relative to the branch you're now on
- Explicit ask: "was hat sich seit main getan", "docs auf den Branch-Stand bringen", "commits gegen main prüfen und Doku nachziehen"

## When NOT to Use

- Sweeping the current conversation for capture-worthy findings → `actual-knowledge` (different source: session, not git history)
- You already know exactly which file/symbol changed and what it means → skip straight to the owning capture skill (`glossary` / `module-profile` / `feature-profile`)

## Procedure

1. **Ask the base branch — don't assume.** "main" is a guess, not a default; a stale or wrong guess produces a diff against the wrong ground truth. Ask if it isn't already stated or obvious from context (e.g. an open PR target). Confirm the base ref is current before diffing (`git fetch`, or ask whether local main is trusted) — a diff against a stale local base silently under-reports.

2. **Get the commit/file list, not judgment yet.** `git log <base>..<branch> --oneline` for the commit list, `git diff <base>...<branch> --stat` for files touched. Prefer project-provided tools when available (e.g. `git_changed_files`/`git_diff_summary` via a project's dev-mcp-style server, `review_git_diff` via a codebase-analyzer-style server) — they exist precisely for this and are more precise than raw grep. Fall back to plain `git`/`diff` when a project has none.

3. **State your coverage plan before diving in, not after.** A 300-commit / 300-file diff cannot be read line-by-line — that's fine, but say so upfront: which files/areas you'll read in full vs. sample, and why. Silently sampling and only disclosing the gap in the final report (after the reader already trusted the result) is the failure mode this step exists to prevent.

4. **Check for overlap before treating a diff as new.** The base branch may have grown the same capability independently (parallel work, convergent naming). Read the current docs for the affected area first — a diff-derived finding that's already covered, even under different names, is not a candidate.

5. **Hand off — never write freehand into existing docs.** Every surviving finding goes to whichever of the three capture skills owns it, in its own required shape:
   - a term/naming mapping → `glossary`
   - a service's or library's structure/consumers → `module-profile`
   - a user-facing capability → `feature-profile`

   Read the target skill before proposing its candidates — don't improvise the format because it "looks like a small addition." Bundle all candidates for one target skill into that skill's single ask, same as those skills already require for any other source of findings.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Assuming the base branch is `main` without asking | Ask; a wrong base silently changes what counts as "new" |
| Diffing against local base without checking it's current | Fetch, or explicitly confirm local base is trusted |
| Sampling a huge diff and only admitting it in the final report | State the coverage plan (full vs. sampled, and why) before reading |
| Editing `capabilities.md`/`module.md` directly in whatever shape fits | Route through the owning capture skill and its format |
| Treating every diff hunk as a new finding | Check existing docs first — the base may already cover it differently |
