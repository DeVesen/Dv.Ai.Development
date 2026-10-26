# dv-forge: die sieben Einstiege absichern

Status: bestätigt am 2026-10-26
Art: frei
Basis: ce4ee4f

## Was, wie, wo, warum
- Es gibt genau sieben Einstiege in `/dv-forge:session-orchestrator`: Whiteboarding (ohne Pfad), Grill, Spec-Review, Planung, Plan-Review, Umsetzung, Abschluss. · Aussage
- Jeder Einstieg soll durch einen Test abgesichert sein, der grün ist. · Aussage
- Bei jedem Einstieg, auch mitten in der Kette, werden Basis-Branch und Workitem-Nummer geholt oder erfragt; Ausnahme ist der Abschluss, der nur das Workitem holt oder erfragt. · Aussage
- Whiteboarding: Aufruf ohne Codewort, erste Etappe `whiteboarding`, keine Pfade. · Anhang
- Grill: Codewort `grill`, erste Etappe `grill`, Pfad `<spec>`. · Anhang
- Spec-Review: Codewort `spec-review`, erste Etappe `spec-review`, Pfad `<spec>`. · Anhang
- Planung: Codewort `planning`, erste Etappe `planning`, Pfad `<spec>`. · Anhang
- Plan-Review: Codewort `plan-review`, erste Etappe `plan-review`, Pfade `<spec> <plan>`. · Anhang
- Umsetzung: Codewort `implementation`, erste Etappe `go` (zuerst der Haltepunkt GO, die Umsetzung startet erst nach der Antwort `go`), Pfade `<spec> <plan>`. · Anhang
- Abschluss: Codewort `finish`, erste Etappe `abschluss`, Pfad `<worktree>`. · Anhang
- „Geholt oder erfragt“ heißt: Das Workitem kommt aus dem Spec-Kopf, sonst aus dem Aufruf, sonst aus dem Zustand; liefert keine Quelle eines, wird einmal gefragt. `Workitem: keine` im Spec-Kopf und ein Projekt ohne Workitem-Muster gelten als „kein Workitem“ und lösen keine Frage aus. Die Basis kommt aus dem Zustand; fehlt der, wird einmal gefragt. · Anhang
- Der Einstieg prüft nur, ob die genannten Pfade existieren; den Review-Status früherer Etappen prüft er nicht. · Anhang

## Theoretisches Verhalten nach Umsetzung
- Für jeden der sieben Einstiege gibt es einen Test, der den Aufruf durch das CLI schickt: `entry`, danach der Start der ersten Etappe per `brief`; bei der Umsetzung der Haltepunkt GO. · Aussage
- Der Einstieg nennt die erste Etappe aus der Liste oben, die absoluten Pfade, den Slug, und ob Basis oder Workitem einmal erfragt werden müssen. · Anhang
- Kommt ein Wert aus Spec-Kopf, Aufruf oder Zustand, fragt die Leit-Session nicht danach. · Anhang
- Der Abschluss fragt nie nach der Basis. · Aussage
- Das Whiteboarding bekommt das Workitem nur per Rückfrage, nie als Argument des Aufrufs. · Aussage
- Der Einstieg lässt auch Spec oder Plan ohne vorheriges Review zu; nur fehlende Dateien lehnt er ab. · Anhang

