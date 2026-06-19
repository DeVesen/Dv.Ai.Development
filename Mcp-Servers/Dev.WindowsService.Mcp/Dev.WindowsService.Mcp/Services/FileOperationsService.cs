using System.Text.RegularExpressions;
using Dev.WindowsService.Mcp.Models;

namespace Dev.WindowsService.Mcp.Services;

/// <summary>
/// Handles delete_file_safe, replace_in_files, and insert_member.
/// </summary>
public sealed class FileOperationsService
{
    private readonly ContentSearchService _content;

    public FileOperationsService(ContentSearchService content)
    {
        _content = content;
    }

    // ── delete_file_safe ──────────────────────────────────────────────────────

    public DeleteFileSafeResult DeleteFileSafe(string filePath, bool dryRun, bool force)
    {
        if (!File.Exists(filePath))
            return new DeleteFileSafeResult(false, [], false, "File not found", false);

        var repoRoot = FindRepoRoot(filePath);
        var baseName = Path.GetFileName(filePath);
        var baseNameNoExt = Path.GetFileNameWithoutExtension(filePath);

        var matches = _content.FindByContent(repoRoot, Regex.Escape(baseNameNoExt), null, 50);

        var refs = matches
            .Where(m => m.File != filePath)
            .Select(m => new FileReferenceMatch(m.File, m.Line, m.Match.Trim()))
            .ToList();

        var fileNameMatches = _content.FindByContent(repoRoot, Regex.Escape(baseName), null, 20);
        foreach (var m in fileNameMatches)
        {
            if (m.File == filePath) continue;
            if (!refs.Any(r => r.FilePath == m.File && r.Line == m.Line))
                refs.Add(new FileReferenceMatch(m.File, m.Line, m.Match.Trim()));
        }

        var hasSafeRefs = refs.Count == 0;
        string? warning = refs.Count > 0 && !force
            ? $"{refs.Count} reference(s) found. Use force=true to delete anyway."
            : null;

        var wouldDelete = dryRun || (hasSafeRefs || force);
        var deleted = false;

        if (!dryRun && (hasSafeRefs || force))
        {
            try { File.Delete(filePath); deleted = true; }
            catch (Exception ex)
            {
                return new DeleteFileSafeResult(false, refs, false, $"Delete failed: {ex.Message}", false);
            }
        }

        return new DeleteFileSafeResult(wouldDelete, refs, hasSafeRefs, warning, deleted);
    }

    // ── replace_in_files ──────────────────────────────────────────────────────

    public ReplaceInFilesResult ReplaceInFiles(
        string root, string? oldText, string? pattern,
        string newText, string? fileGlob,
        bool dryRun, bool confirm)
    {
        Regex regex;
        try
        {
            regex = pattern is not null
                ? new Regex(pattern, RegexOptions.Multiline)
                : new Regex(Regex.Escape(oldText!));
        }
        catch
        {
            return new ReplaceInFilesResult([], 0, false);
        }

        var results = new List<ReplacePreview>();
        var total = 0;
        var applied = false;

        foreach (var file in GlobMatcher.EnumerateFiles(root))
        {
            if (!PathValidator.IsUnderRoot(file, root)) continue;

            var ext = Path.GetExtension(file);
            if (ext is not (".cs" or ".ts" or ".tsx" or ".js" or ".json" or ".md" or ".html" or ".scss"))
                continue;

            if (fileGlob is not null)
            {
                var rootPrefix = root.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
                var relative = file.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase)
                    ? file[rootPrefix.Length..] : Path.GetRelativePath(root, file);
                if (!GlobMatcher.IsMatch(relative.Replace('\\', '/'), GlobMatcher.NormalizePattern(fileGlob))) continue;
            }

            string content;
            try { content = File.ReadAllText(file); }
            catch { continue; }

            var fileMatches = regex.Matches(content);
            if (fileMatches.Count == 0) continue;

            total += fileMatches.Count;

            var firstMatch = fileMatches[0];
            var start = Math.Max(0, firstMatch.Index - 40);
            var previewStr = content[start..(Math.Min(content.Length, firstMatch.Index + firstMatch.Length + 40))];
            if (start > 0) previewStr = "..." + previewStr;

            results.Add(new ReplacePreview(file, fileMatches.Count, previewStr.Replace('\n', ' ').Trim()));

            if (!dryRun && confirm)
            {
                var updated = regex.Replace(content, newText);
                try { File.WriteAllText(file, updated); applied = true; }
                catch { /* swallow */ }
            }
        }

