# Component-Test (shallow) — Vitest + TestBed, zoneless

```typescript
import { describe, it, expect, beforeEach, vi, type Mocked } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { MyComponent } from './my.component';
import { MyFacadeService } from '../services/my-facade.service';

describe('MyComponent', () => {
  let fixture: ComponentFixture<MyComponent>;
  let facade: Mocked<MyFacadeService>;

  beforeEach(async () => {
    facade = { load: vi.fn() } as unknown as Mocked<MyFacadeService>;

    await TestBed.configureTestingModule({
      imports: [MyComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MyFacadeService, useValue: facade },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
  });

  it('ngOnInit_GivenDefaultInput_WithFacadeReady_CallsLoad', async () => {
    // Arrange
    fixture.componentRef.setInput('itemId', 'item-1');

    // Act
    await fixture.whenStable();

    // Assert
    expect(facade.load).toHaveBeenCalledWith('item-1');
  });
});
```

Zoneless Standardmuster: nach dem Act nur `await fixture.whenStable()` — kein zusätzliches manuelles `fixture.detectChanges()` nötig, das Framework verarbeitet den geplanten Update-Zyklus selbst.

Für Wizard-/Feature-Specs mit vielen Root-Providern: gemeinsame Helper — [feature-test-helpers.md](feature-test-helpers.md).

Material-Interaktion: CDK/Material-Harnesses bevorzugen (siehe Angular-Testing-Referenz des Projekts).
