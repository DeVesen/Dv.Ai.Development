# Jasmine / Karma (legacy)

Legacy default before Vitest/Jest became preferred Angular test runners. Only use when the project's `karma.conf.js`/`angular.json` still points at Jasmine — don't introduce it into a new project.

## Mocking

```typescript
const userServiceSpy = jasmine.createSpyObj('UserService', ['getUser', 'updateUser']);
userServiceSpy.getUser.and.returnValue(of(mockUser));
```

## Async

```typescript
import { fakeAsync, tick } from '@angular/core/testing';

it('should debounce search', fakeAsync(() => {
  component.query.set('test');
  tick(300);
  fixture.detectChanges();
  expect(component.results().length).toBeGreaterThan(0);
}));
```

Core `TestBed`/signal-input/harness patterns in the main [SKILL.md](../SKILL.md) apply unchanged — only the spy/mock API differs from Jest/Vitest.
