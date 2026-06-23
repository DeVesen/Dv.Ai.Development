# startup.md — feature-delivery Harness-Setup

> **Hinweis:** Diese Datei wird vom Harness NICHT automatisch geladen (auto-geladen werden nur `CLAUDE.md` und `SKILL.md`). Öffne diese Datei explizit wenn du ein neues Kundenprojekt mit `feature-delivery` einrichten willst.
>
> **Verwendung mit einer AI:** Öffne diese Datei, lass die AI jeden Abschnitt schrittweise durchführen — sie fragt vor jeder Maßnahme nach Bestätigung.

---

## §1 — Voraussetzungen prüfen [Must-Have, automatisch prüfbar]

AI prüft automatisch, ob folgende MCPs/Tools erreichbar sind:

| Voraussetzung | Prüfung | Konsequenz bei Fehler |
|---|---|---|
| `dev-mcp` erreichbar | Einfaches Tool-Call | Gate-2 nicht ausführbar |
| `codebase-analyzer` erreichbar | Einfaches Tool-Call | review_git_diff nicht ausführbar |
| `jb inspectcode` CLI verfügbar | Shell: `jb --version` | run_inspectcode nicht nutzbar |

---

## §2 — Gate-2-Bootstrap [Must-Have, einmalig pro Kundenprojekt]

### 2a — .NET: ArchUnitNET installieren

Schritte (AI führt nach Bestätigung aus):

1. NuGet-Paket `ArchUnitNET` ins bestehende Test-Projekt installieren
2. Regelklasse aus `C:\Develop\Dv.Ai.Development\.claude\skills\feature-delivery\references\archunit-baseline-template.cs` ins Test-Projekt kopieren
3. Namespace anpassen auf Projekt-Namespace
4. Verdrahtung prüfen: `dotnet test` → ArchUnit-Tests müssen lauffähig sein (können initial fehlschlagen — das ist OK, Regeln werden dann angepasst)

### 2b — Angular: ESLint-Baseline installieren

Schritte (AI führt nach Bestätigung aus):

1. `@angular-eslint` installieren falls nicht vorhanden
2. ESLint-Konfiguration aus `C:\Develop\Dv.Ai.Development\.claude\skills\feature-delivery\references\eslint-baseline.json` als Basis verwenden/mergen
3. `ng lint` — muss durchlaufen (keine Fehler durch Baseline selbst)

---

## §3 — Optionale Maßnahmen [Entscheidungsfragen, interaktiv]

AI fragt für jede Maßnahme einzeln: "Möchtest du X einrichten? (ja/nein/später)"

### 3a — eslint-plugin-boundaries (Zonen-Architektur)

Wann: Wenn das Projekt eine core/shared/features-Struktur verwendet.
Was: Template aus `C:\Develop\Dv.Ai.Development\.claude\skills\feature-delivery\references\eslint-boundaries-template.js` als Startpunkt.

**Wichtig:** Zonen sind projektspezifisch — Vorlage vor Aktivierung an tatsächliche Ordnerstruktur anpassen. Start-Set: 4 Regeln (ApiService-Placement, Dumb-Components, Cross-Feature-Verbot, shared kennt keine Features).

Hinweis: eslint-plugin-boundaries prüft nur Import-Statements — Naming/Placement/DI-Schmuggel braucht `analyze_angular_architecture` (nachgelagert, Strang 3, noch nicht verfügbar).

### 3b — Custom ArchUnit-Regeln

Wann: Wenn Projektstruktur über die Baseline hinaus spezifische Regeln braucht.
Was: Regelklasse aus §2a erweitern.

### 3c — Plan-Persistenz-Pfad bestätigen

Default: `requests/plans/plan-<feature>.md`
Frage: Soll der Pfad abweichen? (z.B. anderen Ordner nutzen)

### 3d — Fehler-Format/-Strategie

Frage: Welches Format an der API-Grenze?
- ProblemDetails/RFC 7807 (empfohlen für .NET)
- Eigenes Format

Frage: Exceptions vs. Result-Pattern?

Frage: Resilience (Polly: Retry/Circuit Breaker/Timeout)? — Nur wenn Microservices

### 3e — Resilience (Polly)

Wann: Wenn Microservices oder externe Services angebunden werden.
Was: Retry-Policy, Circuit Breaker, Timeout-Policy definieren.

### 3f — Inter-Service-Kommunikation

Wann: Wenn Features service-übergreifend sind.
Frage: Message-Bus/Protokoll? Event-Contracts definiert?
Frage: Anti-Corruption-Layer vorhanden?

### 3g — Logging/Observability

Frage: Correlation-IDs / Distributed Tracing?
Frage: Config/Secrets-Handling (Vault, Environment Variables, Azure Key Vault)?
Frage: API-Versionierung (URL-Versioning, Header-Versioning)?

---

## §4 — Verifikation

Nach dem Setup:

- Build grün? (`dotnet build` / `ng build`)
- Lint grün? (`ng lint` — keine Fehler durch Baseline)
- ArchUnit-Tests lauffähig? (`dotnet test --filter ArchUnit`)
- Alle Voraussetzungen aus §1 noch erreichbar?

---

## §5 — Checkliste (Abschluss)

Was wurde eingerichtet — für spätere Referenz:

- [ ] MCPs erreichbar (dev-mcp, codebase-analyzer, jb inspectcode)
- [ ] ArchUnitNET installiert + Regelklasse eingefügt
- [ ] ESLint-Baseline aktiv (`ng lint` grün)
- [ ] eslint-plugin-boundaries: ja / nein / später
- [ ] Plan-Persistenz-Pfad: `requests/plans/` (Default) / ___
- [ ] Fehler-Format: ProblemDetails / eigenes / ___
- [ ] Resilience: nein / Polly (Retry/CB/Timeout) / ___
- [ ] Inter-Service: nein / Bus: ___ / Event-Contracts: ___
- [ ] Logging: Correlation-IDs: ja/nein / Tracing: ja/nein / Secrets: ___
