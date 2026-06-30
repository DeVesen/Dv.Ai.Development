# StartUpClaude.md — Claude Code Harness Setup

> **Hinweis:** Diese Datei wird vom Harness NICHT automatisch geladen (auto-geladen werden nur `CLAUDE.md` und `SKILL.md`). Öffne diese Datei explizit, wenn du ein neues Kundenprojekt oder diesen Harness auf einem neuen Rechner einrichten willst.
>
> **Verwendung mit einer AI:** Öffne diese Datei, lass die AI jeden Abschnitt schrittweise durchführen — sie fragt vor jeder Maßnahme nach Bestätigung.
>
> **Beim ersten Setup:** alle Phasen (A–E) vollständig durchgehen.
> **Beim Update** (Trigger: Nutzer sagt „update" oder „aktualisiert"): nur offene B-Fragen — Claude verifiziert welche Phase-B-Fragen bereits beantwortet wurden, stellt nur die noch offenen.

---

## §0 — MCP-Konfiguration (`.mcp.json`)

Die `.mcp.json` im Repository-Root steuert, welche MCP-Server Claude Code lädt.

### Pflicht: Kern-MCPs für Skill-Betrieb

Damit alle Skills (`feature-delivery`, `codebase-analyzer`, `angular-developer`, etc.) korrekt funktionieren, müssen diese zwei Einträge in der `.mcp.json` vorhanden sein:

```json
{
  "mcpServers": {
    "dev-mcp": {
      "command": "C:\\Develop\\.apps\\dev-mcp\\Dev.Mcp.exe",
      "env": {
        "LOG_VIEWER_PORT": "50010"
      }
    },
    "codebase-analyzer": {
      "command": "node",
      "args": [
        "C:\\Develop\\.apps\\codebase-analyzer\\index.js"
      ],
      "env": {
        "LOG_VIEWER_PORT": "50020"
      }
    }
  }
}
```

> **LOG_VIEWER_PORT** kann frei gewählt werden — relevant nur wenn mehrere Instanzen parallel laufen. Standard: `50010` (dev-mcp) und `50020` (codebase-analyzer).

### Optional: ADO MCP (`/ado`-Skill)

Nur notwendig, wenn der `/ado`-Skill (Azure DevOps Work Items) genutzt wird.

**Schritt 1 — Eintrag in `.mcp.json` ergänzen:**

```json
"ado": {
  "command": "npx",
  "args": [
    "-y",
    "@azure-devops/mcp",
    "<IhreOrganisation>",
    "-d",
    "core",
    "work",
    "work-items"
  ],
  "env": {
    "ado_mcp_project": "<Projektname>",
    "ado_mcp_team": "<Teamname>"
  }
}
```

Beispiel (TrumpfCorp):
```json
"ado": {
  "command": "npx",
  "args": [
    "-y",
    "@azure-devops/mcp",
    "TrumpfCorp",
    "-d",
    "core",
    "work",
    "work-items"
  ],
  "env": {
    "ado_mcp_project": "Laser Application Database",
    "ado_mcp_team": "TrumpfCorp"
  }
}
```

**Schritt 2 — `.claude/skills/ado/config.defaults.json` ausfüllen:**

```json
{
  "organization": "<IhreOrganisation>",
  "defaultProject": "<Projekt-GUID>",
  "storiesRoot": "requests/stories",
  "workItemUrlPattern": "https://dev.azure.com/<IhreOrganisation>/{project}/_workitems/edit/{id}",
  "markerVersion": "REQUESTS v1"
}
```

Felder:
- `organization` — ADO-Organisation (z.B. `TrumpfCorp`)
- `defaultProject` — GUID oder Name des ADO-Projekts (z.B. `Laser Application Database`)
- `storiesRoot` — Lokaler Ablageordner für Story-Markdown-Dateien (Default: `requests/stories`)
- `workItemUrlPattern` — URL-Template für Work-Item-Links (Organisation anpassen)

---

## §0b — CLAUDE.md erstellen / anpassen [Projekt-Landkarte + Harness-Konfiguration]

