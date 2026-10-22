# Session-Kette über eigene Sessions

Status: bestätigt am 2026-10-22
Art: verankert
Basis: 80add4e

## Was, wie, wo, warum
dv-forge bekommt einen neuen Skill `session-orchestrator`, der eine Session-Kette führt. Die Kette reicht von der Idee bis zum gepushten Feature-Branch. Jede Etappe läuft in einer eigenen Etappen-Session mit festem Modell, und eine Leit-Session verbindet sie. Die Leit-Session stößt die Etappen an, prüft deren Ergebnisse gegen git, führt den Zustand der Kette und holt an festen Haltepunkten die Entscheidung des Menschen ein. · Aussage

Heute verketten die drei Orchestratoren (Spec-Review-Orchestrator, Plan-Orchestrator, Implementation-Orchestrator) ihre Skills eingebettet in einer einzigen Session. Den Weg von Stufe zu Stufe geht der Mensch selbst. Der Plan-Orchestrator committet nie, finish-work pusht nie, und Abschlussberichte und Bericht-Daten liegen nur in der Session, die sie erzeugt hat. · Git

Ein manuell orchestrierter Lauf mit acht Sessions hat gezeigt, was eine Kette über Sessions braucht:
- Notizen an die steuernde Session tragen nur den Anfang des Turn-Endes.
- Jedes Turn-Ende weckt die steuernde Session, auch bei Zwischenständen.
- Ein Turn, den die Nachricht einer Kind-Session auslöst, darf keine Session starten.
- Fragen gehen in Kind-Sessions unter.
- Eine Erfolgsmeldung ist kein Beweis: Ein Spec-Review hatte nicht committet.
- Gelbe Hinweise einzuarbeiten kann ein rotes Finding aufdecken.
- Gelbe Hinweise wandern über die Stufen weiter.
- Hängende Hintergrundprozesse blockierten den Abbau des Worktrees.

· Anhang

Die Kette beginnt an einem beliebigen Einstieg. Gewählt wird er per Codewort beim Aufruf, ohne Codewort ist er das Whiteboarding. So kann der Mensch mit vorhandener Spec oder vorhandenem Plan mitten in die Kette springen. · Aussage

Die bestehenden Skills bleiben einzeln nutzbar und verhalten sich ohne Kette wie heute. Die Kette ergänzt sie nur dort, wo eine Fremdsteuerung es braucht. · Aussage

## Theoretisches Verhalten nach Umsetzung
Der Mensch ruft `/dv-forge:session-orchestrator` auf, ohne Codewort oder mit einem der Codewörter `grill`, `spec-review`, `planning`, `plan-review`, `implementation`, `finish` und den nötigen Pfaden. Die Session, in der er das tut, ist die Leit-Session. Sie klärt einmal Workitem und Basis-Branch und startet dann die Etappe des Einstiegs. · Aussage

Die volle Kette läuft so:
1. Whiteboarding (Sonnet)
2. Grill (Opus)
3. Spec-Review (Sonnet)
4. Spec-Haltepunkt: Der Mensch wählt Planning, Spec-Nacharbeit oder Stopp. Eine Spec-Nacharbeit (Opus) führt immer zu einem erneuten Spec-Review und wieder zu diesem Haltepunkt.
5. Planning (Opus)
6. GO-Haltepunkt: Die Leit-Session zeigt die absoluten Pfade von Spec und Plan, das Plan-Review-Ergebnis, die offenen 🟡 und den ausgefüllten Umsetzungs-Aufruf. Der Mensch wählt GO, Plan-Nacharbeit oder Stopp. Eine Plan-Nacharbeit (Opus) führt immer zu einem Plan-Review (Sonnet) und wieder zu diesem Haltepunkt.
7. Plan-Commit nach dem GO, dann Umsetzung (Opus).
8. Hat die Umsetzung einen Showstopper, klärt der Mensch ihn direkt in der Umsetzungs-Session.
9. Abschluss (Sonnet): finish-work und, nach einem Ja des Menschen, der Push.
10. Schlussbericht der Kette.

· Aussage

Jede Etappen-Session meldet sich nur über ihr Turn-Ende. Die erste Zeile ihres Recaps nennt Etappe, Status, Zahl der roten und gelben Punkte, Commit und Berichtsdatei. Die Leit-Session schweigt bei `in-progress`. Bei `needs-user` sagt sie dem Menschen in einer Zeile, welche Session was will, mit Link. Bei `final` prüft sie das Ergebnis gegen git, bevor sie die nächste Etappe startet. Fragen beantwortet der Mensch in der Etappen-Session, nie die Leit-Session. · Aussage

Stoppt der Mensch an einem Haltepunkt, bleibt der Zustand der Kette erhalten. Über den Einstieg der nächsten Etappe setzt er sie später fort, auch in einer neuen Leit-Session und aus einem anderen Checkout desselben Repositorys. · Aussage

## Soll-Vorgaben

### Aufruf und Einstieg
- Der Skill heißt `session-orchestrator`. Auslöser sind `/dv-forge:session-orchestrator` und Trigger-Wörter wie „Session-Kette starten“ in seiner Beschreibung. · Aussage
- Das Codewort ist das erste Argument. Jeder Einstieg hat genau ein Codewort und genau eine erste Etappe: · Aussage
  - ohne Codewort: Whiteboarding
  - `grill <spec>`: Grill
  - `spec-review <spec>`: Spec-Review
  - `planning <spec>`: Planning
  - `plan-review <spec> <plan>`: Plan-Review
  - `implementation <spec> <plan>`: GO-Haltepunkt
  - `finish <worktree>`: Abschluss
