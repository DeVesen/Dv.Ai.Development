# ADO über az CLI — Pull Requests

Lesen jederzeit. **Jedes Schreiben** (anlegen, ändern, Reviewer, Work-Item-Link, Kommentar,
Thread-Status) nur nach ausdrücklicher Bestätigung im aktuellen Turn — Ablauf wie in
`az-cli-write.md` „Pflicht-Ablauf je Schreib-Call“: Ist-Stand lesen, Ist → Soll vorlegen,
auf echtes Ja warten, ein Call, Ergebnis erneut lesen.

`<ORG>`, `<PROJECT>`, `<REPO>`, `<PR_TARGET>` = `organization`, `project`, `repository`,
`prTargetBranch` aus `node "<PLUGIN>/scripts/ado-setup.js" show`, als Literal.
Encoding-Regel `az-cli-operations.md` §0 gilt für jede Antwort (`-o json` → Datei → `iconv`
→ `Read`).

**Regeln:**

- Ziel-Branch ist **immer** `<PR_TARGET>` aus `ado.json`, nie `main` oder `master` annehmen.
  Nennt der Nutzer einen anderen Ziel-Branch, gilt seiner.
- **Keine KI-Signatur** in Titel, Beschreibung oder Kommentar (kein „Generated with …“, kein
  Co-Author-Hinweis).
- PR-Beschreibung und PR-Kommentare rendern **Markdown** (anders als Work-Item-Diskussion und
  -Felder, die HTML sind).
- PR abschließen (`--status completed`) oder verwerfen (`--status abandoned`) nur, wenn der
  Nutzer genau das verlangt, und nach Bestätigung.

---

## Lesen

```bash
# offene PRs des Repos
az repos pr list --org "<ORG>" --project "<PROJECT>" --repository "<REPO>" --status active -o json > "<scratchpad>/prs.raw.json"

# eigene PRs / PRs eines Branches
az repos pr list --org "<ORG>" --project "<PROJECT>" --repository "<REPO>" --creator "<user@domain>" -o json
az repos pr list --org "<ORG>" --project "<PROJECT>" --repository "<REPO>" --source-branch "<branch>" -o json

# ein PR
az repos pr show --id <PR> --org "<ORG>" -o json > "<scratchpad>/pr<PR>.raw.json"

# Reviewer, verknüpfte Work Items
az repos pr reviewer list --id <PR> --org "<ORG>" -o json
az repos pr work-item list --id <PR> --org "<ORG>" -o json

# Kommentar-Threads
az devops invoke --area git --resource pullRequestThreads \
  --route-parameters project="<PROJECT>" repositoryId="<REPO>" pullRequestId=<PR> \
  --org "<ORG>" --api-version 7.1 -o json > "<scratchpad>/pr<PR>.threads.raw.json"
```

Threads: `value[].id`, `value[].status` (`active`, `fixed`, `wontFix`, `closed`, `byDesign`,
`pending`), `value[].threadContext.filePath` und `rightFileStart.line` für Code-Kommentare,
`value[].comments[].content` und `author.displayName`. Systemkommentare
(`comments[].commentType == "system"`) beim Zusammenfassen weglassen.

---

## Anlegen

1. Quell-Branch ermitteln (`git branch --show-current`) und prüfen, dass er gepusht ist
   (`git ls-remote --heads origin <branch>`). Nicht gepusht: dem Nutzer sagen, nicht selbst pushen.
2. Verknüpftes Work Item erfragen, wenn keines genannt ist, und einmal lesen (Titel zeigen).
3. Vorlegen: Quelle → `<PR_TARGET>`, Titel, Beschreibung im vollen Wortlaut, Work Item,
   Reviewer, Draft ja/nein. Auf Bestätigung warten.
4. Ausführen:

   ```bash
   az repos pr create --org "<ORG>" --project "<PROJECT>" --repository "<REPO>" \
     --source-branch "<branch>" --target-branch "<PR_TARGET>" \
     --title "<Titel>" --description "<Markdown, eine Zeile je Argument oder mit \n>" \
     --work-items <WI-ID> [--reviewers "<user@domain>"] [--draft true] \
     -o json > "<scratchpad>/pr.raw.json"
   ```

