# Plan-Review neu ausrichten

Status: bestätigt am 2026-09-28
Art: verankert
Basis: 1570fc8

## Was, wie, wo, warum
Heute kann jeder der fünf Reviewer des Plan-Reviews blocken. Und eine Festlegung, die die Spec offen lässt, kann eine Spec-Rückfrage auslösen. · Git

Neues Ziel: Der Plan ist umsetzbar, und alles aus der Spec steckt drin. · Aussage

Diese Spec legt fest, wer im Plan-Review blockt, welche Kategorie jeder Reviewer vergibt, was ein Skript direkt prüft und wann eine Rückfrage an die Spec geht. Den Ablauf eines Laufs, die Farben der Kategorien, den Deckel und die Status legt sie nicht fest. · Aussage

Zur Einordnung der Kategorien: `widerspruch`, `fehlendes-verhalten`, `unerfuellbar`, `ac-fehlt-im-plan` und `umsetzer-steckt-fest` blocken. `detail` ist ein Hinweis, `formulierung` eine Anmerkung. · Aussage

## Theoretisches Verhalten nach Umsetzung
Drei Skript-Prüfungen laufen ohne KI über den ganzen Plan, in Runde 1 und in der Nachprüfung:
- **AC-Abdeckung:** Jede AC-ID der Spec steht in mindestens einem Task unter dessen ACs. Fehlt eine, meldet das Skript `ac-fehlt-im-plan` an diesem AC. · Aussage
- **Nummerierung:** Die Tasks sind lückenlos ab 1 nummeriert. Sonst meldet das Skript `umsetzer-steckt-fest` am ersten falsch nummerierten Task. · Aussage
- **Anker:** Jede Zeile, die die Anker-Prüfung mit ❌ markiert, meldet das Skript als `umsetzer-steckt-fest` an ihrem Task. · Aussage

Die Befunde der Skript-Prüfungen sind auch in der Nachprüfung 🔴, auch außerhalb der Prüfliste. Ob ein solcher Punkt erledigt ist, entscheidet das Skript, nicht der Nachprüfer. · Aussage

Die Reviewer prüfen in Runde 1 und vergeben je Finding eine Kategorie:
- **`coverage`:** Nennt ein Task ein AC, setzt es aber nur teilweise um oder belegt es mit keinem Test, ist das `ac-fehlt-im-plan`. Das Finding nennt jede fehlende Teilaussage. Fehlt eine Soll-Vorgabe der Spec in den Global Constraints oder weicht sie dort ab, ist das ebenfalls `ac-fehlt-im-plan`. Ein Task ohne Verifikation ist `detail`. · Aussage
- **`feasibility`:** `umsetzer-steckt-fest` ist es, wenn ein Task etwas braucht, das kein früherer Task liefert und das im Repo fehlt; wenn dieselbe Funktion, derselbe Typ oder dasselbe Feld in zwei Tasks verschieden heißt; wenn eine externe Voraussetzung weder hergestellt noch im Repo vorhanden ist; oder wenn ein mit ⚠ markierter Anker von keinem früheren Task eingeführt wird. Hebt ein späterer Task auf, was ein früherer gebaut hat, ist das `widerspruch`. · Aussage
- **`buildability`:** `umsetzer-steckt-fest` ist ein Platzhalter statt Code, ein Code-Schritt ohne Code, ein Befehl, den das Projekt verbietet, ein Tool-Aufruf mit falschem oder fehlendem Parameter und ein vorgeschriebener Build-, Test- oder Lint-Schritt, der im Projekt nicht eingerichtet ist. Der Zuschnitt eines Tasks, Fremd-Code und Doku-Zitate aus Bibliotheken sind `detail`. Dateien, Anker und Nummerierung prüft `buildability` nicht mehr. · Aussage
- **`architecture` und `risks`:** Sie sind nur beratend. Ihre Findings stehen höchstens als 🟡. · Aussage

Die Nacharbeit schreibt eine Spec-Rückfrage nur, wenn die Spec sich widerspricht oder etwas Unmögliches verlangt. Eine Festlegung, die die Spec offen lässt, trifft sie selbst im Plan. · Aussage

