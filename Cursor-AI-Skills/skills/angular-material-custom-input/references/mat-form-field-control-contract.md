# MatFormFieldControl — Pflichtvertrag (Direktive auf `.custom-input-range-wrapper`)

Die Direktive auf dem Wrapper implementiert `MatFormFieldControl<T>` (Angular Material 19+). Die Shell bindet Zustand per `@Input`; die Direktive hält **kein** eigenes `NgControl` für den Formularwert.

## Pflicht-Properties

| Member | Typ | Wer setzt | Hinweis |
|--------|-----|-----------|---------|
| `value` | `T \| null` | Shell `@Input` | Für `empty` |
| `disabled` | `boolean` | Shell | Beide/alle innere Felder deaktivieren |
| `errorState` | `boolean` | Shell | `invalid && touched` |
| `required` | `boolean` | Shell oder `false` | Konstant ok wenn Validierung nur am `FormControl` |
| `placeholder` | `string` | Shell | Material-API; oft kombiniert aus Feature-Platzhaltern |
| `focused` | `boolean` | Direktive | `focusin` / `focusout` auf Wrapper |
| `empty` | `getter` | Direktive | Feature-Logik (z. B. alle Teile null) |
| `shouldLabelFloat` | `getter` | Direktive | Typisch `focused \|\| !empty` |
| `stateChanges` | `Subject<void>` | Direktive | `next()` bei Zustandsänderung |
| `id` | `string` | Direktive | Eindeutig pro Instanz |
| `controlType` | `string` | Direktive | z. B. `'number-range'` → CSS-Klasse am Form-Field |
| `ngControl` | `null` | Konstant | Kein CVA auf dem Wrapper |
| `autofilled` | optional | `false` | |
| `userAriaDescribedBy` | getter | Aus `setDescribedByIds` | |

## Pflicht-Methoden

```typescript
setDescribedByIds(ids: string[]): void;
onContainerClick(event: MouseEvent): void;
```

### `onContainerClick` (kritisch)

```typescript
onContainerClick(event: MouseEvent): void {
  const target = event.target as Node | null;
  if (target) {
    const inputs = this.el.nativeElement.querySelectorAll('input');
    for (let i = 0; i < inputs.length; i++) {
      if (inputs[i] === target) {
        return; // Klick war auf diesem Input — Fokus nicht umleiten
      }
    }
  }
  const first = this.el.nativeElement.querySelector<HTMLElement>(
    'input, select, button, [tabindex]:not([tabindex="-1"])'
  );
  (first as HTMLInputElement)?.focus?.();
}
```

Bei `HTMLInputElement`-Klick alternativ: `if (target instanceof HTMLInputElement) { target.focus(); return; }`.

## Outputs (empfohlen)

| Output | Wann |
|--------|------|
| `touched` | Wrapper verliert Fokus (echtes `focusout`) |
| `focusedChange: boolean` | `true`/`false` für Shell `showRangeContent` |

## Host-Metadaten (empfohlen)

```typescript
host: {
  role: 'group',
  '[attr.id]': 'id',
  '[attr.aria-describedby]': 'userAriaDescribedBy',
},
```

## Lifecycle

`ngOnDestroy`: `stateChanges.complete()`.
