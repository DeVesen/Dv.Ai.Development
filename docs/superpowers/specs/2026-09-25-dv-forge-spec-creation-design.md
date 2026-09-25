# dv-forge: Spec erstellen — Design

2026-09-25 · @DeVesen · Branch `V2` · Status: freigegeben 2026-09-25

## 1. Kontext und Ziel

`dv-forge` löst `dv-relay` ab (siehe `2026-09-25-dv-forge-spec-review-design.md`, Abschnitt 1).
Teilprojekt 1 „Spezifizieren“ besteht aus zwei Hälften:

- **Spec erstellen** — dieses Dokument
- **Spec-Review-Loop** — eigenes Design, bereits freigegeben

Ziel: Der Mensch grillt ein Vorhaben gemeinsam mit Claude, bis kein offener Punkt mehr übrig ist.
Das Ergebnis ist eine in sich abgeschlossene `spec.md`, die `/dv-forge:spec-review` ohne weitere
Anpassung prüfen kann. Optional läuft dabei eine aktive Domänenmodellierung mit, die das
Projekt-Glossar pflegt.

## 2. Abgrenzung

**Im Umfang:**
- Skill `dv-forge:spec-whiteboarding` — Umzug des globalen Skills `~/.claude/skills/spec-whiteboarding`, review-kompatibel angepasst
- Skill `dv-forge:domain-modeling` — eigene Neufassung der Arbeitsweise von `mattpocock-skills:domain-modeling`
- Skill `dv-forge:spec-whiteboarding-with-docs` — Verbund der beiden, als Idee angelehnt an `mattpocock-skills:grill-with-docs`
- Löschen des globalen `spec-whiteboarding` und Prüfen der Verweise darauf
- Nachtrag in der Spec-Review-Spec (Abschnitt 11)

**Nicht im Umfang:** Spec-Review-Loop, Planen, Umsetzen, Entfernen von `dv-relay`.

**Leitplanke:** Aus mattpocock-skills werden nur Ideen und Arbeitsweisen übernommen, kein Text. Die
Umsetzung schreibt alle Skill- und Referenztexte in eigenen Worten und eigener Struktur, ausschließlich
aus dieser Spec. Dateien aus mattpocock-skills werden dabei weder gelesen noch als Vorlage genutzt.
Deshalb entfällt ein Lizenzhinweis.

## 3. Begriffe

| Begriff | Bedeutung |
|---|---|
| Frontier | Alle offenen Entscheidungen, deren Voraussetzungen bereits geklärt sind. |
| Runde | Eine Nachricht mit der kompletten Frontier, danach die freie Antwort des Menschen. |
| Beleg-Tag | Herkunft einer Aussage: `Aussage` · `Git` · `Historie` · `Anhang` · `ungeklärt`. |
| Glossar-Ziel | Ort, an dem `domain-modeling` Begriffe pflegt: working-capturing-Glossar oder `CONTEXT.md`. |
| W-Eintrag | Eintrag in `## Entscheidungen`, den das Whiteboarding geschrieben hat (Entscheidung des Menschen). |
| R-Eintrag | Eintrag in `## Entscheidungen`, den der Spec-Review-Nacharbeiter geschrieben hat. |

## 4. Architektur

```
plugins/forge/
└── skills/
    ├── spec-whiteboarding/
    │   ├── SKILL.md                          Grundhaltung, Ablauf, Abbruch-Regel, Red Flags
    │   └── references/
    │       ├── spec-format.md                Pflicht-Abschnitte, AC-IDs, W-Einträge
    │       ├── grill-rounds.md               Rundenformat ❓/➡️, Frontier-Regeln
    │       └── ac-rules.md                   Gegeben/Wenn/Dann, prüfbar, Negativ-/Randfall
    ├── domain-modeling/
    │   ├── SKILL.md                          Begriffe herausfordern, schärfen, Szenarien, gegen Code prüfen
    │   └── references/
    │       ├── glossary-target.md            Wahl des Glossar-Ziels
    │       ├── context-format.md             Rückfall-Format CONTEXT.md / CONTEXT-MAP.md
    │       └── adr-format.md                 ADR-Format
    └── spec-whiteboarding-with-docs/
        └── SKILL.md                          dünn: Verbund + Vorrangregeln
```

**Konventionsentscheidungen:**
- Die Skills gehören vollständig dem Plugin. Es gibt keine Abhängigkeit von globalen Skills wie
  `writing-workitem`; die AC-Regeln stehen in `ac-rules.md`.
