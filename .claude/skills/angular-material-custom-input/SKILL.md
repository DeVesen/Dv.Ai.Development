---
name: angular-material-custom-input
description: >
  Build self-contained Angular Material form fields with multiple native controls inside
  one mat-form-field via MatFormFieldControl on .custom-input-range-wrapper (shell +
  directive pattern). Directory: Host-first puts directive + model under
  {component-prefix}-form-<feature>/reference/; Variante B shares {component-prefix}-<control>/ when two+ shells
  need the same directive. Use when creating or refactoring custom form inputs,
  MatFormFieldControl, custom-input-range-wrapper, number range fields, multi-input
  mat-form-field, mat-label/mat-hint/mat-error orchestration, label-placeholder overlap,
  or Option 1 Variante B. Load BEFORE implementing the shell; inner layout/CSS inside
  the wrapper is feature-specific and not prescribed here.
---

## Voraussetzungen

Vor Umsetzung zusätzlich laden: globale Angular-Skills (`angular-developer`, `angular-developer-extension`) und ggf. projektspezifische Shared-Component-Skills.

## Repo-Layout

| Shell | Control (`reference/`) |
|-------|------------------------|
| `{component-prefix}-form-<feature>/` | `{component-prefix}-<feature>-control.directive`, `<feature>.model` |

## Operationen

| Trigger | Operation | Detail |
|---------|-----------|--------|
| `neues custom input`, `custom-input erstellen`, `mat-form-field mit mehreren inputs`, `number range field`, `multi-input form field` | Neues Custom Input von Grund auf erstellen | [references/op-create.md](references/op-create.md) |
| `reference/ layout`, `variante b`, `directory struktur`, `wo liegt die direktive` | Verzeichnisstruktur entscheiden (Standard vs. Variante B) | [references/directory-layout.md](references/directory-layout.md) |
| `matformfieldcontrol contract`, `pflichtfelder direktive`, `statechanges`, `oncontainerclick` | MatFormFieldControl-Vertrag implementieren | [references/mat-form-field-control-contract.md](references/mat-form-field-control-contract.md) |
| `snippet`, `gerüst`, `boilerplate`, `kopiervorlage` | Kopierbare TS/HTML-Gerüste für Shell und Direktive | [references/shell-snippet.md](references/shell-snippet.md) |

**Vor Ausführung:** relevante `op-*.md` vollständig lesen.

## Geteilte Referenzen

| Thema | Datei |
|-------|-------|
| Verzeichnisstruktur, Variante B, Anti-Patterns | [references/directory-layout.md](references/directory-layout.md) |
| MatFormFieldControl-Pflichtvertrag, Outputs, Host-Metadaten | [references/mat-form-field-control-contract.md](references/mat-form-field-control-contract.md) |
| Direktive- und Shell-Snippets (Kopierbasis) | [references/shell-snippet.md](references/shell-snippet.md) |

## Opt-out

`kein custom-input`, `kein mat-form-field-control` → Skill nicht laden.

Keine Code-Beispiele ohne explizite Nachfrage.
