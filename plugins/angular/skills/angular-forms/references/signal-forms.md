# Signal Forms — full reference

## Imports

```ts
import {
  form, FormField, submit,
  disabled, hidden, readonly, debounce,
  applyWhen, applyEach, schema,
  validate, validateAsync, validateHttp, validateStandardSchema,
  metadata,
} from '@angular/forms/signals';
```

## Built-in validators

```ts
import {required, email, min, max, minLength, maxLength, pattern} from '@angular/forms/signals';

userForm = form(this.model, (s) => {
  required(s.name, {message: 'Name is required'});
  email(s.email, {message: 'Invalid email'});
  min(s.age, 18);
  max(s.age, 100);
  minLength(s.password, 8);
  maxLength(s.description, 500);
  pattern(s.zipCode, /^\d{5}$/);

  // `when` only works on required():
  required(s.name, { when: ({valueOf}) => valueOf(s.age) > 10 });
  // pattern/email/min/max don't support `when` — use applyWhen instead
});
```

## Submitting

Submit callback **must be `async`**:

```ts
import {submit} from '@angular/forms/signals';

onSubmit() {
  submit(this.userForm, async () => {
    await this.apiService.save(this.model());
  });
}
// submit() marks all fields touched, runs only if valid
```

## Error interface

```ts
interface ValidationError {
  readonly kind: string;
  readonly message?: string;
}
// no error → return undefined, NOT null
```

## Custom validation — context

```ts
validate(s.username, ({value, valueOf, stateOf, state}) => {
  // value    → Signal<T> of this field
  // valueOf  → (path) => T, read other fields (dependency-tracked)
  // stateOf  → (path) => FieldState of other fields
  // state    → FieldState of this field (state.touched(), state.valid() ...)
  if (value() === 'admin') return {kind: 'reserved', message: 'Username admin is reserved'};
});
```

## Paths are NOT signals inside the `form()` callback

```ts
// WRONG
applyWhen(p.ssn, () => p.ssn().touched(), ...);
// RIGHT
applyWhen(p.ssn, ({stateOf}) => stateOf(p.ssn).touched(), ...);
applyWhen(p.ssn, ({valueOf}) => valueOf(p.ssn) !== '', ...);
```

## Conditional rules — `applyWhen` (3 args required)

```ts
applyWhen(s.spouse, ({valueOf}) => valueOf(s.status) === 'joint', (spousePath) => {
  required(spousePath.name);
});
```

## Array fields — `applyEach` (callback takes exactly 1 arg, no index)

```ts
applyEach(s.items, (item) => { required(item.name); });
```

## Async validation

`params` must be a function; `onError` is required.

```ts
import {validateAsync} from '@angular/forms/signals';
import {resource} from '@angular/core';

userForm = form(this.model, (s) => {
  validateAsync(s.username, {
    params: ({value}) => value(),
    factory: (username) => resource({
      params: username,
      loader: async ({params: value}) => value === 'taken',
    }),
    onSuccess: (isTaken) => isTaken ? {kind: 'taken', message: 'Username is already taken'} : undefined,
    onError: () => ({kind: 'error', message: 'Validation failed'}),
  });
});
```

## Debounce

```ts
import {debounce} from '@angular/forms/signals';
userForm = form(this.model, (s) => { debounce(s.username, 300); });
```

## Nested `@for` — no `$parent`

```html
@for (item of form.items; track $index; let outerIdx = $index) {
  @for (sub of item.subs; track $index) {
    <button (click)="remove(outerIdx, $index)">X</button>
  }
}
```

## Pitfalls table

