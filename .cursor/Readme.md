# .cursor — Portable Agent Infrastructure

Dieses Verzeichnis enthält eine portable Agenten-Infrastruktur: Rules, Skills, Agent-Profile und Referenzen, die in beliebige Repositories übertragen werden können.

## Portierung auf ein neues Projekt

### 1. Verzeichnis kopieren

Das gesamte `.cursor/`-Verzeichnis in das Ziel-Repository kopieren.

### 2. Konfigurierbare Parameter belegen

Jede Datei unter `agents/`, `rules/` und `skills/` listet ihre konfigurierbaren Parameter in einem `## Parameter`-Abschnitt am Dateianfang.

**Häufige Parameter:**

| Parameter | Bedeutung | Beispielwert |
|-----------|-----------|-------------|
| `{code-root}` | Wurzelpfad des Code-Repositories | `my-project/` |
| `{frontend-path}` | Frontend-Projektpfad | `my-project/src/frontend` |
| `{backend-path}` | Backend-Projektpfad | `my-project/src/backend` |
| `{agent-index}` | Datei mit Agentenübersicht | `AGENTS.md` |
| `{verification-commands}` | Datei mit Verifikationsbefehlen für Agents | `.github/copilot-instructions.md` |
| `ADO.Organisation` | Azure DevOps Organisation | `MeineFirma` |
| `ADO.Project-GUID` | Azure DevOps Projekt-GUID | `42a6dde2-...` |
| `{component-prefix}` | Angular Komponenten-Präfix (kebab/camelCase) | `app` |
| `{ComponentPrefix}` | Angular Komponenten-Präfix (PascalCase) | `App` |
| `{database-project}` | EF-Datenbankprojekt-Name | `MyApp.Database` |
| `{startup-project}` | Startprojekt mit `db.Database.Migrate()` | `MyApp.Api` |
| `{DbContext}` | DbContext-Basisname | `AppDb` |

### 3. Host-spezifische Konfiguration

- **Cursor:** `mcp.json` für MCP-Server (ADO, genericRTK u. a.) anpassen — Vorlage: `skills/ado-requests-stories/config.defaults.json`
- **Agent-Index (`{agent-index}`):** Eine Datei (z. B. `AGENTS.md`) im Repository-Root anlegen, die alle verfügbaren Agenten-Typen und ihre Trigger kurz beschreibt.
- **Verifikationsbefehle (`{verification-commands}`):** Eine Datei (z. B. `.github/copilot-instructions.md`) anlegen mit den Abschnitten `Agents — mandatory verification after changes` für Build/Test-Befehle pro Stack.

### 4. Stack-Konfiguration

Das System kennt zwei primäre Stacks:

- **Frontend** (`{frontend-path}`) — z. B. Angular, React, Vue
- **Backend** (`{backend-path}`) — z. B. .NET, Java, Go; kann bei mehreren unabhängigen Build-Einheiten (eigenständige Projekte/Module mit eigenem Build-Target) aufgeteilt werden

### 5. ADO-Skills (optional)

Nur relevant wenn Azure DevOps genutzt wird:
- `skills/ado-requests-stories/config.defaults.json` mit `defaultProject` (GUID) befüllen
- MCP-Server `ado` in `mcp.json` konfigurieren

## Verzeichnisstruktur

```
.cursor/
├── agents/            # Agent-Profile (implement-agent, verify-agent, plan-agent, …)
├── packages/          # Skill-Package-Manifeste (.json) + install-skill.ps1
├── references/        # Geteilte Referenzdokumente (Modellauswahl, …)
├── rules/             # alwaysApply-Rules (Trigger, Output-Filter, …)
└── skills/            # Workflow-Skills (implementation, planning, ado-requests, …)
```

## Skill-Packages

Jedes Package bündelt Rule(s), Skill-Ordner, Agent-Profile und geteilte Referenzen, die zusammen installiert werden müssen.

### Verfügbare Packages

| Package | Enthält | Abhängigkeiten |
|---------|---------|----------------|
| `ado-requests-stories` | Rule + Skill + 3 Agents | `buddy-agent` |
| `buddy-agent` | Rule + Agent | `caveman`, `commit-message` |
| `angular-bundle` | Rule + 5 Skills | — |
| `angular-refactor` | Skill | `angular-bundle` |
| `angular-material-custom-input` | Skill | `angular-bundle` |
| `describe-as-prompt` | Rule + Skill | — |
| `describe-as-html-prompt` | Rule + Skill | `describe-as-prompt` |
| `genericrtk-filter` | Rule | — |
| `implementation-workflow` | Rule + Skill + 2 Agents | `genericrtk-filter` |
| `planning-workflow` | Rule + Skill + 6 Agents | — |
| `backend-ef-migrations` | Rule + Skill | — |

### Package installieren

```powershell
# Einzelnes Package (mit Abhängigkeiten) in ein Zielprojekt kopieren
.\.cursor\install-skill.ps1 planning-workflow C:\Projects\MyApp\.cursor

# Vorschau ohne Dateikopie
.\.cursor\install-skill.ps1 planning-workflow C:\Projects\MyApp\.cursor -DryRun

# Alle verfügbaren Packages anzeigen
.\.cursor\install-skill.ps1 -List
```

Abhängigkeiten werden automatisch zuerst installiert. Bereits installierte Packages werden nicht doppelt kopiert.

## Dateien unter `.cursor/` (Root)

Dateien direkt im `.cursor/`-Root (z. B. `cursor-agent-starter-pack.md`, `porting-checklist.md`) sind **projektspezifische Hilfsdokumente** aus dem Ursprungsprojekt — sie werden durch diese `Readme.md` und die `## Parameter`-Abschnitte in den Einzeldateien ersetzt und können nach der Portierung gelöscht werden.
