# Fallback ohne ado-mcp — az CLI

**Trigger:** ado-mcp-Server liefert keine Tools (ToolSearch bleibt leer, auch nach mehreren Anläufen und trotz korrekter `.mcp.json` + gültigem `az account show`). Bekanntes, wiederkehrendes Problem — nicht auf Neukonfiguration schließen, nicht auf Client-Neustart warten. Direkt hierher wechseln.

Liest genau: Title, Description (inkl. Bilder), Acceptance Criteria (inkl. Bilder), Discussion/Comments (inkl. Bilder). Kein Schreibzugriff über diesen Weg — nur Lesen.

## Voraussetzung

`az extension add --name azure-devops` (einmalig, falls Extension fehlt — Fehlerausgabe bei Show-Befehl mit "az boards" unbekannt ist das Signal).

## 1. Work Item lesen (Title, Description, Acceptance Criteria, State, Parent, Iteration)

```bash
az boards work-item show --id <ID> --org https://dev.azure.com/TrumpfCorp --output json
```

Relevante Felder im JSON: `fields."System.Title"`, `fields."System.Description"` (HTML), `fields."Microsoft.VSTS.Common.AcceptanceCriteria"` (HTML, falls gepflegt — fehlt im JSON komplett wenn leer), `fields."System.State"`, `fields."System.Parent"`, `fields."System.IterationPath"`, `relations` (Parent/Child-Links, Branch-Links).

Der `--fields`-Parameter ist inkompatibel mit dem Default-Expand — **nicht** `--fields X` verwenden, immer Volldump nehmen und im JSON gezielt lesen.

## 2. Discussion / Comments lesen

```bash
az devops invoke --area wit --resource comments \
  --route-parameters project="Laser Application Database" workItemId=<ID> \
  --org https://dev.azure.com/TrumpfCorp --api-version 7.1-preview
```

Liefert `comments[].text` (HTML) je Diskussionsbeitrag. Leeres `comments: []` heißt: keine Diskussion vorhanden — kein Fehler.

## 3. Verlinkte/erwähnte Bilder laden

`System.Description`, `Microsoft.VSTS.Common.AcceptanceCriteria` und Comment-Text sind HTML. Bilder erscheinen als:

```html
<img src="https://dev.azure.com/TrumpfCorp/<projectGuid>/_apis/wit/attachments/<attachmentGuid>?fileName=image.png">
```

Diese URLs sind ADO-Attachment-Links, kein öffentlicher Zugriff — brauchen Bearer-Token (Azure DevOps Resource ID `499b84ac-1321-427f-aa17-267ca6975798`, nicht die ARM-Default-Resource):

```bash
TOKEN=$(az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798 --query accessToken -o tsv)
curl -s -H "Authorization: Bearer $TOKEN" "<attachment-url-aus-dem-html>" -o "<scratchpad>/wi<ID>_img<N>.png"
```

Danach mit `Read` auf die heruntergeladene Datei — Bild wird inline in den Kontext gerendert (verifiziert 2026-08-12, funktioniert für PNG-Mockups aus Description).

**Falls Download fehlschlägt** (403/404, kein Attachment-GUID im HTML-Text extrahierbar, Link zeigt auf externe Quelle außerhalb ADO): dem Nutzer explizit melden welches Bild/welcher Link nicht geladen werden konnte, und bitten es manuell nachzureichen (z. B. Screenshot einfügen). Nie stillschweigend auslassen.

## Grenzen dieses Fallbacks

- Nur Lesen. Feld-Updates, Kommentar-Schreiben, Work-Item-Anlegen bleiben ado-mcp vorbehalten (oder manuell im Browser).
- Kein Batch-Read mehrerer IDs in einem Call — pro Work Item einzeln aufrufen.
- Projekt-GUID/Name ist hardcoded auf "Laser Application Database" — bei anderem Projekt anpassen.
