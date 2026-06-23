# Integrationstests (.NET)

## Ort

```
tests/<Projekt>.Tests/
├── Services/                    ← Unit (1:1-Spiegel)
├── Controller/
└── Integration-Tests/           ← nur Integration, Top-Level
    ├── ExampleIntegrationTestBase.cs
    └── Orders/…
```

## Basis mit Testcontainers (PostgreSQL)

```csharp
using MyApp.Database.Context;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;

namespace MyApp.ExampleService.Tests.Integration_Tests;

public class ExampleIntegrationTestBase : IAsyncLifetime
{
    private PostgreSqlContainer? _postgres;

    protected AppDbContext DbContext { get; private set; } = null!;

    public async ValueTask InitializeAsync()
    {
        _postgres = new PostgreSqlBuilder().WithUsername("postgres").Build();
        await _postgres.StartAsync();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(_postgres.GetConnectionString())
            .Options;
        DbContext = new AppDbContext(options);
    }

    public async ValueTask DisposeAsync()
    {
        if (_postgres is not null)
            await _postgres.DisposeAsync();
    }
}
```

`AppDbContext` durch den tatsächlichen `DbContext`-Namen des Projekts ersetzen.

## Web-API Integration

`WebApplicationFactory<Program>` + `HttpClient` — siehe [controller-test-template.md](controller-test-template.md). Factory kann echte oder Test-DB nutzen.

## Pakete (bei Bedarf)

```xml
<PackageReference Include="Testcontainers" Version="4.4.0" />
<PackageReference Include="Testcontainers.PostgreSql" Version="4.4.0" />
<PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="8.0.15" />
```
