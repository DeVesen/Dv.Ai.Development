# Spec — export-nightly

## Behaviour
- B1 The job reads yesterday's bookings from the reporting API.
- B2 Rows whose `state` is `cancelled` are excluded.
- B3 The result is written as CSV to the export directory.
- B4 A run that writes zero rows still writes the file, with the header only.
- B5 On an API error the job writes no file and leaves the previous file untouched.
- B6 The job logs one summary line per run: row count and duration.

## Acceptance
- A1 A run over the fixture dataset produces a CSV with 42 rows plus header.
- A2 A run with only cancelled bookings produces a header-only CSV.
- A3 On a simulated API 500, the job exits with a non-zero status and the
  previous export file is byte-identical afterwards.
- A4 The summary log line appears exactly once per run.
- A5 The export directory path is read from configuration, not hardcoded.

## Constraints
- Python 3.11, standard library plus `httpx`.
- No changes to the reporting API client.
