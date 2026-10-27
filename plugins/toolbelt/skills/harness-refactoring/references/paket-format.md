# Paketformat

Das Paket liegt im Ordner aus der Zeile `PAKET=`. `harness.js pruefe` prüft die Überschriften und Felder, die das Skript kennt; die übrigen Regeln prüft der Plan-Prüfer beim Lesen. Überschriften und Felder schreibst du genau so, wie sie hier stehen.

## Teile

| Datei | Inhalt | ohne Umbau |
|---|---|---|
| `START-PROMPT.md` | Startanweisung: Handgriffe für den Menschen, darunter der Prompt für die Umsetzungs-Session | fehlt |
| `PLAN.md` | Plan | fehlt |
| `tasks/T-01.md`, `tasks/T-02.md` … | Aufgabendateien, je Task eine | fehlen |
| `BEFUNDE.md` | Befundbericht | Pflicht |
| `PRUEFPROTOKOLL.md` | Prüfprotokoll | Pflicht |
| `ABSCHLUSS-VORLAGE.md` | Abschlussvorlage | fehlt |

Ohne Umbau heißt: `**Ergebnis:** kein Umbau nötig` oder `**Ergebnis:** außerhalb des Scopes`. Dann enthält der Ordner nur `BEFUNDE.md`, `PRUEFPROTOKOLL.md` und die `.gitignore` des Skripts.

## BEFUNDE.md

```markdown
# Befundbericht: <ziel>

**Ergebnis:** Umbau | kein Umbau nötig | außerhalb des Scopes

## Kettenkarte
| Übergabe | Format hin | Format zurück | Leser | Hook | Bewertung |
|---|---|---|---|---|---|
| <Parent → Child → Parent> | <Format> | <Format> | <wer liest> | <Hook oder keiner> | ✅ / ⚠️ / ❌ |

## Befunde
- **B-01** 🔴 `<datei>:<zeile>` — <Konsequenz>. Vorschlag: <Änderung>.

## Rückmeldungen
- **R-01** <Anmerkung> → `<datei>:<zeile>`
- **R-02** <Anmerkung> → nicht zuordenbar

## Nicht zuordenbar
- **R-02** <Grund>

## Außerhalb des Scopes
- **B-03** <Befund am verbotenen Ort>; die Änderung gehört ins Marketplace-Repo.

## Nicht belegbar
- <Prüfpunkt, der sich nicht am Code belegen lässt>

## Entscheidungen
- <Entscheidung>: <Grund>
```

- `**Ergebnis:**` hat genau einen der drei Werte.
- Jeder Befund: Kennung `B-nn`, Einstufung 🔴, 🟡 oder 🟢, `datei:zeile` in Backticks, Gedankenstrich, Konsequenz und Vorschlag.
- Jede Rückmeldung: Kennung `R-nn`, Anmerkung, Pfeil, dann `datei:zeile` in Backticks oder `nicht zuordenbar`; jede nicht zuordenbare steht mit Grund unter `## Nicht zuordenbar`.
- Bei `außerhalb des Scopes` ist `## Außerhalb des Scopes` nicht leer.
- Ein Hinweis aus einer Zeile `WARNUNG` von `pruefe` steht als 🟡-Befund im Bericht.

## PRUEFPROTOKOLL.md

```markdown
# Prüfprotokoll: <ziel>

**Prüf-Subagents:** <anzahl der gestarteten Sonnet-Prüf-Subagents>
**Status:** abgabefähig | nicht abgabefähig

## Alt-Block-Prüfung
- T-01 `<datei>:<zeile>` — gefunden | nicht gefunden, <Korrektur>

## Probelauf-Prüfung
- <Lücke und Korrektur, oder: keine Lücke>

## Nachrechnen
- <Erwartungswert, Aufruf, Ergebnis>

## Plan-Prüfrunde 1
**Offen 🔴:** <anzahl>
- 🔴 <Anmerkung> → Korrektur: <was geändert wurde>
- 🟡 <Anmerkung> → offen
```

- `**Prüf-Subagents:**` liegt zwischen 0 und 4, mit Umbau zwischen 1 und 4.
- Mit Umbau: mindestens ein Eintrag unter `## Alt-Block-Prüfung` und unter `## Probelauf-Prüfung`; `## Nachrechnen` nur, wenn gelaufen.
- Plan-Prüfrunden heißen `## Plan-Prüfrunde 1`, `## Plan-Prüfrunde 2` … ohne Lücke, mindestens 2, höchstens 8.
- Jede Runde hat `**Offen 🔴:**` und mindestens eine Zeile; jede Anmerkung endet auf `→ Korrektur: <text>` oder `→ offen`. Eine Runde ohne Anmerkung hat die Zeile `- keine Anmerkungen`.
- `**Offen 🔴:**` ist die Zahl der 🔴-Zeilen mit `→ offen`.
- Ist ab Runde 2 kein 🔴 offen, folgt keine weitere Runde.
- `**Status:**` ist `abgabefähig`, wenn nach der letzten Runde kein 🔴 offen ist, sonst `nicht abgabefähig`; das ist nur nach Runde 8 erlaubt.

## PLAN.md

```markdown
# Plan: <ziel>

## Rollen und Regeln
## Startprüfungen
## Akzeptanzkriterien
| AC | Kriterium | Nachweis |
|---|---|---|
| AC-01 | <Kriterium> | Test: `<vollständiger Testname>` |
| AC-02 | <Kriterium> | Suche: `<Suchbefehl>` → <erwartete Ausgabe> |
| AC-03 | <Kriterium> | Skript: `<Aufruf>` → <erwartete Ausgabe> |
## Wellen
### Welle 1
**Tasks:** T-01, T-02
**Checkpoint:** Baseline + <n> Tests
**Commit:** `<betreff>`
**Konsistenz-Suchen:** <Suchen>
## Subagent-Prompt-Muster
## Fix-Subagent
## Nicht Teil
```

