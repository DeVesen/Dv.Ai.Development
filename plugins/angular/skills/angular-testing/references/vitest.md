# Vitest

Angular v20+ has native Vitest support through `@angular/build`.

```bash
npm install -D vitest jsdom
```

`angular.json`:

```json
{
  "projects": {
    "your-app": {
      "architect": {
        "test": {
          "builder": "@angular/build:unit-test",
          "options": { "tsConfig": "tsconfig.spec.json", "buildTarget": "your-app:build" }
        }
      }
    }
  }
}
```

```bash
ng test
ng test --watch
ng test --code-coverage
```

## Zoneless / async-first pattern

Zoneless projects schedule updates asynchronously — don't rely on manual `fixture.detectChanges()` alone. Act → Wait → Assert:

```typescript
it('should display a different title after a change', async () => {
  component.title.set('New Test Title');       // Act
  await fixture.whenStable();                   // Wait
  expect(h1.textContent).toContain('New Test Title'); // Assert
});
```

## Mocking with `vi`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUserService = { getUser: vi.fn(), user: signal<User | null>(null) };

beforeEach(() => {
  vi.clearAllMocks();
  mockUserService.getUser.mockReturnValue(of({ id: '1', name: 'Test' }));
});
```

## Async operations

```typescript
import { fakeAsync, tick, flush } from '@angular/core/testing';

it('should debounce search', fakeAsync(() => {
  fixture.componentInstance.query.set('test');
  tick(300);
  fixture.detectChanges();
  expect(fixture.componentInstance.results().length).toBeGreaterThan(0);
  flush();
}));
```
