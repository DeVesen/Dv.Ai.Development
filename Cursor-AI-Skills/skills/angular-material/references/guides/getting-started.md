# Getting Started with Angular Material

**URL:** https://material.angular.dev/guide/getting-started

## Zusammenfassung

Erklärt wie ein Angular-Projekt für Angular Material eingerichtet wird. Die Installation über `ng add` ist vollständig automatisiert — sie richtet Abhängigkeiten, Fonts und globale Styles ein.

## Kernpunkte

- Installation: `ng add @angular/material` (installiert Material + CDK)
- Schematic fragt: Prebuilt-Theme oder Custom Theme, globale Typography-Styles
- Roboto-Font und Material Icons werden automatisch in `index.html` eingetragen
- Globale Styles: Body-Margins entfernt, `height: 100%` auf `html`/`body`, Roboto als Default-Font
- Komponenten einzeln in `imports[]` importieren (Standalone-Ansatz)

## Code-Beispiele

```bash
ng add @angular/material
ng serve
```

```typescript
import {MatSlideToggle} from '@angular/material/slide-toggle';

@Component({
  imports: [MatSlideToggle],
})
class AppComponent {}
```

```html
<mat-slide-toggle>Toggle me!</mat-slide-toggle>
```

## Animations

```typescript
// app.config.ts — Empfohlen (v17+): lazy loading
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export const appConfig: ApplicationConfig = {
  providers: [provideAnimationsAsync()]
};

// Alternativ: synchron (ältere Projekte)
import { provideAnimations } from '@angular/platform-browser/animations';
providers: [provideAnimations()]
```

`provideAnimationsAsync()` ist für neue Projekte bevorzugt — die Animations-Engine wird nur bei Bedarf geladen.

## Wichtige Hinweise

- Angular CLI muss bereits installiert sein
- Prebuilt-Themes unter `/prebuilt-themes/` im npm-Package verfügbar
- Nach Installation weitere Schematics verfügbar: nav, table, dashboard, address-form, tree
- `provideAnimations()` vs. `provideAnimationsAsync()`: Letzteres lädt Animations-Engine asynchron (Lazy) — empfohlen für bessere Initial-Load-Performance ab v17+
- `MatIconRegistry.addSvgIcon()` für eigene SVG-Icons nach der Installation konfigurieren (häufige Folgefrage)
- CDK wird automatisch als Peer-Dependency mit `@angular/material` installiert — gleiche Versionsnummer erforderlich
