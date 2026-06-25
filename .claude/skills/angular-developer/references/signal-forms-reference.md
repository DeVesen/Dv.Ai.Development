# Signal Forms — Referenz (Pitfalls, Beispiel, Build-Fehler)

## Common Pitfalls

| Fehler | WRONG | RIGHT |
|--------|-------|-------|
| Flags lesen | `form.field.valid()` | `form.field().valid()` |
| Wert lesen | `form.field.value()` | `form.field().value()` |
| Wert setzen | `form.field.set(x)` | `this.model.update(...)` |
| Form-Root | `form.invalid()` | `form().invalid()` |
| Doppelaufruf | `form.field()()` | `form.field().value()` |
| Rules Context | `({ touched }) => touched()` | `({ state }) => state.touched()` |
| Path aufrufen | `applyWhen(p.foo, () => p.foo() === 'x')` | `applyWhen(p.foo, ({valueOf}) => valueOf(p.foo) === 'x')` |
| applyWhen Args | `applyWhen(condition, () => {...})` | `applyWhen(path, condition, schemaFn)` — 3 Args |
| Array-Länge | `form.items().length` | `form.items.length` |
| Checkbox Array | `[formField]="form.tags"` (string[]) | Checkboxes binden nur an boolean |
| readonly Attr | `<input readonly [formField]>` | `readonly()` Regel im Schema |
| min/max Attr | `<input min="1" max="10">` | `min()` / `max()` Regeln im Schema |
| value Binding | `<input [value]="val">` | NICHT mit `[formField]` kombinieren |
| when Option | `pattern(p.x, /.../, {when: ...})` | `when` nur bei `required()` |
| Submit Callback | `submit(form, () => { ... })` | `submit(form, async () => { ... })` |
| Async params | `params: s.field` | `params: ({ value }) => value()` |
| Async onError | Fehlt | `onError` ist REQUIRED |
| resource() API | `request: signal` | `params: signal` |
| applyEach Args | `applyEach(s.items, (item, index) => ...)` | `applyEach(s.items, (item) => ...)` |
| Nested @for | `$parent.$index` | `let outerIdx = $index` |
| FormState import | `import { FormState }` | Existiert nicht — `FieldState` verwenden |
| Null in Model | `signal({ name: null })` | `signal({ name: '' })` / `signal({ age: 0 })` |
| Validate Syntax | `validate(s.field, { value } => ...)` | `validate(s.field, ({ value }) => ...)` |

## Vollständiges Beispiel

### `src/app/app.ts`

```ts
import {Component, signal, ChangeDetectionStrategy} from '@angular/core';
import {
  form, FormField, submit,
  required, email, min, hidden, applyEach, validate,
} from '@angular/forms/signals';

@Component({
  selector: 'app-root',
  standalone: true,
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
    required(s.personalInfo.lastName, {message: 'Last name is required'});
    required(s.personalInfo.email, {message: 'Email is required'});
    email(s.personalInfo.email, {message: 'Invalid email address'});
    min(s.personalInfo.age, 18, {message: 'Must be at least 18'});

    required(s.tripDetails.destination);
    required(s.tripDetails.launchDate);
    validate(s.tripDetails.launchDate, ({value}) => {
      const date = new Date(value());
      if (isNaN(date.getTime())) return undefined;
      if (date < new Date()) return {kind: 'pastDate', message: 'Must be in the future'};
      return undefined;
    });

    hidden(s.package.extras, ({valueOf}) => valueOf(s.package.tier) === 'economy');

    applyEach(s.companions, (companion) => {
      required(companion.name, {message: 'Companion name required'});
      required(companion.relation, {message: 'Relation required'});
    });
  });

  addCompanion() {
    this.model.update((m) => ({
      ...m,
      companions: [...m.companions, {name: '', relation: ''}],
    }));
  }

  removeCompanion(index: number) {
    this.model.update((m) => ({
      ...m,
      companions: m.companions.filter((_, i) => i !== index),
    }));
  }

  onSubmit() {
    submit(this.bookingForm, async () => {
      console.log('Booking Confirmed:', this.model());
    });
  }
}
```

### `src/app/app.html`

