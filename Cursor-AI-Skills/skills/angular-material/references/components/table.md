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
  <tr class="mat-row" *matNoDataRow>
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

## Besonderheiten / Gotchas

- `MatTableDataSource` hat eingebaute `filter`-, `sort`-, `paginator`-Properties
- Sticky-Spalten: `[sticky]="true"` auf `MatColumnDef`; `fixedLayout="true"` auf Tabelle
- HTML-`<table>` Syntax: `<table mat-table>` statt `<mat-table>`
