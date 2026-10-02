# dv-dotnet

.NET-Skills für Claude Code: Toolchain (bauen, testen, linten), EF-Core-Migrations und Test-Konventionen.

## Skills

| Skill | Wofür |
|---|---|
| `dotnet` | Allgemeines .NET-Backend-Wissen und Konventionen |
| `toolchain` | .NET bauen, testen und linten über die vorgesehene Toolchain statt roher `dotnet`-Aufrufe |
| `dotnet-ef-migrations` | EF-Core-Migrations gegen Postgres anlegen, prüfen und reparieren (Snapshot-Drift, Views, Spaltenfehler) |
| `dotnet-xunit-conventions` | Tests mit xUnit v3, FluentAssertions, Moq und WebApplicationFactory: AAA, Namensschema, Spiegelung der Produktionsstruktur |
| `init` | dv-dotnet in einem Projekt einrichten und die Projekt-`CLAUDE.md` auf Toolchain und Konventionen verweisen lassen |

Zusätzlich liegen unter `bin/`, `scripts/` und `hooks/` die Hilfsmittel der Toolchain, unter `tests/` deren Tests.

## Einrichten

```text
/plugin install dv-dotnet@dv-ai-development
```

Danach im Projekt `/dv-dotnet:init` ausführen.
