# Feature-Roadmap: BoyScoutRule-Erweiterungen

Empfohlene Umsetzungsreihenfolge. Jedes Feature ist unabhängig deploybar.

---

## Welle 1 — Fundament

### 1. `find_symbol_references`
**Datei:** `find-symbol-references.md`  
Breiteste Wirkung, einfachster Einstieg. ts-morph und Roslyn haben die nötigen APIs direkt verfügbar.  
Sofort nutzbar durch Scout (Abschnitt 8) und BoyScoutRule in `review_file`.

### 2. `detect_untested_public_api`
**Datei:** `detect-untested-public-api.md`  
Kein Test-Run, kein CI-Lauf nötig — funktioniert in jedem Kontext sofort.  
Schließt die Lücke wenn kein Coverage-Report vorliegt. Pessimist und Post-Implementation-Phase profitieren direkt.

---

## Welle 2 — Tiefe

### 3. `analyze_method_extraction_candidates`
**Datei:** `analyze-method-extraction.md`  
Baut auf bestehender Complexity-Analyse auf — neuer Wert entsteht durch den Extraktionsvorschlag.  
Benötigt solide AST-Block-Traversal-Logik, etwas mehr Aufwand als Welle 1.

### 4. `find_type_hierarchy`
**Datei:** `find-type-hierarchy.md`  
Targeted-Query auf `analyze_type_graph` — für Scout und Planner wenn Interface/Basisklassen im Scope.  
Parallel zu Feature 3 umsetzbar.

---

## Welle 2b — Compiler & Audit (parallel zu Welle 2)

### 7. `analyze_compiler_diagnostics`
**Datei:** `analyze-compiler-diagnostics.md`  
Roslyn- und TypeScript-Compiler direkt befragen — keine Heuristik, echte Build-Fehler.  
.NET SDK und ts-morph sind im Container bereits vorhanden, kaum Infrastruktur-Aufwand.  
Parallel zu Welle 2 umsetzbar, keine Abhängigkeiten zu anderen Features.

### 8. `detect_god_classes`
**Datei:** `detect-god-classes.md`  
Projektweit God-Class-Kandidaten ranken — baut auf LCOM-Logik aus `suggest_class_splits` auf.  
Parallel zu Welle 2 umsetzbar. Ist Zulieferer für `suggest_boyscout_actions` (Welle 3).

---

## Welle 3 — Integration

### 5. `suggest_boyscout_actions`
**Datei:** `suggest-boyscout-actions.md`  
Dach-Tool: orchestriert Features 1–4 plus bestehende Analyzer.  
Erst sinnvoll wenn Welle 1 (idealerweise auch Welle 2) fertig ist — sonst zu viele Stubs.

### 6. `index_solution`
**Datei:** `index-solution.md`  
.NET-only, Infra-Änderung (MSBuildWorkspace auf Solution-Ebene).  
Unabhängig von den anderen Features — kann parallel zu Welle 2/3 angegangen werden wenn Multi-Projekt-Solutions im Einsatz sind.

---

## Abhängigkeiten

```
find_symbol_references ──────────────────────────────────┐
detect_untested_public_api ──────────────────────────────┤
                                                          ▼
analyze_method_extraction_candidates ──────── suggest_boyscout_actions
find_type_hierarchy ─────────────────────────────────────┤
detect_god_classes ──────────────────────────────────────┘

analyze_compiler_diagnostics  (unabhängig, parallel zu W2)
index_solution                (unabhängig, .NET only)
```
