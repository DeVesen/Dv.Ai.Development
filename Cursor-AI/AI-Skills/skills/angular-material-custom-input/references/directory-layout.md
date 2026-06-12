# Verzeichnisstruktur — Custom Material Input

## Pflicht: `reference/` pro Shell

Jede Custom-Input-**Shell** (`{component-prefix}-form-<feature>/`) hält Schicht A (Direktive, Modell, Spec der Direktive) unter **`reference/`** — nicht flach neben `*.component.*`, nicht in einem separaten Geschwister-`{component-prefix}-<control>/`, solange nur **diese** Shell das Control nutzt.

```text
components/common/
├── {component-prefix}-form-<feature>/              ← Schicht B (Shell)
│   ├── {component-prefix}-form-<feature>.component.ts|html|scss
│   ├── {component-prefix}-form-<feature>.component.spec.ts
│   ├── optional: *-validators.ts
│   └── reference/                     ← Schicht A (MatFormFieldControl)
│       ├── *-control.directive.ts
│       ├── *-control.directive.spec.ts
│       └── *.model.ts
└── (Template: .custom-input-range-wrapper)  ← Schicht C
```

**Abgrenzung:** Skill-Doku `.cursor/skills/.../references/` (Plural) ≠ Code-Ordner `reference/` (Singular).

**Shell-Imports:**

```typescript
import { {ComponentPrefix}MyfeatureControlDirective } from './reference/{component-prefix}-myfeature-control.directive';
import { MyfeatureValue } from './reference/myfeature-value.model';
```

## Variante B — nur bei zwei+ Shells, gleiche Direktive

**Ausnahme**, nicht Standard: Erst wenn eine **zweite** Shell dieselbe Direktive braucht, Control aus `reference/` nach `components/common/{component-prefix}-<control>/` auslagern (dort **flach**, ohne `reference/`).

1. `reference/` (oder Legacy Host-Root) → `{component-prefix}-<control>/`
2. Alle Shells: `../{component-prefix}-<control>/...`
3. Host-`reference/` entfernen

```text
{component-prefix}-<control>/                      ← Shared (Variante B)
├── *-control.directive.ts
├── *-control.directive.spec.ts
└── *.model.ts

{component-prefix}-form-shell-a/
{component-prefix}-form-shell-b/
```

**Rückführung:** Nur **ein** Shell-Consumer übrig (z. B. zweite Shell entfernt) → Inhalt von `{component-prefix}-<control>/` nach `{component-prefix}-form-<feature>/reference/` verschieben, Geschwister-Ordner `{component-prefix}-<control>/` löschen, Imports `./reference/...`.

## Anti-Patterns

- Direktive/Modell flach im Host-Root (`{component-prefix}-form-*/{component-prefix}-*-control.directive.ts`).
- Geschwister `{component-prefix}-<control>/` bei **einem** Consumer (statt `reference/` im Host).
- `reference/` unter `{component-prefix}-<control>/` (Shared bleibt flach).
- Zweite Shell importiert `../{component-prefix}-form-other/reference/...` statt Variante B.
- Zwei Hosts mit je eigenem `reference/` für **dieselbe** Direktive (Duplikat).

## Extraktions-Checkliste (→ Variante B)

- [ ] Direktive + Modell (+ Spec) aus `reference/` nach `{component-prefix}-<control>/`
- [ ] Imports in **allen** Shells auf `../{component-prefix}-<control>/`
- [ ] Host-`reference/` gelöscht