- Für die Spec-Nacharbeit und die Plan-Nacharbeit gibt es keinen Einstieg; sie entstehen nur an einem Haltepunkt. · Aussage
- Ohne Codewort fasst die Leit-Session den bisherigen Gesprächskontext zusammen (Anliegen, genannte Dateien, getroffene Entscheidungen). Diese Zusammenfassung ist die Eingabe der Whiteboarding-Etappe. Ist der Kontext leer, fragt die Leit-Session einmal nach dem Anliegen. · Aussage
- Ein unbekanntes Codewort startet keine Etappe; die Leit-Session nennt die gültigen Codewörter. · Aussage
- Beim Einstieg prüft die Leit-Session nur, ob die genannten Dateien bzw. der Worktree existieren. Den Review-Status früherer Etappen prüft sie nicht. · Aussage
- Workitem: aus dem Kopf der Spec, sonst aus dem Aufruf. Fehlt es in einem Projekt, das Workitem-Nummern nutzt, fragt die Leit-Session einmal. In einem Projekt ohne Workitem-Nummern gibt es keine Nummer und keine Frage. · Aussage
- Basis-Branch: Bei jedem Einstieg außer `finish` fragt die Leit-Session einmal danach und schlägt den aktuellen Branch vor. Hält der Zustand zum Slug schon einen Basis-Branch, übernimmt sie ihn, nennt ihn und fragt nicht. · Aussage
- Die Leit-Session läuft auf Opus. Läuft sie auf einem anderen Modell, startet sie keine Etappe und nennt den Grund. · Git

### Etappen
- Etappen, Modelle und Skills: · Aussage
  - Whiteboarding: Sonnet, `spec-whiteboarding-with-docs`
  - Grill: Opus, neuer Skill `spec-grilling`
  - Spec-Review: Sonnet, `spec-review-orchestrator`
  - Spec-Nacharbeit: Opus
  - Planning: Opus, `plan-orchestrator`
  - Plan-Review: Sonnet, `plan-review` und `review-followup`
  - Plan-Nacharbeit: Opus
  - Umsetzung: Opus, `implementation-orchestrator`
  - Abschluss: Sonnet, `finish-work`, danach Push
- Das Whiteboarding läuft vollständig, wie heute einzeln aufgerufen. · Aussage
- Der Grill prüft die geschriebene Spec nur auf Grenzfälle, Widersprüche und Lücken: · Aussage
  - Vorhandene W-Einträge gelten als beantwortet.
  - Die Fragen kommen im Rundenformat des Whiteboardings.
  - Jede Änderung legt er als Vorher/Nachher vor und schreibt sie erst nach Bestätigung des Menschen.
  - Neue Entscheidungen werden W-Einträge.
- Die Spec-Nacharbeit klärt mit dem Menschen die offenen ❓ und die 🔴 ohne Vorschlag und ändert die Spec. Danach folgt immer eine Spec-Review-Etappe. · Aussage
- Die Plan-Nacharbeit klärt mit dem Menschen die offenen ❓ und die 🔴 ohne Vorschlag und ändert den Plan. Danach folgt immer eine Plan-Review-Etappe. · Aussage
- Die Plan-Review-Etappe schreibt den Plan nicht neu. Sie lässt `plan-review` laufen und danach `review-followup`, solange ein Followup angeboten wird, höchstens zwei Runden. · Aussage
- Die Zahl der Schleifen aus Nacharbeit und Review ist nicht begrenzt; jede Schleife führt über den Haltepunkt. · Aussage
- Die Leit-Session startet die nächste Etappe selbst, wo die App das erlaubt. Sonst zeigt sie eine Vorschlagskarte und eine Zeile, dass ein Klick die Etappe startet. Das gilt für jeden Start einer Etappe durch die Leit-Session. Ein Turn, den das Turn-Ende einer Etappen-Session auslöst, erlaubt den Start oft nicht; dann ist die Vorschlagskarte der Weg. · Aussage

### Haltepunkte
- Der Spec-Haltepunkt kommt nach jeder Spec-Review-Etappe. Die Empfehlung folgt der Ergebnis-Zeile des Reviews: · Aussage
  - ✅: Planning
  - ⛔ oder ❓: Spec-Nacharbeit
  - ⚠️: Die Empfehlung ist Halt, also Stopp; die Leit-Session nennt den Grund. Die Auswahl aus Planning, Spec-Nacharbeit und Stopp bleibt bestehen.
  - 🟡 blockieren nie, die Leit-Session listet sie aber.
- Der GO-Haltepunkt kommt nach jeder Planning- und Plan-Review-Etappe und beim Einstieg `implementation`. · Aussage
  - Er zeigt die absoluten Pfade von Spec und Plan, die Ergebnis-Zeile des letzten Plan-Reviews (sofern eines vorliegt), die offenen 🟡 und den ausgefüllten Aufruf `/dv-forge:implementation-orchestrator <P> <S> <WI> --base <B>`.
  - Die Empfehlung folgt der Logik des Spec-Haltepunkts: ✅ GO, ⛔ oder ❓ Plan-Nacharbeit, ⚠️ Halt, also Stopp, mit Grund. Die Auswahl aus GO, Plan-Nacharbeit und Stopp bleibt bestehen.
  - Die Umsetzung startet nur nach einem ausdrücklichen GO.
- Ein Showstopper der Umsetzung hält die Kette. Der Mensch klärt ihn in der Umsetzungs-Session. Showstopper ist jeder der folgenden Fälle: · Aussage
  - Die Ergebnis-Zeile ist nicht ✅.
  - Das Prüfergebnis ist nicht grün, „keine“ eingeschlossen.
  - Ein Build-, Test- oder Lint-Befehl ist nicht lauffähig (Umgebungslücke).
  - Ein Akzeptanzkriterium hat keinen beweisenden Test, egal in welcher Farbe das Review ihn meldet.
