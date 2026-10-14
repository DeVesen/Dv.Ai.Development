# ADO über az CLI — Schreiben (eng begrenzt)

Drei Felder eines **bestehenden** Work Items dürfen geändert werden, dazu Relationen setzen/
entfernen und ein **neues** Work Item anlegen. Alles andere ist Sache des Nutzers im Browser.

| Erlaubt | `az`-Argument |
|---------|---------------|
| Diskussions-Kommentar anhängen | `--discussion` |
| State setzen | `--state` |
| Assigned To setzen | `--assigned-to` |
| Work Item anlegen | `work-item create` (Titel/Typ/Description/Acceptance-Criteria-Feld) + `relation add` (Parent-Feature) |
| Relation setzen | `relation add` |
| Relation entfernen | `relation remove` |

## Absolut verboten

- **`az boards work-item delete` — nie ausführen.** Auch nicht mit `--yes`, auch nicht auf
  ausdrückliche Aufforderung des Nutzers. Antwort in dem Fall: Löschen macht dieser Skill
  nicht, der Nutzer löscht im Browser. Kein Workaround über `--fields`, kein `state=Removed`
  als Ersatz-Löschung, es sei denn der Nutzer verlangt genau diesen State bewusst.
- Jedes andere Feld an einem **bereits angelegten** Item: `--area`, `--iteration`,
  `--reason`, `--fields`, `--open`, oder nachträgliches Ändern von `--title`/`--description`.
  Nicht setzen, auch nicht „nebenbei mit". (Beim **Anlegen** eines neuen Items sind Titel,
  Typ, Description und das Acceptance-Criteria-Feld dagegen notwendig — siehe unten.)

Verlangt der Nutzer eine verbotene Änderung: einmal klar sagen, dass der Skill das nicht
macht, und wo er es selbst tut. Nicht diskutieren, nicht nach Alternativen für dasselbe
Ergebnis suchen.

## Pflicht-Ablauf je Schreib-Call

1. **Work Item lesen** (`az-cli-operations.md` §1) — Titel, aktueller State, aktueller
   Assigned-To. Ohne diesen Ist-Stand wird nicht geschrieben.
2. **Änderung vorlegen und bestätigen lassen**, im aktuellen Turn, mit Ist → Soll:

   ```
   Work Item 291858 „Ergebniserfassung überarbeiten"
   State: Active → Resolved
   Bestätigen?
   ```

   Beim Kommentar den **vollen Text** zeigen, den er posten wird — nicht paraphrasiert.
3. **Auf ein echtes Ja warten.** Keine Vorab-Ausführung, kein „ich mache es und du sagst
   Bescheid falls falsch". Eine Bestätigung gilt für **genau diesen einen Call** — nicht für
   weitere Work Items, nicht für einen zweiten Versuch mit anderem Wert.
4. **Ausführen**, ein Call pro Feld-Änderung.
5. **Ergebnis prüfen** — Work Item erneut lesen und den neuen Wert nennen. Bei Fehler den
   Fehler zeigen, nicht mit Varianten weiterprobieren.

## Kommandos

Encoding wie beim Lesen: `az` schreibt die JSON-Antwort in **cp1252**. Antwort in Datei
umleiten und konvertieren, wenn sie ausgewertet wird (`az-cli-operations.md` §0).

```bash
ORG="https://dev.azure.com/TrumpfCorp"
```

**Kommentar in die Diskussion posten:**

```bash
az boards work-item update --id <ID> --org "$ORG" --discussion "<Text>" -o json > "<scratchpad>/wr.raw.json"
```

Der Text landet als Diskussions-Eintrag unter dem angemeldeten `az`-Account. Er ist in ADO
**nicht durch dieses Skill löschbar** — deshalb Text vorher bestätigen lassen.

**Formatierung: echtes HTML, kein Markdown** (verifiziert 2026-09-18 an #306439, per direktem
CLI-Test). Das Diskussionsfeld ist tatsächlich HTML (`"format": "html"` in der JSON-Antwort
stimmt) — `--discussion` übergibt den String unverändert, `<`/`>` werden **nicht** escaped.
Getestet: `<div><b>Test Fett</b></div><div><ul><li>Punkt A</li></ul></div>` kam 1:1 an und
rendert im Browser als fette Überschrift plus echte Bullet-Liste.

Markdown-Syntax (`**fett**`, `- Liste`) wird dagegen **nicht** interpretiert — bleibt als
literale Sternchen/Bindestriche stehen, obwohl das Eingabefeld im ADO-UI mit „We support
markdown." wirbt. Dieser Hinweis bezieht sich auf manuelles Tippen im UI, nicht auf den
API-Weg über `--discussion` (nie direkt verglichen — falls doch relevant, erneut verifizieren).

Für Kommentare mit Struktur (Überschriften, Listen) also **HTML-Tags** im `--discussion`-Text
verwenden: `<div>`, `<b>`, `<ul><li>…</li></ul>`, `<br>` für Leerzeilen zwischen Blöcken.

**State setzen:**

```bash
az boards work-item update --id <ID> --org "$ORG" --state "<State>" -o json > "<scratchpad>/wr.raw.json"
```

State-Namen sind prozess-abhängig — **nie raten**. Den Zielwert nennt der Nutzer, oder er
wird aus dem gelesenen Work Item bzw. einem Nachbar-Work-Item derselben Art übernommen.
Ein ungültiger Wert schlägt mit einer Rule-Validation-Fehlermeldung fehl.

