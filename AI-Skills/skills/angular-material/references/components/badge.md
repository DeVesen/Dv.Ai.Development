# Badge

**Kategorie:** Buttons & Indicators
**Selector:** `[matBadge]`
**Import:** `MatBadgeModule` from `@angular/material/badge`; Standalone: `MatBadge`
**URL:** https://material.angular.dev/components/badge/overview

## Übersicht

Direktive die einem beliebigen Element einen kleinen informativen Badge hinzufügt (z.B. Anzahl ungelesener Nachrichten). Erscheint als kleiner Kreis mit Text an konfigurierbaren Positionen. Eignet sich für Icons, Buttons und Listeneinträge.

## Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `matBadge` | `string \| number \| undefined \| null` | Badge-Inhalt |
| `matBadgePosition` | `MatBadgePosition` | Position: `'above after'\|'above before'\|'below before'\|'below after'\|'before'\|'after'\|'above'\|'below'` |
| `matBadgeSize` | `'small' \| 'medium' \| 'large'` | Größe |
| `matBadgeColor` | `ThemePalette` | Farbe (nur M2) |
| `matBadgeOverlap` | `boolean` | Badge überlappt Host-Element |
| `matBadgeHidden` | `boolean` | Badge ausblenden |
| `matBadgeDisabled` | `boolean` | Badge deaktivieren |
| `matBadgeDescription` | `string` | ARIA-Beschreibung |

## Verwendungsbeispiel

```html
<button mat-icon-button [matBadge]="unreadCount"
        matBadgePosition="above after"
        matBadgeColor="warn"
        [matBadgeHidden]="unreadCount === 0"
        aria-label="Benachrichtigungen">
  <mat-icon>notifications</mat-icon>
</button>
```

## Besonderheiten / Gotchas

- `matBadgeDescription` über `aria-describedby` — wichtig für Screen Reader
- `null`/`undefined` als Inhalt: Badge wird automatisch ausgeblendet
- `MAT_BADGE_CONFIG` für applikationsweite Defaults
