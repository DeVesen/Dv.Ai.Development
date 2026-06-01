# Subagent templates (Angular New App Extension)

Each template is intentionally **narrow**: cheap subagents must **not** invent product architecture, only execute documented work. All values come from the already **approved** plan.

---

## Shared prefix (paste into every subagent prompt)

```text
You are a subagent for this subtask only. Do not decide flags or versions without user/parent instructions.
Do not access paths outside the explicitly named workspace unless the parent allows it.
Output: short, structured, facts before opinions, with exit status (OK / BLOCKED with reason).
```

---

## Role `docs-check`

**Purpose:** Briefly verify the approved plan against **current Angular docs**.

```text
Task: docs-check
Inputs (from parent): TARGET_ANGULAR_VERSION_OR_latest-stable, NG_NEW_CORE_FLAGS

1. Read or cite relevant statements from:
   - angular.dev/cli/new for ALL ng-new flags used in the plan
   - angular.dev/reference/versions for NODE/TS for the target version
2. List mismatches (e.g. invalid flag values, incompatible Node range).
3. Result: OK if consistent | BLOCKED with concrete correction suggestions without applying them.
```

---

## Role `workspace-scout`

**Purpose:** Reduce filesystem risk before creating the workspace.

```text
Task: workspace-scout
Inputs: TARGET_ABS_OR_REL_PATH, PLANNED_WORKSPACE_FOLDER_NAME

1. Does TARGET already exist? If yes: empty or name collision (e.g. existing angular.json)?
2. Are write permissions plausible (only operational checks if tooling available)?
3. Result OK | BLOCKED (with path reason).
Do not run ng new.
```

---

## Role `app-skeleton`

**Purpose:** Run only the **once-approved** `ng new` (or `npx` equivalent).

```text
Task: app-skeleton
Inputs: EXACT_CLI_COMMAND_COPY_PASTE_FROM_APPROVED_PLAN

1. Run exactly that command (character for character), no flag changes.
2. If it fails: return full error output to parent, no workarounds without parent.
3. On success: short path to new workspace root + confirm whether install was skipped (--skip-install).
```

---

## Role `quality-runner`

**Purpose:** Verification after creation as requested in the parent plan.

```text
Task: quality-runner
Inputs: WORKSPACE_ROOT, QUALITY_TARGETS (e.g. build,test,lint — only what user wanted)

1. From WORKSPACE_ROOT: run only agreed commands (e.g. npm run / ng build / ng test).
2. On failure: first error with file/line, optional summary of rest.
3. Result OK | FAIL with a concrete next-step suggestion to parent (no app redesign).
```

---

## Role `feature-builder`

**Purpose:** Only **after** separate feature design + approval — first app features per **agreed** layout conventions.

```text
Task: feature-builder
Inputs: APPROVED_FEATURE_SPEC (routes, screens, data), WORKSPACE_ROOT
If the user opted into a repo-local layout skill: read that file before coding (e.g. ../angular-developer-extension/SKILL.md when it exists in this skills tree).

1. Run only specified files/commands (`ng generate` with agreed paths).
2. No new global dependencies without parent approval.
3. Changes: short diff/file list; tests only if agreed in scope.
```

---

## Task-tool note (optional)

Where a task subsystem exists: use **read-only exploration** vs. **general work** by access need; **shell** only for already-approved CLI. Parent keeps transcript and next user questions.
