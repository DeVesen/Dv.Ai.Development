---
name: software-design-principles
description: >
  Persoenliche Software-Design-Philosophie: sauber · funktional · getestet · wartbar · nachhaltig.
  Konsolidiert alle Design-Prinzipien: Flow Design (Lieser/Westphal), IODA/IOSP, SOLID, Clean Code,
  DRY/KISS/YAGNI sowie persoenliche Code-Regeln (keine Verschachtelung, Lesbarkeit auf einen Blick).
  Gilt als Qualitaetsnordstern fuer alle Gespraeche und automatisch fuer feature-delivery.
  Trigger: software design principles, software-design-principles, meine Prinzipien, Design-Philosophie,
  mein Mantra, sauber wartbar nachhaltig, beachte meine Prinzipien, design principles, persoenliche
  Regeln, wie ich Software schreibe, meine Designregeln, @software-design-principles.
  Opt-out: ohne software-design-principles.
when_to_use: >
  Immer wenn Designentscheidungen, Code-Reviews, Anforderungsanalyse oder Implementierungsplanung
  im Kontext dieser persoenlichen Software-Design-Philosophie stattfinden sollen.
  Automatisch relevant fuer feature-delivery (Planning + Implementation).
---

# Software Design

> **Mantra:** Software soll *sauber*, *funktional*, *getestet*, *wartbar* und *nachhaltig* sein.

Diese fünf Werte sind der Nordstern. Alle Prinzipien — Flow Design, IODA, SOLID, Clean Code — dienen
ihnen. Kein Prinzip ist Selbstzweck; es rechtfertigt sich nur durch seinen Beitrag zu diesen Werten.

---

## Die fünf Werte

| Wert | Bedeutung |
|------|-----------|
| **Sauber** | Kein Toter Code, keine leeren Catches, keine Magic Numbers, keine Seiteneffekte ohne Kenntlichmachung |
| **Funktional** | Tut genau das, was es laut Name und Signatur tun soll — nicht mehr, nicht weniger |
| **Getestet** | Domänenlogik ist automatisiert testbar; Aspekte sind so getrennt, dass Tests ohne Mocks möglich sind |
| **Wartbar** | Änderungen an einem Aspekt erzwingen keine Änderungen an anderen; Linearisierung des Aufwands |
| **Nachhaltig** | Wandelbar über Jahre; kein exponentieller Aufwandszuwachs durch Design-Kompromisse |

---

## Persönliche Code-Regeln

Diese Regeln sind verbindlich — sie gelten zusätzlich und gleichrangig zum Prinzipien-Kanon.

### 1 Lesbarkeit auf einen Blick

Eine Funktion/Methode muss auf einen Blick verständlich sein:

- **Name**: sagt, was sie tut — kein mentales Mapping nötig
- **Parameter**: selbsterklärend; maximal 3–4 Parameter, kein `bool`-Flag das Verhalten umschaltet
- **Rückgabewert**: klar aus Name + Kontext ableitbar

```csharp
// Gut: Ein Blick genügt
bool IsOrderEligibleForDiscount(Order order)

// Schlecht: Was bedeutet true? Was bedeutet false?
bool Process(Order o, bool flag)
```

### 2 Keine Verschachtelung — niemals

Tiefe `if`/`else`-Verschachtelungen sind **verboten**. Sie sind der häufigste Grund für:
- Schwer lesbare Logik
- Verdeckte Bugs
- Untestbare Pfade

**Regeln:**

| Situation | Lösung |
|-----------|--------|
| `if` mit einem kleinen Block → sonst langer Block | Umdrehen: Guard-Clause + Early Return |
| `if-else` tiefer als 2 Ebenen | Innere Bedingung als eigene Methode extrahieren |
| `if-else` in `if-else` in `if-else` | Refactor zu Switch-Expression, Lookup-Dictionary oder Polymorphie |
| Bedingung + Schleife verschachtelt | Schleifenkörper als eigene Methode |

```csharp
// Schlecht — tiefe Verschachtelung
if (order != null) {
    if (order.IsActive) {
        if (order.Items.Any()) {
            // ... eigentliche Logik
        }
    }
}

// Gut — Guard Clauses
if (order == null) return;
if (!order.IsActive) return;
if (!order.Items.Any()) return;
// ... eigentliche Logik klar lesbar
```

### 3 Kleine Funktionen — eine Sache

Jede Funktion macht **eine** Sache. Kriterium: der Name beschreibt sie in einem einzigen Verb-Substantiv-Paar.

