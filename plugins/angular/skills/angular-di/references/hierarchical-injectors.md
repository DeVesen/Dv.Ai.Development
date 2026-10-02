# Hierarchical Injectors

Angular's DI is hierarchical — services can be scoped to different levels of the application.

## Two hierarchies

1. **`EnvironmentInjector`** — configured via `@Injectable({ providedIn: 'root' })` or `ApplicationConfig.providers` at bootstrap. Global singletons.
2. **`ElementInjector`** — created implicitly at each DOM element, configured via `providers`/`viewProviders` on `@Component()`/`@Directive()`.

## Resolution order

1. Search up the `ElementInjector` tree, from the requesting component/directive to the root element.
2. If not found, search the `EnvironmentInjector` tree, from the closest environment injector to root.
3. If still not found → throws (unless `optional`).

## Resolution modifiers

```ts
@Component({...})
export class Example {
  optionalService = inject(MyService, { optional: true });   // null instead of throwing
  parentService = inject(ParentService, { skipSelf: true }); // skip current, look at parent
}
```

- `optional` — return `null` instead of throwing if not found.
- `self` — only check the current `ElementInjector`, don't look up the parent tree.
- `skipSelf` — start at the parent `ElementInjector`, skipping the current element.
- `host` — stop searching at the host component's view boundary.

## `providers` vs `viewProviders`

- **`providers`**: available to the component, its view (template), and projected content (`<ng-content>`).
- **`viewProviders`**: available to the component and its view only — NOT to projected content. Use to isolate services from content passed in by consumers.
