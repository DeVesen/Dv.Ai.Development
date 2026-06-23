# Guard-Test — Jasmine Spy

```typescript
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { ParametersCanDeactivateGuard } from './parameters-can-deactivate.guard';
import { CanComponentDeactivate } from './can-deactivate.interface';

describe('ParametersCanDeactivateGuard', () => {
  let guard: ParametersCanDeactivateGuard;
  let dialog: jasmine.SpyObj<MatDialog>;

  beforeEach(() => {
    dialog = jasmine.createSpyObj('MatDialog', ['open']);

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

