# dev-mcp Fehlerdiagnose

| Symptom | Ursache | Maßnahme |
|---------|---------|----------|
| `Path not allowed` | Pfad außerhalb AllowedDirectories | `AllowedDirectories` in `C:\Develop\.apps\dev-mcp\appsettings.json` ergänzen |
| `File not found: C:\...` | Pfad falsch oder Datei fehlt | Pfad prüfen, kein Retry mit demselben Format |
| `file_path is required` | Key fehlt | `file_path` setzen |
| `Source file not found` | `scaffold_spec_for` / `rename_file` Quelle fehlt | Quellpfad prüfen |
| `Spec file already exists` | Spec existiert bereits | `force: true` oder `read_file_raw` + Agent-Edit |
| `Test class file already exists` | Testklasse existiert bereits | `read_file_raw` → Agent-Edit |
| Build/Test schlägt fehl | Fehler in `errors[]` | `errors[]`-Array auswerten |
| Scaffolding-Fehler | `error` (String, kein Array) | `error`-Feld auswerten |
| MCP nicht in Tool-Liste | exe nicht gestartet / `claude.json` falsch | → BLOCKER melden |
| `git mv` schlägt fehl | Nicht in Git-Repo oder Pfad außerhalb Repo | `repo_root` prüfen, `git status` vorab |

**MCP-Serverinfos:**
- Log-Viewer: `http://localhost:5050/` — `GET /api/calls` (max 200 Einträge)
- Exe: `C:\Develop\.apps\dev-mcp\Dev.Mcp.exe`
- Config: `C:\Develop\.apps\dev-mcp\appsettings.json` (AllowedDirectories)
