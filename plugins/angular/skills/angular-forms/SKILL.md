---
name: angular-forms
description: Use when building or debugging Angular forms — Signal Forms (form(), FormField, validation), reactive forms (FormGroup/FormControl/FormBuilder), or template-driven forms (ngModel). Triggers on form/Formular/Validierung requests, FieldState vs FormField errors, applyWhen/applyEach usage, or choosing a forms strategy for a new feature.
---

# Angular Forms

## Strategy decision

| Scenario | Strategy |
|---|---|
| Angular v21+, new form | Signal Forms |
| Older app already on Reactive/Template-driven | Keep existing strategy — don't migrate opportunistically |
| Simple form (few fields, no cross-field logic) | Template-driven |
| Complex form (nested groups, arrays, cross-field validation) | Reactive Forms (pre-v21) |

## Signal Forms — critical rules

**Never use `null`** as a field value or type — `''`, `0`, `[]` instead.

```ts
model = signal({ name: '', age: 0, hobbies: [] as string[] });
userForm = form(this.model);
```

```html
<input [formField]="userForm.name" />
```

**The one rule that causes most errors:** a field must be called `()` to read its state.

```ts
f.cat.name        // FormField — structural, no state
f.cat.name()      // FieldState — state access
f.cat.name().touched()  // correct
f.cat.name.touched()    // ERROR: doesn't exist on FormField
```

Exception: `.length` on arrays needs no `()` — `form.items.length`, not `form.items().length`.

Never set a value directly on the field (`form.field.set(x)` doesn't exist) — always `this.model.update(...)`.

Forbidden on `[formField]` elements (auto-set): `min`/`max`/`[attr.min]`/`[attr.max]`, `value`/`[value]`/`[attr.value]`, `[disabled]`/`[readonly]` — express these as schema rules (`min()`, `readonly()`) instead.

Full API (validators, `applyWhen`/`applyEach`, async validation, debounce), the complete pitfalls table, and a full worked example: [references/signal-forms.md](references/signal-forms.md).

### v21.1 additions

- `[formField]` is the current directive name (`[field]` renamed; `Field` class → `FormField`). `[field]` still works but write new code with `[formField]`.
- `provideSignalFormsConfig({ classes: { 'is-invalid': f => f().invalid() && f().touched() } })` in app-level `providers` — configures validation-state CSS classes globally (all forms) instead of hand-rolled `[class.invalid]` bindings per field. Same "call the field to read state" rule applies inside the callback.
- Custom controls implement `FormValueControl` or `FormCheckboxControl` — narrower than a full `ControlValueAccessor`.
- `field().focusBoundControl()` — programmatic focus on the control bound to a field.
- Readonly arrays are fully supported as field values now.

Signal Forms remain the only Angular v21 major API still marked **experimental** — flag this to the user when a decision commits to it for a critical/long-lived form.

## Reactive Forms (pre-v21 / complex legacy forms)

`FormGroup`/`FormControl`/`FormArray`/`FormBuilder`, model-driven, synchronous access. [references/reactive-forms.md](references/reactive-forms.md).

## Template-driven Forms (simple forms)

`[(ngModel)]` two-way binding via `FormsModule`. Every `ngModel` element needs a `name` attribute. [references/template-driven-forms.md](references/template-driven-forms.md).
