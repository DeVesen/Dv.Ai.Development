# Plan review — export-nightly · Round 4

coverage report
  acceptance: 4/5 — A3 NARROWED
  behaviour:  6/6

## Findings

id        PR4-01
category  coverage
route     planning
root      A3's second half is carried by no step: nothing checks the previous
          export file is byte-identical after a failed run
problem   Task 3's done-when now covers "no new file" and "exits non-zero" — both
          added in earlier rounds. A3 also requires the PREVIOUS export file to be
          byte-identical afterwards. No step opens, hashes or compares it. A run
          that truncates the old file in place would pass every step in this plan.
guess     Whether the error path may touch the existing file at all.

id        PR4-02
category  other
route     planning
root      Step wording in Task 3 says "implement the error path" without naming
          the exception type
problem   Style.
guess     nothing
