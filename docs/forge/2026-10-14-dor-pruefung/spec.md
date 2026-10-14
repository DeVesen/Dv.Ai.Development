# Definition-of-Ready-Prüfung für Requirements, Specs und Pläne

Status: bestätigt am 2026-10-14
Art: frei
Basis: 9f98256

## Was, wie, wo, warum
Es entsteht ein Skill, der ein Artefakt (Requirement, Steps, Spec, Plan oder Workitem) gegen die Definition of Ready des Teams prüft und Lücken benennt. Der Skill ist ein Vorab-Prüfer: Er liefert eine Empfehlung, ob das Artefakt bereit für den Review ist. Das eigentliche „Ready“ vergibt später ein Mensch oder Team im Review, bevor die Entwicklung (Spec, Plan, Umsetzung) beginnt. · Aussage

Der Skill ersetzt weder das Erstellen noch das Grillen von Requirements und Specs; das bleibt bei den vorhandenen Skills `requirement-definition` und `spec-whiteboarding`. Er prüft deren Ergebnisse und fragt bei Lücken gezielt nach, erzeugt aber selbst keinen Entwurf. · Aussage

Nutzen: Rückfragen und Übergabeverluste zwischen Refinement und Umsetzung werden vermieden, weil Lücken vor dem Review sichtbar sind. · Anhang

## Theoretisches Verhalten nach Umsetzung
Der Anwender übergibt ein Artefakt, das im Chat steht oder als Datei vorliegt, und startet die Prüfung. Der Skill erkennt die Art des Artefakts und prüft es einzeln oder, auf Wunsch, im Paket mit den zugehörigen Artefakten. Je Kriterium des Katalogs gibt er ein Urteil mit Begründung aus, fragt nach, wo sich ein Kriterium aus dem Text nicht beurteilen lässt, und schließt mit einer Empfehlung samt Lückenliste. Das Ergebnis steht im Chat; der Anwender entscheidet selbst, ob er es ablegt. · Aussage

Wird ein Artefakt später aus der Umsetzung heraus erneut geprüft, zeigt der Skill an, welche Kriterien nicht mehr erfüllt sind. · Anhang

## Soll-Vorgaben
- Der Katalog der Definition of Ready bleibt wortgleich maßgeblich. Der Skill ändert ihn nicht; Verbesserungen kann er höchstens als Hinweis nennen. · Aussage
- Produkt und Fachlichkeit: Use Case vollständig beschrieben (Problem, Zielgruppe, Nutzen, erwartetes Ergebnis, Business Process, Rollen); fachlicher Nutzen benannt und begründet; eindeutig, widerspruchsfrei und atomar; Akzeptanzkriterien konkret, beobachtbar, vollständig, eindeutig, testbar (Format AC-xx oder Gherkin); Regeln, Begriffe, Daten und Ausnahmefälle geklärt; Scope und Nicht-Ziele benannt; mit Produktvision oder PRD verknüpft, Quelle und Ansprechpartner benannt; Abhängigkeiten, Risiken, offene Fragen dokumentiert, keine kritischen Blocker, Restrisiken mit Verantwortlichen und Maßnahme; fachliche Freigabe dokumentiert, soweit nötig; fachliche, gestalterische und technische Perspektive gemeinsam betrachtet; wesentliche Annahmen validiert oder als bewusstes Risiko dokumentiert. · Anhang
- UX/Design, nur bei UI-Anteil: UI-Design deckt alle Task Flows ab; wesentliche Designentscheidungen mit Begründung und Alternativen dokumentiert; Design-Review mit Product Trio und mindestens einem Stakeholder oder Nutzer durchgeführt; Data Flow und Architektur des Designs konform zu Solution Architecture und ADRs; neue oder geänderte Design-System-Komponenten beschrieben. Ohne UI-Anteil entfällt der UI-Teil begründet, die Prüfung von Data Flow und Architektur bleibt Pflicht. · Anhang
- Lösung und Machbarkeit: Perspektiven gemeinsam betrachtet; User Flows, UX-Zustände und Designs vorhanden oder ausreichend beschrieben; Architektur, Schnittstellen, Datenquellen und Leitplanken geklärt; Datenschutz, Informationssicherheit, Barrierefreiheit und weitere Compliance geprüft; wesentliche Annahmen validiert oder als Risiko dokumentiert. · Anhang
- Planung und Nachvollziehbarkeit: Abhängigkeiten, nötige Entscheidungen und externe Mitwirkung sichtbar; kritische Blocker beseitigt, Restrisiken mit Verantwortlichen und Maßnahmen; innerhalb einer Iteration ein überprüfbares Ergebnis möglich; erwartete Tests und Review-Nachweis beschrieben; betroffene Anforderungen, Konzepte, Entscheidungen und Spezifikationen verbunden; Product Team und mindestens eine Vertretung der Umsetzung teilen das Verständnis. · Anhang
- Nicht zutreffende Kriterien werden begründet als „nicht zutreffend“ geführt, nicht still übersprungen. Zeitdruck ersetzt kein Kriterium. · Anhang
- Urteile je Kriterium: erfüllt, nicht erfüllt, nicht zutreffend, nicht prüfbar, bewusst abgewichen. · Aussage
- Nicht-Ziele: Änderung der Definition of Ready selbst, Definition of Done, Setzen des Status im Ticketsystem, Anlegen oder Ändern von Tickets, Änderungen an `requirement-definition` und `spec-whiteboarding`. · Aussage
- Das Laden eines Workitems aus dem Ticketsystem übernimmt ein anderer, vorgeschalteter Skill; der Skill erwartet den Inhalt im Chat oder als Datei. · Aussage

