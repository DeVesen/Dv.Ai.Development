# Decision Gate — questionnaire (Angular New App Extension)

Before **`ng new`** or equivalent, clarify all **relevant** items for this case. The parent agent uses structured questions (**AskQuestion**) when possible.

Placeholder names in answers: `APP_NAME`, `WORKSPACE_ROOT`, …

---

## A — Scope and intent

- [ ] Create **only** a new Angular workspace with first app, or an **empty workspace** (`--no-create-application`) and add an app later?
- [ ] Production project vs. prototyping/learning? (**Note:** `--minimal` in Angular docs is for experiments, not production.)
- [ ] If the repository includes a **portable layout conventions** skill (for example `angular-developer-extension`), should it be applied to the new codebase **explicitly**? (Yes / No / Later.)

---

## B — Version and risk

- [ ] Angular target: **latest stable** per [Releases](https://angular.dev/reference/releases) or a **fixed** major/minor/patch?
- [ ] Are **preview** builds (`next`, `rc`) explicitly allowed? (Default: **no** without separate approval.)
- [ ] Is local **Node.js** compatible with the target Angular version per [Version compatibility](https://angular.dev/reference/versions), or should Node be upgraded first?

---

## C — Naming and directories

- [ ] `APP_NAME` (workspace and initial project name if default).
- [ ] Separate **app project name** in a multi-project workspace? (Otherwise same as workspace name.)
- [ ] `TARGET_DIR`: absolute or relative path; may a new workspace be created there?
- [ ] `--directory`: different target relative to the invocation? (Yes/No + value.)

---

## D — CLI availability and package manager

- [ ] Access pattern: existing `ng`, or `npx @angular/cli` / `npx ng` without global install?
- [ ] **Global** `@angular/cli` install explicitly desired? (Which package manager: `npm` / `pnpm` / `yarn` / `bun`?)
- [ ] On Windows/PowerShell: **execution policy** for global binaries if needed (see [Local setup](https://angular.dev/tools/cli/setup-local).)
- [ ] `--package-manager`: `npm` | `pnpm` | `yarn` | `bun` | default.

---

## E — Core app flags (`ng new`)

For each boolean: desired **true / false / per current docs default**.

- [ ] `--routing` — enable routing?
- [ ] `--ssr` — SSR / hybrid per current docs?
- [ ] `--zoneless` — app without Zone.js?
- [ ] `--standalone` — standalone API (often default `true`; **still clarify** if migrating legacy.)
- [ ] `--strict` — strict TS/budgets (often default `true`.)
- [ ] `--skip-git` — no Git init in workspace?
- [ ] `--commit` — initial Git commit behavior? (Often default `true`; clarify for CI scripts.)
- [ ] `--skip-install` — skip dependency install?

---

## F — Styles and file names

- [ ] `--style`: per current [CLI new](https://angular.dev/cli/new) (`css`, `scss`, `sass`, `less`, `tailwind`, …) — follow **team or repository policy** for styling stacks.
- [ ] If Tailwind is considered: **`--style` / generator** vs. later **`ng add`** — which approach does the team want (only if policy allows Tailwind)?
- [ ] `--file-name-style-guide`: typically `2025` vs. `2016` — align with **team or repository** naming rules; if a layout skill was opted in under A, align with that skill where it applies.
- [ ] `--inline-template` / `--inline-style` only if deliberate (default is usually external files).

---

## G — Testing and minimal workspace

- [ ] `--skip-tests`: skip unit tests? (Only if user explicitly wants.)
- [ ] `--test-runner`: per docs at target time (e.g. `vitest` | `karma`).
- [ ] `--minimal`: only for learning/experiment confirmed in A.

---

## H — AI IDE configuration

- [ ] `--ai-config`: values per current Angular CLI docs for the chosen version.
- [ ] IDE-specific defaults (e.g. Cursor) may be **suggested** — still confirm with the user; do not force.
- [ ] Should Angular **best-practices.md** be vendored into project or editor config? (Team policy.)

---

## I — Post-create commands (communication)

- [ ] After creation: **only** `ng build` for verification, or also `ng test` / `ng lint` if generated?
- [ ] **`ng serve` / `--open`**: only after user approval (this extension: do not start proactively unless requested).
- [ ] **Accessibility** expectations (WCAG AA, axe) — document if the app is public or regulated.

---

## J — Artifacts and approvals

- [ ] Parent agent outputs **implementation plan** with exactly one proposed `ng new` command (placeholders or final).
- [ ] User says “plan approved” / equivalent — **then** subagents or execution.

---

_End of checklist — for “not applicable”, note explicitly (“N/A …”)._
