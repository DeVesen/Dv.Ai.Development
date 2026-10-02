# `afterRenderEffect` — DOM reads/writes after render

Standard `effect()` runs *before* Angular updates the DOM. To inspect or modify the DOM based on a signal change (e.g. integrating a 3rd-party UI/charting library), use `afterRenderEffect` — it runs *after* Angular finishes rendering. Client-only, never runs during SSR.

## Render phases

To prevent forced-reflow/layout-thrashing, `afterRenderEffect` splits DOM reads and writes into ordered phases:

1. `earlyRead` — read from the DOM.
2. `write` — write to the DOM (receives the result of `earlyRead`). Never read here.
3. `mixedReadWrite` — avoid if possible.
4. `read` — never write here.

```ts
import { Component, afterRenderEffect, viewChild, ElementRef } from '@angular/core';

@Component({...})
export class Chart {
  canvas = viewChild.required<ElementRef>('canvas');

  constructor() {
    afterRenderEffect({
      earlyRead: () => this.canvas().nativeElement.getBoundingClientRect().width,
      write: (width) => {
        // NEVER read from the DOM in the write phase
        setupChart(this.canvas().nativeElement, width);
      },
    });
  }
}
```
