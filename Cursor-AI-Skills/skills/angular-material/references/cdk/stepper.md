# Stepper

**Kategorie:** Components
**Import:** `CdkStepperModule` from `@angular/cdk/stepper`
**URL:** https://material.angular.dev/cdk/stepper/overview

## Übersicht

Das `stepper`-Paket implementiert das grundlegende Stepper-Muster für Multi-Schritt-Workflows ohne visuelles Styling. Es verwaltet die Navigation zwischen einzelnen Schritten, Validierungsstatus und Barrierefreiheit. `CdkStepper` ist der Container-Direktive; `CdkStep` repräsentiert jeden Schritt. Das Paket unterstützt linearen und nicht-linearen Modus sowie horizontale und vertikale Ausrichtung.

## Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `CdkStepperModule` | NgModule | Haupt-Modul |
| `CdkStepper` | Direktive | Stepper-Container; Selector: `[cdkStepper]` |
| `CdkStep` | Komponente | Einzelner Schritt; Selector: `cdk-step` |
| `CdkStepHeader` | Direktive | Schritt-Header; Selector: `[cdkStepHeader]` |
| `CdkStepLabel` | Direktive | Schritt-Label; Selector: `[cdkStepLabel]` |
| `CdkStepperNext` | Direktive | Nächster-Schritt-Button; Selector: `[cdkStepperNext]` |
| `CdkStepperPrevious` | Direktive | Vorheriger-Schritt-Button; Selector: `[cdkStepperPrevious]` |
| `StepperSelectionEvent` | Interface | Event bei Schritt-Wechsel |
| `STEPPER_GLOBAL_OPTIONS` | InjectionToken | Globale Stepper-Konfiguration |

**CdkStep Inputs:**
- `stepControl: AbstractControl` — Formular-Kontrolle für Validierung
- `label: string` — Text-Label
- `errorMessage: string` — Fehlermeldung
- `editable: boolean` — Rückkehr zu diesem Schritt erlauben (Standard: `true`)
- `optional: boolean` — Schritt ist optional (Standard: `false`)
- `completed: boolean` — Manuell als abgeschlossen markieren
- `hasError: boolean` — Fehlerstatus
- `state: StepState` — Status: `'number' | 'edit' | 'done' | 'error' | string`

**CdkStepper Inputs:**
- `linear: boolean` — Linearer Modus (vorherige Schritte müssen abgeschlossen sein)
- `selectedIndex: number` — Aktueller Schritt-Index
- `selected: CdkStep` — Aktueller Schritt
- `orientation: 'horizontal' | 'vertical'`

**CdkStepper Outputs:**
- `selectionChange: StepperSelectionEvent` — Bei Schritt-Wechsel
- `selectedIndexChange: number` — Für Two-Way-Binding

**CdkStepper Methoden:**
- `next()` — Zum nächsten Schritt
- `previous()` — Zum vorherigen Schritt
- `reset()` — Auf ersten Schritt zurücksetzen

## Verwendungsbeispiel

```html
<div cdkStepper #stepper="cdkStepper" [linear]="isLinear">
  <!-- Schritt 1 -->
  <cdk-step [stepControl]="step1Form" label="Persönliche Daten">
    <form [formGroup]="step1Form">
      <input formControlName="name" placeholder="Name">
      <input formControlName="email" placeholder="E-Mail">
    </form>
    <button cdkStepperNext [disabled]="step1Form.invalid">Weiter</button>
  </cdk-step>

  <!-- Schritt 2 -->
  <cdk-step [stepControl]="step2Form" label="Adresse" [optional]="true">
    <form [formGroup]="step2Form">
      <input formControlName="street" placeholder="Straße">
      <input formControlName="city" placeholder="Stadt">
    </form>
    <button cdkStepperPrevious>Zurück</button>
    <button cdkStepperNext>Weiter</button>
  </cdk-step>

  <!-- Schritt 3 -->
  <cdk-step label="Bestätigung">
    <p>Alle Daten überprüft?</p>
    <button cdkStepperPrevious>Zurück</button>
    <button (click)="onSubmit()">Absenden</button>
  </cdk-step>
</div>

<!-- Schritt-Indikatoren -->
<div *ngFor="let step of stepper.steps; let i = index">
  <button (click)="stepper.selectedIndex = i">
    Schritt {{ i + 1 }}: {{ step.label }}
  </button>
</div>
```

## Besonderheiten

- Im `linear`-Modus kann der Nutzer nur zum nächsten Schritt gelangen, wenn `stepControl.valid` oder `completed: true`.
- `STEPPER_GLOBAL_OPTIONS` kann `{ showError: true, displayDefaultIndicatorType: false }` enthalten.
- Tastaturnavigation: Pfeiltasten für Header-Navigation, Tab für Inhaltsbereich.
- ARIA-Attribute werden automatisch gesetzt (`aria-selected`, `aria-disabled`).
- `CdkStep` implementiert `AfterContentInit` und `OnChanges` für reaktive Updates.
