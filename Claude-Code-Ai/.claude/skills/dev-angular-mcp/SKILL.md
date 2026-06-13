---
name: dev-angular-mcp
description: >
  Kanon für MCP dev-angular-mcp: Angular-Scaffolding und Build/Test.
  Trigger: scaffold_angular_component, scaffold_angular_service, ng generate,
  neue Komponente, neuer Service, build_angular_project, test_angular_project,
  ng build, ng test, Angular bauen, Angular testen.
  Parameter project_root als /workspace/... Pfad (Volume-Mount).
  Nicht für Code-Lesen — dev-filesystem-mcp; nicht für Review — codebase-analyzer.
when_to_use: >
  Aktiviere für Angular-Scaffolding (Komponenten, Services) und Angular Build/Test via MCP.
  build_angular_project und test_angular_project ersetzen ng build / ng test als Shell-Kommandos
  vollständig — MCPs filtern intern und liefern errors[], warnings[], summary.
  Bei MCP nicht erreichbar: BLOCKER melden, kein stiller Shell-Fallback.
---

## MCP-FIRST — Build/Test (Hard Gate)

**`ng build` und `ng test` laufen via diesen MCP — niemals als Shell-Kommando wenn verfügbar.**

| Verboten | Richtig |
|----------|---------|
| Shell: `ng build` | `build_angular_project` (dev-angular-mcp) |
| Shell: `ng test` | `test_angular_project` (dev-angular-mcp) |
| `build-log-filter` für ng build / ng test wenn MCP verfügbar | MCPs filtern intern — `errors[]` direkt auswerten |

**Hard Stop — MCP nicht erreichbar:**

> **`BLOCKER: dev-angular-mcp nicht erreichbar`**
> - Kein stiller Fallback auf Shell + build-log-filter
> - Nutzer informieren (Docker? MCP aktiv? Image gebaut? Port 8092 erreichbar?)
> - Erst nach **expliziter Nutzerfreigabe**: Shell-Fallback + build-log-filter

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## MCP-Pfad-Kanon (Pflicht)

- Alle Pfade mit `/workspace/` Prefix — Container-Absolutpfade
- **VERBOTEN:** `C:\`, Host-Pfade, IDE-relative Pfade, `{parameter}`-Platzhalter
- `project_root does not exist` = falscher Pfad-Prefix → `/workspace/` setzen
- Mount: `${workspaceFolder}:/workspace` (read-write)

---

## MCP dev-angular-mcp — Server und Tools

**Server:** `dev-angular-mcp` (Docker, Port 8092)
**Volume-Mount:** `${workspaceFolder}:/workspace` (read-write)

| Tool | Zweck |
|------|-------|
| `scaffold_angular_component` | `ng generate component` — Default `--standalone --skip-tests` |
| `scaffold_angular_service` | `ng generate service` — Default `--skip-tests` |
| `build_angular_project` | `ng build` — gibt `{success, errors[], warnings[], summary}` zurück |
| `test_angular_project` | `ng test --watch=false` — gibt `{success, errors[], summary}` zurück |

**Wichtig:** `build_angular_project` und `test_angular_project` filtern den rohen Konsolen-Output intern.
Agents erhalten ausschließlich strukturierte Daten (`errors[]`, `warnings[]`, `summary`) — niemals Raw-stdout/stderr.
**Kein** `build-log-filter` für diese Kommandos nötig oder erlaubt.

---

## Parameter (verbindlich)

| Parameter | Verwendung |
|-----------|------------|
| `project_root` | Container-Pfad zum Angular-Root (`angular.json`), z. B. `/workspace/src/frontend` |
| `name` | Komponenten-/Service-Name (kebab-case empfohlen) |
| `path` | Optional: ng `--path` (relativ zu `project_root`) |
| `configuration` | Optional: `--configuration` für Build (z. B. `production`) |
| `options` | Optional: CLI-Flags für Scaffolding oder Test |

### Nicht verwenden

| Falsch | Richtig |
|--------|---------|
| `C:\Develop\...` oder `/home/user/...` | `/workspace/...` |
| `file_path` / `filePath` | `project_root` |
| Host-Absolutpfad | Container-Pfad unter `/workspace` |

---

## JSON-Beispiele

### scaffold_angular_component

```json
{
  "project_root": "/workspace/src/frontend",
  "name": "user-profile",
  "path": "src/app/users",
  "options": "--change-detection OnPush --style scss"
}
```

### scaffold_angular_service

```json
{
  "project_root": "/workspace/src/frontend",
  "name": "user",
  "path": "src/app/users"
}
```

### build_angular_project

```json
{
  "project_root": "/workspace/src/frontend",
  "configuration": "production"
}
```

### test_angular_project

```json
{
  "project_root": "/workspace/src/frontend"
}
```

---

## Build/Test-Ergebnis auswerten

MCPs liefern strukturierte Daten — direkt auswerten:

- `success: true` → Build/Test erfolgreich
- `errors[]` → Array der Fehler mit Datei, Zeile, Meldung
- `warnings[]` → Array der Warnungen
- `summary` → Kurzübersicht (Anzahl Tests, Coverage-Hinweis etc.)

**Compliance-Nachweis im Abschlussbericht:**
```
Build/Test: MCP-Tool build_angular_project OK (success=true, 0 errors)
MCP-Build/Test eingehalten: ja
```

---

## Fehlerdiagnose

| Symptom | Ursache | Maßnahme |
|---------|---------|----------|
| `project_root is required` | Key fehlt | `/workspace/...` Pfad setzen |
| `project_root does not exist` | Pfad falsch oder falsches Präfix | Pfad mit `/workspace/` beginnen lassen |
| Build/Test schlägt fehl | Fehler in `errors[]` | `errors[]`-Array auswerten |
| Invoke-Fehler ohne klare Meldung | Falscher Parameter-Key | Schema lesen, MCP-Deskriptor konsultieren |
| MCP nicht in Tool-Liste | Docker/MCP nicht aktiv | BLOCKER melden |

---

## Abgrenzung

- **dev-filesystem-mcp:** Bestehenden Code lesen (`/project/...`)
- **build-log-filter:** Rohen Log-Output filtern — nur für `ng serve`/`npm start` oder Shell-Fallback nach BLOCKER
- **Routing:** dev-tooling-mcp Router-Skill

Log-UI: Port **8092** — `GET /api/calls`

Weiterführende Dokumentation: `docs/mcp-dev-angular.md`

dev-tooling-mcp Constraints für Angular:
- `ng build` / `ng test` immer via `build_angular_project` / `test_angular_project` wenn MCP verfügbar
- Kein `build-log-filter` für MCP-gesteuerte Läufe
- Shell-Fallback nur nach expliziter BLOCKER-Freigabe

## Opt-out

`kein dev-angular-mcp`, `skip-dev-angular-mcp` → diesen Skill nicht laden.
