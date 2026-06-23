# Prinzipien-Kanon — feature-delivery

**Bei Widerspruch: SOLID + IODA überwiegen.**

---

## Kern-Kanon

### IODA (Integration Operation Decomposition Architecture)

Westphals Architekturprinzip für klaren Bausteinschnitt und Dekomposition.

- **Integration-Methoden** orchestrieren: sie rufen andere Methoden auf, enthalten aber selbst keine fachliche Logik.
- **Operation-Methoden** verarbeiten: sie enthalten Logik (Transformationen, Berechnungen, Entscheidungen), rufen aber keine anderen Methoden innerhalb derselben Klasse auf.
- **Decomposition** beschreibt den Prozess, Klassen und Methoden in Integration- und Operation-Einheiten aufzuteilen.
- **PoMO (Point of Maximum Opportunity):** die höchste sinnvolle Abstraktionsebene je Klasse — wo Integration und Operationen klar getrennt sind.

Wann verletzt: eine Methode delegiert UND verarbeitet gleichzeitig. Symptom: schwer testbar, hohe Kopplung.

### IOSP (Integration Operation Segregation Principle)

Keine Methode mischt Integration und Operation. Eine Methode macht **entweder** interne Aufrufe **oder** Logik/Ausdrücke — nicht beides.

- Deterministische IOSP-Prüfung erfolgt nachgelagert via `codebase-analyzer analyze_iosp_compliance` (Strang 5 .NET / Strang 6 Angular).
- ArchUnit-IOSP-Regel bleibt als **Backstop** aktiv — fängt grobe Verstöße auf Klassenebene, bis das deterministischere Tool verfügbar ist.
- IOSP ist die operative Konkretisierung von IODA auf Methoden-Ebene.

### SOLID

**S — Single Responsibility Principle**
Eine Klasse hat genau einen Grund zur Änderung. Beispiel: ein `OrderService` verwaltet Bestellungen — er validiert keine Zahlungen und sendet keine E-Mails.

**O — Open/Closed Principle**
Software-Einheiten sind offen für Erweiterung, geschlossen für Modifikation. Beispiel: neues Zahlungsverfahren → neue Klasse, nicht Änderung der bestehenden `PaymentProcessor`-Klasse.

**L — Liskov Substitution Principle**
Subtypen müssen durch ihre Basistypen ersetzbar sein, ohne das Programmverhalten zu ändern. Beispiel: eine `ReadOnlyList<T>` darf nicht von `List<T>` erben, wenn sie `Add()` verbietet — das verletzt die Verhaltenszusage.

**I — Interface Segregation Principle**
Clients sollen nicht von Interfaces abhängen, die sie nicht verwenden. Beispiel: statt einem `IRepository` mit 15 Methoden lieber `IReadRepository` und `IWriteRepository` trennen.

**D — Dependency Inversion Principle**
High-level Module sollen nicht von Low-level Modulen abhängen; beide sollen von Abstraktionen abhängen. Beispiel: `OrderService` kennt nur `IOrderRepository`, nicht `SqlOrderRepository` — die konkrete Implementierung wird per DI injiziert.

### Clean Code (Robert C. Martin)

- **Aussagekräftige Namen:** Variablen, Methoden und Klassen benennen, was sie tun — `getUserById()` statt `getU()`. Kein mentales Mapping notwendig.
- **Kleine Funktionen:** Jede Funktion macht genau eine Sache. Als Faustregel: passt in den Bildschirm ohne Scrollen.
- **Kommentare nur für das Warum:** Code erklärt das Was und Wie durch seine Struktur. Kommentare erklären, warum eine Entscheidung so getroffen wurde — nicht was der Code macht.
- **Fehler nicht ignorieren:** Leere `catch`-Blöcke und unbehandelte Exceptions sind verboten. Jeder Fehler wird behandelt oder bewusst weitergegeben.
- **Kein Toter Code:** Auskommentierter Code, nie aufgerufene Funktionen und übriggebliebene TODO-Skelette werden entfernt, nicht eingecheckt.

---

## Pragmatische Leitplanken

Diese ergänzen den Kern-Kanon. Sie überstimmen SOLID und IODA **nicht** — sie verhindern nur unnötige Komplexität, Duplikation und Abstraktion auf Vorrat.

### YAGNI (You Aren't Gonna Need It)

Keine Abstraktion, kein Interface, kein Extension-Point, der nur für hypothetische zukünftige Anforderungen existiert. Bricht **keine** nötige DIP-Abstraktion — verhindert nur Abstraktion für Anforderungen, die heute nicht existieren. Entscheidungsregel: „Brauche ich das für eine konkrete, bekannte Anforderung jetzt?" Nein → nicht bauen.

### DRY (Don't Repeat Yourself)

