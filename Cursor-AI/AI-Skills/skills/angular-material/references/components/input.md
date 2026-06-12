# Input

**Kategorie:** Form Controls
**Selector:** `input[matInput]`, `textarea[matInput]`, `select[matNativeControl]`
**Import:** `MatInputModule` from `@angular/material/input`; Standalone: `MatInput`
**URL:** https://material.angular.dev/components/input/overview

## Übersicht

Die `matInput`-Direktive fügt einem nativen `<input>` oder `<textarea>` Material Design-Verhalten hinzu für die Verwendung innerhalb von `<mat-form-field>`. Implementiert `MatFormFieldControl` und übermittelt Zustandsänderungen. Unterstützt alle HTML-Eingabetypen sowie Autosize für Textareas.

## Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `disabled` | `boolean` | Deaktivieren |
| `id` | `string` | Element-ID |
| `placeholder` | `string` | Platzhaltertext |
| `required` | `boolean` | Pflichtfeld |
| `type` | `string` | Input-Typ (text, email, number, etc.) |
| `value` | `string` | Aktueller Wert |
| `readonly` | `boolean` | Nur-Lesen-Modus |
| `errorStateMatcher` | `ErrorStateMatcher` | Steuert Fehleranzeige |
| `disabledInteractive` | `boolean` | Bleibt interaktiv wenn deaktiviert |

## Verwendungsbeispiel

```html
<mat-form-field>
  <mat-label>Benutzername</mat-label>
  <input matInput type="text" formControlName="username"
         placeholder="max.mustermann">
</mat-form-field>

<!-- Textarea mit Autosize -->
<mat-form-field>
  <mat-label>Nachricht</mat-label>
  <textarea matInput cdkTextareaAutosize
            cdkAutosizeMinRows="3" cdkAutosizeMaxRows="10"
            formControlName="message"></textarea>
</mat-form-field>
```

## Besonderheiten / Gotchas

- Textarea-Autosize: `CdkTextareaAutosize` aus `@angular/cdk/text-field` zusätzlich importieren
- `type="number"`: Werte werden als `string` geliefert — Konvertierung im Formular nötig
- Styling erfolgt über das übergeordnete `<mat-form-field>`
