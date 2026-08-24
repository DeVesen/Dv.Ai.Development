# angular-microsoft-learn Tool-Katalog

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
- **Einsatz:** Erster Schritt bei jedem TS-Sprachkern-Lookup; liefert URL für `microsoft_docs_fetch`

```
query: "TypeScript conditional types distributive"
query: "tsconfig strictNullChecks vs strict"
query: "TypeScript satisfies operator"
```

### `microsoft_docs_fetch`

Lädt eine Doku-Seite vollständig als Markdown.

- **Rückgabe:** Vollständiger Artikelinhalt als Markdown
- **Einsatz:** Wenn `microsoft_docs_search` einen Treffer liefert und der vollständige Kontext gebraucht wird (z. B. vollständige tsconfig-Optionstabelle)
- **Hinweis:** Nur `learn.microsoft.com`-URLs — keine externen Seiten

```
url: "https://learn.microsoft.com/en-us/typescript/handbook/2/conditional-types"
url: "https://learn.microsoft.com/en-us/typescript/tsconfig"
```

### `microsoft_code_sample_search`

Sucht gezielt nach Code-Snippets in der Microsoft-Dokumentation.

- **Rückgabe:** Code-Snippets mit Quellinformation
- **Einsatz:** Wenn ein konkretes TypeScript-Beispiel gesucht wird (statt allgemeinem Doku-Text)
- **`language`-Wert:** `"typescript"`

```
query: "mapped type key remapping"   language: "typescript"
query: "generic constraint keyof"    language: "typescript"
```

---

## Rückgabe-Schema

### `microsoft_docs_search`

```json
[
  {
    "title": "Conditional Types",
    "content": "...",
    "url": "https://learn.microsoft.com/en-us/typescript/..."
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
    "language": "typescript",
    "url": "https://learn.microsoft.com/..."
  }
]
```

---

## Typische Workflows

### Typsystem-Feature klären

```
1. microsoft_docs_search("TypeScript mapped types as clause")
   → Treffer mit URL
2. microsoft_docs_fetch(url)
   → Vollständige Erklärung + Beispiele
```

### tsconfig-Option prüfen

```
1. microsoft_docs_search("tsconfig moduleResolution bundler")
2. microsoft_docs_fetch(url) bei Bedarf
```

### Code-Beispiel für ein Typ-Feature

```
1. microsoft_code_sample_search("discriminated union exhaustiveness check", language: "typescript")
   → Sofort verwendbares Snippet
```

---

## Abgrenzung

| Frage | Empfehlen |
|-------|-----------|
| TS-Typsystem / generics / tsconfig / tsc-Verhalten | `microsoft_docs_search` zuerst |
| Artikel vollständig lesen | `microsoft_docs_fetch` |
| Snippet für ein TS-Typ-Feature | `microsoft_code_sample_search` |
| Angular Component / Signal / RxJS / DI / Router / Forms / Material | passenden `angular-*` Skill nutzen — Microsoft Learn hier nicht autoritativ |
| Allgemeine JS-Frage ohne TS-Typing-Bezug | Trainings-Wissen ausreichend |