- Fehlende Tests an Integrationspunkten sind kein Showstopper; sie stehen als 🟡 in der Liste offener Punkte. · Aussage
- Vor dem Push hält die Abschluss-Session und wartet auf ein Ja des Menschen. · Aussage
- `needs-user` ist ein Haltepunkt: Die Leit-Session nennt Etappe, Anliegen und Link der Session in einer Zeile. · Aussage
- An jedem Haltepunkt mit Auswahl ist „Stopp“ möglich. Danach schreibt die Leit-Session den Zustand fest und zeigt den Schlussbericht mit dem Codewort für den späteren Einstieg. Sie startet nichts mehr und räumt nichts auf; Worktree und Branch bleiben. · Aussage

### Report-Protokoll und Nachweis
- Die erste Zeile des Recaps am Ende jedes Turns einer Etappen-Session lautet `[<etappe>] STATUS=in-progress|needs-user|final · ROT=<n> · GELB=<n> · COMMIT=<hash|none> · BERICHT=<pfad>`. · Aussage
- Etappen-Sessions melden sich nie per Nachricht an die Leit-Session und starten keine Session. · Anhang
- Die Berichtsdatei einer Etappe enthält: · Aussage
  - den vollen Bericht
  - die Entscheidungen, die der Mensch in der Etappe getroffen hat
  - die Dateien in Glossar und ADRs, die die Etappe geändert hat
  - Testzahlen
- Die Leit-Session reagiert nur auf `needs-user` und `final`. Ein Turn-Ende ohne Statuszeile gilt als `in-progress`. Nach drei Turn-Enden derselben Etappe in Folge ohne Statuszeile nennt sie das dem Menschen in einer Zeile, mit Link. · Aussage
- Jedes `final` prüft die Leit-Session gegen git, bevor die nächste Etappe startet: · Aussage
  - Der gemeldete Commit existiert.
  - Er enthält nur die erwarteten Dateien.
  - Die Artefakte der Etappe sind committet, sofern die Etappe committen soll.
  - Bei der Umsetzung: Branch, Commits seit dem Basis-Branch, Worktree.
  - Beim Abschluss: Upstream, kein Vorsprung gegenüber dem Upstream, Worktree entfernt.
  - Eine Abweichung hält die Kette und wird genannt.
- Was die Leit-Session selbst geprüft hat und was nur gemeldet wurde, steht in ihren Berichten getrennt. · Anhang
- Entscheidungen des Menschen aus früheren Etappen stehen im Brief jeder späteren Etappe. · Anhang

### Briefe
- Der Brief einer Etappen-Session beginnt mit dem Slash-Befehl ihres Skills. Danach folgen die Ketten-Regeln. · Aussage
  - Vor dem Plan wird belegt, ob die App einen Slash-Befehl am Anfang des Briefs als Befehl ausführt.
  - Tut sie es nicht, ruft die Etappe den Skill über das Skill-Werkzeug auf, und der Schutz der Review-Dateien durch den dv-forge-Hook fehlt dann.
- Jeder Brief enthält feste Bausteine: · Aussage
  - Workitem, Slug, Basis-Branch, Pfade von Spec und Plan. Pfade von Spec und Plan, Workitem und Basis-Branch stehen nur im Brief, wenn der Zustand oder der Aufruf sie liefert; beim Einstieg zum Abschluss ohne Zustand fehlen sie und der Brief nennt nur den Worktree.
  - Commit-Regeln: nur eigene Dateien, auf Pfade beschränkt, nie alle Änderungen stagen, fremde Dateien nicht anfassen, Commit-Konvention des Projekts, Push nur in der Abschluss-Etappe
  - das Report-Protokoll
  - „Starte nichts weiter, sende keine Nachricht an die Leit-Session“
  - Fragen ans Ende der Antwort
  - Die Statuszeile ersetzt die Übergabe-Hinweise des Skills (frische Session, kein automatischer Start); die Etappen-Session gibt diese Hinweise nicht aus.
  - Aufräumpflicht: Vor ihrem letzten Turn-Ende beendet die Etappen-Session alle Hintergrundprozesse, die sie oder ihre Agents gestartet haben.

### Git und Commits
- Die Spec committet wie heute der Spec-Review-Orchestrator. Die Spec-Nacharbeit committet nur die Spec-Datei. · Aussage
- Was Whiteboarding und Grill in Glossar und ADRs schreiben, committet die Leit-Session, sobald der Spec-Haltepunkt erreicht ist: nur die in den Berichten genannten Dateien, auf Pfade beschränkt, nach der Commit-Konvention des Projekts. · Aussage
- Die Commit-Frage von `plan-review` und `review-followup` in der Plan-Review-Etappe bleibt; der Mensch beantwortet sie dort. · Aussage
- Nach dem GO committet die Leit-Session, was vom Plan und von der Spec noch uncommittet ist, auf Pfade beschränkt. Ist beides committet, entsteht kein Commit. · Aussage
- Vor dem Start der Umsetzung prüft die Leit-Session, dass der aktuelle Branch des Checkouts der Basis-Branch ist; sonst hält sie mit beiden Namen. · Anhang
- Spec, Plan, Glossar und ADRs entstehen im aktuellen Checkout ohne Worktree. Die Umsetzung läuft am Ort, den `start-work` wählt. · Git
- Den Push macht die Abschluss-Session nach erfolgreichem finish-work und dem Ja des Menschen. · Aussage
- Freigaben gelten je Session: Eine Aktion, die eine Etappen-Session nicht ausführen durfte, führt die Leit-Session nie stellvertretend aus. Der Mensch gibt in der Etappen-Session frei. · Anhang
- Die Leit-Session ändert nie Spec, Plan oder Code. Sie committet nur nach den Regeln dieses Abschnitts. · Aussage

### Zustand und Schlussbericht
- Der Zustand einer Kette liegt dauerhaft je Slug, gemeinsam für den Haupt-Checkout und alle Worktrees eines Repositorys. Er enthält: · Aussage
  - aktuelle Etappe
  - Session-Kennungen
  - Commits
  - offene 🟡 und 🟢 mit Herkunfts-Etappe
  - Entscheidungen des Menschen
  - Workitem
  - Basis-Branch
