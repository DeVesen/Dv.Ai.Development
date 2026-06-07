# Dialog

**Kategorie:** Popups & Modals
**Selector:** Kein Template-Selektor — via Service geöffnet. Content-Direktiven: `[mat-dialog-title]`, `[mat-dialog-content]`, `[mat-dialog-actions]`, `[mat-dialog-close]`
**Import:** `MatDialogModule` from `@angular/material/dialog`; Standalone: `MatDialog` (Service), `MatDialogTitle`, `MatDialogContent`, `MatDialogActions`, `MatDialogClose`
**URL:** https://material.angular.dev/components/dialog/overview

## Übersicht

Service für modale Dialoge mit beliebigen Komponenten als Inhalt. Strukturelle Content-Direktiven geben Standard-Layout (fixierter Header/Footer, scrollbarer Inhalt). Datenübergabe via `MAT_DIALOG_DATA`.

## Konfigurationsoptionen (`MatDialogConfig`)

| Option | Typ | Beschreibung |
|--------|-----|-------------|
| `data` | `any` | Daten für Inhaltkomponente |
| `width` | `string` | Breite |
| `height` | `string` | Höhe |
| `minWidth/maxWidth` | `number \| string` | Min/Max-Breite |
| `disableClose` | `boolean` | Schließen verhindern |
| `hasBackdrop` | `boolean` | Backdrop anzeigen |
| `panelClass` | `string \| string[]` | CSS-Klassen |
| `position` | `DialogPosition` | Position: top, bottom, left, right |
| `role` | `DialogRole` | ARIA-Rolle: `'dialog'\|'alertdialog'` |
| `autoFocus` | `AutoFocusTarget \| string \| boolean` | Fokus beim Öffnen |
| `restoreFocus` | `boolean` | Fokus nach Schließen |
| `closeOnNavigation` | `boolean` | Bei Navigation schließen |
| `scrollStrategy` | `ScrollStrategy` | Scroll-Verhalten während Dialog offen |
| `id` | `string` | Dialog-ID für `getDialogById()` |
| `enterAnimationDuration` | `string \| number` | Öffnen-Animations-Dauer (z.B. `'150ms'`) |
| `exitAnimationDuration` | `string \| number` | Schließen-Animations-Dauer |
| `ariaLabelledBy` | `string` | ID des Elements das den Dialog benennt |
| `ariaDescribedBy` | `string` | ID des Elements das den Dialog beschreibt |
| `ariaModal` | `boolean` | ARIA-modal Attribut |
| `injector` | `Injector` | Benutzerdefinierter Injector |

## `MatDialogRef`-Methoden

| Methode | Beschreibung |
|---------|-------------|
| `close(result?)` | Schließen mit Ergebnis |
| `afterOpened()` | Observable: nach Öffnen |
| `afterClosed()` | Observable: nach Schließen (mit Ergebnis) |
| `backdropClick()` | Observable: Backdrop-Klick |
| `updatePosition(pos)` | Position aktualisieren |
| `updateSize(width, height)` | Größe aktualisieren |

## Verwendungsbeispiel

```typescript
const dialogRef = this.dialog.open(ConfirmDialogComponent, {
  width: '400px',
  data: { message: 'Möchten Sie wirklich löschen?' }
});
dialogRef.afterClosed().subscribe(result => {
  if (result) this.deleteItem();
});
```

```html
<h2 mat-dialog-title>Bestätigung</h2>
<mat-dialog-content>{{ data.message }}</mat-dialog-content>
<mat-dialog-actions align="end">
  <button mat-button mat-dialog-close>Abbrechen</button>
  <button mat-button [mat-dialog-close]="true" cdkFocusInitial>Löschen</button>
</mat-dialog-actions>
```

## MatDialog Service Properties

| Property/Methode | Beschreibung |
|-----------------|-------------|
| `openDialogs: MatDialogRef<any>[]` | Alle aktuell offenen Dialoge |
| `afterAllClosed: Observable<void>` | Observable: alle Dialoge geschlossen |
| `getDialogById(id: string)` | Dialog per ID suchen |
| `closeAll()` | Alle Dialoge schließen |

## Daten mit `inject()` (v14+, empfohlen)

```typescript
import { inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({ ... })
export class ConfirmDialogComponent {
  data = inject<{ message: string }>(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
}
```

## Besonderheiten / Gotchas

- `[mat-dialog-close]="true"` übergibt `true` an `afterClosed()`
- `cdkFocusInitial` auf primärem Aktions-Button: Best Practice für Accessibility
- `getDialogById(id)` und `closeAll()` als nützliche Service-Methoden
