---
id: STORY-001
parent: FEAT-001
type: story
status: implemented
slug: feature-delivery-worktree-routing
touches: [feature-delivery/SKILL.md, feature-delivery/flows/implementation-flow.md]
---

# feature-delivery: Worktree-Routing statt Branch-Guard

**Als** Nutzer des Harness
**möchte ich**, dass feature-delivery beim Implementieren einer Story automatisch in den
Feature-Worktree wechselt (oder ihn anlegt)
**damit** ich Features isoliert und parallel umsetzen kann, ohne im Haupt-Checkout den Branch zu wechseln.

## Beschreibung

Der bisherige **Branch-Guard** (STOPP auf master + `git checkout -b`) wird durch **Story-Routing**
ersetzt (D1–D4):

- **Implement-Trigger mit Story** (`implementiere`/`implementiere nur`/from-existing-plan):
  Parent-`FEAT-NNN` + Feature-Slug lesen → Name `feat-<nnn>-<slug>` (`<nnn>` = stabile FEAT-Nummer).
- **Reuse-Erkennung:** `git -C <repo-dir> branch --list "feat-<nnn>-*"` / `git worktree list` →
  existiert → nutzen; sonst `git -C <repo-dir> worktree add <project-root>/worktrees/feat-<nnn>-<slug> -b feat-<nnn>-<slug> HEAD`.
- Alle Code-Ops (Scribes, Build, Test, Reviewer, Sub-Agents) laufen über **Absolutpfade** auf den
  Worktree. Session-cwd bleibt unverändert (kein `EnterWorktree`).
- **`plane` und beratende Reviewer routen NICHT** — sie bleiben, wo sie sind.
- Der master-STOPP entfällt. Reihenfolge: Story-Gate liest Frontmatter (parent+slug) zuerst, dann Routing.

## INVEST
Erfüllt. Kern-Mechanik, unabhängig lieferbar, testbar über Verhaltensszenarien, auf zwei Dateien begrenzt.

## Akzeptanzkriterien

<!-- rd:ac:start -->
`WorktreeRouting_ImplementiereStory_OhneVorhandenenWorktree_LegtAnUndArbeitetDort`
- Arrange: Story mit `parent: FEAT-042`, kein Branch/Worktree `feat-042-*`, Session auf master
- Act: `implementiere STORY-x`
- Assert: `git -C <repo-dir> worktree add <project-root>/worktrees/feat-042-<slug> -b feat-042-<slug> HEAD` ausgeführt; nachfolgende Code-Writes zielen auf diesen Pfad; Session-cwd unverändert
Status: neu

`WorktreeRouting_ZweiteStorySelbesFeature_WiederverwendetWorktree`
- Arrange: Worktree/Branch `feat-042-<slug>` existiert bereits
- Act: `implementiere STORY-y` (`parent: FEAT-042`)
- Assert: kein neues `worktree add`; Reuse-Erkennung findet `feat-042-*` und arbeitet im bestehenden Worktree
Status: neu

`WorktreeRouting_PlaneTrigger_KeinWorktreeWechsel`   (Negativ)
- Arrange: Story `ready`
- Act: `plane STORY-x`
- Assert: kein `worktree add`, kein Wechsel; Plan wird nach `requests/` geschrieben; Session bleibt wo sie ist
Status: neu

`WorktreeRouting_StoryOhneParent_StoppMitFehler`   (Negativ)
- Arrange: Story ohne `parent`-Feld
- Act: `implementiere STORY-x`
- Assert: klarer Fehler/STOPP (Branch nicht ableitbar), kein `worktree add`
Status: neu
<!-- rd:ac:end -->

## Annahmen / Offene Punkte
- Worktree-Ort `<project-root>/worktrees/` (bei Umsetzung final bestätigen).
- Repo-Dir-Name aus CLAUDE.md-Projektmap lesen, nicht hardcoden.
- CODE_ROOT-Threading (Worktree-Pfad an alle Sub-Agents/Tools durchreichen) = zentraler Sorgfaltspunkt.
- Fachliche Basis: STORY-004 (Feature-Zwang) garantiert `parent`; defensive „kein parent"-Behandlung hier trotzdem umsetzen.
