# Shell- und Direktive — Snippet-Gerüste

Kopierbasis für neue Custom-Inputs. Platzhalter `Xyz` / `xyz` ersetzen.

## Direktive (minimal)

```typescript
@Directive({
  selector: '[{component-prefix}XyzControl]',
  standalone: true,
  providers: [
    { provide: MatFormFieldControl, useExisting: forwardRef(() => {ComponentPrefix}XyzControlDirective) },
  ],
  host: { role: 'group', '[attr.id]': 'id' },
})
export class {ComponentPrefix}XyzControlDirective implements MatFormFieldControl<MyValue>, OnDestroy {
  @Input() value: MyValue | null = null;
  @Input() disabled = false;
  @Input() errorState = false;
  @Input() required = false;
  @Input() placeholder = '';

  @Output() readonly touched = new EventEmitter<void>();
  @Output() readonly focusedChange = new EventEmitter<boolean>();

  readonly ngControl = null;
  readonly stateChanges = new Subject<void>();
  readonly controlType = 'xyz';
  readonly id = `xyz-${{ComponentPrefix}XyzControlDirective.nextId++}`;
  focused = false;

  get empty(): boolean { /* feature */ }
  get shouldLabelFloat(): boolean { return this.focused || !this.empty; }

  // focusin, focusout (relatedTarget), onContainerClick, setDescribedByIds, ngOnDestroy
}
```

## Shell-Komponente (Ausschnitt)

```typescript
@Component({
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, ReactiveFormsModule, {ComponentPrefix}XyzControlDirective],
  templateUrl: './{component-prefix}-form-xyz.component.html',
})
export class {ComponentPrefix}FormXyzComponent implements OnInit, OnDestroy {
  @Input() label = '';
  @Input() hint = '';
  @Input() control: FormControl<MyValue | null> | null = null;
  readonly internalControl = new FormControl<MyValue | null>(null);
  rangeFocused = false;

  get effectiveControl() { return this.control ?? this.internalControl; }
  get hasValue(): boolean { /* feature */ }
  get showRangeContent(): boolean { return this.rangeFocused || this.hasValue; }
  get showErrorState(): boolean {
    return this.effectiveControl.invalid && this.effectiveControl.touched;
  }
  get errorMessage(): string | null { /* priority map */ }
}
```

## Template (Hülle)

Siehe Haupt-SKILL — Abschnitt „Shell-Template (Pflichtgerüst)“.
