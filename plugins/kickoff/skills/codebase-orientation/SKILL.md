---
name: codebase-orientation
description: Use when an existing repository has no CLAUDE.md or a thin one, when agents keep asking where the sources, frontend, backend or pipelines live, or when architecture documents (checklist, concept, brief) exist and a short developer-facing summary is needed — "orient the project", "CLAUDE.md aufbauen", "Architektur für Agenten zusammenfassen", "Agenten finden sich nicht zurecht", "Projekt für Agenten aufbereiten".
---

# Codebase Orientation

Gives developer agents (main and sub-agents) a short, correct picture of the project: what it is, where things live, which stack and rules apply. Combines a scan of the local repo with the kickoff documents. Output is a compact `CLAUDE.md` block plus detail files only where needed. Feature, spec and plan documentation belongs to the forge skills.

Read `${CLAUDE_PLUGIN_ROOT}/shared/conventions.md` first.

## Flow

1. **Scan the repo** (read-only): top-level layout, manifests and lockfiles (stack and versions), test setup, pipeline files (YAML, workflows), infra folders, existing `CLAUDE.md`. Details: `references/scan-checklist.md`.
2. **Read documents**: the architecture checklist/concept and brief from the Kickoff block, plus any files the user adds. Ask once whether there are more.
3. **Cross-check**: facts from code beat facts from documents. Report mismatches (document says X, repo shows Y) as findings, never paper over them.
4. **Ask the developer** for the constraints neither source answers, bundled in one message: build/test commands, forbidden areas, conventions that bite newcomers.
5. **Propose** the block and any detail files per `references/summary-format.md`. Show the diff for `CLAUDE.md`; write only after approval.

## Rules

- Short wins: the block is read at every session start. Anything long goes to `docs/architecture/` (path from the Kickoff block) and is linked.
- Every line is a fact an agent can act on (location, version, command, rule). No prose about history or intent.
- DERIVED facts from documents stay marked in the detail files; in the block, include only what the repo or the user confirmed.
- Commands in the block are verified, not guessed: run build/test/lint with a narrow, side-effect-free invocation (ask first if it is slow or touches external systems), keep the form that worked, and label any command you could not run as "unverified" inside the block. A wrong command costs every agent a failed first try.
- Never commit.
