# Component-Test (shallow) — TestBed

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { MyComponent } from './my.component';
import { MyFacadeService } from '../services/my-facade.service';

describe('MyComponent', () => {
  let fixture: ComponentFixture<MyComponent>;
  let facade: jasmine.SpyObj<MyFacadeService>;

  beforeEach(async () => {
    facade = jasmine.createSpyObj<MyFacadeService>('MyFacadeService', ['load']);

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

Für Wizard-/Feature-Specs mit vielen Root-Providern: gemeinsame Helper — [feature-test-helpers-template.md](feature-test-helpers-template.md).

Material-Interaktion: Harnesses bevorzugen — [angular-developer/component-harnesses.md](../../../angular-developer/references/component-harnesses.md).
