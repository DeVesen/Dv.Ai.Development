# Tool-Übersicht: Alle verfügbaren Tools (23)

## ① Code Review

| Tool | Was es tut |
|------|------------|
| `review_file` | Einzelne Datei vollständig analysieren — SOLID, Security, Performance, Best Practices. Gibt Score 1–10 und konkrete Fixes. |
| `review_code` | Code direkt aus dem Chat reviewen (Copy-Paste, kein Dateipfad nötig). |
| `review_git_diff` | Alle Änderungen seit dem letzten Commit reviewen — staged oder unstaged. |
| `review_files_batch` | Mehrere Dateien auf einmal reviewen, kombinierter Report. |
| `analyze_ast_only` | Nur Struktur lesen ohne LLM — Klassen, Methoden, Abhängigkeiten. Sehr schnell, ideal für CI. |

## ② Projekt-Index & Navigation

| Tool | Was es tut |
|------|------------|
| `index_project` | Vollständige Landkarte des Projekts: alle Klassen, Services, Components, Routes, Abhängigkeitsgraph, Architektur-Warnungen. Wird gecacht (5 min). |
| `find_in_index` | Gezielt nach einer Klasse, einem Service oder Interface suchen — gibt Datei, Zeile, Methoden und Abhängigkeiten zurück. |
| `review_with_index` | Review einer Datei mit vollem Projektkontext — das LLM sieht den ganzen Abhängigkeitsgraphen bevor es die Datei liest. |

## ③ Erweiterte Code-Analyse

| Tool | Was es tut |
|------|------------|
| `analyze_complexity` | Zyklomatische Komplexität pro Methode — zählt alle Verzweigungen (if, for, &&, catch …). Ab CC≥10 Warnung, ab ≥15 kritisch. |
| `analyze_dead_code` | Findet Code der nicht mehr genutzt wird: private Methoden/Felder die nie aufgerufen werden, unused Imports, nie verwendete Interfaces. |
| `analyze_nullability` | Stellen wo das Programm abstürzen kann weil ein Wert unerwartet leer ist: !, .Result, FirstOrDefault().Property ohne Check, subscribe ohne error-Handler. |
| `analyze_duplicates` | Findet Methoden mit identischer Logik an verschiedenen Stellen — via normalisiertem AST-Hash (erkennt Duplikate trotz anderer Variablennamen). |
| `analyze_refactoring_safety` | Zeigt wie viele Stellen im Projekt eine Methode oder Klasse verwenden, ob sie Teil eines Interface-Kontrakts ist, ob Templates betroffen sind. Risikoabschätzung vor dem Umbau. |
| `generate_auto_fixes` | Erstellt konkrete Before/After-Fixes: Angular (@Input→input(), *ngIf→@if, \| async→toSignal(), OnPush), .NET (.Result→await, fehlende CancellationToken, null-Guards). |
| `analyze_dataflow` | Verfolgt wie Daten zwischen Klassen fließen — findet nullable Rückgabewerte die ohne Null-Check weiterverwendet werden, nicht-awaitete Tasks, unsubscribed Observables. |
| `analyze_advanced_all` | Führt alle 7 obigen Analysen in einem Aufruf aus und liefert einen Gesamtbericht. |

## ④ Klassen-Schnitt

| Tool | Was es tut |
|------|------------|
| `suggest_class_splits` | Berechnet LCOM-Score (Kohäsion), findet Methoden-Cluster via Union-Find, erstellt eine Field-Access-Map und schlägt konkrete Splits vor — mit neuen Klassennamen und Methoden-Zuteilung. Urgency: none / low / medium / high / critical. |

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
| `analyze_test_health` | Kombiniert Coverage-Report und Test-Qualität in einem Dashboard — zeigt priorisiert was zuerst angegangen werden sollte. |

## Wichtige Parameter

- `projectPath` = Wurzelverzeichnis des Projekts
- `type` = `"angular"` oder `"dotnet"` (oder `"auto"` für automatische Erkennung)
- `filePath` = absoluter oder relativer Pfad zur Datei
- Kein Build nötig für 20 der 23 Tools — nur die Coverage-Tools brauchen einen vorherigen Test-Run
