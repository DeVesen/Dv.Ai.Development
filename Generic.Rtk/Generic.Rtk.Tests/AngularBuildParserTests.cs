using Generic.Rtk.Filtering;
using Generic.Rtk.Models;

namespace Generic.Rtk.Tests;

public class AngularBuildParserTests
{
    private readonly AngularBuildParser _p = new();
    private readonly FilterLimits _limits = new();

    [Fact]
    public void Drops_Webpack_Progress()
    {
        var raw = """
            13% building 1/2 entries 4/5 dependencies 2/3 modules
            chunk {main} main.js 500 kB
            Application bundle generation complete. [2.341 seconds] - 2025-05-11T12:00:00.000Z
            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal("Succeeded", r.Summary.Status);
        Assert.DoesNotContain("13%", r.RawFiltered);
        Assert.DoesNotContain("chunk", r.RawFiltered, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Keeps_TypeScript_Error()
    {
        var raw = """
            45% building 2/4 entries
            src/app/app.component.ts(3,14): error TS2339: Property 'x' does not exist on type 'Y'.
            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal("Failed", r.Summary.Status);
        Assert.Single(r.Errors);
        Assert.Equal("TS2339", r.Errors[0].Code);
        Assert.Contains("app.component.ts", r.Errors[0].File);
    }

    [Fact]
    public void Keeps_Multiline_Warning_Block()
    {
        var raw = """
            Application bundle generation complete. [22.241 seconds]

            ▲ [WARNING] Ignoring this import because "node_modules/ag-grid-enterprise/dist/package/main.esm.mjs" was marked as having no side effects [ignored-bare-import]

                src/main.ts:4:7:
                  4 │ import 'ag-grid-enterprise';
                    ╵        ~~~~~~~~~~~~~~~~~~~~

              "sideEffects" is false in the enclosing "package.json" file:

                node_modules/ag-grid-enterprise/dist/package/package.json:47:2:
                  47 │   "sideEffects": false,
                     ╵   ~~~~~~~~~~~~~

            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal("Succeeded", r.Summary.Status);
        Assert.Equal(1, r.Summary.Warnings);
        Assert.Contains("src/main.ts:4:7", r.RawFiltered);
        Assert.Contains("import 'ag-grid-enterprise'", r.RawFiltered);
        Assert.Contains("\"sideEffects\" is false", r.RawFiltered);
    }

    [Fact]
    public void Keeps_SingleLine_Budget_Warning()
    {
        var raw = """
            Application bundle generation complete. [5.000 seconds]

            ▲ [WARNING] src/app/components/sidebar/sidebar.component.scss exceeded maximum budget. Budget 3.00 kB was not met by 2.85 kB with a total of 5.86 kB.

            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal("Succeeded", r.Summary.Status);
        Assert.Equal(1, r.Summary.Warnings);
        Assert.Contains("exceeded maximum budget", r.RawFiltered);
    }

    [Fact]
    public void Trims_Empty_Lines_Between_Warning_Blocks()
    {
        var raw = """

            ▲ [WARNING] first warning message


            ▲ [WARNING] second warning message

            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal(2, r.Summary.Warnings);
        Assert.DoesNotMatch(@"^\s*$", r.RawFiltered.Split('\n')[0]);
        var lastLine = r.RawFiltered.TrimEnd().Split('\n').Last();
        Assert.DoesNotMatch(@"^\s*$", lastLine);
    }

    [Fact]
    public void Mixed_Webpack_Noise_And_Warning_Block()
    {
        var raw = """
            13% building 1/2 entries 4/5 dependencies
            chunk {main} main.js 500 kB
            Application bundle generation complete. [10.000 seconds]

            ▲ [WARNING] Some important warning [some-code]

                src/app/foo.ts:10:5:
                  10 │ doSomething();
                     ╵ ~~~~~~~~~~~~

            """;
        var r = _p.Parse(raw, _limits);
        Assert.Equal("Succeeded", r.Summary.Status);
        Assert.Equal(1, r.Summary.Warnings);
        Assert.DoesNotContain("13%", r.RawFiltered);
        Assert.DoesNotContain("chunk", r.RawFiltered, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Some important warning", r.RawFiltered);
        Assert.Contains("src/app/foo.ts:10:5", r.RawFiltered);
        Assert.Contains("doSomething()", r.RawFiltered);
    }
}
