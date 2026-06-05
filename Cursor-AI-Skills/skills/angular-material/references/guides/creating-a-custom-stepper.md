# Creating a Custom Stepper using the CDK Stepper

**URL:** https://material.angular.dev/guide/creating-a-custom-stepper-using-the-cdk-stepper

## Zusammenfassung

CDK Stepper ermöglicht vollständig custom gestylten Stepper ohne Material Design Styling. Eigene Komponente erweitert `CdkStepper`. Freie Navigation und linearer Modus unterstützt.

## Kernpunkte

- Eigene Komponente `extends CdkStepper`
- Provider: `{provide: CdkStepper, useExisting: CustomStepperComponent}`
- Properties aus `CdkStepper`: `linear`, `selectedIndex`, `steps`, `selected`
- Direktiven: `cdkStepperPrevious`, `cdkStepperNext` für Navigation
- Schritte in `<cdk-step>` gewrappt
- Inhalt via `[ngTemplateOutlet]="selected.content"` eingebunden
- **Linearer Modus**: `linear` Attribut + `[completed]` auf `<cdk-step>` + `editable="false"`

## Code-Beispiele

Custom Stepper Komponente:
```typescript
@Component({
  selector: 'app-custom-stepper',
  templateUrl: './custom-stepper.component.html',
  providers: [{ provide: CdkStepper, useExisting: CustomStepperComponent }]
})
export class CustomStepperComponent extends CdkStepper {
  onClick(index: number): void {
    this.selectedIndex = index;
  }
}
```

Custom Stepper Template:
```html
<section class="container">
  <header><h2>Step {{selectedIndex + 1}}/{{steps.length}}</h2></header>
  <div [style.display]="selected ? 'block' : 'none'">
    <ng-container [ngTemplateOutlet]="selected.content"></ng-container>
  </div>
  <footer class="step-navigation-bar">
    <button cdkStepperPrevious>&larr;</button>
    @for (step of steps; track step; let i = $index) {
      <button [class.active]="selectedIndex === i" (click)="onClick(i)">Step {{i + 1}}</button>
    }
    <button cdkStepperNext>&rarr;</button>
  </footer>
</section>
```

Verwendung:
```html
<app-custom-stepper>
  <cdk-step><p>Inhalt Schritt 1</p></cdk-step>
  <cdk-step><p>Inhalt Schritt 2</p></cdk-step>
</app-custom-stepper>
```

Linearer Modus:
```html
<app-custom-stepper linear>
  <cdk-step editable="false" [completed]="completed">
    <input type="text" />
    <button (click)="completeStep()">Schritt abschließen</button>
  </cdk-step>
  <cdk-step editable="false">
    <input type="text" value="b" />
  </cdk-step>
</app-custom-stepper>
```

## Wichtige Hinweise

- Styling liegt vollständig beim Entwickler — kein Material Design Styling enthalten
- `CdkStepper` als Provider registrieren damit `cdkStepperPrevious/Next` die Instanz finden
- Im linearen Modus muss `[completed]` korrekt gesetzt sein
