# .cursor — Portable Agent Infrastructure

Portable Agenten-Infrastruktur: Rules, Skills, Agent-Profile und Referenzen — übertragbar in beliebige Repositories.

---

## Main-Agents

Main-Agents sind Agents aus `.cursor/agents/`, die **nicht** von einem anderen Agent, einer Rule oder einem Skill delegiert werden — sie werden direkt durch den Nutzer ausgelöst.

---

### ado-agent

Orchestriert Azure DevOps Work Items ↔ lokale Markdown-Artefakte (`requests/stories/`). Koordiniert prüfe-Vorgänge, Task-Abschlüsse, Story-State-Übergänge und leitet bei Bedarf an `buddy-agent` oder `planning-workflow` weiter.

**Ausgelöst durch:** `rules/ado-skill.mdc`

#### Operations

| Operation | Beschreibung | Direkte Sub-Agents |
|-----------|-------------|-------------------|
| Story prüfen | ADO-Story mit Tasks laden, `story-*.md` anlegen/aktualisieren | `ado-story-pruefe-agent` |
| Task prüfen | ADO-Task laden, `task-*.md` anlegen/aktualisieren | `ado-task-pruefe-agent` |
| Feature prüfen | ADO-Feature mit parallelen Story-Subagents prüfen | `ado-story-pruefe-agent` (parallel) |
| Task fertig markieren | Task in ADO und `task-*.md` als erledigt markieren | — |
| ToDo notieren | Kommentar / ToDo in Task eintragen | — |
| Story auf active setzen | Story-State in ADO auf `active` setzen | — |
| Story resolved setzen | Story-State in ADO auf `resolved` setzen | — |

```
prüfe Story 287638
prüfe Task 123456
prüfe Feature 98765
markiere Task 123456 als fertig
ToDo für Task 123456: Validierung fehlt noch
Story 287638 auf active
Story 287638 resolved
@ado-agent
```

---

### plan-agent

Orchestriert den 6-Phasen Planning Workflow. Koordiniert Scouts (Phase 3), Topic-Planer (Phase 4b) und Drei-Perspektiven-Review (Phase 5). Liefert ein finales Planpaket mit Umsetzungs-Topologie (IMP-FE-*/IMP-BE-*-Slices).

**Ausgelöst durch:** `rules/planning-workflow-skill.mdc`

#### Operations

| Operation | Beschreibung | Direkte Sub-Agents |
|-----------|-------------|-------------------|
| Planning starten | Vollständiger 6-Phasen-Workflow | `plan-agent-scout`, `plan-agent-topic-planner`, `plan-agent-optimist`, `plan-agent-pessimist`, `plan-agent-normalo` |
| Vorgehen klären | Implizites Planning bei Strategie-/Architektur-Fragen | (wie oben) |
| Optionen vergleichen | Trade-off-Analyse mit Planungs-Output | (wie oben) |

```
plane bitte die Erweiterung des UserService
plane die Korrektur des Login-Bugs
plane die Migration von REST auf GraphQL
Wie gehen wir hier am besten vor?
Optionen vergleichen für die neue Auth-Strategie
Skizziere die Strategie für den Umbau
plane die Anpassung am Dialog
lass uns planen
```

---

### buddy-agent

Phasen-basiertes Sparring **vor** der Planung. Führt durch `intake → compress → repo-check → diskussion → plan-prompt`. Liefert einen **vollständigen** describe-as-Handoff für `plan-agent` (Wo/Was/Achten, geklärte Entscheidungen, offene Edge cases). Kommuniziert in normalem Deutsch — kein Caveman im Chat.

**Ausgelöst durch:** `rules/buddy-agent-skill.mdc`

#### Operations

| Operation | Beschreibung | Cursor-Modus |
|-----------|-------------|-------------|
| intake | Kontext aufnehmen — Navigations-Block, kein Scouting; Re-intake in diskussion = passiv | Ask |
| compress | Thread-Stand verdichten (Wunsch, Entscheidungen, Repo-Kurz, Repo-Fragen) | Ask |
| repo-check | MCP-gestützte Beantwortung von `## Repo-Fragen` inkl. Pipeline-Warnungen | Agent (Pflicht) |
| diskussion | Q&A aus intake + repo-check; implizit nach repo-check | Ask |
| plan-prompt | Vollständiger describe-as-Handoff (Section A + B) für plan-agent | Ask |

```
@buddy-agent
Task mit Buddy
Sparring
compress
repo-check
plan-prompt
Plan-Prompt für plan-agent
```

