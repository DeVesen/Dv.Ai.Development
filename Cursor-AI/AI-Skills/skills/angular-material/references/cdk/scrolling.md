# Scrolling (Virtual Scrolling)

**Kategorie:** Components
**Import:** `ScrollingModule` from `@angular/cdk/scrolling`
**URL:** https://material.angular.dev/cdk/scrolling/overview

## Übersicht

Das `scrolling`-Paket bietet Virtual Scrolling für große Datenlisten und Scroll-Utilities. Das Virtual Scrolling rendert nur die aktuell sichtbaren Elemente im Viewport, was die Performance bei großen Datensätzen erheblich verbessert. `ScrollDispatcher` und `ViewportRuler` ermöglichen effizientes Scroll-Event-Handling in der gesamten Anwendung. `CdkScrollable` markiert scrollbare Container für die globale Erkennung.

## Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `ScrollingModule` | NgModule | Haupt-Modul |
| `CdkVirtualScrollViewport` | Komponente | Virtual-Scroll-Container; Selector: `cdk-virtual-scroll-viewport` |
| `CdkVirtualForOf` | Direktive | Virtual `*ngFor`; Selector: `[cdkVirtualFor]` |
| `CdkFixedSizeVirtualScroll` | Direktive | Gleichgroße Items; Selector: `[cdkFixedSizeVirtualScroll]` |
| `FixedSizeVirtualScrollStrategy` | Klasse | Scroll-Strategie für gleichgroße Items |
| `VIRTUAL_SCROLL_STRATEGY` | InjectionToken | Token für benutzerdefinierte Scroll-Strategien |
| `ScrollDispatcher` | Service | Globales Scroll-Event-Management |
| `ViewportRuler` | Service | Viewport-Größe und -Position |
| `CdkScrollable` | Direktive | Markiert scrollbaren Container |
| `CdkVirtualScrollableElement` | Direktive | Element als Scroll-Container |
| `CdkVirtualScrollableWindow` | Direktive | Window als Scroll-Container |

**CdkVirtualScrollViewport Inputs:**
- `orientation: 'horizontal' | 'vertical'` — Scroll-Richtung (Standard: `'vertical'`)
- `appendOnly: boolean` — Gerenderte Items bleiben im DOM

**CdkVirtualScrollViewport Outputs:**
- `scrolledIndexChange: EventEmitter<number>` — Index des ersten sichtbaren Elements

**CdkFixedSizeVirtualScroll Inputs:**
- `itemSize: number` — Größe jedes Items in px (Standard: 20)
- `minBufferPx: number` — Minimaler Buffer über/unter dem Viewport (Standard: 100)
- `maxBufferPx: number` — Maximaler Buffer (Standard: 200)

**CdkVirtualForOf (strukturelle Direktive):**
- `cdkVirtualForOf: DataSource<T> | Observable<T[]> | T[]` — Datenquelle
- `cdkVirtualForTrackBy: TrackByFunction<T>` — Identifikation
- `cdkVirtualForTemplate: TemplateRef<CdkVirtualForOfContext<T>>` — Template
- `cdkVirtualForTemplateCacheSize: number` — Template-Cache-Größe

## Verwendungsbeispiel

```html
<!-- Fixed-Size Virtual Scrolling -->
<cdk-virtual-scroll-viewport itemSize="50" style="height: 400px;">
  <div *cdkVirtualFor="let item of items; trackBy: trackByFn"
       style="height: 50px;">
    {{ item.name }}
  </div>
</cdk-virtual-scroll-viewport>
```

```typescript
import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  selector: 'my-list',
  template: `
    <cdk-virtual-scroll-viewport [itemSize]="itemHeight" class="list-container">
      <div *cdkVirtualFor="let item of largeDataset; let i = index"
           [style.height.px]="itemHeight">
        {{ i }}: {{ item.name }}
      </div>
    </cdk-virtual-scroll-viewport>
  `,
  styles: ['.list-container { height: 500px; width: 100%; }']
})
export class VirtualListComponent {
  itemHeight = 48;
  largeDataset = Array.from({ length: 100000 }, (_, i) => ({ name: `Item ${i}` }));

  trackByFn(index: number, item: any) {
    return item.name;
  }
}
```

```typescript
// Benutzerdefinierte Scroll-Strategie für variable Item-Größen
// HINWEIS: Angular CDK hat keine eingebaute VariableSizeVirtualScrollStrategy.
// Sie müssen das VirtualScrollStrategy-Interface selbst implementieren.
import { VIRTUAL_SCROLL_STRATEGY, VirtualScrollStrategy } from '@angular/cdk/scrolling';
import { ListRange } from '@angular/cdk/collections';
import { Subject } from 'rxjs';

class CustomVariableScrollStrategy implements VirtualScrollStrategy {
  scrolledIndexChange = new Subject<number>();
  private _viewport: any = null;

  attach(viewport: any) { this._viewport = viewport; }
  detach() { this._viewport = null; }
  onContentScrolled() { /* eigene Scroll-Logik */ }
  onDataLengthChanged() { /* bei Datenmenge-Änderung */ }
  onContentRendered() {}
  onRenderedOffsetChanged() {}
  scrollToIndex(index: number, behavior: ScrollBehavior) {}
}

@Directive({ selector: '[customVariableScroll]', providers: [{
  provide: VIRTUAL_SCROLL_STRATEGY,
  useFactory: (d: CustomVariableScrollDirective) => d.scrollStrategy,
  deps: [CustomVariableScrollDirective]
}]})
export class CustomVariableScrollDirective {
  scrollStrategy = new CustomVariableScrollStrategy();
}
```

## Besonderheiten

- `appendOnly: true` verhindert das Entfernen von bereits gerenderten Items — sinnvoll wenn Items über die Zeit wachsen können.
- Für variable Item-Größen muss das Interface `VirtualScrollStrategy` selbst implementiert werden — Angular CDK stellt dafür keine fertige Strategie bereit. Das Interface verlangt: `attach()`, `detach()`, `onContentScrolled()`, `onDataLengthChanged()`, `onContentRendered()`, `onRenderedOffsetChanged()`, `scrollToIndex()`.
- `ScrollDispatcher` verwendet `auditTime()` intern, um Scroll-Events zu drosseln.
- `ViewportRuler` liefert `getViewportSize()`, `getViewportRect()` und `getViewportScrollPosition()`.
- Virtual Scrolling erfordert eine **feste Höhe/Breite** am `cdk-virtual-scroll-viewport`.
