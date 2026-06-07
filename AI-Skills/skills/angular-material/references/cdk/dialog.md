# Dialog

**Kategorie:** Components
**Import:** `DialogModule` from `@angular/cdk/dialog`
**URL:** https://material.angular.dev/cdk/dialog/overview

## Übersicht

Das `dialog`-Paket bietet eine vollständige Implementierung für modale Dialoge ohne visuelles Styling. Es basiert auf dem Overlay-CDK und integriert Barrierefreiheit-Features wie Fokus-Trapping und ARIA-Attribute. Der `Dialog`-Service ermöglicht das programmgesteuerte Öffnen von Dialogen mit Komponenten oder Templates als Inhalt. Die `DialogRef` stellt eine Referenz auf den geöffneten Dialog bereit und ermöglicht das Schließen mit einem Rückgabewert.

## Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `DialogModule` | NgModule | Haupt-Modul |
| `Dialog` | Service | Öffnet und verwaltet Dialoge |
| `DialogRef<R, C>` | Klasse | Referenz auf einen geöffneten Dialog |
| `DialogConfig<D>` | Interface | Konfigurationsoptionen |
| `DIALOG_DATA` | InjectionToken | Injektion von Dialog-Daten |
| `CdkDialogContainer` | Komponente | Interner Dialog-Container |

**Dialog Service Methoden:**
- `open<R, D, C>(component, config?): DialogRef<R, C>` — Dialog öffnen
- `closeAll()` — Alle Dialoge schließen
- `getDialogById(id): DialogRef | undefined` — Dialog per ID finden
- `afterOpened: Subject<DialogRef>` — Emittiert beim Öffnen
- `afterAllClosed: Observable<void>` — Emittiert wenn alle Dialoge geschlossen

**DialogConfig Optionen:**
- `id, data, injector, viewContainerRef`
- `width, height, minWidth, minHeight, maxWidth, maxHeight`
- `hasBackdrop, backdropClass, panelClass`
- `positionStrategy, scrollStrategy`
- `disableClose, closeOnNavigation, closeOnDestroy`
- `ariaLabel, ariaDescribedBy, ariaLabelledBy, ariaModal`
- `role: 'dialog' | 'alertdialog'`

**DialogRef Methoden:**
- `close(result?)` — Dialog schließen mit optionalem Ergebnis
- `afterOpened(): Observable<void>` — Nach dem Öffnen
- `afterClosed(): Observable<R>` — Nach dem Schließen (mit Ergebnis)
- `backdropClick(): Observable<MouseEvent>` — Klick auf Backdrop
- `updatePosition(position?)` — Position aktualisieren
- `updateSize(width?, height?)` — Größe aktualisieren

## Verwendungsbeispiel

```typescript
import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

// Dialog-Komponente
@Component({
  template: `
    <h2>{{ data.title }}</h2>
    <p>{{ data.message }}</p>
    <button (click)="confirm()">Bestätigen</button>
    <button (click)="cancel()">Abbrechen</button>
  `
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: DialogRef<boolean>,
    @Inject(DIALOG_DATA) public data: { title: string; message: string }
  ) {}

  confirm() { this.dialogRef.close(true); }
  cancel() { this.dialogRef.close(false); }
}

// Dialog öffnen
@Component({ ... })
export class ParentComponent {
  constructor(private dialog: Dialog) {}

  openDialog() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { title: 'Bestätigung', message: 'Wirklich löschen?' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Bestätigt!');
      }
    });
  }
}
```

## Besonderheiten

- Das CDK Dialog-Modul ist **kein Ersatz für `MatDialog`**, sondern die unstyled Basis dafür.
- `MatDialog` von Angular Material baut auf diesem CDK auf und ergänzt Material Design Styling.
- Fokus wird automatisch in den Dialog gesperrt (via `cdkTrapFocus`) und beim Schließen zurückgegeben.
- ARIA-Attribute (`aria-modal`, `role="dialog"`) werden automatisch gesetzt.
- `disableClose: true` verhindert das Schließen per Escape-Taste oder Backdrop-Klick.
