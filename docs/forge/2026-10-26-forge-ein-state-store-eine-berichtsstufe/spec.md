# dv-forge: ein State-Store und eine Berichtsstufe

Status: bestätigt am 2026-10-26
Art: frei
Basis: cb5c698

## Was, wie, wo, warum
- Heute halten drei Stände den Fortschritt fest: die Hash-Aufnahme der Orchestratoren (Spec- und Plan-Hash, Start-Ort, Vorbestand, Kopien, Prosa-Notiz), der Ketten-Eintrag und der Ketten-Stand. Ziel: Der Ketten-Stand ist der einzige dauerhafte Stand je Slug; Ketten-Eintrag und Hash-Aufnahme entfallen. Grund: weniger Wahrheiten, die auseinanderlaufen. · Aussage
- Die Hash-Prüfung der Orchestratoren entfällt vollständig, mit Ort-Prüfung und Vorbestand-Prüfung. Der Abschluss der Leit-Session prüft weiter gegen git. Bekannte Folge: Eine Änderung von Spec oder Plan von Hand mitten im Lauf einer Etappe wird nicht mehr gestoppt. · Aussage
- Heute gibt es fünf Berichtsstufen mit Menschen-Text oder Doppelungen: Review-Bericht, Orchestrator-Bericht, Etappen-Bericht, Blöcke der Leit-Session, Chat-Bericht. Ziel: Etappen liefern nur Fakten. Der einzige Menschen-Text kommt von der Leit-Session. Der Orchestrator-Bericht schrumpft zur Faktenliste. · Aussage
- Das Ergebnis eines Reviews ist ein Faktum mit festen Werten und kein Satz, den die Leit-Session erst lesen und deuten muss. · Aussage
- Ob nach einem Review ein Followup folgt, ergibt sich aus der Datenlage (offene Gruppen vorhanden) und nicht aus dem Text der Folgeschritte. · Aussage
- Was eine Nacharbeit geändert hat, rechnet die Leit-Session selbst aus dem Vergleich vorher und nachher. Die Etappe schreibt dazu keinen Eigenbericht. · Aussage
- Die Pflichttext-Prüfung schützt künftig die Blöcke der Leit-Session. Der Orchestrator-Bericht mit seinen vier Überschriften entfällt und mit ihm die zugehörige Prüfung. · Aussage
- Steuerinformationen der Session-Kette („Followup oder Ende“, „Followup ja/nein“) sind Steuerfluss und bleiben. · Anhang

## Theoretisches Verhalten nach Umsetzung
- Zu jedem Slug gibt es einen dauerhaften Stand, den Ketten-Stand. Die Leit-Session schreibt ihn; nach jeder Etappe stehen darin ihr Ergebnis, ihre Commits, die Hashes von Spec und Plan und die offenen Punkte. · Aussage
- Ein Orchestrator-Lauf legt keine Hash-Aufnahme an und schreibt keinen Ketten-Eintrag. Er prüft weder Hash noch Ort gegen einen Start-Stand und fragt bei einer Abweichung nicht nach. · Aussage
- Jede Etappe legt nur Fakten ab: Ergebnis als fester Wert, Funde, geänderte Dateien, Testzahlen, Prüfergebnis. Es gibt keinen Fließtext-Bericht der Etappe. · Aussage
- Der Orchestrator-Bericht ist die Faktenliste (Branch, Commits, Prüfergebnis, Urteile, Abweichungen). Die Abschnitte „Was sich geändert hat“, „Was ist noch offen“ und „Wie es weitergeht“ gibt es nicht mehr. · Aussage
- An jedem Haltepunkt und im Schlussbericht baut die Leit-Session den Text für den Menschen allein aus den Fakten. · Aussage
- Nach einer Nacharbeit zeigt die Leit-Session die geänderten Stellen als Vorher/Nachher und die neuen Entscheidungs-Einträge, aus dem Vergleich der Spec bzw. des Plans vor und nach der Etappe. · Aussage
- Die Leit-Session entscheidet über „Followup“ oder „Ende“ wie vor der Änderung; die Angabe „Followup: ja“ oder „Followup: nein“ hängt nur an den offenen Gruppen. · Aussage
- Die Pflichttext-Prüfung prüft die Blöcke der Leit-Session auf Vollständigkeit; sie lässt einen vollständigen Block passieren und weist einen gekürzten zurück. · Aussage
- Nach dem Ende der Session-Kette bleibt der Ketten-Stand bestehen. · Aussage

