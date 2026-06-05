---
name: angular-material
description: >
  Vollständige Angular Material v22.0.0 Referenz — alle Komponenten, CDK-Module und Guides.
  Trigger bei Angular Material-Arbeit: mat-Komponenten, CDK-Direktiven, Theming, Material Icons,
  MatDialog, MatTable, MatForm, CDK Overlay, Accessibility (a11y), Drag & Drop, Virtual Scrolling,
  Component Harnesses. Setzt angular-developer voraus.
disable-model-invocation: true
---

## Voraussetzungen

- **Angular-Version prüfen**: `ng v` — diese Referenz gilt für v22.0.0
- Angular-Developer-Skill laden: [angular-developer/SKILL.md](../angular-developer/SKILL.md)
- Standalone-API bevorzugen: keine NgModules wenn möglich

## Operationen

| Trigger | Operation | Detail |
|---------|-----------|--------|
| `mat-autocomplete`, `matAutocomplete` | Autocomplete | [references/components/autocomplete.md](references/components/autocomplete.md) |
| `mat-checkbox`, `MatCheckbox` | Checkbox | [references/components/checkbox.md](references/components/checkbox.md) |
| `mat-datepicker`, `MatDatepicker` | Datepicker | [references/components/datepicker.md](references/components/datepicker.md) |
| `mat-form-field`, `MatFormField` | Form Field | [references/components/form-field.md](references/components/form-field.md) |
| `matInput`, `MatInput` | Input | [references/components/input.md](references/components/input.md) |
| `mat-radio-button`, `mat-radio-group` | Radio Button | [references/components/radio-button.md](references/components/radio-button.md) |
| `mat-select`, `MatSelect` | Select | [references/components/select.md](references/components/select.md) |
| `mat-slider`, `matSliderThumb` | Slider | [references/components/slider.md](references/components/slider.md) |
| `mat-slide-toggle`, `MatSlideToggle` | Slide Toggle | [references/components/slide-toggle.md](references/components/slide-toggle.md) |
| `mat-menu`, `matMenuTriggerFor` | Menu | [references/components/menu.md](references/components/menu.md) |
| `mat-sidenav`, `mat-drawer` | Sidenav / Drawer | [references/components/sidenav.md](references/components/sidenav.md) |
| `mat-toolbar` | Toolbar | [references/components/toolbar.md](references/components/toolbar.md) |
| `mat-card`, `MatCard` | Card | [references/components/card.md](references/components/card.md) |
| `mat-divider` | Divider | [references/components/divider.md](references/components/divider.md) |
| `mat-expansion-panel`, `mat-accordion` | Expansion Panel | [references/components/expansion-panel.md](references/components/expansion-panel.md) |
| `mat-grid-list`, `mat-grid-tile` | Grid List | [references/components/grid-list.md](references/components/grid-list.md) |
| `mat-list`, `mat-nav-list`, `mat-selection-list` | List | [references/components/list.md](references/components/list.md) |
| `mat-stepper`, `mat-step`, `matStepperNext` | Stepper | [references/components/stepper.md](references/components/stepper.md) |
| `mat-tab-group`, `mat-tab` | Tabs | [references/components/tabs.md](references/components/tabs.md) |
| `mat-tree`, `mat-tree-node` | Tree | [references/components/tree.md](references/components/tree.md) |
| `matButton`, `mat-button`, `mat-raised-button`, `mat-icon-button`, `mat-fab` | Button | [references/components/button.md](references/components/button.md) |
| `mat-button-toggle`, `mat-button-toggle-group` | Button Toggle | [references/components/button-toggle.md](references/components/button-toggle.md) |
| `matBadge` | Badge | [references/components/badge.md](references/components/badge.md) |
| `mat-chip`, `mat-chip-grid`, `mat-chip-listbox`, `matChipInputFor` | Chips | [references/components/chips.md](references/components/chips.md) |
| `mat-icon`, `MatIconRegistry`, `svgIcon` | Icon | [references/components/icon.md](references/components/icon.md) |
| `mat-progress-bar` | Progress Bar | [references/components/progress-bar.md](references/components/progress-bar.md) |
| `mat-progress-spinner`, `mat-spinner` | Progress Spinner | [references/components/progress-spinner.md](references/components/progress-spinner.md) |
| `matRipple`, `mat-ripple` | Ripple | [references/components/ripple.md](references/components/ripple.md) |
| `MatBottomSheet`, `MAT_BOTTOM_SHEET_DATA` | Bottom Sheet | [references/components/bottom-sheet.md](references/components/bottom-sheet.md) |
| `MatDialog`, `mat-dialog-title`, `MAT_DIALOG_DATA` | Dialog | [references/components/dialog.md](references/components/dialog.md) |
| `MatSnackBar`, `snackBar.open` | Snack Bar | [references/components/snack-bar.md](references/components/snack-bar.md) |
| `matTooltip` | Tooltip | [references/components/tooltip.md](references/components/tooltip.md) |
| `mat-paginator`, `MatPaginator` | Paginator | [references/components/paginator.md](references/components/paginator.md) |
| `matSort`, `mat-sort-header` | Sort Header | [references/components/sort-header.md](references/components/sort-header.md) |
| `mat-table`, `MatTableDataSource` | Table | [references/components/table.md](references/components/table.md) |

