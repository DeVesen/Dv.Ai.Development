# Angular Material v22.0.0 – Komponenten-Dokumentation

> Vollständige Referenz aller Angular Material Komponenten (Version 22.0.0, Standalone-API).
> Scraped und strukturiert aus https://github.com/angular/components (Branch `22.0.x`).

---

## Inhaltsverzeichnis

**Form Controls**
- [Autocomplete](#autocomplete)
- [Checkbox](#checkbox)
- [Datepicker](#datepicker)
- [Form Field](#form-field)
- [Input](#input)
- [Radio Button](#radio-button)
- [Select](#select)
- [Slider](#slider)
- [Slide Toggle](#slide-toggle)

**Navigation**
- [Menu](#menu)
- [Sidenav / Drawer](#sidenav--drawer)
- [Toolbar](#toolbar)

**Layout**
- [Card](#card)
- [Divider](#divider)
- [Expansion Panel / Accordion](#expansion-panel--accordion)
- [Grid List](#grid-list)
- [List](#list)
- [Stepper](#stepper)
- [Tabs](#tabs)
- [Tree](#tree)

**Buttons & Indicators**
- [Button](#button)
- [Button Toggle](#button-toggle)
- [Badge](#badge)
- [Chips](#chips)
- [Icon](#icon)
- [Progress Bar](#progress-bar)
- [Progress Spinner](#progress-spinner)
- [Ripple](#ripple)

**Popups & Modals**
- [Bottom Sheet](#bottom-sheet)
- [Dialog](#dialog)
- [Snack Bar](#snack-bar)
- [Tooltip](#tooltip)

**Data Table**
- [Paginator](#paginator)
- [Sort Header](#sort-header)
- [Table](#table)

---

# FORM CONTROLS

---

## Autocomplete

**Kategorie:** Form Controls
**Selector:** `<mat-autocomplete>`, Trigger: `input[matAutocomplete]`
**Import:** `MatAutocompleteModule` from `@angular/material/autocomplete`; oder standalone: `MatAutocomplete`, `MatAutocompleteTrigger`
**URL:** https://material.angular.dev/components/autocomplete/overview

### Übersicht
Die Autocomplete-Komponente ergänzt ein Text-Eingabefeld um ein Overlay-Panel mit gefilterten Vorschlägen. Sie besteht aus zwei Teilen: dem `<mat-autocomplete>`-Panel, das `<mat-option>`-Elemente enthält, und dem `matAutocomplete`-Trigger-Attribut auf dem `<input>`-Element. Die Komponente unterstützt reaktive Formulare sowie Template-driven Forms und ist vollständig barrierefrei (ARIA). Das Panel öffnet sich automatisch, wenn das Eingabefeld den Fokus erhält, und schließt sich bei Blur oder Auswahl.

### Wichtige Inputs – `<mat-autocomplete>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `displayWith` | `(value: any) => string` | Funktion, die den Optionswert in einen Anzeigetext umwandelt |
| `autoActiveFirstOption` | `boolean` | Erste Option beim Öffnen automatisch hervorheben |
| `autoSelectActiveOption` | `boolean` | Aktive Option beim Navigieren automatisch auswählen |
| `requireSelection` | `boolean` | Wert wird zurückgesetzt, wenn kein Eintrag ausgewählt wurde |
| `panelWidth` | `string \| number` | Breite des Autocomplete-Panels |
| `disableRipple` | `boolean` | Deaktiviert Ripple-Effekte im Panel |
| `hideSingleSelectionIndicator` | `boolean` | Blendet den Haken bei Einzelauswahl aus |

### Wichtige Inputs – `matAutocomplete`-Trigger

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `matAutocomplete` | `MatAutocomplete` | Das verknüpfte Autocomplete-Panel |
| `matAutocompletePosition` | `'auto' \| 'above' \| 'below'` | Positionierung des Panels |
| `matAutocompleteConnectedTo` | `MatAutocompleteOrigin` | Referenzelement für die Panel-Positionierung |
| `matAutocompleteDisabled` | `boolean` | Deaktiviert die Autocomplete-Funktion |

### Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `optionSelected` | `EventEmitter<MatAutocompleteSelectedEvent>` | Emittiert bei Optionsauswahl |
| `opened` | `EventEmitter<void>` | Emittiert wenn Panel öffnet |
| `closed` | `EventEmitter<void>` | Emittiert wenn Panel schließt |
| `optionActivated` | `EventEmitter<MatAutocompleteActivatedEvent>` | Emittiert bei Aktivierung einer Option per Tastatur |

### Verwendungsbeispiel

```html
<mat-form-field>
  <input type="text" matInput [formControl]="myControl"
         [matAutocomplete]="auto" placeholder="Suchen...">
  <mat-autocomplete #auto="matAutocomplete" [displayWith]="displayFn">
    <mat-option *ngFor="let option of filteredOptions | async" [value]="option">
      {{ option.name }}
    </mat-option>
  </mat-autocomplete>
</mat-form-field>
```

### CSS Custom Properties / Theming
Das Autocomplete-Panel erbt das M3-Theme-System. Über `panelClass` können eigene Klassen auf das Overlay angewendet werden.

### Besonderheiten / Gotchas
- `displayWith` ist notwendig, wenn der Optionswert ein Objekt ist; andernfalls wird `[object Object]` angezeigt.
- Mit `requireSelection: true` wird der Eingabewert beim Verlassen ohne Auswahl auf den letzten gültigen Wert zurückgesetzt.
- Das Trigger-Input `autocomplete="off"` verhindert Browser-Autovervollständigung.

---

## Checkbox

**Kategorie:** Form Controls
**Selector:** `<mat-checkbox>`
**Import:** `MatCheckboxModule` from `@angular/material/checkbox`; standalone: `MatCheckbox`
**URL:** https://material.angular.dev/components/checkbox/overview

### Übersicht
`<mat-checkbox>` ist eine Material Design-Checkbox-Implementierung auf Basis des nativen `<input type="checkbox">`. Sie unterstützt den dritten „indeterminate"-Zustand (unbestimmter Zustand, z. B. bei „Alle auswählen"-Szenarien). Die Komponente integriert sich vollständig in Angular Reactive Forms und Template-driven Forms. Ripple-Effekte und Label-Positionierung sind konfigurierbar.

### Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `checked` | `boolean` | Ob die Checkbox markiert ist |
| `indeterminate` | `boolean` | Unbestimmter Zustand (Mischzustand) |
| `disabled` | `boolean` | Deaktiviert die Checkbox |
| `disabledInteractive` | `boolean` | Deaktivierte Checkbox bleibt interaktiv |
| `required` | `boolean` | Pflichtfeld-Markierung |
| `labelPosition` | `'before' \| 'after'` | Position des Labels relativ zur Checkbox |
| `color` | `string` | Theme-Farbe (nur M2) |
| `disableRipple` | `boolean` | Deaktiviert Ripple |
| `value` | `string` | Wert des nativen Input-Elements |
| `name` | `string \| null` | Name-Attribut |
| `id` | `string` | Eindeutige ID |

### Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `change` | `EventEmitter<MatCheckboxChange>` | Emittiert wenn `checked`-Wert sich ändert |
| `indeterminateChange` | `EventEmitter<boolean>` | Emittiert wenn `indeterminate`-Zustand sich ändert |

### Verwendungsbeispiel

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

### CSS Custom Properties / Theming
In M3 wird die Farbe über das Token-System gesteuert. `color`-Input wirkt nur in M2-Themes.

### Besonderheiten / Gotchas
- `indeterminate` wird beim nächsten Klick zu `false` (egal ob `checked` dann `true` oder `false`).
- `toggle()` und `focus()` stehen als programmatische Methoden zur Verfügung.

---

## Datepicker

**Kategorie:** Form Controls
**Selector:** `<mat-datepicker>`, `input[matDatepicker]`, `<mat-datepicker-toggle>`
**Import:** `MatDatepickerModule`, `MatNativeDateModule` from `@angular/material/datepicker`
**URL:** https://material.angular.dev/components/datepicker/overview

### Übersicht
Der Datepicker besteht aus mehreren zusammenarbeitenden Komponenten: dem Eingabefeld (`input[matDatepicker]`), dem Kalender-Popup (`<mat-datepicker>`) und optional einem Toggle-Button (`<mat-datepicker-toggle>`). Er unterstützt Datumsvalidierung über `min`/`max`-Inputs und einen `matDatepickerFilter`. Das Datum-Format und die Lokalisierung werden über `DateAdapter` und `MAT_DATE_FORMATS` konfiguriert – standardmäßig über `MatNativeDateModule` mit JavaScript-Date-Objekten oder über `MatMomentDateModule` (separates Paket).

### Wichtige Inputs – `<mat-datepicker>` / `MatDatepickerBase`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `startAt` | `D \| null` | Startdatum beim ersten Öffnen |
| `startView` | `'month' \| 'year' \| 'multi-year'` | Anfangsansicht des Kalenders |
| `touchUi` | `boolean` | Touch-optimierter Dialog-Modus |
| `disabled` | `boolean` | Deaktiviert den Datepicker |
| `opened` | `boolean` | Öffnungszustand (two-way binding möglich) |
| `xPosition` | `'start' \| 'end'` | Horizontale Ausrichtung |
| `yPosition` | `'above' \| 'below'` | Vertikale Ausrichtung |
| `restoreFocus` | `boolean` | Fokus nach Schließen wiederherstellen |
| `panelClass` | `string \| string[]` | CSS-Klassen für das Panel |
| `dateClass` | `MatCalendarCellClassFunction<D>` | Funktion für individuelle Datumsklassen |
| `calendarHeaderComponent` | `ComponentType<any>` | Benutzerdefinierter Kalender-Header |

### Wichtige Inputs – `input[matDatepicker]`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `matDatepicker` | `MatDatepicker` | Verknüpfter Datepicker |
| `min` | `D \| null` | Minimales erlaubtes Datum |
| `max` | `D \| null` | Maximales erlaubtes Datum |
| `matDatepickerFilter` | `DateFilterFn<D \| null>` | Filterfunktion für nicht-wählbare Tage |

### Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `yearSelected` | `EventEmitter<D>` | Emittiert wenn Jahr ausgewählt wird |
| `monthSelected` | `EventEmitter<D>` | Emittiert wenn Monat ausgewählt wird |
| `viewChanged` | `EventEmitter<MatCalendarView>` | Emittiert bei Ansichtswechsel |
| `openedStream` | `EventEmitter<void>` | Datepicker geöffnet |
| `closedStream` | `EventEmitter<void>` | Datepicker geschlossen |

### Verwendungsbeispiel

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

### CSS Custom Properties / Theming
Der Kalender verwendet das M3-Token-System für Farben und Abstände.

### Besonderheiten / Gotchas
- `MatNativeDateModule` muss importiert werden (oder `MatMomentDateModule`). Ohne `DateAdapter` wirft Angular einen Fehler.
- Für den Date Range Picker existieren `<mat-date-range-input>` und `<mat-date-range-picker>` als separate Komponenten.
- `matDatepickerFilter` verhindert die Auswahl bestimmter Daten (z. B. Wochenenden).

---

## Form Field

**Kategorie:** Form Controls
**Selector:** `<mat-form-field>`
**Import:** `MatFormFieldModule` from `@angular/material/form-field`; standalone: `MatFormField`, `MatLabel`, `MatHint`, `MatError`, `MatPrefix`, `MatSuffix`
**URL:** https://material.angular.dev/components/form-field/overview

### Übersicht
`<mat-form-field>` ist ein Container für Formulareingabeelemente, der Material Design-Styling und -Verhalten bereitstellt. Er umschließt kompatible Steuerelemente wie `matInput`, `mat-select`, `mat-chip-grid` und andere. Das Form Field verwaltet Label-Animation, Fehlermeldungen, Hint-Text und Prefix/Suffix-Elemente. Es unterstützt zwei Erscheinungsbilder: `fill` (Standard in M3) und `outline`.

### Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `appearance` | `'fill' \| 'outline'` | Visuelles Erscheinungsbild |
| `floatLabel` | `'always' \| 'auto'` | Wann das Label floaten soll |
| `hideRequiredMarker` | `boolean` | Pflichtfeld-Sternchen ausblenden |
| `subscriptSizing` | `'fixed' \| 'dynamic'` | Ob Platz für Hint/Error reserviert wird |
| `hintLabel` | `string` | Kurztext unterhalb des Feldes |
| `color` | `ThemePalette` | Theme-Farbe (nur M2) |

### Verwendungsbeispiel

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

### CSS Custom Properties / Theming
Über `MAT_FORM_FIELD_DEFAULT_OPTIONS` können applikationsweite Standardwerte gesetzt werden. M3 verwendet CSS-Custom-Properties für Token-basiertes Theming.

### Besonderheiten / Gotchas
- Nur Steuerelemente, die `MatFormFieldControl` implementieren, funktionieren innerhalb von `<mat-form-field>`.
- `<mat-label>`, `<mat-hint>`, `<mat-error>`, `<mat-prefix>`, `<mat-suffix>` sind eigenständige Direktiven, die innerhalb des Form Fields projiziert werden.
- `subscriptSizing="dynamic"` verhindert Layout-Sprünge durch dynamisches Anpassen der Höhe.

---

## Input

**Kategorie:** Form Controls
**Selector:** `input[matInput]`, `textarea[matInput]`, `select[matNativeControl]`
**Import:** `MatInputModule` from `@angular/material/input`; standalone: `MatInput`
**URL:** https://material.angular.dev/components/input/overview

### Übersicht
Die `matInput`-Direktive fügt einem nativen `<input>` oder `<textarea>` Material Design-Verhalten hinzu, sodass es innerhalb von `<mat-form-field>` korrekt dargestellt wird. Die Direktive implementiert `MatFormFieldControl` und übermittelt Zustandsänderungen an das Form Field. Sie unterstützt alle HTML-Eingabetypen sowie Autosize für Textareas.

### Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `disabled` | `boolean` | Deaktiviert das Eingabefeld |
| `id` | `string` | Element-ID |
| `placeholder` | `string` | Platzhaltertext |
| `required` | `boolean` | Pflichtfeld |
| `type` | `string` | Input-Typ (text, email, number etc.) |
| `value` | `string` | Aktueller Wert |
| `readonly` | `boolean` | Nur-Lesen-Modus |
| `errorStateMatcher` | `ErrorStateMatcher` | Steuert wann Fehler angezeigt werden |
| `disabledInteractive` | `boolean` | Input bleibt interaktiv wenn deaktiviert |

### Verwendungsbeispiel

```html
<mat-form-field>
  <mat-label>Benutzername</mat-label>
  <input matInput type="text" formControlName="username"
         placeholder="max.mustermann">
</mat-form-field>

<!-- Textarea mit Autosize -->
<mat-form-field>
  <mat-label>Nachricht</mat-label>
  <textarea matInput cdkTextareaAutosize
            cdkAutosizeMinRows="3" cdkAutosizeMaxRows="10"
            formControlName="message"></textarea>
</mat-form-field>
```

### CSS Custom Properties / Theming
Styling erfolgt über das übergeordnete `<mat-form-field>`.

### Besonderheiten / Gotchas
- Für Textarea-Autosize muss `CdkTextareaAutosize` aus `@angular/cdk/text-field` zusätzlich importiert werden.
- `type="number"` funktioniert, aber Zahlenwerte werden als `string` geliefert – im Formular ggf. Konvertierung nötig.

---

## Radio Button

**Kategorie:** Form Controls
**Selector:** `<mat-radio-group>`, `<mat-radio-button>`
**Import:** `MatRadioModule` from `@angular/material/radio`; standalone: `MatRadioGroup`, `MatRadioButton`
**URL:** https://material.angular.dev/components/radio/overview

### Übersicht
Radio Buttons werden in einer `<mat-radio-group>` zusammengefasst, die die gegenseitig exklusive Auswahl verwaltet. Die Gruppe implementiert `ControlValueAccessor` für den Einsatz mit Reactive Forms und Template-driven Forms. Jeder `<mat-radio-button>` hat einen Wert, der beim Auswählen an das übergeordnete Formular weitergegeben wird.

### Wichtige Inputs – `<mat-radio-group>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `value` | `any` | Aktuell ausgewählter Wert |
| `name` | `string` | HTML-Name-Attribut für alle Buttons |
| `disabled` | `boolean` | Deaktiviert alle Buttons der Gruppe |
| `required` | `boolean` | Pflichtauswahl |
| `labelPosition` | `'before' \| 'after'` | Label-Position für alle Buttons |
| `disabledInteractive` | `boolean` | Interaktion mit deaktivierten Buttons erlauben |

### Wichtige Inputs – `<mat-radio-button>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `value` | `any` | Wert dieses Buttons |
| `checked` | `boolean` | Auswahlzustand |
| `disabled` | `boolean` | Deaktiviert diesen Button |
| `labelPosition` | `'before' \| 'after'` | Label-Position |
| `disableRipple` | `boolean` | Deaktiviert Ripple |
| `color` | `ThemePalette` | Theme-Farbe (nur M2) |

### Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `change` | `EventEmitter<MatRadioChange>` | Emittiert bei Änderung (Gruppe und einzelner Button) |

### Verwendungsbeispiel

```html
<mat-radio-group formControlName="gender" aria-label="Geschlecht">
  <mat-radio-button value="m">Männlich</mat-radio-button>
  <mat-radio-button value="f">Weiblich</mat-radio-button>
  <mat-radio-button value="d">Divers</mat-radio-button>
</mat-radio-group>
```

### CSS Custom Properties / Theming
`color`-Input wirkt nur in M2. In M3 über Token-System.

### Besonderheiten / Gotchas
- Radio Buttons sollten immer in einer `<mat-radio-group>` verwendet werden, damit die Auswahl-Logik und Accessibility korrekt funktionieren.
- `MAT_RADIO_DEFAULT_OPTIONS` ermöglicht applikationsweite Standardfarben.

---

## Select

**Kategorie:** Form Controls
**Selector:** `<mat-select>`
**Import:** `MatSelectModule` from `@angular/material/select`; standalone: `MatSelect`
**URL:** https://material.angular.dev/components/select/overview

### Übersicht
`<mat-select>` ist ein vollständig barrierefreier Dropdown-Selektor mit Material Design-Styling. Er ersetzt das native `<select>`-Element und unterstützt Einzel- und Mehrfachauswahl, Optionsgruppen über `<mat-optgroup>`, benutzerdefinierte Trigger-Anzeige via `<mat-select-trigger>` und Typahead-Navigation. Die Komponente integriert sich in `<mat-form-field>` und Angular Forms.

### Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `multiple` | `boolean` | Mehrfachauswahl erlauben |
| `disabled` | `boolean` | Deaktiviert den Select |
| `required` | `boolean` | Pflichtfeld |
| `placeholder` | `string` | Platzhaltertext ohne Auswahl |
| `compareWith` | `(o1: any, o2: any) => boolean` | Vergleichsfunktion für Optionswerte |
| `value` | `any` | Aktueller Wert |
| `panelWidth` | `string \| number \| null` | Panel-Breite (`'auto'` = Trigger-Breite) |
| `disableOptionCentering` | `boolean` | Aktive Option nicht über Trigger zentrieren |
| `hideSingleSelectionIndicator` | `boolean` | Haken bei Einzelauswahl ausblenden |
| `typeaheadDebounceInterval` | `number` | Debounce-Zeit für Typeahead in ms |
| `errorStateMatcher` | `ErrorStateMatcher` | Wann Fehler angezeigt werden |

### Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `selectionChange` | `EventEmitter<MatSelectChange>` | Emittiert bei Auswahländerung |
| `openedChange` | `EventEmitter<boolean>` | Panel geöffnet/geschlossen |
| `opened` | `Observable<void>` | Panel geöffnet |
| `closed` | `Observable<void>` | Panel geschlossen |
| `valueChange` | `EventEmitter<any>` | Rohwert hat sich geändert |

### Verwendungsbeispiel

```html
<mat-form-field>
  <mat-label>Land</mat-label>
  <mat-select formControlName="country" multiple>
    <mat-optgroup label="Europa">
      <mat-option value="de">Deutschland</mat-option>
      <mat-option value="at">Österreich</mat-option>
    </mat-optgroup>
    <mat-optgroup label="Amerika">
      <mat-option value="us">USA</mat-option>
    </mat-optgroup>
  </mat-select>
</mat-form-field>
```

### CSS Custom Properties / Theming
`MAT_SELECT_CONFIG` ermöglicht applikationsweite Standardkonfiguration.

### Besonderheiten / Gotchas
- Bei Objektwerten muss `compareWith` implementiert werden, damit die Auswahl nach Datenneu-Laden korrekt angezeigt wird.
- `<mat-select-trigger>` ermöglicht benutzerdefinierte Anzeige im geschlossenen Zustand.

---

## Slider

**Kategorie:** Form Controls
**Selector:** `<mat-slider>`, `input[matSliderThumb]`, `input[matSliderStartThumb]`, `input[matSliderEndThumb]`
**Import:** `MatSliderModule` from `@angular/material/slider`; standalone: `MatSlider`, `MatSliderThumb`, `MatSliderRangeThumb`
**URL:** https://material.angular.dev/components/slider/overview

### Übersicht
Der `<mat-slider>` ist eine Material Design-Implementierung eines Bereichsschiebers. Der Schieberegler enthält ein oder zwei `<input matSliderThumb>`-Elemente (für Einzel- oder Bereichsauswahl). Durch diese Architektur ist der Slider direkt mit Angular Forms kompatibel, da das `<input>`-Element als Formularsteuerelement dient. Tick-Marks, diskrete Wertanzeige und benutzerdefinierte Formatierung sind verfügbar.

### Wichtige Inputs – `<mat-slider>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `min` | `number` | Minimaler Wert (Standard: 0) |
| `max` | `number` | Maximaler Wert (Standard: 100) |
| `step` | `number` | Schrittgröße (Standard: 1) |
| `discrete` | `boolean` | Numerisches Label beim Drücken anzeigen |
| `showTickMarks` | `boolean` | Tick-Markierungen anzeigen |
| `disabled` | `boolean` | Deaktiviert den Slider |
| `disableRipple` | `boolean` | Deaktiviert Ripple |
| `displayWith` | `(value: number) => string` | Wert-Formatierungsfunktion |

### Wichtige Inputs/Outputs – `input[matSliderThumb]`

| Input/Output | Typ | Beschreibung |
|--------------|-----|-------------|
| `value` | `number` (Input) | Aktueller Wert |
| `valueChange` | `EventEmitter<number>` (Output) | Wert geändert |
| `dragStart` | `EventEmitter<MatSliderDragEvent>` (Output) | Ziehen beginnt |
| `dragEnd` | `EventEmitter<MatSliderDragEvent>` (Output) | Ziehen endet |

### Verwendungsbeispiel

```html
<!-- Einfacher Slider -->
<mat-slider min="0" max="100" step="5" discrete>
  <input matSliderThumb [(ngModel)]="volume">
</mat-slider>

<!-- Range Slider -->
<mat-slider>
  <input matSliderStartThumb [(ngModel)]="minPrice">
  <input matSliderEndThumb [(ngModel)]="maxPrice">
</mat-slider>
```

### CSS Custom Properties / Theming
Farbe in M2 über `color`-Input; in M3 über Token-System.

### Besonderheiten / Gotchas
- Die neue API (v15+) erfordert, dass `<input matSliderThumb>` direkt im `<mat-slider>` liegt.
- `displayWith` ermöglicht Formatierung wie `€ 50` für den Tooltip.

---

## Slide Toggle

**Kategorie:** Form Controls
**Selector:** `<mat-slide-toggle>`
**Import:** `MatSlideToggleModule` from `@angular/material/slide-toggle`; standalone: `MatSlideToggle`
**URL:** https://material.angular.dev/components/slide-toggle/overview

### Übersicht
`<mat-slide-toggle>` ist ein Ein/Aus-Schalter im Material Design-Stil, vergleichbar mit einer Checkbox, aber mit einem Schiebe-Interaktionsmuster. Die Komponente implementiert `ControlValueAccessor` für Angular Forms. Ab M3 kann ein Icon innerhalb des Toggles angezeigt werden.

### Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `checked` | `boolean` | Aktivierungszustand |
| `disabled` | `boolean` | Deaktiviert das Toggle |
| `disabledInteractive` | `boolean` | Toggle bleibt interaktiv wenn deaktiviert |
| `required` | `boolean` | Pflichtfeld |
| `labelPosition` | `'before' \| 'after'` | Label-Position |
| `hideIcon` | `boolean` | Icon im Toggle ausblenden |
| `disableRipple` | `boolean` | Deaktiviert Ripple |
| `color` | `string` | Theme-Farbe (nur M2) |
| `name` | `string \| null` | Name-Attribut |

### Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `change` | `EventEmitter<MatSlideToggleChange>` | Emittiert bei Wertänderung |
| `toggleChange` | `EventEmitter<void>` | Emittiert bei jeder Aktivierung |

### Verwendungsbeispiel

```html
<mat-slide-toggle [(ngModel)]="notifications" labelPosition="before">
  Benachrichtigungen aktivieren
</mat-slide-toggle>
```

### CSS Custom Properties / Theming
In M3 wird das Erscheinungsbild über Token-System gesteuert. `color` wirkt nur in M2.

### Besonderheiten / Gotchas
- `toggle()` und `focus()` stehen als programmatische Methoden zur Verfügung.
- `toggleChange` emittiert bei jeder Schalterbetätigung, `change` nur wenn der Wert sich tatsächlich ändert.

---

# NAVIGATION

---

## Menu

**Kategorie:** Navigation
**Selector:** `<mat-menu>`, `[mat-menu-item]`, `[matMenuTriggerFor]`
**Import:** `MatMenuModule` from `@angular/material/menu`; standalone: `MatMenu`, `MatMenuItem`, `MatMenuTrigger`
**URL:** https://material.angular.dev/components/menu/overview

### Übersicht
Das Material Menu ermöglicht kontextbezogene Aktionslisten in einem Overlay-Panel. Es besteht aus dem `<mat-menu>`-Panel mit `[mat-menu-item]`-Einträgen und dem `[matMenuTriggerFor]`-Trigger auf einem beliebigen Element. Untermenüs (Cascading Menus) werden durch Platzierung von `[matMenuTriggerFor]` auf einem `mat-menu-item` realisiert. Das Menü unterstützt Tastaturnavigation, Icons, Badges und Divider.

### Wichtige Inputs – `<mat-menu>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `xPosition` | `'before' \| 'after'` | Horizontale Positionierung |
| `yPosition` | `'above' \| 'below'` | Vertikale Positionierung |
| `overlapTrigger` | `boolean` | Panel überlappt den Trigger |
| `hasBackdrop` | `boolean` | Backdrop anzeigen |
| `backdropClass` | `string` | CSS-Klasse für den Backdrop |
| `panelClass` | `string` | CSS-Klassen für das Panel (via `class`) |

### Wichtige Inputs – `[mat-menu-item]`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `disabled` | `boolean` | Deaktiviert den Menüeintrag |
| `disableRipple` | `boolean` | Deaktiviert Ripple |
| `role` | `'menuitem' \| 'menuitemradio' \| 'menuitemcheckbox'` | ARIA-Rolle |

### Wichtige Inputs/Outputs – `[matMenuTriggerFor]`

| Input/Output | Typ | Beschreibung |
|--------------|-----|-------------|
| `matMenuTriggerFor` | `MatMenu` (Input) | Verknüpftes Menü |
| `matMenuTriggerData` | `any` (Input) | Daten für Lazy-Content |
| `matMenuTriggerRestoreFocus` | `boolean` (Input) | Fokus nach Schließen wiederherstellen |
| `menuOpened` | `EventEmitter` (Output) | Menü geöffnet |
| `menuClosed` | `EventEmitter` (Output) | Menü geschlossen |

### Wichtige Outputs – `<mat-menu>`

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `closed` | `EventEmitter<MenuCloseReason>` | Menü geschlossen |

### Verwendungsbeispiel

```html
<button mat-button [matMenuTriggerFor]="actionsMenu">
  Aktionen <mat-icon>arrow_drop_down</mat-icon>
</button>

<mat-menu #actionsMenu="matMenu">
  <button mat-menu-item (click)="edit()">
    <mat-icon>edit</mat-icon>
    <span>Bearbeiten</span>
  </button>
  <button mat-menu-item [matMenuTriggerFor]="exportMenu">
    <mat-icon>download</mat-icon>
    <span>Exportieren</span>
  </button>
  <button mat-menu-item disabled>Löschen</button>
</mat-menu>

<mat-menu #exportMenu="matMenu">
  <button mat-menu-item>CSV</button>
  <button mat-menu-item>PDF</button>
</mat-menu>
```

### Besonderheiten / Gotchas
- `<mat-menu>` wird als Template definiert und erst beim Öffnen ins DOM gerendert (Lazy Rendering).
- Für Icons in Menüeinträgen: `<mat-icon>` vor dem `<span>` platzieren.
- Untermenüs: `[matMenuTriggerFor]` auf `mat-menu-item` verwenden.

---

## Sidenav / Drawer

**Kategorie:** Navigation
**Selector:** `<mat-sidenav-container>`, `<mat-sidenav>`, `<mat-sidenav-content>` / `<mat-drawer-container>`, `<mat-drawer>`, `<mat-drawer-content>`
**Import:** `MatSidenavModule` from `@angular/material/sidenav`; standalone: `MatSidenav`, `MatSidenavContainer`, `MatSidenavContent`, `MatDrawer`, `MatDrawerContainer`, `MatDrawerContent`
**URL:** https://material.angular.dev/components/sidenav/overview

### Übersicht
Die Sidenav-Komponente bietet ein seitliches Navigations-Panel neben dem Hauptinhalt. `MatSidenav` erweitert `MatDrawer` mit Viewport-fixierter Positionierung. `MatDrawer` ist die Basiskomponente für allgemeine Overlay-Panels. Drei Modi stehen zur Verfügung: `over` (schwebend über dem Inhalt), `push` (schiebt den Inhalt), `side` (nebeneinander).

### Wichtige Inputs – `<mat-drawer>` / `<mat-sidenav>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `mode` | `'over' \| 'push' \| 'side'` | Anzeigemodus |
| `position` | `'start' \| 'end'` | Seite auf der der Drawer erscheint |
| `opened` | `boolean` | Öffnungszustand |
| `disableClose` | `boolean` | Schließen via Escape/Backdrop deaktivieren |
| `autoFocus` | `AutoFocusTarget \| string \| boolean` | Fokus beim Öffnen |
| `fixedInViewport` | `boolean` | Viewport-fixiert (nur `MatSidenav`) |
| `fixedTopGap` | `number` | Abstand oben im fixierten Modus |
| `fixedBottomGap` | `number` | Abstand unten im fixierten Modus |

### Wichtige Inputs – `<mat-drawer-container>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `autosize` | `boolean` | Container-Größe bei Drawer-Änderung anpassen |
| `hasBackdrop` | `boolean` | Backdrop anzeigen |

### Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `openedChange` | `EventEmitter<boolean>` | Öffnungszustand geändert |
| `opened` | `Observable<void>` | Drawer geöffnet |
| `closed` | `Observable<void>` | Drawer geschlossen |
| `positionChanged` | `EventEmitter` | Position geändert |
| `backdropClick` | `EventEmitter<void>` | Backdrop geklickt (Container) |

### Verwendungsbeispiel

```html
<mat-sidenav-container>
  <mat-sidenav #sidenav mode="side" opened>
    <mat-nav-list>
      <a mat-list-item routerLink="/dashboard">Dashboard</a>
      <a mat-list-item routerLink="/settings">Einstellungen</a>
    </mat-nav-list>
  </mat-sidenav>

  <mat-sidenav-content>
    <button mat-icon-button (click)="sidenav.toggle()">
      <mat-icon>menu</mat-icon>
    </button>
    <router-outlet></router-outlet>
  </mat-sidenav-content>
</mat-sidenav-container>
```

### Besonderheiten / Gotchas
- Im `side`-Modus verschiebt der Drawer den Inhalt; im `over`-Modus liegt er darüber.
- `fixedInViewport` benötigt `position: fixed` auf dem Container oder einem Elternelement.
- Methoden: `open()`, `close()`, `toggle()` geben ein `Promise<MatDrawerToggleResult>` zurück.

---

## Toolbar

**Kategorie:** Navigation
**Selector:** `<mat-toolbar>`, `<mat-toolbar-row>`
**Import:** `MatToolbarModule` from `@angular/material/toolbar`; standalone: `MatToolbar`, `MatToolbarRow`
**URL:** https://material.angular.dev/components/toolbar/overview

### Übersicht
`<mat-toolbar>` ist ein horizontaler Behälter für Titel, Buttons und andere Navigationselemente, typischerweise am oberen Rand einer Seite verwendet. Mehrere `<mat-toolbar-row>`-Elemente ermöglichen mehrzeilige Toolbars. Die Toolbar bietet kein eigenes Navigationsverhalten – Links und Buttons werden direkt projiziert.

### Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `color` | `string \| null` | Theme-Farbe (nur M2: `primary`, `accent`, `warn`) |

### Verwendungsbeispiel

```html
<!-- Einzeilige Toolbar -->
<mat-toolbar color="primary">
  <button mat-icon-button (click)="sidenav.toggle()">
    <mat-icon>menu</mat-icon>
  </button>
  <span>Meine Anwendung</span>
  <span class="spacer"></span>
  <button mat-icon-button><mat-icon>account_circle</mat-icon></button>
</mat-toolbar>

<!-- Mehrzeilige Toolbar -->
<mat-toolbar>
  <mat-toolbar-row>
    <span>Zeile 1</span>
  </mat-toolbar-row>
  <mat-toolbar-row>
    <span>Zeile 2</span>
  </mat-toolbar-row>
</mat-toolbar>
```

### CSS Custom Properties / Theming
In M3 keine `color`-Prop-Unterstützung; Theming via Token-System.

### Besonderheiten / Gotchas
- `color`-Input funktioniert nur in M2-Themes.
- Einfacher und mehrzeiliger Modus dürfen nicht gemischt werden – entweder direkte Inhalte oder `<mat-toolbar-row>`-Elemente.
- Für den üblichen "spacer" zwischen linken und rechten Elementen: `.spacer { flex: 1 1 auto; }`.

---

# LAYOUT

---

## Card

**Kategorie:** Layout
**Selector:** `<mat-card>`
**Import:** `MatCardModule` from `@angular/material/card`; standalone: `MatCard`, `MatCardHeader`, `MatCardContent`, `MatCardActions`, `MatCardFooter`, etc.
**URL:** https://material.angular.dev/components/card/overview

### Übersicht
`<mat-card>` ist ein Material Design-Container für zusammengehörige Inhalte und Aktionen zu einem einzelnen Thema. Er bietet strukturierte Unterbereiche: Header, Titel, Untertitel, Bild, Inhalt, Aktionen und Footer. In M3 unterstützt die Karte drei Erscheinungsbilder: `raised`, `outlined` und `filled`.

### Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `appearance` | `'outlined' \| 'raised' \| 'filled'` | Visuelles Erscheinungsbild (M3) |

### Unterdirektiven

| Selektor | Beschreibung |
|---------|-------------|
| `<mat-card-header>` | Kopfbereich (Avatar, Titel, Untertitel) |
| `<mat-card-title>` | Kartentitel |
| `<mat-card-subtitle>` | Kartenuntertitel |
| `<mat-card-content>` | Hauptinhalt |
| `<mat-card-actions>` | Aktionsbereich (Buttons), `align`: `'start'\|'end'` |
| `<mat-card-footer>` | Fußbereich |
| `[mat-card-image]` | Hauptbild |
| `[mat-card-avatar]` | Avatar-Bild im Header |

### Verwendungsbeispiel

```html
<mat-card appearance="outlined">
  <mat-card-header>
    <img mat-card-avatar src="avatar.jpg" alt="Avatar">
    <mat-card-title>Max Mustermann</mat-card-title>
    <mat-card-subtitle>Softwareentwickler</mat-card-subtitle>
  </mat-card-header>
  <img mat-card-image src="photo.jpg" alt="Foto">
  <mat-card-content>
    <p>Beschreibungstext hier...</p>
  </mat-card-content>
  <mat-card-actions align="end">
    <button mat-button>Teilen</button>
    <button mat-button color="primary">Mehr</button>
  </mat-card-actions>
</mat-card>
```

### Besonderheiten / Gotchas
- In M3 hat `appearance="raised"` eine Schatten-Elevation, `outlined` einen Border und `filled` eine Hintergrundfarbe.
- `MAT_CARD_CONFIG` ermöglicht applikationsweite Standard-Appearance.

---

## Divider

**Kategorie:** Layout
**Selector:** `<mat-divider>`
**Import:** `MatDividerModule` from `@angular/material/divider`; standalone: `MatDivider`
**URL:** https://material.angular.dev/components/divider/overview

### Übersicht
`<mat-divider>` ist eine dünne horizontale oder vertikale Trennlinie basierend auf dem `<hr>`-Element-Konzept. Sie kann als Inset-Variante für Listen eingesetzt werden. Die Komponente hat keine Interaktivität – sie dient rein zur visuellen Trennung von Inhaltsbereichen.

### Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `vertical` | `boolean` | Vertikale Ausrichtung (Standard: false) |
| `inset` | `boolean` | Eingerückter Divider für Listen (Standard: false) |

### Verwendungsbeispiel

```html
<!-- Horizontaler Divider -->
<mat-divider></mat-divider>

<!-- Vertikaler Divider -->
<mat-divider vertical></mat-divider>

<!-- Inset in einer Liste -->
<mat-list>
  <mat-list-item>Eintrag 1</mat-list-item>
  <mat-divider inset></mat-divider>
  <mat-list-item>Eintrag 2</mat-list-item>
</mat-list>
```

### Besonderheiten / Gotchas
- `role="separator"` und `aria-orientation` werden automatisch gesetzt.
- Für Listen wird `inset` empfohlen, um den Divider mit dem Text auszurichten.

---

## Expansion Panel / Accordion

**Kategorie:** Layout
**Selector:** `<mat-expansion-panel>`, `<mat-accordion>`, `<mat-expansion-panel-header>`, `<mat-action-row>`
**Import:** `MatExpansionModule` from `@angular/material/expansion`; standalone: `MatExpansionPanel`, `MatExpansionPanelHeader`, `MatAccordion`, `MatExpansionPanelTitle`, `MatExpansionPanelDescription`
**URL:** https://material.angular.dev/components/expansion/overview

### Übersicht
Das Expansion Panel ist ein ausklappbarer Container, der Inhalte bei Bedarf ein- und ausblenden kann. Mehrere Panels können in einem `<mat-accordion>` zusammengefasst werden, das optionale Exklusiv-Auswahl (nur ein Panel offen) und konsistentes Styling bereitstellt. Das `<mat-expansion-panel-header>` enthält Titel und Beschreibung, der Body den eigentlichen Inhalt.

### Wichtige Inputs – `<mat-expansion-panel>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `expanded` | `boolean` | Aufgeklappt-Zustand |
| `disabled` | `boolean` | Panel deaktivieren |
| `hideToggle` | `boolean` | Expand-Indikator ausblenden |
| `togglePosition` | `MatAccordionTogglePosition` | Position des Toggle-Indikators |

### Wichtige Inputs – `<mat-accordion>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `multi` | `boolean` | Mehrere Panels gleichzeitig öffnen (Standard: false) |
| `hideToggle` | `boolean` | Toggle für alle Panels ausblenden |
| `displayMode` | `'default' \| 'flat'` | Anzeigemodus |
| `togglePosition` | `'before' \| 'after'` | Toggle-Position |

### Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `opened` | `EventEmitter<void>` | Panel geöffnet |
| `closed` | `EventEmitter<void>` | Panel geschlossen |
| `afterExpand` | `EventEmitter<void>` | Animation abgeschlossen (offen) |
| `afterCollapse` | `EventEmitter<void>` | Animation abgeschlossen (geschlossen) |
| `expandedChange` | `EventEmitter<boolean>` | Zustandsänderung |

### Verwendungsbeispiel

```html
<mat-accordion multi>
  <mat-expansion-panel>
    <mat-expansion-panel-header>
      <mat-panel-title>Persönliche Daten</mat-panel-title>
      <mat-panel-description>Name und Adresse</mat-panel-description>
    </mat-expansion-panel-header>
    <p>Inhalt hier...</p>
    <mat-action-row>
      <button mat-button color="primary">Speichern</button>
    </mat-action-row>
  </mat-expansion-panel>
</mat-accordion>
```

### Besonderheiten / Gotchas
- `MAT_EXPANSION_PANEL_DEFAULT_OPTIONS` ermöglicht globale Standardkonfiguration.
- Lazy-Loading des Panel-Inhalts ist mit `<ng-template matExpansionPanelContent>` möglich.

---

## Grid List

**Kategorie:** Layout
**Selector:** `<mat-grid-list>`, `<mat-grid-tile>`
**Import:** `MatGridListModule` from `@angular/material/grid-list`; standalone: `MatGridList`, `MatGridTile`, `MatGridTileText`
**URL:** https://material.angular.dev/components/grid-list/overview

### Übersicht
`<mat-grid-list>` ist ein zweidimensionales Listenlayout, das Kacheln (`mat-grid-tile`) in einem Raster anordnet. Jede Kachel kann mehrere Zeilen und Spalten überspannen. Das Layout ist responsiv über `cols`- und `rowHeight`-Konfiguration steuerbar. Kacheln können optional Header und Footer enthalten.

### Wichtige Inputs – `<mat-grid-list>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `cols` | `number` | Anzahl der Spalten (Pflicht) |
| `rowHeight` | `string \| number` | Zeilenhöhe: Pixel (`'100px'`), Verhältnis (`'4:3'`) oder `'fit'` |
| `gutterSize` | `string` | Abstand zwischen Kacheln (Standard: `'1px'`) |

### Wichtige Inputs – `<mat-grid-tile>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `colspan` | `number` | Anzahl belegter Spalten |
| `rowspan` | `number` | Anzahl belegter Zeilen |

### Verwendungsbeispiel

```html
<mat-grid-list cols="3" rowHeight="200px" gutterSize="8px">
  <mat-grid-tile [colspan]="2" [rowspan]="1">
    <mat-grid-tile-header>Titel</mat-grid-tile-header>
    Inhalt Kachel 1
  </mat-grid-tile>
  <mat-grid-tile>Kachel 2</mat-grid-tile>
  <mat-grid-tile>Kachel 3</mat-grid-tile>
</mat-grid-list>
```

### Besonderheiten / Gotchas
- `rowHeight="fit"` verteilt alle Kacheln gleichmäßig auf die verfügbare Höhe des Containers.
- `<mat-grid-tile-header>` und `<mat-grid-tile-footer>` können optional Avatare enthalten.

---

## List

**Kategorie:** Layout
**Selector:** `<mat-list>`, `<mat-nav-list>`, `<mat-selection-list>`, `mat-list-item`, `<mat-list-option>`
**Import:** `MatListModule` from `@angular/material/list`; standalone: `MatList`, `MatNavList`, `MatSelectionList`, `MatListItem`, `MatListOption`, `MatListSubheaderCssMatStyler`
**URL:** https://material.angular.dev/components/list/overview

### Übersicht
Angular Material stellt drei Listentypen bereit: `<mat-list>` für einfache Inhaltslisten, `<mat-nav-list>` für Navigationslisten mit klickbaren Elementen und `<mat-selection-list>` für Listen mit Checkboxen und Mehrfachauswahl. Listeneinträge können ein-, zwei- oder dreizeilig sein (durch Direktiven `matListItemTitle`, `matListItemLine`, `matListItemMeta`).

### Wichtige Inputs – `<mat-selection-list>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `multiple` | `boolean` | Mehrfachauswahl erlauben (Standard: true) |
| `disabled` | `boolean` | Gesamte Liste deaktivieren |
| `hideSingleSelectionIndicator` | `boolean` | Radio-Indikator bei Einzelauswahl ausblenden |
| `compareWith` | `(o1: any, o2: any) => boolean` | Vergleichsfunktion |

### Wichtige Outputs – `<mat-selection-list>`

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `selectionChange` | `EventEmitter<MatSelectionListChange>` | Auswahlzustand geändert |

### Wichtige Inputs – `mat-list-item`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `activated` | `boolean` | Aktiver Zustand in Nav-Lists |

### Verwendungsbeispiel

```html
<!-- Einfache Liste -->
<mat-list>
  <mat-list-item>
    <mat-icon matListItemIcon>folder</mat-icon>
    <span matListItemTitle>Dokumente</span>
    <span matListItemLine>Zuletzt geändert vor 2 Stunden</span>
  </mat-list-item>
</mat-list>

<!-- Auswahl-Liste -->
<mat-selection-list [(ngModel)]="selectedItems">
  <mat-list-option value="item1">Option 1</mat-list-option>
  <mat-list-option value="item2">Option 2</mat-list-option>
</mat-selection-list>

<!-- Navigations-Liste -->
<mat-nav-list>
  <a mat-list-item routerLink="/home" [activated]="isActive('/home')">
    <mat-icon matListItemIcon>home</mat-icon>
    <span matListItemTitle>Startseite</span>
  </a>
</mat-nav-list>
```

### Besonderheiten / Gotchas
- `selectAll()` und `deselectAll()` sind Methoden von `MatSelectionList`.
- `matListItemTitle`, `matListItemLine`, `matListItemMeta`, `matListItemIcon` sind Direktiven auf Kindelementen.

---

## Stepper

**Kategorie:** Layout
**Selector:** `<mat-stepper>`, `<mat-horizontal-stepper>`, `<mat-vertical-stepper>`, `<mat-step>`
**Import:** `MatStepperModule` from `@angular/material/stepper`; standalone: `MatStepper`, `MatStep`, `MatStepLabel`, `MatStepperIcon`, `MatStepContent`
**URL:** https://material.angular.dev/components/stepper/overview

### Übersicht
Der Stepper führt Benutzer durch einen mehrstufigen Prozess (z. B. Formulare, Wizards). Er ist in horizontaler und vertikaler Variante verfügbar. Jeder `<mat-step>` kann ein Formular enthalten; die Navigation zwischen Schritten kann über Validierung gesteuert werden. Schritte können als optional markiert werden.

### Wichtige Inputs – `<mat-stepper>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `selectedIndex` | `number` | Index des aktiven Schritts |
| `linear` | `boolean` | Vorwärtsnavigation nur wenn aktueller Schritt valid |
| `orientation` | `'horizontal' \| 'vertical'` | Ausrichtung |
| `labelPosition` | `'bottom' \| 'end'` | Label-Position (horizontal) |
| `headerPosition` | `'top' \| 'bottom'` | Header-Position (horizontal) |
| `disableRipple` | `boolean` | Ripple deaktivieren |
| `animationDuration` | `string` | Animations-Dauer |

### Wichtige Inputs – `<mat-step>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `label` | `string` | Text-Label des Schritts |
| `completed` | `boolean` | Schritt als abgeschlossen markieren |
| `editable` | `boolean` | Erlaubt Rückkehr zu diesem Schritt |
| `optional` | `boolean` | Schritt ist optional |
| `errorMessage` | `string` | Fehlermeldung bei ungültigem Schritt |
| `stepControl` | `AbstractControl` | Formular-Steuerelement für Validierung |

### Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `selectionChange` | `EventEmitter<StepperSelectionEvent>` | Schritt gewechselt |
| `animationDone` | `EventEmitter<void>` | Animation abgeschlossen |

### Verwendungsbeispiel

```html
<mat-stepper [linear]="true" #stepper>
  <mat-step [stepControl]="firstFormGroup" label="Persönliche Daten">
    <form [formGroup]="firstFormGroup">
      <mat-form-field>
        <mat-label>Name</mat-label>
        <input matInput formControlName="name" required>
      </mat-form-field>
      <div>
        <button mat-button matStepperNext>Weiter</button>
      </div>
    </form>
  </mat-step>

  <mat-step label="Bestätigung">
    <p>Alle Angaben korrekt?</p>
    <button mat-button matStepperPrevious>Zurück</button>
    <button mat-raised-button color="primary" (click)="submit()">Absenden</button>
  </mat-step>
</mat-stepper>
```

### Besonderheiten / Gotchas
- `matStepperNext` und `matStepperPrevious` sind Direktiven für Buttons.
- `<ng-template matStepLabel>` ermöglicht Template-basierte Labels mit Icons.
- `<ng-template matStepContent>` lazy-lädt den Schrittinhalt.

---

## Tabs

**Kategorie:** Layout
**Selector:** `<mat-tab-group>`, `<mat-tab>`, `<mat-tab-nav-bar>`, `<mat-tab-link>`
**Import:** `MatTabsModule` from `@angular/material/tabs`; standalone: `MatTabGroup`, `MatTab`, `MatTabLabel`, `MatTabContent`, `MatTabNav`, `MatTabNavPanel`, `MatTabLink`
**URL:** https://material.angular.dev/components/tabs/overview

### Übersicht
Tabs organisieren Inhalte in mehrere Bereiche, von denen jeweils einer sichtbar ist. `<mat-tab-group>` ist die Standard-Implementierung mit Panel-Inhalt. `<mat-tab-nav-bar>` bietet eine tab-artige Navigation mit Links (ohne Panel-Verwaltung, geeignet für Router-Integration). Animationen, Lazy-Loading und Scrolling bei vielen Tabs werden unterstützt.

### Wichtige Inputs – `<mat-tab-group>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `selectedIndex` | `number \| null` | Aktiver Tab-Index |
| `headerPosition` | `'above' \| 'below'` | Header oben oder unten |
| `animationDuration` | `string \| number` | Animations-Dauer |
| `dynamicHeight` | `boolean` | Höhe an aktiven Tab anpassen |
| `stretchTabs` | `boolean` | Tabs auf volle Breite strecken |
| `alignTabs` | `string \| null` | Tab-Ausrichtung |
| `disablePagination` | `boolean` | Paginierung bei vielen Tabs deaktivieren |
| `disableRipple` | `boolean` | Ripple deaktivieren |
| `preserveContent` | `boolean` | Inhalte nicht aus DOM entfernen |

### Wichtige Inputs – `<mat-tab>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `label` | `string` | Text-Label |
| `disabled` | `boolean` | Tab deaktivieren |
| `aria-label` | `string` | ARIA-Label |
| `labelClass` | `string \| string[]` | CSS-Klassen für Label |
| `bodyClass` | `string \| string[]` | CSS-Klassen für Body |

### Wichtige Outputs – `<mat-tab-group>`

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `selectedTabChange` | `EventEmitter<MatTabChangeEvent>` | Tab gewechselt |
| `selectedIndexChange` | `EventEmitter<number>` | Two-Way-Binding für selectedIndex |
| `focusChange` | `EventEmitter<MatTabChangeEvent>` | Fokus gewechselt |
| `animationDone` | `EventEmitter<void>` | Animation abgeschlossen |

### Verwendungsbeispiel

```html
<mat-tab-group [(selectedIndex)]="activeTab">
  <mat-tab label="Übersicht">
    <p>Übersichtsinhalt...</p>
  </mat-tab>
  <mat-tab>
    <ng-template mat-tab-label>
      <mat-icon>settings</mat-icon> Einstellungen
    </ng-template>
    <ng-template matTabContent>
      <!-- Lazy-geladen -->
      <app-settings></app-settings>
    </ng-template>
  </mat-tab>
</mat-tab-group>
```

### Besonderheiten / Gotchas
- `<ng-template matTabContent>` aktiviert Lazy-Loading – Inhalt wird erst beim ersten Aktivieren gerendert.
- `<ng-template mat-tab-label>` ermöglicht Rich-Content-Labels (Icons, Badges).
- `preserveContent: true` behält alle Tab-Inhalte im DOM – gut für Formulare, die ihren Zustand behalten sollen.

---

## Tree

**Kategorie:** Layout
**Selector:** `<mat-tree>`, `mat-tree-node`, `mat-nested-tree-node`
**Import:** `MatTreeModule` from `@angular/material/tree`; standalone: `MatTree`, `MatTreeNode`, `MatNestedTreeNode`, `MatTreeNodeDef`, `MatTreeNodePadding`, `MatTreeNodeToggle`
**URL:** https://material.angular.dev/components/tree/overview

### Übersicht
`<mat-tree>` ist ein hierarchischer Daten-Viewer basierend auf dem CDK-Tree. Er unterstützt zwei Rendering-Modi: flacher Tree (mit `FlatTreeControl`) für Virtualisierung bei großen Datenmengen, und verschachtelter Tree (mit `NestedTreeControl`) für natürliche HTML-Hierarchien. Knoten werden über `MatTreeNodeDef`-Direktiven definiert.

### Wichtige Direktiven

| Direktive | Selektor | Beschreibung |
|-----------|---------|-------------|
| `MatTreeNodeDef` | `[matTreeNodeDef]` | Definiert Template für Tree-Knoten |
| `MatTreeNodePadding` | `[matTreeNodePadding]` | Einrückung für flache Trees |
| `MatTreeNodeToggle` | `[matTreeNodeToggle]` | Toggle für Knoten-Expansion |
| `MatTreeNodeOutlet` | `[matTreeNodeOutlet]` | Outlet für Knotenrendering |

### Wichtige Inputs – `mat-tree-node`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `disabled` | `boolean` | Knoten deaktivieren (deprecated) |

### Verwendungsbeispiel

```html
<!-- Flacher Tree -->
<mat-tree [dataSource]="dataSource" [treeControl]="treeControl">
  <mat-tree-node *matTreeNodeDef="let node" matTreeNodePadding>
    <button mat-icon-button disabled></button>
    {{ node.name }}
  </mat-tree-node>

  <mat-tree-node *matTreeNodeDef="let node; when: hasChild" matTreeNodePadding>
    <button mat-icon-button [attr.aria-label]="'Toggle ' + node.name"
            matTreeNodeToggle>
      <mat-icon>
        {{ treeControl.isExpanded(node) ? 'expand_more' : 'chevron_right' }}
      </mat-icon>
    </button>
    {{ node.name }}
  </mat-tree-node>
</mat-tree>
```

```typescript
hasChild = (_: number, node: FlatNode) => node.expandable;
```

### Besonderheiten / Gotchas
- `FlatTreeControl` ist für große Datensätze mit Virtual Scrolling empfohlen.
- `NestedTreeControl` bietet einfacheres API, ist aber weniger performant bei vielen Knoten.
- Eigene Indentation via `[matTreeNodePaddingIndent]` (in px).

---

# BUTTONS & INDICATORS

---

## Button

**Kategorie:** Buttons & Indicators
**Selector:** `button[matButton]`, `a[matButton]`, `button[mat-button]`, `button[mat-raised-button]`, `button[mat-flat-button]`, `button[mat-stroked-button]`
**Import:** `MatButtonModule` from `@angular/material/button`; standalone: `MatButton`, `MatAnchor`, `MatIconButton`, `MatFab`, `MatMiniFab`
**URL:** https://material.angular.dev/components/button/overview

### Übersicht
Angular Material Buttons sind Direktiven, die auf native `<button>` und `<a>` Elemente angewendet werden. In M3 gibt es fünf Erscheinungsbilder: `text` (Standard, vorher `mat-button`), `filled` (vorher `mat-raised-button`), `elevated` (neu), `outlined` (vorher `mat-stroked-button`), `tonal` (neu in M3). Icon-Buttons (`mat-icon-button`) und FABs (`mat-fab`, `mat-mini-fab`) sind separate Direktiven.

### Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `matButton` | `MatButtonAppearance \| ''` | Erscheinungsbild: `'text' \| 'filled' \| 'elevated' \| 'outlined' \| 'tonal'` |
| `disabled` | `boolean` | Button deaktivieren |
| `disableRipple` | `boolean` | Ripple deaktivieren |
| `color` | `string` | Theme-Farbe (nur M2) |

### Verwendungsbeispiel

```html
<!-- M3-Stil -->
<button matButton>Text Button</button>
<button matButton="filled">Filled Button</button>
<button matButton="outlined">Outlined Button</button>
<button matButton="elevated">Elevated Button</button>
<button matButton="tonal">Tonal Button</button>

<!-- Legacy M2-Attribute (weiterhin unterstützt) -->
<button mat-button>Text</button>
<button mat-raised-button color="primary">Raised</button>
<button mat-flat-button color="accent">Flat</button>
<button mat-stroked-button>Stroked</button>

<!-- Icon Button -->
<button mat-icon-button aria-label="Einstellungen">
  <mat-icon>settings</mat-icon>
</button>

<!-- FAB -->
<button mat-fab color="primary">
  <mat-icon>add</mat-icon>
</button>
<button mat-mini-fab>
  <mat-icon>edit</mat-icon>
</button>

<!-- Link-Button -->
<a mat-button routerLink="/home">Zurück zur Startseite</a>
```

### CSS Custom Properties / Theming
In M3 über `matButton`-Input das Erscheinungsbild wählen. `color` wirkt nur in M2-Themes.

### Besonderheiten / Gotchas
- Für reine Icon-Buttons immer `aria-label` setzen, da kein sichtbarer Text vorhanden.
- `<a matButton>` rendert semantisch als Link, verhält sich aber visuell wie ein Button.
- `setAppearance()` ermöglicht programmatisches Ändern des Erscheinungsbilds.

---

## Button Toggle

**Kategorie:** Buttons & Indicators
**Selector:** `<mat-button-toggle-group>`, `<mat-button-toggle>`
**Import:** `MatButtonToggleModule` from `@angular/material/button-toggle`; standalone: `MatButtonToggleGroup`, `MatButtonToggle`
**URL:** https://material.angular.dev/components/button-toggle/overview

### Übersicht
Button Toggles sind An/Aus-Buttons, die einzeln oder in einer Gruppe (exclusiv oder mehrfach) eingesetzt werden können. Eine `<mat-button-toggle-group>` verhält sich wie eine Radio-Button-Gruppe (Standardmodus) oder Checkbox-Gruppe (`multiple="true"`). Jeder `<mat-button-toggle>` hat einen `value`, der an das übergeordnete Formularfeld weitergegeben wird.

### Wichtige Inputs – `<mat-button-toggle-group>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `value` | `any` | Aktuell ausgewählter Wert |
| `multiple` | `boolean` | Mehrfachauswahl erlauben |
| `disabled` | `boolean` | Gesamte Gruppe deaktivieren |
| `vertical` | `boolean` | Vertikale Anordnung |
| `appearance` | `'legacy' \| 'standard'` | Erscheinungsbild |
| `hideSingleSelectionIndicator` | `boolean` | Haken bei Einzelauswahl ausblenden |
| `hideMultipleSelectionIndicator` | `boolean` | Haken bei Mehrfachauswahl ausblenden |

### Wichtige Inputs – `<mat-button-toggle>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `value` | `any` | Wert dieses Toggles |
| `checked` | `boolean` | Auswahlzustand |
| `disabled` | `boolean` | Toggle deaktivieren |
| `disableRipple` | `boolean` | Ripple deaktivieren |

### Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `change` | `EventEmitter<MatButtonToggleChange>` | Auswahl geändert (Gruppe und einzeln) |
| `valueChange` | `EventEmitter<any>` | Wert geändert (nur Gruppe) |

### Verwendungsbeispiel

```html
<mat-button-toggle-group [(ngModel)]="alignment" aria-label="Textausrichtung">
  <mat-button-toggle value="left" aria-label="Links">
    <mat-icon>format_align_left</mat-icon>
  </mat-button-toggle>
  <mat-button-toggle value="center" aria-label="Zentriert">
    <mat-icon>format_align_center</mat-icon>
  </mat-button-toggle>
  <mat-button-toggle value="right" aria-label="Rechts">
    <mat-icon>format_align_right</mat-icon>
  </mat-button-toggle>
</mat-button-toggle-group>
```

### Besonderheiten / Gotchas
- Standalone Toggles (ohne Gruppe) haben binären An/Aus-Zustand.
- `MAT_BUTTON_TOGGLE_DEFAULT_OPTIONS` für applikationsweite Defaults.

---

## Badge

**Kategorie:** Buttons & Indicators
**Selector:** `[matBadge]`
**Import:** `MatBadgeModule` from `@angular/material/badge`; standalone: `MatBadge`
**URL:** https://material.angular.dev/components/badge/overview

### Übersicht
`matBadge` ist eine Direktive, die einem beliebigen Element einen kleinen informativen Badge hinzufügt (z. B. Anzahl ungelesener Nachrichten). Der Badge erscheint als kleiner Kreis mit Text an einer der acht konfigurierbaren Positionen relativ zum Host-Element. Er eignet sich für Icons, Buttons und Listeneinträge.

### Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `matBadge` | `string \| number \| undefined \| null` | Badge-Inhalt |
| `matBadgePosition` | `MatBadgePosition` | Position: `'above after' \| 'above before' \| 'below before' \| 'below after' \| 'before' \| 'after' \| 'above' \| 'below'` |
| `matBadgeSize` | `'small' \| 'medium' \| 'large'` | Badge-Größe |
| `matBadgeColor` | `ThemePalette` | Farbe (nur M2) |
| `matBadgeOverlap` | `boolean` | Badge überlappt Host-Element |
| `matBadgeHidden` | `boolean` | Badge ausblenden |
| `matBadgeDisabled` | `boolean` | Badge deaktivieren |
| `matBadgeDescription` | `string` | ARIA-Beschreibung via aria-describedby |

### Verwendungsbeispiel

```html
<button mat-icon-button [matBadge]="unreadCount"
        matBadgePosition="above after"
        matBadgeColor="warn"
        [matBadgeHidden]="unreadCount === 0"
        aria-label="Benachrichtigungen">
  <mat-icon>notifications</mat-icon>
</button>
```

### Besonderheiten / Gotchas
- `matBadgeDescription` wird über `aria-describedby` dem Host-Element beigefügt – wichtig für Screen Reader.
- Bei `null`/`undefined` als Badge-Inhalt wird der Badge automatisch ausgeblendet.
- `MAT_BADGE_CONFIG` für applikationsweite Defaults.

---

## Chips

**Kategorie:** Buttons & Indicators
**Selector:** `<mat-chip>`, `<mat-chip-row>`, `<mat-chip-option>`, `<mat-chip-listbox>`, `<mat-chip-grid>`, `input[matChipInputFor]`
**Import:** `MatChipsModule` from `@angular/material/chips`; standalone: `MatChip`, `MatChipRow`, `MatChipOption`, `MatChipListbox`, `MatChipGrid`, `MatChipInput`, `MatChipRemove`, `MatChipAvatar`, `MatChipTrailingIcon`
**URL:** https://material.angular.dev/components/chips/overview

### Übersicht
Chips sind kompakte Elemente für Tags, Filter oder Eingaben. Angular Material bietet drei Chips-Varianten: `<mat-chip>` (nur Anzeige), `<mat-chip-option>` in `<mat-chip-listbox>` (Auswahl), und `<mat-chip-row>` in `<mat-chip-grid>` (Eingabe mit `matChipInputFor`). Chips unterstützen Entfernen (via `matChipRemove`-Direktive), Avatare und Trailing Icons.

### Wichtige Inputs – `<mat-chip>` / `<mat-chip-row>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `value` | `any` | Chip-Wert |
| `disabled` | `boolean` | Chip deaktivieren |
| `removable` | `boolean` | Entfernen-Button anzeigen |
| `highlighted` | `boolean` | Chip hervorheben |
| `disableRipple` | `boolean` | Ripple deaktivieren |
| `color` | `string \| null` | Theme-Farbe (nur M2) |
| `editable` | `boolean` | Bearbeitbar (nur `mat-chip-row`) |

### Wichtige Inputs – `<mat-chip-listbox>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `multiple` | `boolean` | Mehrfachauswahl |
| `selectable` | `boolean` | Chips auswählbar |
| `required` | `boolean` | Pflichtauswahl |
| `value` | `any` | Ausgewählter Wert |
| `hideSingleSelectionIndicator` | `boolean` | Haken ausblenden |

### Wichtige Inputs – `input[matChipInputFor]`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `matChipInputFor` | `MatChipGrid` | Verknüpftes Chip-Grid |
| `separatorKeyCodes` | `number[]` | Tastencodes für Chip-Erstellung (Standard: ENTER) |
| `addOnBlur` | `boolean` | Chip bei Blur hinzufügen |

### Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `removed` | `EventEmitter<MatChipEvent>` | Chip entfernt |
| `edited` | `EventEmitter<MatChipEditedEvent>` | Chip bearbeitet (nur row) |
| `change` | `EventEmitter<MatChipListboxChange>` | Auswahl geändert (Listbox) |
| `chipEnd` | `EventEmitter<MatChipInputEvent>` | Chip-Eingabe abgeschlossen (Input) |

### Verwendungsbeispiel

```html
<!-- Chip-Eingabefeld -->
<mat-form-field>
  <mat-label>Tags</mat-label>
  <mat-chip-grid #chipGrid>
    <mat-chip-row *ngFor="let tag of tags" (removed)="removeTag(tag)">
      {{ tag }}
      <button matChipRemove aria-label="Tag entfernen">
        <mat-icon>cancel</mat-icon>
      </button>
    </mat-chip-row>
  </mat-chip-grid>
  <input placeholder="Neuer Tag..."
         [matChipInputFor]="chipGrid"
         [matChipInputSeparatorKeyCodes]="separatorKeys"
         (matChipInputTokenEnd)="addTag($event)">
</mat-form-field>

<!-- Auswahl-Chips -->
<mat-chip-listbox [(ngModel)]="selectedFruits" multiple>
  <mat-chip-option value="apple">Apfel</mat-chip-option>
  <mat-chip-option value="banana">Banane</mat-chip-option>
</mat-chip-listbox>
```

### Besonderheiten / Gotchas
- `matChipRemove` und `matChipTrailingIcon` sind Direktiven auf Kindelementen.
- Für barrierefreie Entfernen-Buttons immer `aria-label` verwenden.
- `mat-chip-row` ist für Chips in Formularen gedacht (editierbar, löschbar).

---

## Icon

**Kategorie:** Buttons & Indicators
**Selector:** `<mat-icon>`
**Import:** `MatIconModule` from `@angular/material/icon`; standalone: `MatIcon`
**URL:** https://material.angular.dev/components/icon/overview

### Übersicht
`<mat-icon>` rendert Icons aus verschiedenen Quellen: Material Icons Font (Standard), benutzerdefinierten Icon-Fonts und SVG-Icon-Sets. SVG-Icons werden über `MatIconRegistry` registriert. Die Komponente setzt automatisch `role="img"` und unterstützt `aria-hidden` für dekorative Icons.

### Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `svgIcon` | `string` | SVG-Icon aus Registry (`[namespace:]name`) |
| `fontSet` | `string` | Icon-Font-Set |
| `fontIcon` | `string` | Icon-Name im Font-Set |
| `inline` | `boolean` | Passt Größe an Schriftgröße an |
| `color` | `string \| null \| undefined` | Theme-Farbe (nur M2) |

### Verwendungsbeispiel

```html
<!-- Material Icons Font (Standard) -->
<mat-icon>home</mat-icon>
<mat-icon>star</mat-icon>

<!-- SVG-Icon aus Registry -->
<mat-icon svgIcon="my-logo"></mat-icon>

<!-- Inline (passt sich Textgröße an) -->
<p>Text mit <mat-icon inline>check</mat-icon> Icon</p>

<!-- Dekorativ (für Screen Reader versteckt) -->
<mat-icon aria-hidden="true">favorite</mat-icon>
```

```typescript
// SVG-Icons registrieren
constructor(private iconRegistry: MatIconRegistry, private sanitizer: DomSanitizer) {
  iconRegistry.addSvgIcon('my-logo',
    sanitizer.bypassSecurityTrustResourceUrl('assets/icons/logo.svg'));
}
```

### CSS Custom Properties / Theming
Größe über `font-size` oder `--mat-icon-size`-Token. `color` nur in M2.

### Besonderheiten / Gotchas
- Die Material Icons Font muss separat eingebunden werden (z. B. über Google Fonts oder npm-Paket).
- Für dekorative Icons `aria-hidden="true"` setzen; für funktionale Icons `aria-label` am Elternelement.
- `MatIconRegistry` muss in der App registriert werden (Root-Injector).

---

## Progress Bar

**Kategorie:** Buttons & Indicators
**Selector:** `<mat-progress-bar>`
**Import:** `MatProgressBarModule` from `@angular/material/progress-bar`; standalone: `MatProgressBar`
**URL:** https://material.angular.dev/components/progress-bar/overview

### Übersicht
`<mat-progress-bar>` visualisiert Fortschritt oder Ladezustände. Vier Modi stehen zur Verfügung: `determinate` (bekannter Fortschritt), `indeterminate` (unbekannte Dauer), `buffer` (Buffer-Fortschritt für Streaming), `query` (reverse-indeterminate für Abfrageinitiierung). Die Komponente ist vollständig barrierefrei mit ARIA-Attributen.

### Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `mode` | `'determinate' \| 'indeterminate' \| 'buffer' \| 'query'` | Anzeigemodus |
| `value` | `number` | Fortschrittswert (0–100) |
| `bufferValue` | `number` | Buffer-Wert (0–100), nur im `buffer`-Modus |
| `color` | `string \| null \| undefined` | Theme-Farbe (nur M2) |

### Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `animationEnd` | `EventEmitter<ProgressAnimationEnd>` | Animation abgeschlossen (nur determinate) |

### Verwendungsbeispiel

```html
<!-- Determinate -->
<mat-progress-bar mode="determinate" [value]="uploadProgress"></mat-progress-bar>

<!-- Indeterminate (Ladeindikator) -->
<mat-progress-bar mode="indeterminate"></mat-progress-bar>

<!-- Buffer (Video-Streaming) -->
<mat-progress-bar mode="buffer"
                  [value]="playedPercent"
                  [bufferValue]="bufferedPercent">
</mat-progress-bar>
```

### Besonderheiten / Gotchas
- Im `indeterminate` und `query`-Modus wird `value` ignoriert.
- `MAT_PROGRESS_BAR_DEFAULT_OPTIONS` für applikationsweite Defaults.

---

## Progress Spinner

**Kategorie:** Buttons & Indicators
**Selector:** `<mat-progress-spinner>`, `<mat-spinner>`
**Import:** `MatProgressSpinnerModule` from `@angular/material/progress-spinner`; standalone: `MatProgressSpinner`
**URL:** https://material.angular.dev/components/progress-spinner/overview

### Übersicht
`<mat-progress-spinner>` ist ein kreisförmiger Fortschrittsindikator. `<mat-spinner>` ist ein Alias für `<mat-progress-spinner mode="indeterminate">`. Der Spinner unterstützt determinate (Fortschrittsanzeige in Prozent) und indeterminate (Ladeanimation) Modi. Durchmesser und Strichbreite sind konfigurierbar.

### Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `mode` | `'determinate' \| 'indeterminate'` | Anzeigemodus |
| `value` | `number` | Fortschrittswert 0–100 (nur determinate) |
| `diameter` | `number` | Durchmesser in Pixel (Standard: 40) |
| `strokeWidth` | `number` | Strichbreite in Pixel |
| `color` | `string \| null \| undefined` | Theme-Farbe (nur M2) |

### Verwendungsbeispiel

```html
<!-- Ladeindikator -->
<mat-spinner></mat-spinner>

<!-- Mit Fortschritt -->
<mat-progress-spinner mode="determinate" [value]="progress"
                      [diameter]="60">
</mat-progress-spinner>

<!-- Benutzerdefinierte Größe -->
<mat-spinner [diameter]="80" [strokeWidth]="8"></mat-spinner>
```

### Besonderheiten / Gotchas
- `MAT_PROGRESS_SPINNER_DEFAULT_OPTIONS` ermöglicht globale Standardwerte.
- `_forceAnimations` in den Default-Options erzwingt CSS-Animationen (für Tests).

---

## Ripple

**Kategorie:** Buttons & Indicators
**Selector:** `[mat-ripple]`, `[matRipple]`
**Import:** `MatRippleModule` from `@angular/material/core`; standalone: `MatRipple`
**URL:** https://material.angular.dev/components/ripple/overview

### Übersicht
Die Ripple-Direktive fügt einem beliebigen Element den Material Design-Welleffekt bei Klick oder Touch hinzu. Sie wird intern von vielen Angular Material-Komponenten verwendet, kann aber auch direkt auf eigene Elemente angewendet werden. Manuelle Auslösung über die `launch()`-Methode ist möglich.

### Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `matRippleDisabled` | `boolean` | Ripple deaktivieren |
| `matRippleColor` | `string` | Farbe des Ripple-Effekts |
| `matRippleCentered` | `boolean` | Ripple immer vom Mittelpunkt |
| `matRippleUnbounded` | `boolean` | Ripple außerhalb des Elements sichtbar |
| `matRippleRadius` | `number` | Radius in Pixel |
| `matRippleAnimation` | `RippleAnimationConfig` | Ein/Ausblend-Animation anpassen |
| `matRippleTrigger` | `HTMLElement` | Alternatives Trigger-Element |

### Verwendungsbeispiel

```html
<div matRipple class="my-button" (click)="doSomething()">
  Klick mich
</div>

<!-- Manuell auslösen -->
<div matRipple #ripple="matRipple">
  <button (click)="ripple.launch({centered: true})">Ripple auslösen</button>
</div>
```

### Besonderheiten / Gotchas
- Das Host-Element muss `position: relative` haben, damit Ripples korrekt positioniert werden.
- `MAT_RIPPLE_GLOBAL_OPTIONS` ermöglicht globale Deaktivierung (z. B. für Performance).
- `fadeOutAll()` und `fadeOutAllNonPersistent()` ermöglichen programmatisches Ausblenden.

---

# POPUPS & MODALS

---

## Bottom Sheet

**Kategorie:** Popups & Modals
**Selector:** Kein Template-Selektor; wird via Service geöffnet
**Import:** `MatBottomSheetModule` from `@angular/material/bottom-sheet`; standalone: `MatBottomSheet` (Service)
**URL:** https://material.angular.dev/components/bottom-sheet/overview

### Übersicht
Das Bottom Sheet ist ein Panel, das von unten in den Bildschirm gleitet und für mobile-freundliche Aktionslisten verwendet wird. Es wird nicht als Komponente in Templates platziert, sondern über den `MatBottomSheet`-Service geöffnet. Beliebige Komponenten oder Templates können als Inhalt übergeben werden. Die Datenübergabe erfolgt über `MAT_BOTTOM_SHEET_DATA`.

### Öffnen via Service

```typescript
constructor(private bottomSheet: MatBottomSheet) {}

open(): void {
  const ref = this.bottomSheet.open(MyBottomSheetComponent, {
    data: { items: this.items }
  });
  ref.afterDismissed().subscribe(result => console.log(result));
}
```

### Konfigurationsoptionen (`MatBottomSheetConfig`)

| Option | Typ | Beschreibung |
|--------|-----|-------------|
| `data` | `any` | Daten für die Komponente (via `MAT_BOTTOM_SHEET_DATA`) |
| `hasBackdrop` | `boolean` | Backdrop anzeigen (Standard: true) |
| `disableClose` | `boolean` | Schließen durch Benutzer verhindern |
| `panelClass` | `string \| string[]` | CSS-Klassen |
| `backdropClass` | `string` | CSS-Klasse für Backdrop |
| `direction` | `Direction` | Text-Richtung |
| `closeOnNavigation` | `boolean` | Bei Navigation schließen (Standard: true) |
| `autoFocus` | `AutoFocusTarget \| string \| boolean` | Fokus beim Öffnen |
| `restoreFocus` | `boolean` | Fokus nach Schließen wiederherstellen |
| `height` | `string` | Panel-Höhe |

### `MatBottomSheetRef`-Methoden

| Methode | Beschreibung |
|---------|-------------|
| `dismiss(result?)` | Bottom Sheet schließen |
| `afterDismissed()` | Observable: nach dem Schließen |
| `afterOpened()` | Observable: nach dem Öffnen |
| `backdropClick()` | Observable: Backdrop-Klick |
| `keydownEvents()` | Observable: Tastatureingaben |

### Verwendungsbeispiel

```typescript
// bottom-sheet-content.component.ts
@Component({
  template: `
    <mat-nav-list>
      <mat-list-item *ngFor="let item of data.items" (click)="select(item)">
        {{ item.label }}
      </mat-list-item>
    </mat-nav-list>
  `
})
export class BottomSheetContent {
  constructor(
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: any,
    private ref: MatBottomSheetRef
  ) {}
  select(item: any) { this.ref.dismiss(item); }
}
```

### Besonderheiten / Gotchas
- `MAT_BOTTOM_SHEET_DATA` muss injiziert werden, um Daten in der Inhaltkomponente zu empfangen.
- `MAT_BOTTOM_SHEET_DEFAULT_OPTIONS` für applikationsweite Defaults.

---

## Dialog

**Kategorie:** Popups & Modals
**Selector:** Kein Template-Selektor; wird via Service geöffnet. Content-Direktiven: `[mat-dialog-title]`, `[mat-dialog-content]`, `[mat-dialog-actions]`, `[mat-dialog-close]`
**Import:** `MatDialogModule` from `@angular/material/dialog`; standalone: `MatDialog` (Service), `MatDialogTitle`, `MatDialogContent`, `MatDialogActions`, `MatDialogClose`
**URL:** https://material.angular.dev/components/dialog/overview

### Übersicht
Der Dialog-Service öffnet modale Dialoge mit beliebigen Komponenten oder Templates als Inhalt. Strukturelle Content-Direktiven (`mat-dialog-title`, `mat-dialog-content`, `mat-dialog-actions`) geben dem Dialog das Standard-Layout (fixierter Header und Footer, scrollbarer Inhalt). Datenübergabe erfolgt via `MAT_DIALOG_DATA`.

### Konfigurationsoptionen (`MatDialogConfig`)

| Option | Typ | Beschreibung |
|--------|-----|-------------|
| `data` | `any` | Daten für Inhaltkomponente |
| `width` | `string` | Dialog-Breite |
| `height` | `string` | Dialog-Höhe |
| `minWidth/maxWidth` | `number \| string` | Min/Max-Breite |
| `minHeight/maxHeight` | `number \| string` | Min/Max-Höhe |
| `disableClose` | `boolean` | Schließen durch Klick/Escape verhindern |
| `hasBackdrop` | `boolean` | Backdrop anzeigen |
| `panelClass` | `string \| string[]` | CSS-Klassen |
| `position` | `DialogPosition` | Position: top, bottom, left, right |
| `role` | `DialogRole` | ARIA-Rolle: `'dialog' \| 'alertdialog'` |
| `autoFocus` | `AutoFocusTarget \| string \| boolean` | Fokus beim Öffnen |
| `restoreFocus` | `boolean` | Fokus nach Schließen wiederherstellen |
| `closeOnNavigation` | `boolean` | Bei Navigation schließen |
| `enterAnimationDuration` | `string \| number` | Öffnungs-Animation |
| `exitAnimationDuration` | `string \| number` | Schließ-Animation |

### `MatDialogRef`-Methoden

| Methode | Beschreibung |
|---------|-------------|
| `close(result?)` | Dialog schließen mit optionalem Ergebnis |
| `afterOpened()` | Observable: nach dem Öffnen |
| `afterClosed()` | Observable: nach dem Schließen (mit Ergebnis) |
| `beforeClosed()` | Observable: beim Schließbeginn |
| `backdropClick()` | Observable: Backdrop-Klick |
| `updatePosition(pos)` | Position aktualisieren |
| `updateSize(width, height)` | Größe aktualisieren |

### Verwendungsbeispiel

```typescript
// Öffnen
const dialogRef = this.dialog.open(ConfirmDialogComponent, {
  width: '400px',
  data: { message: 'Möchten Sie wirklich löschen?' }
});
dialogRef.afterClosed().subscribe(result => {
  if (result) this.deleteItem();
});
```

```html
<!-- Dialog-Inhalt-Komponente -->
<h2 mat-dialog-title>Bestätigung</h2>
<mat-dialog-content>
  {{ data.message }}
</mat-dialog-content>
<mat-dialog-actions align="end">
  <button mat-button mat-dialog-close>Abbrechen</button>
  <button mat-button [mat-dialog-close]="true" cdkFocusInitial>
    Löschen
  </button>
</mat-dialog-actions>
```

### Besonderheiten / Gotchas
- `[mat-dialog-close]="true"` übergibt `true` als Ergebnis beim `afterClosed()`-Observable.
- `cdkFocusInitial` auf dem primären Aktions-Button ist ein Best Practice für Accessibility.
- `getDialogById(id)` und `closeAll()` sind nützliche Service-Methoden.

---

## Snack Bar

**Kategorie:** Popups & Modals
**Selector:** Kein Template-Selektor; wird via Service geöffnet
**Import:** `MatSnackBarModule` from `@angular/material/snack-bar`; standalone: `MatSnackBar` (Service)
**URL:** https://material.angular.dev/components/snack-bar/overview

### Übersicht
Der Snack Bar-Service zeigt kurze Benachrichtigungen am unteren Bildschirmrand an. Einfache Text-Benachrichtigungen mit optionalem Aktions-Button können direkt über `open()` erstellt werden. Für komplexere Inhalte werden benutzerdefinierte Komponenten verwendet. Snack Bars schließen sich nach konfigurierbarer Zeit automatisch.

### Service-Methoden

| Methode | Beschreibung |
|---------|-------------|
| `open(message, action?, config?)` | Einfache Text-Benachrichtigung |
| `openFromComponent(component, config?)` | Benutzerdefinierte Komponente |
| `openFromTemplate(template, config?)` | Template-basiert |
| `dismiss()` | Aktuelle Snack Bar schließen |

### Konfigurationsoptionen (`MatSnackBarConfig`)

| Option | Typ | Beschreibung |
|--------|-----|-------------|
| `duration` | `number` | Auto-Schließzeit in ms (0 = nie) |
| `horizontalPosition` | `'start' \| 'center' \| 'end' \| 'left' \| 'right'` | Horizontale Position |
| `verticalPosition` | `'top' \| 'bottom'` | Vertikale Position |
| `panelClass` | `string \| string[]` | CSS-Klassen |
| `politeness` | `AriaLivePoliteness` | ARIA Live-Politeness |
| `data` | `any` | Daten für benutzerdefinierte Komponente |

### `MatSnackBarRef`-Methoden

| Methode | Beschreibung |
|---------|-------------|
| `dismiss()` | Snack Bar schließen |
| `dismissWithAction()` | Mit Aktions-Klick schließen |
| `afterDismissed()` | Observable: nach dem Schließen |
| `afterOpened()` | Observable: nach dem Öffnen |
| `onAction()` | Observable: Aktions-Klick |

### Verwendungsbeispiel

```typescript
// Einfache Benachrichtigung
const snackRef = this.snackBar.open('Gespeichert!', 'Rückgängig', {
  duration: 3000,
  horizontalPosition: 'center',
  verticalPosition: 'bottom'
});

snackRef.onAction().subscribe(() => this.undoSave());

// Mit CSS-Klasse
this.snackBar.open('Fehler aufgetreten', '', {
  duration: 5000,
  panelClass: ['error-snackbar']
});
```

### Besonderheiten / Gotchas
- Nur eine Snack Bar ist gleichzeitig sichtbar; eine neue schließt die vorherige.
- `MAT_SNACK_BAR_DEFAULT_OPTIONS` für applikationsweite Defaults.
- `dismissedByAction: boolean` im `afterDismissed()`-Observable zeigt ob der Aktions-Button geklickt wurde.

---

## Tooltip

**Kategorie:** Popups & Modals
**Selector:** `[matTooltip]`
**Import:** `MatTooltipModule` from `@angular/material/tooltip`; standalone: `MatTooltip`
**URL:** https://material.angular.dev/components/tooltip/overview

### Übersicht
`[matTooltip]` ist eine Direktive, die einem Element einen schwebenden Tooltip hinzufügt. Der Tooltip erscheint bei Hover (Desktop) oder langen Berührungen (Mobile) und verschwindet bei Mouse-Leave, Fokus-Verlust oder Escape. Position, Verzögerungen und Touch-Verhalten sind konfigurierbar.

### Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `matTooltip` | `string` | Tooltip-Text |
| `matTooltipPosition` | `'above' \| 'below' \| 'left' \| 'right' \| 'before' \| 'after'` | Position |
| `matTooltipDisabled` | `boolean` | Tooltip deaktivieren |
| `matTooltipShowDelay` | `number` | Verzögerung beim Anzeigen in ms |
| `matTooltipHideDelay` | `number` | Verzögerung beim Ausblenden in ms |
| `matTooltipTouchGestures` | `'auto' \| 'on' \| 'off'` | Touch-Verhalten |
| `matTooltipClass` | `string \| string[] \| object` | CSS-Klassen für Tooltip |
| `matTooltipPositionAtOrigin` | `boolean` | Tooltip relativ zum Klick-/Touch-Ursprung |

### Methoden (via Template-Referenz)

| Methode | Beschreibung |
|---------|-------------|
| `show(delay?, origin?)` | Tooltip anzeigen |
| `hide(delay?)` | Tooltip ausblenden |
| `toggle(origin?)` | Tooltip ein-/ausschalten |

### Verwendungsbeispiel

```html
<!-- Einfacher Tooltip -->
<button mat-icon-button matTooltip="Einstellungen öffnen"
        matTooltipPosition="below">
  <mat-icon>settings</mat-icon>
</button>

<!-- Mit Verzögerung und manueller Kontrolle -->
<span [matTooltip]="longDescription"
      matTooltipShowDelay="500"
      #myTooltip="matTooltip"
      (click)="myTooltip.toggle()">
  Info
</span>
```

### CSS Custom Properties / Theming
`MAT_TOOLTIP_DEFAULT_OPTIONS` für globale Standardwerte. `matTooltipClass` für individuelle Styles.

### Besonderheiten / Gotchas
- Deaktivierte Buttons zeigen keinen Tooltip ohne zusätzliches Wrapper-Element, da deaktivierte Elemente keine Mouse-Events empfangen.
- Lösung: `<span [matTooltip]="..."><button disabled>...</button></span>`

---

# DATA TABLE

---

## Paginator

**Kategorie:** Data Table
**Selector:** `<mat-paginator>`
**Import:** `MatPaginatorModule` from `@angular/material/paginator`; standalone: `MatPaginator`
**URL:** https://material.angular.dev/components/paginator/overview

### Übersicht
`<mat-paginator>` bietet Navigation durch paginierte Daten. Er zeigt die aktuelle Seite, Gesamtanzahl der Einträge und optionale Seitengrößen-Auswahl an. Der Paginator gibt `PageEvent`-Ereignisse aus, mit denen die dargestellten Daten gefiltert werden können. Er ist häufig mit `mat-table` kombiniert.

### Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `length` | `number` | Gesamtanzahl der Einträge |
| `pageSize` | `number` | Einträge pro Seite (Standard: 50) |
| `pageIndex` | `number` | Aktuelle Seite (0-basiert, Standard: 0) |
| `pageSizeOptions` | `number[]` | Auswählbare Seitengrößen |
| `showFirstLastButtons` | `boolean` | Erste/Letzte-Seite-Buttons anzeigen |
| `hidePageSize` | `boolean` | Seitengröße-Auswahl ausblenden |
| `disabled` | `boolean` | Paginator deaktivieren |
| `color` | `ThemePalette` | Theme-Farbe (nur M2) |

### Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `page` | `EventEmitter<PageEvent>` | Seite oder Seitengröße geändert |

### Methoden

| Methode | Beschreibung |
|---------|-------------|
| `nextPage()` | Nächste Seite |
| `previousPage()` | Vorherige Seite |
| `firstPage()` | Erste Seite |
| `lastPage()` | Letzte Seite |
| `hasNextPage()` | Nächste Seite vorhanden? |
| `hasPreviousPage()` | Vorherige Seite vorhanden? |
| `getNumberOfPages()` | Gesamtanzahl Seiten |

### Verwendungsbeispiel

```html
<mat-paginator [length]="totalItems"
               [pageSize]="pageSize"
               [pageSizeOptions]="[5, 10, 25, 50]"
               [showFirstLastButtons]="true"
               (page)="onPageChange($event)"
               aria-label="Seitenauswahl">
</mat-paginator>
```

```typescript
onPageChange(event: PageEvent) {
  this.pageSize = event.pageSize;
  this.pageIndex = event.pageIndex;
  this.loadData();
}
```

### Besonderheiten / Gotchas
- `MAT_PAGINATOR_DEFAULT_OPTIONS` für applikationsweite Defaults.
- Lokalisierung der Beschriftungen über `MatPaginatorIntl`-Provider.

---

## Sort Header

**Kategorie:** Data Table
**Selector:** `[matSort]`, `[mat-sort-header]`
**Import:** `MatSortModule` from `@angular/material/sort`; standalone: `MatSort`, `MatSortHeader`
**URL:** https://material.angular.dev/components/sort/overview

### Übersicht
`[matSort]` ist eine Container-Direktive auf der Tabelle, die den aktuellen Sortierstatus verwaltet. `[mat-sort-header]` auf Tabellenspalten-Headern macht diese klickbar und zeigt Sortier-Pfeile. Beim Klick wechselt die Reihenfolge zwischen aufsteigend, absteigend und (optional) zurückgesetzt.

### Wichtige Inputs – `[matSort]`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `matSortActive` | `string` | Aktiv sortierte Spalten-ID |
| `matSortDirection` | `SortDirection` | Aktuelle Sortierrichtung |
| `matSortStart` | `SortDirection` | Initiale Sortierrichtung |
| `matSortDisableClear` | `boolean` | Zurücksetzen der Sortierung verhindern |
| `matSortDisabled` | `boolean` | Sortierung deaktivieren |

### Wichtige Inputs – `[mat-sort-header]`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `mat-sort-header` | `string` | ID der Spalte (Standard: Spalten-Name) |
| `arrowPosition` | `'before' \| 'after'` | Position des Sortier-Pfeils |
| `start` | `SortDirection` | Erste Sortierrichtung für diese Spalte |
| `disabled` | `boolean` | Sortierung für diese Spalte deaktivieren |
| `disableClear` | `boolean` | Zurücksetzen für diese Spalte verhindern |
| `sortActionDescription` | `string` | ARIA-Beschreibung des Sortier-Buttons |

### Wichtige Outputs – `[matSort]`

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `matSortChange` | `EventEmitter<Sort>` | Sortierstatus geändert |

### Verwendungsbeispiel

```html
<table mat-table [dataSource]="dataSource" matSort (matSortChange)="sortData($event)">
  <ng-container matColumnDef="name">
    <th mat-header-cell *matHeaderCellDef mat-sort-header="name">Name</th>
    <td mat-cell *matCellDef="let row">{{ row.name }}</td>
  </ng-container>
  <!-- ... weitere Spalten -->
  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
  <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
</table>
```

### Besonderheiten / Gotchas
- `MatTableDataSource` hat eingebaute Sortier-Unterstützung: `dataSource.sort = this.sort`.
- `SortDirection` ist `'asc' | 'desc' | ''`.

---

## Table

**Kategorie:** Data Table
**Selector:** `<mat-table>`, `table[mat-table]`
**Import:** `MatTableModule` from `@angular/material/table`; standalone: `MatTable`, `MatHeaderCellDef`, `MatCellDef`, `MatFooterCellDef`, `MatColumnDef`, `MatHeaderRowDef`, `MatRowDef`, `MatFooterRowDef`, `MatHeaderCell`, `MatCell`, `MatFooterCell`, `MatHeaderRow`, `MatRow`, `MatFooterRow`, `MatNoDataRow`, `MatTextColumn`
**URL:** https://material.angular.dev/components/table/overview

### Übersicht
`mat-table` ist ein flexibles, datengebundenes Tabellen-Framework basierend auf CDK-Table. Es unterstützt beliebige Datenquellen (Arrays, Observables, `MatTableDataSource`). Zeilen- und Spalten-Templates werden deklarativ definiert. `MatTableDataSource` bietet eingebaute Sortier-, Filter- und Paginierungsfunktionen. Sticky Header, Footer und Spalten sowie virtuelles Scrolling werden unterstützt.

### Wichtige Inputs – `<mat-table>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `dataSource` | `DataSource<T> \| T[] \| Observable<T[]>` | Datenquelle |
| `trackBy` | `TrackByFunction<T>` | Track-By-Funktion für Performance |
| `multiTemplateDataRows` | `boolean` | Mehrere Zeilen pro Datensatz |
| `fixedLayout` | `boolean` | Feste Tabellen-Layout (für Sticky-Spalten) |

### Wichtige Direktiven

| Direktive | Selektor | Beschreibung |
|-----------|---------|-------------|
| `MatColumnDef` | `[matColumnDef]` | Spaltendefinition |
| `MatHeaderCellDef` | `[matHeaderCellDef]` | Header-Zellen-Template |
| `MatCellDef` | `[matCellDef]` | Daten-Zellen-Template |
| `MatFooterCellDef` | `[matFooterCellDef]` | Footer-Zellen-Template |
| `MatHeaderRowDef` | `[matHeaderRowDef]` | Header-Zeilen-Template |
| `MatRowDef` | `[matRowDef]` | Daten-Zeilen-Template |
| `MatFooterRowDef` | `[matFooterRowDef]` | Footer-Zeilen-Template |
| `MatNoDataRow` | `[matNoDataRow]` | Zeile wenn keine Daten |

### Verwendungsbeispiel

```html
<table mat-table [dataSource]="dataSource" matSort>
  <!-- Name-Spalte -->
  <ng-container matColumnDef="name">
    <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
    <td mat-cell *matCellDef="let element">{{ element.name }}</td>
    <td mat-footer-cell *matFooterCellDef>Gesamt</td>
  </ng-container>

  <!-- Preis-Spalte -->
  <ng-container matColumnDef="price">
    <th mat-header-cell *matHeaderCellDef>Preis</th>
    <td mat-cell *matCellDef="let element">{{ element.price | currency }}</td>
    <td mat-footer-cell *matFooterCellDef>{{ getTotalCost() | currency }}</td>
  </ng-container>

  <!-- Sticky Header/Footer -->
  <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
  <tr mat-row *matRowDef="let row; columns: displayedColumns;"
      (click)="selectRow(row)"></tr>
  <tr mat-footer-row *matFooterRowDef="displayedColumns; sticky: true"></tr>

  <!-- Keine-Daten-Zeile -->
  <tr class="mat-row" *matNoDataRow>
    <td class="mat-cell" [attr.colspan]="displayedColumns.length">
      Keine Einträge gefunden
    </td>
  </tr>
</table>

<mat-paginator [pageSizeOptions]="[10, 25, 50]"></mat-paginator>
```

```typescript
@ViewChild(MatSort) sort!: MatSort;
@ViewChild(MatPaginator) paginator!: MatPaginator;

ngAfterViewInit() {
  this.dataSource.sort = this.sort;
  this.dataSource.paginator = this.paginator;
}

// Filter
applyFilter(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  this.dataSource.filter = value.trim().toLowerCase();
}
```

### CSS Custom Properties / Theming
`--mat-table-row-item-outline-color`, `--mat-table-background-color` und weitere Token in M3.

### Besonderheiten / Gotchas
- `MatTableDataSource` hat eingebaute `filter`-, `sort`- und `paginator`-Properties.
- Für Sticky-Spalten: `[sticky]="true"` auf `MatColumnDef`; `fixedLayout="true"` auf der Tabelle.
- `recycleRows` (deprecated in v23) reduziert Re-Rendering-Latenz.
- Für HTML `<table>` Syntax: `<table mat-table>` anstatt `<mat-table>`.

---

# VOLLSTÄNDIGE KOMPONENTENLISTE

| Komponente | Kategorie | Selector | Import-Pfad |
|-----------|-----------|---------|-------------|
| Autocomplete | Form Controls | `mat-autocomplete`, `[matAutocomplete]` | `@angular/material/autocomplete` |
| Checkbox | Form Controls | `mat-checkbox` | `@angular/material/checkbox` |
| Datepicker | Form Controls | `mat-datepicker`, `input[matDatepicker]` | `@angular/material/datepicker` |
| Form Field | Form Controls | `mat-form-field` | `@angular/material/form-field` |
| Input | Form Controls | `input[matInput]`, `textarea[matInput]` | `@angular/material/input` |
| Radio Button | Form Controls | `mat-radio-group`, `mat-radio-button` | `@angular/material/radio` |
| Select | Form Controls | `mat-select` | `@angular/material/select` |
| Slider | Form Controls | `mat-slider`, `input[matSliderThumb]` | `@angular/material/slider` |
| Slide Toggle | Form Controls | `mat-slide-toggle` | `@angular/material/slide-toggle` |
| Menu | Navigation | `mat-menu`, `[mat-menu-item]`, `[matMenuTriggerFor]` | `@angular/material/menu` |
| Sidenav / Drawer | Navigation | `mat-sidenav-container`, `mat-sidenav` | `@angular/material/sidenav` |
| Toolbar | Navigation | `mat-toolbar` | `@angular/material/toolbar` |
| Card | Layout | `mat-card` | `@angular/material/card` |
| Divider | Layout | `mat-divider` | `@angular/material/divider` |
| Expansion Panel | Layout | `mat-expansion-panel`, `mat-accordion` | `@angular/material/expansion` |
| Grid List | Layout | `mat-grid-list`, `mat-grid-tile` | `@angular/material/grid-list` |
| List | Layout | `mat-list`, `mat-nav-list`, `mat-selection-list` | `@angular/material/list` |
| Stepper | Layout | `mat-stepper`, `mat-step` | `@angular/material/stepper` |
| Tabs | Layout | `mat-tab-group`, `mat-tab` | `@angular/material/tabs` |
| Tree | Layout | `mat-tree`, `mat-tree-node` | `@angular/material/tree` |
| Button | Buttons & Indicators | `button[matButton]`, `button[mat-button]` etc. | `@angular/material/button` |
| Button Toggle | Buttons & Indicators | `mat-button-toggle-group`, `mat-button-toggle` | `@angular/material/button-toggle` |
| Badge | Buttons & Indicators | `[matBadge]` | `@angular/material/badge` |
| Chips | Buttons & Indicators | `mat-chip`, `mat-chip-grid`, `mat-chip-listbox` | `@angular/material/chips` |
| Icon | Buttons & Indicators | `mat-icon` | `@angular/material/icon` |
| Progress Bar | Buttons & Indicators | `mat-progress-bar` | `@angular/material/progress-bar` |
| Progress Spinner | Buttons & Indicators | `mat-progress-spinner`, `mat-spinner` | `@angular/material/progress-spinner` |
| Ripple | Buttons & Indicators | `[matRipple]`, `[mat-ripple]` | `@angular/material/core` |
| Bottom Sheet | Popups & Modals | Service: `MatBottomSheet` | `@angular/material/bottom-sheet` |
| Dialog | Popups & Modals | Service: `MatDialog` | `@angular/material/dialog` |
| Snack Bar | Popups & Modals | Service: `MatSnackBar` | `@angular/material/snack-bar` |
| Tooltip | Popups & Modals | `[matTooltip]` | `@angular/material/tooltip` |
| Paginator | Data Table | `mat-paginator` | `@angular/material/paginator` |
| Sort Header | Data Table | `[matSort]`, `[mat-sort-header]` | `@angular/material/sort` |
| Table | Data Table | `mat-table`, `table[mat-table]` | `@angular/material/table` |
