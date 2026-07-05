---
id: STORY-003
parent: FEAT-001
type: story
status: planned
slug: geteilte-evidenz-als-pointer
touches: [implement-round-executor.md, subagent-prompts.md]
plan: requests/plans/plan-geteilte-evidenz-als-pointer.md
---

# STORY-003 · ① Geteilte Evidenz als Pointer

**Als** PL (`implement-round-executor`)
**möchte ich** die Slice-Coverage-Tabelle + `review_git_diff`-Befunde einmal in `round-M/evidence.md`
schreiben und den Impl-Reviewern nur den Pointer geben,
**damit** kein N×-Evidenz-Block im Opus-Output entsteht (PL-seitige Ersparnis, reviewer-seitig neutral).

## Beschreibung

Der PL schreibt die Evidenz (Slice-Coverage + Diff-Befunde) **einmal** pro Runde nach
`round-M/evidence.md`. Die Impl-Reviewer bekommen im Payload den **Pointer** statt des Inline-Blocks
×N. Die Ersparnis ist PL-seitig (kein N-fach wiederholter Evidenz-Block im Opus-Output); für die
Reviewer ist es neutral (sie lesen dieselbe Evidenz, nur per Pointer).

**Nur Impl-Seite.** Die DI-Reviewer können das nicht — ihnen ist kein Tool-Call erlaubt, sie können
`evidence.md` nicht lesen; ihre Evidenz bleibt inline.

## INVEST
- **I**: unabhängig — PL-Output + Impl-Reviewer-Payloads.
- **V**: Wert = kleinerer Opus-Output des PL.
- **S/T**: klein, testbar (Datei-Erzeugung + Pointer im Payload).

## Akzeptanzkriterien

<!-- rd:ac:start -->
`PL_SchreibtEvidence_EinmalProRunde`
- Arrange: PL-Runde M mit Slice-Coverage + `review_git_diff`-Befunden
- Act: PL-Ablauf ausführen
- Assert: genau eine `round-M/evidence.md` wird erzeugt (Evidenz nicht N× im Output wiederholt)
Status: neu

`ImplReviewerPayload_TraegtEvidencePointer`
- Arrange: Payload eines Impl-Reviewers
- Act: Evidenz-Referenz prüfen
- Assert: Pointer auf `round-M/evidence.md` statt Inline-Evidenz-Block
Status: neu

`DiReviewer_BleibtInline_KeinPointer`   (Negativ)
- Arrange: DI-Reviewer-Payload (kein Tool-Call erlaubt)
- Act: Evidenz-Referenz prüfen
- Assert: DI-Reviewer bekommt keinen `evidence.md`-Pointer; Evidenz bleibt inline (nur Impl-Seite betroffen)
Status: neu

`ReviewerErgebnis_Unveraendert`   (Guard)
- Arrange: Impl-Reviewer mit Evidenz-Pointer
- Act: Review durchführen
- Assert: dieselbe Evidenz-Grundlage wie beim Inline-Block — keine Genauigkeits-/Ergebnisänderung
Status: unberuehrt
<!-- rd:ac:end -->

## Annahmen / Offene Punkte
- Annahme: `round-M/evidence.md` liegt im bestehenden SecondBrain-Runden-Ordner.
- Abhängigkeit: teilt sich `subagent-prompts.md` mit STORY-001/002/005 → seriell dagegen.