## CDK-Module

| Trigger | Modul | Detail |
|---------|-------|--------|
| `FocusMonitor`, `LiveAnnouncer`, `FocusTrap`, `cdkTrapFocus`, `a11y` | Accessibility (a11y) | [references/cdk/a11y.md](references/cdk/a11y.md) |
| `CdkAccordion`, `CdkAccordionItem` | Accordion | [references/cdk/accordion.md](references/cdk/accordion.md) |
| `Directionality`, `Dir`, `bidi` | Bidi (Bidirectionality) | [references/cdk/bidi.md](references/cdk/bidi.md) |
| `Clipboard`, `CdkCopyToClipboard` | Clipboard | [references/cdk/clipboard.md](references/cdk/clipboard.md) |
| `coerceBooleanProperty`, `coerceNumberProperty` | Coercion | [references/cdk/coercion.md](references/cdk/coercion.md) |
| `SelectionModel`, `ArrayDataSource` | Collections | [references/cdk/collections.md](references/cdk/collections.md) |
| `ComponentHarness`, `HarnessLoader`, `HarnessPredicate` | Component Test Harnesses | [references/cdk/component-harnesses.md](references/cdk/component-harnesses.md) |
| `CdkDialog`, `Dialog`, `DIALOG_DATA` | CDK Dialog | [references/cdk/dialog.md](references/cdk/dialog.md) |
| `CdkDrag`, `CdkDropList`, `moveItemInArray`, `transferArrayItem` | Drag and Drop | [references/cdk/drag-drop.md](references/cdk/drag-drop.md) |
| `ENTER`, `ESCAPE`, `TAB`, `keycodes` | Keycodes | [references/cdk/keycodes.md](references/cdk/keycodes.md) |
| `BreakpointObserver`, `MediaMatcher`, `Breakpoints` | Layout | [references/cdk/layout.md](references/cdk/layout.md) |
| `CdkListbox`, `CdkOption` | Listbox | [references/cdk/listbox.md](references/cdk/listbox.md) |
| `CdkMenu`, `CdkMenuBar`, `CdkMenuItem` | CDK Menu | [references/cdk/menu.md](references/cdk/menu.md) |
| `ContentObserver`, `CdkObserveContent` | Observers | [references/cdk/observers.md](references/cdk/observers.md) |
| `Overlay`, `OverlayRef`, `ConnectedPosition` | Overlay | [references/cdk/overlay.md](references/cdk/overlay.md) |
| `Platform`, `PLATFORM_ID` | Platform | [references/cdk/platform.md](references/cdk/platform.md) |
| `ComponentPortal`, `TemplatePortal`, `CdkPortalOutlet` | Portal | [references/cdk/portal.md](references/cdk/portal.md) |
| `CdkVirtualScrollViewport`, `CdkVirtualForOf`, `Virtual Scrolling` | Scrolling | [references/cdk/scrolling.md](references/cdk/scrolling.md) |
| `CdkStepper`, `CdkStep`, `cdkStepperNext` | CDK Stepper | [references/cdk/stepper.md](references/cdk/stepper.md) |
| `CdkTable`, `CdkColumnDef` | CDK Table | [references/cdk/table.md](references/cdk/table.md) |
| `TestbedHarnessEnvironment`, `HarnessLoader` | Testing | [references/cdk/testing.md](references/cdk/testing.md) |
| `CdkTextareaAutosize`, `AutofillMonitor`, `cdkAutosizeMinRows` | Text Field | [references/cdk/text-field.md](references/cdk/text-field.md) |
| `CdkTree`, `CdkTreeNode`, `levelAccessor`, `childrenAccessor` | CDK Tree | [references/cdk/tree.md](references/cdk/tree.md) |

