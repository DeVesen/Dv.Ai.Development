# Shell and Directive — Snippet Skeletons

Copy basis for a new custom input. Replace `Xyz`/`xyz` placeholders.

## Directive (minimal)

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

## Shell component (excerpt)

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
  focused = false;

  get effectiveControl() { return this.control ?? this.internalControl; }
  get hasValue(): boolean { /* feature */ }
  get showContent(): boolean { return this.focused || this.hasValue; }
  get showErrorState(): boolean {
    return this.effectiveControl.invalid && this.effectiveControl.touched;
  }
  get errorMessage(): string | null { /* priority map */ }
}
```

## Template (shell)

Full required skeleton → [custom-input-architecture.md](custom-input-architecture.md), section "Shell template".
