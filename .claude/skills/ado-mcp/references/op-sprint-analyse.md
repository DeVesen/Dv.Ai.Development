# Operation: Sprint analysieren

## Trigger

User nennt Sprint explizit: „analysiere Sprint 42", „Sprint-Analyse Sprint 42",
„Implementierungsplan für Sprint 5", „was ist in Sprint 42 drin"

---

## Schritt 1 — ADO-Tasks laden

Vor dem ersten ADO-MCP-Aufruf Tools laden (falls nicht bereits geschehen):

```
ToolSearch("select:mcp__ado__wit_query_wiql,mcp__ado__wit_get_work_items_batch_by_ids")
```

WIQL-Query für alle Tasks des genannten Sprints:

```
wit_query_wiql(
  projectName: "<project>",
  query: "SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State],
          [System.Description], [Microsoft.VSTS.Common.AcceptanceCriteria]
          FROM WorkItems
          WHERE [System.IterationPath] UNDER '<project>\\Sprint <n>'
          AND [System.WorkItemType] IN ('Task', 'User Story', 'Bug')
          ORDER BY [System.ChangedDate] DESC"
)
```

Falls Projekt oder Iterationspfad unbekannt → User fragen:
„Wie heißt das ADO-Projekt und die Iteration? (z.B. `MeinProjekt` / `Sprint 42`)"

---

## Schritt 2 — Planning Inventory erstellen (parallel)

`codebase-analyzer` → `analyze_planning_inventory` für beide Stacks parallel:

```
analyze_planning_inventory(
  projectPath: "C:\\Develop\\<Projektname>\\src\\frontend",
  format: "compact"
)

analyze_planning_inventory(
  projectPath: "C:\\Develop\\<Projektname>\\src\\backend",
  format: "compact"
)
```

Pfade = Windows-Absolutpfade. Falls unbekannt → `index_status` prüfen oder User fragen:
„Wo liegen das Angular-Projekt und das .NET-Projekt? (Windows-Pfade)"

---

## Schritt 3 — Abgleich: existierend vs. neu

Pro ADO-Task aus Schritt 1:

1. Titel + Beschreibung → Schlüsselbegriffe extrahieren (Endpunkt-URL, Route, DTO-Name, Feature-Name)
2. Schlüsselbegriffe gegen das Planning Inventory matchen:
   - **Treffer** → Artefakt bereits vorhanden; Task = Erweiterung, Fix oder Konfiguration
   - **Kein Treffer** → Neu-Implementierung notwendig; Artefakt fehlt noch

---

## Schritt 4 — Implementierungsplan generieren

Pro Task einen Abschnitt:

```markdown
### Task #<id> — <Titel>

**Status:** <WI-State>
**Typ:** <existierend | neu>

**Betroffene Artefakte:**
- Angular: <Komponente / Route — oder „(neu anlegen)">
- .NET: <Controller / Endpunkt — oder „(neu anlegen)">

**Implementierungsschritte:**
1. <Konkreter Schritt mit Dateipfad-Hinweis>
2. <Konkreter Schritt>
3. <Test-Schritt>
```

---

## Schritt 5 — Plan persistieren

Verzeichnis `docs/ado/` anlegen falls nicht vorhanden.

Datei: `docs/ado/sprint-<n>.md`

Datei-Header:

```markdown
# Sprint <n> — Implementierungsplan

> Generiert: <YYYY-MM-DD>
> ADO-Projekt: <project>
> Iteration: <Iteration Path>

---
```

Danach alle Task-Abschnitte aus Schritt 4 anhängen.

Nach dem Schreiben bestätigen:
`docs/ado/sprint-<n>.md wurde angelegt — <Anzahl> Tasks, davon <X> neu / <Y> existierend.`

Kein automatischer `git commit` — der User entscheidet.

---

## Qualitätsregeln

- Jeder Task bekommt einen eigenen Abschnitt — keine Gruppierung
- „existierend" immer mit konkretem Dateipfad / Endpunkt-URL belegen
- „neu" mit Hinweis auf zu erstellende Dateien / Struktur
- Keine Implementierungsannahmen ohne Codebase-Evidenz aus dem Planning Inventory
