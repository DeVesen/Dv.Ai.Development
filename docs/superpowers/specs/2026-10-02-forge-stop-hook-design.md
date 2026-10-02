# dv-forge TP-A: Stop-Hook für garantierte Review-Ausgabe

**Plugin:** `plugins/forge` (dv-forge, Stand 0.18.0)
**Teil von:** Wunsch „Lesbare Review-Ausgabe und garantierte Ausgabe im Chat". TP-A ist der erste von drei unabhängigen Teilen (TP-B Anhalten-Format, TP-C Abschlussbericht). TP-A liefert nur die technische Garantie, keine neuen Formate.
**Status:** Design mit dem Menschen abgestimmt am 2026-10-02.

## 1. Problem

Beim Anhalten für Fragen und beim Abschluss muss der Orchestrator einen fertigen Text (`=== FRAGEN ===`, `=== BERICHT ===`) im Chat ausgeben. Ein Nutzer-Hook, der kurze Antworten verlangt, hat das schon unterdrückt. Der Ablauf (`shared/review-flow/flow.md`) hat weder Vorrang vor solchen Hooks noch eine technische Absicherung.

## 2. Ziel und Abgrenzung

Ein `Stop`-Hook prüft am Ende des Zugs, ob der vorgemerkte Pflichttext im Chat stand, und fordert ihn höchstens zweimal nach. Der Ablauf schreibt den Vorrang-Satz vor.

Nicht Teil von TP-A: neue Formate der Texte, Klartext-Felder der Agents, Kürzel-Prüfung, `alle`-Folgebefehl (TP-B, TP-C). Die Review-Logik (`review-flow.js`) bleibt unverändert.

**Bekannte Lücke:** Der Bericht von `implementation-review` (`shared/review-loop/loop.md`) wird heute vom Orchestrator selbst verfasst und liegt in keiner Datei; der Orchestrator darf im geschützten Repo nichts schreiben. Dort gibt es in TP-A nur den Vorrang-Satz. Die Garantie folgt, sobald TP-C diesen Bericht skriptgeneriert als Datei erzeugt.

## 3. Belegte Fakten (Spike 2026-10-02, Desktop-App)

- `Stop` feuert in der Desktop-App.
- Stdin enthält u. a. `session_id`, `transcript_path`, `cwd`, `hook_event_name`, `stop_hook_active` (false), `last_assistant_message`.
- `last_assistant_message` ist nur die letzte Nachricht des Zugs; Text vor späteren Tool-Calls steht dort nicht.
- Transcript (JSONL): echte Nutzer-Prompts sind `type:"user"` mit String-`content`; Assistenten-Text steht in `type:"assistant"` als `text`-Block. `scripts/lib/transcript.js` liest dieses Format bereits.
- Ob die letzte Nachricht beim Hook-Lauf schon im Transcript steht, ist nicht belegt. Der Hook bildet den Zugtext deshalb aus Transcript **und** `last_assistant_message`.

## 4. Anforderungen

### 4.1 Marker

Der Marker unter `<tmp>/dv-forge/<session>.json` bekommt `mustShow: { file, anchors[], lines, text, attempts }`. `text` ist der Inhalt der Datei zum Zeitpunkt von `show`, `lines` die Zahl ihrer nichtleeren Zeilen. Beides wird im Marker gehalten, weil `workspace.js remove` die Datei vor dem Zugende löscht.

- `release` entfernt Schutzliste (`protected`, `command`) und `paused`, behält aber `mustShow`, falls vorhanden. Ohne `mustShow` löscht es den Marker wie bisher.
- Ein Marker ohne `protected` schützt nichts (`decidePreTool` liefert dann `null`; vorhandenes Verhalten).
- Ein neuer Nutzer-Prompt (kein Harness-Hinweis, kein Skill-Aufruf) löscht den Marker vollständig wie bisher.

### 4.2 Aufrufe

