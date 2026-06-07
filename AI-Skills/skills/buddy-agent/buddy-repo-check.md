# Buddy Repo-Check — Ressourcen-Pipeline

Konfigurierbare MCP-/Ressourcen-Pipeline für Phase `repo-check`.  
Ablage: **Repo-Root** (`./buddy-repo-check.md`) — **nicht** unter `.cursor/`.

## Regeln

- Nur Fragen aus `## Repo-Fragen` beantworten.
- Kein plan-agent. Kein Planning Workflow. Keine breite Repo-Tour.
- Am Ende immer: lokaler Code (bezogen auf offene Repo-Fragen).

## Pipeline

# Buddy liest: nicht-leere Zeilen unter ## Pipeline bis EOF / nächste ##-Überschrift.
# Zeilen die mit # beginnen (außer ##): ignoriert (Kommentare).
# Bekannte Schritte: code-review-mcp | Pfad zu .md-Datei
# Unbekannte Zeile → wird als "unbekannter Schritt" gemeldet, nicht geraten.

code-review-mcp
# .cursor/references/<komponente>.md   ← einkommentieren für projektspezifische Referenz
