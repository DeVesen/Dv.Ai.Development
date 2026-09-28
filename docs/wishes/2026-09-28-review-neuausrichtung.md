# Wunsch: Spec- und Plan-Review neu ausrichten

**Stand:** 2026-09-28 · Entwurf zum Prüfen durch den Menschen
**Auslöser:** Die Reviews finden Runde um Runde neue Kleinigkeiten und hören nicht auf („immer wieder das Gleiche“). Beispiel: Randfall-Spirale bei der Sortierregel in der Spec `ai-skripte-assets-liste`.

## Grundregel für alle Reviews

**Einmal suchen, danach nur noch nachprüfen.**

Eine vollständige Suche mit allen Blickwinkeln gibt es nur einmal. Die Folgerunde prüft nur, ob die gemeldeten Punkte erledigt sind. Sie sucht nicht neu. Das ist der Schnitt, der bisher fehlt: Heute startet jede Runde frische Reviewer auf ein inzwischen längeres Dokument, die immer etwas Neues finden.

Die Regel gilt auch für spätere Reviewer, z. B. geplante Architektur-Reviewer.

---

## Teil 1: Spec-Review

### Ziel
Die Spec ist **stimmig, verständlich und grob umsetzbar**. Sie muss nicht perfekt sein. Details entscheidet der Plan.

Der Reviewer ist kein Oberlehrer. Er sucht, ob aus verschiedenen Blickwinkeln noch etwas Wesentliches auffällt.

### Ablauf
1. **Einmal suchen:** Die Reviewer prüfen parallel aus ihren Blickwinkeln (Vollständigkeit, Konsistenz, Machbarkeit, Klarheit, Profile).
2. **Scout, dann Nacharbeit:**
   - Der Scout prüft zu jedem Finding, ob sich die Antwort aus der Spec, aus Vorgaben (Profile, Glossar) oder aus dem Bestand (Code) ergibt, und macht Vorschläge.
   - Die Nacharbeit bekommt die Findings **und** die Scout-Vorschläge und entscheidet mit der Spec, was sie anpasst.
   - Was keiner klären kann, geht an den Menschen: **einmal und gebündelt**, je Regel eine Frage mit allen Unterfällen und einer empfohlenen Antwort.
3. **Einmal nachprüfen:** Nur die gemeldeten Punkte werden geprüft: erledigt oder nicht. Keine neue Suche.
4. **Ende:** Der Rest steht als Hinweis im Bericht.

Höchstens zwei Review-Durchläufe je Lauf.

### Was blockt (🔴)
Nur, was den Plan scheitern lässt:
- ein Widerspruch in der Spec
- fehlendes Verhalten auf Ebene Funktion oder AC
- eine Anforderung, die sich nicht erfüllen lässt

Alles, was der Plan sinnvoll selbst entscheiden kann, ist ein Hinweis (🟡), z. B. Details wie Sortierung nach Diakritik.

### Was sich gegenüber heute ändert
| Heute | Neu |
|---|---|
| Jede Runde sucht komplett neu | Nur Runde 1 sucht, Runde 2 prüft nach |
| 🔴 = „Implementierer müsste raten“ (unbegrenzt) | 🔴 = „Plan scheitert daran“ |
| Scout läuft erst ganz am Ende, nur beratend | Scout läuft vor der Nacharbeit |
| Nacharbeit sieht keinen Bestand, schickt jede neue Regel einzeln an den Menschen | Nacharbeit nutzt Scout-Vorschläge, fragt gebündelt |
| Loop bis 0 × 🔴, Cap oder Stillstand | Höchstens zwei Durchläufe |

### Schutz vor Detail-Dauerläufern
Beispiel: Groß- oder Kleinschreibung, ß oder ss, Umlaute.
1. **Deckel:** Höchstens zwei Durchläufe je Lauf, egal was gefunden wird.
2. **Einstufung:** Solche Schreibweisen-Details sind ein Hinweis, der Plan entscheidet sie. Das steht als Beispiel wörtlich im Reviewer-Auftrag, damit der Reviewer es nicht doch als 🔴 einstuft.
3. **Nachprüfen:** Runde 2 prüft nur die gemeldeten Punkte. Ein neuer Randfall, der erst durch eine Antwort entsteht, wird dort nicht gesucht.
4. **Über Läufe hinweg:** Hat der Mensch eine Regel als W-Eintrag entschieden, gilt sie als abgeschlossen. Randfälle dieser Regel sind in allen späteren Läufen höchstens ein Hinweis.

