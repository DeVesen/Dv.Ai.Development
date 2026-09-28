# Spec-Review neu ausrichten

Status: bestätigt am 2026-09-28
Art: verankert
Basis: 340c89c

## Was, wie, wo, warum
Heute blockt im Spec-Review alles, bei dem ein Planer „raten müsste“. Das hat keine Grenze, und so finden die Reviewer Runde um Runde neue Kleinigkeiten. · Anhang

Neues Ziel: Die Spec ist stimmig, verständlich und grob umsetzbar, aber nicht perfekt. Details entscheidet der Plan. Die Reviewer suchen nur, ob aus ihrem Blickwinkel noch etwas Wesentliches auffällt. · Aussage

Diese Spec legt fest, was die fünf Reviewer des Spec-Reviews prüfen und welche Kategorie sie vergeben, was der Scout liest und wann die Nacharbeit selbst entscheidet. Den Ablauf eines Laufs, die Farben der Kategorien, den Deckel und die Status legt sie nicht fest. · Aussage

Kategorien zur Einordnung: `widerspruch`, `fehlendes-verhalten` und `unerfuellbar` blocken. `detail` ist ein Hinweis, `formulierung` eine Anmerkung. · Aussage

## Theoretisches Verhalten nach Umsetzung
Die Reviewer prüfen in Runde 1 und vergeben je Finding eine Kategorie:

- **`completeness`:** Hat eine beschriebene Funktion kein AC, fehlt ein Anliegen der Quelle oder hat die Spec gar keine AC-ID, ist das `fehlendes-verhalten`. · Aussage
- **`completeness`, vage ACs:** Nennt ein AC gar kein beobachtbares Ergebnis, etwa „funktioniert korrekt“, ist das `fehlendes-verhalten`. Nennt es ein Ergebnis ohne Maß, ist das `detail`. · Aussage
- **`consistency`:** Ein Widerspruch zwischen zwei Aussagen ist `widerspruch`. Ein Verweis auf ein anderes Dokument ist `detail`, außer er ist die einzige Beschreibung einer Funktion; dann ist er `fehlendes-verhalten`. · Aussage
- **`feasibility`:** Anforderungen, die nicht zugleich erfüllbar sind, und Entscheidungen, die eine Anforderung unerfüllbar machen, sind `unerfuellbar`. Eine Voraussetzung, die die Spec nennt, aber nicht herstellt, ist `detail`. · Aussage
- **`clarity`:** Ein AC mit zwei Lesarten ist `detail`, und die Begründung nennt beide Lesarten. WIE statt WAS, also Klassen, Dateien, Tabellen oder technische Schritte, ist `detail`. Nach Rand- und Fehlerfällen sucht `clarity` nicht. · Aussage
- **`profiles`, nur bei `verankert`:** Eine Aussage über den Ist-Stand, die einem Profil widerspricht, ist `widerspruch`. Ein Begriff, den das Glossar anders führt, ist `detail`. · Aussage

Kein Reviewer des Spec-Reviews ist nur beratend. · Aussage

Kein Reviewer meldet eine Formulierung, einen Stil oder einen Randfall. · Aussage

Bei einer Spec der Art `frei` prüfen alle Reviewer nur die innere Stimmigkeit, und `profiles` läuft nicht. · Git

Der Scout macht vor der Nacharbeit Vorschläge. Bei `verankert` stützt er sie auf die Spec, die Profile, das Glossar und den Code. Bei `frei` stützt er sie nur auf die Spec. Jeder Vorschlag nennt seinen Beleg oder sagt, dass es keinen gibt. · Aussage

Die Nacharbeit schreibt eine Klarstellung selbst. Neues Verhalten schreibt sie selbst, wenn der bevorzugte Scout-Vorschlag einen Beleg aus Spec oder Bestand nennt. Nur neues Verhalten ohne Beleg wird eine Frage an den Menschen. · Aussage

Ein Beleg aus dem Bestand geht nie vor einen W-Eintrag. Widerspricht der bevorzugte Vorschlag einem W-Eintrag, ändert die Nacharbeit die Stelle nicht, und ihr Eintrag lautet „W-Eintrag ist bindend“. · Git

Der Bericht listet jede Stelle, an der die Nacharbeit neues Verhalten mit Beleg geschrieben hat, jeweils mit dem Beleg. · Aussage

Nächster Schritt im Bericht, je Status:
- `sauber …` ohne Hinweise: die Spec committen, dann in einer frischen Session `/dv-forge:plan-writing <spec>` · Git
- `sauber …` mit Hinweisen: zuerst optional `/dv-forge:review-followup <spec> <auswahl>` mit dem Auswahl-Hinweis, dann wie oben · Git
- `Fragen offen`: `/dv-forge:spec-review <spec>` erneut starten; der neue Lauf stellt die offenen Fragen · Aussage
- `nicht bereit …`: Findings und Scout-Vorschläge lesen, dann `/dv-forge:review-followup <spec> <auswahl>` oder die Spec selbst anpassen und `/dv-forge:spec-review <spec>` erneut starten · Git

