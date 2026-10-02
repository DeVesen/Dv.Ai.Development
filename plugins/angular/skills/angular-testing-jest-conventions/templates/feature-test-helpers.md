# Feature-Test-Helper — gemeinsame Provider

Analog zu `WebApplicationFactory` / Test-Fakes im Backend: wiederverwendbare Provider für Feature-Specs.

```typescript
import type { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

/** Gemeinsame Provider für shallow Feature-Specs. */
export function provideFeatureShallowTestProviders(): Array<Provider | EnvironmentProviders> {
  const activatedRouteStub = {
    snapshot: {
      queryParamMap: { get: () => null as string | null, has: () => false },
      queryParams: {} as Record<string, string | undefined>,
      paramMap: { get: () => null as string | null },
    },
    queryParams: of({}),
  };

  return [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideNoopAnimations(),
    {
      provide: Router,
      useValue: {
        navigate: jest.fn(),
        navigateByUrl: jest.fn(),
        createUrlTree: jest.fn(),
        serializeUrl: jest.fn(),
      } as unknown as jest.Mocked<Router>,
    },
    { provide: ActivatedRoute, useValue: activatedRouteStub },
  ];
}
```

Regeln:

- Helper nur im **Testbereich** (z. B. `features/<feature>/testing/`), nie im Produktionscode
- Keine Produktionslogik in Helpern — nur Stubs, Factory-Funktionen, Default-Fixtures
- Konstanten für API-Verträge in `*-test.constants.ts`, wenn mehrere Specs betroffen