| Mistake | WRONG | RIGHT |
|---|---|---|
| Read flags | `form.field.valid()` | `form.field().valid()` |
| Read value | `form.field.value()` | `form.field().value()` |
| Set value | `form.field.set(x)` | `this.model.update(...)` |
| Form root | `form.invalid()` | `form().invalid()` |
| Double-call | `form.field()()` | `form.field().value()` |
| Rules context | `({ touched }) => touched()` | `({ state }) => state.touched()` |
| Call path | `applyWhen(p.foo, () => p.foo() === 'x')` | `applyWhen(p.foo, ({valueOf}) => valueOf(p.foo) === 'x')` |
| applyWhen args | `applyWhen(condition, () => {...})` | `applyWhen(path, condition, schemaFn)` — 3 args |
| Array length | `form.items().length` | `form.items.length` |
| Checkbox array | `[formField]="form.tags"` (string[]) | Checkboxes bind only to boolean |
| readonly attr | `<input readonly [formField]>` | `readonly()` rule in schema |
| min/max attr | `<input min="1" max="10">` | `min()`/`max()` rules in schema |
| value binding | `<input [value]="val">` | don't combine with `[formField]` |
| when option | `pattern(p.x, /.../, {when: ...})` | `when` only on `required()` |
| Submit callback | `submit(form, () => { ... })` | `submit(form, async () => { ... })` |
| Async params | `params: s.field` | `params: ({ value }) => value()` |
| Async onError | missing | `onError` is required |
| applyEach args | `applyEach(s.items, (item, index) => ...)` | `applyEach(s.items, (item) => ...)` |
| Nested @for | `$parent.$index` | `let outerIdx = $index` |
| FormState import | `import { FormState }` | doesn't exist — use `FieldState` |
| Null in model | `signal({ name: null })` | `signal({ name: '' })` / `signal({ age: 0 })` |

## Common build-error fixes

- `Property 'value' does not exist on type 'FieldTree'` → call the field first: `form.field().value()`.
- `Property 'set' does not exist on type 'FieldTree'` → model-driven, update the model: `this.model.update(m => ({...m, x: y}))`.
- `Type 'string[]' is not assignable to type 'string'` → use `<select multiple [formField]="form.items">` for array fields.
- `NG8022: Setting the 'readonly/min/max/value' attribute is not allowed` → move it into a schema rule (`readonly()`, `min()`, `max()`).
- `TS2322: Type 'string[]' is not assignable to type 'boolean'` → checkbox on an array field — use `<select multiple>` instead.
- `'when' does not exist in type` (pattern/email/min/max) → wrap in `applyWhen(path, condition, (p) => pattern(p, ...))`.
- `Expected 3 arguments, but got 2` (applyWhen) → `applyWhen(path, condition, schemaFn)`.
- `Module has no exported member 'FormState'` → doesn't exist, read state via `field().valid()` etc.
- `No pipe found with name 'number'` → pipes aren't available in Signal Forms templates — format in the component (`computed(() => x().toFixed(2))`).

## Full worked example

```ts
@Component({
  selector: 'app-root',
  imports: [FormField],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  model = signal({
    personalInfo: { firstName: '', lastName: '', email: '', age: 0 },
    tripDetails: { destination: 'Mars', launchDate: '' },
    package: { tier: 'economy', extras: [] as string[] },
    companions: [] as Array<{name: string; relation: string}>,
  });

  bookingForm = form(this.model, (s) => {
    required(s.personalInfo.firstName, {message: 'First name is required'});
    required(s.personalInfo.email, {message: 'Email is required'});
    email(s.personalInfo.email, {message: 'Invalid email address'});
    min(s.personalInfo.age, 18, {message: 'Must be at least 18'});

    validate(s.tripDetails.launchDate, ({value}) => {
      const date = new Date(value());
      if (isNaN(date.getTime())) return undefined;
      if (date < new Date()) return {kind: 'pastDate', message: 'Must be in the future'};
      return undefined;
    });

    hidden(s.package.extras, ({valueOf}) => valueOf(s.package.tier) === 'economy');

    applyEach(s.companions, (companion) => {
      required(companion.name, {message: 'Companion name required'});
    });
  });

  addCompanion() {
    this.model.update((m) => ({...m, companions: [...m.companions, {name: '', relation: ''}]}));
  }

  onSubmit() {
    submit(this.bookingForm, async () => { console.log('Booking Confirmed:', this.model()); });
  }
}
```

```html
<form (submit)="onSubmit(); $event.preventDefault()">
  <input [formField]="bookingForm.personalInfo.firstName" />
  @if (bookingForm.personalInfo.firstName().touched() && bookingForm.personalInfo.firstName().errors().length) {
    <span>{{ bookingForm.personalInfo.firstName().errors()[0].message }}</span>
  }

  @if (!bookingForm.package.extras().hidden()) {
    <select multiple [formField]="bookingForm.package.extras">
      <option value="wifi">WiFi</option>
    </select>
  }

  @for (companion of bookingForm.companions; track $index) {
    <input [formField]="companion.name" placeholder="Name" />
  }

  <button [disabled]="bookingForm().invalid() || bookingForm().pending()">Submit</button>
</form>
```
