# Migration: `*ngFor` + `trackBy` → `@for` + `track`

See [components.md](components.md) for loop/`track` overview.

**Legacy**

```html
<div *ngFor="let item of items; trackBy: trackById">
  {{ item.name }}
</div>
```

```typescript
trackById(_index: number, item: { id: string }): string {
  return item.id;
}
```

**Modern**

```html
@for (item of items(); track item.id) {
  <div>{{ item.name }}</div>
}
```

`track` is required for `@for`. Prefer a stable id (e.g. `item.id`).
