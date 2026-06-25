# dev-mcp Workflows

Lesen vor: Test anlegen, Spec anlegen, Testklasse anlegen.

---

## Angular-Spec anlegen

```
1. read_signatures_only(file_path)          → API verstehen (kein vollständiges Read)
2. find_test_pattern(root, "angular-spec", reference_file_path)
                                            → Vorbilder finden (max 3)
3. find_file(root, "<name>.spec.ts")        → Existenz prüfen
   - Nicht gefunden: scaffold_spec_for(project_root, source_file_path)
   - Existiert:      read_file_raw(spec_path) → dann Agent-Edit
4. Agent-Edit                               → Testinhalt nach Muster aus Schritt 2
5. test_angular_project(project_root)       → alle Specs laufen
```

## .NET Testklasse anlegen

```
1. read_signatures_only / read_class_summary → API verstehen (kein vollständiges Read)
2. find_test_pattern(root, "dotnet-test", reference_file_path)
                                            → Vorbilder finden (max 3)
3. find_file(root, "<ClassName>.cs")        → Existenz im Testprojekt prüfen
   - Nicht gefunden: scaffold_dotnet_test_class(test_project_path, class_name)
   - Existiert:      read_file_raw(test_path) → dann Agent-Edit
4. Agent-Edit                               → Tests nach Muster aus Schritt 2
5. test_dotnet_solution(path, filter: "FullyQualifiedName~<ClassName>")
```

## Scout-Fallback (Index-Miss)

Nach leerem `find_in_index` (codebase-analyzer):

1. `find_by_content` (Regex, optional `file_glob`) oder `find_file` (Glob unter `root`)
2. Bei Treffer: `read_class_summary` / `read_signatures_only`

Nicht sofort natives Grep — MCP-Kette zuerst.

---

## Compliance-Nachweis im Abschlussbericht

```
Build/Test: MCP-Tool build_dotnet_solution OK (success=true, 0 errors)
MCP-Build/Test eingehalten: ja
```
