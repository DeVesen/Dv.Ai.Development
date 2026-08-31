# Plan — export-nightly  (round 3 draft)

## Tasks
### Task 1 — API fetch
Files: src/export/fetch.py · Produces: fetch_bookings(day: date) -> list[Booking]
Steps: test for 42-row fixture; implement; run.
Done when: fetch_bookings returns 42 rows for the fixture day.

### Task 2 — filter and write
Files: src/export/write.py · Consumes: fetch_bookings(day: date) -> list[Booking]
Produces: write_csv(rows: list[Booking], path: Path) -> int
Steps: test excluding cancelled; test header-only case; implement; run.
Done when: cancelled rows are excluded and a header-only file is written for an
empty input.

### Task 3 — error path
Files: src/export/run.py · Consumes: write_csv(rows: list[Row], target: Path) -> None
Steps: test that no file is written on API error; implement; run.
Done when: on an API error no new file appears.

### Task 4 — summary log
Files: src/export/run.py · Steps: test one log line; implement; run.
Done when: one summary line per run.

### Task 5 — config
Files: src/export/config.py · Steps: test path from config; implement; run.
Done when: the export path comes from configuration.