**Assigned To setzen:**

```bash
az boards work-item update --id <ID> --org "$ORG" --assigned-to "<user@domain>" -o json > "<scratchpad>/wr.raw.json"
```

Bevorzugt die **Mail-Adresse** übergeben, nicht den Anzeigenamen — Anzeigenamen sind
mehrdeutig und schlagen bei Namensvarianten fehl. Nutzer nennt die Adresse; nicht aus einem
Anzeigenamen konstruieren.

Zum **Leeren** des Feldes: `--assigned-to ""` (entfernt die Zuweisung). Gilt als Änderung,
also ebenfalls bestätigungspflichtig.

## Work Item anlegen

Zusätzlich zum normalen Pflicht-Ablauf (Ist-Stand lesen — hier: Ziel-Feature statt Ist-Item —
vorlegen, bestätigen, ausführen, Ergebnis prüfen) gilt beim Anlegen:

1. **Feature-Nummer immer erfragen, nie raten.** Ein neues Work Item braucht in diesem
   Projekt ein Eltern-Feature. Ist keine Nummer genannt, explizit danach fragen — nicht
   annehmen, nicht aus dem letzten besprochenen Feature im Chat übernehmen, ohne es zu
   bestätigen.
2. **Ziel-Feature einmal lesen** (`az-cli-operations.md` §1), bevor angelegt wird — Titel
   zeigen, damit der Nutzer sieht, dass die Nummer das richtige Feature trifft.
3. **Titel, Description und Acceptance-Criteria-Inhalt festlegen und direkt anlegen — keine
   Wortlaut-Bestätigung abwarten** (Nutzer-Feedback 2026-09-18: Inhalt wird nicht mehr vorab
   zur Freigabe gezeigt, nur noch das fertige Ergebnis nach dem Anlegen). Das gilt nur für die
   **Formulierung** von Description/Acceptance-Criteria — Feature-Nummer (Schritt 1+2) bleibt
   weiterhin Pflichtfrage, nie raten. Inhalt folgt der `writing-workitem`-Konvention (Kontext +
   Akzeptanzkriterien), falls er aus einer Spec/einem Chat-Entwurf übernommen wird — aber
   **auf zwei ADO-Felder verteilt, nicht in einem Description-Block zusammengefasst:**
   - **Description-Feld:** nur der Kontext-**Body**, ohne die Überschrift "Kontext" (das
     Feld heißt im UI bereits "Description", eine zusätzliche Überschrift ist redundant).
   - **Acceptance-Criteria-Feld** (`Microsoft.VSTS.Common.AcceptanceCriteria`, via `--fields`):
     nur die AK-Punkte als `<ul><li>…</li></ul>`, ohne die Überschrift "Akzeptanzkriterien"
     (aus demselben Grund — das Feld heißt bereits "Acceptance Criteria").
4. **Anlegen ausführen:**

   ```bash
   az boards work-item create --title "<Titel>" --type "<Typ, z. B. 'User Story'>" \
     --org "$ORG" --project "Laser Application Database" \
     --description "<HTML-Text, nur Kontext-Body, keine 'Kontext'-Überschrift>" \
     --fields "Microsoft.VSTS.Common.AcceptanceCriteria=<HTML-Liste, nur <ul><li>…</li></ul>, keine 'Akzeptanzkriterien'-Überschrift>" \
     -o json > "<scratchpad>/wr.raw.json"
   ```

   Description **und** Acceptance Criteria sind Rich-Text-Felder wie die Diskussion —
   **echtes HTML, kein Markdown** (gleiche Regel wie bei `--discussion`, siehe unten) —
   für beide gilt dieselbe HTML-Vorgabe.
5. **Parent-Relation auf das bestätigte Feature setzen** (neue ID aus Schritt 4):

   ```bash
   az boards work-item relation add --id <neue-ID> --relation-type parent \
     --target-id <Feature-ID> --org "$ORG"
   ```
6. **Ergebnis prüfen** — neues Item lesen, Titel/Typ/Description/Acceptance-Criteria/
   Parent-Feature nennen.

## Relation setzen/entfernen

Für Parent/Child/Related an einem **bestehenden** Item, unabhängig vom Anlegen:

```bash
az boards work-item relation add --id <ID> --relation-type <parent|child|related> \
  --target-id <Ziel-ID> --org "$ORG"
az boards work-item relation remove --id <ID> --relation-type <parent|child|related> \
  --target-id <Ziel-ID> --org "$ORG"
```

Ziel-ID vorher einmal lesen und Titel zeigen (wie beim Anlegen) — nie eine Relation auf eine
ungeprüfte Nummer setzen. Ist-Stand (vorhandene Relationen) mit vorlegen, bevor bestätigt wird.

## Fehlerbilder

| Symptom | Ursache |
|---------|---------|
| `TF401320` / Rule-Validation | State im aktuellen Prozess nicht erlaubt, oder Übergang vom Ist-State aus gesperrt |
| `The identity ... could not be found` | `--assigned-to` unbekannt — falsche Mail oder Nutzer nicht im Projekt |
| `TF401232` Work Item not found | falsche ID oder falsche Organisation |
| 401 / `AADSTS` | `az login` abgelaufen |