## Soll-Vorgaben
- Der Chat-Bericht und die Pflichttext-Prüfung bleiben bis zu diesem Teil unverändert (Teil A fasst sie nur minimal an); dieser Teil ändert sie wie oben beschrieben. · Aussage
- Der Steuerfluss bleibt wirkungsgleich: Dieselben Berichte führen zu denselben Entscheidungen „Followup“ und „Ende“, höchstens zwei Followup-Runden. · Anhang
- Nicht Teil dieses Teils: das Ledger der Umsetzung samt Archiv, die Marker der Hooks, die Arbeitsbereiche der Reviews samt gesicherten offenen Gruppen und die Metriken. · Aussage
- Der Ketten-Stand wird in diesem Teil nicht aufgeräumt; die Leit-Session löscht ihn nicht. · Aussage
- Altdateien im Format von Ketten-Eintrag und Hash-Aufnahme werden nicht mehr gelesen; es gibt keinen Migrationspfad. · Anhang
- Tests und Evals des Plugins werden mit angepasst und sind danach grün. · Anhang
- Reihenfolge: C beginnt nach A. · Anhang

## Akzeptanzkriterien
- **AC-01** Gegeben eine Session-Kette hat ihre erste Etappe abgeschlossen, wenn im Repository nach dauerhaften Ständen zu diesem Slug gesucht wird, dann gibt es genau einen, den Ketten-Stand, und weder einen Ketten-Eintrag noch eine Hash-Aufnahme. · Aussage
- **AC-02** Gegeben ein Orchestrator läuft in einer Etappe, wenn ein Mensch währenddessen Spec oder Plan von Hand ändert und der Lauf weitergeht, dann läuft der Lauf weiter und bricht nicht wegen einer Hash-Abweichung ab. · Aussage
- **AC-03** Gegeben alle Dateien des Plugins nach der Änderung, wenn sie nach „Ketten-Eintrag“ durchsucht werden, dann gibt es keinen Treffer. · Aussage
- **AC-04** Gegeben die Session-Kette ist beendet, wenn der Abschluss der Leit-Session gelaufen ist, dann liegt der Ketten-Stand dieses Slugs weiterhin vor und ist lesbar. · Aussage
- **AC-05** Gegeben eine Etappe ist beendet, wenn die Leit-Session ihre Ablage liest, dann besteht die Ablage aus maschinenlesbaren Fakten und der Faktenliste, ohne Fließtext-Bericht der Etappe und ohne Markdown-Fassung eines Review-Berichts. · Aussage
- **AC-06** Gegeben ein Orchestrator-Lauf ist beendet, wenn seine Faktenliste gelesen wird, dann enthält sie Branch, Commits, Prüfergebnis, Urteile und Abweichungen und keinen der Abschnitte „Was sich geändert hat“, „Was ist noch offen“ und „Wie es weitergeht“. · Aussage
- **AC-07** Gegeben ein Orchestrator-Lauf in einer Etappe endet, wenn die Ausgabe der Etappe gelesen wird, dann besteht sie aus genau einer Statuszeile und enthält keinen Abschlussbericht-Text. · Aussage
- **AC-08** Gegeben eine Review-Etappe endet mit Ergebnis „bereit“, wenn die Kette an einem Haltepunkt anhält, dann enthält der Block der Leit-Session das Ergebnis, die offenen Punkte, die Fragen und die empfohlene Auswahl. · Aussage
- **AC-09** Gegeben zwei Berichte mit demselben Ergebniswert und unterschiedlichem Wortlaut der Ergebniszeile, wenn die Leit-Session über den Fortgang entscheidet, dann trifft sie in beiden Fällen dieselbe Entscheidung. · Aussage
- **AC-10** Gegeben ein Bericht mit Ergebnis „Showstopper“, „Frage“ oder „unvollständig“, wenn die Leit-Session über den Fortgang entscheidet, dann hält sie an und nennt das Ergebnis als Grund. · Aussage
- **AC-11** Gegeben ein Bericht ohne Ergebnis-Angabe, wenn die Leit-Session über den Fortgang entscheidet, dann hält sie an und nennt als Grund die fehlende Ergebnis-Angabe. · Aussage
- **AC-12** Gegeben ein Review-Ergebnis mit mindestens einer offenen Gruppe, wenn der Bericht entsteht, dann lautet die Angabe „Followup: ja“, auch wenn der Bericht keinen Text mit Folgeschritten enthält. · Aussage
- **AC-13** Gegeben ein Review-Ergebnis ohne offene Gruppe, wenn der Bericht entsteht, dann lautet die Angabe „Followup: nein“. · Aussage
- **AC-14** Gegeben eine Spec-Nacharbeit hat die Spec geändert, wenn die Leit-Session ihren Haltepunkt ausgibt, dann zeigt der Block die geänderten Stellen als Vorher/Nachher und die neuen Entscheidungs-Einträge, ohne dass die Etappe eine Berichtsdatei abgegeben hat. · Aussage
- **AC-15** Gegeben ein Grill hat die Spec geändert, wenn die Leit-Session ihren Haltepunkt ausgibt, dann zeigt der Block die geänderten Stellen als Vorher/Nachher, ohne dass die Etappe eine Berichtsdatei abgegeben hat. · Aussage
- **AC-16** Gegeben eine Plan-Nacharbeit hat den Plan geändert, wenn die Leit-Session ihren Haltepunkt ausgibt, dann zeigt der Block die geänderten Stellen des Plans als Vorher/Nachher, ohne dass die Etappe eine Berichtsdatei abgegeben hat. · Aussage
- **AC-17** Gegeben die Leit-Session gibt einen Block mit Pflichttext vollständig aus, wenn die Pflichttext-Prüfung läuft, dann lässt sie den Zug passieren; gegeben der Block ist gekürzt, dann weist sie den Zug zurück, höchstens zweimal. · Aussage
- **AC-18** Gegeben ein Orchestrator-Lauf endet ohne die vier Überschriften des alten Orchestrator-Berichts, wenn die Pflichttext-Prüfung läuft, dann blockiert sie den Zug nicht. · Aussage
- **AC-19** Gegeben im Repository liegt ein Ketten-Eintrag oder eine Hash-Aufnahme im alten Format, wenn eine Session-Kette startet, dann werden beide nicht gelesen und nicht migriert, und der Lauf verläuft unverändert. · Anhang
- **AC-20** Gegeben die Tests und Evals des Plugins nach der Änderung, wenn sie vollständig laufen, dann sind alle grün, und keiner erwartet noch einen Ketten-Eintrag, eine Hash-Prüfung der Orchestratoren, die vier Überschriften des Orchestrator-Berichts oder eine Markdown-Fassung der Etappen-Berichte. · Anhang