- Frontmatter nach `superpowers:writing-skills`: nur `name` + `description`, die `description`
  beginnt mit „Use when…“. Ausnahme: `spec-whiteboarding-with-docs` trägt zusätzlich
  `disable-model-invocation: true`.
- `spec-whiteboarding` und `domain-modeling` lösen über ihre `description` aus.
  `spec-whiteboarding-with-docs` startet nur manuell, wie das Original `grill-with-docs`.

## 5. Skill `spec-whiteboarding`

Übernimmt den globalen Skill. Was nicht unten als Änderung genannt ist, bleibt inhaltlich gleich.

**Bleibt:**
- **Whiteboard:** kein Code zeigen; Abläufe und Vergleiche als Skizze über `visualize`, Text knapp.
- **Belegpflicht:** Jede Aussage, Empfehlung und Antwort-Option trägt einen Beleg-Tag. `ungeklärt` heißt fragen, nie raten.
- **Sperre:** Ab dem Aufruf kein brainstorming, kein Plan, kein Code, bis die Spec geschrieben und bestätigt ist.
- **Fakten selbst suchen:** Was Code, Git, Historie oder Anhang beantworten können, wird nie beim Menschen erfragt.
- **Abbruch-Regel:** Bei „reicht jetzt“ einmal eine verdichtete Abschlussrunde anbieten. Erst eine zweite, informierte Ablehnung ist ein Abbruch.
- **Red Flags** und **Common Mistakes**, soweit sie nicht Output-Wahl oder ADO betreffen.

**Ändert sich:**
1. **Rundenformat** (`grill-rounds.md`), statt `AskUserQuestion`:
   ```
   ❓ **Q1** - **<Titel>**: <Frage, ggf. mit Optionen>

   ➡️ <Empfehlung> · <Beleg-Tag> — <Grund>
   ```
   - Pro Runde die komplette Frontier, fortlaufend nummeriert.
   - Eine Frage, deren Antwort von einer anderen offenen Frage derselben Runde abhängt, gehört in eine spätere Runde.
   - Bei `ungeklärt` ist der Grund eine ausgewiesene Vermutung („gängigster Fall“, „kleinster Scope“).
   - Faktensuche darf über einen SubAgent laufen. Solange sie läuft, warten nur die davon abhängigen Fragen; der Rest der Frontier wird gestellt.
2. **Bestätigung** umfasst zusätzlich Titel und Slug.
3. **Ausgabe nur als Datei:** `docs/forge/YYYY-MM-DD-<slug>/spec.md`. Die Wahl Datei/ADO/Chat entfällt ersatzlos.
4. **Spec-Format** nach Abschnitt 6.
5. **Übergabe:** Der Skill endet mit dem Spec-Pfad, dem kopierbaren Befehl
   `/dv-forge:spec-review docs/forge/<…>/spec.md` und dem Hinweis, den Review in einer frischen
   Session zu starten. Kein Commit, kein automatischer Start.

**Fehlerfall:** Existiert `docs/forge/YYYY-MM-DD-<slug>/` bereits, fragt der Skill nach und
schlägt einen abweichenden Slug vor. Er überschreibt nie.

## 6. Spec-Format (`spec-format.md`)

```markdown
# <Titel>

Status: bestätigt am <YYYY-MM-DD>

## Was, wie, wo, warum
<fachlich, kein Code>

## Theoretisches Verhalten nach Umsetzung
<was Anwender/System danach tut>

## Soll-Vorgaben
<Randbedingungen>

## Akzeptanzkriterien
- **AC-01** Gegeben <Vorbedingung>, wenn <Aktion>, dann <beobachtbares Ergebnis>.

## Entscheidungen
- **W · <Kurztitel>** · <Beleg-Tag> — <Antwort>
```

Regeln:
- AC-IDs zweistellig, lückenlos ab `AC-01`, in Reihenfolge des Auftretens.
- Jedes AC nach `ac-rules.md`: Gegeben/Wenn/Dann, beobachtbar und prüfbar. Mindestens ein
  Negativ- oder Randfall, wenn fachlich relevant. Verboten: „funktioniert korrekt“, „ist möglich“,
  „sollte“, „idealerweise“.
- **In sich abgeschlossen:** keine Links, keine Verweise auf Dateien, Tickets oder andere Dokumente.
  Inhalte aus Anhängen stehen zusammengefasst in der Spec; der Tag `Anhang` nennt nur die Herkunft.
