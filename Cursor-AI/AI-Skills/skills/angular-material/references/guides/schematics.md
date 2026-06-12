# Schematics (Installation und Code-Generierung)

**URL:** https://material.angular.dev/guide/schematics

## Zusammenfassung

Angular Material und CDK werden mit Angular CLI Schematics ausgeliefert. `ng add` installiert und richtet das Projekt ein. Weitere Schematics generieren vorgefertigte UI-Muster.

## Kernpunkte

- **ng add**: Installiert Angular Material + CDK, führt Setup-Schematic aus
- **Component Schematics**: address-form, navigation, dashboard, table, tree
- **CDK Schematics**: drag-drop
- **theme-color**: Generiert M3-Farbpaletten-Datei aus Eingabefarbe

## Code-Beispiele

```bash
# Installation
ng add @angular/material
ng add @angular/cdk

# Komponenten generieren
ng generate @angular/material:address-form <component-name>
ng generate @angular/material:navigation <component-name>
ng generate @angular/material:table <component-name>
ng generate @angular/material:dashboard <component-name>
ng generate @angular/material:tree <component-name>
ng generate @angular/cdk:drag-drop <component-name>
ng generate @angular/material:theme-color
```

| Schematic | Beschreibung |
|-----------|-------------|
| `address-form` | Formular mit Material Form Controls für Lieferadresse |
| `navigation` | Responsive Sidenav + Toolbar |
| `dashboard` | Grid mit Material Cards und Menüs |
| `table` | Data Table mit Sorting und Pagination |
| `tree` | Interaktive Ordnerstruktur mit `<mat-tree>` |
| `drag-drop` | CDK Drag-and-Drop To-do-Liste |

## Wichtige Hinweise

- `ng add` auf bereits konfigurierten Projekten führt nur fehlende Schritte aus
- `theme-color` Schematic hat eigene umfangreiche Dokumentation
