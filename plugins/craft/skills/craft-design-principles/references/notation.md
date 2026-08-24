# Flow Design Notation — vollständige Syntax-Referenz

Quelle: Stefan Lieser, "Mit Flow Design zu Clean Code" (Ralf Westphal co-developed)

---

## 1 System-Umwelt-Diagramm

Zeigt das System in seiner Umwelt. Analysephase, nicht Entwurf.

```
Rolle ──► [SYSTEM-KERN] ──► Ressource
                            (Provider kapselt Zugriff)
```

- **Rolle**: Abhängig vom System (Benutzer, Fremdsystem)
- **Ressource**: System ist abhängig davon (DB, Datei, externer Dienst)
- **Regel**: Ressourcen inhaltlich benennen (z.B. "Kundendaten"), nicht technisch ("PostgreSQL")
- Portale und Provider sind Implementationsdetails — im SUD nicht einzeichnen

---

## 2 Interaktionsdiagramm

Zerlegt einen Dialog in seine Interaktionen.

```
Dialog: Bestellverwaltung
  ├── Interaktion: Bestellung anlegen
  ├── Interaktion: Bestellung stornieren
  └── Interaktion: Bestellstatus abfragen
```

- Jede **Interaktion** = vertikaler Schnitt durch Anforderungen = mögliches Inkrement
- Jede Interaktion führt zu einer Funktionseinheit im Entwurf (Interaktor)
- **Definition Interaktor:** Realisiert die Domänenlogik einer Interaktion

---

## 3 Symbole der Funktionseinheiten

### 3.1 Portal (□ Rechteck)
- Benutzerschnittstelle oder externe Schnittstelle (REST-API, WebSocket)
- Rollenabhängig: GUI, Konsole, Web-UI, API
- Hat typischerweise mehrere benannte Ein- und Ausgänge
- Merke: **dünn** — keine Domänenlogik

### 3.2 Domänenlogik (○ Kreis)
- Kern des Systems, frei von UI-Interaktionen und Ressourcenzugriffen
- Interaktoren sind Domänenlogik
- Testbar ohne Portal und Provider

### 3.3 Provider (△ Dreieck)
- Kapselt Ressourcenzugriff (DB, Datei, externe API)
- Benennung: Klassenname endet auf `Provider` (z.B. `FileProvider`, `CustomerProvider`)
- Merke: **dünn** — keine Domänenlogik
- Kann in frühen Iterationen vereinfacht realisiert werden (z.B. Datei statt DB)

---

## 4 Datenflüsse und Nachrichten

### 4.1 Basis-Datenfluss

```
A ──(x)──► B
```
A produziert x, B empfängt x. Kontrolle folgt dem Datenfluss.

```
A ──()──► B
```
Kein Datum, aber Kontrolle fließt: B wird ausgeführt.

```
f3               ← FEHLER: kein eingehender Datenfluss
```
Jede Funktionseinheit braucht mindestens einen eingehenden Datenfluss.

### 4.2 Nachrichten-Notation

| Schreibweise | Bedeutung |
|-------------|-----------|
| `(x)` | Variable/Inhalt, Typ aus Kontext |
| `(String)` | Typ (Großbuchstabe) |
| `(name : string)` | Inhalt + expliziter Typ |
| `(x)*` | Stream: viele x, ein nach dem anderen |
| `(Record)*` | Stream von Records |
| `()` | Keine Daten, nur Kontrolle |

### 4.3 Benannte Datenflüsse

Wenn eine Funktionseinheit mehrere Ein- oder Ausgänge hat, werden diese benannt:

```
Ui ──NextPage──► Interaktor    ← Ausgang von Ui benannt "NextPage"
Ui ◄──Update──── Interaktor    ← Eingang von Ui benannt "Update"
```

**Implementation:**
- Benannter eingehender Datenfluss → Methodenname
- Benannter ausgehender Datenfluss → Event- oder Callback-Bezeichner

---

## 5 Join

Wartet auf alle eingehenden Datenflüsse, bevor es weitergeht.

```
A ──(x)──┐
          │──► f3
B ──(y)──┘
```

