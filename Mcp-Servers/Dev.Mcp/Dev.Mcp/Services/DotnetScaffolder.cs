using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;
using Dev.Mcp.Models;

namespace Dev.Mcp.Services;

public sealed class DotnetScaffolder
{
    public async Task<DotnetSolutionResult> CreateSolutionAsync(string name, string outputPath, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(name)) return new DotnetSolutionResult { Success = false, Error = "name is required." };
        if (string.IsNullOrWhiteSpace(outputPath)) return new DotnetSolutionResult { Success = false, Error = "output_path is required." };

        var fullOutput = Path.GetFullPath(outputPath);
        var args = $"new sln --name {Quote(name)} -o {Quote(fullOutput)}";
        var (success, error, console) = await RunDotnetAsync(args, cancellationToken);

        return new DotnetSolutionResult
        {
            Success = success,
            Command = $"dotnet {args}",
            SolutionPath = Path.Combine(fullOutput, $"{name}.sln"),
            Error = success ? null : error,
            ConsoleOutput = console
        };
    }

    public async Task<DotnetScaffoldResult> ScaffoldAsync(
        string template, string name, string outputPath, string? solutionPath = null, string? options = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(template)) return Fail("template is required.");
        if (string.IsNullOrWhiteSpace(name)) return Fail("name is required.");
        if (string.IsNullOrWhiteSpace(outputPath)) return Fail("output_path is required.");

        var fullOutput = Path.GetFullPath(outputPath);
        var parts = new List<string> { "new", template, "--name", Quote(name), "-o", Quote(fullOutput) };
        if (!string.IsNullOrWhiteSpace(options)) parts.AddRange(SplitOptions(options));
        var newArgs = string.Join(' ', parts);

        var (newSuccess, newError, newConsole) = await RunDotnetAsync(newArgs, cancellationToken);
        if (!newSuccess)
            return new DotnetScaffoldResult { Success = false, Command = $"dotnet {newArgs}", ProjectPath = fullOutput, Error = newError, ConsoleOutput = newConsole };

        var consoleLog = new StringBuilder();
        consoleLog.AppendLine(newConsole);

        var addedToSolution = false;
        if (!string.IsNullOrWhiteSpace(solutionPath))
        {
            var slnPath = Path.GetFullPath(solutionPath);
            var csproj = Directory.EnumerateFiles(fullOutput, "*.csproj", SearchOption.TopDirectoryOnly).FirstOrDefault()
                ?? Path.Combine(fullOutput, $"{name}.csproj");

            if (File.Exists(slnPath) && File.Exists(csproj))
            {
                var slnArgs = $"sln {Quote(slnPath)} add {Quote(csproj)}";
                var (slnSuccess, slnError, slnConsole) = await RunDotnetAsync(slnArgs, cancellationToken);
                consoleLog.AppendLine(slnConsole);
                addedToSolution = slnSuccess;
                if (!slnSuccess)
                    return new DotnetScaffoldResult { Success = true, Command = $"dotnet {newArgs}", ProjectPath = fullOutput, AddedToSolution = false, Error = $"Project created but sln add failed: {slnError}", ConsoleOutput = consoleLog.ToString().Trim() };
            }
        }

        return new DotnetScaffoldResult { Success = true, Command = $"dotnet {newArgs}", ProjectPath = fullOutput, AddedToSolution = addedToSolution, ConsoleOutput = consoleLog.ToString().Trim() };
    }

    public Task<DotnetTestClassResult> ScaffoldTestClassAsync(
        string testProjectPath, string className, string? ns = null,
        string? relativeFolder = null, string? testFramework = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(testProjectPath))
            return Task.FromResult(new DotnetTestClassResult { Success = false, Error = "test_project_path is required." });
        if (string.IsNullOrWhiteSpace(className))
            return Task.FromResult(new DotnetTestClassResult { Success = false, Error = "class_name is required." });

        string resolvedCsproj;
        try { resolvedCsproj = Path.GetFullPath(testProjectPath.Trim()); }
        catch (Exception ex) { return Task.FromResult(new DotnetTestClassResult { Success = false, Error = $"Invalid test_project_path: {ex.Message}" }); }

        string projectDir;
        if (resolvedCsproj.EndsWith(".csproj", StringComparison.OrdinalIgnoreCase))
        {
            if (!File.Exists(resolvedCsproj))
                return Task.FromResult(new DotnetTestClassResult { Success = false, Error = $"Project file not found: {resolvedCsproj}" });
            projectDir = Path.GetDirectoryName(resolvedCsproj)!;
        }
        else
        {
            projectDir = resolvedCsproj;
            if (!Directory.Exists(projectDir))
                return Task.FromResult(new DotnetTestClassResult { Success = false, Error = $"Project directory not found: {projectDir}" });
            var found = Directory.EnumerateFiles(projectDir, "*.csproj", SearchOption.TopDirectoryOnly).FirstOrDefault();
            if (found != null) resolvedCsproj = found;
        }

        var framework = ResolveTestFramework(resolvedCsproj, testFramework);

        var targetDir = string.IsNullOrWhiteSpace(relativeFolder)
            ? projectDir
            : Path.Combine(projectDir, relativeFolder.Trim());

        var resolvedNs = ResolveNamespace(resolvedCsproj, relativeFolder, ns);
        var filePath = Path.Combine(targetDir, $"{className}.cs");

        if (File.Exists(filePath))
            return Task.FromResult(new DotnetTestClassResult { Success = false, Error = $"Test class file already exists: {filePath}" });

        try
        {
            Directory.CreateDirectory(targetDir);
            var content = GenerateTestClassContent(className, resolvedNs, framework);
            File.WriteAllText(filePath, content, System.Text.Encoding.UTF8);
            return Task.FromResult(new DotnetTestClassResult { Success = true, CreatedFiles = [filePath] });
        }
        catch (Exception ex)
        {
            return Task.FromResult(new DotnetTestClassResult { Success = false, Error = $"Failed to write test class: {ex.Message}" });
        }
    }

    private static string ResolveTestFramework(string csprojPath, string? explicitFramework)
    {
        if (!string.IsNullOrWhiteSpace(explicitFramework))
            return explicitFramework.Trim().ToLowerInvariant();

        if (!File.Exists(csprojPath)) return "nunit";

        var content = File.ReadAllText(csprojPath);
        if (Regex.IsMatch(content, @"<PackageReference\s+Include=""NUnit""", RegexOptions.IgnoreCase)) return "nunit";
        if (Regex.IsMatch(content, @"<PackageReference\s+Include=""xunit""", RegexOptions.IgnoreCase)) return "xunit";
        if (Regex.IsMatch(content, @"<PackageReference\s+Include=""MSTest", RegexOptions.IgnoreCase)) return "mstest";
        return "nunit";
    }

    private static string ResolveNamespace(string csprojPath, string? relativeFolder, string? explicitNs)
    {
        if (!string.IsNullOrWhiteSpace(explicitNs)) return explicitNs.Trim();

        var projectName = Path.GetFileNameWithoutExtension(csprojPath);
        if (string.IsNullOrWhiteSpace(relativeFolder)) return projectName;

        var folderNs = relativeFolder.Trim().Replace('/', '.').Replace('\\', '.').Trim('.');
        return $"{projectName}.{folderNs}";
    }

    private static string GenerateTestClassContent(string className, string ns, string framework) => framework switch
    {
        "xunit" => $$"""
            using Xunit;

            namespace {{ns}};

            public class {{className}}
            {
                [Fact]
                public void Should_Pass()
                {
                    Assert.True(true);
                }
            }
            """,
        "mstest" => $$"""
            using Microsoft.VisualStudio.TestTools.UnitTesting;

            namespace {{ns}};

            [TestClass]
            public class {{className}}
            {
                [TestMethod]
                public void Should_Pass()
                {
                    Assert.IsTrue(true);
                }
            }
            """,
        _ => $$"""
            using NUnit.Framework;

            namespace {{ns}};

            [TestFixture]
            public class {{className}}
            {
                [Test]
                public void Should_Pass()
                {
                    Assert.Pass();
                }
            }
            """,
    };

    public Task<ScaffoldDtoResult> ScaffoldDtoAsync(
        string outputPath, string className, string @namespace,
        IReadOnlyList<ScaffoldDtoProperty> properties, string classType = "record")
    {
        if (string.IsNullOrWhiteSpace(outputPath)) return Task.FromResult(new ScaffoldDtoResult(false, null, "output_path is required."));
        if (string.IsNullOrWhiteSpace(className)) return Task.FromResult(new ScaffoldDtoResult(false, null, "class_name is required."));
        if (string.IsNullOrWhiteSpace(@namespace)) return Task.FromResult(new ScaffoldDtoResult(false, null, "namespace is required."));

        var dir = Path.GetFullPath(outputPath);
        var filePath = Path.Combine(dir, $"{className}.cs");

        try
        {
            Directory.CreateDirectory(dir);
            var sb = new StringBuilder();

            if (classType == "record")
            {
                sb.AppendLine($"namespace {@namespace};");
                sb.AppendLine();
                if (properties.Count == 0)
                {
                    sb.AppendLine($"public sealed record {className};");
                }
                else
                {
                    sb.Append($"public sealed record {className}(");
                    var propLines = properties.Select(p =>
                    {
                        var typeName = p.Required ? p.Type : $"{p.Type}?";
                        return $"\n    {typeName} {p.Name}";
                    });
                    sb.Append(string.Join(",", propLines));
                    sb.AppendLine("\n);");
                }
            }
            else
            {
                var hasRequired = properties.Any(p => p.Required);
                if (hasRequired)
                    sb.AppendLine("using System.ComponentModel.DataAnnotations;");
                sb.AppendLine();
                sb.AppendLine($"namespace {@namespace};");
                sb.AppendLine();
                sb.AppendLine($"public sealed class {className}");
                sb.AppendLine("{");
                foreach (var p in properties)
                {
                    var typeName = p.Required ? p.Type : $"{p.Type}?";
                    if (p.Required)
                        sb.AppendLine($"    [Required]");
                    sb.AppendLine($"    public {typeName} {p.Name} {{ get; set; }}");
                }
                sb.AppendLine("}");
            }

            File.WriteAllText(filePath, sb.ToString(), System.Text.Encoding.UTF8);
            return Task.FromResult(new ScaffoldDtoResult(true, filePath, null));
        }
        catch (Exception ex)
        {
            return Task.FromResult(new ScaffoldDtoResult(false, null, ex.Message));
        }
    }

    public Task<ScaffoldApiActionResult> ScaffoldApiActionAsync(
        string controllerFilePath, string httpMethod, string routeTemplate,
        string actionName, string? requestDto = null, string? responseDto = null)
    {
        if (string.IsNullOrWhiteSpace(controllerFilePath)) return Task.FromResult(new ScaffoldApiActionResult(false, null, null, "controller_file_path is required."));
        if (string.IsNullOrWhiteSpace(httpMethod)) return Task.FromResult(new ScaffoldApiActionResult(false, null, null, "http_method is required."));
        if (string.IsNullOrWhiteSpace(actionName)) return Task.FromResult(new ScaffoldApiActionResult(false, null, null, "action_name is required."));

        var filePath = Path.GetFullPath(controllerFilePath);
        if (!File.Exists(filePath)) return Task.FromResult(new ScaffoldApiActionResult(false, null, null, $"Controller file not found: {filePath}"));

        try
        {
            var lines = File.ReadAllLines(filePath).ToList();

            // Find class-level closing brace.
            // Old-style block namespace: namespace Foo { class Bar { } } → class } is indented, namespace } is at col 0.
            // File-scoped namespace (C# 10+): namespace Foo; class Bar { } → class } is at col 0.
            var hasBlockNamespace = lines.Any(l =>
            {
                var t = l.Trim();
                return t.StartsWith("namespace ", StringComparison.Ordinal) && t.EndsWith("{", StringComparison.Ordinal);
            });

            var insertAt = -1;
            for (var i = lines.Count - 1; i >= 0; i--)
            {
                var line = lines[i];
                if (line.Trim() != "}") continue;

                if (hasBlockNamespace && line[0] == '}')
                    continue; // col-0 brace in block-namespace file = namespace closing brace, skip

                insertAt = i;
                break;
            }

            if (insertAt < 0) return Task.FromResult(new ScaffoldApiActionResult(false, filePath, null, "Could not locate class closing brace to insert action."));

            var method = httpMethod.Trim().ToUpperInvariant();
            var httpAttr = method switch
            {
                "GET" => "HttpGet",
                "POST" => "HttpPost",
                "PUT" => "HttpPut",
                "PATCH" => "HttpPatch",
                "DELETE" => "HttpDelete",
                _ => "HttpGet"
            };

            var returnType = responseDto is not null ? $"ActionResult<{responseDto}>" : "IActionResult";
            var paramList = new List<string>();

            // Extract all route template parameters {paramName} generically
            var routeParams = System.Text.RegularExpressions.Regex.Matches(routeTemplate ?? string.Empty, @"\{(\w+)(?::[^}]*)?\}")
                .Select(m => m.Groups[1].Value)
                .Distinct()
                .ToList();
            foreach (var p in routeParams)
                paramList.Add($"[FromRoute] int {p}"); // default type int; developer adjusts as needed

            if (requestDto is not null) paramList.Add($"[FromBody] {requestDto} request");
            var paramStr = string.Join(", ", paramList);

            var routeStr = string.IsNullOrWhiteSpace(routeTemplate) ? string.Empty : $"(\"{routeTemplate}\")";

            // Determine additional ProducesResponseType annotations
            var produces = new List<string> { "    [ProducesResponseType(StatusCodes.Status200OK)]" };
            if (requestDto is not null || method is "POST" or "PUT" or "PATCH")
                produces.Add("    [ProducesResponseType(StatusCodes.Status400BadRequest)]");
            if (routeParams.Count > 0)
                produces.Add("    [ProducesResponseType(StatusCodes.Status404NotFound)]");

            var actionLines = new List<string> { string.Empty };
            actionLines.Add($"    [{httpAttr}{routeStr}]");
            actionLines.AddRange(produces);
            actionLines.Add($"    public async Task<{returnType}> {actionName}({paramStr})");
            actionLines.Add("    {");
            actionLines.Add("        throw new NotImplementedException();");
            actionLines.Add("    }");

            lines.InsertRange(insertAt, actionLines);
            File.WriteAllLines(filePath, lines, System.Text.Encoding.UTF8);
            return Task.FromResult(new ScaffoldApiActionResult(true, filePath, insertAt + 1, null));
        }
        catch (Exception ex)
        {
            return Task.FromResult(new ScaffoldApiActionResult(false, filePath, null, ex.Message));
        }
    }

    private static DotnetScaffoldResult Fail(string message) => new() { Success = false, Error = message };

    private static async Task<(bool Success, string? Error, string ConsoleOutput)> RunDotnetAsync(string arguments, CancellationToken cancellationToken)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "dotnet", Arguments = arguments,
            RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false, CreateNoWindow = true,
        };

        using var process = new Process { StartInfo = psi };
        try { if (!process.Start()) return (false, "Failed to start dotnet process.", $"> dotnet {arguments}\n\n(process failed to start)"); }
        catch (Exception ex) { return (false, ex.Message, $"> dotnet {arguments}\n\n(exception: {ex.Message})"); }

        var stdout = await process.StandardOutput.ReadToEndAsync(cancellationToken);
        var stderr = await process.StandardError.ReadToEndAsync(cancellationToken);
        await process.WaitForExitAsync(cancellationToken);

        var consoleOutput = $"> dotnet {arguments}\n\n{(stdout + "\n" + stderr).Trim()}";
        if (process.ExitCode == 0) return (true, null, consoleOutput);

        var message = !string.IsNullOrWhiteSpace(stderr) ? stderr.Trim()
            : !string.IsNullOrWhiteSpace(stdout) ? stdout.Trim()
            : $"dotnet exited with code {process.ExitCode}.";
        return (false, message, consoleOutput);
    }

    private static string Quote(string value) =>
        value.Contains(' ') || value.Contains('"') ? $"\"{value.Replace("\"", "\\\"")}\"" : value;

    private static IEnumerable<string> SplitOptions(string options)
    {
        var tokens = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;
        foreach (var ch in options.Trim())
        {
            if (ch == '"') { inQuotes = !inQuotes; continue; }
            if (char.IsWhiteSpace(ch) && !inQuotes) { if (current.Length > 0) { tokens.Add(current.ToString()); current.Clear(); } continue; }
            current.Append(ch);
        }
        if (current.Length > 0) tokens.Add(current.ToString());
        return tokens;
    }
}
