// Baseline — in bestehendes Test-Projekt kopieren, Namespace anpassen.
// Voraussetzung: ArchUnitNET NuGet-Paket installiert (TngTech.ArchUnitNET.xUnit).
// Alle Tests laufen über ArchUnitNET, das kompilierte Assemblies via Reflection lädt.
// Vor Ausführung: Projekt muss erfolgreich gebaut sein (ArchUnitNET lädt .dll, nicht .cs).
// Projektspezifisch verfeinern: Assembly-Namen, Schichten-Namespaces, ggf. weitere Regeln.

using ArchUnitNET.Domain;
using ArchUnitNET.Fluent;
using ArchUnitNET.Loader;
using ArchUnitNET.xUnit;
using Xunit;

using static ArchUnitNET.Fluent.ArchRuleDefinition;

namespace YourProject.Tests.Architecture;

public class ArchitectureBaselineTests
{
    // -----------------------------------------------------------------------
    // Assembly laden — Namen an das eigene Projekt anpassen
    // -----------------------------------------------------------------------
    private static readonly Architecture Architecture =
        new ArchLoader()
            .LoadAssemblies(
                typeof(YourProject.Api.Controllers.Placeholder).Assembly,       // API / Controller-Assembly
                typeof(YourProject.Application.Services.Placeholder).Assembly,  // Application / Service-Assembly
                typeof(YourProject.Domain.Models.Placeholder).Assembly,         // Domain-Assembly
                typeof(YourProject.Infrastructure.Placeholder).Assembly         // Infrastructure / Repository-Assembly
            )
            .Build();

    // Layer-Definitionen — Namespace-Patterns an das Projekt anpassen
    private static readonly IObjectProvider<IType> ControllerLayer =
        Types().That().ResideInNamespace("YourProject.Api.Controllers.*", useRegularExpressions: false)
               .As("Controller Layer");

    private static readonly IObjectProvider<IType> ServiceLayer =
        Types().That().ResideInNamespace("YourProject.Application.Services.*", useRegularExpressions: false)
               .As("Service Layer");

    private static readonly IObjectProvider<IType> RepositoryLayer =
        Types().That().ResideInNamespace("YourProject.Infrastructure.Repositories.*", useRegularExpressions: false)
               .As("Repository Layer");

    private static readonly IObjectProvider<IType> DomainLayer =
        Types().That().ResideInNamespace("YourProject.Domain.*", useRegularExpressions: false)
               .As("Domain Layer");

    private static readonly IObjectProvider<IType> InfrastructureLayer =
        Types().That().ResideInNamespace("YourProject.Infrastructure.*", useRegularExpressions: false)
               .As("Infrastructure Layer");

    private static readonly IObjectProvider<IType> PersistenceEntities =
        Types().That().ResideInNamespace("YourProject.Infrastructure.Entities.*", useRegularExpressions: false)
               .As("Persistence Entities");

    // -----------------------------------------------------------------------
    // Regel 1 — Controller → Service → Repository Layering, keine Sprünge
    // Controller dürfen nur in Services abhängen (nicht direkt in Repositories oder Domain)
    // -----------------------------------------------------------------------
    [Fact]
    public void Controllers_Should_Only_Depend_On_Services()
    {
        IArchRule rule = Classes().That().Are(ControllerLayer)
            .Should().OnlyDependOn(ServiceLayer)
            .OrShould().OnlyDependOn(Types().That().ResideInNamespace("Microsoft.*", useRegularExpressions: false))
            .OrShould().OnlyDependOn(Types().That().ResideInNamespace("System.*", useRegularExpressions: false));

        rule.Check(Architecture);
    }

    // -----------------------------------------------------------------------
    // Regel 2 — Kein direkter DB-Zugriff aus Controllern
    // Controller dürfen den DbContext nicht direkt referenzieren
    // -----------------------------------------------------------------------
    [Fact]
    public void Controllers_Should_Not_Access_DbContext_Directly()
    {
        IArchRule rule = Classes().That().Are(ControllerLayer)
            .Should().NotDependOnAny(
                Types().That().HaveNameEndingWith("DbContext"));

        rule.Check(Architecture);
    }

