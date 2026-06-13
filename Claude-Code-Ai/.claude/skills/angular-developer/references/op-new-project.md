# Operation: Neues Projekt

**Trigger-Keywords:** `ng new`, `new project`, `neues Projekt`, `create project`, `Projekt erstellen`

## Verhalten bei fehlenden Vorgaben

1. Neueste stabile Angular-Version verwenden.
2. Signal Forms für neue Formulare (Angular v21+) → [signal-forms.md](signal-forms.md).

## `ng new`-Ausführungsregel

| Situation | Befehl |
|-----------|--------|
| Nutzer nennt Version | `npx @angular/cli@<version> new <project-name>` |
| Keine Version, CLI vorhanden (`ng version` OK) | `ng new <project-name>` |
| Keine Version, CLI fehlt | `npx @angular/cli@latest new <project-name>` |

## Nach Projekterstellung

- Build via **dev-angular-mcp** ausführen: `build_angular_project` — Fehler analysieren und beheben — Pflicht.
- **VERBOTEN:** `ng build` als Shell-Kommando.

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

## Relevante Referenzen

- CLI-Optionen → [cli.md](cli.md)
- Signal Forms (v21+) → [signal-forms.md](signal-forms.md)