- **WAS statt WIE:** keine Klassen, Dateipfade, Architektur oder Technik-Schritte.
- Jede inhaltliche Zeile trägt einen Beleg-Tag.
- Nur nach echtem Abbruch: Status `Abbruch am <YYYY-MM-DD>, <k> Punkte offen` und zusätzlich am
  Ende der Abschnitt `## Offen, bewusst nicht weiterverfolgt (Abbruch)` mit Einträgen
  `- **<Kurztitel>** · ungeklärt — <was offen ist>`.
- `## Entscheidungen` ersetzt den früheren Abschnitt „Bereits geklärte Fragen“. Der
  Spec-Review-Nacharbeiter hängt dort später seine R-Einträge an.

## 7. Skill `domain-modeling`

Eigene Neufassung. Das Verhalten ist unten vollständig beschrieben; diese Spec ist die einzige
Quelle (Abschnitt 2, Leitplanke).

**Start — Glossar-Ziel bestimmen (`glossary-target.md`):**
1. Ist der Skill `dv-working-capturing:glossary` in der Session verfügbar, ist das
   working-capturing-Glossar das Ziel. Begriffe werden ausschließlich über diesen Skill geschrieben;
   er bestimmt Ort und Format. Zusätzlich werden vorhandene Modul- und Feature-Profile gelesen.
2. Sonst ist das eigene Glossar das Ziel: `CONTEXT.md` im Repo-Root oder, falls
   `CONTEXT-MAP.md` existiert, das `CONTEXT.md` des passenden Kontexts. Format nach
   `context-format.md`. Dateien werden erst angelegt, wenn der erste Begriff geklärt ist.

**Eigenes Glossar-Format (`context-format.md`):**

```markdown
# Glossar — <Bereich>

<ein Satz: wofür dieser Bereich steht>

| Begriff | Bedeutung | Nicht verwenden |
|---|---|---|
| **<kanonischer Begriff>** | <was er IST, höchstens zwei Sätze> | <Synonyme, kommagetrennt> |
```

- Ein Konzept, ein kanonischer Begriff; konkurrierende Wörter stehen unter „Nicht verwenden“.
- Nur projektspezifische Fachbegriffe, keine allgemeinen Programmierbegriffe.
- Bei mehreren Bereichen listet `CONTEXT-MAP.md` jeden Bereich mit Pfad zu seinem `CONTEXT.md` und
  einem Satz Beschreibung.

**Eigenes ADR-Format (`adr-format.md`):**

```markdown
# ADR-<NNNN>: <Titel>

<YYYY-MM-DD> · Status: angenommen

## Kontext
## Entscheidung
## Verworfene Alternativen
## Folgen
```

**Während der Sitzung:**
- **Gegen das Glossar prüfen:** Widerspricht ein verwendeter Begriff dem Glossar, sofort benennen.
- **Unscharfe Begriffe schärfen:** einen kanonischen Begriff vorschlagen, Alternativen unter „Nicht verwenden“.
- **Szenarien:** Grenzfälle mit konkreten Szenarien erzwingen.
- **Gegen Code und Profile prüfen:** Widerspricht eine Aussage dem Code oder einem Profil, benennen.
- **Sofort schreiben:** Ein geklärter Begriff geht direkt ins Glossar-Ziel, nicht gesammelt.
- **ADRs sparsam:** nur anbieten, wenn eine Entscheidung schwer umkehrbar, ohne Kontext überraschend
  und Ergebnis eines echten Trade-offs ist. Ablage `docs/adr/NNNN-<slug>.md`, Format nach
  `adr-format.md`. `docs/adr/` wird erst beim ersten ADR angelegt.

Das Glossar enthält nur Begriffe, keine Implementierungsdetails und keine Spec-Inhalte.

## 8. Skill `spec-whiteboarding-with-docs`

Dünner Verbund: Er führt `dv-forge:spec-whiteboarding`
aus und nutzt dabei `dv-forge:domain-modeling`. Beide werden über das Skill-Tool geladen.

**Vorrangregeln:**
1. Schreiben ins Glossar-Ziel und ADRs sind trotz Sperre erlaubt; die Sperre gilt nur für
   brainstorming, Plan und Code.
2. Die Spec verwendet ausschließlich die kanonischen Begriffe des Glossars.
3. Belege aus Glossar, Profilen und ADRs tragen den Tag `Historie`.
4. Die Glossar-Arbeit ersetzt keine Runde: Ein Begriffskonflikt wird als Frage in die laufende
   Frontier aufgenommen.

