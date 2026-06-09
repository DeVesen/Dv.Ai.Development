using System.Diagnostics;
using Dev.Dotnet.Mcp.Models;

namespace Dev.Dotnet.Mcp.Services;

public sealed class DotnetScaffolder
{
    public static string BuildNewCommand(string template, string name, string outputPath, string? options = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(template);
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(outputPath);

        var parts = new List<string>
        {
            "new",
            template,
            "--name",
            Quote(name),
            "-o",
            Quote(outputPath),
        };

        if (!string.IsNullOrWhiteSpace(options))
            parts.AddRange(SplitOptions(options));

        return string.Join(' ', parts);
    }

    public static string BuildSlnAddCommand(string solutionPath, string projectPath) =>
        $"sln {Quote(solutionPath)} add {Quote(projectPath)}";

    public async Task<DotnetScaffoldResult> ScaffoldAsync(
        string template,
        string name,
        string outputPath,
        string? solutionPath = null,
        string? options = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(template))
            return Fail("template is required.");
        if (string.IsNullOrWhiteSpace(name))
            return Fail("name is required.");
        if (string.IsNullOrWhiteSpace(outputPath))
            return Fail("output_path is required.");

        var fullOutput = Path.GetFullPath(outputPath);
        var newArgs = BuildNewCommand(template, name, fullOutput, options);
        var newResult = await RunDotnetAsync(newArgs, cancellationToken);

        if (!newResult.Success)
        {
            return new DotnetScaffoldResult
            {
                Success = false,
                Command = $"dotnet {newArgs}",
                ProjectPath = fullOutput,
                Error = newResult.Error
            };
        }

        var addedToSolution = false;
        if (!string.IsNullOrWhiteSpace(solutionPath))
        {
            var slnPath = Path.GetFullPath(solutionPath);
            var csproj = Directory.EnumerateFiles(fullOutput, "*.csproj", SearchOption.TopDirectoryOnly).FirstOrDefault()
                ?? Path.Combine(fullOutput, $"{name}.csproj");

            if (File.Exists(slnPath) && File.Exists(csproj))
            {
                var slnArgs = BuildSlnAddCommand(slnPath, csproj);
                var slnResult = await RunDotnetAsync(slnArgs, cancellationToken);
                addedToSolution = slnResult.Success;
                if (!slnResult.Success)
                {
                    return new DotnetScaffoldResult
                    {
                        Success = true,
                        Command = $"dotnet {newArgs}",
                        ProjectPath = fullOutput,
                        AddedToSolution = false,
                        Error = $"Project created but sln add failed: {slnResult.Error}"
                    };
                }
            }
        }

        return new DotnetScaffoldResult
        {
            Success = true,
            Command = $"dotnet {newArgs}",
            ProjectPath = fullOutput,
            AddedToSolution = addedToSolution
        };
    }

    private static DotnetScaffoldResult Fail(string message) => new()
    {
        Success = false,
        Error = message
    };

    private static async Task<(bool Success, string? Error)> RunDotnetAsync(string arguments, CancellationToken cancellationToken)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "dotnet",
            Arguments = arguments,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        using var process = new Process { StartInfo = psi };

        try
        {
            if (!process.Start())
                return (false, "Failed to start dotnet process.");
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }

        var stdout = await process.StandardOutput.ReadToEndAsync(cancellationToken);
        var stderr = await process.StandardError.ReadToEndAsync(cancellationToken);
        await process.WaitForExitAsync(cancellationToken);

        if (process.ExitCode == 0)
            return (true, null);

        var message = !string.IsNullOrWhiteSpace(stderr) ? stderr.Trim()
            : !string.IsNullOrWhiteSpace(stdout) ? stdout.Trim()
            : $"dotnet exited with code {process.ExitCode}.";
        return (false, message);
    }

    private static string Quote(string value) =>
        value.Contains(' ') || value.Contains('"') ? $"\"{value.Replace("\"", "\\\"")}\"" : value;

    private static IEnumerable<string> SplitOptions(string options)
    {
        var tokens = new List<string>();
        var current = new System.Text.StringBuilder();
        var inQuotes = false;

        foreach (var ch in options.Trim())
        {
            if (ch == '"')
            {
                inQuotes = !inQuotes;
                continue;
            }

            if (char.IsWhiteSpace(ch) && !inQuotes)
            {
                if (current.Length > 0)
                {
                    tokens.Add(current.ToString());
                    current.Clear();
                }
                continue;
            }

            current.Append(ch);
        }

        if (current.Length > 0)
            tokens.Add(current.ToString());

        return tokens;
    }
}
