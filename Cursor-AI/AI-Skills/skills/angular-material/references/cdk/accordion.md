# Accordion

**Kategorie:** Components
**Import:** `CdkAccordionModule` from `@angular/cdk/accordion`
**URL:** https://material.angular.dev/cdk/accordion/overview

## Übersicht

Das Accordion-CDK-Modul stellt unstyled Basiskomponenten für Akkordeon-Muster bereit. Es ermöglicht das Aus- und Einklappen von Inhaltsbereichen und unterstützt sowohl Einzel- als auch Mehrfachauswahl. Die `CdkAccordion`-Direktive fungiert als übergeordneter Container, während `CdkAccordionItem` einzelne Panels verwaltet. Das Modul dient als Grundlage für die `MatExpansionPanel`-Komponente von Angular Material.

## Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `CdkAccordionModule` | NgModule | Haupt-Modul |
| `CdkAccordion` | Direktive | Container; Selector: `cdk-accordion`, `[cdkAccordion]` |
| `CdkAccordionItem` | Direktive | Einzelnes Panel; Selector: `cdk-accordion-item`, `[cdkAccordionItem]` |
| `CDK_ACCORDION` | InjectionToken | Token für Accordion-Instanz |

**CdkAccordion Inputs:**
- `multi: boolean` — Erlaubt mehrere gleichzeitig geöffnete Items (Standard: `false`)

**CdkAccordion Methoden:**
- `openAll()` — Öffnet alle Items (nur wenn `multi=true`)
- `closeAll()` — Schließt alle Items

**CdkAccordionItem Inputs:**
- `expanded: boolean` — Geöffnet/Geschlossen-Status
- `disabled: boolean` — Deaktiviert das Item
- `id: string` — Eindeutige ID

**CdkAccordionItem Outputs:**
- `expandedChange: EventEmitter<boolean>` — Bei Statusänderung
- `opened: EventEmitter<void>` — Beim Öffnen
- `closed: EventEmitter<void>` — Beim Schließen
- `destroyed: EventEmitter<void>` — Beim Zerstören

## Verwendungsbeispiel

```html
<cdk-accordion>
  <cdk-accordion-item
    *ngFor="let item of items; let i = index"
    #accordionItem="cdkAccordionItem"
    [attr.id]="'accordion-header-' + i"
    [attr.aria-controls]="'accordion-body-' + i"
    role="button"
    tabindex="0">

    <div (click)="accordionItem.toggle()">
      {{ item.title }}
      <span>{{ accordionItem.expanded ? '▲' : '▼' }}</span>
    </div>

    <div
      role="region"
      [attr.id]="'accordion-body-' + i"
      [attr.aria-labelledby]="'accordion-header-' + i"
      [hidden]="!accordionItem.expanded">
      {{ item.content }}
    </div>
  </cdk-accordion-item>
</cdk-accordion>
```

```typescript
import { CdkAccordionModule } from '@angular/cdk/accordion';

@NgModule({
  imports: [CdkAccordionModule]
})
export class AppModule {}
```

## Besonderheiten

- Das Modul ist **vollständig unstyled** — kein visuelles Design ist enthalten.
- `CdkAccordionItem` stellt `toggle()`, `open()`, `close()` als Methoden bereit.
- Die `CdkAccordionItem`-Direktive implementiert `OnDestroy` und räumt automatisch auf.
- Barrierefreiheit muss manuell durch korrekte ARIA-Attribute (`aria-expanded`, `aria-controls`, `role="region"`) sichergestellt werden.