> **Zweck:** `CLAUDE.md` ist die einzige Datei, die der Claude-Harness bei jedem Start automatisch lädt. Sie definiert die Projekt-Landkarte, aktive Skills und Verhaltensvorgaben für **dieses** spezifische Projekt. Diese Sektion führt dich und eine AI Schritt für Schritt durch die Erstellung oder Anpassung.

> **Modus:** Sequenziell. AI führt jeden Schritt aus, du bestätigst oder korrigierst. Kein Schritt überschreibt Arbeit ohne Zustimmung.

---

### Phase A — Repo-Scout [AI führt automatisch aus]

**AI-Aktion:** Erkunde das Workspace-Root und erstelle einen Roh-Befund. Prüfe dabei:

1. **Root-Verzeichnis-Inventar** — Welche Top-Level-Ordner und Konfigurationsdateien existieren?
   - Typische Marker: `src/`, `apps/`, `libs/`, `backend/`, `frontend/`, `services/`, `*.sln`, `angular.json`, `package.json`, `docker-compose.yml`, `.github/`
2. **Tech-Stack identifizieren** — Welche Technologien sind im Einsatz?
   - .NET: `*.sln`, `*.csproj`, `global.json`
   - Angular: `angular.json`, `nx.json`
   - Node/npm: `package.json` im Root
   - Docker/Compose: `Dockerfile`, `docker-compose.yml`
   - CI/CD: `.github/workflows/`, `azure-pipelines.yml`
3. **Projekttyp einordnen:**
   - Monorepo (ein Root, mehrere Apps/Libs) — Marker: `nx.json`, mehrere `*.csproj` flach oder in `src/`
   - Multi-Repo-Slice (nur ein Teilbereich liegt hier)
   - Microservices (mehrere Service-Ordner mit eigenem `*.csproj`/`package.json`)
   - Klassisch: Backend-Ordner + Frontend-Ordner getrennt
4. **Backend-Struktur** (falls .NET):
   - Solution-Datei(en) und ihre Projekte auflisten
   - Schichtenmodell erkennbar? (API / Application / Domain / Infrastructure)
   - Test-Projekte vorhanden?
5. **Frontend-Struktur** (falls Angular):
   - `angular.json` → `projects`-Schlüssel auslesen → welche Apps und Libraries?
   - Nx-Workspace? Eigene `libs/`-Struktur?
6. **Weitere Services** — Datenbanken, Message-Bus, externe Abhängigkeiten aus Compose-Files oder ReadMe

**AI gibt aus:** Strukturierten Roh-Befund als Markdown-Liste. Keine CLAUDE.md-Änderung in dieser Phase.

---

### Phase B — Steckbrief aufnehmen [Dialog: AI fragt, User antwortet]

AI stellt die folgenden Fragen — eine nach der anderen, wartet jeweils auf Antwort:

**B1 — Projektname und Zweck**
> „Wie heißt das Projekt, und was ist sein Kernzweck in einem Satz?"

**B2 — Primäre Tech-Stack-Bestätigung**
> „Ich habe [X, Y, Z] erkannt. Stimmt das? Fehlt etwas?"

**B3 — Workspace-Root vs. Projekt-Root**
> „Ist `[workspace-root]` gleichzeitig das Repo-Root, oder liegt das eigentliche Projekt in einem Unterordner?"
> Klärt: Wo liegt `src/`, wo liegt `.git/`, wo liegt `angular.json` bzw. `*.sln`?

**B4 — Backend-Architektur**
> „Wie ist das Backend aufgebaut? (z.B. Monolith / Microservices / BFF-Pattern / nur API)"
> Falls Microservices: „Welche Services gibt es, und wo liegen sie?"

**B5 — Frontend-Architektur**
> „Gibt es ein Frontend? Wenn ja: Single-SPA, mehrere Angular-Apps, Nx mit Libs?"

**B6 — Test-Strategie und Testframework**
> „Welche Test-Ebenen sind aktiv? (Unit / Integration / E2E / ArchUnit / keine)"
> „Welches Testframework gilt für .NET-Tests? (xUnit / NUnit / MSTest — welche Packages werden erwartet?)"
> „Welches für Angular? (Jasmine / Jest)"

**B7 — CI/CD und Deployment**
> „Wie wird deployed? (Azure DevOps Pipelines / GitHub Actions / manuell / Docker)"