- `## Rollen und Regeln`: Orchestrator und Task-Subagents mit Modell `sonnet`, TDD (Test rot zeigen, dann Code, dann grün), Alt und Neu wörtlich.
- `## Startprüfungen`: Branch, sauberes Arbeitsverzeichnis, Baseline, Task-Zahl.
- Jede AC-Zeile hat als letzte Zelle genau eine dieser Formen: `Test: ` mit vollständigem Testnamen, `Suche: ` oder `Skript: ` mit wörtlichem Befehl in Backticks, Pfeil und erwarteter Ausgabe. Ein `|` im Befehl schreibst du als `\|`.
- Ein Ziel ohne Testharness bekommt Nachweise als Suche oder Skript-Aufruf; du baust keinen Testharness für das Ziel.
- Jede Welle hat einen Checkpoint, der die Tests als Baseline plus n zählt, einen Commit-Betreff und die Konsistenz-Suchen: verbotene alte Sätze, typografische Anführungszeichen in Agent-Dateien, ungequotete Pfade, entfernte Symbole.
- Zahlen und Wortlaute haben Single-Source-Tests: der Wert steht an genau einer Stelle, alte Wortlaute sind per Suche verboten.
- Die letzte Welle prüft jedes AC einzeln über seinen Testnamen oder Nachweis.
- `## Nicht Teil` nennt, was der Umbau bewusst nicht anfasst.

## tasks/T-01.md

```markdown
# T-01: <titel>

**Modell:** sonnet
**Welle:** 1
**Befunde:** B-01, R-02
**ACs:** AC-01

## Dateien
- `<pfad>` · erlaubt

## Alt
<Block wörtlich aus dem Ziel, mit datei:zeile>

## Neu
<Block wörtlich>

## TDD-Schritte
1. <Test schreiben, Testname>
2. <Test rot laufen lassen, Befehl, erwartete rote Zeile>
3. <Code ändern>
4. <Test grün laufen lassen, Befehl>

## Verifikation
- <Befehl, der nur die Dateien dieses Tasks prüft>

## Rückgabe
- OK oder FEHLER mit Grund, beobachtete rote und grüne Testzeilen, geänderte Dateien
```

- Dateinamen `T-01.md`, `T-02.md` … im Unterordner `tasks`.
- Jede Datei unter `## Dateien` trägt das Ergebnis von `harness.js scope`; nur `erlaubt` ist gültig. Pfade relativ zur Repo-Wurzel, globale mit `~/`.
- `**Befunde:**` nennt keinen 🟢-Befund.
- Zwei Tasks derselben Welle nennen nie dieselbe Datei; über Wellen hinweg ist das ein 🟡-Hinweis.
- Ein Task verifiziert nur seine eigenen Dateien und verweist nicht auf Nachbar-Tasks.

## START-PROMPT.md

```markdown
# Startanweisung: <ziel>

**Branch:** `<arbeits-branch>`

## Handgriffe
- Branch anlegen: `git switch -c <arbeits-branch>`
- <weitere Handgriffe, etwa Backup>

---

**Paket:** `<ausgeschriebener Paketpfad>`

## Abbruchregeln
- Branch main, master oder leer
- Arbeitsverzeichnis nicht sauber
- Baseline rot
- Task-Datei fehlt
- Checkpoint nach zwei Reparaturversuchen rot

## Wellen
### Welle 1
**Checkpoint:** Baseline + <n> Tests
**Commit:** `<betreff>`

## Rückgabeformat der Task-Subagents
- OK oder FEHLER mit Grund, beobachtete rote und grüne Testzeilen, geänderte Dateien

## Fix-Subagent
- höchstens zwei Versuche je Checkpoint

## Letzte Ausgabe
- Abschlussbericht nach ABSCHLUSS-VORLAGE.md mit Status FERTIG | FERTIG MIT OFFENEN PUNKTEN | ABGEBROCHEN
```

- Die Zeile `---` trennt die Handgriffe für den Menschen vom Prompt für die Umsetzungs-Session (Modell `sonnet`). Der Prompt nennt den Paketpfad als einzigen Pfad.
- `**Branch:**` ist nie `main` oder `master`. Ist der aktuelle Branch ein anderer als dieser, steht `git switch -c <arbeits-branch>` vor der Linie.
- Jede Welle der Tasks hat eine Überschrift `### Welle <n>` mit `**Checkpoint:**` und genau einer Zeile `**Commit:**`.
- Liegt eine Datei einer Welle in keinem Git-Repo, hat diese Welle statt des Commits genau eine Zeile `**Backup:**`, und der Prompt enthält den Satz: Je Welle ersetzt eine Backup-Kopie den Commit.
- Die Umsetzung macht ein Sonnet-Orchestrator mit dieser Startanweisung; es gibt keine zweite Planungs-Kette für das Paket.

## ABSCHLUSS-VORLAGE.md

```markdown
# Abschluss: <ziel>

**Status:** FERTIG | FERTIG MIT OFFENEN PUNKTEN | ABGEBROCHEN

## Wellen
| Welle | Checkpoint | Commit |
## Tasks
| Task | rot | grün |
## Akzeptanzkriterien
| AC | Nachweis | Ergebnis |
## Offene Punkte
```
