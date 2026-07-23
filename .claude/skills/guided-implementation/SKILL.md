---
name: guided-implementation
description: >
  Use when implementing any feature, workflow, or non-trivial change that
  benefits from structured design-before-code. Triggers: /guided, /gdi,
  "brainstorming machen", "lass uns das planen", "mit Plan umsetzen",
  "strukturiert angehen". Opt-out: ohne guided.
---

# Guided Implementation — Brainstorming → Plan → Code

Drei harte Phasen. Niemals in die nächste Phase ohne explizite User-Bestätigung.

<HARD-GATE>
Kein Code, kein Scaffolding, keine Dateiänderungen bis Phase 3 und der User
hat den Plan bestätigt. Diese Regel gilt auch wenn die Aufgabe einfach wirkt.
</HARD-GATE>

---

## Phase 1 — Brainstorming

1. **Kontext lesen** — relevante Dateien, aktuelle Commits, bestehende Muster
2. **Eine Frage auf einmal** — Zweck, Constraints, Erfolgskriterien
   - Mehrfachauswahl bevorzugen wenn möglich
   - Exakt **eine** Frage pro Nachricht — auf Antwort warten, dann nächste
3. **2–3 Ansätze vorschlagen** mit Trade-offs und Empfehlung
4. **Design präsentieren** — abschnittsweise, nach jedem Abschnitt Feedback holen
5. **Entscheidungen zusammenfassen** — ein Satz pro Entscheidung

Abschluss: „Brainstorming abgeschlossen — soll ich den Plan erstellen?"  
Warten bis User bestätigt.

---

## Phase 2 — Plan

Konkreter Implementierungsplan:

- **Dateistruktur:** welche Dateien werden erstellt / geändert (exakte Pfade)
- **Aufgaben in Reihenfolge**, jede mit:
  - Exakten Dateipfaden
  - Acceptance-Kriterien
  - Abhängigkeiten zu anderen Aufgaben

Plan vollständig zeigen — warten auf: „Go" / „umsetzen" / explizite Zustimmung.

---

## Phase 3 — Implementierung

Aufgabe für Aufgabe umsetzen. Commit-Nachricht präsentieren, **nie** selbst committen.

---

## Schlüsselprinzipien

- **Eine Frage, eine Antwort** — kein Fragebogen-Dump
- **YAGNI** — keine spekulativen Features ins Design
- **Gate bleibt Gate** — auch bei scheinbar einfachen Aufgaben nie überspringen
