# Signal Forms — Basics

Signal Forms sind die empfohlene Lösung für Formulare in modernem Angular (v21+). Reaktiv, typsicher, modellgetrieben via Signals.

**CRITICAL**: Niemals `null` als Feldwert oder Feldtyp verwenden.

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

## Form erstellen

```ts
import {Component, signal} from '@angular/core';
import {form, FormField} from '@angular/forms/signals';

@Component({ imports: [FormField] })
export class Example {
  model = signal({
    name: '',       // NEVER null — use ''
    age: 0,         // NEVER null — use 0
    hobbies: [] as string[], // NEVER null — use []
  });

  userForm = form(this.model);
}
```

## [formField] Binding

```html
<input [formField]="userForm.name" />
<input type="checkbox" [formField]="userForm.isAdmin" />
<select [formField]="userForm.country">
  <option value="us">US</option>
</select>
```

**VERBOTENE Attribute** bei `[formField]` — werden automatisch gesetzt:
- `min`, `max`, `[attr.min]`, `[attr.max]`
- `value`, `[value]`, `[attr.value]`
- `[disabled]`, `[readonly]`

## FieldState vs FormField — die wichtigste Regel

Ein Feld **muss aufgerufen werden** `()`, um seinen State zu lesen:

```ts
const f = form(signal({ cat: { name: '' } }));

f.cat.name        // FormField — strukturell, kein State
f.cat.name()      // FieldState — State-Zugriff möglich
f.cat.name().touched()  // ✓ korrekt
f.cat.name.touched()    // ✗ ERROR: touched() existiert nicht auf FormField
```

Im Template:
```html
<!-- WRONG -->
@if (bookingForm.hotelDetails.hidden()) { ... }
<!-- RIGHT -->
@if (bookingForm.hotelDetails().hidden()) { ... }
```

**Ausnahme:** `.length` bei Arrays braucht kein `()`:
```ts
form.items.length        // ✓ strukturell
form.items().length      // ✗ ERROR
@for (item of form.items; track $index) { }  // ✓
```

## State lesen

```ts
// Feldwert
this.userForm.email().value()

// Form-Root
this.userForm().value()
this.userForm().valid()
this.userForm().invalid()
this.userForm().errors()   // ValidationError[]
this.userForm().pending()  // async validation aktiv

// Interaktions-State
this.userForm().touched()
this.userForm().dirty()

// Verfügbarkeits-State
this.userForm().disabled()
this.userForm().hidden()
this.userForm().readonly()
```

## disabled / hidden / readonly Regeln

```ts
import {disabled, readonly, hidden} from '@angular/forms/signals';

userForm = form(this.model, (s) => {
  disabled(s.password, ({valueOf}) => !valueOf(s.createAccount));
  hidden(s.shippingAddress, ({valueOf}) => valueOf(s.sameAsBilling));
  readonly(s.username);
});
```

## Reactive Forms — NICHT verwenden

`FormControl`, `FormGroup`, `FormArray`, `FormBuilder` aus `@angular/forms` werden durch Signal Forms vollständig ersetzt.
