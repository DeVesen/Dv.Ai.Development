# Session-Kette: Spec-Review im Whiteboarding und Meldung per Nachricht

Status: bestätigt am 2026-10-26
Art: verankert
Basis: 432a4b5

## Was, wie, wo, warum
Die Session-Kette bekommt zwei Änderungen und eine Korrektur. · Aussage

Erstens prüft die Whiteboarding-Etappe ihre Spec selbst: Nach der Bestätigung durch den Menschen läuft in derselben Etappen-Session der Spec-Review-Orchestrator, und der Mensch entscheidet dort, ob die Spec abgeschlossen ist oder er weiter daran arbeitet. Das Spec-Review nach dem Grill bleibt unverändert; das neue Review ist ein Zusatz. · Aussage

Zweitens meldet jede Etappen-Session ihr `final` zusätzlich per Nachricht an die Leit-Session. Heute gehen Turn-Enden verloren, die der Mensch in der Etappen-Session anstößt: Sie wecken die Leit-Session nicht, nur Turn-Enden, die die Leit-Session oder Subagents anstoßen. Im Lauf zu 313073 kam das `final` des Whiteboardings zweimal nicht an; erst eine Nachricht der Etappen-Session weckte die Leit-Session. · Git

Drittens committet in einer Session-Kette im Whiteboarding-Teil nur noch die Leit-Session. Heute committet das Whiteboarding Spec und Glossar selbst. · Git

Als Korrektur gibt die Leit-Session bei `in-progress` eine feste Zeile aus, weil die App nach einem Turn ohne sichtbare Ausgabe eine Antwort erzwingt und dann freier Text entsteht. · Git

## Theoretisches Verhalten nach Umsetzung
1. Die Leit-Session startet die Whiteboarding-Etappe wie heute.
2. Der Mensch bestätigt die Spec; die Etappen-Session schreibt sie.
3. Dieselbe Etappen-Session lässt den Spec-Review-Orchestrator auf der Spec laufen, mit seinen Followup-Runden, ohne Commit.
4. Meldet das Review ✅ ohne einen einzigen Punkt, schließt die Etappe ab.
5. Meldet das Review Punkte gleich welcher Farbe, sieht der Mensch den Bericht ohne Übergabe-Hinweise und die Frage „Spec abschließen“ oder „Weiter an der Spec arbeiten“.
6. Bei „Weiter an der Spec arbeiten“ ändert die Etappe die Spec mit dem Menschen; nach jeder bestätigten Änderung läuft das Review erneut und die Frage folgt wieder.
7. Beim Abschluss endet die Etappe mit `final` und schickt der Leit-Session eine Nachricht.
8. Die Leit-Session prüft das `final`, committet Spec und gemeldete Glossar- und ADR-Dateien und startet den Grill, direkt oder über die Vorschlagskarte.

· Aussage

Jede andere Etappe meldet ihr `final` genauso zusätzlich per Nachricht. Die Leit-Session macht danach weiter, ohne dass der Mensch in ihr etwas schreibt. · Aussage

## Soll-Vorgaben

### Eingebettetes Spec-Review · Aussage
- Das eingebettete Spec-Review gibt es nur in der Whiteboarding-Etappe einer Session-Kette. Einzeln aufgerufen verhalten sich beide Whiteboarding-Skills wie heute. · Historie
- Es läuft auf dem Modell der Whiteboarding-Etappe, Sonnet. · Aussage
- Der Spec-Review-Orchestrator läuft vollständig, mit bis zu zwei Followup-Runden. Änderungen der Followup-Runden lösen kein weiteres eingebettetes Review aus. · Aussage
- Der Mensch sieht den vollen Review-Bericht ohne den Abschnitt mit nächsten Schritten und Befehlen. · Aussage
- Die Abschlussfrage lautet „Spec abschließen“ oder „Weiter an der Spec arbeiten“. Sie kommt, sobald das Review mindestens einen Punkt meldet, gleich welcher Farbe, auch bei ⛔ und ❓. · Aussage
- Ein Review mit ✅ und ohne jeden Punkt schließt die Etappe ohne Frage ab. · Aussage
- Jede bestätigte Spec-Änderung nach dem ersten Review führt zu einem erneuten Review und danach zur Abschlussfrage. Die Zahl der Schleifen ist nicht begrenzt. · Aussage
- Beim Abschluss stehen die offenen Punkte aller Farben aus dem letzten Review im Zustand der Kette und im Brief des Grills. · Aussage

