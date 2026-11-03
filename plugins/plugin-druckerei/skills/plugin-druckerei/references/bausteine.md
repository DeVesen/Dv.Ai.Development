# Die Bausteine eines Plugin-Projekts

Jeder Baustein steht genau einmal in `src/`. Die Druckerei setzt daraus das Plugin in `dist/<ordner>/` zusammen. Die Vorlage zu jedem Baustein liefert `druckerei vorlage <art>`; das Schema prüft beim Druck jedes Pflichtfeld.

## Überblick: was wohin führt

| Baustein | liegt in | wird im Plugin zu | Vorlage |
|---|---|---|---|
| Projekt | `druckerei.yaml` | Name und Besitzer des Marketplace in `dist/.claude-plugin/marketplace.json` | (druckerei neu) |
| Bestellschein | `src/plugins/<plugin>.yaml` | `.claude-plugin/plugin.json`, `hooks/hooks.json`, Auswahl der Bausteine | `plugin` |
| Wörterbuch | `src/glossary.yaml` | nichts Eigenes; jeder Text wird gegen verbotene Wörter geprüft | `begriff` |
| Regel | `src/rules/*.yaml` oder `rules:` im Bestellschein | eine Zeile mit Warum in jedem Skill, der sie nennt; bei `enforce: hook` zusätzlich ein Sensor | `regel` |
| Regeldatei | `src/<plugin>/rules/*.yaml` | eine geteilte Datei `shared/…md` mit nummerierten Regeln | `regeldatei` |
| Etappe (Modell) | `src/phases/*.yaml` | ein Skill; bei einem Review zusätzlich ein Agent; bei Gate-Regeln ein Gate-Skript | `etappe` |
| Etappen-Kette | `src/<plugin>/etappen.yaml` | nichts Eigenes; prüft, dass die Kette zu den Skills passt | `etappen` |
| Artefakt | `src/artifacts.yaml` | Eingang und Ergebnis einer Etappe, Ziel der Gate-Prüfung | (siehe Etappe) |
| Textbaustein | `src/<plugin>/partials/*.md` | wortgleicher Text an jeder Stelle mit `<<= partial('name') >>` | `partial` |
| Skill | `src/<plugin>/skills/<name>/SKILL.md` | `skills/<name>/SKILL.md` | `skill` |
| Beiblatt | `src/<plugin>/skills/<name>/references/*.md` | `skills/<name>/references/…` | `referenz` |
| Agent | `src/<plugin>/agents/<name>.md` | `agents/<name>.md` | `agent` |
| Befehl | `src/<plugin>/commands/<name>.md` | `commands/<name>.md` | `befehl` |
| Geteilte Datei | `src/<plugin>/shared/**.md` | `shared/…`, zur Laufzeit von Skills gelesen | `geteilt` |
| Hook | `hooks:` im Bestellschein | Eintrag in `hooks/hooks.json` | `hook` |
| Asset | `src/<plugin>/assets/…` | unverändert kopiert (Skripte, Tests, `bin/`) | (Datei ablegen) |
| Änderungsprotokoll | `src/<plugin>/CHANGES.yaml` | nichts; erlaubt Abweichungen vom Bestand | `aenderung` |
| Vorlagen-Layout | `src/templates/*.j2` | Gestalt gedruckter Skills im Etappen-Modell | (selten nötig) |

## Projekt (`druckerei.yaml`)
Markiert den Ordner als Projekt. Felder: `marketplace` (Name des Test-Marketplace in `dist/`), `owner`, `beschreibung`, optional `ausgabe` (Standard `dist`). Alle Befehle suchen diese Datei ab dem aktuellen Ordner aufwärts.

## Bestellschein (`src/plugins/<plugin>.yaml`)
Sagt, welches Plugin gedruckt wird. Pflicht: `name`, `dir`, `version`, `description`, `source`. Wichtig sind außerdem:
- `author`: ohne ihn besteht `claude plugin validate --strict` nicht.
- `lint`: `streng` (Standard) oder `bestand` (frisch übernommen; Stilfragen nur als Warnung).
- `verweis_praefix`: Präfix der Verweise `<präfix>:<skill>`; Standard ist der Name.
- `intern_zusatz`: Satz, der an die description jedes Skills mit `role: intern` gehängt wird.
- `assets`: `{from, to}` je Ordner; `to: "."` spiegelt den Ordner ins Plugin.
- `hooks`: Ereignis → Einträge mit `matcher` und `commands`.
- Bei einer Übernahme `equivalent_to` (Bestand) und `changelog`.

Ein Bestellschein mit `emit:` statt `source:` beschreibt ein Plugin im **Etappen-Modell**: Es wird aus Etappen und Regeln komponiert statt aus fertigen Skills.

## Wörterbuch (`src/glossary.yaml`)
Ein Begriff, eine Definition. `avoid` listet Wörter, die nirgends stehen dürfen; der Druck meldet jede Stelle. `avoid_context` dokumentiert Wörter, deren Verbot vom Satz abhängt. Im Etappen-Modell muss jeder Fachbegriff, der als `[[Begriff]]` markiert ist, hier stehen.

## Regel
Eine prüfbare Aussage mit Nummer (`R-` und drei Ziffern, im Projekt eindeutig), `text`, `why`, `enforce` und `source`.
- `enforce: text`: Die Regel steht nur im Text.
- `enforce: script`: Ein Skript prüft sie; `enforced_by` nennt das Asset.
- `enforce: hook`: Ein Sensor erzwingt sie; im Etappen-Modell druckt die Druckerei dafür ein Gate-Skript.

