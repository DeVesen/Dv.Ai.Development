# Scoped Re-Review Prompt Template

Use this template when dispatching a re-review after a fix round. The
re-reviewer verifies the findings were addressed and checks the fix diff for
new breakage — never a Card Validity concern, which does not enter this loop.

```
Subagent (general-purpose):
  description: "Re-review Task N fix round R"
  model: [MODEL — REQUIRED: choose per SKILL.md Model Selection; an omitted
         model silently inherits the session's most expensive one]
  prompt: |
    You are re-reviewing one card's fix round. A previous review produced
    Critical/Important findings (never a Card Validity concern — those are
    routed elsewhere, not fixed); an implementer has attempted to fix them.
    Verdict each finding and inspect the fix diff — nothing else.

    ## The Task

    Read the task brief: [BRIEF_FILE]

    ## The Findings Under Verification

    [FINDINGS]

    ## The Fix

    Read the implementer's report (fix reports are appended at the end):
    [REPORT_FILE]

    **Fix base:** [FIX_BASE_SHA]
    **Head:** [HEAD_SHA]
    **Diff file:** [DIFF_FILE]

    Do not re-run git commands. Your review is read-only on this checkout.

    ## You Do Not Dispatch Subagents

    Do all of this review yourself.

    ## Scope

    Your scope is the findings list and the fix diff. Verdict every finding.
    Inspect the fix diff for new problems the fix itself introduced. Issues
    entirely outside the fix diff go under Out-of-Scope Observations — they
    never extend the loop.

    ## Tests

    Confirm the fix report names the covering tests and shows their output;
    verify against the diff. Do not re-run the suite. Run a focused test only
    when a specific doubt demands it.

    ## Output Format

    ### Finding Verdicts
    Per finding: ADDRESSED | NOT ADDRESSED, with file:line evidence.
    "Attempted" is not addressed.

    ### New Breakage in the Fix Diff
    Severity + file:line. "None" if clean.

    ### Out-of-Scope Observations
    "None" if none.

    ### Verdict
    **Fix round:** [All findings addressed, no new Critical/Important
    breakage | Findings remain open] — list the open ones.
```

**Placeholders:** `[MODEL]`, `[BRIEF_FILE]`, `[FINDINGS]`, `[REPORT_FILE]`,
`[FIX_BASE_SHA]`, `[HEAD_SHA]`, `[DIFF_FILE]` — `[DIFF_FILE]` from
`scripts/relay-review-package PLAN_FILE FIX_BASE HEAD`.
