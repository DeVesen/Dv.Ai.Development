# Entwurf: Begründungen für die Regeln von dv-forge (Befund 8)

Für jede Regel aus `shared/orchestrator-rules.md` und `shared/dialog-rules.md`, bei der die Quelle keinen Grund nennt, steht hier ein Vorschlag. Nach deiner Freigabe wandern die Begründungen in das Feld `why` von `src/forge/rules/*.yaml`. Der Text der Regeldateien selbst bleibt unverändert, damit die Skills nicht länger werden.

**Herkunft** jeder Begründung:
- **Beleg:** steht so oder sinngemäß im Code oder in einer anderen forge-Datei (Fundstelle genannt).
- **Aussage:** hast du in dieser Session gesagt.
- **Vermutung:** von mir abgeleitet, ohne Beleg. Diese bitte besonders prüfen.

Die Dialog-Regeln R-409 bis R-413 beziehen sich schon auf die **Empfehlungs-Schwelle** (Standard 70 %) aus dem Branch `harness/forge-empfehlungs-schwelle`, nicht mehr auf 85 %.

So antwortest du: „alles ok“, oder je Nummer eine Korrektur, z. B. „R-405: streichen“ oder „R-401: Grund ist …“.

## Orchestrator-Regeln

| # | Regel (gekürzt) | Vorschlag für die Begründung | Herkunft |
|---|---|---|---|
| R-301 | Maximum Followup-Runden: 8 | Ein Orchestrator-Lauf ist unbeaufsichtigt; das Maximum begrenzt Laufzeit und Kosten. Was danach offen ist, entscheidet der Mensch am Haltepunkt (R-304). | Beleg: Orchestratoren laufen „in one unattended run“ (descriptions); R-304 |
| R-302 | Eine Runde startet nur bei offenem 🔴 mit Scout-Vorschlag (bzw. 🟡/🟢 ab Schwelle) | Ohne Scout-Vorschlag hat die Integration nichts umzusetzen; die Runde würde nichts ändern und nur eine Iteration verbrauchen. | Beleg: Integration setzt den bevorzugten Vorschlag um (R-305) |
| R-303 | Ende bei Stillstand: dieselbe 🔴-Stelle zwei Runden in Folge offen | Löst die Integration eine Stelle zweimal nicht, löst sie eine dritte Runde mit denselben Vorschlägen ebenso wenig; weitere Runden würden das Maximum ohne Fortschritt aufbrauchen. | Vermutung |
| R-304 | Bei offenem 🔴 sauberes Ende mit Abschlussbericht, `Iterationen` und `Abbruch` | Über offene 🔴 entscheidet der Mensch am Haltepunkt; dafür braucht er Stand, Zahl der Iterationen und Abbruchgrund, keinen abgebrochenen Lauf. | Beleg: „Die Leit-Session hält danach am Haltepunkt“ (Regel selbst), Haltepunkt-Block in `session-chain-text.js` |
| R-305 | Integration setzt den bevorzugten Scout-Vorschlag um; Abweichung nur mit Begründung | Der Scout hat die Stelle mit Beleg geprüft und einen Vorschlag bevorzugt; eine stille Abweichung wäre im Bericht nicht nachvollziehbar. | Beleg: `Bevorzugt:`-Zeile und Beleg-Pflicht der Scouts (`agents/*-scout.md`) |
| R-306 | Aktueller Checkout und Branch; kein checkout, switch, stash, rebase, worktree | Branch und Worktree legt die Session-Kette fest (start-work, GO). Ein Wechsel im Orchestrator brächte Spec, Plan oder Code auf den falschen Stand und bräche die Prüfung gegen git (`session-chain.js final`). | Beleg: `session-chain-check.js`, `start-work` |
| R-307 | Kein Merge, Push, Force, `--no-verify`, `git add -A`/`.`, `commit -a` | Push und Merge gibt nur der Mensch frei (R-413). Sammel-Befehle wie `git add -A` würden Dateien einer Parallelsession im selben Checkout mitcommitten. `--no-verify` umginge die Prüfungen des Projekts. | Beleg: `spec-format.md` (Parallelsession), R-413; `--no-verify`: Vermutung |
| R-309 | `spec-review-orchestrator` committet nur die Spec, nur über `spec-commit.js` | Das Skript prüft vorher Ort und Vorbestand (`preflight`) und committet nur den Pfad der Spec; so gerät nichts anderes in den Commit. | Beleg: `scripts/spec-commit.js` |
| R-310 | `plan-orchestrator` und `implementation-orchestrator` committen nie | Spec und Plan committet die Leit-Session nach dem GO, den Code der Implementer je Task. Ein Commit des Orchestrators käme doppelt oder zur falschen Zeit. | Beleg: Brief der Etappe Plan-Review („Spec und Plan committet die Leit-Session nach dem GO“), `implementation-implementer.md` |
| R-312 | Review und Followup zeigen keinen Bericht, nur die Statuszeile | Den einen Abschlussbericht setzt der Orchestrator aus den Bericht-Daten zusammen (`orchestrator-report.js`). Zwischenberichte würden doppelt im Chat stehen und den Kontext der Leit-Session füllen. | Beleg: README (genau ein Abschlussbericht); Kontext: Vermutung |
| R-313 | Wünsche des Menschen gegen diese Regeln nicht ausführen, als `Abweichungen:` melden | Die Regeln schützen Git-Stand und Ablauf auch gegen eine spontane Bitte mitten im Lauf. Die Zeile macht den abgelehnten Wunsch sichtbar, damit die Leit-Session ihn am Haltepunkt aufgreifen kann. | Vermutung |

