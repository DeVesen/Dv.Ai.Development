---
id: STORY-007
parent: FEAT-001
type: story
status: implemented
slug: startupclaude-worktree-workflow-doku
touches:
  - StartUpClaude.md
---

# StartUpClaude.md: Worktree-Workflow-Doku

**Als** jemand, der den Harness in einem neuen Projekt einrichtet
**möchte ich** eine Anleitung zum Worktree-Workflow
**damit** ich Ort-Konvention und Bootstrap-Config korrekt konfiguriere.

## Beschreibung

Neue Setup-Sektion (D3/D7):
- **Worktree-Workflow** erklärt (ein Worktree pro Feature, Naming `feat-<nnn>-<slug>`).
- **Ort-Konvention** `<project-root>/worktrees/` (Geschwister zum Repo, außerhalb).
- **Bootstrap-Config-Kopier-Liste** — was, und wo konfiguriert.
- **Repo-Dir-Pointer** — dass der Repo-Unterordner aus der CLAUDE.md-Projektmap kommt.

## INVEST
Erfüllt. Reine Setup-Doku, eigene Datei, unabhängig.

## Akzeptanzkriterien

<!-- rd:ac:start -->
`StartUp_WorktreeSektion_ErklaertOrtUndNaming`
- Arrange: StartUpClaude.md
- Act: neue Sektion ergänzt
- Assert: Sektion beschreibt `worktrees/`-Ort + Naming `feat-<nnn>-<slug>`
Status: erfüllt — §7 „Ein Worktree pro Feature — Ort & Naming"

`StartUp_BootstrapConfig_Dokumentiert`
- Arrange: neue Sektion
- Assert: erklärt Config-Kopier-Liste (Zweck + wo sie liegt)
Status: erfüllt — §7 „Frischer-Worktree-Bootstrap & Config-Kopier-Liste"

`StartUp_RepoDirPointer_Dokumentiert`
- Arrange: neue Sektion
- Assert: erklärt, dass der Repo-Unterordner aus der CLAUDE.md-Projektmap gelesen wird
Status: erfüllt — §7 „Repo-Dir-Pointer — kein Hardcoding"
<!-- rd:ac:end -->

## Annahmen / Offene Punkte
- Hängt inhaltlich an den finalen Ort-/Config-Entscheidungen aus STORY-001/002.
