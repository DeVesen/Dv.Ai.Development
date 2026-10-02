# dev-mcp Workflows

Lesen vor: Spec anlegen, Testklasse anlegen.

---

## Angular-Spec anlegen

```
1. read_signatures_only(file_path)          → API verstehen (codebase-analyzer, kein vollständiges Read)
2. find_file(root, "*.spec.ts")             → Vorbild im selben Feature suchen (max 3 lesen)
3. find_file(root, "<name>.spec.ts")        → Existenz prüfen
   - Nicht gefunden: Datei nach dem Vorbild anlegen (ng generate erzeugt für bestehende Dateien keine Spec)
   - Existiert:      read_lines(spec_path, …) → dann Agent-Edit
4. Agent-Edit                               → Testinhalt nach Muster aus Schritt 2
5. dv-angular-test --root <r> -- --include <spec>
```

## .NET Testklasse anlegen

```
1. read_signatures_only / read_class_summary → API verstehen (codebase-analyzer, kein vollständiges Read)
2. find_file(root, "*Tests.cs")             → Vorbild im selben Testprojekt suchen (max 3 lesen)
3. find_file(root, "<ClassName>Tests.cs")   → Existenz im Testprojekt prüfen
   - Nicht gefunden: Datei nach dem Vorbild anlegen
   - Existiert:      read_lines(test_path, …) → dann Agent-Edit
4. Agent-Edit                               → Tests nach Muster aus Schritt 2
5. dv-dotnet-test --path <testprojekt> -- --filter "FullyQualifiedName~<ClassName>"
```

## Scout-Fallback (Index-Miss)

Nach leerem `find_in_index` (codebase-analyzer):

1. `find_by_content` (Regex, optional `file_glob`) oder `find_file` (Glob unter `root`)
2. Bei Treffer: `read_class_summary` / `read_signatures_only` (codebase-analyzer)

Nicht sofort natives Grep — MCP-Kette zuerst.

---

## Compliance-Nachweis im Abschlussbericht

```
Build/Test: dv-dotnet-build OK (0 Fehler)
```
