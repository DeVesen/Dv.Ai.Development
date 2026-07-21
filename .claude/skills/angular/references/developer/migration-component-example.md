# Example: full component (inputs + outputs)

Vendor baseline for inputs/outputs: [inputs.md](inputs.md), [outputs.md](outputs.md).

```typescript
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-example',
  standalone: true,
  templateUrl: './example.component.html',
  styleUrl: './example.component.scss',
})
export class ExampleComponent {
  title = input.required<string>();
  disabled = input(false);
  saved = output<void>();

  save(): void {
    if (!this.disabled()) {
      this.saved.emit();
    }
  }
}
```
