# MatFormFieldControl — required contract (directive on the wrapper element)

The directive on the wrapper implements `MatFormFieldControl<T>` (Angular Material 19+). The shell binds state via `@Input`; the directive holds **no** own `NgControl` for the form value.

## Required properties

| Member | Type | Who sets it | Note |
|--------|-----|-----------|---------|
| `value` | `T \| null` | Shell `@Input` | For `empty` |
| `disabled` | `boolean` | Shell | Disables all inner fields |
| `errorState` | `boolean` | Shell | `invalid && touched` |
| `required` | `boolean` | Shell, or `false` | Constant OK if validation lives only on the `FormControl` |
| `placeholder` | `string` | Shell | Material API; often combined from feature placeholders |
| `focused` | `boolean` | Directive | `focusin`/`focusout` on the wrapper |
| `empty` | getter | Directive | Feature logic (e.g. all parts null) |
| `shouldLabelFloat` | getter | Directive | Typically `focused \|\| !empty` |
| `stateChanges` | `Subject<void>` | Directive | `.next()` on state change |
| `id` | `string` | Directive | Unique per instance |
| `controlType` | `string` | Directive | e.g. `'number-range'` → CSS class on the form field |
| `ngControl` | `null` | Constant | No CVA on the wrapper |
| `autofilled` | optional | `false` | |
| `userAriaDescribedBy` | getter | From `setDescribedByIds` | |

## Required methods

```typescript
setDescribedByIds(ids: string[]): void;
onContainerClick(event: MouseEvent): void;
```

### `onContainerClick` (critical)

```typescript
onContainerClick(event: MouseEvent): void {
  const target = event.target as Node | null;
  if (target) {
    const inputs = this.el.nativeElement.querySelectorAll('input');
    for (let i = 0; i < inputs.length; i++) {
      if (inputs[i] === target) return; // click was on this input — don't redirect focus
    }
  }
  const first = this.el.nativeElement.querySelector<HTMLElement>(
    'input, select, button, [tabindex]:not([tabindex="-1"])'
  );
  (first as HTMLInputElement)?.focus?.();
}
```

Alternative for a direct `HTMLInputElement` click: `if (target instanceof HTMLInputElement) { target.focus(); return; }`.

## Outputs (recommended)

| Output | When |
|--------|------|
| `touched` | Wrapper loses focus (real `focusout`) |
| `focusedChange: boolean` | `true`/`false`, for shell content visibility |

## Host metadata (recommended)

```typescript
host: {
  role: 'group',
  '[attr.id]': 'id',
  '[attr.aria-describedby]': 'userAriaDescribedBy',
},
```

## Lifecycle

`ngOnDestroy`: `stateChanges.complete()`.
