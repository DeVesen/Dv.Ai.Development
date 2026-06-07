# Divider

**Kategorie:** Layout
**Selector:** `<mat-divider>`
**Import:** `MatDividerModule` from `@angular/material/divider`; Standalone: `MatDivider`
**URL:** https://material.angular.dev/components/divider/overview

## Übersicht

Dünne horizontale oder vertikale Trennlinie für visuelle Trennung von Inhaltsbereichen. Keine Interaktivität. Inset-Variante für Listen.

## Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `vertical` | `boolean` | Vertikale Ausrichtung (Standard: false) |
| `inset` | `boolean` | Eingerückter Divider für Listen (Standard: false) |

## Verwendungsbeispiel

```html
<!-- Horizontal -->
<mat-divider></mat-divider>

<!-- Vertikal -->
<mat-divider vertical></mat-divider>

<!-- Inset in Liste -->
<mat-list>
  <mat-list-item>Eintrag 1</mat-list-item>
  <mat-divider inset></mat-divider>
  <mat-list-item>Eintrag 2</mat-list-item>
</mat-list>
```

## Besonderheiten / Gotchas

- `role="separator"` und `aria-orientation` werden automatisch gesetzt
- In Listen: `inset` für Ausrichtung mit dem Text empfohlen
