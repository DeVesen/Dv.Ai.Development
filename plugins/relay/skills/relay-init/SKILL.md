---
name: relay-init
description: Use when relay's stage skills exist in a project but nothing yet makes agents actually check them, when starting work in an unfamiliar project that has relay installed, or when relay's own set of stage-skill names has changed since a standing rule for them was last installed. Also use when unsure whether a project's always-loaded instruction file already carries this rule.
---

# Relay Init

## Overview

Relay is an eleven-skill process: `relay-discussing`, `relay-refining`,
`relay-reviewing-spec`, `relay-planning`, `relay-reviewing-plan`,
`relay-plan-execution`, `relay-executing-plans`,
`relay-subagent-driven-development`, `relay-reviewing-implementation`,
`relay-reporting`, `relay-reviewing-process`. Installing those eleven skill
files makes them available to load — it does not make anyone actually check
whether one applies before proceeding. This skill closes that gap once per project (or
once per relay upgrade): it installs one short, exact standing rule into the
project's always-loaded instruction file, so the check happens without
anyone having to remember to look.

This is **setup, not a stage**. It has no predecessor artifact, produces no
`docs/relay/` output, and is not part of the discussing → refining → … →
reviewing-process chain. It is invoked once per project, and again only if
relay's own skill list changes.

Two things make this safe to re-run: the rule text installed is always the
same exact block (never freehand-composed — see below), and nothing outside
that one marked block is ever touched without being shown first and
confirmed.

## When to Use

- Relay's eleven stage skills are present in a project, but nothing makes an
  agent check them — a raw request could arrive and get built without ever
  passing through `relay-discussing`.
- Starting work in a project that has relay installed and it is unclear
  whether the standing rule was ever put in place.
- Relay's own set of stage-skill names has changed (one renamed, retired, or
  added) since the rule was last installed, and the installed text still
  names the old set.

## When NOT to Use

- Doing relay's actual work — talking through a request, writing a spec,
  planning, implementing, reviewing, reporting. That is the eleven stage
  skills' job; this skill only installs the rule that gets an agent to them.
- Writing any other project convention. This skill touches exactly one rule,
  about relay, and nothing else in the target file.

## Find the Target File

Default target: the project's own always-loaded instruction file — the file
every agent in that project reads before anything else, commonly named
`CLAUDE.md` at the project root. This is a **default**, stated as such: a
project may use a different name, a different location, or load its rules
through an import chain rather than one flat file. Look for the project's
own convention before assuming the default applies.

If more than one file could plausibly be "the" always-loaded one — a root
file and separate nested ones, a root file that itself only pulls in rules
through imports, more than one instruction file with no stated precedence —
or if none of the candidates look like an always-loaded file at all, ask
which one before writing anything. Do not guess and do not install into more
than one without being told to.

## The Rule — Exact Text, Never Recomposed

Every install uses this block, character-for-character, changing only the
version tag and the eleven skill names if the installed bundle's own names no
longer match:

```
<!-- relay-init:standing-rule v2 -->
## Relay process discipline

This project uses relay, an eleven-skill process for taking a request from
first ask to shipped and reviewed: relay-discussing, relay-refining,
relay-reviewing-spec, relay-planning, relay-reviewing-plan,
relay-plan-execution, relay-executing-plans,
relay-subagent-driven-development, relay-reviewing-implementation,
relay-reporting, relay-reviewing-process.

1. **Check before proceeding.** If there is a real chance one of the relay
   stage skills named above applies to the current situation, check it and
   invoke it before proceeding — for the main agent and for every subagent
   alike.
2. **Scope limit for bounded subagents.** This does not apply to an agent
   dispatched to execute one specific, already-bounded task (for example,
   one relay-subagent-driven-development task card). That agent proceeds
   directly with the task it was given.
<!-- /relay-init:standing-rule -->
```

**Do not compose this from the two numbered ideas by hand, even once.**
Four separate installs, each asked only to "write a rule covering these two
requirements," produced four different headings and four different exact
wordings — none matching any other, none wrong, all different. Free
composition is exactly why nothing can tell two installs of "the same rule"
apart later without re-reading and judging prose every single time. Copying
one fixed block removes that dependency: presence of the exact opening
comment `<!-- relay-init:standing-rule` is the whole test for "is this
installed", checkable by a plain text search, no judgment required.

