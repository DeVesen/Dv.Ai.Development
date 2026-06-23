# Controller-Tests — HTTP-Emulation

## Standard

- `WebApplicationFactory<Program>` (intern oder `sealed` in Testprojekt)
- `HttpClient` via `factory.CreateClient()` — **kein Flurl** in neuen Tests
- Assertions mit FluentAssertions

## Factory mit Test-Fakes (DI übersichtlicher als Moq)

Orientierung: `lac-db\src\backend\tests\LAC.GatewayService.Tests\GatewayWebApplicationFactory.cs`

```csharp
internal sealed class ExampleWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(Environments.Development);

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IExampleGatewayService>();
            services.AddSingleton<IExampleGatewayService, TestExampleGatewayService>();
        });
    }
}
```

## Controller-Test

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace LAC.ExampleService.Tests.Controller;

public class ExperimentControllerTests
{
    [Fact]
    public async Task Post_GivenValidRequest_WithTaskId_ReturnsOk()
    {
        // Arrange
        await using var factory = new ExampleWebApplicationFactory();
        var client = factory.CreateClient();
        var taskId = Guid.NewGuid();
        var request = new { Name = "Test" };

        // Act
        var response = await client.PostAsJsonAsync($"/experiments/{taskId}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
```

## Paket

```xml
<PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="8.0.15" />
```

Version an `Microsoft.AspNetCore.App` / Service-Framework anpassen.