Dupliziertes **Wissen** ist das Problem — nicht duplizierter Code. Gleicher Code mit anderem fachlichem Bedeutungskontext (z. B. gleiche Validierungsregel in zwei verschiedenen Bounded Contexts) ist kein DRY-Verstoß — das Wissen ist verschieden, auch wenn die Zeilen ähnlich aussehen. DRY erzwingt keine künstliche Zusammenführung über Kontextgrenzen.

### KISS (Keep It Simple, Stupid)

Die einfachste Lösung, die die Anforderung vollständig erfüllt, ist die richtige. Keine clevere Architektur ohne konkreten Bedarf. Komplexität ist eine Schuld, die jeden Monat Zinsen kostet.

---

## DDD-Leitplanken (gezielt — kein volles DDD-Vokabular)

Bewusst nur zwei Grenz-Prinzipien. Kein Aggregate/Value-Object/Domain-Event-Vokabular (das wäre gegen YAGNI/KISS). DDD ist komplementär zu IODA/IOSP/SOLID — kein Widerspruch.

### A — Bounded Context (Planungs-Prinzip, nicht maschinell prüfbar)

Jeder Microservice ist eine eigene Domäne mit eigenem Modell. Gleiche Namen (DTO, Model, Parameter) in Service-A und Service-B dürfen **unterschiedliche** fachliche Bedeutung haben — das ist gewollt. **Keine** geteilten Modelle oder DTOs über Service-Grenzen, außer einem bewusst entschiedenen **Shared Kernel**.

FE-Analogon: Feature-Zonierung (`core/shared/features`) — jedes Feature ist sein eigener Bounded Context.

Durchsetzung: Plan-Orchestrator Phase 4a denkt Services als Bounded Context und benennt Domänengrenzen + Ubiquitous Language explizit. `plan-review`-Checker prüft auf ungewollten Shared-Kernel.

### B — Domänen-Modell-Trennung / keine Entity-Durchstecherei (prüfbar via ArchUnit)

DB-/Persistence-Entities gehen **nicht** durch den ganzen Service bis zur API. Klare Trennung: Persistence-Entity / Domain-Model / DTO.

- An der **API-Grenze** stehen DTOs.
- **Persistence-Entities** werden nur in der Repository-/Infrastructure-Schicht referenziert.
- Nicht dasselbe wie DIP (Abhängigkeitsrichtung zwischen Schichten): Punkt B ist Typ-Durchstecherei **nach außen** — eine Persistence-Entity als HTTP-Response-Typ ist ein B-Verstoß, auch wenn alle DIP-Regeln eingehalten werden.

Durchsetzung: ArchUnit-Regel „keine Entity-Durchstecherei" (archunit-baseline-template.cs).

---

## Weitere Architektur-Leitlinien

### Security (höchste Priorität, prüfbar)

Standard-Checks via `codebase-analyzer` `security`-focusArea + `jb inspectcode`: SQL-Injection, XSS, Secrets in Code, fehlende Auth-Prüfungen, CORS-Fehlkonfiguration, unsicherer Token-Storage.

**Security-Findings mit severity `critical` sind in Gate 2 immer blockierend** — unabhängig davon, ob der Fund aus codebase-analyzer oder inspectcode kommt. Sie werden nie als Warning gebündelt oder durchgewunken. Kein Ausnahmeweg.

### Fehlerbehandlung (teils prüfbar, teils Prinzip)

Fehler **nicht verschlucken:** kein leerer `catch`-Block, kein `catchError` ohne tatsächliche Behandlung — prüfbar via inspectcode und codebase-analyzer.

Fehlerbehandlung als **Cross-Cutting Concern**: gehört in die Integration-Schicht (Middleware, HTTP-Interceptor), nicht verstreut in jede Operation. IOSP/IODA-konform: eine zentrale Integration-Methode behandelt Fehler, die Operationen propagieren sie.

Einheitliches **Fehler-Format** an der API-Grenze (konsistente Fehlerantworten für alle Clients).

*Konkretes Format (ProblemDetails/RFC 7807), Strategie (Exceptions vs. Result), Resilience (Polly) → projektspezifisch, startup.md.*

### Inter-Service-Kommunikation (Planungs-Prinzip; nur bei service-übergreifenden Features)

Ergänzung zu DDD-A — gilt nur, wenn das Feature mehr als einen Service berührt:

- **Lose Kopplung, async bevorzugt:** Events für Cross-Service-Kommunikation (kein synchrones Durchreichen von Service zu Service).
- **Kein verteilter Monolith:** keine synchronen Aufruf-Ketten über viele Services, keine geteilte Datenbank.
- **Anti-Corruption-Layer** an Service-Grenzen: Modell-Übersetzung passiert explizit — schließt an DDD-A an (kein gemeinsames Modell).

*Konkreter Message-Bus, Protokoll, Event-Contracts → projektspezifisch, startup.md.*
