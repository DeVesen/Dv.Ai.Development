---
name: relay-finishing-a-development-branch
description: Use when a branch's work is built, its tests pass, and nobody has yet decided how it gets integrated. Also use after relay-reporting has told the requester where things stand, or after relay-reviewing-implementation has returned approved, before assuming the branch is automatically merged, pushed, or discarded. Also use when tempted to offer to discard a branch nobody asked to discard, when a worktree removal is refused and `--force` looks like the fast way past it, or when the base branch to merge into hasn't been confirmed.
---

# Relay Finishing a Development Branch

## Overview

**Core principle:** verify tests → detect environment → present options → execute the choice → clean up. The integration decision belongs to the requester, not to whoever finishes the code.

## When to Use

- Implementation is complete and its tests pass.
- `relay-reporting` has written a report and the requester needs to decide
  what happens to the branch next.
- `relay-reviewing-implementation`'s latest round is `approved` and nobody has
  yet said whether it gets merged, pushed for a PR, or left as-is.

## When NOT to Use

- **Tests are still failing.** Fix them, or hand back to whichever build
  stage owns the failure — this skill's own first step stops here too; see
  Step 1.
- **Nobody has asked to discard the work.** Discarding is a path this skill
  supports only in direct response to an explicit request — never something
  offered on a hunch that the requester is "probably done with this."

## Scope: An Integration Technique, Not a Numbered Relay Stage

The relay's own chain ends at `relay-reporting` — its report tells the
requester where the work stands, and `relay-reviewing-implementation`'s
verdict tells them whether it is correct. Neither stage decides whether the
branch actually merges. This skill is where that decision gets made and
carried out.

It writes no relay artifact and appends nothing to `00-journal.md`. Its
record is the git history itself — the merge commit, the pushed branch, the
pull request — and whatever cleanup log the chosen option below produces.

## Step 1: Verify Tests

Run the project's full test suite, using this project's own testing tooling —
`dev-mcp`'s `test_dotnet_solution` / `test_angular_project`, never a raw shell
`dotnet`/`ng`/`npm` call, per this project's MCP-First rule.

**If tests fail**, report the failures and stop — the menu in Step 4 comes
only after a green suite:

```
Tests failing (<N> failures). Must fix before completing:

[Show failures]
```

**If tests pass:** continue to Step 2.

## Step 2: Detect Environment

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
# Capture now, while still inside the workspace — Step 5 changes directory
# before cleanup (Step 6) needs this value
WORKTREE_PATH=$(git rev-parse --show-toplevel)
```

This determines which menu to show and how cleanup works:

| State | Menu | Cleanup |
|---|---|---|
| `GIT_DIR == GIT_COMMON` (normal repo) | Standard 3 options | No worktree to clean up |
| `GIT_DIR != GIT_COMMON`, named branch | Standard 3 options | Provenance-based (see Step 6) |
| `GIT_DIR != GIT_COMMON`, detached HEAD | Reduced 2 options (no merge) | Externally managed — leave in place |

## Step 3: Determine Base Branch

The base branch is whatever this work forked from — usually named in the
plan, in `00-journal.md`, or the branch's own upstream. If it isn't already
known, ask the requester: "This branch split from <best guess> — is that
correct?" Confirm before merging: merging into the wrong base is expensive to
undo.

## Step 4: Present Options

**Normal repo and named-branch worktree — present exactly these 3 options:**

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)

Which option?
```

**Detached HEAD — present exactly these 2 options:**

```
Implementation complete. You're on a detached HEAD (externally managed workspace).

1. Push as new branch and create a Pull Request
2. Keep as-is (I'll handle it later)

Which option?
```

Present the menu exactly as written, and wait for the requester's answer — the
integration decision is theirs, not this skill's to infer. Discarding the
work happens only in direct response to an explicit request for it (see
*If the requester asks to discard the work* below), never offered here.

## Step 5: Execute Choice

### Option 1: Merge Locally

```bash
# Get main repo root for CWD safety
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"

# Merge first — verify success before removing anything
git checkout <base-branch>
git pull
git merge <feature-branch>

# Verify tests on merged result, via this project's own test tooling
<dev-mcp test_dotnet_solution / test_angular_project>
```

If tests fail on the merged result: stop, leave the worktree and branch in
place, and investigate — nothing has been pushed, so the merge is local and
recoverable.