---

## Teil 2: Plan-Review

> Entwurf, noch zu bestätigen.

### Ziel
Der Plan ist **umsetzbar**, und **alles aus der Spec ist im Plan enthalten**.

### Ablauf
Gleich wie beim Spec-Review: einmal suchen → Scout, dann Nacharbeit → einmal nachprüfen → Ende.

### Was blockt (🔴)
Nur, was die Umsetzung scheitern lässt:
- ein AC der Spec fehlt im Plan oder ist nur teilweise umgesetzt
- der Umsetzer bleibt stecken: falsche Reihenfolge, fehlende Datei oder fehlender Anker, Platzhalter statt Code
- ein Schritt nutzt einen Befehl, den das Projekt verbietet

Alles andere ist ein Hinweis (🟡).

### Reviewer
| Reviewer | Rolle | Kann blocken |
|---|---|---|
| `coverage` | Ist alles aus der Spec im Plan? | ja |
| `feasibility` | Ist der Plan in dieser Reihenfolge umsetzbar? | ja |
| `buildability` | Kann ein Umsetzer ohne Raten arbeiten? Nur der Kern: Platzhalter, Code-Schritte ohne Code, Dateien und Anker, erlaubte Befehle | ja |
| `architecture` | Passt der Plan zum Bestand? | nein, nur Hinweise |
| `risks` | Fehlerbehandlung, Security | nein, nur Hinweise |

Die Architektur-Prüfung bekommt später einen eigenen Platz (geplante Architektur-Reviewer), nach derselben Grundregel.

### Rückfrage an die Spec
Eine Spec-Rückfrage gibt es nur, wenn die Spec sich widerspricht oder etwas Unmögliches verlangt. **Details, die die Spec offen lässt, entscheidet der Plan selbst.** Das passt zu Teil 1: Die Spec lässt Details bewusst offen.

### Was sich gegenüber heute ändert
| Heute | Neu |
|---|---|
| Jede Runde sucht komplett neu | Nur Runde 1 sucht, Runde 2 prüft nach |
| Alle fünf Reviewer können blocken | Nur `coverage`, `feasibility`, `buildability` blocken |
| Offene Details in der Spec → Spec-Rückfrage | Offene Details entscheidet der Plan |
| Loop bis 0 × 🔴, Cap oder Stillstand | Höchstens zwei Durchläufe |

---

## Teil 3: Was Skripte statt der KI entscheiden

Ziel: Gleiche Eingabe führt zum gleichen Ablauf. Die KI findet und beschreibt, **das Skript entscheidet**, was blockt und wann Schluss ist.

### Kernidee: Kategorie statt Farbe
Reviewer vergeben keine Farbe mehr. Sie wählen je Finding eine Kategorie aus einer festen Liste. Das Skript leitet die Farbe aus einer Tabelle ab.

| Kategorie | Farbe (Skript) |
|---|---|
| `widerspruch` | 🔴 |
| `fehlendes-verhalten` (Funktion oder AC fehlt) | 🔴 |
| `unerfuellbar` | 🔴 |
| `ac-fehlt-im-plan` (nur Plan-Review) | 🔴 |
| `umsetzer-steckt-fest` (nur Plan-Review) | 🔴 |
| `detail` (Randfall, Schreibweise, Sortierung …) | 🟡 |
| `formulierung` | 🟢 |

Die KI ordnet noch ein, aber in eine enge Liste statt „rot, gelb oder grün nach Gefühl“.

