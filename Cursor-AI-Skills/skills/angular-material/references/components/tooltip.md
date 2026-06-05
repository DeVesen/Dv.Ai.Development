# Tooltip

**Kategorie:** Popups & Modals
**Selector:** `[matTooltip]`
**Import:** `MatTooltipModule` from `@angular/material/tooltip`; Standalone: `MatTooltip`
**URL:** https://material.angular.dev/components/tooltip/overview

## Übersicht

Schwebender Tooltip bei Hover (Desktop) oder langem Touch (Mobile). Verschwindet bei Mouse-Leave, Fokus-Verlust oder Escape. Position, Verzögerungen und Touch-Verhalten konfigurierbar.

## Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `matTooltip` | `string` | Tooltip-Text |
| `matTooltipPosition` | `'above'\|'below'\|'left'\|'right'\|'before'\|'after'` | Position |
| `matTooltipDisabled` | `boolean` | Deaktivieren |
| `matTooltipShowDelay` | `number` | Anzeigeverzögerung (ms) |
| `matTooltipHideDelay` | `number` | Ausblendverzögerung (ms) |
| `matTooltipTouchGestures` | `'auto'\|'on'\|'off'` | Touch-Verhalten |
| `matTooltipClass` | `string \| string[] \| object` | CSS-Klassen |

## Methoden (via Template-Referenz)

| Methode | Beschreibung |
|---------|-------------|
| `show(delay?, origin?)` | Anzeigen |
| `hide(delay?)` | Ausblenden |
| `toggle(origin?)` | Ein/Ausschalten |

## Verwendungsbeispiel

```html
<button mat-icon-button matTooltip="Einstellungen öffnen" matTooltipPosition="below">
  <mat-icon>settings</mat-icon>
</button>

<!-- Manuell -->
<span [matTooltip]="description" #myTooltip="matTooltip" (click)="myTooltip.toggle()">
  Info
</span>
```

## Besonderheiten / Gotchas

- Deaktivierte Buttons zeigen keinen Tooltip — Lösung: Wrapper-Span
  ```html
  <span [matTooltip]="'...'"><button disabled>...</button></span>
  ```
- `MAT_TOOLTIP_DEFAULT_OPTIONS` für globale Standardwerte
