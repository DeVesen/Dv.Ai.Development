# Text Field

**Kategorie:** Components
**Import:** `TextFieldModule` from `@angular/cdk/text-field`
**URL:** https://material.angular.dev/cdk/text-field/overview

## Übersicht

Das `text-field`-Paket bietet Utilities für Texteingabefelder. `CdkTextareaAutosize` passt die Höhe eines `<textarea>`-Elements automatisch an seinen Inhalt an. `AutofillMonitor` erkennt wann der Browser ein Eingabefeld automatisch ausfüllt. Diese Utilities werden in Angular Material für `MatInput` und `MatFormField` verwendet. Das Paket erfordert das Einbinden der Prebuilt-Styles für die Autofill-Erkennung.

## Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `TextFieldModule` | NgModule | Haupt-Modul |
| `CdkTextareaAutosize` | Direktive | Auto-Größenanpassung für Textareas; Selector: `textarea[cdkTextareaAutosize]` |
| `AutofillMonitor` | Service | Erkennt Browser-Autofill-Events |
| `AutofillEvent` | Interface | `{ target: Element, isAutofilled: boolean }` |

**CdkTextareaAutosize Inputs:**
- `cdkAutosizeMinRows: number` — Minimale Zeilenzahl
- `cdkAutosizeMaxRows: number` — Maximale Zeilenzahl
- `cdkTextareaAutosize: boolean` — Autosize aktivieren/deaktivieren
- `placeholder: string` — Placeholder-Attribut

**CdkTextareaAutosize Methoden:**
- `resizeToFitContent(force?: boolean)` — Größe manuell neu berechnen

**AutofillMonitor Methoden:**
- `monitor(element: Element | ElementRef): Observable<AutofillEvent>` — Autofill beobachten
- `stopMonitoring(element: Element | ElementRef): void` — Beobachtung beenden

## Verwendungsbeispiel

```html
<!-- Textarea mit automatischer Größenanpassung -->
<textarea
  cdkTextareaAutosize
  cdkAutosizeMinRows="3"
  cdkAutosizeMaxRows="10"
  placeholder="Nachricht eingeben..."
  [(ngModel)]="message">
</textarea>
```

```typescript
import { AutofillMonitor } from '@angular/cdk/text-field';

@Component({
  template: `
    <input #emailInput type="email" placeholder="E-Mail">
    <p *ngIf="emailAutofilled">E-Mail wurde automatisch ausgefüllt</p>
  `
})
export class LoginFormComponent implements AfterViewInit, OnDestroy {
  @ViewChild('emailInput') emailInput!: ElementRef;
  emailAutofilled = false;

  constructor(private autofillMonitor: AutofillMonitor) {}

  ngAfterViewInit() {
    this.autofillMonitor
      .monitor(this.emailInput)
      .subscribe(event => {
        this.emailAutofilled = event.isAutofilled;
      });
  }

  ngOnDestroy() {
    this.autofillMonitor.stopMonitoring(this.emailInput);
  }
}
```

## Besonderheiten

- **Prebuilt-Styles**: Für `AutofillMonitor` müssen CSS-Animations-Styles importiert werden: `@import '@angular/cdk/text-field-prebuilt.css'`.
- `AutofillMonitor` basiert auf CSS-Animations-Events (`cdk-text-field-autofill-start` / `cdk-text-field-autofill-end`) statt auf direkter `input`-Event-Überwachung.
- `CdkTextareaAutosize` verwendet `auditTime()` zum Drosseln von Resize-Berechnungen.
- Firefox-spezifischer Workaround: Nach dem Resize wird zur Caret-Position gescrollt.
- `resizeToFitContent(true)` erzwingt eine Neuberechnung, auch wenn sich der Wert nicht geändert hat.
- Eine feste `height` in CSS muss entfernt werden, damit Autosize funktioniert.