Hatte ein früherer Lauf an einer Stelle eine Spec-Rückfrage, prüft ein neuer Lauf diese Stelle wie jede andere. Findings dort werden nicht verworfen. · Aussage

Nächster Schritt im Bericht, je Status:
- `sauber …` mit Hinweisen: zuerst optional `/dv-forge:review-followup <plan> <auswahl>` mit dem Auswahl-Hinweis, dann wie ohne Hinweise · Git
- `sauber …`, Spec und Plan sind committet: in einer frischen Session `/dv-forge:implementation <plan>` · Git
- `sauber …`, Spec oder Plan ist nicht committet: die Frage „Plan ist bereit. Soll ich Spec und Plan jetzt committen?“; nach einem Ja werden beide committet, danach folgt `/dv-forge:implementation <plan>` · Git
- `Fragen offen`: die Spec anpassen, dann `/dv-forge:spec-review <spec>`, danach `/dv-forge:plan-review <plan>` erneut starten · Git
- `nicht bereit …`: Findings und Scout-Vorschläge lesen, dann `/dv-forge:review-followup <plan> <auswahl>` oder den Plan selbst anpassen und `/dv-forge:plan-review <plan>` erneut starten; betreffen die Änderungen nur einzelne Reviewer, mit `--only <reviewer,...>` · Git

## Soll-Vorgaben
- Blocken können nur `coverage`, `feasibility`, der Kern von `buildability` und die drei Skript-Prüfungen. Die Skript-Prüfungen übernehmen, was bisher `coverage` und `buildability` von Hand geprüft haben. · Aussage
- Die Skript-Prüfungen urteilen ohne KI. Gleicher Plan, gleiche Spec und gleicher Code ergeben immer dieselben Befunde. · Aussage
- W-Einträge in Spec und Plan sind bindende Entscheidungen des Menschen. Ein W-Eintrag ist nie selbst ein Finding. · Git

