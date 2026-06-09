# Installation & Update

Wie die AI-Skills-Bibliothek in ein Projekt deployed und aktualisiert wird.

---

## Voraussetzungen

- Git-Repository mit diesem Repo (oder Download des `AI-Skills/`-Verzeichnisses)
- Ziel-Projekt mit vorhandenen Verzeichnissen `.cursor/` und/oder `.claude/`
- Windows: PowerShell 7+ / Linux/macOS: Bash

---

## Übersicht: Was passiert beim Deploy?

```
Dv.Ai.Development/AI-Skills/     →    Ziel-Projekt/
                                       ├── .cursor/
                                       │   ├── rules/         ← .mdc-Rules (Cursor only)
                                       │   ├── skills/        ← Skill-Pakete
                                       │   ├── agents/        ← Agent-Profile
                                       │   ├── references/    ← Shared refs
                                       │   ├── mcp.json       ← MCP-Konfiguration
                                       │   └── AGENTS.md      ← Paket-Referenz
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

> **ADO-Paket:** Das Skript fragt interaktiv, ob das ADO-Paket installiert werden soll (Azure DevOps ist optional).

### Schritt 3: Update (bestehende Installation)

```powershell
.\AI-Skills\update-cursor-skills.ps1 C:\path\to\project\.cursor C:\path\to\project\.claude
```

Das Update-Skript:
- Liest `installed-manifest.json` im Zielverzeichnis
- Ersetzt veränderte Dateien
- Entfernt veraltete Dateien, die nicht mehr im Paket sind
- Fragt interaktiv nach `{param}`-Platzhaltern
- Berührt die MCP-Konfiguration **nicht**

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

---

## Platzhalter ersetzen

Einige Pakete enthalten `{param}`-Platzhalter, die nach dem Deploy manuell ersetzt werden müssen (Windows: `update-cursor-skills.ps1` macht das interaktiv).

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
| `{workspace-root}` | Root-Verzeichnis des Workspace |
| `{ado-organization}` | Azure DevOps Organisations-URL |

---

## MCP-Server konfigurieren

Die `mcp.json` wird beim Deploy in `.cursor/mcp.json` abgelegt. Für Claude Code muss sie separat in die Claude-Konfiguration eingebunden werden.

**Wichtig:** Zwei Server benötigen ein **Volume-Mount** auf das Ziel-Projekt:

```jsonc
// codebase-analyzer — mount auf /workspace
"-v", "${workspaceFolder}:/workspace:ro"

// dev-filesystem-mcp — mount auf /project + env-Variable
"-v", "${workspaceFolder}:/project:ro",
"-e", "PROJECT_ROOT=/project"
```

Ohne Volume-Mount können diese Server keine Dateien des Projekts lesen.

---

## Troubleshooting

**`installed-manifest.json` fehlt**
→ Erste Installation mit `install-cursor-skills.ps1` ausführen. Das Manifest wird dabei angelegt.

**Platzhalter wurden nicht ersetzt**
→ `update-cursor-skills.ps1` erneut ausführen — es fragt nach allen offenen `{param}`-Werten.

**MCP-Server antwortet nicht**
→ Docker läuft? `docker ps` prüfen. Port frei? `netstat -an | findstr 8090` (Windows).

**Codebase-Analyzer findet keine Dateien**
→ Volume-Mount prüfen: `-v ${workspaceFolder}:/workspace:ro` muss auf das richtige Verzeichnis zeigen.
