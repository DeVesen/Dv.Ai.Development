# Plan review — export-nightly · Round 3

coverage report
  acceptance: 4/5 — A3 not fully carried
  behaviour:  6/6

## Findings

id        PR3-01
category  coverage
route     planning
root      No card asserts the process exit status, so A3 is only half carried
problem   Task 3's done-when reads "on an API error no new file appears". A3 also
          requires a non-zero exit status and that the previous file is unchanged.
          No step checks either.
guess     The implementer has to decide whether a caught exception should exit 0.

id        PR3-02
category  seam
route     planning
root      Task 2 produces write_csv(rows, path) -> int, Task 3 consumes
          write_csv(rows, target) -> None
problem   Parameter name and return type both differ from the producing card.
guess     Which signature is real.

id        PR3-03
category  other
route     requester
root      "previous file untouched" is undefined when no previous file exists
problem   B5/A3 assume a previous export exists. First-ever run is unspecified.
guess     Whether a missing previous file is an error.

id        PR3-04
category  other
route     planning
root      Task 4 and Task 5 could be one card
problem   Both touch run.py and are trivially small.
guess     nothing

id        PR3-05
category  other
route     planning
root      Task ordering puts config last though Task 1 already needs a base URL
problem   Reordering would avoid rework.
guess     nothing

id        PR3-06
category  other
route     planning
root      write.py would read better as writer.py
problem   Naming consistency with fetch.py.
guess     nothing

id        PR3-07
category  other
route     planning
root      Task 1's test fixture is not named in the card
problem   "the fixture day" is vague.
guess     Which fixture file.

id        PR3-08
category  other
route     planning
root      Step wording in Task 3 says "implement" without naming the module entry
problem   Style.
guess     nothing

id        PR3-09
category  other
route     planning
root      The plan has no section listing files and responsibilities
problem   Structure section absent.
guess     nothing
