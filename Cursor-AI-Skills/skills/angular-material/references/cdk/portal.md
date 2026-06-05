# Portal

**Kategorie:** Components
**Import:** `PortalModule` from `@angular/cdk/portal`
**URL:** https://material.angular.dev/cdk/portal/overview

## Übersicht

Das `portal`-Paket ermöglicht die dynamische Darstellung von UI-Inhalten (Komponenten, Templates oder DOM-Elemente) an beliebigen Stellen in der Anwendung. Ein `Portal` repräsentiert den darzustellenden Inhalt, ein `PortalOutlet` ist der Zielort. Dieses Konzept bildet die Grundlage für das Overlay-Paket und ermöglicht fortgeschrittene Muster wie das dynamische Einfügen von Inhalten in App-Shells oder das Teleportieren von Komponenten.

## Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `PortalModule` | NgModule | Haupt-Modul |
| `Portal<T>` | Abstrakte Klasse | Basis für alle Portal-Typen |
| `ComponentPortal<T>` | Klasse | Portal für eine Angular-Komponente |
| `TemplatePortal<C>` | Klasse | Portal für ein `TemplateRef` |
| `DomPortal<T>` | Klasse | Portal für ein DOM-Element |
| `CdkPortal` | Direktive | Template-basiertes Portal; Selector: `[cdkPortal]` |
| `PortalOutlet` | Interface | Basis-Interface für Outlet |
| `DomPortalOutlet` | Klasse | DOM-basiertes Outlet |
| `CdkPortalOutlet` | Direktive | Deklaratives Outlet; Selector: `[cdkPortalOutlet]` |

**Portal API:**
- `attach(outlet: PortalOutlet): T` — Portal anhängen
- `detach(): void` — Portal ablösen
- `isAttached: boolean` — Anhänge-Status

**PortalOutlet API:**
- `attach(portal: Portal): any` — Portal anhängen
- `detach(): any` — Portal ablösen
- `dispose(): void` — Outlet permanent entfernen
- `hasAttached: boolean` — Hat ein Portal

**CdkPortalOutlet Inputs:**
- `cdkPortalOutlet: Portal | null` — Das anzuhängende Portal

**CdkPortalOutlet Outputs:**
- `attached: EventEmitter<CdkPortalOutletAttachedRef>` — Bei Anhängen

## Verwendungsbeispiel

```typescript
import {
  ComponentPortal, TemplatePortal, CdkPortalOutlet, PortalModule
} from '@angular/cdk/portal';

// Komponenten-Portal
@Component({ ... })
export class AppComponent implements AfterViewInit {
  @ViewChild(CdkPortalOutlet) portalOutlet!: CdkPortalOutlet;

  ngAfterViewInit() {
    const portal = new ComponentPortal(MyDynamicComponent);
    this.portalOutlet.attach(portal);
  }
}
```

```html
<!-- Template-Portal -->
<ng-template cdkPortal #myPortal="cdkPortal">
  <p>Ich werde dynamisch gerendert!</p>
</ng-template>

<div [cdkPortalOutlet]="activePortal"></div>
```

```typescript
// Template-Portal programmatisch
@Component({ ... })
export class ParentComponent {
  @ViewChild('myPortal') portalTemplate!: CdkPortal;
  activePortal: Portal<any> | null = null;

  showPortal() {
    this.activePortal = this.portalTemplate;
  }

  hidePortal() {
    this.activePortal = null;
  }
}
```

```typescript
// DomPortalOutlet für Rendering außerhalb des Angular-Baums (v14+, kein ComponentFactoryResolver nötig)
import { DomPortalOutlet, ComponentPortal, ApplicationRef } from '@angular/cdk/portal';
import { Injector } from '@angular/core';

const outlet = new DomPortalOutlet(
  document.body,
  appRef,
  injector
);
outlet.attach(new ComponentPortal(NotificationComponent));
```

## Besonderheiten

- `DomPortal` bewegt das physische DOM-Element — Angular-Bindings und Direktiven können danach nicht mehr aktualisiert werden.
- `ComponentPortal` kann einen optionalen `Injector` für Dependency Injection übergeben.
- `TemplatePortal` benötigt eine `ViewContainerRef` für die Erzeugung.
- Das Portal-System bildet die Grundlage für `Overlay`, `Dialog` und andere CDK-Komponenten.
- `CdkPortalOutlet` emittiert bei jedem Anhängen das zugehörige Portal-Ref-Objekt.
- `DomPortalOutlet` benötigt seit Angular v14 (Ivy) keinen `ComponentFactoryResolver` mehr — der Konstruktor akzeptiert nur noch `(element, appRef, injector)`.
