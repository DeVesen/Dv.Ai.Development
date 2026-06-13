# Observers

**Kategorie:** Common Behaviors
**Import:** `ObserversModule` from `@angular/cdk/observers`
**URL:** https://material.angular.dev/cdk/observers/overview

## Übersicht

Das `observers`-Paket bietet Angular-Wrappers um native Browser-APIs zur Beobachtung von DOM-Änderungen. Der `ContentObserver`-Service nutzt die `MutationObserver`-API, um Änderungen am Inhalt eines Elements zu überwachen und als Observable zu emittieren. Die `cdkObserveContent`-Direktive vereinfacht die deklarative Verwendung. Das Paket filtert automatisch Angular-interne Comment-Nodes, um falsche Change-Detection-Zyklen zu verhindern.

## Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `ObserversModule` | NgModule | Haupt-Modul |
| `ContentObserver` | Service | Überwacht DOM-Inhalt per MutationObserver |
| `CdkObserveContent` | Direktive | Deklarative Inhaltsbeobachtung; Selector: `[cdkObserveContent]` |

**ContentObserver Methoden:**
- `observe(element: Element | ElementRef): Observable<MutationRecord[]>` — Element beobachten

**CdkObserveContent Inputs:**
- `disabled` (Alias: `cdkObserveContentDisabled`): `boolean` — Beobachtung deaktivieren
- `debounce: number` — Debounce-Zeit in ms

**CdkObserveContent Outputs:**
- `cdkObserveContent: EventEmitter<MutationRecord[]>` — Bei Inhaltsänderung

## Verwendungsbeispiel

```html
<!-- Direktive -->
<div
  (cdkObserveContent)="onContentChanged($event)"
  [debounce]="300">
  <ng-content></ng-content>
</div>
```

```typescript
import { ContentObserver } from '@angular/cdk/observers';

@Component({ ... })
export class MyComponent implements AfterViewInit, OnDestroy {
  @ViewChild('myElement') myElement!: ElementRef;
  private observer$?: Subscription;

  constructor(private contentObserver: ContentObserver) {}

  ngAfterViewInit() {
    this.observer$ = this.contentObserver
      .observe(this.myElement)
      .subscribe(mutations => {
        console.log('DOM-Änderungen:', mutations);
        this.recalculateLayout();
      });
  }

  ngOnDestroy() {
    this.observer$?.unsubscribe();
  }
}
```

## Besonderheiten

- `ContentObserver` nutzt einen Observer-Pool — mehrere Komponenten können dasselbe Element beobachten ohne mehrere `MutationObserver`-Instanzen zu erstellen.
- Angular-interne Comment-Nodes (Template-Marker) werden automatisch herausgefiltert.
- Emissionen erfolgen innerhalb der Angular-Zone, sodass Change Detection automatisch ausgelöst wird.
- `debounce`-Option verhindert übermäßige Änderungs-Events bei schnellen DOM-Manipulationen.
- Nicht verfügbar in SSR-Umgebungen (Node.js hat keine `MutationObserver`-API).
