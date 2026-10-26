# dv-forge: Zwischenebene von Spec-Review und Plan-Review vereinheitlichen

Status: bestätigt am 2026-10-26
Art: frei
Basis: ce4ee4f (beim Plan auf den Stand nach Teil C setzen)

## Was, wie, wo, warum
- Die Spec-Review-Etappe läuft heute über den eigenen Orchestrator-Skill `spec-review-orchestrator`. Die Plan-Review-Etappe hat keinen; ihre Rundenschleife („höchstens zwei Runden“) steht als Prosa im Brief der Etappe. · Anhang
- Beide Review-Etappen sollen sich gleich verhalten. Die Schleife (Review, höchstens zweimal Followup, Ende) liegt in einem Skript; der Spec-Review-Orchestrator entfällt, Plan-Review wird symmetrisch. · Aussage
- Ein Skript kann keine Skills starten. Das Skript ist deshalb ein Zustandsautomat: Die Etappen-Session ruft den Review-Skill auf und fragt danach das Skript, was folgt. · Aussage
- Die Schleife gilt für die Spec-Review-Etappe, die Plan-Review-Etappe und die Spec-Prüfung im Whiteboarding. · Aussage
- Plan-Orchestrator und Umsetzungs-Orchestrator bleiben vorerst mit ihrer eigenen Schleife; sie lesen die Rundenzahl aus derselben Regeldatei. · Aussage
- Der Begriff für den Ablauf ist „Review-Schleife“ (Glossar `CONTEXT.md`). „Zwischenebene“ ist nur der Arbeitstitel dieser Spec. · Aussage
- Dieser Teil B hängt an A (einziger Einstieg) und C (ein State-Store, eine Berichtsstufe); D läuft parallel. · Anhang

## Theoretisches Verhalten nach Umsetzung
- Die Etappen-Session der Spec-Review-Etappe und der Plan-Review-Etappe ruft den Review-Skill auf und fragt danach das Skript. Das Skript antwortet „Followup, Runde n“ oder „Ende“; die Session führt das aus und fragt nach jedem Followup erneut. · Aussage
- Das Skript entscheidet für Spec und Plan nach derselben Regel: Ist das Ergebnis ⚠️ oder „unvollständig“, folgt Ende. Sonst folgt ein Followup, wenn das Review es anbietet und die Rundenzahl noch nicht erreicht ist; andernfalls Ende. · Aussage
- Die aktuelle Runde ergibt sich aus der Ablage der Etappe: Anzahl der dort liegenden Followup-Berichte. Ein neuer Review mit `--neu` beginnt wieder bei Runde 0. Es gibt keine eigene Zähler-Datei. · Aussage
- Die Aufträge im Brief der Spec-Review-Etappe, der Plan-Review-Etappe und der Spec-Prüfung im Whiteboarding entstehen aus einer Funktion; sie unterscheiden sich nur in der Ablage. · Aussage
- Das Schleifen-Skript committet nicht und schreibt keinen Ketten-Eintrag; den Stand schreibt allein die Leit-Session (C). · Aussage
- Die Spec-Review-Etappe committet die Spec, wie Teil A es für eigene Pfade erlaubt, nachdem die Schleife mit „Ende“ geendet ist und ohne Rückfrage. Ist das Ergebnis ⚠️ unvollständig, gibt es keinen Commit, wie heute. Die Plan-Review-Etappe committet nicht; den Plan committet die Leit-Session nach dem GO. · Aussage
- Die Leit-Session prüft beim `final` einer Review-Etappe die Schleife. Mehr Followup-Berichte als erlaubt, oder ein angebotenes Followup, das nicht lief, obwohl die Rundenzahl nicht erreicht war, ergibt eine Abweichung und hält die Kette. · Aussage
- Im Whiteboarding läuft die Spec-Prüfung durch dieselbe Schleife mit der Ablage `whiteboarding` und ohne Commit der Schleife; `review-stand` liest die Ablage wie bisher. · Aussage
- Plan-Orchestrator und Umsetzungs-Orchestrator verhalten sich wie vor der Änderung (höchstens zwei Followup-Runden); die Zahl kommt aus der Regeldatei. · Aussage

