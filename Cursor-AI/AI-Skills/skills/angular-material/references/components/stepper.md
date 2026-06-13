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

## Stepper-Icons (benutzerdefiniert)

```html
<mat-stepper>
  <ng-template matStepperIcon="edit">
    <mat-icon>create</mat-icon>
  </ng-template>
  <ng-template matStepperIcon="done">
    <mat-icon>check_circle</mat-icon>
  </ng-template>
  <!-- Schritte ... -->
</mat-stepper>
```

Mögliche Werte für `matStepperIcon`: `'number'` (aktiver Schritt), `'edit'` (bearbeitbarer Schritt), `'done'` (abgeschlossener Schritt), `'error'`.

## Lokalisierung — `MatStepperIntl`

```typescript
import { MatStepperIntl } from '@angular/material/stepper';
import { Injectable } from '@angular/core';

@Injectable()
export class CustomStepperIntl extends MatStepperIntl {
  override optionalLabel = 'Optional';
  override completedLabel = 'Abgeschlossen';
  override editableLabel = 'Bearbeiten';
}

// In providers:
providers: [{ provide: MatStepperIntl, useClass: CustomStepperIntl }]
```

## Methoden — `MatStepper`

| Methode | Beschreibung |
|---------|-------------|
| `next()` | Nächster Schritt |
| `previous()` | Vorheriger Schritt |
| `reset()` | Alle Schritte zurücksetzen (Index 0, Formulare zurücksetzen) |
| `selectedIndex` | Aktiver Index (lesen/setzen) |

## Besonderheiten / Gotchas

- `matStepperNext` und `matStepperPrevious` als Direktiven auf Buttons
- `<ng-template matStepLabel>` für Rich-Content-Labels mit Icons
- `<ng-template matStepContent>` für Lazy-Loading des Schritts-Inhalts
- `reset()` setzt `selectedIndex` auf 0 und ruft `reset()` auf allen `stepControl`-Formularen auf
- `MAT_STEPPER_GLOBAL_OPTIONS: { showError: boolean, displayDefaultIndicatorType: boolean }` — applikationsweite Stepper-Konfiguration
- `linear="true"`: Validierung mit `stepControl`-Property auf jedem Schritt; erst wenn gültig kann vorwärts navigiert werden
