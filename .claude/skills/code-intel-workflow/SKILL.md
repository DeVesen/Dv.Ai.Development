---
name: code-intel-workflow
description: >
  MCP-Routing für Code-Intelligence-Workflows: narrow (symbol suchen), read (token-sparend lesen),
  impact (rename preview, referenzen), verify (compiler + slice tests).
  Phasen: narrow → read → impact → verify.
  Trigger: Symbol suchen, Datei lesen, Umbenennen mit Impact, Post-Slice-Verifikation, Batch-Scout.
  Nicht für Planning/Implementation-Orchestrierung (→ feature-delivery).
when_to_use: >
  Aktiviere wenn: Symbol suchen (scout_symbol/scout_scope), Datei-Bundle lesen (read_files_batch,
  read_component_bundle), Rename-Impact prüfen (rename_file_with_impact), Post-Slice
  (slice_test_targets + analyze_slice_impact). Strukturierter MCP-Routing für Lese+Analyse+Patch-Ketten
  — ergänzt dev-mcp und codebase-analyzer um Rename-/Write-Operationen.
---

# Code-Intel-Workflow

MCP-Routing für **Code-Intelligence-Ketten** — ohne Planning/Implementation zu duplizieren.

**Kanon-Verweise:**

| Bereich | Kanon |
|---------|-------|
| Datei lesen/suchen | [dev-mcp/SKILL.md](../dev-mcp/SKILL.md) |
| Index, Scout, Analyse | [codebase-analyzer/SKILL.md](../codebase-analyzer/SKILL.md) |
| MCP-Routing-Übersicht | [dev-tooling/SKILL.md](../dev-tooling/SKILL.md) |

---

## Phase 1 — Narrow (Symbol suchen)

**Ziel:** Symbol oder Scope mit minimalem Token-Einsatz lokalisieren.

| Situation | Tool | Format |
|-----------|------|--------|
| Ein Symbol suchen | `scout_symbol(query, projectPath, format: compact)` | compact |
| Mehrere Repo-Fragen (Buddy/Planning) | `scout_scope(questions[], defaultProjectPath, format: scout_table)` | scout_table |
| Index warm? | `index_status()` | — |
| Index-Cache kalt | `index_project(projectPath)` dann `scout_symbol` | — |
| Mehrere Projekte batch-indexieren | `index_project(projects: [path1, path2])` | — |

**Format-Wahl:**

| format | Wann | Tokengröße |
|--------|------|-----------|
| `paths_only` | Nur Pfad+Zeile nötig | < 1 KB |
| `compact` | Standard Scout | < 3 KB |
| `full` | Review, detaillierte Analyse | variabel |

**Scout-Bundle Convention (REQ-S05):**

`scout_scope` gibt eine Markdown-Tabelle + `rows[]`-Array zurück. Claude **konstruiert daraus** ein Session-Artifact und hält es im Gesprächskontext — es ist kein Tool-Return-Format, sondern eine Claude-seitige Konvention:

```json
// Claude-seitig zu konstruieren aus scout_scope Output — nicht tool-return-value
{
  "warmedIndexes": ["C:\\Develop\\[project]\\src\\frontend"],
  "answeredQuestions": ["Wo ist AuthService?", "Welche Guards gibt es?"],
  "fundstellen": [
    { "question": "Wo ist AuthService?", "paths": ["src/app/auth/auth.service.ts"], "snippet": "..." }
  ]
}
```

Dieses Bundle **nicht verwerfen** nach Phase 1 — als Kontext an feature-delivery mitgeben. Spart Wiederholungs-Scouts in Phase 2+.

---

## Phase 2 — Read (Token-sparend lesen)

**Ziel:** Dateiinhalte mit minimalem Output lesen.

| Was lesen | Tool | Hinweis |
|-----------|------|---------|
| Einzelne Zeilen | `read_lines(file_path, start_line, end_line, context_lines)` | Max 500 Zeilen |
| 1–25 Dateien parallel | `read_files_batch(file_paths[], mode: signatures|class_summary|method)` | 1 Call statt N× |
| Angular-Komponente bundle | `read_component_bundle(component_ts_path, template_mode: summary)` | .ts + .html + .spec in 1 Call |
| Verwandte Dateien | `read_related_files(file_path, relation: test|template|styles|all)` | Auto-Auflösung |

**Eselsbrücke:** `read_files_batch` ersetzt N× `read_signatures_only` = 1 Call.

---

## Phase 3 — Impact (Analyse vor Schreib-Operation)

