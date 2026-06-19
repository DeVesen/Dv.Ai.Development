using System.Text.RegularExpressions;
using Dev.WindowsService.Mcp.Models;

namespace Dev.WindowsService.Mcp.Services;

/// <summary>
/// Handles find_angular_route, find_angular_guard, find_di_registration (Angular)
/// and read_component_bundle.
/// </summary>
public sealed class AngularDiscoveryService
{
    private readonly ContentSearchService _content;
    private readonly CodeReadService _codeRead;

    public AngularDiscoveryService(ContentSearchService content, CodeReadService codeRead)
    {
        _content = content;
        _codeRead = codeRead;
    }

    // ── find_angular_route ────────────────────────────────────────────────────

    public FindAngularRouteResult FindRoutes(string root, string routePath, int max = 20)
    {
        var escaped = Regex.Escape(routePath);
        var pattern = $@"path\s*:\s*['""][^'""]*{escaped}[^'""]*['""]";
        var matches = _content.FindByContent(root, pattern, "*.ts", max + 5);

        var routes = new List<AngularRouteMatch>();
        foreach (var m in matches)
        {
            if (routes.Count >= max) break;
            var routePathMatch = Regex.Match(m.Match, @"path\s*:\s*['""]([^'""]*)['""]");
            if (!routePathMatch.Success) continue;

            string? component = null;
            var compMatch = Regex.Match(m.Match, @"component\s*:\s*(\w+)");
            if (compMatch.Success) component = compMatch.Groups[1].Value;

            routes.Add(new AngularRouteMatch(routePathMatch.Groups[1].Value, component, m.File, m.Line, null));
        }

        return new FindAngularRouteResult(routes, matches.Count > max);
    }

    // ── find_angular_guard ────────────────────────────────────────────────────

    public FindAngularGuardResult FindGuards(string root, string guardName, int max = 20)
    {
        var escaped = Regex.Escape(guardName);
        var pattern = $@"(?:canActivate|CanActivateFn|@Injectable|class\s+\w*{escaped}\w*)";
        var matches = _content.FindByContent(root, pattern, "*.ts", max + 5);

        var nameMatches = _content.FindByContent(root, escaped, "*.ts", max + 5);

        var combined = matches.Concat(nameMatches)
            .GroupBy(m => m.File)
            .SelectMany(g => g)
            .Take(max + 5)
            .ToList();

        var guards = new List<AngularGuardMatch>();
        var seenFiles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var m in combined)
        {
            if (guards.Count >= max) break;
            if (!seenFiles.Add(m.File)) continue;

            var guardNameMatch = Regex.Match(m.File, @"([\w-]+)(?:\.guard)?\.ts$", RegexOptions.IgnoreCase);
            var name = guardNameMatch.Success ? guardNameMatch.Groups[1].Value : Path.GetFileNameWithoutExtension(m.File);

            bool? canActivate = m.Match.Contains("canActivate", StringComparison.OrdinalIgnoreCase) ? true : null;
            bool? canActivateChild = m.Match.Contains("canActivateChild", StringComparison.OrdinalIgnoreCase) ? true : null;

            guards.Add(new AngularGuardMatch(name, m.File, m.Line, canActivate, canActivateChild));
        }

