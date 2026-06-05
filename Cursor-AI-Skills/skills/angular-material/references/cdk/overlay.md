# Overlay

**Kategorie:** Components
**Import:** `OverlayModule` from `@angular/cdk/overlay`
**URL:** https://material.angular.dev/cdk/overlay/overview

## Übersicht

Das `overlay`-Paket ermöglicht die Darstellung schwebender UI-Panels auf dem Bildschirm. Es dient als Grundlage für Dropdowns, Tooltips, Dialoge und andere Overlay-Elemente in Angular Material. Das Paket bietet flexible Positionierungsstrategien (global oder relativ zu einem anderen Element) sowie verschiedene Scroll-Strategien, die das Verhalten des Overlays beim Scrollen der Seite steuern. Alle Angular Material Overlays (MatDialog, MatMenu, MatTooltip etc.) bauen auf diesem CDK auf.

## Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `OverlayModule` | NgModule | Haupt-Modul |
| `Overlay` | Service | Erstellt Overlay-Instanzen |
| `OverlayRef` | Klasse | Referenz auf ein Overlay |
| `OverlayConfig` | Klasse | Konfiguration für ein Overlay |
| `OverlayContainer` | Service | Container für alle Overlays |
| `FullscreenOverlayContainer` | Service | Fullscreen-kompatibler Container |
| `OverlayPositionBuilder` | Service | Erstellt Positionierungsstrategien |
| `GlobalPositionStrategy` | Klasse | Globale Positionierung im Viewport |
| `FlexibleConnectedPositionStrategy` | Klasse | Relative Positionierung zu einem Element |
| `ConnectedPosition` | Interface | Position-Definition (origin + overlay + Fallbacks) |
| `CdkOverlayOrigin` | Direktive | Markiert Element als Overlay-Origin; Selector: `[cdk-overlay-origin]` |
| `CdkConnectedOverlay` | Direktive | Deklaratives Overlay; Selector: `[cdk-connected-overlay]` |
| `OVERLAY_DEFAULT_CONFIG` | InjectionToken | Standard-Konfiguration |

**Scroll-Strategien:**
- `overlay.scrollStrategies.noop()` — Keine Reaktion (Standard)
- `overlay.scrollStrategies.close()` — Overlay schließen beim Scrollen
- `overlay.scrollStrategies.block()` — Seiten-Scrollen verhindern
- `overlay.scrollStrategies.reposition()` — Position neu berechnen

**OverlayConfig Optionen:**
- `width, height, minWidth, minHeight, maxWidth, maxHeight`
- `positionStrategy: PositionStrategy`
- `scrollStrategy: ScrollStrategy`
- `hasBackdrop: boolean`
- `backdropClass: string | string[]`
- `panelClass: string | string[]`
- `direction: Direction`
- `disposeOnNavigation: boolean`

**OverlayRef Methoden:**
- `attach(portal: Portal)` — Inhalt anhängen
- `detach()` — Inhalt entfernen
- `dispose()` — Overlay permanent entfernen
- `backdropClick(): Observable<MouseEvent>`
- `keydownEvents(): Observable<KeyboardEvent>`
- `overlayElement: HTMLElement`
- `updatePosition()` — Position neu berechnen
- `updateSize(config: OverlaySizeConfig)` — Größe aktualisieren

## Verwendungsbeispiel

```typescript
import { Overlay, OverlayConfig } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';

@Component({ ... })
export class TooltipComponent implements OnDestroy {
  private overlayRef?: OverlayRef;

  constructor(private overlay: Overlay) {}

  showTooltip(origin: ElementRef) {
    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo(origin)
      .withPositions([
        { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 8 },
        { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -8 }
      ]);

    const config = new OverlayConfig({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.close(),
      hasBackdrop: false,
      panelClass: 'my-tooltip-panel'
    });

    this.overlayRef = this.overlay.create(config);
    this.overlayRef.attach(new ComponentPortal(TooltipContentComponent));

    this.overlayRef.backdropClick().subscribe(() => this.hideTooltip());
  }

  hideTooltip() {
    this.overlayRef?.detach();
  }

  ngOnDestroy() {
    this.overlayRef?.dispose();
  }
}
```

```html
<!-- Deklarativ mit CdkConnectedOverlay -->
<button #trigger="cdkOverlayOrigin" cdkOverlayOrigin (click)="isOpen = !isOpen">
  Dropdown öffnen
</button>

<ng-template
  cdkConnectedOverlay
  [cdkConnectedOverlayOrigin]="trigger"
  [cdkConnectedOverlayOpen]="isOpen"
  (overlayOutsideClick)="isOpen = false">
  <div class="dropdown-panel">
    <p>Dropdown-Inhalt</p>
  </div>
</ng-template>
```

## Besonderheiten

- **Strukturelle Styles**: Müssen manuell importiert werden wenn Material nicht verwendet wird: `@angular/cdk/overlay-prebuilt.css`.
- **Z-Index**: Overlays werden in einem eigenen Container außerhalb des App-Roots gerendert.
- **FlexibleConnectedPositionStrategy**: Unterstützt mehrere Fallback-Positionen, Viewport-Margins, `push: true` um das Overlay in sichtbaren Bereich zu drängen.
- **PositionStrategy**: Benutzerdefinierte Strategien durch Implementierung des `PositionStrategy`-Interface möglich.
- `STANDARD_DROPDOWN_ADJACENT_POSITIONS` und `STANDARD_DROPDOWN_BELOW_POSITIONS` sind vordefinierte Position-Arrays.
