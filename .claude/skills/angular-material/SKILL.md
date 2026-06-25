---
name: angular-material
description: >
  Angular Material component guidance for Angular v22+. Use when working with Angular Material
  UI components: buttons, forms, dialogs, tables, navigation, theming, CDK.
  Also covers: custom mat-form-field inputs (MatFormFieldControl, Shell + Direktive pattern,
  multi-input form fields, label-placeholder overlap, Variante B directory layout).
  Trigger: Angular Material, mat-button, mat-form-field, mat-dialog, mat-table, mat-sidenav,
  MatModule, MatTheme, CDK, Material Design, ng add @angular/material,
  custom form input, MatFormFieldControl, custom-input-range-wrapper, number range field,
  multi-input mat-form-field, shell directive pattern.
---

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

## Operationen: Custom mat-form-field Inputs

**Vor Ausführung:** relevante Referenz vollständig lesen.

| Trigger | Operation | Detail |
|---------|-----------|--------|
| `neues custom input`, `custom-input erstellen`, `mat-form-field mit mehreren inputs`, `number range field` | Neues Custom Input von Grund auf erstellen | [references/custom-input-op-create.md](references/custom-input-op-create.md) |
| `reference/ layout`, `variante b`, `directory struktur`, `wo liegt die direktive` | Verzeichnisstruktur entscheiden (Standard vs. Variante B) | [references/custom-input-directory-layout.md](references/custom-input-directory-layout.md) |
| `matformfieldcontrol contract`, `pflichtfelder direktive`, `statechanges`, `oncontainerclick` | MatFormFieldControl-Vertrag implementieren | [references/custom-input-contract.md](references/custom-input-contract.md) |
| `snippet`, `gerüst`, `boilerplate`, `kopiervorlage` | Kopierbare TS/HTML-Gerüste für Shell und Direktive | [references/custom-input-snippet.md](references/custom-input-snippet.md) |

## Opt-out

`kein angular-material` → Skill nicht laden.

Keine Code-Beispiele ohne explizite Nachfrage.
