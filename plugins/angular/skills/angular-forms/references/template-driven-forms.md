# Template-Driven Forms

Two-way data binding (`[(ngModel)]`) reconciles the template and the data model. Best for simple forms.

## Core directives (`FormsModule`)

- `NgModel`: `[(ngModel)]` two-way binding.
- `NgForm`: auto-creates a top-level `FormGroup` bound to `<form>`.
- `NgModelGroup`: nested `FormGroup` bound to a DOM element.

## Setup

```ts
import {FormsModule} from '@angular/forms';

@Component({ imports: [FormsModule] })
export class UserForm {
  user = {name: '', role: 'Guest'};
  onSubmit() { console.log('Form submitted!', this.user); }
}
```

## Template

Every element with `[(ngModel)]` **must have a `name` attribute** — Angular registers the control with the parent `NgForm` via it.

```html
<form #userForm="ngForm" (ngSubmit)="onSubmit()">
  <input type="text" required [(ngModel)]="user.name" name="name" #nameCtrl="ngModel" />

  @if (nameCtrl.invalid && (nameCtrl.dirty || nameCtrl.touched)) {
    @if (nameCtrl.errors?.['required']) { <div>Name is required.</div> }
  }

  <button type="submit" [disabled]="!userForm.form.valid">Submit</button>
</form>
```

## State classes

| State | Class if true | Class if false |
|---|---|---|
| Visited | `ng-touched` | `ng-untouched` |
| Value changed | `ng-dirty` | `ng-pristine` |
| Value valid | `ng-valid` | `ng-invalid` |
| Submitted | `ng-submitted` (on `<form>` only) | – |

## Reset

```html
<button type="button" (click)="userForm.reset()">Reset</button>
```
