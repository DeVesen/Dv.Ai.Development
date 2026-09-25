# Glossar-Ziel bestimmen

Für jeden geklärten Begriff, bevor er geschrieben wird.

1. **Begriff mit Code-Ziel, working-capturing verfügbar:** Zeigt der Begriff auf eine konkrete Stelle im Code (Ordner, Datei, Service, Symbol) und steht der Skill `dv-working-capturing:glossary` in der Skill-Liste dieser Session, ist das working-capturing-Glossar das Ziel.
   - Solche Begriffe werden ausschließlich über diesen Skill geschrieben, per Skill-Tool. Er bestimmt Ort und Format.
2. **Begriff ohne Code-Ziel oder working-capturing nicht verfügbar:** Ziel ist das eigene Glossar, `CONTEXT.md` im Repo-Root. Das gilt auch, wenn working-capturing verfügbar ist: Ein neuer Fachbegriff, für den es noch keinen Code gibt, gehört hierher.
   - Existiert `CONTEXT-MAP.md`, ist das Ziel das `CONTEXT.md` des Bereichs, zu dem der Begriff gehört. Den Pfad nennt die Map.
   - Format nach `context-format.md`.
   - Dateien erst anlegen, wenn der erste Begriff geklärt ist. Eine Sitzung ohne geklärten Begriff hinterlässt keine Datei.

Ist working-capturing verfügbar, zu Beginn zusätzlich die vorhandenen Modul- und Feature-Profile lesen. Ihren Ort nennt die Projekt-`CLAUDE.md`.

Das Ziel je Begriff nennen, mit Beleg: die Code-Fundstelle und welcher Skill in der Liste stand, oder dass kein Code-Ziel existiert.
