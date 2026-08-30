---
name: relay-reporting
description: Use when finished or part-finished work has to be written up for the person who asked for it — a status update, a hand-back, a sign-off note, or an answer to "how did it go" or "where are we". Also use when about to tell a requester work is done without saying what is still open, when about to hand them a summary written in task numbers, file names or review verdicts, or when a report is due on work that was rejected, stopped, or never built.
---

# Relay Reporting

## Overview

Eighth stage of the relay. Every stage before it wrote for the next person in
the chain. This one writes for **the person who asked in the first place** — who
never saw a numbered requirement, a task card, a finding id or a verdict string,
and who wants to know one thing: *did I get what I asked for, and what do I still
have to worry about?*

Core principle:

> Under test, four subjects wrote this report with no shape to follow. All four
> were honest, none fabricated completion, none refused to write. And no two
> produced the same document: 180 to 244 lines, eight to eleven sections, and not
> one section heading shared between them. One wrote entirely for the relay's own
> operators and bolted a twelve-line section for the requester onto the end.
> Nothing was wrong with the content. The reader was.

This stage does not review, decide, or fix anything. It **translates** a folder
written for engineers into a page written for the person waiting.

## When to Use

- Work has reached the end of the relay, or has stopped somewhere in it, and the
  requester needs to know where it stands.
- Someone asks for a status update, a hand-back note, or a demo-readiness answer.
- A report is due on work that was rejected or never built.

## When NOT to Use

- **The change itself needs checking.** That is
  `relay-reviewing-implementation`, and this stage reads what it wrote.
- **The relay's own conduct is the subject.** That is
  `relay-reviewing-process`, which reads `00-journal.md` and not this report.
- **Something is being fixed.** Reporting does not repair; it says who holds it.

## Read the State First

Default artifact home: `docs/relay/<request-id>-<slug>/`. This is a
**default**, and so is the language the artifacts are written in. Where the
project's always-loaded instruction file names an artifact home or an artifact
language in its `## Relay process discipline` section — installed by
`relay-init` — that binds. Absent it, use the path above and the language of
this conversation, say in your first message which language you are writing
in, and never infer it from files that already exist. Anything quoted from the
requester is recorded in the words they used, never translated. `<request-id>`
defaults to `YYYY-MM-DD` using the date already present in your environment;
never invent one.

Read from disk; never assume live session memory of an earlier stage. You need
`01-intake.md` for the requester's own words, `02-spec.md` for what was promised
and who decided what, `07-implementation-review.md` for what is actually true of
the delivered change, and `00-journal.md` for what happened along the way.
`06-implementation-log.md` is read **last and with the least weight** — it is the
builder's own account of their own work, and under test it was the file most
often wrong. Where a review exists, the review wins.

### The one predicate that shapes the report

The latest `## Round <n>` in `07-implementation-review.md` — the last section in
an append-only file; if order and numbering disagree, the highest `<n>` wins.

**A report is written in every row below.** This is not a gate. Work that is
blocked, stopped, or never started is exactly the work whose requester most needs
telling. What the verdict changes is the **first line**, not whether you write.

| What you find | The first line says |
|---|---|
| `approved` | They have what they asked for. Then what is still worth knowing. |
| `rejected — routed to relay-refining` | It is built, and something nobody decided has turned up. A decision is needed — usually theirs. |
| `rejected — routed to relay-planning` | It is built, and the breakdown it was built from is wrong somewhere. Being reworked; nothing needed from them. |
| `rejected — routed to <build stage>` | It is built, and part of it does not do what was asked. Being fixed; nothing needed from them. |
| `rejected — round cap reached` | It is stuck. Name the person or role it is waiting on, and what they have to settle. |
| `no implementation to review` | Nothing has been built. Name the stage that holds it and why. |
| No `07-…`, but `06-implementation-log.md` exists | Whatever exists — finished or stopped part-way, read the log to find out which — has been checked by **nobody but the builder**. Say that in the first line, and mark every claim you could not check yourself as the builder's own account. |
| No `07-…`, no `06-…`, and `00-journal.md` has a `relay-plan-execution` section naming no build-stage successor | Building stopped before it started. Name where it went, from that section. |
| Neither file and no such section | It has not got that far. Report the stage it is actually at. |
| No artifacts at all | There is nothing to report on. Say so, name `relay-discussing`, and write no file. |

Only the last row writes nothing. Under test, one subject handed a chain that had
stopped after one task of four wrote the honest status report and was right to:
its single most useful sentence existed in no upstream document.

## Who This Is For

Everything else in this skill follows from one question, asked of every sentence
before it is kept:

