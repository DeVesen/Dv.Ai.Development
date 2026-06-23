# Integrationstests (.NET)

## Ort

```
tests/LAC.ExampleService.Tests/
├── Services/                    ← Unit (1:1-Spiegel)
├── Controller/
└── Integration-Tests/           ← nur Integration, Top-Level
    ├── ExampleIntegrationTestBase.cs
    └── Experiment/…
```

## Basis mit Testcontainers (PostgreSQL)

Orientierung: `lac-db\src\backend\tests\LAC.SearchService.Integration.Tests\TestBase\IntegrationTestBase.cs`

```csharp
using LAC.Database.Context;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;

namespace LAC.ExampleService.Tests.Integration_Tests;

public class ExampleIntegrationTestBase : IAsyncLifetime
{
    private PostgreSqlContainer? _postgres;

    protected LacDbContext DbContext { get; private set; } = null!;

    public async ValueTask InitializeAsync()
    {
        _postgres = new PostgreSqlBuilder().WithUsername("postgres").Build();
        await _postgres.StartAsync();

        var options = new DbContextOptionsBuilder<LacDbContext>()
            .UseNpgsql(_postgres.GetConnectionString())
            .Options;
        DbContext = new LacDbContext(options);
    }

    public async ValueTask DisposeAsync()
    {
        if (_postgres is not null)
            await _postgres.DisposeAsync();
    }
}
```

## Web-API Integration

`WebApplicationFactory<Program>` + `HttpClient` — siehe [controller-test-template.md](controller-test-template.md). Factory kann echte oder Test-DB nutzen.

## Pakete (bei Bedarf)

```xml
<PackageReference Include="Testcontainers" Version="4.4.0" />
<PackageReference Include="Testcontainers.PostgreSql" Version="4.4.0" />
<PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="8.0.15" />
```
