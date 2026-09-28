# Review-Ablauf: einmal suchen, Skript entscheidet

Status: bestätigt am 2026-09-28
Art: verankert
Basis: 3ce509e

## Was, wie, wo, warum
Spec-Review und Plan-Review finden Runde um Runde neue Kleinigkeiten und hören nicht auf. Heute sucht jede Runde mit frischen Reviewern im inzwischen längeren Dokument, und bis zu vier Runden sind möglich. · Anhang

Neu gilt für beide Reviews ein gemeinsamer Ablauf: Nur Runde 1 sucht, danach wird nur nachgeprüft. Die KI findet und ordnet jedes Finding einer Kategorie zu. Ein Skript entscheidet, was blockt und wann Schluss ist. · Aussage

Nicht Teil dieser Spec: Ziele und Prüfaufträge der einzelnen Reviewer, die Eingaben des Scouts je Review, der Umgang eines Plan-Reviews mit Spec-Rückfragen aus früheren Läufen und das Implementierungs-Review, bis auf die Hochstufung. · Aussage

## Theoretisches Verhalten nach Umsetzung
Ein Lauf des Spec- oder Plan-Reviews:

1. **Runde 1, Suche:** Alle aktiven Reviewer prüfen gleichzeitig das ganze Dokument. Jedes Finding nennt Stelle, Zitat, Kategorie, Konsequenz und Begründung, aber keine Farbe. · Aussage
2. **Einstufung:** Ein Skript leitet aus der Kategorie die Farbe ab, filtert und deckelt. Findings an derselben Stelle bilden eine Gruppe mit der höchsten Farbe ihrer Findings. Zwei 🟡 an einer Stelle bleiben 🟡. · Aussage
3. **Ohne 🔴 und ohne offene Frage:** Es gibt keine Nacharbeit und keine Nachprüfung. Gibt es Hinweise, macht der Scout Vorschläge dazu. Der Lauf endet mit `sauber nach Runde 1`. · Aussage
4. **Scout:** Gibt es ein 🔴, macht der Scout vor der Nacharbeit zu jeder 🔴- und 🟡-Stelle ein bis drei Vorschläge und markiert einen als bevorzugt. · Aussage
5. **Nacharbeit:** Sie bekommt nur die 🔴-Stellen, mit Findings und Scout-Vorschlägen. Je Stelle entscheidet sie: geändert, nicht geändert mit Begründung, oder Frage an den Menschen. Hinweise bearbeitet sie nicht. · Aussage
6. **Fragen an den Menschen:** Die Nacharbeit bündelt die Fragen je Regel. Jede Frage nennt alle betroffenen Stellen, die Unterfälle und eine empfohlene Antwort. Offene Fragen aus früheren Läufen kommen dazu, auch wenn Runde 1 kein 🔴 hat. Der Lauf hält an und zeigt die Fragen gesammelt. · Aussage
7. **Antwort:** Der Mensch antwortet im Chat. Die Nacharbeit trägt jede Antwort als W-Eintrag ein und passt das Dokument an. Antwortet der Mensch „später“, bleiben die Fragen offen, und der Lauf geht weiter. · Aussage
8. **Plan-Review:** Dort ist eine Frage an den Menschen eine Spec-Rückfrage. Der Lauf wartet nicht auf eine Antwort, die Rückfrage bleibt offen, und der Lauf geht weiter. · Aussage
9. **Runde 2, Nachprüfung:** Ein Skript baut die Prüfliste aus den 🔴-Stellen der Runde 1 und den Stellen beantworteter Fragen. Stellen mit offener Frage stehen nicht darauf. Das Skript ermittelt außerdem die Bereiche, die die Nacharbeit geändert hat. · Aussage
10. **Urteil:** Ein eigener Nachprüfer urteilt je Punkt der Prüfliste „erledigt“ oder „nicht erledigt“. Punkte aus einer Skript-Prüfung beurteilt stattdessen das Skript. Die geänderten Bereiche prüft er nur darauf, ob der neue Text dem Rest widerspricht. Er sucht nicht neu, und kein Reviewer läuft ein zweites Mal. · Aussage
11. **Ende:** Nach der Nachprüfung endet der Lauf. Es gibt keine weitere Nacharbeit. · Aussage
12. **Bericht:** Er zeigt den Status, das Urteil je Punkt der Prüfliste, jeden Widerspruch, jeden Hinweis mit seinen Scout-Vorschlägen und alle offenen Fragen mit ihren Stellen. Hinweise lassen sich mit `/dv-forge:review-followup` auswählen und umsetzen. · Aussage

