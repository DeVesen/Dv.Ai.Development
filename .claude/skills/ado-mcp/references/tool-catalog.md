# ADO-MCP Tool-Katalog — Work Items

MCP-Server-Name in Claude Code: **`ado`** → Präfix `mcp__ado__`

> Verifiziert 2026-08-10 gegen laufenden Server (`@azure-devops/mcp`, org `TrumpfCorp`).
> Tool-Namen via `ToolSearch("ado work item")` erneut verifizieren falls ein Aufruf fehlschlägt — der Server nennt seine Tools anders als man erwarten würde (`wit_work_item` statt `wit_get_work_items_batch_by_ids` etc.).

**Projektname für `project`-Parameter:** `Laser Application Database` (nicht der Repo-Name `lac-db`).

---

## Work Item lesen

### `wit_work_item` (action: `get`)
Liest ein einzelnes Work Item per ID.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|--------------|
| `action` | string | ✅ | `"get"` |
| `id` | number | ✅ | Work Item ID |
| `project` | string | — | Projektname; ohne Angabe kommt Auswahl-Prompt/Fehler |
| `expand` | string | — | `None`\|`Relations`\|`Fields`\|`Links`\|`All` (nicht kombinierbar mit `fields`) |
| `fields` | string[] | — | Felderauswahl (nicht kombinierbar mit `expand`) |
| `asOf` | date-time | — | Historischer Stand |

**ID aus URL extrahieren:**
`https://dev.azure.com/org/project/_workitems/edit/1234` → ID = `1234`

### `wit_work_item` (action: `get_batch`)
Liest mehrere Work Items per ID.

| Parameter | Typ | Pflicht |
|-----------|-----|---------|
| `action` | string | ✅ `"get_batch"` |
| `ids` | number[] | ✅ |
| `project` | string | — |
| `fields` | string[] | — |

### `wit_work_item` (action: `list_comments`)
Liest Kommentare/Diskussion eines Work Items.

| Parameter | Typ | Pflicht |
|-----------|-----|---------|
| `action` | string | ✅ `"list_comments"` |
| `workItemId` | number | ✅ |
| `project` | string | — |
| `top` | number | — |

### `wit_work_item` (action: `my` \| `list_revisions` \| `list_for_iteration` \| `get_type`)
Weitere Read-Varianten desselben Tools — siehe Tool-Beschreibung per `ToolSearch`.

---

### `wit_query` (action: `wiql`)
WIQL-Query ausführen.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|--------------|
| `action` | string | ✅ | `"wiql"` |
| `wiql` | string | ✅ | WIQL-Statement (max 32768 Zeichen) |
| `project` | string | — | Projektkontext |
| `team` | string | — | |
| `top` | number | — | Default 50 |
| `responseType` | string | — | `"full"` (default) oder `"ids"` |

**Beispiel — Offene Bugs:**
```sql
SELECT [System.Id], [System.Title]
FROM WorkItems
WHERE [System.TeamProject] = 'Laser Application Database'
  AND [System.WorkItemType] = 'Bug'
  AND [System.State] <> 'Closed'
ORDER BY [System.ChangedDate] DESC
```

`wit_query` kennt außerdem `action: "get"` (gespeicherte Query per ID/Pfad) und `action: "get_results"` (gespeicherte Query ausführen).

---

## Work Item schreiben

### `wit_work_item_write` (action: `update`)
Aktualisiert Felder eines bestehenden Work Items — als JSON-Patch-Liste, nicht als Objekt.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|--------------|
| `action` | string | ✅ | `"update"` |
| `id` | number | ✅ | Work Item ID |
| `updates` | object[] | ✅ | `[{ path, value, op? }]` — `path` z.B. `/fields/System.Title` |
| `project` | string | — | |

**Beispiel:**
```json
{
  "action": "update",
  "id": 296821,
  "updates": [
    { "path": "/fields/System.State", "value": "Active" },
    { "path": "/fields/System.Description", "value": "Neuer Text" }
  ]
}
```

### `wit_work_item_write` (action: `create`)
Legt ein neues Work Item an.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|--------------|
| `action` | string | ✅ | `"create"` |
| `workItemType` | string | ✅ | z. B. `"User Story"`, `"Bug"`, `"Task"` |
| `fields` | object[] | ✅ | `[{ name, value, format? }]` — mind. `System.Title` |
| `project` | string | — | Ziel-Projekt |

### `wit_work_item_write` (action: `update_batch` \| `add_child`)
- `update_batch`: `batchUpdates: [{ id, path, value, op? }]`
- `add_child`: `parentId`, `workItemType`, `items: [{ title, description, areaPath?, iterationPath?, format? }]`

---

### `wit_work_item_comment_write` (action: `add`)
Fügt einen Kommentar zu einem Work Item hinzu.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|--------------|
| `action` | string | ✅ | `"add"` |
| `workItemId` | number | ✅ | |
| `text` | string | ✅ | Kommentartext |
| `project` | string | — | |
| `format` | string | — | `"Markdown"` (default) oder `"Html"` |

### `wit_work_item_comment_write` (action: `update`)

| Parameter | Typ | Pflicht |
|-----------|-----|---------|
| `action` | string | ✅ `"update"` |
| `commentId` | number | ✅ |
| `text` | string | ✅ |
| `workItemId` | number | ✅ |

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
