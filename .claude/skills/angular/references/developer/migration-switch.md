# Migration: `*ngSwitch` → `@switch`

See [components.md](components.md).

**Legacy**

```html
<div [ngSwitch]="status">
  <span *ngSwitchCase="'ok'">OK</span>
  <span *ngSwitchCase="'err'">Error</span>
  <span *ngSwitchDefault>Unknown</span>
</div>
```

**Modern**

```html
@switch (status()) {
  @case ('ok') {
    <span>OK</span>
  }
  @case ('err') {
    <span>Error</span>
  }
  @default {
    <span>Unknown</span>
  }
}
```