## Soll-Vorgaben
- Jeder Reviewer-Auftrag nennt das Ziel: stimmig, verständlich und grob umsetzbar, Details entscheidet der Plan. · Aussage
- Jeder Reviewer-Auftrag nennt Groß- oder Kleinschreibung, ß oder ss und Umlaute wörtlich als Beispiel für `detail`. · Anhang
- Ein W-Eintrag ist nie selbst ein Finding. Einträge im Abschnitt „Offen, bewusst nicht weiterverfolgt (Abbruch)“ sind weder Finding noch Lücke. · Git

## Akzeptanzkriterien
- **AC-01** Gegeben eine Spec mit einer beschriebenen Funktion ohne AC, wenn Runde 1 endet, dann liegt an der Überschrift dieser Funktion ein Finding der Kategorie `fehlendes-verhalten`. · Aussage
- **AC-02** Gegeben eine Spec ohne jede AC-ID, wenn Runde 1 endet, dann meldet `completeness` genau ein Finding der Kategorie `fehlendes-verhalten`, an der ersten Überschrift. · Git
- **AC-03** Gegeben eine Quelle mit einem Anliegen, das die Spec nicht abdeckt, wenn Runde 1 endet, dann liegt ein Finding der Kategorie `fehlendes-verhalten` vor, dessen Zitat mit „Quelle: “ beginnt. · Aussage
- **AC-04** Gegeben ein AC, das mit „dann funktioniert der Export korrekt“ endet, wenn Runde 1 endet, dann liegt an diesem AC ein Finding der Kategorie `fehlendes-verhalten`. · Aussage
- **AC-05** Gegeben ein AC, das mit „dann lädt die Liste schnell“ endet, wenn Runde 1 endet, dann liegt an diesem AC ein Finding der Kategorie `detail`. · Aussage
- **AC-06** Gegeben zwei Aussagen der Spec, die sich widersprechen, wenn Runde 1 endet, dann liegt an der späteren Stelle ein Finding der Kategorie `widerspruch`, dessen Zitat beide Aussagen mit ` ↔ ` trennt. · Aussage
- **AC-07** Gegeben ein Verweis auf ein anderes Dokument bei einer Funktion, die die Spec selbst beschreibt, wenn Runde 1 endet, dann ist das Finding dazu `detail`. · Aussage
- **AC-08** Gegeben eine Funktion, die nur über einen Verweis auf ein anderes Dokument beschrieben ist, wenn Runde 1 endet, dann ist das Finding dazu `fehlendes-verhalten`. · Aussage
- **AC-09** Gegeben zwei Anforderungen, die nicht zugleich erfüllbar sind, wenn Runde 1 endet, dann liegt an der späteren Stelle ein Finding der Kategorie `unerfuellbar`. · Aussage
- **AC-10** Gegeben eine Voraussetzung, die die Spec nennt, aber nirgends herstellt, wenn Runde 1 endet, dann ist das Finding dazu `detail`. · Aussage
- **AC-11** Gegeben ein AC mit zwei Lesarten, wenn Runde 1 endet, dann ist das Finding dazu `detail`, und seine Begründung nennt beide Lesarten. · Aussage
- **AC-12** Gegeben ein Dateipfad in einem AC, wenn Runde 1 endet, dann ist das Finding dazu `detail`. · Aussage
- **AC-13** Gegeben eine Spec, deren einziger Mangel ein Fehlerfall ohne festgelegtes Verhalten in einer Funktion mit AC ist, wenn Runde 1 endet, dann meldet kein Reviewer ein Finding. · Aussage
- **AC-14** Gegeben eine Spec, deren einziger Mangel eine umständliche Formulierung ist, wenn Runde 1 endet, dann meldet kein Reviewer ein Finding. · Aussage
- **AC-15** Gegeben eine verankerte Spec mit einer Aussage über den Ist-Stand, die einem Profil widerspricht, wenn Runde 1 endet, dann liegt ein Finding der Kategorie `widerspruch` vor, dessen Begründung die Profil-Datei nennt. · Aussage
- **AC-16** Gegeben eine verankerte Spec mit einem Begriff, den das Glossar unter „Nicht verwenden“ führt, wenn Runde 1 endet, dann ist das Finding dazu `detail`, und seine Begründung nennt den Glossar-Begriff. · Aussage
- **AC-17** Gegeben eine Spec, in der nur ein Begriff mal mit ß und mal mit ss geschrieben ist, wenn Runde 1 endet, dann ist jedes Finding dazu `detail`. · Aussage
- **AC-18** Gegeben eine verankerte Spec und ein Finding, das der Code beantwortet, wenn der Scout endet, dann nennt sein bevorzugter Vorschlag die Code-Datei als Beleg. · Aussage
- **AC-19** Gegeben eine verankerte Spec und ein Finding, das ein Glossar-Eintrag beantwortet, wenn der Scout endet, dann nennt sein bevorzugter Vorschlag den Glossar-Eintrag als Beleg. · Aussage
- **AC-20** Gegeben eine Spec der Art `frei`, wenn der Scout endet, dann nennt kein Vorschlag einen Beleg außerhalb der Spec. · Aussage
- **AC-21** Gegeben eine 🔴-Stelle, deren bevorzugter Scout-Vorschlag neues Verhalten mit einem Beleg festlegt, wenn die Nacharbeit endet, dann ist der Vorschlag in der Spec umgesetzt, der Eintrag der Nacharbeit nennt den Beleg, und es gibt zu dieser Stelle keine Frage an den Menschen. · Aussage
- **AC-22** Gegeben eine 🔴-Stelle, deren bevorzugter Scout-Vorschlag neues Verhalten ohne Beleg festlegt, wenn die Nacharbeit endet, dann ist die Stelle unverändert, und es gibt eine Frage an den Menschen zu ihr. · Aussage
- **AC-23** Gegeben eine 🔴-Stelle, deren bevorzugter Vorschlag mit Beleg einem W-Eintrag widerspricht, wenn die Nacharbeit endet, dann ist die Stelle unverändert, und der Eintrag der Nacharbeit lautet „W-Eintrag ist bindend“. · Git
- **AC-24** Gegeben die Nacharbeit hat an zwei Stellen neues Verhalten mit Beleg geschrieben, wenn der Lauf endet, dann listet der Bericht beide Stellen mit ihrem Beleg. · Aussage
- **AC-25** Gegeben der Status `sauber nach Runde 1` ohne Hinweise, wenn der Bericht erscheint, dann nennt er als nächsten Schritt, die Spec zu committen und in einer frischen Session `/dv-forge:plan-writing <spec>` zu starten. · Git
- **AC-26** Gegeben der Status `sauber nach Nachprüfung` mit zwei Hinweisen, wenn der Bericht erscheint, dann nennt er zuerst `/dv-forge:review-followup <spec> <auswahl>` als optionalen Schritt, mit dem Auswahl-Hinweis. · Git
- **AC-27** Gegeben der Status `Fragen offen`, wenn der Bericht erscheint, dann nennt er als nächsten Schritt, `/dv-forge:spec-review <spec>` erneut zu starten. · Aussage
- **AC-28** Gegeben der Status `nicht bereit, 1 × 🔴 offen`, wenn der Bericht erscheint, dann nennt er `/dv-forge:review-followup <spec> <auswahl>` und das erneute `/dv-forge:spec-review <spec>` nach eigener Anpassung als nächste Schritte. · Git

