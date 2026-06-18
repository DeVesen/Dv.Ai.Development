using Microsoft.Extensions.Configuration;

namespace Dev.WindowsService.Mcp.Services;

public sealed class AllowedDirectoriesService
{
    private readonly IReadOnlyList<string> _roots;

    public AllowedDirectoriesService(IConfiguration configuration)
    {
        var dirs = configuration.GetSection("McpService:AllowedDirectories").Get<string[]>() ?? [];
        _roots = dirs
            .Where(d => !string.IsNullOrWhiteSpace(d))
            .Select(d => Path.GetFullPath(d.Trim()).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar))
            .Where(Directory.Exists)
            .ToList();
    }

    public IReadOnlyList<string> Roots => _roots;

    public bool IsAllowed(string path)
    {
        if (_roots.Count == 0) return true;
        var full = Path.GetFullPath(path.Trim());
        return _roots.Any(r => full.Equals(r, StringComparison.OrdinalIgnoreCase)
            || full.StartsWith(r + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase));
    }

    public bool TryValidateAllowed(string path, out string error)
    {
        if (!IsAllowed(path))
        {
            error = $"Access denied: '{path}' is not under an allowed directory. Allowed: [{string.Join(", ", _roots)}]";
            return false;
        }
        error = string.Empty;
        return true;
    }
}
