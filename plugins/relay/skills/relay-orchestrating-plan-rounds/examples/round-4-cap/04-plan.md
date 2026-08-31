# Plan — export-nightly  (round 4 draft)

## Files and what each is responsible for
| file | responsibility | task |
| src/export/fetch.py | reporting API read | 1 |
| src/export/write.py | filter + CSV write | 2 |
| src/export/run.py   | orchestration, error path, summary log | 3, 4 |
| src/export/config.py| paths from configuration | 5 |

## Tasks
### Task 3 — error path
Files: src/export/run.py
Consumes: write_csv(rows: list[Booking], path: Path) -> int
Steps:
- [ ] Step 1: test that an API 500 produces no new file and a non-zero exit
- [ ] Step 2: implement the error path
- [ ] Step 3: run the test
Done when: on an API error no new file is written and the process exits non-zero.

(Tasks 1, 2, 4, 5 unchanged from round 3 and raised no findings this round.)
