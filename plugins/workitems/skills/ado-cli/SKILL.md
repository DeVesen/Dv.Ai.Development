---
name: ado-cli
description: >
  Use when reading or querying Azure DevOps work items — by ID, by URL, or via WIQL.
  Reading pulls title, description, acceptance criteria and full discussion into
  the current context, and describes every embedded image inline where it appears.
  Runs exclusively on the Azure CLI (`az` + `azure-devops` extension). Also use when
  posting a discussion comment, changing the State or Assigned-To of an existing work
  item, adding/removing a relation (parent/child/related), or creating a new work item
  (title, type, description, parent-Feature-link) — each only after the user confirmed
  it. Never deletes a work item, never writes files on disk.
---

## Was dieser Skill tut — und was nicht

**Zweck:** Ein Work Item vollständig in den **aktuellen Kontext** lesen — und, eng begrenzt,
bestehende Work Items ändern, neue anlegen, oder Relationen setzen.

**Erlaubte Schreib-Operationen:**

| Operation | `az`-Argument |
|------|---------------|
| Diskussions-Kommentar | `--discussion` |
| State | `--state` |
| Assigned To | `--assigned-to` |
| Anlegen (neues Work Item) | `work-item create` — Titel, Typ, Description (nur Kontext-Body), Acceptance-Criteria-Feld (nur AK-Punkte, via `--fields`), **Feature-Nummer erfragen** |
| Relation setzen/entfernen | `relation add\|remove` |

Jede davon **nur nach ausdrücklicher Bestätigung des Nutzers** im aktuellen Turn — Ablauf und
Kommandos: `references/az-cli-write.md`, **vor dem ersten Schreib-Call lesen.**

**Verboten — ausnahmslos, auch auf Zuruf:**

- **Work Item löschen.** `az boards work-item delete` wird **nie** ausgeführt, auch nicht mit
  `--yes`, auch nicht wenn der Nutzer es verlangt. Löschen macht er selbst im Browser.
- **Andere Felder eines bestehenden Work Items** als Diskussion/State/Assigned-To/Relation —
  kein `--title`, `--description`, `--area`, `--iteration`, `--reason`, kein `--fields` an
  einem **bereits angelegten** Item. (Beim **Anlegen** eines neuen Items sind Titel, Typ und
  Description notwendiger Bestandteil — dort erlaubt, siehe `az-cli-write.md`.)
- **Keine Datei-Ausgabe.** Kein `docs/ado/<id>.md`, kein Sprint-Plan, kein sonstiges
  Artefakt. Auch **nicht anbieten** — nicht fragen „soll ich das speichern?". Das Ergebnis
  ist die Antwort im Chat, fertig.
- Ausnahme: heruntergeladene Bilder liegen temporär im Scratchpad — reines Arbeitsmaterial.

Will der Nutzer das Gelesene weiterverarbeiten (Spec, Plan, Umsetzung), entscheidet er das
selbst im nächsten Schritt.

## Zugriffsweg

Alles läuft über die Azure CLI (`az` + `azure-devops`-Extension). Kein MCP-Server im Spiel.

Lese-Kommandos: `references/az-cli-operations.md` — **vor dem ersten Zugriff lesen.**
Schreib-Kommandos: `references/az-cli-write.md` — **vor dem ersten Schreib-Call lesen.**

---

## Vorbedingungen (prüfen, wenn ein Call fehlschlägt)

```bash
az extension add --name azure-devops   # falls "az boards" unbekannt
az login                                # falls 401/AADSTS
```

Feste Werte in diesem Projekt:

| Wert | Inhalt |
|------|--------|
| Organisation | `https://dev.azure.com/TrumpfCorp` |
| Projekt | `Laser Application Database` (nicht der Repo-Name `lac-db`) |

---

## Quick-Routing

| Aufgabe | Kommando / Referenz |
|---------|--------------------|
| Work Item per ID lesen | `references/op-read-workitem.md` (Gesamtablauf) |
| Work Item per URL lesen | ID = letztes URL-Segment, dann wie oben |
| Mehrere Work Items lesen | Kein Batch — pro ID einzeln, Ablauf je ID |
| Nur die Diskussion lesen | `az-cli-operations.md` §2 |
| Bilder prüfen & beschreiben | `az-cli-operations.md` §3 — **Pflicht**, nicht optional |
| WIQL-Query / Sprint-Inhalt auflisten | `az-cli-operations.md` §4 |
| Kommentar posten / State / Assigned To setzen | `az-cli-write.md` — erst bestätigen lassen |
| Work Item anlegen | `az-cli-write.md` — Titel/Typ/Description **und Feature-Nummer** erfragen, dann bestätigen lassen |
| Relation setzen/entfernen | `az-cli-write.md` — erst bestätigen lassen |
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
transportiert. Ein „(Screenshot)" reicht nicht — Bilder tragen in diesem Projekt oft die
eigentliche Anforderung.

Lädt ein Bild nicht (403/404, kein Attachment-GUID, externe Quelle): an der Stelle
`[Bild konnte nicht geladen werden: <URL>]` schreiben und den Nutzer am Ende explizit
bitten, es nachzureichen. **Nie stillschweigend auslassen.**

---

## Encoding — Pflichtwissen

`az` gibt seine Ausgabe in **cp1252** aus, nicht UTF-8 (verifiziert 2026-08-17). Umlaute
kommen sonst als `�` an. Immer in Datei umleiten und konvertieren, dann lesen:

```bash
az boards work-item show --id <ID> --org https://dev.azure.com/TrumpfCorp -o json > "<scratchpad>/wi.raw.json"
iconv -f cp1252 -t utf-8 "<scratchpad>/wi.raw.json" > "<scratchpad>/wi.json"
```

Danach `<scratchpad>/wi.json` mit `Read` öffnen. Details: §0 in `references/az-cli-operations.md`.

---

## Grenzen

- **Kein Batch-Read.** Mehrere IDs = mehrere Calls (dürfen parallel laufen).
- `az boards query` unterstützt **nur flache Queries** — keine `WorkItemLinks`-Hierarchien;
  Parent/Child über `System.Parent` bzw. `relations` auflösen.
- Schreibzugriff auf `--discussion`, `--state`, `--assigned-to` eines bestehenden Items,
  `relation add|remove`, sowie `work-item create` (Titel/Typ/Description/Parent-Feature) —
  je nach Bestätigung. **Löschen** bleibt ausnahmslos Sache des Nutzers im Browser; ebenso
  jede Titel-/Description-/Area-/Iteration-Änderung an einem **bereits angelegten** Item.

---

## Referenzen (on-demand)

| Bedarf | Datei |
|--------|-------|
| Gesamtablauf „Work Item lesen und aufbereiten" | `references/op-read-workitem.md` |
| az-Kommandos im Detail (Encoding, Read, Comments, Bilder, WIQL) | `references/az-cli-operations.md` |
| Schreiben: Bestätigungs-Ablauf, die drei erlaubten Felder | `references/az-cli-write.md` |
