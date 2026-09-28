# Spec-Format

Die Spec liegt am Ort aus `Spec-Ablage` der Projekt-Einstellungen, Default `docs/forge/<datum>-<slug>/spec.md`. Sie hat genau diese Abschnitte in dieser Reihenfolge:

```markdown
# <Titel>

Status: bestätigt am <YYYY-MM-DD>
Art: frei | verankert
Workitem: <Nummer>
Basis: <Commit-Kurzhash>

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

## Regeln

1. **AC-IDs:** zweistellig, lückenlos ab `AC-01`, in der Reihenfolge des Auftretens. Jedes AC folgt `ac-rules.md`.
2. **W-Einträge:** Jede Entscheidung des Menschen aus den Runden steht als W-Eintrag unter `## Entscheidungen`. Der Beleg-Tag nennt die Herkunft der Antwort, meist `Aussage`.
3. **In sich abgeschlossen:** keine Links, keine Verweise auf Dateien, Tickets oder andere Dokumente. Inhalte aus Anhängen stehen zusammengefasst in der Spec; der Tag `Anhang` nennt nur die Herkunft. Ausnahme ist nur der Kopf.
4. **WAS statt WIE:** keine Klassen, Dateipfade, Architektur oder Technik-Schritte.
5. **Beleg-Tags:** Jede inhaltliche Zeile trägt genau einen Beleg-Tag: `Aussage` · `Anhang` · `Historie` · `Git` · `ungeklärt`. Er steht am Zeilenende nach ` · `, auch bei AC-Zeilen; ein Prosa-Absatz trägt ihn an seinem Ende. In W- und Abbruch-Einträgen steht er nach dem Kurztitel. Stützen mehrere Quellen eine Zeile, gewinnt die erste in der Reihenfolge `Aussage` → `Anhang` → `Historie` → `Git`. Eine vom Menschen bestätigte Empfehlung ist `Aussage`. Eine Spec der Art `frei` kennt nur `Aussage`, `Anhang` und `ungeklärt`.
6. **Keine offene Frage:** Geschrieben wird erst, wenn die Frontier leer ist. Einzige Ausnahme ist der echte Abbruch, unten.
7. **Letzter Pflicht-Abschnitt:** `## Entscheidungen`. Der Spec-Review hängt dort später eigene Einträge an; W-Einträge bleiben dabei unverändert. Der Nacharbeiter im Folge-Modus (`/dv-forge:review-followup`) schreibt dort F-Einträge `- **F · <Stelle>** — … — Vorschlag <n>: <Begründung>`.

## Kopf
Die Zeilen unter dem Titel sind Metadaten, kein fachlicher Inhalt, und tragen keinen Beleg-Tag.
- `Art`: `frei` aus `spec-whiteboarding`, `verankert` aus `spec-whiteboarding-with-docs`. Die Art steuert den Spec-Review.
- `Workitem`: nur, wenn das Projekt Workitem-Nummern nutzt (`Workitem` in den Projekt-Einstellungen ist nicht `keine`). Sonst entfällt die Zeile.
- `Basis`: Ausgabe von `git rev-parse --short HEAD` beim Schreiben.

## Nur nach echtem Abbruch

Die Status-Zeile lautet `Status: Abbruch am <YYYY-MM-DD>, <k> Punkte offen`. Am Ende der Spec, nach `## Entscheidungen`, folgt zusätzlich:

```markdown
## Offen, bewusst nicht weiterverfolgt (Abbruch)
- **<Kurztitel>** · ungeklärt — <was offen ist>
```

Die Abbruch-Entscheidung selbst steht als W-Eintrag mit Tag `Aussage`, denn sie ist zitierbar. Kein offener Punkt wird als W-Eintrag verbucht.
