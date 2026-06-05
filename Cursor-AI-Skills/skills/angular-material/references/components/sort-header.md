# Sort Header

**Kategorie:** Data Table
**Selector:** `[matSort]`, `[mat-sort-header]`
**Import:** `MatSortModule` from `@angular/material/sort`; Standalone: `MatSort`, `MatSortHeader`
**URL:** https://material.angular.dev/components/sort/overview

## Übersicht

`[matSort]` auf der Tabelle verwaltet den Sortierstatus. `[mat-sort-header]` auf Header-Zellen macht diese klickbar. Klick wechselt zwischen aufsteigend, absteigend und (optional) zurückgesetzt.

## Wichtige Inputs — `[matSort]`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `matSortActive` | `string` | Aktiv sortierte Spalten-ID |
| `matSortDirection` | `SortDirection` | Aktuelle Sortierrichtung |
| `matSortStart` | `SortDirection` | Initiale Richtung |
| `matSortDisableClear` | `boolean` | Zurücksetzen verhindern |
| `matSortDisabled` | `boolean` | Sortierung deaktivieren |

## Wichtige Inputs — `[mat-sort-header]`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `mat-sort-header` | `string` | Spalten-ID |
| `arrowPosition` | `'before' \| 'after'` | Pfeil-Position |
| `start` | `SortDirection` | Erste Richtung für diese Spalte |
| `disabled` | `boolean` | Sortierung für diese Spalte deaktivieren |
| `disableClear` | `boolean` | Zurücksetzen für diese Spalte verhindern |
| `sortActionDescription` | `string` | ARIA-Beschreibung |

## Wichtige Outputs — `[matSort]`

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `matSortChange` | `EventEmitter<Sort>` | Sortierstatus geändert |

## Verwendungsbeispiel

```html
<table mat-table [dataSource]="dataSource" matSort (matSortChange)="sortData($event)">
  <ng-container matColumnDef="name">
    <th mat-header-cell *matHeaderCellDef mat-sort-header="name">Name</th>
    <td mat-cell *matCellDef="let row">{{ row.name }}</td>
  </ng-container>
  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
  <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
</table>
```

## Besonderheiten / Gotchas

- `MatTableDataSource` mit eingebauter Sortierung: `dataSource.sort = this.sort`
- `SortDirection` ist `'asc' | 'desc' | ''`
