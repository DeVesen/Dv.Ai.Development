# ADO-MCP Tool-Katalog — Work Items

MCP-Server-Name in Claude Code: **`ado`** → Präfix `mcp__ado__`

> Tool-Namen via `ToolSearch("ado work item")` verifizieren falls ein Aufruf fehlschlägt.

---

## Work Item lesen

### `wit_get_work_items_batch_by_ids`
Liest ein oder mehrere Work Items per ID.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|--------------|
| `projectName` | string | ✅ | ADO-Projektname |
| `workItemIds` | number[] | ✅ | Array von IDs (max. 200) |
| `fields` | string[] | — | Felderauswahl; ohne Angabe: Standard-Set |

**ID aus URL extrahieren:**
`https://dev.azure.com/org/project/_workitems/edit/1234` → ID = `1234`

**Vollständige Felder für Analyse:**
```json
["System.Id", "System.Title", "System.Description",
 "Microsoft.VSTS.Common.AcceptanceCriteria",
 "System.WorkItemType", "System.State", "System.AssignedTo",
 "System.AreaPath", "System.IterationPath",
 "Microsoft.VSTS.Common.Priority"]
```

---

### `wit_work_item_list_comments`
Liest alle Kommentare / Diskussionen eines Work Items.

| Parameter | Typ | Pflicht |
|-----------|-----|---------|
| `workItemId` | number | ✅ |
| `projectName` | string | — |
| `top` | number | — |

---

### `wit_query_wiql`
WIQL-Query ausführen (flexibel für eigene Abfragen).

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|--------------|
| `wiql` | string | ✅ | WIQL-Statement |
| `projectName` | string | — | Projektkontext |
| `top` | number | — | Max. Ergebnisse |

**Beispiel — Offene Bugs:**
```sql
SELECT [System.Id], [System.Title]
FROM WorkItems
WHERE [System.TeamProject] = 'MyProject'
  AND [System.WorkItemType] = 'Bug'
  AND [System.State] <> 'Closed'
ORDER BY [System.ChangedDate] DESC
```

---

### `wit_my_work_items`
Liefert Work Items des aktuell authentifizierten Users.

| Parameter | Typ | Pflicht |
|-----------|-----|---------|
| `projectName` | string | — |
| `includeCompleted` | boolean | — |
| `top` | number | — |

---

## Work Item schreiben

### `wit_work_item_write` (update)
Aktualisiert Felder eines bestehenden Work Items.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|--------------|
| `id` | number | ✅ | Work Item ID |
| `updates` | object | ✅ | Felder die geändert werden sollen |
| `format` | string | — | `"Markdown"` für HTML-Textfelder |

**`updates`-Objekt — Beispiele:**
```json
{
  "System.State": "Active",
  "Microsoft.VSTS.Scheduling.StoryPoints": 5,
  "System.AssignedTo": "user@domain.com",
  "System.Description": "Neuer Beschreibungstext"
}
```

---

### `wit_work_item_write` (create)
Legt ein neues Work Item an.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|--------------|
| `projectName` | string | ✅ | Ziel-Projekt |
| `workItemType` | string | ✅ | z. B. `"User Story"`, `"Bug"`, `"Task"` |
| `fields` | object | ✅ | Felder (mind. `System.Title`) |
| `format` | string | — | `"Markdown"` für HTML-Textfelder |

---

### `wit_work_item_comment_write` (add)
Fügt einen Kommentar zu einem Work Item hinzu.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|--------------|
| `projectName` | string | ✅ | |
| `workItemId` | number | ✅ | |
| `text` | string | ✅ | Kommentartext |
| `format` | string | — | `"Markdown"` |

---

### `wit_work_item_comment_write` (update)
Aktualisiert einen bestehenden Kommentar.

| Parameter | Typ | Pflicht |
|-----------|-----|---------|
| `projectName` | string | ✅ |
| `workItemId` | number | ✅ |
| `commentId` | number | ✅ |
| `text` | string | ✅ |

---

### `wit_add_child_work_items`
Erzeugt Kind-Work-Items unter einem Parent.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|--------------|
| `projectName` | string | ✅ | |
| `workItemType` | string | ✅ | Typ der Kind-Items |
| `parentId` | number | ✅ | ID des Parent-Work-Items |
| `items` | object[] | ✅ | Array mit `{ title, fields? }` |
| `format` | string | — | `"Markdown"` |

---

## Rückgabe-Struktur (Work Item)

```json
{
  "id": 1234,
  "fields": {
    "System.Title": "...",
    "System.Description": "<html>...",
    "Microsoft.VSTS.Common.AcceptanceCriteria": "<html>...",
    "System.WorkItemType": "User Story",
    "System.State": "Active"
  },
  "url": "https://dev.azure.com/org/project/_apis/wit/workItems/1234"
}
```

> `Description` und `AcceptanceCriteria` kommen als HTML — für die Analyse als Plaintext lesen (HTML-Tags ignorieren).
