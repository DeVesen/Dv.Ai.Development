# Component-Test (shallow) — TestBed

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { MyComponent } from './my.component';
import { MyFacadeService } from '../services/my-facade.service';

describe('MyComponent', () => {
  let fixture: ComponentFixture<MyComponent>;
  let facade: jest.Mocked<MyFacadeService>;

  beforeEach(async () => {
    facade = { load: jest.fn() } as unknown as jest.Mocked<MyFacadeService>;

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
    fixture.detectChanges();
    await fixture.whenStable();

    // Assert
    expect(facade.load).toHaveBeenCalledWith('item-1');
  });
});
```

Für Wizard-/Feature-Specs mit vielen Root-Providern: gemeinsame Helper — [feature-test-helpers.md](feature-test-helpers.md).

Material-Interaktion: CDK/Material-Harnesses bevorzugen (siehe Angular-Testing-Referenz des Projekts).
