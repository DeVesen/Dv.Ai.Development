# .NET — Regressions-Audit Playbook

## Voraussetzung

Stack-Erkennung hat `.sln` oder `.csproj` bestätigt.
Solution-Struktur und Anzahl der Projekte vor dem ersten Schritt prüfen.

---

## Schritt 1: Betroffene Projekte eingrenzen

```bash
# Geänderte .cs-Dateien der letzten N Tage
git log --oneline --since="N days ago" --name-only --diff-filter=ACMR -- "*.cs"
```

Aus den geänderten Dateipfaden die zugehörigen `.csproj`-Projekte ableiten.
Audit auf diese Projekte beschränken — nicht die gesamte Solution auditieren.

**Mehrere Projekte mit Abhängigkeiten:** Solution-Graph prüfen.
Änderung in einem Shared-/Core-Projekt kann mehrere abhängige Projekte betreffen.
`dotnet-affected` (falls installiert) für automatisches Graph-Scoping verwenden.

---

## Schritt 2: Regressions-Signal prüfen (Y nicht mitgezogen?)

| Änderung X | Erwartetes Y |
|------------|-------------|
| Produktivklasse geändert | Entsprechendes Test-Projekt hat zugehörige Testklasse geändert |
| Interface-Signatur erweitert | Alle Implementierungen + Mock-Klassen in Tests angepasst |
| Neues Feld in Entity/DTO | Mapping, Validierung und zugehörige Tests mitgezogen |
| Konfigurationsstruktur geändert | Tests mit Konfigurationssetup angepasst |
| DB-Schema (Migration) geändert | Integrationstests oder Repository-Tests reflektieren neue Struktur |

Fehlende Y-Dateien → gelb. Geänderte Interface-Signatur ohne Mock-Anpassung → rot.

---

## Schritt 3: Tests ausführen

**Welches Test-Framework** (MSTest, xUnit, NUnit, …) bestimmt das Projekt — nicht dieser Skill.
Den konfigurierten Test-Runner des Projekts verwenden:

```bash
# Scoped auf betroffene Projekte
dotnet test <PfadZumTestProjekt> --filter <Namespace-oder-Klasse>

# Alle Test-Projekte der Solution
dotnet test <Solution.sln>
```

Filter-Strategie: Geänderte Klasse `OrderService.cs` → Filter auf `OrderServiceTests`
oder den entsprechenden Namespace eingrenzen.

---

## Schritt 4: Test-Drift-Signal

```bash
git log --oneline --since="N days ago" --name-only --diff-filter=M -- "*.Tests/**" "*Tests.cs" "*Specs.cs"
```

Commit-Message und ggf. PR-Beschreibung auf Anforderungsänderungen prüfen.
Testdatei geändert ohne erkennbare fachliche Änderung → gelb im Test-Drift-Abschnitt.

---

## Report-Hinweise für .NET

- Geänderte `appsettings.json` ohne angepasste Konfigurationstest-Fixtures → immer prüfen.
- EF Core Migrations ohne Integrationstests → explizit als Lücke benennen.
- Fehlende Mock-Anpassungen bei geänderten Interfaces sind der häufigste stille Regressionspfad.
