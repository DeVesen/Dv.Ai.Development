# Creating a Custom Form Field Control

**URL:** https://material.angular.dev/guide/creating-a-custom-form-field-control

## Zusammenfassung

Erklärt wie eine eigene Komponente innerhalb von `<mat-form-field>` funktioniert. Am Beispiel eines US-Telefonnummer-Inputs wird die vollständige Implementierung des `MatFormFieldControl`-Interfaces gezeigt. Integriert sich in Label, Prefix/Suffix, Hints und Errors.

## Kernpunkte

- Implementiert `MatFormFieldControl<T>` Interface
- Provider: `{provide: MatFormFieldControl, useExisting: MyComponent}`
- Pflichtfelder: `value`, `stateChanges`, `id`, `placeholder`, `ngControl`, `focused`, `empty`, `shouldLabelFloat`, `required`, `disabled`, `errorState`, `controlType`
- Methoden: `setDescribedByIds(ids)`, `onContainerClick(event)`
- `stateChanges` (RxJS Subject) bei jeder State-Änderung emittieren
- Accessibility: `role="group"` auf Container-Element, `aria-labelledby` mit Label-ID

## Code-Beispiele

Provider und Interface:
```typescript
@Component({
  providers: [{provide: MatFormFieldControl, useExisting: MyTelInput}],
})
export class MyTelInput implements MatFormFieldControl<MyTel> {
  stateChanges = new Subject<void>();
  static nextId = 0;
  @HostBinding() id = `example-tel-input-${MyTelInput.nextId++}`;
  controlType = 'example-tel-input';

  set value(tel: MyTel | null) {
    // Wert setzen ...
    this.stateChanges.next();
  }
  ngOnDestroy() { this.stateChanges.complete(); }
}
```

Aria-Beschreibung:
```typescript
setDescribedByIds(ids: string[]) {
  const el = this._elementRef.nativeElement.querySelector('.container')!;
  el.setAttribute('aria-describedby', ids.join(' '));
}
```

Verwendung:
```html
<mat-form-field>
  <example-tel-input placeholder="Phone number" required></example-tel-input>
  <mat-icon matPrefix>phone</mat-icon>
  <mat-hint>Include area code</mat-hint>
</mat-form-field>
```

## Wichtige Hinweise

- `updateErrorState()` wird bei jedem Change-Detection-Zyklus aufgerufen — minimale Logik
- `NG_VALUE_ACCESSOR`-Provider entfernen und `ngControl.valueAccessor = this` setzen (zyklische Abhängigkeiten vermeiden)
- `setDescribedByIds` muss `aria-describedby` aktuell halten
