# Slide Toggle

**Kategorie:** Form Controls
**Selector:** `<mat-slide-toggle>`
**Import:** `MatSlideToggleModule` from `@angular/material/slide-toggle`; Standalone: `MatSlideToggle`
**URL:** https://material.angular.dev/components/slide-toggle/overview

## Übersicht

Ein/Aus-Schalter im Material Design-Stil mit Schiebe-Interaktionsmuster. Implementiert `ControlValueAccessor` für Angular Forms. Ab M3 kann ein Icon innerhalb des Toggles angezeigt werden.

## Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `checked` | `boolean` | Aktivierungszustand |
| `disabled` | `boolean` | Deaktivieren |
| `disabledInteractive` | `boolean` | Bleibt interaktiv wenn deaktiviert |
| `required` | `boolean` | Pflichtfeld |
| `labelPosition` | `'before' \| 'after'` | Label-Position |
| `hideIcon` | `boolean` | Icon im Toggle ausblenden |
| `disableRipple` | `boolean` | Ripple deaktivieren |
| `color` | `string` | Theme-Farbe (nur M2) |
| `name` | `string \| null` | Name-Attribut |

## Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `change` | `EventEmitter<MatSlideToggleChange>` | Wert geändert |
| `toggleChange` | `EventEmitter<void>` | Jede Betätigung |

## Verwendungsbeispiel

```html
<mat-slide-toggle [(ngModel)]="notifications" labelPosition="before">
  Benachrichtigungen aktivieren
</mat-slide-toggle>
```

## Besonderheiten / Gotchas

- `toggle()` und `focus()` als programmatische Methoden verfügbar
- `toggleChange` emittiert bei jeder Betätigung; `change` nur wenn Wert sich ändert
- `color` wirkt nur in M2; M3 nutzt Token-System
