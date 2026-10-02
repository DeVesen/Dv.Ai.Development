---
name: kickoff-init
description: Use when the kickoff skills run in a project for the first time, when result locations or document language need to be set or changed, or when someone says "kickoff init", "wo sollen die Architektur-Dokumente liegen", "Kickoff einrichten", "Ablageort für die Architektur-Dokumente", "Dokumentsprache festlegen".
---

# Kickoff Init

Sets where kickoff results live and in which language, then records it in the project's `CLAUDE.md` so every later skill and agent finds the same paths.

Read `${CLAUDE_PLUGIN_ROOT}/shared/conventions.md` first; it defines the `Kickoff` block and its defaults.

## Flow

1. Read the project's `CLAUDE.md` and look for an existing `Kickoff` block. If present, show it and ask what to change.
2. Ask **once, bundled** (not file by file): documents folder, document language, and whether the default file names are fine. Offer the defaults as the recommendation: folder `docs/architecture`, files `project-brief.md`, `architecture-checklist.md`, `architecture-concept.md`, `architecture-overview.svg`.
3. Show the resulting block as a proposal. Write or update it in `CLAUDE.md` only after the user agrees. Create no other files, and do not create the documents folder (the producing skills do that).
4. Say which skill comes next: `project-brief` (PM), `architecture-design` (architect), `codebase-orientation` (existing repo).

Not running this skill is fine: all skills fall back to the defaults.