- `guard-orchestrator.js show <SESSION> --file <datei>`: liest die Datei, leitet die Anker ab, schreibt `mustShow` mit `attempts: 0`, `lines` und `text` in den Marker. Legt den Marker an, falls keiner existiert.
- `guard-orchestrator.js pause <SESSION> --show <datei>`: wie `pause`, dazu `show`.
- Anker = jede Zeile der Datei, die mit `## ` oder `### ` beginnt, sowie jede Zeile, die nach dem Trimmen mit `**Frage ` oder `Frage ` plus Ziffer beginnt. Die Ableitung ist formatunabhängig, damit TP-B und TP-C den Hook nicht ändern.
- Fehlt die Datei oder ergibt sie keinen Anker, schreibt `show` eine Meldung auf stderr und merkt nichts vor. Bei `pause --show` gilt das Anhalten (`paused`) trotzdem.
- Beide Aufrufe sind einzelne `node`-Aufrufe ohne Verkettung und damit für den Orchestrator erlaubt (`guard-orchestrator.js` steht in `DIR_ALLOWED_SCRIPTS`).

### 4.3 Hook `Stop`

`hooks/hooks.json` bekommt unter `Stop` den Aufruf `node "${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js" turn-end`. `SessionEnd` mit `stop` und `SubagentStop` bleiben unverändert.

`turn-end`:
1. Kein Marker oder kein `mustShow`: nichts ausgeben.
2. Zugtext = alle `text`-Blöcke aller `assistant`-Einträge seit dem letzten echten Nutzer-Prompt aus `transcript_path` (Harness-Hinweise und `tool_result`-Einträge zählen nicht als Nutzer-Prompt), plus `last_assistant_message`.
3. Fehlt mindestens ein Anker im Zugtext (Vergleich nach Trimmen und Zusammenfassen von Leerraum) oder hat der Zugtext weniger als 60 % der gemerkten Zeilenzahl `lines`, und `attempts < 2`: `attempts` um 1 erhöhen, Marker schreiben, ausgeben `{"decision":"block","reason":"dv-forge: Gib den folgenden Text unverändert im Chat aus. Es fehlt: <anker>. Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks.

<text>"}`; `<text>` ist der gemerkte Dateiinhalt, weil die Datei dann nicht mehr existiert. `<anker>` nennt höchstens drei fehlende Zeilen; fehlen keine Anker und nur die Länge reicht nicht, steht dort `der Text ist zu kurz`.
4. Sonst (alle Anker da und lang genug, oder `attempts >= 2`): `mustShow` entfernen; ist der Marker danach leer, löschen. Keine Ausgabe, der Zug endet.
5. Fehler (Datei, Transcript, JSON) schreiben `dv-forge guard: <meldung>` auf stderr und blockieren nie.

### 4.4 Dateien der Pflichttexte

- `rework-check` schreibt `<W>/runde-1/fragen.md` bereits (der Fragentext ohne die Zeile „Antworte im Chat"). Der Ablauf nutzt diese Datei beim Anhalten.
- `report` schreibt zusätzlich den Text nach `=== BERICHT ===` unverändert nach `<W>/abschluss/bericht.md`. Das Verzeichnis legt `writeClosing` bereits neu an; `bericht.md` entsteht danach.

### 4.5 Ablauftexte

Der Satz **„Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Text."** steht an jeder Stelle unten.

- `shared/review-flow/flow.md`, Abschnitt „Anhalten": Schritt 2 wird `node "<PLUGIN>/scripts/guard-orchestrator.js" pause <SESSION> --show "<W>/runde-1/fragen.md"`. Der Satz steht in Schritt 1.
- `shared/review-flow/flow.md`, Abschnitt „Ende": Nach Schritt 3 (Bericht im Chat) und vor `workspace.js remove` kommt `node "<PLUGIN>/scripts/guard-orchestrator.js" show <SESSION> --file "<W>/abschluss/bericht.md"`. Der Satz steht in Schritt 3.
- `skills/review-followup/SKILL.md` (Schritt 5 und 6) und `skills/review-followup/references/flow.md`, Abschnitt „Bericht": Bei `spec-review` und `plan-review` ruft das Followup `report` auf; es entsteht dieselbe Datei `<W>/abschluss/bericht.md`. Der Ablauf ruft vor dem Freigeben `show` mit dieser Datei auf, dazu der Satz. Die Zusatz-Abschnitte des Followups (Hinweise, Umgesetzt, Scout) liegen in keiner Datei und sind nicht verankert. Bei `implementation-review` gibt es keine Berichtsdatei: dort nur der Satz (siehe „Bekannte Lücke").
- `shared/review-loop/loop.md`, Abschnitt „Abschluss" Schritt 3: nur der Satz (siehe „Bekannte Lücke").

