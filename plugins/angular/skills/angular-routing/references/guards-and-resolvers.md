# Guards and Resolvers

## Guards

- `CanActivate` — can the user access this route (e.g. auth check)?
- `CanActivateChild` — can the user access children of this route?
- `CanDeactivate` — can the user leave this route (e.g. unsaved changes)?
- `CanMatch` — should this route even be considered for matching (e.g. feature flags)? Returning `false` makes the router keep checking other routes.

```ts
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.isLoggedIn() || router.parseUrl('/login');
};
```

```ts
{
  path: 'admin',
  component: Admin,
  canActivate: [authGuard],
  canActivateChild: [adminChildGuard],
  canDeactivate: [unsavedChangesGuard],
}
```

Guards execute in array order. Return `boolean` (allow/block), `UrlTree`/`RedirectCommand` (redirect), or an `Observable`/`Promise` resolving to those.

**Client-side guards are not a substitute for server-side security** — always verify permissions on the server too.

## Resolvers

```ts
export const userResolver: ResolveFn<User> = (route, state) => {
  const userService = inject(UserService);
  return userService.getUser(route.paramMap.get('id')!);
};
```

```ts
{ path: 'user/:id', component: UserProfile, resolve: { user: userResolver } }
```

### Accessing resolved data

Traditional, via `ActivatedRoute`:

```ts
private route = inject(ActivatedRoute);
data = toSignal(this.route.data);
user = computed(() => this.data().user);
```

Modern, via component inputs — enable `withComponentInputBinding()` in `provideRouter`:

```ts
provideRouter(routes, withComponentInputBinding());
// component.ts
user = input.required<User>();
```

### Error handling

Navigation blocks if a resolver fails. Use `withNavigationErrorHandler` for global handling, or `catchError` inside the resolver to redirect/fallback:

```ts
return userService.get(id).pipe(
  catchError(() => of(new RedirectCommand(router.parseUrl('/error')))),
);
```

Keep resolvers lightweight (fetch only critical data) and show a loading indicator while they run — the UI stays on the old page until resolution completes.
