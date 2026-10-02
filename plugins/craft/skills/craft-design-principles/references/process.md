# Flow Design Vorgehensmodell

---

## 0 Voraussetzung: Phasen klar trennen

```
Anforderungen
     │
     ▼
1. ANALYSE          → Interaktionsdiagramm
     │
     ▼
2. ENTWURF (Breite) → Übersicht aller Interaktionen
     │
     ▼
3. ENTWURF (Tiefe)  → Eine Interaktion vollständig verfeinert
     │
     ▼
4. KLASSENZUORDNUNG → Funktionseinheiten → Klassen
     │
     ▼
5. IMPLEMENTATION   → Code, der den Entwurf spiegelt
```

**Goldene Regel:** Keine Implementation beginnen, bevor Schritt 3+4 für die aktuelle Interaktion vollständig ist.

---

## 1 Analyse

### 1.1 System-Umwelt-Diagramm

Ziel: Kern des Systems von der Umwelt abgrenzen.

Vorgehen mit dem Product Owner:
1. Welche **Rollen** interagieren mit dem System? (Benutzer, externe Systeme)
2. Welche **Ressourcen** benötigt das System? (inhaltlich: "Kundendaten", nicht "PostgreSQL")
3. Kern ↔ Umwelt-Grenze festlegen

Ergebnis: System-Umwelt-Diagramm (textlich beschreiben oder skizzieren)

### 1.2 Domänenhierarchie

Zerlegungshierarchie (von grob zu fein):

```
System
└── Bounded Context
    └── Application
        └── Dialog
            ├── Interaktion
            └── Feature
```

Im Entwickleralltag relevant: Dialog + Interaktion.

### 1.3 Interaktionsdiagramm

Für jeden Dialog: alle Interaktionen identifizieren.

```
Dialog: [Name]
  ├── Interaktion: [Name 1]   ← vertikaler Schnitt #1
  ├── Interaktion: [Name 2]   ← vertikaler Schnitt #2
  └── Interaktion: [Name 3]   ← vertikaler Schnitt #3
```

**Hinweis:** Der Product Owner wählt die Reihenfolge der Umsetzung frei.  
**Tipp:** Vertikal schneiden — jede Interaktion liefert ein für sich testbares Inkrement.

---

## 2 Entwurf in die Breite

Ziel: Überblick über alle Interaktionen, gemeinsame Datentypen und Zustand identifizieren.

Für **jede** Interaktion: einen Entwurf auf oberster Ebene erstellen.

Muster (für Ui-getriebene Interaktionen):
```
Portal (□) ──(trigger)──► Interaktor (○) ──(result)──► Portal (□)
```

Bei Start-Interaktion (Systemstart):
```
(Betriebssystem) ──(args)──► Interaktor (○) ──(data)──► Ui (□)
```

**Was in der Breite entschieden wird:**
- Welche Datentypen fließen zwischen Portal und Domänenlogik?
- Welcher Zustand muss interaktionsübergreifend gehalten werden?
- Wo liegt der Zustand (Interaktor, Portal)?

**Nicht in der Breite entscheiden:** Wie genau die Domänenlogik intern arbeitet.

---

## 3 Entwurf in die Tiefe

Ziel: Eine Interaktion so weit verfeinern, dass sie implementiert werden kann.

**Abbruchkriterium (beide müssen erfüllt sein):**
1. Jede Funktionseinheit ist für genau einen Aspekt zuständig
2. Jede Funktionseinheit kann in ≤ 4 Stunden implementiert werden (Bauchgefühl)

**Vorgehen:**
1. Interaktion auswählen (Product Owner entscheidet)
2. Domänenlogik (Interaktor) verfeinern — in Teilschritte zerlegen
3. Portale (Ui) verfeinern, wenn nötig
4. Provider definieren, wo Ressourcenzugriffe erkannt werden
5. Zustand annotieren (⊞) bei stateful Funktionseinheiten
6. Prüfen: Aspekte getrennt? Funktionseinheiten klein genug?

**Beispiel: Start-Interaktion eines CSV-Viewers**

```
(args) ──► GetFilename ──(filename)──► ReadFileContent ──(line*)──┐
                                                                    │ Join
(args) ──► GetPageLength ──(pageLength)────────────────────────────┘
              │
              ▼ (line*, pageLength)
         ExtractFirstPage ──(header, line*)──► CreateRecords ──(Record*)──► Ui
```

---

## 4 Klassenzuordnung

Ziel: Jede Funktionseinheit einer Klasse (oder Datei) zuordnen.