## 5. Abnahmekriterien

1. `hooks/hooks.json` enthält einen `Stop`-Eintrag mit `turn-end`; die Einträge `SessionEnd` und `SubagentStop` sind unverändert.
2. `turn-end` ohne `mustShow` gibt nichts aus und ändert den Marker nicht.
3. Enthält der Zugtext alle Anker und mindestens 60 % der Zeilen, gibt `turn-end` nichts aus und entfernt `mustShow`.
4. Fehlt ein Anker, gibt `turn-end` `decision:"block"` mit fehlender Zeile und dem gemerkten Text aus und zählt `attempts` hoch. Nach dem zweiten Block endet der dritte Aufruf ohne Block und ohne `mustShow`.
5. Steht der Text nur in einer früheren Assistenten-Nachricht des Zugs (mit Tool-Calls danach), blockiert `turn-end` nicht.
6. Steht der Text nur in `last_assistant_message`, nicht im Transcript, blockiert `turn-end` nicht.
7. `release` nach `show` löscht `mustShow` nicht, entfernt aber `protected` und `paused`; `decidePreTool` blockiert danach nichts mehr.
8. Ein Fehler beim Lesen von Transcript oder Datei führt zu stderr-Meldung, Exit 0 und keiner Blockade.
9. `show` und `pause --show` leiten die Anker aus der Datei ab; eine Datei ohne Anker wird abgewiesen, ohne den Marker zu ändern.
10. `flow.md`, `loop.md` und die Followup-Texte enthalten den Vorrang-Satz; `flow.md` und die Followup-Texte enthalten die `show`- bzw. `pause --show`-Schritte an den beschriebenen Stellen.
11. `report` schreibt `<W>/abschluss/bericht.md` mit dem Text nach `=== BERICHT ===`.
12. Alle bisherigen Tests laufen weiter grün; der Orchestrator liest weiterhin keine geschützten Dateien.

## 6. Tests

| Test | Inhalt |
|---|---|
| `tests/guard-orchestrator.test.js` | `show`, `pause --show`, `release` mit `mustShow`, `turn-end` für Kriterien 2–9 |
| `tests/hooks.test.js` (neu) | `hooks.json` enthält `Stop` mit `turn-end`, `SessionEnd`/`SubagentStop` unverändert |
| `tests/lib/` (Zugtext aus Transcript) | Transcript-Fixtures: Text vor Tool-Call, `tool_result`-Einträge, Harness-Hinweise, letzter Nutzer-Prompt als Grenze |
| `tests/review-flow-doc.test.js` | Vorrang-Satz und `show`-Schritte in `flow.md` |
| `tests/review-flow-report.test.js` | `bericht.md` wird geschrieben |
| `tests/review-followup-skill.test.js` | `show`-Schritt und Vorrang-Satz im Followup |

## 7. Risiken

- Das Transcript-Format ist nicht dokumentiert. Das Lesen schlägt offen fehl (4.3 Punkt 5); der Rückfall `last_assistant_message` bleibt.
- Ein Modell kann Inhalt kürzen, die Anker aber nicht weglassen; die 60-%-Grenze begrenzt das grob. Wörtliche Gleichheit wird bewusst nicht verlangt.
- Mehr als zwei Nachforderungen gibt es nie; danach läuft der Zug ohne Garantie weiter.