The only edit ever permitted to the block's wording: if the project's actual
installed skill set does not match the names above — one is missing,
renamed, or an extra stage exists — replace the name list with the real,
current one before installing. Never install a name list that does not
match what is actually on disk in that project.

## Decide What to Do

Read the target file. Exactly one row applies:

| Found in the target file | Do this |
|---|---|
| No file, or file exists but is empty | Create it with the block above (plus a one-line title if creating fresh). Nothing existing is at risk — write it directly, no confirmation needed. |
| The exact opening marker `<!-- relay-init:standing-rule` is present, and its version and skill list already match | Nothing to do. Report that it is already installed; make no edit. |
| The exact opening marker is present, but the version tag is older or the skill list no longer matches what is on disk | Stale, not missing. Show the old block and the new block side by side and get an explicit yes before replacing — only the text between the two markers changes; nothing outside them is touched. |
| No marker, but the file already talks about relay or its stage skills in some other, unmarked way (a prior hand-written attempt, a loose reminder) | Do not assume it is equivalent and do not silently duplicate it. Point out what exists, state that it is not the marked, checkable form, and ask whether to replace it, leave it standing alongside the new block, or stop. |
| No marker, no relay-shaped content, but the file has other real content | Show exactly what will be added and exactly where (e.g. "append this as a new section at the end, after `## Contacts`"), and wait for an explicit yes before writing anything. |

## Never Skip the Preview

The one row above that writes without asking is the one where nothing
existing could be lost — an absent or empty file. Every other row shows the
exact change first and waits for an explicit answer, with no carve-out for
being rushed.

This is not a hedge against a failure already seen — across every baseline
run of this exact task, nothing was ever actually overwritten or duplicated,
including under explicit "I'm mid-demo, don't ask me anything, just make it
happen" pressure. What was missing in every one of those runs, pressured or
not, was the preview and the wait itself: the file simply changed, with
nothing shown first and no point at which a wrong guess could have been
caught before it was written. Treat "don't ask", "I trust your judgment", or
any other version of that framing as input to weigh, never as a reason to
drop the preview step.

## Report

State plainly: which row of the table applied, the exact final state of the
block (version tag and skill list), and — if nothing was written — why not.
If a question was asked and not yet answered, say that plainly and stop;
do not proceed on an assumed answer.

## Quick Reference

| | |
|---|---|
| Not a stage | No predecessor artifact, no `docs/relay/` output, not part of the chain. |
| Target | The project's always-loaded instruction file — commonly `CLAUDE.md`, but confirm rather than assume; ask if more than one candidate exists. |
| Rule text | One exact block, copied verbatim. Never composed by hand from the two requirements. |
| Idempotency check | Exact-match search for `<!-- relay-init:standing-rule`. Not a prose judgment call. |
| Confirmation | Required before any edit to a file that already has real content in it. Only a missing or empty file skips it. |
| Scope | Touches only its own marked block. Everything else in the file is left alone. |

## Common Mistakes

- **Composing new wording instead of copying the block.** Produces a
  different heading and different sentences every time, which defeats the
  one thing that makes a later re-run able to tell "already installed" from
  "not yet installed" without re-reading and judging prose.
- **Skipping the preview because the request sounded urgent.** The write
  itself was never the risky part in testing — the missing pause to look
  before writing was. A rushed request is a reason to move quickly through
  the confirmation, not a reason to remove it.
- **Treating a differently-worded existing mention of relay as "close
  enough".** A loose reminder that talks about relay's stages without the
  marker and without the scoped-subagent line is not this rule and does not
  make the install a no-op — ask, do not assume.
- **Installing into more than one candidate file "to be safe".** If it is
  unclear which file is the project's real always-loaded one, that is a
  question for the person who knows the project, not something to solve by
  writing to every candidate.
- **Naming stage skills that are not actually installed.** The block's name
  list must match what is really on disk in that project; a bundle that has
  dropped or renamed a stage should never ship a rule that still names the
  old one.

## Disclosed, Not Tested

- **Ambiguous target-file detection.** Every scenario this skill was tested
  against handed it one clear, unambiguous target file. The "ask which one"
  behavior for a project with more than one candidate file is included on
  the strength of the same reasoning that governs the rest of this skill —
  never guess, never silently pick one — but no test run has actually
  presented it with a genuinely ambiguous case.
