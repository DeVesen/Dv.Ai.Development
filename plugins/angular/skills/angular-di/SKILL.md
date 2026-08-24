---
name: angular-di
description: Use when creating or injecting Angular services, defining providers or InjectionTokens, or debugging dependency injection errors (NullInjectorError, "must be called from an injection context", wrong provider scope). Triggers on inject(), @Injectable, providedIn, InjectionToken, providers/viewProviders arrays, or hierarchical injector questions.
---

# Angular Dependency Injection

## Services

```ts
@Injectable({ providedIn: 'root' })
export class AnalyticsLogger {
  trackEvent(category: string, value: string) { /* ... */ }
}
```

`providedIn: 'root'` is the default choice: singleton, available everywhere, tree-shakeable if never injected. Reach for a `providers` array only for component-scoped instances, route-scoped instances, or runtime configuration values.

## Injecting

```ts
export class Navbar {
  private router = inject(Router);       // field initializer — preferred
  private analytics = inject(AnalyticsLogger);
}
```

Services inject other services the same way.

## Injection context

`inject()` only works inside an **injection context**:

- Class field initializers and constructors of `@Injectable`/`@Component`/`@Directive`/`@Pipe`.
- Factory functions (`useFactory`, `InjectionToken` factory).
- Functional route guards/resolvers/interceptors.

Anywhere else (event handlers, plain callbacks, `setTimeout`) → throws. In an `async` functional guard/resolver, the context is only active in the synchronous part before the first `await` — call `inject()` before that, not after. Details, `runInInjectionContext`, `assertInInjectionContext`: [references/injection-context.md](references/injection-context.md).

## Providers & InjectionTokens

Manual `providers` array: `useClass`, `useValue`, `useFactory`, `useExisting`, `multi`. Non-class dependencies (config objects, primitives) → `InjectionToken`. Library authors: export a `provide*()` function instead of raw provider objects. Full patterns: [references/providers.md](references/providers.md).

## Hierarchical scoping

Two injector trees (`EnvironmentInjector` for `providedIn`/bootstrap, `ElementInjector` for component/directive `providers`) resolved element-tree-first, then environment-tree. Modifiers `optional`/`self`/`skipSelf`/`host`, and `providers` vs `viewProviders` (content projection boundary): [references/hierarchical-injectors.md](references/hierarchical-injectors.md).

## What to check on a DI error

1. `NullInjectorError` → token not provided anywhere reachable from the requesting injector — check `providedIn` or the nearest `providers` array, then walk up the tree.
2. "must be called from an injection context" → `inject()` called outside field initializer/constructor/factory — move it there, or wrap in `runInInjectionContext`.
3. Wrong instance / not shared as expected → check for an unwanted component-level `providers` entry shadowing the root singleton.