## Akzeptanzkriterien
- **AC-01** Gegeben eine Spec mit AC-05, das in keinem Task unter den ACs steht, wenn Runde 1 endet, dann meldet die Skript-Prüfung an AC-05 ein Finding der Kategorie `ac-fehlt-im-plan`, und es steht als 🔴. · Aussage
- **AC-02** Gegeben ein Plan mit den Tasks 1, 2 und 4, wenn Runde 1 endet, dann meldet die Skript-Prüfung an Task 4 ein Finding der Kategorie `umsetzer-steckt-fest`, und es steht als 🔴. · Aussage
- **AC-03** Gegeben eine Änderungszeile mit einem Anker, den es in der Datei nicht gibt und den kein früherer Task anlegt, wenn Runde 1 endet, dann meldet die Skript-Prüfung an diesem Task ein Finding der Kategorie `umsetzer-steckt-fest`, und es steht als 🔴. · Aussage
- **AC-04** Gegeben die Nacharbeit nimmt AC-07 aus dem einzigen Task, der es nannte, und AC-07 steht nicht auf der Prüfliste, wenn die Nachprüfung endet, dann steht an AC-07 ein 🔴 und zählt zu den offenen 🔴. · Aussage
- **AC-05** Gegeben eine ❌-Zeile aus Runde 1, die die Nacharbeit behoben hat, wenn die Nachprüfung endet, dann steht dieser Punkt als erledigt, weil die Skript-Prüfung dort kein ❌ mehr meldet. · Aussage
- **AC-06** Gegeben ein Task nennt AC-03, setzt aber nur einen von zwei Fällen daraus um, wenn Runde 1 endet, dann liegt an AC-03 ein Finding der Kategorie `ac-fehlt-im-plan`, das den fehlenden Fall nennt. · Aussage
- **AC-07** Gegeben ein AC, das ein Task umsetzt, aber kein Test belegt, wenn Runde 1 endet, dann liegt an diesem AC ein Finding der Kategorie `ac-fehlt-im-plan`. · Aussage
- **AC-08** Gegeben eine Soll-Vorgabe der Spec, die in den Global Constraints fehlt, wenn Runde 1 endet, dann liegt an „Global Constraints“ ein Finding der Kategorie `ac-fehlt-im-plan`. · Aussage
- **AC-09** Gegeben ein Task ohne Verifikation, wenn Runde 1 endet, dann ist das Finding an diesem Task `detail`. · Aussage
- **AC-10** Gegeben Task 3 braucht eine Funktion, die erst Task 5 liefert und die es im Repo nicht gibt, wenn Runde 1 endet, dann liegt an Task 3 ein Finding der Kategorie `umsetzer-steckt-fest`. · Aussage
- **AC-11** Gegeben eine Funktion heißt in Task 2 anders als in Task 4, wenn Runde 1 endet, dann liegt ein Finding der Kategorie `umsetzer-steckt-fest` vor. · Aussage
- **AC-12** Gegeben der Plan nutzt ein Paket, das er weder installiert noch im Repo vorfindet, wenn Runde 1 endet, dann liegt ein Finding der Kategorie `umsetzer-steckt-fest` vor. · Aussage
- **AC-13** Gegeben Task 5 hebt auf, was Task 2 gebaut hat, wenn Runde 1 endet, dann liegt an Task 5 ein Finding der Kategorie `widerspruch`. · Aussage
- **AC-14** Gegeben ein Code-Schritt mit „TODO“ statt Code, wenn Runde 1 endet, dann liegt an seinem Task ein Finding der Kategorie `umsetzer-steckt-fest`. · Aussage
- **AC-15** Gegeben eine Verifikation über einen Befehl, den die Projekt-CLAUDE.md verbietet, wenn Runde 1 endet, dann liegt an ihrem Task ein Finding der Kategorie `umsetzer-steckt-fest`. · Aussage
- **AC-16** Gegeben ein vorgeschriebener Lint-Schritt, für den im Projekt kein Lint-Skript eingerichtet ist, wenn Runde 1 endet, dann liegt an seinem Task ein Finding der Kategorie `umsetzer-steckt-fest`. · Aussage
- **AC-17** Gegeben ein Task mit mehreren Ergebnissen, die sich unabhängig voneinander ablehnen lassen, wenn Runde 1 endet, dann ist das Finding dazu `detail`. · Aussage
- **AC-18** Gegeben ein Doku-Zitat einer Bibliothek, das nicht zur installierten Version passt, wenn Runde 1 endet, dann ist das Finding dazu `detail`. · Aussage
- **AC-19** Gegeben `architecture` meldet den Verstoß gegen eine Regel der Projekt-CLAUDE.md als `umsetzer-steckt-fest`, wenn die Runde eingestuft wird, dann steht das Finding als 🟡. · Aussage
- **AC-20** Gegeben `risks` meldet fehlende Fehlerbehandlung als `widerspruch`, wenn die Runde eingestuft wird, dann steht das Finding als 🟡. · Aussage
- **AC-21** Gegeben eine 🔴-Stelle, die sich durch eine von der Spec offen gelassene Festlegung lösen lässt, wenn die Nacharbeit endet, dann ist die Festlegung im Plan getroffen, und es gibt dazu keine Spec-Rückfrage. · Aussage
- **AC-22** Gegeben eine 🔴-Stelle, die auf zwei sich widersprechenden ACs der Spec beruht, wenn die Nacharbeit endet, dann gibt es dazu eine Spec-Rückfrage, und der Plan ist an dieser Stelle unverändert. · Aussage
- **AC-23** Gegeben eine 🔴-Stelle, die auf einer unerfüllbaren Anforderung der Spec beruht, wenn die Nacharbeit endet, dann gibt es dazu eine Spec-Rückfrage. · Aussage
- **AC-24** Gegeben ein früherer Lauf hatte an AC-04 eine Spec-Rückfrage, wenn ein neuer Lauf an AC-04 ein Finding meldet, dann bleibt es erhalten und wird eingestuft wie jedes andere. · Aussage
- **AC-25** Gegeben der Status `sauber nach Runde 1` mit zwei Hinweisen, wenn der Bericht erscheint, dann nennt er zuerst `/dv-forge:review-followup <plan> <auswahl>` als optionalen Schritt, mit dem Auswahl-Hinweis. · Git
- **AC-26** Gegeben der Status `sauber nach Nachprüfung` und Spec und Plan sind committet, wenn der Bericht erscheint, dann nennt er `/dv-forge:implementation <plan>` für eine frische Session und stellt keine Commit-Frage. · Git
- **AC-27** Gegeben der Status `sauber nach Nachprüfung` und Spec oder Plan ist nicht committet, wenn der Bericht erscheint, dann fragt er „Plan ist bereit. Soll ich Spec und Plan jetzt committen?“. · Git
- **AC-28** Gegeben der Status `Fragen offen` mit einer Spec-Rückfrage, wenn der Bericht erscheint, dann nennt er als nächsten Schritt, die Spec anzupassen, `/dv-forge:spec-review <spec>` und danach `/dv-forge:plan-review <plan>` erneut zu starten. · Git
- **AC-29** Gegeben der Status `nicht bereit, 1 × 🔴 offen`, wenn der Bericht erscheint, dann nennt er `/dv-forge:review-followup <plan> <auswahl>` und das erneute `/dv-forge:plan-review <plan>` mit dem Hinweis auf `--only`. · Git

