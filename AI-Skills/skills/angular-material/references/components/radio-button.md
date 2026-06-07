# Radio Button

**Kategorie:** Form Controls
**Selector:** `<mat-radio-group>`, `<mat-radio-button>`
**Import:** `MatRadioModule` from `@angular/material/radio`; Standalone: `MatRadioGroup`, `MatRadioButton`
**URL:** https://material.angular.dev/components/radio/overview

## Übersicht

Radio Buttons in einer `<mat-radio-group>` für gegenseitig exklusive Auswahl. Die Gruppe implementiert `ControlValueAccessor` für Reactive Forms und Template-driven Forms. Jeder `<mat-radio-button>` hat einen Wert der an das übergeordnete Formular weitergegeben wird.

## Wichtige Inputs — `<mat-radio-group>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `value` | `any` | Aktuell ausgewählter Wert |
| `name` | `string` | HTML-Name-Attribut für alle Buttons |
| `disabled` | `boolean` | Alle Buttons deaktivieren |
| `required` | `boolean` | Pflichtauswahl |
| `labelPosition` | `'before' \| 'after'` | Label-Position für alle Buttons |
| `disabledInteractive` | `boolean` | Interaktion mit deaktivierten Buttons |

## Wichtige Inputs — `<mat-radio-button>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `value` | `any` | Wert dieses Buttons |
| `checked` | `boolean` | Auswahlzustand |
| `disabled` | `boolean` | Diesen Button deaktivieren |
| `labelPosition` | `'before' \| 'after'` | Label-Position |
| `disableRipple` | `boolean` | Ripple deaktivieren |
| `color` | `ThemePalette` | Theme-Farbe (nur M2) |

## Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `change` | `EventEmitter<MatRadioChange>` | Auswahl geändert |

## Verwendungsbeispiel

```html
<mat-radio-group formControlName="gender" aria-label="Geschlecht">
  <mat-radio-button value="m">Männlich</mat-radio-button>
  <mat-radio-button value="f">Weiblich</mat-radio-button>
  <mat-radio-button value="d">Divers</mat-radio-button>
</mat-radio-group>
```

## Besonderheiten / Gotchas

- Immer in `<mat-radio-group>` verwenden — Auswahl-Logik und Accessibility erfordern das
- `MAT_RADIO_DEFAULT_OPTIONS` für applikationsweite Standardfarben
