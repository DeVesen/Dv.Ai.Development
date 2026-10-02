# Custom Material Input — Two-Layer Architecture

Creates a new Angular Material custom input (shell + directive) following the two-layer pattern.

## Parameters

| Parameter | Description |
|-----------|-------------|
| `{component-prefix}` | Component prefix (kebab-case + camelCase), e.g. `app` (Angular default) |
| `{ComponentPrefix}` | Component prefix (PascalCase), e.g. `App` — derived from `{component-prefix}` |

## Core rule (Material)

`mat-form-field` accepts exactly **one** `MatFormFieldControl` per field. Material sees one control provider; multi-field control happens **inside the DOM** of that one wrapper.

## Two-layer architecture

```mermaid
flowchart TB
  subgraph shell [Shell component, e.g. {component-prefix}-form-field-play]
    MFF[mat-form-field]
    LABEL[mat-label]
    HINT[mat-hint]
    ERR[mat-error — one block via errorMessage]
    FC[effectiveControl FormControl]
  end
  subgraph wrapper [div.custom-input-range-wrapper + directive]
    MFC[MatFormFieldControl provider]
    INNER[Feature content: 2+ inputs / selects / …]
  end
  MFF --> LABEL
  MFF --> wrapper
  MFF --> HINT
  MFF --> ERR
  FC -->|value disabled errorState| wrapper
  wrapper --> MFC
  INNER -->|Events| FC
  wrapper -->|focused touched empty| MFC
  MFC -->|shouldLabelFloat errorState| MFF
```

### Layer 1 — Shell component (orchestrator)

**Responsibility:** Material UI frame, Reactive Forms, error text, wrapper visibility.

- Template contains **one** `mat-form-field` with `mat-label`, optional `mat-hint`, **one** `mat-error`.
- Binds `[control]` (optional) + `internalControl` → `effectiveControl`.
- Passes value/status down to the wrapper: `[value]`, `[disabled]`, `[errorState]`.
- Maps inner events to `effectiveControl.setValue` / `markAsTouched`.
- **No** `MatFormFieldControl` on the shell class.

### Layer 2 — `.custom-input-*-wrapper` + directive

**Responsibility:** the one Material control; aggregates focus/empty state across all inner fields.

- `selector: '[{component-prefix}XyzControl]'` (project-specific), `standalone: true`.
- `providers: [{ provide: MatFormFieldControl, useExisting: forwardRef(() => …) }]`.
- Host: `div.custom-input-*-wrapper`.
- Implements `MatFormFieldControl<T>` fully — see [custom-input-contract.md](custom-input-contract.md).
- **No** `matInput` on child elements.
- **No** `NG_VALUE_ACCESSOR` on the directive — the form value lives in the shell's `FormControl`.

## Visibility trick: hide wrapper content until label floats

**Problem:** with outline-style fields, `mat-label` overlaps inner-input placeholders until the label has floated up.

**Solution:** hide wrapper content until the label would float — same logic as `shouldLabelFloat` on the control:

```text
showContent = focused || hasValue
```

| State | Wrapper visible | Inner placeholders |
|---|---|---|
| Empty, not focused | no (`--hidden`) | empty (`''`) |
| Focused | yes | set |
| Value set, not focused | yes | set |

```typescript
focused = false;
get hasValue(): boolean { /* from effectiveControl value */ }
get showContent(): boolean { return this.focused || this.hasValue; }
onFocusedChange(focused: boolean): void {
  this.focused = focused;
  this.cdr.markForCheck();
}
```

```html
<div
  class="custom-input-wrapper"
  [class.custom-input-wrapper--hidden]="!showContent"
  {component-prefix}XyzControl
  (focusedChange)="onFocusedChange($event)"
  …
>
```

Directive emits `@Output() focusedChange` on `focusin`/real `focusout` (focus moving **between** inner fields is not a wrapper blur — check `relatedTarget`). CSS: `--hidden` modifier with `opacity: 0` + `pointer-events: none`; clicking the empty field still triggers `mat-form-field` → `onContainerClick` on the control.

## Multiple inputs/selects inside one `mat-form-field`

