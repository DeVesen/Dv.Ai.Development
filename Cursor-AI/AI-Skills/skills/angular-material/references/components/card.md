# Card

**Kategorie:** Layout
**Selector:** `<mat-card>`
**Import:** `MatCardModule` from `@angular/material/card`; Standalone: `MatCard`, `MatCardHeader`, `MatCardContent`, `MatCardActions`, `MatCardFooter`, etc.
**URL:** https://material.angular.dev/components/card/overview

## Übersicht

Material Design-Container für zusammengehörige Inhalte. Bietet strukturierte Unterbereiche: Header, Titel, Untertitel, Bild, Inhalt, Aktionen und Footer. M3 unterstützt drei Erscheinungsbilder: `raised`, `outlined`, `filled`.

## Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `appearance` | `'outlined' \| 'raised' \| 'filled'` | Erscheinungsbild (M3) |

## Unterdirektiven

| Selektor | Beschreibung |
|---------|-------------|
| `<mat-card-header>` | Kopfbereich (Avatar, Titel, Untertitel) |
| `<mat-card-title>` | Kartentitel |
| `<mat-card-subtitle>` | Kartenuntertitel |
| `<mat-card-content>` | Hauptinhalt |
| `<mat-card-actions>` | Aktionsbereich (Buttons); `align`: `'start'\|'end'` |
| `<mat-card-footer>` | Fußbereich |
| `[mat-card-image]` | Hauptbild |
| `[mat-card-avatar]` | Avatar-Bild im Header |

## Verwendungsbeispiel

```html
<mat-card appearance="outlined">
  <mat-card-header>
    <img mat-card-avatar src="avatar.jpg" alt="Avatar">
    <mat-card-title>Max Mustermann</mat-card-title>
    <mat-card-subtitle>Softwareentwickler</mat-card-subtitle>
  </mat-card-header>
  <img mat-card-image src="photo.jpg" alt="Foto">
  <mat-card-content>
    <p>Beschreibungstext hier...</p>
  </mat-card-content>
  <mat-card-actions align="end">
    <button mat-button>Teilen</button>
    <button mat-button color="primary">Mehr</button>
  </mat-card-actions>
</mat-card>
```

## Besonderheiten / Gotchas

- M3: `raised` = Schatten, `outlined` = Border, `filled` = Hintergrundfarbe
- `MAT_CARD_CONFIG` für applikationsweite Standard-Appearance
