# Clipboard

**Kategorie:** Common Behaviors
**Import:** `ClipboardModule` from `@angular/cdk/clipboard`
**URL:** https://material.angular.dev/cdk/clipboard/overview

## Übersicht

Das `clipboard`-Paket ermöglicht das Kopieren von Text in die Zwischenablage des Benutzers. Der `Clipboard`-Service bietet eine programmatische API zum Kopieren, während die `CdkCopyToClipboard`-Direktive eine deklarative Lösung für Buttons und andere interaktive Elemente darstellt. Für große Textmengen gibt es die `PendingCopy`-Klasse, die eine asynchrone Kopier-Strategie implementiert.

## Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `ClipboardModule` | NgModule | Haupt-Modul |
| `Clipboard` | Service | Programmatische Zwischenablage-Operationen |
| `CdkCopyToClipboard` | Direktive | Deklaratives Kopieren; Selector: `[cdkCopyToClipboard]` |
| `PendingCopy` | Klasse | Verwaltung großer Kopiervorgänge |

**Clipboard Service Methoden:**
- `copy(text: string): boolean` — Kopiert Text sofort, gibt Erfolg zurück
- `beginCopy(text: string): PendingCopy` — Bereitet asynchrones Kopieren vor

**CdkCopyToClipboard Inputs:**
- `cdkCopyToClipboard: string` — Zu kopierender Text
- `cdkCopyToClipboardAttempts: number` — Anzahl der Kopieversuche (Standard: 1)

**CdkCopyToClipboard Outputs:**
- `cdkCopyToClipboardCopied: EventEmitter<boolean>` — Erfolg-/Misserfolg-Meldung

## Verwendungsbeispiel

```html
<!-- Deklarativ mit Direktive -->
<button
  [cdkCopyToClipboard]="codeExample"
  (cdkCopyToClipboardCopied)="onCopied($event)">
  Code kopieren
</button>
```

```typescript
import { Clipboard } from '@angular/cdk/clipboard';

@Component({ ... })
export class MyComponent {
  constructor(private clipboard: Clipboard) {}

  copyToClipboard(text: string): void {
    const success = this.clipboard.copy(text);
    if (success) {
      console.log('Erfolgreich kopiert!');
    }
  }

  // Für große Texte: asynchrones Kopieren
  copyLargeText(text: string): void {
    const pending = this.clipboard.beginCopy(text);
    let remainingAttempts = 3;

    const attempt = () => {
      const result = pending.copy();
      if (!result && --remainingAttempts) {
        setTimeout(attempt);
      } else {
        pending.destroy();
      }
    };
    attempt();
  }
}
```

## Besonderheiten

- `copy()` erstellt intern ein temporäres `<textarea>`-Element, befüllt es und führt `document.execCommand('copy')` aus.
- `beginCopy()` ist für große Textmengen gedacht, da das temporäre Element im DOM verbleibt bis `destroy()` aufgerufen wird.
- Die Direktive gibt bei `cdkCopyToClipboardAttempts > 1` mehrere Versuche aus, was für mobile Geräte nützlich ist.
- Das Kopieren funktioniert nur in sicheren Kontexten (HTTPS oder localhost) zuverlässig.
