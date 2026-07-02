---
id: STORY-032
parent: FEAT-001
type: story
status: implemented
slug: datei-basiertes-findings-handoff
touches:
  - feature-delivery/references/subagent-prompts.md
  - feature-delivery/flows/implementation-flow.md
  - feature-delivery/references/secondbrain-schema.md
  - agents/implement-loop-orchestrator.md
---

# STORY-032 — Datei-basiertes Findings-Handoff

## User Story

Als **Harness-Betreiber** möchte ich, dass Reviewer und Scribes ihre Findings/Summaries in Dateien
schreiben und nur einen Pointer zurückgeben, **damit** der Orchestrator-Kontext nicht mehr durch das
Volumen der Reviewer-Reports zum Kontext-Compact getrieben wird.

## Vollbeschreibung

Erste, eigenständig auslieferbare Ausbaustufe des Wegwerf-Orchestrator-Umbaus (FEAT-001). Sie führt
den **SecondBrain-Datei-Mechanismus** ein und stellt das Findings-Handoff von „Payload im
Agent-Return" auf „Datei + Pointer" um — **noch ohne** den Rollen-Split (der Orchestrator bleibt in
dieser Story monolithisch). Zweck: die Kern-Hypothese (der Compact ist ein Volumen-Problem) mit
minimalem Risiko validieren. Wenn schon das Datei-Handoff den Compact entschärft, ist der spätere
Rollen-Split Prinzip-Sauberkeit statt Feuerwehreinsatz.

**Umfang:**
- SecondBrain-Verzeichnis-Layout + `secondbrain-index.md` (heiß) + `iteration-N/round-M/`-Struktur
  gemäß FEAT-001 Entscheidung 5. Schema als neue Referenz `feature-delivery/references/secondbrain-schema.md`.
- Reviewer schreiben je eine `finding-<reviewer>.md` (Struktur-Tabelle nach ReportFindings-Vorbild),
  geben nur Datei-Pointer + Verdikt-Kurzform zurück.
- Orchestrator baut `digest.md` durch **Lesen** der finding-Dateien statt durch Empfang der Payloads.
- Prompt-Templates in `subagent-prompts.md` und der Integration-Checkpoint in `implementation-flow.md`
  entsprechend angepasst.

## INVEST

- **Independent:** Bewusst verletzt — Basis für STORY-033/034 (die deren Datei-Layout nutzen). Als
  erste Stufe selbst aber ohne Vorbedingung startbar. Verletzung akzeptiert (staged-value-Splitting).
- **Negotiable / Valuable / Estimable / Small / Testable:** erfüllt. Wert: eigenständiger Compact-Fix.
  Testbar via Dry-Run + Struktur-Inspektion der Dateien.

## Akzeptanzkriterien (F1)

<!-- rd:ac:start -->
`Reviewer_NachReviewLauf_SchreibtFindingDateiUndGibtNurPointer`
- Arrange: Impl-Review-Runde mit ≥1 Reviewer, der ≥1 Finding produziert
- Act: Reviewer-Agent läuft ab und gibt sein Deliverable zurück
- Assert: `iteration-N/round-M/finding-<reviewer>.md` existiert mit Struktur-Tabelle (File | Line | Severity | Tier-Vorschlag | Befund | Failure-Scenario); Rückgabe = nur Datei-Pointer + Verdikt-Kurzform, kein Report-Body
Status: neu

`Orchestrator_NachReviewRunde_BautDigestAusDateienNichtAusPayload`
- Arrange: N Reviewer haben ihre finding-Dateien geschrieben
- Act: Orchestrator konsolidiert die Runde
- Assert: `digest.md` entsteht durch Lesen der finding-Dateien; der Orchestrator empfängt keine vollen Reports als Agent-Rückgabe
Status: neu

`ImplDryRun_MitDateiHandoff_KeinKontextCompactInRunde1`
- Arrange: kleine Test-Story, voller Impl-Flow (noch monolithischer Orchestrator), 7 Reviewer
- Act: Runde 1 vollständig durchlaufen
- Assert: kein Kontext-Compact-Ereignis; Orchestrator-Fenster enthält nur Pointer + Digest-Referenzen, nicht die 7 Report-Bodies
Status: neu

`ReviewerRueckgabe_MitInlineReportBody_GiltAlsNichtKonform`   (Negativ)
- Arrange: aktualisiertes Reviewer-Prompt-Template
- Act: Prüfung eines Rückgabeformats, das den vollen Report inline enthält
- Assert: gilt als Regelverstoß gegen das Pointer-only-Format; das Template schreibt „Datei schreiben, Pointer zurückgeben" verbindlich vor
Status: neu
<!-- rd:ac:end -->

## Annahmen / Offene Punkte

- **Notwendige Implikation:** Reviewer-Agent-Profile brauchen Write-Zugriff auf genau ihre eine
  finding-Datei (heute teils `readonly`). Folgt zwingend aus dem Ziel — der Orchestrator darf die
  Payloads nicht empfangen. Kein Blocker, in der Umsetzung Tool-Scope entsprechend setzen.
- Schema flow-agnostisch schneiden (Wiederverwendung für den späteren Planning-Flow-Umbau).
- Verifikation erfolgt per Dry-Run, nicht per dotnet/ng-Test (Markdown-/Prompt-Änderung).
