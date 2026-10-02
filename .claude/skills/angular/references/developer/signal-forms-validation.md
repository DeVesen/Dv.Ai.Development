# Signal Forms — Validierung

## Eingebaute Validatoren

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

  // `when` funktioniert NUR bei required():
  required(s.name, {
    when: ({valueOf}) => valueOf(s.age) > 10,
  });
  // pattern/email/min/max kennen kein `when` — applyWhen verwenden
});
```

## Submitting

**CRITICAL**: submit-Callback MUSS `async` sein.

```ts
import {submit} from '@angular/forms/signals';

onSubmit() {
  submit(this.userForm, async () => {
    await this.apiService.save(this.model());
  });
}
// submit() markiert alle Felder als touched, läuft nur wenn valid
```

## Fehler-Interface

```ts
interface ValidationError {
  readonly kind: string;
  readonly message?: string;
}
// Kein Fehler → undefined zurückgeben, NICHT null
```

## Eigene Validierung — Context

```ts
validate(s.username, ({value, valueOf, stateOf, state}) => {
  // value    → Signal<T> des Feldes
  // valueOf  → (path) => T  anderer Felder lesen (mit Dependency-Tracking)
  // stateOf  → (path) => FieldState  State anderer Felder
  // state    → FieldState dieses Feldes (state.touched(), state.valid() ...)

  if (value() === 'admin') {
    return {kind: 'reserved', message: 'Username admin is reserved'};
  }
});
```

## Paths sind KEINE Signals

Innerhalb des `form()`-Callbacks sind `schemaPath`-Kinder NICHT aufrufbar:

```ts
// WRONG
applyWhen(p.ssn, () => p.ssn().touched(), ...);

// RIGHT
applyWhen(p.ssn, ({stateOf}) => stateOf(p.ssn).touched(), ...);
applyWhen(p.ssn, ({valueOf}) => valueOf(p.ssn) !== '', ...);
```

## Konditionale Regeln — applyWhen

`applyWhen(path, condition, schemaFn)` — 3 Argumente erforderlich:

```ts
applyWhen(
  s.spouse,
  ({valueOf}) => valueOf(s.status) === 'joint',
  (spousePath) => {
    required(spousePath.name);
  },
);
```

## Array-Felder — applyEach

**CRITICAL**: Callback nimmt NUR 1 Argument (kein Index):

```ts
// CORRECT
applyEach(s.items, (item) => {
  required(item.name);
});

// WRONG — kein zweites Argument
applyEach(s.items, (item, index) => { ... });
```

## Async-Validierung

**CRITICAL**:
1. `params` MUSS eine Funktion sein
2. `onError` ist PFLICHT

```ts
import {validateAsync} from '@angular/forms/signals';
import {resource} from '@angular/core';

userForm = form(this.model, (s) => {
  validateAsync(s.username, {
    params: ({value}) => value(),                    // Funktion, nicht Signal direkt
    factory: (username) => resource({
      params: username,
      loader: async ({params: value}) => {
        return value === 'taken';
      },
    }),
    onSuccess: (isTaken) =>
      isTaken ? {kind: 'taken', message: 'Username is already taken'} : undefined,
    onError: () => ({kind: 'error', message: 'Validation failed'}),  // REQUIRED!
  });
});
```

## Debounce

```ts
import {debounce} from '@angular/forms/signals';

userForm = form(this.model, (s) => {
  debounce(s.username, 300); // 300ms Verzögerung zwischen UI und Model
});
```

## Nested @for — kein $parent

```html
<!-- WRONG — $parent existiert nicht -->
@for (item of form.items; track $index) {
  @for (sub of item.subs; track $index) {
    <button (click)="remove($parent.$index, $index)">X</button>
  }
}

<!-- RIGHT -->
@for (item of form.items; track $index; let outerIdx = $index) {
  @for (sub of item.subs; track $index) {
    <button (click)="remove(outerIdx, $index)">X</button>
  }
}
```

## Submit-Button deaktivieren

```html
<button [disabled]="userForm().invalid() || userForm().pending()">Submit</button>
```