        return new FindAngularGuardResult(guards, combined.Count > max);
    }

    // ── find_di_registration (Angular providers) ──────────────────────────────

    public FindDiRegistrationResult FindAngularDiRegistrations(string root, string serviceName, int max = 20)
    {
        var escaped = Regex.Escape(serviceName);
        var pattern = $@"providers\s*:\s*\[.*{escaped}.*\]|provide\s*:\s*{escaped}";
        var matches = _content.FindByContent(root, pattern, "*.ts", max + 5);

        var regs = matches.Take(max).Select(m => new DiRegistrationMatch(
            serviceName, "angular_provider", m.File, m.Line, m.Match.Trim()
        )).ToList();

        return new FindDiRegistrationResult(regs, matches.Count > max);
    }

    // ── read_component_bundle ─────────────────────────────────────────────────

    public ReadComponentBundleResult ReadComponentBundle(
        string componentTsPath,
        bool includeTemplate,
        string templateMode,
        bool includeStyles,
        bool includeSpec)
    {
        var dir = Path.GetDirectoryName(componentTsPath)!;
        var baseName = Path.GetFileNameWithoutExtension(componentTsPath);

        string tsContent;
        try { tsContent = File.ReadAllText(componentTsPath); }
        catch (Exception ex) { throw new InvalidOperationException($"Cannot read component: {ex.Message}"); }

        var selector = ExtractDecoratorProp(tsContent, "selector");
        var standaloneStr = ExtractDecoratorProp(tsContent, "standalone");
        bool? standalone = standaloneStr switch { "true" => true, "false" => false, _ => null };

        var importsBlock = ExtractDecoratorProp(tsContent, "imports");
        var imports = importsBlock is not null
            ? Regex.Matches(importsBlock, @"\b(\w+)\b").Select(m => m.Groups[1].Value).Distinct().ToList()
            : (List<string>?)null;

        IReadOnlyList<SignatureEntry>? sigs = null;
        try { sigs = _codeRead.ReadSignaturesOnly(componentTsPath, false); }
        catch { /* swallow */ }

        ComponentSignatures? typescript = sigs is not null ? new ComponentSignatures(sigs) : null;

        TemplateInfo? template = null;
        if (includeTemplate)
        {
            var templateUrl = ExtractDecoratorProp(tsContent, "templateUrl");
            string? htmlPath = null;

            if (templateUrl is not null)
                htmlPath = Path.GetFullPath(Path.Combine(dir, templateUrl.Trim('\'', '"')));
            else
            {
                var candidate = Path.Combine(dir, baseName + ".html");
                if (File.Exists(candidate)) htmlPath = candidate;
            }

            if (htmlPath is not null && File.Exists(htmlPath))
            {
                if (templateMode == "full")
                {
                    var content = File.ReadAllText(htmlPath);
                    template = new TemplateInfo(htmlPath, content, null);
                }
                else
                {
                    var bindings = ExtractTemplateBindings(htmlPath);
                    template = new TemplateInfo(htmlPath, null, bindings);
                }
            }
        }

        StylesInfo? styles = null;
        if (includeStyles)
        {
            var styleUrls = ExtractDecoratorProp(tsContent, "styleUrls") ?? ExtractDecoratorProp(tsContent, "styleUrl");
            string? stylePath = null;

            if (styleUrls is not null)
            {
                var urlMatch = Regex.Match(styleUrls, @"['""]([^'""]+)['""]");
                if (urlMatch.Success)
                    stylePath = Path.GetFullPath(Path.Combine(dir, urlMatch.Groups[1].Value));
            }
            else
            {
                foreach (var ext2 in new[] { ".scss", ".css", ".less" })
                {
                    var candidate = Path.Combine(dir, baseName + ext2);
                    if (File.Exists(candidate)) { stylePath = candidate; break; }
                }
            }

            styles = new StylesInfo(stylePath, stylePath is not null && File.Exists(stylePath));
        }

        SpecInfo? spec = null;
        if (includeSpec)
        {
            var specPath = Path.Combine(dir, baseName + ".spec.ts");
            if (!File.Exists(specPath))
            {
                var alt = Path.Combine(dir, baseName.Replace(".component", "") + ".spec.ts");
                if (File.Exists(alt)) specPath = alt;
            }

            if (File.Exists(specPath))
            {
                IReadOnlyList<SignatureEntry>? specSigs = null;
                try { specSigs = _codeRead.ReadSignaturesOnly(specPath, false); }
                catch { /* swallow */ }
                spec = new SpecInfo(specPath, specSigs);
            }
            else
            {
                spec = new SpecInfo(null, null);
            }
        }

        return new ReadComponentBundleResult(componentTsPath, selector, standalone, imports, typescript, template, styles, spec);
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private static string? ExtractDecoratorProp(string tsContent, string propName)
    {
        var pattern = propName + @"\s*:\s*(.+?)(?:,\s*\n|\n\s*\w+\s*:|})";
        var m = Regex.Match(tsContent, pattern, RegexOptions.Singleline);
        return m.Success ? m.Groups[1].Value.Trim() : null;
    }

    private static IReadOnlyList<string> ExtractTemplateBindings(string htmlPath)
    {
        var bindings = new List<string>();
        try
        {
            var html = File.ReadAllText(htmlPath);
            foreach (Match m in Regex.Matches(html, @"\[([^\]]+)\]=""([^""]*)"""))
                bindings.Add($"[{m.Groups[1].Value}]=\"{m.Groups[2].Value}\"");
            foreach (Match m in Regex.Matches(html, @"\(([^)]+)\)=""([^""]*)"""))
                bindings.Add($"({m.Groups[1].Value})=\"{m.Groups[2].Value}\"");
            foreach (Match m in Regex.Matches(html, @"\*ng(?:For|If)=""([^""]*)"""))
                bindings.Add($"*ng...=\"{m.Groups[1].Value}\"");
            foreach (Match m in Regex.Matches(html, @"@(?:if|for|switch|defer)\s*\(([^)]*)\)"))
                bindings.Add($"@{m.Value.TrimStart('@').Split('(')[0]}(...)");
        }
        catch { /* swallow */ }
        return bindings.Distinct().Take(50).ToList();
    }
}
