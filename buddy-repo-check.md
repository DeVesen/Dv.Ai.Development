# Buddy Repo-Check — Ressourcen-Pipeline

Projekt-spezifische Pipeline für Buddy Phase `repo-check`.  
Ablage: **Repo-Root** (`./buddy-repo-check.md`). Buddy parst nur den Abschnitt `## Pipeline`.

## Regeln

- Nur Fragen aus `## Repo-Fragen` beantworten.
- Kein plan-agent. Kein Planning Workflow. Keine breite Repo-Tour.
- Am Ende immer: lokaler Code (bezogen auf offene Repo-Fragen).
- dev-filesystem-mcp (wenn einkommentiert): `read_class_summary` + `find_implementations` für offene Repo-Fragen.

## Pipeline

# Buddy liest: nicht-leere Zeilen unter ## Pipeline bis EOF / nächste ##-Überschrift.
# Zeilen die mit # beginnen (außer ##): ignoriert (Kommentare).
# Bekannte Schritte: code-review-mcp | dev-filesystem-mcp | Pfad zu .md-Datei
# Unbekannte Zeile → wird als "unbekannter Schritt" gemeldet, nicht geraten.

code-review-mcp
# dev-filesystem-mcp   ← einkommentieren für gezieltes Klassen-Lesen nach Index
# .cursor/references/<komponente>.md   ← einkommentieren für projektspezifische Referenz
