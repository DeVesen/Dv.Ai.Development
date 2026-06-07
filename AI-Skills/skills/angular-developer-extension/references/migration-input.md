# Migration: `@Input()` → `input()` / `input.required()`

Deep reference: [inputs.md](../../angular-developer/references/inputs.md).

**Legacy**

```typescript
import { Component, Input } from '@angular/core';

@Component({ /* ... */ })
export class LegacyCardComponent {
  @Input() title = '';
  @Input() count?: number;
}
```

```html
<h2>{{ title }}</h2>
<span>{{ count }}</span>
```

**Modern (Angular 19)**

```typescript
import { Component, input } from '@angular/core';

@Component({ /* ... */ })
export class ModernCardComponent {
  title = input.required<string>();
  count = input<number>(); // undefined if not bound
}
```

```html
<h2>{{ title() }}</h2>
<span>{{ count() }}</span>
```

Optional input with default:

```typescript
disabled = input(false);
```
