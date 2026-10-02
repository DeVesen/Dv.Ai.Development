# Directory Layout — Custom Material Input

## Default: `reference/` per shell

Each custom-input **shell** (`{component-prefix}-form-<feature>/`) keeps layer 1 (directive, model, directive spec) under **`reference/`** — not flat next to `*.component.*`, not in a separate sibling `{component-prefix}-<control>/`, as long as only **this** shell uses the control.

```text
components/common/
├── {component-prefix}-form-<feature>/              ← layer 2 (shell)
│   ├── {component-prefix}-form-<feature>.component.ts|html|scss
│   ├── {component-prefix}-form-<feature>.component.spec.ts
│   ├── optional: *-validators.ts
│   └── reference/                     ← layer 1 (MatFormFieldControl)
│       ├── *-control.directive.ts
│       ├── *-control.directive.spec.ts
│       └── *.model.ts
```

**Distinction:** skill docs `references/` (plural) ≠ code folder `reference/` (singular) — different things, easy to conflate.

**Shell imports:**

```typescript
import { {ComponentPrefix}MyfeatureControlDirective } from './reference/{component-prefix}-myfeature-control.directive';
import { MyfeatureValue } from './reference/myfeature-value.model';
```

## Variant B — only once 2+ shells share the same directive

Exception, not the default: once a **second** shell needs the same directive, extract the control from `reference/` into `components/common/{component-prefix}-<control>/` (flat there, no `reference/`).

1. Move `reference/` (or legacy host-root) contents → `{component-prefix}-<control>/`.
2. Every shell imports `../{component-prefix}-<control>/...`.
3. Remove the host's `reference/`.

```text
{component-prefix}-<control>/                      ← shared (Variant B)
├── *-control.directive.ts
├── *-control.directive.spec.ts
└── *.model.ts

{component-prefix}-form-shell-a/
{component-prefix}-form-shell-b/
```

**Reverting:** only one shell consumer left (e.g. second shell removed) → move `{component-prefix}-<control>/` content back into `{component-prefix}-form-<feature>/reference/`, delete the sibling folder, fix imports back to `./reference/...`.

## Anti-patterns

- Directive/model flat in the host root (`{component-prefix}-form-*/{component-prefix}-*-control.directive.ts`).
- A sibling `{component-prefix}-<control>/` for a single consumer (instead of `reference/` in the host).
- A `reference/` folder nested under `{component-prefix}-<control>/` (shared stays flat).
- A second shell importing `../{component-prefix}-form-other/reference/...` instead of doing Variant B.
- Two hosts each with their own `reference/` for the **same** directive (duplicate).

## Extraction checklist (→ Variant B)

- [ ] Directive + model (+ spec) moved from `reference/` to `{component-prefix}-<control>/`
- [ ] Imports in **all** shells point to `../{component-prefix}-<control>/`
- [ ] Host `reference/` deleted
