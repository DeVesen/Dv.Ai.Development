---
name: ado-cli
description: >
  Use for every Azure DevOps action through the Azure CLI (`az` + `azure-devops`): reading or
  querying work items by ID, URL or WIQL (with discussion and every embedded image described
  inline), pull requests (list, show, create against the project's PR target branch with a
  linked work item, update, reviewers, comment threads), `az devops invoke` for REST endpoints
  without a command, and setting up Azure DevOps for a project ("ADO einrichten", missing
  .claude/ado.json). Writes — discussion comment, State, Assigned-To, relations, new work
  item, any PR change — only after the user confirmed it. Uses the project's own identity
  from .claude/ado.json; never logs in, never switches accounts, never deletes a work item.
---

`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`. `<SETUP>` = `node "<PLUGIN>/scripts/ado-setup.js"`.

## Was dieser Skill tut — und was nicht

**Zweck:** Einziger Weg zu Azure DevOps. Work Items vollständig in den **aktuellen Kontext**
lesen, Pull Requests lesen und bearbeiten, eng begrenzt Work Items ändern und anlegen — immer
mit der Identität **dieses Projekts**.

**Erlaubte Schreib-Operationen:**

| Operation | `az`-Argument | Referenz |
|------|---------------|---|
| Diskussions-Kommentar | `--discussion` | `az-cli-write.md` |
| State | `--state` | `az-cli-write.md` |
| Assigned To | `--assigned-to` | `az-cli-write.md` |
| Anlegen (neues Work Item) | `work-item create` — Titel, Typ, Description (nur Kontext-Body), Acceptance-Criteria-Feld (nur AK-Punkte, via `--fields`), **Feature-Nummer erfragen** | `az-cli-write.md` |
| Relation setzen/entfernen | `relation add\|remove` | `az-cli-write.md` |
| Pull Request anlegen, ändern, Reviewer, Work-Item-Link, Kommentar-Thread | `az repos pr …`, `az devops invoke` | `az-cli-pullrequests.md` |

Jede davon **nur nach ausdrücklicher Bestätigung des Nutzers** im aktuellen Turn — Referenz
**vor dem ersten Schreib-Call lesen.**

**Verboten — ausnahmslos, auch auf Zuruf:**

- **Anmelden oder Konto wechseln:** `az login`, `az logout`, `az account set`,
  `az account clear`, das Login-Skript `ado-login` ausführen. Den Login macht der Nutzer.
- **`AZURE_CONFIG_DIR` setzen, überschreiben oder entfernen** — in keiner Shell, in keiner Form.
- **Work Item löschen.** `az boards work-item delete` wird **nie** ausgeführt, auch nicht mit
  `--yes`, auch nicht wenn der Nutzer es verlangt. Löschen macht er selbst im Browser.
- **Andere Felder eines bestehenden Work Items** als Diskussion/State/Assigned-To/Relation —
  kein `--title`, `--description`, `--area`, `--iteration`, `--reason`, kein `--fields` an
  einem **bereits angelegten** Item. (Beim **Anlegen** eines neuen Items sind Titel, Typ und
  Description notwendiger Bestandteil — dort erlaubt, siehe `az-cli-write.md`.)
- **Keine Datei-Ausgabe.** Kein `docs/ado/<id>.md`, kein Sprint-Plan, kein sonstiges
  Artefakt. Auch **nicht anbieten**. Das Ergebnis ist die Antwort im Chat.
  Ausnahme: Rohdaten, Bilder und Request-Bodies liegen temporär im Scratchpad.
- **Keine KI-Signatur** in Work Items, Kommentaren, PR-Titeln oder -Beschreibungen.

Ein PreToolUse-Hook des Plugins setzt die Anmelde- und `AZURE_CONFIG_DIR`-Verbote, die Pflicht
zu `.claude/ado.json` und die Org aus `ado.json` technisch durch. Blockiert er: Grund aus der
Meldung befolgen, nie umgehen.

## Vor der ersten Aktion einer Session

1. **Projektwerte lesen:** `<SETUP> show`. Exit 1 (keine oder ungültige `.claude/ado.json`):
   **keine** Azure-DevOps-Aktion, stattdessen Einrichtung anbieten → `references/setup.md`.
2. **Identität prüfen:** `<SETUP> check-identity` (vergleicht
   `az account show --query "{user:user.name,tenant:tenantId}"` mit `ado.json`). Exit 1, kein
   Login, fremder User oder Tenant: **stoppen**, dem Nutzer die Meldung und den Login-Befehl
   daraus nennen, nichts weiter versuchen — keine Varianten, kein `az login`.
3. Ab dann gilt: `<ORG>` = `organization`, `<PROJECT>` = `project`, `<REPO>` = `repository`,
   `<PR_TARGET>` = `prTargetBranch` aus `show`. **Als Literal** in jeden Befehl einsetzen,
   alle Befehle mit `--org "<ORG>"` und, wo nötig, `--project "<PROJECT>"`.

Tritt später 401, `AADSTS` oder „Please run 'az login'“ auf: wie Schritt 2 — stoppen,
Login-Befehl nennen (`<SETUP> login-command`).

## Sicherheit

`<Haupt-Checkout>/.claude/azure/` ist der Config-Ordner dieses Projekts (`AZURE_CONFIG_DIR`)
und enthält Zugangstokens. Nie lesen, ausgeben, kopieren, indexieren (graphify,
codebase-analyzer), in Review-Pakete aufnehmen oder committen. Zugriffstokens aus
`az account get-access-token` nur in Variablen halten, nie ausgeben.

