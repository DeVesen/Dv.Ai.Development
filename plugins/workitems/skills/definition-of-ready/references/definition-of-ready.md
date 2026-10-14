Definition of Ready
Zweck
Die Definition of Ready beschreibt den Mindeststand, ab dem ein PBI in einem Iteration Planning für die Implementierung ausgewählt werden darf. Sie verhindert vermeidbare Rückfragen und Übergabeverluste, ohne Discovery und Delivery künstlich zu trennen.
`Ready` bedeutet nicht, dass keine neue Erkenntnis mehr entstehen kann. Es bedeutet, dass das Team Ziel, Lösung und Prüfbarkeit ausreichend gemeinsam verstanden hat, um verantwortbar mit der Umsetzung zu beginnen.
Kriterien für ein Backlog Item
Ein Backlog Item ist `Ready`, wenn alle zutreffenden Kriterien erfüllt sind:
Produkt und Fachlichkeit (RE)

* Use Case vollständig beschrieben: Problem, Zielgruppe, Nutzen, erwartetes Ergebnis, Business Process und Rollen sind bekannt
* Erkennbarer fachlicher Nutzen/Geschäftswert benannt und begründet
* Eindeutig und widerspruchsfrei formuliert; atomar genug für Priorisierung und Nachverfolgung
* Akzeptanzkriterien konkret, beobachtbar, vollständig, eindeutig und testbar (Format `AC-xx` oder Gherkin)
* Fachliche Regeln, Begriffe und relevante Daten geklärt oder als Entscheidung adressiert; relevante Geschäftsregeln und Ausnahmefälle (Edge Cases) dokumentiert
* Scope sowie explizite Nicht-Ziele benannt
* Mit einer abgestimmten Produktvision oder einem PRD verknüpft; Quelle und fachlicher Ansprechpartner benannt (`source_links`, `source_prd`)
* Fachliche Abhängigkeiten, Risiken und offene Fragen dokumentiert; keine offenen kritischen Blocker. Verbleibende Risiken haben eine benannte verantwortliche Person und eine vereinbarte Maßnahme
* Fachliche Freigabe bzw. Abstimmung mit Product Owner/TRUMPF dokumentiert, soweit zu diesem Zeitpunkt erforderlich
* Fachliche, gestalterische und technische Perspektive wurden gemeinsam betrachtet, nicht nur einzeln je Fachbereich
* Wesentliche Annahmen wurden validiert oder ausdrücklich als bewusstes Risiko dokumentiert

UX / Design (nur bei Items mit UI-/Frontend-Anteil)

* UI-Design deckt alle Task Flows des Use Case ab (Solution Concept/Prototyp verlinkt); nicht abgedeckte Flows sind benannt
* Wesentliche Designentscheidungen als Design Decision Record (Begründung, geprüfte Alternativen) dokumentiert und verlinkt
* Design-Review mit Product Trio und mindestens einem TRUMPF-Stakeholder oder Nutzer durchgeführt
* Data Flow und Architekturdetails des Designs sind mit Solution Architecture und ADRs konform (Abweichungen als ADR erfasst)
* Neue oder geänderte Design-System-Komponenten sind als Component-Note bzw. Spec-Gap-Eintrag beschrieben
* Bei Items ohne UI-Anteil: Entfall des UI-Teils ist begründet dokumentiert; Data-Flow- und Architekturprüfung bleiben Pflicht

Lösung und Machbarkeit

* Fachliche, gestalterische und technische Perspektive wurden gemeinsam betrachtet.
* Erforderliche User Flows, UX-Zustände und Designs sind vorhanden oder für die Umsetzung ausreichend beschrieben.
* Architektur, Schnittstellen, Datenquellen und technische Leitplanken sind geklärt.
* Datenschutz, Informationssicherheit, Barrierefreiheit und weitere Compliance-Anforderungen wurden geprüft.
* Wesentliche Annahmen wurden validiert oder als bewusstes Risiko dokumentiert.

Planung und Nachvollziehbarkeit

* Abhängigkeiten, benötigte Entscheidungen und externe Mitwirkungen sind sichtbar.
* Kritische Blocker sind beseitigt; verbleibende Risiken besitzen Verantwortliche und Maßnahmen.
* Das PBI ist so geschnitten, dass innerhalb einer Iteration ein überprüfbares Ergebnis möglich ist.
* Erwartete Tests und der Nachweis für die Review sind beschrieben.
* Betroffene Anforderungen, Konzepte, Entscheidungen und Spezifikationen sind per Wikilink verbunden.
* Product Team und mindestens eine Vertretung der Umsetzung teilen das Verständnis.

Anwendung

1. Die Kriterien werden im Product Refinement am PBI geprüft.
2. Nicht zutreffende Kriterien werden bewusst als „nicht zutreffend“ begründet, nicht still übersprungen.
3. Offene Punkte bleiben am Feature oder in verknüpften Backlog Items sichtbar.
4. Erst nach gemeinsamer Bestätigung setzt das Product Team den Status auf `Ready`.
5. Das Iteration Planning darf nur PBIs mit Status `Ready` für die Implementierung auswählen.
6. Neue Erkenntnisse während der Umsetzung werden transparent bewertet. Ein schwerwiegender Verlust der
Umsetzungsreife führt zurück in Refinement und Planung.

Abgrenzung

* Discovery-Arbeit darf vor `Ready` geplant und ausgeführt werden.
* Ein `Ready`-Feature ist noch nicht automatisch Bestandteil der nächsten Iteration.
* Zeitdruck ersetzt kein Kriterium. Bewusste Abweichungen benötigen eine dokumentierte Risikoentscheidung.
* Die Definition of Done regelt den Abschluss nach der Umsetzung.