## Soll-Vorgaben
- Teil D läuft parallel zu den anderen Teilen. · Anhang
- Die Absicherung besteht aus deterministischen Node-Tests ohne LLM: je Einstieg ein Szenario durch das CLI (`entry`, dann der Start der ersten Etappe per `brief`, bei der Umsetzung der Haltepunkt GO). Ein Eval, bei dem die Leit-Session wirklich läuft, gehört nicht zu Teil D. · Aussage
- Die neuen Tests stehen in einer neuen Testdatei, ändern keinen bestehenden Test und bauen den Zustand nur über das CLI (`set`, `answer`, `halt`) auf, nicht über interne Schreibfunktionen; so bleiben sie nach Teil C und neben Teil A gültig. · Aussage
- Je Einstieg genau ein Normalfall-Szenario; die Reihenfolge der Workitem-Quellen wird einmal gezielt auf der Analyse des Einstiegs geprüft. Keine Matrix aus Einstieg mal Quelle. · Aussage
- Teil D darf Entry-Code ändern, aber nur, wo ein neuer Test eine Lücke zeigt und die Akzeptanzkriterien das Verhalten nennen. Jede so gefundene Lücke steht als Befund in den Entscheidungen. · Aussage

## Akzeptanzkriterien
- **AC-01** Gegeben ein Aufruf ohne Argumente und kein Zustand, wenn der Einstieg läuft, dann nennt er die Etappe `whiteboarding`, den aktuellen Branch als Basis-Vorschlag mit einer Frage nach der Basis, und eine Frage nach dem Workitem nur, wenn das Projekt Workitem-Nummern verwendet; der Start per `brief` liefert Modell, Titel und Brief der Etappe `whiteboarding`. · Aussage
- **AC-02** Gegeben ein Aufruf mit Codewort `grill`, `spec-review` oder `planning` und einem vorhandenen Spec-Pfad, wenn der Einstieg läuft, dann nennt er die gleichnamige Etappe, den absoluten Spec-Pfad und den Slug des Spec-Ordners; der Start per `brief` mit diesem Slug liefert Modell, Titel und Brief dieser Etappe. · Aussage
- **AC-03** Gegeben ein Aufruf mit Codewort `plan-review` und vorhandenem Spec- und Plan-Pfad im selben Ordner, wenn der Einstieg läuft, dann nennt er die Etappe `plan-review`, beide absoluten Pfade und den Slug; der Start per `brief` liefert Modell, Titel und Brief der Etappe `plan-review`. · Aussage
- **AC-04** Gegeben ein Aufruf mit Codewort `implementation` und vorhandenem Spec- und Plan-Pfad, wenn der Einstieg läuft und die Leit-Session den Haltepunkt GO setzt, dann steht der Zustand auf GO, und ein Start per `brief` vor der Antwort `go` wird abgelehnt; nach der Antwort `go` und dem GO-Commit startet `brief` die Etappe `umsetzung`. · Aussage
- **AC-05** Gegeben ein Aufruf mit Codewort `finish` und vorhandenem Worktree-Pfad, wenn der Einstieg läuft, dann nennt er die Etappe `abschluss`, den absoluten Worktree-Pfad und den Slug; er fragt nie nach der Basis, nimmt sie aus dem Zustand, wenn vorhanden, und fragt nach dem Workitem nur, wenn weder Zustand noch Aufruf eines liefern und das Projekt Workitem-Nummern verwendet; der Start per `brief` liefert Modell, Titel und Brief der Etappe `abschluss`. · Aussage
- **AC-06** Gegeben ein Einstieg mit Spec, die im Kopf `Workitem: <nr>` trägt, dazu eine andere Nummer im Aufruf und im Zustand, wenn der Einstieg läuft, dann ist das Workitem die Nummer aus dem Spec-Kopf; fehlt sie dort, die aus dem Aufruf; fehlt sie auch dort, die aus dem Zustand; sobald eine Quelle ein Workitem liefert, stellt der Einstieg keine Frage danach. · Anhang
- **AC-07** Gegeben ein Projekt mit Workitem-Nummern und eine Spec ohne Workitem im Kopf, ohne Nummer im Aufruf und ohne Zustand, wenn der Einstieg läuft, dann fragt er genau einmal nach dem Workitem. · Anhang
- **AC-08** Gegeben die Spec trägt `Workitem: keine` im Kopf oder das Projekt verwendet keine Workitem-Nummern, wenn der Einstieg läuft, dann stellt er keine Frage nach dem Workitem und nennt keines. · Anhang
- **AC-09** Gegeben ein Zustand mit Basis-Branch, wenn ein Einstieg außer dem Abschluss läuft, dann nennt er diese Basis und stellt keine Frage danach; ohne Zustand fragt er einmal und schlägt den aktuellen Branch vor. · Anhang
- **AC-10** Gegeben eine Spec ohne vorheriges Review und ohne Zustand, wenn der Einstieg `planning` läuft, dann endet er ohne Fehler und nennt die Etappe `planning`. · Anhang
- **AC-11** Gegeben ein Aufruf mit fehlendem Pfad, unbekanntem Codewort, falscher Anzahl Pfade oder Spec und Plan aus verschiedenen Ordnern, wenn der Einstieg läuft, dann endet er mit Exit ungleich 0 und nennt in der Fehlermeldung den Pfad, das Codewort, die erwartete Form oder beide Slugs. · Anhang
- **AC-12** Gegeben ein Aufruf mit einer reinen Workitem-Nummer als einzigem Argument, wenn der Einstieg läuft, dann endet er mit „Unbekanntes Codewort: <nummer>“ und der Liste der gültigen Codewörter. · Aussage
- **AC-13** Gegeben die neuen Tests und der gesamte Testlauf des Plugins, wenn sie vollständig laufen, dann sind alle grün, und die neuen Tests stehen in einer neuen Datei, die keinen bestehenden Test ändert. · Aussage

