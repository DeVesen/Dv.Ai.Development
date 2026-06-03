# Skill Packages

Jedes Package bündelt alle Dateien, die für ein Feature zusammen installiert werden müssen:
Rule (`.mdc`), Skill-Ordner, Agent-Profile und geteilte Referenzen.

## Installation

```powershell
# Package installieren (Abhängigkeiten werden automatisch mitgezogen)
.\.cursor\install-skill.ps1 <package-name> <ziel\.cursor-pfad>

# Alle Packages auf einmal installieren
.\.cursor\install-skill.ps1 all <ziel\.cursor-pfad>

# Update (frische Dateien, bereits gesetzte Parameter werden erhalten)
.\.cursor\update-skill.ps1 <package-name> <ziel\.cursor-pfad>

# Alle Packages auf einmal aktualisieren
.\.cursor\update-skill.ps1 all <ziel\.cursor-pfad>

# Alle verfügbaren Packages anzeigen
.\.cursor\install-skill.ps1 -List
```

---

## Packages

### `planning-workflow`

Sechsphasiger Planungs-Workflow mit Scout-, Topic-Planer- und Drei-Perspektiven-Review-Subagents.

| Was | Dateien |
|-----|---------|
| Rule | `rules/planning-workflow-skill.mdc` |
| Skill | `skills/planning-workflow/` |
| Agents | `plan-agent`, `plan-agent-scout`, `plan-agent-topic-planner`, `plan-agent-optimist`, `plan-agent-pessimist`, `plan-agent-normalo` |
| Referenz | `references/subagent-model-before-task.md` |

| Parameter | Bedeutung | Beispiel |
|-----------|-----------|---------|
| `{agent-index}` | Datei mit Agentenübersicht im Ziel-Repo | `AGENTS.md` |
| `{verification-commands}` | Datei mit Build/Test-Befehlen | `.github/copilot-instructions.md` |

---

### `implementation-workflow`

Agent-Modus Umsetzungs-Workflow: Implementierungs-Subagents (Slices), Hard Gate, Verifikations-Subagents pro Stack.

| Was | Dateien |
|-----|---------|
| Rule | `rules/implementation-workflow-skill.mdc` |
| Skill | `skills/implementation-workflow/` |
| Agents | `implement-agent`, `verify-agent` |
| Referenz | `references/subagent-model-before-task.md` |
| Abhängigkeit | `genericrtk-filter` |

| Parameter | Bedeutung | Beispiel |
|-----------|-----------|---------|
| `{agent-index}` | Datei mit Agentenübersicht | `AGENTS.md` |
| `{verification-commands}` | Datei mit Build/Test-Befehlen | `.github/copilot-instructions.md` |

---

### `genericrtk-filter`

Output-Filter für genericRTK MCP. Pflicht bei jedem Build/Test-Shell-Lauf im Agent-Modus.
Wird automatisch als Abhängigkeit von `implementation-workflow` installiert.

| Was | Dateien |
|-----|---------|
| Rule | `rules/genericrtk-output-filter.mdc` |

Keine Parameter.

---

### `ado-requests-stories`

Synchronisiert Azure DevOps Work Items mit Markdown-Artefakten unter `requests/stories/`.
Unterstützt `prüfe Feature/Story/Task`, Task schließen, ToDos, `active`/`resolved`.

| Was | Dateien |
|-----|---------|
| Rule | `rules/ado-skill.mdc` |
| Skill | `skills/ado/` |
| Agents | `ado-agent`, `ado-story-pruefe-agent`, `ado-task-pruefe-agent` |
| Referenz | `references/subagent-model-before-task.md` |
| Abhängigkeit | `buddy-agent` |

| Parameter | Bedeutung | Beispiel |
|-----------|-----------|---------|
| `ADO.Organisation` | Azure DevOps Organisationsname | `MeineFirma` |
| `ADO.Project-GUID` | Azure DevOps Projekt-GUID | `42a6dde2-...` |
| `{agent-index}` | Datei mit Agentenübersicht | `AGENTS.md` |
| `{devops-pipelines-path}` | Pfad zu DevOps-Pipeline-Definitionen | `pipelines/` |

> Nach der Installation: `skills/ado/config.defaults.json` mit Organisation und Projekt-GUID befüllen.

---

### `buddy-agent`

Read-only Sparring-Agent zur Task-Klärung vor der Planung. Erstellt Plan-Prompts für `plan-agent`.
Wird automatisch als Abhängigkeit von `ado-requests-stories` installiert.

| Was | Dateien |
|-----|---------|
| Rule | `rules/buddy-agent-skill.mdc` |
| Agent | `agents/buddy-agent.md` |
| Abhängigkeit | `caveman`, `commit-message` |