5. Ergebnis lesen und PR-ID, URL (`https://dev.azure.com/<org>/<project>/_git/<repo>/pullrequest/<id>`),
   Ziel-Branch und Work Item nennen.

## Ändern

```bash
az repos pr update --id <PR> --org "<ORG>" --title "<Titel>" -o json
az repos pr update --id <PR> --org "<ORG>" --description "<Markdown>" -o json
az repos pr update --id <PR> --org "<ORG>" --draft false -o json          # veröffentlichen
az repos pr update --id <PR> --org "<ORG>" --status completed -o json     # nur auf ausdrücklichen Wunsch
az repos pr work-item add --id <PR> --work-items <WI-ID> --org "<ORG>" -o json
```

## Reviewer

```bash
az repos pr reviewer add --id <PR> --reviewers "<user@domain>" --org "<ORG>" -o json
az repos pr reviewer remove --id <PR> --reviewers "<user@domain>" --org "<ORG>" -o json
```

Mail-Adresse verwenden, nicht den Anzeigenamen.

## Kommentar-Threads

Body als UTF-8-JSON-Datei im Scratchpad schreiben (`Write`), dann per `--in-file` senden.

**Neuer Thread** (allgemein; für eine Codezeile zusätzlich `threadContext`):

```json
{
  "comments": [{ "parentCommentId": 0, "content": "<Markdown>", "commentType": 1 }],
  "status": 1,
  "threadContext": { "filePath": "/src/datei.ts", "rightFileStart": { "line": 42, "offset": 1 }, "rightFileEnd": { "line": 42, "offset": 1 } }
}
```

```bash
az devops invoke --area git --resource pullRequestThreads --http-method POST \
  --route-parameters project="<PROJECT>" repositoryId="<REPO>" pullRequestId=<PR> \
  --in-file "<scratchpad>/thread.json" --org "<ORG>" --api-version 7.1 -o json
```

**Antwort in bestehendem Thread** — Body `{ "parentCommentId": 1, "content": "<Markdown>", "commentType": 1 }`:

```bash
az devops invoke --area git --resource pullRequestThreadComments --http-method POST \
  --route-parameters project="<PROJECT>" repositoryId="<REPO>" pullRequestId=<PR> threadId=<THREAD> \
  --in-file "<scratchpad>/reply.json" --org "<ORG>" --api-version 7.1 -o json
```

**Thread-Status setzen** — Body `{ "status": "fixed" }` (oder `active`, `wontFix`, `closed`):

```bash
az devops invoke --area git --resource pullRequestThreads --http-method PATCH \
  --route-parameters project="<PROJECT>" repositoryId="<REPO>" pullRequestId=<PR> threadId=<THREAD> \
  --in-file "<scratchpad>/status.json" --org "<ORG>" --api-version 7.1 -o json
```

## Andere REST-Endpunkte

Für Endpunkte ohne eigenes Kommando `az devops invoke --area <area> --resource <resource>`.
Bekannte Werte listet `az devops invoke --org "<ORG>" -o json` ohne weitere Argumente (groß,
in Datei umleiten). Schreibende Methoden (`POST`, `PATCH`, `PUT`) folgen dem
Bestätigungs-Ablauf; `DELETE` auf Work Items ist verboten.

## Fehlerbilder

| Symptom | Ursache / Reaktion |
|---------|-------------------|
| `TF401179` PR existiert bereits | offenen PR für den Branch lesen und zeigen, keinen zweiten anlegen |
| `TF401398` Branch nicht gefunden | Quell-Branch nicht gepusht → Nutzer informieren |
| `could not be found` bei Reviewer | Mail falsch oder Nutzer nicht im Projekt |
| 401 / `AADSTS` | **stoppen**, Login-Befehl nennen (`ado-setup.js login-command`) |
| Hook-Meldung „Azure-DevOps-Aufruf blockiert“ | Grund aus der Meldung befolgen, nicht umgehen |
