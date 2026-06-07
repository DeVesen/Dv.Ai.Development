# Platform

**Kategorie:** Utilities
**Import:** `PlatformModule` from `@angular/cdk/platform`
**URL:** https://material.angular.dev/cdk/platform/overview

## Übersicht

Das `platform`-Paket bietet einen Service zur Erkennung der aktuellen Plattform und des Rendering-Environments. Der `Platform`-Service stellt Boolean-Properties für verschiedene Browser und Rendering-Engines bereit, ohne dass direkte User-Agent-String-Prüfungen im Anwendungscode nötig sind. Dies ist besonders wichtig für Browser-spezifische Workarounds und für die SSR-Kompatibilität (Server-Side Rendering mit `isBrowser`).

## Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `PlatformModule` | NgModule | Haupt-Modul |
| `Platform` | Service | Plattform- und Browser-Erkennung |

**Platform Properties:**
- `isBrowser: boolean` — Läuft in einem Browser
- `EDGE: boolean` — Microsoft Edge
- `TRIDENT: boolean` — Internet Explorer (Trident-Engine)
- `BLINK: boolean` — Chrome, Opera (Blink-Engine)
- `WEBKIT: boolean` — Safari (WebKit ohne Blink/Trident)
- `IOS: boolean` — Apple iOS-Gerät
- `FIREFOX: boolean` — Mozilla Firefox
- `ANDROID: boolean` — Android-Gerät (ohne Trident mobile)
- `SAFARI: boolean` — Safari-Browser

## Verwendungsbeispiel

```typescript
import { Platform } from '@angular/cdk/platform';

@Component({ ... })
export class ScrollComponent {
  constructor(private platform: Platform) {}

  scrollTo(element: HTMLElement) {
    if (this.platform.isBrowser) {
      // Sicherer Zugriff auf Browser-APIs
      if (this.platform.IOS) {
        // iOS-spezifischer Workaround für Scroll-Probleme
        element.style.webkitOverflowScrolling = 'touch';
      }
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  ngOnInit() {
    if (!this.platform.isBrowser) {
      // SSR: keine Browser-APIs verfügbar
      return;
    }

    if (this.platform.FIREFOX) {
      // Firefox-spezifische Initialisierung
    }
  }
}
```

## Besonderheiten

- `isBrowser` ist die wichtigste Property für SSR-Kompatibilität.
- Die Erkennungen basieren auf User-Agent-String-Prüfungen und browser-spezifischen globalen Variablen.
- Beinhaltet defensive Programmierung (try-catch) für bestimmte Internet-Explorer-Konfigurationen.
- In Test-Umgebungen können Platform-Werte über DI überschrieben werden.
- Das Paket enthält auch Feature-Detection-Utilities in Untermodulen: `supportsPassiveEventListeners`, `getSupportedInputTypes`, `supportsScrollBehavior`, `isOnShadowRoot`.
