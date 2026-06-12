# Migration: `*ngFor` + `trackBy` → `@for` + `track`

See [components.md](../../angular-developer/references/components.md) for loop/`track` overview; vendor [inputs.md](../../angular-developer/references/inputs.md) if binding patterns need refresh.

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