Schon mit Begründung aus der Quelle: R-308 (Projekt-`CLAUDE.md` hebt die Git-Verbote nicht auf), R-311 (ein Hook verlangt die Überschriften des Berichts wörtlich).

## Dialog-Regeln

| # | Regel (gekürzt) | Vorschlag für die Begründung | Herkunft |
|---|---|---|---|
| R-401 | Kurz: Kern zuerst, kurze Sätze, keine Floskeln | Der Mensch liest über eine Session-Kette viele Nachrichten; kurze Sätze lassen sich schnell erfassen und beantworten. | Vermutung |
| R-402 | Hart und fair: Schwächen offen benennen, nichts ungeprüft bestätigen | Ein ungeprüftes Ja lässt Fehler in Spec und Plan stehen, die erst in der Umsetzung teuer auffallen. | Beleg: Rote Flagge „Klingt gut, ich stimme zu“ (`dialog-rules.md`); „teuer“: Vermutung |
| R-403 | Mehrwert: Frage, Vorschlag, Änderung nur mit konkretem Nutzen | Jede Frage kostet den Menschen eine Antwort; ohne Nutzen ist sie nur Last. | Vermutung |
| R-404 | Zuerst, was der Mensch tun oder entscheiden soll | Der Mensch soll ohne die Erklärung zu lesen wissen, was von ihm erwartet wird. | Vermutung |
| R-405 | Schritte nummeriert, höchstens fünf | Lange Schrittlisten werden überflogen; fünf Schritte bleiben im Blick, der Rest folgt auf Nachfrage. | Vermutung |
| R-406 | In jedem Turn der Stand | In langen Läufen sieht der Mensch ohne Nachfrage, wo die Etappe steht und was fertig ist. | Vermutung |
| R-407 | Am Ende genau eine Handlung oder Frage (außerhalb der Fragerunden, Befund 4) | Mehrere gleichrangige Aufforderungen lassen offen, worauf der Mensch antworten soll. In Whiteboarding und Grill gehen die Fragerunden vor, weil du dort alles auf einmal mit „wie empfohlen“, Einzelkorrektur oder Freitext beantwortest. | Aussage (Fragerunden), sonst Vermutung |
| R-408 | Fehler sachlich, Zeitangaben in festen Einheiten | Ursache und Abhilfe ermöglichen eine Entscheidung; feste Einheiten vermeiden Missverständnisse wie „gleich“ oder „kurz“. | Vermutung |
| R-411 | Sichtbar: Übernommenes steht vor den Fragen, mit Gewissheit in Prozent | Eine selbst getroffene Entscheidung kann der Mensch nur korrigieren, wenn er sie sieht. Ohne Widerspruch wird sie ein W-Eintrag. | Beleg: Regel selbst (W-Eintrag bei fehlendem Widerspruch) |
| R-412 | Unter der Schwelle fragen, mit genau einer Empfehlung | Mit genau einer Empfehlung kannst du mit „wie empfohlen“ antworten, nur einzelne Punkte korrigieren oder frei antworten. | Aussage |
| R-413 | Nie selbst: Bestätigung von Entwurf, Titel, Slug, Schreiben, Commit, Push, Haltepunkt, Abbruch | Diese Schritte wirken nach außen (Push), sind schwer umkehrbar (Commit) oder legen fest, was überhaupt gebaut wird (Entwurf, Haltepunkt); sie bleiben beim Menschen, auch über der Empfehlungs-Schwelle. | Vermutung |

Schon mit Begründung aus der Quelle: R-409 (Empfehlung übernehmen: eine Frage nur mit konkretem Nutzen, Ton-Regel 3), R-410 (eine Vermutung bleibt eine Frage).
