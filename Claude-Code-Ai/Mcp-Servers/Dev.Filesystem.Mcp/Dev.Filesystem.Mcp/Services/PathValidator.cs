namespace Dev.Filesystem.Mcp.Services;

public static class PathValidator
{
    public static bool TryValidateRoot(string root, out string normalizedRoot, out string error)
    {
        normalizedRoot = string.Empty;
        error = string.Empty;

        if (string.IsNullOrWhiteSpace(root))
        {
            error = "root is required";
            return false;
        }

        try
        {
            normalizedRoot = Path.GetFullPath(root.Trim());
        }
        catch (Exception ex)
        {
            error = ex.Message;
            return false;
        }

        if (!Directory.Exists(normalizedRoot))
        {
            error = $"Root directory not found: {normalizedRoot}";
            return false;
        }

        return true;
    }

    public static bool TryValidateUnderRoot(string path, string root, out string normalizedPath, out string? error)
    {
        normalizedPath = string.Empty;
        error = null;

        if (string.IsNullOrWhiteSpace(path))
        {
            error = "path is required.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(root))
        {
            error = "root is required.";
            return false;
        }

        try
        {
            var fullRoot = Path.GetFullPath(root.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar));
            var fullPath = Path.GetFullPath(path);
            var rootPrefix = fullRoot + Path.DirectorySeparatorChar;

            if (!fullPath.Equals(fullRoot, StringComparison.OrdinalIgnoreCase)
                && !fullPath.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase))
            {
                error = $"Path traversal denied: '{path}' is outside root '{root}'.";
                return false;
            }

            normalizedPath = fullPath;
            return true;
        }
        catch (Exception ex)
        {
            error = $"Invalid path: {ex.Message}";
            return false;
        }
    }

    public static bool TryValidateFile(string filePath, string root, out string normalizedFile, out string error)
    {
        normalizedFile = string.Empty;
        error = string.Empty;

        if (!TryValidateUnderRoot(filePath, root, out normalizedFile, out var underRootError))
        {
            error = underRootError ?? "Invalid path";
            return false;
        }

        if (!File.Exists(normalizedFile))
        {
            error = $"File not found: {normalizedFile}";
            return false;
        }

        return true;
    }

    public static bool IsUnderRoot(string path, string normalizedRoot)
    {
        var full = Path.GetFullPath(path.Trim());
        var root = normalizedRoot.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        var prefix = root + Path.DirectorySeparatorChar;
        return full.Equals(root, StringComparison.OrdinalIgnoreCase)
               || full.StartsWith(prefix, StringComparison.OrdinalIgnoreCase);
    }
}