### Meldung per Nachricht · Aussage
- Bei `final` schickt jede Etappen-Session genau eine Nachricht an die Leit-Session. Bei `in-progress` und `needs-user` schickt sie keine. · Aussage
- Die Nachricht enthält die Statuszeile und, wo die Etappe ihn kennt, den Pfad der Spec; sonst nur die Statuszeile. Übergabe-Hinweise, nächste Etappen oder Befehle enthält sie nicht. · Aussage
- Der Brief jeder Etappe nennt die Leit-Session als Ziel der Nachricht. · Aussage
- Scheitert die Nachricht, nennt die Etappen-Session das dem Menschen in einer Zeile, mit Link zur Leit-Session. Ihr Turn-Ende bleibt `final`. · Aussage
- Die Etappen-Session startet weiterhin keine Session und schickt keine anderen Nachrichten. · Aussage
- Kommt dasselbe `final` per Turn-Ende und per Nachricht an, verarbeitet die Leit-Session es genau einmal. · Git
- Die Leit-Session gibt bei `in-progress` genau die Zeile `<etappe>: läuft` aus und startet nichts. · Aussage

### Commits · Aussage
- In einer Session-Kette committen Whiteboarding und eingebettetes Spec-Review nichts. Ohne Session-Kette committet das Whiteboarding Spec und Glossar wie heute selbst. · Aussage
- Nach dem `final` des Whiteboardings committet die Leit-Session die Spec und die gemeldeten Glossar- und ADR-Dateien, auf Pfade beschränkt, nach der Commit-Konvention des Projekts, bevor sie den Grill startet. · Aussage
- Das Spec-Review nach dem Grill committet die Spec weiterhin selbst. · Aussage

## Akzeptanzkriterien
- **AC-01** Gegeben eine Whiteboarding-Etappe in einer Session-Kette, wenn der Mensch die Spec bestätigt, dann läuft in derselben Etappen-Session der Spec-Review-Orchestrator auf der geschriebenen Spec, ohne weiteren Aufruf durch den Menschen. · Aussage
- **AC-02** Gegeben das eingebettete Review meldet mindestens einen 🟢 und sonst nichts, wenn es endet, dann sieht der Mensch den Review-Bericht ohne Abschnitt mit nächsten Schritten oder Befehlen und die Frage „Spec abschließen“ oder „Weiter an der Spec arbeiten“. · Aussage
- **AC-03** Gegeben das eingebettete Review endet mit ⛔ und einem 🔴, wenn es endet, dann stehen „Spec abschließen“ und „Weiter an der Spec arbeiten“ zur Wahl. · Aussage
- **AC-04** Gegeben das eingebettete Review endet mit ✅ und ohne jeden Punkt, wenn es endet, dann endet die Etappe mit `final`, ohne die Abschlussfrage zu stellen. · Aussage
- **AC-05** Gegeben der Mensch wählt „Weiter an der Spec arbeiten“, wenn er eine Spec-Änderung bestätigt, dann läuft das eingebettete Review erneut und danach folgt die Abschlussfrage. · Aussage
- **AC-06** Gegeben eine Followup-Runde des eingebetteten Reviews ändert die Spec, wenn der Review-Lauf endet, dann folgt die Abschlussfrage oder der Abschluss nach AC-04, kein zweiter Review-Lauf. · Aussage
- **AC-07** Gegeben der Mensch wählt „Spec abschließen“, wenn die Etappe endet, dann trägt ihr Turn-Ende `STATUS=final` und die Leit-Session erhält eine Nachricht mit der Statuszeile und dem Pfad der Spec. · Aussage
- **AC-08** Gegeben Whiteboarding und eingebettetes Review sind gelaufen, wenn die Etappe `final` meldet, dann ist seit ihrem Start kein Commit der Etappen-Session entstanden. · Aussage
- **AC-09** Gegeben das `final` des Whiteboardings mit einer Glossar-Datei im Bericht, wenn die Leit-Session es verarbeitet, dann entsteht vor dem Start des Grills genau ein Commit mit der Spec und dieser Glossar-Datei und ohne weitere Dateien. · Aussage
- **AC-10** Gegeben das letzte eingebettete Review meldete zwei 🟡 und einen 🟢, wenn der Mensch „Spec abschließen“ wählt, dann stehen diese drei Punkte im Zustand der Kette und im Brief des Grills. · Aussage
- **AC-11** Gegeben die Grill-Etappe wartet auf die Bestätigung des Menschen, wenn der Mensch dort bestätigt und die Etappe `final` meldet, dann startet die Leit-Session die nächste Etappe oder zeigt ihre Vorschlagskarte, ohne dass der Mensch in der Leit-Session etwas schreibt. · Aussage
- **AC-12** Gegeben eine Abschluss-Etappe ohne bekannten Spec-Pfad, wenn sie `final` meldet, dann enthält die Nachricht nur die Statuszeile. · Aussage
- **AC-13** Gegeben eine Etappe meldet `needs-user` oder `in-progress`, wenn ihr Turn endet, dann erhält die Leit-Session keine Nachricht. · Aussage
- **AC-14** Gegeben die Nachricht an die Leit-Session scheitert, wenn die Etappe endet, dann nennt sie das dem Menschen in einer Zeile mit Link zur Leit-Session und ihr Turn-Ende trägt `STATUS=final`. · Aussage
- **AC-15** Gegeben dasselbe `final` kommt per Turn-Ende und per Nachricht an, wenn die Leit-Session beide verarbeitet, dann startet sie die nächste Etappe genau einmal. · Git
- **AC-16** Gegeben eine Etappe meldet `in-progress`, wenn die Leit-Session das Turn-Ende verarbeitet, dann gibt sie genau die Zeile `<etappe>: läuft` aus und startet nichts. · Aussage
- **AC-17** Gegeben einer der beiden Whiteboarding-Skills, darunter `spec-whiteboarding-with-docs`, wird ohne Session-Kette aufgerufen, wenn der Mensch die Spec bestätigt, dann läuft kein Spec-Review und die Übergabe ist dieselbe wie heute. · Historie
- **AC-18** Gegeben die Spec-Review-Etappe nach dem Grill, wenn sie `final` meldet, dann hat sie die Spec selbst committet und der Spec-Haltepunkt erscheint wie heute. · Aussage
- **AC-19** Gegeben eine Etappe meldet `final`, wenn die Nachricht an die Leit-Session geht, dann enthält sie keinen Übergabe-Hinweis, keine nächste Etappe und keinen Befehl. · Aussage
- **AC-20** Gegeben eine Whiteboarding-Etappe in einer Session-Kette, wenn das eingebettete Review läuft, dann läuft es auf demselben Modell wie die Whiteboarding-Etappe, Sonnet. · Aussage
- **AC-21** Gegeben die Leit-Session startet eine Etappe, wenn sie deren Brief übergibt, dann nennt der Brief die Leit-Session als Ziel der Nachricht. · Aussage
- **AC-22** Gegeben eine Etappen-Session hat `final` gemeldet, wenn ihr Lauf endet, dann hat sie keine Session gestartet und außer der einen Nachricht zum `final` keine Nachricht geschickt. · Aussage