## Entscheidungen
- **W · Ziel Spec-Review** · Aussage — Die Spec ist stimmig, verständlich und grob umsetzbar, aber nicht perfekt. Details entscheidet der Plan. Der Reviewer ist kein Oberlehrer.
- **W · Nacharbeit mit Beleg** · Aussage — Die Nacharbeit darf neues Verhalten schreiben, wenn der bevorzugte Scout-Vorschlag einen Beleg aus Spec oder Bestand nennt. Nur was ohne Beleg bleibt, wird eine Frage an den Menschen.
- **W · Kategorien je Reviewer** · Aussage — `completeness`: Funktion ohne AC oder fehlendes Anliegen der Quelle ist `fehlendes-verhalten`. `consistency`: Widerspruch ist `widerspruch`; ein externer Verweis ist `detail`, außer er ist die einzige Beschreibung einer Funktion. `feasibility`: nicht zugleich erfüllbar ist `unerfuellbar`; eine nicht hergestellte Voraussetzung ist `detail`. `clarity`: Randfall und WIE statt WAS sind `detail`. `profiles`: Widerspruch zum Ist-Stand ist `widerspruch`; ein falscher Begriff ist `detail`. Kein Reviewer ist nur beratend.
- **W · Vage ACs** · Aussage — Ein AC ganz ohne beobachtbares Ergebnis ist `fehlendes-verhalten`. Ein AC mit Ergebnis, aber ohne Maß ist `detail`.
- **W · Zwei Lesarten** · Aussage — Das ist `detail`. Der Plan wählt eine Lesart und nennt sie.
- **W · Was der Scout liest** · Aussage — Spec, Profile, Glossar und bei `verankert` den Code.
- **W · Keine Suche nach Randfällen** · Aussage — `clarity` prüft nur noch zwei Lesarten und WIE statt WAS. Das ersetzt den Randfall aus „Kategorien je Reviewer“.
- **W · Kein 🟢** · Aussage — Die Reviewer des Spec-Reviews melden keine `formulierung`.
- **W · Eigene Entscheidungen im Bericht** · Aussage — Der Bericht listet jede Stelle, an der die Nacharbeit neues Verhalten mit Beleg geschrieben hat, samt Beleg.
- **W · Scout bei `frei`** · Aussage — Er liest nur die Spec, wie heute.