**Regeln:**
- Gleicher Aspekt → gleiche Klasse (hohe Kohäsion)
- Unterschiedliche Aspekte → getrennte Klassen (lose Kopplung)
- Ressourcenzugriff → immer eigene Provider-Klasse

**Typische Aspekte:**

| Aspekt | Klasse (Beispiel) |
|--------|-------------------|
| Kommandozeilenparameter | `CommandLine` |
| Blätterlogik | `Paging` |
| Dateiinhalt lesen | `FileProvider` |
| CSV-Parsing | `CsvParser` |
| Interaktionen des Dialogs | `Interactors` |
| Ui/Ausgabe | `Ui` |

**Notation im Entwurf:** Klassenname unter Funktionseinheit schreiben (andere Farbe wenn möglich).

---

## 5 Implementation

### 5.1 Grundprinzip: Implementation spiegelt Entwurf

Der Entwurf muss im Code wiedererkennbar sein. Abweichungen vom Entwurf erfordern, dass der Entwurf nachgezogen wird.

### 5.2 Übersetzungsregeln

| Entwurf | Code |
|---------|------|
| Funktionseinheit (Integration) | Integrationsmethode: ruft Operationen auf |
| Funktionseinheit (Operation) | Operationsmethode: implementiert Logik direkt |
| Datenfluss | Methodenparameter + Rückgabewert |
| Join | Lokale Variablen, beide Ergebnisse sammeln, dann weiter |
| Split | Zwei separate Aufrufe derselben Variable |
| Zustand (⊞) | Feld der Klasse; Klasse als Instanz statt statisch |
| Benannter eingehender Datenfluss | Methodenname |
| Benannter ausgehender Datenfluss | Event- oder Callback-Bezeichner |
| Stream (x)* | `IEnumerable<x>`, `List<x>`, Array — nach Kontext |
| Fallunterscheidung | if/switch in Integrationsmethode, benannte Pfade |
| Verfeinerung | Integration ruft Operationen der Verfeinerung auf |

### 5.3 Implementationsreihenfolge

**Top-down:** Start bei der Integrationsmethode. IDE erzeugt fehlende Typen automatisch. Schneller.

**Bottom-up:** Start bei den Operationen. Erst ganz am Ende die Integration. Langsamer, aber jeder Schritt kompiliert sofort.

### 5.4 DRY bei Integrationscode

Trivialer Integrationscode (= kanonische Verkabelung der Datenflüsse) **toleriert DRY-Verletzungen**. Ähnliche Flows nicht zu früh abstrahieren — erst wenn die Flows stabil sind.

Operationscode: kein DRY toleriert.

### 5.5 Testbarkeit

Domänenlogik (Interaktoren, Operationen) ist ohne Portal und Provider testbar:
- Integrationsmethode: testet Zusammenspiel der Operationen
- Operationsmethode: testet Logik direkt
- Ui: `internal`-Methode für Ausgabeerzeugung von physischer Ausgabe trennen (testbar / nicht testbar)

---

## 6 Review

Prüfe bestehenden Code auf Flow Design Compliance:

| Prüfpunkt | Erwartung |
|-----------|-----------|
| Aspekte getrennt? | Portal, Domänenlogik, Provider nie in derselben Klasse |
| Integration vs. Operation klar? | Integrationsmethoden rufen nur auf, kalkulieren nicht selbst |
| Zustand isoliert? | Zustand nur als Klassenfeld, nicht als globale Variable |
| Datenfluss sichtbar? | Methodenparameter und Rückgabewerte klar, kein versteckter Zustand |
| Provider vorhanden? | Kein direkter Datenbankzugriff in Domänenlogik |
| Entwurf vorhanden? | Wurde überhaupt entworfen oder direkt codiert? |
| Implementation spiegelt Entwurf? | Methoden- und Klassenstruktur entspricht dem FD-Diagramm |

---

## 7 Häufige Fehler

| Fehler | Konsequenz | Lösung |
|--------|-----------|--------|
| Entwurf und Implementation gleichzeitig | Wandelbarkeit leidet, kein klarer Plan | Phase Entwurf explizit abschließen |
| Zu große Funktionseinheiten | >4h Implementierungsaufwand, versteckte Aspekte | Weiter verfeinern |
| Domänenlogik im Portal | Ui-Kopplung, schlechte Testbarkeit | In Interaktor verschieben |
| Ressourcenzugriff in Domänenlogik | Testbarkeit unmöglich, Tech-Kopplung | Provider extrahieren |
| Zu frühe DRY-Extraktion aus Integrationscode | Erschwert spätere Änderungen an einzelnen Flows | Warten bis Flows stabil |
| Horizontale statt vertikale Schnitte | Kein lieferbares Inkrement | Interaktions-basiert schneiden |
