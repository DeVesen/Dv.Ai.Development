---
name: software-design-principles
description: >
  Use when making design or architecture decisions, reviewing code, structuring
  functions/classes/components, or applying personal design philosophy.
  Covers: DDD (Bounded Context, Aggregate, Ubiquitous Language), IODA/IOSP
  (orchestrator vs. leaf, IF/switch as integration signal), component hierarchy
  (Angular/React), Flow Design, SOLID, Clean Code, DRY/KISS/YAGNI.
  Triggers: @software-design-principles, meine Prinzipien, Design-Philosophie,
  mein Mantra, DDD, Bounded Context, Orchestrator, Integration vs Operation,
  Component-Hierarchie, sauber wartbar nachhaltig, wie ich Software schreibe.
  Opt-out: ohne software-design-principles.
---

# Software Design

> **Mantra:** Software soll *sauber*, *funktional*, *getestet*, *wartbar* und *nachhaltig* sein.

---

## Prinzipien-Hierarchie

Bei Konflikten zwischen Prinzipien gilt diese Rangfolge:

| Rang | Prinzip | Funktion |
|------|---------|---------|
| 1 | **DDD** | Domänensprache und Bounded-Context-Schnitt — Architekturgesetz |
| 2 | **IODA / IOSP** | Integration vs. Operation — Implementierungsstruktur |
| 3 | **Flow Design** | Datenfluss-Entwurf innerhalb eines Bounded Context |
| 4 | **SOLID / Clean Code / YAGNI / KISS / DRY** | Taktische Werkzeuge |

> YAGNI gilt *innerhalb* eines DDD-Patterns, nie *gegen* einen DDD-Schnitt.  
> DDD sagt **Was/Wo** (Domänenstruktur), Flow Design sagt **Wie** (Implementierungsmethodik) — beide ergänzen sich.

---

## Die fünf Werte

| Wert | Bedeutung |
|------|-----------|
| **Sauber** | Kein toter Code, keine leeren Catches, keine Magic Numbers, keine Seiteneffekte ohne Kenntlichmachung |
| **Funktional** | Tut genau das, was Name und Signatur versprechen — nicht mehr, nicht weniger |
| **Getestet** | Domänenlogik automatisiert testbar; Aspekte so getrennt, dass Tests ohne Mocks möglich sind |
| **Wartbar** | Änderungen an einem Aspekt erzwingen keine Änderungen an anderen; Linearisierung des Aufwands |
| **Nachhaltig** | Wandelbar über Jahre; kein exponentieller Aufwandszuwachs durch Design-Kompromisse |

---

## Persönliche Code-Regeln

### 1 Lesbarkeit auf einen Blick

Name, Parameter und Rückgabewert müssen ohne mentales Mapping verständlich sein.
Maximal 3–4 Parameter; kein `bool`-Flag, das Verhalten umschaltet.

```csharp
bool IsOrderEligibleForDiscount(Order order)  // gut: ein Blick genügt
bool Process(Order o, bool flag)              // schlecht: was bedeutet true?
```

### 2 Keine Verschachtelung — niemals

| Situation | Lösung |
|-----------|--------|
| Kleiner `if`-Block, langer `else`-Block | Guard Clause + Early Return |
| `if-else` tiefer als 2 Ebenen | Innere Bedingung als eigene Methode |
| `if` in `if` in `if` | Switch-Expression, Lookup-Dictionary oder Polymorphie |
| Bedingung + Schleife verschachtelt | Schleifenkörper als eigene Methode |

### 3 Kleine Funktionen — eine Sache

Braucht die Beschreibung einer Funktion das Wort „und" → zwei Funktionen.  
Gilt für Klassen, Methoden, Funktionen und Komponenten gleichermaßen.

### 4 IF / Switch = Integrationssignal

Ein `if` oder `switch` in einer Methode signalisiert: **Diese Methode ist eine Integrationsmethode.**  
Jeder Branch delegiert an eine benannte Funktion — die Logik liegt nie im Branch selbst.

**Ausnahme: Guard Clauses** — Vorbedingung prüfen + Early Return sind kein Integrations-`if`.

```csharp
// Schlecht: Branch enthält Logik
if (order.IsExpress) { priority = 1; fee *= 2; }
else { priority = 5; }

// Gut: Branch delegiert
if (order.IsExpress) ApplyExpressHandling(order);
else ApplyStandardHandling(order);
```

### 5 Component-Hierarchie (Angular / React)

IODA/IOSP auf Komponentenebene:

- **Integration-Component**: orchestriert Kind-Komponenten, handhabt Datenfluss — keine eigene Render-Logik
- **Leaf-Component**: rendert — keine Orchestrierung, keine Business-Logik, überschaubar klein

Keine Komponente macht beides.

---

## Entwurfsmethode: Flow Design

Entwurf vor Implementation — grafisch, nicht textuell.

→ [references/flow-design.md](references/flow-design.md) — Motivation, Requirements-Logic-Gap, Notation, Vorgehensmodell

---

## Architektur & Prinzipien-Kanon

> Architektur-**Stile** (Layered, Onion, Clean, Hexagonal, Vertical Slice, Monolith,
> Modulith, Microservices, CQRS, Event Sourcing) stehen im Skill `architecture-styles`.
> Der ist Nachschlagewerk, nicht Vorgabe — die verbindliche Wahl steht in der Projekt-CLAUDE.md.
> Der DDD-Schnitt hat Vorrang vor jedem Stil-Etikett.

### DDD — Domain-Driven Design

→ [references/ddd.md](references/ddd.md)

Code spricht die **Sprache der Domäne** — kein technisches Mapping im Naming.  
Bounded-Context-Grenzen und Ubiquitous Language sind Architekturgesetz.  
DDD-Schnitt hat Vorrang vor allen taktischen Prinzipien.

### IODA / IOSP (Westphal)

→ [references/ioda-iosp.md](references/ioda-iosp.md)

- **Integration-Methoden** orchestrieren: kein eigenes Rechnen, nur Delegieren
- **Operation-Methoden** verarbeiten: kein Delegieren, nur Logik
- Keine Methode macht beides

Regel #4 ist die persönliche Formulierung desselben Prinzips auf Methoden-Ebene.  
Verbindung zu Flow Design: ein korrekt verfeinertes FD-Diagramm erzwingt automatisch IOSP-konformen Code.

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

## Verweise

| Bereich | Datei |
|---------|-------|
| **DDD** — Ubiquitous Language, Bounded Context, Aggregate, Entity, Value Object, Domain Event, Repository | [references/ddd.md](references/ddd.md) |
| **Flow Design** — Motivation, Requirements-Logic-Gap | [references/flow-design.md](references/flow-design.md) |
| **Flow Design Notation** — vollständige Syntax-Referenz | [references/notation.md](references/notation.md) |
| **Flow Design Vorgehensmodell** — Analyse → Entwurf → Code | [references/process.md](references/process.md) |
| **Zustand** — innerhalb/über Interaktionen/im Portal | [references/state-management.md](references/state-management.md) |
| **Fehlerbehandlung** — Bedienfehler vs. technische Fehler vs. Programmierfehler | [references/error-handling.md](references/error-handling.md) |
| **IODA/IOSP/PoMO/Testpyramide** — vollständige Referenz | [references/ioda-iosp.md](references/ioda-iosp.md) |

---

## Opt-out

`ohne software-design-principles` → Skill nicht laden.