## Guides

| Trigger | Guide | Detail |
|---------|-------|--------|
| `ng add @angular/material`, Installation, Setup | Getting Started | [references/guides/getting-started.md](references/guides/getting-started.md) |
| `mat.theme`, Theming, M3, Paletten, Light/Dark, Token Overrides | Theming (M3) | [references/guides/theming.md](references/guides/theming.md) |
| `--mat-sys-`, eigene Komponenten stylen, Utility-Klassen | Theming eigener Komponenten | [references/guides/theming-your-components.md](references/guides/theming-your-components.md) |
| `ng generate @angular/material:`, Schematics, Code-Generierung | Schematics | [references/guides/schematics.md](references/guides/schematics.md) |
| `MatFormFieldControl`, Custom Form Field, ControlValueAccessor | Custom Form Field Control | [references/guides/creating-a-custom-form-field-control.md](references/guides/creating-a-custom-form-field-control.md) |
| `CdkStepper extends`, Custom Stepper | Custom Stepper (CDK) | [references/guides/creating-a-custom-stepper.md](references/guides/creating-a-custom-stepper.md) |
| `HarnessLoader`, `MatButtonHarness`, Component Harnesses Testing | Testing mit Harnesses | [references/guides/testing-with-component-harnesses.md](references/guides/testing-with-component-harnesses.md) |
| `m2-define-light-theme`, M2 Theming, Legacy Theming | Theming (M2, Legacy) | [references/guides/material-2-theming.md](references/guides/material-2-theming.md) |

## Theming-Schnellreferenz

### M3 (aktuell, v19+)

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

**Prebuilt Themes:** `azure-blue`, `rose-red`, `cyan-orange`, `magenta-violet`

### Token Overrides

```scss
html {
  @include mat.card-overrides((
    elevated-container-color: red,
    elevated-container-shape: 32px,
  ));
}
```

### Eigene Komponenten stylen

```scss
.my-component {
  background: var(--mat-sys-primary-container);
  color: var(--mat-sys-on-primary-container);
}
```

## Wichtige globale Injection Tokens

| Token | Beschreibung |
|-------|-------------|
| `MAT_DATE_FORMATS` | Datumsformate für Datepicker |
| `MAT_FORM_FIELD_DEFAULT_OPTIONS` | Standardoptionen für Form Fields |
| `MAT_DIALOG_DEFAULT_OPTIONS` | Standardoptionen für Dialoge |
| `MAT_SNACK_BAR_DEFAULT_OPTIONS` | Standardoptionen für Snack Bars |
| `MAT_RIPPLE_GLOBAL_OPTIONS` | Globale Ripple-Konfiguration |
| `MAT_PAGINATOR_DEFAULT_OPTIONS` | Standardoptionen für Paginator |
| `MAT_SELECT_CONFIG` | Standardkonfiguration für Select |

## Opt-out

`kein angular-material`, `kein mat`, `no-angular-material` → Skill nicht laden.
