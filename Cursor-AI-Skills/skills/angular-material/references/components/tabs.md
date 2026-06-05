# Tabs

**Kategorie:** Layout
**Selector:** `<mat-tab-group>`, `<mat-tab>`, `<mat-tab-nav-bar>`, `<mat-tab-link>`
**Import:** `MatTabsModule` from `@angular/material/tabs`; Standalone: `MatTabGroup`, `MatTab`, `MatTabLabel`, `MatTabContent`, `MatTabNav`, `MatTabNavPanel`, `MatTabLink`
**URL:** https://material.angular.dev/components/tabs/overview

## Übersicht

Tabs organisieren Inhalte in mehrere Bereiche, von denen jeweils einer sichtbar ist. `<mat-tab-group>` mit Panel-Inhalt. `<mat-tab-nav-bar>` für tab-artige Navigation mit Links (Router-Integration). Lazy-Loading und Scrolling bei vielen Tabs unterstützt.

## Wichtige Inputs — `<mat-tab-group>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `selectedIndex` | `number \| null` | Aktiver Tab-Index |
| `headerPosition` | `'above' \| 'below'` | Header-Position |
| `animationDuration` | `string \| number` | Animations-Dauer |
| `dynamicHeight` | `boolean` | Höhe an aktiven Tab anpassen |
| `stretchTabs` | `boolean` | Tabs auf volle Breite strecken |
| `disablePagination` | `boolean` | Paginierung bei vielen Tabs deaktivieren |
| `disableRipple` | `boolean` | Ripple deaktivieren |
| `preserveContent` | `boolean` | Inhalte nicht aus DOM entfernen |

## Wichtige Inputs — `<mat-tab>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `label` | `string` | Text-Label |
| `disabled` | `boolean` | Tab deaktivieren |
| `aria-label` | `string` | ARIA-Label |
| `labelClass` | `string \| string[]` | CSS-Klassen für Label |
| `bodyClass` | `string \| string[]` | CSS-Klassen für Body |

## Wichtige Outputs — `<mat-tab-group>`

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `selectedTabChange` | `EventEmitter<MatTabChangeEvent>` | Tab gewechselt |
| `selectedIndexChange` | `EventEmitter<number>` | Two-Way für selectedIndex |
| `focusChange` | `EventEmitter<MatTabChangeEvent>` | Fokus gewechselt |
| `animationDone` | `EventEmitter<void>` | Animation abgeschlossen |

## Verwendungsbeispiel

```html
<mat-tab-group [(selectedIndex)]="activeTab">
  <mat-tab label="Übersicht">
    <p>Übersichtsinhalt...</p>
  </mat-tab>
  <mat-tab>
    <ng-template mat-tab-label>
      <mat-icon>settings</mat-icon> Einstellungen
    </ng-template>
    <ng-template matTabContent>
      <!-- Lazy-geladen -->
      <app-settings></app-settings>
    </ng-template>
  </mat-tab>
</mat-tab-group>
```

## Navigation-Tabs — `mat-tab-nav-bar` (Router-Integration)

Für Tab-artige Navigation mit Angular Router — kein `selectedIndex`, stattdessen `active`-Property auf dem Link.

```html
<!-- component.html -->
<nav mat-tab-nav-bar [tabPanel]="tabPanel">
  <a mat-tab-link
     *ngFor="let link of navLinks"
     [routerLink]="link.path"
     routerLinkActive
     #rla="routerLinkActive"
     [active]="rla.isActive">
    {{ link.label }}
  </a>
</nav>
<mat-tab-nav-panel #tabPanel>
  <router-outlet></router-outlet>
</mat-tab-nav-panel>
```

```typescript
navLinks = [
  { path: '/tab1', label: 'Tab 1' },
  { path: '/tab2', label: 'Tab 2' },
  { path: '/tab3', label: 'Tab 3' },
];
```

**Inputs auf `<nav mat-tab-nav-bar>`:** `tabPanel` (Pflicht für Accessibility), `animationDuration`, `disableRipple`, `stretchTabs`.
**Input auf `<a mat-tab-link>`:** `active: boolean`, `disabled: boolean`.

## Besonderheiten / Gotchas

- `<ng-template matTabContent>` aktiviert Lazy-Loading
- `<ng-template mat-tab-label>` für Rich-Content-Labels (Icons, Badges)
- `preserveContent: true` hält alle Inhalte im DOM — gut für Formulare die Zustand behalten