    // -----------------------------------------------------------------------
    // Regel 3 — Domain-Modelle frei von Infrastructure-Abhängigkeiten
    // Domain kennt keine Infrastructure (DIP: Abhängigkeit zeigt nach innen)
    // -----------------------------------------------------------------------
    [Fact]
    public void Domain_Should_Not_Depend_On_Infrastructure()
    {
        IArchRule rule = Classes().That().Are(DomainLayer)
            .Should().NotDependOnAny(InfrastructureLayer);

        rule.Check(Architecture);
    }

    // -----------------------------------------------------------------------
    // Regel 4 — Keine zirkulären Abhängigkeiten zwischen Schichten
    // Infrastructure darf nicht von Application/Service-Layer abhängen
    // -----------------------------------------------------------------------
    [Fact]
    public void Infrastructure_Should_Not_Depend_On_Application_Services()
    {
        IArchRule rule = Classes().That().Are(InfrastructureLayer)
            .Should().NotDependOnAny(ServiceLayer);

        rule.Check(Architecture);
    }

    // -----------------------------------------------------------------------
    // Regel 5 — IOSP-Backstop: Service-Methoden mit Service-Aufrufen enthalten keine Inline-Logik
    // Grobe IOSP-Regel auf Klassen-Ebene — methodengenaue Prüfung via codebase-analyzer
    // analyze_iosp_compliance (Strang 5/6), sobald verfügbar. Diese Regel bleibt Backstop.
    // Services dürfen keine anderen Services UND gleichzeitig direkt Repositories aufrufen
    // (würde auf eine Mischung aus Integration und Operation hindeuten).
    // -----------------------------------------------------------------------
    [Fact]
    public void Services_That_Call_Other_Services_Should_Not_Also_Call_Repositories_Directly()
    {
        // Services, die andere Services aufrufen (Integration), sollen nicht
        // gleichzeitig direkt Repositories referenzieren (Operation auf Persistenz-Ebene).
        // Ausnahme: genau ein Repository als primäres Persistenz-Ziel ist erlaubt.
        // Achtung: Diese Regel ist bewusst grob — sie fängt klare IOSP-Verstöße,
        // aber nicht alle subtilen Mischungen. Vollständige Prüfung via analyze_iosp_compliance.
        IArchRule rule = Classes().That().Are(ServiceLayer)
            .And().DependOnAny(ServiceLayer)
            .Should().NotDependOnAny(RepositoryLayer)
            .Because("Services, die andere Services aufrufen (Integration), sollen keine " +
                     "direkten Repository-Aufrufe enthalten (IOSP-Backstop). " +
                     "Vollständige IOSP-Prüfung via codebase-analyzer analyze_iosp_compliance.");

        rule.Check(Architecture);
    }

    // -----------------------------------------------------------------------
    // Regel 6 — Namenskonventionen
    // Services enden auf "Service", Repositories auf "Repository"
    // -----------------------------------------------------------------------
    [Fact]
    public void Services_Should_Have_Correct_Naming()
    {
        IArchRule rule = Classes().That().Are(ServiceLayer)
            .Should().HaveNameEndingWith("Service");

        rule.Check(Architecture);
    }

    [Fact]
    public void Repositories_Should_Have_Correct_Naming()
    {
        IArchRule rule = Classes().That().Are(RepositoryLayer)
            .Should().HaveNameEndingWith("Repository");

        rule.Check(Architecture);
    }

    // -----------------------------------------------------------------------
    // Regel 7 — DDD: Keine Entity-Durchstecherei (Punkt B aus principles-cleancode.md)
    // Persistence-/EF-Entities erscheinen NICHT in Controller-Signaturen (Parameter/Return).
    // An der API-Grenze stehen DTOs. Persistence-Entities nur in Infrastructure-Schicht.
    // Abgrenzung zu Regel 3 (DIP): Regel 3 prüft Abhängigkeitsrichtung; Regel 7 prüft
    // Typ-Durchstecherei nach außen — ein anderer Verstoßtyp.
    // -----------------------------------------------------------------------
    [Fact]
    public void Controllers_Should_Not_Use_PersistenceEntities_In_Signatures()
    {
        IArchRule rule = Classes().That().Are(ControllerLayer)
            .Should().NotDependOnAny(PersistenceEntities)
            .Because("Controller-Signaturen (Parameter und Return-Typen) dürfen keine " +
                     "Persistence-/EF-Entities enthalten. An der API-Grenze stehen DTOs. " +
                     "(DDD-Leitplanke B: keine Entity-Durchstecherei — principles-cleancode.md)");

        rule.Check(Architecture);
    }
}
