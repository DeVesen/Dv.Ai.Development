---
name: toolchain
description: Use when the user asks to build, compile, test or lint an Angular app ("baue", "teste", "kompiliere", "lint", "führe die Tests aus", "Build prüfen", "laufen die Tests durch") and before any dev-mcp build_angular_project, test_angular_project or raw ng build, ng test, ng lint or npm test call.
---

# Angular: bauen, testen, linten

Die Befehle laufen im **Bash-Tool**, nicht im PowerShell-Tool. Sie liefern Status, Zusammenfassung und Fehler; das Volllog liegt in einer Datei, der Verweis steht in der Ausgabe. Lade das Log nie in den Kontext.

| Aufgabe | Befehl |
|---|---|
| Bauen | `dv-angular-build --root <Workspace>` |
| Testen | `dv-angular-test --root <Workspace>` |
| Linten | `dv-angular-lint --root <Workspace>` |

`<Workspace>` ist der Ordner mit der `angular.json`; die Anwendungen und Bibliotheken darin zählen nicht einzeln. Argumente nach `--` gehen an `ng` weiter, z. B. `dv-angular-test --root <Workspace> -- --include src/app/x.spec.ts`. Ohne gültige Argumente zeigt der Befehl seine Syntax.

**Ohne genannten Pfad:** Gibt es im Repo genau einen Workspace, nimm ihn. Gibt es mehrere, frag, welcher gemeint ist, und starte nichts.

Nicht `build_angular_project` oder `test_angular_project` von dev-mcp und nicht `ng build|test|lint` oder `npm test` in der Shell.
