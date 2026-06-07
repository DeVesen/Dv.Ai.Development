# Table

**Kategorie:** Components
**Import:** `CdkTableModule` from `@angular/cdk/table`
**URL:** https://material.angular.dev/cdk/table/overview

## Übersicht

Das `table`-Paket bietet eine flexible, unstyled Datentabellen-Komponente. Die `cdk-table`-Komponente unterstützt sowohl native HTML-Tabellen (`<table>`) als auch CSS-Flex-basierte Tabellen und ist hochgradig anpassbar durch Spalten- und Zeilen-Definitionen via Templates. Es unterstützt Sticky-Spalten und -Zeilen, mehrere Zeilen pro Datenelement sowie verschiedene Datenquellen (Arrays, Observables, DataSource). Angular Materials `MatTable` baut direkt auf diesem CDK auf.

## Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `CdkTableModule` | NgModule | Haupt-Modul |
| `CdkTable<T>` | Komponente | Tabellen-Container; Selector: `cdk-table`, `table[cdk-table]` |
| `CdkColumnDef` | Direktive | Spalten-Definition; Selector: `[cdkColumnDef]` |
| `CdkHeaderCellDef` | Direktive | Header-Zelle; Selector: `[cdkHeaderCellDef]` |
| `CdkCellDef` | Direktive | Daten-Zelle; Selector: `[cdkCellDef]` |
| `CdkFooterCellDef` | Direktive | Footer-Zelle; Selector: `[cdkFooterCellDef]` |
| `CdkHeaderRowDef` | Direktive | Header-Zeile; Selector: `[cdkHeaderRowDef]` |
| `CdkRowDef<T>` | Direktive | Daten-Zeile; Selector: `[cdkRowDef]` |
| `CdkFooterRowDef` | Direktive | Footer-Zeile; Selector: `[cdkFooterRowDef]` |
| `CdkHeaderRow` | Komponente | Gerenderter Header-Zeilen-Container |
| `CdkRow` | Komponente | Gerenderter Daten-Zeilen-Container |
| `CdkNoDataRow` | Direktive | Anzeige bei leeren Daten |
| `CdkTextColumn<T>` | Komponente | Einfache Text-Spalte |
| `DataSource<T>` | Abstrakte Klasse | Re-Export aus collections |

**CdkTable Inputs:**
- `dataSource: T[] | Observable<T[]> | DataSource<T>` — Datenquelle
- `trackBy: TrackByFunction<T>` — Identifikation für Change Detection
- `multiTemplateDataRows: boolean` — Mehrere Zeilen pro Datenelement
- `fixedLayout: boolean` — Feste Spaltenbreiten (Performance für Sticky)
- `recycleRows: boolean` — View-Recycling für bessere Performance

**CdkTable Outputs:**
- `contentChanged: EventEmitter<void>` — Nach dem Rendern

**CdkHeaderRowDef / CdkRowDef Inputs:**
- `columns: string[]` — Anzuzeigende Spalten-IDs
- `sticky: boolean` — Sticky-Positionierung (nur Header/Footer)
- `when: (index: number, rowData: T) => boolean` — Bedingte Zeilenauswahl

## Verwendungsbeispiel

```typescript
export interface Person {
  name: string;
  age: number;
  email: string;
}

@Component({
  template: `
    <table cdk-table [dataSource]="people">
      <!-- Name-Spalte -->
      <ng-container cdkColumnDef="name">
        <th cdk-header-cell *cdkHeaderCellDef>Name</th>
        <td cdk-cell *cdkCellDef="let row">{{ row.name }}</td>
      </ng-container>

      <!-- Alter-Spalte -->
      <ng-container cdkColumnDef="age">
        <th cdk-header-cell *cdkHeaderCellDef>Alter</th>
        <td cdk-cell *cdkCellDef="let row">{{ row.age }}</td>
      </ng-container>

      <!-- E-Mail-Spalte -->
      <ng-container cdkColumnDef="email">
        <th cdk-header-cell *cdkHeaderCellDef>E-Mail</th>
        <td cdk-cell *cdkCellDef="let row">{{ row.email }}</td>
      </ng-container>

      <!-- Zeilen-Definitionen -->
      <tr cdk-header-row *cdkHeaderRowDef="displayedColumns; sticky: true"></tr>
      <tr cdk-row *cdkRowDef="let row; columns: displayedColumns;"></tr>
      <tr cdk-no-data-row>
        <td>Keine Daten vorhanden</td>
      </tr>
    </table>
  `
})
export class DataTableComponent {
  displayedColumns = ['name', 'age', 'email'];
  people: Person[] = [
    { name: 'Alice', age: 30, email: 'alice@example.com' },
    { name: 'Bob', age: 25, email: 'bob@example.com' }
  ];
}
```

## Besonderheiten

- Unterstützt sowohl `<table cdk-table>` (natives HTML-Table-Rendering) als auch `<cdk-table>` (Flex-basiertes Rendering).
- **Sticky-Columns**: `[sticky]` für die erste Spalte, `[stickyEnd]` für die letzte Spalte.
- `fixedLayout: true` ist für Sticky-Columns empfohlen — verbessert Performance durch festes Layout.
- `recycleRows: true` verbessert Scroll-Performance, ist aber inkompatibel mit Zeilen-Animationen.
- Mehrere `CdkRowDef` mit unterschiedlichen `when`-Prädikaten ermöglichen verschiedene Zeilen-Templates für dasselbe Datenelement.
- `DataSource` als Klasse bietet mehr Kontrolle über Daten-Streams als ein einfaches Array.