## Entscheidungen
- **W · Review im Whiteboarding ist Zusatz** · Aussage — Das Spec-Review nach dem Grill bleibt unverändert; das eingebettete Review kommt vor dem Grill hinzu.
- **W · Modell des eingebetteten Reviews** · Aussage — Sonnet, weil es in der Whiteboarding-Etappe läuft.
- **W · Reichweite der Nachricht** · Aussage — Jede Etappe meldet ihr `final` zusätzlich per Nachricht, nicht nur das Whiteboarding.
- **W · Keine Nachricht bei needs-user** · Aussage — Nur `final` erzeugt eine Nachricht; bei `needs-user` sitzt der Mensch ohnehin in der Etappen-Session.
- **W · Inhalt der Nachricht** · Aussage — Statuszeile und Spec-Pfad, ohne Spec-Pfad nur die Statuszeile.
- **W · Nachricht scheitert** · Aussage — Eine Zeile an den Menschen mit Link zur Leit-Session; das Turn-Ende bleibt `final`.
- **W · Wortlaut der Abschlussfrage** · Aussage — „Spec abschließen“ oder „Weiter an der Spec arbeiten“.
- **W · Sichtbarer Review-Bericht** · Aussage — Voller Bericht ohne Abschnitt mit nächsten Schritten und Befehlen.
- **W · Followup-Runden** · Aussage — Der Spec-Review-Orchestrator läuft mit seinen Followup-Runden; diese lösen kein weiteres Review aus.
- **W · Abschluss ohne Punkte** · Aussage — Bei ✅ ohne jeden Punkt schließt die Etappe ohne Frage ab.
- **W · Abschluss trotz 🔴** · Aussage — Die Abschlussfrage bietet „Spec abschließen“ bei jeder Farbe an; offene Punkte wandern in Zustand und Grill-Brief.
- **W · Commit im Whiteboarding-Teil** · Aussage — Nur die Leit-Session committet Spec, Glossar und ADRs nach dem `final` des Whiteboardings.
- **W · Einzelaufruf unverändert** · Aussage — Ohne Session-Kette laufen die Whiteboarding-Skills wie heute.
- **W · Begriff Etappen-Session** · Aussage — Sie meldet sich über ihr Turn-Ende, ein `final` zusätzlich per Nachricht an die Leit-Session.
- **W · Zeile bei in-progress** · Aussage — Die Leit-Session gibt genau `<etappe>: läuft` aus statt zu schweigen.
- **R1 · Commits** — geändert — Klarstellung: Der Widerspruch löst sich aus der Spec selbst, weil die Entscheidung zum unveränderten Einzelaufruf die Einzelaufruf-Seite stützt und der Commit-Verzicht im Kontext der Session-Kette steht; die Commit-Vorgabe und der Einleitungssatz zum dritten Punkt sind jetzt auf die Session-Kette beschränkt, ohne Session-Kette committet das Whiteboarding wie heute.
- **R1 · Soll-Vorgaben** — geändert — Klarstellung: Die bestehenden Vorgaben zu Modell des Reviews, Einzelaufruf beider Skills, Ziel der Nachricht im Brief und Verzicht auf weitere Sessions und Nachrichten sind jetzt über AC-20 bis AC-22 und ein auf beide Skills erweitertes AC-17 prüfbar; die drei Unterüberschriften tragen ein Beleg-Tag.