> **Could the person who asked for this check it themselves — without being shown
> the code, and without being handed this folder?**

If a sentence needs a file name, a task number, a finding id, a requirement id, a
stage name or a verdict string in order to mean anything, it was written for the
wrong reader. Rewrite it as what they will see, type, or experience.

Named, because all of these appeared in real reports under test: `Task 3`, "the
card", `R-5`, `A-11`, `F-2`, `relay-subagent-driven-development`, `06-implementation-log.md`,
`src/reports/reader`, `test_row_bad_in_two_ways_is_reported_once`,
`layer-level`, "round 1 of 2", "rejected and routed". One report used "Task n" or
"card" twenty-four times; another named source files twelve times and test
functions seven times.

Two exceptions, and only two: the closing pointer to where the detail lives may
name the folder, and a **command the reader will actually type** is not an
implementation detail — it is the most checkable thing on the page.

### Translate, do not delete

Dropping the hard parts is the opposite failure and just as bad. Everything real
survives the translation; it changes altitude, not existence:

| Written for the chain | Written for the requester |
|---|---|
| "Task 4 not started, so the command never imports the options module" | "The two new options are accepted and then silently ignored — you get the full unfiltered totals and no error. Do not demo it." |
| "F-1: R-5 not met, extra line on stdout" | "The JSON breaks on any week that had a junk row in it — which is most weeks. Finance cannot paste it yet." |
| "A-11 NOT MET, reason `hours` not `day`" | "A row wrong in both the date and the hours tells you to fix the hours. You asked always to be told about the date, so you would fix it, re-run, and lose the row again." |
| "Suite exits 1, one pre-existing failure" | "The test suite does not pass, and did not before this work either. Please do not tell Finance the tests pass." |

The right-hand column is the report. The left-hand column is why you can write it.

## The Report, Part by Part

Every heading is **required**, in this order, including the ones whose honest
content is "Nothing". A report that lists only good news and a report where
nobody looked read identically.

```markdown
# Report — <request-id>-<slug>

## Where this stands
<One or two sentences, and the first of them answers "did I get what I asked
for". Per the predicate table above. Nothing else goes in front of it.>

## What you asked for
<Their own framing, from `01-intake.md`, in three or four lines. Quote them where
you can. This is a reminder, not a re-derivation — do not rebuild the intake.>

## What you can do now
<One entry per thing they asked for. Each says what is now possible in terms they
recognise, and gives the one thing they can run or look at to see it themselves.
An ask that is not there is listed here too, saying so — not buried further down.>

## What is not right yet
<Every open item, as what they will experience. Anything the review recorded as
not met, not checked, or checked but unverifiable belongs here, in their terms.
"Nothing" if nothing.>

## Decisions you should know about
<Only decisions taken after they last confirmed anything, and only ones that
change what they get. `02-spec.md`'s decisions table tells you which were theirs
already — those do not belong here. "Nothing" if nothing.>

## What we need from you
<A question only they can answer, put plainly enough to answer in one sentence.
"Nothing" if nothing — and say that explicitly, because silence reads as a
pending request.>

## What happens next
<Who holds it now and what the next step is. No date unless a person has
committed to one; a guessed date comes back as a promise.>

## Where the detail is
<One pointer to the folder and what is in it. Not a summary of it.>

<One closing line: where this report's claims come from — checked against the
running software today, or taken from the review of <date> and not re-run.>
```

### The claims are checked, and the evidence stays out

All four subjects under test re-ran the software rather than copying from the
documents. That instinct is right and the report is the wrong place to put the
proof: each of them then spent thirty to fifty lines on evidence tables, run
transcripts and interpreter versions that the requester will never read.

So keep the running, and change where the output lands:

> **Run what you print.** Every command the report tells the reader to type, and
> every output it shows them, is executed once before it goes in. A check
> instruction that does not work is worse than none.
>
> **Print what you ran, not how you ran it.** The evidence for the report is the
> report's accuracy. Its provenance is the one closing line, not a section.

Where the software and the documents disagree, the software wins, and the report
says what the software does.

## Length, and the Test for It

Reports under test ran 180 to 244 lines. One was written for a requester who had
said she needed something to take into a meeting; it came to 244 lines.

> The whole report should be readable in the time the requester would have given
> you if they had asked in person. If it does not fit on about a page and a half,
> what has been added is either the chain's own reasoning or the review's
> evidence — both of which have their own files.

Two things are not padding and stay however small the request was: an open item,
and a caveat that exists in the review. Two things are padding: a risk nobody
recorded, and a caveat invented to make a simple job look substantial.

