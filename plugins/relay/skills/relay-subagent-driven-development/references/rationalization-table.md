# Full Rationalization Table

Every excuse below was produced by an agent under test — either testing the
original `subagent-driven-development` technique this skill forks, or testing
this skill's own Card Validity rule.

## Card Validity (this skill's own addition)

| Excuse | Reality |
|---|---|
| "I don't send this back to a human for a go/no-go. I treat it as a plan defect, not an open design question. I update the card text on the spot." | Verbatim from testing. The card being obviously wrong does not make repairing it this stage's job. Stop, classify, name the destination. |
| "My judgment call is narrower: confirm the reviewer read both documents correctly, not decide which philosophy of correctness to prefer." | Confirming which document wins IS deciding — it just doesn't feel like deciding when the answer seems obvious. The next reader of `04-plan.md` sees a corrected card with no record of who corrected it or why it was wrong. |
| "The spec is authoritative by construction, so fixing the card to match it isn't my opinion." | The standing rule that the spec wins is a rule for stages that write the fix, not licence for whichever stage discovers the conflict to also be the one that writes it. |
| "I did a blast-radius check and found Task 3 has the same issue — I'll flag it, not fix it, so that part's fine." | Correct instinct on Task 3, and it does not rescue the Task 4 fix made without routing. Doing one part right does not offset doing the other part wrong. |
| "Two people are idle waiting to ship today, I can't stall on a human for this." | Naming the destination and stopping costs one message. The two idle people cost more if the fix ships wrong twice. |
| "I'll rule on it like any other plan-text conflict." | The ruling mechanism exists for the plan being internally correct but under-specified. A card contradicting the spec is categorically different and excluded from ruling by design. |

## Process mechanics (inherited from subagent-driven-development)

| Excuse | Reality |
|--------|---------|
| "Close enough on spec compliance" | Reviewer found spec gaps = not done. Fix or hit the cap and adjudicate — those are the only exits. |
| "I'll fix it myself, dispatching is overhead" | Controller fixes pollute your context and skip review. Resume the implementer. |
| "One more round will converge" | Past the cap, rounds don't converge — the failure is structural. Adjudicate and route. |
| "The reviewer will just find something new anyway" | Scoped re-reviews verify fixes; they cannot wander. New findings on untouched code go to the ledger, not the loop. |
| "This finding is obviously wrong, I'll drop it" | You adjudicate only at the cap, and every ruling is a ledger entry. Silent discards are forbidden. |
| "The fix was small, skip the re-review" | Unreviewed fixes are how regressions land. Every round ends with a scoped re-review. |
| "Reviews slow the loop down" | The loop without reviews is just unverified churn. Reviews are the loop's brakes and steering. |
| "Ledger bookkeeping is overhead" | The ledger is what survives compaction. Controllers without one have re-dispatched entire completed task sequences. |
| "The implementer spawned its own reviewer — free extra assurance" | It's a duplicate seat reviewing the same diff; the task review is the gate. A worker-spawned reviewer is a defect to flag, not rigor. |

## Card-cannot-be-finished (inherited from the earlier relay-implementing skill)

| Excuse | Reality |
|---|---|
| "The findings are nitpicks about the plan document, not about what we're actually building." | Then the stage whose job it is will close them in one pass. A rejected verdict is not a severity rating you get to re-score. |
| "So I implemented the spec, not the plan's mechanism." | You were right about the mechanism and you still routed nothing. Now the tree and the plan disagree, and only you know. |
| "One orthogonal fix — it turns the suite green and gives whoever implements this a measurable 'the suite passes'." | It changed what the software computes, with no card and no requirement behind it, and it erased the baseline that lets the next person tell their breakage from the one already there. |
| "As asked, I didn't play either of them back, and I didn't touch the plan." | Half right. Not touching the plan is correct. Not naming the defect anywhere durable is how the next holder of that card rediscovers it alone. |
| "There's a flaky test in there, ignore it — it's unrelated." | Flaky is a claim somebody made. Deterministic or not is something you find out by running it. |
| "I'd rather have working code today than a tidy folder." | The folder is how the next stage knows what was verified. |
| "Just tell me when it's done and I'll take your word for it." | Then the log is the only thing left standing when the demo is over. Write down what the command printed. |
