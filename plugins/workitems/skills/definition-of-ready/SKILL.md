---
name: definition-of-ready
description: Use when a Requirement, Epic/Feature/Story, Steps, Spec, Plan or Workitem should be checked against the Definition of Ready, before it goes to the Ready review or into Iteration Planning — "DoR prüfen", "ist das Ready", "bereit für Review", "Umsetzungsreife prüfen". Not for writing or splitting requirements (→ requirement-definition), not for story text (→ writing-workitem), not for the Definition of Done.
---

# Definition of Ready prüfen

## Overview

Vorab-Prüfer: bewertet ein Artefakt gegen den Katalog in `references/definition-of-ready.md` und nennt die Lücken. Das Ergebnis ist eine **Empfehlung** („bereit für den Review“ / „nicht bereit“). „Ready“ vergibt erst ein Mensch oder Team im Review, nie dieser Skill.

**Kernprinzip:** Der Katalog bleibt wortgleich maßgeblich. Der Skill bewertet, er ändert weder den Katalog noch das Artefakt.

## When to Use

- Ein Artefakt (Requirement, Steps, Spec, Plan, Workitem) soll vor dem Ready-Review auf Lücken geprüft werden.
- Ein als Ready geführtes Artefakt verliert durch neue Erkenntnisse aus der Umsetzung möglicherweise seine Umsetzungsreife.

**Nicht für:** Erstellen oder Schneiden von Anforderungen (→ `requirement-definition`), Story-Text (→ `writing-workitem`), Status setzen oder Tickets anlegen/ändern (→ `ado-cli`), Definition of Done.

## Ablauf

1. **Eingabe:** Artefakt muss im Chat stehen oder als Datei vorliegen. Kommt ein Workitem nur als Nummer, nicht prüfen und nicht selbst laden: kurz antworten (Stopp, Grund: nur Nummer ohne Inhalt, was fehlt: Inhalt im Chat oder als Datei, z. B. über `ado-cli` geladen). Fragen zu Umfang und UI erst nach Eingang des Inhalts.
2. **Art erkennen:** Requirement, Steps, Spec, Plan oder Workitem (unabhängig von einer Kopfzeile `Art:` in der Spec). Eindeutig → Art im Ergebnis nennen. Unklar → genau einmal nachfragen.
3. **Umfang:** Einzelprüfung (nur dieses Artefakt als Quelle) oder Paket (zusammengehörige Artefakte, z. B. Workitem + Spec + Plan; Kriterien über alle zusammen auswerten, Fundstelle nennt das Artefakt). Wahl beim Menschen.
4. **Kriterienliste holen:** `node "<SKILL_DIR>/scripts/dor-catalog.js"` (`<SKILL_DIR>` = „Base directory“ dieses Skills) gibt alle Kriterien mit fester ID, Block, UI-Flags und den doppelten Paaren aus. Nur diese IDs bewerten, keine selbst erfinden.
5. **Mechanische Befunde:** liegt das Artefakt als Datei vor, `node "<SKILL_DIR>/scripts/dor-lint.js" <datei>` ausführen (steht es nur im Chat, vorher in eine Datei im Scratchpad schreiben). Befunde: AC-Format, unscharfe Wörter, Platzhalter, Implementierungsdetails, fehlende Stichworte. AC-Regeln greifen bei `AC-xx`-Zeilen, Gherkin-Szenarien und Aufzählungspunkten unter einer Überschrift „Akzeptanzkriterien“. Sie sind Evidenz mit Zeilennummer, kein Urteil. Ein fehlendes Stichwort ist nur Textsuche; das Urteil bildest du aus dem Inhalt.
6. **Kriterien bewerten:** Jedes Kriterium genau einmal, mit Begründung und Fundstelle (oder Hinweis, dass keine existiert).
7. **Nachfragen:** Lässt sich ein Kriterium aus dem Artefakt nicht beurteilen (Freigabe PO, durchgeführter Design-Review, geteiltes Verständnis der Umsetzung), den Menschen nach Antwort und Nachweis fragen und beides im Ergebnis festhalten. Kein Nachweis → „nicht prüfbar“.
8. **Ergebnis erzeugen:** Urteile als JSON in eine Datei im Scratchpad schreiben und `node "<SKILL_DIR>/scripts/dor-verdict.js" <datei>` ausführen. Das Skript validiert, berechnet Gesamturteil und Lückenliste und rendert das Ergebnisformat. Bei Exit 1 die Fehler beheben und erneut ausführen. Die Skriptausgabe im Chat ausgeben, Gesamturteil nicht selbst bilden. Keine Datei im Repo, keine Ticket-Änderung, Artefakt unverändert.

### Eingabeformat für `dor-verdict.js`

```json
{
  "art": "Spec",
  "umfang": "Einzel",
  "quellen": ["spec.md"],
  "hatUI": false,
  "urteile": [
    { "id": "PF-01", "urteil": "erfüllt", "begruendung": "…", "fundstelle": "spec.md Z. 12" },
    { "id": "UX-01", "urteil": "nicht zutreffend", "begruendung": "kein UI", "bestaetigt": true },
    { "id": "PF-05", "urteil": "nicht erfüllt", "begruendung": "…", "nachfrage": "…" },
    { "id": "PF-09", "urteil": "bewusst abgewichen", "begruendung": "…",
      "abweichung": { "was": "…", "warum": "…", "verantwortlich": "…", "massnahme": "…" } }
  ]
}
```