### Vollständig per Skript
| Regel | Wie |
|---|---|
| Höchstens zwei Durchläufe | Zähler im Loop-Skript |
| Runde 2 prüft nur nach | Skript baut aus Runde 1 die Prüfliste. Findings an Stellen, die nicht auf der Liste stehen, stuft es auf Hinweis herab |
| Nur bestimmte Reviewer blocken | Skript kappt Findings von `architecture` und `risks` auf 🟡 |
| Keine Hochstufung 2 × 🟡 → 🔴 | Regel im Aggregations-Skript streichen |
| Offene Fragen an den Menschen nicht erneut melden | Skript liest offene R-Einträge der Spec und filtert Findings an diesen Stellen |
| Kopfzeilen des eigenen Formats (`Status`, `Art`, `Workitem`, `Basis`) | Skript filtert Findings darauf |
| Fragen gebündelt je Stelle | Skript fasst Eskalationen je Stelle im Bericht zusammen |

### Teilweise per Skript
| Regel | Wie | Grenze |
|---|---|---|
| Randfälle zu W-Einträgen höchstens 🟡 | Skript kappt Findings, deren Zitat aus einem W-Eintrag stammt | Zitat aus dem Spec-Text zur selben Regel erkennt es nicht |
| Schreibweisen-Details nie 🔴 | Kategorie `detail`; zusätzlich Wortliste (Groß-/Kleinschreibung, ß, Umlaut, Diakritik) als Absicherung | Wortliste ist grob |

### Bleibt Urteil der KI
- Ob etwas überhaupt ein Befund ist, und welche Kategorie es hat
- Scout-Vorschläge und der Text der Nacharbeit

Hundertprozentig gleiche Ergebnisse gibt es mit KI nicht. Aber Ablauf, Farbe und Ende hängen dann nicht mehr an ihr.

## Teil 4: Bereichs-Review statt Komplett-Review

> Entwurf, noch zu bestätigen. Erweitert die Grundregel „einmal suchen, danach nur nachprüfen“.

### Idee
Nur Runde 1 prüft das ganze Dokument. Ab Runde 2 prüfen die Reviewer nur die Bereiche, die die Nacharbeit geändert hat. Bereiche ohne Beanstandung bleiben unberührt.

Bereich heißt: in der Spec ein Abschnitt oder ein AC, im Plan ein Task.

### Ablauf ab Runde 2
1. **Geänderte Bereiche ermitteln:** Ein Skript vergleicht das Dokument vor und nach der Nacharbeit, je Überschrift, AC oder Task. Das ist statisch und erfasst auch Bereiche, die die Nacharbeit nebenbei geändert hat.
2. **Abhängige Bereiche dazunehmen:**
   - Spec: Bereiche, die den geänderten Bereich oder seine ACs nennen.
   - Plan: Tasks, die per `Consumes`/`Produces` am geänderten Task hängen.
   Das Skript leitet beides aus dem Text ab.
3. **Nur diese Bereiche prüfen**, mit allen Blickwinkeln.
4. **Querprüfung auf Widersprüche:** Nur die Frage, ob der neue Text etwas im Rest widerspricht. Keine neue Suche im Rest.
5. **Ausgenommen:** Der Abschnitt `Entscheidungen` löst kein Nachprüfen aus, er wird nur ergänzt.

### Grenzen
- Die Randfall-Spirale lief in **einem** Bereich (Sortierregel). Das Bereichs-Review allein stoppt sie nicht. Dafür braucht es weiterhin die Kategorien aus Teil 3 und einen Deckel für die Durchläufe.
- Mit Bereichs-Review wird jeder Durchlauf billig. Der Deckel kann deshalb höher sein, z. B. drei statt zwei, ohne dass Kosten und Dauer ausufern.
- Die Abdeckung im Plan („jedes AC steht in einem Task“) prüft ein Skript über alle ACs. Das kostet nichts und bleibt deshalb global.

## Offene Punkte für die Umsetzung
- Wie die Nachprüf-Runde technisch läuft: eigener Reviewer oder dieselben Reviewer mit Auftrag „nur diese Punkte prüfen“.
- Ob `rework-outcome.js progress` („renewed“ als Fortschritt) dann entfällt.
- Folge-Themen aus dem Erfahrungsbericht (R-Nummern über Läufe, Kopfzeilen bei `consistency`, Profil-Auszug cachen) laufen getrennt.
