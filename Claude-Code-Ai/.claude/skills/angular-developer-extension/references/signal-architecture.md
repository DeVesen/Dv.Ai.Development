# Signal architecture (feature services)

Opinionated **where state lives and how it crosses boundaries** — not generic `signal` / `computed` / `effect` mechanics. Load **[Angular Developer](../../angular-developer/SKILL.md)** (`signals-overview.md`, `effects.md`, `linked-signal.md`, `resource.md`) for API details.

Complements **[Angular Developer Extension – SKILL.md](../SKILL.md)** (layout, facade file naming).

## Before any recommendation

- Check **`package.json`** → `@angular/core` — APIs and guidance differ by major version.

## Architecture rules (summary)

- **Owner:** the feature facade / feature service holds writable state; smart components delegate mutations through **named methods**.
- **Public API:** expose **read-only** views (`asReadonly()`, `computed()`); consumers must not call `.set()` / `.update()` on internal state.
- **Derivation:** derived values use **`computed()`** — never use **`effect()`** only to keep two signals in sync.
- **RxJS:** keep real streams as Observables until **one** translation layer into signals — [RxJS boundaries with signals](#rxjs-boundaries-with-signals).
- **Tests:** drive changes through the public API — [testing reference](testing.md).

For **`effect`** timing, **`afterRenderEffect`**, async tracking in reactive contexts, and **`linkedSignal`** — **Angular Developer:** [signals-overview.md](../../angular-developer/references/signals-overview.md), [effects.md](../../angular-developer/references/effects.md), [linked-signal.md](../../angular-developer/references/linked-signal.md).

---

## State ownership

- **Feature service** (`[feature].service.ts` per layout in [SKILL.md](../SKILL.md)) owns feature state; smart components call service methods instead of duplicating writable signals.
- **Shared / dumb components:** do not inject feature services; **inputs / outputs only** (see dumb-component rules on [SKILL.md](../SKILL.md)).
- **Consumers** read state through the service's **readonly** API; mutations only via **explicit methods** — not by reaching into private signals.

Writable vs readonly, `computed()`, async read-before-`await`, `untracked()`, and `linkedSignal` — [Angular Developer — signals overview](../../angular-developer/references/signals-overview.md), [linked signal](../../angular-developer/references/linked-signal.md).

### Tests

- Trigger changes via public methods; then `await fixture.whenStable()` / project convention — [testing reference](testing.md).

---

## Effects vs feature state

**Do not** use **`effect()`** in feature code **only** to `.set` / `.update` another signal to keep state in sync. Use **`computed()`**, **`linkedSignal()`**, or an explicit **service method** after a user action or async completion.

**Prefer** for feature logic:

- **Service method** — imperative flow after UI events or HTTP (then update signals inside the method).
- **`computed()`** — pure derivation from existing signals.
- **RxJS in the service** — stream composition, then **one** boundary into a signal — [RxJS boundaries with signals](#rxjs-boundaries-with-signals).

Valid **`effect`** / **`afterRenderEffect`** cases, **`onCleanup`**, and DOM timing — [Angular Developer — effects](../../angular-developer/references/effects.md).

---

## RxJS boundaries with signals

### When RxJS still makes sense

- **HTTP** (`HttpClient`): keep the Observable close to the source; translate to a signal for the UI at **one boundary** (`subscribe` in a service + `signal.set`, or `toSignal` if the project uses it).
- **WebSockets**, **long event streams**, **operators** (debounce, switchMap, retry, combineLatest, …).
- **Short-lived** UI events already modeled as streams — as long as the team keeps that style.

### Observable → signal

- **One** clear place (usually the service): subscribe to the Observable, centralize error handling, hold state in a `signal`.
- Avoid: many components subscribing to the same source in parallel without a strategy — **share** via the feature service.

### Signal → Observable

- Only if downstream truly needs an Observable; otherwise pass signals through. **`toObservable`** is a tool, not the default.

### Cancellation

- HTTP / streams: cancel / teardown via Observable mechanics; for manual subscriptions in services use **`takeUntilDestroyed`** or the project's explicit unsubscribe pattern.

### Migration note

- **`BehaviorSubject`** in services: migrate incrementally to **`signal`** + readonly API; expose public Observables only during transition if consumers still need RxJS.
