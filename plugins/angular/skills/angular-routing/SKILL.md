---
name: angular-routing
description: Use when defining Angular routes, navigating between them, configuring router outlets, guards, resolvers, lazy loading, or SSR/hydration rendering strategy. Triggers on Routes array, RouterLink, router.navigate, CanActivate/CanMatch, ResolveFn, loadComponent/loadChildren, router-outlet, or route transition/view-transition questions.
---

# Angular Routing

## Defining routes

```ts
// app.routes.ts
export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'user/:id', component: UserProfile },     // route param
  { path: 'articles', redirectTo: '/blog' },
  { path: '**', component: NotFound },               // wildcard — always last
];

// app.config.ts
export const appConfig: ApplicationConfig = { providers: [provideRouter(routes)] };
```

- First-match wins — specific routes before less-specific ones, wildcard last.
- `title` on a route sets the page title (static or via `ResolveFn`/custom `TitleStrategy`).
- `data` — static metadata; `providers` — route-scoped DI.
- `children` for nested routes — parent component needs its own `<router-outlet />`.

## Outlets

```html
<router-outlet />                    <!-- primary -->
<router-outlet name="sidebar" />     <!-- secondary, route needs outlet: 'sidebar' -->
```

Events: `activate`/`deactivate` (component instantiated/destroyed), `attach`/`detach` (with `RouteReuseStrategy`). Pass data down: `[routerOutletData]` on the outlet, `inject(ROUTER_OUTLET_DATA)` (a `Signal`) in the routed component.

## Navigating

```html
<a routerLink="/dashboard" routerLinkActive="active-link">Dashboard</a>
<a [routerLink]="['/user', userId]">Profile</a>
```

```ts
private router = inject(Router);
this.router.navigate(['/search'], { queryParams: { q: 'angular' } });
this.router.navigate(['edit'], { relativeTo: this.route });     // relative
this.router.navigateByUrl('/products/123?view=details');
this.router.navigateByUrl('/login', { replaceUrl: true });
```

Signal-based active check (v21.1+, replaces the deprecated `Router.isActive()` method) — use when you need more than `routerLinkActive`'s CSS class, e.g. conditional rendering or `aria-current`:

```ts
import { isActive } from '@angular/router';

private router = inject(Router);
protected isDashboardActive = isActive('/dashboard', this.router);   // Signal<boolean>
```

`isActive()` is a plain function, not a method on `Router` — pass the `Router` instance as its second argument.

Route params (`/user/123`), query params (`?q=query`), matrix params (`/products;category=books`).

## Lazy loading

```ts
{ path: 'admin', loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent) }
{ path: 'settings', loadChildren: () => import('./settings/settings.routes') }
```

Loader functions run in the route's injection context — `inject()` works inside them for context-aware loading. Eager-load primary landing pages; lazy-load everything else.

## Router feature flags (v21.1)

- `withExperimentalAutoCleanupInjectors()` (pass to `provideRouter(routes, ...)`) — destroys `EnvironmentInjector`s for routes no longer active/stored, reclaiming memory held by route-scoped providers. Experimental.
- `withExperimentalPlatformNavigation()` — experimental integration with the browser Navigation API (intercept navigations, native scroll restoration).

SSR/hydration hang, app never reports stable (`NG0506`) → `provideStabilityDebugging()`, see [references/rendering-strategies.md](references/rendering-strategies.md#hydration).

## References

| Topic | File |
|---|---|
| Guards (`CanActivate`/`CanMatch`/…) and data resolvers (`ResolveFn`) | [references/guards-and-resolvers.md](references/guards-and-resolvers.md) |
| Router lifecycle events, debugging | [references/router-lifecycle.md](references/router-lifecycle.md) |
| CSR/SSG/SSR + hydration decision | [references/rendering-strategies.md](references/rendering-strategies.md) |
| View Transitions API for route changes | [references/route-animations.md](references/route-animations.md) |

Testing routed components/guards → skill `angular-testing`, `RouterTestingHarness` reference.
