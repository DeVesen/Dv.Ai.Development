---
name: angular-migration
description: Use when migrating Angular code from legacy patterns to modern equivalents — @Input/@Output to input()/output(), *ngIf/*ngFor/*ngSwitch to @if/@for/@switch, NgModule to standalone, Karma/Jasmine tests to Vitest, or zone.js to zoneless change detection. Triggers on "migrate", legacy directive syntax found in a template, or questions about which @angular/core or @schematics/angular schematic to run.
---

# Angular Migration (Legacy → Modern)

Check `package.json` → `@angular/core` version first — APIs and recommendations differ by major. Prefer official automated schematics over manual text replacement when migrating a whole codebase (see below); use the snippets below for one-off or partial migrations.

## `@Input()` → `input()`

```typescript
// Legacy
@Input() title = '';
@Input() count?: number;

// Modern (Angular 19+)
title = input.required<string>();
count = input<number>();     // undefined if not bound
disabled = input(false);     // optional with default
```

Template: `{{ title }}` → `{{ title() }}`.

## `@Output()` + `EventEmitter` → `output()`

```typescript
// Legacy
@Output() clicked = new EventEmitter<void>();

// Modern
clicked = output<void>();
```

`.emit()` call sites and parent template bindings (`(clicked)="..."`) stay the same.

## `*ngIf` → `@if`/`@else`

```html
<!-- Legacy -->
<div *ngIf="isLoading; else content">Loading…</div>
<ng-template #content><app-main /></ng-template>

<!-- Modern -->
@if (isLoading()) { <div>Loading…</div> } @else { <app-main /> }
```

Use `()` if the condition is a signal, plain property name if it's a boolean field.

## `*ngFor` + `trackBy` → `@for` + `track`

```html
<!-- Legacy -->
<div *ngFor="let item of items; trackBy: trackById">{{ item.name }}</div>

<!-- Modern -->
@for (item of items(); track item.id) { <div>{{ item.name }}</div> }
```

`track` is required — prefer a stable id.

## `*ngSwitch` → `@switch`

```html
<!-- Legacy -->
<div [ngSwitch]="status">
  <span *ngSwitchCase="'ok'">OK</span>
  <span *ngSwitchDefault>Unknown</span>
</div>

<!-- Modern -->
@switch (status()) {
  @case ('ok') { <span>OK</span> }
  @default { <span>Unknown</span> }
}
```

## Full component sketch (inputs + outputs, modern)

```typescript
@Component({ selector: 'app-example', templateUrl: './example.component.html' })
export class ExampleComponent {
  title = input.required<string>();
  disabled = input(false);
  saved = output<void>();

  save(): void {
    if (!this.disabled()) this.saved.emit();
  }
}
```

## Automated schematics (whole-codebase migration)

Prefer these over manual find/replace for a full migration pass:

| Feature | Command |
|---|---|
| Built-in control flow | `ng generate @angular/core:control-flow` |
| Signal-based inputs | `ng generate @angular/core:signal-input-migration` |
| Signal queries | `ng generate @angular/core:signal-queries-migration` |
| Functional outputs | `ng generate @angular/core:output-migration` |
| `inject()` function | `ng generate @angular/core:inject` |
| Self-closing tags | `ng generate @angular/core:self-closing-tag` |
| Standalone | `ng generate @angular/core:standalone` (see below) |
| Jasmine/Karma → Vitest tests (v21+) | `ng g @schematics/angular:refactor-jasmine-vitest` (see below) |

Discover all available schematics for the installed version: `ng generate @angular/core: --help`. Scope with `--project <name>` or `--path <dir>`.

### Karma/Jasmine → Vitest (v21+)

1. `npm install --save-dev vitest jsdom`.
2. In `angular.json`, change the project's `architect.test.builder` to `@angular/build:unit-test`. Unlike the old `@angular/build:karma` builder, this one does **not** accept build options (`polyfills`, `assets`, `styles`, …) inline on the `test` target — if the old config had any, move them into a dedicated build target (or reuse the app's dev build target) before running the app, or the test run will fail to pick them up.
3. Run `ng g @schematics/angular:refactor-jasmine-vitest` — converts `fit`/`fdescribe` → `it.only`/`describe.only`, `xit`/`xdescribe` → `it.skip`/`describe.skip`, `spyOn` → `vi.spyOn`, `jasmine.any`/`jasmine.objectContaining` → `expect.any`/`expect.objectContaining`, hook functions to Vitest equivalents. Useful flags: `--project <name>`, `--include <path>`, `--add-imports` (explicit vitest imports if globals disabled), `--browser-mode` (browser-mode test execution), `--verbose`.
4. **Experimental — review every converted file.** Doesn't remove `karma.conf.js`/`src/test.ts` and skips complex/nested spy scenarios — those need manual follow-up.
5. Clean up: `npm uninstall karma karma-chrome-launcher karma-coverage karma-jasmine karma-jasmine-html-reporter jasmine-core`, delete `karma.conf.js` and `src/test.ts`.
6. New test-style conventions after migration: skill `angular-testing-vitest-conventions`.

### Standalone migration — three discrete, verified stages

Run each phase, then verify the build (`ng build` / `build_angular_project` via dev-mcp) before the next:

1. `ng generate @angular/core:standalone` → **Convert all components, directives, and pipes to standalone**.
2. Verify build. Run again → **Remove unnecessary NgModule classes**.
3. Verify build. Run again → **Bootstrap the project using standalone APIs**.

Signal-state migration (`BehaviorSubject` → `signal`) is an architecture decision, not a mechanical syntax swap — see skill `angular-signals` / the project's signal-architecture guidance instead of a schematic.

## Zone.js → Zoneless (stable, default for new v21 apps)

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [provideZonelessChangeDetection(), /* ... */],
};
```

1. Remove the `zone.js` polyfill import from `polyfills.ts`/`angular.json`, then uninstall `zone.js` once nothing else in the app depends on it.
2. `ChangeDetectionStrategy.OnPush` becomes redundant everywhere (no zone left to trigger default-strategy checks) — safe to leave on existing components, don't add it to new ones purely for perf reasons anymore.
3. Anything relying on zone-patched async (implicit change detection after `setTimeout`/`fetch`/DOM events) needs an explicit trigger instead — signals, `markForCheck()`, or `ChangeDetectorRef.detectChanges()` for interop code that isn't signal-driven yet.
4. Tests: replace `fixture.detectChanges()` timing assumptions with `await fixture.whenStable()` — see skill `angular-testing`.
5. Audit third-party libraries for a hard `zone.js` dependency before removing it app-wide; some UI libs still assume zone-based change detection.
