# dv-forge: Spec-Review — Design

2026-09-25 · @DeVesen · Branch `V2` · Status: freigegeben 2026-09-25

## 1. Kontext und Ziel

`dv-forge` ist ein neues Plugin in diesem Repo. Es löst `dv-relay` vollständig ab und ersetzt in
Teilen `superpowers` und `grill-me`. Es entsteht in drei getrennten Teilprojekten, jedes mit eigenem
Spec → Plan → Umsetzung:

1. **Spezifizieren** — Spec erstellen **und** Spec-Review-Loop
2. **Planen** — Plan aus Spec erstellen **und** Plan-Review-Loop
3. **Umsetzen** — Plan sequentiell per SubAgents umsetzen **und** Implementierungs-Review-Loop

Alle drei Phasen folgen demselben Muster: Mensch → autonomer Loop (Review → Nacharbeit → Review …)
→ Mensch. Dieses Dokument spezifiziert **nur den Spec-Review-Loop** aus Teilprojekt 1.

Ziel: Eine erste `spec.md` aus einer Grill-Runde wird in einer frischen Session ohne
Mensch-in-der-Schleife geprüft und korrigiert, bis sie sauber ist oder ein Rundenlimit erreicht.
Am Ende bekommt der Mensch die aktuelle Spec und das letzte Review-Ergebnis.

## 2. Abgrenzung

**Im Umfang:**
- Skill `/dv-forge:spec-review` als Orchestrator
- fünf Reviewer-Agents, ein Nacharbeiter-Agent
- Aggregations-Skript, Hook-Guard, Tests
- Plugin-Gerüst `plugins/forge/` und Marketplace-Eintrag

**Nicht im Umfang (eigene Sessions / Teilprojekte):**
- Spec erstellen: `spec-whiteboarding` und `spec-whiteboarding-with-docs`
  (mit `dv-working-capturing` und der Arbeitsweise von `mattpocock-skills:domain-modeling`)
- Plan-Erstellung und Plan-Review, inklusive alternativer Pläne
- Umsetzung und Implementierungs-Review
- Entfernen von `dv-relay`

**Leitplanke:** Aus `dv-relay` werden weder Name, Texte noch Strukturen übernommen.

## 3. Begriffe

| Begriff | Bedeutung |
|---|---|
| Orchestrator | Die Main-Session, die den Skill `spec-review` ausführt. Koordiniert, zählt, leitet weiter. Prüft und schreibt nie selbst. |
| Reviewer | SubAgent mit einem festen Prüfauftrag. Liest nur die Spec (und ggf. Profile/Quelle). |
| Nacharbeiter | SubAgent `spec-rework`, der die Spec anhand der Findings korrigiert. |
| Finding | Ein Befund eines Reviewers im festen JSON-Format (Abschnitt 8). |
| Stelle | Schlüssel eines Findings: eine AC-ID (`AC-07`) oder eine exakte Abschnittsüberschrift. |
| Runde | Ein Review, bei Bedarf gefolgt von einer Nacharbeit. |
| N | Maximale Anzahl Nacharbeiten. Höchstens N+1 Reviews. Default N = 3. |
| sauber | Das aggregierte Ergebnis eines Reviews enthält kein 🔴 und kein Reviewer ist ausgefallen. |

## 4. Architektur

```
plugins/forge/
├── .claude-plugin/plugin.json            name: dv-forge, version 0.1.0
├── skills/spec-review/
│   ├── SKILL.md                          Orchestrator-Rolle, disable-model-invocation: true
│   └── references/
│       ├── finding-format.md             JSON-Format der Reviewer-Ausgabe
│       ├── severity-rules.md             Konsequenz-Achse 🔴/🟡/🟢 + Hochstufung
│       └── report-format.md              Aufbau des Abschlussberichts
├── agents/
│   ├── spec-review-completeness.md       Vollständigkeit + AC-Testbarkeit       (sonnet)
│   ├── spec-review-consistency.md        Konsistenz + Abgeschlossenheit         (sonnet)
│   ├── spec-review-feasibility.md        Machbarkeit, rein aus der Spec         (sonnet)
│   ├── spec-review-clarity.md            Lücken/Randfälle + WAS-statt-WIE       (sonnet)
│   ├── spec-review-profiles.md           Abgleich mit working-capturing-Profilen (sonnet)
│   └── spec-rework.md                    Nacharbeiter                           (opus)
├── hooks/hooks.json
├── scripts/
│   ├── aggregate-findings.js             Deduplizierung, Stufen, Hochstufung
│   ├── file-hash.js                      Hash einer Datei (Stillstand-Erkennung)
│   └── guard-orchestrator.js             Hook-Guard + Marker-Verwaltung
└── tests/
    ├── *.test.js                         node:test
    └── fixtures/                         Reviewer-JSON, Hook-Eingaben, Fehler-Spec
```

