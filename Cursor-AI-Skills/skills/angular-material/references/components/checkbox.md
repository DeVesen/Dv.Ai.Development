# Checkbox

**Kategorie:** Form Controls
**Selector:** `<mat-checkbox>`
**Import:** `MatCheckboxModule` from `@angular/material/checkbox`; Standalone: `MatCheckbox`
**URL:** https://material.angular.dev/components/checkbox/overview

## Übersicht

Material Design-Checkbox auf Basis des nativen `<input type="checkbox">`. Unterstützt den dritten `indeterminate`-Zustand für „Alle auswählen"-Szenarien. Vollständige Integration in Reactive Forms und Template-driven Forms.

## Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `checked` | `boolean` | Markierungszustand |
| `indeterminate` | `boolean` | Unbestimmter Zustand (Mischzustand) |
| `disabled` | `boolean` | Checkbox deaktivieren |
| `disabledInteractive` | `boolean` | Bleibt interaktiv wenn deaktiviert |
| `required` | `boolean` | Pflichtfeld |
| `labelPosition` | `'before' \| 'after'` | Label-Position |
| `color` | `string` | Theme-Farbe (nur M2) |
| `disableRipple` | `boolean` | Ripple deaktivieren |
| `value` | `string` | Wert des nativen Input |
| `name` | `string \| null` | Name-Attribut |
| `id` | `string` | Element-ID |

## Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `change` | `EventEmitter<MatCheckboxChange>` | `checked`-Wert geändert |
| `indeterminateChange` | `EventEmitter<boolean>` | `indeterminate`-Zustand geändert |

## Verwendungsbeispiel

```html
<mat-checkbox [(ngModel)]="isChecked" labelPosition="after">
  Ich stimme den AGB zu
</mat-checkbox>

<!-- Mit indeterminate -->
<mat-checkbox [checked]="allSelected" [indeterminate]="someSelected"
              (change)="toggleAll($event)">
  Alle auswählen
</mat-checkbox>
```

## CSS Custom Properties / Theming

M3: Farbe über Token-System. `color`-Input wirkt nur in M2-Themes.

## Besonderheiten / Gotchas

- `indeterminate` → nächster Klick setzt es auf `false` (unabhängig von `checked`)
- Programmatisch: `toggle()` und `focus()` verfügbar
