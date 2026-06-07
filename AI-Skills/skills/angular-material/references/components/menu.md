# Menu

**Kategorie:** Navigation
**Selector:** `<mat-menu>`, `[mat-menu-item]`, `[matMenuTriggerFor]`
**Import:** `MatMenuModule` from `@angular/material/menu`; Standalone: `MatMenu`, `MatMenuItem`, `MatMenuTrigger`
**URL:** https://material.angular.dev/components/menu/overview

## Übersicht

Kontextbezogene Aktionslisten in einem Overlay-Panel. Besteht aus `<mat-menu>`-Panel mit `[mat-menu-item]`-Einträgen und dem `[matMenuTriggerFor]`-Trigger. Untermenüs durch `[matMenuTriggerFor]` auf einem `mat-menu-item`. Unterstützt Tastaturnavigation, Icons, Badges und Divider.

## Wichtige Inputs — `<mat-menu>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `xPosition` | `'before' \| 'after'` | Horizontale Positionierung |
| `yPosition` | `'above' \| 'below'` | Vertikale Positionierung |
| `overlapTrigger` | `boolean` | Panel überlappt Trigger |
| `hasBackdrop` | `boolean` | Backdrop anzeigen |
| `backdropClass` | `string` | CSS-Klasse für Backdrop |
| `panelClass` | `string` | CSS-Klassen für Panel |

## Wichtige Inputs — `[mat-menu-item]`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `disabled` | `boolean` | Menüeintrag deaktivieren |
| `disableRipple` | `boolean` | Ripple deaktivieren |
| `role` | `'menuitem' \| 'menuitemradio' \| 'menuitemcheckbox'` | ARIA-Rolle |

## Wichtige Inputs/Outputs — `[matMenuTriggerFor]`

| Input/Output | Typ | Beschreibung |
|--------------|-----|-------------|
| `matMenuTriggerFor` | `MatMenu` (Input) | Verknüpftes Menü |
| `matMenuTriggerData` | `any` (Input) | Daten für Lazy-Content |
| `matMenuTriggerRestoreFocus` | `boolean` (Input) | Fokus nach Schließen |
| `menuOpened` | `EventEmitter` (Output) | Menü geöffnet |
| `menuClosed` | `EventEmitter` (Output) | Menü geschlossen |

## Verwendungsbeispiel

```html
<button mat-button [matMenuTriggerFor]="actionsMenu">
  Aktionen <mat-icon>arrow_drop_down</mat-icon>
</button>

<mat-menu #actionsMenu="matMenu">
  <button mat-menu-item (click)="edit()">
    <mat-icon>edit</mat-icon>
    <span>Bearbeiten</span>
  </button>
  <button mat-menu-item [matMenuTriggerFor]="exportMenu">
    <mat-icon>download</mat-icon>
    <span>Exportieren</span>
  </button>
  <button mat-menu-item disabled>Löschen</button>
</mat-menu>

<mat-menu #exportMenu="matMenu">
  <button mat-menu-item>CSV</button>
  <button mat-menu-item>PDF</button>
</mat-menu>
```

## Besonderheiten / Gotchas

- `<mat-menu>` wird als Template definiert und erst beim Öffnen ins DOM gerendert (Lazy)
- Icons in Einträgen: `<mat-icon>` vor dem `<span>` platzieren
- Untermenüs: `[matMenuTriggerFor]` auf `mat-menu-item` verwenden
