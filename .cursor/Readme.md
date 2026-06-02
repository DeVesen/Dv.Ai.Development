# .cursor — Portable Agent Infrastructure

Portable Agenten-Infrastruktur: Rules, Skills, Agent-Profile und Referenzen — übertragbar in beliebige Repositories.

## Verzeichnisstruktur

```
.cursor/
├── agents/            # Agent-Profile (implement-agent, verify-agent, plan-agent, …)
├── packages/          # Skill-Package-Manifeste (.json) + install-skill.ps1
├── references/        # Geteilte Referenzdokumente (Modellauswahl, …)
├── rules/             # alwaysApply-Rules (Trigger, Output-Filter, …)
└── skills/            # Workflow-Skills (implementation, planning, ado-requests, …)
```

---

## Portierung auf ein neues Projekt

### 1. Packages installieren

```powershell
# Einzelnes Package (Abhängigkeiten automatisch)
.\.cursor\install-skill.ps1 planning-workflow C:\Projects\MyApp\.cursor

# Alle Packages auf einmal
.\.cursor\install-skill.ps1 all C:\Projects\MyApp\.cursor

# Vorschau ohne Dateikopie
.\.cursor\install-skill.ps1 planning-workflow C:\Projects\MyApp\.cursor -DryRun

# Verfügbare Packages anzeigen
.\.cursor\install-skill.ps1 -List
```

### 2. Parameter befüllen

Nach der Installation: alle `{parameter}`-Platzhalter in den Dateien unter `agents/`, `rules/` und `skills/` mit projektspezifischen Werten ersetzen.

