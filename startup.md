# Dv.Ai.Development — Startup Guide

Schnellreferenz für den Einstieg in die AI-Workflow-Skills dieses Repos.

---

## Kernprozess: Von der Anforderung zum Code

```
Anforderung
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

---

## Skill-Übersicht

### Entwurf & Planung

| Skill | Trigger | Einsatz |
|-------|---------|---------|
| `/software-design-principles` | `meine Prinzipien`, `@software-design-principles`, `flow design`, `Entwurf erstellen` | **Nordstern**: sauber · funktional · getestet · wartbar · nachhaltig. Enthält Flow Design, IODA/IOSP, SOLID + persönliche Regeln. Gilt automatisch für feature-delivery. |
| `/feature-delivery` | `plane`, `implementiere`, `fix`, `setze um` | Vollständige Feature-Umsetzung (.NET + Angular): Plan + Umsetzung. Drei Einstiege: Plan-only, End-to-end, From-existing-plan. |
| `/acceptance-design` | `schärfe Anforderung`, `Akzeptanzkriterien` | Anforderungen auf Testbarkeit prüfen und schärfen. |

### Code & Analyse

| Skill | Trigger | Einsatz |
|-------|---------|---------|
| `/dev-tooling` | `welcher MCP`, `MCP-Einstieg`, Dev-Tooling-Fragen | **Gateway**: Routing zu dev-mcp, codebase-analyzer, build-log-filter — Einstieg bei MCP-Auswahl-Fragen. |
| `/dev-mcp` | Dateien lesen/suchen, Scaffolding, Build, Test | 49 Tools — MCP-First-Gate für alle Dev-Operationen. |
| `/codebase-analyzer` | Code-Review, Analyse, Refactoring | 43 MCP-Tools für Angular/.NET statische Analyse. |
| `/code-intel-workflow` | Symbol suchen, Rename-Impact | MCP-Routing: narrow→read→impact→verify. |
| `/test-design` | *(interne Dep.)* | AAA · Namenskonvention · Magic Strings — Pflicht für Scribes, implement-review-Agents, Fix-Planer in feature-delivery. |
| `/delivery-inspection` | Vor Auslieferung | 6-Reviewer Anforderungserfüllung — universell für Code, Skill, Doku. |

### Angular & .NET

| Skill | Trigger | Einsatz |
|-------|---------|---------|
| `/angular-new-app` | `ng new`, neues Projekt | Bundle: ng new + generate, Decision Gate (Questionnaire), Implementierungsplan, Subagents (docs-check → skeleton → quality-runner). |
| `/angular-developer` | Angular-Arbeit | Bundle: Language API (Signals, DI, Routing, Forms, Testing), Projektstruktur (Feature-Facades, Smart/Dumb, Pages), Signal-Architektur, Test-Policy, Migrationen (legacy → modern). |
| `/angular-material` | Material Components | Bundle: Komponenten, Theming, CDK + Custom mat-form-field Inputs (MatFormFieldControl, Shell + Direktive). |
| `/backend-ef-migrations` | EF-Migration | Entity Framework Core. |
| `/build-log-filter` | Build-Fehler filtern | Log-Kompression für ng/dotnet. |

### ADO & Utilities

| Skill | Trigger | Einsatz |
|-------|---------|---------|
| `/ado` | `load story`, `analyse`, `save` | Azure DevOps Work Items ↔ Markdown. |
| `/commit-message` | `commit message`, `erstelle commit` | Commit-Titel und -Beschreibung generieren. |
| `/skill-creator` | `create skill`, `agent profil` | Neue Skills und Agent-Profile erstellen. |
| `/prozess-retrospektive` | `retrospektive`, `prozess analyse`, `harness verbessern` | Arbeitsprozess analysieren — MCP-Qualität, Reviewer-Effizienz, Reibungspunkte, Harness-Ideen. |

---

## Flow Design — Schnellstart

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

---

## MCP-Server

| Server | Transport | Zweck |
|--------|-----------|-------|
| `dev-mcp` | stdio `C:\Develop\.apps\dev-mcp\Dev.Mcp.exe` | 44 Tools: filesystem, dotnet, angular, git, patch |
| `codebase-analyzer` | stdio `C:\Develop\.apps\codebase-analyzer\index.js` | Statische Analyse, Index, Review |
| `build-log-filter` | Docker HTTP Port 8089 | Build/Test-Log-Kompression |

---

## Feature-Delivery auf neuem Projekt einrichten

Voraussetzungen prüfen und Bootstrap-Setup: [`.claude/skills/feature-delivery/`](.claude/skills/feature-delivery/)
