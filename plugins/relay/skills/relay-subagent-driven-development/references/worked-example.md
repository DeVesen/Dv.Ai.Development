# Worked Example

A five-task plan for a row-import command: parsing, validation, a report
format, and rows that must be skipped instead of stopping the whole import.
Approved on round 2 of its review. `relay-plan-execution` routed here because
the plan has five tasks with clear seams and subagents are available; two
people are idle, waiting to ship today.

Setup: worktree verified, `.sdd-workspace/` resolved, ledger created, pre-flight
conflict scan clean (recorded in the ledger anyway, with its rows).

**Tasks 1-3** go through the ordinary loop: implementer dispatched per
`implementer-prompt.md`, DONE, reviewer dispatched per
`task-reviewer-prompt.md`, Card Validity "no concern" each time, one Important
finding on Task 2 (missing edge case), one fix round, re-review clean.
Ledgered and complete.

**Task 4**: card instructs the code to silently skip rows where the ID field
is blank. Implementer reports DONE. Reviewer's Card Validity section fires:

> `02-spec.md` §3 states "any row that cannot be processed is reported to the
> user by name; nothing is silently dropped." Task 4's card, verbatim, says
> "rows with a blank ID are skipped without being reported." These conflict —
> the card, not the implementation, is in question.

**What this skill does:** stop. Do not dispatch Task 5. Do not resume Task
4's implementer with a corrected instruction. Classify: `02-spec.md` §3 is
unambiguous and the card contradicts it outright — plan-level, destination
`relay-planning`. Blast-radius check: Task 3's card also has a silent-skip
branch for a different bad-data case — flagged in the log as a suspected
match for the same finding, not touched. Ledgered:

```
Task 4: STOPPED — Card Validity — card says "skip blank-ID rows silently",
02-spec.md §3 requires every unprocessable row reported by name. Routed to
relay-planning. Suspected same pattern in Task 3 (already complete) — flagged,
not reopened.
```

`06-implementation-log.md`'s Deviations section carries the same entry.
Tasks 1-3 stay complete, with their evidence. Task 5 is not started — it
consumes Task 4's row-skip output shape, which is now in question.

**What failed under test instead (do not do this):** a controller given this
exact finding, under the same two-idle-people pressure, reasoned "the spec is
authoritative, so confirming that and fixing the card is just applying the
standing rule" — and edited the card, re-dispatched Task 4 with the corrected
instruction, and kept going through Task 5. The fix was almost certainly the
right fix. `04-plan.md` still says the wrong thing for the next person who
opens it, and nobody but that one session ever knew a correction had been
made.

**Handed off:**

> Log written to `.../06-implementation-log.md`. Tasks 1-3 complete and
> reviewed clean (Task 2 needed one fix round). Task 4 stopped: its card
> instructs silently skipping blank-ID rows, which contradicts
> `02-spec.md` §3's requirement that every unprocessable row is reported by
> name. Plan-level — routed to `relay-planning`. Task 3's already-completed
> code has the same pattern for a different case, flagged in the log as a
> suspected match, not reopened. Task 5 not started, since it consumes Task
> 4's output. Continue with `relay-planning`, go to a different step, or
> stop here?
