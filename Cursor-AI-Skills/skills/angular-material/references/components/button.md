# Button

**Kategorie:** Buttons & Indicators
**Selector:** `button[matButton]`, `a[matButton]`, `button[mat-button]`, `button[mat-raised-button]`, `button[mat-flat-button]`, `button[mat-stroked-button]`
**Import:** `MatButtonModule` from `@angular/material/button`; Standalone: `MatButton`, `MatAnchor`, `MatIconButton`, `MatFab`, `MatMiniFab`
**URL:** https://material.angular.dev/components/button/overview

## Übersicht

Direktiven auf nativen `<button>` und `<a>` Elementen. M3 bietet 5 Erscheinungsbilder: `text` (Standard), `filled`, `elevated` (neu), `outlined`, `tonal` (neu). Icon-Buttons (`mat-icon-button`) und FABs (`mat-fab`, `mat-mini-fab`) sind separate Direktiven.

## Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `matButton` | `MatButtonAppearance \| ''` | Erscheinungsbild: `'text'\|'filled'\|'elevated'\|'outlined'\|'tonal'` |
| `disabled` | `boolean` | Deaktivieren |
| `disableRipple` | `boolean` | Ripple deaktivieren |
| `color` | `string` | Theme-Farbe (nur M2) |

## Verwendungsbeispiel

```html
<!-- M3-Stil -->
<button matButton>Text Button</button>
<button matButton="filled">Filled Button</button>
<button matButton="outlined">Outlined Button</button>
<button matButton="elevated">Elevated Button</button>
<button matButton="tonal">Tonal Button</button>

<!-- Legacy M2 (weiterhin unterstützt) -->
<button mat-button>Text</button>
<button mat-raised-button color="primary">Raised</button>
<button mat-flat-button color="accent">Flat</button>
<button mat-stroked-button>Stroked</button>

<!-- Icon Button -->
<button mat-icon-button aria-label="Einstellungen">
  <mat-icon>settings</mat-icon>
</button>

<!-- FAB -->
<button mat-fab color="primary"><mat-icon>add</mat-icon></button>
<button mat-mini-fab><mat-icon>edit</mat-icon></button>

<!-- Extended FAB (M3) -->
<button mat-fab extended>
  <mat-icon>add</mat-icon>
  Neuer Eintrag
</button>

<!-- Link-Button -->
<a mat-button routerLink="/home">Zurück zur Startseite</a>
```

## Besonderheiten / Gotchas

- Icon-Buttons immer mit `aria-label` — kein sichtbarer Text vorhanden
- `<a matButton>` rendert semantisch als Link, verhält sich visuell wie Button
- `setAppearance()` für programmatisches Ändern des Erscheinungsbilds
- `color` wirkt nur in M2-Themes
- `mat-fab extended` (oder `<button mat-extended-fab>`) rendert einen FAB mit Textlabel; empfohlen wenn der Aktionskontext nicht eindeutig aus dem Icon hervorgeht
