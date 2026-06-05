# Form Field

**Kategorie:** Form Controls
**Selector:** `<mat-form-field>`
**Import:** `MatFormFieldModule` from `@angular/material/form-field`; Standalone: `MatFormField`, `MatLabel`, `MatHint`, `MatError`, `MatPrefix`, `MatSuffix`
**URL:** https://material.angular.dev/components/form-field/overview

## Übersicht

Container für Formulareingabeelemente mit Material Design-Styling. Verwaltet Label-Animation, Fehlermeldungen, Hint-Text und Prefix/Suffix-Elemente. Unterstützt zwei Erscheinungsbilder: `fill` (Standard in M3) und `outline`. Umschließt kompatible Steuerelemente wie `matInput`, `mat-select`, `mat-chip-grid`.

## Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `appearance` | `'fill' \| 'outline'` | Visuelles Erscheinungsbild |
| `floatLabel` | `'always' \| 'auto'` | Wann das Label floaten soll |
| `hideRequiredMarker` | `boolean` | Pflichtfeld-Sternchen ausblenden |
| `subscriptSizing` | `'fixed' \| 'dynamic'` | Platzbelegung für Hint/Error |
| `hintLabel` | `string` | Kurztext unterhalb |
| `color` | `ThemePalette` | Theme-Farbe (nur M2) |

## Unterdirektiven

| Selektor | Beschreibung |
|---------|-------------|
| `<mat-label>` | Label (floating oder statisch) |
| `<mat-hint>` | Hilfstext unten; `align="start\|end"` |
| `<mat-error>` | Fehlermeldung (erscheint bei invalid+touched) |
| `[matPrefix]` | Präfix-Element (links, innerhalb) |
| `[matSuffix]` | Suffix-Element (rechts, innerhalb) |
| `[matIconPrefix]` | Icon als Präfix |
| `[matIconSuffix]` | Icon als Suffix |
| `[matTextPrefix]` | Text als Präfix |
| `[matTextSuffix]` | Text als Suffix |

## Verwendungsbeispiel

```html
<mat-form-field appearance="outline">
  <mat-label>E-Mail</mat-label>
  <input matInput type="email" formControlName="email" required>
  <mat-icon matPrefix>email</mat-icon>
  <mat-hint>Ihre geschäftliche E-Mail-Adresse</mat-hint>
  <mat-error *ngIf="emailControl.hasError('required')">
    E-Mail ist erforderlich
  </mat-error>
</mat-form-field>
```

## CSS Custom Properties / Theming

`MAT_FORM_FIELD_DEFAULT_OPTIONS` für applikationsweite Standardwerte. M3 nutzt CSS-Custom-Properties für Token-basiertes Theming.

## Besonderheiten / Gotchas

- Nur Steuerelemente die `MatFormFieldControl` implementieren funktionieren innerhalb
- `subscriptSizing="dynamic"` verhindert Layout-Sprünge
- `<mat-label>`, `<mat-hint>`, `<mat-error>` etc. sind eigenständige Direktiven die projiziert werden
