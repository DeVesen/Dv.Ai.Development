# Operation: Work Item analysieren → docs/ado/<id>.md

## Ziel

Ein ADO-Work-Item vollständig lesen, verstehen, auf Einzelheit vs. Auflistung prüfen
und das Ergebnis als strukturierten Markdown-Report in `docs/ado/<id>.md` ablegen.

---

## Schritt 1 — ID ermitteln

**Eingabe des Users:** ID (`1234`) oder URL
`https://dev.azure.com/<org>/<project>/_workitems/edit/1234` → ID = letztes URL-Segment

---

## Schritt 2 — Daten laden (parallel)

```
wit_get_work_items_batch_by_ids(
  projectName: "<project>",
  workItemIds: [<id>],
  fields: [
    "System.Id", "System.Title", "System.WorkItemType", "System.State",
    "System.Description", "Microsoft.VSTS.Common.AcceptanceCriteria",
    "System.AssignedTo", "System.AreaPath", "System.IterationPath"
  ]
)

wit_work_item_list_comments(workItemId: <id>, projectName: "<project>")
```

HTML in `Description` / `AcceptanceCriteria`: als Plaintext lesen — Tags ignorieren.
Anhänge: im `relations`-Array nach `AttachedFile`-Links suchen (Dateiname reicht).

---

## Schritt 3 — Analyse: Einzel-Task oder Auflistung?

### Signale für **Auflistung** (mehrere Tasks):

| Signal | Beispiel |
|--------|---------|
| Nummerierte Liste in Titel oder Beschreibung | „1. Login-Button … 2. Logout-Button …" |
| Titel enthält Aufzählungswörter | „Folgende Anpassungen:", „Mehrere Korrekturen:", „X und Y" |
| Beschreibung = unzusammenhängende Bullet-Points | Jeder Punkt beschreibt einen anderen Bereich/Screen/Feature |
| Akzeptanzkriterien sind thematisch disjunkt | AK1 betrifft Login, AK2 betrifft Dashboard |
| Diskussion klärt voneinander unabhängige Detailfragen | |

### Signale für **Einzel-Task**:

| Signal | Beschreibung |
|--------|-------------|
| Titel benennt ein konkretes Feature/Verhalten | „Als User möchte ich …" |
| Beschreibung elaboriert dasselbe Thema | Alle Absätze gehören zusammen |
| Akzeptanzkriterien sind Variationen desselben Flows | |
| Diskussion verfeinert ein einzelnes Konzept | |

**Grenzfall:** Wenn ein Work Item thematisch zusammenhängend ist, aber mehrere UI-Details beschreibt (z. B. ein Formular mit 5 Feldern), gilt es als **Einzel-Task** — das ist ein Feature, keine Auflistung.

---

## Schritt 4 — Output schreiben: `docs/ado/<id>.md`

Verzeichnis `docs/ado/` anlegen falls nicht vorhanden.

### Template A — Einzel-Task

```markdown
# #<id> — <Titel>

> **Typ:** <WorkItemType> | **Status:** <State> | **Bereich:** <AreaPath>

---

## Work Item (Original)

### Titel
<System.Title>

### Beschreibung
<System.Description als Plaintext>

### Akzeptanzkriterien
<AcceptanceCriteria als Plaintext — oder „(keine angegeben)">

### Diskussion
<Relevante Kommentare — Autor: Text; älteste zuerst; max. die letzten 5>
<Wenn keine: „(keine Diskussion)">

### Anhänge
<Liste der Dateinamen — oder „(keine)">

---

## Interpretation

**Einzel-Task** — eine einzige, zusammenhängende Anforderung.

### Was ist gemeint
<2–4 Sätze: Was will der Autor konkret? Was ist der Auslöser / das Problem?>

### Zielbeschreibung
<3–6 Sätze: Wie soll es sich nach der Umsetzung verhalten? Was sieht/erlebt der Nutzer?
Ohne Codebase-Blick — nur aus dem Work-Item-Text ableiten.>
```

---

### Template B — Auflistung (N Tasks)

```markdown
# #<id> — <Titel>

> **Typ:** <WorkItemType> | **Status:** <State> | **Bereich:** <AreaPath>

---

## Work Item (Original)

### Titel
<System.Title>

### Beschreibung
<System.Description als Plaintext>

### Akzeptanzkriterien
<AcceptanceCriteria als Plaintext — oder „(keine angegeben)">

### Diskussion
<Relevante Kommentare — Autor: Text; max. die letzten 5>

### Anhänge
<Liste der Dateinamen — oder „(keine)">

---

## Interpretation

**Auflistung — <N> Tasks erkannt.**
Dieses Work Item bündelt mehrere unabhängige Anforderungen.

---

### Task 1 — <Kurztitel>

**Auszug aus Work Item:**
> <Direkt zitierter Originaltext der zu diesem Task gehört>

**Was ist gemeint:**
<2–3 Sätze: Konkreter Inhalt des Teilwunschs>

**Zielbeschreibung:**
<2–4 Sätze: Gewünschtes Verhalten nach Umsetzung>

---

### Task 2 — <Kurztitel>

**Auszug aus Work Item:**
> <...>

**Was ist gemeint:**
<...>

**Zielbeschreibung:**
<...>

---
<!-- weitere Tasks analog -->
```

---

## Schritt 5 — Abschluss

Nach dem Schreiben der Datei:

1. Pfad bestätigen: `docs/ado/<id>.md wurde angelegt.`
2. Kurze Zusammenfassung: „Einzel-Task" oder „N Tasks erkannt" + ein Satz Kerninhalt.
3. **Nicht** automatisch mit der Umsetzung beginnen — der User entscheidet was als nächstes passiert.

---

## Schritt 4b — Status in die Task-Liste aufnehmen

### Einzel-Task (Template A)

Status aus `System.State` ableiten und in der Metazeile ergänzen:

```markdown
> **Typ:** User Story | **Status:** Active 🔄 | **Bereich:** …
```

| WI-State | Symbol |
|----------|--------|
| Active | 🔄 |
| Resolved / Done | ✅ |
| sonst | ⬜ |

### Auflistung (Template B)

Für jeden Task-Block den Status ermitteln — **Priorität:**

1. `System.State` = `Resolved` oder `Done` → alle Tasks **✅** (WI-State überschreibt Marker)
2. Sonst: Emoji-Marker ✅ / 🔄 aus dem Beschreibungstext je Zeile lesen

Task-Überschrift mit Status-Symbol:

```markdown
### Task 2 — Logout-Button entfernen  🔄
```

| Quelle | Symbol | Label |
|--------|--------|-------|
| WI-State Resolved/Done | ✅ | erledigt |
| ✅ im Text | ✅ | erledigt |
| 🔄 im Text | 🔄 | in Bearbeitung |
| kein Marker | ⬜ | noch offen |

---

## Qualitätsregeln

- **1:1-Originaltexte** in der „Work Item (Original)"-Sektion — nichts paraphrasieren, nichts weglassen
- **Interpretation und Zielbeschreibung** ausschließlich aus dem Work-Item-Inhalt ableiten — keine Annahmen über die Codebasis
- HTML-Formatierungen entfernen (kein `<p>`, `<br>`, `<ul>` im Output)
- Wenn `AcceptanceCriteria` leer ist, trotzdem den Platzhalter `(keine angegeben)` schreiben
- Kommentare die nur Status-Updates sind (`"Done"`, `"Merging"`) weglassen
