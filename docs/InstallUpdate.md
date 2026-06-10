# Installation & Update

Wie die AI-Skills-Bibliothek in ein Projekt deployed und aktualisiert wird.

---

## Voraussetzungen

**Für die Skills (immer):**
- Git-Repository mit diesem Repo (oder Download des `AI-Skills/`-Verzeichnisses)
- Ziel-Projekt mit vorhandenen Verzeichnissen `.cursor/` und/oder `.claude/`
- Windows: PowerShell 7+ / Linux/macOS: Bash

**Für die MCP-Server (zusätzlich):**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installiert und gestartet
- Windows: Docker muss im **Linux-Container-Modus** laufen (Standard bei Docker Desktop)
- Internetverbindung für den ersten `docker pull` der Images

> **Skills funktionieren auch ohne MCP-Server.** Die MCP-Server sind ergänzend — ohne sie stehen Analyse- und Scaffolding-Tools nicht zur Verfügung, aber alle Skills laufen weiterhin.

---

## Übersicht: Was passiert beim Deploy?

```
Dv.Ai.Development/AI-Skills/     →    Ziel-Projekt/
                                       ├── .cursor/
                                       │   ├── rules/         ← .mdc-Rules (Cursor only)
                                       │   ├── skills/        ← Skill-Pakete
                                       │   ├── agents/        ← Agent-Profile
                                       │   ├── references/    ← Shared refs (inkl. verification-commands.md)
                                       │   ├── skill-params.json
                                       │   └── mcp.json       ← MCP-Konfiguration
                                       └── .claude/
                                           ├── skills/        ← Skill-Pakete
                                           ├── agents/        ← Agent-Profile
                                           └── references/    ← Shared refs
```

---

## Windows — PowerShell

### Schritt 1: Verfügbare Pakete anzeigen

```powershell
.\AI-Skills\install-cursor-skills.ps1 -List
```

### Schritt 2: Deployen

```powershell
# Cursor + Claude Code (empfohlen)
.\AI-Skills\install-cursor-skills.ps1 C:\path\to\project\.cursor C:\path\to\project\.claude

# Nur Cursor
.\AI-Skills\install-cursor-skills.ps1 C:\path\to\project\.cursor

# Vorschau ohne Kopieren (Dry-Run)
.\AI-Skills\install-cursor-skills.ps1 C:\path\to\project\.cursor C:\path\to\project\.claude -DryRun
```

> **ADO-Paket:** Das Skript fragt interaktiv, ob das ADO-Paket installiert werden soll (Azure DevOps ist optional). Wird ADO abgelehnt, werden **keine** ADO-spezifischen Platzhalter (z. B. `{devops-pipelines-path}`) und kein ADO-MCP abgefragt.

> **Deploy-Parameter:** Nach der Paketauswahl fragt das Skript fehlende `{param}`-Platzhalter ab (z. B. `{code-root}`, `{frontend-path}`, `{backend-path}`) und ersetzt sie in den deployten Dateien. Werte werden in `.cursor/skill-params.json` gespeichert. Fest gesetzt **ohne** Abfrage: `{workspace-root}` = `.`, `{agent-index}` = `./AGENTS.md`, `{insights-path}` = `./insights`, `{verification-commands}` = `.cursor/references/verification-commands.md`. **`Readme.md`** wird **nicht** nach `.cursor/` kopiert.

### Schritt 3: Update (bestehende Installation)

```powershell
.\AI-Skills\update-cursor-skills.ps1 C:\path\to\project\.cursor C:\path\to\project\.claude
```

Das Update-Skript:
- Liest `installed-manifest.json` im Zielverzeichnis
- Ersetzt veränderte Dateien
- Entfernt veraltete Dateien, die nicht mehr im Paket sind
- Fragt interaktiv nach **neuen oder leeren** `{param}`-Platzhaltern (bestehende Werte aus `skill-params.json` bleiben erhalten)
- Setzt fest **ohne Abfrage:** `{workspace-root}` = `.`, `{agent-index}` = `./AGENTS.md`, `{insights-path}` = `./insights`, `{verification-commands}` = `.cursor/references/verification-commands.md`
- Entfernt legacy `.cursor/Readme.md` (wird nicht mehr deployt)
- ADO-Parameter nur, wenn das Paket `ado-requests-stories` im Manifest geführt wird
- Aktualisiert MCP-Konfiguration für Pakete mit `mcp`-Eintrag (Image-Auswahl wie bei der Erstinstallation)

---

## Linux / macOS — Bash

