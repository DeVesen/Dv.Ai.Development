---
name: angular-signal-architecture
description: Use when deciding where writable Angular state should live, whether to expose it as readonly, or how to draw the boundary between RxJS and signals in a feature service. Triggers on "where should this state live", BehaviorSubject-to-signal migration, effect() used to sync two signals, or a feature facade's public API design.
---

# Angular Signal Architecture (feature services)

Opinionated **where state lives and how it crosses boundaries** — not generic `signal`/`computed`/`effect` mechanics (see skill `angular-signals` for the API itself).

Check `package.json` → `@angular/core` first — guidance differs by major version.

## Architecture rules

- **Owner:** the feature facade/feature service holds writable state; smart components delegate mutations through named methods.
- **Public API:** expose read-only views (`asReadonly()`, `computed()`); consumers never call `.set()`/`.update()` on internal state.
- **Derivation:** use `computed()` — never `effect()` just to keep two signals in sync.
- **RxJS:** keep real streams as Observables until **one** translation layer into signals.
- **Tests:** drive changes through the public API, then assert.

## State ownership

- The feature service (see skill `angular-project-layout` for file placement) owns feature state; smart components call service methods instead of duplicating writable signals.
- Shared/dumb components never inject feature services — inputs/outputs only.
- Consumers read state through the service's readonly API; mutations only via explicit methods, never by reaching into private signals.

## Effects vs. feature state

Do **not** use `effect()` in feature code just to `.set`/`.update` another signal to keep state in sync. Use `computed()`, `linkedSignal()`, or an explicit service method after a user action or async completion.

**Why this is a hard rule, not a preference:** an `effect()` that writes another signal runs after that signal has already been read elsewhere in the same cycle — the visible symptom is `ExpressionChangedAfterItHasBeenChecked`, or an effect → signal → effect loop that only surfaces with real data shapes, not the happy-path case you tested. `computed()`/`linkedSignal()` can't write outside their own value, so the bug class doesn't exist for them.

| Excuse | Reality |
|---|---|
| "It's just this one sync, `computed()` feels heavier" | Same line count, no re-render bug — there's no effort saved |
| "I also need a side effect (logging/API call) here" | Split it: the sync half becomes `computed()`/`linkedSignal()`; the real side effect stays in its own `effect()` that reads state but writes nothing back into it |
| "`linkedSignal()` is unfamiliar, `effect()` I already know" | That's a reason to learn it, not to reintroduce a write-after-read bug |

**Red flag:** an `effect()` body containing `.set(`/`.update(` on any signal not local to that effect — stop, move it to `computed()`, `linkedSignal()`, or a method.

Prefer, for feature logic:

- A **service method** — imperative flow after UI events or HTTP (update signals inside the method).
- **`computed()`** — pure derivation from existing signals.
- **RxJS in the service** — stream composition, then one boundary into a signal.

## RxJS boundaries with signals

### When RxJS still makes sense

- HTTP (`HttpClient`): keep the Observable close to the source; translate to a signal for the UI at one boundary (`subscribe` in a service + `signal.set`, or `toSignal`).
- WebSockets, long event streams, operators (debounce, switchMap, retry, combineLatest, …).
- Short-lived UI events already modeled as streams.

### Observable → signal

One clear place (usually the service): subscribe to the Observable, centralize error handling, hold state in a `signal`. Avoid many components subscribing to the same source in parallel without a strategy — share via the feature service.

### Signal → Observable

Only if downstream truly needs an Observable; otherwise pass signals through. `toObservable` is a tool, not the default.

### Cancellation

HTTP/streams: cancel/teardown via Observable mechanics; for manual subscriptions use `takeUntilDestroyed` or the project's explicit unsubscribe pattern.

### Migration note

`BehaviorSubject` in services: migrate incrementally to `signal` + readonly API; expose public Observables only during transition if consumers still need RxJS.
