# Ripple

**Kategorie:** Buttons & Indicators
**Selector:** `[mat-ripple]`, `[matRipple]`
**Import:** `MatRippleModule` from `@angular/material/core`; Standalone: `MatRipple`
**URL:** https://material.angular.dev/components/ripple/overview

## Übersicht

Material Design-Welleffekt bei Klick oder Touch. Intern von vielen Material-Komponenten verwendet, direkt auf eigene Elemente anwendbar. Manuelle Auslösung über `launch()`-Methode möglich.

## Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `matRippleDisabled` | `boolean` | Ripple deaktivieren |
| `matRippleColor` | `string` | Farbe des Effekts |
| `matRippleCentered` | `boolean` | Immer vom Mittelpunkt |
| `matRippleUnbounded` | `boolean` | Außerhalb des Elements sichtbar |
| `matRippleRadius` | `number` | Radius in Pixel |
| `matRippleAnimation` | `RippleAnimationConfig` | Ein/Ausblend-Animation |
| `matRippleTrigger` | `HTMLElement` | Alternatives Trigger-Element |

## Verwendungsbeispiel

```html
<div matRipple class="my-button" (click)="doSomething()">
  Klick mich
</div>

<!-- Manuell auslösen -->
<div matRipple #ripple="matRipple">
  <button (click)="ripple.launch({centered: true})">Ripple</button>
</div>
```

## Besonderheiten / Gotchas

- Host-Element muss `position: relative` haben
- `MAT_RIPPLE_GLOBAL_OPTIONS` für globale Deaktivierung (Performance)
- `fadeOutAll()` und `fadeOutAllNonPersistent()` für programmatisches Ausblenden