Wenn eine Funktion in der Beschreibung "und" braucht → zwei Funktionen.

---

## Entwurfsmethode: Flow Design

Vor der Implementation steht der Entwurf — grafisch, nicht textuell.

→ Vollständige Methode: [references/flow-design.md](references/flow-design.md)

Kernprinzip: **Requirements Logic Gap** schließen durch Datenflussdiagramme (Portal → Domänenlogik → Provider).  
Die 5 Werte verlangen: Entwurf trennt Aspekte, bevor Code geschrieben wird.

---

## Architektur & Prinzipien-Kanon

### IODA / IOSP (Westphal)

→ Vollständig: [references/ioda-iosp.md](references/ioda-iosp.md)

- **Integration-Methoden** orchestrieren: kein eigenes Rechnen, nur Delegieren
- **Operation-Methoden** verarbeiten: kein Delegieren, nur Logik
- Keine Methode macht beides

→ Direkte Verbindung zu Persönlichen Regeln #2: eine Integration-Methode, die rechnet, ist auch oft tief verschachtelt.  
→ Verbindung zu Flow Design: korrekt verfeinertes FD-Diagramm erzwingt automatisch IOSP-konformen Code.

### SOLID

| Prinzip | In einem Satz |
|---------|--------------|
| **S** SRP | Eine Klasse — ein Grund zur Änderung |
| **O** OCP | Offen für Erweiterung, geschlossen für Modifikation |
| **L** LSP | Subtypen ersetzen Basistypen ohne Überraschungen |
| **I** ISP | Kein Client abhängig von Interfaces, die er nicht nutzt |
| **D** DIP | High-level-Modul kennt nur Abstraktion, nie Konkretisierung |

### Clean Code Kernregeln

- Aussagekräftige Namen — kein mentales Mapping
- Kommentare erklären das **Warum**, nicht das Was
- Kein toter Code — niemals eingecheckt
- Fehler niemals verschlucken

### Pragmatische Gegengewichte

| Prinzip | Funktion |
|---------|---------|
| **YAGNI** | Keine Abstraktion für hypothetische Anforderungen |
| **DRY** | Dupliziertes **Wissen** ist das Problem — nicht ähnlicher Code in verschiedenem Kontext |
| **KISS** | Die einfachste vollständige Lösung gewinnt immer |

---

## Testbarkeit

Direkte Konsequenz aus "getestet" + Aspekttrennung:

- Domänenlogik (Interaktoren, Operationen) braucht keine Mocks
- Portale und Provider sind dünn — kein Testing-Aufwand dort nötig
- Test-first: erst die Akzeptanzliste (F1), dann der Code
- Kein leerer `catch`-Block — jeder Fehler ist ein testbarer Pfad

---

## Anwendung in Gesprächen

Wenn du sagst:
- `@software-design-principles` oder "beachte meine Prinzipien" → Claude lädt diese Philosophie und wendet sie in der gesamten Unterhaltung an
- Bei Code-Reviews: alle 5 Werte als Prüfkriterien
- Bei Anforderungsausarbeitung: Flow Design Methodik vorschlagen
- Bei Implementierungsentscheidungen: persönliche Code-Regeln immer mitdenken

---

## Verweise

| Bereich | Datei |
|---------|-------|
| **Flow Design** — Motivation (Investitionsschutz, Requirements-Logic-Gap) | [references/flow-design.md](references/flow-design.md) |
| **Flow Design Notation** — vollständige Syntax-Referenz | [references/notation.md](references/notation.md) |
| **Flow Design Vorgehensmodell** — Analyse → Entwurf → Code | [references/process.md](references/process.md) |
| **Zustand** — innerhalb/über Interaktionen/im Portal | [references/state-management.md](references/state-management.md) |
| **Fehlerbehandlung** — Bedienfehler vs. technische Fehler vs. Programmierfehler | [references/error-handling.md](references/error-handling.md) |
| **IODA/IOSP/PoMO/Testpyramide** — vollständige Referenz | [references/ioda-iosp.md](references/ioda-iosp.md) |
| SOLID/Clean Code/DRY/KISS/YAGNI/DDD | [../feature-delivery/references/principles-cleancode.md](../feature-delivery/references/principles-cleancode.md) |
| Feature-Umsetzung | [../feature-delivery/SKILL.md](../feature-delivery/SKILL.md) |

---

## Opt-out

`ohne software-design` → Skill nicht laden.
