# Entscheidungshilfe

Für den Fall: keine Deklaration in der Projekt-`CLAUDE.md`, kein erkennbarer Bestand.

---

## Fragenkatalog vor der Entscheidung

Diese Fragen werden **gestellt**, nicht angenommen. Ohne Antwort ist jede Empfehlung geraten.

| # | Frage | Was sie entscheidet |
|---|-------|---------------------|
| 1 | Wie viele Teams deployen unabhängig voneinander? | Deployment-Achse — unter zwei Teams praktisch immer Modulith |
| 2 | Wie viel echte Fachlogik gibt es — Regeln, Invarianten, Zustandsübergänge? | Layering — ohne Regeln reicht Layered |
| 3 | Wie lange lebt das System? Wer wartet es in fünf Jahren? | Rechtfertigt Vorleistung oder verbietet sie |
| 4 | Gibt es Reporting oder Auswertungen mit anderen Zugriffsmustern? | Data-Flow — CQRS-Stufe 1/2 |
| 5 | Ist Historie fachlich gefordert oder nur „wäre schön"? | Event Sourcing ja/nein |
| 6 | Welche Fremdsysteme werden angebunden? | Ports — Hexagonal lohnt ab mehreren echten Adaptern |
| 7 | Gibt es gemessene Last-, Latenz- oder Locking-Probleme? | CQRS-Stufe 3/4 — ohne Messwert nein |
| 8 | Mandantenfähigkeit? Compliance-Datentrennung? | Kann Deployment und Persistenz fundamental ändern |
| 9 | Welche Änderung war zuletzt teurer, als sie hätte sein müssen? | Der eigentliche Hebel — bei Bestandssystemen die wichtigste Frage |

**Bei Bestandssystemen zuerst Frage 9.** Ohne konkreten Schmerz ist ein Umbau Ästhetik.

---

## Voreinstellung ohne besondere Gründe

Wenn nichts dagegen spricht — Geschäftsanwendung, ein Team, mittlere Fachlogik:

| Achse | Voreinstellung |
|-------|----------------|
| Layering | Onion mit benannten Use Cases; Vertical Slice als Ordnung im Modul |
| Deployment | Modularer Monolith mit CI-geprüften Grenzen |
| Data-Flow | CRUD + CQRS-Stufe 1 für Reporting; Outbox-Tabelle von Anfang an |

Das ist ein **Ausgangspunkt für die Diskussion**, kein Beschluss. Er wird genannt,
begründet und zur Bestätigung gestellt — nicht still gesetzt.

---

## Bestandssysteme: Umbau in Schritten

Big-Bang-Umbauten eines laufenden Systems zahlen sich fast nie aus. Reihenfolge nach
Ertrag pro Aufwand:

1. **Logik aus Controllern in benannte Use Cases** — inkrementell, Endpunkt für Endpunkt, kein Freeze. Der Großteil des Nutzens.
2. **Ordner nach Fachlichkeit statt nach Technik** — mechanisch, geringes Risiko.
3. **Getrennte Query-Pfade fürs Reporting** — CQRS-Stufe 1, lokal begrenzt.
4. **Ports für echte Fremdsysteme** — dort, wo ein zweiter Adapter existiert.
5. **Persistenz-Abstraktion** — zuletzt und nur bei belegtem Bedarf.

Nach 1–4 ist das System faktisch hexagonal, ohne dass ein Umbauprojekt stattgefunden hat.

**Erprobung am nächsten ohnehin anstehenden Modul**, nicht als eigenes Projekt.

---

## Trade-off-Matrix

| Treiber | Layering | Deployment | Data-Flow |
|---------|----------|------------|-----------|
| Viel Fachlogik | Onion/Clean | — | — |
| Dünnes CRUD | Layered | — | CRUD |
| Mehrere Teams | — | Microservices entlang Teamgrenze | — |
| Ein Team | — | Modulith | — |
| Reporting vorhanden | — | — | CQRS Stufe 1–2 |
| Gemessene Leselast | — | — | CQRS Stufe 3–4 |
| Fachliche Historiepflicht | — | — | Event Sourcing |
| Mehrere Ein-/Ausgänge | Hexagonal | — | — |
| Viele parallele Features | Vertical Slice | — | — |
| Unklare Domäne | Layered zunächst | Monolith | CRUD |

---

## Anti-Pattern

| Muster | Warum es schiefgeht |
|--------|---------------------|
| Achsen koppeln („Hexagonal, also Microservices") | Zahlt drei Preise für einen Nutzen |
| Stil ohne Deklaration wählen | Wird beim nächsten Feature neu diskutiert und anders beantwortet |
| Repository-Interface, das nur `DbSet<T>` durchreicht | Erfüllt DIP formal, verletzt es faktisch — die Abstraktion gehört dem Detail |
| Microservices bei einem Team | Betriebsaufwand ohne organisatorischen Gegenwert |
| Event Sourcing „für die Historie" | Audit-Tabelle löst dasselbe Problem für ein Zehntel des Preises |
| Port ohne zweiten Adapter | Tote Abstraktion, die bei jeder Änderung mitgepflegt wird |
| Modulgrenze nur im Wiki | Erodiert binnen Wochen — Grenze gehört in die CI |
| Big-Bang-Umbau am laufenden System | Monate ohne Fachwert, hohes Regressionsrisiko |
| Stil-Entscheidung nirgends festgehalten | Dieselbe Diskussion in sechs Monaten, mit anderem Ergebnis |

---

## Verhältnis zu `software-design-principles`

| Frage | Zuständig |
|-------|-----------|
| Wo verläuft die Kontextgrenze? | DDD — `software-design-principles` |
| Wird aus der Kontextgrenze eine Prozessgrenze? | Deployment-Achse hier |
| Wie sieht eine Methode innen aus? | IODA/IOSP — `software-design-principles` |
| Wohin zeigen Abhängigkeiten zwischen den Bausteinen? | Layering-Achse hier |

Der DDD-Schnitt hat Vorrang. Ein Stil, der ihn verletzt, ist falsch angewendet —
nicht der Schnitt falsch gewählt.
