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

**Relevante Tools:** `analyze_coverage` · `analyze_test_quality` · `analyze_test_health` · `analyze_duplicates` · `review_with_index` · `review_files_batch` · `analyze_advanced_all`

**Gewinn:** Vollständiges Qualitätsbild — was ist getestet, was ist gut getestet, was fehlt noch vor dem Merge.

> `analyze_coverage` und `analyze_test_health` benötigen einen vorherigen Test-Run mit Coverage-Flag:
> Angular: `ng test --code-coverage` · .NET: `dotnet test --collect:"XPlat Code Coverage"`
