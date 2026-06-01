---
name: angular-new-app-extension
description: >
  Portable follow-on to [angular-new-app](../angular-new-app/SKILL.md): documentation-first
  validation, mandatory AskQuestion Decision Gate (questionnaire), written implementation plan before any
  CLI execution, and narrow subagent tasks. Use after loading angular-new-app when creating a new Angular
  workspace or app via the CLI, for greenfield scaffolding with explicit user approval, or when a cheap
  subagent should only run pre-approved ng commands.
disable-model-invocation: true
---

# Angular New App Extension

**Load order:** read **[angular-new-app](../angular-new-app/SKILL.md)** first for baseline CLI steps (`ng new`, generators, MCP); then apply **this extension** for stricter orchestration and approvals.

This extension is an **orchestration layer**, not a replacement for the upstream skill. A **cheap/subagent** receives only **narrow, user-approved** tasks (see [subagent-prompts.md](subagent-prompts.md)).

---

## Role and forbidden behavior

- **Parent agent (this extension):** discovery, documentation check, **Decision Gate** (`AskQuestion` or equivalent), **written** implementation plan, delegation to subagents.
- **No silent product decisions.** Suggested defaults are applied only after explicit user confirmation.
- **No** `next`/`rc`/pre-release toolchains without separate approval.
- Placeholders in commands must stay readable: `APP_NAME`, `TARGET_DIR`, `PACKAGE_MANAGER`, `AI_CONFIG` — **no** empty or ambiguous placeholder fragments.

---

## Step 0 — Documentation first (before decisions)

Before locking CLI commands, align the plan with **current** Angular references (at minimum):

| Topic | Source |
|--------|--------|
| `ng new` options and defaults | [angular.dev/cli/new](https://angular.dev/cli/new) |
| Node / TypeScript / RxJS compatibility | [angular.dev/reference/versions](https://angular.dev/reference/versions) |
| Support lifecycle | [angular.dev/reference/releases](https://angular.dev/reference/releases) |
| IDE / LLM context | [best-practices.md](https://angular.dev/assets/context/best-practices.md), [Develop with AI](https://angular.dev/ai/develop-with-ai) |

From the docs, confirm **array-style / repeated** flag syntax for the exact CLI version you target (per `ng new` help / docs at creation time).

---

## Step 1 — Decision Gate (required)

Full checklist: [questionnaire.md](questionnaire.md).

- Use **`AskQuestion`** when available; otherwise ask the same items conversationally.
- Proceed to the implementation plan only after all **relevant** items are answered.

---

## Step 2 — Implementation plan (required before `ng new`)

After the Decision Gate, produce a **short, auditable plan**:

1. **Goal:** workspace name, app name (if different), target directory.
2. **Tooling:** Node vs. Angular requirements, package manager, CLI invocation pattern from [angular-new-app](../angular-new-app/SKILL.md) (global `ng` vs. `npx`).
3. **Exact `ng new` command** as one code block — placeholders or final values **after** approval.
4. **Follow-up steps:** e.g. `ng build`, `ng test`; `ng serve` only if the user asked.
5. **Subagent split:** map work to roles in [subagent-prompts.md](subagent-prompts.md).

Run subagents or shell commands only after **explicit user approval** of the plan.

---

## Step 3 — Subagents (after approval)

Templates: [subagent-prompts.md](subagent-prompts.md).

Typical order:

1. `docs-check` → 2. `workspace-scout` → 3. `app-skeleton` → 4. `quality-runner`; `feature-builder` only after a **separate** feature plan and approval.

The parent agent summarizes results and surfaces **explicit** next decisions — no silent autopilot.

---

## Optional layout conventions

If the target repo includes **[angular-developer-extension](../angular-developer-extension/SKILL.md)** and the user opts in via the questionnaire, schedule `feature-builder` only after that separate approval.

---

## Quality bar (after creation)

- At minimum: successful `ng build` when the user requested a build.
- If tests are in scope: commands appropriate to the chosen `--test-runner` / generator output.

---

## Anti-patterns

- Starting `ng serve`, dev servers, or long background jobs without user approval.
- Global `@angular/cli` install without confirming package manager and user preference (baseline: [angular-new-app](../angular-new-app/SKILL.md)).
- One subagent asked to “implement the whole product” — split work.
