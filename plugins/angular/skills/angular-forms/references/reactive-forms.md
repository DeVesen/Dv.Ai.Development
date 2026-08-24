# Reactive Forms

Model-driven, built around observable streams, synchronous access to the data model — more scalable and testable than template-driven forms.

## Core classes

- `FormControl`: value + validity of one input.
- `FormGroup`: a group of controls (object-like structure).
- `FormArray`: a numerically indexed array of controls.
- `FormBuilder`: factory service for creating control instances.

## Setup

```ts
import {ReactiveFormsModule, FormGroup, FormControl, Validators, FormBuilder} from '@angular/forms';

@Component({ imports: [ReactiveFormsModule] })
export class ProfileEditor {
  private fb = inject(FormBuilder);

  profileForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: [''],
    address: this.fb.group({ street: [''], city: [''] }),
    aliases: this.fb.array([this.fb.control('')]),
  });

  onSubmit() { console.warn(this.profileForm.value); }
}
```

## Template binding

- `[formGroup]`: binds a `FormGroup` to `<form>`/`<div>`.
- `formControlName`: binds a named control within a group.
- `formGroupName` / `formArrayName`: nested group/array.
- `[formControl]`: binds a standalone `FormControl`.

```html
<form [formGroup]="profileForm" (ngSubmit)="onSubmit()">
  <input type="text" formControlName="firstName" />
  <div formGroupName="address">
    <input type="text" formControlName="street" />
  </div>
  <div formArrayName="aliases">
    @for (alias of aliases.controls; track $index) {
      <input type="text" [formControlName]="$index" />
    }
  </div>
  <button type="submit" [disabled]="!profileForm.valid">Submit</button>
</form>
```

## Accessing controls

```ts
get aliases() { return this.profileForm.get('aliases') as FormArray; }
addAlias() { this.aliases.push(this.fb.control('')); }
```

## Updating values

- `patchValue()`: updates only the specified properties, fails silently on structural mismatches.
- `setValue()`: replaces the entire model, strictly enforces structure.

## Unified change events (v18+)

```ts
this.profileForm.events.subscribe((event) => {
  if (event instanceof ValueChangeEvent) console.log('New value:', event.value);
});
```

## Manual state management

- `markAsTouched()` / `markAllAsTouched()` — surface validation errors on submit.
- `markAsDirty()` / `markAsPristine()`.
- `updateValueAndValidity()` — manually recalculate value/status.
- `{ emitEvent: false }` / `{ onlySelf: true }` — control propagation on most methods.
