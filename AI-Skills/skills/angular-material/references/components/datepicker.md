# Datepicker

**Kategorie:** Form Controls
**Selector:** `<mat-datepicker>`, `input[matDatepicker]`, `<mat-datepicker-toggle>`
**Import:** `MatDatepickerModule`, `MatNativeDateModule` from `@angular/material/datepicker`
**URL:** https://material.angular.dev/components/datepicker/overview

## Übersicht

Besteht aus mehreren zusammenarbeitenden Komponenten: Eingabefeld (`input[matDatepicker]`), Kalender-Popup (`<mat-datepicker>`) und optionalem Toggle-Button (`<mat-datepicker-toggle>`). Unterstützt `min`/`max`-Validierung und `matDatepickerFilter`. Datumsformat und Lokalisierung über `DateAdapter` und `MAT_DATE_FORMATS` konfigurierbar.

## Wichtige Inputs — `<mat-datepicker>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `startAt` | `D \| null` | Startdatum beim Öffnen |
| `startView` | `'month' \| 'year' \| 'multi-year'` | Anfangsansicht |
| `touchUi` | `boolean` | Touch-optimierter Dialog-Modus |
| `disabled` | `boolean` | Deaktivieren |
| `opened` | `boolean` | Öffnungszustand (Two-Way) |
| `xPosition` | `'start' \| 'end'` | Horizontale Ausrichtung |
| `yPosition` | `'above' \| 'below'` | Vertikale Ausrichtung |
| `restoreFocus` | `boolean` | Fokus nach Schließen wiederherstellen |
| `panelClass` | `string \| string[]` | CSS-Klassen für Panel |
| `dateClass` | `MatCalendarCellClassFunction<D>` | Individuelle Datumsklassen |
| `calendarHeaderComponent` | `ComponentType<any>` | Benutzerdefinierter Header |

## Wichtige Inputs — `input[matDatepicker]`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `matDatepicker` | `MatDatepicker` | Verknüpfter Datepicker |
| `min` | `D \| null` | Minimales Datum |
| `max` | `D \| null` | Maximales Datum |
| `matDatepickerFilter` | `DateFilterFn<D \| null>` | Filterfunktion (z.B. keine Wochenenden) |

## Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `yearSelected` | `EventEmitter<D>` | Jahr ausgewählt |
| `monthSelected` | `EventEmitter<D>` | Monat ausgewählt |
| `viewChanged` | `EventEmitter<MatCalendarView>` | Ansicht gewechselt |
| `openedStream` | `EventEmitter<void>` | Geöffnet |
| `closedStream` | `EventEmitter<void>` | Geschlossen |

## Verwendungsbeispiel

```html
<mat-form-field>
  <mat-label>Geburtsdatum</mat-label>
  <input matInput [matDatepicker]="picker" [min]="minDate" [max]="maxDate"
         formControlName="birthdate">
  <mat-hint>TT.MM.JJJJ</mat-hint>
  <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
  <mat-datepicker #picker startView="multi-year"></mat-datepicker>
</mat-form-field>
```

## Besonderheiten / Gotchas

- `MatNativeDateModule` (oder `MatMomentDateModule`) **muss** importiert werden — sonst Fehler
- Für Datumsbereiche: `<mat-date-range-input>` und `<mat-date-range-picker>`
- `matDatepickerFilter` verhindert Auswahl bestimmter Tage (z.B. Wochenenden)

## Date Range Picker

Für die Auswahl eines Zeitraums: `<mat-date-range-input>` enthält `matStartDate` und `matEndDate`, `<mat-date-range-picker>` öffnet den Kalender.

**Import:** `MatDateRangeInput`, `MatDateRangePicker`, `MatStartDate`, `MatEndDate`, `MatDateRangeSelectionStrategy`

```html
<mat-form-field>
  <mat-label>Zeitraum</mat-label>
  <mat-date-range-input [rangePicker]="rangePicker" [min]="minDate" [max]="maxDate">
    <input matStartDate formControlName="start" placeholder="Startdatum">
    <input matEndDate formControlName="end" placeholder="Enddatum">
  </mat-date-range-input>
  <mat-datepicker-toggle matIconSuffix [for]="rangePicker"></mat-datepicker-toggle>
  <mat-date-range-picker #rangePicker></mat-date-range-picker>
</mat-form-field>
```

```typescript
form = new FormGroup({
  start: new FormControl<Date | null>(null),
  end: new FormControl<Date | null>(null),
});
```

**DateRange-Inputs (`<mat-date-range-input>`):**
- `rangePicker` — verknüpfter `MatDateRangePicker`
- `min` / `max` — Begrenzungsdaten
- `disabled` — Deaktivieren

**`DateRange<D>`-Typ:** `{ start: D | null; end: D | null }` — kann für programmatischen Zugriff genutzt werden.

**Benutzerdefinierte Auswahlstrategie:** `MatDateRangeSelectionStrategy<D>` implementieren und via `MAT_DATE_RANGE_SELECTION_STRATEGY` bereitstellen.
