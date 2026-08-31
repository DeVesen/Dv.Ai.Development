# Plan — 2026-08-31-relay-link-check

## What is being built

A command-line script, `tools/check-relay-links.mjs`, that scans every `SKILL.md`
under `plugins/relay/skills/` for Markdown links with relative targets, prints one
line per target that does not exist on disk, and exits 1 if any were found and 0
otherwise — so a broken `references/...` pointer is caught locally or in CI.

## Global Constraints

- Node.js >= 20, ES modules (`.mjs`).
- Node standard library only — no npm dependencies, no `package.json` change.
- The script lives at `tools/check-relay-links.mjs`.

## Files and what each is responsible for

| File | Responsibility | Task |
|------|----------------|------|
| `tools/check-relay-links.mjs` | New. The entire checker: walk `plugins/relay/skills/` for `SKILL.md` files, extract Markdown link targets, skip external/anchor targets, check relative targets on disk, report misses to stdout, set the exit code. | Task 1 |
| `plugins/relay/skills/relay-init/SKILL.md` | Temporarily modified during verification only (three fixture links appended, then reverted). Left byte-identical to its committed state when the task is done. | Task 1 |

## Decisions taken at planning

- **Link extraction runs one regex over the whole file content**,
  `/\[[^\]]*\]\(([^()]+)\)/g`, rather than line by line. Anchor: B1 defines the
  form `[text](target)` without restricting it to one line, and link text in the
  existing corpus can wrap across lines. Line-by-line matching would silently skip
  such links; whole-content matching is the only reading that fulfils B1 on the
  real files.
- **"Exists on disk" means `fs.existsSync`** — a file or a directory both count as
  existing. Anchor: B2 says "exists on disk" without restricting to files.
- **A target that is empty after stripping the anchor/query suffix is skipped**
  (e.g. a hypothetical `[x](?query)`). Anchor: B2 strips before checking; an empty
  path names nothing checkable, and B5 already excludes the pure-`#` case. No such
  link exists in the corpus, so nothing observable changes.
- **Report lines appear in sorted directory-walk order** (directories and file
  names sorted lexicographically, links in file order). Anchor: B3 fixes the line
  format but not the ordering; a deterministic order makes CI diffs stable.
- **Reported file paths always use forward slashes**, even on Windows. Anchor: B3
  shows `<file>` relative to the repository root in the acceptance examples'
  POSIX style, and the intake asks for lines a CI log can grep.
- **The repository root is `process.cwd()`**. Anchor: A1 pins the invocation as
  `node tools/check-relay-links.mjs` run from the repository root; the script does
  not try to locate the root itself.
- **`<target>` in a report line is the target verbatim as written in the link**,
  including any anchor/query suffix. Anchor: B2 scopes stripping to "before
  checking" only, and B3 reports "the target"; this records the reading, it does
  not alter it.

## Tasks

### Task 1 — Link checker script

**Files** —
- `tools/check-relay-links.mjs` (create; the directory `tools/` does not exist yet
  and is created with it)
- `plugins/relay/skills/relay-init/SKILL.md` (temporary fixture edit in Steps 1–5,
  reverted in Step 5; must show as unmodified in `git status` before Step 1)

**Consumes** — nothing.

**Produces** — `tools/check-relay-links.mjs`, invoked as
`node tools/check-relay-links.mjs` from the repository root; prints
`<file>: <target> not found` lines to stdout; exit code 0 = no broken links,
1 = at least one broken link. No later task consumes it.

**Steps** —

- [ ] Step 1: From the repository root, append three fixture links to one skill
file (this is the failing-state fixture; it is reverted in Step 5):

```bash
cat >> plugins/relay/skills/relay-init/SKILL.md <<'EOF'
[x](references/does-not-exist.md)
[docs](https://example.com)
[jump](#top)
EOF
```

- [ ] Step 2: Run the checker before it exists — confirm the red state:

```bash
node tools/check-relay-links.mjs; echo "exit: $?"
```

Expected: Node reports the module cannot be found (`ERR_MODULE_NOT_FOUND`) and
the exit code is non-zero.

- [ ] Step 3: Create `tools/check-relay-links.mjs` with exactly this content:

```js
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, sep } from "node:path";

const SKILLS_ROOT = "plugins/relay/skills";
const LINK_PATTERN = /\[[^\]]*\]\(([^()]+)\)/g;

function findSkillFiles(dir) {
  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findSkillFiles(full));
    } else if (entry.name === "SKILL.md") {
      files.push(full);
    }
  }
  return files;
}

let brokenCount = 0;
for (const file of findSkillFiles(SKILLS_ROOT)) {
  const content = readFileSync(file, "utf8");
  for (const match of content.matchAll(LINK_PATTERN)) {
    const target = match[1];
    if (
      target.startsWith("http://") ||
      target.startsWith("https://") ||
      target.startsWith("#")
    ) {
      continue;
    }
    const checkPath = target.split("#")[0].split("?")[0];
    if (checkPath === "") {
      continue;
    }
    if (!existsSync(join(dirname(file), checkPath))) {
      console.log(`${file.split(sep).join("/")}: ${target} not found`);
      brokenCount += 1;
    }
  }
}
process.exit(brokenCount > 0 ? 1 : 0);
```

- [ ] Step 4: Run the checker against the fixture — confirm detection (spec A2)
and that the external and anchor links produce no lines (spec A3):

```bash
node tools/check-relay-links.mjs; echo "exit: $?"
```

Expected stdout, exactly one report line:

```
plugins/relay/skills/relay-init/SKILL.md: references/does-not-exist.md not found
exit: 1
```

- [ ] Step 5: Revert the fixture edit:

```bash
git checkout -- plugins/relay/skills/relay-init/SKILL.md
```

- [ ] Step 6: Run the checker against the clean repository (spec A1):

```bash
node tools/check-relay-links.mjs; echo "exit: $?"
```

Expected: no report lines, `exit: 0`.

**Done when** — Steps 4 and 6 produced exactly the expected output shown in their
step (one report line + exit 1 with the fixture; no output + exit 0 without it),
and `git status` shows `plugins/relay/skills/relay-init/SKILL.md` unmodified and
`tools/check-relay-links.mjs` as the only new file.