**Für Agents:** Die vollständige Parameter-Referenz steht in [Abschnitt „Parameter-Referenz"](#parameter-referenz) — jeder Parameter mit Beschreibung, Beispiel und den betroffenen Dateien.

```powershell
# Update befüllt Parameter interaktiv und speichert sie in skill-params.json
.\.cursor\update-skill.ps1 all C:\Projects\MyApp\.cursor
```

### 3. Host-spezifische Konfiguration

- **`mcp.json`** — MCP-Server (ADO, genericRTK, code-review-mcp u. a.) konfigurieren
- **`AGENTS.md`** — im Repository-Root anlegen mit verfügbaren Agent-Typen, Triggern, Stack-Konventionen und Styleguide-Hinweisen
- **`references/verification-commands.md`** — nach Installation befüllen: Abschnitt `Agents — mandatory verification after changes` mit projektspezifischen Build/Test-Befehlen pro Stack

### 4. ADO-Skills (optional)

Nur bei Azure DevOps:
- `skills/ado-requests-stories/config.defaults.json` mit `defaultProject` (GUID) befüllen
- MCP-Server `ado` in `mcp.json` konfigurieren

---

## Skill-Packages

| Package | Enthält | Abhängigkeiten |
|---------|---------|----------------|
| `planning-workflow` | Rule + Skill + 6 Agents | — |
| `implementation-workflow` | Rule + Skill + 2 Agents | `genericrtk-filter` |
| `genericrtk-filter` | Rule + MCP-Eintrag | — |
| `code-review-mcp` | Rule + Skill + MCP-Eintrag | — |
| `ado-requests-stories` | Rule + Skill + 3 Agents | `buddy-agent` |
| `buddy-agent` | Rule + Agent | `caveman`, `commit-message` |
| `angular-bundle` | Rule + 5 Skills | — |
| `angular-refactor` | Skill | `angular-bundle` |
| `angular-material-custom-input` | Skill | `angular-bundle` |
| `backend-ef-migrations` | Rule + Skill | — |
| `describe-as-prompt` | Rule + Skill | — |
| `describe-as-html-prompt` | Rule + Skill | `describe-as-prompt` |
| `caveman` | Skill | — |
| `commit-message` | Skill | — |

Abhängigkeiten werden automatisch zuerst installiert.

---

## Parameter-Referenz

Vollständige Liste aller `{parameter}`-Platzhalter — für Mensch und Agent.

**Agent-Anweisung:** Lies diese Referenz vollständig. Für jeden Parameter: finde alle aufgelisteten Dateien, ersetze `{parameter}` durch den ermittelten oder erfragten Wert. Frage den Nutzer wenn ein Wert nicht aus dem Repo-Kontext ableitbar ist. Ersetze niemals einen Parameter mit einem Platzhalter oder leerem Wert.

---

### `{frontend-path}`

| Feld | Inhalt |
|------|--------|
| **Typ** | Verzeichnispfad |
| **Beschreibung** | Pfad zum Frontend-Projekt (Angular, React o. ä.) — CWD für `ng build`, `ng test`, `npm run build` |
| **Beispiel** | `src/MyApp.Frontend` · `frontend/` · `apps/web` |
| **Konvention** | Pfad wo `angular.json` / `package.json` liegt; ohne trailing Slash |

**Verwendet in:**
- `rules/angular-skills.mdc`
- `rules/genericrtk-output-filter.mdc`
- `skills/implementation-workflow/SKILL.md`
- `agents/verify-agent.md` (via implementation-workflow)
- `agents/implement-agent.md` (via implementation-workflow)

---

### `{backend-path}`

| Feld | Inhalt |
|------|--------|
| **Typ** | Verzeichnispfad |
| **Beschreibung** | Pfad zum Backend-Projekt (.NET, Java o. ä.) — CWD für `dotnet build`, `dotnet test` |
| **Beispiel** | `src/MyApp.Backend` · `backend/` · `api/` |
| **Konvention** | Pfad wo die `.sln` oder das primäre `.csproj` liegt; bei mehreren unabhängigen Build-Einheiten können mehrere Backend-Paths existieren (dann pro Stack einen eigenen `verify-agent`) |

**Verwendet in:**
- `rules/backend-ef-migrations-skill.mdc`
- `rules/genericrtk-output-filter.mdc`
- `skills/implementation-workflow/SKILL.md`
- `agents/verify-agent.md` (via implementation-workflow)

---

### `{component-prefix}`

| Feld | Inhalt |
|------|--------|
| **Typ** | String (kebab-case) |
| **Beschreibung** | Angular Komponenten-Präfix in kebab-case — wird im Selektor verwendet (`<prefix-my-component>`) |
| **Beispiel** | `app` · `mfa` · `lib` |
| **Konvention** | Muss mit `{ComponentPrefix}` (PascalCase) übereinstimmen; steht in `angular.json` unter `prefix` |

**Verwendet in:**
- `skills/angular-material-custom-input/` (Shell-Snippets, Selektor-Vorlagen)

---

### `{ComponentPrefix}`

| Feld | Inhalt |
|------|--------|
| **Typ** | String (PascalCase) |
| **Beschreibung** | Angular Komponenten-Präfix in PascalCase — wird im Klassennamen verwendet (`PrefixMyComponent`) |
| **Beispiel** | `App` · `Mfa` · `Lib` |
| **Konvention** | PascalCase-Version von `{component-prefix}`; erster Buchstabe groß, Rest entsprechend |

**Verwendet in:**
- `skills/angular-material-custom-input/` (Klassen-Vorlagen, Test-Vorlagen)

---

### `{database-project-name}`

| Feld | Inhalt |
|------|--------|
| **Typ** | .NET Projektname (ohne `.csproj`) |
| **Beschreibung** | Name des Projektes in dem Entity-Framework liegt (Migrations-Dateien und DbContext) — wird als `--project`-Argument für `dotnet ef migrations add` verwendet |
| **Beispiel** | `MyApp.Database` · `MyApp.Infrastructure` · `MyApp.Data` |
| **Konvention** | Exakter Projektname wie in der `.sln` referenziert; ohne Pfad, nur der Name |

**Verwendet in:**
- `rules/backend-ef-migrations-skill.mdc`
- `skills/backend-ef-migrations/SKILL.md`
- `skills/backend-ef-migrations/references/cli-commands.md`

---

### `{startup-project-name}`

| Feld | Inhalt |
|------|--------|
| **Typ** | .NET Projektname (ohne `.csproj`) |
| **Beschreibung** | Name des Projektes in dem die DB-Verbindung umgesetzt ist — hat den Connection-String und ruft `db.Database.Migrate()` auf; wird als `--startup-project`-Argument verwendet |
| **Beispiel** | `MyApp.Api` · `MyApp.Web` · `MyApp.Host` |
| **Konvention** | Projekt mit der Verbindungszeichenfolge für EF; muss `{database-project-name}` referenzieren |

**Verwendet in:**
- `rules/backend-ef-migrations-skill.mdc`
- `skills/backend-ef-migrations/SKILL.md`
- `skills/backend-ef-migrations/references/cli-commands.md`

---

### `{DbContext}`

| Feld | Inhalt |
|------|--------|
| **Typ** | Klassenname (PascalCase, ohne `DbContext`-Suffix) |
| **Beschreibung** | Basisname des DbContext — wird für die Klasse (`{DbContext}DbContext`), den Snapshot (`{DbContext}ModelSnapshot.cs`) und das `--context`-Argument verwendet |
| **Beispiel** | Projekt heißt `Atlas` → `{DbContext}` = `Atlas` → Klasse: `AtlasDbContext` · Snapshot: `AtlasModelSnapshot.cs` · CLI: `--context AtlasDbContext` |
| **Konvention** | Nur der Basisname; das Wort `DbContext` nicht einschließen |

**Verwendet in:**
- `rules/backend-ef-migrations-skill.mdc`
- `skills/backend-ef-migrations/SKILL.md`

---

### `{devops-pipelines-path}`

| Feld | Inhalt |
|------|--------|
| **Typ** | Verzeichnispfad |
| **Beschreibung** | Pfad zum Verzeichnis mit Azure DevOps Pipeline-Definitionen (YAML-Dateien) |
| **Beispiel** | `pipelines/` · `.azuredevops/` · `devops/pipelines/` |
| **Konvention** | Verzeichnis wo `*.yml`/`*.yaml` Pipeline-Dateien liegen |

**Verwendet in:**
- `rules/ado-requests-stories-skill.mdc`

---

### `ADO.Organisation` *(config.defaults.json)*

| Feld | Inhalt |
|------|--------|
| **Typ** | String |
| **Beschreibung** | Azure DevOps Organisationsname — wird für ADO MCP-API-Aufrufe verwendet |
| **Beispiel** | `MeineFirma` · `contoso` |
| **Konvention** | Exakter Name wie in der ADO-URL: `https://dev.azure.com/{Organisation}` |
| **Speicherort** | `skills/ado-requests-stories/config.defaults.json` → Feld `defaultOrganization` |

**Verwendet in:**
- `skills/ado-requests-stories/references/config.md`
- `skills/ado-requests-stories/config.defaults.json`

---

### `ADO.Project-GUID` *(config.defaults.json)*

| Feld | Inhalt |
|------|--------|
| **Typ** | GUID |
| **Beschreibung** | Azure DevOps Projekt-GUID — wird für ADO MCP Work-Item-Abfragen verwendet |
| **Beispiel** | `42a6dde2-3b2c-4f1a-8e9d-1a2b3c4d5e6f` |
| **Konvention** | GUID-Format (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`); abrufbar in ADO unter Projekteinstellungen → Eigenschaften |
| **Speicherort** | `skills/ado-requests-stories/config.defaults.json` → Feld `defaultProject` |

**Verwendet in:**
- `skills/ado-requests-stories/references/config.md`
- `skills/ado-requests-stories/config.defaults.json`

---

## Parameter-Persistenz

`update-skill.ps1` speichert gesetzte Parameter in `.cursor/skill-params.json` im Zielprojekt. Bei erneutem Update werden vorhandene Werte automatisch übernommen — nur neue Parameter werden abgefragt.

```json
// .cursor/skill-params.json (Beispiel)
{
  "code-root": ".",
  "frontend-path": "src/MyApp.Frontend",
  "backend-path": "src/MyApp.Backend",
  "agent-index": "AGENTS.md",
  "verification-commands": ".github/copilot-instructions.md"
}
```

## Abhängigkeiten (Übersicht)

```
ado-requests-stories  →  buddy-agent
buddy-agent           →  caveman, commit-message
angular-refactor      →  angular-bundle
angular-material-*    →  angular-bundle
describe-as-html-*    →  describe-as-prompt
implementation-*      →  genericrtk-filter
```