## 9. Aufräumen

1. Den globalen Skill `~/.claude/skills/spec-whiteboarding` löschen, **nach ausdrücklicher
   Bestätigung** des Menschen, weil er außerhalb des Repos liegt.
2. Verweise auf `spec-whiteboarding` in anderen globalen Skills suchen (mindestens
   `aligning-understanding`, `writing-workitem`) und dem Menschen als Liste vorlegen. Angepasst wird
   nur nach Bestätigung.

## 10. Tests

Drucktests nach `superpowers:writing-skills`, jeweils Baseline ohne Skill gegen Lauf mit Skill:
1. **spec-whiteboarding unter Druck** („schreib einfach schon die Spec“): grillt weiter, bis die
   Frontier leer ist oder eine zweite Ablehnung vorliegt.
2. **spec-whiteboarding Ergebnis:** Datei unter `docs/forge/YYYY-MM-DD-<slug>/spec.md`; AC-IDs ab
   `AC-01`; `## Entscheidungen` mit W-Einträgen; keine Links; kein ADO-/Chat-Angebot.
3. **domain-modeling Konflikt:** ein Begriff widerspricht dem Glossar; der Widerspruch wird benannt.
4. **domain-modeling Ziel:** mit verfügbarem `dv-working-capturing:glossary` wird dieser Skill
   genutzt; ohne ihn entsteht `CONTEXT.md`.
5. **with-docs Verbund:** Rundenformat und Begriffsprüfung sind beide sichtbar; die Spec nutzt die
   kanonischen Begriffe.
6. **Verbund mit Review:** eine erzeugte Spec löst bei `spec-review-completeness` kein 🔴 wegen
   fehlender AC-IDs aus und bei `spec-review-consistency` keines wegen externer Verweise.

**Ergebnis 2026-09-25** (Läufe als SubAgent auf Sonnet, Skill-Dateien gelesen statt installiert):
- Test 1 (Druck, „schreib einfach schon die Spec“): Baseline schrieb sofort eine Spec mit markierten Annahmen · mit Skill bestanden — keine Datei, offene Zweige als eine Runde ❓/➡️ angeboten.
- Test 1 (zweite Ablehnung): Baseline schrieb sofort, Annahmen im Fließtext · mit Skill bestanden — Abbruch erkannt, Entwurf mit `Status: Abbruch am …, 3 Punkte offen` und Abschnitt „Offen, bewusst nicht weiterverfolgt (Abbruch)“, Schreiben erst nach Bestätigung.
- Test 2 (Ergebnis): Baseline schrieb `csv-export.md` ins Wurzelverzeichnis und übernahm `AB#4711` als Referenz · mit Skill bestanden — `docs/forge/2026-09-25-csv-export/spec.md`, fünf Abschnitte, `AC-01`–`AC-03`, vier W-Einträge, keine Verweise, Übergabe mit Befehl und Hinweis auf frische Session, kein Commit. Beobachtung: AC-Zeilen tragen keinen Beleg-Tag; die AC-Vorlage in Abschnitt 6 zeigt ebenfalls keinen.
- Zielordner vorhanden (AC-05): Baseline überschrieb die vorhandene Spec · mit Skill bestanden — nachgefragt, Slug `csv-export-2` vorgeschlagen, nichts geschrieben.
- Test 3 (domain-modeling Konflikt): Baseline fragte „erledigt“ ab, übersah „Ticket“ gegen das Glossar · mit Skill bestanden — Widerspruch „Ticket“/„Aufgabe“ benannt, kanonischer Begriff vorgeschlagen, drei Grenzfall-Szenarien.
- Test 4 (domain-modeling Ziel): mit verfügbarem Glossar-Skill nannten Baseline und Skill-Lauf den Aufruf von `dv-working-capturing:glossary`, der Skill-Lauf zusätzlich Synonym und Szenarien, keine `CONTEXT.md` · ohne Glossar-Skill legte die Baseline nichts an; mit Skill bestanden — `CONTEXT.md` im Format aus Abschnitt 7 mit **Serie** sofort angelegt.
- Test 5 (with-docs Verbund): Baseline stellte freie Fragen ohne Begriffsprüfung und schrieb eine Spec mit „Ticket“ außerhalb jedes Formats · mit Skill bestanden — Begriffskonflikt als Q1 der kompletten Frontier im Rundenformat; die erzeugte Spec nennt „Ticket“ nur im W-Eintrag zum Begriff, Beleg-Tag `Historie`.

