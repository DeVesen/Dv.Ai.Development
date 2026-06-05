# Layout

**Kategorie:** Common Behaviors
**Import:** `LayoutModule` from `@angular/cdk/layout`
**URL:** https://material.angular.dev/cdk/layout/overview

## Übersicht

Das `layout`-Paket stellt Werkzeuge zur Erkennung von Viewport-Größen und Media-Queries bereit. `BreakpointObserver` ermöglicht reaktives Reagieren auf Viewport-Änderungen mit vordefinierten Breakpoints oder benutzerdefinierten Media-Queries. `MediaMatcher` bietet eine direkte Schnittstelle zur `matchMedia`-API des Browsers und gibt `MediaQueryList`-Objekte zurück. Diese Werkzeuge sind die Grundlage für responsive Designs in Angular-Anwendungen.

## Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `LayoutModule` | NgModule | Haupt-Modul |
| `BreakpointObserver` | Service | Observiert Media-Query-Änderungen |
| `BreakpointState` | Interface | `{ matches: boolean, breakpoints: { [key: string]: boolean } }` |
| `Breakpoints` | Konstante | Vordefinierte Breakpoint-Strings |
| `MediaMatcher` | Service | Direkte `matchMedia`-API |

**Breakpoints-Konstanten:**
- `Breakpoints.XSmall`: `(max-width: 599.98px)`
- `Breakpoints.Small`: `(min-width: 600px) and (max-width: 959.98px)`
- `Breakpoints.Medium`: `(min-width: 960px) and (max-width: 1279.98px)`
- `Breakpoints.Large`: `(min-width: 1280px) and (max-width: 1919.98px)`
- `Breakpoints.XLarge`: `(min-width: 1920px)`
- `Breakpoints.Handset`, `Breakpoints.Tablet`, `Breakpoints.Web`
- `Breakpoints.HandsetPortrait`, `Breakpoints.HandsetLandscape` etc.

**BreakpointObserver Methoden:**
- `observe(value: string | string[]): Observable<BreakpointState>` — Media-Query beobachten
- `isMatched(value: string | string[]): boolean` — Sofortiger Check

## Verwendungsbeispiel

```typescript
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map } from 'rxjs/operators';

@Component({
  template: `
    <mat-sidenav-container>
      <mat-sidenav [mode]="isHandset ? 'over' : 'side'"
                   [opened]="!isHandset">
        Navigation
      </mat-sidenav>
      <mat-sidenav-content>
        <ng-content></ng-content>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `
})
export class AppComponent {
  isHandset$ = this.breakpointObserver
    .observe(Breakpoints.Handset)
    .pipe(map(result => result.matches));

  constructor(private breakpointObserver: BreakpointObserver) {}
}
```

```typescript
// Mehrere Breakpoints gleichzeitig beobachten
this.breakpointObserver
  .observe([Breakpoints.Small, Breakpoints.Medium])
  .subscribe(result => {
    const breakpoints = result.breakpoints;
    if (breakpoints[Breakpoints.Small]) {
      console.log('Small-Screen aktiv');
    }
    if (breakpoints[Breakpoints.Medium]) {
      console.log('Medium-Screen aktiv');
    }
  });
```

```typescript
// Benutzerdefinierte Media-Query
this.breakpointObserver
  .observe('(min-width: 500px) and (orientation: portrait)')
  .subscribe(result => {
    this.isPortraitMedium = result.matches;
  });
```

## Besonderheiten

- `BreakpointObserver.observe()` emittiert sofort den aktuellen Status und dann bei jeder Änderung.
- Mehrere Queries können als Array übergeben werden — `result.breakpoints` enthält dann den Status jeder einzelnen Query.
- `MediaMatcher` kümmert sich um SSR-Kompatibilität (gibt ein Mock-`MediaQueryList` zurück, wenn kein Browser vorhanden ist).
- Die vordefinierten `Breakpoints` basieren auf Material Design-Breakpoints.