Dazu ein Eintrag `dv-forge` → `./plugins/forge` in `.claude-plugin/marketplace.json`.

**Konventionsentscheidungen:**
- Skripte in Node (`.js`), nicht PowerShell, damit sie unter bash und macOS laufen.
- Agent- und Skill-Texte folgen `superpowers:writing-skills`. Frontmatter nur `name` +
  `description`, die `description` beginnt mit „Use when…“, Details liegen in `references/`.

## 5. Aufruf

```
/dv-forge:spec-review <pfad/spec.md> [quelle.md] [--rounds N]
```

- `pfad/spec.md` — Pflicht. Die zu prüfende Spec.
- `quelle.md` — optional. Ursprüngliche Anfrage (Ticket, Notiz), gegen die die Spec geprüft wird.
- `--rounds N` — optional. Maximale Anzahl Nacharbeiten, Default 3.

Der Skill startet nur manuell (`disable-model-invocation: true`). Gedacht ist der Start in einer
frischen Session, damit der Verlauf der Grill-Konversation den Review nicht beeinflusst. Der Start in
derselben Session ist erlaubt. Der Skill arbeitet ausschließlich gegen Dateien, nie gegen den
Chatverlauf.

## 6. Ablauf

### 6.1 Start (einmalig, rein mechanisch)

1. Argumente parsen. Existenz der Spec per `scripts/file-hash.js` prüfen (kein inhaltliches Lesen).
   Existiert sie nicht oder ist sie nicht lesbar: Abbruch mit Meldung.
2. Profile ermitteln — nur Pfadexistenz, kein Lesen:
   - Glossar: Ort aus der Projekt-`CLAUDE.md`, sonst `docs/glossary/`
   - Modul- und Feature-Profile: `docs/application/`
   - Keine Profile vorhanden: Der Profil-Reviewer läuft nicht.
3. Bei Weg A ist der Guard-Marker bereits durch den `UserPromptSubmit`-Hook gesetzt (Abschnitt 11).
   Rundenzähler r = 1.

### 6.2 Runde r

1. **Review.** Alle aktiven Reviewer werden in **einer** Nachricht parallel gestartet, jeder als
   frische Instanz. Eingaben:
   - alle: Pfad zur `spec.md`
   - nur `spec-review-completeness`: zusätzlich `quelle.md`, falls angegeben
   - nur `spec-review-profiles`: zusätzlich die gefundenen Profil-Pfade
   - **keiner** bekommt Findings früherer Runden
2. **Aggregation.** Der Orchestrator übergibt die JSON-Ausgaben unverändert an
   `scripts/aggregate-findings.js` und übernimmt dessen Ergebnis. Eigene Bewertungen nimmt er nicht vor.
3. **Stopp-Prüfung**, in dieser Reihenfolge:
   - sauber → Ende „sauber nach Review r“
   - r = N+1 → Ende „Cap erreicht“
   - sonst weiter
4. **Nacharbeit.**
   - Vorher: `scripts/file-hash.js` auf die Spec.
   - `spec-rework` bekommt den Spec-Pfad und die aggregierten Findings: 🔴 und 🟡 zur Bearbeitung,
     🟢 nur zur Info.
   - Nachher: Hash erneut. Unverändert trotz 🔴 → Ende „Stillstand“.
   - Ist das Review nur wegen eines ausgefallenen Reviewers nicht sauber (kein 🔴), entfällt die
     Nacharbeit; es folgt direkt das nächste Review. Es zählt gegen die N+1 Reviews.
5. r = r+1, zurück zu Schritt 1.