---

### conversation-insights-agent

Erfasst entscheidende Erkenntnisse aus der laufenden Session in `{insights-path}/log.md`. Unterstützt Verfeinerung (refined) und Promotion von Einträgen zu Rules oder Skill-Updates (promoted).

**Ausgelöst durch:** `rules/conversation-insights-skill.mdc`

#### Operations

| Operation | Beschreibung | Direkte Sub-Agents |
|-----------|-------------|-------------------|
| Insights erfassen | Entscheidende Learnings in `log.md` schreiben | — |
| Eintrag verfeinern | Rohein­trag zu refiniertem Eintrag ausarbeiten | — |
| Zu Rule fördern | Eintrag in eine `.mdc`-Rule oder `SKILL.md` überführen | — |

```
capture insights
log what we learned
session insights
what did we learn
refine insight 2026-06-03 login-token-fix
make rule from insight 2026-06-03 login-token-fix
@conversation-insights-agent
```

---

## Packages

Ein Package besteht aus mindestens einer Rule oder einem Skill, plus optionalen Sub-Agents, References und Parametern.

---

### genericrtk-filter

Pflicht-Output-Filter für Build- und Test-Läufe via MCP. Verdichtet Konsolen-Ausgaben **vor** inhaltlichem Reasoning — ein Shell-Lauf = eine MCP-Kette.

**Abhängigkeiten:** _keine_

#### Operations

| Operation | Trigger |
|-----------|---------|
| Build-Output filtern | Automatisch bei `ng build` / `dotnet build` |
| Test-Output filtern | Automatisch bei `ng test` / `dotnet test` |
| Fehleranalyse | Automatisch bei Exit ≠ 0 via `analyze_build_output` |

```
ng build --configuration production
ng test --no-watch --browsers=ChromeHeadless
dotnet build
dotnet test
```

_Kein direkter Nutzer-Trigger — greift automatisch bei jedem in-scope Shell-Lauf._

#### Rules

| Datei | Trigger |
|-------|---------|
| `rules/genericrtk-output-filter.mdc` | Jeder `ng build/test`, `dotnet build/test` im Scope; Hard Stop wenn MCP nicht erreichbar |

#### Skills

_keine_

#### References

_keine_

#### Sub-Agents

_keine_

#### Parameters

| Parameter | Beschreibung |
|-----------|-------------|
| `{frontend-path}` | Angular-App-Pfad (CWD für Frontend-Kommandos) |
| `{backend-path}` | Backend-Pfad (CWD für Backend-Kommandos) |

---

### ado-requests-stories

Azure DevOps Work Items ↔ Markdown-Sync unter `requests/stories/`. Story, Task und Feature prüfen, Tasks schließen, State-Übergänge verwalten, ToDos erfassen.

**Abhängigkeiten:** `buddy-agent`

#### Operations

| Operation | Trigger |
|-----------|---------|
| Story prüfen | `prüfe Story [ID]` |
| Task prüfen | `prüfe Task [ID]` |
| Feature prüfen | `prüfe Feature [ID]` |
| Task fertig markieren | `markiere Task [ID] als fertig` / `Task [ID] erledigt` |
| ToDo notieren | `ToDo für Task [ID]` / `notiere im Task [ID]` |
| Story active setzen | `Story [ID] auf active` / `setze Story [ID] active` |
| Story resolved setzen | `Story [ID] resolved` / `schließe Story [ID] resolved` |

```
prüfe Story 287638
prüfe Task 123456
prüfe Feature 98765
markiere Task 123456 als fertig
Task 123456 erledigt
ToDo für Task 123456: Validierung fehlt noch
Story 287638 auf active
Story 287638 resolved
```

#### Rules

| Datei | Trigger |
|-------|---------|
| `rules/ado-skill.mdc` | `prüfe Story/Task/Feature`, `markiere Task … als fertig`, `ToDo für Task`, `Story … active/resolved`, Work-Item-IDs mit requests/stories-Kontext |

#### Skills

| Datei | Inhalt |
|-------|--------|
| `skills/ado/SKILL.md` | Story/Task/Feature prüfen, Task fertig, ToDo, active/resolved, Task verfeinern (Legacy) |

#### References

| Datei | Inhalt |
|-------|--------|
| `references/subagent-model-before-task.md` | Pflicht: Modell aus Agent-Profil vor Task |

#### Sub-Agents

