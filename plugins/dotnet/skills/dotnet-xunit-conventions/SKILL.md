---
name: dotnet-xunit-conventions
description: >
  Konventionen für .NET-Tests — xUnit v3, FluentAssertions, Moq, WebApplicationFactory. AAA;
  Naming <Method>_<Situation>_<Erwartung>; Magic-Strings vermeiden; Testprojekt spiegelt
  Produktion 1:1; Bestand respektieren (keine Mitläufer-Migration). Projekt-agnostisch.
  Trigger: xUnit, Moq, FluentAssertions, .cs-Test, Testklasse, dotnet test, Controller-Test,
  Integrationstest, WebApplicationFactory, Testcontainers.
---

# .NET / xUnit — Test-Konventionen

Wie .NET-Tests aufgebaut sind (Struktur, Naming, Assertions, Mocking). **Projekt-agnostisch**:
beschreibt WIE, nie WO. Ablageorte, Tooling und projektspezifische Regeln stehen in der
Projekt-`CLAUDE.md` (siehe Bootstrap-Modus).

## 1. Wann dieser Skill gilt
- Neue oder angepasste .NET-Tests (Unit oder Integration)
- Code-Änderung, die Test-Absicherung braucht
- Explizit: Refactor einer Testklasse / eines Testprojekts

**Opt-out:** „ohne dotnet-xunit-conventions"

### Upfront-Read vor dem ersten Test

Bevor die erste Testklasse geschrieben wird, alle relevanten Produktionsdateien als
Signaturen einlesen — in einem einzigen Batch-Call, nicht sequenziell:

- Controller / Service unter Test → `read_signatures_only`
- Vorhandene Test-Infrastruktur (Factory, Fakes) → `read_signatures_only`
- Testprojekt-`.csproj` → Vollread (klein, enthält Paket-Referenzen die für den Stack relevant sind)

Erst nach diesem Überblick den ersten Test entwerfen. Keine separaten Reads für jede Datei
einzeln — `read_files_batch` mode=`signatures` fasst alle in einen Call.

## 2. Technologie-Stack (neue Tests)
| Zweck | Paket | Hinweis |
|---|---|---|
| Test-Framework | xUnit v3 | aktuellste stabile Version |
| Assertions | FluentAssertions | s. Lizenz-Notiz |
| Mocking | Moq | Interfaces in Konstruktor/Methodenparameter |
| Controller-HTTP | Microsoft.AspNetCore.Mvc.Testing | mit HttpClient |
| Coverage | coverlet.collector | wie im Bestand |
| Test-Host | Microsoft.NET.Test.Sdk, xunit.runner.visualstudio | |
| Integration-DB | Testcontainers(.PostgreSql) | nur wenn echte Infrastruktur nötig |

> **FluentAssertions-Lizenz:** ab v8 kommerziell (Xceed); v7 ist MIT. Bei Lizenzbedenken auf
> `AwesomeAssertions` (drop-in-Fork der FA-v7-API, MIT) oder natives xUnit `Assert` ausweichen.
> Die Konvention „lesbare/fluente Assertions" bleibt; nur das Paket variiert.

**TargetFramework:** identisch zum referenzierten Produktionsprojekt. Details/`.csproj`: `templates/unit-test.md`.

## 3. AAA
Jeder Test: Arrange – Act – Assert, mit Kommentaren `// Arrange` / `// Act` / `// Assert`.
Details + Beispiele: `references/naming-and-aaa.md`, `templates/naming-examples.md`.

## 4. Namenskonvention
`<MethodName>_<AusgangssituationUndEingabe>_<ErwartetesErgebnis>` — Details `references/naming-and-aaa.md`.
Kein `WhenCalled`/`WithInput`/`ReturnsResult`. Ein Test = ein Verhalten.

## 5. Magic Strings
Mehrfach genutzte, fachlich gekoppelte Literale → benannte Konstante. `references/avoid-magic-strings.md`.

## 6. Testprojekt-Konvention
| Regel | Wert |
|---|---|
| Name | `<Project>.Tests` |
| Referenz | ProjectReference auf das Produktionsprojekt |
| Unit + Integration | ein Projekt; Integration nur unter `Integration-Tests/` |
| Ort | folgt der Projekt-Konvention — **dieser Skill schreibt keinen Pfad vor** |

### 1:1-Spiegelung (relativ zum Produktionsprojekt)
| Produktion | Test |
|---|---|
| `<Project>\Controller\OrderController.cs` | `<Project>.Tests\Controller\OrderControllerTests.cs` |
| Namespace `<Project>.Controller` | `<Project>.Tests.Controller` |

