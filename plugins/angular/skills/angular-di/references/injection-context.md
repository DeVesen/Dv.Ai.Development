# Injection Context

`inject()` only works inside an injection context.

## Where is an Injection Context Available?

1. **Field initializers** of classes instantiated by DI (`@Injectable`, `@Component`, `@Directive`, `@Pipe`).
2. **Constructors** of classes instantiated by DI.
3. **Factory functions** specified in `useFactory` or `InjectionToken` configurations.
4. **Functional APIs** executed by Angular (functional route guards, resolvers, interceptors).

```ts
@Component({...})
export class Example {
  private router = inject(Router);       // Valid: field initializer

  constructor() {
    const http = inject(HttpClient);      // Valid: constructor
  }

  onClick() {
    // Invalid: not an injection context
    // const auth = inject(AuthService);
  }
}
```

## Async functional guards/resolvers

The injection context only lasts through the synchronous portion of the call — it ends at the first `await`. Call `inject()` before that point, not after:

```ts
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);       // Valid: still synchronous
  const ok = await auth.checkStatus();     // context ends here
  return ok;
};
```

Calling `inject()` after the `await` throws "must be called from an injection context" even though the guard itself is a valid injection context.

## `runInInjectionContext`

Run a function within an injection context on demand (dynamic component creation, testing) — needs an existing `Injector`/`EnvironmentInjector`.

```ts
@Injectable({providedIn: 'root'})
export class MyService {
  private injector = inject(EnvironmentInjector);

  doSomethingDynamic() {
    runInInjectionContext(this.injector, () => {
      const router = inject(Router);
    });
  }
}
```

## `assertInInjectionContext`

Use in utility functions to guarantee they're called from a valid context — throws a clear error otherwise.

```ts
export function injectNativeElement<T extends Element>(): T {
  assertInInjectionContext(injectNativeElement);
  return inject(ElementRef).nativeElement;
}
```
