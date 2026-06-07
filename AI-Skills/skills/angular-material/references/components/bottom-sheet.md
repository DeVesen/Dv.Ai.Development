# Bottom Sheet

**Kategorie:** Popups & Modals
**Selector:** Kein Template-Selektor — via Service geöffnet
**Import:** `MatBottomSheetModule` from `@angular/material/bottom-sheet`; Standalone: `MatBottomSheet` (Service)
**URL:** https://material.angular.dev/components/bottom-sheet/overview

## Übersicht

Panel das von unten in den Bildschirm gleitet — für mobile-freundliche Aktionslisten. Wird via `MatBottomSheet`-Service geöffnet. Datenübergabe über `MAT_BOTTOM_SHEET_DATA`.

## Öffnen via Service

```typescript
constructor(private bottomSheet: MatBottomSheet) {}

open(): void {
  const ref = this.bottomSheet.open(MyBottomSheetComponent, {
    data: { items: this.items }
  });
  ref.afterDismissed().subscribe(result => console.log(result));
}
```

## Konfigurationsoptionen (`MatBottomSheetConfig`)

| Option | Typ | Beschreibung |
|--------|-----|-------------|
| `data` | `any` | Daten für Komponente |
| `hasBackdrop` | `boolean` | Backdrop (Standard: true) |
| `disableClose` | `boolean` | Schließen verhindern |
| `panelClass` | `string \| string[]` | CSS-Klassen |
| `backdropClass` | `string` | Backdrop CSS-Klasse |
| `direction` | `Direction` | Text-Richtung |
| `closeOnNavigation` | `boolean` | Bei Navigation schließen |
| `autoFocus` | `AutoFocusTarget \| string \| boolean` | Fokus beim Öffnen |
| `restoreFocus` | `boolean` | Fokus nach Schließen |
| `height` | `string` | Panel-Höhe |

## `MatBottomSheetRef`-Methoden

| Methode | Beschreibung |
|---------|-------------|
| `dismiss(result?)` | Schließen |
| `afterDismissed()` | Observable: nach Schließen |
| `afterOpened()` | Observable: nach Öffnen |
| `backdropClick()` | Observable: Backdrop-Klick |

## Verwendungsbeispiel

```typescript
@Component({
  template: `
    <mat-nav-list>
      @for (item of data.items; track item) {
        <mat-list-item (click)="select(item)">{{ item.label }}</mat-list-item>
      }
    </mat-nav-list>
  `
})
export class BottomSheetContent {
  constructor(
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: any,
    private ref: MatBottomSheetRef
  ) {}
  select(item: any) { this.ref.dismiss(item); }
}
```

## Besonderheiten / Gotchas

- `MAT_BOTTOM_SHEET_DATA` injizieren um Daten zu empfangen
- `MAT_BOTTOM_SHEET_DEFAULT_OPTIONS` für applikationsweite Defaults
