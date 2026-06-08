# Phase `load` — ADO MCP only

Nur Azure DevOps lesen. **Keine** lokalen Markdown-Dateien schreiben, **kein** Repo-Scout, **keine** Task-Subagents.

Voraussetzungen: MCP **`ado`** ([`mcp-tools.md`](mcp-tools.md)), [`../config.defaults.json`](../config.defaults.json).

## Trigger

| Trigger | Verzweigung |
|---------|-------------|
| `load story {id}` | Story-Load |
| `load feature {id}` | Feature-Load (Kaskade) |
| `load task {id}` | `wit_get_work_item` → Parent-Story-ID → Story-Load |

**Veraltet (nicht mehr unterstützt):** `prüfe Story`, `prüfe Task`, `prüfe Feature`.

## Statuszeile (Pflicht)

```
Phase: load
```

## MCP-Ablauf (Story)

1. Tool-Schema lesen ([`mcp-tools.md`](mcp-tools.md)).
2. `wit_get_work_item` — `id`, `project` = `defaultProject`.
3. `wit_list_work_item_comments` — nur diese Story.
4. **Anhänge (optional):** Vor Aufruf MCP-Schema prüfen. Gibt es ein Tool zum **Auflisten** von Attachments (Namen/Metadaten, kein Download) → aufrufen und Namen sammeln. **Kein** solches Tool → Feld **weglassen** (kein Platzhalter, kein Hinweis).
5. Description-Punkte als **Rohliste** extrahieren (HTML → lesbare Zeilen; `(x)` sichtbar lassen, **noch kein** Slug-Mapping).

## MCP-Ablauf (Feature)

1. Feature: Schritte wie Story (Description, AC, Discussion, Anhänge nur wenn MCP-Tool existiert).
2. Child-User-Stories: Relations `System.LinkTypes.Hierarchy-Forward` oder WIQL ([`feature-pruefe.md`](feature-pruefe.md) Phase B) — IDs **aufsteigend**.
3. Pro Child-Story: dieselben Felder wie Story-Load (Schritte 2–5).

**0 Child-Stories:** Load-Bundle trotzdem mit Feature-Kontext; Hinweis im Bericht.

## Load-Bundle (intern + Chat)

Struktur für nachfolgende Phase `analyse`:

```markdown
## Load-Bundle — {Typ} {id}

### Metadaten
- workItemType, title, state, priority, adoUrl, parentId (falls gesetzt)
- commentCount

### Description
{verdichtet, kein HTML-Rohdump}

### Acceptance Criteria
{verdichtet oder „nicht gepflegt"}

### Discussion
{Kurz; Marker nur erwähnen, nicht final parsen}

### Anhänge
{nur wenn MCP geliefert hat: `- name1`, `- name2` — sonst Abschnitt **fehlt**}

`attachmentNames` im Bundle = Liste der Dateinamen aus Load (für save-Blockquote).

### Description-Punkte (Roh)
| # | Abschnitt | Text (Kurz) | (x) sichtbar |
|---|-----------|-------------|--------------|

### Feature-Kontext (nur Feature-Load oder Parent-Feature)
{featureId, title, url, description/ac/discussion summaries}

### Child-Stories (nur Feature-Load)
Liste: storyId → eingebettetes Story-Load-Bundle je Child
```

## Navigation nach `load`

```
load — andere ID nachladen
analyse — Task-Inventar + Task-Drafts (nach load)
```

## Verboten in `load`

- `{workspace-root}/requests/stories/` lesen/schreiben (Ausnahme: Nutzer verweist explizit auf bestehende Datei unter `{workspace-root}/requests/stories/` zum Vergleich — dann nur Read, kein Sync)
- Task-Subagents, Story-Subagents
- `(x)`-Slug-Mapping, Task-Übersicht, `## Möglichkeiten`
- Repo-Scout / code-review-mcp

## Reporting

- Work-Item-ID(s), ADO-URL(s)
- Kurz: Anzahl Description-Punkte, Anzahl Child-Stories (Feature)
- Hinweis: **Keine Dateien geändert** — nächster Schritt `analyse`