`art`: Requirement, Steps, Spec, Plan oder Workitem. `umfang`: Einzel (eine Quelle) oder Paket (mindestens zwei, jede Fundstelle nennt ihr Artefakt). Optional je Urteil: `nachweis` (nur ein belegender Nachweis des Menschen; Aussagen ohne Beleg gehören in `begruendung`), `nachfrage` (bei nicht erfüllt und nicht prüfbar). `hatUI` ist eine Annahme: dem Menschen nennen und bestätigen lassen; steht es auf `true`, ist UX-06 „nicht zutreffend“ (bestätigt), bei `false` die UI-Kriterien UX-01, UX-02, UX-03, UX-05. Alle 28 Kriterien in `urteile`, Reihenfolge egal. Kein Feld `gesamturteil`.

## Urteile

| Urteil | Wann |
|---|---|
| erfüllt | Artefakt oder Nachweis belegt das Kriterium |
| nicht erfüllt | Lücke; Standard, wenn keine Abweichung genannt wurde |
| nicht zutreffend | Skill schlägt mit Begründung vor, Mensch bestätigt (`bestaetigt: true` nur nach echter Bestätigung, nie selbst setzen). Lehnt er ab, wie jedes andere Kriterium prüfen. Ist niemand erreichbar: „nicht prüfbar“ mit `nachfrage`, die um Bestätigung bittet |
| nicht prüfbar | Der Sachverhalt liegt außerhalb des Artefakts (Freigabe, Review, geteiltes Verständnis, Validierung von Annahmen), und der Mensch nennt keinen Nachweis. Gehört das Gefragte ins Artefakt und fehlt dort, ist es „nicht erfüllt“ |
| bewusst abgewichen | Nur wenn der Mensch ausdrücklich eine Abweichung mit Risikoentscheidung nennt: was, warum, verantwortliche Person, Maßnahme. Entscheidung steht für den Review sichtbar im Ergebnis |

## Gesamturteil

Das Skript `dor-verdict.js` berechnet es:

- **bereit für den Review:** jedes zutreffende Kriterium erfüllt, Lückenliste leer.
- **nicht bereit:** mindestens ein zutreffendes Kriterium nicht erfüllt, nicht prüfbar oder bewusst abgewichen; Lückenliste nennt alle.
- Jedes Ergebnis weist darauf hin: „Ready“ vergibt erst der Review durch Mensch oder Team. Das Urteil „Ready“ kommt nie vor.

## Regeln

- **Konventionen des Projekts** (z. B. Wikilinks, TRUMPF-Bezug): Kriterium nicht stillschweigend streichen oder weichspülen. Wie jedes andere bewerten; passt die Konvention nicht zum Projekt, als „nicht zutreffend“ vorschlagen oder als bewusste Abweichung festhalten.
- **UX-06 ohne UI-Anteil** verlangt, dass der Entfall im Artefakt begründet steht. Eine Bestätigung nur im Chat genügt nicht: „nicht erfüllt“ mit der Nachfrage, ihn im Artefakt festzuhalten.
- **Kein UI-Anteil:** UX/Design-Block als „nicht zutreffend“ vorschlagen, erst nach Bestätigung so werten. Data-Flow- und Architekturkriterien in jedem Fall prüfen.
- **Zeitdruck** ändert kein Urteil. Nur eine Risikoentscheidung macht aus „nicht erfüllt“ ein „bewusst abgewichen“.
- **Doppelte Kriterien** („Perspektiven gemeinsam betrachtet“, „Annahmen validiert oder als Risiko dokumentiert“ stehen je zweimal im Katalog): je einmal bewerten, im Ergebnis auf die Doppelung hinweisen, Katalog nicht ändern.
- **Lücken:** konkret nennen, was fehlt, und gezielt nachfragen. Das Artefakt nicht umschreiben, keinen neuen Entwurf erzeugen.
- **Erneute Prüfung** (auch bei bereits als Ready geführtem Artefakt): vollständig neu prüfen, Kriterien nennen, die nicht mehr erfüllt sind (möglicher Rückfall in Refinement).

## Ergebnisformat

Kommt vollständig aus `dor-verdict.js` (Art und Umfang, Tabelle mit ID, Kriterium, Urteil, Begründung/Fundstelle, Gesamturteil, Lücken, Abweichungen, Hinweise, Schlusssatz). Nichts davon selbst nachbauen oder kürzen.

## Red Flags

| Gedanke | Stattdessen |
|---|---|
| „Das sieht fertig aus, also Ready“ | Nur Empfehlung „bereit für den Review“ |
| „Zeitdruck, das lassen wir durch“ | Urteil bleibt; Risikoentscheidung vom Menschen verlangen |
| „Freigabe wird schon da sein“ | Nachfragen, Nachweis festhalten, sonst „nicht prüfbar“ |
| „Ich formuliere das Artefakt gleich um“ | Lücke nennen, nachfragen, nicht umschreiben |
| „Kriterium stört, ich lasse es weg“ | Als „nicht zutreffend“ vorschlagen und bestätigen lassen |
