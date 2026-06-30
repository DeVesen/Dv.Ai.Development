---
name: delivery-inspection
description: >
  Pruefung vor der Auslieferung — prueft ob alle Anforderungen/Wuensche/Requests des Users
  angegangen, umgesetzt und nichts vergessen wurde. 6 parallele Reviewer: Revisor (Requirements-Map),
  Skeptiker (Luecken), Normalo (Abnahme-Pragmatik), Dolmetscher (Fehlinterpretationen),
  Auftraggeber (finale Abnahme), Querdenker (YAGNI/Scope-Creep). Iterativer Loop bis sauber.
  Universell: Code-Features, Skill-Dateien, Dokumentation, Analysen, jede Art von Deliverable.
  Wird von feature-delivery als letzter Schritt vor Closure aufgerufen.
  Opt-out: kein-delivery-inspection, no-delivery-inspection, skip-delivery-inspection.
when_to_use: >
  Nach Fertigstellung eines Deliverables jeglicher Art — Code-Feature, Skill-Datei, Dokumentation,
  Analyse, Recherche, Bericht. Trigger: "delivery-inspection", "auslieferung pruefen",
  "vor auslieferung", "pruef ob alles umgesetzt", "delivery check", "ist alles erledigt",
  "pruef die auslieferung". Nicht bei einzelnen kleinen Edits oder laufenden Gespraechen ohne Deliverable.
---

# delivery-inspection

Pruefung vor der Auslieferung — stellt sicher dass alle Anforderungen erledigt, korrekt
verstanden und vollstaendig umgesetzt wurden. Kein Code-Qualitaets-Gate (das ist Sache von
feature-delivery) — sondern Anforderungserfuellung aus Besteller-Perspektive.

Universell einsetzbar: Code-Features, Skill-Dateien, Dokumentation, Analysen, jede Art von Deliverable.

---

## Reviewer-Rollen (6 parallele, unabhaengige Perspektiven)

**Revisor** — Anforderungs-Buchhalter
Mappt jeden Request 1:1 auf ein Deliverable. Zaehlt durch: wurde jede Anforderung adressiert?
Wurde jede Anforderung auch tatsaechlich geliefert? Listet unbehandelte oder nur teilweise
erledigte Punkte mit Nachweis. Grundlage ist die originale Anforderungsliste — nichts wird
implizit als erledigt angenommen.

**Skeptiker** — Lueckenjäger
Sucht aktiv nach dem was fehlt, halbfertig ist oder vergessen wurde. Fragt: "Was haette noch
getan werden muessen?" Priorisiert nach Auswirkung auf den User. Liefert Top-3-Ranking der
schlimmsten Luecken.

**Normalo** — Pragmatische Abnahme
Nimmt die Nutzerperspektive ein: Kann ich das Deliverable direkt produktiv einsetzen?
Ist es alltagstauglich? Wuerde ich als normaler Nutzer zufrieden sein? Gesamtbewertung +
Top-3 konkrete Handlungsempfehlungen.

**Dolmetscher** — Verstaendnis-Pruefung
Prueft ob Anforderungen korrekt *verstanden* wurden. Sucht nach Fehlinterpretationen,
Missverstaendnissen, zu weit oder zu eng ausgelegten Anforderungen. Prueft explizit: Wurden
Unklarheiten mit dem User abgestimmt — oder still entschieden? Jede still getroffene
Entscheidung ohne Rueckfrage ist ein potenzieller Befund.

**Auftraggeber** — Finale Abnahme
Strengste Perspektive: Wuerde ich das als Besteller so unterschreiben? Entspricht das meiner
Erwartungshaltung? Hat der Auftragnehmer das Richtige gebaut — nicht nur etwas Richtiges?
Gesamturteil: abnahmefaehig / nicht abnahmefaehig + Begruendung.

**Querdenker** — YAGNI-Waechter
Prueft die Gegenperspektive: Wurde zu viel gemacht? YAGNI verletzt? Nicht beauftragter
Boilerplate oder Abstraktionen eingebaut? Scope Creep entdeckt? Auch: Wurden Dinge entfernt
oder vereinfacht die der User behalten wollte? Meldet sowohl Zuviel als auch falsches Weglassen.

---

## Ablauf (iterativer Loop)

