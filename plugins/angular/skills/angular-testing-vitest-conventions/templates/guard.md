# Guard-Test — Vitest Spy

```typescript
import { describe, it, expect, beforeEach, vi, type Mocked } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { ParametersCanDeactivateGuard } from './parameters-can-deactivate.guard';
import { CanComponentDeactivate } from './can-deactivate.interface';

describe('ParametersCanDeactivateGuard', () => {
  let guard: ParametersCanDeactivateGuard;
  let dialog: Mocked<MatDialog>;

  beforeEach(() => {
    dialog = { open: vi.fn() } as unknown as Mocked<MatDialog>;

    TestBed.configureTestingModule({
      providers: [
        ParametersCanDeactivateGuard,
        { provide: MatDialog, useValue: dialog },
      ],
    });

    guard = TestBed.inject(ParametersCanDeactivateGuard);
  });

  it('canDeactivate_GivenComponentReturnsFalse_WithNoDialog_DoesNotOpenDialog', async () => {
    // Arrange
    const component: CanComponentDeactivate = {
      canDeactivate: () => Promise.resolve(false),
    };

    // Act
    const result = await guard.canDeactivate(component);

    // Assert
    expect(result).toBe(false);
    expect(dialog.open).not.toHaveBeenCalled();
  });
});
```
