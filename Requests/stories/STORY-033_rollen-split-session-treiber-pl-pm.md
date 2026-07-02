---
id: STORY-033
parent: FEAT-001
type: story
status: implemented
slug: rollen-split-session-treiber-pl-pm
depends_on: [STORY-032]
touches:
  - agents/implement-loop-orchestrator.md
  - agents/implement-round-executor.md
  - agents/implement-supervisor.md
  - feature-delivery/SKILL.md
  - feature-delivery/flows/implementation-flow.md
  - feature-delivery/references/subagent-prompts.md
---

# STORY-033 — Rollen-Split: Session-Treiber + PL + PM (throwaway)

## User Story

Als **Harness-Betreiber** möchte ich den monolithischen Impl-Orchestrator in einen dünnen
Session-Treiber plus einen frischen **PL** (mechanischer Runden-Executor) und einen frischen **PM**
(Urteilsebene) je Runde aufteilen, **damit** keine LLM-Instanz über Runden hinweg Kontext akkumuliert
und die Kontinuität ausschließlich datei-basiert läuft.

## Vollbeschreibung

Zweite Ausbaustufe (FEAT-001). Baut auf dem Datei-Handoff aus STORY-032 auf und ersetzt die eine
durchgehend lebende Orchestrator-Instanz durch drei Elemente gemäß FEAT-001 Entscheidungen 1, 3, 6:

- **Session-Treiber** (die aufrufende Session): hält nur Index-Pointer + PM-Verdikt, spawnt je Runde
  frische Rollen, liest `current_round` aus dem Index, erzwingt den Max-5-Cap.
- **PL (`implement-round-executor`, NEU):** mechanisch — dispatcht Fix-Scribes → Integration-Checkpoint
  → Quality Gates → Reviewer; schreibt `digest.md`; gibt nur Pointer zurück. Implementiert selbst
  keinen Code.
- **PM (`implement-supervisor`, NEU):** urteilt aus Index + Digest (clean / fix-mit-Was+Wie /
  escalate); editiert nichts. (Die Erbsenzählerei-/Terminal-PM-Logik kommt in STORY-034.)

Der bestehende `implement-loop-orchestrator` wird auf die Treiber-/PL-Rolle zurückgeschnitten bzw.
abgelöst. Fix-Planer bleibt erhalten, unter dem PM.

## INVEST

- **Independent:** Bewusst verletzt — `depends_on: STORY-032` (nutzt dessen Datei-Layout + Digest).
- **Negotiable / Valuable / Estimable / Small / Testable:** erfüllt. Wert: strukturelle Beseitigung
  der lang lebenden Instanz. Testbar via Dry-Run (frische Instanzen je Runde beobachtbar).

## Akzeptanzkriterien (F1)

<!-- rd:ac:start -->
`PLundPM_ProInnerRunde_SindFrischeInstanzenOhneVorrundenKontext`
- Arrange: Inner-Loop mit ≥2 Fix-Runden
- Act: Runde 2 startet
- Assert: PL#2 und PM#2 werden per frischem Agent-Call gestartet (kein SendMessage-Fortsetzen); Zugriff auf Runde 1 nur über deren Digest-Datei
Status: verifiziert (Dry-Run)

`Session_ZwischenRunden_HaeltNurPointerUndVerdikt`
- Arrange: laufender Inner-Loop
- Act: nach Abschluss von Runde N
- Assert: Session-Kontext enthält Index-Pointer + PM-Verdikt-Kurzform; keine Reviewer-Reports und keine Digest-Bodies inline
Status: verifiziert (Dry-Run)

`Session_BeiRunde5MitOffenenFindings_StopptViaIndexRundenzaehler`
- Arrange: Inner-Loop erreicht Runde 5, PM-Verdikt lautet „fix"
- Act: Session prüft `current_round` im Index vor dem Spawn der nächsten Runde
- Assert: Session stoppt (Max-5-Cap), erzeugt Rest-Findings-Bericht; kein PL#6 wird gestartet
Status: verifiziert (Dry-Run)

`PL_VersuchtProduktCodeEdit_GiltAlsRegelverstoss`   (Negativ)
- Arrange: PL-Rolle (mechanischer Runden-Executor)
- Act: PL würde selbst Produkt-Code editieren statt an Scribe/Fix-Planer zu delegieren
- Assert: gilt als Regelverstoß; PL delegiert ausschließlich, PM urteilt ausschließlich — keine der beiden Rollen editiert Produkt-Code
Status: verifiziert (Dry-Run)
<!-- rd:ac:end -->

## Annahmen / Offene Punkte

- Agent-Profil-Namen `implement-round-executor` / `implement-supervisor` sind Vorschläge; finale
  Benennung in der skill-creator-Umsetzung (nicht-blockierend).
- Terminal-PM-Ausnahme + Outer-Loop bewusst NICHT in dieser Story — folgt in STORY-034.
- Verifikation per Dry-Run.