Regeln im Kern (`src/rules/`) gelten für jede Etappe, die sie in `rules:` nennt. Regeln im Bestellschein gelten nur für dieses Plugin und brauchen `applies_to`.

## Regeldatei (`src/<plugin>/rules/*.yaml`)
Für Plugins aus Komponenten: Abschnitte mit nummerierten Regeln oder einer Tabelle, daraus entsteht eine geteilte Markdown-Datei (`doc: shared/…`). Das `why` jeder Regel steht nur in der Quelle, nicht im gedruckten Text.

## Etappe (`src/phases/<id>.yaml`, Etappen-Modell)
Ein Schritt mit `after` (Vorgänger, keine Kreise), `inputs`, `outputs`, `gate` (Artefakt plus Kriterium), `rules`, `required` (Pflichtschritte des Skills), `examples` (nur auf dem Beiblatt). Eine Etappe mit `review:` erzeugt zusätzlich einen Agent mit nur lesenden Werkzeugen und eine Kategorien-Tabelle.

## Etappen-Kette (`src/<plugin>/etappen.yaml`)
Welche Skills ein Leit-Skill (`gestartet_von`) in welcher Folge startet, mit Modell, Pflichtwerten, Folge (`weiter`) und Haltepunkten. Der Druck prüft, dass jeder Skill existiert und jede Folge-Etappe und jeder Haltepunkt bekannt ist. Mit `etappen_abgleich: session-chain` im Bestellschein gleicht er die Kette zusätzlich mit dem Code der Session-Kette ab.

## Textbaustein (`partials/*.md`)
Wortgleicher Text, der an mehreren Stellen stehen muss (Ausgabeformat, Kategorien-Liste, Hinweisabsatz). Einsetzen mit `<<= partial('name') >>`. Ein Kommentar `<# … #>` am Ende nennt, wo er steht. Ein Baustein ist **keine** Regel: Hat der Text eine prüfbare Aussage mit Begründung, ist er eine Regel.

## Skill
Deckblatt oben in der Quelle, darunter der Text:
- `role`: `startbefehl` (Einstieg des Menschen), `intern` (nur über andere Skills) oder `werkzeug` (frei).
- `model_invocation`: `allowed` (Claude zieht den Skill selbst, wenn die description passt) oder `disabled` (nur der Mensch tippt ihn).
- `frontmatter`: Kopf der fertigen SKILL.md mit `name` (= Ordnername, höchstens 64 Zeichen, ohne claude/anthropic) und `description` (dritte Person, mit „Use when …“, höchstens 1024 Zeichen).

Unter 500 Zeilen. Pflichttext gehört in den Skill, Beispiele aufs Beiblatt.

## Beiblatt
`skills/<name>/references/<datei>.md`, `kind: reference`. Wird nur bei Bedarf gelesen und verweist auf keine weiteren Beiblätter (eine Ebene).

## Agent
`agents/<name>.md`, `kind: agent`, freiwillig `type` und `stage`. Im Kopf `name`, `description` (mit „Use when“), `model` und möglichst `tools`. Ein Prüfer bekommt kein Edit; ohne `tools` erbt er alle Werkzeuge, und der Druck warnt.

## Befehl, geteilte Datei, Dokument
- **Befehl** (`commands/<name>.md`): Kurzwahl für den Menschen.
- **Geteilte Datei** (`shared/…`): wird von mehreren Skills zur Laufzeit gelesen. Gilt der Text nur beim Drucken, ist ein Textbaustein besser.
- **Dokument** (`kind: doc`): jede andere Markdown-Datei, etwa Vorlagen unter `skills/<name>/templates/`.

## Hook
Ein Sensor: bei einem Ereignis (`PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, …) startet ein Skript. Kurzform `skript.js arg` (node aus `scripts/`) oder Rohform `{command: …, timeout: …}`. Exit 2 blockiert und zeigt die Meldung. Das Skript liegt als Asset unter `scripts/`. Erzwingt der Hook eine Regel, bekommt die Regel `enforce: hook` und `enforced_by: scripts/<skript>`.

## Asset
Code, Tests und Golden-Sets. Sie werden nicht geprüft, nur kopiert, und behalten ihre Ausführrechte. Liegen unter `assets/` Tests (`tests/*.test.js` oder `tests/test_*.py`), laufen sie beim Try-Deploy gegen das gedruckte Plugin.

## Änderungsprotokoll mit Siegel (`CHANGES.yaml`)
Nur bei Plugins mit `equivalent_to`. Jede Datei, die vom Bestand abweicht, steht unter einer Befund-Nummer; eine unerklärte Abweichung stoppt den Druck. Unter `stand:` hält die Druckerei je Datei einen Fingerabdruck des abgenommenen Stands. Eine weitere Änderung bricht das Siegel, bis `druckerei abnehmen` den neuen Stand bewusst übernimmt.

## Wie alles zusammenhängt
- Der **Bestellschein** wählt aus, was gedruckt wird.
- Eine **Regel** ist die kleinste Einheit mit Begründung. Skills und Etappen verweisen auf sie; ihr `enforce` entscheidet, ob zusätzlich ein Sensor entsteht.
- Ein **Textbaustein** ist Text ohne eigene Begründung, der an mehreren Stellen gleich bleiben muss.
- **Skill**, **Agent**, **Befehl** und **geteilte Datei** sind die fertigen Teile. Ihr **Deckblatt** sagt, wer sie aufruft und was sie dürfen.
- **Etappen** und **Etappen-Kette** legen die Reihenfolge fest, in der Skills einander aufrufen.
- Das **Wörterbuch** hält die Begriffe sauber, das **Änderungsprotokoll** die Abweichungen vom Bestand.