**B8 — ADO-Anbindung**
> „Wird Azure DevOps für Work Items genutzt? Wenn ja: Organisation + Projekt?"

**B9 — Besonderheiten**
> „Gibt es Besonderheiten, die die AI bei jeder Konversation wissen sollte? (z.B. spezifische Namenskonventionen, verbotene Patterns, Compliance-Anforderungen)"

**AI gibt aus:** Ausgefüllten Steckbrief als Markdown-Tabelle zur Bestätigung.

---

### Phase C — Key Skills bestimmen [AI empfiehlt, User bestätigt]

Basierend auf dem Steckbrief wählt die AI aus dem verfügbaren Skill-Katalog:

| Skill | Aktivieren wenn… |
|-------|-----------------|
| `feature-delivery` | Immer — zentraler Orchestrator |
| `angular-developer` + `angular-developer-extension` | Angular im Stack |
| `angular-material` | Angular Material UI genutzt |
| `angular-new-app` / `angular-new-app-extension` | Neue Angular-App wird aufgebaut |
| `angular-refactor` | Refactoring-Tasks erwartet |
| `angular-cache-busting` | Deployment mit Cache-Problemen |
| `backend-ef-migrations` | EF Core im .NET-Backend |
| `ado` | Azure DevOps Work Items genutzt |
| `acceptance-design` | Anforderungen kommen als Stories |
| `grill-me` | Interaktive Story/Plan-Verfeinerung gewünscht |
| `codebase-analyzer` | Code-Review / Analyse-Aufgaben |
| `repo-scout-protocol` | Repo-Erkundung zu Beginn |
| `build-log-filter` | `ng serve` / Build-Logs filtern |
| `buddy-agent` | Pre-Planning / Sparring gewünscht |
| `delivery-inspection` | Anforderungserfüllungs-Gate vor Auslieferung |
| `skill-creator` | Neue Skills / Agents im Projekt erstellen |

**AI gibt aus:** Empfohlene Skill-Liste mit Begründung. User streicht oder ergänzt.

---

### Phase D — CLAUDE.md generieren [AI schreibt, User bestätigt]

AI erstellt einen CLAUDE.md-Entwurf mit folgenden Abschnitten:

```
# [Projektname] — Claude Code Guide

## Projekt-Steckbrief
[Kernzweck, Tech-Stack, Rahmenbedingungen aus Phase B]

## Workspace-Root-Struktur
[Verzeichnis-Übersicht mit Erklärung je Ordner, aus Phase A+B]
[Unterschied workspace-root vs. projekt-root falls abweichend]

## Backend-Architektur
[Solution/Projekt-Struktur, Schichtenmodell, Microservice-Übersicht]

## Frontend-Architektur
[Angular-App(s), Nx-Libs, App-Struktur]

## Key Skills
[Tabelle: Skill | Trigger | Zweck — nur die aus Phase C bestätigten]

## Verhaltensregeln
[Besonderheiten aus B9, ADO-Konfiguration, CI/CD-Hinweise]

## Parallelisierungsregeln
- Parallele Story-Agents NIEMALS mit `isolation: "worktree"` starten — direkt auf aktuellem Branch.
- requirement-definition liefert `touches`-Annotation und Parallelgruppen — nur Stories ohne Überschneidung dürfen gleichzeitig laufen.
- Stories mit überschneidenden `touches`: serialisieren.

## MCP-Konfiguration
[Verweis auf .mcp.json, Pflicht-MCPs, optionale MCPs]
```

**AI wartet auf Freigabe** bevor sie `CLAUDE.md` schreibt oder überschreibt.

Falls bereits eine `CLAUDE.md` existiert: AI zeigt ein Diff und fragt, welche Abschnitte übernommen, welche ersetzt werden sollen.

---

### Phase E — Verifikation [AI prüft automatisch]

1. `CLAUDE.md` im Workspace-Root vorhanden?
2. Alle genannten Skill-Pfade in `.claude/skills/` vorhanden?
3. ADO-Config: Falls `ado` aktiv — ist `.claude/skills/ado/config.defaults.json` ausgefüllt?
4. `.mcp.json` enthält `dev-mcp` und `codebase-analyzer`?
5. AI liest die fertige `CLAUDE.md` einmal vor und fasst in zwei Sätzen zusammen, was sie beim nächsten Start daraus ableiten würde.