| Agent | Aufgabe |
|-------|---------|
| `agents/ado-story-pruefe-agent.md` | Story-Phase: read-only Code-Review + Task-Inventur, `story-*.md` generieren |
| `agents/ado-task-pruefe-agent.md` | Task-Phase: schlanke `task-*.md` Generierung |

#### Parameters

| Parameter | Beschreibung |
|-----------|-------------|
| `{devops-pipelines-path}` | Pfad zu Azure DevOps Pipeline-Definitionen (YAML-Dateien) |
| `ADO.Organisation` | Azure DevOps Organisationsname (in `mcp.json` → `defaultOrganization`) |
| `ADO.Project-GUID` | ADO Projekt-GUID (in `skills/ado/config.defaults.json` → `defaultProject`) |

---

### buddy-agent

Phasen-basiertes Sparring vor dem Planning Workflow (`intake → compress → repo-check → diskussion → plan-prompt`). Liefert **vollständigen** describe-as-Handoff für `plan-agent` — Ziel: Planer stellt ideally keine Klärungsfragen zu bereits geklärten Punkten. Chat in normalem Deutsch — kein Caveman.

**Abhängigkeiten:** `describe-as-prompt`, `commit-message`

#### Operations

| Operation | Trigger | Modus |
|-----------|---------|-------|
| intake | default; `intake`, `zuhören` (erneut = passiv zuhören) | Ask |
| compress | `compress` — Snapshot inkl. Entscheidungen, Repo-Kurz, Repo-Fragen | Ask |
| repo-check | `repo-check` | Agent |
| diskussion | implizit nach repo-check; `diskussion`; direkte Frage | Ask |
| plan-prompt | `plan-prompt`, `handoff` — Section B mit Decisions + Fundstellen + offenen Edge cases | Ask |
| Anforderung schärfen | `Task durchsprechen`, `Anforderung schärfen`, `Sparring` | Ask |

```
@buddy-agent
Task mit Buddy
Sparring
compress
repo-check
plan-prompt
Plan-Prompt für plan-agent
```

**Trigger-Hinweis:** `ich möchte …` / `ich hätte gerne …` nur mit Klärungs-Signal (z. B. `durchsprechen`, `Sparring`, `Plan-Prompt`) — nicht bei Umsetzungs-Imperativen wie `implementiere` oder `plane`.

#### Rules

| Datei | Trigger |
|-------|---------|
| `rules/buddy-agent-skill.mdc` | `@buddy-agent`, `buddy-agent`, `Task mit Buddy`, `Plan-Prompt`, `Sparring`, `intake`, `compress`, `repo-check`, `plan-prompt` |

#### Skills

| Datei | Inhalt |
|-------|--------|
| `skills/buddy-agent/buddy-repo-check.md` | Template für `./buddy-repo-check.md` — konfiguriert die MCP-Pipeline für repo-check |

#### References

_keine_

#### Sub-Agents

_keine_

#### Parameters

| Parameter | Beschreibung |
|-----------|-------------|
| `./buddy-repo-check.md` | Ressourcen-Pipeline im **Repo-Root** (nicht unter `.cursor/`). Template kopieren: `skills/buddy-agent/buddy-repo-check.md` → `./buddy-repo-check.md`. **Ohne Datei:** Default-Pipeline = `code-review-mcp` only. |

**Optional (projektspezifisch, nicht im buddy-agent-Profil):** MCP-Schritte in `./buddy-repo-check.md` unter `## Pipeline` ergänzen — unbekannte Zeilen erscheinen in repo-check unter `### Pipeline-Warnungen`.

**Teams ohne describe-as / Planning Workflow:** nur `buddy-agent.md` + Rule portieren; Planning-Integration optional nachziehen.

---

### code-review-mcp

Statische Code-Analyse über MCP (AST, Index, Refactoring-Safety, Nullability, Auto-Fixes) für Angular und .NET — je nach Phase: Planung, Implementierung oder Nach-Implementierung.

**Abhängigkeiten:** _keine_

#### Operations

| Operation | Phase | Trigger / MCP-Tool |
|-----------|-------|-------------------|
| Projekt indexieren | Planung | Automatisch bei Symbol-Bezug → `index_project` |
| Symbol suchen | Planung | Bei Klassen-/Methoden-Bezug → `find_in_index` |
| Klassen-Split prüfen | Planung | `suggest_class_splits` bei Erweiterung bestehender Klasse |
| Refactoring-Safety | Planung | `analyze_refactoring_safety` bei API-Änderungen |
| Datei reviewen | Implementierung | `review_file` / `review_code` |
| Diff reviewen | Implementierung | `review_git_diff` — vor Commit |
| Komplexität prüfen | Implementierung | `analyze_complexity` |
| Test-Qualität prüfen | Nach-Impl. | `analyze_test_quality` |
| Coverage auswerten | Nach-Impl. | `analyze_coverage` — nach Test-Run |
| Vollständiger Bericht | Nach-Impl. | `analyze_advanced_all` — Sprint-End/Release |