1. Directive sits on the **enclosing** `div`, not on each input.
2. `empty`: true only when **all** relevant parts are empty.
3. `focused`: `focusin` on wrapper; `focusout` only when focus **leaves** the wrapper (not on Tab between inner inputs).
4. `onContainerClick(event)`: if `event.target` is an inner input, focus it and **return**; otherwise focus the first focusable child. Never blindly focus the first input — that blocks clicks on the second field.
5. `stateChanges`: call `.next()` after every change to `focused`, `empty`, `errorState`, `disabled`, `value` (set from outside via `@Input`).
6. `errorState`: from the shell — `effectiveControl.invalid && effectiveControl.touched`.
7. Inner controls: native elements or project-specific components **without** their own `mat-form-field`/`matInput`.

## Shell template (required skeleton)

```html
<mat-form-field [appearance]="appearance" [subscriptSizing]="subscriptSizing" style="width: 100%">
  <mat-label>{{ label }}</mat-label>

  <div
    class="custom-input-wrapper"
    [class.custom-input-wrapper--hidden]="!showContent"
    {component-prefix}XyzControl
    [value]="controlValue"
    [disabled]="isDisabled"
    [errorState]="showErrorState"
    [placeholder]="combinedPlaceholder"
    (touched)="onControlTouched()"
    (focusedChange)="onControlFocusedChange($event)"
  >
    <!-- ONLY HERE: feature-specific content (inputs, selects, …) -->
  </div>

  <mat-hint *ngIf="hint">{{ hint }}</mat-hint>
  <mat-error *ngIf="errorMessage">{{ errorMessage }}</mat-error>
</mat-form-field>
```

Prefer **one** `mat-error` + a priority getter over multiple `*ngIf` error blocks:

```typescript
get errorMessage(): string | null {
  const c = this.effectiveControl;
  if (!c.touched || !c.invalid) return null;
  if (c.hasError('required')) return this.requiredErrorMessage;
  if (c.hasError('invalidRange')) return this.invalidRangeErrorMessage;
  return null;
}
```

## Forms API (shell)

```typescript
@Input() control: FormControl<T | null> | null = null;
readonly internalControl = new FormControl<T | null>(null);
get effectiveControl(): FormControl<T | null> { return this.control ?? this.internalControl; }
```

`valueChanges`/`statusChanges` → `markForCheck()`. Validators live on the parent's `FormControl`, not in the directive.

## Checklist

1. [ ] Shell: `mat-form-field` + `mat-label` + optional `mat-hint` + one `mat-error`/`errorMessage`.
2. [ ] Shell: `effectiveControl`, no `MatFormFieldControl` on the component.
3. [ ] Directive on the wrapper div with `MatFormFieldControl` provider.
4. [ ] No `matInput` on children; no second `mat-form-field` inside.
5. [ ] `focused`/`focusout` with `relatedTarget` check; `focusedChange` to shell.
6. [ ] `onContainerClick`: respects the clicked input.
7. [ ] `showContent` + `--hidden` + empty placeholders until visible.
8. [ ] `errorState`, `value`, `disabled` flow from shell to directive.
9. [ ] `(touched)` from directive → `effectiveControl.markAsTouched()`.
10. [ ] Unit tests: focus between two inner fields; `onContainerClick` on the second input; `errorMessage`; validator.
11. [ ] Directory: directive + model (+ spec) under `reference/` — see [custom-input-directory-layout.md](custom-input-directory-layout.md).

## Common mistakes

| Symptom | Cause | Fix |
|---|---|---|
| Focus always jumps to first field | `onContainerClick` always focuses `querySelector('input')` | On input click: `target.focus(); return` |
| Label + placeholder overlap | Wrapper visible while empty/unfocused | `showContent` + empty placeholders |
| Material ignores second field | Multiple `matInput` | One directive = one control |
| Outline turns red, no text | `errorState` set without `mat-error` | Add `errorMessage` + `*ngIf` |
| Value never arrives | Logic only in directive, no `FormControl` | Shell writes `effectiveControl` |

## What this pattern doesn't dictate

Spacing/width of inner fields (SCSS), the concrete value type `T`, the number/kind of inner controls — a short feature description in the prompt is enough; the shell stays the same.
