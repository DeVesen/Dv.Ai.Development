# Sidenav / Drawer

**Kategorie:** Navigation
**Selector:** `<mat-sidenav-container>`, `<mat-sidenav>`, `<mat-sidenav-content>` / `<mat-drawer-container>`, `<mat-drawer>`, `<mat-drawer-content>`
**Import:** `MatSidenavModule` from `@angular/material/sidenav`; Standalone: `MatSidenav`, `MatSidenavContainer`, `MatSidenavContent`, `MatDrawer`, `MatDrawerContainer`, `MatDrawerContent`
**URL:** https://material.angular.dev/components/sidenav/overview

## Übersicht

Seitliches Navigations-Panel neben dem Hauptinhalt. `MatSidenav` erweitert `MatDrawer` mit Viewport-fixierter Positionierung. Drei Modi: `over` (schwebend), `push` (schiebt Inhalt), `side` (nebeneinander).

## Wichtige Inputs — `<mat-drawer>` / `<mat-sidenav>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `mode` | `'over' \| 'push' \| 'side'` | Anzeigemodus |
| `position` | `'start' \| 'end'` | Seite des Drawers |
| `opened` | `boolean` | Öffnungszustand |
| `disableClose` | `boolean` | Schließen via Escape/Backdrop verhindern |
| `autoFocus` | `AutoFocusTarget \| string \| boolean` | Fokus beim Öffnen |
| `fixedInViewport` | `boolean` | Viewport-fixiert (nur `MatSidenav`) |
| `fixedTopGap` | `number` | Abstand oben (fixierter Modus) |
| `fixedBottomGap` | `number` | Abstand unten (fixierter Modus) |

## Wichtige Inputs — `<mat-drawer-container>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `autosize` | `boolean` | Größe bei Drawer-Änderung anpassen |
| `hasBackdrop` | `boolean` | Backdrop anzeigen |

## Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `openedChange` | `EventEmitter<boolean>` | Öffnungszustand geändert |
| `opened` | `Observable<void>` | Drawer geöffnet |
| `closed` | `Observable<void>` | Drawer geschlossen |
| `backdropClick` | `EventEmitter<void>` | Backdrop geklickt (Container) |

## Verwendungsbeispiel

```html
<mat-sidenav-container>
  <mat-sidenav #sidenav mode="side" opened>
    <mat-nav-list>
      <a mat-list-item routerLink="/dashboard">Dashboard</a>
      <a mat-list-item routerLink="/settings">Einstellungen</a>
    </mat-nav-list>
  </mat-sidenav>

  <mat-sidenav-content>
    <button mat-icon-button (click)="sidenav.toggle()">
      <mat-icon>menu</mat-icon>
    </button>
    <router-outlet></router-outlet>
  </mat-sidenav-content>
</mat-sidenav-container>
```

## Responsives Muster (mobile `over` / desktop `side`)

```typescript
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, ViewChild, inject } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';

@Component({ ... })
export class AppComponent {
  @ViewChild(MatSidenav) sidenav!: MatSidenav;
  private breakpoint = inject(BreakpointObserver);

  isHandset$ = this.breakpoint.observe([Breakpoints.Handset]);

  ngAfterViewInit() {
    this.isHandset$.subscribe(state => {
      this.sidenav.mode = state.matches ? 'over' : 'side';
      this.sidenav.opened = !state.matches;
    });
  }
}
```

```html
<mat-sidenav-container>
  <mat-sidenav #sidenav>
    <!-- Navigation -->
  </mat-sidenav>
  <mat-sidenav-content>
    <button mat-icon-button (click)="sidenav.toggle()"
            *ngIf="(isHandset$ | async)?.matches">
      <mat-icon>menu</mat-icon>
    </button>
    <router-outlet></router-outlet>
  </mat-sidenav-content>
</mat-sidenav-container>
```

## Besonderheiten / Gotchas

- `side`-Modus verschiebt den Inhalt; `over`-Modus liegt darüber
- Methoden: `open()`, `close()`, `toggle()` — geben `Promise<MatDrawerToggleResult>` zurück
- `fixedInViewport` benötigt `position: fixed` auf Container oder Elternelement
