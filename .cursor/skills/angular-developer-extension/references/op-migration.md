# Operation: Migration (Legacy → Modern)

Migriert Legacy-Angular-Patterns auf moderne Syntax (Signals, Control Flow, etc.).

**Vollständige Snippets:** [migration-examples.md](migration-examples.md)

**Auch laden:** [../../angular-developer/SKILL.md](../../angular-developer/SKILL.md) für tiefere API-Regeln und [../../angular-developer/references/migrations.md](../../angular-developer/references/migrations.md) für Migration-Tooling.

---

## Überblick der Migrations-Topics

| Topic | Snippet-Referenz |
|-------|-----------------|
| `@Input()` → `input()` / `input.required()` | [migration-input.md](migration-input.md) |
| `@Output()` + `EventEmitter` → `output()` | [migration-output.md](migration-output.md) |
| `*ngIf` → `@if` / `@else` | [migration-if.md](migration-if.md) |
| `*ngFor` + `trackBy` → `@for` + `track` | [migration-for.md](migration-for.md) |
| `*ngSwitch` → `@switch` | [migration-switch.md](migration-switch.md) |
| Vollständiges Komponenten-Beispiel | [migration-component-example.md](migration-component-example.md) |

---

## Hinweise

- Version prüfen: `package.json` → `@angular/core` — APIs und Empfehlungen unterscheiden sich je Major.
- Nach Migration: `ng build` ausführen und Compile-Fehler beheben ([op-layout.md](op-layout.md) Tooling).
- Signal-State-Migration (BehaviorSubject → signal): [signal-architecture.md](signal-architecture.md).
