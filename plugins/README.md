# Plugins

Claude-Code-Plugins dieses Repositories. Ein Plugin bündelt **Skills** (Wissen und Arbeitsanweisungen, die Claude bei passender Aufgabe lädt), **Agents** (spezialisierte Subagents) und teils **Hooks** und **Scripts**.

## Übersicht

| Plugin | Version | Zweck |
|---|---|---|
| [`dv-forge`](forge/README.md) | 0.18.0 | Spezifizieren, Planen und Umsetzen mit orchestrierten Review-Loops |
| [`dv-dotnet`](dotnet/README.md) | 1.2.0 | .NET-Skills: Toolchain, EF-Migrations, xUnit-Konventionen |
| [`dv-angular`](angular/README.md) | 1.2.0 | Angular-Skills: Komponenten, Signals, Routing, Forms, Testing, Toolchain |
| [`dv-craft`](craft/README.md) | 1.0.1 | Software-Design-Skills: Clean Code, Architekturstile, Modulith, Testing |
| [`dv-working-capturing`](working-capturing/README.md) | 1.0.0 | Projektwissen festhalten: Glossar, Modul- und Feature-Profile |
| [`dv-kickoff`](kickoff/README.md) | 0.2.0 | Projekt-Kickoff: Brief, Architekturentwurf, Orientierung für Agenten |

## Aufbau eines Plugins

```text
plugins/<name>/
├── .claude-plugin/plugin.json   Name, Version, Beschreibung
├── skills/<skill>/SKILL.md      Skills
├── agents/                      Subagents (je Plugin optional)
├── hooks/, scripts/, bin/       Automatisierung (je Plugin optional)
└── tests/                       Tests für Scripts und Hooks (je Plugin optional)
```

## Zusammenspiel

- **Workflow:** `dv-forge` führt durch Spec, Plan und Umsetzung und ruft dabei die Review-Agents auf.
- **Stack:** `dv-dotnet` und `dv-angular` liefern Toolchain und Konventionen für den jeweiligen Stack.
- **Prinzipien:** `dv-craft` liefert die Design-Leitplanken, nach denen Code entworfen und geprüft wird.
- **Projektwissen:** `dv-working-capturing` hält Begriffe, Module und Features fest, damit spätere Arbeit darauf aufbauen kann.

## Installation

Alle Plugins außer dem Kickoff sind über den Marketplace dieses Repositories installierbar, siehe [Haupt-README](../README.md#plugins-installieren).
