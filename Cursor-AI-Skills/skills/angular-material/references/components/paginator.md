# Paginator

**Kategorie:** Data Table
**Selector:** `<mat-paginator>`
**Import:** `MatPaginatorModule` from `@angular/material/paginator`; Standalone: `MatPaginator`
**URL:** https://material.angular.dev/components/paginator/overview

## Übersicht

Navigation durch paginierte Daten. Zeigt aktuelle Seite, Gesamtanzahl und optionale Seitengrößen-Auswahl. Gibt `PageEvent`-Ereignisse aus. Häufig mit `mat-table` kombiniert.

## Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `length` | `number` | Gesamtanzahl Einträge |
| `pageSize` | `number` | Einträge pro Seite (Standard: 50) |
| `pageIndex` | `number` | Aktuelle Seite (0-basiert) |
| `pageSizeOptions` | `number[]` | Auswählbare Seitengrößen |
| `showFirstLastButtons` | `boolean` | Erste/Letzte-Seite-Buttons |
| `hidePageSize` | `boolean` | Seitengröße-Auswahl ausblenden |
| `disabled` | `boolean` | Deaktivieren |
| `color` | `ThemePalette` | Theme-Farbe (nur M2) |

## Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `page` | `EventEmitter<PageEvent>` | Seite oder Seitengröße geändert |

## Methoden

| Methode | Beschreibung |
|---------|-------------|
| `nextPage()` | Nächste Seite |
| `previousPage()` | Vorherige Seite |
| `firstPage()` | Erste Seite |
| `lastPage()` | Letzte Seite |
| `hasNextPage()` | Nächste Seite vorhanden? |
| `hasPreviousPage()` | Vorherige Seite vorhanden? |
| `getNumberOfPages()` | Gesamtanzahl Seiten |

## Verwendungsbeispiel

```html
<mat-paginator [length]="totalItems"
               [pageSize]="pageSize"
               [pageSizeOptions]="[5, 10, 25, 50]"
               [showFirstLastButtons]="true"
               (page)="onPageChange($event)"
               aria-label="Seitenauswahl">
</mat-paginator>
```

## Besonderheiten / Gotchas

- `MAT_PAGINATOR_DEFAULT_OPTIONS` für applikationsweite Defaults
- Lokalisierung der Beschriftungen über `MatPaginatorIntl`-Provider
- `MatPaginatorIntl` per Provider ersetzen für vollständige Lokalisierung (Beschriftungen, `getRangeLabel`-Funktion)

## Lokalisierung — `MatPaginatorIntl`

Überschreibe den `MatPaginatorIntl`-Service für eigene Beschriftungen:

```typescript
import { MatPaginatorIntl } from '@angular/material/paginator';
import { Injectable } from '@angular/core';

@Injectable()
export class CustomPaginatorIntl extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Einträge pro Seite:';
  override nextPageLabel = 'Nächste Seite';
  override previousPageLabel = 'Vorherige Seite';
  override firstPageLabel = 'Erste Seite';
  override lastPageLabel = 'Letzte Seite';

  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0) return 'Keine Einträge';
    const start = page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, length);
    return `${start} – ${end} von ${length}`;
  };
}

// In providers:
providers: [{ provide: MatPaginatorIntl, useClass: CustomPaginatorIntl }]
```
