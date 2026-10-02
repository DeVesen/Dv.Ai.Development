# dev-mcp Fehlerdiagnose

| Symptom | Ursache | Maßnahme |
|---------|---------|----------|
| `Path not allowed` | Pfad außerhalb AllowedDirectories | `AllowedDirectories` in `C:\Develop\.apps\dev-mcp\appsettings.json` ergänzen |
| `File not found: C:\...` | Pfad falsch oder Datei fehlt | Pfad prüfen, kein Retry mit demselben Format |
| `file_path is required` | Key fehlt | `file_path` setzen |
| `Source file not found` | `rename_file` Quelle fehlt | Quellpfad prüfen |
| Build/Test schlägt fehl | Fehler im Befehl `dv-<stack>-<kommando>` | Fehlerliste auswerten, volles Log unter `Log:` |
| MCP nicht in Tool-Liste | exe nicht gestartet / `claude.json` falsch | → BLOCKER melden |
| `git mv` schlägt fehl | Nicht in Git-Repo oder Pfad außerhalb Repo | `repo_root` prüfen, `git status` vorab |

**MCP-Serverinfos:**
- Log-Viewer: `http://localhost:5050/` — `GET /api/calls` (max 200 Einträge)
- Exe: `C:\Develop\.apps\dev-mcp\Dev.Mcp.exe`
- Config: `C:\Develop\.apps\dev-mcp\appsettings.json` (AllowedDirectories)