## Akzeptanzkriterien
- **AC-01** Gegeben ein Artefakt steht im Chat oder liegt als Datei vor, wenn der Anwender die Prüfung startet, dann erhält er für jedes Kriterium des Katalogs genau ein Urteil aus erfüllt, nicht erfüllt, nicht zutreffend, nicht prüfbar oder bewusst abgewichen, jeweils mit kurzer Begründung und Fundstelle im Artefakt (bei fehlender Stelle der Hinweis, dass keine existiert). · Aussage
- **AC-02** Gegeben ein Artefakt lässt sich eindeutig als Requirement, Steps, Spec, Plan oder Workitem zuordnen, wenn die Prüfung startet, dann nennt das Ergebnis die erkannte Art ohne Rückfrage. · Aussage
- **AC-03** Gegeben die Art des Artefakts ist nicht eindeutig, wenn die Prüfung startet, dann fragt der Skill genau einmal nach der Art, bevor er prüft. · Aussage
- **AC-04** Gegeben ein einzelnes Artefakt, wenn der Anwender Einzelprüfung wählt, dann dient nur dieses Artefakt als Quelle für alle Urteile. · Aussage
- **AC-05** Gegeben mehrere zusammengehörige Artefakte (z. B. Workitem, Spec, Plan) sind benannt, wenn der Anwender Paketprüfung wählt, dann wertet der Skill jedes Kriterium über alle Artefakte zusammen aus, und die Fundstelle nennt das jeweilige Artefakt. · Aussage
- **AC-06** Gegeben ein Workitem wird nur als Nummer ohne Inhalt übergeben, wenn der Anwender die Prüfung startet, dann weist der Skill darauf hin, dass der Inhalt zuerst in den Chat geladen werden muss, und prüft nicht. · Aussage
- **AC-07** Gegeben ein Artefakt ohne UI-Anteil, wenn der Skill prüft, dann schlägt er den UI-Teil als „nicht zutreffend“ mit Begründung vor und wertet ihn erst nach Bestätigung des Anwenders so; die Kriterien zu Data Flow und Architektur prüft er in jedem Fall. · Aussage
- **AC-08** Gegeben der Skill hat ein Kriterium als „nicht zutreffend“ vorgeschlagen, wenn der Anwender den Vorschlag ablehnt, dann prüft der Skill das Kriterium wie die übrigen. · Aussage
- **AC-09** Gegeben ein Kriterium lässt sich aus dem Artefakt nicht beurteilen (z. B. Freigabe des Product Owners, durchgeführter Design-Review, Verständnis der Umsetzung), wenn der Skill es bewertet, dann fragt er den Anwender nach Antwort und Nachweis und hält beides im Ergebnis fest. · Aussage
- **AC-10** Gegeben der Anwender nennt auf die Nachfrage aus AC-09 keinen Nachweis, wenn der Skill das Kriterium bewertet, dann lautet das Urteil „nicht prüfbar“, und das Kriterium steht in der Lückenliste. · ungeklärt
- **AC-11** Gegeben jedes zutreffende Kriterium ist erfüllt, wenn der Skill das Ergebnis ausgibt, dann lautet das Gesamturteil „bereit für den Review“ und die Lückenliste ist leer. · Aussage
- **AC-12** Gegeben mindestens ein zutreffendes Kriterium ist nicht erfüllt, nicht prüfbar oder bewusst abgewichen, wenn der Skill das Ergebnis ausgibt, dann lautet das Gesamturteil „nicht bereit“ und die Lückenliste nennt alle diese Kriterien. · Aussage
- **AC-13** Gegeben ein beliebiges Prüfergebnis, wenn der Skill es ausgibt, dann enthält es nie das Gesamturteil „Ready“, weist darauf hin, dass „Ready“ erst nach dem Review durch einen Menschen oder ein Team vergeben wird, und der Skill setzt keinen Status. · Aussage
- **AC-14** Gegeben ein Kriterium ist nicht erfüllt und der Anwender hat keine bewusste Abweichung genannt, wenn der Skill es bewertet, dann lautet das Urteil „nicht erfüllt“. · Aussage
- **AC-15** Gegeben ein Kriterium ist nicht erfüllt, wenn der Anwender ausdrücklich eine bewusste Abweichung mit Risikoentscheidung nennt (was, warum, verantwortliche Person, Maßnahme), dann lautet das Urteil „bewusst abgewichen“, und die Risikoentscheidung steht für den Review sichtbar im Ergebnis. · Aussage
- **AC-16** Gegeben der Anwender nennt Zeitdruck als Grund für ein nicht erfülltes Kriterium, wenn der Skill es bewertet, dann bleibt das Urteil unverändert; nur eine Risikoentscheidung nach AC-15 ändert es. · Anhang
- **AC-17** Gegeben der Katalog enthält die beiden doppelt stehenden Kriterien („Perspektiven gemeinsam betrachtet“, „Annahmen validiert oder als Risiko dokumentiert“), wenn der Skill das Ergebnis ausgibt, dann erhält jedes dieser Kriterien genau ein Urteil, ein Hinweis nennt die Doppelung, und der Katalogtext bleibt unverändert. · Aussage
- **AC-18** Gegeben ein nicht erfülltes Kriterium, wenn der Skill es meldet, dann nennt er konkret, was fehlt, und stellt gezielte Nachfragen, schreibt das Artefakt aber nicht um und erzeugt keinen neuen Entwurf. · Aussage
- **AC-19** Gegeben ein bereits als Ready geführtes Artefakt und neue Erkenntnisse aus der Umsetzung, wenn der Anwender erneut prüfen lässt, dann prüft der Skill vollständig neu, und das Ergebnis nennt ausdrücklich die Kriterien, die nicht mehr erfüllt sind. · Anhang
- **AC-20** Gegeben die Prüfung ist abgeschlossen, wenn der Skill das Ergebnis ausgibt, dann erscheint es im Chat, und der Skill legt weder eine Datei noch eine Änderung am Ticketsystem an. · Aussage