**Ziel:** Seiteneffekte vor Rename/Move/Patch verstehen.

| Situation | Tool |
|-----------|------|
| Datei umbenennen (Preview) | `rename_file_with_impact(old_path, new_path, execute: false)` |
| Datei umbenennen (Execute) | `rename_file_with_impact(old_path, new_path, execute: true)` |
| Symbol-Referenzen | `find_symbol_references(project_path, symbol_name, type)` |
| Datei löschen (Safety) | `delete_file_safe(file_path, dry_run: true)` |
| Import-Pfad aktualisieren | `update_imports(file_path, symbol, old_path, new_path)` |
| Symbol in andere Datei verschieben | `move_symbol` — **P3, noch nicht implementiert**. Workaround: `find_symbol_references` → manuell verschieben → `update_imports` |

---

## Phase 4 — Verify (Compiler + Test-Targets)

**Ziel:** Nach Änderungen schnell verifizieren.

| Schritt | Tool |
|---------|------|
| Geänderte Dateien ermitteln | `git_changed_files(repo_root, base: unstaged|staged|all)` |
| Test-Targets für Slice | `slice_test_targets(changed_file_paths[], stack: auto)` |
| Scope-Impact (Compiler+BoyScout) | `analyze_slice_impact(changed_file_paths[], format: compact)` |
| Tests Slice-fokussiert (Angular) | `test_angular_project(project_root, include_patterns[], test_name_pattern)` |
| Tests Slice-fokussiert (.NET) | `test_dotnet_solution(path, filter, test_project_path)` |

**Standard-Ablauf Post-Implementierung:**

```
git_changed_files(repo_root="C:\Develop\[repo]", base="unstaged")
  → slice_test_targets(changed_file_paths=[...], stack="auto")
  → test_angular_project / test_dotnet_solution (mit Slice-Filter aus Output)
  → analyze_slice_impact(changed_file_paths=[...], format="compact")
```

---

## Domain-Finder (P1)

Für spezifische Code-Konstrukte ohne vollständigen Index-Scan:

| Suchziel | Tool | Server |
|----------|------|--------|
| Angular Route → Component | `find_angular_route(root, route_path)` | **codebase-analyzer** (primär, nutzt Index) |
| Angular Guard | `find_angular_guard(root, guard_name)` | **codebase-analyzer** (primär) |
| .NET Endpoint | `find_dotnet_endpoint(root, route_or_action)` | **codebase-analyzer** (primär) |
| DI-Registrierung | `find_di_registration(root, service_name)` | **codebase-analyzer** (primär) |
| FE→BE Contract | `trace_api_contract(angular_service_path)` | codebase-analyzer |
| Planning-Inventar | `analyze_planning_inventory(file_paths[])` | codebase-analyzer |

> Fallback: dev-mcp hat dieselben Domain-Finder als Filesystem-only Implementierung (kein Index). Nutze dev-mcp nur wenn codebase-analyzer nicht verfügbar.

---

## Patch-Operationen (P0/P2)

| Operation | Tool | Sicherheit |
|-----------|------|-----------|
| Zeilenbereich ersetzen | `apply_text_patch(file_path, start_line, end_line, new_text)` | run_compiler_gate=true |
| Anker-basierter Patch | `apply_text_patch(file_path, old_text, new_text)` | ambiguous_anchor wenn nicht eindeutig |
| Preview vor Patch | `apply_text_patch(..., dry_run: true)` | kein Schreiben |
| Batch-Replace | `replace_in_files(root, old_text, new_text, confirm: true)` | Pflicht: dry_run zuerst |
| Member einfügen | `insert_member(file_path, member_kind, signature, position)` | .cs + .ts |

**Pflicht-Workflow für `apply_text_patch`:**

1. `apply_text_patch(..., dry_run: true)` — Preview
2. Bei Erfolg: `apply_text_patch(..., dry_run: false, run_compiler_gate: true)`
3. Bei Compiler-Fehlern: `rollback_on_error: true`

---

## Opt-out

`kein code-intel`, `no-code-intel`, `skip-code-intel` → Skill nicht laden.

---

## Abgrenzung

| Workflow | Zuständig |
|----------|-----------|
| Vollständige Sprint-Planung | feature-delivery |
| Slice-basierte Implementierung | feature-delivery |
| Repo-Scout (read-only) | codebase-analyzer (scout_symbol/scout_scope) · dev-mcp (find_*) |
| Symbol-Suche + Patch-Kette | **code-intel-workflow** |