## 11. Nachtrag Spec-Review-Spec

In `2026-09-25-dv-forge-spec-review-design.md`, Abschnitt 10: Reviewer behandeln W-Einträge in
`## Entscheidungen` als bindende Entscheidungen des Menschen. Ein W-Eintrag ist nie selbst ein
Finding; ein Widerspruch zwischen Spec-Inhalt und W-Eintrag ist eines. Der Nacharbeiter ändert und
entfernt W-Einträge nicht.

## 12. Akzeptanzkriterien

- **AC-01** `spec-whiteboarding` stellt jede Runde im Format aus Abschnitt 5 mit der kompletten Frontier.
- **AC-02** Jede Empfehlung trägt einen Beleg-Tag und einen ausgeschriebenen Grund.
- **AC-03** Vor dem Schreiben bestätigt der Mensch Inhalt, Titel und Slug.
- **AC-04** Die Spec wird ausschließlich als `docs/forge/YYYY-MM-DD-<slug>/spec.md` geschrieben; es gibt kein ADO- oder Chat-Angebot.
- **AC-05** Existiert der Zielordner bereits, wird nachgefragt und nichts überschrieben.
- **AC-06** Die Spec folgt Abschnitt 6: fünf Pflicht-Abschnitte, AC-IDs lückenlos ab `AC-01`, W-Einträge in `## Entscheidungen`.
- **AC-07** Die Spec enthält keine Links und keine Verweise auf externe Dokumente, Dateien oder Tickets.
- **AC-08** Bei „reicht jetzt“ wird genau einmal eine Abschlussrunde angeboten; erst die zweite Ablehnung führt zum Abbruch-Format.
- **AC-09** Der Skill endet mit Spec-Pfad, kopierbarem `/dv-forge:spec-review`-Befehl und Hinweis auf frische Session; er committet nichts.
- **AC-10** `domain-modeling` schreibt über `dv-working-capturing:glossary`, wenn dieser Skill verfügbar ist, sonst in `CONTEXT.md` nach `context-format.md`.
- **AC-11** Ein geklärter Begriff wird sofort geschrieben, nicht gesammelt.
- **AC-12** Ein ADR wird nur angeboten, wenn alle drei Kriterien aus Abschnitt 7 erfüllt sind.
- **AC-13** `spec-whiteboarding-with-docs` startet nur manuell und wendet die Vorrangregeln aus Abschnitt 8 an.
- **AC-14** Kein Skill- oder Referenztext ist aus mattpocock-skills kopiert oder umformuliert; Glossar- und ADR-Format entsprechen Abschnitt 7. Es gibt keine `THIRD-PARTY-NOTICES.md`.
- **AC-15** Der globale `spec-whiteboarding` wird erst nach ausdrücklicher Bestätigung gelöscht.
- **AC-16** Die Drucktests aus Abschnitt 10 zeigen gegenüber der Baseline das geforderte Verhalten.

## 13. Entscheidungen

- **C1 · Bestand** — globaler `spec-whiteboarding` zieht ins Plugin um und wird danach gelöscht.
- **C2 · Output** — nur Datei; ADO und Chat entfallen.
- **C3 · Ablage** — Ordner je Vorhaben `docs/forge/YYYY-MM-DD-<slug>/`, damit der Plan später daneben liegt.
- **C4 · Format** — ein Abschnitt `## Entscheidungen` statt „Bereits geklärte Fragen“; W- und R-Einträge; ACs als `AC-01` …
- **C5 · Grill-Stil** — grilling-Textformat statt `AskUserQuestion`.
- **C6 · Abgrenzung** — Basis schlägt passiv nach; with-docs modelliert aktiv.
- **C7 · domain-modeling** — als eigener Skill neu geschrieben; Ziel ist das working-capturing-Glossar, sonst das eigene `CONTEXT.md`.
- **C8 · with-docs** — Verbund aus spec-whiteboarding und domain-modeling nach dem Vorbild von grill-with-docs.
- **C9 · Write-back** — sofort, wie im Original; ersetzt die frühere Wahl „gebündelt am Ende“.
- **C10 · ADRs** — übernommen, nach den drei Kriterien.
- **C11 · Übergabe** — Befehl ausgeben, kein Commit, kein Auto-Start.
- **C12 · Lizenz** — Neufassung aus der Spec statt Anpassung der Originaltexte; kein Lizenzhinweis nötig.
