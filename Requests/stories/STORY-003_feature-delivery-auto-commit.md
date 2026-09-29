---
id: STORY-003
parent: FEAT-001
type: story
status: implemented
slug: feature-delivery-auto-commit
depends_on: [STORY-001]
touches: [feature-delivery/SKILL.md, feature-delivery/flows/implementation-flow.md]
---

# feature-delivery: Auto-Commit pro Story

**Als** Nutzer des Harness
**möchte ich**, dass feature-delivery nach erfolgreichem Implementieren einer Story automatisch einen
Code-Commit im Worktree erstellt
**damit** ich pro Story eine saubere, sofort review-/merge-bare Commit-Historie habe.

## Beschreibung

Auto-Commit (D5):
- **Nur `implementiere`** (nicht `plane`). **Ein Commit pro Story.**
- **Nur bei Grün** (`implementiere nur` → `implemented`; volles `implementiere` → `reviewed`).
  `blocked`/rot → **kein** Commit, Arbeit bleibt uncommitted.
- **Nur Code:** `requests/` liegt außerhalb des Repos → git sieht Stories/Pläne gar nicht (kein
  selektives Staging nötig, kein Risiko, eine Story mitzucommitten).
- **Message** über `commit-message`-Skill aus **Titel/Name** (darf DevOps-ID enthalten) — **ohne**
  interne `STORY-NNN`/`FEAT-NNN`.
- Der Story-Status-Flip passiert in `requests/` (extern), nicht im Commit.

## INVEST
Erfüllt. Eigenständiger Wert (saubere Historie), unabhängig testbar.

## Akzeptanzkriterien

<!-- rd:ac:start -->
`AutoCommit_ImplementiereGruen_ErstelltGenauEinenCodeCommit`
- Arrange: `implementiere STORY-x`, Build/Test grün
- Act: Closure
- Assert: genau ein Commit auf dem Worktree-Branch; enthält nur Code-Änderungen
Status: neu

`AutoCommit_Message_OhneInterneIds`
- Arrange: Story-Titel „Kundenübersicht (AB#12345)"
- Act: Auto-Commit
- Assert: Commit-Message enthält Titel/DevOps-ID, aber weder `STORY-`-Nummer noch `FEAT-`-Nummer
Status: neu

`AutoCommit_ImplementiereNurBlocked_KeinCommit`   (Negativ)
- Arrange: `implementiere nur`, Build nach 5 Fix-Versuchen rot → `blocked`
- Act: Abbruch
- Assert: kein Commit; Änderungen bleiben uncommitted
Status: neu

`AutoCommit_PlaneTrigger_KeinCommit`   (Negativ/Abgrenzung)
- Arrange: `plane STORY-x`
- Assert: kein Auto-Commit
Status: neu
<!-- rd:ac:end -->

## Annahmen / Offene Punkte
- `commit-message`-Aufruf wird parametrisiert (Titel nutzen, interne IDs ausschließen) — evtl. ohne Änderung am commit-message-Skill selbst.
