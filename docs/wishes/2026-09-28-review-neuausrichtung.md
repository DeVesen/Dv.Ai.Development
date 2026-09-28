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

## Offene Punkte für die Umsetzung
- Wie die Nachprüf-Runde technisch läuft: eigener Reviewer oder dieselben Reviewer mit Auftrag „nur diese Punkte prüfen“.
- Ob `rework-outcome.js progress` („renewed“ als Fortschritt) dann entfällt.
- Folge-Themen aus dem Erfahrungsbericht (R-Nummern über Läufe, Kopfzeilen bei `consistency`, Profil-Auszug cachen) laufen getrennt.
