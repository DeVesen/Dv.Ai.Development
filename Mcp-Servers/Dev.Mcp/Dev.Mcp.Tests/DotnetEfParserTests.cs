using Dev.Mcp.Services;

namespace Dev.Mcp.Tests;

// Locks ParseEfOutput's per-action mapping and the guard clauses in RunEfMigrationAsync
// that must reject bad input before any process is spawned.
public sealed class DotnetEfParserTests
{
    [Fact]
    public void ParseEfOutput_Add_DoneMarkerPresent_IsSuccess() =>
        Assert.True(DotnetRunner.ParseEfOutput("add", "Build started...\nDone.\n", "", 0).Success);

    [Fact]
    public void ParseEfOutput_Add_DoneMarkerMissing_IsFailure() =>
        Assert.False(DotnetRunner.ParseEfOutput("add", "Build started...\n", "", 0).Success);

    [Fact]
    public void ParseEfOutput_Remove_DoneMarkerPresent_IsSuccess() =>
        Assert.True(DotnetRunner.ParseEfOutput("remove", "Reverting model snapshot...\nDone.\n", "", 0).Success);

    [Fact]
    public void ParseEfOutput_List_ReturnsMigrationNamesInErrorsField()
    {
        var result = DotnetRunner.ParseEfOutput("list", "20240101000000_Initial\n20240201000000_AddColumn\n", "", 0);
        Assert.True(result.Success);
        Assert.Equal(["20240101000000_Initial", "20240201000000_AddColumn"], result.Errors);
    }

    [Fact]
    public void ParseEfOutput_List_NoMigrations_ReturnsEmptyNamesAndSuccess()
    {
        var result = DotnetRunner.ParseEfOutput("list", "No migrations were found.\n", "", 0);
        Assert.True(result.Success);
        Assert.Empty(result.Errors);
    }

    [Fact]
    public void ParseEfOutput_DatabaseUpdate_AlreadyUpToDate_IsSuccessWithNoErrors()
    {
        var result = DotnetRunner.ParseEfOutput("database-update", "No migrations were applied. The database is already up to date.\n", "", 0);
        Assert.True(result.Success);
        Assert.Empty(result.Errors);
    }

    [Fact]
    public void ParseEfOutput_DatabaseUpdate_AppliesMigrations_SummaryListsThem()
    {
        var stdout = "Applying migration '20240101000000_Initial'.\nApplying migration '20240201000000_AddColumn'.\nDone.\n";
        var result = DotnetRunner.ParseEfOutput("database-update", stdout, "", 0);
        Assert.True(result.Success);
        Assert.Contains("20240101000000_Initial", result.Summary);
        Assert.Contains("20240201000000_AddColumn", result.Summary);
    }

    [Fact]
    public void ParseEfOutput_HasPendingModelChanges_PendingDetected_IsFailure()
    {
        var result = DotnetRunner.ParseEfOutput("has-pending-model-changes",
            "The model for context 'AppDbContext' has pending changes.\n", "", 0);
        Assert.False(result.Success);
        Assert.NotEmpty(result.Errors);
    }

    [Fact]
    public void ParseEfOutput_HasPendingModelChanges_NoPending_IsSuccess() =>
        Assert.True(DotnetRunner.ParseEfOutput("has-pending-model-changes", "", "", 0).Success);

    [Fact]
    public void ParseEfOutput_CompileErrorBeforeEfRuns_SurfacesBuildError()
    {
        var stderr = "Program.cs(10,5): error CS1002: ; expected\n";
        var result = DotnetRunner.ParseEfOutput("add", "", stderr, 1);
        Assert.False(result.Success);
        Assert.Contains(result.Errors, e => e.Contains("CS1002"));
    }

    [Fact]
    public void ParseEfOutput_UnhandledException_ExtractsTypeAndMessage()
    {
        var stdout = "Unhandled exception. System.InvalidOperationException: Unable to create a 'DbContext'.\n   at ...\n";
        var result = DotnetRunner.ParseEfOutput("database-update", stdout, "", 1);
        Assert.False(result.Success);
        Assert.Contains("System.InvalidOperationException", result.Summary);
        Assert.Contains("Unable to create a 'DbContext'", result.Summary);
    }

    [Fact]
    public void ParseEfOutput_UnknownFailureShape_FallsBackToLastNonLogLines()
    {
        var stdout = "info: Microsoft.EntityFrameworkCore...\nSome provider-specific failure text.\n";
        var result = DotnetRunner.ParseEfOutput("database-update", stdout, "", 1);
        Assert.False(result.Success);
        Assert.Contains("Some provider-specific failure text.", result.Errors);
    }

    [Fact]
    public async Task RunEfMigrationAsync_UnknownAction_FailsWithoutSpawningProcess()
    {
        var runner = new DotnetRunner();
        var result = await runner.RunEfMigrationAsync("drop-database", "C:\\", "Db", "Api");
        Assert.False(result.Success);
        Assert.Contains("Unknown action", result.Summary);
    }

    [Fact]
    public async Task RunEfMigrationAsync_AddWithoutName_FailsBeforePathValidation()
    {
        var runner = new DotnetRunner();
        var result = await runner.RunEfMigrationAsync("add", "C:\\does-not-exist-either", "Db", "Api");
        Assert.False(result.Success);
        Assert.Contains("name is required", result.Summary);
    }
}