Ausgang des Joins: Tupel `(x, y)`. Reihenfolge A/B ist semantisch egal — beide müssen vorliegen.

---

## 6 Split

Ein Datenfluss verzweigt auf mehrere Nachfolger:

```
         ┌──► f1
A ──(x)──┤
         └──► f2
```

Beide f1 und f2 erhalten x. Ausführungsreihenfolge bei synchron-sequentiell: Entwurf legt sie nicht fest (semantisch egal). Erst bei paralleler Ausführung (→ Nebenläufigkeit) relevant.

---

## 7 Slash-Notation (Map / Projektion)

Reduziert oder transformiert die Nachricht eines Datenflusses:

```
A ──(x, y, z)/(y, z)──► B      ← x wird weggeschnitten, B erhält (y, z)
A ──(x)/(     )──────► B       ← alle Daten wegschneiden, nur Kontrolle
```

Schluss-Join + Slash kombiniert:

```
A ──(x)──┐
          │/(x, y)──► C         ← Join und dann Projektion: nur x und y fließen weiter
B ──(y)──┘
```

Fehlerfall:

```
FALSCH:
  A ──(x, y)/(x, z)──► B       ← z existiert nicht in (x, y)!
```

---

## 8 Fallunterscheidung

Wenn eine Funktionseinheit entscheidet, welchen Pfad der Datenfluss nimmt:

```
            ──[ist budgetiert]──► VerbucheNormal
A ──(b)──► WennKontoBudgetiert
            ──[ist nicht budgetiert]──► VerbucheOhneLimit
```

- Ausgang muss benannt werden (Label am Datenfluss-Ausgang)
- Optionaler Ausgang: Datenfluss findet nur unter Bedingung statt

---

## 9 Zustand

Wenn eine Funktionseinheit Daten zwischen Aufrufen merken muss:

```
○ ExtractNextPage  [⊞ pageNo]    ← Zustand: aktuelle Seitennummer
```

**Implementation:** Zustand wird zum Feld der Klasse.

---

## 10 Verfeinerung

Hierarchische Zerlegung einer Funktionseinheit:

```
Ebene 1:    A ──(x)──► ToDictionary ──(dict)──►

Verfeinerung (wie durch Lupe):
  A ──(x)──► SplitIntoSettings ──(setting*)──► SplitIntoKeyValuePairs ──(pair*)──► CreateDictionary ──(dict)──►
```

**Regeln:**
- Ein- und Ausgänge der Verfeinerung müssen exakt zur übergeordneten Funktionseinheit passen
- Tiefe beliebig, keine technische Grenze
- Basiert auf Aufruf-Beziehung, nicht auf Enthaltens-Beziehung

**Kriterien für ausreichende Tiefe:**
1. Ist jede Funktionseinheit für genau EINEN Aspekt zuständig?
2. Kann jede Funktionseinheit in ≤ 4h implementiert werden?

---

## 11 Klassenzuordnung

Nach der Verfeinerung: Funktionseinheiten → Klassen (oder Dateien)

**Vorgehen:**
1. Aspekte der Funktionseinheiten identifizieren
2. Gleicher Aspekt → gleiche Klasse (Kohäsion)
3. Unterschiedliche Aspekte → getrennte Klassen
4. Klassennamen im Entwurf unter der Funktionseinheit notieren

**Suffixkonventionen:**
- `Provider` → Ressourcenzugriff (z.B. `FileProvider`, `OrderProvider`)
- `Interactors` → enthält alle Interaktions-Methoden eines Dialogs
- Domänenklassen fachlich benennen (z.B. `Paging`, `CsvParser`, `CommandLine`)

---

## 12 Nebenläufigkeit

Standard: synchron sequentiell (ein Thread).  
Wenn mehrere Threads: Funktionseinheiten und Datenflüsse einfärben nach Thread-Zugehörigkeit.

```
f ──(x)──► A [schwarz/Hauptthread]
            A [blau/Hintergrundthread] ──(y)──► B [blau]
                ↓ Kontrolle zurück an f (Hauptthread)
```

Async-Ergebnis über Callback/Continuation, da Rückgabewert auf Hauptthread nicht möglich.
