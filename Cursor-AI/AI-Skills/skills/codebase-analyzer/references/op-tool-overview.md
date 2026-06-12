# Tool-Übersicht: Alle verfügbaren Tools (32)

## ① Code Review

| Tool | Was es tut |
|------|------------|
| `review_file` | Einzelne Datei vollständig analysieren — SOLID, Security, Performance, Best Practices. `focusAreas` unterstützt jetzt auch `"api-validation"`. |
| `review_code` | Code direkt aus dem Chat reviewen (Copy-Paste, kein Dateipfad nötig). |
| `review_git_diff` | Alle Änderungen seit dem letzten Commit reviewen — staged oder unstaged. |
| `review_files_batch` | Mehrere Dateien auf einmal reviewen, kombinierter Report. Mit `focusAreas: ["api-validation"]` werden fehlende DataAnnotations auf DTOs und unvalidierte POST/PUT-Endpunkte priorisiert ausgegeben. |
| `analyze_ast_only` | Nur Struktur lesen ohne LLM — Klassen, Methoden, Abhängigkeiten. Ab v2.1 auch `record`-Typen mit Properties und Annotations. |
| `compare_validation_rules` | **v2.1** — Vergleicht Angular Reactive Form Validators mit .NET DTO DataAnnotations. Liefert Delta-Matrix: welche Felder sind aligned, welche fehlen im BE, welche im FE, welche haben Konflikte. |
| `find_api_callers` | **NEU v2.2** — Scannt Angular `.ts`-Datei nach HttpClient-Aufrufen (GET/POST/PUT/PATCH/DELETE). Zeigt welche Klasse/Methode welche URL aufruft. Optional nach URL-Pattern filtern. Löst "welche Komponente ruft Endpoint X?" ohne Grep. |

## ② Projekt-Index & Navigation

| Tool | Was es tut |
|------|------------|
| `index_project` | Vollständige Landkarte des Projekts: alle Klassen, Services, Components, Routes, Abhängigkeitsgraph, Architektur-Warnungen. Wird gecacht (5 min). Liefert `projectReferences` / `externalDependencies` für .NET. |
| `index_solution` | **NEU v2.6** — .NET only: kombinierter Index aller Projekte einer `.sln` mit `project`-Feld pro Symbol. Für Multi-Projekt-Backends (Api + Domain + …). Cache 5 min neben der `.sln`. |
| `find_in_index` | Gezielt nach einer Klasse, einem Service oder Interface suchen — gibt Datei, Zeile, Methoden und Abhängigkeiten zurück. |
| `find_symbol_references` | **NEU v2.3** — Listet alle konkreten Aufrufstellen eines benannten Symbols (Methode/Funktion/Property/Klasse) als Tabelle Datei/Zeile/Methode/Snippet. Die Detailstufe nach `analyze_refactoring_safety`: statt nur einer Zahl die exakten Stellen. Angular (ts-morph) + .NET (Roslyn). `filePath` disambiguiert gleichnamige Symbole. |
| `find_type_hierarchy` | **NEU v2.4** — Gezielte Vererbungsabfrage für ein Symbol: `up` = Basiskette, `down` = Ableitungen und Interface-Implementierungen. Alternative zu `analyze_type_graph` wenn der Typname bekannt ist. Angular (`ts-type-hierarchy.ts`) + .NET (`roslyn-hierarchy.csx`). `filePath` disambiguiert; Cap 400. |
| `review_with_index` | Review einer Datei mit vollem Projektkontext — das LLM sieht den ganzen Abhängigkeitsgraphen bevor es die Datei liest. |

## ③ Erweiterte Code-Analyse

