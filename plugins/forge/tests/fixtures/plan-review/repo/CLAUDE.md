# Bestellsystem — Projektregeln

- Datenzugriff nur über Repository-Klassen in `src/<bereich>/<name>-repository.js`. Services greifen nie direkt auf Dateien oder `fs` zu.
- Tests liegen unter `test/`, gespiegelt zu `src/`.
- Tests laufen ausschließlich über das MCP-Tool `dev-mcp: run_node_tests` mit dem Parameter `test_path`. `node --test` in der Shell ist verboten.
