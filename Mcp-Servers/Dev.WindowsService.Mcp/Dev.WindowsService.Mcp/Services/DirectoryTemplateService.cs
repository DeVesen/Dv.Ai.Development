using System.Text.Json;
using Dev.WindowsService.Mcp.Models;

namespace Dev.WindowsService.Mcp.Services;

public sealed class DirectoryTemplateService
{
    public DirectoryStructureResult Create(string basePath, string pathsJson)
    {
        if (string.IsNullOrWhiteSpace(basePath)) return Fail("base_path is required.");
        if (string.IsNullOrWhiteSpace(pathsJson)) return Fail("paths_json is required.");

        string[] paths;
        try { paths = JsonSerializer.Deserialize<string[]>(pathsJson) ?? throw new JsonException("Expected JSON array of paths."); }
        catch (Exception ex) { return Fail($"Invalid paths_json: {ex.Message}"); }

        var fullBase = Path.GetFullPath(basePath);
        var createdDirs = new List<string>();
        var createdFiles = new List<string>();

        try
        {
            Directory.CreateDirectory(fullBase);

            foreach (var relative in paths)
            {
                if (string.IsNullOrWhiteSpace(relative)) continue;
                if (relative.Contains("..", StringComparison.Ordinal)) return Fail($"Path traversal denied in entry: {relative}");

                var target = Path.GetFullPath(Path.Combine(fullBase, relative.Replace('/', Path.DirectorySeparatorChar)));
                if (!target.StartsWith(fullBase + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)
                    && !target.Equals(fullBase, StringComparison.OrdinalIgnoreCase))
                    return Fail($"Path outside base_path: {relative}");

                if (Path.HasExtension(target))
                {
                    var dir = Path.GetDirectoryName(target);
                    if (!string.IsNullOrEmpty(dir)) { Directory.CreateDirectory(dir); createdDirs.Add(dir); }
                    if (!File.Exists(target)) { File.WriteAllText(target, string.Empty); createdFiles.Add(target); }
                }
                else
                {
                    Directory.CreateDirectory(target);
                    createdDirs.Add(target);
                }
            }

            return new DirectoryStructureResult { Success = true, CreatedDirs = createdDirs.Distinct(StringComparer.OrdinalIgnoreCase).ToList(), CreatedFiles = createdFiles };
        }
        catch (Exception ex) { return Fail(ex.Message); }
    }

    private static DirectoryStructureResult Fail(string message) => new() { Success = false, Error = message };
}