## Entscheidungen
- **W · Einstiege mitten in der Kette** · Aussage — Die sieben Einstiege sind vollständig; für jeden außer dem Abschluss werden Basis-Branch und Workitem-Nummer geholt oder erfragt, der Abschluss holt oder erfragt nur das Workitem.
- **W · Was „abgesichert“ heißt** · Aussage — Deterministische Node-Tests durch das CLI, je Einstieg ein Szenario; kein Leit-Session-Eval, weil dafür die Infrastruktur fehlt und es ein eigenes Vorhaben wäre.
- **W · Abschluss und Basis** · Aussage — Der Abschluss arbeitet im vorhandenen Worktree, die Basis hat dort keine Wirkung; er fragt nie nach der Basis und nimmt sie nur aus dem Zustand, falls vorhanden.
- **W · Verhaltensänderung in Teil D** · Aussage — Erlaubt nur im Entry-Code und nur im Umfang der Akzeptanzkriterien; ein roter Test hilft nicht, der Befund steht in der Spec.
- **W · Liste der Einstiege** · Aussage — Einstieg, Codewort, erste Etappe und Pfade stehen in „Was, wie, wo, warum“ und sind die Referenz der Akzeptanzkriterien; das Glossar bleibt unverändert.
- **W · Geholt oder erfragt** · Aussage — Definition wie oben, so wie der Code sie heute umsetzt.
- **W · Breite pro Einstieg** · Aussage — Je Einstieg ein Normalfall-Szenario durch das CLI; die Quellen-Reihenfolge des Workitems einmal gezielt; keine Matrix, weil fast alle Fälle denselben Code prüfen.
- **W · Review-Status mitten in der Kette** · Aussage — Der Einstieg prüft nur, ob die Dateien existieren; das ist gewollt und wird festgehalten, damit niemand später stillschweigend eine Prüfung einbaut. Eine Ablehnung ungeprüfter Dateien wäre eine neue Funktion und gehört nicht zu Teil D.
- **W · Zustand in den Tests** · Aussage — Nur über das CLI und in einer neuen Testdatei; so kollidiert Teil D nicht mit Teil A und bleibt nach Teil C grün.
- **W · Whiteboarding und Workitem** · Aussage — Das Whiteboarding bekommt die Nummer nur per Rückfrage; eine Nummer als Argument bleibt ein unbekanntes Codewort, weil eine neue Aufruf-Syntax nicht zur Absicherung gehört.
