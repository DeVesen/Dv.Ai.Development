# Snack Bar

**Kategorie:** Popups & Modals
**Selector:** Kein Template-Selektor — via Service geöffnet
**Import:** `MatSnackBarModule` from `@angular/material/snack-bar`; Standalone: `MatSnackBar` (Service)
**URL:** https://material.angular.dev/components/snack-bar/overview

## Übersicht

Kurze Benachrichtigungen am unteren Bildschirmrand. Einfache Text-Snackbars via `open()`. Komplexe Inhalte via `openFromComponent()`. Auto-Close nach konfigurierbarer Zeit.

## Service-Methoden

| Methode | Beschreibung |
|---------|-------------|
| `open(message, action?, config?)` | Text-Benachrichtigung |
| `openFromComponent(component, config?)` | Benutzerdefinierte Komponente |
| `openFromTemplate(template, config?)` | Template-basiert |
| `dismiss()` | Aktuelle schließen |

## Konfigurationsoptionen (`MatSnackBarConfig`)

| Option | Typ | Beschreibung |
|--------|-----|-------------|
| `duration` | `number` | Auto-Schließzeit ms (0 = nie) |
| `horizontalPosition` | `'start'\|'center'\|'end'\|'left'\|'right'` | Horizontale Position |
| `verticalPosition` | `'top' \| 'bottom'` | Vertikale Position |
| `panelClass` | `string \| string[]` | CSS-Klassen |
| `politeness` | `AriaLivePoliteness` | ARIA Live-Politeness |
| `data` | `any` | Daten für Custom-Komponente |

## `MatSnackBarRef`-Methoden

| Methode | Beschreibung |
|---------|-------------|
| `dismiss()` | Schließen |
| `afterOpened()` | Observable: nach Öffnen |
| `afterDismissed()` | Observable: nach Schließen |
| `onAction()` | Observable: Aktions-Klick |

## Verwendungsbeispiel

```typescript
const snackRef = this.snackBar.open('Gespeichert!', 'Rückgängig', {
  duration: 3000,
  horizontalPosition: 'center',
  verticalPosition: 'bottom'
});
snackRef.onAction().subscribe(() => this.undoSave());

// Mit CSS-Klasse für Fehler
this.snackBar.open('Fehler aufgetreten', '', {
  duration: 5000,
  panelClass: ['error-snackbar']
});
```

## Besonderheiten / Gotchas

- Nur eine Snack Bar gleichzeitig sichtbar — neue schließt die vorherige
- `MAT_SNACK_BAR_DEFAULT_OPTIONS` für applikationsweite Defaults
- `dismissedByAction: boolean` in `afterDismissed()` zeigt ob Aktions-Button geklickt