Ein neuer Lauf sucht in Runde 1 wieder das ganze Dokument ab. An Stellen mit offener Frage meldet er keine Findings. Stattdessen stellt er die offenen Fragen erneut. · Aussage

Nach einem Spec- oder Plan-Review setzt `/dv-forge:review-followup` die gewählten Vorschläge um und prüft danach nur nach, wie in Runde 2. Kein Reviewer sucht dort neu. · Aussage

Das Implementierungs-Review bleibt, wie es ist. Seine Reviewer vergeben weiter eine Farbe. Auch dort werden zwei 🟡 an einer Stelle nicht mehr zu 🔴. · Aussage

Status am Ende, in dieser Rangfolge; es gilt der erste, der zutrifft:
- `unvollständig, ausgefallen: <liste>`: Ein Reviewer oder der Nachprüfer hat nach Nachforderung und Neustart kein gültiges Ergebnis geliefert. Fällt ein Reviewer in Runde 1 aus, endet der Lauf sofort. · Aussage
- `Fragen offen`: Mindestens eine Frage an den Menschen oder eine Spec-Rückfrage ist offen. Der Bericht zeigt trotzdem alle offenen 🔴. · Aussage
- `nicht bereit, k × 🔴 offen`: Nach der Nachprüfung ist ein Punkt nicht erledigt, es gibt einen Widerspruch, oder eine Skript-Prüfung meldet ein 🔴. k ist die Summe daraus. · Aussage
- `sauber nach Runde 1` oder `sauber nach Nachprüfung`: nichts davon trifft zu. · Aussage

## Soll-Vorgaben
- **Deckel:** Höchstens zwei Runden je Lauf und genau eine Nacharbeit, für Spec- und Plan-Review gleich. Kein Schalter erlaubt mehr Runden. · Aussage
- **Mechanisch:** Farbe, Filter, Deckelungen, Prüfliste, geänderte Bereiche und Status bestimmt ein Skript ohne Urteil einer KI. Gleiche Findings und gleiche Urteile ergeben immer die gleichen Farben, den gleichen Ablauf und den gleichen Status. · Aussage
- **Urteil der KI:** Nur die KI entscheidet, ob etwas ein Finding ist und welche Kategorie es hat. Außerdem liefert sie die Scout-Vorschläge, den Text der Nacharbeit, die Bündelung der Fragen je Regel und die Urteile der Nachprüfung. · Aussage
- **Kategorien und Farben:** · Aussage
  - `widerspruch` → 🔴 · Aussage
  - `fehlendes-verhalten` → 🔴, nur wenn eine beschriebene Funktion gar kein AC hat oder eine Aktion gar kein Ergebnis · Aussage
  - `unerfuellbar` → 🔴 · Aussage
  - `ac-fehlt-im-plan` → 🔴, nur im Plan-Review: Ein AC der Spec fehlt im Plan oder ist nur teilweise umgesetzt · Aussage
  - `umsetzer-steckt-fest` → 🔴, nur im Plan-Review, auch bei einem Befehl, den das Projekt verbietet · Aussage
  - `detail` → 🟡: Randfall, Schreibweise, Sortierung und jede Einzelheit, die der Plan selbst entscheiden kann · Aussage
  - `formulierung` → 🟢 · Aussage