### Schritt 1: Verfügbare Pakete anzeigen

```bash
./AI-Skills/install-skill.sh --list
```

### Schritt 2: Deployen

```bash
# Cursor + Claude Code
./AI-Skills/install-skill.sh all /path/to/project/.cursor /path/to/project/.claude

# Nur Cursor
./AI-Skills/install-skill.sh all /path/to/project/.cursor

# Einzelnes Paket
./AI-Skills/install-skill.sh planning-workflow /path/to/project/.cursor /path/to/project/.claude

# Dry-Run (Zielverzeichnisse müssen nicht existieren)
./AI-Skills/install-skill.sh all /path/to/project/.cursor /path/to/project/.claude --dry-run
```

### Schritt 3: Update

```bash
# Re-Install ersetzt alle vorhandenen Dateien
./AI-Skills/install-skill.sh all /path/to/project/.cursor /path/to/project/.claude
```

> **Hinweis:** Im Gegensatz zum Windows-Skript entfernt `install-skill.sh` **keine** veralteten Dateien aus vorherigen Installationen. Dateien die aus dem Paket entfernt wurden bleiben bestehen und müssen ggf. manuell gelöscht werden.

---

## Platzhalter ersetzen

Windows (PowerShell): **`install-cursor-skills.ps1`** und **`update-cursor-skills.ps1`** fragen fehlende `{param}`-Werte interaktiv ab und ersetzen sie in Skills, Rules, Agents und References. Gespeichert wird in `.cursor/skill-params.json`.

- **Erstinstallation:** Platzhalter-Abfrage erfolgt **nach** der Paketauswahl (inkl. optional ADO), **unabhängig** davon, welche MCP-Pakete dabei sind.
- **Update:** Nur **neue oder leere** Parameter werden abgefragt; vorhandene Werte in `skill-params.json` bleiben (Enter = behalten).
- **Fest gesetzt (ohne Abfrage):** `{workspace-root}` = `.`, `{agent-index}` = `./AGENTS.md`, `{insights-path}` = `./insights`, `{verification-commands}` = `.cursor/references/verification-commands.md`
- **`{code-root}`:** Wird abgefragt — oft identisch mit `{workspace-root}` (`.`), kann abweichen (z. B. `src` wenn Git-Root unterhalb des Workspace liegt)

### Welche Parameter braucht ein Paket?

```bash
# In der package-JSON nachsehen
cat AI-Skills/packages/planning-workflow.json | grep -A 10 '"params"'
```

### Platzhalter im Deploy finden

```bash
# Linux/macOS
grep -r '{frontend-path}' /path/to/project/.cursor/

# Windows PowerShell
Select-String -Path "C:\project\.cursor\**\*" -Pattern '\{frontend-path\}' -Recurse
```

### Häufige Platzhalter

| Platzhalter | Bedeutung |
|-------------|-----------|
| `{frontend-path}` | Pfad zum Angular-Frontend-Verzeichnis |
| `{backend-path}` | Pfad zum .NET-Backend-Verzeichnis |
| `{workspace-root}` | **Fest `.`** — Cursor-Workspace-Root |
| `{code-root}` | Wurzelpfad des Git-Repositories (Code); oft `.`, ggf. abweichend (z. B. `src`) |
| `{agent-index}` | **Fest `./AGENTS.md`** — Agentenübersicht im Workspace-Root |
| `{verification-commands}` | **Fest `.cursor/references/verification-commands.md`** — Build/Test-Befehle (Inhalt anpassen) |
| `{insights-path}` | **Fest `./insights`** — Conversation-Insights-Log |
| `{devops-pipelines-path}` | Nur bei installiertem ADO-Paket |

---

## MCP-Server konfigurieren

### Cursor

Beim Install/Update schreiben `install-cursor-skills.ps1` bzw. `update-cursor-skills.ps1` die `.cursor/mcp.json` **packageweise** aus den `"mcp"`-Blöcken in `AI-Skills/packages/*.json` (Image-Auswahl und `--pull always` interaktiv bzw. aus `.cursor/skill-params.json`).

`AI-Skills/mcp.json` ist die **Referenz** für das Zielbild aller Server (Ports, Volume-Mounts, `autoApprove`) — sie wird **nicht** 1:1 kopiert. Änderungen an MCP-Args gehören in das jeweilige Package-Manifest (z. B. `packages/codebase-analyzer.json`), danach `mcp.json` als Referenz synchron halten.

Cursor lädt `.cursor/mcp.json` automatisch beim nächsten Start.

### Claude Code

