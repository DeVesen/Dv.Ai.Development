# Operation: Signal-Architektur

State-Ownership, Readonly Public API und RxJS-Boundary für Feature Services.

**Vollständige Referenz:** [signal-architecture.md](signal-architecture.md)

**Auch laden:** Signal-Primitives (`signal()`, `computed()`, `effect()`, `linkedSignal()`, `resource()`): [signals-overview.md](signals-overview.md), [effects.md](effects.md), [linked-signal.md](linked-signal.md), [resource.md](resource.md).

---

## Überblick

- **Owner:** Feature Facade / Feature Service hält writable State; Smart-Components delegieren Mutationen via named methods.
- **Public API:** nur readonly (`asReadonly()`, `computed()`); Konsumenten rufen nie `.set()` / `.update()` auf internem State.
- **Derivation:** `computed()` — niemals `effect()` nur um zwei Signals zu synchronisieren.
- **RxJS-Boundary:** eine Übersetzungsschicht Observable → Signal (meist im Service).
- **BehaviorSubject-Migration:** inkrementell zu `signal` + readonly API.

Alle Details, Regeln und Snippets → [signal-architecture.md](signal-architecture.md).

**Verwandte Referenzen:**
- [testing.md](testing.md) — State via public API in Tests treiben
- [op-layout.md](op-layout.md) — Facade-Dateinamen und Feature-Service-Scope
