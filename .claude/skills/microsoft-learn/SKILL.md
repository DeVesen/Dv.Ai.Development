---
name: microsoft-learn
description: >
  Use when answering questions about Microsoft or Azure technologies — .NET, ASP.NET Core,
  Azure SDK, EF Core, C#, Blazor, MAUI, Bicep, MS Graph, SignalR, NuGet packages.
  Trigger: API signatures, SDK usage, configuration syntax, NuGet options, Azure resource
  setup, "how does X work in .NET", "Azure SDK example", "EF Core migration syntax",
  "ASP.NET config". Prefer over training-knowledge whenever accuracy for MS APIs matters.
  Not for Angular, React, or non-MS packages without Azure/Microsoft context.
---

## MCP-First — Microsoft-Dokumentation

Vor der Antwort aus dem Trainings-Wissen: **`microsoft_docs_search`** aufrufen wenn die Frage eine Microsoft-API, SDK-Signatur, Konfigurationsoption oder Azure-Ressource betrifft.

| Situation | Tool |
|-----------|------|
| Begriff, Feature, Klasse, Methode suchen | `microsoft_docs_search` |
| Vollständigen Doku-Artikel laden | `microsoft_docs_fetch` |
| Code-Snippet gezielt nach Sprache finden | `microsoft_code_sample_search` |

**Typisches Muster:**
1. `microsoft_docs_search` → Treffer mit URL
2. `microsoft_docs_fetch(url)` → vollständiger Artikel wenn nötig

**MCP-Server:** Remote HTTP — kein lokaler Prozess, kein API-Key.
**Endpoint:** `https://learn.microsoft.com/api/mcp`

---

## ToolSearch — Batch-Load

Einmalig vor dem ersten Aufruf in der Session laden:

```
select:mcp__microsoft-learn__microsoft_docs_search,mcp__microsoft-learn__microsoft_docs_fetch,mcp__microsoft-learn__microsoft_code_sample_search
```

---

## Init — `.mcp.json` einrichten

**Trigger:** `microsoft-learn init`

1. Lies die lokale `.mcp.json` im Projekt-Root (falls vorhanden).
2. Füge den Eintrag hinzu (oder ersetze ihn wenn er bereits existiert):

```json
"microsoft-learn": {
  "url": "https://learn.microsoft.com/api/mcp"
}
```

3. Schreibe die aktualisierte `.mcp.json` zurück.
4. Bestätige: *„`microsoft-learn` wurde in `.mcp.json` eingetragen. Claude Code neu starten damit der Server geladen wird."*

**Hinweis:** Falls `.mcp.json` nicht existiert, anlegen mit:
```json
{ "mcpServers": { "microsoft-learn": { "url": "https://learn.microsoft.com/api/mcp" } } }
```

---

## Referenzen (on-demand lesen)

| Bedarf | Datei |
|--------|-------|
| Tool-Parameter, Rückgabe-Schemas, Beispiele, Token-Budget | `references/tool-catalog.md` |
