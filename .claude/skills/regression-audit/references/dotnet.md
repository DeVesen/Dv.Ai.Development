# .NET — Regressions-Audit Playbook

## Voraussetzung

Stack-Erkennung hat `.sln` oder `.csproj` bestätigt.
Solution-Struktur und Anzahl der Projekte vor dem ersten Schritt prüfen.
Intent-Extraktion (→ `commit-intent.md`) muss abgeschlossen sein.

---

## Schritt 1: Betroffene Projekte eingrenzen

```bash
# Geänderte .cs-Dateien der letzten N Tage
git log --oneline --since="N days ago" --name-only --diff-filter=ACMR -- "*.cs"
```

Aus den geänderten Dateipfaden die zugehörigen `.csproj`-Projekte ableiten.
Alle in N Tagen berührten Projekte **als Gesamtmenge** notieren — nicht pro Commit trennen.

**Mehrere Projekte mit Abhängigkeiten:** Solution-Graph prüfen.
Änderung in einem Shared-/Core-Projekt betrifft alle abhängigen Projekte.
`dotnet-affected` (falls installiert) für automatisches Graph-Scoping verwenden.

---

## Schritt 2: Verhaltens-Verifikation (kumulativ)

Die Verifikation läuft **einmalig pro Bereich** gegen den aktuellen Stand — nicht isoliert
pro Commit. Intent aus `commit-intent.md` ist der Maßstab.

| Aktueller Intent (aus letztem Commit) | Was zu prüfen ist |
|---------------------------------------|-------------------|
| „add <Feature>" | Feature vorhanden + Test deckt es ab |
| „extend <Klasse/Service>" | **Gesamte** Klasse testen — nicht nur die neue Methode |
| „fix <Problem>" | Fehler-Szenario tritt nicht mehr auf |
| „refactor <Bereich>" | Alle bisherigen Tests noch grün, kein Verhalten-Delta |

**Kumulativ bedeutet:** Ein Service, der in 3 verschiedenen Commits berührt wurde,
wird **einmal** vollständig getestet — nicht dreimal mit Teilscope.

**Tests ausführen** — welches Test-Framework (MSTest, xUnit, NUnit, …) bestimmt das Projekt:

```bash
# Scoped auf betroffene Projekte
dotnet test <PfadZumTestProjekt> --filter <Namespace-oder-Klasse>

# Gesamte Solution
dotnet test <Solution.sln>
```

Filter-Strategie: Geänderte `OrderService.cs` → Filter auf `OrderServiceTests` oder Namespace.

---

## Schritt 3: TDD-Verletzungs-Signal

Feature hinzugefügt ohne begleitenden Test?

```bash
# Neue Produktivdateien (keine Test-Projekte) der letzten N Tage
git log --since="N days ago" --diff-filter=A --name-only -- "*.cs" | grep -v "Tests\|Specs\|test\|spec"
```

Pro gefundener neuer Datei prüfen:
1. Existiert eine `*Tests.cs` / `*Specs.cs` im **selben Commit-Diff**? → kein Signal
2. Existiert eine Testdatei in einem **unmittelbaren Folge-Commit** mit erklärender Message? → gelb (TDD verletzt, aber nachgeholt)
3. Keine Testdatei zu finden? → **rot** (Klasse ungetestet)

> Dieses Signal ist eigenständig — nie mit Test-Drift vermischen.

---

## Schritt 4: Test-Drift-Signal

Testdatei geändert ohne erkennbare Anforderungsänderung:

```bash
git log --oneline --since="N days ago" --diff-filter=M --name-only -- "*.Tests/**" "*Tests.cs" "*Specs.cs"
```

Commit-Message und ggf. PR-Beschreibung auf fachliche Änderungen prüfen.
Testdatei geändert ohne erkennbaren Grund → gelb im Test-Drift-Abschnitt.

---

## Report-Hinweise für .NET

- `extend`-Commits auf Shared-/Core-Projekte sind das höchste Regressions-Risiko: alle abhängigen Projekte mitprüfen.
- Geänderte Interface-Signatur ohne Mock-Anpassung in Test-Projekten → rot.
- Geänderte `appsettings.json` ohne angepasste Konfigurations-Fixtures → immer prüfen.
- EF Core Migrations ohne Integrationstests → explizit als Lücke benennen.