Enthält automatisch:
- **Caveman-Modus** (`full`) für alle Chat-Antworten im Kontext — definiert in der Rule, nicht im Agent-Profil
- **Commit-Message-Skill** — wird bei Commit-Trigger aus dem Gesprächskontext angewendet

Keine eigenen Parameter.

---

### `angular-bundle`

Kern-Angular-Skills: Komponenten, Signals, Routing, Forms, neue App, Cache-Busting.
Basis für alle weiteren `angular-*` Packages.

| Was | Dateien |
|-----|---------|
| Rule | `rules/angular-skills.mdc` |
| Skills | `angular-developer`, `angular-developer-extension`, `angular-new-app`, `angular-new-app-extension`, `angular-cache-busting` |

| Parameter | Bedeutung | Beispiel |
|-----------|-----------|---------|
| `{frontend-path}` | Pfad zum Angular-Projekt | `src/MyApp.Frontend` |
| `{code-root}` | Wurzelpfad des Repositories | `my-project/` |
| `{agent-index}` | Datei mit Agentenübersicht | `AGENTS.md` |
| `{verification-commands}` | Datei mit Build/Test-Befehlen | `.github/copilot-instructions.md` |

---

### `angular-refactor`

Refactoring-Workflow für Angular: moderne APIs, Signal-Migration, Test-Policy.

| Was | Dateien |
|-----|---------|
| Skill | `skills/angular-refactor/` |
| Abhängigkeit | `angular-bundle` |

Keine eigenen Parameter (erbt vom `angular-bundle`).

---

### `angular-material-custom-input`

Custom Angular Material Formularfelder über `MatFormFieldControl` und Shell+Direktive-Muster.

| Was | Dateien |
|-----|---------|
| Skill | `skills/angular-material-custom-input/` |
| Abhängigkeit | `angular-bundle` |

| Parameter | Bedeutung | Beispiel |
|-----------|-----------|---------|
| `{component-prefix}` | Komponenten-Präfix (kebab-case) | `app` |
| `{ComponentPrefix}` | Komponenten-Präfix (PascalCase) | `App` |
| `{code-root}` | Wurzelpfad des Repositories | `my-project/` |
| `{frontend-path}` | Pfad zum Angular-Projekt | `src/MyApp.Frontend` |

---

### `describe-as-prompt`

Verdichtet Unterhaltungen zu Copy-Paste-Markdown-Handoff-Prompts für Folge-Agenten.

| Was | Dateien |
|-----|---------|
| Rule | `rules/describe-as-prompt-skill.mdc` |
| Skill | `skills/describe-as-prompt/` |

Keine Parameter.

---

### `describe-as-html-prompt`

Wie `describe-as-prompt`, aber als HTML mit Mermaid Sequence- und Klassendiagrammen.

| Was | Dateien |
|-----|---------|
| Rule | `rules/describe-as-html-prompt-skill.mdc` |
| Skill | `skills/describe-as-html-prompt/` |
| Abhängigkeit | `describe-as-prompt` |

Keine Parameter.

---

### `backend-ef-migrations`

EF Core Migrations-Workflow: nur CLI (`dotnet ef migrations add`), Pflicht-Triplet, SQL-Views in Up/Down.

| Was | Dateien |
|-----|---------|
| Rule | `rules/backend-ef-migrations-skill.mdc` |
| Skill | `skills/backend-ef-migrations/` |

| Parameter | Bedeutung | Beispiel |
|-----------|-----------|---------|
| `{backend-path}` | Pfad zum Backend-Projekt | `src/MyApp.Backend` |
| `{database-project}` | EF-Datenbankprojekt-Name | `MyApp.Database` |
| `{startup-project}` | Startprojekt mit `Migrate()` | `MyApp.Api` |
| `{DbContext}` | DbContext-Basisname | `AppDb` |
| `{view-name}` | Name des verwalteten SQL-Views | `v_ActiveUsers` |
| `{agent-index}` | Datei mit Agentenübersicht | `AGENTS.md` |

---

## Abhängigkeiten (Übersicht)

```
ado-requests-stories  →  buddy-agent
buddy-agent           →  caveman, commit-message
angular-refactor      →  angular-bundle
angular-material-*    →  angular-bundle
describe-as-html-*    →  describe-as-prompt
implementation-*      →  genericrtk-filter
```

## Parameter-Persistenz

`update-skill.ps1` speichert gesetzte Parameter in `.cursor/skill-params.json` im Zielprojekt.
Bei erneutem Update werden diese Werte automatisch übernommen — neue Parameter werden abgefragt.
