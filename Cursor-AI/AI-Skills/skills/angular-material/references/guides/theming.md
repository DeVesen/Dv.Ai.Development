# Theming Angular Material (M3)

**URL:** https://material.angular.dev/guide/theming

## Zusammenfassung

Beschreibt das Material 3 Theming-System (eingeführt in v19) auf Basis des `mat.theme`-Mixins. Nutzt CSS-Variablen (Design Tokens) und die CSS `light-dark()`-Funktion für automatisches Light/Dark-Handling.

## Kernpunkte

- Kern: `mat.theme`-Mixin in Sass-Theme-Datei; akzeptiert color, typography und density
- **Color**: Single palette oder color map (primary, tertiary, theme-type)
- **Typography**: Single font-family oder typography map (plain-family, brand-family, Gewichte)
- **Density**: Integer 0 bis -5; jede Stufe reduziert betroffene Sizes um 4px
- **8 Prebuilt Themes**: 4× M3 (azure-blue, rose-red, cyan-orange, magenta-violet) + 4× M2
- **12 vorgefertigte Paletten**: red, green, blue, yellow, cyan, magenta, orange, chartreuse, spring-green, azure, violet, rose
- **Light/Dark**: Via `color-scheme: light dark` auf `html` + CSS `light-dark()`-Funktion
- **Token Overrides**: `mat.theme-overrides()` für System-Tokens; `mat.[component]-overrides()` für Komponenten-Tokens
- **Strong Focus Indicators**: via `mat.strong-focus-indicators()` für WCAG-Accessibility

## Code-Beispiele

Basis-Theme:
```scss
@use '@angular/material' as mat;

html {
  color-scheme: light dark;
  @include mat.theme((
    color: mat.$violet-palette,
    typography: Roboto,
    density: 0
  ));
}
```

Color Map mit separater Tertiary-Palette:
```scss
html {
  @include mat.theme((
    color: (
      primary: mat.$violet-palette,
      tertiary: mat.$orange-palette,
      theme-type: light,
    ),
    typography: Roboto,
    density: 0
  ));
}
```

Prebuilt Theme:
```json
"styles": [
  "@angular/material/prebuilt-themes/azure-blue.css"
]
```

Custom Palette generieren:
```bash
ng generate @angular/material:theme-color
```

Component Token Overrides:
```scss
html {
  @include mat.card-overrides((
    elevated-container-color: red,
    elevated-container-shape: 32px,
    title-text-size: 2rem,
  ));
}
```

## Wichtige Hinweise

- `mat.theme`-Mixin setzt nur CSS-Variablen für übergebene Kategorien
- `light-dark()` in allen Major-Browsern verfügbar; für ältere Browser `theme-type` explizit setzen
- Density unter 0 kann Accessibility beeinträchtigen
- Density wirkt NICHT auf Datepicker und task-basierte Popups
- CSS-Overrides außerhalb der Theming-APIs: **nicht unterstützt** (private DOM-Struktur)
- M2-Prebuilt-Themes werden in Zukunft entfernt; M3-Themes bevorzugen
