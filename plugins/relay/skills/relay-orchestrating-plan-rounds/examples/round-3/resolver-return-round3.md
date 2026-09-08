# Stage 3 return — export-nightly · Round 3

The resolver writes no file. This is what it returned to the orchestrator: one
answer record per routed finding.

id        PR3-01
herkunft  spec
answer    A caught API error exits non-zero, and the previous file stays as it is.
evidence  "On a simulated API 500, the job exits with a non-zero status and the
          previous export file is byte-identical afterwards" — 02-spec.md, A3

id        PR3-02
herkunft  default
answer    write_csv(rows, path) -> int — the producing card's signature.
evidence  A consumer is renamed to match its producer, not the reverse; the
          producer is the card carrying the test. Reversed by editing Task 3's
          Consumes line.

id        PR3-03
herkunft  requester
answer
question  On a first-ever run there is no previous file. Is a missing previous
          file an error, or does the "previous file unchanged" clause simply not
          apply? A3 and B5 both read as though one always exists.

id        PR3-07
herkunft  fakt
answer    tests/fixtures/bookings-42.json — the 42-row dataset A1 and Task 1 both
          name as "the fixture".
evidence  the only 42-row file under tests/fixtures/ — `ls tests/fixtures/`