Für Claude Code muss der Inhalt von `mcp.json` manuell in die Claude-Konfigurationsdatei eingetragen werden:

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json` (Claude Desktop) oder `.claude/settings.json` im Projekt
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

Den `"mcpServers"`-Block aus `AI-Skills/mcp.json` in die entsprechende Datei einfügen (oder zusammenführen falls bereits vorhanden).

### ADO-MCP konfigurieren

Die `mcp.json` enthält auch einen `ado`-Eintrag für Azure DevOps. Der Platzhalter `<IhreOrganisation>` muss durch die eigene ADO-Organisations-URL ersetzt werden:

```jsonc
"ado": {
  "command": "npx",
  "args": ["-y", "@azure-devops/mcp", "meine-organisation", "-d", "core", "work", "work-items"]
}
```

Falls ADO nicht verwendet wird, kann dieser Eintrag entfernt werden.

### Log-Viewer-Ports

Jeder Docker-MCP startet einen internen HTTP-Log-Viewer (nicht MCP-Transport). Host-Port muss in den Docker-`args` gemappt sein, sonst ist die UI nur im Container erreichbar:

| Server | Host-Port | Package |
|--------|-----------|---------|
| build-log-filter | 8089 | `packages/build-log-filter.json` |
| codebase-analyzer | 8090 | `packages/codebase-analyzer.json` |
| dev-filesystem-mcp | 8091 | `packages/dev-filesystem-mcp.json` |
| dev-angular-mcp | 8092 | `packages/dev-angular-mcp.json` |
| dev-dotnet-mcp | 8093 | `packages/dev-dotnet-mcp.json` |

Beispiel (codebase-analyzer): `"-p", "127.0.0.1:8090:8090"` in `entry` und `entryPullAlways` — danach `http://127.0.0.1:8090/` im Browser.

### Volume-Mounts

Zwei Server benötigen ein **Volume-Mount** auf das Ziel-Projekt (damit der Container Projektdateien lesen kann — Docker-Container haben keinen Host-Dateisystemzugriff ohne explizites Mount):

```jsonc
// codebase-analyzer — liest Projektdateien für AST-Analyse (+ Log-Port 8090)
"-p", "127.0.0.1:8090:8090",
"-v", "${workspaceFolder}:/workspace:ro"

// dev-filesystem-mcp — liest .cs/.ts token-effizient (+ Log-Port 8091)
"-p", "127.0.0.1:8091:8091",
"-v", "${workspaceFolder}:/project:ro",
"-e", "PROJECT_ROOT=/project"
```

`dev-angular-mcp` und `dev-dotnet-mcp` benötigen **keinen** Mount — sie erhalten absolute Pfade als Parameter und schreiben direkt aufs Host-Dateisystem via `ng generate` / `dotnet new`.

---

## Troubleshooting

**`installed-manifest.json` fehlt**
→ Erste Installation mit `install-cursor-skills.ps1` ausführen. Das Manifest wird dabei angelegt.

**Platzhalter wurden nicht ersetzt**
→ `install-cursor-skills.ps1` (Neuinstallation) oder `update-cursor-skills.ps1` erneut ausführen — beide fragen offene `{param}`-Werte ab. Prüfen, ob `.cursor/skill-params.json` die erwarteten Einträge enthält.

**MCP-Server antwortet nicht**
→ Docker installiert und gestartet? `docker ps` prüfen. Beim ersten Start muss das Image gepullt werden — Internetverbindung erforderlich.

**Codebase-Analyzer findet keine Dateien**
→ Volume-Mount prüfen: `-v ${workspaceFolder}:/workspace:ro` muss auf das Projektverzeichnis zeigen. Auf Windows sicherstellen, dass `${workspaceFolder}` als absoluter Pfad mit Forward-Slashes übergeben wird (z.B. `/c/Users/...` statt `C:\...`).

**Docker-Image kann nicht gepullt werden**
→ Internetverbindung prüfen. Alternativ lokal bauen: `docker build -t devesen/<server>-mcp:latest .` im jeweiligen `Mcp-Servers/<Name>/`-Verzeichnis.

**`dev-angular-mcp` / `dev-dotnet-mcp` schreibt keine Dateien**
→ Sicherstellen, dass der übergebene Pfad ein **absoluter Pfad** auf dem Host ist und der Agent-Aufruf das richtige Zielverzeichnis enthält. Diese Server benötigen keinen Volume-Mount — sie nutzen `ng generate` / `dotnet new` als Subprocess mit dem übergebenen Pfad.