## Soll-Vorgaben
- Die Rundenzahl der Schleife steht an genau einer Stelle: in der gemeinsamen Regeldatei des Plugins, die Teil A festlegt. Das Schleifen-Skript liest sie von dort. Skills, Briefe und README nennen keine Zahl, sondern verweisen auf die Regeldatei. Das Glossar darf „höchstens zwei“ behalten. Tests prüfen gegen den Wert aus der Regeldatei, nicht gegen die Zahl. · Aussage
- Reihenfolge: B beginnt erst nach A und C. Alle Aussagen über den Ist-Zustand gelten für den Stand nach C und werden beim Plan gegen den Code geprüft; die Basis in der Kopfzeile wird dann gesetzt. · Aussage
- B ändert kein Berichtsformat. Am Ende der Schleife liefert das Skript nur, was C als Faktenliste der Etappe festlegt. · Aussage
- Der Skill `spec-review-orchestrator`, seine Tests und alle Verweise auf ihn (README, `ablage.md`, Hook- und Bericht-Skripte) entfallen oder werden angepasst. · Anhang
- Tests und Evals des Plugins werden mit angepasst und sind danach grün. · Aussage

## Akzeptanzkriterien
- **AC-01** Gegeben alle Dateien des Plugins nach der Änderung, wenn sie nach `spec-review-orchestrator` durchsucht werden, dann gibt es keinen Treffer, und das Verzeichnis `skills/spec-review-orchestrator` existiert nicht. · Aussage
- **AC-02** Gegeben das Review einer Spec oder eines Plans bietet ein Followup an und die Rundenzahl ist nicht erreicht, wenn die Etappe das Skript fragt, dann antwortet es „Followup“ mit der nächsten Rundennummer. · Aussage
- **AC-03** Gegeben die Rundenzahl ist erreicht, wenn das Review weiter ein Followup anbietet und die Etappe das Skript fragt, dann antwortet es „Ende“. · Aussage
- **AC-04** Gegeben das Ergebnis ist ⚠️ oder „unvollständig“, wenn die Etappe das Skript fragt, dann antwortet es „Ende“, auch wenn das Review ein Followup anbietet. · Aussage
- **AC-05** Gegeben die Ablage der Etappe enthält n Followup-Berichte, wenn das Skript die Runde bestimmt, dann ist sie n; nach einem Review mit `--neu` ist sie 0. · Aussage
- **AC-06** Gegeben dieselbe Eingabe für Spec und Plan, wenn das Skript entscheidet, dann ist die Antwort für beide gleich. · Aussage
- **AC-07** Gegeben die Briefe der Spec-Review-Etappe, der Plan-Review-Etappe und der Whiteboarding-Prüfung, wenn sie erzeugt werden, dann enthalten sie dieselbe Schleifen-Anweisung, unterscheiden sich nur in der Ablage und nennen keine Rundenzahl. · Aussage
- **AC-08** Gegeben alle Dateien des Plugins nach der Änderung, wenn sie nach dem Wert der Rundenzahl durchsucht werden, dann steht er nur in der gemeinsamen Regeldatei aus Teil A; Schleifen-Skript, Plan-Orchestrator und Umsetzungs-Orchestrator lesen oder verweisen auf sie. · Aussage
- **AC-09** Gegeben das Schleifen-Skript läuft in einer Review-Etappe, wenn es Runde und nächsten Schritt liefert, dann committet es nicht und schreibt keinen Ketten-Eintrag. · Aussage
- **AC-10** Gegeben die Schleife der Spec-Review-Etappe ist mit „Ende“ geendet, wenn das Ergebnis nicht ⚠️ unvollständig ist, dann hat die Etappe die Spec ohne Rückfrage committet; bei ⚠️ unvollständig gibt es keinen Commit, und die Plan-Review-Etappe committet nie. · Aussage
- **AC-11** Gegeben ein `final` einer Review-Etappe mit mehr Followup-Berichten als erlaubt, wenn die Leit-Session es prüft, dann meldet sie eine Abweichung und hält die Kette. · Aussage
- **AC-12** Gegeben ein `final` einer Review-Etappe, in dem ein Followup angeboten war, die Rundenzahl nicht erreicht war und kein Followup lief, wenn die Leit-Session es prüft, dann meldet sie eine Abweichung und hält die Kette. · Aussage
- **AC-13** Gegeben die Whiteboarding-Etappe prüft ihre Spec, wenn die Prüfung endet, dann lag sie in der Schleife mit der Ablage `whiteboarding`, die Schleife hat nicht committet, und `review-stand` liefert Ergebnis und Zahl der offenen Punkte wie vorher. · Aussage
- **AC-14** Gegeben der Plan-Orchestrator oder der Umsetzungs-Orchestrator läuft, wenn das Review Followups anbietet, dann laufen höchstens so viele Runden, wie die Regeldatei vorgibt, und nie eine weitere. · Aussage
- **AC-15** Gegeben die Tests und Evals des Plugins nach der Änderung, wenn sie vollständig laufen, dann sind alle grün, und keiner erwartet noch den Spec-Review-Orchestrator oder die Rundenzahl als Text. · Aussage

