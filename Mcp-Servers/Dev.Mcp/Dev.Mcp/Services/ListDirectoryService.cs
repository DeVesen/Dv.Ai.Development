using Dev.Mcp.Models;

namespace Dev.Mcp.Services;

public sealed class ListDirectoryService
{
    private const int MaxDepth = 5;
    private const int MaxEntries = 500;

    public IReadOnlyList<DirectoryEntry> ListDirectory(string path, int depth)
    {
        depth = Math.Clamp(depth, 1, MaxDepth);
        var counter = new[] { 0 };
        return BuildChildren(path, depth, counter);
    }

    private static IReadOnlyList<DirectoryEntry> BuildChildren(string path, int remainingDepth, int[] counter)
    {
        var entries = new List<DirectoryEntry>();
        if (counter[0] >= MaxEntries) return entries;

        try
        {
            foreach (var dir in Directory.GetDirectories(path).OrderBy(d => d))
            {
                if (counter[0] >= MaxEntries) break;
                counter[0]++;
                var children = remainingDepth > 1 ? BuildChildren(dir, remainingDepth - 1, counter) : null;
                entries.Add(new DirectoryEntry(System.IO.Path.GetFileName(dir), "dir", dir, null, children));
            }

            foreach (var file in Directory.GetFiles(path).OrderBy(f => f))
            {
                if (counter[0] >= MaxEntries) break;
                counter[0]++;
                long size;
                try { size = new FileInfo(file).Length; } catch { size = 0; }
                entries.Add(new DirectoryEntry(System.IO.Path.GetFileName(file), "file", file, size, null));
            }
        }
        catch { /* ignore access denied */ }

        return entries;
    }
}
