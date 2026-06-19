using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;
using Dev.Mcp.Models;

namespace Dev.Mcp.Services;

public sealed partial class AngularScaffolder
{
    private static readonly string NgExecutable = OperatingSystem.IsWindows() ? "ng.cmd" : "ng";

    [GeneratedRegex(@"^\s*CREATE\s+(.+?)\s+\(\d+\s+bytes\)\s*$", RegexOptions.IgnoreCase)]
    private static partial Regex CreateLineRegex();

    public async Task<AngularScaffoldResult> CreateProjectAsync(string parentDirectory, string name, string? options = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(parentDirectory))
            return new AngularScaffoldResult { Success = false, ExitCode = -1, Error = "parent_directory is required." };
        if (!Directory.Exists(parentDirectory))
            return new AngularScaffoldResult { Success = false, ExitCode = -1, Error = $"parent_directory does not exist: {parentDirectory}" };

        var args = new List<string> { "new", name };
        if (!string.IsNullOrWhiteSpace(options)) args.AddRange(SplitOptions(options));
        else args.AddRange(["--standalone", "--skip-tests", "--routing", "--style=scss"]);

        return await RunNgAsync(parentDirectory, args, cancellationToken);
    }

    public async Task<AngularScaffoldResult> ScaffoldComponentAsync(string projectRoot, string name, string? path = null, string? options = null, bool includeTests = false, CancellationToken cancellationToken = default)
    {
        var defaults = includeTests ? new[] { "--standalone" } : new[] { "--standalone", "--skip-tests" };
        var args = BuildArgumentList("component", name, path, options, defaults);
        return await RunNgAsync(projectRoot, args, cancellationToken);
    }

    public async Task<AngularScaffoldResult> ScaffoldServiceAsync(string projectRoot, string name, string? path = null, string? options = null, bool includeTests = false, CancellationToken cancellationToken = default)
    {
        var defaults = includeTests ? Array.Empty<string>() : new[] { "--skip-tests" };
        var args = BuildArgumentList("service", name, path, options, defaults);
        return await RunNgAsync(projectRoot, args, cancellationToken);
    }

    public async Task<AngularScaffoldResult> ScaffoldDirectiveAsync(string projectRoot, string name, string? path = null, string? options = null, bool includeTests = false, CancellationToken cancellationToken = default)
    {
        var defaults = includeTests ? new[] { "--standalone" } : new[] { "--standalone", "--skip-tests" };
        var args = BuildArgumentList("directive", name, path, options, defaults);
        return await RunNgAsync(projectRoot, args, cancellationToken);
    }

    public Task<AngularScaffoldResult> ScaffoldSpecAsync(string projectRoot, string sourceFilePath, bool force = false, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(projectRoot))
            return Task.FromResult(new AngularScaffoldResult { Success = false, ExitCode = -1, Error = "project_root is required." });
        if (string.IsNullOrWhiteSpace(sourceFilePath))
            return Task.FromResult(new AngularScaffoldResult { Success = false, ExitCode = -1, Error = "source_file_path is required." });

        string resolvedSource;
        try
        {
            resolvedSource = Path.IsPathRooted(sourceFilePath.Trim())
                ? Path.GetFullPath(sourceFilePath.Trim())
                : Path.GetFullPath(Path.Combine(projectRoot.Trim(), sourceFilePath.Trim()));
        }
        catch (Exception ex)
        {
            return Task.FromResult(new AngularScaffoldResult { Success = false, ExitCode = -1, Error = $"Invalid source_file_path: {ex.Message}" });
        }

        if (!File.Exists(resolvedSource))
            return Task.FromResult(new AngularScaffoldResult { Success = false, ExitCode = -1, Error = $"Source file not found: {resolvedSource}" });

        var nameWithoutExt = Path.GetFileNameWithoutExtension(resolvedSource);
        var dir = Path.GetDirectoryName(resolvedSource)!;
        var specPath = Path.Combine(dir, $"{nameWithoutExt}.spec.ts");

        if (File.Exists(specPath) && !force)
            return Task.FromResult(new AngularScaffoldResult { Success = false, ExitCode = -1, Error = $"Spec file already exists: {specPath}. Use force=true to overwrite." });

        try
        {
            var content = GenerateSpecContent(nameWithoutExt, resolvedSource);
            Directory.CreateDirectory(dir);
            File.WriteAllText(specPath, content, System.Text.Encoding.UTF8);
            return Task.FromResult(new AngularScaffoldResult
            {
                Success = true,
                CreatedFiles = [specPath],
                ExitCode = 0,
                Stdout = $"CREATE {specPath}",
            });
        }
        catch (Exception ex)
        {
            return Task.FromResult(new AngularScaffoldResult { Success = false, ExitCode = -1, Error = $"Failed to write spec file: {ex.Message}" });
        }
    }

    private static string GenerateSpecContent(string fileBaseName, string resolvedSource)
    {
        var parts = fileBaseName.Split('.');
        var typePart = parts.Length > 1 ? parts[^1] : string.Empty;
        var namePart = parts.Length > 1 ? string.Join('-', parts[..^1]) : parts[0];
        var className = ToPascalCase(namePart) + ToPascalCase(typePart);

        return typePart switch
        {
            "component" => $$"""
                import { ComponentFixture, TestBed } from '@angular/core/testing';

                import { {{className}} } from './{{fileBaseName}}';

                describe('{{className}}', () => {
                  let component: {{className}};
                  let fixture: ComponentFixture<{{className}}>;

                  beforeEach(async () => {
                    await TestBed.configureTestingModule({
                      imports: [{{className}}]
                    }).compileComponents();

                    fixture = TestBed.createComponent({{className}});
                    component = fixture.componentInstance;
                    fixture.detectChanges();
                  });

                  it('should create', () => {
                    expect(component).toBeTruthy();
                  });
                });
                """,
            "service" => $$"""
                import { TestBed } from '@angular/core/testing';

                import { {{className}} } from './{{fileBaseName}}';

                describe('{{className}}', () => {
                  beforeEach(() => TestBed.configureTestingModule({}));

                  it('should be created', () => {
                    const service = TestBed.inject({{className}});
                    expect(service).toBeTruthy();
                  });
                });
                """,
            "directive" => $$"""
                import { TestBed } from '@angular/core/testing';

                import { {{className}} } from './{{fileBaseName}}';

                describe('{{className}}', () => {
                  beforeEach(() => TestBed.configureTestingModule({
                    imports: [{{className}}]
                  }));

                  it('should create an instance', () => {
                    const directive = TestBed.inject({{className}});
                    expect(directive).toBeTruthy();
                  });
                });
                """,
            "pipe" => $$"""
                import { {{className}} } from './{{fileBaseName}}';

                describe('{{className}}', () => {
                  it('create an instance', () => {
                    const pipe = new {{className}}();
                    expect(pipe).toBeTruthy();
                  });
                });
                """,
            _ => $$"""
                import { {{className}} } from './{{fileBaseName}}';

                describe('{{className}}', () => {
                  it('should be created', () => {
                    expect(new {{className}}()).toBeTruthy();
                  });
                });
                """,
        };
    }

    private static string ToPascalCase(string input)
    {
        if (string.IsNullOrEmpty(input)) return string.Empty;
        var words = input.Split(['-', '_'], StringSplitOptions.RemoveEmptyEntries);
        return string.Concat(words.Select(w => char.ToUpper(w[0]) + w[1..]));
    }

    private static IReadOnlyList<string> BuildArgumentList(string schematic, string name, string? path, string? options, string[] defaultFlags)
    {
        var args = new List<string> { "generate", schematic, name };
        if (!string.IsNullOrWhiteSpace(path)) args.Add($"--path={path.Trim()}");
        if (!string.IsNullOrWhiteSpace(options)) args.AddRange(SplitOptions(options));
        else args.AddRange(defaultFlags);
        return args;
    }

    private async Task<AngularScaffoldResult> RunNgAsync(string projectRoot, IReadOnlyList<string> args, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(projectRoot)) return new AngularScaffoldResult { Success = false, ExitCode = -1, Error = "project_root is required." };
        if (!Directory.Exists(projectRoot)) return new AngularScaffoldResult { Success = false, ExitCode = -1, Error = $"project_root does not exist: {projectRoot}" };

        var psi = new ProcessStartInfo
        {
            FileName = NgExecutable, Arguments = string.Join(' ', args.Select(QuoteIfNeeded)),
            WorkingDirectory = Path.GetFullPath(projectRoot),
            RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false, CreateNoWindow = true,
        };

        using var process = new Process { StartInfo = psi };
        try { if (!process.Start()) return new AngularScaffoldResult { Success = false, ExitCode = -1, Error = "Failed to start ng process." }; }
        catch (Exception ex) { return new AngularScaffoldResult { Success = false, ExitCode = -1, Error = $"Failed to start ng: {ex.Message}" }; }

        var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);
        await process.WaitForExitAsync(cancellationToken);

        var stdout = await stdoutTask;
        var stderr = await stderrTask;
        var exitCode = process.ExitCode;
        var createdFiles = ParseCreateLines(stdout);

        return new AngularScaffoldResult
        {
            Success = exitCode == 0, CreatedFiles = createdFiles, ExitCode = exitCode,
            Error = exitCode == 0 ? null : BuildErrorMessage(exitCode, stderr, stdout),
            Stdout = stdout, Stderr = string.IsNullOrWhiteSpace(stderr) ? null : stderr,
        };
    }

    private static IReadOnlyList<string> ParseCreateLines(string stdout)
    {
        if (string.IsNullOrWhiteSpace(stdout)) return [];
        var files = new List<string>();
        foreach (var line in stdout.Split('\n'))
        {
            var match = CreateLineRegex().Match(line.TrimEnd('\r'));
            if (match.Success) files.Add(match.Groups[1].Value);
        }
        return files;
    }

    private static string? BuildErrorMessage(int exitCode, string stderr, string stdout)
    {
        if (!string.IsNullOrWhiteSpace(stderr)) return stderr.Trim();
        if (!string.IsNullOrWhiteSpace(stdout)) return stdout.Trim();
        return $"ng exited with code {exitCode}.";
    }

    private static string QuoteIfNeeded(string arg) =>
        arg.Contains(' ') || arg.Contains('"') ? $"\"{arg.Replace("\"", "\\\"")}\"" : arg;

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
