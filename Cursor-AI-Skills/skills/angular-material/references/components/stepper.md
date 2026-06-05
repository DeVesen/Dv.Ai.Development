# Stepper

**Kategorie:** Layout
**Selector:** `<mat-stepper>`, `<mat-horizontal-stepper>`, `<mat-vertical-stepper>`, `<mat-step>`
**Import:** `MatStepperModule` from `@angular/material/stepper`; Standalone: `MatStepper`, `MatStep`, `MatStepLabel`, `MatStepperIcon`, `MatStepContent`
**URL:** https://material.angular.dev/components/stepper/overview

## Übersicht

Führt Benutzer durch mehrstufige Prozesse (Wizards, mehrteilige Formulare). Horizontal und vertikal verfügbar. Navigation über Formularvalidierung steuerbar. Schritte können als optional markiert werden.

## Wichtige Inputs — `<mat-stepper>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `selectedIndex` | `number` | Aktiver Schritt-Index |
| `linear` | `boolean` | Vorwärts nur bei gültigem Schritt |
| `orientation` | `'horizontal' \| 'vertical'` | Ausrichtung |
| `labelPosition` | `'bottom' \| 'end'` | Label-Position (horizontal) |
| `disableRipple` | `boolean` | Ripple deaktivieren |
| `animationDuration` | `string` | Animations-Dauer |

## Wichtige Inputs — `<mat-step>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `label` | `string` | Text-Label |
| `completed` | `boolean` | Als abgeschlossen markieren |
| `editable` | `boolean` | Rückkehr zu diesem Schritt erlauben |
| `optional` | `boolean` | Schritt ist optional |
| `errorMessage` | `string` | Fehlermeldung bei ungültigem Schritt |
| `stepControl` | `AbstractControl` | Formular-Steuerelement für Validierung |

## Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `selectionChange` | `EventEmitter<StepperSelectionEvent>` | Schritt gewechselt |
| `animationDone` | `EventEmitter<void>` | Animation abgeschlossen |

## Verwendungsbeispiel

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

## Besonderheiten / Gotchas

- `matStepperNext` und `matStepperPrevious` als Direktiven auf Buttons
- `<ng-template matStepLabel>` für Rich-Content-Labels mit Icons
- `<ng-template matStepContent>` für Lazy-Loading des Schritts-Inhalts
