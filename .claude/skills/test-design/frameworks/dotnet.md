# .NET — Test-Environment

Gilt für **Backend-Tests** unter `lac-db\src\backend\tests\`.

Gemeinsame Konventionen: [SKILL.md](../SKILL.md), [references/naming-and-aaa.md](../references/naming-and-aaa.md), [references/avoid-magic-strings.md](../references/avoid-magic-strings.md).

## Technologie-Stack

| Zweck | Paket | Hinweis |
|-------|--------|---------|
| Test-Framework (neue Klassen) | [xUnit v3](https://xunit.net/) | Aktuellste stabile Version |
| Assertions | [FluentAssertions](https://fluentassertions.com/) | **Kein Shouldly** |
| Mocking | [Moq](https://github.com/devlooped/moq) | Interfaces in Konstruktor/Methodenparameter |
| Controller-HTTP | `Microsoft.AspNetCore.Mvc.Testing` | Mit `HttpClient` |
| Coverage | `coverlet.collector` | Wie in bestehenden Testprojekten |
| Test-Host | `Microsoft.NET.Test.Sdk`, `xunit.runner.visualstudio` | |

**TargetFramework:** identisch zum referenzierten Produktionsprojekt.

Details und `.csproj`-Vorlage: [dotnet/unit-test-template.md](dotnet/unit-test-template.md)

## Test-Projekt anlegen

| Regel | Wert |
|-------|------|
| Pfad | `lac-db\src\backend\tests\<Projekt>.Tests\` |
| Solution | Ordner **Tests** in `LAC.sln` |
| Name | `<Projekt>.Tests` (Punkt, z. B. `LAC.ExperimentService.Tests`) |
| Referenz | `ProjectReference` auf das Produktionsprojekt |
| Unit + Integration | **ein** Projekt; Integration nur unter `Integration-Tests/` |

## Verzeichnis- und Namespace-Spiegelung (1:1)

| Produktion | Test |
|------------|------|
| `LAC.ExperimentService\Controller\ExperimentController.cs` | `LAC.ExperimentService.Tests\Controller\ExperimentControllerTests.cs` |
| Namespace `LAC.ExperimentService.Controller` | Namespace `LAC.ExperimentService.Tests.Controller` |
| `…\Services\SetupService.cs` | `…\Services\SetupServiceTests.cs` |

- Klassenname: `<ClassName>Tests`
- **Ausnahme:** `Integration-Tests/` auf oberster Ebene — kein 1:1-Spiegel; darin nach Szenario/Feature gruppieren

## FluentAssertions und Moq

Gilt bei **jedem** neuen oder angepassten Test — unabhängig von xUnit, NUnit oder MSTest:

| Pflicht | Verwendung |
|---------|------------|
| **FluentAssertions** | `result.Should().Be(…)`, `collection.Should().ContainSingle()`, … |
| **Moq** | Jedes Interface in Konstruktor oder Methodenparameter → `Mock<T>` |
| **Setup** | In **Arrange**: `mock.Setup(…).Returns(…)` |
| **Verify** | In **Assert**, wenn Interaktion relevant: `mock.Verify(…, Times.…)` |

## Controller (`ControllerBase`)

**Standard:** HTTP-Emulation — `WebApplicationFactory<Program>` + **`HttpClient`**. **Kein Flurl** in neuen Tests.

DI in der Factory: **Moq** oder **explizite Test-Fakes**, wenn übersichtlicher (z. B. `TestBoGatewayService`).

Vorlage: [dotnet/controller-test-template.md](dotnet/controller-test-template.md)

## Integrationstests

- Ordner: `<Projekt>.Tests\Integration-Tests\` (Top-Level im Testprojekt)
- DB/Container: Testcontainers wie im Bestand (`Testcontainers.PostgreSql`), wenn echte Infrastruktur nötig
- Vorlage: [dotnet/integration-test-template.md](dotnet/integration-test-template.md)

## Bestand und Migration (.NET)

| Situation | Verhalten |
|-----------|-----------|
| **Neue Test-Klasse** | xUnit v3 + FluentAssertions + Moq + Konventionen |
| **Bestehende xUnit-Klasse** | Erweitern/anpassen mit vollem Konventions-Stack |
| **Bestehende NUnit/MSTest-Klasse** | **Erweitern erlaubt**; Framework **behalten**; FA + Moq + Konventionen |
| **Bestehende Methode anpassen** | FA + Moq + Konventionen; Framework unverändert |
| **Umstrukturierung / Framework-Wechsel** | **Nur** auf ausdrücklichen Nutzerwunsch |

**VERBOTEN ohne ausdrücklichen Wunsch:** Mitläufer-Migration, Shouldly, automatisches Umstellen auf xUnit.

## Verifikation

`test_dotnet_solution` via MCP `dev-dotnet-mcp` — siehe `.cursor/references/verification-commands.md`.

## Templates und Beispiele

| Thema | Datei |
|-------|-------|
| Namenskonvention, `[Theory]` | [dotnet/naming-examples.md](dotnet/naming-examples.md) |
| `.csproj`, xUnit v3, Moq, FA | [dotnet/unit-test-template.md](dotnet/unit-test-template.md) |
| Controller, `WebApplicationFactory` | [dotnet/controller-test-template.md](dotnet/controller-test-template.md) |
| `Integration-Tests/`, Testcontainers | [dotnet/integration-test-template.md](dotnet/integration-test-template.md) |