---

## §1 — Voraussetzungen prüfen [Must-Have, automatisch prüfbar]

AI prüft automatisch, ob folgende MCPs/Tools erreichbar sind:

| Voraussetzung | Prüfung | Konsequenz bei Fehler |
|---|---|---|
| `dev-mcp` erreichbar | Einfaches Tool-Call | Gate-2 nicht ausführbar |
| `codebase-analyzer` erreichbar | Einfaches Tool-Call | review_git_diff nicht ausführbar |
| `jb inspectcode` CLI verfügbar | Shell: `jb --version` | run_inspectcode nicht nutzbar |

---

## §2 — Gate-2-Bootstrap [Must-Have, einmalig pro Kundenprojekt]

### 2a — .NET: ArchUnitNET installieren

Schritte (AI führt nach Bestätigung aus):

1. NuGet-Paket `ArchUnitNET` ins bestehende Test-Projekt installieren
2. Regelklasse aus `C:\Develop\Dv.Ai.Development\.claude\skills\feature-delivery\references\archunit-baseline-template.cs` ins Test-Projekt kopieren
3. Namespace anpassen auf Projekt-Namespace
4. Verdrahtung prüfen: `dotnet test` → ArchUnit-Tests müssen lauffähig sein (können initial fehlschlagen — das ist OK, Regeln werden dann angepasst)

### 2b — Angular: ESLint-Baseline installieren

Schritte (AI führt nach Bestätigung aus):

1. `@angular-eslint` installieren falls nicht vorhanden
2. ESLint-Konfiguration aus `C:\Develop\Dv.Ai.Development\.claude\skills\feature-delivery\references\eslint-baseline.json` als Basis verwenden/mergen
3. `ng lint` — muss durchlaufen (keine Fehler durch Baseline selbst)

---

## §3 — Optionale Maßnahmen [Entscheidungsfragen, interaktiv]

AI fragt für jede Maßnahme einzeln: "Möchtest du X einrichten? (ja/nein/später)"

### 3a — eslint-plugin-boundaries (Zonen-Architektur)

Wann: Wenn das Projekt eine core/shared/features-Struktur verwendet.
Was: Template aus `C:\Develop\Dv.Ai.Development\.claude\skills\feature-delivery\references\eslint-boundaries-template.js` als Startpunkt.

**Wichtig:** Zonen sind projektspezifisch — Vorlage vor Aktivierung an tatsächliche Ordnerstruktur anpassen. Start-Set: 4 Regeln (ApiService-Placement, Dumb-Components, Cross-Feature-Verbot, shared kennt keine Features).

Hinweis: eslint-plugin-boundaries prüft nur Import-Statements — Naming/Placement/DI-Schmuggel braucht `analyze_angular_architecture` (nachgelagert, Strang 3, noch nicht verfügbar).

### 3b — Custom ArchUnit-Regeln

Wann: Wenn Projektstruktur über die Baseline hinaus spezifische Regeln braucht.
Was: Regelklasse aus §2a erweitern.

### 3c — Plan-Persistenz-Pfad bestätigen

Default: `requests/plans/plan-<feature>.md`
Frage: Soll der Pfad abweichen? (z.B. anderen Ordner nutzen)

### 3d — Fehler-Format/-Strategie

Frage: Welches Format an der API-Grenze?
- ProblemDetails/RFC 7807 (empfohlen für .NET)
- Eigenes Format

Frage: Exceptions vs. Result-Pattern?

Frage: Resilience (Polly: Retry/Circuit Breaker/Timeout)? — Nur wenn Microservices

### 3e — Resilience (Polly)

Wann: Wenn Microservices oder externe Services angebunden werden.
Was: Retry-Policy, Circuit Breaker, Timeout-Policy definieren.

### 3f — Inter-Service-Kommunikation

Wann: Wenn Features service-übergreifend sind.
Frage: Message-Bus/Protokoll? Event-Contracts definiert?
Frage: Anti-Corruption-Layer vorhanden?

### 3g — Logging/Observability

Frage: Correlation-IDs / Distributed Tracing?
Frage: Config/Secrets-Handling (Vault, Environment Variables, Azure Key Vault)?
Frage: API-Versionierung (URL-Versioning, Header-Versioning)?

