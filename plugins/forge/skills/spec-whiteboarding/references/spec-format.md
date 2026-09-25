# Spec-Format

Die Spec liegt als `docs/forge/YYYY-MM-DD-<slug>/spec.md` vor. Sie hat genau diese Abschnitte in dieser Reihenfolge:

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

## Regeln

1. **AC-IDs:** zweistellig, lückenlos ab `AC-01`, in der Reihenfolge des Auftretens. Jedes AC folgt `ac-rules.md`.
2. **W-Einträge:** Jede Entscheidung des Menschen aus den Runden steht als W-Eintrag unter `## Entscheidungen`. Der Beleg-Tag nennt die Herkunft der Antwort, meist `Aussage`.
3. **In sich abgeschlossen:** keine Links, keine Verweise auf Dateien, Tickets oder andere Dokumente. Inhalte aus Anhängen stehen zusammengefasst in der Spec; der Tag `Anhang` nennt nur die Herkunft.
4. **WAS statt WIE:** keine Klassen, Dateipfade, Architektur oder Technik-Schritte.
5. **Beleg-Tags:** Jede inhaltliche Zeile trägt einen Beleg-Tag: `Aussage` · `Git` · `Historie` · `Anhang` · `ungeklärt`. Er steht am Zeilenende nach ` · `, auch bei AC-Zeilen; ein Prosa-Absatz trägt ihn an seinem Ende. In W- und Abbruch-Einträgen steht er nach dem Kurztitel.
6. **Keine offene Frage:** Geschrieben wird erst, wenn die Frontier leer ist. Einzige Ausnahme ist der echte Abbruch, unten.
7. **Letzter Pflicht-Abschnitt:** `## Entscheidungen`. Der Spec-Review hängt dort später eigene Einträge an; W-Einträge bleiben dabei unverändert.

## Nur nach echtem Abbruch

Die Status-Zeile lautet `Status: Abbruch am <YYYY-MM-DD>, <k> Punkte offen`. Am Ende der Spec, nach `## Entscheidungen`, folgt zusätzlich:

```markdown
## Offen, bewusst nicht weiterverfolgt (Abbruch)
- **<Kurztitel>** · ungeklärt — <was offen ist>
```

Die Abbruch-Entscheidung selbst steht als W-Eintrag mit Tag `Aussage`, denn sie ist zitierbar. Kein offener Punkt wird als W-Eintrag verbucht.