### 6.3 Abschluss

Abschlussbericht im Chat (Format in `references/report-format.md`):
- Status: `sauber nach Review r` | `Cap erreicht, k × 🔴 offen` | `Stillstand in Runde r`
- Anzahl Reviews und Nacharbeiten
- ausgefallene Reviewer, falls vorhanden
- Tabelle der aggregierten Findings des **letzten** Reviews
- Pfad der Spec

Es werden keine Review-Dateien geschrieben und nichts committet. Der Mensch entscheidet über
den Commit.

## 7. Reviewer

Alle Reviewer lesen **keinen Code** und nur die Dateien, die ihnen übergeben werden. Tools im
Frontmatter: nur `Read`. Jeder stuft seine Findings selbst nach Konsequenz ein (Abschnitt 9).

| Agent | Prüfauftrag |
|---|---|
| `spec-review-completeness` | Zu jeder genannten Funktion gibt es nummerierte Akzeptanzkriterien (`AC-xx`). Jedes AC ist konkret und prüfbar (kein „funktioniert korrekt“, „ist möglich“). Fehlen AC-IDs komplett, ist das 🔴. Mit `quelle.md`: Deckt die Spec die Anfrage ab? |
| `spec-review-consistency` | Widersprüche zwischen Aussagen der Spec, inklusive Abschnitt `## Entscheidungen`. Verweise auf externe Dokumente, Tickets oder Links — die Spec muss in sich abgeschlossen sein. |
| `spec-review-feasibility` | Anforderungen, die sich gegenseitig ausschließen. Voraussetzungen, die die Spec selbst benennt, aber nirgends erfüllt. Rein aus der Spec, ohne Code. |
| `spec-review-clarity` | Nicht spezifizierte Rand- und Fehlerfälle (leere Eingaben, Netzwerkfehler, Grenzwerte). Implementierungsdetails in der Spec (Klassen, Dateien, Technik-Schritte): WAS statt WIE. |
| `spec-review-profiles` | Begriffe der Spec gegen das Glossar. Aussagen über den Ist-Stand gegen Modul- und Feature-Profile. Läuft nur, wenn Profile existieren. |

## 8. Findings-Format

Jeder Reviewer endet mit genau einem JSON-Block:

```json
{
  "reviewer": "consistency",
  "findings": [
    {
      "location": "AC-07",
      "quote": "wörtliches Zitat aus der Spec",
      "severity": "red",
      "consequence": "Was schiefgeht, wenn so gebaut wird",
      "rationale": "Warum das ein Befund ist"
    }
  ]
}
```

- `severity` ∈ `red` | `yellow` | `green`
- `location`: AC-ID in der Form `AC-<Zahl>` oder die exakte Abschnittsüberschrift ohne `#`
- keine Findings: `"findings": []`

## 9. Schweregrad und Aggregation

**Einstufung durch den Reviewer (Konsequenz-Achse):**
- 🔴 `red` — Ein Planer oder Implementierer würde so etwas Falsches bauen oder müsste raten. Blockt.
- 🟡 `yellow` — Echte Schwäche, die nicht zwingend zu falschem Bau führt.
- 🟢 `green` — Anmerkung, Formulierung.

**Aggregation durch `aggregate-findings.js` (deterministisch):**
1. Normalisieren von `location`: trimmen, Kleinschreibung, Mehrfach-Leerzeichen zusammenfassen,
   `AC-7` und `AC-07` gleichsetzen.
2. Gruppieren nach normalisierter `location`. Eine Gruppe ist ein aggregiertes Finding und behält
   alle Einzel-Findings (Reviewer, Zitat, Konsequenz, Begründung).
3. Stufe der Gruppe = höchste Stufe ihrer Einzel-Findings.
4. Nennen ≥ 2 **verschiedene** Reviewer dieselbe Gruppe und ist ihre Stufe 🟡, wird sie zu 🔴.
5. Ausgabe: `STATUS`-Zeile, Markdown-Tabelle für den Bericht (`=== REPORT ===`) und vom Skript
   gerenderter Markdown-Block für den Nacharbeiter (`=== REWORK ===`), sortiert 🔴 → 🟡 → 🟢. Reviews
   mit Namen außerhalb von `--expect` werden verworfen und als Fehler gemeldet.
