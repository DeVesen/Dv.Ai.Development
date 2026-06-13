# Coercion

**Kategorie:** Utilities
**Import:** Einzelne Funktionen from `@angular/cdk/coercion`
**URL:** https://material.angular.dev/cdk/coercion/overview

## Übersicht

Das `coercion`-Paket stellt Hilfsfunktionen bereit, um datengebundene Werte (typischerweise Strings aus HTML-Attributen) in die richtigen TypeScript-Typen zu konvertieren. Diese Funktionen sind besonders nützlich für Angular-Input-Properties, die sowohl als String-Attribute als auch als typisierte Werte empfangen werden können. Das Paket umfasst Konverter für boolesche Werte, Zahlen, Arrays, CSS-Pixel-Werte und mehr.

## Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `coerceBooleanProperty` | Funktion | Konvertiert zu `boolean` |
| `BooleanInput` | Typ | `string \| boolean \| null \| undefined` |
| `coerceNumberProperty` | Funktion | Konvertiert zu `number` |
| `NumberInput` | Typ | `string \| number \| null \| undefined` |
| `coerceArray` | Funktion | Konvertiert einzelnen Wert zu Array |
| `coerceCssPixelValue` | Funktion | Fügt `px` hinzu falls nicht vorhanden |
| `coerceElement` | Funktion | Konvertiert `ElementRef` zu nativem Element |
| `coerceStringArray` | Funktion | Konvertiert zu String-Array |

## Verwendungsbeispiel

```typescript
import {
  coerceBooleanProperty,
  BooleanInput,
  coerceNumberProperty,
  NumberInput
} from '@angular/cdk/coercion';

@Component({
  selector: 'my-button',
  template: `<button [disabled]="disabled">{{ label }}</button>`
})
export class MyButtonComponent {
  private _disabled = false;
  private _size = 16;

  @Input()
  get disabled(): boolean { return this._disabled; }
  set disabled(value: BooleanInput) {
    this._disabled = coerceBooleanProperty(value);
  }

  @Input()
  get size(): number { return this._size; }
  set size(value: NumberInput) {
    this._size = coerceNumberProperty(value, 16);
  }
}
```

```typescript
// coerceArray: Einzelwert oder Array akzeptieren
import { coerceArray } from '@angular/cdk/coercion';

const single = coerceArray('hello');   // ['hello']
const arr = coerceArray(['a', 'b']);   // ['a', 'b']

// coerceCssPixelValue
import { coerceCssPixelValue } from '@angular/cdk/coercion';
coerceCssPixelValue(100);    // '100px'
coerceCssPixelValue('2em'); // '2em' (unverändert)
```

## Besonderheiten

- `coerceBooleanProperty('')` gibt `true` zurück — ein leerer String bedeutet dass das Attribut gesetzt ist (z. B. `<my-button disabled>`).
- `coerceBooleanProperty(null)` und `coerceBooleanProperty(undefined)` geben `false` zurück.
- `coerceNumberProperty` verwendet sowohl `parseFloat` als auch `Number()` für robustere Validierung (z.B. wird `'123hello'` nicht als gültige Zahl akzeptiert).
- Ein optionaler Fallback-Wert kann als zweites Argument an `coerceNumberProperty` übergeben werden.
- Diese Utilities ermöglichen natürliche HTML-Attribute wie `<my-button disabled>` statt `<my-button [disabled]="true">`.
