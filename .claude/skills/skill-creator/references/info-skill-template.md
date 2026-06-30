# Info-Skill-Template

Ein Info-Skill dokumentiert für ein konkretes Repo **was, wo und wie** geändert werden soll.
Er dient als Referenz für ein Modell das den Edit vornimmt — kein Planning, keine Orchestrierung.

---

## Aufbau eines Info-Skills

### Pflicht-Sektionen

Jeder Info-Skill enthält mindestens:

| Sektion | Zweck |
|---------|-------|
| `## Kontext` | Warum existiert dieser Skill? Welches Problem löst er? |
| `## Zu ändern` | Genaue Dateipfade, Zeilenbereiche oder Muster — was konkret editiert wird |
| `## Rücknahme` | Pflicht bei deaktivierenden Skills — exakte Umkehranweisung: wie die Deaktivierung rückgängig gemacht wird |
| `## Verify` | **Pflicht** — Build-Check oder explizite Skip-Bedingung |

### Optionale Sektionen

| Sektion | Wann |
|---------|------|
| `## Hinweise` | Fallstricke, Abhängigkeiten, Seiteneffekte |

---

## Vollständiges Template

```markdown
---
name: [skill-name]
description: >
  [Ein Satz: was der Skill macht und wann er genutzt wird]
---

# [Skill-Titel]

[Ein Satz Kontext: warum existiert dieser Skill?]

---

## Kontext

[Warum wurde dieser Skill erstellt? Was ist der Auslöser?
Beispiel: "Search-Navigation-Buttons sollen ausgeblendet werden ohne sie zu löschen.
HTML-Kommentare erlauben reversibles Deaktivieren."]

---

## Zu ändern

**Datei:** `[relativer Pfad zur Datei]`

```html
<!-- Vorher: -->
[Original-Code-Block]

<!-- Nachher: -->
[Geänderter Code-Block]
```

[Weitere Dateien falls nötig]

---

## Rücknahme

*(Nur bei deaktivierenden Skills — weglassen wenn der Skill keine Deaktivierung beschreibt)*

[Exakte Umkehranweisung. Beispiel für HTML-Kommentar-Deaktivierung:]

Kommentarzeichen `<!-- ` und ` -->` entfernen. Keine weiteren Änderungen.

---

## Verify

`build_angular_project` auf `[Frontend-Pfad]` ausführen um Template-Syntaxfehler auszuschließen.
Kann übersprungen werden wenn [Skip-Bedingung — z.B. "Änderungen ausschließlich innerhalb
vollständiger Block-Grenzen — kein `@if`-Abschluss berührt"].
```

---

## Verify-Sektion: Detailregeln

Die `## Verify`-Sektion ist **immer vorhanden** — keine Ausnahme.

### Warum Pflicht?

HTML-Kommentare, Template-Änderungen und strukturelle Edits können Angular-Template-Syntax
brechen. Beispiel:

```html
<!-- Fehlerhafte Kommentar-Platzierung die den @else-Zweig abschneidet: -->
@if (!isOnSearchRoute) {
  <!-- <a ...>Search</a>
} @else {                   ← dieser Zweig ist jetzt Teil des Kommentars!
  <app-atlas-nav-group ...>
```

Ohne Build-Check bleibt dieser Fehler lautlos bis zum nächsten `ng serve`.

### Formulierungen

**Mit Skip-Bedingung** (wenn der Build-Check unter bestimmten Umständen entfallen kann):

```markdown
## Verify
`build_angular_project` auf `[Frontend-Pfad]` ausführen um Template-Syntaxfehler auszuschließen.
Kann übersprungen werden wenn [konkrete Bedingung].
```

**Ohne Skip-Bedingung** (Build-Check immer nötig):

```markdown
## Verify
`build_angular_project` auf `[Frontend-Pfad]` ausführen um Template-Syntaxfehler auszuschließen.
```

**Nicht-Angular-Projekte:**

```markdown
## Verify
Build ausführen: `[build-command]` auf `[Projekt-Pfad]`.
Kann übersprungen werden wenn [konkrete Bedingung].
```

### Ungültige Skip-Begründungen

Eine Skip-Bedingung muss strukturell nachweisbar sein — nicht nur plausibel klingen.

**Ungültig:** "Es sind nur HTML-Kommentare" — HTML-Kommentare können `@if`/`@else`-Blöcke
abschneiden (siehe Fehlerbeispiel oben). Diese Begründung klingt harmlos, ist aber genau das
Szenario das die Verify-Sektion verhinden soll.

**Gültig:** "Kommentare ausschließlich innerhalb vollständiger Block-Grenzen — kein `@if`-
Abschluss berührt" — das ist strukturell prüfbar anhand des Diff.

### Was die Sektion NICHT enthält

- Keine allgemeinen "teste gründlich"-Aufforderungen
- Keine mehrstufigen Test-Checklisten (→ das ist test-design, nicht Info-Skill)
- Keine vagen "prüfe ob alles korrekt ist"-Formulierungen

Die Sektion beschreibt **eine konkrete Verify-Aktion** — entweder Build-Check oder explizite
begründete Skip-Entscheidung.

