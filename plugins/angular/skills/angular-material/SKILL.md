---
name: angular-material
description: Use when installing or theming Angular Material, picking a mat-* component, or building a custom form control that wraps multiple native inputs behind one mat-form-field (MatFormFieldControl). Triggers on ng add @angular/material, mat.theme, mat-form-field with more than one inner input/select, or a "custom input"/"number range field" request.
---

# Angular Material

## Install & theming

```bash
ng add @angular/material
```

Installs the package, sets up theming, configures `angular.json` automatically. Since v19, this is CSS-based theming (the `mat.theme` Sass mixin) — the previous `mat.define-theme`/`mat.define-light-theme`/`mat.define-dark-theme` config-object API is legacy:

```scss
@use '@angular/material' as mat;

html {
  @include mat.theme((
    color: (primary: mat.$azure-palette, tertiary: mat.$blue-palette),
    typography: Roboto,
    density: 0,
  ));
}
```

## Component quick-reference

| Category | Components |
|---|---|
| Forms | `mat-form-field`, `mat-input`, `mat-select`, `mat-checkbox`, `mat-radio`, `mat-slider` |
| Layout | `mat-sidenav`, `mat-toolbar`, `mat-card`, `mat-divider`, `mat-grid-list` |
| Navigation | `mat-menu`, `mat-tabs`, `mat-stepper`, `mat-paginator` |
| Buttons | `mat-button`, `mat-icon-button`, `mat-fab`, `mat-button-toggle` |
| Popups | `mat-dialog`, `mat-snack-bar`, `mat-tooltip`, `mat-bottom-sheet` |
| Data | `mat-table`, `mat-sort`, `mat-tree`, `mat-list` |
| Indicators | `mat-progress-bar`, `mat-progress-spinner`, `mat-badge`, `mat-chip` |

Testing Material components: prefer `@angular/material/*/testing` harnesses (`MatButtonHarness`, etc.) over DOM queries — robust to internal markup changes.

## Custom mat-form-field controls (multiple inner inputs)

`mat-form-field` accepts **exactly one** `MatFormFieldControl` per field. When a feature needs 2+ native inputs/selects inside one field (e.g. a number range), don't put `matInput` on each — wrap them behind a single directive that implements `MatFormFieldControl`.

| Allowed | Forbidden |
|---|---|
| One host element with `MatFormFieldControl` (a wrapper div + directive) | Two or more `matInput` in the same `mat-form-field` |
| Any number of native `<input>`/`<select>`/buttons as children of that one host | The shell component being `MatFormFieldControl` *and* containing its own inner `mat-form-field` |
| Shell component encapsulates `mat-form-field` + label/hint/error | `formControlName` on the shell host without a clear CVA strategy |

Full two-layer architecture (shell orchestrator + wrapper directive), the `MatFormFieldControl` contract, directory layout, and copy-paste snippets: [references/custom-input-architecture.md](references/custom-input-architecture.md), [references/custom-input-contract.md](references/custom-input-contract.md), [references/custom-input-directory-layout.md](references/custom-input-directory-layout.md), [references/custom-input-snippet.md](references/custom-input-snippet.md).