6. Ungültiges JSON eines Reviewers wird als Fehler gemeldet und nicht still verworfen.

**Bekannte Grobheit:** Zwei verschiedene Probleme an derselben Stelle werden zusammengelegt und können
dadurch hochgestuft werden. Das ist der bewusste Preis dafür, dass der Orchestrator nicht inhaltlich
urteilt.

## 10. Nacharbeiter

`spec-rework` (Modell `opus`, Tools `Read`, `Edit`):
- korrigiert `spec.md` direkt anhand der 🔴- und 🟡-Findings, liest keinen Code
- hält die Spec in sich abgeschlossen und im WAS
- pflegt am Ende der Spec den Abschnitt `## Entscheidungen`; legt ihn an, falls er fehlt
- schreibt pro bearbeitetem aggregiertem Finding genau einen Eintrag:

```markdown
- **R<r> · <Stelle>** — geändert | nicht geändert — <Begründung>
```

- existiert eine Stelle nicht in der Spec: Eintrag „nicht geändert — Stelle existiert nicht“
- Rückgabe an den Orchestrator: kurze Liste `<Stelle>: geändert | nicht geändert`

Der Abschnitt `## Entscheidungen` ist die einzige Kontinuität zwischen den Runden. Reviewer sehen
ihn als Teil der Spec. Ein begründetes „nicht geändert“ verhindert Pingpong.

**W-Einträge** (`- **W · <Kurztitel>** · <Beleg-Tag> — <Antwort>`) stammen aus
`dv-forge:spec-whiteboarding` und sind bindende Entscheidungen des Menschen. Alle Reviewer
behandeln sie so: Ein W-Eintrag ist nie selbst ein Finding, ein Widerspruch zwischen Spec-Inhalt und
W-Eintrag ist eines. Der Nacharbeiter ändert und entfernt W-Einträge nicht.

## 11. Orchestrator-Pflicht und Hook-Guard

**Pflicht (gilt analog später für Plan- und Implementierungs-Review):** Der Orchestrator
- liest die Spec nicht inhaltlich,
- bewertet keine Findings,
- ändert die Spec nicht,
- trifft nur mechanische Entscheidungen (Zähler, Skript-Ergebnis, Hash-Vergleich).

**Durchsetzung — Weg A (Ziel):** Prosa im Skill plus Hook-Guard `guard-orchestrator.js`:
- Marker setzen: `UserPromptSubmit`-Hook erkennt den Prompt `/dv-forge:spec-review <pfad>` und
  schreibt `<os.tmpdir()>/dv-forge/<session_id>.json` mit dem absoluten Spec-Pfad.
- Blocken: `PreToolUse` für `Read|Edit|Write|MultiEdit|NotebookEdit`, wenn die Ziel-Datei die Spec ist,
  für `Grep`, wenn die Spec im Suchpfad liegt (fehlender Pfad = Arbeitsverzeichnis), und für
  `Bash|PowerShell`, wenn das Kommando den Spec-Pfad oder -Dateinamen enthält. Alles nur
  in der Main-Session derselben `session_id`. Tool-Calls von SubAgents werden durchgelassen.
  Ausnahme: Shell-Aufrufe von `scripts/file-hash.js` und `scripts/aggregate-findings.js` sind erlaubt.
- Aufräumen: `Stop`-Hook entfernt den Marker am Ende des Turns, `SessionEnd` als Rückfall.
- Ein Marker einer fremden `session_id` hat keine Wirkung.

**Weg B (Rückfall):** Scheitert der Spike (Abschnitt 13), entfällt der Guard. Die Pflicht steht dann
nur als Prosa im Skill und wird durch den Drucktest abgesichert.

## 12. Fehlerfälle

| Fall | Verhalten |
|---|---|
| Spec fehlt / nicht lesbar | Abbruch vor Runde 1, klare Meldung |
| Reviewer-Ausgabe nicht im Format | einmal neu starten; erneut ungültig → „ausgefallen“, Runde gilt als nicht sauber, Bericht nennt den Ausfall |
| Nacharbeit ändert nichts trotz 🔴 | Ende „Stillstand in Runde r“ |
| Stelle existiert nicht | Nacharbeiter trägt „nicht geändert — Stelle existiert nicht“ ein |
| Session bricht ab | Marker ist an `session_id` gebunden, `Stop`/`SessionEnd` räumen auf |

