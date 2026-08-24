# Testing with Component Harnesses

Component harnesses are the standard, preferred way to interact with components in tests. They provide a robust, user-centric API that makes tests less brittle and easier to read by insulating them from changes to a component's internal DOM structure.

## Why Use Harnesses?

- **Robustness:** Tests don't break when you refactor a component's internal HTML or CSS classes.
- **Readability:** Tests describe interactions from a user's perspective (e.g., `button.click()`, `slider.getValue()`) instead of through DOM queries (`fixture.nativeElement.querySelector(...)`).
- **Reusability:** The same harness can be used in both unit tests and E2E tests.

Angular Material provides a test harness for every component in its library.

## Using a Harness in a Unit Test

The `TestbedHarnessEnvironment` is the entry point for using harnesses in unit tests.

### Example: Testing with a `MatButtonHarness`

```ts
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {MatButtonHarness} from '@angular/material/button/testing';
import {MyButtonContainerComponent} from './my-button-container.component';

describe('MyButtonContainerComponent', () => {
  let fixture: ComponentFixture<MyButtonContainerComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyButtonContainerComponent, MatButtonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(MyButtonContainerComponent);
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  it('should find a button with specific text', async () => {
    const submitButton = await loader.getHarness(MatButtonHarness.with({text: 'Submit'}));

    expect(await submitButton.isDisabled()).toBe(false);
    await submitButton.click();
  });
});
```

### Key Concepts

1. **`HarnessLoader`**: an object used to find and create harness instances. Get a loader for your component's fixture using `TestbedHarnessEnvironment.loader(fixture)`.
2. **`loader.getHarness(HarnessClass)`**: asynchronously finds and returns a harness instance for the first matching component.
3. **`HarnessClass.with({ ... })`**: many harnesses provide a static `with` method that returns a `HarnessPredicate`, to filter and find components based on properties like text, selector, or disabled state. Always use this to precisely target the component under test.
4. **Harness API:** once you have a harness instance, use its methods (e.g., `.click()`, `.getText()`, `.getValue()`) to interact with the component. These handle waiting for async operations and change detection automatically.
