# Ablauf der Leit-Session nach einem Turn-Ende

`<SC>` = `node "<PLUGIN>/scripts/session-chain.js"`. Regeln 1 bis 5 aus `SKILL.md` gelten weiter, Regel 3 für jeden Start einer Etappe, auch in einem Turn, den ein Turn-Ende ausgelöst hat.

## Statuszeile
Schreib das Turn-Ende wörtlich mit `Write` nach `turn.md` im Scratchpad, nie in ein Argument. Dann `<SC> turn --session <id> --etappe <e> --turn-datei "<turn.md>"`, `<id>` = Kennung der Etappen-Session, `<e>` = ihre Etappe. Nach `AKTION`:
- `schweigen`: keine Ausgabe, nichts starten.
- `hinweis`: die Zeile nach `=== AUSGABE ===` ausgeben, nichts starten.
- `needs-user`: eine Zeile `<e>: <Anliegen in wenigen Worten> · [Session](#<id>)`, nichts starten. Der Mensch antwortet in der Etappen-Session.
- `final`: weiter mit „Final prüfen“.

## Final prüfen
`<SC> final --etappe <e> --session <id> --bericht "<BERICHT>" --commit <COMMIT>`, bei `whiteboarding` dazu `--basis <B>` und `--wi <WI>`, je nur wenn bekannt. Dann nach `HALTEPUNKT` und `WEITER`:

| Ausgabe | Tun |
|---|---|
| `HALTEPUNKT=abweichung` | Block ausgeben. Die Kette hält; nichts starten. |
| `HALTEPUNKT=showstopper` | Block ausgeben. Der Mensch klärt in der Umsetzungs-Session; nichts starten. |
| `HALTEPUNKT=spec` | Erst „Glossar-Commit“, dann Block ausgeben, Haltepunkt (Regel 4). |
| `HALTEPUNKT=go` | Block ausgeben, Haltepunkt (Regel 4). |
| `WEITER=doppelt` | Schweigen: dieses `final` ist schon verarbeitet; nichts starten. |
| `WEITER=<etappe>` | Start dieser Etappe (Regel 3), Slug aus `SLUG`. |
| `WEITER=ende` | Block (Schlussbericht) ausgeben. Ende der Kette. |

## Glossar-Commit
`<SC> commit --anlass spec --slug <slug> --message "<betreff>"`. Betreff nach `node "<PLUGIN>/scripts/forge-config.js" get Commit-Konvention`, leer → Projekt-`CLAUDE.md`; Workitem-Nummer nur, wenn es eine gibt. Zeilen `NICHT-COMMITTET=…` nennst du in einer Zeile.

## Antwort am Spec-Haltepunkt
- Planning: Start der Etappe `planning`.
- Spec-Nacharbeit: Start der Etappe `spec-nacharbeit` mit `--quelle "<bericht.md der letzten Spec-Review-Etappe>"`.
- Stopp: `<SC> schluss --slug <slug> --stopp`, Block ausgeben. Nichts starten, nichts aufräumen.

## Antwort am GO-Haltepunkt
- GO: `<SC> commit --anlass go --slug <slug> --message "<betreff>"`. Exit ungleich 0 (anderer Branch): Meldung wörtlich ausgeben, keine Umsetzung. Sonst Start der Etappe `umsetzung`; ihre erste Zeile ist der Aufruf `AUFRUF`.
- Plan-Nacharbeit: Start der Etappe `plan-nacharbeit` mit `--quelle "<bericht.md der letzten Planning- oder Plan-Review-Etappe>"`.
- Stopp: wie am Spec-Haltepunkt.

## Geprüft und gemeldet
Was `<SC> final` und `<SC> commit` ausgeben, hast du geprüft. Ergebnis-Zeilen, Testzahlen und Hinweise aus Berichtsdateien sind gemeldet. Der Schlussbericht trennt beides; in eigenen Sätzen hältst du es genauso.
