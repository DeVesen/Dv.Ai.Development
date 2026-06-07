# Icon

**Kategorie:** Buttons & Indicators
**Selector:** `<mat-icon>`
**Import:** `MatIconModule` from `@angular/material/icon`; Standalone: `MatIcon`
**URL:** https://material.angular.dev/components/icon/overview

## Übersicht

Icons aus verschiedenen Quellen: Material Icons Font (Standard), benutzerdefinierte Icon-Fonts, SVG-Icon-Sets. SVG-Icons über `MatIconRegistry` registriert. Automatisch `role="img"` und `aria-hidden`-Unterstützung.

## Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `svgIcon` | `string` | SVG-Icon aus Registry (`[namespace:]name`) |
| `fontSet` | `string` | Icon-Font-Set |
| `fontIcon` | `string` | Icon-Name im Font-Set |
| `inline` | `boolean` | Größe an Schriftgröße anpassen |
| `color` | `string \| null \| undefined` | Theme-Farbe (nur M2) |

## Verwendungsbeispiel

```html
<!-- Material Icons Font -->
<mat-icon>home</mat-icon>

<!-- SVG-Icon aus Registry -->
<mat-icon svgIcon="my-logo"></mat-icon>

<!-- Inline (passt sich Textgröße an) -->
<p>Text mit <mat-icon inline>check</mat-icon> Icon</p>

<!-- Dekorativ (Screen Reader) -->
<mat-icon aria-hidden="true">favorite</mat-icon>
```

```typescript
// SVG-Icons registrieren
constructor(private iconRegistry: MatIconRegistry, private sanitizer: DomSanitizer) {
  iconRegistry.addSvgIcon('my-logo',
    sanitizer.bypassSecurityTrustResourceUrl('assets/icons/logo.svg'));
}
```

## Besonderheiten / Gotchas

- Material Icons Font separat einbinden (Google Fonts oder npm-Paket)
- Dekorative Icons: `aria-hidden="true"`; Funktionale Icons: `aria-label` am Elternelement
- `MatIconRegistry` muss im Root-Injector bereitgestellt sein
- Größe via `font-size` oder `--mat-icon-size`-Token
