# Codebase Analyzer

MCP-gestützte statische Code-Analyse für Angular- und .NET-Projekte. 31 spezialisierte Tools für Symbole, APIs, Reviews, Refactoring-Hotspots und Test-Coverage-Proxies.

**Trigger:** Code-Gespräch, Review, Analyse, Planung, Implementierung — aktiviere sobald der User über Code spricht.  
**MCP-Server:** `codebase-analyzer` (Port 8090, Volume `-v ${workspaceFolder}:/workspace:ro`)

---

## Wann verwenden

- **Code-Symbole** (Klasse, Methode, Property, Service, Route): immer `index_project` / `find_in_index` zuerst
- **UI-Labels ohne Symbol**: kein MCP-Aufruf nötig
- **Analyse, Review, Merge, Sprint-End**: codebase-analyzer ist Pflicht-Ausgangspunkt

---

## Tool-Gruppen

### Index & Suche
| Tool | Wann |
|------|------|
| `index_project` | Angular-Repo indexieren |
| `index_solution` | .NET-Solution indexieren |
| `find_in_index` | Symbol nach Name suchen |
| `find_symbol_references` | Aufrufstellen eines Symbols finden |
| `find_api_callers` | HTTP-Calls zu einem Endpoint finden |

### Diagnose & Analyse
| Tool | Wann |
|------|------|
| `analyze_compiler_diagnostics` | Compiler-Fehler und Warnungen analysieren |
| `compare_validation_rules` | Validierungsregeln zwischen FE und BE vergleichen |
| `detect_untested_public_api` | Ungetestete Public-API-Fläche finden |
| `detect_god_classes` | God Classes / SRP-Verletzungen erkennen |
| `analyze_method_extraction_candidates` | Refactoring-Hotspots für Extract-Method |

### Review
| Tool | Wann |
|------|------|
| `review_code` | Allgemeiner Code-Review |
| `review_angular_component` | Angular-Komponente reviewen |
| `review_dotnet_class` | .NET-Klasse reviewen |

> Vollständige Tool-Liste und Parameter: [`docs/mcp/codebase-analyzer.md`](../mcp/codebase-analyzer.md)

---

## Pfad-Konvention

```
index_project("/workspace/src/my-app")
find_in_index("MyService", "/workspace/src")
```

Immer `/workspace/`-Präfix — niemals Host-Pfade.

---

## Output-Format

Bevorzuge `format:compact` für große Ergebnismengen (reduziert Token).

---

## Zusammenspiel mit anderen Skills

- **Scout-Routing:** [`dev-tooling-mcp`](./dev-tooling-mcp.md) · Skill `code-intel-workflow` (narrow→read→impact→verify)
- **MCP-Details:** [`docs/mcp/codebase-analyzer.md`](../mcp/codebase-analyzer.md)