Loop laeuft solange bis alle 6 Reviewer keine behebbaren Findings mehr melden.

### Jede Iteration

**Schritt 1 — 6 Reviewer parallel**
Alle 6 Reviewer-Sub-Agents gleichzeitig beauftragen, unabhaengig voneinander.
Jeder erhaelt: die originale Anforderung/Request-Liste + das Deliverable (Diff, Dateien, Beschreibung).
Alle 6 Reports abwarten.
**Count-Guard:** erhalten: N/6 — nicht weiter bevor N=6. Erst wenn alle 6 Reports vorliegen, konsolidierten Gesamt-Report zurückgeben.

**Schritt 2 — Findings klassifizieren**
Alle Findings aus 6 Reports zusammenfuehren:
- **Eindeutig nachlieferbar** — fehlende Punkte, Fehlinterpretationen, vergessene Teile, die
  klar aus Kontext und Anforderung ableitbar sind
- **Klaerungsbeduerftig** — Findings bei denen die richtige Loesung eine inhaltliche Entscheidung
  des Users erfordert

**Schritt 3 — Gebuendelte Rueckfragen (wenn klaerungsbeduerftig)**
Alle klaerungsbeduerften Findings in einer einzigen Frage an den User:

> **Vor dem Fix — kurze Rueckfragen:**
>
> 1. [Punkt A] — [Kontext, warum unklar]
> 2. [Punkt B] — ...
>
> Antworten kurz genug, damit ich direkt weiterarbeiten kann.

Auf Antwort warten, bevor Fix beginnt.

**Schritt 4 — Nachliefern / Fixen**
Eindeutig nachlieferbare Findings sofort beheben.
Klaerungsbeduerftige Findings nach Erhalt der User-Antworten beheben.
Keine halben Fixes, keine TODOs hinterlassen.

**Schritt 5 — Iterations-Zusammenfassung**
- Anzahl Findings je Reviewer-Rolle
- Was wurde nachgeliefert / gefixt
- Was wurde nach User-Klaerung gefixt
- Startet naechste Iteration oder beendet Loop

**Schritt 6 — Abbruchbedingung**
Lieferten alle 6 Reviewer keine behebbaren Findings mehr → Loop endet.

**Hard Cap: 10 Runden.** Nach Runde 10 — unabhängig von offenen Findings — Loop stoppen und ausgeben:

---
## ⚠️ DELIVERY-INSPECTION NICHT VOLLSTÄNDIG ABGESCHLOSSEN

**Runden durchlaufen:** 10/10

**Offene Findings (nicht umgesetzt):**
[vollständige Liste aller noch offenen Findings aus dem letzten Durchlauf, je Reviewer-Rolle]

**Warum nicht umgesetzt:**
[Begründung je Finding — nicht lösbar ohne User-Entscheidung / technische Blockade / Zyklus erkannt]

**Empfehlung:** Diese Punkte vor der Auslieferung manuell prüfen.
---

Abschlussmeldung bei sauberem Abschluss:
> **Delivery-Inspection abgeschlossen** nach [N] Iteration(en).
> Alle 6 Perspektiven (Revisor · Skeptiker · Normalo · Dolmetscher · Auftraggeber · Querdenker)
> ohne offene Findings.

---

## Integration mit feature-delivery

Wenn von `feature-delivery` als letzter Schritt vor Closure aufgerufen:
- Findings gehen **nicht direkt an den User** — sondern an den `impl-loop-orchestrator`
- Orchestrator entscheidet: Fix-Scribe beauftragen oder an User eskalieren
- Erst nach sauberem Delivery-Inspection-Durchlauf: Closure

**Routing-Constraint (STORY-031):** Delivery-Inspection läuft immer im Foreground des aufrufenden Threads — Notifications und Reports gehen an den Main-Thread (impl-loop-orchestrator), **nicht** zurück an einen Background-Orchestrator. Kein eigenständiger Background-Spawn innerhalb von DI. (Ref: STORY-031)

---

## Opt-out

`kein-delivery-inspection` · `no-delivery-inspection` · `skip-delivery-inspection`

Bei Opt-out: Grund festhalten. Wenn von `feature-delivery` aufgerufen: im Closure-Protokoll vermerken.
