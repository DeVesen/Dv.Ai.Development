---
name: toolchain
description: Use when the user asks to build, compile, test or lint .NET code ("baue", "teste", "kompiliere", "lint", "führe die Tests aus", "Build prüfen", "laufen die Tests durch") and before any dev-mcp build_dotnet_solution, test_dotnet_solution or raw dotnet build/test call.
---

# .NET: bauen, testen, linten

Die Befehle laufen im **Bash-Tool**, nicht im PowerShell-Tool. Sie liefern Status, Zusammenfassung und Fehler; das Volllog liegt in einer Datei, der Verweis steht in der Ausgabe. Lade das Log nie in den Kontext.

| Aufgabe | Befehl |
|---|---|
| Bauen | `dv-dotnet-build --path <Solution>` |
| Testen | `dv-dotnet-test --path <Solution>` |
| Linten | `dv-dotnet-lint --path <Solution>` |

`<Solution>` ist eine .sln/.slnx, ein csproj oder ein Ordner. Argumente nach `--` gehen an dotnet weiter, z. B. `dv-dotnet-test --path <Solution> -- --filter <Name>`. Ohne gültige Argumente zeigt der Befehl seine Syntax.

**Ohne genannten Pfad:** Gibt es im Repo genau eine Solution, nimm sie. Gibt es mehrere, frag, welche gemeint ist, und starte nichts.

Nicht `build_dotnet_solution` oder `test_dotnet_solution` von dev-mcp und nicht `dotnet build|test` in der Shell.
