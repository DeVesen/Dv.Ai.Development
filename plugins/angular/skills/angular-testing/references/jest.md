# Jest

Angular via `@angular-builders/jest`. Same `describe`/`it`/`expect`/`TestBed` API as Vitest/Jasmine — only mocking and spy APIs differ.

## Mocking

```typescript
const getUser = jest.fn();
const spy = jest.spyOn(userService, 'getUser').mockReturnValue(of(mockUser));
const mocked = jest.mocked(userService);
```

Do **not** use `jasmine.createSpyObj` under Jest — use `jest.fn()`/`jest.spyOn()`/`jest.mocked()` instead.

## HTTP

```typescript
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  httpMock = TestBed.inject(HttpTestingController);
});

afterEach(() => httpMock.verify());
```
