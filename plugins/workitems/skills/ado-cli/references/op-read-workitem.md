# Operation: Work Item lesen → in den aktuellen Kontext

## Ziel

Ein ADO-Work-Item vollständig lesen — Titel, Beschreibung, Akzeptanzkriterien, Diskussion,
inklusive aller enthaltenen Bilder — und **im Chat ausgeben**.

**Kein Datei-Output.** Kein `docs/ado/<id>.md`, kein Sprint-Plan, keine sonstige Ablage —
und auch **nicht anbieten**. Was der Nutzer mit dem Gelesenen macht, entscheidet er danach.

---

## Schritt 1 — ID ermitteln

Eingabe: ID (`1234`) oder URL
`https://dev.azure.com/<org>/<project>/_workitems/edit/1234` → ID = letztes URL-Segment.

---

## Schritt 2 — Daten laden (parallel)

Encoding-Regel aus `az-cli-operations.md` §0 zwingend: `> raw.json`, dann
`iconv -f cp1252 -t utf-8`, dann `Read`.

```bash
# Work Item — Volldump, kein --fields (siehe §1)
az boards work-item show --id <id> --org https://dev.azure.com/TrumpfCorp -o json > "<scratchpad>/wi<id>.raw.json"

# Diskussion (siehe §2)
az devops invoke --area wit --resource comments \
  --route-parameters project="Laser Application Database" workItemId=<id> \
  --org https://dev.azure.com/TrumpfCorp --api-version 7.1-preview > "<scratchpad>/wi<id>.comments.raw.json"
```

---

## Schritt 3 — Bilder auflösen (Pflicht)

Description, Acceptance Criteria und **jeden** Kommentar nach `<img src=…>` durchsuchen.
Für jeden Treffer: laden, mit `Read` ansehen, ggf. Bildmaße prüfen, beschreiben — Ablauf und
Beschreibungsformat in `az-cli-operations.md` §3. Wirkt ein Bild angeschnitten, erst per
PNG-Header klären ob das Original so ist (§3 Schritt 5) und den Befund in die Beschreibung
aufnehmen — nicht raten.

Die Beschreibung wird **an der Position eingesetzt, an der das Bild im Text stand**.
Kein Sammelabschnitt am Ende. Nicht ladbar → `[Bild konnte nicht geladen werden: <URL>]`
an der Stelle plus Hinweis am Ende der Antwort.

**Inline-Bilder sind keine Anhänge.** Ein `<img>` im HTML taucht **nicht** in `relations[]`
als `AttachedFile` auf — die beiden Wege sind unabhängig (verifiziert 2026-08-17 an #299382:
4 Inline-Bilder, `relations[]` ohne einen einzigen `AttachedFile`-Eintrag).

Daraus folgt:

- `relations[]` **nicht** als Prüfung „hat das Item Bilder?" verwenden — immer den HTML-Text
  nach `<img src=…>` durchsuchen, sonst werden alle Inline-Bilder stillschweigend übersehen.
- Der Abschnitt „Anhänge" bleibt in diesem Fall korrekterweise `(keine)`, obwohl Bilder da
  sind. Das ist kein Widerspruch — an der Stelle einen Hinweis ergänzen, z. B.
  `(keine — die <N> Bilder sind inline in der Description eingebettet, nicht als AttachedFile-Relation)`.

---

## Schritt 4 — Aufbereiten und ausgeben

HTML zu Plaintext: `<p>`, `<br>`, `<div>`, `<ul>`/`<li>`, `<ol>`/`<li>` in Absätze bzw.
Aufzählung umsetzen, Tags nicht im Output stehen lassen. Listen und Nummerierungen aus dem
Original beibehalten — sie tragen oft die Task-Struktur.

### HTML-Entities auflösen

ADO liefert im Description-HTML regelmäßig Entities. **Immer** dekodieren, nie roh stehen
lassen (angetroffen 2026-08-17 in #299382):

| Entity | wird zu |
|--------|---------|
| `&quot;` | `"` |
| `&nbsp;` | normales Leerzeichen |
| `&amp;` | `&` |
| `&lt;` / `&gt;` | `<` / `>` |
| `&#39;` / `&apos;` | `'` |

Numerische Entities (`&#8211;` usw.) ebenfalls auflösen. Ein `&quot;` im Output ist ein
Fehler, kein Originaltext — die 1:1-Regel meint den *sichtbaren* Text, nicht die
HTML-Kodierung.

### Artifact-Links dekodieren (`relations[]`)

Branch- und PR-Verknüpfungen stehen als URL-kodierte `vstfs`-URI, nicht als Klartext:

```
vstfs:///Git/Ref/<projectGuid>%2F<repoGuid>%2FGB<branchname>
```

Auflösen: URL-decode (`%2F` → `/`), dann das letzte Segment lesen. Präfix `GB` = Branch
(verifiziert 2026-08-17 an #299382: `…%2FGBtest` = Branch `test`). Weitere gängige
`vstfs`-Typen im `rel`-Feld: `Git/Commit`, `Git/PullRequestId` — dort ist das letzte Segment
SHA bzw. PR-ID.

Die GUIDs bei Bedarf auflösen (nur wenn der Repo-Name für die Antwort relevant ist):

```bash
az repos show --repository <repoGuid> --org https://dev.azure.com/TrumpfCorp --project "Laser Application Database" -o json
```

(verifiziert: `e2498a06-7a0c-4a5b-b11a-dc6292c7a863` = `lac-db`)

Im Output erscheint also `Branch: test`, **nicht** der rohe `vstfs`-String. Lässt sich ein
Link nicht dekodieren, den Rohwert ausgeben statt ihn wegzulassen.

Ausgabeform im Chat:

```markdown
# #<id> — <Titel>

> **Typ:** <WorkItemType> | **Status:** <State> | **Bereich:** <AreaPath> | **Iteration:** <IterationPath>

## Beschreibung
<Plaintext, Bildbeschreibungen inline an Originalposition>

## Akzeptanzkriterien
<Plaintext, Bildbeschreibungen inline — oder „(keine angegeben)">

## Diskussion
<Autor (Datum): Text — älteste zuerst, Bildbeschreibungen inline>
<oder „(keine Diskussion)">

## Anhänge
<Dateinamen aus relations[] mit rel=AttachedFile — oder „(keine)">
<Inline-Bilder gehören NICHT hierher, sie stehen beschrieben im Text (siehe Schritt 3);
 sind welche vorhanden, den Grund für „(keine)" dazuschreiben>

## Verknüpfungen
<Parent-ID, Child-IDs, verlinkte Branches/PRs aus relations[] — oder „(keine)">
```

Bei sehr langer Diskussion: alle Beiträge behalten, die fachlich etwas beitragen; reine
Status-Pings („Done", „Merging", „siehe oben") weglassen und die Zahl der weggelassenen
Beiträge nennen.

---

## Qualitätsregeln

- **1:1-Originaltext.** Nichts paraphrasieren, nichts kürzen, nichts „zusammenfassen" —
  außer den ausgelassenen Status-Pings, und die werden gezählt gemeldet.
- **Keine Interpretation ungefragt.** Kein „was gemeint ist", keine Umsetzungsvorschläge,
  keine Annahmen über die Codebasis. Fragt der Nutzer danach, gern — aber nicht von selbst.
- **Leeres Feld bleibt sichtbar** — `(keine angegeben)` statt Abschnitt weglassen. Fehlendes
  `AcceptanceCriteria` im JSON heißt: leer, nicht „Fehler".
- **Bilder nie überspringen** (siehe Schritt 3).
- **Nicht mit der Umsetzung beginnen.** Lesen ist das ganze Mandat.