## Entscheidungen
- **W · Ziel Plan-Review** · Aussage — Der Plan ist umsetzbar, und alles aus der Spec steckt drin.
- **W · Wer im Plan-Review blockt** · Aussage — Nur `coverage`, `feasibility` und der Kern von `buildability` blocken. `architecture` und `risks` geben nur Hinweise.
- **W · Spec-Rückfrage** · Aussage — Eine Rückfrage an die Spec gibt es nur, wenn die Spec sich widerspricht oder Unmögliches verlangt. Details, die die Spec offen lässt, entscheidet der Plan selbst.
- **W · Skript-Prüfungen** · Aussage — AC-Abdeckung, lückenlose Nummerierung und ❌-Zeilen der Anker-Prüfung meldet ein Skript direkt als 🔴, in Runde 1 und in der Nachprüfung.
- **W · Kategorien je Reviewer** · Aussage — `coverage`: fehlendes oder teilweise umgesetztes AC, auch ohne Test, und eine fehlende oder abweichende Soll-Vorgabe sind `ac-fehlt-im-plan`; ein Task ohne Verifikation ist `detail`. `feasibility`: nicht gelieferte Vorleistung, uneinheitliche Namen oder Typen, fehlende externe Voraussetzung und ein ⚠-Anker ohne früheren Task sind `umsetzer-steckt-fest`; ein späterer Task, der einen früheren aufhebt, ist `widerspruch`. `buildability`: Platzhalter, Code-Schritt ohne Code, verbotener Befehl und Tool-Aufruf mit falschem Parameter sind `umsetzer-steckt-fest`; Zuschnitt, Fremd-Code und Doku-Zitate sind `detail`. `architecture` und `risks` vergeben eine beliebige Kategorie, das Skript stuft sie auf 🟡 herab.
- **W · Nicht eingerichteter Schritt** · Aussage — Ein vorgeschriebener Build-, Test- oder Lint-Schritt, der im Projekt nicht eingerichtet ist, gehört zum Kern von `buildability` und blockt.
- **W · Frühere Spec-Rückfragen** · Aussage — Solche Stellen werden normal geprüft, ohne Filter.
- **W · Skript-Befunde in der Nachprüfung** · Aussage — Sie bleiben 🔴 und zählen zu den offenen 🔴. Ob ein solcher Punkt erledigt ist, entscheidet das Skript, nicht der Nachprüfer.
- **W · Skript- und Reviewer-Befund an derselben Stelle** · Aussage — Die Stelle zählt einmal, der Skript-Befund gilt.
- **W · Fehlende Soll-Vorgaben** · Aussage — Je fehlender oder abweichender Soll-Vorgabe ein eigenes Finding `ac-fehlt-im-plan` an „Global Constraints“. Fehlt der Abschnitt „Global Constraints“, fehlt jede Soll-Vorgabe der Spec.
- **W · Falsche Nummerierung** · Aussage — Gemeldet wird der erste Task, dessen Nummer nicht seiner Position entspricht; das deckt Lücke, Doppelnummer und falsche Reihenfolge ab. Ein Plan ohne Tasks ist ein eigenes Finding `umsetzer-steckt-fest`.
- **W · Ablauf nach dem Ja** · Aussage — Ein eigenes AC prüft, dass nach dem Ja Spec und Plan committet werden und danach `/dv-forge:implementation <plan>` folgt.
- **W · Anker-Markierungen** · Aussage — ❌ heißt: Anker fehlt in der Datei, und das Skript erkennt deterministisch, dass kein früherer Task ihn anlegt. ⚠ heißt: das Skript kann das nicht sicher entscheiden, `feasibility` prüft es. Derselbe Anker wird nie doppelt gemeldet.
- **W · Neue ACs** · Aussage — Aufgenommen werden ACs für: ⚠-Anker ohne früheren Task (`feasibility`, `umsetzer-steckt-fest` an diesem Task), Tool-Aufruf mit falschem oder fehlendem Parameter und Code-Schritt ohne Code (`buildability`, je `umsetzer-steckt-fest`), und Determinismus der Skript-Prüfungen (zwei Läufe auf gleichem Plan, gleicher Spec und gleichem Code ergeben dieselben Befunde).
- **R1 · Theoretisches Verhalten nach Umsetzung** — frage an den menschen — Mehrere Randfälle sind ungeregelt und brauchen neues Verhalten: (a) Meldet ein Reviewer dieselbe Stelle wie ein Skript-Befund, zählt sie einmal oder doppelt? Naheliegend: einmal, Skript-Befund gilt. (b) Fehlen mehrere Soll-Vorgaben: ein Finding je Vorgabe oder ein Sammel-Finding an „Global Constraints“? Und was gilt, wenn der Plan keine Global Constraints hat? Naheliegend: je Vorgabe ein Finding an „Global Constraints“; fehlender Abschnitt = jede Vorgabe fehlt. (c) Nummerierung bei Doppelnummer, falscher Reihenfolge oder Plan ohne Tasks: erster Task, dessen Nummer nicht seiner Position entspricht, und leerer Plan als eigenes Finding? (d) Soll ein neues AC den Ablauf nach dem Ja (Commit beider Dateien, dann `/dv-forge:implementation <plan>`) prüfen? Naheliegend: ja.
- **R1 · AC-27** — geändert — Bedingung auf „Spec oder Plan ist nicht committet“ geschärft, wie im Abschnitt zum nächsten Schritt festgelegt.
- **R1 · AC-03** — frage an den menschen — Die Spec legt die Bedeutung von ❌ und ⚠ der Anker-Prüfung nicht fest. Soll ❌ heißen „Anker fehlt und kein früherer Task legt ihn an“ (Skript erkennt das selbst, ⚠ = Skript kann es nicht sicher entscheiden, feasibility prüft), oder meldet das Skript jeden fehlenden Anker und feasibility allein prüft die Einführung durch frühere Tasks? Naheliegend: erste Variante, ohne Doppelmeldung.
- **R1 · buildability** — frage an den menschen — Ein AC für den Tool-Aufruf mit falschem oder fehlendem Parameter (und ggf. den Code-Schritt ohne Code) wäre neu. Soll es aufgenommen werden (Kategorie `umsetzer-steckt-fest`)? Naheliegend: ja / nein, genügt als Aussage.
- **R1 · feasibility** — frage an den menschen — Ein AC für den ⚠-Anker ohne früheren Task wäre neu und hängt an der Antwort zu AC-03. Soll es aufgenommen werden? Naheliegend: ja, Finding `umsetzer-steckt-fest` an diesem Task.
- **R1 · Soll-Vorgaben** — frage an den menschen — Ein AC für den Determinismus der Skript-Prüfungen wäre neu. Soll es aufgenommen werden, etwa „zweimal derselbe Lauf auf gleichem Plan, gleicher Spec und gleichem Code ergibt dieselben Befunde“? Naheliegend: ja / nein, bleibt Soll-Vorgabe.
- **R1 · Was, wie, wo, warum** — nicht geändert — Der zitierte Commit-Hash steht nicht in diesem Abschnitt, sondern in den Kopfmetadaten der Spec; er beschreibt kein Verhalten und der Bau braucht seinen Inhalt nicht.