## Entscheidungen
- **W · Ziel** · Aussage — Prüf-Werkzeug (Skill), das Artefakte gegen die Definition of Ready prüft.
- **W · Verbindlichkeit des Textes** · Aussage — Der Text stammt aus einer bestehenden Projekt-Dokumentation und bleibt unverändert; der Auftrag ist ein Skill auf Basis seiner Beschreibungen und Definitionen.
- **W · Anlass** · Aussage — Der Skill soll beim Erstellen und Prüfen von Workitems unterstützen; später auf Prüfen eingegrenzt (siehe Erstellen-Modus).
- **W · Zuschnitt** · Aussage — Ein Skill; die Aufteilung in zwei Modi entfällt wegen des Erstellen-Modus.
- **W · Eingabe** · Aussage — Text im Chat oder Datei; ein Workitem wird über einen anderen Skill zuerst in den Kontext geladen.
- **W · Ergebnis der Prüfung** · Aussage — Je Kriterium ein Urteil mit Begründung und Fundstelle, dazu Gesamturteil und Lückenliste.
- **W · Nicht zutreffend** · Aussage — Der Skill schlägt vor, der Mensch bestätigt, die Begründung wird festgehalten.
- **W · Status Ready** · Aussage — Der Skill gibt nur eine Empfehlung und setzt den Status nie.
- **W · Nicht aus dem Text prüfbare Kriterien** · Aussage — Der Skill fragt nach und hält Antwort samt Nachweis fest.
- **W · Nicht-Ziele** · Aussage — Änderung der Definition of Ready, Definition of Done, Setzen des Status im Ticketsystem, Anlegen oder Ändern von Tickets bleiben draußen.
- **W · Erstellen-Modus** · Aussage — Entfällt als eigener Modus; der Skill prüft und fragt bei Lücken gezielt nach, erzeugt keinen eigenen Entwurf.
- **W · Geprüfte Artefakte** · Aussage — Requirement, Steps, Spec, Plan und Workitem; der Skill erkennt die Art selbst und fragt bei Zweifel nach.
- **W · Einzel oder Paket** · Aussage — Beides, die Wahl liegt beim Menschen.
- **W · Einbindung** · Aussage — Nur manuell aufgerufen; Änderungen an `requirement-definition` und `spec-whiteboarding` sind Nicht-Ziel.
- **W · Rolle des Gesamturteils** · Aussage — Das Gesamturteil ist nur eine Empfehlung („bereit für den Review“ oder „nicht bereit“); eine Abweichung wird nur festgehalten, wenn der Mensch sie ausdrücklich nennt, sonst gilt eine Lücke als „nicht erfüllt“.
- **W · Doppelte Kriterien** · Aussage — Je einmal bewerten, Hinweis im Ergebnis, Text unverändert.
- **W · Festhalten des Ergebnisses** · Aussage — Nur im Chat.
- **W · Erneute Prüfung** · Aussage — Jederzeit möglich; Ergebnis nennt die Kriterien, die nicht mehr erfüllt sind.