```
schau dir den UserService an
review meinen Code vor dem Commit
ist das okay so?
wie gut sind meine Tests?
vor dem Merge alles prüfen
```

#### Rules

| Datei | Trigger |
|-------|---------|
| `rules/code-review-mcp.mdc` | Code-Review-Anfragen in allen Phasen; Symbol-First (Index vor Grep) bei Klassen-/Methoden-Bezug |

#### Skills

| Datei | Inhalt |
|-------|--------|
| `skills/code-review-mcp/SKILL.md` | Tool-Auswahl je Phase, Code-Landkarte Recherche-Reihenfolge, MCP-Pfadauflösung |

#### References

_keine_

#### Sub-Agents

_keine_

#### Parameters

_keine — `{frontend-path}` / `{backend-path}` werden aus `./AGENTS.md` gelesen_

---

### angular-bundle

Kern-Angular-Skills für v20+: Patterns, Signals, DI, Routing, Forms, neue App-Einrichtung, Cache-Busting.

**Abhängigkeiten:** _keine_

#### Operations

| Operation | Trigger |
|-----------|---------|
| Angular-Arbeit | Automatisch bei Angular-Bezug (`ng`, Komponenten, Signals, Routing, Forms) |
| Neue App einrichten | `ng new` / Greenfield-Kontext |
| Cache-Busting | `outputHashing`, veraltete App nach Deploy, `stale index.html` |

```
erstelle eine neue Angular-Komponente für den Login
wie implementiere ich Signals für den Warenkorb-State?
ng new meine-app — Setup und Konfiguration
die App lädt nach Deploy immer noch alte Dateien
erzwungenes Neuladen nach Deploy konfigurieren
```

#### Rules

| Datei | Trigger |
|-------|---------|
| `rules/angular-skills.mdc` | Angular-Arbeit unter `{frontend-path}`, `ng`, Komponenten, Routing, Signals, Angular-CLI |

#### Skills

| Datei | Inhalt |
|-------|--------|
| `skills/angular-developer/SKILL.md` | Angular v20+ Patterns, Signals, DI, Routing, Forms, Testing |
| `skills/angular-developer-extension/SKILL.md` | Migrations-Patterns, Signal-Architektur, Testing-Extensions |
| `skills/angular-new-app/SKILL.md` | Greenfield Angular-Setup (`ng new`) |
| `skills/angular-new-app-extension/SKILL.md` | Decision Gates, Docs-Checks, Implementierungsplanung |
| `skills/angular-cache-busting/SKILL.md` | Cache-Busting-Strategie (`outputHashing`, Meta-Tags) |

#### References

| Datei | Inhalt |
|-------|--------|
| `references/verification-commands.md` | Projektspezifische Build/Test-Befehle |

#### Sub-Agents

_keine_

#### Parameters

| Parameter | Beschreibung |
|-----------|-------------|
| `{frontend-path}` | Angular-App-Pfad (CWD für `ng build`, `ng test`) |

---

### angular-refactor

Angular-Refactoring-Workflow mit Test-Policy. Setzt `angular-bundle` voraus.

**Abhängigkeiten:** `angular-bundle`

#### Operations

| Operation | Trigger |
|-----------|---------|
| Refactoring durchführen | `refactor`, `schreib um`, `portiere` mit Angular-Bezug |

```
refactor den AuthService auf Signals um
schreib den UserComponent auf standalone um
portiere die alte Klassen-API auf inject()
```

#### Rules

_keine eigene Rule — verwendet `angular-bundle`_

#### Skills

| Datei | Inhalt |
|-------|--------|
| `skills/angular-refactor/SKILL.md` | Refactoring-Workflow mit Test-Policy |

#### References

_keine_

#### Sub-Agents

_keine_

#### Parameters

_keine — verwendet `{frontend-path}` aus `angular-bundle`_

---

### angular-material

Vollständige Angular Material v22.0.0 Referenz — alle 35 Komponenten, 23 CDK-Module und 8 Guides.

**Abhängigkeiten:** `angular-bundle`

#### Operations

