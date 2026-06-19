---
name: angular-material
description: >
  Angular Material component guidance for Angular v22+. Use when working with Angular Material
  UI components: buttons, forms, dialogs, tables, navigation, theming, CDK.
  Trigger: Angular Material, mat-button, mat-form-field, mat-dialog, mat-table, mat-sidenav,
  MatModule, MatTheme, CDK, Material Design, ng add @angular/material.
---

# Angular Material

Guidance for Angular Material v22+ components, theming, and CDK usage.

## Voraussetzungen

- `angular-developer` muss geladen sein (Language-Level-Guidance).
- Angular Material installiert: `ng add @angular/material` (fügt automatisch Theming und Providers hinzu).
- Version prüfen: `package.json` → `@angular/material`.

## Vollständige Komponenten-Referenz

Alle verfügbaren Komponenten, APIs und Verwendungsbeispiele:
→ `docs/angular-material-v22-components.md`

## Schnellübersicht: Häufige Komponenten

| Kategorie | Komponenten |
|-----------|------------|
| Formulare | `mat-form-field`, `mat-input`, `mat-select`, `mat-checkbox`, `mat-radio`, `mat-slider` |
| Layout | `mat-sidenav`, `mat-toolbar`, `mat-card`, `mat-divider`, `mat-grid-list` |
| Navigation | `mat-menu`, `mat-tabs`, `mat-stepper`, `mat-paginator` |
| Buttons | `mat-button`, `mat-icon-button`, `mat-fab`, `mat-button-toggle` |
| Popups | `mat-dialog`, `mat-snack-bar`, `mat-tooltip`, `mat-bottom-sheet` |
| Data | `mat-table`, `mat-sort`, `mat-tree`, `mat-list` |
| Indikatoren | `mat-progress-bar`, `mat-progress-spinner`, `mat-badge`, `mat-chip` |

## Installation

```bash
ng add @angular/material
```

Dieser Befehl installiert das Paket, richtet Theming ein und konfiguriert `angular.json` automatisch.

## Theming (v22+)

Angular Material v22 nutzt CSS-basiertes Theming. Theme-Konfiguration in `styles.scss`:

```scss
@use '@angular/material' as mat;

html {
  @include mat.theme((
    color: (
      primary: mat.$azure-palette,
      tertiary: mat.$blue-palette,
    ),
    typography: Roboto,
    density: 0,
  ));
}
```

## Testing mit Harnesses

Für Tests immer Material-spezifische Harnesses verwenden (robuster als DOM-Queries):
```ts
import { MatButtonHarness } from '@angular/material/button/testing';
```

Referenz: `.claude/skills/angular-developer/references/component-harnesses.md`

## Custom Inputs in mat-form-field

Für eigene Komponenten innerhalb von `mat-form-field`:
→ `angular-material-custom-input` Skill laden

## Opt-out

`kein angular-material` → Skill nicht laden.

Keine Code-Beispiele ohne explizite Nachfrage.
