---
name: relay-using-git-worktrees
description: Use before relay-plan-execution, relay-executing-plans, or relay-subagent-driven-development starts building a card, when the work needs isolation from whatever else is checked out right now. Also use before manually running `git worktree add`, when a worktree might already exist and hasn't been checked, or when picking a location for a new worktree without having read this project's own worktree convention first.
---

# Relay Using Git Worktrees

## Overview

**Core principle:** detect existing isolation first, then native tools, then
the git fallback — never fight the harness, and never place a worktree
somewhere this project's own tooling silently breaks on.

This is a setup technique, not a numbered relay stage. It runs before a build
stage starts, not during one, and it writes no relay artifact.

## When to Use

- Feature work is about to start and needs isolation from whatever branch is
  currently checked out.
- `relay-plan-execution` has just named `relay-executing-plans` or
  `relay-subagent-driven-development` as the build path, and a card is about
  to be built.

## When NOT to Use

- **Already inside an isolated workspace.** Step 0 below exists precisely to
  catch this before creating a second, nested one.
- **The requester has already declined isolation.** Honour that and work in
  place; this skill's own consent question in Step 0 is asked once, not
  re-litigated every time a card starts.

## Step 0: Detect Existing Isolation

**Before creating anything, check whether this is already an isolated
workspace.**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**Submodule guard:** `GIT_DIR != GIT_COMMON` is also true inside a git
submodule. Before concluding "already in a worktree," check for that:

```bash
# If this returns a path, this is a submodule, not a worktree — treat as a normal repo
git rev-parse --show-superproject-working-tree 2>/dev/null
```

**If `GIT_DIR != GIT_COMMON` (and not a submodule):** already in a linked
worktree. Skip to Step 2 (Project Setup). Do not create another one.

Report with branch state:
- On a branch: "Already in isolated workspace at `<path>` on branch `<name>`."
- Detached HEAD: "Already in isolated workspace at `<path>` (detached HEAD,
  externally managed). Branch creation needed at finish time."

**If `GIT_DIR == GIT_COMMON` (or in a submodule):** this is a normal repo
checkout.

Has the requester already stated a worktree preference? If not, ask for
consent before creating one:

> "Would you like an isolated worktree for this? It protects the current
> branch from these changes."

Honour any existing declared preference without asking again. If the
requester declines, work in place and skip to Step 2.

## Step 1: Create Isolated Workspace

**Two mechanisms, tried in this order.**

### 1a. Native Worktree Tools (preferred)

The requester has consented (Step 0). Is there already a way to create a
worktree without shelling out to git directly — a tool named something like
`EnterWorktree`, `WorktreeCreate`, a `/worktree` command, or a `--worktree`
flag? If so, use it and skip to Step 2.

Native tools handle placement, branch creation, and cleanup automatically.
Using `git worktree add` when a native tool exists creates phantom state the
harness cannot see or manage.

Only move to Step 1b if no native worktree tool is available.

### 1b. Git Worktree Fallback

**Only if Step 1a does not apply.** Create a worktree manually with git.

#### Directory Selection

This project has its own worktree convention, and it exists because of a
concrete, verified bug — not a style preference. Follow this priority order:

1. **A declared worktree directory preference in the current instructions.**
   If stated, use it without asking.

2. **This project's own convention: a sibling directory one level above the
   workspace root, dot-segment-free, named after the actual root folder:**

   ```
   <parent-directory>\<root-folder-name>-wt-<branch-name>
   ```

   **Never** `.worktrees/` or `worktrees/` under the workspace root, and
   **never** any other dot-segment path (`.claude/worktrees/...`). This
   project's Angular test builder resolves a real path through a dot segment
   before matching test files — a worktree under one silently matches zero
   test files while the build and test run still report success. There is no
   working `mklink`/junction workaround: Node resolves the real path,
   dot-segment and all, before the builder ever sees it. This project's
   `CLAUDE.md` names this bug explicitly under its own Worktree-Konvention
   section — read it before assuming a different location is fine.

   The root-folder-name prefix is there on purpose: several parallel
   checkouts of this repository sharing one parent directory would otherwise
   collide on the same `wt-<name>` path.

