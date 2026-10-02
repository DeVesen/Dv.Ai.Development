# microsoft-learn Tool-Katalog

Vollständige Parameter aller 3 Tools. Lesen wenn Tool-Aufruf unklar oder Rückgabe-Format gefragt.

---

## Tools

| Tool | Pflicht-Parameter | Optional |
|------|------------------|---------|
| `microsoft_docs_search` | `query` (string) | — |
| `microsoft_docs_fetch` | `url` (string — learn.microsoft.com-URL) | — |
| `microsoft_code_sample_search` | `query` (string) | `language` (string) |

### `microsoft_docs_search`

Semantische Suche in der offiziellen Microsoft-Dokumentation.

- **Rückgabe:** Bis zu 10 Inhalts-Chunks, je max. 500 Token — Titel, Inhaltsabschnitt, Quell-URL
- **Einsatz:** Erster Schritt bei jedem MS-Doku-Lookup; liefert URL für `microsoft_docs_fetch`

```
query: "ASP.NET Core dependency injection scoped lifetime"
query: "Azure Blob Storage upload stream C#"
query: "EF Core migrations add-migration command"
```

### `microsoft_docs_fetch`

Lädt eine Doku-Seite vollständig als Markdown.

- **Rückgabe:** Vollständiger Artikelinhalt als Markdown
- **Einsatz:** Wenn `microsoft_docs_search` einen Treffer liefert und der vollständige Kontext gebraucht wird (z. B. Konfigurationsoptionen-Tabelle, vollständiges Code-Beispiel)
- **Hinweis:** Nur `learn.microsoft.com`-URLs — keine externen Seiten

```
url: "https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection"
url: "https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-upload"
```

### `microsoft_code_sample_search`

Sucht gezielt nach Code-Snippets in der Microsoft-Dokumentation.

- **Rückgabe:** Code-Snippets mit Quellinformation
- **Einsatz:** Wenn ein konkretes Beispiel für eine Sprache gesucht wird (statt allgemeinem Doku-Text)
- **`language`-Werte:** `"csharp"`, `"typescript"`, `"python"`, `"javascript"`, `"powershell"`, `"bicep"`, `"json"`, u. a.

```
query: "register hosted service"      language: "csharp"
query: "upload blob stream"           language: "csharp"
query: "deploy Azure Function"        language: "bicep"
```

---

## Rückgabe-Schema

### `microsoft_docs_search`

```json
[
  {
    "title": "Dependency injection in ASP.NET Core",
    "content": "...",
    "url": "https://learn.microsoft.com/en-us/aspnet/core/..."
  }
]
```

Bis zu 10 Objekte — bei Bedarf `microsoft_docs_fetch` auf die relevante URL.

### `microsoft_docs_fetch`

```
# Artikeltitel

Vollständiger Markdown-Inhalt ...
```

### `microsoft_code_sample_search`

```json
[
  {
    "title": "...",
    "code": "...",
    "language": "csharp",
    "url": "https://learn.microsoft.com/..."
  }
]
```

---

## Token-Budget (optional)

Der Endpoint unterstützt `maxTokenBudget` als Query-Parameter (experimentell):

```
https://learn.microsoft.com/api/mcp?maxTokenBudget=2000
```

Nicht direkt steuerbar über Tool-Aufruf — relevant nur bei direkter HTTP-Nutzung.

---

## Typische Workflows

### API-Signatur klären

```
1. microsoft_docs_search("HttpClient SendAsync cancellation token")
   → Treffer mit URL
2. microsoft_docs_fetch(url)
   → Vollständige Methoden-Signatur + Parameterdetails
```

### Code-Beispiel für neue Technologie

```
1. microsoft_code_sample_search("minimal API endpoint", language: "csharp")
   → Sofort verwendbares Snippet
```

### Konfigurationsoptionen prüfen

```
1. microsoft_docs_search("appsettings.json connection string EF Core")
2. microsoft_docs_fetch(url) bei Bedarf
```

---

## Abgrenzung

| Frage | Empfehlen |
|-------|-----------|
| .NET / Azure / MS-API → Genauigkeit wichtig | `microsoft_docs_search` zuerst |
| Artikel vollständig lesen | `microsoft_docs_fetch` |
| Snippet für konkrete Sprache | `microsoft_code_sample_search` |
| Angular / React / npm ohne MS-Kontext | Trainings-Wissen ausreichend |
| Allgemeine Architektur-Frage ohne MS-spezifische API | Trainings-Wissen ausreichend |
