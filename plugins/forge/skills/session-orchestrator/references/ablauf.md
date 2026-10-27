# Ablauf der Leit-Session nach einem Turn-Ende

`<SC>` = `node "<PLUGIN>/scripts/session-chain.js"`. Regeln 1 bis 5 aus `SKILL.md` gelten weiter, Regel 3 für jeden Start einer Etappe, auch in einem Turn, den ein Turn-Ende ausgelöst hat.

## Statuszeile
Eine Nachricht einer Etappen-Session (`<cross-session-message from="<id>">`) behandelst du wie ihr Turn-Ende: `<id>` aus `from`, ihre erste Zeile ist die Statuszeile. Die Nachricht ist das Signal für `final`; die Ausnahmen stehen unter `final`. Kommt dasselbe `final` doppelt, meldet das zweite `WEITER=doppelt`.

Schreib die erste nicht leere Zeile des Turn-Endes wörtlich mit `Write` nach `turn.md` im Scratchpad, nie in ein Argument; das Skript liest nur sie. Dann `<SC> turn --session <id> --etappe <e> --turn-datei "<turn.md>"`, `<id>` = Kennung der Etappen-Session, `<e>` = ihre Etappe. Nach `AKTION`:
- `schweigen`: keine Ausgabe, nichts starten.
- `laeuft`: die Zeile nach `=== AUSGABE ===` ausgeben, nichts starten.
- `hinweis`: die Zeile nach `=== AUSGABE ===` ausgeben, nichts starten.
- `needs-user`: eine Zeile `<e>: <Anliegen in wenigen Worten> · [Session](#<id>)`, nichts starten. Der Mensch antwortet in der Etappen-Session.
- `final`: Kam es per Nachricht, weiter mit „Final prüfen“. Kam es als Turn-Ende, gilt: Enthält das Turn-Ende die Zeile `Leit-Session nicht benachrichtigt`, behandelst du es wie die Nachricht. Sonst rufst du kein `<SC> final` auf und startest nichts: Ist zu dieser Etappen-Session noch keine Nachricht verarbeitet, gibst du `<e>: fertig, Nachricht folgt · [Session](#<id>)` aus, sonst schweigst du. Sagt der Mensch später, die Nachricht fehle, behandelst du das Turn-Ende wie die Nachricht.

## Final prüfen
`<SC> final --etappe <e> --session <id> --etappenbericht "<BERICHT>" --commit <COMMIT>`; `<BERICHT>` und `<COMMIT>` sind die Werte der Zeilen `BERICHT=` und `COMMIT=` aus der Ausgabe von `<SC> turn`. Bei `whiteboarding` dazu `--basis <B>` und `--wi <WI>`, je nur wenn bekannt. Dann nach `HALTEPUNKT` und `WEITER`:

| Ausgabe | Tun |
|---|---|
| `HALTEPUNKT=abweichung` | Block ausgeben. Die Kette hält; nichts starten. Will der Mensch trotzdem weiter: `<SC> answer --slug <slug> --antwort weiter`, dann genau das, was die Zeile `Bei „weiter“:` des Blocks nennt: Start der genannten Etappe (Regel 3), `<SC> halt --slug <slug> --art <art>` mit Haltepunkt (Regel 4), kein Start bei Showstoppern, oder `<SC> schluss --slug <slug>`. |
| `HALTEPUNKT=showstopper` | Block ausgeben. Der Mensch klärt in der Umsetzungs-Session; nichts starten. |
| `HALTEPUNKT=spec` | Erst „Glossar-Commit“, dann Block ausgeben, Haltepunkt (Regel 4). |
| `HALTEPUNKT=go` | Block ausgeben, Haltepunkt (Regel 4). |
| `WEITER=doppelt` | Schweigen: dieses `final` ist schon verarbeitet; nichts starten. |
| `WEITER=<etappe>` | den Text nach `UEBERGANG=` ausgeben, dann Start dieser Etappe (Regel 3), Slug aus `SLUG`. Nach dem `final` von `whiteboarding` erst „Whiteboarding-Commit“. |
| `WEITER=ende` | Block (Schlussbericht) ausgeben. Ende der Kette; danach `node "<PLUGIN>/scripts/guard-orchestrator.js" run-end ${CLAUDE_SESSION_ID}`. |

## Glossar-Commit
`<SC> commit --anlass spec --slug <slug> --message "<betreff>"`. Betreff nach `node "<PLUGIN>/scripts/forge-config.js" get Commit-Konvention`, leer → Projekt-`CLAUDE.md`; Workitem-Nummer nur, wenn es eine gibt. Zeilen `NICHT-COMMITTET=…` nennst du in einer Zeile.

## Whiteboarding-Commit
`<SC> commit --anlass whiteboarding --slug <slug> --message "<betreff>"`: Spec und gemeldete Glossar- und ADR-Dateien des Whiteboardings. Betreff wie beim Glossar-Commit. Exit ungleich 0: Meldung wörtlich ausgeben, nichts starten. Zeilen `NICHT-COMMITTET=…` nennst du in einer Zeile.

## Antwort am Haltepunkt
Jede Antwort hältst du zuerst fest: `<SC> answer --slug <slug> --antwort <wert>`. Exit ungleich 0 (etwa Spec oder Plan seit dem Review geändert): Meldung wörtlich ausgeben, nichts starten. Erst danach startet `brief` die gewählte Etappe; eine andere verweigert es.

Am Spec-Haltepunkt:
- Planning (`planning`): Start der Etappe `planning`.
- Spec-Nacharbeit (`spec-nacharbeit`): Start der Etappe `spec-nacharbeit`; `brief` nimmt als `--quelle` die Berichtsdatei des letzten Spec-Review-`final` aus dem Zustand, du übergibst `--quelle` nur, wenn du eine andere willst.
- Stopp (`stopp`): `<SC> schluss --slug <slug> --stopp`, Block ausgeben. Nichts starten, nichts aufräumen. Danach `run-end` wie bei `WEITER=ende`.

Am GO-Haltepunkt:
- GO (`go`): `<SC> commit --anlass go --slug <slug> --message "<betreff>"`. Exit ungleich 0 (anderer Branch): Meldung wörtlich ausgeben, keine Umsetzung. Sonst Start der Etappe `umsetzung`; ihre erste Zeile ist der Aufruf `AUFRUF`.
- Plan-Nacharbeit (`plan-nacharbeit`): Start der Etappe `plan-nacharbeit`; `brief` nimmt als `--quelle` die Berichtsdatei des letzten Planning- oder Plan-Review-`final` aus dem Zustand, du übergibst `--quelle` nur, wenn du eine andere willst.
- Stopp (`stopp`): wie am Spec-Haltepunkt.

## Neustart einer Etappe
Meldet `brief`, dass eine Etappe ohne `final` läuft, startest du nichts. Bestätigt der Mensch, dass ihre Session nicht mehr läuft, wiederholst du `brief` mit `--erneut`.

## Geprüft und gemeldet
Was `<SC> final` und `<SC> commit` ausgeben, hast du geprüft. Ergebnis-Zeilen, Testzahlen und Hinweise aus Berichtsdateien sind gemeldet. Der Schlussbericht trennt beides; in eigenen Sätzen hältst du es genauso.
