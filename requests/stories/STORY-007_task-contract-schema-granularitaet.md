---
id: STORY-007
parent: FEAT-002
type: story
status: implemented
slug: task-contract-schema-granularitaet
touches: [planning-flow.md, tasks-contract (neu)]
---

# STORY-007 · Task-Contract-Schema + Granularität

**Als** Planner und Umsetzer
**möchte ich** ein normalisiertes Task-Datei-Schema (`tasks/task-NNN.md` + `tasks/index.md`) mit
Zwei-Ebenen-Granularität und expliziten Task-Kriterien,
**damit** Planner-Output und Umsetzer-Input **denselben** Kontrakt teilen.

## Beschreibung

Definiert die Datenstruktur, auf der das ganze Feature aufsetzt: den Task-Contract.

**Task-Datei-Schema (`tasks/task-NNN.md`), vier Pflichtsektionen:**
```
## Vertrag/Refs      ← Pointer auf Interface-Kontrakt (Kontext gewahrt)
## Akzeptanz→Test    ← ≥1 Test, rot→grün (F1)
## Schritte          ← 3–5-Min-Checkliste
## touches / depends-on / wave
```
`tasks/index.md` = Topologie (Wellen/Blocking) — der **einzige Ganzblick** für PL/Reviewer.

**Zwei-Ebenen-Granularität:**
- Task-Atom = eine vertikale, eigenständig test-first-verifizierbare Verhaltenseinheit (≈ IMP-Slice),
  eine Datei je Task. Grenze an der **Vertragsnaht**, nicht an der Uhr.
- 3–5-Min-Granularität = Schritt-Checkliste **im** Task, nicht als Task-Grenze.

**Task-Kriterien:** (1) ≥1 Akzeptanztest rot→grün im Task · (2) eine Verantwortung (kein „und") ·
(3) unabhängig verifizierbar (sonst explizite `depends-on`) · (4) Naht = neuer
Endpoint/DTO/Komponenten-Vertrag/Regel.

## INVEST
- **I**: unabhängig — reine Contract-/Schema-Definition, keine Consumer nötig.
- **V**: Fundament für beidseitige Ersparnis.
- **S/T**: klein, testbar (Struktur des Schemas + Kriterien-Liste).

## Akzeptanzkriterien

<!-- rd:ac:start -->
`TaskDatei_HatVierPflichtsektionen`
- Arrange: Task-Datei-Schema-Definition
- Act: Pflichtsektionen prüfen
- Assert: `## Vertrag/Refs`, `## Akzeptanz→Test`, `## Schritte`, `## touches / depends-on / wave` vorhanden
Status: implementiert

`IndexDatei_TraegtTopologie`
- Arrange: `tasks/index.md`-Definition
- Act: Inhalt prüfen
- Assert: Wellen/Blocking-Topologie als einziger Ganzblick definiert
Status: implementiert

`TaskKriterien_VierPunkte_Definiert`
- Arrange: Task-Kriterien im Contract
- Act: Kriterien zählen/prüfen
- Assert: (1) ≥1 Test rot→grün · (2) eine Verantwortung · (3) unabhängig verifizierbar sonst depends-on ·
  (4) Naht = Endpoint/DTO/Komponenten-Vertrag/Regel — alle vier vorhanden
Status: implementiert

`Granularitaet_ZweiEbenen_TaskAtomUndSchritt`
- Arrange: Granularitäts-Definition
- Act: Ebenen prüfen
- Assert: Task-Atom = Vertragsnaht; 3–5-Min = Schritt-Checkliste im Task (nicht Task-Grenze)
Status: implementiert

`HarteDreiFuenfMinAlsTaskGrenze_IstUngueltig`   (Negativ)
- Arrange: ein Task-Schnitt, der 3–5-Min als Task-Grenze verwendet
- Act: gegen die Granularitäts-Regel prüfen
- Assert: ungültig — 3–5-Min ist Schritt-Ebene, nicht Task-Grenze (zerschneidet Test-First, Datei-Explosion)
Status: implementiert
<!-- rd:ac:end -->

## Annahmen / Offene Punkte
- Offener Punkt (nicht-blockierend): Ablageort der Contract-Referenz (eigene Datei unter
  `feature-delivery/references/` vs. Abschnitt in `planning-flow.md`) — entscheidet die Implementierung.
