# Migration: `*ngIf` → `@if` / `@else`

Control-flow fundamentals: [components.md](components.md). More migration tooling: [migrations.md](migrations.md).

**Legacy**

```html
<div *ngIf="isLoading; else content">Loading…</div>
<ng-template #content>
  <app-main />
</ng-template>
```

**Modern**

```html
@if (isLoading()) {
  <div>Loading…</div>
} @else {
  <app-main />
}
```

Use `()` when `isLoading` is a signal; use a plain property name when it is a boolean field.