| Operation | Trigger |
|-----------|---------|
| Material Komponenten | Automatisch bei `mat-`-Selektoren, `MatDialog`, `MatTable`, `mat-form-field` etc. |
| CDK-Arbeit | `CdkDrag`, `Overlay`, `FocusMonitor`, Virtual Scrolling, `BreakpointObserver` |
| Theming | `mat.theme()`, M3-Paletten, Token Overrides, `--mat-sys-` |
| Installation | `ng add @angular/material`, `provideAnimationsAsync()` |

```
mat-button, mat-form-field, mat-table, MatDialog, matSort, MatSnackBar
mat-datepicker, mat-chips, mat-select, mat-sidenav, mat-stepper
cdkDrag, cdkDropList, Overlay, FocusMonitor, BreakpointObserver
mat.theme(), --mat-sys-primary, ng add @angular/material
```

#### Rules

_keine eigene Rule — wird durch `angular-bundle` → `angular-skills.mdc` getriggert_

#### Skills

| Datei | Inhalt |
|-------|--------|
| `skills/angular-material/skill.md` | Operationen-Tabelle: 35 Komponenten, 23 CDK-Module, 8 Guides + Theming-Schnellreferenz |

#### References

| Datei | Inhalt |
|-------|--------|
| `skills/angular-material/references/components/` | 35 Komponenten-Referenzen (autocomplete … table) |
| `skills/angular-material/references/cdk/` | 23 CDK-Modul-Referenzen (a11y … tree) |
| `skills/angular-material/references/guides/` | 8 Guides (Installation, Theming, Schematics u. a.) |

#### Sub-Agents

_keine_

#### Parameters

_keine_

---

### angular-material-custom-input

Implementierung von Custom Angular Material Form Controls (`ControlValueAccessor`). Setzt `angular-bundle` voraus.

**Abhängigkeiten:** `angular-bundle`

#### Operations

| Operation | Trigger |
|-----------|---------|
| Custom Form Control erstellen | Anfragen zu Custom Material Input / `ControlValueAccessor` |

```
erstelle ein Custom Material Form Control für Datumsauswahl
implementiere einen eigenen MatInput für Währungseingabe
```

#### Rules

_keine eigene Rule — verwendet `angular-bundle`_

#### Skills

| Datei | Inhalt |
|-------|--------|
| `skills/angular-material-custom-input/SKILL.md` | Custom Material Form Control Implementierung |

#### References

_keine_

#### Sub-Agents

_keine_

#### Parameters

| Parameter | Beschreibung |
|-----------|-------------|
| `{component-prefix}` | Angular Selektor-Präfix (kebab-case, z. B. `app`) |
| `{ComponentPrefix}` | Angular Klassen-Präfix (PascalCase, z. B. `App`) |

---

### backend-ef-migrations

EF Core Migrations-Workflow: CLI-only `dotnet ef migrations add`, Triplet-Enforcement (`.cs`, `.Designer.cs`, `ModelSnapshot.cs`), View-SQL in `Up()`/`Down()`.

**Abhängigkeiten:** _keine_

#### Operations

| Operation | Trigger |
|-----------|---------|
| Migration anlegen | `dotnet ef migrations add [Name]` / Schema-Änderung |
| Schema-Fehler beheben | Postgres-Fehler `42703` / `column … does not exist` |
| Pending Changes prüfen | `dotnet ef migrations has-pending-model-changes` |

```
lege eine EF Migration für die neue User-Tabelle an
dotnet ef migrations add AddUserTable
neue Spalte IsActive in der Order-Tabelle hinzufügen
Postgres meldet column "is_active" does not exist
```

#### Rules

| Datei | Trigger |
|-------|---------|
| `rules/backend-ef-migrations-skill.mdc` | `EF migration`, `dotnet ef migrations add`, Schema-Änderungen, `MigrationBuilder`, `AddColumn`, DB-Fehler `42703` |

#### Skills

| Datei | Inhalt |
|-------|--------|
| `skills/backend-ef-migrations/SKILL.md` | CLI-Workflow, Triplet-Pflicht, View-SQL-Pattern |

#### References

_keine_

#### Sub-Agents

_keine_

#### Parameters

| Parameter | Beschreibung |
|-----------|-------------|
| `{backend-path}` | Backend-Projektpfad (CWD für `dotnet ef migrations`) |
| `{database-project-name}` | EF-Projekt-Name (für `--project`-Argument) |
| `{startup-project-name}` | Startup-Projekt mit Connection-String (für `--startup-project`) |
| `{DbContext}` | DbContext-Basisname ohne `DbContext`-Suffix (z. B. `Atlas` → `AtlasDbContext`) |

