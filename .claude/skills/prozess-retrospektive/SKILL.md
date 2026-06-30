---
name: prozess-retrospektive
description: >
  Analysiert den Arbeitsprozess der aktuellen Session und liefert konkrete Verbesserungsideen
  fuer den Harness. Prueft: MCP-Call-Qualitaet (Timeouts, Fallbacks, Failures), Orchestrierungs-
  Effizienz (Gates, Runden, Blockaden), Reviewer-Qualitaet (Findings vs. Rauschen — generisch,
  unabhaengig von Anzahl/Namen der Reviewer), Reibungspunkte (Nutzer-Eingriffe, Klaerungs-
  bedarfe), Delivery-Inspection-Loop-Effizienz, Session-Erkenntnisse (was war entscheidend,
  ueberraschend, welche Muster zeigen sich). Output: strukturierter Bericht mit priorisierten,
  umsetzbaren Harness-Verbesserungsideen inkl. Verweis auf konkrete Skill/Agent-Dateien.
  Opt-out: kein-retrospektive, no-retrospektive, skip-retrospektive.
when_to_use: >
  Wenn der Nutzer den Arbeitsprozess einer Session analysieren und Verbesserungsideen fuer das
  Tooling erhalten moechte. Trigger: "prozess-retrospektive", "retrospektive", "prozess analyse",
  "harness verbessern", "was koennen wir verbessern", "prozess pruefen", "wie lief das",
  "was haben wir gelernt", "was war ueberraschend", "erkenntnisse", "learnings", "session insights".
  Sinnvoll nach feature-delivery, delivery-inspection oder jeder anderen laengeren Session.
  Kein automatischer Trigger — immer explizit aufgerufen.
---

# prozess-retrospektive

Analyse des Arbeitsprozesses — nicht was geliefert wurde, sondern **wie** es lief.
Liefert konkrete, umsetzbare Ideen um den Harness (Skills, Agents, MCP-Server) zu verbessern.

Ein einziger Analyse-Agent — kein Fan-out. Der Agent braucht den Gesamtblick ueber die Session,
keine parallelen Teilperspektiven.

---

## Analyse-Bereiche

### 1 — MCP-Call-Qualitaet

- Welche MCP-Tools wurden aufgerufen?
- Gab es Timeouts, Verbindungsfehler, unerwartete Fehler?
- Musste auf Shell-Fallback ausgewichen werden (Anti-Shortcut-Verstoesse)?
- Wurden Tools mehrfach aufgerufen weil das erste Ergebnis unbrauchbar war?
- Gab es Tools die haetten genuetzt haetten aber nicht aufgerufen wurden?

### 2 — Orchestrierungs-Effizienz

- Wurden Gates uebersprungen oder unnoetig wiederholt?
- Gab es Blockaden durch Abhaengigkeiten zwischen Slices/Agents?
- Wie viele Scribe-Runden liefen? War das verhaeltnismaessig?
- Gab es unnoetige sequenzielle Schritte die parallel haetten laufen koennen?
- Hard Stops: warum, und haette der Flow das frueher erkennen koennen?

### 3 — Reviewer-Qualitaet (generisch)

Unabhaengig davon welche Reviewer liefen (Anzahl und Namen variieren je Skill):

- Welche Reviewer-Rollen lieferten echte, nicht-triviale Findings?
- Welche Rollen meldeten hauptsaechlich Rauschen oder Duplikate?
- Gab es Ueberschneidungen zwischen Rollen die auf Redundanz hinweisen?
- Wurden Findings korrekt als "eindeutig fixbar" vs. "klaerungsbeduerftig" klassifiziert?
- Wie viele Iterationen brauchte der Review-Loop und warum?

### 4 — Reibungspunkte

- Wo musste der Nutzer eingreifen, klaren oder entsperren?
- Welche Fragen haetten durch bessere Planung vermieden werden koennen?
- Gab es Missverstaendnisse zwischen Anforderung und Umsetzung die sich haetten vermeiden lassen?
- Wo hat der Nutzer Entscheidungen getroffen die eigentlich der Harness haette antizipieren koennen?

### 5 — Delivery-Inspection-Loop

- Wie viele Iterationen liefen?
- Welche Reviewer-Rollen fanden die meisten Findings?
- Gab es Findings die immer wieder auftauchten (Muster)?
- War der Loop-Abbruch sauber oder blieben Punkte offen?