---

## §4 — Verifikation

Nach dem Setup:

- Build grün? (`dotnet build` / `ng build`)
- Lint grün? (`ng lint` — keine Fehler durch Baseline)
- ArchUnit-Tests lauffähig? (`dotnet test --filter ArchUnit`)
- Alle Voraussetzungen aus §1 noch erreichbar?

---

## §5 — Checkliste (Abschluss)

Was wurde eingerichtet — für spätere Referenz:

- [ ] **CLAUDE.md** erstellt / angepasst (§0b: Steckbrief, Struktur, Key Skills)
- [ ] MCPs erreichbar (dev-mcp, codebase-analyzer, jb inspectcode)
- [ ] `.mcp.json` konfiguriert (dev-mcp + codebase-analyzer Pflicht, ado optional)
- [ ] ADO: `.claude/skills/ado/config.defaults.json` ausgefüllt (falls genutzt)
- [ ] ArchUnitNET installiert + Regelklasse eingefügt
- [ ] ESLint-Baseline aktiv (`ng lint` grün)
- [ ] eslint-plugin-boundaries: ja / nein / später
- [ ] Plan-Persistenz-Pfad: `requests/plans/` (Default) / ___
- [ ] Fehler-Format: ProblemDetails / eigenes / ___
- [ ] Resilience: nein / Polly (Retry/CB/Timeout) / ___
- [ ] Inter-Service: nein / Bus: ___ / Event-Contracts: ___
- [ ] Logging: Correlation-IDs: ja/nein / Tracing: ja/nein / Secrets: ___
- [ ] Parallelisierungsregel in CLAUDE.md: kein `isolation: "worktree"` für parallele Story-Agents

---

## §6 — Skill- & Prozess-Schnellreferenz

Schnellreferenz für den Einstieg in die AI-Workflow-Skills dieses Repos.

### Kernprozess: Von der Anforderung zum Code

```
Roher Stakeholder-Wunsch
     │
     ▼
/requirement-definition → Epic→Feature→Story Breakdown + F1-Akzeptanzkriterien (requests/)
     │
     ▼
/software-design-principles  → Nordstern + Flow Design + IODA/IOSP + persönliche Regeln
     │
     ▼
/feature-delivery → Plan + Umsetzung (.NET + Angular)  [lädt software-design automatisch]
     │
     ▼
/delivery-inspection → 6-Reviewer Anforderungserfüllungs-Gate
```

### Skill-Übersicht

#### Entwurf & Planung

| Skill | Trigger | Einsatz |
|-------|---------|---------|
| `/software-design-principles` | `meine Prinzipien`, `@software-design-principles`, `flow design`, `Entwurf erstellen` | **Nordstern**: sauber · funktional · getestet · wartbar · nachhaltig. Enthält Flow Design, IODA/IOSP, SOLID + persönliche Regeln. Gilt automatisch für feature-delivery. |
| `/requirement-definition` | `ich brauche ein Feature für…`, `schneide das in Stories`, `Anforderung erfassen` | Roher Stakeholder-Wunsch → entwicklungsfertige Arbeitspakete: Epic→Feature→Story Breakdown (INVEST, Richard-Lawrence-Splitting), F1-Akzeptanzkriterien, persistente Dateien unter `requests/`. |
| `/feature-delivery` | `plane`, `implementiere`, `fix`, `setze um` | Vollständige Feature-Umsetzung (.NET + Angular): Plan + Umsetzung. Drei Einstiege: Plan-only, End-to-end, From-existing-plan. |
| `/acceptance-design` | `schärfe Anforderung`, `Akzeptanzkriterien` | Anforderungen auf Testbarkeit prüfen und schärfen (tiefer, standalone AC-Audit). |
| `/grill-me` | `grill mich`, `befrage diese Story`, `schärf den Plan`, `hinterfrage den Plan` | Interaktives Verhör einer Story/Plan: eine Frage + Empfehlung bis alle Entscheidungszweige klar. |

#### Code & Analyse