| Tool | Was es tut |
|------|------------|
| `analyze_complexity` | Zyklomatische Komplexität pro Methode — zählt alle Verzweigungen (if, for, &&, catch …). Ab CC≥10 Warnung, ab ≥15 kritisch. |
| `analyze_method_extraction_candidates` | File-scoped: für lange/komplexe Methoden konkrete Extract-Method-Kandidaten (Zeilenbereich, Parameter-Heuristik, Namensvorschlag aus Kommentar/Statement). Defaults minLines 20, minCC 8. Nach `analyze_complexity` oder bei CC≥10 in Scout-Hotspots. |
| `analyze_dead_code` | Findet Code der nicht mehr genutzt wird: private Methoden/Felder die nie aufgerufen werden, unused Imports, nie verwendete Interfaces. |
| `analyze_nullability` | Stellen wo das Programm abstürzen kann weil ein Wert unerwartet leer ist: !, .Result, FirstOrDefault().Property ohne Check, subscribe ohne error-Handler. |
| `analyze_duplicates` | Findet Methoden mit identischer Logik an verschiedenen Stellen — via normalisiertem AST-Hash (erkennt Duplikate trotz anderer Variablennamen). |
| `analyze_refactoring_safety` | Zeigt wie viele Stellen im Projekt eine Methode oder Klasse verwenden, ob sie Teil eines Interface-Kontrakts ist, ob Templates betroffen sind. Risikoabschätzung vor dem Umbau. Danach `find_symbol_references` für die konkreten Aufrufstellen (Datei/Zeile). |
| `generate_auto_fixes` | Erstellt konkrete Before/After-Fixes: Angular (@Input→input(), *ngIf→@if, \| async→toSignal(), OnPush), .NET (.Result→await, fehlende CancellationToken, null-Guards). |
| `analyze_dataflow` | Verfolgt wie Daten zwischen Klassen fließen — findet nullable Rückgabewerte die ohne Null-Check weiterverwendet werden, nicht-awaitete Tasks, unsubscribed Observables. |
| `analyze_advanced_all` | Führt alle 7 obigen Analysen in einem Aufruf aus und liefert einen Gesamtbericht. |

## ④ Klassen-Schnitt

| Tool | Was es tut |
|------|------------|
| `suggest_class_splits` | Berechnet LCOM-Score (Kohäsion), findet Methoden-Cluster via Union-Find, erstellt eine Field-Access-Map und schlägt konkrete Splits vor — mit neuen Klassennamen und Methoden-Zuteilung. Urgency: none / low / medium / high / critical. |
| `detect_god_classes` | **NEU v2.5** — Projektweiter Scan ohne Datei-Input: priorisiertes Ranking von God-Class-Kandidaten (SRP-Verstöße) nach Metriken (methodCount, LOC, LCOM, Dependencies) und Urgency. Folgeschritt: `suggest_class_splits` auf Kandidaten. Angular + .NET; Cap 400; Default `top: 10`. |

## ⑤ Code Intelligence

| Tool | Was es tut |
|------|------------|
| `analyze_maintainability_index` | Berechnet den Microsoft Maintainability Index (0–100, Note A–F) pro Methode aus Halstead-Volumen + Zyklomatischer Komplexität + Lines of Code. Dazu LCOM (Kohäsion) pro Klasse. |
| `analyze_type_graph` | Vollständiger Typ-Graph: alle Klassen, Interfaces, Enums, Records als Nodes; extends/implements/injects/returns als Edges. Findet Zyklen, Orphan-Typen, Layer-Violations und meistverwendete Typen. |
| `analyze_control_flow` | Baut ein Kontrollflussmodell pro Methode: findet unerreichbaren Code nach return/throw, immer-wahre Bedingungen, fehlende Return-Pfade, Endlosschleifen, nested subscribe() (Angular), async void (.NET). |

## ⑥ Test-Qualität & Coverage

| Tool | Was es tut |
|------|------------|
| `analyze_coverage` | Liest lcov.info (Angular) oder coverage.cobertura.xml (.NET) und zeigt Line/Branch/Function-Coverage pro Datei, Grade A–F, nicht-gecoverte Methoden namentlich. Kein eigener Test-Run — braucht vorhandenen Report. |
| `analyze_test_quality` | Analysiert Testdateien statisch ohne sie auszuführen: findet Tests ohne Assertions, Tautologien (expect(true).toBe(true)), Mock-Heavy-Tests, fehlende Fehler-Szenarien, blockierendes async. |
| `detect_untested_public_api` | **NEU v2.3** — Listet public-Symbole (Methoden, Properties, Get/Set-Accessoren) ohne erkennbare Test-Referenz — rein statisch, Heuristik, kein Test-Run. Angular: Abgleich gegen `*.spec.ts` im **gleichen oder beliebigen übergeordneten** Verzeichnis (Import-Gate + Member-Match). .NET: Roslyn-Scan public-Member gegen Test-Projekt — deckt auch `record`/`struct` (inkl. positionaler Properties) ab; die .NET-pro-Klasse-Zuordnung ist mangels echtem Import-System „looser"/heuristischer als das TS-Import-Gate (bewusste Limitation). `reason`: `no_test_file` (kein Spec/Test) oder `no_reference_found` (Test existiert, Symbol nie referenziert). `path` / `type` (auto) / `depth` (file\|project). |
| `analyze_test_health` | Kombiniert Coverage-Report und Test-Qualität in einem Dashboard — zeigt priorisiert was zuerst angegangen werden sollte. |

