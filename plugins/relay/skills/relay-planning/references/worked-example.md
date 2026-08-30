# Worked Example — an approved spec whose sharp reading finds a requirement gap

Referenced from `SKILL.md`. Read it when you want the full narrative of a gate
that opens, a plan that is then correctly *not* written, and the handoff that
replaces it.

An approved spec for a weekly reconciliation between a staff list and a software
vendor's licence-seat list: eight requirements, eight acceptance entries, one of
them an ordered cascade for an unreadable source. The spec deliberately leaves the
wording of one command to planning, in the requester's own words. Three
implementers idle from 09:00, the requester on leave for a week, "just get me
something I can hand out".

**What failed under test (do not do this).** Four subjects wrote plans — one of
them 1,192 lines, one 2,986 with complete source code in it. Between them: no file
path an implementer could open (three of four), *"Same shape as Task 1"* handed to
someone who cannot see Task 1, five behavioural rules the spec does not contain
decided at planning and labelled reversible, sample files nobody had made the head
of the plan, a runtime invented and then coded against, a coverage table over
requirements but not acceptance, and no successor named. Every one of them also
found the same real requirement-level gap — two of the three reported categories
were indistinguishable as written — and every one planned past it.

**What this skill does instead.** The gate first: latest round `approved`, so
planning is open. Then the reading, and the sharp reading finds the gap: the spec
asserts every mismatch is exactly one of three kinds, and two of the three describe
the same rows unless the staff list keeps people after they leave. Is that a fact
or a decision? Partly a fact — whether the list keeps leavers is in a sample file
somebody can send within the hour. So: get the sample. It does keep them, with a
status field.

That leaves the decision: which status values mean somebody has given up their
seat. Nothing contains that answer; a person owns it, and two answers change what
the requester reads — a colleague on long-term leave either appears as a leaver
holding a seat or does not. Requirement-level. Every task classifying a mismatch
would have to implement it. So the plan is **not written**, and this is the whole
of the handoff:

> Not planned. The spec's three mismatch kinds cannot all be derived as written:
> two of them describe the same rows unless the staff list distinguishes people who
> have left, and it does — by a status field, which I confirmed from a real extract
> rather than asking anyone. What is not decided is which status values mean the
> person has given up their seat; someone on long-term leave sits on either side of
> that line depending on the answer, and the requester is the only person who can
> draw it. That is requirement-level, so it goes to `relay-refining`. Nothing else
> in the spec is blocked — once that answer exists this is a six-task plan and I
> can write it the same day. Continue with `relay-refining`, go to a different step
> instead, or stop here?

One question, one named destination, nothing to throw away. The three idle mornings
are now a decision the lead makes with real information, instead of a plan that
spends them building the wrong half of a comparison.