---

### describe-as-prompt

Verdichtet Unterhaltungen zu kopierbaren Markdown-Handoff-Prompts für Folge-Agents. Wasserdicht-Modus und Planning-Obligation gemäß Skill.

**Abhängigkeiten:** _keine_

#### Operations

| Operation | Trigger |
|-----------|---------|
| Handoff-Prompt erstellen | `Prompt für neuen Agent`, `wasserdicht`, `describe-as-prompt` |
| Unterhaltung zusammenfassen | `als Prompt zusammenfassen`, `Handoff-Prompt` |

```
Prompt für neuen Agent erstellen
wasserdicht
als Prompt zusammenfassen
describe-as-prompt
Handoff-Prompt
```

#### Rules

| Datei | Trigger |
|-------|---------|
| `rules/describe-as-prompt-skill.mdc` | `describe-as-prompt`, `Prompt für neuen Agent`, `wasserdicht`, `als Prompt zusammenfassen`, `Handoff-Prompt` |

#### Skills

| Datei | Inhalt |
|-------|--------|
| `skills/describe-as/SKILL.md` | Handoff-Format, Wasserdicht-Modus, Planning-Obligation |

#### References

_keine_

#### Sub-Agents

_keine_

#### Parameters

_keine_

---

### describe-as-html-prompt

Verdichtet Unterhaltungen zu HTML-Handoff-Prompts mit Mermaid-Sequence- und Klassen-Diagrammen. Setzt `describe-as-prompt` voraus.

**Abhängigkeiten:** `describe-as-prompt`

#### Operations

| Operation | Trigger |
|-----------|---------|
| HTML-Handoff erstellen | `describe-as-html-prompt`, `als HTML zusammenfassen` |
| Mit Diagrammen | `sequenceDiagram`, `Mermaid`, `Ablauf als Diagramm` |

```
describe-as-html-prompt
als HTML zusammenfassen
Handoff als HTML
Ablauf als Diagramm darstellen
Frontend zu Backend diagrammieren
```

#### Rules

| Datei | Trigger |
|-------|---------|
| `rules/describe-as-html-prompt-skill.mdc` | `describe-as-html-prompt`, `als HTML`, `HTML-Prompt`, `Mermaid`, `sequenceDiagram` |

#### Skills

| Datei | Inhalt |
|-------|--------|
| `skills/describe-as-html-prompt/SKILL.md` | HTML-Format, Mermaid `sequenceDiagram` (Flows), `classDiagram` (Modelle/Methoden) |

#### References

_keine_

#### Sub-Agents

_keine_

#### Parameters

_keine_

---

### caveman

Kommunikationsmodus: antwortet knapp wie ein kluger Höhlenmensch — technischer Inhalt vollständig, alle Füllwörter entfallen. Manuell per `caveman full` aktivierbar.

**Abhängigkeiten:** _keine_

#### Operations

| Operation | Trigger |
|-----------|---------|
| Caveman-Modus aktivieren | `caveman full` |
| Modus beenden | `stop caveman`, `normal mode` |

```
caveman full
stop caveman
normal mode
```

#### Rules

_keine_

#### Skills

| Datei | Inhalt |
|-------|--------|
| `skills/caveman/SKILL.md` | Caveman-Modus-Spezifikation, Auto-Clarity-Ausnahmen |

#### References

_keine_

#### Sub-Agents

_keine_

#### Parameters

_keine_

---

### commit-message

Generiert Git-Commit-Messages mit Titel, Beschreibung und kopierbarem CLI-Befehl.

**Abhängigkeiten:** _keine_

#### Operations

| Operation | Trigger |
|-----------|---------|
| Commit-Message generieren | `commit-message`, `erstelle eine Commit-Message` |

```
commit-message
erstelle eine Commit-Message für diese Änderung
```

#### Rules

_keine_

#### Skills

| Datei | Inhalt |
|-------|--------|
| `skills/commit-message/SKILL.md` | Commit-Message-Format: Titel, Description, CLI-Command |

#### References

_keine_

#### Sub-Agents

_keine_

#### Parameters

_keine_

---

### conversation-insights

Erfasst entscheidende Session-Erkenntnisse in `{insights-path}/log.md`. Lifecycle: `raw` → `refined` → `promoted` (zu `.mdc`-Rule oder `SKILL.md`).

**Abhängigkeiten:** _keine_

#### Operations

