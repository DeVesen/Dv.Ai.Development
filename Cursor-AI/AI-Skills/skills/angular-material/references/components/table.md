# Table

**Kategorie:** Data Table
**Selector:** `<mat-table>`, `table[mat-table]`
**Import:** `MatTableModule` from `@angular/material/table`; Standalone: `MatTable`, `MatHeaderCellDef`, `MatCellDef`, `MatFooterCellDef`, `MatColumnDef`, `MatHeaderRowDef`, `MatRowDef`, `MatFooterRowDef`, `MatHeaderCell`, `MatCell`, `MatFooterCell`, `MatHeaderRow`, `MatRow`, `MatFooterRow`, `MatNoDataRow`, `MatTextColumn`
**URL:** https://material.angular.dev/components/table/overview

## Übersicht

Flexibles, datengebundenes Tabellen-Framework auf Basis des CDK-Table. Beliebige Datenquellen (Arrays, Observables, `MatTableDataSource`). `MatTableDataSource` bietet eingebaute Sortier-, Filter- und Paginierungsfunktionen. Sticky Header/Footer und Virtual Scrolling unterstützt.

## Wichtige Inputs — `<mat-table>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `dataSource` | `DataSource<T> \| T[] \| Observable<T[]>` | Datenquelle |
| `trackBy` | `TrackByFunction<T>` | Track-By für Performance |
| `multiTemplateDataRows` | `boolean` | Mehrere Zeilen pro Datensatz |
| `fixedLayout` | `boolean` | Für Sticky-Spalten erforderlich |

## Wichtige Direktiven

| Direktive | Selektor | Beschreibung |
|-----------|---------|-------------|
| `MatColumnDef` | `[matColumnDef]` | Spaltendefinition |
| `MatHeaderCellDef` | `[matHeaderCellDef]` | Header-Zellen-Template |
| `MatCellDef` | `[matCellDef]` | Daten-Zellen-Template |
| `MatHeaderRowDef` | `[matHeaderRowDef]` | Header-Zeilen-Template |
| `MatRowDef` | `[matRowDef]` | Daten-Zeilen-Template |
| `MatFooterRowDef` | `[matFooterRowDef]` | Footer-Zeilen-Template |
| `MatNoDataRow` | `[matNoDataRow]` | Zeile wenn keine Daten |

## Verwendungsbeispiel

```html
<table mat-table [dataSource]="dataSource" matSort>
  <ng-container matColumnDef="name">
    <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
    <td mat-cell *matCellDef="let element">{{ element.name }}</td>
    <td mat-footer-cell *matFooterCellDef>Gesamt</td>
  </ng-container>

  <ng-container matColumnDef="price">
    <th mat-header-cell *matHeaderCellDef>Preis</th>
    <td mat-cell *matCellDef="let element">{{ element.price | currency }}</td>
  </ng-container>

  <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
  <tr mat-row *matRowDef="let row; columns: displayedColumns;" (click)="selectRow(row)"></tr>
  <tr mat-footer-row *matFooterRowDef="displayedColumns; sticky: true"></tr>
  <tr matNoDataRow>
    <td class="mat-cell" [attr.colspan]="displayedColumns.length">Keine Einträge</td>
  </tr>
</table>
<mat-paginator [pageSizeOptions]="[10, 25, 50]"></mat-paginator>
```

```typescript
@ViewChild(MatSort) sort!: MatSort;
@ViewChild(MatPaginator) paginator!: MatPaginator;

ngAfterViewInit() {
  this.dataSource.sort = this.sort;
  this.dataSource.paginator = this.paginator;
}

applyFilter(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  this.dataSource.filter = value.trim().toLowerCase();
}
```

## MatTableDataSource API

| Property/Methode | Typ | Beschreibung |
|-----------------|-----|-------------|
| `data: T[]` | `T[]` | Rohdaten |
| `filter: string` | `string` | Aktiver Filterstring |
| `filteredData: T[]` | readonly | Gefilterte Daten |
| `sort: MatSort \| null` | property | Verknüpfte Sort-Direktive |
| `paginator: MatPaginator \| null` | property | Verknüpfter Paginator |
| `filterPredicate: (data: T, filter: string) => boolean` | Funktion | Eigene Filterlogik (überschreibbar) |
| `sortingDataAccessor: (data: T, sortHeaderId: string) => string \| number` | Funktion | Spalten-Wert für Sortierung |
| `sortData: (data: T[], sort: MatSort) => T[]` | Funktion | Vollständige Sortierlogik überschreiben |

### Beispiel: Eigener `filterPredicate`

```typescript
this.dataSource.filterPredicate = (data: MyRow, filter: string) => {
  const search = filter.toLowerCase();
  return data.name.toLowerCase().includes(search)
      || data.description.toLowerCase().includes(search);
};

// Filter anwenden
this.dataSource.filter = searchInput.value.trim().toLowerCase();
```

### Beispiel: Eigener `sortingDataAccessor`

```typescript
this.dataSource.sortingDataAccessor = (data: MyRow, sortHeaderId: string) => {
  switch (sortHeaderId) {
    case 'date': return new Date(data.dateString).getTime();
    default: return (data as any)[sortHeaderId];
  }
};
```

## Besonderheiten / Gotchas

- `MatTableDataSource` hat eingebaute `filter`-, `sort`-, `paginator`-Properties; `filterPredicate` und `sortingDataAccessor` sind für eigene Logik überschreibbar
- Sticky-Spalten: `[sticky]="true"` auf `MatColumnDef`; `fixedLayout="true"` auf Tabelle
- HTML-`<table>` Syntax: `<table mat-table>` statt `<mat-table>`