| Skill | Trigger | Einsatz |
|-------|---------|---------|
| `/dev-tooling` | `welcher MCP`, `MCP-Einstieg`, Dev-Tooling-Fragen | **Gateway**: Routing zu dev-mcp, codebase-analyzer, build-log-filter — Einstieg bei MCP-Auswahl-Fragen. |
| `/dev-mcp` | Dateien lesen/suchen, Scaffolding, Build, Test | 49 Tools — MCP-First-Gate für alle Dev-Operationen. |
| `/codebase-analyzer` | Code-Review, Analyse, Refactoring | 43 MCP-Tools für Angular/.NET statische Analyse. |
| `/code-intel-workflow` | Symbol suchen, Rename-Impact | MCP-Routing: narrow→read→impact→verify. |
| `/test-design` | *(interne Dep.)* | AAA · Namenskonvention · Magic Strings — Pflicht für Scribes, implement-review-Agents, Fix-Planer in feature-delivery. |
| `/delivery-inspection` | Vor Auslieferung | 6-Reviewer Anforderungserfüllung — universell für Code, Skill, Doku. |

#### Angular & .NET

| Skill | Trigger | Einsatz |
|-------|---------|---------|
| `/angular-new-app` | `ng new`, neues Projekt | Bundle: ng new + generate, Decision Gate (Questionnaire), Implementierungsplan, Subagents (docs-check → skeleton → quality-runner). |
| `/angular-developer` | Angular-Arbeit | Bundle: Language API (Signals, DI, Routing, Forms, Testing), Projektstruktur (Feature-Facades, Smart/Dumb, Pages), Signal-Architektur, Test-Policy, Migrationen (legacy → modern). |
| `/angular-material` | Material Components | Bundle: Komponenten, Theming, CDK + Custom mat-form-field Inputs (MatFormFieldControl, Shell + Direktive). |
| `/backend-ef-migrations` | EF-Migration | Entity Framework Core. |
| `/build-log-filter` | Build-Fehler filtern | Log-Kompression für ng/dotnet. |

#### Utilities

| Skill | Trigger | Einsatz |
|-------|---------|---------|
| `/commit-message` | `commit message`, `erstelle commit` | Commit-Titel und -Beschreibung generieren. |
| `/skill-creator` | `create skill`, `agent profil` | Neue Skills und Agent-Profile erstellen. |
| `/prozess-retrospektive` | `retrospektive`, `prozess analyse`, `harness verbessern` | Arbeitsprozess analysieren — MCP-Qualität, Reviewer-Effizienz, Reibungspunkte, Harness-Ideen. |
| `/de-en-communication` | *(immer aktiv)* | Kommunikationsregeln für alle Interaktionen: Text→DE, Code/Kommentare/Logs→EN, Voice→DE+EN-Mix. |

### Flow Design — Schnellstart

Flow Design überbrückt den **Requirements-Logic-Gap**: die Lücke zwischen Anforderung und Code.

**Die 5 Phasen:**

1. **Analyse** — System-Umwelt-Diagramm, Dialoge und Interaktionen finden
2. **Entwurf in die Breite** — Alle Interaktionen auf oberster Ebene skizzieren
3. **Entwurf in die Tiefe** — Eine Interaktion vollständig verfeinern (≤ 4h je Funktionseinheit)
4. **Klassenzuordnung** — Aspekte → Kohäsion → Klassennamen
5. **Implementation** — Code spiegelt den Entwurf

**Die drei Aspekte (nie vermischen):**

| Symbol | Aspekt | Regel |
|--------|--------|-------|
| `□` Portal | Ui, API, Konsole | Dünn, keine Domänenlogik |
| `○` Domänenlogik | Interaktoren, reine Logik | Frei von UI und Ressourcen |
| `△` Provider | DB, Dateien, externe APIs | Endet auf `Provider` |

Vollständige Referenz: [`.claude/skills/software-design-principles/`](.claude/skills/software-design-principles/)

### MCP-Server

| Server | Transport | Zweck |
|--------|-----------|-------|
| `dev-mcp` | stdio `C:\Develop\.apps\dev-mcp\Dev.Mcp.exe` | 49 Tools: filesystem, dotnet, angular, git, patch |
| `codebase-analyzer` | stdio `C:\Develop\.apps\codebase-analyzer\index.js` | Statische Analyse, Index, Review |
| `build-log-filter` | Docker HTTP Port 8089 | Build/Test-Log-Kompression |
