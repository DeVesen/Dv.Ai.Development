# Router Lifecycle and Events

`Router.events` emits the navigation lifecycle, chronologically:

1. `NavigationStart`
2. `RoutesRecognized`
3. `GuardsCheckStart` / `GuardsCheckEnd`
4. `ResolveStart` / `ResolveEnd`
5. `NavigationEnd`
6. `NavigationCancel` (e.g. guard returned `false`)
7. `NavigationError` (e.g. resolver threw)

```ts
private router = inject(Router);

constructor() {
  this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((event) => {
    console.log('Navigated to:', event.url);
  });
}
```

Debug all routing events: `provideRouter(routes, withDebugTracing())`.

## Common uses

- Loading indicator: show on `NavigationStart`, hide on `NavigationEnd`/`Cancel`/`Error`.
- Analytics: track page views on `NavigationEnd`.
- Scroll management: respond to `Scroll` events for custom scroll behavior.
