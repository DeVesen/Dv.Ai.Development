# Spec — 2026-08-31-relay-link-check

## What is wanted

A small command-line script that checks every relay skill document for broken
relative Markdown links, so a broken `references/...` pointer is caught locally or
in CI instead of by the next reader.

## Behaviour

- **B1** — The script scans every `SKILL.md` file under `plugins/relay/skills/`
  (all skill directories, recursively) for Markdown links of the form
  `[text](target)`.
- **B2** — For each link whose target is a relative path (not starting with
  `http://`, `https://`, or `#`), the script checks whether the target exists on
  disk, resolved relative to the directory of the file containing the link. Any
  query string or anchor suffix on the target (`path#section`) is stripped before
  checking.
- **B3** — Every missing target is reported to stdout as one line in the exact
  format: `<file>: <target> not found`, where `<file>` is the path of the SKILL.md
  relative to the repository root.
- **B4** — The script exits with code 0 when no broken link was found, and with
  code 1 when at least one was found.
- **B5** — Links with `http://`, `https://`, or pure `#anchor` targets are ignored
  entirely — they are never checked and never reported.

## Acceptance

- **A1** — `node tools/check-relay-links.mjs` run from the repository root against
  the current repository exits with code 0.
- **A2** — After adding `[x](references/does-not-exist.md)` to any one `SKILL.md`,
  the same run prints exactly one line naming that file and that target in the B3
  format, and exits with code 1.
- **A3** — A `SKILL.md` containing `[docs](https://example.com)` and `[jump](#top)`
  produces no report line for either link.

## Constraints

- Node.js >= 20, ES modules (`.mjs`).
- Node standard library only — no npm dependencies, no `package.json` change.
- The script lives at `tools/check-relay-links.mjs`.