## Entscheidungen
- **W · Einziger Stand** · Aussage — Der Ketten-Stand ist der einzige dauerhafte Stand; der Ketten-Eintrag entfällt, seine Leser lesen den Ketten-Stand.
- **W · Begriff** · Aussage — „Ketten-Stand“ ist der Begriff für den einzigen Stand der Session-Kette; „Kette“ allein bleibt verboten, ebenso „Zustand“ und „Session-Kette-Stand“.
- **W · Hash-Prüfung** · Aussage — Alles an Hash-Aufnahme, Ort-Prüfung, Kopien von Spec und Plan, Vorbestand und Prosa-Notiz entfällt; nur die Steuerentscheidung „Followup oder Ende“ bleibt. Der Verlust mitten im Lauf (Handänderung an Spec oder Plan) ist akzeptiert.
- **W · Berichtsstufen** · Aussage — Bleiben: maschinenlesbare Fakten, Faktenliste und Blöcke der Leit-Session. Entfallen: Markdown-Fassungen von Review- und Etappen-Bericht, Orchestrator-Bericht mit vier Abschnitten, Chat-Bericht für alleinstehende Läufe.
- **W · Pflichttext-Prüfung** · Aussage — Der Vier-Überschriften-Block und der Pfad für den Orchestrator-Bericht entfallen; die Anker-Prüfung bleibt und gilt für die Blöcke der Leit-Session.
- **W · Followup-Angabe** · Aussage — „Followup ja/nein“ kommt aus der Datenlage der offenen Gruppen, nicht aus dem Text der Folgeschritte.
- **W · Aufräumen** · Aussage — Der Ketten-Stand bleibt nach dem Ende der Session-Kette bestehen; kein Aufräumen in diesem Teil.
- **W · Abgrenzung** · Aussage — Ledger samt Archiv, Hook-Marker, Review-Arbeitsbereiche mit gesicherten Gruppen und Metriken liegen außerhalb dieses Teils.
- **W · Ergebnis als Wert** · Aussage — Das Ergebnis eines Reviews ist ein fester Wert (bereit, Showstopper, Frage, unvollständig); die Leit-Session setzt den Text daraus zusammen.
- **W · Nacharbeit-Fakten** · Aussage — Grill, Spec-Nacharbeit und Plan-Nacharbeit schreiben keinen Eigenbericht; die Leit-Session rechnet Vorher/Nachher und neue Entscheidungs-Einträge aus dem Vergleich.
