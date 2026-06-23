---
name: test-design
description: >
  Test-Konventionen (Backend + Frontend): AAA, Namenskonvention Given/With/Expected,
  Magic-String-Vermeidung, Bestand respektieren. Framework-Routing: .cs/.csproj → frameworks/dotnet;
  .spec.ts/angular → frameworks/angular. .NET: xUnit v3, FluentAssertions,
  Moq, WebApplicationFactory. Angular: Karma, Jasmine, TestBed, HttpTestingController.
  Trigger: Unit-Test, Integrationstest, spec.ts, xUnit, Moq, Jasmine, Test-Klasse,
  dotnet test, ng test, @testing-design, Backend-/Frontend-Test.
---

# Testing Design

Stackübergreifende Test-Konventionen plus framework-spezifische Regeln unter `frameworks/`.

## Wann dieser Skill gilt

- Neuer oder angepasster Test (Unit oder Integration / Integration-style)
- Code-Änderung, die Test-Absicherung braucht
- Gezielt: `@testing-design`
- Explizit: Refactor eines bestehenden Test-Projekts, einer Spec- oder Test-Klasse

**Opt-out:** `ohne testing-design`, `ohne test-environment-skill`

## Ladereihenfolge

1. **Immer:** [references/naming-and-aaa.md](references/naming-and-aaa.md), [references/avoid-magic-strings.md](references/avoid-magic-strings.md)
2. **Kontext ist .NET** (`.cs`, `tests/`, `.csproj`, `dotnet test`) → [frameworks/dotnet.md](frameworks/dotnet.md) und dort verlinkte Templates
3. **Kontext ist Angular** (`*.spec.ts`, `ng test`, Angular-Imports) → [frameworks/angular.md](frameworks/angular.md) und dort verlinkte Templates; Mechanik (TestBed, Harnesses) zusätzlich [angular-developer](../angular-developer/SKILL.md) bei Bedarf

## Gemeinsame Konventionen (Kurz)

### AAA

Jeder Test folgt **Arrange – Act – Assert** mit Kommentaren `// Arrange`, `// Act`, `// Assert` (wo der Stack das unterstützt).

### Namenskonvention

```
<MethodName>_<AusgangssituationUndEingabe>_<ErwartetesErgebnis>
```

Details und Schlecht-vs-gut: [references/naming-and-aaa.md](references/naming-and-aaa.md). Sprachbeispiele: [frameworks/dotnet/naming-examples.md](frameworks/dotnet/naming-examples.md), [frameworks/angular/naming-examples.md](frameworks/angular/naming-examples.md).

### Magic Strings

Fachlich gekoppelte String-Literale nicht duplizieren — siehe [references/avoid-magic-strings.md](references/avoid-magic-strings.md).

### Bestand und Migration (alle Stacks)

| Situation | Verhalten |
|-----------|-----------|
| **Neue Test-Datei / -Klasse** | Voller Konventions-Stack des jeweiligen Frameworks |
| **Bestehende Datei erweitern** | Neue Tests nach Konvention; bestehende Namen **nicht** zwangsmigrieren |
| **Bestehende Methode/`it` anpassen** | Konventionen auf den geänderten Test anwenden; Framework/Runner unverändert |
| **Umstrukturierung** (Ordner, Namespace, Split, Umbenennung) | **Nur** auf ausdrücklichen Nutzerwunsch |
| **Framework-Wechsel** (z. B. MSTest→xUnit, Karma→Vitest) | **Nur** auf ausdrücklichen Nutzerwunsch |
| **Ganzes Test-Projekt / Suite** anfassen | **Nur** auf ausdrücklichen Nutzerwunsch |

**VERBOTEN ohne ausdrücklichen Wunsch:** Mitläufer-Migration, automatisches Umbenennen unberührter Tests, Framework-Wechsel „nebenbei“.

## Verifikation

| Stack | MCP |
|-------|-----|
| Backend | `test_dotnet_solution` via `dev-mcp` |
| Frontend | `test_angular_project` via `dev-mcp` |

Kein Shell-`dotnet test` / `ng test` ohne MCP-Freigabe.

## Referenzen

| Thema | Datei |
|-------|-------|
| AAA, Namensschema (generisch) | [references/naming-and-aaa.md](references/naming-and-aaa.md) |
| Magic Strings (generisch) | [references/avoid-magic-strings.md](references/avoid-magic-strings.md) |
| .NET (Router) | [frameworks/dotnet.md](frameworks/dotnet.md) |
| Angular (Router) | [frameworks/angular.md](frameworks/angular.md) |