Klassenname: `<ClassName>Tests`. Ausnahme: `Integration-Tests/` — kein 1:1-Spiegel, nach Szenario gruppieren.

## 7. FluentAssertions & Moq
| Pflicht | Verwendung |
|---|---|
| FluentAssertions | `result.Should().Be(…)`, `.Should().ContainSingle()` |
| Moq | jedes Interface → `Mock<T>` |
| Setup | in Arrange: `mock.Setup(…).Returns(…)` |
| Verify | in Assert, wenn Interaktion relevant: `mock.Verify(…, Times.…)` |

## 8. Controller (`ControllerBase`)
Standard: `WebApplicationFactory<Program>` + `HttpClient`. **Kein Flurl** in neuen Tests.
DI in der Factory: Moq oder explizite Test-Fakes. Vorlage: `templates/controller-test.md`.

## 9. Integrationstests
Top-Level `Integration-Tests/` im Testprojekt; Testcontainers wie im Bestand. `templates/integration-test.md`.

### Mehrstufige Testdaten → Bau-Hilfe statt Direkterzeugung
Braucht ein Test einen über Fremdschlüssel verketteten Datensatz (mehrere Entities, feste
Anlege-Reihenfolge), entsteht er über eine wiederverwendbare, testprojekt-lokale Bau-Hilfe,
gegliedert nach fachlicher Gruppe — nicht Entity für Entity in einer langen Arrange-Methode.

| Statt | Nimm |
|---|---|
| 7× `new EntityXyz()` in einer 90-Zeilen-Arrange-Methode | statische Builder-Klasse unter `TestBase/`, eine Methode je fachlicher Gruppe |
| Reihenfolge implizit im Testkörper | Reihenfolge in der Bau-Hilfe gekapselt, Test bleibt dünner Orchestrator |

Die Bau-Hilfe trägt die Konvention als XML-Doc auf der Klasse, damit sie am Ort der
Wiederverwendung auffindbar ist. Sie wächst bei Bedarf mit — keine vorab breit angelegte
Bau-Hilfe für Entities, die noch kein Test braucht (YAGNI).

## 10. Bestand & Migration
| Situation | Verhalten |
|---|---|
| Neue Test-Klasse | xUnit v3 + FA + Moq + Konventionen |
| Bestehende xUnit-Klasse | erweitern mit vollem Konventions-Stack |
| Bestehende NUnit/MSTest-Klasse | erweitern erlaubt; Framework behalten; FA + Moq + Konventionen |
| Umstrukturierung / Framework-Wechsel | nur auf ausdrücklichen Wunsch |

**VERBOTEN ohne Wunsch:** Mitläufer-Migration, Shouldly, automatisches Umstellen auf xUnit.

## 11. Verifikation
Tests grün laufen lassen über den Standard-Testlauf des Projekts (RED → GREEN). Falls das Projekt
einen Test-MCP/-Runner vorschreibt, diesen nutzen — kein stiller Shell-Fallback.

## 12. Bootstrap-Modus (`using-skill` / `bootstrap`)
Aufruf mit Argument `using-skill` oder `bootstrap` → deterministischer Installer, keine normale
Nutzung. Folge `references/op-using-skill.md` vollständig.

## 13. Autoren-Modus (`improve-skill`)
Aufruf mit Argument `improve-skill` → Autoren-Modus, keine normale Nutzung. Folge
`references/op-improve-skill.md` vollständig.

## 14. Portabilitäts-Regel (stehend)
Skill-Inhalt bleibt projekt-agnostisch: keine Projektnamen, Absolutpfade, Ports, konkreten
Projekt-Versionen im Skill-Body oder Marker-Block-Template. Projektspezifisches → Projekt-
`CLAUDE.md`/Memory. Neue Regeln erst durch das Portabilitäts-Gate in `op-improve-skill.md`.

## Referenzen
| Bedarf | Datei |
|---|---|
| AAA, Namensschema | `references/naming-and-aaa.md` |
| Magic Strings | `references/avoid-magic-strings.md` |
| `.csproj`, xUnit v3, Moq, FA | `templates/unit-test.md` |
| Controller, `WebApplicationFactory` | `templates/controller-test.md` |
| Integration-Tests, Testcontainers | `templates/integration-test.md` |
| Naming-Beispiele, `[Theory]` | `templates/naming-examples.md` |
| Bootstrap-Ablauf | `references/op-using-skill.md` |
| Autoren-Ablauf | `references/op-improve-skill.md` |
