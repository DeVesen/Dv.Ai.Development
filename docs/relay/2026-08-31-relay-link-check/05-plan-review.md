# Plan Review — 2026-08-31-relay-link-check

## Round 1 — 2026-08-31 — approved

**Verdict: approved.** Every behaviour requirement and every acceptance entry is
carried by a concrete step of Task 1, the single run walks end to end to the
expected outputs, and the one finding (a false corpus fact cited as a decision
anchor) changes nothing that gets built.

### Check results

1. **Coverage and end-to-end run** — no finding. Coverage table below; the run
   (Steps 1–6) was walked carrying the state through: fixture appended →
   `ERR_MODULE_NOT_FOUND` red state → script created → exactly one report line +
   exit 1 (verified against the real corpus: it currently contains five relative
   links, all resolving, zero broken, so the fixture line is the only one) →
   fixture reverted → clean run exit 0. Reverse direction: Task 1 carries only
   spec'd work; the fixture edit is verification scaffolding for A2/A3 and is
   reverted.

   | Requirement | Carried by |
   |---|---|
   | B1 (scan every SKILL.md recursively for `[text](target)`) | Task 1 Step 3: `findSkillFiles` recursion over `plugins/relay/skills` + `LINK_PATTERN` over whole file content |
   | B2 (relative targets checked on disk relative to the file's dir, anchor/query stripped) | Task 1 Step 3: `target.split("#")[0].split("?")[0]`, `existsSync(join(dirname(file), checkPath))` |
   | B3 (report line `<file>: <target> not found`, file relative to repo root) | Task 1 Step 3 `console.log` line; paths are repo-root-relative because `SKILLS_ROOT` is relative and A1 pins cwd; Step 4 checks the exact line |
   | B4 (exit 0 clean / 1 broken) | Task 1 Step 3 `process.exit(brokenCount > 0 ? 1 : 0)`; verified in Steps 4 and 6 |
   | B5 (http/https/pure-# never checked or reported) | Task 1 Step 3 `continue` guard; Step 4 confirms the two fixture links produce no lines |
   | A1 (clean repo run exits 0) | Task 1 Step 6 + done-when |
   | A2 (fixture produces exactly one line in B3 format, exit 1) | Task 1 Steps 1 + 4 + done-when |
   | A3 (https and #top fixture links produce no report line) | Task 1 Steps 1 + 4 (expected output is exactly one line, so the other two fixture links produced none) |

2. **Read it alone** — no finding. The single card contains the complete script
   text, every command verbatim, expected outputs for red and green states, and
   its own precondition (fixture file unmodified in `git status` before Step 1).
   A holder could finish it today with nothing else.

3. **Seams** — no finding. One task; `Consumes — nothing` and its `Produces` is
   the final deliverable, consumed by no later task. There are no seams to break.

4. **Decisions and constraints** — one finding, PR1-01 (advisory), on the
   whole-content-regex decision's corpus claim. All seven decisions were checked:
   each conclusion is anchored in spec text (B1–B3, A1) or is below the
   granularity the requester observes (walk order, empty-target skip — the
   "no such link exists in the corpus" claim there was verified true by scan).
   The forward-slash decision's intake citation ("lines a CI log can grep") was
   opened and holds (`01-intake.md`, clarifications). The script honours all
   three Global Constraints: `node:fs`/`node:path` only, `.mjs` module, exact
   path `tools/check-relay-links.mjs`.

5. **Code steps** — no finding. Step 3's deliverable is the full script in a
   fenced block; Steps 1, 2, 4, 5, 6 carry their commands and expected outputs in
   fenced blocks.

### Findings

- **PR1-01** — advisory — planning defect. The first decision anchors
  whole-content regex matching on a corpus fact that is false: the plan says
  "link text in the existing corpus can wrap across lines. Line-by-line matching
  would silently skip such links", but the corpus (every `SKILL.md` under
  `plugins/relay/skills/`, opened and scanned this round) contains exactly five
  Markdown links, all on a single line — none wrap. The card's holder is left to
  believe a multi-line fixture case exists and might hunt for it or doubt their
  own scan when they cannot find one. The decision's conclusion stands anyway on
  its other anchor (B1 "defines the form `[text](target)` without restricting it
  to one line"), and whole-content matching is a safe superset of line-by-line on
  the real files, so nothing built or observable changes — which is what keeps
  this advisory rather than blocking.