- Ein Einstieg zu einem Slug mit vorhandenem Zustand übernimmt ihn und nennt ihn vor dem Start der Etappe. · Aussage
- Die Leit-Session führt offene 🟡 und 🟢 über alle Etappen; nichts wird verworfen. · Aussage
- Der Schlussbericht der Kette nennt die Etappen mit Ergebnis, die Commits, die offenen 🟡 und 🟢 mit Herkunft, getrennt nach geprüft und gemeldet. Mit Workitem nennt er zusätzlich den optionalen Aufruf von `finishing-workitem` mit der Nummer. · Aussage
- Der ADO-Abschluss gehört nicht zur Kette. · Aussage

### Bestehende Skills
- Alle bestehenden dv-forge-Skills bleiben einzeln nutzbar. Ohne Kette sind ihr Verhalten, ihre Berichte und ihre Commits gleich wie heute. · Aussage
- Die drei Orchestratoren und die einzeln laufenden Reviews (`plan-review`, `review-followup`) bekommen eine zusätzliche Option. Mit ihr legen sie Abschlussbericht und Bericht-Daten an einen festen Ort je Slug, gemeinsam für den Haupt-Checkout und alle Worktrees. Ohne die Option bleibt alles wie heute. · Aussage

## Akzeptanzkriterien
- **AC-01** Gegeben eine Session mit Gesprächskontext zu einem Anliegen, wenn der Mensch `/dv-forge:session-orchestrator` ohne Codewort aufruft, dann startet eine Whiteboarding-Etappe auf Sonnet, deren Brief eine Zusammenfassung von Anliegen, genannten Dateien und getroffenen Entscheidungen enthält. · Aussage
- **AC-02** Gegeben eine Session ohne Gesprächskontext, wenn der Mensch `/dv-forge:session-orchestrator` ohne Codewort aufruft, dann fragt die Leit-Session einmal nach dem Anliegen und startet bis zur Antwort keine Etappe. · Aussage
- **AC-03** Gegeben eine vorhandene Spec S, wenn der Mensch `/dv-forge:session-orchestrator grill S` aufruft, dann startet als erste Etappe der Grill auf Opus mit S. · Aussage
- **AC-04** Gegeben eine vorhandene Spec S, wenn der Mensch `/dv-forge:session-orchestrator spec-review S` aufruft, dann startet als erste Etappe der Spec-Review auf Sonnet mit S; Whiteboarding und Grill laufen nicht. · Aussage
- **AC-05** Gegeben eine vorhandene Spec S, wenn der Mensch `/dv-forge:session-orchestrator planning S` aufruft, dann startet als erste Etappe Planning auf Opus mit S. · Aussage
- **AC-06** Gegeben eine vorhandene Spec S und ein Plan P, wenn der Mensch `/dv-forge:session-orchestrator plan-review S P` aufruft, dann startet als erste Etappe der Plan-Review auf Sonnet mit P und S. · Aussage
- **AC-07** Gegeben eine vorhandene Spec S und ein Plan P, wenn der Mensch `/dv-forge:session-orchestrator implementation S P` aufruft, dann startet keine Etappe, sondern die Leit-Session zeigt den GO-Haltepunkt. · Aussage
- **AC-08** Gegeben ein vorhandener Worktree R, wenn der Mensch `/dv-forge:session-orchestrator finish R` aufruft, dann startet als erste Etappe der Abschluss auf Sonnet für R, ohne Frage nach dem Basis-Branch. · Aussage
- **AC-09** Gegeben ein Codewort mit einem Pfad, der nicht existiert, wenn der Mensch den Skill aufruft, dann startet keine Etappe und die Leit-Session nennt den fehlenden Pfad. · Aussage
- **AC-10** Gegeben ein unbekanntes Codewort, wenn der Mensch den Skill aufruft, dann startet keine Etappe und die Leit-Session nennt die sechs gültigen Codewörter. · Aussage
- **AC-11** Gegeben eine Spec mit `Workitem: 311021` im Kopf, wenn der Mensch `spec-review` ohne Nummer aufruft, dann nennt jeder Brief der Kette das Workitem 311021. · Aussage
- **AC-12** Gegeben ein Projekt, das Workitem-Nummern nutzt, und eine Spec ohne Nummer, wenn der Mensch einen Einstieg ohne Nummer aufruft, dann fragt die Leit-Session einmal nach der Nummer, bevor eine Etappe startet. · Aussage
- **AC-13** Gegeben ein Projekt ohne Workitem-Nummern, wenn der Mensch einen Einstieg aufruft, dann fragt die Leit-Session nicht nach einer Nummer und kein Brief nennt eine. · Aussage
- **AC-14** Gegeben ein Einstieg außer `finish` zu einem Slug ohne Zustand, wenn der Mensch den Skill aufruft, dann fragt die Leit-Session einmal nach dem Basis-Branch, schlägt den aktuellen Branch vor und startet bis zur Antwort keine Etappe. · Aussage
- **AC-15** Gegeben ein Zustand zum Slug mit Basis-Branch `dev` und zwei offenen 🟡, wenn der Mensch einen Einstieg zu diesem Slug aufruft, dann nennt die Leit-Session `dev` und beide 🟡, bevor die Etappe startet, und fragt nicht nach dem Basis-Branch. · Aussage
- **AC-16** Gegeben die Leit-Session läuft auf Sonnet, wenn der Mensch den Skill aufruft, dann startet keine Etappe und die Leit-Session nennt, dass sie auf Opus laufen muss. · Git
- **AC-17** Gegeben die Whiteboarding-Etappe meldet `final` mit einer geschriebenen Spec, wenn die Leit-Session die Meldung verarbeitet, dann startet die Leit-Session die Grill-Etappe auf Opus mit dem Spec-Pfad, wo die App den Start im aktuellen Turn erlaubt; sonst zeigt sie dafür die Vorschlagskarte nach AC-54. · Aussage
- **AC-18** Gegeben eine Spec mit dem W-Eintrag „Export-Format: CSV“, wenn die Grill-Etappe ihre Fragen stellt, dann fragt sie nicht erneut nach dem Export-Format. · Aussage
- **AC-19** Gegeben die Grill-Etappe will eine Stelle der Spec ändern, wenn sie die Änderung vorschlägt, dann zeigt sie Vorher und Nachher und die Spec-Datei bleibt bis zur Bestätigung des Menschen unverändert. · Aussage
- **AC-20** Gegeben der Mensch entscheidet im Grill eine neue Frage, wenn die Grill-Etappe die Spec schreibt, dann steht die Entscheidung als W-Eintrag unter `## Entscheidungen`. · Aussage
- **AC-21** Gegeben die Grill-Etappe meldet `final`, wenn die Leit-Session die Meldung verarbeitet, dann startet die Leit-Session die Spec-Review-Etappe auf Sonnet mit `spec-review-orchestrator`, wo die App den Start im aktuellen Turn erlaubt; sonst zeigt sie dafür die Vorschlagskarte nach AC-54. · Aussage
- **AC-22** Gegeben eine Spec-Review-Etappe mit „✅ Bereit zum Planen · 3 kleine Hinweise offen“, wenn der Spec-Haltepunkt erscheint, dann empfiehlt die Leit-Session Planning, listet die drei 🟡 und startet bis zur Antwort nichts. · Aussage
- **AC-23** Gegeben eine Spec-Review-Etappe mit ⛔ oder ❓, wenn der Spec-Haltepunkt erscheint, dann empfiehlt die Leit-Session die Spec-Nacharbeit. · Aussage
- **AC-24** Gegeben eine Spec-Review-Etappe mit „⚠️ Unvollständig“, wenn die Leit-Session die Meldung verarbeitet, dann startet sie keine Etappe, nennt den Grund und zeigt den Spec-Haltepunkt mit der Empfehlung Stopp und der Auswahl aus Planning, Spec-Nacharbeit und Stopp. · Aussage
- **AC-25** Gegeben der Mensch wählt am Spec-Haltepunkt die Nacharbeit, wenn die Spec-Nacharbeit auf Opus `final` meldet, dann startet eine neue Spec-Review-Etappe, wo die App den Start im aktuellen Turn erlaubt, sonst zeigt die Leit-Session dafür die Vorschlagskarte nach AC-54; nach diesem Review erscheint wieder der Spec-Haltepunkt. · Aussage
- **AC-26** Gegeben Whiteboarding und Grill nennen in ihren Berichten `CONTEXT.md` als geändert und im Checkout liegt eine fremde geänderte Datei, wenn der Spec-Haltepunkt erreicht ist, dann entsteht ein Commit, der genau `CONTEXT.md` enthält, und die fremde Datei bleibt uncommittet. · Aussage
- **AC-27** Gegeben der Mensch wählt am Spec-Haltepunkt Planning, wenn die Leit-Session weitermacht, dann startet die Planning-Etappe auf Opus mit `plan-orchestrator`, wo die App den Start im aktuellen Turn erlaubt, sonst zeigt die Leit-Session dafür die Vorschlagskarte nach AC-54; nach dem `final` der Planning-Etappe erscheint der GO-Haltepunkt. · Aussage
- **AC-28** Gegeben der GO-Haltepunkt erscheint, wenn die Leit-Session ihn zeigt, dann enthält er die absoluten Pfade von Spec und Plan, die Ergebnis-Zeile des letzten Plan-Reviews, die offenen 🟡 und den Aufruf `/dv-forge:implementation-orchestrator <P> <S> <WI> --base <B>` mit eingesetzten Werten, und die Leit-Session startet bis zur Antwort nichts. · Aussage
- **AC-29** Gegeben der Einstieg `implementation` ohne vorliegendes Plan-Review-Ergebnis, wenn der GO-Haltepunkt erscheint, dann fehlt die Ergebnis-Zeile und alle übrigen Angaben aus AC-28 stehen da. · Aussage
- **AC-30** Gegeben der GO-Haltepunkt nach einem Plan-Review mit ⛔, wenn er erscheint, dann empfiehlt die Leit-Session die Plan-Nacharbeit. · Aussage
- **AC-31** Gegeben der Mensch wählt am GO-Haltepunkt die Plan-Nacharbeit, wenn sie auf Opus `final` meldet, dann startet eine Plan-Review-Etappe auf Sonnet, wo die App den Start im aktuellen Turn erlaubt, sonst zeigt die Leit-Session dafür die Vorschlagskarte nach AC-54; nach diesem Plan-Review erscheint wieder der GO-Haltepunkt. · Aussage
- **AC-32** Gegeben eine Plan-Review-Etappe, deren `plan-review` und erste `review-followup`-Runde je einen Followup anbieten, wenn sie läuft, dann laufen genau zwei Followup-Runden und der Plan wird nicht neu geschrieben. · Aussage
- **AC-33** Gegeben der Mensch sagt am GO-Haltepunkt GO, die Spec ist committet und der Plan uncommittet, wenn die Leit-Session weitermacht, dann entsteht vor dem Start der Umsetzung ein Commit, der nur den Plan enthält. · Aussage
- **AC-34** Gegeben der Mensch hat die Commit-Frage in der Plan-Review-Etappe bejaht, wenn er am GO-Haltepunkt GO sagt, dann entsteht kein weiterer Commit. · Aussage
- **AC-35** Gegeben der aktuelle Branch des Checkouts ist `feature/x` und der Basis-Branch ist `dev`, wenn der Mensch GO sagt, dann startet keine Umsetzung und die Leit-Session nennt beide Branches. · Anhang
- **AC-36** Gegeben GO und ein passender Branch, wenn die Leit-Session weitermacht, dann startet die Umsetzungs-Etappe auf Opus mit genau dem am GO-Haltepunkt gezeigten Aufruf. · Aussage
- **AC-37** Gegeben die Umsetzung meldet `final` mit „✅ Bereit zum Abschließen“ und grüner Prüfung und jedes Akzeptanzkriterium hat einen beweisenden Test, wenn die Leit-Session die Meldung verarbeitet, dann startet die Abschluss-Etappe auf Sonnet ohne Haltepunkt, wo die App den Start im aktuellen Turn erlaubt; sonst zeigt die Leit-Session dafür die Vorschlagskarte nach AC-54. · Aussage
- **AC-38** Gegeben die Umsetzung meldet ein Prüfergebnis „rot“ oder „keine“, wenn die Leit-Session die Meldung verarbeitet, dann startet kein Abschluss und sie nennt den Showstopper mit Link zur Umsetzungs-Session. · Aussage
- **AC-39** Gegeben der Lint-Befehl der Umsetzung ist nicht lauffähig, weil ein Werkzeug fehlt, wenn die Leit-Session die Meldung verarbeitet, dann nennt sie eine Umgebungslücke mit dem Befehl und startet keinen Abschluss. · Aussage
- **AC-40** Gegeben die Umsetzung endet mit ✅, aber AC-05 der Spec hat keinen beweisenden Test, wenn die Leit-Session die Meldung verarbeitet, dann nennt sie den Showstopper mit „AC-05“ und startet keinen Abschluss. · Aussage
- **AC-41** Gegeben die Umsetzung meldet einen Integrationspunkt ohne Test als 🟡, wenn die Leit-Session die Meldung verarbeitet, dann gilt das nicht als Showstopper und der Punkt steht in der Liste offener 🟡. · Aussage
- **AC-42** Gegeben die Umsetzungs-Session meldet `final`, wenn die Leit-Session die Meldung verarbeitet, dann läuft kein Hintergrundprozess mehr, den die Umsetzungs-Session oder ihre Agents gestartet haben. · Anhang
- **AC-43** Gegeben finish-work endet in der Abschluss-Session erfolgreich, wenn die Abschluss-Session weitermacht, dann fragt sie vor dem Push und pusht ohne Ja des Menschen nicht. · Aussage
- **AC-44** Gegeben der Mensch sagt Ja zum Push, wenn die Abschluss-Session `final` meldet, dann prüft die Leit-Session, dass der Branch einen Upstream hat, keinen Vorsprung davor und dass der Worktree entfernt ist. · Aussage
- **AC-45** Gegeben die Abschluss-Session wird an einer Freigabe gestoppt und meldet `needs-user`, wenn die Leit-Session die Meldung verarbeitet, dann führt sie die blockierte Aktion nicht selbst aus und nennt in einer Zeile Etappe, Anliegen und Link. · Anhang
- **AC-46** Gegeben eine Etappen-Session beendet einen Turn, wenn das Turn-Ende der Etappen-Session bei der Leit-Session ankommt, dann hat die erste Zeile des Recaps die Form `[<etappe>] STATUS=… · ROT=… · GELB=… · COMMIT=… · BERICHT=…`. · Aussage
- **AC-47** Gegeben ein Turn-Ende der Etappen-Session mit `STATUS=in-progress`, wenn die Leit-Session es verarbeitet, dann gibt sie nichts aus und startet nichts. · Aussage
- **AC-48** Gegeben zwei Turn-Enden der Etappen-Session derselben Etappe in Folge ohne Statuszeile, wenn die Leit-Session sie verarbeitet, dann gibt sie nichts aus; nach dem dritten in Folge nennt sie in einer Zeile, dass die Etappe ohne Status endet, mit Link. · Aussage
- **AC-49** Gegeben eine Spec-Review-Etappe meldet `final` mit `COMMIT=none` und die Spec ist uncommittet, wenn die Leit-Session prüft, dann startet keine nächste Etappe und sie nennt die uncommittete Spec. · Anhang
- **AC-50** Gegeben eine Etappe meldet einen Commit, der eine Datei außerhalb ihrer erwarteten Dateien enthält, wenn die Leit-Session prüft, dann startet keine nächste Etappe und sie nennt die Datei. · Aussage
- **AC-51** Gegeben die Leit-Session hat einen Commit selbst gesehen und die Testzahlen nur aus dem Bericht übernommen, wenn sie berichtet, dann steht der Commit unter „geprüft“ und die Testzahlen unter „gemeldet“. · Anhang
- **AC-52** Gegeben der Mensch entscheidet in der Spec-Nacharbeit „500 statt 404, keine Backend-Änderung“, wenn die Planning-Etappe startet, dann enthält ihr Brief diese Entscheidung. · Anhang
- **AC-53** Gegeben eine laufende Kette, wenn eine Etappen-Session ihr Ergebnis meldet, dann hat sie keine Nachricht an die Leit-Session gesendet und keine Session gestartet. · Anhang
- **AC-54** Gegeben die App erlaubt im aktuellen Turn keinen Session-Start, wenn die Leit-Session die nächste Etappe anstoßen will, dann zeigt sie eine Vorschlagskarte und eine Zeile, dass ein Klick die Etappe startet. · Aussage
- **AC-55** Gegeben eine Etappe startet, wenn ihr Brief entsteht, dann beginnt er mit dem Slash-Befehl ihres Skills und enthält den Slug, dazu Workitem, Basis-Branch und die Pfade von Spec und Plan, soweit der Zustand oder der Aufruf sie liefert (beim Einstieg `finish` ohne Zustand fehlen sie und der Brief nennt nur den Worktree), außerdem Commit-Regeln, Report-Protokoll, das Start- und Nachrichtenverbot, die Regel „Fragen ans Ende“, die Aufräumpflicht und die Vorgabe, dass die Statuszeile die Übergabe-Hinweise des Skills ersetzt. · Aussage
- **AC-56** Gegeben ein Orchestrator oder Einzel-Review läuft ohne die neue Ablage-Option, wenn er endet, dann sind Ausgabe, Dateien und Commits gleich denen vor dieser Änderung. · Aussage
- **AC-57** Gegeben ein Orchestrator läuft mit der Ablage-Option in einem Worktree, wenn er endet, dann sind sein Abschlussbericht und seine Bericht-Daten aus dem Haupt-Checkout desselben Repositorys lesbar. · Aussage
- **AC-58** Gegeben eine Kette wurde am GO-Haltepunkt im Haupt-Checkout gestoppt, wenn der Mensch in einer neuen Session `implementation S P` aufruft, dann übernimmt die neue Leit-Session Basis-Branch, Entscheidungen und offene 🟡 des Slugs. · Aussage
- **AC-59** Gegeben der Mensch sagt an einem Haltepunkt „Stopp“, wenn die Leit-Session weitermacht, dann zeigt sie den Schlussbericht mit dem Codewort für den späteren Einstieg, startet keine Etappe, und Worktree und Branch bleiben bestehen. · Aussage
- **AC-60** Gegeben ein 🟡 aus der Spec-Review-Etappe und ein 🟢 aus der Plan-Review-Etappe, wenn die Kette nach dem Push endet, dann listet der Schlussbericht beide mit ihrer Herkunfts-Etappe. · Aussage
- **AC-61** Gegeben eine Kette mit Workitem 311021 endet, wenn der Schlussbericht erscheint, dann nennt er den optionalen Aufruf von `finishing-workitem` mit 311021; ohne Workitem nennt er ihn nicht. · Aussage
- **AC-62** Gegeben eine vollständige Kette, wenn sie endet, dann enthält kein Commit der Leit-Session Code; ihre Commits enthalten nur Plan, Spec, Glossar- und ADR-Dateien. · Aussage
- **AC-63** Gegeben eine Etappe meldet `final` mit einer Berichtsdatei, wenn die Leit-Session die Datei liest, dann enthält sie den vollen Bericht, die Entscheidungen, die der Mensch in der Etappe getroffen hat, die Glossar- und ADR-Dateien, die die Etappe geändert hat, und die Testzahlen. · Aussage
- **AC-64** Gegeben eine Etappen-Session beendet ihren letzten Turn, wenn das Turn-Ende der Etappen-Session bei der Leit-Session ankommt, dann trägt der Recap die Statuszeile und enthält keinen Übergabe-Hinweis des Skills (frische Session, kein automatischer Start). · Aussage

