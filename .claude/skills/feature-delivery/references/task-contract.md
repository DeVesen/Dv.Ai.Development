# Task-Contract — Fundament für FEAT-002

**Zweck:** Verbindliche Definition des Task-Datei-Schemas, der Topologie-Datei und der
Granularitäts-Regeln. Planner-Output und Umsetzer-Input teilen **denselben** Kontrakt.

**Herkunft:** FEAT-002 · STORY-007.

---

## Task-Datei-Schema (`tasks/task-NNN.md`)

Jede Task-Datei trägt **vier Pflichtsektionen** — keine darf fehlen:

```markdown
## Vertrag/Refs
← Pointer auf den Interface-Kontrakt (Endpoint/DTO/Komponenten-Vertrag/Regel),
  der in diesem Task neu eingeführt oder implementiert wird. Sichert Kontext
  für Scribe und Reviewer ohne Suche.

## Akzeptanz→Test
← ≥1 Akzeptanztest im F1-Format (Testname + AAA-Stichpunkte + Status rot→grün).
  Kein Task ohne mindestens einen Test, der von rot auf grün gebracht wird.

## Schritte
← 3–5-Minuten-Checkliste der Implementierungsschritte innerhalb dieses Tasks.
  Granularität: fein genug zum Abhaken, nicht als Task-Grenze (s. §Zwei-Ebenen).

## touches / depends-on / wave
← Berührte Dateien/Module (touches), explizite Abhängigkeiten zu anderen Tasks
  (depends-on), und Zuordnung zur Ausführungswelle (wave: 1, 2, …).
```

---

## Topologie-Datei (`tasks/index.md`)

`tasks/index.md` ist der **einzige Ganzblick** für PL und Reviewer. Sie trägt:

- Alle Tasks der aktuellen Planung (Task-ID, Titel, Wave, depends-on)
- Wellen-Struktur: welche Tasks parallel, welche sequentiell
- Blocking-Abhängigkeiten zwischen Tasks
- Aktueller Status je Task (`offen` / `in-arbeit` / `fertig`)

Kein anderer Ort fasst die Topologie vollständig zusammen — **PL und Reviewer**
lesen `tasks/index.md` für den Gesamtüberblick.
**Scribes lesen ausschließlich ihre eigene `tasks/task-NNN.md`** — `tasks/index.md`
ist für Scribes nicht erforderlich (Umsetzer-Input-Contract, STORY-009).

```markdown
# tasks/index.md — Topologie

| Task | Titel | Wave | depends-on | Status |
|------|-------|:----:|------------|--------|
| task-001 | ... | 1 | — | offen |
| task-002 | ... | 1 | — | offen |
| task-003 | ... | 2 | task-001, task-002 | offen |
```

---

## §Zwei-Ebenen — Granularität

**Zwei Ebenen, strikte Trennung:**

### Ebene 1: Task-Atom (Task-Grenze)

- Eine vertikale, eigenständig test-first-verifizierbare **Verhaltenseinheit** (≈ IMP-Slice)
- Eine Datei je Task (`tasks/task-NNN.md`)
- **Grenze liegt an der Vertragsnaht** — dort, wo ein neuer Endpoint, ein neues DTO,
  ein neuer Komponenten-Vertrag oder eine neue Regel entsteht
- Nicht an der Uhr, nicht an der Schätzung

### Ebene 2: Schritt-Checkliste (innerhalb eines Tasks)

- 3–5-Minuten-Schritte **im** Task, in der Sektion `## Schritte`
- Dienen der Fortschrittssicherung und Vollständigkeit während der Umsetzung
- **Kein eigenständiger Task-Schnitt** — nur Implementierungsschritte innerhalb des Atoms

### Regel: 3–5-Min als Task-Grenze ist **ungültig**

> Eine Aufgabe, die nur deshalb als eigener Task geschnitten wird, weil sie 3–5 Minuten
> dauert, **verletzt den Task-Contract**.

**Begründung:** Ein solcher Schnitt zerschneidet test-first (kein eigenständig
verifizierbarer Test möglich), führt zu Datei-Explosion und erzeugt künstliche
depends-on-Ketten ohne Vertragsnaht. Die Zeitdauer ist **kein gültiges Schnittkriterium**.

---

## Task-Kriterien (alle vier sind Pflicht)

Ein gültiger Task erfüllt **alle** vier Kriterien:

| # | Kriterium | Prüffrage |
|---|-----------|-----------|
| **(1)** | **≥1 Akzeptanztest rot→grün** | Hat dieser Task mindestens einen Test, der im Task von rot auf grün gebracht wird? |
| **(2)** | **Eine Verantwortung** (kein „und") | Lässt sich der Task-Titel ohne das Wort „und" formulieren? |
| **(3)** | **Unabhängig verifizierbar** — oder explizites `depends-on` | Kann dieser Task ohne andere offene Tasks gebaut und getestet werden? Falls nein: `depends-on` im Task explizit eingetragen? |
| **(4)** | **Naht = neuer Endpoint/DTO/Komponenten-Vertrag/Regel** | Entsteht an der Task-Grenze eine echte Vertragsnaht? |

Ein Task, der eines dieser vier Kriterien **nicht** erfüllt, ist ungültig und muss neu geschnitten werden.

---

## Verhältnis zum IMP-Slice

Task-Atom ≈ IMP-Slice aus dem Planungs-Flow. Die Begriffe sind konzeptionell deckungsgleich:
ein Task entspricht einem Implementierungs-Slice, der im SecondBrain als `scribe-<slice>.md`
dokumentiert wird. Die IMP-Slice-ID aus dem Plan (`IMP-FE-...`, `IMP-BE-...`) wird als
Task-Bezeichner wiederverwendet.

Verweis: [planning-flow.md](../flows/planning-flow.md) · [secondbrain-schema.md](secondbrain-schema.md)
