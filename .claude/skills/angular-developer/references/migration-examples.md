# Migration examples (legacy → modern)

Short snippets for quick copy-paste in the target codebase. **Deeper** migration and API rules: [migrations.md](migrations.md).

| Topic | Reference |
|--------|-----------|
| `@Input()` → `input()` / `input.required()` | [migration-input.md](migration-input.md) |
| `@Output()` + `EventEmitter` → `output()` | [migration-output.md](migration-output.md) |
| `*ngIf` → `@if` / `@else` | [migration-if.md](migration-if.md) |
| `*ngFor` + `trackBy` → `@for` + `track` | [migration-for.md](migration-for.md) |
| `*ngSwitch` → `@switch` | [migration-switch.md](migration-switch.md) |
| Full component sketch | [migration-component-example.md](migration-component-example.md) |