## Entscheidungen
- **W · Weg** · Aussage — Der Entwurf entsteht als dv-forge-Spec im Plugin-Repository.
- **W · Begriffe** · Aussage — Session-Kette, Etappe, Etappen-Session, Leit-Session, Einstieg und Haltepunkt sind kanonisch und stehen im Glossar; „Stufe“ bleibt dem Ketten-Eintrag vorbehalten.
- **W · Skill-Name** · Aussage — `session-orchestrator`.
- **W · Codewörter** · Aussage — Ohne Codewort Whiteboarding; dazu `grill`, `spec-review`, `planning`, `plan-review`, `implementation`, `finish`; keine Einstiege in die Nacharbeit.
- **W · Eingabe ohne Codewort** · Aussage — Die Zusammenfassung des Gesprächskontexts ist die Eingabe des Whiteboardings; ist der Kontext leer, fragt die Leit-Session einmal.
- **W · Workitem und Basis-Branch** · Aussage — Das Workitem kommt aus dem Spec-Kopf, sonst aus dem Aufruf, sonst aus einer Frage bei Pflicht. Nach dem Basis-Branch fragt die Leit-Session einmal, mit dem aktuellen Branch als Vorschlag, beim Einstieg `finish` nicht.
- **W · Schnitt Whiteboarding/Grill** · Aussage — Das Whiteboarding auf Sonnet läuft vollständig. Der Grill auf Opus prüft danach nur Grenzfälle, Widersprüche und Lücken; W-Einträge gelten als beantwortet.
- **W · Grill-Werkzeug** · Aussage — Neuer dv-forge-Skill `spec-grilling` im Rundenformat. Er ändert die Spec direkt, jede Änderung als Vorher/Nachher nach Bestätigung.
- **W · Spec-Haltepunkt** · Aussage — Er kommt immer. Die Empfehlung folgt der Ergebnis-Zeile: ✅ Planning, ⛔ oder ❓ Nacharbeit, ⚠️ Halt. 🟡 blockieren nie.
- **W · Spec-Nacharbeit** · Aussage — Auf Opus mit dem Menschen. Danach folgt immer ein erneuter Spec-Review auf Sonnet. Die Zahl der Schleifen ist nicht begrenzt.
- **W · Spec-Commit** · Aussage — Wie heute durch den Spec-Review-Orchestrator. Die Nacharbeit committet nur die Spec.
- **W · Plan-Commit** · Aussage — Durch die Leit-Session nach dem GO, nur was noch uncommittet ist; die Commit-Frage in der Plan-Review-Etappe bleibt.
- **W · GO-Haltepunkt** · Aussage — Ein gemeinsamer Halt nach dem Planning bzw. Plan-Review und beim Einstieg `implementation`. Er zeigt absolute Pfade, Review-Ergebnis, offene 🟡 und den ausgefüllten Aufruf und wartet auf GO.
- **W · Plan-Review-Etappe** · Aussage — `plan-review` und bis zu zwei `review-followup`-Runden, ohne den Plan neu zu schreiben.
- **W · Plan-Nacharbeit** · Aussage — Symmetrisch zur Spec-Nacharbeit, danach immer die Plan-Review-Etappe.
- **W · Showstopper** · Aussage — Die Ergebnis-Zeile ist nicht ✅, die Prüfung ist nicht grün, ein Prüfbefehl ist nicht lauffähig, oder ein AK hat keinen beweisenden Test. Integrationspunkte ohne Test sind 🟡.
- **W · Abschluss** · Aussage — Eigene Sonnet-Session. Die Umsetzung beendet vorher ihre Hintergrundprozesse, und Freigaben gibt der Mensch in der Abschluss-Session.
- **W · Push** · Aussage — Die Abschluss-Session pusht nach erfolgreichem finish-work und einem Ja des Menschen.
- **W · Offene Punkte** · Aussage — Die Leit-Session führt eine Liste offener 🟡 und 🟢 über alle Etappen; sie steht im Schlussbericht.
- **W · ADO** · Aussage — Nicht Teil der Kette; mit Workitem nennt der Schlussbericht den optionalen Aufruf von `finishing-workitem`.
- **W · Fortsetzen** · Aussage — Über den Einstieg der nächsten Etappe; ein vorhandener Zustand zum Slug wird übernommen und genannt.
- **W · Prüfung beim Einstieg** · Aussage — Nur, ob Dateien bzw. Worktree existieren; der Review-Status wird nicht geprüft.
- **W · Übergänge** · Aussage — Die Leit-Session startet automatisch, wo die App es erlaubt, sonst über eine Vorschlagskarte. Etappen-Sessions melden sich nie per Nachricht.
- **W · Report-Protokoll** · Aussage — Statuszeile als erste Recap-Zeile, der volle Bericht in einer Datei. Die Leit-Session prüft jedes `final` gegen git und trennt Geprüftes von Gemeldetem.
- **W · Turn-Ende ohne Statuszeile** · Aussage — Gilt als `in-progress`; nach drei solchen Turn-Enden in Folge folgt ein Hinweis mit Link.
- **W · Leit-Session** · Aussage — Läuft auf Opus. Sie ändert nie Spec, Plan oder Code. Sie prüft, committet nach den Commit-Regeln und fragt den Menschen.
- **W · Bestehende Skills** · Aussage — Sie bleiben einzeln nutzbar und unverändert im Verhalten. Die Ergänzungen sind nur additiv über eine Option.
- **W · Berichtsablage** · Aussage — Die Orchestratoren und Einzel-Reviews legen Bericht und Bericht-Daten auf Wunsch an einen festen Ort je Slug, gemeinsam für alle Checkouts.
- **W · Brief** · Aussage — Der Brief beginnt mit dem Slash-Befehl. Ob die App ihn ausführt, wird vor dem Plan belegt; sonst ruft die Etappe den Skill über das Skill-Werkzeug auf, ohne Hook-Schutz.
- **W · Glossar- und ADR-Commit** · Aussage — Die Leit-Session committet am Spec-Haltepunkt die gemeldeten Dateien, auf Pfade beschränkt.
- **W · Stopp** · Aussage — Zustand festschreiben, Schlussbericht mit Codewort für den Einstieg, nichts starten, nichts aufräumen.
- **W · Unbekanntes Codewort** · Aussage — Keine Etappe; die Leit-Session nennt die gültigen Codewörter.
- **W · Uncommittete Spec bei GO** · Aussage — Nach dem GO committet die Leit-Session eine noch uncommittete Spec zusammen mit dem Plan, auf Pfade beschränkt.
- **R1 · AC-17** — geändert — Klarstellung nach Scout-Vorschlag 1: W · Übergänge legt fest, dass die Leit-Session automatisch startet, wo die App es erlaubt, sonst über die Vorschlagskarte. AC-17, AC-21, AC-25, AC-27, AC-31 und AC-37 tragen jetzt diese Bedingung mit beiden Ausgängen; die Soll-Vorgabe zum Selbststart gilt ausdrücklich für jeden Start und nennt, dass ein von einer Etappen-Notiz ausgelöster Turn den Start oft nicht erlaubt.
- **R1 · Aufruf und Einstieg** — nicht geändert — W-Eintrag ist bindend
- **R1 · Soll-Vorgaben** — geändert — Klarstellung nach Scout-Vorschlag 1: Der Brief-Baustein sagt jetzt eindeutig, dass die Statuszeile die Übergabe-Hinweise des Skills ersetzt; AC-55 nennt das, AC-64 prüft den Recap. Der ⚠️-Fall beider Haltepunkte folgt W · Spec-Haltepunkt („Er kommt immer“, Empfehlung Halt): Empfehlung Stopp mit Grund, die Auswahl bleibt; AC-24 entsprechend geschärft. AC-63 macht den schon festgelegten Inhalt der Berichtsdatei prüfbar.
- **F · AC-46** — geändert — Vorschlag 2: Der Begriff „Notiz“ entfällt in den Kriterien; AC-46, AC-47, AC-48 und AC-64 sprechen jetzt vom Turn-Ende der Etappen-Session, wie die Soll-Vorgabe „Jede Etappen-Session meldet sich nur über ihr Turn-Ende“. Die Soll-Vorgabe zum Selbststart spricht ebenfalls vom Turn-Ende statt von der Notiz. „Meldung“ und „Nachricht“ werden für das Turn-Ende nicht verwendet.
- **F · AC-55** — geändert — Vorschlag 1: Der Brief-Baustein legt fest, dass Pfade von Spec und Plan, Workitem und Basis-Branch nur im Brief stehen, wenn Zustand oder Aufruf sie liefern; beim Einstieg zum Abschluss ohne Zustand fehlen sie und der Brief nennt nur den Worktree. AC-55 ist entsprechend eingeschränkt.
- **F · Entscheidungen** — nicht geändert — Vorschlag 2: W-Eintrag ist bindend. Die Schreibweise „AK“ steht in der bindenden Entscheidung „Showstopper“; sie wird weder geändert noch zur Änderung gestellt.