## Append to `00-journal.md`

Append-only. Never edit a section an earlier stage wrote. The heading names
**this stage**, because `relay-reviewing-process` matches sections to stages by
that name and the journal is its only source.

```markdown
## <date> — relay-reporting
<2-4 sentences of prose: what state the work was reported in and which verdict
that came from, what the requester is being told is still open, anything they are
being asked to decide, and any pressure this stage ran under — a demo, a meeting,
a request to leave something out.>
```

## Hand Off

End with: (1) a **status line** — what was reported and the exact path of
`08-report.md`; (2) the **successor**, `relay-reviewing-process`, which reviews
how the relay itself ran — or, where the report says work is still open, the
stage that holds it, named first; (3) **one question** offering three ways
forward: continue with that successor / go to a different step / stop here.

Never invoke the successor yourself.

## Quick Reference

| | |
|---|---|
| Reader | The person who asked. Not the next engineer. |
| Source of truth | `07-implementation-review.md` over `06-implementation-log.md`. Running software over both. |
| Shape | The eight required headings, in order, every time. |
| First line | Answers "did I get what I asked for", per the verdict predicate. |
| Blocked work | Still gets a report. Only "no artifacts at all" does not. |
| Altitude | Nothing that needs the folder to make sense — except commands they type. |
| Evidence | Run it; do not print it. One provenance line. |
| Length | About a page and a half. |
| Writes | `08-report.md` and one `00-journal.md` section. Nothing else, ever. |

## Common Mistakes

- **Writing the chain's document with a section for the requester at the end.**
  Under test this produced a 180-line status file whose requester-facing part was
  the last twelve lines. If one section is for them, the report is not.
- **Reporting from `06-implementation-log.md` because it is the file about the
  work.** It is the builder's account of their own build. Under test, one such
  log recorded one deviation where there were three, described the code doing the
  opposite of what it does, and named a green test as proof of a behaviour that
  test contradicts. A report written from it would have said "finished".
- **Smoothing a caveat that does not fit the story.** A pre-existing failing
  check, a requirement the review could only mark "not checkable here", a
  decision to leave documentation alone — each is exactly what the requester
  would want to have been told.
- **Manufacturing one.** Sibling stages have twice caught agents inventing work
  to make a stage look busy. The reporting version is padding a small, clean job
  with risks nobody recorded.
- **Giving a date.** Nobody in the chain committed to one, and a guessed date is
  quoted back as a commitment.
- **Leaving `What we need from you` out when the answer is "nothing".** An absent
  section reads as an unanswered request.

## Worked Example

A weekly reporting command. The requester asked for three things in her own
words: only the current week, so she stops hand-cutting rows out of the export;
the totals as JSON, so Finance stops retyping them; and the tool to stop dying on
junk rows and instead tell her which lines to go and fix. All three were built.
The implementation review ran the software and rejected: two of her rules collide
on a command that carries two mistakes at once, and nobody ever decided which
one wins — a gap in what was agreed, not a bug in the code.

**What failed under test.** Four subjects, four different documents, no shared
structure. One put the whole report in the chain's vocabulary and gave the
requester a closing note. Another named source files twelve times and test
functions seven times. Every one of them appended thirty to fifty lines of
verification evidence. Every one was honest; not one was hers.

**What this skill does instead.** The predicate first: latest verdict
`rejected — routed to relay-refining`, so the first line says it is built, it
works, and one thing nobody decided has turned up. Then her three asks, each with
the command she can type to see it. Then the open item, in her terms — *"if you
mistype the date and the format in the same command, you are told about whichever
you typed first, and nothing about the other"* — and the question put plainly
enough to answer in a sentence. Then the caveats the review recorded and the
chain would rather not repeat: the suite has a known pre-existing failure, so
nobody should say the tests pass. Then who holds it, and one pointer to the
folder. Every command in it run once before it went in; none of those runs
printed in it.

Handed off:

> Report written to `docs/relay/2026-08-28-tally-window/08-report.md`. It reports
> the work as built and working but not finished: all three of the asks are
> delivered and checkable, and the implementation review found one thing the
> agreed rules never settled — which mistake is reported when a command carries
> two — so the report puts that question to her directly and asks for nothing
> else. It also carries forward the two things the chain would rather not repeat:
> the check suite has a pre-existing failure and does not pass, and the new
> options are not documented anywhere a colleague would find them. Because the
> work is open, the stage that holds it is `relay-refining`, once she answers.
> After that, `relay-reviewing-process` reviews how the relay itself ran.
> Continue with `relay-refining`, go to a different step instead, or stop here?
