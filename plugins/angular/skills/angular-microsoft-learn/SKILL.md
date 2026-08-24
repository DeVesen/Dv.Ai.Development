---
name: angular-microsoft-learn
description: >
  Use when the question is about TypeScript language core mechanics — type system, generics,
  conditional/mapped/utility types, tsconfig.json compiler options, tsc/strict-mode behavior,
  module resolution, type inference, declaration files (.d.ts). Fetches authoritative
  Microsoft-Docs via microsoft_docs_search/microsoft_docs_fetch/microsoft_code_sample_search
  (MCP-Endpoint https://learn.microsoft.com/api/mcp). NOT for Angular-Framework-APIs —
  Component, Signal, RxJS, DI, Router, Forms, Material — dort ist Microsoft Learn nicht
  autoritativ, stattdessen die passenden angular-* Skills nutzen.
---

## MCP-First — TypeScript-Sprachkern

Vor der Antwort aus dem Trainings-Wissen: **`microsoft_docs_search`** aufrufen wenn die Frage
das TypeScript-Typsystem, tsconfig-Optionen oder Compiler-Verhalten betrifft.

Scope bewusst schmal: **nur** TypeScript-Sprachkern. Angular-Framework-Themen (Component,
Signal, RxJS, DI, Router, Forms, Material) gehören in die jeweiligen `angular-*` Skills —
Microsoft Learn ist dort keine autoritative Quelle.

| Situation | Tool |
|-----------|------|
| Begriff, Typ-Feature, Compiler-Option suchen | `microsoft_docs_search` |
| Vollständigen Doku-Artikel laden | `microsoft_docs_fetch` |
| Code-Snippet gezielt in TypeScript finden | `microsoft_code_sample_search` |

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

**Trigger:** `angular-microsoft-learn init`

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
| Tool-Parameter, Rückgabe-Schemas, Beispiele, Abgrenzung | `references/tool-catalog.md` |
