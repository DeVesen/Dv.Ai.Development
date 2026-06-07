# Theming Your Own Components

**URL:** https://material.angular.dev/guide/theming-your-components

## Zusammenfassung

Zeigt wie eigene Anwendungskomponenten das Angular Material Theming-System nutzen. Zwei Ansätze: CSS-Variablen mit `--mat-sys`-Prefix und Utility-Klassen via `mat.system-classes()`. Beide unterstützen automatisch Light und Dark Mode.

## Kernpunkte

- **CSS-Variablen** (Prefix `--mat-sys-`): direkt in Component-Stylesheets nutzbar
- **Utility-Klassen** via `mat.system-classes()`: direkt im Template nutzbar
- **Color Tokens**: primary, secondary, tertiary, error, surface-Varianten, inverse-surface
- **Typography Tokens**: body, display, headline, label, title — jeweils small/medium/large
- **Shape Tokens**: corner-xs bis corner-full (4px bis 9999px border-radius)
- **Elevation Tokens**: level0–level5 als box-shadow-Werte
- **M2-Kompatibilität**: via `@include mat.m2-theme($theme)`

## Code-Beispiele

CSS-Variablen in eigenem Component:
```scss
.my-component {
  background: var(--mat-sys-primary-container);
  color: var(--mat-sys-on-primary-container);
  border: 1px solid var(--mat-sys-outline-variant);
  font: var(--mat-sys-body-large);
}
```

Wichtige Color-CSS-Variablen:
```css
--mat-sys-primary           /* Hauptfarbe */
--mat-sys-on-primary        /* Text auf Hauptfarbe */
--mat-sys-primary-container
--mat-sys-surface
--mat-sys-on-surface
--mat-sys-error
--mat-sys-outline
--mat-sys-outline-variant
```

Elevation-Tokens:
```css
--mat-sys-level0  /* kein Schatten */
--mat-sys-level1  /* leicht erhöht */
--mat-sys-level2  /* Menüs, Select-Panels */
--mat-sys-level3  /* FAB */
--mat-sys-level4  /* hover FAB */
--mat-sys-level5  /* stark erhöht */
```

## Wichtige Hinweise

- On-Color-Tokens (`on-primary`, `on-surface`) für Text auf farbigen Hintergründen verwenden
- `mat-bg-disabled` und `mat-text-disabled` basieren auf `color-mix()` für korrekte Disabled-States
- Shape-Tokens sind feste px-Werte (nicht skalierend)
