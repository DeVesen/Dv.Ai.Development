---
name: architecture-styles
description: >
  Use when an architecture style is discussed, chosen, questioned or documented:
  Layered, Onion, Clean Architecture, Hexagonal, Ports and Adapters, Vertical Slice,
  Monolith, Modulith, Microservices, CRUD, CQRS, Event Sourcing, Event-Driven.
  Also when a greenfield project needs a cut, an existing system should be restructured,
  or a style question appears inside a review.
  Nachschlagewerk, kein Default — die verbindliche Wahl steht in der Projekt-CLAUDE.md.
  Triggers: @architecture-styles, Architektur-Stil, Hexagonal, Clean Architecture,
  Onion, Vertical Slice, Modulith, Microservices, CQRS, Event Sourcing,
  Schichten, Bounded-Context-Deployment, "welche Architektur", "sollen wir umbauen".
  Opt-out: ohne architecture-styles.
---

# Architektur-Stile

Dieser Skill **legt keinen Stil fest** — Katalog und Entscheidungshilfe.
Verbindlich ist allein die Deklaration im Projekt.

Design-Prinzipien (DDD, IODA/IOSP, SOLID, Flow Design) bleiben im Skill
`software-design-principles`: der ist normativ, dieser deskriptiv.
Ein DDD-Schnitt hat Vorrang vor jedem Stil-Etikett.

---

## Drei orthogonale Achsen

Keine Liste zum Auswählen, sondern drei unabhängige Entscheidungen.
Jede Antwort benennt die betroffene Achse — und nur die.

| Achse | Frage | Auswahl |
|-------|-------|---------|
| **Layering** | Wie verlaufen Abhängigkeiten im Code? | Layered · Onion · Clean · Hexagonal · Vertical Slice |
| **Deployment** | Was ist eine Deploy-Einheit? | Monolith · Modularer Monolith · Microservices |
| **Data-Flow** | Wie fließen Lesen und Schreiben? | CRUD · CQRS · Event Sourcing · Event-Driven |

Hexagonal erzwingt keine Microservices. CQRS erzwingt kein Event Sourcing.
Microservices erzwingen kein Hexagonal. Wer die Achsen koppelt, kauft Kosten ohne Gegenwert.

---

## Antwort-Kontrakt

Jede Antwort, die einen Stil empfiehlt, bewertet oder anwendet, besteht aus drei Teilen — in dieser Reihenfolge:

**1 Fundstelle.** Zuerst die Projekt-`CLAUDE.md` auf einen `## Architektur`-Block lesen.
Ergebnis in einem Satz nennen, bevor irgendetwas empfohlen wird:

- Block vorhanden → *„Projektvorgabe: `<Achse: Wert>`."* Diese gilt. Der Skill dient nur noch dem Nachschlagen.
- Kein Block, Codebase zeigt erkennbaren Stil → *„Keine Deklaration; Codebase folgt faktisch `<Stil>`."* An diesem bleiben.
- Kein Block, kein erkennbarer Stil (Greenfield) → *„Keine Deklaration, kein Bestand."* Weiter mit Teil 2.

**2 Sachteil.** Achse benennen, dann die Optionen mit ihren Kosten. Bei Greenfield ohne
Deklaration: die offenen Fragen aus `references/decision-guide.md` **stellen**, statt still zu entscheiden.
Bei Bestandssystemen zusätzlich den inkrementellen Weg zeigen — Big-Bang-Umbau ist eine eigene, teure Entscheidung.

**3 Verankerung.** Jede getroffene Stil-Entscheidung endet mit dem `CLAUDE.md`-Block unten als
Vorschlag zum Übernehmen. Auch ein bewusstes „bleibt wie es ist" wird verankert.

---

## Deklarations-Format für die Projekt-CLAUDE.md

Alle drei Achsen stehen im Block. Jede Zeile hat genau zwei zulässige Formen:

| Fall | Zeile |
|------|-------|
| Der Nutzer hat die Achse beantwortet oder bestätigt | `\| Layering \| Hexagonal \| Domäne frei von EF Core \|` |
| Alles andere — nicht gefragt, unbeantwortet, oder als offene Frage im Sachteil genannt | `\| Deployment \| — (offen) \| Deployen mehrere Teams unabhängig? \|` |

**Prüfung vor dem Absenden:** Steht eine Achse im Sachteil unter den offenen Fragen,
steht sie im Block auf `— (offen)`. Beides gleichzeitig auszufüllen ist ein Widerspruch
in derselben Antwort.

Eine plausible Vermutung ist kein Fall 1. Eine geratene Zeile ist schlechter als eine offene:
sie sieht entschieden aus und wird nie wieder hinterfragt.

```markdown
## Architektur

| Achse | Entscheidung | Begründung |
|-------|--------------|-----------|
| Layering | Hexagonal | Domäne frei von EF Core |
| Deployment | — (offen) | Deployen mehrere Teams unabhängig? |
| Data-Flow | CRUD + CQRS-Read | Reporting braucht eigene Read-Models |

Detail-Nachschlag: Skill `architecture-styles`
```

---

## Referenzen

Nur die benötigte Datei laden.

| Thema | Datei |
|-------|-------|
| Layered, Onion, Clean, Hexagonal, Vertical Slice | [references/layering.md](references/layering.md) |
| Monolith, Modularer Monolith, Microservices | [references/deployment.md](references/deployment.md) |
| CRUD, CQRS-Stufen, Event Sourcing, Event-Driven | [references/data-flow.md](references/data-flow.md) |
| Fragenkatalog, Trade-off-Matrix, Anti-Pattern | [references/decision-guide.md](references/decision-guide.md) |

---

## Opt-out

`ohne architecture-styles` → Skill nicht laden.
