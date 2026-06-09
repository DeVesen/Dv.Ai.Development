# Die drei Phasen

## PLANUNG — bevor Code geschrieben wird

**Signale:** "Ich will bauen…", "Wir planen…", "Wie gehe ich das an?", "Ich will X ändern…"

**Relevante Tools:** `index_project` · `find_in_index` · `suggest_class_splits` · `analyze_refactoring_safety` · `analyze_type_graph` · `analyze_maintainability_index` · `analyze_dataflow`

**Gewinn:** Weiß vor dem ersten Tastendruck was vorhanden ist, was bricht und wie der beste Schnitt aussieht.

## IMPLEMENTIERUNG — während oder direkt nach dem Schreiben

**Signale:** "Schau dir das an…", "Ist das okay?", "Vor dem Commit…", "Hier mein Code…"

**Relevante Tools:** `review_file` · `review_code` · `review_git_diff` · `review_files_batch` · `analyze_nullability` · `analyze_complexity` · `generate_auto_fixes` · `analyze_control_flow` · `analyze_dead_code` · `analyze_ast_only`

**Gewinn:** Sofortiges Feedback wie ein erfahrener Kollege — mit konkreten Fixes, nicht nur Hinweisen.

## NACH IMPLEMENTIERUNG — nach Tests und vor dem Merge

**Signale:** "Tests laufen durch…", "Feature ist fertig…", "Vor dem Merge…", "Sprint-End…", "Release…"

**Relevante Tools:** `detect_untested_public_api` · `analyze_coverage` · `analyze_test_quality` · `analyze_test_health` · `analyze_duplicates` · `review_with_index` · `analyze_advanced_all`

> `review_files_batch` ist primär der Implementierungsphase zugeordnet (siehe oben); es kann in der Nach-Implementierung optional erneut für alle Feature-Dateien auf einmal genutzt werden, zählt aber zur Implementierungs-Toolliste.

**Gewinn:** Vollständiges Qualitätsbild — was ist getestet, was ist gut getestet, was fehlt noch vor dem Merge.

> **Erster Check nach der Implementierung:** `detect_untested_public_api` (Heuristik, kein Test-Run) — listet neu hinzugekommene public-Symbole ohne erkennbare Test-Referenz. Vor `analyze_test_quality` ausführen, um Lücken sichtbar zu machen, bevor die Qualität der vorhandenen Tests bewertet wird.

> `analyze_coverage` und `analyze_test_health` benötigen einen vorherigen Test-Run mit Coverage-Flag:
> Angular: `ng test --code-coverage` · .NET: `dotnet test --collect:"XPlat Code Coverage"`
