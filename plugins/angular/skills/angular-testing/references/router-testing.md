# Testing with the RouterTestingHarness

When testing components that involve routing, do **not** mock the Router or related services. Use `RouterTestingHarness`, which tests the actual router configuration, guards, and resolvers in an environment that closely mirrors a real application.

## Setting Up for Router Testing

```ts
import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {Dashboard} from './dashboard.component';
import {HeroDetail} from './hero-detail.component';

describe('Dashboard Component Routing', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {path: '', component: Dashboard},
          {path: 'heroes/:id', component: HeroDetail},
        ]),
      ],
    }).compileComponents();

    harness = await RouterTestingHarness.create();
  });
});
```

## Writing Router Tests

```ts
it('should navigate to a hero detail when a hero is selected', async () => {
  const dashboard = await harness.navigateByUrl('/', Dashboard);

  const heroToSelect = {id: 42, name: 'Test Hero'};
  dashboard.selectHero(heroToSelect);

  await harness.fixture.whenStable();

  expect(harness.router.url).toEqual('/heroes/42');

  const heroDetail = await harness.getHarness(HeroDetail);
  expect(await heroDetail.componentInstance.hero.name).toBe('Test Hero');
});

it('should get the activated component directly', async () => {
  const dashboardInstance = await harness.navigateByUrl('/', Dashboard);
  expect(dashboardInstance).toBeInstanceOf(Dashboard);
});
```

## Best Practices

- Always navigate with `harness.navigateByUrl()` — resolves with the instance of the activated component.
- Access live router state via `harness.router` (e.g. `harness.router.url`).
- Get an activated component's harness via `harness.getHarness(ComponentType)`, or its `DebugElement` via `harness.routeDebugElement`.
- After an action that triggers navigation, always `await harness.fixture.whenStable()` before asserting.