        return new ReplaceInFilesResult(results, total, applied);
    }

    // ── insert_member ─────────────────────────────────────────────────────────

    public InsertMemberResult InsertMember(
        string filePath, string memberKind,
        string signature, string? body,
        string position, string? afterMemberName)
    {
        if (!File.Exists(filePath))
            return new InsertMemberResult(false, filePath, 0, "File not found");

        var ext = Path.GetExtension(filePath).ToLowerInvariant();

        if (ext == ".cs")
            return InsertMemberCSharp(filePath, memberKind, signature, body, position, afterMemberName);
        if (ext is ".ts" or ".tsx")
            return InsertMemberTypeScript(filePath, memberKind, signature, body, position, afterMemberName);

        return new InsertMemberResult(false, filePath, 0, $"Unsupported file type: {ext}");
    }

    private static InsertMemberResult InsertMemberCSharp(
        string filePath, string memberKind, string signature, string? body, string position, string? afterMemberName)
    {
        var lines = File.ReadAllLines(filePath).ToList();
        var insertAt = -1;
        var indentStr = "    ";

        if (position == "end_of_class")
        {
            for (var i = lines.Count - 1; i >= 0; i--)
            {
                if (lines[i].TrimStart().StartsWith('}'))
                {
                    insertAt = i;
                    if (i > 0) indentStr = DetectIndent(lines[i - 1]);
                    break;
                }
            }
        }
        else if (position == "after_member" && afterMemberName is not null)
        {
            for (var i = 0; i < lines.Count; i++)
            {
                if (Regex.IsMatch(lines[i], $@"\b{Regex.Escape(afterMemberName)}\b"))
                {
                    var depth = 0; var started = false;
                    for (var j = i; j < lines.Count; j++)
                    {
                        depth += lines[j].Count(c => c == '{') - lines[j].Count(c => c == '}');
                        if (!started && lines[j].Contains('{')) started = true;
                        if (started && depth <= 0) { insertAt = j + 1; break; }
                    }
                    if (insertAt < 0) insertAt = i + 1;
                    indentStr = DetectIndent(lines[i]);
                    break;
                }
            }
        }

        if (insertAt < 0)
            return new InsertMemberResult(false, filePath, 0, "Could not find insertion point");

        var newLines = BuildMemberLines(memberKind, signature, body, indentStr);
        lines.InsertRange(insertAt, newLines);
        File.WriteAllLines(filePath, lines);

        return new InsertMemberResult(true, filePath, insertAt + 1, null);
    }

    private static InsertMemberResult InsertMemberTypeScript(
        string filePath, string memberKind, string signature, string? body, string position, string? afterMemberName)
    {
        var lines = File.ReadAllLines(filePath).ToList();
        var insertAt = -1;
        var indentStr = "  ";

        if (position == "end_of_class")
        {
            for (var i = lines.Count - 1; i >= 0; i--)
            {
                if (lines[i].TrimStart().StartsWith('}'))
                {
                    insertAt = i;
                    if (i > 0) indentStr = DetectIndent(lines[i - 1]);
                    break;
                }
            }
        }
        else if (position == "after_member" && afterMemberName is not null)
        {
            for (var i = 0; i < lines.Count; i++)
            {
                if (Regex.IsMatch(lines[i], $@"\b{Regex.Escape(afterMemberName)}\b\s*[:({{]"))
                {
                    var depth = 0; var started = false;
                    for (var j = i; j < lines.Count; j++)
                    {
                        depth += lines[j].Count(c => c == '{') - lines[j].Count(c => c == '}');
                        if (!started && lines[j].Contains('{')) started = true;
                        if (started && depth <= 0) { insertAt = j + 1; break; }
                    }
                    if (insertAt < 0) insertAt = i + 1;
                    indentStr = DetectIndent(lines[i]);
                    break;
                }
            }
        }

        if (insertAt < 0)
            return new InsertMemberResult(false, filePath, 0, "Could not find insertion point");

        var newLines = BuildMemberLines(memberKind, signature, body, indentStr);
        lines.InsertRange(insertAt, newLines);
        File.WriteAllLines(filePath, lines);

        return new InsertMemberResult(true, filePath, insertAt + 1, null);
    }

    private static List<string> BuildMemberLines(string memberKind, string signature, string? body, string indent)
    {
        var lines = new List<string> { string.Empty };

        if (memberKind is "property" or "field")
        {
            lines.Add($"{indent}{signature}");
        }
        else // method
        {
            lines.Add($"{indent}{signature}");
            if (body is not null)
            {
                if (!signature.TrimEnd().EndsWith('{'))
                    lines.Add($"{indent}{{");
                foreach (var bodyLine in body.Split('\n'))
                    lines.Add($"{indent}    {bodyLine.TrimEnd('\r')}");
                lines.Add($"{indent}}}");
            }
            else
            {
                lines.Add($"{indent}{{");
                lines.Add($"{indent}    throw new NotImplementedException();");
                lines.Add($"{indent}}}");
            }
        }

        return lines;
    }

    private static string DetectIndent(string line)
    {
        var m = Regex.Match(line, @"^(\s+)");
        return m.Success ? m.Groups[1].Value : "    ";
    }

    private static string FindRepoRoot(string startPath)
    {
        var dir = File.Exists(startPath) ? Path.GetDirectoryName(startPath)! : startPath;
        var current = dir;
        for (var i = 0; i < 12; i++)
        {
            if (current is null) break;
            if (Directory.Exists(Path.Combine(current, ".git")))
                return current;
            var parent = Directory.GetParent(current)?.FullName;
            if (parent is null || parent == current) break;
            current = parent;
        }
        return dir;
    }
}
