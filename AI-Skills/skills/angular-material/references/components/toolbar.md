# Toolbar

**Kategorie:** Navigation
**Selector:** `<mat-toolbar>`, `<mat-toolbar-row>`
**Import:** `MatToolbarModule` from `@angular/material/toolbar`; Standalone: `MatToolbar`, `MatToolbarRow`
**URL:** https://material.angular.dev/components/toolbar/overview

## Übersicht

Horizontaler Behälter für Titel, Buttons und Navigationselemente, typischerweise am oberen Rand einer Seite. Mehrere `<mat-toolbar-row>`-Elemente ermöglichen mehrzeilige Toolbars. Kein eigenes Navigationsverhalten.

## Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `color` | `string \| null` | Theme-Farbe (nur M2: `primary`, `accent`, `warn`) |

## Verwendungsbeispiel

```html
<!-- Einzeilige Toolbar -->
<mat-toolbar color="primary">
  <button mat-icon-button (click)="sidenav.toggle()">
    <mat-icon>menu</mat-icon>
  </button>
  <span>Meine Anwendung</span>
  <span class="spacer"></span>
  <button mat-icon-button><mat-icon>account_circle</mat-icon></button>
</mat-toolbar>

<!-- Mehrzeilige Toolbar -->
<mat-toolbar>
  <mat-toolbar-row><span>Zeile 1</span></mat-toolbar-row>
  <mat-toolbar-row><span>Zeile 2</span></mat-toolbar-row>
</mat-toolbar>
```

## CSS Custom Properties / Theming

M3: Kein `color`-Input-Support; Theming via Token-System.

## Besonderheiten / Gotchas

- `color`-Input funktioniert nur in M2-Themes
- Direkter Inhalt und `<mat-toolbar-row>` nicht mischen
- Spacer-Pattern: `.spacer { flex: 1 1 auto; }` für Rechts-Ausrichtung