## ⑦ Compiler & Build

| Tool | Was es tut |
|------|------------|
| `analyze_compiler_diagnostics` | **NEU v2.5** — Echter Compiler-Check (keine Heuristik): Roslyn `GetDiagnostics` (.NET, MSBuildWorkspace mit Ad-hoc-Fallback) bzw. ts-morph `getPreEmitDiagnostics` (Angular). Liefert Type-Mismatches, fehlende Implementierungen, Nullable-Violations u. ä. **Kein Shell-Build** — Compiler-API direkt. `path` (Datei oder Projekt), `type` (auto), `severity` (error\|warning\|all, Default error). |

## ⑧ BoyScoutRule

| Tool | Was es tut |
|------|------------|
| `suggest_boyscout_actions` | **NEU v2.6** — BoyScout-Orchestrator: `filePaths[]` rein, priorisierte Top-N-Verbesserungsliste raus. Compiler-Gate zuerst; bei 0 Errors aggregiert Nullability, Dead Code, Complexity (CC≥10), ungetestete public API, Extraktionskandidaten. Dedup + Score. Post-Implementation nach jedem Slice. `maxPerFile` (Default 5). |

## Wichtige Parameter

**Alle Pfade = Container-Pfade unter `/workspace/`** (Volume-Mount: `${workspaceFolder}:/workspace:ro`)

| Parameter | Verwendet von | Format |
|-----------|--------------|--------|
| `projectPath` / `solutionPath` | `index_project`, `index_solution`, `review_with_index`, `find_symbol_references`, `find_type_hierarchy`, `detect_god_classes` | `/workspace/<relativer/pfad>` z.B. `/workspace/src/frontend` bzw. `/workspace/MyApp.sln` |
| `filePath` | `review_file`, `analyze_ast_only`, `analyze_complexity`, `analyze_method_extraction_candidates`, `find_symbol_references`, `find_type_hierarchy` (optional) u.a. | `/workspace/<relativer/pfad/datei.ts>` |
| `filePaths` | `review_files_batch`, `suggest_boyscout_actions` | Array von `/workspace/...`-Pfaden |
| `maxPerFile` | `suggest_boyscout_actions` | Anzahl priorisierter Findings pro Datei (Default `5`) |
| `path` | `analyze_compiler_diagnostics`, `detect_untested_public_api` | `/workspace/<datei oder verzeichnis>` |
| `type` | alle dateibasierten Tools | `"angular"` \| `"dotnet"` \| `"auto"` |
| `severity` | `analyze_compiler_diagnostics` | `"error"` (default) \| `"warning"` \| `"all"` |

**Niemals** Windows-Pfade (`C:\...`) oder nur IDE-relative Pfade (`src/...`) übergeben — der Container kennt nur `/workspace/`.

Kein Tool benötigt einen **Shell-Build** (`dotnet build` / `ng build`). `analyze_compiler_diagnostics` nutzt die Compiler-API (Roslyn/TypeScript) direkt — erfordert aber eine auflösbare `.csproj` bzw. `tsconfig`. 28 der 31 Tools brauchen zusätzlich **keinen vorherigen Test-Run** — nur die beiden Coverage-Tools (`analyze_coverage`, `analyze_test_health`) setzen einen Test-Run voraus.

## Parameter: `format` (v2.2+)

`review_file`, `review_code`, `review_git_diff`, `review_files_batch` unterstützen:

| Wert | Effekt |
|------|--------|
| `"full"` (default) | Vollständiges Output inkl. `## Raw AST` JSON — für tiefe Analyse |
| `"compact"` | Kein Raw AST, Property-Summaries statt per-Property-Listen — für Planungs-Inventare |

Bei `review_files_batch` + `"compact"`: **Endpoint-Inventar-Tabelle** wird vorangestellt (Controller, Method, Verb, DTO-Typ, Validation-Status).

## Wann welches Tool für Validierungs-Reviews?

| Frage | Tool |
|-------|------|
| Hat dieser Controller DataAnnotations auf seinen DTOs? | `review_files_batch` + `focusAreas: ["api-validation"]` |
| Welche Properties hat `CreateXRequest.cs`? (war vorher 0 Klassen bei records) | `analyze_ast_only` |
| Stimmen FE-Validators mit BE-Annotations überein? | `compare_validation_rules` |
| Wie viele POST-Endpunkte ohne Validierung gibt es gesamt? | `index_project` (dotnet) → controllers-Liste, dann `review_files_batch` |