| Operation | Trigger |
|-----------|---------|
| Insights erfassen | `capture insights`, `log what we learned`, `session insights` |
| Eintrag verfeinern | `refine insight YYYY-MM-DD slug` |
| Zu Rule fördern | `make rule from insight YYYY-MM-DD slug` |

```
capture insights
log what we learned
session insights
refine insight 2026-06-03 api-timeout-fix
make rule from insight 2026-06-03 api-timeout-fix
```

#### Rules

| Datei | Trigger |
|-------|---------|
| `rules/conversation-insights-skill.mdc` | `capture insights`, `log what we learned`, `refine insight`, `make rule from insight`, `session insights` |

#### Skills

| Datei | Inhalt |
|-------|--------|
| `skills/conversation-insights/SKILL.md` | Eintrag-Format, Lifecycle raw→refined→promoted, Kategorien |

#### References

_keine_

#### Sub-Agents

_keine_

#### Parameters

| Parameter | Beschreibung |
|-----------|-------------|
| `{insights-path}` | Pfad zu `log.md` (Standard: `.cursor/insights`) |

---

## Workflows

Workflows sind Packages mit mehrphasigem Ablauf, dedizierten Sub-Agents und strikten Phasen-Gates. Sie unterscheiden sich von einfachen Packages durch ihren orchestrierten, sequenziellen Charakter.

---

### planning-workflow

6-Phasen Planungsworkflow: Anforderung → Scouts → Schnittstellen-Design → Topic-Planer → Drei-Perspektiven-Review → Synthese + Umsetzungs-Topologie.

**Abhängigkeiten:** _keine_

#### Operations

| Operation | Trigger |
|-----------|---------|
| Planning starten | `plane`, `plane bitte`, `plane die Korrektur/Erweiterung/Anpassung` |
| Implizites Planning | `Wie gehen wir vor?`, `Optionen vergleichen`, `Vorgehen skizzieren` |
| Plan + Implementierung | `plane … und implementiere` → erst Planning bis Freigabe |

```
plane bitte die Erweiterung des UserService
plane die Korrektur des Login-Bugs
Wie gehen wir hier am besten vor?
Welche Optionen haben wir für die Migration?
plane die Anpassung am Bestell-Dialog
lass uns planen
```

#### Rules

| Datei | Trigger |
|-------|---------|
| `rules/planning-workflow-skill.mdc` | `plane`, `plane bitte`, `plane die/das …`, `Wie gehen wir vor?`, `Optionen`, `Roadmap`, `Umsetzungsplan`, Cursor Plan Mode mit Code-Bezug |

#### Skills

| Datei | Inhalt |
|-------|--------|
| `skills/planning-workflow/SKILL.md` | 6-Phasen-Ablauf, Phasen-Gates, Slice-ID-Konvention (`IMP-FE-*` / `IMP-BE-*`), Parallelitätsregeln |

#### References

| Datei | Inhalt |
|-------|--------|
| `references/subagent-model-before-task.md` | Pflicht: Modell aus Agent-Profil (`## Modell`) lesen vor jedem Task |

#### Sub-Agents

| Agent | Phase | Aufgabe |
|-------|-------|---------|
| `agents/plan-agent-scout.md` | Phase 3 | Codebereichs-Scouting (read-only, MCP-first, YAGNI) |
| `agents/plan-agent-topic-planner.md` | Phase 4b | Einzelnes Topic planen mit IMP-* Slices und Parallelisierungs-Hinweisen |
| `agents/plan-agent-optimist.md` | Phase 5 | Risiko-Review aus konstruktiver Perspektive |
| `agents/plan-agent-pessimist.md` | Phase 5 | Risiko-Review aus skeptischer Perspektive + MCP Coverage/Nullability |
| `agents/plan-agent-normalo.md` | Phase 5 | Risiko-Review aus pragmatischer Perspektive (Ausführbarkeit) |

#### Parameters

_keine_

---

### implementation-workflow

Agent-Mode Umsetzung in 1–10 Slices mit Hard Gate, Verifikations-Subagents pro Stack und Pflicht-genericRTK nach jedem Build-/Test-Lauf.

**Abhängigkeiten:** `genericrtk-filter`

#### Operations

| Operation | Trigger |
|-----------|---------|
| Umsetzung starten | `implementiere`, `setze um`, `starte die Umsetzung` |
| Bug fixen | `fix`, `behebe`, `korrigiere` |
| Plan ausführen | `leg los`, `go ahead`, `führe den Plan aus` (nach Freigabe) |
| Slice fortsetzen | `nächster Slice`, `weiter`, `mach weiter` |

