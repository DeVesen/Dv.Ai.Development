using System.Text;
using System.Text.RegularExpressions;

namespace Generic.Rtk.Filtering;

public sealed partial class OutputNormalizer
{
    [GeneratedRegex(@"\x1b\[[0-9;:/?<>!=]*[@-~]|\x1b\][\x06-\x07]|\x1b[\[\]#][\x20-\x7F]*|\x1b[\x20-\x2F][\x20-\x2F\x30-\x7E]*|\x1b[NODEM]|\x1b[78hk]")]
    private static partial Regex AnsiEscape();

    [GeneratedRegex(@"(?<key>PASSWORD|SECRET|TOKEN|API_KEY|APIKEY|CONNECTION_STRING|CONNECTIONSTRING|CLIENT_SECRET)(?<sep>\s*[=:]\s*)(?<val>\S+)", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex SensitiveEnvVar();

    public string Normalize(string text)
    {
        var cleaned = AnsiEscape().Replace(text.Replace("\r\n", "\n").Replace('\r', '\n'), "");
        return ScrubSensitiveValues(cleaned);
    }

    public string NormalizeLineEndings(string text) =>
        text.Replace("\r\n", "\n").Replace('\r', '\n');

    private static string ScrubSensitiveValues(string text) =>
        SensitiveEnvVar().Replace(text, "${key}${sep}***REDACTED***");
}