- **Ungültige Kategorie:** Eine Kategorie, die das Review nicht kennt, macht das Ergebnis des Reviewers ungültig. Das gilt auch für eine Plan-Kategorie im Spec-Review. Der Reviewer wird dann nachgefordert wie bei einem fehlenden Ergebnis. · Aussage
- **Höchstens 🟡:** Das Skript stuft auf höchstens 🟡 herab:
  - Findings von Reviewern, die ein Review als nur beratend führt · Aussage
  - Findings, deren ganzes Zitat aus einem W-Eintrag stammt · Aussage
  - Findings, deren Text eines dieser Wörter nennt: Groß- oder Kleinschreibung, ß, Umlaut, Diakritik · Aussage
  - in der Nachprüfung jedes Finding an einer Stelle außerhalb der Prüfliste, außer einem Widerspruch in einem geänderten Bereich und außer dem Befund einer Skript-Prüfung · Aussage
- **Entfällt:** Das Skript verwirft diese Findings:
  - Findings zu den Kopfzeilen `Status`, `Art`, `Workitem`, `Basis` · Aussage
  - Findings an einer Stelle mit offener Frage an den Menschen · Aussage
- **Offene Frage:** Eine Frage an den Menschen gilt als offen, bis ein W-Eintrag sie beantwortet. · Git
- **Bündelung prüfen:** Jede Stelle mit einer Frage an den Menschen steht in genau einer gebündelten Frage. Das prüft ein Skript. Fehlt eine Stelle oder steht sie doppelt, wird die Nacharbeit einmal zur Korrektur aufgefordert. · Aussage
- **Skript-Prüfungen:** Ein Review kann Prüfungen haben, die ein Skript ohne KI über das ganze Dokument macht. Sie laufen in Runde 1 und in der Nachprüfung. Ihre Befunde bleiben auch in der Nachprüfung 🔴 und zählen zu den offenen 🔴. · Aussage
- **Geänderter Bereich:** In der Spec ist das ein Abschnitt oder ein AC, im Plan ein Task. Bereiche, die die Nacharbeit nebenbei geändert hat, zählen mit. · Aussage
- **Entscheidungen:** Änderungen im Abschnitt `Entscheidungen` machen ihn nicht zu einem geänderten Bereich. · Anhang

