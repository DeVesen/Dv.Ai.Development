---
id: STORY-008
parent: FEAT-002
type: story
status: reviewed
slug: planner-cut-prozedur
touches: [plan-agent.md, planning-flow.md]
depends_on: [STORY-007]
---

# STORY-008 · Planner-Cut-Prozedur

**Als** `plan-agent`
**möchte ich** eine mechanische 6-Schritt-Cut-Prozedur, die von Topic-Map/IMP-Slices ausgeht und an
Vertragsnähten in Tasks schneidet,
**damit** der Planner-Output die normalisierte Task-Datenbank (`tasks/task-NNN.md` + `tasks/index.md`)
aus STORY-007 erzeugt.

## Beschreibung

Die Cut-Prozedur des Planners, mechanisch:
1. Von Topic-Map / IMP-Slices ausgehen.
2. Je Slice an jeder Vertragsnaht schneiden → ein Task je Naht.
3. Akzeptanzkriterien (§8/F1) → Tasks mappen (1:n); Kriterium über 2 Tasks → Abhängigkeit notieren.
4. Task ohne eigenen Test → Schritt, hochfalten; Task mit „und" → splitten.
5. Annotieren: `id · wave · touches · depends-on · acceptance-tests · contract-refs`.
6. `tasks/index.md` = Topologie erzeugen.

Setzt das Schema aus STORY-007 voraus.

## INVEST
- **I**: unabhängig testbar an der Prozedur-Definition im Planner-Flow/Profil.
- **V**: der Planner produziert normalisierte Tasks statt Monolith.
- **S/T**: klein bis mittel, testbar (Schritt-Vollständigkeit + Mapping-Regeln).
- **Abhängigkeit** (INVEST-bewusst): braucht STORY-007 (Schema) → `depends_on`.

## Akzeptanzkriterien

<!-- rd:ac:start -->
`CutProzedur_SechsSchritte_Dokumentiert`
- Arrange: Planner-Flow/Profil nach der Änderung
- Act: Cut-Prozedur-Schritte zählen
- Assert: alle 6 Schritte vorhanden (Topic-Map → Vertragsnaht-Schnitt → AC-Mapping → Hochfalten/Splitten
  → Annotieren → index.md)
Status: neu

`AcMapping_EinsZuN_MitAbhaengigkeit`
- Arrange: ein Akzeptanzkriterium (§8/F1), das über zwei Tasks reicht
- Act: Mapping-Regel anwenden
- Assert: 1:n-Mapping; Kriterium über 2 Tasks erzeugt eine notierte `depends-on`
Status: neu

`TaskOhneTest_WirdHochgefaltet`
- Arrange: ein Task-Kandidat ohne eigenen Akzeptanztest
- Act: Regel Schritt 4 anwenden
- Assert: wird zu einem Schritt hochgefaltet (kein testloser Task); Task mit „und" wird gesplittet
Status: neu

`IndexMd_WirdErzeugt`
- Arrange: abgeschlossener Cut
- Act: Planner-Output prüfen
- Assert: `tasks/index.md` mit Topologie ist Teil des Outputs (Schritt 6)
Status: neu

`SliceOhneVertragsnahtSchnitt_IstUngueltig`   (Negativ)
- Arrange: ein Slice mit mehreren Vertragsnähten, aber nur einem Task
- Act: gegen Schritt 2 prüfen
- Assert: ungültig — jede Vertragsnaht muss geschnitten werden (ein Task je Naht)
Status: neu
<!-- rd:ac:end -->

## Annahmen / Offene Punkte
- Annahme: Topic-Map/IMP-Slices bleiben die Eingangsgröße des Planners (unverändert).
- Parallel: Primär-Dateien (`plan-agent.md`, `planning-flow.md`) disjunkt zu STORY-009 → nach
  STORY-007 parallel zu STORY-009 möglich.