```
implementiere bitte den Plan
setze den Plan um
fix den Login-Bug
leg los
go ahead
nächster Slice
implementiere die Erweiterung laut Plan
```

#### Rules

| Datei | Trigger |
|-------|---------|
| `rules/implementation-workflow-skill.mdc` | `implementiere`, `setze um`, `fix`, `leg los`, `go ahead`, Plan-Freigabe im Thread, `IMP-*`, `Hard Gate` |

#### Skills

| Datei | Inhalt |
|-------|--------|
| `skills/implementation-workflow/SKILL.md` | Hard Gate (Schritt 1), Slice-Implementierung (Schritt 2), Stack-Verifikation (Schritt 3) |

#### References

| Datei | Inhalt |
|-------|--------|
| `references/subagent-model-before-task.md` | Pflicht: Modell aus Agent-Profil vor Task |
| `references/verification-commands.md` | Projektspezifische Build/Test-Befehle pro Stack |

#### Sub-Agents

| Agent | Schritt | Aufgabe |
|-------|---------|---------|
| `agents/implement-agent.md` | Schritt 2 | Implementiert einen IMP-* Slice inkl. Build/Test + genericRTK |
| `agents/verify-agent.md` | Schritt 3 | Stack-weite Verifikation nach Integration-Checkpoint (Release-Build + Unit-Tests) |

#### Parameters

| Parameter | Beschreibung |
|-----------|-------------|
| `{frontend-path}` | Angular-App-Pfad (CWD für `ng build`, `ng test`) |
| `{backend-path}` | Backend-Pfad (CWD für `dotnet build`, `dotnet test`) |

---

## Install & Update

### Packages installieren / aktualisieren

```powershell
# Einzelnes Package (Abhängigkeiten automatisch)
.\.cursor\install-skill.ps1 planning-workflow C:\Projects\MyApp\.cursor

# Mehrere Packages
.\.cursor\install-skill.ps1 implementation-workflow C:\Projects\MyApp\.cursor
.\.cursor\install-skill.ps1 ado-requests-stories C:\Projects\MyApp\.cursor

# Alle Packages auf einmal
.\.cursor\install-skill.ps1 all C:\Projects\MyApp\.cursor

# Vorschau ohne Dateikopie
.\.cursor\install-skill.ps1 planning-workflow C:\Projects\MyApp\.cursor -DryRun

# Verfügbare Packages anzeigen
.\.cursor\install-skill.ps1 -List
```

### Packages updaten

Aktualisiert Dateien eines installierten Packages (Abhängigkeiten automatisch). Bereits konfigurierte Parameter und MCP-Einstellungen bleiben erhalten — nur neue Parameter werden abgefragt.

```powershell
# Einzelnes Package aktualisieren
.\.cursor\update-skill.ps1 planning-workflow C:\Projects\MyApp\.cursor

# Alle Packages aktualisieren
.\.cursor\update-skill.ps1 all C:\Projects\MyApp\.cursor

# Vorschau ohne Änderungen
.\.cursor\update-skill.ps1 genericrtk-filter C:\Projects\MyApp\.cursor -DryRun

# Verfügbare Packages anzeigen
.\.cursor\update-skill.ps1 -List
```

### Parameter befüllen

Nach der Installation alle `{parameter}`-Platzhalter in `agents/`, `rules/` und `skills/` ersetzen:

```powershell
# Interaktiv — speichert Werte in .cursor/skill-params.json
.\.cursor\update-skill.ps1 all C:\Projects\MyApp\.cursor
```

### Host-spezifische Konfiguration

| Datei | Was zu tun ist |
|-------|---------------|
| `mcp.json` | MCP-Server konfigurieren (ADO-Organisation, Docker-Images) |
| `AGENTS.md` (Repo-Root) | Verfügbare Agent-Typen, Trigger, Stack-Konventionen, Styleguide |
| `references/verification-commands.md` | Build/Test-Befehle pro Stack eintragen |
| `skills/ado/config.defaults.json` | `defaultProject` (GUID) + `defaultOrganization` setzen (nur ADO) |

### Package-Abhängigkeiten

```
ado-requests-stories      →  buddy-agent
buddy-agent               →  describe-as-prompt, commit-message
angular-refactor          →  angular-bundle
angular-material          →  angular-bundle
angular-material-*        →  angular-bundle
describe-as-html-prompt   →  describe-as-prompt
implementation-workflow   →  genericrtk-filter
conversation-insights     →  (keine)
planning-workflow         →  (keine)
```
