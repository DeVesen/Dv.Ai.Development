# Migration: `@Output()` + `EventEmitter` → `output()`

Deep reference: [outputs.md](../../angular-developer/references/outputs.md).

**Legacy**

```typescript
import { Component, EventEmitter, Output } from '@angular/core';

@Component({ /* ... */ })
export class LegacyButtonComponent {
  @Output() clicked = new EventEmitter<void>();
  @Output() valueChange = new EventEmitter<string>();

  onClick(): void {
    this.clicked.emit();
    this.valueChange.emit('x');
  }
}
```

**Modern**

```typescript
import { Component, output } from '@angular/core';

@Component({ /* ... */ })
export class ModernButtonComponent {
  clicked = output<void>();
  valueChange = output<string>();

  onClick(): void {
    this.clicked.emit();
    this.valueChange.emit('x');
  }
}
```

Parent usage stays similar: `(clicked)="..."`, `(valueChange)="..."`.
