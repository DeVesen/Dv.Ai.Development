# Plan-Format

Der Plan liegt am Zielpfad aus Plan-Writing, Default `plan.md` im Ordner der Spec. Er hat genau diesen Aufbau. Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks.

````markdown
# <Titel> — Umsetzungsplan

> Umsetzung mit `/dv-forge:implementation <plan.md>`, Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** <ein Satz>
**Architektur:** <2–3 Sätze>
**Tech-Stack:** <Technologien>
**Spec:** <Pfad zur spec.md, relativ zur Checkout-Wurzel>
**Basis:** <Commit-Kurzhash beim Schreiben>

## Global Constraints
- <projektweite Vorgabe, Wert wörtlich aus der Spec>

---

### Task 1: <Komponente>

**ACs:** AC-01, AC-03

**Dateien:**
- Create: `exakter/pfad.ext`
- Modify: `exakter/pfad.ext:123-145` · `Klasse.methode`
- Test: `tests/exakter/pfad.ext`

**Interfaces:**
- Consumes: <exakte Signaturen aus früheren Tasks>
- Produces: <exakte Namen, Parameter- und Rückgabetypen für spätere Tasks>

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  <vollständiger Testcode>
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `<befehl oder Tool-Aufruf>` — erwartet: FAIL `<testname>`
- [ ] **Schritt 3: Minimal implementieren**
  <vollständiger Code>
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `<befehl oder Tool-Aufruf>` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add <dateien>` · `git commit -m "<message>"`

Absicherungstest, für ein AC wie „bleibt wie bisher“ ohne Code-Änderung:

- [ ] **Schritt 1: Absicherungstest schreiben oder bestehenden nennen**
  <vollständiger Testcode oder Testname>
- [ ] **Schritt 2: Absicherungstest laufen lassen**
  Befehl: `<befehl oder Tool-Aufruf>` — erwartet: PASS `<testname>`; rot ist ein Befund, kein Grund, Code zu ändern
- [ ] **Schritt 3: Commit** (entfällt, wenn nur ein bestehender Test lief)

## Entscheidungen
- **W · <Kurztitel>** · Aussage | delegiert — <Antwort>
- **E · <Kurztitel>** · Planer — <Wahl und Grund>
- **R<r> · <Stelle>** — geändert | nicht geändert | spec-rückfrage — <Begründung>
- **F · <Stelle>** — geändert | nicht geändert | spec-rückfrage — Vorschlag <n>: <Begründung>
````

## Regeln

1. **Kopf:** `Ziel` ist genau ein Satz, `Architektur` zwei bis drei Sätze. `Spec` nennt den Pfad der Spec relativ zur Checkout-Wurzel; der Umsetzer liest beide. `Basis` ist die Ausgabe von `git rev-parse --short HEAD` beim Schreiben; die Umsetzung warnt, wenn sich Plan-Dateien seitdem geändert haben. Der Kopf nennt den Umsetzungs-Befehl `/dv-forge:implementation <plan.md>`.
2. **Global Constraints:** Jede projektweite Vorgabe der Spec — Versionsgrenzen, erlaubte Abhängigkeiten, Namens- und Textregeln, Plattformvorgaben — steht hier als eine Zeile, mit exakt den Werten aus der Spec. Dazu die Kernregeln der Planungs-Skills, je Regel eine Zeile mit dem Skill-Namen. Jeder Task erbt diesen Abschnitt, ohne ihn zu wiederholen.
3. **Task-Überschriften** lauten exakt `### Task <n>: <Komponente>`. `<n>` ist eine ganze Zahl, lückenlos aufsteigend ab 1. Zusätze wie „Task 3a“ oder „Task 3.1“ sind verboten, denn spätere Stufen zerlegen den Plan per Skript.
4. **ACs:** Jeder Task nennt unter `**ACs:**` die AC-IDs, die er umsetzt. Jedes AC der Spec steht in mindestens einem Task.
5. **Dateien:** exakte Pfade relativ zur Checkout-Wurzel. `Create` für neue Dateien, `Modify` für bestehende. Jede Testdatei steht unter `Test`, neu oder bestehend; eine bestehende bekommt nach `·` einen Anker wie bei `Modify`.
6. **Stabiler Anker bei `Modify`:** Nach `·` steht ein Anker, der auch dann gültig bleibt, wenn ein früherer Task dieselbe Datei ändert: ein Symbol (`Klasse.methode`, Funktionsname) oder, bei Dateien ohne Symbole, eine eindeutige Überschrift bzw. Zeichenfolge in Backticks. Maßgeblich ist der Anker; die Zeilenangabe dient nur der Orientierung.
7. **Interfaces:** Der Umsetzer eines Tasks sieht nur seinen Task. `Consumes` und `Produces` sind sein einziger Weg, Namen und Typen der Nachbar-Tasks zu kennen — deshalb exakte Funktionsnamen, Parameter- und Rückgabetypen, keine Umschreibungen.
8. **Schritte:** Jeder Code-Schritt enthält den vollständigen Code in einem Code-Block. Jeder Lauf-Schritt nennt den genauen Befehl bzw. Tool-Aufruf und das erwartete Ergebnis: Testname plus `FAIL` oder `PASS` genügt. Eine Meldung zitierst du nur, wenn du sie im Code oder in der Doku nachgesehen hast.
9. **Checkout-Wurzel:** Braucht ein Befehl einen absoluten Pfad, schreibst du `<R>/<pfad>`. `<R>` ist kein verbotener Platzhalter; der Umsetzer setzt die Ausgabe von `git rev-parse --show-toplevel` ein.
10. **Befehl oder Tool-Aufruf:** Eine Verifikation ist ein Shell-Befehl oder ein Tool-Aufruf mit exakten Parametern, z. B. `dv-forge: dotnet-test --path <R>/src/App.Tests -- --filter OrderTests` oder `dv-forge: angular-test --root <R>/src/frontend -- --include src/app/<pfad>.spec.ts`; Argumente nach `--` reicht das Skript an das Test-Werkzeug durch. `dv-forge: <plattform>-<kommando>` löst das Brief-Skript in den Skript-Aufruf auf. Maßgeblich ist die Projekt-`CLAUDE.md`: Verbietet sie einen Weg, etwa Tests über die Shell, nutzt der Plan den dort vorgeschriebenen. Ein Befehl, den der Umsetzer nicht ausführen darf, ist ein Plan-Fehler.
11. **Commit pro Task:** Der letzte Schritt jedes Tasks staged genau die Dateien des Tasks und committet.
12. **Entscheidungen:** Jede Antwort des Menschen während der Planung steht als W-Eintrag mit Tag `Aussage` oder `delegiert`, wie in der Spec. W-Einträge sind bindend. Eine sichtbare Entwurfswahl, die kein AC festlegt und nach der du nicht fragen musstest (etwa wo eine Spalte hängt), steht als E-Eintrag mit Grund; E-Einträge sind nicht bindend, Reviewer dürfen sie anfechten. Legt eine Wahl die Form eines AC-Ergebnisses fest, ist sie eine Frage, kein E-Eintrag. Gab es keine Frage an den Menschen, steht dort die Zeile `- Keine Fragen an den Menschen.` R-Einträge schreibt nur der Nacharbeiter des Plan-Reviews. F-Einträge schreibt nur der Nacharbeiter im Folge-Modus (`/dv-forge:review-followup`).