## Akzeptanzkriterien
- **AC-01** Gegeben ein Finding der Kategorie `widerspruch`, `fehlendes-verhalten` oder `unerfuellbar`, wenn die Runde eingestuft wird, dann steht es als 🔴. · Aussage
- **AC-02** Gegeben im Plan-Review ein Finding der Kategorie `ac-fehlt-im-plan` oder `umsetzer-steckt-fest`, wenn die Runde eingestuft wird, dann steht es als 🔴. · Aussage
- **AC-03** Gegeben ein Finding der Kategorie `detail` und eines der Kategorie `formulierung`, wenn die Runde eingestuft wird, dann steht das erste als 🟡 und das zweite als 🟢. · Aussage
- **AC-04** Gegeben im Spec-Review ein Finding der Kategorie `ac-fehlt-im-plan` oder einer Kategorie außerhalb der Liste, wenn die Runde eingestuft wird, dann gilt das Ergebnis dieses Reviewers als ungültig, und er wird nachgefordert. · Aussage
- **AC-05** Gegeben zwei Reviewer melden an derselben Stelle je ein 🟡, wenn die Runde eingestuft wird, dann steht die Stelle als 🟡. · Aussage
- **AC-06** Gegeben ein Reviewer, den das Review als nur beratend führt, meldet ein Finding der Kategorie `widerspruch`, wenn die Runde eingestuft wird, dann steht es als 🟡. · Aussage
- **AC-07** Gegeben ein Finding der Kategorie `fehlendes-verhalten`, dessen ganzes Zitat aus einem W-Eintrag stammt, wenn die Runde eingestuft wird, dann steht es als 🟡. · Aussage
- **AC-08** Gegeben ein Finding der Kategorie `widerspruch`, dessen Zitat einen Satz der Spec einem W-Eintrag gegenüberstellt, wenn die Runde eingestuft wird, dann steht es als 🔴. · Aussage
- **AC-09** Gegeben ein Finding der Kategorie `fehlendes-verhalten`, dessen Text das Wort „Umlaut“ nennt, wenn die Runde eingestuft wird, dann steht es als 🟡. · Aussage
- **AC-10** Gegeben ein Finding zur Kopfzeile `Basis`, wenn die Runde eingestuft wird, dann erscheint es weder im Bericht noch bei der Nacharbeit. · Aussage
- **AC-11** Gegeben dieselben Ergebnisse der Reviewer, wenn die Einstufung zweimal läuft, dann sind Farben, verworfene Findings und Status beide Male gleich. · Aussage
- **AC-12** Gegeben Runde 1 ohne 🔴 und ohne offene Frage, mit zwei Hinweisen, wenn Runde 1 endet, dann laufen keine Nacharbeit und keine Nachprüfung, der Scout liefert Vorschläge zu beiden Hinweisen, und der Status lautet `sauber nach Runde 1`. · Aussage
- **AC-13** Gegeben Runde 1 mit einer 🔴-Stelle und einer 🟡-Stelle, wenn die Nacharbeit startet, dann hat sie die 🔴-Stelle mit den Scout-Vorschlägen dazu erhalten, die 🟡-Stelle aber nicht. · Aussage
- **AC-14** Gegeben eine 🟡-Stelle aus Runde 1, wenn der Lauf endet, dann hat die Nacharbeit für sie keinen Eintrag geschrieben, und der Bericht zeigt sie als Hinweis mit ihren Scout-Vorschlägen. · Aussage
- **AC-15** Gegeben die Nacharbeit meldet Fragen an den Menschen, wenn der Lauf anhält, dann nennt jede gezeigte Frage ihre Stellen, ihre Unterfälle und eine empfohlene Antwort, und jede Stelle mit Frage steht in genau einer Frage. · Aussage
- **AC-16** Gegeben drei Stellen mit Frage an den Menschen und gebündelte Fragen, in denen eine davon fehlt, wenn das Skript die Bündelung prüft, dann wird die Nacharbeit einmal zur Korrektur aufgefordert. · Aussage
- **AC-17** Gegeben der Lauf hält mit einer Frage zu AC-04 an, wenn der Mensch im Chat antwortet, dann steht die Antwort danach als W-Eintrag im Dokument, und AC-04 steht auf der Prüfliste. · Aussage
- **AC-18** Gegeben der Lauf hält mit einer Frage an, wenn der Mensch „später“ antwortet, dann läuft die Nachprüfung für die übrigen Punkte, und der Status lautet `Fragen offen`. · Aussage
- **AC-19** Gegeben im Plan-Review meldet die Nacharbeit eine Spec-Rückfrage, wenn die Nacharbeit endet, dann hält der Lauf nicht an, die Nachprüfung läuft für die übrigen Punkte, und der Status lautet `Fragen offen` mit der Spec-Rückfrage im Bericht. · Aussage
- **AC-20** Gegeben eine Spec mit einer offenen Frage zu AC-04, wenn ein neuer Lauf in Runde 1 ein 🔴 an AC-04 findet, dann erscheint dieses Finding nicht, und die offene Frage wird erneut gestellt. · Aussage
- **AC-21** Gegeben eine Spec mit einer offenen Frage und eine Runde 1 ohne 🔴, wenn Runde 1 endet, dann hält der Lauf an und stellt die offene Frage. · Aussage
- **AC-22** Gegeben drei 🔴-Stellen aus Runde 1 ohne Frage an den Menschen, wenn die Nachprüfung endet, dann nennt der Bericht für genau diese drei Stellen je „erledigt“ oder „nicht erledigt“, und kein Reviewer aus Runde 1 ist erneut gelaufen. · Aussage
- **AC-23** Gegeben die Nacharbeit ändert nebenbei einen Abschnitt, der nicht auf der Prüfliste steht, und der neue Text widerspricht einem AC, wenn die Nachprüfung endet, dann steht dieser Widerspruch als 🔴 im Bericht. · Aussage
- **AC-24** Gegeben die Nachprüfung meldet ein Finding an einer Stelle außerhalb der Prüfliste, das weder ein Widerspruch in einem geänderten Bereich noch der Befund einer Skript-Prüfung ist, wenn es eingestuft wird, dann steht es als 🟡. · Aussage
- **AC-25** Gegeben die Nacharbeit hat außer dem Abschnitt `Entscheidungen` nichts geändert, wenn die Nachprüfung läuft, dann prüft sie keinen Bereich auf Widerspruch. · Anhang
- **AC-26** Gegeben nach der Nachprüfung sind alle Punkte erledigt, es gibt keinen Widerspruch und keine offene Frage, wenn der Lauf endet, dann lautet der Status `sauber nach Nachprüfung`, und keine weitere Runde startet. · Aussage
- **AC-27** Gegeben nach der Nachprüfung sind zwei Punkte nicht erledigt und keine Frage offen, wenn der Lauf endet, dann lautet der Status `nicht bereit, 2 × 🔴 offen`, und es gibt keine zweite Nacharbeit. · Aussage
- **AC-28** Gegeben am Ende ist eine Frage offen und ein Punkt nicht erledigt, wenn der Lauf endet, dann lautet der Status `Fragen offen`, und der Bericht zeigt den nicht erledigten Punkt. · Aussage
- **AC-29** Gegeben ein Reviewer liefert in Runde 1 auch nach Nachforderung und Neustart kein gültiges Ergebnis, wenn Runde 1 endet, dann endet der Lauf sofort mit `unvollständig, ausgefallen: <reviewer>`. · Git
- **AC-30** Gegeben der Nachprüfer liefert auch nach Nachforderung und Neustart kein gültiges Ergebnis, wenn der Lauf endet, dann lautet der Status `unvollständig, ausgefallen: <nachprüfer>`. · Aussage
- **AC-31** Gegeben ein Aufruf des Spec- oder Plan-Reviews mit einer Rundenzahl, wenn der Lauf startet, dann bricht er mit der Meldung ab, dass das Argument unbekannt ist. · Aussage
- **AC-32** Gegeben `/dv-forge:review-followup` nach einem Spec-Review mit zwei gewählten Stellen, wenn die Vorschläge umgesetzt sind, dann urteilt der Nachprüfer je gewählter Stelle „erledigt“ oder „nicht erledigt“ und prüft die geänderten Bereiche auf Widerspruch, und kein Reviewer läuft. · Aussage
- **AC-33** Gegeben im Implementierungs-Review melden zwei Reviewer an derselben Stelle je ein 🟡, wenn die Runde eingestuft wird, dann steht die Stelle als 🟡. · Aussage
- **AC-34** Gegeben im Implementierungs-Review ein Finding mit der Farbe 🔴 und ohne Kategorie, wenn die Runde eingestuft wird, dann steht es als 🔴. · Aussage
- **AC-35** Gegeben eine Skript-Prüfung meldet in der Nachprüfung ein 🔴 an einer Stelle außerhalb der Prüfliste, wenn der Lauf endet, dann steht es als 🔴 und zählt zu den offenen 🔴. · Aussage

