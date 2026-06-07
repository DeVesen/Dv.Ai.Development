# Theming Angular Material with Material 2 (Legacy)

**URL:** https://material.angular.dev/guide/material-2-theming

## Zusammenfassung

Beschreibt das ältere Material Design 2 Theming-System mit `m2-define-light-theme`, `m2-define-dark-theme` und komponentenspezifischen Sass-Mixins. Relevant für bestehende Anwendungen. Enthält auch Migrationshinweise zu M3.

## Kernpunkte

- **Paletten**: Sass Maps mit Hues (50–900) und Contrast-Map; 12 vordefinierte M2-Paletten
- **Theme aufbauen**: `m2-define-palette()` + `m2-define-light-theme()` oder `m2-define-dark-theme()`
- **4 M2 Prebuilt Themes**: deeppurple-amber, indigo-pink, pink-bluegrey, purple-green
- **Multiple Themes**: Via CSS-Selector-Scoping oder separate Files mit `inject: false`
- **Density**: Scale 0 bis -5; je Stufe -4px
- **Custom Component Theming**: Separate `_theme.scss` mit `color()`, `typography()`, `theme()`-Mixins
- **Migration M2 → M3**: `get-theme-version()` für duale Unterstützung

## Code-Beispiele

Theme definieren:
```scss
@use '@angular/material' as mat;

$my-primary: mat.m2-define-palette(mat.$m2-indigo-palette, 500);
$my-accent: mat.m2-define-palette(mat.$m2-pink-palette, A200, A100, A400);
$my-warn: mat.m2-define-palette(mat.$m2-red-palette);

$my-theme: mat.m2-define-light-theme((
  color: (primary: $my-primary, accent: $my-accent, warn: $my-warn),
  typography: mat.m2-define-typography-config(),
  density: 0,
));

@include mat.all-component-themes($my-theme);
```

Scoped Themes:
```scss
.my-special-section {
  $special-primary: mat.m2-define-palette(mat.$m2-orange-palette);
  $special-theme: mat.m2-define-dark-theme((
    color: (primary: $special-primary, accent: ...),
  ));
  @include mat.button-color($special-theme);
}
```

M2→M3 duale Unterstützung:
```scss
@mixin my-comp-theme($theme) {
  @if (mat.get-theme-version($theme) == 1) {
    // M3 styles
  } @else {
    // M2 styles
  }
}
```

## Wichtige Hinweise

- Für neue Projekte: M3 Theming Guide verwenden
- `color="primary/accent/warn"` Attribute sind für M3 veraltet
- `all-component-themes` erzeugt CSS für alle 35+ Komponenten — in Produktion besser nur benötigte includen
- `typography-hierarchy` mit `$back-compat: true` für M2-Klassen-Namen beim M3-Upgrade