### 6 — Session-Erkenntnisse

- Was war entscheidend fuer den Erfolg oder Misserfolg der Session?
- Was war ueberraschend — positiv oder negativ?
- Welche Muster zeigen sich (wiederkehrende Probleme, erfolgreiche Ansaetze)?
- Was sollte beim naechsten Mal anders angegangen werden?

---

## Scope-Check vor Analyse

Vor der Analyse die Tabelle auswerten: Jede zutreffende Bedingung reduziert den betroffenen Bereich auf je einen Satz — volle Tiefe nur in Bereichen, in denen tatsächlich etwas stattgefunden hat.

| Wenn … | Bereiche | Ausgabe-Satz |
|--------|----------|--------------|
| Kein MCP aufgerufen | MCP-Call-Qualität | „Keine MCP-Calls in dieser Session." |
| Keine Hard Stops | Orchestrierungs-Effizienz | „Keine Hard Stops — Flow lief ohne Blockaden." |
| Kein Review gelaufen | Reviewer-Qualität + Delivery-Inspection-Loop | je 1 Satz: „Kein Review-Loop in dieser Session." / „Keine Delivery-Inspection in dieser Session." |

Trifft keine Bedingung zu, werden alle Bereiche mit voller Tiefe analysiert.

---

## Ablauf

**Schritt 1 — Kontext sammeln**
Den Verlauf der Session analysieren: welche Skills liefen, welche Agents, welche MCP-Calls,
welche Findings, wie viele Runden, wo gab es Stopper.

**Schritt 2 — Analyse je Bereich**
Alle 5 Bereiche systematisch durchgehen. Pro Bereich: Befund + Bewertung (gut / verbesserbar / problematisch).

**Schritt 3 — Verbesserungsideen ableiten**
Aus jedem Befund eine konkrete, umsetzbare Idee ableiten:
- Was genau aendern?
- In welcher Datei (Skill / Agent / MCP-Server)?
- Welchen Effekt wuerde die Aenderung haben?

**Schritt 4 — Bericht ausgeben**

---

## Bericht-Format

```
## Prozess-Retrospektive — [Session-Kurztitel]

### Gesamteindruck
[2-3 Saetze: wie lief die Session insgesamt, was war stark, was war schwach]

### Befunde

#### MCP-Call-Qualitaet
[Befunde + Bewertung]

#### Orchestrierungs-Effizienz
[Befunde + Bewertung]

#### Reviewer-Qualitaet
[Befunde + Bewertung — generisch, ohne Annahmen ueber feste Reviewer-Sets]

#### Reibungspunkte
[Befunde + Bewertung]

#### Delivery-Inspection-Loop
[Befunde + Bewertung — nur wenn delivery-inspection in der Session lief]

#### Session-Erkenntnisse
[Was war entscheidend / ueberraschend — Muster die sich zeigen — was naechstes Mal anders]

### Verbesserungsideen (priorisiert)

| Prioritaet | Idee | Datei | Erwarteter Effekt |
|-----------|------|-------|------------------|
| Hoch | ... | ... | ... |
| Mittel | ... | ... | ... |
| Niedrig | ... | ... | ... |

### Fazit
[1 Satz: lohnt sich eine Verbesserungsrunde jetzt oder spaeter?]
```

---

---

## MCP-Kontext fuer die Analyse

Alle drei MCPs gehoeren zum Dev-Tooling-Spektrum dieser Harness-Umgebung:

| MCP | Zweck | Skill |
|-----|-------|-------|
| `dev-mcp` | Dateien, Build, Test, Scaffolding, Git, Patch | [dev-mcp](../dev-mcp/SKILL.md) |
| `codebase-analyzer` | Index, Review, Analyse, Metriken, Composite | [codebase-analyzer](../codebase-analyzer/SKILL.md) |
| `build-log-filter` | Shell-Logs: ng serve, Shell-Fallback | [build-log-filter](../build-log-filter/SKILL.md) |

Routing-Einstieg: [`dev-tooling`](../dev-tooling/SKILL.md)

Bei der Analyse von MCP-Call-Qualitaet immer das volle Spektrum beruecksichtigen — nicht nur den genutzten MCP, sondern auch ob ein anderer MCP besser gepasst haette.

---

## Opt-out

`kein-retrospektive` · `no-retrospektive` · `skip-retrospektive`
