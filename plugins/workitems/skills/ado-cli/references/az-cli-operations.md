# ADO über az CLI — Kommando-Katalog (Lesen)

**Diese Datei ist rein lesend.** Schreiben ist auf `--discussion`, `--state` und
`--assigned-to` begrenzt und steht mit Bestätigungs-Ablauf in `az-cli-write.md`.
`create`, `delete` und `relation add|remove` macht dieser Skill nie — das erledigt der
Nutzer im Browser.

**Feste Werte (dieses Projekt):**

```
ORG     = https://dev.azure.com/TrumpfCorp
PROJECT = Laser Application Database
```

**Vorbedingung:** `az extension add --name azure-devops` (einmalig; Signal für fehlende
Extension ist „az boards unbekannt"), gültiger `az login` (`az account show`).

---

## §0 Encoding — vor allem anderen

`az` schreibt **cp1252**, nicht UTF-8 (verifiziert 2026-08-17, az 2.87 / azure-devops 1.0.6).
Direktes Lesen der Ausgabe liefert `zus�tzlich` statt `zusätzlich`.

Auch die *Anzeige* in Terminal/Tool-Output ist unzuverlässig: selbst korrekt konvertierte
Dateien können im Konsolen-Echo weiterhin `�` zeigen. **Nicht** am Konsolen-Echo verifizieren
— immer die konvertierte Datei mit `Read` öffnen.

Was **nicht** hilft (alles verifiziert erfolglos): `PYTHONIOENCODING=utf-8`,
`[Console]::OutputEncoding = UTF8`, PowerShell-Redirect.

Verbindliches Muster für jeden Call:

```bash
az <befehl> ... -o json > "<scratchpad>/ado.raw.json"
iconv -f cp1252 -t utf-8 "<scratchpad>/ado.raw.json" > "<scratchpad>/ado.json"
```

`<scratchpad>` = das Session-Scratchpad-Verzeichnis. Danach `ado.json` mit `Read` lesen.

---

## §1 Work Item lesen

```bash
az boards work-item show --id <ID> --org https://dev.azure.com/TrumpfCorp -o json
```

Relevante Felder im JSON:

| Pfad | Inhalt |
|------|--------|
| `fields."System.Title"` | Titel |
| `fields."System.Description"` | HTML |
| `fields."Microsoft.VSTS.Common.AcceptanceCriteria"` | HTML; **fehlt komplett** wenn leer |
| `fields."System.State"` | Active / Resolved / Closed / … |
| `fields."System.WorkItemType"` | User Story / Bug / Task |
| `fields."System.AreaPath"`, `fields."System.IterationPath"` | |
| `fields."System.Parent"` | Parent-ID |
| `relations` | Parent/Child-Links, `AttachedFile`, Branch-/PR-Links als URL-kodierte `vstfs`-URI — dekodieren, siehe `op-read-workitem.md` Schritt 4 |

**`--fields X` nicht verwenden** — inkompatibel mit dem Default-Expand. Immer Volldump
nehmen und im JSON gezielt lesen.

**ID aus URL:** `https://dev.azure.com/<org>/<project>/_workitems/edit/1234` → `1234`.

**Kein Batch:** mehrere IDs = mehrere Calls (unabhängig, dürfen parallel laufen).

---

## §2 Discussion / Comments lesen

```bash
az devops invoke --area wit --resource comments \
  --route-parameters project="Laser Application Database" workItemId=<ID> \
  --org https://dev.azure.com/TrumpfCorp --api-version 7.1-preview
```

Liefert `comments[].text` (HTML) je Beitrag, plus `createdBy.displayName` und `createdDate`.
Leeres `comments: []` heißt: keine Diskussion — kein Fehler.

---

## §3 Bilder — laden, ansehen, an Ort und Stelle beschreiben

**Pflichtschritt, nicht optional.** `System.Description`, `AcceptanceCriteria` und
Comment-Text sind HTML. Bilder stehen als:

```html
<img src="https://dev.azure.com/TrumpfCorp/<projectGuid>/_apis/wit/attachments/<attachmentGuid>?fileName=image.png">
```

### Ablauf je Bild

1. **Alle `<img src=…>` einsammeln** — aus Description, Acceptance Criteria *und* jedem
   Kommentar. Position im Text merken (welcher Absatz, welcher Listenpunkt, welcher Kommentar).
   **Immer den HTML-Text scannen, nie `relations[]`** — Inline-Bilder erscheinen dort nicht
   als `AttachedFile` (verifiziert 2026-08-17 an #299382: 4 Inline-Bilder, `relations[]`
   enthielt nur Parent und Branch). Wer auf `relations[]` prüft, übersieht sie komplett.
2. **Token holen** — ADO-Resource-ID `499b84ac-1321-427f-aa17-267ca6975798`, **nicht** die
   ARM-Default-Resource:
   ```bash
   TOKEN=$(az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798 --query accessToken -o tsv)
   ```
3. **Herunterladen** (pro Bild, dürfen parallel laufen):
   ```bash
   curl -s -H "Authorization: Bearer $TOKEN" "<attachment-url-aus-dem-html>" -o "<scratchpad>/wi<ID>_img<N>.png"
   ```
4. **Ansehen** — `Read` auf die Datei; das Bild wird inline in den Kontext gerendert
   (verifiziert 2026-08-12 für PNG-Mockups aus Description).
5. **Bildmaße prüfen, wenn der Inhalt angeschnitten wirkt** — sonst lässt sich nicht
   unterscheiden, ob das *Original* beschnitten hochgeladen wurde oder die Darstellung
   abschneidet. PNG-Header lesen:
   ```bash
   python -c "import struct;d=open(r'<pfad>','rb').read(24);print(struct.unpack('>II',d[16:24]))"
   ```
   Läuft der Inhalt bis an die volle Bildbreite, ist das Original beschnitten — das gehört
   dann **in die Beschreibung** („rechts angeschnitten"), weil dem Leser sonst unklar bleibt,
   ob Information fehlt. Angetroffen 2026-08-17 in #299382 (Bild 4, 670×499, Tabelle
   „Process parameters" endet an der Kante).
6. **Beschreiben und einsetzen** — die Beschreibung ersetzt das `<img>`-Tag **an genau der
   Position, an der es im Text stand**. Nicht ans Ende, nicht in einen Sammelabschnitt
   „Anhänge", nicht in eine Fußnote.

### Format der Bildbeschreibung

```
[Bild: <was ist zu sehen> — <UI-Elemente/Beschriftungen/Werte> —
 <Markierungen, Pfeile, handschriftliche Anmerkungen> —
 <welche Anforderung das Bild transportiert>]
```

Beispiel:

```
[Bild: Screenshot des Experiment-Dialogs. Felder „Task", „Setup", „Material";
„Setup" ist ausgegraut. Roter Pfeil zeigt auf „Setup" mit Text „muss
vorausgefüllt sein". Belegt, dass der Bug das Setup-Feld betrifft, nicht Task.]
```

„(Screenshot)" oder „(Bild)" ist **keine** gültige Beschreibung. Bilder tragen in diesem
Projekt häufig die eigentliche Anforderung — Mockups, markierte Screenshots,
Tabellenausschnitte. Werte, Beschriftungen und Fehlermeldungen aus dem Bild wörtlich
übernehmen.

### Wenn ein Bild nicht ladbar ist

403/404, kein Attachment-GUID im HTML extrahierbar, oder Link zeigt außerhalb ADO:
an der Textstelle `[Bild konnte nicht geladen werden: <URL>]` einsetzen **und** am Ende der
Antwort explizit benennen, welches Bild fehlt, mit Bitte um manuelle Nachreichung
(z. B. Screenshot einfügen). Nie stillschweigend auslassen.

---

## §4 WIQL-Query

```bash
az boards query --org https://dev.azure.com/TrumpfCorp --project "Laser Application Database" \
  --wiql "SELECT [System.Id],[System.Title],[System.State] FROM WorkItems WHERE [System.TeamProject]='Laser Application Database' AND [System.WorkItemType]='Bug' AND [System.State]<>'Closed' ORDER BY [System.ChangedDate] DESC" \
  -o json
```

- **Nur flache Queries.** `FROM WorkItemLinks` wird nicht unterstützt — Hierarchien über
  `System.Parent` bzw. `relations` aus §1 auflösen.
- Rückgabe: Array von `{ id, rev, fields{…}, relations, url }` — nur die im `SELECT`
  genannten Felder sind in `fields` gefüllt.
- Statt `--wiql` geht auch `--id <queryId>` oder `--path <queryPath>` für gespeicherte Queries.
- Sprint-Inhalt auflisten: `WHERE [System.IterationPath] UNDER 'Laser Application Database\\Sprint <n>'`.
- Encoding-Regel aus §0 gilt auch hier.

---

## Fehlerbilder

| Symptom | Ursache / Reaktion |
|---------|-------------------|
| `az boards` unbekannt | Extension fehlt → `az extension add --name azure-devops` |
| `TF401019` / 404 auf ID | Work Item existiert nicht oder liegt in anderem Projekt |
| 401 / `AADSTS` | Token abgelaufen → `az login` |
| `--query` liefert leer in PowerShell | JMESPath-Quoting; Volldump nehmen und per `Read` auswerten |
| Umlaute als `�` | §0 nicht befolgt — cp1252-Konvertierung fehlt |
| „Project selection cancelled" | `--project` bzw. `--org` vergessen |
| Bild-Download 403 | falsche Resource-ID beim Token — §3 Schritt 2 |