Once the merged result is green: clean up the worktree (Step 6), then delete
the branch:

```bash
git branch -d <feature-branch>
```

### Option 2: Push and Create PR

```bash
git push -u origin <feature-branch>
# From a detached HEAD, name the new branch on the remote:
# git push origin HEAD:refs/heads/<new-branch>
```

Then create the pull request against `<base-branch>` against Azure DevOps —
this repo's remote — following its template and conventions if present, and
report the URL to the requester.

Keep the worktree — the requester iterates on PR feedback there.

### Option 3: Keep As-Is

Report: "Keeping branch <name>. Worktree preserved at <path>."

### If the requester asks to discard the work

This path exists only as a response to an explicit request to throw the work
away. Confirm first:

```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Wait for that exact confirmation. When it arrives:

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
```

Then clean up the worktree (Step 6) and force-delete the branch:

```bash
git branch -D <feature-branch>
```

## Step 6: Cleanup Workspace

**Runs for Option 1 and confirmed discards.** Options 2 and 3 always preserve
the worktree. Both callers have already changed directory to the main repo
root — worktree removal must run from outside the worktree — and use the
`GIT_DIR`/`GIT_COMMON`/`WORKTREE_PATH` values captured in Step 2, from before
that directory change.

**If `GIT_DIR == GIT_COMMON`:** normal repo, no worktree to clean up. Done.

**Project-specific ownership check.** This project does not use `.worktrees/`
or `worktrees/` — a dot-segment path there silently breaks the Angular test
builder into matching zero files while still reporting green (see this
repo's own Worktree-Konvention in `CLAUDE.md`). Its worktrees instead live as
a sibling directory one level above the workspace root, named
`<parent-directory>\<root-folder-name>-wt-<name>`.

**If `WORKTREE_PATH`'s parent directory is the workspace root's own parent,
and its folder name matches `<root-folder-name>-wt-*`:** this relay's own
worktree convention created it — cleanup is ours:

```bash
git worktree remove "$WORKTREE_PATH"
git worktree prune  # Self-healing: clean up any stale registrations
```

**If removal is refused** (`contains modified or untracked files`): the
worktree holds files that exist nowhere else — uncommitted plans, notes, or
scratch work. Never `--force` on your own initiative. Show the requester
what's at stake and ask:

```bash
git -C "$WORKTREE_PATH" status --porcelain -uall
```

```
Worktree removal refused — these files were never committed:

<file list>

1. Commit them to <branch> before cleanup
2. Move them into <main repo root>
3. Delete them (unrecoverable)

Which?
```

Carry out the choice, then remove the worktree.

**Otherwise** (the path doesn't match this project's own worktree naming):
something else — the host environment, a manual `git worktree add`, a
different tool — owns this workspace. Leave it in place.

## Quick Reference

| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|---|---|---|---|---|
| 1. Merge locally | yes | - | - | yes |
| 2. Create PR | - | yes | yes | - |
| 3. Keep as-is | - | - | yes | - |
| Discard (explicit request only) | - | - | - | yes (force) |

## Rationalization Table

| Excuse | Reality |
|---|---|
| "Tests passed earlier this session" | Run the suite on the tree about to be integrated. A green run only proves the tree it ran on. |
| "They obviously want it merged" | Integration is the requester's decision. Present the menu and wait. |
| "They seem done with this feature — I'll offer to discard it" | The menu is complete as written. Discarding happens only when asked for, in so many words. |
| "'Yeah, get rid of it' counts as confirmation" | Only the typed word `discard` authorizes deletion. |
| "The PR is up, so the worktree is clutter now" | PR feedback gets fixed in that worktree. It stays until the work lands. |
| "This other worktree looks stale — I'll clean it too" | Clean up only worktrees matching this project's own naming convention. Everything else belongs to whoever created it. |
| "Removal refused — `--force` just finishes the cleanup" | The refusal means files exist only in that worktree. `--force` destroys them permanently. Show the requester and ask. |
| "The merged-result failure is probably flaky" | A failing merged result stops everything. Branch and worktree stay put while it's investigated. |
| "The base branch is obviously main" | Confirm the fork point or ask. Merging into the wrong base is expensive to undo. |
| "The push was rejected — force-push will fix it" | A rejected push means the remote moved. Investigate; force-push only on the requester's explicit request. |
