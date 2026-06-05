# List

**Kategorie:** Layout
**Selector:** `<mat-list>`, `<mat-nav-list>`, `<mat-selection-list>`, `mat-list-item`, `<mat-list-option>`
**Import:** `MatListModule` from `@angular/material/list`; Standalone: `MatList`, `MatNavList`, `MatSelectionList`, `MatListItem`, `MatListOption`
**URL:** https://material.angular.dev/components/list/overview

## Übersicht

Drei Listentypen: `<mat-list>` (Inhalt), `<mat-nav-list>` (Navigation mit klickbaren Elementen), `<mat-selection-list>` (Checkboxen, Mehrfachauswahl). Einträge können ein-, zwei- oder dreizeilig sein (via `matListItemTitle`, `matListItemLine`, `matListItemMeta`).

## Wichtige Inputs — `<mat-selection-list>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `multiple` | `boolean` | Mehrfachauswahl (Standard: true) |
| `disabled` | `boolean` | Gesamte Liste deaktivieren |
| `hideSingleSelectionIndicator` | `boolean` | Radio-Indikator bei Einzelauswahl ausblenden |
| `compareWith` | `(o1: any, o2: any) => boolean` | Vergleichsfunktion |

## Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `selectionChange` | `EventEmitter<MatSelectionListChange>` | Auswahl geändert |

## Verwendungsbeispiel

```html
<!-- Einfache Liste -->
<mat-list>
  <mat-list-item>
    <mat-icon matListItemIcon>folder</mat-icon>
    <span matListItemTitle>Dokumente</span>
    <span matListItemLine>Zuletzt geändert vor 2 Stunden</span>
  </mat-list-item>
</mat-list>

<!-- Auswahl-Liste -->
<mat-selection-list [(ngModel)]="selectedItems">
  <mat-list-option value="item1">Option 1</mat-list-option>
  <mat-list-option value="item2">Option 2</mat-list-option>
</mat-selection-list>

<!-- Navigations-Liste -->
<mat-nav-list>
  <a mat-list-item routerLink="/home" [activated]="isActive('/home')">
    <mat-icon matListItemIcon>home</mat-icon>
    <span matListItemTitle>Startseite</span>
  </a>
</mat-nav-list>
```

## Besonderheiten / Gotchas

- `selectAll()` und `deselectAll()` als Methoden von `MatSelectionList`
- `matListItemTitle`, `matListItemLine`, `matListItemMeta`, `matListItemIcon` sind Direktiven auf Kindelementen
