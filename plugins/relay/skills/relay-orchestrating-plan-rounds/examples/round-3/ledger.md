# Orchestrator ledger — export-nightly

L-01  root: No card asserts the process exit status, so A3 is only half carried
      category coverage · seen: PR1-06 (round 1), PR2-03 (round 2)
      round 1 wording: "no task asserts the exit code"
      round 2 wording: "Task 3's done-when does not check exit status"
      re-planner round 1: closed — "added exit-status wording to Task 3 done-when"
      re-planner round 2: closed — "clarified Task 3 done-when"
      attempts: 2

L-02  root: Task 2 / Task 3 signature mismatch on write_csv
      category seam · seen: PR2-07 (round 2)
      re-planner round 2: closed — "aligned Task 3 Consumes"
      attempts: 1

L-03  root: Task 4 and Task 5 could be one card
      category other · seen: PR1-03, PR2-05 · status: dropped in round 2

L-04  root: write.py would read better as writer.py
      category other · seen: PR2-06 · status: dropped in round 2

L-05  root: Task ordering puts config last
      category other · seen: PR2-09 · status: dropped in round 2