## Entscheidungen
- **W · Grundregel** · Aussage — Einmal suchen, danach nur nachprüfen.
- **W · Ablauf** · Aussage — Review → Scout → Nacharbeit → Nachprüfung → Ende. Fragen an den Menschen gehen gebündelt raus, je Regel eine Frage.
- **W · KI findet, Skript entscheidet** · Aussage — Reviewer vergeben eine Kategorie statt einer Farbe. Ein Skript leitet daraus die Farbe ab, zählt die Runden und filtert.
- **W · Schreibweisen** · Aussage — Schreibweisen-Details wie Groß- oder Kleinschreibung, ß oder ss und Umlaute blocken nie.
- **W · Schnitt** · Aussage — Drei Specs: der gemeinsame Ablauf mit Regelwerk (diese Spec), das Spec-Review und das Plan-Review. Diese Spec kommt zuerst.
- **W · Fragen im Lauf** · Aussage — Der Lauf hält nach der Nacharbeit an. Der Mensch antwortet im Chat, die Nacharbeit trägt die Antworten als W-Einträge ein, dann folgt die Nachprüfung.
- **W · Deckel** · Aussage — Zwei Runden: Runde 1 sucht, Runde 2 prüft nach. Es gibt genau eine Nacharbeit und keinen Schalter für mehr Runden. Das gilt für Spec und Plan gleich.
- **W · Nachprüfer** · Aussage — Ein eigener Nachprüfer urteilt je Punkt „erledigt“ oder „nicht erledigt“. Die Reviewer laufen nur in Runde 1.
- **W · Geänderte Bereiche** · Aussage — Vom Bereichs-Review bleibt nur ein Teil: Ein Skript ermittelt die geänderten Bereiche, und der Nachprüfer prüft sie nur auf Widerspruch zum Rest.
- **W · Kategorien** · Aussage — Die Liste aus dem Wunsch gilt unverändert. Ein verbotener Befehl zählt als `umsetzer-steckt-fest`. Eine unbekannte Kategorie macht das Ergebnis ungültig, und der Reviewer wird nachgefordert.
- **W · Grenze zwischen 🔴 und 🟡** · Aussage — `fehlendes-verhalten` gilt nur, wenn eine Funktion gar kein AC hat oder eine Aktion gar kein Ergebnis. Jeder Randfall ist `detail`.
- **W · Nacharbeit nur für 🔴** · Aussage — Hinweise kommen mit Scout-Vorschlag in den Bericht und lassen sich über `/dv-forge:review-followup` auswählen.
- **W · Widerspruch im geänderten Bereich** · Aussage — Er ist 🔴. Ist keine Frage offen, endet der Lauf dann mit „nicht bereit“.
- **W · Umfang** · Aussage — Das Implementierungs-Review bleibt, wie es ist. `/dv-forge:review-followup` prüft nach Spec- und Plan-Review nur nach. Die Hochstufung von 2 × 🟡 auf 🔴 entfällt überall.
- **W · Antwort „später“** · Aussage — Der Lauf endet mit `Fragen offen`. Im nächsten Lauf gibt es an diesen Stellen keine neuen Findings, und die offenen Fragen werden zusammen mit den neuen erneut gestellt.
- **W · Spec-Rückfrage** · Aussage — Im Plan-Review wartet der Lauf bei einer Spec-Rückfrage nicht auf eine Antwort, wie heute.
- **W · Status** · Aussage — Es gibt nur noch diese Status: sauber nach Runde 1, sauber nach Nachprüfung, nicht bereit mit der Zahl offener 🔴, Fragen offen, unvollständig. „Cap erreicht“, „Stillstand“ und die Fortschrittsprüfung entfallen.
- **W · Fragen bündeln** · Aussage — Die Nacharbeit bündelt die Fragen je Regel. Ein Skript prüft, dass jede Stelle mit Frage in genau einer Frage steht.
- **W · Begriffe** · Aussage — Runde (nicht: Durchlauf), Lauf, Nachprüfung (nicht: Nach-Review, Re-Review), Hinweis für ein 🟡-Finding, Kategorie.
- **W · Rangfolge der Status** · Aussage — Die Nachprüfung läuft auch bei offenen Fragen. Rangfolge: unvollständig → Fragen offen → nicht bereit → sauber. Im Plan-Review listet `Fragen offen` die Spec-Rückfragen auf.
- **W · Zitat aus W-Eintrag** · Aussage — Herabgestuft wird nur, wenn das ganze Zitat aus einem W-Eintrag stammt.
- **W · Offene Fragen ohne neues 🔴** · Aussage — Der Lauf hält trotzdem an und stellt sie.
- **W · Skript-Prüfungen in der Nachprüfung** · Aussage — Befunde einer Skript-Prüfung bleiben auch in der Nachprüfung 🔴 und zählen zu den offenen 🔴. Ob ein solcher Punkt erledigt ist, entscheidet das Skript, nicht der Nachprüfer.
