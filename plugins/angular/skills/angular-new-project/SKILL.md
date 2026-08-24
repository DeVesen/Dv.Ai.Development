---
name: angular-new-project
description: Use when scaffolding a brand-new Angular workspace or app from scratch — ng new, "create a new Angular project", choosing workspace/app name, routing/SSR/zoneless/style flags, or package-manager/CLI-availability decisions. Not for adding a component/service/route to an existing app — that's ng generate on an established codebase.
---

# Angular New Project

Orchestration, not direct implementation. Three gated steps, in order — never skip the Decision Gate to save time.

## Step 0 — Docs check

Before proposing any flag or version, confirm against current docs (don't rely on training-data defaults, they go stale):

| Topic | Source |
|---|---|
| `ng new` options | angular.dev/cli/new |
| Node/TS/RxJS compatibility | angular.dev/reference/versions |
| Support lifecycle | angular.dev/reference/releases |
| AI agent context | angular.dev/assets/context/best-practices.md |

## Step 1 — Decision Gate (required, never skip)

Work through every relevant item in [references/questionnaire.md](references/questionnaire.md) before drafting a plan — use structured questions (`AskQuestion`) where available, otherwise conversational. Do not silently assume a default the user hasn't confirmed for anything product-relevant (styling stack, test runner, SSR, package manager).

If the user pushes back on the question count ("just scaffold it, whatever the defaults are", "no 20 questions") — compress, don't skip: batch the product-relevant items (styling, test runner, SSR/zoneless, package manager) into one structured question and let the rest fall back to documented defaults. "The user asked to skip it" is not an exemption from the gate, only a reason to ask it in one round-trip instead of many.

## Step 2 — Implementation plan (before any shell command)

Output a short, checkable plan **before** running anything:

1. Workspace name, app name, target directory.
2. Node/Angular requirements, package manager, CLI access pattern.
3. The exact `ng new` command as a code block (character-for-character what will run).
4. Follow-up steps (`ng build`, `ng test`; `ng serve` only if requested).
5. Subagent breakdown, if the work will be dispatched — see [references/subagent-prompts.md](references/subagent-prompts.md).

Shell execution and subagent dispatch happen only after **explicit user approval** of this plan.

## Step 3 — Execute (after approval)

Subagent order: `docs-check` → `workspace-scout` → `app-skeleton` → `quality-runner`. `feature-builder` only after a separate, approved feature spec — never bundle "implement the whole product" into one subagent. Full prompt templates: [references/subagent-prompts.md](references/subagent-prompts.md).

Quality bar after creation: `ng build` succeeds (if requested); tests via whichever `--test-runner` was chosen in the Decision Gate.

CLI flag syntax and `ng generate` mechanics: skill `angular-cli`.

## Constraints

- No silent product decisions — every default needs user confirmation, even when the user asked for speed over questions (compress the ask, don't drop it).
- No `next`/`rc`/pre-release Angular version without separate approval.
- No empty or ambiguous placeholders in the final command — `APP_NAME`, `TARGET_DIR`, `PACKAGE_MANAGER`, `AI_CONFIG` must all be resolved.
- No `ng serve`/dev server without user approval.
- No global `@angular/cli` install without confirming the package manager first.
- One subagent = one narrow, documented task — never "implement the whole product."