```html
<form (submit)="onSubmit(); $event.preventDefault()">
  <section>
    <label>
      First Name
      <input [formField]="bookingForm.personalInfo.firstName" />
      @if (bookingForm.personalInfo.firstName().touched() && bookingForm.personalInfo.firstName().errors().length) {
        <span>{{ bookingForm.personalInfo.firstName().errors()[0].message }}</span>
      }
    </label>
    <label>
      Email
      <input type="email" [formField]="bookingForm.personalInfo.email" />
      @if (bookingForm.personalInfo.email().touched() && bookingForm.personalInfo.email().errors().length) {
        <span>{{ bookingForm.personalInfo.email().errors()[0].message }}</span>
      }
    </label>
    <label>
      Age
      <input type="number" [formField]="bookingForm.personalInfo.age" />
    </label>
  </section>

  <section>
    <label>
      Destination
      <select [formField]="bookingForm.tripDetails.destination">
        <option value="Mars">Mars</option>
        <option value="Moon">Moon</option>
      </select>
    </label>
    <label>
      Launch Date
      <input type="date" [formField]="bookingForm.tripDetails.launchDate" />
    </label>
  </section>

  <section>
    <label><input type="radio" value="economy" [formField]="bookingForm.package.tier" /> Economy</label>
    <label><input type="radio" value="business" [formField]="bookingForm.package.tier" /> Business</label>

    @if (!bookingForm.package.extras().hidden()) {
      <select multiple [formField]="bookingForm.package.extras">
        <option value="wifi">WiFi</option>
        <option value="gym">Gym</option>
      </select>
    }
  </section>

  <section>
    <button type="button" (click)="addCompanion()">Add Companion</button>
    @for (companion of bookingForm.companions; track $index) {
      <div>
        <input [formField]="companion.name" placeholder="Name" />
        <input [formField]="companion.relation" placeholder="Relation" />
        <button type="button" (click)="removeCompanion($index)">Remove</button>
      </div>
    }
  </section>

  <button [disabled]="bookingForm().invalid()">Submit</button>
</form>
```

## Build-Fehler beheben

### `Property 'value' does not exist on type 'FieldTree'`
```ts
// WRONG
const val = this.form.field.value();
// RIGHT
const val = this.form.field().value();
```

### `Property 'set' does not exist on type 'FieldTree'`
```ts
// WRONG — Signal Forms sind modellgetrieben
this.form.address.street.set('Main St');
// RIGHT
this.model.update((m) => ({...m, address: {...m.address, street: 'Main St'}}));
```

### `Type 'string[]' is not assignable to type 'string'`
```html
<!-- WRONG -->
<select [formField]="form.assignees"> ... </select>
<!-- RIGHT — select multiple für Array-Felder -->
<select multiple [formField]="form.assignees"> ... </select>
```

### `NG8022: Setting the 'readonly/min/max/value' attribute is not allowed`
```html
<!-- WRONG -->
<input [formField]="form.age" min="18" max="99" />
<!-- RIGHT — Regeln im Schema -->
<!-- min(s.age, 18); max(s.age, 99); -->
<input [formField]="form.age" />
```

### `TS2322: Type 'string[]' is not assignable to type 'boolean'`
```html
<!-- WRONG — tags ist string[], kein boolean -->
<input type="checkbox" [formField]="form.tags" />
<!-- RIGHT -->
<select multiple [formField]="form.tags"> ... </select>
```

### `'when' does not exist in type` (bei pattern/email/min/max)
```ts
// WRONG
pattern(s.ssn, /^\d{3}-\d{2}-\d{4}$/, {when: isJoint});
// RIGHT
applyWhen(s.ssn, isJoint, (ssnPath) => {
  pattern(ssnPath, /^\d{3}-\d{2}-\d{4}$/);
});
```

### `Expected 3 arguments, but got 2` (applyWhen)
```ts
// WRONG
applyWhen(isJoint, () => { ... });
// RIGHT — applyWhen(path, condition, schemaFn)
applyWhen(s.spouse, ({valueOf}) => valueOf(s.status) === 'joint', (spousePath) => {
  required(spousePath.name);
});
```

### `Module has no exported member 'FormState'`
```ts
// WRONG
import {FormState} from '@angular/forms/signals';
// FormState existiert nicht — State über field().valid() etc. lesen
```

### `No pipe found with name 'number'`
```ts
// Pipes nicht im Template — im Component formatieren
totalPriceFormatted = computed(() => this.totalPrice().toFixed(2));
```