## Quick-Routing

| Aufgabe | Kommando / Referenz |
|---------|--------------------|
| Azure DevOps einrichten / `ado.json` fehlt | `references/setup.md` |
| Work Item per ID lesen | `references/op-read-workitem.md` (Gesamtablauf) |
| Work Item per URL lesen | ID = letztes URL-Segment, dann wie oben |
| Mehrere Work Items lesen | Kein Batch — pro ID einzeln, Ablauf je ID |
| Nur die Diskussion lesen | `az-cli-operations.md` §2 |
| Bilder prüfen & beschreiben | `az-cli-operations.md` §3 — **Pflicht**, nicht optional |
| WIQL-Query / Sprint-Inhalt auflisten | `az-cli-operations.md` §4 |
| Kommentar posten / State / Assigned To setzen | `az-cli-write.md` — erst bestätigen lassen |
| Work Item anlegen | `az-cli-write.md` — Titel/Typ/Description **und Feature-Nummer** erfragen, dann bestätigen lassen |
| Relation setzen/entfernen | `az-cli-write.md` — erst bestätigen lassen |
| Pull Requests lesen, Threads lesen | `az-cli-pullrequests.md` |
| Pull Request anlegen/ändern, Reviewer, Kommentar | `az-cli-pullrequests.md` — erst bestätigen lassen; Ziel = `<PR_TARGET>` |
| REST-Endpunkt ohne eigenes Kommando | `az devops invoke` — `az-cli-pullrequests.md` „Andere REST-Endpunkte“ |
| Work Item löschen | **Nicht ausführen** — Nutzer macht das im Browser |

---

## Bilder — Pflichtverhalten

Steht in **Description, Acceptance Criteria oder Diskussion** ein Bild, wird es **immer**
geladen, angesehen und beschrieben. Erkennung **ausschließlich** über `<img src=…>` im
HTML-Text — Inline-Bilder stehen **nicht** in `relations[]` als `AttachedFile`, wer dort
prüft übersieht sie alle. Die Beschreibung ersetzt das `<img>`-Tag **an genau der Stelle im
Text, an der es stand** — nicht am Ende, nicht in einem Sammelabschnitt:

```
… bisheriger Text vor dem Bild.

[Bild: Screenshot der Parametertabelle. Spalten „Name", „Wert", „Einheit";
die Zeile „Laserleistung" ist rot umrandet, daneben handschriftlich „muss
editierbar sein". Zeigt, welches Feld die Anforderung meint.]

Text nach dem Bild …
```

Beschreibung muss den **fachlichen Inhalt** tragen: was ist zu sehen, welche UI-Elemente und
Beschriftungen, welche Markierungen/Pfeile/Kommentare, und welche Anforderung das Bild
transportiert. Ein „(Screenshot)" reicht nicht — Bilder tragen oft die eigentliche Anforderung.

Lädt ein Bild nicht (403/404, kein Attachment-GUID, externe Quelle): an der Stelle
`[Bild konnte nicht geladen werden: <URL>]` schreiben und den Nutzer am Ende explizit
bitten, es nachzureichen. **Nie stillschweigend auslassen.**

---

## Encoding — Pflichtwissen

`az` gibt seine Ausgabe in **cp1252** aus, nicht UTF-8 (verifiziert 2026-08-17). Umlaute
kommen sonst als `�` an. Immer `-o json`, in Datei umleiten, konvertieren, dann lesen und
parsen:

```bash
az boards work-item show --id <ID> --org "<ORG>" -o json > "<scratchpad>/wi.raw.json"
iconv -f cp1252 -t utf-8 "<scratchpad>/wi.raw.json" > "<scratchpad>/wi.json"
```

Danach `<scratchpad>/wi.json` mit `Read` öffnen. Details: §0 in `references/az-cli-operations.md`.

**Formate:** Work-Item-Diskussion, Description und Acceptance Criteria sind **HTML**, nicht
Markdown. PR-Beschreibungen und PR-Kommentare sind Markdown.

---

## Grenzen

- **Kein Batch-Read.** Mehrere IDs = mehrere Calls (dürfen parallel laufen).
- `az boards query` unterstützt **nur flache Queries** — keine `WorkItemLinks`-Hierarchien;
  Parent/Child über `System.Parent` bzw. `relations` auflösen.
- Schreibzugriff nur wie in der Tabelle oben, je nach Bestätigung. **Löschen** bleibt
  ausnahmslos Sache des Nutzers im Browser; ebenso jede Titel-/Description-/Area-/Iteration-
  Änderung an einem **bereits angelegten** Work Item.

---

## Referenzen (on-demand)

| Bedarf | Datei |
|--------|-------|
| Einrichtung pro Projekt, Login, Migration | `references/setup.md` |
| Gesamtablauf „Work Item lesen und aufbereiten" | `references/op-read-workitem.md` |
| az-Kommandos im Detail (Encoding, Read, Comments, Bilder, WIQL) | `references/az-cli-operations.md` |
| Schreiben an Work Items: Bestätigungs-Ablauf, erlaubte Felder | `references/az-cli-write.md` |
| Pull Requests, Threads, `az devops invoke` | `references/az-cli-pullrequests.md` |
