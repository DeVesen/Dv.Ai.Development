using System.Reflection;

namespace Dev.Filesystem.Mcp;

public static class BuildVersionInfo
{
    public static string Version { get; } = ResolveVersion();

    private static string ResolveVersion()
    {
        var attr = Assembly.GetEntryAssembly()?
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>();
        return attr?.InformationalVersion ?? "0.0.0-unknown";
    }
}