## Entscheidungen
- **W · Zwischenebene** · Aussage — Die Schleife liegt im Skript; der Spec-Review-Orchestrator entfällt und Plan-Review wird symmetrisch.
- **W · Schleife im Skript** · Aussage — Das Skript ist ein Zustandsautomat: Es zählt, entscheidet und nennt den nächsten Schritt. Die Etappen-Session ruft Skills und Skript auf. Kein Skript startet Skills selbst.
- **W · Commit** · Aussage — Das Schleifen-Skript committet nicht. Der Satz „Review, höchstens zweimal Followup, Ketteneintrag, Commit“ lautet „Review, höchstens zweimal Followup, Ende“; der Commit folgt der Schleife in der Etappe.
- **W · Spec-Commit** · Aussage — Der Spec-Commit bleibt bei der Spec-Review-Etappe, wie Teil A es für eigene Pfade erlaubt: nach „Ende“, ohne Rückfrage, nicht bei ⚠️ unvollständig. Teil A bleibt unverändert; es gibt keine Ausnahme-Zeile. Die Plan-Review-Etappe committet nicht.
- **W · Ketteneintrag** · Aussage — Die Schleife schreibt keinen Ketten-Eintrag; den Stand schreibt allein die Leit-Session (C).
- **W · Umfang** · Aussage — Spec-Review-Etappe, Plan-Review-Etappe und Spec-Prüfung im Whiteboarding nutzen die Schleife. Plan-Orchestrator und Umsetzungs-Orchestrator behalten ihre Schleife und lesen die Zahl aus der Regeldatei.
- **W · Whiteboarding** · Aussage — Die Spec-Prüfung im Whiteboarding läuft durch dieselbe Schleife; Unterschied ist nur die Ablage `whiteboarding`.
- **W · Rundenzahl** · Aussage — Die Zahl steht an genau einer Stelle, der gemeinsamen Regeldatei aus Teil A; das Schleifen-Skript liest sie von dort. Plugin-Texte nennen keine Zahl, das Glossar darf sie nennen, Tests prüfen gegen den Wert aus der Regeldatei.
- **W · Rundenzähler** · Aussage — Die Runde ergibt sich aus der Anzahl Followup-Berichte in der Ablage; `--neu` beginnt von vorn. Kein eigener Zustand.
- **W · Prüfung beim final** · Aussage — Die Leit-Session prüft die Rundenzahl und ein übersprungenes Followup; beides ergibt eine Abweichung und hält die Kette.
- **W · Followup-Regel** · Aussage — Für Spec und Plan gilt gleich: ⚠️ oder „unvollständig“ ergibt Ende; sonst Followup, wenn angeboten und Rundenzahl nicht erreicht.
- **W · Basis** · Aussage — B gilt für den Stand nach A und C; die Basis wird beim Plan gesetzt und alle Ist-Aussagen werden dann gegen den Code geprüft.
- **W · Berichte** · Aussage — B ändert kein Berichtsformat; die Faktenliste der Etappe legt C fest.
- **W · Glossar** · Aussage — „Review-Schleife“ ist im Glossar; „Followup-Runde“ ist angepasst; „Zwischenebene“ bleibt Arbeitstitel.