3. **If a sibling directory matching this pattern already exists** for the
   branch in question, use it — don't create a second one.

#### Safety Note (in place of an ignore check)

Superpowers' own version of this step requires verifying a project-local
worktree directory is git-ignored before creating it, because a directory
under the workspace root risks being committed into the repository by
accident. This project's convention avoids that risk a different way: the
worktree sits one level *above* the workspace root, entirely outside this
repository's own tree, so there is nothing here to accidentally commit and no
ignore check to run.

#### Create the Worktree

```bash
ROOT_NAME=$(basename "$(git rev-parse --show-toplevel)")
PARENT=$(dirname "$(git rev-parse --show-toplevel)")
path="$PARENT/${ROOT_NAME}-wt-$BRANCH_NAME"

git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**Sandbox fallback:** if `git worktree add` fails with a permission error
(sandbox denial), say the sandbox blocked worktree creation and continue in
the current directory instead. Run setup and baseline tests in place.

## Step 2: Project Setup

This project's own build tooling, not raw shell commands — per its MCP-First
rule:

- Backend (`src/backend/LAC.sln`, .NET 8): `dev-mcp`'s `build_dotnet_solution`.
- Frontend (`src/frontend`, Angular): `dev-mcp`'s `build_angular_project`
  (covers `npm install` as part of project setup).

Never fall back to a raw `dotnet`, `npm`, or `ng` shell call — this project
treats that as a blocker to raise, not a silent substitute.

## Step 3: Verify Clean Baseline

Run this project's tests before anything is built, via the same MCP-First
tooling:

- `dev-mcp`'s `test_dotnet_solution` for the backend.
- `dev-mcp`'s `test_angular_project` for the frontend.

**If tests fail:** report the failures, ask whether to proceed or investigate
first. A dirty baseline makes every later failure ambiguous — this is worth
raising even under time pressure.

**If tests pass:** report ready.

### Report

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## Quick Reference

| Situation | Action |
|---|---|
| Already in a linked worktree | Skip creation (Step 0) |
| In a submodule | Treat as normal repo (Step 0 guard) |
| Native worktree tool available | Use it (Step 1a) |
| No native tool | Git worktree fallback (Step 1b) |
| A matching sibling worktree already exists for this branch | Use it, don't create a second one |
| No matching sibling worktree exists | Create `<parent>\<root-folder-name>-wt-<branch-name>` |
| Permission error on create | Sandbox fallback, work in place |
| Tests fail during baseline | Report failures + ask |
| No project setup needed | N/A here — this project always has one of `LAC.sln` or `src/frontend`'s Angular project |

## Rationalization Table

| Excuse | Reality |
|---|---|
| "Obviously not in a worktree already — no need to check" | Run Step 0. Harness-created isolation and submodules both fool eyeballing; the detection commands settle it. |
| "`git worktree add` is quicker than hunting for a native tool" | A native tool owns placement, branching, and cleanup. Bypassing it is the #1 mistake — it creates phantom state the harness can't see or manage. |
| "`.worktrees/` is the standard default, just use it" | This project's own convention explicitly forbids it — a dot-segment path there silently zeroes out the Angular test builder's matched files while reporting green. Use the sibling-directory convention instead. |
| "Any sibling directory name works, close enough" | The naming pattern (`<root-folder-name>-wt-<branch-name>`) exists so multiple parallel checkouts of this repo don't collide on the same path. Use it exactly. |
| "The workspace is fresh — baseline tests can wait" | A dirty baseline makes every later failure ambiguous. Run the tests now; proceeding past a failure is the requester's call, not a default. |
| "Raw `dotnet`/`npm`/`ng` is faster than finding the MCP tool" | This project's MCP-First rule treats a raw shell fallback as a blocker to raise, not a shortcut to take silently. |
