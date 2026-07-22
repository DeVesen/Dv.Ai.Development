# Stack-Erkennung

Reihenfolge ist wichtig — zuerst die stärksten Signale prüfen.

## Erkennungs-Reihenfolge

| Priorität | Signal | Erkannter Stack |
|-----------|--------|-----------------|
| 1 | `angular.json` + `package.json` mit `@angular/core` | Angular → `references/angular.md` |
| 2 | `*.sln` oder `*.csproj` im Root / Unterordner | .NET → `references/dotnet.md` |
| 3 | `CLAUDE.md` + `.claude/skills/` vorhanden, kein Produktivcode | Harness-Repo → `references/harness-repo.md` |
| 4 | Nur Markdown / YAML / JSON, keine Build-Artefakte | Doku-/Config-Repo → `references/harness-repo.md` |
| 5 | Keines der obigen | Unbekannter Stack → Generischer Fallback (siehe unten) |

## Monorepo-Erkennung

Liegt eine der folgenden Dateien vor, handelt es sich um ein Monorepo:

- `nx.json` → Nx-Monorepo (beachte `affected`-Mechanismus in `references/angular.md`)
- `pnpm-workspace.yaml` / `yarn.lock` + mehrere `package.json` in Unterordnern
- Mehrere `.sln`-Dateien oder ein Solution mit mehreren `.csproj`

Im Monorepo: Scope auf die von Änderungen betroffenen Teilprojekte einschränken,
nicht das gesamte Repo auditieren.

## Test-Tooling erkennen

Erst nach Stack-Erkennung ausführen:

```
- Existiert ein Test-Verzeichnis? (test/, tests/, spec/, __tests__/, **/*.spec.ts, **/*Test.cs, ...)
- Existiert ein Test-Skript in package.json ("test", "test:unit", "test:e2e")?
- Existiert ein dotnet-Test-Projekt (*.Tests.csproj, *.Specs.csproj)?
- Welche Test-Runner finden sich in devDependencies / NuGet-Packages?
```

Wenn kein Test-Tooling gefunden: explizit im Report vermerken.
Test-Drift-Signal entfällt dann — stattdessen Referenzintegrität prüfen (→ `harness-repo.md`).

## Generischer Fallback (kein Playbook vorhanden)

Wenn kein `references/<stack>.md` existiert:

1. Im Report **explizit** schreiben: „Für diesen Stack existiert noch kein Playbook."
2. Trotzdem Git-Log analysieren und versuchen, Bereiche zu identifizieren.
3. Kernfrage anwenden: *Gibt es Änderungen ohne begleitende Test- oder Referenz-Anpassung?*
4. Report mit dem Hinweis abschließen, was ein zukünftiges Playbook abdecken sollte.