## 13. Spike (erste Plan-Aufgabe)

Geklärt am 2026-09-25 (Doku code.claude.com/docs/en/hooks.md, plugins/components.md, skills.md):
1. Hook-Eingaben aus SubAgents enthalten `agent_id` und `agent_type`; in der Main-Session fehlen sie. → Guard erlaubt, wenn `agent_id` gesetzt ist.
2. Plugin-Hooks feuern global, sobald das Plugin geladen ist, auch für Tool-Calls von SubAgents.
3. `UserPromptSubmit` liefert den rohen Prompt inklusive `/dv-forge:spec-review <pfad>` und `session_id`.
4. `disable-model-invocation: true` verhindert nur den automatischen Aufruf; `$ARGUMENTS` und `argument-hint` funktionieren.
5. Plugin-Agents heißen `dv-forge:<name>`; `${CLAUDE_PLUGIN_ROOT}` wird im Skill-Text ersetzt.
6. Parallele `Agent`-Calls mit `run_in_background: false` in einer Nachricht kommen im selben Turn zurück, parallel (Test: zwei Agents, überlappende Zeitfenster von je ~9 s).

Folge: Weg A gilt. Stop-Hook entfernt den Marker am Turn-Ende; der Skill gibt ihn zusätzlich am Ende per `guard-orchestrator.js release` frei.

Nachtrag Umsetzung: Der Guard lässt Shell-Aufrufe der plugin-eigenen Skripte `file-hash.js` und `aggregate-findings.js` durch. Grund: Reviewer-Texte, die an die Aggregation gehen, können den Dateinamen der Spec enthalten; die Aggregation liest die Spec nie.

## 14. Tests

1. **`aggregate-findings.js`** (`node:test`): Normalisierung, Gruppierung, höchste Stufe,
   Hochstufung nur bei ≥ 2 verschiedenen Reviewern, Sortierung, ungültiges JSON.
2. **`guard-orchestrator.js`** (`node:test`, Hook-Eingaben als Fixtures): Main-Session
   liest/editiert die Spec → blockiert; SubAgent → erlaubt; andere Datei → erlaubt; kein Marker →
   erlaubt; fremde `session_id` → erlaubt; `file-hash.js` → erlaubt; Marker setzen und entfernen.
3. **`file-hash.js`**: gleicher Inhalt → gleicher Hash, geänderter Inhalt → anderer Hash.
4. **Reviewer:** Fixture-Spec mit je einem eingebauten Fehler pro Reviewer (Widerspruch, fehlendes AC,
   vages AC, WIE-Detail, externer Verweis, Glossar-Abweichung). Jeder Reviewer muss seinen Fehler melden.
5. **Orchestrator-Skill:** Drucktest nach `superpowers:writing-skills`, Baseline ohne und mit Skill,
   Druck „mach schnell, korrigier die Spec einfach selbst“. Bestanden, wenn er nur orchestriert.

## 15. Akzeptanzkriterien

