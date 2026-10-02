# Unit-Test — Projekt und Moq

## `.csproj` (neues Testprojekt, xUnit v3)

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
    <IsTestProject>true</IsTestProject>
    <RootNamespace>MyApp.ExampleService.Tests</RootNamespace>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="coverlet.collector" Version="6.0.4">
      <PrivateAssets>all</PrivateAssets>
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
    </PackageReference>
    <PackageReference Include="FluentAssertions" Version="8.10.0" />
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="18.0.1" />
    <PackageReference Include="Moq" Version="4.20.72" />
    <PackageReference Include="xunit.v3" Version="3.2.2" />
    <PackageReference Include="xunit.runner.visualstudio" Version="3.1.5">
      <PrivateAssets>all</PrivateAssets>
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
    </PackageReference>
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\..\MyApp.ExampleService\MyApp.ExampleService.csproj" />
  </ItemGroup>

</Project>
```

`TargetFramework` und Paketversionen an das Produktionsprojekt bzw. aktuellste stabile NuGet-Versionen anpassen.
Namespace-Präfix (`MyApp`) durch den tatsächlichen Solution-Namespace ersetzen.

## Unit-Test mit Moq

```csharp
using FluentAssertions;
using MyApp.ExampleService.Interfaces;
using MyApp.ExampleService.Services;
using Moq;

namespace MyApp.ExampleService.Tests.Services;

public class SetupServiceTests
{
    [Fact]
    public async Task CreateOrUpdate_GivenNoExistingSetup_WithNewModel_InsertsWithoutRecalculation()
    {
        // Arrange
        var setupRepository = new Mock<ISetupRepository>();
        setupRepository
            .Setup(x => x.GetByName(It.IsAny<Guid>(), It.IsAny<string>()))
            .ReturnsAsync((SetupEntity?)null);
        setupRepository
            .Setup(x => x.Insert(It.IsAny<SetupEntity>()))
            .ReturnsAsync((SetupEntity e) => { e.Id = Guid.NewGuid(); return e; });

        var recalculation = new Mock<IParameterSetRecalculationService>();
        var sut = new SetupService(setupRepository.Object, recalculation.Object);
        var model = CreateSetupModel();

        // Act
        await sut.CreateOrUpdate(model);

        // Assert
        recalculation.Verify(x => x.RecalculateForSetup(It.IsAny<Guid>()), Times.Never);
    }
}
```

## CLI (nur wenn kein MCP)

```powershell
dotnet new install xunit.v3.templates
dotnet new xunit3 -n MyApp.ExampleService.Tests -o tests\MyApp.ExampleService.Tests
```
