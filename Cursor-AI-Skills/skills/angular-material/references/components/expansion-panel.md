# Expansion Panel / Accordion

**Kategorie:** Layout
**Selector:** `<mat-expansion-panel>`, `<mat-accordion>`, `<mat-expansion-panel-header>`, `<mat-action-row>`
**Import:** `MatExpansionModule` from `@angular/material/expansion`; Standalone: `MatExpansionPanel`, `MatExpansionPanelHeader`, `MatAccordion`, `MatExpansionPanelTitle`, `MatExpansionPanelDescription`
**URL:** https://material.angular.dev/components/expansion/overview

## Übersicht

Ausklappbarer Container für bedarfsgerechte Inhaltsanzeige. Mehrere Panels in `<mat-accordion>` mit optionaler Exklusiv-Auswahl. Lazy-Loading des Inhalts möglich.

## Wichtige Inputs — `<mat-expansion-panel>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `expanded` | `boolean` | Aufgeklappt-Zustand |
| `disabled` | `boolean` | Panel deaktivieren |
| `hideToggle` | `boolean` | Expand-Indikator ausblenden |
| `togglePosition` | `MatAccordionTogglePosition` | Position des Toggle |

## Wichtige Inputs — `<mat-accordion>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `multi` | `boolean` | Mehrere Panels gleichzeitig offen (Standard: false) |
| `hideToggle` | `boolean` | Toggle für alle Panels ausblenden |
| `displayMode` | `'default' \| 'flat'` | Anzeigemodus |
| `togglePosition` | `'before' \| 'after'` | Toggle-Position |

## Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `opened` | `EventEmitter<void>` | Panel geöffnet |
| `closed` | `EventEmitter<void>` | Panel geschlossen |
| `afterExpand` | `EventEmitter<void>` | Animation abgeschlossen (offen) |
| `afterCollapse` | `EventEmitter<void>` | Animation abgeschlossen (geschlossen) |

## Verwendungsbeispiel

```html
<mat-accordion multi>
  <mat-expansion-panel>
    <mat-expansion-panel-header>
      <mat-panel-title>Persönliche Daten</mat-panel-title>
      <mat-panel-description>Name und Adresse</mat-panel-description>
    </mat-expansion-panel-header>
    <p>Inhalt hier...</p>
    <mat-action-row>
      <button mat-button color="primary">Speichern</button>
    </mat-action-row>
  </mat-expansion-panel>
</mat-accordion>
```

## Besonderheiten / Gotchas

- `<ng-template matExpansionPanelContent>` für Lazy-Loading des Inhalts
- `MAT_EXPANSION_PANEL_DEFAULT_OPTIONS` für globale Standardkonfiguration