- **AC-01** `/dv-forge:spec-review <spec>` startet nur per manuellem Aufruf, nie automatisch.
- **AC-02** Fehlt die Spec-Datei, bricht der Skill vor dem ersten Review mit einer Meldung ab, die den Pfad nennt.
- **AC-03** Pro Review werden alle aktiven Reviewer in einer Nachricht parallel gestartet.
- **AC-04** Kein Reviewer erhält Findings einer früheren Runde.
- **AC-05** `spec-review-profiles` läuft genau dann, wenn Glossar- oder Profil-Pfade existieren.
- **AC-06** `quelle.md` erreicht ausschließlich `spec-review-completeness`.
- **AC-07** Kein Reviewer und nicht der Nacharbeiter lesen Code; Reviewer haben nur das Tool `Read`.
- **AC-08** Jeder Reviewer endet mit genau einem JSON-Block im Format aus Abschnitt 8.
- **AC-09** Die Aggregation erfolgt ausschließlich durch `aggregate-findings.js` nach den Regeln aus Abschnitt 9.
- **AC-10** Eine 🟡-Gruppe, die von ≥ 2 verschiedenen Reviewern genannt wird, erscheint als 🔴.
- **AC-11** Die Schleife endet bei einem sauberen Review, nach N+1 Reviews oder bei Stillstand — je nachdem, was zuerst eintritt.
- **AC-12** Ohne `--rounds` gilt N = 3; mit `--rounds N` gilt der übergebene Wert.
- **AC-13** Die Schleife endet nie mit einer ungeprüften Nacharbeit.
- **AC-14** Der Nacharbeiter schreibt pro bearbeitetem aggregiertem Finding genau einen Eintrag in `## Entscheidungen` im Format aus Abschnitt 10.
- **AC-15** Es entstehen keine Review-Dateien; der Abschlussbericht erscheint nur im Chat mit den Inhalten aus 6.3.
- **AC-16** Der Skill committet nichts.
- **AC-17** Ein ungültig formatierter Reviewer wird genau einmal neu gestartet und danach als ausgefallen gemeldet; eine Runde mit Ausfall ist nicht sauber.
- **AC-18** Bei Weg A blockt der Guard Lese-, Schreib- und Shell-Zugriffe der Main-Session auf die Spec, außer Aufrufen von `file-hash.js` und `aggregate-findings.js`; SubAgents werden nicht geblockt.
- **AC-19** Ein Marker wirkt nur in der Session, deren `session_id` er trägt, und wird am Turn-Ende entfernt.
- **AC-20** Alle Node-Tests aus Abschnitt 14 laufen grün mit `node --test "plugins/forge/tests/*.test.js"`.

## 16. Entscheidungen

- **B1 · Verhältnis zu dv-relay** — Nachfolger; relay wird entfernt; keine Übernahme von Name, Text oder Struktur.
- **B2 · Mensch-Rolle** — Mensch vorne (Grillen) und am Ende (Spec + letztes Review); dazwischen autonom.
- **B3 · Laufort** — Main-Session per Skill statt Orchestrator-SubAgent, weil Ergebnisse verschachtelter SubAgents nicht beim startenden SubAgent ankommen.
- **B4 · Einstieg** — manuell gestarteter Skill statt Trigger-Word; deterministisch, kein Fehlstart.
- **B5 · Korrektur** — ein Nacharbeiter statt Resolver + Umsetzer; Begründungen in `## Entscheidungen` der Spec, keine Log-Datei.
- **B6 · Abbruch** — sauber oder Cap; N = maximale Nacharbeiten, Default 3; Stillstand per Hash zusätzlich.
- **B7 · Schweregrad** — Hybrid: Reviewer nach Konsequenz, Aggregation mechanisch, Hochstufung 🟡 → 🔴 bei ≥ 2 Reviewern.
- **B8 · Doku-Input** — `dv-working-capturing`-Profile, falls vorhanden; Quelle der Anfrage nur als optionales Argument. Die Spec selbst enthält keine Verweise.
- **B9 · Code-Input** — kein Code im Spec-Review-Loop.
- **B10 · Reviewer-Set** — fünf Reviewer; AC-Testbarkeit, WAS-statt-WIE und Abgeschlossenheit als Zusatzaufträge bestehender Reviewer; Profil-Abgleich als eigener Reviewer.
- **B11 · Ablage** — Review-Ergebnisse nur im Chat.
- **B12 · Aggregation** — per Skript statt Prosa-Regel; deterministisch, testbar.
- **B13 · Modelle** — Reviewer `sonnet`, Nacharbeiter `opus`; pro Agent im Frontmatter änderbar.
- **B14 · Plugin-Name** — `dv-forge`.
- **B15 · W-Einträge** — Nachtrag aus `2026-09-25-dv-forge-spec-creation-design.md`: W-Einträge sind bindend, siehe Abschnitt 10.

## 17. Folge-Teilprojekte

1. Spec erstellen: `spec-whiteboarding`, `spec-whiteboarding-with-docs`
2. Planen: Plan-Erstellung und Plan-Review-Loop (vier Plan-Reviewer, AC-Abdeckung, alternative Pläne)
3. Umsetzen: sequentielle SubAgent-Umsetzung und Implementierungs-Review-Loop
4. `dv-relay` entfernen
