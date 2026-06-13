# Feature — Load / Analyse / Save

Gilt wenn `wit_get_work_item` → `System.WorkItemType` = **Feature**.

Phasen: [`phase-load.md`](phase-load.md) → [`phase-analyse.md`](phase-analyse.md) → [`phase-save.md`](phase-save.md).

**Breaking:** `prüfe Feature` entfernt.

## Ziel

1. **load feature:** Feature + Child-Stories per MCP (Load-Bundles).
2. **analyse:** Pro Child-Story parallel `ado-story-pruefe-agent` → Analyse-Bundles.
3. **save:** Story.md + task-*.md je Child-Story persistieren.

**Kein** Ordner `UserStory-{featureId}-*` nur für das Feature.

## Load — Feature-Kontext

| Schritt | Aktion |
|---------|--------|
| L1 | `wit_get_work_item` — optional `expand: relations` |
| L2 | `wit_list_work_item_comments` — Feature (Kontext) |
| L3 | Optional: Attachment-Namen (nur wenn MCP-Tool existiert) |
| L4 | Zusammenfassung: Description, AC, Discussion |

**Feature-Kontext-Objekt:** `featureId`, `featureTitle`, `featureAdoUrl`, `descriptionSummary`, `acSummary`, `discussionSummary`, optional `attachmentNames`.

## Load — Child-Stories

Relations `System.LinkTypes.Hierarchy-Forward` oder WIQL. IDs **aufsteigend**. Pro Story: Story-Load-Bundle.

**0 Stories:** Load-Bundle mit Feature only.

## Analyse — parallele Story-Subagents

Pro Child-`storyId`: `ado-story-pruefe-agent` mit `loadBundle` + `featureContext` (max. **10**/Welle).

Story-Description bleibt Task-Inventar-Quelle (nicht Feature-Description).

## Save

Pro Child-Analyse-Bundle: [`phase-save.md`](phase-save.md).

## Abbruch

| Situation | Verhalten |
|-----------|-----------|
| MCP in load nicht erreichbar | Stopp — keine Ordner |
| SubAgent BLOCKER | Im Bericht; weitere Stories fortsetzen wenn möglich |
| Kein Feature-Typ | Hinweis; ggf. `load story {id}` |

## `load story` mit Parent-Feature

Optional: Parent-Feature in load nachladen → `featureContext` im Load-Bundle — **nicht** Pflicht.
