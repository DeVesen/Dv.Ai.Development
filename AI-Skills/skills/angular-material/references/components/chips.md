# Chips

**Kategorie:** Buttons & Indicators
**Selector:** `<mat-chip>`, `<mat-chip-row>`, `<mat-chip-option>`, `<mat-chip-listbox>`, `<mat-chip-grid>`, `input[matChipInputFor]`
**Import:** `MatChipsModule` from `@angular/material/chips`; Standalone: `MatChip`, `MatChipRow`, `MatChipOption`, `MatChipListbox`, `MatChipGrid`, `MatChipInput`, `MatChipRemove`, `MatChipAvatar`, `MatChipTrailingIcon`
**URL:** https://material.angular.dev/components/chips/overview

## Übersicht

Drei Chip-Varianten: `<mat-chip>` (nur Anzeige), `<mat-chip-option>` in `<mat-chip-listbox>` (Auswahl), `<mat-chip-row>` in `<mat-chip-grid>` (Eingabe mit `matChipInputFor`). Unterstützt Entfernen, Avatare und Trailing Icons.

## Wichtige Inputs — `<mat-chip>` / `<mat-chip-row>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `value` | `any` | Chip-Wert |
| `disabled` | `boolean` | Deaktivieren |
| `removable` | `boolean` | Entfernen-Button anzeigen |
| `highlighted` | `boolean` | Chip hervorheben |
| `disableRipple` | `boolean` | Ripple deaktivieren |
| `color` | `string \| null` | Theme-Farbe (nur M2) |
| `editable` | `boolean` | Bearbeitbar (nur `mat-chip-row`) |

## Wichtige Inputs — `<mat-chip-listbox>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `multiple` | `boolean` | Mehrfachauswahl |
| `selectable` | `boolean` | Chips auswählbar |
| `required` | `boolean` | Pflichtauswahl |
| `hideSingleSelectionIndicator` | `boolean` | Haken ausblenden |

## Wichtige Inputs — `input[matChipInputFor]`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `matChipInputFor` | `MatChipGrid` | Verknüpftes Grid |
| `separatorKeyCodes` | `number[]` | Tastencodes für Chip-Erstellung |
| `addOnBlur` | `boolean` | Chip bei Blur hinzufügen |

## Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `removed` | `EventEmitter<MatChipEvent>` | Chip entfernt |
| `edited` | `EventEmitter<MatChipEditedEvent>` | Chip bearbeitet |
| `change` | `EventEmitter<MatChipListboxChange>` | Auswahl geändert (Listbox) |
| `chipEnd` | `EventEmitter<MatChipInputEvent>` | Eingabe abgeschlossen |

## Verwendungsbeispiel

```html
<!-- Chip-Eingabefeld -->
<mat-form-field>
  <mat-label>Tags</mat-label>
  <mat-chip-grid #chipGrid>
    @for (tag of tags; track tag) {
      <mat-chip-row (removed)="removeTag(tag)">
        {{ tag }}
        <button matChipRemove aria-label="Tag entfernen">
          <mat-icon>cancel</mat-icon>
        </button>
      </mat-chip-row>
    }
  </mat-chip-grid>
  <input placeholder="Neuer Tag..."
         [matChipInputFor]="chipGrid"
         (matChipInputTokenEnd)="addTag($event)">
</mat-form-field>

<!-- Auswahl-Chips -->
<mat-chip-listbox [(ngModel)]="selectedFruits" multiple>
  <mat-chip-option value="apple">Apfel</mat-chip-option>
  <mat-chip-option value="banana">Banane</mat-chip-option>
</mat-chip-listbox>
```

## Besonderheiten / Gotchas

- `matChipRemove` und `matChipTrailingIcon` sind Direktiven auf Kindelementen
- Entfernen-Buttons immer mit `aria-label` für Barrierefreiheit
- `mat-chip-row` für Chips in Formularen (editierbar, löschbar)
