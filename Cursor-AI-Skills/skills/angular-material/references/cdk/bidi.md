# Bidi (Bidirectionality)

**Kategorie:** Common Behaviors
**Import:** `BidiModule` from `@angular/cdk/bidi`
**URL:** https://material.angular.dev/cdk/bidi/overview

## Übersicht

Das `bidi`-Paket bietet Unterstützung für bidirektionale Texte (LTR/RTL) in Angular-Anwendungen. Der `Directionality`-Service stellt die aktuelle Schreibrichtung bereit und ermöglicht es Komponenten, auf Richtungsänderungen zu reagieren. Die `Dir`-Direktive kann verwendet werden, um einem Element und seinen Nachkommen eine bestimmte Richtung zuzuweisen. Dies ist besonders wichtig für die korrekte Darstellung von arabischen, hebräischen und anderen RTL-Sprachen.

## Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `BidiModule` | NgModule | Haupt-Modul |
| `Directionality` | Service | Stellt aktuelle Schreibrichtung bereit |
| `Dir` | Direktive | Setzt die Textrichtung; Selector: `[dir]` |
| `Direction` | Typ | `'ltr' \| 'rtl' \| 'auto'` |
| `DIR_DOCUMENT` | InjectionToken | Referenz auf das `document`-Objekt |

**Directionality:**
- `value: Direction` — Aktuelle Richtung (`'ltr'` oder `'rtl'`)
- `change: Observable<Direction>` — Observable bei Richtungsänderung

**Dir Inputs:**
- `dir: Direction` — Setzt die Richtung (`'ltr'`, `'rtl'`, `'auto'`)

**Dir Outputs:**
- `dirChange: EventEmitter<Direction>` — Bei Richtungsänderung

## Verwendungsbeispiel

```typescript
import { Directionality } from '@angular/cdk/bidi';
import { BidiModule } from '@angular/cdk/bidi';

@Component({
  selector: 'my-component',
  template: `<div>Aktuelle Richtung: {{ dir.value }}</div>`
})
export class MyComponent implements OnDestroy {
  private destroyed = new Subject<void>();

  constructor(public dir: Directionality) {
    dir.change
      .pipe(takeUntil(this.destroyed))
      .subscribe(() => {
        console.log('Richtung geändert zu:', dir.value);
      });
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
```

```html
<!-- Explizite RTL-Richtung für einen Bereich -->
<div dir="rtl">
  <p>هذا النص بالعربية</p>
</div>
```

## Besonderheiten

- Der `Directionality`-Service liest den `dir`-Wert aus dem nächstgelegenen `[dir]`-Ancestor oder vom `<html>`-Element.
- In Server-Side-Rendering-Umgebungen wird `'ltr'` als Standard verwendet.
- Angular Material-Komponenten nutzen `Directionality` intern für korrekte RTL-Layouts.
